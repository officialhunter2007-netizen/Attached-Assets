// ─────────────────────────────────────────────────────────────────────────────
// Podcast routes — admin management + student streaming
//
// Podcasts are audio recordings attached to curriculum units. They persist
// across instruction-file version republishes (tied to specialty_id + unit_code,
// not to a specific version).
//
// Admin routes (require admin session + CSRF header):
//   GET  /admin/v4/units?specialtyId=          — units list for specialty (for picker)
//   GET  /admin/v4/podcasts?specialtyId=&unitCode=  — list podcasts for a unit
//   POST /admin/v4/podcasts                    — create (multipart: file OR body: URL)
//   PATCH /admin/v4/podcasts/:id/order         — update sort_order
//   DELETE /admin/v4/podcasts/:id              — delete (also removes uploaded file)
//
// Student routes (require valid session):
//   GET  /v4/podcasts?slug=                    — all podcasts grouped by unit_code
//   GET  /v4/podcasts/:id/audio                — stream uploaded audio (Range support)
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import multer from "multer";
import * as nodePath from "node:path";
import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import * as crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, usersTable, v4SpecialtiesTable } from "@workspace/db";
import { requireSameOriginCsrf } from "../lib/csrf";
import { logger } from "../lib/logger";

// ─── File storage ─────────────────────────────────────────────────────────────
const PODCASTS_DIR = nodePath.join(process.cwd(), "data", "podcasts");

async function ensurePodcastsDir() {
  await fs.mkdir(PODCASTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try { await ensurePodcastsDir(); } catch {}
    cb(null, PODCASTS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = nodePath.extname(file.originalname).toLowerCase() || ".mp3";
    cb(null, crypto.randomUUID() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("audio/") ||
      file.mimetype === "video/mp4" ||          // podcasts exported as MP4 audio
      file.mimetype === "application/octet-stream";
    cb(ok ? null : new Error("Only audio files are allowed"), ok);
  },
});

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

// ─── MIME type from extension ─────────────────────────────────────────────────
function audioMime(filename: string): string {
  const ext = nodePath.extname(filename).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".flac") return "audio/flac";
  return "audio/mpeg";
}

const router = Router();

// ── GET /admin/v4/units?specialtyId= ─────────────────────────────────────────
// Returns all units of the specialty's active version (for admin podcast picker).
// Includes lesson_count so the UI can build a meaningful sort-order dropdown.
router.get("/admin/v4/units", requireAdminMw, async (req: any, res: any): Promise<any> => {
  const { specialtyId } = req.query as { specialtyId?: string };
  if (!specialtyId) return res.status(400).json({ error: "specialtyId required" });

  const [specialty] = await db
    .select({ activeVersionId: v4SpecialtiesTable.activeVersionId })
    .from(v4SpecialtiesTable)
    .where(eq(v4SpecialtiesTable.slug, specialtyId));

  if (!specialty?.activeVersionId) return res.json([]);

  const result = await db.execute(sql`
    SELECT
      u.code,
      u.name,
      u.unit_index,
      (SELECT COUNT(*) FROM v4_lessons l WHERE l.unit_id = u.id)        AS lesson_count,
      (SELECT COUNT(*) FROM v4_lab_scenarios ls WHERE ls.unit_id = u.id) AS lab_count
    FROM v4_units u
    WHERE u.version_id = ${specialty.activeVersionId}
    ORDER BY u.code
  `);

  return res.json(result.rows);
});

// ── GET /admin/v4/podcasts?specialtyId=&unitCode= ─────────────────────────────
router.get("/admin/v4/podcasts", requireAdminMw, async (req: any, res: any): Promise<any> => {
  const { specialtyId, unitCode } = req.query as { specialtyId?: string; unitCode?: string };
  if (!specialtyId) return res.status(400).json({ error: "specialtyId required" });

  const result = unitCode
    ? await db.execute(sql`
        SELECT id, specialty_id, unit_code, title, audio_url, audio_filename, sort_order, created_at
        FROM v4_unit_podcasts
        WHERE specialty_id = ${specialtyId} AND unit_code = ${unitCode}
        ORDER BY sort_order, id
      `)
    : await db.execute(sql`
        SELECT id, specialty_id, unit_code, title, audio_url, audio_filename, sort_order, created_at
        FROM v4_unit_podcasts
        WHERE specialty_id = ${specialtyId}
        ORDER BY unit_code, sort_order, id
      `);

  const rows = (result.rows as any[]).map((r) => ({
    ...r,
    sortOrder: parseFloat(r.sort_order),
    audioSrc: r.audio_filename
      ? `/api/v4/podcasts/${r.id}/audio`
      : r.audio_url,
  }));

  return res.json(rows);
});

// ── POST /admin/v4/podcasts ───────────────────────────────────────────────────
// Accepts multipart/form-data with optional "audio" file field,
// OR application/json with an audioUrl field.
router.post(
  "/admin/v4/podcasts",
  requireSameOriginCsrf,
  requireAdminMw,
  upload.single("audio"),
  async (req: any, res: any): Promise<any> => {
    const { specialtyId, unitCode, title, audioUrl, sortOrder } = req.body ?? {};
    const file = req.file;

    if (!specialtyId || !unitCode || !title) {
      if (file) await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({ error: "specialtyId, unitCode, title are required" });
    }
    if (!file && !audioUrl) {
      return res.status(400).json({ error: "Either an audio file or an audioUrl is required" });
    }

    const audioFilename: string | null = file ? nodePath.basename(file.path) : null;
    const url: string | null = audioUrl ?? null;
    const order: number = parseFloat(sortOrder ?? "0") || 0;

    try {
      const result = await db.execute(sql`
        INSERT INTO v4_unit_podcasts (specialty_id, unit_code, title, audio_url, audio_filename, sort_order)
        VALUES (${specialtyId}, ${unitCode}, ${title}, ${url}, ${audioFilename}, ${order})
        RETURNING id, specialty_id, unit_code, title, audio_url, audio_filename, sort_order, created_at
      `);
      const row = result.rows[0] as any;
      return res.json({
        ...row,
        sortOrder: parseFloat(row.sort_order),
        audioSrc: row.audio_filename
          ? `/api/v4/podcasts/${row.id}/audio`
          : row.audio_url,
      });
    } catch (e: any) {
      if (file) await fs.unlink(file.path).catch(() => {});
      logger.error({ err: e?.message }, "[podcasts] insert failed");
      return res.status(500).json({ error: "internal" });
    }
  },
);

// ── PATCH /admin/v4/podcasts/:id/order ───────────────────────────────────────
router.patch(
  "/admin/v4/podcasts/:id/order",
  requireSameOriginCsrf,
  requireAdminMw,
  async (req: any, res: any): Promise<any> => {
    const id = parseInt(req.params.id, 10);
    const order = parseFloat(req.body?.sortOrder ?? "0") || 0;
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    await db.execute(sql`UPDATE v4_unit_podcasts SET sort_order = ${order} WHERE id = ${id}`);
    return res.json({ ok: true });
  },
);

// ── DELETE /admin/v4/podcasts/:id ─────────────────────────────────────────────
router.delete(
  "/admin/v4/podcasts/:id",
  requireSameOriginCsrf,
  requireAdminMw,
  async (req: any, res: any): Promise<any> => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const result = await db.execute(sql`
      DELETE FROM v4_unit_podcasts WHERE id = ${id}
      RETURNING audio_filename
    `);
    const row = result.rows[0] as any;
    if (!row) return res.status(404).json({ error: "Not found" });

    if (row.audio_filename) {
      await fs.unlink(nodePath.join(PODCASTS_DIR, row.audio_filename)).catch(() => {});
    }

    return res.json({ ok: true });
  },
);

// ── GET /v4/podcasts?slug= ────────────────────────────────────────────────────
// Student-facing: returns all podcasts for a specialty, grouped by unit_code.
// The client (v4-map.tsx) merges them into the lesson path for rendering.
router.get("/v4/podcasts", requireUser, async (req: any, res: any): Promise<any> => {
  const { slug } = req.query as { slug?: string };
  if (!slug) return res.status(400).json({ error: "slug required" });

  const result = await db.execute(sql`
    SELECT id, unit_code, title, audio_url, audio_filename, sort_order
    FROM v4_unit_podcasts
    WHERE specialty_id = ${slug}
    ORDER BY unit_code, sort_order, id
  `);

  const byUnit: Record<string, any[]> = {};
  for (const row of result.rows as any[]) {
    const code = row.unit_code as string;
    if (!byUnit[code]) byUnit[code] = [];
    byUnit[code].push({
      id: row.id,
      title: row.title,
      sortOrder: parseFloat(row.sort_order),
      audioSrc: row.audio_filename
        ? `/api/v4/podcasts/${row.id}/audio`
        : row.audio_url,
    });
  }

  return res.json({ byUnit });
});

// ── GET /v4/podcasts/:id/audio ────────────────────────────────────────────────
// Streams the uploaded audio file. Supports HTTP Range for audio seeking.
router.get("/v4/podcasts/:id/audio", requireUser, async (req: any, res: any): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = await db.execute(sql`
    SELECT audio_filename FROM v4_unit_podcasts WHERE id = ${id}
  `);
  const row = result.rows[0] as any;
  if (!row?.audio_filename) return res.status(404).json({ error: "Not found" });

  const filePath = nodePath.join(PODCASTS_DIR, row.audio_filename as string);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ error: "Audio file not found on disk" });
  }

  const stat = await fs.stat(filePath);
  const fileSize = stat.size;
  const mime = audioMime(row.audio_filename as string);
  const rangeHeader = req.headers["range"] as string | undefined;

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600",
    });
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    });
    createReadStream(filePath).pipe(res);
  }
});

export default router;
