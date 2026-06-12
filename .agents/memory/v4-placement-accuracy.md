---
name: v4 high-precision placement
description: How the v4 placement test places students at level+stage+unit precision, the AI-authoring fragment contract, and the code-ordering trap it exposed.
---

# v4 high-precision placement (level + stage + unit)

## Algorithm = hierarchical descent (NOT binary search)
Find the boundary LEVEL (best-of-3: 2 passes promotes / 2 fails stops), then within it the
boundary STAGE (1-pass / 2-fail), then the boundary UNIT (1-pass / 2-fail). Place the student
at the FIRST lesson of the boundary unit; everything before it is unlocked.
Exhaustion counts as fail only when zero correct (conservative — under-placement is the safe error).

**Why:** under-placing a student (making them review) is pedagogically safe; over-placing (skipping
material they don't know) is not. Every ambiguous boundary resolves downward on purpose.

## Legacy level-only flow MUST survive untouched
The descent path is gated on whether the active instruction version has any unit-tagged
placement questions (rows with a non-NULL `target_unit_code`). All pre-existing banks are
NULL-tagged → they route to the level-only evaluator with the original semantics
(starting level = highest level with a correct answer, default 1). Never assume unit targeting;
always branch on the presence of unit tags.

**How to apply:** any change to placement grading must keep both branches and keep the
descent unit tests (`v4-placement-descent.test.ts`) green — they lock the legacy semantics.

## AI authoring emits a JSON FRAGMENT — it must NOT write placement rows to the DB
The admin "generate placement questions" endpoint reads the active version's
units/lessons/concepts, generates per-unit MCQs, and returns a `placement_test_questions`
fragment for the admin to merge into the instruction file in Monaco and **re-publish**.
It deliberately performs NO DB write.

**Why:** the publish normalizer DELETE+reinserts every placement row on each publish. Any row
written straight to the DB (bypassing the instruction file) is silently wiped on the next
publish / git-push. The instruction file is the single source of truth for curriculum content.

**How to apply:** anything that should persist across publishes must live in the instruction
file and flow through the normalizer — never a side-channel DB insert into a normalizer-managed
table.

## Code-ordering trap: segment codes sort lexicographically, NOT numerically
Unit/lesson codes look like `L.S.U.Lesson` (e.g. `1.1.1.10`). Plain string/`asc(code)` sort
puts `1.1.1.10` BEFORE `1.1.1.2`. Use the numeric-segment comparator (`compareCodes` in
`v4-path-engine.ts`) EVERYWHERE ordering matters (tree build, unlock computation, "highest
preserved code" on version sync, descent question ordering).

**Why:** "first lesson of a unit" and "everything before unlocked" both depend on correct
numeric ordering; the lexicographic default silently mis-orders any unit with ≥10 lessons.

## Paid endpoint guardrails
The generate endpoint is admin + same-origin-CSRF gated, caps perUnit (≤5) and maxUnits (≤60),
runs a concurrency pool (4), 90s per-call timeout, collects per-unit failures into `unitsFailed`
instead of failing the whole request, and records usage via `recordAiUsage`. Keep these bounds
when extending — it is a first-party paid fan-out surface.
