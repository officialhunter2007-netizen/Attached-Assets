// Dedicated OpenAI client for the audio endpoints (`tts` + `stt`).
//
// The shared `@workspace/integrations-openai-ai-server` client points at
// OpenRouter (`AI_INTEGRATIONS_OPENAI_BASE_URL` defaults to OpenRouter),
// and OpenRouter does NOT proxy the `/audio/speech` and
// `/audio/transcriptions` endpoints — they are OpenAI-direct only. We
// therefore construct a separate client that targets `api.openai.com`
// using a plain OpenAI API key.
//
// Resolution order for the key:
//   1. OPENAI_API_KEY       — direct env override / Replit secret
//   2. AI_INTEGRATIONS_OPENAI_API_KEY — set by the Replit OpenAI integration
//
// The client is constructed lazily so the api-server still boots in dev
// environments that don't have either key configured (the route handlers
// fall back to a friendly 503 in that case).

// `OpenAI` is re-exported from the workspace integration package so this
// file doesn't need its own dependency on the `openai` npm package — the
// integration package owns the SDK version pin for the whole monorepo.
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
