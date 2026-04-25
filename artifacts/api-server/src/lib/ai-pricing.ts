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
  // ── Anthropic Claude ──
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
  // OpenRouter aliases (same underlying models, different pricing strings)
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

  // ── Google Gemini ──
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

  // ── OpenAI ──
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
  "gpt-4o-mini": {
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    label: "GPT-4o Mini",
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
  cachedInputTokens?: number;
}): number {
  const p = getModelPricing(args.model);
  const cachedRate = p.cachedInput ?? p.input;
  const billableInput = Math.max(
    0,
    args.inputTokens - (args.cachedInputTokens ?? 0),
  );
  const cost =
    (billableInput / 1_000_000) * p.input +
    ((args.cachedInputTokens ?? 0) / 1_000_000) * cachedRate +
    (args.outputTokens / 1_000_000) * p.output;
  // Round to 8 decimal places (matches DB column precision)
  return Math.round(cost * 1e8) / 1e8;
}
