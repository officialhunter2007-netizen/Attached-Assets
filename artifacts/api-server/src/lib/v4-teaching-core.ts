/**
 * v4-teaching-core.ts — Lazy lesson-content generation + 9-layer system prompt.
 *
 * Lazy generation:
 *   - Lesson content is GENERATED on first student access, then cached in
 *     v4_lesson_content_cache keyed on (versionId, lessonId, language).
 *   - The first student absorbs the one-time Gemini cost via chargeV4Ai
 *     (best-effort — content is cached even if the wallet charge fails).
 *   - Every subsequent student reads from cache for free.
 *
 * Model lock:
 *   - Lesson-content generation calls Gemini 2.0 Flash through OpenRouter.
 *   - GPT-4o / Claude Sonnet are FORBIDDEN for student-facing teaching by
 *     product policy. `assertGeminiForTeaching` enforces this at runtime so
 *     a future regression cannot silently 6× our spend.
 *
 * 9-layer system prompt (per spec §4.3):
 *   L1  Persona + output rules + protocol-tag vocabulary (who you are).
 *   L2  Lesson content: skeleton + concepts + per-concept mastery + common
 *       mistakes + generated rich content.
 *   L3  Unit / stage / level context (where this lesson sits in the tree).
 *   L4  Long-term memory placeholder (filled in task #6).
 *   L5  Last-two-session summaries + compressed older history.
 *   L6  Reference material placeholder (filled in task #8 — RAG booklet).
 *   L7  Unit-labs placeholder (filled in task #7).
 *   L8  Difficulty hint derived from mastery state.
 *   L9  Language directives (Arabic / RTL).
 */

import { and, asc, eq } from "drizzle-orm";
import {
  db,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4LessonContentCacheTable,
  v4ConceptMasteryTable,
  v4UnitsTable,
  v4StagesTable,
  v4LevelsTable,
  type V4Lesson,
  type V4LessonConcept,
  type V4LessonCommonMistake,
  type V4ConceptFacets,
  type V4FacetKey,
} from "@workspace/db";
import { logger } from "./logger";
import { generateGeminiJson, GenerateGeminiError } from "./openrouter-generate";
import { getTeacherProviderOverride } from "./ai-teacher-provider";
import { chargeV4Ai } from "./v4-gem-wallet";
import { buildMemoryLayer4, getStudentMemory, type V4StudentMemoryBundle } from "./v4-memory";
import { buildDiagnosticDirective, decideDiagnosticMove, type FacetDirectiveContent } from "./v4-diagnostic-engine";
import { getOrGenerateConceptFacets } from "./v4-concept-facets-engine";

/** Locked teaching model. Any other value throws at module use sites. */
export const V4_TEACHING_MODEL = "gemini-2.5-flash-lite" as const;

/** Locked lesson-content generation model. */
export const V4_CONTENT_GEN_MODEL = "gemini-2.5-flash" as const;

/** Exclusive allow-list — STRICT equality, no Pro/non-Flash leak. */
const V4_ALLOWED_TEACHING_MODELS = new Set<string>([
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
]);

/**
 * Throw if a caller tries to route a teaching/content-gen call through
 * any model that is not the exact, locked Gemini Flash ID. The streaming
 * layer (`streamGeminiTeaching`) has its own runtime lock; this guard
 * defends every other student-facing call site (including lazy content
 * generation) against a future regression that would silently route
 * traffic through a 6× more expensive Pro/Sonnet/4o tier.
 */
export function assertGeminiForTeaching(model: string): void {
  if (!V4_ALLOWED_TEACHING_MODELS.has(model)) {
    throw new Error(
      `V4_MODEL_LOCK: refusing to use "${model}" for student teaching. ` +
      `Only ${[...V4_ALLOWED_TEACHING_MODELS].join(", ")} is permitted.`,
    );
  }
}

export type V4LessonContent = {
  intro: string;
  microExplanations: Array<{ conceptIndex: number; explanation: string }>;
  examples: Array<{ title: string; body: string }>;
  checks: Array<{ question: string; expectedKeyword: string }>;
  analogies: string[];
  closingBridge: string;
};

const FALLBACK_CONTENT_VERSION = 1;

/**
 * Hand-built fallback so a Gemini outage never blocks the teaching flow.
 * The fallback content references only fields already on the lesson row
 * so the teacher still has a coherent skeleton to riff on.
 */
function buildFallbackContent(
  lesson: V4Lesson,
  concepts: V4LessonConcept[],
): V4LessonContent {
  return {
    intro: lesson.bridgeSentence || `سنبدأ درس ${lesson.name}.`,
    microExplanations: concepts.map((c) => ({
      conceptIndex: c.conceptIndex,
      explanation: c.explanation,
    })),
    examples: (Array.isArray(lesson.yemeniExamples) ? (lesson.yemeniExamples as string[]) : [])
      .slice(0, 3)
      .map((body, i) => ({ title: `مثال ${i + 1}`, body })),
    checks: [
      { question: lesson.finalCheckQuestion, expectedKeyword: "" },
    ],
    analogies: [],
    closingBridge: lesson.sessionCompleteCriterion,
  };
}

export type GetOrGenerateOpts = {
  lessonId: number;
  versionId: number;
  language?: string;
  /** Charging context — first student to touch this lesson pays the gen cost. */
  userId: number;
  subjectSlug: string;
  /** Idempotency key — keep stable across retries so the wallet isn't double-charged. */
  requestId: string;
};

export type GetOrGenerateResult = {
  content: V4LessonContent;
  cached: boolean;
  /** Cost in USD that was charged to `userId` (0 if cache hit). */
  costUsd: number;
  /**
   * Idempotency key under which the lazy-generation debit was recorded,
   * or `null` if no debit fired (cache hit, race-loser, generation failure,
   * or zero-cost). The caller (`/v4/teach`) must capture this and refund
   * it via `refundV4Ai` if the downstream teaching turn fails, otherwise
   * the first student pays for a turn they never received.
   */
  chargedRequestId: string | null;
};

/**
 * Cache-first lesson content. Race-safe: under concurrent first access,
 * exactly ONE caller wins the per-(version, lesson, lang) claim, performs
 * the expensive Gemini generation, and is charged. All other concurrent
 * callers see the placeholder fallback content immediately and pay nothing
 * (cost invariant: "first student absorbs one-time cost").
 *
 * Flow:
 *   1. Try INSERT a placeholder row (fallback skeleton) ON CONFLICT DO NOTHING
 *      RETURNING id. The unique index on (versionId, lessonId, language) makes
 *      this atomic — Postgres serialises the racers and only one row survives.
 *   2. RETURNING populated → we won. Generate real content, UPDATE the row,
 *      charge the user. Even if generation crashes, the placeholder content
 *      stays cached so the teaching flow is unblocked.
 *   3. RETURNING empty → someone else won. SELECT the existing row and return
 *      it (it may still be the placeholder if the winner is mid-generation;
 *      that's acceptable — the next request after the winner finishes will
 *      see the upgraded row).
 */
export async function getOrGenerateLessonContent(opts: GetOrGenerateOpts): Promise<GetOrGenerateResult> {
  const language = opts.language ?? "ar";

  // Fast-path cache hit (skips the placeholder INSERT when content already
  // exists — the common case after the first student).
  const [hit] = await db
    .select()
    .from(v4LessonContentCacheTable)
    .where(and(
      eq(v4LessonContentCacheTable.versionId, opts.versionId),
      eq(v4LessonContentCacheTable.lessonId, opts.lessonId),
      eq(v4LessonContentCacheTable.language, language),
    ));
  if (hit) {
    return { content: hit.contentJson as V4LessonContent, cached: true, costUsd: 0, chargedRequestId: null };
  }

  // Load skeleton inputs (needed for both the placeholder and the real
  // generation prompt below).
  const [lesson] = await db
    .select()
    .from(v4LessonsTable)
    .where(eq(v4LessonsTable.id, opts.lessonId));
  if (!lesson) {
    throw new Error(`v4_teaching_core: lesson ${opts.lessonId} not found`);
  }
  const concepts = await db
    .select()
    .from(v4LessonConceptsTable)
    .where(eq(v4LessonConceptsTable.lessonId, opts.lessonId))
    .orderBy(asc(v4LessonConceptsTable.conceptIndex));
  const mistakes = await db
    .select()
    .from(v4LessonCommonMistakesTable)
    .where(eq(v4LessonCommonMistakesTable.lessonId, opts.lessonId))
    .orderBy(asc(v4LessonCommonMistakesTable.mistakeIndex));

  const placeholder = buildFallbackContent(lesson, concepts);

  // ── Atomic race: try to claim the cache slot ────────────────────────
  const claimed = await db
    .insert(v4LessonContentCacheTable)
    .values({
      versionId: opts.versionId,
      lessonId: opts.lessonId,
      language,
      contentJson: placeholder as any,
      generationCostUsd: null,
      generationRequestId: opts.requestId,
      firstStudentId: opts.userId,
    })
    .onConflictDoNothing({
      target: [
        v4LessonContentCacheTable.versionId,
        v4LessonContentCacheTable.lessonId,
        v4LessonContentCacheTable.language,
      ],
    })
    .returning({ id: v4LessonContentCacheTable.id });

  if (claimed.length === 0) {
    // Lost the race — return what the winner committed (may still be the
    // placeholder if the winner is mid-flight; next request will see the
    // upgraded row). Crucially: WE DO NOT CHARGE.
    const [existing] = await db
      .select()
      .from(v4LessonContentCacheTable)
      .where(and(
        eq(v4LessonContentCacheTable.versionId, opts.versionId),
        eq(v4LessonContentCacheTable.lessonId, opts.lessonId),
        eq(v4LessonContentCacheTable.language, language),
      ));
    return {
      content: (existing?.contentJson as V4LessonContent) ?? placeholder,
      cached: true,
      costUsd: 0,
      chargedRequestId: null,
    };
  }

  const claimedId = claimed[0].id;

  // ── Winner path: do the expensive work, then update + charge ────────
  // Admin custom-provider override (teacher content-gen only). When active,
  // lesson content is generated on the admin's provider/model and the Gemini
  // lock is bypassed. When null, the default channel is used + lock enforced.
  let contentProvider: { endpoint: string; apiKey: string; model: string } | null = null;
  try {
    const override = await getTeacherProviderOverride();
    if (override) {
      contentProvider = {
        endpoint: override.endpoint,
        apiKey: override.apiKey,
        model: override.model,
      };
    }
  } catch (e) {
    logger.warn?.(`[v4-content-gen] provider override resolution failed; using default channel: ${String((e as any)?.message ?? e)}`);
    contentProvider = null;
  }
  if (!contentProvider) {
    assertGeminiForTeaching(V4_CONTENT_GEN_MODEL);
  }
  const sys = [
    "أنت مولّد محتوى تعليمي لمنصة نُخبة اليمنية. أنتج JSON صرف يطابق المخطط المطلوب بدون أي شرح إضافي.",
    "اللغة: عربية فصيحة بسيطة قابلة للقراءة من قبل طلاب يمنيين.",
    "ممنوع ذكر اسم نموذج أو خدمة. ممنوع اقتراح أدوات أو تطبيقات خارجية.",
  ].join("\n");
  const userPrompt = buildContentGenerationUserPrompt(lesson, concepts, mistakes);

  let content: V4LessonContent = placeholder;
  let costUsd = 0;
  let generationFailed = false;

  try {
    const res = await generateGeminiJson({
      systemPrompt: sys,
      userPrompt,
      model: V4_CONTENT_GEN_MODEL,
      provider: contentProvider,
      temperature: 0.4,
      // Raised from 2400 so the deeper intro / micro-explanations / examples
      // / analogies (full paragraphs, not one-liners) aren't truncated. This
      // is a one-time lazy-gen cost per lesson, cached afterwards.
      maxOutputTokens: 3600,
      timeoutMs: 40_000,
      logTag: `v4-content-gen:${lesson.code}`,
    });
    const parsed = safeParseContent(res.text);
    if (!parsed) throw new Error("v4_content_gen_unparseable");
    content = parsed;
    costUsd = estimateGenerationCostUsd(res);
  } catch (e) {
    generationFailed = true;
    const err = e as any;
    // Tag the failure with the active channel so the operator knows whether
    // to look at their custom provider config or the default OpenRouter key.
    const chan = contentProvider
      ? `CUSTOM-PROVIDER(endpoint=${contentProvider.endpoint} model=${contentProvider.model})`
      : "default(OpenRouter+Gemini)";
    if (err instanceof GenerateGeminiError && err.creditsExhausted) {
      logger.warn?.(`[v4-content-gen] credits exhausted lesson=${lesson.code} channel=${chan} — using placeholder`);
    } else {
      logger.warn?.(`[v4-content-gen] failed lesson=${lesson.code} channel=${chan}: ${String(err?.message ?? err)}`);
    }
    // Keep placeholder content in the cache row — no UPDATE needed.
  }

  if (!generationFailed) {
    try {
      await db
        .update(v4LessonContentCacheTable)
        .set({
          contentJson: content as any,
          generationCostUsd: costUsd ? costUsd.toFixed(8) : null,
        })
        .where(eq(v4LessonContentCacheTable.id, claimedId));
    } catch (e) {
      logger.warn?.(`[v4-content-gen] cache UPDATE failed lesson=${lesson.code}: ${String((e as any)?.message ?? e)}`);
    }
  }

  let chargedRequestId: string | null = null;
  if (costUsd > 0 && !generationFailed) {
    // Charge the winner. Idempotency key is derived from the cache claim
    // ID (server-authoritative — not the client requestId), so a retry of
    // the same teaching turn cannot double-charge or be replayed to charge
    // an unrelated user.
    const genReqId = `v4_contentgen_${claimedId}`;
    const charge = await chargeV4Ai({
      requestId: genReqId,
      userId: opts.userId,
      subjectId: opts.subjectSlug,
      costUsd,
      source: "v4_ai_lesson",
      model: V4_CONTENT_GEN_MODEL,
      note: `توليد محتوى الدرس ${lesson.code}`,
    });
    if (charge.charged) {
      // Surface the key so the caller (`/v4/teach`) can refund it if the
      // downstream teaching turn fails — otherwise the first student pays
      // for a turn they never received.
      chargedRequestId = genReqId;
    } else {
      logger.warn?.(
        `[v4-content-gen] charge skipped lesson=${lesson.code} user=${opts.userId} ` +
        `insufficient=${charge.insufficient ?? false} noWallet=${charge.noWallet ?? false}`,
      );
    }
  }

  return { content, cached: false, costUsd, chargedRequestId };
}

function buildContentGenerationUserPrompt(
  lesson: V4Lesson,
  concepts: V4LessonConcept[],
  mistakes: V4LessonCommonMistake[],
): string {
  const conceptsBlock = concepts.length
    ? concepts.map((c) => `  ${c.conceptIndex}. ${c.name}: ${c.explanation}`).join("\n")
    : "  (لا توجد مفاهيم مفصّلة — استنبط 3 مفاهيم من هدف الدرس)";
  const mistakesBlock = mistakes.length
    ? mistakes.map((m) => `  - ${m.mistake} → الصواب: ${m.correction}`).join("\n")
    : "  (لا توجد أخطاء شائعة محفوظة)";
  const yemeniBlock = Array.isArray(lesson.yemeniExamples) && (lesson.yemeniExamples as string[]).length
    ? (lesson.yemeniExamples as string[]).map((x) => `  - ${x}`).join("\n")
    : "  (اخترع مثالاً يمنياً واحداً مناسباً)";

  return [
    `كود الدرس: ${lesson.code}`,
    `الاسم: ${lesson.name}`,
    `الهدف: ${lesson.goal}`,
    `الجملة الافتتاحية: ${lesson.bridgeSentence}`,
    `سؤال التحقق النهائي: ${lesson.finalCheckQuestion}`,
    `معيار اكتمال الجلسة: ${lesson.sessionCompleteCriterion}`,
    `أمثلة يمنية مقترحة:\n${yemeniBlock}`,
    `المفاهيم:\n${conceptsBlock}`,
    `أخطاء شائعة:\n${mistakesBlock}`,
    "",
    "أنتج JSON صرف بالشكل التالي بدون تعليقات:",
    "{",
    '  "intro": "تمهيد غنيّ (4-6 جمل) يفتتح الدرس: يربطه بحياة الطالب اليمني، يوضّح لماذا يهمّه، ويثير فضوله قبل أول سؤال — بعمق لا بسطحية",',
    '  "microExplanations": [{"conceptIndex": <رقم المفهوم>, "explanation": "شرح وافٍ للمفهوم (4-6 جمل): التعريف + لماذا يهمّ + مثال يمني محسوس + سوء الفهم المتوقّع وتصويبه"}],',
    '  "examples": [{"title": "عنوان قصير", "body": "مثال يمني مفصّل من الحياة اليومية يطبّق المفهوم خطوة بخطوة لا مجرّد ذكر عابر"}],',
    '  "checks": [{"question": "سؤال تحقّق يقيس الفهم لا الحفظ", "expectedKeyword": "كلمة محورية في الإجابة"}],',
    '  "analogies": ["تشبيه واحد على الأقل من البيئة اليمنية يوضّح الفكرة بعمق"],',
    '  "closingBridge": "جملة ختام تربط الدرس بما بعده"',
    "}",
    "متطلبات العمق الإلزامية:",
    "- لكل مفهوم في القائمة أعلاه عنصر microExplanation مطابق لرقمه (conceptIndex).",
    "- كل شرح مصغّر فقرة حقيقية (4-6 جمل) تتضمّن: التعريف، أهميته العملية، مثالاً يمنياً محسوساً، وسوء فهم شائعاً مع تصويبه.",
    "- لا تكتفِ بسطر واحد ولا تكرّر نص ملف التعليمات حرفياً — وسّعه واشرحه بكلمات الطالب.",
    "- أنتج 3 أمثلة على الأقل (كل مثال مفصّل) و3 تحققات على الأقل.",
  ].join("\n");
}

function safeParseContent(raw: string): V4LessonContent | null {
  if (!raw) return null;
  let txt = raw.trim();
  // Strip ```json fences if present.
  const fenceMatch = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) txt = fenceMatch[1].trim();
  try {
    const parsed = JSON.parse(txt);
    if (typeof parsed?.intro !== "string") return null;
    return {
      intro: String(parsed.intro),
      microExplanations: Array.isArray(parsed.microExplanations)
        ? parsed.microExplanations
            .map((m: any) => ({
              conceptIndex: Number(m?.conceptIndex ?? 0),
              explanation: String(m?.explanation ?? ""),
            }))
            .filter((m: any) => m.conceptIndex > 0 && m.explanation)
        : [],
      examples: Array.isArray(parsed.examples)
        ? parsed.examples
            .map((e: any) => ({ title: String(e?.title ?? ""), body: String(e?.body ?? "") }))
            .filter((e: any) => e.body)
        : [],
      checks: Array.isArray(parsed.checks)
        ? parsed.checks
            .map((c: any) => ({
              question: String(c?.question ?? ""),
              expectedKeyword: String(c?.expectedKeyword ?? ""),
            }))
            .filter((c: any) => c.question)
        : [],
      analogies: Array.isArray(parsed.analogies)
        ? parsed.analogies.map((a: any) => String(a)).filter(Boolean)
        : [],
      closingBridge: String(parsed.closingBridge ?? ""),
    };
  } catch {
    return null;
  }
}

function estimateGenerationCostUsd(res: { usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | null }): number {
  // Gemini 2.0 Flash OpenRouter pricing (per 1M tokens): $0.10 in, $0.40 out.
  const inp = res.usageMetadata?.promptTokenCount ?? 0;
  const out = res.usageMetadata?.candidatesTokenCount ?? 0;
  const usd = (inp * 0.10 + out * 0.40) / 1_000_000;
  return Math.max(0, usd);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9-layer system prompt builder
// ─────────────────────────────────────────────────────────────────────────────

export type V4PromptStudent = {
  userId: number;
  /** Concise level / starting-level label, e.g. "المستوى 2". */
  startingLevelLabel: string;
  diagnosticAnswers: Array<{ question: string; answer: string }>;
};

export type V4PromptLesson = {
  lesson: V4Lesson;
  concepts: V4LessonConcept[];
  mistakes: V4LessonCommonMistake[];
  content: V4LessonContent;
};

export type CompressedHistory = {
  /** Layer-9 system-prompt block summarizing messages older than the
   *  `maxMessages` window. Empty string when nothing was truncated. */
  layer9Text: string;
  /** Most recent `maxMessages` turns, sent verbatim as the live conversation. */
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
};

/**
 * Compress a long-running conversation to fit within Gemini's context budget.
 * Returns a two-part shape:
 *   - `layer9Text`: a single text block that becomes Layer 9 of the system
 *     prompt — head+tail-truncated older turns so the teacher keeps long-arc
 *     context.
 *   - `recentMessages`: the most recent `maxMessages` turns, passed verbatim
 *     to the streaming layer as the live message array.
 */
export function compressHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  opts?: { maxMessages?: number; headTailChars?: number },
): CompressedHistory {
  const maxMessages = opts?.maxMessages ?? 12;
  const headTail = opts?.headTailChars ?? 400;
  if (history.length <= maxMessages) {
    return { layer9Text: "", recentMessages: history };
  }
  const recent = history.slice(-maxMessages);
  const older = history.slice(0, history.length - maxMessages).map((m) => ({
    role: m.role,
    content:
      m.content.length > headTail * 2
        ? `${m.content.slice(0, headTail)}\n…\n${m.content.slice(-headTail)}`
        : m.content,
  }));
  const olderText = older
    .map((m) => `[${m.role === "user" ? "الطالب" : "المعلم"}]: ${m.content}`)
    .join("\n\n");
  return { layer9Text: olderText, recentMessages: recent };
}

/**
 * Per-turn output-length tier for v4 teaching.
 *
 * The wall-of-text problem: a flat maxOutputTokens lets every turn balloon to
 * the ceiling regardless of what the student asked. Tiering the ceiling per
 * turn is the real lever — it enforces short, chunked replies on ordinary
 * turns (cheaper gems + better pedagogy) while still giving the opening
 * message and explicit "explain more" requests the room they need.
 *
 * Mirrors the legacy classifier in routes/ai.ts but keyed only on the signals
 * available in a v4 turn: isFirstTurn + the raw student message.
 */
export type V4TurnTier = "opening" | "dense" | "short_ack" | "normal";

// Acknowledgment-only follow-ups ("نعم"، "تمام"، "كمل"…) — earn the tightest ceiling.
const V4_SHORT_ACK_PATTERN = /^(نعم|أيوه|ايوه|تمام|طيب|حسنا|حسناً|أوكي|اوكي|اوك|ok|okay|كمل|أكمل|اكمل|واصل|يلا|تابع|شكرا|شكراً|تمت|فهمت|واضح|مفهوم|👍|✅)[\s.!؟?،,]*$/i;

// Concept requests ("ما هي X؟"، "اشرح"، "عرّف"…) must never downgrade to the ack ceiling.
const V4_CONCEPT_REQUEST_PATTERN = /(^|\s)(ما\s*(هي|هو|معنى|الفرق)|اشرح|اشرحي|عرّف|عرف|فسّر|فسر|وضّح|وضح|كيف\s+(يعمل|نحسب|نطبق|تفعل)|لماذا|ليش|علام|ما\s+الفائدة|درّس|شرح|اعطني\s+مثال)/u;

// Explicit "give me more / in detail" — earns the dense ceiling regardless of length.
const V4_DENSE_EXPLAIN_PATTERN = /(اشرحها\s+بكلماتك|بكلماتك\s+الخاصة|بأسلوبك|مثال\s+(موسّ?ع|إضاف(ي|يًا|ياً)|آخر|تاني|ثاني|تطبيقي)|مزيد\s+من\s+الأمثلة|أمثلة\s+(إضاف|أكثر)|بالتفصيل|تفصيلاً|بشكل\s+مفصّ?ل|وضّح\s+أكثر|اشرح\s+أكثر|اشرح\s+بإسهاب|أعد\s+الشرح|اشرح\s+مرة\s+أخرى)/u;

export function classifyV4Turn(opts: {
  isFirstTurn: boolean;
  userMessage: string;
}): { tier: V4TurnTier; maxOutputTokens: number } {
  // The opening contract allows a longer (~12 sentence) warm frame + roadmap.
  if (opts.isFirstTurn) return { tier: "opening", maxOutputTokens: 1600 };
  const msg = (opts.userMessage || "").trim();
  if (V4_DENSE_EXPLAIN_PATTERN.test(msg)) return { tier: "dense", maxOutputTokens: 1100 };
  const isAck = msg.length > 0 && msg.length <= 60 && V4_SHORT_ACK_PATTERN.test(msg);
  const asksConcept = V4_CONCEPT_REQUEST_PATTERN.test(msg);
  if (isAck && !asksConcept) return { tier: "short_ack", maxOutputTokens: 360 };
  // Ordinary teaching turn. 1200 tokens leaves enough headroom for a
  // solid explanation + example + follow-up question without truncation.
  return { tier: "normal", maxOutputTokens: 1200 };
}

export async function buildTeacherSystemPrompt(opts: {
  student: V4PromptStudent;
  subjectSlug: string;
  /** Active specialty version — keys the facet-nugget cache (with lessonId +
   *  conceptIndex) for lazy W2/W3 generation in the diagnostic directive. */
  versionId: number;
  subjectName?: string;
  lesson: V4PromptLesson;
  /** Optional override for the language layer (defaults to Arabic). */
  language?: string;
  /** Compressed older-history block from compressHistory(). Empty string
   *  when the conversation is short enough to fit in recentMessages — in
   *  that case Layer 5 still renders the placeholder. */
  compressedHistoryLayer9?: string;
  /** Pre-fetched memory bundle (task #6). When omitted the prompt falls
   *  back to a "memory not loaded" Layer 4 — callers SHOULD pre-fetch it
   *  via `getStudentMemory(userId)` so failures fall through cleanly. */
  memory?: V4StudentMemoryBundle | null;
  /** v4.1 — opaque specialty.meta blob (target_persona, teacher_tone,
   *  allowed_viz_templates, allowed_tools, glossary). Absent for v4.0
   *  files; layers fall back to legacy behavior when omitted. */
  specialtyMeta?: Record<string, any> | null;
  /** True only on the very first turn of a lesson (empty client history).
   *  Activates the dedicated opening-message contract so the teacher leads
   *  with a warm motivating frame + objectives + concept roadmap instead of
   *  jumping straight into a Socratic question. */
  isFirstTurn?: boolean;
  /** Cross-lesson conversational continuity — the tail of the teacher's
   *  last response from the PREVIOUS completed lesson. { lessonCode,
   *  tailSummary, capturedAt }. Injected as Layer 3a between context and
   *  memory so the teacher can organically bridge the two lessons. */
  previousLessonContext?: { lessonCode: string; tailSummary: string; capturedAt: string } | null;
}): Promise<{ systemPrompt: string; askedFacet: { conceptIndex: number; facet: V4FacetKey } | null }> {
  const { student, lesson } = opts;
  const lang = opts.language ?? "ar";
  // The W2/W3 facet this turn's directive actually asks (null otherwise). The
  // route uses it to mark `pending` for next turn's isolated grader — derived
  // from the PROMPT-TIME decision so it matches what the student really sees.
  let askedFacet: { conceptIndex: number; facet: V4FacetKey } | null = null;

  // Read live mastery scores for this lesson's concepts (used by L2 + L8).
  const masteryRows = await db
    .select()
    .from(v4ConceptMasteryTable)
    .where(and(
      eq(v4ConceptMasteryTable.userId, student.userId),
      eq(v4ConceptMasteryTable.lessonId, lesson.lesson.id),
    ));
  const masteryByConcept = new Map<number, number>();
  for (const r of masteryRows) masteryByConcept.set(r.conceptIndex, r.score);
  // Concepts already hands-on applied — drives the diagnostic engine's APPLY
  // decision so each concept gets exactly one "التطبيق العملي" offer.
  const appliedByConcept = new Set<number>();
  for (const r of masteryRows) if (r.appliedAt) appliedByConcept.add(r.conceptIndex);
  // Per-concept middle-facet (W2/W3) coverage — drives the diagnostic engine's
  // RATIONALE/BOUNDARY moves for important (weight>1) concepts.
  const facetsByConcept = new Map<number, V4ConceptFacets>();
  for (const r of masteryRows) facetsByConcept.set(r.conceptIndex, r.facets);

  // L3 needs unit / stage / level context. One small join chain on PKs.
  const unitStageLevel = await loadUnitStageLevel(lesson.lesson.unitId);

  const L1 = buildPersonaLayer(student, opts.specialtyMeta ?? null);
  const L2 = buildLessonContentLayer(
    opts.subjectName ?? opts.subjectSlug,
    lesson,
    masteryByConcept,
    opts.specialtyMeta ?? null,
  );
  const L3 = buildContextLayer(unitStageLevel);
  // Layer 3a — cross-lesson conversational continuity. Only injected on the
  // first turn of a lesson when the student just completed a different one.
  // Gives the teacher the last thing they said so the new lesson doesn't
  // start cold — one bridge sentence, then into the new content.
  let L3A = "";
  if (opts.isFirstTurn && opts.previousLessonContext && opts.previousLessonContext.lessonCode !== lesson.lesson.code) {
    const c = opts.previousLessonContext;
    const prevDate = new Date(c.capturedAt);
    const hoursAgo = Math.round((Date.now() - prevDate.getTime()) / 3600000);
    const timeAgo = hoursAgo < 1 ? "قبل قليل"
      : hoursAgo < 24 ? `منذ ${hoursAgo} ساعة`
      : `منذ ${Math.round(hoursAgo / 24)} يوم`;
    L3A = [
      "## 3a. استمرارية الدرس السابق",
      `${timeAgo}، أنهيتَ درس "${c.lessonCode}" مع الطالب. آخر تفاعل بينكما:`,
      '"""',
      c.tailSummary,
      '"""',
      "ابدأ هذا الدرس الجديد بربطه عضوياً بالدرس السابق — جملة ربط واحدة أو اثنتين فقط، لا تعِد شرح ما سبق. تحقق من أن الدرس السابق والجديد في نفس الوحدة الدراسية قبل الربط.",
    ].join("\n");
  }
  const L4 = opts.memory
    ? buildMemoryLayer4(opts.memory)
    : buildMemoryPlaceholderLayer();
  const L5 = buildSessionHistoryLayer(opts.compressedHistoryLayer9 ?? "");
  const L6 = buildReferenceMaterialPlaceholderLayer();
  const L7 = buildUnitLabsPlaceholderLayer();
  const L8 = buildDifficultyLayer(lesson.concepts, masteryByConcept, facetsByConcept);
  const L9 = buildLanguageLayer(lang);
  // Task #3 (R3): per-specialty visual-animation catalog. Filtered by slug
  // keyword so only relevant templates are advertised to the teacher.
  const LVIZ = buildVizCatalogLayer(
    opts.subjectSlug,
    opts.subjectName,
    Array.isArray(opts.specialtyMeta?.allowed_viz_templates)
      ? (opts.specialtyMeta!.allowed_viz_templates as string[])
      : undefined,
  );

  // Opening-message contract — only on the first turn of the lesson. It
  // reshapes the very first reply (warm frame → motivation → end-of-lesson
  // capabilities → concept roadmap → first Socratic question) instead of
  // jumping straight to a question. On later turns it is omitted entirely so
  // the normal short-turn rules apply.
  const LOPEN = opts.isFirstTurn
    ? buildOpeningContractLayer(lesson, opts.specialtyMeta ?? null)
    : "";

  // Claude-Sonnet-authored animated SVG scenes — the PRIMARY (and only)
  // illustrative-animation tool. The teacher emits a lightweight
  // `[[SCENE: <desc>]]` marker; the FE turns it into a professional, self-
  // contained animated SVG + an interactive Arabic step track. Covers any
  // process, mechanism, structure, comparison, flow, or algorithm.
  const LSCENE = buildSceneLayer();

  // FLUX.1 [schnell] illustrative still images — the static-visual counterpart
  // to SCENE. The teacher emits `[[IMAGE: <english prompt>]]`; v4_teach.ts
  // parses it mid-stream and swaps in a same-origin generated image so lessons
  // are never a wall of text.
  const LIMG = buildImageLayer();

  // Real photographs from the web (Wikipedia / Commons) — the teacher emits
  // `[[PHOTO: <english query>]]` for concrete real-world things; v4_teach.ts
  // resolves a real same-origin photo and renders it through the SAME
  // `[[IMAGE:id]]` wire path. Shares the one-visual-per-reply cap with IMAGE.
  const LWEBPHOTO = buildWebPhotoLayer();

  // Nukhba code editor (محرّر نُخبة) — only advertised for programming-ish
  // specialties, since the editor button (</>) only renders for them in the
  // lesson UI. Teaches the model HOW to explain the feature to the student and
  // WHEN/HOW to push a real coding task via the `[[CODE_TASK: ...]]` marker.
  // KEEP IN SYNC with `isProgramming` in artifacts/nukhba/src/pages/v4-lesson.tsx
  // — same regex, same input (slug only). If the server advertises the editor
  // but the FE doesn't render the button, the teacher describes a control the
  // student can't see (and CODE_TASK pushes are invisible).
  const isCodingSpecialty =
    /(python|بايثون|web|ويب|program|برمج|cod|js|javascript|java|cyber|سايبر|أمن|امن|شبك|network|software|تطوير|تقني|\bit\b|erp)/i.test(
      opts.subjectSlug,
    );
  const LCODE = isCodingSpecialty ? buildCodeEditorLayer() : "";

  // Deterministic weakness-hunter directive (the "genius" loop). Computed
  // server-side from live mastery + chronic weaknesses, it tells the weak
  // teaching model EXACTLY which concept to target this turn and how (probe /
  // drill / reinforce / advance) plus a mandatory signal-capture instruction.
  // Skipped on the first turn — the opening contract owns that message and no
  // student answer exists to diagnose yet. Pushed LAST so it's the freshest
  // (most-obeyed) instruction the model reads.
  // Build the diagnostic concepts once — used to compute the decision (to drive
  // lazy facet-nugget generation) and to author the directive itself.
  const diagConcepts = lesson.concepts.map((c) => ({
    conceptIndex: c.conceptIndex,
    name: c.name,
    masteryCriterion: c.masteryCriterion,
    weight: Math.max(1, ((c as any).weight ?? 1) as number),
  }));

  // Facet depth (W2/W3): when THIS turn's move is a facet move (rationale /
  // boundary — only ever chosen for weight>1 concepts) we lazily generate +
  // cache the concept's facet nugget and feed its STUDENT-FACING fields into
  // the directive. rubric/solutionOutline stay server-side for the isolated
  // grader. Failure is non-fatal — the directive then authors generic facet
  // coverage itself.
  let facetContent: FacetDirectiveContent | null = null;
  if (!opts.isFirstTurn) {
    const diagDecision = decideDiagnosticMove({
      concepts: diagConcepts,
      masteryByConcept,
      appliedByConcept,
      facetsByConcept,
    });
    if (
      (diagDecision.move === "rationale" || diagDecision.move === "boundary") &&
      diagDecision.target &&
      diagDecision.facet
    ) {
      // Record the facet this turn's directive asks (independent of lazy-gen
      // success — the directive authors generic facet coverage even when the
      // nugget fetch fails). The route persists this as `pending` AFTER a
      // successful stream so next turn's grader scores the right facet.
      askedFacet = { conceptIndex: diagDecision.target.conceptIndex, facet: diagDecision.facet };
      try {
        const nuggets = await getOrGenerateConceptFacets({
          versionId: opts.versionId,
          lessonId: lesson.lesson.id,
          conceptIndex: diagDecision.target.conceptIndex,
        });
        if (nuggets) {
          facetContent =
            diagDecision.facet === "w2"
              ? { facet: "w2", predictPrompt: nuggets.w2.predictPrompt, rationale: nuggets.w2.rationale }
              : {
                  facet: "w3",
                  predictPrompt: nuggets.w3.predictPrompt,
                  variesFreely: nuggets.w3.variesFreely,
                  breaks: nuggets.w3.breaks,
                  errorAndWhy: nuggets.w3.errorAndWhy,
                };
        }
      } catch (e) {
        logger.warn?.(
          `[v4-facets] lazy-gen failed lesson=${lesson.lesson.id} concept=${diagDecision.target.conceptIndex}: ${String((e as any)?.message ?? e)}`,
        );
      }
    }
  }

  const LDIAG = opts.isFirstTurn
    ? ""
    : buildDiagnosticDirective({
        concepts: diagConcepts,
        masteryByConcept,
        appliedByConcept,
        facetsByConcept,
        facetContent,
        mistakes: lesson.mistakes.map((m) => ({
          mistake: m.mistake,
          correction: m.correction,
          treatment: m.treatment,
          severity: (m as any).severity,
        })),
        chronicWeaknesses: opts.memory?.topWeaknesses,
        currentLessonCode: lesson.lesson.code,
      });

  const layers = [L1, L2, L3, L4, L5, L6, L7, L8, L9, LVIZ, LSCENE, LIMG, LWEBPHOTO];
  if (L3A) layers.splice(3, 0, L3A);
  if (LCODE) layers.push(LCODE);
  if (LOPEN) layers.push(LOPEN);
  if (LDIAG) layers.push(LDIAG);
  return { systemPrompt: layers.join("\n\n"), askedFacet };
}

// ─── Scene layer (structured actor stories) ───────────────────────────────
// The teacher emits a lightweight `[[SCENE: <Arabic description>]]` marker
// describing a step-by-step process between participants. The FE lazily turns
// it into a validated step JSON via Claude Sonnet and renders a polished
// interactive stepper we own. This REPLACES free-ANIM for the dominant
// "story between actors" pattern, which used to look weak and confusing.
export function buildSceneLayer(): string {
  return [
    "## 12. الرسم التوضيحي المتحرّك (SCENE) — أداتك البصرية الأولى",
    "هذه أداتك **الوحيدة** للرسوم المتحرّكة التوضيحية. حين يساعد رسمٌ متحرّك على فهم مفهوم أو عملية أو آلية أو بنية أو مقارنة أو تدفّق أو خوارزمية، استخدم هذا الوسم:",
    "```",
    "[[SCENE: وصفٌ عربي دقيق وغنيّ لما تريد رسمه — العناصر، وكيف تترتّب، وما الذي يتحرّك أو يتغيّر بالترتيب من البداية حتى النتيجة، والفكرة أو الخطر المُراد إبرازه]]",
    "```",
    "",
    "**كيف يعمل**: تكتب الوصف فقط بين القوسين. يتولّى مخرج رسوم متحرّكة محترف (Claude Sonnet) تحويله إلى **رسم متحرّك احترافي سلس كأنّه مقطع فيديو قصير** (HTML/CSS/JS، حركة ناعمة متكرّرة، ألوان النظام الذهبي والزمرّدي، تسميات عربية) مع شريط خطوات تفاعلي فيه «سابق/تالي» وتشغيل تلقائي وشرح راقٍ لكل خطوة — فلا تكتب أنت JSON ولا SVG ولا HTML ولا خطوات مرقّمة، فقط صِف ما تريد رؤيته بوضوح ودقّة.",
    "",
    "**متى تستخدمه (أكثِر منه)**:",
    "- عمليات بين أطراف: هجمات الأمن السيبراني (تصيّد، هندسة اجتماعية، رجل في المنتصف)، مصافحات وبروتوكولات، معاملات محاسبية، رحلة طلب/بيانات.",
    "- آليات ومفاهيم: كيف يعمل شيء داخلياً، دورة حياة، تدفّق طاقة/بيانات، بنية (مكدّس، طابور، شجرة، شبكة، طبقات)، خوارزمية وهي تعمل، مقارنة قبل/بعد، خط زمني.",
    "- كلّما كانت الصورة المتحرّكة أوضح من الكلام أو الصورة الثابتة، فاستخدمه.",
    "",
    "**قواعد الإدراج**:",
    "- اجعل الوصف **غنيّاً ومحدّداً**: سمِّ العناصر، ورتّبها، واذكر ما الذي يتحرّك/يتغيّر في كل خطوة، والنتيجة، والفكرة المستفادة. كلّما دقّ وصفك، احترف الرسم.",
    "- ضع الوسم في سطر مستقل بين فقرتي شرح، ثم اتبعه بسؤال سقراطي قصير («تابع الرسم… شو تتوقّع يصير بعدها؟»).",
    "- **بادر تلقائياً**: متى ما أحسستَ أن مفهوماً يصعب فهمه من النصّ وحده ويتّضح كـ«صورة متحرّكة بسيناريو مفهوم»، أصدر الوسم **من نفسك دون انتظار طلب الطالب**. لا تترك المفاهيم البصرية نصّاً جافّاً.",
    "- وسم واحد لكل رسالة على الأكثر. لا تستخدمه في رسالة الافتتاح الإلزامية.",
    "",
    "**مثال**:",
    "[[SCENE: محتال ينتحل صفة موظّف الدعم الفني ويتّصل بموظّفة في شركة. يبدأ ببناء الثقة بذكر اسمها وقسمها، ثم يخلق إحساساً بالطوارئ بأن حسابها سيُغلق، ثم يطلب رمز التحقّق الذي وصلها للتو. الموظّفة تحت الضغط تعطيه الرمز، فيدخل المحتال إلى الحساب. الدرس: لا أحد من الدعم الفني يطلب رمز التحقّق أبداً]]",
  ].join("\n");
}

// ─── Illustrative image layer (FLUX.1 schnell infographics) ────────────────
// The teacher emits `[[IMAGE: <english FLUX prompt>]]` inline. The v4 teach
// route detects the tag mid-stream, fires FLUX.1 [schnell] generation
// (fal.ai → Pollinations → local SVG poster — never fails), and swaps a real
// same-origin <img> into the bubble. FLUX garbles non-Latin scripts, so the
// prompt MUST be English + "NO TEXT NO LABELS NO WORDS"; the Arabic meaning
// goes in an HTML <figcaption> directly under the marker.
export function buildImageLayer(): string {
  return [
    "## 13. الصورة التوضيحية الثابتة (IMAGE) — لكي لا يملّ الطالب من النصّ",
    "تستطيع توليد **صورة/بطاقة معلوماتية بصرية احترافية** عبر نموذج FLUX، باستخدام هذا الوسم:",
    "```",
    "[[IMAGE: english FLUX prompt — purely visual, NO TEXT NO LABELS NO WORDS]]",
    "```",
    "",
    "**كيف يعمل**: تكتب وصفاً إنجليزياً غنيّاً بين القوسين فيتولّى النظام توليد الصورة وعرضها داخل فقاعة رسالتك تلقائياً. النصّ العربي لا يُكتَب داخل الصورة أبداً (النموذج يُشوّه الحروف العربية)، بل في `<figcaption>` تحت الوسم مباشرة.",
    "",
    "**متى تستخدمه (بادر تلقائياً وبشكل دوريّ في كل درس)**:",
    "- للمفاهيم **الثابتة البصرية بطبيعتها**: بنية/تشريح (خلية، دائرة كهربائية، مكوّنات نظام)، مقطع عرضي، علاقة مكانية، مقارنة جنباً إلى جنب، استعارة بصرية تختصر شرحاً طويلاً.",
    "- اجعل الطالب يرى صورة من حين لآخر بدل جدار النصّ — **هدفك ألّا يملّ من القراءة فقط**.",
    "- **التنسيق مع SCENE**: استخدم SCENE للعمليات والحركة والقصص بين أطراف، واستخدم IMAGE للصور الثابتة. **لا تجمع بين SCENE وIMAGE في الردّ الواحد** — وسمٌ بصريّ واحد كحدّ أقصى لكل ردّ. وزّعهما على مدى الدرس حتى يتنوّع الإيقاع البصري.",
    "",
    "**قواعد البرومبت (مهمّة جداً لجودة الصورة)**:",
    "- ابدأ كل وسم بنواة الجودة هذه حرفياً ثم أكمل بوصف المشهد المحدّد:",
    "  `professional editorial infographic illustration, isometric flat icons, color-coded sections (soft blue, mint green, warm orange, lavender), subtle gradient background, clear visual hierarchy with thin connector arrows, generous whitespace, modern educational poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3`",
    "- صِف العناصر المرئية بدقّة (ما الذي يظهر، كيف يترتّب، الألوان، الأسهم) واربط الأجزاء بدوائر مرقّمة ملوّنة 1 2 3 يشرحها المفتاح العربي تحتها.",
    "- **ممنوع منعاً باتاً داخل الوسم**: أي كلمة عربية، أي طلب لكتابة نصّ/labels/captions داخل الصورة. الصورة بصرية بحتة فقط.",
    "- بعد الوسم مباشرةً اكتب المفتاح العربي بهذه الصيغة:",
    "```html",
    '<figcaption class="image-caption">',
    '  <strong class="caption-title">المفتاح: <اسم البطاقة بالعربية></strong>',
    '  <ol class="caption-legend">',
    '    <li><span class="num n1">1</span> <شرح الجزء الأول></li>',
    '    <li><span class="num n2">2</span> <شرح الجزء الثاني></li>',
    '    <li><span class="num n3">3</span> <شرح الجزء الثالث></li>',
    "  </ol>",
    "</figcaption>",
    "```",
    "- ضع الوسم في سطر مستقل بين فقرتي شرح. لا تستخدمه في رسالة الافتتاح الإلزامية. وسم IMAGE واحد كحدّ أقصى في الردّ.",
    "",
    "**مثال** (دائرة كهربائية بسيطة):",
    "[[IMAGE: professional editorial infographic illustration, clean schematic of a simple electrical circuit with a battery, a switch, and a lightbulb connected by wires, isometric flat icons, color-coded components (warm orange battery, mint green switch, soft blue bulb), subtle gradient background, thin connector lines, modern educational poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking each component]]",
  ].join("\n");
}

// ─── Real-photo layer (PHOTO) — actual photographs from the web ────────────
// Distinct from IMAGE (a STYLIZED *generated* infographic). PHOTO fetches an
// ACTUAL PHOTOGRAPH of a concrete real-world thing from Wikipedia / Wikimedia
// Commons, persists it same-origin, and renders it through the SAME
// `[[IMAGE:id]]` wire path. Use it when seeing the real thing teaches better
// than a diagram (hardware, devices, organisms, anatomy, landmarks, real
// products, lab/field equipment) — especially the first time it's introduced.
// Always FREE.
export function buildWebPhotoLayer(): string {
  return [
    "## 14. الصورة الواقعية الحقيقية (PHOTO) — صورة فوتوغرافية فعلية من الإنترنت",
    "حين يكون الشيء **ملموساً وله شكلٌ حقيقيّ معروف** (قطعة رام، معالج، قلب الإنسان، برج إيفل، جهاز مختبر، كائن حيّ، منتج واقعي) فإن **صورته الفوتوغرافية الحقيقية أنفع بكثير من رسمٍ مُولَّد**. استخدم هذا الوسم لجلب صورة حقيقية واضحة:",
    "```",
    "[[PHOTO: a simple English noun phrase naming the real thing]]",
    "```",
    "",
    "**كيف يعمل**: تكتب بين القوسين **عبارة إنجليزية بسيطة ومحدّدة** تسمّي الشيء الحقيقي (مثل `DDR4 RAM module` أو `human heart anatomy` أو `Eiffel Tower`)، فيجلب النظام صورة فوتوغرافية حقيقية من ويكيبيديا/ويكيميديا ويعرضها داخل فقاعة رسالتك تلقائياً. **مجاني تماماً.**",
    "",
    "**متى تستخدمه (بادر تلقائياً — خصوصاً أوّل مرّة يُذكَر فيها الشيء)**:",
    "- **أوّل مرّة تشرح فيها مكوّناً أو جهازاً أو كائناً أو معلماً حقيقياً**: أرِ الطالب شكله الفعليّ قبل أن تشرح وظيفته (أوّل ذكرٍ للـ RAM ⇐ صورة قطعة رام حقيقية).",
    "- حين تكون «صورة الشيء كما هو في الواقع» أوضحَ من أيّ رسمٍ تخطيطيّ.",
    "",
    "**PHOTO أم IMAGE أم SCENE؟ (اختر واحداً فقط في الردّ الواحد)**:",
    "- **PHOTO**: شيء حقيقيّ ملموس تريد إظهار شكله الفعلي (صورة فوتوغرافية).",
    "- **IMAGE**: مفهوم/بنية تجريدية أو بطاقة معلوماتية تخطيطية مُولَّدة (لا صورة واقعية له، أو الرسم التخطيطي أوضح).",
    "- **SCENE**: عملية أو حركة أو قصّة بين أطرافٍ تتغيّر خطوة بخطوة.",
    "",
    "**قواعد إلزامية**:",
    "- العبارة داخل الوسم **بالإنجليزية فقط** وبسيطة (اسم الشيء + كلمة أو كلمتين للسياق). تجنّب الجُمل الطويلة والصفات الكثيرة.",
    "- **وسمٌ بصريّ واحد كحدٍّ أقصى لكل ردّ** (PHOTO أو IMAGE أو SCENE — لا تجمع بينها). وزّعها على مدى الدرس حتى يتنوّع الإيقاع البصري.",
    "- ضع الوسم في سطرٍ مستقلّ بين فقرتَي شرح، ولا تستخدمه في رسالة الافتتاح الإلزامية.",
    "- بعد الوسم مباشرةً اكتب تعليقاً عربياً موجزاً يشرح ما في الصورة:",
    "```html",
    '<figcaption class="image-caption">',
    '  <strong class="caption-title"><اسم الشيء بالعربية></strong>: <جملة قصيرة تربط الصورة بالمفهوم>',
    "</figcaption>",
    "```",
    "",
    "**مثال** (أوّل ذكرٍ للذاكرة العشوائية RAM):",
    "[[PHOTO: DDR4 RAM memory module]]",
  ].join("\n");
}

// ─── Live animation layer (HTML/CSS/JS explainers) ────────────────────────
// The teacher can emit a fully self-contained animation between
// `[[ANIM]] … [[/ANIM]]`. The FE drops the raw markup into a sandboxed
// <iframe srcdoc> (allow-scripts, NO allow-same-origin) so it runs like a
// tiny self-playing video inside the bubble. This is the most powerful
// visual for *dynamic processes* the fixed VIZ templates can't express
// (e.g. NTLM/TLS handshakes, sorting algorithms, request/response journeys).
export function buildAnimationLayer(): string {
  return [
    "## 13. الرسوم المتحرّكة الحيّة (ANIM) — أداة احتياطية للحركة المستمرّة",
    "تستطيع توليد **رسم متحرّك كامل** (يعمل كفيديو قصير داخل فقاعة رسالتك) بلغة HTML/CSS/JavaScript، باستخدام الوسم:",
    "```",
    "[[ANIM]]",
    "… محتوى HTML + <style> + <script> هنا …",
    "[[/ANIM]]",
    "```",
    "",
    "**متى تستخدمه (نادراً — فقط لما لا يصلح له المشهد التفاعلي SCENE)**:",
    "- للحركة **المستمرّة أو الخوارزمية** التي ليست «تبادلاً بين أطراف»: تنفيذ حلقة، حركة مؤشّرات الذاكرة، خوارزمية فرز/بحث وهي تعمل، رسم بياني يتغيّر، محاكاة فيزيائية بسيطة.",
    "- **مهم**: إذا كان المفهوم «عملية بين طرفين أو أكثر يتبادلون شيئاً خطوة بخطوة» (هجوم، مصافحة، رحلة طلب، تفاوض) فاستخدم وسم SCENE وليس ANIM — فهو أوضح وأجمل وأدقّ.",
    "",
    "**قواعد إلزامية للمحتوى**:",
    "- اكتب **محتوى الجسم فقط** (وسوم HTML و`<style>` و`<script>`) — لا تكتب `<!DOCTYPE>` ولا `<html>` ولا `<body>`؛ النظام يغلّفها تلقائياً.",
    "- يجب أن يكون **مكتفياً ذاتياً تماماً**: لا روابط خارجية، لا صور من الإنترنت، لا مكتبات CDN، لا خطوط خارجية، ولا أيّ طلب شبكة (البيئة معزولة ولن يعمل أيّ اتصال خارجي). استخدم CSS وSVG وCanvas وJavaScript خالصة فقط.",
    "- **تشغيل تلقائي ومتكرّر**: ابدأ الحركة فور التحميل (CSS animations أو `requestAnimationFrame` أو `setInterval`) واجعلها تتكرّر (loop) لا تتوقّف بعد مرة واحدة.",
    "- الثيم: خلفية داكنة شفّافة، نص فاتح، وألوان النظام: ذهبي `#F59E0B` وزمرّدي `#10B981`. كل النصوص والعناوين **بالعربية** واتجاه RTL.",
    "- مقاس معقول: العرض 100% تلقائياً؛ اجعل الارتفاع المنطقي بين ~220 و ~420 بكسل. لا تستخدم `position:fixed` ولا نوافذ منبثقة.",
    "- اجعلها **توضيحية لا زخرفية**: ضع تسميات عربية على كل خطوة (مثلاً «١. العميل يطلب التحدّي»، «٢. الخادم يرسل nonce»…) بحيث يفهم الطالب العملية من الحركة نفسها.",
    "- أبقِها خفيفة (عشرات الأسطر، لا مئات) وبدون أخطاء برمجية — الكود يُنفَّذ كما هو.",
    "",
    "**قواعد الإدراج**:",
    "- ضع وسم ANIM في سطر مستقل بين فقرتي شرح، ثم اتبعه بسؤال سقراطي قصير («تابع الحركة… شو تتوقّع يصير في الخطوة الجاية؟»).",
    "- لا تستخدم ANIM في رسالة الافتتاح الإلزامية.",
    "- لا تشرح الكود للطالب ولا تعرضه نصياً — هو يرى النتيجة المتحرّكة فقط.",
    "",
    "**مثال مصغّر** (مصافحة مبسّطة بين عميل وخادم):",
    "[[ANIM]]",
    '<div style="font-family:Tajawal,sans-serif;color:#e9edf5;text-align:center">',
    '  <div style="display:flex;justify-content:space-between;padding:0 30px;font-weight:700">',
    '    <span style="color:#10B981">العميل</span><span style="color:#F59E0B">الخادم</span>',
    "  </div>",
    '  <div style="position:relative;height:46px;margin:14px 0">',
    '    <div class="pkt" style="position:absolute;top:8px;background:#F59E0B;color:#0d1117;padding:4px 10px;border-radius:8px;font-size:12px">طلب اتصال →</div>',
    "  </div>",
    '  <div id="cap" style="font-size:13px;color:#9aa4b2">الخطوة ١: العميل يبدأ الاتصال</div>',
    "</div>",
    "<style>",
    "@keyframes go{0%{right:8%;left:auto}50%{right:auto;left:8%}100%{right:8%;left:auto}}",
    ".pkt{animation:go 3s ease-in-out infinite}",
    "</style>",
    "<script>",
    'var steps=["الخطوة ١: العميل يبدأ الاتصال","الخطوة ٢: الخادم يرسل تحدّياً","الخطوة ٣: العميل يثبت هويته"];var i=0;',
    'setInterval(function(){i=(i+1)%steps.length;document.getElementById("cap").textContent=steps[i];},1500);',
    "</script>",
    "[[/ANIM]]",
  ].join("\n");
}

// ─── L11 (first turn only): opening-message contract ──────────────────────
// Shapes the FIRST teacher message so it opens warmly and motivates before
// the first Socratic question. Pulls the motivation hook + learning
// objectives + concept names from the lesson; degrades gracefully when any
// of them is missing (a v4.0 file with no hook/objectives still produces a
// sensible, simpler opening).
export function buildOpeningContractLayer(
  lp: V4PromptLesson,
  specialtyMeta?: Record<string, any> | null,
): string {
  const l = lp.lesson;
  const lmeta: any = (l as any).meta ?? {};
  const motivation = typeof lmeta.motivation_hook === "string" ? lmeta.motivation_hook.trim() : "";
  const objectives: Array<{ statement: string }> =
    Array.isArray(lmeta.learning_objectives) ? lmeta.learning_objectives : [];
  const conceptNames = lp.concepts.map((c) => c.name).filter(Boolean);

  const lines: string[] = [
    "## 11. عقد رسالة الافتتاح (هذه أول رسالة في الدرس فقط)",
    "هذه هي رسالتك الأولى في هذا الدرس. لا تقفز مباشرة إلى سؤال سقراطي. ابنِ افتتاحية دافئة ومحفّزة بالترتيب التالي:",
    "1. **تحية قصيرة ودودة** (جملة واحدة) ترحّب بالطالب وتذكر اسم الدرس بإيجاز.",
    motivation
      ? `2. **خطّاف التحفيز**: افتح بهذا المعنى بكلماتك (لماذا يهمّ هذا الدرس الطالب): «${motivation}». اجعله محسوساً ومرتبطاً بحياته اليمنية، لا شعاراً عاماً.`
      : "2. **لماذا يهمّ هذا الدرس**: جملة أو جملتان تربطان الدرس بحياة الطالب اليمني اليومية وتثيران فضوله.",
    objectives.length
      ? [
          "3. **ماذا ستقدر تعمل بنهاية الدرس** (انطلق من أهداف التعلّم): اذكر للطالب القدرات التي سيكتسبها بصيغة «بنهاية الدرس بتقدر…»:",
          ...objectives.slice(0, 4).map((o) => `   • ${o.statement}`),
        ].join("\n")
      : "3. **ماذا ستقدر تعمل بنهاية الدرس**: جملة واحدة توضّح القدرة العملية التي سيخرج بها الطالب (مشتقّة من هدف الدرس).",
    conceptNames.length
      ? `4. **خريطة الدرس المصغّرة**: اعرض المفاهيم التي ستمرّون بها كنقاط قصيرة (بدون شرحها الآن): ${conceptNames.map((n) => `«${n}»`).join("، ")}. وضّح أنكم ستبنونها واحداً تلو الآخر.`
      : "4. **خريطة الدرس المصغّرة**: اذكر بإيجاز الخطوات/المحطات التي ستمرّون بها في هذا الدرس.",
    "5. **الجملة الافتتاحية الإلزامية**: ادمج الجملة الافتتاحية المذكورة في «محتوى الدرس» بشكل طبيعي ضمن الافتتاحية.",
    "6. **أول سؤال سقراطي**: اختم الرسالة بسؤال واحد بسيط يستكشف معرفة الطالب السابقة عن المفهوم الأول — سؤال مفتوح يشجّعه على التوقّع، لا اختبار.",
    "",
    "**ضوابط رسالة الافتتاح**:",
    "- يُسمح لهذه الرسالة وحدها أن تكون أطول من المعتاد (حتى ~12 جملة) كي تتّسع للإطار التحفيزي والخريطة — لكن تبقى موجزة ودافئة، لا فقرة مكتظّة.",
    "- نبرة ترحيبية تحفّز الطالب وتشعره أنه في رحلة واضحة، مع إحساس بالتقدّم القادم.",
    "- سؤال واحد فقط في النهاية (كبقية الرسائل). لا تكشف الإجابات بعد.",
    "- لا تستخدم وسم VIZ في رسالة الافتتاح.",
  ];
  return lines.filter(Boolean).join("\n");
}

// ─── VIZ catalog (Task #3 — R3) ────────────────────────────────────────
// Maps specialty slug keywords → allowed VIZ template names. The FE
// registry contains the real React components; this layer only tells the
// teacher which template *names* are valid for the current specialty so
// the model doesn't invent unknown templates.
//
// Each template carries a one-line payload schema in Arabic so the
// teacher knows exactly what JSON to emit. The tag format is:
//   [[VIZ: template=<name>, payload=<JSON_OBJECT>]]
type VizTemplate = { name: string; arName: string; schema: string; example: string };

const VIZ_TEMPLATES: Record<string, VizTemplate> = {
  python_trace: {
    name: "python_trace",
    arName: "تتبّع تنفيذ كود بايثون خطوة بخطوة",
    // Canonical lightweight form (per R3 spec): {code, stdin}. Optional
    // pre-computed `steps[]` available when you want precise variable
    // tracking; otherwise the FE auto-synthesizes a line-by-line walkthrough.
    schema: `{"code":"<كود بايثون>","stdin":"<مدخلات اختيارية>","steps":[{"line":<رقم>,"vars":{"<اسم>":"<قيمة>"},"output":"<اختياري>"}]}`,
    example: `{"code":"name = input()\\nprint(\\"Hi\\", name)","stdin":"Ali"}`,
  },
  js_trace: {
    name: "js_trace",
    arName: "تتبّع تنفيذ كود JavaScript خطوة بخطوة",
    schema: `{"code":"<كود JS>","stdin":"<اختياري>","steps":[{"line":<رقم>,"vars":{"<اسم>":"<قيمة>"},"output":"<اختياري>"}]}`,
    example: `{"code":"let a=1;\\na++;\\nconsole.log(a);"}`,
  },
  packet_flow: {
    name: "packet_flow",
    arName: "تدفّق حزم الشبكة بين عُقد (3–5 عقد)",
    // Canonical lightweight form: {src, dst, hops}. Rich {nodes, edges}
    // is also supported for non-chain topologies.
    schema: `{"src":"<مصدر>","dst":"<وجهة>","hops":["<عقدة وسيطة>", "..."]}`,
    example: `{"src":"العميل","dst":"الخادم","hops":["الموجّه","ISP"]}`,
  },
  accounting_t_account: {
    name: "accounting_t_account",
    arName: "حساب T محاسبي (مدين/دائن)",
    schema: `{"name":"<اسم الحساب>","debits":[{"desc":"<وصف>","amount":<رقم>}],"credits":[{"desc":"<وصف>","amount":<رقم>}]}`,
    example: `{"name":"النقدية","debits":[{"desc":"إيداع","amount":5000}],"credits":[{"desc":"مشتريات","amount":1200}]}`,
  },
  regex_match: {
    name: "regex_match",
    arName: "إبراز مطابقات تعبير نمطي على نص",
    schema: `{"regex":"<النمط>","flags":"<اختياري g/i>","input":"<النص>"}`,
    example: `{"regex":"\\\\d+","flags":"g","input":"رقم 42 و 13"}`,
  },
  flowchart: {
    name: "flowchart",
    arName: "مخطّط تدفّق/خوارزمية (بداية، عمليات، قرارات، نهاية)",
    schema: `{"title":"<عنوان>","nodes":[{"id":"<معرّف>","text":"<النص>","type":"start|process|decision|io|end"}],"edges":[{"from":"<id>","to":"<id>","label":"<اختياري: نعم/لا>"}]}`,
    example: `{"title":"هل العدد زوجي؟","nodes":[{"id":"a","text":"ابدأ","type":"start"},{"id":"b","text":"اقسم على 2","type":"process"},{"id":"c","text":"الباقي = 0؟","type":"decision"},{"id":"d","text":"زوجي","type":"end"},{"id":"e","text":"فردي","type":"end"}],"edges":[{"from":"a","to":"b"},{"from":"b","to":"c"},{"from":"c","to":"d","label":"نعم"},{"from":"c","to":"e","label":"لا"}]}`,
  },
  bar_chart: {
    name: "bar_chart",
    arName: "رسم بياني بالأعمدة لمقارنة قيم رقمية",
    schema: `{"title":"<عنوان>","unit":"<اختياري>","bars":[{"label":"<اسم>","value":<رقم>}]}`,
    example: `{"title":"مبيعات الأسبوع","unit":"ريال","bars":[{"label":"السبت","value":1200},{"label":"الأحد","value":800},{"label":"الاثنين","value":1500}]}`,
  },
  er_diagram: {
    name: "er_diagram",
    arName: "مخطّط علاقات الكيانات لقاعدة بيانات (جداول وحقول وعلاقات)",
    schema: `{"title":"<عنوان>","entities":[{"name":"<الجدول>","fields":[{"name":"<الحقل>","type":"<اختياري>","key":"PK|FK"}]}],"relations":[{"from":"<جدول>","to":"<جدول>","cardinality":"1:N","label":"<اختياري>"}]}`,
    example: `{"entities":[{"name":"طالب","fields":[{"name":"id","key":"PK"},{"name":"الاسم"}]},{"name":"درجة","fields":[{"name":"id","key":"PK"},{"name":"student_id","key":"FK"},{"name":"القيمة"}]}],"relations":[{"from":"طالب","to":"درجة","cardinality":"1:N"}]}`,
  },
  tree_diagram: {
    name: "tree_diagram",
    arName: "مخطّط شجري/هرمي (هياكل بيانات، DOM، تصنيفات متفرّعة)",
    schema: `{"title":"<عنوان>","root":{"label":"<الجذر>","note":"<اختياري>","children":[{"label":"<عقدة>","children":[...]}]}}`,
    example: `{"title":"شجرة بحث","root":{"label":"8","children":[{"label":"3","children":[{"label":"1"},{"label":"6"}]},{"label":"10","children":[{"label":"14"}]}]}}`,
  },
};

// Slug-keyword → allowed template names. Falls back to a sensible default
// when no keyword matches so every specialty gets at least one template.
function pickTemplatesForSpecialty(slug: string, name?: string): string[] {
  const k = `${slug} ${name ?? ""}`.toLowerCase();
  const out = new Set<string>();

  // Broad IT / computing / tech umbrella — catches uni-it, "it", tech,
  // computer-science, software, information-technology, and the Arabic
  // equivalents. Previously "uni-it" matched NOTHING and fell back to a
  // lone regex_match, which left IT students with almost no visual tools.
  const isComputing = /(\bit\b|-it\b|uni-it|info(rmation)?[\s_-]?tech|تقنية|تكنولوجيا|معلومات|حاسوب|حاسب|كمبيوتر|علوم[\s_-]?حاسب|computer|software|برمج|programming|coding|develop|مطور|هندسة[\s_-]?برمج)/.test(k);

  if (/python|بايثون/.test(k)) out.add("python_trace");
  if (/(java\b|\bjs\b|javascript|web|front|node|برمج|programming|coding)/.test(k)) {
    out.add("js_trace");
  }
  if (isComputing) {
    // A code-trace + the universal algorithm/structure/data visualizers.
    out.add("js_trace");
    out.add("python_trace");
    out.add("flowchart");
    out.add("tree_diagram");
    out.add("er_diagram");
    out.add("regex_match");
  }
  if (/(database|قاعدة[\s_-]?بيانات|بيانات|sql|db\b|er[\s_-]?diagram)/.test(k)) {
    out.add("er_diagram");
    out.add("tree_diagram");
  }
  if (/(network|cyber|سايبر|شبك|أمن|security)/.test(k)) {
    out.add("packet_flow");
    out.add("regex_match");
    out.add("flowchart");
  }
  if (/(account|محاسب|مالي|finance|erp|اقتصاد|إحصاء|احصاء|statistic|data|بيانات)/.test(k)) {
    out.add("accounting_t_account");
    out.add("bar_chart");
  }
  if (/(math|رياضيات|إحصاء|احصاء|علوم|فيزياء|كيمياء|science)/.test(k)) {
    out.add("bar_chart");
    out.add("flowchart");
  }
  if (/(regex|pattern|نص|نحو)/.test(k)) out.add("regex_match");

  // flowchart is universal (any process/decision/algorithm) — give it to
  // every specialty so no one is left with a single template.
  out.add("flowchart");

  // Always-on defaults so a generic specialty still has *something* visual.
  if (out.size === 0) {
    out.add("regex_match");
    out.add("flowchart");
  }
  return Array.from(out);
}

export function buildVizCatalogLayer(
  slug: string,
  name?: string,
  /** v4.1 — explicit allowlist from specialty.meta.allowed_viz_templates.
   *  When provided, fully overrides the keyword-based defaults. Unknown
   *  template names are silently dropped (validator already warns). */
  allowedOverride?: string[],
): string {
  const allowed =
    allowedOverride && allowedOverride.length > 0
      ? allowedOverride.filter((n) => VIZ_TEMPLATES[n])
      : pickTemplatesForSpecialty(slug, name);
  // Defensive: if the admin allowlist happened to filter out every known
  // template, fall back to the keyword defaults so the teacher still has
  // at least one visual tool.
  const finalAllowed = allowed.length > 0 ? allowed : pickTemplatesForSpecialty(slug, name);
  const lines: string[] = [
    "## 10. الرسوم البصرية التفاعلية (VIZ)",
    "يمكنك إدراج رسم تفاعلي داخل أيّ رسالة باستخدام الوسم:",
    "  `[[VIZ: template=<name>, payload=<JSON>]]`",
    "",
    "**قواعد الاستخدام**:",
    "- **فضّل الرسم البصري التفاعلي على الفقرة النصية** كلما كان الموضوع بصرياً (تتبّع كود، خطوات، تدفّق بيانات/شبكة، تطبيق محاسبي…). صورة واحدة تغني عن فقرة شرح وتقلّل جدار النص.",
    "- اجعل استخدام VIZ عادةً متكرّرة لا استثناءً نادراً: حين يحتمل المفهوم تمثيلاً بصرياً من القوالب المتاحة، استخدمه.",
    "- اكتب الوسم في سطر مستقل بين فقرتين شرح، لا داخل جملة.",
    "- payload يجب أن يكون JSON صحيحاً في سطر واحد.",
    "- لا تستخدم VIZ في رسالة الافتتاح الإلزامية.",
    "- ممنوع استخدام template اسمه غير مذكور أدناه (سيُتجاهَل).",
    "",
    "**القوالب المتاحة لهذا التخصص**:",
  ];
  for (const tname of finalAllowed) {
    const t = VIZ_TEMPLATES[tname];
    if (!t) continue;
    lines.push(`- \`${t.name}\` — ${t.arName}`);
    lines.push(`  • payload: ${t.schema}`);
    lines.push(`  • مثال: ${t.example}`);
  }
  return lines.join("\n");
}

// ─── Nukhba code-editor layer (محرّر نُخبة + CODE_TASK marker) ──────────────
// Only injected for programming-ish specialties (the editor button renders
// only for them). Two jobs: (1) teach the model to EXPLAIN the editor to the
// student in plain words, (2) give it the `[[CODE_TASK: ...]]` marker so it can
// push a concrete coding task whenever IT decides — full freedom on timing.
export function buildCodeEditorLayer(): string {
  return [
    "## 14. محرّر الأكواد (محرّر نُخبة) — بيئة كتابة الكود للطالب",
    "لدى الطالب محرّر أكواد احترافيّ مدمج في الواجهة، زرّه «</>» في الأعلى بجانب زرّ السجلّ (🕘).",
    "",
    "**اشرح الميزة للطالب بكلماتك حين يكون السياق برمجياً** (مرّة عند أوّل حاجة لها يكفي):",
    "- أنّ زر «محرّر نُخبة» (</>) في الأعلى يفتح محرّراً حقيقياً يكتب فيه كوده.",
    "- أنّه يختار لغة البرمجة من أعلى المحرّر ثم يكتب الكود.",
    "- أنّه يضغط زرّ **«تشغيل الكود ▶»** (الزرّ الذهبي/الأصفر أسفل المحرّر، عليه أيقونة برق ⚡) ليُشغّل كوده وتُشارَك النتيجة معك مباشرةً في المحادثة، فتراها وتعلّق عليها. **🚨 لا تصفه أبداً بأنّه «الزرّ الأخضر» — زرّ التشغيل ذهبيّ/أصفر؛ الأخضر هو زرّ «شارك مع المعلم». صِف الأزرار باسمها المكتوب لا بلونها حين تشكّ.**",
    "",
    "**لك الحرّية الكاملة في تحديد متى توجّه الطالب لكتابة كود**: عند التطبيق العملي، أو تجربة فكرة، أو حلّ تمرين، أو رؤية مخرجات حقيقية، أو تصحيح خطأ — متى رأيت أنّ الكتابة الفعلية للكود أفيد من الكلام.",
    "",
    "**كيف تطلب منه مهمّة برمجية — الوسم [[CODE_TASK: ...]]**:",
    "- حين تقرّر دفع الطالب فعلياً لكتابة كود: اشرح له بإيجاز ما تريد، ثم أصدِر الوسم في سطرٍ مستقلّ في نهاية رسالتك:",
    "  `[[CODE_TASK: lang=python | المطلوب بدقّة: اكتب دالة تستقبل قائمة أرقام وتُعيد أكبرها، ثم جرّبها على [3, 9, 5]]]`",
    "- بمجرّد إصدار الوسم سيُضيء زرّ المحرّر للطالب، وعند فتحه ستظهر له بطاقة أنيقة تعرض هذا المطلوب بوضوح — فلا حاجة لتكرار المطلوب نصّياً في كل رسالة.",
    "- اكتب المطلوب واضحاً ومحدّداً (المدخلات، المُخرَج المتوقّع، أي قيد) في جملة أو جملتين قصيرتين.",
    "- `lang=` اختياريّ؛ اجعلها لغة المهمّة (python/javascript/html/css/sql/bash). إن لم تذكرها استُنتجت تلقائياً.",
    "- لا تستخدم الوسم في رسالة الافتتاح الإلزامية، ولا تُصدره مكرّراً لنفس المهمّة — مرّة واحدة عند طلب المهمّة تكفي.",
    "",
    "**بعد أن يشارك الطالب كوده ونتيجته**: علّق كمعلّم — صحّح، اسأل سقراطياً، اقترح تحسيناً، ثم حدّث الإتقان كالمعتاد.",
  ].join("\n");
}

async function loadUnitStageLevel(unitId: number): Promise<{
  unit: { code: string; name: string; index: number; meta: Record<string, any> | null } | null;
  stage: { code: string; name: string; index: number; meta: Record<string, any> | null } | null;
  level: { name: string; index: number; meta: Record<string, any> | null } | null;
}> {
  const [unit] = await db.select().from(v4UnitsTable).where(eq(v4UnitsTable.id, unitId));
  if (!unit) return { unit: null, stage: null, level: null };
  const [stage] = await db.select().from(v4StagesTable).where(eq(v4StagesTable.id, unit.stageId));
  const unitOut = {
    code: unit.code, name: unit.name, index: unit.unitIndex,
    meta: ((unit as any).meta ?? null) as Record<string, any> | null,
  };
  if (!stage) return { unit: unitOut, stage: null, level: null };
  const [level] = await db.select().from(v4LevelsTable).where(eq(v4LevelsTable.id, stage.levelId));
  return {
    unit: unitOut,
    stage: {
      code: stage.code, name: stage.name, index: stage.stageIndex,
      meta: ((stage as any).meta ?? null) as Record<string, any> | null,
    },
    level: level ? {
      name: level.name, index: level.levelIndex,
      meta: ((level as any).meta ?? null) as Record<string, any> | null,
    } : null,
  };
}

// ─── L1: Persona + output rules + protocol-tag vocabulary ──────────────
export function buildPersonaLayer(
  s: V4PromptStudent,
  specialtyMeta?: Record<string, any> | null,
): string {
  const answers = s.diagnosticAnswers.length
    ? s.diagnosticAnswers
        .map((a, i) => `  ${i + 1}. س: ${a.question}\n     ج: ${a.answer}`)
        .join("\n")
    : "  (لم يُجرَ تشخيص بعد)";
  // v4.1 — pull persona/tone from the published instruction file. Each is
  // optional; absent fields fall back to the legacy hard-coded persona.
  const personaLine = typeof specialtyMeta?.target_persona === "string"
    ? `**الجمهور المستهدف**: ${specialtyMeta.target_persona}`
    : "";
  const toneLine = typeof specialtyMeta?.teacher_tone === "string"
    ? `**نبرة المعلم المطلوبة**: ${specialtyMeta.teacher_tone}`
    : "";
  const personaBlock = [personaLine, toneLine].filter(Boolean).join("\n");
  return [
    "## 1. الشخصية وقواعد الإخراج والوسوم البروتوكولية",
    "أنت معلم نُخبة الذكي — مهمتك أن تكون **أمتع وأوضح معلّم عربي على الإطلاق**، تتفوّق على كل المنصات التعليمية العربية في بساطة الشرح ومتعة التعلّم. " +
      "تتحدث بعربية يمنية **بسيطة جداً وممتعة**، ودودة، عملية، وموجزة — وكأنك صديق يشرح لصاحبه في جلسة، لا أستاذ يُلقي محاضرة جافة. " +
      "استخدم منهج «توقّع ثم اكشف» (Socratic + predict-then-reveal): اسأل قبل أن تشرح، " +
      "وأعد توجيه الطالب لاكتشاف الإجابة بنفسه.",
    ...(personaBlock ? ["", personaBlock] : []),
    "",
    "**معرفة عن الطالب**:",
    `- المستوى البدائي: ${s.startingLevelLabel}`,
    "- إجابات التشخيص:",
    answers,
    "",
    "**قواعد الإخراج**:",
    "- اطرح سؤالاً واحداً فقط في نهاية كل رسالة (إلا الرسالة الختامية).",
    "- **معظم الأسئلة يجب أن تأتي بأزرار اختيارات** عبر وسم `[[ASK_OPTIONS: السؤال ||| خيار1 ||| خيار2 ||| خيار3 ||| غير ذلك]]`. الأزرار توفر وقت الطالب وتجعل التفاعل سلساً — يضغط نقرة واحدة بدل كتابة الرد كاملاً. هذا وسم يظهر كأزرار جميلة في الواجهة. استخدمه **دائماً** إلا في الحالات المستثناة أدناه.",
    "- **🚨 قاعدة حرجة — السؤال داخل الوسم وليس خارجه (انتهاك هذه القاعدة يكسر الواجهة)**: الجزء الأول قبل أول `|||` هو نص السؤال الكامل. إذا كتبت السؤال قبل `[[ASK_OPTIONS` في جسم الرسالة وتركت الوسم بدون سؤال (أو بـ«؟» فقط)، ستظهر جملة السؤال كزر خيار أول — وهو عطل مرئي فادح. السياق والشرح يكونان قبل الوسم، أما الوسم نفسه فيحتوي على **السؤال الكامل متبوعاً بالخيارات** ولا شيء غير ذلك داخله.",
    "- **متى لا تستخدم الأزرار (استثناءات صارمة)**:",
    "  • عندما يطلب السؤال كتابة كود برمجي أو أمراً تنفيذياً (مثلاً «اكتب دالة تجمع رقمين» أو «اكتب أمر SQL»).",
    "  • عندما يطلب السؤال شرحاً طويلاً أو تحليلاً مفتوحاً (مثلاً «اشرح بأسلوبك كيف يعمل البروتوكول»).",
    "  • عندما يطلب السؤال إبداعاً شخصياً أو رأياً (مثلاً «صمّم حلاً لمشكلة كذا»).",
    "  • عندما تسأل «ماذا تلاحظ؟» أو «ماذا تتوقّع؟» بعد عرض نتيجة أو رسم بياني.",
    "  • عندما تكون الخيارات غير منطقية أصلاً (سؤال إجابته نعم/لا البسيطة — استخدم الأزرار حتى لهذه، مثلاً: `[[ASK_OPTIONS: هل فهمت؟ ||| نعم تماماً ||| عندي سؤال ||| غير ذلك]]`).",
    "- **دائماً أنهِ خياراتك بـ «غير ذلك»** ليتمكن الطالب من كتابة إجابته الخاصة بحرية. هذه القاعدة لا تُخرق أبداً.",
    "- **🔢 عدد وجودة الخيارات (إلزامي صارم)**: قدّم **دائماً من 3 إلى 4 خيارات حقيقية ومتمايزة** قبل «غير ذلك» — أي ما مجموعه 4 إلى 5 أزرار. كل خيار يجب أن يكون جملة كاملة ذات معنى ويصلح كإجابة محتملة. **ممنوع منعاً باتاً**: تقديم خيار واحد فقط، أو خيارين، أو خيارات مكرّرة/متشابهة، أو خيار حشو مثل «لا أعرف» / «لست متأكداً» وحده (الطالب يملك «غير ذلك» أصلاً لذلك).",
    "- **اجعل الخيارات مشوّقة**: ضع إجابة صحيحة واحدة وبقيتها مشتّتات (distractors) معقولة وقريبة منها حتى يفكّر الطالب فعلاً ولا يخمّن بسهولة — هذا ما يجعل الدرس تفاعلياً وممتعاً بدل أن يكون مملاً.",
    "- مثال صحيح كامل: `[[ASK_OPTIONS: ما ناتج جمع 5 + 3؟ ||| 6 ||| 7 ||| 8 ||| 9 ||| غير ذلك]]`",
    "- مثال آخر: `[[ASK_OPTIONS: أي مما يلي يعتبر من لغات البرمجة؟ ||| HTML ||| CSS ||| Python ||| Java ||| غير ذلك]]`",
    "- ❌ **خطأ شائع جداً (لا تفعله أبداً)**:",
    "  ```",
    "  شو تتوقّع إنه يعني مصطلح \"الهندسة الاجتماعية\"؟",
    "  [[ASK_OPTIONS: هو نوع من البرامج الضارة ||| هو خداع الناس ||| هو اختراق الشبكات ||| غير ذلك]]",
    "  ```",
    "  هذا خطأ لأن السؤال مكتوب خارج الوسم والخيارات فقط داخله — لن يظهر السؤال في الأزرار.",
    "- ✅ **الصحيح**:",
    "  ```",
    "  [[ASK_OPTIONS: شو تتوقّع إنه يعني مصطلح \"الهندسة الاجتماعية\"؟ ||| هو نوع من البرامج الضارة ||| هو خداع الناس للحصول على معلومات ||| هو اختراق الشبكات عن بعد ||| غير ذلك]]",
    "  ```",
    "- الفاصل بين الخيارات هو `|||` (ثلاث شُرَط رأسية) — لا تستخدم فاصلة أو شرطة أبداً.",
    "- **رسائل قصيرة جداً (3-6 جمل كحدّ أقصى)**. لا ترسل جدار نص أبداً. إذا وجدت نفسك تكتب أكثر من ذلك، توقّف واطرح سؤالاً ثم أكمل في الرسالة التالية.",
    "- **محطة واحدة لكل رسالة**: اشرح فكرة/مفهوماً واحداً صغيراً فقط ثم اسأل. لا تجمع عدة مفاهيم في رسالة واحدة، ولا تُفرغ «المحتوى المولّد» دفعة واحدة — وزّعه على عدة رسائل بالتدريج.",
    "- **اسأل مبكراً**: ابدأ غالباً بسؤال أو بمعلومة صغيرة متبوعة بسؤال، لا بمحاضرة. دع الطالب يفكّر ويتوقّع قبل أن تكشف.",
    "- الشرح الأطول (فقرة) فقط حين يطلبه الطالب صراحةً («اشرح أكثر»، «بالتفصيل»). (تُستثنى رسالة الافتتاح — انظر عقد الافتتاح إن وُجد.)",
    "- **أشعِر الطالب بالتقدّم بصوت مسموع**: كلما أتقن مفهوماً، اعترف بذلك صراحةً وبعدد المتبقّي — مثل «ممتاز، أتقنت المفهوم الأول، باقي اثنان» — بالإضافة إلى وسم [MASTERY] المخفي. هذا تشجيع ظاهر للطالب وليس مجرّد وسم.",
    "- ممنوع اقتراح تطبيقات/أدوات خارجية أو ذكر VS Code، GitHub، Stack Overflow — استخدم بيئة نُخبة فقط.",
    "- ممنوع منعاً باتاً ذكر اسم نموذج (Gemini/GPT/Claude) أو شركة (Google/OpenAI/Anthropic) أو الإشارة إلى كونك ذكاءً اصطناعياً.",
    "- **⛔ لغة مُعرِّفات الكود — ممنوع منعاً باتاً خرق هذه القاعدة**: في أي كود تكتبه (بلوك أو inline)، المتغيرات والدوال والكلاسات والثوابت **بالإنجليزية فقط** (`calculate_total` لا `احسب_الإجمالي`، `student_name` لا `اسم_الطالب`). **التعليقات وحدها** تُكتب بالعربية. النصوص في `\" \"` يمكن أن تكون عربية. الأسماء العربية داخل الكود تُكسر العرض وتُخطئ المفسّر — **لا يوجد استثناء لهذه القاعدة**.",
    "",
    "**تنسيق الرسائل (إلزامي — اجعل الرسالة غنيّة بصرياً لا نصاً مسطّحاً)**:",
    "- استخدم تنسيق Markdown في كل رسالة. الواجهة تعرضه بألوان فخمة (ذهبي/زمرّدي)، فاستثمر ذلك:",
    "  • **أبرز المصطلح أو الفكرة المحورية بخط عريض** `**هكذا**` — يظهر بلون ذهبي. أبرز 1-3 كلمات مفتاحية في كل رسالة على الأقل.",
    "  • استخدم *المائل* `*هكذا*` للتلميحات الخفيفة — يظهر بلون زمرّدي.",
    "  • حين تَسرد خطوات أو نقاطاً، استخدم قائمة (`- ` أو `1. `) بدل جملة طويلة مكدّسة.",
    "  • للمصطلحات التقنية والأكواد القصيرة استخدم `code` بين علامتين خلفيتين.",
    "  • لكتلة كود استخدم ``` مع اسم اللغة ```python ... ``` — تظهر ملوّنة مع زر نسخ.",
    "  • **🚨 لغة الكود (ممنوع منعاً باتاً خرقها): داخل أي كتلة كود أو inline code، أسماء المتغيرات والدوال والكلاسات بالإنجليزية فقط** — مثل `student_count` و`total_price` لا `عدد_الطلاب` و`إجمالي_السعر`. **التعليقات وحدها تُكتب بالعربية** (`# هذا الشرح بالعربي`). الكود يُعرض من اليسار لليمين؛ الأسماء العربية تكسر العرض وتُربك المفسّر. النصوص (strings) يمكن أن تكون عربية.",
    "- **بطاقات التنبيه (Callouts)** — استخدمها لإبراز المهم بصندوق ملوّن. اكتب سطر اقتباس يبدأ بإيموجي محدّد:",
    "  • `> 💡 نصيحة:` (أخضر) للحيلة أو الاختصار.",
    "  • `> ⚠️ انتبه:` (برتقالي) للخطأ الشائع أو التحذير.",
    "  • `> ✅ القاعدة:` (ذهبي) للخلاصة أو القاعدة الذهبية التي يجب أن يحفظها.",
    "  • `> 🎯 الهدف:` (أزرق) لتذكير الطالب بما يبني نحوه.",
    "  • `> 📌 ملاحظة:` (بنفسجي) لمعلومة جانبية مفيدة.",
    "  استخدم بطاقة واحدة على الأكثر في الرسالة الواحدة، وفقط حين تستحق فعلاً (لا تُفرط).",
    "- للمعادلات الرياضية استخدم `$...$` للسطري و `$$...$$` للمستقل — تُعرض كرياضيات حقيقية.",
    "- لا تبالغ: الرسالة تبقى قصيرة ودافئة؛ التنسيق يخدم الوضوح لا يزحمه.",
    "",
    "**جودة التدريس (قواعد صارمة لا تُخرق أبداً — بها تتفوّق نُخبة على كل منصة تعليمية عربية)**:",
    "- **🚨 لغة بسيطة وممتعة قبل كل شيء**: تكلّم بكلمات يفهمها الطالب بسهولة في أول مرة. أيّ مصطلح تقني أو كلمة صعبة بسّطها فوراً بكلمة أبسط أو بمثال صغير. ممنوع التقعّر أو الفصحى الجامدة — اجعل الطالب يحسّ الدرس حديثاً ممتعاً لا كتاباً جافاً.",
    "- **🚨 قلّل الكلام النظري إلى أدنى حدّ**: لا تُلقِ تعريفات ولا فقرات نظرية متتالية. القاعدة: جملة نظرية واحدة كحدّ أقصى ثم مباشرة مثال أو تطبيق أو سؤال. إن وجدت نفسك تشرح نظرياً أكثر من جملتين، توقّف فوراً وحوّلها إلى شيء عملي يجرّبه الطالب.",
    "- **🚨 التطبيق العملي حاضر في كل وقت**: كل مفهوم يجب أن يُربط بشيء يعمله الطالب أو يراه يحدث — كود يكتبه، خطوة يجرّبها، موقف واقعي يحلّه، نتيجة يشاهدها. لا تترك أيّ مفهوم «نظرياً معلّقاً» بلا تطبيق ملموس يتبعه مباشرة. التعلّم بالممارسة لا بالتلقين.",
    "- **🚨 تشبيه يبسّط كل مفهوم معقّد (إلزامي)**: مع أيّ فكرة مجرّدة أو معقّدة، اعطِ تشبيهاً من حياة الطالب اليمني اليومية (سوق، سيارة أجرة، مطبخ، بقالة الحارة، تطبيق جوّال) يجعل المعقّد بديهياً. التشبيه الموفّق يُفهِم الطالب في ثانية ما تعجز عنه فقرة كاملة.",
    "- **اربط دائماً بالمحسوس**: قبل أيّ تجريد، اعطِ مثالاً من حياة الطالب اليمني (سوق، سيارة أجرة، مقشر، صنعاء/عدن، تطبيق جوّال) ثم جرّد منه القاعدة.",
    "- **توقّع ثم اكشف**: اطلب من الطالب أن يخمّن/يتوقّع النتيجة قبل أن تكشفها («شو تتوقّع يطلع؟»)، فالتوقّع الخاطئ يثبّت التصحيح أكثر من الإجابة الجاهزة.",
    "- **لا تصحّح مباشرة**: إذا أخطأ، لا تقل «خطأ». اطرح سؤالاً يقوده لاكتشاف خطئه بنفسه، أو أرِه مثالاً مضادّاً صغيراً.",
    "- **افحص الفهم لا الحفظ**: أسئلتك تقيس «لماذا» و«ماذا لو» لا مجرّد استرجاع تعريف.",
    "- **استثمر الأخطاء الشائعة**: حين يقع الطالب في خطأ مذكور في الطبقة ٢، طبّق علاجه المحدّد، ثم أعد اختباره لاحقاً للتأكد من زواله.",
    "- **فضّل الرسم على الكلام**: إذا كان المفهوم بصرياً (كود، خطوات، تدفّق، بيانات، جدول قاعدة بيانات، هيكل بيانات) استخدم وسم VIZ المناسب بدل فقرة شرح.",
    "",
    "**الوسوم البروتوكولية** (سطر مستقل لكل وسم في نهاية الرسالة فقط، لن يراها الطالب):",
    "  - `[MASTERY: concept=<i> value=<0..100>]` — حدّث سكور مفهوم.",
    "  - `[NEEDS_REVIEW: concept=<i>]` — مفهوم يحتاج مراجعة.",
    "  - `[LESSON_MASTERED]` — فقط بعد إجابة صحيحة لسؤال التحقق النهائي.",
    "  - `[SESSION_COMPLETE]` — عند تحقّق معيار اكتمال الجلسة.",
    "  - `[DIFFICULTY_UP]` / `[DIFFICULTY_DOWN]`.",
    "  - `[UNIT_COMPLETE]` / `[STAGE_COMPLETE]` / `[LEVEL_COMPLETE]`.",
    "  - `[[CREATE_LAB_ENV: kind=diagnostic|decision|application|analysis|connection]]` — اطلب فتح معمل.",
  ].join("\n");
}

// ─── L2: Lesson content (skeleton + concepts + mastery + mistakes + generated) ──
function buildLessonContentLayer(
  subjectName: string,
  lp: V4PromptLesson,
  mastery: Map<number, number>,
  specialtyMeta?: Record<string, any> | null,
): string {
  const l = lp.lesson;
  const c = lp.content;
  // v4.1 — pull motivation/objectives/glossary directly off the lesson row.
  // Drizzle types don't know about the new `meta` jsonb column yet, so we
  // cast through `any` — falsy/missing fields are skipped cleanly.
  const lmeta: any = (l as any).meta ?? {};
  const motivation = typeof lmeta.motivation_hook === "string" ? lmeta.motivation_hook : "";
  const objectives: Array<{ statement: string; bloom_level?: string }> =
    Array.isArray(lmeta.learning_objectives) ? lmeta.learning_objectives : [];
  const lessonGlossary: Array<{ term: string; definition: string }> =
    Array.isArray(lmeta.glossary) ? lmeta.glossary : [];
  const specialtyGlossary: Array<{ term: string; definition: string }> =
    Array.isArray(specialtyMeta?.glossary) ? (specialtyMeta!.glossary as any[]) : [];
  const yemeni = Array.isArray(l.yemeniExamples) && (l.yemeniExamples as string[]).length
    ? (l.yemeniExamples as string[]).map((x) => `  - ${x}`).join("\n")
    : "  (لا توجد أمثلة محفوظة — استخدم الأمثلة المولّدة أدناه)";

  const conceptLines = lp.concepts.length
    ? lp.concepts.map((cn) => {
        const score = mastery.get(cn.conceptIndex) ?? 0;
        const flag = score >= 80 ? "✅ متقن" : score >= 40 ? "⚠️ يحتاج تدعيم" : "⛔ ضعف واضح";
        const w = (cn as any).weight ?? 1;
        const wTag = w > 1 ? ` ⚖ وزن:${w}` : "";
        return `  ${cn.conceptIndex}. ${cn.name} [${flag} — ${score}/100]${wTag}\n     معيار الإتقان: ${cn.masteryCriterion}`;
      })
    : ["  (لا توجد مفاهيم مفصّلة لهذا الدرس)"];

  const mistakeLines = lp.mistakes.length
    ? lp.mistakes.map((m) => {
        const sev = (m as any).severity ?? "major";
        const sevTag =
          sev === "critical" ? " 🔥 خطر فادح" :
          sev === "minor"    ? " ✦ خفيف"     : "";
        return `  - ❌ ${m.mistake}${sevTag}\n    ✅ الصواب: ${m.correction}\n    🛠 العلاج: ${m.treatment}`;
      })
    : ["  (لا توجد أخطاء شائعة محفوظة)"];

  const examplesBlock = c.examples.length
    ? c.examples.map((e) => `  - **${e.title || "مثال"}**: ${e.body}`).join("\n")
    : "  (لا توجد أمثلة مولّدة)";
  const checksBlock = c.checks.length
    ? c.checks.map((q, i) => `  ${i + 1}. ${q.question}`).join("\n")
    : "  (لا توجد أسئلة تحقق مولّدة)";
  const analogiesBlock = c.analogies.length
    ? c.analogies.map((a) => `  - ${a}`).join("\n")
    : "  (لا توجد تشبيهات مولّدة)";
  const microBlock = c.microExplanations.length
    ? c.microExplanations.map((m) => `  - مفهوم ${m.conceptIndex}: ${m.explanation}`).join("\n")
    : "  (لا توجد شروح مصغّرة)";

  // v4.1 — assemble the optional pedagogical blocks. Each renders only
  // when the instruction file actually carries the field.
  const motivationBlock = motivation ? [`- خطّاف التحفيز (افتح به الجلسة بشكل طبيعي): ${motivation}`] : [];
  const objectivesBlock = objectives.length
    ? [
        "- أهداف التعلّم لهذا الدرس (Bloom):",
        ...objectives.map((o) => `  • ${o.statement}${o.bloom_level ? ` [${o.bloom_level}]` : ""}`),
      ]
    : [];
  const solutionBlock = (l as any).solutionOutline
    ? [`- مخطّط الإجابة النموذجية لسؤال التحقق النهائي (مرجع داخلي — لا تُعطه للطالب): ${(l as any).solutionOutline}`]
    : [];
  const mergedGlossary = [...specialtyGlossary, ...lessonGlossary];
  const glossaryBlock = mergedGlossary.length
    ? [
        "- مسرد المصطلحات (استخدم هذه التعريفات بالضبط حين تذكر المصطلح أول مرة):",
        ...mergedGlossary.map((g) => `  • ${g.term} — ${g.definition}`),
      ]
    : [];
  const lessonFinalSolution = (l as any).solutionOutline ? solutionBlock : [];
  return [
    "## 2. محتوى الدرس",
    `- التخصص: ${subjectName}`,
    `- كود الدرس: ${l.code}`,
    `- الاسم: ${l.name}`,
    `- الهدف: ${l.goal}`,
    ...motivationBlock,
    ...objectivesBlock,
    `- الجملة الافتتاحية الإلزامية (اذكرها في أول رسالة فقط): ${l.bridgeSentence}`,
    `- سؤال التحقق النهائي (يجب أن يُجاب صحيحاً قبل [LESSON_MASTERED]): ${l.finalCheckQuestion}`,
    ...lessonFinalSolution,
    `- معيار اكتمال الجلسة (قبل [SESSION_COMPLETE]): ${l.sessionCompleteCriterion}`,
    "- أمثلة يمنية متاحة:",
    yemeni,
    ...glossaryBlock,
    "",
    "**المفاهيم وحالة الإتقان** (ركّز على ما < 80؛ أصدر [MASTERY: …] كلما تأكد إتقان؛ ⚖ تعني وزن أعلى — اعطِه أولوية):",
    ...conceptLines,
    "",
    "**الأخطاء الشائعة** (إذا وقع الطالب فيها، صحّح بالعلاج المحدّد):",
    ...mistakeLines,
    "",
    "**المحتوى المولّد** (مرجع للاستخدام التدريجي — لا تُلقِه دفعة واحدة):",
    `- التمهيد: ${c.intro}`,
    "- شروح مصغّرة:",
    microBlock,
    "- أمثلة:",
    examplesBlock,
    "- أسئلة تحقّق:",
    checksBlock,
    "- تشبيهات:",
    analogiesBlock,
    `- جملة الختام: ${c.closingBridge}`,
  ].join("\n");
}

// ─── L3: Unit / Stage / Level context ──────────────────────────────────
function buildContextLayer(usl: {
  unit: { code: string; name: string; index: number; meta: Record<string, any> | null } | null;
  stage: { code: string; name: string; index: number; meta: Record<string, any> | null } | null;
  level: { name: string; index: number; meta: Record<string, any> | null } | null;
}): string {
  if (!usl.unit) {
    return "## 3. السياق الهرمي (الوحدة/المرحلة/المستوى)\n(تعذّر تحميل السياق — تعامل مع الدرس كنقطة مستقلة)";
  }
  // v4.1 — surface bloom_focus (level/stage) and the unit's motivation_hook
  // + learning_objectives when the instruction-file ships them. All optional;
  // absent fields collapse to nothing so v4.0 trees render unchanged.
  const lvlBloom = usl.level?.meta?.bloom_focus ? ` (تركيز Bloom: ${usl.level.meta.bloom_focus})` : "";
  const stgBloom = usl.stage?.meta?.bloom_focus ? ` (تركيز Bloom: ${usl.stage.meta.bloom_focus})` : "";
  const lines: string[] = [
    `- المستوى: ${usl.level ? `${usl.level.index}. ${usl.level.name}${lvlBloom}` : "(غير معروف)"}`,
    `- المرحلة: ${usl.stage ? `${usl.stage.code} — ${usl.stage.name}${stgBloom}` : "(غير معروفة)"}`,
    `- الوحدة الحالية: ${usl.unit.code} — ${usl.unit.name}`,
  ];
  const unitHook = usl.unit.meta?.motivation_hook;
  if (typeof unitHook === "string" && unitHook.trim()) {
    lines.push(`- لماذا هذه الوحدة (محفّز): ${unitHook.trim()}`);
  }
  const unitObjs = Array.isArray(usl.unit.meta?.learning_objectives) ? usl.unit.meta!.learning_objectives : [];
  if (unitObjs.length) {
    lines.push("- أهداف الوحدة:");
    for (const o of unitObjs) {
      const stmt = String(o?.statement ?? "").trim();
      const bl = o?.bloom_level ? ` [${o.bloom_level}]` : "";
      if (stmt) lines.push(`  • ${stmt}${bl}`);
    }
  }
  return ["## 3. السياق الهرمي (الوحدة/المرحلة/المستوى)", ...lines].join("\n");
}

// ─── L4: Long-term memory (placeholder for task #6) ─────────────────────
export function buildMemoryPlaceholderLayer(): string {
  return [
    "## 4. الذاكرة الدائمة (Persistent Memory)",
    "(placeholder — سيُملأ في مهمة #6: قاموس شخصي + ميول التعلّم + ملاحظات سلوكية متراكمة عبر الجلسات)",
  ].join("\n");
}

// ─── L5: Last 2 session summaries + compressed older history ────────────
export function buildSessionHistoryLayer(layer9Text: string): string {
  if (!layer9Text) {
    return [
      "## 5. ملخّصات آخر جلستين + سياق المحادثة الحالية",
      "(لا يوجد محتوى سابق مضغوط — كامل المحادثة الحالية مرفق في رسائل الجلسة)",
    ].join("\n");
  }
  return [
    "## 5. ملخّصات آخر جلستين + سياق المحادثة الحالية (للمرجع فقط — لا تُكرّر منه)",
    "تم تقليص الرسائل الأقدم إلى رأس+ذيل ~400 حرف لكل رسالة؛ آخر 12 رسالة مرفقة كاملة في رسائل الجلسة.",
    "",
    layer9Text,
  ].join("\n");
}

// ─── L6: Reference material ────────────────────────────────────────────
// For the standard custom path this layer is an empty placeholder — no
// external source material is bound to a v4 lesson. The booklet path
// REPLACES this layer with bound-page + cosine-top RAG chunks via the
// exported `buildBookletReferenceLayer` helper below, which the booklet
// teach route assembles into the same 9-layer scaffold (see
// v4-booklet.ts → buildBookletTeacherPrompt).
export function buildReferenceMaterialPlaceholderLayer(): string {
  return [
    "## 6. المادة المرجعية",
    "(لا توجد مصادر مرجعية مربوطة بهذا الدرس — اعتمد على محتوى الدرس في الطبقة ٢ وذاكرتك التعليمية.)",
  ].join("\n");
}

// L6 variant used by the booklet path. Same layer slot, real content.
export function buildBookletReferenceLayer(opts: {
  bookletTitle: string;
  lessonPages: [number, number];
  chunks: Array<{ pageNumber: number; text: string }>;
}): string {
  const [pStart, pEnd] = opts.lessonPages;
  const body = opts.chunks.length
    ? opts.chunks.map((c) => `[صفحة ${c.pageNumber}] ${c.text}`).join("\n\n")
    : "(لا توجد مقاطع مسترجَعة — تحقّق من ربط الدرس بالصفحات)";
  return [
    "## 6. المادة المرجعية (المصدر الوحيد المسموح — RAG من ملزمة الطالب)",
    `- الملزمة: "${opts.bookletTitle}"`,
    `- الصفحات المربوطة بهذا الدرس: ${pStart}–${pEnd}`,
    "- اعتمد فقط على المقاطع التالية. ممنوع منعاً باتاً إضافة معلومات من معرفتك العامة أو من خارج هذه المقاطع.",
    "- كل ادعاء يجب أن يُذيَّل برقم صفحته بالشكل [ص:N] (للصفحة الواحدة) أو [ص:N-M] (لمدى).",
    "- استخدم الصيغة بهذا الشكل بالضبط داخل أقواس مربعة [ ] — الواجهة تحوّلها إلى شارة قابلة للنقر تفتح نص الصفحة للطالب.",
    "- إذا الطالب سأل سؤالاً خارج هذه المقاطع، اعتذر بأدب وأعد توجيهه للصفحات المربوطة.",
    "- ممنوع اختلاق أرقام صفحات؛ استشهد فقط بأرقام موجودة أدناه.",
    "",
    body,
  ].join("\n");
}

// ─── L7: Unit labs (placeholder for task #7) ────────────────────────────
export function buildUnitLabsPlaceholderLayer(): string {
  return [
    "## 7. معامل الوحدة المتاحة",
    "(placeholder — ستُسرَد هنا معامل الوحدة في مهمة #7. حالياً اطلب المعمل عبر [[CREATE_LAB_ENV: kind=…]] واشرح أنه قيد التحضير)",
  ].join("\n");
}

// ─── L8: Difficulty + pacing hint ───────────────────────────────────────
/** Mirrors FACET_PASS in v4-concept-facets-engine. Kept local on purpose to
 *  avoid a circular import (the facets engine already imports from this file).
 *  A facet counts toward pacing velocity only when cleared ON MERIT (score ≥
 *  this), so a facet "covered" merely by hitting the 2-attempt cap never
 *  inflates the pace. */
const FACET_VELOCITY_PASS = 70;

function buildDifficultyLayer(
  concepts: V4LessonConcept[],
  mastery: Map<number, number>,
  facetsByConcept?: Map<number, V4ConceptFacets>,
): string {
  if (concepts.length === 0) {
    return "## 8. الصعوبة\n- ابدأ بمستوى متوسط ثم اضبط بناءً على تجاوب الطالب.";
  }
  // v4.1 — weighted average using concept.weight. Defaults to 1 so v4.0
  // files (where every weight is 1) produce the exact same number as the
  // legacy plain average.
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of concepts) {
    const w = Math.max(1, ((c as any).weight ?? 1) as number);
    weightedSum += (mastery.get(c.conceptIndex) ?? 0) * w;
    weightTotal += w;
  }
  const avg = weightTotal > 0 ? weightedSum / weightTotal : 0;
  let hint: string;
  if (avg >= 70) hint = "ارفع الصعوبة: أسئلة تطبيقية متشعّبة، أمثلة أعمق، وقتٌ أقل للتلميح.";
  else if (avg >= 35) hint = "حافظ على مستوى متوسط: مزيج من السؤال المباشر والسيناريو التطبيقي.";
  else hint = "خفّض الصعوبة: ابدأ بأسئلة استرجاع، ثم استنتاج، قبل التطبيق.";

  // Facet-clearance velocity (T6) — DETERMINISTIC pacing replaces the old
  // model-issued [DIFFICULTY_UP/DOWN] self-adjustment. velocity = facets cleared
  // on merit ÷ attempts spent on them: fast first-try clears (→1.0) mean compress
  // the pace, many attempts per clear (→0) mean slow down. Pending/ungraded
  // facets have attempts=0 and never skew the signal.
  let totalAttempts = 0;
  let meritCleared = 0;
  if (facetsByConcept) {
    for (const f of facetsByConcept.values()) {
      for (const key of ["w2", "w3"] as const) {
        const st = f?.[key];
        if (!st) continue;
        const attempts = st.attempts ?? 0;
        if (attempts <= 0) continue;
        totalAttempts += attempts;
        if (st.covered === true && (st.score ?? 0) >= FACET_VELOCITY_PASS) meritCleared += 1;
      }
    }
  }

  const lines = [
    "## 8. الصعوبة والإيقاع الموصى بهما",
    `- متوسط الإتقان الحالي: ${avg.toFixed(0)}/100`,
    `- التوجيه: ${hint}`,
  ];
  if (totalAttempts > 0) {
    const velocity = meritCleared / totalAttempts;
    let pace: string;
    if (velocity >= 0.8) pace = "اضغط الإيقاع: ادمج الأوجه المترابطة، قلّل الأمثلة التمهيدية، وانتقل أسرع للتطبيق.";
    else if (velocity <= 0.4) pace = "خفّض الإيقاع: جزّئ المفهوم لخطوات أصغر، أكثِر الأمثلة الملموسة، وتحقّق بعد كل خطوة.";
    else pace = "حافظ على الإيقاع الحالي: تابع بنفس درجة التفصيل.";
    lines.push(
      `- سرعة استيعاب الأوجه: ${(velocity * 100).toFixed(0)}% (${meritCleared}/${totalAttempts}) — ${pace}`,
    );
  }
  return lines.join("\n");
}

// ─── L9: Language directives ────────────────────────────────────────────
export function buildLanguageLayer(lang: string): string {
  if (lang === "ar") {
    return [
      "## 9. اللغة",
      "- اكتب بالعربية الفصحى المبسّطة مع نكهة يمنية في الأمثلة والتشبيهات (مأكولات/أسواق/أحياء).",
      "- اتجاه النص: من اليمين إلى اليسار (RTL).",
      "- لا تُدخل جملاً إنجليزية إلا للمصطلحات التقنية، وحينها ضعها بين قوسين بعد الترجمة العربية.",
      "- 🚨🚨 **المسافات بين الكلمات — أهم قاعدة في اللغة العربية (أهم من كل القواعد الأخرى):**",
      "  * اترك مسافة واحدة بين كل كلمة عربية والتي تليها. لا استثناء. لا تدمج كلمتين.",
      "  * قبل إرسال أي رد، اقرأ الرد كلمة كلمة وتأكد أن كل كلمة مفصولة بمسافة.",
      "  * أمثلة شائعة للخطأ والصواب:",
      "    ❌ «مرحباًبكم» ✅ «مرحباً بكم»",
      "    ❌ «فينُخبة» ✅ «في نُخبة»",
      "    ❌ «اليومدرس» ✅ «اليوم درس»",
      "    ❌ «صناديقحفظ» ✅ «صناديق حفظ»",
      "    ❌ «النصوص.بنهاية» ✅ «النصوص. بنهاية»",
      "    ❌ «علىالشاشة» ✅ «على الشاشة»",
      "    ❌ «فيهطريقة» ✅ «فيه طريقة»",
      "    ❌ «مهمجداً» ✅ «مهم جداً»",
      "    ❌ «أكثرمن» ✅ «أكثر من»",
      "  * إذا أرسلت رداً فيه كلمات متلاصقة، سيكون الرد غير مفهوم للطالب وسيفشل الدرس.",
      "- **⛔ أسماء الكود بالإنجليزية — قاعدة مطلقة لا استثناء فيها**: في كل كود تكتبه، المتغيرات والدوال والكلاسات إنجليزية فقط. التعليقات وحدها عربية. مثال صحيح: `def calculate_salary(count):  # احسب الراتب`. مثال خاطئ (ممنوع): `def احسب_الراتب(العدد):`.",
    ].join("\n");
  }
  return [
    "## 9. Language",
    `- Respond in ${lang}.`,
    "- Keep technical terms in their canonical form; translate on first introduction.",
  ].join("\n");
}
