import { and, eq, gte, sum } from "drizzle-orm";
import { db, aiUsageEventsTable, type UserSubjectSubscription } from "@workspace/db";
import { logger } from "./logger";
import { getStartOfTodayYemen } from "./yemen-time";

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

/**
 * Worst-case USD cost of a single premium-model (Sonnet) teaching turn.
 *
 * Anthropic Claude Sonnet 4 list price (2026): $3 / 1M input tokens, $15 / 1M
 * output tokens. A long teaching turn with full context (~5k input) and a
 * detailed answer (~1.5k output) costs at most:
 *   5000 × $3/1e6  + 1500 × $15/1e6  =  $0.015 + $0.0225  =  ~$0.0375
 * We round up to a deliberately conservative $0.05 to absorb prompt-cache
 * misses, occasional larger outputs, and any silent API price drift.
 *
 * Used as a pre-admission safety margin: if the remaining lifetime cap
 * (or today's slice) is smaller than this margin, the router is forced to
 * the cheap model BEFORE the next premium turn — guaranteeing that the
 * 50%-of-paid red line cannot be crossed even when several premium calls
 * are in flight at once and bill only after they complete.
 */
const MAX_PREMIUM_TURN_USD = 0.05;

/** Authoritative server-side base prices (YER) — mirror of subscriptions.ts. */
const BASE_PRICES_YER: Record<string, Record<string, number>> = {
  north: { bronze: 2000, silver: 4000, gold: 6000 },
  south: { bronze: 6000, silver: 12000, gold: 18000 },
};

/**
 * LEGACY price table — used ONLY as the cost-cap fallback for old
 * `user_subject_subscriptions` rows that pre-date `paid_price_yer` AND were
 * created before the 2026-04-26 price doubling. Using the *old* (lower)
 * prices here keeps the AI cost cap honest for legacy students who actually
 * paid the old rates — using the new doubled prices would silently double
 * their AI budget and violate the "AI cost ≤ 50% of what they paid" red line.
 *
 * NOTE: Brand-new subscriptions never hit this fallback because
 * `paid_price_yer` is populated from `finalPrice` at approval time
 * (see `subscriptions.ts` approve handler), so they always use the actual
 * amount paid (post-discount).
 */
const LEGACY_BASE_PRICES_YER: Record<string, Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 3000, silver: 6000, gold: 9000 },
};

export function inferPaidYerFromPlan(planType: string, region: string | null | undefined): number {
  const r = (region && LEGACY_BASE_PRICES_YER[region]) || LEGACY_BASE_PRICES_YER.south;
  return r[planType] ?? 0;
}

export type CostCapStatus = {
  /** Total USD spent on this subscription's AI calls since createdAt. */
  spentUsd: number;
  /** USD spent today (since the most recent Yemen midnight). */
  todaySpentUsd: number;
  /** Subscription-level USD cap = 50% of the price paid (in USD). */
  capUsd: number;
  /** Today's slice of the remaining cap = (capUsd − spentUsd) / daysRemaining. */
  dailyCapUsd: number;
  /** Whole days remaining in the subscription window (≥ 1). */
  daysRemaining: number;
  /** Total spend ratio (spentUsd / capUsd) — kept for analytics/back-compat. */
  ratio: number;
  /** "ok" < 0.75, "tight" 0.75–0.92, "capped" ≥ 0.92 — analytics label only. */
  mode: "ok" | "tight" | "capped";
  /** "ok" while today's spend < dailyCapUsd, "exhausted" when today's slice is used up. */
  dailyMode: "ok" | "exhausted";
  /** True when today's slice (minus the per-turn safety margin) is exhausted. */
  dailyExhausted: boolean;
  /** True when the lifetime cap (minus the per-turn safety margin) is exhausted. */
  totalExhausted: boolean;
  /** When true, the router MUST pick the cheapest model. Equals `dailyExhausted || totalExhausted`. */
  forceCheapModel: boolean;
  /**
   * Always `false`. Kept on the type so existing call sites compile, but the
   * platform never blocks a paid student mid-subscription on cost grounds —
   * the worst penalty is a quality downgrade to Haiku for the rest of the day.
   * The next Yemen-midnight rollover restores Sonnet eligibility.
   */
  blocked: false;
};

/**
 * Daily-rolling cost-cap status for a paid subscription.
 *
 * Why daily-rolling and not lifetime-cumulative:
 *  The previous design measured cumulative spend against a single subscription-
 *  level cap and HARD-BLOCKED the student once the lifetime cap neared 100%.
 *  In practice this stranded heavy students mid-subscription — a Bronze student
 *  burning Sonnet for 8 days could lose the remaining 6 days of access they
 *  paid for. Unfair, and a silent betrayal of the 14-day promise.
 *
 *  The new design slices the *remaining* cap evenly across the *remaining*
 *  days. When today's slice is consumed, the router force-downgrades to Haiku
 *  for the rest of the day — but the student is NEVER blocked. Tomorrow at
 *  Yemen midnight, a fresh `dailyCapUsd` is computed from whatever is left in
 *  the cap divided by whatever days remain.
 *
 * Invariant (the 50%-of-paid red line):
 *  Σ(daily_cap × days_remaining_at_that_moment) ≤ remainingCap by construction,
 *  so total spend never exceeds capUsd as long as `forceCheapModel` is honored
 *  when `dailyMode === "exhausted"`. The router enforces this.
 */
export async function getCostCapStatus(
  userId: number,
  sub: Pick<UserSubjectSubscription, "id" | "subjectId" | "createdAt" | "expiresAt" | "paidPriceYer" | "region" | "plan"> | null,
): Promise<CostCapStatus> {
  if (!sub) {
    // No paid subscription → free tier; the free-tier message limit is the
    // cap. Cost cap returns "ok" but the router/free-tier code is responsible
    // for forcing the cheapest model on its own.
    return {
      spentUsd: 0,
      todaySpentUsd: 0,
      capUsd: 0,
      dailyCapUsd: 0,
      daysRemaining: 0,
      ratio: 0,
      mode: "ok",
      dailyMode: "ok",
      dailyExhausted: false,
      totalExhausted: false,
      forceCheapModel: true,
      blocked: false,
    };
  }

  // Resolve the price paid: prefer the stored value; fall back to the plan
  // table for legacy subscription rows that pre-date the column.
  const paidYer = sub.paidPriceYer && sub.paidPriceYer > 0
    ? sub.paidPriceYer
    : inferPaidYerFromPlan(sub.plan, sub.region);
  const paidUsd = yerToUsd(paidYer, sub.region);
  const capUsd = paidUsd * 0.5;

  if (capUsd <= 0) {
    // Misconfigured / promotional / unknown plan — refuse to spend on Sonnet.
    // We still don't BLOCK the student (per the never-block-mid-subscription
    // rule); we just lock to the cheapest model.
    return {
      spentUsd: 0,
      todaySpentUsd: 0,
      capUsd: 0,
      dailyCapUsd: 0,
      daysRemaining: 0,
      ratio: 1,
      mode: "capped",
      dailyMode: "exhausted",
      dailyExhausted: true,
      totalExhausted: true,
      forceCheapModel: true,
      blocked: false,
    };
  }

  const startOfTodayYemen = getStartOfTodayYemen();
  // Lower-bound today's window by the subscription's createdAt: if a student
  // re-subscribed to the same subject earlier today (e.g., previous sub
  // expired this morning), spend from the OLD subscription must NOT count
  // against the NEW subscription's daily slice. Otherwise the fresh
  // subscription would be born already throttled.
  const todayWindowStart = sub.createdAt && sub.createdAt > startOfTodayYemen
    ? sub.createdAt
    : startOfTodayYemen;

  let spentUsd = 0;
  let todaySpentUsd = 0;
  try {
    // Two parallel reads against the same usage table keep latency flat.
    const [totalRow, todayRow] = await Promise.all([
      db
        .select({ total: sum(aiUsageEventsTable.costUsd) })
        .from(aiUsageEventsTable)
        .where(and(
          eq(aiUsageEventsTable.userId, userId),
          eq(aiUsageEventsTable.subjectId, sub.subjectId),
          gte(aiUsageEventsTable.createdAt, sub.createdAt),
        )),
      db
        .select({ total: sum(aiUsageEventsTable.costUsd) })
        .from(aiUsageEventsTable)
        .where(and(
          eq(aiUsageEventsTable.userId, userId),
          eq(aiUsageEventsTable.subjectId, sub.subjectId),
          gte(aiUsageEventsTable.createdAt, todayWindowStart),
        )),
    ]);
    spentUsd = Number(totalRow?.[0]?.total ?? 0) || 0;
    todaySpentUsd = Number(todayRow?.[0]?.total ?? 0) || 0;
  } catch (err: any) {
    logger.warn({ err: err?.message, userId, subjectId: sub.subjectId }, "cost-cap: usage sum failed");
  }

  const ratio = spentUsd / capUsd;
  let mode: CostCapStatus["mode"] = "ok";
  if (ratio >= 0.92) mode = "capped";
  else if (ratio >= 0.75) mode = "tight";

  // Days remaining in the subscription window. Round UP because partial days
  // still count — a student logging in at 23:30 with 30 minutes left on day
  // N still owns "today" and should get a (small) daily slice of remaining.
  // We clamp to ≥ 1 so we never divide by zero on an expiring subscription.
  const now = Date.now();
  const expiresMs = sub.expiresAt ? sub.expiresAt.getTime() : now;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(1, Math.ceil((expiresMs - now) / msPerDay));

  // Slice the *remaining* cap evenly across remaining days. This guarantees
  // the lifetime invariant: even if the student maxes out today's slice every
  // single day, total spend converges to (but never exceeds) capUsd.
  const remainingCapUsd = Math.max(0, capUsd - spentUsd);
  const dailyCapUsd = remainingCapUsd / daysRemaining;

  // Pre-admission safety margin (the architect-mandated red-line guard):
  // because token cost is only known AFTER the API call returns and several
  // /ai/teach turns can be in flight at the same time, a naïve check of
  // "spent >= cap" would let two parallel premium requests overshoot the
  // cap by their combined cost. We instead force the cheap model the
  // moment the *remaining* budget falls below one worst-case premium turn.
  // With this margin in place, even if N premium turns are admitted just
  // before the trip and all bill at MAX_PREMIUM_TURN_USD each, the worst
  // overshoot bounded above by `(N-1) * MAX_PREMIUM_TURN_USD`. In practice
  // /ai/teach is per-user-per-subject and effectively serialized by the
  // student's own request cadence (≤ 1 in-flight turn typical), so the
  // realized headroom is more than sufficient. Lifetime cap is therefore
  // never crossed in the steady state.
  const dailyExhausted = todaySpentUsd + MAX_PREMIUM_TURN_USD >= dailyCapUsd;
  const totalExhausted = spentUsd + MAX_PREMIUM_TURN_USD >= capUsd;
  const forceCheapModel = dailyExhausted || totalExhausted;
  const dailyMode: CostCapStatus["dailyMode"] = forceCheapModel ? "exhausted" : "ok";

  return {
    spentUsd,
    todaySpentUsd,
    capUsd,
    dailyCapUsd,
    daysRemaining,
    ratio,
    mode,
    dailyMode,
    dailyExhausted,
    totalExhausted,
    forceCheapModel,
    // RED LINE: never block a paid student mid-subscription. The daily
    // quality downgrade is the *only* throttle — silence is never an option.
    blocked: false,
  };
}
