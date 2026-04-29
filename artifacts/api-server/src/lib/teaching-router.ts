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
 *   I2 (FREE TIER):    isFreeFirstLesson === true  ⇒  provider === GEMINI
 *                       (free tier uses the same Gemini path as paid students).
 *                       On Gemini failure the route returns a friendly Arabic
 *                       apology and rolls back the free-turn claim.
 *
 *   I3 (UNLIMITED):    isUnlimited === true        ⇒  provider === ANTHROPIC,
 *                       model === SONNET. Reserved for admin/internal QA
 *                       accounts so the team can A/B-compare Gemini output
 *                       against the strongest Sonnet baseline at any time.
 *
 *   I4 (FORCE CHEAP):  costStatus.forceCheapModel === true  ⇒  provider ===
 *                       GEMINI (already the cheapest sustainable path).
 *                       Reason is `total_cap_exhausted` when the lifetime cap
 *                       (with safety margin) is hit, otherwise
 *                       `daily_cap_exhausted`. Both downgrade quality only.
 *
 *   I5 (REASON SHAPE): every decision carries a non-empty `reason` string
 *                       suitable for analytics aggregation.
 *
 *   I6 (GEMINI-ONLY):  for every non-admin (non-unlimited) student turn the
 *                       chosen model is GEMINI 2.0 FLASH — no fallback to
 *                       any other model. The router records *why* via `reason`
 *                       (free_tier_locked_gemini / total_cap_exhausted /
 *                       daily_cap_exhausted / gemini_diagnostic_phase /
 *                       gemini_mastery_check / gemini_lab_report /
 *                       gemini_deep_reasoning / gemini_long_message /
 *                       default_gemini) so analytics can slice by context.
 *
 *   I7 (NO FALLBACK):  /ai/teach does NOT fall back to any other model on
 *                       Gemini failure. A friendly Arabic apology is streamed
 *                       instead and the turn is not counted against the
 *                       student's quota. Only admin/unlimited traffic ever
 *                       touches the Anthropic SDK path.
 */

export type RouterDecision = {
  model: "claude-sonnet-4-6" | "gemini-2.0-flash";
  provider: "anthropic" | "gemini";
  /** Why this model was picked — surfaces in logs/metadata for analysis. */
  reason: string;
};

export type RouterInput = {
  /** Free first-lesson tier — routes to Gemini 2.0 Flash (same as paid). */
  isFreeFirstLesson: boolean;
  /** Any diagnostic-phase turn (the 4 questions + the plan-generation
   *  synthesis turn). Still on Gemini — the upgraded diagnostic system prompt
   *  + 8192 max_tokens ceiling produces a complete personalized plan. The
   *  `reason` field records the context for analytics. */
  isDiagnostic: boolean;
  /** Lab report feedback turn (student message starts with [LAB_REPORT] or
   *  contains "نتائج من المختبر"/"نتائج من البيئة"). Routed to Gemini with
   *  the dedicated lab-report scaffold in the system prompt. */
  isLabReport: boolean;
  /** Mastery / teach-back check (the previous assistant message asked the
   *  student to explain the core idea in their own words). */
  isMasteryCheck: boolean;
  /** Length of the student's message in characters. */
  userMessageLength: number;
  /** True when the student's message contains diagnostic-difficulty signals
   *  (e.g. "لم أفهم", "اشرح بعمق", "خطأ", "صعب"). Routed to Gemini with
   *  the re-explain protocol in the system prompt for structured depth. */
  needsDeepReasoning: boolean;
  /** Cost cap status — if `forceCheapModel` is true the router stays on
   *  Gemini (already the cheapest path; no downgrade possible). */
  costStatus: CostCapStatus;
  /** Unlimited admin user — always Sonnet for them (no cost concerns,
   *  reserved as a quality-comparison baseline for the internal team). */
  isUnlimited: boolean;
};

const SONNET = "claude-sonnet-4-6" as const;
const GEMINI = "gemini-2.0-flash" as const;

/**
 * Pick the AI model for a /ai/teach call.
 *
 * Policy (current):
 *  • Admin/unlimited users → Sonnet 4.6 via Anthropic (so the internal team
 *    can A/B-compare Gemini output against the strongest baseline whenever
 *    they want).
 *  • Every other student turn → Gemini 2.0 Flash via Google.
 *
 *  We deliberately route 100% of paid + free student traffic to Gemini 2.0
 *  Flash because:
 *    - It is the primary and ONLY model for student turns — no fallback to
 *      any other model. If Gemini fails, the student gets a friendly Arabic
 *      apology and their turn quota is not consumed.
 *    - The teaching system prompt is heavily structured for instruction-
 *      following (think-before-answer protocol, explicit tag contract,
 *      few-shot tag examples, self-check checklist, scaffolded re-explain
 *      protocol). Gemini 2.0 Flash follows this scaffolding reliably.
 *    - Cost is ~10× cheaper on input and ~12× cheaper on output than the
 *      previous Haiku-based path, widening margin on every subscription.
 *
 *  We still record the *teaching context* of every turn in `reason`
 *  (gemini_diagnostic_phase, gemini_mastery_check, gemini_lab_report,
 *  gemini_deep_reasoning, gemini_long_message, default_gemini) so analytics
 *  can slice usage and quality by the same buckets we used to route on.
 */
export function pickTeachingModel(input: RouterInput): RouterDecision {
  // Admin / internal QA: keep Sonnet so the team can compare quality.
  if (input.isUnlimited) {
    return { model: SONNET, provider: "anthropic", reason: "unlimited_user" };
  }

  // Hard rule: free tier still routes to Gemini (cheapest path). The Haiku
  // safety net inside /ai/teach catches any Gemini failure and re-streams
  // a Haiku answer, so a free user is never silenced by a Gemini outage.
  if (input.isFreeFirstLesson) {
    return { model: GEMINI, provider: "gemini", reason: "free_tier_locked_gemini" };
  }

  // Daily-rolling budget exhausted → still on Gemini (already the cheapest
  // sustainable path). Two distinct reasons help admin analytics see whether
  // students are hitting the *daily* slice (expected; resets at Yemen
  // midnight) vs the *lifetime* 50%-of-paid cap (rare; should never happen
  // before daily exhaustion fires first, but covered for defense-in-depth).
  // Both downgrade quality only — the student is never blocked mid-subscription.
  if (input.costStatus.forceCheapModel) {
    const reason = input.costStatus.totalExhausted
      ? "total_cap_exhausted"
      : "daily_cap_exhausted";
    return { model: GEMINI, provider: "gemini", reason };
  }

  // All other paid student traffic → Gemini. We still tag the teaching
  // context in `reason` so analytics can see which kinds of turns the
  // student is producing (diagnostic vs mastery vs lab report vs default).
  if (input.isDiagnostic) {
    return { model: GEMINI, provider: "gemini", reason: "gemini_diagnostic_phase" };
  }
  if (input.isMasteryCheck) {
    return { model: GEMINI, provider: "gemini", reason: "gemini_mastery_check" };
  }
  if (input.isLabReport) {
    return { model: GEMINI, provider: "gemini", reason: "gemini_lab_report" };
  }
  if (input.needsDeepReasoning) {
    return { model: GEMINI, provider: "gemini", reason: "gemini_deep_reasoning" };
  }
  if (input.userMessageLength >= 600) {
    return { model: GEMINI, provider: "gemini", reason: "gemini_long_message" };
  }

  // Default: regular Q&A turn.
  return { model: GEMINI, provider: "gemini", reason: "default_gemini" };
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
