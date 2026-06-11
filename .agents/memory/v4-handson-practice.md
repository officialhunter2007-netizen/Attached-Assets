---
name: v4 hands-on practice (التطبيق العملي)
description: How the proactive "produce a real task" layer triggers, bills, and feeds mastery; the load-bearing design rules.
---

# v4 hands-on practice ("التطبيق العملي")

Proactive layer on top of the diagnostic engine: once a concept is grasped
(score≥50) but not yet *applied*, the student is offered ONE Yemeni-context
"produce/do" task, graded by the isolated Haiku grader, feeding monotonic mastery.

## Load-bearing decisions (don't regress these)

- **Trigger is server-computed, delivered via the SSE `done` event** (`handsOnOffer:{conceptIndex,conceptName}|null`), NOT a model-emitted marker.
  **Why:** the teaching Gemini is too weak to reliably emit/withhold markers; trusting it to signal "now apply" corrupts the flow. The diagnostic engine decides; the model only narrates. Any future "trigger X from the lesson" feature for this model should follow the same server-decides pattern, not a new [[MARKER]].

- **The APPLY decision is disjoint per-turn, strict priority:** gap (untested→probe / weak<50→drill) > grasped≥50 unapplied → APPLY > shaky-applied → reinforce > advance. Recomputed in v4_teach.ts AFTER applyTagEffects so it reflects this turn's [MASTERY] writes.
  **Consequence to remember:** this makes hands-on effectively MANDATORY to clear the 75 mastery gate — a student who ignores the card gets APPLY every turn with no chat-only path past it. That is intended (it's the core differentiator). If a fallback is ever wanted, add "after N ignored offers → fall through to reinforce."

- **Mastery monotonicity must be enforced in-SQL with `GREATEST(score, EXCLUDED/value)` inside onConflictDoUpdate, NOT read-modify-write.**
  **Why:** a concurrent teach-turn [MASTERY] write can land between the route's `scoreBefore` read and its upsert; plain `score: scoreAfter` would silently lower it. GREATEST makes "mastery only ever goes up" atomic.

- **APPLY fires exactly once per concept** via `applied_at` set with `COALESCE(applied_at, NOW())`. Refund-on-grader-fail path (503) must NOT set applied_at, so the offer re-fires.

- **Rubric + solution_outline are server-only.** The GET task endpoint returns only title/scenario/deliverable/steps. Never widen it.

## Storage / billing notes

- Tasks cached in a DEDICATED table `v4_concept_hands_on` (version-scoped, unique index), NOT a column on v4_concept_drills — keeps the cache decoupled from drills.
- Charge reuses the existing valid GemLedgerSource `"v4_lab_grade"` (hands-on is a rubric-graded mini-lab; the ledger `note` disambiguates). Side effect: per-source finance breakdowns merge hands-on with lab spend.
- Idempotent requestId: `v4handson_${uid}_${lessonId}_${conceptIndex}_${nonce}`.
