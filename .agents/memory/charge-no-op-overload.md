---
name: chargeV4Ai NO_OP overload
description: A charge helper that signals dedupe and unexpected errors identically can silently grant free work; callers must disambiguate.
---
A wallet-charge helper that returns the same "no-flag NO_OP" shape for two very different cases — a legitimate idempotent retry (the ledger row already exists, the work was already paid for) versus an unexpected transaction error (no ledger row, the work was NOT paid for) — pushes the disambiguation burden onto every caller. If any caller treats both cases identically, transient DB errors silently grant free work.

**Why:** the symptom is invisible (no error log, no exception), but bills go missing under load.

**How to apply:**
- For any code path that needs to act on "charged OR confirmed-already-paid", after a no-flag NO_OP, query the ledger by `(user_id, request_id)` and only proceed if a row exists.
- If no row exists, mark the unit-of-work failed and return a transient error (e.g. 503).
- Better long-term fix: refactor the helper to return an explicit discriminant (`"charged" | "duplicate" | "insufficient" | "no_wallet" | "error"`) so callers can't accidentally conflate cases.
