import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || "https://openrouter.ai/api/v1";

if (!apiKey) {
  throw new Error(
    "No Anthropic-compatible API key found. Set OPENROUTER_API_KEY or provision the Anthropic AI integration.",
  );
}

export const anthropic = new Anthropic({
  apiKey,
  baseURL,
});
