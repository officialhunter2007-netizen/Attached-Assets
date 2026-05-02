import OpenAI from "openai";

// Lazy client: do NOT throw at module import time. The api-server boots even
// without an OpenAI-compatible key — only AI routes that actually call the
// client should fail (loudly, with a friendly Arabic apology streamed to
// the student via the existing GeminiAuthError / GeminiCreditExhaustedError
// handling in routes/ai.ts). Throwing at import broke every smoke-test and
// every non-AI admin endpoint in dev environments without OPENROUTER_API_KEY,
// even though replit.md explicitly documents graceful degradation as the
// intended behavior ("Replit Dev does NOT have an OpenRouter key … every
// request there will surface the friendly 'service paused' apology by
// design until OpenRouter is configured").

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  if (!apiKey) {
    throw new Error(
      "No OpenAI-compatible API key found. Set OPENROUTER_API_KEY or provision the OpenAI AI integration.",
    );
  }
  cached = new OpenAI({ apiKey, baseURL });
  return cached;
}

// Proxy preserves the previous import-and-use ergonomics (`openai.chat.completions.create(...)`)
// while deferring construction until the first real call.
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as OpenAI;
