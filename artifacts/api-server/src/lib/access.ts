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
 * Per-subject first-lesson view. `freeMessagesUsed >= cap` is authoritative
 * for exhaustion. The denormalized `completed` flag is intentionally NOT
 * gated on here: Task #58 corrupted some rows by writing completed=true
 * with used < cap, and those students must still get their remaining
 * free gems. settleAiCharge owns the atomic write of both fields together.
 */
export function computeFirstLessonView(
  row: { completed: boolean; freeMessagesUsed: number } | null | undefined,
  cap: number = FREE_LESSON_GEM_LIMIT,
): { isFirstLesson: boolean; gemsRemaining: number; freeMessagesUsed: number } {
  const used = Math.max(0, row?.freeMessagesUsed ?? 0);
  const isFirstLesson = used < cap;
  const gemsRemaining = isFirstLesson ? cap - used : 0;
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

// Snapshot of all DB state needed to decide access. Loaded by
// `getAccessForUser`; consumed by the pure `computeAccess` core, which is
// what the unit tests exercise.
export type AccessUserState = {
  firstLessonComplete: boolean | null;
  gemsBalance: number | null;
  gemsDailyLimit: number | null;
  gemsUsedToday: number | null;
  gemsExpiresAt: Date | string | null;
  nukhbaPlan: string | null;
  subscriptionExpiresAt: Date | string | null;
  messagesLimit: number | null;
  messagesUsed: number | null;
};
export type AccessSubState = {
  expiresAt: Date | string;
  gemsBalance: number | null;
  gemsDailyLimit: number | null;
  gemsUsedToday: number | null;
};
export type AccessFirstLessonState = {
  completed: boolean;
  freeMessagesUsed: number;
} | null;

export function computeAccess(input: {
  user: AccessUserState | null;
  subjectId?: string | null;
  firstLesson: AccessFirstLessonState;
  subs: AccessSubState[];
  now: Date;
}): AccessResult {
  const { user, subjectId, firstLesson, subs, now } = input;

  if (!user) {
    return {
      hasActiveSub: false, gemsRemaining: 0, dailyRemaining: 0,
      expiresAt: null, expiredRecently: false, isFirstLesson: false,
      blockReason: "no_user", canAccess: false, source: "none", legacyKind: null,
    };
  }

  // Per-subject first-lesson eligibility computed up-front so the legacy
  // fallthrough below can honor it (a brand-new subject with no per-subject
  // sub row should still resolve as `source: "first-lesson"`).
  let perSubjectIsFirstLesson = false;
  let perSubjectFreeRemaining = FREE_LESSON_GEM_LIMIT;
  if (subjectId) {
    const view = computeFirstLessonView(firstLesson);
    perSubjectIsFirstLesson = view.isFirstLesson;
    perSubjectFreeRemaining = view.gemsRemaining;

    const sub =
      subs.find(s => new Date(s.expiresAt) > now && (s.gemsBalance ?? 0) > 0)
      ?? subs[0];

    if (sub) {
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
          isFirstLesson: perSubjectIsFirstLesson,
          blockReason: exhaustedDaily ? "daily_limit" : null,
          canAccess: !exhaustedDaily,
          source: "per-subject",
          legacyKind: null,
        };
      }

      // Strict: a dead per-subject row does not fall back to the legacy
      // wallet for that subject — but the free trial still applies.
      const expiredRecently =
        expiresAt < now &&
        now.getTime() - expiresAt.getTime() < RECENT_EXPIRY_WINDOW_MS;
      const blockReason: AccessReason =
        balance <= 0 ? "no_gems" : "no_active_sub";
      return {
        hasActiveSub: false,
        gemsRemaining: perSubjectIsFirstLesson ? perSubjectFreeRemaining : balance,
        dailyRemaining: perSubjectIsFirstLesson ? perSubjectFreeRemaining : dailyRemaining,
        expiresAt,
        expiredRecently,
        isFirstLesson: perSubjectIsFirstLesson,
        blockReason: perSubjectIsFirstLesson ? null : blockReason,
        canAccess: perSubjectIsFirstLesson,
        source: perSubjectIsFirstLesson ? "first-lesson" : "none",
        legacyKind: null,
      };
    }
    // No per-subject sub row → fall through to the legacy/global wallet.
  }

  const legacyExpires = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;
  const balance = user.gemsBalance ?? 0;
  const dailyLimit = user.gemsDailyLimit ?? 0;
  const usedToday = user.gemsUsedToday ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - usedToday);
  const exhaustedDaily = dailyLimit > 0 && usedToday >= dailyLimit;
  // For subject-scoped calls, the per-subject row is authoritative; for
  // subject-less calls, fall back to the legacy global one-shot flag.
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
    user.nukhbaPlan && planExpires && planExpires > now && messagesRemaining > 0
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
    return computeAccess({ user: null, subjectId, firstLesson: null, subs: [], now: new Date() });
  }

  await applyDailyGemsRollover(user);

  let firstLesson: AccessFirstLessonState = null;
  let subs: AccessSubState[] = [];
  if (subjectId) {
    const [fl] = await db
      .select()
      .from(userSubjectFirstLessonsTable)
      .where(
        and(
          eq(userSubjectFirstLessonsTable.userId, userId),
          eq(userSubjectFirstLessonsTable.subjectId, subjectId),
        ),
      );
    firstLesson = fl
      ? { completed: !!fl.completed, freeMessagesUsed: fl.freeMessagesUsed ?? 0 }
      : null;

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
    for (const s of allSubs) await applyDailyGemsRolloverForSubjectSub(s);
    subs = allSubs.map(s => ({
      expiresAt: s.expiresAt,
      gemsBalance: s.gemsBalance,
      gemsDailyLimit: s.gemsDailyLimit,
      gemsUsedToday: s.gemsUsedToday,
    }));
  }

  return computeAccess({
    user: {
      firstLessonComplete: user.firstLessonComplete,
      gemsBalance: user.gemsBalance,
      gemsDailyLimit: user.gemsDailyLimit,
      gemsUsedToday: user.gemsUsedToday,
      gemsExpiresAt: user.gemsExpiresAt,
      nukhbaPlan: user.nukhbaPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      messagesLimit: user.messagesLimit,
      messagesUsed: user.messagesUsed,
    },
    subjectId,
    firstLesson,
    subs,
    now: new Date(),
  });
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
