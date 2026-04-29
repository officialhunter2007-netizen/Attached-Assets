/**
 * Unified Gemini streaming helper for the teaching path.
 *
 * Wraps Google's `generativelanguage.googleapis.com/v1beta/models/{model}
 * :streamGenerateContent` REST endpoint behind an `onChunk(text)` callback
 * so the caller (`/ai/teach`) can write SSE deltas to the student exactly
 * the same way it does for Anthropic streams.
 *
 * Why a custom helper instead of the official `@google/genai` SDK?
 *   1. We already speak the REST SSE format in `/ai/platform-help`, so
 *      depending on it adds zero new packages and keeps cold-start light.
 *   2. We need extremely fine-grained control over retries + the "bad
 *      output" detection that triggers the Haiku safety net — easier with
 *      raw fetch than fighting an SDK abstraction.
 *
 * Error model (typed so the caller can branch precisely):
 *   - `GeminiAuthError`      → 401/403. Don't retry. Fall back to Haiku silently.
 *   - `GeminiTransientError` → 429/500/502/503/504/network. Retried once
 *     internally. If retry also fails, propagated to the caller so it can
 *     fall back to Haiku.
 *   - `GeminiBadOutputError` → stream ended with < MIN_USEFUL_RESPONSE chars
 *     OR a `finishReason` of SAFETY/RECITATION/OTHER (Gemini sometimes
 *     refuses Arabic technical content under conservative safety settings).
 *     Caller falls back to Haiku.
 *   - `GeminiClientError`    → 400/422 (malformed request). Don't retry,
 *     don't fall back — surface to logs because it's our bug.
 */

const TRANSIENT_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
/** Anything shorter than this on a successful stream is considered "no
 *  meaningful answer" and triggers a Haiku fallback. Generous threshold
 *  because Arabic teaching responses are typically 200+ chars even for the
 *  shortest "yes, that's correct, here's why…" follow-ups. */
const MIN_USEFUL_RESPONSE = 20;

/**
 * Partial-success metadata that all Gemini error types may carry. When a
 * mid-stream failure happens, we propagate as much of these fields as we
 * have to the caller so:
 *   1. The route never silently retries on the SAME `streamGenerateContent`
 *      call once `emittedAnyChunk === true` — that would duplicate text on
 *      the SSE wire.
 *   2. `recordAiUsage` can attribute real Gemini token spend even when the
 *      stream died mid-flight (Google still bills for the prompt + emitted
 *      candidates tokens), so the cost cap stays accurate.
 */
export type GeminiPartial = {
  /** Whether any text chunks were already delivered via `onChunk` before
   *  this error was raised. If true, internal retry is unsafe. */
  emittedAnyChunk?: boolean;
  /** Last-known usageMetadata Gemini sent before the failure (or null). */
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  } | null;
  /** Bytes Gemini emitted before failing (used by callers that want to
   *  estimate token spend when usageMetadata is absent). */
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
  /** Mirror of Anthropic's max_tokens. Gemini calls it maxOutputTokens. */
  maxOutputTokens: number;
  /** e.g. "gemini-2.0-flash". The function does NOT do model-level retries
   *  on a different model — that's the caller's responsibility (Haiku
   *  fallback). Internal retry is on the SAME model only. */
  model: string;
  /** Higher = more creative. Teaching default is 0.6 to balance variety
   *  with consistency on the structured tag protocol. */
  temperature?: number;
  topP?: number;
  /** AbortSignal so the route can cancel on client disconnect. */
  signal?: AbortSignal;
  /** Called once per text delta chunk. Keep it FAST — we're inside the SSE
   *  hot loop. Throwing here aborts the stream. */
  onChunk: (text: string) => void;
  /** Optional: log diagnostic info. */
  logTag?: string;
};

export type StreamGeminiResult = {
  fullResponse: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  finishReason: string | undefined;
  /** How many internal HTTP attempts were made (1 or 2). */
  attempts: number;
  /** The model that actually answered (always === args.model for now). */
  model: string;
};

function buildGeminiRequestBody(args: StreamGeminiArgs): string {
  // Gemini message format: roles are "user" | "model"; system goes in
  // the dedicated `systemInstruction` field.
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
    safetySettings: [
      // BLOCK_ONLY_HIGH is the most permissive policy short of OFF —
      // critical for an Arabic teaching tool where lower thresholds
      // generate spurious safety blocks on educational content covering
      // history, biology, security topics, etc.
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  });
}

async function attemptStream(
  args: StreamGeminiArgs,
  apiKey: string,
): Promise<{
  fullResponse: string;
  usageMetadata: any;
  finishReason: string | undefined;
  emittedAnyChunk: boolean;
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const body = buildGeminiRequestBody(args);

  // Track whether ANY text chunk was already emitted via onChunk. Once true,
  // upstream (`streamGeminiTeaching`) MUST NOT retry the same call — a fresh
  // request would re-emit the response from byte 0 and the SSE socket would
  // duplicate the visible Arabic text to the student.
  let emittedAnyChunk = false;
  let fullResponse = "";
  let usageMetadata: any = null;
  let finishReason: string | undefined;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    // Pre-stream HTTP errors: emittedAnyChunk is provably false here, so
    // the caller is free to retry once on transient codes.
    const partial: GeminiPartial = { emittedAnyChunk: false, usageMetadata: null, partialResponseChars: 0 };
    if (r.status === 401 || r.status === 403) {
      throw new GeminiAuthError(`Gemini auth ${r.status}: ${errBody.slice(0, 200)}`, partial);
    }
    if (TRANSIENT_HTTP.has(r.status)) {
      throw new GeminiTransientError(
        `Gemini transient ${r.status}: ${errBody.slice(0, 200)}`,
        r.status,
        partial,
      );
    }
    throw new GeminiClientError(
      `Gemini client error ${r.status}`,
      r.status,
      errBody.slice(0, 500),
      partial,
    );
  }
  if (!r.body) {
    throw new GeminiTransientError("Gemini returned no response body", 0, {
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
          if (parsed?.usageMetadata) usageMetadata = parsed.usageMetadata;
          const cand = parsed?.candidates?.[0];
          if (cand?.finishReason) finishReason = String(cand.finishReason);
          const parts = cand?.content?.parts;
          if (Array.isArray(parts)) {
            for (const p of parts) {
              if (typeof p?.text === "string" && p.text.length > 0) {
                fullResponse += p.text;
                emittedAnyChunk = true;
                args.onChunk(p.text);
              }
            }
          }
        } catch {
          // ignore non-JSON keep-alives
        }
      }
    }
  } catch (err: any) {
    // Mid-stream network/abort error. We MUST stamp the error with the
    // partial state so the outer retry loop in `streamGeminiTeaching`
    // refuses to retry (see emittedAnyChunk gate) and so the route layer
    // can record the partial Gemini token spend in `ai_usage_events`.
    const partial: GeminiPartial = {
      emittedAnyChunk,
      usageMetadata,
      partialResponseChars: fullResponse.length,
    };
    // Promote unknown network failures to GeminiTransientError with the
    // partial payload attached. Auth/Client errors only happen pre-stream,
    // so `err instanceof GeminiAuthError|GeminiClientError` won't appear
    // here — but be defensive in case a future change introduces them.
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
      `Gemini stream interrupted: ${String(err?.message ?? err).slice(0, 200)}`,
      0,
      partial,
    );
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }

  return { fullResponse, usageMetadata, finishReason, emittedAnyChunk };
}

/**
 * Stream a Gemini teaching turn.
 *
 * Internal retry policy: 1 same-model retry on transient HTTP. After that,
 * the caller (`/ai/teach`) is expected to fall back to Haiku. We deliberately
 * do NOT retry across models here — keeping the two providers' fallback
 * logic separate makes the cost telemetry and the bad-output detection much
 * easier to reason about.
 *
 * Throws a typed error (see top of file) on non-recoverable failures.
 * Always returns a usable result on success — the bad-output detection
 * runs *after* the stream finishes, so partial chunks already wrote to the
 * SSE socket are visible to the student before we decide to fall back. This
 * is acceptable: a cut-short answer with a "let me try again" follow-up is
 * far better UX than a hang. The caller appends the Haiku response after
 * the partial Gemini text (mid-stream concatenation is intentional).
 */
export async function streamGeminiTeaching(
  args: StreamGeminiArgs,
): Promise<StreamGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiAuthError("GEMINI_API_KEY is not set");
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
      // Auth + client errors: never retry. The route layer decides whether
      // they're fallback-eligible (Auth → Haiku, Client → surface bug).
      if (err instanceof GeminiAuthError || err instanceof GeminiClientError) {
        throw err;
      }
      // CRITICAL: once any byte was emitted to onChunk, retrying the SAME
      // streamGenerateContent call would re-emit the response from scratch
      // and the student would see duplicated Arabic text. Stop retrying;
      // propagate so the route can decide (today: friendly "answer cut
      // short" notice rather than fallback).
      if (err?.partial?.emittedAnyChunk) {
        console.warn(
          `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] mid-stream error after emitting chunks (no retry): ${err?.name || "Error"} ${err?.message || err}`,
        );
        throw err;
      }
      // Client-cancelled (route saw socket close → abortController.abort()):
      // never retry — that would create orphan billed Gemini calls.
      if (args.signal?.aborted) {
        throw err;
      }
      if (attempts >= 2) {
        if (err instanceof GeminiTransientError) throw err;
        throw new GeminiTransientError(
          `Gemini network/unknown error: ${String(err?.message ?? err).slice(0, 200)}`,
          0,
          err?.partial ?? {},
        );
      }
      // Backoff before single retry (Anthropic pattern: short, predictable).
      await new Promise((r) => setTimeout(r, 600));
      console.warn(
        `[gemini-stream${args.logTag ? `:${args.logTag}` : ""}] retry 1 (pre-stream ${err?.status ?? "?"}): ${err?.name || "Error"} ${err?.message || err}`,
      );
    }
  }

  if (!result) {
    // Defensive — the loop above either sets `result` or throws.
    throw new GeminiTransientError("Gemini stream failed for unknown reason", 0);
  }

  // Bad-output detection (post-stream). Token usage is preserved on the
  // thrown error so the route can still bill Gemini for the prompt + any
  // candidates tokens Google charged us for the rejected output.
  const finishReason = result.finishReason;
  const trimmedLen = result.fullResponse.trim().length;
  const partialOnBadOutput: GeminiPartial = {
    emittedAnyChunk: result.emittedAnyChunk,
    usageMetadata: result.usageMetadata,
    partialResponseChars: result.fullResponse.length,
  };
  if (
    finishReason === "SAFETY" ||
    finishReason === "RECITATION" ||
    finishReason === "OTHER" ||
    finishReason === "BLOCKLIST" ||
    finishReason === "PROHIBITED_CONTENT" ||
    finishReason === "SPII"
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

  // Token accounting. Gemini's usageMetadata structure:
  //   { promptTokenCount, candidatesTokenCount, totalTokenCount,
  //     cachedContentTokenCount? }  (cachedContentTokenCount only present
  //   when explicit context caching is configured; we don't use it yet).
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
