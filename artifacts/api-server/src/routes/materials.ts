import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  courseMaterialsTable,
  userSubjectTeachingModesTable,
  userSubjectSubscriptionsTable,
  usersTable,
} from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();

const MAX_PDFS_PER_SUBJECT_PAID = 4;
const MAX_PDFS_FREE_TOTAL = 1;
const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024; // 60MB
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
      createdAt: courseMaterialsTable.createdAt,
    })
    .from(courseMaterialsTable)
    .where(and(
      eq(courseMaterialsTable.userId, userId),
      eq(courseMaterialsTable.subjectId, subjectId),
    ))
    .orderBy(desc(courseMaterialsTable.createdAt));

  res.json({ materials: rows });
});

// ── POST /api/materials/upload-url  { subjectId, fileName, fileSizeBytes } ────
router.post("/materials/upload-url", async (req, res): Promise<any> => {
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
});

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

  try {
    // Download PDF buffer from object storage
    const svc = new ObjectStorageService();
    const file = await svc.getObjectEntityFile(row.objectPath);
    const [buf] = await file.download();

    // 1) Try pdf-parse
    try {
      const pdfParseMod: any = await import("pdf-parse");
      const pdfParse = pdfParseMod.default || pdfParseMod;
      const result = await pdfParse(buf);
      extractedText = (result?.text || "").trim();
      pageCount = result?.numpages || 0;
    } catch (e: any) {
      console.warn("[materials/process] pdf-parse failed:", e?.message || e);
    }

    const looksScanned = extractedText.length < 200 || (pageCount > 0 && extractedText.length / Math.max(pageCount, 1) < 80);

    // 2) Fallback: Gemini vision OCR (cap to OCR_PAGE_LIMIT pages)
    if (looksScanned && process.env.GEMINI_API_KEY) {
      try {
        const ocrText = await ocrPdfWithGemini(buf, pageCount || 0);
        if (ocrText.trim().length > extractedText.length) {
          extractedText = ocrText.trim();
        }
      } catch (e: any) {
        console.warn("[materials/process] OCR failed:", e?.message || e);
      }
    }

    if (!extractedText || extractedText.length < 50) {
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
