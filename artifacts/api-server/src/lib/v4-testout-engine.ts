// ── Adaptive test-out exam ──────────────────────────────────────────────────
// One adaptive exam that lets a student "test out" of everything BEFORE a
// locked lesson/lab. It generates 13–20 MCQs covering the prerequisite units
// (every unit numerically before the target's unit). Score ≥ 70% unlocks the
// whole prior path up to the target; < 70% denies with immediate, unlimited
// retry.
//
// Design notes:
//  - The MCQ pool for a given target unit is identical for every student, so it
//    is cached GLOBALLY in v4_testout_pools (one row per versionId+targetUnit).
//    The first student to test-out toward a target absorbs the one-time Gemini
//    generation; everyone else (and every retry) reuses it for free — same
//    free-onboarding precedent as the placement test.
//  - MCQ grading is a pure index comparison (free + deterministic). correctIndex
//    NEVER leaves the server.
//  - PASS effect is an ADDITIVE merge of all lesson codes ≤ targetCode into
//    v4_student_paths.unlockedLessonCodes (via applyUnlockedSnapshot). We do NOT
//    write fake v4_exam_attempts rows — that would corrupt the exam-gate
//    projection which counts PASSED exams only.
import { db } from "@workspace/db";
import { v4TestoutPoolsTable, v4LabScenariosTable, v4ExamAttemptsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";
import {
  type ResolvedSpecialty,
  type GeneratedPlacementQuestion,
  compareCodes,
  generateUnitQuestionPool,
} from "./v4-path-engine";
import { unitPrefixOf, recomputeUnlockSnapshot } from "./v4-progression-engine";
import { applyUnlockedSnapshot } from "./v4-lab-exam-engine";

// ── Tunables ────────────────────────────────────────────────────────────────
export const TESTOUT_PASS_PCT = 70;
export const TESTOUT_ASK_MIN = 13;
export const TESTOUT_ASK_MAX = 20;
/**
 * A test-out is only runnable when the generated pool can serve a full exam
 * (≥ ASK_MIN questions). A thinner pool means generation failed / the prereq
 * region is too small to author 13 questions — the caller returns an error and
 * does NOT unlock. Set equal to ASK_MIN so we never finalize on < 13 questions.
 */
export const TESTOUT_MIN_RUNNABLE = TESTOUT_ASK_MIN;
/**
 * How many distinct prerequisite units we author questions for. The exam serves
 * 13–20 questions stratified across these, so the sample must span at least the
 * served count to give every served slot its own unit. `evenSampleCodes` always
 * keeps the first AND last prereq unit, so the breadth spans the WHOLE prereq
 * range (earliest → latest) even when there are more units than this cap.
 */
const TESTOUT_SAMPLE_UNITS = 22;
/** Pool size we aim for before serving 13–20 of it (drives per-unit count). */
const TESTOUT_TARGET_POOL = 40;

// ── Shapes ──────────────────────────────────────────────────────────────────
export type TestoutPending = { questionId: number };
export type TestoutAnswerRec = { questionId: number; correct: boolean };
export type TestoutClientQuestion = {
  id: number;
  prompt: string;
  choices: string[];
  difficulty: number;
};
export type TestoutPool = {
  questions: GeneratedPlacementQuestion[];
  unitNames: Record<string, string>;
};
export type TestoutWeakArea = {
  unitCode: string;
  unitName: string;
  wrong: number;
  total: number;
};

// ── Scope ───────────────────────────────────────────────────────────────────
/**
 * The prerequisite scope for testing out toward `targetCode`: every unit that
 * sorts numerically BEFORE the target's own unit. A target with no prerequisite
 * units (it lives in the very first unit) returns hasPrereqs=false → the caller
 * unlocks immediately, no exam needed.
 */
export function resolveTestoutScope(
  resolved: ResolvedSpecialty,
  targetCode: string,
): { targetUnitCode: string; prereqUnitCodes: string[]; hasPrereqs: boolean } {
  const targetUnitCode = unitPrefixOf(targetCode);
  const units = resolved.units; // numerically sorted by unitCode
  const idx = units.findIndex((u) => u.unitCode === targetUnitCode);
  const prereq =
    idx >= 0
      ? units.slice(0, idx).map((u) => u.unitCode)
      : units
          .filter((u) => compareCodes(u.unitCode, targetUnitCode) < 0)
          .map((u) => u.unitCode);
  return { targetUnitCode, prereqUnitCodes: prereq, hasPrereqs: prereq.length > 0 };
}

/**
 * Server-side validation of a client-supplied `targetCode`. A student may only
 * test-out toward a code that ACTUALLY exists in the active curriculum — either
 * a real lesson code or a real lab code. This is the anti-bypass gate: without
 * it a crafted code (e.g. a fake high code, or a fake code in the first unit
 * that skips the exam via the no-prereq path) could unlock an unintended range.
 * Returns null when the code is not a real lesson or lab.
 */
export async function resolveTestoutTarget(
  resolved: ResolvedSpecialty,
  targetCode: string,
): Promise<{ kind: "lesson" | "lab"; targetUnitCode: string } | null> {
  if (resolved.orderedLessonCodes.includes(targetCode)) {
    return { kind: "lesson", targetUnitCode: unitPrefixOf(targetCode) };
  }
  const [lab] = await db
    .select({ id: v4LabScenariosTable.id })
    .from(v4LabScenariosTable)
    .where(and(
      eq(v4LabScenariosTable.versionId, resolved.versionId),
      eq(v4LabScenariosTable.code, targetCode),
    ));
  if (lab) return { kind: "lab", targetUnitCode: unitPrefixOf(targetCode) };
  return null;
}

// ── Pool generation + caching ───────────────────────────────────────────────
const inflightPools = new Map<string, Promise<TestoutPool>>();

function evenSampleCodes(arr: string[], max: number): string[] {
  const sorted = [...arr].sort(compareCodes);
  if (sorted.length <= max) return sorted;
  const idxs = new Set<number>();
  const step = (sorted.length - 1) / (max - 1);
  for (let k = 0; k < max; k++) idxs.add(Math.round(k * step));
  idxs.add(0);
  idxs.add(sorted.length - 1);
  return Array.from(idxs).sort((a, b) => a - b).map((i) => sorted[i]);
}

/** Read a cached pool without generating. Returns null when none exists yet. */
export async function loadTestoutPool(
  versionId: number,
  targetUnitCode: string,
): Promise<TestoutPool | null> {
  const [row] = await db
    .select()
    .from(v4TestoutPoolsTable)
    .where(and(
      eq(v4TestoutPoolsTable.versionId, versionId),
      eq(v4TestoutPoolsTable.targetUnitCode, targetUnitCode),
    ));
  if (!row) return null;
  return {
    questions: (row.questions as GeneratedPlacementQuestion[]) ?? [],
    unitNames: (row.unitNames as Record<string, string>) ?? {},
  };
}

/**
 * Read-or-generate the GLOBAL question pool for (versionId, targetUnitCode).
 * Concurrent first-generations for the same target are de-duped in-process so a
 * burst of students tapping the same locked node triggers ONE Gemini run.
 */
export async function getOrCreateTestoutPool(opts: {
  versionId: number;
  targetUnitCode: string;
  prereqUnitCodes: string[];
}): Promise<TestoutPool> {
  const cached = await loadTestoutPool(opts.versionId, opts.targetUnitCode);
  if (cached && cached.questions.length > 0) return cached;

  const key = `${opts.versionId}:${opts.targetUnitCode}`;
  const existing = inflightPools.get(key);
  if (existing) return existing;

  const p = (async (): Promise<TestoutPool> => {
    // Span the full prereq range (evenSampleCodes keeps first + last unit).
    const sampled = evenSampleCodes(opts.prereqUnitCodes, TESTOUT_SAMPLE_UNITS);
    // Author enough per unit that even a single tiny prereq region clears the
    // ≥13 runnable floor, while many-unit regions stay ~TARGET_POOL total.
    const perUnit = Math.min(
      13,
      Math.max(3, Math.ceil(TESTOUT_TARGET_POOL / Math.max(1, sampled.length))),
    );
    const { questions, unitNames } = await generateUnitQuestionPool({
      versionId: opts.versionId,
      unitCodes: sampled,
      perUnit,
    });
    if (questions.length > 0) {
      try {
        await db
          .insert(v4TestoutPoolsTable)
          .values({
            versionId: opts.versionId,
            targetUnitCode: opts.targetUnitCode,
            prereqUnitCodes: opts.prereqUnitCodes as any,
            questions: questions as any,
            unitNames: unitNames as any,
          })
          .onConflictDoNothing({
            target: [v4TestoutPoolsTable.versionId, v4TestoutPoolsTable.targetUnitCode],
          });
      } catch (e) {
        logger.warn?.(`[v4-testout] pool persist failed ${key}: ${String((e as any)?.message ?? e)}`);
      }
      // Prefer the freshly-persisted row (covers the race where a concurrent
      // worker won the insert) so all callers share the same canonical pool.
      const persisted = await loadTestoutPool(opts.versionId, opts.targetUnitCode);
      if (persisted && persisted.questions.length > 0) return persisted;
    }
    return { questions, unitNames };
  })();

  inflightPools.set(key, p);
  try {
    return await p;
  } finally {
    inflightPools.delete(key);
  }
}

// ── Question selection (stratified across prereq units) ──────────────────────
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick up to `max` question ids spread evenly across the prerequisite units
 * (round-robin), shuffling within each unit so retries feel fresh.
 */
export function selectTestoutQuestions(pool: GeneratedPlacementQuestion[], max: number): number[] {
  const byUnit = new Map<string, GeneratedPlacementQuestion[]>();
  for (const q of pool) {
    const u = q.targetUnitCode ?? "?";
    const a = byUnit.get(u) ?? [];
    a.push(q);
    byUnit.set(u, a);
  }
  const unitCodes = Array.from(byUnit.keys()).sort(compareCodes);
  for (const u of unitCodes) shuffle(byUnit.get(u)!);

  const picked: number[] = [];
  let round = 0;
  let added = true;
  while (picked.length < max && added) {
    added = false;
    for (const u of unitCodes) {
      const arr = byUnit.get(u)!;
      if (round < arr.length) {
        picked.push(arr[round].id);
        added = true;
        if (picked.length >= max) break;
      }
    }
    round++;
  }
  return picked;
}

export function nextTestoutQuestionId(
  questionIds: number[],
  answers: TestoutAnswerRec[],
): number | null {
  const answered = new Set(answers.map((a) => a.questionId));
  for (const id of questionIds) if (!answered.has(id)) return id;
  return null;
}

export function toClientQuestion(q: GeneratedPlacementQuestion): TestoutClientQuestion {
  return { id: q.id, prompt: q.prompt, choices: q.choices ?? [], difficulty: q.difficulty };
}

/** Pure MCQ grade — index comparison, free, deterministic. */
export function gradeTestoutMcq(q: GeneratedPlacementQuestion, rawAnswer: number | string): boolean {
  const picked = typeof rawAnswer === "number" ? rawAnswer : parseInt(String(rawAnswer ?? "-1"), 10);
  return typeof q.correctIndex === "number" && picked === q.correctIndex;
}

// ── Adaptive stop logic ─────────────────────────────────────────────────────
export type TestoutDecision =
  | { done: false }
  | { done: true; passed: boolean; scorePct: number; correct: number; asked: number };

/**
 * Decide whether to keep asking or finalize.
 *
 * The exam has a FIXED length N = the number of selected questions (13–20, the
 * start route guarantees ≥ ASK_MIN). The final grade is always taken over N, so
 * `passThreshold = ceil(70% × N)` correct answers. We always ask at least
 * ASK_MIN, then stop EARLY only when the outcome is mathematically locked:
 *   - guaranteed PASS: `correct ≥ passThreshold` (more answers can only help).
 *   - guaranteed FAIL: even all remaining correct can't reach passThreshold
 *     (`correct + remaining < passThreshold`).
 * This can never pass a student who would finish below 70%, nor deny one who
 * could still reach ≥70% — the flaw in the old correct/asked early bands.
 */
export function decideTestoutStep(
  answers: TestoutAnswerRec[],
  questionIds: number[],
  askMin: number,
  askMax: number,
): TestoutDecision {
  const N = Math.min(questionIds.length, askMax); // fixed exam length (13..20)
  const asked = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const remaining = Math.max(0, N - asked);
  const passThreshold = Math.ceil((TESTOUT_PASS_PCT / 100) * N);
  const scorePct = asked > 0 ? Math.round((correct / asked) * 100) : 0;

  // Always ask the minimum first (or the whole exam if it is shorter).
  if (asked < Math.min(askMin, N)) return { done: false };
  // Mathematically locked outcomes (denominator fixed at N).
  if (correct >= passThreshold) {
    return { done: true, passed: true, scorePct, correct, asked };
  }
  if (correct + remaining < passThreshold) {
    return { done: true, passed: false, scorePct, correct, asked };
  }
  // Exam exhausted with no early lock → grade over N.
  if (asked >= N) {
    return { done: true, passed: correct >= passThreshold, scorePct, correct, asked };
  }
  return { done: false };
}

// ── Effects ─────────────────────────────────────────────────────────────────
/**
 * Unlock everything up to AND INCLUDING the tapped target. Additive merge into
 * unlockedLessonCodes; the current pointer lands on the highest unlocked lesson.
 *
 * The unlock set depends on the target kind (derived here from the resolved
 * curriculum, so callers don't have to thread it through):
 *   - lesson target → every lesson code ≤ targetCode.
 *   - lab target    → every lesson in units ≤ the lab's own unit. A lab code
 *     carries a non-numeric 4th segment (Arabic marker) which `compareCodes`
 *     coerces to 0, so a direct `code ≤ labCode` compare would WRONGLY exclude
 *     the lessons in the lab's own unit and leave the lab unreachable
 *     (checkLabGate needs at least one lesson in the lab's unit unlocked).
 * Returns the count of lessons in the unlock set.
 */
export async function applyTestoutPass(opts: {
  userId: number;
  subjectId: string;
  resolved: ResolvedSpecialty;
  targetCode: string;
}): Promise<number> {
  const isLesson = opts.resolved.orderedLessonCodes.includes(opts.targetCode);
  const unlocked = isLesson
    ? opts.resolved.orderedLessonCodes.filter(
        (c) => compareCodes(c, opts.targetCode) <= 0,
      )
    : (() => {
        const targetUnit = unitPrefixOf(opts.targetCode);
        return opts.resolved.orderedLessonCodes.filter(
          (c) => compareCodes(unitPrefixOf(c), targetUnit) <= 0,
        );
      })();
  const nextLessonCode = unlocked.length ? unlocked[unlocked.length - 1] : null;
  await applyUnlockedSnapshot({
    userId: opts.userId,
    subjectId: opts.subjectId,
    unlocked,
    nextLessonCode,
  });
  return unlocked.length;
}

/** Group wrong answers by unit for the failure readout (top 5 weakest). */
export function buildTestoutWeakAreas(
  pool: GeneratedPlacementQuestion[],
  answers: TestoutAnswerRec[],
  unitNames: Record<string, string>,
): TestoutWeakArea[] {
  const qById = new Map(pool.map((q) => [q.id, q] as const));
  const agg = new Map<string, { wrong: number; total: number }>();
  for (const a of answers) {
    const q = qById.get(a.questionId);
    if (!q) continue;
    const u = q.targetUnitCode ?? "?";
    const e = agg.get(u) ?? { wrong: 0, total: 0 };
    e.total++;
    if (!a.correct) e.wrong++;
    agg.set(u, e);
  }
  return Array.from(agg.entries())
    .filter(([, v]) => v.wrong > 0)
    .map(([code, v]) => ({
      unitCode: code,
      unitName: unitNames[code] ?? code,
      wrong: v.wrong,
      total: v.total,
    }))
    .sort((a, b) => b.wrong / b.total - a.wrong / a.total)
    .slice(0, 5);
}

// ── Stage / Level GATE exams (adaptive, generated, FREE) ────────────────────
// A stage exam covers ALL units in the stage; a level exam covers ALL units in
// the level. They reuse every test-out primitive (the same global MCQ pool
// cache, the same adaptive 13–20 / ≥70% engine, the same pure-index grading)
// but differ from a test-out PASS in one critical way: passing a gate exam must
// record a real `v4_exam_attempts(passed=true)` row so the progression engine's
// passed-exam projection opens the gate (a test-out only widens the unlocked
// lesson set and never writes an attempt). The pool cache key is a SCOPE KEY
// ("stage:<code>" / "level:<idx>") which is disjoint from the numeric unit
// codes used by unit test-out, so the two never collide in v4_testout_pools.

/** A gate exam's scope, derived purely from the canonical exam code. */
export type GateExamScope =
  | { scope: "stage"; scopeKey: string; stageCode: string; unitCodes: string[] }
  | { scope: "level"; scopeKey: string; levelIndex: number; unitCodes: string[] };

/**
 * Parse a stage/level exam code ("L.S.exam" / "L.exam") into its gate scope:
 * the disjoint pool cache key + EVERY unit code in that scope (the exam covers
 * them all). Pure over the resolved curriculum — no DB. Returns null for unit
 * exam codes ("L.S.U.exam"), malformed codes, or an empty scope.
 */
export function resolveGateExamScope(
  resolved: ResolvedSpecialty,
  examCode: string,
): GateExamScope | null {
  if (!examCode.endsWith(".exam")) return null;
  const head = examCode.slice(0, -".exam".length);
  if (head.length === 0) return null;
  const segs = head.split(".");
  if (segs.some((s) => !/^\d+$/.test(s))) return null;
  const allUnitCodes = resolved.units.map((u) => u.unitCode);

  if (segs.length === 2) {
    const stageCode = `${segs[0]}.${segs[1]}`;
    const unitCodes = allUnitCodes
      .filter((c) => c.split(".").slice(0, 2).join(".") === stageCode)
      .sort(compareCodes);
    if (unitCodes.length === 0) return null;
    return { scope: "stage", scopeKey: `stage:${stageCode}`, stageCode, unitCodes };
  }
  if (segs.length === 1) {
    const levelIndex = parseInt(segs[0], 10);
    const unitCodes = allUnitCodes
      .filter((c) => (parseInt(c.split(".")[0] ?? "0", 10) || 0) === levelIndex)
      .sort(compareCodes);
    if (unitCodes.length === 0) return null;
    return { scope: "level", scopeKey: `level:${levelIndex}`, levelIndex, unitCodes };
  }
  return null;
}

export type GateExamPoolResult = TestoutPool & {
  /** Units whose generation THREW (provider outage) — >0 ⇒ retry, never auto-pass. */
  failedUnits: number;
  attemptedUnits: number;
  /** True when served straight from the cache (diagnostics then don't apply). */
  fromCache: boolean;
};

const inflightGatePools = new Map<string, Promise<GateExamPoolResult>>();

/**
 * Read-or-generate the GLOBAL question pool for a stage/level gate scope, cached
 * in v4_testout_pools under the disjoint scope key. Mirrors getOrCreateTestoutPool
 * but with one safety difference: a pool DEGRADED by a provider outage (some
 * units failed AND the total is below the runnable floor) is NEVER persisted, so
 * a transient Gemini failure can't permanently brick the gate into auto-clear.
 * A cleanly-generated thin pool (no failures) IS cached — its thinness is a
 * genuine property of the content.
 */
export async function getOrCreateGateExamPool(opts: {
  versionId: number;
  scopeKey: string;
  unitCodes: string[];
}): Promise<GateExamPoolResult> {
  const cached = await loadTestoutPool(opts.versionId, opts.scopeKey);
  if (cached && cached.questions.length > 0) {
    return { ...cached, failedUnits: 0, attemptedUnits: 0, fromCache: true };
  }

  const key = `${opts.versionId}:${opts.scopeKey}`;
  const existing = inflightGatePools.get(key);
  if (existing) return existing;

  const p = (async (): Promise<GateExamPoolResult> => {
    const sampled = evenSampleCodes(opts.unitCodes, TESTOUT_SAMPLE_UNITS);
    const perUnit = Math.min(
      13,
      Math.max(3, Math.ceil(TESTOUT_TARGET_POOL / Math.max(1, sampled.length))),
    );
    const gen = await generateUnitQuestionPool({
      versionId: opts.versionId,
      unitCodes: sampled,
      perUnit,
    });
    const failedUnits = gen.failedUnits ?? 0;
    const attemptedUnits = gen.attemptedUnits ?? sampled.length;
    const runnable = gen.questions.length >= TESTOUT_MIN_RUNNABLE;
    const cleanThin = failedUnits === 0; // generation fully succeeded → thinness is genuine
    // Persist ONLY a runnable pool OR a cleanly-generated (no-outage) pool. A
    // partial-outage thin pool is left uncached so the next attempt retries.
    if (gen.questions.length > 0 && (runnable || cleanThin)) {
      try {
        await db
          .insert(v4TestoutPoolsTable)
          .values({
            versionId: opts.versionId,
            targetUnitCode: opts.scopeKey,
            prereqUnitCodes: opts.unitCodes as any,
            questions: gen.questions as any,
            unitNames: gen.unitNames as any,
          })
          .onConflictDoNothing({
            target: [v4TestoutPoolsTable.versionId, v4TestoutPoolsTable.targetUnitCode],
          });
      } catch (e) {
        logger.warn?.(`[v4-gate-exam] pool persist failed ${key}: ${String((e as any)?.message ?? e)}`);
      }
      const persisted = await loadTestoutPool(opts.versionId, opts.scopeKey);
      if (persisted && persisted.questions.length > 0) {
        return { ...persisted, failedUnits, attemptedUnits, fromCache: false };
      }
    }
    return { questions: gen.questions, unitNames: gen.unitNames, failedUnits, attemptedUnits, fromCache: false };
  })();

  inflightGatePools.set(key, p);
  try {
    return await p;
  } finally {
    inflightGatePools.delete(key);
  }
}

/**
 * Effect of passing a stage/level gate exam:
 *   1. Record a real passing v4_exam_attempts row (FREE — gemsDeducted=0,
 *      variantIndex=0 marks a generated/adaptive exam). This is what opens the
 *      gate in the progression engine's passed-exam projection.
 *   2. Recompute the unlock snapshot from FRESH passed-exam state (the attempt
 *      above is already persisted) and merge it into v4_student_paths.
 * Returns the post-pass unlock counts for the result payload.
 */
export async function applyGateExamPass(opts: {
  userId: number;
  subjectId: string;
  versionId: number;
  scope: "stage" | "level";
  scopeRefId: number;
  examCode: string;
  scorePct: number;
  existingUnlocked: string[];
}): Promise<{ unlockedCount: number; newlyUnlocked: string[]; nextLessonCode: string | null }> {
  // Attempt-idempotency: a gate can be re-finalized (an auto-clear start after a
  // pass, a retried request, or two concurrent finalizations). The unlock
  // snapshot below is union-only and safe to re-apply, but inserting another
  // passing row each time pollutes the attempt audit/count. Only record the
  // FIRST passing attempt for this (user, subject, version, scope, scopeRef);
  // subsequent passes just re-assert the (idempotent) unlock snapshot.
  const [already] = await db
    .select({ id: v4ExamAttemptsTable.id })
    .from(v4ExamAttemptsTable)
    .where(and(
      eq(v4ExamAttemptsTable.userId, opts.userId),
      eq(v4ExamAttemptsTable.subjectId, opts.subjectId),
      eq(v4ExamAttemptsTable.versionId, opts.versionId),
      eq(v4ExamAttemptsTable.scope, opts.scope),
      eq(v4ExamAttemptsTable.scopeRefId, opts.scopeRefId),
      eq(v4ExamAttemptsTable.passed, true),
    ))
    .limit(1);
  if (!already) {
    await db.insert(v4ExamAttemptsTable).values({
      userId: opts.userId,
      versionId: opts.versionId,
      subjectId: opts.subjectId,
      scope: opts.scope,
      examCode: opts.examCode,
      scopeRefId: opts.scopeRefId,
      variantIndex: 0,
      answers: [] as any,
      score: Math.max(0, Math.min(100, Math.round(opts.scorePct))),
      passed: true,
      gemsDeducted: 0,
      requestId: null,
    });
  }
  const snap = await recomputeUnlockSnapshot({
    versionId: opts.versionId,
    userId: opts.userId,
    existingUnlocked: opts.existingUnlocked,
  });
  await applyUnlockedSnapshot({
    userId: opts.userId,
    subjectId: opts.subjectId,
    unlocked: snap.unlocked,
    nextLessonCode: snap.nextLessonCode,
  });
  return {
    unlockedCount: snap.unlocked.length,
    newlyUnlocked: snap.newlyUnlocked,
    nextLessonCode: snap.nextLessonCode,
  };
}
