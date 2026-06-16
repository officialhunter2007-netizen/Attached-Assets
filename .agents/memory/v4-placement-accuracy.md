---
name: v4 placement (binary search over units)
description: How the v4 placement test places students (binary search over units, midpoint, no under-placement bias), the pool-size sync point, the AI-authoring fragment contract, and the code-ordering trap.
---

# v4 placement (approximate unit precision)

## Algorithm = adaptive BINARY SEARCH over units (NOT hierarchical descent)
The earlier "hierarchical descent, resolve every boundary downward (conservative)" design was
deliberately REPLACED. Current engine (`evaluatePlacement` in `v4-path-engine.ts`): run an
adaptive binary search over the numerically-ordered unit list, best-of-3 per probed unit for
fluke-resistance (tracks highest-pass / lowest-fail bounds), soft-capped at 18 questions, and
place the student at the **MIDPOINT real unit** of the converged boundary.

**Why:** the product goal flipped — conservative under-placement (making a competent student
re-grind material) was judged worse than a small over-placement risk. Midpoint placement is the
intentional expression of "no under-placement bias." Do NOT re-introduce floor/round-down
placement or "ambiguous boundary resolves downward" — that is the old behavior we removed.

## "Pool good enough?" is one decision with multiple sync points
Generation (`generatePlacementQuestions`) stratified-samples ≤22 units evenly across the whole
curriculum (skill-python = 189 units) and authors ~3 practical MCQs/unit in parallel. The pool
must clear `PLACEMENT_MIN_POOL` (13) questions across `PLACEMENT_MIN_UNITS` (6) distinct units
(unit floor clamped to sample size for tiny specialties) or it THROWS and the route falls back.
Those exported constants are the single source of truth in the engine and route, BUT the FE
generate guard in `path-custom.tsx` mirrors the floor as a hardcoded literal (cross-package, can't
import the server const). Change the floor → update the FE literal in lockstep.

**How to apply:** also the admin-bank short-circuit must gate on DISTINCT unit coverage, not just
raw count — a dense bank clustered in a few units blinds the binary search.

## Legacy level-only fallback semantics (corrected)
When the active version has NO unit-tagged placement questions, grading routes to the level-only
evaluator (`evaluateLevelOnly` + `computeStartingLevel`). Its real semantics: place at the FIRST
level NOT mastered (correct ratio ≥ 0.66) = highest mastered + 1 (NOT "highest level with a
correct answer" — that phrasing was a long-standing doc drift, now fixed). `computeUnlocked`
clamps the returned index to the curriculum's level count, so an out-of-range raw value can't
over-unlock. `v4-placement-descent.test.ts` locks this; keep both branches green.

## AI authoring emits a JSON FRAGMENT — never write placement rows straight to the DB
The admin "generate placement questions" endpoint returns a `placement_test_questions` fragment
to merge into the instruction file in Monaco and **re-publish**; it does NO DB write.

**Why:** the publish normalizer DELETE+reinserts every placement row each publish. Any row written
straight to the DB (bypassing the instruction file) is silently wiped on the next publish. The
instruction file is the single source of truth for curriculum content. Anything that must persist
across publishes flows through the normalizer — never a side-channel insert into a managed table.

## Code-ordering trap: segment codes sort lexicographically, NOT numerically
Unit/lesson codes are `L.S.U.Lesson` (e.g. `1.1.1.10`). Plain string / `asc(code)` sort puts
`1.1.1.10` BEFORE `1.1.1.2`. Use the numeric-segment comparator (`compareCodes`) EVERYWHERE
ordering matters (tree build, unlock computation, unit ordering for the binary search, "highest
preserved code" on version sync). The lexicographic default silently mis-orders any unit/level
with ≥10 children.

## Paid fan-out guardrails
Placement question generation is a first-party PAID fan-out (per-unit model calls). Keep the
bounds when extending: bounded sample size, a concurrency pool, per-call timeout, and per-unit
failures collected (not failing the whole request). Mutating endpoints stay admin/user +
same-origin-CSRF gated.
