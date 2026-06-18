/**
 * Test-out (تجاوز حر) progression regression suite.
 *
 * Exercises the PURE `computeProgression` projection that backs every exam
 * gate (checkExamGate + the map endpoint). No DB — the graph is a hand-built
 * fixture. Covers: first-unit-open, intra-stage chain, cross-stage gate,
 * cross-level gate, missing-bank auto-clear, the examReachable vs
 * lessonAccessible split (legacy no-regression), and stage/level exam
 * availability.
 *
 * Fixture curriculum (canonical codes):
 *   Level 1 (id 10)
 *     Stage 1.1 (id 11) → unit 1.1.1 (id 1), unit 1.1.2 (id 2)
 *     Stage 1.2 (id 12) → unit 1.2.1 (id 3)
 *   Level 2 (id 20)
 *     Stage 2.1 (id 21) → unit 2.1.1 (id 4)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  computeProgression,
  type ProgressionGraph,
  type GraphUnit,
  type ExamPassMap,
} from "../v4-progression-engine.js";

function makeGraph(opts?: {
  unitBank?: Set<number>;
  stageBank?: Set<number>;
  levelBank?: Set<number>;
  // Stage/level gates now key off "examable" (scope has authorable content),
  // NOT the authored bank. Default: every stage/level is examable.
  stageExamable?: Set<number>;
  levelExamable?: Set<number>;
}): ProgressionGraph {
  const units: GraphUnit[] = [
    { id: 1, code: "1.1.1", stageId: 11, levelId: 10, levelIndex: 1, stageCode: "1.1", unitIndex: 1 },
    { id: 2, code: "1.1.2", stageId: 11, levelId: 10, levelIndex: 1, stageCode: "1.1", unitIndex: 2 },
    { id: 3, code: "1.2.1", stageId: 12, levelId: 10, levelIndex: 1, stageCode: "1.2", unitIndex: 1 },
    { id: 4, code: "2.1.1", stageId: 21, levelId: 20, levelIndex: 2, stageCode: "2.1", unitIndex: 1 },
  ];
  const unitsSorted = [...units];
  const unitById = new Map(unitsSorted.map((u) => [u.id, u]));
  return {
    versionId: 1,
    unitsSorted,
    unitById,
    unitsByStageId: new Map<number, number[]>([[11, [1, 2]], [12, [3]], [21, [4]]]),
    stagesByLevelId: new Map<number, number[]>([[10, [11, 12]], [20, [21]]]),
    stageIdsAll: [11, 12, 21],
    levelIds: [10, 20],
    lessonsByUnitId: new Map<number, string[]>([
      [1, ["1.1.1.1", "1.1.1.2"]],
      [2, ["1.1.2.1"]],
      [3, ["1.2.1.1"]],
      [4, ["2.1.1.1"]],
    ]),
    firstUnitOfStage: new Map<number, number>([[11, 1], [12, 3], [21, 4]]),
    firstUnitOfLevel: new Map<number, number>([[10, 1], [20, 4]]),
    unitExamBank: opts?.unitBank ?? new Set([1, 2, 3, 4]),
    stageExamBank: opts?.stageBank ?? new Set([11, 12, 21]),
    levelExamBank: opts?.levelBank ?? new Set([10, 20]),
    stageExamable: opts?.stageExamable ?? new Set([11, 12, 21]),
    levelExamable: opts?.levelExamable ?? new Set([10, 20]),
  };
}

function passMap(keys: string[]): ExamPassMap {
  const m: ExamPassMap = new Map();
  for (const k of keys) m.set(k, { passed: true });
  return m;
}

function reachable(s: ReturnType<typeof computeProgression>): number[] {
  return [...s.examReachableUnitIds].sort((a, b) => a - b);
}

describe("computeProgression — exam reachability chain", () => {
  test("no exams passed → only the first curriculum unit is reachable", () => {
    const s = computeProgression(makeGraph(), passMap([]), []);
    assert.deepEqual(reachable(s), [1]);
    assert.equal(s.unitExamAvailable(1), true);
    assert.equal(s.unitExamAvailable(2), false);
  });

  test("passing a unit exam opens the NEXT unit in the same stage", () => {
    const s = computeProgression(makeGraph(), passMap(["unit:1"]), []);
    assert.deepEqual(reachable(s), [1, 2]);
    assert.equal(s.unitExamAvailable(2), true);
    assert.equal(s.unitExamAvailable(3), false); // crossing a stage needs more
  });

  test("crossing into a new STAGE requires the previous stage's exam too", () => {
    // units 1 & 2 passed but NOT stage 1.1 → unit 3 (stage 1.2) stays locked
    const noStage = computeProgression(makeGraph(), passMap(["unit:1", "unit:2"]), []);
    assert.equal(noStage.examReachableUnitIds.has(3), false);

    // add the stage 1.1 exam pass → unit 3 becomes reachable
    const withStage = computeProgression(
      makeGraph(),
      passMap(["unit:1", "unit:2", "stage:11"]),
      [],
    );
    assert.equal(withStage.examReachableUnitIds.has(3), true);
    assert.equal(withStage.examReachableUnitIds.has(4), false); // level boundary still ahead
  });

  test("crossing into a new LEVEL requires the previous level's exam too", () => {
    // everything in level 1 except the LEVEL exam → unit 4 (level 2) stays locked
    const noLevel = computeProgression(
      makeGraph(),
      passMap(["unit:1", "unit:2", "stage:11", "unit:3", "stage:12"]),
      [],
    );
    assert.equal(noLevel.examReachableUnitIds.has(4), false);

    // add the level 1 exam pass → unit 4 becomes reachable
    const withLevel = computeProgression(
      makeGraph(),
      passMap(["unit:1", "unit:2", "stage:11", "unit:3", "stage:12", "level:10"]),
      [],
    );
    assert.equal(withLevel.examReachableUnitIds.has(4), true);
  });

  test("missing exam bank auto-clears the gate (no questions ⇒ nothing to pass)", () => {
    // unit 1 has no exam bank → unit 2 reachable with zero passes
    const g = makeGraph({ unitBank: new Set([2, 3, 4]) });
    const s = computeProgression(g, passMap([]), []);
    assert.equal(s.examReachableUnitIds.has(2), true);
  });
});

describe("computeProgression — exam vs lesson projection split", () => {
  test("legacy-unlocked lessons keep lesson access WITHOUT weakening the exam gate", () => {
    const s = computeProgression(makeGraph(), passMap([]), ["2.1.1.1"]);
    // exam gate for the deep unit stays locked …
    assert.equal(s.examReachableUnitIds.has(4), false);
    // … but its lessons remain accessible (no regression for live students)
    assert.equal(s.lessonAccessibleUnitIds.has(4), true);
    assert.ok(s.accessibleLessonCodes.includes("2.1.1.1"));
  });

  test("accessibleLessonCodes never drops a legacy code", () => {
    const legacy = ["1.2.1.1", "2.1.1.1"];
    const s = computeProgression(makeGraph(), passMap([]), legacy);
    for (const c of legacy) assert.ok(s.accessibleLessonCodes.includes(c));
  });
});

describe("computeProgression — stage/level exam availability", () => {
  test("stage exam available only once all its units are cleared", () => {
    const s = computeProgression(makeGraph(), passMap(["unit:1", "unit:2"]), []);
    assert.equal(s.stageExamAvailable(11), true);
    assert.equal(s.stageExamAvailable(12), false); // unit 3 not cleared
  });

  test("level exam available only once all its stages are cleared", () => {
    const s = computeProgression(
      makeGraph(),
      passMap(["unit:1", "unit:2", "stage:11", "unit:3", "stage:12"]),
      [],
    );
    assert.equal(s.levelExamAvailable(10), true);
    assert.equal(s.levelExamAvailable(20), false);
  });
});

describe("computeProgression — examable gating replaces authored bank", () => {
  test("an examable stage with NO authored bank is still a hard gate", () => {
    // stage 1.1 has no authored exam bank but IS examable (has units) → the
    // generated gate is real: without a stage:11 pass, unit 3 stays locked.
    const g = makeGraph({ stageBank: new Set([12, 21]) });
    const s = computeProgression(g, passMap(["unit:1", "unit:2"]), []);
    assert.equal(s.examReachableUnitIds.has(3), false);
  });

  test("a NON-examable stage auto-clears its gate (empty shell ⇒ never a gate)", () => {
    // stage 1.1 is not examable (empty shell) → its gate auto-opens, so passing
    // the two units is enough to reach unit 3 with no stage exam pass.
    const g = makeGraph({ stageExamable: new Set([12, 21]) });
    const s = computeProgression(g, passMap(["unit:1", "unit:2"]), []);
    assert.equal(s.examReachableUnitIds.has(3), true);
  });

  test("a NON-examable level auto-clears its gate", () => {
    // level 1 not examable → reaching level 2 needs no level:10 pass (just the
    // full stage chain through level 1).
    const g = makeGraph({ levelExamable: new Set([20]) });
    const s = computeProgression(
      g,
      passMap(["unit:1", "unit:2", "stage:11", "unit:3", "stage:12"]),
      [],
    );
    assert.equal(s.examReachableUnitIds.has(4), true);
  });
});
