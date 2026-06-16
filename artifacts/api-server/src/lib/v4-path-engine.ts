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
  v4LessonConceptsTable,
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

  "💬عندك شي تحب نعرفه عنك؟\n\n[[ASK_OPTIONS: في شي إضافي تحبّ أعرفه عنك عشان أخدمك بشكل أفضل؟ ||| 🙋‍♂️ لا شي — خلّينا نبدأ! ||| ✍️ عندي ملاحظة إضافية (بكتبها بنفسي) ||| غير ذلك]]",
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

// ── AI placement-question generation (practical, applied, code-in-English) ───
const PLACEMENT_GEN_MODEL = "gemini-2.5-flash-lite";
const PLACEMENT_SAMPLE_UNITS = 22;
const PLACEMENT_PER_UNIT = 3;
const PLACEMENT_GEN_CONCURRENCY = 8;
export const PLACEMENT_MIN_POOL = 13;
export const PLACEMENT_MIN_UNITS = 6;

type PlacementUnitCtx = {
  code: string;
  levelIndex: number;
  stageCode: string | null;
  name: string;
  goal: string;
  keyConcepts: string[];
  lessons: string[];
  concepts: { name: string; criterion: string }[];
};

/** Evenly sample up to `max` items across an ordered array (always keeps the
 *  first and last) so placement probes are spread over the whole curriculum. */
function evenSample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr.slice();
  const idxs = new Set<number>();
  const step = (arr.length - 1) / (max - 1);
  for (let k = 0; k < max; k++) idxs.add(Math.round(k * step));
  idxs.add(0);
  idxs.add(arr.length - 1);
  return Array.from(idxs).sort((a, b) => a - b).map((i) => arr[i]);
}

/** Minimal concurrency pool — caps simultaneous in-flight generation calls. */
async function genPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runner(): Promise<void> {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => runner()));
  return results;
}

function stripJsonFence(s: string): string {
  const t = String(s ?? "").trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

function buildPlacementGenPrompt(u: PlacementUnitCtx): string {
  const lessonsBlock = u.lessons.slice(0, 12).map((l, i) => `${i + 1}. ${l}`).join("\n").slice(0, 2200);
  const conceptsBlock = u.concepts.slice(0, 14).map((c) => `- ${c.name}${c.criterion ? `: ${c.criterion}` : ""}`).join("\n").slice(0, 2200);
  const keyBlock = (u.keyConcepts || []).filter(Boolean).join("، ");
  return `أنت خبير تقييم تعليمي يمني. ألّف ${PLACEMENT_PER_UNIT} أسئلة اختيار من متعدد (MCQ) عمليّة وتطبيقية لقياس إتقان وحدة محددة في اختبار تحديد المستوى.

الوحدة (الكود ${u.code}):
- الاسم: ${u.name}
- الهدف: ${u.goal || "(غير محدد)"}${keyBlock ? `\n- مفاهيم مفتاحية: ${keyBlock}` : ""}

دروس الوحدة:
${lessonsBlock || "(غير مفصّلة)"}${conceptsBlock ? `\n\nالمفاهيم:\n${conceptsBlock}` : ""}

نوع الأسئلة (الأهم):
اجعلها تطبيقية لا تعريفية. لا تسأل "ما تعريف ...". استخدم أنماطاً مثل:
• "وش ناتج هذا الكود؟" (توقّع المخرجات)
• "هذا الكود فيه خطأ — وين المشكلة أو كيف نصلحها؟"
• "أي خيار يعطي النتيجة المطلوبة؟"
• "وش قيمة المتغيّر بعد التنفيذ؟"
لتخصصات غير برمجية: استخدم مسألة أو سيناريو رقمي تطبيقي بنفس الروح.

قواعد الكود (إلزامية):
1. أي كود يوضع داخل سور ثلاثي مع اسم اللغة، مثل:
\`\`\`python
nums = [1, 2, 3]
print(len(nums))
\`\`\`
2. كل الكود والمعرّفات والكلمات المفتاحية بالإنجليزية فقط (لاتيني) — لا حروف عربية داخل الكود إطلاقاً. أسماء المتغيّرات والدوال إنجليزية وصفية.
3. نص السؤال والخيارات بالعربية البسيطة، لكن إذا كان الخيار كوداً أو ناتجاً برمجياً فاكتبه بالإنجليزية.

صيغة الإخراج — أعد JSON فقط بلا أي شرح أو أسوار خارجية:
{"questions":[{"prompt":"نص السؤال (قد يحوي كتلة كود)","choices":["خيار 1","خيار 2","خيار 3","خيار 4"],"correct_index":0,"difficulty":1}]}

قواعد صارمة:
- بالضبط 4 خيارات لكل سؤال، وخيار صحيح واحد فقط.
- correct_index فهرس الخيار الصحيح (يبدأ من 0)، وتأكّد أنه صحيح 100%.
- difficulty: 1=سهل، 2=متوسط، 3=صعب — وزّع الأسئلة الثلاثة على المستويات الثلاثة.
- الخيارات الخاطئة تمثّل أخطاءً شائعة فعلية (وليست سخيفة).
- الأسئلة من صميم محتوى الوحدة بالضبط — لا أسهل ولا أصعب من مستواها.`;
}

type ParsedGenQ = { prompt: string; choices: string[]; correctIndex: number; difficulty: number };

function parsePlacementGen(txt: string): ParsedGenQ[] {
  let parsed: any;
  try { parsed = JSON.parse(stripJsonFence(txt)); } catch { return []; }
  const arr = Array.isArray(parsed?.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : [];
  const out: ParsedGenQ[] = [];
  for (const q of arr) {
    const prompt = String(q?.prompt ?? "").trim();
    const choices = Array.isArray(q?.choices) ? q.choices.map((c: any) => String(c ?? "").trim()).filter(Boolean) : [];
    const ci = Number(q?.correct_index ?? q?.correctIndex);
    let diff = Number(q?.difficulty);
    if (!Number.isInteger(diff) || diff < 1 || diff > 3) diff = 2;
    // MCQ spec: EXACTLY 4 non-empty choices with a valid correct index.
    if (!prompt || choices.length !== 4) continue;
    if (!Number.isInteger(ci) || ci < 0 || ci >= choices.length) continue;
    out.push({ prompt, choices, correctIndex: ci, difficulty: diff });
  }
  return out;
}

/**
 * Generate practical, applied, code-in-English placement questions. Units are
 * stratified-sampled evenly across the whole curriculum (≤ PLACEMENT_SAMPLE_UNITS)
 * and a small MCQ pool is authored per sampled unit in parallel via Gemini Flash
 * Lite. The result is cached in the placement session's `generatedQuestions`
 * JSONB and consumed by the binary-search engine (`evaluatePlacement`).
 */
export async function generatePlacementQuestions(opts: {
  versionId: number;
}): Promise<GeneratedPlacementQuestion[]> {
  const versionId = opts.versionId;
  const [units, lessons, concepts] = await Promise.all([
    db.select().from(v4UnitsTable).where(eq(v4UnitsTable.versionId, versionId)),
    db.select().from(v4LessonsTable).where(eq(v4LessonsTable.versionId, versionId)),
    db.select().from(v4LessonConceptsTable).where(eq(v4LessonConceptsTable.versionId, versionId)),
  ]);
  if (units.length === 0) throw new Error("no_units");

  const lessonsByUnit = new Map<number, typeof lessons>();
  const lessonIdToUnit = new Map<number, number>();
  for (const l of lessons) {
    lessonIdToUnit.set(l.id, l.unitId);
    const a = lessonsByUnit.get(l.unitId) ?? [];
    a.push(l); lessonsByUnit.set(l.unitId, a);
  }
  const conceptsByUnit = new Map<number, typeof concepts>();
  for (const c of concepts) {
    const uId = lessonIdToUnit.get(c.lessonId);
    if (uId == null) continue;
    const a = conceptsByUnit.get(uId) ?? [];
    a.push(c); conceptsByUnit.set(uId, a);
  }

  const ordered = units.slice().sort((a, b) => compareCodes(a.code, b.code));
  const sampled = evenSample(ordered, PLACEMENT_SAMPLE_UNITS);

  const perUnit = await genPool(sampled, PLACEMENT_GEN_CONCURRENCY, async (u) => {
    const segs = String(u.code).split(".");
    const ctx: PlacementUnitCtx = {
      code: u.code,
      levelIndex: parseInt(segs[0] ?? "1", 10) || 1,
      stageCode: segs.length >= 2 ? `${segs[0]}.${segs[1]}` : null,
      name: u.name,
      goal: u.goal,
      keyConcepts: Array.isArray(u.keyConcepts) ? (u.keyConcepts as any[]).map(String) : [],
      lessons: (lessonsByUnit.get(u.id) ?? []).slice().sort((a, b) => compareCodes(a.code, b.code)).map((l) => l.name),
      concepts: (conceptsByUnit.get(u.id) ?? []).map((c) => ({ name: c.name, criterion: c.masteryCriterion ?? "" })),
    };
    try {
      const result = await generateGeminiJson({
        userPrompt: buildPlacementGenPrompt(ctx),
        model: PLACEMENT_GEN_MODEL,
        temperature: 0.6,
        maxOutputTokens: 3072,
        timeoutMs: 60_000,
        logTag: "v4-placement-gen",
      });
      return { ctx, questions: parsePlacementGen(result.text) };
    } catch (e: any) {
      logger.warn({ unit: u.code, err: e?.message }, "[v4] placement question gen failed for unit");
      return { ctx, questions: [] as ParsedGenQ[] };
    }
  });

  const out: GeneratedPlacementQuestion[] = [];
  let id = 0;
  const unitsCovered = new Set<string>();
  for (const r of perUnit) {
    let kept = 0;
    for (const q of r.questions) {
      if (kept >= PLACEMENT_PER_UNIT) break;
      out.push({
        id,
        questionIndex: id,
        targetLevelIndex: r.ctx.levelIndex,
        targetStageCode: r.ctx.stageCode,
        targetUnitCode: r.ctx.code,
        kind: "mcq",
        prompt: q.prompt,
        choices: q.choices,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
      });
      id++; kept++;
    }
    if (kept > 0) unitsCovered.add(r.ctx.code);
  }

  // Need a pool big enough AND spread across enough distinct units for the
  // binary search to be meaningful. Clamp the unit floor to what the sample can
  // physically yield so a genuinely tiny specialty still falls back gracefully
  // instead of being permanently blocked.
  const minUnits = Math.min(PLACEMENT_MIN_UNITS, sampled.length);
  if (out.length < PLACEMENT_MIN_POOL || unitsCovered.size < minUnits) {
    throw new Error(`too_few_placement_questions: ${out.length} across ${unitsCovered.size} units`);
  }
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
  /** Strengths/weaknesses snapshot from the placement descent (placement mode
   *  only). Persisted verbatim for the AI teacher; undefined leaves the column
   *  untouched on conflict so a from_zero re-setup can't wipe an earlier one. */
  placementProfile?: PlacementProfile | null;
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
      ...(opts.placementProfile !== undefined ? { placementProfile: opts.placementProfile } : {}),
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
        // undefined → omitted → existing profile preserved across a re-setup.
        ...(opts.placementProfile !== undefined ? { placementProfile: opts.placementProfile } : {}),
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
 * Legacy level-only fallback. Places the student at the FIRST level where they
 * did NOT demonstrate mastery (correct ratio ≥ 0.66) — i.e. highest mastered
 * level + 1; untested levels after a pass also advance (no under-placement
 * bias). Defaults to 1 (everyone starts at level 1 — "from zero" is a separate
 * branch handled by the choice screen, NOT the placement engine). The caller
 * `computeUnlocked` clamps the returned index to the curriculum's level count.
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
      question: AnyPlacementQuestion;
      scope: PlacementScope;
      scopeCode: string;
      targetLevelIndex: number;
      phaseLabel: string;
      confidencePct?: number;
    }
  | { kind: "done"; result: PlacementResult };

/** True when the active version has at least one unit-tagged placement
 *  question (otherwise we run the legacy level-only flow for back-compat). */
export function usesUnitTargeting(questions: V4PlacementTestQuestion[]): boolean {
  return questions.some((q) => !!q.targetUnitCode);
}

// Adaptive binary-search thresholds. best-of-3 per unit resists a single
// fluke: 2 correct ⇒ pass, 2 wrong ⇒ fail, otherwise keep probing (up to 3).
const UNIT_PASS_NEED = 2;
const UNIT_FAIL_NEED = 2;
const UNIT_MAX_PROBES = 3;
const MAX_PLACEMENT_QUESTIONS = 18;

/** Soft cap on the number of placement questions (exposed for the route/UI). */
export const PLACEMENT_SOFT_CAP = MAX_PLACEMENT_QUESTIONS;

function unitVerdict(correct: number, wrong: number, available: number): "pass" | "fail" | "pending" {
  if (correct >= UNIT_PASS_NEED) return "pass";
  if (wrong >= UNIT_FAIL_NEED) return "fail";
  const cap = Math.min(UNIT_MAX_PROBES, Math.max(1, available));
  if (correct + wrong >= cap) return correct >= wrong ? "pass" : "fail";
  return "pending";
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
 * Adaptive binary-search placement. Pure over the graded `probes`: returns the
 * next question to ASK, or the final placement when the search converges.
 *
 * The `questions` form a stratified sample of units spread across the whole
 * curriculum. We binary-search the ordered sample for the boundary between the
 * units the student has mastered and the ones they haven't:
 *   • best-of-3 per unit (UNIT_PASS_NEED / UNIT_FAIL_NEED) → fluke-resistant;
 *   • narrow [lo, hi) over the sampled units until the bounds meet;
 *   • place CONSERVATIVELY at the first unit after the highest proven-mastered
 *     unit, so the student is never dropped into material they haven't shown
 *     mastery of (worst case: a few review units they breeze through).
 */
export function evaluatePlacement(
  resolved: ResolvedSpecialty,
  questions: AnyPlacementQuestion[],
  probes: PlacementProbe[],
): PlacementStep {
  // Ordered list of sampled units that actually have at least one question.
  const codesWithQ = new Set(
    questions.filter((q) => !!q.targetUnitCode).map((q) => q.targetUnitCode as string),
  );
  const targetUnits = resolved.units
    .filter((u) => codesWithQ.has(u.unitCode))
    .sort((a, b) => compareCodes(a.unitCode, b.unitCode));
  const M = targetUnits.length;

  if (M === 0) {
    const lastUnit = resolved.units[resolved.units.length - 1] ?? null;
    return doneResult(resolved, lastUnit?.unitCode ?? null, "no_unit_questions");
  }

  const realIndexByCode = new Map<string, number>();
  resolved.units.forEach((u, i) => realIndexByCode.set(u.unitCode, i));

  type Tally = { correct: number; wrong: number };
  const tally = new Map<string, Tally>();
  for (const p of probes) {
    if (p.scope !== "unit") continue;
    const t = tally.get(p.scopeCode) ?? { correct: 0, wrong: 0 };
    if (p.correct) t.correct++; else t.wrong++;
    tally.set(p.scopeCode, t);
  }

  const askedIds = new Set(probes.map((p) => p.questionId));
  const poolFor = (code: string): AnyPlacementQuestion[] =>
    questions
      .filter((q) => q.targetUnitCode === code)
      .sort((a, b) => (a.difficulty - b.difficulty) || (a.questionIndex - b.questionIndex));

  const verdictAt = (i: number): "pass" | "fail" | "pending" => {
    const code = targetUnits[i].unitCode;
    const t = tally.get(code) ?? { correct: 0, wrong: 0 };
    return unitVerdict(t.correct, t.wrong, poolFor(code).length);
  };
  const probedAt = (i: number): boolean => {
    const t = tally.get(targetUnits[i].unitCode);
    return !!t && (t.correct + t.wrong) > 0;
  };

  // Decided bounds: highest known-passed sampled idx, lowest known-failed idx.
  let highestPass = -1;
  let lowestFail = M;
  for (let i = 0; i < M; i++) {
    const v = verdictAt(i);
    if (v === "pass") highestPass = Math.max(highestPass, i);
    if (v === "fail") lowestFail = Math.min(lowestFail, i);
  }

  const lo = highestPass + 1;
  const hi = lowestFail;
  const width = Math.max(0, hi - lo);
  const confidencePct = Math.max(5, Math.min(99, Math.round((1 - width / M) * 100)));
  const capped = probes.length >= MAX_PLACEMENT_QUESTIONS;

  const askAt = (i: number): PlacementStep | null => {
    const unit = targetUnits[i];
    const q = poolFor(unit.unitCode).find((qq) => !askedIds.has(qq.id));
    if (!q) return null;
    return {
      kind: "ask",
      question: q,
      scope: "unit",
      scopeCode: unit.unitCode,
      targetLevelIndex: unit.levelIndex,
      phaseLabel: "نضبط مستواك",
      confidencePct,
    };
  };

  if (lo < hi && !capped) {
    // 1) Finish an in-progress (probed but undecided) unit first (best-of-3).
    for (let i = lo; i < hi; i++) {
      if (probedAt(i) && verdictAt(i) === "pending") {
        const step = askAt(i);
        if (step) return step;
      }
    }
    // 2) Otherwise probe the midpoint of the undecided sampled range.
    const step = askAt(Math.floor((lo + hi) / 2));
    if (step) return step;
    // Pool exhausted at the midpoint → fall through to placement.
  }

  // ── Converged (or capped) → place CONSERVATIVELY at the first unmastered unit ─
  const realLo = highestPass >= 0 ? (realIndexByCode.get(targetUnits[highestPass].unitCode) ?? -1) : -1;
  const realHi = lowestFail < M
    ? (realIndexByCode.get(targetUnits[lowestFail].unitCode) ?? resolved.units.length)
    : resolved.units.length;

  // Passed everything → mastered the whole curriculum.
  if (realHi >= resolved.units.length) {
    const lastUnit = resolved.units[resolved.units.length - 1] ?? null;
    return doneResult(resolved, lastUnit?.unitCode ?? null, "mastered_all");
  }
  // Failed the very first probed unit → start at the very beginning.
  if (realLo < 0) {
    const firstUnit = resolved.units[0] ?? null;
    return doneResult(resolved, firstUnit?.unitCode ?? null, "from_start");
  }
  // Conservative placement: start at the first unit AFTER the highest proven-
  // mastered unit. The search only has positive evidence of mastery at realLo
  // and of failure at realHi; everything in (realLo, realHi) is UNTESTED, so
  // splitting the difference (the old midpoint) risks dropping the student into
  // material they never demonstrated mastery of. Starting at realLo+1 guarantees
  // no over-placement — worst case they breeze through a few known review units.
  let start = realLo + 1;
  if (start > realHi) start = realHi;
  const boundary = resolved.units[start] ?? resolved.units[realHi] ?? null;
  return doneResult(resolved, boundary?.unitCode ?? null, capped ? "capped_boundary" : "binary_search_boundary");
}

// ── Placement strengths/weaknesses profile ──────────────────────────────────
// Durable summary of WHAT the student demonstrated during the adaptive descent,
// persisted on the student path so the AI teacher can personalize from the very
// first lesson (e.g. "you struggled with loops, let's reinforce them"). The raw
// per-question probes live in v4_placement_sessions; this is the distilled,
// teacher-facing view keyed by unit.
export type PlacementProfileUnit = {
  unitCode: string;
  unitName: string | null;
  levelIndex: number;
  stageCode: string | null;
  correct: number;
  wrong: number;
};

export type PlacementProfile = {
  /** The unit the student was ultimately placed at (start point). */
  placedUnitCode: string | null;
  /** Why placement converged here (mastered_all / binary_search_boundary / …). */
  reason: string;
  /** Total graded probes asked during the descent. */
  totalQuestions: number;
  /** ISO timestamp the profile was captured. */
  capturedAt: string;
  /** Units the student demonstrated mastery of (more correct than wrong). */
  strengths: PlacementProfileUnit[];
  /** Units the student struggled with (more wrong than correct). */
  weaknesses: PlacementProfileUnit[];
};

/**
 * Distil the graded `probes` of a completed placement descent into a
 * teacher-facing strengths/weaknesses snapshot. Pure — the caller supplies the
 * unit-name lookup (names are not carried on ResolvedUnit). Returns null when
 * there were no unit-scoped probes (e.g. from_zero / level-only placement).
 */
export function buildPlacementProfile(
  resolved: ResolvedSpecialty,
  probes: PlacementProbe[],
  result: PlacementResult,
  unitNameByCode: Map<string, string>,
): PlacementProfile | null {
  const unitByCode = new Map(resolved.units.map((u) => [u.unitCode, u]));
  type Tally = { correct: number; wrong: number };
  const tally = new Map<string, Tally>();
  for (const p of probes) {
    if (p.scope !== "unit") continue;
    const t = tally.get(p.scopeCode) ?? { correct: 0, wrong: 0 };
    if (p.correct) t.correct++; else t.wrong++;
    tally.set(p.scopeCode, t);
  }
  if (tally.size === 0) return null;

  const strengths: PlacementProfileUnit[] = [];
  const weaknesses: PlacementProfileUnit[] = [];
  for (const [code, t] of tally) {
    const u = unitByCode.get(code);
    const entry: PlacementProfileUnit = {
      unitCode: code,
      unitName: unitNameByCode.get(code) ?? null,
      levelIndex: u?.levelIndex ?? (parseInt(code.split(".")[0] ?? "0", 10) || 0),
      stageCode: u?.stageCode ?? null,
      correct: t.correct,
      wrong: t.wrong,
    };
    const verdict = unitVerdict(t.correct, t.wrong, t.correct + t.wrong);
    if (verdict === "pass") strengths.push(entry);
    else if (verdict === "fail") weaknesses.push(entry);
    else (entry.correct >= entry.wrong ? strengths : weaknesses).push(entry);
  }
  const byCode = (a: PlacementProfileUnit, b: PlacementProfileUnit) => compareCodes(a.unitCode, b.unitCode);
  strengths.sort(byCode);
  weaknesses.sort(byCode);

  return {
    placedUnitCode: result.unitCode ?? null,
    reason: result.reason,
    totalQuestions: probes.length,
    capturedAt: new Date().toISOString(),
    strengths,
    weaknesses,
  };
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
