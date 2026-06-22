// ─────────────────────────────────────────────────────────────────────────────
// v4 global welcome gift.
//
// Every student receives ONE 150-gem welcome gift for the whole platform
// (replacing the retired per-subject +100 gift). They distribute it — in free
// chunks — across at most 3 specialties. Allocated gems land in that subject's
// monthly wallet (`student_gem_wallets`) with a 30-day window and a ledger
// audit row, so spending them goes through the exact same charge path as
// purchased gems.
//
// Concurrency model: the per-user pool row (`student_welcome_gifts`) is the
// serialization point. Every allocate call locks it FOR UPDATE, so two racing
// requests for the same student can never both pass the "<=150 total" or
// "<=3 subjects" checks — the second blocks until the first commits and then
// re-reads the updated counters.
// ─────────────────────────────────────────────────────────────────────────────
import {
  db,
  studentWelcomeGiftsTable,
  studentWelcomeGiftAllocationsTable,
  studentGemWalletsTable,
  gemLedgerTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { V4_SUB_DURATION_DAYS } from "./v4-gem-wallet";

export const WELCOME_GIFT_TOTAL_GEMS = 150;
export const WELCOME_GIFT_MAX_SUBJECTS = 3;

export type WelcomeGiftAllocation = {
  subjectId: string;
  gemsAllocated: number;
};

export type WelcomeGiftStatus = {
  totalGems: number;
  allocatedGems: number;
  remainingGems: number;
  maxSubjects: number;
  subjectCount: number;
  shownAt: string | null;
  finalizedAt: string | null;
  allocations: WelcomeGiftAllocation[];
};

/** Distinct, typed allocation errors so the route can map to HTTP codes. */
export class WelcomeGiftError extends Error {
  code:
    | "WELCOME_GIFT_FINALIZED"
    | "WELCOME_GIFT_EXCEEDS_TOTAL"
    | "WELCOME_GIFT_TOO_MANY_SUBJECTS"
    | "WELCOME_GIFT_BAD_AMOUNT";
  constructor(code: WelcomeGiftError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "WelcomeGiftError";
  }
}

// Ensure the per-user pool row exists. Idempotent — safe to call on every read.
async function ensurePoolRow(userId: number): Promise<void> {
  await db
    .insert(studentWelcomeGiftsTable)
    .values({ userId, totalGems: WELCOME_GIFT_TOTAL_GEMS, allocatedGems: 0 })
    .onConflictDoNothing({ target: studentWelcomeGiftsTable.userId });
}

function toStatus(
  pool: { totalGems: number; allocatedGems: number; shownAt: Date | null; finalizedAt: Date | null },
  allocations: WelcomeGiftAllocation[],
): WelcomeGiftStatus {
  const totalGems = pool.totalGems;
  const allocatedGems = pool.allocatedGems;
  return {
    totalGems,
    allocatedGems,
    remainingGems: Math.max(0, totalGems - allocatedGems),
    maxSubjects: WELCOME_GIFT_MAX_SUBJECTS,
    subjectCount: allocations.length,
    shownAt: pool.shownAt ? pool.shownAt.toISOString() : null,
    finalizedAt: pool.finalizedAt ? pool.finalizedAt.toISOString() : null,
    allocations,
  };
}

export async function getWelcomeGiftStatus(userId: number): Promise<WelcomeGiftStatus> {
  await ensurePoolRow(userId);
  const [pool] = await db
    .select()
    .from(studentWelcomeGiftsTable)
    .where(eq(studentWelcomeGiftsTable.userId, userId));
  const allocs = await db
    .select({
      subjectId: studentWelcomeGiftAllocationsTable.subjectId,
      gemsAllocated: studentWelcomeGiftAllocationsTable.gemsAllocated,
    })
    .from(studentWelcomeGiftAllocationsTable)
    .where(eq(studentWelcomeGiftAllocationsTable.userId, userId));
  return toStatus(pool as any, allocs.map((a) => ({
    subjectId: a.subjectId,
    gemsAllocated: Number(a.gemsAllocated ?? 0),
  })));
}

// Records that the first-entry welcome modal has been shown (so the FE only
// pops it once). No-op if already set. Returns the fresh status.
export async function markWelcomeGiftShown(userId: number): Promise<WelcomeGiftStatus> {
  await ensurePoolRow(userId);
  await db
    .update(studentWelcomeGiftsTable)
    .set({ shownAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(
      eq(studentWelcomeGiftsTable.userId, userId),
      sql`${studentWelcomeGiftsTable.shownAt} IS NULL`,
    ));
  return getWelcomeGiftStatus(userId);
}

export type AllocateOpts = {
  /** When true, lock the gift after this allocation — no further changes. */
  finalize?: boolean;
};

// Allocate `gems` from the welcome pool into `subjectId`'s wallet. Atomic and
// concurrency-safe (serialized on the per-user pool row lock). `gems` may be 0
// to finalize without a further allocation. Returns the updated status.
export async function allocateWelcomeGift(
  userId: number,
  subjectId: string,
  gems: number,
  opts: AllocateOpts = {},
): Promise<WelcomeGiftStatus> {
  if (!Number.isInteger(gems) || gems < 0) {
    throw new WelcomeGiftError("WELCOME_GIFT_BAD_AMOUNT", "gems must be a non-negative integer");
  }

  await ensurePoolRow(userId);

  return await db.transaction(async (tx) => {
    // Serialization point: every allocate for this user contends on this row.
    const [pool] = await tx
      .select()
      .from(studentWelcomeGiftsTable)
      .where(eq(studentWelcomeGiftsTable.userId, userId))
      .for("update");

    if ((pool as any).finalizedAt) {
      // Idempotent finalize: once the gift is locked, a gems:0 "finalize" call
      // (the FE fires one on the anchor subject and may retry it on flaky
      // networks) is a harmless no-op — return the current status instead of
      // erroring. Only a real allocation attempt (gems > 0) after lock fails.
      if (gems === 0) {
        const lockedAllocs = await tx
          .select({
            subjectId: studentWelcomeGiftAllocationsTable.subjectId,
            gemsAllocated: studentWelcomeGiftAllocationsTable.gemsAllocated,
          })
          .from(studentWelcomeGiftAllocationsTable)
          .where(eq(studentWelcomeGiftAllocationsTable.userId, userId));
        return toStatus(pool as any, lockedAllocs.map((a) => ({
          subjectId: a.subjectId,
          gemsAllocated: Number(a.gemsAllocated ?? 0),
        })));
      }
      throw new WelcomeGiftError("WELCOME_GIFT_FINALIZED", "الهدية مُثبتة بالفعل ولا يمكن تعديلها");
    }

    const totalGems = (pool as any).totalGems as number;
    const allocatedGems = (pool as any).allocatedGems as number;
    if (allocatedGems + gems > totalGems) {
      throw new WelcomeGiftError(
        "WELCOME_GIFT_EXCEEDS_TOTAL",
        `تتجاوز الهدية الحد الأقصى (${totalGems} جوهرة)`,
      );
    }

    // Existing allocation for THIS subject (if any) — a top-up doesn't grow the
    // distinct-subject count; a brand-new subject does.
    const [existingAlloc] = await tx
      .select()
      .from(studentWelcomeGiftAllocationsTable)
      .where(and(
        eq(studentWelcomeGiftAllocationsTable.userId, userId),
        eq(studentWelcomeGiftAllocationsTable.subjectId, subjectId),
      ));

    // Only a real allocation (gems > 0) can grow the distinct-subject count.
    // A gems:0 status/finalize read must never trip the cap.
    if (gems > 0 && !existingAlloc) {
      const distinct = await tx
        .select({ subjectId: studentWelcomeGiftAllocationsTable.subjectId })
        .from(studentWelcomeGiftAllocationsTable)
        .where(eq(studentWelcomeGiftAllocationsTable.userId, userId));
      if (distinct.length >= WELCOME_GIFT_MAX_SUBJECTS) {
        throw new WelcomeGiftError(
          "WELCOME_GIFT_TOO_MANY_SUBJECTS",
          `لا يمكن توزيع الهدية على أكثر من ${WELCOME_GIFT_MAX_SUBJECTS} تخصصات`,
        );
      }
    }

    if (gems > 0) {
      // Upsert the allocation record (accumulate on top-up).
      await tx
        .insert(studentWelcomeGiftAllocationsTable)
        .values({ userId, subjectId, gemsAllocated: gems })
        .onConflictDoUpdate({
          target: [
            studentWelcomeGiftAllocationsTable.userId,
            studentWelcomeGiftAllocationsTable.subjectId,
          ],
          set: {
            gemsAllocated: sql`${studentWelcomeGiftAllocationsTable.gemsAllocated} + ${gems}`,
            updatedAt: sql`now()`,
          },
        });

      // Credit the subject wallet inside the SAME transaction. Done with raw
      // row ops (not getOrCreateV4Wallet) to avoid a nested top-level
      // transaction deadlocking against the pool-row lock we already hold.
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
      // GREATEST(existing, now+30d): the gift never shortens an existing window.
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
        reason: "welcome_gift",
        source: "v4_welcome_gift",
        note: `هدية ترحيبية — ${gems} جوهرة`,
        metadata: { allocatedFrom: "welcome_gift_pool" },
      } as any);
    }

    await tx
      .update(studentWelcomeGiftsTable)
      .set({
        allocatedGems: allocatedGems + gems,
        finalizedAt: opts.finalize ? sql`now()` : (pool as any).finalizedAt,
        updatedAt: sql`now()`,
      })
      .where(eq(studentWelcomeGiftsTable.userId, userId));

    const allocs = await tx
      .select({
        subjectId: studentWelcomeGiftAllocationsTable.subjectId,
        gemsAllocated: studentWelcomeGiftAllocationsTable.gemsAllocated,
      })
      .from(studentWelcomeGiftAllocationsTable)
      .where(eq(studentWelcomeGiftAllocationsTable.userId, userId));

    return toStatus(
      {
        totalGems,
        allocatedGems: allocatedGems + gems,
        shownAt: (pool as any).shownAt ?? null,
        finalizedAt: opts.finalize ? new Date() : ((pool as any).finalizedAt ?? null),
      },
      allocs.map((a) => ({
        subjectId: a.subjectId,
        gemsAllocated: Number(a.gemsAllocated ?? 0),
      })),
    );
  });
}
