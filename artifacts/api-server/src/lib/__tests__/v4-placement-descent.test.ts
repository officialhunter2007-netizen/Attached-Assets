/**
 * Unit tests for the high-precision placement engine (v4-path-engine.ts).
 *
 * Locks the three pivotal guarantees of the "محورية" placement rework:
 *
 *   1. compareCodes — NUMERIC, segment-wise ordering ("1.1.1.10" AFTER
 *      "1.1.1.2"), the latent lexicographic bug this rework fixes.
 *   2. computeUnlockedToUnit — unlock UP TO + INCLUDING a boundary unit, land
 *      the pointer on the FIRST lesson of that unit (numeric, not lexicographic).
 *   3. nextPlacementStep — adaptive binary search over the stratified unit
 *      sample (best-of-3 per unit, CONSERVATIVE placement at the first unit
 *      after the highest proven-mastered one) lands a student at or just below
 *      the true mastery boundary, AND falls back to the legacy level-only flow
 *      verbatim when no unit-tagged questions exist.
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
  buildPlacementProfile,
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

// ── 4. adaptive binary-search placement (unit-tagged) ──────────────────────
/** A SPARSE unit-tagged bank: 8 real units in ONE level, but questions for
 *  only 3 of them (1.1.1, 1.1.4, 1.1.8). Exercises CONSERVATIVE placement at
 *  the first real unit after the last proven-mastered one (no over-placement). */
function sparseLevelCodes(): string[] {
  const codes: string[] = [];
  for (let U = 1; U <= 8; U++) for (let Le = 1; Le <= 2; Le++) codes.push(`1.1.${U}.${Le}`);
  return codes;
}
function sparseUnitQuestions(): V4PlacementTestQuestion[] {
  const qs: V4PlacementTestQuestion[] = [];
  let id = 1;
  let qi = 0;
  for (const U of [1, 4, 8])
    for (let d = 1; d <= 3; d++) {
      qs.push({
        id: id++, versionId: 1, questionIndex: qi++,
        targetLevelIndex: 1, targetStageCode: "1.1", targetUnitCode: `1.1.${U}`,
        kind: "mcq", prompt: `q 1.1.${U} d${d}`, choices: ["a", "b", "c", "d"],
        correctIndex: 0, difficulty: d,
      } as V4PlacementTestQuestion);
    }
  return qs;
}

describe("evaluatePlacement — adaptive binary search (unit-tagged)", () => {
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

  test("masters everything → placed at the final unit 2.2.2 (still unit precision)", () => {
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "2.2.2");
    assert.equal(r.currentLessonCode, "2.2.2.1");
    assert.equal(r.startingLevelIndex, 2);
  });

  test("masters all of level 1 → placed at the level-2 boundary unit 2.1.1", () => {
    const r = simulate(resolved, qs, (q) => q.targetLevelIndex === 1);
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "2.1.1");
    assert.equal(r.currentLessonCode, "2.1.1.1");
    assert.equal(r.levelIndex, 2);
    assert.equal(r.startingLevelIndex, 2);
  });

  test("a single fluke wrong does NOT fail a unit (best-of-3 majority)", () => {
    // Correct on everything EXCEPT the first (easy) probe of 2.1.1. Best-of-3
    // still passes 2.1.1, so the student is NOT demoted by one bad answer.
    const r = simulate(
      resolved,
      qs,
      (q) => !(q.targetUnitCode === "2.1.1" && q.difficulty === 1),
    );
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "2.2.2");
  });

  test("sparse sample → CONSERVATIVE first unit after the last proven pass", () => {
    const sparse = makeResolved(sparseLevelCodes(), 1);
    const sq = sparseUnitQuestions();
    // Passes sampled unit 1.1.1, fails sampled unit 1.1.4. Conservative placement
    // lands on 1.1.2 — the FIRST real unit after the last proven-mastered one —
    // rather than guessing across the untested gap (the old midpoint → 1.1.3).
    const r = simulate(sparse, sq, (q) => q.targetUnitCode === "1.1.1");
    assert.equal(r.precision, "unit");
    assert.equal(r.unitCode, "1.1.2");
    assert.equal(r.currentLessonCode, "1.1.2.1");
  });

  test("always converges within the soft cap of 18 questions", () => {
    let count = 0;
    const probes: PlacementProbe[] = [];
    for (let i = 0; i < 50; i++) {
      const step = nextPlacementStep(resolved, qs, probes);
      if (step.kind === "done") break;
      count++;
      probes.push({
        questionId: step.question.id,
        scope: step.scope,
        scopeCode: step.scopeCode,
        targetLevelIndex: step.targetLevelIndex,
        correct: false,
      });
    }
    assert.ok(count > 0 && count <= 18, `expected 1..18 questions, got ${count}`);
  });
});

// ── 5. legacy level-only fallback ──────────────────────────────────────────
// Unchanged by this rework: when the active version has NO unit-tagged
// questions, nextPlacementStep routes to evaluateLevelOnly, which finalizes via
// the committed computeStartingLevel. Its semantics are "advance to the FIRST
// level the student did NOT master" (i.e. highest mastered + 1) — the SAME
// no-under-placement-bias philosophy the unit path uses (master all ⇒ end), NOT
// the old "highest level with a correct answer" rule.
describe("nextPlacementStep — legacy level-only fallback", () => {
  const resolved = makeResolved(fullTreeCodes(), 2);
  const qs = levelOnlyQuestions();

  test("never emits unit precision (always level)", () => {
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.precision, "level");
    assert.equal(r.unitCode, null);
    assert.equal(r.stageCode, null);
  });

  test("all wrong → starting level 1 (never demoted below the floor)", () => {
    const r = simulate(resolved, qs, () => false);
    assert.equal(r.startingLevelIndex, 1);
  });

  test("masters every probed level → advances PAST them (no under-placement)", () => {
    // Both levels mastered → first not-mastered level is 3 (downstream
    // computeUnlocked clamps it to the real curriculum = effectively the end).
    const r = simulate(resolved, qs, () => true);
    assert.equal(r.startingLevelIndex, 3);
  });

  test("masters L1, fails L2 → starts at the first not-mastered level (2)", () => {
    const r = simulate(resolved, qs, (q) => q.targetLevelIndex === 1);
    assert.equal(r.startingLevelIndex, 2);
  });
});

// ── 6. buildPlacementProfile — strengths/weaknesses snapshot ────────────────
// Distils the graded unit probes into the teacher-facing profile persisted on
// the student path. Pure: the caller supplies the unit-name lookup.
function unitProbe(unitCode: string, correct: boolean): PlacementProbe {
  return {
    questionId: Math.floor(Math.random() * 1e6),
    scope: "unit",
    scopeCode: unitCode,
    targetLevelIndex: parseInt(unitCode.split(".")[0] || "0", 10),
    correct,
  };
}
function fakeResult(unitCode: string | null, reason: string): PlacementResult {
  return {
    startMode: "placement",
    startingLevelIndex: 1,
    levelIndex: 1,
    stageCode: null,
    unitCode,
    currentLessonCode: null,
    precision: "unit",
    reason,
  };
}

describe("buildPlacementProfile — teacher-facing snapshot", () => {
  const resolved = makeResolved(fullTreeCodes(), 2);

  test("no probes → null (from_zero / level-only placement)", () => {
    assert.equal(buildPlacementProfile(resolved, [], fakeResult("1.1.1", "x"), new Map()), null);
  });

  test("only non-unit probes → null (nothing unit-scoped to summarize)", () => {
    const probes: PlacementProbe[] = [
      { questionId: 1, scope: "stage", scopeCode: "1.1", targetLevelIndex: 1, correct: true },
    ];
    assert.equal(buildPlacementProfile(resolved, probes, fakeResult(null, "x"), new Map()), null);
  });

  test("classifies pass→strengths / fail→weaknesses, sorts numerically, resolves names + tree fields", () => {
    const probes: PlacementProbe[] = [
      unitProbe("2.2.2", false), unitProbe("2.2.2", false), // fail → weakness
      unitProbe("1.2.1", true), unitProbe("1.2.1", true),   // pass → strength (out of order on purpose)
      unitProbe("1.1.1", true), unitProbe("1.1.1", true),   // pass → strength
    ];
    const names = new Map<string, string>([["1.1.1", "Unit A"], ["2.2.2", "Unit Z"]]);
    const profile = buildPlacementProfile(resolved, probes, fakeResult("1.2.2", "binary_search_boundary"), names);
    assert.ok(profile, "expected a non-null profile");
    assert.equal(profile!.placedUnitCode, "1.2.2");
    assert.equal(profile!.reason, "binary_search_boundary");
    assert.equal(profile!.totalQuestions, probes.length);
    // numeric sort: 1.1.1 BEFORE 1.2.1 (not lexicographic / insertion order)
    assert.deepEqual(profile!.strengths.map((s) => s.unitCode), ["1.1.1", "1.2.1"]);
    assert.deepEqual(profile!.weaknesses.map((w) => w.unitCode), ["2.2.2"]);
    // unit name resolved from map, null when absent
    assert.equal(profile!.strengths[0]!.unitName, "Unit A");
    assert.equal(profile!.strengths[1]!.unitName, null);
    // level/stage resolved from the resolved tree
    assert.equal(profile!.strengths[0]!.levelIndex, 1);
    assert.equal(profile!.strengths[0]!.stageCode, "1.1");
    assert.equal(profile!.weaknesses[0]!.levelIndex, 2);
    assert.equal(profile!.weaknesses[0]!.stageCode, "2.2");
    // tallies carried through
    assert.equal(profile!.strengths[0]!.correct, 2);
    assert.equal(profile!.weaknesses[0]!.wrong, 2);
  });
});
