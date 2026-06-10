/**
 * v4-practice-engine.ts — weakness-driven targeted practice ("gap filling").
 *
 * When the diagnostic engine flags a concept as weak, the teacher offers a
 * focused mini-drill. This engine has two pure jobs:
 *
 *   1. getOrGenerateConceptDrills — produce (and cache) a pool of ~6 practice
 *      questions laser-targeted at ONE concept, anchored on that concept's
 *      name/explanation/mastery_criterion and the lesson's common mistakes.
 *      Cached per (version, lesson, concept) like v4_lesson_content_cache so a
 *      concept is generated once and reused by every student (and across the
 *      same student's repeated practice).
 *
 *   2. gradeConceptDrill — grade the student's answers with the SAME isolated
 *      Haiku grader used for labs/exams (objective, rubric-aware), returning a
 *      0..100 score per question + an average. The route turns that average
 *      into the new mastery score (never lowering an existing higher score).
 *
 * Billing/persistence live in routes/v4_practice.ts — this module is pure.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  v4ConceptDrillsTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
} from "@workspace/db";
import { generateGeminiJson } from "./openrouter-generate";
import { evaluateLabAnswer, type EvalResult } from "./v4-exam-evaluator";
import { V4_TEACHING_MODEL } from "./v4-teaching-core";
import { logger } from "./logger";

export type ConceptDrillQuestion = {
  prompt: string;
  /** one of: diagnostic|decision|application|analysis|connection */
  kind: string;
  rubric?: string;
  solutionOutline?: string;
};

const VALID_KINDS = new Set(["diagnostic", "decision", "application", "analysis", "connection"]);
const TARGET_POOL = 6;

/**
 * Return the cached drill pool for a concept, generating + caching it on first
 * use. Race-safe: a concurrent generator's row wins via ON CONFLICT DO NOTHING
 * and everyone re-reads the same pool. Returns [] only if the concept is
 * unknown or generation produced nothing (caller surfaces a friendly error).
 */
export async function getOrGenerateConceptDrills(opts: {
  versionId: number;
  lessonId: number;
  conceptIndex: number;
}): Promise<ConceptDrillQuestion[]> {
  const { versionId, lessonId, conceptIndex } = opts;

  const [hit] = await db
    .select()
    .from(v4ConceptDrillsTable)
    .where(and(
      eq(v4ConceptDrillsTable.versionId, versionId),
      eq(v4ConceptDrillsTable.lessonId, lessonId),
      eq(v4ConceptDrillsTable.conceptIndex, conceptIndex),
    ));
  if (hit && Array.isArray(hit.questions) && hit.questions.length > 0) {
    return hit.questions as ConceptDrillQuestion[];
  }

  const [concept] = await db
    .select()
    .from(v4LessonConceptsTable)
    .where(and(
      eq(v4LessonConceptsTable.lessonId, lessonId),
      eq(v4LessonConceptsTable.conceptIndex, conceptIndex),
    ));
  if (!concept) return [];

  const [lesson] = await db
    .select()
    .from(v4LessonsTable)
    .where(eq(v4LessonsTable.id, lessonId));
  const mistakes = await db
    .select()
    .from(v4LessonCommonMistakesTable)
    .where(eq(v4LessonCommonMistakesTable.lessonId, lessonId));

  const questions = await generateDrillPool({
    conceptName: concept.name,
    explanation: concept.explanation,
    masteryCriterion: concept.masteryCriterion,
    lessonName: lesson?.name ?? "",
    mistakes: mistakes.map((m: any) => ({ mistake: m.mistake, correction: m.correction })),
  });
  if (questions.length === 0) return [];

  // Cache for reuse. ON CONFLICT DO NOTHING so a concurrent generator that
  // already inserted wins; we then re-read whichever row exists.
  try {
    await db
      .insert(v4ConceptDrillsTable)
      .values({ versionId, lessonId, conceptIndex, questions })
      .onConflictDoNothing();
  } catch (e) {
    logger.warn?.(`[v4-practice] cache insert failed lesson=${lessonId} concept=${conceptIndex}: ${String((e as any)?.message ?? e)}`);
  }
  const [fresh] = await db
    .select()
    .from(v4ConceptDrillsTable)
    .where(and(
      eq(v4ConceptDrillsTable.versionId, versionId),
      eq(v4ConceptDrillsTable.lessonId, lessonId),
      eq(v4ConceptDrillsTable.conceptIndex, conceptIndex),
    ));
  return (fresh?.questions as ConceptDrillQuestion[]) ?? questions;
}

async function generateDrillPool(input: {
  conceptName: string;
  explanation: string;
  masteryCriterion: string;
  lessonName: string;
  mistakes: Array<{ mistake: string; correction: string }>;
}): Promise<ConceptDrillQuestion[]> {
  const mistakesBlock = input.mistakes.length
    ? "أخطاء شائعة يجب أن تستهدفها بعض الأسئلة:\n" +
      input.mistakes.slice(0, 4).map((m, i) => `${i + 1}. الخطأ: ${m.mistake} — الصواب: ${m.correction}`).join("\n")
    : "";
  const sys =
    "أنت مُصمّم تمارين تعليمية بالعربية. مهمتك توليد بنك تمارين تطبيقية قصيرة " +
    "تُعالج ضعف الطالب في مفهوم واحد محدّد. أعد JSON صرفاً فقط بالشكل: " +
    "{\"questions\":[{\"prompt\":\"…\",\"kind\":\"diagnostic|decision|application|analysis|connection\"," +
    "\"rubric\":\"معيار تصحيح قصير\",\"solution_outline\":\"خطوات/مفتاح الإجابة النموذجية\"}]}. " +
    `أنشئ ${TARGET_POOL} أسئلة متنوّعة. كل سؤال قصير وقابل للحلّ كتابياً، ويستهدف المفهوم نفسه من زاوية مختلفة، ` +
    "ويتجنّب استرجاع التعريف المجرّد. اكتب rubric وsolution_outline لكل سؤال ليُصحَّح آلياً بدقّة. " +
    "لا تكتب أي نص خارج JSON.";
  const user =
    `الدرس: ${input.lessonName}\n` +
    `المفهوم المستهدف: ${input.conceptName}\n` +
    `شرح المفهوم: ${input.explanation}\n` +
    `معيار الإتقان: ${input.masteryCriterion}\n` +
    (mistakesBlock ? `\n${mistakesBlock}\n` : "") +
    `\nولّد ${TARGET_POOL} تمارين تطبيقية تُثبّت هذا المفهوم وتسدّ الثغرة.`;

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: V4_TEACHING_MODEL,
      temperature: 0.6,
      maxOutputTokens: 2200,
      timeoutMs: 30_000,
      logTag: "v4-practice-gen",
    });
    return parseDrillJson(res.text);
  } catch (e) {
    logger.warn?.(`[v4-practice-gen] failed: ${String((e as any)?.message ?? e)}`);
    return [];
  }
}

function parseDrillJson(raw: string | undefined | null): ConceptDrillQuestion[] {
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    const arr = Array.isArray(parsed?.questions) ? parsed.questions : Array.isArray(parsed) ? parsed : [];
    const out: ConceptDrillQuestion[] = [];
    for (const q of arr) {
      const prompt = typeof q?.prompt === "string" ? q.prompt.trim() : "";
      if (!prompt) continue;
      let kind = typeof q?.kind === "string" ? q.kind.trim().toLowerCase() : "application";
      if (!VALID_KINDS.has(kind)) kind = "application";
      const rubric = typeof q?.rubric === "string" ? q.rubric.trim() : undefined;
      const solutionOutline =
        typeof q?.solution_outline === "string" ? q.solution_outline.trim()
        : typeof q?.solutionOutline === "string" ? q.solutionOutline.trim()
        : undefined;
      out.push({ prompt, kind, rubric: rubric || undefined, solutionOutline: solutionOutline || undefined });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Grade a set of drill answers with the isolated Haiku grader (same one labs
 * use). Returns per-question results + the rounded average (0..100).
 */
export async function gradeConceptDrill(opts: {
  conceptName: string;
  explanation: string;
  masteryCriterion: string;
  questions: ConceptDrillQuestion[];
  answers: string[];
}): Promise<{ perQuestion: EvalResult[]; avg: number }> {
  const scenario = `تدريب موجَّه على مفهوم «${opts.conceptName}»: ${opts.explanation}`;
  const perQuestion = await Promise.all(
    opts.questions.map((q, i) =>
      evaluateLabAnswer(
        {
          id: i + 1,
          prompt: q.prompt,
          kind: VALID_KINDS.has(q.kind) ? q.kind : "application",
          scenario,
          completionCriterion: opts.masteryCriterion,
          rubric: q.rubric ?? null,
          solutionOutline: q.solutionOutline ?? null,
        },
        opts.answers[i] ?? "",
      ),
    ),
  );
  const avg = perQuestion.length
    ? Math.round(perQuestion.reduce((a, r) => a + r.score, 0) / perQuestion.length)
    : 0;
  return { perQuestion, avg };
}
