import { Router, type IRouter } from "express";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import multer from "multer";
import mammoth from "mammoth";
import { createRequire as __createRequire } from "node:module";
const __requireForPdf = __createRequire(import.meta.url);
// pdf-parse is a CJS module that does not provide a named ESM default export.
// Loading it via createRequire avoids the ESM interop issue while keeping it
// externalized in the build (so its data files are loaded at runtime, not bundled).
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = __requireForPdf("pdf-parse");
import {
  db,
  userSpecializationCoursesTable,
  userCourseFilesTable,
} from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { ContentBlockParam, ContentBlock } from "@anthropic-ai/sdk/resources/messages";

const router: IRouter = Router();

const MAX_COURSES_PER_SPEC = 6;
const MAX_FILES_PER_COURSE = 2;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_EXTRACTED_CHARS = 200;
// MUST match PER_FILE_CAP in ai.ts — number of chars from each file actually
// fed to the AI teacher per request. Surfaced to clients so they can warn
// students when their uploads exceed the teacher's context window.
const PER_FILE_CAP = 60_000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

function isUniSpec(specializationId: string | undefined): specializationId is string {
  return typeof specializationId === "string" && specializationId.startsWith("uni-");
}

// ── Quality heuristic ───────────────────────────────────────────────────────
// Cheap, runs on a sample of the extracted text. We classify a file as
// "suspicious" when the recognized-letter ratio is too low, the average
// line is unusually short, whitespace dominates, or the text contains the
// Unicode replacement character (a strong signal of a broken encoding /
// scanned PDF). Otherwise "good".
const QUALITY_SAMPLE_CHARS = 8_000;

export type QualityReason =
  | "ENCODING"
  | "LOW_LETTERS"
  | "WHITESPACE"
  | "SHORT_LINES"
  | "TOO_SHORT";

export type FileQuality = {
  quality: "good" | "suspicious";
  reason: QualityReason | null;
};

export function computeQuality(sample: string): FileQuality {
  const text = sample ?? "";
  if (text.length < 50) {
    return { quality: "suspicious", reason: "TOO_SHORT" };
  }

  let letters = 0;
  let whitespace = 0;
  let replacement = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const ch = text[i];
    if (ch === "\uFFFD") replacement++;
    // whitespace incl. NBSP
    if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || code === 0xa0) {
      whitespace++;
      continue;
    }
    // Arabic letters block U+0600–U+06FF (excluding digits 0660-0669, 06F0-06F9)
    if (code >= 0x0600 && code <= 0x06ff) {
      if (!(code >= 0x0660 && code <= 0x0669) && !(code >= 0x06f0 && code <= 0x06f9)) {
        letters++;
      }
      continue;
    }
    // Arabic Supplement / Extended-A
    if (code >= 0x0750 && code <= 0x077f) { letters++; continue; }
    if (code >= 0x08a0 && code <= 0x08ff) { letters++; continue; }
    // Arabic Presentation Forms-A / -B
    if (code >= 0xfb50 && code <= 0xfdff) { letters++; continue; }
    if (code >= 0xfe70 && code <= 0xfeff) { letters++; continue; }
    // Latin letters
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      letters++;
      continue;
    }
    // Latin-1 supplement letters (À-ÿ minus ×÷)
    if (code >= 0x00c0 && code <= 0x00ff && code !== 0x00d7 && code !== 0x00f7) {
      letters++;
      continue;
    }
  }

  const total = text.length;
  const nonWs = Math.max(1, total - whitespace);
  const letterRatio = letters / nonWs;
  const wsRatio = whitespace / total;
  const replacementRatio = replacement / total;

  // Average non-empty line length
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const avgLineLen = lines.length > 0 ? lines.reduce((a, l) => a + l.length, 0) / lines.length : 0;

  if (replacementRatio > 0.005) return { quality: "suspicious", reason: "ENCODING" };
  if (letterRatio < 0.55) return { quality: "suspicious", reason: "LOW_LETTERS" };
  if (wsRatio > 0.6) return { quality: "suspicious", reason: "WHITESPACE" };
  if (avgLineLen < 6 && lines.length > 20) return { quality: "suspicious", reason: "SHORT_LINES" };

  return { quality: "good", reason: null };
}

async function extractText(buffer: Buffer, mime: string, name: string): Promise<string> {
  const lower = name.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const out = await pdfParse(buffer);
    return (out?.text ?? "").trim();
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const out = await mammoth.extractRawText({ buffer });
    return (out?.value ?? "").trim();
  }
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

// ── List courses for a specialization ────────────────────────────────────────
router.get("/courses", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { specializationId } = req.query as { specializationId?: string };
  if (!isUniSpec(specializationId)) {
    res.status(400).json({ error: "specializationId must be a uni-* id" });
    return;
  }

  const courses = await db
    .select()
    .from(userSpecializationCoursesTable)
    .where(and(
      eq(userSpecializationCoursesTable.userId, userId),
      eq(userSpecializationCoursesTable.specializationId, specializationId),
    ))
    .orderBy(asc(userSpecializationCoursesTable.createdAt));

  const courseIds = courses.map((c) => c.id);
  type FileRow = {
    id: number;
    courseId: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
    extractedChars: number;
    qualitySample: string;
    hasOriginal: boolean;
    ocrAppliedAt: Date | null;
  };
  let files: FileRow[] = [];
  if (courseIds.length > 0) {
    files = await db
      .select({
        id: userCourseFilesTable.id,
        courseId: userCourseFilesTable.courseId,
        fileName: userCourseFilesTable.fileName,
        mimeType: userCourseFilesTable.mimeType,
        fileSize: userCourseFilesTable.fileSize,
        uploadedAt: userCourseFilesTable.uploadedAt,
        extractedChars: sql<number>`char_length(${userCourseFilesTable.extractedText})`.as("extractedChars"),
        qualitySample: sql<string>`substring(${userCourseFilesTable.extractedText} from 1 for ${QUALITY_SAMPLE_CHARS})`.as("qualitySample"),
        hasOriginal: sql<boolean>`${userCourseFilesTable.originalBytes} is not null`.as("hasOriginal"),
        ocrAppliedAt: userCourseFilesTable.ocrAppliedAt,
      })
      .from(userCourseFilesTable)
      .where(eq(userCourseFilesTable.userId, userId))
      .orderBy(desc(userCourseFilesTable.uploadedAt));
  }

  const filesByCourse: Record<number, any[]> = {};
  for (const f of files) {
    const { qualitySample, ...rest } = f;
    const q = computeQuality(qualitySample ?? "");
    (filesByCourse[f.courseId] ||= []).push({ ...rest, quality: q.quality, qualityReason: q.reason });
  }

  res.json({
    courses: courses.map((c) => ({
      ...c,
      files: filesByCourse[c.id] ?? [],
    })),
    maxCourses: MAX_COURSES_PER_SPEC,
    maxFilesPerCourse: MAX_FILES_PER_COURSE,
    perFileCap: PER_FILE_CAP,
  });
});

// ── Create a course ──────────────────────────────────────────────────────────
router.post("/courses", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { specializationId, courseName, emoji } = req.body ?? {};
  if (!isUniSpec(specializationId)) {
    res.status(400).json({ error: "specializationId must be a uni-* id" });
    return;
  }
  const name = String(courseName ?? "").trim().slice(0, 80);
  if (!name) {
    res.status(400).json({ error: "courseName required" });
    return;
  }

  const existing = await db
    .select({ id: userSpecializationCoursesTable.id })
    .from(userSpecializationCoursesTable)
    .where(and(
      eq(userSpecializationCoursesTable.userId, userId),
      eq(userSpecializationCoursesTable.specializationId, specializationId),
    ));
  if (existing.length >= MAX_COURSES_PER_SPEC) {
    res.status(400).json({ error: "MAX_COURSES_REACHED", max: MAX_COURSES_PER_SPEC });
    return;
  }

  const [created] = await db
    .insert(userSpecializationCoursesTable)
    .values({
      userId,
      specializationId,
      courseName: name,
      emoji: typeof emoji === "string" && emoji ? emoji.slice(0, 8) : "📘",
      updatedAt: new Date(),
    })
    .returning();

  res.json({ course: { ...created, files: [] } });
});

// ── Rename a course ──────────────────────────────────────────────────────────
router.patch("/courses/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const { courseName } = req.body ?? {};
  const name = String(courseName ?? "").trim().slice(0, 80);
  if (!name) {
    res.status(400).json({ error: "courseName required" });
    return;
  }
  const [c] = await db
    .select()
    .from(userSpecializationCoursesTable)
    .where(and(eq(userSpecializationCoursesTable.id, id), eq(userSpecializationCoursesTable.userId, userId)));
  if (!c) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await db
    .update(userSpecializationCoursesTable)
    .set({ courseName: name, updatedAt: new Date() })
    .where(eq(userSpecializationCoursesTable.id, id));
  res.json({ ok: true });
});

// ── Delete a course (and its files) ─────────────────────────────────────────
router.delete("/courses/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [c] = await db
    .select()
    .from(userSpecializationCoursesTable)
    .where(and(eq(userSpecializationCoursesTable.id, id), eq(userSpecializationCoursesTable.userId, userId)));
  if (!c) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await db.delete(userCourseFilesTable).where(eq(userCourseFilesTable.courseId, id));
  await db.delete(userSpecializationCoursesTable).where(eq(userSpecializationCoursesTable.id, id));
  res.json({ ok: true });
});

// ── Upload a file to a course ───────────────────────────────────────────────
router.post("/courses/:id/files", upload.single("file"), async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: "file required" });
    return;
  }

  const [course] = await db
    .select()
    .from(userSpecializationCoursesTable)
    .where(and(eq(userSpecializationCoursesTable.id, id), eq(userSpecializationCoursesTable.userId, userId)));
  if (!course) {
    res.status(404).json({ error: "course not found" });
    return;
  }

  const existingFiles = await db
    .select({ id: userCourseFilesTable.id })
    .from(userCourseFilesTable)
    .where(eq(userCourseFilesTable.courseId, id));
  if (existingFiles.length >= MAX_FILES_PER_COURSE) {
    res.status(400).json({ error: "MAX_FILES_REACHED", max: MAX_FILES_PER_COURSE });
    return;
  }

  let extracted = "";
  try {
    extracted = await extractText(file.buffer, file.mimetype, file.originalname);
  } catch (err: any) {
    if (err?.message === "UNSUPPORTED_FILE_TYPE") {
      res.status(400).json({ error: "UNSUPPORTED_FILE_TYPE", message: "نوع الملف غير مدعوم. يرجى رفع PDF أو DOCX فقط." });
      return;
    }
    res.status(400).json({ error: "EXTRACTION_FAILED", message: "تعذّر قراءة الملف. تأكد من سلامة الملف." });
    return;
  }

  if (extracted.length < MIN_EXTRACTED_CHARS) {
    res.status(400).json({
      error: "INSUFFICIENT_TEXT",
      message: "لم نتمكن من قراءة محتوى الملف، تأكد من أنه يحتوي نصاً قابلاً للنسخ.",
    });
    return;
  }

  // Cap stored text to keep things reasonable
  const clipped = extracted.slice(0, 600_000);

  const isPdfUpload = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  const [inserted] = await db
    .insert(userCourseFilesTable)
    .values({
      courseId: id,
      userId,
      fileName: file.originalname.slice(0, 200),
      mimeType: file.mimetype,
      fileSize: file.size,
      extractedText: clipped,
      // Persist the original bytes only for PDFs so students can re-extract
      // them with OCR later if the cheap text extraction came out garbled.
      // DOCX files are skipped because OCR doesn't apply to them.
      originalBytes: isPdfUpload ? file.buffer : null,
    })
    .returning({
      id: userCourseFilesTable.id,
      courseId: userCourseFilesTable.courseId,
      fileName: userCourseFilesTable.fileName,
      mimeType: userCourseFilesTable.mimeType,
      fileSize: userCourseFilesTable.fileSize,
      uploadedAt: userCourseFilesTable.uploadedAt,
    });

  await db
    .update(userSpecializationCoursesTable)
    .set({ updatedAt: new Date() })
    .where(eq(userSpecializationCoursesTable.id, id));

  const q = computeQuality(clipped.slice(0, QUALITY_SAMPLE_CHARS));
  res.json({
    file: {
      ...inserted,
      extractedChars: clipped.length,
      quality: q.quality,
      qualityReason: q.reason,
      hasOriginal: isPdfUpload,
      ocrAppliedAt: null,
    },
  });
});

// ── Re-extract a file with OCR ──────────────────────────────────────────────
// When the cheap text extraction comes out garbled (typically a scanned PDF),
// students can ask the server to redo extraction with an OCR-capable model.
// We send the original PDF bytes to Claude, which can read scanned PDFs, and
// replace the stored extracted_text with the result. The endpoint blocks until
// OCR finishes, which can take 10-60 seconds — the client shows a spinner.
const OCR_MAX_BYTES = 8 * 1024 * 1024; // Anthropic inline document limit
router.post("/courses/files/:fileId/ocr", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const fileId = Number(req.params.fileId);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [row] = await db
    .select({
      id: userCourseFilesTable.id,
      courseId: userCourseFilesTable.courseId,
      fileName: userCourseFilesTable.fileName,
      mimeType: userCourseFilesTable.mimeType,
      fileSize: userCourseFilesTable.fileSize,
      uploadedAt: userCourseFilesTable.uploadedAt,
      originalBytes: userCourseFilesTable.originalBytes,
    })
    .from(userCourseFilesTable)
    .where(and(eq(userCourseFilesTable.id, fileId), eq(userCourseFilesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (!row.originalBytes) {
    // Older files were stored before we kept the original bytes around.
    res.status(400).json({
      error: "ORIGINAL_UNAVAILABLE",
      message: "هذا الملف رُفع قبل دعم إعادة الاستخراج. يرجى رفعه مرة أخرى ثم استخدام إعادة الاستخراج.",
    });
    return;
  }
  const rawBytes: Buffer | Uint8Array | string = row.originalBytes;
  const buffer: Buffer = Buffer.isBuffer(rawBytes)
    ? rawBytes
    : typeof rawBytes === "string"
      ? Buffer.from(rawBytes, "binary")
      : Buffer.from(rawBytes);
  if (buffer.length > OCR_MAX_BYTES) {
    res.status(400).json({
      error: "FILE_TOO_LARGE_FOR_OCR",
      message: `حجم الملف أكبر من الحد المسموح به للمعالجة بالـOCR (${Math.floor(OCR_MAX_BYTES / 1024 / 1024)}MB). جرّب تقسيم الملف.`,
    });
    return;
  }
  const isPdf = row.mimeType === "application/pdf" || row.fileName.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    res.status(400).json({
      error: "OCR_UNSUPPORTED_TYPE",
      message: "إعادة الاستخراج بالـOCR متاحة لملفات PDF فقط.",
    });
    return;
  }

  const ocrPromptBlocks: ContentBlockParam[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
    {
      type: "text",
      text:
        "أعد كتابة كل النص الموجود في هذا المستند كما هو، باللغة الأصلية (عربية أو إنجليزية)، مع المحافظة على ترتيب الفقرات والعناوين قدر الإمكان. لا تُلخّص ولا تُترجم ولا تُضِف أي شرح أو تعليق — فقط النص المُستخرج بصيغة نصية عادية.",
    },
  ];

  let ocrText = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: ocrPromptBlocks }],
    });
    for (const block of response.content as ContentBlock[]) {
      if (block.type === "text") {
        ocrText += block.text;
      }
    }
    ocrText = ocrText.trim();
  } catch (err: unknown) {
    console.error("OCR failed", err);
    res.status(502).json({
      error: "OCR_FAILED",
      message: "تعذّر إجراء OCR على الملف الآن. يرجى المحاولة مرة أخرى بعد قليل.",
    });
    return;
  }

  if (ocrText.length < MIN_EXTRACTED_CHARS) {
    res.status(422).json({
      error: "OCR_INSUFFICIENT_TEXT",
      message: "لم يتمكن الـOCR من قراءة محتوى مفيد من هذا الملف. تأكد من جودة المسح الضوئي.",
    });
    return;
  }

  const clipped = ocrText.slice(0, 600_000);
  const now = new Date();
  await db
    .update(userCourseFilesTable)
    .set({ extractedText: clipped, ocrAppliedAt: now })
    .where(eq(userCourseFilesTable.id, fileId));

  await db
    .update(userSpecializationCoursesTable)
    .set({ updatedAt: now })
    .where(eq(userSpecializationCoursesTable.id, row.courseId));

  const q = computeQuality(clipped.slice(0, QUALITY_SAMPLE_CHARS));
  res.json({
    file: {
      id: row.id,
      courseId: row.courseId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      uploadedAt: row.uploadedAt,
      extractedChars: clipped.length,
      quality: q.quality,
      qualityReason: q.reason,
      hasOriginal: true,
      ocrAppliedAt: now,
    },
  });
});

// ── Preview extracted text of a file (first ~2000 chars) ────────────────────
const PREVIEW_CHARS = 2000;
router.get("/courses/files/:fileId/preview", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const fileId = Number(req.params.fileId);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [row] = await db
    .select({
      id: userCourseFilesTable.id,
      fileName: userCourseFilesTable.fileName,
      preview: sql<string>`substring(${userCourseFilesTable.extractedText} from 1 for ${PREVIEW_CHARS})`.as("preview"),
      totalChars: sql<number>`char_length(${userCourseFilesTable.extractedText})`.as("totalChars"),
    })
    .from(userCourseFilesTable)
    .where(and(eq(userCourseFilesTable.id, fileId), eq(userCourseFilesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const preview = row.preview ?? "";
  const totalChars = Number(row.totalChars ?? 0);
  res.json({
    fileName: row.fileName,
    preview,
    totalChars,
    previewChars: preview.length,
    truncated: totalChars > preview.length,
  });
});

// ── Delete a file from a course ─────────────────────────────────────────────
router.delete("/courses/files/:fileId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const fileId = Number(req.params.fileId);
  if (!Number.isFinite(fileId)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [f] = await db
    .select()
    .from(userCourseFilesTable)
    .where(and(eq(userCourseFilesTable.id, fileId), eq(userCourseFilesTable.userId, userId)));
  if (!f) {
    res.status(404).json({ error: "not found" });
    return;
  }
  await db.delete(userCourseFilesTable).where(eq(userCourseFilesTable.id, fileId));
  res.json({ ok: true });
});

// ── Multer error handler ────────────────────────────────────────────────────
router.use((err: any, _req: any, res: any, next: any) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "FILE_TOO_LARGE", message: "حجم الملف أكبر من 10MB." });
  }
  return next(err);
});

export default router;
