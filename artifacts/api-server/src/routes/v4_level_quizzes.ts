// ─────────────────────────────────────────────────────────────────────────────
// v4 Level Quizzes — admin CRUD + student HTML view
//
//   GET    /api/v4/admin/level-quizzes          — list all (admin)
//   POST   /api/v4/admin/level-quizzes          — create / upsert (admin)
//   PUT    /api/v4/admin/level-quizzes/:id      — update (admin)
//   DELETE /api/v4/admin/level-quizzes/:id      — delete (admin)
//   GET    /api/v4/level-quizzes/:id/view       — serve raw HTML (auth)
//   GET    /api/v4/level-quizzes                — list for a specialty (auth)
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { injectQuizBridge } from "../lib/quiz-bridge";
import { validateQuizHtml } from "../lib/validate-quiz-html";

const router: IRouter = Router();

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

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getUserId(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── admin: list ───────────────────────────────────────────────────────────────

router.get("/v4/admin/level-quizzes", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql.raw(
      `SELECT id, specialty_slug, level_index, title, created_at, updated_at
       FROM v4_level_quizzes
       ORDER BY specialty_slug, level_index`
    ));
    res.json({ quizzes: rows.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: create / upsert ────────────────────────────────────────────────────

router.post("/v4/admin/level-quizzes", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { specialty_slug, level_index, title, html_content } = req.body ?? {};
  if (!specialty_slug || level_index === undefined || level_index === null || !html_content) {
    res.status(400).json({ error: "specialty_slug و level_index و html_content مطلوبة" });
    return;
  }
  const li = Number(level_index);
  if (!Number.isInteger(li) || li < 1) {
    res.status(400).json({ error: "level_index يجب أن يكون رقماً صحيحاً موجباً" });
    return;
  }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`INSERT INTO v4_level_quizzes (specialty_slug, level_index, title, html_content)
          VALUES (${String(specialty_slug).trim()}, ${li}, ${String(title ?? "").trim()}, ${String(html_content)})
          ON CONFLICT (specialty_slug, level_index)
          DO UPDATE SET title        = EXCLUDED.title,
                        html_content = EXCLUDED.html_content,
                        updated_at   = NOW()
          RETURNING id, specialty_slug, level_index, title, created_at, updated_at`
    );
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: create failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: update ─────────────────────────────────────────────────────────────

router.put("/v4/admin/level-quizzes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { specialty_slug, level_index, title, html_content } = req.body ?? {};
  if (!id || !specialty_slug || level_index === undefined || !html_content) {
    res.status(400).json({ error: "specialty_slug و level_index و html_content مطلوبة" });
    return;
  }
  if (!Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  const li = Number(level_index);
  if (!Number.isInteger(li) || li < 1) {
    res.status(400).json({ error: "level_index يجب أن يكون رقماً صحيحاً موجباً" });
    return;
  }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`UPDATE v4_level_quizzes
          SET specialty_slug = ${String(specialty_slug).trim()},
              level_index    = ${li},
              title          = ${String(title ?? "").trim()},
              html_content   = ${String(html_content)},
              updated_at     = NOW()
          WHERE id = ${id}
          RETURNING id, specialty_slug, level_index, title, created_at, updated_at`
    );
    if (!result.rows.length) { res.status(404).json({ error: "not found" }); return; }
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: update failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: delete ─────────────────────────────────────────────────────────────

router.delete("/v4/admin/level-quizzes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || !Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  try {
    await db.execute(sql`DELETE FROM v4_level_quizzes WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: delete failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── student: view quiz HTML ───────────────────────────────────────────────────

router.get("/v4/level-quizzes/:id/view", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const result = await db.execute(
      sql`SELECT html_content FROM v4_level_quizzes WHERE id = ${id}`
    );
    if (!result.rows.length) {
      res.status(404).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>الاختبار غير موجود</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(injectQuizBridge(result.rows[0].html_content as string, id, "level"));
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: view failed");
    res.status(500).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>خطأ في الخادم</h1>");
  }
});

// ── student: list quizzes for a specialty ─────────────────────────────────────

router.get("/v4/level-quizzes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { specialty_slug } = req.query as Record<string, string>;
  if (!specialty_slug) { res.status(400).json({ error: "specialty_slug مطلوب" }); return; }
  try {
    const result = await db.execute(
      sql`SELECT id, specialty_slug, level_index, title, updated_at
          FROM v4_level_quizzes
          WHERE specialty_slug = ${specialty_slug}
          ORDER BY level_index`
    );
    res.json({ quizzes: result.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "level-quizzes: student list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

export default router;
