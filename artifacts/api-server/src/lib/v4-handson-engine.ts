/**
 * v4-handson-engine.ts — PROACTIVE hands-on practice ("التطبيق العملي").
 *
 * Nukhba's core differentiator: from lesson 1, the moment a concept is grasped
 * the student PRODUCES/DOES something real that applies it — not a quiz, not a
 * definition recall. This engine generates ONE rich, Yemeni-context "produce"
 * task per concept (a scenario, a concrete deliverable, guiding steps) plus —
 * SERVER-SIDE ONLY — a rubric and a solution outline the isolated Haiku grader
 * scores the student's produced work against.
 *
 * Two pure jobs (billing/persistence live in routes/v4_handson.ts):
 *   1. getOrGenerateHandsOnTask — produce + cache ONE task per (version,
 *      lesson, concept) in v4_concept_hands_on, reused across every student +
 *      retry. Race-safe: a concurrent generator wins via ON CONFLICT DO NOTHING
 *      and everyone re-reads the same task.
 *   2. gradeHandsOnSubmission — grade the student's produced deliverable with
 *      the SAME isolated grader labs/exams use (rubric-aware, 0..100), so a
 *      hands-on score is as objective as a lab score.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  v4ConceptHandsOnTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
} from "@workspace/db";
import { generateGeminiJson } from "./openrouter-generate";
import { evaluateLabAnswer, type EvalResult } from "./v4-exam-evaluator";
import { V4_TEACHING_MODEL } from "./v4-teaching-core";
import { getTeacherProviderOverride } from "./ai-teacher-provider";
import { logger } from "./logger";

export type HandsOnTask = {
  /** Short Arabic label for the pinned card header. */
  title: string;
  /** Realistic Yemeni-context situation the task lives in. */
  scenario: string;
  /** The concrete thing the student must PRODUCE/DO — the heart of the task. */
  deliverable: string;
  /** 2–5 guiding steps (student-facing). */
  steps: string[];
  /** Grading criteria — SERVER-SIDE ONLY, never sent to the client. */
  rubric: string;
  /** Model-answer outline — SERVER-SIDE ONLY, never sent to the client. */
  solutionOutline: string;
};

/** A usable task needs at minimum a scenario + a concrete deliverable. */
function isUsableTask(t: any): t is HandsOnTask {
  return (
    !!t &&
    typeof t.scenario === "string" && t.scenario.trim().length > 0 &&
    typeof t.deliverable === "string" && t.deliverable.trim().length > 0
  );
}

/**
 * Return the cached hands-on task for a concept, generating + caching it on
 * first use. Returns null only when the concept is unknown or generation
 * produced nothing (caller surfaces a friendly error).
 */
export async function getOrGenerateHandsOnTask(opts: {
  versionId: number;
  lessonId: number;
  conceptIndex: number;
}): Promise<HandsOnTask | null> {
  const { versionId, lessonId, conceptIndex } = opts;

  const [hit] = await db
    .select()
    .from(v4ConceptHandsOnTable)
    .where(and(
      eq(v4ConceptHandsOnTable.versionId, versionId),
      eq(v4ConceptHandsOnTable.lessonId, lessonId),
      eq(v4ConceptHandsOnTable.conceptIndex, conceptIndex),
    ));
  if (hit && isUsableTask(hit.task)) return hit.task as HandsOnTask;

  const [concept] = await db
    .select()
    .from(v4LessonConceptsTable)
    .where(and(
      eq(v4LessonConceptsTable.lessonId, lessonId),
      eq(v4LessonConceptsTable.conceptIndex, conceptIndex),
    ));
  if (!concept) return null;

  const [lesson] = await db
    .select()
    .from(v4LessonsTable)
    .where(eq(v4LessonsTable.id, lessonId));
  const mistakes = await db
    .select()
    .from(v4LessonCommonMistakesTable)
    .where(eq(v4LessonCommonMistakesTable.lessonId, lessonId));

  const task = await generateHandsOnTask({
    conceptName: concept.name,
    explanation: concept.explanation,
    masteryCriterion: concept.masteryCriterion,
    lessonName: lesson?.name ?? "",
    mistakes: mistakes.map((m: any) => ({ mistake: m.mistake, correction: m.correction })),
  });
  if (!task) return null;

  // Cache for reuse. ON CONFLICT DO NOTHING so a concurrent generator that
  // already inserted wins; we then re-read whichever row exists.
  try {
    await db
      .insert(v4ConceptHandsOnTable)
      .values({ versionId, lessonId, conceptIndex, task })
      .onConflictDoNothing();
  } catch (e) {
    logger.warn?.(`[v4-handson] cache insert failed lesson=${lessonId} concept=${conceptIndex}: ${String((e as any)?.message ?? e)}`);
  }
  const [fresh] = await db
    .select()
    .from(v4ConceptHandsOnTable)
    .where(and(
      eq(v4ConceptHandsOnTable.versionId, versionId),
      eq(v4ConceptHandsOnTable.lessonId, lessonId),
      eq(v4ConceptHandsOnTable.conceptIndex, conceptIndex),
    ));
  return fresh && isUsableTask(fresh.task) ? (fresh.task as HandsOnTask) : task;
}

async function generateHandsOnTask(input: {
  conceptName: string;
  explanation: string;
  masteryCriterion: string;
  lessonName: string;
  mistakes: Array<{ mistake: string; correction: string }>;
}): Promise<HandsOnTask | null> {
  const mistakesBlock = input.mistakes.length
    ? "أخطاء شائعة احرص أن تكشفها المهمة وتعالجها:\n" +
      input.mistakes.slice(0, 4).map((m, i) => `${i + 1}. الخطأ: ${m.mistake} — الصواب: ${m.correction}`).join("\n")
    : "";
  const sys =
    "أنت مُصمّم مهامّ تطبيقية عملية بالعربية لمنصّة تعليمية يمنية. مهمتك توليد " +
    "مهمة «تطبيق عملي» واحدة يُنتج فيها الطالب شيئاً حقيقياً يطبّق به مفهوماً " +
    "واحداً محدّداً — ليست سؤال اختيار من متعدّد ولا استرجاع تعريف، بل إنتاج أو " +
    "تنفيذ فعلي يكتبه الطالب نصّاً (خطّة، تصميم، حساب، رسالة، كود، تحليل حالة…). " +
    "اجعل السياق يمنياً واقعياً (أسماء وأماكن ومهن محلية، والعملة بالريال اليمني " +
    "عند الحاجة). أعد JSON صرفاً فقط بالشكل: " +
    "{\"title\":\"عنوان قصير للمهمة\",\"scenario\":\"الموقف الواقعي\"," +
    "\"deliverable\":\"ما المطلوب أن يُنتجه الطالب بالضبط\"," +
    "\"steps\":[\"خطوة إرشادية\",\"خطوة إرشادية\"]," +
    "\"rubric\":\"معايير التصحيح بدقّة\",\"solution_outline\":\"مخطّط الإجابة النموذجية\"}. " +
    "اجعل المهمة قابلة للحلّ كتابياً في بضع دقائق، مركّزة على هذا المفهوم وحده، " +
    "وواقعية وملهمة تُشعر الطالب أنه طبّق ما تعلّمه فعلاً. اكتب rubric و" +
    "solution_outline بدقّة ليُصحَّح ناتج الطالب آلياً. لا تكتب أي نص خارج JSON.";
  const user =
    `الدرس: ${input.lessonName}\n` +
    `المفهوم المستهدف: ${input.conceptName}\n` +
    `شرح المفهوم: ${input.explanation}\n` +
    `معيار الإتقان: ${input.masteryCriterion}\n` +
    (mistakesBlock ? `\n${mistakesBlock}\n` : "") +
    `\nصمّم مهمة تطبيق عملي واحدة يطبّق فيها الطالب هذا المفهوم بإنتاج ناتج ملموس في سياق يمني واقعي.`;

  // Propagate admin model override so hands-on tasks are generated on the
  // same model as the teaching chat.
  let handsonProvider: { endpoint: string; apiKey: string; model: string } | null = null;
  try {
    const ov = await getTeacherProviderOverride();
    if (ov) handsonProvider = { endpoint: ov.endpoint, apiKey: ov.apiKey, model: ov.model };
  } catch { /* fall back to default */ }

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: V4_TEACHING_MODEL,
      provider: handsonProvider,
      temperature: 0.6,
      maxOutputTokens: 1400,
      timeoutMs: 30_000,
      logTag: "v4-handson-gen",
    });
    return parseHandsOnJson(res.text);
  } catch (e) {
    logger.warn?.(`[v4-handson-gen] failed: ${String((e as any)?.message ?? e)}`);
    return null;
  }
}

function parseHandsOnJson(raw: string | undefined | null): HandsOnTask | null {
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const scenario = str(obj.scenario);
    const deliverable = str(obj.deliverable);
    if (!scenario || !deliverable) return null;
    const steps = Array.isArray(obj.steps)
      ? obj.steps.map((s: unknown) => str(s)).filter((s: string) => s.length > 0).slice(0, 6)
      : [];
    const task: HandsOnTask = {
      title: str(obj.title) || "تطبيق عملي",
      scenario,
      deliverable,
      steps,
      rubric: str(obj.rubric) || str(obj.solution_outline) || str(obj.solutionOutline),
      solutionOutline: str(obj.solution_outline) || str(obj.solutionOutline),
    };
    return task;
  } catch {
    return null;
  }
}

/**
 * Grade the student's produced deliverable with the isolated Haiku grader
 * (same one labs/exams use). Returns a single 0..100 EvalResult; the route
 * turns the score into the new mastery (never lowering an existing higher
 * score) and marks the concept applied.
 */
export async function gradeHandsOnSubmission(opts: {
  conceptName: string;
  explanation: string;
  masteryCriterion: string;
  task: HandsOnTask;
  submission: string;
}): Promise<EvalResult> {
  const stepsBlock = opts.task.steps?.length
    ? `\nخطوات إرشادية للمهمة:\n${opts.task.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";
  const prompt = `المطلوب إنتاجه: ${opts.task.deliverable}${stepsBlock}`;
  return evaluateLabAnswer(
    {
      id: 1,
      prompt,
      kind: "application",
      scenario: `تطبيق عملي على مفهوم «${opts.conceptName}» — ${opts.task.scenario}`,
      completionCriterion: opts.masteryCriterion,
      rubric: opts.task.rubric || null,
      solutionOutline: opts.task.solutionOutline || null,
    },
    opts.submission,
  );
}
