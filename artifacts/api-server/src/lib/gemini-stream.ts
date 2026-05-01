/**
 * Gemini teaching stream helper — DUAL-PROVIDER for Gemini Flash.
 *
 * Per product policy student turns are Gemini Flash ONLY (no Anthropic /
 * Sonnet / Haiku fallback). To survive transient outages from any single
 * provider while keeping that policy, this helper tries TWO independent
 * channels for the SAME model:
 *
 *   1) Google Gemini API direct  — generativelanguage.googleapis.com
 *                                  Auth: GEMINI_API_KEY
 *                                  Cheaper, lower latency, official.
 *
 *   2) OpenRouter (same model)   — openrouter.ai (OpenAI-compatible)
 *                                  Auth: OPENROUTER_API_KEY
 *                                  Used ONLY if (1) failed pre-stream.
 *
 * Both channels return the same Gemini Flash answer, so the policy
 * "student turns are Gemini Flash only" still holds — we are just
 * routing around an unreliable middleman, not switching models.
 *
 * If at least one provider key is configured, the helper will work. When
 * a key is missing the corresponding channel is silently skipped. If
 * BOTH are missing → GeminiAuthError up front so the caller can emit the
 * friendly Arabic apology and roll back the quota.
 *
 * Error model (unchanged for backward compatibility with /ai/teach):
 *   GeminiAuthError      → 401/403 from BOTH channels (or no keys at all)
 *   GeminiTransientError → 429/5xx/network from BOTH channels after retries
 *   GeminiBadOutputError → content_filter OR < MIN_USEFUL_RESPONSE chars
 *   GeminiClientError    → 400/422 (our bug). Surfaced from whichever
 *                          channel hit it last.
 *
 * Mid-stream errors (any byte already on the wire) are NEVER retried and
 * NEVER cross-channel — that would duplicate text for the student.
 */

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const MIN_USEFUL_RESPONSE = 20;

/** Maps internal short model names → OpenRouter full IDs. */
function toOpenRouterModel(model: string): string {
  const map: Record<string, string> = {
    "gemini-2.0-flash":      "google/gemini-2.0-flash-001",
    "gemini-2.0-flash-lite": "google/gemini-2.0-flash-lite-001",
    "gemini-1.5-flash":      "google/gemini-flash-1.5",
    "gemini-1.5-pro":        "google/gemini-pro-1.5",
  };
  return map[model] ?? (model.includes("/") ? model : `google/${model}`);
}

/** Maps internal short model names → Google REST model IDs. */
function toGoogleModel(model: string): string {
  // Google REST accepts the bare short name (e.g. "gemini-2.0-flash"); when
  // the caller passed an OpenRouter-style "google/<id>" we strip the prefix
  // so the same `chosenModel` value works on both channels.
  if (model.startsWith("google/")) return model.slice("google/".length).replace(/-001$/, "");
  return model;
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
  // Records which channel actually produced the answer so /ai/teach
  // telemetry can break down "google" vs "openrouter" success rates.
  channel: "google" | "openrouter";
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
// Channel 1: Google Gemini API direct
// ────────────────────────────────────────────────────────────────────────────

function buildGoogleRequestBody(args: StreamGeminiArgs): string {
  // Google REST format: contents array with role/parts; systemInstruction
  // is a separate top-level field. Assistant→"model" role; user→"user".
  const contents = args.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  return JSON.stringify({
    systemInstruction: { parts: [{ text: args.systemPrompt }] },
    contents,
    generationConfig: {
      temperature: args.temperature ?? 0.6,
      topP: args.topP ?? 0.95,
      maxOutputTokens: args.maxOutputTokens,
    },
  });
}

async function attemptGoogle(args: StreamGeminiArgs, apiKey: string): Promise<AttemptResult> {
  const model = toGoogleModel(args.model);
  // `alt=sse` switches the streaming endpoint from JSON-array framing to
  // proper Server-Sent Events (one `data: {…}` line per chunk) — much
  // easier to incrementally parse than the default array stream.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  let emittedAnyChunk = false;
  let fullResponse = "";
  let finishReason: string | undefined;
  let usageRaw: any = null;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildGoogleRequestBody(args),
    signal: args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    const partial: GeminiPartial = { emittedAnyChunk: false, usageMetadata: null, partialResponseChars: 0 };
    if (r.status === 401 || r.status === 403) {
      throw new GeminiAuthError(`Google auth ${r.status}: ${errBody.slice(0, 200)}`, partial);
    }
    if (TRANSIENT_HTTP.has(r.status)) {
      throw new GeminiTransientError(
        `Google transient ${r.status}: ${errBody.slice(0, 200)}`,
        r.status,
        partial,
      );
    }
    throw new GeminiClientError(`Google client error ${r.status}`, r.status, errBody.slice(0, 500), partial);
  }
  if (!r.body) {
    throw new GeminiTransientError("Google returned no response body", 0, {
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
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload);
          if (parsed?.usageMetadata) usageRaw = parsed.usageMetadata;
          const candidate = parsed?.candidates?.[0];
          if (candidate?.finishReason) finishReason = String(candidate.finishReason);
          const parts = candidate?.content?.parts;
          if (Array.isArray(parts)) {
            for (const p of parts) {
              const text = typeof p?.text === "string" ? p.text : "";
              if (text.length > 0) {
                fullResponse += text;
                emittedAnyChunk = true;
                args.onChunk(text);
              }
            }
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
            promptTokenCount: usageRaw.promptTokenCount ?? 0,
            candidatesTokenCount: usageRaw.candidatesTokenCount ?? 0,
            cachedContentTokenCount: usageRaw.cachedContentTokenCount ?? 0,
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
      `Google stream interrupted: ${String(err?.message ?? err).slice(0, 200)}`,
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
          promptTokenCount: Number(usageRaw.promptTokenCount ?? 0),
          candidatesTokenCount: Number(usageRaw.candidatesTokenCount ?? 0),
          cachedContentTokenCount: Number(usageRaw.cachedContentTokenCount ?? 0),
        }
      : null,
    finishReason,
    emittedAnyChunk,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Channel 2: OpenRouter (same model — still Gemini Flash)
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
// Public entrypoint — orchestrates the two channels
// ────────────────────────────────────────────────────────────────────────────

type Channel = { name: "google" | "openrouter"; key: string; run: (args: StreamGeminiArgs, key: string) => Promise<AttemptResult> };

function buildChannelChain(): Channel[] {
  const chain: Channel[] = [];
  const gKey = process.env.GEMINI_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  // Google direct first (cheaper, lower latency, official).
  if (gKey) chain.push({ name: "google", key: gKey, run: attemptGoogle });
  // OpenRouter second — same model, used only if Google failed pre-stream.
  if (orKey) chain.push({ name: "openrouter", key: orKey, run: attemptOpenRouter });
  return chain;
}

export async function streamGeminiTeaching(args: StreamGeminiArgs): Promise<StreamGeminiResult> {
  const chain = buildChannelChain();
  if (chain.length === 0) {
    // Neither key is configured — surface as auth error so /ai/teach can
    // emit the friendly apology and roll back the quota. Operator MUST
    // set at least one of GEMINI_API_KEY or OPENROUTER_API_KEY.
    throw new GeminiAuthError(
      "Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set — Gemini teaching disabled",
    );
  }

  let attempts = 0;
  let lastErr: any = null;
  let result: AttemptResult | null = null;
  let winningChannel: "google" | "openrouter" | null = null;

  // Per channel: try once, then ONE in-channel retry with 600ms backoff if
  // the failure was pre-stream and transient. After the channel exhausts,
  // move to the next channel in the chain (still Gemini Flash). Total
  // upper bound: chain.length × 2 attempts. Mid-stream errors abort the
  // whole loop because partial bytes already reached the student.
  for (let chIdx = 0; chIdx < chain.length; chIdx++) {
    const ch = chain[chIdx];
    let chTries = 0;
    while (chTries < 2) {
      chTries++;
      attempts++;
      try {
        result = await ch.run(args, ch.key);
        winningChannel = ch.name;
        break; // channel succeeded
      } catch (err: any) {
        lastErr = err;
        // GeminiBadOutputError is a content/length problem with the model
        // output itself — switching channels won't change the model's
        // behaviour, so abort the whole chain.
        if (err instanceof GeminiBadOutputError) throw err;
        // Mid-stream errors: bytes already on the wire, retrying ANY
        // channel would duplicate text. Abort everything.
        if (err?.partial?.emittedAnyChunk) {
          console.warn(
            `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] mid-stream error on ${ch.name} (no retry): ${err?.name || "Error"} ${err?.message || err}`,
          );
          throw err;
        }
        if (args.signal?.aborted) throw err;
        // GeminiClientError = our request shape is wrong (400/422). The
        // request would fail identically on the next channel for the
        // same reason → abort, surface to ops.
        if (err instanceof GeminiClientError) throw err;
        // Auth error on this channel → don't retry the same channel
        // (will fail again with the same key); skip straight to the
        // next channel if any.
        if (err instanceof GeminiAuthError) {
          console.warn(
            `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] ${ch.name} auth failed, trying next channel: ${err?.message || err}`,
          );
          break;
        }
        // Transient error → retry once on this same channel after a
        // short backoff, then move to the next channel.
        if (chTries < 2) {
          await new Promise((r) => setTimeout(r, 600));
          console.warn(
            `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] retry on ${ch.name} (pre-stream ${err?.status ?? "?"}): ${err?.name || "Error"} ${err?.message || err}`,
          );
          continue;
        }
        // Channel exhausted, advance to next.
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] ${ch.name} exhausted (${err?.name}); trying next channel if any`,
        );
        break;
      }
    }
    if (result) break;
  }

  if (!result) {
    // All channels failed pre-stream. Surface the most informative error
    // class we got. If lastErr is already one of our typed errors, re-throw
    // as-is; otherwise wrap as transient so the caller's friendly path
    // fires and the quota is rolled back.
    if (
      lastErr instanceof GeminiAuthError ||
      lastErr instanceof GeminiTransientError ||
      lastErr instanceof GeminiClientError ||
      lastErr instanceof GeminiBadOutputError
    ) {
      throw lastErr;
    }
    throw new GeminiTransientError(
      `All Gemini channels failed: ${String(lastErr?.message ?? lastErr).slice(0, 200)}`,
      0,
      lastErr?.partial ?? {},
    );
  }

  // Bad-output detection (post-stream) — applies regardless of channel.
  const finishReason = result.finishReason;
  const trimmedLen = result.fullResponse.trim().length;
  const partialOnBadOutput: GeminiPartial = {
    emittedAnyChunk: result.emittedAnyChunk,
    usageMetadata: result.usageMetadata,
    partialResponseChars: result.fullResponse.length,
  };
  // Google uses "SAFETY"/"OTHER"; OpenRouter uses "content_filter". Both
  // are content-filter blocks → unrecoverable, surface as bad output.
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
    channel: winningChannel ?? "google",
  };
}
