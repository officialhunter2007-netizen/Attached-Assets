/**
 * Push Notifications — Web Push (VAPID) routes
 * Student subscribe/unsubscribe + Admin send + history + audience count
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import webpush from "web-push";
import { sendExpoPushToTokens } from "../lib/expo-push";

const router: IRouter = Router();

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

// ── Auth helpers (match existing route conventions) ───────────────────────────
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

/** CSRF guard for mutation endpoints — mirrors admin-knowledge.ts pattern. */
function csrfGuard(req: any, res: any): boolean {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return false;
  }
  return true;
}

// ── GET /api/push/vapid-public-key ────────────────────────────────────────────
router.get("/push/vapid-public-key", (_req: any, res: any) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
});

// ── POST /api/push/subscribe ──────────────────────────────────────────────────
router.post("/push/subscribe", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!csrfGuard(req, res)) return;

  try {
    const { subscription, meta = {} } = req.body ?? {};
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: "subscription.endpoint مطلوب" });
    }
    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh ?? "";
    const auth   = keys?.auth   ?? "";
    const {
      specialtyIds    = [],
      currentLevel    = null,
      currentUnitCode = null,
      skillIds        = [],
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
router.delete("/push/unsubscribe", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!csrfGuard(req, res)) return;

  try {
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
router.get("/admin/notifications/audience-count", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

  try {
    const filterParams = req.query as FilterParams;
    const filter = buildWhereClause(filterParams);

    // VAPID (browser) count
    const vapidQ = filter
      ? `SELECT COUNT(*) AS cnt FROM push_subscriptions WHERE ${filter}`
      : `SELECT COUNT(*) AS cnt FROM push_subscriptions`;
    const vapidRow = await db.execute(sql.raw(vapidQ));
    const vapidCount = Number((vapidRow.rows[0] as any)?.cnt ?? 0);

    // Expo (mobile app) count — only for "all" and "users" targets
    let expoCount = 0;
    const targetType = filterParams.targetType ?? "all";
    try {
      if (targetType === "all") {
        const expoRow = await db.execute(sql`
          SELECT COUNT(*) AS cnt FROM expo_push_tokens WHERE role = 'student'
        `);
        expoCount = Number((expoRow.rows[0] as any)?.cnt ?? 0);
      } else if (targetType === "users") {
        const ids = String(filterParams.userIds ?? "")
          .split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
        if (ids.length > 0) {
          const expoRow = await db.execute(
            sql.raw(`SELECT COUNT(*) AS cnt FROM expo_push_tokens WHERE user_id IN (${ids.join(",")}) AND role = 'student'`)
          );
          expoCount = Number((expoRow.rows[0] as any)?.cnt ?? 0);
        }
      }
    } catch { /* expo table might not exist yet */ }

    return res.json({
      count: vapidCount + expoCount,
      vapidCount,
      expoCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/admin/notifications/send ───────────────────────────────────────
router.post("/admin/notifications/send", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
  if (!csrfGuard(req, res)) return;

  try {
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

    let vapidSent = 0, vapidFailed = 0;
    let expoSent  = 0, expoFailed  = 0;

    // ── 1. Web Push (VAPID) — for browser subscribers ─────────────────────────
    if (vapidReady) {
      const q = where
        ? `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE ${where}`
        : `SELECT endpoint, p256dh, auth FROM push_subscriptions`;
      const subsResult = await db.execute(sql.raw(q));
      const subs = subsResult.rows as { endpoint: string; p256dh: string; auth: string }[];

      if (subs.length > 0) {
        const payload = JSON.stringify({ title, body, url, icon: "/favicon.svg", badge: "/favicon.svg" });
        const staleEndpoints: string[] = [];

        await Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
                { TTL: 86400 }
              );
              vapidSent++;
            } catch (err: any) {
              vapidFailed++;
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                staleEndpoints.push(sub.endpoint);
              }
            }
          })
        );
        for (const ep of staleEndpoints) {
          await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${ep}`).catch(() => {});
        }
      }
    }

    // ── 2. Expo Push — for mobile app users ───────────────────────────────────
    try {
      let expoRows;
      if (targetType === "users") {
        const ids = (Array.isArray(userIds) ? userIds : String(userIds).split(","))
          .map(Number).filter((n: number) => !isNaN(n) && n > 0);
        if (ids.length > 0) {
          expoRows = await db.execute(
            sql.raw(`SELECT token FROM expo_push_tokens WHERE user_id IN (${ids.join(",")}) AND role = 'student'`)
          );
        }
      } else {
        // all / specialty / level / unit / skill → send to all student Expo tokens
        expoRows = await db.execute(sql`SELECT token FROM expo_push_tokens WHERE role = 'student'`);
      }

      if (expoRows && expoRows.rows.length > 0) {
        const tokens = (expoRows.rows as { token: string }[]).map((r) => r.token);
        const expoResult = await sendExpoPushToTokens(tokens, {
          title, body,
          url: url.startsWith("http") ? url : `https://learnukhba.com${url}`,
          data: { type: "admin_push", url },
        });
        expoSent   = expoResult.sent;
        expoFailed = expoResult.failed;
      }
    } catch (expoErr: any) {
      console.warn("[push] Expo send error:", expoErr?.message);
    }

    const totalSent   = vapidSent   + expoSent;
    const totalFailed = vapidFailed + expoFailed;

    if (totalSent === 0 && totalFailed === 0) {
      return res.json({
        ok: true, sent: 0, failed: 0,
        vapidSent, expoSent,
        message: "لا توجد أجهزة مسجلة للفئة المستهدفة",
      });
    }

    // Log the sent notification
    await db.execute(sql`
      INSERT INTO notification_log (admin_id, title, body, url, target_filter, sent_count, failed_count)
      VALUES (${userId}, ${title}, ${body}, ${url}, ${JSON.stringify(filterParams)}::jsonb, ${totalSent}, ${totalFailed})
    `).catch((e: any) => console.warn("[push] log insert failed:", e?.message));

    return res.json({ ok: true, sent: totalSent, failed: totalFailed, vapidSent, expoSent });
  } catch (err: any) {
    console.error("[push] send error:", err?.message);
    return res.status(500).json({ error: "فشل الإرسال: " + err?.message });
  }
});

// ── GET /api/admin/notifications/history ─────────────────────────────────────
router.get("/admin/notifications/history", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

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
router.get("/admin/notifications/subscribers", async (req: any, res: any): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!(await isAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

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
  userIds?: number[] | string;
};

function sanitize(s: string): string {
  return s.replace(/'/g, "''").replace(/;/g, "");
}

function buildWhereClause(p: FilterParams): string {
  const { targetType = "all", specialtyId, level, unitCode, skillId, userIds } = p;
  const ids = Array.isArray(userIds)
    ? (userIds as any[]).map(Number).filter((n) => !isNaN(n))
    : String(userIds ?? "").split(",").map(Number).filter((n) => !isNaN(n));

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

// ── sendVapidToAdmins — Web Push للمشرفين (best-effort) ──────────────────────
export async function sendVapidToAdmins(
  title: string,
  body: string,
  url = "/admin",
): Promise<void> {
  if (!vapidReady) return;
  try {
    const rows = await db.execute(sql`
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.role = 'admin'
    `);
    const subs = (rows as any).rows ?? rows ?? [];
    await Promise.allSettled(
      subs.map(async (s: any) => {
        const ep = s.endpoint as string;
        try {
          await webpush.sendNotification(
            { endpoint: ep, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title, body, url, icon: "/icons/icon-192.png" }),
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${ep}`).catch(() => {});
          }
        }
      }),
    );
  } catch (e: any) {
    console.warn("[push] sendVapidToAdmins failed:", e?.message);
  }
}

export default router;
