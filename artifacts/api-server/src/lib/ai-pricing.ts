/**
 * USD price per 1,000,000 tokens for every LLM model used in the codebase.
 * Numbers reflect the public list-price as of late 2025. Update when
 * provider pricing changes — `costForUsage()` reads these values directly.
 *
 * If a model is missing here, `costForUsage()` falls back to DEFAULT_PRICING
 * and logs a warning so the gap shows up in logs.
 */

export type ModelPricing = {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cached-input tokens (Anthropic prompt caching, OpenAI cache) */
  cachedInput?: number;
  /** Friendly label used in admin UI */
  label?: string;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── Anthropic Claude (direct API model IDs) ──
  "claude-sonnet-4-6": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    label: "Claude Sonnet 4.6",
  },
  "claude-sonnet-4-5-20250929": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    label: "Claude Sonnet 4.5",
  },
  "claude-haiku-4-5": {
    input: 1.0,
    output: 5.0,
    cachedInput: 0.1,
    label: "Claude Haiku 4.5",
  },
  // Claude 3 (legacy) — used via anthropic/claude-3-haiku in some routes
  "claude-3-haiku-20240307": {
    input: 0.25,
    output: 1.25,
    cachedInput: 0.03,
    label: "Claude 3 Haiku",
  },
  "claude-3-5-sonnet-20241022": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    label: "Claude 3.5 Sonnet",
  },

  // ── Anthropic / OpenRouter-style model IDs (prefix: "anthropic/") ──
  "anthropic/claude-haiku-4.5": {
    input: 1.0,
    output: 5.0,
    cachedInput: 0.1,
    label: "Claude Haiku 4.5 (OpenRouter)",
  },
  "anthropic/claude-sonnet-4.5": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    label: "Claude Sonnet 4.5 (OpenRouter)",
  },
  // Used in ai.ts study-card generation and build-env routes
  "anthropic/claude-3-haiku": {
    input: 0.25,
    output: 1.25,
    cachedInput: 0.03,
    label: "Claude 3 Haiku (via Anthropic proxy)",
  },
  "anthropic/claude-3-5-sonnet": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    label: "Claude 3.5 Sonnet (via Anthropic proxy)",
  },

  // ── Google Gemini ──
  "gemini-2.0-flash": {
    input: 0.1,
    output: 0.4,
    label: "Gemini 2.0 Flash",
  },
  "gemini-2.0-flash-lite": {
    input: 0.075,
    output: 0.3,
    label: "Gemini 2.0 Flash Lite",
  },
  "gemini-2.5-flash": {
    input: 0.3,
    output: 2.5,
    label: "Gemini 2.5 Flash",
  },
  "gemini-2.5-flash-lite": {
    input: 0.1,
    output: 0.4,
    label: "Gemini 2.5 Flash Lite",
  },
  "gemini-2.5-pro": {
    input: 1.25,
    output: 10.0,
    label: "Gemini 2.5 Pro",
  },

  // ── OpenAI (direct + OpenRouter-prefixed) ──
  // gpt-5.2 is a placeholder identifier in the codebase; price it like gpt-4o
  // until the real model ID is wired up.
  "gpt-5.2": {
    input: 2.5,
    output: 10.0,
    cachedInput: 1.25,
    label: "GPT-5.2 (estimated)",
  },
  "gpt-4o": {
    input: 2.5,
    output: 10.0,
    cachedInput: 1.25,
    label: "GPT-4o",
  },
  // OpenRouter-style ID used in ai.ts platform-help and other routes
  "openai/gpt-4o": {
    input: 2.5,
    output: 10.0,
    cachedInput: 1.25,
    label: "GPT-4o (OpenRouter)",
  },
  "gpt-4o-mini": {
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    label: "GPT-4o Mini",
  },
  "openai/gpt-4o-mini": {
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    label: "GPT-4o Mini (OpenRouter)",
  },

  // ── fal.ai image generation ──
  // FLUX.1 [schnell] costs ~$0.003 per generated image. We model image
  // generation as "1 output token = 1 image" so the standard cost pipeline
  // (costForUsage → ceil(cost*1000) → gems) works without special-casing.
  // output: $3000 per 1,000,000 "tokens" = $0.003 per token = $0.003 per image.
  "flux-schnell": {
    input: 0,
    output: 3000.0,
    label: "FLUX.1 Schnell (1 image)",
  },

  // ── Meta / OpenRouter free-tier ──
  // ── Google Gemini via OpenRouter (prefix: "google/") ──
  // Mirrors the direct-API entries above so cost lookups work with either id.
  "google/gemini-2.0-flash": {
    input: 0.1,
    output: 0.4,
    label: "Gemini 2.0 Flash (OpenRouter)",
  },
  "google/gemini-2.0-flash-lite": {
    input: 0.075,
    output: 0.3,
    label: "Gemini 2.0 Flash Lite (OpenRouter)",
  },

  "meta-llama/llama-3.3-70b-instruct": {
    input: 0.13,
    output: 0.4,
    label: "Llama 3.3 70B (OpenRouter)",
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    input: 0.0,
    output: 0.0,
    label: "Llama 3.3 70B Free (OpenRouter)",
  },
};

/** Used when a model is not in MODEL_PRICING. */
const DEFAULT_PRICING: ModelPricing = {
  input: 3.0,
  output: 15.0,
  cachedInput: 0.3,
  label: "Unknown (default)",
};

const warnedModels = new Set<string>();

export function getModelPricing(model: string): ModelPricing {
  const p = MODEL_PRICING[model];
  if (!p) {
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(
        `[ai-pricing] no pricing for model "${model}"; using default`,
      );
    }
    return DEFAULT_PRICING;
  }
  return p;
}

export function costForUsage(args: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens read from cache — billed at cachedInput rate (e.g. $0.30/M for Sonnet). */
  cachedInputTokens?: number;
  /**
   * Tokens written to cache (Anthropic cache_creation_input_tokens).
   * Billed at 1.25× the base input rate per Anthropic's pricing.
   * If absent, these tokens are assumed to be included in inputTokens at
   * the standard rate (slight underestimate — acceptable for legacy callers).
   */
  cacheCreationInputTokens?: number;
}): number {
  const p = getModelPricing(args.model);
  const cachedReadRate = p.cachedInput ?? p.input;
  // Anthropic charges 1.25× for cache writes; other providers treated as 1×.
  const cacheWriteRate = p.cachedInput != null ? p.input * 1.25 : p.input;

  const cacheCreation = args.cacheCreationInputTokens ?? 0;
  const cacheRead = args.cachedInputTokens ?? 0;
  // Regular (non-cached) input = total inputTokens minus cache-read tokens
  // (cache-creation tokens are already included in inputTokens by
  // extractAnthropicUsage, so we separate them here).
  const regularInput = Math.max(0, args.inputTokens - cacheRead - cacheCreation);

  const cost =
    (regularInput / 1_000_000) * p.input +
    (cacheCreation / 1_000_000) * cacheWriteRate +
    (cacheRead / 1_000_000) * cachedReadRate +
    (args.outputTokens / 1_000_000) * p.output;
  // Round to 8 decimal places (matches DB column precision)
  return Math.round(cost * 1e8) / 1e8;
}
