/**
 * Background scheduled jobs for the API server.
 *
 * Currently a single hourly tick that:
 *   - Walks every time-active per-subject subscription whose `gemsResetDate`
 *     is older than today (Yemen-time) and applies the daily rollover, which
 *     forfeits unused gems and writes a `forfeit` ledger row.
 *   - Walks every legacy gems wallet in the same condition.
 *
 * The hourly cadence is deliberately overkill — applyDailyGemsRollover is
 * idempotent (it bails out instantly when the date already matches), and a
 * conservative interval guarantees the forfeit fires within an hour of Yemen
 * midnight even if the server has been restarted, sleeping, or DST-confused.
 *
 * Design note: we run this in-process rather than via OS cron because the API
 * server is the only thing in this repo that knows the Yemen-time semantics
 * AND has the DB connection pool. Adding cron would create a second source of
 * truth for "what is today" — fragile. The cost of one COUNT-and-bail query
 * per hour per active sub is negligible.
 */

import { and, gt, lt } from "drizzle-orm";
import {
  db,
  userSubjectSubscriptionsTable,
  usersTable,
} from "@workspace/db";
import {
  applyDailyGemsRollover,
  applyDailyGemsRolloverForSubjectSub,
} from "./gems";
import { getYemenDateString } from "./yemen-time";
import { logger } from "./logger";
import { startTeacherImageMaintenance } from "./teacher-image-store";

const ONE_HOUR_MS = 60 * 60 * 1000;

let started = false;

async function runRolloverSweep(): Promise<void> {
  const now = new Date();
  const todayYemen = getYemenDateString();

  try {
    // Per-subject: only rows still inside their active window AND whose
    // gemsResetDate is older than today. The applyDailyGemsRollover call
    // does its own re-check, so the WHERE here is just to keep the worklist
    // small.
    const dueSubs = await db
      .select()
      .from(userSubjectSubscriptionsTable)
      .where(and(
        gt(userSubjectSubscriptionsTable.expiresAt, now),
        lt(userSubjectSubscriptionsTable.gemsResetDate, todayYemen),
      ));

    let processed = 0;
    for (const sub of dueSubs) {
      try {
        await applyDailyGemsRolloverForSubjectSub(sub);
        processed++;
      } catch (err: any) {
        logger.error(
          { err: err?.message, subId: sub.id },
          "scheduled-jobs: per-subject rollover failed",
        );
      }
    }

    // Legacy global wallet: same idea.
    const dueLegacyUsers = await db
      .select()
      .from(usersTable)
      .where(lt(usersTable.gemsResetDate, todayYemen));

    let processedLegacy = 0;
    for (const u of dueLegacyUsers) {
      try {
        await applyDailyGemsRollover(u);
        processedLegacy++;
      } catch (err: any) {
        logger.error(
          { err: err?.message, userId: u.id },
          "scheduled-jobs: legacy rollover failed",
        );
      }
    }

    if (processed > 0 || processedLegacy > 0) {
      logger.info(
        { perSubject: processed, legacy: processedLegacy, todayYemen },
        "scheduled-jobs: forfeit sweep complete",
      );
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "scheduled-jobs: sweep crashed");
  }
}

export function startScheduledJobs(): void {
  if (started) return;
  started = true;
  // First sweep five seconds after boot so we don't compete with startup
  // migrations, then once an hour. unref() so the interval never holds the
  // event loop open during a graceful shutdown.
  const boot = setTimeout(() => { void runRolloverSweep(); }, 5000);
  boot.unref?.();
  const tick = setInterval(() => { void runRolloverSweep(); }, ONE_HOUR_MS);
  tick.unref?.();
  logger.info("scheduled-jobs: hourly rollover sweep registered");

  // Teacher-image cache maintenance — startup sweep + hourly LRU eviction
  // so the on-disk cache never exceeds TEACHER_IMAGE_CACHE_MB even when
  // students go a long stretch without triggering new image generations
  // (which would otherwise be the only thing kicking eviction).
  startTeacherImageMaintenance();
}
