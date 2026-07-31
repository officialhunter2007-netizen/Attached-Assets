// ─────────────────────────────────────────────────────────────────────────────
// Story routes — admin management + student reading
//
// Stories are self-contained HTML pages attached to curriculum units. The full
// HTML (including <style> and inline <script>) is stored as text in the DB.
// They persist across instruction-file version republishes (tied to
// specialty_id + unit_code, not to a specific version).
//
// Admin routes (require admin session + CSRF header):
//   GET  /admin/v4/stories?specialtyId=&unitCode=   — list stories for a unit
//   POST /admin/v4/stories                          — create story
//   PATCH /admin/v4/stories/:id/order               — update sort_order
//   DELETE /admin/v4/stories/:id                    — delete story
//
// Student routes (require valid session):
//   GET  /v4/stories?slug=    — all stories grouped by unit_code for specialty
//   GET  /v4/stories/:id      — full HTML of a single story
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireSameOriginCsrf } from "../lib/csrf";
import { logger } from "../lib/logger";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function isAdmin(userId: number | null): Promise<boolean> {
  if (!userId) return false;
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

function requireUser(req: any, res: any, next: any) {
  if (!getUserId(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

async function requireAdminMw(req: any, res: any, next: any) {
  if (!(await isAdmin(getUserId(req)))) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

const router = Router();

// ── GET /admin/v4/stories?specialtyId=&unitCode= ──────────────────────────────
router.get("/admin/v4/stories", requireUser, requireAdminMw, async (req: any, res: any): Promise<any> => {
  const { specialtyId, unitCode } = req.query as Record<string, string>;
  if (!specialtyId) return res.status(400).json({ error: "specialtyId required" });

  let whereClause = sql`specialty_id = ${specialtyId}`;
  if (unitCode) whereClause = sql`specialty_id = ${specialtyId} AND unit_code = ${unitCode}`;

  try {
    const result = await db.execute(sql`
      SELECT id, specialty_id, unit_code, title, sort_order, created_at,
             length(html_content) AS html_size
      FROM v4_unit_stories
      WHERE ${whereClause}
      ORDER BY unit_code, sort_order, created_at
    `);
    return res.json(result.rows);
  } catch (err: any) {
    logger.error("stories list error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── POST /admin/v4/stories ────────────────────────────────────────────────────
router.post("/admin/v4/stories", requireUser, requireAdminMw, requireSameOriginCsrf, async (req: any, res: any): Promise<any> => {
  const { specialtyId, unitCode, title, htmlContent, sortOrder } = req.body as {
    specialtyId: string;
    unitCode: string;
    title: string;
    htmlContent: string;
    sortOrder?: number;
  };

  if (!specialtyId?.trim()) return res.status(400).json({ error: "specialtyId required" });
  if (!unitCode?.trim()) return res.status(400).json({ error: "unitCode required" });
  if (!title?.trim()) return res.status(400).json({ error: "title required" });
  if (!htmlContent?.trim()) return res.status(400).json({ error: "htmlContent required" });

  const order = sortOrder ?? 0;

  try {
    const result = await db.execute(sql`
      INSERT INTO v4_unit_stories (specialty_id, unit_code, title, html_content, sort_order)
      VALUES (${specialtyId}, ${unitCode}, ${title.trim()}, ${htmlContent}, ${order})
      RETURNING id, specialty_id, unit_code, title, sort_order, created_at,
                length(html_content) AS html_size
    `);
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    logger.error("story create error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── PATCH /admin/v4/stories/:id ───────────────────────────────────────────────
// Update title and/or sort_order (not html_content — use delete+recreate for that)
router.patch("/admin/v4/stories/:id/order", requireUser, requireAdminMw, requireSameOriginCsrf, async (req: any, res: any): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { sortOrder } = req.body as { sortOrder: number };
  if (sortOrder === undefined || sortOrder === null) return res.status(400).json({ error: "sortOrder required" });

  try {
    await db.execute(sql`UPDATE v4_unit_stories SET sort_order = ${sortOrder} WHERE id = ${id}`);
    return res.json({ ok: true });
  } catch (err: any) {
    logger.error("story order update error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── PUT /admin/v4/stories/:id ─────────────────────────────────────────────────
// Update title, html_content, and/or sort_order of an existing story.
router.put("/admin/v4/stories/:id", requireUser, requireAdminMw, requireSameOriginCsrf, async (req: any, res: any): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { title, htmlContent, sortOrder } = req.body as {
    title?: string;
    htmlContent?: string;
    sortOrder?: number;
  };

  if (title !== undefined && !title.trim()) return res.status(400).json({ error: "title cannot be empty" });
  if (htmlContent !== undefined && !htmlContent.trim()) return res.status(400).json({ error: "htmlContent cannot be empty" });

  try {
    const result = await db.execute(sql`
      UPDATE v4_unit_stories SET
        title        = COALESCE(${title?.trim() ?? null}, title),
        html_content = COALESCE(${htmlContent ?? null}, html_content),
        sort_order   = COALESCE(${sortOrder ?? null}, sort_order)
      WHERE id = ${id}
      RETURNING id, specialty_id, unit_code, title, sort_order, created_at,
                length(html_content) AS html_size
    `);
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    return res.json(result.rows[0]);
  } catch (err: any) {
    logger.error("story update error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── DELETE /admin/v4/stories/:id ─────────────────────────────────────────────
router.delete("/admin/v4/stories/:id", requireUser, requireAdminMw, requireSameOriginCsrf, async (req: any, res: any): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await db.execute(sql`DELETE FROM v4_unit_stories WHERE id = ${id}`);
    return res.json({ ok: true });
  } catch (err: any) {
    logger.error("story delete error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── GET /v4/stories?slug= ─────────────────────────────────────────────────────
// Returns all stories for a specialty, grouped by unit_code. Does NOT include
// html_content (too large) — use the single-story endpoint to get the HTML.
router.get("/v4/stories", requireUser, async (req: any, res: any): Promise<any> => {
  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ error: "slug required" });

  try {
    // specialty_id is stored as the slug string (e.g. "uni-it") since the admin
    // component uses curriculum subject IDs which are slugs. Accept both the slug
    // and the integer id (cast to text) so old/future rows still match.
    const specResult = await db.execute(sql`
      SELECT id FROM v4_specialties WHERE slug = ${slug} LIMIT 1
    `);
    const spec = specResult.rows[0] as any;

    const result = await db.execute(sql`
      SELECT id, unit_code, title, sort_order, created_at
      FROM v4_unit_stories
      WHERE specialty_id = ${slug}
         OR (${spec ? 'true' : 'false'} = 'true' AND specialty_id = ${spec ? String(spec.id) : ''})
      ORDER BY unit_code, sort_order, created_at
    `);
    return res.json(result.rows);
  } catch (err: any) {
    logger.error("stories student list error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

// ── GET /v4/stories/:id ───────────────────────────────────────────────────────
// Returns the full HTML content of a single story.
router.get("/v4/stories/:id", requireUser, async (req: any, res: any): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const result = await db.execute(sql`
      SELECT id, unit_code, title, html_content, sort_order, created_at
      FROM v4_unit_stories
      WHERE id = ${id}
    `);
    const row = result.rows[0] as any;
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err: any) {
    logger.error("story fetch error", err);
    return res.status(500).json({ error: "DB error" });
  }
});

export default router;
