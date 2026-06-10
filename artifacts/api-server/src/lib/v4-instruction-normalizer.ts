// ─────────────────────────────────────────────────────────────────────────────
// Normalize a validated v4 instruction file into the hierarchical DB tables.
//
// Contract:
//   - Caller must pass a JSON that already passed `validateV4InstructionFile`
//     with `ok: true` (we still re-validate inside for safety).
//   - Runs inside a single Postgres transaction — partial publishes are
//     impossible. Either the new version + every child row commits, or
//     nothing changes.
//   - Returns the newly-inserted `instruction_file_versions.id` so callers
//     can update `specialties.active_instruction_version_id` to switch the
//     live version atomically.
//
// We do NOT delete or modify prior versions. The append-only history is the
// rollback mechanism. The "active" pointer on `specialties` is the only
// mutable surface.
//
// Performance: a full per-specialty file (5 levels × 7 stages × 9 units × 10
// lessons + labs + exam banks) expands to tens of thousands of rows. We do
// NOT insert them one-at-a-time — that is tens of thousands of sequential DB
// round-trips inside one transaction and reliably times out the HTTP request.
// Instead each table is bulk-inserted in chunks, and parent→child foreign
// keys are wired by *natural key* (level_index / code) read back from a
// chunked `RETURNING`, so we never depend on Postgres preserving row order.
// ─────────────────────────────────────────────────────────────────────────────
import { db } from "@workspace/db";
import {
  v4SpecialtiesTable,
  v4InstructionFileVersionsTable,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4LabScenariosTable,
  v4LabQuestionsTable,
  v4ExamQuestionsTable,
  v4PlacementTestQuestionsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  validateV4InstructionFile,
  type V4ValidationReport,
} from "./v4-instruction-validator";
import type { V4InstructionFileJson } from "@workspace/db";

export type PublishResult = {
  versionId: number;
  version: number;
  specialtyId: number;
  summary: V4ValidationReport["summary"];
};

export type PublishProgress = {
  phase: string;
  /** Count of rows or items being inserted in this phase. */
  count?: number;
  /** Human-readable label for the phase. */
  label?: string;
};

// Rows per INSERT statement. Postgres caps bound parameters at 65535; our
// widest table (lessons / exam questions) is ~16 columns, so 500 rows ≈ 8000
// params — comfortably under the limit with room for wider rows.
const INSERT_CHUNK = 500;

/** Bulk-insert `rows` in chunks. No-op for an empty list. */
async function chunkedInsert(tx: any, table: any, rows: any[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await tx.insert(table).values(rows.slice(i, i + INSERT_CHUNK));
  }
}

/** Bulk-insert `rows` in chunks, returning the requested columns from every
 *  chunk concatenated. Used to read back generated ids + a natural key so we
 *  can build a `key → id` map without depending on RETURNING row order. */
async function chunkedInsertReturning(
  tx: any,
  table: any,
  rows: any[],
  returning: any,
): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const r = await tx
      .insert(table)
      .values(rows.slice(i, i + INSERT_CHUNK))
      .returning(returning);
    out.push(...r);
  }
  return out;
}

/**
 * Find-or-create a specialty by slug from the JSON's `specialty.slug`,
 * keeping `name` / `description` / `icon` in sync with whatever the latest
 * publish supplies. Returns the specialty's numeric id.
 *
 * Runs inside the caller's transaction (uses the provided `tx`).
 */
async function upsertSpecialty(
  tx: typeof db,
  meta: V4InstructionFileJson["specialty"],
): Promise<number> {
  const existing = await tx
    .select()
    .from(v4SpecialtiesTable)
    .where(eq(v4SpecialtiesTable.slug, meta.slug))
    .limit(1);

  // v4.1 — bundle the new specialty-level fields into the `meta` JSONB.
  // Each field is optional; we omit absent keys so v4.0 files keep `{}`.
  const specialtyMeta: Record<string, unknown> = {};
  for (const k of [
    "target_persona",
    "teacher_tone",
    "yemeni_examples",
    "glossary",
    "allowed_viz_templates",
    "allowed_tools",
  ] as const) {
    const v = (meta as any)[k];
    if (v !== undefined) specialtyMeta[k] = v;
  }

  if (existing.length > 0) {
    await tx
      .update(v4SpecialtiesTable)
      .set({
        name: meta.name,
        description: meta.description ?? existing[0].description,
        icon: meta.icon ?? existing[0].icon,
        meta: specialtyMeta as any,
        updatedAt: new Date(),
      })
      .where(eq(v4SpecialtiesTable.id, existing[0].id));
    return existing[0].id;
  }

  const [inserted] = await tx
    .insert(v4SpecialtiesTable)
    .values({
      slug: meta.slug,
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      meta: specialtyMeta as any,
    })
    .returning({ id: v4SpecialtiesTable.id });
  return inserted.id;
}

/** Helper — copy a list of optional keys from `src` into a fresh object,
 *  skipping `undefined`. Used to build per-row `meta` JSONB blobs without
 *  polluting v4.0 rows with empty keys. */
function pickMeta(src: any, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = src?.[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Pick the next version number for a specialty (max(version) + 1, or 1
 * if no prior versions exist).
 */
async function nextVersion(tx: typeof db, specialtyId: number): Promise<number> {
  const last = await tx
    .select({ version: v4InstructionFileVersionsTable.version })
    .from(v4InstructionFileVersionsTable)
    .where(eq(v4InstructionFileVersionsTable.specialtyId, specialtyId))
    .orderBy(desc(v4InstructionFileVersionsTable.version))
    .limit(1);
  return (last[0]?.version ?? 0) + 1;
}

/**
 * Publish a new instruction-file version for the specialty implied by the
 * JSON's `specialty.slug`. Activates the new version atomically.
 *
 * Throws on invalid input (the route layer maps this to a 400 with the
 * validation report attached).
 */
export async function publishV4InstructionFile(
  rawJson: unknown,
  publishedByUserId: number | null,
  onProgress?: (p: PublishProgress) => void,
): Promise<PublishResult> {
  const report = validateV4InstructionFile(rawJson);
  if (!report.ok || !report.parsed) {
    const errorCount = report.issues.filter((i) => i.severity === "error").length;
    const e: any = new Error(`v4 instruction file failed validation (${errorCount} errors)`);
    e.report = report;
    throw e;
  }

  const parsed = report.parsed;

  return await db.transaction(async (tx: any) => {
    const specialtyId = await upsertSpecialty(tx, parsed.specialty);
    const version = await nextVersion(tx, specialtyId);

    const [versionRow] = await tx
      .insert(v4InstructionFileVersionsTable)
      .values({
        specialtyId,
        version,
        status: "published",
        rawJson: parsed as any,
        parsedSummary: report.summary as any,
        notes: parsed.publish_notes,
        publishedByUserId: publishedByUserId ?? undefined,
      })
      .returning({ id: v4InstructionFileVersionsTable.id });
    const versionId = versionRow.id;

    // ── Levels (bulk) ──────────────────────────────────────────────────────
    // Resolve each level's canonical index once, reused by every descendant
    // pass below so code derivation stays identical to the recursive version.
    const levelInputs = parsed.levels.map((level, li) => ({
      level,
      lvIdx: level.level_index ?? li + 1,
    }));
    const levelValues = levelInputs.map(({ level, lvIdx }) => ({
      versionId,
      levelIndex: lvIdx,
      name: level.name,
      goal: level.goal,
      examMeta: level.exam as any,
      meta: pickMeta(level, ["bloom_focus"]) as any,
    }));
    const insertedLevels = await chunkedInsertReturning(tx, v4LevelsTable, levelValues, {
      id: v4LevelsTable.id,
      levelIndex: v4LevelsTable.levelIndex,
    });
    const levelIdByIndex = new Map<number, number>(
      insertedLevels.map((r: any) => [r.levelIndex as number, r.id as number]),
    );
    onProgress?.({ phase: "inserted:levels", count: levelValues.length, label: "المستويات" });

    // ── Stages (bulk) ──────────────────────────────────────────────────────
    const stageValues: any[] = [];
    for (const { level, lvIdx } of levelInputs) {
      const levelId = levelIdByIndex.get(lvIdx)!;
      level.stages.forEach((stage, si) => {
        const stIdx = stage.stage_index ?? si + 1;
        const stageCode = `${lvIdx}.${stIdx}`;
        stageValues.push({
          versionId,
          levelId,
          stageIndex: stIdx,
          code: stageCode,
          name: stage.name,
          goal: stage.goal,
          examMeta: stage.exam as any,
          meta: pickMeta(stage, ["bloom_focus"]) as any,
        });
      });
    }
    const insertedStages = await chunkedInsertReturning(tx, v4StagesTable, stageValues, {
      id: v4StagesTable.id,
      code: v4StagesTable.code,
    });
    const stageIdByCode = new Map<string, number>(
      insertedStages.map((r: any) => [r.code as string, r.id as number]),
    );
    onProgress?.({ phase: "inserted:stages", count: stageValues.length, label: "المراحل" });

    // ── Units (bulk) ───────────────────────────────────────────────────────
    const unitValues: any[] = [];
    for (const { level, lvIdx } of levelInputs) {
      level.stages.forEach((stage, si) => {
        const stIdx = stage.stage_index ?? si + 1;
        const stageCode = `${lvIdx}.${stIdx}`;
        stage.units.forEach((unit, ui) => {
          const uxIdx = unit.unit_index ?? ui + 1;
          const unitCode = `${stageCode}.${uxIdx}`;
          unitValues.push({
            versionId,
            stageId: stageIdByCode.get(stageCode)!,
            unitIndex: uxIdx,
            code: unitCode,
            name: unit.name,
            goal: unit.goal,
            prerequisiteUnitCodes: unit.prerequisite_units as any,
            enablesUnitCodes: unit.enables_units as any,
            keyConcepts: unit.key_concepts as any,
            examMeta: unit.exam as any,
            meta: pickMeta(unit, ["motivation_hook", "learning_objectives"]) as any,
          });
        });
      });
    }
    const insertedUnits = await chunkedInsertReturning(tx, v4UnitsTable, unitValues, {
      id: v4UnitsTable.id,
      code: v4UnitsTable.code,
    });
    const unitIdByCode = new Map<string, number>(
      insertedUnits.map((r: any) => [r.code as string, r.id as number]),
    );
    onProgress?.({ phase: "inserted:units", count: unitValues.length, label: "الوحدات" });

    // ── Labs + Lessons (bulk) ──────────────────────────────────────────────
    // Both hang off units, so build their value arrays in one walk, then
    // bulk-insert each and read back code→id maps for their own children.
    const labValues: any[] = [];
    const lessonValues: any[] = [];
    for (const { level, lvIdx } of levelInputs) {
      level.stages.forEach((stage, si) => {
        const stIdx = stage.stage_index ?? si + 1;
        const stageCode = `${lvIdx}.${stIdx}`;
        stage.units.forEach((unit, ui) => {
          const uxIdx = unit.unit_index ?? ui + 1;
          const unitCode = `${stageCode}.${uxIdx}`;
          const unitId = unitIdByCode.get(unitCode)!;
          unit.labs.forEach((lab, lbi) => {
            const labI = lab.lab_index ?? lbi + 1;
            const labCode = `${unitCode}.م${labI}`;
            labValues.push({
              versionId,
              unitId,
              labIndex: labI,
              code: labCode,
              title: lab.title,
              scenario: lab.scenario,
              completionCriterion: lab.completion_criterion,
              meta: pickMeta(lab, [
                "pedagogical_sequence",
                "prerequisite_lessons",
                "allowed_tools",
              ]) as any,
            });
          });
          unit.lessons.forEach((lesson, lsi) => {
            const lsIdx = lesson.lesson_index ?? lsi + 1;
            const lessonCode = `${unitCode}.${lsIdx}`;
            lessonValues.push({
              versionId,
              unitId,
              lessonIndex: lsIdx,
              code: lessonCode,
              name: lesson.name,
              goal: lesson.goal,
              bridgeSentence: lesson.bridge_sentence,
              prerequisiteLessonCodes: lesson.prerequisite_lessons as any,
              enablesLessonCodes: lesson.enables_lessons as any,
              finalCheckQuestion: lesson.final_check_question,
              sessionCompleteCriterion: lesson.session_complete_criterion,
              yemeniExamples: lesson.yemeni_examples as any,
              expectedDurationMinutes: lesson.expected_duration_minutes,
              estimatedGemCost: lesson.estimated_gem_cost,
              solutionOutline: (lesson as any).solution_outline,
              meta: pickMeta(lesson, [
                "motivation_hook",
                "learning_objectives",
                "glossary",
              ]) as any,
            });
          });
        });
      });
    }
    // Labs and Lessons are independent of each other — run in parallel.
    const [insertedLabs, insertedLessons] = await Promise.all([
      chunkedInsertReturning(tx, v4LabScenariosTable, labValues, {
        id: v4LabScenariosTable.id,
        code: v4LabScenariosTable.code,
      }),
      chunkedInsertReturning(tx, v4LessonsTable, lessonValues, {
        id: v4LessonsTable.id,
        code: v4LessonsTable.code,
      }),
    ]);
    const labIdByCode = new Map<string, number>(
      insertedLabs.map((r: any) => [r.code as string, r.id as number]),
    );
    const lessonIdByCode = new Map<string, number>(
      insertedLessons.map((r: any) => [r.code as string, r.id as number]),
    );
    onProgress?.({ phase: "inserted:labs_lessons", count: labValues.length + lessonValues.length, label: "المعامل والدروس" });

    // ── Lab questions + lesson concepts + common mistakes (bulk) ───────────
    const labQuestionValues: any[] = [];
    const conceptValues: any[] = [];
    const mistakeValues: any[] = [];
    for (const { level, lvIdx } of levelInputs) {
      level.stages.forEach((stage, si) => {
        const stIdx = stage.stage_index ?? si + 1;
        const stageCode = `${lvIdx}.${stIdx}`;
        stage.units.forEach((unit, ui) => {
          const uxIdx = unit.unit_index ?? ui + 1;
          const unitCode = `${stageCode}.${uxIdx}`;
          unit.labs.forEach((lab, lbi) => {
            const labI = lab.lab_index ?? lbi + 1;
            const labCode = `${unitCode}.م${labI}`;
            const labId = labIdByCode.get(labCode)!;
            lab.questions.forEach((q, qi) => {
              labQuestionValues.push({
                versionId,
                labId,
                questionIndex: qi + 1,
                kind: q.kind,
                prompt: q.prompt,
                rubric: (q as any).rubric,
                solutionOutline: (q as any).solution_outline,
                points: (q as any).points ?? 1,
              });
            });
          });
          unit.lessons.forEach((lesson, lsi) => {
            const lsIdx = lesson.lesson_index ?? lsi + 1;
            const lessonCode = `${unitCode}.${lsIdx}`;
            const lessonId = lessonIdByCode.get(lessonCode)!;
            lesson.concepts.forEach((c, ci) => {
              conceptValues.push({
                versionId,
                lessonId,
                conceptIndex: ci + 1,
                name: c.name,
                explanation: c.explanation,
                masteryCriterion: c.mastery_criterion,
                weight: (c as any).weight ?? 1,
              });
            });
            lesson.common_mistakes.forEach((m, mi) => {
              mistakeValues.push({
                versionId,
                lessonId,
                mistakeIndex: mi + 1,
                mistake: m.mistake,
                correction: m.correction,
                treatment: m.treatment,
                severity: (m as any).severity ?? "major",
              });
            });
          });
        });
      });
    }
    // All three child tables are independent — insert in parallel.
    await Promise.all([
      chunkedInsert(tx, v4LabQuestionsTable, labQuestionValues),
      chunkedInsert(tx, v4LessonConceptsTable, conceptValues),
      chunkedInsert(tx, v4LessonCommonMistakesTable, mistakeValues),
    ]);
    onProgress?.({ phase: "inserted:children", count: labQuestionValues.length + conceptValues.length + mistakeValues.length, label: "أسئلة المعامل والمفاهيم والأخطاء" });

    // ── Exam banks (bulk) ──────────────────────────────────────────────────
    const examValues: any[] = [];
    if (parsed.exam_banks) {
      const { unit_banks, stage_banks, level_banks } = parsed.exam_banks;
      if (unit_banks) {
        for (const [code, bank] of Object.entries(unit_banks)) {
          const unitId = unitIdByCode.get(code);
          if (!unitId) continue; // Already reported in validator.
          bank.variants.forEach((variant, v) => {
            variant.forEach((q, qi) => {
              examValues.push({
                versionId,
                scope: "unit",
                unitId,
                variantIndex: v + 1,
                questionIndex: qi + 1,
                kind: q.kind,
                prompt: q.prompt,
                choices: q.choices as any,
                correctIndex: q.correct_index,
                explanation: q.explanation,
                difficulty: q.difficulty,
                rubric: (q as any).rubric,
                solutionOutline: (q as any).solution_outline,
                points: (q as any).points ?? 1,
                timeLimitSeconds: (q as any).time_limit_seconds,
              });
            });
          });
        }
      }
      if (stage_banks) {
        for (const [code, bank] of Object.entries(stage_banks)) {
          const stageId = stageIdByCode.get(code);
          if (!stageId) continue;
          bank.variants.forEach((variant, v) => {
            variant.forEach((q, qi) => {
              examValues.push({
                versionId,
                scope: "stage",
                stageId,
                variantIndex: v + 1,
                questionIndex: qi + 1,
                kind: q.kind,
                prompt: q.prompt,
                choices: q.choices as any,
                correctIndex: q.correct_index,
                explanation: q.explanation,
                difficulty: q.difficulty,
                rubric: (q as any).rubric,
                solutionOutline: (q as any).solution_outline,
                points: (q as any).points ?? 1,
                timeLimitSeconds: (q as any).time_limit_seconds,
              });
            });
          });
        }
      }
      if (level_banks) {
        for (const [key, bank] of Object.entries(level_banks)) {
          const levelId = levelIdByIndex.get(Number(key));
          if (!levelId) continue;
          bank.variants.forEach((variant, v) => {
            variant.forEach((q, qi) => {
              examValues.push({
                versionId,
                scope: "level",
                levelId,
                variantIndex: v + 1,
                questionIndex: qi + 1,
                kind: q.kind,
                prompt: q.prompt,
                choices: q.choices as any,
                correctIndex: q.correct_index,
                explanation: q.explanation,
                difficulty: q.difficulty,
                rubric: (q as any).rubric,
                solutionOutline: (q as any).solution_outline,
                points: (q as any).points ?? 1,
                timeLimitSeconds: (q as any).time_limit_seconds,
              });
            });
          });
        }
      }
    }
    // ── Placement test questions (bulk) ────────────────────────────────────
    const placementValues: any[] = [];
    if (parsed.placement_test_questions) {
      parsed.placement_test_questions.forEach((q, i) => {
        placementValues.push({
          versionId,
          questionIndex: i + 1,
          targetLevelIndex: q.target_level_index,
          kind: q.kind,
          prompt: q.prompt,
          choices: q.choices as any,
          correctIndex: q.correct_index,
          difficulty: q.difficulty,
        });
      });
    }

    // Exam questions and placement questions are independent — insert in parallel.
    await Promise.all([
      chunkedInsert(tx, v4ExamQuestionsTable, examValues),
      chunkedInsert(tx, v4PlacementTestQuestionsTable, placementValues),
    ]);
    onProgress?.({ phase: "inserted:exams", count: examValues.length + placementValues.length, label: "أسئلة الامتحانات وتحديد المستوى" });

    // ── Activate the new version ──────────────────────────────────────────
    await tx
      .update(v4SpecialtiesTable)
      .set({ activeInstructionVersionId: versionId, updatedAt: new Date() })
      .where(eq(v4SpecialtiesTable.id, specialtyId));

    return {
      versionId,
      version,
      specialtyId,
      summary: report.summary,
    };
  });
}

/** Hard-delete a specific version + its child rows (admin escape hatch).
 *  If the version is currently active, the specialty's active pointer is
 *  cleared first. */
export async function deleteV4InstructionVersion(versionId: number): Promise<void> {
  await db.transaction(async (tx: any) => {
    // Clear the active pointer if needed.
    await tx
      .update(v4SpecialtiesTable)
      .set({ activeInstructionVersionId: null })
      .where(eq(v4SpecialtiesTable.activeInstructionVersionId, versionId));

    // Cascade-delete child rows (no FK constraints, so we issue per-table
    // deletes ourselves).
    await tx.execute(sql`DELETE FROM "v4_exam_questions" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_placement_test_questions" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_lab_questions" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_lab_scenarios" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_lesson_common_mistakes" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_lesson_concepts" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_lessons" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_units" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_stages" WHERE "version_id" = ${versionId}`);
    await tx.execute(sql`DELETE FROM "v4_levels" WHERE "version_id" = ${versionId}`);
    await tx
      .delete(v4InstructionFileVersionsTable)
      .where(eq(v4InstructionFileVersionsTable.id, versionId));
  });
}
