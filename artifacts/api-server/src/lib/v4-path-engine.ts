/**
 * v4-path-engine.ts — Custom-path setup engine (task #3).
 *
 * Glues together the four moving parts of the custom-path flow:
 *
 *   1. resolveActiveSpecialty   — only specialties whose active instruction
 *                                 file has been published are choosable.
 *   2. computeUnlockedLessons   — for a chosen starting level N, return the
 *                                 complete list of lesson codes in levels
 *                                 1..N (so the Duolingo-style map shipping
 *                                 in task #4 lights them up immediately).
 *   3. createOrReplaceStudentPath — atomic upsert of the per-user enrollment
 *                                 row + welcome-gift wallet bootstrap via
 *                                 v4-gem-wallet (idempotent — task #2 owns
 *                                 the +100 one-shot semantics).
 *   4. gradePlacementAnswer     — MCQ comparison is free + deterministic;
 *                                 short_answer / practical kinds route to
 *                                 Anthropic Haiku via OpenRouter (same
 *                                 single billable channel the rest of the
 *                                 app uses, openrouter-generate.ts).
 *
 * The 5-question diagnostic itself does NOT live here — questions are a
 * fixed Arabic list, owned by the routes layer, and the conversation does
 * NOT spend an AI call (cost is absorbed by the welcome gift, per
 * "constraint: التشخيصية لا تُخصم منها جواهر"). The placement test cost
 * IS chargeable; see route handler for the `chargeV4Ai` integration.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  v4SpecialtiesTable,
  v4InstructionFileVersionsTable,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  v4LessonsTable,
  v4LabScenariosTable,
  v4LabCompletionsTable,
  v4ConceptMasteryTable,
  v4ExamAttemptsTable,
  v4PlacementTestQuestionsTable,
  v4StudentPathsTable,
  type V4StudentPath,
  type V4Specialty,
  type V4PlacementTestQuestion,
} from "@workspace/db";
import { inArray } from "drizzle-orm";
import { logger } from "./logger";
import { getOrCreateV4Wallet } from "./v4-gem-wallet";
import { generateGeminiJson } from "./openrouter-generate";

// OpenRouter model id — `generateGemini` passes a `/`-containing model
// through `toOpenRouterModel` unchanged, so this routes to Anthropic.
const HAIKU_MODEL = "anthropic/claude-3-5-haiku";

/** Fixed Arabic diagnostic prompts. Exactly 5, in conversation order. */
export const V4_DIAGNOSTIC_QUESTIONS: readonly string[] = [
  "أهلاً بك في نُخبة. أول سؤال: شو طموحك من دراسة هذا التخصص؟ (مثلاً: شغل، تخرّج، فضول، مشروع)",
  "وين تشوف مستواك حالياً في الموضوع؟ مبتدئ تماماً، عندك خلفية بسيطة، أو متوسّط؟",
  "شو أكثر شي حسّيته صعب في تجارب التعلّم السابقة؟ (مثلاً: التركيز، الفهم، الوقت، الحفظ)",
  "كم وقت تقدر تخصّص للدراسة كل أسبوع؟ ساعة، ساعتين، أكثر؟",
  "أي شي إضافي تحب أعرفه عشان أساعدك أحسن؟ (اختياري — اكتب «لا شي» إذا ما عندك)",
];

export type DiagnosticAnswer = { question: string; answer: string };

// ── Specialty + lesson lookups ──────────────────────────────────────────────

export type ResolvedSpecialty = {
  specialty: V4Specialty;
  versionId: number;
  /** Per-level ordered list of every lesson code in that level. */
  levelLessonCodes: string[][];
};

/**
 * Load a specialty by slug AND only return it if it has a currently-active
 * (published) instruction file. Specialties without a published file are
 * NOT choosable — surface that to the FE as `available: false`.
 */
export async function resolveActiveSpecialty(slug: string): Promise<ResolvedSpecialty | null> {
  const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, slug));
  if (!sp) return null;
  if (!sp.activeInstructionVersionId) return null;

  // Sanity-check the active version row still exists and is published.
  const [ver] = await db
    .select()
    .from(v4InstructionFileVersionsTable)
    .where(eq(v4InstructionFileVersionsTable.id, sp.activeInstructionVersionId));
  if (!ver || ver.status !== "published") return null;

  // Fetch all (level, lesson) pairs for this version in one query, group in JS.
  const levels = await db
    .select({ id: v4LevelsTable.id, levelIndex: v4LevelsTable.levelIndex })
    .from(v4LevelsTable)
    .where(eq(v4LevelsTable.versionId, ver.id))
    .orderBy(asc(v4LevelsTable.levelIndex));
  const lessons = await db
    .select({
      code: v4LessonsTable.code,
      lessonIndex: v4LessonsTable.lessonIndex,
      unitId: v4LessonsTable.unitId,
    })
    .from(v4LessonsTable)
    .where(eq(v4LessonsTable.versionId, ver.id))
    .orderBy(asc(v4LessonsTable.code));

  // Build "level i → lesson codes whose first dotted segment === i"
  // (canonical numbering L.S.U.Lesson is documented on v4_lessons.code).
  const byLevel: string[][] = [];
  for (const lvl of levels) {
    const codes = lessons
      .filter((l: any) => parseInt(String(l.code).split(".")[0] || "0", 10) === lvl.levelIndex)
      .map((l: any) => l.code as string);
    byLevel.push(codes);
  }

  return { specialty: sp, versionId: ver.id, levelLessonCodes: byLevel };
}

/**
 * Compute the unlocked-lesson snapshot for a chosen starting level.
 *
 *   startMode='from_zero' → unlock ONLY the very first lesson (1.1.1.1
 *                           or whatever the lowest code is).
 *   startMode='placement' → unlock every lesson in levels 1..startingLevel.
 *
 * The "current lesson" pointer is set to the FIRST lesson in the starting
 * level (so the student opens the map and the teacher session jumps
 * straight to that lesson in task #5).
 */
export function computeUnlocked(
  resolved: ResolvedSpecialty,
  startMode: "from_zero" | "placement",
  startingLevelIndex: number,
): { unlocked: string[]; currentLessonCode: string | null } {
  const all = resolved.levelLessonCodes.flat();
  if (all.length === 0) return { unlocked: [], currentLessonCode: null };

  if (startMode === "from_zero") {
    return { unlocked: [all[0]], currentLessonCode: all[0] };
  }

  // placement: unlock through end of `startingLevelIndex`.
  const clampedLevel = Math.max(1, Math.min(startingLevelIndex, resolved.levelLessonCodes.length));
  const unlocked = resolved.levelLessonCodes.slice(0, clampedLevel).flat();
  // current = first lesson IN the starting level (where teacher should pick
  // them up), not the very first overall.
  const currentLevelLessons = resolved.levelLessonCodes[clampedLevel - 1] ?? [];
  const current = currentLevelLessons[0] ?? unlocked[0] ?? null;
  return { unlocked, currentLessonCode: current };
}

/**
 * Idempotent enrollment write. If a row already exists for (userId,
 * subjectId) it is OVERWRITTEN — the latest setup attempt wins. The
 * accompanying welcome-gift wallet creation is delegated to
 * `getOrCreateV4Wallet`, which is itself idempotent on (userId, subjectId).
 */
export async function createOrReplaceStudentPath(opts: {
  userId: number;
  subjectSlug: string;
  resolved: ResolvedSpecialty;
  pathType: "custom" | "booklet";
  startMode: "from_zero" | "placement";
  startingLevelIndex: number;
}): Promise<V4StudentPath> {
  const { unlocked, currentLessonCode } = computeUnlocked(
    opts.resolved,
    opts.startMode,
    opts.startingLevelIndex,
  );

  // Welcome-gift / wallet bootstrap. Best-effort: a wallet failure must not
  // block path setup (mirrors the legacy approve-flow pattern in task #2).
  try {
    await getOrCreateV4Wallet(opts.userId, opts.subjectSlug);
  } catch (e) {
    logger.warn?.(
      `[v4-path] welcome-gift wallet bootstrap failed user=${opts.userId} subject=${opts.subjectSlug}: ${String((e as any)?.message ?? e)}`,
    );
  }

  // Upsert via DELETE+INSERT inside one statement window — drizzle's
  // onConflictDoUpdate handles this cleanly because we have a unique index
  // on (user_id, subject_id).
  const now = new Date();
  const [row] = await db
    .insert(v4StudentPathsTable)
    .values({
      userId: opts.userId,
      subjectId: opts.subjectSlug,
      versionId: opts.resolved.versionId,
      pathType: opts.pathType,
      startMode: opts.startMode,
      startingLevelIndex: opts.startingLevelIndex,
      currentLessonCode,
      unlockedLessonCodes: unlocked,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [v4StudentPathsTable.userId, v4StudentPathsTable.subjectId],
      set: {
        versionId: opts.resolved.versionId,
        pathType: opts.pathType,
        startMode: opts.startMode,
        startingLevelIndex: opts.startingLevelIndex,
        currentLessonCode,
        unlockedLessonCodes: unlocked,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export async function getStudentPath(userId: number, subjectSlug: string): Promise<V4StudentPath | null> {
  const [row] = await db
    .select()
    .from(v4StudentPathsTable)
    .where(and(
      eq(v4StudentPathsTable.userId, userId),
      eq(v4StudentPathsTable.subjectId, subjectSlug),
    ));
  return row ?? null;
}

/**
 * Lazy-migrate a student path to the currently-active instruction version.
 *
 * Why: when the admin publishes a new instruction version, the specialty's
 * `active_instruction_version_id` flips, but every existing student row in
 * `v4_student_paths` is still pinned to the OLD `versionId`. That means the
 * map/lesson pages keep reading the old content forever — defeating the
 * whole point of "admin publishes → all students see the new content".
 *
 * Behavior:
 *   - If the student path is already on the active version → no-op.
 *   - Otherwise: recompute unlocked codes against the new version using the
 *     student's original startMode + startingLevelIndex, UNION with any
 *     previously-unlocked codes that still exist in the new version (so
 *     progress doesn't disappear when the admin keeps the same numbering).
 *     Preserve `currentLessonCode` if it still exists, otherwise reset to
 *     the first unlocked code in the starting level.
 *   - Atomically UPDATE the row to the active version + new unlock set.
 *
 * Safe to call on every map/teach/lab read — when nothing changed it just
 * returns the same row without touching the DB.
 */
export async function syncStudentPathToActiveVersion(
  studentPath: V4StudentPath,
  resolved: ResolvedSpecialty,
): Promise<V4StudentPath> {
  if (studentPath.versionId === resolved.versionId) return studentPath;
  const oldVersionId = studentPath.versionId;
  const newVersionId = resolved.versionId;

  const startMode = (studentPath.startMode === "placement" ? "placement" : "from_zero") as
    "from_zero" | "placement";
  const { unlocked: recomputed, currentLessonCode: recomputedCurrent } = computeUnlocked(
    resolved,
    startMode,
    studentPath.startingLevelIndex ?? 1,
  );

  const allNewCodes = new Set<string>(resolved.levelLessonCodes.flat());
  const prevUnlocked = Array.isArray(studentPath.unlockedLessonCodes)
    ? (studentPath.unlockedLessonCodes as string[])
    : [];
  // Preserve any code the student had already unlocked, as long as the new
  // version still contains that exact code (numbering preserved across
  // edits is the standard admin workflow per the v4 spec).
  const preserved = prevUnlocked.filter((c) => allNewCodes.has(c));
  const mergedUnlocked = Array.from(new Set([...recomputed, ...preserved]));

  // Preserve currentLessonCode if still present; otherwise prefer the
  // highest preserved code (so a renumber doesn't kick the student back
  // to the start), and fall back to the new starting-level first code.
  let currentCode: string | null = null;
  if (studentPath.currentLessonCode && allNewCodes.has(studentPath.currentLessonCode)) {
    currentCode = studentPath.currentLessonCode;
  } else if (preserved.length > 0) {
    currentCode = [...preserved].sort().pop() ?? recomputedCurrent;
  } else {
    currentCode = recomputedCurrent;
  }

  // Atomic migration: CAS guard on version_id + remap of all progress rows
  // that point at the OLD version's lesson/lab/exam IDs. We resolve every
  // ID-by-code mapping inside the transaction so a concurrent re-publish
  // doesn't strand half the rows.
  const result = await db.transaction(async (tx) => {
    // CAS: only the writer that sees the row still on oldVersionId wins.
    // A losing writer (concurrent caller already migrated) returns no rows
    // and we just re-read the now-current state below.
    const [casUpdated] = await tx
      .update(v4StudentPathsTable)
      .set({
        versionId: newVersionId,
        unlockedLessonCodes: mergedUnlocked,
        currentLessonCode: currentCode,
        updatedAt: new Date(),
      })
      .where(and(
        eq(v4StudentPathsTable.userId, studentPath.userId),
        eq(v4StudentPathsTable.subjectId, studentPath.subjectId),
        eq(v4StudentPathsTable.versionId, oldVersionId),
      ))
      .returning();

    if (!casUpdated) {
      // Someone else already migrated — read the winning row and bail.
      const [fresh] = await tx
        .select()
        .from(v4StudentPathsTable)
        .where(and(
          eq(v4StudentPathsTable.userId, studentPath.userId),
          eq(v4StudentPathsTable.subjectId, studentPath.subjectId),
        ));
      return { row: fresh ?? studentPath, casLost: true };
    }

    // ── Remap lesson-keyed progress (concept mastery) ──────────────────
    // Lessons share canonical codes across versions, so we can re-key
    // mastery rows from old.lessonId → new.lessonId by joining via code.
    const oldLessons = await tx
      .select({ id: v4LessonsTable.id, code: v4LessonsTable.code })
      .from(v4LessonsTable)
      .where(eq(v4LessonsTable.versionId, oldVersionId));
    const newLessons = await tx
      .select({ id: v4LessonsTable.id, code: v4LessonsTable.code })
      .from(v4LessonsTable)
      .where(eq(v4LessonsTable.versionId, newVersionId));
    const newLessonIdByCode = new Map(newLessons.map(l => [l.code, l.id]));
    const oldLessonIds = oldLessons.map(l => l.id);

    let remappedMastery = 0;
    if (oldLessonIds.length) {
      const mastery = await tx
        .select()
        .from(v4ConceptMasteryTable)
        .where(and(
          eq(v4ConceptMasteryTable.userId, studentPath.userId),
          inArray(v4ConceptMasteryTable.lessonId, oldLessonIds),
        ));
      for (const m of mastery) {
        const code = oldLessons.find(l => l.id === m.lessonId)?.code;
        const newId = code ? newLessonIdByCode.get(code) : undefined;
        if (!newId) continue;
        // ON CONFLICT (user, lesson, concept_index): keep the higher score.
        // We do this with a manual upsert because Drizzle's onConflict
        // helper doesn't easily express the MAX() merge.
        await tx.execute(sql`
          INSERT INTO v4_concept_mastery (user_id, lesson_id, concept_index, score, updated_at)
          VALUES (${m.userId}, ${newId}, ${m.conceptIndex}, ${m.score}, NOW())
          ON CONFLICT (user_id, lesson_id, concept_index)
          DO UPDATE SET score = GREATEST(v4_concept_mastery.score, EXCLUDED.score),
                        updated_at = NOW()
        `);
        remappedMastery += 1;
      }
    }

    // ── Remap lab completions ─────────────────────────────────────────
    const oldLabs = await tx
      .select({ id: v4LabScenariosTable.id, code: v4LabScenariosTable.code })
      .from(v4LabScenariosTable)
      .where(eq(v4LabScenariosTable.versionId, oldVersionId));
    const newLabs = await tx
      .select({ id: v4LabScenariosTable.id, code: v4LabScenariosTable.code })
      .from(v4LabScenariosTable)
      .where(eq(v4LabScenariosTable.versionId, newVersionId));
    const newLabIdByCode = new Map(newLabs.map(l => [l.code, l.id]));

    let remappedLabs = 0;
    if (oldLabs.length) {
      const completions = await tx
        .select()
        .from(v4LabCompletionsTable)
        .where(and(
          eq(v4LabCompletionsTable.userId, studentPath.userId),
          inArray(v4LabCompletionsTable.labId, oldLabs.map(l => l.id)),
        ));
      for (const c of completions) {
        const code = oldLabs.find(l => l.id === c.labId)?.code;
        const newId = code ? newLabIdByCode.get(code) : undefined;
        if (!newId) continue;
        // ON CONFLICT (user, lab): keep the higher score + sum attempts.
        await tx.execute(sql`
          INSERT INTO v4_lab_completions
            (user_id, lab_id, version_id, subject_id, score, passed, evaluator_log, attempts, completed_at)
          VALUES
            (${c.userId}, ${newId}, ${newVersionId}, ${c.subjectId},
             ${c.score}, ${c.passed}, ${JSON.stringify(c.evaluatorLog)}::jsonb,
             ${c.attempts}, ${c.completedAt})
          ON CONFLICT (user_id, lab_id)
          DO UPDATE SET
            version_id = ${newVersionId},
            score = GREATEST(v4_lab_completions.score, EXCLUDED.score),
            passed = v4_lab_completions.passed OR EXCLUDED.passed,
            attempts = v4_lab_completions.attempts + EXCLUDED.attempts
        `);
        remappedLabs += 1;
      }
    }

    // ── Remap exam attempts ───────────────────────────────────────────
    // Append-only rows — repoint scopeRefId from the old unit/stage/level
    // row to the new version's equivalent by canonical key:
    //   scope=unit   key = unit.code  ("L.S.U")
    //   scope=stage  key = stage.code ("L.S")
    //   scope=level  key = level.levelIndex (levels have no code column)
    // The attempt already carries `examCode` (e.g. "1.3.5.exam"), so we
    // derive the scope key by stripping ".exam" — no need to look up the
    // old scopeRefId at all, which sidesteps deleted-old-row edge cases.
    const [newUnits, newStages, newLevels] = await Promise.all([
      tx.select({ id: v4UnitsTable.id, code: v4UnitsTable.code })
        .from(v4UnitsTable).where(eq(v4UnitsTable.versionId, newVersionId)),
      tx.select({ id: v4StagesTable.id, code: v4StagesTable.code })
        .from(v4StagesTable).where(eq(v4StagesTable.versionId, newVersionId)),
      tx.select({ id: v4LevelsTable.id, levelIndex: v4LevelsTable.levelIndex })
        .from(v4LevelsTable).where(eq(v4LevelsTable.versionId, newVersionId)),
    ]);
    const newUnitByCode = new Map(newUnits.map(u => [u.code, u.id]));
    const newStageByCode = new Map(newStages.map(s => [s.code, s.id]));
    const newLevelByIndex = new Map(newLevels.map(l => [String(l.levelIndex), l.id]));

    const attempts = await tx
      .select()
      .from(v4ExamAttemptsTable)
      .where(and(
        eq(v4ExamAttemptsTable.userId, studentPath.userId),
        eq(v4ExamAttemptsTable.versionId, oldVersionId),
      ));
    let remappedExams = 0;
    let skippedExams = 0;
    for (const a of attempts) {
      const key = a.examCode.endsWith(".exam") ? a.examCode.slice(0, -".exam".length) : a.examCode;
      let newRef: number | undefined;
      if (a.scope === "unit") newRef = newUnitByCode.get(key);
      else if (a.scope === "stage") newRef = newStageByCode.get(key);
      else if (a.scope === "level") newRef = newLevelByIndex.get(key);
      if (!newRef) { skippedExams += 1; continue; }
      await tx
        .update(v4ExamAttemptsTable)
        .set({ versionId: newVersionId, scopeRefId: newRef })
        .where(eq(v4ExamAttemptsTable.id, a.id));
      remappedExams += 1;
    }
    if (skippedExams > 0) {
      logger.warn?.(
        `[v4-path] migration: ${skippedExams} exam attempt(s) for user=${studentPath.userId} ` +
        `subject=${studentPath.subjectId} had no matching scope in new version ${newVersionId}`,
      );
    }

    logger.info?.(
      `[v4-path] migrated student=${studentPath.userId} subject=${studentPath.subjectId} ` +
      `${oldVersionId}→${newVersionId} ` +
      `(unlocked=${mergedUnlocked.length}, current=${currentCode ?? "—"}, ` +
      `remapped: mastery=${remappedMastery} labs=${remappedLabs} exams=${remappedExams})`,
    );
    return { row: casUpdated, casLost: false };
  });

  return result.row;
}

// ── Placement-test selection + grading ──────────────────────────────────────

/**
 * Adaptive selector — pick the NEXT placement question.
 *
 * Strategy (the "stop on 2 consecutive fails" rule from the task spec):
 *   - We process levels 1..5 in order, drawing the easiest unanswered
 *     question for the current level. Once the student answers at least
 *     ONE question in a level correctly, we move on. Two consecutive
 *     wrong answers anywhere → stop and finalize.
 *   - The caller passes `answered`: an array of {questionId, correct}
 *     decisions. This function is stateless; the route owns the array.
 */
export type PlacementAnswered = { questionId: number; targetLevelIndex: number; correct: boolean };

export type PlacementDecision =
  | { kind: "ask"; question: V4PlacementTestQuestion }
  | { kind: "finalize"; startingLevelIndex: number; reason: "two_consecutive_fails" | "exhausted" };

export async function pickNextPlacementQuestion(
  versionId: number,
  answered: PlacementAnswered[],
): Promise<PlacementDecision> {
  // Stop on two consecutive failures (the explicit task #3 rule).
  if (answered.length >= 2) {
    const lastTwo = answered.slice(-2);
    if (lastTwo.every((a) => !a.correct)) {
      return { kind: "finalize", startingLevelIndex: computeStartingLevel(answered), reason: "two_consecutive_fails" };
    }
  }

  // Determine the level to draw from next.
  // - If we've never asked, start at level 1.
  // - If the student just got a level-N question correct, advance to level N+1
  //   (cap at the table's max level).
  // - Otherwise re-draw at the current level.
  const lastAnswered = answered[answered.length - 1];
  let targetLevel = 1;
  if (lastAnswered) {
    targetLevel = lastAnswered.correct
      ? lastAnswered.targetLevelIndex + 1
      : lastAnswered.targetLevelIndex;
  }

  // Cap at 5 (specs hard-code 5 levels per specialty).
  if (targetLevel > 5) {
    return { kind: "finalize", startingLevelIndex: computeStartingLevel(answered), reason: "exhausted" };
  }

  const askedIds = new Set(answered.map((a) => a.questionId));
  const candidates = await db
    .select()
    .from(v4PlacementTestQuestionsTable)
    .where(and(
      eq(v4PlacementTestQuestionsTable.versionId, versionId),
      eq(v4PlacementTestQuestionsTable.targetLevelIndex, targetLevel),
    ))
    .orderBy(asc(v4PlacementTestQuestionsTable.difficulty), asc(v4PlacementTestQuestionsTable.questionIndex));

  const next = candidates.find((q: any) => !askedIds.has(q.id));
  if (!next) {
    // No more questions at this level — treat as "exhausted" and finalize.
    return { kind: "finalize", startingLevelIndex: computeStartingLevel(answered), reason: "exhausted" };
  }
  return { kind: "ask", question: next };
}

/**
 * Highest level where the student got at least one question correct.
 * Defaults to 1 (everyone starts at level 1 — "from zero" is a separate
 * branch handled by the choice screen, NOT by the placement engine).
 */
export function computeStartingLevel(answered: PlacementAnswered[]): number {
  let best = 1;
  for (const a of answered) {
    if (a.correct && a.targetLevelIndex > best) best = a.targetLevelIndex;
  }
  return best;
}

/**
 * Grade a single placement answer.
 *
 *   - MCQ with a known correctIndex → deterministic comparison (free).
 *   - Anything else (short_answer / practical) → Haiku-as-grader.
 *
 * Haiku failures fall through to a permissive `false` grade and the route
 * surfaces a friendly toast — we never want a network glitch to permanently
 * fail a student's placement attempt.
 */
export async function gradePlacementAnswer(opts: {
  question: V4PlacementTestQuestion;
  rawAnswer: string | number | null;
}): Promise<{ correct: boolean; rationale?: string }> {
  const q = opts.question;
  if (q.kind === "mcq" && typeof q.correctIndex === "number") {
    const picked = typeof opts.rawAnswer === "number"
      ? opts.rawAnswer
      : parseInt(String(opts.rawAnswer ?? "-1"), 10);
    return { correct: picked === q.correctIndex };
  }

  // Free-form grading via Haiku.
  const answerText = String(opts.rawAnswer ?? "").trim();
  if (!answerText) return { correct: false, rationale: "empty_answer" };

  const sys =
    "أنت مصحّح اختبارات تعليمية. ستحصل على سؤال وجواب الطالب. " +
    "أعد JSON صرف بالشكل {\"correct\": boolean, \"rationale\": string}. " +
    "rationale جملة قصيرة جداً بالعربية تشرح القرار.";
  const user = `السؤال: ${q.prompt}\n\nجواب الطالب: ${answerText}\n\nهل الجواب صحيح من حيث الجوهر؟`;

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: HAIKU_MODEL,
      temperature: 0,
      maxOutputTokens: 200,
      timeoutMs: 15_000,
      logTag: "v4-placement-grade",
    });
    const parsed = JSON.parse(res.text || "{}");
    return {
      correct: Boolean(parsed.correct),
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
    };
  } catch (e) {
    logger.warn?.(`[v4-placement] grader failed q=${q.id}: ${String((e as any)?.message ?? e)}`);
    return { correct: false, rationale: "grader_unavailable" };
  }
}
