---
name: v4 booklet lazy assessments
description: Rules for lazily-generated, cached booklet exams/labs — exact counts before caching, and grading anchors that must survive the progress jsonb round-trip.
---

# v4 booklet lazy assessments (exams + labs)

Booklet exam/lab questions are NOT authored at upload. They are generated on first
open (grounded in the booklet's own chunks), then cached **set-if-absent** into the
per-booklet progress jsonb so a reload shows the same set and submit grades a stable
answer key the client never sees.

## Rule 1 — enforce EXACT counts BEFORE caching
Generators must return exactly the requested size (exam unit=6 / final=10; lab=5)
*before* the set-if-absent cache write: slice down extras, and **throw** (→ route
returns 503 retry) when the model under-produces. Never cache a short/over-sized set.

**Why:** set-if-absent + first-writer-wins means whatever lands first becomes the
student's *permanent* assessment. A single thin/malformed generation (e.g. 3 of 6)
would otherwise be frozen in. A throw just triggers a clean regenerate on retry.

**How to apply:** any new lazy-generated, cached assessment needs a hard count gate
inside the generator (not only the route). The route passes the desired count down.

## Rule 2 — grading anchors must survive the jsonb round-trip AND stay server-only
Open-ended lab questions carry server-only `rubric` + `solutionOutline`. These must:
1. be authored by the generator (grounded prompt, length-capped),
2. be carried on the cache type,
3. be **explicitly rehydrated by `loadBookletProgress`** (the normalizer drops any
   field it doesn't copy — easy to lose silently),
4. be passed into `evaluateLabAnswer` in BOTH the live `/evaluate` and final
   `/submit` routes,
5. be **stripped from every client GET** (exam GET also strips `correctIndex` /
   `explanation`). Submit returns graded explanations, never the raw anchors.

**Why:** without persisted anchors the AI grader drifts to general knowledge instead
of the booklet, so scoring stops being booklet-grounded. And because the progress
normalizer is the round-trip gate, a field added to the cache type but not to the
normalizer is silently discarded on the next load.

**How to apply:** when adding any server-only field to an assessment cache, update the
normalizer in lockstep, and audit every GET projection to confirm it is omitted.

## Note — bounded AI input vs. rate limiting
Lab answers are length-capped (`BOOKLET_LAB_ANSWER_MAX`) before grading to bound token
cost.

## Booklet billing is now ACTIVE (was FREE)
The redesign turned booklet billing ON: booklet **teach** charges the v4 wallet
(`source: v4_booklet_teach`, real post-hoc token cost, `drainIfInsufficient:true`,
guarded by a per-wallet in-flight lock so parallel turns can't each stream free) and
lab/exam **generation** charges on first open. Exam **grading** stays deterministic-free
(MCQ `correctIndex`); lab grading is paid (Haiku). Any "booklet is free" note elsewhere
(incl. replit.md) is stale.
**Residual gaps (deferred, systemic — not booklet-specific):** charge-after-stream means
a transient DB error on the post-stream charge still leaks one free turn (pre-gate +
drain + in-flight lock mitigate the common races but not this); and the paid exam/lab
generation endpoints are still GET + `requireUser` only (no same-origin CSRF). Both need
a billing-architecture pass (pre-reservation / durable settlement; POST+CSRF), not a
point patch. Per-user rate-limiting is now relevant since these became paid.
