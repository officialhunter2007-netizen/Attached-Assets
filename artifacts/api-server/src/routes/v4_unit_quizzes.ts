// ─────────────────────────────────────────────────────────────────────────────
// v4 Unit Quizzes — admin CRUD + student HTML view + AI auto-generation
//
//   GET    /api/v4/admin/unit-quizzes          — list all (admin)
//   POST   /api/v4/admin/unit-quizzes          — create / upsert (admin)
//   PUT    /api/v4/admin/unit-quizzes/:id      — update (admin)
//   DELETE /api/v4/admin/unit-quizzes/:id      — delete (admin)
//   GET    /api/v4/unit-quizzes/:id/view       — serve raw HTML (auth)
//   GET    /api/v4/unit-quizzes                — list for a specialty/unit (auth)
//   POST   /api/v4/unit-quizzes/generate       — AI auto-generate & cache (auth)
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { injectQuizBridge } from "../lib/quiz-bridge";
import { dedupeInflight, HttpError } from "../lib/inflight";
import { chargeV4Ai } from "../lib/v4-gem-wallet";

// Flat gem cost per quiz generation (charged only on cache-miss, once globally).
const QUIZ_GEN_COST_USD = 0.020; // 20 gems (1 USD = 1000 gems)
import { validateQuizHtml } from "../lib/validate-quiz-html";
import {
  extractUnitContent,
  generateUnitQuizHtml,
  GenerateGeminiError,
} from "../lib/quiz-html-gen";

const router: IRouter = Router();

// ── auth helpers ─────────────────────────────────────────────────────────────

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

router.get("/v4/admin/unit-quizzes", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql.raw(
      `SELECT id, unit_code, specialty_slug, title, created_at, updated_at
       FROM v4_unit_quizzes
       ORDER BY specialty_slug, unit_code`
    ));
    res.json({ quizzes: rows.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: create / upsert ────────────────────────────────────────────────────

router.post("/v4/admin/unit-quizzes", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { unit_code, specialty_slug, title, html_content } = req.body ?? {};
  if (!unit_code || !specialty_slug || !html_content) {
    res.status(400).json({ error: "unit_code, specialty_slug و html_content مطلوبة" });
    return;
  }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`INSERT INTO v4_unit_quizzes (unit_code, specialty_slug, title, html_content)
          VALUES (${String(unit_code).trim()}, ${String(specialty_slug).trim()}, ${String(title ?? "").trim()}, ${String(html_content)})
          ON CONFLICT (unit_code, specialty_slug)
          DO UPDATE SET title        = EXCLUDED.title,
                        html_content = EXCLUDED.html_content,
                        updated_at   = NOW()
          RETURNING id, unit_code, specialty_slug, title, created_at, updated_at`
    );
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: create failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: update ─────────────────────────────────────────────────────────────

router.put("/v4/admin/unit-quizzes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { unit_code, specialty_slug, title, html_content } = req.body ?? {};
  if (!id || !unit_code || !specialty_slug || !html_content) {
    res.status(400).json({ error: "unit_code, specialty_slug و html_content مطلوبة" });
    return;
  }
  if (!Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  const htmlCheck = validateQuizHtml(html_content);
  if (!htmlCheck.valid) { res.status(422).json({ error: htmlCheck.error }); return; }
  try {
    const result = await db.execute(
      sql`UPDATE v4_unit_quizzes
          SET unit_code      = ${String(unit_code).trim()},
              specialty_slug = ${String(specialty_slug).trim()},
              title          = ${String(title ?? "").trim()},
              html_content   = ${String(html_content)},
              updated_at     = NOW()
          WHERE id = ${id}
          RETURNING id, unit_code, specialty_slug, title, created_at, updated_at`
    );
    if (!result.rows.length) { res.status(404).json({ error: "not found" }); return; }
    res.json({ quiz: result.rows[0] });
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: update failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── admin: delete ─────────────────────────────────────────────────────────────

router.delete("/v4/admin/unit-quizzes/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id || !Number.isFinite(id)) { res.status(400).json({ error: "id غير صالح" }); return; }
  try {
    await db.execute(sql`DELETE FROM v4_unit_quizzes WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: delete failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── student: view quiz HTML ───────────────────────────────────────────────────

router.get("/v4/unit-quizzes/:id/view", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  try {
    const result = await db.execute(
      sql`SELECT html_content FROM v4_unit_quizzes WHERE id = ${id}`
    );
    if (!result.rows.length) {
      res.status(404).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>الاختبار غير موجود</h1>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.send(injectQuizBridge(result.rows[0].html_content as string, id, "unit"));
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: view failed");
    res.status(500).send("<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;color:#e55'>خطأ في الخادم</h1>");
  }
});

// ── student: list quizzes for a specialty (optional unit filter) ──────────────

router.get("/v4/unit-quizzes", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { specialty_slug, unit_code } = req.query as Record<string, string>;
  if (!specialty_slug) { res.status(400).json({ error: "specialty_slug مطلوب" }); return; }
  try {
    const result = unit_code
      ? await db.execute(
          sql`SELECT id, unit_code, specialty_slug, title, updated_at
              FROM v4_unit_quizzes
              WHERE specialty_slug = ${specialty_slug} AND unit_code = ${unit_code}
              ORDER BY unit_code`
        )
      : await db.execute(
          sql`SELECT id, unit_code, specialty_slug, title, updated_at
              FROM v4_unit_quizzes
              WHERE specialty_slug = ${specialty_slug}
              ORDER BY unit_code`
        );
    res.json({ quizzes: result.rows });
  } catch (err: any) {
    logger.error({ err: err?.message }, "unit-quizzes: student list failed");
    res.status(500).json({ error: err?.message ?? "db error" });
  }
});

// ── AI auto-generate ──────────────────────────────────────────────────────────
// Idempotent: returns cached quiz if one already exists for this unit+specialty.
// In-flight deduped: concurrent students for the same unit share ONE AI call.

router.post("/v4/unit-quizzes/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req)!;
  const { specialtySlug, unitCode } = req.body as { specialtySlug?: string; unitCode?: string };
  if (!specialtySlug || !unitCode) {
    res.status(400).json({ error: "specialtySlug و unitCode مطلوبان" });
    return;
  }

  try {
    const outcome = await dedupeInflight(
      `unit-quiz:${specialtySlug}:${unitCode}`,
      async (): Promise<{ quizId: number; cached: boolean }> => {
        // 1. Cached quiz → return immediately (no charge — globally shared)
        const cached = await db.execute(
          sql`SELECT id FROM v4_unit_quizzes
              WHERE specialty_slug = ${specialtySlug} AND unit_code = ${unitCode}`
        );
        if (cached.rows.length > 0) {
          return { quizId: Number(cached.rows[0].id), cached: true };
        }

        // 2. Charge 20 gems flat before AI generation (cache-miss path only)
        const charge = await chargeV4Ai({
          requestId: `quiz-gen:unit:${specialtySlug}:${unitCode}:${userId}`,
          userId,
          subjectId: specialtySlug,
          costUsd: QUIZ_GEN_COST_USD,
          source: "v4_ai_quiz",
        });
        if (charge.error) {
          throw new HttpError(503, "رصيدك من الجواهر غير كافٍ لتوليد الاختبار");
        }

        // 3. Extract unit content
        const unitContent = await extractUnitContent(specialtySlug, unitCode).catch((err: any) => {
          logger.error({ err: err?.message }, "unit-quiz generate: content extraction failed");
          throw new HttpError(500, "خطأ في استخراج محتوى الوحدة");
        });
        if (!unitContent) {
          throw new HttpError(404, "الوحدة غير موجودة أو لا يوجد منهج منشور لهذا التخصص");
        }

        // 4. Generate via AI (validates internally; throws on failure)
        const htmlContent = await generateUnitQuizHtml(unitContent, unitCode, specialtySlug);

        // 5. Save (upsert — race-safe)
        const title = `${unitContent.name} — اختبار الوحدة`;
        const result = await db.execute(
          sql`INSERT INTO v4_unit_quizzes (unit_code, specialty_slug, title, html_content)
              VALUES (${unitCode}, ${specialtySlug}, ${title}, ${htmlContent})
              ON CONFLICT (unit_code, specialty_slug)
              DO UPDATE SET html_content = EXCLUDED.html_content,
                            title        = EXCLUDED.title,
                            updated_at   = NOW()
              RETURNING id`
        );
        return { quizId: Number(result.rows[0].id), cached: false };
      }
    );
    res.json(outcome);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    logger.error({ err: err?.message }, "unit-quiz generate: failed");
    if (err instanceof GenerateGeminiError && err.creditsExhausted) {
      res.status(503).json({ error: "خدمة الذكاء الاصطناعي متوقفة مؤقتاً، يرجى المحاولة لاحقاً" });
    } else {
      res.status(500).json({ error: "فشل توليد الاختبار، يرجى المحاولة مرة أخرى" });
    }
  }
});

export default router;
