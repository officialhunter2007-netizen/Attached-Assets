import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createReadStream, promises as fsp } from "fs";
import { tmpdir } from "os";
import path from "path";
import multer from "multer";
import {
  db,
  courseMaterialsTable,
  courseMaterialBlobsTable,
  userSubjectTeachingModesTable,
  userSubjectSubscriptionsTable,
  usersTable,
  materialChapterProgressTable,
  materialChunksTable,
  quizAttemptsTable,
} from "@workspace/db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import {
  recordAiUsage,
  extractAnthropicUsage,
  extractGeminiUsage,
} from "../lib/ai-usage";

type AiUsageCtx = { userId: number | null; subjectId?: string | null; materialId?: number | null };

// Marker stored in course_materials.object_path for PDFs that live in the DB
// (course_material_blobs) instead of Object Storage. Object Storage writes
// are blocked in deployment by the Replit sidecar's "no allowed resources"
// error on this bucket — only reads succeed — so all new uploads bypass it.
// Existing rows uploaded via the legacy signed-URL path keep their
// /objects/<id> objectPath and are still served from storage on read.
const DB_BLOB_MARKER = "db://blob";

// Loads the raw PDF bytes for a material row. New uploads (objectPath ===
// DB_BLOB_MARKER) come from course_material_blobs; legacy rows fall back to
// Object Storage download.
async function loadMaterialBuffer(row: { id: number; objectPath: string }): Promise<Buffer> {
  if (row.objectPath === DB_BLOB_MARKER) {
    const [blob] = await db
      .select()
      .from(courseMaterialBlobsTable)
      .where(eq(courseMaterialBlobsTable.materialId, row.id));
    if (!blob) throw new ObjectNotFoundError();
    return blob.pdfData;
  }
  const svc = new ObjectStorageService();
  const file = await svc.getObjectEntityFile(row.objectPath);
  const [buf] = await file.download();
  return buf;
}

const router: IRouter = Router();

const MAX_PDFS_PER_SUBJECT_PAID = 4;
const MAX_PDFS_FREE_TOTAL = 1;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB hard cap
const MAX_PAGE_COUNT = 600; // reject anything beyond a typical textbook
const MAX_EXTRACTED_CHARS = 220_000; // ~55k tokens, fits comfortably with system prompt
const OCR_PAGE_LIMIT = 80; // safety cap for Gemini OCR fallback cost

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function userHasPaidSubjectSub(userId: number, subjectId: string): Promise<boolean> {
  const [sub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(and(
      eq(userSubjectSubscriptionsTable.userId, userId),
      eq(userSubjectSubscriptionsTable.subjectId, subjectId),
    ))
    .orderBy(desc(userSubjectSubscriptionsTable.expiresAt))
    .limit(1);
  return !!(sub && new Date(sub.expiresAt) > new Date());
}

// ── GET /api/teaching-mode?subjectId=... ──────────────────────────────────────
router.get("/teaching-mode", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const subjectId = String(req.query.subjectId ?? "");
  if (!subjectId) return res.status(400).json({ error: "subjectId required" });

  const [row] = await db
    .select()
    .from(userSubjectTeachingModesTable)
    .where(and(
      eq(userSubjectTeachingModesTable.userId, userId),
      eq(userSubjectTeachingModesTable.subjectId, subjectId),
    ));

  // Helper: pick the most-recently-uploaded READY material for this subject.
  const pickFallbackMaterial = async (): Promise<number | null> => {
    const [m] = await db
      .select({ id: courseMaterialsTable.id })
      .from(courseMaterialsTable)
      .where(and(
        eq(courseMaterialsTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
        eq(courseMaterialsTable.status, "ready"),
      ))
      .orderBy(desc(courseMaterialsTable.createdAt))
      .limit(1);
    return m?.id ?? null;
  };

  // No saved row at all → try two fallbacks before giving up:
  //   1. A ready material exists for this user+subject → restore "professor"
  //      mode pointing at the most recent one.
  //   2. There's no ready material but the student has *previously* worked
  //      through chapter-progress rows on a (now-deleted/processing) material
  //      for this subject → still infer "professor" so the next session loads
  //      in the right mode the moment any material is re-uploaded.
  if (!row) {
    const fallbackId = await pickFallbackMaterial();
    if (fallbackId) {
      await db
        .insert(userSubjectTeachingModesTable)
        .values({ userId, subjectId, mode: "professor", activeMaterialId: fallbackId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
          set: { mode: "professor", activeMaterialId: fallbackId, updatedAt: new Date() },
        });
      return res.json({ mode: "professor", activeMaterialId: fallbackId });
    }

    // Look for orphan chapter-progress rows tied to this user+subject.
    const [progressHint] = await db
      .select({ materialId: materialChapterProgressTable.materialId })
      .from(materialChapterProgressTable)
      .innerJoin(courseMaterialsTable, eq(materialChapterProgressTable.materialId, courseMaterialsTable.id))
      .where(and(
        eq(materialChapterProgressTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
      ))
      .limit(1);
    if (progressHint) {
      await db
        .insert(userSubjectTeachingModesTable)
        .values({ userId, subjectId, mode: "professor", activeMaterialId: null, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
          set: { mode: "professor", activeMaterialId: null, updatedAt: new Date() },
        });
      return res.json({ mode: "professor", activeMaterialId: null });
    }

    return res.json({ mode: "unset", activeMaterialId: null });
  }

  // Mode is professor but the active material is missing/errored/processing →
  // fall back to the most-recent ready material so the next session can start
  // immediately instead of stalling on a broken pointer.
  if (row.mode === "professor") {
    let activeId = row.activeMaterialId;
    if (activeId) {
      const [mat] = await db
        .select({ status: courseMaterialsTable.status })
        .from(courseMaterialsTable)
        .where(and(
          eq(courseMaterialsTable.id, activeId),
          eq(courseMaterialsTable.userId, userId),
        ));
      if (!mat || mat.status !== "ready") activeId = null;
    }
    if (!activeId) {
      const fallbackId = await pickFallbackMaterial();
      if (fallbackId && fallbackId !== row.activeMaterialId) {
        await db
          .update(userSubjectTeachingModesTable)
          .set({ activeMaterialId: fallbackId, updatedAt: new Date() })
          .where(eq(userSubjectTeachingModesTable.id, row.id));
      }
      return res.json({ mode: "professor", activeMaterialId: fallbackId });
    }
    return res.json({ mode: "professor", activeMaterialId: activeId });
  }

  res.json({ mode: row.mode, activeMaterialId: row.activeMaterialId });
});

// ── POST /api/teaching-mode  { subjectId, mode, activeMaterialId? } ───────────
router.post("/teaching-mode", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { subjectId, mode, activeMaterialId } = req.body ?? {};
  if (!subjectId || !["custom", "professor", "unset"].includes(mode)) {
    return res.status(400).json({ error: "subjectId + mode required" });
  }

  // Validate activeMaterialId belongs to this user+subject if provided.
  let validatedActiveId: number | null = null;
  if (activeMaterialId) {
    const [mat] = await db
      .select()
      .from(courseMaterialsTable)
      .where(and(
        eq(courseMaterialsTable.id, Number(activeMaterialId)),
        eq(courseMaterialsTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
      ));
    if (mat) validatedActiveId = mat.id;
  }

  await db
    .insert(userSubjectTeachingModesTable)
    .values({ userId, subjectId, mode, activeMaterialId: validatedActiveId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
      set: { mode, activeMaterialId: validatedActiveId, updatedAt: new Date() },
    });

  res.json({ ok: true, mode, activeMaterialId: validatedActiveId });
});

// ── GET /api/materials?subjectId=... ──────────────────────────────────────────
router.get("/materials", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const subjectId = String(req.query.subjectId ?? "");
  if (!subjectId) return res.status(400).json({ error: "subjectId required" });

  const rows = await db
    .select({
      id: courseMaterialsTable.id,
      fileName: courseMaterialsTable.fileName,
      fileSizeBytes: courseMaterialsTable.fileSizeBytes,
      status: courseMaterialsTable.status,
      errorMessage: courseMaterialsTable.errorMessage,
      pageCount: courseMaterialsTable.pageCount,
      language: courseMaterialsTable.language,
      summary: courseMaterialsTable.summary,
      starters: courseMaterialsTable.starters,
      outline: courseMaterialsTable.outline,
      structuredOutline: courseMaterialsTable.structuredOutline,
      createdAt: courseMaterialsTable.createdAt,
    })
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.userId, userId),
      eq(courseMaterialsTable.subjectId, subjectId),
    ))
    .orderBy(desc(courseMaterialsTable.createdAt));

  // Attach lightweight progress info for each ready material so the UI can
  // render a per-PDF progress bar without an extra round-trip.
  const enriched = await Promise.all(rows.map(async (r) => {
    let progress: {
      chaptersTotal: number;
      completedCount: number;
      currentChapterIndex: number;
      currentChapterTitle: string | null;
      chapters: string[];
      completedChapterIndices: number[];
      skippedChapterIndices: number[];
      coveredPointsByChapter: CoveredPointsMap;
      lastInteractedAt: string | null;
    } | null = null;
    let chapters: StructuredChapter[] = [];
    if (r.status === "ready") {
      const p = await loadProgress(userId, r.id, r.outline ?? "", r.structuredOutline ?? null);
      const covered = await loadCoveredPoints(userId, r.id);
      chapters = safeParseStructuredOutline(r.structuredOutline);
      progress = {
        chaptersTotal: p.chapters.length,
        completedCount: p.completedChapterIndices.length,
        currentChapterIndex: p.currentChapterIndex,
        currentChapterTitle: p.chapters[p.currentChapterIndex] ?? null,
        chapters: p.chapters,
        completedChapterIndices: p.completedChapterIndices,
        skippedChapterIndices: p.skippedChapterIndices,
        coveredPointsByChapter: covered,
        lastInteractedAt: p.lastInteractedAt ? p.lastInteractedAt.toISOString() : null,
      };
    }
    // Strip the heavy outline + structured_outline JSON from the list response.
    // They're available individually via /api/materials/:id when needed.
    const { outline: _omit, structuredOutline: _omit2, ...rest } = r;
    return { ...rest, progress, chapters };
  }));

  res.json({ materials: enriched });
});

// ── GET /api/materials/:id/progress ──────────────────────────────────────────
router.get("/materials/:id/progress", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [mat] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(eq(courseMaterialsTable.id, id), eq(courseMaterialsTable.userId, userId)));
  if (!mat) return res.status(404).json({ error: "Not found" });

  const p = await loadProgress(userId, id, mat.outline ?? "", mat.structuredOutline ?? null);
  res.json({
    materialId: id,
    chapters: p.chapters,
    currentChapterIndex: p.currentChapterIndex,
    completedChapterIndices: p.completedChapterIndices,
    skippedChapterIndices: p.skippedChapterIndices,
  });
});

// ── POST /api/materials/:id/progress  { action, chapterIndex? } ──────────────
//   action: "advance" | "set" | "complete" | "reset"
router.post("/materials/:id/progress", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [mat] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(eq(courseMaterialsTable.id, id), eq(courseMaterialsTable.userId, userId)));
  if (!mat) return res.status(404).json({ error: "Not found" });

  const action = String(req.body?.action ?? "");
  if (!["advance", "set", "complete", "uncomplete", "reset"].includes(action)) {
    return res.status(400).json({ error: "invalid action; expected advance|set|complete|uncomplete|reset" });
  }
  const chapterIndex = Number(req.body?.chapterIndex);
  if ((action === "set" || action === "complete" || action === "uncomplete") && !Number.isInteger(chapterIndex)) {
    return res.status(400).json({ error: "chapterIndex (integer) required for set/complete/uncomplete" });
  }
  const updated = await mutateProgress(userId, id, mat.outline ?? "", action, Number.isFinite(chapterIndex) ? chapterIndex : undefined, mat.structuredOutline ?? null);
  res.json({
    materialId: id,
    chapters: updated.chapters,
    currentChapterIndex: updated.currentChapterIndex,
    completedChapterIndices: updated.completedChapterIndices,
    skippedChapterIndices: updated.skippedChapterIndices,
  });
});

// ── POST /api/materials/upload — server-proxied streaming upload ─────────────
// Replaces the signed-URL flow (sidecar /signed-object-url returns 401 in
// deployment). Streams multer disk temp file → GCS via createWriteStream
// (same SDK auth path used by /objects/* GET, which works in deployment).
const UPLOAD_TMP_DIR = path.join(tmpdir(), "nukhba-uploads");
fsp.mkdir(UPLOAD_TMP_DIR, { recursive: true }).catch(() => {});

const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_TMP_DIR),
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.pdf`),
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

// Quota helper for /materials/upload. Called pre-parse and pre-INSERT.
async function checkUploadQuota(
  userId: number,
  subjectId: string,
): Promise<{ ok: true } | { ok: false; status: number; body: any }> {
  const isPaid = await userHasPaidSubjectSub(userId, subjectId);
  if (isPaid) {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(courseMaterialsTable)
      .where(and(
        eq(courseMaterialsTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
      ));
    if ((cnt ?? 0) >= MAX_PDFS_PER_SUBJECT_PAID) {
      return {
        ok: false,
        status: 409,
        body: { error: "QUOTA_EXCEEDED", limit: MAX_PDFS_PER_SUBJECT_PAID, scope: "subject" },
      };
    }
  } else {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.userId, userId));
    if ((cnt ?? 0) >= MAX_PDFS_FREE_TOTAL) {
      return {
        ok: false,
        status: 409,
        body: { error: "QUOTA_EXCEEDED", limit: MAX_PDFS_FREE_TOTAL, scope: "free_total" },
      };
    }
  }
  return { ok: true };
}

router.post(
  "/materials/upload",
  // Auth + early quota gate before multer reads the body (DoS guard).
  async (req: any, res: any, next: any) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const earlySubjectId = String(req.query?.subjectId ?? req.headers["x-subject-id"] ?? "");
    if (earlySubjectId) {
      const q = await checkUploadQuota(userId, earlySubjectId);
      if (!q.ok) return res.status(q.status).json(q.body);
    }
    next();
  },
  (req: any, res: any, next: any) => {
    uploadMiddleware.single("file")(req, res, (err: any) => {
      if (!err) return next();
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "FILE_TOO_LARGE", maxBytes: MAX_FILE_SIZE_BYTES });
      }
      console.error("[materials/upload] multer error:", err?.message || err);
      return res.status(400).json({ error: "UPLOAD_PARSE_FAILED" });
    });
  },
  async (req: any, res: any): Promise<any> => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const subjectId = String(
      req.body?.subjectId ?? req.query?.subjectId ?? req.headers["x-subject-id"] ?? "",
    );
    const file = req.file as Express.Multer.File | undefined;
    if (!subjectId || !file) {
      return res.status(400).json({ error: "subjectId + file required" });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({ error: "FILE_TOO_LARGE", maxBytes: MAX_FILE_SIZE_BYTES });
    }
    const fileName = String(file.originalname || "").slice(0, 200);
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ error: "INVALID_FILE_TYPE" });
    }

    {
      const q = await checkUploadQuota(userId, subjectId);
      if (!q.ok) return res.status(q.status).json(q.body);
    }

    try {
      // Read the multer temp file into memory. Upper bound is MAX_FILE_SIZE_BYTES
      // (50MB) which is small enough to hold without thrashing on Replit.
      const buf = await fsp.readFile(file.path);

      // Race-window guard before INSERT (concurrent uploads could fill quota).
      {
        const q = await checkUploadQuota(userId, subjectId);
        if (!q.ok) return res.status(q.status).json(q.body);
      }

      // Atomic insert: course_materials row + course_material_blobs row in
      // a single transaction so we never end up with metadata pointing at a
      // missing blob or an orphan blob without metadata.
      const row = await db.transaction(async (tx) => {
        const [m] = await tx
          .insert(courseMaterialsTable)
          .values({
            userId,
            subjectId,
            fileName,
            objectPath: DB_BLOB_MARKER,
            fileSizeBytes: file.size,
            status: "processing",
          })
          .returning();
        await tx.insert(courseMaterialBlobsTable).values({
          materialId: m.id,
          pdfData: buf,
        });
        return m;
      });

      const [existingMode] = await db
        .select()
        .from(userSubjectTeachingModesTable)
        .where(and(
          eq(userSubjectTeachingModesTable.userId, userId),
          eq(userSubjectTeachingModesTable.subjectId, subjectId),
        ));
      if (!existingMode || existingMode.mode === "unset") {
        await db
          .insert(userSubjectTeachingModesTable)
          .values({
            userId,
            subjectId,
            mode: "professor",
            activeMaterialId: existingMode?.activeMaterialId ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
            set: { mode: "professor", updatedAt: new Date() },
          });
      }

      // Kick off async processing — same fire-and-forget pattern as before.
      processMaterial(row.id).catch((e) => {
        console.error("[materials/process] error for", row.id, e?.message || e);
      });

      return res.json({ id: row.id, status: row.status });
    } catch (err: any) {
      console.error("[materials/upload] error:", err?.message || err);
      return res.status(500).json({ error: "UPLOAD_FAILED" });
    } finally {
      // Always remove the multer temp file once we're done with it. Using
      // unlink (not rm) and swallowing ENOENT keeps cleanup quiet when
      // multer didn't actually create a file (e.g. limit hit before write).
      const tmpPath = (req.file as Express.Multer.File | undefined)?.path;
      if (tmpPath) {
        fsp.unlink(tmpPath).catch((e: any) => {
          if (e?.code !== "ENOENT") {
            console.warn("[materials/upload] tmp cleanup failed:", e?.message || e);
          }
        });
      }
    }
  },
);

// ── POST /api/materials/upload-url (alias: /request-upload) ───────────────────
// LEGACY path — kept for one deployment cycle so older client sessions don't
// break, but currently fails in deployment due to the sidecar 401 issue
// described above. New uploads use POST /api/materials/upload instead.
const requestUploadHandler = async (req: any, res: any): Promise<any> => {
  console.warn(
    "[materials/upload-url] DEPRECATED legacy signed-URL upload path used — " +
    "client should switch to POST /api/materials/upload (server-proxy).",
  );
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { subjectId, fileName, fileSizeBytes } = req.body ?? {};
  if (!subjectId || !fileName) return res.status(400).json({ error: "subjectId + fileName required" });
  const sizeNum = Number(fileSizeBytes ?? 0);
  if (sizeNum > MAX_FILE_SIZE_BYTES) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", maxBytes: MAX_FILE_SIZE_BYTES });
  }

  // Quota check: paid subscribers get 4 per subject; otherwise 1 PDF total across all subjects.
  const isPaid = await userHasPaidSubjectSub(userId, subjectId);
  if (isPaid) {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(courseMaterialsTable)
      .where(and(
        eq(courseMaterialsTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
      ));
    if ((cnt ?? 0) >= MAX_PDFS_PER_SUBJECT_PAID) {
      return res.status(409).json({ error: "QUOTA_EXCEEDED", limit: MAX_PDFS_PER_SUBJECT_PAID, scope: "subject" });
    }
  } else {
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.userId, userId));
    if ((cnt ?? 0) >= MAX_PDFS_FREE_TOTAL) {
      return res.status(409).json({ error: "QUOTA_EXCEEDED", limit: MAX_PDFS_FREE_TOTAL, scope: "free_total" });
    }
  }

  try {
    const svc = new ObjectStorageService();
    const uploadUrl = await svc.getObjectEntityUploadURL();
    res.json({ uploadUrl });
  } catch (err: any) {
    console.error("[materials/upload-url] error:", err?.message || err);
    res.status(500).json({ error: "UPLOAD_URL_FAILED" });
  }
};
router.post("/materials/upload-url", requestUploadHandler);
router.post("/materials/request-upload", requestUploadHandler);

// ── POST /api/materials/finalize  { subjectId, fileName, fileSizeBytes, uploadUrl } ──
// LEGACY path — kept for one deployment cycle. New uploads use the
// server-proxy POST /api/materials/upload endpoint instead.
router.post("/materials/finalize", async (req, res): Promise<any> => {
  console.warn(
    "[materials/finalize] DEPRECATED legacy finalize path used — " +
    "client should switch to POST /api/materials/upload (server-proxy).",
  );
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { subjectId, fileName, fileSizeBytes, uploadUrl } = req.body ?? {};
  if (!subjectId || !fileName || !uploadUrl) {
    return res.status(400).json({ error: "subjectId + fileName + uploadUrl required" });
  }

  try {
    // Re-check quota at finalize time to close the parallel-upload race window.
    const isPaidNow = await userHasPaidSubjectSub(userId, String(subjectId));
    if (isPaidNow) {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(courseMaterialsTable)
        .where(and(
          eq(courseMaterialsTable.userId, userId),
          eq(courseMaterialsTable.subjectId, String(subjectId)),
        ));
      if ((cnt ?? 0) >= MAX_PDFS_PER_SUBJECT_PAID) {
        return res.status(409).json({ error: "QUOTA_EXCEEDED", limit: MAX_PDFS_PER_SUBJECT_PAID, scope: "subject" });
      }
    } else {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(courseMaterialsTable)
        .where(eq(courseMaterialsTable.userId, userId));
      if ((cnt ?? 0) >= MAX_PDFS_FREE_TOTAL) {
        return res.status(409).json({ error: "QUOTA_EXCEEDED", limit: MAX_PDFS_FREE_TOTAL, scope: "free_total" });
      }
    }

    const svc = new ObjectStorageService();
    const objectPath = await svc.trySetObjectEntityAclPolicy(String(uploadUrl), {
      owner: String(userId),
      visibility: "private",
    });

    const safeName = String(fileName).slice(0, 200);
    const sizeNum = Math.min(Number(fileSizeBytes ?? 0), MAX_FILE_SIZE_BYTES);

    const [row] = await db
      .insert(courseMaterialsTable)
      .values({
        userId,
        subjectId: String(subjectId),
        fileName: safeName,
        objectPath,
        fileSizeBytes: sizeNum,
        status: "processing",
      })
      .returning();

    // Switch the subject into "professor" mode if the student hasn't picked
    // anything yet — but DO NOT mark this still-processing material as active.
    // If extraction fails, an errored material would stay flagged "نشط" even
    // though it has no usable text. We promote it to active only after
    // processMaterial confirms status='ready' (see end of processMaterial).
    const [existingMode] = await db
      .select()
      .from(userSubjectTeachingModesTable)
      .where(and(
        eq(userSubjectTeachingModesTable.userId, userId),
        eq(userSubjectTeachingModesTable.subjectId, String(subjectId)),
      ));
    if (!existingMode || existingMode.mode === "unset") {
      await db
        .insert(userSubjectTeachingModesTable)
        .values({ userId, subjectId: String(subjectId), mode: "professor", activeMaterialId: existingMode?.activeMaterialId ?? null, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
          set: { mode: "professor", updatedAt: new Date() },
        });
    }

    // Fire-and-forget processing
    processMaterial(row.id).catch((e) => {
      console.error("[materials/process] error for", row.id, e?.message || e);
    });

    res.json({ id: row.id, status: row.status });
  } catch (err: any) {
    console.error("[materials/finalize] error:", err?.message || err);
    res.status(500).json({ error: "FINALIZE_FAILED" });
  }
});

// ── GET /api/materials/:id  (status + metadata for polling) ───────────────────
router.get("/materials/:id", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [row] = await db
    .select({
      id: courseMaterialsTable.id,
      fileName: courseMaterialsTable.fileName,
      status: courseMaterialsTable.status,
      errorMessage: courseMaterialsTable.errorMessage,
      pageCount: courseMaterialsTable.pageCount,
      language: courseMaterialsTable.language,
      summary: courseMaterialsTable.summary,
      starters: courseMaterialsTable.starters,
      outline: courseMaterialsTable.outline,
      structuredOutline: courseMaterialsTable.structuredOutline,
      createdAt: courseMaterialsTable.createdAt,
    })
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.id, id),
      eq(courseMaterialsTable.userId, userId),
    ));
  if (!row) return res.status(404).json({ error: "Not found" });
  const recentWeakAreas = await getRecentWeakAreasForMaterial(userId, id);
  const chapters = safeParseStructuredOutline(row.structuredOutline);
  const coveredPointsByChapter = await loadCoveredPoints(userId, id);
  res.json({ ...row, chapters, coveredPointsByChapter, recentWeakAreas });
});

// ── POST /api/materials/:id/reprocess ──────────────────────────────────────
// Re-runs the structured-outline generation pipeline against the existing
// per-page chunks. Useful for materials that were uploaded before the
// structured-outline feature shipped, or when the outline came out poor.
// Does NOT re-download or re-extract the PDF — that work is preserved.
router.post("/materials/:id/reprocess", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [row] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(eq(courseMaterialsTable.id, id), eq(courseMaterialsTable.userId, userId)));
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.status !== "ready") return res.status(409).json({ error: "MATERIAL_NOT_READY" });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "GEMINI_UNAVAILABLE" });

  // Pull all chunks back as a Map<page, joined_text> so the structured
  // generator gets the same per-page text it would during initial processing.
  const chunkRows = await db
    .select({
      pageNumber: materialChunksTable.pageNumber,
      chunkIndex: materialChunksTable.chunkIndex,
      content: materialChunksTable.content,
    })
    .from(materialChunksTable)
    .where(eq(materialChunksTable.materialId, id))
    .orderBy(materialChunksTable.pageNumber, materialChunksTable.chunkIndex);
  const pageTexts = new Map<number, string>();
  for (const c of chunkRows) {
    const prev = pageTexts.get(c.pageNumber) ?? "";
    pageTexts.set(c.pageNumber, prev ? `${prev}\n${c.content}` : c.content);
  }
  if (pageTexts.size === 0) return res.status(409).json({ error: "NO_CHUNKS_AVAILABLE" });

  try {
    const structured = await generateStructuredChapters(
      pageTexts,
      row.fileName,
      row.language ?? "ar",
      row.pageCount ?? pageTexts.size,
      { userId, subjectId: row.subjectId, materialId: id },
    );
    if (structured.length === 0) {
      return res.status(502).json({ error: "OUTLINE_GENERATION_RETURNED_EMPTY" });
    }
    const derivedOutline = structured
      .map((c) => `- ${c.title}${c.startPage && c.endPage ? ` (صفحات ${c.startPage}–${c.endPage})` : ""}`)
      .join("\n");
    await db
      .update(courseMaterialsTable)
      .set({
        structuredOutline: JSON.stringify(structured),
        outline: derivedOutline,
        updatedAt: new Date(),
      })
      .where(eq(courseMaterialsTable.id, id));
    // Full progress reset: the new structure has different chapter indices, so
    // any stored completed/skipped/current values are no longer meaningful and
    // would mis-report state if we kept them. The next loadProgress() call
    // will rehydrate `chapters` from the new structuredOutline.
    await db
      .update(materialChapterProgressTable)
      .set({
        chapters: "[]",
        currentChapterIndex: 0,
        completedChapterIndices: "[]",
        skippedChapterIndices: "[]",
        coveredPoints: "{}",
        lastInteractedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(materialChapterProgressTable.userId, userId),
        eq(materialChapterProgressTable.materialId, id),
      ));
    res.json({ ok: true, chapterCount: structured.length });
  } catch (e: any) {
    console.error("[materials/reprocess] error:", e?.message || e);
    res.status(500).json({ error: "REPROCESS_FAILED" });
  }
});

// ── DELETE /api/materials/:id ─────────────────────────────────────────────────
router.delete("/materials/:id", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [row] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.id, id),
      eq(courseMaterialsTable.userId, userId),
    ));
  if (!row) return res.status(404).json({ error: "Not found" });

  // Best-effort delete from Object Storage for legacy rows. Rows with the
  // DB_BLOB_MARKER objectPath have their bytes in course_material_blobs and
  // are dropped automatically by the FK CASCADE when the parent row is deleted.
  if (row.objectPath !== DB_BLOB_MARKER) {
    try {
      const svc = new ObjectStorageService();
      const file = await svc.getObjectEntityFile(row.objectPath);
      await file.delete({ ignoreNotFound: true });
    } catch (e) {
      // Continue — DB cleanup is more important
    }
  }

  // If this was the active material, clear it
  await db
    .update(userSubjectTeachingModesTable)
    .set({ activeMaterialId: null, updatedAt: new Date() })
    .where(and(
      eq(userSubjectTeachingModesTable.userId, userId),
      eq(userSubjectTeachingModesTable.subjectId, row.subjectId),
      eq(userSubjectTeachingModesTable.activeMaterialId, id),
    ));

  // Drop any chapter-progress rows for this material so we don't leave orphans.
  await db
    .delete(materialChapterProgressTable)
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, id),
    ));

  // Drop the per-page retrieval chunks too — otherwise they pile up forever.
  await db
    .delete(materialChunksTable)
    .where(eq(materialChunksTable.materialId, id));

  await db.delete(courseMaterialsTable).where(eq(courseMaterialsTable.id, id));
  res.json({ ok: true });
});

// ── GET /api/materials/:id/file  (proxy stream — never exposes signed URL) ────
router.get("/materials/:id/file", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });

  const [row] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.id, id),
      eq(courseMaterialsTable.userId, userId),
    ));
  if (!row) return res.status(404).json({ error: "Not found" });

  try {
    if (row.objectPath === DB_BLOB_MARKER) {
      const [blob] = await db
        .select()
        .from(courseMaterialBlobsTable)
        .where(eq(courseMaterialBlobsTable.materialId, row.id));
      if (!blob) return res.status(404).json({ error: "Not found" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "private, max-age=600");
      res.setHeader("Content-Length", String(blob.pdfData.length));
      return res.end(blob.pdfData);
    }
    const svc = new ObjectStorageService();
    const file = await svc.getObjectEntityFile(row.objectPath);
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", (metadata.contentType as string) || "application/pdf");
    res.setHeader("Cache-Control", "private, max-age=600");
    if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
    file.createReadStream().pipe(res);
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) return res.status(404).json({ error: "Not found" });
    console.error("[materials/file] error:", e?.message || e);
    res.status(500).json({ error: "FETCH_FAILED" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Background processor: extract text → optional OCR → outline + summary + starters
// ─────────────────────────────────────────────────────────────────────────────
async function processMaterial(materialId: number) {
  const [row] = await db.select().from(courseMaterialsTable).where(eq(courseMaterialsTable.id, materialId));
  if (!row) return;
  const __ctx: AiUsageCtx = { userId: row.userId, subjectId: row.subjectId, materialId };

  let extractedText = "";
  let pageCount = 0;
  let language = "ar";
  let detectedError: string | null = null;
  let detectedWarning: string | null = null;
  // Per-page text collected during extraction. Index = page number (1-based).
  const pageTexts: Map<number, string> = new Map();

  try {
    // Load the PDF bytes — from course_material_blobs for new uploads, or
    // from Object Storage for legacy rows that were uploaded via signed URL.
    const buf = await loadMaterialBuffer(row);

    // 1) Native text extraction via unpdf — works for digital PDFs without
    //    needing OCR. Returns per-page text so downstream chunking can cite
    //    real page numbers. Encrypted files surface as a hard error here.
    {
      const extracted = await extractPdfTextPerPage(buf);
      if (extracted.encrypted) {
        detectedError = "هذا الملف محمي بكلمة مرور. يرجى إزالة الحماية ثم رفعه مجدداً.";
      }
      pageCount = extracted.totalPages;
      for (const [n, t] of extracted.pages.entries()) pageTexts.set(n, t);
      extractedText = Array.from(extracted.pages.values()).join("\n\n").trim();
    }

    if (!detectedError && pageCount > MAX_PAGE_COUNT) {
      detectedError = `هذا الملف يحوي ${pageCount} صفحة، والحد الأقصى ${MAX_PAGE_COUNT} صفحة. قسّم الملف إلى أجزاء أصغر.`;
    }

    // Decide whether to fall back to OCR. Many slide-deck PDFs return short
    // pseudo-text from native extraction but actually need OCR to be readable.
    // Heuristic combines three signals so we don't OCR a perfectly fine short
    // digital PDF (e.g. a 3-page memo):
    //   * page coverage ratio — fraction of pages that produced *any* text;
    //     a healthy digital PDF should be ≥ 60%.
    //   * total length and avg per page — old size signals.
    // A digital PDF with high coverage but a low total (e.g. a one-pager)
    // will pass without OCR.
    const avgPerPage = pageCount > 0 ? extractedText.length / pageCount : 0;
    const nonEmptyPages = Array.from(pageTexts.values()).filter((t) => t.trim().length >= 20).length;
    const coverageRatio = pageCount > 0 ? nonEmptyPages / pageCount : 0;
    const looksScanned = !detectedError && (
      pageTexts.size === 0 ||
      coverageRatio < 0.6 ||
      (extractedText.length < 200 && coverageRatio < 0.8) ||
      (pageCount > 0 && avgPerPage < 80)
    );

    // 2) Fallback: chunked multi-provider OCR. The chunker handles provider
    //    fallback internally and reports how many chunks survived so we can
    //    surface a soft warning instead of failing the whole file.
    let ocrSuccessRatio = 1;     // default 1 == no OCR ran
    let ocrTextWasAdopted = false;
    let ocrTotalChunks = 0;
    let ocrSuccessfulChunks = 0;
    let ocrFailedRanges: Array<[number, number]> = [];
    if (looksScanned) {
      let ocr: OcrResult = { text: "", totalChunks: 0, successfulChunks: 0, placeholders: "", failedRanges: [] };
      try {
        ocr = await ocrPdfWithGemini(buf, pageCount || 0, __ctx);
      } catch (e: any) {
        console.warn(`[materials/process] OCR threw:`, e?.message || e);
      }
      ocrTotalChunks = ocr.totalChunks;
      ocrSuccessfulChunks = ocr.successfulChunks;
      ocrFailedRanges = ocr.failedRanges;
      // Adopt OCR output whenever AT LEAST ONE chunk succeeded — even short
      // OCR (e.g. a single 4-page chunk under 200 chars) is more useful than
      // an empty native-text result. Only refuse to adopt when native pdf
      // text is already strictly longer (and therefore the OCR would be a
      // regression).
      if (ocr.successfulChunks > 0 && ocr.text.length > extractedText.length) {
        extractedText = ocr.text;
        ocrTextWasAdopted = true;
        const ocrPages = splitOcrTextIntoPages(extractedText);
        if (ocrPages.size > 0) {
          pageTexts.clear();
          for (const [n, t] of ocrPages.entries()) pageTexts.set(n, t);
          if (!pageCount || pageCount < pageTexts.size) pageCount = pageTexts.size;
        }
      }
      if (ocr.totalChunks > 0) {
        ocrSuccessRatio = ocr.successfulChunks / ocr.totalChunks;
      }
    }

    // Soft quality gate: only fail the whole file when we have *zero* usable
    // text. Partial OCR success is still useful — we save what we got, mark
    // the file as ready, and store a soft warning so the user knows some
    // pages couldn't be read but they can still ask questions about the rest.
    const hasAnyUsableText = extractedText.trim().length >= 50 || pageTexts.size > 0;
    if (!detectedError && !hasAnyUsableText) {
      detectedError = "تعذّر استخراج أي نص من هذا الملف. حاول رفع نسخة أوضح أو غير ممسوحة ضوئياً.";
    }
    // Surface partial-OCR warnings whenever some chunks failed, regardless of
    // whether the OCR text was "adopted" by the length heuristic. The user
    // still benefits from knowing which pages we couldn't read.
    if (!detectedError && ocrTotalChunks > 0 && ocrSuccessfulChunks < ocrTotalChunks && ocrFailedRanges.length > 0) {
      const rangeText = ocrFailedRanges
        .map(([s, e]) => (s === e ? `${s}` : `${s}–${e}`))
        .join("، ");
      detectedWarning = `بعض الصفحات لم نتمكن من قراءتها: ${rangeText}. يمكنك استخدام بقية الملف بشكل طبيعي، أو إعادة رفع نسخة أوضح لتلك الصفحات.`;
    }

    // Detect language from a sample
    if (extractedText) {
      const sample = extractedText.slice(0, 2000);
      const arChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
      language = arChars > sample.length * 0.15 ? "ar" : "en";
    }

    // Truncate to keep prompts manageable
    if (extractedText.length > MAX_EXTRACTED_CHARS) {
      extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARS) + "\n\n[...النص مقتطع لحدود السياق...]";
    }
  } catch (e: any) {
    console.error("[materials/process] download error:", e?.message || e);
    detectedError = "تعذّر قراءة الملف من التخزين.";
  }

  // 3) Generate outline + summary + starters via Gemini
  let outline = "";
  let summary = "";
  let starters = "";

  if (extractedText && process.env.GEMINI_API_KEY) {
    try {
      const meta = await generateMaterialMetadata(extractedText, row.fileName, language, __ctx);
      outline = meta.outline;
      summary = meta.summary;
      starters = meta.starters;
    } catch (e: any) {
      console.warn("[materials/process] metadata gen failed:", e?.message || e);
    }
  }

  await db
    .update(courseMaterialsTable)
    .set({
      status: detectedError ? "error" : "ready",
      errorMessage: detectedError ?? detectedWarning,
      pageCount,
      language,
      extractedText: extractedText || null,
      outline: outline || null,
      summary: summary || null,
      starters: starters || null,
      updatedAt: new Date(),
    })
    .where(eq(courseMaterialsTable.id, materialId));

  // 4) Persist per-page chunks for retrieval-based citation answers.
  if (!detectedError && pageTexts.size > 0) {
    try {
      await db.delete(materialChunksTable).where(eq(materialChunksTable.materialId, materialId));
      const records: { materialId: number; userId: number; subjectId: string; pageNumber: number; chunkIndex: number; content: string }[] = [];
      for (const [page, text] of Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0])) {
        const slices = sliceLongPage(text, 2000);
        slices.forEach((slice, idx) => {
          if (slice.trim().length === 0) return;
          records.push({
            materialId,
            userId: row.userId,
            subjectId: row.subjectId,
            pageNumber: page,
            chunkIndex: idx,
            content: slice,
          });
        });
      }
      // Insert in batches to keep the parameter count safe.
      const BATCH = 200;
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        if (batch.length > 0) await db.insert(materialChunksTable).values(batch);
      }
    } catch (e: any) {
      console.warn("[materials/process] chunk persist failed:", e?.message || e);
    }
  }

  // 5) Build the STRUCTURED outline (chapters → key points) so the teacher
  //    can cover every point without skipping any. This runs after chunks are
  //    persisted because it relies on the same per-page text. We only do this
  //    when extraction succeeded and we have meaningful page text — otherwise
  //    the model would fabricate chapters from nothing.
  if (!detectedError && pageTexts.size > 0 && process.env.GEMINI_API_KEY) {
    try {
      const structured = await generateStructuredChapters(pageTexts, row.fileName, language, pageCount, __ctx);
      if (structured.length > 0) {
        // Derive a simple text outline from chapter titles so legacy code
        // paths (parseChaptersFromOutline / loadProgress) keep working.
        const derivedOutline = structured
          .map((c, i) => `- ${c.title}${c.startPage && c.endPage ? ` (صفحات ${c.startPage}–${c.endPage})` : ""}`)
          .join("\n");
        await db
          .update(courseMaterialsTable)
          .set({
            structuredOutline: JSON.stringify(structured),
            outline: derivedOutline,
            updatedAt: new Date(),
          })
          .where(eq(courseMaterialsTable.id, materialId));
      }
    } catch (e: any) {
      console.warn("[materials/process] structured outline failed:", e?.message || e);
    }
  }

  // ── Sync teaching-mode pointer with the result of this run ──
  // SUCCESS: if the subject is in professor mode but has no active material yet
  //   (because finalize deferred activation), promote this one now.
  // FAILURE: if this material was somehow already flagged active, clear it so
  //   the UI doesn't show "نشط" on a broken file. The next ready material —
  //   or the GET endpoint's fallback — will take over.
  try {
    const [modeRow] = await db
      .select()
      .from(userSubjectTeachingModesTable)
      .where(and(
        eq(userSubjectTeachingModesTable.userId, row.userId),
        eq(userSubjectTeachingModesTable.subjectId, row.subjectId),
      ));
    if (!detectedError) {
      if (!modeRow) {
        await db.insert(userSubjectTeachingModesTable).values({
          userId: row.userId,
          subjectId: row.subjectId,
          mode: "professor",
          activeMaterialId: materialId,
          updatedAt: new Date(),
        });
      } else if (modeRow.mode === "unset") {
        // Only promote unset → professor. We deliberately do NOT touch
        // custom-mode rows here even if they have no activeMaterialId — a
        // student who picked "custom" can still upload PDFs as reference
        // material without us silently flipping them to professor mode.
        await db
          .update(userSubjectTeachingModesTable)
          .set({ mode: "professor", activeMaterialId: materialId, updatedAt: new Date() })
          .where(eq(userSubjectTeachingModesTable.id, modeRow.id));
      } else if (modeRow.mode === "professor" && !modeRow.activeMaterialId) {
        // Already professor but with no pointer (e.g. previous active was
        // deleted) — safe to point at this fresh ready material.
        await db
          .update(userSubjectTeachingModesTable)
          .set({ activeMaterialId: materialId, updatedAt: new Date() })
          .where(eq(userSubjectTeachingModesTable.id, modeRow.id));
      } else if (modeRow.mode === "professor" && modeRow.activeMaterialId) {
        // If the previously-active material is itself errored, swap to this fresh ready one.
        const [prev] = await db
          .select({ status: courseMaterialsTable.status })
          .from(courseMaterialsTable)
          .where(eq(courseMaterialsTable.id, modeRow.activeMaterialId));
        if (!prev || prev.status !== "ready") {
          await db
            .update(userSubjectTeachingModesTable)
            .set({ activeMaterialId: materialId, updatedAt: new Date() })
            .where(eq(userSubjectTeachingModesTable.id, modeRow.id));
        }
      }
    } else if (modeRow && modeRow.activeMaterialId === materialId) {
      await db
        .update(userSubjectTeachingModesTable)
        .set({ activeMaterialId: null, updatedAt: new Date() })
        .where(eq(userSubjectTeachingModesTable.id, modeRow.id));
    }
  } catch (e: any) {
    console.warn("[materials/process] mode sync failed:", e?.message || e);
  }
}

// Split a single page's text into smaller slices when it is unusually long.
function sliceLongPage(text: string, maxChars: number): string[] {
  const t = text.trim();
  if (t.length <= maxChars) return [t];
  const out: string[] = [];
  // Prefer splitting on paragraph/sentence boundaries.
  const paragraphs = t.split(/\n\s*\n/);
  let cur = "";
  for (const p of paragraphs) {
    if ((cur + "\n\n" + p).length > maxChars && cur) {
      out.push(cur.trim());
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  // Hard-cut anything that's still too large.
  const final: string[] = [];
  for (const s of out) {
    if (s.length <= maxChars) { final.push(s); continue; }
    for (let i = 0; i < s.length; i += maxChars) final.push(s.slice(i, i + maxChars));
  }
  return final;
}

function splitOcrTextIntoPages(ocrText: string): Map<number, string> {
  const map = new Map<number, string>();
  // Match both Arabic ("--- صفحة N ---") and English ("--- Page N ---") markers.
  const re = /---\s*(?:صفحة|Page|page)\s*(\d+)\s*---/g;
  let lastIdx = 0;
  let lastPage: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ocrText)) !== null) {
    if (lastPage !== null) {
      const slice = ocrText.slice(lastIdx, m.index).trim();
      if (slice) map.set(lastPage, slice);
    }
    lastPage = parseInt(m[1], 10);
    lastIdx = re.lastIndex;
  }
  if (lastPage !== null) {
    const slice = ocrText.slice(lastIdx).trim();
    if (slice) map.set(lastPage, slice);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search helper: retrieve the most relevant per-page chunks for a query.
// Uses Postgres full-text search with the 'simple' configuration (works for
// both Arabic and English since 'simple' just lowercases without stemming),
// and falls back to ILIKE keyword matching when FTS finds nothing.
// ─────────────────────────────────────────────────────────────────────────────
export type RetrievedChunk = {
  pageNumber: number;
  chunkIndex: number;
  content: string;
  score: number;
};

export async function searchMaterialChunks(
  materialId: number,
  query: string,
  limit = 6,
): Promise<RetrievedChunk[]> {
  const q = (query || "").trim();
  if (!q) return [];
  // Strip control chars and limit length defensively.
  const cleaned = q.replace(/[\u0000-\u001F]/g, " ").slice(0, 500);

  // Build a tsquery-friendly OR query of significant tokens (>=2 chars,
  // letters/digits in any unicode script).
  const tokens = Array.from(new Set(
    cleaned
      .split(/[^\p{L}\p{N}]+/u)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2),
  )).slice(0, 12);

  if (tokens.length === 0) return [];

  // FTS pass — rank by ts_rank.
  const tsQueryStr = tokens.map((t) => t.replace(/['\\]/g, "")).filter(Boolean).join(" | ");
  let rows: { pageNumber: number; chunkIndex: number; content: string; score: number }[] = [];
  if (tsQueryStr) {
    try {
      const result = await db.execute(sql`
        SELECT page_number AS "pageNumber",
               chunk_index AS "chunkIndex",
               content,
               ts_rank(to_tsvector('simple', content), to_tsquery('simple', ${tsQueryStr}))::float AS score
        FROM material_chunks
        WHERE material_id = ${materialId}
          AND to_tsvector('simple', content) @@ to_tsquery('simple', ${tsQueryStr})
        ORDER BY score DESC, page_number ASC
        LIMIT ${limit}
      `);
      rows = (result.rows as any[]).map((r) => ({
        pageNumber: Number(r.pageNumber ?? r.page_number),
        chunkIndex: Number(r.chunkIndex ?? r.chunk_index),
        content: String(r.content ?? ""),
        score: Number(r.score ?? 0),
      }));
    } catch (e: any) {
      console.warn("[searchMaterialChunks] FTS failed:", e?.message || e);
    }
  }

  // Fallback: ILIKE on raw tokens, score by number of matching tokens.
  if (rows.length === 0) {
    try {
      const likeClauses = tokens.map((t) => `%${t.replace(/[%_\\]/g, " ")}%`);
      const result = await db.execute(sql`
        SELECT page_number AS "pageNumber",
               chunk_index AS "chunkIndex",
               content,
               (${sql.join(likeClauses.map((p) => sql`(CASE WHEN content ILIKE ${p} THEN 1 ELSE 0 END)`), sql` + `)})::float AS score
        FROM material_chunks
        WHERE material_id = ${materialId}
          AND (${sql.join(likeClauses.map((p) => sql`content ILIKE ${p}`), sql` OR `)})
        ORDER BY score DESC, page_number ASC
        LIMIT ${limit}
      `);
      rows = (result.rows as any[]).map((r) => ({
        pageNumber: Number(r.pageNumber ?? r.page_number),
        chunkIndex: Number(r.chunkIndex ?? r.chunk_index),
        content: String(r.content ?? ""),
        score: Number(r.score ?? 0),
      }));
    } catch (e: any) {
      console.warn("[searchMaterialChunks] ILIKE failed:", e?.message || e);
    }
  }

  return rows;
}

// Fetch the first N pages verbatim — used as a fallback for "open the file"
// type prompts (greetings, "ابدأ التدريس") where the user hasn't asked a
// specific question we can search on.
export async function getMaterialOpeningPages(materialId: number, pages = 3): Promise<RetrievedChunk[]> {
  const result = await db.execute(sql`
    SELECT page_number AS "pageNumber",
           chunk_index AS "chunkIndex",
           content
    FROM material_chunks
    WHERE material_id = ${materialId}
    ORDER BY page_number ASC, chunk_index ASC
    LIMIT ${pages * 2}
  `);
  return (result.rows as any[]).map((r) => ({
    pageNumber: Number(r.pageNumber ?? r.page_number),
    chunkIndex: Number(r.chunkIndex ?? r.chunk_index),
    content: String(r.content ?? ""),
    score: 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Native PDF text extraction (pre-OCR).
//
// We use `unpdf`, a serverless-friendly wrapper around the legacy pdfjs-dist
// build that does not require browser globals like `DOMMatrix`. The previous
// `pdf-parse` v2 dependency threw `DOMMatrix is not defined` in production and
// forced every PDF — even clean digital ones — into the slow OCR fallback.
// ─────────────────────────────────────────────────────────────────────────────
async function extractPdfTextPerPage(buf: Buffer): Promise<{
  pages: Map<number, string>;
  totalPages: number;
  encrypted: boolean;
  error?: string;
}> {
  const pages = new Map<number, string>();
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    // mergePages:false returns text as Array<string>, one entry per page.
    const result = await extractText(pdf, { mergePages: false });
    const totalPages = result?.totalPages || (Array.isArray(result?.text) ? result.text.length : 0);
    const arr: string[] = Array.isArray(result?.text) ? result.text : [String(result?.text || "")];
    arr.forEach((t, idx) => {
      const trimmed = (t || "").replace(/[ \t]+/g, " ").trim();
      if (trimmed) pages.set(idx + 1, trimmed);
    });
    return { pages, totalPages, encrypted: false };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const encrypted = /encrypt|password/i.test(msg);
    console.warn("[pdf-extract] unpdf failed:", msg);
    return { pages, totalPages: 0, encrypted, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider OCR chain.
//
// Each chunk attempts providers in order until one returns usable text. A
// provider that returns 429/503 is skipped for a cooldown window so we stop
// hammering the same rate limit. Chain order:
//   1. Gemini Flash  — cheap & fast, but easily rate-limited on the free key
//   2. Gemini Pro    — different model = separate quota path
//   3. Anthropic Claude — via Replit AI Integrations proxy (no user quota)
// ─────────────────────────────────────────────────────────────────────────────
type OcrProviderName = "gemini-flash" | "gemini-pro" | "claude";

type OcrProviderResult =
  | { ok: true; text: string }
  | { ok: false; status: "rate_limited" | "transient" | "fatal"; cooldownMs?: number; reason: string };

const PROVIDER_COOLDOWN_DEFAULT_MS = 30_000;
const PROVIDER_COOLDOWN_MAX_MS = 5 * 60_000;
const providerCooldownUntil = new Map<OcrProviderName, number>();

function isProviderAvailable(p: OcrProviderName): boolean {
  const until = providerCooldownUntil.get(p) || 0;
  return Date.now() >= until;
}

function setProviderCooldown(p: OcrProviderName, ms: number): void {
  const until = Date.now() + Math.min(Math.max(ms, 1000), PROVIDER_COOLDOWN_MAX_MS);
  providerCooldownUntil.set(p, until);
  console.warn(`[ocr] cooldown ${p} for ${Math.round((until - Date.now()) / 1000)}s`);
}

// Parse a Retry-After header value per RFC 7231: either an integer "delay-
// seconds" or an HTTP-date. Returns the delay in milliseconds, or null when
// the header is missing/unparseable.
function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

const OCR_PROMPT = `استخرج النص الكامل من هذا المستند صفحة بصفحة. ابدأ كل صفحة بسطر "--- صفحة X ---".
لا تُلخّص ولا تُعدّل، انسخ النص العربي والإنجليزي حرفياً.`;

// Gemini provider — single REST call, returns provider result with rate-limit
// metadata so the chain can switch providers cleanly instead of blind retries.
async function ocrChunkGemini(model: "gemini-2.5-flash" | "gemini-2.5-pro", chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<OcrProviderResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, status: "fatal", reason: "no_api_key" };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: chunkBuf.toString("base64") } },
        { text: OCR_PROMPT },
      ],
    }],
    generationConfig: { temperature: 0.0, maxOutputTokens: 8192 },
  };
  const __aiStart = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (r.status === 429 || r.status === 503) {
      const cooldownMs = parseRetryAfterMs(r.headers.get("retry-after")) ?? PROVIDER_COOLDOWN_DEFAULT_MS;
      console.warn(`[ocr] ${label} ${model} ${r.status} → cooldown ${cooldownMs}ms`);
      return { ok: false, status: "rate_limited", cooldownMs, reason: `http_${r.status}` };
    }
    if (!r.ok) {
      const body = (await r.text()).slice(0, 200);
      console.warn(`[ocr] ${label} ${model} http`, r.status, body);
      // 4xx (other than 429) means we sent something the provider can't or
      // won't accept — invalid key (401/403), bad request (400), oversized
      // payload (413). Retrying won't help, so mark fatal to fall through
      // to the next provider quickly instead of waiting 65s for backoff.
      if (r.status >= 400 && r.status < 500) {
        return { ok: false, status: "fatal", reason: `http_${r.status}` };
      }
      return { ok: false, status: "transient", reason: `http_${r.status}` };
    }
    const data: any = await r.json();
    {
      const __u = extractGeminiUsage(data?.usageMetadata);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/ocr",
        provider: "gemini",
        model,
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId ? { materialId: ctx.materialId, label } : { label },
      });
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p?.text || "").join("\n").trim();
    if (text.length === 0) return { ok: false, status: "transient", reason: "empty_response" };
    return { ok: true, text };
  } catch (e: any) {
    console.warn(`[ocr] ${label} ${model} threw:`, e?.message || e);
    return { ok: false, status: "transient", reason: String(e?.message || e).slice(0, 100) };
  }
}

// Anthropic Claude provider — uses native PDF input via Replit AI Integrations
// proxy, so it does not consume the user's own GEMINI_API_KEY quota.
async function ocrChunkClaude(chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<OcrProviderResult> {
  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    return { ok: false, status: "fatal", reason: "anthropic_not_configured" };
  }
  const __aiStart = Date.now();
  try {
    const { anthropic } = await import("@workspace/integrations-anthropic-ai");
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: chunkBuf.toString("base64"),
            },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      }],
    });
    {
      const __u = extractAnthropicUsage(msg);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/ocr",
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId ? { materialId: ctx.materialId, label } : { label },
      });
    }
    const text = msg.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n")
      .trim();
    if (text.length === 0) return { ok: false, status: "transient", reason: "empty_response" };
    return { ok: true, text };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = e?.status;
    if (status === 429 || status === 529 || /rate.?limit|overloaded/i.test(msg)) {
      console.warn(`[ocr] ${label} claude rate-limited:`, msg.slice(0, 150));
      return { ok: false, status: "rate_limited", cooldownMs: PROVIDER_COOLDOWN_DEFAULT_MS, reason: "rate_limited" };
    }
    console.warn(`[ocr] ${label} claude threw:`, msg.slice(0, 200));
    return { ok: false, status: "transient", reason: msg.slice(0, 100) };
  }
}

// Per-provider transient-failure retry schedule. We retry only on "transient"
// errors (network blips, empty responses, 5xx) — never on "rate_limited"
// (those skip straight to the next provider with the cooldown set) and never
// on "fatal" (e.g. missing credentials).
const TRANSIENT_RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

// Run a chunk through the provider chain. Returns the first successful text,
// or "" if every provider failed. Each provider gets exponential-backoff
// retries on transient errors before we fall through to the next provider.
// Rate-limited providers respect Retry-After (via setProviderCooldown) and
// are skipped immediately so we don't burn time hammering the same 429.
async function ocrPdfChunk(chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<string> {
  const chain: Array<{ name: OcrProviderName; run: () => Promise<OcrProviderResult> }> = [
    { name: "gemini-flash", run: () => ocrChunkGemini("gemini-2.5-flash", chunkBuf, label, ctx) },
    { name: "gemini-pro", run: () => ocrChunkGemini("gemini-2.5-pro", chunkBuf, label, ctx) },
    { name: "claude", run: () => ocrChunkClaude(chunkBuf, label, ctx) },
  ];

  for (const provider of chain) {
    if (!isProviderAvailable(provider.name)) {
      console.info(`[ocr] ${label} skip ${provider.name} (in cooldown)`);
      continue;
    }

    // Up to TRANSIENT_RETRY_DELAYS_MS.length + 1 attempts per provider:
    // 1 initial + N retries on "transient" failures with growing backoff.
    let attempt = 0;
    let lastResult: OcrProviderResult | null = null;
    while (attempt <= TRANSIENT_RETRY_DELAYS_MS.length) {
      const result = await provider.run();
      lastResult = result;
      if (result.ok) {
        console.info(`[ocr] ${label} ok via ${provider.name} (${result.text.length} chars, attempt ${attempt + 1})`);
        return result.text;
      }
      if (result.status === "rate_limited") {
        // Retry-After takes precedence: skip to next provider and park this
        // one for the requested cooldown. No backoff retry on the same provider.
        if (result.cooldownMs) setProviderCooldown(provider.name, result.cooldownMs);
        break;
      }
      if (result.status === "fatal") {
        // Cool down fatal providers (e.g. missing API key) for the rest of the
        // run so we don't pay latency to rediscover they're unconfigured.
        setProviderCooldown(provider.name, PROVIDER_COOLDOWN_MAX_MS);
        break;
      }
      // status === "transient": back off and retry the same provider.
      const delay = TRANSIENT_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break; // exhausted retries → fall to next provider
      console.warn(`[ocr] ${label} ${provider.name} transient (${result.reason}); retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
    if (lastResult && !lastResult.ok) {
      console.warn(`[ocr] ${label} ${provider.name} exhausted (${lastResult.status}: ${lastResult.reason})`);
    }
  }
  return "";
}

const OCR_CHUNK_PAGES = 4;   // smaller chunks = smaller failure blast radius and lower per-call token usage
const OCR_MAX_CHUNKS = 24;   // hard cap on chunks per document (24 * 4 = 96 pages)

interface OcrResult {
  text: string;          // accumulated successful-chunk text (NO failure placeholders)
  totalChunks: number;
  successfulChunks: number;
  placeholders: string;  // failure markers, kept separately for downstream display
  failedRanges: Array<[number, number]>; // 1-based [startPage, endPage] ranges that produced no text
}

// Split the PDF into ≤OCR_CHUNK_PAGES-page chunks, OCR each independently with
// one retry on failure, then return whatever succeeded *plus* explicit success
// metrics so the caller can decide whether the document is usable. Failure
// placeholders are returned in a separate `placeholders` string so they never
// inflate quality checks against the real extracted text.
async function ocrPdfWithGemini(buf: Buffer, pageCount: number, ctx?: AiUsageCtx): Promise<OcrResult> {
  // Note: name kept for backwards compat — this now drives the full multi-
  // provider chain (Gemini Flash → Gemini Pro → Claude). It only short-
  // circuits if NO provider is configured at all; otherwise the chain is
  // entered so Claude can serve scans even without GEMINI_API_KEY.
  const hasAnyProvider = Boolean(
    process.env.GEMINI_API_KEY ||
    (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL)
  );
  if (!hasAnyProvider) {
    return { text: "", totalChunks: 0, successfulChunks: 0, placeholders: "", failedRanges: [] };
  }

  // Fall back to single-shot if pdf-lib can't open the file (encrypted /
  // malformed); preserves prior behavior so we never regress to "0 text".
  let pdfLibMod: any;
  try {
    pdfLibMod = await import("pdf-lib");
  } catch (e: any) {
    console.warn("[ocr] pdf-lib import failed, single-shot fallback:", e?.message || e);
    const text = await ocrPdfChunk(buf, "full", ctx);
    return { text, totalChunks: 1, successfulChunks: text.length > 0 ? 1 : 0, placeholders: "", failedRanges: text.length > 0 ? [] : [[1, pageCount || 1]] };
  }
  const { PDFDocument } = pdfLibMod;

  let srcDoc: any;
  try {
    srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  } catch (e: any) {
    console.warn("[ocr] pdf-lib load failed, single-shot fallback:", e?.message || e);
    const text = await ocrPdfChunk(buf, "full", ctx);
    return { text, totalChunks: 1, successfulChunks: text.length > 0 ? 1 : 0, placeholders: "", failedRanges: text.length > 0 ? [] : [[1, pageCount || 1]] };
  }

  const totalPages = srcDoc.getPageCount();
  const effectivePages = Math.min(totalPages, pageCount || totalPages, OCR_CHUNK_PAGES * OCR_MAX_CHUNKS);
  const chunkRanges: Array<[number, number]> = [];
  for (let start = 0; start < effectivePages; start += OCR_CHUNK_PAGES) {
    chunkRanges.push([start, Math.min(start + OCR_CHUNK_PAGES, effectivePages)]);
  }

  const successful: string[] = [];
  const placeholders: string[] = [];
  const failedRanges: Array<[number, number]> = []; // 1-based, inclusive end
  let succeededChunks = 0;
  for (const [start, end] of chunkRanges) {
    const label = `pages ${start + 1}-${end}`;
    let chunkBuf: Buffer;
    try {
      const chunkDoc = await PDFDocument.create();
      const indices = Array.from({ length: end - start }, (_, i) => start + i);
      const copied = await chunkDoc.copyPages(srcDoc, indices);
      copied.forEach((p: any) => chunkDoc.addPage(p));
      const bytes = await chunkDoc.save();
      chunkBuf = Buffer.from(bytes);
    } catch (e: any) {
      console.warn(`[ocr] ${label} split failed:`, e?.message || e);
      placeholders.push(`--- صفحات ${start + 1}-${end}: تعذّر تقسيم الصفحات ---`);
      failedRanges.push([start + 1, end]);
      continue;
    }

    // Provider chain handles its own retries with exponential backoff and
    // rate-limit cooldowns — no per-chunk retry needed here anymore.
    const text = await ocrPdfChunk(chunkBuf, label, ctx);
    if (text.length > 0) {
      successful.push(text);
      succeededChunks++;
    } else {
      // Keep a marker so downstream display knows what's missing, but DO NOT
      // mix it into `text` — placeholders must not inflate length-based
      // quality checks that decide ready vs error.
      placeholders.push(`--- صفحات ${start + 1}-${end}: تعذّر استخراج النص ---`);
      failedRanges.push([start + 1, end]);
    }
  }

  console.info(`[ocr] chunked: ${succeededChunks}/${chunkRanges.length} chunks ok, ${effectivePages}/${totalPages} pages attempted`);
  return {
    text: successful.join("\n\n").trim(),
    totalChunks: chunkRanges.length,
    successfulChunks: succeededChunks,
    placeholders: placeholders.join("\n"),
    failedRanges,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured outline: a JSON shape that lets the AI teacher cover every point
// in every chapter without skipping anything. Stored in
// course_materials.structured_outline as a JSON string.
// ─────────────────────────────────────────────────────────────────────────────
export type StructuredChapter = {
  idx: number;
  title: string;
  startPage: number;
  endPage: number;
  summary: string;
  keyPoints: string[];
};

export function safeParseStructuredOutline(s: string | null | undefined): StructuredChapter[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .map((c, i) => ({
        idx: Number.isInteger(c?.idx) ? c.idx : i,
        title: typeof c?.title === "string" ? c.title.trim() : "",
        startPage: Number.isInteger(c?.startPage) ? Math.max(1, c.startPage) : 1,
        endPage: Number.isInteger(c?.endPage) ? Math.max(1, c.endPage) : 1,
        summary: typeof c?.summary === "string" ? c.summary.trim() : "",
        keyPoints: Array.isArray(c?.keyPoints)
          ? c.keyPoints.filter((p: any) => typeof p === "string" && p.trim().length > 0).map((p: string) => p.trim()).slice(0, 25)
          : [],
      }))
      .filter((c) => c.title.length > 0)
      .slice(0, 40);
  } catch { return []; }
}

// Build a JSON outline of chapters → key points using Gemini, fed with text
// that has explicit [صفحة N] markers so the model can cite real page ranges.
async function generateStructuredChapters(
  pageTexts: Map<number, string>,
  fileName: string,
  language: string,
  pageCount: number,
  ctx?: AiUsageCtx,
): Promise<StructuredChapter[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || pageTexts.size === 0) return [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const __aiStart = Date.now();

  // Build a page-marked sample. We use a generous budget but truncate to keep
  // the request manageable. The model only needs enough text to detect chapter
  // boundaries and extract topic lists; verbatim quoting is not required here.
  const MAX_CHARS = 90_000;
  const ordered = Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0]);
  const parts: string[] = [];
  let total = 0;
  for (const [page, text] of ordered) {
    const block = `\n--- صفحة ${page} ---\n${text}\n`;
    if (total + block.length > MAX_CHARS) {
      parts.push(`\n--- صفحة ${page} ---\n[…النص مقتطع لتوفير السياق…]\n`);
      break;
    }
    parts.push(block);
    total += block.length;
  }
  const sample = parts.join("");
  const langWord = language === "ar" ? "العربية" : "الإنجليزية";

  const prompt = `أنت مُحلّل مناهج خبير. حلّل النص التالي من ملف "${fileName}" (اللغة: ${langWord}) وأخرج JSON صرف فقط بدون أي markdown أو شرح، بالشكل التالي:

{
  "chapters": [
    {
      "idx": 0,
      "title": "عنوان الفصل/الباب/الوحدة كما يظهر في الملف (نصياً)",
      "startPage": 1,
      "endPage": 12,
      "summary": "ملخص في 2-3 جمل عما يغطّيه هذا الفصل تحديداً",
      "keyPoints": [
        "نقطة جوهرية يجب على المعلّم تغطيتها (مفهوم/تعريف/قاعدة/صيغة/مثال)",
        "..."
      ]
    }
  ]
}

قواعد إلزامية:
- اعتمد على وسوم "--- صفحة N ---" لتحديد startPage و endPage بدقة، ولا تختلق أرقام صفحات.
- إذا لم تجد فصولاً واضحة في الملف، قسّمه إلى وحدات منطقية (مقدمة، مفاهيم أساسية، تطبيقات، إلخ) وحدّد لها أرقام صفحات حقيقية.
- keyPoints = القائمة الكاملة لكل ما يجب على المعلّم شرحه في هذا الفصل (5–15 نقطة في الغالب). اشمل: التعريفات، الصيغ، القوانين، التصنيفات، الأمثلة المحورية، الفروقات بين المفاهيم.
- لا تتجاوز ${Math.min(pageCount || 600, 600)} صفحة. لا تكرّر نفس النقطة بصياغتين.
- اكتب كل العناوين والنقاط بـ${langWord} (نفس لغة المصدر).
- 3 إلى 20 فصلاً كحد أقصى. لا تتجاوز 25 نقطة في الفصل الواحد.

النص:
"""
${sample}
"""`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) {
      console.warn("[structured-outline] gemini http", r.status, (await r.text()).slice(0, 200));
      return [];
    }
    const data: any = await r.json();
    {
      const __u = extractGeminiUsage(data?.usageMetadata);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/structured-outline",
        provider: "gemini",
        model: "gemini-2.5-flash",
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId ? { materialId: ctx.materialId } : null,
      });
    }
    const txt = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
    const parsed = JSON.parse(txt);
    const chapters = Array.isArray(parsed?.chapters) ? parsed.chapters : [];
    // Normalize idx to be 0-based and contiguous; clamp page ranges to the
    // real document so a hallucinated endPage can't pull empty chunks.
    const maxPage = Math.max(pageCount || 0, ordered.length > 0 ? ordered[ordered.length - 1][0] : 1);
    return chapters
      .map((c: any, i: number) => {
        const start = Math.max(1, Math.min(maxPage, Number(c?.startPage) || 1));
        const endRaw = Number(c?.endPage) || start;
        const end = Math.max(start, Math.min(maxPage, endRaw));
        return {
          idx: i,
          title: typeof c?.title === "string" ? c.title.trim().slice(0, 200) : `الفصل ${i + 1}`,
          startPage: start,
          endPage: end,
          summary: typeof c?.summary === "string" ? c.summary.trim().slice(0, 600) : "",
          keyPoints: Array.isArray(c?.keyPoints)
            ? c.keyPoints
                .filter((p: any) => typeof p === "string" && p.trim().length > 0)
                .map((p: string) => p.trim().slice(0, 300))
                .slice(0, 25)
            : [],
        };
      })
      .filter((c: StructuredChapter) => c.title.length > 0)
      .slice(0, 25);
  } catch (e: any) {
    console.warn("[structured-outline] failed:", e?.message || e);
    return [];
  }
}

// Fetch all material_chunks rows whose page is within [startPage, endPage].
// Truncates to a character budget so we never exceed model context limits
// even on a 50-page chapter. Returns chunks ordered by page then chunkIndex.
export async function getChapterChunksByPageRange(
  materialId: number,
  startPage: number,
  endPage: number,
  charBudget = 24_000,
): Promise<RetrievedChunk[]> {
  const start = Math.max(1, Math.min(startPage, endPage));
  const end = Math.max(start, endPage);
  const result = await db.execute(sql`
    SELECT page_number AS "pageNumber",
           chunk_index AS "chunkIndex",
           content
    FROM material_chunks
    WHERE material_id = ${materialId}
      AND page_number >= ${start}
      AND page_number <= ${end}
    ORDER BY page_number ASC, chunk_index ASC
  `);
  const rows = (result.rows as any[]).map((r) => ({
    pageNumber: Number(r.pageNumber ?? r.page_number),
    chunkIndex: Number(r.chunkIndex ?? r.chunk_index),
    content: String(r.content ?? ""),
    score: 0,
  }));
  // Stay under the character budget: include from the start until we hit it.
  const out: RetrievedChunk[] = [];
  let used = 0;
  for (const c of rows) {
    if (used + c.content.length > charBudget) {
      const remaining = Math.max(0, charBudget - used);
      if (remaining > 200) {
        out.push({ ...c, content: c.content.slice(0, remaining) + "\n[…بقية الفصل مقتطعة لحدود السياق…]" });
      }
      break;
    }
    out.push(c);
    used += c.content.length;
  }
  return out;
}

// covered_points is stored as JSON: { [chapterIdx: string]: number[] }
// listing the keyPoint indices that have been taught to this user already.
export type CoveredPointsMap = Record<string, number[]>;

export async function loadCoveredPoints(userId: number, materialId: number): Promise<CoveredPointsMap> {
  const [row] = await db
    .select({ coveredPoints: materialChapterProgressTable.coveredPoints })
    .from(materialChapterProgressTable)
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));
  if (!row?.coveredPoints) return {};
  try {
    const v = JSON.parse(row.coveredPoints);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: CoveredPointsMap = {};
    for (const [k, arr] of Object.entries(v)) {
      if (Array.isArray(arr)) {
        const nums = arr.filter((n) => Number.isInteger(n) && n >= 0 && n < 50);
        if (nums.length > 0) out[String(k)] = Array.from(new Set(nums)).sort((a, b) => a - b);
      }
    }
    return out;
  } catch { return {}; }
}

export async function markPointsCovered(
  userId: number,
  materialId: number,
  chapterIdx: number,
  pointIndices: number[],
): Promise<void> {
  if (!pointIndices || pointIndices.length === 0) return;
  const sane = pointIndices.filter((n) => Number.isInteger(n) && n >= 0 && n < 50);
  if (sane.length === 0) return;
  // Read–merge–write. A tiny race window exists but covered_points is purely
  // additive (we never remove points without explicit user action) so the
  // worst case is a duplicate point index which we de-dupe anyway.
  const current = await loadCoveredPoints(userId, materialId);
  const key = String(chapterIdx);
  const existing = new Set(current[key] ?? []);
  for (const n of sane) existing.add(n);
  current[key] = Array.from(existing).sort((a, b) => a - b);
  await db
    .update(materialChapterProgressTable)
    .set({ coveredPoints: JSON.stringify(current), updatedAt: new Date() })
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));
}

async function generateMaterialMetadata(text: string, fileName: string, language: string, ctx?: AiUsageCtx): Promise<{ outline: string; summary: string; starters: string }> {
  const key = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const __aiStart = Date.now();
  const sample = text.slice(0, 60000);
  const langWord = language === "ar" ? "العربية" : "الإنجليزية";

  const prompt = `أنت مساعد تحليل منهج. حلّل المقتطفات التالية من ملف "${fileName}" (لغته الأساسية ${langWord})، وأخرج JSON فقط بدون أي تعليق أو سياج markdown، بالشكل:
{
  "outline": "فهرس الأبواب والفصول والأقسام الرئيسية كقائمة hierarchical (نص عربي خالٍ من HTML، بحد أقصى 40 سطراً، يستخدم - و  -  للتدرّج)",
  "summary": "ملخص في 3 نقاط بالعربية (كل نقطة سطر مسبوق بـ '• ') يصف ما يغطّيه الملف وأسلوبه ومستواه",
  "starters": "أربعة أسئلة بدء افتراضية يمكن للطالب الضغط عليها (كل سؤال في سطر مسبوق بـ '• ')، مرتبطة فعلياً بمحتوى الملف"
}

النص:
"""
${sample}
"""`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) {
    console.warn("[meta] gemini http", r.status, (await r.text()).slice(0, 200));
    return { outline: "", summary: "", starters: "" };
  }
  const data: any = await r.json();
  {
    const __u = extractGeminiUsage(data?.usageMetadata);
    void recordAiUsage({
      userId: ctx?.userId ?? null,
      subjectId: ctx?.subjectId ?? null,
      route: "materials/metadata",
      provider: "gemini",
      model: "gemini-2.5-flash",
      inputTokens: __u.inputTokens,
      outputTokens: __u.outputTokens,
      cachedInputTokens: __u.cachedInputTokens,
      latencyMs: Date.now() - __aiStart,
      metadata: ctx?.materialId ? { materialId: ctx.materialId } : null,
    });
  }
  const txt = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
  try {
    const parsed = JSON.parse(txt);
    return {
      outline: String(parsed.outline ?? "").slice(0, 6000),
      summary: String(parsed.summary ?? "").slice(0, 1200),
      starters: String(parsed.starters ?? "").slice(0, 1200),
    };
  } catch {
    return { outline: "", summary: "", starters: "" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chapter progress helpers (per-user, per-material)
// ─────────────────────────────────────────────────────────────────────────────

// Pull chapter titles from the structured outline JSON if available — this is
// the authoritative source. parseChaptersFromOutline (text-based) remains the
// fallback for legacy materials processed before structured outlines existed.
export function chaptersFromStructured(structuredOutline: string | null | undefined): string[] {
  const chapters = safeParseStructuredOutline(structuredOutline);
  return chapters.map((c) => c.title).filter((t) => t.length > 0);
}

// Parse the AI-generated outline into a flat list of top-level chapter titles.
// The outline is plain text where chapters are lines starting with "- " (no
// leading whitespace) and sub-sections are indented with two spaces.
export function parseChaptersFromOutline(outline: string): string[] {
  if (!outline) return [];
  const out: string[] = [];
  for (const raw of outline.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line) continue;
    // Top-level item: starts with "- " (no leading space) OR is unindented and begins with a digit/chapter word.
    if (/^- \S/.test(line)) {
      out.push(line.replace(/^-\s+/, "").trim());
      continue;
    }
    if (/^\s/.test(line)) continue; // sub-item, skip
    // Fallback for unbulleted top-level lines
    if (/^(الفصل|الباب|Chapter|Unit|Part|\d+[\.\)])/i.test(line)) {
      out.push(line.trim());
    }
  }
  // De-duplicate while preserving order, cap to a sane number.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of out) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
    if (unique.length >= 40) break;
  }
  return unique;
}

function safeParseStringArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}
function safeParseNumberArray(s: string | null | undefined): number[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
  } catch { return []; }
}

export type LoadedProgress = {
  chapters: string[];
  currentChapterIndex: number;
  completedChapterIndices: number[];
  skippedChapterIndices: number[];
  lastInteractedAt: Date | null;
};

export async function loadProgress(userId: number, materialId: number, outline: string, structuredOutline?: string | null): Promise<LoadedProgress> {
  const [row] = await db
    .select()
    .from(materialChapterProgressTable)
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));

  // Prefer structured outline (authoritative) and fall back to text parser.
  const fromStructured = chaptersFromStructured(structuredOutline);
  const fresh = fromStructured.length > 0 ? fromStructured : parseChaptersFromOutline(outline);

  if (!row) {
    if (fresh.length === 0) {
      return { chapters: [], currentChapterIndex: 0, completedChapterIndices: [], skippedChapterIndices: [], lastInteractedAt: null };
    }
    await db.insert(materialChapterProgressTable).values({
      userId,
      materialId,
      chapters: JSON.stringify(fresh),
      currentChapterIndex: 0,
      completedChapterIndices: "[]",
      skippedChapterIndices: "[]",
    }).onConflictDoNothing();
    return { chapters: fresh, currentChapterIndex: 0, completedChapterIndices: [], skippedChapterIndices: [], lastInteractedAt: null };
  }

  let chapters = safeParseStringArray(row.chapters);
  // If the stored chapter list is empty but we now have a parsed outline, hydrate it.
  if (chapters.length === 0 && fresh.length > 0) {
    chapters = fresh;
    await db.update(materialChapterProgressTable)
      .set({ chapters: JSON.stringify(chapters), updatedAt: new Date() })
      .where(eq(materialChapterProgressTable.id, row.id));
  } else if (
    fresh.length > 0 &&
    chapters.length > 0 &&
    (chapters.length !== fresh.length ||
      chapters.some((t, i) => (t || "").trim().toLowerCase() !== (fresh[i] || "").trim().toLowerCase()))
  ) {
    // Structured outline produced a different chapter set (different length or
    // titles). Old completed/skipped/current indices no longer map to the new
    // chapters, so we reset progress conservatively rather than silently
    // misreporting completion. Covered points are also cleared since they were
    // keyed to old chapter indices.
    chapters = fresh;
    await db.update(materialChapterProgressTable)
      .set({
        chapters: JSON.stringify(chapters),
        currentChapterIndex: 0,
        completedChapterIndices: "[]",
        skippedChapterIndices: "[]",
        coveredPoints: "{}",
        updatedAt: new Date(),
      })
      .where(eq(materialChapterProgressTable.id, row.id));
    return {
      chapters,
      currentChapterIndex: 0,
      completedChapterIndices: [],
      skippedChapterIndices: [],
      lastInteractedAt: row.lastInteractedAt ?? null,
    };
  }
  return {
    chapters,
    currentChapterIndex: Math.min(Math.max(row.currentChapterIndex, 0), Math.max(chapters.length - 1, 0)),
    completedChapterIndices: safeParseNumberArray(row.completedChapterIndices).filter((i) => i >= 0 && i < chapters.length),
    skippedChapterIndices: safeParseNumberArray(row.skippedChapterIndices).filter((i) => i >= 0 && i < chapters.length),
    lastInteractedAt: row.lastInteractedAt ?? null,
  };
}

export async function mutateProgress(
  userId: number,
  materialId: number,
  outline: string,
  action: string,
  chapterIndex?: number,
  structuredOutline?: string | null,
): Promise<LoadedProgress> {
  const current = await loadProgress(userId, materialId, outline, structuredOutline);
  if (current.chapters.length === 0) return current;

  let { currentChapterIndex, completedChapterIndices, skippedChapterIndices } = current;
  const completed = new Set(completedChapterIndices);
  const skipped = new Set(skippedChapterIndices);
  const lastIdx = current.chapters.length - 1;

  if (action === "advance") {
    completed.add(currentChapterIndex);
    skipped.delete(currentChapterIndex);
    currentChapterIndex = Math.min(currentChapterIndex + 1, lastIdx);
    skipped.delete(currentChapterIndex);
  } else if (action === "complete" && Number.isInteger(chapterIndex)) {
    if (chapterIndex! >= 0 && chapterIndex! <= lastIdx) {
      completed.add(chapterIndex!);
      // Marking a chapter complete clears any prior "skipped" flag on it.
      skipped.delete(chapterIndex!);
    }
  } else if (action === "uncomplete" && Number.isInteger(chapterIndex)) {
    if (chapterIndex! >= 0 && chapterIndex! <= lastIdx) completed.delete(chapterIndex!);
  } else if (action === "set" && Number.isInteger(chapterIndex)) {
    if (chapterIndex! >= 0 && chapterIndex! <= lastIdx) {
      const target = chapterIndex!;
      // Jumping forward past the next sequential chapter? Flag the chapters
      // strictly in between as "skipped" so the tutor knows the student
      // didn't actually study them.
      if (target > currentChapterIndex + 1) {
        for (let i = currentChapterIndex + 1; i < target; i++) {
          if (!completed.has(i)) skipped.add(i);
        }
      }
      // The chapter the student just navigated TO is no longer "skipped".
      skipped.delete(target);
      currentChapterIndex = target;
    }
  } else if (action === "reset") {
    completed.clear();
    skipped.clear();
    currentChapterIndex = 0;
  }

  const completedArr = Array.from(completed).sort((a, b) => a - b);
  const skippedArr = Array.from(skipped).sort((a, b) => a - b);
  const now = new Date();
  await db.update(materialChapterProgressTable)
    .set({
      currentChapterIndex,
      completedChapterIndices: JSON.stringify(completedArr),
      skippedChapterIndices: JSON.stringify(skippedArr),
      lastInteractedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));

  return { chapters: current.chapters, currentChapterIndex, completedChapterIndices: completedArr, skippedChapterIndices: skippedArr, lastInteractedAt: now };
}

// Convenience: advance the chapter for the active material in a subject (called
// from /ai/teach when the AI marks a stage complete in professor mode).
export async function advanceActiveMaterialChapter(userId: number, subjectId: string): Promise<LoadedProgress | null> {
  const ctx = await getActiveMaterialContext(userId, subjectId);
  if (!ctx?.material) return null;
  return mutateProgress(userId, ctx.material.id, ctx.material.outline ?? "", "advance", undefined, ctx.material.structuredOutline ?? null);
}

// Aggregate the most recent submitted quiz attempts on a material to surface
// the topics the student has been getting wrong. We look at the last few
// attempts (within the last ~30 days) and sum the miss counts per topic, then
// return the top 5. Used by /ai/teach to personalize the next session and by
// /api/materials/:id so the UI can show a "focus on my weak areas" chip.
export async function getRecentWeakAreasForMaterial(
  userId: number,
  materialId: number,
  opts: { maxAttempts?: number; maxAgeDays?: number; topN?: number } = {},
): Promise<{ topic: string; missed: number }[]> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const maxAgeDays = opts.maxAgeDays ?? 30;
  const topN = opts.topN ?? 5;
  const sinceMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const rows = await db
    .select({
      weakAreas: quizAttemptsTable.weakAreas,
      submittedAt: quizAttemptsTable.submittedAt,
    })
    .from(quizAttemptsTable)
    .where(and(
      eq(quizAttemptsTable.userId, userId),
      eq(quizAttemptsTable.materialId, materialId),
      eq(quizAttemptsTable.status, "submitted"),
    ))
    .orderBy(desc(quizAttemptsTable.submittedAt))
    .limit(maxAttempts);

  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!r.submittedAt || new Date(r.submittedAt).getTime() < sinceMs) continue;
    let parsed: unknown = [];
    try { parsed = JSON.parse(r.weakAreas); } catch { parsed = []; }
    if (!Array.isArray(parsed)) continue;
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      const topic = String(rec.topic ?? "").trim();
      const missed = Number(rec.missed ?? 0);
      if (!topic || !Number.isFinite(missed) || missed <= 0) continue;
      totals.set(topic, (totals.get(topic) ?? 0) + missed);
    }
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic, missed]) => ({ topic, missed }));
}

// ── Helper exposed for ai/teach to load the active material context ────────────
export async function getActiveMaterialContext(userId: number, subjectId: string): Promise<{
  mode: string;
  material: { id: number; fileName: string; outline: string | null; structuredOutline: string | null; summary: string | null; extractedText: string | null; language: string | null } | null;
  recentWeakAreas?: { topic: string; missed: number }[];
} | null> {
  const [mode] = await db
    .select()
    .from(userSubjectTeachingModesTable)
    .where(and(
      eq(userSubjectTeachingModesTable.userId, userId),
      eq(userSubjectTeachingModesTable.subjectId, subjectId),
    ));
  if (!mode) return { mode: "unset", material: null };
  if (mode.mode !== "professor") return { mode: mode.mode, material: null };

  const matCols = {
    id: courseMaterialsTable.id,
    fileName: courseMaterialsTable.fileName,
    outline: courseMaterialsTable.outline,
    structuredOutline: courseMaterialsTable.structuredOutline,
    summary: courseMaterialsTable.summary,
    extractedText: courseMaterialsTable.extractedText,
    language: courseMaterialsTable.language,
    status: courseMaterialsTable.status,
  };

  let mat: any = null;
  if (mode.activeMaterialId) {
    const [m] = await db
      .select(matCols)
      .from(courseMaterialsTable)
      .where(eq(courseMaterialsTable.id, mode.activeMaterialId));
    if (m && m.status === "ready") mat = m;
  }
  // Fallback: most-recent ready material for this subject. Keeps the session
  // running even when the saved active pointer is stale or errored.
  if (!mat) {
    const [m] = await db
      .select(matCols)
      .from(courseMaterialsTable)
      .where(and(
        eq(courseMaterialsTable.userId, userId),
        eq(courseMaterialsTable.subjectId, subjectId),
        eq(courseMaterialsTable.status, "ready"),
      ))
      .orderBy(desc(courseMaterialsTable.createdAt))
      .limit(1);
    if (m) {
      mat = m;
      // Self-heal the pointer so future calls hit the fast path.
      await db
        .update(userSubjectTeachingModesTable)
        .set({ activeMaterialId: m.id, updatedAt: new Date() })
        .where(eq(userSubjectTeachingModesTable.id, mode.id));
    }
  }
  if (!mat) return { mode: mode.mode, material: null };
  const recentWeakAreas = await getRecentWeakAreasForMaterial(userId, mat.id);
  return { mode: mode.mode, material: mat, recentWeakAreas };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quizzes & final exams generated from a PDF
// ─────────────────────────────────────────────────────────────────────────────

const QUIZ_QUESTION_COUNT = { min: 5, max: 10 };
const EXAM_QUESTION_COUNT = 30;

type QuizQuestion = {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  topic?: string;
  page?: number | null;
};

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "") // Arabic diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

type QuestionGenOpts = {
  text: string;
  fileName: string;
  language: string | null;
  count: number;
  scopeLabel: string;
  mcqRatio?: number;
  pageStart?: number;
  pageEnd?: number;
};

function buildQuizPrompt(opts: QuestionGenOpts): string {
  const langWord = (opts.language ?? "ar") === "ar" ? "العربية" : "الإنجليزية";
  const sample = opts.text.slice(0, 80_000);
  const mcqCount = Math.max(1, Math.round(opts.count * (opts.mcqRatio ?? 0.7)));
  const shortCount = Math.max(1, opts.count - mcqCount);
  const rangeNote = opts.pageStart && opts.pageEnd
    ? `\nنطاق الصفحات المسموح: من ${opts.pageStart} إلى ${opts.pageEnd}. ممنوع تماماً أن يكون أي رقم page خارج هذا النطاق.`
    : "";
  return `أنت مولّد امتحانات أكاديمي. اعتمد فقط على النص التالي من ملف "${opts.fileName}" (لغته الأساسية ${langWord})، ولا تخترع أي معلومة من خارجه.
المطلوب: ${opts.scopeLabel}.
أنشئ ${opts.count} سؤالاً متنوّعاً (${mcqCount} اختيار من متعدد + ${shortCount} إجابة قصيرة).${rangeNote}

النص أدناه مُقسَّم إلى صفحات بوسوم بهذا الشكل بالضبط:  --- صفحة N ---
يجب أن يكون رقم page في كل سؤال هو رقم الصفحة المذكور فعلياً في الوسم الذي يسبق المعلومة المُستخدَمة في السؤال داخل النص.
- لا تختلق أبداً رقم صفحة لم يظهر في النص.
- لا تخمّن. إذا لم تستطع تحديد الصفحة بدقة، أرجع page = null.
- لا تذكر أبداً رقماً خارج النطاق المُعطى أعلاه.

أعد JSON فقط — بدون أي شرح أو سياج markdown — بهذا الشكل بالضبط:
{
  "questions": [
    {
      "type": "mcq",
      "prompt": "نص السؤال بالعربية",
      "choices": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "answer": "النص الكامل للخيار الصحيح (يجب أن يطابق أحد العناصر في choices)",
      "explanation": "شرح موجز جداً للحل (سطر أو سطران)",
      "topic": "الموضوع الفرعي الذي يقيسه السؤال (3-6 كلمات)",
      "page": 12
    },
    {
      "type": "short",
      "prompt": "نص السؤال القصير",
      "answer": "الإجابة النموذجية في 1-3 أسطر",
      "explanation": "شرح موجز",
      "topic": "الموضوع الفرعي",
      "page": 7
    }
  ]
}

قواعد صارمة:
- جميع الأسئلة بالعربية الفصحى ومأخوذة فعلياً من النص.
- لكل MCQ بالضبط 4 خيارات، وحقل answer هو نص أحد الخيارات حرفياً.
- short هي أسئلة مفاهيمية لا تتطلب أكثر من 3 أسطر.
- نوّع المستويات (تذكّر، فهم، تطبيق، تحليل).
- تجنّب الأسئلة المكرّرة أو التافهة.

النص:
"""
${sample}
"""`;
}

// Parse the model's JSON output into validated QuizQuestion objects. Used for
// both Gemini and Claude responses since the prompt schema is identical.
function parseQuizQuestionsJson(txt: string): QuizQuestion[] {
  let parsed: any;
  try { parsed = JSON.parse(stripJsonFence(txt)); } catch (e) {
    throw new Error("model returned non-JSON output");
  }
  const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const out: QuizQuestion[] = [];
  for (let i = 0; i < arr.length; i++) {
    const q = arr[i] || {};
    const type = q.type === "short" ? "short" : "mcq";
    const prompt = String(q.prompt ?? "").trim();
    const answer = String(q.answer ?? "").trim();
    if (!prompt || !answer) continue;
    if (type === "mcq") {
      const choices = Array.isArray(q.choices) ? q.choices.map((c: any) => String(c ?? "").trim()).filter(Boolean) : [];
      if (choices.length < 2) continue;
      const normAns = normalizeText(answer);
      const matched = choices.find((c: string) => normalizeText(c) === normAns) ?? null;
      const finalAnswer = matched ?? answer;
      if (!choices.some((c: string) => normalizeText(c) === normalizeText(finalAnswer))) continue;
      out.push({
        id: `q${i + 1}`,
        type: "mcq",
        prompt,
        choices,
        answer: finalAnswer,
        explanation: q.explanation ? String(q.explanation).slice(0, 600) : undefined,
        topic: q.topic ? String(q.topic).slice(0, 120) : undefined,
        page: Number.isFinite(q.page) ? Number(q.page) : null,
      });
    } else {
      out.push({
        id: `q${i + 1}`,
        type: "short",
        prompt,
        answer: answer.slice(0, 1200),
        explanation: q.explanation ? String(q.explanation).slice(0, 600) : undefined,
        topic: q.topic ? String(q.topic).slice(0, 120) : undefined,
        page: Number.isFinite(q.page) ? Number(q.page) : null,
      });
    }
  }
  return out;
}

// True iff the error from a provider should cause us to fall through to the
// next provider (rate-limited, overloaded) instead of failing the whole call.
function isQuizProviderRateLimited(e: unknown): boolean {
  const msg = String((e as any)?.message || e || "");
  const status = (e as any)?.status;
  return (
    status === 429 || status === 503 || status === 529 ||
    /\bhttp 429\b|\bhttp 503\b|\bhttp 529\b|rate.?limit|overloaded|quota|exceeded/i.test(msg)
  );
}

async function generateQuestionsViaGemini(opts: QuestionGenOpts, ctx?: AiUsageCtx & { kind?: string }): Promise<QuizQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("gemini_not_configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const __aiStart = Date.now();
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildQuizPrompt(opts) }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) {
    const body = await r.text();
    const err: any = new Error(`gemini http ${r.status}: ${body.slice(0, 200)}`);
    err.status = r.status;
    throw err;
  }
  const data: any = await r.json();
  {
    const __u = extractGeminiUsage(data?.usageMetadata);
    void recordAiUsage({
      userId: ctx?.userId ?? null,
      subjectId: ctx?.subjectId ?? null,
      route: `materials/${ctx?.kind || "quiz"}-gen`,
      provider: "gemini",
      model: "gemini-2.5-flash",
      inputTokens: __u.inputTokens,
      outputTokens: __u.outputTokens,
      cachedInputTokens: __u.cachedInputTokens,
      latencyMs: Date.now() - __aiStart,
      metadata: ctx?.materialId ? { materialId: ctx.materialId } : null,
    });
  }
  const txt = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
  return parseQuizQuestionsJson(txt);
}

async function generateQuestionsViaClaude(opts: QuestionGenOpts, ctx?: AiUsageCtx & { kind?: string }): Promise<QuizQuestion[]> {
  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    throw new Error("anthropic_not_configured");
  }
  const { anthropic } = await import("@workspace/integrations-anthropic-ai");
  const __aiStart = Date.now();
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    messages: [{ role: "user", content: buildQuizPrompt(opts) }],
  });
  {
    const __u = extractAnthropicUsage(msg);
    void recordAiUsage({
      userId: ctx?.userId ?? null,
      subjectId: ctx?.subjectId ?? null,
      route: `materials/${ctx?.kind || "quiz"}-gen`,
      provider: "anthropic",
      model: "claude-sonnet-4-5-20250929",
      inputTokens: __u.inputTokens,
      outputTokens: __u.outputTokens,
      cachedInputTokens: __u.cachedInputTokens,
      latencyMs: Date.now() - __aiStart,
      metadata: ctx?.materialId ? { materialId: ctx.materialId } : null,
    });
  }
  const txt = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseQuizQuestionsJson(txt);
}

// Multi-provider question generation. Tries Gemini Flash first (fast +
// cheap), and falls back to Claude on quota/rate-limit errors so the quiz
// & exam features keep working when the user's GEMINI_API_KEY runs out.
// Configuration / parsing errors are NOT retried on the next provider —
// only rate-limit-class errors trigger fallback. We keep the name
// `generateQuestionsWithGemini` so call sites don't need to change.
async function generateQuestionsWithGemini(opts: QuestionGenOpts, ctx?: AiUsageCtx & { kind?: string }): Promise<QuizQuestion[]> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  if (!hasGemini && !hasClaude) throw new Error("no_quiz_provider_configured");

  if (hasGemini) {
    try {
      return await generateQuestionsViaGemini(opts, ctx);
    } catch (e: any) {
      // Fall through to Claude only on rate-limit-class failures. Other
      // errors (auth, JSON parsing, validation) indicate a real problem
      // with the request itself — bubble them up.
      if (!hasClaude || !isQuizProviderRateLimited(e)) throw e;
      console.warn("[quiz/gen] gemini rate-limited, falling back to claude:", String(e?.message || e).slice(0, 150));
    }
  }
  return await generateQuestionsViaClaude(opts, ctx);
}

function hasAnyQuizProvider(): boolean {
  return (
    !!process.env.GEMINI_API_KEY ||
    (!!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL)
  );
}

// Load all chunks for a page range and assemble them into one string with
// explicit `--- صفحة N ---` markers before each page. The model NEEDS these
// markers to attribute page numbers correctly — otherwise it hallucinates
// (e.g. claiming a question came from page 3 when the text was on page 15).
// Truncates from the end if the result exceeds maxChars.
async function loadPaginatedTextForRange(
  materialId: number,
  pageStart: number,
  pageEnd: number,
  maxChars = 80_000,
): Promise<{ text: string; usedPages: number[] }> {
  const start = Math.max(1, Math.min(pageStart, pageEnd));
  const end = Math.max(start, pageEnd);
  const result = await db.execute(sql`
    SELECT page_number AS "pageNumber",
           chunk_index AS "chunkIndex",
           content
    FROM material_chunks
    WHERE material_id = ${materialId}
      AND page_number BETWEEN ${start} AND ${end}
    ORDER BY page_number ASC, chunk_index ASC
  `);
  const rows = (result.rows as any[]).map((r) => ({
    pageNumber: Number(r.pageNumber ?? r.page_number),
    chunkIndex: Number(r.chunkIndex ?? r.chunk_index),
    content: String(r.content ?? ""),
  }));
  // Group by page so each page header appears exactly once even when the
  // page spans multiple chunks.
  const byPage = new Map<number, string[]>();
  for (const r of rows) {
    if (!r.content.trim()) continue;
    const arr = byPage.get(r.pageNumber) ?? [];
    arr.push(r.content);
    byPage.set(r.pageNumber, arr);
  }
  const usedPages: number[] = [];
  let text = "";
  for (const page of Array.from(byPage.keys()).sort((a, b) => a - b)) {
    const block = `\n--- صفحة ${page} ---\n${(byPage.get(page) ?? []).join("\n").trim()}\n`;
    if (text.length + block.length > maxChars) break;
    text += block;
    usedPages.push(page);
  }
  return { text: text.trim(), usedPages };
}

// Build the model context for a quiz scope. Always emits `--- صفحة N ---`
// markers so the model can attribute pages accurately. Falls back to the
// full extracted text only when no chunks could be loaded for the range.
async function buildScopedContext(
  materialId: number,
  fullText: string,
  pageStart: number,
  pageEnd: number,
): Promise<string> {
  const { text } = await loadPaginatedTextForRange(materialId, pageStart, pageEnd);
  if (text.length > 0) return text;
  // Last-resort fallback: the chunks table may be empty for very old uploads.
  // Return the full extracted text so generation still works, but the model
  // will lose page-attribution accuracy.
  return fullText.slice(0, 80_000);
}

// Resolve the (pageStart, pageEnd) tuple a quiz request should target, given
// the user's input and what's known about the material. Order of precedence:
//   1. Explicit pageStart/pageEnd in the request body (validated, clamped).
//   2. The chapter's own startPage/endPage from structuredOutline.
//   3. The full file (1..pageCount).
function resolveQuizScope(opts: {
  pageCount: number | null;
  bodyPageStart?: unknown;
  bodyPageEnd?: unknown;
  chapter?: StructuredChapter | null;
}): { pageStart: number; pageEnd: number; source: "explicit" | "chapter" | "full" } {
  const total = Math.max(1, Number(opts.pageCount) || 1);
  const sNum = Number(opts.bodyPageStart);
  const eNum = Number(opts.bodyPageEnd);
  const explicit = Number.isInteger(sNum) && Number.isInteger(eNum) && sNum >= 1 && eNum >= sNum;
  if (explicit) {
    const pageStart = Math.max(1, Math.min(total, sNum));
    const pageEnd = Math.max(pageStart, Math.min(total, eNum));
    return { pageStart, pageEnd, source: "explicit" };
  }
  if (opts.chapter && opts.chapter.startPage && opts.chapter.endPage) {
    const pageStart = Math.max(1, Math.min(total, opts.chapter.startPage));
    const pageEnd = Math.max(pageStart, Math.min(total, opts.chapter.endPage));
    return { pageStart, pageEnd, source: "chapter" };
  }
  return { pageStart: 1, pageEnd: total, source: "full" };
}

// Sanitize page numbers in generated questions: clamp to the requested range,
// or null when the model returned a page it couldn't possibly know (outside
// the range we sent it). Better to show no page than a wrong page.
function sanitizeQuestionPages(qs: QuizQuestion[], pageStart: number, pageEnd: number): QuizQuestion[] {
  return qs.map((q) => {
    const p = q.page;
    if (p == null || !Number.isFinite(p)) return { ...q, page: null };
    if (p < pageStart || p > pageEnd) return { ...q, page: null };
    return { ...q, page: Math.round(p) };
  });
}

// Grade short-answer questions in a single Gemini call. Returns a map id→{correct, feedback}.
async function gradeShortAnswers(items: { id: string; prompt: string; expected: string; given: string }[], ctx?: AiUsageCtx): Promise<Record<string, { correct: boolean; feedback: string }>> {
  const out: Record<string, { correct: boolean; feedback: string }> = {};
  if (items.length === 0) return out;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // No model — be lenient: any non-empty answer is half-credit (counted wrong here).
    for (const it of items) out[it.id] = { correct: false, feedback: "تعذّر التقييم التلقائي." };
    return out;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const __aiStart = Date.now();
  const payload = items.map((it) => ({ id: it.id, prompt: it.prompt, expected: it.expected, given: it.given }));
  const prompt = `أنت مصحّح امتحانات. لكل عنصر في القائمة، قارن إجابة الطالب (given) بالإجابة النموذجية (expected) واحكم هل هي صحيحة جوهرياً (تغطّي المعنى الأساسي حتى مع اختلاف الصياغة).

أعد JSON فقط:
{ "results": [ { "id": "q1", "correct": true, "feedback": "ملاحظة قصيرة بالعربية (سطر واحد)" }, ... ] }

العناصر:
${JSON.stringify(payload, null, 0)}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) throw new Error(`gemini http ${r.status}`);
    const data: any = await r.json();
    {
      const __u = extractGeminiUsage(data?.usageMetadata);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/grade-short",
        provider: "gemini",
        model: "gemini-2.5-flash",
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId ? { materialId: ctx.materialId } : null,
      });
    }
    const txt = stripJsonFence((data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join(""));
    const parsed = JSON.parse(txt);
    const arr = Array.isArray(parsed?.results) ? parsed.results : [];
    for (const r2 of arr) {
      if (!r2 || typeof r2.id !== "string") continue;
      out[r2.id] = {
        correct: !!r2.correct,
        feedback: typeof r2.feedback === "string" ? r2.feedback.slice(0, 400) : "",
      };
    }
  } catch (e: any) {
    console.warn("[quiz/grade-short] failed:", e?.message || e);
  }
  // Fill in any missing items with conservative defaults.
  for (const it of items) {
    if (!out[it.id]) out[it.id] = { correct: false, feedback: "تعذّر تقييم هذه الإجابة تلقائياً." };
  }
  return out;
}

function questionsForClient(qs: QuizQuestion[]): Array<Omit<QuizQuestion, "answer" | "explanation">> {
  return qs.map(({ answer: _a, explanation: _e, ...rest }) => rest);
}

async function loadMaterialOwned(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(courseMaterialsTable)
    .where(and(eq(courseMaterialsTable.id, id), eq(courseMaterialsTable.userId, userId)));
  return row ?? null;
}

// ── POST /api/materials/:id/quiz  { chapterIndex? }  → generate chapter quiz ─
router.post("/materials/:id/quiz", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  const mat = await loadMaterialOwned(userId, id);
  if (!mat) return res.status(404).json({ error: "Not found" });
  if (mat.status !== "ready") return res.status(409).json({ error: "MATERIAL_NOT_READY" });
  if (!mat.extractedText) return res.status(409).json({ error: "MATERIAL_HAS_NO_TEXT" });
  if (!hasAnyQuizProvider()) return res.status(503).json({ error: "QUIZ_GEN_UNAVAILABLE" });

  const structuredChapters = safeParseStructuredOutline(mat.structuredOutline);
  const progress = await loadProgress(userId, id, mat.outline ?? "", mat.structuredOutline ?? null);
  let chapterIndex: number | null = Number.isInteger(req.body?.chapterIndex)
    ? Number(req.body.chapterIndex)
    : progress.currentChapterIndex;
  if (!structuredChapters.length || chapterIndex == null || chapterIndex < 0 || chapterIndex >= structuredChapters.length) {
    chapterIndex = null;
  }
  const chapter = chapterIndex != null ? (structuredChapters[chapterIndex] ?? null) : null;
  const chapterTitle = chapter?.title ?? (chapterIndex != null ? (progress.chapters[chapterIndex] ?? null) : null);

  // Resolve the page range: explicit body > chapter range > whole file.
  const { pageStart, pageEnd, source: scopeSource } = resolveQuizScope({
    pageCount: mat.pageCount ?? null,
    bodyPageStart: req.body?.pageStart,
    bodyPageEnd: req.body?.pageEnd,
    chapter,
  });

  try {
    const context = await buildScopedContext(id, mat.extractedText, pageStart, pageEnd);
    // Build a human-readable scope label that matches what the user picked.
    const scopeLabel = scopeSource === "chapter" && chapterTitle
      ? `أسئلة تختبر الفصل/القسم "${chapterTitle}" (صفحات ${pageStart}–${pageEnd}) فقط`
      : scopeSource === "explicit"
        ? `أسئلة تغطّي الصفحات من ${pageStart} إلى ${pageEnd} فقط`
        : "أسئلة تغطّي الموضوعات الرئيسية في كامل الملف";
    const desired = Math.min(QUIZ_QUESTION_COUNT.max, Math.max(QUIZ_QUESTION_COUNT.min, 8));
    const generated = await generateQuestionsWithGemini({
      text: context,
      fileName: mat.fileName,
      language: mat.language,
      count: desired,
      scopeLabel,
      mcqRatio: 0.7,
      pageStart,
      pageEnd,
    }, { userId, subjectId: mat.subjectId, materialId: id, kind: "quiz" });
    const questions = sanitizeQuestionPages(generated, pageStart, pageEnd);
    if (questions.length < QUIZ_QUESTION_COUNT.min) {
      return res.status(502).json({ error: "QUIZ_GEN_TOO_FEW", got: questions.length });
    }
    const trimmed = questions.slice(0, QUIZ_QUESTION_COUNT.max);
    const [row] = await db.insert(quizAttemptsTable).values({
      userId,
      materialId: id,
      subjectId: mat.subjectId,
      kind: "chapter",
      chapterIndex,
      chapterTitle,
      questions: JSON.stringify(trimmed),
      totalQuestions: trimmed.length,
      status: "in_progress",
    }).returning();

    res.json({
      attemptId: row.id,
      kind: "chapter",
      chapterIndex,
      chapterTitle,
      pageStart,
      pageEnd,
      scopeSource,
      totalQuestions: trimmed.length,
      questions: questionsForClient(trimmed),
    });
  } catch (e: any) {
    console.error("[materials/quiz] error:", e?.message || e);
    res.status(500).json({ error: "QUIZ_GEN_FAILED" });
  }
});

// ── GET /api/materials/:id/quiz-scope → return chapter & page-range info
//    used by the quiz panel's scope picker (so the user can choose what
//    range to be tested on before generation starts).
router.get("/materials/:id/quiz-scope", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  const mat = await loadMaterialOwned(userId, id);
  if (!mat) return res.status(404).json({ error: "Not found" });
  if (mat.status !== "ready") return res.status(409).json({ error: "MATERIAL_NOT_READY" });

  const structured = safeParseStructuredOutline(mat.structuredOutline);
  const progress = await loadProgress(userId, id, mat.outline ?? "", mat.structuredOutline ?? null);
  const currentIndex = structured.length && progress.currentChapterIndex >= 0 && progress.currentChapterIndex < structured.length
    ? progress.currentChapterIndex
    : null;
  const chapters = structured.map((c, i) => ({
    index: i,
    title: c.title,
    startPage: c.startPage,
    endPage: c.endPage,
  }));
  res.json({
    materialId: id,
    fileName: mat.fileName,
    pageCount: mat.pageCount ?? null,
    currentChapterIndex: currentIndex,
    chapters,
  });
});

// ── POST /api/materials/:id/exam → generate full final exam ──────────────────
router.post("/materials/:id/exam", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  const mat = await loadMaterialOwned(userId, id);
  if (!mat) return res.status(404).json({ error: "Not found" });
  if (mat.status !== "ready") return res.status(409).json({ error: "MATERIAL_NOT_READY" });
  if (!mat.extractedText) return res.status(409).json({ error: "MATERIAL_HAS_NO_TEXT" });
  if (!hasAnyQuizProvider()) return res.status(503).json({ error: "QUIZ_GEN_UNAVAILABLE" });

  // The exam covers the entire file. Build a paginated context with real
  // page markers so questions can be attributed accurately.
  const pageStart = 1;
  const pageEnd = Math.max(1, Number(mat.pageCount) || 1);

  try {
    const context = await buildScopedContext(id, mat.extractedText, pageStart, pageEnd);
    // Ensure we hit exactly EXAM_QUESTION_COUNT questions. The model sometimes
    // returns fewer than asked, so we run up to 2 backfill passes that fill
    // only the missing slots. We also dedupe near-identical prompts.
    const seenPrompts = new Set<string>();
    const collected: QuizQuestion[] = [];
    const addUnique = (qs: QuizQuestion[]) => {
      const cleaned = sanitizeQuestionPages(qs, pageStart, pageEnd);
      for (const q of cleaned) {
        const key = normalizeText(q.prompt).slice(0, 120);
        if (!key || seenPrompts.has(key)) continue;
        seenPrompts.add(key);
        collected.push({ ...q, id: `q${collected.length + 1}` });
        if (collected.length >= EXAM_QUESTION_COUNT) break;
      }
    };
    const passes: { count: number; scope: string }[] = [
      { count: EXAM_QUESTION_COUNT, scope: `امتحان نهائي شامل يغطّي كامل الملف بكل فصوله بشكل متوازن (${EXAM_QUESTION_COUNT} سؤالاً)` },
    ];
    addUnique(await generateQuestionsWithGemini({
      text: context,
      fileName: mat.fileName,
      language: mat.language,
      count: passes[0].count,
      scopeLabel: passes[0].scope,
      mcqRatio: 0.75,
      pageStart,
      pageEnd,
    }, { userId, subjectId: mat.subjectId, materialId: id, kind: "exam" }));
    let attempt = 0;
    while (collected.length < EXAM_QUESTION_COUNT && attempt < 2) {
      attempt += 1;
      const missing = EXAM_QUESTION_COUNT - collected.length;
      // Ask for a few extra to give us slack against duplicates.
      const ask = Math.min(EXAM_QUESTION_COUNT, missing + 4);
      try {
        const more = await generateQuestionsWithGemini({
          text: context,
          fileName: mat.fileName,
          language: mat.language,
          count: ask,
          scopeLabel: `أسئلة إضافية لاستكمال امتحان نهائي شامل (${missing} سؤالاً متبقياً) — تنويع في الموضوعات وتجنّب أي تكرار للأفكار السابقة`,
          mcqRatio: 0.75,
          pageStart,
          pageEnd,
        }, { userId, subjectId: mat.subjectId, materialId: id, kind: "exam-backfill" });
        addUnique(more);
      } catch (e: any) {
        console.warn("[materials/exam] backfill pass failed:", e?.message || e);
        break;
      }
    }
    if (collected.length < EXAM_QUESTION_COUNT) {
      return res.status(502).json({ error: "EXAM_GEN_TOO_FEW", got: collected.length, required: EXAM_QUESTION_COUNT });
    }
    const trimmed = collected.slice(0, EXAM_QUESTION_COUNT);
    const [row] = await db.insert(quizAttemptsTable).values({
      userId,
      materialId: id,
      subjectId: mat.subjectId,
      kind: "exam",
      chapterIndex: null,
      chapterTitle: null,
      questions: JSON.stringify(trimmed),
      totalQuestions: trimmed.length,
      status: "in_progress",
    }).returning();

    res.json({
      attemptId: row.id,
      kind: "exam",
      totalQuestions: trimmed.length,
      questions: questionsForClient(trimmed),
    });
  } catch (e: any) {
    console.error("[materials/exam] error:", e?.message || e);
    res.status(500).json({ error: "EXAM_GEN_FAILED" });
  }
});

// ── POST /api/materials/quiz-attempts/:attemptId/submit  { answers } ────────
router.post("/materials/quiz-attempts/:attemptId/submit", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const attemptId = Number(req.params.attemptId);
  if (!Number.isFinite(attemptId)) return res.status(400).json({ error: "bad id" });

  const [attempt] = await db
    .select()
    .from(quizAttemptsTable)
    .where(and(eq(quizAttemptsTable.id, attemptId), eq(quizAttemptsTable.userId, userId)));
  if (!attempt) return res.status(404).json({ error: "Not found" });
  if (attempt.status === "submitted") {
    return res.status(409).json({ error: "ALREADY_SUBMITTED", attemptId });
  }

  const userAnswers: Record<string, string> = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  let questions: QuizQuestion[] = [];
  try { questions = JSON.parse(attempt.questions); } catch { questions = []; }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(409).json({ error: "ATTEMPT_HAS_NO_QUESTIONS" });
  }

  // Grade MCQs locally; collect short answers for batch grading.
  const perResults: { id: string; correct: boolean; given: string; expected: string; explanation?: string; topic?: string; feedback?: string; page?: number | null }[] = [];
  const shortToGrade: { id: string; prompt: string; expected: string; given: string }[] = [];

  for (const q of questions) {
    const given = String(userAnswers[q.id] ?? "").trim();
    if (q.type === "mcq") {
      const correct = !!given && normalizeText(given) === normalizeText(q.answer);
      perResults.push({ id: q.id, correct, given, expected: q.answer, explanation: q.explanation, topic: q.topic, page: q.page ?? null });
    } else {
      shortToGrade.push({ id: q.id, prompt: q.prompt, expected: q.answer, given });
      perResults.push({ id: q.id, correct: false, given, expected: q.answer, explanation: q.explanation, topic: q.topic, page: q.page ?? null });
    }
  }

  if (shortToGrade.length > 0) {
    const graded = await gradeShortAnswers(shortToGrade, { userId, subjectId: attempt.subjectId ?? null, materialId: attempt.materialId ?? null });
    for (const item of perResults) {
      const g = graded[item.id];
      if (!g) continue;
      item.correct = g.correct;
      item.feedback = g.feedback;
    }
  }

  const correctCount = perResults.filter((r) => r.correct).length;
  const total = perResults.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Weak-area analysis: group missed questions by topic, take the top 5 by miss count.
  const missedTopics = new Map<string, number>();
  for (const r of perResults) {
    if (r.correct) continue;
    const t = (r.topic || "موضوع غير محدّد").trim();
    missedTopics.set(t, (missedTopics.get(t) ?? 0) + 1);
  }
  const weakAreas = Array.from(missedTopics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, missed]) => ({ topic, missed }));

  await db
    .update(quizAttemptsTable)
    .set({
      answers: JSON.stringify(userAnswers),
      perQuestionResults: JSON.stringify(perResults),
      weakAreas: JSON.stringify(weakAreas),
      totalQuestions: total,
      correctCount,
      score,
      status: "submitted",
      submittedAt: new Date(),
    })
    .where(eq(quizAttemptsTable.id, attemptId));

  res.json({
    attemptId,
    kind: attempt.kind,
    chapterIndex: attempt.chapterIndex,
    chapterTitle: attempt.chapterTitle,
    score,
    totalQuestions: total,
    correctCount,
    weakAreas,
    results: perResults,
    questions, // full questions including correct answers, for review screen
  });
});

// ── GET /api/materials/quiz-attempts/:attemptId ──────────────────────────────
router.get("/materials/quiz-attempts/:attemptId", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const attemptId = Number(req.params.attemptId);
  if (!Number.isFinite(attemptId)) return res.status(400).json({ error: "bad id" });

  const [attempt] = await db
    .select()
    .from(quizAttemptsTable)
    .where(and(eq(quizAttemptsTable.id, attemptId), eq(quizAttemptsTable.userId, userId)));
  if (!attempt) return res.status(404).json({ error: "Not found" });

  let questions: QuizQuestion[] = [];
  try { questions = JSON.parse(attempt.questions); } catch { questions = []; }
  let perResults: any[] = [];
  try { perResults = JSON.parse(attempt.perQuestionResults); } catch { perResults = []; }
  let weakAreas: any[] = [];
  try { weakAreas = JSON.parse(attempt.weakAreas); } catch { weakAreas = []; }

  res.json({
    attemptId: attempt.id,
    kind: attempt.kind,
    chapterIndex: attempt.chapterIndex,
    chapterTitle: attempt.chapterTitle,
    status: attempt.status,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    weakAreas,
    questions: attempt.status === "submitted" ? questions : questionsForClient(questions),
    results: perResults,
    createdAt: attempt.createdAt,
    submittedAt: attempt.submittedAt,
  });
});

// ── GET /api/materials/:id/quiz-attempts → list past attempts (history) ──────
router.get("/materials/:id/quiz-attempts", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "bad id" });
  const mat = await loadMaterialOwned(userId, id);
  if (!mat) return res.status(404).json({ error: "Not found" });

  const rows = await db
    .select({
      id: quizAttemptsTable.id,
      kind: quizAttemptsTable.kind,
      chapterIndex: quizAttemptsTable.chapterIndex,
      chapterTitle: quizAttemptsTable.chapterTitle,
      status: quizAttemptsTable.status,
      score: quizAttemptsTable.score,
      totalQuestions: quizAttemptsTable.totalQuestions,
      correctCount: quizAttemptsTable.correctCount,
      weakAreas: quizAttemptsTable.weakAreas,
      createdAt: quizAttemptsTable.createdAt,
      submittedAt: quizAttemptsTable.submittedAt,
    })
    .from(quizAttemptsTable)
    .where(and(eq(quizAttemptsTable.userId, userId), eq(quizAttemptsTable.materialId, id)))
    .orderBy(desc(quizAttemptsTable.createdAt))
    .limit(30);

  const attempts = rows.map((r) => {
    let weakAreas: any[] = [];
    try { weakAreas = JSON.parse(r.weakAreas); } catch { weakAreas = []; }
    return { ...r, weakAreas };
  });
  res.json({ materialId: id, attempts });
});

// ─────────────────────────────────────────────────────────────────────────────
// Backfill: re-extract per-page chunks for older "ready" materials that were
// processed before the per-page citation system existed. Only touches rows
// that have zero rows in material_chunks. Leaves course_materials.status alone
// — failures are logged but do not flip a working material to "error".
// ─────────────────────────────────────────────────────────────────────────────
type BackfillResult = { ok: boolean; pages: number; reason?: string };

async function reprocessChunksOnly(materialId: number): Promise<BackfillResult> {
  const [row] = await db.select().from(courseMaterialsTable).where(eq(courseMaterialsTable.id, materialId));
  if (!row) return { ok: false, pages: 0, reason: "not_found" };

  const pageTexts = new Map<number, string>();
  let pageCount = 0;
  let buf: Buffer;

  try {
    buf = await loadMaterialBuffer(row);
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) return { ok: false, pages: 0, reason: "file_missing" };
    return { ok: false, pages: 0, reason: `download_failed: ${String(e?.message || e).slice(0, 120)}` };
  }

  {
    const extracted = await extractPdfTextPerPage(buf);
    if (extracted.encrypted) return { ok: false, pages: 0, reason: "encrypted" };
    pageCount = extracted.totalPages;
    for (const [n, t] of extracted.pages.entries()) pageTexts.set(n, t);
  }

  // OCR fallback for scanned PDFs — same heuristic as processMaterial.
  const totalChars = Array.from(pageTexts.values()).join("").length;
  const looksScanned = totalChars < 200 || (pageCount > 0 && totalChars / Math.max(pageCount, 1) < 80);
  if (looksScanned) {
    try {
      const ocr = await ocrPdfWithGemini(buf, pageCount, { userId: row.userId, subjectId: row.subjectId, materialId });
      const ocrTextTrimmed = (ocr?.text || "").trim();
      if (ocrTextTrimmed.length > totalChars) {
        const ocrPages = splitOcrTextIntoPages(ocrTextTrimmed);
        if (ocrPages.size > 0) {
          pageTexts.clear();
          for (const [n, t] of ocrPages.entries()) pageTexts.set(n, t);
        }
      }
    } catch (e: any) {
      console.warn("[materials/backfill] OCR failed for", materialId, e?.message || e);
    }
  }

  if (pageTexts.size === 0) return { ok: false, pages: 0, reason: "no_text" };

  try {
    await db.delete(materialChunksTable).where(eq(materialChunksTable.materialId, materialId));
    const records: { materialId: number; userId: number; subjectId: string; pageNumber: number; chunkIndex: number; content: string }[] = [];
    for (const [page, text] of Array.from(pageTexts.entries()).sort((a, b) => a[0] - b[0])) {
      const slices = sliceLongPage(text, 2000);
      slices.forEach((slice, idx) => {
        if (slice.trim().length === 0) return;
        records.push({
          materialId,
          userId: row.userId,
          subjectId: row.subjectId,
          pageNumber: page,
          chunkIndex: idx,
          content: slice,
        });
      });
    }
    const BATCH = 200;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      if (batch.length > 0) await db.insert(materialChunksTable).values(batch);
    }
    return { ok: true, pages: pageTexts.size };
  } catch (e: any) {
    return { ok: false, pages: 0, reason: `insert_failed: ${String(e?.message || e).slice(0, 120)}` };
  }
}

async function listMaterialsMissingChunks(): Promise<number[]> {
  const result = await db.execute(sql`
    SELECT cm.id AS id
    FROM course_materials cm
    LEFT JOIN material_chunks mc ON mc.material_id = cm.id
    WHERE cm.status = 'ready'
    GROUP BY cm.id
    HAVING COUNT(mc.id) = 0
    ORDER BY cm.id ASC
  `);
  return (result.rows as any[]).map((r) => Number(r.id ?? r.ID));
}

async function requireAdmin(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

// GET /api/admin/materials/backfill-chunks  → preview how many rows need it
router.get("/admin/materials/backfill-chunks", async (req, res): Promise<any> => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const ids = await listMaterialsMissingChunks();
  res.json({ pendingCount: ids.length, ids });
});

// POST /api/admin/materials/backfill-chunks  { limit? }
//   Re-runs the per-page extractor on every "ready" material that has no
//   material_chunks rows yet. Failures (file missing, encrypted, …) are
//   logged but do not stop the loop or change the row's status.
router.post("/admin/materials/backfill-chunks", async (req, res): Promise<any> => {
  if (!(await requireAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const requestedLimit = Number(req.body?.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(Math.floor(requestedLimit), 200)
    : 50;

  const allIds = await listMaterialsMissingChunks();
  const ids = allIds.slice(0, limit);

  const results: { id: number; ok: boolean; pages?: number; reason?: string }[] = [];
  for (const id of ids) {
    try {
      const r = await reprocessChunksOnly(id);
      results.push({ id, ok: r.ok, pages: r.pages, reason: r.reason });
      if (r.ok) console.log("[materials/backfill] ok id=", id, "pages=", r.pages);
      else console.warn("[materials/backfill] skip id=", id, "reason=", r.reason);
    } catch (e: any) {
      const reason = String(e?.message || e).slice(0, 160);
      results.push({ id, ok: false, reason });
      console.warn("[materials/backfill] threw id=", id, reason);
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  res.json({
    totalPending: allIds.length,
    processed: ids.length,
    remaining: Math.max(0, allIds.length - ids.length),
    succeeded,
    failed: ids.length - succeeded,
    results,
  });
});

export default router;
