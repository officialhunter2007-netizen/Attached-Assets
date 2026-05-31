// ─────────────────────────────────────────────────────────────────────────────
// v4 task #8 — Booklet path routes.
//
// All endpoints relative to /api (mounted in routes/index.ts).
//
//   POST /v4/booklet/upload          (multipart) — create + process booklet
//   GET  /v4/booklet/list/:slug                 — list user's booklets
//   GET  /v4/booklet/:id                        — readback (tree + meta)
//   POST /v4/booklet/teach           (SSE)      — RAG teaching turn
//
// Gem semantics:
//   - Prep cost (extract + tree-gen + embeddings) is charged ONCE per
//     booklet from the v4 wallet via chargeV4Ai with a deterministic
//     requestId. Failures refund.
//   - Each teach turn is charged like /v4/teach: post-stream chargeV4Ai
//     using a server-generated requestId.
//
// CSRF: requireSameOriginCsrf on all POSTs (same pattern as v4_path /
// v4_teach).
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomBytes, createHash } from "crypto";
import multer from "multer";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  v4StudentBookletsTable,
  v4BookletChunksTable,
  v4StudentPathsTable,
  v4SpecialtiesTable,
  gemLedgerTable,
  type V4StudentBooklet,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  extractBookletPages,
  chunkPages,
  generateBookletTree,
  embedAndStoreChunks,
  getBooklet,
  findLessonInTree,
  retrieveBookletContext,
  buildBookletTeacherPrompt,
  type BookletTree,
} from "../lib/v4-booklet";
import { chargeV4Ai, refundV4Ai, getOrCreateV4Wallet } from "../lib/v4-gem-wallet";
import { streamGeminiTeaching, type GeminiMessage } from "../lib/gemini-stream";
import { V4_TEACHING_MODEL, assertGeminiForTeaching } from "../lib/v4-teaching-core";
import { emitFriendlyAiFailure } from "./ai";

const router: IRouter = Router();

// ── auth + csrf helpers (parallel to v4_path) ─────────────────────────────
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

// ── multer: in-memory PDF, 25 MB cap ──────────────────────────────────────
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
});

// Estimated prep cost charged upfront against the v4 wallet. Real cost is
// hard to know before extraction; we pick a flat $0.15 (~150 gems) which
// matches the spec's $0.10-$0.30 range. Any over-charge is refunded on
// failure; under-charge is platform-absorbed (acceptable per spec).
const BOOKLET_PREP_USD = 0.15;

// ── POST /v4/booklet/upload  (multipart: file=<pdf>, slug=<subject slug>, title=<...>) ─
router.post(
  "/v4/booklet/upload",
  requireUser,
  requireSameOriginCsrf,
  upload.single("file"),
  async (req, res) => {
    const uid: number = (req as any).userId;
    const file = (req as any).file as Express.Multer.File | undefined;
    const slug = String((req.body as any)?.slug ?? "").trim();
    const titleRaw = String((req.body as any)?.title ?? "").trim();

    if (!file) { res.status(400).json({ error: "file required" }); return; }
    if (!slug) { res.status(400).json({ error: "slug required" }); return; }
    if (file.mimetype && !/pdf/i.test(file.mimetype) && !/pdf$/i.test(file.originalname || "")) {
      res.status(400).json({ error: "pdf_only" });
      return;
    }

    // Verify specialty exists (we don't require v4 enabled — booklets can
    // run on any subject_id key, but we prefer the v4 slug so the wallet
    // and the FE path-choice align).
    const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, slug));
    if (!sp) { res.status(404).json({ error: "specialty_not_found" }); return; }

    // Bootstrap wallet (welcome gift +100 first-touch) BEFORE charging prep.
    try { await getOrCreateV4Wallet(uid, slug); } catch {}

    // Full-file SHA-256 (not a prefix hash) so different PDFs with the
    // same first-N bytes don't collide and suppress each other's billing.
    const contentHash = createHash("sha256").update(file.buffer).digest("hex");
    // Full hex + explicit user + subject scope. The ledger uniqueness is
    // (user_id, request_id); a per-subject scope means a re-upload of the
    // same PDF to a *different* subject triggers its own charge (correct
    // — different wallets, different students-of-record).
    const prepRequestId = `v4_booklet_prep:${uid}:${slug}:${contentHash}`;

    // ── 1. Explicit dedupe at the application layer: if the same user
    //       already uploaded this exact PDF for this subject, reuse that
    //       booklet (no extra row, no extra charge). The ledger-level
    //       idempotency in chargeV4Ai is defense-in-depth only.
    try {
      const [existing] = await db
        .select()
        .from(v4StudentBookletsTable)
        .where(and(
          eq(v4StudentBookletsTable.userId, uid),
          eq(v4StudentBookletsTable.subjectId, slug),
          eq(v4StudentBookletsTable.contentHash, contentHash),
        ));
      if (existing) {
        // Retry semantics: only reuse rows that are still healthy. A
        // prior `failed` attempt (transient OpenAI/Gemini/DB hiccup)
        // must NOT trap the user — we delete the failed row + any
        // orphan chunks, refund the original prep charge if it ever
        // landed (best-effort), and fall through to re-process from a
        // clean slate. The partial unique index excludes failed rows
        // so the re-insert below won't conflict.
        if (existing.status === "failed") {
          try {
            await db.delete(v4BookletChunksTable)
              .where(eq(v4BookletChunksTable.bookletId, existing.id));
            await db.delete(v4StudentBookletsTable)
              .where(eq(v4StudentBookletsTable.id, existing.id));
            // Best-effort refund of the previous prep attempt so the
            // student isn't double-charged on retry. Idempotent via
            // requestId; safe to call when no original charge existed.
            try {
              await refundV4Ai({
                requestId: prepRequestId,
                userId: uid,
                subjectId: slug,
                source: "v4_booklet_prep",
                reason: "retry_after_failed",
              });
            } catch {}
            logger.info?.(`[v4/booklet/upload] retrying after prior failed booklet=${existing.id} user=${uid}`);
          } catch (e: any) {
            logger.warn?.(`[v4/booklet/upload] failed-row cleanup error: ${String(e?.message ?? e)}`);
            // Fall through anyway — the unique index is partial on
            // status, so re-insert may still succeed.
          }
        } else {
          res.json({ bookletId: existing.id, status: existing.status, dedup: true });
          return;
        }
      }
    } catch (e: any) {
      // Non-fatal — fall through to fresh insert. Worst case is the
      // partial unique index below rejects with 23505 and we handle it.
      logger.warn?.(`[v4/booklet/upload] dedupe lookup failed: ${String(e?.message ?? e)}`);
    }

    // ── 2. Insert booklet row (status=processing). Handle the race where
    //       a concurrent request just inserted the same (uid, slug, hash). ──
    const title = titleRaw.slice(0, 160) || (file.originalname || "ملزمة").replace(/\.pdf$/i, "").slice(0, 160);
    let inserted: V4StudentBooklet;
    try {
      const [row] = await db
        .insert(v4StudentBookletsTable)
        .values({
          userId: uid,
          subjectId: slug,
          title,
          pagesCount: 0,
          instructionTree: {},
          status: "processing",
          prepCostUsd: BOOKLET_PREP_USD,
          contentHash,
        })
        .returning();
      inserted = row;
    } catch (e: any) {
      // 23505 = unique_violation on (user_id, subject_id, content_hash).
      // Race winner already inserted — reuse it.
      if (String(e?.code) === "23505") {
        const [winner] = await db
          .select()
          .from(v4StudentBookletsTable)
          .where(and(
            eq(v4StudentBookletsTable.userId, uid),
            eq(v4StudentBookletsTable.subjectId, slug),
            eq(v4StudentBookletsTable.contentHash, contentHash),
          ));
        if (winner) { res.json({ bookletId: winner.id, status: winner.status, dedup: true }); return; }
      }
      logger.error?.(`[v4/booklet/upload] insert failed user=${uid}: ${String(e?.message ?? e)}`);
      res.status(500).json({ error: "db_insert_failed" });
      return;
    }

    // ── 3. Charge prep cost upfront. Three outcomes from chargeV4Ai:
    //       a) charged=true → proceed.
    //       b) charged=false + (noWallet || insufficient) → real billing
    //          failure → mark booklet failed and refund.
    //       c) charged=false with NEITHER flag → ledger-level dedupe hit
    //          (e.g. a prior attempt left a ledger row but failed to insert
    //          this booklet row). Treat as already-paid and proceed.
    const charge = await chargeV4Ai({
      requestId: prepRequestId,
      userId: uid,
      subjectId: slug,
      costUsd: BOOKLET_PREP_USD,
      source: "v4_booklet_prep",
      model: "gemini-2.0-flash+text-embedding-3-small",
      note: `تجهيز ملزمة: ${title}`,
    });
    if (!charge.charged) {
      if (charge.noWallet || charge.insufficient) {
        await db.update(v4StudentBookletsTable)
          .set({ status: "failed", errorMessage: charge.noWallet ? "لا توجد محفظة. اشترك أولاً." : "رصيد غير كافٍ لتجهيز الملزمة." })
          .where(eq(v4StudentBookletsTable.id, inserted.id));
        res.status(402).json({
          error: charge.noWallet ? "no_wallet" : "insufficient_gems",
          bookletId: inserted.id,
          needsGems: Math.ceil(BOOKLET_PREP_USD * 1000),
        });
        return;
      }
      // chargeV4Ai's NO_OP is overloaded: it returns no flags both for a
      // genuine ledger-dedupe hit AND for unexpected transaction errors.
      // Disambiguate by asking the ledger directly — only treat the
      // upload as "already paid" if a matching ledger row exists.
      const [ledgerHit] = await db
        .select({ id: gemLedgerTable.id })
        .from(gemLedgerTable)
        .where(and(
          eq(gemLedgerTable.userId, uid),
          eq((gemLedgerTable as any).requestId, prepRequestId),
        ))
        .limit(1);
      if (!ledgerHit) {
        // Real failure (DB / driver error inside chargeV4Ai). Mark failed,
        // do NOT proceed — caller would otherwise get free processing.
        await db.update(v4StudentBookletsTable)
          .set({ status: "failed", errorMessage: "تعذّر خصم الجواهر مؤقتاً. أعد المحاولة." })
          .where(eq(v4StudentBookletsTable.id, inserted.id));
        res.status(503).json({ error: "charge_failed", bookletId: inserted.id });
        return;
      }
      // Real ledger-dedupe hit → previous attempt already paid. Proceed.
    }

    // ── 3. Respond immediately, process in background. ─────────────────
    res.json({ bookletId: inserted.id, status: "processing" });

    // ── 4. Background pipeline. ────────────────────────────────────────
    (async () => {
      const refund = async (reason: string) => {
        try {
          await refundV4Ai({
            requestId: prepRequestId,
            userId: uid,
            subjectId: slug,
            source: "v4_booklet_prep",
            reason,
          });
        } catch {}
      };

      const setStage = async (stage: string, percent: number) => {
        try {
          await db.update(v4StudentBookletsTable)
            .set({ processingStage: stage, processingPercent: Math.max(0, Math.min(100, percent)) })
            .where(eq(v4StudentBookletsTable.id, inserted.id));
        } catch {}
      };

      try {
        await setStage("extracting", 5);
        const extracted = await extractBookletPages(file.buffer);
        if (extracted.encrypted) throw new Error("ملف محمي بكلمة مرور.");
        if (extracted.totalPages === 0 || extracted.pages.size === 0) {
          throw new Error("تعذّر استخراج نص من الملف (قد يكون مسحاً ضوئياً يحتاج OCR).");
        }
        if (extracted.totalPages > 400) {
          throw new Error(`الملف ${extracted.totalPages} صفحة. الحد الأقصى ٤٠٠ صفحة لمسار الملازم.`);
        }
        await setStage("extracting", 100);

        await db.update(v4StudentBookletsTable)
          .set({ pagesCount: extracted.totalPages })
          .where(eq(v4StudentBookletsTable.id, inserted.id));

        await setStage("chunking", 20);
        const chunks = chunkPages(extracted.pages);
        if (!chunks.length) throw new Error("لم نتمكن من تقسيم الملف.");
        await setStage("chunking", 100);

        await setStage("embedding", 30);
        await embedAndStoreChunks(inserted.id, chunks);
        await setStage("embedding", 100);

        await setStage("binding", 40);
        const tree = await generateBookletTree({
          pages: extracted.pages,
          totalPages: extracted.totalPages,
          specialtyName: sp.name,
          bookletTitle: title,
        });
        await setStage("binding", 100);

        await db.update(v4StudentBookletsTable)
          .set({ status: "ready", instructionTree: tree as any, processingStage: "done", processingPercent: 100 })
          .where(eq(v4StudentBookletsTable.id, inserted.id));
        logger.info?.(`[v4/booklet/upload] booklet=${inserted.id} ready (${extracted.totalPages}p, ${chunks.length} chunks)`);
      } catch (err: any) {
        const msg = String(err?.message ?? err).slice(0, 500);
        logger.error?.(`[v4/booklet/upload] processing failed booklet=${inserted.id} user=${uid}: ${msg}`);
        try {
          await db.update(v4StudentBookletsTable)
            .set({ status: "failed", errorMessage: msg })
            .where(eq(v4StudentBookletsTable.id, inserted.id));
        } catch {}
        await refund("processing_failed");
      }
    })().catch(() => {});
  },
);

// ── GET /v4/booklet/list/:slug ─────────────────────────────────────────────
router.get("/v4/booklet/list/:slug", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const rows = await db
      .select({
        id: v4StudentBookletsTable.id,
        title: v4StudentBookletsTable.title,
        pagesCount: v4StudentBookletsTable.pagesCount,
        status: v4StudentBookletsTable.status,
        errorMessage: v4StudentBookletsTable.errorMessage,
        createdAt: v4StudentBookletsTable.createdAt,
      })
      .from(v4StudentBookletsTable)
      .where(and(
        eq(v4StudentBookletsTable.userId, uid),
        eq(v4StudentBookletsTable.subjectId, slug),
      ))
      .orderBy(desc(v4StudentBookletsTable.id));
    res.json({ booklets: rows });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/list] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/booklet/:id ────────────────────────────────────────────────────
router.get("/v4/booklet/:id", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "bad_id" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    res.json({
      booklet: {
        id: row.id,
        title: row.title,
        subjectId: row.subjectId,
        pagesCount: row.pagesCount,
        status: row.status,
        processingStage: (row as any).processingStage ?? "extracting",
        processingPercent: (row as any).processingPercent ?? 0,
        errorMessage: row.errorMessage,
        tree: row.instructionTree ?? {},
        createdAt: row.createdAt,
      },
    });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/get] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/booklet/teach  (SSE) ─────────────────────────────────────────
// Body: { bookletId, lessonCode, message, history? }
router.post("/v4/booklet/teach", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const body: any = req.body ?? {};
  const bookletId = Number(body.bookletId);
  const lessonCode = String(body.lessonCode ?? "").trim();
  const message = String(body.message ?? "").trim();
  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history)
    ? body.history
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
    : [];

  if (!Number.isInteger(bookletId) || !lessonCode || !message) {
    res.status(400).json({ error: "bookletId, lessonCode, message required" });
    return;
  }

  try { assertGeminiForTeaching(V4_TEACHING_MODEL); } catch (e) {
    emitFriendlyAiFailure(res, "v4/booklet/teach:model-lock", e);
    return;
  }

  // ── 1. Resolve booklet + lesson ──────────────────────────────────────
  const booklet = await getBooklet(bookletId, uid);
  if (!booklet) { res.status(404).json({ error: "booklet_not_found" }); return; }
  if (booklet.status !== "ready") {
    res.status(409).json({ error: "booklet_not_ready", status: booklet.status });
    return;
  }
  const tree = (booklet.instructionTree ?? { units: [] }) as BookletTree;
  const lesson = findLessonInTree(tree, lessonCode);
  if (!lesson) { res.status(404).json({ error: "lesson_not_found" }); return; }

  // Spec — record this booklet as the student's *active* path for the
  // subject (pathType='booklet', bookletId=X). Best-effort: failure here
  // must never block teaching. The (user, subject) unique-index on
  // v4_student_paths means switching between booklet and custom paths
  // overwrites the active one; analytics joins gem_ledger entries to
  // pathType/bookletId for "what was this charge for" attribution.
  try {
    const now = new Date();
    await db
      .insert(v4StudentPathsTable)
      .values({
        userId: uid,
        subjectId: booklet.subjectId,
        versionId: 0,
        pathType: "booklet",
        bookletId: booklet.id,
        startMode: "from_zero",
        startingLevelIndex: 1,
        currentLessonCode: lessonCode,
        unlockedLessonCodes: [],
        createdAt: now,
        updatedAt: now,
      } as any)
      .onConflictDoUpdate({
        target: [v4StudentPathsTable.userId, v4StudentPathsTable.subjectId],
        set: {
          pathType: "booklet",
          bookletId: booklet.id,
          currentLessonCode: lessonCode,
          updatedAt: now,
        } as any,
      });
  } catch (e: any) {
    logger.warn?.(`[v4/booklet/teach] active-path upsert failed (non-fatal): ${String(e?.message ?? e)}`);
  }
  // Spec: lessons that couldn't be page-bound by the LLM are marked
  // needsReview and must NOT be taught (would invite hallucinated
  // citations). The FE renders them with a "needs supervisor review"
  // badge and disables the open-session button.
  if (lesson.needsReview) {
    res.status(409).json({
      error: "lesson_needs_review",
      reason: lesson.needsReviewReason ?? "page_binding_unresolved",
      message: "هذا الدرس بحاجة لمراجعة مشرف قبل أن يبدأ التدريس (لم نتمكن من ربطه بصفحات محددة بدقة).",
    });
    return;
  }
  const unit = (tree.units ?? []).find((u) => u.lessons.some((l) => l.code === lessonCode));
  const unitName = unit?.name ?? "—";
  const slug = booklet.subjectId;

  const requestId = `v4bt_${Date.now()}_${randomBytes(8).toString("hex")}`;

  // ── 2. Build retrieval context. ──────────────────────────────────────
  let systemPrompt: string;
  try {
    const retrieved = await retrieveBookletContext({
      bookletId,
      lessonPages: lesson.pages,
      query: message,
    });
    systemPrompt = buildBookletTeacherPrompt({
      specialtyName: slug,
      bookletTitle: booklet.title,
      lesson,
      unitName,
      retrieved: retrieved.chunks,
    });
  } catch (e) {
    emitFriendlyAiFailure(res, "v4/booklet/teach:retrieval", e);
    return;
  }

  // ── 3. SSE stream. ───────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    try { if (!res.writableEnded) res.write(`: ping ${Date.now()}\n\n`); } catch {}
  }, 15_000);
  const abort = new AbortController();
  const onClose = () => { try { abort.abort(); } catch {} };
  req.on("close", onClose);

  const geminiMessages: GeminiMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const result = await streamGeminiTeaching({
      systemPrompt,
      messages: geminiMessages,
      maxOutputTokens: 1400,
      model: V4_TEACHING_MODEL,
      temperature: 0.6,
      signal: abort.signal,
      logTag: `v4-booklet-teach:${bookletId}:${lessonCode}`,
      onChunk: (text) => {
        if (!text || res.writableEnded) return;
        // Strip the SESSION_COMPLETE tag from the visible stream.
        const display = text.replace(/\[SESSION_COMPLETE\]/g, "");
        if (display) {
          try { res.write(`data: ${JSON.stringify({ content: display })}\n\n`); } catch {}
        }
      },
    });

    // Charge wallet post-stream.
    const usdCost = ((result.inputTokens || 0) * 0.10 + (result.outputTokens || 0) * 0.40) / 1_000_000;
    let charged = false;
    if (usdCost > 0) {
      const c = await chargeV4Ai({
        requestId,
        userId: uid,
        subjectId: slug,
        costUsd: usdCost,
        source: "v4_booklet_teach",
        model: V4_TEACHING_MODEL,
        note: `ملزمة:${bookletId} درس ${lessonCode}`,
      });
      charged = c.charged;
    }

    // streamGeminiTeaching returns `fullResponse`, not `text`. Reading
    // the wrong key meant sessionComplete was always false, breaking
    // terminal-metadata signalling for the FE.
    const fullText = result.fullResponse || "";
    const sessionComplete = /\[SESSION_COMPLETE\]/.test(fullText);

    if (!res.writableEnded) {
      try {
        res.write(`data: ${JSON.stringify({ done: true, charged, sessionComplete })}\n\n`);
        res.end();
      } catch {}
    }
  } catch (err) {
    void refundV4Ai({
      requestId,
      userId: uid,
      subjectId: slug,
      source: "v4_booklet_teach",
      reason: "stream_failure",
    }).catch(() => {});
    emitFriendlyAiFailure(res, "v4/booklet/teach", err);
  } finally {
    clearInterval(heartbeat);
    req.off("close", onClose);
  }
});

// ── GET /v4/booklet/:id/chunks-by-page/:page ───────────────────────────────
// Returns ALL chunks bound to a given page so the citation Drawer can show
// the real source text the teacher cited. Auth-scoped to the booklet's owner.
router.get("/v4/booklet/:id/chunks-by-page/:page", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const page = Number(req.params.page);
  if (!Number.isInteger(id) || !Number.isInteger(page) || page < 1) {
    res.status(400).json({ error: "bad_params" }); return;
  }
  try {
    const owner = await getBooklet(id, uid);
    if (!owner) { res.status(404).json({ error: "not_found" }); return; }
    const rows = await db
      .select({
        id: v4BookletChunksTable.id,
        pageNumber: v4BookletChunksTable.pageNumber,
        chunkIdx: v4BookletChunksTable.chunkIdx,
        chunkText: v4BookletChunksTable.chunkText,
      })
      .from(v4BookletChunksTable)
      .where(and(
        eq(v4BookletChunksTable.bookletId, id),
        eq(v4BookletChunksTable.pageNumber, page),
      ));
    res.json({ bookletId: id, page, chunks: rows });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/chunks-by-page] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/booklet/active-paths/:slug ────────────────────────────────────
// Returns the available paths (custom + booklets) for a given specialty,
// used by the PathSwitcher UI. `currentPathType` reflects which one is
// currently the student's active v4_student_paths row.
router.get("/v4/booklet/active-paths/:slug", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const [active] = await db
      .select()
      .from(v4StudentPathsTable)
      .where(and(
        eq(v4StudentPathsTable.userId, uid),
        eq(v4StudentPathsTable.subjectId, slug),
      ));
    const ready = await db
      .select({
        id: v4StudentBookletsTable.id,
        title: v4StudentBookletsTable.title,
        pagesCount: v4StudentBookletsTable.pagesCount,
      })
      .from(v4StudentBookletsTable)
      .where(and(
        eq(v4StudentBookletsTable.userId, uid),
        eq(v4StudentBookletsTable.subjectId, slug),
        eq(v4StudentBookletsTable.status, "ready"),
      ))
      .orderBy(desc(v4StudentBookletsTable.id));
    // `hasCustomPath` reflects AVAILABILITY (does a student_paths row exist
    // for this user+specialty at all), not whether it's the currently active
    // path. The UI needs this so the custom-path tab stays visible even
    // when the student is currently inside a booklet session.
    res.json({
      slug,
      currentPathType: (active as any)?.pathType ?? null,
      currentBookletId: (active as any)?.bookletId ?? null,
      hasCustomPath: !!active,
      booklets: ready,
    });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/active-paths] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

export default router;
