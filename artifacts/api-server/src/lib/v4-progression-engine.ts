/**
 * v4-progression-engine.ts — Single source of truth for the "Test-out
 * (تجاوز حر)" navigation model on the v4 custom learning path.
 *
 * Philosophy (chosen by the product owner over sequential-gates):
 *   - LESSONS are SKIPPABLE. A student may study any lesson of any unit they
 *     can reach, in any order, or skip them entirely.
 *   - EXAMS are the MANDATORY gates. To reach a target unit the student must
 *     have PASSED:
 *       • the exam of the unit immediately before it            (always)
 *       • the exam of the stage immediately before it  (IF crossing a stage)
 *       • the exam of the level immediately before it  (IF crossing a level)
 *
 * Two distinct projections (critical — do NOT collapse them):
 *   - examReachableUnits    : derived from PASSED exams ONLY (+ missing-bank
 *                             auto-clear). Drives every EXAM gate. Old
 *                             linear-flow unlocks must NEVER weaken this, or a
 *                             grandfathered student could skip a now-mandatory
 *                             previous exam.
 *   - lessonAccessibleUnits : examReachableUnits ∪ legacy-unlocked units.
 *                             Drives LESSON + LAB access so live mid-flight
 *                             students never lose access they already had.
 *
 * "Missing exam bank ⇒ gate is OPEN": a unit/stage/level that has no authored
 * exam questions cannot be a hard gate (there would be nothing to pass), so it
 * auto-clears. This keeps incomplete curricula from bricking progression.
 *
 * This module is consumed by:
 *   - routes/v4_path.ts          (GET .../map status projection)
 *   - lib/v4-lab-exam-engine.ts  (checkExamGate + unlock snapshot on pass)
 *   - lib/v4-protocol-tags.ts    (advanceLessonPointer stays within a unit)
 */

import { and, eq } from "drizzle-orm";
import {
  db,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  v4LessonsTable,
  v4ExamQuestionsTable,
  v4ExamAttemptsTable,
} from "@workspace/db";

// ── Canonical code compare ─────────────────────────────────────────────────
/** Segment-by-segment integer compare for canonical "L.S.U.Lesson" codes.
 *  A plain string compare misorders "1.2.3.10" before "1.2.3.2". */
export function compareCodes(a: string, b: string): number {
  const pa = a.split(".").map((s) => parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => parseInt(s, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

/** First 3 segments of a lesson code = its owning unit's canonical code. */
export function unitPrefixOf(lessonCode: string): string {
  return lessonCode.split(".").slice(0, 3).join(".");
}

// ── Graph types ────────────────────────────────────────────────────────────
export interface GraphUnit {
  id: number;
  code: string;        // "L.S.U"
  stageId: number;
  levelId: number;     // resolved via the unit's stage
  levelIndex: number;  // first code segment
  stageCode: string;   // "L.S"
  unitIndex: number;
}

export interface ProgressionGraph {
  versionId: number;
  unitsSorted: GraphUnit[];                // ordered by canonical code
  unitById: Map<number, GraphUnit>;
  unitsByStageId: Map<number, number[]>;   // stageId → unit ids (code order)
  stagesByLevelId: Map<number, number[]>;  // levelId → stage ids (code order)
  stageIdsAll: number[];
  levelIds: number[];
  lessonsByUnitId: Map<number, string[]>;  // unitId → lesson codes (code order)
  firstUnitOfStage: Map<number, number>;   // stageId → first unit id
  firstUnitOfLevel: Map<number, number>;   // levelId → first unit id
  unitExamBank: Set<number>;               // unit ids with ≥1 exam question
  stageExamBank: Set<number>;
  levelExamBank: Set<number>;
  // Stage/level scopes that hold enough content to author a GENERATED adaptive
  // exam (≥1 unit with ≥1 lesson). For stage/level these REPLACE the authored
  // bank as the gate predicate: an examable scope is a real mandatory gate even
  // with no hand-authored bank. Empty shell scopes stay silent (never a gate,
  // never a rendered test node). Unit gating still uses unitExamBank.
  stageExamable: Set<number>;
  levelExamable: Set<number>;
}

// ت٣ — In-process TTL cache for progression graphs (5 min).
// The graph only changes when an admin publishes a new instruction version.
// Re-loading 4 tables on every map GET (multiple SSE-reconnects per student)
// wastes DB connections. A 5-min TTL is safe: admin publishes are rare events
// and a stale cache drifts for at most 5 min before self-healing.
const _graphCache = new Map<number, { graph: ProgressionGraph; cachedAt: number }>();
const GRAPH_CACHE_TTL_MS = 5 * 60 * 1000;

/** Invalidate the cached progression graph for a version (call on admin publish). */
export function invalidateProgressionGraphCache(versionId: number): void {
  _graphCache.delete(versionId);
}

/** Load the full curriculum graph for a version (ALL levels — reachability is
 *  a global forward chain, so a single level's slice is not enough). */
export async function loadProgressionGraph(versionId: number): Promise<ProgressionGraph> {
  // ت٣ — serve from cache when fresh
  const _cached = _graphCache.get(versionId);
  if (_cached && Date.now() - _cached.cachedAt < GRAPH_CACHE_TTL_MS) return _cached.graph;
  const [stages, units, lessons, examRows] = await Promise.all([
    db
      .select({ id: v4StagesTable.id, code: v4StagesTable.code, levelId: v4StagesTable.levelId })
      .from(v4StagesTable)
      .where(eq(v4StagesTable.versionId, versionId)),
    db
      .select({ id: v4UnitsTable.id, code: v4UnitsTable.code, stageId: v4UnitsTable.stageId, unitIndex: v4UnitsTable.unitIndex })
      .from(v4UnitsTable)
      .where(eq(v4UnitsTable.versionId, versionId)),
    db
      .select({ code: v4LessonsTable.code, unitId: v4LessonsTable.unitId })
      .from(v4LessonsTable)
      .where(eq(v4LessonsTable.versionId, versionId)),
    db
      .select({
        scope: v4ExamQuestionsTable.scope,
        unitId: v4ExamQuestionsTable.unitId,
        stageId: v4ExamQuestionsTable.stageId,
        levelId: v4ExamQuestionsTable.levelId,
      })
      .from(v4ExamQuestionsTable)
      .where(eq(v4ExamQuestionsTable.versionId, versionId)),
  ]);

  const stageLevelById = new Map<number, number>();
  for (const s of stages as any[]) stageLevelById.set(s.id as number, s.levelId as number);

  // Build units with derived level info.
  const unitsAll: GraphUnit[] = (units as any[]).map((u) => {
    const code = String(u.code);
    const levelIndex = parseInt(code.split(".")[0] || "0", 10) || 0;
    const stageCode = code.split(".").slice(0, 2).join(".");
    return {
      id: u.id as number,
      code,
      stageId: u.stageId as number,
      levelId: stageLevelById.get(u.stageId as number) ?? 0,
      levelIndex,
      stageCode,
      unitIndex: Number(u.unitIndex) || 0,
    };
  });
  const unitsSorted = [...unitsAll].sort((a, b) => compareCodes(a.code, b.code));

  const unitById = new Map<number, GraphUnit>();
  for (const u of unitsSorted) unitById.set(u.id, u);

  const unitsByStageId = new Map<number, number[]>();
  const stagesByLevelId = new Map<number, number[]>();
  const firstUnitOfStage = new Map<number, number>();
  const firstUnitOfLevel = new Map<number, number>();
  for (const u of unitsSorted) {
    if (!unitsByStageId.has(u.stageId)) unitsByStageId.set(u.stageId, []);
    unitsByStageId.get(u.stageId)!.push(u.id);
    if (!firstUnitOfStage.has(u.stageId)) firstUnitOfStage.set(u.stageId, u.id);
    if (!firstUnitOfLevel.has(u.levelId)) firstUnitOfLevel.set(u.levelId, u.id);
  }

  // Stage order within a level follows canonical stage code.
  const stagesSorted = [...(stages as any[])].sort((a, b) => compareCodes(String(a.code), String(b.code)));
  for (const s of stagesSorted) {
    const lid = s.levelId as number;
    if (!stagesByLevelId.has(lid)) stagesByLevelId.set(lid, []);
    stagesByLevelId.get(lid)!.push(s.id as number);
  }

  const lessonsByUnitId = new Map<number, string[]>();
  for (const l of lessons as any[]) {
    const uid = l.unitId as number;
    if (!lessonsByUnitId.has(uid)) lessonsByUnitId.set(uid, []);
    lessonsByUnitId.get(uid)!.push(String(l.code));
  }
  for (const arr of lessonsByUnitId.values()) arr.sort(compareCodes);

  const unitExamBank = new Set<number>();
  const stageExamBank = new Set<number>();
  const levelExamBank = new Set<number>();
  for (const e of examRows as any[]) {
    if (e.scope === "unit" && e.unitId) unitExamBank.add(e.unitId as number);
    else if (e.scope === "stage" && e.stageId) stageExamBank.add(e.stageId as number);
    else if (e.scope === "level" && e.levelId) levelExamBank.add(e.levelId as number);
  }

  // A stage/level is "examable" when it holds real content to author a
  // generated adaptive exam from: ≥1 unit that has ≥1 lesson. Empty shell
  // scopes stay silent (never become a gate, never render a test node).
  const stageExamable = new Set<number>();
  for (const [stageId, unitIds] of unitsByStageId) {
    if (unitIds.some((uid) => (lessonsByUnitId.get(uid)?.length ?? 0) > 0)) {
      stageExamable.add(stageId);
    }
  }
  const levelExamable = new Set<number>();
  for (const [levelId, stageIds] of stagesByLevelId) {
    if (stageIds.some((sid) => stageExamable.has(sid))) levelExamable.add(levelId);
  }

  const graph: ProgressionGraph = {
    versionId,
    unitsSorted,
    unitById,
    unitsByStageId,
    stagesByLevelId,
    stageIdsAll: stagesSorted.map((s) => s.id as number),
    levelIds: Array.from(firstUnitOfLevel.keys()),
    lessonsByUnitId,
    firstUnitOfStage,
    firstUnitOfLevel,
    unitExamBank,
    stageExamBank,
    levelExamBank,
    stageExamable,
    levelExamable,
  };
  // ت٣ — cache for future callers
  _graphCache.set(versionId, { graph, cachedAt: Date.now() });
  return graph;
}

// ── Pure progression projection ────────────────────────────────────────────
export interface ProgressionState {
  /** Units the student can ENTER for taking exams (passed-exams-derived). */
  examReachableUnitIds: Set<number>;
  /** Units whose lessons + labs the student may open (incl. legacy unlocks). */
  lessonAccessibleUnitIds: Set<number>;
  /** All lesson codes under lessonAccessibleUnitIds (∪ legacy), code-sorted. */
  accessibleLessonCodes: string[];

  unitExamAvailable(unitId: number): boolean;
  unitCleared(unitId: number): boolean;
  stageUnitsCleared(stageId: number): boolean;
  stageReachable(stageId: number): boolean;
  stageExamAvailable(stageId: number): boolean;
  stageCleared(stageId: number): boolean;
  levelReachable(levelId: number): boolean;
  levelExamAvailable(levelId: number): boolean;
  levelCleared(levelId: number): boolean;
}

export type ExamPassMap = Map<string, { passed: boolean }>;

/**
 * Pure: compute the full progression projection from the curriculum graph,
 * the student's exam-pass map (key `${scope}:${scopeRefId}`), and the codes
 * already unlocked under the legacy linear flow.
 */
export function computeProgression(
  graph: ProgressionGraph,
  examPassMap: ExamPassMap,
  legacyUnlocked: string[],
): ProgressionState {
  const passedUnit = (id: number) => examPassMap.get(`unit:${id}`)?.passed === true;
  const passedStage = (id: number) => examPassMap.get(`stage:${id}`)?.passed === true;
  const passedLevel = (id: number) => examPassMap.get(`level:${id}`)?.passed === true;

  // A gate is OPEN when there is no exam bank to pass, OR the exam is passed.
  const unitGateOpen = (id: number) => !graph.unitExamBank.has(id) || passedUnit(id);
  // Stage/level gates: a scope with authorable content (examable) is a real
  // mandatory gate — open only once its generated/authored exam is passed.
  const stageGateOpen = (id: number) => !graph.stageExamable.has(id) || passedStage(id);
  const levelGateOpen = (id: number) => !graph.levelExamable.has(id) || passedLevel(id);

  // ── Forward reachability chain over canonically-ordered units ──
  const examReachableUnitIds = new Set<number>();
  let prev: GraphUnit | null = null;
  let prevReachable = false;
  for (const u of graph.unitsSorted) {
    let reachable: boolean;
    if (!prev) {
      reachable = true; // first curriculum unit is always open
    } else {
      let gate = unitGateOpen(prev.id);
      if (u.stageCode !== prev.stageCode) gate = gate && stageGateOpen(prev.stageId);
      if (u.levelIndex !== prev.levelIndex) gate = gate && levelGateOpen(prev.levelId);
      reachable = prevReachable && gate;
    }
    if (reachable) examReachableUnitIds.add(u.id);
    prev = u;
    prevReachable = reachable;
  }

  const unitExamAvailable = (unitId: number) => examReachableUnitIds.has(unitId);
  // A unit is "cleared" iff it is reachable AND its exam is passed (or none).
  const unitCleared = (unitId: number) =>
    examReachableUnitIds.has(unitId) && (!graph.unitExamBank.has(unitId) || passedUnit(unitId));

  const stageUnitsCleared = (stageId: number) => {
    const us = graph.unitsByStageId.get(stageId) ?? [];
    return us.length > 0 ? us.every(unitCleared) : false;
  };
  const stageReachable = (stageId: number) => {
    const fu = graph.firstUnitOfStage.get(stageId);
    return fu != null && examReachableUnitIds.has(fu);
  };
  // Stage exam may be attempted once all its units are cleared.
  const stageExamAvailable = (stageId: number) =>
    stageReachable(stageId) && stageUnitsCleared(stageId);
  const stageCleared = (stageId: number) =>
    stageUnitsCleared(stageId) && (!graph.stageExamable.has(stageId) || passedStage(stageId));

  const levelReachable = (levelId: number) => {
    const fu = graph.firstUnitOfLevel.get(levelId);
    return fu != null && examReachableUnitIds.has(fu);
  };
  const levelStagesCleared = (levelId: number) => {
    const ss = graph.stagesByLevelId.get(levelId) ?? [];
    return ss.length > 0 ? ss.every(stageCleared) : false;
  };
  const levelExamAvailable = (levelId: number) =>
    levelReachable(levelId) && levelStagesCleared(levelId);
  const levelCleared = (levelId: number) =>
    levelStagesCleared(levelId) && (!graph.levelExamable.has(levelId) || passedLevel(levelId));

  // ── Lesson access = exam-reachable units ∪ legacy-unlocked units ──
  const legacySet = new Set(legacyUnlocked);
  const lessonAccessibleUnitIds = new Set<number>(examReachableUnitIds);
  for (const u of graph.unitsSorted) {
    if (lessonAccessibleUnitIds.has(u.id)) continue;
    const codes = graph.lessonsByUnitId.get(u.id) ?? [];
    if (codes.some((c) => legacySet.has(c))) lessonAccessibleUnitIds.add(u.id);
  }

  const accessibleSet = new Set<string>(legacyUnlocked); // never shrink below legacy
  for (const uid of lessonAccessibleUnitIds) {
    for (const c of graph.lessonsByUnitId.get(uid) ?? []) accessibleSet.add(c);
  }
  const accessibleLessonCodes = Array.from(accessibleSet).sort(compareCodes);

  return {
    examReachableUnitIds,
    lessonAccessibleUnitIds,
    accessibleLessonCodes,
    unitExamAvailable,
    unitCleared,
    stageUnitsCleared,
    stageReachable,
    stageExamAvailable,
    stageCleared,
    levelReachable,
    levelExamAvailable,
    levelCleared,
  };
}

// ── Required-exam chain (test-out plan for a locked target) ────────────────
export interface RequiredExamStep {
  scope: "unit" | "stage" | "level";
  /** unit id / stage id / level id the exam belongs to. */
  refId: number;
  /** canonical exam code, e.g. "1.2.3.exam" / "1.2.exam" / "1.exam". */
  code: string;
}

/**
 * Ordered list of exams a student must PASS to make `targetUnitId` exam-reachable
 * (i.e. to "test out" up to that unit). Mirrors `computeProgression`'s forward
 * reachability gate logic EXACTLY, so the chain is the precise set of gates that
 * currently block the target — no more, no less.
 *
 * Order is pedagogical / take-able: for each unit→unit boundary on the path,
 * the previous unit's exam comes first, then (if crossing a stage) that stage's
 * exam, then (if crossing a level) that level's exam. By construction the FIRST
 * entry is always an exam the student can attempt RIGHT NOW (the broken gate at
 * the current reachable frontier), and there are no duplicates.
 *
 * Returns [] when the target is already reachable or the unit id is unknown.
 */
export function computeRequiredExamChain(
  graph: ProgressionGraph,
  examPassMap: ExamPassMap,
  legacyUnlocked: string[],
  targetUnitId: number,
): RequiredExamStep[] {
  const state = computeProgression(graph, examPassMap, legacyUnlocked);
  if (state.examReachableUnitIds.has(targetUnitId)) return [];

  const targetIdx = graph.unitsSorted.findIndex((u) => u.id === targetUnitId);
  if (targetIdx < 0) return [];

  const passedUnit = (id: number) => examPassMap.get(`unit:${id}`)?.passed === true;
  const passedStage = (id: number) => examPassMap.get(`stage:${id}`)?.passed === true;
  const passedLevel = (id: number) => examPassMap.get(`level:${id}`)?.passed === true;
  const unitGateOpen = (id: number) => !graph.unitExamBank.has(id) || passedUnit(id);
  // Stage/level gates: a scope with authorable content (examable) is a real
  // mandatory gate — open only once its generated/authored exam is passed.
  const stageGateOpen = (id: number) => !graph.stageExamable.has(id) || passedStage(id);
  const levelGateOpen = (id: number) => !graph.levelExamable.has(id) || passedLevel(id);

  const chain: RequiredExamStep[] = [];
  for (let i = 1; i <= targetIdx; i++) {
    const prev = graph.unitsSorted[i - 1];
    const cur = graph.unitsSorted[i];
    // Gate required to ENTER `cur` coming from `prev` — same predicate as the
    // forward reachability chain in computeProgression.
    if (!unitGateOpen(prev.id)) {
      chain.push({ scope: "unit", refId: prev.id, code: `${prev.code}.exam` });
    }
    if (cur.stageCode !== prev.stageCode && !stageGateOpen(prev.stageId)) {
      chain.push({ scope: "stage", refId: prev.stageId, code: `${prev.stageCode}.exam` });
    }
    if (cur.levelIndex !== prev.levelIndex && !levelGateOpen(prev.levelId)) {
      chain.push({ scope: "level", refId: prev.levelId, code: `${prev.levelIndex}.exam` });
    }
  }
  return chain;
}

/** Build the same `${scope}:${scopeRefId}` pass map used elsewhere, querying
 *  attempts directly so this module has no dependency on v4-lab-exam-engine.
 *  ت٢ — `versionId` filter: exam passes from a retired instruction version
 *  (e.g. admin published a revised curriculum) must NOT be counted as passes
 *  in the new version's progression graph — a student who passed unit 3 of
 *  v1 has NOT passed unit 3 of v2 (the exam bank is different). Pass the
 *  current `path.versionId` wherever possible; omit only when unknown. */
export async function loadExamPassMapForUser(userId: number, versionId?: number): Promise<ExamPassMap> {
  const rows = await db
    .select({ scope: v4ExamAttemptsTable.scope, scopeRefId: v4ExamAttemptsTable.scopeRefId, passed: v4ExamAttemptsTable.passed })
    .from(v4ExamAttemptsTable)
    .where(versionId !== undefined
      ? and(eq(v4ExamAttemptsTable.userId, userId), eq(v4ExamAttemptsTable.versionId, versionId))
      : eq(v4ExamAttemptsTable.userId, userId));
  const m: ExamPassMap = new Map();
  for (const r of rows as any[]) {
    const k = `${r.scope}:${r.scopeRefId}`;
    const cur = m.get(k) ?? { passed: false };
    cur.passed = cur.passed || Boolean(r.passed);
    m.set(k, cur);
  }
  return m;
}

/**
 * Recompute the unlock snapshot for a student after an exam pass (or for a
 * lazy map-load reconciliation). Reads FRESH exam-pass state from the DB, so
 * the caller must have already persisted the new attempt before calling.
 *
 * Returns the union of (legacy unlocked) ∪ (all lessons of reachable units) —
 * it NEVER removes a code the student already had.
 */
export async function recomputeUnlockSnapshot(opts: {
  versionId: number;
  userId: number;
  existingUnlocked: string[];
}): Promise<{ unlocked: string[]; newlyUnlocked: string[]; nextLessonCode: string | null }> {
  const [graph, examPassMap] = await Promise.all([
    loadProgressionGraph(opts.versionId),
    loadExamPassMapForUser(opts.userId, opts.versionId), // ت٢ — scope to version
  ]);
  const state = computeProgression(graph, examPassMap, opts.existingUnlocked);
  const existingSet = new Set(opts.existingUnlocked);
  const unlocked = state.accessibleLessonCodes;
  const newlyUnlocked = unlocked.filter((c) => !existingSet.has(c)).sort(compareCodes);
  const nextLessonCode = newlyUnlocked.length > 0 ? newlyUnlocked[0] : null;
  return { unlocked, newlyUnlocked, nextLessonCode };
}
