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

import { and, gt, isNotNull, lt } from "drizzle-orm";
import {
  db,
  userSubjectSubscriptionsTable,
  usersTable,
  v4SpecialtiesTable,
} from "@workspace/db";
import {
  applyDailyGemsRollover,
  applyDailyGemsRolloverForSubjectSub,
} from "./gems";
import { getYemenDateString } from "./yemen-time";
import { logger } from "./logger";
import { startTeacherImageMaintenance } from "./teacher-image-store";
import { sweepV4ExpiredWallets } from "./v4-gem-wallet";
import { runWeeklyMemorySweep } from "./v4-memory";
import { reapOrphanedProcessingBooklets } from "./v4-booklet";
import { prewarmLessonContentForVersion } from "./v4-teaching-core";
import { sweepReferralRewards } from "./v4-referral";

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;
// Floor (minutes) for the periodic orphan-booklet sweep. Must exceed the
// pipeline's worst-case wall time (extract 5m + embed 5m + tree 4m ≈ 14m) so
// it never reaps a legitimately in-flight upload; 20m leaves a safe margin.
const BOOKLET_ORPHAN_FLOOR_MIN = 20;

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

    // v4 monthly expiry sweep — zeroes any wallet past its expiry (grace = 0)
    // and writes a `monthly_expiry` audit row. Idempotent; runs
    // every tick (same cadence as legacy sweep) so an expiry never lags
    // by more than an hour.
    try {
      const v4 = await sweepV4ExpiredWallets();
      if (v4.swept > 0 || v4.errors > 0) {
        logger.info(
          { swept: v4.swept, errors: v4.errors },
          "scheduled-jobs: v4 expiry sweep complete",
        );
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, "scheduled-jobs: v4 expiry sweep crashed");
    }


    // task #6: weekly memory summary sweep. Runs every hour but bounded
    // to MAX_PER_TICK users so Haiku load is spread across the day even
    // when many students cross the 7-day mark at the same hour. Each user
    // is summarized at most once per week (the sweep filters out users
    // whose latest summary is < 7d old).
    try {
      const mem = await runWeeklyMemorySweep();
      if (mem.summarized > 0 || mem.errors > 0) {
        logger.info(
          { summarized: mem.summarized, skipped: mem.skipped, errors: mem.errors },
          "scheduled-jobs: v4 weekly memory sweep complete",
        );
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, "scheduled-jobs: v4 weekly memory sweep crashed");
    }

    // Referral reward sweep — safety net for the per-grant payout hooks.
    // Idempotent via referrals.reward_paid_at.
    try {
      const ref = await sweepReferralRewards();
      if (ref.paid > 0 || ref.errors > 0) {
        logger.info(
          { paid: ref.paid, errors: ref.errors },
          "scheduled-jobs: referral reward sweep complete",
        );
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, "scheduled-jobs: referral reward sweep crashed");
    }

    // Lesson-content pre-warm safety net — fills any gaps left by a server
    // restart at publish time or a partial generation failure.  The function
    // is a no-op (cheap DB read) when all lessons are already cached.
    await runLessonContentPrewarm();
  } catch (err: any) {
    logger.error({ err: err?.message }, "scheduled-jobs: sweep crashed");
  }
}

/**
 * Safety-net pre-warm sweep.  Runs every hour alongside the rollover sweep.
 * For each specialty with an active instruction version, checks for uncached
 * lessons and generates their content (no-op when all lessons are already
 * cached — the common case in production).
 *
 * The primary warm path fires immediately on publish / activate-version.
 * This sweep catches any lessons that slipped through because the server was
 * restarting, or a partial failure left some lessons ungenerated.
 */
async function runLessonContentPrewarm(): Promise<void> {
  try {
    const specialties = await db
      .select({
        slug: v4SpecialtiesTable.slug,
        versionId: v4SpecialtiesTable.activeInstructionVersionId,
      })
      .from(v4SpecialtiesTable)
      .where(isNotNull(v4SpecialtiesTable.activeInstructionVersionId));

    for (const sp of specialties) {
      if (!sp.versionId) continue;
      await prewarmLessonContentForVersion(sp.versionId, sp.slug);
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "scheduled-jobs: lesson-content prewarm sweep crashed");
  }
}

/**
 * Sweep visual_explain_requests that are still `pending` (unclaimed) after
 * 5 minutes and mark them `expired`.  Students polling their request will see
 * the new status and can show a "no supervisor available" message immediately
 * instead of waiting the full 15-minute client-side deadline.
 */
async function sweepExpiredVisualExplainRequests(): Promise<void> {
  try {
    const { sql: rawSql } = await import("drizzle-orm");
    const result = await db.execute(rawSql`
      UPDATE visual_explain_requests
      SET status = 'expired'
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '5 minutes'
    `);
    const count = (result as any).rowCount ?? 0;
    if (count > 0) {
      logger.info({ count }, "scheduled-jobs: expired unclaimed visual-explain requests");
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "scheduled-jobs: visual-explain expiry sweep failed");
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

  // Orphaned-booklet safety net. The startup reaper (index.ts) clears
  // orphans left by a dead previous instance with a 1-minute floor, but a
  // row orphaned by a crash within 60s of its creation is too young for that
  // one-shot pass and would otherwise stay `processing` forever. This
  // periodic sweep reaps such rows once they cross BOOKLET_ORPHAN_FLOOR_MIN —
  // safe because the upload pipeline's timeouts cap any legitimate
  // processing well under that. Runs in the single live instance only (the
  // duplicate workflow exits on the port check).
  const orphanTick = setInterval(() => {
    void reapOrphanedProcessingBooklets(BOOKLET_ORPHAN_FLOOR_MIN);
  }, FIVE_MIN_MS);
  orphanTick.unref?.();

  // Visual-explain expiry sweep — marks unclaimed `pending` requests as
  // `expired` once they are older than 5 minutes.  Runs every minute so a
  // student's polling loop sees the new status within ~1 minute of the
  // expiry threshold, well before the 15-minute client-side timeout fires.
  const ONE_MIN_MS = 60_000;
  const veTick = setInterval(() => {
    void sweepExpiredVisualExplainRequests();
  }, ONE_MIN_MS);
  veTick.unref?.();
  // Also run once shortly after boot so requests orphaned during a restart
  // are expired without waiting a full minute.
  const veBoot = setTimeout(() => { void sweepExpiredVisualExplainRequests(); }, 10_000);
  veBoot.unref?.();
  logger.info("scheduled-jobs: visual-explain expiry sweep registered (every 1 min)");
}
