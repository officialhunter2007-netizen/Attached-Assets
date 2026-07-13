// ─────────────────────────────────────────────────────────────────────────────
// v4 admin routes — list specialties, fetch instruction-file versions,
// validate-without-publish, autofix-all-errors, publish a new version,
// hard-delete a version.
//
// All endpoints require `role = 'admin'` on the calling user (cookie session).
// Mounted under /api by app.ts, so route paths here are relative to /api.
// ─────────────────────────────────────────────────────────────────────────────
import express, { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import { eq, desc, and } from "drizzle-orm";
import {
  db,
  usersTable,
  v4SpecialtiesTable,
  v4InstructionFileVersionsTable,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  v4LessonsTable,
  v4LessonConceptsTable,
  v4LessonCommonMistakesTable,
  v4LabScenariosTable,
  v4LabQuestionsTable,
  v4ExamQuestionsTable,
  v4PlacementTestQuestionsTable,
  v4StudentBookletsTable,
  v4PlacementQuestionSchema,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { validateV4InstructionFile } from "../lib/v4-instruction-validator";
import type { V4ValidationReport } from "../lib/v4-instruction-validator";
import { publishV4InstructionFile, deleteV4InstructionVersion } from "../lib/v4-instruction-normalizer";
import { autoFixV4InstructionFile, type AutoFixResult } from "../lib/v4-instruction-autofix";
import { cacheValidatedDoc, getValidatedDoc, dropValidatedDoc } from "../lib/v4-instruction-cache";
import type { PublishProgress } from "../lib/v4-instruction-normalizer";
import { generateGeminiJson, hasGeminiProvider, GenerateGeminiError } from "../lib/openrouter-generate";
import { compareCodes } from "../lib/v4-path-engine";
import { prewarmLessonContentForVersion } from "../lib/v4-teaching-core";
import { recordAiUsage, extractGeminiUsage } from "../lib/ai-usage";
import { requireSameOriginCsrf } from "../lib/csrf";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

// Express handlers must return `void` (or `Promise<void>`) — using
// `return res.status(...)` short-circuits but TS infers Response and
// noImplicitReturns complains. This helper standardizes the early-exit
// pattern across every handler in this file.
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isAdmin(uid))) { res.status(403).json({ error: "Forbidden" }); return; }
  (req as any).adminUserId = uid;
  next();
}

// ── Large-upload support: accept gzip-compressed instruction files ─────────
// A full per-specialty curriculum serializes to tens of MB of JSON. The FE
// gzips it (CompressionStream) and sends `Content-Type: application/gzip`;
// that compressed body is only a few MB, so it clears every proxy/body limit
// no matter how big the curriculum grows. This permanently removes file SIZE
// as a failure mode. Plain `application/json` uploads still work via the
// global express.json parser (this raw parser only matches gzip bodies).
const gunzipAsync = promisify(zlib.gunzip);
const rawGzipBody = express.raw({
  type: ["application/gzip", "application/octet-stream"],
  limit: "64mb", // the COMPRESSED ceiling — ~10-20× headroom vs. the raw file.
});
async function decodeInstructionBody(req: Request, res: Response, next: NextFunction): Promise<void> {
  // When the raw parser ran, req.body is a Buffer of gzip bytes. Inflate +
  // JSON.parse it. Otherwise it's already a parsed object (plain JSON path).
  if (Buffer.isBuffer((req as any).body)) {
    try {
      // Cap the INFLATED size so a maliciously-compressible payload (gzip bomb)
      // can't blow up memory. 128MB is generous headroom over the largest real
      // curriculum; exceeding it throws ERR_BUFFER_TOO_LARGE → handled below.
      const inflated = await gunzipAsync((req as any).body, { maxOutputLength: 128 * 1024 * 1024 });
      (req as any).body = JSON.parse(inflated.toString("utf8"));
    } catch (e: any) {
      logger.warn({ err: e?.message }, "v4: failed to inflate/parse gzip instruction upload");
      res.status(400).json({ error: "تعذّر فك ضغط أو قراءة الملف المرفوع. تأكد أنه ملف JSON صالح وبحجم معقول." });
      return;
    }
  }
  next();
}

// ── GET /admin/v4/specialties ──────────────────────────────────────────────
router.get("/admin/v4/specialties", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows: any[] = await db.select().from(v4SpecialtiesTable).orderBy(v4SpecialtiesTable.slug);

  // Bulk-fetch active versions in one query, then join in JS so we don't
  // fire N+1 queries against the (small) list of specialties.
  const activeIds: number[] = rows
    .map((r: any) => r.activeInstructionVersionId)
    .filter((x: any): x is number => typeof x === "number");
  const activeVersions: any[] = activeIds.length
    ? await db
        .select({
          id: v4InstructionFileVersionsTable.id,
          version: v4InstructionFileVersionsTable.version,
          publishedAt: v4InstructionFileVersionsTable.publishedAt,
          parsedSummary: v4InstructionFileVersionsTable.parsedSummary,
        })
        .from(v4InstructionFileVersionsTable)
    : [];
  const versionMap = new Map<number, any>(activeVersions.map((v: any) => [v.id as number, v]));

  res.json({
    specialties: rows.map((r: any) => {
      const active = r.activeInstructionVersionId ? versionMap.get(r.activeInstructionVersionId) ?? null : null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        icon: r.icon,
        activeVersion: active,
        updatedAt: r.updatedAt,
      };
    }),
  });
});

// ── GET /admin/v4/specialties/:slug ────────────────────────────────────────
// Full specialty + version history (newest first). Excludes raw_json from the
// list to keep payloads small; use `/versions/:id` to fetch one document.
router.get("/admin/v4/specialties/:slug", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const [specialty] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, req.params.slug));
  if (!specialty) { res.status(404).json({ error: "Specialty not found" }); return; }

  const versions = await db
    .select({
      id: v4InstructionFileVersionsTable.id,
      version: v4InstructionFileVersionsTable.version,
      status: v4InstructionFileVersionsTable.status,
      notes: v4InstructionFileVersionsTable.notes,
      parsedSummary: v4InstructionFileVersionsTable.parsedSummary,
      publishedAt: v4InstructionFileVersionsTable.publishedAt,
      publishedByUserId: v4InstructionFileVersionsTable.publishedByUserId,
    })
    .from(v4InstructionFileVersionsTable)
    .where(eq(v4InstructionFileVersionsTable.specialtyId, specialty.id))
    .orderBy(desc(v4InstructionFileVersionsTable.version));

  res.json({ specialty, versions });
});

// ── GET /admin/v4/versions/:id ─────────────────────────────────────────────
// Return the full raw JSON for one version (loaded into the editor when
// the admin clicks a version in the history sidebar).
router.get("/admin/v4/versions/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid version id" }); return; }
  const [v] = await db.select().from(v4InstructionFileVersionsTable).where(eq(v4InstructionFileVersionsTable.id, id));
  if (!v) { res.status(404).json({ error: "Version not found" }); return; }
  res.json({ version: v });
});

// ── POST /admin/v4/validate ────────────────────────────────────────────────
// Validate without persisting. Body: { json: <instruction file> }.
// Caches the Zod-parsed document so a subsequent publish can skip
// re-parse + re-validate — critical for multi-MB files.
router.post("/admin/v4/validate", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body; // accept either {json:…} or the raw doc.
  const report = validateV4InstructionFile(raw);
  let cacheToken: string | undefined;
  if (report.ok && report.parsed) {
    cacheToken = cacheValidatedDoc(report.parsed, report);
  }
  res.json({
    ok: report.ok,
    summary: report.summary,
    issues: report.issues,
    ...(cacheToken ? { cacheToken } : {}),
  });
});

// ── POST /admin/v4/autofix ──────────────────────────────────────────────────
// One-click "Fix ALL Errors" — deterministic repair of every Zod + cross-ref
// issue. Returns the fixed JSON, a human-readable Arabic change log, and a
// cache token so the admin can publish with one more click (no re-parse).
router.post("/admin/v4/autofix", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body;
  let result: AutoFixResult;
  try {
    result = autoFixV4InstructionFile(raw);
  } catch (e: any) {
    logger.warn({ err: e?.message }, "v4: autofix failed (input may be unparseable)");
    res.status(400).json({ ok: false, error: "تعذّر الإصلاح التلقائي — الملف قد يكون تالفاً أو غير قابل للقراءة." });
    return;
  }
  const cacheToken = cacheValidatedDoc(result.fixedDoc, result.report);
  res.json({
    ok: result.report.ok,
    fixedJson: result.fixedDoc,
    changes: result.changes,
    summary: result.report.summary,
    issues: result.report.issues,
    cacheToken,
  });
});

// ── POST /admin/v4/publish ─────────────────────────────────────────────────
// Validate + (if ok) publish a new version atomically.
// Accepts an optional `cacheToken` from a prior /validate or /autofix call.
// When present, the cached Zod-parsed document is used DIRECTLY — no re-inflate,
// no re-parse, no re-validate. Saves tens of seconds on multi-MB files.
router.post("/admin/v4/publish", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body;

  // Fast-path: use cached validated doc if the client passed a valid token.
  const cacheToken: string | undefined = body.cacheToken;
  if (cacheToken) {
    const cached = getValidatedDoc(cacheToken);
    if (cached) {
      try {
        const result = await publishV4InstructionFile(cached.parsed, (req as any).adminUserId);
        dropValidatedDoc(cacheToken);
        logger.info(
          { specialtyId: result.specialtyId, version: result.version, summary: result.summary },
          "v4: published instruction file (cached fast-path)",
        );
        // Fire-and-forget pre-warm so first students see instant lesson loads.
        const prewarmSlug = (cached.parsed as any)?.specialty?.slug ?? `specialty-${result.specialtyId}`;
        void prewarmLessonContentForVersion(result.versionId, prewarmSlug);
        res.json({ ok: true, ...result });
        return;
      } catch (e: any) {
        if (e?.report) {
          res.status(400).json({ ok: false, error: "Validation failed", report: e.report });
          return;
        }
        logger.error({ err: e?.message }, "v4: publish failed (cached path)");
        res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
        return;
      }
    }
    // Token expired / invalid — fall through to the slow path.
    logger.warn("v4: publish cache token expired, falling back to slow path");
  }

  // Slow-path: full parse + validate + publish (the original flow).
  try {
    const result = await publishV4InstructionFile(raw, (req as any).adminUserId);
    logger.info(
      { specialtyId: result.specialtyId, version: result.version, summary: result.summary },
      "v4: published instruction file",
    );
    // Fire-and-forget pre-warm so first students see instant lesson loads.
    const prewarmSlug = (raw as any)?.specialty?.slug ?? `specialty-${result.specialtyId}`;
    void prewarmLessonContentForVersion(result.versionId, prewarmSlug);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.report) {
      res.status(400).json({
        ok: false,
        error: "Validation failed — fix the issues and try again",
        report: e.report,
      });
      return;
    }
    logger.error({ err: e?.message }, "v4: publish failed");
    res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

// ── POST /admin/v4/publish-stream ───────────────────────────────────────────
// SSE (Server-Sent Events) version of publish. Streams real-time progress events
// as the normalizer inserts each phase of rows. Use when the admin wants to see
// live feedback during a large publish. Falls back to regular publish on error.
router.post("/admin/v4/publish-stream", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body;

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // disable nginx buffering
  });
  res.flushHeaders();

  const send = (event: string, data: any) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  // Fast-path: use cached validated doc if available.
  const cacheToken: string | undefined = body.cacheToken;
  let parsedDoc: any = null;
  if (cacheToken) {
    const cached = getValidatedDoc(cacheToken);
    if (cached) {
      parsedDoc = cached.parsed;
      dropValidatedDoc(cacheToken);
    }
  }

  try {
    const onProgress = (p: PublishProgress) => send("progress", p);
    const result = await publishV4InstructionFile(
      parsedDoc ?? raw,
      (req as any).adminUserId,
      onProgress,
    );
    send("done", { ok: true, ...result });
  } catch (e: any) {
    if (e?.report) {
      send("error", { ok: false, error: "Validation failed", report: e.report });
    } else {
      send("error", { ok: false, error: e?.message ?? "Unknown error" });
    }
  }
  res.end();
});

// ── DELETE /admin/v4/versions/:id ──────────────────────────────────────────
// Hard-delete a specific version + its child rows. Running sessions pinned
// to this version will break — the UI gates behind a confirm dialog.
router.delete("/admin/v4/versions/:id", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid version id" }); return; }
  try {
    await deleteV4InstructionVersion(id);
    res.json({ ok: true });
  } catch (e: any) {
    logger.error({ err: e?.message, versionId: id }, "v4: delete version failed");
    res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

// ── POST /admin/v4/specialties/:slug/activate-version ─────────────────────
// Swap which version is active for a specialty (rollback / switch).
router.post("/admin/v4/specialties/:slug/activate-version", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const versionId = Number((req.body as any)?.versionId);
  if (!Number.isInteger(versionId)) { res.status(400).json({ error: "versionId required" }); return; }

  const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, req.params.slug));
  if (!sp) { res.status(404).json({ error: "Specialty not found" }); return; }

  const [v] = await db.select().from(v4InstructionFileVersionsTable).where(
    and(
      eq(v4InstructionFileVersionsTable.id, versionId),
      eq(v4InstructionFileVersionsTable.specialtyId, sp.id),
    ),
  );
  if (!v) { res.status(404).json({ error: "Version not found for this specialty" }); return; }

  await db
    .update(v4SpecialtiesTable)
    .set({ activeInstructionVersionId: versionId, updatedAt: new Date() })
    .where(eq(v4SpecialtiesTable.id, sp.id));

  // Fire-and-forget pre-warm for the newly activated version.
  void prewarmLessonContentForVersion(versionId, req.params.slug);
  res.json({ ok: true, activeVersionId: versionId });
});

// ── GET /admin/v4/specialties/:slug/tree ──────────────────────────────────
// Hierarchical tree of the active version, fetched from the *normalized*
// tables (not raw_json). Proves the normalizer round-trips correctly and
// powers the admin "report" view.
router.get("/admin/v4/specialties/:slug/tree", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, req.params.slug));
  if (!sp) { res.status(404).json({ error: "Specialty not found" }); return; }
  if (!sp.activeInstructionVersionId) { res.json({ specialty: sp, tree: null }); return; }

  const versionId = sp.activeInstructionVersionId;
  // Bulk-fetch everything in parallel (vs N+1 walking the tree).
  const [levels, stages, units, lessons, concepts, mistakes, labs, labQuestions, examQs, placement] = await Promise.all([
    db.select().from(v4LevelsTable).where(eq(v4LevelsTable.versionId, versionId)).orderBy(v4LevelsTable.levelIndex),
    db.select().from(v4StagesTable).where(eq(v4StagesTable.versionId, versionId)).orderBy(v4StagesTable.code),
    db.select().from(v4UnitsTable).where(eq(v4UnitsTable.versionId, versionId)).orderBy(v4UnitsTable.code),
    db.select().from(v4LessonsTable).where(eq(v4LessonsTable.versionId, versionId)).orderBy(v4LessonsTable.code),
    db.select().from(v4LessonConceptsTable).where(eq(v4LessonConceptsTable.versionId, versionId)).orderBy(v4LessonConceptsTable.conceptIndex),
    db.select().from(v4LessonCommonMistakesTable).where(eq(v4LessonCommonMistakesTable.versionId, versionId)).orderBy(v4LessonCommonMistakesTable.mistakeIndex),
    db.select().from(v4LabScenariosTable).where(eq(v4LabScenariosTable.versionId, versionId)).orderBy(v4LabScenariosTable.code),
    db.select().from(v4LabQuestionsTable).where(eq(v4LabQuestionsTable.versionId, versionId)).orderBy(v4LabQuestionsTable.questionIndex),
    db.select().from(v4ExamQuestionsTable).where(eq(v4ExamQuestionsTable.versionId, versionId)).orderBy(v4ExamQuestionsTable.questionIndex),
    db.select().from(v4PlacementTestQuestionsTable).where(eq(v4PlacementTestQuestionsTable.versionId, versionId)).orderBy(v4PlacementTestQuestionsTable.questionIndex),
  ]);

  res.json({
    specialty: sp,
    versionId,
    counts: {
      levels: levels.length,
      stages: stages.length,
      units: units.length,
      lessons: lessons.length,
      concepts: concepts.length,
      commonMistakes: mistakes.length,
      labs: labs.length,
      labQuestions: labQuestions.length,
      examQuestions: examQs.length,
      placementQuestions: placement.length,
    },
    tree: { levels, stages, units, lessons, concepts, mistakes, labs, labQuestions, examQs, placement },
  });
});

// ── GET /admin/v4/booklets/needs-review ────────────────────────────────────
// Returns booklets that have at least one lesson with needsReview=true,
// plus the lesson list for each booklet (so the admin can bind pages).
router.get("/admin/v4/booklets/needs-review", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: v4StudentBookletsTable.id,
        userId: v4StudentBookletsTable.userId,
        subjectId: v4StudentBookletsTable.subjectId,
        title: v4StudentBookletsTable.title,
        pagesCount: v4StudentBookletsTable.pagesCount,
        status: v4StudentBookletsTable.status,
        instructionTree: v4StudentBookletsTable.instructionTree,
        createdAt: v4StudentBookletsTable.createdAt,
      })
      .from(v4StudentBookletsTable)
      .where(eq(v4StudentBookletsTable.status, "ready"))
      .orderBy(desc(v4StudentBookletsTable.id));

    const filtered = rows
      .map((r: any) => {
        const tree = (r.instructionTree ?? { units: [] }) as { units?: Array<{ code: string; name: string; lessons?: Array<any> }> };
        const needs: Array<{ unitCode: string; unitName: string; lessonCode: string; lessonName: string; pages: [number, number]; reason?: string }> = [];
        for (const u of tree.units ?? []) {
          for (const l of u.lessons ?? []) {
            if (l?.needsReview) {
              needs.push({
                unitCode: String(u.code),
                unitName: String(u.name),
                lessonCode: String(l.code),
                lessonName: String(l.name),
                pages: (Array.isArray(l.pages) && l.pages.length === 2 ? l.pages : [1, 1]) as [number, number],
                reason: String(l.needsReviewReason ?? ""),
              });
            }
          }
        }
        return needs.length ? { ...r, needsReviewLessons: needs } : null;
      })
      .filter(Boolean);

    res.json({ booklets: filtered });
  } catch (e: any) {
    logger.error?.(`[admin/v4/booklets/needs-review] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /admin/v4/booklets/:id/bind-lesson ────────────────────────────────
// Manual binding tool: admin sets the [start,end] page range for a lesson
// that the LLM couldn't bind during processing. Clears needsReview flag.
router.post("/admin/v4/booklets/:id/bind-lesson", requireAdmin, requireSameOriginCsrf, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const body: any = req.body ?? {};
  const lessonCode = String(body.lessonCode ?? "").trim();
  const startPage = Number(body.startPage);
  const endPage = Number(body.endPage);

  if (!Number.isInteger(id) || !lessonCode || !Number.isInteger(startPage) || !Number.isInteger(endPage)) {
    res.status(400).json({ error: "bad_params" }); return;
  }
  if (startPage < 1 || endPage < startPage) {
    res.status(400).json({ error: "invalid_range" }); return;
  }

  try {
    const [row] = await db.select().from(v4StudentBookletsTable).where(eq(v4StudentBookletsTable.id, id));
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    if (row.pagesCount && endPage > row.pagesCount) {
      res.status(400).json({ error: "page_out_of_range", maxPage: row.pagesCount }); return;
    }
    const tree = (row.instructionTree ?? { units: [] }) as any;
    let found = false;
    for (const u of tree.units ?? []) {
      for (const l of u.lessons ?? []) {
        if (l?.code === lessonCode) {
          l.pages = [startPage, endPage];
          delete l.needsReview;
          delete l.needsReviewReason;
          found = true;
        }
      }
    }
    if (!found) { res.status(404).json({ error: "lesson_not_found" }); return; }

    await db.update(v4StudentBookletsTable)
      .set({ instructionTree: tree })
      .where(eq(v4StudentBookletsTable.id, id));
    res.json({ ok: true, bookletId: id, lessonCode, pages: [startPage, endPage] });
  } catch (e: any) {
    logger.error?.(`[admin/v4/booklets/bind-lesson] ${String(e?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// v4.1 — downloadable empty template that walks the admin through every
// optional pedagogical field. Returned as JSON so the FE can dump it into
// Monaco verbatim. Mirrors a single specialty / one level / one stage /
// one unit / one lesson with placeholders for the new fields.
router.get("/admin/v4/template", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const template = {
    schema_version: "v4.1",
    specialty: {
      slug: "my-specialty",
      name: "اسم التخصص",
      description: "وصف قصير",
      target_persona: "طالب جامعي يمني في السنة الأولى",
      teacher_tone: "ودود، ساخر بخفّة، عملي",
      yemeni_examples: ["سوق باب اليمن", "محطة شملان"],
      allowed_viz_templates: ["python_trace", "regex_match"],
      allowed_tools: ["repl-py", "regex-playground"],
      glossary: [{ term: "API", definition: "واجهة برمجية" }],
    },
    levels: [{
      level_index: 1,
      name: "المستوى 1",
      goal: "الهدف العام للمستوى",
      bloom_focus: "remember",
      stages: [{
        stage_index: 1,
        name: "المرحلة 1",
        goal: "هدف المرحلة",
        bloom_focus: "understand",
        units: [{
          unit_index: 1,
          name: "وحدة تجريبية",
          goal: "هدف الوحدة",
          prerequisite_units: [],
          enables_units: [],
          key_concepts: ["مفهوم تجريبي"],
          motivation_hook: "لماذا تهمّك هذه الوحدة؟",
          learning_objectives: [
            { statement: "أن يصف الطالب …", bloom_level: "understand" },
          ],
          lessons: [{
            lesson_index: 1,
            name: "الدرس الأول",
            goal: "هدف الدرس",
            bridge_sentence: "جملة افتتاحية بأكثر من عشر كلمات لتمهّد الطالب.",
            prerequisite_lessons: [],
            enables_lessons: [],
            final_check_question: "ما تعريف …؟",
            session_complete_criterion: "أن يجيب الطالب بدقة عن السؤال النهائي.",
            yemeni_examples: ["مثال يمني"],
            motivation_hook: "ربط بحياة الطالب اليومية",
            learning_objectives: [
              { statement: "أن يطبّق الطالب …", bloom_level: "apply" },
            ],
            glossary: [{ term: "مصطلح", definition: "تعريفه" }],
            solution_outline: "النقاط الأساسية في الإجابة النموذجية للسؤال النهائي.",
            concepts: [{
              name: "المفهوم 1",
              explanation: "شرح موجز",
              mastery_criterion: "قادر على إعادة الشرح بأسلوبه",
              weight: 2,
            }],
            common_mistakes: [{
              mistake: "خطأ شائع",
              correction: "الصواب",
              treatment: "كيف تعالجه",
              severity: "major",
            }],
          }],
          labs: [{
            lab_index: 1,
            title: "معمل تجريبي",
            scenario: "سيناريو …",
            completion_criterion: "متى يُعتبر المعمل مكتملاً",
            pedagogical_sequence: "diagnostic → decision → application → analysis → connection",
            prerequisite_lessons: [],
            allowed_tools: ["repl-py"],
            questions: [
              { kind: "diagnostic", prompt: "…", rubric: "…", solution_outline: "…", points: 1 },
              { kind: "decision", prompt: "…", rubric: "…", solution_outline: "…", points: 1 },
              { kind: "application", prompt: "…", rubric: "…", solution_outline: "…", points: 1 },
              { kind: "analysis", prompt: "…", rubric: "…", solution_outline: "…", points: 1 },
              { kind: "connection", prompt: "…", rubric: "…", solution_outline: "…", points: 1 },
            ],
          }],
          exam: { pass_threshold_percent: 70, points: 10, time_limit_minutes: 15 },
        }],
        exam: { pass_threshold_percent: 70 },
      }],
      exam: { pass_threshold_percent: 70 },
    }],
    exam_banks: { unit_banks: {}, stage_banks: {}, level_banks: {} },
    placement_test_questions: [],
  };
  res.json({ ok: true, template });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/v4/specialties/:slug/generate-placement — AI authoring tool.
//
// Generates per-unit placement MCQs from the active instruction version's
// units/lessons/concepts, tagged by target_unit_code so the adaptive descent
// engine (task #3) can place a student at UNIT precision, not just level.
//
// Output is a `placement_test_questions` JSON FRAGMENT the admin reviews in
// Monaco, merges into the instruction file, and re-publishes. We deliberately
// do NOT write to the DB here: the normalizer DELETE+reinserts placement rows
// on every publish, so DB-only questions would be silently wiped. The
// instruction file stays the single source of truth.
//
// Bounded by design — caps units per call and runs a small concurrency pool so
// a single request can't fan out into hundreds of paid Gemini calls.
// ─────────────────────────────────────────────────────────────────────────────

function stripJsonFence(s: string): string {
  const t = String(s ?? "").trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

type UnitGenContext = {
  code: string; // "L.S.U"
  name: string;
  goal: string;
  keyConcepts: string[];
  lessons: { name: string; goal: string }[];
  concepts: { name: string; explanation: string }[];
};

function buildPlacementUnitPrompt(u: UnitGenContext, perUnit: number): string {
  const lessonsBlock = u.lessons
    .map((l, i) => `${i + 1}. ${l.name} — ${l.goal}`)
    .join("\n")
    .slice(0, 4000);
  const conceptsBlock = u.concepts
    .map((c) => `- ${c.name}: ${c.explanation}`)
    .join("\n")
    .slice(0, 4000);
  const keyBlock = (u.keyConcepts || []).filter(Boolean).join("، ");
  return `أنت خبير مناهج تعليمية تُعدّ أسئلة "اختبار تحديد المستوى" لتخصص يمني.
الهدف: قياس ما إذا كان الطالب يُتقن وحدة محددة مسبقاً (فيتجاوزها) أم يحتاج دراستها.

الوحدة المستهدفة (الكود ${u.code}):
- الاسم: ${u.name}
- الهدف: ${u.goal}
${keyBlock ? `- المفاهيم المفتاحية: ${keyBlock}` : ""}

دروس الوحدة:
${lessonsBlock || "(لا توجد دروس مُفصّلة)"}
${conceptsBlock ? `\nتفاصيل المفاهيم:\n${conceptsBlock}` : ""}

المطلوب: أنشئ ${perUnit} سؤال اختيار من متعدد (MCQ) بالعربية الفصحى تقيس إتقان هذه الوحدة بالتحديد — لا أسهل ولا أصعب من مستواها.

أعد JSON فقط — بدون أي شرح أو أسوار markdown — بهذا الشكل بالضبط:
{
  "questions": [
    {
      "prompt": "نص السؤال",
      "choices": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correct_index": 0,
      "difficulty": 2
    }
  ]
}

قواعد صارمة:
- لكل سؤال 4 خيارات بالضبط، وخيار واحد فقط صحيح.
- correct_index هو فهرس الخيار الصحيح ويبدأ من 0.
- difficulty عدد من 1 (سهل) إلى 3 (صعب) يعكس صعوبة الوحدة.
- الأسئلة من صميم محتوى الوحدة، لا عامة ولا من خارجها.
- تجنّب الأسئلة المكرّرة أو التافهة أو التي تُحلّ بالحدس.`;
}

type ParsedGenQuestion = { prompt: string; choices: string[]; correct_index: number; difficulty: number };

function parsePlacementGenJson(txt: string): ParsedGenQuestion[] {
  let parsed: any;
  try { parsed = JSON.parse(stripJsonFence(txt)); } catch { return []; }
  const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const out: ParsedGenQuestion[] = [];
  for (const q of arr) {
    const prompt = String(q?.prompt ?? "").trim();
    const choices = Array.isArray(q?.choices)
      ? q.choices.map((c: any) => String(c ?? "").trim()).filter(Boolean)
      : [];
    const ci = Number(q?.correct_index);
    let diff = Number(q?.difficulty);
    if (!Number.isInteger(diff) || diff < 1 || diff > 3) diff = 2;
    if (!prompt || choices.length < 2) continue;
    if (!Number.isInteger(ci) || ci < 0 || ci >= choices.length) continue;
    out.push({ prompt, choices, correct_index: ci, difficulty: diff });
  }
  return out;
}

// Minimal concurrency pool — caps simultaneous in-flight Gemini calls.
async function runGenPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runner(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

router.post(
  "/admin/v4/specialties/:slug/generate-placement",
  requireAdmin,
  requireSameOriginCsrf,
  async (req: Request, res: Response): Promise<void> => {
    if (!hasGeminiProvider()) {
      res.status(503).json({ ok: false, error: "مولّد الذكاء الاصطناعي غير مهيأ (المفتاح غير متوفر)." });
      return;
    }

    const body: any = req.body ?? {};
    let perUnit = Number(body.perUnit);
    if (!Number.isInteger(perUnit) || perUnit < 1) perUnit = 2;
    if (perUnit > 5) perUnit = 5;

    const MAX_UNITS = 60;
    let maxUnits = Number(body.maxUnits);
    if (!Number.isInteger(maxUnits) || maxUnits < 1) maxUnits = 24;
    if (maxUnits > MAX_UNITS) maxUnits = MAX_UNITS;

    const onlyLevel = Number.isInteger(Number(body.levelIndex)) ? Number(body.levelIndex) : null;
    const onlyUnitCodes: Set<string> | null =
      Array.isArray(body.unitCodes) && body.unitCodes.length
        ? new Set(body.unitCodes.map((c: any) => String(c).trim()).filter(Boolean))
        : null;

    const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, req.params.slug));
    if (!sp) { res.status(404).json({ ok: false, error: "Specialty not found" }); return; }
    if (!sp.activeInstructionVersionId) {
      res.status(400).json({ ok: false, error: "لا يوجد إصدار منشور لهذا التخصص." });
      return;
    }
    const versionId = sp.activeInstructionVersionId;

    const [units, lessons, concepts] = await Promise.all([
      db.select().from(v4UnitsTable).where(eq(v4UnitsTable.versionId, versionId)),
      db.select().from(v4LessonsTable).where(eq(v4LessonsTable.versionId, versionId)),
      db.select().from(v4LessonConceptsTable).where(eq(v4LessonConceptsTable.versionId, versionId)),
    ]);
    if (units.length === 0) {
      res.status(400).json({ ok: false, error: "لا توجد وحدات في الإصدار النشط." });
      return;
    }

    // Group lessons by unitId, then concepts by their lesson's unitId.
    const lessonsByUnit = new Map<number, any[]>();
    const lessonIdToUnit = new Map<number, number>();
    for (const l of lessons) {
      lessonIdToUnit.set(l.id, l.unitId);
      const arr = lessonsByUnit.get(l.unitId) ?? [];
      arr.push(l);
      lessonsByUnit.set(l.unitId, arr);
    }
    const conceptsByUnit = new Map<number, any[]>();
    for (const c of concepts) {
      const uId = lessonIdToUnit.get(c.lessonId);
      if (uId == null) continue;
      const arr = conceptsByUnit.get(uId) ?? [];
      arr.push(c);
      conceptsByUnit.set(uId, arr);
    }

    // Select → filter → order → cap target units.
    let targetUnits = units.slice();
    if (onlyLevel != null) {
      targetUnits = targetUnits.filter((u) => (parseInt(String(u.code).split(".")[0], 10) || 0) === onlyLevel);
    }
    if (onlyUnitCodes) {
      targetUnits = targetUnits.filter((u) => onlyUnitCodes.has(u.code));
    }
    targetUnits.sort((a, b) => compareCodes(a.code, b.code));
    const truncated = targetUnits.length > maxUnits;
    targetUnits = targetUnits.slice(0, maxUnits);
    if (targetUnits.length === 0) {
      res.status(400).json({ ok: false, error: "لا توجد وحدات مطابقة للمعايير." });
      return;
    }

    const failedUnits: string[] = [];
    const adminUserId = (req as any).adminUserId as number;
    const perUnitResults = await runGenPool(targetUnits, 4, async (u) => {
      const ctx: UnitGenContext = {
        code: u.code,
        name: u.name,
        goal: u.goal,
        keyConcepts: Array.isArray(u.keyConcepts) ? (u.keyConcepts as any[]).map(String) : [],
        lessons: (lessonsByUnit.get(u.id) ?? [])
          .slice()
          .sort((a, b) => compareCodes(a.code, b.code))
          .map((l) => ({ name: l.name, goal: l.goal })),
        concepts: (conceptsByUnit.get(u.id) ?? []).map((c) => ({ name: c.name, explanation: c.explanation })),
      };
      const startedAt = Date.now();
      try {
        const result = await generateGeminiJson({
          userPrompt: buildPlacementUnitPrompt(ctx, perUnit),
          model: "gemini-2.5-flash",
          temperature: 0.5,
          maxOutputTokens: 4096,
          timeoutMs: 90_000,
          logTag: "v4-placement-gen",
        });
        const usage = extractGeminiUsage(result.usageMetadata);
        void recordAiUsage({
          userId: adminUserId ?? null,
          subjectId: sp.slug,
          route: "admin/v4/generate-placement",
          provider: "gemini",
          model: "gemini-2.5-flash",
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedInputTokens: usage.cachedInputTokens,
          latencyMs: Date.now() - startedAt,
          metadata: { unitCode: u.code, channel: result.channel },
        });
        return { unit: u, questions: parsePlacementGenJson(result.text) };
      } catch (e: any) {
        const status = e instanceof GenerateGeminiError ? e.status : 0;
        logger.warn({ unit: u.code, status, err: e?.message }, "v4: placement gen failed for unit");
        failedUnits.push(u.code);
        return { unit: u, questions: [] as ParsedGenQuestion[] };
      }
    });

    // Map → schema-shaped placement questions, zod-validate each.
    const fragment: any[] = [];
    let skipped = 0;
    for (const r of perUnitResults) {
      const segs = String(r.unit.code).split(".");
      const levelIndex = (parseInt(segs[0] ?? "1", 10) || 1);
      const stageCode = segs.length >= 2 ? `${segs[0]}.${segs[1]}` : undefined;
      for (const q of r.questions) {
        const candidate = {
          target_level_index: levelIndex,
          target_stage_code: stageCode,
          target_unit_code: r.unit.code,
          kind: "mcq" as const,
          prompt: q.prompt,
          choices: q.choices,
          correct_index: q.correct_index,
          difficulty: q.difficulty,
        };
        const parsed = v4PlacementQuestionSchema.safeParse(candidate);
        if (parsed.success) fragment.push(parsed.data);
        else skipped++;
      }
    }

    logger.info(
      { slug: sp.slug, versionId, units: targetUnits.length, generated: fragment.length, skipped, failed: failedUnits.length },
      "v4: generated placement questions",
    );

    res.json({
      ok: true,
      slug: sp.slug,
      versionId,
      unitsRequested: targetUnits.length,
      unitsFailed: failedUnits,
      truncated,
      generated: fragment.length,
      skipped,
      placement_test_questions: fragment,
    });
  },
);

export default router;
