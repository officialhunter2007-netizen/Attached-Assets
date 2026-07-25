// ─────────────────────────────────────────────────────────────────────────────
// v4 Stage Quizzes (اختبارات المرحلة) — admin CRUD + student HTML view + AI generate
//
//   GET    /api/v4/admin/stage-quizzes          — list all (admin)
//   POST   /api/v4/admin/stage-quizzes          — create / upsert (admin)
//   PUT    /api/v4/admin/stage-quizzes/:id      — update (admin)
//   DELETE /api/v4/admin/stage-quizzes/:id      — delete (admin)
//   GET    /api/v4/stage-quizzes/:id/view       — serve raw HTML (auth)
//   GET    /api/v4/stage-quizzes                — list for a specialty (auth)
//   POST   /api/v4/stage-quizzes/generate       — AI auto-generate & cache (auth)
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { injectQuizBridge } from "../lib/quiz-bridge";
import { validateQuizHtml } from "../lib/validate-quiz-html";
import {
  extractStageContent,
  generateStageQuizHtml,
  GenerateGeminiError,
} from "../lib/quiz-html-gen";

const router: IRouter = Router();

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

router.get("/v4/admin/stage-quizzes", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql.raw(
      `SELECT id, specialty_slug, level_index, stage_index, title, created_at, updated_at
       FROM v4_stage_quizzes
       ORDER BY specialty_slug, level_index, stage_index`
    ));
    res.json({ quizzes: rows.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: create / upsert ────────────────────────────────────────────────────

router.post("/v4/admin/stage-quizzes", requireAdmin, async (req, res): Promise<void> => {
  const { specialty_slug, level_index, stage_index, title, html_content } = req.body ?? {};
  if (!specialty_slug || level_index == null || stage_index == null || !html_content) {
    res.status(400).json({ error: "specialty_slug و level_index و stage_index و html_content مطلوبة" });
    return;
  }
  const li = Number(level_index), si = Number(stage_index);
  if (!Number.isInteger(li) || li < 1 || !Number.isInteger(si) || si < 1) {
    res.status(400).json({ error: "level_index و stage_index يجب أن يكونا أعداداً صحيحة موجبة" });
    return;
  }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`INSERT INTO v4_stage_quizzes (specialty_slug, level_index, stage_index, title, html_content)
          VALUES (${String(specialty_slug).trim()}, ${li}, ${si}, ${String(title ?? "").trim()}, ${String(html_content)})
          ON CONFLICT (specialty_slug, level_index, stage_index)
          DO UPDATE SET title        = EXCLUDED.title,
                        html_content = EXCLUDED.html_content,
                        updated_at   = NOW()
          RETURNING id, specialty_slug, level_index, stage_index, title, created_at, updated_at`
    );
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: create failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: update ─────────────────────────────────────────────────────────────

router.put("/v4/admin/stage-quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { specialty_slug, level_index, stage_index, title, html_content } = req.body ?? {};
  if (!id || !specialty_slug || level_index == null || stage_index == null || !html_content) {
    res.status(400).json({ error: "جميع الحقول مطلوبة" });
    return;
  }
  if (!Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  const li = Number(level_index), si = Number(stage_index);
  if (!Number.isInteger(li) || li < 1 || !Number.isInteger(si) || si < 1) {
    res.status(400).json({ error: "level_index و stage_index يجب أن يكونا أعداداً صحيحة موجبة" });
    return;
  }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`UPDATE v4_stage_quizzes
          SET specialty_slug = ${String(specialty_slug).trim()},
              level_index    = ${li},
              stage_index    = ${si},
              title          = ${String(title ?? "").trim()},
              html_content   = ${String(html_content)},
              updated_at     = NOW()
          WHERE id = ${id}
          RETURNING id, specialty_slug, level_index, stage_index, title, created_at, updated_at`
    );
    if (!result.rows.length) { res.status(404).json({ error: "not found" }); return; }
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: update failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: delete ─────────────────────────────────────────────────────────────

router.delete("/v4/admin/stage-quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || !Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  try {
    await db.execute(sql`DELETE FROM v4_stage_quizzes WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: delete failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── student: view quiz HTML ───────────────────────────────────────────────────

router.get("/v4/stage-quizzes/:id/view", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const result = await db.execute(
      sql`SELECT html_content FROM v4_stage_quizzes WHERE id = ${id}`
    );
    if (!result.rows.length) {
      res.status(404).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>الاختبار غير موجود</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(injectQuizBridge(result.rows[0].html_content as string, id, "stage"));
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: view failed");
    res.status(500).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>خطأ في الخادم</h1>");
  }
});

// ── student: list quizzes for a specialty ─────────────────────────────────────

router.get("/v4/stage-quizzes", requireAuth, async (req, res): Promise<void> => {
  const { specialty_slug } = req.query as Record<string, string>;
  if (!specialty_slug) { res.status(400).json({ error: "specialty_slug مطلوب" }); return; }
  try {
    const result = await db.execute(
      sql`SELECT id, specialty_slug, level_index, stage_index, title, updated_at
          FROM v4_stage_quizzes
          WHERE specialty_slug = ${specialty_slug}
          ORDER BY level_index, stage_index`
    );
    res.json({ quizzes: result.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quizzes: student list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── AI auto-generate ──────────────────────────────────────────────────────────
// Idempotent: returns cached quiz if one already exists for this stage.

router.post("/v4/stage-quizzes/generate", requireAuth, async (req, res): Promise<void> => {
  const { specialtySlug, levelIndex, stageIndex } = req.body as {
    specialtySlug?: string;
    levelIndex?: number;
    stageIndex?: number;
  };
  if (!specialtySlug || levelIndex == null || stageIndex == null) {
    res.status(400).json({ error: "specialtySlug و levelIndex و stageIndex مطلوبة" });
    return;
  }
  const li = Number(levelIndex);
  const si = Number(stageIndex);

  // 1. Return cached quiz immediately
  try {
    const cached = await db.execute(
      sql`SELECT id FROM v4_stage_quizzes
          WHERE specialty_slug = ${specialtySlug}
            AND level_index    = ${li}
            AND stage_index    = ${si}`
    );
    if (cached.rows.length > 0) {
      res.json({ quizId: Number(cached.rows[0].id), cached: true });
      return;
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quiz generate: cache check failed");
    res.status(500).json({ error: "خطأ في قاعدة البيانات" });
    return;
  }

  // 2. Extract stage content
  let stageContent: Awaited<ReturnType<typeof extractStageContent>>;
  try {
    stageContent = await extractStageContent(specialtySlug, li, si);
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quiz generate: content extraction failed");
    res.status(500).json({ error: "خطأ في استخراج محتوى المرحلة" });
    return;
  }
  if (!stageContent) {
    res.status(404).json({ error: "المرحلة غير موجودة أو لا يوجد منهج منشور لهذا التخصص" });
    return;
  }

  // 3. Generate via AI (validates internally; throws on failure)
  let htmlContent: string;
  try {
    htmlContent = await generateStageQuizHtml(stageContent);
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quiz generate: AI failed");
    if (err instanceof GenerateGeminiError && err.creditsExhausted) {
      res.status(503).json({ error: "خدمة الذكاء الاصطناعي متوقفة مؤقتاً، يرجى المحاولة لاحقاً" });
    } else {
      res.status(500).json({ error: "فشل توليد الاختبار، يرجى المحاولة مرة أخرى" });
    }
    return;
  }

  // 4. Save (upsert — race-safe)
  try {
    const title = `${stageContent.name} — اختبار المرحلة`;
    const result = await db.execute(
      sql`INSERT INTO v4_stage_quizzes (specialty_slug, level_index, stage_index, title, html_content)
          VALUES (${specialtySlug}, ${li}, ${si}, ${title}, ${htmlContent})
          ON CONFLICT (specialty_slug, level_index, stage_index)
          DO UPDATE SET html_content = EXCLUDED.html_content,
                        title        = EXCLUDED.title,
                        updated_at   = NOW()
          RETURNING id`
    );
    res.json({ quizId: Number(result.rows[0].id), cached: false });
  } catch (err: any) {
    logger.error({ err: err?.message }, "stage-quiz generate: save failed");
    res.status(500).json({ error: "خطأ في حفظ الاختبار" });
  }
});

export default router;
