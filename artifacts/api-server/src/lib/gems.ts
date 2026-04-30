/**
 * Gems daily rollover with platform-favoring forfeit.
 *
 * Business rule (Nukhba):
 *   The subscriber's daily gem allowance does NOT carry over to the next day.
 *   Any gems left unused at Yemen midnight are forfeited to the platform —
 *   they are subtracted from gemsBalance.
 *
 * If a student is away for several days, each missed day's full daily
 * allowance is forfeited for every midnight that lies within the active
 * subscription window. Once `gemsExpiresAt` is crossed the gems are dead
 * regardless, so we stop deducting at that boundary.
 *
 * The rollover is implemented as an *atomic conditional UPDATE* keyed on
 * `gemsResetDate <> today`. This guarantees:
 *   - Only one concurrent caller can apply the forfeit (the other's WHERE
 *     clause won't match because the date has already advanced).
 *   - The balance subtraction uses a SQL expression
 *     `GREATEST(0, gems_balance - forfeit)`, so a concurrent gem deduction
 *     running between our read and write cannot be lost.
 *
 * Idempotent: a no-op when `gemsResetDate` already equals today.
 */

import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db, usersTable, userSubjectSubscriptionsTable } from "@workspace/db";
import { getYemenDateString } from "./yemen-time";

const ONE_DAY_MS = 86_400_000;
const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;

export type UserGemsState = {
  id: number;
  gemsBalance: number | null;
  gemsDailyLimit: number | null;
  gemsUsedToday: number | null;
  gemsResetDate: string | null;
  gemsExpiresAt: Date | string | null;
};

function parseYemenDateLabel(label: string): Date | null {
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(label)) return null;
  // The label "YYYY-MM-DD" represents the Yemen calendar day starting at
  // 00:00 Yemen time. Convert to its UTC instant.
  return new Date(new Date(label + "T00:00:00Z").getTime() - YEMEN_OFFSET_MS);
}

/**
 * Count how many full Yemen-midnight forfeit events should fire within the
 * subscription window, given the user's last reset date.
 *
 * Each midnight following the last active day is one forfeit event:
 *   - The first midnight forfeits (dailyLimit − usedToday) — yesterday's
 *     leftover.
 *   - Each subsequent midnight (skipped days) forfeits the full dailyLimit.
 *
 * Forfeit events past `gemsExpiresAt` are dropped — gems are unusable then,
 * so deducting them is meaningless and we don't want negative bookkeeping
 * for users who forgot to renew.
 */
function computeForfeit(
  lastResetUtc: Date,
  todayUtc: Date,
  dailyLimit: number,
  usedToday: number,
  expiresAt: Date | null,
): number {
  const daysPassed = Math.max(
    0,
    Math.round((todayUtc.getTime() - lastResetUtc.getTime()) / ONE_DAY_MS),
  );
  if (daysPassed <= 0 || dailyLimit <= 0) return 0;

  let forfeit = 0;
  for (let i = 1; i <= daysPassed; i++) {
    // Midnight at the end of day (lastReset + i-1), i.e. start of day (lastReset + i).
    const midnight = new Date(lastResetUtc.getTime() + i * ONE_DAY_MS);
    if (expiresAt && midnight.getTime() > expiresAt.getTime()) break;
    forfeit += i === 1
      ? Math.max(0, dailyLimit - usedToday) // Last active day's leftover
      : dailyLimit;                          // Fully-skipped day
  }
  return forfeit;
}

/**
 * Apply daily rollover. Mutates `user` in place AND persists to DB.
 * Returns the same `user` reference for convenience.
 */
export async function applyDailyGemsRollover<T extends UserGemsState>(user: T): Promise<T> {
  const today = getYemenDateString();
  if ((user.gemsResetDate ?? null) === today) return user;

  const dailyLimit = Math.max(0, user.gemsDailyLimit ?? 0);
  const usedToday = Math.max(0, user.gemsUsedToday ?? 0);
  const expiresAt = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;

  // Compute how much to forfeit. Zero when there's no subscription state.
  let forfeit = 0;
  if (dailyLimit > 0 && (user.gemsBalance ?? 0) > 0) {
    const lastResetUtc = user.gemsResetDate ? parseYemenDateLabel(user.gemsResetDate) : null;
    const todayUtc = parseYemenDateLabel(today)!;
    if (lastResetUtc) {
      forfeit = computeForfeit(lastResetUtc, todayUtc, dailyLimit, usedToday, expiresAt);
    }
  }

  // Atomic, idempotent UPDATE. The WHERE clause on `gemsResetDate <> today`
  // ensures only one concurrent caller wins the rollover; the SQL expression
  // on `gemsBalance` is race-safe with concurrent gem deductions.
  const updated = await db
    .update(usersTable)
    .set({
      gemsBalance: sql`GREATEST(0, ${usersTable.gemsBalance} - ${forfeit})`,
      gemsUsedToday: 0,
      gemsResetDate: today,
    })
    .where(and(
      eq(usersTable.id, user.id),
      or(isNull(usersTable.gemsResetDate), ne(usersTable.gemsResetDate, today)),
    ))
    .returning({
      gemsBalance: usersTable.gemsBalance,
      gemsUsedToday: usersTable.gemsUsedToday,
      gemsResetDate: usersTable.gemsResetDate,
    });

  if (updated.length > 0) {
    // We won the race; apply the post-update state to the in-memory user.
    user.gemsBalance = updated[0].gemsBalance;
    user.gemsUsedToday = updated[0].gemsUsedToday;
    user.gemsResetDate = updated[0].gemsResetDate;
  } else {
    // Another concurrent request already rolled over. Refresh state from DB
    // so the caller sees the post-rollover truth.
    const [fresh] = await db
      .select({
        gemsBalance: usersTable.gemsBalance,
        gemsUsedToday: usersTable.gemsUsedToday,
        gemsResetDate: usersTable.gemsResetDate,
      })
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    if (fresh) {
      user.gemsBalance = fresh.gemsBalance;
      user.gemsUsedToday = fresh.gemsUsedToday;
      user.gemsResetDate = fresh.gemsResetDate;
    }
  }

  return user;
}

/**
 * Per-subject version of {@link applyDailyGemsRollover}. Operates on a single
 * row in `user_subject_subscriptions` keyed by id. Same forfeit semantics as
 * the global version: leftover daily gems are subtracted from `gemsBalance`
 * for every Yemen midnight that passed inside the active subscription window.
 *
 * Mutates `sub` in place AND persists. Returns the same reference.
 */
export type SubjectSubGemsState = {
  id: number;
  gemsBalance: number | null;
  gemsDailyLimit: number | null;
  gemsUsedToday: number | null;
  gemsResetDate: string | null;
  expiresAt: Date | string | null;
};

export async function applyDailyGemsRolloverForSubjectSub<T extends SubjectSubGemsState>(sub: T): Promise<T> {
  const today = getYemenDateString();
  if ((sub.gemsResetDate ?? null) === today) return sub;

  const dailyLimit = Math.max(0, sub.gemsDailyLimit ?? 0);
  const usedToday = Math.max(0, sub.gemsUsedToday ?? 0);
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;

  let forfeit = 0;
  if (dailyLimit > 0 && (sub.gemsBalance ?? 0) > 0) {
    const lastResetUtc = sub.gemsResetDate ? parseYemenDateLabel(sub.gemsResetDate) : null;
    const todayUtc = parseYemenDateLabel(today)!;
    if (lastResetUtc) {
      forfeit = computeForfeit(lastResetUtc, todayUtc, dailyLimit, usedToday, expiresAt);
    }
  }

  const updated = await db
    .update(userSubjectSubscriptionsTable)
    .set({
      gemsBalance: sql`GREATEST(0, ${userSubjectSubscriptionsTable.gemsBalance} - ${forfeit})`,
      gemsUsedToday: 0,
      gemsResetDate: today,
    })
    .where(and(
      eq(userSubjectSubscriptionsTable.id, sub.id),
      or(
        isNull(userSubjectSubscriptionsTable.gemsResetDate),
        ne(userSubjectSubscriptionsTable.gemsResetDate, today),
      ),
    ))
    .returning({
      gemsBalance: userSubjectSubscriptionsTable.gemsBalance,
      gemsUsedToday: userSubjectSubscriptionsTable.gemsUsedToday,
      gemsResetDate: userSubjectSubscriptionsTable.gemsResetDate,
    });

  if (updated.length > 0) {
    sub.gemsBalance = updated[0].gemsBalance;
    sub.gemsUsedToday = updated[0].gemsUsedToday;
    sub.gemsResetDate = updated[0].gemsResetDate;
  } else {
    const [fresh] = await db
      .select({
        gemsBalance: userSubjectSubscriptionsTable.gemsBalance,
        gemsUsedToday: userSubjectSubscriptionsTable.gemsUsedToday,
        gemsResetDate: userSubjectSubscriptionsTable.gemsResetDate,
      })
      .from(userSubjectSubscriptionsTable)
      .where(eq(userSubjectSubscriptionsTable.id, sub.id));
    if (fresh) {
      sub.gemsBalance = fresh.gemsBalance;
      sub.gemsUsedToday = fresh.gemsUsedToday;
      sub.gemsResetDate = fresh.gemsResetDate;
    }
  }

  return sub;
}
