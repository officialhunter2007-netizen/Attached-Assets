// ─────────────────────────────────────────────────────────────────────────────
// Real referral-gems system.
//
// Each student has a personal referral code. When a friend signs up through that
// code we record a referral pair. The mutual reward — 300 gems for EACH side —
// is paid ONLY when BOTH the referrer AND the referred friend simultaneously
// hold an active Silver OR Gold subscription (Bronze does NOT qualify).
//
// Like the welcome gift, the reward is NOT auto-deposited into a wallet — it
// lands in a per-user reward POOL, and the student later chooses which subject
// wallet(s) to direct it into.
//
// Payout safety: the payout is anchored on `referrals.reward_paid_at`. The
// claim, the eligibility re-check, and the +300 credit into BOTH pools all
// happen inside ONE transaction (the referral row is locked FOR UPDATE and the
// claim is a conditional `UPDATE ... WHERE reward_paid_at IS NULL`), so two
// racing payout attempts can never double-credit and a "paid marker without
// gems" can never occur. `maybePayReferralReward` is fired best-effort after
// every subscription grant; `sweepReferralRewards` is the hourly safety net.
// ─────────────────────────────────────────────────────────────────────────────
import {
  db,
  referralsTable,
  referralRewardPoolsTable,
  referralRewardAllocationsTable,
  usersTable,
  userSubjectSubscriptionsTable,
  studentGemWalletsTable,
  gemLedgerTable,
} from "@workspace/db";
import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import { generateReferralCode } from "./auth";
import { V4_SUB_DURATION_DAYS } from "./v4-gem-wallet";
import { logger } from "./logger";

/** 300 gems to EACH side of a qualifying referral pair. */
export const REFERRAL_REWARD_GEMS = 300;
/** Plans that count as "active subscription" for referral eligibility. */
const QUALIFYING_PLANS = ["silver", "gold"] as const;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Distinct, typed errors so the route can map to HTTP codes. */
export class ReferralError extends Error {
  code:
    | "USER_NOT_FOUND"
    | "CODE_GEN_FAILED"
    | "BAD_CODE"
    | "UNKNOWN_CODE"
    | "SELF_REFERRAL"
    | "ALREADY_REFERRED"
    | "NOT_ELIGIBLE"
    | "BAD_AMOUNT"
    | "EXCEEDS_BALANCE";
  constructor(code: ReferralError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "ReferralError";
  }
}

function isUniqueViolation(e: any): boolean {
  return e?.code === "23505" || /duplicate key value/i.test(String(e?.message ?? ""));
}

function normalizeCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

// ── Referral code (lazy generation) ──────────────────────────────────────────
// Generates a unique code on first read and persists it. Safe for Google-created
// users (no code at signup). The unique index on users.referral_code + the
// conditional "set only if still null" update make this race-safe; on a unique
// collision we retry with a fresh candidate.
export async function ensureReferralCode(userId: number): Promise<string> {
  const [u] = await db
    .select({ code: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) throw new ReferralError("USER_NOT_FOUND", "user not found");
  if (u.code) return u.code;

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = generateReferralCode();
    try {
      const updated = await db
        .update(usersTable)
        .set({ referralCode: candidate })
        .where(and(eq(usersTable.id, userId), sql`${usersTable.referralCode} IS NULL`))
        .returning({ code: usersTable.referralCode });
      if (updated.length > 0 && updated[0].code) return updated[0].code;
      // Lost the race (another request set it first) — re-read and return it.
      const [again] = await db
        .select({ code: usersTable.referralCode })
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      if (again?.code) return again.code;
    } catch (e: any) {
      if (isUniqueViolation(e)) continue; // candidate collided — try another
      throw e;
    }
  }
  throw new ReferralError("CODE_GEN_FAILED", "could not generate a unique referral code");
}

export type ReferralInfo = {
  code: string;
  referredCount: number;
  rewardedCount: number;
  rewardGems: number;
};

// Public referral info for the modal. Contains NO PII about referred friends —
// only the caller's own code and aggregate counts.
export async function getReferralInfo(userId: number): Promise<ReferralInfo> {
  const code = await ensureReferralCode(userId);
  const rows = await db
    .select({ id: referralsTable.id, paid: referralsTable.rewardPaidAt })
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, userId));
  return {
    code,
    referredCount: rows.length,
    rewardedCount: rows.filter((r) => r.paid != null).length,
    rewardGems: REFERRAL_REWARD_GEMS,
  };
}

// ── Attribution ──────────────────────────────────────────────────────────────
// Records that `userId` was referred by the owner of `rawCode`. Abuse controls:
//   - unknown code            → UNKNOWN_CODE
//   - referring yourself      → SELF_REFERRAL
//   - already has a referrer  → idempotent if same, else ALREADY_REFERRED
//   - account already paid    → NOT_ELIGIBLE (only brand-new accounts can attach
//                               a code; stops established users back-filling)
export async function attributeReferral(
  userId: number,
  rawCode: string,
): Promise<{ ok: true; status: "recorded" | "already" }> {
  const code = normalizeCode(rawCode);
  if (!code) throw new ReferralError("BAD_CODE", "رمز الدعوة مطلوب");

  const [referrer] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referralCode, code));
  if (!referrer) throw new ReferralError("UNKNOWN_CODE", "رمز الدعوة غير صحيح");
  if (referrer.id === userId) throw new ReferralError("SELF_REFERRAL", "لا يمكنك دعوة نفسك");

  const [existing] = await db
    .select({ referrerUserId: referralsTable.referrerUserId })
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, userId));
  if (existing) {
    if (existing.referrerUserId === referrer.id) return { ok: true, status: "already" };
    throw new ReferralError("ALREADY_REFERRED", "تم ربط حسابك بدعوة سابقة");
  }

  // Only accounts with no prior subscription can attach a referral code, so an
  // established (already-paid) user can't retroactively claim a friend's code.
  const [priorSub] = await db
    .select({ id: userSubjectSubscriptionsTable.id })
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, userId))
    .limit(1);
  if (priorSub) throw new ReferralError("NOT_ELIGIBLE", "هذا الحساب غير مؤهل لربط دعوة");

  try {
    await db
      .insert(referralsTable)
      .values({
        referrerUserId: referrer.id,
        referredUserId: userId,
        referralCode: code,
        accessDaysGranted: 0,
      })
      .onConflictDoNothing({ target: referralsTable.referredUserId });
  } catch (e: any) {
    if (!isUniqueViolation(e)) throw e; // concurrent attribution — harmless
  }
  return { ok: true, status: "recorded" };
}

// ── Eligibility ──────────────────────────────────────────────────────────────
async function hasActiveQualifyingSub(tx: Tx, userId: number, now: Date): Promise<boolean> {
  const rows = await tx
    .select({ id: userSubjectSubscriptionsTable.id })
    .from(userSubjectSubscriptionsTable)
    .where(
      and(
        eq(userSubjectSubscriptionsTable.userId, userId),
        inArray(userSubjectSubscriptionsTable.plan, QUALIFYING_PLANS as unknown as string[]),
        gt(userSubjectSubscriptionsTable.expiresAt, now),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function creditRewardPoolTx(tx: Tx, userId: number, gems: number): Promise<void> {
  await tx
    .insert(referralRewardPoolsTable)
    .values({ userId, earnedGems: gems, allocatedGems: 0 })
    .onConflictDoUpdate({
      target: referralRewardPoolsTable.userId,
      set: {
        earnedGems: sql`${referralRewardPoolsTable.earnedGems} + ${gems}`,
        updatedAt: sql`now()`,
      },
    });
}

// Attempt to pay a single referral row. Returns true iff it credited this call.
// ONE transaction: lock row → re-check both sides active silver/gold → claim
// (conditional update) → credit BOTH pools. Any failure rolls the claim back.
async function tryPayReferralRow(rowId: number): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(referralsTable)
      .where(and(eq(referralsTable.id, rowId), sql`${referralsTable.rewardPaidAt} IS NULL`))
      .for("update");
    if (!locked) return false; // already paid (or gone)

    const now = new Date();
    const referrerOk = await hasActiveQualifyingSub(tx, locked.referrerUserId, now);
    if (!referrerOk) return false;
    const referredOk = await hasActiveQualifyingSub(tx, locked.referredUserId, now);
    if (!referredOk) return false;

    const claim = await tx
      .update(referralsTable)
      .set({ rewardPaidAt: sql`now()` })
      .where(and(eq(referralsTable.id, locked.id), sql`${referralsTable.rewardPaidAt} IS NULL`))
      .returning({ id: referralsTable.id });
    if (claim.length === 0) return false; // raced — someone else claimed it

    await creditRewardPoolTx(tx, locked.referrerUserId, REFERRAL_REWARD_GEMS);
    await creditRewardPoolTx(tx, locked.referredUserId, REFERRAL_REWARD_GEMS);
    return true;
  });
}

// Best-effort payout hook for one user. Fired after a subscription grant: pays
// out every unpaid pair this user is part of where BOTH sides now qualify.
// NEVER throws — a referral failure must not affect the subscription flow.
export async function maybePayReferralReward(userId: number): Promise<{ paid: number }> {
  try {
    const rows = await db
      .select({ id: referralsTable.id })
      .from(referralsTable)
      .where(
        and(
          or(
            eq(referralsTable.referrerUserId, userId),
            eq(referralsTable.referredUserId, userId),
          ),
          sql`${referralsTable.rewardPaidAt} IS NULL`,
        ),
      );
    let paid = 0;
    for (const r of rows) {
      try {
        if (await tryPayReferralRow(r.id)) paid++;
      } catch (e: any) {
        logger.error({ err: e?.message, referralId: r.id, userId }, "referral: payout row failed");
      }
    }
    if (paid > 0) logger.info({ userId, paid }, "referral: rewards paid");
    return { paid };
  } catch (e: any) {
    logger.error({ err: e?.message, userId }, "referral: maybePayReferralReward failed");
    return { paid: 0 };
  }
}

// Hourly safety net: walks every unpaid referral row and pays the ones that now
// qualify. Catches pairs missed by the per-grant hook (e.g. a grant on a server
// that crashed before the hook fired).
export async function sweepReferralRewards(): Promise<{ paid: number; errors: number }> {
  let paid = 0;
  let errors = 0;
  try {
    const rows = await db
      .select({ id: referralsTable.id })
      .from(referralsTable)
      .where(sql`${referralsTable.rewardPaidAt} IS NULL`);
    for (const r of rows) {
      try {
        if (await tryPayReferralRow(r.id)) paid++;
      } catch (e: any) {
        errors++;
        logger.error({ err: e?.message, referralId: r.id }, "referral: sweep row failed");
      }
    }
  } catch (e: any) {
    errors++;
    logger.error({ err: e?.message }, "referral: sweep failed");
  }
  return { paid, errors };
}

// ── Reward pool status + allocation ──────────────────────────────────────────
export type ReferralRewardAllocationView = { subjectId: string; gemsAllocated: number };

export type ReferralRewardStatus = {
  earnedGems: number;
  allocatedGems: number;
  remainingGems: number;
  rewardGems: number;
  allocations: ReferralRewardAllocationView[];
};

async function ensurePoolRow(userId: number): Promise<void> {
  await db
    .insert(referralRewardPoolsTable)
    .values({ userId, earnedGems: 0, allocatedGems: 0 })
    .onConflictDoNothing({ target: referralRewardPoolsTable.userId });
}

function toStatus(
  pool: { earnedGems: number; allocatedGems: number },
  allocations: ReferralRewardAllocationView[],
): ReferralRewardStatus {
  return {
    earnedGems: pool.earnedGems,
    allocatedGems: pool.allocatedGems,
    remainingGems: Math.max(0, pool.earnedGems - pool.allocatedGems),
    rewardGems: REFERRAL_REWARD_GEMS,
    allocations,
  };
}

export async function getReferralRewardStatus(userId: number): Promise<ReferralRewardStatus> {
  await ensurePoolRow(userId);
  const [pool] = await db
    .select()
    .from(referralRewardPoolsTable)
    .where(eq(referralRewardPoolsTable.userId, userId));
  const allocs = await db
    .select({
      subjectId: referralRewardAllocationsTable.subjectId,
      gemsAllocated: referralRewardAllocationsTable.gemsAllocated,
    })
    .from(referralRewardAllocationsTable)
    .where(eq(referralRewardAllocationsTable.userId, userId));
  return toStatus(pool as any, allocs.map((a) => ({
    subjectId: a.subjectId,
    gemsAllocated: Number(a.gemsAllocated ?? 0),
  })));
}

// Allocate `gems` from the reward pool into `subjectId`'s wallet. Atomic and
// concurrency-safe (serialized on the per-user pool row lock). Credits the
// subject wallet + a `referral_reward` ledger row in the SAME transaction,
// mirroring the welcome-gift allocate path (raw row ops, not getOrCreateV4Wallet,
// to avoid a nested top-level transaction deadlocking on the pool-row lock).
export async function allocateReferralReward(
  userId: number,
  subjectId: string,
  gems: number,
): Promise<ReferralRewardStatus> {
  if (!Number.isInteger(gems) || gems <= 0) {
    throw new ReferralError("BAD_AMOUNT", "gems must be a positive integer");
  }

  await ensurePoolRow(userId);

  return await db.transaction(async (tx) => {
    const [pool] = await tx
      .select()
      .from(referralRewardPoolsTable)
      .where(eq(referralRewardPoolsTable.userId, userId))
      .for("update");

    const earnedGems = (pool as any).earnedGems as number;
    const allocatedGems = (pool as any).allocatedGems as number;
    const remaining = earnedGems - allocatedGems;
    if (gems > remaining) {
      throw new ReferralError(
        "EXCEEDS_BALANCE",
        `الجواهر المتاحة للتوزيع ${Math.max(0, remaining)} فقط`,
      );
    }

    await tx
      .insert(referralRewardAllocationsTable)
      .values({ userId, subjectId, gemsAllocated: gems })
      .onConflictDoUpdate({
        target: [referralRewardAllocationsTable.userId, referralRewardAllocationsTable.subjectId],
        set: {
          gemsAllocated: sql`${referralRewardAllocationsTable.gemsAllocated} + ${gems}`,
          updatedAt: sql`now()`,
        },
      });

    // Credit the subject wallet inside the SAME transaction.
    const [wallet] = await tx
      .select()
      .from(studentGemWalletsTable)
      .where(and(
        eq(studentGemWalletsTable.userId, userId),
        eq(studentGemWalletsTable.subjectId, subjectId),
      ))
      .for("update");

    let priorBalance = 0;
    let priorExpiresAt: Date | null = null;
    if (wallet) {
      priorBalance = (wallet as any).gemsBalance ?? 0;
      priorExpiresAt = (wallet as any).expiresAt ?? null;
    } else {
      await tx.insert(studentGemWalletsTable).values({
        userId,
        subjectId,
        gemsBalance: 0,
        welcomeGiftClaimed: false,
      });
    }

    const now = new Date();
    const candidateExpiry = new Date(now.getTime() + V4_SUB_DURATION_DAYS * 24 * 60 * 60 * 1000);
    // GREATEST(existing, now+30d): referral gems never shorten an existing window.
    const newExpiresAt =
      priorExpiresAt && priorExpiresAt.getTime() > candidateExpiry.getTime()
        ? priorExpiresAt
        : candidateExpiry;
    const newBalance = priorBalance + gems;

    await tx
      .update(studentGemWalletsTable)
      .set({ gemsBalance: newBalance, expiresAt: newExpiresAt, updatedAt: now })
      .where(and(
        eq(studentGemWalletsTable.userId, userId),
        eq(studentGemWalletsTable.subjectId, subjectId),
      ));

    await tx.insert(gemLedgerTable).values({
      userId,
      subjectId,
      delta: gems,
      balanceAfter: newBalance,
      reason: "referral_reward",
      source: "v4_referral",
      note: `مكافأة دعوة — ${gems} جوهرة`,
      metadata: { allocatedFrom: "referral_reward_pool" },
    } as any);

    await tx
      .update(referralRewardPoolsTable)
      .set({ allocatedGems: allocatedGems + gems, updatedAt: sql`now()` })
      .where(eq(referralRewardPoolsTable.userId, userId));

    const allocs = await tx
      .select({
        subjectId: referralRewardAllocationsTable.subjectId,
        gemsAllocated: referralRewardAllocationsTable.gemsAllocated,
      })
      .from(referralRewardAllocationsTable)
      .where(eq(referralRewardAllocationsTable.userId, userId));

    return toStatus(
      { earnedGems, allocatedGems: allocatedGems + gems },
      allocs.map((a) => ({
        subjectId: a.subjectId,
        gemsAllocated: Number(a.gemsAllocated ?? 0),
      })),
    );
  });
}
