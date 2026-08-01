/**
 * CSRF/SSRF Lab Routes — بنك SanaaBank حقيقي داخل معمل مغلق
 * 
 * البنية: ثلاثة أطراف منفصلة
 *   bank  → /api/lab/bank/*  (التطبيق الضحية)
 *   internal → /api/lab/internal/* (خدمات داخلية)
 *   evil  → /api/lab/evil     (صفحة المهاجم)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, csrfLabAccounts, csrfLabTransactions, csrfLabInternalLog, csrfLabState, csrfLabSecrets } from "@workspace/db";
import { randomBytes } from "node:crypto";

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getStudentUserId(req: Request): number {
  return (req as any).session?.userId || (req as any).userId || 1;
}

async function getLabConfig(userId: number) {
  const [row] = await db.select().from(csrfLabState).where(eq(csrfLabState.userId, userId));
  return row || { csrfTokenEnabled: false, sameSite: "None", allowlistEnabled: false, allowlistDomains: "cdn.sanaabank.com" };
}

// Check if request comes from bank origin (not from evil page)
function isFromBank(req: Request): boolean {
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  return !origin.includes("evil") && !origin.includes("attacker");
}

function setSessionCookie(res: Response, sessionId: string, sameSite: string) {
  res.cookie("lab_session", sessionId, {
    httpOnly: true,
    sameSite: sameSite as any,
    secure: false,
    path: "/",
    maxAge: 3600 * 1000,
  });
  if (sameSite !== "None") {
    res.cookie("lab_session_strict", sessionId, {
      httpOnly: true,
      sameSite: "strict" as any,
      secure: false,
      path: "/",
      maxAge: 3600 * 1000,
    });
  }
}

async function logInternal(endpoint: string, method: string, status: number, body: string) {
  await db.insert(csrfLabInternalLog).values({
    endpoint, method, sourceIp: "127.0.0.1", responseStatus: status, responseBody: body?.substring(0, 500),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BANK ENDPOINTS — التطبيق الضحية
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/lab/bank/login — تسجيل دخول حقيقي يصدر كوكي جلسة
router.post("/lab/bank/login", async (req, res) => {
  const { username } = req.body || {};
  const userId = getStudentUserId(req);
  const config = await getLabConfig(userId);
  const sessionId = randomBytes(16).toString("hex");

  // Get or create account
  let [account] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.username, username || "victim"));
  if (!account) {
    [account] = await db.insert(csrfLabAccounts).values({
      username: username || "victim", balance: 5000, sessionId,
    }).returning();
  } else {
    await db.update(csrfLabAccounts).set({ sessionId }).where(eq(csrfLabAccounts.id, account.id));
  }

  setSessionCookie(res, sessionId, config.sameSite);

  // Set CSRF token cookie if enabled
  if (config.csrfTokenEnabled) {
    res.cookie("csrf_lab_token", "tok-" + sessionId.substring(0, 8), {
      httpOnly: true,
      sameSite: config.sameSite as any,
      secure: false,
      path: "/",
      maxAge: 3600 * 1000,
    });
  }

  res.json({
    success: true,
    username: account.username,
    balance: account.balance,
    sessionId,
    sameSite: config.sameSite,
    csrfTokenEnabled: config.csrfTokenEnabled,
  });
});

// GET /api/lab/bank/me — معلومات الحساب
router.get("/lab/bank/me", async (req: any, res: any) => {
  const sessionId = req.cookies?.lab_session;
  if (!sessionId) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "لم تسجل الدخول بعد" });
  }

  const [account] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.sessionId, sessionId));
  if (!account) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "جلسة غير صالحة" });
  }

  // Return last 5 transactions
  const transactions = await db.select().from(csrfLabTransactions)
    .where(eq(csrfLabTransactions.fromUser, account.username))
    .orderBy(desc(csrfLabTransactions.createdAt)).limit(5);

  res.json({
    username: account.username,
    balance: account.balance,
    recentTransactions: transactions,
  });
});

// POST /api/lab/bank/transfer — تحويل أموال (الهدف من CSRF)
router.post("/lab/bank/transfer", async (req: any, res: any) => {
  const userId = getStudentUserId(req);
  const config = await getLabConfig(userId);
  const sessionId = req.cookies?.lab_session;
  const { to, amount } = req.body || {};
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  const isExternal = origin.includes("evil") || origin.includes("attacker");

  if (!sessionId) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "لا توجد جلسة — سجل الدخول أولاً" });
  }

  const [fromAccount] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.sessionId, sessionId));
  if (!fromAccount) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "جلسة غير صالحة" });
  }

  // CSRF Token check
  if (config.csrfTokenEnabled) {
    const tokenFromCookie = req.cookies?.csrf_lab_token;
    const tokenFromHeader = req.headers["x-csrf-token"] as string;
    if (!tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
      await db.insert(csrfLabTransactions).values({
        fromUser: fromAccount.username, toUser: to || "unknown", amount: amount || 0,
        success: false, csrfTokenMatched: false, origin,
      });
      return res.status(403).json({
        error: "CSRF_TOKEN_MISMATCH",
        message: "فشل التحقق من CSRF Token — التوكن في الرأس لا يطابق الكوكي",
        detail: `الكوكي: ${tokenFromCookie || 'غير موجود'} | الرأس: ${tokenFromHeader || 'غير موجود'}`,
      });
    }
  }

  // SameSite check
  if (config.sameSite === "Strict" && isExternal) {
    await db.insert(csrfLabTransactions).values({
      fromUser: fromAccount.username, toUser: to || "unknown", amount: amount || 0,
      success: false, sameSiteBlocked: true, origin,
    });
    return res.status(403).json({
      error: "SAMESITE_BLOCKED",
      message: `SameSite=${config.sameSite} منع إرسال الكوكي من موقع خارجي (${origin})`,
    });
  }
  if (config.sameSite === "Lax" && req.method !== "GET" && isExternal) {
    await db.insert(csrfLabTransactions).values({
      fromUser: fromAccount.username, toUser: to || "unknown", amount: amount || 0,
      success: false, sameSiteBlocked: true, origin,
    });
    return res.status(403).json({
      error: "SAMESITE_BLOCKED",
      message: `SameSite=Lax يسمح بـ GET فقط من المواقع الخارجية — POST ممنوع`,
    });
  }

  // Execute transfer
  const amt = parseInt(String(amount || 0));
  if (amt <= 0 || amt > fromAccount.balance) {
    return res.status(400).json({ error: "INVALID_AMOUNT", message: "مبلغ غير صالح أو رصيد غير كافٍ" });
  }

  const [target] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.username, to));

  await db.update(csrfLabAccounts).set({ balance: fromAccount.balance - amt }).where(eq(csrfLabAccounts.id, fromAccount.id));
  if (target) {
    await db.update(csrfLabAccounts).set({ balance: target.balance + amt }).where(eq(csrfLabAccounts.id, target.id));
  }

  await db.insert(csrfLabTransactions).values({
    fromUser: fromAccount.username, toUser: to || "unknown", amount: amt,
    success: true, csrfTokenMatched: config.csrfTokenEnabled, origin,
  });

  if (isExternal) {
    await db.insert(csrfLabTransactions).values({
      fromUser: fromAccount.username, toUser: to || "unknown", amount: amt,
      success: true, csrfTokenMatched: config.csrfTokenEnabled,
      origin: origin + " [⚠️ CSRF: طلب من موقع خارجي!]",
    });
  }

  res.json({
    success: true,
    from: fromAccount.username,
    to: to,
    amount: amt,
    newBalance: fromAccount.balance - amt,
    warning: isExternal ? "⚠️ هذا الطلب جاء من موقع خارجي — إذا لم تكن أنت من بدأه، فهذا هجوم CSRF!" : undefined,
    sameSite: config.sameSite,
    csrfProtected: config.csrfTokenEnabled,
  });
});

// GET /api/lab/bank/fetch — ميزة جلب الصور (باب SSRF)
router.get("/lab/bank/fetch", async (req, res) => {
  const userId = getStudentUserId(req);
  const config = await getLabConfig(userId);
  const targetUrl = (req.query.url as string) || "";

  if (!targetUrl) {
    return res.status(400).json({ error: "MISSING_URL", message: "يجب تحديد ?url=" });
  }

  // Allow-list check
  if (config.allowlistEnabled) {
    const allowed = config.allowlistDomains.split(",").map(d => d.trim());
    const isAllowed = allowed.some(d => targetUrl.includes(d));
    if (!isAllowed) {
      return res.status(403).json({
        error: "BLOCKED_BY_ALLOWLIST",
        message: `الوجهة محظورة — غير موجودة في قائمة السماح: ${allowed.join(', ')}`,
        target: targetUrl,
      });
    }
  }

  // Internal endpoints that simulate internal services
  const INTERNAL_HOST = "http://internal";
  if (targetUrl.startsWith(INTERNAL_HOST)) {
    const path = targetUrl.replace(INTERNAL_HOST, "");
    
    if (path.startsWith("/metadata")) {
      const secrets = await db.select().from(csrfLabSecrets);
      await logInternal("/metadata", "GET", 200, JSON.stringify(secrets));
      return res.json({
        source: "internal-metadata",
        data: {
          "instance-id": "i-0a1b2c3d4e5f67890",
          "region": "me-south-1",
          "secrets": secrets.map(s => ({ key: s.key, value: s.value })),
          "warning": "⚠️ SSRF ناجح — تم الوصول لبيانات السحابة الداخلية!"
        }
      });
    }

    if (path.startsWith("/admin")) {
      await logInternal("/admin", "GET", 200, "admin panel accessed");
      return res.json({
        source: "internal-admin",
        data: {
          panel: "لوحة تحكم المشرف",
          users: [{ id: 1, role: "superadmin" }, { id: 2, role: "auditor" }],
          logs: ["2024-01-01: System boot", "2024-01-02: Admin login"],
          warning: "⚠️ SSRF ناجح — تم الوصول للوحة الإدارة الداخلية!"
        }
      });
    }

    if (path.startsWith("/redis")) {
      await logInternal("/redis", "GET", 200, '{"keys":["session:abc","cache:config"]}');
      return res.json({
        source: "internal-redis",
        data: {
          status: "connected",
          keys: ["session:abc123", "cache:config", "queue:payments"],
          warning: "⚠️ SSRF ناجح — تم الوصول لخادم Redis الداخلي!"
        }
      });
    }

    await logInternal(path, "GET", 404, "not found");
    return res.status(404).json({ error: "NOT_FOUND", message: `المسار الداخلي ${path} غير موجود` });
  }

  // Block external URLs for safety
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    if (!targetUrl.includes("127.0.0.1") && !targetUrl.includes("localhost") && !targetUrl.includes("internal") && !targetUrl.includes("169.254")) {
      return res.json({
        source: "external",
        data: `[محاكاة: طلب خارجي إلى ${targetUrl} — ممنوع في المعمل]`,
        warning: "لأغراض تعليمية، الطلبات الخارجية محظورة. استخدم http://internal/... لاستهداف الشبكة الداخلية."
      });
    }
  }

  return res.json({
    source: "fetch-result",
    url: targetUrl,
    data: `محاولة جلب من ${targetUrl}`,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL SERVICES — خدمات داخلية لا يجب أن تكون مكشوفة
// ═══════════════════════════════════════════════════════════════════════════

router.get("/lab/internal/metadata", async (_req, res) => {
  const secrets = await db.select().from(csrfLabSecrets);
  await logInternal("/metadata", "GET", 200, JSON.stringify(secrets));
  res.json({
    service: "cloud-metadata",
    endpoint: "169.254.169.254",
    credentials: secrets.map(s => ({ key: s.key, value: s.value })),
    message: "⚠️ هذه الخدمة داخلية ولا يجب الوصول إليها من الخارج!",
  });
});

router.get("/lab/internal/admin", async (_req, res) => {
  await logInternal("/admin", "GET", 200, "admin panel accessed");
  res.json({
    service: "admin-panel",
    users: [{ username: "superadmin", role: "full_access" }],
    config: { db_host: "internal-db:5432", api_keys: ["sk-prod-xxxxx"] },
  });
});

router.get("/lab/internal/redis", async (_req, res) => {
  await logInternal("/redis", "GET", 200, "redis keys dumped");
  res.json({
    service: "redis-cache",
    keys: ["session:abc123", "cache:config", "queue:payments", "user:profiles"],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LAB CONTROL — إدارة حالة المعمل
// ═══════════════════════════════════════════════════════════════════════════

router.get("/lab/config", async (req, res) => {
  const userId = getStudentUserId(req);
  const config = await getLabConfig(userId);
  res.json(config);
});

router.post("/lab/config", async (req, res) => {
  const userId = getStudentUserId(req);
  const { csrfTokenEnabled, sameSite, allowlistEnabled, allowlistDomains } = req.body || {};

  const [existing] = await db.select().from(csrfLabState).where(eq(csrfLabState.userId, userId));
  if (existing) {
    await db.update(csrfLabState).set({
      csrfTokenEnabled: csrfTokenEnabled ?? existing.csrfTokenEnabled,
      sameSite: sameSite ?? existing.sameSite,
      allowlistEnabled: allowlistEnabled ?? existing.allowlistEnabled,
      allowlistDomains: allowlistDomains ?? existing.allowlistDomains,
      updatedAt: new Date(),
    }).where(eq(csrfLabState.id, existing.id));
  } else {
    await db.insert(csrfLabState).values({
      userId,
      csrfTokenEnabled: csrfTokenEnabled ?? false,
      sameSite: sameSite ?? "None",
      allowlistEnabled: allowlistEnabled ?? false,
      allowlistDomains: allowlistDomains ?? "cdn.sanaabank.com",
    });
  }

  res.json({ success: true });
});

// POST /api/lab/reset — إعادة ضبط كامل
router.post("/lab/reset", async (req, res) => {
  const userId = getStudentUserId(req);

  // Reset accounts
  await db.update(csrfLabAccounts).set({ balance: 5000, sessionId: null }).where(eq(csrfLabAccounts.username, "victim"));
  await db.update(csrfLabAccounts).set({ balance: 0, sessionId: null }).where(eq(csrfLabAccounts.username, "attacker"));

  // Clear transactions
  await db.execute(sql`DELETE FROM csrf_lab_transactions`);

  // Clear internal logs
  await db.execute(sql`DELETE FROM csrf_lab_internal_log`);

  // Reset lab state
  await db.update(csrfLabState).set({
    csrfTokenEnabled: false, sameSite: "None", allowlistEnabled: false,
    allowlistDomains: "cdn.sanaabank.com", updatedAt: new Date(),
  }).where(eq(csrfLabState.userId, userId));

  // Ensure accounts exist
  const [victim] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.username, "victim"));
  if (!victim) {
    await db.insert(csrfLabAccounts).values({ username: "victim", balance: 5000 });
  }
  const [attacker] = await db.select().from(csrfLabAccounts).where(eq(csrfLabAccounts.username, "attacker"));
  if (!attacker) {
    await db.insert(csrfLabAccounts).values({ username: "attacker", balance: 0 });
  }

  // Ensure fake secrets exist
  const [secret] = await db.select().from(csrfLabSecrets).limit(1);
  if (!secret) {
    await db.insert(csrfLabSecrets).values([
      { key: "AWS_ACCESS_KEY_ID", value: "AKIAIOSFODNN7EXAMPLE" },
      { key: "AWS_SECRET_ACCESS_KEY", value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "DB_PASSWORD", value: "sup3r_s3cr3t_p4ssw0rd" },
      { key: "API_KEY", value: "sk-prod-8f3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c" },
    ]);
  }

  res.json({ success: true, message: "تم إعادة ضبط المعمل" });
});

// GET /api/lab/evidence — لوحة الأدلة (DB، سجل المعاملات، سجل داخلي)
router.get("/lab/evidence", async (req, res) => {
  const accounts = await db.select().from(csrfLabAccounts);
  const transactions = await db.select().from(csrfLabTransactions).orderBy(desc(csrfLabTransactions.createdAt)).limit(10);
  const internalLogs = await db.select().from(csrfLabInternalLog).orderBy(desc(csrfLabInternalLog.createdAt)).limit(10);

  res.json({ accounts, transactions, internalLogs });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVIL PAGE — صفحة المهاجم
// ═══════════════════════════════════════════════════════════════════════════

router.get("/lab/evil", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏆 لقد ربحت جائزة!</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; direction: rtl; }
body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #1a0a2e; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.card { background: linear-gradient(135deg, #2d1b4e, #1a0a2e); border: 2px solid #ffd700; border-radius: 24px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 0 60px rgba(255,215,0,0.15); }
.emoji { font-size: 64px; margin-bottom: 16px; }
h1 { font-size: 22px; color: #ffd700; margin-bottom: 12px; }
p { color: #ccc; font-size: 14px; margin-bottom: 20px; }
.btn { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; border: none; padding: 14px 32px; border-radius: 16px; font-size: 16px; font-weight: bold; cursor: pointer; transition: transform 0.2s; width: 100%; }
.btn:hover { transform: scale(1.03); }
.note { color: #666; font-size: 10px; margin-top: 12px; }
.hidden-form { display: none; }
.status { margin-top: 16px; padding: 12px; border-radius: 12px; font-size: 13px; }
.status.success { background: #1a3a1a; color: #4ade80; border: 1px solid #4ade80; }
.status.error { background: #3a1a1a; color: #f87171; border: 1px solid #f87171; }
.origin-badge { background: #e53e3e; color: #fff; font-size: 10px; padding: 4px 8px; border-radius: 8px; margin-bottom: 12px; display: inline-block; }
</style>
</head>
<body>
<div class="card">
  <div class="origin-badge">⚠️ موقع خارجي: evil.attacker.com</div>
  <div class="emoji">🎁</div>
  <h1>مبروك! لقد ربحت 10,000 ريال!</h1>
  <p>اضغط الزر بالأسفل لاستلام جائزتك فوراً</p>
  <button class="btn" onclick="attack()">استلام الجائزة 🎉</button>
  <p class="note">* الزر يقوم بتحويل 5,000 ريال من حسابك لحساب المهاجم</p>
  <div id="status"></div>
</div>

<script>
async function attack() {
  const status = document.getElementById('status');
  status.innerHTML = '<div class="status">⏳ جاري إرسال الطلب...</div>';
  
  try {
    // هذا هو جوهر CSRF: نرسل طلب POST للبنك من موقع خارجي
    // المتصفح سيرفق كوكيز الجلسة تلقائياً!
    const res = await fetch('/api/lab/bank/transfer', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'attacker', amount: 5000 })
    });
    
    const data = await res.json();
    
    if (data.success) {
      status.innerHTML = '<div class="status success">✅ تم التحويل! الرصيد المتبقي: ' + data.newBalance + ' ريال<br><small>هذا هجوم CSRF — الطلب أُرسل من موقع خارجي مع كوكي الجلسة الخاص بك</small></div>';
    } else {
      status.innerHTML = '<div class="status error">❌ فشل التحويل: ' + (data.message || data.error) + '<br><small>الدفاع نجح في منع الهجوم!</small></div>';
    }
  } catch(e) {
    status.innerHTML = '<div class="status error">❌ خطأ: ' + e.message + '</div>';
  }
}
</script>
</body>
</html>`);
});

export default router;
