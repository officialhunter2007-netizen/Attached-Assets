/**
 * Unit tests for decideDiagnosticMove (v4-diagnostic-engine.ts).
 *
 * Locks the disjoint, strict-priority contract that drives the teaching
 * directive built for the /v4/teach `done` event:
 *
 *   1. earliest untested|weak                          → PROBE / DRILL  (W1)
 *   2. else earliest IMPORTANT(weight>1) grasped concept missing W2 → RATIONALE (W2)
 *   3. else earliest IMPORTANT grasped concept W2-covered missing W3 → BOUNDARY  (W3)
 *   4. else earliest shaky concept                      → REINFORCE
 *   5. else all mastered + all required facets cleared  → ADVANCE
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/v4-diagnostic-move.test.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { decideDiagnosticMove, type DiagnosticConcept } from "../v4-diagnostic-engine.js";
import type { V4ConceptFacets, V4FacetState } from "@workspace/db";

function concepts(...idx: number[]): DiagnosticConcept[] {
  return idx.map((i) => ({ conceptIndex: i, name: `C${i}`, masteryCriterion: `crit${i}`, weight: 1 }));
}
/** Like `concepts` but every concept is IMPORTANT (weight>1) so the middle
 *  facets (W2/W3) are required. */
function conceptsW(weight: number, ...idx: number[]): DiagnosticConcept[] {
  return idx.map((i) => ({ conceptIndex: i, name: `C${i}`, masteryCriterion: `crit${i}`, weight }));
}
const mastery = (m: Record<number, number>) => new Map<number, number>(Object.entries(m).map(([k, v]) => [Number(k), v]));

const fcov = (covered: boolean, score: number | null = null, attempts = 1): V4FacetState => ({ covered, score, attempts });
const facets = (m: Record<number, { w2?: V4FacetState; w3?: V4FacetState }>) =>
  new Map<number, V4ConceptFacets>(Object.entries(m).map(([k, v]) => [Number(k), v]));

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

  test("a real gap BEATS a shaky later concept (foundation first)", () => {
    // C1 untested (gap), C2 shaky — gap must win.
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2),
      masteryByConcept: mastery({ 2: 60 }),
    });
    assert.equal(d.move, "probe");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("grasped (≥50, ordinary weight) → nothing left to do but REINFORCE if shaky", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 60 }),
    });
    assert.equal(d.move, "reinforce");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("mastered ordinary concept → ADVANCE (null target)", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 95 }),
    });
    assert.equal(d.move, "advance");
    assert.equal(d.target, null);
  });

  test("shaky (50-74) → REINFORCE", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 60 }),
    });
    assert.equal(d.move, "reinforce");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("all mastered → ADVANCE (null target)", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2),
      masteryByConcept: mastery({ 1: 90, 2: 88 }),
    });
    assert.equal(d.move, "advance");
    assert.equal(d.target, null);
  });

  test("REINFORCE picks the EARLIEST shaky concept", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(1, 2, 3),
      masteryByConcept: mastery({ 1: 90, 2: 60, 3: 65 }),
    });
    assert.equal(d.move, "reinforce");
    assert.equal(d.target?.conceptIndex, 2);
  });

  test("boundary: score exactly 50 is shaky (reinforce), 49 is weak (drill)", () => {
    const at50 = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 50 }) });
    assert.equal(at50.move, "reinforce");
    const at49 = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 49 }) });
    assert.equal(at49.move, "drill");
  });

  test("out-of-order concept input is sorted by index before deciding", () => {
    const d = decideDiagnosticMove({
      concepts: concepts(3, 1, 2),
      masteryByConcept: mastery({ 1: 90, 2: 90, 3: 20 }),
    });
    // C3 is weak → drill, regardless of input order.
    assert.equal(d.move, "drill");
    assert.equal(d.target?.conceptIndex, 3);
  });

  test("every non-facet move reports facet === null (disjointness)", () => {
    const probe = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({}) });
    const drill = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 20 }) });
    const reinforce = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 60 }) });
    const advance = decideDiagnosticMove({ concepts: concepts(1), masteryByConcept: mastery({ 1: 90 }) });
    for (const d of [probe, drill, reinforce, advance]) assert.equal(d.facet, null);
  });
});

describe("decideDiagnosticMove — facet depth (weighted)", () => {
  test("weight=1 concept never asks W2/W3: grasped-mastered → ADVANCE directly", () => {
    // Even with NO facet coverage, an ordinary concept skips straight past facets.
    const d = decideDiagnosticMove({
      concepts: concepts(1),
      masteryByConcept: mastery({ 1: 80 }),
      facetsByConcept: facets({}),
    });
    assert.equal(d.move, "advance");
    assert.equal(d.facet, null);
  });

  test("weight>1 grasped, no facet coverage → RATIONALE (W2)", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 80 }),
      facetsByConcept: facets({}),
    });
    assert.equal(d.move, "rationale");
    assert.equal(d.facet, "w2");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("weight>1 grasped, W2 covered but W3 not → BOUNDARY (W3)", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 80 }),
      facetsByConcept: facets({ 1: { w2: fcov(true, 90) } }),
    });
    assert.equal(d.move, "boundary");
    assert.equal(d.facet, "w3");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("weight>1 grasped-mastered, W2+W3 covered → ADVANCE (facets satisfied)", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 80 }),
      facetsByConcept: facets({ 1: { w2: fcov(true, 90), w3: fcov(true, 85) } }),
    });
    assert.equal(d.move, "advance");
    assert.equal(d.facet, null);
  });

  test("no facet is skipped: full W1→W2→W3→REINFORCE→ADVANCE walk for weight>1", () => {
    const c = conceptsW(2, 1);
    // untested → probe (W1)
    assert.equal(decideDiagnosticMove({ concepts: c, masteryByConcept: mastery({}), facetsByConcept: facets({}) }).move, "probe");
    // grasped, no facets → rationale (W2)
    assert.equal(decideDiagnosticMove({ concepts: c, masteryByConcept: mastery({ 1: 80 }), facetsByConcept: facets({}) }).move, "rationale");
    // W2 covered → boundary (W3)
    assert.equal(decideDiagnosticMove({ concepts: c, masteryByConcept: mastery({ 1: 80 }), facetsByConcept: facets({ 1: { w2: fcov(true) } }) }).move, "boundary");
    // W2+W3 covered, but shaky → reinforce
    assert.equal(decideDiagnosticMove({ concepts: c, masteryByConcept: mastery({ 1: 60 }), facetsByConcept: facets({ 1: { w2: fcov(true), w3: fcov(true) } }) }).move, "reinforce");
    // mastered + all facets → advance
    assert.equal(decideDiagnosticMove({ concepts: c, masteryByConcept: mastery({ 1: 90 }), facetsByConcept: facets({ 1: { w2: fcov(true), w3: fcov(true) } }) }).move, "advance");
  });

  test("weight>1 mastered but W2 uncovered → STILL RATIONALE (coverage is required, not optional)", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 95 }),
      facetsByConcept: facets({}),
    });
    assert.equal(d.move, "rationale");
    assert.equal(d.facet, "w2");
  });

  test("covered:false (graded-but-not-cleared) still counts as a gap", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 80 }),
      facetsByConcept: facets({ 1: { w2: fcov(false, 40, 1) } }),
    });
    assert.equal(d.move, "rationale");
  });

  test("a real W1 gap BEATS any facet move (foundation before depth)", () => {
    // C1 untested (W1 gap), C2 important+grasped+missing-W2 (facet candidate).
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1, 2),
      masteryByConcept: mastery({ 2: 80 }),
      facetsByConcept: facets({}),
    });
    assert.equal(d.move, "probe");
    assert.equal(d.target?.conceptIndex, 1);
  });

  test("RATIONALE on an important concept BEATS ADVANCE on an ordinary one (breadth-first by facet)", () => {
    // C1 weight=1 mastered (advance candidate), C2 weight=2 grasped+missing-W2.
    // W2 (step 2) sits above REINFORCE/ADVANCE (steps 4-5) → C2 rationale wins.
    const d = decideDiagnosticMove({
      concepts: [...concepts(1), ...conceptsW(2, 2)],
      masteryByConcept: mastery({ 1: 90, 2: 80 }),
      facetsByConcept: facets({}),
    });
    assert.equal(d.move, "rationale");
    assert.equal(d.target?.conceptIndex, 2);
  });

  test("RATIONALE targets the EARLIEST important concept missing W2", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1, 2, 3),
      masteryByConcept: mastery({ 1: 80, 2: 80, 3: 80 }),
      facetsByConcept: facets({ 1: { w2: fcov(true), w3: fcov(true) } }), // C1 fully covered → C2 next
    });
    assert.equal(d.move, "rationale");
    assert.equal(d.target?.conceptIndex, 2);
  });

  test("omitting facetsByConcept on weight>1 concepts surfaces the W2 gap (legacy {} = not covered)", () => {
    const d = decideDiagnosticMove({
      concepts: conceptsW(2, 1),
      masteryByConcept: mastery({ 1: 80 }),
    });
    assert.equal(d.move, "rationale");
  });
});
