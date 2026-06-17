---
name: v4 test-out (تجاوز حر) progression gating
description: The exam-gated navigation model — one engine, three sync points, two projections, additive-merge persistence.
---

# v4 test-out gating

Lessons are SKIPPABLE; exams are the MANDATORY gates. To reach a unit you must
have PASSED the previous unit's exam (always), plus the previous stage's exam IF
crossing a stage, plus the previous level's exam IF crossing a level. A scope
with no authored exam bank auto-clears (nothing to pass ⇒ gate open), so an
incomplete curriculum can't brick progression.

All gating is computed by ONE pure function: `computeProgression` in
`v4-progression-engine.ts`. THREE consumers must stay in sync and must never
reimplement the rule locally:
- exam-submit gate (`checkExamGate` in `v4-lab-exam-engine.ts`)
- the map endpoint's node availability (`routes/v4_path.ts`)
- the lesson pointer (`advanceLessonPointer` in `v4-protocol-tags.ts`) — only
  advances WITHIN the current unit; never auto-opens the next unit.

**Two projections that must NEVER be collapsed:**
- `examReachableUnitIds` — from PASSED exams ONLY (+ missing-bank auto-clear).
  Drives every EXAM gate.
- `lessonAccessibleUnitIds` = examReachable ∪ legacy-unlocked. Drives LESSON +
  LAB access only.

**Why:** if legacy linear unlocks fed the exam projection, a grandfathered
student could skip a now-mandatory previous exam. Keeping the split means live
students keep the lesson access they already had without weakening any gate.

**Persistence:** `applyUnlockedSnapshot` MUST be an additive, row-locked
(`SELECT … FOR UPDATE`) merge against the current DB value — never a plain
overwrite. A map reconcile can race an exam-submit unlock; a plain overwrite
loses one writer's freshly-written codes. The set is union-only, never shrinks.

**How to apply:** put any gating change in the engine, not the consumers; keep
the projection split; never revert the merge to an overwrite.

**Unlock-by-tapping is now ONE adaptive "test-out" exam, not an exam chain.**
Tapping a locked lesson/lab no longer walks a multi-exam chain. Instead it opens a
single adaptive exam over the prerequisite units (every unit before the target's
unit); pass ⇒ additive-merge unlock of everything up to the target (into
`unlockedLessonCodes` via `applyUnlockedSnapshot`, i.e. the lessonAccessible side —
NOT examReachable, so no fake exam_attempts and the exam-gate projection stays
honest). The old `computeRequiredExamChain` + its unlock-plan route still exist but
are ORPHANED (the map FE no longer calls them); don't trust them as the live unlock
path.

**Adaptive stop must use a FIXED denominator, never correct/asked early bands.**
The exam grade is taken over a fixed length N (= selected question count). Stop
early ONLY when the outcome is mathematically locked vs `passThreshold = ceil(0.70·N)`:
guaranteed-pass `correct ≥ passThreshold`, guaranteed-fail `correct + remaining < passThreshold`;
otherwise keep going to N. **Why:** the earlier "early-pass ≥78% / early-fail ≤62%
of correct/asked" heuristic could pass a student who'd finish below 70% or fail one
who could still recover (e.g. 8/13 with N=20 is NOT yet a fail — 6 more correct = 14/20).
**How to apply:** any pass/fail-over-fixed-N adaptive quiz uses the locked-outcome
test, and validate it with an exhaustive count simulation before shipping.

**Lab targets unlock at UNIT-prefix granularity, not raw code compare.** A lab code's
4th segment is a non-numeric Arabic marker that `compareCodes` coerces to 0, so a raw
`code ≤ labCode` filter drops the lab's OWN-unit lessons and the lab stays gated
(checkLabGate needs ≥1 lesson in the lab's unit unlocked). For a lab target, unlock
every lesson whose `unitPrefixOf(code) ≤ unitPrefixOf(labCode)`. Lessons compare by
raw code as usual. Derive lesson-vs-lab from the curriculum, don't trust a client kind.
