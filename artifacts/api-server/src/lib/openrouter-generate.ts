/**
 * Non-streaming Gemini helper — DUAL-PROVIDER (OpenRouter primary).
 *
 * Mirrors gemini-stream.ts but for one-shot generateContent calls used by:
 *   - materials.ts: PDF OCR (ocrChunkGemini)
 *   - materials.ts: structured chapters (generateStructuredChapters)
 *   - materials.ts: file metadata (generateMaterialMetadata)
 *   - materials.ts: quiz/exam generation (generateQuestionsViaGemini)
 *   - materials.ts: short-answer grading (gradeShortAnswers)
 *   - ai.ts:        lab variant generation Gemini fallback
 *   - ai.ts:        lab build-env Gemini third pass
 *   - ai.ts:        attack-sim build Gemini fallback
 *   - ai.ts:        platform-help streaming (uses streamGeminiTeaching directly)
 *
 * Channel order matches gemini-stream.ts:
 *   1) OpenRouter (PRIMARY) — single billable account, no quota cap
 *   2) Google direct (OPTIONAL fallback) — only if GEMINI_API_KEY set
 *
 * Returns a normalized result regardless of which channel served the
 * request, so call sites do not need to know which provider answered.
 */

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

/** Maps internal short model names → Google REST model IDs. */
function toGoogleModel(model: string): string {
  if (model.startsWith("google/")) return model.slice("google/".length).replace(/-001$/, "");
  return model;
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
  /** Which channel ultimately served the request. */
  channel: "openrouter" | "google";
  /** The exact model ID passed to the channel. */
  model: string;
  /** HTTP status of the SUCCESSFUL response (always 2xx). */
  status: number;
};

/** Public, shape-stable error so call sites can map .status into 429/503/etc. */
export class GenerateGeminiError extends Error {
  status: number;
  channel: "openrouter" | "google" | "none";
  body: string;
  /** True when no provider key was configured at all. */
  unconfigured: boolean;
  /** True when the channel returned 2xx but the output was blocked/empty
   *  (SAFETY filter, content_filter, recitation, or empty body). The
   *  orchestrator skips in-channel retry and tries the next channel. */
  badOutput: boolean;
  constructor(message: string, opts: {
    status: number;
    channel: "openrouter" | "google" | "none";
    body?: string;
    unconfigured?: boolean;
    badOutput?: boolean;
  }) {
    super(message);
    this.name = "GenerateGeminiError";
    this.status = opts.status;
    this.channel = opts.channel;
    this.body = opts.body ?? "";
    this.unconfigured = !!opts.unconfigured;
    this.badOutput = !!opts.badOutput;
  }
}

/** Reasons that mean "this channel cannot fulfill the request" — should
 *  trigger immediate fallback to the next channel rather than in-channel
 *  retry. Both providers occasionally use different casings/spellings. */
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

// ────────────────────────────────────────────────────────────────────────────
// Channel 1: OpenRouter (PRIMARY)
// ────────────────────────────────────────────────────────────────────────────

function partsToOpenRouterContent(parts: ContentPart[]): any {
  // OpenRouter follows the OpenAI multimodal content schema.
  // For pure-text we collapse to a string so providers that don't accept
  // the array form still work. For inline files (PDF) we use the
  // image_url-style data URL which OpenRouter accepts for Gemini.
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    // Use OpenRouter's `file` content type — supported for Google models
    // and required for native PDF input rather than text extraction.
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
  const messages: { role: string; content: any }[] = [];
  if (args.systemPrompt) messages.push({ role: "system", content: args.systemPrompt });
  messages.push({ role: "user", content: partsToOpenRouterContent(args.userParts) });

  const body: any = {
    model: toOpenRouterModel(args.model),
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
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] HTTP ${r.status} for model=${toOpenRouterModel(args.model)}: ${errBody.slice(0, 300)}`,
    );
    throw new GenerateGeminiError(
      `OpenRouter HTTP ${r.status}`,
      { status: r.status, channel: "openrouter", body: errBody.slice(0, 500) },
    );
  }

  const data: any = await r.json();
  const choice = data?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const content = choice?.message?.content;
  // Content may be string or array-of-parts depending on provider.
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

  // Bad-output guard: SAFETY/content_filter blocks return 2xx but empty
  // text. Treat as channel failure so the orchestrator falls over to
  // Google direct (whose prompt safety calibration differs).
  if (isBlockedFinishReason(finishReason)) {
    console.warn(
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] openrouter blocked output (finish_reason=${finishReason}); will try next channel`,
    );
    throw new GenerateGeminiError(
      `OpenRouter blocked output (${finishReason})`,
      { status: 200, channel: "openrouter", body: String(finishReason ?? ""), badOutput: true },
    );
  }
  if (text.trim().length === 0) {
    console.warn(
      `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] openrouter returned empty text (finish_reason=${finishReason}); will try next channel`,
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
    model: toOpenRouterModel(args.model),
    status: r.status,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Channel 2: Google Gemini direct (OPTIONAL fallback)
// ────────────────────────────────────────────────────────────────────────────

function partsToGoogleParts(parts: ContentPart[]): any[] {
  return parts.map((p) => {
    if (p.type === "text") return { text: p.text };
    return { inlineData: { mimeType: p.mimeType, data: p.dataBase64 } };
  });
}

async function attemptGoogle(
  args: GenerateGeminiArgs,
  apiKey: string,
): Promise<GenerateGeminiResult> {
  const model = toGoogleModel(args.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body: any = {
    contents: [{ role: "user", parts: partsToGoogleParts(args.userParts) }],
    generationConfig: {
      temperature: args.temperature ?? 0.4,
      topP: args.topP ?? 0.95,
      maxOutputTokens: args.maxOutputTokens,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };
  if (args.systemPrompt) body.systemInstruction = { parts: [{ text: args.systemPrompt }] };
  if (args.jsonMode) body.generationConfig.responseMimeType = "application/json";

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: args.timeoutMs ? AbortSignal.any([
      args.signal ?? new AbortController().signal,
      AbortSignal.timeout(args.timeoutMs),
    ]) : args.signal,
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => "");
    console.warn(
      `[openrouter-generate:google${args.logTag ? `:${args.logTag}` : ""}] HTTP ${r.status} for model=${model}: ${errBody.slice(0, 300)}`,
    );
    throw new GenerateGeminiError(
      `Google HTTP ${r.status}`,
      { status: r.status, channel: "google", body: errBody.slice(0, 500) },
    );
  }

  const data: any = await r.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts;
  let text = "";
  if (Array.isArray(parts)) {
    for (const p of parts) {
      if (typeof p?.text === "string") text += p.text;
    }
  }

  const um = data?.usageMetadata;
  const usageMetadata: GeminiUsageRaw | null = um
    ? {
        promptTokenCount: Number(um.promptTokenCount ?? 0),
        candidatesTokenCount: Number(um.candidatesTokenCount ?? 0),
        cachedContentTokenCount: Number(um.cachedContentTokenCount ?? 0),
      }
    : null;

  // Same bad-output guard as the OpenRouter path: SAFETY/RECITATION/etc.
  // Surface as a typed error so the orchestrator can decide what to do.
  // (When Google is the LAST channel in the chain, the error propagates
  // to the caller, which is the correct behavior.)
  if (isBlockedFinishReason(finishReason)) {
    console.warn(
      `[openrouter-generate:google${args.logTag ? `:${args.logTag}` : ""}] google blocked output (finishReason=${finishReason}); will try next channel`,
    );
    throw new GenerateGeminiError(
      `Google blocked output (${finishReason})`,
      { status: 200, channel: "google", body: String(finishReason ?? ""), badOutput: true },
    );
  }
  if (text.trim().length === 0) {
    console.warn(
      `[openrouter-generate:google${args.logTag ? `:${args.logTag}` : ""}] google returned empty text (finishReason=${finishReason}); will try next channel`,
    );
    throw new GenerateGeminiError(
      `Google returned empty text (finishReason=${finishReason ?? "?"})`,
      { status: 200, channel: "google", body: String(finishReason ?? ""), badOutput: true },
    );
  }

  return {
    text,
    usageMetadata,
    finishReason,
    channel: "google",
    model,
    status: r.status,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public entrypoint — orchestrates both channels with OpenRouter primary
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when at least one provider key is configured. Call sites
 * use this to skip work entirely (e.g. generateMaterialMetadata) when no
 * Gemini channel is available.
 */
export function hasGeminiProvider(): boolean {
  return (
    !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    !!process.env.OPENROUTER_API_KEY ||
    !!process.env.GEMINI_API_KEY
  );
}

type Channel = {
  name: "openrouter" | "google";
  key: string;
  run: (args: GenerateGeminiArgs, key: string) => Promise<GenerateGeminiResult>;
};

function buildChain(): Channel[] {
  const chain: Channel[] = [];
  const orKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY;
  const gKey = process.env.GEMINI_API_KEY;
  // OpenRouter FIRST (production primary), Google direct SECOND if available.
  if (orKey) chain.push({ name: "openrouter", key: orKey, run: attemptOpenRouter });
  if (gKey)  chain.push({ name: "google", key: gKey, run: attemptGoogle });
  return chain;
}

/**
 * Generate text/JSON via Gemini (OpenRouter primary, Google direct fallback).
 *
 * Errors:
 *  - GenerateGeminiError with `unconfigured: true` → no provider keys set.
 *  - GenerateGeminiError with status 401/403 → all channels rejected the key.
 *  - GenerateGeminiError with status in TRANSIENT_HTTP → all channels were
 *    rate-limited or 5xx after a single retry on each.
 *  - GenerateGeminiError with status 4xx → request shape was wrong (our bug);
 *    retrying on the next channel would fail the same way, so we abort.
 *  - GenerateGeminiError with `badOutput: true` (status 200) → every channel
 *    returned a SAFETY/content_filter block or empty text (only the LAST
 *    channel's error is surfaced). Caller should treat this like an
 *    AI-output failure (Arabic apology + roll back any quota).
 */
export async function generateGemini(args: GenerateGeminiArgs): Promise<GenerateGeminiResult> {
  const chain = buildChain();
  if (chain.length === 0) {
    throw new GenerateGeminiError(
      "No Gemini provider configured. Set OPENROUTER_API_KEY (preferred) or GEMINI_API_KEY.",
      { status: 503, channel: "none", unconfigured: true },
    );
  }

  let lastErr: GenerateGeminiError | null = null;

  for (const ch of chain) {
    let chTries = 0;
    while (chTries < 2) {
      chTries++;
      try {
        return await ch.run(args, ch.key);
      } catch (err: any) {
        if (args.signal?.aborted) throw err;

        // Normalize unknown errors so callers always see a GenerateGeminiError.
        const e: GenerateGeminiError =
          err instanceof GenerateGeminiError
            ? err
            : new GenerateGeminiError(
                String(err?.message ?? err).slice(0, 200),
                { status: 0, channel: ch.name, body: "" },
              );
        lastErr = e;

        // Auth failure on this channel — try next channel right away.
        if (e.status === 401 || e.status === 403) {
          console.warn(
            `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] ${ch.name} auth failed; trying next channel if any`,
          );
          break;
        }
        // Bad output (SAFETY/content_filter/empty) — same channel will
        // produce the same block, so move on to the next channel right
        // away without consuming the in-channel retry budget.
        if (e.badOutput) {
          break;
        }
        // Transient — one in-channel retry with 600ms backoff.
        if (TRANSIENT_HTTP.has(e.status) || e.status === 0) {
          if (chTries < 2) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          // Exhausted in-channel retries — fall through to next channel.
          console.warn(
            `[openrouter-generate${args.logTag ? `:${args.logTag}` : ""}] ${ch.name} exhausted (${e.status}); trying next channel if any`,
          );
          break;
        }
        // 4xx other than auth — request shape problem. Skip the rest of
        // the chain because the next provider would fail the same way.
        throw e;
      }
    }
  }

  // All channels exhausted — surface the most recent failure.
  throw (
    lastErr ??
    new GenerateGeminiError("All Gemini channels failed without a recorded error.", {
      status: 0,
      channel: "none",
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
