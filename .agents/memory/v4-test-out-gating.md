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

**Test-out "why is this locked" chain (sanctioned duplication):** the unlock-plan
needs to know WHICH gate broke per boundary, but `computeProgression` only exposes
the collapsed `examReachableUnitIds` SET — not the per-boundary reason. So
`computeRequiredExamChain` (same engine file) re-derives the gate predicates and
walks `unitsSorted[1..targetIdx]`, pushing prev-unit exam / prev-stage exam (on
stage boundary) / prev-level exam (on level boundary) for each BROKEN gate. This
is the ONE place the boundary rule is duplicated; it MUST mirror
`computeProgression`'s `gate = unitGateOpen(prev) [&& stageGateOpen on stage xing]
[&& levelGateOpen on level xing]` exactly. Invariant: `chain[0]` is always an
exam attemptable NOW (the broken gate sits at the reachable frontier).
**Why:** keeping the re-derivation in the same file beside the engine makes the
lockstep obvious; if it drifts, the dialog lists wrong/unavailable exams.
