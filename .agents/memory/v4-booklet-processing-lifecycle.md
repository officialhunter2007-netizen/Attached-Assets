---
name: v4 booklet processing lifecycle & billing
description: Invariants for the v4 university-booklet upload pipeline — orphan recovery, pay-once billing, and the orphan-reaper safety model. Read before touching booklet upload/charge/reaper code.
---

# v4 booklet processing lifecycle

Booklet processing (extract → embed → tree-gen) is a **fire-and-forget in-memory
IIFE** kicked off after the upload route responds. It does NOT survive a server
restart/crash: the job dies, the row is left at `status='processing'`, and the FE
polls a 1%/"جاري التحضير" spinner forever. There is no in-process resume.

## Pay-once-per-file billing (load-bearing invariant)
The prep charge is **idempotent on a content-hash requestId**
(`v4_booklet_prep:<uid>:<slug>:<contentHash>`) and is **NEVER refunded on
failure**.

**Why:** the charge being idempotent means a same-file retry's re-charge is a
NO_OP ("already paid") that *still lets the retry run the work*. If you ALSO
refund on failure, you reverse the only debit while the NO_OP re-charge lets
processing proceed → a free booklet (revenue leak). Removing refunds is the fix;
do not "balance" it by also skipping the NO_OP path.

**How to apply:** failure paths mark the row `failed` only — no `refundV4Ai` on
the prep requestId. A failed row is deleted + re-inserted on the next same-file
upload (partial unique index excludes `failed`), and the retry completes the
already-paid work.

### Legacy-refund rebill guard
Old buggy code may have left a `<prepRequestId>:refund` row (esp. in production).
That refunded debit + the idempotent NO_OP re-charge = free booklet on retry.
Guard: before charging, if a `:refund` sibling exists, charge under a stable
`:rebill` key so the retry debits exactly once. Safe because no new prep refunds
are ever created → at most one refund per family → the `:rebill` key is stable.

## Orphan reaper safety model
Reaping a `processing` row is only safe when you KNOW its owning pipeline is dead.
Two callers of `reapOrphanedProcessingBooklets(minAgeMinutes)`:

- **Startup reaper (floor 1min), invoked from the app.listen success callback.**
  Acquiring the port proves the previous instance (and its in-memory jobs) is
  dead, so every `processing` row is orphaned. Must run AFTER `listen` (port =
  mutex): the duplicate workflow that loses the bind exits on EADDRINUSE before
  reaching the callback, so only the sole port-holder reaps. The 1min floor only
  spares uploads accepted in the tiny window between listen and the sweep.
  **Never** run the reaper before binding the port — it could reap a *live*
  other instance's booklets.

- **Periodic sweep (floor 20min), from scheduled-jobs (every 5min).** Safety net
  for a row orphaned by a crash within 60s of its creation — too young for the
  startup floor, so it would otherwise stay `processing` forever. This runs in
  the SAME live process, so it CANNOT use a small floor: a small floor would reap
  a legitimately in-flight upload (same process can't tell young-orphan from
  young-live by age alone). It is safe ONLY because the pipeline's own timeouts
  (extract 5m + embed 5m + tree 4m ≈ 14m worst case) guarantee no genuine job
  stays `processing` past ~20min. **If you change those timeouts, change the
  floor in lockstep** (`BOOKLET_ORPHAN_FLOOR_MIN` must exceed total wall time).

A naive "delayed second startup pass at +65s" is WRONG: 65s after listen a
legit fresh upload is also older than a 1min floor and gets wrongly reaped.

## Status-guarded terminal flips
Both the `ready` flip and the catch-block `failed` flip use
`WHERE id=? AND status='processing'`. A stale background run (whose row another
path already resolved/reaped) must not resurrect it to `ready` or clobber it.

## EADDRINUSE on the duplicate workflow
The two api-server workflows ("Start application" + "artifacts/api-server: API
Server") race for port 8080. uncaughtException on EADDRINUSE → `exit(0)` (clean
stepped-aside duplicate, no zombie); other errors stay alive. The duplicate
showing "failed" in the workflow list is benign/expected.
