/**
 * Yemen-timezone helpers — single source of truth for "today" across the app.
 *
 * Yemen is fixed at UTC+3 (no DST). All daily-rotation behavior in the platform
 * (one-session-per-day claim, daily message-counter reset, daily cost budget
 * rollover) is anchored to Yemen midnight so a student's "fresh day" UI cue
 * and the backend's "fresh budget" decision align perfectly.
 */

const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;

/** YYYY-MM-DD string for the current Yemen calendar day. */
export function getYemenDateString(): string {
  return new Date(Date.now() + YEMEN_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC Date for the next Yemen midnight. */
export function getNextMidnightYemen(): Date {
  const nowYemen = new Date(Date.now() + YEMEN_OFFSET_MS);
  const tomorrowYemen = new Date(nowYemen);
  tomorrowYemen.setUTCHours(0, 0, 0, 0);
  tomorrowYemen.setUTCDate(tomorrowYemen.getUTCDate() + 1);
  return new Date(tomorrowYemen.getTime() - YEMEN_OFFSET_MS);
}

/** UTC Date for the most recent Yemen midnight (the start of "today" in Yemen). */
export function getStartOfTodayYemen(): Date {
  const nowYemen = new Date(Date.now() + YEMEN_OFFSET_MS);
  const todayYemen = new Date(nowYemen);
  todayYemen.setUTCHours(0, 0, 0, 0);
  return new Date(todayYemen.getTime() - YEMEN_OFFSET_MS);
}
