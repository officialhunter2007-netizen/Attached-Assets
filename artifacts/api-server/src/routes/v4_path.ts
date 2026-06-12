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
import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  db,
  v4SpecialtiesTable,
  v4InstructionFileVersionsTable,
  v4DiagnosticSessionsTable,
  v4PlacementTestQuestionsTable,
  v4PlacementSessionsTable,
  type V4PlacementSession,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  V4_DIAGNOSTIC_QUESTIONS,
  resolveActiveSpecialty,
  getStudentPath,
  syncStudentPathToActiveVersion,
  createOrReplaceStudentPath,
  nextPlacementStep,
  gradePlacementAnswer,
  type PlacementProbe,
  type PlacementPending,
  type PlacementResult,
} from "../lib/v4-path-engine";
import { capturePersonalDictionaryFromDiagnostic } from "../lib/v4-memory";
import { subscribeProgressEvents } from "../lib/v4-progress-events";
import { generateScene, SceneGenerationError } from "../lib/v4-scene-store";
import { studentGemWalletsTable } from "@workspace/db";

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
    const [w] = await db
      .select()
      .from(studentGemWalletsTable)
      .where(and(
        eq(studentGemWalletsTable.userId, uid),
        eq(studentGemWalletsTable.subjectId, slug),
      ));
    if (!w) { res.json({ exists: false, gemsBalance: 0, expiresAt: null }); return; }
    res.json({
      exists: true,
      gemsBalance: Number((w as any).gemsBalance ?? 0),
      expiresAt: (w as any).expiresAt ?? null,
    });
  } catch (e) {
    logger.error?.(`[v4/path/wallet] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
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

function placementProgress(probes: PlacementProbe[], phase: "level" | "stage" | "unit" | "done") {
  return {
    phase,
    answered: probes.length,
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

    // Grade an in-flight answer. The questionId comes from session.pending,
    // NOT the client. Grade OUTSIDE the tx (the Haiku call can be slow), then
    // append the probe atomically with a FOR UPDATE re-read so a concurrent
    // double-submit can't record the same question twice.
    if (hasAnswer && session.pending) {
      const pending = session.pending as PlacementPending;
      const [q] = await db
        .select()
        .from(v4PlacementTestQuestionsTable)
        .where(and(
          eq(v4PlacementTestQuestionsTable.id, pending.questionId),
          eq(v4PlacementTestQuestionsTable.versionId, resolved.versionId),
        ));
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
    const step = nextPlacementStep(resolved, questions, probes);

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
        progress: placementProgress(probes, step.scope),
        question: {
          id: step.question.id,
          targetLevelIndex: step.question.targetLevelIndex,
          kind: step.question.kind,
          prompt: step.question.prompt,
          choices: step.question.choices ?? null,
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
    const row = await createOrReplaceStudentPath({
      userId: uid,
      subjectSlug: slug,
      resolved,
      pathType: "custom",
      startMode: "placement",
      startingLevelIndex: result.startingLevelIndex,
      boundaryUnitCode,
    });
    res.json({
      ok: true,
      path: serializePath(row),
      placement: {
        precision: result.precision,
        levelIndex: result.levelIndex,
        stageCode: result.stageCode,
        unitCode: result.unitCode,
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

    // Current level = first segment of currentLessonCode, fallback to startingLevelIndex.
    const currentLevelIndex = currentCode
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

    const currentLevel = allLevels.find((l: any) => l.levelIndex === currentLevelIndex) ?? allLevels[0];
    if (!currentLevel) { res.status(404).json({ error: "level_not_found" }); return; }

    // ── 3. Fetch stages → units → lessons → labs for current level ───────
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
    const { loadLabCompletionsMap, loadExamPassMap, EXAM_PASS_THRESHOLD, LAB_PASS_THRESHOLD } =
      await import("../lib/v4-lab-exam-engine");
    const [labCompletions, examPassMap] = await Promise.all([
      loadLabCompletionsMap(uid),
      loadExamPassMap(uid),
    ]);

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
    const unitExamSet = new Set<number>((examRows as any[]).filter((e: any) => e.scope === "unit" && e.unitId).map((e: any) => e.unitId as number));
    const stageExamSet = new Set<number>((examRows as any[]).filter((e: any) => e.scope === "stage" && e.stageId).map((e: any) => e.stageId as number));
    const levelExamSet = new Set<number>((examRows as any[]).filter((e: any) => e.scope === "level" && e.levelId).map((e: any) => e.levelId as number));

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

    const stageTrees = stages.map((stage: any) => {
      const stageUnits = units.filter((u: any) => u.stageId === stage.id);
      // Track whether every lesson in this stage is completed + every lab passed
      // (needed for the stage exam gate).
      let stageAllLessonsCompleted = true;
      let stageAllLabsPassed = true;

      const unitTrees = stageUnits.map((unit: any) => {
        const lessonsInUnit = lessonsByUnit.get(unit.id) ?? [];
        let unitAllLessonsCompleted = lessonsInUnit.length > 0;
        let unitAnyLessonUnlocked = false;
        const unitLessons = lessonsInUnit.map((l: any) => {
          const status = lessonStatus(l.code);
          totalNodes++;
          if (status === "completed") completedNodes++;
          else unitAllLessonsCompleted = false;
          if (status !== "locked") unitAnyLessonUnlocked = true;
          return { code: l.code, name: l.name, kind: "lesson", status, stars: ((lessonStarsMap[l.code] ?? 0) as 0 | 1 | 2 | 3) };
        });
        if (!unitAllLessonsCompleted) stageAllLessonsCompleted = false;

        const labsInUnit = labsByUnit.get(unit.id) ?? [];
        let unitAllLabsPassed = labsInUnit.length > 0;
        const unitLabs = labsInUnit.map((lab: any) => {
          totalNodes++;
          const comp = labCompletions.get(lab.id);
          let status: "completed" | "available" | "locked" = "locked";
          if (comp?.passed) status = "completed";
          else if (unitAnyLessonUnlocked) status = "available";
          if (status === "completed") completedNodes++;
          else unitAllLabsPassed = false;
          return { code: lab.code, title: lab.title, kind: "lab", status, score: comp?.score ?? null };
        });
        if (labsInUnit.length === 0) unitAllLabsPassed = true; // no labs → trivially "all passed"
        if (!unitAllLabsPassed) stageAllLabsPassed = false;

        const hasUnitTest = unitExamSet.has(unit.id);
        let unitTestStatus: "completed" | "available" | "locked" = "locked";
        if (hasUnitTest) {
          totalNodes++;
          unitTestStatus = examStatus("unit", unit.id, unitAllLessonsCompleted);
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

      const hasStageTest = stageExamSet.has(stage.id);
      let stageTestStatus: "completed" | "available" | "locked" = "locked";
      if (hasStageTest) {
        totalNodes++;
        stageTestStatus = examStatus("stage", stage.id, stageAllLessonsCompleted && stageAllLabsPassed);
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

    // Level exam available once every stage in the level is "completed":
    // all lessons completed + all labs passed + (if the stage has an exam)
    // the stage exam passed. Unit exams are intentionally NON-blocking per
    // spec §13.2 — they're a recommended self-check, NOT a gate, so we do
    // not require u.unitTest here.
    const levelAllStagesCleared = stageTrees.every((s: any) =>
      s.units.every((u: any) =>
        u.lessons.every((l: any) => l.status === "completed") &&
        u.labs.every((lb: any) => lb.status === "completed"),
      ) &&
      (!s.hasStageTest || s.stageTest?.status === "completed"),
    );
    const hasLevelTest = levelExamSet.has(currentLevel.id);
    let levelTestStatus: "completed" | "available" | "locked" = "locked";
    if (hasLevelTest) {
      totalNodes++;
      levelTestStatus = examStatus("level", currentLevel.id, levelAllStagesCleared);
      if (levelTestStatus === "completed") completedNodes++;
    }
    const progressPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    // ── 6. Next levels (locked boxes) ────────────────────────────────────
    const nextLevels = allLevels
      .filter((l: any) => l.levelIndex > currentLevelIndex)
      .map((l: any) => ({ levelIndex: l.levelIndex, name: l.name, locked: true }));

    res.json({
      specialty: { slug: resolved.specialty.slug, name: resolved.specialty.name, icon: resolved.specialty.icon },
      studentPath: {
        startMode: studentPath.startMode,
        startingLevelIndex: studentPath.startingLevelIndex,
        currentLessonCode: currentCode,
        pathType: studentPath.pathType,
      },
      map: {
        currentLevelIndex,
        totalLevels: allLevels.length,
        levelName: currentLevel.name,
        levelGoal: currentLevel.goal,
        progressPct,
        completedNodes,
        totalNodes,
        stages: stageTrees,
        levelTest: hasLevelTest
          ? { code: `${currentLevelIndex}.exam`, kind: "level_test" as const, status: levelTestStatus }
          : null,
      },
      nextLevels,
    });
  } catch (e) {
    logger.error?.(`[v4/map] ${slug} user=${uid}: ${String((e as any)?.message ?? e)}`);
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
  if (!topic || topic.trim().length < 3) {
    res.status(400).json({ error: "bad_request", message: "topic مطلوب" });
    return;
  }
  const uid = getUserId(req);
  try {
    const scene = await generateScene(topic, { lessonName, userId: uid ?? undefined });
    res.json({ scene });
  } catch (e) {
    const reason = e instanceof SceneGenerationError ? e.reason : "internal";
    logger.warn?.(`[v4/scene] failed reason=${reason}: ${String((e as any)?.message ?? e)}`);
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

export default router;
