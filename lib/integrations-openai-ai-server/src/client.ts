import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://openrouter.ai/api/v1";

if (!apiKey) {
  throw new Error(
    "No OpenAI-compatible API key found. Set OPENROUTER_API_KEY or provision the OpenAI AI integration.",
  );
}

export const openai = new OpenAI({
  apiKey,
  baseURL,
});
