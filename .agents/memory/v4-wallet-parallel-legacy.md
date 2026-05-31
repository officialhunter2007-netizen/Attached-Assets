---
name: v4 wallet parallel to legacy
description: Why v4 monthly gem wallet coexists with the legacy daily-cap wallet, and the contract between them.
---

The v4 monthly per-subject wallet (`student_gem_wallets`) and the legacy daily-cap wallet (`user_subject_subscriptions.gems_*`) coexist by design.

**Why both?** Removing the legacy path touches every student-facing AI route, the entire FE balance widget, the free-first-lesson onboarding, and the daily-rollover cron. That cutover is owned by a separate dedicated FE-migration workstream and must not happen inside the wallet-foundation work.

**How to apply:**
- On every admin approve, write BOTH wallets. The legacy grant runs inside the approve transaction (must succeed or the request rolls back). The v4 `purchaseV4Gems` call runs AFTER the transaction commits — best-effort, logs on failure, never blocks the admin UI or undoes the legacy grant.
- All student-facing reads (balance summary, daily remaining, access gating) continue to use the legacy wallet until FE cutover. Only ledger labels were extended for new v4 reasons.
- New code that needs to charge AI against v4 wallets must use `chargeV4Ai` / `refundV4Ai` from `v4-gem-wallet.ts`. Do NOT mix with `settleAiCharge` for the same `requestId` — both write to the same `gem_ledger(user_id, request_id)` unique index and would conflict.

**Welcome gift idempotency:** +100 gems on first wallet creation per `(user, subject)`, guarded by `welcome_gift_claimed`. Both `getOrCreateV4Wallet` (used on first AI access) and `purchaseV4Gems` (used on approve) check and flip the flag, so welcome can never double-grant regardless of which path fires first.

**Grace semantics:** `expires_at + 3 days` is the hard cutoff. `chargeV4Ai` refuses past that. `sweepV4ExpiredWallets` (hourly cron) zeroes the balance and writes `monthly_expiry`. A renewal inside the grace window preserves leftover gems and audits as `renewal_carryover`.
