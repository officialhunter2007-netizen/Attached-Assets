/**
 * Unified gem accounting gateway for paid AI calls.
 *
 * Every paid AI route (ai/teach, future ai/lesson and image-only flows) goes
 * through this module so the accounting story is identical everywhere:
 *
 *   ┌─ settleAiCharge() — post-AI debit. Idempotent on `requestId` via a
 *   │                     DB-enforced unique partial index on
 *   │                     gem_ledger(user_id, request_id). Wrapped in a
 *   │                     transaction so the wallet UPDATE and the ledger
 *   │                     INSERT either both happen or neither does.
 *   └─ refundAiCharge()  — reverses by requestId. Also unique-keyed so a
 *                          double-refund collapses to one.
 *
 * Why post-call settle instead of pre-call reservation:
 *   The cost of a turn depends on token counts that are only known after the
 *   model streams. A reservation model would have to lock the maximum
 *   possible cost up-front (~50 gems for a Sonnet turn), which would
 *   constantly false-block students whose actual turn costs ~3 gems. The
 *   pre-call gate already enforces (balance > 0 AND usedToday < dailyLimit)
 *   atomically, and the settle step uses GREATEST(0, balance - cost), so
 *   races cannot underflow the wallet. The unique index on requestId then
 *   guarantees no double-debit even under concurrent retries.
 *
 * Idempotency mechanism:
 *   We INSERT the ledger row FIRST inside the transaction. The DB unique
 *   constraint on (user_id, request_id) means a duplicate insert returns
 *   zero rows. When we get zero rows back, the wallet UPDATE never runs
 *   and the transaction commits as a no-op. This makes settle race-safe
 *   without any application-level lock — Postgres serializes us via the
 *   B-tree lock on the unique index entry.
 */

import { and, eq, sql, desc } from "drizzle-orm";
import {
  db,
  userSubjectSubscriptionsTable,
  usersTable,
  userSubjectFirstLessonsTable,
  gemLedgerTable,
} from "@workspace/db";
import { logger } from "./logger";
import type { GemLedgerSource } from "./gem-ledger";

export type ChargeWallet =
  | { kind: "per-subject"; subjectSubId: number; subjectId: string | null }
  | { kind: "legacy"; subjectId?: string | null }
  | { kind: "first-lesson"; firstLessonId: number; cap: number; subjectId?: string | null };

export type SettleAiChargeOpts = {
  /** A unique-per-AI-call id. Same requestId twice = no double-charge. */
  requestId: string;
  userId: number;
  wallet: ChargeWallet;
  /** Computed gem cost for this turn (≥ 1). */
  gems: number;
  /** Source label written to ledger (e.g. "ai_teach"). */
  source: GemLedgerSource;
  model?: string | null;
  costUsd?: number | null;
  note?: string | null;
};

export type SettleAiChargeResult = {
  /** True when this call actually moved gems. False on duplicate or no-op. */
  charged: boolean;
  /** Gems actually deducted (0 on duplicate). */
  gemsDeducted: number;
  /** Post-deduction balance for the affected wallet (null on duplicate). */
  balanceAfter: number | null;
};

const NO_OP_RESULT: SettleAiChargeResult = { charged: false, gemsDeducted: 0, balanceAfter: null };

/**
 * Post-AI settle. Idempotent on `requestId` (DB-enforced unique constraint).
 *
 * Returns `charged: false` on:
 *   - gems <= 0
 *   - duplicate requestId (the unique-index conflict path)
 *   - the wallet kind is "first-lesson" and the cap is already reached
 */
export async function settleAiCharge(opts: SettleAiChargeOpts): Promise<SettleAiChargeResult> {
  const gems = Math.max(0, Math.floor(opts.gems || 0));
  if (gems <= 0) return NO_OP_RESULT;
  if (!opts.requestId) {
    logger.error({ userId: opts.userId, source: opts.source }, "settleAiCharge: missing requestId");
    return NO_OP_RESULT;
  }

  const baseMetadata = {
    requestId: opts.requestId,
    model: opts.model ?? null,
    costUsd: opts.costUsd ?? null,
  };

  try {
    return await db.transaction(async (tx) => {
      // STEP 1 — Claim the requestId by inserting a placeholder ledger row
      // with balance_after=0. ON CONFLICT DO NOTHING converts duplicate
      // settles into a zero-row return. RETURNING tells us if WE won the
      // race; if not, exit early without touching the wallet.
      const inserted = await tx
        .insert(gemLedgerTable)
        .values({
          userId: opts.userId,
          subjectSubId:
            opts.wallet.kind === "per-subject"
              ? opts.wallet.subjectSubId
              : null,
          subjectId:
            opts.wallet.kind === "first-lesson"
              ? (opts.wallet.subjectId ?? null)
              : (opts.wallet.kind === "per-subject"
                ? opts.wallet.subjectId
                : (opts.wallet.subjectId ?? null)),
          delta: opts.wallet.kind === "first-lesson" ? 0 : -gems,
          balanceAfter: 0,
          reason: "debit",
          source: opts.source,
          adminUserId: null,
          note: opts.note ?? null,
          metadata: baseMetadata,
          requestId: opts.requestId,
        } as any)
        .onConflictDoNothing({
          target: [gemLedgerTable.userId, (gemLedgerTable as any).requestId],
        })
        .returning({ id: gemLedgerTable.id });

      if (inserted.length === 0) {
        // Duplicate — another concurrent call already settled this requestId.
        return NO_OP_RESULT;
      }
      const ledgerId = inserted[0].id;

      // STEP 2 — Move the wallet. GREATEST clamps so the balance never
      // underflows even if our pre-check raced with another debit.
      let balanceAfter = 0;
      let actualDeducted = gems;

      if (opts.wallet.kind === "first-lesson") {
        const cap = Math.max(0, Math.floor(opts.wallet.cap));
        const [updated] = await tx
          .update(userSubjectFirstLessonsTable)
          .set({
            freeMessagesUsed: sql`LEAST(${cap}, ${userSubjectFirstLessonsTable.freeMessagesUsed} + ${gems})`,
            completed: sql`${userSubjectFirstLessonsTable.freeMessagesUsed} + ${gems} >= ${cap}`,
          })
          .where(eq(userSubjectFirstLessonsTable.id, opts.wallet.firstLessonId))
          .returning({ used: userSubjectFirstLessonsTable.freeMessagesUsed });
        balanceAfter = updated ? Math.max(0, cap - (updated.used ?? 0)) : 0;
      } else if (opts.wallet.kind === "per-subject") {
        const [updated] = await tx
          .update(userSubjectSubscriptionsTable)
          .set({
            gemsBalance: sql`GREATEST(0, ${userSubjectSubscriptionsTable.gemsBalance} - ${gems})`,
            gemsUsedToday: sql`${userSubjectSubscriptionsTable.gemsUsedToday} + ${gems}`,
          })
          .where(eq(userSubjectSubscriptionsTable.id, opts.wallet.subjectSubId))
          .returning({ gemsBalance: userSubjectSubscriptionsTable.gemsBalance });
        balanceAfter = updated?.gemsBalance ?? 0;
      } else {
        // legacy
        const [updated] = await tx
          .update(usersTable)
          .set({
            gemsBalance: sql`GREATEST(0, ${usersTable.gemsBalance} - ${gems})`,
            gemsUsedToday: sql`${usersTable.gemsUsedToday} + ${gems}`,
          })
          .where(eq(usersTable.id, opts.userId))
          .returning({ gemsBalance: usersTable.gemsBalance });
        balanceAfter = updated?.gemsBalance ?? 0;
      }

      // STEP 3 — Update the ledger row with the actual post-debit balance.
      // The placeholder went in with balance_after=0 because we didn't know
      // the post-UPDATE value yet; this fixup makes the audit log accurate.
      await tx
        .update(gemLedgerTable)
        .set({ balanceAfter: Math.max(0, Math.floor(balanceAfter)) })
        .where(eq(gemLedgerTable.id, ledgerId));

      return { charged: true, gemsDeducted: actualDeducted, balanceAfter };
    });
  } catch (err: any) {
    logger.error(
      { err: err?.message, userId: opts.userId, requestId: opts.requestId, source: opts.source },
      "settleAiCharge: transaction failed",
    );
    return NO_OP_RESULT;
  }
}

export type RefundAiChargeOpts = {
  requestId: string;
  userId: number;
  source: GemLedgerSource;
  reason?: string | null;
};

/**
 * Reverse a previous debit by requestId. Idempotent: safe to call from both
 * the disconnect handler AND a top-level error catch — the second call is a
 * no-op because the refund row's own request_id (suffixed with `:refund`) is
 * unique-indexed too.
 *
 * If no debit was ever written for this requestId (e.g. the AI failed before
 * settle ran), returns `{ refunded: 0 }` — nothing to undo.
 */
export async function refundAiCharge(opts: RefundAiChargeOpts): Promise<{ refunded: number }> {
  if (!opts.requestId) return { refunded: 0 };
  const refundKey = `${opts.requestId}:refund`;

  try {
    return await db.transaction(async (tx) => {
      // Locate the original debit row.
      const [debit] = await tx
        .select()
        .from(gemLedgerTable)
        .where(and(
          eq(gemLedgerTable.userId, opts.userId),
          eq(gemLedgerTable.reason, "debit"),
          sql`${(gemLedgerTable as any).requestId} = ${opts.requestId}`,
        ))
        .orderBy(desc(gemLedgerTable.createdAt))
        .limit(1);
      if (!debit) return { refunded: 0 };

      const refundGems = Math.abs(debit.delta);
      if (refundGems <= 0) return { refunded: 0 };

      // Insert the refund row first; if a refund for this requestId already
      // exists (refundKey is unique-indexed), bail out as a no-op.
      const inserted = await tx
        .insert(gemLedgerTable)
        .values({
          userId: opts.userId,
          subjectSubId: debit.subjectSubId,
          subjectId: debit.subjectId,
          delta: refundGems,
          balanceAfter: 0,
          reason: "refund",
          source: opts.source,
          adminUserId: null,
          note: opts.reason ?? "auto-refund (no usable answer)",
          metadata: { requestId: opts.requestId, originalDebitId: debit.id },
          requestId: refundKey,
        } as any)
        .onConflictDoNothing({
          target: [gemLedgerTable.userId, (gemLedgerTable as any).requestId],
        })
        .returning({ id: gemLedgerTable.id });
      if (inserted.length === 0) return { refunded: 0 };

      let balanceAfter = 0;
      if (debit.subjectSubId != null) {
        const [updated] = await tx
          .update(userSubjectSubscriptionsTable)
          .set({
            gemsBalance: sql`${userSubjectSubscriptionsTable.gemsBalance} + ${refundGems}`,
            gemsUsedToday: sql`GREATEST(0, ${userSubjectSubscriptionsTable.gemsUsedToday} - ${refundGems})`,
          })
          .where(eq(userSubjectSubscriptionsTable.id, debit.subjectSubId))
          .returning({ gemsBalance: userSubjectSubscriptionsTable.gemsBalance });
        balanceAfter = updated?.gemsBalance ?? 0;
      } else {
        const [updated] = await tx
          .update(usersTable)
          .set({
            gemsBalance: sql`${usersTable.gemsBalance} + ${refundGems}`,
            gemsUsedToday: sql`GREATEST(0, ${usersTable.gemsUsedToday} - ${refundGems})`,
          })
          .where(eq(usersTable.id, opts.userId))
          .returning({ gemsBalance: usersTable.gemsBalance });
        balanceAfter = updated?.gemsBalance ?? 0;
      }

      await tx
        .update(gemLedgerTable)
        .set({ balanceAfter: Math.max(0, Math.floor(balanceAfter)) })
        .where(eq(gemLedgerTable.id, inserted[0].id));

      return { refunded: refundGems };
    });
  } catch (err: any) {
    logger.error(
      { err: err?.message, userId: opts.userId, requestId: opts.requestId },
      "refundAiCharge: transaction failed",
    );
    return { refunded: 0 };
  }
}

/** Generate a short, opaque request id for one AI call. */
export function newAiRequestId(): string {
  // Time-prefixed to keep ledger metadata sortable in raw SQL eyeballing.
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
