/**
 * v4-concept-facets-engine.ts — the two MIDDLE facets of the 3-facet teaching
 * model (the conceptual-completeness layer).
 *
 * The 3 facets of "practical mastery" of a concept are:
 *   • W1 «ماذا»   — behavior / what it does       → existing mastery `score`.
 *   • W2 «لماذا»  — rationale / why it's this way  → THIS engine.
 *   • W3 «الحدود» — boundary / what varies freely vs what BREAKS it, plus the
 *                   exact error and WHY                → THIS engine.
 *
 * PROBLEM this solves: the weak teacher explains W1 (e.g. print("hello") prints
 * text) but skips W2 (why the parens, why the quotes) and W3 (print(hi") →
 * SyntaxError and WHY). Left to the weak model those facets are covered
 * inconsistently. So we move the content OUT of the weak model: generate ONE
 * rich, server-authored nugget per concept holding the rationale + the
 * boundary/break + (server-side only) a rubric and solution outline the
 * isolated grader scores the student's predictions against. The teacher only
 * DELIVERS the nugget + runs predict-then-reveal.
 *
 * Two pure jobs (persistence of per-facet COVERAGE STATE lives on the mastery
 * row + routes/v4_teach.ts; this engine owns the cache + grading primitive):
 *   1. getOrGenerateConceptFacets — produce + cache ONE nugget per (version,
 *      lesson, concept) in v4_concept_facets, reused across every student.
 *      Race-safe via ON CONFLICT DO NOTHING. Generated LAZILY (caller only
 *      invokes it when the engine picks a W2/W3 move for an important concept).
 *   2. gradeFacetAnswer — grade the student's predict-then-reveal answer for a
 *      single facet with the SAME isolated Haiku grader labs/exams use, so a
 *      facet score is as objective as a lab score.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  v4ConceptFacetsTable,
  v4ConceptMasteryTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  type V4ConceptFacets,
} from "@workspace/db";
import { generateGeminiJson } from "./openrouter-generate";
import { evaluateLabAnswer, type EvalResult } from "./v4-exam-evaluator";
import { V4_TEACHING_MODEL } from "./v4-teaching-core";
import { getTeacherProviderOverride } from "./ai-teacher-provider";
import { logger } from "./logger";

/** W2 «لماذا» — the rationale facet. */
export type FacetW2Nugget = {
  /** The WHY, in 1–2 plain Yemeni-Arabic sentences (the teacher reveals this). */
  rationale: string;
  /** Predict-then-reveal question to ASK before revealing the rationale. */
  predictPrompt: string;
  /** Grading criteria — SERVER-SIDE ONLY. */
  rubric: string;
  /** Model-answer outline — SERVER-SIDE ONLY. */
  solutionOutline: string;
};

/** W3 «الحدود» — the boundary / break facet. */
export type FacetW3Nugget = {
  /** What the student can change without breaking it (the free dimension). */
  variesFreely: string;
  /** The specific deviation that BREAKS it. */
  breaks: string;
  /** The exact error/symptom that results AND why it happens. */
  errorAndWhy: string;
  /** Predict-then-reveal question ("توقّع: وش يصير لو…"). */
  predictPrompt: string;
  /** Grading criteria — SERVER-SIDE ONLY. */
  rubric: string;
  /** Model-answer outline — SERVER-SIDE ONLY. */
  solutionOutline: string;
};

export type V4FacetNuggets = {
  w2: FacetW2Nugget;
  w3: FacetW3Nugget;
};

export type FacetKey = "w2" | "w3";

/** A usable nugget set needs a rationale (W2) AND a break (W3) at minimum. */
function isUsableNuggets(n: any): n is V4FacetNuggets {
  return (
    !!n &&
    !!n.w2 && typeof n.w2.rationale === "string" && n.w2.rationale.trim().length > 0 &&
    !!n.w3 && typeof n.w3.breaks === "string" && n.w3.breaks.trim().length > 0
  );
}

/**
 * Return the cached facet nuggets for a concept, generating + caching them on
 * first use. Returns null only when the concept is unknown or generation
 * produced nothing (caller falls back to generic, model-authored coverage).
 */
export async function getOrGenerateConceptFacets(opts: {
  versionId: number;
  lessonId: number;
  conceptIndex: number;
}): Promise<V4FacetNuggets | null> {
  const { versionId, lessonId, conceptIndex } = opts;

  const [hit] = await db
    .select()
    .from(v4ConceptFacetsTable)
    .where(and(
      eq(v4ConceptFacetsTable.versionId, versionId),
      eq(v4ConceptFacetsTable.lessonId, lessonId),
      eq(v4ConceptFacetsTable.conceptIndex, conceptIndex),
    ));
  if (hit && isUsableNuggets(hit.nuggets)) return hit.nuggets as V4FacetNuggets;

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

  const nuggets = await generateConceptFacets({
    conceptName: concept.name,
    explanation: concept.explanation,
    masteryCriterion: concept.masteryCriterion,
    lessonName: lesson?.name ?? "",
    mistakes: mistakes.map((m: any) => ({
      mistake: m.mistake,
      correction: m.correction,
      treatment: m.treatment,
    })),
  });
  if (!nuggets) return null;

  // Cache for reuse. ON CONFLICT DO NOTHING so a concurrent generator that
  // already inserted wins; we then re-read whichever row exists.
  try {
    await db
      .insert(v4ConceptFacetsTable)
      .values({ versionId, lessonId, conceptIndex, nuggets })
      .onConflictDoNothing();
  } catch (e) {
    logger.warn?.(`[v4-facets] cache insert failed lesson=${lessonId} concept=${conceptIndex}: ${String((e as any)?.message ?? e)}`);
  }
  const [fresh] = await db
    .select()
    .from(v4ConceptFacetsTable)
    .where(and(
      eq(v4ConceptFacetsTable.versionId, versionId),
      eq(v4ConceptFacetsTable.lessonId, lessonId),
      eq(v4ConceptFacetsTable.conceptIndex, conceptIndex),
    ));
  return fresh && isUsableNuggets(fresh.nuggets) ? (fresh.nuggets as V4FacetNuggets) : nuggets;
}

async function generateConceptFacets(input: {
  conceptName: string;
  explanation: string;
  masteryCriterion: string;
  lessonName: string;
  mistakes: Array<{ mistake: string; correction: string; treatment: string }>;
}): Promise<V4FacetNuggets | null> {
  // The lesson's recorded common mistakes are the best seed for the W3
  // boundary/break facet — they ARE the deviations that break the concept.
  const mistakesBlock = input.mistakes.length
    ? "الأخطاء الشائعة المسجّلة لهذا الدرس (استعن بها لصياغة وجه «الحدود» إن ناسبت هذا المفهوم تحديداً):\n" +
      input.mistakes.slice(0, 5).map((m, i) =>
        `${i + 1}. الخطأ: ${m.mistake} — الصواب: ${m.correction}${m.treatment ? ` — العلاج: ${m.treatment}` : ""}`,
      ).join("\n")
    : "";

  const sys =
    "أنت خبير تربوي يصمّم «اكتمال الفهم» لمفهوم تعليمي واحد بالعربية لمنصّة يمنية. " +
    "هدفك سدّ ثغرتين يغفلهما المعلّم العادي: (W2) «لماذا» المفهوم بهذا الشكل بالضبط، " +
    "و(W3) «الحدود» — ما الذي يتغيّر بحرية دون أن ينكسر، وما الذي يكسره، والخطأ الناتج " +
    "ولماذا يحدث. اجعل كل شيء محسوساً وبسيطاً ودقيقاً، بلا حشو ولا مبالغة. " +
    "أعد JSON صرفاً فقط بهذا الشكل تماماً:\n" +
    "{\n" +
    '  "w2": {\n' +
    '    "rationale": "العلّة في جملة أو جملتين: لماذا هذا الشكل/البناء بالذات",\n' +
    '    "predict_prompt": "سؤال توقّع قصير يقود الطالب لاكتشاف العلّة بنفسه قبل كشفها",\n' +
    '    "rubric": "معايير تصحيح دقيقة لإجابة الطالب عن العلّة",\n' +
    '    "solution_outline": "مخطّط الإجابة النموذجية للعلّة"\n' +
    "  },\n" +
    '  "w3": {\n' +
    '    "varies_freely": "ما الذي يمكن للطالب تغييره دون أن ينكسر المفهوم",\n' +
    '    "breaks": "الانحراف المحدّد الذي يكسر المفهوم",\n' +
    '    "error_and_why": "الخطأ/العَرَض الناتج بالضبط وسبب حدوثه",\n' +
    '    "predict_prompt": "سؤال «توقّع: وش يصير لو…» يطلب من الطالب توقّع نتيجة الكسر",\n' +
    '    "rubric": "معايير تصحيح دقيقة لتوقّع الطالب",\n' +
    '    "solution_outline": "مخطّط الإجابة النموذجية للحدّ/الكسر"\n' +
    "  }\n" +
    "}\n" +
    "اجعل predict_prompt في كل وجه سؤالاً واحداً قصيراً مناسباً للطرح المباشر على الطالب. " +
    "لا تكتب أي نص خارج JSON.";

  const user =
    `الدرس: ${input.lessonName}\n` +
    `المفهوم المستهدف: ${input.conceptName}\n` +
    `شرح المفهوم (وجه «ماذا» المعروف مسبقاً): ${input.explanation}\n` +
    `معيار الإتقان: ${input.masteryCriterion}\n` +
    (mistakesBlock ? `\n${mistakesBlock}\n` : "") +
    `\nصمّم وجهَي «لماذا» و«الحدود» لهذا المفهوم تحديداً، بحيث يكمل بهما فهم الطالب فهماً عملياً ناضجاً.`;

  // Propagate admin model override so the facet generator uses the same
  // model as the teaching chat (Flash / Haiku / default Flash Lite).
  let facetProvider: { endpoint: string; apiKey: string; model: string } | null = null;
  try {
    const ov = await getTeacherProviderOverride();
    if (ov) facetProvider = { endpoint: ov.endpoint, apiKey: ov.apiKey, model: ov.model };
  } catch { /* fall back to default */ }

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt: user,
      model: V4_TEACHING_MODEL,
      provider: facetProvider,
      temperature: 0.5,
      maxOutputTokens: 1400,
      timeoutMs: 30_000,
      logTag: "v4-facets-gen",
    });
    return parseFacetsJson(res.text);
  } catch (e) {
    logger.warn?.(`[v4-facets-gen] failed: ${String((e as any)?.message ?? e)}`);
    return null;
  }
}

function parseFacetsJson(raw: string | undefined | null): V4FacetNuggets | null {
  try {
    const parsed = JSON.parse(String(raw ?? "{}"));
    const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
    const w2raw = obj.w2 && typeof obj.w2 === "object" ? obj.w2 : {};
    const w3raw = obj.w3 && typeof obj.w3 === "object" ? obj.w3 : {};

    const w2: FacetW2Nugget = {
      rationale: str(w2raw.rationale),
      predictPrompt: str(w2raw.predict_prompt) || str(w2raw.predictPrompt),
      rubric: str(w2raw.rubric) || str(w2raw.solution_outline) || str(w2raw.solutionOutline),
      solutionOutline: str(w2raw.solution_outline) || str(w2raw.solutionOutline),
    };
    const w3: FacetW3Nugget = {
      variesFreely: str(w3raw.varies_freely) || str(w3raw.variesFreely),
      breaks: str(w3raw.breaks),
      errorAndWhy: str(w3raw.error_and_why) || str(w3raw.errorAndWhy),
      predictPrompt: str(w3raw.predict_prompt) || str(w3raw.predictPrompt),
      rubric: str(w3raw.rubric) || str(w3raw.solution_outline) || str(w3raw.solutionOutline),
      solutionOutline: str(w3raw.solution_outline) || str(w3raw.solutionOutline),
    };

    const nuggets: V4FacetNuggets = { w2, w3 };
    return isUsableNuggets(nuggets) ? nuggets : null;
  } catch {
    return null;
  }
}

/**
 * Grade the student's predict-then-reveal answer for ONE facet with the
 * isolated Haiku grader (same one labs/exams use). Returns a single
 * 0..100 EvalResult; the caller writes it monotonically into the facet's
 * coverage state. The facet's predict prompt is the question, and its
 * server-side rubric + solution outline drive the score.
 */
export async function gradeFacetAnswer(opts: {
  facet: FacetKey;
  conceptName: string;
  masteryCriterion: string;
  nuggets: V4FacetNuggets;
  submission: string;
}): Promise<EvalResult> {
  const n = opts.facet === "w2" ? opts.nuggets.w2 : opts.nuggets.w3;
  const facetLabel = opts.facet === "w2" ? "لماذا (العلّة)" : "الحدود (التعميم والكسر)";
  return evaluateLabAnswer(
    {
      id: 1,
      prompt: n.predictPrompt,
      kind: "analysis",
      scenario: `فحص وجه «${facetLabel}» للمفهوم «${opts.conceptName}»`,
      completionCriterion: opts.masteryCriterion,
      rubric: n.rubric || null,
      solutionOutline: n.solutionOutline || null,
    },
    opts.submission,
  );
}

/** Score at/above which a single facet attempt counts as covered. */
const FACET_PASS = 70;
/** Hard cap: after this many graded attempts a facet is marked covered to keep
 *  the lesson moving ("دون مبالغة") even if the student never fully nailed it.
 *  ع٥ — raised from 2 to 3: two attempts is too aggressive (marks a facet
 *  covered even when the student scored 0 on both); three attempts gives one
 *  genuine extra chance before the engine moves on. */
const FACET_ATTEMPT_CAP = 3;

/**
 * Mark a concept's middle facet as PENDING a grade — i.e. the directive just
 * asked the student this facet's predict-then-reveal question, so the student's
 * NEXT message should be graded against it (see gradePendingFacet). Monotonic:
 * preserves existing W2/W3 coverage; idempotent when already pending the same
 * facet. No-op when the concept has no mastery row yet (facet moves only fire
 * for grasped concepts, which always have one).
 */
export async function markFacetPending(opts: {
  userId: number;
  lessonId: number;
  conceptIndex: number;
  facet: FacetKey;
}): Promise<void> {
  const [row] = await db
    .select({ facets: v4ConceptMasteryTable.facets })
    .from(v4ConceptMasteryTable)
    .where(and(
      eq(v4ConceptMasteryTable.userId, opts.userId),
      eq(v4ConceptMasteryTable.lessonId, opts.lessonId),
      eq(v4ConceptMasteryTable.conceptIndex, opts.conceptIndex),
    ));
  if (!row) return;
  const cur: V4ConceptFacets = row.facets ?? {};
  if (cur.pending?.facet === opts.facet) return; // already pending — no churn
  const merged: V4ConceptFacets = {
    ...cur,
    pending: { facet: opts.facet, askedAt: new Date().toISOString() },
  };
  await db
    .update(v4ConceptMasteryTable)
    .set({ facets: merged })
    .where(and(
      eq(v4ConceptMasteryTable.userId, opts.userId),
      eq(v4ConceptMasteryTable.lessonId, opts.lessonId),
      eq(v4ConceptMasteryTable.conceptIndex, opts.conceptIndex),
    ));
}

/**
 * If the student has a PENDING facet (asked last turn), grade their current
 * message against that facet's server-side rubric with the isolated grader and
 * fold the result into the concept's facet coverage — then clear the pending
 * flag. Call this at the START of a teach turn, BEFORE building the prompt, so
 * the fresh diagnostic decision sees the updated W2/W3 coverage (advance to the
 * next facet on a pass; re-ask once on a miss; stop at the 2-attempt cap).
 *
 * Monotonic: the stored score only ever rises. Grader failure is non-fatal —
 * the attempt still counts (so a persistently failing grader can't trap the
 * student) and pending is cleared. Cheap when nothing is pending: one indexed
 * read, no grader call.
 */
export async function gradePendingFacet(opts: {
  userId: number;
  versionId: number;
  lessonId: number;
  studentMessage: string;
  concepts: Array<{ conceptIndex: number; name: string; masteryCriterion: string }>;
}): Promise<void> {
  const rows = await db
    .select({
      conceptIndex: v4ConceptMasteryTable.conceptIndex,
      facets: v4ConceptMasteryTable.facets,
    })
    .from(v4ConceptMasteryTable)
    .where(and(
      eq(v4ConceptMasteryTable.userId, opts.userId),
      eq(v4ConceptMasteryTable.lessonId, opts.lessonId),
    ))
    // Deterministic root-cause-first pick if more than one concept ever holds a
    // pending flag (should not happen under the per-(user,lesson) turn lock, but
    // cheap hardening against a crash between clear and re-mark).
    .orderBy(v4ConceptMasteryTable.conceptIndex);
  const pendingRow = rows.find((r) => r.facets?.pending?.facet);
  if (!pendingRow || !pendingRow.facets.pending) return;

  const facet = pendingRow.facets.pending.facet;
  const conceptIndex = pendingRow.conceptIndex;
  const concept = opts.concepts.find((c) => c.conceptIndex === conceptIndex);
  const prev = pendingRow.facets[facet];
  const prevScore = prev?.score ?? null;
  const attempts = (prev?.attempts ?? 0) + 1;
  let covered = prev?.covered === true;
  let score = prevScore;

  if (concept && opts.studentMessage.trim().length > 0) {
    try {
      const nuggets = await getOrGenerateConceptFacets({
        versionId: opts.versionId,
        lessonId: opts.lessonId,
        conceptIndex,
      });
      if (nuggets) {
        const result = await gradeFacetAnswer({
          facet,
          conceptName: concept.name,
          masteryCriterion: concept.masteryCriterion,
          nuggets,
          submission: opts.studentMessage,
        });
        // Monotonic — never lower a previously earned facet score.
        score = prevScore == null ? result.score : Math.max(prevScore, result.score);
        if (result.score >= FACET_PASS) covered = true;
      }
    } catch (e) {
      logger.warn?.(
        `[v4-facets] grade failed lesson=${opts.lessonId} concept=${conceptIndex} facet=${facet}: ${String((e as any)?.message ?? e)}`,
      );
    }
  }
  // 2-attempt cap — stop re-asking even on a miss so the lesson keeps moving.
  if (attempts >= FACET_ATTEMPT_CAP) covered = true;

  const merged: V4ConceptFacets = {
    ...pendingRow.facets,
    [facet]: { covered, score, attempts },
    pending: null,
  };
  await db
    .update(v4ConceptMasteryTable)
    .set({ facets: merged })
    .where(and(
      eq(v4ConceptMasteryTable.userId, opts.userId),
      eq(v4ConceptMasteryTable.lessonId, opts.lessonId),
      eq(v4ConceptMasteryTable.conceptIndex, conceptIndex),
    ));
}
