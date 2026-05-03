// Voice routes: text-to-speech (TTS) and speech-to-text (STT).
//
// Both routes use OpenAI's audio APIs directly (NOT through OpenRouter)
// via the dedicated client in `../lib/openai-audio`. They are kept in a
// separate router from `/ai/*` because:
//   1. They have very different request/response shapes (binary audio vs
//      JSON text) — bundling them with the SSE-heavy `routes/ai.ts` would
//      bloat that already-7000-line file.
//   2. They have their own per-user daily caps independent of the gem
//      wallet (TTS/STT are platform-absorbed convenience features, not
//      AI tutoring turns), so the existing gem-charging plumbing in
//      `routes/ai.ts` does not apply.
//
// Mounted by `app.ts` under `/api`, so the public paths are:
//   POST /api/voice/tts   { text }                 → audio/mpeg
//   POST /api/voice/stt   multipart/form-data file → { text }
//
// Both routes require an authenticated session (the `req.session.userId`
// cookie populated by the auth middleware).

import { Router, type IRouter } from "express";
import multer from "multer";
import { sql, eq, and } from "drizzle-orm";
import { db, aiUsageEventsTable } from "@workspace/db";
import { getOpenAIAudioClient, isOpenAIAudioConfigured } from "../lib/openai-audio";
import { getStartOfTodayYemen } from "../lib/yemen-time";

const router: IRouter = Router();

// ── Limits ────────────────────────────────────────────────────────────────
// TTS: 2000 chars/request, 60 requests/user/day.
// STT: 8 MB/file, 60 requests/user/day, ~60 s typical recording length
//      (enforced client-side; server only checks file size).
const TTS_MAX_CHARS = 2000;
const TTS_DAILY_LIMIT = 60;
const STT_MAX_BYTES = 8 * 1024 * 1024;
const STT_DAILY_LIMIT = 60;

// In-memory storage with size cap; the file never touches disk so the
// container's ephemeral disk doesn't fill up under load.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: STT_MAX_BYTES, files: 1 },
});

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function countTodayCalls(userId: number, route: string): Promise<number> {
  try {
    const since = getStartOfTodayYemen();
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(aiUsageEventsTable)
      .where(and(
        eq(aiUsageEventsTable.userId, userId),
        eq(aiUsageEventsTable.route, route),
        sql`${aiUsageEventsTable.createdAt} >= ${since}`,
      ));
    return Number(n ?? 0);
  } catch {
    // Fail-open: a counter blip should not block voice — the OpenAI bill
    // is bounded by the per-request size cap above.
    return 0;
  }
}

async function logVoiceCall(opts: {
  userId: number;
  route: string;
  // Schema defaults to "success" / "error" (free-form text). Use those
  // strings so admin dashboards counting non-error calls (`status =
  // 'success'`) include voice traffic correctly.
  status: "success" | "error";
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}): Promise<void> {
  try {
    await db.insert(aiUsageEventsTable).values({
      userId: opts.userId,
      subjectId: null,
      route: opts.route,
      provider: "openai",
      model: opts.route === "voice/tts" ? "tts-1" : "whisper-1",
      inputTokens: opts.inputTokens ?? 0,
      outputTokens: opts.outputTokens ?? 0,
      cachedInputTokens: 0,
      latencyMs: opts.latencyMs,
      status: opts.status,
      errorMessage: opts.errorMessage?.slice(0, 500) ?? null,
    });
  } catch {
    // Telemetry failures must not break the user-facing call.
  }
}

// ──────────────────────────────────────────────────────────────────────────
// POST /voice/tts — text → audio/mpeg
// ──────────────────────────────────────────────────────────────────────────
//
// Body: { text: string, voice?: string }
//
// Behavior:
//   • Strips markdown/HTML/code blocks/emojis so the model doesn't try to
//     pronounce them.
//   • Caps at TTS_MAX_CHARS to bound cost.
//   • Defaults to the `nova` voice — neutral feminine, handles Arabic +
//     embedded English technical terms cleanly with `tts-1` (the cheaper
//     real-time model). `tts-1-hd` is markedly more expensive without a
//     noticeable quality bump for short tutoring sentences, so `tts-1`
//     is the deliberate default.
router.post("/voice/tts", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!isOpenAIAudioConfigured()) {
    return res.status(503).json({
      error: "TTS_NOT_CONFIGURED",
      message: "خدمة قراءة النص غير مهيّأة على الخادم.",
    });
  }

  const calls = await countTodayCalls(userId, "voice/tts");
  if (calls >= TTS_DAILY_LIMIT) {
    return res.status(429).json({
      error: "TTS_DAILY_LIMIT",
      message: `وصلت الحد اليومي لقراءة النص (${TTS_DAILY_LIMIT} مرة). يتجدّد منتصف الليل بتوقيت اليمن.`,
    });
  }

  const { text: rawText, voice } = (req.body ?? {}) as { text?: string; voice?: string };
  const cleaned = sanitizeTextForTts(rawText ?? "");
  if (!cleaned) {
    return res.status(400).json({ error: "EMPTY_TEXT", message: "النص فارغ بعد التنظيف." });
  }
  const text = cleaned.length > TTS_MAX_CHARS ? cleaned.slice(0, TTS_MAX_CHARS) : cleaned;

  // Whitelist of safe voices — `nova` and `shimmer` handle Arabic best in
  // our manual testing; the rest are kept available for future tuning.
  const allowedVoices = new Set(["nova", "shimmer", "alloy", "echo", "fable", "onyx"]);
  const chosenVoice = allowedVoices.has(String(voice)) ? String(voice) : "nova";

  const start = Date.now();
  try {
    const client = getOpenAIAudioClient();
    if (!client) throw new Error("OpenAI client not configured");
    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: chosenVoice as any,
      input: text,
      response_format: "mp3",
    });
    // OpenAI SDK returns a Web Response — convert to Buffer for Express.
    const arrayBuf = await speech.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    void logVoiceCall({
      userId,
      route: "voice/tts",
      status: "success",
      inputTokens: text.length, // proxy: char count, not real tokens
      latencyMs: Date.now() - start,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (err: any) {
    console.error("[voice/tts] FAILED:", err?.message || err);
    void logVoiceCall({
      userId,
      route: "voice/tts",
      status: "error",
      errorMessage: String(err?.message || err),
      latencyMs: Date.now() - start,
    });
    return res.status(503).json({
      error: "TTS_FAILED",
      message: "تعذّر تجهيز الصوت الآن. أعد المحاولة بعد لحظات.",
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /voice/stt — audio (multipart) → { text }
// ──────────────────────────────────────────────────────────────────────────
//
// Field name: `audio` (single file).
// Accepted MIME: anything `MediaRecorder` produces (webm, ogg, mp4, m4a,
// wav). We simply forward the buffer to OpenAI Whisper which auto-detects.
router.post("/voice/stt", upload.single("audio"), async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!isOpenAIAudioConfigured()) {
    return res.status(503).json({
      error: "STT_NOT_CONFIGURED",
      message: "خدمة الإملاء الصوتي غير مهيّأة على الخادم.",
    });
  }

  const calls = await countTodayCalls(userId, "voice/stt");
  if (calls >= STT_DAILY_LIMIT) {
    return res.status(429).json({
      error: "STT_DAILY_LIMIT",
      message: `وصلت الحد اليومي للإملاء الصوتي (${STT_DAILY_LIMIT} مرة). يتجدّد منتصف الليل بتوقيت اليمن.`,
    });
  }

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file || !file.buffer || file.buffer.length === 0) {
    return res.status(400).json({ error: "NO_AUDIO", message: "لم يتم استلام ملف الصوت." });
  }

  // Pick a filename whose extension matches the inbound MIME so OpenAI's
  // upload validation accepts the multipart correctly.
  const mime = (file.mimetype || "audio/webm").toLowerCase();
  let ext = "webm";
  if (mime.includes("ogg")) ext = "ogg";
  else if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
  else if (mime.includes("wav")) ext = "wav";
  else if (mime.includes("mpeg") || mime.includes("mp3")) ext = "mp3";

  const start = Date.now();
  try {
    const client = getOpenAIAudioClient();
    if (!client) throw new Error("OpenAI client not configured");

    // The OpenAI SDK's `transcriptions.create` accepts a File-like object.
    // The `toFile` helper is the official portable way to wrap a Buffer.
    // Pulled through the workspace integration package so api-server
    // doesn't need its own `openai` dep entry.
    const { toFile } = await import("@workspace/integrations-openai-ai-server");
    const audioFile = await toFile(file.buffer, `recording.${ext}`, { type: mime });

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ar",
      response_format: "json",
      // A short Arabic prompt biases Whisper toward formal Arabic technical
      // vocabulary — without it, common terms get transliterated oddly.
      prompt: "املاء طالب يستخدم منصة نُخبة التعليمية. قد يخلط مصطلحات تقنية بالإنجليزية مع جمل عربية فصيحة.",
    });

    const text = ((transcription as any)?.text || "").toString().trim();

    void logVoiceCall({
      userId,
      route: "voice/stt",
      status: "success",
      outputTokens: text.length,
      latencyMs: Date.now() - start,
    });

    return res.json({ text });
  } catch (err: any) {
    console.error("[voice/stt] FAILED:", err?.message || err);
    void logVoiceCall({
      userId,
      route: "voice/stt",
      status: "error",
      errorMessage: String(err?.message || err),
      latencyMs: Date.now() - start,
    });
    return res.status(503).json({
      error: "STT_FAILED",
      message: "تعذّر تحويل الصوت إلى نص الآن. أعد المحاولة بعد لحظات.",
    });
  }
});

// Strip markdown/HTML/emoji/internal markers from a teacher message so
// the TTS engine reads only the spoken content. Mirrors the
// `plainTextFromHtmlContent` helper on the client for consistency.
function sanitizeTextForTts(raw: string): string {
  if (!raw) return "";
  let s = String(raw);
  // Drop fenced code blocks entirely.
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Drop our internal markers.
  s = s.replace(/\[\[(?:CREATE_LAB_ENV|ASK_OPTIONS|IMAGE|PLAN_READY|STAGE_COMPLETE|LAB_INTAKE_DONE)[^\]]*\]\]/gi, " ");
  // Strip raw HTML tags (server-side; no DOM available).
  s = s.replace(/<[^>]*>/g, " ");
  // Strip markdown emphasis/headings/links.
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1");
  s = s.replace(/`[^`\n]+`/g, "");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip emoji-range characters that confuse the TTS prosody.
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}

export default router;
