import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  courseMaterialsTable,
  userSubjectTeachingModesTable,
  userSubjectSubscriptionsTable,
  usersTable,
  materialChapterProgressTable,
  materialChunksTable,
  quizAttemptsTable,
} from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

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

  // No saved row at all → check whether we can infer "professor" from prior
  // chapter-progress (e.g. a stale row was wiped). If a ready material exists,
  // restore the most recent one so the student keeps teaching from their PDF
  // instead of being asked to choose again.
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
      lastInteractedAt: string | null;
    } | null = null;
    if (r.status === "ready") {
      const p = await loadProgress(userId, r.id, r.outline ?? "");
      progress = {
        chaptersTotal: p.chapters.length,
        completedCount: p.completedChapterIndices.length,
        currentChapterIndex: p.currentChapterIndex,
        currentChapterTitle: p.chapters[p.currentChapterIndex] ?? null,
        chapters: p.chapters,
        completedChapterIndices: p.completedChapterIndices,
        skippedChapterIndices: p.skippedChapterIndices,
        lastInteractedAt: p.lastInteractedAt ? p.lastInteractedAt.toISOString() : null,
      };
    }
    const { outline: _omit, ...rest } = r;
    return { ...rest, progress };
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

  const p = await loadProgress(userId, id, mat.outline ?? "");
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
  const updated = await mutateProgress(userId, id, mat.outline ?? "", action, Number.isFinite(chapterIndex) ? chapterIndex : undefined);
  res.json({
    materialId: id,
    chapters: updated.chapters,
    currentChapterIndex: updated.currentChapterIndex,
    completedChapterIndices: updated.completedChapterIndices,
    skippedChapterIndices: updated.skippedChapterIndices,
  });
});

// ── POST /api/materials/upload-url (alias: /request-upload) ───────────────────
const requestUploadHandler = async (req: any, res: any): Promise<any> => {
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
router.post("/materials/finalize", async (req, res): Promise<any> => {
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
      createdAt: courseMaterialsTable.createdAt,
    })
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.id, id),
      eq(courseMaterialsTable.userId, userId),
    ));
  if (!row) return res.status(404).json({ error: "Not found" });
  const recentWeakAreas = await getRecentWeakAreasForMaterial(userId, id);
  res.json({ ...row, recentWeakAreas });
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

  // Try to delete from storage
  try {
    const svc = new ObjectStorageService();
    const file = await svc.getObjectEntityFile(row.objectPath);
    await file.delete({ ignoreNotFound: true });
  } catch (e) {
    // Continue — DB cleanup is more important
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

  let extractedText = "";
  let pageCount = 0;
  let language = "ar";
  let detectedError: string | null = null;
  // Per-page text collected during extraction. Index = page number (1-based).
  const pageTexts: Map<number, string> = new Map();

  try {
    // Download PDF buffer from object storage
    const svc = new ObjectStorageService();
    const file = await svc.getObjectEntityFile(row.objectPath);
    const [buf] = await file.download();

    // 1) Try pdf-parse with a pagerender callback so we capture text per page.
    try {
      const pdfParseMod: any = await import("pdf-parse");
      const pdfParse = pdfParseMod.default || pdfParseMod;
      let currentPage = 0;
      const pagerender = async (pageData: any) => {
        currentPage += 1;
        const myPage = currentPage;
        try {
          const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
          const items = tc?.items || [];
          // Reconstruct text — newline when y-coordinate jumps (best-effort).
          let lastY: number | null = null;
          const pieces: string[] = [];
          for (const it of items) {
            const str = (it?.str ?? "").toString();
            const y = Array.isArray(it?.transform) ? it.transform[5] : null;
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) pieces.push("\n");
            pieces.push(str);
            if (y !== null) lastY = y;
          }
          const pageText = pieces.join(" ").replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim();
          if (pageText) pageTexts.set(myPage, pageText);
          return pageText;
        } catch {
          return "";
        }
      };
      const result = await pdfParse(buf, { pagerender });
      extractedText = (result?.text || "").trim();
      pageCount = result?.numpages || pageTexts.size || 0;
      // If pagerender didn't capture but pdf-parse returned a single text blob,
      // we'll fall back to splitting by form-feed (\f) which pdf-parse uses
      // between pages.
      if (pageTexts.size === 0 && extractedText) {
        const split = extractedText.split(/\f/);
        split.forEach((t, idx) => {
          const trimmed = t.trim();
          if (trimmed) pageTexts.set(idx + 1, trimmed);
        });
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.warn("[materials/process] pdf-parse failed:", msg);
      if (/encrypt|password/i.test(msg)) {
        detectedError = "هذا الملف محمي بكلمة مرور. يرجى إزالة الحماية ثم رفعه مجدداً.";
      }
    }

    if (!detectedError && pageCount > MAX_PAGE_COUNT) {
      detectedError = `هذا الملف يحوي ${pageCount} صفحة، والحد الأقصى ${MAX_PAGE_COUNT} صفحة. قسّم الملف إلى أجزاء أصغر.`;
    }

    // Be more aggressive about deciding the file is scanned/has unusual fonts:
    // many slide-deck PDFs (e.g. "lec3 c++.pdf") return short pseudo-text from
    // pdf-parse but actually need OCR to be readable. Trigger OCR whenever the
    // average page yields fewer than ~120 chars, or the total is under 500.
    const avgPerPage = pageCount > 0 ? extractedText.length / pageCount : 0;
    const looksScanned = !detectedError && (
      extractedText.length < 500 ||
      (pageCount > 0 && avgPerPage < 120)
    );

    // 2) Fallback: Gemini vision OCR (cap to OCR_PAGE_LIMIT pages). Retry once
    //    on transient failures so a single network blip doesn't doom a slide
    //    deck to "فشل التحليل".
    if (looksScanned && process.env.GEMINI_API_KEY) {
      let ocrText = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          ocrText = await ocrPdfWithGemini(buf, pageCount || 0);
          if (ocrText.trim().length > 0) break;
        } catch (e: any) {
          console.warn(`[materials/process] OCR attempt ${attempt + 1} failed:`, e?.message || e);
        }
        // brief backoff before the retry
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
      }
      // Accept OCR even when it's only partially better than pdf-parse — slide
      // decks often yield a couple of dozen extra readable characters per page
      // that make the difference between "ready" and "error".
      if (ocrText.trim().length > Math.max(extractedText.length, 200)) {
        extractedText = ocrText.trim();
        // OCR output uses "--- صفحة N ---" markers — split into pages.
        const ocrPages = splitOcrTextIntoPages(extractedText);
        if (ocrPages.size > 0) {
          pageTexts.clear();
          for (const [n, t] of ocrPages.entries()) pageTexts.set(n, t);
          if (!pageCount || pageCount < pageTexts.size) pageCount = pageTexts.size;
        }
      }
    }

    if (!detectedError && (!extractedText || extractedText.length < 50)) {
      detectedError = "تعذّر استخراج نص قابل للقراءة من هذا الملف. حاول رفع نسخة أوضح.";
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
      const meta = await generateMaterialMetadata(extractedText, row.fileName, language);
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
      errorMessage: detectedError,
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
      } else if (modeRow.mode === "unset" || !modeRow.activeMaterialId) {
        await db
          .update(userSubjectTeachingModesTable)
          .set({ mode: "professor", activeMaterialId: materialId, updatedAt: new Date() })
          .where(eq(userSubjectTeachingModesTable.id, modeRow.id));
      } else if (modeRow.activeMaterialId) {
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

async function ocrPdfWithGemini(buf: Buffer, _pageCount: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const base64 = buf.toString("base64");
  const body = {
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: base64 } },
        {
          text: `استخرج النص الكامل من هذا المستند صفحة بصفحة. ابدأ كل صفحة بسطر "--- صفحة X ---".
لا تُلخّص ولا تُعدّل، انسخ النص العربي والإنجليزي حرفياً. ${_pageCount > OCR_PAGE_LIMIT ? `ركّز على الصفحات الأهم (الفهرس + أول ${OCR_PAGE_LIMIT} صفحة).` : ""}`,
        },
      ],
    }],
    generationConfig: { temperature: 0.0, maxOutputTokens: 8192 },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    console.warn("[ocr] gemini http", r.status, (await r.text()).slice(0, 200));
    return "";
  }
  const data: any = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p: any) => p?.text || "").join("\n").trim();
}

async function generateMaterialMetadata(text: string, fileName: string, language: string): Promise<{ outline: string; summary: string; starters: string }> {
  const key = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
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

export async function loadProgress(userId: number, materialId: number, outline: string): Promise<LoadedProgress> {
  const [row] = await db
    .select()
    .from(materialChapterProgressTable)
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));

  const fresh = parseChaptersFromOutline(outline);

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
): Promise<LoadedProgress> {
  const current = await loadProgress(userId, materialId, outline);
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
  return mutateProgress(userId, ctx.material.id, ctx.material.outline ?? "", "advance");
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
  material: { id: number; fileName: string; outline: string | null; summary: string | null; extractedText: string | null; language: string | null } | null;
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

async function generateQuestionsWithGemini(opts: {
  text: string;
  fileName: string;
  language: string | null;
  count: number;
  scopeLabel: string;
  mcqRatio?: number;
}): Promise<QuizQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const langWord = (opts.language ?? "ar") === "ar" ? "العربية" : "الإنجليزية";
  const sample = opts.text.slice(0, 80_000);
  const mcqCount = Math.max(1, Math.round(opts.count * (opts.mcqRatio ?? 0.7)));
  const shortCount = Math.max(1, opts.count - mcqCount);

  const prompt = `أنت مولّد امتحانات أكاديمي. اعتمد فقط على النص التالي من ملف "${opts.fileName}" (لغته الأساسية ${langWord})، ولا تخترع أي معلومة من خارجه.
المطلوب: ${opts.scopeLabel}.
أنشئ ${opts.count} سؤالاً متنوّعاً (${mcqCount} اختيار من متعدد + ${shortCount} إجابة قصيرة).

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
- اذكر page (رقم صفحة تقديري من النص إن أمكن، وإلا null).
- تجنّب الأسئلة المكرّرة أو التافهة.

النص:
"""
${sample}
"""`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`gemini http ${r.status}: ${body.slice(0, 200)}`);
  }
  const data: any = await r.json();
  const txt = stripJsonFence((data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join(""));
  let parsed: any;
  try { parsed = JSON.parse(txt); } catch (e) {
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
      // Make sure answer matches a choice (try fuzzy match on normalized form).
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

// Build a per-chapter context: the chapter title + best chunks retrieved by
// searching for the title keywords. Falls back to opening pages when nothing
// matches (e.g. very generic chapter titles).
async function buildChapterContext(materialId: number, fullText: string, chapterTitle: string): Promise<string> {
  const hits = await searchMaterialChunks(materialId, chapterTitle, 14);
  if (hits.length > 0) {
    return hits
      .sort((a, b) => a.pageNumber - b.pageNumber || a.chunkIndex - b.chunkIndex)
      .map((h) => `--- صفحة ${h.pageNumber} ---\n${h.content}`)
      .join("\n\n");
  }
  // Fallback: return the full extracted text (already truncated upstream).
  return fullText;
}

// Grade short-answer questions in a single Gemini call. Returns a map id→{correct, feedback}.
async function gradeShortAnswers(items: { id: string; prompt: string; expected: string; given: string }[]): Promise<Record<string, { correct: boolean; feedback: string }>> {
  const out: Record<string, { correct: boolean; feedback: string }> = {};
  if (items.length === 0) return out;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // No model — be lenient: any non-empty answer is half-credit (counted wrong here).
    for (const it of items) out[it.id] = { correct: false, feedback: "تعذّر التقييم التلقائي." };
    return out;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
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
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "QUIZ_GEN_UNAVAILABLE" });

  const progress = await loadProgress(userId, id, mat.outline ?? "");
  let chapterIndex: number | null = Number.isInteger(req.body?.chapterIndex)
    ? Number(req.body.chapterIndex)
    : progress.currentChapterIndex;
  if (!progress.chapters.length) chapterIndex = null;
  const chapterTitle = chapterIndex !== null ? (progress.chapters[chapterIndex] ?? null) : null;

  try {
    const context = chapterTitle
      ? await buildChapterContext(id, mat.extractedText, chapterTitle)
      : mat.extractedText;
    const scopeLabel = chapterTitle
      ? `أسئلة تختبر الفصل/القسم: "${chapterTitle}" فقط`
      : "أسئلة تغطّي الموضوعات الرئيسية في الملف";
    const desired = Math.min(QUIZ_QUESTION_COUNT.max, Math.max(QUIZ_QUESTION_COUNT.min, 8));
    const questions = await generateQuestionsWithGemini({
      text: context,
      fileName: mat.fileName,
      language: mat.language,
      count: desired,
      scopeLabel,
      mcqRatio: 0.7,
    });
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
      totalQuestions: trimmed.length,
      questions: questionsForClient(trimmed),
    });
  } catch (e: any) {
    console.error("[materials/quiz] error:", e?.message || e);
    res.status(500).json({ error: "QUIZ_GEN_FAILED" });
  }
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
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: "QUIZ_GEN_UNAVAILABLE" });

  try {
    // Ensure we hit exactly EXAM_QUESTION_COUNT questions. The model sometimes
    // returns fewer than asked, so we run up to 2 backfill passes that fill
    // only the missing slots. We also dedupe near-identical prompts.
    const seenPrompts = new Set<string>();
    const collected: QuizQuestion[] = [];
    const addUnique = (qs: QuizQuestion[]) => {
      for (const q of qs) {
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
      text: mat.extractedText,
      fileName: mat.fileName,
      language: mat.language,
      count: passes[0].count,
      scopeLabel: passes[0].scope,
      mcqRatio: 0.75,
    }));
    let attempt = 0;
    while (collected.length < EXAM_QUESTION_COUNT && attempt < 2) {
      attempt += 1;
      const missing = EXAM_QUESTION_COUNT - collected.length;
      // Ask for a few extra to give us slack against duplicates.
      const ask = Math.min(EXAM_QUESTION_COUNT, missing + 4);
      try {
        const more = await generateQuestionsWithGemini({
          text: mat.extractedText,
          fileName: mat.fileName,
          language: mat.language,
          count: ask,
          scopeLabel: `أسئلة إضافية لاستكمال امتحان نهائي شامل (${missing} سؤالاً متبقياً) — تنويع في الموضوعات وتجنّب أي تكرار للأفكار السابقة`,
          mcqRatio: 0.75,
        });
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
    const graded = await gradeShortAnswers(shortToGrade);
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
    const svc = new ObjectStorageService();
    const file = await svc.getObjectEntityFile(row.objectPath);
    [buf] = await file.download();
  } catch (e: any) {
    if (e instanceof ObjectNotFoundError) return { ok: false, pages: 0, reason: "file_missing" };
    return { ok: false, pages: 0, reason: `download_failed: ${String(e?.message || e).slice(0, 120)}` };
  }

  try {
    const pdfParseMod: any = await import("pdf-parse");
    const pdfParse = pdfParseMod.default || pdfParseMod;
    let currentPage = 0;
    const pagerender = async (pageData: any) => {
      currentPage += 1;
      const myPage = currentPage;
      try {
        const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
        const items = tc?.items || [];
        let lastY: number | null = null;
        const pieces: string[] = [];
        for (const it of items) {
          const str = (it?.str ?? "").toString();
          const y = Array.isArray(it?.transform) ? it.transform[5] : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) pieces.push("\n");
          pieces.push(str);
          if (y !== null) lastY = y;
        }
        const pageText = pieces.join(" ").replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim();
        if (pageText) pageTexts.set(myPage, pageText);
        return pageText;
      } catch {
        return "";
      }
    };
    const result = await pdfParse(buf, { pagerender });
    const extractedText = (result?.text || "").trim();
    pageCount = result?.numpages || pageTexts.size || 0;
    if (pageTexts.size === 0 && extractedText) {
      const split = extractedText.split(/\f/);
      split.forEach((t: string, idx: number) => {
        const trimmed = t.trim();
        if (trimmed) pageTexts.set(idx + 1, trimmed);
      });
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/encrypt|password/i.test(msg)) return { ok: false, pages: 0, reason: "encrypted" };
    return { ok: false, pages: 0, reason: `pdf_parse_failed: ${msg.slice(0, 120)}` };
  }

  // OCR fallback for scanned PDFs — same heuristic as processMaterial.
  const totalChars = Array.from(pageTexts.values()).join("").length;
  const looksScanned = totalChars < 200 || (pageCount > 0 && totalChars / Math.max(pageCount, 1) < 80);
  if (looksScanned && process.env.GEMINI_API_KEY) {
    try {
      const ocrText = await ocrPdfWithGemini(buf, pageCount);
      if (ocrText.trim().length > totalChars) {
        const ocrPages = splitOcrTextIntoPages(ocrText.trim());
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
