import { and, eq, gte, sum } from "drizzle-orm";
import { db, aiUsageEventsTable } from "@workspace/db";
import { costForUsage } from "./ai-pricing";
import { logger } from "./logger";

export type AiProvider = "anthropic" | "gemini" | "openai";

/**
 * Optional per-subscription cap context. When provided, recordAiUsage runs a
 * pre-insert clamp: if (lifetime spend on this subject since `windowStart`) +
 * (this turn's cost) would exceed `capUsd`, the **recorded** cost is clamped
 * down to whatever room is left (possibly to 0). The platform may still pay
 * Anthropic the un-clamped amount, but the accounting field
 * `ai_usage_events.costUsd` SUM cannot exceed `capUsd` for this subject.
 *
 * This is the "billable-cost suppression after total cap exhaustion" pattern:
 * combined with the never-block UX, it lets us honor the
 * "AI cost ≤ 50% of paid" red-line invariant without ever silencing a paid
 * student mid-subscription.
 */
export type CapContext = {
  userId: number;
  subjectId: string;
  /** Earliest event to count toward this subscription's lifetime spend. */
  windowStart: Date;
  /** Hard ceiling — the recorded SUM(costUsd) on this window will never exceed this. */
  capUsd: number;
};

export type RecordAiUsageParams = {
  userId: number | null;
  subjectId?: string | null;
  route: string;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  latencyMs?: number;
  status?: "success" | "error";
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  /** When set, clamps the recorded cost so cap is never exceeded (see CapContext). */
  capContext?: CapContext | null;
};

/**
 * Persist a single AI call's usage row. Swallows its own errors so a tracking
 * failure can never break a user-facing request.
 */
export async function recordAiUsage(params: RecordAiUsageParams): Promise<void> {
  try {
    let cost = costForUsage({
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      cachedInputTokens: params.cachedInputTokens,
    });

    let clampedFromUsd: number | null = null;
    if (params.capContext) {
      const { userId, subjectId, windowStart, capUsd } = params.capContext;
      try {
        const [row] = await db
          .select({ total: sum(aiUsageEventsTable.costUsd) })
          .from(aiUsageEventsTable)
          .where(and(
            eq(aiUsageEventsTable.userId, userId),
            eq(aiUsageEventsTable.subjectId, subjectId),
            gte(aiUsageEventsTable.createdAt, windowStart),
          ));
        const currentSum = Number(row?.total ?? 0) || 0;
        const remaining = Math.max(0, capUsd - currentSum);
        if (cost > remaining) {
          clampedFromUsd = cost;
          cost = remaining;
        }
      } catch (err: any) {
        // If the read fails we'd rather under-record than risk silently
        // letting an over-cap row land. Clamp to 0 as the safe default.
        logger.warn(
          { err: err?.message, route: params.route },
          "ai-usage: cap-context read failed; clamping cost to 0",
        );
        clampedFromUsd = cost;
        cost = 0;
      }
    }

    const metadata = clampedFromUsd != null
      ? { ...(params.metadata ?? {}), costClampedFromUsd: clampedFromUsd }
      : params.metadata ?? null;

    await db.insert(aiUsageEventsTable).values({
      userId: params.userId ?? null,
      subjectId: params.subjectId ?? null,
      route: params.route,
      provider: params.provider,
      model: params.model,
      inputTokens: Math.max(0, Math.floor(params.inputTokens || 0)),
      outputTokens: Math.max(0, Math.floor(params.outputTokens || 0)),
      cachedInputTokens: Math.max(
        0,
        Math.floor(params.cachedInputTokens || 0),
      ),
      costUsd: cost.toFixed(8),
      latencyMs: params.latencyMs ?? null,
      status: params.status ?? "success",
      errorMessage: params.errorMessage ?? null,
      metadata: (metadata as any) ?? null,
    });
  } catch (err: any) {
    logger.warn(
      { err: err?.message, route: params.route, model: params.model },
      "ai-usage: failed to record event",
    );
  }
}

// ── Provider-specific token extractors ──────────────────────────────────────

/** Extract usage from an Anthropic SDK response or final-stream message. */
export function extractAnthropicUsage(msg: any): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
} {
  const u = msg?.usage ?? {};
  const inputTokens =
    Number(u.input_tokens ?? 0) +
    Number(u.cache_creation_input_tokens ?? 0); // cache creation IS billed at input rate
  const cachedInputTokens = Number(u.cache_read_input_tokens ?? 0);
  const outputTokens = Number(u.output_tokens ?? 0);
  return {
    inputTokens: inputTokens + cachedInputTokens, // total prompt tokens
    outputTokens,
    cachedInputTokens,
  };
}

/** Extract usage from an OpenAI chat-completion stream's final usage chunk. */
export function extractOpenAIUsage(usage: any): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
} {
  if (!usage) {
    return { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  }
  const cachedInputTokens = Number(
    usage?.prompt_tokens_details?.cached_tokens ?? 0,
  );
  return {
    inputTokens: Number(usage.prompt_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? 0),
    cachedInputTokens,
  };
}

/** Extract usage from a Gemini REST response (streaming or non-streaming). */
export function extractGeminiUsage(usageMetadata: any): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
} {
  if (!usageMetadata) {
    return { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  }
  const cachedInputTokens = Number(usageMetadata.cachedContentTokenCount ?? 0);
  return {
    inputTokens: Number(usageMetadata.promptTokenCount ?? 0),
    outputTokens: Number(usageMetadata.candidatesTokenCount ?? 0),
    cachedInputTokens,
  };
}
