/**
 * Unit tests for decideDiagnosticMove (v4-diagnostic-engine.ts).
 *
 * Locks the disjoint, strict-priority contract that drives BOTH the teaching
 * directive and the server-computed hands-on offer in the /v4/teach `done`
 * event:
 *
 *   1. earliest untested|weak           → PROBE / DRILL
 *   2. else earliest grasped(≥50) unapplied → APPLY
 *   3. else earliest shaky (applied)    → REINFORCE
 *   4. else all mastered + applied      → ADVANCE
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/v4-diagnostic-move.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { decideDiagnosticMove, type DiagnosticConcept } from "../v4-diagnostic-engine.js";

function concepts(...idx: number[]): DiagnosticConcept[] {
  return idx.map((i) => ({ conceptIndex: i, name: `C${i}`, masteryCriterion: `crit${i}`, weight: 1 }));
}
const mastery = (m: Record<number, number>) => new Map<number, number>(Object.entries(m).map(([k, v]) => [Number(k), v]));

describe("decideDiagnosticMove — disjoint priority", () => {
  test("untested concept → PROBE", () => {
    const d = decideDiagnosticMove({ concepts: concepts(1, 2), masteryByConcept: mastery({}) });
    assert.equal(d.move, "probe");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("weak concept (<50) → DRILL", () => {
    const d = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 30 }) });
    assert.equal(d.move, "drill");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("a real gap BEATS an applicable later concept (foundation first)", () => {
    // C1 untested (gap), C2 grasped+unapplied — gap must win.
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2),
      masteryByConcept: mastery({ 2: 80 }),
      appliedByConcept: new Set(),
    });
    assert.equal(d.move, "probe");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("grasped (≥50) and NOT applied → APPLY", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 60 }),
      appliedByConcept: new Set(),
    });
    assert.equal(d.move, "apply");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("mastered but NOT applied → still APPLY (not advance)", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 95 }),
      appliedByConcept: new Set(),
    });
    assert.equal(d.move, "apply");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("APPLY picks the EARLIEST grasped-unapplied concept", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2, 3),
      masteryByConcept: mastery({ 1: 90, 2: 70, 3: 80 }),
      appliedByConcept: new Set([1]), // 1 done → next earliest is 2
    });
    assert.equal(d.move, "apply");
    assert.equal(d.target?.conceptIndex, 2);
  });

  test("shaky (50-74) AND already applied → REINFORCE", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 60 }),
      appliedByConcept: new Set([1]),
    });
    assert.equal(d.move, "reinforce");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("all mastered AND all applied → ADVANCE (null target)", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2),
      masteryByConcept: mastery({ 1: 90, 2: 88 }),
      appliedByConcept: new Set([1, 2]),
    });
    assert.equal(d.move, "advance");
    assert.equal(d.target, null);
  });

  test("APPLY (grasped-unapplied) BEATS REINFORCE (shaky-applied) when both exist", () => {
    // C1 shaky+applied (reinforce candidate), C2 mastered+unapplied (apply candidate).
    // Apply has higher priority than reinforce → C2 apply wins despite higher index.
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2),
      masteryByConcept: mastery({ 1: 60, 2: 90 }),
      appliedByConcept: new Set([1]),
    });
    assert.equal(d.move, "apply");
    assert.equal(d.target?.conceptIndex, 2);
  });

  test("missing appliedByConcept defaults to none-applied (everything offerable)", () => {
    const d = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 80 }) });
    assert.equal(d.move, "apply");
  });

  test("boundary: score exactly 50 is grasped (apply), 49 is weak (drill)", () => {
    const at50 = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 50 }), appliedByConcept: new Set() });
    assert.equal(at50.move, "apply");
    const at49 = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 49 }) });
    assert.equal(at49.move, "drill");
  });

  test("out-of-order concept input is sorted by index before deciding", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(3, 1, 2),
      masteryByConcept: mastery({ 1: 90, 2: 90, 3: 20 }),
      appliedByConcept: new Set([1, 2]),
    });
    // C3 is weak → drill, regardless of input order.
    assert.equal(d.move, "drill");
    assert.equal(d.target?.conceptIndex, 3);
  });
});
