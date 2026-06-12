/**
 * Unit tests for the high-precision placement engine (v4-path-engine.ts).
 *
 * Locks the three pivotal guarantees of the "محورية" placement rework:
 *
 *   1. compareCodes — NUMERIC, segment-wise ordering ("1.1.1.10" AFTER
 *      "1.1.1.2"), the latent lexicographic bug this rework fixes.
 *   2. computeUnlockedToUnit — unlock UP TO + INCLUDING a boundary unit, land
 *      the pointer on the FIRST lesson of that unit (numeric, not lexicographic).
 *   3. nextPlacementStep — hierarchical descent (level best-of-3 → stage 1-of-2
 *      → unit 1-of-2) lands a student at the exact boundary unit, AND falls back
 *      to the legacy level-only flow verbatim when no unit-tagged questions exist.
 *
 * Pure functions only — no DB, no AI. The descent is replayed over a synthetic
 * graded-probe stream driven by a per-student "mastery" predicate.
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/v4-placement-descent.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  compareCodes,
  computeUnlockedToUnit,
  usesUnitTargeting,
  nextPlacementStep,
  type ResolvedSpecialty,
  type ResolvedUnit,
  type PlacementProbe,
  type PlacementResult,
} from "../v4-path-engine.js";
import type { V4PlacementTestQuestion } from "@workspace/db";

// ── synthetic-specialty builders ───────────────────────────────────────────
/** Rebuild the level→stage→unit tree from lesson codes exactly the way
 *  resolveActiveSpecialty does (so tests exercise the real grouping logic). */
function makeResolved(codes: string[], levelCount: number): ResolvedSpecialty {
  const allCodes = [...codes].sort(compareCodes);
  const byLevel: string[][] = [];
  for (let l = 1; l <= levelCount; l++) {
    byLevel.push(allCodes.filter((c) => parseInt(c.split(".")[0] || "0", 10) === l));
  }
  const unitMap = new Map<string, ResolvedUnit>();
  for (const code of allCodes) {
    const seg = code.split(".");
    if (seg.length < 3) continue;
    const unitCode = `${seg[0]}.${seg[1]}.${seg[2]}`;
    let u = unitMap.get(unitCode);
    if (!u) {
      u = {
        unitCode,
        stageCode: `${seg[0]}.${seg[1]}`,
        levelIndex: parseInt(seg[0] || "0", 10) || 0,
        stageIndex: parseInt(seg[1] || "0", 10) || 0,
        unitIndex: parseInt(seg[2] || "0", 10) || 0,
        lessonCodes: [],
      };
      unitMap.set(unitCode, u);
    }
    u.lessonCodes.push(code);
  }
  const units = Array.from(unitMap.values()).sort((a, b) => compareCodes(a.unitCode, b.unitCode));
  for (const u of units) u.lessonCodes.sort(compareCodes);
  return {
    specialty: {} as any,
    versionId: 1,
    levelLessonCodes: byLevel,
    orderedLessonCodes: allCodes,
    units,
    levelCount,
  };
}

/** 2 levels × 2 stages × 2 units × 2 lessons → 16 canonical lesson codes. */
function fullTreeCodes(): string[] {
  const codes: string[] = [];
  for (let L = 1; L <= 2; L++)
    for (let S = 1; S <= 2; S++)
      for (let U = 1; U <= 2; U++)
        for (let Le = 1; Le <= 2; Le++) codes.push(`${L}.${S}.${U}.${Le}`);
  return codes;
}

/** A unit-tagged bank: 3 MCQs (difficulty 1-3) per unit. */
function unitQuestions(): V4PlacementTestQuestion[] {
  const qs: V4PlacementTestQuestion[] = [];
  let id = 1;
  let qi = 0;
  for (let L = 1; L <= 2; L++)
    for (let S = 1; S <= 2; S++)
      for (let U = 1; U <= 2; U++)
        for (let d = 1; d <= 3; d++) {
          qs.push({
            id: id++,
            versionId: 1,
            questionIndex: qi++,
            targetLevelIndex: L,
            targetStageCode: `${L}.${S}`,
            targetUnitCode: `${L}.${S}.${U}`,
            kind: "mcq",
            prompt: `q ${L}.${S}.${U} d${d}`,
            choices: ["a", "b", "c", "d"],
            correctIndex: 0,
            difficulty: d,
          } as V4PlacementTestQuestion);
        }
  return qs;
}

/** A legacy level-only bank: one MCQ per level, NO unit/stage tagging. */
function levelOnlyQuestions(): V4PlacementTestQuestion[] {
  const qs: V4PlacementTestQuestion[] = [];
  let id = 1;
  let qi = 0;
  for (let L = 1; L <= 2; L++) {
    qs.push({
      id: id++,
      versionId: 1,
      questionIndex: qi++,
      targetLevelIndex: L,
      targetStageCode: null,
      targetUnitCode: null,
      kind: "mcq",
      prompt: `level ${L}`,
      choices: ["a", "b"],
      correctIndex: 0,
      difficulty: 2,
    } as V4PlacementTestQuestion);
  }
  return qs;
}

/** Replay the descent over a graded-probe stream until it terminates. */
function simulate(
  resolved: ResolvedSpecialty,
  questions: V4PlacementTestQuestion[],
  isCorrect: (q: V4PlacementTestQuestion) => boolean,
): PlacementResult {
  const probes: PlacementProbe[] = [];
  for (let i = 0; i < 200; i++) {
    const step = nextPlacementStep(resolved, questions, probes);
    if (step.kind === "done") return step.result;
    probes.push({
      questionId: step.question.id,
      scope: step.scope,
      scopeCode: step.scopeCode,
      targetLevelIndex: step.targetLevelIndex,
      correct: isCorrect(step.question),
    });
  }
  throw new Error("placement descent did not terminate");
}

// ── 1. numeric comparator (the latent bug) ─────────────────────────────────
describe("compareCodes — numeric segment ordering", () => {
  test("'1.1.1.10' sorts AFTER '1.1.1.2' (not lexicographic)", () => {
    assert.ok(compareCodes("1.1.1.10", "1.1.1.2") > 0);
    assert.ok(compareCodes("1.1.1.2", "1.1.1.10") < 0);
  });
  test("higher level dominates", () => {
    assert.ok(compareCodes("2.1.1", "1.9.9") > 0);
  });
  test("Array#sort with the comparator yields true learning order", () => {
    const sorted = ["1.1.1.10", "1.1.1.2", "1.1.1.1", "1.2.1.1"].sort(compareCodes);
    assert.deepEqual(sorted, ["1.1.1.1", "1.1.1.2", "1.1.1.10", "1.2.1.1"]);
  });
  test("equal codes compare 0", () => {
    assert.equal(compareCodes("1.2.3.4", "1.2.3.4"), 0);
  });
});

// ── 2. unit-precise unlock ─────────────────────────────────────────────────
describe("computeUnlockedToUnit — inclusive unlock + first-lesson pointer", () => {
  // unit 1.1.1 deliberately has 10 lessons to catch the lexicographic pointer bug.
  const codes = [
    ...Array.from({ length: 10 }, (_, i) => `1.1.1.${i + 1}`),
    "1.1.2.1",
    "1.2.1.1",
    "2.1.1.1",
  ];
  const resolved = makeResolved(codes, 2);

  test("pointer lands on the FIRST lesson numerically (1.1.1.1, not 1.1.1.10)", () => {
    const r = computeUnlockedToUnit(resolved, "1.1.1");
    assert.equal(r.currentLessonCode, "1.1.1.1");
    assert.equal(r.startingLevelIndex, 1);
    assert.equal(r.unlocked.length, 10); // all 10 lessons of the boundary unit
    assert.ok(r.unlocked.includes("1.1.1.10"));
  });

  test("boundary deeper in the tree unlocks everything before it, inclusive", () => {
    const r = computeUnlockedToUnit(resolved, "2.1.1");
    assert.equal(r.currentLessonCode, "2.1.1.1");
    assert.equal(r.startingLevelIndex, 2);
    // all of level 1 (10 + 1 + 1) plus 2.1.1.1
    assert.ok(r.unlocked.includes("1.1.1.1"));
    assert.ok(r.unlocked.includes("1.1.2.1"));
    assert.ok(r.unlocked.includes("1.2.1.1"));
    assert.ok(r.unlocked.includes("2.1.1.1"));
    assert.equal(r.unlocked.length, 13);
  });

  test("unknown boundary falls back to the very first unit", () => {
    const r = computeUnlockedToUnit(resolved, "9.9.9");
    assert.equal(r.currentLessonCode, "1.1.1.1");
    assert.equal(r.startingLevelIndex, 1);
  });
});

// ── 3. usesUnitTargeting routing ───────────────────────────────────────────
describe("usesUnitTargeting — descent vs legacy routing", () => {
  test("true when any question carries a unit code", () => {
    assert.equal(usesUnitTargeting(unitQuestions()), true);
  });
  test("false for a pure level-only bank", () => {
    assert.equal(usesUnitTargeting(levelOnlyQuestions()), false);
  });
});

// ── 4. hierarchical descent placement ──────────────────────────────────────
describe("nextPlacementStep — hierarchical descent (unit-tagged)", () => {
  const resolved = makeResolved(fullTreeCodes(), 2);
  const qs = unitQuestions();

  test("knows nothing → placed at the very first unit 1.1.1", () => {
    const r = simulate(resolved, qs, () => false);
    assert.equal(r.precision, "unit");
    assert.equal(r.levelIndex, 1);
    assert.equal(r.unitCode, "1.1.1");
    assert.equal(r.currentLessonCode, "1.1.1.1");
    assert.equal(r.startingLevelIndex, 1);
  });

  test("masters all of level 1 → placed at the start of level 2 (unit 2.1.1)", () => {
    const r = simulate(resolved, qs, (q) => q.targetLevelIndex === 1);
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "2.1.1");
    assert.equal(r.currentLessonCode, "2.1.1.1");
    assert.equal(r.startingLevelIndex, 2);
  });

  test("masters L1 + stage 2.1 → placed at the boundary stage's first unit (2.2.1)", () => {
    const r = simulate(
      resolved,
      qs,
      (q) => q.targetLevelIndex === 1 || q.targetStageCode === "2.1",
    );
    assert.equal(r.unitCode, "2.2.1");
    assert.equal(r.currentLessonCode, "2.2.1.1");
    assert.equal(r.levelIndex, 2);
    assert.equal(r.stageCode, "2.2");
  });

  test("partial stage mastery (only unit 2.1.2) still descends to stage 2.2 → unit 2.2.1", () => {
    // Representative sampling: knowing the hardest unit of stage 2.1 passes the
    // stage; the gap in 2.1.1 is still UNLOCKED (review), not skipped.
    const r = simulate(
      resolved,
      qs,
      (q) => q.targetLevelIndex === 1 || q.targetUnitCode === "2.1.2",
    );
    assert.equal(r.unitCode, "2.2.1");
    const unlocked = computeUnlockedToUnit(resolved, "2.2.1").unlocked;
    assert.ok(unlocked.includes("2.1.1.1"), "skipped unit must remain unlocked for review");
  });

  test("masters everything → placed at the final unit (2.2.2), still unit precision", () => {
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "2.2.2");
    assert.equal(r.currentLessonCode, "2.2.2.1");
  });
});

// ── 5. legacy level-only fallback (verbatim behavior) ──────────────────────
describe("nextPlacementStep — legacy level-only fallback", () => {
  const resolved = makeResolved(fullTreeCodes(), 2);
  const qs = levelOnlyQuestions();

  test("never emits unit precision (always level)", () => {
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.precision, "level");
    assert.equal(r.unitCode, null);
    assert.equal(r.stageCode, null);
  });

  test("all wrong → starting level 1", () => {
    const r = simulate(resolved, qs, () => false);
    assert.equal(r.startingLevelIndex, 1);
  });

  test("all correct → starting level = highest correct (2)", () => {
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.startingLevelIndex, 2);
  });

  test("L1 correct, L2 wrong → highest correct is 1 (legacy semantics preserved)", () => {
    const r = simulate(resolved, qs, (q) => q.targetLevelIndex === 1);
    assert.equal(r.startingLevelIndex, 1);
  });
});
