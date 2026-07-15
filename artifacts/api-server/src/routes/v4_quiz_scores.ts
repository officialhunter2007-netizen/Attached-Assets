// ─────────────────────────────────────────────────────────────────────────────
// v4 Quiz Scores — submit + retrieve student scores on HTML self-grading quizzes
//
//   POST /api/v4/quiz-scores                   — submit score (auth)
//   GET  /api/v4/quiz-scores                   — my scores for a specialty (auth)
//   GET  /api/v4/admin/quiz-scores             — admin: all scores (admin)
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

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
