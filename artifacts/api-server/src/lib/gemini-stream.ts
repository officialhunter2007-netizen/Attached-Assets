/**
 * Gemini teaching stream helper — routed through OpenRouter.ai
 *
 * Uses OpenRouter's OpenAI-compatible endpoint so we can access
 * Google Gemini 2.0 Flash without a direct Google API key. The
 * interface is identical to the former Google-native version:
 * callers in `/ai/teach` see no difference.
 *
 * OpenRouter endpoint:  https://openrouter.ai/api/v1/chat/completions
 * Model ID:             google/gemini-2.0-flash-001
 * Auth:                 Authorization: Bearer OPENROUTER_API_KEY
 *
 * Error model (same as before — callers don't need to change):
 *   GeminiAuthError      → 401/403. Fall back to Haiku silently.
 *   GeminiTransientError → 429/500/502/503/504. Retried once internally.
 *   GeminiBadOutputError → content_filter block OR < MIN_USEFUL_RESPONSE chars.
 *   GeminiClientError    → 400/422 (our bug). Don't retry, surface in logs.
 */

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const MIN_USEFUL_RESPONSE = 20;

/** Maps our internal short model names → OpenRouter full model IDs. */
function toOpenRouterModel(model: string): string {
  const map: Record<string, string> = {
    "gemini-2.0-flash":      "google/gemini-2.0-flash-001",
    "gemini-2.0-flash-lite": "google/gemini-2.0-flash-lite-001",
    "gemini-1.5-flash":      "google/gemini-flash-1.5",
    "gemini-1.5-pro":        "google/gemini-pro-1.5",
  };
  // If it already looks like an OpenRouter ID (contains "/"), pass through.
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
};

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
    // Ask OpenRouter to include token usage in the final streaming chunk.
    stream_options: { include_usage: true },
  });
}

async function attemptStream(
  args: StreamGeminiArgs,
  apiKey: string,
): Promise<{
  fullResponse: string;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    cachedContentTokenCount: number;
  } | null;
  finishReason: string | undefined;
  emittedAnyChunk: boolean;
}> {
  const orModel = toOpenRouterModel(args.model);
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const body = buildOpenRouterRequestBody(args);

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
    body,
    signal: args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    const partial: GeminiPartial = { emittedAnyChunk: false, usageMetadata: null, partialResponseChars: 0 };
    if (r.status === 401 || r.status === 403) {
      throw new GeminiAuthError(`OpenRouter auth ${r.status}: ${errBody.slice(0, 200)}`, partial);
    }
    if (TRANSIENT_HTTP.has(r.status)) {
      throw new GeminiTransientError(
        `OpenRouter transient ${r.status}: ${errBody.slice(0, 200)}`,
        r.status,
        partial,
      );
    }
    throw new GeminiClientError(
      `OpenRouter client error ${r.status}`,
      r.status,
      errBody.slice(0, 500),
      partial,
    );
  }
  if (!r.body) {
    throw new GeminiTransientError("OpenRouter returned no response body", 0, {
      emittedAnyChunk: false,
      usageMetadata: null,
      partialResponseChars: 0,
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
          // OpenAI-compatible usage chunk (may appear in final delta or a
          // standalone chunk with empty choices).
          if (parsed?.usage) usageRaw = parsed.usage;
          const choice = parsed?.choices?.[0];
          if (choice?.finish_reason) finishReason = String(choice.finish_reason);
          const text = choice?.delta?.content;
          if (typeof text === "string" && text.length > 0) {
            fullResponse += text;
            emittedAnyChunk = true;
            args.onChunk(text);
          }
        } catch {
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
    try {
      reader.releaseLock();
    } catch {}
  }

  // Normalise usage to the same shape the rest of the codebase expects.
  const normalisedUsage = usageRaw
    ? {
        promptTokenCount: usageRaw.prompt_tokens ?? 0,
        candidatesTokenCount: usageRaw.completion_tokens ?? 0,
        cachedContentTokenCount: usageRaw.prompt_tokens_details?.cached_tokens ?? 0,
      }
    : null;

  return { fullResponse, usageMetadata: normalisedUsage, finishReason, emittedAnyChunk };
}

export async function streamGeminiTeaching(
  args: StreamGeminiArgs,
): Promise<StreamGeminiResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new GeminiAuthError("OPENROUTER_API_KEY is not set");
  }

  let attempts = 0;
  let result: {
    fullResponse: string;
    usageMetadata: any;
    finishReason: string | undefined;
    emittedAnyChunk: boolean;
  } | null = null;

  while (attempts < 2) {
    attempts++;
    try {
      result = await attemptStream(args, apiKey);
      break;
    } catch (err: any) {
      if (err instanceof GeminiAuthError || err instanceof GeminiClientError) {
        throw err;
      }
      // Never retry after any chunk reached the student — would duplicate text.
      if (err?.partial?.emittedAnyChunk) {
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] mid-stream error after emitting chunks (no retry): ${err?.name || "Error"} ${err?.message || err}`,
        );
        throw err;
      }
      if (args.signal?.aborted) throw err;
      if (attempts >= 2) {
        if (err instanceof GeminiTransientError) throw err;
        throw new GeminiTransientError(
          `OpenRouter network/unknown error: ${String(err?.message ?? err).slice(0, 200)}`,
          0,
          err?.partial ?? {},
        );
      }
      await new Promise((r) => setTimeout(r, 600));
      console.warn(
        `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] retry 1 (pre-stream ${err?.status ?? "?"}): ${err?.name || "Error"} ${err?.message || err}`,
      );
    }
  }

  if (!result) {
    throw new GeminiTransientError("OpenRouter stream failed for unknown reason", 0);
  }

  // Bad-output detection (post-stream).
  const finishReason = result.finishReason;
  const trimmedLen = result.fullResponse.trim().length;
  const partialOnBadOutput: GeminiPartial = {
    emittedAnyChunk: result.emittedAnyChunk,
    usageMetadata: result.usageMetadata,
    partialResponseChars: result.fullResponse.length,
  };
  // OpenRouter/OpenAI safety block → "content_filter"
  if (finishReason === "content_filter") {
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

  const u = result.usageMetadata || {};
  return {
    fullResponse: result.fullResponse,
    inputTokens: Number(u.promptTokenCount ?? 0),
    outputTokens: Number(u.candidatesTokenCount ?? 0),
    cachedInputTokens: Number(u.cachedContentTokenCount ?? 0),
    finishReason: result.finishReason,
    attempts,
    model: args.model,
  };
}
