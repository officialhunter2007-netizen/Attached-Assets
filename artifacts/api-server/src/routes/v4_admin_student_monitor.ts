// ─────────────────────────────────────────────────────────────────────────────
// v4 Admin Student Monitor — comprehensive per-student tracking dashboard
//
//   GET /api/v4/admin/student-monitor/students   — paginated list + aggregated stats
//   GET /api/v4/admin/student-monitor/:userId    — full student detail (all activity)
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

// ── safe string escape (single-quotes only, no interpolated user input beyond this) ──
function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /v4/admin/student-monitor/students
// Paginated student list with per-student aggregated activity stats.
//
// Query params:
//   search          — name/email partial match (case-insensitive)
//   specialty_slug  — filter by enrolled specialty (in user_subject_subscriptions)
//   sub_status      — "active" | "expired" | "free"  (based on subscriptions)
//   date_from       — ISO date string, filter by last_session_at
//   date_to         — ISO date string, filter by last_session_at
//   sort_by         — "last_active"|"name"|"quiz_count"|"exam_passes"|"lab_passes"|"messages"
//   sort_dir        — "asc"|"desc"
//   page            — 1-based page number (default 1)
//   limit           — rows per page (default 30, max 100)
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/v4/admin/student-monitor/students",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const {
      search,
      specialty_slug,
      sub_status,
      date_from,
      date_to,
      sort_by = "last_active",
      sort_dir = "desc",
      page = "1",
      limit: limitStr = "30",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(limitStr) || 30));
    const offset  = (pageNum - 1) * limit;

    // ── WHERE conditions on users table ─────────────────────────────────────
    const conditions: string[] = ["u.role != 'admin'"];

    if (search) {
      const s = esc(search.slice(0, 100));
      conditions.push(`(u.email ILIKE '%${s}%' OR u.display_name ILIKE '%${s}%')`);
    }
    if (date_from) {
      const d = esc(date_from.slice(0, 30));
      conditions.push(`u.last_session_at >= '${d}'::timestamptz`);
    }
    if (date_to) {
      const d = esc(date_to.slice(0, 30));
      conditions.push(`u.last_session_at <= '${d}'::timestamptz`);
    }

    // specialty filter: user must have a subscription to that specialty
    if (specialty_slug) {
      const slug = esc(specialty_slug.slice(0, 100));
      conditions.push(`EXISTS (SELECT 1 FROM user_subject_subscriptions uss WHERE uss.user_id = u.id AND uss.subject_id = '${slug}')`);
    }

    // subscription status filter
    if (sub_status === "active") {
      conditions.push(`EXISTS (SELECT 1 FROM user_subject_subscriptions uss WHERE uss.user_id = u.id AND uss.expires_at > NOW())`);
    } else if (sub_status === "expired") {
      conditions.push(`EXISTS (SELECT 1 FROM user_subject_subscriptions uss WHERE uss.user_id = u.id AND uss.expires_at <= NOW())`);
    } else if (sub_status === "free") {
      conditions.push(`NOT EXISTS (SELECT 1 FROM user_subject_subscriptions uss WHERE uss.user_id = u.id)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // ── ORDER BY ─────────────────────────────────────────────────────────────
    const dir = sort_dir === "asc" ? "ASC" : "DESC";
    const orderMap: Record<string, string> = {
      last_active:  `u.last_session_at ${dir} NULLS LAST`,
      name:         `COALESCE(u.display_name, u.email) ${dir}`,
      quiz_count:   `quiz_count ${dir}`,
      exam_passes:  `exam_pass_count ${dir}`,
      lab_passes:   `lab_pass_count ${dir}`,
      messages:     `message_count ${dir}`,
    };
    const orderClause = orderMap[sort_by] ?? orderMap.last_active;

    try {
      const [countResult, rowsResult] = await Promise.all([
        db.execute(sql.raw(`
          SELECT COUNT(*)::int AS total
          FROM users u
          ${where}
        `)),
        db.execute(sql.raw(`
          SELECT
            u.id,
            u.email,
            COALESCE(u.display_name, u.email) AS display_name,
            u.created_at,
            u.last_session_at,
            u.last_active,
            u.streak_days,
            u.points,
            u.role,
            u.profile_image,
            u.nukhba_plan,
            -- Subscription summary
            (SELECT COUNT(*)::int FROM user_subject_subscriptions uss WHERE uss.user_id = u.id) AS sub_count,
            (SELECT COUNT(*)::int FROM user_subject_subscriptions uss WHERE uss.user_id = u.id AND uss.expires_at > NOW()) AS active_sub_count,
            (SELECT COALESCE(json_agg(json_build_object('subject_id', uss.subject_id, 'subject_name', COALESCE(uss.subject_name, uss.subject_id), 'expires_at', uss.expires_at, 'active', uss.expires_at > NOW())), '[]'::json)
              FROM user_subject_subscriptions uss WHERE uss.user_id = u.id) AS subscriptions,
            -- Quiz stats
            (SELECT COUNT(*)::int FROM v4_quiz_scores qs WHERE qs.user_id = u.id) AS quiz_count,
            (SELECT COALESCE(AVG(qs.best_score), 0)::int FROM v4_quiz_scores qs WHERE qs.user_id = u.id) AS quiz_avg_best,
            -- Exam stats
            (SELECT COUNT(*)::int FROM v4_exam_attempts ea WHERE ea.user_id = u.id) AS exam_count,
            (SELECT COUNT(*)::int FROM v4_exam_attempts ea WHERE ea.user_id = u.id AND ea.passed = true) AS exam_pass_count,
            -- Lab stats
            (SELECT COUNT(*)::int FROM v4_lab_completions lc WHERE lc.user_id = u.id) AS lab_count,
            (SELECT COUNT(*)::int FROM v4_lab_completions lc WHERE lc.user_id = u.id AND lc.passed = true) AS lab_pass_count,
            -- AI message stats
            (SELECT COUNT(*)::int FROM ai_teacher_messages atm WHERE atm.user_id = u.id) AS message_count,
            (SELECT COUNT(*)::int FROM ai_teacher_messages atm WHERE atm.user_id = u.id AND atm.role = 'user') AS student_message_count,
            -- Last AI message date
            (SELECT MAX(atm.created_at) FROM ai_teacher_messages atm WHERE atm.user_id = u.id) AS last_message_at,
            -- Active path count
            (SELECT COUNT(*)::int FROM v4_student_paths sp WHERE sp.user_id = u.id) AS path_count
          FROM users u
          ${where}
          ORDER BY ${orderClause}
          LIMIT ${limit} OFFSET ${offset}
        `)),
      ]);

      const total = (countResult as any).rows[0]?.total ?? 0;
      const students = (rowsResult as any).rows;

      res.json({
        students,
        pagination: {
          total,
          page: pageNum,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      logger.error({ err: err?.message }, "[student-monitor] GET /students failed");
      res.status(500).json({ error: err?.message ?? "db error" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /v4/admin/student-monitor/:userId
// Full student detail — all activity data for a single student.
//
// Returns:
//   user            — full user record
//   subscriptions   — all subject subscriptions
//   paths           — all v4 learning paths (current lesson, unlocked count, stars)
//   quizScores      — all quiz scores with quiz titles
//   examAttempts    — last 200 exam attempts
//   labCompletions  — all lab completions
//   recentMessages  — last 200 AI teacher messages (user + assistant turns)
//   recentActivity  — last 200 activity events
//   masteryStats    — mastery score distribution per specialty
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/v4/admin/student-monitor/:userId",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const userId = parseInt(req.params.userId);
    if (!userId || !Number.isFinite(userId)) {
      res.status(400).json({ error: "userId غير صالح" });
      return;
    }

    try {
      const [
        userResult,
        subsResult,
        pathsResult,
        unitQuizResult,
        levelQuizResult,
        stageQuizResult,
        examResult,
        labResult,
        messagesResult,
        activityResult,
        masteryResult,
      ] = await Promise.all([
        // ── User info ────────────────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            u.id, u.email, COALESCE(u.display_name, u.email) AS display_name,
            u.created_at, u.last_session_at, u.last_active,
            u.streak_days, u.points, u.role, u.profile_image,
            u.nukhba_plan, u.region, u.gems_balance,
            u.messages_used, u.onboarding_done, u.first_lesson_complete,
            u.subscription_expires_at
          FROM users u WHERE u.id = ${userId} LIMIT 1
        `)),

        // ── Subject subscriptions ─────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            uss.id, uss.subject_id,
            COALESCE(uss.subject_name, uss.subject_id) AS subject_name,
            uss.plan, uss.expires_at, uss.created_at,
            uss.messages_used, uss.messages_limit,
            uss.gems_balance, uss.paid_price_yer, uss.region,
            (uss.expires_at > NOW()) AS is_active
          FROM user_subject_subscriptions uss
          WHERE uss.user_id = ${userId}
          ORDER BY uss.created_at DESC
        `)),

        // ── Learning paths ────────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            sp.id, sp.subject_id, sp.path_type, sp.start_mode,
            sp.starting_level_index, sp.current_lesson_code,
            jsonb_array_length(sp.unlocked_lesson_codes) AS unlocked_count,
            sp.lesson_stars, sp.placement_unit_code,
            sp.created_at, sp.updated_at
          FROM v4_student_paths sp
          WHERE sp.user_id = ${userId}
          ORDER BY sp.updated_at DESC
        `)),

        // ── Unit quiz scores ───────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
            qs.attempts, qs.last_attempted_at,
            uq.title, uq.unit_code, uq.specialty_slug
          FROM v4_quiz_scores qs
          JOIN v4_unit_quizzes uq ON uq.id = qs.quiz_id
          WHERE qs.user_id = ${userId} AND qs.quiz_type = 'unit'
          ORDER BY qs.last_attempted_at DESC
        `)),

        // ── Level quiz scores ──────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
            qs.attempts, qs.last_attempted_at,
            lq.title, lq.level_index, lq.specialty_slug
          FROM v4_quiz_scores qs
          JOIN v4_level_quizzes lq ON lq.id = qs.quiz_id
          WHERE qs.user_id = ${userId} AND qs.quiz_type = 'level'
          ORDER BY qs.last_attempted_at DESC
        `)),

        // ── Stage quiz scores ──────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            qs.id, qs.quiz_type, qs.quiz_id, qs.score, qs.best_score,
            qs.attempts, qs.last_attempted_at,
            sq.title, sq.level_index, sq.stage_index, sq.specialty_slug
          FROM v4_quiz_scores qs
          JOIN v4_stage_quizzes sq ON sq.id = qs.quiz_id
          WHERE qs.user_id = ${userId} AND qs.quiz_type = 'stage'
          ORDER BY qs.last_attempted_at DESC
        `)),

        // ── Exam attempts ─────────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            ea.id, ea.subject_id, ea.scope, ea.exam_code, ea.scope_ref_id,
            ea.variant_index, ea.score, ea.passed, ea.gems_deducted, ea.attempted_at
          FROM v4_exam_attempts ea
          WHERE ea.user_id = ${userId}
          ORDER BY ea.attempted_at DESC
          LIMIT 200
        `)),

        // ── Lab completions ───────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            lc.id, lc.subject_id, lc.lab_id, lc.score, lc.passed,
            lc.attempts, lc.completed_at,
            ls.code AS lab_code, ls.title AS lab_title
          FROM v4_lab_completions lc
          LEFT JOIN v4_lab_scenarios ls ON ls.id = lc.lab_id
          WHERE lc.user_id = ${userId}
          ORDER BY lc.completed_at DESC
        `)),

        // ── Recent AI messages ─────────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            atm.id, atm.role, atm.subject_id,
            COALESCE(atm.subject_name, atm.subject_id) AS subject_name,
            LEFT(atm.content, 600) AS content_preview,
            atm.is_diagnostic, atm.stage_index, atm.word_count,
            atm.created_at
          FROM ai_teacher_messages atm
          WHERE atm.user_id = ${userId}
          ORDER BY atm.created_at DESC
          LIMIT 200
        `)),

        // ── Recent activity events ────────────────────────────────────────
        db.execute(sql.raw(`
          SELECT
            ae.id, ae.event_type, ae.path, ae.label, ae.detail, ae.created_at
          FROM activity_events ae
          WHERE ae.user_id = ${userId}
          ORDER BY ae.created_at DESC
          LIMIT 200
        `)),

        // ── Concept mastery stats ─────────────────────────────────────────
        // Join chain: concept_mastery → lessons (version_id) → student_paths (version_id)
        // to resolve the specialty slug without going through specialties table.
        db.execute(sql.raw(`
          SELECT
            sp.subject_id,
            COUNT(*)::int AS concept_count,
            ROUND(AVG(cm.score))::int AS avg_mastery,
            COUNT(CASE WHEN cm.score >= 80 THEN 1 END)::int AS mastered_count,
            COUNT(CASE WHEN cm.score < 60 THEN 1 END)::int AS weak_count,
            MAX(cm.updated_at) AS last_updated_at
          FROM v4_concept_mastery cm
          JOIN v4_lessons vl ON vl.id = cm.lesson_id
          JOIN v4_student_paths sp ON sp.user_id = ${userId} AND sp.version_id = vl.version_id
          WHERE cm.user_id = ${userId}
          GROUP BY sp.subject_id
          ORDER BY avg_mastery DESC
        `)),
      ]);

      const user = (userResult as any).rows[0];
      if (!user) {
        res.status(404).json({ error: "الطالب غير موجود" });
        return;
      }

      // Combine quiz scores into one array
      const quizScores = [
        ...(unitQuizResult as any).rows.map((r: any) => ({ ...r, quiz_type: "unit" })),
        ...(levelQuizResult as any).rows.map((r: any) => ({ ...r, quiz_type: "level" })),
        ...(stageQuizResult as any).rows.map((r: any) => ({ ...r, quiz_type: "stage" })),
      ].sort((a, b) => new Date(b.last_attempted_at).getTime() - new Date(a.last_attempted_at).getTime());

      res.json({
        user,
        subscriptions:   (subsResult     as any).rows,
        paths:           (pathsResult    as any).rows,
        quizScores,
        examAttempts:    (examResult     as any).rows,
        labCompletions:  (labResult      as any).rows,
        recentMessages:  (messagesResult as any).rows,
        recentActivity:  (activityResult as any).rows,
        masteryStats:    (masteryResult  as any).rows,
      });
    } catch (err: any) {
      logger.error({ err: err?.message, userId }, "[student-monitor] GET /:userId failed");
      res.status(500).json({ error: err?.message ?? "db error" });
    }
  }
);

export default router;
