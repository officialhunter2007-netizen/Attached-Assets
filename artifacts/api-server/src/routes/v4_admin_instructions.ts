// ─────────────────────────────────────────────────────────────────────────────
// v4 admin routes — list specialties, fetch instruction-file versions,
// validate-without-publish, publish a new version, hard-delete a version.
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
} from "@workspace/db";
import { logger } from "../lib/logger";
import { validateV4InstructionFile } from "../lib/v4-instruction-validator";
import { publishV4InstructionFile, deleteV4InstructionVersion } from "../lib/v4-instruction-normalizer";

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

// CSRF defense for v4 mutating endpoints (POST/DELETE).
//
// The app-wide CORS config is `{ origin: true, credentials: true }` and
// production cookies are SameSite=none — meaning a malicious site could
// otherwise issue a request with the admin's session cookie attached.
// Code review (architect) flagged this as SEVERE on 2026-05-28.
//
// We don't widen the blast radius of this fix to the whole app (that
// requires user sign-off — touching CORS could break other admin tabs and
// the FE). Instead this middleware enforces two defenses *locally* on v4
// mutating routes:
//
//   1. Origin / Referer must equal the request's own Host (same-origin).
//      Cross-origin requests are rejected outright.
//   2. The custom `X-Nukhba-Csrf` header must be present. Browsers can
//      only attach custom headers cross-origin via a CORS preflight, and
//      our FE sends it on every v4 admin call. A simple-cross-site form
//      POST from a malicious page has no way to add it.
//
// The header check is the strong defense (custom-header pattern is the
// modern CSRF safeguard for cookie-auth APIs). The Origin check is a
// belt-and-suspenders fallback.
function requireSameOriginCsrf(req: Request, res: Response, next: NextFunction): void {
  // Strong defense — custom header.
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return;
  }
  // Belt-and-suspenders — Origin/Referer must match Host.
  const host = (req.headers.host || "").toLowerCase();
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();
  const sourceHost = origin
    ? new URL(origin).host
    : referer
      ? (() => { try { return new URL(referer).host; } catch { return ""; } })()
      : "";
  if (!sourceHost || sourceHost !== host) {
    res.status(403).json({ error: "CSRF protection: cross-origin request rejected" });
    return;
  }
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
router.post("/admin/v4/validate", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body; // accept either {json:…} or the raw doc.
  const report = validateV4InstructionFile(raw);
  res.json({
    ok: report.ok,
    summary: report.summary,
    issues: report.issues,
  });
});

// ── POST /admin/v4/publish ─────────────────────────────────────────────────
// Validate + (if ok) publish a new version atomically.
router.post("/admin/v4/publish", requireAdmin, requireSameOriginCsrf, rawGzipBody, decodeInstructionBody, async (req: Request, res: Response): Promise<void> => {
  const body: any = req.body ?? {};
  const raw = body.json ?? body;
  try {
    const result = await publishV4InstructionFile(raw, (req as any).adminUserId);
    logger.info(
      { specialtyId: result.specialtyId, version: result.version, summary: result.summary },
      "v4: published instruction file",
    );
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

export default router;
