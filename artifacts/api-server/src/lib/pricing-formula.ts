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

// ── v4 fixed package gems + admin-configurable charge rate ──────────────────
// Under the redesigned model the gems per package are FIXED. The admin sets the
// PRICE per package per region (plan_prices); the gem grant never changes.
export const PACKAGE_GEMS: Record<string, number> = {
  bronze: 1000,
  silver: 2200,
  gold: 3600,
};

/** Resolve the fixed gem grant for a plan type. Returns 0 for unknown plans. */
export function packageGems(planType: string | null | undefined): number {
  if (!planType) return 0;
  return PACKAGE_GEMS[planType.toLowerCase()] ?? 0;
}

/**
 * Assumed blended teaching-model price (USD per 1,000,000 tokens). Used ONLY
 * to translate the admin's friendly "gems per 1M tokens" knob into the internal
 * gems-per-USD constant. Actual AI charges ALWAYS use the real per-call token
 * cost (estimateGenerationCostUsd) × getGemsPerUsd(), so this reference never
 * affects billing accuracy — it only maps the admin number to the constant.
 * Gemini 2.5 Flash Lite is $0.10 in / $0.40 out per 1M; the midpoint ($0.25)
 * is used as the reference blend.
 */
export const TEACHING_REF_USD_PER_1M_TOKENS = 0.25;

/**
 * Default admin knob (gems per 1M teaching tokens). Chosen so the derived
 * gems-per-USD == 1000 (1 gem ≈ $0.001), preserving the economics that were
 * previously hardcoded as usdToGems(usd × 1000).
 */
export const DEFAULT_GEMS_PER_1M_TEACHING_TOKENS = 250;

/** payment_settings key that stores the admin knob. */
export const GEMS_PER_1M_SETTING_KEY = "ai.gems_per_1m_teaching_tokens";

// In-memory cache of the derived gems-per-USD constant. Initialised to the
// default so charging is correct before the DB loader runs. Replaced by
// `setGemsPer1MTeachingTokens` (called from auto-migrate at startup and from
// the admin PATCH endpoint after a successful update).
let LIVE_GEMS_PER_USD =
  DEFAULT_GEMS_PER_1M_TEACHING_TOKENS / TEACHING_REF_USD_PER_1M_TOKENS;

/** Replace the live gems-per-USD constant from the admin knob value. */
export function setGemsPer1MTeachingTokens(gemsPer1M: number): void {
  if (Number.isFinite(gemsPer1M) && gemsPer1M > 0) {
    LIVE_GEMS_PER_USD = gemsPer1M / TEACHING_REF_USD_PER_1M_TOKENS;
  }
}

/** Internal gems-per-USD constant (cost-per-gem in USD = 1 / this). */
export function getGemsPerUsd(): number {
  return LIVE_GEMS_PER_USD;
}

/** Current admin knob value (gems per 1M teaching tokens), derived from cache. */
export function getGemsPer1MTeachingTokens(): number {
  return LIVE_GEMS_PER_USD * TEACHING_REF_USD_PER_1M_TOKENS;
}

/**
 * Convert a real USD AI cost to gems using the live admin-configured rate.
 * SINGLE SOURCE OF TRUTH — every AI charge MUST go through this. Floors at 1
 * gem for any positive cost so a sub-cent turn still costs something.
 */
const FIXED_GEMS_PER_USD = 1000;

export function usdToGems(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.max(1, Math.floor(usd * LIVE_GEMS_PER_USD));
}

/**
 * Fixed-rate conversion for features NOT affected by admin pricing changes.
 * Always 1000 gems per USD regardless of the admin gems_per_1m setting.
 * Used by: coding rooms, visual explain, typing lessons.
 */
export function usdToGemsFixed(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.max(1, Math.floor(usd * FIXED_GEMS_PER_USD));
}

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
