// ─────────────────────────────────────────────────────────────────────────────
// Admin routes — AI teacher provider settings.
//
// Two independent features share one singleton row (id = 1):
//
//   1. OR Model Picker (primary): admin selects which OpenRouter model the
//      teacher uses — Gemini 2.5 Flash Lite (default), Gemini 2.5 Flash, or
//      Claude 3.5 Haiku — via `or_model_override`. No extra keys needed; the
//      existing OPENROUTER_API_KEY is reused automatically.
//
//   2. Custom Provider (advanced): admin supplies a fully custom OpenAI-
//      compatible endpoint + env-var holding the key + model id. Useful for
//      self-hosted or alternative AI providers.
//
// Priority: OR model override > custom provider > default channel.
//
// API keys are NEVER stored here — only the NAME of the env var.
// When neither feature is active the teacher uses the default channel
// (OpenRouter + gemini-2.5-flash-lite) with zero behaviour change.
//
// All endpoints require `role = 'admin'`. Mutating endpoints additionally
// require the same same-origin + X-Nukhba-Csrf defense used by the other
// v4 admin routes.
//
// Mounted under /api — paths here are relative to /api.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, aiTeacherProviderSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireSameOriginCsrf } from "../lib/csrf";
import {
  getTeacherProviderStatus,
  normaliseEndpoint,
  invalidateTeacherProviderCache,
  OR_PICKER_MODELS,
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

// ── GET /admin/ai-teacher-provider ───────────────────────────────────────────
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
// Body: { orModelOverride?, enabled?, baseUrl?, apiKeyEnv?, model? }
router.put("/admin/ai-teacher-provider", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const adminId = (req as any).adminUserId as number;

  // ── OR model picker ──────────────────────────────────────────────────────
  const orModelOverride = typeof req.body?.orModelOverride === "string"
    ? req.body.orModelOverride.trim()
    : undefined;
  if (orModelOverride !== undefined && !(orModelOverride in OR_PICKER_MODELS)) {
    res.status(400).json({ error: "نموذج غير مدعوم. اختر أحد النماذج المتاحة." });
    return;
  }

  // ── Custom provider ──────────────────────────────────────────────────────
  const enabled    = req.body?.enabled === true || req.body?.enabled === "true";
  const baseUrl    = typeof req.body?.baseUrl    === "string" ? req.body.baseUrl.trim()    : "";
  const apiKeyEnv  = typeof req.body?.apiKeyEnv  === "string" ? req.body.apiKeyEnv.trim()  : "";
  const model      = typeof req.body?.model      === "string" ? req.body.model.trim()      : "";

  if (baseUrl.length > 300)   { res.status(400).json({ error: "الرابط طويل جداً" });                     return; }
  if (apiKeyEnv.length > 120) { res.status(400).json({ error: "اسم متغيّر المفتاح طويل جداً" });         return; }
  if (model.length > 200)     { res.status(400).json({ error: "اسم النموذج طويل جداً" });               return; }
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    res.status(400).json({ error: "الرابط يجب أن يبدأ بـ http:// أو https://" }); return;
  }
  if (baseUrl) { try { new URL(baseUrl); } catch { res.status(400).json({ error: "رابط غير صالح" }); return; } }
  if (apiKeyEnv && !/^[A-Z0-9_]+$/i.test(apiKeyEnv)) {
    res.status(400).json({ error: "اسم متغيّر المفتاح يجب أن يحوي حروفاً/أرقاماً/شرطة سفلية فقط" }); return;
  }
  if (enabled && (!baseUrl || !apiKeyEnv)) {
    res.status(400).json({ error: "للتفعيل: أدخل رابط المزوّد واسم متغيّر المفتاح على الأقل" }); return;
  }

  try {
    // Read the existing row so we only overwrite what was sent.
    const [existing] = await db
      .select()
      .from(aiTeacherProviderSettingsTable)
      .where(eq(aiTeacherProviderSettingsTable.id, 1));

    const newOrModelOverride = orModelOverride !== undefined
      ? orModelOverride
      : (existing?.orModelOverride ?? "");

    const [row] = await db
      .insert(aiTeacherProviderSettingsTable)
      .values({
        id: 1,
        orModelOverride: newOrModelOverride,
        enabled,
        baseUrl,
        apiKeyEnv,
        model,
        updatedByUserId: adminId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiTeacherProviderSettingsTable.id,
        set: {
          orModelOverride: newOrModelOverride,
          enabled,
          baseUrl,
          apiKeyEnv,
          model,
          updatedByUserId: adminId,
          updatedAt: new Date(),
        },
      })
      .returning();

    invalidateTeacherProviderCache();

    const status = await getTeacherProviderStatus();
    logger.info(
      { adminId, orModelOverride: newOrModelOverride, enabled, baseUrl, apiKeyEnv, model },
      "ai-teacher-provider: settings updated",
    );
    res.json({ ok: true, row: { id: row.id }, status });
  } catch (err: any) {
    logger.error({ err: err?.message }, "ai-teacher-provider: settings update failed");
    res.status(500).json({ error: "تعذّر حفظ إعدادات مزوّد المعلم" });
  }
});

// ── POST /admin/ai-teacher-provider/test ─────────────────────────────────────
// Live connectivity probe. Works for both OR override and custom provider.
router.post("/admin/ai-teacher-provider/test", requireAdmin, requireSameOriginCsrf, async (req: Request, res: Response): Promise<void> => {
  const [saved] = await db
    .select()
    .from(aiTeacherProviderSettingsTable)
    .where(eq(aiTeacherProviderSettingsTable.id, 1))
    .limit(1);

  // When testing the OR model override, use OpenRouter URL + OPENROUTER_API_KEY.
  const orModelOverride = typeof req.body?.orModelOverride === "string"
    ? req.body.orModelOverride.trim()
    : String(saved?.orModelOverride || "").trim();

  let baseUrl: string;
  let apiKeyEnv: string;
  let model: string;

  if (orModelOverride && orModelOverride in OR_PICKER_MODELS) {
    baseUrl   = "https://openrouter.ai/api/v1";
    apiKeyEnv = "OPENROUTER_API_KEY";
    model     = orModelOverride;
  } else {
    baseUrl   = (typeof req.body?.baseUrl    === "string" && req.body.baseUrl.trim())
      ? req.body.baseUrl.trim()   : String(saved?.baseUrl    || "").trim();
    apiKeyEnv = (typeof req.body?.apiKeyEnv  === "string" && req.body.apiKeyEnv.trim())
      ? req.body.apiKeyEnv.trim() : String(saved?.apiKeyEnv  || "").trim();
    model     = (typeof req.body?.model      === "string" && req.body.model.trim())
      ? req.body.model.trim()     : String(saved?.model      || "").trim();
  }

  if (!baseUrl || !apiKeyEnv || !model) {
    res.status(400).json({ ok: false, error: "أدخل المعلومات الكافية لإجراء الاختبار" });
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
    let parsedOk = false;
    try {
      const j = JSON.parse(text);
      parsedOk = !!(j && (j.choices || j.id || j.object));
    } catch { parsedOk = false; }
    res.status(200).json({ ok: true, status: r.status, parsed: parsedOk, endpoint, model });
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
