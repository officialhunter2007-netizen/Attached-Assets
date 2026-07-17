/**
 * Admin FCM Token Management
 *
 * Allows the admin Android app to register/unregister its FCM device token
 * so the backend can push notifications when new subscription requests arrive.
 *
 * Routes (all require admin session):
 *   POST   /api/admin/fcm-token         — upsert FCM token for the current admin
 *   DELETE /api/admin/fcm-token         — remove FCM token for the current admin
 */
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireSameOriginCsrf } from "../lib/csrf";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUser(userId: number) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return u ?? null;
}

// ── POST /api/admin/fcm-token ─────────────────────────────────────────────────
router.post("/admin/fcm-token", requireSameOriginCsrf, async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(userId);
  if (user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) { res.status(400).json({ error: "token مطلوب" }); return; }

  try {
    await db.execute(sql`
      INSERT INTO admin_fcm_tokens (user_id, token, updated_at)
      VALUES (${userId}, ${token}, NOW())
      ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()
    `);
    logger.info({ userId, tokenTail: token.slice(-8) }, "[admin-fcm] FCM token registered");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ userId, err: err?.message }, "[admin-fcm] register error");
    res.status(500).json({ error: "فشل تسجيل الرمز" });
  }
});

// ── DELETE /api/admin/fcm-token ───────────────────────────────────────────────
router.delete("/admin/fcm-token", requireSameOriginCsrf, async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await getUser(userId);
  if (user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";

  try {
    if (token) {
      await db.execute(sql`DELETE FROM admin_fcm_tokens WHERE user_id = ${userId} AND token = ${token}`);
    } else {
      await db.execute(sql`DELETE FROM admin_fcm_tokens WHERE user_id = ${userId}`);
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[admin-fcm] unregister error:", err?.message);
    res.status(500).json({ error: "فشل إلغاء التسجيل" });
  }
});

export default router;
