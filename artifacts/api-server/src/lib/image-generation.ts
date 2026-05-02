/**
 * FLUX.1 [schnell] image generation via fal.ai for the AI teacher.
 *
 * The smart teacher emits `[[IMAGE: english prompt]]` tags inline in its
 * response when a visual concept genuinely needs an illustration. We detect
 * the tag mid-stream, fire a non-blocking generation, and ship the resulting
 * URL to the frontend via a separate SSE event so the placeholder swaps in
 * the actual image.
 *
 * Cost: ~$0.003 per image. Latency: ~1-3s typical, 8s hard timeout.
 *
 * Arabic text inside images is impossible — FLUX (and every current diffusion
 * model) garbles non-Latin scripts. The teacher's prompt MUST contain
 * "NO TEXT, NO LABELS" and the teacher MUST write Arabic captions in HTML
 * directly underneath the tag (enforced in the system prompt). The image is
 * pure visual: icons, shapes, numbered circles, color-coded boxes.
 */

import { config as falConfig, subscribe as falSubscribe } from "@fal-ai/serverless-client";
import { recordAiUsage } from "./ai-usage";
import { logger } from "./logger";

// ── SDK config ──────────────────────────────────────────────────────────────
// fal.config({credentials}) reads from FAL_KEY env var by default. We call
// it explicitly so a missing/empty key raises immediately at startup-ish
// boundary instead of failing on every image request.
let __falConfigured = false;
function ensureFalConfigured(): boolean {
  if (__falConfigured) return true;
  const key = process.env.FAL_KEY;
  if (!key || !key.trim()) {
    return false;
  }
  falConfig({ credentials: key.trim() });
  __falConfigured = true;
  return true;
}

// ── Per-user rate limit ─────────────────────────────────────────────────────
// In-memory sliding window. Caps each user at 8 image generations per minute
// to prevent runaway cost if the model hallucinates the IMAGE tag in every
// reply during a hot loop. This is a soft safety net on top of the per-reply
// MAX_IMAGES_PER_REPLY cap (3) and the system-prompt usage policy. The cap
// was raised from 5 → 8 in task #15 so the new pedagogical patterns
// (Compare/Contrast = 2 images, Hook + Reveal across two consecutive turns)
// don't get rate-throttled mid-lesson.
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

// ── Public API ──────────────────────────────────────────────────────────────

export type ImageGenerationResult = {
  ok: true;
  url: string;
  latencyMs: number;
} | {
  ok: false;
  reason: "missing-key" | "rate-limited" | "timeout" | "api-error" | "empty-prompt";
  errorMessage: string;
  latencyMs: number;
};

export type GenerateTeacherImageParams = {
  userId: number;
  subjectId?: string | null;
  /** English prompt for FLUX. The caller MUST sanitize for "NO TEXT" guidance. */
  prompt: string;
};

/** Hard upper bound on generation wall-clock (ms). */
const TIMEOUT_MS = 8_000;

/** USD cost per FLUX.1 schnell image (fal.ai pricing as of 2025-2026). */
export const FLUX_SCHNELL_USD_PER_IMAGE = 0.003;

/**
 * Returns a freshly-generated image URL for the given prompt, or a
 * structured error reason that the caller can surface to the frontend.
 *
 * Records the usage in `ai_usage_events` regardless of success/failure
 * (failures recorded with status="error" and cost=0).
 */
export async function generateTeacherImage(
  params: GenerateTeacherImageParams,
): Promise<ImageGenerationResult> {
  const start = Date.now();
  const cleanPrompt = (params.prompt || "").trim();

  if (cleanPrompt.length === 0) {
    return {
      ok: false,
      reason: "empty-prompt",
      errorMessage: "prompt is empty",
      latencyMs: 0,
    };
  }

  if (!ensureFalConfigured()) {
    logger.warn(
      { route: "ai/teach/image", userId: params.userId },
      "image-generation: FAL_KEY not set; skipping generation",
    );
    return {
      ok: false,
      reason: "missing-key",
      errorMessage: "FAL_KEY env var is not configured",
      latencyMs: 0,
    };
  }

  const rate = checkRateLimit(params.userId);
  if (!rate.allowed) {
    return {
      ok: false,
      reason: "rate-limited",
      errorMessage: `image rate limit (8/min) exceeded; retry in ${Math.ceil(rate.retryAfterMs / 1000)}s`,
      latencyMs: 0,
    };
  }

  // ── fal.subscribe with a hard timeout ────────────────────────────────────
  // fal.subscribe waits for the queued job to finish and resolves with the
  // final result payload. We race it against a hard 8s timer so a stuck
  // fal.ai queue can't stall the teaching reply for half a minute.
  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`fal.ai timeout after ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS,
    );
  });

  try {
    const result: any = await Promise.race([
      falSubscribe("fal-ai/flux/schnell", {
        input: {
          prompt: cleanPrompt,
          // schnell is the fastest FLUX variant: 1-4 inference steps.
          // 4 steps gives noticeably better composition than 1-2 with
          // marginal latency cost (~200ms more).
          num_inference_steps: 4,
          // 1024×1024 is the schnell sweet spot for cost+quality.
          image_size: "square_hd",
          num_images: 1,
          // Disable safety_checker only for educational illustrations
          // where the prompt is teacher-controlled (not user input).
          // The teacher's prompts are constrained by the system prompt
          // to educational concepts; bypassing the checker avoids
          // false-positives on diagrams of human anatomy, weapons in
          // history lessons, etc.
          enable_safety_checker: true,
          // sync_mode: false → fal returns CDN URLs immediately rather
          // than inlining base64 (which would balloon SSE payloads).
          sync_mode: false,
        },
        logs: false,
      }),
      timeoutPromise,
    ]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    const url: string | undefined = result?.images?.[0]?.url;
    if (!url) {
      throw new Error("fal.ai returned no image URL");
    }
    const latencyMs = Date.now() - start;

    // Record successful usage. We model "1 image = 1 output token" so the
    // existing recordAiUsage / costForUsage / Math.ceil(cost*1000) gem
    // pipeline continues to work without special-casing image events.
    // ai-pricing.ts has a flux-schnell entry at output=$3000/M which gives
    // exactly $0.003 per "token" (per image).
    void recordAiUsage({
      userId: params.userId,
      subjectId: params.subjectId ?? null,
      route: "ai/teach/image",
      provider: "fal-ai",
      model: "flux-schnell",
      inputTokens: 0,
      outputTokens: 1,
      cachedInputTokens: 0,
      latencyMs,
      status: "success",
      metadata: { promptPreview: cleanPrompt.slice(0, 200) },
    });

    return { ok: true, url, latencyMs };
  } catch (err: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    const latencyMs = Date.now() - start;
    const message = err?.message || String(err);
    const reason: "timeout" | "api-error" = /timeout/i.test(message) ? "timeout" : "api-error";

    logger.warn(
      { route: "ai/teach/image", userId: params.userId, reason, message, latencyMs },
      "image-generation: failed",
    );

    void recordAiUsage({
      userId: params.userId,
      subjectId: params.subjectId ?? null,
      route: "ai/teach/image",
      provider: "fal-ai",
      model: "flux-schnell",
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      latencyMs,
      status: "error",
      errorMessage: message.slice(0, 500),
      metadata: { promptPreview: cleanPrompt.slice(0, 200), reason },
    });

    return { ok: false, reason, errorMessage: message, latencyMs };
  }
}

/**
 * Cheap pre-flight check used by the route to skip image plumbing entirely
 * when no key is configured. Avoids the wasted Promise overhead per request.
 */
export function isImageGenerationConfigured(): boolean {
  return !!process.env.FAL_KEY && process.env.FAL_KEY.trim().length > 0;
}
