// Dedicated OpenAI client for /audio/speech + /audio/transcriptions.
// OpenRouter does not proxy these endpoints, so we target api.openai.com
// directly using OPENAI_API_KEY (or the Replit integration's
// AI_INTEGRATIONS_OPENAI_API_KEY). Lazy: api-server still boots without
// a key — the routes return a friendly 503 in that case.
import { OpenAI } from "@workspace/integrations-openai-ai-server";

type OpenAIClient = InstanceType<typeof OpenAI>;
let cached: OpenAIClient | null = null;

export function getOpenAIAudioClient(): OpenAIClient | null {
  if (cached) return cached;
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  cached = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });
  return cached;
}

export function isOpenAIAudioConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  );
}
