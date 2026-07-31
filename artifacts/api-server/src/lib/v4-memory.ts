/**
 * v4-memory.ts — Unified teacher memory (task #6).
 *
 * Implements the three "human layers" approved by the v4 spec §5.3:
 *   • Layer 2 — Personal dictionary  (occupation, hobbies, examples, etc.)
 *   • Layer 4 — Mastery enforcement  (block fake [LESSON_MASTERED])
 *   • Layer 7 — Warmth anchors       (what made the student laugh / worry)
 *
 * All three live on a SINGLE per-user profile row (`v4_student_profile`) —
 * memory is intentionally cross-subject because "the student is one person
 * across every specialty" (spec §5.1: "ذاكرة المعلم موحّدة عبر المسارات
 * والمواد").
 *
 * Token-bomb defense (spec §5.2): a weekly Haiku pass collapses the full
 * memory into a ~300-token summary stored in `v4_student_memory_summaries`.
 * Only the latest summary is injected into the teaching prompt — never the
 * raw 50K-token history.
 *
 * Cost handling — memory work is cross-subject but the v4 wallet is
 * per-subject, so each Haiku pass picks the student's "primary" v4 wallet
 * (the one whose subject the student is most actively studying — highest
 * recent activity by `updated_at`, with a positive balance) and debits it
 * via `chargeV4Ai`. When the student has no v4 wallet at all (e.g. brand
 * new account before any purchase), we fall back to `recordAiUsage` only
 * so the audit trail is preserved and the capture/summary still runs. The
 * per-call cost is tiny (~$0.001–$0.005) and the request_id is uniquely
 * namespaced so refunds remain idempotent.
 */

import { and, desc, eq, gte, gt, sql } from "drizzle-orm";
import {
  db,
  v4StudentProfileTable,
  v4StudentMemorySummariesTable,
  v4WeaknessTrackerTable,
  v4ConceptMasteryTable,
  v4LessonConceptsTable,
  v4LessonsTable,
  studentGemWalletsTable,
  type MemoryEntry,
  type V4PersonalDictionary,
  type V4WarmthAnchors,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { recordAiUsage, extractAnthropicUsage } from "./ai-usage";
import { chargeV4Ai } from "./v4-gem-wallet";
import { logger } from "./logger";
import { randomUUID } from "node:crypto";

/** Locked Haiku model for all cross-subject memory work. Cheap + fast. */
const MEMORY_HAIKU_MODEL = "anthropic/claude-haiku-4.5" as const;

/** Hard ceiling on what goes into Layer 4 — keeps total prompt < 8K tokens
 *  (spec §6.3 architectural constraint). The weekly summary takes ~300
 *  tokens, dictionary/warmth/weakness ~600 combined ⇒ comfortable margin. */
const LAYER4_MAX_CHARS = 3500;

// ─────────────────────────────────────────────────────────────────────────────
// Reads — gather memory for the teaching prompt
// ─────────────────────────────────────────────────────────────────────────────

export type V4StudentMemoryBundle = {
  profile: {
    personalDictionary: V4PersonalDictionary;
    warmthAnchors: V4WarmthAnchors;
    learningStyle: string | null;
  } | null;
  latestSummary: { text: string; createdAt: Date } | null;
  /** Top-N most chronic weaknesses across the whole student (any subject). */
  topWeaknesses: Array<{
    lessonId: number;
    lessonCode: string | null;
    lessonName: string | null;
    conceptIndex: number;
    errorCount: number;
    lastSeen: Date;
  }>;
};

/**
 * Pull every piece of long-term memory we have on a student. Read-only,
 * cross-subject — safe to call on every teaching turn (small, indexed
 * queries on user_id).
 */
export async function getStudentMemory(userId: number): Promise<V4StudentMemoryBundle> {
  const [profile] = await db
    .select()
    .from(v4StudentProfileTable)
    .where(eq(v4StudentProfileTable.userId, userId));

  const [latestSummary] = await db
    .select()
    .from(v4StudentMemorySummariesTable)
    .where(eq(v4StudentMemorySummariesTable.userId, userId))
    .orderBy(desc(v4StudentMemorySummariesTable.createdAt))
    .limit(1);

  // Top 6 weaknesses by error count, then recency. Joined to the lesson
  // table so Layer 4 can name the lesson the student keeps tripping on
  // instead of leaking opaque integers.
  const weaknessRows = await db
    .select({
      lessonId: v4WeaknessTrackerTable.lessonId,
      conceptIndex: v4WeaknessTrackerTable.conceptIndex,
      errorCount: v4WeaknessTrackerTable.errorCount,
      lastSeen: v4WeaknessTrackerTable.lastSeen,
      lessonCode: v4LessonsTable.code,
      lessonName: v4LessonsTable.name,
    })
    .from(v4WeaknessTrackerTable)
    .leftJoin(v4LessonsTable, eq(v4LessonsTable.id, v4WeaknessTrackerTable.lessonId))
    .where(eq(v4WeaknessTrackerTable.userId, userId))
    .orderBy(desc(v4WeaknessTrackerTable.errorCount), desc(v4WeaknessTrackerTable.lastSeen))
    .limit(6);

  return {
    profile: profile
      ? {
          personalDictionary: (profile.personalDictionary as V4PersonalDictionary) ?? {},
          warmthAnchors: (profile.warmthAnchors as V4WarmthAnchors) ?? {},
          learningStyle: profile.learningStyle ?? null,
        }
      : null,
    latestSummary: latestSummary
      ? { text: latestSummary.summaryText, createdAt: latestSummary.createdAt }
      : null,
    topWeaknesses: weaknessRows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 renderer — slot into v4-teaching-core.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render the Layer-4 block of the teaching system prompt from a memory
 * bundle. When the student has no memory at all (brand-new account), the
 * block keeps its old placeholder text so the prompt structure is stable
 * across "cold" and "warm" sessions.
 *
 * The block ENDS with an explicit instruction ("استخدم مثالاً من القاموس
 * الشخصي في كل شرح") because the spec §5.3 layer 2 line is non-negotiable:
 * "المعلم ملزم باستخدام مثال من القاموس في كل شرح."
 */
export function buildMemoryLayer4(memory: V4StudentMemoryBundle): string {
  const lines: string[] = ["## 4. الذاكرة الدائمة عن الطالب (موحّدة عبر كل المواد)"];

  // Spec §5.2 — token-bomb defense: when a fresh (<7d) weekly summary
  // exists it REPLACES the raw dictionary/warmth/weakness blocks. The
  // summary was generated specifically to compress those signals; quoting
  // both doubles the prompt cost without adding information. We still
  // include the chronic-weakness LIST below the summary because the
  // teacher needs lesson-code anchors the Haiku summary deliberately
  // strips out, but it is capped to 3 rows (vs. 6 in detailed mode).
  const summary = memory.latestSummary;
  const summaryIsFresh =
    !!summary && Date.now() - summary.createdAt.getTime() < ONE_WEEK_MS;

  const p = memory.profile;

  if (summaryIsFresh) {
    const dateStr = summary!.createdAt.toISOString().slice(0, 10);
    lines.push(
      "",
      `**ملخص ذاكرة الطالب الأسبوعي** (آخر تحديث: ${dateStr}) — هذا الملخص يحل محل تفاصيل القاموس والدفء لتوفير التوكنز. وظّفه كذاكرة معاش، ولا تكرّره حرفياً:`,
      summary!.text,
    );
    if (memory.topWeaknesses.length) {
      lines.push("", "**نقاط ضعف متراكمة حالية** (مرساة دروس — راجعها عند المناسبة):");
      for (const row of memory.topWeaknesses.slice(0, 3)) {
        const where = row.lessonCode
          ? `${row.lessonCode}${row.lessonName ? ` — ${row.lessonName}` : ""}`
          : `درس #${row.lessonId}`;
        lines.push(`  - ${where} (مفهوم ${row.conceptIndex}) × ${row.errorCount}`);
      }
    }
  } else {
    // No fresh summary yet — render the detailed long-memory blocks.
    const hasDict =
      p &&
      (p.personalDictionary.occupation ||
        (p.personalDictionary.hobbies?.length ?? 0) > 0 ||
        (p.personalDictionary.examples?.length ?? 0) > 0 ||
        (p.personalDictionary.places?.length ?? 0) > 0 ||
        (p.personalDictionary.family?.length ?? 0) > 0 ||
        (p.personalDictionary.extras?.length ?? 0) > 0);

    if (hasDict) {
      lines.push("", "**القاموس الشخصي للطالب** (استخدم منه مثالاً في كل شرح — قاعدة إلزامية. البيانات الموسومة بـ (قديم) استخدمها بحذر):");
      const d = p!.personalDictionary;
      if (d.occupation) lines.push(`  - المهنة/الدراسة: ${d.occupation}`);
      const h = renderMemoryArray(d.hobbies, ", ");
      if (h) lines.push(`  - الهوايات: ${h}`);
      const x = renderMemoryArray(d.examples, " — ");
      if (x) lines.push(`  - أمثلة مفضّلة: ${x}`);
      const pl = renderMemoryArray(d.places, ", ");
      if (pl) lines.push(`  - أماكن مألوفة: ${pl}`);
      const f = renderMemoryArray(d.family, ", ");
      if (f) lines.push(`  - العائلة: ${f}`);
      const e = renderMemoryArray(d.extras, " — ");
      if (e) lines.push(`  - أخرى: ${e}`);
    } else {
      lines.push("", "**القاموس الشخصي**: (لم يُجمَع بعد — استخرج أي إشارة شخصية من رسائل الطالب وستُحفظ تلقائياً)");
    }

    if (p?.learningStyle) {
      lines.push("", `**أسلوب التعلّم المفضّل**: ${p.learningStyle}`);
    }

    const w = p?.warmthAnchors;
    const hasWarmth =
      w && ((w.laughs?.length ?? 0) > 0 || (w.confidence?.length ?? 0) > 0 || (w.worries?.length ?? 0) > 0);
    if (hasWarmth) {
      lines.push("", "**ذاكرة الدفء** (وظّفها لبناء الصلة، لا تذكرها صراحة):");
      const laughs = renderMemoryArray(w!.laughs?.slice(-3), " / ");
      if (laughs) lines.push(`  - ضحك من: ${laughs}`);
      const conf = renderMemoryArray(w!.confidence?.slice(-3), " / ");
      if (conf) lines.push(`  - عبّر بثقة عن: ${conf}`);
      const wor = renderMemoryArray(w!.worries?.slice(-3), " / ");
      if (wor) lines.push(`  - قلق من: ${wor}`);
    }

    if (memory.topWeaknesses.length) {
      lines.push("", "**نقاط ضعف متراكمة** (راجعها عند أي مناسبة طبيعية):");
      for (const row of memory.topWeaknesses) {
        const where = row.lessonCode
          ? `${row.lessonCode}${row.lessonName ? ` — ${row.lessonName}` : ""}`
          : `درس #${row.lessonId}`;
        lines.push(`  - ${where} (مفهوم ${row.conceptIndex}) × ${row.errorCount}`);
      }
    }

    // Stale-summary case: still surface it as fallback context, but flag
    // it so the teacher trusts the live blocks above more.
    if (summary) {
      const dateStr = summary.createdAt.toISOString().slice(0, 10);
      lines.push(
        "",
        `**ملخص سابق** (قديم — ${dateStr}، للسياق فقط):`,
        summary.text,
      );
    } else if (!hasDict && !hasWarmth && memory.topWeaknesses.length === 0) {
      lines.push(
        "",
        "(الطالب جديد — لا توجد ذاكرة متراكمة بعد. ابدأ ببناء الصلة واجمع مثالاً شخصياً واحداً على الأقل خلال أوّل ٣ رسائل)",
      );
    }
  }

  let block = lines.join("\n");
  if (block.length > LAYER4_MAX_CHARS) {
    block = `${block.slice(0, LAYER4_MAX_CHARS - 50)}\n… (تم اقتطاع الذاكرة الزائدة لضبط حجم الموجّه)`;
  }
  return block;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writes — capture / update memory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bump the per-(user, lesson, concept) weakness counter. Called whenever
 * the teacher emits [NEEDS_REVIEW: concept=N]. Idempotent in the sense
 * that repeated calls increment a real signal (the student keeps tripping
 * on the same concept) — that's the WHOLE POINT of the tracker, so unlike
 * other v4 writes this one is NOT no-op on repeat.
 */
export async function bumpWeakness(opts: {
  userId: number;
  lessonId: number;
  conceptIndex: number;
}): Promise<void> {
  try {
    await db
      .insert(v4WeaknessTrackerTable)
      .values({
        userId: opts.userId,
        lessonId: opts.lessonId,
        conceptIndex: opts.conceptIndex,
        errorCount: 1,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          v4WeaknessTrackerTable.userId,
          v4WeaknessTrackerTable.lessonId,
          v4WeaknessTrackerTable.conceptIndex,
        ],
        set: {
          errorCount: sql`${v4WeaknessTrackerTable.errorCount} + 1`,
          lastSeen: new Date(),
        },
      });
  } catch (e) {
    logger.warn?.(
      `[v4-memory] bumpWeakness failed user=${opts.userId} lesson=${opts.lessonId} concept=${opts.conceptIndex}: ${String((e as any)?.message ?? e)}`,
    );
  }
}

/**
 * Clear a per-(user, lesson, concept) weakness once the student has mastered
 * it (score ≥ 75) via targeted practice. Deletes the tracker row so it no
 * longer surfaces as a chronic weakness in cross-lesson callbacks. No-op (and
 * never throws) when there is no row.
 */
export async function clearWeakness(opts: {
  userId: number;
  lessonId: number;
  conceptIndex: number;
}): Promise<void> {
  try {
    await db
      .delete(v4WeaknessTrackerTable)
      .where(and(
        eq(v4WeaknessTrackerTable.userId, opts.userId),
        eq(v4WeaknessTrackerTable.lessonId, opts.lessonId),
        eq(v4WeaknessTrackerTable.conceptIndex, opts.conceptIndex),
      ));
  } catch (e) {
    logger.warn?.(
      `[v4-memory] clearWeakness failed user=${opts.userId} lesson=${opts.lessonId} concept=${opts.conceptIndex}: ${String((e as any)?.message ?? e)}`,
    );
  }
}

export type MasteryGateResult = {
  allMastered: boolean;
  /** Concepts that are still below the threshold — empty when allMastered. */
  missing: Array<{ conceptIndex: number; score: number }>;
};

/**
 * Mastery gate for [LESSON_MASTERED]. The teacher MAY emit the tag at any
 * time but the system rejects it unless EVERY concept of the lesson has a
 * stored score ≥ minScore (spec §5.3 layer 4: "لا يُسمح بإطلاق
 * [LESSON_MASTERED] إلا إذا كل مفاهيم الدرس ≥ ٧٥").
 *
 * Concepts with NO stored score are treated as score=0, i.e. they BLOCK
 * the gate. This is intentional — the only way to clear the gate is for
 * the teacher to have updated mastery for every concept in the lesson.
 */
export async function enforceLessonMasteryGate(opts: {
  userId: number;
  lessonId: number;
  minScore?: number;
}): Promise<MasteryGateResult> {
  const minScore = opts.minScore ?? 75;
  const concepts = await db
    .select({ conceptIndex: v4LessonConceptsTable.conceptIndex })
    .from(v4LessonConceptsTable)
    .where(eq(v4LessonConceptsTable.lessonId, opts.lessonId));

  if (concepts.length === 0) {
    // Lessons without any indexed concepts can't enforce per-concept
    // gating — let the tag through (back-compat with skeletal lessons).
    return { allMastered: true, missing: [] };
  }

  const scoresRows = await db
    .select({
      conceptIndex: v4ConceptMasteryTable.conceptIndex,
      score: v4ConceptMasteryTable.score,
    })
    .from(v4ConceptMasteryTable)
    .where(and(
      eq(v4ConceptMasteryTable.userId, opts.userId),
      eq(v4ConceptMasteryTable.lessonId, opts.lessonId),
    ));
  const scoreByIndex = new Map<number, number>();
  for (const r of scoresRows) scoreByIndex.set(r.conceptIndex, r.score);

  const missing: Array<{ conceptIndex: number; score: number }> = [];
  for (const c of concepts) {
    const s = scoreByIndex.get(c.conceptIndex) ?? 0;
    if (s < minScore) missing.push({ conceptIndex: c.conceptIndex, score: s });
  }
  return { allMastered: missing.length === 0, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost handling — debit a Haiku memory pass to the student's primary wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Anthropic Haiku 4.5 pricing as of May 2026 (USD per 1M tokens).
 * Sync with `lib/ai-pricing.ts` if it ever exposes Haiku 4.5.
 */
const HAIKU_PRICE_INPUT_PER_M = 1.0;
const HAIKU_PRICE_OUTPUT_PER_M = 5.0;
const HAIKU_PRICE_CACHED_INPUT_PER_M = 0.1;

function estimateHaikuCostUsd(opts: {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}): number {
  const cached = opts.cachedInputTokens ?? 0;
  const fresh = Math.max(0, opts.inputTokens - cached);
  return (
    (fresh * HAIKU_PRICE_INPUT_PER_M) / 1_000_000 +
    (cached * HAIKU_PRICE_CACHED_INPUT_PER_M) / 1_000_000 +
    (opts.outputTokens * HAIKU_PRICE_OUTPUT_PER_M) / 1_000_000
  );
}

/**
 * Pick the v4 wallet to debit for a cross-subject memory Haiku pass.
 * Strategy:
 *   1) If `preferredSubjectId` has a wallet with positive balance, use it
 *      (the student is actively in that subject — fairest to charge there).
 *   2) Otherwise pick the most-recently-updated wallet WITH gems_balance > 0.
 *   3) Otherwise pick the most-recently-updated wallet (so refunds align).
 * Returns null when the student has no v4 wallet at all.
 */
async function pickPrimaryWalletSubjectId(opts: {
  userId: number;
  preferredSubjectId?: string | null;
}): Promise<string | null> {
  if (opts.preferredSubjectId) {
    const [pref] = await db
      .select({ subjectId: studentGemWalletsTable.subjectId })
      .from(studentGemWalletsTable)
      .where(and(
        eq(studentGemWalletsTable.userId, opts.userId),
        eq(studentGemWalletsTable.subjectId, opts.preferredSubjectId),
      ));
    // ذ٤ — attribute memory costs to the ACTIVE session's subject even when
    // its wallet balance is low or zero. Haiku memory passes cost ~$0.001 and
    // should never bleed onto a different subject's wallet — that contaminates
    // per-subject cost tracking and can debit a subject the student never
    // intended to use. The wallet row must exist (student has visited the
    // subject at least once); `chargeV4Ai` handles 0-balance gracefully.
    if (pref) return pref.subjectId;
  }

  const [funded] = await db
    .select({ subjectId: studentGemWalletsTable.subjectId })
    .from(studentGemWalletsTable)
    .where(and(
      eq(studentGemWalletsTable.userId, opts.userId),
      gt(studentGemWalletsTable.gemsBalance, 0),
    ))
    .orderBy(desc(studentGemWalletsTable.updatedAt))
    .limit(1);
  if (funded) return funded.subjectId;

  const [any] = await db
    .select({ subjectId: studentGemWalletsTable.subjectId })
    .from(studentGemWalletsTable)
    .where(eq(studentGemWalletsTable.userId, opts.userId))
    .orderBy(desc(studentGemWalletsTable.updatedAt))
    .limit(1);
  return any?.subjectId ?? null;
}

/**
 * Charge a Haiku memory pass to the student's primary v4 wallet AND
 * record the AI-usage audit row. Falls back to recordAiUsage-only when
 * the student has no v4 wallet (brand-new account) so the capture/summary
 * pass still completes. Unique `requestId` namespaced per route.
 */
async function debitMemoryHaikuCost(opts: {
  userId: number;
  preferredSubjectId?: string | null;
  route: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  latencyMs: number;
}): Promise<void> {
  const subjectId = await pickPrimaryWalletSubjectId({
    userId: opts.userId,
    preferredSubjectId: opts.preferredSubjectId ?? null,
  });
  const costUsd = estimateHaikuCostUsd({
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    cachedInputTokens: opts.cachedInputTokens,
  });

  // Always write the audit row first — failure of the wallet debit must
  // never lose the usage record.
  void recordAiUsage({
    userId: opts.userId,
    subjectId: subjectId ?? null,
    route: opts.route,
    provider: "anthropic",
    model: MEMORY_HAIKU_MODEL,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    cachedInputTokens: opts.cachedInputTokens,
    latencyMs: opts.latencyMs,
  });

  if (!subjectId || costUsd <= 0) return; // nothing to debit / new account

  const requestId = `mem:${opts.route}:${opts.userId}:${randomUUID()}`;
  try {
    await chargeV4Ai({
      userId: opts.userId,
      subjectId,
      costUsd,
      requestId,
      source: "v4_ai_memory",
      model: MEMORY_HAIKU_MODEL,
      note: `memory:${opts.route}`,
    });
  } catch (err) {
    logger.warn?.(
      `[v4-memory] debit failed user=${opts.userId} route=${opts.route}: ${String((err as any)?.message ?? err)}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Haiku-powered capture passes (fire-and-forget from caller)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a personal dictionary from the 5-question diagnostic transcript.
 * Called from `/v4/path/:slug/diagnostic/finish` as fire-and-forget — the
 * student doesn't wait for it and the diagnostic finish call returns
 * regardless of success. Cost: ~$0.001/run.
 *
 * Merge semantics: anything already in the profile dictionary is PRESERVED;
 * the Haiku output adds new entries and replaces `occupation` only when
 * Haiku gave a non-empty value. This protects existing data from being
 * blanked by a low-confidence re-run.
 */
export async function capturePersonalDictionaryFromDiagnostic(opts: {
  userId: number;
  subjectId: string;
  diagnosticAnswers: Array<{ question: string; answer: string }>;
}): Promise<void> {
  const transcript = opts.diagnosticAnswers
    .filter((a) => a.answer && a.answer.trim() && !/^\s*لا\s*شي\s*$/.test(a.answer))
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
    .join("\n\n");
  if (!transcript) return; // nothing usable to extract

  const startedAt = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: MEMORY_HAIKU_MODEL,
      max_tokens: 512,
      system:
        "استخرج معلومات شخصية مفيدة لمعلم نُخبة من إجابات الطالب التشخيصية. " +
        "أعد JSON فقط بهذا الشكل (بدون أي نص خارجي): " +
        '{"occupation": string|null, "hobbies": string[], "examples": string[], "places": string[], "family": string[], "extras": string[], "learningStyle": string|null}. ' +
        "الحقول كلها اختيارية — اترك المصفوفات فارغة إذا لم تجد. " +
        "occupation = مهنة أو تخصص دراسي صريح. examples = أمثلة شخصية يحبها الطالب. extras = أي شيء يساعد المعلم على بناء الصلة. " +
        "learningStyle = وصف موجز (حتى ١٠ كلمات) لطريقة تعلّم الطالب المُستنتجة من إجاباته، مثلاً: 'يفضّل الأمثلة العملية' أو 'يميل للاستنتاج بنفسه'. اتركه null إن لم يوجد مؤشر واضح.",
      messages: [{ role: "user", content: transcript }],
    });

    const u = extractAnthropicUsage(msg);
    await debitMemoryHaikuCost({
      userId: opts.userId,
      preferredSubjectId: opts.subjectId,
      route: "v4/memory/dictionary-capture",
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      cachedInputTokens: u.cachedInputTokens,
      latencyMs: Date.now() - startedAt,
    });

    const rawText = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
    const parsed = safeParseJsonObject(rawText);
    if (!parsed) return;

    const extracted = normalizeDictionaryShape(parsed);
    await mergePersonalDictionary(opts.userId, extracted);

    // ذ٢ — persist learningStyle when Haiku detected one from the diagnostic.
    // This is the ideal extraction moment because the 5-question diagnostic
    // transcript contains the most concentrated personal signal we ever see.
    // We store it on the profile row (not in personalDictionary) so Layer 1
    // can surface it as a top-level teaching-style modifier.
    const lsRaw = typeof parsed.learningStyle === "string" && parsed.learningStyle.trim()
      ? parsed.learningStyle.trim().slice(0, 120)
      : null;
    if (lsRaw) {
      await db
        .update(v4StudentProfileTable)
        .set({ learningStyle: lsRaw, updatedAt: new Date() })
        .where(eq(v4StudentProfileTable.userId, opts.userId))
        .catch(() => {});
    }
  } catch (err) {
    void recordAiUsage({
      userId: opts.userId,
      subjectId: opts.subjectId,
      route: "v4/memory/dictionary-capture",
      provider: "anthropic",
      model: MEMORY_HAIKU_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: String((err as any)?.message ?? err).slice(0, 500),
    });
    logger.warn?.(`[v4-memory] dictionary capture failed user=${opts.userId}: ${String((err as any)?.message ?? err)}`);
  }
}

/**
 * Capture warmth anchors from a completed teaching session. Called from
 * `/v4/teach` as fire-and-forget AFTER the SSE has closed. Cost: ~$0.002/run.
 *
 * We pass only the most recent ~6 turns — warmth signals are local to the
 * current session and ancient history rarely produces useful anchors.
 */
export async function captureWarmthFromSession(opts: {
  userId: number;
  subjectId: string;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<void> {
  const usable = opts.recentMessages.slice(-6).filter((m) => m.content && m.content.trim());
  if (usable.length < 2) return; // not enough signal

  const transcript = usable
    .map((m) => `[${m.role === "user" ? "الطالب" : "المعلم"}]: ${m.content.slice(0, 400)}`)
    .join("\n\n");

  const startedAt = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: MEMORY_HAIKU_MODEL,
      max_tokens: 400,
      system:
        "أنت تلتقط إشارات دفء عاطفية مفيدة لمعلم نُخبة من جلسة تعليم. " +
        "أعد JSON فقط: " +
        '{"laughs": string[], "confidence": string[], "worries": string[]}. ' +
        "كل عنصر سطر قصير جداً (حتى ٨ كلمات) باللهجة اليمنية إن أمكن. " +
        "اترك المصفوفة فارغة إن لم تجد إشارة واضحة — لا تخترع. لا تكرر ما هو محفوظ سابقاً (لا تعرفه — اكتفِ بهذه الجلسة).",
      messages: [{ role: "user", content: transcript }],
    });

    const u = extractAnthropicUsage(msg);
    await debitMemoryHaikuCost({
      userId: opts.userId,
      preferredSubjectId: opts.subjectId,
      route: "v4/memory/warmth-capture",
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      cachedInputTokens: u.cachedInputTokens,
      latencyMs: Date.now() - startedAt,
    });

    const rawText = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
    const parsed = safeParseJsonObject(rawText);
    if (!parsed) return;

    const captured: V4WarmthAnchors = {
      laughs: cleanStringArray(parsed.laughs),
      confidence: cleanStringArray(parsed.confidence),
      worries: cleanStringArray(parsed.worries),
    };
    if (!captured.laughs?.length && !captured.confidence?.length && !captured.worries?.length) return;

    await mergeWarmthAnchors(opts.userId, captured);
  } catch (err) {
    void recordAiUsage({
      userId: opts.userId,
      subjectId: opts.subjectId,
      route: "v4/memory/warmth-capture",
      provider: "anthropic",
      model: MEMORY_HAIKU_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: String((err as any)?.message ?? err).slice(0, 500),
    });
    logger.warn?.(`[v4-memory] warmth capture failed user=${opts.userId}: ${String((err as any)?.message ?? err)}`);
  }
}

/**
 * Light post-session personal-dictionary capture. Called from `/v4/teach`
 * on SESSION_COMPLETE — separate from the diagnostic capture, this one
 * scans recent student turns for fresh personal signals (profession,
 * family, places, examples) that surfaced naturally during teaching.
 * Cost: ~$0.001/run. Fire-and-forget.
 *
 * The Haiku prompt is intentionally narrower than the diagnostic capture
 * (no `learningStyle`, terser system) because the input is shorter and we
 * don't want it inventing facts from a 6-turn slice.
 */
export async function capturePersonalDictionaryFromSession(opts: {
  userId: number;
  subjectId: string;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<void> {
  const studentTurns = opts.recentMessages
    .filter((m) => m.role === "user" && m.content && m.content.trim())
    .slice(-6);
  if (studentTurns.length < 2) return;
  const transcript = studentTurns
    .map((m, i) => `S${i + 1}: ${m.content.slice(0, 400)}`)
    .join("\n");

  const startedAt = Date.now();
  try {
    const msg = await anthropic.messages.create({
      model: MEMORY_HAIKU_MODEL,
      max_tokens: 350,
      system:
        "استخرج فقط الإشارات الشخصية الجديدة (مهنة/دراسة، أسرة، أماكن، أمثلة محبّبة) " +
        "من رسائل الطالب التالية. أعد JSON فقط: " +
        '{"occupation": string|null, "hobbies": string[], "examples": string[], "places": string[], "family": string[], "extras": string[]}. ' +
        "لا تخترع. اترك المصفوفة فارغة إن لم تجد إشارة صريحة. الحقول كلها قصيرة (حتى ٨ كلمات).",
      messages: [{ role: "user", content: transcript }],
    });

    const u = extractAnthropicUsage(msg);
    await debitMemoryHaikuCost({
      userId: opts.userId,
      preferredSubjectId: opts.subjectId,
      route: "v4/memory/dictionary-capture-session",
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      cachedInputTokens: u.cachedInputTokens,
      latencyMs: Date.now() - startedAt,
    });

    const rawText = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
    const parsed = safeParseJsonObject(rawText);
    if (!parsed) return;
    const extracted = normalizeDictionaryShape(parsed);
    // Skip an entirely-empty extraction (no need to write zero rows).
    if (
      !extracted.occupation &&
      !extracted.hobbies?.length &&
      !extracted.examples?.length &&
      !extracted.places?.length &&
      !extracted.family?.length &&
      !extracted.extras?.length
    ) return;
    await mergePersonalDictionary(opts.userId, extracted);
  } catch (err) {
    void recordAiUsage({
      userId: opts.userId,
      subjectId: opts.subjectId,
      route: "v4/memory/dictionary-capture-session",
      provider: "anthropic",
      model: MEMORY_HAIKU_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: String((err as any)?.message ?? err).slice(0, 500),
    });
    logger.warn?.(`[v4-memory] session-dictionary capture failed user=${opts.userId}: ${String((err as any)?.message ?? err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly summarisation (token-bomb defense — spec §5.2)
// ─────────────────────────────────────────────────────────────────────────────

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Run the weekly summary pass for ONE student. Idempotent: re-running the
 * same day produces a fresh summary row but the latest-row read in Layer 4
 * just picks the newest one. Bailing-out condition: no profile AND no
 * weaknesses AND no prior summary — nothing meaningful to compress.
 */
export async function weeklyMemorySummarize(userId: number): Promise<{ summarized: boolean }> {
  // Soft idempotency guard — re-read the latest summary right before the
  // Haiku call and bail if anything < 7 days old has been written since
  // we were scheduled. Defends against duplicate summaries when the
  // sweep race-loses to a manual trigger or a concurrent worker. The
  // DB has no per-week unique index because "week" is a moving window
  // (not a calendar week), so we enforce the policy here instead.
  const [recent] = await db
    .select({ createdAt: v4StudentMemorySummariesTable.createdAt })
    .from(v4StudentMemorySummariesTable)
    .where(eq(v4StudentMemorySummariesTable.userId, userId))
    .orderBy(desc(v4StudentMemorySummariesTable.createdAt))
    .limit(1);
  if (recent && Date.now() - recent.createdAt.getTime() < ONE_WEEK_MS) {
    return { summarized: false };
  }

  const mem = await getStudentMemory(userId);
  // Only summarise when there is FRESH signal to compress. A prior summary
  // alone does not justify re-summarising — that would burn Haiku tokens
  // on dormant accounts and produce drift-only summaries.
  //   • No prior summary: any profile or weakness row counts as signal.
  //   • Prior summary exists: only weakness rows touched AFTER that summary
  //     OR a profile updated AFTER it qualify.
  const lastSummaryAt = mem.latestSummary?.createdAt.getTime() ?? 0;
  let profileFresh = false;
  if (mem.profile) {
    if (lastSummaryAt === 0) {
      profileFresh = true;
    } else {
      const [pr] = await db
        .select({ updatedAt: v4StudentProfileTable.updatedAt })
        .from(v4StudentProfileTable)
        .where(eq(v4StudentProfileTable.userId, userId));
      profileFresh = !!pr && pr.updatedAt.getTime() > lastSummaryAt;
    }
  }
  const weaknessFresh = mem.topWeaknesses.some((w) => w.lastSeen.getTime() > lastSummaryAt);
  if (!profileFresh && !weaknessFresh) return { summarized: false };

  const inputBlocks: string[] = [];
  if (mem.profile) {
    inputBlocks.push(
      `[القاموس الشخصي]\n${JSON.stringify(mem.profile.personalDictionary, null, 2)}`,
      `[ذاكرة الدفء]\n${JSON.stringify(mem.profile.warmthAnchors, null, 2)}`,
    );
    if (mem.profile.learningStyle) inputBlocks.push(`[أسلوب التعلّم] ${mem.profile.learningStyle}`);
  }
  if (mem.topWeaknesses.length) {
    inputBlocks.push(
      `[أهم نقاط الضعف]\n${mem.topWeaknesses
        .map((w) => `- ${w.lessonCode ?? `lesson#${w.lessonId}`} مفهوم ${w.conceptIndex} ×${w.errorCount}`)
        .join("\n")}`,
    );
  }
  if (mem.latestSummary) {
    inputBlocks.push(`[الملخص السابق]\n${mem.latestSummary.text}`);
  }
  const fullInput = inputBlocks.join("\n\n");

  const startedAt = Date.now();
  let summaryText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  try {
    const msg = await anthropic.messages.create({
      model: MEMORY_HAIKU_MODEL,
      max_tokens: 600, // budget for ~300 Arabic tokens of output
      system:
        "لخّص ذاكرة الطالب التالية في ~٣٠٠ توكن عربي. أبرز: من هو، ماذا يحب، ما يضحكه/يقلقه، أين يضعف، " +
        "وأسلوب تعلّمه. اكتب فقرة موجزة موجّهة لمعلم سيقرأها في بداية كل جلسة قادمة. " +
        "لا قوائم طويلة. لا تكرار. عربية فصحى مبسّطة.",
      messages: [{ role: "user", content: fullInput }],
    });
    const u = extractAnthropicUsage(msg);
    inputTokens = u.inputTokens;
    outputTokens = u.outputTokens;
    cachedInputTokens = u.cachedInputTokens;
    summaryText = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
  } catch (err) {
    void recordAiUsage({
      userId,
      subjectId: null,
      route: "v4/memory/weekly-summary",
      provider: "anthropic",
      model: MEMORY_HAIKU_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: String((err as any)?.message ?? err).slice(0, 500),
    });
    logger.warn?.(`[v4-memory] weekly summary failed user=${userId}: ${String((err as any)?.message ?? err)}`);
    return { summarized: false };
  }

  await debitMemoryHaikuCost({
    userId,
    preferredSubjectId: null,
    route: "v4/memory/weekly-summary",
    inputTokens,
    outputTokens,
    cachedInputTokens,
    latencyMs: Date.now() - startedAt,
  });

  if (!summaryText) return { summarized: false };

  const now = new Date();
  const periodStart = mem.latestSummary?.createdAt ?? new Date(now.getTime() - ONE_WEEK_MS);
  await db.insert(v4StudentMemorySummariesTable).values({
    userId,
    summaryText,
    periodStart,
    periodEnd: now,
    tokensEstimate: outputTokens,
  });
  return { summarized: true };
}

/**
 * Sweep — find every user whose latest summary is older than one week (or
 * who has memory but no summary yet) and summarise them. Designed to run
 * from `scheduled-jobs.ts` on the hourly tick; the inner per-user calls
 * are bounded by `MAX_PER_TICK` to spread Haiku load across the day even
 * when many students cross the 7-day mark at the same hour.
 */
export async function runWeeklyMemorySweep(opts?: { maxPerTick?: number }): Promise<{
  summarized: number;
  skipped: number;
  errors: number;
}> {
  const MAX_PER_TICK = opts?.maxPerTick ?? 25;
  const cutoff = new Date(Date.now() - ONE_WEEK_MS);

  // Candidate set: only users with FRESH memory signal — a profile or
  // weakness row whose `updated_at`/`last_seen` is more recent than the
  // user's latest summary (or who have signal AND no summary at all).
  // This avoids re-summarising dormant accounts every week and bounds
  // total Haiku spend to actual student activity.
  const [profilesRecent, weaknessRecent, summaryLatest] = await Promise.all([
    db
      .select({ userId: v4StudentProfileTable.userId, updatedAt: v4StudentProfileTable.updatedAt })
      .from(v4StudentProfileTable)
      .where(gte(v4StudentProfileTable.updatedAt, cutoff)),
    db
      .select({ userId: v4WeaknessTrackerTable.userId, lastSeen: v4WeaknessTrackerTable.lastSeen })
      .from(v4WeaknessTrackerTable)
      .where(gte(v4WeaknessTrackerTable.lastSeen, cutoff)),
    db
      .select({
        userId: v4StudentMemorySummariesTable.userId,
        createdAt: sql<Date>`max(${v4StudentMemorySummariesTable.createdAt})`,
      })
      .from(v4StudentMemorySummariesTable)
      .groupBy(v4StudentMemorySummariesTable.userId),
  ]);

  const lastSummaryByUser = new Map<number, number>();
  for (const s of summaryLatest as Array<{ userId: number; createdAt: Date }>) {
    lastSummaryByUser.set(s.userId, new Date(s.createdAt).getTime());
  }

  const candidates = new Set<number>();
  const isFresh = (uid: number, ts: Date) => {
    const last = lastSummaryByUser.get(uid) ?? 0;
    if (Date.now() - last < ONE_WEEK_MS && last > 0) return false; // covered already
    return ts.getTime() > last;
  };
  for (const p of profilesRecent as Array<{ userId: number; updatedAt: Date }>) {
    if (isFresh(p.userId, p.updatedAt)) candidates.add(p.userId);
  }
  for (const w of weaknessRecent as Array<{ userId: number; lastSeen: Date }>) {
    if (isFresh(w.userId, w.lastSeen)) candidates.add(w.userId);
  }

  const due: Array<{ userId: number }> = [];
  for (const uid of candidates) {
    due.push({ userId: uid });
    if (due.length >= MAX_PER_TICK) break;
  }

  let summarized = 0;
  let skipped = 0;
  let errors = 0;
  for (const { userId } of due) {
    try {
      const r = await weeklyMemorySummarize(userId);
      if (r.summarized) summarized++;
      else skipped++;
    } catch (err) {
      errors++;
      logger.warn?.(`[v4-memory] sweep user=${userId} failed: ${String((err as any)?.message ?? err)}`);
    }
  }
  return { summarized, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeParseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function cleanStringArray(v: unknown, max = 5): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0 && x.length <= 200)
    .slice(0, max);
  return out.length ? out : undefined;
}

function normalizeDictionaryShape(raw: Record<string, unknown>): V4PersonalDictionary {
  const occ = typeof raw.occupation === "string" && raw.occupation.trim() ? raw.occupation.trim() : undefined;
  return {
    occupation: occ,
    hobbies: cleanStringArray(raw.hobbies),
    examples: cleanStringArray(raw.examples),
    places: cleanStringArray(raw.places),
    family: cleanStringArray(raw.family),
    extras: cleanStringArray(raw.extras),
  };
}

/**
 * Read-modify-write merge of the personal dictionary. The merge UNIONs
 * array fields (de-duping case-insensitively, capping each at 10 items)
 * and only overwrites `occupation` when the new value is non-empty.
 * Race is acceptable here — two concurrent merges from different sessions
 * is exceptionally rare and at worst loses one new entry until the next
 * session repeats it.
 */
async function mergePersonalDictionary(userId: number, incoming: V4PersonalDictionary): Promise<void> {
  await ensureProfileRow(userId);
  // ذ٥ — wrap the read-modify-write in a transaction to reduce the race
  // window between concurrent Haiku capture passes (e.g. SESSION_COMPLETE and
  // LESSON_MASTERED firing within milliseconds of each other for the same
  // student). Without a transaction, the second write can clobber entries
  // added by the first. READ COMMITTED isolation still applies, but the
  // atomic {read, merge, write} prevents most practical interleaving.
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(v4StudentProfileTable)
      .where(eq(v4StudentProfileTable.userId, userId));
    const existing = (row?.personalDictionary as V4PersonalDictionary) ?? {};
    const merged: V4PersonalDictionary = {
      occupation: incoming.occupation || existing.occupation,
      hobbies: unionCapped(existing.hobbies, wrapEntries(incoming.hobbies)),
      examples: unionCapped(existing.examples, wrapEntries(incoming.examples)),
      places: unionCapped(existing.places, wrapEntries(incoming.places)),
      family: unionCapped(existing.family, wrapEntries(incoming.family)),
      extras: unionCapped(existing.extras, wrapEntries(incoming.extras)),
    };
    await tx
      .update(v4StudentProfileTable)
      .set({ personalDictionary: merged, updatedAt: new Date() })
      .where(eq(v4StudentProfileTable.userId, userId));
  });
}

async function mergeWarmthAnchors(userId: number, incoming: V4WarmthAnchors): Promise<void> {
  await ensureProfileRow(userId);
  const [row] = await db
    .select()
    .from(v4StudentProfileTable)
    .where(eq(v4StudentProfileTable.userId, userId));
  const existing = (row?.warmthAnchors as V4WarmthAnchors) ?? {};
  // Warmth uses tail-bounded queues (most recent 10) rather than a union
  // so stale anchors don't dominate as the student evolves.
  const merged: V4WarmthAnchors = {
    laughs: tailBounded([...(existing.laughs ?? []), ...(wrapEntries(incoming.laughs) ?? [])], 10),
    confidence: tailBounded([...(existing.confidence ?? []), ...(wrapEntries(incoming.confidence) ?? [])], 10),
    worries: tailBounded([...(existing.worries ?? []), ...(wrapEntries(incoming.worries) ?? [])], 10),
  };
  await db
    .update(v4StudentProfileTable)
    .set({ warmthAnchors: merged, updatedAt: new Date() })
    .where(eq(v4StudentProfileTable.userId, userId));
}

async function ensureProfileRow(userId: number): Promise<void> {
  await db
    .insert(v4StudentProfileTable)
    .values({ userId, personalDictionary: {}, warmthAnchors: {} })
    .onConflictDoNothing({ target: v4StudentProfileTable.userId });
}

function memValue(e: MemoryEntry): string {
  return typeof e === "string" ? e : e.value;
}

function memCapturedAt(e: MemoryEntry): string | undefined {
  return typeof e === "string" ? undefined : e.capturedAt;
}

function daysAgo(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  return Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
}

/** Render a MemoryEntry array for the system prompt, marking stale entries. */
function renderMemoryArray(items: MemoryEntry[] | undefined, sep: string): string {
  if (!items?.length) return "";
  return items.map(e => {
    const v = memValue(e);
    const d = daysAgo(memCapturedAt(e));
    if (d === undefined) return v;
    if (d > 60) return `${v} (منذ ${d} يوم — قديم)`;
    if (d > 30) return `${v} (منذ ${d} يوم)`;
    return v;
  }).join(sep);
}

function wrapEntries(arr: (string | MemoryEntry)[] | undefined): MemoryEntry[] | undefined {
  if (!arr?.length) return undefined;
  const now = new Date().toISOString();
  return arr.map(v => typeof v === "object" && "value" in (v as any)
    ? v as MemoryEntry
    : { value: typeof v === "string" ? v : String(v), capturedAt: now });
}

function unionCapped(a: MemoryEntry[] | undefined, b: MemoryEntry[] | undefined, cap = 10): MemoryEntry[] | undefined {
  const all = [...(a ?? []), ...(b ?? [])];
  if (all.length === 0) return undefined;
  const seen = new Set<string>();
  const out: MemoryEntry[] = [];
  for (const raw of all) {
    const v = memValue(raw).trim();
    const ca = memCapturedAt(raw);
    const k = v.toLowerCase().replace(/\s+/g, " ").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(ca ? { value: v, capturedAt: ca } : v);
    if (out.length >= cap) break;
  }
  return out.length ? out : undefined;
}

function tailBounded(arr: MemoryEntry[], cap: number): MemoryEntry[] | undefined {
  if (!arr.length) return undefined;
  const seen = new Set<string>();
  const out: MemoryEntry[] = [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = memValue(arr[i]).trim();
    const ca = memCapturedAt(arr[i]);
    const k = v.toLowerCase();
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.unshift(ca ? { value: v, capturedAt: ca } : arr[i]);
    if (out.length >= cap) break;
  }
  return out.length ? out : undefined;
}
