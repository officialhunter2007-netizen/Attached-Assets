import { db, aiUsageEventsTable, type UserSubjectSubscription } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { logger } from "./logger";

export type PlanKey = "bronze" | "silver" | "gold";

export const PLAN_USD_BUDGET_CAP: Record<string, number> = {
  bronze: 1.0,
  silver: 2.0,
  gold: 3.5,
};

// Free tier: cap at $0.03 per user (≈ 7–10 Haiku exchanges).
// This prevents abuse of the free lesson while still giving a genuine taste
// of the platform. Students who want more must subscribe.
const FREE_TIER_USD_CAP = 0.03;
const DEFAULT_SUBSCRIPTION_DAYS = 14;
const SECONDS_PER_DAY = 86_400;

export type QualityProfile = {
  maxTokens: number;
  sonnetProbability: number;
  historyLimit: number;
  materialChunkBytes: number;
  paceRatio: number;
  spentUsd: number;
  capUsd: number;
  remainingUsd: number;
  remainingDays: number;
  forceHaiku: boolean;
  isFreeTier: boolean;
  /**
   * Pedagogical wind-down level — converts pure cost pressure into a warm
   * teacher behaviour. Higher = the AI teacher gently encourages the student
   * to take a break / consolidate / continue tomorrow, even when message
   * limits aren't reached. Smooth scale, never blocks the student.
   *   0 → no nudge, teach freely.
   *   1 → at natural endings, hint that the student has covered a lot.
   *   2 → after this complete idea, suggest a short break + brief recap.
   *   3 → warmly wrap up the session, praise the effort, propose tomorrow.
   */
  windDownLevel: 0 | 1 | 2 | 3;
};

export type BudgetState = {
  capUsd: number;
  spentUsd: number;
  windowStart: Date;
  windowEndExpected: Date;
  remainingUsd: number;
  elapsedDays: number;
  totalDays: number;
  paceRatio: number;
  isFreeTier: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export async function getUserBudgetState(args: {
  userId: number;
  subjectId?: string | null;
  subjectSub: UserSubjectSubscription | null | undefined;
}): Promise<BudgetState> {
  const { userId, subjectId, subjectSub } = args;
  const now = new Date();

  let capUsd: number;
  let windowStart: Date;
  let windowEndExpected: Date;
  let isFreeTier = false;

  if (subjectSub) {
    capUsd = PLAN_USD_BUDGET_CAP[subjectSub.plan] ?? PLAN_USD_BUDGET_CAP.bronze;
    windowStart = new Date(subjectSub.createdAt);
    windowEndExpected = new Date(subjectSub.expiresAt);
    if (windowEndExpected.getTime() <= windowStart.getTime()) {
      windowEndExpected = new Date(
        windowStart.getTime() + DEFAULT_SUBSCRIPTION_DAYS * SECONDS_PER_DAY * 1000,
      );
    }
  } else {
    isFreeTier = true;
    capUsd = FREE_TIER_USD_CAP;
    windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    windowEndExpected = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  // Sum the student's actual AI spend in this window. Scope by subjectId when
  // we have one (each subject has its own subscription/cap), otherwise sum all
  // user activity (free-tier / general usage).
  let spentUsd = 0;
  try {
    const conditions = [
      eq(aiUsageEventsTable.userId, userId),
      gte(aiUsageEventsTable.createdAt, windowStart),
    ];
    if (subjectId) {
      conditions.push(eq(aiUsageEventsTable.subjectId, subjectId));
    }
    const [row] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${aiUsageEventsTable.costUsd}), 0)`,
      })
      .from(aiUsageEventsTable)
      .where(and(...conditions));
    spentUsd = Number(row?.total ?? 0);
    if (!Number.isFinite(spentUsd)) spentUsd = 0;
  } catch (err: any) {
    logger.warn(
      { err: err?.message, userId, subjectId },
      "cost-balancer: failed to query spent usd",
    );
  }

  const totalMs = Math.max(1, windowEndExpected.getTime() - windowStart.getTime());
  const elapsedMs = Math.max(0, now.getTime() - windowStart.getTime());
  const totalDays = totalMs / (SECONDS_PER_DAY * 1000);
  const elapsedDays = Math.min(totalDays, elapsedMs / (SECONDS_PER_DAY * 1000));

  // Day-0 startup grace: floor the elapsed fraction so a brand-new
  // subscription does not get over-throttled on its first message. We treat
  // the student as having "earned" at least 1 day's worth of budget from the
  // moment they activate. Without this, dividing by ~0 elapsed time makes
  // even one cent of spend look like a massive over-pace spike.
  const minElapsedFraction = clamp(1 / Math.max(totalDays, 1), 0, 1);
  const elapsedFraction = clamp(elapsedMs / totalMs, minElapsedFraction, 1);
  const expectedSpend = capUsd * elapsedFraction;
  const paceRatio = expectedSpend > 0 ? spentUsd / expectedSpend : 0;
  const remainingUsd = Math.max(0, capUsd - spentUsd);

  return {
    capUsd,
    spentUsd,
    windowStart,
    windowEndExpected,
    remainingUsd,
    elapsedDays,
    totalDays,
    paceRatio,
    isFreeTier,
  };
}

/**
 * Map a budget state to a quality profile that the AI endpoints can apply
 * to their request parameters. The curves are smooth (no cliffs) so the
 * student does not perceive a sudden change at any threshold.
 *
 * paceRatio interpretation:
 *   ≤ 0.5  → under-spending heavily, full quality
 *   ~ 1.0  → exactly on pace, slight tilt to economy
 *   ~ 1.5  → 50% over pace, visibly economical
 *   ≥ 2.0  → way over pace, max economy (still serves the student)
 */
export function deriveQualityProfile(state: BudgetState): QualityProfile {
  // The curves below are continuous from r=0 to r=4 — no hard cliffs at any
  // threshold (including the absolute cap), so the student never feels a
  // sudden quality drop from one message to the next. The same dial that
  // tapers quality before the cap also tapers it after, just with the
  // already-monotonic descent reaching its floor.
  const r = clamp(state.paceRatio, 0, 4);

  let maxTokens: number;
  if (r <= 0.5) maxTokens = 4096;
  else if (r <= 1.0) maxTokens = Math.round(lerp(4096, 3500, (r - 0.5) / 0.5));
  else if (r <= 1.5) maxTokens = Math.round(lerp(3500, 2700, (r - 1.0) / 0.5));
  else if (r <= 2.0) maxTokens = Math.round(lerp(2700, 1900, (r - 1.5) / 0.5));
  else maxTokens = Math.round(lerp(1900, 1200, (r - 2.0) / 2.0));

  let sonnetProbability: number;
  if (r <= 0.5) sonnetProbability = 0.2;
  else if (r <= 1.0) sonnetProbability = lerp(0.2, 0.12, (r - 0.5) / 0.5);
  else if (r <= 1.5) sonnetProbability = lerp(0.12, 0.05, (r - 1.0) / 0.5);
  else if (r <= 2.0) sonnetProbability = lerp(0.05, 0.0, (r - 1.5) / 0.5);
  else sonnetProbability = 0.0;

  let historyLimit: number;
  if (r <= 1.0) historyLimit = 30;
  else if (r <= 1.5) historyLimit = Math.round(lerp(30, 18, (r - 1.0) / 0.5));
  else if (r <= 2.0) historyLimit = Math.round(lerp(18, 12, (r - 1.5) / 0.5));
  else historyLimit = Math.round(lerp(12, 6, (r - 2.0) / 2.0));

  let materialChunkBytes: number;
  if (r <= 1.0) materialChunkBytes = 24000;
  else if (r <= 1.5) materialChunkBytes = Math.round(lerp(24000, 18000, (r - 1.0) / 0.5));
  else if (r <= 2.0) materialChunkBytes = Math.round(lerp(18000, 12000, (r - 1.5) / 0.5));
  else materialChunkBytes = Math.round(lerp(12000, 8000, (r - 2.0) / 2.0));

  // Free-tier (no paid subscription): hard caps to prevent economic abuse.
  // Sonnet is completely disabled (0%) — Haiku only. This keeps the cost per
  // free user firmly below the $0.03 cap even across all 15 allowed messages.
  if (state.isFreeTier) {
    maxTokens = Math.min(maxTokens, 2000);
    sonnetProbability = 0;          // Haiku only — no Sonnet on free tier
    historyLimit = Math.min(historyLimit, 8);
    materialChunkBytes = Math.min(materialChunkBytes, 8000);
  }

  // Pedagogical wind-down: converts cost pressure into a warm teacher
  // behaviour rather than a cold throttle. Steps are intentionally wide so
  // the student crosses each threshold no more than ~once per session.
  let windDownLevel: 0 | 1 | 2 | 3;
  if (r < 1.2) windDownLevel = 0;
  else if (r < 1.7) windDownLevel = 1;
  else if (r < 2.3) windDownLevel = 2;
  else windDownLevel = 3;

  return {
    maxTokens,
    sonnetProbability,
    historyLimit,
    materialChunkBytes,
    paceRatio: r,
    spentUsd: state.spentUsd,
    capUsd: state.capUsd,
    remainingUsd: state.remainingUsd,
    remainingDays: Math.max(0, state.totalDays - state.elapsedDays),
    forceHaiku: sonnetProbability < 0.005,
    isFreeTier: state.isFreeTier,
    windDownLevel,
  };
}

/**
 * Build a short Arabic instruction the AI teacher will respect at the end of
 * its reply. Designed to feel like genuine pedagogical care, not a system
 * limit. Returns an empty string when no nudge is needed.
 *
 * Critical paths (diagnostic, brand-new session) should bypass this entirely
 * at the call-site so we never wind down a student who has barely started.
 */
export function getWindDownHint(level: 0 | 1 | 2 | 3): string {
  if (level === 0) return "";
  if (level === 1) {
    return `

[توجيه تربوي رقيق — لا تذكره صراحةً للطالب]
أكمل شرحك بشكل طبيعي، ولكن إذا انتهت فكرة كاملة بشكل طبيعي خلال هذا الرد، فأضف في النهاية جملة قصيرة دافئة (سطر واحد) تُثني فيها على تركيز الطالب وتذكّره بأنه أنجز قدراً جيداً اليوم. لا تُجبره على التوقف، فقط أشِر بلطف.`;
  }
  if (level === 2) {
    return `

[توجيه تربوي — اختم الفكرة الحالية بأناقة]
أكمل الفكرة الحالية بإتقان، ثم اختم الرد بفقرة قصيرة (٢-٣ أسطر) بصوت معلّم محبّ:
- اعترف بجهد الطالب اليوم بصدق وبدون مبالغة.
- لخّص في جملة ما تعلّمه في هذه الجلسة.
- اقترح عليه استراحة قصيرة لترسيخ ما فهمه، أو مراجعة سريعة لما سبق.
- وضّح أنك ستكون هنا متى عاد ليكمل من نفس النقطة.
الهدف: أن يشعر بأن المعلم يهتم بفهمه لا بسرعته. لا تذكر شيئاً عن ميزانية أو رسائل أو حدود.`;
  }
  return `

[توجيه تربوي مهم — اختم الجلسة بدفء]
هذه نقطة جيدة لاختتام جلسة اليوم. أجب بشكل مختصر ومركّز على سؤال الطالب الحالي، ثم اختم الرد بفقرة دافئة كمعلّم يحب طلابه:
- ابدأ بكلمة ثناء صادقة على عمق نقاشه/تفاعله اليوم (بدون مبالغة سطحية).
- لخّص في ٢-٣ جمل أهم ما اكتسبه في جلسة اليوم.
- وضّح أن العقل يحتاج وقتاً ليُرسّخ ما تعلّمه، وأن الاستراحة جزء من التعلّم الجاد.
- ادعُه للعودة غداً بنشاط ليكمل الرحلة من حيث توقّف، مع تلميحة لما ينتظره.
- اختم بدعاء قصير أو كلمة محفّزة بأسلوب يمني/عربي صادق.
الهدف: أن يغادر الطالب وهو راضٍ ومتحمّس للعودة، لا محبَطاً. لا تذكر مطلقاً ميزانية أو تكلفة أو حدود تقنية — فقط حكمة معلّم يهتم بأن يتعلّم طلابه جيداً لا كثيراً.`;
}

/**
 * Convenience: load budget + derive profile in one call.
 * Returns a "full quality" profile when bypass is true (e.g. unlimited users).
 */
export async function getQualityProfile(args: {
  userId: number;
  subjectId?: string | null;
  subjectSub: UserSubjectSubscription | null | undefined;
  bypass?: boolean;
}): Promise<QualityProfile> {
  if (args.bypass) {
    return {
      maxTokens: 4096,
      sonnetProbability: 0.2,
      historyLimit: 30,
      materialChunkBytes: 24000,
      paceRatio: 0,
      spentUsd: 0,
      capUsd: Infinity,
      remainingUsd: Infinity,
      remainingDays: 365,
      forceHaiku: false,
      isFreeTier: false,
    };
  }
  const state = await getUserBudgetState({
    userId: args.userId,
    subjectId: args.subjectId,
    subjectSub: args.subjectSub,
  });
  return deriveQualityProfile(state);
}
