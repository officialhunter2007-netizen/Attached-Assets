/**
 * Non-streaming Gemini helper — OPENROUTER-ONLY (since May 2026).
 *
 * Mirrors gemini-stream.ts: the user's Google AI Studio key is hard-
 * capped on the free tier and cannot be billed, so the Google-direct
 * fallback was a fiction (failed silently when the quota burned). We
 * removed it. Every call now goes through the single billable channel:
 *
 *     openrouter.ai (OpenAI-compatible) → google/gemini-*
 *     Auth: OPENROUTER_API_KEY  (only; see lib/openrouter-key.ts)
 *
 * The key is read EXCLUSIVELY from OPENROUTER_API_KEY. We deliberately
 * do NOT fall back to AI_INTEGRATIONS_OPENAI_API_KEY (which is the
 * OpenAI integration key Replit auto-injects) — it points at
 * api.openai.com and OpenRouter rejects it with 401.
 *
 * Used by:
 *   - materials.ts: PDF OCR (ocrChunkGemini)
 *   - materials.ts: structured chapters (generateStructuredChapters)
 *   - materials.ts: file metadata (generateMaterialMetadata)
 *   - materials.ts: quiz/exam generation (generateQuestionsViaGemini)
 *   - materials.ts: short-answer grading (gradeShortAnswers)
 *   - ai.ts:        lab variant generation Gemini fallback
 *   - ai.ts:        lab build-env Gemini third pass
 *   - ai.ts:        attack-sim build Gemini fallback
 *
 * NEW error semantics: `creditsExhausted: true` flag on
 * GenerateGeminiError signals OpenRouter 402 / "insufficient_credits".
 * Call sites should check this flag and surface a clearer "service
 * paused for maintenance" message instead of the generic transient
 * apology — and an admin alert is recorded automatically.
 */

import { recordAdminAlert } from "./admin-alerts";
import { getOpenRouterKey as readOpenRouterKey } from "./openrouter-key";

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

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

/** A single content part: text or an inline file (e.g. PDF base64). */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "file"; mimeType: string; dataBase64: string };

export type GenerateGeminiArgs = {
  /** System instruction. Optional; some calls only have user content. */
  systemPrompt?: string;
  /** Single user message split into parts (text + optional inline files). */
  userParts: ContentPart[];
  /** Internal short name (e.g. "gemini-2.5-flash"); mapped per channel. */
  model: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens: number;
  /** When true, asks providers to return `application/json`. */
  jsonMode?: boolean;
  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
  /** Per-attempt fetch timeout in milliseconds. */
  timeoutMs?: number;
  /** Used in log lines so the operator can grep per-route. */
  logTag?: string;
};

export type GeminiUsageRaw = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  cachedContentTokenCount: number;
};

export type GenerateGeminiResult = {
  /** Concatenated text from all content parts. */
  text: string;
  /** Normalized usage in Google's wire format so the existing
   *  extractGeminiUsage() helper keeps working unchanged. */
  usageMetadata: GeminiUsageRaw | null;
  finishReason?: string;
  /** Always "openrouter" now — kept for backward compatibility. */
  channel: "openrouter";
  /** The exact model ID passed to OpenRouter. */
  model: string;
  /** HTTP status of the SUCCESSFUL response (always 2xx). */
  status: number;
};

/** Public, shape-stable error so call sites can map .status into 429/503/etc. */
export class GenerateGeminiError extends Error {
  status: number;
  channel: "openrouter" | "none";
  body: string;
  /** True when no provider key was configured at all. */
  unconfigured: boolean;
  /** True when the channel returned 2xx but the output was blocked/empty
   *  (SAFETY filter, content_filter, recitation, or empty body). */
  badOutput: boolean;
  /** True when OpenRouter signalled 402 / insufficient_credits / quota. */
  creditsExhausted: boolean;
  constructor(message: string, opts: {
    status: number;
    channel: "openrouter" | "none";
    body?: string;
    unconfigured?: boolean;
    badOutput?: boolean;
    creditsExhausted?: boolean;
  }) {
    super(message);
    this.name = "GenerateGeminiError";
    this.status = opts.status;
    this.channel = opts.channel;
    this.body = opts.body ?? "";
    this.unconfigured = !!opts.unconfigured;
    this.badOutput = !!opts.badOutput;
    this.creditsExhausted = !!opts.creditsExhausted;
  }
}

/** Reasons that mean "this channel cannot fulfill the request" — surface
 *  to the caller as a typed bad-output failure. */
const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "OTHER",
  "content_filter",
  "content-filter",
]);

function isBlockedFinishReason(reason: unknown): boolean {
  if (typeof reason !== "string") return false;
  return BLOCKED_FINISH_REASONS.has(reason) || BLOCKED_FINISH_REASONS.has(reason.toUpperCase());
}

/** Detects "you're out of money" across the multiple shapes OpenRouter
 *  returns depending on the upstream model. See gemini-stream.ts for the
 *  twin implementation — keep them in sync. */
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

function notifyCreditsExhausted(status: number, body: string, model: string, logTag?: string): void {
  void recordAdminAlert({
    type: "openrouter_insufficient_credits",
    severity: "critical",
    title: "نفد رصيد OpenRouter — خدمات الذكاء الاصطناعي متوقفة",
    message:
      "حساب OpenRouter وصل إلى صفر رصيد. توقّفت إجابات المعلم الذكي وتحليل الملفات وتوليد الاختبارات. " +
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

function notifyAuthFailure(status: number, body: string, model: string, logTag?: string): void {
  void recordAdminAlert({
    type: "openrouter_auth_failed",
    severity: "critical",
    title: "فشل المصادقة على OpenRouter",
    message:
      "OpenRouter رفض مفتاح API الحالي. تأكّد من أن OPENROUTER_API_KEY في ملف البيئة صحيح ولم ينتهِ.",
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

function partsToOpenRouterContent(parts: ContentPart[]): any {
  // OpenRouter follows the OpenAI multimodal content schema.
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    return {
      type: "file",
      file: {
        filename: `attachment.${p.mimeType.split("/")[1] || "bin"}`,
        file_data: `data:${p.mimeType};base64,${p.dataBase64}`,
      },
    };
  });
}

async function attemptOpenRouter(
  args: GenerateGeminiArgs,
  apiKey: string,
): Promise<GenerateGeminiResult> {
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const orModel = toOpenRouterModel(args.model);
  const messages: { role: string; content: any }[] = [];
  if (args.systemPrompt) messages.push({ role: "system", content: args.systemPrompt });
  messages.push({ role: "user", content: partsToOpenRouterContent(args.userParts) });

  const body: any = {
    model: orModel,
    messages,
    temperature: args.temperature ?? 0.4,
    top_p: args.topP ?? 0.95,
    max_tokens: args.maxOutputTokens,
  };
  if (args.jsonMode) body.response_format = { type: "json_object" };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_DOMAIN ?? "https://nukhba.app",
      "X-Title": "Nukhba",
    },
    body: JSON.stringify(body),
    signal: args.timeoutMs ? AbortSignal.any([
      args.signal ?? new AbortController().signal,
      AbortSignal.timeout(args.timeoutMs),
    ]) : args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    console.warn(
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] HTTP ${r.status} for model=${orModel}: ${errBody.slice(0, 300)}`,
    );

    if (isCreditExhausted(r.status, errBody)) {
      notifyCreditsExhausted(r.status, errBody, orModel, args.logTag);
      throw new GenerateGeminiError(
        `OpenRouter credit exhausted (HTTP ${r.status})`,
        { status: r.status, channel: "openrouter", body: errBody.slice(0, 500), creditsExhausted: true },
      );
    }
    if (r.status === 401 || r.status === 403) {
      notifyAuthFailure(r.status, errBody, orModel, args.logTag);
    }
    throw new GenerateGeminiError(
      `OpenRouter HTTP ${r.status}`,
      { status: r.status, channel: "openrouter", body: errBody.slice(0, 500) },
    );
  }

  const data: any = await r.json();
  // OpenRouter sometimes returns 200 with an `error` envelope when the
  // upstream provider rejected the request. Catch that pattern too.
  if (data?.error) {
    const errCode = String(data.error?.code ?? "");
    const errMsg = String(data.error?.message ?? "");
    const combined = `${errCode} ${errMsg}`;
    if (isCreditExhausted(0, combined)) {
      notifyCreditsExhausted(0, combined, orModel, args.logTag);
      throw new GenerateGeminiError(
        `OpenRouter credit exhausted (200 envelope)`,
        { status: 402, channel: "openrouter", body: combined.slice(0, 500), creditsExhausted: true },
      );
    }
    throw new GenerateGeminiError(
      `OpenRouter envelope error: ${combined.slice(0, 200)}`,
      { status: 500, channel: "openrouter", body: combined.slice(0, 500) },
    );
  }

  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const content = choice?.message?.content;
  let text = "";
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    for (const p of content) {
      if (typeof p?.text === "string") text += p.text;
    }
  }

  const usage = data?.usage;
  const usageMetadata: GeminiUsageRaw | null = usage
    ? {
        promptTokenCount: Number(usage.prompt_tokens ?? 0),
        candidatesTokenCount: Number(usage.completion_tokens ?? 0),
        cachedContentTokenCount: Number(usage.prompt_tokens_details?.cached_tokens ?? 0),
      }
    : null;

  if (isBlockedFinishReason(finishReason)) {
    console.warn(
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] openrouter blocked output (finish_reason=${finishReason})`,
    );
    throw new GenerateGeminiError(
      `OpenRouter blocked output (${finishReason})`,
      { status: 200, channel: "openrouter", body: String(finishReason ?? ""), badOutput: true },
    );
  }
  if (text.trim().length === 0) {
    console.warn(
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] openrouter returned empty text (finish_reason=${finishReason})`,
    );
    throw new GenerateGeminiError(
      `OpenRouter returned empty text (finish_reason=${finishReason ?? "?"})`,
      { status: 200, channel: "openrouter", body: String(finishReason ?? ""), badOutput: true },
    );
  }

  return {
    text,
    usageMetadata,
    finishReason,
    channel: "openrouter",
    model: orModel,
    status: r.status,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public entrypoint
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when an OpenRouter key is configured. Call sites use this
 * to skip optional work entirely (e.g. file metadata extraction) when no
 * Gemini channel is available.
 */
export function hasGeminiProvider(): boolean {
  return !!readOpenRouterKey();
}

function getOpenRouterKey(): string | undefined {
  return readOpenRouterKey();
}

/**
 * Generate text/JSON via Gemini through OpenRouter.
 *
 * Errors:
 *  - GenerateGeminiError with `unconfigured: true` → no OPENROUTER_API_KEY.
 *  - GenerateGeminiError with `creditsExhausted: true` → 402 / insufficient_credits.
 *    Caller should surface "service paused" message and skip retries.
 *    An admin alert was already recorded.
 *  - GenerateGeminiError with status 401/403 → auth failed (admin alerted).
 *  - GenerateGeminiError with status in TRANSIENT_HTTP → 429/5xx after one retry.
 *  - GenerateGeminiError with status 4xx (other) → request shape problem (our bug).
 *  - GenerateGeminiError with `badOutput: true` (status 200) → SAFETY/empty.
 */
export async function generateGemini(args: GenerateGeminiArgs): Promise<GenerateGeminiResult> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    void recordAdminAlert({
      type: "openrouter_key_missing",
      severity: "critical",
      title: "مفتاح OpenRouter غير مضبوط",
      message:
        "متغيّر OPENROUTER_API_KEY مفقود من ملف البيئة. خدمات الذكاء الاصطناعي معطّلة بالكامل. " +
        "أضفه إلى ملف .env ثم أعد تشغيل الخدمة.",
      metadata: { detectedAt: new Date().toISOString() },
    });
    throw new GenerateGeminiError(
      "No Gemini provider configured. Set OPENROUTER_API_KEY.",
      { status: 503, channel: "none", unconfigured: true },
    );
  }

  let lastErr: GenerateGeminiError | null = null;
  let chTries = 0;

  // Single channel, ONE in-channel retry with 600ms backoff for transients.
  while (chTries < 2) {
    chTries++;
    try {
      return await attemptOpenRouter(args, apiKey);
    } catch (err: any) {
      if (args.signal?.aborted) throw err;

      const e: GenerateGeminiError =
        err instanceof GenerateGeminiError
          ? err
          : new GenerateGeminiError(
              String(err?.message ?? err).slice(0, 200),
              { status: 0, channel: "openrouter", body: "" },
            );
      lastErr = e;

      // Credits / auth / bad-output → never retry the same channel (we don't
      // have another), and we already alerted the admin if needed.
      if (e.creditsExhausted) throw e;
      if (e.status === 401 || e.status === 403) throw e;
      if (e.badOutput) throw e;

      // Transient — one retry then surface.
      if (TRANSIENT_HTTP.has(e.status) || e.status === 0) {
        if (chTries < 2) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        // Exhausted — log a warning admin alert (de-duped over 30min).
        void recordAdminAlert({
          type: "openrouter_transient_repeated",
          severity: "warning",
          title: "OpenRouter يفشل بشكل متكرر (one-shot)",
          message:
            "نداءات Gemini غير-المتدفّقة (PDF/تصحيح/توليد اختبارات) تفشل مع 429/5xx متكرّر. " +
            "تحقّق من openrouter.ai/health.",
          metadata: {
            status: e.status,
            message: e.message.slice(0, 400),
            model: toOpenRouterModel(args.model),
            logTag: args.logTag,
          },
        });
        throw e;
      }

      // 4xx other than auth/credits — request shape problem; abort.
      throw e;
    }
  }

  throw (
    lastErr ??
    new GenerateGeminiError("OpenRouter failed without a recorded error.", {
      status: 0,
      channel: "openrouter",
    })
  );
}

/**
 * Convenience for the common text-only JSON case so call sites stay terse.
 */
export async function generateGeminiJson(opts: {
  systemPrompt?: string;
  userPrompt: string;
  model: string;
  temperature?: number;
  maxOutputTokens: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  logTag?: string;
}): Promise<GenerateGeminiResult> {
  return generateGemini({
    systemPrompt: opts.systemPrompt,
    userParts: [{ type: "text", text: opts.userPrompt }],
    model: opts.model,
    temperature: opts.temperature,
    maxOutputTokens: opts.maxOutputTokens,
    jsonMode: true,
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    logTag: opts.logTag,
  });
}
