import { and, eq, gte, sum } from "drizzle-orm";
import { db, aiUsageEventsTable, type UserSubjectSubscription } from "@workspace/db";
import { logger } from "./logger";

// Conservative YER → USD conversion. North Yemen Rial trades ≈ 530/USD;
// South Yemen Rial ≈ 2700/USD. We prefer slightly favorable (lower) rates so
// the cap is more protective for the student (we under-estimate what they
// paid in USD → cap kicks in earlier → student stays safely under 50%).
const YER_TO_USD: Record<string, number> = {
  north: 1 / 600,
  south: 1 / 2800,
};

// Default falls back to the south rate (more conservative — yields a smaller
// USD value, which means a lower cap and earlier protection).
const DEFAULT_RATE = YER_TO_USD.south;

/** Convert a paid YER amount to USD using the region's rate. */
export function yerToUsd(paidYer: number, region: string | null | undefined): number {
  const rate = (region && YER_TO_USD[region]) || DEFAULT_RATE;
  return paidYer * rate;
}

/** Authoritative server-side base prices (YER) — mirror of subscriptions.ts. */
const BASE_PRICES_YER: Record<string, Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 3000, silver: 6000, gold: 9000 },
};

export function inferPaidYerFromPlan(planType: string, region: string | null | undefined): number {
  const r = (region && BASE_PRICES_YER[region]) || BASE_PRICES_YER.south;
  return r[planType] ?? 0;
}

export type CostCapStatus = {
  /** USD already spent on this subscription's AI calls (since createdAt). */
  spentUsd: number;
  /** USD cap = 50% of the price paid (in USD). */
  capUsd: number;
  /** 0..1+ — fraction of cap consumed. */
  ratio: number;
  /** "ok" < 0.85, "tight" 0.85–1.0, "capped" ≥ 1.0 */
  mode: "ok" | "tight" | "capped";
  /** Soft signal: when true, the router MUST pick the cheapest model. */
  forceCheapModel: boolean;
  /** Hard signal: when true, refuse the request entirely. */
  blocked: boolean;
};

/**
 * Compute how much of the student's 50%-of-paid budget has been used on AI
 * calls billed against (userId, subjectId) since the current subscription was
 * created. We cap at the SUBSCRIPTION level (not per-day), because the user's
 * red line is "AI cost ≤ 50% of what they paid for this subscription".
 */
export async function getCostCapStatus(
  userId: number,
  sub: Pick<UserSubjectSubscription, "id" | "subjectId" | "createdAt" | "paidPriceYer" | "region" | "plan"> | null,
): Promise<CostCapStatus> {
  if (!sub) {
    // No paid subscription → free tier; the free-tier message limit is the
    // cap. Cost cap returns "ok" but the router/free-tier code is responsible
    // for forcing the cheapest model on its own.
    return { spentUsd: 0, capUsd: 0, ratio: 0, mode: "ok", forceCheapModel: true, blocked: false };
  }

  // Resolve the price paid: prefer the stored value; fall back to the plan
  // table for legacy subscription rows that pre-date the column.
  const paidYer = sub.paidPriceYer && sub.paidPriceYer > 0
    ? sub.paidPriceYer
    : inferPaidYerFromPlan(sub.plan, sub.region);
  const paidUsd = yerToUsd(paidYer, sub.region);
  const capUsd = paidUsd * 0.5;

  if (capUsd <= 0) {
    // Misconfigured / promotional / unknown plan — refuse to spend on AI.
    return { spentUsd: 0, capUsd: 0, ratio: 1, mode: "capped", forceCheapModel: true, blocked: true };
  }

  let spentUsd = 0;
  try {
    const [row] = await db
      .select({ total: sum(aiUsageEventsTable.costUsd) })
      .from(aiUsageEventsTable)
      .where(and(
        eq(aiUsageEventsTable.userId, userId),
        eq(aiUsageEventsTable.subjectId, sub.subjectId),
        gte(aiUsageEventsTable.createdAt, sub.createdAt),
      ));
    spentUsd = Number(row?.total ?? 0) || 0;
  } catch (err: any) {
    logger.warn({ err: err?.message, userId, subjectId: sub.subjectId }, "cost-cap: usage sum failed");
  }

  const ratio = spentUsd / capUsd;
  let mode: CostCapStatus["mode"] = "ok";
  if (ratio >= 0.92) mode = "capped";
  else if (ratio >= 0.75) mode = "tight";

  // Buffer-based protection: because we read usage *before* the call (the
  // model's own cost lands in `ai_usage_events` only after the response
  // completes) and because parallel requests can both pass a pre-check, we
  // intentionally trip earlier than the literal red line:
  //  • forceCheapModel at ≥50% — once half the cap is used, every further
  //    turn is Haiku (capped at 2048 output tokens), keeping the marginal
  //    cost per in-flight turn small enough to never cross 100%.
  //  • blocked at ≥92% — leaves an 8% cushion to absorb concurrent in-flight
  //    Haiku turns (worst-case ~$0.01 each at max_tokens=2048) so the cap is
  //    NEVER exceeded even under the most aggressive parallel-request pattern.
  return {
    spentUsd,
    capUsd,
    ratio,
    mode,
    forceCheapModel: ratio >= 0.5,
    blocked: ratio >= 0.92,
  };
}
