/**
 * pricing-formula.ts — Single source of truth for all gem-grant and cost-cap computations.
 *
 * Formula (1 US cent = 10 gems):
 *   priceUsd        = priceYer × yerToUsdRate(region)
 *   platformShare   = priceUsd / 2   → AI cost cap
 *   studentShare    = priceUsd / 2   → gems
 *   gemsGranted     = floor(studentShare × 100 × 10)
 *   dailyGemLimit   = floor(gemsGranted / SUB_DURATION_DAYS)
 *   aiCostCapUsd    = platformShare
 *
 * ⚠  Do NOT re-define gem amounts as hardcoded constants elsewhere in the
 *    codebase. All gem-grant and daily-limit values MUST flow through
 *    `computeGemsForPrice` or `computePricingBreakdown`. Hardcoded gem
 *    constants (like the old `PLAN_GEM_LIMITS`) silently decouple gem grants
 *    from admin-configured prices and must never be reintroduced.
 */

/** Subscription duration in days. Drives dailyGemLimit calculation. */
export const SUB_DURATION_DAYS = 14;

/**
 * Static fallback YER→USD conversion rates (stored as the YER-per-USD divisor).
 * Used only when the DB seed has not yet run or the DB read fails. The live
 * values are loaded from the `exchange_rates` table at server startup and after
 * every admin edit via `setYerToUsdRates`. Conservative (lower value → cap
 * kicks in earlier).
 *
 * ⚠ Do NOT mutate this object. To update the live rates use `setYerToUsdRates`.
 */
export const YER_PER_USD_FALLBACK: Record<string, number> = {
  north: 600,
  south: 2800,
};

/** Backward-compatible export — derived from the fallback divisors. */
export const YER_TO_USD_RATES: Record<string, number> = {
  north: 1 / YER_PER_USD_FALLBACK.north,
  south: 1 / YER_PER_USD_FALLBACK.south,
};

// In-memory cache of the live divisors. Initialised to the static fallback so
// the formula stays correct before the DB loader has run. `setYerToUsdRates`
// replaces this map (called from auto-migrate at startup and from the admin
// PATCH endpoint after a successful update).
let LIVE_YER_PER_USD: Record<string, number> = { ...YER_PER_USD_FALLBACK };

/** Replace the live YER-per-USD divisor map. Called by the DB loader. */
export function setYerToUsdRates(map: Record<string, number>): void {
  const next: Record<string, number> = { ...YER_PER_USD_FALLBACK };
  for (const [region, divisor] of Object.entries(map)) {
    if (Number.isFinite(divisor) && divisor > 0) {
      next[region] = divisor;
    }
  }
  LIVE_YER_PER_USD = next;
}

/** Read-only snapshot of the current live divisors (YER per 1 USD). */
export function getYerPerUsdMap(): Record<string, number> {
  return { ...LIVE_YER_PER_USD };
}

export function getYerToUsdRate(region: string | null | undefined): number {
  const divisor =
    (region && LIVE_YER_PER_USD[region]) || LIVE_YER_PER_USD.south || YER_PER_USD_FALLBACK.south;
  return 1 / divisor;
}

/**
 * Static fallback plan prices (YER). Used only when the DB read fails.
 * These mirror the seed values in auto-migrate.ts. All other code reads
 * live prices from the `plan_prices` table.
 */
export const BASE_PRICES_FALLBACK: Record<string, Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 2000, silver: 4000, gold: 6000 },
};

/**
 * Legacy price table for old subscriptions created before the 2026-04-26 price
 * doubling, which pre-date the `paid_price_yer` column. Using old prices keeps
 * the AI cost cap honest for those students.
 */
export const LEGACY_BASE_PRICES_YER: Record<string, Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 3000, silver: 6000, gold: 9000 },
};

export type PricingBreakdown = {
  priceYer: number;
  priceUsd: number;
  platformShareUsd: number;
  studentShareUsd: number;
  gemsGranted: number;
  dailyGemLimit: number;
  aiCostCapUsd: number;
  yerToUsdRate: number;
};

export function computePricingBreakdown(opts: {
  priceYer: number;
  region: string | null | undefined;
}): PricingBreakdown {
  const yerToUsdRate = getYerToUsdRate(opts.region);
  const priceUsd = opts.priceYer * yerToUsdRate;
  const platformShareUsd = priceUsd / 2;
  const studentShareUsd = priceUsd / 2;
  const gemsGranted = Math.floor(studentShareUsd * 100 * 10);
  const dailyGemLimit = Math.floor(gemsGranted / SUB_DURATION_DAYS);
  return {
    priceYer: opts.priceYer,
    priceUsd,
    platformShareUsd,
    studentShareUsd,
    gemsGranted,
    dailyGemLimit,
    aiCostCapUsd: platformShareUsd,
    yerToUsdRate,
  };
}

export function computeGemsForPrice(opts: {
  priceYer: number;
  region: string | null | undefined;
}): { gemsGranted: number; dailyGemLimit: number } {
  const { gemsGranted, dailyGemLimit } = computePricingBreakdown(opts);
  return { gemsGranted, dailyGemLimit };
}

export function computeAiCostCapUsd(opts: {
  priceYer: number;
  region: string | null | undefined;
}): number {
  return computePricingBreakdown(opts).aiCostCapUsd;
}

/** Infer paid YER for legacy rows that pre-date the `paid_price_yer` column. */
export function inferPaidYerFromPlan(
  planType: string,
  region: string | null | undefined,
): number {
  const r =
    (region && LEGACY_BASE_PRICES_YER[region]) || LEGACY_BASE_PRICES_YER.south;
  return r[planType] ?? 0;
}
