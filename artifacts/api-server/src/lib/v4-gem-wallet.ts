/**
 * v4-gem-wallet.ts — Monthly per-subject gem wallet (50/50 split + welcome gift).
 *
 * Parallel to the legacy `user_subject_subscriptions` daily-cap wallet (kept
 * in service until the full FE cutover in task #10). All v4 wallet mutations
 * go through this module so the accounting story is uniform:
 *
 *   purchaseV4Gems        — atomic: split price 50/50, write purchase_gems +
 *                           platform_revenue rows, merge balance, extend expiry.
 *                           Carries leftover on a renewal at/before expiry as a
 *                           `renewal_carryover` audit row when applicable.
 *   getOrCreateV4Wallet   — first-touch wallet creation + one-shot +100
 *                           `welcome_gift`. Idempotent on (userId, subjectId).
 *   chargeV4Ai            — post-AI debit. Idempotent on requestId via the
 *                           same DB-unique-on-(user_id, request_id) index
 *                           that powers settleAiCharge.
 *   refundV4Ai            — reverse a debit by requestId. Idempotent.
 *   sweepV4ExpiredWallets — cron entry-point: after expiry (grace = 0)
 *                           zero out positive balances and audit as
 *                           `monthly_expiry`.
 *
 * Gem economy:
 *   1 US cent = 10 gems. So 1 USD = 1000 gems.
 *   gems = floor(usd × 1000) — same exchange used by chargeV4Ai and
 *   computePricingBreakdown's `gemsGranted` formula, just expressed as
 *   "cents × 10" there. Both must remain in lock-step.
 *
 * Why parallel-to-legacy:
 *   Removing the legacy daily-cap / midnight-forfeit / free-first-lesson path
 *   touches dozens of student-facing routes and the entire FE balance widget.
 *   That cutover is owned by task #10. Until then, both wallets coexist and
 *   only the v4 wallet is populated for new purchases routed through
 *   `purchaseV4Gems` (the approve flow calls it AFTER the legacy grant, as a
 *   best-effort additional write — neither path blocks the other).
 */

import { and, eq, gt, lt, sql, isNotNull } from "drizzle-orm";
import {
  db,
  studentGemWalletsTable,
  gemLedgerTable,
} from "@workspace/db";
import { logger } from "./logger";
import {
  computePricingBreakdown,
  packageGems,
  usdToGems,
  usdToGemsFixed,
  type PricingBreakdown,
} from "./pricing-formula";
import type { GemLedgerSource } from "./gem-ledger";

/**
 * Per-subject welcome gift is DISABLED — replaced by the global one-time
 * 150-gem welcome pool the student allocates across up to 3 specialties
 * (see lib/v4-welcome-gift.ts). Kept at 0 so any residual reference is a no-op.
 */
export const V4_WELCOME_GIFT_GEMS = 0;

/**
 * Grace days after expiry. Set to 0 — a subscription ends EXACTLY at
 * `expiresAt` with no extra free days; the one-time 150-gem welcome gift is the
 * trial instead. Kept as a named constant so the grace-window logic (charge
 * gate, carryover, expiry sweep) degenerates cleanly to "no grace" and can be
 * re-enabled by bumping this value.
 */
export const V4_GRACE_DAYS = 0;

/** Monthly subscription window length. */
export const V4_SUB_DURATION_DAYS = 30;

/**
 * Re-exported from pricing-formula so the many existing
 * `import { usdToGems } from "../lib/v4-gem-wallet"` call sites keep working.
 * The conversion rate is admin-configurable (gems per 1M teaching tokens).
 */
export { usdToGems };

export type V4Wallet = {
  id: number;
  userId: number;
  subjectId: string;
  gemsBalance: number;
  expiresAt: Date | null;
  welcomeGiftClaimed: boolean;
};

/**
 * Get-or-create a v4 wallet for (userId, subjectId). On first creation grants
 * a one-shot +100 `welcome_gift`. Idempotent: subsequent calls return the
 * existing wallet without re-granting the gift.
 *
 * Race-safe via INSERT ... ON CONFLICT DO NOTHING — two concurrent first-touch
 * calls collapse into a single welcome-gift row.
 */
export async function getOrCreateV4Wallet(
  userId: number,
  subjectId: string,
): Promise<V4Wallet> {
  // First touch creates an EMPTY wallet (the per-subject welcome gift is
  // retired). The wallet is funded later by a global welcome-gift allocation
  // or a package purchase.
  return await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(studentGemWalletsTable)
      .values({
        userId,
        subjectId,
        gemsBalance: 0,
        welcomeGiftClaimed: false,
        // expiresAt left NULL until first real purchase or gift allocation.
      })
      .onConflictDoNothing({
        target: [studentGemWalletsTable.userId, studentGemWalletsTable.subjectId],
      })
      .returning();

    if (inserted.length > 0) {
      const w = inserted[0];
      // No per-subject welcome gift — a fresh wallet starts empty. The student
      // funds it via the global welcome-gift allocation or a package purchase.
      return {
        id: w.id,
        userId: w.userId,
        subjectId: w.subjectId,
        gemsBalance: w.gemsBalance,
        expiresAt: w.expiresAt,
        welcomeGiftClaimed: w.welcomeGiftClaimed,
      }; // close return object
    } // close if(staleIdempotency)

    // Already existed (lost the race or returning visitor) — read it.
    const [existing] = await tx
      .select()
      .from(studentGemWalletsTable)
      .where(and(
        eq(studentGemWalletsTable.userId, userId),
        eq(studentGemWalletsTable.subjectId, subjectId),
      ));
    return {
      id: existing.id,
      userId: existing.userId,
      subjectId: existing.subjectId,
      gemsBalance: existing.gemsBalance,
      expiresAt: existing.expiresAt,
      welcomeGiftClaimed: existing.welcomeGiftClaimed,
    };
  });
}

export type AffordV4Result = {
  /** True when the student may take one teaching turn. */
  ok: boolean;
  /** Current wallet balance after any first-touch welcome gift. */
  balance: number;
  /** True when there is no usable wallet (should not happen after auto-create). */
  noWallet: boolean;
  /** True when a wallet exists but is empty or past its grace window. */
  insufficient: boolean;
};

/**
 * PRE-STREAM GATE. Decides whether a student may start a teaching turn BEFORE
 * any AI tokens (and therefore any OpenRouter cost) are spent.
 *
 * Without this gate `/v4/teach` would stream a full reply and only attempt the
 * charge afterwards — so a student with no/empty/expired wallet would receive
 * unlimited free AI teaching (the paywall banner is purely cosmetic once the
 * answer has already streamed). This closes that hole.
 *
 * Auto-creates the wallet on first touch (granting the one-time +100 welcome
 * gift) so brand-new students still get their free trial, exactly as the
 * post-stream charge path used to.
 */
export async function canAffordV4Turn(
  userId: number,
  subjectId: string,
): Promise<AffordV4Result> {
  // First touch creates the wallet + welcome gift; returning students read it.
  const wallet = await getOrCreateV4Wallet(userId, subjectId);
  const balance = wallet.gemsBalance ?? 0;

  // Mirror the grace-window rule enforced by chargeV4Ai: a wallet with no
  // expiry set yet (welcome-gift-only) is always live; otherwise it must be
  // within expiresAt + grace.
  const now = Date.now();
  const withinGrace = wallet.expiresAt
    ? now <= wallet.expiresAt.getTime() + V4_GRACE_DAYS * 24 * 60 * 60 * 1000
    : true;

  // A turn always costs at least 1 gem (usdToGems floors at 1). Requiring a
  // strictly positive balance is what makes zero-balance == no-stream.
  const ok = balance >= 1 && withinGrace;

  // Fallback: if subject wallet is empty, try the global welcome wallet
  if (!ok && subjectId !== "_welcome") {
    const welcome = await getOrCreateV4Wallet(userId, "_welcome");
    const wBalance = welcome.gemsBalance ?? 0;
    const wWithinGrace = welcome.expiresAt
      ? now <= welcome.expiresAt.getTime() + V4_GRACE_DAYS * 24 * 60 * 60 * 1000
      : true;
    if (wBalance >= 1 && wWithinGrace) {
      return { ok: true, balance: wBalance, noWallet: false, insufficient: false };
    }
  }

  return {
    ok,
    balance,
    noWallet: false,
    insufficient: !ok,
  };
}

export type PurchaseV4Opts = {
  userId: number;
  subjectId: string;
  subjectName?: string | null;
  /** YER paid by the student (post-discount). */
  paidPriceYer: number;
  region: string | null | undefined;
  /** Optional approval bookkeeping for the ledger metadata. */
  subscriptionRequestId?: number | null;
  activationCode?: string | null;
  planType?: string | null;
};

export type PurchaseV4Result = {
  walletId: number;
  breakdown: PricingBreakdown;
  /** Balance AFTER merging the new purchase. */
  balanceAfter: number;
  /** Gems brought over from a previous unexpired window (0 if first purchase or expired past grace). */
  carriedOver: number;
  /** New `expires_at` (30 days from now). */
  expiresAt: Date;
};

/**
 * Atomic 50/50 purchase. Writes:
 *   - `purchase_gems`    (+gemsGranted)
 *   - `platform_revenue` ( 0 delta, audit-only — platform USD share)
 *   - `renewal_carryover` if a non-zero balance was preserved from a prior window
 *
 * All four operations (wallet upsert + 3 ledger rows) run inside one
 * transaction. Welcome-gift handling: if this is the first time the wallet
 * is created via purchase (no prior `getOrCreateV4Wallet` call), the +100
 * is granted INSIDE this same transaction so the student gets a single
 * unified balance immediately.
 *
 * Renewal semantics (grace = 0):
 *   - Bought AT/BEFORE expiry → leftover gems are preserved AND audited as a
 *     `renewal_carryover` row.
 *   - Bought AFTER expiry (or wallet never existed) → start fresh.
 */
export async function purchaseV4Gems(opts: PurchaseV4Opts): Promise<PurchaseV4Result> {
  return await db.transaction(async (tx) => purchaseV4GemsTx(tx, opts));
}

/**
 * Same as `purchaseV4Gems` but runs inside a caller-supplied transaction so the
 * purchase can be made ATOMIC with another operation (e.g. the admin approval
 * flow which writes the legacy grant + activation card in the same tx). If this
 * throws, the caller's whole transaction rolls back — guaranteeing the student
 * is never charged-without-gems or granted-without-payment.
 */
export async function purchaseV4GemsTx(
  tx: any,
  opts: PurchaseV4Opts,
): Promise<PurchaseV4Result> {
  const breakdown = computePricingBreakdown({
    priceYer: opts.paidPriceYer,
    region: opts.region,
  });
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + V4_SUB_DURATION_DAYS * 24 * 60 * 60 * 1000);

  {
    // SELECT FOR UPDATE — serialize against concurrent purchases for the
    // same (user, subject) so we don't lose a carryover or duplicate a
    // welcome-gift inside the same race window.
    const [existing] = await tx
      .select()
      .from(studentGemWalletsTable)
      .where(and(
        eq(studentGemWalletsTable.userId, opts.userId),
        eq(studentGemWalletsTable.subjectId, opts.subjectId),
      ))
      .for("update");

    let walletId: number;
    let priorBalance = 0;
    let priorExpiresAt: Date | null = null;

    if (existing) {
      walletId = existing.id;
      priorBalance = existing.gemsBalance ?? 0;
      priorExpiresAt = existing.expiresAt;
    } else {
      const [created] = await tx
        .insert(studentGemWalletsTable)
        .values({
          userId: opts.userId,
          subjectId: opts.subjectId,
          gemsBalance: 0,
          welcomeGiftClaimed: false,
        })
        .returning();
      walletId = created.id;
    }

    // Compute carryover. After expiry = lose it; at/before expiry = keep.
    // With grace = 0, insideGrace collapses onto insideWindow (same boundary).
    const graceCutoff = priorExpiresAt
      ? new Date(priorExpiresAt.getTime() + V4_GRACE_DAYS * 24 * 60 * 60 * 1000)
      : null;
    const insideGrace = graceCutoff ? now.getTime() <= graceCutoff.getTime() : false;
    const insideWindow = priorExpiresAt ? now.getTime() <= priorExpiresAt.getTime() : false;
    const carriedOver = insideWindow || insideGrace ? priorBalance : 0;

    // FIXED package grant (Bronze/Silver/Gold). The gems per package never vary
    // with price — the admin only edits the PRICE. The per-subject welcome gift
    // is retired; gifting is handled by the global 150-gem welcome pool.
    const gemsGranted = packageGems(opts.planType);
    if (gemsGranted <= 0) {
      throw new Error("V4_UNKNOWN_PLAN");
    }

    const newBalance = carriedOver + gemsGranted;

    await tx
      .update(studentGemWalletsTable)
      .set({
        gemsBalance: newBalance,
        expiresAt: newExpiresAt,
        lastRenewalAt: now,
        updatedAt: now,
      })
      .where(eq(studentGemWalletsTable.id, walletId));

    // Ledger rows — written inside the same transaction so the wallet
    // mutation and the audit trail are atomic.
    const ledgerMetadata: Record<string, unknown> = {
      walletId,
      paidPriceYer: opts.paidPriceYer,
      region: opts.region ?? null,
      priceUsd: breakdown.priceUsd,
      yerToUsdRate: breakdown.yerToUsdRate,
      gemsGranted,
      planType: opts.planType ?? null,
      activationCode: opts.activationCode ?? null,
      subscriptionRequestId: opts.subscriptionRequestId ?? null,
    };

    if (carriedOver > 0 && existing && (insideGrace || insideWindow)) {
      await tx.insert(gemLedgerTable).values({
        userId: opts.userId,
        subjectId: opts.subjectId,
        delta: 0,
        balanceAfter: carriedOver,
        reason: "renewal_carryover",
        source: "v4_renewal",
        note: insideWindow
          ? `تجديد مبكر — تم ترحيل ${carriedOver} جوهرة من الباقة السابقة`
          : `تجديد خلال فترة السماح — تم ترحيل ${carriedOver} جوهرة`,
        metadata: {
          walletId,
          carriedOver,
          priorExpiresAt: priorExpiresAt?.toISOString() ?? null,
          insideGrace,
          insideWindow,
        },
      } as any);
    }

    await tx.insert(gemLedgerTable).values({
      userId: opts.userId,
      subjectId: opts.subjectId,
      delta: gemsGranted,
      balanceAfter: newBalance,
      reason: "purchase_gems",
      source: "v4_purchase",
      note: opts.planType ? `شراء باقة ${opts.planType}` : "شراء باقة جواهر",
      metadata: ledgerMetadata,
    } as any);

    // Platform-revenue audit row. delta=0 because it does NOT touch the
    // student's wallet — it records the FULL payment as platform revenue so
    // finance reporting can sum earnings directly from the ledger. The AI cost
    // is tracked separately via the per-call `debit` rows.
    await tx.insert(gemLedgerTable).values({
      userId: opts.userId,
      subjectId: opts.subjectId,
      delta: 0,
      balanceAfter: newBalance,
      reason: "platform_revenue",
      source: "v4_purchase",
      note: `إيراد المنصة: ${breakdown.priceUsd.toFixed(4)} دولار`,
      metadata: {
        ...ledgerMetadata,
        revenueUsd: breakdown.priceUsd,
      },
    } as any);

    return {
      walletId,
      breakdown: { ...breakdown, gemsGranted },
      balanceAfter: newBalance,
      carriedOver,
      expiresAt: newExpiresAt,
    };
  }
}

export type ChargeV4Opts = {
  /** Unique-per-AI-call id. Same requestId twice = no double-charge. */
  requestId: string;
  userId: number;
  subjectId: string;
  /** Cost in USD as reported by the AI billing layer. */
  costUsd: number;
  source: GemLedgerSource;
  model?: string | null;
  note?: string | null;
  /**
   * When the wallet has a POSITIVE but insufficient balance (0 < balance <
   * cost), drain it to zero instead of refusing. This caps free exposure for
   * streamed AI to a SINGLE partial turn: after the drain the balance is 0, so
   * the pre-stream gate blocks every subsequent turn. Without this, a student
   * parked at a low balance whose per-turn cost exceeds it would receive
   * unlimited replies for free (the charge silently no-ops, balance unchanged).
   */
  drainIfInsufficient?: boolean;
  /** When true, use the fixed 1000 gems/USD rate regardless of admin settings. */
  useFixedRate?: boolean;
};

export type ChargeV4Result = {
  charged: boolean;
  gemsDeducted: number;
  balanceAfter: number | null;
  /** Set when the wallet exists but is empty / out-of-grace. */
  insufficient?: boolean;
  /** Set when there is no v4 wallet for this (user, subject). */
  noWallet?: boolean;
  /**
   * Set when the charge transaction itself failed (DB / driver error) — i.e.
   * the no-op is NOT a legitimate "free by rate" or "already settled" outcome.
   * Callers (runV4PaidWork) must fail closed on this rather than serve the
   * paid work for free.
   */
  error?: boolean;
};

const NO_OP: ChargeV4Result = { charged: false, gemsDeducted: 0, balanceAfter: null };

/**
 * Post-AI debit. Idempotent on requestId via the existing
 * gem_ledger(user_id, request_id) unique index. Rejects when the wallet is
 * empty or past its grace window — caller should refund any partial AI cost.
 */
export async function chargeV4Ai(opts: ChargeV4Opts): Promise<ChargeV4Result> {
  const gems = opts.useFixedRate ? usdToGemsFixed(opts.costUsd) : usdToGems(opts.costUsd);
  if (gems <= 0) return NO_OP;
  if (!opts.requestId) {
    logger.error({ userId: opts.userId, source: opts.source }, "chargeV4Ai: missing requestId");
    // Return error:true so runV4PaidWork fails closed instead of running paid
    // work for free. A missing requestId is always a caller programming error.
    return { ...NO_OP, error: true };
  }

  const baseMetadata: Record<string, unknown> = {
    requestId: opts.requestId,
    model: opts.model ?? null,
    costUsd: opts.costUsd,
  };

  try {
    return await db.transaction(async (tx) => {
      // STEP 1 — Claim the requestId by inserting a placeholder ledger row.
      const inserted = await tx
        .insert(gemLedgerTable)
        .values({
          userId: opts.userId,
          subjectId: opts.subjectId,
          delta: -gems,
          balanceAfter: 0,
          reason: "debit",
          source: opts.source,
          note: opts.note ?? null,
          metadata: baseMetadata,
          requestId: opts.requestId,
        } as any)
        .onConflictDoNothing({
          target: [gemLedgerTable.userId, (gemLedgerTable as any).requestId],
        })
        .returning({ id: gemLedgerTable.id });

      if (inserted.length === 0) {
        return NO_OP; // Duplicate — another concurrent settle already won.
      }
      const ledgerId = inserted[0].id;

      // STEP 2 — Conditional UPDATE: only debit when the v4 wallet has
      // enough gems AND is still inside its grace window. If 0 rows return,
      // throw to roll the placeholder back.
      const now = new Date();
      const graceCutoffSql = sql`(${studentGemWalletsTable.expiresAt} + (${V4_GRACE_DAYS} || ' days')::interval)`;

      const [updated] = await tx
        .update(studentGemWalletsTable)
        .set({
          gemsBalance: sql`${studentGemWalletsTable.gemsBalance} - ${gems}`,
          updatedAt: now,
        })
        .where(and(
          eq(studentGemWalletsTable.userId, opts.userId),
          eq(studentGemWalletsTable.subjectId, opts.subjectId),
          sql`${studentGemWalletsTable.gemsBalance} >= ${gems}`,
          // Either no expiry set yet (welcome-gift-only wallet) OR still
          // within the grace window.
          sql`(${studentGemWalletsTable.expiresAt} IS NULL OR ${now} <= ${graceCutoffSql})`,
        ))
        .returning({ gemsBalance: studentGemWalletsTable.gemsBalance });

      if (!updated) {
        // Fallback: try the global welcome wallet inline (same transaction, no recursion)
        if (opts.subjectId !== "_welcome") {
          const [welcomeUpdated] = await tx
            .update(studentGemWalletsTable)
            .set({
              gemsBalance: sql`${studentGemWalletsTable.gemsBalance} - ${gems}`,
              updatedAt: now,
            })
            .where(and(
              eq(studentGemWalletsTable.userId, opts.userId),
              eq(studentGemWalletsTable.subjectId, "_welcome"),
              sql`${studentGemWalletsTable.gemsBalance} >= ${gems}`,
              sql`(${studentGemWalletsTable.expiresAt} IS NULL OR ${now} <= ${graceCutoffSql})`,
            ))
            .returning({ gemsBalance: studentGemWalletsTable.gemsBalance });

          if (welcomeUpdated) {
            // Update the placeholder ledger row to reflect welcome wallet
            await tx
              .update(gemLedgerTable)
              .set({ balanceAfter: welcomeUpdated.gemsBalance, subjectId: "_welcome", delta: -gems } as any)
              .where(eq(gemLedgerTable.id, ledgerId));
            const finalBalance = Number(welcomeUpdated.gemsBalance ?? 0);
            return { charged: true, gemsDeducted: gems, balanceAfter: finalBalance, insufficient: false, noWallet: false };
          }
        }

        if (!opts.drainIfInsufficient) {
          throw new Error("V4_INSUFFICIENT_OR_EXPIRED");
        }
        // DRAIN PATH — the full-cost debit failed. Lock the wallet row and, if
        // it still has a POSITIVE balance and is inside grace, take everything
        // that's left (down to zero) rather than serving the turn for free.
        const [locked] = await tx
          .select()
          .from(studentGemWalletsTable)
          .where(and(
            eq(studentGemWalletsTable.userId, opts.userId),
            eq(studentGemWalletsTable.subjectId, opts.subjectId),
          ))
          .for("update");

        if (!locked) throw new Error("V4_NO_WALLET");

        const graceMs = V4_GRACE_DAYS * 24 * 60 * 60 * 1000;
        const withinGrace = locked.expiresAt
          ? now.getTime() <= locked.expiresAt.getTime() + graceMs
          : true;
        const remaining = locked.gemsBalance ?? 0;

        // Nothing to drain (already empty) or out of grace → genuine reject.
        if (!withinGrace || remaining <= 0) {
          throw new Error("V4_INSUFFICIENT_OR_EXPIRED");
        }

        await tx
          .update(studentGemWalletsTable)
          .set({ gemsBalance: 0, updatedAt: now })
          .where(eq(studentGemWalletsTable.id, locked.id));

        // Rewrite the placeholder to reflect the ACTUAL gems taken, not the
        // full intended cost, so the ledger stays balanced.
        await tx
          .update(gemLedgerTable)
          .set({
            delta: -remaining,
            balanceAfter: 0,
            metadata: { ...baseMetadata, drained: true, intendedGems: gems },
          })
          .where(eq(gemLedgerTable.id, ledgerId));

        // charged:true (we DID take their gems) AND insufficient:true (the turn
        // wasn't fully covered → FE shows the paywall and the next turn is
        // blocked by the zero-balance gate).
        return { charged: true, gemsDeducted: remaining, balanceAfter: 0, insufficient: true };
      }

      // STEP 3 — Fix up the ledger balance_after to the real post-debit value.
      await tx
        .update(gemLedgerTable)
        .set({ balanceAfter: Math.max(0, updated.gemsBalance) })
        .where(eq(gemLedgerTable.id, ledgerId));

      return { charged: true, gemsDeducted: gems, balanceAfter: updated.gemsBalance };
    });
  } catch (err: any) {
    if (err?.message === "V4_INSUFFICIENT_OR_EXPIRED") {
      // Read the wallet to disambiguate "no wallet" vs "empty / expired".
      const [w] = await db
        .select()
        .from(studentGemWalletsTable)
        .where(and(
          eq(studentGemWalletsTable.userId, opts.userId),
          eq(studentGemWalletsTable.subjectId, opts.subjectId),
        ));
      if (!w) return { ...NO_OP, noWallet: true };
      return { ...NO_OP, insufficient: true, balanceAfter: w.gemsBalance };
    }
    logger.error(
      { err: err?.message, userId: opts.userId, requestId: opts.requestId, source: opts.source },
      "chargeV4Ai: transaction failed",
    );
    // Flag the transient failure so runV4PaidWork can fail closed instead of
    // mistaking it for a "free by rate" / "already settled" no-op.
    return { ...NO_OP, error: true };
  }
}

export type RefundV4Opts = {
  requestId: string;
  userId: number;
  subjectId: string;
  source: GemLedgerSource;
  reason?: string | null;
};

/**
 * Reverse a previous v4 debit by requestId. Idempotent — the refund row is
 * keyed on `${requestId}:refund` so a double-refund collapses to one.
 */
export async function refundV4Ai(opts: RefundV4Opts): Promise<{ refunded: number }> {
  if (!opts.requestId) return { refunded: 0 };
  const refundKey = `${opts.requestId}:refund`;

  try {
    return await db.transaction(async (tx) => {
      const [debit] = await tx
        .select()
        .from(gemLedgerTable)
        .where(and(
          eq(gemLedgerTable.userId, opts.userId),
          eq(gemLedgerTable.reason, "debit"),
          sql`${(gemLedgerTable as any).requestId} = ${opts.requestId}`,
        ))
        .limit(1);
      if (!debit) return { refunded: 0 };

      const refundGems = Math.abs(debit.delta);
      if (refundGems <= 0) return { refunded: 0 };

      // Targeting safety: always credit BACK to the same wallet that was
      // debited. The caller's subjectId is treated as advisory — if it
      // disagrees with the original debit's subjectId, trust the debit
      // (cross-subject corruption is worse than a noisy log line).
      const targetSubjectId = debit.subjectId ?? opts.subjectId;
      if (debit.subjectId && opts.subjectId && debit.subjectId !== opts.subjectId) {
        logger.warn(
          {
            requestId: opts.requestId,
            callerSubjectId: opts.subjectId,
            debitSubjectId: debit.subjectId,
          },
          "refundV4Ai: caller subjectId mismatch — using debit's subjectId",
        );
      }

      const inserted = await tx
        .insert(gemLedgerTable)
        .values({
          userId: opts.userId,
          subjectId: targetSubjectId,
          delta: refundGems,
          balanceAfter: 0,
          reason: "refund",
          source: opts.source,
          note: opts.reason ?? "استرداد تلقائي (فشل الاستدعاء)",
          metadata: { requestId: opts.requestId, originalDebitId: debit.id },
          requestId: refundKey,
        } as any)
        .onConflictDoNothing({
          target: [gemLedgerTable.userId, (gemLedgerTable as any).requestId],
        })
        .returning({ id: gemLedgerTable.id });
      if (inserted.length === 0) return { refunded: 0 };

      const [updated] = await tx
        .update(studentGemWalletsTable)
        .set({
          gemsBalance: sql`${studentGemWalletsTable.gemsBalance} + ${refundGems}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(studentGemWalletsTable.userId, opts.userId),
          eq(studentGemWalletsTable.subjectId, targetSubjectId),
        ))
        .returning({ gemsBalance: studentGemWalletsTable.gemsBalance });

      const balanceAfter = updated?.gemsBalance ?? 0;
      await tx
        .update(gemLedgerTable)
        .set({ balanceAfter: Math.max(0, balanceAfter) })
        .where(eq(gemLedgerTable.id, inserted[0].id));

      return { refunded: refundGems };
    });
  } catch (err: any) {
    logger.error(
      { err: err?.message, userId: opts.userId, requestId: opts.requestId },
      "refundV4Ai: transaction failed",
    );
    return { refunded: 0 };
  }
}

/**
 * Refund-aware idempotency key resolver. A deterministic `requestId` is
 * idempotent on the gem_ledger(user_id, request_id) unique index: charging it
 * twice NO_OPs. That's correct for a genuine duplicate, but a money LEAK after a
 * REFUND — a failed paid call refunds its debit, so a retry under the SAME id
 * would NO_OP and then run the paid work for FREE (net 0 gems, 2 executions).
 *
 * Each failed attempt leaves exactly one `${key}:refund` row. We walk the
 * family (`base`, `base#r1`, `base#r2`, …) and return the FIRST key whose debit
 * has NOT yet been refunded:
 *   - happy path (no prior refund): a single probe, returns `base`.
 *   - concurrent retries: both observe the same first-unrefunded key → collapse
 *     to ONE debit (bill-once-under-concurrency preserved).
 *   - genuine post-refund retry: the refunded key is skipped → a fresh key is
 *     charged exactly once (no free work).
 * Exact-equality probes (no LIKE) so underscores in keys can't false-match.
 */
export async function resolveRebillKey(userId: number, base: string): Promise<string> {
  if (!base) return base;
  for (let n = 0; n <= 50; n++) {
    const candidate = n === 0 ? base : `${base}#r${n}`;
    const [refunded] = await db
      .select({ id: gemLedgerTable.id })
      .from(gemLedgerTable)
      .where(and(
        eq(gemLedgerTable.userId, userId),
        eq(gemLedgerTable.reason, "refund"),
        eq((gemLedgerTable as any).requestId, `${candidate}:refund`),
      ))
      .limit(1);
    if (!refunded) return candidate;
  }
  // Pathological: 50+ failed retries on one base. Fall through to a unique key
  // so the work is still BILLED rather than silently served free.
  return `${base}#r${Date.now()}`;
}

export type RunV4PaidWorkOpts<T> = {
  requestId: string;
  userId: number;
  subjectId: string;
  costUsd: number;
  source: GemLedgerSource;
  model?: string | null;
  note?: string | null;
  /** The actual paid AI work. Must throw on failure so the charge is refunded. */
  run: () => Promise<T>;
};

export type RunV4PaidWorkResult<T> =
  | { ok: true; result: T; charge: ChargeV4Result }
  | { ok: false; reason: "insufficient" | "no_wallet"; balance: number | null };

/**
 * Canonical non-stream "paid AI surface" wrapper used by every lazy/one-shot
 * AI call (placement generation, scenes, …). Sequence:
 *   1. PRE-GATE — refuse up-front when the wallet is empty / past grace.
 *   2. CHARGE   — idempotent on `requestId` (a duplicate / transient no-op that
 *      is NOT flagged `insufficient` falls through to run, mirroring the other
 *      non-stream surfaces; the requestId guards against a real double-debit).
 *   3. RUN      — execute the work; on ANY throw, refund the debit so a failed
 *      call is never billed, then re-throw for the caller to map to a response.
 *
 * Streaming surfaces (teach) keep their own charge-after-stream logic because
 * they bill real post-hoc token cost; this helper is for fixed-cost calls.
 */
export async function runV4PaidWork<T>(
  opts: RunV4PaidWorkOpts<T>,
): Promise<RunV4PaidWorkResult<T>> {
  const afford = await canAffordV4Turn(opts.userId, opts.subjectId);
  if (!afford.ok) {
    return {
      ok: false,
      reason: afford.noWallet ? "no_wallet" : "insufficient",
      balance: afford.balance,
    };
  }

  // Refund-aware key: a prior failed attempt under `opts.requestId` left a
  // refund row; charging the same id again would NO_OP and serve free work.
  const chargeRequestId = await resolveRebillKey(opts.userId, opts.requestId);
  const charge = await chargeV4Ai({
    requestId: chargeRequestId,
    userId: opts.userId,
    subjectId: opts.subjectId,
    costUsd: opts.costUsd,
    source: opts.source,
    model: opts.model ?? null,
    note: opts.note ?? null,
  });
  if (!charge.charged && (charge.insufficient || charge.noWallet)) {
    return {
      ok: false,
      reason: charge.noWallet ? "no_wallet" : "insufficient",
      balance: charge.balanceAfter,
    };
  }
  // Fail closed on a transient charge failure: running the paid work here would
  // serve it for free. Surface the failure so the caller retries / falls back
  // rather than leaking unbilled AI. (A "free by rate" gems<=0 no-op or an
  // idempotent duplicate still falls through to run — those are intentional.)
  if (!charge.charged && charge.error) {
    throw new Error("V4_CHARGE_FAILED");
  }

  try {
    const result = await opts.run();
    return { ok: true, result, charge };
  } catch (err) {
    if (charge.charged) {
      await refundV4Ai({
        requestId: chargeRequestId,
        userId: opts.userId,
        subjectId: opts.subjectId,
        source: opts.source,
        reason: "فشل الاستدعاء — استرداد تلقائي",
      }).catch(() => {});
    }
    throw err;
  }
}

/**
 * Cron entry-point. For every v4 wallet whose `expires_at < now` (grace = 0)
 * AND whose `gems_balance > 0`, zero out the balance and write a
 * `monthly_expiry` audit row.
 *
 * Idempotent: a second pass on the same day finds no positive-balance
 * past-grace rows and does nothing.
 */
export async function sweepV4ExpiredWallets(): Promise<{ swept: number; errors: number }> {
  const now = new Date();
  let swept = 0;
  let errors = 0;

  try {
    const due = await db
      .select()
      .from(studentGemWalletsTable)
      .where(and(
        isNotNull(studentGemWalletsTable.expiresAt),
        gt(studentGemWalletsTable.gemsBalance, 0),
        lt(
          sql`(${studentGemWalletsTable.expiresAt} + (${V4_GRACE_DAYS} || ' days')::interval)`,
          now,
        ),
      ));

    for (const w of due) {
      try {
        await db.transaction(async (tx) => {
          // Lock the wallet row INSIDE the transaction and re-read its
          // current balance — a debit or refund could have landed between
          // the outer SELECT and now. The ledger delta MUST match the
          // amount actually burned by this UPDATE, not the snapshot taken
          // before the lock.
          const [locked] = await tx
            .select({
              id: studentGemWalletsTable.id,
              gemsBalance: studentGemWalletsTable.gemsBalance,
              expiresAt: studentGemWalletsTable.expiresAt,
            })
            .from(studentGemWalletsTable)
            .where(eq(studentGemWalletsTable.id, w.id))
            .for("update");
          if (!locked || locked.gemsBalance <= 0) return;

          // Re-check expiry under the lock — a renewal during the SELECT
          // window could have pushed expires_at forward.
          const graceCutoffMs = locked.expiresAt
            ? locked.expiresAt.getTime() + V4_GRACE_DAYS * 24 * 60 * 60 * 1000
            : null;
          if (!graceCutoffMs || graceCutoffMs >= now.getTime()) return;

          const burned = locked.gemsBalance;
          await tx
            .update(studentGemWalletsTable)
            .set({ gemsBalance: 0, updatedAt: now })
            .where(eq(studentGemWalletsTable.id, w.id));

          await tx.insert(gemLedgerTable).values({
            userId: w.userId,
            subjectId: w.subjectId,
            delta: -burned,
            balanceAfter: 0,
            reason: "monthly_expiry",
            source: "v4_expiry_sweep",
            note: `انتهى الاشتراك — تم تصفير الرصيد`,
            metadata: {
              walletId: w.id,
              expiredBalance: burned,
              expiresAt: locked.expiresAt?.toISOString() ?? null,
              graceDays: V4_GRACE_DAYS,
            },
          } as any);
        });
        swept++;
      } catch (err: any) {
        errors++;
        logger.error(
          { err: err?.message, walletId: w.id, userId: w.userId, subjectId: w.subjectId },
          "v4-wallet: expiry sweep failed for one wallet",
        );
      }
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "v4-wallet: expiry sweep query failed");
  }

  return { swept, errors };
}
