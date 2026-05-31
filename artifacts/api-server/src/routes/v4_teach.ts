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
import { and, eq } from "drizzle-orm";
import {
  db,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4DiagnosticSessionsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { resolveActiveSpecialty, getStudentPath, syncStudentPathToActiveVersion } from "../lib/v4-path-engine";
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
import {
  generateTeacherImage,
  resolveTeacherImage,
  FLUX_SCHNELL_USD_PER_IMAGE,
  type ImageGenerationResult,
} from "../lib/image-generation";
import { emitFriendlyAiFailure } from "./ai";

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

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}
function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}
function requireSameOriginCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return;
  }
  const host = (req.headers.host || "").toLowerCase();
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();
  const sourceHost = origin
    ? (() => { try { return new URL(origin).host; } catch { return ""; } })()
    : referer
      ? (() => { try { return new URL(referer).host; } catch { return ""; } })()
      : "";
  if (!sourceHost || sourceHost !== host) {
    res.status(403).json({ error: "CSRF protection: cross-origin request rejected" });
    return;
  }
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

  if (!slug || !lessonCode || !message) {
    res.status(400).json({ error: "slug, lessonCode, message required" });
    return;
  }

  // Model lock guard — defends against future regressions wiring this route
  // to anything other than Gemini Flash.
  try {
    assertGeminiForTeaching(V4_TEACHING_MODEL);
  } catch (e) {
    emitV4FriendlyFailure(res, "v4/teach:model-lock", e);
    return;
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
    if (!unlocked.includes(lessonCode)) {
      res.status(403).json({ error: "lesson_locked" });
      return;
    }

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
    emitV4FriendlyFailure(res, "v4/teach:gen", e);
    return;
  }

  // ── 3. Build 9-layer system prompt ──────────────────────────────────
  let systemPrompt: string;
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

    systemPrompt = await buildTeacherSystemPrompt({
      student: {
        userId: uid,
        startingLevelLabel: `المستوى ${studentPath.startingLevelIndex}`,
        diagnosticAnswers,
      },
      subjectSlug: slug,
      subjectName: resolved.specialty.name,
      lesson: { lesson, concepts, mistakes, content },
      compressedHistoryLayer9: compressed.layer9Text,
      memory: memoryBundle,
      // v4.1 — pass the specialty meta blob so L1/L2/VIZ can pull
      // target_persona / teacher_tone / glossary / allowed_viz_templates.
      specialtyMeta: ((resolved.specialty as any).meta ?? null) as Record<string, any> | null,
      // First turn = empty client history. Activates the opening-message
      // contract (warm motivating frame + objectives + concept roadmap).
      isFirstTurn: history.length === 0,
    });
  } catch (e) {
    inflightTeachTurns.delete(turnLockKey);
    emitV4FriendlyFailure(res, "v4/teach:prompt", e);
    return;
  }

  // Declared BEFORE the try so the `finally` can always release the in-flight
  // lock (and tear down the heartbeat / close listener) even if SSE setup or
  // the compression unwrap throws after the lock was acquired. Everything from
  // here on is inside the try/finally — there is no unguarded path that can
  // leak `turnLockKey`.
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const abort = new AbortController();
  const onClose = (): void => { try { abort.abort(); } catch {} };

  let fullText = "";
  let charged = false;
  let insufficientGems = false;
  let noWallet = false;
  let balanceAfter: number | null = null;
  let chargeRequestId = requestId;

  // ── Inline FLUX image generation state (mirrors legacy ai.ts) ─────────────
  // The teacher emits `[[IMAGE: english prompt]]` tags inline. We detect each
  // complete tag as it streams, replace it on the wire with a short
  // `[[IMAGE:id]]` marker (which survives stripProtocolTags untouched), fire
  // FLUX generation in the background, and emit `imagePlaceholder` / `imageReady`
  // SSE events so the FE can swap a real same-origin <img> into the bubble.
  // Capped at one image per reply to bound cost (SCENE is the other visual aid).
  const MAX_IMAGES_PER_REPLY = 1;
  let __imageStreamBuffer = "";
  let __imageCount = 0;
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
    const geminiMessages: GeminiMessage[] = compressed.recentMessages.map((m, i) => {
      if (i === lastUserIdx) {
        const { dataUrl, cleaned } = extractV4ImageDataUrl(m.content);
        if (dataUrl) {
          const parts: GeminiContentPart[] = [
            { type: "text", text: cleaned || "[صورة مرفقة من الطالب]" },
            { type: "image_url", image_url: { url: dataUrl } },
          ];
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: cleaned };
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

    // ── 5. Open SSE + stream ──────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    heartbeat = setInterval(() => {
      try {
        if (!res.writableEnded) res.write(`: ping ${Date.now()}\n\n`);
      } catch {}
    }, 15_000);
    req.on("close", onClose);

    // Per-turn length tier — the real lever against the wall of text. A flat
    // ceiling let every ordinary turn balloon; tiering caps normal turns short
    // (~700 tok) while giving the opening (~1600) and explicit "explain more"
    // requests (~1100) the room they need. Cuts gem cost on the common path.
    const turnTier = classifyV4Turn({
      isFirstTurn: history.length === 0,
      userMessage: message,
    });

    // Sliding-window IMAGE-tag detector. Accumulates streamed text, extracts
    // each complete `[[IMAGE: prompt]]` tag, replaces it on the wire with a
    // short `[[IMAGE:id]]` marker, fires FLUX generation, and returns text safe
    // to forward. Handles tags split across chunks and other `[[XXX:` tags
    // (flushed normally; only `[[IMAGE:` is held back for completion).
    const processImageTags = (incoming: string): string => {
      __imageStreamBuffer += incoming;
      let safeOutput = "";
      const MARKER = "[[IMAGE:";
      while (true) {
        const tagStart = __imageStreamBuffer.indexOf(MARKER);
        if (tagStart === -1) {
          // No started tag yet. Hold back ONLY the longest trailing substring
          // that could be the BEGINNING of a future `[[IMAGE:` tag, so a tag
          // split at any boundary survives — including a lone trailing "[" or
          // "[[IM" (the previous `lastIndexOf("[[")` missed the single-"[" case
          // and let the second half arrive as unrecognised "[IMAGE:...]]").
          let hold = 0;
          const maxK = Math.min(MARKER.length - 1, __imageStreamBuffer.length);
          for (let k = maxK; k > 0; k--) {
            if (__imageStreamBuffer.endsWith(MARKER.slice(0, k))) { hold = k; break; }
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
        const tagEnd = __imageStreamBuffer.indexOf("]]", tagStart + 8);
        if (tagEnd === -1) {
          safeOutput += __imageStreamBuffer.slice(0, tagStart);
          __imageStreamBuffer = __imageStreamBuffer.slice(tagStart);
          break;
        }
        const promptText = __imageStreamBuffer.slice(tagStart + 8, tagEnd).trim();
        safeOutput += __imageStreamBuffer.slice(0, tagStart);
        if (__imageCount >= MAX_IMAGES_PER_REPLY) {
          logger.warn?.(`[v4/teach/image] dropped IMAGE tag — per-reply cap reached`);
        } else if (promptText.length === 0) {
          logger.warn?.("[v4/teach/image] dropped empty IMAGE tag");
        } else {
          const imageId = randomBytes(6).toString("hex");
          __imageCount++;
          // Emit the id-only marker; the FE turns `[[IMAGE:id]]` into a spinner
          // figure, then swaps the real <img> in on the matching imageReady.
          safeOutput += `[[IMAGE:${imageId}]]`;
          try {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ imagePlaceholder: { id: imageId } })}\n\n`);
            }
          } catch {}
          // Fire the full per-image pipeline. The store always resolves a
          // usable same-origin URL (fal → pollinations → local SVG), so every
          // tag yields exactly one imageReady event (no stuck spinner). Billing
          // happens HERE, the moment fal spend is confirmed, so a disconnect
          // before the post-stream teach charge can't grant free paid images.
          const capturedId = imageId;
          const task = (async (): Promise<void> => {
            let gen: ImageGenerationResult | null = null;
            try {
              gen = await generateTeacherImage({ userId: uid, subjectId: slug, prompt: promptText });
            } catch {
              gen = null;
            }
            // Bill fal.ai images immediately + idempotently. requestId is
            // globally unique (random id) and chargeV4Ai dedupes on it, so this
            // never double-charges and is independent of the teach-turn charge.
            if (gen && gen.ok && gen.provider === "fal") {
              try {
                await chargeV4Ai({
                  requestId: `v4img_${capturedId}`,
                  userId: uid,
                  subjectId: slug,
                  costUsd: FLUX_SCHNELL_USD_PER_IMAGE,
                  source: "v4_ai_image",
                  model: "flux-schnell",
                  note: `صورة توضيحية درس ${lessonCode}`,
                  drainIfInsufficient: true,
                });
              } catch {}
            }
            // Emit the ready event (best-effort; skipped if the client left).
            if (res.writableEnded) return;
            try {
              const url = gen && gen.ok ? gen.url : (await resolveTeacherImage("")).url;
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ imageReady: { id: capturedId, url } })}\n\n`);
              }
            } catch {}
          })();
          __imageTasks.push(task);
        }
        __imageStreamBuffer = __imageStreamBuffer.slice(tagEnd + 2);
      }
      return safeOutput;
    };

    const result = await streamGeminiTeaching({
      systemPrompt,
      messages: geminiMessages,
      maxOutputTokens: turnTier.maxOutputTokens,
      model: V4_TEACHING_MODEL,
      temperature: 0.7,
      signal: abort.signal,
      logTag: `v4-teach:${slug}:${lessonCode}`,
      onChunk: (text) => {
        if (!text) return;
        fullText += text;
        // Extract IMAGE tags first (turns `[[IMAGE: prompt]]` → `[[IMAGE:id]]`
        // and holds back partial tags), THEN strip protocol tags from the prose
        // the student sees. stripProtocolTags leaves `[[IMAGE:id]]` untouched.
        const display = stripProtocolTags(processImageTags(text));
        if (display && !res.writableEnded) {
          try {
            res.write(`data: ${JSON.stringify({ content: display })}\n\n`);
          } catch {}
        }
      },
    });

    // Flush any text held back in the image buffer (an incomplete `[[IMAGE:`
    // prefix is dropped; everything else is forwarded so no prose is lost).
    if (__imageStreamBuffer) {
      const leftover = __imageStreamBuffer.replace(/\[\[IMAGE:[^\]]*$/i, "");
      __imageStreamBuffer = "";
      const tailDisplay = stripProtocolTags(leftover);
      if (tailDisplay && !res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ content: tailDisplay })}\n\n`);
        } catch {}
      }
    }

    // Let every per-image pipeline finish: each one self-bills its fal spend
    // (idempotently) and emits imageReady. Awaiting here means the teaching
    // charge below reads a balance that already reflects any image debit, and
    // it bounds the request so generation can't outlive the handler. The store
    // resolves fast (cache/pollinations/SVG instant; fal ≈ a few seconds).
    if (__imageTasks.length > 0) {
      await Promise.allSettled(__imageTasks);
    }

    // ── 6. Charge wallet (post-stream so we know we got a real reply) ─
    // Teaching tokens only — FLUX image spend is billed separately and
    // immediately inside each image task (source `v4_ai_image`) so a mid-stream
    // disconnect can't leak free paid images.
    const usdCost = estimateTeachingCostUsd(result.inputTokens, result.outputTokens);
    if (usdCost > 0) {
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
    }

    // ── 7. Parse + apply protocol tags ───────────────────────────────
    const tags = parseProtocolTags(fullText);
    const effects = await applyTagEffects(
      { userId: uid, subjectSlug: slug, lessonId: lesson.id, lessonCode },
      tags,
    );

    // ── 8. Terminal event ────────────────────────────────────────────
    if (!res.writableEnded) {
      try {
        res.write(
          `data: ${JSON.stringify({
            done: true,
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
      const cleanedAssistant = stripProtocolTags(fullText);
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
 * Conservative Gemini 2.0 Flash cost estimate via OpenRouter.
 * Pricing as of May 2026: $0.10 / 1M in, $0.40 / 1M out.
 */
function estimateTeachingCostUsd(inputTokens: number, outputTokens: number): number {
  const usd = ((inputTokens || 0) * 0.10 + (outputTokens || 0) * 0.40) / 1_000_000;
  return Math.max(0, usd);
}

export default router;
