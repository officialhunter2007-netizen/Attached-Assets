/**
 * v4-exam-evaluator.ts — Stateless Haiku-based grader for labs + exams.
 *
 * Two public functions, both pure (no DB writes, no session state, no
 * dependence on teaching prompts or student memory). Spec §13 demands the
 * grader is **isolated** from the teaching loop so its objectivity is
 * obvious to the student and to admins reviewing later.
 *
 *   - evaluateExamAnswer   — single exam question. MCQ with a known
 *                            correctIndex is graded deterministically for
 *                            free; everything else routes to Haiku.
 *   - evaluateLabAnswer    — single lab question (always free-form;
 *                            kinds: diagnostic|decision|application|
 *                            analysis|connection). Always uses Haiku and
 *                            ALWAYS returns a 0..100 score (not a boolean)
 *                            because lab completion is averaged.
 *
 * Haiku failure mode: returns `{score: 0, verdict: "wrong",
 * explanation: "تعذّر التقييم — حاول مجدداً"}` instead of throwing, so a
 * single network glitch never permanently fails a student attempt. The
 * caller decides whether to surface a friendly toast or persist anyway.
 */

import { generateGeminiJson } from "./openrouter-generate";
import { logger } from "./logger";

// Same OpenRouter id v4-path-engine uses for placement grading.
const HAIKU_MODEL = "anthropic/claude-haiku-4-5";

export type Verdict = "correct" | "partial" | "wrong";

export type EvalResult = {
  score: number;          // 0..100
  verdict: Verdict;
  explanation: string;    // ≤2 short Arabic sentences
  /**
   * True when the grader fell back to FAIL_RESULT due to a transport/parse
   * error — the answer was NOT actually evaluated. Caller uses this to
   * decide whether to refund gems and apologize instead of penalizing the
   * student for a network blip.
   */
  evaluatorFailed?: boolean;
};

export type ExamQuestionInput = {
  id: number;
  prompt: string;
  kind: string;                          // "mcq" | "short_answer" | "practical"
  choices?: string[] | null;
  correctIndex?: number | null;
  explanation?: string | null;           // teacher-authored rationale (optional)
  // v4.1 anchors — strongest grading signals when present.
  rubric?: string | null;                // criteria the grader scores against
  solutionOutline?: string | null;       // model answer outline / canonical solution
};

export type LabQuestionInput = {
  id: number;
  prompt: string;
  kind: string;                          // diagnostic|decision|application|analysis|connection
  scenario: string;                      // the lab scenario text (shared across the 5 Qs)
  completionCriterion: string;           // lab-level criterion used as grader anchor
  // v4.1 anchors — same role as on exam questions.
  rubric?: string | null;
  solutionOutline?: string | null;
};

const FAIL_RESULT: EvalResult = {
  score: 0,
  verdict: "wrong",
  explanation: "تعذّر التقييم الآن — لم تُحتسب هذه الإجابة، أعد المحاولة.",
  evaluatorFailed: true,
};

// ── Exam answer ────────────────────────────────────────────────────────────
export async function evaluateExamAnswer(
  q: ExamQuestionInput,
  rawAnswer: string | number | null,
): Promise<EvalResult> {
  // MCQ with known correctIndex → deterministic comparison (free).
  if (q.kind === "mcq" && typeof q.correctIndex === "number") {
    const picked = typeof rawAnswer === "number"
      ? rawAnswer
      : parseInt(String(rawAnswer ?? "-1"), 10);
    const correct = picked === q.correctIndex;
    return {
      score: correct ? 100 : 0,
      verdict: correct ? "correct" : "wrong",
      explanation: correct
        ? "إجابة صحيحة."
        : (q.explanation
            ? `الإجابة الصحيحة: الخيار ${q.correctIndex! + 1}. ${q.explanation}`
            : `الإجابة الصحيحة هي الخيار ${q.correctIndex! + 1}.`),
    };
  }

  const answerText = String(rawAnswer ?? "").trim();
  if (!answerText) {
    return { score: 0, verdict: "wrong", explanation: "لم تُدخل إجابة." };
  }

  const sys =
    "أنت مصحّح اختبارات تعليمية محايد. أنت لست معلماً ولست محادثاً — مهمتك " +
    "فقط تقييم إجابة طالب على سؤال. أعد JSON صرف بالشكل: " +
    "{\"verdict\":\"correct\"|\"partial\"|\"wrong\",\"score\":0..100,\"explanation\":\"…\"}. " +
    "score=100 لإجابة صحيحة كاملة، 60-90 لإجابة جزئية، 0-30 لخطأ. " +
    "explanation: جملة أو جملتان قصيرتان بالعربية تشرحان القرار.";
  const anchors: string[] = [];
  if (q.rubric) anchors.push(`معيار التصحيح (rubric):\n${q.rubric}`);
  if (q.solutionOutline) anchors.push(`الإجابة النموذجية المختصرة:\n${q.solutionOutline}`);
  if (!anchors.length && q.explanation) anchors.push(`الإجابة المرجعية: ${q.explanation}`);
  const user =
    `السؤال: ${q.prompt}\n\n` +
    (anchors.length ? anchors.join("\n\n") + "\n\n" : "") +
    `جواب الطالب: ${answerText}\n\n` +
    "قيّم الإجابة بالاستناد إلى المعيار والإجابة النموذجية أعلاه أولاً، ثم على " +
    "مدى دقّة المحتوى. لا تكافئ الإسهاب بل دقّة التطابق مع المعيار.";

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: HAIKU_MODEL,
      temperature: 0,
      maxOutputTokens: 250,
      timeoutMs: 18_000,
      logTag: "v4-exam-grade",
    });
    return parseEvalJson(res.text);
  } catch (e) {
    logger.warn?.(`[v4-exam-grade] q=${q.id} failed: ${String((e as any)?.message ?? e)}`);
    return FAIL_RESULT;
  }
}

// ── Lab answer ─────────────────────────────────────────────────────────────
export async function evaluateLabAnswer(
  q: LabQuestionInput,
  rawAnswer: string | null,
): Promise<EvalResult> {
  const answerText = String(rawAnswer ?? "").trim();
  if (!answerText) {
    return { score: 0, verdict: "wrong", explanation: "لم تُدخل إجابة." };
  }

  const kindAr = labKindArabic(q.kind);
  const sys =
    "أنت مصحّح معامل تعليمية محايد. لست معلماً — مهمتك تقييم إجابة طالب " +
    "على سؤال مرتبط بسيناريو معمل. أعد JSON صرف بالشكل: " +
    "{\"verdict\":\"correct\"|\"partial\"|\"wrong\",\"score\":0..100,\"explanation\":\"…\"}. " +
    "score=100 لإجابة موفّقة كاملة، 60-90 لإجابة جزئية أو ناقصة، 0-30 لخطأ جوهري. " +
    "explanation: جملة أو جملتان قصيرتان بالعربية تشرحان القرار.";
  const anchors: string[] = [];
  if (q.rubric) anchors.push(`معيار التصحيح (rubric):\n${q.rubric}`);
  if (q.solutionOutline) anchors.push(`خطوات الحل النموذجية:\n${q.solutionOutline}`);
  const user =
    `السيناريو: ${q.scenario}\n\n` +
    `معيار اكتمال المعمل: ${q.completionCriterion}\n\n` +
    `نوع السؤال: ${kindAr}\n` +
    `السؤال: ${q.prompt}\n\n` +
    (anchors.length ? anchors.join("\n\n") + "\n\n" : "") +
    `جواب الطالب: ${answerText}\n\n` +
    "قيّم الإجابة في ضوء المعيار والإجابة النموذجية أولاً، ثم في ضوء السيناريو.";

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: HAIKU_MODEL,
      temperature: 0,
      maxOutputTokens: 300,
      timeoutMs: 18_000,
      logTag: "v4-lab-grade",
    });
    return parseEvalJson(res.text);
  } catch (e) {
    logger.warn?.(`[v4-lab-grade] q=${q.id} failed: ${String((e as any)?.message ?? e)}`);
    return FAIL_RESULT;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseEvalJson(raw: string | undefined | null): EvalResult {
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    const v = String(parsed.verdict ?? "wrong").toLowerCase();
    const verdict: Verdict =
      v === "correct" ? "correct" : v === "partial" ? "partial" : "wrong";
    let score = Number(parsed.score);
    if (!Number.isFinite(score)) {
      score = verdict === "correct" ? 100 : verdict === "partial" ? 70 : 0;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    const explanation = typeof parsed.explanation === "string" && parsed.explanation.trim()
      ? String(parsed.explanation).trim().slice(0, 400)
      : (verdict === "correct" ? "إجابة صحيحة." : "إجابة غير دقيقة.");
    return { score, verdict, explanation };
  } catch {
    return FAIL_RESULT;
  }
}

function labKindArabic(kind: string): string {
  switch (kind) {
    case "diagnostic": return "تشخيصي";
    case "decision":   return "قرار";
    case "application":return "تطبيق";
    case "analysis":   return "تحليل";
    case "connection": return "ربط";
    default:           return kind;
  }
}
