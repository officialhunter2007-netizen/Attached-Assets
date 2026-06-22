---
name: v4 gem model — fixed packages vs derived breakdown
description: pricing-formula.ts intentionally keeps TWO gem models side by side; don't "fix" the derived one thinking the redesign is incomplete. Read before touching gem grants or the admin price UI.
---

# v4 gem model: fixed package gems vs the derived breakdown

`pricing-formula.ts` deliberately contains BOTH:
- **`PACKAGE_GEMS` / `packageGems(planType)`** — FIXED gems per plan (Bronze 1000 /
  Silver 2200 / Gold 3600). This is what the actual v4 student grant uses
  (`purchaseV4GemsTx` → `gemsGranted = packageGems(opts.planType)`), with a 30-day
  window + 3-day grace and NO daily cap.
- **`computePricingBreakdown` / `computeGemsForPrice`** — price-DERIVED gems +
  `dailyGemLimit` over `SUB_DURATION_DAYS=14`. RETAINED ON PURPOSE, but ONLY for
  (a) the AI cost cap = platform 50% share (`aiCostCapUsd = priceUsd/2`) and
  (b) the parallel legacy `user_subject_subscriptions` grant.

**The trap:** seeing the derived formula + the 14-day constant still present, you may
conclude "the fixed-gems redesign was never finished" and rewrite the grant. It WAS
finished — the v4 wallet grants fixed gems; the derived breakdown survives only for the
cost cap and legacy. Confirm what the GRANT path calls before changing anything.

**Admin price UI must mirror the GRANT, not the breakdown.** The admin only edits the
PRICE per (package, region). The price-preview must show FIXED `PACKAGE_GEMS` and the AI
cost cap (`priceUsd/2`) — NOT derived gems and NOT a daily limit. A stale preview that
recomputes derived gems / a daily cap misleads the operator even when the backend is
correct (this is exactly what was wrong and got fixed).

**How to apply:** gem-grant changes go through `packageGems`; cost-cap/legacy math goes
through `computePricingBreakdown`. Keep the FE mirror (`admin-plan-prices.tsx`) on the
fixed model. The single admin charge knob ("gems per 1M teaching tokens") feeds
`getGemsPerUsd()` and is independent of the package grant.
