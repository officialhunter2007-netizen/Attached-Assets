---
name: activation claim must be inside the grant transaction
description: Why a "claim-first, then grant" two-step on activation cards creates a stuck-card split-brain, and the atomic fix.
---

# Card claim, legacy grant, and v4 funding must commit/roll back together

The activate-code flow originally claimed the card (`UPDATE ... SET isUsed=true
WHERE isUsed=false`) in a SEPARATE committed statement BEFORE running the grant
+ wallet-funding transaction, relying on a compensating "release the claim"
update if the tx failed.

**Problem (split-brain):** if the grant/funding tx fails AND the compensating
release also fails (or the process crashes in between), the card is marked used
but the student got nothing — an unrecoverable paid-card failure.

**Fix:** move the conditional claim INTO the same `db.transaction` as the grant
and the v4 funding. Inside the tx: claim → if 0 rows updated `throw
CARD_ALREADY_USED` → grant → fund. Any failure rolls the claim back atomically;
no compensating release needed. Map `CARD_ALREADY_USED` → 400, anything else →
500. Do all read-only resolution (region/price) BEFORE the tx so the hard-refuse
path returns without ever claiming.

**Why the conditional claim still gives concurrency safety inside the tx:**
parallel activations race on `WHERE isUsed=false RETURNING`; exactly one gets a
row, the loser throws `CARD_ALREADY_USED`. The row lock is held for the tx
duration.

**General rule:** any "consume a one-use token, then do paid work" flow must put
the consume and the work in one transaction. A pre-commit claim with post-hoc
compensation is not crash-safe.
