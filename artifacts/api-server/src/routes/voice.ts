import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { sql, eq, and } from "drizzle-orm";
import { db, aiUsageEventsTable } from "@workspace/db";
import { getOpenAIAudioClient, isOpenAIAudioConfigured } from "../lib/openai-audio";
import { getStartOfTodayYemen } from "../lib/yemen-time";

const router: IRouter = Router();

const TTS_MAX_CHARS = 2000;
const TTS_DAILY_LIMIT = 60;
// 4 MB upper bound: enough headroom for 60s of Safari mp4/AAC at
// ~256 kbps (≈1.9 MB) plus a 2× safety margin, while bounding the
// per-request transcription cost in case a client bypasses the
// client-side 60s timer.
const STT_MAX_BYTES = 4 * 1024 * 1024;
const STT_DAILY_LIMIT = 60;
const STT_ALLOWED_MIME_PREFIXES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
] as const;
// Higher-quality cloud TTS model. `gpt-4o-mini-tts` supports the expanded
// voice set (ash, coral, sage, verse, ballad…) and the `instructions`
// parameter for fine-grained style control.
const TTS_MODEL = "gpt-4o-mini-tts";

// Style instructions passed to the model so the voice sounds like a calm,
// professional Arabic teacher rather than a generic narrator.
const TTS_INSTRUCTIONS =
  "You are a professional Arabic teacher on an educational platform for students. " +
  "Speak in clear, fluent Modern Standard Arabic (فصحى). " +
  "Use a calm, warm, and confident tone — like a knowledgeable teacher explaining to a student. " +
  "Pace yourself moderately: not too fast, not too slow. " +
  "Pronounce each word precisely and naturally. " +
  "Do not add any sounds, music, or commentary beyond reading the provided text.";

// Default voice: `shimmer` — warm, articulate, and performs best for Arabic
// among the available options on gpt-4o-mini-tts.
const TTS_DEFAULT_VOICE = "shimmer" as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: STT_MAX_BYTES, files: 1 },
});

// gpt-4o-mini-tts expanded voice set (superset of the old tts-1 voices).
type AllowedVoice =
  | "nova" | "shimmer" | "alloy" | "echo" | "fable" | "onyx"
  | "ash" | "coral" | "sage" | "verse" | "ballad";
const ALLOWED_VOICES: ReadonlySet<AllowedVoice> = new Set([
  "nova", "shimmer", "alloy", "echo", "fable", "onyx",
  "ash", "coral", "sage", "verse", "ballad",
]);

function getUserId(req: Request): number | null {
  return (req as Request & { session?: { userId?: number } }).session?.userId ?? null;
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
    return 0;
  }
}

async function logVoiceCall(opts: {
  userId: number;
  route: string;
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
      model: opts.route === "ai/tts" ? TTS_MODEL : "whisper-1",
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

router.post("/ai/tts", async (req, res): Promise<unknown> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!isOpenAIAudioConfigured()) {
    return res.status(503).json({
      error: "TTS_NOT_CONFIGURED",
      message: "خدمة قراءة النص غير مهيّأة على الخادم.",
    });
  }

  const calls = await countTodayCalls(userId, "ai/tts");
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

  const chosenVoice: AllowedVoice =
    voice && ALLOWED_VOICES.has(voice as AllowedVoice)
      ? (voice as AllowedVoice)
      : TTS_DEFAULT_VOICE;

  const start = Date.now();
  try {
    const client = getOpenAIAudioClient();
    if (!client) throw new Error("OpenAI client not configured");
    const speech = await client.audio.speech.create({
      model: TTS_MODEL,
      voice: chosenVoice,
      input: text,
      response_format: "mp3",
      // Style instructions — guide the model to sound like a professional
      // Arabic teacher rather than a generic narrator.
      // @ts-expect-error — `instructions` is supported by gpt-4o-mini-tts
      // but not yet typed in the current @types/openai version.
      instructions: TTS_INSTRUCTIONS,
    });
    const arrayBuf = await speech.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    void logVoiceCall({
      userId,
      route: "ai/tts",
      status: "success",
      inputTokens: text.length,
      latencyMs: Date.now() - start,
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/tts] FAILED:", msg);
    void logVoiceCall({
      userId,
      route: "ai/tts",
      status: "error",
      errorMessage: msg,
      latencyMs: Date.now() - start,
    });
    return res.status(503).json({
      error: "TTS_FAILED",
      message: "تعذّر تجهيز الصوت الآن. أعد المحاولة بعد لحظات.",
    });
  }
});

router.post("/ai/stt", upload.single("audio"), async (req, res): Promise<unknown> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!isOpenAIAudioConfigured()) {
    return res.status(503).json({
      error: "STT_NOT_CONFIGURED",
      message: "خدمة الإملاء الصوتي غير مهيّأة على الخادم.",
    });
  }

  const calls = await countTodayCalls(userId, "ai/stt");
  if (calls >= STT_DAILY_LIMIT) {
    return res.status(429).json({
      error: "STT_DAILY_LIMIT",
      message: `وصلت الحد اليومي للإملاء الصوتي (${STT_DAILY_LIMIT} مرة). يتجدّد منتصف الليل بتوقيت اليمن.`,
    });
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file || !file.buffer || file.buffer.length === 0) {
    return res.status(400).json({ error: "NO_AUDIO", message: "لم يتم استلام ملف الصوت." });
  }

  const mime = (file.mimetype || "audio/webm").toLowerCase();
  if (!STT_ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p))) {
    return res.status(415).json({
      error: "UNSUPPORTED_AUDIO_TYPE",
      message: "نوع الملف الصوتي غير مدعوم.",
    });
  }
  if (file.buffer.length > STT_MAX_BYTES) {
    return res.status(413).json({
      error: "AUDIO_TOO_LARGE",
      message: `حجم الملف يتجاوز ${Math.round(STT_MAX_BYTES / (1024 * 1024))} ميجابايت.`,
    });
  }
  let ext = "webm";
  if (mime.includes("ogg")) ext = "ogg";
  else if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) ext = "m4a";
  else if (mime.includes("wav")) ext = "wav";
  else if (mime.includes("mpeg") || mime.includes("mp3")) ext = "mp3";

  const start = Date.now();
  try {
    const client = getOpenAIAudioClient();
    if (!client) throw new Error("OpenAI client not configured");

    const { toFile } = await import("@workspace/integrations-openai-ai-server");
    const audioFile = await toFile(file.buffer, `recording.${ext}`, { type: mime });

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ar",
      response_format: "json",
      // Biases Whisper toward formal Arabic technical vocabulary.
      prompt: "املاء طالب يستخدم منصة نُخبة التعليمية. قد يخلط مصطلحات تقنية بالإنجليزية مع جمل عربية فصيحة.",
    });

    const text = (transcription.text ?? "").toString().trim();

    void logVoiceCall({
      userId,
      route: "ai/stt",
      status: "success",
      outputTokens: text.length,
      latencyMs: Date.now() - start,
    });

    return res.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai/stt] FAILED:", msg);
    void logVoiceCall({
      userId,
      route: "ai/stt",
      status: "error",
      errorMessage: msg,
      latencyMs: Date.now() - start,
    });
    return res.status(503).json({
      error: "STT_FAILED",
      message: "تعذّر تحويل الصوت إلى نص الآن. أعد المحاولة بعد لحظات.",
    });
  }
});

// Friendly JSON for multer errors (file too large, too many parts, etc.)
// instead of the default HTML 500 page.
router.use("/ai/stt", (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      error: err.code,
      message: err.code === "LIMIT_FILE_SIZE"
        ? `حجم الملف يتجاوز ${Math.round(STT_MAX_BYTES / (1024 * 1024))} ميجابايت.`
        : "خطأ في رفع الملف الصوتي.",
    });
  }
  return next(err);
});

function sanitizeTextForTts(raw: string): string {
  if (!raw) return "";
  let s = String(raw);

  // ── 1. Fenced code blocks → drop entirely (never read code aloud) ──────────
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Indented code blocks (4+ spaces or tab at line start)
  s = s.replace(/^( {4,}|\t).+$/gm, " ");

  // ── 2. Internal platform markers ──────────────────────────────────────────
  s = s.replace(/\[\[(?:CREATE_LAB_ENV|ASK_OPTIONS|IMAGE|PLAN_READY|STAGE_COMPLETE|LAB_INTAKE_DONE)[^\]]*\]\]/gi, " ");

  // ── 3. HTML tags ──────────────────────────────────────────────────────────
  s = s.replace(/<[^>]*>/g, " ");

  // ── 4. LaTeX / math blocks ($$ and $) ────────────────────────────────────
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
  s = s.replace(/\$[^$\n]+\$/g, " ");

  // ── 5. Markdown headings → keep heading text only ─────────────────────────
  s = s.replace(/^#{1,6}\s+/gm, "");

  // ── 6. Horizontal rules ───────────────────────────────────────────────────
  s = s.replace(/^[-*_]{3,}\s*$/gm, " ");

  // ── 7. Blockquotes (> at line start) ─────────────────────────────────────
  s = s.replace(/^>\s*/gm, "");

  // ── 8. Table rows (any line that starts and ends with |) ──────────────────
  s = s.replace(/^\|.*\|$/gm, " ");
  // Table separator rows like |---|---|
  s = s.replace(/^[\|\s\-:]+$/gm, " ");

  // ── 9. Bold / italic markers — keep the inner text ────────────────────────
  // ***bold italic*** **bold** *italic*
  s = s.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1");
  // __bold__ _italic_
  s = s.replace(/_{1,2}([^_\n]+)_{1,2}/g, "$1");
  // ~~strikethrough~~
  s = s.replace(/~~([^~\n]+)~~/g, "$1");

  // ── 10. Inline code: keep simple identifiers, drop complex expressions ────
  //   Simple: only word chars + dots/hyphens (useEffect, console.log, XSS…)
  //   Complex: contains parens, brackets, operators, spaces → drop
  s = s.replace(/`([^`\n]+)`/g, (_, inner: string) => {
    const t = inner.trim();
    return /^[\w\u0600-\u06FF][\w\u0600-\u06FF.\-]*$/.test(t) ? t : " ";
  });

  // ── 11. Markdown links [label](url) → keep label only ────────────────────
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Image links ![alt](url) → drop entirely
  s = s.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");

  // ── 12. Raw URLs ──────────────────────────────────────────────────────────
  s = s.replace(/https?:\/\/\S+/g, " ");

  // ── 13. List bullet markers at line start (-, *, +, 1., 2)…) ─────────────
  s = s.replace(/^[ \t]*[-*+]\s+/gm, " ");
  s = s.replace(/^[ \t]*\d+[.)]\s+/gm, " ");

  // ── 14. Stray punctuation that TTS reads aloud as symbols ─────────────────
  // Pipes, carets, tildes, backslashes, curly/square brackets that survived
  s = s.replace(/[|^\\{}\[\]~`]/g, " ");
  // Angle brackets (not part of HTML since we already stripped tags)
  s = s.replace(/[<>]/g, " ");
  // Hash still present (e.g. #tag outside a heading)
  s = s.replace(/#/g, " ");
  // @ symbol (mentions, email-style references)
  s = s.replace(/@\S*/g, " ");

  // ── 15. Emojis ────────────────────────────────────────────────────────────
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, " ");

  // ── 16. Normalise whitespace ──────────────────────────────────────────────
  return s.replace(/\s+/g, " ").trim();
}

export default router;
