/**
 * Push Notifications — Web Push (VAPID) routes
 * Student subscribe/unsubscribe + Admin send + history + audience count
 */
import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

// ── VAPID setup ───────────────────────────────────────────────────────────────
let vapidReady = false;
function initVapid() {
  const pub   = process.env.VAPID_PUBLIC_KEY;
  const priv  = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:admin@learnukhba.com";
  if (!pub || !priv) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push disabled");
    return false;
  }
  try {
    webpush.setVapidDetails(email, pub, priv);
    console.log("[push] VAPID initialized ✓");
    return true;
  } catch (e: any) {
    console.error("[push] VAPID init failed:", e?.message);
    return false;
  }
}
vapidReady = initVapid();

// ── Middleware ─────────────────────────────────────────────────────────────────
function requireUser(req: Request, res: Response, next: NextFunction): void {
  const uid = (req as any).session?.userId ?? null;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as any).session?.userRole ?? (req as any).session?.role ?? null;
  if (role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  next();
}

// ── GET /api/push/vapid-public-key ────────────────────────────────────────────
router.get("/push/vapid-public-key", (_req: Request, res: any) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
});

// ── POST /api/push/subscribe ──────────────────────────────────────────────────
router.post("/push/subscribe", requireUser, async (req: any, res: any) => {
  try {
    const userId = req.session.userId as number;
    const { subscription, meta = {} } = req.body ?? {};
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: "subscription.endpoint مطلوب" });
    }
    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh ?? "";
    const auth   = keys?.auth   ?? "";
    const {
      specialtyIds   = [],
      currentLevel   = null,
      currentUnitCode= null,
      skillIds       = [],
    } = meta;

    await db.execute(sql`
      INSERT INTO push_subscriptions
        (user_id, endpoint, p256dh, auth, specialty_ids, current_level, current_unit_code, skill_ids, updated_at)
      VALUES
        (${userId}, ${endpoint}, ${p256dh}, ${auth},
         ${JSON.stringify(specialtyIds)}::jsonb,
         ${currentLevel}, ${currentUnitCode},
         ${JSON.stringify(skillIds)}::jsonb,
         NOW())
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh            = EXCLUDED.p256dh,
        auth              = EXCLUDED.auth,
        specialty_ids     = EXCLUDED.specialty_ids,
        current_level     = EXCLUDED.current_level,
        current_unit_code = EXCLUDED.current_unit_code,
        skill_ids         = EXCLUDED.skill_ids,
        updated_at        = NOW()
    `);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[push] subscribe error:", err?.message);
    return res.status(500).json({ error: "فشل تسجيل الجهاز" });
  }
});

// ── DELETE /api/push/unsubscribe ──────────────────────────────────────────────
router.delete("/push/unsubscribe", requireUser, async (req: any, res: any) => {
  try {
    const userId   = req.session.userId as number;
    const endpoint = req.body?.endpoint ?? null;
    if (endpoint) {
      await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${userId} AND endpoint = ${endpoint}`);
    } else {
      await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${userId}`);
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل إلغاء الاشتراك" });
  }
});

// ── GET /api/admin/notifications/audience-count ───────────────────────────────
router.get("/admin/notifications/audience-count", requireAdmin, async (req: any, res: any) => {
  try {
    const filter = buildWhereClause(req.query as FilterParams);
    const q = filter ? `SELECT COUNT(*) AS cnt FROM push_subscriptions WHERE ${filter}` : `SELECT COUNT(*) AS cnt FROM push_subscriptions`;
    const row = await db.execute(sql.raw(q));
    return res.json({ count: Number((row.rows[0] as any)?.cnt ?? 0) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/admin/notifications/send ───────────────────────────────────────
router.post("/admin/notifications/send", requireAdmin, async (req: any, res: any) => {
  if (!vapidReady) {
    return res.status(503).json({
      error: "مفاتيح VAPID غير مضبوطة. أضف VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY في Secrets.",
    });
  }
  try {
    const adminId = req.session.userId as number;
    const {
      title, body, url = "/",
      targetType = "all",
      specialtyId, level, unitCode, skillId,
      userIds = [],
    } = req.body ?? {};

    if (!title || !body) {
      return res.status(400).json({ error: "title و body مطلوبان" });
    }

    const filterParams: FilterParams = { targetType, specialtyId, level, unitCode, skillId, userIds };
    const where = buildWhereClause(filterParams);
    const q = where
      ? `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${where}`
      : `SELECT endpoint, p256dh, auth FROM push_subscriptions`;
    const subsResult = await db.execute(sql.raw(q));
    const subs = subsResult.rows as { endpoint: string; p256dh: string; auth: string }[];

    if (subs.length === 0) {
      return res.json({ ok: true, sent: 0, failed: 0, message: "لا توجد أجهزة مسجلة للفئة المستهدفة" });
    }

    const payload = JSON.stringify({ title, body, url, icon: "/favicon.svg", badge: "/favicon.svg" });
    let sent = 0, failed = 0;
    const staleEndpoints: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400 }
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    // Clean up stale subscriptions silently
    for (const ep of staleEndpoints) {
      await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${ep}`).catch(() => {});
    }

    // Log the sent notification
    await db.execute(sql`
      INSERT INTO notification_log (admin_id, title, body, url, target_filter, sent_count, failed_count)
      VALUES (${adminId}, ${title}, ${body}, ${url}, ${JSON.stringify(filterParams)}::jsonb, ${sent}, ${failed})
    `).catch((e: any) => console.warn("[push] log insert failed:", e?.message));

    return res.json({ ok: true, sent, failed });
  } catch (err: any) {
    console.error("[push] send error:", err?.message);
    return res.status(500).json({ error: "فشل الإرسال: " + err?.message });
  }
});

// ── GET /api/admin/notifications/history ─────────────────────────────────────
router.get("/admin/notifications/history", requireAdmin, async (_req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT nl.id, nl.title, nl.body, nl.url, nl.target_filter,
             nl.sent_count, nl.failed_count, nl.created_at,
             u.email AS admin_email
      FROM notification_log nl
      LEFT JOIN users u ON u.id = nl.admin_id
      ORDER BY nl.created_at DESC
      LIMIT 100
    `);
    return res.json({ history: rows.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/admin/notifications/subscribers ─────────────────────────────────
router.get("/admin/notifications/subscribers", requireAdmin, async (req: any, res: any) => {
  try {
    const q = String(req.query.q ?? "");
    const like = "%" + q + "%";
    const rows = await db.execute(sql`
      SELECT ps.user_id, u.email, u.display_name, COUNT(ps.id)::int AS device_count
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.email ILIKE ${like} OR u.display_name ILIKE ${like}
      GROUP BY ps.user_id, u.email, u.display_name
      ORDER BY u.display_name
      LIMIT 50
    `);
    return res.json({ subscribers: rows.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ── Filter builder ────────────────────────────────────────────────────────────
type FilterParams = {
  targetType?: string;
  specialtyId?: string;
  level?: string | number;
  unitCode?: string;
  skillId?: string;
  userIds?: number[];
};

function sanitize(s: string): string {
  return s.replace(/'/g, "''").replace(/;/g, "");
}

function buildWhereClause(p: FilterParams): string {
  const { targetType = "all", specialtyId, level, unitCode, skillId, userIds = [] } = p;
  const ids = Array.isArray(userIds)
    ? userIds.map(Number).filter(n => !isNaN(n))
    : String(userIds).split(",").map(Number).filter(n => !isNaN(n));

  switch (targetType) {
    case "specialty":
      return specialtyId ? `specialty_ids @> '["${sanitize(specialtyId)}"]'::jsonb` : "";
    case "level":
      return level !== undefined && level !== ""
        ? `current_level = '${sanitize(String(level))}'`
        : "";
    case "unit":
      return unitCode ? `current_unit_code = '${sanitize(unitCode)}'` : "";
    case "skill":
      return skillId ? `skill_ids @> '["${sanitize(skillId)}"]'::jsonb` : "";
    case "users":
      return ids.length > 0 ? `user_id IN (${ids.join(",")})` : "1=0";
    default:
      return "";
  }
}

export default router;
