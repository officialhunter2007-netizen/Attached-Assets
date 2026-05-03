export { openai } from "./client";
// Re-export the raw `OpenAI` class + `toFile` upload helper so downstream
// packages (api-server's voice routes) can construct alternative clients
// pointed at api.openai.com (for /audio/speech and /audio/transcriptions
// which OpenRouter doesn't proxy) without taking their own dependency on
// the `openai` npm package — keeping a single source of truth for the
// SDK version across the monorepo.
export { default as OpenAI } from "openai";
export { toFile } from "openai/uploads";
export { generateImageBuffer, editImages } from "./image";
export { batchProcess, batchProcessWithSSE, isRateLimitError, type BatchOptions } from "./batch";
