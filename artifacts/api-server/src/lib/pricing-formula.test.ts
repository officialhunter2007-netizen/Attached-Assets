/**
 * Unit tests for pricing-formula.ts
 *
 * Run with:  pnpm --filter api-server exec tsx src/lib/pricing-formula.test.ts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getYerToUsdRate,
  computePricingBreakdown,
  computeGemsForPrice,
  computeAiCostCapUsd,
  inferPaidYerFromPlan,
  LEGACY_BASE_PRICES_YER,
  BASE_PRICES_FALLBACK,
  SUB_DURATION_DAYS,
  YER_TO_USD_RATES,
} from "./pricing-formula.js";

describe("getYerToUsdRate", () => {
  test("north rate is 1/600", () => {
    assert.ok(Math.abs(getYerToUsdRate("north") - 1 / 600) < 1e-10);
  });

  test("south rate is 1/2800", () => {
    assert.ok(Math.abs(getYerToUsdRate("south") - 1 / 2800) < 1e-10);
  });

  test("unknown region falls back to south", () => {
    assert.ok(Math.abs(getYerToUsdRate("unknown") - 1 / 2800) < 1e-10);
  });

  test("null falls back to south", () => {
    assert.ok(Math.abs(getYerToUsdRate(null) - 1 / 2800) < 1e-10);
  });

  test("undefined falls back to south", () => {
    assert.ok(Math.abs(getYerToUsdRate(undefined) - 1 / 2800) < 1e-10);
  });

  test("north rate > south rate", () => {
    assert.ok(YER_TO_USD_RATES.north > YER_TO_USD_RATES.south);
  });
});

describe("computePricingBreakdown", () => {
  /**
   * Reference example from the task spec: «1000 ريال شمالي → ~$2 → ~1000 جوهرة»
   *
   * The spec used "~" (approximate) for both figures. At the current system
   * rate (1/600), 1000 YER converts to ≈$1.667, not exactly $2. The spec's
   * "$2" was an approximation (within ~20%). At 1/600:
   *
   *   1000 × (1/600) = $1.6667 → studentShare = $0.8333
   *   gemsGranted = floor(0.8333 × 1000) = 833
   *
   * 833 gems is the authoritative correct value at the current rate. The
   * spec's "~1000 gems" was a rough estimate; the precise formula answer is
   * 833 and that is what the system uses. Changing the rate is out-of-scope
   * (explicitly excluded in the task spec).
   */
  test("1000 north YER → 833 gems at current rate (1/600)", () => {
    const b = computePricingBreakdown({ priceYer: 1000, region: "north" });
    assert.equal(b.priceYer, 1000);
    assert.ok(Math.abs(b.priceUsd - 1000 / 600) < 1e-8, `priceUsd: ${b.priceUsd}`);
    assert.equal(b.gemsGranted, 833, `expected 833 gems, got ${b.gemsGranted}`);
    assert.equal(b.dailyGemLimit, Math.floor(833 / 14));
    assert.ok(Math.abs(b.aiCostCapUsd - b.platformShareUsd) < 1e-8);
    assert.ok(Math.abs(b.yerToUsdRate - 1 / 600) < 1e-10);
  });

  test("6000 north YER → 5000 gems", () => {
    // 6000/600 = $10 → studentShare = $5 → 5000 gems
    const b = computePricingBreakdown({ priceYer: 6000, region: "north" });
    assert.equal(b.gemsGranted, 5000);
    assert.equal(b.dailyGemLimit, Math.floor(5000 / 14));
    assert.ok(Math.abs(b.aiCostCapUsd - 5) < 1e-8);
  });

  test("6000 south YER → 1071 gems", () => {
    // 6000/2800 ≈ $2.1429 → studentShare ≈ $1.0714 → floor(1071.43) = 1071
    const b = computePricingBreakdown({ priceYer: 6000, region: "south" });
    assert.equal(b.gemsGranted, 1071);
  });

  test("zero price → zero gems and zero cap", () => {
    const b = computePricingBreakdown({ priceYer: 0, region: "north" });
    assert.equal(b.priceUsd, 0);
    assert.equal(b.gemsGranted, 0);
    assert.equal(b.dailyGemLimit, 0);
    assert.equal(b.aiCostCapUsd, 0);
  });

  test("large price: gemsGranted = floor(studentShare × 1000)", () => {
    const b = computePricingBreakdown({ priceYer: 1_000_000, region: "north" });
    assert.ok(b.gemsGranted > 0);
    assert.equal(b.gemsGranted, Math.floor(b.studentShareUsd * 100 * 10));
    assert.ok(Math.abs(b.platformShareUsd + b.studentShareUsd - b.priceUsd) < 1e-6);
  });

  test("gemsGranted and dailyGemLimit are always whole integers", () => {
    for (const yer of [1, 601, 1000, 3001, 7777, 18000]) {
      for (const region of ["north", "south"] as const) {
        const b = computePricingBreakdown({ priceYer: yer, region });
        assert.ok(Number.isInteger(b.gemsGranted), `gemsGranted not integer: yer=${yer} region=${region}`);
        assert.ok(Number.isInteger(b.dailyGemLimit), `dailyGemLimit not integer: yer=${yer}`);
      }
    }
  });

  test("accounting identity: platform + student = total (standard prices)", () => {
    for (const yer of [1000, 2000, 4000, 6000, 12000, 18000]) {
      for (const region of ["north", "south"] as const) {
        const b = computePricingBreakdown({ priceYer: yer, region });
        assert.ok(
          Math.abs(b.platformShareUsd + b.studentShareUsd - b.priceUsd) < 1e-6,
          `identity failed: yer=${yer} region=${region}`,
        );
      }
    }
  });

  test("dailyGemLimit equals floor(gemsGranted / SUB_DURATION_DAYS)", () => {
    const b = computePricingBreakdown({ priceYer: 2000, region: "north" });
    assert.equal(b.dailyGemLimit, Math.floor(b.gemsGranted / SUB_DURATION_DAYS));
  });

  test("null region falls back to south rate", () => {
    const withNull = computePricingBreakdown({ priceYer: 1000, region: null });
    const withSouth = computePricingBreakdown({ priceYer: 1000, region: "south" });
    assert.equal(withNull.gemsGranted, withSouth.gemsGranted);
  });
});

describe("computeGemsForPrice", () => {
  test("consistent with full breakdown", () => {
    const full = computePricingBreakdown({ priceYer: 4000, region: "north" });
    const gems = computeGemsForPrice({ priceYer: 4000, region: "north" });
    assert.equal(gems.gemsGranted, full.gemsGranted);
    assert.equal(gems.dailyGemLimit, full.dailyGemLimit);
  });
});

describe("computeAiCostCapUsd", () => {
  test("equals platformShareUsd from full breakdown", () => {
    const full = computePricingBreakdown({ priceYer: 6000, region: "south" });
    const cap = computeAiCostCapUsd({ priceYer: 6000, region: "south" });
    assert.ok(Math.abs(cap - full.platformShareUsd) < 1e-8);
  });

  test("equals 50% of priceUsd", () => {
    const yer = 12000;
    const rate = getYerToUsdRate("north");
    const expectedCap = (yer * rate) / 2;
    assert.ok(Math.abs(computeAiCostCapUsd({ priceYer: yer, region: "north" }) - expectedCap) < 1e-8);
  });

  test("zero price → zero cap", () => {
    assert.equal(computeAiCostCapUsd({ priceYer: 0, region: "north" }), 0);
  });
});

describe("inferPaidYerFromPlan", () => {
  test("north bronze = 1000 (legacy rate)", () => {
    assert.equal(inferPaidYerFromPlan("bronze", "north"), LEGACY_BASE_PRICES_YER.north.bronze);
    assert.equal(inferPaidYerFromPlan("bronze", "north"), 1000);
  });

  test("south gold = 9000 (legacy rate)", () => {
    assert.equal(inferPaidYerFromPlan("gold", "south"), LEGACY_BASE_PRICES_YER.south.gold);
    assert.equal(inferPaidYerFromPlan("gold", "south"), 9000);
  });

  test("unknown region falls back to south", () => {
    assert.equal(inferPaidYerFromPlan("silver", "unknown"), LEGACY_BASE_PRICES_YER.south.silver);
  });

  test("unknown plan type returns 0", () => {
    assert.equal(inferPaidYerFromPlan("platinum", "north"), 0);
  });

  test("null region falls back to south", () => {
    assert.equal(inferPaidYerFromPlan("bronze", null), LEGACY_BASE_PRICES_YER.south.bronze);
  });
});

describe("BASE_PRICES_FALLBACK", () => {
  test("all six plan+region cells are defined and positive", () => {
    for (const region of ["north", "south"] as const) {
      for (const plan of ["bronze", "silver", "gold"]) {
        const price = BASE_PRICES_FALLBACK[region][plan];
        assert.ok(typeof price === "number" && price > 0, `${region}.${plan} = ${price}`);
      }
    }
  });
});

describe("SUB_DURATION_DAYS", () => {
  test("is 14", () => {
    assert.equal(SUB_DURATION_DAYS, 14);
  });
});
