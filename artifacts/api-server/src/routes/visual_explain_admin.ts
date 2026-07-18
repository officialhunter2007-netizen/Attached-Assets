/**
 * Visual Explain Admin Workflow
 * سير عمل التوضيح البصري بإشراف المشرف
 *
 * Routes:
 *   GET  /api/public/visual-explain/any-ready          — بدون auth، يعيد {anyReady}
 *   POST /api/student/visual-explain/request           — طالب يرسل طلب
 *   GET  /api/student/visual-explain/result/:id        — طالب يتحقق من نتيجة طلبه
 *   GET  /api/admin/visual-explain/readiness           — جهوزية هذا المشرف
 *   POST /api/admin/visual-explain/readiness           — يبدّل جهوزية هذا المشرف
 *   GET  /api/admin/visual-explain/requests            — قائمة الطلبات
 *   POST /api/admin/visual-explain/claim/:id           — ادّعِ طلباً (atomic)
 *   POST /api/admin/visual-explain/complete/:id        — احفظ HTML للطلب
 *   DELETE /api/admin/visual-explain/requests/:id      — احذف طلباً
 */

import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendVapidToAdmins } from "./push_notifications";
import { sendExpoToAdmins } from "./expo_push_tokens";

const router: IRouter = Router();

// ── إنشاء الجداول تلقائياً ────────────────────────────────────────────────────
async function ensureTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visual_explain_requests (
      id           SERIAL PRIMARY KEY,
      student_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL DEFAULT '',
      message_text TEXT NOT NULL,
      subject_name TEXT NOT NULL DEFAULT '',
      context      JSONB,
      status       TEXT NOT NULL DEFAULT 'pending',
      claimed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      claimed_at   TIMESTAMPTZ,
      html_result  TEXT,
      completed_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // backfill column for existing tables
  await db.execute(sql`
    ALTER TABLE visual_explain_requests ADD COLUMN IF NOT EXISTS context JSONB
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS ver_status_idx ON visual_explain_requests(status)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_readiness (
      admin_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      is_ready   BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  logger.info("[visual-explain] tables ready");
}
ensureTables().catch((e) =>
  logger.warn({ err: e?.message }, "[visual-explain] ensureTables failed"),
);

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function requireAdmin(req: any, res: any): Promise<number | null> {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (u?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return null; }
  return userId;
}

// ── GET /api/public/visual-explain/any-ready ─────────────────────────────────
router.get("/public/visual-explain/any-ready", async (_req: any, res: any): Promise<void> => {
  try {
    const rows = await db.execute(sql`SELECT COUNT(*) AS cnt FROM admin_readiness WHERE is_ready = TRUE`);
    const cnt = Number((rows as any).rows?.[0]?.cnt ?? 0);
    res.json({ anyReady: cnt > 0 });
  } catch { res.json({ anyReady: false }); }
});

// ── POST /api/student/visual-explain/request ─────────────────────────────────
router.post("/student/visual-explain/request", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { messageText, subjectName = "", context } = req.body ?? {};
  if (!messageText || typeof messageText !== "string") {
    res.status(400).json({ error: "messageText مطلوب" }); return;
  }

  try {
    const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, userId));
    const studentName = user?.name ?? user?.email ?? "طالب";
    const subName = (subjectName || "").slice(0, 120);
    const msgText = messageText.slice(0, 2000);

    // context: آخر 5 رسائل من المحادثة (مصفوفة JSON اختيارية)
    let contextJson: string | null = null;
    if (Array.isArray(context) && context.length > 0) {
      const cleaned = context.slice(-5).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: typeof m.content === "string" ? m.content.slice(0, 1000) : "",
      })).filter((m: any) => m.content);
      if (cleaned.length > 0) contextJson = JSON.stringify(cleaned);
    }

    const inserted = await db.execute(sql`
      INSERT INTO visual_explain_requests (student_id, student_name, message_text, subject_name, context, status)
      VALUES (${userId}, ${studentName}, ${msgText}, ${subName}, ${contextJson}::jsonb, 'pending')
      RETURNING id
    `);
    const requestId = (inserted as any).rows?.[0]?.id;
    res.json({ ok: true, requestId });

    // إشعار المشرفين (best-effort)
    const notifUrl = "/admin";
    sendVapidToAdmins(
      "طلب توضيح بصري 🎨",
      `${studentName}${subName ? " — " + subName : ""}`,
      notifUrl,
    ).catch(() => {});
    sendExpoToAdmins(
      subName || "توضيح بصري",
      studentName,
      "visual_explain",
    ).catch(() => {});
  } catch (e: any) {
    logger.error({ err: e?.message }, "[visual-explain] request failed");
    res.status(500).json({ error: "فشل إرسال الطلب" });
  }
});

// ── GET /api/student/visual-explain/result/:id ───────────────────────────────
router.get("/student/visual-explain/result/:id", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "id غير صحيح" }); return; }

  try {
    const rows = await db.execute(sql`
      SELECT status, html_result FROM visual_explain_requests
      WHERE id = ${id} AND student_id = ${userId} LIMIT 1
    `);
    const row = (rows as any).rows?.[0];
    if (!row) { res.status(404).json({ error: "الطلب غير موجود" }); return; }
    if (row.status === "completed" && row.html_result) {
      res.json({ status: "done", html: row.html_result });
    } else {
      res.json({ status: "pending" });
    }
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── GET /api/admin/visual-explain/readiness ──────────────────────────────────
router.get("/admin/visual-explain/readiness", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const rows = await db.execute(sql`SELECT is_ready FROM admin_readiness WHERE admin_id = ${adminId}`);
    res.json({ isReady: (rows as any).rows?.[0]?.is_ready ?? false });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── POST /api/admin/visual-explain/readiness ─────────────────────────────────
router.post("/admin/visual-explain/readiness", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const { isReady } = req.body ?? {};
  if (typeof isReady !== "boolean") { res.status(400).json({ error: "isReady boolean مطلوب" }); return; }
  try {
    await db.execute(sql`
      INSERT INTO admin_readiness (admin_id, is_ready, updated_at)
      VALUES (${adminId}, ${isReady}, NOW())
      ON CONFLICT (admin_id) DO UPDATE SET is_ready = ${isReady}, updated_at = NOW()
    `);
    res.json({ ok: true, isReady });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── GET /api/admin/visual-explain/requests ───────────────────────────────────
router.get("/admin/visual-explain/requests", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const rows = await db.execute(sql`
      SELECT r.id, r.student_name, r.message_text, r.subject_name,
             r.context, r.status, r.claimed_by, r.claimed_at, r.created_at,
             u.name AS claimer_name, u.email AS claimer_email
      FROM visual_explain_requests r
      LEFT JOIN users u ON u.id = r.claimed_by
      WHERE r.status IN ('pending', 'claimed')
         OR (r.status = 'completed' AND r.claimed_by = ${adminId}
             AND r.completed_at > NOW() - INTERVAL '2 hours')
      ORDER BY r.created_at DESC
      LIMIT 50
    `);
    res.json({ requests: (rows as any).rows ?? [] });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── POST /api/admin/visual-explain/claim/:id ─────────────────────────────────
// ذري: UPDATE … WHERE claimed_by IS NULL — يعيد 409 إذا سبقه مشرف آخر
router.post("/admin/visual-explain/claim/:id", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "id غير صحيح" }); return; }
  try {
    const result = await db.execute(sql`
      UPDATE visual_explain_requests
      SET status = 'claimed', claimed_by = ${adminId}, claimed_at = NOW()
      WHERE id = ${id} AND claimed_by IS NULL AND status = 'pending'
      RETURNING id
    `);
    if (!(result as any).rows?.[0]) {
      const existing = await db.execute(sql`
        SELECT u.name, u.email FROM visual_explain_requests r
        JOIN users u ON u.id = r.claimed_by WHERE r.id = ${id}
      `);
      const c = (existing as any).rows?.[0];
      res.status(409).json({ error: `سبق أن استلمه ${c?.name ?? c?.email ?? "مشرف آخر"}` });
      return;
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── POST /api/admin/visual-explain/complete/:id ──────────────────────────────
router.post("/admin/visual-explain/complete/:id", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const id = Number(req.params.id);
  const { html } = req.body ?? {};
  if (!html || typeof html !== "string" || html.trim().length < 10) {
    res.status(400).json({ error: "html مطلوب" }); return;
  }
  try {
    const result = await db.execute(sql`
      UPDATE visual_explain_requests
      SET status = 'completed', html_result = ${html}, completed_at = NOW()
      WHERE id = ${id} AND claimed_by = ${adminId}
      RETURNING id
    `);
    if (!(result as any).rows?.[0]) {
      res.status(403).json({ error: "هذا الطلب ليس بحوزتك" }); return;
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

// ── DELETE /api/admin/visual-explain/requests/:id ────────────────────────────
router.delete("/admin/visual-explain/requests/:id", async (req: any, res: any): Promise<void> => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const id = Number(req.params.id);
  try {
    await db.execute(sql`DELETE FROM visual_explain_requests WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e?.message }); }
});

export default router;
