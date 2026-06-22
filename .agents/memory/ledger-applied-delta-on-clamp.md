---
name: Ledger the applied delta, not the requested delta, when balance is SQL-clamped
description: Admin/AI gem mutations that clamp balance (GREATEST/LEAST) must record the actual applied delta or append-only reconciliation breaks.
---

## The rule
When a wallet balance update is clamped in SQL (e.g. `gemsBalance = GREATEST(0, balance + delta)` or `LEAST(cap, …)`), the matching `gem_ledger` row must record the **actual applied delta** = `newBalance − oldBalance`, NOT the requested delta. Keep the requested value in `metadata` for audit.

**Why:** The ledger is append-only and reconciled by the invariant `delta == balanceAfter − balanceBefore`. Recording the requested delta when a clamp truncated it (balance 50, request −1000 → balance 0) writes `delta=-1000, balanceAfter=0`, which double-counts the missing 950 and overstates burn/deductions in every downstream report.

**How to apply:** Read the clamped balance back via `.returning()`, compute `applied = updated.balance − prior.balance`, ledger `applied`, and stash `{ requestedDelta, appliedDelta, previousBalance }` in metadata. Direction tags (refund vs adjust) can still follow the admin's *intent* (sign of the requested delta).

**Known offenders:** the v4 `POST /admin/v4/wallets/:id/adjust` (now fixed). The legacy `POST .../refund-gems` (LEAST(cap, GREATEST(0, …))) in `subscriptions.ts` still ledgers the raw requested delta — same latent bug, left untouched as out-of-scope but fix it if you ever touch that route.
