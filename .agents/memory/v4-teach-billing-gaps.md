---
name: v4 teach post-stream billing gaps
description: Two revenue leaks inherent to "charge AFTER the stream" SSE teaching, and how each must be closed.
---

# Post-stream charging on /v4/teach leaks revenue two ways

The v4 teaching turn streams the AI reply FIRST and charges the wallet AFTER
(so it only bills for real usage). That ordering creates two distinct free-turn
holes; a pre-stream affordability check alone does NOT close either.

## 1. Sequential low-balance drain hole
A wallet parked at a small positive balance (0 < balance < per-turn cost) passes
any `balance >= 1` gate, but the post-stream conditional debit (cost > balance)
refuses and leaves the balance UNTOUCHED — so every subsequent turn is free
forever.
**Fix:** the charge path must support draining — when the full-cost debit fails
but the wallet still has a positive in-grace balance, take everything down to
zero (and rewrite the ledger placeholder to the actual amount). That caps free
exposure to ONE partial turn; the next pre-stream gate sees balance < 1 and
blocks.
**Why:** the conditional UPDATE is all-or-nothing by design (it powers
idempotent settlement); without an explicit drain branch the "remainder" is
never collectible.

## 2. Concurrent-turn hole
The pre-stream gate is a CHECK, not a RESERVATION. N parallel requests for the
same (user, subject) all pass while balance is still positive, each streams a
full reply, and only one actually charges/drains — the rest are free.
**Fix:** serialize teach turns per (user, subject) with an in-flight guard.
Acquire synchronously (no await between the membership check and the add) so the
race is tight; reject the loser with the same terminal SSE contract the FE
already understands (no AI call).
**Lock-release rule:** once acquired, EVERY exit path must release it. Put the
acquisition immediately before the work, then ensure all code after it lives
under one try/finally (declare heartbeat/listeners BEFORE the try so finally can
always tear them down). Early-return catch blocks that sit between acquisition
and the main try must each release too. A single unguarded throw between
acquire and the finally = a wallet stuck-locked until process restart.
**Why in-process is acceptable here:** the server runs single-instance. If ever
horizontally scaled, swap for a DB advisory lock or a real pre-stream debit
reservation.
