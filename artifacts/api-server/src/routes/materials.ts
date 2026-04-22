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

  if (!row) {
    return res.json({ mode: "unset", activeMaterialId: null });
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
    let progress: { chaptersTotal: number; completedCount: number; currentChapterIndex: number; currentChapterTitle: string | null } | null = null;
    if (r.status === "ready") {
      const p = await loadProgress(userId, r.id, r.outline ?? "");
      progress = {
        chaptersTotal: p.chapters.length,
        completedCount: p.completedChapterIndices.length,
        currentChapterIndex: p.currentChapterIndex,
        currentChapterTitle: p.chapters[p.currentChapterIndex] ?? null,
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
  if (!["advance", "set", "complete", "reset"].includes(action)) {
    return res.status(400).json({ error: "invalid action; expected advance|set|complete|reset" });
  }
  const chapterIndex = Number(req.body?.chapterIndex);
  if ((action === "set" || action === "complete") && !Number.isInteger(chapterIndex)) {
    return res.status(400).json({ error: "chapterIndex (integer) required for set/complete" });
  }
  const updated = await mutateProgress(userId, id, mat.outline ?? "", action, Number.isFinite(chapterIndex) ? chapterIndex : undefined);
  res.json({
    materialId: id,
    chapters: updated.chapters,
    currentChapterIndex: updated.currentChapterIndex,
    completedChapterIndices: updated.completedChapterIndices,
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

    // Auto-activate on first material if mode unset
    const [existingMode] = await db
      .select()
      .from(userSubjectTeachingModesTable)
      .where(and(
        eq(userSubjectTeachingModesTable.userId, userId),
        eq(userSubjectTeachingModesTable.subjectId, String(subjectId)),
      ));
    if (!existingMode || existingMode.mode === "unset" || !existingMode.activeMaterialId) {
      await db
        .insert(userSubjectTeachingModesTable)
        .values({ userId, subjectId: String(subjectId), mode: "professor", activeMaterialId: row.id, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userSubjectTeachingModesTable.userId, userSubjectTeachingModesTable.subjectId],
          set: { mode: "professor", activeMaterialId: row.id, updatedAt: new Date() },
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
  res.json(row);
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

    const looksScanned = !detectedError && (extractedText.length < 200 || (pageCount > 0 && extractedText.length / Math.max(pageCount, 1) < 80));

    // 2) Fallback: Gemini vision OCR (cap to OCR_PAGE_LIMIT pages)
    if (looksScanned && process.env.GEMINI_API_KEY) {
      try {
        const ocrText = await ocrPdfWithGemini(buf, pageCount || 0);
        if (ocrText.trim().length > extractedText.length) {
          extractedText = ocrText.trim();
          // OCR output uses "--- صفحة N ---" markers — split into pages.
          const ocrPages = splitOcrTextIntoPages(extractedText);
          if (ocrPages.size > 0) {
            pageTexts.clear();
            for (const [n, t] of ocrPages.entries()) pageTexts.set(n, t);
            if (!pageCount || pageCount < pageTexts.size) pageCount = pageTexts.size;
          }
        }
      } catch (e: any) {
        console.warn("[materials/process] OCR failed:", e?.message || e);
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
      return { chapters: [], currentChapterIndex: 0, completedChapterIndices: [] };
    }
    await db.insert(materialChapterProgressTable).values({
      userId,
      materialId,
      chapters: JSON.stringify(fresh),
      currentChapterIndex: 0,
      completedChapterIndices: "[]",
    }).onConflictDoNothing();
    return { chapters: fresh, currentChapterIndex: 0, completedChapterIndices: [] };
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

  let { currentChapterIndex, completedChapterIndices } = current;
  const completed = new Set(completedChapterIndices);
  const lastIdx = current.chapters.length - 1;

  if (action === "advance") {
    completed.add(currentChapterIndex);
    currentChapterIndex = Math.min(currentChapterIndex + 1, lastIdx);
  } else if (action === "complete" && Number.isInteger(chapterIndex)) {
    if (chapterIndex! >= 0 && chapterIndex! <= lastIdx) completed.add(chapterIndex!);
  } else if (action === "set" && Number.isInteger(chapterIndex)) {
    if (chapterIndex! >= 0 && chapterIndex! <= lastIdx) currentChapterIndex = chapterIndex!;
  } else if (action === "reset") {
    completed.clear();
    currentChapterIndex = 0;
  }

  const completedArr = Array.from(completed).sort((a, b) => a - b);
  await db.update(materialChapterProgressTable)
    .set({
      currentChapterIndex,
      completedChapterIndices: JSON.stringify(completedArr),
      updatedAt: new Date(),
    })
    .where(and(
      eq(materialChapterProgressTable.userId, userId),
      eq(materialChapterProgressTable.materialId, materialId),
    ));

  return { chapters: current.chapters, currentChapterIndex, completedChapterIndices: completedArr };
}

// Convenience: advance the chapter for the active material in a subject (called
// from /ai/teach when the AI marks a stage complete in professor mode).
export async function advanceActiveMaterialChapter(userId: number, subjectId: string): Promise<LoadedProgress | null> {
  const ctx = await getActiveMaterialContext(userId, subjectId);
  if (!ctx?.material) return null;
  return mutateProgress(userId, ctx.material.id, ctx.material.outline ?? "", "advance");
}

// ── Helper exposed for ai/teach to load the active material context ────────────
export async function getActiveMaterialContext(userId: number, subjectId: string): Promise<{
  mode: string;
  material: { id: number; fileName: string; outline: string | null; summary: string | null; extractedText: string | null; language: string | null } | null;
} | null> {
  const [mode] = await db
    .select()
    .from(userSubjectTeachingModesTable)
    .where(and(
      eq(userSubjectTeachingModesTable.userId, userId),
      eq(userSubjectTeachingModesTable.subjectId, subjectId),
    ));
  if (!mode) return { mode: "unset", material: null };
  if (mode.mode !== "professor" || !mode.activeMaterialId) {
    return { mode: mode.mode, material: null };
  }
  const [mat] = await db
    .select({
      id: courseMaterialsTable.id,
      fileName: courseMaterialsTable.fileName,
      outline: courseMaterialsTable.outline,
      summary: courseMaterialsTable.summary,
      extractedText: courseMaterialsTable.extractedText,
      language: courseMaterialsTable.language,
      status: courseMaterialsTable.status,
    })
    .from(courseMaterialsTable)
    .where(eq(courseMaterialsTable.id, mode.activeMaterialId));
  if (!mat || mat.status !== "ready") return { mode: mode.mode, material: null };
  return { mode: mode.mode, material: mat };
}

export default router;
