// ─────────────────────────────────────────────────────────────────────────────
// v4 task #3 — Custom-path setup routes.
//
// Mounted under /api by app.ts. Endpoints here are all student-facing
// (cookie-session) and gated on the same CSRF middleware the v4 admin
// routes use (custom header + same-origin Origin/Referer) — the global
// CORS config is `origin: true, credentials: true` so without this
// middleware any cross-site form could ride the student's session cookie.
//
// Endpoints (all relative to /api):
//   GET  /v4/specialties/available
//   GET  /v4/path/:slug
//   POST /v4/path/:slug/diagnostic/start
//   POST /v4/path/:slug/diagnostic/answer
//   POST /v4/path/:slug/diagnostic/finish
//   POST /v4/path/:slug/placement/next
//   POST /v4/path/:slug/placement/finalize
//   POST /v4/path/:slug/booklet     — placeholder; booklet flow ships in #8
//
// Cost / gem semantics:
//   - The diagnostic conversation is FREE (cost folded into welcome gift).
//   - Placement test grading uses Anthropic Haiku via OpenRouter (one call
//     per non-MCQ answer); cost is absorbed into the welcome gift too —
//     we don't charge the v4 wallet at this stage because the wallet is
//     created by `getOrCreateV4Wallet` at the very end of finalize, by
//     which time the placement run is already complete.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  db,
  v4SpecialtiesTable,
  v4InstructionFileVersionsTable,
  v4DiagnosticSessionsTable,
  v4PlacementTestQuestionsTable,
  v4PlacementSessionsTable,
  v4UnitsTable,
  v4TestoutSessionsTable,
  type V4PlacementSession,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  V4_DIAGNOSTIC_QUESTIONS,
  resolveActiveSpecialty,
  getStudentPath,
  syncStudentPathToActiveVersion,
  createOrReplaceStudentPath,
  buildPlacementProfile,
  nextPlacementStep,
  gradePlacementAnswer,
  generatePlacementQuestions,
  PLACEMENT_SOFT_CAP,
  PLACEMENT_MIN_POOL,
  PLACEMENT_MIN_UNITS,
  type PlacementProbe,
  type PlacementPending,
  type PlacementResult,
  type AnyPlacementQuestion,
} from "../lib/v4-path-engine";
import { capturePersonalDictionaryFromDiagnostic } from "../lib/v4-memory";
import { subscribeProgressEvents } from "../lib/v4-progress-events";
import { generateScene, SceneGenerationError } from "../lib/v4-scene-store";
import { runV4PaidWork } from "../lib/v4-gem-wallet";
import { studentGemWalletsTable } from "@workspace/db";
import {
  resolveTestoutScope,
  resolveTestoutTarget,
  getOrCreateTestoutPool,
  loadTestoutPool,
  selectTestoutQuestions,
  nextTestoutQuestionId,
  toClientQuestion,
  gradeTestoutMcq,
  decideTestoutStep,
  applyTestoutPass,
  buildTestoutWeakAreas,
  resolveGateExamScope,
  getOrCreateGateExamPool,
  applyGateExamPass,
  TESTOUT_ASK_MIN,
  TESTOUT_ASK_MAX,
  TESTOUT_MIN_RUNNABLE,
  TESTOUT_PASS_PCT,
  type TestoutAnswerRec,
  type TestoutPending,
} from "../lib/v4-testout-engine";

const router: IRouter = Router();

function getUserId(req: Request): number | null {
  return ((req as any).session as any)?.userId ?? null;
}

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  (req as any).userId = uid;
  next();
}

// Same custom-header + same-origin CSRF defense as v4 admin routes.
// Cookie-session + permissive CORS means we must NOT accept simple
// cross-site POSTs without the FE-supplied custom header.
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

// ── GET /v4/specialties/available ──────────────────────────────────────────
// Used by the path-choice screen to know which specialties can show the
// "ابدأ" button. A specialty is "available" iff it has a currently-active
// published instruction file (task #1 contract).
router.get("/v4/specialties/available", requireUser, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: v4SpecialtiesTable.id,
        slug: v4SpecialtiesTable.slug,
        name: v4SpecialtiesTable.name,
        description: v4SpecialtiesTable.description,
        icon: v4SpecialtiesTable.icon,
        activeInstructionVersionId: v4SpecialtiesTable.activeInstructionVersionId,
      })
      .from(v4SpecialtiesTable)
      .where(isNotNull(v4SpecialtiesTable.activeInstructionVersionId));
    res.json({ specialties: rows.map((r: any) => ({
      slug: r.slug, name: r.name, description: r.description, icon: r.icon,
    })) });
  } catch (e) {
    logger.error?.(`[v4/specialties/available] ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/path/:slug ─────────────────────────────────────────────────────
// Returns: { available: boolean, specialty?: {...}, existingPath?: {...} }
// Drives the path-choice screen and the redirect-from-subject gate.
router.get("/v4/path/:slug", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) {
      res.json({ available: false });
      return;
    }
    const existing = await getStudentPath(uid, slug);
    res.json({
      available: true,
      specialty: {
        slug: resolved.specialty.slug,
        name: resolved.specialty.name,
        description: resolved.specialty.description,
        icon: resolved.specialty.icon,
        levelCount: resolved.levelLessonCodes.length,
        lessonCount: resolved.levelLessonCodes.flat().length,
      },
      existingPath: existing ? {
        pathType: existing.pathType,
        startMode: existing.startMode,
        startingLevelIndex: existing.startingLevelIndex,
        currentLessonCode: existing.currentLessonCode,
        unlockedCount: Array.isArray(existing.unlockedLessonCodes) ? (existing.unlockedLessonCodes as any[]).length : 0,
      } : null,
    });
  } catch (e) {
    logger.error?.(`[v4/path] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/path/:slug/wallet ──────────────────────────────────────────────
// Lightweight wallet snapshot used by the v4 lesson page header. Returns
// { exists, gemsBalance, expiresAt } so the FE can show a live balance
// pill that's refreshed off the terminal SSE event from /v4/teach.
router.get("/v4/path/:slug/wallet", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const [[w], [sp]] = await Promise.all([
      db
        .select()
        .from(studentGemWalletsTable)
        .where(and(
          eq(studentGemWalletsTable.userId, uid),
          eq(studentGemWalletsTable.subjectId, slug),
        )),
      db
        .select({ name: v4SpecialtiesTable.name, icon: v4SpecialtiesTable.icon })
        .from(v4SpecialtiesTable)
        .where(eq(v4SpecialtiesTable.slug, slug)),
    ]);
    const specialtyName: string = (sp as any)?.name ?? slug;
    const specialtyIcon: string | null = (sp as any)?.icon ?? null;
    if (!w) {
      res.json({ exists: false, gemsBalance: 0, expiresAt: null, specialtyName, specialtyIcon });
      return;
    }
    res.json({
      exists: true,
      gemsBalance: Number((w as any).gemsBalance ?? 0),
      expiresAt: (w as any).expiresAt ?? null,
      specialtyName,
      specialtyIcon,
    });
  } catch (e) {
    logger.error?.(`[v4/path/wallet] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/wallets/summary ────────────────────────────────────────────────
// Cross-subject wallet snapshot for the app shell (the global gem badge shown
// on pages that are NOT inside a specific subject — dashboard, learn, usage…).
// This is the v4 replacement for the legacy /api/subscriptions/gems-balance*
// endpoints: pure per-subject wallet balances, NO daily cap, NO first-lesson
// free counter, NO derived gems. Returns the per-wallet rows plus a few
// pre-computed aggregates so the FE never has to know wallet internals.
router.get("/v4/wallets/summary", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  try {
    const rows = await db
      .select()
      .from(studentGemWalletsTable)
      .where(eq(studentGemWalletsTable.userId, uid));

    const now = Date.now();
    const wallets = rows.map((w: any) => {
      const gemsBalance = Number(w.gemsBalance ?? 0);
      const expiresAt: string | null = w.expiresAt ?? null;
      return { subjectId: String(w.subjectId), gemsBalance, expiresAt };
    });

    const totalBalance = wallets.reduce((s, w) => s + Math.max(0, w.gemsBalance), 0);
    // "Active" = still holds gems. Expiry is informational here; the canonical
    // expiry/grace enforcement lives in the charge path, not this read.
    const active = wallets.filter((w) => w.gemsBalance > 0);
    const activeSubjectCount = active.length;

    // Nearest upcoming expiry among wallets that still hold gems.
    let nearestExpiresAt: string | null = null;
    let nearestMs = Infinity;
    for (const w of active) {
      if (!w.expiresAt) continue;
      const t = new Date(w.expiresAt).getTime();
      if (Number.isFinite(t) && t < nearestMs) { nearestMs = t; nearestExpiresAt = w.expiresAt; }
    }
    const nearestExpiresInDays = nearestExpiresAt != null
      ? Math.max(0, Math.ceil((nearestMs - now) / 86_400_000))
      : null;

    // Single-subject convenience label so the badge can name the one wallet.
    const worstSubject = active.length === 1 ? active[0] : null;

    // Enrich every active wallet with specialty name/icon so the FE badge can
    // show a per-subject breakdown without a second request.
    // Batch-fetch all specialty metadata in one query keyed by slug.
    const walletSlugs = active.map(w => w.subjectId).filter(Boolean);
    const slugMap = new Map<string, { name: string | null; icon: string | null }>();
    if (walletSlugs.length > 0) {
      const specs = await db
        .select({ slug: v4SpecialtiesTable.slug, name: v4SpecialtiesTable.name, icon: v4SpecialtiesTable.icon })
        .from(v4SpecialtiesTable)
        .where(inArray(v4SpecialtiesTable.slug, walletSlugs));
      for (const sp of specs) {
        slugMap.set(sp.slug, { name: sp.name, icon: sp.icon });
      }
    }
    const enrichedActive: { subjectId: string; gemsBalance: number; expiresAt: string | null; specialtyName: string | null; specialtyIcon: string | null }[] = [];
    for (const w of active) {
      const meta = slugMap.get(w.subjectId);
      enrichedActive.push({
        ...w,
        specialtyName: meta?.name ?? null,
        specialtyIcon: meta?.icon ?? null,
      });
    }

    const singleSpecialtyName = enrichedActive.length === 1 ? enrichedActive[0].specialtyName : null;
    const singleSpecialtyIcon = enrichedActive.length === 1 ? enrichedActive[0].specialtyIcon : null;

    res.json({
      hasAnyWallet: wallets.length > 0,
      totalBalance,
      activeSubjectCount,
      nearestExpiresAt,
      nearestExpiresInDays,
      worstSubject,
      wallets,
      activeWallets: enrichedActive,
      singleSpecialtyName,
      singleSpecialtyIcon,
    });
  } catch (e) {
    logger.error?.(`[v4/wallets/summary] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/diagnostic/start ───────────────────────────────────
// Returns the first question. Reuses an in_progress row if one exists so
// a page refresh doesn't duplicate sessions.
router.post("/v4/path/:slug/diagnostic/start", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    // Reuse latest in_progress row (if any) so refresh is idempotent.
    const [existing] = await db
      .select()
      .from(v4DiagnosticSessionsTable)
      .where(and(
        eq(v4DiagnosticSessionsTable.userId, uid),
        eq(v4DiagnosticSessionsTable.subjectId, slug),
        eq(v4DiagnosticSessionsTable.status, "in_progress"),
      ))
      .orderBy(desc(v4DiagnosticSessionsTable.id))
      .limit(1);

    let session = existing;
    if (!session) {
      const [created] = await db
        .insert(v4DiagnosticSessionsTable)
        .values({ userId: uid, subjectId: slug, status: "in_progress", answers: [] })
        .returning();
      session = created;
    }

    const answers = Array.isArray(session.answers) ? (session.answers as any[]) : [];
    const nextIndex = Math.min(answers.length, V4_DIAGNOSTIC_QUESTIONS.length - 1);
    res.json({
      sessionId: session.id,
      totalQuestions: V4_DIAGNOSTIC_QUESTIONS.length,
      currentIndex: nextIndex,
      currentQuestion: V4_DIAGNOSTIC_QUESTIONS[nextIndex],
      done: answers.length >= V4_DIAGNOSTIC_QUESTIONS.length,
    });
  } catch (e) {
    logger.error?.(`[v4/diag/start] user=${uid} slug=${slug}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/diagnostic/answer ──────────────────────────────────
// Body: { sessionId, answer }. Appends to answers array, returns next prompt
// or done=true when all 5 are collected.
router.post("/v4/path/:slug/diagnostic/answer", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const sessionId = Number((req.body as any)?.sessionId);
  const answerRaw = String((req.body as any)?.answer ?? "").trim();
  if (!Number.isInteger(sessionId)) { res.status(400).json({ error: "sessionId required" }); return; }
  if (!answerRaw) { res.status(400).json({ error: "answer required" }); return; }
  try {
    const [session] = await db
      .select()
      .from(v4DiagnosticSessionsTable)
      .where(and(
        eq(v4DiagnosticSessionsTable.id, sessionId),
        eq(v4DiagnosticSessionsTable.userId, uid),
        eq(v4DiagnosticSessionsTable.subjectId, slug),
      ));
    if (!session) { res.status(404).json({ error: "session_not_found" }); return; }
    if (session.status !== "in_progress") { res.status(409).json({ error: "session_closed" }); return; }

    const answers = Array.isArray(session.answers) ? (session.answers as any[]) : [];
    const idx = answers.length;
    if (idx >= V4_DIAGNOSTIC_QUESTIONS.length) {
      res.json({ done: true });
      return;
    }
    answers.push({ question: V4_DIAGNOSTIC_QUESTIONS[idx], answer: answerRaw.slice(0, 2000) });
    await db
      .update(v4DiagnosticSessionsTable)
      .set({ answers })
      .where(eq(v4DiagnosticSessionsTable.id, sessionId));

    const nextIdx = answers.length;
    if (nextIdx >= V4_DIAGNOSTIC_QUESTIONS.length) {
      res.json({ done: true, totalQuestions: V4_DIAGNOSTIC_QUESTIONS.length });
      return;
    }
    res.json({
      done: false,
      currentIndex: nextIdx,
      currentQuestion: V4_DIAGNOSTIC_QUESTIONS[nextIdx],
      totalQuestions: V4_DIAGNOSTIC_QUESTIONS.length,
    });
  } catch (e) {
    logger.error?.(`[v4/diag/answer] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/diagnostic/finish ──────────────────────────────────
// Marks the session as completed. Idempotent.
router.post("/v4/path/:slug/diagnostic/finish", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const sessionId = Number((req.body as any)?.sessionId);
  if (!Number.isInteger(sessionId)) { res.status(400).json({ error: "sessionId required" }); return; }
  try {
    await db
      .update(v4DiagnosticSessionsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(
        eq(v4DiagnosticSessionsTable.id, sessionId),
        eq(v4DiagnosticSessionsTable.userId, uid),
        eq(v4DiagnosticSessionsTable.subjectId, slug),
      ));

    // task #6: fire-and-forget personal-dictionary capture from the
    // 5-answer diagnostic transcript. Runs after the response is sent
    // so the student sees instant completion. Re-reads the row to pick
    // up the just-committed status; failures are swallowed by the
    // capture helper itself.
    const [row] = await db
      .select()
      .from(v4DiagnosticSessionsTable)
      .where(and(
        eq(v4DiagnosticSessionsTable.id, sessionId),
        eq(v4DiagnosticSessionsTable.userId, uid),
      ));
    const answers = row && Array.isArray(row.answers)
      ? (row.answers as any[]).map((a) => ({
          question: String(a?.question ?? ""),
          answer: String(a?.answer ?? ""),
        }))
      : [];
    res.json({ ok: true });
    if (answers.length) {
      void capturePersonalDictionaryFromDiagnostic({
        userId: uid,
        subjectId: slug,
        diagnosticAnswers: answers,
      }).catch(() => {});
    }
    return;
  } catch (e) {
    logger.error?.(`[v4/diag/finish] ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── placement-session helpers ──────────────────────────────────────────────
// The placement run is SERVER-AUTHORITATIVE. The client never decides which
// question it answered (the questionId lives in session.pending) nor what
// level it lands on (finalize recomputes from the server-graded probes).
async function getInProgressPlacementSession(
  uid: number,
  slug: string,
): Promise<V4PlacementSession | null> {
  const [row] = await db
    .select()
    .from(v4PlacementSessionsTable)
    .where(and(
      eq(v4PlacementSessionsTable.userId, uid),
      eq(v4PlacementSessionsTable.subjectId, slug),
      eq(v4PlacementSessionsTable.status, "in_progress"),
    ))
    .orderBy(desc(v4PlacementSessionsTable.id))
    .limit(1);
  return row ?? null;
}

async function getPlacementSessionById(id: number): Promise<V4PlacementSession | null> {
  const [row] = await db
    .select()
    .from(v4PlacementSessionsTable)
    .where(eq(v4PlacementSessionsTable.id, id));
  return row ?? null;
}

async function getLatestCompletedPlacementSession(
  uid: number,
  slug: string,
  versionId: number,
): Promise<V4PlacementSession | null> {
  const [row] = await db
    .select()
    .from(v4PlacementSessionsTable)
    .where(and(
      eq(v4PlacementSessionsTable.userId, uid),
      eq(v4PlacementSessionsTable.subjectId, slug),
      eq(v4PlacementSessionsTable.versionId, versionId),
      eq(v4PlacementSessionsTable.status, "completed"),
    ))
    .orderBy(desc(v4PlacementSessionsTable.id))
    .limit(1);
  return row ?? null;
}

function placementProgress(
  probes: PlacementProbe[],
  phase: "level" | "stage" | "unit" | "done",
  confidencePct?: number | null,
) {
  return {
    phase,
    answered: probes.length,
    softCap: PLACEMENT_SOFT_CAP,
    confidencePct: confidencePct ?? null,
    levelProbes: probes.filter((p) => p.scope === "level").length,
    stageProbes: probes.filter((p) => p.scope === "stage").length,
    unitProbes: probes.filter((p) => p.scope === "unit").length,
  };
}

function serializePath(row: any) {
  return {
    pathType: row.pathType,
    startMode: row.startMode,
    startingLevelIndex: row.startingLevelIndex,
    placementUnitCode: row.placementUnitCode ?? null,
    currentLessonCode: row.currentLessonCode,
    unlockedLessonCodes: row.unlockedLessonCodes,
  };
}

// ── POST /v4/path/:slug/placement/generate ──────────────────────────────────
// Generates 20 AI-authored placement questions from the instruction file content
// via Claude Haiku. The result is stored in the placement session and re-used
// across all probes in the adaptive descent.
// Body: {} (no parameters needed — the active instruction version is inferred)
// Returns: { questionCount: number }
// Fixed USD cost basis for one placement-test generation batch (~3 MCQs per
// sampled unit via Gemini Flash Lite). Charged once per (student, version) —
// a retry after a failed/abandoned generation reuses the same requestId so it
// never double-charges. Overridable via env for ops tuning.
const PLACEMENT_GEN_USD = (() => {
  const raw = parseFloat(process.env.V4_PLACEMENT_GEN_USD ?? "");
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.02;
})();
const PLACEMENT_GEN_MODEL = "gemini-2.5-flash-lite";

router.post("/v4/path/:slug/placement/generate", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    // Check for existing placement questions in the instruction file —
    // if the admin already wrote 13+ questions, they take priority over AI.
    // Admin-authored bank: count total questions AND how many DISTINCT units
    // they cover. A dense count clustered in a few units would blind the binary
    // search, so BOTH gates must pass before we short-circuit AI generation.
    const [adminStats] = await db
      .select({
        count: sql<number>`count(*)`,
        units: sql<number>`count(distinct ${v4PlacementTestQuestionsTable.targetUnitCode})`,
      })
      .from(v4PlacementTestQuestionsTable)
      .where(eq(v4PlacementTestQuestionsTable.versionId, resolved.versionId));
    const existingCount = Number(adminStats?.count ?? 0);
    const existingUnits = Number(adminStats?.units ?? 0);

    // Only short-circuit to the admin bank when it's actually DENSE enough to
    // drive the binary search: ≥ 60% of units (min 13) total AND spread over
    // ≥ min(PLACEMENT_MIN_UNITS, unitCount) distinct units. A sparse hand-authored
    // bank (e.g. skill-python's 18 across 189 units) falls through to AI gen.
    const adminThreshold = Math.max(13, Math.ceil(resolved.units.length * 0.6));
    const adminUnitFloor = Math.min(PLACEMENT_MIN_UNITS, resolved.units.length);
    if (existingCount >= adminThreshold && existingUnits >= adminUnitFloor) {
      // Admin-authored questions exist and are dense — use them; no AI needed.
      res.json({ questionCount: existingCount, source: "admin" as const });
      return;
    }

    // Generate questions via Gemini Flash Lite — a PAID call: pre-gate the
    // wallet, charge (idempotent on (user, version)), refund on failure. A
    // zero-balance / no-wallet student is blocked here with 402.
    let questions: AnyPlacementQuestion[];
    try {
      const paid = await runV4PaidWork({
        requestId: `v4placementgen_${uid}_${slug}_${resolved.versionId}`,
        userId: uid,
        subjectId: slug,
        costUsd: PLACEMENT_GEN_USD,
        source: "v4_ai_placement",
        model: PLACEMENT_GEN_MODEL,
        note: "توليد أسئلة اختبار تحديد المستوى",
        run: () => generatePlacementQuestions({ versionId: resolved.versionId }),
      });
      if (!paid.ok) {
        res.status(402).json({ error: "insufficient_gems", reason: paid.reason, balance: paid.balance });
        return;
      }
      questions = paid.result;
    } catch (genErr: any) {
      logger.warn({ err: genErr?.message, slug }, "[v4_path] placement question generation failed");
      // Generation threw → runV4PaidWork already refunded the debit. Fall back
      // to whatever admin questions exist (even if < 13).
      res.json({ questionCount: existingCount, source: "admin" as const, fallback: true });
      return;
    }

    // Find or create a placement session (or reuse an in-progress one)
    let session = await getInProgressPlacementSession(uid, slug);
    if (session) {
      await db
        .update(v4PlacementSessionsTable)
        .set({ generatedQuestions: questions, probes: [], pending: null, result: null })
        .where(eq(v4PlacementSessionsTable.id, session.id));
    } else {
      const [created] = await db
        .insert(v4PlacementSessionsTable)
        .values({
          userId: uid,
          subjectId: slug,
          versionId: resolved.versionId,
          status: "in_progress",
          probes: [],
          generatedQuestions: questions,
        })
        .returning();
      session = created;
    }

    res.json({ questionCount: questions.length, source: "ai" as const });
  } catch (err: any) {
    logger.error({ err: err?.message, slug }, "[v4_path] placement/generate failed");
    res.status(500).json({ error: "generation_failed" });
  }
});

// ── POST /v4/path/:slug/placement/next ─────────────────────────────────────
// Server-authoritative adaptive-descent placement.
// Body: { rawAnswer?: string | number, restart?: boolean }
//   - First call (no rawAnswer): opens/resumes a session, returns the first
//     question (or resumes the pending one).
//   - Subsequent calls (rawAnswer present): the server grades the question it
//     is holding in `session.pending` (the client cannot lie about which
//     question it answered), appends a probe, then advances the descent.
// Returns { kind:'ask', sessionId, question, scope, scopeCode, phaseLabel,
//           progress } or { kind:'finalize', sessionId, result }.
router.post("/v4/path/:slug/placement/next", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    const questions = await db
      .select()
      .from(v4PlacementTestQuestionsTable)
      .where(eq(v4PlacementTestQuestionsTable.versionId, resolved.versionId));

    const body: any = req.body ?? {};
    const hasAnswer = body.rawAnswer !== undefined && body.rawAnswer !== null;
    const wantRestart = body.restart === true;

    // Server-authoritative session lookup (client cannot pick the session).
    let session = await getInProgressPlacementSession(uid, slug);

    // Start / restart: open a fresh session if none in progress, or if the
    // client explicitly asked to retake. Pin it to the active version so a
    // mid-run re-publish can't corrupt the probe scope codes.
    if (!session || wantRestart || session.versionId !== resolved.versionId) {
      if (session) {
        await db
          .update(v4PlacementSessionsTable)
          .set({ status: "abandoned", completedAt: new Date() })
          .where(eq(v4PlacementSessionsTable.id, session.id));
      }
      const [created] = await db
        .insert(v4PlacementSessionsTable)
        .values({
          userId: uid,
          subjectId: slug,
          versionId: resolved.versionId,
          status: "in_progress",
          probes: [],
          pending: null,
        })
        .returning();
      session = created;
    }

    // Use AI-generated questions if the session has them (take priority over
    // static pre-written questions from the instruction file).
    const genQuestions = Array.isArray(session.generatedQuestions)
      ? (session.generatedQuestions as AnyPlacementQuestion[])
      : null;
    const questionPool: AnyPlacementQuestion[] =
      genQuestions && genQuestions.length >= PLACEMENT_MIN_POOL ? genQuestions : questions;

    // Grade an in-flight answer. The questionId comes from session.pending,
    // NOT the client. Grade OUTSIDE the tx (the Haiku call can be slow), then
    // append the probe atomically with a FOR UPDATE re-read so a concurrent
    // double-submit can't record the same question twice.
    if (hasAnswer && session.pending) {
      const pending = session.pending as PlacementPending;
      let q: AnyPlacementQuestion | null = null;
      // Look up from generated pool first, then fall back to DB
      if (genQuestions && genQuestions.length >= PLACEMENT_MIN_POOL) {
        q = genQuestions.find(gq => gq.id === pending.questionId) ?? null;
      }
      if (!q) {
        const [dbQ] = await db
          .select()
          .from(v4PlacementTestQuestionsTable)
          .where(and(
            eq(v4PlacementTestQuestionsTable.id, pending.questionId),
            eq(v4PlacementTestQuestionsTable.versionId, resolved.versionId),
          ));
        q = dbQ ?? null;
      }
      if (q) {
        const graded = await gradePlacementAnswer({ question: q, rawAnswer: body.rawAnswer });
        await db.transaction(async (tx) => {
          const [fresh] = await tx
            .select()
            .from(v4PlacementSessionsTable)
            .where(eq(v4PlacementSessionsTable.id, session!.id))
            .for("update");
          if (!fresh || fresh.status !== "in_progress") return;
          const curPending = fresh.pending as PlacementPending | null;
          if (!curPending || curPending.questionId !== pending.questionId) return; // already consumed
          const probes = Array.isArray(fresh.probes) ? (fresh.probes as PlacementProbe[]) : [];
          probes.push({
            questionId: pending.questionId,
            scope: pending.scope,
            scopeCode: pending.scopeCode,
            targetLevelIndex: pending.targetLevelIndex,
            correct: graded.correct,
          });
          await tx
            .update(v4PlacementSessionsTable)
            .set({ probes, pending: null })
            .where(eq(v4PlacementSessionsTable.id, session!.id));
        });
        session = (await getPlacementSessionById(session.id)) ?? session;
      }
    }

    const probes = Array.isArray(session!.probes) ? (session!.probes as PlacementProbe[]) : [];
    const step = nextPlacementStep(resolved, questionPool, probes);

    if (step.kind === "ask") {
      const pending: PlacementPending = {
        questionId: step.question.id,
        scope: step.scope,
        scopeCode: step.scopeCode,
        targetLevelIndex: step.targetLevelIndex,
      };
      await db
        .update(v4PlacementSessionsTable)
        .set({ pending })
        .where(eq(v4PlacementSessionsTable.id, session!.id));
      res.json({
        kind: "ask",
        sessionId: session!.id,
        scope: step.scope,
        scopeCode: step.scopeCode,
        phaseLabel: step.phaseLabel,
        progress: placementProgress(probes, step.scope, step.confidencePct),
        question: {
          id: step.question.id,
          targetLevelIndex: step.question.targetLevelIndex,
          kind: step.question.kind,
          prompt: step.question.prompt,
          choices: step.question.choices ?? null,
          difficulty: step.question.difficulty,
        },
      });
      return;
    }

    // done — persist the recomputed result and complete the session.
    await db
      .update(v4PlacementSessionsTable)
      .set({ pending: null, result: step.result, status: "completed", completedAt: new Date() })
      .where(eq(v4PlacementSessionsTable.id, session!.id));
    res.json({
      kind: "finalize",
      sessionId: session!.id,
      progress: placementProgress(probes, "done"),
      result: step.result,
    });
  } catch (e) {
    logger.error?.(`[v4/placement/next] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/placement/finalize ─────────────────────────────────
// Body: { startMode: 'from_zero' | 'placement' }
// Creates/replaces the student_paths row and triggers the welcome-gift wallet
// bootstrap. For placement mode the starting level + unit boundary are read
// from the SERVER-graded session result — the client cannot inject a level.
router.post("/v4/path/:slug/placement/finalize", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const body: any = req.body ?? {};
  const startMode: "from_zero" | "placement" = body.startMode === "placement" ? "placement" : "from_zero";
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    if (startMode === "from_zero") {
      const row = await createOrReplaceStudentPath({
        userId: uid,
        subjectSlug: slug,
        resolved,
        pathType: "custom",
        startMode: "from_zero",
        startingLevelIndex: 1,
      });
      res.json({ ok: true, path: serializePath(row), placement: null });
      return;
    }

    // placement: read the SERVER-graded result; any client-supplied level is
    // ignored. Requires a completed placement session for the active version.
    const session = await getLatestCompletedPlacementSession(uid, slug, resolved.versionId);
    if (!session || !session.result) {
      res.status(409).json({ error: "no_completed_placement" });
      return;
    }
    const result = session.result as PlacementResult;
    const boundaryUnitCode = result.precision === "unit" ? (result.unitCode ?? null) : null;
    const probes = Array.isArray(session.probes) ? (session.probes as PlacementProbe[]) : [];

    // Fetch names for every unit touched during the descent (+ the placed unit)
    // so the persisted strengths/weaknesses profile is human-readable for the
    // AI teacher and the admin dashboard.
    const probedUnitCodes = Array.from(new Set([
      ...probes.filter((p) => p.scope === "unit").map((p) => p.scopeCode),
      ...(result.unitCode ? [result.unitCode] : []),
    ]));
    const unitNameByCode = new Map<string, string>();
    if (probedUnitCodes.length > 0) {
      const rows = await db
        .select({ code: v4UnitsTable.code, name: v4UnitsTable.name })
        .from(v4UnitsTable)
        .where(and(
          eq(v4UnitsTable.versionId, resolved.versionId),
          inArray(v4UnitsTable.code, probedUnitCodes),
        ));
      for (const r of rows) unitNameByCode.set(r.code, r.name);
    }
    const unitName: string | null = result.unitCode ? (unitNameByCode.get(result.unitCode) ?? null) : null;

    // Distil the graded probes into a durable strengths/weaknesses snapshot.
    const placementProfile = buildPlacementProfile(resolved, probes, result, unitNameByCode);

    const row = await createOrReplaceStudentPath({
      userId: uid,
      subjectSlug: slug,
      resolved,
      pathType: "custom",
      startMode: "placement",
      startingLevelIndex: result.startingLevelIndex,
      boundaryUnitCode,
      placementProfile,
    });
    res.json({
      ok: true,
      path: serializePath(row),
      placement: {
        precision: result.precision,
        levelIndex: result.levelIndex,
        stageCode: result.stageCode,
        unitCode: result.unitCode,
        unitName,
        currentLessonCode: result.currentLessonCode,
        reason: result.reason,
      },
    });
  } catch (e) {
    logger.error?.(`[v4/placement/finalize] user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/lesson-stars ──────────────────────────────────────
// Persists the star count the student earned on a lesson so it survives
// page refreshes (stored in v4_student_paths.lesson_stars JSONB).
// Body: { code: string, stars: 0|1|2|3 }
router.post("/v4/path/:slug/lesson-stars", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const { code, stars } = req.body ?? {};
  if (!code || typeof stars !== "number" || ![0, 1, 2, 3].includes(stars)) {
    res.status(400).json({ error: "code and stars (0-3) required" });
    return;
  }
  try {
    const { v4StudentPathsTable } = await import("@workspace/db");
    const { eq: eqD, and: andD } = await import("drizzle-orm");
    const rows = await db
      .select({ id: v4StudentPathsTable.id, lessonStars: v4StudentPathsTable.lessonStars })
      .from(v4StudentPathsTable)
      .where(andD(eqD(v4StudentPathsTable.userId, uid), eqD(v4StudentPathsTable.subjectId, slug)));
    if (!rows[0]) { res.status(404).json({ error: "no_path" }); return; }
    const current = ((rows[0].lessonStars as any) ?? {}) as Record<string, number>;
    const updated = { ...current, [code]: stars };
    await db
      .update(v4StudentPathsTable)
      .set({ lessonStars: updated, updatedAt: new Date() })
      .where(eqD(v4StudentPathsTable.id, rows[0].id));
    res.json({ ok: true });
  } catch (e) {
    logger.error?.(`[v4/lesson-stars] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/booklet ────────────────────────────────────────────
// task #8 SHIPPED — the actual upload pipeline now lives under
// /v4/booklet/upload (multipart). This endpoint is kept as a stub so any
// older client that still POSTs here gets a clear redirect signal.
router.post("/v4/path/:slug/booklet", requireUser, requireSameOriginCsrf, async (_req, res) => {
  res.status(410).json({
    error: "moved",
    message: "Use POST /api/v4/booklet/upload (multipart: file, slug, title).",
  });
});

// ── GET /v4/path/:slug/map  (v4 task #4) ──────────────────────────────────
// Returns the full node tree for the student's visual map.
// No CSRF required — read-only GET.
//
// Response shape:
// { specialty, studentPath, map: { currentLevelIndex, levelName, totalLevels,
//   progressPct, completedNodes, totalNodes, stages[], levelTest }, nextLevels[] }
//
// Node status logic (task #5 will extend this with actual mastery records):
//   lesson "active"    → code === currentLessonCode
//   lesson "completed" → code in unlockedLessonCodes AND lessonIndex <
//                        currentLessonCode's lessonIndex (within same unit),
//                        or the whole unit is before the current unit
//   lesson "available" → code in unlockedLessonCodes (not active/completed)
//   lesson "locked"    → not in unlockedLessonCodes
//   lab / tests        → "locked" (task #7 builds real unlock logic)
router.get("/v4/path/:slug/map", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  try {
    // ── 1. Resolve specialty + student path ──────────────────────────────
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }

    // Lazy-migrate to the currently-active instruction version so the map
    // always reflects the latest admin publish, not whatever version the
    // student enrolled on.
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);
    const versionId = studentPath.versionId;
    const unlockedSet = new Set<string>(
      Array.isArray(studentPath.unlockedLessonCodes)
        ? (studentPath.unlockedLessonCodes as string[])
        : [],
    );
    const currentCode = studentPath.currentLessonCode ?? null;

    // The student's REAL current level = first segment of currentLessonCode,
    // fallback to startingLevelIndex. This drives the "you are here" marker and
    // the per-level switcher statuses (it never changes when browsing).
    const realCurrentLevelIndex = currentCode
      ? parseInt(String(currentCode).split(".")[0] || "1", 10)
      : studentPath.startingLevelIndex;

    // ── 2. Fetch all level rows for this version ─────────────────────────
    const { asc, eq: eqDrizzle, and: andDrizzle, inArray } = await import("drizzle-orm");
    const {
      v4LevelsTable,
      v4StagesTable,
      v4UnitsTable,
      v4LessonsTable,
      v4LabScenariosTable,
      v4ExamQuestionsTable,
    } = await import("@workspace/db");

    const allLevels = await db
      .select()
      .from(v4LevelsTable)
      .where(eqDrizzle(v4LevelsTable.versionId, versionId))
      .orderBy(asc(v4LevelsTable.levelIndex));

    // Optional ?level=N lets the student browse ANY level's map — review a
    // finished level or preview an upcoming one — without changing progress.
    // Node statuses stay a pure projection of unlocks/completions/attempts, so
    // a future level renders fully locked (preview only) and a past level
    // renders its completed/reviewable nodes. Defaults to the real current level.
    const requestedLevel = parseInt(String((req.query as any)?.level ?? ""), 10);
    const viewedLevelIndex =
      Number.isFinite(requestedLevel) && allLevels.some((l: any) => l.levelIndex === requestedLevel)
        ? requestedLevel
        : realCurrentLevelIndex;

    // `currentLevel` below means "the level being shown" (= viewed level).
    const currentLevel =
      allLevels.find((l: any) => l.levelIndex === viewedLevelIndex) ??
      allLevels.find((l: any) => l.levelIndex === realCurrentLevelIndex) ??
      allLevels[0];
    if (!currentLevel) { res.status(404).json({ error: "level_not_found" }); return; }

    // ── 3. Fetch stages → units → lessons → labs for the viewed level ────
    const stages = await db
      .select()
      .from(v4StagesTable)
      .where(andDrizzle(
        eqDrizzle(v4StagesTable.versionId, versionId),
        eqDrizzle(v4StagesTable.levelId, currentLevel.id),
      ))
      .orderBy(asc(v4StagesTable.stageIndex));

    // Pull task #7 progress (labs passed + exam attempts) so the map can
    // colour lab/exam icons correctly. Both are cheap reads (one row per
    // lab attempted; one row per exam attempt).
    const { loadLabCompletionsMap, loadExamPassMap, applyUnlockedSnapshot, EXAM_PASS_THRESHOLD, LAB_PASS_THRESHOLD } =
      await import("../lib/v4-lab-exam-engine");
    const { loadProgressionGraph, computeProgression } = await import("../lib/v4-progression-engine");
    const [labCompletions, examPassMap, progressionGraph] = await Promise.all([
      loadLabCompletionsMap(uid),
      loadExamPassMap(uid, versionId),
      loadProgressionGraph(versionId),
    ]);

    // ── Test-out reachability projection (single source of truth) ──────────
    // examReachable = from PASSED exams only (+ missing-bank auto-clear);
    // lessonAccessible = examReachable ∪ legacy unlocks. Reconcile the persisted
    // unlock set so the value the server-side gates read (anti-bypass) always
    // matches what the map renders. Additive only — never shrink.
    const progression = computeProgression(
      progressionGraph,
      examPassMap as any,
      Array.from(unlockedSet),
    );
    if (versionId > 0 && progression.accessibleLessonCodes.length > unlockedSet.size) {
      for (const c of progression.accessibleLessonCodes) unlockedSet.add(c);
      try {
        await applyUnlockedSnapshot({ userId: uid, subjectId: slug, unlocked: Array.from(unlockedSet) });
      } catch (e) {
        logger.warn?.(`[v4/map reconcile] u=${uid} ${slug}: ${String((e as any)?.message ?? e)}`);
      }
    }

    const stageIds = stages.map((s: any) => s.id);
    const units = stageIds.length
      ? await db
          .select()
          .from(v4UnitsTable)
          .where(andDrizzle(
            eqDrizzle(v4UnitsTable.versionId, versionId),
            inArray(v4UnitsTable.stageId, stageIds),
          ))
          .orderBy(asc(v4UnitsTable.unitIndex))
      : [];

    const unitIds = units.map((u: any) => u.id);
    const [lessons, labs, examRows] = unitIds.length
      ? await Promise.all([
          db.select().from(v4LessonsTable)
            .where(andDrizzle(eqDrizzle(v4LessonsTable.versionId, versionId), inArray(v4LessonsTable.unitId, unitIds)))
            .orderBy(asc(v4LessonsTable.lessonIndex)),
          db.select().from(v4LabScenariosTable)
            .where(andDrizzle(eqDrizzle(v4LabScenariosTable.versionId, versionId), inArray(v4LabScenariosTable.unitId, unitIds)))
            .orderBy(asc(v4LabScenariosTable.labIndex)),
          db.select({ scope: v4ExamQuestionsTable.scope, unitId: v4ExamQuestionsTable.unitId, stageId: v4ExamQuestionsTable.stageId, levelId: v4ExamQuestionsTable.levelId })
            .from(v4ExamQuestionsTable)
            .where(eqDrizzle(v4ExamQuestionsTable.versionId, versionId)),
        ])
      : [[], [], []];

    // Index by unitId / stageId for fast lookup.
    const lessonsByUnit = new Map<number, any[]>();
    for (const l of lessons as any[]) {
      if (!lessonsByUnit.has(l.unitId)) lessonsByUnit.set(l.unitId, []);
      lessonsByUnit.get(l.unitId)!.push(l);
    }
    const labsByUnit = new Map<number, any[]>();
    for (const lab of labs as any[]) {
      if (!labsByUnit.has(lab.unitId)) labsByUnit.set(lab.unitId, []);
      labsByUnit.get(lab.unitId)!.push(lab);
    }
    // Unit exams still come from authored banks (unchanged). Stage/level exams
    // are now ADAPTIVE GENERATED gates derived from the progression graph's
    // examable sets (any scope holding ≥1 unit with ≥1 lesson), not authored
    // banks — so every specialty gets them, mirroring the unit test-out.
    const unitExamSet = new Set<number>((examRows as any[]).filter((e: any) => e.scope === "unit" && e.unitId).map((e: any) => e.unitId as number));

    // ── 4. Helper: determine lesson status ───────────────────────────────
    // Lesson codes follow the canonical dotted form L.S.U.Lesson (e.g.
    // "1.2.3.10"). A plain string compare misorders "1.2.3.10" < "1.2.3.2"
    // (lexicographic), which would corrupt completed/active boundaries and
    // poison every downstream gate. Compare segment-by-segment as ints.
    function parseCode(c: string): number[] {
      return c.split(".").map(s => parseInt(s, 10)).map(n => Number.isFinite(n) ? n : 0);
    }
    function compareCodes(a: string, b: string): number {
      const pa = parseCode(a); const pb = parseCode(b);
      const n = Math.max(pa.length, pb.length);
      for (let i = 0; i < n; i++) {
        const x = pa[i] ?? 0, y = pb[i] ?? 0;
        if (x !== y) return x - y;
      }
      return 0;
    }
    function lessonStatus(code: string): "completed" | "active" | "available" | "locked" {
      // Check unlocked set first so a lesson that IS currentCode but
      // also numerically before it (impossible in normal flow, but guards
      // the edge case where currentCode was not advanced after completion)
      // still returns "completed" rather than "active".
      if (unlockedSet.has(code)) {
        if (currentCode && compareCodes(code, currentCode) < 0) return "completed";
        if (code === currentCode) return "active";
        return "available";
      }
      // A lesson that IS currentCode but not yet in unlockedSet is still
      // "active" (e.g. first lesson before any unlock event fires).
      if (code === currentCode) return "active";
      return "locked";
    }

    // ── 5. Build stage tree ───────────────────────────────────────────────
    // Status helpers for task #7:
    //   - Lab "available" once every lesson in its unit is unlocked
    //     (i.e. the student has reached the unit). "completed" if the
    //     student has a passing v4_lab_completions row.
    //   - Unit exam "available" once every lesson in the unit is COMPLETED
    //     (not just unlocked). Non-blocking — does NOT unlock anything.
    //   - Stage exam "available" once every unit in the stage has all its
    //     lessons completed AND all its labs passed. Blocking — passing it
    //     unlocks the next stage's lessons.
    //   - Level exam mirrors stage logic but across every stage in the level.
    //
    // We don't recompute "completed" from a passing exam attempt directly —
    // a passing attempt already wrote into v4_student_paths.unlockedLessonCodes
    // via the submit endpoint, which trickles into lessonStatus(). That keeps
    // the map a pure projection of student_paths + completions + attempts.
    // Stars persisted per-lesson. Falls back to empty object on older rows
    // that pre-date the lesson_stars column.
    const lessonStarsMap = ((studentPath as any).lessonStars ?? {}) as Record<string, number>;

    let totalNodes = 0;
    let completedNodes = 0;

    function examStatus(scope: "unit" | "stage" | "level", refId: number, available: boolean):
      "completed" | "available" | "locked" {
      const att = examPassMap.get(`${scope}:${refId}`);
      if (att?.passed) return "completed";
      return available ? "available" : "locked";
    }

    // Test-out model: a node's exam availability is a pure projection of the
    // shared progression engine (PASSED-exams reachability), NOT lesson/lab
    // completion. Lessons + labs are skippable; exams are the only gates.
    const stageTrees = stages.map((stage: any) => {
      const stageUnits = units.filter((u: any) => u.stageId === stage.id);

      const unitTrees = stageUnits.map((unit: any) => {
        const lessonsInUnit = lessonsByUnit.get(unit.id) ?? [];
        // A reachable unit is lesson-accessible even before any lesson code is
        // persisted into the unlock set (drives lab availability below).
        let unitAnyLessonUnlocked = progression.lessonAccessibleUnitIds.has(unit.id);
        const unitLessons = lessonsInUnit.map((l: any) => {
          const status = lessonStatus(l.code);
          totalNodes++;
          if (status === "completed") completedNodes++;
          if (status !== "locked") unitAnyLessonUnlocked = true;
          return { code: l.code, name: l.name, kind: "lesson", status, stars: ((lessonStarsMap[l.code] ?? 0) as 0 | 1 | 2 | 3) };
        });

        const labsInUnit = labsByUnit.get(unit.id) ?? [];
        const unitLabs = labsInUnit.map((lab: any) => {
          totalNodes++;
          const comp = labCompletions.get(lab.id);
          let status: "completed" | "available" | "locked" = "locked";
          if (comp?.passed) status = "completed";
          else if (unitAnyLessonUnlocked) status = "available"; // labs non-blocking
          if (status === "completed") completedNodes++;
          return { code: lab.code, title: lab.title, kind: "lab", status, score: comp?.score ?? null };
        });

        const hasUnitTest = unitExamSet.has(unit.id);
        let unitTestStatus: "completed" | "available" | "locked" = "locked";
        if (hasUnitTest) {
          totalNodes++;
          unitTestStatus = examStatus("unit", unit.id, progression.unitExamAvailable(unit.id));
          if (unitTestStatus === "completed") completedNodes++;
        }
        return {
          unitIndex: unit.unitIndex,
          code: unit.code,
          name: unit.name,
          lessons: unitLessons,
          labs: unitLabs,
          hasUnitTest,
          unitTest: hasUnitTest
            ? { code: `${unit.code}.exam`, kind: "unit_test" as const, status: unitTestStatus }
            : null,
        };
      });

      const hasStageTest = progressionGraph.stageExamable.has(stage.id);
      let stageTestStatus: "completed" | "available" | "locked" = "locked";
      if (hasStageTest) {
        totalNodes++;
        stageTestStatus = examStatus("stage", stage.id, progression.stageExamAvailable(stage.id));
        if (stageTestStatus === "completed") completedNodes++;
      }
      return {
        stageIndex: stage.stageIndex,
        code: stage.code,
        name: stage.name,
        units: unitTrees,
        hasStageTest,
        stageTest: hasStageTest
          ? { code: `${stage.code}.exam`, kind: "stage_test" as const, status: stageTestStatus }
          : null,
        // Surfaced so the FE can render the gate banner.
        gateOpen: !hasStageTest || stageTestStatus === "completed",
      };
    });

    // Level exam availability is the engine's level projection: every stage in
    // the level is cleared (units reachable + their exams passed where banks
    // exist). Unit exams are part of the chain now, but lesson/lab completion
    // is irrelevant — exams are the only gates.
    const hasLevelTest = progressionGraph.levelExamable.has(currentLevel.id);
    let levelTestStatus: "completed" | "available" | "locked" = "locked";
    if (hasLevelTest) {
      totalNodes++;
      levelTestStatus = examStatus("level", currentLevel.id, progression.levelExamAvailable(currentLevel.id));
      if (levelTestStatus === "completed") completedNodes++;
    }
    const progressPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    // ── 6. Next levels (locked boxes) — always relative to the student's
    //       REAL progress, not the level currently being browsed. ──────────
    const nextLevels = allLevels
      .filter((l: any) => l.levelIndex > realCurrentLevelIndex)
      .map((l: any) => ({ levelIndex: l.levelIndex, name: l.name, locked: true }));

    // ── 7. Level switcher summary — every level with a coarse status so the
    //       FE can render an organized "jump to level" rail. Status is purely
    //       positional relative to the student's real level; it does NOT alter
    //       what is enterable (that stays in the per-node statuses above).
    const levels = allLevels.map((l: any) => ({
      levelIndex: l.levelIndex,
      name: l.name,
      status:
        l.levelIndex < realCurrentLevelIndex ? "completed" :
        l.levelIndex === realCurrentLevelIndex ? "current" :
        "upcoming",
    }));

    res.json({
      specialty: { slug: resolved.specialty.slug, name: resolved.specialty.name, icon: resolved.specialty.icon },
      studentPath: {
        startMode: studentPath.startMode,
        startingLevelIndex: studentPath.startingLevelIndex,
        currentLessonCode: currentCode,
        pathType: studentPath.pathType,
        placementUnitCode: studentPath.placementUnitCode ?? null,
      },
      map: {
        // `currentLevelIndex` reflects the level being SHOWN (viewed) so the
        // header + node tree stay consistent. `realCurrentLevelIndex` is the
        // student's actual position (for the "you are here" marker).
        currentLevelIndex: viewedLevelIndex,
        viewedLevelIndex,
        realCurrentLevelIndex,
        totalLevels: allLevels.length,
        levels,
        levelName: currentLevel.name,
        levelGoal: currentLevel.goal,
        progressPct,
        completedNodes,
        totalNodes,
        stages: stageTrees,
        levelTest: hasLevelTest
          ? { code: `${viewedLevelIndex}.exam`, kind: "level_test" as const, status: levelTestStatus }
          : null,
      },
      nextLevels,
    });
  } catch (e) {
    logger.error?.(`[v4/map] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/path/:slug/unlock-plan/:targetCode ─────────────────────────────
// "Test-out plan" for a LOCKED lesson/lab. Given the canonical code of a node
// the student wants to jump to, return the ORDERED list of exams they must pass
// to test out up to that unit — the previous unit's exam (always), plus the
// previous stage's exam (if crossing into a new stage) and the previous level's
// exam (if crossing into a new level), all the way from the student's current
// reachable frontier to the target. The FE shows this in a confirmation dialog
// and, on consent, sends the student straight to `firstExamCode`.
//
// Read-only (requireUser only, no CSRF) — same posture as the map + exam GETs.
router.get("/v4/path/:slug/unlock-plan/:targetCode", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const targetCode = decodeURIComponent(String(req.params.targetCode || ""));
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);
    const versionId = studentPath.versionId;

    const { loadProgressionGraph, loadExamPassMapForUser, computeRequiredExamChain, unitPrefixOf } =
      await import("../lib/v4-progression-engine");
    const [graph, examPassMap] = await Promise.all([
      loadProgressionGraph(versionId),
      loadExamPassMapForUser(uid),
    ]);

    // The target node's owning unit (first 3 canonical segments). Works for
    // both lesson ("L.S.U.lesson") and lab ("L.S.U.مN") codes.
    const targetUnitCode = unitPrefixOf(targetCode);
    const targetUnit = graph.unitsSorted.find((u) => u.code === targetUnitCode);
    if (!targetUnit) { res.status(404).json({ error: "unknown_target" }); return; }

    const legacyUnlocked = Array.isArray(studentPath.unlockedLessonCodes)
      ? (studentPath.unlockedLessonCodes as string[])
      : [];
    const chain = computeRequiredExamChain(graph, examPassMap, legacyUnlocked, targetUnit.id);

    // Resolve human names + current availability for each step + the target.
    const { computeProgression } = await import("../lib/v4-progression-engine");
    const state = computeProgression(graph, examPassMap, legacyUnlocked);

    const unitIds = chain.filter((s) => s.scope === "unit").map((s) => s.refId);
    const stageIds = chain.filter((s) => s.scope === "stage").map((s) => s.refId);
    const levelIds = chain.filter((s) => s.scope === "level").map((s) => s.refId);

    const { v4StagesTable, v4LevelsTable } = await import("@workspace/db");
    const [unitRows, stageRows, levelRows, targetUnitRow] = await Promise.all([
      unitIds.length
        ? db.select({ id: v4UnitsTable.id, name: v4UnitsTable.name }).from(v4UnitsTable).where(inArray(v4UnitsTable.id, unitIds))
        : Promise.resolve([] as { id: number; name: string }[]),
      stageIds.length
        ? db.select({ id: v4StagesTable.id, name: v4StagesTable.name }).from(v4StagesTable).where(inArray(v4StagesTable.id, stageIds))
        : Promise.resolve([] as { id: number; name: string }[]),
      levelIds.length
        ? db.select({ id: v4LevelsTable.id, name: v4LevelsTable.name }).from(v4LevelsTable).where(inArray(v4LevelsTable.id, levelIds))
        : Promise.resolve([] as { id: number; name: string }[]),
      db.select({ name: v4UnitsTable.name }).from(v4UnitsTable).where(eq(v4UnitsTable.id, targetUnit.id)).limit(1),
    ]);
    const unitNameById = new Map<number, string>((unitRows as any[]).map((r) => [r.id as number, String(r.name)]));
    const stageNameById = new Map<number, string>((stageRows as any[]).map((r) => [r.id as number, String(r.name)]));
    const levelNameById = new Map<number, string>((levelRows as any[]).map((r) => [r.id as number, String(r.name)]));

    const requiredExams = chain.map((s) => {
      const name =
        s.scope === "unit" ? (unitNameById.get(s.refId) ?? null) :
        s.scope === "stage" ? (stageNameById.get(s.refId) ?? null) :
        (levelNameById.get(s.refId) ?? null);
      const available =
        s.scope === "unit" ? state.unitExamAvailable(s.refId) :
        s.scope === "stage" ? state.stageExamAvailable(s.refId) :
        state.levelExamAvailable(s.refId);
      return { code: s.code, scope: s.scope, name, available };
    });

    res.json({
      targetCode,
      targetUnitCode,
      targetUnitName: (targetUnitRow as any[])[0]?.name ?? null,
      requiredExams,
      firstExamCode: requiredExams.length > 0 ? requiredExams[0].code : null,
    });
  } catch (e) {
    logger.error?.(`[v4/unlock-plan] ${slug}/${targetCode} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/path/:slug/events ────────────────────────────────────────────
// R5 — live progress channel. Holds an SSE connection open and pushes
// every lab/exam completion + every unlock + every celebration to the
// student's open map page so the UI updates without a refresh.
//
// Auth & CSRF posture:
//   - cookie session via requireUser
//   - EventSource cannot set custom headers, so we can't reuse
//     requireSameOriginCsrf (which demands X-Nukhba-Csrf). Instead we
//     enforce a same-origin Origin/Referer check inline. This is
//     critical because the app's CORS is `origin: true, credentials: true`
//     and prod session cookies are `SameSite=none` — without this guard
//     an attacker page could open `new EventSource(...)` and read the
//     student's progress stream cross-origin.
//   - Cross-specialty isolation: the bus is keyed by (userId, slug).
router.get("/v4/path/:slug/events", requireUser, (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug || "");
  if (!slug) { res.status(400).json({ error: "slug_required" }); return; }

  // Fail-closed same-origin guard. EventSource can't set custom headers,
  // so we can't reuse requireSameOriginCsrf — instead we enforce strict
  // Origin/Referer matching here.
  //
  // Rules:
  //   - If `Origin` header is present, it MUST parse to a valid URL whose
  //     host exactly matches the request `host`. Sandboxed contexts send
  //     `Origin: null`, malformed origins, or other tokens — all rejected.
  //   - If `Origin` is absent but `Referer` is present, the referer host
  //     must match. Some browsers omit Origin on simple GETs but still
  //     send Referer for same-origin navigations.
  //   - If BOTH are absent, reject — modern browsers always send at least
  //     one for cross-origin requests. Server-to-server probes / curl
  //     calls don't have a cookie session anyway, but we still refuse to
  //     play it safe.
  const host = (req.headers.host || "").toLowerCase();
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  function safeHost(raw: string | undefined): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s || s.toLowerCase() === "null") return null;
    try { return new URL(s).host.toLowerCase(); } catch { return null; }
  }
  let allowed = false;
  if (typeof originHeader === "string") {
    const oh = safeHost(originHeader);
    if (oh && oh === host) allowed = true;
  } else if (typeof refererHeader === "string") {
    const rh = safeHost(refererHeader);
    if (rh && rh === host) allowed = true;
  }
  if (!host || !allowed) {
    res.status(403).json({ error: "cross_origin_rejected" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  // Initial hello so the client knows the stream is live.
  try { res.write(`data: ${JSON.stringify({ kind: "hello", slug, t: Date.now() })}\n\n`); } catch {}
  const unsubscribe = subscribeProgressEvents(uid, slug, res);
  req.on("close", () => {
    try { unsubscribe(); } catch {}
    try { if (!res.writableEnded) res.end(); } catch {}
  });
});

// ── POST /v4/scene ─────────────────────────────────────────────────────────
// Lazy, FE-triggered generation of a structured "actor story" scene. The
// teaching model emits a lightweight `[[SCENE: <description>]]` marker; the FE
// posts the description here and we return a validated step-by-step JSON
// (authored once by Claude Sonnet, then served from the disk cache). Costs are
// bounded by content-hash caching + in-flight de-dup inside v4-scene-store.
// Auth + same-origin CSRF because each cache miss triggers a paid model call.
router.post("/v4/scene", requireUser, requireSameOriginCsrf, async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic : "";
  const lessonName = typeof req.body?.lessonName === "string" ? req.body.lessonName : undefined;
  const slug = typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
  if (!topic || topic.trim().length < 3) {
    res.status(400).json({ error: "bad_request", message: "topic مطلوب" });
    return;
  }
  if (!slug) {
    res.status(400).json({ error: "bad_request", message: "slug مطلوب" });
    return;
  }
  const uid = getUserId(req);
  try {
    // Validate the specialty so a bogus slug never spins up a junk wallet.
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    const scene = await generateScene(topic, { lessonName, userId: uid ?? undefined, subjectId: slug });
    res.json({ scene });
  } catch (e) {
    const reason = e instanceof SceneGenerationError ? e.reason : "internal";
    logger.warn?.(`[v4/scene] failed reason=${reason}: ${String((e as any)?.message ?? e)}`);
    // Insufficient balance → 402 so the FE shows the paywall (degrades to text).
    if (reason === "insufficient") {
      res.status(402).json({
        error: "insufficient_gems",
        reason,
        message: "رصيد الجواهر لا يكفي لتوليد المشهد التفاعلي.",
      });
      return;
    }
    // Per-user burst limit — tell the client to slow down (FE degrades to text).
    if (reason === "rate_limited") {
      const retryAfterSec = e instanceof SceneGenerationError ? e.retryAfterSec : undefined;
      if (retryAfterSec) res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: "scene_rate_limited",
        reason,
        retryAfterSec,
        message: "أبطئ قليلاً — جرّب توليد المشهد بعد لحظات.",
      });
      return;
    }
    // Map to a status the FE can treat as "degrade to text" without alarming.
    const status = reason === "unconfigured" || reason === "credits" ? 503 : 502;
    res.status(status).json({
      error: "scene_unavailable",
      reason,
      message: "تعذّر توليد المشهد التفاعلي حالياً.",
    });
  }
});

// ── POST /v4/path/:slug/testout/start ──────────────────────────────────────
// Begin (or restart) an adaptive "test-out" exam toward a LOCKED lesson/lab.
// Body: { targetCode }
// Returns one of:
//   { kind:'unlock', targetCode, unlockedCount }  — no prereqs; unlocked now
//   { kind:'ask', sessionId, targetCode, question, progress }  — first question
//   { kind:'error', reason }  — pool couldn't be generated big enough to run
// The global question pool is read-or-generated (free, deduped) and a fresh
// per-attempt session is opened with a server-held first pending question.
router.post("/v4/path/:slug/testout/start", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const targetCode = String((req.body ?? {}).targetCode ?? "").trim();
  if (!targetCode) { res.status(400).json({ error: "target_required" }); return; }
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    // Anti-bypass: the target MUST be a real lesson/lab in the active
    // curriculum. A crafted code could otherwise unlock an unintended range or
    // skip the exam via the no-prereq path below.
    const target = await resolveTestoutTarget(resolved, targetCode);
    if (!target) { res.status(404).json({ error: "invalid_target" }); return; }

    const scope = resolveTestoutScope(resolved, targetCode);

    // No prerequisite content before the target's unit → nothing to test out
    // of; unlock the prior path immediately.
    if (!scope.hasPrereqs) {
      const unlockedCount = await applyTestoutPass({ userId: uid, subjectId: slug, resolved, targetCode });
      res.json({ kind: "unlock", targetCode, unlockedCount });
      return;
    }

    const pool = await getOrCreateTestoutPool({
      versionId: resolved.versionId,
      targetUnitCode: scope.targetUnitCode,
      prereqUnitCodes: scope.prereqUnitCodes,
    });
    if (pool.questions.length < TESTOUT_MIN_RUNNABLE) {
      res.json({ kind: "error", reason: "pool_too_small" });
      return;
    }

    // The served exam must be a full 13–20 questions; refuse to run (and never
    // unlock) on a thinner selection.
    const questionIds = selectTestoutQuestions(pool.questions, TESTOUT_ASK_MAX);
    if (questionIds.length < TESTOUT_ASK_MIN) {
      res.json({ kind: "error", reason: "pool_too_small" });
      return;
    }
    const firstId = questionIds[0];
    const firstQ = pool.questions.find((q) => q.id === firstId);
    if (firstId == null || !firstQ) { res.json({ kind: "error", reason: "pool_too_small" }); return; }

    // Supersede any earlier in-progress attempt for this exact target.
    await db
      .update(v4TestoutSessionsTable)
      .set({ status: "abandoned", completedAt: new Date() })
      .where(and(
        eq(v4TestoutSessionsTable.userId, uid),
        eq(v4TestoutSessionsTable.subjectId, slug),
        eq(v4TestoutSessionsTable.targetCode, targetCode),
        eq(v4TestoutSessionsTable.status, "in_progress"),
      ));

    const [session] = await db
      .insert(v4TestoutSessionsTable)
      .values({
        userId: uid,
        subjectId: slug,
        versionId: resolved.versionId,
        targetCode,
        targetUnitCode: scope.targetUnitCode,
        status: "in_progress",
        questionIds: questionIds as any,
        pending: { questionId: firstId } as any,
        answers: [] as any,
        askMin: TESTOUT_ASK_MIN,
        askMax: TESTOUT_ASK_MAX,
      })
      .returning();

    res.json({
      kind: "ask",
      sessionId: session.id,
      targetCode,
      question: toClientQuestion(firstQ),
      progress: {
        asked: 0,
        min: Math.min(TESTOUT_ASK_MIN, questionIds.length),
        max: Math.min(TESTOUT_ASK_MAX, questionIds.length),
      },
    });
  } catch (e) {
    logger.error?.(`[v4/testout/start] ${slug}/${targetCode} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/testout/answer ─────────────────────────────────────
// Grade the server-held pending question and advance the adaptive descent.
// Body: { sessionId, rawAnswer }
// Returns { kind:'ask', ... } to continue or
//   { kind:'result', passed, scorePct, correct, asked, targetCode,
//     unlockedCount? , weakAreas? }.
router.post("/v4/path/:slug/testout/answer", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const body: any = req.body ?? {};
  const sessionId = Number(body.sessionId);
  const rawAnswer = body.rawAnswer;
  if (!Number.isInteger(sessionId)) { res.status(400).json({ error: "session_required" }); return; }
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    const [session] = await db
      .select()
      .from(v4TestoutSessionsTable)
      .where(eq(v4TestoutSessionsTable.id, sessionId));
    if (!session || session.userId !== uid || session.subjectId !== slug) {
      res.status(404).json({ error: "no_session" });
      return;
    }
    if (session.status !== "in_progress") { res.status(409).json({ error: "session_closed" }); return; }

    const pool = await loadTestoutPool(session.versionId, session.targetUnitCode);
    if (!pool || pool.questions.length === 0) { res.status(409).json({ error: "pool_missing" }); return; }

    const questionIds = Array.isArray(session.questionIds) ? (session.questionIds as number[]) : [];
    let answers = Array.isArray(session.answers) ? (session.answers as TestoutAnswerRec[]) : [];
    const pending = (session.pending as TestoutPending | null) ?? null;

    // Grade the question the SERVER is holding (client can't choose which one).
    if (pending && rawAnswer !== undefined && rawAnswer !== null) {
      const already = answers.some((a) => a.questionId === pending.questionId);
      if (!already) {
        const q = pool.questions.find((qq) => qq.id === pending.questionId);
        if (q) {
          const correct = gradeTestoutMcq(q, rawAnswer);
          answers = [...answers, { questionId: pending.questionId, correct }];
          await db
            .update(v4TestoutSessionsTable)
            .set({ answers: answers as any, pending: null })
            .where(eq(v4TestoutSessionsTable.id, session.id));
        }
      }
    }

    const finalize = async (passed: boolean, scorePct: number, correct: number, asked: number) => {
      await db
        .update(v4TestoutSessionsTable)
        .set({
          status: passed ? "passed" : "failed",
          passed,
          scorePct,
          pending: null,
          completedAt: new Date(),
        })
        .where(eq(v4TestoutSessionsTable.id, session.id));
      if (passed) {
        const unlockedCount = await applyTestoutPass({
          userId: uid,
          subjectId: slug,
          resolved,
          targetCode: session.targetCode,
        });
        res.json({ kind: "result", passed: true, scorePct, correct, asked, targetCode: session.targetCode, unlockedCount });
      } else {
        const weakAreas = buildTestoutWeakAreas(pool.questions, answers, pool.unitNames);
        res.json({ kind: "result", passed: false, scorePct, correct, asked, targetCode: session.targetCode, weakAreas });
      }
    };

    const decision = decideTestoutStep(answers, questionIds, session.askMin, session.askMax);
    if (decision.done) {
      await finalize(decision.passed, decision.scorePct, decision.correct, decision.asked);
      return;
    }

    // Continue: pick + persist the next pending question.
    const nextId = nextTestoutQuestionId(questionIds, answers);
    if (nextId == null) {
      // Pool exhausted but the step logic said "not done" — finalize defensively.
      const correct = answers.filter((a) => a.correct).length;
      const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
      await finalize(pct >= TESTOUT_PASS_PCT, pct, correct, answers.length);
      return;
    }
    const nextQ = pool.questions.find((q) => q.id === nextId)!;
    await db
      .update(v4TestoutSessionsTable)
      .set({ pending: { questionId: nextId } as any })
      .where(eq(v4TestoutSessionsTable.id, session.id));
    res.json({
      kind: "ask",
      sessionId: session.id,
      targetCode: session.targetCode,
      question: toClientQuestion(nextQ),
      progress: {
        asked: answers.length,
        min: Math.min(session.askMin, questionIds.length),
        max: Math.min(session.askMax, questionIds.length),
      },
    });
  } catch (e) {
    logger.error?.(`[v4/testout/answer] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/gate-exam/start ────────────────────────────────────
// Start (or restart) the ADAPTIVE generated exam for a STAGE or LEVEL gate.
// Mirrors /testout/start but its PASS effect records a real passing
// v4_exam_attempts row (the gate predicate the progression engine reads),
// whereas test-out only widens the unlocked lesson set. FREE for the student.
// Body: { examCode }  ("L.S.exam" | "L.exam")
// Returns { kind:'ask' | 'cleared' | 'error', ... }.
router.post("/v4/path/:slug/gate-exam/start", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const examCode = String((req.body ?? {}).examCode ?? "").trim();
  if (!examCode) { res.status(400).json({ error: "exam_required" }); return; }
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    // The code MUST resolve to a real stage/level scope with units in the
    // active curriculum (anti-bypass — a crafted code can't unlock a range).
    const gate = resolveGateExamScope(resolved, examCode);
    if (!gate) { res.status(404).json({ error: "invalid_exam" }); return; }

    const { resolveExamAnchor, checkExamGate } = await import("../lib/v4-lab-exam-engine");
    const anchor = await resolveExamAnchor(resolved.versionId, examCode);
    if (!anchor || anchor.scope !== gate.scope) { res.status(404).json({ error: "invalid_exam" }); return; }

    // Anti-bypass: refuse unless the gate is actually AVAILABLE right now (the
    // same projection the map renders). Stops a curl of a locked stage/level
    // exam from triggering its unlock side-effects.
    const gateCheck = await checkExamGate({
      userId: uid, subjectId: slug, versionId: resolved.versionId,
      scope: anchor.scope, scopeRefId: anchor.scopeRefId,
    });
    if (!gateCheck.ok) { res.status(403).json({ error: "exam_locked", reason: (gateCheck as any).reason }); return; }

    const existingUnlocked = Array.isArray(studentPath.unlockedLessonCodes)
      ? (studentPath.unlockedLessonCodes as string[]) : [];

    const pool = await getOrCreateGateExamPool({
      versionId: resolved.versionId,
      scopeKey: gate.scopeKey,
      unitCodes: gate.unitCodes,
    });

    const questionIds = pool.questions.length >= TESTOUT_MIN_RUNNABLE
      ? selectTestoutQuestions(pool.questions, TESTOUT_ASK_MAX)
      : [];
    if (questionIds.length < TESTOUT_ASK_MIN) {
      // No runnable exam. Distinguish a transient PROVIDER OUTAGE (retry, never
      // auto-pass) from GENUINELY THIN content (no-brick: auto-clear the gate,
      // matching the old "missing bank ⇒ gate open" leniency, made explicit).
      if (pool.failedUnits > 0 && !pool.fromCache) {
        res.json({ kind: "error", reason: "generation_failed" });
        return;
      }
      const passRes = await applyGateExamPass({
        userId: uid, subjectId: slug, versionId: resolved.versionId,
        scope: gate.scope, scopeRefId: anchor.scopeRefId, examCode,
        scorePct: 100, existingUnlocked,
      });
      res.json({ kind: "cleared", examCode, unlockedCount: passRes.unlockedCount, newlyUnlocked: passRes.newlyUnlocked.length });
      return;
    }

    const firstId = questionIds[0];
    const firstQ = pool.questions.find((q) => q.id === firstId);
    if (firstId == null || !firstQ) { res.json({ kind: "error", reason: "pool_too_small" }); return; }

    // Supersede any earlier in-progress attempt for this exact exam.
    await db
      .update(v4TestoutSessionsTable)
      .set({ status: "abandoned", completedAt: new Date() })
      .where(and(
        eq(v4TestoutSessionsTable.userId, uid),
        eq(v4TestoutSessionsTable.subjectId, slug),
        eq(v4TestoutSessionsTable.targetCode, examCode),
        eq(v4TestoutSessionsTable.status, "in_progress"),
      ));

    const [session] = await db
      .insert(v4TestoutSessionsTable)
      .values({
        userId: uid,
        subjectId: slug,
        versionId: resolved.versionId,
        targetCode: examCode,
        targetUnitCode: gate.scopeKey,
        status: "in_progress",
        questionIds: questionIds as any,
        pending: { questionId: firstId } as any,
        answers: [] as any,
        askMin: TESTOUT_ASK_MIN,
        askMax: TESTOUT_ASK_MAX,
      })
      .returning();

    res.json({
      kind: "ask",
      sessionId: session.id,
      examCode,
      scope: gate.scope,
      question: toClientQuestion(firstQ),
      progress: {
        asked: 0,
        min: Math.min(TESTOUT_ASK_MIN, questionIds.length),
        max: Math.min(TESTOUT_ASK_MAX, questionIds.length),
      },
    });
  } catch (e) {
    logger.error?.(`[v4/gate-exam/start] ${slug}/${examCode} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/path/:slug/gate-exam/answer ───────────────────────────────────
// Grade the server-held pending question and advance the adaptive descent for a
// STAGE/LEVEL gate exam. On PASS, records a passing v4_exam_attempts row and
// recomputes the unlock snapshot (applyGateExamPass). FREE.
// Body: { sessionId, rawAnswer }
router.post("/v4/path/:slug/gate-exam/answer", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const body: any = req.body ?? {};
  const sessionId = Number(body.sessionId);
  const rawAnswer = body.rawAnswer;
  if (!Number.isInteger(sessionId)) { res.status(400).json({ error: "session_required" }); return; }
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }

    const [session] = await db
      .select()
      .from(v4TestoutSessionsTable)
      .where(eq(v4TestoutSessionsTable.id, sessionId));
    if (!session || session.userId !== uid || session.subjectId !== slug) {
      res.status(404).json({ error: "no_session" });
      return;
    }
    if (session.status !== "in_progress") { res.status(409).json({ error: "session_closed" }); return; }

    // This endpoint only finalizes STAGE/LEVEL gate exams — guard against a unit
    // test-out session id being posted here (its pass effect is different).
    const gate = resolveGateExamScope(resolved, session.targetCode);
    if (!gate) { res.status(400).json({ error: "not_a_gate_exam" }); return; }

    const pool = await loadTestoutPool(session.versionId, session.targetUnitCode);
    if (!pool || pool.questions.length === 0) { res.status(409).json({ error: "pool_missing" }); return; }

    const questionIds = Array.isArray(session.questionIds) ? (session.questionIds as number[]) : [];
    let answers = Array.isArray(session.answers) ? (session.answers as TestoutAnswerRec[]) : [];
    const pending = (session.pending as TestoutPending | null) ?? null;

    // Grade the question the SERVER is holding (client can't choose which one).
    if (pending && rawAnswer !== undefined && rawAnswer !== null) {
      const already = answers.some((a) => a.questionId === pending.questionId);
      if (!already) {
        const q = pool.questions.find((qq) => qq.id === pending.questionId);
        if (q) {
          const correct = gradeTestoutMcq(q, rawAnswer);
          answers = [...answers, { questionId: pending.questionId, correct }];
          await db
            .update(v4TestoutSessionsTable)
            .set({ answers: answers as any, pending: null })
            .where(eq(v4TestoutSessionsTable.id, session.id));
        }
      }
    }

    const finalize = async (passed: boolean, scorePct: number, correct: number, asked: number) => {
      await db
        .update(v4TestoutSessionsTable)
        .set({
          status: passed ? "passed" : "failed",
          passed,
          scorePct,
          pending: null,
          completedAt: new Date(),
        })
        .where(eq(v4TestoutSessionsTable.id, session.id));
      if (passed) {
        const { resolveExamAnchor } = await import("../lib/v4-lab-exam-engine");
        const anchor = await resolveExamAnchor(session.versionId, session.targetCode);
        const sp = await getStudentPath(uid, slug);
        const existingUnlocked = sp && Array.isArray(sp.unlockedLessonCodes)
          ? (sp.unlockedLessonCodes as string[]) : [];
        if (!anchor || anchor.scope !== gate.scope) {
          // Scope was validated at start; this should be unreachable. Fail safe:
          // report the pass without an unlock so we never write a mis-scoped row.
          res.json({ kind: "result", passed: true, scorePct, correct, asked, examCode: session.targetCode, unlockedCount: 0, newlyUnlocked: 0 });
          return;
        }
        const passRes = await applyGateExamPass({
          userId: uid, subjectId: slug, versionId: session.versionId,
          scope: gate.scope, scopeRefId: anchor.scopeRefId, examCode: session.targetCode,
          scorePct, existingUnlocked,
        });
        res.json({ kind: "result", passed: true, scorePct, correct, asked, examCode: session.targetCode, unlockedCount: passRes.unlockedCount, newlyUnlocked: passRes.newlyUnlocked.length });
      } else {
        const weakAreas = buildTestoutWeakAreas(pool.questions, answers, pool.unitNames);
        res.json({ kind: "result", passed: false, scorePct, correct, asked, examCode: session.targetCode, weakAreas });
      }
    };

    const decision = decideTestoutStep(answers, questionIds, session.askMin, session.askMax);
    if (decision.done) {
      await finalize(decision.passed, decision.scorePct, decision.correct, decision.asked);
      return;
    }

    const nextId = nextTestoutQuestionId(questionIds, answers);
    if (nextId == null) {
      const correct = answers.filter((a) => a.correct).length;
      const pct = answers.length ? Math.round((correct / answers.length) * 100) : 0;
      await finalize(pct >= TESTOUT_PASS_PCT, pct, correct, answers.length);
      return;
    }
    const nextQ = pool.questions.find((q) => q.id === nextId)!;
    await db
      .update(v4TestoutSessionsTable)
      .set({ pending: { questionId: nextId } as any })
      .where(eq(v4TestoutSessionsTable.id, session.id));
    res.json({
      kind: "ask",
      sessionId: session.id,
      examCode: session.targetCode,
      scope: gate.scope,
      question: toClientQuestion(nextQ),
      progress: {
        asked: answers.length,
        min: Math.min(session.askMin, questionIds.length),
        max: Math.min(session.askMax, questionIds.length),
      },
    });
  } catch (e) {
    logger.error?.(`[v4/gate-exam/answer] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

export default router;
