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
const FREE_LESSON_GEM_LIMIT = 80;

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

    // First-lesson grace requires both the global flag and a non-completed
    // per-subject row, so the free lesson can only be consumed once.
    const isFirstLesson =
      !user.firstLessonComplete &&
      (!firstLesson ||
        (!firstLesson.completed &&
          (firstLesson.freeMessagesUsed ?? 0) < FREE_LESSON_GEM_LIMIT));

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
        gemsRemaining: balance,
        dailyRemaining,
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
  const isFirstLessonGlobal = !user.firstLessonComplete;
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
