/**
 * Centralised per-user access helper.
 *
 * Single source of truth for "can this user use the platform right now?".
 * Replaces the duplicated, legacy-only `getUserWithAccess` / `checkAccess`
 * implementations that used to live in routes/lessons.ts and routes/progress.ts
 * and were missing the per-subject gem wallet entirely.
 *
 * Precedence (mirrors the gating in routes/ai.ts):
 *   1. If a `subjectId` is provided AND a per-subject row exists for that
 *      subject → that row decides. We do NOT fall back to the legacy global
 *      wallet even if the per-subject sub is expired or drained — students
 *      who explicitly bought a per-subject plan must not silently regain
 *      access via the global wallet.
 *   2. Otherwise (no subjectId, or no per-subject row) → fall back to the
 *      legacy global wallet on usersTable for grandfathered users.
 *   3. The first-lesson grace window applies in both modes; a student who
 *      hasn't completed their free first lesson can still use it once.
 */
import { and, desc, eq, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  userSubjectSubscriptionsTable,
  userSubjectFirstLessonsTable,
} from "@workspace/db";
import {
  applyDailyGemsRollover,
  applyDailyGemsRolloverForSubjectSub,
} from "./gems";

const RECENT_EXPIRY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Mirrors FREE_LESSON_GEM_LIMIT in routes/subscriptions.ts. Kept local here
// so this module has zero coupling to a route file.
const FREE_LESSON_GEM_LIMIT = 80;

export type AccessSource = "per-subject" | "legacy" | "first-lesson" | "none";
export type AccessReason =
  | "no_user"
  | "no_active_sub"
  | "daily_limit"
  | "no_gems"
  | null;

export type AccessResult = {
  /** Subscription window is open (time-active) AND has gems remaining. */
  hasActiveSub: boolean;
  gemsRemaining: number;
  dailyRemaining: number;
  expiresAt: Date | null;
  /** Per-subject (or legacy) sub expired in the last 30 days. */
  expiredRecently: boolean;
  isFirstLesson: boolean;
  blockReason: AccessReason;
  /** True when the user can perform the gated action right now. */
  canAccess: boolean;
  source: AccessSource;
};

export async function getAccessForUser(opts: {
  userId: number;
  subjectId?: string | null;
}): Promise<AccessResult> {
  const { userId, subjectId } = opts;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    return {
      hasActiveSub: false,
      gemsRemaining: 0,
      dailyRemaining: 0,
      expiresAt: null,
      expiredRecently: false,
      isFirstLesson: false,
      blockReason: "no_user",
      canAccess: false,
      source: "none",
    };
  }

  const now = new Date();

  // ── Per-subject path ──────────────────────────────────────────────────────
  if (subjectId) {
    const [firstLesson] = await db
      .select()
      .from(userSubjectFirstLessonsTable)
      .where(
        and(
          eq(userSubjectFirstLessonsTable.userId, userId),
          eq(userSubjectFirstLessonsTable.subjectId, subjectId),
        ),
      );

    const isFirstLesson =
      !firstLesson ||
      (!firstLesson.completed &&
        (firstLesson.freeMessagesUsed ?? 0) < FREE_LESSON_GEM_LIMIT);

    const [sub] = await db
      .select()
      .from(userSubjectSubscriptionsTable)
      .where(
        and(
          eq(userSubjectSubscriptionsTable.userId, userId),
          eq(userSubjectSubscriptionsTable.subjectId, subjectId),
        ),
      )
      .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

    if (sub) {
      // Apply daily rollover so gemsUsedToday reflects today's value.
      await applyDailyGemsRolloverForSubjectSub(sub).catch(() => {});

      const expiresAt = new Date(sub.expiresAt);
      const balance = sub.gemsBalance ?? 0;
      const dailyLimit = sub.gemsDailyLimit ?? 0;
      const usedToday = sub.gemsUsedToday ?? 0;
      const dailyRemaining = Math.max(0, dailyLimit - usedToday);
      const subActive = expiresAt > now;

      if (subActive && balance > 0) {
        const exhaustedDaily = dailyLimit > 0 && usedToday >= dailyLimit;
        return {
          hasActiveSub: true,
          gemsRemaining: balance,
          dailyRemaining,
          expiresAt,
          expiredRecently: false,
          isFirstLesson,
          blockReason: exhaustedDaily ? "daily_limit" : null,
          canAccess: !exhaustedDaily,
          source: "per-subject",
        };
      }

      // Per-subject row exists but is expired or out of gems. We will fall
      // through to the legacy global wallet so behavior matches routes/ai.ts
      // (which gates access via `hasPerSubjectGemsSub || hasLegacyGemsSub`,
      // letting an expired/drained per-subject row still benefit from a
      // separately-active legacy wallet — rare in practice but consistent).
      // Capture the per-subject "expired" signal here so the API can still
      // surface it to the renew banner even when legacy fallback succeeds.
      const expiredRecently =
        expiresAt < now &&
        now.getTime() - expiresAt.getTime() < RECENT_EXPIRY_WINDOW_MS;
      const perSubjectExpiredFallback = {
        gemsRemaining: balance,
        dailyRemaining,
        expiresAt,
        expiredRecently,
        isFirstLesson,
      };
      // Continue to legacy fallback below; we'll prefer first-lesson grace
      // before legacy if the per-subject sub is expired.
      if (isFirstLesson) {
        return {
          hasActiveSub: false,
          gemsRemaining: balance,
          dailyRemaining,
          expiresAt,
          expiredRecently,
          isFirstLesson: true,
          blockReason: null,
          canAccess: true,
          source: "first-lesson",
        };
      }
      // fall through, but remember per-subject expiry context
      // (used below to decide blockReason/expiredRecently if legacy is also dead)
      return await legacyFallbackForExpiredSubjectSub(user, perSubjectExpiredFallback);
    }

    // No per-subject row at all. First-lesson grace, then legacy fallback.
    if (isFirstLesson) {
      return {
        hasActiveSub: false,
        gemsRemaining: 0,
        dailyRemaining: 0,
        expiresAt: null,
        expiredRecently: false,
        isFirstLesson: true,
        blockReason: null,
        canAccess: true,
        source: "first-lesson",
      };
    }
    // fall through to legacy
  }

  // ── Legacy global wallet ──────────────────────────────────────────────────
  await applyDailyGemsRollover(user).catch(() => {});

  const legacyExpires = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;
  const balance = user.gemsBalance ?? 0;
  const dailyLimit = user.gemsDailyLimit ?? 0;
  const usedToday = user.gemsUsedToday ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - usedToday);
  const exhaustedDaily = dailyLimit > 0 && usedToday >= dailyLimit;
  const isFirstLessonGlobal = !user.firstLessonComplete;
  const legacyActive = !!(
    legacyExpires &&
    legacyExpires > now &&
    balance > 0
  );

  if (legacyActive) {
    return {
      hasActiveSub: true,
      gemsRemaining: balance,
      dailyRemaining,
      expiresAt: legacyExpires,
      expiredRecently: false,
      isFirstLesson: isFirstLessonGlobal,
      blockReason: exhaustedDaily ? "daily_limit" : null,
      canAccess: !exhaustedDaily,
      source: "legacy",
    };
  }

  const legacyExpiredRecently = legacyExpires
    ? legacyExpires < now &&
      now.getTime() - legacyExpires.getTime() < RECENT_EXPIRY_WINDOW_MS
    : false;

  if (isFirstLessonGlobal) {
    return {
      hasActiveSub: false,
      gemsRemaining: 0,
      dailyRemaining: 0,
      expiresAt: legacyExpires,
      expiredRecently: legacyExpiredRecently,
      isFirstLesson: true,
      blockReason: null,
      canAccess: true,
      source: "first-lesson",
    };
  }

  return {
    hasActiveSub: false,
    gemsRemaining: balance,
    dailyRemaining,
    expiresAt: legacyExpires,
    expiredRecently: legacyExpiredRecently,
    isFirstLesson: false,
    blockReason: balance <= 0 ? "no_gems" : "no_active_sub",
    canAccess: false,
    source: "none",
  };
}

/**
 * Legacy fallback path used when the user has a per-subject row that is
 * expired/drained. Mirrors the second half of getAccessForUser's legacy
 * branch but prefers the per-subject expiry metadata (so the renew banner
 * shows "your subject sub expired N days ago", not the legacy expiry).
 */
async function legacyFallbackForExpiredSubjectSub(
  user: typeof usersTable.$inferSelect,
  perSubject: {
    gemsRemaining: number;
    dailyRemaining: number;
    expiresAt: Date | null;
    expiredRecently: boolean;
    isFirstLesson: boolean;
  },
): Promise<AccessResult> {
  await applyDailyGemsRollover(user).catch(() => {});

  const now = new Date();
  const legacyExpires = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;
  const legacyBalance = user.gemsBalance ?? 0;
  const dailyLimit = user.gemsDailyLimit ?? 0;
  const usedToday = user.gemsUsedToday ?? 0;
  const exhaustedDaily = dailyLimit > 0 && usedToday >= dailyLimit;
  const legacyActive = !!(legacyExpires && legacyExpires > now && legacyBalance > 0);

  if (legacyActive) {
    return {
      hasActiveSub: true,
      gemsRemaining: legacyBalance,
      dailyRemaining: Math.max(0, dailyLimit - usedToday),
      expiresAt: legacyExpires,
      expiredRecently: false,
      isFirstLesson: false,
      blockReason: exhaustedDaily ? "daily_limit" : null,
      canAccess: !exhaustedDaily,
      source: "legacy",
    };
  }

  // Both walls are dead — the per-subject expiry metadata is more useful
  // for the UI than the legacy one, so prefer it for the wall copy.
  return {
    hasActiveSub: false,
    gemsRemaining: perSubject.gemsRemaining,
    dailyRemaining: perSubject.dailyRemaining,
    expiresAt: perSubject.expiresAt,
    expiredRecently: perSubject.expiredRecently,
    isFirstLesson: false,
    blockReason: perSubject.gemsRemaining <= 0 ? "no_gems" : "no_active_sub",
    canAccess: false,
    source: "none",
  };
}

/**
 * "Does this user have *any* path to use the platform right now?". Used by
 * write endpoints (progress, lessons.views) that don't care which subject
 * the user is operating on, only that they have access at all.
 *
 * Considers, in order:
 *   - First-lesson grace (global `firstLessonComplete = false`).
 *   - Any active per-subject sub (time-active AND balance > 0).
 *   - Legacy gem wallet on usersTable (time-active AND balance > 0).
 *   - Legacy nukhbaPlan / messagesUsed / messagesLimit triple, for the
 *     oldest grandfathered users still on the pre-gems wallet.
 *   - Referral session credits.
 */
export async function userHasAnyAccess(userId: number): Promise<boolean> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return false;

  if (!user.firstLessonComplete) return true;
  if ((user.referralSessionsLeft ?? 0) > 0) return true;

  const now = new Date();

  const subs = await db
    .select({
      id: userSubjectSubscriptionsTable.id,
      gemsBalance: userSubjectSubscriptionsTable.gemsBalance,
    })
    .from(userSubjectSubscriptionsTable)
    .where(
      and(
        eq(userSubjectSubscriptionsTable.userId, userId),
        gt(userSubjectSubscriptionsTable.expiresAt, now),
      ),
    );
  for (const s of subs) {
    if ((s.gemsBalance ?? 0) > 0) return true;
  }

  await applyDailyGemsRollover(user).catch(() => {});
  if (
    user.gemsExpiresAt &&
    new Date(user.gemsExpiresAt) > now &&
    (user.gemsBalance ?? 0) > 0
  ) {
    return true;
  }

  if (
    user.nukhbaPlan &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > now &&
    (user.messagesUsed ?? 0) < (user.messagesLimit ?? 0)
  ) {
    return true;
  }

  return false;
}
