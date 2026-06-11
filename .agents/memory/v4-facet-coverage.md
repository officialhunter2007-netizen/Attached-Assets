---
name: v4 facet coverage layer
description: How the deterministic W1-W4 facet-coverage teaching layer works, and the prompt-time-vs-post-effects decision rule that governs "what was asked" signals.
---

# v4 facet coverage ("دون مبالغة")

A deterministic, domain-general layer that forces the weak v4 teacher to cover the
full surface of each concept beyond W1 behavior:
- **W1 ماذا** = existing mastery score; **W4 طبّقه** = existing hands-on (`appliedAt`).
- **W2 لماذا** (rationale) and **W3 الحدود** (boundary/break + error&why) are the new
  middle facets, persisted in `v4_concept_mastery.facets` jsonb `{w2,w3,pending}`.
- **DEPTH is WEIGHTED**: `concept.weight > 1` → require all 4 facets; `weight = 1`
  → only W1+W4. This is the "no overkill" guard, alongside a 2-attempt cap.
- Facet nuggets (predictPrompt + rubric + solutionOutline) are LAZY-GENERATED on the
  first facet turn and CACHED in `v4_concept_facets`. rubric/solutionOutline stay
  server-side; only student-facing fields enter the directive.
- Facet answers are graded by the ISOLATED grader (`evaluateLabAnswer`), NOT by a new
  teacher tag. The teacher emits NO `[MASTERY]` on facet turns.

## THE decision rule (the bug that cost a full review cycle)

There are TWO different diagnostic decisions per turn, and they must not be confused:
- **Prompt-time decision** — computed from PRE-effects state inside
  `buildTeacherSystemPrompt`; this is what actually drove the directive / what the
  student was asked. It is now returned as `askedFacet` from that function.
- **Post-effects decision** — recomputed in `v4_teach.ts` AFTER `applyTagEffects`
  over POST-tag mastery. This is FORWARD-LOOKING (correct for `handsOnOffer` and
  "what's next" offers) but is a WRONG record of what this turn asked.

**Rule:** any "persist what we asked the student" signal (here: `markFacetPending`)
MUST derive from the prompt-time decision, gated on stream success — never from the
post-effects recompute.

**Why:** on the probe→rationale TRANSITION turn, this turn's `[MASTERY]` tag lifts the
concept to grasped, so the post-effects recompute flips to "rationale" for a W2
question that was never asked. Marking that as pending phantom-grades the student's
NEXT reply (which answered the probe, not W2), silently breaks the coverage guarantee,
and burns the 2-attempt re-ask budget — every important concept then got exactly one
real graded attempt.

**How to apply:** `markFacetPending` runs in the post-effects block but reads the
handler-scoped `promptTimeFacet` captured from `buildTeacherSystemPrompt`'s return.
That block sits after `await streamGeminiTeaching`, so a stream throw skips it (pending
gated on the question actually being delivered). `gradePendingFacet` runs grade-before-
build at turn start, inside the per-(user,lesson) turn lock, guarded by
`history.length > 0`. Keep `handsOnOffer` on the post-effects decision — it is
legitimately forward-looking.

## Other gotchas
- The 2-attempt cap marks a facet `covered:true` even on a miss (score may stay
  null/low). Downstream (`decideDiagnosticMove`) treats `covered===true` as done; T6
  velocity excludes capped-not-merit facets (merit = covered && score>=70) so pacing
  still slows. This is intended.
- `FACET_VELOCITY_PASS=70` is duplicated locally in teaching-core to avoid a circular
  import (the facets engine imports `V4_TEACHING_MODEL` from teaching-core). Accepted.
- After editing `lib/db` schema, rebuild its dist (`pnpm exec tsc -b lib/db/tsconfig.json`)
  — api-server typecheck consumes lib/db DIST `.d.ts` via project references; tsx
  runtime reads source. (No rebuild needed for api-server-only edits.)
