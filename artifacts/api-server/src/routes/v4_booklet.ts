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
//     content-hash requestId. Pay-once-per-file: failures do NOT refund —
//     the charge is idempotent, so a same-file retry re-runs the
//     already-paid work without a second debit.
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
  extractBookletContent,
  withTimeout,
  chunkPages,
  generateBookletTree,
  embedAndStoreChunks,
  getBooklet,
  findLessonInTree,
  findLabInTree,
  findExamInTree,
  generateBookletExamQuestions,
  generateBookletLabSpec,
  retrieveBookletContext,
  buildBookletTeacherPrompt,
  type BookletTree,
} from "../lib/v4-booklet";
import {
  loadBookletProgress,
  buildBookletMap,
  recordBookletLessonStars,
  recordBookletExamResult,
  recordBookletLabResult,
  cacheBookletExam,
  cacheBookletLab,
  BOOKLET_EXAM_PASS_PCT,
  BOOKLET_LAB_PASS_PCT,
  type BookletExamCache,
  type BookletLabCache,
} from "../lib/v4-booklet-progress";
import { evaluateExamAnswer, evaluateLabAnswer } from "../lib/v4-exam-evaluator";
import {
  chargeV4Ai,
  refundV4Ai,
  getOrCreateV4Wallet,
  canAffordV4Turn,
  runV4PaidWork,
} from "../lib/v4-gem-wallet";
import { streamGeminiTeaching, type GeminiMessage } from "../lib/gemini-stream";
import { V4_TEACHING_MODEL, assertGeminiForTeaching } from "../lib/v4-teaching-core";
import { emitFriendlyAiFailure } from "./ai";
import { requireSameOriginCsrf } from "../lib/csrf";

const router: IRouter = Router();

// Upper bound on a single graded lab answer (chars). Keeps the open-ended AI
// grader's token cost bounded even though billing is currently free.
const BOOKLET_LAB_ANSWER_MAX = 4000;

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

// ── multer: in-memory PDF, 25 MB cap ──────────────────────────────────────
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1 },
});

// Estimated prep cost charged upfront against the v4 wallet. Real cost is
// hard to know before extraction; we pick a flat $0.15 (~150 gems) which
// matches the spec's $0.10-$0.30 range. Pay-once-per-file: this single
// upfront charge is never refunded (a failed attempt retries the same file
// for no extra debit); over/under-charge vs real cost is platform-absorbed.
const BOOKLET_PREP_USD = 0.15;
// Max booklets a student may keep per specialty (failed rows excluded).
const MAX_BOOKLETS_PER_SPECIALTY = 5;

// Per-wallet in-flight lock for booklet teaching — mirrors `inflightTeachTurns`
// in v4_teach.ts. Keyed by `${uid}:${slug}` (the wallet identity), NOT by
// booklet: two booklets under the same specialty bill ONE wallet, so concurrent
// turns across them must serialize too.
const inflightBookletTeachTurns = new Set<string>();

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

    // Accept PDF or Word (.docx). Old binary .doc is NOT supported (mammoth
    // only reads .docx) — reject it with a clear Arabic message.
    const nameLower = (file.originalname || "").toLowerCase();
    const mime = file.mimetype || "";
    const isPdf = /pdf/i.test(mime) || nameLower.endsWith(".pdf");
    const isDocx =
      /officedocument\.wordprocessingml\.document/i.test(mime) || nameLower.endsWith(".docx");
    const isLegacyDoc =
      !isDocx && (/msword/i.test(mime) || nameLower.endsWith(".doc"));
    if (isLegacyDoc) {
      res.status(400).json({ error: "doc_unsupported", message: "صيغة .doc القديمة غير مدعومة. احفظ الملف بصيغة .docx ثم أعد الرفع." });
      return;
    }
    if (!isPdf && !isDocx) {
      res.status(400).json({ error: "pdf_or_docx_only", message: "الصيغ المدعومة: PDF أو Word (.docx) فقط." });
      return;
    }
    const sourceKind: "pdf" | "docx" = isDocx ? "docx" : "pdf";

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
        // prior `failed` attempt (transient OpenAI/Gemini/DB hiccup, or
        // a server restart that orphaned the in-memory job) must NOT trap
        // the user — we delete the failed row + any orphan chunks and
        // fall through to re-process from a clean slate. The partial
        // unique index excludes failed rows so the re-insert won't
        // conflict.
        //
        // Crucially, we do NOT refund here. The prep charge is idempotent
        // on the content-hash requestId, so the original debit stands and
        // the re-charge below is a NO_OP ("already paid") that lets the
        // retry complete the already-paid work — pay-once-per-file. A
        // refund here would reverse that debit while the NO_OP re-charge
        // still lets processing proceed, i.e. a free booklet (revenue
        // leak). See reapOrphanedProcessingBooklets() — same contract.
        if (existing.status === "failed") {
          try {
            await db.delete(v4BookletChunksTable)
              .where(eq(v4BookletChunksTable.bookletId, existing.id));
            await db.delete(v4StudentBookletsTable)
              .where(eq(v4StudentBookletsTable.id, existing.id));
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

    // ── 1b. Enforce the per-(student, specialty) booklet cap. Reached only on
    //        a genuinely NEW upload (reuse/retry returned/cleared above).
    //        Failed rows don't count — they're retryable scaffolding. A small
    //        concurrency race (two simultaneous new uploads) is acceptable for
    //        this soft limit.
    try {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`count(*)::int` })
        .from(v4StudentBookletsTable)
        .where(and(
          eq(v4StudentBookletsTable.userId, uid),
          eq(v4StudentBookletsTable.subjectId, slug),
          sql`${v4StudentBookletsTable.status} <> 'failed'`,
        ));
      if ((cnt ?? 0) >= MAX_BOOKLETS_PER_SPECIALTY) {
        res.status(400).json({
          error: "booklet_limit",
          limit: MAX_BOOKLETS_PER_SPECIALTY,
          message: `وصلت للحد الأقصى (${MAX_BOOKLETS_PER_SPECIALTY} ملازم) في هذا التخصص. احذف ملزمة قديمة لإضافة جديدة.`,
        });
        return;
      }
    } catch (e: any) {
      // Non-fatal — a count failure must not block a legitimate upload.
      logger.warn?.(`[v4/booklet/upload] limit count failed: ${String(e?.message ?? e)}`);
    }

    // ── 2. Insert booklet row (status=processing). Handle the race where
    //       a concurrent request just inserted the same (uid, slug, hash). ──
    const title = titleRaw.slice(0, 160) || (file.originalname || "ملزمة").replace(/\.(pdf|docx)$/i, "").slice(0, 160);
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
    //          failure → mark booklet failed (no refund — prep is pay-once).
    //       c) charged=false with NEITHER flag → ledger-level dedupe hit
    //          (e.g. a prior attempt left a ledger row but failed to insert
    //          this booklet row). Treat as already-paid and proceed.
    //
    // Defensive rebill: we no longer refund prep, but legacy buggy code may
    // have left a `${prepRequestId}:refund` row in production. A refunded
    // debit means the student was made whole, so chargeV4Ai NO_OP'ing on the
    // original (idempotent) requestId would hand them a free booklet. If a
    // prior refund exists, charge under a stable `:rebill` key so the retry
    // debits exactly once. No new refunds are ever created, so at most one
    // refund can exist per family and this key stays idempotent.
    const [priorPrepRefund] = await db
      .select({ id: gemLedgerTable.id })
      .from(gemLedgerTable)
      .where(and(
        eq(gemLedgerTable.userId, uid),
        eq((gemLedgerTable as any).requestId, `${prepRequestId}:refund`),
      ))
      .limit(1);
    const chargeRequestId = priorPrepRefund ? `${prepRequestId}:rebill` : prepRequestId;
    const charge = await chargeV4Ai({
      requestId: chargeRequestId,
      userId: uid,
      subjectId: slug,
      costUsd: BOOKLET_PREP_USD,
      source: "v4_booklet_prep",
      model: "gemini-2.5-flash+text-embedding-3-small",
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
          eq((gemLedgerTable as any).requestId, chargeRequestId),
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
      const setStage = async (stage: string, percent: number) => {
        try {
          await db.update(v4StudentBookletsTable)
            .set({ processingStage: stage, processingPercent: Math.max(0, Math.min(100, percent)) })
            .where(eq(v4StudentBookletsTable.id, inserted.id));
        } catch {}
      };

      try {
        await setStage("extracting", 5);
        const extracted = await withTimeout(
          extractBookletContent(file.buffer, {
            kind: sourceKind,
            userId: uid,
            subjectId: slug,
          }),
          5 * 60_000,
          "تعذّر استخراج النص خلال المهلة المحددة (قد يكون الملف كبيراً جداً أو ممسوحاً ضوئياً يصعب قراءته). جرّب ملفاً أصغر أو أوضح.",
        );
        if (extracted.encrypted) throw new Error("ملف محمي بكلمة مرور.");
        if (extracted.totalPages === 0 || extracted.pages.size === 0) {
          throw new Error(
            sourceKind === "docx"
              ? "تعذّر استخراج نص من ملف Word (قد يكون فارغاً أو تالفاً)."
              : "تعذّر استخراج نص من الملف (قد يكون مسحاً ضوئياً تعذّر قراءته حتى بعد OCR).",
          );
        }
        if (extracted.totalPages > 400) {
          throw new Error(
            sourceKind === "docx"
              ? `الملف ${extracted.totalPages} قسماً. الحد الأقصى ٤٠٠ لمسار الملازم.`
              : `الملف ${extracted.totalPages} صفحة. الحد الأقصى ٤٠٠ صفحة لمسار الملازم.`,
          );
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
        await withTimeout(
          embedAndStoreChunks(inserted.id, chunks),
          5 * 60_000,
          "تعذّر حساب التضمينات (embeddings) خلال المهلة المحددة. أعد المحاولة.",
        );
        await setStage("embedding", 100);

        await setStage("binding", 40);
        const tree = await withTimeout(
          generateBookletTree({
            pages: extracted.pages,
            totalPages: extracted.totalPages,
            specialtyName: sp.name,
            bookletTitle: title,
          }),
          4 * 60_000,
          "تعذّر بناء خريطة الدروس خلال المهلة المحددة. أعد المحاولة.",
        );
        // Stamp source provenance onto the persisted tree so the teacher's
        // reference layer cites by page (PDF) or section heading (docx).
        tree.sourceKind = extracted.sourceKind;
        if (extracted.pageLabels) tree.pageLabels = extracted.pageLabels;
        await setStage("binding", 100);

        // Status-guarded flip: only promote to `ready` if the row is STILL
        // `processing`. If a startup reaper (or any other path) already
        // marked it `failed` — e.g. this is a stale background run whose
        // process was thought dead — we must NOT resurrect it to `ready`.
        const promoted = await db.update(v4StudentBookletsTable)
          .set({ status: "ready", instructionTree: tree as any, processingStage: "done", processingPercent: 100 })
          .where(and(
            eq(v4StudentBookletsTable.id, inserted.id),
            eq(v4StudentBookletsTable.status, "processing"),
          ))
          .returning({ id: v4StudentBookletsTable.id });
        if (!promoted.length) {
          logger.warn?.(`[v4/booklet/upload] booklet=${inserted.id} no longer 'processing' at completion — skipping ready flip (likely reaped).`);
        } else {
          logger.info?.(`[v4/booklet/upload] booklet=${inserted.id} ready (${extracted.totalPages}p, ${chunks.length} chunks)`);
        }
      } catch (err: any) {
        const msg = String(err?.message ?? err).slice(0, 500);
        logger.error?.(`[v4/booklet/upload] processing failed booklet=${inserted.id} user=${uid}: ${msg}`);
        // Status-guarded fail flip (mirror of the ready flip): only move a
        // row that is STILL `processing` to `failed`, so a late error from a
        // stale background run can't clobber a row another path already
        // resolved. NO refund — the prep charge is idempotent per content
        // hash; the student retries the same file and the NO_OP re-charge
        // completes the already-paid work (pay-once-per-file). Refunding
        // here would leak a free booklet on retry.
        try {
          await db.update(v4StudentBookletsTable)
            .set({ status: "failed", errorMessage: msg })
            .where(and(
              eq(v4StudentBookletsTable.id, inserted.id),
              eq(v4StudentBookletsTable.status, "processing"),
            ));
        } catch {}
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

// ── DELETE /v4/booklet/:id ─────────────────────────────────────────────────
// Wipes a booklet the student owns: its chunks first, then the row itself
// (per-booklet progress lives on the row's `progress` jsonb, so it's gone with
// it). Ownership is checked before anything is touched; an unknown/other-user
// id returns 404 without leaking existence. Mutating → CSRF-guarded.
router.delete("/v4/booklet/:id", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "bad_id" }); return; }
  try {
    const [own] = await db
      .select({ id: v4StudentBookletsTable.id, status: v4StudentBookletsTable.status })
      .from(v4StudentBookletsTable)
      .where(and(eq(v4StudentBookletsTable.id, id), eq(v4StudentBookletsTable.userId, uid)));
    if (!own) { res.status(404).json({ error: "not_found" }); return; }

    // Refuse to delete while the background processing job is still running:
    // the row would vanish but the in-flight worker could still insert chunks
    // for this id (there's no FK cascade), orphaning them. A ready/failed
    // status means the job has finished, so no further chunk writes can occur.
    if (own.status === "processing") {
      res.status(409).json({
        error: "still_processing",
        message: "لا يمكن حذف الملزمة أثناء تحضيرها. انتظر حتى تكتمل أو تفشل ثم احذفها.",
      });
      return;
    }

    // One transaction so a partial failure can't leave a surviving booklet
    // with its chunks wiped (chunks first, then the row + its progress jsonb).
    await db.transaction(async (tx) => {
      await tx.delete(v4BookletChunksTable).where(eq(v4BookletChunksTable.bookletId, id));
      await tx.delete(v4StudentBookletsTable)
        .where(and(eq(v4StudentBookletsTable.id, id), eq(v4StudentBookletsTable.userId, uid)));
    });
    logger.info?.(`[v4/booklet/delete] booklet=${id} user=${uid} wiped (chunks + progress)`);
    res.json({ ok: true });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/delete] ${String(e?.message ?? e)}`);
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

// ── GET /v4/booklet/:id/map ────────────────────────────────────────────────
// Read-only projection of the booklet's normalized tree + stored progress into
// a map shaped like the custom-path map (Phase E FE reuse). Every node is
// UNLOCKED — booklet navigation is free; exams/labs are assessment-only.
// Optional ?level=N browses a specific level (defaults to the active level).
router.get("/v4/booklet/:id/map", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "bad_id" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    if (row.status !== "ready") {
      res.status(409).json({ error: "booklet_not_ready", status: row.status });
      return;
    }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    const progress = loadBookletProgress((row as any).progress);
    const level = parseInt(String((req.query as any)?.level ?? ""), 10);
    const map = buildBookletMap(
      { id: row.id, title: row.title, subjectId: row.subjectId, status: row.status },
      tree,
      progress,
      { level: Number.isFinite(level) ? level : undefined },
    );
    res.json(map);
  } catch (e: any) {
    logger.error?.(`[v4/booklet/map] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/booklet/:id/lesson-stars ──────────────────────────────────────
// Persists the star count the student earned on a booklet lesson (row-locked,
// monotonic merge into the booklet's progress blob). Body: { lessonCode, stars }.
router.post("/v4/booklet/:id/lesson-stars", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const lessonCode = String(req.body?.lessonCode ?? "").trim();
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "bad_id" }); return; }
  if (!lessonCode || ![0, 1, 2, 3].includes(stars)) {
    res.status(400).json({ error: "lessonCode and stars (0-3) required" });
    return;
  }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    // Reject codes that aren't real lessons in this booklet (keeps progress clean).
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    if (!findLessonInTree(tree, lessonCode)) {
      res.status(404).json({ error: "lesson_not_found" });
      return;
    }
    const progress = await recordBookletLessonStars(id, uid, lessonCode, stars);
    if (!progress) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ ok: true, stars: progress.lessonStars[lessonCode] ?? 0 });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/lesson-stars] ${String(e?.message ?? e)}`);
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

  // Pre-gate: booklet teaching is billed from the v4 wallet. Block a
  // zero-balance / past-grace student up front (clean 402) before spending
  // tokens on retrieval + streaming.
  {
    const afford = await canAffordV4Turn(uid, slug);
    if (!afford.ok) {
      res.status(402).json({
        error: "insufficient_gems",
        reason: afford.noWallet ? "no_wallet" : "insufficient",
        balance: afford.balance,
      });
      return;
    }
  }

  // Per-wallet in-flight lock — the pre-gate is a check, not a reservation:
  // parallel turns for the same wallet could each stream a full reply while only
  // one charge lands (later ones drain a now-empty wallet for free). Reject a
  // concurrent second turn with the same terminal SSE contract the FE knows.
  const turnLockKey = `${uid}:${slug}`;
  if (inflightBookletTeachTurns.has(turnLockKey)) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    try {
      res.write(
        `data: ${JSON.stringify({ done: true, charged: false, turnInFlight: true, error: "turn_in_flight" })}\n\n`,
      );
    } catch {}
    res.end();
    return;
  }
  inflightBookletTeachTurns.add(turnLockKey);

  const requestId = `v4bt_${Date.now()}_${randomBytes(8).toString("hex")}`;

  // Everything after the lock acquisition runs inside ONE try/finally so the
  // in-flight lock is ALWAYS released — an early return or an unexpected throw
  // anywhere between acquisition and the stream (retrieval, header setup,
  // heartbeat wiring) would otherwise strand it and wedge the wallet forever.
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let onClose: (() => void) | undefined;
  try {
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
        pageLabels: tree.pageLabels,
        sourceKind: tree.sourceKind,
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

    heartbeat = setInterval(() => {
      try { if (!res.writableEnded) res.write(`: ping ${Date.now()}\n\n`); } catch {}
    }, 15_000);
    const abort = new AbortController();
    onClose = () => { try { abort.abort(); } catch {} };
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

      // Bill the turn from the v4 wallet at the admin-configured gem rate using
      // REAL post-hoc token cost. drainIfInsufficient: a turn whose cost exceeds
      // the remaining balance drains the wallet to zero (the next turn's pre-gate
      // then blocks) rather than being served for free.
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
          drainIfInsufficient: true,
        });
        charged = c.charged;
      }

      // streamGeminiTeaching returns `fullResponse`, not `text`. Reading
      // the wrong key meant sessionComplete was always false, breaking
      // terminal-metadata signalling for the FE.
      const fullText = result.fullResponse || "";
      const sessionComplete = /\[SESSION_COMPLETE\]/.test(fullText);

      // Parse [[CODE_TASK: lang=python | المطلوب: ...]] from fullText so the FE
      // can light up the IDE button without ever rendering the raw tag.
      let codeTask: { requirement: string; lang: string | null } | null = null;
      const ctMatch = fullText.match(/\[\[\s*CODE_TASK\s*:\s*([\s\S]+?)\]\](?!\])/);
      if (ctMatch) {
        const parts = ctMatch[1].split("|").map((s) => s.trim()).filter(Boolean);
        const langPart = parts.find((p) => /^lang\s*=/i.test(p));
        const lang = langPart ? (langPart.replace(/^lang\s*=\s*/i, "").trim() || null) : null;
        const requirement = parts.filter((p) => !/^lang\s*=/i.test(p)).join(" | ").trim();
        if (requirement) codeTask = { requirement, lang };
      }

      if (!res.writableEnded) {
        try {
          res.write(`data: ${JSON.stringify({ done: true, charged, sessionComplete, codeTask })}\n\n`);
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
    }
  } finally {
    inflightBookletTeachTurns.delete(turnLockKey);
    if (heartbeat) clearInterval(heartbeat);
    if (onClose) req.off("close", onClose);
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

// ─────────────────────────────────────────────────────────────────────────
// Phase G — exam + lab runner (assessment-only; never gates navigation).
//
// Questions are lazy-generated grounded in the booklet's own chunks the first
// time a student opens an exam/lab, then cached in the progress jsonb so a
// reload shows the same set and submit grades against a stable answer key the
// client never sees. Booklet exams are MCQ-only (free, deterministic grading
// via correctIndex); labs are 5 typed open-ended questions graded by Haiku.
//
// Billing is FREE for now (no chargeV4Ai call here) but the seam stays: these
// routes already resolve the per-(user,subject) wallet context via getBooklet
// so a future charge slots in without restructuring.
// ─────────────────────────────────────────────────────────────────────────

// In-process dedupe so a double-click / reload mid-generation doesn't fire two
// paid generations. The cache write is set-if-absent anyway (first writer
// wins), so this is purely a cost/latency optimization.
const _examGenInflight = new Map<string, Promise<BookletExamCache | null>>();
const _labGenInflight = new Map<string, Promise<BookletLabCache | null>>();

// Fixed USD cost estimates for the non-stream booklet AI surfaces billed via
// the v4 wallet. The generators/evaluators don't surface token usage, so —
// mirroring the placement-generation pattern — we charge a flat estimate that
// runV4PaidWork converts to gems at the admin-configured rate. (Booklet
// teaching is billed on REAL post-hoc token cost instead; see its handler.)
const BOOKLET_EXAM_GEN_USD = 0.012;   // grounded MCQ set (6 unit / 10 final)
const BOOKLET_LAB_GEN_USD = 0.012;    // scenario + 5 typed questions
const BOOKLET_LAB_GRADE_USD = 0.006;  // Haiku grading of a lab (per eval / per submit)

// ── GET /v4/booklet/:id/exam/:examCode ─────────────────────────────────────
// Returns the (lazy-generated, cached) MCQ set WITHOUT the answer key.
router.get("/v4/booklet/:id/exam/:examCode", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const examCode = decodeURIComponent(String(req.params.examCode ?? "")).trim();
  if (!Number.isInteger(id) || !examCode) { res.status(400).json({ error: "bad_params" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    if (row.status !== "ready") { res.status(409).json({ error: "booklet_not_ready", status: row.status }); return; }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    const found = findExamInTree(tree, examCode);
    if (!found) { res.status(404).json({ error: "exam_not_found" }); return; }

    const progress = loadBookletProgress((row as any).progress);
    let cache: BookletExamCache | null = progress.examQuestions[examCode] ?? null;
    if (!cache) {
      // First open → a PAID grounded-MCQ generation. Pre-gate + charge (fixed
      // estimate at the admin gem rate), refund on failure. Cached after the
      // first success so a reload / re-open hits the cache and is NOT recharged.
      const key = `${id}:${examCode}`;
      let p = _examGenInflight.get(key);
      if (!p) {
        p = (async () => {
          const paid = await runV4PaidWork({
            requestId: `v4bexamgen_${uid}_${id}_${examCode}`,
            userId: uid,
            subjectId: row.subjectId,
            costUsd: BOOKLET_EXAM_GEN_USD,
            source: "v4_exam_attempt",
            note: `ملزمة:${id} توليد اختبار ${examCode}`,
            run: async () => {
              const questions = await generateBookletExamQuestions({
                bookletId: id,
                bookletTitle: row.title,
                examTitle: found.exam.title,
                scope: found.exam.scope,
                sourcePages: found.exam.sourcePages,
                count: found.exam.scope === "final" ? 10 : 6,
              });
              return cacheBookletExam(id, uid, examCode, { questions, generatedAt: new Date().toISOString() });
            },
          });
          if (!paid.ok) {
            const e: any = new Error("insufficient_gems");
            e.kind = "insufficient_gems";
            e.reason = paid.reason;
            e.balance = paid.balance;
            throw e;
          }
          return paid.result;
        })();
        _examGenInflight.set(key, p);
        void p.finally(() => { if (_examGenInflight.get(key) === p) _examGenInflight.delete(key); });
      }
      try {
        cache = await p;
      } catch (e: any) {
        if (e?.kind === "insufficient_gems") {
          res.status(402).json({ error: "insufficient_gems", reason: e.reason, balance: e.balance });
          return;
        }
        throw e;
      }
    }
    if (!cache || !cache.questions.length) {
      res.status(503).json({ error: "exam_generation_failed", message: "تعذّر إنشاء أسئلة الاختبار الآن، أعد المحاولة بعد لحظات." });
      return;
    }

    const prior = progress.examResults[examCode] ?? null;
    res.json({
      booklet: { id: row.id, title: row.title },
      exam: {
        code: examCode,
        title: found.exam.title,
        scope: found.exam.scope,
        questions: cache.questions.map((q) => ({
          id: q.id, questionIndex: q.questionIndex, kind: q.kind, prompt: q.prompt, choices: q.choices,
        })),
      },
      passThreshold: BOOKLET_EXAM_PASS_PCT,
      prior: prior ? { score: prior.score, passed: prior.passed, attempts: prior.attempts, correct: prior.correct, total: prior.total } : null,
    });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/exam:get] ${String(e?.message ?? e)}`);
    res.status(503).json({ error: "exam_generation_failed", message: "تعذّر تجهيز الاختبار الآن، أعد المحاولة." });
  }
});

// ── POST /v4/booklet/:id/exam/:examCode/submit ─────────────────────────────
// Grades the cached MCQ set (deterministic/free), persists the best attempt.
router.post("/v4/booklet/:id/exam/:examCode/submit", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const examCode = decodeURIComponent(String(req.params.examCode ?? "")).trim();
  const answers: Array<string | number | null> = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (!Number.isInteger(id) || !examCode) { res.status(400).json({ error: "bad_params" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    if (!findExamInTree(tree, examCode)) { res.status(404).json({ error: "exam_not_found" }); return; }
    const progress = loadBookletProgress((row as any).progress);
    const cache = progress.examQuestions[examCode];
    if (!cache || !cache.questions.length) {
      res.status(409).json({ error: "exam_not_started", message: "افتح الاختبار أولاً قبل التسليم." });
      return;
    }

    const evaluatorLog: any[] = [];
    let sum = 0;
    let correct = 0;
    for (let i = 0; i < cache.questions.length; i++) {
      const q = cache.questions[i];
      const ans = answers[i] ?? null;
      const r = await evaluateExamAnswer(
        { id: q.id, prompt: q.prompt, kind: q.kind, choices: q.choices, correctIndex: q.correctIndex, explanation: q.explanation ?? null },
        ans,
      );
      sum += r.score;
      if (r.verdict === "correct") correct++;
      const ansText = typeof ans === "number" && q.choices[ans] != null ? q.choices[ans] : String(ans ?? "");
      evaluatorLog.push({
        questionId: q.id, questionIndex: q.questionIndex, kind: q.kind, prompt: q.prompt,
        studentAnswer: ansText, verdict: r.verdict, score: r.score, explanation: r.explanation,
      });
    }
    const total = cache.questions.length;
    const score = total > 0 ? Math.round(sum / total) : 0;
    const passed = score >= BOOKLET_EXAM_PASS_PCT;
    await recordBookletExamResult(id, uid, examCode, { score, passed, correct, total });
    res.json({ score, passed, passThreshold: BOOKLET_EXAM_PASS_PCT, correct, total, evaluatorLog });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/exam:submit] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal", message: "تعذّر تصحيح الاختبار الآن، أعد المحاولة." });
  }
});

// ── GET /v4/booklet/:id/lab/:labCode ───────────────────────────────────────
// Returns the (lazy-generated, cached) lab scenario + 5 typed questions.
router.get("/v4/booklet/:id/lab/:labCode", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const labCode = decodeURIComponent(String(req.params.labCode ?? "")).trim();
  if (!Number.isInteger(id) || !labCode) { res.status(400).json({ error: "bad_params" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    if (row.status !== "ready") { res.status(409).json({ error: "booklet_not_ready", status: row.status }); return; }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    const found = findLabInTree(tree, labCode);
    if (!found) { res.status(404).json({ error: "lab_not_found" }); return; }

    const progress = loadBookletProgress((row as any).progress);
    let spec: BookletLabCache | null = progress.labSpecs[labCode] ?? null;
    if (!spec) {
      // First open → a PAID grounded lab generation (scenario + 5 questions).
      // Pre-gate + charge (fixed estimate), refund on failure, cache-once so a
      // reload / re-open hits the cache and is NOT recharged.
      const key = `${id}:${labCode}`;
      let p = _labGenInflight.get(key);
      if (!p) {
        p = (async () => {
          const paid = await runV4PaidWork({
            requestId: `v4blabgen_${uid}_${id}_${labCode}`,
            userId: uid,
            subjectId: row.subjectId,
            costUsd: BOOKLET_LAB_GEN_USD,
            source: "v4_lab_grade",
            note: `ملزمة:${id} توليد معمل ${labCode}`,
            run: async () => {
              const gen = await generateBookletLabSpec({
                bookletId: id,
                bookletTitle: row.title,
                labTitle: found.lab.title,
                hasExercises: !!found.lab.hasExercises,
                sourcePages: found.lab.pages,
              });
              return cacheBookletLab(id, uid, labCode, { ...gen, generatedAt: new Date().toISOString() });
            },
          });
          if (!paid.ok) {
            const e: any = new Error("insufficient_gems");
            e.kind = "insufficient_gems";
            e.reason = paid.reason;
            e.balance = paid.balance;
            throw e;
          }
          return paid.result;
        })();
        _labGenInflight.set(key, p);
        void p.finally(() => { if (_labGenInflight.get(key) === p) _labGenInflight.delete(key); });
      }
      try {
        spec = await p;
      } catch (e: any) {
        if (e?.kind === "insufficient_gems") {
          res.status(402).json({ error: "insufficient_gems", reason: e.reason, balance: e.balance });
          return;
        }
        throw e;
      }
    }
    if (!spec || !spec.questions.length) {
      res.status(503).json({ error: "lab_generation_failed", message: "تعذّر إنشاء أسئلة المعمل الآن، أعد المحاولة بعد لحظات." });
      return;
    }

    const prior = progress.labResults[labCode] ?? null;
    res.json({
      booklet: { id: row.id, title: row.title },
      lab: {
        code: labCode,
        title: found.lab.title,
        scenario: spec.scenario,
        completionCriterion: spec.completionCriterion,
        questions: spec.questions.map((q) => ({ id: q.id, questionIndex: q.questionIndex, kind: q.kind, prompt: q.prompt })),
      },
      passThreshold: BOOKLET_LAB_PASS_PCT,
      prior: prior ? { score: prior.score, passed: prior.passed, attempts: prior.attempts } : null,
    });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/lab:get] ${String(e?.message ?? e)}`);
    res.status(503).json({ error: "lab_generation_failed", message: "تعذّر تجهيز المعمل الآن، أعد المحاولة." });
  }
});

// ── POST /v4/booklet/:id/lab/:labCode/evaluate ─────────────────────────────
// Live per-question feedback (Haiku). Does NOT persist — only the final submit
// records a result. Body: { questionIndex, answer }.
router.post("/v4/booklet/:id/lab/:labCode/evaluate", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const labCode = decodeURIComponent(String(req.params.labCode ?? "")).trim();
  const questionIndex = Number(req.body?.questionIndex);
  // Bound the graded input so a single answer can't balloon the AI token cost.
  const answer = String(req.body?.answer ?? "").slice(0, BOOKLET_LAB_ANSWER_MAX);
  if (!Number.isInteger(id) || !labCode) { res.status(400).json({ error: "bad_params" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    if (!findLabInTree(tree, labCode)) { res.status(404).json({ error: "lab_not_found" }); return; }
    const progress = loadBookletProgress((row as any).progress);
    const spec = progress.labSpecs[labCode];
    if (!spec) { res.status(409).json({ error: "lab_not_started", message: "افتح المعمل أولاً." }); return; }
    const q = spec.questions.find((x) => x.questionIndex === questionIndex);
    if (!q) { res.status(400).json({ error: "bad_question" }); return; }
    // Live per-question feedback is a paid Haiku call — pre-gate + charge a
    // small fixed estimate (unique requestId per click), refund on failure.
    // evaluateLabAnswer swallows its own errors into a FAIL_RESULT, so throw on
    // evaluatorFailed to trigger the refund instead of billing a dud grade.
    const evalPaid = await runV4PaidWork({
      requestId: `v4blabeval_${uid}_${id}_${labCode}_${questionIndex}_${Date.now()}_${randomBytes(4).toString("hex")}`,
      userId: uid,
      subjectId: row.subjectId,
      costUsd: BOOKLET_LAB_GRADE_USD,
      source: "v4_lab_grade",
      note: `ملزمة:${id} تقييم معمل ${labCode} سؤال ${questionIndex}`,
      run: async () => {
        const out = await evaluateLabAnswer(
          {
            id: q.id, prompt: q.prompt, kind: q.kind,
            scenario: spec.scenario, completionCriterion: spec.completionCriterion,
            rubric: q.rubric ?? null, solutionOutline: q.solutionOutline ?? null,
          },
          answer,
        );
        if ((out as any).evaluatorFailed) throw new Error("lab_eval_failed");
        return out;
      },
    });
    if (!evalPaid.ok) {
      res.status(402).json({ error: "insufficient_gems", reason: evalPaid.reason, balance: evalPaid.balance });
      return;
    }
    const r = evalPaid.result;
    res.json({ verdict: r.verdict, score: r.score, explanation: r.explanation });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/lab:evaluate] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal", message: "تعذّر التقييم الآن، أعد المحاولة." });
  }
});

// ── POST /v4/booklet/:id/lab/:labCode/submit ───────────────────────────────
// Re-grades all 5 answers (Haiku), averages, persists the best attempt.
router.post("/v4/booklet/:id/lab/:labCode/submit", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const id = Number(req.params.id);
  const labCode = decodeURIComponent(String(req.params.labCode ?? "")).trim();
  const answers: string[] = Array.isArray(req.body?.answers)
    ? req.body.answers.map((a: any) => String(a ?? "").slice(0, BOOKLET_LAB_ANSWER_MAX))
    : [];
  if (!Number.isInteger(id) || !labCode) { res.status(400).json({ error: "bad_params" }); return; }
  try {
    const row = await getBooklet(id, uid);
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    const tree = (row.instructionTree ?? { units: [] }) as BookletTree;
    if (!findLabInTree(tree, labCode)) { res.status(404).json({ error: "lab_not_found" }); return; }
    const progress = loadBookletProgress((row as any).progress);
    const spec = progress.labSpecs[labCode];
    if (!spec || !spec.questions.length) {
      res.status(409).json({ error: "lab_not_started", message: "افتح المعمل أولاً قبل التسليم." });
      return;
    }

    // Submitting re-grades all 5 answers via Haiku — a paid call. Pre-gate +
    // charge a fixed estimate (unique requestId per attempt), refund on a hard
    // failure. Per-question grader hiccups degrade to a 0 for that question
    // (the batch still produces a usable score), so we only throw — and refund
    // — when the whole batch is unusable.
    const labPaid = await runV4PaidWork({
      requestId: `v4blabsubmit_${uid}_${id}_${labCode}_${Date.now()}_${randomBytes(4).toString("hex")}`,
      userId: uid,
      subjectId: row.subjectId,
      costUsd: BOOKLET_LAB_GRADE_USD,
      source: "v4_lab_grade",
      note: `ملزمة:${id} تصحيح معمل ${labCode}`,
      run: async () => {
        const evaluatorLog: any[] = [];
        let sum = 0;
        for (let i = 0; i < spec.questions.length; i++) {
          const q = spec.questions[i];
          const ans = answers[i] ?? "";
          const r = await evaluateLabAnswer(
            {
              id: q.id, prompt: q.prompt, kind: q.kind,
              scenario: spec.scenario, completionCriterion: spec.completionCriterion,
              rubric: q.rubric ?? null, solutionOutline: q.solutionOutline ?? null,
            },
            ans,
          );
          sum += r.score;
          evaluatorLog.push({
            questionId: q.id, questionIndex: q.questionIndex, kind: q.kind, prompt: q.prompt,
            studentAnswer: ans, verdict: r.verdict, score: r.score, explanation: r.explanation,
          });
        }
        const score = spec.questions.length ? Math.round(sum / spec.questions.length) : 0;
        const passed = score >= BOOKLET_LAB_PASS_PCT;
        await recordBookletLabResult(id, uid, labCode, { score, passed });
        return { score, passed, evaluatorLog };
      },
    });
    if (!labPaid.ok) {
      res.status(402).json({ error: "insufficient_gems", reason: labPaid.reason, balance: labPaid.balance });
      return;
    }
    res.json({
      score: labPaid.result.score,
      passed: labPaid.result.passed,
      passThreshold: BOOKLET_LAB_PASS_PCT,
      evaluatorLog: labPaid.result.evaluatorLog,
    });
  } catch (e: any) {
    logger.error?.(`[v4/booklet/lab:submit] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal", message: "تعذّر إنهاء المعمل الآن، أعد المحاولة." });
  }
});

export default router;
