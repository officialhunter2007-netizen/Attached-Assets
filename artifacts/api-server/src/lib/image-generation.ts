/**
 * Teacher image generation — bulletproof, same-origin URLs.
 *
 * Pipeline (all on the SERVER, never the browser):
 *   1. SHA-256(prompt) → cache key.
 *   2. Disk cache hit? Return same-origin `/api/teacher-images/<hash>.<ext>`
 *      immediately (no network at all).
 *   3. fal.ai FLUX schnell (when FAL_KEY set) → fetch the bytes server-side,
 *      persist, return same-origin URL.
 *   4. Pollinations.ai FLUX (free, no key) → fetch the bytes server-side,
 *      persist, return same-origin URL.
 *   5. SVG poster fallback — generated locally, cannot fail. Guarantees the
 *      browser always receives a working URL, eliminating the "stuck
 *      spinner" failure mode forever.
 *
 * Because step 5 cannot fail, `isImageGenerationConfigured()` returns true
 * unconditionally and `generateTeacherImage` never returns `ok: false` for
 * provider errors — the caller always gets a usable URL.
 *
 * Arabic text inside images is impossible — FLUX garbles non-Latin scripts.
 * The teacher's prompt MUST contain "NO TEXT, NO LABELS" and write Arabic
 * captions in HTML directly underneath the [[IMAGE:id]] marker.
 */

import { recordAiUsage } from "./ai-usage";
import { logger } from "./logger";
import { resolveTeacherImage } from "./teacher-image-store";

// ── Per-user rate limit (only counts paid fal.ai paths) ─────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 8;
const userImageTimestamps = new Map<number, number[]>();

function checkRateLimit(userId: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const arr = userImageTimestamps.get(userId) ?? [];
  const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: RATE_WINDOW_MS - (now - oldest) };
  }
  recent.push(now);
  userImageTimestamps.set(userId, recent);
  return { allowed: true, retryAfterMs: 0 };
}

// ── Public types ─────────────────────────────────────────────────────────────
export type ImageGenerationResult =
  | { ok: true; url: string; latencyMs: number; provider: string }
  | {
      ok: false;
      reason: "rate-limited" | "empty-prompt";
      errorMessage: string;
      latencyMs: number;
    };

export type GenerateTeacherImageParams = {
  userId: number;
  subjectId?: string | null;
  /** English prompt for FLUX. Must include "NO TEXT NO LABELS NO WORDS". */
  prompt: string;
};

/** USD cost per fal.ai FLUX.1 schnell image. */
export const FLUX_SCHNELL_USD_PER_IMAGE = 0.003;

/**
 * Returns a same-origin image URL for the given educational prompt.
 *
 * Always succeeds (modulo the two structural errors above): even if every
 * external provider fails, an SVG poster is synthesised locally so the
 * student never sees a broken image or perpetual spinner.
 */
export async function generateTeacherImage(
  params: GenerateTeacherImageParams,
): Promise<ImageGenerationResult> {
  const start = Date.now();
  const cleanPrompt = (params.prompt || "").trim();

  if (cleanPrompt.length === 0) {
    return { ok: false, reason: "empty-prompt", errorMessage: "prompt is empty", latencyMs: 0 };
  }

  // Rate limit only applies when fal.ai is the active path (paid). When
  // FAL_KEY is unset we skip the limit because Pollinations + SVG cost $0.
  const falActive = !!(process.env.FAL_KEY || "").trim();
  if (falActive) {
    const rate = checkRateLimit(params.userId);
    if (!rate.allowed) {
      return {
        ok: false,
        reason: "rate-limited",
        errorMessage: `image rate limit (${RATE_MAX_PER_WINDOW}/min) exceeded; retry in ${Math.ceil(rate.retryAfterMs / 1000)}s`,
        latencyMs: 0,
      };
    }
  }

  const result = await resolveTeacherImage(cleanPrompt);
  const latencyMs = Date.now() - start;

  // Bookkeeping: only bill the user when fal.ai actually produced the image
  // (cache hits and Pollinations/SVG fallbacks are free).
  const billed = result.provider === "fal";
  // `recordAiUsage` only knows the canonical AiProvider union; we map the
  // store's provider tag onto it (fal/cache→fal-ai, anything else→fal-ai
  // with a metadata.provider override that captures the truth for logs).
  const aiProvider = "fal-ai" as const;
  void recordAiUsage({
    userId: params.userId,
    subjectId: params.subjectId ?? null,
    route: "ai/teach/image",
    provider: aiProvider,
    model: result.provider === "fal" ? "flux-schnell" : `flux-${result.provider}`,
    inputTokens: 0,
    outputTokens: billed ? 1 : 0,
    cachedInputTokens: 0,
    latencyMs,
    status: "success",
    metadata: { promptPreview: cleanPrompt.slice(0, 200), provider: result.provider },
  });
  logger.info(
    { route: "ai/teach/image", provider: result.provider, latencyMs, url: result.url.slice(0, 80) },
    "image-generation: resolved",
  );

  return { ok: true, url: result.url, latencyMs, provider: result.provider };
}

/**
 * Image generation is now ALWAYS available — the SVG poster fallback
 * cannot fail.
 */
export function isImageGenerationConfigured(): boolean {
  return true;
}
