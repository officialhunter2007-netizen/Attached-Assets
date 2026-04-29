import type { CostCapStatus } from "./cost-cap";

/**
 * Router invariants — unit-style assertions documented as comments. Any
 * change that breaks one of these MUST be flagged in code review.
 *
 *   I1 (NEVER BLOCK):  pickTeachingModel never returns a "block" / refusal
 *                       outcome. The output is always a valid model choice.
 *                       The platform never silences a paid student on cost
 *                       grounds; the only legitimate refusals (free-tier
 *                       15-msg cap, daily 20/40/70-msg cap, expired sub)
 *                       are enforced upstream of this router.
 *
 *   I2 (FREE TIER):    isFreeFirstLesson === true  ⇒  model === HAIKU.
 *
 *   I3 (UNLIMITED):    isUnlimited === true        ⇒  model === SONNET.
 *                       Reserved for admin/internal QA accounts so the team
 *                       can A/B-compare Haiku output against the strongest
 *                       Sonnet baseline at any time.
 *
 *   I4 (FORCE CHEAP):  costStatus.forceCheapModel === true  ⇒  model === HAIKU.
 *                       Reason is `total_cap_exhausted` when the lifetime cap
 *                       (with safety margin) is hit, otherwise
 *                       `daily_cap_exhausted`. Both downgrade quality only.
 *
 *   I5 (REASON SHAPE): every decision carries a non-empty `reason` string
 *                       suitable for analytics aggregation.
 *
 *   I6 (HAIKU-FIRST):  for every non-admin (non-unlimited) student turn the
 *                       chosen model is HAIKU. The router records *why* via
 *                       `reason` (free_tier_locked_haiku / total_cap_exhausted
 *                       / daily_cap_exhausted / haiku_diagnostic_phase /
 *                       haiku_mastery_check / haiku_lab_report /
 *                       haiku_deep_reasoning / haiku_long_message /
 *                       default_haiku) so analytics can still see the
 *                       teaching context the turn fell into.
 */

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
   *  synthesis turn). High-leverage but still on Haiku — the upgraded
   *  diagnostic system prompt + 8192 max_tokens ceiling lets Haiku produce
   *  a complete, well-structured personalized plan. The `reason` field
   *  records the context for analytics. */
  isDiagnostic: boolean;
  /** Lab report feedback turn (student message starts with [LAB_REPORT] or
   *  contains "نتائج من المختبر"/"نتائج من البيئة"). Routed to Haiku with
   *  the dedicated lab-report scaffold in the system prompt. */
  isLabReport: boolean;
  /** Mastery / teach-back check (the previous assistant message asked the
   *  student to explain the core idea in their own words). */
  isMasteryCheck: boolean;
  /** Length of the student's message in characters. */
  userMessageLength: number;
  /** True when the student's message contains diagnostic-difficulty signals
   *  (e.g. "لم أفهم", "اشرح بعمق", "خطأ", "صعب"). Routed to Haiku — the
   *  re-explain protocol in the system prompt handles depth via structured
   *  scaffolding rather than raw model capability. */
  needsDeepReasoning: boolean;
  /** Cost cap status — if `forceCheapModel` is true the router MUST pick Haiku. */
  costStatus: CostCapStatus;
  /** Unlimited admin user — always Sonnet for them (no cost concerns,
   *  reserved as a quality-comparison baseline for the internal team). */
  isUnlimited: boolean;
};

const SONNET = "claude-sonnet-4-6" as const;
const HAIKU = "claude-haiku-4-5" as const;

/**
 * Pick the AI model for a /ai/teach call.
 *
 * Policy (current):
 *  • Admin/unlimited users → Sonnet (so the internal team can A/B-compare
 *    Haiku output against the strongest baseline whenever they want).
 *  • Every other student turn → Haiku 4.5.
 *
 *  We deliberately route 100% of paid + free student traffic to Haiku 4.5
 *  because:
 *    - Haiku 4.5 is ~3× cheaper on input AND output than Sonnet 4.6, which
 *      lets us hit our cost-per-subscription target with substantial margin.
 *    - Haiku follows clear, explicit instructions extremely well — the
 *      teaching system prompt is heavily structured (think-before-answer
 *      protocol, self-check checklist, explicit ASK_OPTIONS templates,
 *      scaffolded re-explain protocol) so Haiku reaches very-high teaching
 *      quality without paying the Sonnet premium.
 *    - We never block a paid student; cost-cap fall-throughs already land
 *      on Haiku, so the change unifies the routing rather than degrading
 *      anyone's experience.
 *
 *  We still record the *teaching context* of every turn in `reason`
 *  (haiku_diagnostic_phase, haiku_mastery_check, haiku_lab_report,
 *  haiku_deep_reasoning, haiku_long_message, default_haiku) so analytics
 *  can slice usage and quality by the same buckets we used to route on.
 */
export function pickTeachingModel(input: RouterInput): RouterDecision {
  // Admin / internal QA: keep Sonnet so the team can compare quality.
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

  // All other paid student traffic → Haiku. We still tag the teaching
  // context in `reason` so analytics can see which kinds of turns the
  // student is producing (diagnostic vs mastery vs lab report vs default).
  if (input.isDiagnostic) {
    return { model: HAIKU, provider: "anthropic", reason: "haiku_diagnostic_phase" };
  }
  if (input.isMasteryCheck) {
    return { model: HAIKU, provider: "anthropic", reason: "haiku_mastery_check" };
  }
  if (input.isLabReport) {
    return { model: HAIKU, provider: "anthropic", reason: "haiku_lab_report" };
  }
  if (input.needsDeepReasoning) {
    return { model: HAIKU, provider: "anthropic", reason: "haiku_deep_reasoning" };
  }
  if (input.userMessageLength >= 600) {
    return { model: HAIKU, provider: "anthropic", reason: "haiku_long_message" };
  }

  // Default: regular Q&A turn.
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
