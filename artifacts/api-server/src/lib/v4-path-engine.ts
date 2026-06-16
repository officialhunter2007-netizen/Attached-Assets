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

/** Warm, engaging diagnostic prompts with clickable options. Exactly 5, in conversation order.
 *  Each question uses [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| opt3 ||| غير ذلك]]
 *  so the student can tap instead of type. The tag is parsed client-side in path-custom.tsx. */
export const V4_DIAGNOSTIC_QUESTIONS: readonly string[] = [
  "🚀 أهلاً وسهلاً بك في نُخبة — أنا متحمّس أتعرّف عليك! 🌟\n\nخلّيني أسألك: ما هدفك من الدراسه؟ [[ASK_OPTIONS: شو هدفك الرئيسي من تعلّم هذا التخصص؟ ||| 🎯 أبغى أشتغل وأحصل على وظيفة ||| 📚 للتخرّج والنجاح في الجامعة ||| 🔍 فضول وحب استطلاع في هالمجال ||| 💡 عندي فكرة مشروع وأبغى أنفّذها ||| غير ذلك]]",

  "👏 إجابة ممتازة! الحين خلّيني أفهم مستواك عشان أضبطلك الخطة بالضبط.\n\n[[ASK_OPTIONS: وين تشوف نفسك حالياً في هذا التخصص؟ ||| 🌱 مبتدئ — ما عندي أي خلفية ||| 🌿 عندي شوية أساسيات بسيطة ||| 🌳 مستواي متوسّط وفاهم أغلب الأساسيات ||| 🏆 عندي خبرة وأبغى أتعمّق ||| غير ذلك]]",

  "🎨 رائع! كل طالب له أسلوبه الخاص في التعلّم.\n\n[[ASK_OPTIONS: شو أكثر شي كان متعب لك في تجاربك الدراسية السابقة؟ ||| 😵 صعوبة في التركيز لفترة طويلة ||| 🤯 المعلومة ما تثبت — أنسى بسرعة ||| ⌛ ما عندي وقت كافي للمذاكرة ||| 📖 الحفظ النظري صعب علي ||| غير ذلك]]",

  "⏰ تمام! باقي شي بسيط عشان أضبطلك جدول واقعي يناسب حياتك.\n\n[[ASK_OPTIONS: كم ساعة تقدر تخصّص أسبوعياً للتعلم في نُخبة؟ ||| 🕐 ساعة إلى ساعتين ||| 🕑 ساعتين إلى أربع ساعات ||| 🕓 أربع إلى ست ساعات ||| 🚀 أكثر من ست ساعات — أنا جاد! ||| غير ذلك]]",

  "💬 السؤال الأخير — وهالشي مو إجباري أبداً.\n\n[[ASK_OPTIONS: في شي إضافي تحبّ أعرفه عنك عشان أخدمك بشكل أفضل؟ ||| 🙋‍♂️ لا شي — خلّينا نبدأ! ||| ✍️ عندي ملاحظة إضافية (بكتبها بنفسي) ||| غير ذلك]]",
];

/** AI-generated placement question — same shape as V4PlacementTestQuestion
 *  but without versionId since it's scoped to a single placement session. */
export type GeneratedPlacementQuestion = {
  id: number;
  questionIndex: number;
  targetLevelIndex: number;
  targetStageCode: string | null;
  targetUnitCode: string | null;
  kind: string;
  prompt: string;
  choices: string[] | null;
  correctIndex: number | null;
  difficulty: number;
};

/** Union type that both pre-written and AI-generated questions satisfy. */
export type AnyPlacementQuestion = V4PlacementTestQuestion | GeneratedPlacementQuestion;

/** Build a structured Arabic summary of the entire curriculum for Haiku to
 *  generate targeted placement questions from. One compact line per lesson
 *  with its code, name, concepts, and knowledge-check question. */
async function buildCurriculumSummary(versionId: number): Promise<string> {
  const levels = await db
    .select()
    .from(v4LevelsTable)
    .where(eq(v4LevelsTable.versionId, versionId))
    .orderBy(asc(v4LevelsTable.levelIndex));
  const units = await db
    .select()
    .from(v4UnitsTable)
    .where(eq(v4UnitsTable.versionId, versionId))
    .orderBy(asc(v4UnitsTable.code));
  const lessons = await db
    .select()
    .from(v4LessonsTable)
    .where(eq(v4LessonsTable.versionId, versionId))
    .orderBy(asc(v4LessonsTable.code));
  const concepts = await db
    .select()
    .from(v4LessonConceptsTable)
    .where(eq(v4LessonConceptsTable.versionId, versionId));

  const conceptsByLesson = new Map<number, Array<{ index: number; name: string; criterion: string }>>();
  for (const c of concepts) {
    if (!conceptsByLesson.has(c.lessonId)) conceptsByLesson.set(c.lessonId, []);
    conceptsByLesson.get(c.lessonId)!.push({
      index: c.conceptIndex,
      name: c.name,
      criterion: c.masteryCriterion ?? "",
    });
  }

  const lines: string[] = [];
  for (const level of levels) {
    lines.push(`\nالمستوى ${level.levelIndex}: "${level.name}"`);
    lines.push(`  الهدف: ${level.goal || "(غير محدد)"}`);
    const levelUnits = units.filter((u) => u.levelId === level.id);
    for (const unit of levelUnits) {
      lines.push(`\n  الوحدة ${unit.code}: "${unit.name}"`);
      const unitLessons = lessons.filter((l) => l.unitId === unit.id);
      for (const lesson of unitLessons) {
        const cs = conceptsByLesson.get(lesson.id) ?? [];
        const conceptStr = cs.length ? cs.map((c) => `    • ${c.name}: ${c.criterion}`).join("\n") + "\n" : "";
        lines.push(`    الدرس ${lesson.code}: "${lesson.name}"`);
        if (lesson.bridgeSentence) lines.push(`      جسر: ${lesson.bridgeSentence}`);
        if (conceptStr) lines.push(conceptStr.trimEnd());
        if (lesson.finalCheckQuestion) lines.push(`      سؤال التحقق: ${lesson.finalCheckQuestion}`);
      }
    }
  }
  const text = lines.join("\n");
  return text.length > 6000 ? text.slice(0, 6000) + "\n…(مقتطع)" : text;
}

const GEN_QUESTIONS_SYSTEM = `أنت خبير تقييم تعليمي يمني فائق الدقة. سأعطيك ملخصاً كاملاً لمنهج دراسي (مستويات → مراحل → وحدات → دروس → مفاهيم).
مهمتك: توليد 20 سؤالاً متعدد الخيارات تحدد أدق مستوى ومرحلة ووحدة يبدأ منها الطالب.

قواعد صارمة جداً:
1. أعد JSON array فقط — لا تنسيق إضافي ولا شرح.
2. كل سؤال: { questionIndex, targetLevelIndex, targetStageCode, targetUnitCode, kind:"mcq", prompt, choices[4], correctIndex(0-3), difficulty(1-3) }
3. ⚠️ **التوزيع الإجباري — الأهم على الإطلاق**:
   - لكل مستوى (levelIndex) يجب أن يكون فيه 5-7 أسئلة كحد أدنى.
   - داخل كل مستوى: وزّع الأسئلة على مراحل (stage) مختلفة — لا تركز على مرحلة واحدة. كل مرحلة يجب أن يُمثّلها سؤال واحد على الأقل.
   - داخل كل مرحلة: وزّع الأسئلة على وحدات (unit) مختلفة. الوحدات الأولى في المرحلة (السهلة) والوحدات الأخيرة (الأصعب) كلها تحتاج أسئلة.
   - التوزيع المثالي: أول 3-4 أسئلة للمستوى الأول، 3-4 أسئلة للمستوى الثاني، 3-4 أسئلة للمستوى الثالث... وهكذا حتى تغطية كل المستويات.
   - إذا كان المنهج 3 مستويات: 7 أسئلة للمستوى 1 (وزّعها على 3 مراحل مختلفة على الأقل)، 7 أسئلة للمستوى 2 (وزّعها على 3 مراحل)، 6 أسئلة للمستوى 3 (وزّعها على 3 مراحل).
4. الأسئلة تختبر المفاهيم الأساسية (concepts) من الدروس، ليس الحفظ.
5. الخيارات الخاطئة يجب أن تكون معقولة وليست سخيفة. الأخطاء يجب أن تكون أخطاءً شائعة فعلاً يرتكبها الطلاب.
6. استخدم عامية يمنية بسيطة ومحببة في صياغة الأسئلة (مثل: "وش", "شنو", "إيش", "كيف", "ليش").
7. difficulty: 1=سهل (تعريف مباشر — بداية المستوى), 2=متوسط (تطبيق — وسط المستوى), 3=صعب (تحليل/تركيب — نهاية المستوى).
8. targetStageCode و targetUnitCode يجب أن تتطابق تماماً مع الأكواد الموجودة في الملخص (مثل "1.1", "2.3.1"). لا تختلق أكواداً غير موجودة.
9. correctIndex هو رقم الخيار الصحيح (0, 1, 2, أو 3). تأكد 100% أن الإجابة الصحيحة موجودة ضمن الخيارات ومطابقة للمفهوم.
10. الأسئلة الصعبة (difficulty=3) يجب أن تكون في نهاية كل مستوى وتطلب تحليلاً أو تركيباً وليس مجرد تعريف.`;

/**
 * Generate 20 AI-authored placement questions from the instruction file content.
 * Calls Claude Haiku once — the result is cached in the placement session's
 * `generatedQuestions` JSONB column and re-used across all probes.
 */
export async function generatePlacementQuestions(opts: {
  versionId: number;
}): Promise<GeneratedPlacementQuestion[]> {
  const summary = await buildCurriculumSummary(opts.versionId);
  if (!summary.trim()) throw new Error("empty_curriculum_summary");

  const raw = await generateGeminiJson({
    model: HAIKU_MODEL,
    system: GEN_QUESTIONS_SYSTEM,
    prompt: `ملخص المنهج:\n${summary}`,
    maxOutputTokens: 4000,
    temperature: 0.7,
  });

  let parsed: any;
  try { parsed = JSON.parse(raw); } catch {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/\[([\s\S]*)\]/);
    if (m) parsed = JSON.parse(m[1].trim());
    else throw new Error("unparseable_ai_response");
  }
  if (!Array.isArray(parsed) || parsed.length < 13) {
    throw new Error(`too_few_questions: ${Array.isArray(parsed) ? parsed.length : 0}`);
  }

  const out: GeneratedPlacementQuestion[] = [];
  for (let i = 0; i < Math.min(parsed.length, 20); i++) {
    const q = parsed[i];
    if (!q.prompt || !Array.isArray(q.choices) || q.choices.length !== 4) continue;
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) continue;
    if (!q.targetLevelIndex || q.targetLevelIndex < 1) continue;
    out.push({
      id: i,
      questionIndex: i,
      targetLevelIndex: Number(q.targetLevelIndex),
      targetStageCode: q.targetStageCode ?? null,
      targetUnitCode: q.targetUnitCode ?? null,
      kind: q.kind ?? "mcq",
      prompt: String(q.prompt),
      choices: q.choices.map(String),
      correctIndex: Number(q.correctIndex),
      difficulty: Math.min(3, Math.max(1, Number(q.difficulty ?? 2))),
    });
    if (out.length >= 20) break;
  }

  if (out.length < 13) throw new Error(`too_few_valid_questions: ${out.length}`);
  return out;
}

export type DiagnosticAnswer = { question: string; answer: string };

// ── Specialty + lesson lookups ──────────────────────────────────────────────

/** One unit node of the resolved tree, derived from lesson codes alone. */
export type ResolvedUnit = {
  /** "L.S.U" */
  unitCode: string;
  /** "L.S" */
  stageCode: string;
  levelIndex: number;
  stageIndex: number;
  unitIndex: number;
  /** Lesson codes in this unit, NUMERICALLY sorted. */
  lessonCodes: string[];
};

export type ResolvedSpecialty = {
  specialty: V4Specialty;
  versionId: number;
  /** Per-level ordered list of every lesson code in that level. */
  levelLessonCodes: string[][];
  /** Every lesson code, NUMERICALLY sorted (not lexicographic). */
  orderedLessonCodes: string[];
  /** Every unit, numerically sorted by (level, stage, unit). */
  units: ResolvedUnit[];
  /** Number of declared levels (from v4_levels). */
  levelCount: number;
};

/**
 * Numeric, segment-wise comparator for dotted codes ("L.S.U.Lesson").
 *
 * The latent bug this fixes: PostgreSQL `asc(code)` and JS `Array#sort()` are
 * LEXICOGRAPHIC, so "1.1.1.10" sorts BEFORE "1.1.1.2". Every place that needs
 * the true learning order (first lesson of a unit/level, "highest unlocked
 * code", unit ordering for descent) must use this instead.
 */
export function compareCodes(a: string, b: string): number {
  const pa = String(a).split(".");
  const pb = String(b).split(".");
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = parseInt(pa[i] ?? "0", 10);
    const y = parseInt(pb[i] ?? "0", 10);
    const xv = Number.isFinite(x) ? x : 0;
    const yv = Number.isFinite(y) ? y : 0;
    if (xv !== yv) return xv - yv;
  }
  return 0;
}

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

  // Canonical numbering is "L.S.U.Lesson" on v4_lessons.code. We derive the
  // whole level→stage→unit→lesson tree from the codes alone (no extra
  // queries) and sort everything NUMERICALLY (compareCodes) so "1.1.1.10"
  // lands after "1.1.1.2" — see the comparator note above.
  const allCodes = lessons
    .map((l: any) => String(l.code))
    .filter((c: string) => c.length > 0)
    .sort(compareCodes);

  // level i → lesson codes (numeric order).
  const byLevel: string[][] = [];
  for (const lvl of levels) {
    const codes = allCodes.filter(
      (c) => parseInt(c.split(".")[0] || "0", 10) === lvl.levelIndex,
    );
    byLevel.push(codes);
  }

  // Group lessons into units keyed by "L.S.U" (first three segments).
  const unitMap = new Map<string, ResolvedUnit>();
  for (const code of allCodes) {
    const seg = code.split(".");
    if (seg.length < 3) continue; // non-canonical — has no unit slot
    const unitCode = `${seg[0]}.${seg[1]}.${seg[2]}`;
    let u = unitMap.get(unitCode);
    if (!u) {
      u = {
        unitCode,
        stageCode: `${seg[0]}.${seg[1]}`,
        levelIndex: parseInt(seg[0] || "0", 10) || 0,
        stageIndex: parseInt(seg[1] || "0", 10) || 0,
        unitIndex: parseInt(seg[2] || "0", 10) || 0,
        lessonCodes: [],
      };
      unitMap.set(unitCode, u);
    }
    u.lessonCodes.push(code);
  }
  const units = Array.from(unitMap.values()).sort((a, b) => compareCodes(a.unitCode, b.unitCode));
  for (const u of units) u.lessonCodes.sort(compareCodes);

  return {
    specialty: sp,
    versionId: ver.id,
    levelLessonCodes: byLevel,
    orderedLessonCodes: allCodes,
    units,
    levelCount: levels.length,
  };
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
  const ordered = resolved.orderedLessonCodes.length
    ? resolved.orderedLessonCodes
    : [...resolved.levelLessonCodes.flat()].sort(compareCodes);
  if (ordered.length === 0) return { unlocked: [], currentLessonCode: null };

  if (startMode === "from_zero") {
    return { unlocked: [ordered[0]], currentLessonCode: ordered[0] };
  }

  // placement: unlock through end of `startingLevelIndex`.
  const levelCount = resolved.levelCount || resolved.levelLessonCodes.length || 1;
  const clampedLevel = Math.max(1, Math.min(startingLevelIndex, levelCount));
  const unlocked = ordered.filter((c) => parseInt(c.split(".")[0] || "0", 10) <= clampedLevel);
  // current = first lesson IN the starting level (where teacher should pick
  // them up), not the very first overall. Numeric order (compareCodes).
  const inLevel = ordered.filter((c) => parseInt(c.split(".")[0] || "0", 10) === clampedLevel);
  const current = inLevel[0] ?? unlocked[0] ?? null;
  return { unlocked, currentLessonCode: current };
}

/**
 * High-precision unlock — unlock every lesson up to AND INCLUDING the boundary
 * unit "L.S.U", with the current pointer at the FIRST lesson of that unit.
 *
 * "Up to" walks the NUMERICALLY-ordered unit list, so a student placed at unit
 * 2.3.1 gets all of level 1, level-2 stages 1-2, level-2 stage-3 unit-1, and
 * lands on the first lesson of 2.3.1. Conservative + pedagogically precise.
 *
 * If the version has no canonical unit tree (non-canonical codes) we fall back
 * to from-zero semantics rather than over-unlocking.
 */
export function computeUnlockedToUnit(
  resolved: ResolvedSpecialty,
  boundaryUnitCode: string,
): { unlocked: string[]; currentLessonCode: string | null; startingLevelIndex: number } {
  const units = resolved.units;
  if (units.length === 0) {
    const ordered = resolved.orderedLessonCodes;
    return {
      unlocked: ordered.length ? [ordered[0]] : [],
      currentLessonCode: ordered[0] ?? null,
      startingLevelIndex: 1,
    };
  }
  let idx = units.findIndex((u) => u.unitCode === boundaryUnitCode);
  if (idx < 0) idx = 0; // unknown unit → place at the very first unit
  const boundary = units[idx];
  const unlocked: string[] = [];
  for (let i = 0; i <= idx; i++) unlocked.push(...units[i].lessonCodes);
  const currentLessonCode = boundary.lessonCodes[0] ?? unlocked[0] ?? null;
  return { unlocked, currentLessonCode, startingLevelIndex: boundary.levelIndex };
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
  /** Unit-precise placement boundary "L.S.U". When set (placement + adaptive
   *  descent) the unlock set runs up to this unit and the code is persisted so
   *  a later re-publish recomputes unit-precisely instead of widening to the
   *  whole level. NULL for from_zero / legacy level-only placement. */
  boundaryUnitCode?: string | null;
}): Promise<V4StudentPath> {
  const usePrecise = opts.startMode === "placement" && !!opts.boundaryUnitCode;
  let unlocked: string[];
  let currentLessonCode: string | null;
  let startingLevelIndex = opts.startingLevelIndex;
  if (usePrecise) {
    const r = computeUnlockedToUnit(opts.resolved, opts.boundaryUnitCode as string);
    unlocked = r.unlocked;
    currentLessonCode = r.currentLessonCode;
    startingLevelIndex = r.startingLevelIndex;
  } else {
    const r = computeUnlocked(opts.resolved, opts.startMode, opts.startingLevelIndex);
    unlocked = r.unlocked;
    currentLessonCode = r.currentLessonCode;
  }
  const placementUnitCode = usePrecise ? (opts.boundaryUnitCode as string) : null;

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
      startingLevelIndex,
      placementUnitCode,
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
        startingLevelIndex,
        placementUnitCode,
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

  // Recompute the baseline unlock set against the NEW version. If the student
  // was placed unit-precisely (placementUnitCode set) AND that unit still
  // exists, recompute unit-precisely so a re-publish doesn't silently widen
  // their unlock to the whole level. Otherwise fall back to level-granular.
  const placementUnit = (studentPath as any).placementUnitCode as string | null | undefined;
  const unitStillExists = !!placementUnit && resolved.units.some((u) => u.unitCode === placementUnit);
  let recomputed: string[];
  let recomputedCurrent: string | null;
  if (startMode === "placement" && unitStillExists) {
    const r = computeUnlockedToUnit(resolved, placementUnit as string);
    recomputed = r.unlocked;
    recomputedCurrent = r.currentLessonCode;
  } else {
    const r = computeUnlocked(resolved, startMode, studentPath.startingLevelIndex ?? 1);
    recomputed = r.unlocked;
    recomputedCurrent = r.currentLessonCode;
  }

  const allNewCodes = new Set<string>(resolved.orderedLessonCodes);
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
  // NUMERIC max (compareCodes) — lexicographic .sort() would rank
  // "1.1.1.10" below "1.1.1.2" and pick the wrong "highest" lesson.
  let currentCode: string | null = null;
  if (studentPath.currentLessonCode && allNewCodes.has(studentPath.currentLessonCode)) {
    currentCode = studentPath.currentLessonCode;
  } else if (preserved.length > 0) {
    currentCode = [...preserved].sort(compareCodes).pop() ?? recomputedCurrent;
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
  // Group answers by level, then walk levels sequentially from 1 upwards.
  // Place the student at the FIRST level where they did NOT demonstrate
  // mastery (majority correct, ratio ≥ 0.67). Levels with zero probes
  // are treated as untested — place there conservatively.
  const byLevel = new Map<number, { correct: number; wrong: number }>();
  for (const a of answered) {
    const e = byLevel.get(a.targetLevelIndex) ?? { correct: 0, wrong: 0 };
    if (a.correct) e.correct++; else e.wrong++;
    byLevel.set(a.targetLevelIndex, e);
  }

  let lastPassed = 0;
  for (let L = 1; L <= 5; L++) {
    const r = byLevel.get(L);
    if (!r || r.correct + r.wrong === 0) {
      // No questions probed this level → can't determine. If the student
      // passed lower levels, place here (conservative). If nothing passed
      // yet, place at this level.
      return Math.max(1, lastPassed > 0 ? lastPassed + 1 : L);
    }
    const total = r.correct + r.wrong;
    if (r.correct / total >= 0.66) {
      lastPassed = L;
      continue; // passed this level
    }
    // Failed — not enough correct answers at this level
    return Math.max(1, L);
  }
  return Math.max(1, lastPassed);
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
  question: AnyPlacementQuestion;
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

// ── Adaptive placement descent (level → stage → unit) ───────────────────────
// Pure + deterministic over the set of already-graded probes, so the route
// layer can replay it on every /next call without holding in-memory state.
// Falls back to the legacy level-only flow when the active version has no
// unit-tagged questions, keeping existing instruction files unchanged.

export type PlacementScope = "level" | "stage" | "unit";

export type PlacementProbe = {
  questionId: number;
  scope: PlacementScope;
  scopeCode: string;        // level: "L"; stage: "L.S"; unit: "L.S.U"
  targetLevelIndex: number;
  correct: boolean;
};

export type PlacementPending = {
  questionId: number;
  scope: PlacementScope;
  scopeCode: string;
  targetLevelIndex: number;
};

export type PlacementResult = {
  startMode: "placement";
  startingLevelIndex: number;
  levelIndex: number;
  stageCode: string | null;
  unitCode: string | null;
  currentLessonCode: string | null;
  precision: "unit" | "level";
  reason: string;
};

export type PlacementStep =
  | {
      kind: "ask";
      question: V4PlacementTestQuestion;
      scope: PlacementScope;
      scopeCode: string;
      targetLevelIndex: number;
      phaseLabel: string;
    }
  | { kind: "done"; result: PlacementResult };

/** True when the active version has at least one unit-tagged placement
 *  question (otherwise we run the legacy level-only flow for back-compat). */
export function usesUnitTargeting(questions: V4PlacementTestQuestion[]): boolean {
  return questions.some((q) => !!q.targetUnitCode);
}

// Descent thresholds. Level uses best-of-3 (robust against a single fluke);
// stage/unit use a faster 1-of-2 since we're already inside a failed level.
// Conservative thresholds: level placement requires strong evidence (3-of-3
// correct). Stage/unit descent within a failing level uses 2-of-2 since the
// student already demonstrated weakness at that level.
const LEVEL_PASS_NEED = 3, LEVEL_FAIL_NEED = 2;
const SUB_PASS_NEED = 2, SUB_FAIL_NEED = 2;

function scopeVerdict(results: boolean[], passNeed: number, failNeed: number): "pass" | "fail" | "pending" {
  const correct = results.filter(Boolean).length;
  const wrong = results.length - correct;
  if (correct >= passNeed) return "pass";
  if (wrong >= failNeed) return "fail";
  return "pending";
}

function probeResultsFor(probes: PlacementProbe[], scope: PlacementScope, scopeCode: string): boolean[] {
  return probes.filter((p) => p.scope === scope && p.scopeCode === scopeCode).map((p) => p.correct);
}

function pickUnasked(pool: AnyPlacementQuestion[], askedIds: Set<number>): AnyPlacementQuestion | null {
  return pool.find((q) => !askedIds.has(q.id)) ?? null;
}

// Representative pools. Level/stage probe the LAST (hardest) unit first — the
// strongest discriminator for "do you know this whole scope?". Unit probes go
// easiest-first so a struggling student fails fast.
function levelPool(questions: AnyPlacementQuestion[], levelIndex: number): AnyPlacementQuestion[] {
  const floor = `${levelIndex}.0.0`;
  return questions
    .filter((q) => q.targetLevelIndex === levelIndex)
    .sort((a, b) =>
      compareCodes(b.targetUnitCode ?? floor, a.targetUnitCode ?? floor) ||
      (b.difficulty - a.difficulty) ||
      (a.questionIndex - b.questionIndex));
}
function stagePool(questions: AnyPlacementQuestion[], stageCode: string): AnyPlacementQuestion[] {
  return questions
    .filter((q) => q.targetStageCode === stageCode || (q.targetUnitCode ?? "").startsWith(stageCode + "."))
    .sort((a, b) =>
      compareCodes(b.targetUnitCode ?? stageCode, a.targetUnitCode ?? stageCode) ||
      (b.difficulty - a.difficulty) ||
      (a.questionIndex - b.questionIndex));
}
function unitPool(questions: AnyPlacementQuestion[], unitCode: string): AnyPlacementQuestion[] {
  return questions
    .filter((q) => q.targetUnitCode === unitCode)
    .sort((a, b) => (a.difficulty - b.difficulty) || (a.questionIndex - b.questionIndex));
}

function doneResult(resolved: ResolvedSpecialty, boundaryUnitCode: string | null, reason: string): PlacementStep {
  if (boundaryUnitCode) {
    const r = computeUnlockedToUnit(resolved, boundaryUnitCode);
    const unit = resolved.units.find((u) => u.unitCode === boundaryUnitCode) ?? null;
    return {
      kind: "done",
      result: {
        startMode: "placement",
        startingLevelIndex: r.startingLevelIndex,
        levelIndex: unit?.levelIndex ?? r.startingLevelIndex,
        stageCode: unit?.stageCode ?? null,
        unitCode: boundaryUnitCode,
        currentLessonCode: r.currentLessonCode,
        precision: "unit",
        reason,
      },
    };
  }
  // No unit tree → fall back to level-1 placement.
  const r = computeUnlocked(resolved, "placement", 1);
  return {
    kind: "done",
    result: {
      startMode: "placement",
      startingLevelIndex: 1,
      levelIndex: 1,
      stageCode: null,
      unitCode: null,
      currentLessonCode: r.currentLessonCode,
      precision: "level",
      reason: `${reason}_no_units`,
    },
  };
}

/**
 * Hierarchical-descent placement. Pure over the graded `probes`: returns the
 * next question to ASK, or the final placement when the descent is complete.
 *
 *   PHASE 1 LEVEL : find the lowest level the student can't pass (best-of-3).
 *   PHASE 2 STAGE : within that level, the lowest stage they can't pass (1-of-2).
 *   PHASE 3 UNIT  : within that stage, the lowest unit they can't pass (1-of-2).
 *   PLACE         : first lesson of the boundary unit; everything before it is
 *                   unlocked. Conservative — start where mastery breaks down.
 */
export function evaluatePlacement(
  resolved: ResolvedSpecialty,
  questions: AnyPlacementQuestion[],
  probes: PlacementProbe[],
): PlacementStep {
  const askedIds = new Set(probes.map((p) => p.questionId));
  const maxLevel = Math.max(
    resolved.levelCount || 0,
    ...questions.map((q) => q.targetLevelIndex || 0),
    1,
  );

  // ── PHASE 1: LEVEL ───────────────────────────────────────────────
  let boundaryLevel = 0;
  let levelDecided = false;
  for (let L = 1; L <= maxLevel; L++) {
    const results = probeResultsFor(probes, "level", String(L));
    const v = scopeVerdict(results, LEVEL_PASS_NEED, LEVEL_FAIL_NEED);
    if (v === "pass") continue;
    if (v === "fail") { boundaryLevel = L; levelDecided = true; break; }
    const q = pickUnasked(levelPool(questions, L), askedIds);
    if (q) {
      return { kind: "ask", question: q, scope: "level", scopeCode: String(L), targetLevelIndex: L, phaseLabel: "تحديد المستوى" };
    }
    // pool exhausted: require LEVEL_PASS_NEED correct to pass; otherwise
    // place student here (conservative — they didn't prove mastery).
    if (results.filter(Boolean).length >= LEVEL_PASS_NEED) continue;
    boundaryLevel = L; levelDecided = true; break;
  }

  if (!levelDecided) {
    // Passed (or exhausted questions for) every level → mastered everything.
    const lastUnit = resolved.units[resolved.units.length - 1] ?? null;
    return doneResult(resolved, lastUnit?.unitCode ?? null, "all_levels_passed");
  }

  // ── PHASE 2: STAGE within boundaryLevel ──────────────────────────
  const stagesInLevel = Array.from(
    new Set(resolved.units.filter((u) => u.levelIndex === boundaryLevel).map((u) => u.stageCode)),
  ).sort(compareCodes);

  let boundaryStage: string | null = null;
  for (const stageCode of stagesInLevel) {
    const results = probeResultsFor(probes, "stage", stageCode);
    const v = scopeVerdict(results, SUB_PASS_NEED, SUB_FAIL_NEED);
    if (v === "pass") continue;
    if (v === "fail") { boundaryStage = stageCode; break; }
    const q = pickUnasked(stagePool(questions, stageCode), askedIds);
    if (q) {
      return { kind: "ask", question: q, scope: "stage", scopeCode: stageCode, targetLevelIndex: boundaryLevel, phaseLabel: "تحديد المرحلة" };
    }
    if (results.filter(Boolean).length >= SUB_PASS_NEED) continue;
    boundaryStage = stageCode; break;
  }
  if (boundaryStage === null) {
    // Level failed overall but every probed stage looked ok (noise) → start at
    // the FIRST stage of the boundary level (conservative).
    boundaryStage = stagesInLevel[0] ?? `${boundaryLevel}.1`;
  }

  // ── PHASE 3: UNIT within boundaryStage ───────────────────────────
  const unitsInStage = resolved.units.filter((u) => u.stageCode === boundaryStage);
  let boundaryUnit: string | null = null;
  for (const unit of unitsInStage) {
    const results = probeResultsFor(probes, "unit", unit.unitCode);
    const v = scopeVerdict(results, SUB_PASS_NEED, SUB_FAIL_NEED);
    if (v === "pass") continue;
    if (v === "fail") { boundaryUnit = unit.unitCode; break; }
    const q = pickUnasked(unitPool(questions, unit.unitCode), askedIds);
    if (q) {
      return { kind: "ask", question: q, scope: "unit", scopeCode: unit.unitCode, targetLevelIndex: boundaryLevel, phaseLabel: "تحديد الوحدة" };
    }
    if (results.filter(Boolean).length >= SUB_PASS_NEED) continue;
    boundaryUnit = unit.unitCode; break;
  }
  if (boundaryUnit === null) {
    boundaryUnit = unitsInStage[0]?.unitCode ?? null;
  }

  return doneResult(resolved, boundaryUnit, "descent_complete");
}

/**
 * Legacy level-only placement, made pure + server-driven for the session
 * machine. Mirrors `pickNextPlacementQuestion` semantics EXACTLY (one question
 * per level, advance on a correct answer, stop on two consecutive fails or
 * exhaustion; starting level = highest level answered correctly, default 1).
 * Used when the active version has no unit-tagged questions, so existing files
 * behave identically — just driven by the server-authoritative session.
 */
export function evaluateLevelOnly(
  resolved: ResolvedSpecialty,
  questions: V4PlacementTestQuestion[],
  probes: PlacementProbe[],
): PlacementStep {
  const answered: PlacementAnswered[] = probes.map((p) => ({
    questionId: p.questionId,
    targetLevelIndex: p.targetLevelIndex,
    correct: p.correct,
  }));

  const finalize = (reason: string): PlacementStep => {
    const startingLevelIndex = computeStartingLevel(answered);
    const r = computeUnlocked(resolved, "placement", startingLevelIndex);
    return {
      kind: "done",
      result: {
        startMode: "placement",
        startingLevelIndex,
        levelIndex: startingLevelIndex,
        stageCode: null,
        unitCode: null,
        currentLessonCode: r.currentLessonCode,
        precision: "level",
        reason,
      },
    };
  };

  if (answered.length >= 2 && answered.slice(-2).every((a) => !a.correct)) {
    return finalize("two_consecutive_fails");
  }

  const last = answered[answered.length - 1];
  let targetLevel = 1;
  if (last) targetLevel = last.correct ? last.targetLevelIndex + 1 : last.targetLevelIndex;

  const maxLevel = Math.max(
    resolved.levelCount || 0,
    ...questions.map((q) => q.targetLevelIndex || 0),
    1,
  );
  if (targetLevel > maxLevel) return finalize("exhausted");

  const askedIds = new Set(answered.map((a) => a.questionId));
  const pool = questions
    .filter((q) => q.targetLevelIndex === targetLevel)
    .sort((a, b) => (a.difficulty - b.difficulty) || (a.questionIndex - b.questionIndex));
  const next = pool.find((q) => !askedIds.has(q.id));
  if (!next) return finalize("exhausted");
  return { kind: "ask", question: next, scope: "level", scopeCode: String(targetLevel), targetLevelIndex: targetLevel, phaseLabel: "تحديد المستوى" };
}

/** Single entry point for the route: descent when unit-tagged, else legacy. */
export function nextPlacementStep(
  resolved: ResolvedSpecialty,
  questions: AnyPlacementQuestion[],
  probes: PlacementProbe[],
): PlacementStep {
  return usesUnitTargeting(questions as any[])
    ? evaluatePlacement(resolved, questions, probes)
    : evaluateLevelOnly(resolved, questions as V4PlacementTestQuestion[], probes);
}
