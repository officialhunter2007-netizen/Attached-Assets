/**
 * Expo Push Tokens — تسجيل وإرسال إشعارات تطبيقات الطالب والأدمن
 *
 * Routes:
 *   POST   /api/student/register-push-token           — طالب يسجل توكن جهازه
 *   POST   /api/admin/register-push-token             — أدمن يسجل توكن جهازه
 *   DELETE /api/student/register-push-token           — طالب يلغي توكنه
 *   DELETE /api/admin/register-push-token             — أدمن يلغي توكنه
 *   POST   /api/admin/expo-notifications/send         — أرسل إشعاراً للطلاب أو الأدمن
 *   GET    /api/admin/expo-notifications/stats        — عدد الأجهزة المسجلة
 */

import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendExpoPushToTokens, isValidExpoToken } from "../lib/expo-push";

const router: IRouter = Router();

// ── جدول expo_push_tokens — ينشأ تلقائياً عند الحاجة ──────────────────────────
async function ensureTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS expo_push_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL,
      platform   TEXT NOT NULL DEFAULT 'android',
      role       TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(token)
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS expo_push_tokens_role_idx ON expo_push_tokens(role)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS expo_push_tokens_user_id_idx ON expo_push_tokens(user_id)
  `);
}
ensureTable().catch((e) =>
  logger.warn({ err: e?.message }, "[expo-push] ensureTable failed"),
);

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function isAdmin(userId: number): Promise<boolean> {
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

// ── POST /api/student/register-push-token ─────────────────────────────────────
// لا يشترط تسجيل الدخول — يسجل التوكن ويربطه بالمستخدم إذا كانت الجلسة موجودة
router.post("/student/register-push-token", async (req: any, res: any): Promise<void> => {
  const { token, platform = "android" } = req.body ?? {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  if (!isValidExpoToken(token)) {
    res.status(400).json({ error: "صيغة التوكن غير صحيحة — يجب أن يبدأ بـ ExponentPushToken[" });
    return;
  }

  const userId = getUserId(req); // null مقبول

  try {
    await db.execute(sql`
      INSERT INTO expo_push_tokens (user_id, token, platform, role, updated_at)
      VALUES (${userId}, ${token}, ${platform}, 'student', NOW())
      ON CONFLICT (token) DO UPDATE SET
        user_id    = COALESCE(EXCLUDED.user_id, expo_push_tokens.user_id),
        platform   = EXCLUDED.platform,
        updated_at = NOW()
    `);
    logger.info({ userId, tokenTail: token.slice(-10) }, "[expo-push] student token registered");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[expo-push] student register error");
    res.status(500).json({ error: "فشل تسجيل الجهاز" });
  }
});

// ── POST /api/admin/register-push-token ───────────────────────────────────────
router.post("/admin/register-push-token", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Forbidden" }); return; }

  const { token, platform = "android" } = req.body ?? {};

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  if (!isValidExpoToken(token)) {
    res.status(400).json({ error: "صيغة التوكن غير صحيحة" });
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO expo_push_tokens (user_id, token, platform, role, updated_at)
      VALUES (${userId}, ${token}, ${platform}, 'admin', NOW())
      ON CONFLICT (token) DO UPDATE SET
        user_id    = EXCLUDED.user_id,
        platform   = EXCLUDED.platform,
        updated_at = NOW()
    `);
    logger.info({ userId, tokenTail: token.slice(-10) }, "[expo-push] admin token registered");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[expo-push] admin register error");
    res.status(500).json({ error: "فشل تسجيل الجهاز" });
  }
});

// ── DELETE /api/student/register-push-token ───────────────────────────────────
router.delete("/student/register-push-token", async (req: any, res: any): Promise<void> => {
  const { token } = req.body ?? {};
  if (!token) { res.status(400).json({ error: "token مطلوب" }); return; }
  try {
    await db.execute(sql`DELETE FROM expo_push_tokens WHERE token = ${token} AND role = 'student'`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "فشل إلغاء التسجيل" });
  }
});

// ── DELETE /api/admin/register-push-token ─────────────────────────────────────
router.delete("/admin/register-push-token", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { token } = req.body ?? {};
  try {
    if (token) {
      await db.execute(sql`DELETE FROM expo_push_tokens WHERE token = ${token} AND user_id = ${userId}`);
    } else {
      await db.execute(sql`DELETE FROM expo_push_tokens WHERE user_id = ${userId} AND role = 'admin'`);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: "فشل إلغاء التسجيل" });
  }
});

// ── GET /api/admin/expo-notifications/stats ───────────────────────────────────
router.get("/admin/expo-notifications/stats", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const rows = await db.execute(sql`
      SELECT role, COUNT(*)::int AS count
      FROM expo_push_tokens
      GROUP BY role
    `);
    const stats: Record<string, number> = { student: 0, admin: 0 };
    for (const row of rows.rows as { role: string; count: number }[]) {
      stats[row.role] = row.count;
    }
    res.json({ stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/admin/expo-notifications/send ───────────────────────────────────
/**
 * أرسل إشعاراً عبر Expo Push.
 *
 * Body:
 *   title        — عنوان الإشعار (مطلوب)
 *   body         — نص الإشعار (مطلوب)
 *   url          — رابط يُفتح في WebView عند النقر (اختياري)
 *   target       — "students" | "admins" | "all" | "user" (افتراضي: students)
 *   userId       — إذا كان target = "user" حدد المستخدم بـ ID
 */
router.post("/admin/expo-notifications/send", async (req: any, res: any): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!(await isAdmin(userId))) { res.status(403).json({ error: "Forbidden" }); return; }

  const {
    title,
    body,
    url,
    target  = "students",
    userId: targetUserId,
    data    = {},
  } = req.body ?? {};

  if (!title || !body) {
    res.status(400).json({ error: "title و body مطلوبان" });
    return;
  }

  try {
    // جلب التوكنات حسب الهدف
    let rows;
    if (target === "user" && targetUserId) {
      rows = await db.execute(sql`
        SELECT token FROM expo_push_tokens WHERE user_id = ${Number(targetUserId)}
      `);
    } else if (target === "admins") {
      rows = await db.execute(sql`SELECT token FROM expo_push_tokens WHERE role = 'admin'`);
    } else if (target === "all") {
      rows = await db.execute(sql`SELECT token FROM expo_push_tokens`);
    } else {
      // students (الافتراضي)
      rows = await db.execute(sql`SELECT token FROM expo_push_tokens WHERE role = 'student'`);
    }

    const tokens = (rows.rows as { token: string }[]).map((r) => r.token);

    if (tokens.length === 0) {
      res.json({ ok: true, sent: 0, failed: 0, message: "لا توجد أجهزة مسجلة" });
      return;
    }

    const result = await sendExpoPushToTokens(tokens, { title, body, url, data });

    // سجّل الإشعار في notification_log
    await db.execute(sql`
      INSERT INTO notification_log (admin_id, title, body, url, target_filter, sent_count, failed_count)
      VALUES (
        ${userId}, ${title}, ${body}, ${url ?? null},
        ${JSON.stringify({ target, targetUserId })}::jsonb,
        ${result.sent}, ${result.failed}
      )
    `).catch((e: any) =>
      logger.warn({ err: e?.message }, "[expo-push] notification_log insert failed"),
    );

    res.json({ ok: true, ...result });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[expo-push] send error");
    res.status(500).json({ error: "فشل الإرسال: " + err?.message });
  }
});

// ── دالة مساعدة — تُستخدم من subscriptions.ts لإشعار الأدمن ──────────────────
/**
 * أرسل إشعار Expo لجميع أجهزة الأدمن المسجلة.
 * best-effort — لا ترمي استثناء أبداً.
 */
export async function sendExpoToAdmins(
  subjectName: string,
  userName: string,
  planType: string,
): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT token FROM expo_push_tokens WHERE role = 'admin'
    `);
    const tokens = (rows.rows as { token: string }[]).map((r) => r.token);
    if (tokens.length === 0) return;

    await sendExpoPushToTokens(tokens, {
      title: "طلب اشتراك جديد 🔔",
      body:  `${userName || "مستخدم"} — ${subjectName || "تخصص"} (${planType})`,
      url:   "https://learnukhba.com/admin/subscriptions",
      data:  { type: "subscription_request", url: "/admin/subscriptions" },
    });
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[expo-push] sendExpoToAdmins failed");
  }
}

/**
 * أرسل إشعار Expo لطالب معين (عند قبول أو رفض اشتراكه).
 * best-effort — لا ترمي استثناء أبداً.
 */
export async function sendExpoToStudent(
  studentUserId: number,
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  try {
    const rows = await db.execute(sql`
      SELECT token FROM expo_push_tokens
      WHERE user_id = ${studentUserId} AND role = 'student'
    `);
    const tokens = (rows.rows as { token: string }[]).map((r) => r.token);
    if (tokens.length === 0) return;
    await sendExpoPushToTokens(tokens, { title, body, url });
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[expo-push] sendExpoToStudent failed");
  }
}

export default router;
