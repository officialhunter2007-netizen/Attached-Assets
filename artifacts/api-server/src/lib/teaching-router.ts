import type { CostCapStatus } from "./cost-cap";

export type RouterDecision = {
  model: "claude-sonnet-4-6" | "claude-haiku-4-5";
  provider: "anthropic";
  /** Why this model was picked — surfaces in logs/metadata for analysis. */
  reason: string;
};

export type RouterInput = {
  /** Free first-lesson tier — ALWAYS Haiku, no exceptions (cost protection). */
  isFreeFirstLesson: boolean;
  /** Any diagnostic-phase turn (the 4 questions + the plan-generation
   *  synthesis turn). Diagnostic is a one-time-per-subject high-leverage
   *  phase that sets the entire learning plan, so even on paid traffic
   *  it stays on Sonnet. (Free-tier diagnostic is still locked to Haiku
   *  by the `isFreeFirstLesson` rule above, which fires first.) */
  isDiagnostic: boolean;
  /** Lab report feedback turn (student message starts with [LAB_REPORT] or
   *  contains "نتائج من المختبر"/"نتائج من البيئة") — Sonnet for quality. */
  isLabReport: boolean;
  /** Mastery / teach-back check (the previous assistant message asked the
   *  student to explain the core idea in their own words). */
  isMasteryCheck: boolean;
  /** Length of the student's message in characters. */
  userMessageLength: number;
  /** True when the student's message contains diagnostic-difficulty signals
   *  (e.g. "لم أفهم", "اشرح بعمق", "خطأ", "صعب") — Sonnet handles depth better. */
  needsDeepReasoning: boolean;
  /** Cost cap status — if `forceCheapModel` is true the router MUST pick Haiku. */
  costStatus: CostCapStatus;
  /** Unlimited admin user — always Sonnet for them (no cost concerns). */
  isUnlimited: boolean;
};

const SONNET = "claude-sonnet-4-6" as const;
const HAIKU = "claude-haiku-4-5" as const;

/**
 * Pick the AI model for a /ai/teach call.
 *
 * Goals:
 *  1. RED LINE: free tier and cost-capped students NEVER touch Sonnet.
 *  2. ~30% Sonnet usage on paid traffic — reserved for the moments where
 *     Sonnet's reasoning depth produces measurable teaching gains:
 *       • Entire diagnostic phase (4 questions + plan-generation synthesis)
 *         — one-time-per-subject and decides the whole learning plan
 *       • Mastery / teach-back check before stage completion
 *       • Lab report feedback turn
 *       • Confusion keywords (lock for any "I don't understand" signal)
 *       • Long student messages (≥600 chars)
 *     Everything else — incremental Q&A, session openers — routes to Haiku.
 */
export function pickTeachingModel(input: RouterInput): RouterDecision {
  if (input.isUnlimited) {
    return { model: SONNET, provider: "anthropic", reason: "unlimited_user" };
  }

  // Hard rule: free tier locked to Haiku no matter what.
  if (input.isFreeFirstLesson) {
    return { model: HAIKU, provider: "anthropic", reason: "free_tier_locked_haiku" };
  }

  // Daily-rolling budget exhausted → Haiku for the rest of the day.
  // Two distinct reasons help admin analytics see whether students are hitting
  // the *daily* slice (expected; resets at Yemen midnight) vs the *lifetime*
  // 50%-of-paid cap (rare; should never happen before daily exhaustion fires
  // first, but covered for defense-in-depth). Both downgrade quality only —
  // the student is never blocked mid-subscription.
  if (input.costStatus.forceCheapModel) {
    // Read the explicit predicates from cost-cap so analytics reasons exactly
    // match the trigger predicate (both already account for the per-turn
    // safety margin). When both fire at once the lifetime cap wins because
    // it is the harder ceiling.
    const reason = input.costStatus.totalExhausted
      ? "total_cap_exhausted"
      : "daily_cap_exhausted";
    return { model: HAIKU, provider: "anthropic", reason };
  }

  // Selective Sonnet usage — strict whitelist only.
  if (input.isDiagnostic) {
    return { model: SONNET, provider: "anthropic", reason: "diagnostic_phase" };
  }
  if (input.isMasteryCheck) {
    return { model: SONNET, provider: "anthropic", reason: "mastery_check" };
  }
  if (input.isLabReport) {
    return { model: SONNET, provider: "anthropic", reason: "lab_report_feedback" };
  }
  if (input.needsDeepReasoning) {
    return { model: SONNET, provider: "anthropic", reason: "deep_reasoning_signal" };
  }
  if (input.userMessageLength >= 600) {
    return { model: SONNET, provider: "anthropic", reason: "long_user_message" };
  }

  // Default: Haiku covers ~70% of paid traffic.
  return { model: HAIKU, provider: "anthropic", reason: "default_haiku" };
}

/** Detect whether the prior assistant turn asked the student to teach back —
 *  i.e. this turn is the student's mastery answer that must be evaluated. */
export function detectMasteryCheckFromHistory(
  history: Array<{ role: string; content: string }> | null | undefined,
): boolean {
  if (!history || history.length === 0) return false;
  const last = [...history].reverse().find((m) => m.role === "assistant");
  if (!last) return false;
  return MASTERY_PROMPTS.some((re) => re.test(last.content || ""));
}

const MASTERY_PROMPTS = [
  /اشرح(?:[\s ]?لي)?[\s ]?بكلماتك/u,
  /علّمني|علمني/u,
  /بأسلوبك[\s ]?(?:الخاص)?/u,
  /لخّص[\s ]?(?:لي)?[\s ]?بكلماتك/u,
  /\bteach[\s ]?back\b/i,
  /\bin[\s ]?your[\s ]?own[\s ]?words\b/i,
];

/** Detect whether the student's message is a lab-environment report. */
export function detectLabReport(userMessage: string | null | undefined): boolean {
  if (!userMessage) return false;
  if (userMessage.startsWith("[LAB_REPORT]")) return true;
  return /نتائج[\s ]?من[\s ]?(?:المختبر|البيئة)/u.test(userMessage);
}

const DEEP_SIGNALS = [
  /لم[\s ]?أفهم/u,
  /لا[\s ]?أفهم/u,
  /ما[\s ]?فهمت/u,
  /اشرح[\s ]?(?:أكثر|بعمق|مرة[\s ]?ثانية|بالتفصيل)/u,
  /وضّح|وضح/u,
  /صعب[\s ]?(?:جداً|جدا|علي)/u,
  /\bexplain[\s ]?(?:more|deeper|again|in[\s ]?detail)\b/i,
  /\bI[\s ]?(?:don'?t|do[\s ]?not)[\s ]?(?:understand|get[\s ]?it)\b/i,
];

export function detectDeepReasoning(userMessage: string | null | undefined): boolean {
  if (!userMessage) return false;
  return DEEP_SIGNALS.some((re) => re.test(userMessage));
}
