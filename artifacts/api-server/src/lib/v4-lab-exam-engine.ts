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
 *   - Unlock side-effects: a passing stage exam opens the next stage's
 *     lessons; a passing level exam opens the next level. Unit exams DO
 *     NOT unlock anything (they're a recommended-but-non-blocking gate).
 *
 * All DB access through Drizzle. No AI calls live here — those are in
 * v4-exam-evaluator.ts and called by the routes layer.
 */

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
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
export function usdToGems(usd: number): number {
  return Math.max(1, Math.floor(usd * 1000));
}

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

// ── Unlock side-effects on passing a gate exam ─────────────────────────────
/**
 * Compute the union of (existing unlocked) ∪ (every lesson code under the
 * target stage/level) — used after a passing stage/level exam. Caller is
 * responsible for writing the updated array back to v4_student_paths.
 */
export async function computeUnlocksForPassedExam(opts: {
  versionId: number;
  scope: ExamScope;
  scopeRefId: number;                 // unit/stage/level row id
  existingUnlocked: string[];
}): Promise<{ unlocked: string[]; newlyUnlocked: string[]; nextLessonCode: string | null }> {
  if (opts.scope === "unit") {
    // Unit exam does NOT unlock anything — non-blocking.
    return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
  }

  let nextStages: { id: number; code: string }[] = [];
  if (opts.scope === "stage") {
    // Find the stage row → its levelId + stageIndex → next stage in same level.
    const [stg] = await db
      .select({ levelId: v4StagesTable.levelId, stageIndex: v4StagesTable.stageIndex })
      .from(v4StagesTable)
      .where(eq(v4StagesTable.id, opts.scopeRefId));
    if (!stg) return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
    nextStages = await db
      .select({ id: v4StagesTable.id, code: v4StagesTable.code })
      .from(v4StagesTable)
      .where(and(
        eq(v4StagesTable.versionId, opts.versionId),
        eq(v4StagesTable.levelId, (stg as any).levelId),
        sql`${v4StagesTable.stageIndex} = ${(stg as any).stageIndex + 1}`,
      ));
  } else {
    // level: unlock every stage in the next level.
    const [lvl] = await db
      .select({ levelIndex: v4LevelsTable.levelIndex })
      .from(v4LevelsTable)
      .where(eq(v4LevelsTable.id, opts.scopeRefId));
    if (!lvl) return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
    const [nextLvl] = await db
      .select({ id: v4LevelsTable.id })
      .from(v4LevelsTable)
      .where(and(
        eq(v4LevelsTable.versionId, opts.versionId),
        sql`${v4LevelsTable.levelIndex} = ${(lvl as any).levelIndex + 1}`,
      ));
    if (!nextLvl) return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
    nextStages = await db
      .select({ id: v4StagesTable.id, code: v4StagesTable.code })
      .from(v4StagesTable)
      .where(and(
        eq(v4StagesTable.versionId, opts.versionId),
        eq(v4StagesTable.levelId, (nextLvl as any).id),
      ));
  }

  if (nextStages.length === 0) {
    return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
  }

  // Collect units → lessons under those stages.
  const stageIds = nextStages.map(s => s.id);
  // drizzle: build OR of equals manually since inArray isn't imported here
  const units = await db
    .select({ id: v4UnitsTable.id })
    .from(v4UnitsTable)
    .where(and(
      eq(v4UnitsTable.versionId, opts.versionId),
      sql`${v4UnitsTable.stageId} = ANY(${stageIds})`,
    ));
  const unitIds = units.map((u: any) => u.id as number);
  if (unitIds.length === 0) {
    return { unlocked: opts.existingUnlocked, newlyUnlocked: [], nextLessonCode: null };
  }
  const lessons = await db
    .select({ code: v4LessonsTable.code })
    .from(v4LessonsTable)
    .where(and(
      eq(v4LessonsTable.versionId, opts.versionId),
      sql`${v4LessonsTable.unitId} = ANY(${unitIds})`,
    ))
    .orderBy(asc(v4LessonsTable.code));

  const existingSet = new Set(opts.existingUnlocked);
  const newlyUnlocked: string[] = [];
  for (const l of lessons as any[]) {
    if (!existingSet.has(l.code)) {
      existingSet.add(l.code);
      newlyUnlocked.push(l.code as string);
    }
  }
  const merged = Array.from(existingSet);
  const nextLessonCode = newlyUnlocked[0] ?? null;
  return { unlocked: merged, newlyUnlocked, nextLessonCode };
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

// Numeric segment compare for canonical "L.S.U.Lesson" codes — kept in
// sync with the map endpoint helper. A plain `<` misorders "1.2.3.10".
function compareCodes(a: string, b: string): number {
  const pa = a.split(".").map(s => parseInt(s, 10) || 0);
  const pb = b.split(".").map(s => parseInt(s, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export async function checkExamGate(opts: {
  userId: number;
  subjectId: string;
  versionId: number;
  scope: ExamScope;
  scopeRefId: number;
}): Promise<GateCheck> {
  // Pull the student path once.
  const [path] = await db
    .select({
      unlockedLessonCodes: v4StudentPathsTable.unlockedLessonCodes,
      currentLessonCode:   v4StudentPathsTable.currentLessonCode,
    })
    .from(v4StudentPathsTable)
    .where(and(
      eq(v4StudentPathsTable.userId, opts.userId),
      eq(v4StudentPathsTable.subjectId, opts.subjectId),
    ));
  if (!path) return { ok: false, reason: "no_student_path" };
  const unlocked = new Set<string>(Array.isArray(path.unlockedLessonCodes) ? (path.unlockedLessonCodes as string[]) : []);
  const currentCode = (path as any).currentLessonCode as string | null;

  // A lesson is "completed" iff it is unlocked AND strictly before the
  // student's current active lesson. This MATCHES the map endpoint's
  // lessonStatus() — without it, the active lesson would count as
  // completed and a student could trigger a stage exam after only
  // *reaching* the final lesson (not finishing it), then exploit the
  // unlock side-effects to skip ahead.
  async function unitLessonsAllCompleted(unitIds: number[]): Promise<boolean> {
    if (unitIds.length === 0) return true;
    const ls = await db
      .select({ code: v4LessonsTable.code })
      .from(v4LessonsTable)
      .where(and(
        eq(v4LessonsTable.versionId, opts.versionId),
        inArray(v4LessonsTable.unitId, unitIds),
      ));
    return (ls as any[]).every(l => {
      const c = l.code as string;
      if (!unlocked.has(c)) return false;
      // If no current marker yet, fall back to "unlocked is enough" —
      // shouldn't happen in practice once the engine sets it.
      if (!currentCode) return true;
      return compareCodes(c, currentCode) < 0;
    });
  }

  async function unitLabsAllPassed(unitIds: number[]): Promise<boolean> {
    if (unitIds.length === 0) return true;
    const labRows = await db
      .select({ id: v4LabScenariosTable.id })
      .from(v4LabScenariosTable)
      .where(and(
        eq(v4LabScenariosTable.versionId, opts.versionId),
        inArray(v4LabScenariosTable.unitId, unitIds),
      ));
    const labIds = (labRows as any[]).map(l => l.id as number);
    if (labIds.length === 0) return true;
    const comps = await db
      .select({ labId: v4LabCompletionsTable.labId, passed: v4LabCompletionsTable.passed })
      .from(v4LabCompletionsTable)
      .where(and(
        eq(v4LabCompletionsTable.userId, opts.userId),
        inArray(v4LabCompletionsTable.labId, labIds),
      ));
    const passedSet = new Set<number>((comps as any[]).filter(c => c.passed).map(c => c.labId as number));
    return labIds.every(id => passedSet.has(id));
  }

  if (opts.scope === "unit") {
    const units = await db.select({ id: v4UnitsTable.id })
      .from(v4UnitsTable)
      .where(eq(v4UnitsTable.id, opts.scopeRefId));
    const unitIds = (units as any[]).map(u => u.id as number);
    const lessonsDone = await unitLessonsAllCompleted(unitIds);
    return lessonsDone ? { ok: true } : { ok: false, reason: "unit_lessons_incomplete" };
  }

  if (opts.scope === "stage") {
    const units = await db.select({ id: v4UnitsTable.id })
      .from(v4UnitsTable)
      .where(and(
        eq(v4UnitsTable.versionId, opts.versionId),
        eq(v4UnitsTable.stageId, opts.scopeRefId),
      ));
    const unitIds = (units as any[]).map(u => u.id as number);
    const [lessonsDone, labsDone] = await Promise.all([
      unitLessonsAllCompleted(unitIds),
      unitLabsAllPassed(unitIds),
    ]);
    if (!lessonsDone) return { ok: false, reason: "stage_lessons_incomplete" };
    if (!labsDone)    return { ok: false, reason: "stage_labs_incomplete" };
    return { ok: true };
  }

  // level
  const stages = await db.select({ id: v4StagesTable.id })
    .from(v4StagesTable)
    .where(and(
      eq(v4StagesTable.versionId, opts.versionId),
      eq(v4StagesTable.levelId, opts.scopeRefId),
    ));
  const stageIds = (stages as any[]).map(s => s.id as number);
  if (stageIds.length === 0) return { ok: false, reason: "level_empty" };
  const units = await db.select({ id: v4UnitsTable.id })
    .from(v4UnitsTable)
    .where(and(
      eq(v4UnitsTable.versionId, opts.versionId),
      inArray(v4UnitsTable.stageId, stageIds),
    ));
  const unitIds = (units as any[]).map(u => u.id as number);
  const [lessonsDone, labsDone] = await Promise.all([
    unitLessonsAllCompleted(unitIds),
    unitLabsAllPassed(unitIds),
  ]);
  if (!lessonsDone) return { ok: false, reason: "level_lessons_incomplete" };
  if (!labsDone)    return { ok: false, reason: "level_labs_incomplete" };

  // Every stage with a stage exam must have a passing attempt.
  const stageExams = await db
    .select({ scopeRefId: v4ExamAttemptsTable.scopeRefId, passed: v4ExamAttemptsTable.passed })
    .from(v4ExamAttemptsTable)
    .where(and(
      eq(v4ExamAttemptsTable.userId, opts.userId),
      eq(v4ExamAttemptsTable.scope, "stage" as any),
      inArray(v4ExamAttemptsTable.scopeRefId, stageIds),
    ));
  const stagesWithPass = new Set<number>((stageExams as any[]).filter(a => a.passed).map(a => a.scopeRefId as number));
  // Find which stages actually HAVE an exam bank.
  const stageExamBanks = await db
    .selectDistinct({ stageId: v4ExamQuestionsTable.stageId })
    .from(v4ExamQuestionsTable)
    .where(and(
      eq(v4ExamQuestionsTable.versionId, opts.versionId),
      eq(v4ExamQuestionsTable.scope, "stage"),
      inArray(v4ExamQuestionsTable.stageId, stageIds),
    ));
  const stagesNeedingPass = (stageExamBanks as any[]).map(s => s.stageId as number).filter(Boolean);
  for (const sid of stagesNeedingPass) {
    if (!stagesWithPass.has(sid)) return { ok: false, reason: "stage_exam_not_passed" };
  }
  return { ok: true };
}

/** Apply the unlock snapshot atomically to v4_student_paths. */
export async function applyUnlockedSnapshot(opts: {
  userId: number;
  subjectId: string;
  unlocked: string[];
  nextLessonCode?: string | null;
}): Promise<void> {
  const setObj: any = { unlockedLessonCodes: opts.unlocked as any, updatedAt: new Date() };
  if (opts.nextLessonCode) setObj.currentLessonCode = opts.nextLessonCode;
  await db.update(v4StudentPathsTable)
    .set(setObj)
    .where(and(
      eq(v4StudentPathsTable.userId, opts.userId),
      eq(v4StudentPathsTable.subjectId, opts.subjectId),
    ));
}
