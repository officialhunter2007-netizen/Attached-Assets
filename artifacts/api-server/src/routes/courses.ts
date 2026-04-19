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
  let files: any[] = [];
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
      })
      .from(userCourseFilesTable)
      .where(eq(userCourseFilesTable.userId, userId))
      .orderBy(desc(userCourseFilesTable.uploadedAt));
  }

  const filesByCourse: Record<number, any[]> = {};
  for (const f of files) {
    (filesByCourse[f.courseId] ||= []).push(f);
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

  const [inserted] = await db
    .insert(userCourseFilesTable)
    .values({
      courseId: id,
      userId,
      fileName: file.originalname.slice(0, 200),
      mimeType: file.mimetype,
      fileSize: file.size,
      extractedText: clipped,
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

  res.json({ file: inserted });
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
