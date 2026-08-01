// ─────────────────────────────────────────────────────────────────────────────
// v4 Quiz Scores — submit + retrieve student scores on HTML self-grading quizzes
//
//   POST /api/v4/quiz-scores                   — submit score (auth)
//   POST /api/v4/quiz-scores/record-gate-pass  — record HTML quiz pass → v4_exam_attempts (auth)
//   GET  /api/v4/quiz-scores                   — my scores for a specialty (auth)
//   GET  /api/v4/admin/quiz-scores             — admin: all scores (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  computeUnlocksForPassedExam,
  applyUnlockedSnapshot,
  resolveExamAnchor,
  EXAM_PASS_THRESHOLD,
} from "../lib/v4-lab-exam-engine";

const router = Router();

// ── auth helpers ──────────────────────────────────────────────────────────────

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getUserId(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const uid = getUserId(req);
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isAdmin(uid))) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

const VALID_TYPES = ["unit", "level", "stage"] as const;
type QuizType = typeof VALID_TYPES[number];

const TABLE_FOR: Record<QuizType, string> = {
  unit:  "v4_unit_quizzes",
  level: "v4_level_quizzes",
  stage: "v4_stage_quizzes",
};

// ── POST /api/v4/quiz-scores/record-gate-pass — HTML quiz pass → v4_exam_attempts ─
//
// Called after a student passes (score ≥ 70) a generated HTML quiz so the
// result is persisted in v4_exam_attempts and triggers gate unlocking, just
// like the canonical AI exam does.
//
// Body: { specialtySlug, examCode, score, quizId, quizType }
//
// examCode must be a canonical gate code ending in ".exam"
//   Unit:  "1.2.3.exam"  → scope=unit,  scopeRefId="1.2.3"
//   Stage: "1.2.exam"    → scope=stage, scopeRefId="1.2"
//   Level: "1.exam"      → scope=level, scopeRefId="1"
//
// Idempotent: a duplicate request_id is silently ignored.

router.post("/v4/quiz-scores/record-gate-pass", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req)!;
  const { specialtySlug, examCode, score, quizId, quizType } = req.body ?? {};

  // ── Validate inputs ──────────────────────────────────────────────────────
  if (!specialtySlug || typeof specialtySlug !== "string") {
    res.status(400).json({ error: "specialtySlug مطلوب" }); return;
  }
  const codeStr = String(examCode ?? "");
  if (!codeStr.endsWith(".exam")) {
    res.status(400).json({ error: "examCode غير صالح — يجب أن ينتهي بـ .exam" }); return;
  }
  const scoreNum = Number(score);
  if (!Number.isFinite(scoreNum) || scoreNum < EXAM_PASS_THRESHOLD) {
    res.status(400).json({ error: `score يجب أن يكون ${EXAM_PASS_THRESHOLD} أو أكثر` }); return;
  }
  const scoreInt = Math.round(scoreNum);

  try {
    // ── Get student path (versionId + existing unlocks) ───────────────────
    const pathResult = await db.execute(sql`
      SELECT version_id, unlocked_lesson_codes
      FROM v4_student_paths
      WHERE user_id = ${userId} AND subject_id = ${specialtySlug}
      LIMIT 1
    `);
    const pathRow = (pathResult as any).rows[0];
    if (!pathRow) {
      res.status(404).json({ error: "مسار الطالب غير موجود — يجب البدء بالتخصص أولاً" }); return;
    }
    const versionId: number = pathRow.version_id;

    // ── Resolve exam anchor → scope + integer scopeRefId ──────────────────
    // Uses the same engine function the canonical AI exam uses, so the
    // scope/scopeRefId pair is always consistent with the progression engine.
    const anchor = await resolveExamAnchor(versionId, codeStr);
    if (!anchor) {
      res.status(404).json({ error: "الاختبار غير موجود في هذا التخصص أو المستوى" }); return;
    }

    // ── Idempotent: skip if a passing attempt already exists ──────────────
    const existingPass = await db.execute(sql`
      SELECT id FROM v4_exam_attempts
      WHERE user_id = ${userId} AND version_id = ${versionId}
        AND exam_code = ${codeStr} AND passed = true
      LIMIT 1
    `);
    if ((existingPass as any).rows.length > 0) {
      logger.info({ userId, examCode: codeStr }, "[v4/quiz-scores/record-gate-pass] already passed");
      res.json({ ok: true, alreadyPassed: true, newlyUnlocked: [] }); return;
    }

    // ── Record attempt (no gems deducted — HTML quiz already paid at gen time) ──
    await db.execute(sql`
      INSERT INTO v4_exam_attempts
        (user_id, version_id, subject_id, scope, exam_code, scope_ref_id,
         variant_index, answers, score, passed, gems_deducted)
      VALUES
        (${userId}, ${versionId}, ${specialtySlug},
         ${anchor.scope}, ${codeStr}, ${anchor.scopeRefId},
         0, '[]'::jsonb, ${scoreInt}, true, 0)
    `);

    // ── Recompute unlocks (identical logic to the canonical exam route) ───
    const existingUnlocked: string[] = Array.isArray(pathRow.unlocked_lesson_codes)
      ? (pathRow.unlocked_lesson_codes as string[])
      : [];
    const u = await computeUnlocksForPassedExam({ versionId, userId, existingUnlocked });
    if (u.newlyUnlocked.length > 0) {
      await applyUnlockedSnapshot({
        userId,
        subjectId: specialtySlug,
        unlocked: u.unlocked,
        nextLessonCode: u.nextLessonCode,
      });
    }

    logger.info(
      { userId, examCode: codeStr, scope: anchor.scope, score: scoreInt, newlyUnlocked: u.newlyUnlocked.length },
      "[v4/quiz-scores/record-gate-pass] gate pass recorded",
    );
    res.json({ ok: true, alreadyPassed: false, newlyUnlocked: u.newlyUnlocked });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[v4/quiz-scores/record-gate-pass] failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── POST /api/v4/quiz-scores — submit a score ─────────────────────────────────
//
// Body: { quiz_type: "unit"|"level"|"stage", quiz_id: number, score: 0-100 }
//
// Upserts: on conflict (user, quiz_type, quiz_id) increments attempts,
// updates last score, promotes best_score if higher.

router.post("/v4/quiz-scores", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req)!;
  const { quiz_type, quiz_id, score } = req.body ?? {};

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!quiz_type || !VALID_TYPES.includes(String(quiz_type) as QuizType)) {
    res.status(400).json({ error: "quiz_type يجب أن يكون unit أو level أو stage" });
    return;
  }
  const qid = Number(quiz_id);
  if (!qid || !Number.isFinite(qid) || qid <= 0) {
    res.status(400).json({ error: "quiz_id غير صالح" });
    return;
  }
  const raw = Number(score);
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
    res.status(400).json({ error: "score يجب أن يكون رقماً بين 0 و 100" });
    return;
  }
  const scoreInt = Math.round(raw);
  const qtype = String(quiz_type) as QuizType;

  try {
    // ── Verify quiz exists ─────────────────────────────────────────────────
    const table = TABLE_FOR[qtype];
    const existsResult = await db.execute(
      sql.raw(`SELECT id FROM "${table}" WHERE id = ${qid} LIMIT 1`)
    );
    if (!(existsResult as any).rows.length) {
      res.status(404).json({ error: "الاختبار غير موجود" });
      return;
    }

    // ── Upsert score record ────────────────────────────────────────────────
    const result = await db.execute(sql`
      INSERT INTO v4_quiz_scores
        (user_id, quiz_type, quiz_id, score, best_score, attempts, last_attempted_at)
      VALUES
        (${userId}, ${qtype}, ${qid}, ${scoreInt}, ${scoreInt}, 1, NOW())
      ON CONFLICT (user_id, quiz_type, quiz_id) DO UPDATE SET
        score             = ${scoreInt},
        best_score        = GREATEST(v4_quiz_scores.best_score, ${scoreInt}),
        attempts          = v4_quiz_scores.attempts + 1,
        last_attempted_at = NOW()
      RETURNING *
    `);

    logger.info(
      { userId, quizType: qtype, quizId: qid, score: scoreInt },
      "[v4/quiz-scores] score submitted"
    );
    res.json({ ok: true, scoreRecord: (result as any).rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[v4/quiz-scores] POST failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── GET /api/v4/quiz-scores — my scores for a specialty ──────────────────────

router.get("/v4/quiz-scores", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req)!;
  const { specialty_slug } = req.query as Record<string, string>;
  if (!specialty_slug) {
    res.status(400).json({ error: "specialty_slug مطلوب" });
    return;
  }

  try {
    const [unitScores, levelScores, stageScores] = await Promise.all([
      db.execute(sql`
        SELECT qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
               qs.attempts, qs.last_attempted_at,
               uq.unit_code, uq.title, uq.specialty_slug
        FROM v4_quiz_scores qs
        JOIN v4_unit_quizzes uq ON uq.id = qs.quiz_id
        WHERE qs.user_id   = ${userId}
          AND qs.quiz_type = 'unit'
          AND uq.specialty_slug = ${specialty_slug}
        ORDER BY uq.unit_code
      `),
      db.execute(sql`
        SELECT qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
               qs.attempts, qs.last_attempted_at,
               lq.level_index, lq.title, lq.specialty_slug
        FROM v4_quiz_scores qs
        JOIN v4_level_quizzes lq ON lq.id = qs.quiz_id
        WHERE qs.user_id   = ${userId}
          AND qs.quiz_type = 'level'
          AND lq.specialty_slug = ${specialty_slug}
        ORDER BY lq.level_index
      `),
      db.execute(sql`
        SELECT qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
               qs.attempts, qs.last_attempted_at,
               sq.level_index, sq.stage_index, sq.title, sq.specialty_slug
        FROM v4_quiz_scores qs
        JOIN v4_stage_quizzes sq ON sq.id = qs.quiz_id
        WHERE qs.user_id   = ${userId}
          AND qs.quiz_type = 'stage'
          AND sq.specialty_slug = ${specialty_slug}
        ORDER BY sq.level_index, sq.stage_index
      `),
    ]);

    res.json({
      unitScores:  (unitScores  as any).rows,
      levelScores: (levelScores as any).rows,
      stageScores: (stageScores as any).rows,
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[v4/quiz-scores] GET failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── GET /api/v4/admin/quiz-scores — admin overview ────────────────────────────

router.get("/v4/admin/quiz-scores", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { specialty_slug, quiz_type } = req.query as Record<string, string>;

  try {
    // Build conditions safely — no string interpolation of user input into SQL
    const conditions: string[] = [];
    if (quiz_type && VALID_TYPES.includes(quiz_type as QuizType)) {
      conditions.push(`qs.quiz_type = '${quiz_type}'`);
    }
    if (specialty_slug) {
      const slug = specialty_slug.replace(/'/g, "''"); // escape single quotes
      conditions.push(`(
        (qs.quiz_type = 'unit'  AND qs.quiz_id IN (SELECT id FROM v4_unit_quizzes  WHERE specialty_slug = '${slug}'))
        OR
        (qs.quiz_type = 'level' AND qs.quiz_id IN (SELECT id FROM v4_level_quizzes WHERE specialty_slug = '${slug}'))
        OR
        (qs.quiz_type = 'stage' AND qs.quiz_id IN (SELECT id FROM v4_stage_quizzes WHERE specialty_slug = '${slug}'))
      )`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.execute(sql.raw(`
      SELECT
        qs.*,
        u.display_name AS student_name,
        u.email        AS student_email
      FROM v4_quiz_scores qs
      JOIN users u ON u.id = qs.user_id
      ${where}
      ORDER BY qs.last_attempted_at DESC
      LIMIT 500
    `));

    res.json({ scores: (result as any).rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[v4/admin/quiz-scores] GET failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

export default router;
