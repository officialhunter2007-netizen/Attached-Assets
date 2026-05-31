/**
 * OpenRouter API-key helper — single source of truth.
 *
 * CRITICAL: We use the OPENROUTER_API_KEY env var EXCLUSIVELY.
 * We deliberately do NOT fall back to AI_INTEGRATIONS_OPENAI_API_KEY,
 * which is an OpenAI-issued key bound to api.openai.com (provided by
 * the Replit `openai` integration). Sending an OpenAI key to
 * https://openrouter.ai/api/v1 produces a 401 "auth_error" and silences
 * the teacher — exactly the regression that keeps surfacing in the
 * admin alerts panel.
 *
 * If you ever need to support multiple OpenRouter keys (rotation,
 * per-tenant, etc.), add them here — but never mix in keys for other
 * providers.
 */

export type OpenRouterKeyFormat =
  | "missing"
  | "valid"
  | "invalid_openai"
  | "invalid_anthropic"
  | "unknown";

export interface OpenRouterKeyDiagnosis {
  format: OpenRouterKeyFormat;
  /** Length of the key (0 if missing). Useful for "did you paste the wrong thing?" hints. */
  length: number;
  /** Last 4 chars of the key — safe to render in the admin panel; never log the full key. */
  tail: string;
  /** Human-readable Arabic explanation suitable for the admin panel. */
  reason: string;
}

/**
 * Read the configured OpenRouter API key from the environment.
 * Returns undefined when not set. Never falls back to other providers.
 */
export function getOpenRouterKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return undefined;
  // Trim because operators occasionally paste with trailing whitespace.
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Lightweight format check that does NOT call the network.
 * - sk-or-v1-... or sk-or-...   → looks like an OpenRouter key
 * - sk-proj-... or sk-...       → looks like a raw OpenAI key (wrong service!)
 * - sk-ant-...                  → looks like a raw Anthropic key (wrong service!)
 * - other                       → unknown; let OpenRouter decide
 */
export function diagnoseOpenRouterKey(): OpenRouterKeyDiagnosis {
  const key = getOpenRouterKey();
  if (!key) {
    return {
      format: "missing",
      length: 0,
      tail: "",
      reason:
        "متغيّر OPENROUTER_API_KEY غير مضبوط في ملف البيئة. أضِف المفتاح من openrouter.ai/keys إلى .env ثم أعد تشغيل الخدمة.",
    };
  }

  const tail = key.length >= 4 ? key.slice(-4) : key;

  if (/^sk-or-/i.test(key)) {
    return {
      format: "valid",
      length: key.length,
      tail,
      reason:
        "تنسيق المفتاح يبدو صحيحاً (sk-or-...). إذا استمر فشل المصادقة، قد يكون المفتاح أُبطل أو نفد رصيده.",
    };
  }
  if (/^sk-ant-/i.test(key)) {
    return {
      format: "invalid_anthropic",
      length: key.length,
      tail,
      reason:
        "هذا مفتاح Anthropic (sk-ant-...) وليس OpenRouter. الخدمتان مختلفتان — احصل على مفتاح من openrouter.ai/keys (يبدأ بـ sk-or-).",
    };
  }
  if (/^sk-(proj-)?[A-Za-z0-9_-]/.test(key)) {
    return {
      format: "invalid_openai",
      length: key.length,
      tail,
      reason:
        "هذا يبدو كمفتاح OpenAI (sk-... أو sk-proj-...) وليس OpenRouter. OpenRouter سيرفضه بـ 401. احصل على مفتاح من openrouter.ai/keys (يبدأ بـ sk-or-).",
    };
  }
  return {
    format: "unknown",
    length: key.length,
    tail,
    reason:
      "تنسيق المفتاح غير معروف. إذا فشلت المصادقة فأعد توليد المفتاح من openrouter.ai/keys (التنسيق المتوقع يبدأ بـ sk-or-).",
  };
}

/**
 * Hit OpenRouter with a tiny zero-cost request to verify the key is
 * accepted. We use GET /api/v1/auth/key which:
 *   - returns 200 + JSON (label, usage, limit, etc.) for a valid key
 *   - returns 401 for invalid/expired keys
 * It does NOT consume credits.
 *
 * Returns a structured diagnosis the admin panel can render.
 */
export interface OpenRouterPingResult {
  status: "ok" | "unauthorized" | "forbidden" | "rate_limited" | "server_error" | "network_error" | "missing";
  httpStatus: number | null;
  /** Arabic message safe to surface to the operator. */
  message: string;
  /** Raw body excerpt (first 300 chars) when the call failed — for tech-detail accordion. */
  bodyExcerpt?: string;
  /** When status === "ok", the credit summary from OpenRouter (if exposed). */
  credits?: {
    label?: string;
    usageUsd?: number;
    limitUsd?: number | null;
    isFreeTier?: boolean;
  };
}

export async function pingOpenRouter(timeoutMs = 7000): Promise<OpenRouterPingResult> {
  const key = getOpenRouterKey();
  if (!key) {
    return {
      status: "missing",
      httpStatus: null,
      message: "لا يوجد مفتاح OpenRouter مضبوط. لا يمكن إجراء الاختبار.",
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://learnukhba.com",
        "X-Title": "Nukhba Admin Health Check",
      },
      signal: ctrl.signal,
    });
    const text = await r.text().catch(() => "");

    if (r.status === 200) {
      let credits: OpenRouterPingResult["credits"] | undefined;
      try {
        const parsed = JSON.parse(text);
        const data = parsed?.data ?? parsed;
        credits = {
          label: typeof data?.label === "string" ? data.label : undefined,
          usageUsd: typeof data?.usage === "number" ? data.usage : undefined,
          limitUsd:
            typeof data?.limit === "number"
              ? data.limit
              : data?.limit === null
                ? null
                : undefined,
          isFreeTier: typeof data?.is_free_tier === "boolean" ? data.is_free_tier : undefined,
        };
      } catch {
        // ignore — body might not be JSON in some edge cases
      }
      return {
        status: "ok",
        httpStatus: 200,
        message: "OpenRouter قَبِل المفتاح. الخدمة جاهزة.",
        credits,
      };
    }
    if (r.status === 401) {
      return {
        status: "unauthorized",
        httpStatus: 401,
        message:
          "OpenRouter رفض المفتاح (401). الأسباب الأكثر شيوعاً: مفتاح خاطئ، أو مفتاح من خدمة أخرى (OpenAI/Anthropic)، أو مفتاح أُبطل من openrouter.ai/keys.",
        bodyExcerpt: text.slice(0, 300) || undefined,
      };
    }
    if (r.status === 403) {
      return {
        status: "forbidden",
        httpStatus: 403,
        message: "OpenRouter رفض الطلب (403). تحقّق من صلاحيات المفتاح.",
        bodyExcerpt: text.slice(0, 300) || undefined,
      };
    }
    if (r.status === 429) {
      return {
        status: "rate_limited",
        httpStatus: 429,
        message: "OpenRouter يحدّ من المعدّل حالياً (429). جرّب بعد دقيقة.",
        bodyExcerpt: text.slice(0, 300) || undefined,
      };
    }
    if (r.status >= 500) {
      return {
        status: "server_error",
        httpStatus: r.status,
        message: `OpenRouter يعاني من خطأ خادم (${r.status}). تحقّق من openrouter.ai/health.`,
        bodyExcerpt: text.slice(0, 300) || undefined,
      };
    }
    return {
      status: "server_error",
      httpStatus: r.status,
      message: `استجابة غير متوقّعة من OpenRouter (${r.status}).`,
      bodyExcerpt: text.slice(0, 300) || undefined,
    };
  } catch (err: any) {
    return {
      status: "network_error",
      httpStatus: null,
      message:
        err?.name === "AbortError"
          ? `انتهت مهلة الاتصال بـ OpenRouter (${timeoutMs}ms). تحقّق من اتصال الخادم بالإنترنت.`
          : `تعذّر الاتصال بـ OpenRouter: ${err?.message || "خطأ شبكة"}.`,
    };
  } finally {
    clearTimeout(timer);
  }
}
