// ─────────────────────────────────────────────────────────────────────────────
// v4 task #7 — Labs + Exams routes.
//
// All endpoints relative to /api (router is mounted via app.use("/api", …)
// in routes/index.ts — paths here must NOT include the /api prefix).
//
//   GET  /v4/lab/:slug/:labCode
//   POST /v4/lab/:slug/:labCode/submit       — body: { answers: string[] }
//
//   GET  /v4/exam/:slug/:examCode             — picks variant; returns wallet status
//   POST /v4/exam/:slug/:examCode/submit      — body: { variantIndex, answers }
//
// All mutating endpoints require `requireUser` + `requireSameOriginCsrf`
// (custom header + same-origin Origin/Referer — same defense the v4 admin
// and path routes use).
//
// Gem semantics (spec §13.3):
//   - First attempt on an exam charges via chargeV4Ai (level ~20 gems).
//   - Subsequent attempts (alt-bank retries) are FREE — no charge.
//   - Labs do NOT charge gems. The grader is a paid Haiku call but is
//     absorbed by the welcome gift / paid plan (cheap; ≤5 questions).
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  v4LabCompletionsTable,
  v4ExamAttemptsTable,
  v4LevelsTable,
  v4StagesTable,
  v4UnitsTable,
  type V4ExamQuestion,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { resolveActiveSpecialty, getStudentPath, syncStudentPathToActiveVersion } from "../lib/v4-path-engine";
import {
  resolveLab,
  resolveExam,
  countPriorAttempts,
  computeUnlocksForPassedExam,
  applyUnlockedSnapshot,
  examCostUsd,
  usdToGems,
  checkLabGate,
  checkExamGate,
  LAB_PASS_THRESHOLD,
  EXAM_PASS_THRESHOLD,
  type ExamScope,
} from "../lib/v4-lab-exam-engine";
import {
  evaluateExamAnswer,
  evaluateLabAnswer,
  type EvalResult,
} from "../lib/v4-exam-evaluator";
import { chargeV4Ai, refundV4Ai } from "../lib/v4-gem-wallet";

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

// ── GET /v4/lab/:slug/:labCode ─────────────────────────────────────────────
// Returns the scenario + 5 questions for the lab. Lab questions do NOT carry
// "correct answers" — they're all free-form, graded by Haiku at submit time.
router.get("/v4/lab/:slug/:labCode", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const labCode = String(req.params.labCode);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    const lab = await resolveLab(studentPath.versionId, labCode);
    if (!lab) { res.status(404).json({ error: "lab_not_found" }); return; }

    // Look up the prior completion (if any) so the FE can show "retry" state.
    const [prior] = await db
      .select()
      .from(v4LabCompletionsTable)
      .where(and(
        eq(v4LabCompletionsTable.userId, uid),
        eq(v4LabCompletionsTable.labId, lab.scenario.id),
      ));

    res.json({
      slug,
      lab: {
        code: lab.scenario.code,
        title: lab.scenario.title,
        scenario: lab.scenario.scenario,
        completionCriterion: lab.scenario.completionCriterion,
        questions: lab.questions.map(q => ({
          id: q.id,
          questionIndex: q.questionIndex,
          kind: q.kind,
          prompt: q.prompt,
          // v4.1 — expose points so FE can show weight; defaults to 1 for legacy.
          points: (q as any).points ?? 1,
        })),
      },
      prior: prior
        ? { score: prior.score, passed: prior.passed, attempts: prior.attempts, evaluatorLog: prior.evaluatorLog }
        : null,
      passThreshold: LAB_PASS_THRESHOLD,
    });
  } catch (e) {
    logger.error?.(`[v4/lab GET] ${slug}/${labCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/lab/:slug/:labCode/evaluate ───────────────────────────────────
// Per-question Haiku evaluation. Stateless — no DB write. Drives the
// "answer → immediate feedback → next question" sequential UX required
// by spec §13.1 ("Haiku يُقيّم كل إجابة فوراً بصواب/خطأ ويوضّح"). The
// /submit endpoint still does its OWN grading server-side (no client-
// supplied scores trusted) before persisting — this endpoint just lets
// the student see the verdict per-question without finalizing the lab.
router.post("/v4/lab/:slug/:labCode/evaluate", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const labCode = String(req.params.labCode);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);
    const lab = await resolveLab(studentPath.versionId, labCode);
    if (!lab) { res.status(404).json({ error: "lab_not_found" }); return; }
    const gate = await checkLabGate({ userId: uid, subjectId: slug, versionId: studentPath.versionId, labCode });
    if (!gate.ok) { res.status(403).json({ error: gate.reason ?? "lab_locked" }); return; }

    const qIndex = Number((req.body as any)?.questionIndex);
    const answer = String((req.body as any)?.answer ?? "");
    if (!Number.isFinite(qIndex)) { res.status(400).json({ error: "question_index_required" }); return; }
    const q = lab.questions.find(qq => qq.questionIndex === qIndex);
    if (!q) { res.status(404).json({ error: "question_not_found" }); return; }
    if (!answer.trim()) { res.status(400).json({ error: "answer_required" }); return; }

    const r = await evaluateLabAnswer({
      id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      scenario: lab.scenario.scenario,
      completionCriterion: lab.scenario.completionCriterion,
      // v4.1 — anchor grader on rubric + canonical solution outline when
      // the instruction-file ships them (legacy v4.0 rows leave these null
      // and the evaluator falls back to its existing prompt automatically).
      rubric: (q as any).rubric ?? null,
      solutionOutline: (q as any).solutionOutline ?? null,
    }, answer);
    if (r.evaluatorFailed) {
      res.status(503).json({ error: "evaluator_unavailable", message: "تعذّر التقييم الآن — حاول بعد قليل." });
      return;
    }
    res.json({ verdict: r.verdict, score: r.score, explanation: r.explanation });
  } catch (e) {
    logger.error?.(`[v4/lab evaluate] ${slug}/${labCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/lab/:slug/:labCode/submit ─────────────────────────────────────
router.post("/v4/lab/:slug/:labCode/submit", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const labCode = String(req.params.labCode);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);
    const lab = await resolveLab(studentPath.versionId, labCode);
    if (!lab) { res.status(404).json({ error: "lab_not_found" }); return; }

    // Anti-bypass: re-derive eligibility on the server. A locked lab refuses
    // even if the FE blocked it — protects against direct curl.
    const gate = await checkLabGate({ userId: uid, subjectId: slug, versionId: studentPath.versionId, labCode });
    if (!gate.ok) { res.status(403).json({ error: gate.reason ?? "lab_locked" }); return; }

    const rawAnswers: unknown = (req.body as any)?.answers;
    if (!Array.isArray(rawAnswers)) {
      res.status(400).json({ error: "answers_required" }); return;
    }

    // Grade each question via Haiku. Run in parallel — independent calls.
    const evalLog: Array<{
      questionId: number; questionIndex: number; kind: string; prompt: string;
      studentAnswer: string; verdict: EvalResult["verdict"]; score: number; explanation: string;
    }> = [];
    const graded = await Promise.all(lab.questions.map((q, i) =>
      evaluateLabAnswer({
        id: q.id,
        prompt: q.prompt,
        kind: q.kind,
        scenario: lab.scenario.scenario,
        completionCriterion: lab.scenario.completionCriterion,
        // v4.1 — pass rubric/solution_outline so Haiku scores against the
        // canonical criteria rather than free-form prose length.
        rubric: (q as any).rubric ?? null,
        solutionOutline: (q as any).solutionOutline ?? null,
      }, String((rawAnswers as any)[i] ?? "")),
    ));
    lab.questions.forEach((q, i) => {
      const r = graded[i];
      evalLog.push({
        questionId: q.id, questionIndex: q.questionIndex, kind: q.kind, prompt: q.prompt,
        studentAnswer: String((rawAnswers as any)[i] ?? ""),
        verdict: r.verdict, score: r.score, explanation: r.explanation,
      });
    });

    // If the majority of questions failed to grade (transport error), don't
    // persist a punitive attempt — surface a 503 so the student can retry
    // without it counting against them. Labs aren't charged, so there's no
    // refund to issue.
    const evaluatorFailures = graded.filter(g => g.evaluatorFailed).length;
    if (evaluatorFailures > Math.floor(graded.length / 2)) {
      res.status(503).json({ error: "evaluator_unavailable", message: "تعذّر التقييم الآن — حاول بعد قليل." });
      return;
    }

    // v4.1 — points-weighted aggregation. Each question's score (0-100) is
    // weighted by its `points` (default 1, so v4.0 labs behave identically
    // to the prior unweighted mean). Total = Σ(score·w) / Σ(w).
    const labWeights = lab.questions.map(q => Math.max(1, Number((q as any).points ?? 1)));
    const labWeightSum = labWeights.reduce((a, b) => a + b, 0);
    const avgScore = evalLog.length && labWeightSum > 0
      ? Math.round(evalLog.reduce((s, e, i) => s + e.score * labWeights[i], 0) / labWeightSum)
      : 0;
    const passed = avgScore >= LAB_PASS_THRESHOLD;

    // Upsert completion (one row per (user, lab) — retry overwrites + bumps attempts).
    const [existing] = await db
      .select()
      .from(v4LabCompletionsTable)
      .where(and(
        eq(v4LabCompletionsTable.userId, uid),
        eq(v4LabCompletionsTable.labId, lab.scenario.id),
      ));
    if (existing) {
      await db.update(v4LabCompletionsTable)
        .set({
          score: avgScore,
          passed,
          evaluatorLog: evalLog as any,
          attempts: (existing.attempts ?? 0) + 1,
          completedAt: new Date(),
        })
        .where(eq(v4LabCompletionsTable.id, existing.id));
    } else {
      await db.insert(v4LabCompletionsTable).values({
        userId: uid,
        labId: lab.scenario.id,
        versionId: studentPath.versionId,
        subjectId: slug,
        score: avgScore,
        passed,
        evaluatorLog: evalLog as any,
        attempts: 1,
      } as any);
    }

    // R5 — broadcast a live progress event to any open map listener for
    // this user. Best-effort; failures here must not bubble up because
    // the lab attempt is already durably persisted above.
    try {
      const { publishProgressEvent } = await import("../lib/v4-progress-events");
      publishProgressEvent(uid, slug, {
        kind: "node_completed",
        slug,
        nodeId: labCode,
        nodeKind: "lab",
        score: avgScore,
        passed,
      });
      if (passed) {
        publishProgressEvent(uid, slug, {
          kind: "celebration",
          slug,
          scope: "lab",
          name: lab.scenario.title ?? labCode,
          score: avgScore,
        });
      }
    } catch (e) {
      logger.warn?.(`[v4/lab events] u=${uid} ${labCode}: ${String((e as any)?.message ?? e)}`);
    }

    res.json({
      score: avgScore,
      passed,
      passThreshold: LAB_PASS_THRESHOLD,
      evaluatorLog: evalLog,
    });
  } catch (e) {
    logger.error?.(`[v4/lab POST] ${slug}/${labCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── GET /v4/exam/:slug/:examCode ───────────────────────────────────────────
// Pick the variant the student would get RIGHT NOW (based on their prior
// attempt count). Includes a wallet check so the FE can block "start" when
// the first attempt would fail the gem charge.
// Anti-bypass: the GET handler also enforces the gate so we don't even
// stream the questions for a locked exam. The FE relies on the map for
// navigation, but a direct fetch is still possible — refuse it here too.
router.get("/v4/exam/:slug/:examCode", requireUser, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const examCode = String(req.params.examCode);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    // Probe what the exam *would* look like with 0 prior attempts to get
    // the scope/anchor, then re-resolve with the real prior count to
    // pick the right variant.
    const probe = await resolveExam(studentPath.versionId, examCode, 0);
    if (!probe) { res.status(404).json({ error: "exam_not_found" }); return; }
    const gate = await checkExamGate({
      userId: uid, subjectId: slug, versionId: studentPath.versionId,
      scope: probe.scope, scopeRefId: probe.scopeRefId,
    });
    if (!gate.ok) { res.status(403).json({ error: gate.reason ?? "exam_locked" }); return; }

    const priorAttempts = await countPriorAttempts(uid, probe.scope, probe.scopeRefId);
    // Retry mode (spec §13.2): on failure the student picks
    //   - "paid_same_bank" → pay gems, retry the SAME variant
    //   - "free_alt_bank"  → free, rotate to the next variant
    // First attempt is always paid & uses the round-robin pick.
    const retryMode = String((req.query as any)?.retryMode ?? "") as "" | "paid_same_bank" | "free_alt_bank";
    let variantSeed = priorAttempts; // default rotation seed
    if (priorAttempts > 0 && retryMode === "paid_same_bank") {
      // Replay the LAST attempted variant — read it from the latest row.
      const [lastAttempt] = await db
        .select({ variantIndex: v4ExamAttemptsTable.variantIndex })
        .from(v4ExamAttemptsTable)
        .where(and(
          eq(v4ExamAttemptsTable.userId, uid),
          eq(v4ExamAttemptsTable.scope, probe.scope as any),
          eq(v4ExamAttemptsTable.scopeRefId, probe.scopeRefId),
        ))
        .orderBy(sql`attempted_at desc`)
        .limit(1);
      // resolveExam picks (seed % total)+1, so subtract 1 to land on the same variant.
      variantSeed = lastAttempt ? Math.max(0, ((lastAttempt as any).variantIndex as number) - 1) : priorAttempts;
    }
    const exam = await resolveExam(studentPath.versionId, examCode, variantSeed);
    if (!exam) { res.status(404).json({ error: "exam_not_found" }); return; }

    // Cost / wallet check:
    //   - first attempt: always charged
    //   - paid_same_bank retry: charged (same cost as first attempt)
    //   - free_alt_bank retry (default for retries): free
    const willCharge = priorAttempts === 0 || retryMode === "paid_same_bank";
    const costUsd = willCharge ? examCostUsd(exam.scope) : 0;
    const costGems = willCharge ? usdToGems(costUsd) : 0;

    // Cheap wallet probe — read balance without mutating.
    let balance: number | null = null;
    try {
      const { studentGemWalletsTable } = await import("@workspace/db");
      const [w] = await db.select().from(studentGemWalletsTable).where(and(
        eq(studentGemWalletsTable.userId, uid),
        eq(studentGemWalletsTable.subjectId, slug),
      ));
      balance = w ? Number((w as any).gemsBalance) : 0;
    } catch { balance = null; }
    const canAfford = willCharge ? (balance ?? 0) >= costGems : true;

    // ── Scope context (additive — powers the FE brief screen) ───────────────
    // Scope-adaptive: a UNIT exam gets the richest context (name + goal +
    // key concepts + level/stage breadcrumb); stage/level get lighter
    // labels. A lookup failure NEVER breaks the exam payload — the FE falls
    // back to the generic scope label when `context` is null.
    let context:
      | {
          scope: ExamScope;
          title: string;
          goal: string;
          keyConcepts: string[];
          levelName: string | null;
          stageName: string | null;
          instructions: string | null;
        }
      | null = null;
    try {
      const metaInstr = (m: any): string | null =>
        typeof m?.instructions === "string" && m.instructions.trim() ? String(m.instructions).trim() : null;
      if (exam.scope === "unit") {
        const [u] = await db.select().from(v4UnitsTable).where(eq(v4UnitsTable.id, exam.scopeRefId));
        if (u) {
          const [stg] = await db.select().from(v4StagesTable).where(eq(v4StagesTable.id, (u as any).stageId));
          const [lvl] = stg
            ? await db.select().from(v4LevelsTable).where(eq(v4LevelsTable.id, (stg as any).levelId))
            : [undefined as any];
          context = {
            scope: "unit",
            title: String((u as any).name ?? ""),
            goal: String((u as any).goal ?? ""),
            keyConcepts: Array.isArray((u as any).keyConcepts)
              ? ((u as any).keyConcepts as any[]).map((c) => String(c)).filter(Boolean)
              : [],
            levelName: lvl ? String((lvl as any).name) : null,
            stageName: stg ? String((stg as any).name) : null,
            instructions: metaInstr((u as any).examMeta),
          };
        }
      } else if (exam.scope === "stage") {
        const [stg] = await db.select().from(v4StagesTable).where(eq(v4StagesTable.id, exam.scopeRefId));
        if (stg) {
          const [lvl] = await db.select().from(v4LevelsTable).where(eq(v4LevelsTable.id, (stg as any).levelId));
          context = {
            scope: "stage",
            title: String((stg as any).name ?? ""),
            goal: String((stg as any).goal ?? ""),
            keyConcepts: [],
            levelName: lvl ? String((lvl as any).name) : null,
            stageName: String((stg as any).name ?? ""),
            instructions: metaInstr((stg as any).examMeta),
          };
        }
      } else {
        const [lvl] = await db.select().from(v4LevelsTable).where(eq(v4LevelsTable.id, exam.scopeRefId));
        if (lvl) {
          context = {
            scope: "level",
            title: String((lvl as any).name ?? ""),
            goal: String((lvl as any).goal ?? ""),
            keyConcepts: [],
            levelName: String((lvl as any).name ?? ""),
            stageName: null,
            instructions: metaInstr((lvl as any).examMeta),
          };
        }
      }
    } catch (e) {
      logger.warn?.(`[v4/exam GET] context lookup ${slug}/${examCode}: ${String((e as any)?.message ?? e)}`);
      context = null;
    }

    // ── Summary stats from the resolved variant's questions (additive) ──────
    const kindBreakdown: Record<string, number> = { mcq: 0, short_answer: 0, practical: 0 };
    let totalPoints = 0;
    let suggestedTotalSeconds = 0;
    let anyTimeHint = false;
    for (const q of exam.questions as any[]) {
      const k = String(q.kind);
      kindBreakdown[k] = (kindBreakdown[k] ?? 0) + 1;
      totalPoints += Math.max(1, Number(q.points ?? 1) || 1);
      if (q.timeLimitSeconds != null) {
        suggestedTotalSeconds += Math.max(0, Number(q.timeLimitSeconds) || 0);
        anyTimeHint = true;
      }
    }
    const stats = {
      questionCount: exam.questions.length,
      totalPoints,
      suggestedTotalSeconds: anyTimeHint ? suggestedTotalSeconds : null,
      kindBreakdown,
    };

    res.json({
      slug,
      exam: {
        examCode: exam.examCode,
        scope: exam.scope,
        variantIndex: exam.variantIndex,
        totalVariantsAvailable: exam.totalVariantsAvailable,
        priorAttempts,
        questions: exam.questions.map(q => ({
          id: q.id,
          questionIndex: q.questionIndex,
          kind: q.kind,
          prompt: q.prompt,
          // MCQs need choices on the wire; never leak correctIndex.
          choices: q.kind === "mcq" ? (q.choices as string[] | null) ?? [] : undefined,
          // v4.1 — expose per-question points + time hint for the FE timer.
          points: (q as any).points ?? 1,
          timeLimitSeconds: (q as any).timeLimitSeconds ?? null,
        })),
      },
      cost: { willCharge, costUsd, costGems, balance, canAfford },
      passThreshold: EXAM_PASS_THRESHOLD,
      context,
      stats,
    });
  } catch (e) {
    logger.error?.(`[v4/exam GET] ${slug}/${examCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /v4/exam/:slug/:examCode/submit ───────────────────────────────────
router.post("/v4/exam/:slug/:examCode/submit", requireUser, requireSameOriginCsrf, async (req, res) => {
  const uid: number = (req as any).userId;
  const slug = String(req.params.slug);
  const examCode = String(req.params.examCode);
  try {
    const resolved = await resolveActiveSpecialty(slug);
    if (!resolved) { res.status(404).json({ error: "specialty_unavailable" }); return; }
    let studentPath = await getStudentPath(uid, slug);
    if (!studentPath) { res.status(404).json({ error: "no_student_path" }); return; }
    studentPath = await syncStudentPathToActiveVersion(studentPath, resolved);

    const probe = await resolveExam(studentPath.versionId, examCode, 0);
    if (!probe) { res.status(404).json({ error: "exam_not_found" }); return; }

    // Anti-bypass: re-derive eligibility on the server. Without this, a
    // student could curl /v4/exam/3.exam/submit, pass it (the grader IS
    // honest), and trigger computeUnlocksForPassedExam to skip stages 1-2.
    const gate = await checkExamGate({
      userId: uid, subjectId: slug, versionId: studentPath.versionId,
      scope: probe.scope, scopeRefId: probe.scopeRefId,
    });
    if (!gate.ok) { res.status(403).json({ error: gate.reason ?? "exam_locked" }); return; }

    const priorAttempts = await countPriorAttempts(uid, probe.scope, probe.scopeRefId);
    // Retry mode mirrors GET — see comment there.
    const retryMode = String((req.body as any)?.retryMode ?? "") as "" | "paid_same_bank" | "free_alt_bank";
    let variantSeed = priorAttempts;
    if (priorAttempts > 0 && retryMode === "paid_same_bank") {
      const [lastAttempt] = await db
        .select({ variantIndex: v4ExamAttemptsTable.variantIndex })
        .from(v4ExamAttemptsTable)
        .where(and(
          eq(v4ExamAttemptsTable.userId, uid),
          eq(v4ExamAttemptsTable.scope, probe.scope as any),
          eq(v4ExamAttemptsTable.scopeRefId, probe.scopeRefId),
        ))
        .orderBy(sql`attempted_at desc`)
        .limit(1);
      variantSeed = lastAttempt ? Math.max(0, ((lastAttempt as any).variantIndex as number) - 1) : priorAttempts;
    }
    const exam = await resolveExam(studentPath.versionId, examCode, variantSeed);
    if (!exam) { res.status(404).json({ error: "exam_not_found" }); return; }

    // Body validation — answers must be an array indexed parallel to questions.
    const rawAnswers: unknown = (req.body as any)?.answers;
    if (!Array.isArray(rawAnswers)) {
      res.status(400).json({ error: "answers_required" }); return;
    }

    // ── Step 1: charge gems if first attempt OR paid-same-bank retry ────
    // Use a DETERMINISTIC requestId so concurrent submits collapse to a
    // single debit via the gem_ledger (user_id, request_id) unique index.
    // The losing request observes charged===false with no insufficient/
    // noWallet flag — that's the "already paid by my own concurrent twin"
    // signal, and we proceed. For paid retries we key on priorAttempts so
    // each retry gets its own debit (but stays idempotent under a retry).
    const willCharge = priorAttempts === 0 || retryMode === "paid_same_bank";
    const costUsd = willCharge ? examCostUsd(exam.scope) : 0;
    let gemsDeducted = 0;
    let requestId: string | null = null;
    if (willCharge && costUsd > 0) {
      requestId = priorAttempts === 0
        ? `v4-exam-first-${exam.scope}-${exam.scopeRefId}-${uid}`
        : `v4-exam-paid-retry-${exam.scope}-${exam.scopeRefId}-${uid}-${priorAttempts}`;
      const charge = await chargeV4Ai({
        requestId,
        userId: uid,
        subjectId: slug,
        costUsd,
        source: "v4_exam_attempt",
        note: `exam ${examCode}`,
      });
      if (!charge.charged) {
        if (charge.insufficient || charge.noWallet) {
          res.status(402).json({
            error: charge.noWallet ? "wallet_missing" : "insufficient_gems",
            costGems: usdToGems(costUsd),
            balance: charge.balanceAfter,
          });
          return;
        }
        // charged=false, no insufficient/noWallet → concurrent duplicate.
        // Treat as success: the row exists, the student paid once.
        gemsDeducted = usdToGems(costUsd);
      } else {
        gemsDeducted = charge.gemsDeducted;
      }
    }

    // ── Step 2: grade every question in parallel ───────────────────────────
    const graded = await Promise.all(exam.questions.map((q: V4ExamQuestion, i: number) =>
      evaluateExamAnswer({
        id: q.id,
        prompt: q.prompt,
        kind: q.kind,
        choices: (q.choices as string[] | null) ?? null,
        correctIndex: q.correctIndex ?? null,
        explanation: q.explanation ?? null,
        // v4.1 — anchor the grader on rubric + solution_outline when the
        // instruction-file ships them. Falls back to legacy explanation.
        rubric: (q as any).rubric ?? null,
        solutionOutline: (q as any).solutionOutline ?? null,
      }, (rawAnswers as any)[i] ?? null),
    ));

    // If the grader collapsed (majority of answers failed to evaluate),
    // refund the gem charge and surface a friendly 503 — don't record an
    // attempt that would unfairly count as a try toward the rotation.
    const evaluatorFailures = graded.filter(g => g.evaluatorFailed).length;
    if (evaluatorFailures > Math.floor(graded.length / 2)) {
      if (requestId && gemsDeducted > 0) {
        try {
          await refundV4Ai({
            requestId, userId: uid, subjectId: slug,
            source: "v4_exam_attempt",
            reason: "evaluator_unavailable",
          });
        } catch (e) {
          logger.error?.(`[v4/exam refund] ${slug}/${examCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
        }
      }
      res.status(503).json({ error: "evaluator_unavailable", message: "تعذّر التقييم الآن — أُعيدت الجواهر، حاول لاحقاً." });
      return;
    }

    const log = exam.questions.map((q, i) => ({
      questionId: q.id,
      questionIndex: q.questionIndex,
      kind: q.kind,
      prompt: q.prompt,
      studentAnswer: String((rawAnswers as any)[i] ?? ""),
      verdict: graded[i].verdict,
      score: graded[i].score,
      explanation: graded[i].explanation,
    }));

    // v4.1 — same points-weighted aggregation as labs. Defaults to 1 per
    // question, so v4.0 exams keep their old unweighted-mean behavior.
    const examWeights = exam.questions.map(q => Math.max(1, Number((q as any).points ?? 1)));
    const examWeightSum = examWeights.reduce((a, b) => a + b, 0);
    const avgScore = log.length && examWeightSum > 0
      ? Math.round(log.reduce((s, e, i) => s + e.score * examWeights[i], 0) / examWeightSum)
      : 0;
    const passed = avgScore >= EXAM_PASS_THRESHOLD;

    // ── Step 3: record attempt (append-only) ───────────────────────────────
    await db.insert(v4ExamAttemptsTable).values({
      userId: uid,
      versionId: studentPath.versionId,
      subjectId: slug,
      scope: exam.scope,
      examCode: exam.examCode,
      scopeRefId: exam.scopeRefId,
      variantIndex: exam.variantIndex,
      answers: log as any,
      score: avgScore,
      passed,
      gemsDeducted,
      requestId,
    } as any);

    // ── Step 4: on pass — recompute reachability (Test-out model) ──────────
    // ANY passing exam (unit/stage/level) can open new units: a unit exam is
    // the gate to the next unit; a stage/level exam gates the next stage/level.
    // The shared engine re-derives reachability from the freshly-persisted
    // attempt above and returns every lesson under the now-reachable units.
    let unlockResult: { newlyUnlocked: string[]; nextLessonCode: string | null } | null = null;
    if (passed) {
      const existingUnlocked = Array.isArray(studentPath.unlockedLessonCodes)
        ? (studentPath.unlockedLessonCodes as string[])
        : [];
      const u = await computeUnlocksForPassedExam({
        versionId: studentPath.versionId,
        userId: uid,
        existingUnlocked,
      });
      if (u.newlyUnlocked.length > 0) {
        await applyUnlockedSnapshot({
          userId: uid,
          subjectId: slug,
          unlocked: u.unlocked,
          nextLessonCode: u.nextLessonCode,
        });
      }
      unlockResult = { newlyUnlocked: u.newlyUnlocked, nextLessonCode: u.nextLessonCode };
    }

    // R5 — broadcast live progress events to any open map listener for
    // this user. Best-effort; the attempt is already durably persisted.
    try {
      const { publishProgressEvent } = await import("../lib/v4-progress-events");
      const nodeKind: "unit_test" | "stage_test" | "level_test" =
        exam.scope === "unit" ? "unit_test" : exam.scope === "stage" ? "stage_test" : "level_test";
      publishProgressEvent(uid, slug, {
        kind: "node_completed",
        slug,
        nodeId: exam.examCode,
        nodeKind,
        score: avgScore,
        passed,
      });
      if (passed && unlockResult && unlockResult.newlyUnlocked.length > 0) {
        publishProgressEvent(uid, slug, {
          kind: "nodes_unlocked",
          slug,
          codes: unlockResult.newlyUnlocked,
          nextLessonCode: unlockResult.nextLessonCode,
        });
      }
      if (passed) {
        // Resolve a friendly Arabic label for the celebration (unit/
        // stage/level name). Cheap one-row lookup — failure falls back
        // to the canonical exam code.
        let label = exam.examCode;
        try {
          if (exam.scope === "level") {
            const [row] = await db.select({ name: v4LevelsTable.name })
              .from(v4LevelsTable).where(eq(v4LevelsTable.id, exam.scopeRefId));
            if (row?.name) label = row.name;
          } else if (exam.scope === "stage") {
            const [row] = await db.select({ name: v4StagesTable.name })
              .from(v4StagesTable).where(eq(v4StagesTable.id, exam.scopeRefId));
            if (row?.name) label = row.name;
          } else {
            const [row] = await db.select({ name: v4UnitsTable.name })
              .from(v4UnitsTable).where(eq(v4UnitsTable.id, exam.scopeRefId));
            if (row?.name) label = row.name;
          }
        } catch {}
        publishProgressEvent(uid, slug, {
          kind: "celebration",
          slug,
          scope: exam.scope,
          name: label,
          score: avgScore,
        });
      }
    } catch (e) {
      logger.warn?.(`[v4/exam events] u=${uid} ${examCode}: ${String((e as any)?.message ?? e)}`);
    }

    res.json({
      score: avgScore,
      passed,
      passThreshold: EXAM_PASS_THRESHOLD,
      variantIndex: exam.variantIndex,
      attemptNumber: priorAttempts + 1,
      gemsDeducted,
      evaluatorLog: log,
      unlocked: unlockResult,
    });
  } catch (e) {
    logger.error?.(`[v4/exam POST] ${slug}/${examCode} u=${uid}: ${String((e as any)?.message ?? e)}`);
    res.status(500).json({ error: "internal" });
  }
});

export default router;

// Re-export ExamScope type at the value level for tooling (no-op at runtime).
export type { ExamScope };
