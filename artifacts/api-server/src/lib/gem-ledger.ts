/**
 * Gem ledger — append-only audit log of every gem balance change.
 *
 * Every code path that mutates a gem balance MUST also write a ledger row
 * (grant / debit / refund / forfeit / adjust). The ledger is the source of
 * truth for the admin "history" tab and is what makes refunds possible
 * (admin sees exactly when and why each gem moved).
 *
 * The writes are deliberately fire-and-forget at the call site (wrapped in
 * `.catch(...)`) so a transient ledger insert failure never breaks the
 * student-facing AI flow. The same call site already logs balance changes
 * separately, so a missed ledger row is observable and fixable, but it does
 * not roll back the gem deduction itself.
 */

import { db, gemLedgerTable } from "@workspace/db";
import { logger } from "./logger";

export type GemLedgerReason =
  | "grant"          // approve / activate-card / admin grant
  | "debit"          // per-turn AI cost
  | "refund"         // admin refund (positive delta)
  | "adjust"         // admin manual adjust (±)
  | "forfeit"        // daily Yemen-midnight forfeit (negative)
  | "extend";        // admin extended subscription window (no balance change)

export type GemLedgerSource =
  | "approve_request"
  | "activate_card"
  | "admin_grant"
  | "admin_refund"
  | "admin_adjust"
  | "ai_teach"
  | "ai_lesson"
  | "ai_image"
  | "platform_help"
  | "daily_rollover"
  | "subscription_extend"
  | "subscription_revoke";

export type WriteGemLedgerOpts = {
  userId: number;
  subjectSubId?: number | null;
  subjectId?: string | null;
  delta: number;            // signed: +grant/refund, −debit/forfeit
  balanceAfter: number;     // post-mutation balance (for fast queries)
  reason: GemLedgerReason;
  source: GemLedgerSource;
  adminUserId?: number | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Idempotency key for AI-call settlement; unique-indexed in DB. */
  requestId?: string | null;
};

/**
 * Insert a single ledger row. Errors are logged with a `gem_ledger:` prefix
 * but never thrown — the caller has already mutated the balance and should
 * not be rolled back by an audit-log hiccup.
 */
export async function writeGemLedger(opts: WriteGemLedgerOpts): Promise<void> {
  try {
    await db.insert(gemLedgerTable).values({
      userId: opts.userId,
      subjectSubId: opts.subjectSubId ?? null,
      subjectId: opts.subjectId ?? null,
      delta: opts.delta,
      balanceAfter: Math.max(0, Math.floor(opts.balanceAfter)),
      reason: opts.reason,
      source: opts.source,
      adminUserId: opts.adminUserId ?? null,
      note: opts.note ?? null,
      metadata: opts.metadata ?? null,
      ...(opts.requestId ? { requestId: opts.requestId } : {}),
    } as any);
  } catch (err: any) {
    logger.error(
      {
        err: err?.message,
        userId: opts.userId,
        subjectSubId: opts.subjectSubId ?? null,
        delta: opts.delta,
        reason: opts.reason,
        source: opts.source,
      },
      "gem_ledger: insert failed",
    );
  }
}
