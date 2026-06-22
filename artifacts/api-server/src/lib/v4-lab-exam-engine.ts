/**
 * v4-lab-exam-engine.ts — Shared logic for the lab + exam endpoints.
 *
 * Responsibilities:
 *   - Resolve a lab/exam by canonical code (e.g. "1.3.5.م1", "1.3.5.exam",
 *     "1.3.exam", "1.exam") against the student's pinned versionId.
 *   - Pick the question-bank variant for an exam attempt using a
 *     round-robin rotation (priorAttemptCount % 3) → 1..3. Same path = same
 *     bank order = student-to-student fairness.
 *   - Compute the pass/fail status for labs and exams (constants here, NOT
 *     in the schema — the threshold may evolve).
 *   - Per-scope USD cost used by the v4 wallet charger. The first attempt
 *     pays; alt-bank retries are free (enforced by counting prior attempts).
 *   - Unlock side-effects (Test-out model): EXAMS are the mandatory gates.
 *     Passing ANY exam recomputes unit reachability via the shared
 *     v4-progression-engine and opens every lesson under the newly-reachable
 *     units. To reach a unit a student must have passed the previous unit's
 *     exam (+ the previous stage's exam when crossing a stage, + the previous
 *     level's exam when crossing a level). Lessons are skippable.
 *
 * All DB access through Drizzle. No AI calls live here — those are in
 * v4-exam-evaluator.ts and called by the routes layer.
 */

import { and, asc, count, eq } from "drizzle-orm";
import {
  db,
  v4LessonsTable,
  v4UnitsTable,
  v4StagesTable,
  v4LevelsTable,
  v4LabScenariosTable,
  v4LabQuestionsTable,
  v4ExamQuestionsTable,
  v4LabCompletionsTable,
  v4ExamAttemptsTable,
  v4StudentPathsTable,
  type V4LabScenario,
  type V4LabQuestion,
  type V4ExamQuestion,
} from "@workspace/db";
import {
  loadProgressionGraph,
  loadExamPassMapForUser,
  computeProgression,
  recomputeUnlockSnapshot,
} from "./v4-progression-engine";

// ── Constants ──────────────────────────────────────────────────────────────
export const LAB_PASS_THRESHOLD = 60;
export const EXAM_PASS_THRESHOLD = 70;

/**
 * USD cost per exam scope. The level-exam line matches spec §13.3
 * ("~$0.02 → ~20 جوهرة"). chargeV4Ai converts USD → gems via floor(usd*1000).
 */
export function examCostUsd(scope: ExamScope): number {
  switch (scope) {
    case "unit":  return 0.005;   // ~5 gems
    case "stage": return 0.010;   // ~10 gems
    case "level": return 0.020;   // ~20 gems
  }
}
// Re-exported from pricing-formula so lab/exam charges use the SAME
// admin-configurable gems-per-USD rate as every other AI surface.
export { usdToGems } from "./pricing-formula";

export type ExamScope = "unit" | "stage" | "level";

// ── Lab resolution ─────────────────────────────────────────────────────────
export type ResolvedLab = {
  scenario: V4LabScenario;
  questions: V4LabQuestion[];      // exactly 5, ordered by questionIndex
};

export async function resolveLab(
  versionId: number,
  code: string,
): Promise<ResolvedLab | null> {
  const [scenario] = await db
    .select()
    .from(v4LabScenariosTable)
    .where(and(
      eq(v4LabScenariosTable.versionId, versionId),
      eq(v4LabScenariosTable.code, code),
    ));
  if (!scenario) return null;
  const questions = await db
    .select()
    .from(v4LabQuestionsTable)
    .where(and(
      eq(v4LabQuestionsTable.versionId, versionId),
      eq(v4LabQuestionsTable.labId, scenario.id),
    ))
    .orderBy(asc(v4LabQuestionsTable.questionIndex));
  return { scenario, questions };
}

// ── Exam resolution ────────────────────────────────────────────────────────
export type ResolvedExam = {
  scope: ExamScope;
  examCode: string;                // canonical "1.exam" / "1.2.exam" / "1.2.3.exam"
  scopeRefId: number;              // unit/stage/level id
  questions: V4ExamQuestion[];     // questions for the chosen variant
  variantIndex: number;            // 1..3 used for this attempt
  totalVariantsAvailable: number;  // distinct variantIndex count
};

/**
 * Look up the scope-anchor row (unit/stage/level) for a canonical exam
 * code. Returns null if not found OR if no exam questions exist for it.
 *
 * Code format:
 *   - "L.exam"           → level
 *   - "L.S.exam"         → stage
 *   - "L.S.U.exam"       → unit
 */
export async function resolveExamAnchor(
  versionId: number,
  code: string,
): Promise<{ scope: ExamScope; scopeRefId: number } | null> {
  if (!code.endsWith(".exam")) return null;
  const segs = code.slice(0, -".exam".length).split(".").map(s => parseInt(s, 10));
  if (segs.some(n => !Number.isFinite(n))) return null;

  if (segs.length === 1) {
    const [lvl] = await db.select({ id: v4LevelsTable.id })
      .from(v4LevelsTable)
      .where(and(eq(v4LevelsTable.versionId, versionId), eq(v4LevelsTable.levelIndex, segs[0])));
    return lvl ? { scope: "level", scopeRefId: lvl.id } : null;
  }
  if (segs.length === 2) {
    const [stg] = await db.select({ id: v4StagesTable.id, code: v4StagesTable.code })
      .from(v4StagesTable)
      .where(and(eq(v4StagesTable.versionId, versionId), eq(v4StagesTable.code, `${segs[0]}.${segs[1]}`)));
    return stg ? { scope: "stage", scopeRefId: stg.id } : null;
  }
  if (segs.length === 3) {
    const unitCode = `${segs[0]}.${segs[1]}.${segs[2]}`;
    const [u] = await db.select({ id: v4UnitsTable.id })
      .from(v4UnitsTable)
      .where(and(eq(v4UnitsTable.versionId, versionId), eq(v4UnitsTable.code, unitCode)));
    return u ? { scope: "unit", scopeRefId: u.id } : null;
  }
  return null;
}

/**
 * Round-robin variant pick: ((priorAttemptCount) % availableVariants) + 1.
 * - 0 prior attempts → variant 1 (first try is always bank 1 = consistency).
 * - 1 prior          → variant 2 (alt-bank, free retry per spec §13.3).
 * - 2 prior          → variant 3.
 * - 3 prior          → variant 1 again. (No attempt cap.)
 */
export function pickVariant(priorAttemptCount: number, totalVariants: number): number {
  const t = Math.max(1, totalVariants);
  return ((Math.max(0, priorAttemptCount)) % t) + 1;
}

export async function resolveExam(
  versionId: number,
  code: string,
  priorAttemptCount: number,
): Promise<ResolvedExam | null> {
  const anchor = await resolveExamAnchor(versionId, code);
  if (!anchor) return null;
  const scopeCol =
    anchor.scope === "unit" ? v4ExamQuestionsTable.unitId :
    anchor.scope === "stage" ? v4ExamQuestionsTable.stageId :
    v4ExamQuestionsTable.levelId;

  // First find all distinct variantIndex values for this exam.
  const allRows = await db
    .select()
    .from(v4ExamQuestionsTable)
    .where(and(
      eq(v4ExamQuestionsTable.versionId, versionId),
      eq(v4ExamQuestionsTable.scope, anchor.scope),
      eq(scopeCol as any, anchor.scopeRefId),
    ))
    .orderBy(asc(v4ExamQuestionsTable.variantIndex), asc(v4ExamQuestionsTable.questionIndex));
  if (allRows.length === 0) return null;

  const variantSet = new Set<number>(allRows.map((r: any) => r.variantIndex as number));
  const totalVariantsAvailable = variantSet.size;
  const variantIndex = pickVariant(priorAttemptCount, totalVariantsAvailable);
  // Pick best available variant (rotation may land on a missing one if the
  // bank is incomplete — fall back to the smallest available).
  const targetVariant = variantSet.has(variantIndex) ? variantIndex : Math.min(...Array.from(variantSet));
  const questions = (allRows as any[]).filter((r: any) => r.variantIndex === targetVariant) as V4ExamQuestion[];

  return {
    scope: anchor.scope,
    examCode: code,
    scopeRefId: anchor.scopeRefId,
    questions,
    variantIndex: targetVariant,
    totalVariantsAvailable,
  };
}

// ── Attempt history ────────────────────────────────────────────────────────
export async function countPriorAttempts(
  userId: number,
  scope: ExamScope,
  scopeRefId: number,
): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(v4ExamAttemptsTable)
    .where(and(
      eq(v4ExamAttemptsTable.userId, userId),
      eq(v4ExamAttemptsTable.scope, scope),
      eq(v4ExamAttemptsTable.scopeRefId, scopeRefId),
    ));
  return Number((row as any)?.c ?? 0);
}

// ── Map gate helpers (consumed by /v4/path/:slug/map) ──────────────────────
/** All lab completions for a user (one row per labId). */
export async function loadLabCompletionsMap(userId: number): Promise<Map<number, { passed: boolean; score: number }>> {
  const rows = await db
    .select({ labId: v4LabCompletionsTable.labId, passed: v4LabCompletionsTable.passed, score: v4LabCompletionsTable.score })
    .from(v4LabCompletionsTable)
    .where(eq(v4LabCompletionsTable.userId, userId));
  const m = new Map<number, { passed: boolean; score: number }>();
  for (const r of rows as any[]) m.set(r.labId as number, { passed: r.passed as boolean, score: r.score as number });
  return m;
}

/**
 * For each (scope, scopeRefId), whether the user has any passing attempt.
 * Map key = `${scope}:${scopeRefId}`.
 */
export async function loadExamPassMap(userId: number): Promise<Map<string, { passed: boolean; bestScore: number; attempts: number }>> {
  const rows = await db
    .select()
    .from(v4ExamAttemptsTable)
    .where(eq(v4ExamAttemptsTable.userId, userId));
  const m = new Map<string, { passed: boolean; bestScore: number; attempts: number }>();
  for (const r of rows as any[]) {
    const k = `${r.scope}:${r.scopeRefId}`;
    const cur = m.get(k) ?? { passed: false, bestScore: 0, attempts: 0 };
    cur.attempts += 1;
    cur.passed = cur.passed || Boolean(r.passed);
    cur.bestScore = Math.max(cur.bestScore, Number(r.score) || 0);
    m.set(k, cur);
  }
  return m;
}

// ── Unlock side-effects on passing a gate exam (Test-out model) ────────────
/**
 * Recompute the student's unlock snapshot after a passing exam of ANY scope
 * (unit / stage / level). Delegates to the shared progression engine, which
 * re-derives unit reachability from the student's PASSED exams and returns the
 * union of (existing unlocked) ∪ (every lesson under the now-reachable units).
 * Never removes a code the student already had.
 *
 * IMPORTANT: reads FRESH exam-pass state from the DB, so the caller MUST have
 * already persisted the new (passing) attempt before invoking this.
 *
 * Caller is responsible for writing the result back via applyUnlockedSnapshot.
 */
export async function computeUnlocksForPassedExam(opts: {
  versionId: number;
  userId: number;
  existingUnlocked: string[];
}): Promise<{ unlocked: string[]; newlyUnlocked: string[]; nextLessonCode: string | null }> {
  return recomputeUnlockSnapshot({
    versionId: opts.versionId,
    userId: opts.userId,
    existingUnlocked: opts.existingUnlocked,
  });
}

// ── Server-side availability gate (anti-bypass for /submit endpoints) ────
/**
 * Re-derive whether a given lab/exam is currently "available" for this
 * user, using the same rules as /v4/path/:slug/map. The route uses this
 * BEFORE accepting a submit so a student can't curl a locked stage/level
 * exam (which would trigger unlock side-effects) by guessing its code.
 *
 * Returns a small struct rather than a boolean so the caller can surface
 * a specific reason in the error response.
 *
 * NOTE: a `completed` resource is also "available" — re-attempts are
 * allowed (re-take a passed exam, redo a passed lab). We only refuse
 * `locked`.
 */
export type GateCheck = { ok: boolean; reason?: string };

export async function checkLabGate(opts: {
  userId: number;
  subjectId: string;
  versionId: number;
  labCode: string;
}): Promise<GateCheck> {
  // Find lab + its unit.
  const [lab] = await db
    .select({ id: v4LabScenariosTable.id, unitId: v4LabScenariosTable.unitId })
    .from(v4LabScenariosTable)
    .where(and(
      eq(v4LabScenariosTable.versionId, opts.versionId),
      eq(v4LabScenariosTable.code, opts.labCode),
    ));
  if (!lab) return { ok: false, reason: "lab_not_found" };

  // Lab is available iff ANY lesson in its unit is unlocked OR the lab
  // already has a completion row (allow re-attempts).
  const lessons = await db
    .select({ code: v4LessonsTable.code })
    .from(v4LessonsTable)
    .where(and(
      eq(v4LessonsTable.versionId, opts.versionId),
      eq(v4LessonsTable.unitId, (lab as any).unitId),
    ));
  const lessonCodes = (lessons as any[]).map(l => l.code as string);
  const [path] = await db
    .select({ unlockedLessonCodes: v4StudentPathsTable.unlockedLessonCodes })
    .from(v4StudentPathsTable)
    .where(and(
      eq(v4StudentPathsTable.userId, opts.userId),
      eq(v4StudentPathsTable.subjectId, opts.subjectId),
    ));
  const unlocked = new Set<string>(Array.isArray(path?.unlockedLessonCodes) ? (path!.unlockedLessonCodes as string[]) : []);
  const anyUnlocked = lessonCodes.some(c => unlocked.has(c));
  if (anyUnlocked) return { ok: true };

  const [comp] = await db
    .select({ id: v4LabCompletionsTable.id })
    .from(v4LabCompletionsTable)
    .where(and(
      eq(v4LabCompletionsTable.userId, opts.userId),
      eq(v4LabCompletionsTable.labId, (lab as any).id),
    ));
  if (comp) return { ok: true };
  return { ok: false, reason: "lab_locked" };
}

/**
 * Test-out anti-bypass gate: re-derive whether this exam is currently
 * attemptable using the SAME reachability projection that drives the map.
 * A student can't curl a locked exam (which would trigger unlock side-effects)
 * by guessing its code.
 *
 *   - unit  exam: attemptable iff the unit is exam-reachable (the previous
 *                 unit/stage/level exams it depends on are passed).
 *   - stage exam: attemptable iff every unit in the stage is cleared.
 *   - level exam: attemptable iff every stage in the level is cleared.
 *
 * Lessons + labs are NOT requirements — exams are the only gates.
 */
export async function checkExamGate(opts: {
  userId: number;
  subjectId: string;
  versionId: number;
  scope: ExamScope;
  scopeRefId: number;
}): Promise<GateCheck> {
  const [path] = await db
    .select({ unlockedLessonCodes: v4StudentPathsTable.unlockedLessonCodes })
    .from(v4StudentPathsTable)
    .where(and(
      eq(v4StudentPathsTable.userId, opts.userId),
      eq(v4StudentPathsTable.subjectId, opts.subjectId),
    ));
  if (!path) return { ok: false, reason: "no_student_path" };
  const legacyUnlocked = Array.isArray(path.unlockedLessonCodes)
    ? (path.unlockedLessonCodes as string[])
    : [];

  const [graph, examPassMap] = await Promise.all([
    loadProgressionGraph(opts.versionId),
    loadExamPassMapForUser(opts.userId),
  ]);
  const state = computeProgression(graph, examPassMap, legacyUnlocked);

  if (opts.scope === "unit") {
    return state.unitExamAvailable(opts.scopeRefId)
      ? { ok: true }
      : { ok: false, reason: "unit_locked" };
  }
  if (opts.scope === "stage") {
    return state.stageExamAvailable(opts.scopeRefId)
      ? { ok: true }
      : { ok: false, reason: "stage_locked" };
  }
  return state.levelExamAvailable(opts.scopeRefId)
    ? { ok: true }
    : { ok: false, reason: "level_locked" };
}

/**
 * Apply the unlock snapshot to v4_student_paths.
 *
 * The unlock set is ADDITIVE and merged against the CURRENT DB value inside a
 * row-locked transaction (SELECT … FOR UPDATE), so two concurrent recomputes
 * (e.g. a map reconcile racing an exam-submit unlock) can never clobber each
 * other's freshly-written codes. The set is union-only — it never shrinks.
 */
export async function applyUnlockedSnapshot(opts: {
  userId: number;
  subjectId: string;
  unlocked: string[];
  nextLessonCode?: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ unlockedLessonCodes: v4StudentPathsTable.unlockedLessonCodes })
      .from(v4StudentPathsTable)
      .where(and(
        eq(v4StudentPathsTable.userId, opts.userId),
        eq(v4StudentPathsTable.subjectId, opts.subjectId),
      ))
      .for("update");
    if (!row) return; // no path row → nothing to persist

    const merged = new Set<string>(
      Array.isArray(row.unlockedLessonCodes) ? (row.unlockedLessonCodes as string[]) : [],
    );
    for (const c of opts.unlocked) merged.add(c);

    const setObj: any = { unlockedLessonCodes: Array.from(merged) as any, updatedAt: new Date() };
    if (opts.nextLessonCode) setObj.currentLessonCode = opts.nextLessonCode;
    await tx.update(v4StudentPathsTable)
      .set(setObj)
      .where(and(
        eq(v4StudentPathsTable.userId, opts.userId),
        eq(v4StudentPathsTable.subjectId, opts.subjectId),
      ));
  });
}
