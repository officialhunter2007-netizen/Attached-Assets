/**
 * v4 task #5 — POST /api/v4/teach SSE teaching endpoint.
 *
 * Body: { slug, lessonCode, message, requestId?, history? }
 * Stream: SSE — { content: "...partial..." } chunks then a terminal
 *   { done: true, ...effects } event.
 *
 * Flow per turn:
 *   1. requireUser + requireSameOriginCsrf
 *   2. Resolve specialty + verify lesson is in unlockedLessonCodes
 *   3. Generate a stable requestId (used for chargeV4Ai idempotency)
 *   4. Get-or-generate lesson content (lazy gen — task #5 invariant)
 *   5. Build 9-layer system prompt
 *   6. Stream via streamGeminiTeaching (Gemini 2.0 Flash — model lock)
 *   7. Charge v4 wallet (chargeV4Ai)
 *   8. Parse protocol tags + apply effects
 *   9. Emit terminal `done` event with effects
 *   On any failure → refundV4Ai + emitV4FriendlyFailure
 *
 * Parallel to legacy `/ai/teach` — legacy stays in service until task #10.
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4DiagnosticSessionsTable,
  v4ConceptMasteryTable,
  v4StudentPathsTable,
  aiTeacherMessagesTable,
  studentGemWalletsTable,
  type V4FacetKey,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { resolveActiveSpecialty, getStudentPath, syncStudentPathToActiveVersion } from "../lib/v4-path-engine";
import { gradePendingFacet, markFacetPending } from "../lib/v4-concept-facets-engine";
import {
  getOrGenerateLessonContent,
  buildTeacherSystemPrompt,
  compressHistory,
  classifyV4Turn,
  V4_TEACHING_MODEL,
  assertGeminiForTeaching,
} from "../lib/v4-teaching-core";
import {
  parseProtocolTags,
  applyTagEffects,
  stripProtocolTags,
  extractCodeTask,
} from "../lib/v4-protocol-tags";
import { chargeV4Ai, refundV4Ai, canAffordV4Turn } from "../lib/v4-gem-wallet";
import {
  getStudentMemory,
  captureWarmthFromSession,
  capturePersonalDictionaryFromSession,
} from "../lib/v4-memory";
import {
  streamGeminiTeaching,
  type GeminiMessage,
  type GeminiContentPart,
} from "../lib/gemini-stream";
import { getTeacherProviderOverride } from "../lib/ai-teacher-provider";
import { resolveWebPhoto } from "../lib/teacher-image-store";
import { emitFriendlyAiFailure } from "./ai";
import {
  authorMermaidDiagram,
  normalizeDiagramKind,
  DIAGRAM_AI_USD,
  type DiagramRequest,
} from "../lib/v4-diagram-author";
import { requireSameOriginCsrf } from "../lib/csrf";
import { checkTeachAbuse } from "../lib/teach-abuse-guard";
import {
  authorComparison,
  COMPARISON_AI_USD,
  type ComparisonRequest,
} from "../lib/v4-comparison-author";

const router: IRouter = Router();

// Single inline image data URL (mirrors the legacy ai.ts multimodal split).
// The FE embeds at most ONE attached image as a markdown data URL in the
// CURRENT turn only; we pull it out so the model receives a proper
// `image_url` part and the text/history never carry the multi-MB base64 blob.
const V4_DATA_URL_RE = /data:image\/[a-zA-Z+.\-]+;base64,[A-Za-z0-9+/=]+/;
const V4_DATA_URL_RE_G = /data:image\/[a-zA-Z+.\-]+;base64,[A-Za-z0-9+/=]+/g;

function extractV4ImageDataUrl(text: string): { dataUrl: string | null; cleaned: string } {
  if (typeof text !== "string" || text.length === 0) return { dataUrl: null, cleaned: text || "" };
  const m = text.match(V4_DATA_URL_RE);
  if (!m) return { dataUrl: null, cleaned: text };
  const dataUrl = m[0];
  const cleaned = text
    .replace(/!\[[^\]]*\]\(data:image\/[a-zA-Z+.\-]+;base64,[A-Za-z0-9+/=]+\)/, "[صورة مرفقة]")
    .replace(V4_DATA_URL_RE, "[صورة مرفقة]")
    .trim();
  return { dataUrl, cleaned };
}

function countWordsV4(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function excerptV4(text: string, maxChars = 16000): string {
  const s = text.trim();
  if (s.length <= maxChars) return s;
  const mid = Math.floor(maxChars * 0.7);
  return s.slice(0, mid) + "\n…[مقتطع]\n" + s.slice(s.length - (maxChars - mid));
}

// ── Thinking-leak stripper ────────────────────────────────────────────────────
// The model occasionally leaks its internal analysis ("تحليل:") and constraints
// ("القيود:") as a preamble BEFORE the actual teaching response. Even though the
// prompt now explicitly forbids this, this stateful streaming filter acts as a
// deterministic safety net so it can NEVER reach the student.
//
// Usage: one instance per request. Call .filter(chunk) on every SSE chunk —
// returns "" while buffering a suspected preamble, or the clean content once
// the preamble (if any) has been detected and dropped.
// Call .flush() at end-of-stream to release any buffered non-thinking content.
//
// After the full stream, call stripThinkingLeakFromText(fullText) to clean the
// persisted transcript too.

const THINKING_MARKER_RE = /[\[【]?\s*(?:🧠\s*)?(?:تحليل|تحليل:)|(?:^|\n)القيود\s*:/;
const CHECK_AFTER_CHARS  = 60;    // start checking once we have this many chars
const MAX_PREAMBLE_CHARS = 6000;  // safety cap: stop stripping if block exceeds this

function createThinkingLeakStripper() {
  let buf = "";
  let decided = false;   // have we determined the mode?
  let stripping = false; // are we actively stripping a thinking block?

  function tryReleaseAfterPreamble(): string {
    if (buf.length > MAX_PREAMBLE_CHARS) {
      // Safety: preamble is unreasonably long — give up stripping
      decided = true; stripping = false;
      const out = buf; buf = "";
      return out;
    }
    // The preamble ends after القيود section, signalled by \n\n
    const qIdx = buf.lastIndexOf("القيود");
    if (qIdx > -1) {
      const endIdx = buf.indexOf("\n\n", qIdx + "القيود".length);
      if (endIdx > -1) {
        const real = buf.slice(endIdx + 2);
        buf = ""; decided = true; stripping = false;
        return real;
      }
    }
    // Fallback: double-newline well into the buffer after clear thinking content
    const nnIdx = buf.lastIndexOf("\n\n");
    if (nnIdx > 200) {
      const after = buf.slice(nnIdx + 2).trimStart();
      if (after.length > 20 && !THINKING_MARKER_RE.test(after)) {
        buf = ""; decided = true; stripping = false;
        return after;
      }
    }
    return ""; // still buffering
  }

  return {
    filter(chunk: string): string {
      if (decided && !stripping) return chunk; // pass-through
      buf += chunk;
      if (decided && stripping) return tryReleaseAfterPreamble();
      // Not yet decided — wait until we have enough chars
      if (buf.length < CHECK_AFTER_CHARS) return "";
      decided = true;
      stripping = THINKING_MARKER_RE.test(buf);
      if (!stripping) {
        const out = buf; buf = "";
        return out; // not a thinking block — release and switch to pass-through
      }
      return tryReleaseAfterPreamble();
    },
    flush(): string {
      // End of stream: release whatever is left
      const out = buf; buf = "";
      if (!decided) return out;  // short response never triggered the check
      if (stripping) return "";  // stream ended inside a thinking block — drop it
      return out;
    },
  };
}

/** Strip any leading thinking-leak preamble from the fully accumulated text
 *  (used to clean `fullText` before persistence). */
function stripThinkingLeakFromText(text: string): string {
  if (!THINKING_MARKER_RE.test(text.slice(0, 600))) return text;
  // Find where القيود section ends
  const qIdx = text.lastIndexOf("القيود");
  if (qIdx > -1 && qIdx < 4000) {
    const endIdx = text.indexOf("\n\n", qIdx + "القيود".length);
    if (endIdx > -1) return text.slice(endIdx + 2);
  }
  // Fallback: first double-newline after a significant preamble
  const nnIdx = text.indexOf("\n\n");
  if (nnIdx > 100 && nnIdx < 4000) return text.slice(nnIdx + 2);
  return text;
}

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}
function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}

/**
 * Friendly-failure helper — single source of truth is `emitFriendlyAiFailure`
 * exported from `./ai`. Wrapped here so the v4 teach route can keep its own
 * `routeTag` prefix without re-implementing the SSE/JSON branching, the
 * `writableEnded` no-op guard, or the FATAL server-side log line.
 */
function emitV4FriendlyFailure(res: Response, routeTag: string, err: unknown): void {
  emitFriendlyAiFailure(res, routeTag, err);
}

/**
 * Per-wallet in-flight turn guard.
 *
 * SECURITY/REVENUE: the wallet is charged only AFTER the stream finishes. The
 * pre-stream gate checks affordability, but it is NOT a reservation — so N
 * concurrent requests for the same (user, subject) can all pass the gate while
 * the balance is still positive, each stream a full reply, and only one of them
 * actually drains/charges the wallet. The others would be free.
 *
 * Serializing teach turns per (user, subject) closes that window: a second
 * concurrent turn for the same wallet is rejected with the same terminal SSE
 * contract the FE already understands. Legitimate users never hit this (the FE
 * issues one turn at a time and waits for `done`); only parallel abuse does.
 *
 * In-process only — acceptable because this route runs in a single Node server.
 * If it is ever horizontally scaled, replace with a DB advisory lock or a
 * pre-stream debit reservation.
 */
const inflightTeachTurns = new Set<string>();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v4/viz/report — lightweight "report a problem" affordance from
// the VizWrapper. Auth-gated so we know who reported, but NOT CSRF-gated:
// it only writes a server log line (no state mutation, no financial/user
// data touched), so the cross-origin-POST risk that CSRF exists for doesn't
// apply here.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/v4/viz/report", requireUser, (req, res): void => {
  const uid: number = (req as any).userId;
  const body: any = req.body ?? {};
  const template = String(body.template ?? "").slice(0, 60);
  const reason = String(body.reason ?? "").slice(0, 300);
  logger.warn?.(`[v4/viz/report] userId=${uid} template=${template} reason="${reason}"`);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v4/teach
// ─────────────────────────────────────────────────────────────────────────────
router.post("/v4/teach", requireUser, requireSameOriginCsrf, async (req, res): Promise<void> => {
  const uid: number = (req as any).userId;
  const body: any = req.body ?? {};
  const slug = String(body.slug ?? "").trim();
  const lessonCode = String(body.lessonCode ?? "").trim();
  const message = String(body.message ?? "").trim();
  // SECURITY: requestId is ALWAYS server-generated. Accepting a client
  // value here would let an attacker replay an old idempotency key to
  // avoid being charged, or force a "failure" with the same key to
  // refund an unrelated successful debit. The downside (no client-side
  // retry idempotency) is acceptable because the FE never retries a
  // teaching turn — a network failure ends the SSE and the student
  // re-types the message, which is a separate turn semantically.
  const requestId = `v4t_${Date.now()}_${randomBytes(8).toString("hex")}`;
  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history)
    ? body.history
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role, content: String(m.content) }))
    : [];
  // First turn = empty client history. The opening-message prompt contract
  // (Section 11 in v4-teaching-core.ts) tells the model NOT to emit or
  // promise a SCENE/IMAGE/PHOTO tag in this turn, but that is advisory only:
  // the model has been observed ignoring it and emitting a real
  // [[SCENE:...]] tag anyway. isFirstTurn below also gates a DETERMINISTIC
  // server-side strip of SCENE/IMAGE/PHOTO tags from the outgoing stream so
  // the opening message can never render a visual regardless of model output.
  const isFirstTurn = history.length === 0;

  if (!slug || !lessonCode || !message) {
    res.status(400).json({ error: "slug, lessonCode, message required" });
    return;
  }

  // ── كشف سرعة الإرسال الزائدة ──────────────────────────────────────────
  const abuse = checkTeachAbuse(uid, message);
  if (!abuse.allowed) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ content: "\n\n⏳ " + (abuse.warning ?? "تم رفض الطلب") + "\n\n" })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, charged: false, teachAbuse: true, severity: abuse.severity, cooldownMs: abuse.cooldownMs ?? 0 })}\n\n`);
    res.end();
    return;
  }

  // Admin custom-provider override (teacher only). When configured + active,
  // the teacher runs on the admin's OpenAI-compatible provider/model and the
  // Gemini model lock is bypassed. When null, the default OpenRouter+Gemini
  // channel is used and the lock is enforced (zero behaviour change).
  let teacherProvider: { endpoint: string; apiKey: string; model: string } | null = null;
  try {
    const override = await getTeacherProviderOverride();
    if (override) {
      teacherProvider = {
        endpoint: override.endpoint,
        apiKey: override.apiKey,
        model: override.model,
      };
    }
  } catch (e) {
    // Never let an override-resolution failure break teaching — fall back to
    // the default channel.
    console.warn("[v4/teach] provider override resolution failed; using default channel:", e);
    teacherProvider = null;
  }

  // Model lock guard — defends against future regressions wiring this route
  // to anything other than Gemini Flash. Skipped when a custom provider is
  // active (the admin chose the model explicitly).
  if (!teacherProvider) {
    try {
      assertGeminiForTeaching(V4_TEACHING_MODEL);
    } catch (e) {
      emitV4FriendlyFailure(res, "v4/teach:model-lock", e);
      return;
    }
  }

  // ── 1. Resolve specialty + verify enrolment + lesson unlock ─────────
  let resolved;
  let studentPath;
  let lesson;
  try {
    resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(403).json({ error: "no_student_path" }); return; }
    // Migrate to active instruction version if the admin has published a
    // newer one since the student enrolled — keeps lesson content in sync
    // with the admin editor without manual student re-enrollment.
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    const unlocked: string[] = Array.isArray(studentPath.unlockedLessonCodes)
      ? (studentPath.unlockedLessonCodes as string[])
      : [];

    const [row] = await db
      .select()
      .from(v4LessonsTable)
      .where(and(
        eq(v4LessonsTable.versionId, resolved.versionId),
        eq(v4LessonsTable.code, lessonCode),
      ));
    if (!row) { res.status(404).json({ error: "lesson_not_found" }); return; }
    lesson = row;
  } catch (e) {
    emitV4FriendlyFailure(res, "v4/teach:resolve", e);
    return;
  }

  // ── 1b. PRE-STREAM WALLET GATE ──────────────────────────────────────
  // SECURITY/REVENUE: the wallet is only charged AFTER the stream finishes
  // (so we charge for real usage). Without a gate here, a student with no /
  // empty / expired wallet would receive a full AI reply for free on every
  // turn — unlimited, since the post-stream charge silently no-ops. Check
  // affordability BEFORE spending any AI tokens. Auto-creates the wallet +
  // one-time +100 welcome gift on first touch so the free trial still works.
  try {
    const afford = await canAffordV4Turn(uid, slug);
    if (!afford.ok) {
      // Emit the SAME terminal contract the FE already understands so the
      // existing paywall UI triggers cleanly — no AI call, no stream.
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
      res.write(
        `data: ${JSON.stringify({
          done: true,
          charged: false,
          insufficientGems: true,
          noWallet: afford.noWallet,
          balanceAfter: afford.balance,
        })}\n\n`,
      );
      res.end();
      return;
    }
  } catch (e) {
    emitV4FriendlyFailure(res, "v4/teach:wallet-gate", e);
    return;
  }

  // ── 1c. PER-WALLET IN-FLIGHT LOCK ───────────────────────────────────
  // Close the concurrent-turn revenue gap: the gate above is a check, not a
  // reservation, so parallel turns for the same wallet could each stream a
  // full reply while only one charges. Reject a second concurrent turn with
  // the same terminal SSE contract the FE already understands.
  const turnLockKey = `${uid}:${slug}`;
  if (inflightTeachTurns.has(turnLockKey)) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(
      `data: ${JSON.stringify({
        done: true,
        charged: false,
        turnInFlight: true,
        error: "turn_in_flight",
      })}\n\n`,
    );
    res.end();
    return;
  }
  inflightTeachTurns.add(turnLockKey);

  // ── SSE channel: open headers + heartbeat IMMEDIATELY after lock ────
  // CRITICAL UX FIX: the pre-stream phase (lazy content gen + 9-layer
  // prompt build) can take 40-55 s on a first-visit lesson.  Without
  // early SSE setup the client `await fetch()` blocks silently for that
  // entire window — looks identical to a hang, spinner never clears.
  //
  // By sending SSE headers NOW the client's fetch() resolves within ~1 s
  // of sending the message.  Heartbeats arrive every 15 s, confirming the
  // connection is alive.  Any error in the pre-stream work is delivered as
  // an SSE event (emitFriendlyAiFailure handles res.headersSent===true),
  // so the FE's existing error UI triggers naturally.
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const abort = new AbortController();
  const onClose = (): void => { try { abort.abort(); } catch {} };

  if (!res.headersSent) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
  }
  heartbeat = setInterval(() => {
    try { if (!res.writableEnded) res.write(`: ping ${Date.now()}\n\n`); } catch {}
  }, 15_000);
  req.on("close", onClose);
  // Tell the FE we're alive and preparing (not blank-waiting).
  try { if (!res.writableEnded) res.write(`data: ${JSON.stringify({ status: "preparing" })}\n\n`); } catch {}

  // ── 2. Lazy-generate lesson content (first student pays gen cost) ───
  let content;
  // Captured so the catch path can refund the lazy-gen debit if the
  // downstream teaching turn fails — otherwise the first student pays for
  // content they never received a teaching reply over.
  let genChargeRequestId: string | null = null;
  try {
    const gen = await getOrGenerateLessonContent({
      lessonId: lesson.id,
      versionId: resolved.versionId,
      language: "ar",
      userId: uid,
      subjectSlug: slug,
      requestId,
    });
    content = gen.content;
    genChargeRequestId = gen.chargedRequestId;
  } catch (e) {
    inflightTeachTurns.delete(turnLockKey);
    if (heartbeat) clearInterval(heartbeat);
    req.off("close", onClose);
    emitV4FriendlyFailure(res, "v4/teach:gen", e);
    return;
  }

  // ── 3. Build 9-layer system prompt ──────────────────────────────────
  let systemPrompt: string;
  // The facet (W2/W3) this turn's directive ACTUALLY asked, per the PROMPT-TIME
  // diagnostic decision. Captured here (handler scope) so the post-effects block
  // can mark it pending for next turn's grader — see the comment there for why
  // the post-effects recomputed decision must NOT be used for this.
  let promptTimeFacet: { conceptIndex: number; facet: V4FacetKey } | null = null;
  try {
    const [concepts, mistakes, diagnostic] = await Promise.all([
      db.select().from(v4LessonConceptsTable).where(eq(v4LessonConceptsTable.lessonId, lesson.id)),
      db.select().from(v4LessonCommonMistakesTable).where(eq(v4LessonCommonMistakesTable.lessonId, lesson.id)),
      db
        .select()
        .from(v4DiagnosticSessionsTable)
        .where(and(
          eq(v4DiagnosticSessionsTable.userId, uid),
          eq(v4DiagnosticSessionsTable.subjectId, slug),
        ))
        .limit(1),
    ]);

    const diagnosticAnswers = diagnostic.length && Array.isArray(diagnostic[0].answers)
      ? (diagnostic[0].answers as any[]).map((a) => ({
          question: String(a?.question ?? ""),
          answer: String(a?.answer ?? ""),
        }))
      : [];

    // Facet signal (T5): if the student is answering a facet question we asked
    // last turn, grade it with the isolated grader BEFORE building the prompt so
    // THIS turn's diagnostic decision sees the fresh W2/W3 coverage (advance to
    // the next facet on a pass, re-ask once on a miss, stop at the 2-attempt
    // cap). Runs inside the per-turn lock; wrapped so a grader/DB failure never
    // blocks the teaching turn. Skipped on the first turn (nothing pending yet).
    if (history.length > 0) {
      try {
        await gradePendingFacet({
          userId: uid,
          versionId: resolved.versionId,
          lessonId: lesson.id,
          studentMessage: message,
          concepts: concepts.map((c) => ({
            conceptIndex: c.conceptIndex,
            name: c.name,
            masteryCriterion: c.masteryCriterion,
          })),
        });
      } catch (e) {
        logger.warn?.(`[v4/teach] facet grade failed user=${uid} lesson=${lesson.id}: ${String((e as any)?.message ?? e)}`);
      }
    }


    // Compress before building the prompt so Layer 9 is populated when needed.
    const compressed = compressHistory([...history, { role: "user", content: message }]);
    // Defensive: the layer9 summary text feeds the system prompt and other
    // non-Gemini consumers — never let an attached image's base64 reach it.
    if (compressed.layer9Text && compressed.layer9Text.includes("data:image/")) {
      compressed.layer9Text = compressed.layer9Text.replace(V4_DATA_URL_RE_G, "[صورة مرفقة]");
    }
    (req as any)._v4Compressed = compressed; // tunnel to the SSE block below

    // task #6: pre-fetch unified memory bundle (cross-subject). Wrapped in
    // its own try so a memory-read failure falls through to the placeholder
    // L4 instead of blowing up the whole teaching turn.
    let memoryBundle: Awaited<ReturnType<typeof getStudentMemory>> | null = null;
    try {
      memoryBundle = await getStudentMemory(uid);
    } catch (memErr) {
      logger.warn?.(`[v4/teach] memory fetch failed user=${uid}: ${String((memErr as any)?.message ?? memErr)}`);
    }

    // Load explained-terms file — pre-fetched here and passed to the prompt
    // builder so the teacher sees what the student already knows. Failure is
    // non-blocking: missing terms = "start from zero" (safe default).
    let explainedTermsNote: string | undefined;
    try {
      const termRows = await db.execute(sql.raw(
        `SELECT term FROM v4_explained_terms WHERE user_id = ${uid} AND subject_id = '${slug.replace(/'/g, "''")}' ORDER BY explained_at ASC LIMIT 150`
      ));
      const termsList: string[] = ((termRows as any).rows ?? []).map((r: any) => r.term as string);
      if (termsList.length > 0) {
        explainedTermsNote = `مصطلحات سبق شرحها لهذا الطالب (استخدمها بحرية — لا تُعِد شرحها):\n${termsList.map((t) => `  • ${t}`).join("\n")}\nأي مصطلح لا يظهر هنا = لم يُشرح بعد → اشرحه أولاً قبل استخدامه.`;
      } else {
        explainedTermsNote = "ملف المصطلحات فارغ — الطالب لم يتعلّم بعد أي مصطلح في هذه المادة. ابدأ من الصفر التام.";
      }
    } catch (termErr) {
      logger.warn?.(`[v4/teach] explained terms load failed user=${uid}: ${String((termErr as any)?.message ?? termErr)}`);
    }

    const built = await buildTeacherSystemPrompt({
      student: {
        userId: uid,
        startingLevelLabel: `المستوى ${studentPath.startingLevelIndex}`,
        diagnosticAnswers,
      },
      subjectSlug: slug,
      versionId: resolved.versionId,
      subjectName: resolved.specialty.name,
      lesson: { lesson, concepts, mistakes, content },
      compressedHistoryLayer9: compressed.layer9Text,
      memory: memoryBundle,
      // v4.1 — pass the specialty meta blob so L1/L2/VIZ can pull
      // target_persona / teacher_tone / glossary / allowed_viz_templates.
      specialtyMeta: ((resolved.specialty as any).meta ?? null) as Record<string, any> | null,
      // First turn = empty client history. Activates the opening-message
      // contract (warm motivating frame + objectives + concept roadmap).
      isFirstTurn,
      // Cross-lesson conversational continuity — the tail of the last
      // teacher response from the PREVIOUS completed lesson (captured on
      // LESSON_MASTERED). Injected as Layer 3a so the teacher can bridge.
      previousLessonContext: (studentPath?.lastLessonContext as any) ?? undefined,
      // Explained-terms file: list of already-explained terms so the teacher
      // never re-explains them and never asks about un-explained terms.
      explainedTermsNote,
    });
    systemPrompt = built.systemPrompt;
    promptTimeFacet = built.askedFacet;
  } catch (e) {
    inflightTeachTurns.delete(turnLockKey);
    if (heartbeat) clearInterval(heartbeat);
    req.off("close", onClose);
    emitV4FriendlyFailure(res, "v4/teach:prompt", e);
    return;
  }

  // 90-second cap on the model streaming phase (content gen + prompt build
  // have their own per-call timeouts above). The 90 s starts here — after
  // those phases — so the model gets the full budget for generating a reply.
  const _streamTimeout = AbortSignal.timeout(90_000);
  const streamSignal = AbortSignal.any([abort.signal, _streamTimeout]);

  let fullText = "";
  let charged = false;
  let insufficientGems = false;
  let noWallet = false;
  let balanceAfter: number | null = null;
  let chargeRequestId = requestId;

  // ── Inline visual-tag state ────────────────────────────────────────────
  // The teacher may still emit `[[IMAGE: ...]]` (retired FLUX infographic
  // mechanism — always dropped below, never generated) or `[[PHOTO: english
  // query]]` (real photo — FREE, up to TWO per reply). Both markers are
  // detected via the same sliding-window buffer so a tag split across chunk
  // boundaries is never partially leaked.
  const MAX_PHOTOS_PER_REPLY = 2;
  let __imageStreamBuffer = "";
  let __photoCount = 0; // real-photo (PHOTO) count
  // Each entry is the FULL per-image pipeline (generate → bill fal spend →
  // emit imageReady). We await these before the teaching charge so (a) any
  // billable fal cost is debited even if the client disconnects mid-stream
  // and (b) the terminal balanceAfter already reflects image spend.
  const __imageTasks: Array<Promise<void>> = [];

  try {
    // ── 4. Pull recent messages from compression result ───────────────
    const compressed = (req as any)._v4Compressed as {
      layer9Text: string;
      recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
    };
    // Multimodal split (mirrors legacy ai.ts): the student may attach ONE
    // image inline in the current turn as a markdown data URL. Pull it out of
    // the LAST user message and send it as a proper `image_url` part so Gemini
    // vision can read it. Every other message is defensively stripped of any
    // data URL so the multi-MB base64 blob never bloats the model history.
    const lastUserIdx = (() => {
      for (let i = compressed.recentMessages.length - 1; i >= 0; i--) {
        if (compressed.recentMessages[i].role === "user") return i;
      }
      return -1;
    })();
    // Injected at the closest possible position to model generation (last user
    // turn). Prompt-layer rules alone are insufficient for Gemini Flash Lite on
    // the code-language constraint; this per-turn suffix is the authoritative
    // enforcement mechanism and takes priority over everything else in context.
    const CODE_LANG_REMINDER =
      "\n\n[⛔ قاعدة غير قابلة للكسر — طبّقها في ردك هذا: أي كود تكتبه (بلوك أو inline) — المتغيرات والدوال والكلاسات والثوابت بالإنجليزية فقط (student_count لا عدد_الطلاب). التعليقات وحدها بالعربية. لا أسماء عربية داخل الكود أبداً.]" +
      "\n\n[⛔ كل سطر كود يجب أن يكون في سطر منفصل — لا تضع عدة تعليمات برمجية في سطر واحد أبداً داخل بلوكات ```. كل تعليمة على سطرها الخاص.]";

    const geminiMessages: GeminiMessage[] = compressed.recentMessages.map((m, i) => {
      if (i === lastUserIdx) {
        const { dataUrl, cleaned } = extractV4ImageDataUrl(m.content);
        if (dataUrl) {
          const parts: GeminiContentPart[] = [
            { type: "text", text: (cleaned || "[صورة مرفقة من الطالب]") + CODE_LANG_REMINDER },
            { type: "image_url", image_url: { url: dataUrl } },
          ];
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: cleaned + CODE_LANG_REMINDER };
      }
      // Belt-and-braces: scrub any stray data URL from older messages.
      return { role: m.role, content: m.content.replace(V4_DATA_URL_RE_G, "[صورة مرفقة]") };
    });

    // PRIVACY: the image (if any) has now been lifted into a Gemini image_url
    // part above. Scrub every data URL out of the SHARED recentMessages blob
    // in-place so downstream NON-Gemini consumers — memory capture (warmth +
    // personal dictionary, which call Anthropic), logs, telemetry — can never
    // receive the multi-MB base64 attachment. geminiMessages already holds its
    // own (separate) cleaned/parts objects, so this does not affect the stream.
    for (const m of compressed.recentMessages) {
      if (m.content.includes("data:image/")) {
        m.content = m.content.replace(V4_DATA_URL_RE_G, "[صورة مرفقة]");
      }
    }

    // ── 4b. Persist user message to ai_teacher_messages ─────────────
    // Gives the admin "محادثات المعلم" tab visibility into v4 lessons.
    // Fire-and-forget — a DB error must never block the teaching turn.
    const __safeUserMsg = message
      .replace(/data:image\/[a-zA-Z+.\-]+;base64,[A-Za-z0-9+/=]+/g, "[صورة مرفقة]")
      .slice(0, 8000);
    const __subjectNameLog: string | null = resolved.specialty.name ?? null;
    const __stageIndexLog: number | null = (() => {
      const parts = lessonCode.split(".");
      const n = parts.length >= 2 ? parseInt(parts[1], 10) : NaN;
      return Number.isFinite(n) ? n : null;
    })();
    db.insert(aiTeacherMessagesTable).values({
      userId: uid,
      subjectId: slug,
      subjectName: __subjectNameLog,
      role: "user",
      content: __safeUserMsg,
      isDiagnostic: 0,
      stageIndex: __stageIndexLog,
    }).catch((e: any) =>
      logger.warn?.(`[v4/teach] persist user msg error: ${String(e?.message ?? e)}`),
    );

    // ── 5. Stream ─────────────────────────────────────────────────────
    // SSE headers, heartbeat, and close-listener were opened at lock-
    // acquisition time (above), so the client got immediate feedback while
    // we ran the pre-stream work.  Nothing to set up here — go straight
    // to streaming.

    // Per-turn length tier — the real lever against the wall of text. A flat
    // ceiling let every ordinary turn balloon; tiering caps normal turns short
    // (~700 tok) while giving the opening (~1600) and explicit "explain more"
    // requests (~1100) the room they need. Cuts gem cost on the common path.
    const turnTier = classifyV4Turn({
      isFirstTurn,
      userMessage: message,
    });

    // Sliding-window VISUAL-tag detector. Handles BOTH markers:
    //   `[[IMAGE: english prompt]]` → RETIRED generated-infographic mechanism.
    //       Still detected (so old-session history mimicry can't leak a raw
    //       tag) but always dropped by emitVisual below — never generated.
    //   `[[PHOTO: english query]]`  → a REAL photograph fetched from Wikipedia /
    //       Wikimedia Commons (always FREE).
    // Tags split across chunks are held back until complete.
    const VISUAL_MARKERS = [
      { marker: "[[IMAGE:", kind: "image" as const },
      { marker: "[[PHOTO:", kind: "photo" as const },
      { marker: "[[DIAGRAM:", kind: "diagram" as const },
      { marker: "[[COMPARE:", kind: "compare" as const },
    ];
    const MAX_MARKER_LEN = Math.max(...VISUAL_MARKERS.map((m) => m.marker.length));
    const MAX_DIAGRAMS_PER_REPLY = 3;
    let __diagramCount = 0;
    // id -> the EXACT raw `[[DIAGRAM: ...]]` tag text as it appeared in
    // `fullText`, so the persisted transcript can be patched post-hoc once
    // the diagram resolves (fullText accumulates the model's RAW output,
    // before the pending-VIZ-tag substitution done for the live stream).
    const __diagramRawTags: Map<string, string> = new Map();
    // id -> replacement text for the entry above ("" = drop the tag).
    const __diagramResolved: Map<string, string> = new Map();

    // Same pending/ready/missing + transcript-patch contract as DIAGRAM,
    // for the `[[COMPARE: ...]]` → `comparison` VIZ template side-channel.
    const MAX_COMPARISONS_PER_REPLY = 3;
    let __compareCount = 0;
    const __compareRawTags: Map<string, string> = new Map();
    const __compareResolved: Map<string, string> = new Map();

    // Per-PHOTO pipeline: resolve a REAL same-origin photo → imageReady. ALWAYS
    // FREE — resolveWebPhoto never bills fal and never throws. On a genuine miss
    // (no real photo on Wikipedia/Commons/Openverse) it returns provider:"none"
    // with an empty url; we then emit `imageMissing` so the FE drops the
    // placeholder. We NEVER substitute an AI-generated image for a PHOTO request
    // — that is the whole point of the tag, and it was the slow/flaky path.
    const firePhotoTask = (capturedId: string, query: string): Promise<void> =>
      (async (): Promise<void> => {
        let result: { url: string; provider: string } | null = null;
        try {
          result = await resolveWebPhoto(query);
        } catch {
          result = null;
        }
        if (res.writableEnded) return;
        try {
          if (result && result.url && result.provider !== "none") {
            res.write(`data: ${JSON.stringify({ imageReady: { id: capturedId, url: result.url } })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ imageMissing: { id: capturedId } })}\n\n`);
          }
        } catch {}
      })();

    // Per-DIAGRAM pipeline: Claude Haiku authors the actual Mermaid `{code,
    // steps}` from the model's plain-language request. Never throws — a
    // failure resolves to `diagramMissing` and the raw tag is dropped from
    // the persisted transcript, mirroring the PHOTO pipeline's contract.
    const fireDiagramTask = (capturedId: string, req: DiagramRequest): Promise<void> =>
      (async (): Promise<void> => {
        let result: Awaited<ReturnType<typeof authorMermaidDiagram>> = null;
        try {
          result = await authorMermaidDiagram(req);
        } catch {
          result = null;
        }
        let resolvedText = "";
        let payload: Record<string, unknown> | null = null;
        if (result) {
          payload = { code: result.code };
          if (result.steps) payload.steps = result.steps;
          resolvedText = `[[VIZ: template=mermaid_diagram, payload=${JSON.stringify(payload)}]]`;
          logger.info?.(`[v4/teach/visual] mermaid_diagram authored kind=${req.kind} steps=${!!result.steps} userId=${uid}`);
          try {
            const charge = await chargeV4Ai({
              requestId: `${chargeRequestId}:diagram:${capturedId}`,
              userId: uid,
              subjectId: slug,
              costUsd: DIAGRAM_AI_USD,
              source: "v4_ai_diagram",
              model: "anthropic/claude-haiku-4.5",
              note: `رسم Mermaid — ${req.topic}`,
            });
            if (!charge.charged) {
              logger.warn?.(`[v4/teach/diagram] charge skipped id=${capturedId} error=${!!charge.error}`);
            }
          } catch (e) {
            logger.warn?.(`[v4/teach/diagram] charge threw id=${capturedId}: ${String((e as any)?.message ?? e)}`);
          }
        }
        __diagramResolved.set(capturedId, resolvedText);
        if (res.writableEnded) return;
        try {
          if (payload) {
            res.write(`data: ${JSON.stringify({ diagramReady: { id: capturedId, payload } })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ diagramMissing: { id: capturedId } })}\n\n`);
          }
        } catch {}
      })();

    // Per-COMPARE pipeline: Claude Haiku authors the actual {title, axes,
    // items} comparison table from the model's plain-language request.
    // Never throws — a failure resolves to `comparisonMissing` and the raw
    // tag is dropped from the persisted transcript, mirroring DIAGRAM.
    const fireComparisonTask = (capturedId: string, req: ComparisonRequest): Promise<void> =>
      (async (): Promise<void> => {
        let result: Awaited<ReturnType<typeof authorComparison>> = null;
        try {
          result = await authorComparison(req);
        } catch {
          result = null;
        }
        let resolvedText = "";
        let payload: Record<string, unknown> | null = null;
        if (result) {
          payload = result;
          resolvedText = `[[VIZ: template=comparison, payload=${JSON.stringify(payload)}]]`;
          logger.info?.(`[v4/teach/visual] comparison authored entities=${req.entities.length} userId=${uid}`);
          try {
            const charge = await chargeV4Ai({
              requestId: `${chargeRequestId}:compare:${capturedId}`,
              userId: uid,
              subjectId: slug,
              costUsd: COMPARISON_AI_USD,
              source: "v4_ai_comparison",
              model: "anthropic/claude-haiku-4.5",
              note: `جدول مقارنة — ${req.entities.join(" / ")}`,
            });
            if (!charge.charged) {
              logger.warn?.(`[v4/teach/compare] charge skipped id=${capturedId} error=${!!charge.error}`);
            }
          } catch (e) {
            logger.warn?.(`[v4/teach/compare] charge threw id=${capturedId}: ${String((e as any)?.message ?? e)}`);
          }
        }
        __compareResolved.set(capturedId, resolvedText);
        if (res.writableEnded) return;
        try {
          if (payload) {
            res.write(`data: ${JSON.stringify({ comparisonReady: { id: capturedId, payload } })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ comparisonMissing: { id: capturedId } })}\n\n`);
          }
        } catch {}
      })();

    // Register one visual (image, photo, or diagram request): enforce the
    // per-kind per-reply cap, emit the placeholder, kick off the matching
    // pipeline. Returns the wire marker to splice into the text (or "" if
    // dropped). IMAGE (generated infographic) is a RETIRED mechanism —
    // always dropped, regardless of turn, so old-session history mimicry can
    // never trigger it.
    const emitVisual = (
      kind: "image" | "photo" | "diagram" | "compare",
      innerText: string,
      rawTag?: string,
    ): string => {
      if (innerText.length === 0) {
        logger.warn?.(`[v4/teach/visual] dropped empty ${kind.toUpperCase()} tag`);
        return "";
      }
      if (kind === "image") {
        logger.warn?.(`[v4/teach/visual] dropped IMAGE tag — mechanism retired`);
        return "";
      }
      if (isFirstTurn) {
        // Opening-message contract forbids PHOTO/DIAGRAM here too —
        // deterministic backstop in case the model ignores the prompt rule
        // (see isFirstTurn comment above).
        logger.warn?.(`[v4/teach/visual] dropped ${kind.toUpperCase()} tag — opening message`);
        return "";
      }
      if (kind === "photo") {
        if (__photoCount >= MAX_PHOTOS_PER_REPLY) {
          logger.warn?.(`[v4/teach/visual] dropped PHOTO tag — per-reply cap reached`);
          return "";
        }
        __photoCount++;
        const imageId = randomBytes(6).toString("hex");
        try {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ imagePlaceholder: { id: imageId, kind } })}\n\n`);
          }
        } catch {}
        const task = firePhotoTask(imageId, innerText);
        __imageTasks.push(task);
        return `[[IMAGE:${imageId}]]`;
      }
      // kind === "diagram"
      if (kind === "diagram") {
        if (__diagramCount >= MAX_DIAGRAMS_PER_REPLY) {
          logger.warn?.(`[v4/teach/visual] dropped DIAGRAM tag — per-reply cap reached`);
          return "";
        }
        const parts = innerText.split("|||").map((p) => p.trim());
        const diagramKind = normalizeDiagramKind(parts[0] ?? "");
        const topic = parts[1] ?? "";
        const details = parts[2] ?? "";
        const stepsRaw = parts[3] ?? "";
        if (!diagramKind || !topic || !details) {
          logger.warn?.(`[v4/teach/visual] dropped malformed DIAGRAM tag: "${innerText.slice(0, 80)}"`);
          return "";
        }
        __diagramCount++;
        const diagramId = randomBytes(6).toString("hex");
        const wantSteps = /steps\s*=\s*yes/i.test(stepsRaw);
        if (rawTag) __diagramRawTags.set(diagramId, rawTag);
        const task = fireDiagramTask(diagramId, { kind: diagramKind, topic, details, wantSteps });
        __imageTasks.push(task);
        return `[[VIZ: template=mermaid_diagram, payload={"pendingId":"${diagramId}"}]]`;
      }
      // kind === "compare"
      if (__compareCount >= MAX_COMPARISONS_PER_REPLY) {
        logger.warn?.(`[v4/teach/visual] dropped COMPARE tag — per-reply cap reached`);
        return "";
      }
      const cParts = innerText.split("|||").map((p) => p.trim());
      const entities = cParts.slice(0, cParts.length - 1).filter(Boolean);
      const context = cParts[cParts.length - 1] ?? "";
      if (entities.length < 2 || entities.length > 3 || !context) {
        logger.warn?.(`[v4/teach/visual] dropped malformed COMPARE tag: "${innerText.slice(0, 80)}"`);
        return "";
      }
      __compareCount++;
      const compareId = randomBytes(6).toString("hex");
      if (rawTag) __compareRawTags.set(compareId, rawTag);
      const cTask = fireComparisonTask(compareId, { entities, context });
      __imageTasks.push(cTask);
      return `[[VIZ: template=comparison, payload={"pendingId":"${compareId}"}]]`;
    };

    const processImageTags = (incoming: string): string => {
      __imageStreamBuffer += incoming;
      let safeOutput = "";
      while (true) {
        // Find the EARLIEST occurrence of any visual marker.
        let tagStart = -1;
        let matched: (typeof VISUAL_MARKERS)[number] | null = null;
        for (const m of VISUAL_MARKERS) {
          const idx = __imageStreamBuffer.indexOf(m.marker);
          if (idx !== -1 && (tagStart === -1 || idx < tagStart)) {
            tagStart = idx;
            matched = m;
          }
        }
        if (tagStart === -1 || !matched) {
          // No complete marker yet. Hold back ONLY the longest trailing
          // substring that could be the BEGINNING of ANY marker, so a tag
          // split at any chunk boundary survives (covers a lone "[", "[[",
          // "[[I", "[[P", "[[D", … up to "[[IMAGE" / "[[PHOTO" / "[[DIAGRAM").
          let hold = 0;
          const maxK = Math.min(MAX_MARKER_LEN - 1, __imageStreamBuffer.length);
          for (let k = maxK; k > 0; k--) {
            const suffix = __imageStreamBuffer.slice(__imageStreamBuffer.length - k);
            if (VISUAL_MARKERS.some((m) => m.marker.startsWith(suffix))) { hold = k; break; }
          }
          if (hold > 0) {
            const cut = __imageStreamBuffer.length - hold;
            safeOutput += __imageStreamBuffer.slice(0, cut);
            __imageStreamBuffer = __imageStreamBuffer.slice(cut);
          } else {
            safeOutput += __imageStreamBuffer;
            __imageStreamBuffer = "";
          }
          break;
        }
        const markerLen = matched.marker.length;
        const tagEnd = __imageStreamBuffer.indexOf("]]", tagStart + markerLen);
        if (tagEnd === -1) {
          // Marker opened but not yet closed — forward prose before it, hold the
          // rest until the closing `]]` arrives in a later chunk.
          safeOutput += __imageStreamBuffer.slice(0, tagStart);
          __imageStreamBuffer = __imageStreamBuffer.slice(tagStart);
          break;
        }
        const innerText = __imageStreamBuffer.slice(tagStart + markerLen, tagEnd).trim();
        const rawTag = matched.kind === "diagram" || matched.kind === "compare"
          ? __imageStreamBuffer.slice(tagStart, tagEnd + 2)
          : undefined;
        safeOutput += __imageStreamBuffer.slice(0, tagStart);
        // Emit the id-only marker; the FE turns `[[IMAGE:id]]` into a spinner
        // figure, then swaps the real <img> in on the matching imageReady.
        // DIAGRAM/COMPARE tags splice a pending-VIZ tag instead (resolved
        // in-place once Haiku authors it — see diagramReady/comparisonReady
        // handling below).
        safeOutput += emitVisual(matched.kind, innerText, rawTag);
        __imageStreamBuffer = __imageStreamBuffer.slice(tagEnd + 2);
      }
      return safeOutput;
    };

    // Deterministic backstop for `[[SCENE: ...]]`. SCENE has been retired
    // (the `/v4/scene` route + FE scene-stepper are gone), but old sessions'
    // history can still induce the model to mimic the tag. Unconditionally
    // (every turn, not just the opening) buffer across chunk boundaries and
    // drop the whole tag rather than ever forwarding raw protocol text.
    const SCENE_MARKER = "[[SCENE:";
    let __sceneStreamBuffer = "";
    const stripSceneTag = (incoming: string): string => {
      __sceneStreamBuffer += incoming;
      let safeOutput = "";
      while (true) {
        const tagStart = __sceneStreamBuffer.indexOf(SCENE_MARKER);
        if (tagStart === -1) {
          let hold = 0;
          const maxK = Math.min(SCENE_MARKER.length - 1, __sceneStreamBuffer.length);
          for (let k = maxK; k > 0; k--) {
            const suffix = __sceneStreamBuffer.slice(__sceneStreamBuffer.length - k);
            if (SCENE_MARKER.startsWith(suffix)) { hold = k; break; }
          }
          if (hold > 0) {
            const cut = __sceneStreamBuffer.length - hold;
            safeOutput += __sceneStreamBuffer.slice(0, cut);
            __sceneStreamBuffer = __sceneStreamBuffer.slice(cut);
          } else {
            safeOutput += __sceneStreamBuffer;
            __sceneStreamBuffer = "";
          }
          break;
        }
        const tagEnd = __sceneStreamBuffer.indexOf("]]", tagStart + SCENE_MARKER.length);
        if (tagEnd === -1) {
          safeOutput += __sceneStreamBuffer.slice(0, tagStart);
          __sceneStreamBuffer = __sceneStreamBuffer.slice(tagStart);
          break;
        }
        logger.warn?.(`[v4/teach/visual] dropped SCENE tag — mechanism retired`);
        safeOutput += __sceneStreamBuffer.slice(0, tagStart);
        __sceneStreamBuffer = __sceneStreamBuffer.slice(tagEnd + 2);
      }
      return safeOutput;
    };

    // Thinking-leak stripper: one stateful instance per turn. Detects and drops
    // any "تحليل: / القيود:" preamble the model might still write despite the
    // prompt prohibition — the student must never see internal chain-of-thought.
    const thinkingStripper = createThinkingLeakStripper();

    const result = await streamGeminiTeaching({
      systemPrompt,
      messages: geminiMessages,
      maxOutputTokens: turnTier.maxOutputTokens,
      model: V4_TEACHING_MODEL,
      provider: teacherProvider,
      temperature: 0.7,
      signal: streamSignal,
      logTag: `v4-teach:${slug}:${lessonCode}`,
      onChunk: (text) => {
        if (!text) return;
        fullText += text; // always accumulate raw (for protocol-tag parsing)
        // Strip any thinking-leak preamble FIRST — returns "" while buffering
        // the preamble, or the safe text once the preamble (if any) has been dropped.
        const safe = thinkingStripper.filter(text);
        if (!safe) return; // still buffering suspected thinking preamble
        // Extract IMAGE/PHOTO tags first (turns `[[PHOTO: query]]` →
        // `[[IMAGE:id]]` and holds back partial tags; IMAGE tags are always
        // dropped), strip any SCENE tag, THEN strip protocol tags from the
        // prose the student sees. stripProtocolTags leaves `[[IMAGE:id]]` untouched.
        const display = stripProtocolTags(stripSceneTag(processImageTags(safe)));
        if (display && !res.writableEnded) {
          try {
            res.write(`data: ${JSON.stringify({ content: display })}\n\n`);
          } catch {}
        }
      },
    });

    // Flush any text held back in the image buffer. Drop a dangling visual
    // marker fragment so raw protocol text never leaks: either an unterminated
    // `[[IMAGE:…` / `[[PHOTO:…` / `[[DIAGRAM:…` / `[[COMPARE:…` tag OR a bare
    // trailing marker prefix (`[`, `[[`, `[[IM`, `[[PHOT`, `[[DIAG`, `[[COMP`,
    // …) held back mid-tag; everything else is forwarded so no prose is lost.
    if (__imageStreamBuffer) {
      const leftover = __imageStreamBuffer
        .replace(/\[\[(?:IMAGE|PHOTO|DIAGRAM|COMPARE):[^\]]*$/i, "")
        .replace(/\[(?:\[(?:I(?:M(?:A(?:G(?:E)?)?)?)?|P(?:H(?:O(?:T(?:O)?)?)?)?|D(?:I(?:A(?:G(?:R(?:A(?:M)?)?)?)?)?)?|C(?:O(?:M(?:P(?:A(?:R(?:E)?)?)?)?)?)?)?)?$/i, "");
      __imageStreamBuffer = "";
      const tailDisplay = stripProtocolTags(leftover);
      if (tailDisplay && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ content: tailDisplay })}\n\n`);
        } catch {}
      }
    }

    // Same leftover-flush treatment for a SCENE tag dangling at end-of-stream
    // — drop an unterminated `[[SCENE:…` fragment (or a bare marker prefix)
    // rather than ever letting raw protocol text leak.
    if (__sceneStreamBuffer) {
      const sceneLeftover = __sceneStreamBuffer
        .replace(/\[\[SCENE:[^\]]*$/i, "")
        .replace(/\[(?:\[(?:S(?:C(?:E(?:N(?:E)?)?)?)?)?)?$/i, "");
      __sceneStreamBuffer = "";
      const sceneTailDisplay = stripProtocolTags(sceneLeftover);
      if (sceneTailDisplay && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ content: sceneTailDisplay })}\n\n`);
        } catch {}
      }
    }

    // Flush any content held back by the thinking-leak stripper. If the model
    // wrote a thinking preamble that never finished (no double-newline after
    // القيود), flush() returns "" — nothing more to send. If the preamble was
    // detected early and real content was already released chunk-by-chunk,
    // flush() also returns "". Only emits when a short response never triggered
    // the check (< CHECK_AFTER_CHARS total) and the buffer was never flushed.
    const thinkingFlush = thinkingStripper.flush();
    if (thinkingFlush && !res.writableEnded) {
      const flushDisplay = stripProtocolTags(thinkingFlush);
      if (flushDisplay) {
        try {
          res.write(`data: ${JSON.stringify({ content: flushDisplay })}\n\n`);
        } catch {}
      }
    }

    // `fullText` (the raw, un-stripped model output) is what gets persisted
    // to ai_teacher_messages and re-rendered verbatim on a page reload.
    // Clean two known noise sources so persistence matches what the student saw:
    //   1. SCENE tags (retired mechanism — drop unconditionally).
    //   2. Thinking-leak preambles ("تحليل: / القيود:") — strip via the same
    //      detection logic so saved transcripts are as clean as the live stream.
    fullText = fullText.replace(/\[\[SCENE:[\s\S]*?\]\]/gi, "");
    fullText = stripThinkingLeakFromText(fullText);
    // Capture [TERM_EXPLAINED: term] tags BEFORE stripping — these are the
    // new terms the teacher explained this turn. Persisted to DB below.
    const __termExplainedCaptures = Array.from(
      fullText.matchAll(/\[TERM_EXPLAINED:\s*([^\]]+?)\s*\]/gi),
    );
    // Strip from persisted transcript so stored messages stay clean.
    fullText = fullText.replace(/\[TERM_EXPLAINED:[^\]]*\]/gi, "");

    // Let every per-image pipeline finish: each one self-bills its fal spend
    // (idempotently) and emits imageReady. Awaiting here means the teaching
    // charge below reads a balance that already reflects any image debit, and
    // it bounds the request so generation can't outlive the handler. The store
    // resolves fast (cache/pollinations/SVG instant; fal ≈ a few seconds).
    if (__imageTasks.length > 0) {
      await Promise.allSettled(__imageTasks);
    }

    // Patch the persisted transcript: swap each raw `[[DIAGRAM: ...]]`
    // request tag for its resolved `[[VIZ: template=mermaid_diagram, ...]]`
    // tag (or drop it on a failed diagram) — mirrors the SCENE-tag scrub
    // above. The live stream already showed the pending-VIZ placeholder and
    // patched it via the diagramReady/diagramMissing SSE events; this keeps
    // `fullText` (what gets saved and re-rendered on reload) in sync.
    if (__diagramRawTags.size > 0) {
      for (const [id, rawTag] of __diagramRawTags) {
        const resolved = __diagramResolved.get(id) ?? "";
        fullText = fullText.split(rawTag).join(resolved);
      }
    }

    // Same transcript-patch treatment for COMPARE: swap each raw
    // `[[COMPARE: ...]]` request tag for its resolved
    // `[[VIZ: template=comparison, ...]]` tag (or drop it on a failed
    // comparison) so persisted `fullText` matches what the live stream
    // showed via comparisonReady/comparisonMissing.
    if (__compareRawTags.size > 0) {
      for (const [id, rawTag] of __compareRawTags) {
        const resolved = __compareResolved.get(id) ?? "";
        fullText = fullText.split(rawTag).join(resolved);
      }
    }

    // ── 6. Charge wallet (post-stream so we know we got a real reply) ─
    // Teaching tokens only — FLUX image spend is billed separately and
    // immediately inside each image task (source `v4_ai_image`) so a mid-stream
    // disconnect can't leak free paid images.
    //
    // Always charge at least 1 gem (0.001 USD floor) per turn. Every live AI
    // reply costs real OpenRouter money even when the streaming API does not
    // report token usage. Skipping the charge entirely on zero tokens creates
    // a "لم يُخصم" dead loop where gems are displayed but never debited.
    const rawCost = estimateTeachingCostUsd(result.inputTokens, result.outputTokens);
    const usdCost = rawCost > 0 ? rawCost : 0.001;
    {
      const charge = await chargeV4Ai({
        requestId: chargeRequestId,
        userId: uid,
        subjectId: slug,
        costUsd: usdCost,
        source: "v4_ai_teach",
        model: V4_TEACHING_MODEL,
        note: `جلسة تعليم درس ${lessonCode}`,
        // The reply has already streamed; if the wallet can't fully cover this
        // turn, take whatever is left (down to zero) so the next turn is
        // blocked by the pre-stream gate instead of being served for free.
        drainIfInsufficient: true,
      });
      charged = charge.charged;
      insufficientGems = !!charge.insufficient;
      noWallet = !!charge.noWallet;
      balanceAfter = charge.balanceAfter;
      if (!charge.charged && !charge.noWallet) {
        logger.warn?.(
          `[v4/teach] charge skipped user=${uid} insufficient=${charge.insufficient ?? false}`,
        );
      }
      // When the charge no-opped (gems <= 0, duplicate requestId, etc.)
      // charge.balanceAfter is null — the SSE terminal contract must still
      // carry the correct wallet balance so the frontend gem badge stays in
      // sync. Fetch the effective balance using the same subject→_welcome
      // fallback as the wallet endpoint and the pre-stream gate.
      if (balanceAfter == null) {
        const [[w], [ww]] = await Promise.all([
          db.select().from(studentGemWalletsTable).where(and(
            eq(studentGemWalletsTable.userId, uid),
            eq(studentGemWalletsTable.subjectId, slug),
          )),
          db.select().from(studentGemWalletsTable).where(and(
            eq(studentGemWalletsTable.userId, uid),
            eq(studentGemWalletsTable.subjectId, "_welcome"),
          )),
        ]);
        const subjBal = Number((w as any)?.gemsBalance ?? 0);
        const welcomeBal = Number((ww as any)?.gemsBalance ?? 0);
        balanceAfter = subjBal > 0 ? subjBal : welcomeBal;
      }
    }

    // ── 7. Parse + apply protocol tags ───────────────────────────────
    const tags = parseProtocolTags(fullText);
    const effects = await applyTagEffects(
      { userId: uid, subjectSlug: slug, lessonId: lesson.id, lessonCode },
      tags,
    );

    // ── 7x. Persist [TERM_EXPLAINED: term] tags ─────────────────────────
    // Tags were captured from fullText BEFORE it was stripped (see above).
    // Each unique term is upserted into v4_explained_terms so the next
    // session's prompt builder knows what the student already knows.
    if (__termExplainedCaptures.length > 0) {
      (async () => {
        for (const m of __termExplainedCaptures) {
          const term = m[1]?.trim().slice(0, 200);
          if (!term || term.length < 2) continue;
          try {
            await db.execute(sql.raw(
              `INSERT INTO v4_explained_terms (user_id, subject_id, term, explained_at) VALUES (${uid}, '${slug.replace(/'/g, "''")}', '${term.replace(/'/g, "''")}', NOW()) ON CONFLICT (user_id, subject_id, term) DO NOTHING`,
            ));
          } catch (e) {
            logger.warn?.(`[v4/teach] explained terms persist failed: ${String((e as any)?.message ?? e)}`);
          }
        }
      })().catch(() => {});
    }

    // Fire-and-forget: on LESSON_MASTERED, store the tail of the teacher's
    // final response as cross-lesson context so the NEXT lesson's first turn
    // can bridge the conversation organically.
    if (effects.lessonAdvanced && studentPath) {
      const lastMsg = stripProtocolTags(fullText).trim();
      const snippet = lastMsg.length > 300
        ? "…" + lastMsg.slice(-300)
        : lastMsg;
      db.update(v4StudentPathsTable)
        .set({
          lastLessonContext: {
            lessonCode,
            tailSummary: snippet,
            capturedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(v4StudentPathsTable.id, studentPath.id))
        .execute()
        .catch(() => {}); // non-blocking
    }

    // ── 7a-b. Persist assistant message to ai_teacher_messages ─────────
    // Recorded AFTER effects so word-count reflects the clean reply the
    // student actually received. Fire-and-forget — must not block the turn.
    {
      const __cleanedReply = stripProtocolTags(fullText).trim();
      if (__cleanedReply.length > 0) {
        const __excerpt = excerptV4(__cleanedReply);
        const __wc = countWordsV4(__excerpt);
        db.insert(aiTeacherMessagesTable).values({
          userId: uid,
          subjectId: slug,
          subjectName: __subjectNameLog,
          role: "assistant",
          content: __excerpt,
          isDiagnostic: 0,
          stageIndex: __stageIndexLog,
          wordCount: __wc,
          overLength: __wc > 350 ? 1 : 0,
        }).catch((e: any) =>
          logger.warn?.(`[v4/teach] persist assistant msg error: ${String(e?.message ?? e)}`),
        );
      }
    }

    // ── 7b. Facet pending marker — commits the PROMPT-TIME facet decision ──
    // Mark the facet ACTUALLY ASKED this turn (the PROMPT-TIME decision) as
    // pending so next turn grades the student's answer (gradePendingFacet). We
    // must NOT recompute the decision over POST-effects mastery here: on the
    // probe→rationale transition turn THIS turn's [MASTERY] tag flips the
    // recomputed decision to a facet move that was never asked, which would
    // phantom-grade an unrelated reply next turn and burn the 2-attempt cap.
    // This block runs only after a successful stream, so pending is gated on
    // the question actually being delivered.
    if (promptTimeFacet) {
      try {
        await markFacetPending({
          userId: uid,
          lessonId: lesson.id,
          conceptIndex: promptTimeFacet.conceptIndex,
          facet: promptTimeFacet.facet,
        });
      } catch (e) {
        logger.warn?.(`[v4/teach] markFacetPending failed user=${uid} lesson=${lesson.id}: ${String((e as any)?.message ?? e)}`);
      }
    }

    // ── 7c. Code-task push — teacher-driven (the [[CODE_TASK]] marker) ─
    // When the teacher emits `[[CODE_TASK: ...]]` it wants the student to
    // write code in محرّر نُخبة. We deliver the requirement here (not as a
    // raw marker — stripProtocolTags removes it from the prose) so the FE can
    // light up the editor button and show a designed popup when it opens.
    const codeTask = extractCodeTask(fullText);

    // ── 8. Terminal event ────────────────────────────────────────────
    if (!res.writableEnded) {
      try {
        res.write(
          `data: ${JSON.stringify({
            done: true,
            finishReason: result.finishReason,
            lessonMastered: effects.lessonAdvanced,
            nextLessonCode: effects.nextLessonCode,
            sessionComplete: effects.sessionComplete,
            unitComplete: effects.unitComplete,
            stageComplete: effects.stageComplete,
            levelComplete: effects.levelComplete,
            masteryUpdates: effects.conceptMasteryUpdates,
            needsReview: effects.needsReview,
            difficultyAdjustments: effects.difficultyAdjustments,
            labEnvRequests: effects.labEnvRequests,
            masteryGateBlocked: effects.masteryGateBlocked ?? null,
            codeTask,
            charged,
            insufficientGems,
            noWallet,
            balanceAfter,
          })}\n\n`,
        );
        res.end();
      } catch {}
    }

    // ── 9. task #6: fire-and-forget warmth capture ──────────────────
    // Runs AFTER res.end() so the student never waits on the Haiku
    // round-trip. Only triggers when SESSION_COMPLETE fired so we
    // capture once per session (not once per turn — that would 60×
    // the Haiku spend with no benefit).
    if (effects.sessionComplete) {
      const cleanedAssistant = stripProtocolTags(fullText).trim();
      const recentForWarmth: Array<{ role: "user" | "assistant"; content: string }> = [
        ...compressed.recentMessages,
        { role: "assistant" as const, content: cleanedAssistant },
      ];
      void captureWarmthFromSession({
        userId: uid,
        subjectId: slug,
        recentMessages: recentForWarmth,
      }).catch(() => {});
      // Personal-dictionary capture from the session — complementary to
      // the diagnostic capture so signals that surface mid-teaching
      // (profession, family, examples) end up in the dictionary too.
      void capturePersonalDictionaryFromSession({
        userId: uid,
        subjectId: slug,
        recentMessages: recentForWarmth,
      }).catch(() => {});
    }

    // Capture personal-dictionary on LESSON_MASTERED even when
    // SESSION_COMPLETE didn't fire (student may leave mid-session right
    // after mastering a lesson). We skip warmth here — a single turn is
    // too thin for reliable laughter/confidence/worry signals.
    if (effects.lessonAdvanced && !effects.sessionComplete) {
      const cleanedAssistant = stripProtocolTags(fullText).trim();
      const recentForCapture: Array<{ role: "user" | "assistant"; content: string }> = [
        ...compressed.recentMessages.slice(-6),
        { role: "assistant" as const, content: cleanedAssistant },
      ];
      void capturePersonalDictionaryFromSession({
        userId: uid,
        subjectId: slug,
        recentMessages: recentForCapture,
      }).catch(() => {});
    }

    // ذ٣ — mid-session capture: fire dictionary capture even when neither
    // SESSION_COMPLETE nor LESSON_MASTERED fired (student closed the tab
    // mid-lesson). We require ≥ 4 recent messages as a minimum-signal
    // threshold to avoid capturing noise from very short or abandoned sessions.
    if (!effects.sessionComplete && !effects.lessonAdvanced && compressed.recentMessages.length >= 4) {
      const cleanedAssistant = stripProtocolTags(fullText).trim();
      const recentForCapture: Array<{ role: "user" | "assistant"; content: string }> = [
        ...compressed.recentMessages.slice(-6),
        { role: "assistant" as const, content: cleanedAssistant },
      ];
      void capturePersonalDictionaryFromSession({
        userId: uid,
        subjectId: slug,
        recentMessages: recentForCapture,
      }).catch(() => {});
    }
  } catch (err) {
    // Refund BOTH debits that may have fired before the failure:
    //   1) the teaching-turn debit under chargeRequestId (post-stream — may
    //      not have fired yet, refundV4Ai is a no-op when there was no
    //      matching ledger row, so this is safe to always call);
    //   2) the lazy lesson-content-gen debit captured at step 2 — this
    //      fires BEFORE the stream starts, so a stream failure would
    //      otherwise leave the first student paying for content they
    //      never received over a teaching turn.
    void refundV4Ai({
      requestId: chargeRequestId,
      userId: uid,
      subjectId: slug,
      source: "v4_ai_teach",
      reason: "stream_failure",
    }).catch(() => {});
    if (genChargeRequestId) {
      void refundV4Ai({
        requestId: genChargeRequestId,
        userId: uid,
        subjectId: slug,
        source: "v4_ai_lesson",
        reason: "teaching_turn_failed_after_content_gen",
      }).catch(() => {});
    }
    emitV4FriendlyFailure(res, "v4/teach", err);
  } finally {
    inflightTeachTurns.delete(turnLockKey);
    if (heartbeat) clearInterval(heartbeat);
    req.off("close", onClose);
  }
});

/**
 * Conservative Gemini 2.5 Flash Lite cost estimate via OpenRouter.
 * Pricing as of May 2026: $0.10 / 1M in, $0.40 / 1M out.
 */
function estimateTeachingCostUsd(inputTokens: number, outputTokens: number): number {
  const usd = ((inputTokens || 0) * 0.10 + (outputTokens || 0) * 0.40) / 1_000_000;
  return Math.max(0, usd);
}

export default router;
