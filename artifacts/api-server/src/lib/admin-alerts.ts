/**
 * Admin alerts helper — surfaces operational issues (Gemini provider
 * down, OpenRouter credit exhausted, repeated auth failures, etc.) to
 * the admin panel.
 *
 * De-duplication: a partial unique index on `admin_alerts(type) WHERE
 * resolved = false` enforces "at most one unresolved alert per type"
 * at the database level. recordAdminAlert() runs a single
 * INSERT ... ON CONFLICT DO UPDATE statement that:
 *   • inserts a brand-new row when there's no matching unresolved one, OR
 *   • when one already exists, atomically refreshes message/metadata/
 *     severity, bumps `occurrence_count`, and updates `last_occurred_at`.
 * This is race-safe under concurrent failures (an outage typically fans
 * out across many simultaneous student requests).
 */
import { db, adminAlertsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

export type AdminAlertSeverity = "info" | "warning" | "error" | "critical";

export type RecordAdminAlertArgs = {
  /** Stable type code (e.g. "openrouter_insufficient_credits"). */
  type: string;
  severity?: AdminAlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

/**
 * Insert (or atomically coalesce) an admin alert. Safe to call from hot
 * paths — fire-and-forget; never throws to the caller. Returns the alert
 * id (existing or new) for tests/logging, or null on failure.
 */
export async function recordAdminAlert(
  args: RecordAdminAlertArgs,
): Promise<number | null> {
  try {
    const severity = args.severity ?? "warning";
    const metadata = args.metadata ?? null;

    // Single race-safe upsert. The partial unique index
    // `uq_admin_alerts_type_unresolved` (defined in auto-migrate.ts)
    // guarantees ON CONFLICT can fire when an unresolved alert of the
    // same type already exists. Resolved rows are not in the index, so
    // a fresh outage AFTER an admin clicked "حلّ" correctly creates a
    // brand-new row instead of resurrecting the resolved one.
    const inserted = await db
      .insert(adminAlertsTable)
      .values({
        type: args.type,
        severity,
        title: args.title,
        message: args.message,
        metadata,
        resolved: false,
      })
      .onConflictDoUpdate({
        target: adminAlertsTable.type,
        targetWhere: eq(adminAlertsTable.resolved, false),
        set: {
          message: args.message,
          metadata,
          severity,
          lastOccurredAt: new Date(),
          occurrenceCount: sql`${adminAlertsTable.occurrenceCount} + 1`,
        },
      })
      .returning({
        id: adminAlertsTable.id,
        occurrenceCount: adminAlertsTable.occurrenceCount,
      });

    const id = inserted[0]?.id ?? null;
    const occ = inserted[0]?.occurrenceCount ?? 1;
    if (id !== null) {
      // Only log on first occurrence to avoid log spam for an ongoing
      // outage. Counter ≥ 2 means the alert was de-duped onto an
      // existing row.
      if (occ === 1) {
        logger.warn(
          { alertId: id, type: args.type, severity },
          "[admin-alert] new alert recorded",
        );
      }
    }
    return id;
  } catch (err: any) {
    // NEVER let alert-recording bubble up — it must not break the path
    // that triggered the alert. Log and swallow.
    logger.error(
      { err: err?.message, type: args.type },
      "[admin-alert] failed to record alert",
    );
    return null;
  }
}

/**
 * Resolve an alert by id (admin action). Idempotent — calling on an
 * already-resolved row is a no-op.
 */
export async function resolveAdminAlert(
  alertId: number,
  userId: number | null,
): Promise<void> {
  await db
    .update(adminAlertsTable)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolvedByUserId: userId,
    })
    .where(eq(adminAlertsTable.id, alertId));
}
