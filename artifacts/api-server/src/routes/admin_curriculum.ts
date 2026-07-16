// ─────────────────────────────────────────────────────────────────────────────
// Admin Curriculum Explorer — zero-hallucination content lookup
//
// All content returned is read verbatim from the DB (populated by the
// instruction file publisher). The AI is used ONLY to parse the admin's
// natural-language query into structured indices; it never generates
// educational content itself.
//
// Routes:
//   GET  /api/admin/curriculum/specialties  — list specialties + active version
//   POST /api/admin/curriculum/content      — query DB for curriculum content
//   POST /api/admin/curriculum/parse-query  — AI parses Arabic query → indices
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { eq, and, asc, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  v4SpecialtiesTable,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4LabScenariosTable,
  v4LabQuestionsTable,
} from "@workspace/db";
import { OpenAI } from "@workspace/integrations-openai-ai-server";
import { getOpenRouterKey } from "../lib/openrouter-key";

const router = Router();

// ── Auth helpers (same pattern as admin_insights.ts) ─────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

function csrfGuard(req: any, res: any): boolean {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return false;
  }
  return true;
}

// ── GET /api/admin/curriculum/specialties ─────────────────────────────────────
router.get("/admin/curriculum/specialties", async (req, res): Promise<any> => {
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });

  try {
    const specialties = await db
      .select({
        id: v4SpecialtiesTable.id,
        slug: v4SpecialtiesTable.slug,
        name: v4SpecialtiesTable.name,
        icon: v4SpecialtiesTable.icon,
        activeInstructionVersionId: v4SpecialtiesTable.activeInstructionVersionId,
      })
      .from(v4SpecialtiesTable)
      .orderBy(asc(v4SpecialtiesTable.id));

    res.json({ specialties });
  } catch (err: any) {
    console.error("[admin/curriculum/specialties]", err?.message);
    res.status(500).json({ error: "خطأ في قاعدة البيانات" });
  }
});

// ── POST /api/admin/curriculum/content ───────────────────────────────────────
// Body: {
//   specialtySlug: string
//   levelIndex?: number        (1-based)
//   stageIndex?: number        (1-based within level)
//   unitIndex?: number         (1-based within stage)
//   lessonIndex?: number       (1-based within unit)
// }
//
// Returns verbatim DB content at the requested scope.
// More specific scope → richer returned content.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/curriculum/content", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });

  const { specialtySlug, levelIndex, stageIndex, unitIndex, lessonIndex } = (req.body ?? {}) as {
    specialtySlug?: string;
    levelIndex?: number;
    stageIndex?: number;
    unitIndex?: number;
    lessonIndex?: number;
  };

  if (!specialtySlug) {
    return res.status(400).json({ error: "specialtySlug مطلوب" });
  }

  try {
    // ── 1. Resolve specialty + active version ─────────────────────────────
    const [specialty] = await db
      .select()
      .from(v4SpecialtiesTable)
      .where(eq(v4SpecialtiesTable.slug, specialtySlug));

    if (!specialty) {
      return res.status(404).json({ error: `التخصص '${specialtySlug}' غير موجود` });
    }
    if (!specialty.activeInstructionVersionId) {
      return res.status(404).json({ error: "لا يوجد ملف تعليمات منشور لهذا التخصص بعد" });
    }

    const versionId = specialty.activeInstructionVersionId;
    const result: any = {
      specialty: { name: specialty.name, slug: specialty.slug, icon: specialty.icon },
      versionId,
      scope: "specialty",
    };

    // ── 2. Level ──────────────────────────────────────────────────────────
    if (levelIndex == null) {
      // Return all levels as summary
      const levels = await db
        .select()
        .from(v4LevelsTable)
        .where(eq(v4LevelsTable.versionId, versionId))
        .orderBy(asc(v4LevelsTable.levelIndex));
      result.levels = levels;
      return res.json(result);
    }

    const lvlNum = Number(levelIndex);
    const [level] = await db
      .select()
      .from(v4LevelsTable)
      .where(and(eq(v4LevelsTable.versionId, versionId), eq(v4LevelsTable.levelIndex, lvlNum)));

    if (!level) {
      return res.status(404).json({ error: `المستوى ${lvlNum} غير موجود في هذا التخصص` });
    }
    result.level = level;
    result.scope = "level";

    // ── 3. Stage ──────────────────────────────────────────────────────────
    if (stageIndex == null) {
      // Return all stages in this level
      const stages = await db
        .select()
        .from(v4StagesTable)
        .where(and(eq(v4StagesTable.versionId, versionId), eq(v4StagesTable.levelId, level.id)))
        .orderBy(asc(v4StagesTable.stageIndex));
      result.stages = stages;
      return res.json(result);
    }

    const stgNum = Number(stageIndex);
    const stageCode = `${lvlNum}.${stgNum}`;
    const [stage] = await db
      .select()
      .from(v4StagesTable)
      .where(and(eq(v4StagesTable.versionId, versionId), eq(v4StagesTable.code, stageCode)));

    if (!stage) {
      return res.status(404).json({ error: `المرحلة ${stgNum} في المستوى ${lvlNum} غير موجودة` });
    }
    result.stage = stage;
    result.scope = "stage";

    // ── 4. Unit ───────────────────────────────────────────────────────────
    if (unitIndex == null) {
      // Return ALL units in this stage with their FULL lesson + lab detail
      // (concepts, mistakes, lab questions) so the frontend can render the
      // entire stage without a second request.
      const units = await db
        .select()
        .from(v4UnitsTable)
        .where(and(eq(v4UnitsTable.versionId, versionId), eq(v4UnitsTable.stageId, stage.id)))
        .orderBy(asc(v4UnitsTable.unitIndex));

      if (units.length === 0) {
        result.units = [];
        result.unitsDetail = [];
        return res.json(result);
      }

      const unitIds = units.map((u) => u.id);

      // Fetch all lessons for every unit in the stage in one query
      const allLessons = await db
        .select()
        .from(v4LessonsTable)
        .where(and(eq(v4LessonsTable.versionId, versionId), inArray(v4LessonsTable.unitId, unitIds)))
        .orderBy(asc(v4LessonsTable.lessonIndex));

      const lessonIds = allLessons.map((l) => l.id);

      // Fetch concepts, mistakes, labs, lab questions — all in parallel
      const [concepts, mistakes, labs] = await Promise.all([
        lessonIds.length > 0
          ? db
              .select()
              .from(v4LessonConceptsTable)
              .where(inArray(v4LessonConceptsTable.lessonId, lessonIds))
              .orderBy(asc(v4LessonConceptsTable.conceptIndex))
          : Promise.resolve([]),
        lessonIds.length > 0
          ? db
              .select()
              .from(v4LessonCommonMistakesTable)
              .where(inArray(v4LessonCommonMistakesTable.lessonId, lessonIds))
              .orderBy(asc(v4LessonCommonMistakesTable.mistakeIndex))
          : Promise.resolve([]),
        db
          .select()
          .from(v4LabScenariosTable)
          .where(and(eq(v4LabScenariosTable.versionId, versionId), inArray(v4LabScenariosTable.unitId, unitIds)))
          .orderBy(asc(v4LabScenariosTable.labIndex)),
      ]);

      const labIds = labs.map((l) => l.id);
      const labQuestions =
        labIds.length > 0
          ? await db
              .select()
              .from(v4LabQuestionsTable)
              .where(inArray(v4LabQuestionsTable.labId, labIds))
              .orderBy(asc(v4LabQuestionsTable.questionIndex))
          : [];

      // Build rich per-unit objects
      const unitsDetail = units.map((unit) => {
        const unitLessons = allLessons.filter((l) => l.unitId === unit.id);
        const lessonsWithDetail = unitLessons.map((lesson) => ({
          ...lesson,
          concepts: concepts.filter((c) => c.lessonId === lesson.id),
          mistakes: mistakes.filter((m) => m.lessonId === lesson.id),
        }));
        const unitLabs = labs.filter((lab) => lab.unitId === unit.id);
        const labsWithQuestions = unitLabs.map((lab) => ({
          ...lab,
          questions: labQuestions.filter((q) => q.labId === lab.id),
        }));
        return { ...unit, lessons: lessonsWithDetail, labs: labsWithQuestions };
      });

      result.units = units;          // kept for backward compat
      result.unitsDetail = unitsDetail;
      return res.json(result);
    }

    const unitNum = Number(unitIndex);
    const unitCode = `${lvlNum}.${stgNum}.${unitNum}`;
    const [unit] = await db
      .select()
      .from(v4UnitsTable)
      .where(and(eq(v4UnitsTable.versionId, versionId), eq(v4UnitsTable.code, unitCode)));

    if (!unit) {
      return res.status(404).json({ error: `الوحدة ${unitNum} في المرحلة ${stgNum} المستوى ${lvlNum} غير موجودة` });
    }
    result.unit = unit;
    result.scope = "unit";

    // ── 5. Lesson(s) + rich content ───────────────────────────────────────
    const allLessons = await db
      .select()
      .from(v4LessonsTable)
      .where(and(eq(v4LessonsTable.versionId, versionId), eq(v4LessonsTable.unitId, unit.id)))
      .orderBy(asc(v4LessonsTable.lessonIndex));

    if (lessonIndex != null) {
      const lesNum = Number(lessonIndex);
      const lesson = allLessons.find((l) => l.lessonIndex === lesNum);
      if (!lesson) {
        return res.status(404).json({ error: `الدرس ${lesNum} في الوحدة ${unitNum} غير موجود` });
      }
      result.scope = "lesson";
      result.lesson = lesson;

      // Full lesson detail: concepts + mistakes
      const [concepts, mistakes] = await Promise.all([
        db
          .select()
          .from(v4LessonConceptsTable)
          .where(eq(v4LessonConceptsTable.lessonId, lesson.id))
          .orderBy(asc(v4LessonConceptsTable.conceptIndex)),
        db
          .select()
          .from(v4LessonCommonMistakesTable)
          .where(eq(v4LessonCommonMistakesTable.lessonId, lesson.id))
          .orderBy(asc(v4LessonCommonMistakesTable.mistakeIndex)),
      ]);

      result.lesson = { ...lesson, concepts, mistakes };
      return res.json(result);
    }

    // Unit scope — return all lessons with concepts/mistakes + all labs
    const lessonIds = allLessons.map((l) => l.id);

    const [concepts, mistakes, labs] = await Promise.all([
      lessonIds.length > 0
        ? db
            .select()
            .from(v4LessonConceptsTable)
            .where(inArray(v4LessonConceptsTable.lessonId, lessonIds))
            .orderBy(asc(v4LessonConceptsTable.conceptIndex))
        : Promise.resolve([]),
      lessonIds.length > 0
        ? db
            .select()
            .from(v4LessonCommonMistakesTable)
            .where(inArray(v4LessonCommonMistakesTable.lessonId, lessonIds))
            .orderBy(asc(v4LessonCommonMistakesTable.mistakeIndex))
        : Promise.resolve([]),
      db
        .select()
        .from(v4LabScenariosTable)
        .where(and(eq(v4LabScenariosTable.versionId, versionId), eq(v4LabScenariosTable.unitId, unit.id)))
        .orderBy(asc(v4LabScenariosTable.labIndex)),
    ]);

    const labIds = labs.map((l) => l.id);
    const labQuestions =
      labIds.length > 0
        ? await db
            .select()
            .from(v4LabQuestionsTable)
            .where(inArray(v4LabQuestionsTable.labId, labIds))
            .orderBy(asc(v4LabQuestionsTable.questionIndex))
        : [];

    // Group by lesson/lab
    const lessonsWithDetail = allLessons.map((lesson) => ({
      ...lesson,
      concepts: concepts.filter((c) => c.lessonId === lesson.id),
      mistakes: mistakes.filter((m) => m.lessonId === lesson.id),
    }));

    const labsWithQuestions = labs.map((lab) => ({
      ...lab,
      questions: labQuestions.filter((q) => q.labId === lab.id),
    }));

    result.lessons = lessonsWithDetail;
    result.labs = labsWithQuestions;
    return res.json(result);
  } catch (err: any) {
    console.error("[admin/curriculum/content] error:", err?.message, err?.stack);
    res.status(500).json({ error: "خطأ في قاعدة البيانات: " + (err?.message ?? "unknown") });
  }
});

// ── POST /api/admin/curriculum/parse-query ────────────────────────────────────
// Uses AI ONLY to extract indices from natural language.
// Content always comes from DB — the AI never generates educational content.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/curriculum/parse-query", async (req, res): Promise<any> => {
  if (!csrfGuard(req, res)) return;
  const adminId = getUserId(req);
  if (!(await isAdmin(adminId))) return res.status(403).json({ error: "Forbidden" });

  const { query } = (req.body ?? {}) as { query?: string };
  if (!query?.trim()) return res.status(400).json({ error: "query مطلوب" });

  try {
    // Get live specialties from DB for accurate context
    const specialties = await db
      .select({ slug: v4SpecialtiesTable.slug, name: v4SpecialtiesTable.name })
      .from(v4SpecialtiesTable);

    const key = getOpenRouterKey();
    if (!key) {
      // No AI key — return null so the frontend falls back to structured mode
      return res.json({ parsed: null, noAi: true });
    }

    const client = new OpenAI({
      apiKey: key,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://learnukhba.com",
        "X-Title": "Nukhba Curriculum Explorer",
      },
    });

    const specialtiesContext = specialties
      .map((s) => `"${s.slug}" → ${s.name}`)
      .join("\n");

    const systemPrompt = `أنت محلل استفسارات مناهج دراسية. استخرج الأرقام التنظيمية من الاستفسار وأعد JSON فقط.

التخصصات المتاحة:
${specialtiesContext}

اقرأ الاستفسار وأعد:
{
  "specialty_slug": "<رمز التخصص أو null>",
  "level_index": <رقم المستوى 1-5 أو null>,
  "stage_index": <رقم المرحلة داخل المستوى 1-7 أو null>,
  "unit_index": <رقم الوحدة داخل المرحلة 1-9 أو null>,
  "lesson_index": <رقم الدرس داخل الوحدة 1-10 أو null>
}

قواعد:
- "المستوى الثاني" → level_index: 2
- "المرحلة الثالثة" → stage_index: 3
- "الوحدة الأولى/1/الأولى" → unit_index: 1
- "الدرس الخامس" → lesson_index: 5
- إذا ذكرت "كل" شيء أو لم تذكر رقماً → null لذلك الحقل
- أعد JSON نظيفاً فقط بدون markdown`;

    const completion = await client.chat.completions.create({
      model: "google/gemini-2.0-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query.slice(0, 500) },
      ],
      temperature: 0,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    res.json({
      parsed: {
        specialtySlug: typeof parsed.specialty_slug === "string" ? parsed.specialty_slug : null,
        levelIndex: typeof parsed.level_index === "number" ? parsed.level_index : null,
        stageIndex: typeof parsed.stage_index === "number" ? parsed.stage_index : null,
        unitIndex: typeof parsed.unit_index === "number" ? parsed.unit_index : null,
        lessonIndex: typeof parsed.lesson_index === "number" ? parsed.lesson_index : null,
      },
    });
  } catch (err: any) {
    console.error("[admin/curriculum/parse-query] error:", err?.message);
    res.status(500).json({ error: "خطأ في تحليل الاستفسار: " + (err?.message ?? "unknown") });
  }
});

export { router as adminCurriculumRouter };
