import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = ((req as any).session as any)?.userId ?? null;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

router.get("/notifications", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const notifs = await db.execute(
      sql`SELECT id, type, title, body, data, read, created_at, expires_at
          FROM notifications
          WHERE user_id = ${userId}
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 50`
    );
    const unreadCount = (notifs.rows as any[]).filter((n) => !n.read).length;
    return res.json({ notifications: notifs.rows, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحميل الإشعارات" });
  }
});

router.post("/notifications/:id/read", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const notifId = parseInt(req.params.id, 10);
    await db.execute(
      sql`UPDATE notifications SET read = true, read_at = NOW()
          WHERE id = ${notifId} AND user_id = ${userId}`
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحديث الإشعار" });
  }
});

router.post("/notifications/read-all", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    await db.execute(
      sql`UPDATE notifications SET read = true, read_at = NOW()
          WHERE user_id = ${userId} AND read = false`
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحديث الإشعارات" });
  }
});

export default router;
