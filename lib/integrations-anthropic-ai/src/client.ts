import Anthropic from "@anthropic-ai/sdk";

// Lazy client: do NOT throw at module import time. The api-server boots
// without an Anthropic-compatible key — only routes that actually call
// the SDK will surface the missing-key error. Throwing at import killed
// the entire process (incl. unrelated admin/payments/gem-ledger routes)
// in dev environments without OPENROUTER_API_KEY, contradicting the
// explicit "graceful degradation" policy documented in replit.md.

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://openrouter.ai/api/v1";
  if (!apiKey) {
    throw new Error(
      "No Anthropic-compatible API key found. Set OPENROUTER_API_KEY or provision the Anthropic AI integration.",
    );
  }
  cached = new Anthropic({ apiKey, baseURL });
  return cached;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as Anthropic;
