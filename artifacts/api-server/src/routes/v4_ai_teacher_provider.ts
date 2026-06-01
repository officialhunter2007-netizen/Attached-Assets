// ─────────────────────────────────────────────────────────────────────────────
// Admin routes — AI teacher provider settings (custom OpenAI-compatible
// provider for the v4 smart teacher ONLY: teaching chat + lesson content gen).
//
// Singleton row (id = 1). API keys are NEVER stored here — only the NAME of
// the .env var that holds the key. When disabled or misconfigured the teacher
// falls back to the default OpenRouter + gemini-2.0-flash channel.
//
// All endpoints require `role = 'admin'`. Mutating endpoints additionally
// require the same same-origin + X-Nukhba-Csrf defense used by the other v4
// admin routes (app-wide CORS is origin:true/credentials:true).
//
// Mounted under /api by app.ts, so paths here are relative to /api.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, aiTeacherProviderSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  getTeacherProviderStatus,
  normaliseEndpoint,
} from "../lib/ai-teacher-provider";

const router: IRouter = Router();

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
  (req as any).adminUserId = uid;
  next();
}

// Same CSRF defense as v4_admin_instructions: custom header + same-origin.
function requireSameOriginCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return;
  }
  const host = (req.headers.host || "").toLowerCase();
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();
  const sourceHost = origin
    ? (() => { try { return new URL(origin).host; } catch { return ""; } })()
    : referer
      ? (() => { try { return new URL(referer).host; } catch { return ""; } })()
      : "";
  if (!sourceHost || sourceHost !== host) {
    res.status(403).json({ error: "CSRF protection: cross-origin request rejected" });
    return;
  }
  next();
}

// ── GET /admin/ai-teacher-provider ───────────────────────────────────────────
// Admin status (never exposes the key value — only keyPresent + keyTail).
router.get("/admin/ai-teacher-provider", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await getTeacherProviderStatus();
    res.json(status);
  } catch (err: any) {
    logger.error({ err: err?.message }, "ai-teacher-provider: status read failed");
    res.status(500).json({ error: "تعذّر قراءة إعدادات مزوّد المعلم" });
  }
});

// ── PUT /admin/ai-teacher-provider ───────────────────────────────────────────
// Upsert the singleton row. Body: { enabled, baseUrl, apiKeyEnv, model }.
router.put("/admin/ai-teacher-provider", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as any).adminUserId as number;

  const enabled = req.body?.enabled === true || req.body?.enabled === "true";
  const baseUrl = typeof req.body?.baseUrl === "string" ? req.body.baseUrl.trim() : "";
  const apiKeyEnv = typeof req.body?.apiKeyEnv === "string" ? req.body.apiKeyEnv.trim() : "";
  const model = typeof req.body?.model === "string" ? req.body.model.trim() : "";

  // Validate lengths to keep the row sane.
  if (baseUrl.length > 300) { res.status(400).json({ error: "الرابط طويل جداً" }); return; }
  if (apiKeyEnv.length > 120) { res.status(400).json({ error: "اسم متغيّر المفتاح طويل جداً" }); return; }
  if (model.length > 200) { res.status(400).json({ error: "اسم النموذج طويل جداً" }); return; }

  // When enabling, base URL + env-var name are required (model may be left
  // empty for the admin to fill later — the resolver treats an empty model as
  // "not configured" and falls back to the default channel automatically).
  if (baseUrl) {
    if (!/^https?:\/\//i.test(baseUrl)) {
      res.status(400).json({ error: "الرابط يجب أن يبدأ بـ http:// أو https://" });
      return;
    }
    try { new URL(baseUrl); } catch { res.status(400).json({ error: "رابط غير صالح" }); return; }
  }
  if (apiKeyEnv && !/^[A-Z0-9_]+$/i.test(apiKeyEnv)) {
    res.status(400).json({ error: "اسم متغيّر المفتاح يجب أن يحوي حروفاً/أرقاماً/شرطة سفلية فقط" });
    return;
  }
  if (enabled && (!baseUrl || !apiKeyEnv)) {
    res.status(400).json({ error: "للتفعيل: أدخل رابط المزوّد واسم متغيّر المفتاح على الأقل" });
    return;
  }

  try {
    const [row] = await db
      .insert(aiTeacherProviderSettingsTable)
      .values({
        id: 1,
        enabled,
        baseUrl,
        apiKeyEnv,
        model,
        updatedByUserId: adminId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiTeacherProviderSettingsTable.id,
        set: { enabled, baseUrl, apiKeyEnv, model, updatedByUserId: adminId, updatedAt: new Date() },
      })
      .returning();

    // Return the safe status (with key presence) rather than the raw row.
    const status = await getTeacherProviderStatus();
    logger.info({ adminId, enabled, baseUrl, apiKeyEnv, model }, "ai-teacher-provider: settings updated");
    res.json({ ok: true, row: { id: row.id }, status });
  } catch (err: any) {
    logger.error({ err: err?.message }, "ai-teacher-provider: settings update failed");
    res.status(500).json({ error: "تعذّر حفظ إعدادات مزوّد المعلم" });
  }
});

// ── POST /admin/ai-teacher-provider/test ─────────────────────────────────────
// Live connectivity probe: send a 1-token chat-completions request to the
// configured (or supplied) provider and report success/failure. Never returns
// the key value. Uses the supplied body if present, else the saved settings.
router.post("/admin/ai-teacher-provider/test", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  // Allow testing unsaved form values (so the admin can verify before saving),
  // falling back to the persisted row when a field is omitted.
  const [saved] = await db
    .select()
    .from(aiTeacherProviderSettingsTable)
    .where(eq(aiTeacherProviderSettingsTable.id, 1))
    .limit(1);

  const baseUrl = (typeof req.body?.baseUrl === "string" && req.body.baseUrl.trim())
    ? req.body.baseUrl.trim()
    : String(saved?.baseUrl || "").trim();
  const apiKeyEnv = (typeof req.body?.apiKeyEnv === "string" && req.body.apiKeyEnv.trim())
    ? req.body.apiKeyEnv.trim()
    : String(saved?.apiKeyEnv || "").trim();
  const model = (typeof req.body?.model === "string" && req.body.model.trim())
    ? req.body.model.trim()
    : String(saved?.model || "").trim();

  if (!baseUrl || !apiKeyEnv || !model) {
    res.status(400).json({ ok: false, error: "أدخل رابط المزوّد واسم متغيّر المفتاح والنموذج لإجراء الاختبار" });
    return;
  }
  const apiKey = String(process.env[apiKeyEnv] || "").trim();
  if (!apiKey) {
    res.status(400).json({ ok: false, error: `متغيّر البيئة ${apiKeyEnv} غير موجود في ملف .env على الخادم` });
    return;
  }

  const endpoint = normaliseEndpoint(baseUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let r: globalThis.Response;
    try {
      r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          stream: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await r.text();
    if (!r.ok) {
      res.status(200).json({
        ok: false,
        status: r.status,
        error: `المزوّد رجّع خطأ HTTP ${r.status}`,
        detail: text.slice(0, 400),
      });
      return;
    }
    // Confirm the body parses as a chat-completions-shaped response.
    let parsedOk = false;
    try {
      const j = JSON.parse(text);
      parsedOk = !!(j && (j.choices || j.id || j.object));
    } catch { parsedOk = false; }
    res.status(200).json({
      ok: true,
      status: r.status,
      parsed: parsedOk,
      endpoint,
      model,
    });
  } catch (err: any) {
    const aborted = err?.name === "AbortError";
    res.status(200).json({
      ok: false,
      error: aborted ? "انتهت مهلة الاتصال بالمزوّد (٢٠ ثانية)" : "تعذّر الاتصال بالمزوّد",
      detail: String(err?.message ?? err).slice(0, 300),
    });
  }
});

export default router;
