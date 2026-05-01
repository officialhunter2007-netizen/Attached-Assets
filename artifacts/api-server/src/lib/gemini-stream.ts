/**
 * Gemini teaching stream helper — OPENROUTER-ONLY (since May 2026).
 *
 * Per product policy student turns are Gemini Flash ONLY. The user's
 * direct Google AI Studio key is hard-capped (free tier) and cannot be
 * billed, so we removed the Google-direct fallback channel entirely.
 * Every student turn now goes through the same single channel:
 *
 *     openrouter.ai (OpenAI-compatible) → google/gemini-2.0-flash-001
 *     Auth: OPENROUTER_API_KEY  (only; see lib/openrouter-key.ts)
 *
 * Why ONLY OPENROUTER_API_KEY (no fallback to other env vars)?
 *   We previously also accepted AI_INTEGRATIONS_OPENAI_API_KEY as a
 *   fallback. That was a footgun: AI_INTEGRATIONS_OPENAI_API_KEY is the
 *   OpenAI integration key Replit injects automatically, and it points
 *   at api.openai.com — sending it to openrouter.ai produces a 401
 *   "auth_error" that silently kills the teacher. We now read the key
 *   from a single source and validate its prefix at startup so the
 *   operator gets a clear admin alert instead of a mysterious outage.
 *
 * Why no fallback channel at all?
 *   • Google direct failed silently when the free quota was burned,
 *     leaving us thinking we had a fallback when we did not.
 *   • A single billable channel is easier to monitor (admin sees one
 *     credit balance, one error stream).
 *   • When OpenRouter actually fails we WANT the operator to know and
 *     top up — see `recordAdminAlert(...)` below.
 *
 * Error model (unchanged shape for backward compatibility with /ai/teach):
 *   GeminiAuthError      → 401/403 (key wrong or missing)
 *   GeminiTransientError → 429/5xx/network after one in-channel retry
 *   GeminiBadOutputError → content_filter OR < MIN_USEFUL_RESPONSE chars
 *   GeminiClientError    → 400/422 (our request shape is wrong)
 *
 *   NEW: GeminiCreditExhaustedError → 402 / "insufficient_credits" /
 *        OpenRouter quota messages. Subclass of GeminiAuthError so the
 *        existing /ai/teach catch-all keeps working, but the route can
 *        check `instanceof GeminiCreditExhaustedError` to surface the
 *        clearer Arabic "service paused" message instead of the generic
 *        "transient error" apology — and an admin alert is automatically
 *        recorded so the operator sees it on the dashboard.
 *
 * Mid-stream errors (any byte already on the wire) are NEVER retried:
 * a retry would duplicate text on the SSE stream.
 */

import { recordAdminAlert } from "./admin-alerts";
import { getOpenRouterKey, diagnoseOpenRouterKey } from "./openrouter-key";

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const MIN_USEFUL_RESPONSE = 20;

/** Maps internal short model names → OpenRouter full IDs. */
function toOpenRouterModel(model: string): string {
  const map: Record<string, string> = {
    "gemini-2.5-flash":      "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
    "gemini-2.5-pro":        "google/gemini-2.5-pro",
    "gemini-2.0-flash":      "google/gemini-2.0-flash-001",
    "gemini-2.0-flash-lite": "google/gemini-2.0-flash-lite-001",
    "gemini-1.5-flash":      "google/gemini-flash-1.5",
    "gemini-1.5-pro":        "google/gemini-pro-1.5",
  };
  return map[model] ?? (model.includes("/") ? model : `google/${model}`);
}

export type GeminiPartial = {
  emittedAnyChunk?: boolean;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  } | null;
  partialResponseChars?: number;
};

export class GeminiAuthError extends Error {
  partial: GeminiPartial;
  constructor(message: string, partial: GeminiPartial = {}) {
    super(message);
    this.name = "GeminiAuthError";
    this.partial = partial;
  }
}

/**
 * Subclass of GeminiAuthError fired when OpenRouter returns 402, an
 * `insufficient_credits` error code, or any other "your account is
 * out of money" signal. The /ai/teach route checks for this class
 * specifically to show a clearer Arabic message + the admin panel
 * shows a critical alert with a "top up OpenRouter" call to action.
 */
export class GeminiCreditExhaustedError extends GeminiAuthError {
  detail: string;
  constructor(detail: string, partial: GeminiPartial = {}) {
    super(`OpenRouter credit exhausted: ${detail}`, partial);
    this.name = "GeminiCreditExhaustedError";
    this.detail = detail;
  }
}

export class GeminiTransientError extends Error {
  status: number;
  partial: GeminiPartial;
  constructor(message: string, status: number, partial: GeminiPartial = {}) {
    super(message);
    this.name = "GeminiTransientError";
    this.status = status;
    this.partial = partial;
  }
}
export class GeminiBadOutputError extends Error {
  reason: string;
  finishReason?: string;
  fullResponse: string;
  partial: GeminiPartial;
  constructor(
    reason: string,
    opts: { finishReason?: string; fullResponse: string; partial?: GeminiPartial },
  ) {
    super(`Gemini produced unusable output: ${reason}`);
    this.name = "GeminiBadOutputError";
    this.reason = reason;
    this.finishReason = opts.finishReason;
    this.fullResponse = opts.fullResponse;
    this.partial = opts.partial ?? {};
  }
}
export class GeminiClientError extends Error {
  status: number;
  body: string;
  partial: GeminiPartial;
  constructor(message: string, status: number, body: string, partial: GeminiPartial = {}) {
    super(message);
    this.name = "GeminiClientError";
    this.status = status;
    this.body = body;
    this.partial = partial;
  }
}

export type GeminiMessage = { role: "user" | "assistant"; content: string };

export type StreamGeminiArgs = {
  systemPrompt: string;
  messages: GeminiMessage[];
  maxOutputTokens: number;
  model: string;
  temperature?: number;
  topP?: number;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  logTag?: string;
};

export type StreamGeminiResult = {
  fullResponse: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  finishReason: string | undefined;
  attempts: number;
  model: string;
  /** Always "openrouter" now — kept for backward compatibility with
   *  existing telemetry consumers that read this field. */
  channel: "openrouter";
};

type AttemptResult = {
  fullResponse: string;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    cachedContentTokenCount: number;
  } | null;
  finishReason: string | undefined;
  emittedAnyChunk: boolean;
};

// ────────────────────────────────────────────────────────────────────────────
// Credit-exhaustion sniffer
// ────────────────────────────────────────────────────────────────────────────

/**
 * OpenRouter signals "you're out of money" in several inconsistent ways
 * depending on which upstream model rejected the request:
 *   - HTTP 402 Payment Required (the canonical case)
 *   - HTTP 429 with body containing "insufficient_credits" / "credit"
 *   - HTTP 403 with body containing "insufficient credits"
 *   - error.code === "insufficient_quota" (OpenAI-shape leak)
 * This helper checks all of them so we never misclassify a credit
 * outage as a transient error.
 */
function isCreditExhausted(status: number, body: string): boolean {
  if (status === 402) return true;
  const lower = body.toLowerCase();
  if (lower.includes("insufficient_credits")) return true;
  if (lower.includes("insufficient credits")) return true;
  if (lower.includes("insufficient_quota")) return true;
  if (lower.includes("payment required")) return true;
  if (lower.includes("out of credit")) return true;
  if (lower.includes("upgrade your plan")) return true;
  return false;
}

/**
 * Fire-and-forget admin-panel alert when OpenRouter says we are out of
 * credit. recordAdminAlert is itself fire-and-forget and de-duplicates
 * over 30 minutes so calling this on every failed request is safe.
 */
function notifyCreditsExhausted(status: number, body: string, model: string, logTag?: string): void {
  void recordAdminAlert({
    type: "openrouter_insufficient_credits",
    severity: "critical",
    title: "نفد رصيد OpenRouter — المعلم الذكي متوقف",
    message:
      "خدمة المعلم الذكي توقفت لأن رصيد حساب OpenRouter وصل إلى الصفر. " +
      "ادخل إلى openrouter.ai/credits وقم بالشحن لاستعادة الخدمة فوراً.",
    metadata: {
      provider: "openrouter",
      status,
      model,
      logTag,
      bodyExcerpt: body.slice(0, 400),
      detectedAt: new Date().toISOString(),
    },
  });
}

/**
 * Admin alert for repeated auth failures (wrong/expired key). Different
 * fix from credits — operator needs to rotate the key.
 */
function notifyAuthFailure(status: number, body: string, model: string, logTag?: string): void {
  void recordAdminAlert({
    type: "openrouter_auth_failed",
    severity: "critical",
    title: "فشل المصادقة على OpenRouter — المعلم الذكي متوقف",
    message:
      "OpenRouter رفض مفتاح API الحالي (auth error). تأكّد من أن OPENROUTER_API_KEY في ملف البيئة صحيح ولم ينتهِ. " +
      "أعد تشغيل خدمة API بعد التحديث.",
    metadata: {
      provider: "openrouter",
      status,
      model,
      logTag,
      bodyExcerpt: body.slice(0, 400),
      detectedAt: new Date().toISOString(),
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Channel: OpenRouter (the only channel)
// ────────────────────────────────────────────────────────────────────────────

function buildOpenRouterRequestBody(args: StreamGeminiArgs): string {
  const messages: { role: string; content: string }[] = [
    { role: "system", content: args.systemPrompt },
    ...args.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];
  return JSON.stringify({
    model: toOpenRouterModel(args.model),
    messages,
    temperature: args.temperature ?? 0.6,
    top_p: args.topP ?? 0.95,
    max_tokens: args.maxOutputTokens,
    stream: true,
    stream_options: { include_usage: true },
  });
}

async function attemptOpenRouter(args: StreamGeminiArgs, apiKey: string): Promise<AttemptResult> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const orModel = toOpenRouterModel(args.model);

  // Always log the exact OpenRouter model we are about to call so that
  // anyone reading `docker compose logs api` can verify in seconds that
  // the live traffic is on `google/gemini-2.0-flash-001` and not on a
  // stale version of the build.
  console.log(
    `[gemini-stream:openrouter] → ${orModel}${args.logTag ? ` (tag=${args.logTag})` : ""}`,
  );

  let emittedAnyChunk = false;
  let fullResponse = "";
  let finishReason: string | undefined;
  let usageRaw: any = null;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_DOMAIN ?? "https://nukhba.app",
      "X-Title": "Nukhba",
    },
    body: buildOpenRouterRequestBody(args),
    signal: args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    const partial: GeminiPartial = { emittedAnyChunk: false, usageMetadata: null, partialResponseChars: 0 };
    console.warn(
      `[gemini-stream:openrouter] HTTP ${r.status} for model=${orModel}: ${errBody.slice(0, 300)}`,
    );

    // Credit-exhaustion gets first priority over both auth and transient
    // classification — same 402/429 might otherwise be misread as merely
    // rate-limited and trigger unnecessary retries that all fail.
    if (isCreditExhausted(r.status, errBody)) {
      notifyCreditsExhausted(r.status, errBody, orModel, args.logTag);
      throw new GeminiCreditExhaustedError(
        `HTTP ${r.status} ${errBody.slice(0, 200)}`,
        partial,
      );
    }
    if (r.status === 401 || r.status === 403) {
      notifyAuthFailure(r.status, errBody, orModel, args.logTag);
      throw new GeminiAuthError(`OpenRouter auth ${r.status}: ${errBody.slice(0, 200)}`, partial);
    }
    if (TRANSIENT_HTTP.has(r.status)) {
      throw new GeminiTransientError(
        `OpenRouter transient ${r.status}: ${errBody.slice(0, 200)}`,
        r.status,
        partial,
      );
    }
    if (r.status === 404) {
      throw new GeminiTransientError(
        `OpenRouter model not available (404): ${errBody.slice(0, 200)}`,
        r.status,
        partial,
      );
    }
    throw new GeminiClientError(`OpenRouter client error ${r.status}`, r.status, errBody.slice(0, 500), partial);
  }
  if (!r.body) {
    throw new GeminiTransientError("OpenRouter returned no response body", 0, {
      emittedAnyChunk: false, usageMetadata: null, partialResponseChars: 0,
    });
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          // OpenRouter occasionally streams a final error frame instead
          // of an HTTP-level error — catch credit-exhaustion there too.
          if (parsed?.error) {
            const errCode = String(parsed.error?.code ?? "");
            const errMsg = String(parsed.error?.message ?? "");
            const combined = `${errCode} ${errMsg}`;
            if (isCreditExhausted(parsed.error?.status ?? 0, combined)) {
              notifyCreditsExhausted(parsed.error?.status ?? 0, combined, orModel, args.logTag);
              throw new GeminiCreditExhaustedError(combined, {
                emittedAnyChunk,
                usageMetadata: usageRaw
                  ? {
                      promptTokenCount: usageRaw.prompt_tokens ?? 0,
                      candidatesTokenCount: usageRaw.completion_tokens ?? 0,
                      cachedContentTokenCount: usageRaw.prompt_tokens_details?.cached_tokens ?? 0,
                    }
                  : null,
                partialResponseChars: fullResponse.length,
              });
            }
          }
          if (parsed?.usage) usageRaw = parsed.usage;
          const choice = parsed?.choices?.[0];
          if (choice?.finish_reason) finishReason = String(choice.finish_reason);
          const text = choice?.delta?.content;
          if (typeof text === "string" && text.length > 0) {
            fullResponse += text;
            emittedAnyChunk = true;
            args.onChunk(text);
          }
        } catch (innerErr: any) {
          if (innerErr instanceof GeminiCreditExhaustedError) throw innerErr;
          // ignore non-JSON keep-alives
        }
      }
    }
  } catch (err: any) {
    const partial: GeminiPartial = {
      emittedAnyChunk,
      usageMetadata: usageRaw
        ? {
            promptTokenCount: usageRaw.prompt_tokens ?? 0,
            candidatesTokenCount: usageRaw.completion_tokens ?? 0,
            cachedContentTokenCount: usageRaw.prompt_tokens_details?.cached_tokens ?? 0,
          }
        : null,
      partialResponseChars: fullResponse.length,
    };
    if (
      err instanceof GeminiAuthError ||
      err instanceof GeminiTransientError ||
      err instanceof GeminiBadOutputError ||
      err instanceof GeminiClientError
    ) {
      err.partial = partial;
      throw err;
    }
    throw new GeminiTransientError(
      `OpenRouter stream interrupted: ${String(err?.message ?? err).slice(0, 200)}`,
      0,
      partial,
    );
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  return {
    fullResponse,
    usageMetadata: usageRaw
      ? {
          promptTokenCount: Number(usageRaw.prompt_tokens ?? 0),
          candidatesTokenCount: Number(usageRaw.completion_tokens ?? 0),
          cachedContentTokenCount: Number(usageRaw.prompt_tokens_details?.cached_tokens ?? 0),
        }
      : null,
    finishReason,
    emittedAnyChunk,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public entrypoint
// ────────────────────────────────────────────────────────────────────────────

// Validate the OpenRouter key shape ONCE at module load. If the
// operator pasted an OpenAI key (sk-... / sk-proj-...) or an Anthropic
// key (sk-ant-...) into OPENROUTER_API_KEY by mistake, OpenRouter will
// reject every request with 401 — exactly the regression that kept
// surfacing as "openrouter_auth_failed" alerts. We surface this at
// startup with a critical admin alert so the operator can fix it
// without waiting for a student to be silenced.
{
  const dx = diagnoseOpenRouterKey();
  if (dx.format === "missing") {
    console.error(
      "[gemini-stream] STARTUP: OPENROUTER_API_KEY not set. " +
        "Every /ai/teach call will fail and the admin will be notified.",
    );
  } else if (dx.format === "invalid_openai" || dx.format === "invalid_anthropic") {
    console.error(
      `[gemini-stream] STARTUP: OPENROUTER_API_KEY appears to be a ${
        dx.format === "invalid_openai" ? "raw OpenAI" : "raw Anthropic"
      } key (length=${dx.length}, tail=...${dx.tail}). ` +
        "OpenRouter will return 401. Get an OpenRouter key from openrouter.ai/keys (starts with sk-or-).",
    );
    void recordAdminAlert({
      type: "openrouter_key_wrong_provider",
      severity: "critical",
      title: "مفتاح OPENROUTER_API_KEY يبدو من خدمة أخرى",
      message: dx.reason,
      metadata: {
        detectedAt: new Date().toISOString(),
        format: dx.format,
        keyLength: dx.length,
        keyTail: dx.tail,
      },
    });
  } else {
    console.log(
      `[gemini-stream] STARTUP: OpenRouter channel active (gemini-flash, key tail=...${dx.tail}, format=${dx.format})`,
    );
  }
}

/**
 * RADICAL MODEL LOCK (May 2026)
 *
 * `streamGeminiTeaching` is used **exclusively** by student-facing teaching
 * routes (`/ai/teach`, `/ai/platform-help`). Product policy says: every
 * student turn that goes through this helper MUST bill at the cheapest
 * Gemini Flash rate (2.0-Flash on OpenRouter). Anything else — a stale
 * call site, a future regression, an admin who forgets to update a
 * constant — would silently 6× our spend on every reply.
 *
 * The lock below ENFORCES that invariant at runtime: regardless of what
 * the caller passes in `args.model`, the request that hits OpenRouter is
 * always `gemini-2.0-flash`. Mismatches are logged loudly so a regression
 * is visible in the very first request.
 *
 * Admin OCR (`routes/materials.ts`) deliberately uses `generateGeminiJson`
 * from `lib/openrouter-generate.ts`, NOT this helper, so the lock here
 * does not affect 2.5-Flash/2.5-Pro accuracy work for the admin side.
 */
const TEACHING_MODEL_LOCK = "gemini-2.0-flash" as const;

export async function streamGeminiTeaching(args: StreamGeminiArgs): Promise<StreamGeminiResult> {
  // Hard lock: refuse to honor any non-2.0-Flash caller value. We log a
  // warning so the regression is visible in `docker compose logs api`.
  if (args.model !== TEACHING_MODEL_LOCK) {
    console.warn(
      `[gemini-stream] MODEL LOCK ENFORCED${args.logTag ? `:${args.logTag}` : ""}: caller requested "${args.model}" — forcing "${TEACHING_MODEL_LOCK}" (student teaching is permanently locked to 2.0-Flash by product policy).`,
    );
    args = { ...args, model: TEACHING_MODEL_LOCK };
  }
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    // Surface as auth error so /ai/teach can emit the friendly apology
    // and roll back the quota. Operator MUST set OPENROUTER_API_KEY.
    void recordAdminAlert({
      type: "openrouter_key_missing",
      severity: "critical",
      title: "مفتاح OpenRouter غير مضبوط",
      message:
        "متغيّر OPENROUTER_API_KEY مفقود من ملف البيئة. كل طلبات المعلم الذكي ستفشل حتى يتم إضافته. " +
        "أضفه إلى ملف .env ثم أعد تشغيل الخدمة.",
      metadata: { detectedAt: new Date().toISOString() },
    });
    throw new GeminiAuthError(
      "OPENROUTER_API_KEY is not set — Gemini teaching disabled",
    );
  }

  let attempts = 0;
  let lastErr: any = null;
  let result: AttemptResult | null = null;

  // Single channel, but allow ONE in-channel retry with 600ms backoff
  // for pre-stream transient failures (network blip, brief 5xx). Mid-
  // stream errors abort the loop because partial bytes already reached
  // the student.
  let chTries = 0;
  while (chTries < 2) {
    chTries++;
    attempts++;
    try {
      result = await attemptOpenRouter(args, apiKey);
      break;
    } catch (err: any) {
      lastErr = err;

      if (err instanceof GeminiBadOutputError) {
        // SAFETY/content_filter from OpenRouter — no other channel to
        // try, so surface to caller. If bytes already flowed, we abort
        // anyway (cannot retry without duplicating text).
        if (err.partial?.emittedAnyChunk) throw err;
        throw err;
      }
      if (err?.partial?.emittedAnyChunk) {
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] mid-stream error (no retry): ${err?.name || "Error"} ${err?.message || err}`,
        );
        throw err;
      }
      if (args.signal?.aborted) throw err;
      if (err instanceof GeminiClientError) throw err;
      // Auth (including credits) — retrying with same key cannot help.
      if (err instanceof GeminiAuthError) {
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] auth/credit failure (no retry): ${err?.name || "Error"} ${err?.message || err}`,
        );
        throw err;
      }
      // Transient → one retry with backoff.
      if (chTries < 2) {
        await new Promise((r) => setTimeout(r, 600));
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] retry pre-stream (${err?.status ?? "?"}): ${err?.name || "Error"} ${err?.message || err}`,
        );
        continue;
      }
      // Retry budget exhausted.
      console.warn(
        `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] exhausted retries (${err?.name})`,
      );
      // Repeated transient failures look like an outage to operators —
      // raise a less-severe alert so they can investigate.
      void recordAdminAlert({
        type: "openrouter_transient_repeated",
        severity: "warning",
        title: "OpenRouter يفشل بشكل متكرر",
        message:
          "OpenRouter رجّع خطأ مؤقت (429/5xx/شبكة) مع إعادة محاولة لم تنجح. " +
          "إذا تكرّر هذا الإنذار خلال 30 دقيقة، تحقّق من حالة openrouter.ai/health.",
        metadata: {
          status: err?.status ?? 0,
          message: String(err?.message ?? err).slice(0, 400),
          model: toOpenRouterModel(args.model),
          logTag: args.logTag,
        },
      });
      throw err;
    }
  }

  if (!result) {
    if (
      lastErr instanceof GeminiAuthError ||
      lastErr instanceof GeminiTransientError ||
      lastErr instanceof GeminiClientError ||
      lastErr instanceof GeminiBadOutputError
    ) {
      throw lastErr;
    }
    throw new GeminiTransientError(
      `OpenRouter failed: ${String(lastErr?.message ?? lastErr).slice(0, 200)}`,
      0,
      lastErr?.partial ?? {},
    );
  }

  // Bad-output detection (post-stream).
  const finishReason = result.finishReason;
  const trimmedLen = result.fullResponse.trim().length;
  const partialOnBadOutput: GeminiPartial = {
    emittedAnyChunk: result.emittedAnyChunk,
    usageMetadata: result.usageMetadata,
    partialResponseChars: result.fullResponse.length,
  };
  if (
    finishReason === "content_filter" ||
    finishReason === "SAFETY" ||
    finishReason === "RECITATION" ||
    finishReason === "PROHIBITED_CONTENT" ||
    finishReason === "BLOCKLIST"
  ) {
    throw new GeminiBadOutputError(`finish_reason=${finishReason}`, {
      finishReason,
      fullResponse: result.fullResponse,
      partial: partialOnBadOutput,
    });
  }
  if (trimmedLen < MIN_USEFUL_RESPONSE) {
    throw new GeminiBadOutputError(
      `response too short (${trimmedLen} chars; finish_reason=${finishReason ?? "unknown"})`,
      { finishReason, fullResponse: result.fullResponse, partial: partialOnBadOutput },
    );
  }

  const u = result.usageMetadata;
  return {
    fullResponse: result.fullResponse,
    inputTokens: Number(u?.promptTokenCount ?? 0),
    outputTokens: Number(u?.candidatesTokenCount ?? 0),
    cachedInputTokens: Number(u?.cachedContentTokenCount ?? 0),
    finishReason: result.finishReason,
    attempts,
    model: args.model,
    channel: "openrouter",
  };
}
