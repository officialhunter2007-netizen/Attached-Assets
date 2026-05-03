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
export const FREE_LESSON_GEM_LIMIT = 80;

/**
 * Pure helper — derives the per-subject first-lesson view from the row
 * (or its absence). Exported so unit tests and other call sites can rely
 * on the same predicate the access layer uses.
 *
 *   • No row              → 80/80 free, on trial.
 *   • Partially used      → (cap - used)/cap free, on trial.
 *   • Used >= cap OR completed → 0/cap free, trial exhausted.
 *
 * This is the single source of truth for "did this user already burn the
 * free trial on this subject?". The `completed` flag is owned by
 * `settleAiCharge` (lib/charge-ai-usage.ts) and flips atomically when
 * `freeMessagesUsed + gems >= cap`. See Task #58 for the regression that
 * happened when other routes started flipping it on session end.
 */
export function computeFirstLessonView(
  row: { completed: boolean; freeMessagesUsed: number } | null | undefined,
  cap: number = FREE_LESSON_GEM_LIMIT,
): { isFirstLesson: boolean; gemsRemaining: number; freeMessagesUsed: number } {
  const used = Math.max(0, row?.freeMessagesUsed ?? 0);
  const completed = !!row?.completed;
  const isFirstLesson = !row || (!completed && used < cap);
  const gemsRemaining = isFirstLesson ? Math.max(0, cap - used) : 0;
  return { isFirstLesson, gemsRemaining, freeMessagesUsed: used };
}

export type AccessSource = "per-subject" | "legacy" | "first-lesson" | "none";
export type AccessReason =
  | "no_user"
  | "no_active_sub"
  | "daily_limit"
  | "no_gems"
  | null;

export type LegacyKind = "gems" | "messages" | null;

export type AccessResult = {
  hasActiveSub: boolean;
  gemsRemaining: number;
  dailyRemaining: number;
  expiresAt: Date | null;
  expiredRecently: boolean;
  isFirstLesson: boolean;
  blockReason: AccessReason;
  canAccess: boolean;
  source: AccessSource;
  // When source === "legacy", which kind of wallet backs it.
  legacyKind: LegacyKind;
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
      legacyKind: null,
    };
  }

  const now = new Date();

  // Per-subject first-lesson eligibility computed up-front so the global
  // legacy fallthrough below can honor it too (a brand-new subject with no
  // per-subject sub row should still resolve as `source: "first-lesson"`
  // instead of falling back to `isFirstLessonGlobal`).
  let perSubjectIsFirstLesson = false;
  let perSubjectFreeRemaining = FREE_LESSON_GEM_LIMIT;
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

    // Per-subject first-lesson grace: each new تخصص/مهارة gets a fresh
    // 80-gem free trial. We deliberately do NOT gate on the global
    // `users.firstLessonComplete` flag here — that flag is a legacy
    // one-shot from the pre-per-subject era; the authoritative source
    // of "did this user already burn the free trial on this subject?"
    // is the per-subject row itself.
    const firstLessonView = computeFirstLessonView(firstLesson ?? null);
    const isFirstLesson = firstLessonView.isFirstLesson;
    perSubjectIsFirstLesson = isFirstLesson;
    perSubjectFreeRemaining = firstLessonView.gemsRemaining;

    // Prefer an active row that still has gems; fall back to the most
    // recent row so we can report expired/exhausted state correctly.
    const allSubs = await db
      .select()
      .from(userSubjectSubscriptionsTable)
      .where(
        and(
          eq(userSubjectSubscriptionsTable.userId, userId),
          eq(userSubjectSubscriptionsTable.subjectId, subjectId),
        ),
      )
      .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));
    const sub =
      allSubs.find(s => new Date(s.expiresAt) > now && (s.gemsBalance ?? 0) > 0)
      ?? allSubs[0];

    if (sub) {
      await applyDailyGemsRolloverForSubjectSub(sub);

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
          legacyKind: null,
        };
      }

      // Strict: a dead per-subject row does not fall back to the legacy
      // wallet for that subject.
      const expiredRecently =
        expiresAt < now &&
        now.getTime() - expiresAt.getTime() < RECENT_EXPIRY_WINDOW_MS;
      const blockReason: AccessReason =
        balance <= 0 ? "no_gems" : "no_active_sub";
      return {
        hasActiveSub: false,
        // When the per-subject sub is dead but the user is still on the
        // free trial for this subject, surface the REMAINING free gems
        // (not the dead sub balance). Without this, /subject-access
        // reports `gemsBalance: 0` for a brand-new subject — Task #58.
        gemsRemaining: isFirstLesson ? firstLessonView.gemsRemaining : balance,
        dailyRemaining: isFirstLesson ? firstLessonView.gemsRemaining : dailyRemaining,
        expiresAt,
        expiredRecently,
        isFirstLesson,
        blockReason: isFirstLesson ? null : blockReason,
        canAccess: isFirstLesson,
        source: isFirstLesson ? "first-lesson" : "none",
        legacyKind: null,
      };
    }

    // No per-subject row → fall through to the legacy/global wallet
    // below before considering first-lesson grace, so a paid legacy
    // user who hasn't completed the free lesson still resolves as
    // source: "legacy" rather than "first-lesson".
  }

  await applyDailyGemsRollover(user);

  const legacyExpires = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;
  const balance = user.gemsBalance ?? 0;
  const dailyLimit = user.gemsDailyLimit ?? 0;
  const usedToday = user.gemsUsedToday ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - usedToday);
  const exhaustedDaily = dailyLimit > 0 && usedToday >= dailyLimit;
  // For subject-scoped calls, the per-subject row is authoritative; for
  // subject-less calls (rare — dashboard-level access checks), fall back
  // to the global one-shot flag.
  const isFirstLessonGlobal = subjectId
    ? perSubjectIsFirstLesson
    : !user.firstLessonComplete;
  const legacyActive = !!(legacyExpires && legacyExpires > now && balance > 0);

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
      legacyKind: "gems",
    };
  }

  // Pre-gems grandfathered wallet (nukhbaPlan + messages counter).
  const planExpires = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const messagesLimit = user.messagesLimit ?? 0;
  const messagesUsed = user.messagesUsed ?? 0;
  const messagesRemaining = Math.max(0, messagesLimit - messagesUsed);
  const planActive = !!(
    user.nukhbaPlan &&
    planExpires &&
    planExpires > now &&
    messagesRemaining > 0
  );
  if (planActive) {
    return {
      hasActiveSub: true,
      gemsRemaining: messagesRemaining,
      dailyRemaining: messagesRemaining,
      expiresAt: planExpires,
      expiredRecently: false,
      isFirstLesson: isFirstLessonGlobal,
      blockReason: null,
      canAccess: true,
      source: "legacy",
      legacyKind: "messages",
    };
  }

  const legacyExpiredRecently = legacyExpires
    ? legacyExpires < now &&
      now.getTime() - legacyExpires.getTime() < RECENT_EXPIRY_WINDOW_MS
    : (planExpires
        ? planExpires < now &&
          now.getTime() - planExpires.getTime() < RECENT_EXPIRY_WINDOW_MS
        : false);

  if (isFirstLessonGlobal) {
    // Surface the actual remaining free gems for the per-subject row
    // (partially-used subject) or the full cap for a brand-new subject.
    // Subject-less calls fall back to the cap as a safe default —
    // /subject-access always passes subjectId so this fallback is only
    // hit by dashboard-level access checks.
    const freeRemaining = subjectId ? perSubjectFreeRemaining : FREE_LESSON_GEM_LIMIT;
    return {
      hasActiveSub: false,
      gemsRemaining: freeRemaining,
      dailyRemaining: freeRemaining,
      expiresAt: legacyExpires,
      expiredRecently: legacyExpiredRecently,
      isFirstLesson: true,
      blockReason: null,
      canAccess: true,
      source: "first-lesson",
      legacyKind: null,
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
    legacyKind: null,
  };
}

// "Does the user have any path to use the platform right now?" Used by
// write endpoints (progress, lesson views) that don't care which subject.
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

  await applyDailyGemsRollover(user);
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
