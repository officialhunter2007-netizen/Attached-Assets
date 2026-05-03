/**
 * Teacher image generation — two providers, zero required config.
 *
 * Provider priority:
 *   1. fal.ai  FLUX.1 [schnell]  (FAL_KEY set)
 *      • Server-side generation: ~1-3s, $0.003/image, CDN URL returned.
 *   2. Pollinations.ai FLUX  (no key, always available, FREE)
 *      • URL returned instantly; browser fetches the image directly.
 *        Generation happens client-side, ~5-15s to appear on screen.
 *      • No signup, no quota, no API key. Open-source community service.
 *
 * Because Pollinations is always available, `isImageGenerationConfigured()`
 * now returns `true` unconditionally. The teacher's system-prompt IMAGE
 * instructions are active on every server, even without FAL_KEY.
 *
 * Arabic text inside images is impossible — FLUX garbles non-Latin scripts.
 * The teacher's prompt MUST contain "NO TEXT, NO LABELS" and write Arabic
 * captions in HTML directly underneath the [[IMAGE:id]] marker.
 */

import { config as falConfig, subscribe as falSubscribe } from "@fal-ai/serverless-client";
import { recordAiUsage } from "./ai-usage";
import { logger } from "./logger";

// ── fal.ai SDK config ────────────────────────────────────────────────────────
let __falConfigured = false;
function isFalConfigured(): boolean {
  if (__falConfigured) return true;
  const key = (process.env.FAL_KEY || "").trim();
  if (!key) return false;
  falConfig({ credentials: key });
  __falConfigured = true;
  return true;
}

// ── Per-user rate limit (fal.ai only) ───────────────────────────────────────
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

// ── Pollinations.ai (free, no key) ──────────────────────────────────────────
/**
 * Build a Pollinations.ai FLUX image URL for the given prompt.
 * The URL is returned immediately — the browser fetches the actual image
 * when the <img> element loads. No server-side HTTP call needed.
 *
 * Prompt is capped at 600 chars to keep the URL under ~2 KB. FLUX prompts
 * are typically 200-400 chars so this never truncates in practice.
 *
 * `nofeed=true` keeps the generated image out of Pollinations' public gallery.
 * `enhance=false` disables Pollinations' auto-prompt rewriting so our
 * carefully crafted "NO TEXT NO LABELS" prompt reaches FLUX verbatim.
 */
function buildPollinationsUrl(prompt: string): string {
  const clean = prompt.trim().slice(0, 600);
  const seed = Math.floor(Math.random() * 999_999) + 1;
  const qs = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    nologo: "true",
    nofeed: "true",
    enhance: "false",
    seed: String(seed),
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?${qs}`;
}

// ── Public types ─────────────────────────────────────────────────────────────
export type ImageGenerationResult =
  | { ok: true; url: string; latencyMs: number }
  | {
      ok: false;
      reason: "rate-limited" | "timeout" | "api-error" | "empty-prompt";
      errorMessage: string;
      latencyMs: number;
    };

export type GenerateTeacherImageParams = {
  userId: number;
  subjectId?: string | null;
  /** English prompt for FLUX. Must include "NO TEXT NO LABELS NO WORDS". */
  prompt: string;
};

/** Hard upper bound for fal.ai generation (ms). Tunable via FAL_TIMEOUT_MS. */
const FAL_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.FAL_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000 ? raw : 25_000;
})();

/** USD cost per fal.ai FLUX.1 schnell image. */
export const FLUX_SCHNELL_USD_PER_IMAGE = 0.003;

/**
 * Returns an image URL for the given educational prompt.
 *
 * When FAL_KEY is set: uses fal.ai (fast, ~1-3 s, server-side generation).
 * When FAL_KEY is absent: uses Pollinations.ai (URL returned instantly;
 *   browser fetches the image — free, no key, ~5-15 s client-side).
 */
export async function generateTeacherImage(
  params: GenerateTeacherImageParams,
): Promise<ImageGenerationResult> {
  const start = Date.now();
  const cleanPrompt = (params.prompt || "").trim();

  if (cleanPrompt.length === 0) {
    return { ok: false, reason: "empty-prompt", errorMessage: "prompt is empty", latencyMs: 0 };
  }

  // ── Path A: fal.ai (when FAL_KEY is configured) ──────────────────────────
  if (isFalConfigured()) {
    const rate = checkRateLimit(params.userId);
    if (!rate.allowed) {
      return {
        ok: false,
        reason: "rate-limited",
        errorMessage: `image rate limit (${RATE_MAX_PER_WINDOW}/min) exceeded; retry in ${Math.ceil(rate.retryAfterMs / 1000)}s`,
        latencyMs: 0,
      };
    }

    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`fal.ai timeout after ${FAL_TIMEOUT_MS}ms`)),
        FAL_TIMEOUT_MS,
      );
    });

    try {
      const result: any = await Promise.race([
        falSubscribe("fal-ai/flux/schnell", {
          input: {
            prompt: cleanPrompt,
            num_inference_steps: 4,
            image_size: "square_hd",
            num_images: 1,
            enable_safety_checker: true,
            sync_mode: false,
          },
          logs: false,
        }),
        timeoutPromise,
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);

      const url: string | undefined = result?.images?.[0]?.url;
      if (!url) throw new Error("fal.ai returned no image URL");

      const latencyMs = Date.now() - start;
      void recordAiUsage({
        userId: params.userId,
        subjectId: params.subjectId ?? null,
        route: "ai/teach/image",
        provider: "fal-ai",
        model: "flux-schnell",
        inputTokens: 0, outputTokens: 1, cachedInputTokens: 0,
        latencyMs, status: "success",
        metadata: { promptPreview: cleanPrompt.slice(0, 200) },
      });
      logger.info(
        { route: "ai/teach/image", provider: "fal-ai", latencyMs },
        "image-generation: fal.ai success",
      );
      return { ok: true, url, latencyMs };
    } catch (err: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const latencyMs = Date.now() - start;
      const message = err?.message || String(err);
      const reason: "timeout" | "api-error" = /timeout/i.test(message) ? "timeout" : "api-error";
      logger.warn(
        { route: "ai/teach/image", provider: "fal-ai", reason, message, latencyMs },
        "image-generation: fal.ai failed — falling through to Pollinations",
      );
      void recordAiUsage({
        userId: params.userId, subjectId: params.subjectId ?? null,
        route: "ai/teach/image", provider: "fal-ai", model: "flux-schnell",
        inputTokens: 0, outputTokens: 0, cachedInputTokens: 0,
        latencyMs, status: "error",
        errorMessage: message.slice(0, 500),
        metadata: { promptPreview: cleanPrompt.slice(0, 200), reason },
      });
      // Fall through to Pollinations below instead of returning an error.
    }
  }

  // ── Path B: Pollinations.ai (free, always available) ────────────────────
  // URL is constructed locally — no HTTP call, instant response. The browser
  // fetches the actual image when it renders the <img> element.
  const url = buildPollinationsUrl(cleanPrompt);
  const latencyMs = Date.now() - start;
  logger.info(
    { route: "ai/teach/image", provider: "pollinations", latencyMs, url: url.slice(0, 120) },
    "image-generation: using Pollinations.ai (client-side fetch)",
  );
  void recordAiUsage({
    userId: params.userId, subjectId: params.subjectId ?? null,
    route: "ai/teach/image", provider: "pollinations", model: "flux",
    inputTokens: 0, outputTokens: 1, cachedInputTokens: 0,
    latencyMs, status: "success",
    metadata: { promptPreview: cleanPrompt.slice(0, 200) },
  });
  return { ok: true, url, latencyMs };
}

/**
 * Image generation is now ALWAYS available — Pollinations.ai requires no key.
 * When FAL_KEY is also set, fal.ai is used first for faster server-side generation.
 */
export function isImageGenerationConfigured(): boolean {
  return true;
}
