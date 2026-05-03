import { Router, type IRouter } from "express";
import { eq, and, desc, sql, gt, gte, lte, count } from "drizzle-orm";
import {
  db,
  subscriptionRequestsTable,
  activationCardsTable,
  usersTable,
  userSubjectSubscriptionsTable,
  userSubjectFirstLessonsTable,
  discountCodesTable,
  discountCodeRedemptionsTable,
  planPricesTable,
  gemLedgerTable,
  paymentSettingsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  CreateSubscriptionRequestBody,
  ActivateSubscriptionBody,
  GetAdminSubscriptionRequestsQueryParams,
  ApproveSubscriptionRequestParams,
  RejectSubscriptionRequestParams,
  MarkIncompleteSubscriptionRequestBody,
  MarkIncompleteSubscriptionRequestParams,
} from "@workspace/api-zod";
import { generateActivationCode } from "../lib/auth";
import { applyDailyGemsRollover, applyDailyGemsRolloverForSubjectSub } from "../lib/gems";
import { writeGemLedger } from "../lib/gem-ledger";
import { getAccessForUser, FREE_LESSON_GEM_LIMIT } from "../lib/access";

const router: IRouter = Router();

// Gems granted per plan for the full 14-day period.
// Daily cap = Math.floor(total / 14). Each subject is its own subscription
// — these gems are scoped to the subject the user paid for.
const PLAN_GEM_LIMITS: Record<string, { total: number; daily: number }> = {
  bronze: { total: 1000, daily: 71 },
  silver: { total: 2000, daily: 142 },
  gold:   { total: 3000, daily: 214 },
};

// Static fallback ONLY — actual prices live in the `plan_prices` DB table and
// are admin-editable from the dashboard. Used only if the DB read fails (network
// blip / table missing pre-migration). Mirrors the seed in auto-migrate.ts.
const BASE_PRICES_FALLBACK: Record<"north" | "south", Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 2000, silver: 4000, gold: 6000 },
};

const VALID_REGIONS = ["north", "south"] as const;
const VALID_PLAN_TYPES = ["bronze", "silver", "gold"] as const;
type PlanRegion = typeof VALID_REGIONS[number];
type PlanType = typeof VALID_PLAN_TYPES[number];

// In-memory cache of all plan prices, refreshed at most every PRICE_CACHE_TTL_MS.
// Admin edits invalidate the cache immediately via `invalidatePlanPriceCache()`
// so the UI sees changes on the next request without waiting for TTL.
const PRICE_CACHE_TTL_MS = 60 * 1000;
type PriceMap = Record<string, Record<string, number>>;
let priceCache: { map: PriceMap; loadedAt: number } | null = null;

function freshFallbackMap(): PriceMap {
  return {
    north: { ...BASE_PRICES_FALLBACK.north },
    south: { ...BASE_PRICES_FALLBACK.south },
  };
}

async function loadAllPlanPrices(): Promise<PriceMap> {
  const map = freshFallbackMap();
  try {
    const rows = await db.select().from(planPricesTable);
    for (const row of rows) {
      if (!map[row.region]) map[row.region] = {};
      if (Number.isFinite(row.priceYer) && row.priceYer > 0) {
        map[row.region][row.planType] = row.priceYer;
      }
    }
  } catch (err: any) {
    logger.warn(
      { err: err?.message },
      "plan-prices: DB read failed; using fallback constants",
    );
  }
  return map;
}

async function getPriceMap(): Promise<PriceMap> {
  const now = Date.now();
  if (priceCache && now - priceCache.loadedAt < PRICE_CACHE_TTL_MS) {
    return priceCache.map;
  }
  const map = await loadAllPlanPrices();
  priceCache = { map, loadedAt: now };
  return map;
}

export function invalidatePlanPriceCache(): void {
  priceCache = null;
}

async function getPlanPriceFromDb(
  planType: string,
  region: string,
): Promise<number | null> {
  const map = await getPriceMap();
  const r = map[region];
  if (!r) return null;
  const p = r[planType];
  return typeof p === "number" ? p : null;
}

// Welcome offer: 20% off for first-time subscription page visitors who
// leave without subscribing — auto-applied on next subscription within 24h.
// One-time per student. Cannot be stacked with any other discount code.
const WELCOME_OFFER_PERCENT = 20;
const WELCOME_OFFER_DURATION_MS = 24 * 60 * 60 * 1000;
const WELCOME_OFFER_LABEL = "WELCOME20";

// 14-day subscription window for plans approved here.
const SUB_DURATION_DAYS = 14;

function getYemenDateLabel(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Atomically grant a per-subject subscription. Replaces any existing row for
 * the same (userId, subjectId): if the user already has gems left for that
 * subject, we reset the wallet for the freshly-paid 14 days. The legacy global
 * `usersTable.gems*` columns are NOT touched — those exist only for backward
 * compatibility with grandfathered users.
 */
type GrantSubjectSubscriptionOpts = {
  userId: number;
  subjectId: string;
  subjectName: string | null;
  planType: string;
  region: string | null;
  paidPriceYer: number;
  activationCode: string | null;
  subscriptionRequestId: number | null;
  // For ledger attribution. Optional so legacy callers compile unchanged.
  source?: "approve_request" | "activate_card" | "admin_grant";
  adminUserId?: number | null;
  note?: string | null;
};

/**
 * Tx-bound core of `grantSubjectSubscription` — does the wallet replace
 * (delete prior row + insert fresh row) inside the supplied transaction
 * handle. Callers that already hold a transaction (notably the approve
 * endpoint, which must commit the request status, the activation card,
 * the discount bookkeeping AND the wallet grant atomically) use this
 * directly. Callers without a transaction use `grantSubjectSubscription`
 * which wraps this in `db.transaction(...)` and writes the audit row.
 */
async function grantSubjectSubscriptionInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  opts: GrantSubjectSubscriptionOpts,
): Promise<typeof userSubjectSubscriptionsTable.$inferSelect> {
  const planGems = PLAN_GEM_LIMITS[opts.planType];
  if (!planGems) throw new Error(`Unknown plan type: ${opts.planType}`);

  const expiresAt = new Date(Date.now() + SUB_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const yemenDate = getYemenDateLabel();

  // Drop any prior row for this (userId, subjectId) — the new payment buys
  // a fresh 14-day window and gem wallet for that subject.
  await tx.delete(userSubjectSubscriptionsTable).where(and(
    eq(userSubjectSubscriptionsTable.userId, opts.userId),
    eq(userSubjectSubscriptionsTable.subjectId, opts.subjectId),
  ));

  const [inserted] = await tx.insert(userSubjectSubscriptionsTable).values({
    userId: opts.userId,
    subjectId: opts.subjectId,
    subjectName: opts.subjectName,
    plan: opts.planType,
    messagesUsed: 0,
    messagesLimit: planGems.total, // legacy column kept = total gems
    expiresAt,
    activationCode: opts.activationCode,
    subscriptionRequestId: opts.subscriptionRequestId,
    paidPriceYer: opts.paidPriceYer,
    region: opts.region,
    gemsBalance: planGems.total,
    gemsDailyLimit: planGems.daily,
    gemsUsedToday: 0,
    gemsResetDate: yemenDate,
  }).returning();

  return inserted;
}

/**
 * Atomically grant a per-subject subscription. Replaces any existing row for
 * the same (userId, subjectId): if the user already has gems left for that
 * subject, we reset the wallet for the freshly-paid 14 days. The legacy global
 * `usersTable.gems*` columns are NOT touched — those exist only for backward
 * compatibility with grandfathered users.
 *
 * Use this overload when there is no outer transaction in play. Callers
 * already inside a transaction should call `grantSubjectSubscriptionInTx`
 * directly with their `tx` handle and write the ledger row themselves
 * after the transaction commits, so that "request approved" and
 * "wallet granted" happen in a single atomic unit.
 */
async function grantSubjectSubscription(
  opts: GrantSubjectSubscriptionOpts,
): Promise<typeof userSubjectSubscriptionsTable.$inferSelect> {
  const planGems = PLAN_GEM_LIMITS[opts.planType];
  if (!planGems) throw new Error(`Unknown plan type: ${opts.planType}`);
  const source = opts.source ?? "admin_grant";

  const row = await db.transaction((tx) => grantSubjectSubscriptionInTx(tx, opts));

  // Audit row — best-effort, errors are swallowed inside writeGemLedger so
  // a transient ledger failure cannot undo a paid subscription.
  await writeGemLedger({
    userId: opts.userId,
    subjectSubId: row.id,
    subjectId: row.subjectId,
    delta: planGems.total,
    balanceAfter: planGems.total,
    reason: "grant",
    source,
    adminUserId: opts.adminUserId ?? null,
    note: opts.note ?? null,
    metadata: {
      planType: opts.planType,
      region: opts.region,
      paidPriceYer: opts.paidPriceYer,
      activationCode: opts.activationCode,
      subscriptionRequestId: opts.subscriptionRequestId,
    },
  });

  return row;
}

function computeFinalPrice(basePrice: number, percent: number): number {
  // Round to nearest integer (YER are whole units).
  const discounted = basePrice * (1 - percent / 100);
  return Math.max(0, Math.round(discounted));
}

function normalizeDiscountCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;
  if (!/^[A-Z0-9_-]{2,32}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Centralised discount-code validation. Used by both the public
 * `/discount-codes/validate` preview endpoint and the request-creation
 * endpoint, so a code that previews as valid is guaranteed to also be
 * accepted at submit time. Returns a tagged result instead of throwing
 * so callers can surface a friendly Arabic message.
 *
 * Enforces, in addition to the legacy `active` flag:
 *   - `startsAt` / `endsAt` active window
 *   - `maxUses` global cap (compared against `usageCount`)
 *   - `perUserLimit` per-user cap (counted from `discount_code_redemptions`)
 *
 * Per-user enforcement uses redemptions (= approved subscriptions), not
 * pending requests. This is intentional: a student who submits two requests
 * with the same code but only one gets approved should still get the
 * second redemption if `perUserLimit > 1`.
 */
type DiscountCheckOk = {
  ok: true;
  row: typeof discountCodesTable.$inferSelect;
};
type DiscountCheckErr = { ok: false; status: number; message: string };
type DiscountCheck = DiscountCheckOk | DiscountCheckErr;

async function checkDiscountCodeForUser(
  code: string,
  userId: number,
): Promise<DiscountCheck> {
  const [row] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, code));
  if (!row) return { ok: false, status: 404, message: "كود الخصم غير موجود" };
  if (!row.active) return { ok: false, status: 400, message: "كود الخصم متوقف حالياً" };

  const now = Date.now();
  if (row.startsAt && new Date(row.startsAt).getTime() > now) {
    return { ok: false, status: 400, message: "هذا الكود لم يبدأ سريانه بعد" };
  }
  if (row.endsAt && new Date(row.endsAt).getTime() < now) {
    return { ok: false, status: 400, message: "انتهت صلاحية هذا الكود" };
  }
  if (row.maxUses != null && row.usageCount >= row.maxUses) {
    return { ok: false, status: 409, message: "تم استنفاد هذا الكود — لا يمكن استخدامه أكثر" };
  }
  if (row.perUserLimit != null) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(discountCodeRedemptionsTable)
      .where(and(
        eq(discountCodeRedemptionsTable.codeId, row.id),
        eq(discountCodeRedemptionsTable.userId, userId),
      ));
    if (Number(value) >= row.perUserLimit) {
      return {
        ok: false,
        status: 409,
        message: `لقد استخدمت هذا الكود ${row.perUserLimit} مرة بالفعل`,
      };
    }
  }
  return { ok: true, row };
}

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

// ── User: submit subscription request ─────────────────────────────────────────
router.post("/subscriptions/request", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateSubscriptionRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // ── Per-subject subscription gate ──────────────────────────────────────────
  // Each subject is a fully independent subscription (Gold for Cybersecurity
  // does NOT grant access to AI). The page MUST send a real subjectId+name —
  // we no longer accept "all" or fall back silently to a platform-wide grant.
  const rawSubjectId = typeof req.body?.subjectId === "string" ? req.body.subjectId.trim() : "";
  const rawSubjectName = typeof req.body?.subjectName === "string" ? req.body.subjectName.trim() : "";
  if (!rawSubjectId || rawSubjectId === "all") {
    res.status(400).json({ error: "اختر التخصص الذي تريد الاشتراك فيه — كل تخصص اشتراك مستقل." });
    return;
  }
  const subjectId = rawSubjectId;
  const subjectName = rawSubjectName || null;

  const user = await getUser(userId);

  const basePrice = await getPlanPriceFromDb(parsed.data.planType, parsed.data.region);
  if (basePrice == null) {
    res.status(400).json({ error: "خطة أو منطقة غير صالحة" });
    return;
  }
  // Defence-in-depth: a misconfigured plan_prices row (priceYer = 0) would
  // otherwise let students submit a "paid" request for free. Prefer to
  // refuse with a clear error so the admin notices and fixes pricing.
  if (basePrice <= 0) {
    logger.error(
      { planType: parsed.data.planType, region: parsed.data.region, basePrice },
      "subscriptions/request: plan_prices row is zero/negative — refusing request",
    );
    res.status(500).json({ error: "تعذّر تحديد سعر هذه الباقة. يرجى التواصل مع الدعم." });
    return;
  }

  const rawDiscountCode = req.body?.discountCode;
  const codeNorm = rawDiscountCode == null || rawDiscountCode === "" ? null : normalizeDiscountCode(rawDiscountCode);
  if (rawDiscountCode != null && rawDiscountCode !== "" && !codeNorm) {
    res.status(400).json({ error: "كود الخصم غير صالح" });
    return;
  }

  // Read welcome offer state OUTSIDE the transaction (read-only snapshot)
  // and re-check inside the transaction with an atomic conditional update so
  // it cannot be double-spent.
  const welcomeState = await getWelcomeOfferState(userId);
  const welcomeActive = welcomeState.active;

  // Red line: cannot stack welcome offer with another discount code.
  if (welcomeActive && codeNorm) {
    res.status(400).json({
      error: `لا يمكن استخدام كود خصم آخر مع العرض الترحيبي ${WELCOME_OFFER_PERCENT}٪. يكفيك خصم واحد فقط.`,
    });
    return;
  }

  try {
    const created = await db.transaction(async (tx) => {
      let discountCodeRow: typeof discountCodesTable.$inferSelect | null = null;
      let percent = 0;
      let welcomeApplied = false;

      if (welcomeActive) {
        // Atomic conditional consume: only succeeds if the welcome offer is
        // still active for this user (not yet used, not expired).
        const consumeResult = await tx
          .update(usersTable)
          .set({ welcomeOfferUsedAt: new Date() })
          .where(and(
            eq(usersTable.id, userId),
            sql`${usersTable.welcomeOfferShownAt} IS NOT NULL`,
            sql`${usersTable.welcomeOfferUsedAt} IS NULL`,
            sql`${usersTable.welcomeOfferExpiresAt} > NOW()`,
          ))
          .returning({ id: usersTable.id });

        if (consumeResult.length > 0) {
          welcomeApplied = true;
          percent = WELCOME_OFFER_PERCENT;
        }
        // If the conditional update did not match (race / expired), fall
        // through to the normal flow without any discount.
      } else if (codeNorm) {
        // Use the shared validator (window / maxUses / perUserLimit) so the
        // request-creation path can never accept a code the validate
        // endpoint would have rejected. The check is intentionally outside
        // the transaction read above — usageCount/redemptions are racy by
        // nature; the approve transaction performs the *binding* check
        // when it inserts the redemption row.
        const check = await checkDiscountCodeForUser(codeNorm, userId);
        if (!check.ok) {
          // Tunnel through the transaction error machinery using the
          // existing INVALID_CODE/INACTIVE_CODE convention plus a fresh
          // CODE_REJECTED:<message> tag for the new failure modes.
          throw new Error(`CODE_REJECTED:${check.message}`);
        }
        discountCodeRow = check.row;
        percent = check.row.percent;
      }

      const finalPrice = computeFinalPrice(basePrice, percent);

      const [request] = await tx.insert(subscriptionRequestsTable).values({
        userId,
        userEmail: user?.email ?? "",
        userName: user?.displayName ?? null,
        accountName: parsed.data.accountName,
        planType: parsed.data.planType,
        region: parsed.data.region,
        subjectId,
        subjectName: subjectName ?? null,
        notes: parsed.data.notes ?? null,
        status: "pending",
        discountCodeId: discountCodeRow?.id ?? null,
        discountCode: welcomeApplied ? WELCOME_OFFER_LABEL : (discountCodeRow?.code ?? null),
        discountPercent: percent || null,
        basePrice,
        finalPrice,
      }).returning();

      return request;
    });

    res.status(201).json(created);
  } catch (e: any) {
    if (e?.message === "INVALID_CODE") {
      res.status(400).json({ error: "كود الخصم غير موجود" });
      return;
    }
    if (e?.message === "INACTIVE_CODE") {
      res.status(400).json({ error: "كود الخصم متوقف حالياً" });
      return;
    }
    if (typeof e?.message === "string" && e.message.startsWith("CODE_REJECTED:")) {
      res.status(400).json({ error: e.message.slice("CODE_REJECTED:".length) });
      return;
    }
    throw e;
  }
});

// ── User: validate a discount code (preview final price) ──────────────────────
router.post("/subscriptions/discount-codes/validate", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const code = normalizeDiscountCode(req.body?.code);
  const planType = typeof req.body?.planType === "string" ? req.body.planType : "";
  const region = typeof req.body?.region === "string" ? req.body.region : "";

  if (!code) {
    res.json({ valid: false, message: "أدخل كود خصم صحيح (أحرف وأرقام فقط)" });
    return;
  }

  const basePrice = await getPlanPriceFromDb(planType, region);
  if (basePrice == null) {
    res.status(400).json({ valid: false, message: "خطة أو منطقة غير صالحة" });
    return;
  }

  const check = await checkDiscountCodeForUser(code, userId);
  if (!check.ok) {
    res.json({ valid: false, message: check.message });
    return;
  }
  const row = check.row;

  const finalPrice = computeFinalPrice(basePrice, row.percent);
  res.json({
    valid: true,
    code: row.code,
    percent: row.percent,
    basePrice,
    finalPrice,
    discountAmount: basePrice - finalPrice,
    maxUses: row.maxUses,
    usageCount: row.usageCount,
    perUserLimit: row.perUserLimit,
    endsAt: row.endsAt,
  });
});

// ── Public: current plan prices (no auth required) ───────────────────────────
// Returns the live admin-configured price grid so the subscription page can
// render the correct numbers without hardcoding a mirror constant.
// Shape: { north: { bronze, silver, gold }, south: { bronze, silver, gold } }
router.get("/subscriptions/plan-prices", async (_req, res): Promise<void> => {
  try {
    const map = await getPriceMap();
    res.json({
      north: {
        bronze: map.north?.bronze ?? BASE_PRICES_FALLBACK.north.bronze,
        silver: map.north?.silver ?? BASE_PRICES_FALLBACK.north.silver,
        gold: map.north?.gold ?? BASE_PRICES_FALLBACK.north.gold,
      },
      south: {
        bronze: map.south?.bronze ?? BASE_PRICES_FALLBACK.south.bronze,
        silver: map.south?.silver ?? BASE_PRICES_FALLBACK.south.silver,
        gold: map.south?.gold ?? BASE_PRICES_FALLBACK.south.gold,
      },
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "plan-prices: public read failed");
    // Always return *something* — the subscription UI must render even on
    // transient DB failure. Falls back to the static defaults.
    res.json(BASE_PRICES_FALLBACK);
  }
});

// ── Welcome offer (50% off, first-time visitor, 24h, single-use) ──────────────
async function userHasAnySubscription(userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: userSubjectSubscriptionsTable.id })
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, userId))
    .limit(1);
  if (rows.length > 0) return true;
  const reqRows = await db
    .select({ id: subscriptionRequestsTable.id })
    .from(subscriptionRequestsTable)
    .where(eq(subscriptionRequestsTable.userId, userId))
    .limit(1);
  return reqRows.length > 0;
}

type WelcomeOfferState = {
  eligibleToShow: boolean;
  active: boolean;
  expiresAt: Date | null;
  shownAt: Date | null;
  usedAt: Date | null;
  percent: number;
  hasAnySubscription: boolean;
  visited: boolean;
};

async function getWelcomeOfferState(userId: number): Promise<WelcomeOfferState> {
  const user = await getUser(userId);
  if (!user) {
    return {
      eligibleToShow: false, active: false,
      expiresAt: null, shownAt: null, usedAt: null,
      percent: WELCOME_OFFER_PERCENT, hasAnySubscription: false, visited: false,
    };
  }
  const hasAnySubscription = await userHasAnySubscription(userId);
  const now = Date.now();
  const shownAt = user.welcomeOfferShownAt ?? null;
  const expiresAt = user.welcomeOfferExpiresAt ?? null;
  const usedAt = user.welcomeOfferUsedAt ?? null;
  const visited = user.subPageFirstVisitedAt != null;
  const left = user.subPageLeftAt != null;

  const active = !!shownAt && !usedAt && !!expiresAt && new Date(expiresAt).getTime() > now;
  // Server-side eligibility: must have visited the subscription page AND
  // recorded a "leave" event (the page sends a beacon on unmount). This
  // closes the bypass where a client could call /show without ever leaving.
  const eligibleToShow = !shownAt && visited && left && !hasAnySubscription;

  return {
    eligibleToShow, active,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    shownAt: shownAt ? new Date(shownAt) : null,
    usedAt: usedAt ? new Date(usedAt) : null,
    percent: WELCOME_OFFER_PERCENT,
    hasAnySubscription, visited,
  };
}

// Mark first visit to subscription page (idempotent — only sets if null and
// user has never subscribed).
router.post("/subscriptions/welcome-offer/visit", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const hasAny = await userHasAnySubscription(userId);
  if (hasAny) {
    res.json({ ok: true, visited: false, reason: "has_subscription" });
    return;
  }

  await db
    .update(usersTable)
    .set({ subPageFirstVisitedAt: new Date() })
    .where(and(
      eq(usersTable.id, userId),
      sql`${usersTable.subPageFirstVisitedAt} IS NULL`,
    ));

  res.json({ ok: true, visited: true });
});

// Mark that the user left the subscription page (called from page unmount /
// beforeunload via navigator.sendBeacon for reliability across navigations).
// This is a precondition for `eligibleToShow` so it cannot be bypassed by
// directly calling /welcome-offer/show.
router.post("/subscriptions/welcome-offer/leave", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const hasAny = await userHasAnySubscription(userId);
  if (hasAny) {
    res.json({ ok: true, recorded: false, reason: "has_subscription" });
    return;
  }

  // Only record if the user actually visited (visit endpoint must run first).
  // Always update to the latest leave timestamp.
  await db
    .update(usersTable)
    .set({ subPageLeftAt: new Date() })
    .where(and(
      eq(usersTable.id, userId),
      sql`${usersTable.subPageFirstVisitedAt} IS NOT NULL`,
      sql`${usersTable.welcomeOfferShownAt} IS NULL`,
    ));

  res.json({ ok: true, recorded: true });
});

// Get welcome offer state.
router.get("/subscriptions/welcome-offer", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const state = await getWelcomeOfferState(userId);
  res.json({
    eligibleToShow: state.eligibleToShow,
    active: state.active,
    expiresAt: state.expiresAt,
    shownAt: state.shownAt,
    usedAt: state.usedAt,
    percent: state.percent,
    hasAnySubscription: state.hasAnySubscription,
    durationMs: WELCOME_OFFER_DURATION_MS,
  });
});

// Mark popup as shown — atomic, starts the 24h countdown. Idempotent: if
// already shown, returns existing values.
router.post("/subscriptions/welcome-offer/show", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const state = await getWelcomeOfferState(userId);
  if (state.shownAt) {
    res.json({
      ok: true, alreadyShown: true,
      shownAt: state.shownAt, expiresAt: state.expiresAt,
      active: state.active, percent: state.percent,
    });
    return;
  }
  if (!state.eligibleToShow) {
    res.status(400).json({ error: "OFFER_NOT_ELIGIBLE" });
    return;
  }

  const now = new Date();
  const expires = new Date(now.getTime() + WELCOME_OFFER_DURATION_MS);
  // Fully atomic conditional update: re-asserts ALL eligibility conditions
  // inside the WHERE clause so a TOCTOU between getWelcomeOfferState() above
  // and this UPDATE cannot mark `shownAt` for a user who is no longer eligible
  // (e.g., a parallel request created a subscription record meanwhile).
  const result = await db
    .update(usersTable)
    .set({ welcomeOfferShownAt: now, welcomeOfferExpiresAt: expires })
    .where(and(
      eq(usersTable.id, userId),
      sql`${usersTable.welcomeOfferShownAt} IS NULL`,
      sql`${usersTable.subPageFirstVisitedAt} IS NOT NULL`,
      sql`${usersTable.subPageLeftAt} IS NOT NULL`,
      sql`NOT EXISTS (SELECT 1 FROM ${userSubjectSubscriptionsTable} WHERE ${userSubjectSubscriptionsTable.userId} = ${userId})`,
      sql`NOT EXISTS (SELECT 1 FROM ${subscriptionRequestsTable} WHERE ${subscriptionRequestsTable.userId} = ${userId})`,
    ))
    .returning({ shownAt: usersTable.welcomeOfferShownAt, expiresAt: usersTable.welcomeOfferExpiresAt });

  if (result.length === 0) {
    // Race: someone else already set it — fetch and return existing.
    const fresh = await getWelcomeOfferState(userId);
    res.json({
      ok: true, alreadyShown: true,
      shownAt: fresh.shownAt, expiresAt: fresh.expiresAt,
      active: fresh.active, percent: fresh.percent,
    });
    return;
  }

  res.json({
    ok: true, alreadyShown: false,
    shownAt: now, expiresAt: expires, active: true, percent: WELCOME_OFFER_PERCENT,
  });
});

// ── User: get my requests ──────────────────────────────────────────────────────
router.get("/subscriptions/my-requests", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const requests = await db
    .select()
    .from(subscriptionRequestsTable)
    .where(eq(subscriptionRequestsTable.userId, userId));

  res.json(requests);
});

// ── User: get my subject subscriptions ────────────────────────────────────────
router.get("/subscriptions/my-subjects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subs = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, userId))
    .orderBy(desc(userSubjectSubscriptionsTable.createdAt));

  // Apply daily rollover for every active row so `gemsUsedToday` and
  // `gemsResetDate` reflect today's truth — the dashboard's "active sub"
  // filter and the per-row gems-remaining display both depend on this.
  const now = new Date();
  const enriched = await Promise.all(
    subs.map(async (s) => {
      if (new Date(s.expiresAt) > now) {
        await applyDailyGemsRolloverForSubjectSub(s);
      }
      const dailyLimit = s.gemsDailyLimit ?? 0;
      const usedToday = s.gemsUsedToday ?? 0;
      const balance = s.gemsBalance ?? 0;
      // Cap dailyRemaining by total balance so an exhausted-but-active
      // sub never appears usable.
      const dailyRemaining = Math.min(balance, Math.max(0, dailyLimit - usedToday));
      return { ...s, dailyRemaining };
    }),
  );

  res.json(enriched);
});

// ── User: get access info for a specific subject ───────────────────────────────
router.get("/subscriptions/subject-access", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : null;
  if (!subjectId) {
    res.status(400).json({ error: "subjectId required" });
    return;
  }

  const user = await getUser(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const access = await getAccessForUser({ userId, subjectId });

  const [subjectSub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(and(
      eq(userSubjectSubscriptionsTable.userId, userId),
      eq(userSubjectSubscriptionsTable.subjectId, subjectId),
    ))
    .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

  const hasSubjectSub = access.hasActiveSub && access.source === "per-subject";
  // Renew wall fires only when the user previously had a subscription
  // (per-subject row OR legacy wallet) and now has none. A user who
  // never subscribed must not be shown the "renew" wall — they get
  // the regular subscribe flow instead.
  const hadPreviousSub =
    !!subjectSub ||
    !!user.gemsExpiresAt ||
    !!(user.nukhbaPlan && user.subscriptionExpiresAt);
  const subjectSubExpired =
    hadPreviousSub && !access.hasActiveSub && !access.isFirstLesson;

  // hasAccess covers lesson viewing and the renew wall. Daily-cap state
  // is surfaced separately via blockReason and handled by the chat overlay.
  res.json({
    hasAccess: access.hasActiveSub || access.isFirstLesson,
    isFirstLesson: access.isFirstLesson,
    hasSubjectSubscription: hasSubjectSub,
    hasLegacyGlobalSubscription: access.source === "legacy",
    subjectSubExpired,
    expiredRecently: access.expiredRecently,
    gemsBalance: access.gemsRemaining,
    dailyRemaining: access.dailyRemaining,
    gemsExpiresAt: access.expiresAt ? access.expiresAt.toISOString() : null,
    blockReason: access.blockReason,
    // ── Legacy fields kept for back-compat with existing client code.
    messagesRemaining: hasSubjectSub && subjectSub
      ? Math.max(0, subjectSub.messagesLimit - subjectSub.messagesUsed)
      : null,
    expiresAt: access.expiresAt ? access.expiresAt.toISOString() : null,
    planType: subjectSub?.plan ?? null,
    subjectSubscription: subjectSub ?? null,
  });
});

// ── User: activate with code ───────────────────────────────────────────────────
router.post("/subscriptions/activate", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ActivateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const code = parsed.data.code.toUpperCase();

  const [card] = await db
    .select()
    .from(activationCardsTable)
    .where(eq(activationCardsTable.activationCode, code));

  if (!card) {
    res.status(400).json({ success: false, message: "كود التفعيل غير صحيح" });
    return;
  }

  if (card.isUsed) {
    res.status(400).json({ success: false, message: "تم استخدام هذا الكود مسبقاً" });
    return;
  }

  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    res.status(400).json({ success: false, message: "انتهت صلاحية الكود" });
    return;
  }

  // Activation cards are per-subject. Cards minted under the legacy
  // "all" model are no longer accepted because they would grant access to a
  // subject the student didn't explicitly choose — and that contradicts the
  // current per-subject billing rule.
  if (!card.subjectId || card.subjectId === "all") {
    res.status(400).json({
      success: false,
      message: "هذا الكود غير مرتبط بتخصص محدد. يرجى التواصل مع الدعم لإصدار كود جديد.",
    });
    return;
  }

  const planGems = PLAN_GEM_LIMITS[card.planType];
  if (!planGems) {
    res.status(400).json({ success: false, message: `نوع الباقة غير معروف: ${card.planType}` });
    return;
  }

  // Atomically mark the card as used FIRST so concurrent activations cannot
  // both pass the `isUsed` check above.
  const claim = await db
    .update(activationCardsTable)
    .set({ isUsed: true, usedByUserId: userId, usedAt: new Date() })
    .where(and(
      eq(activationCardsTable.id, card.id),
      eq(activationCardsTable.isUsed, false),
    ))
    .returning({ id: activationCardsTable.id });

  if (claim.length === 0) {
    res.status(400).json({ success: false, message: "تم استخدام هذا الكود مسبقاً" });
    return;
  }

  // ── Recover region + paid price for the cost-cap system ────────────────────
  // The cost-cap (50% of paid YER) needs the real `region` and `paidPriceYer`
  // to enforce correctly. Pull them from the originating subscription_request
  // when available; otherwise fall back to the card.region + the current
  // admin-configured plan price. We never silently persist null/0 — that
  // would let cost-cap default to south pricing and weaken enforcement. If
  // we cannot resolve to a valid (region, price>0) pair, we refuse the
  // activation and tell support to remint the card.
  let resolvedRegion: "north" | "south" | null = null;
  let resolvedPaidYer = 0;
  const isValidRegion = (r: unknown): r is "north" | "south" =>
    r === "north" || r === "south";

  if (isValidRegion(card.region)) resolvedRegion = card.region;

  if (card.subscriptionRequestId) {
    const [origReq] = await db
      .select({
        region: subscriptionRequestsTable.region,
        finalPrice: subscriptionRequestsTable.finalPrice,
        basePrice: subscriptionRequestsTable.basePrice,
      })
      .from(subscriptionRequestsTable)
      .where(eq(subscriptionRequestsTable.id, card.subscriptionRequestId));
    if (origReq) {
      if (isValidRegion(origReq.region)) resolvedRegion = origReq.region;
      const reqPrice = origReq.finalPrice ?? origReq.basePrice ?? 0;
      if (reqPrice > 0) resolvedPaidYer = reqPrice;
    }
  }

  if (resolvedPaidYer <= 0 && resolvedRegion) {
    // Fallback: derive paid price from the current admin-configured price
    // when the request row is missing (legacy cards minted directly by an
    // admin). Async DB read with in-process cache + static fallback.
    const fallback = await getPlanPriceFromDb(card.planType, resolvedRegion);
    if (typeof fallback === "number" && fallback > 0) {
      resolvedPaidYer = fallback;
    }
  }

  if (!resolvedRegion || resolvedPaidYer <= 0) {
    // Hard refuse: rolling back the claim row keeps the card reusable so
    // support can fix the metadata and the user can retry. Leaving region
    // null / price 0 in the live subscription would silently weaken the
    // AI cost-cap for this user.
    await db
      .update(activationCardsTable)
      .set({ isUsed: false, usedByUserId: null, usedAt: null })
      .where(eq(activationCardsTable.id, card.id));
    res.status(409).json({
      success: false,
      message:
        "تعذّر تفعيل الكود لاختلال بيانات السعر/المنطقة. يرجى التواصل مع الدعم لإعادة إصدار الكود.",
    });
    return;
  }

  const sub = await grantSubjectSubscription({
    userId,
    subjectId: card.subjectId,
    subjectName: card.subjectName ?? null,
    planType: card.planType,
    region: resolvedRegion,
    paidPriceYer: resolvedPaidYer,
    activationCode: code,
    subscriptionRequestId: card.subscriptionRequestId ?? null,
    source: "activate_card",
    adminUserId: null,
  });

  res.json({
    success: true,
    planType: card.planType,
    subjectId: sub.subjectId,
    subjectName: sub.subjectName,
    gemsGranted: planGems.total,
    expiresAt: sub.expiresAt,
    message: `تم تفعيل باقة ${card.planType} (${planGems.total}💎) لمادة "${sub.subjectName ?? sub.subjectId}" بنجاح!`,
  });
});

// ── Admin: get all subscription requests ──────────────────────────────────────
router.get("/admin/subscription-requests", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const params = GetAdminSubscriptionRequestsQueryParams.safeParse(req.query);

  if (params.success && params.data.status) {
    const requests = await db
      .select()
      .from(subscriptionRequestsTable)
      .where(eq(subscriptionRequestsTable.status, params.data.status))
      .orderBy(desc(subscriptionRequestsTable.createdAt));
    res.json(requests);
    return;
  }

  const requests = await db
    .select()
    .from(subscriptionRequestsTable)
    .orderBy(desc(subscriptionRequestsTable.createdAt));
  res.json(requests);
});

// ── Admin: approve subscription request ───────────────────────────────────────
router.post("/admin/subscription-requests/:id/approve", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [request] = await db
    .select()
    .from(subscriptionRequestsTable)
    .where(eq(subscriptionRequestsTable.id, id));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // Idempotency: only pending or incomplete requests may be approved.
  if (request.status !== "pending" && request.status !== "incomplete") {
    res.status(409).json({ error: `لا يمكن قبول طلب حالته: ${request.status}` });
    return;
  }

  const code = generateActivationCode();
  const expiresAt = new Date(Date.now() + SUB_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const planGems = PLAN_GEM_LIMITS[request.planType];
  if (!planGems) {
    res.status(400).json({ error: `نوع الباقة غير معروف في الطلب: ${request.planType}` });
    return;
  }

  // Per-subject billing — request must reference a real subject. We reject
  // any legacy "all" or empty subject here so an admin can never accidentally
  // grant cross-subject access.
  const requestSubjectId = (request.subjectId ?? "").trim();
  if (!requestSubjectId || requestSubjectId === "all") {
    res.status(400).json({ error: "هذا الطلب لا يحتوي على تخصص محدد. يجب على المستخدم إعادة الإرسال مع اختيار التخصص." });
    return;
  }

  // Race-safe approval: conditional update on status. Only the first concurrent
  // call wins; subsequent calls find updatedRows = 0 and bail out.
  //
  // EVERYTHING that mutates persistent state for this approval — request
  // status, activation card, discount bump + redemption row, AND the
  // per-subject wallet grant — runs inside ONE transaction. This closes
  // the "approved-without-wallet" integrity hole: if the wallet insert
  // fails for any reason (transient DB error, schema drift, FK violation),
  // the whole approval rolls back, the discount usage is restored, and
  // the admin can safely retry the same request.
  try {
    const { card, subscription } = await db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(subscriptionRequestsTable)
        .set({
          status: "approved",
          activationCode: code,
          adminNote: null,
        })
        .where(and(
          eq(subscriptionRequestsTable.id, id),
          sql`${subscriptionRequestsTable.status} IN ('pending','incomplete')`,
        ))
        .returning();

      if (updatedRows.length === 0) {
        throw new Error("ALREADY_PROCESSED");
      }

      // If this request used a discount code, increment its usage counter
      // AND insert a per-user redemption row (used to enforce perUserLimit).
      // Done atomically with race-safe guards so a code's `usageCount` can
      // never exceed `maxUses` and a user's redemptions can never exceed
      // `perUserLimit`, even under simultaneous approvals from multiple
      // admin tabs.
      if (request.discountCodeId) {
        // 1) Atomic conditional bump: only increment if there is still
        //    headroom under maxUses. Returning rows let us detect the
        //    exhausted-mid-flight case and abort the transaction.
        const bumped = await tx
          .update(discountCodesTable)
          .set({ usageCount: sql`${discountCodesTable.usageCount} + 1` })
          .where(and(
            eq(discountCodesTable.id, request.discountCodeId),
            sql`(${discountCodesTable.maxUses} IS NULL OR ${discountCodesTable.usageCount} < ${discountCodesTable.maxUses})`,
          ))
          .returning({ id: discountCodesTable.id, perUserLimit: discountCodesTable.perUserLimit });
        if (bumped.length === 0) {
          throw new Error("DISCOUNT_EXHAUSTED");
        }
        // 2) Race-safe perUserLimit re-check inside the same tx — counts
        //    redemption rows for this (code, user) and aborts if the
        //    user already used the code up to its perUserLimit. Done
        //    after the bump so we hold the row's implicit lock.
        const perUserLimit = bumped[0].perUserLimit;
        if (perUserLimit != null) {
          const [countRow] = await tx
            .select({ c: sql<number>`count(*)::int` })
            .from(discountCodeRedemptionsTable)
            .where(and(
              eq(discountCodeRedemptionsTable.codeId, request.discountCodeId),
              eq(discountCodeRedemptionsTable.userId, request.userId),
            ));
          if ((countRow?.c ?? 0) >= perUserLimit) {
            throw new Error("DISCOUNT_PER_USER_EXHAUSTED");
          }
        }
        await tx.insert(discountCodeRedemptionsTable).values({
          codeId: request.discountCodeId,
          userId: request.userId,
          subscriptionRequestId: id,
        });
      }

      const [insertedCard] = await tx.insert(activationCardsTable).values({
        activationCode: code,
        planType: request.planType,
        region: request.region,
        subjectId: requestSubjectId,
        subjectName: request.subjectName ?? null,
        isUsed: true,
        usedByUserId: request.userId,
        usedAt: new Date(),
        expiresAt,
        subscriptionRequestId: id,
      }).returning();

      // Wallet grant happens INSIDE the same tx via the shared helper —
      // any failure rolls back the request status flip, the activation
      // card, and the discount bookkeeping in one go.
      const insertedSub = await grantSubjectSubscriptionInTx(tx, {
        userId: request.userId,
        subjectId: requestSubjectId,
        subjectName: request.subjectName ?? null,
        planType: request.planType,
        region: request.region,
        paidPriceYer: request.finalPrice ?? 0,
        activationCode: code,
        subscriptionRequestId: id,
      });

      return { card: insertedCard, subscription: insertedSub };
    });

    // Audit row — best-effort, AFTER the transaction commits so a
    // transient ledger failure cannot undo a paid subscription.
    const grantedPlan = PLAN_GEM_LIMITS[request.planType];
    await writeGemLedger({
      userId: request.userId,
      subjectSubId: subscription.id,
      subjectId: subscription.subjectId,
      delta: grantedPlan.total,
      balanceAfter: grantedPlan.total,
      reason: "grant",
      source: "approve_request",
      adminUserId: userId,
      note: request.discountCode ? `Approved with code ${request.discountCode}` : null,
      metadata: {
        planType: request.planType,
        region: request.region,
        paidPriceYer: request.finalPrice ?? 0,
        activationCode: code,
        subscriptionRequestId: id,
      },
    });

    res.json(card);
  } catch (e: any) {
    if (e?.message === "DISCOUNT_EXHAUSTED") {
      res.status(409).json({ error: "كود الخصم نَفِد قبل اعتماد هذا الطلب — أعِد المراجعة بعد إزالة الكود أو رفع الحد الأقصى" });
      return;
    }
    if (e?.message === "DISCOUNT_PER_USER_EXHAUSTED") {
      res.status(409).json({ error: "هذا المستخدم استنفد عدد المرات المسموح بها لهذا الكود" });
      return;
    }
    if (e?.message === "ALREADY_PROCESSED") {
      res.status(409).json({ error: "تمت معالجة هذا الطلب بالفعل" });
      return;
    }
    // Surface the real cause to the admin UI instead of letting Express
    // default to an HTML 500 (which hides the Arabic message and makes
    // approve failures undebuggable from the dashboard).
    logger.error(
      {
        err: e?.message,
        code: e?.code,
        detail: e?.detail,
        constraint: e?.constraint,
        column: e?.column,
        table: e?.table,
        requestId: id,
      },
      "admin: approve subscription request failed",
    );
    // Compose a SHORT, admin-friendly Arabic reason. Long pg messages
    // (which include the full SQL and params) get truncated; the pg
    // error code + column are appended so the admin can pinpoint the
    // exact missing column / constraint without reading server logs.
    const rawMsg = typeof e?.message === "string" ? e.message : "";
    const shortMsg = rawMsg.split("\n")[0].slice(0, 240);
    const codeBit = e?.code ? ` [code=${e.code}]` : "";
    const colBit = e?.column ? ` [column=${e.column}]` : "";
    const tableBit = e?.table ? ` [table=${e.table}]` : "";
    res.status(500).json({
      error: `تعذّر تفعيل الاشتراك: ${shortMsg || "خطأ غير معروف في قاعدة البيانات"}${codeBit}${colBit}${tableBit}`,
    });
  }
});

// ── Admin: reject subscription request ───────────────────────────────────────
router.post("/admin/subscription-requests/:id/reject", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.update(subscriptionRequestsTable).set({
    status: "rejected",
  }).where(eq(subscriptionRequestsTable.id, id));

  res.json({ success: true });
});

// ── Admin: mark incomplete ─────────────────────────────────────────────────────
router.post("/admin/subscription-requests/:id/incomplete", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = MarkIncompleteSubscriptionRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "adminNote is required" });
    return;
  }

  await db.update(subscriptionRequestsTable).set({
    status: "incomplete",
    adminNote: parsed.data.adminNote,
  }).where(eq(subscriptionRequestsTable.id, id));

  res.json({ success: true });
});

// ── Admin: list all activation cards ──────────────────────────────────────────
router.get("/admin/activation-cards", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cards = await db
    .select()
    .from(activationCardsTable)
    .orderBy(desc(activationCardsTable.createdAt));
  res.json(cards);
});

// ── Admin: create card manually ────────────────────────────────────────────────
router.post("/admin/cards/create", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { planType } = req.body;
  if (!planType || !PLAN_GEM_LIMITS[planType]) {
    res.status(400).json({ error: "Invalid plan type" });
    return;
  }

  const code = generateActivationCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const [card] = await db.insert(activationCardsTable).values({
    activationCode: code,
    planType,
    subjectId: "all",
    subjectName: null,
    isUsed: false,
    expiresAt,
  }).returning();

  res.json(card);
});

// ── Admin: plan prices (read + update) ───────────────────────────────────────
// GET returns the full 6-cell grid (north + south × bronze/silver/gold) with
// the current YER value, the last update timestamp, and the user who edited
// it. PATCH overwrites a single cell with strict server-side validation
// (positive integer, capped at 1,000,000 YER). Cache is invalidated
// immediately so subsequent reads (subscription page, request creation,
// discount preview) see the new value without waiting for TTL.
router.get("/admin/plan-prices", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUser(userId);
  if (user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const rows = await db.select().from(planPricesTable);
    // Always return the full 6-cell grid even if some rows are missing,
    // falling back to the static defaults so the admin UI never sees holes.
    const byKey = new Map<string, typeof rows[number]>();
    for (const r of rows) byKey.set(`${r.region}:${r.planType}`, r);

    const grid = VALID_REGIONS.flatMap((region) =>
      VALID_PLAN_TYPES.map((planType) => {
        const r = byKey.get(`${region}:${planType}`);
        return {
          region,
          planType,
          priceYer: r?.priceYer ?? BASE_PRICES_FALLBACK[region][planType],
          updatedAt: r?.updatedAt ?? null,
          updatedByUserId: r?.updatedByUserId ?? null,
          seeded: !r,
        };
      }),
    );

    res.json({ prices: grid, defaults: BASE_PRICES_FALLBACK });
  } catch (err: any) {
    logger.error({ err: err?.message }, "admin/plan-prices: read failed");
    res.status(500).json({ error: "تعذّر قراءة الأسعار من قاعدة البيانات." });
  }
});

router.patch("/admin/plan-prices", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUser(userId);
  if (user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const rawRegion = req.body?.region;
  const rawPlanType = req.body?.planType;
  const rawPrice = req.body?.priceYer;

  const region: PlanRegion | null =
    rawRegion === "north" || rawRegion === "south" ? rawRegion : null;
  if (!region) {
    res.status(400).json({ error: "المنطقة غير صحيحة. اختر north أو south." });
    return;
  }
  const planType: PlanType | null =
    rawPlanType === "bronze" || rawPlanType === "silver" || rawPlanType === "gold"
      ? rawPlanType
      : null;
  if (!planType) {
    res.status(400).json({ error: "نوع الباقة غير صحيح. اختر bronze أو silver أو gold." });
    return;
  }
  const priceYer = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
  if (!Number.isFinite(priceYer) || !Number.isInteger(priceYer) || priceYer < 1 || priceYer > 1_000_000) {
    res.status(400).json({ error: "السعر يجب أن يكون عدداً صحيحاً بين 1 و 1,000,000 ريال." });
    return;
  }

  try {
    const [row] = await db
      .insert(planPricesTable)
      .values({
        region,
        planType,
        priceYer,
        updatedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: [planPricesTable.region, planPricesTable.planType],
        set: {
          priceYer,
          updatedAt: new Date(),
          updatedByUserId: userId,
        },
      })
      .returning();

    invalidatePlanPriceCache();
    res.json({ ok: true, price: row });
  } catch (err: any) {
    logger.error(
      { err: err?.message, region, planType, priceYer },
      "admin/plan-prices: update failed",
    );
    res.status(500).json({ error: "تعذّر حفظ السعر. حاول مرة أخرى." });
  }
});

// ── Admin: stats ───────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const allRequests = await db.select().from(subscriptionRequestsTable);
  const pendingRequests = allRequests.filter(r => r.status === "pending").length;

  // Active = both legacy global subs and new per-subject subs
  const now = new Date();
  const subjectSubs = await db.select().from(userSubjectSubscriptionsTable);
  const activeSubjectSubs = subjectSubs.filter(s => new Date(s.expiresAt) > now).length;
  const users = await db.select().from(usersTable);
  const legacyActiveSubs = users.filter(u =>
    u.nukhbaPlan && u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > now
  ).length;

  const cards = await db.select().from(activationCardsTable);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentlyExpiredSubs = subjectSubs.filter(s => {
    const exp = new Date(s.expiresAt);
    return exp < now && exp > sevenDaysAgo;
  }).length;

  res.json({
    pendingRequests,
    activeSubscriptions: activeSubjectSubs + legacyActiveSubs,
    recentlyExpiredSubscriptions: recentlyExpiredSubs,
    totalCards: cards.length,
    totalUsers: users.length,
  });
});

// ── Admin: list all users ──────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUser(userId);
  if (user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const users = await db.select().from(usersTable);
  const allRequests = await db.select().from(subscriptionRequestsTable);
  const allSubjectSubs = await db.select().from(userSubjectSubscriptionsTable);
  const now = new Date();

  const result = users.map(u => {
    const { passwordHash: _, ...safe } = u;
    const userRequests = allRequests.filter(r => r.userId === u.id);
    const lastRequest = userRequests.sort((a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    )[0] ?? null;

    const userSubjectSubs = allSubjectSubs.filter(s => s.userId === u.id);
    // "Active" now means the wallet still has gems AND the time window is
    // open. The legacy `messagesUsed < messagesLimit` filter was wrong under
    // the gems model — daily forfeit can drain `gemsBalance` without ever
    // touching `messagesUsed`, so subs that should appear exhausted were
    // still counted as active in the admin user list.
    const activeSubjectSubs = userSubjectSubs.filter(s =>
      new Date(s.expiresAt) > now && (s.gemsBalance ?? 0) > 0
    );

    const totalGemsGranted = userSubjectSubs.reduce(
      (sum, s) => sum + (s.messagesLimit ?? 0), 0,
    );
    const totalGemsRemaining = activeSubjectSubs.reduce(
      (sum, s) => sum + (s.gemsBalance ?? 0), 0,
    );

    return {
      ...safe,
      totalSubscriptionRequests: userRequests.length,
      lastRequestStatus: lastRequest?.status ?? null,
      lastRequestPlan: lastRequest?.planType ?? null,
      lastRequestSubject: lastRequest?.subjectId ?? null,
      lastRequestSubjectName: lastRequest?.subjectName ?? null,
      lastRequestDate: lastRequest?.createdAt ?? null,
      subjectSubscriptions: userSubjectSubs,
      activeSubjectSubscriptionsCount: activeSubjectSubs.length,
      messagesUsed: totalGemsGranted - totalGemsRemaining,
      messagesLimit: totalGemsGranted,
      messagesLeft: totalGemsRemaining,
      gemsRemaining: totalGemsRemaining,
      gemsGranted: totalGemsGranted,
    };
  });

  res.json(result);
});

// ── Admin: cancel user's global subscription ───────────────────────────────────
router.post("/admin/users/:id/cancel-subscription", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ nukhbaPlan: null, messagesLimit: 0, messagesUsed: 0, subscriptionExpiresAt: null })
    .where(eq(usersTable.id, targetId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  // Also revoke all per-subject subscriptions so the user truly loses access
  const removed = await db
    .delete(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, targetId))
    .returning({ id: userSubjectSubscriptionsTable.id });

  res.json({ success: true, subjectSubscriptionsRevoked: removed.length });
});

// ── Admin: cancel user's subject-specific subscription ────────────────────────
router.delete("/admin/users/:userId/subject-subscriptions/:subId", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "Invalid subscription id" }); return; }

  // Fetch first so we can write a ledger entry capturing the burned balance.
  const [sub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.id, subId));

  await db.delete(userSubjectSubscriptionsTable).where(eq(userSubjectSubscriptionsTable.id, subId));

  if (sub) {
    await writeGemLedger({
      userId: sub.userId,
      subjectSubId: sub.id,
      subjectId: sub.subjectId,
      delta: -(sub.gemsBalance ?? 0),
      balanceAfter: 0,
      reason: "adjust",
      source: "subscription_revoke",
      adminUserId: adminId,
      note: "Admin revoked subscription",
      metadata: { plan: sub.plan, region: sub.region, expiresAt: sub.expiresAt },
    });
  }
  res.json({ success: true });
});

// ── Admin: grant subject subscription (deprecated under gems model) ──────────
// Per-subject subscriptions are no longer supported — admins should use the
// platform-wide /admin/users/:id/grant-gems endpoint instead.
router.post("/admin/users/:id/grant-subject-subscription", async (_req, res): Promise<void> => {
  res.status(410).json({
    error: "DEPRECATED",
    message: "تم استبدال الاشتراكات لكل مادة بنظام الجواهر. استخدم /admin/users/:id/grant-gems",
  });
});

// ── Admin: reset subject first lesson (allow free retry) ──────────────────────
router.delete("/admin/users/:userId/subject-first-lesson/:subjectId", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(targetUserId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  await db.delete(userSubjectFirstLessonsTable).where(
    and(
      eq(userSubjectFirstLessonsTable.userId, targetUserId),
      eq(userSubjectFirstLessonsTable.subjectId, req.params.subjectId)
    )
  );

  res.json({ success: true });
});

// ── Admin: get user's subject subscriptions ────────────────────────────────────
router.get("/admin/subject-subscriptions/:userId", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(targetUserId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const subs = await db.select().from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, targetUserId));
  res.json(subs);
});

// ── Admin: grant subject subscription (deprecated — gems are platform-wide) ──
router.post("/admin/grant-subject-subscription", async (_req, res): Promise<void> => {
  res.status(410).json({
    error: "DEPRECATED",
    message: "تم استبدال الاشتراكات لكل مادة بنظام الجواهر. استخدم /admin/users/:id/grant-gems",
  });
});

// ── Admin: revoke subject subscription (simplified path) ─────────────────────
// Mirrors the older `/admin/users/:userId/subject-subscriptions/:subId` route
// but on a flatter URL the admin UI uses. We MUST fetch the row first and
// write a ledger entry capturing the burned balance — without it the audit
// trail loses every admin-initiated revoke that goes through this endpoint.
router.delete("/admin/revoke-subject-subscription/:subId", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "Invalid subscription id" }); return; }

  const [sub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.id, subId));
  if (!sub) { res.status(404).json({ error: "الاشتراك غير موجود" }); return; }

  await db.delete(userSubjectSubscriptionsTable).where(eq(userSubjectSubscriptionsTable.id, subId));

  await writeGemLedger({
    userId: sub.userId,
    subjectSubId: sub.id,
    subjectId: sub.subjectId,
    delta: -(sub.gemsBalance ?? 0),
    balanceAfter: 0,
    reason: "adjust",
    source: "subscription_revoke",
    adminUserId: adminId,
    note: "Admin revoked subscription",
    metadata: { plan: sub.plan, region: sub.region, expiresAt: sub.expiresAt },
  });

  res.json({ success: true });
});

// ── Admin: get ALL subject subscriptions (with user info) ─────────────────────
router.get("/admin/all-subject-subscriptions", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subs = await db.select().from(userSubjectSubscriptionsTable).orderBy(desc(userSubjectSubscriptionsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap: Record<number, typeof users[0]> = {};
  for (const u of users) userMap[u.id] = u;

  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const result = subs.map(s => {
    const u = userMap[s.userId];
    const expiresMs = new Date(s.expiresAt).getTime();
    const isExpired = expiresMs < now.getTime();
    // Wallet is exhausted when balance hits zero. messagesUsed is a stale
    // legacy column that the gems system never updates — using it here
    // caused the admin "all subscriptions" view to mis-classify subs that
    // had been drained by daily forfeit.
    const isExhausted = (s.gemsBalance ?? 0) <= 0;
    const status = isExpired ? "expired" : isExhausted ? "exhausted" : "active";
    const expiresInDays = Math.max(0, Math.ceil((expiresMs - now.getTime()) / (24 * 60 * 60 * 1000)));
    const isExpiringSoon = !isExpired && (expiresMs - now.getTime()) < sevenDaysMs;
    return {
      ...s,
      userEmail: u?.email ?? "",
      userName: u?.displayName ?? null,
      status,
      expiresInDays,
      isExpiringSoon,
    };
  });

  res.json(result);
});

// ── Admin: extend subject subscription expiry ──────────────────────────────────
router.patch("/admin/subject-subscriptions/:subId/extend", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "Invalid subscription id" }); return; }

  const days = parseInt(req.body.days, 10) || 14;

  const [sub] = await db.select().from(userSubjectSubscriptionsTable).where(eq(userSubjectSubscriptionsTable.id, subId));
  if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }

  const newExpiry = new Date(Math.max(new Date(sub.expiresAt).getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);
  const [updated] = await db.update(userSubjectSubscriptionsTable)
    .set({ expiresAt: newExpiry })
    .where(eq(userSubjectSubscriptionsTable.id, subId))
    .returning();

  // Log the time-only change in the gem ledger so the audit history is
  // complete (delta=0 since balance is untouched).
  await writeGemLedger({
    userId: sub.userId,
    subjectSubId: sub.id,
    subjectId: sub.subjectId,
    delta: 0,
    balanceAfter: sub.gemsBalance ?? 0,
    reason: "extend",
    source: "subscription_extend",
    adminUserId: adminId,
    note: `Extended by ${days} day(s)`,
    metadata: { previousExpiresAt: sub.expiresAt, newExpiresAt: newExpiry, days },
  });

  res.json({ success: true, subscription: updated });
});

// ── Admin: refund / adjust gems on a specific subject subscription ───────────
// Body: { delta: integer (signed), reason: string (≥3 chars) }
// Positive delta = refund (clamped so balance never exceeds messagesLimit so
// the wallet stays consistent with the original plan grant). Negative delta =
// punitive deduction. A non-empty reason is mandatory — it's stored in the
// ledger for the audit trail.
router.post("/admin/subject-subscriptions/:subId/refund-gems", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "معرف الاشتراك غير صالح" }); return; }

  const rawDelta = Number(req.body?.delta);
  if (!Number.isInteger(rawDelta) || rawDelta === 0) {
    res.status(400).json({ error: "أدخل عدداً صحيحاً غير صفر للتعديل" });
    return;
  }
  // Hard cap to prevent typos that would flood the ledger with massive
  // unintended adjustments.
  if (Math.abs(rawDelta) > 100_000) {
    res.status(400).json({ error: "أقصى تعديل مسموح هو ١٠٠,٠٠٠ جوهرة في المرة الواحدة" });
    return;
  }
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (reason.length < 3) {
    res.status(400).json({ error: "يجب كتابة سبب مفصّل (٣ أحرف على الأقل)" });
    return;
  }

  const [sub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.id, subId));
  if (!sub) { res.status(404).json({ error: "الاشتراك غير موجود" }); return; }

  // Race-safe atomic adjustment. CLAMP at 0 (no negative balances) and at
  // the original total grant (`messagesLimit` is the legacy column that
  // holds the plan's full gem total) so refunds can never inflate a wallet
  // beyond its original cap.
  const cap = sub.messagesLimit ?? 999_999;
  const [updated] = await db
    .update(userSubjectSubscriptionsTable)
    .set({
      gemsBalance: sql`LEAST(${cap}::int, GREATEST(0, ${userSubjectSubscriptionsTable.gemsBalance} + ${rawDelta}))`,
    })
    .where(eq(userSubjectSubscriptionsTable.id, subId))
    .returning();

  if (!updated) { res.status(500).json({ error: "تعذّر تطبيق التعديل" }); return; }

  await writeGemLedger({
    userId: sub.userId,
    subjectSubId: sub.id,
    subjectId: sub.subjectId,
    delta: rawDelta,
    balanceAfter: updated.gemsBalance ?? 0,
    reason: rawDelta > 0 ? "refund" : "adjust",
    source: rawDelta > 0 ? "admin_refund" : "admin_adjust",
    adminUserId: adminId,
    note: reason,
    metadata: { previousBalance: sub.gemsBalance, requestedDelta: rawDelta, cap },
  });

  res.json({
    ok: true,
    subscription: updated,
    appliedDelta: (updated.gemsBalance ?? 0) - (sub.gemsBalance ?? 0),
  });
});

// ── Admin: gem-ledger feed ────────────────────────────────────────────────────
// Query params:
//   userId      → filter to one user
//   subjectSubId → filter to one wallet
//   reason      → grant|debit|refund|adjust|forfeit|extend
//   from / to   → ISO timestamps
//   limit       → default 100, max 500
// Returns rows newest-first with the user's email/displayName joined for the
// admin UI.
router.get("/admin/gem-ledger", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const conditions = [] as Array<ReturnType<typeof eq>>;
  const userIdQ = req.query.userId ? parseInt(String(req.query.userId), 10) : NaN;
  if (!isNaN(userIdQ)) conditions.push(eq(gemLedgerTable.userId, userIdQ));
  const subQ = req.query.subjectSubId ? parseInt(String(req.query.subjectSubId), 10) : NaN;
  if (!isNaN(subQ)) conditions.push(eq(gemLedgerTable.subjectSubId, subQ));
  const reasonQ = typeof req.query.reason === "string" ? req.query.reason.trim() : "";
  if (reasonQ) conditions.push(eq(gemLedgerTable.reason, reasonQ));
  const sourceQ = typeof req.query.source === "string" ? req.query.source.trim() : "";
  if (sourceQ) conditions.push(eq(gemLedgerTable.source, sourceQ));
  const requestIdQ = typeof req.query.requestId === "string" ? req.query.requestId.trim() : "";
  if (requestIdQ) {
    // requestId lives inside metadata jsonb. Use ->> to compare as text.
    conditions.push(sql`${gemLedgerTable.metadata}->>'requestId' = ${requestIdQ}` as any);
  }
  if (typeof req.query.from === "string") {
    const d = new Date(req.query.from);
    if (!isNaN(d.getTime())) conditions.push(gte(gemLedgerTable.createdAt, d) as any);
  }
  if (typeof req.query.to === "string") {
    const d = new Date(req.query.to);
    if (!isNaN(d.getTime())) conditions.push(lte(gemLedgerTable.createdAt, d) as any);
  }

  const limitRaw = parseInt(String(req.query.limit ?? "100"), 10);
  const limit = Math.min(500, Math.max(1, isNaN(limitRaw) ? 100 : limitRaw));

  const baseQuery = db.select().from(gemLedgerTable);
  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions)).orderBy(desc(gemLedgerTable.createdAt)).limit(limit)
    : await baseQuery.orderBy(desc(gemLedgerTable.createdAt)).limit(limit);

  // Join user email/name in JS (small N — admin UI capped at 500 rows).
  const userIds = Array.from(new Set(rows.map(r => r.userId).concat(rows.map(r => r.adminUserId).filter((x): x is number => x != null))));
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName }).from(usersTable)
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(rows.map(r => ({
    ...r,
    userEmail: userMap.get(r.userId)?.email ?? "",
    userName: userMap.get(r.userId)?.displayName ?? null,
    adminEmail: r.adminUserId ? userMap.get(r.adminUserId)?.email ?? null : null,
  })));
});

// ── Public: payment settings (Kuraimi numbers etc.) ──────────────────────────
// No auth — the subscription page needs to render these for guests too. Only
// keys with category='payment' are exposed (admin-private keys can be added
// later under a different category without changing this endpoint).
router.get("/payment-settings/public", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.category, "payment"));
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  } catch (err: any) {
    logger.error({ err: err?.message }, "payment-settings/public: read failed");
    res.json({}); // never block the subscription page on a transient DB blip
  }
});

// ── Admin: payment settings GET / PUT ────────────────────────────────────────
router.get("/admin/payment-settings", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db.select().from(paymentSettingsTable).orderBy(paymentSettingsTable.id);
  res.json(rows);
});

router.put("/admin/payment-settings/:key", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const key = String(req.params.key || "").trim();
  if (!key || key.length > 80 || !/^[a-z0-9._-]+$/i.test(key)) {
    res.status(400).json({ error: "مفتاح غير صالح" });
    return;
  }
  const value = typeof req.body?.value === "string" ? req.body.value.trim() : "";
  if (value.length > 200) {
    res.status(400).json({ error: "القيمة طويلة جداً (الحد الأقصى ٢٠٠ حرفاً)" });
    return;
  }
  const label = typeof req.body?.label === "string" ? req.body.label.trim() : null;
  const category = typeof req.body?.category === "string" && req.body.category.trim()
    ? req.body.category.trim()
    : "payment";

  const [row] = await db
    .insert(paymentSettingsTable)
    .values({ key, value, label, category, updatedByUserId: adminId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: paymentSettingsTable.key,
      set: { value, label, category, updatedByUserId: adminId, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

// ── Admin: list discount codes (with usage counts) ────────────────────────────
router.get("/admin/discount-codes", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const codes = await db.select().from(discountCodesTable).orderBy(desc(discountCodesTable.createdAt));
  res.json(codes);
});

// ── Admin: create discount code ────────────────────────────────────────────────
router.post("/admin/discount-codes", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const code = normalizeDiscountCode(req.body?.code);
  const percentRaw = Number(req.body?.percent);
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

  if (!code) { res.status(400).json({ error: "كود غير صالح (٢-٣٢ حرف/رقم/شرطة)" }); return; }
  if (!Number.isInteger(percentRaw) || percentRaw < 1 || percentRaw > 99) {
    res.status(400).json({ error: "نسبة الخصم يجب أن تكون رقماً صحيحاً بين ١ و ٩٩" });
    return;
  }

  // Optional new limits. All four are nullable in the schema; we treat
  // empty / non-positive / unparseable as "unset" so an admin can clear any
  // of them by sending null.
  const maxUses = parseNullableInt(req.body?.maxUses);
  const perUserLimit = parseNullableInt(req.body?.perUserLimit);
  if (maxUses != null && maxUses < 1) {
    res.status(400).json({ error: "أقصى عدد استخدامات يجب أن يكون رقماً موجباً" }); return;
  }
  if (perUserLimit != null && perUserLimit < 1) {
    res.status(400).json({ error: "حد الاستخدام لكل مستخدم يجب أن يكون رقماً موجباً" }); return;
  }
  const startsAt = parseNullableDate(req.body?.startsAt);
  const endsAt = parseNullableDate(req.body?.endsAt);
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    res.status(400).json({ error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية" }); return;
  }

  const [existing] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, code));
  if (existing) { res.status(409).json({ error: "هذا الكود موجود مسبقاً" }); return; }

  const [row] = await db.insert(discountCodesTable).values({
    code,
    percent: percentRaw,
    note: note || null,
    active: true,
    usageCount: 0,
    maxUses,
    perUserLimit,
    startsAt,
    endsAt,
    createdByUserId: adminId,
  }).returning();

  res.status(201).json(row);
});

// ── Helpers for parsing optional discount code fields ────────────────────────
// Tolerant: accepts numbers, numeric strings, "" or null. Returns null for
// any value that is not a positive integer so admins can blank a field by
// sending an empty string or null.
function parseNullableInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}
function parseNullableDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

// ── Admin: update discount code (toggle active; edit percent only if unused) ──
router.patch("/admin/discount-codes/:id", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.id, id));
  if (!row) { res.status(404).json({ error: "Code not found" }); return; }

  const updates: Partial<typeof discountCodesTable.$inferInsert> = {};

  if (typeof req.body?.active === "boolean") {
    updates.active = req.body.active;
  }

  let percentChanged = false;
  if (req.body?.percent !== undefined) {
    if (row.usageCount > 0) {
      res.status(409).json({ error: "لا يمكن تعديل النسبة بعد أن استُخدم الكود — أنشئ كوداً جديداً" });
      return;
    }
    const p = Number(req.body.percent);
    if (!Number.isInteger(p) || p < 1 || p > 99) {
      res.status(400).json({ error: "نسبة الخصم يجب أن تكون رقماً صحيحاً بين ١ و ٩٩" });
      return;
    }
    updates.percent = p;
    percentChanged = true;
  }

  if (typeof req.body?.note === "string") {
    updates.note = req.body.note.trim() || null;
  }

  // New limits are mutable at any time — they only restrict *future*
  // usage, so unlike `percent` they don't need the usage-count guard.
  if (req.body?.maxUses !== undefined) {
    const v = parseNullableInt(req.body.maxUses);
    if (v != null && v < row.usageCount) {
      res.status(400).json({ error: `لا يمكن خفض أقصى عدد استخدامات أقل من المستخدم حالياً (${row.usageCount})` });
      return;
    }
    updates.maxUses = v;
  }
  if (req.body?.perUserLimit !== undefined) {
    const v = parseNullableInt(req.body.perUserLimit);
    if (v != null && v < 1) {
      res.status(400).json({ error: "حد الاستخدام لكل مستخدم يجب أن يكون رقماً موجباً" });
      return;
    }
    updates.perUserLimit = v;
  }
  if (req.body?.startsAt !== undefined) {
    updates.startsAt = parseNullableDate(req.body.startsAt);
  }
  if (req.body?.endsAt !== undefined) {
    updates.endsAt = parseNullableDate(req.body.endsAt);
  }

  if (Object.keys(updates).length === 0) {
    res.json(row);
    return;
  }

  // Race-safe percent update: enforce usage_count = 0 atomically in WHERE clause
  // so a concurrent request that just incremented usage cannot bypass the rule.
  const conditions = [eq(discountCodesTable.id, id)];
  if (percentChanged) {
    conditions.push(eq(discountCodesTable.usageCount, 0));
  }

  const updatedRows = await db.update(discountCodesTable)
    .set(updates)
    .where(and(...conditions))
    .returning();

  if (updatedRows.length === 0) {
    res.status(409).json({ error: "تم استخدام الكود أثناء التعديل — لا يمكن تغيير النسبة" });
    return;
  }

  res.json(updatedRows[0]);
});

// ── Admin: list subscribers who used a discount code ──────────────────────────
router.get("/admin/discount-codes/:id/subscribers", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const requests = await db
    .select()
    .from(subscriptionRequestsTable)
    .where(eq(subscriptionRequestsTable.discountCodeId, id))
    .orderBy(desc(subscriptionRequestsTable.createdAt));

  res.json(requests);
});

// ── User: get current gems balance ────────────────────────────────────────────
router.get("/subscriptions/gems-balance", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
  const access = await getAccessForUser({ userId, subjectId: subjectId || undefined });

  let subjectName: string | null = null;
  let plan: string | null = null;
  let gemsDailyLimit = 0;
  let gemsUsedToday = 0;

  // First-lesson detection (per-subject / per-skill). The free 80-gem grace
  // applies to each new تخصص/مهارة the user opens — independent of the
  // global `users.firstLessonComplete` one-shot flag — as long as there is
  // no active paid wallet for that subject. We derive eligibility purely
  // from the per-subject row (or its absence) so:
  //   • a brand-new subject with no row  → 80/80 free
  //   • partially used (< 80)            → (80 - used) free
  //   • exhausted (= 80) or row.completed → 0/80 with red CTA
  //   • any active paid sub for subject  → not first-lesson (paid path)
  let firstLessonGemsRemaining = 0;
  let firstLessonGemsUsed = 0;
  const userRow = await getUser(userId);
  let perSubjectFirstLesson:
    | typeof userSubjectFirstLessonsTable.$inferSelect
    | undefined;
  if (subjectId && access.source !== "per-subject" && access.source !== "legacy") {
    [perSubjectFirstLesson] = await db
      .select()
      .from(userSubjectFirstLessonsTable)
      .where(and(
        eq(userSubjectFirstLessonsTable.userId, userId),
        eq(userSubjectFirstLessonsTable.subjectId, subjectId),
      ));
  }
  // Per-subject view: any non-paid path (no active per-subject sub, no
  // legacy global wallet) is treated as the free-lesson display path —
  // even when the row is completed/exhausted. That keeps the badge
  // visible as a red "اشترك للمتابعة" CTA after the 80-gem cap is hit
  // (settleAiCharge flips `completed = true` at that boundary).
  const onFirstLessonGrace = subjectId
    ? (access.source !== "per-subject" && access.source !== "legacy")
    : (access.source === "first-lesson");

  if (access.source === "per-subject" && subjectId) {
    const [sub] = await db
      .select()
      .from(userSubjectSubscriptionsTable)
      .where(and(
        eq(userSubjectSubscriptionsTable.userId, userId),
        eq(userSubjectSubscriptionsTable.subjectId, subjectId),
      ))
      .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));
    subjectName = sub?.subjectName ?? null;
    plan = sub?.plan ?? null;
    gemsDailyLimit = sub?.gemsDailyLimit ?? 0;
    gemsUsedToday = sub?.gemsUsedToday ?? 0;
  } else if (access.source === "legacy") {
    plan = userRow?.nukhbaPlan ?? null;
    gemsDailyLimit = userRow?.gemsDailyLimit ?? 0;
    gemsUsedToday = userRow?.gemsUsedToday ?? 0;
  } else if (onFirstLessonGrace && subjectId) {
    firstLessonGemsUsed = perSubjectFirstLesson?.freeMessagesUsed ?? 0;
    firstLessonGemsRemaining = Math.max(0, FREE_LESSON_GEM_LIMIT - firstLessonGemsUsed);
    gemsDailyLimit = FREE_LESSON_GEM_LIMIT;
    gemsUsedToday = firstLessonGemsUsed;
  } else if (onFirstLessonGrace) {
    // Subject-less call — defend the shape so the summary endpoint can still
    // surface a meaningful badge.
    gemsDailyLimit = FREE_LESSON_GEM_LIMIT;
    firstLessonGemsRemaining = FREE_LESSON_GEM_LIMIT;
  }

  // Cross-subject summary: same shape as the `subjects` array on
  // /gems-balance-summary so a single fetch can power both the subject view
  // and the unified Usage screen. Computed only when the caller didn't pin a
  // specific subject; on subject-scoped reads we leave it empty to keep the
  // payload tight.
  const { getNextMidnightYemen } = await import("../lib/yemen-time");
  const dailyResetAtUtc = getNextMidnightYemen();

  const isFirstLesson = onFirstLessonGrace;
  const gemsBalance = isFirstLesson ? firstLessonGemsRemaining : access.gemsRemaining;
  const dailyRemaining = isFirstLesson ? firstLessonGemsRemaining : access.dailyRemaining;
  // Surface the exhausted-grace state explicitly so the badge can flip to a
  // red "اشترك للمتابعة" CTA instead of disappearing when freeMessagesUsed
  // hits the 80 cap (access.source flips to "none" at that boundary).
  const isFirstLessonExhausted = isFirstLesson && gemsBalance <= 0;

  res.json({
    subjectId: subjectId || null,
    subjectName,
    gemsBalance,
    gemsDailyLimit,
    gemsUsedToday,
    dailyRemaining,
    gemsExpiresAt: access.expiresAt,
    hasActiveSub: access.hasActiveSub,
    isFirstLesson,
    isFirstLessonExhausted,
    canUseGems: isFirstLesson ? gemsBalance > 0 : (access.canAccess && access.gemsRemaining > 0),
    plan,
    source: isFirstLesson ? ("first-lesson" as const) : access.source,
    dailyResetAtUtc,
  });
});

// ── Per-user gems history (subject-scoped or all) ────────────────────────────
// Powers the /usage page (recent activity feed) and any per-subject "where did
// my gems go?" drill-down. Returns the latest N ledger rows for the caller —
// debits, refunds, grants, daily forfeits — so the student can audit their own
// account without admin help. Strictly user-scoped: we never serve another
// user's rows even if a userId param were passed (we ignore it).
router.get("/subscriptions/gems-history", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const subjectIdQ = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
  const limitRaw = parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Math.min(200, Math.max(1, isNaN(limitRaw) ? 50 : limitRaw));

  const conditions = [eq(gemLedgerTable.userId, userId)] as Array<ReturnType<typeof eq>>;
  if (subjectIdQ) {
    conditions.push(eq(gemLedgerTable.subjectId, subjectIdQ));
  }

  const rows = await db
    .select()
    .from(gemLedgerTable)
    .where(and(...conditions))
    .orderBy(desc(gemLedgerTable.createdAt))
    .limit(limit);

  res.json(rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    delta: r.delta,
    balanceAfter: r.balanceAfter,
    reason: r.reason,
    source: r.source,
    note: r.note,
    subjectId: r.subjectId,
    subjectSubId: r.subjectSubId,
  })));
});

// ── Aggregate gems summary: all active subscriptions for the header badge ────
// Called by the header on non-subject pages (dashboard, learn, etc.) to show
// a "total daily remaining across all active subscriptions" badge. Returns
// per-subject rows for the lowest-remaining subject so the badge reflects the
// most constrained wallet, plus totals for the tooltip.
router.get("/subscriptions/gems-balance-summary", async (req, res): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const user = await getUser(userId);
    if (!user) { res.status(401).json({ error: "User not found" }); return; }

    const now = new Date();

    // Fetch all time-active per-subject subscriptions (not expired). We do
    // NOT filter by balance here — the header badge must remain visible
    // (in alert state) when a student has burned through their gems but the
    // subscription window is still open, so they can see they need to renew.
    const allSubs = await db
      .select()
      .from(userSubjectSubscriptionsTable)
      .where(and(
        eq(userSubjectSubscriptionsTable.userId, userId),
        gt(userSubjectSubscriptionsTable.expiresAt, now),
      ))
      .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

    // Apply daily rollover for each and compute per-sub figures.
    const activeSubs: Array<{
      subjectId: string;
      subjectName: string | null;
      dailyRemaining: number;
      gemsDailyLimit: number;
      gemsBalance: number;
      gemsExpiresAt: Date;
    }> = [];

    for (const sub of allSubs) {
      await applyDailyGemsRolloverForSubjectSub(sub);
      // Re-read the updated row to get post-rollover values.
      const [fresh] = await db
        .select()
        .from(userSubjectSubscriptionsTable)
        .where(eq(userSubjectSubscriptionsTable.id, sub.id));
      if (!fresh) continue;
      const used = fresh.gemsUsedToday ?? 0;
      const limit = fresh.gemsDailyLimit ?? 0;
      activeSubs.push({
        subjectId: fresh.subjectId,
        subjectName: fresh.subjectName ?? null,
        dailyRemaining: Math.max(0, limit - used),
        gemsDailyLimit: limit,
        gemsBalance: fresh.gemsBalance ?? 0,
        gemsExpiresAt: fresh.expiresAt,
      });
    }

    if (activeSubs.length > 0) {
      const totalDailyRemaining = activeSubs.reduce((s, x) => s + x.dailyRemaining, 0);
      const totalDailyLimit = activeSubs.reduce((s, x) => s + x.gemsDailyLimit, 0);
      const totalBalance = activeSubs.reduce((s, x) => s + x.gemsBalance, 0);
      // "Worst" subject = the one with the least daily remaining (most constrained).
      const worst = activeSubs.reduce((a, b) => a.dailyRemaining <= b.dailyRemaining ? a : b);
      // Nearest expiry = the soonest-to-expire subject. Used by the header
      // badge to surface a warning when ANY of the user's subjects is about
      // to expire (≤ 7 days). Without this, students lose access mid-study
      // session because nothing in the UI hints at the upcoming expiry.
      const nearest = activeSubs.reduce((a, b) =>
        new Date(a.gemsExpiresAt).getTime() <= new Date(b.gemsExpiresAt).getTime() ? a : b);
      const nearestMs = new Date(nearest.gemsExpiresAt).getTime() - now.getTime();
      const nearestDays = Math.max(0, Math.ceil(nearestMs / (24 * 60 * 60 * 1000)));
      res.json({
        // hasActiveSub: time-active window exists (badge stays visible).
        // canUseGems: at least one wallet still has spendable gems.
        hasActiveSub: true,
        canUseGems: totalBalance > 0,
        totalDailyRemaining,
        totalDailyLimit,
        totalBalance,
        activeSubjectCount: activeSubs.length,
        worstSubject: worst,
        nearestExpiresAt: nearest.gemsExpiresAt,
        nearestExpiresInDays: nearestDays,
        nearestSubject: { subjectId: nearest.subjectId, subjectName: nearest.subjectName },
        subjects: activeSubs,
        source: "per-subject" as const,
      });
      return;
    }

    // Fallback: legacy global wallet — also keep visible while time-active,
    // even if the balance is zero, so the user knows they've run out.
    await applyDailyGemsRollover(user);
    const hasLegacyActive = !!(user.gemsExpiresAt && new Date(user.gemsExpiresAt) > now);
    if (hasLegacyActive) {
      const usedLeg = user.gemsUsedToday ?? 0;
      const limitLeg = user.gemsDailyLimit ?? 0;
      const remaining = Math.max(0, limitLeg - usedLeg);
      const legacyBalance = user.gemsBalance ?? 0;
      const legExp = user.gemsExpiresAt ? new Date(user.gemsExpiresAt) : null;
      const legExpInDays = legExp
        ? Math.max(0, Math.ceil((legExp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
        : null;
      res.json({
        hasActiveSub: true,
        canUseGems: legacyBalance > 0,
        totalDailyRemaining: remaining,
        totalDailyLimit: limitLeg,
        totalBalance: legacyBalance,
        activeSubjectCount: 1,
        worstSubject: null,
        nearestExpiresAt: legExp,
        nearestExpiresInDays: legExpInDays,
        nearestSubject: null,
        subjects: [],
        source: "legacy" as const,
      });
      return;
    }

    // No active paid wallet — surface first-lesson grace as a badge-eligible
    // state so the header never goes dark for a logged-in user on
    // non-subject pages (dashboard, learn, etc.). The free grace is
    // per-subject: each new تخصص/مهارة gets a fresh 80, so we look across
    // all rows and pick the best (most-remaining) non-completed one.
    // No rows → user hasn't opened any subject yet → assume the full 80
    // are still available. Only when every existing row is exhausted or
    // completed do we surface the red "اشترك للمتابعة" CTA.
    {
      const rows = await db
        .select()
        .from(userSubjectFirstLessonsTable)
        .where(eq(userSubjectFirstLessonsTable.userId, userId));
      let bestRemaining = rows.length === 0 ? FREE_LESSON_GEM_LIMIT : 0;
      for (const r of rows) {
        if (r.completed) continue;
        const used = r.freeMessagesUsed ?? 0;
        const remaining = Math.max(0, FREE_LESSON_GEM_LIMIT - used);
        if (remaining > bestRemaining) bestRemaining = remaining;
      }
      const exhausted = bestRemaining <= 0;
      res.json({
        hasActiveSub: false,
        canUseGems: !exhausted,
        isFirstLesson: true,
        isFirstLessonExhausted: exhausted,
        totalDailyRemaining: bestRemaining,
        totalDailyLimit: FREE_LESSON_GEM_LIMIT,
        totalBalance: bestRemaining,
        activeSubjectCount: 0,
        worstSubject: null,
        subjects: [],
        source: "first-lesson" as const,
      });
      return;
    }

    res.json({
      hasActiveSub: false,
      canUseGems: false,
      totalDailyRemaining: 0,
      totalDailyLimit: 0,
      totalBalance: 0,
      activeSubjectCount: 0,
      worstSubject: null,
      subjects: [],
      source: "none" as const,
    });
  } catch (err) {
    console.error("[gems-balance-summary] failed:", err);
    res.json({
      hasActiveSub: false,
      canUseGems: false,
      totalDailyRemaining: 0,
      totalDailyLimit: 0,
      totalBalance: 0,
      activeSubjectCount: 0,
      worstSubject: null,
      subjects: [],
      source: "none" as const,
    });
  }
});

// ── Admin: manually grant a per-subject subscription to a user ───────────────
// Body: { planType, subjectId, subjectName? } — all required.
// Replaces any existing wallet for this (user, subject) with a fresh 14-day
// subscription. Per-subject only — there is no admin path to grant a global
// "all subjects" wallet anymore.
router.post("/admin/users/:id/grant-gems", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const planType = typeof req.body?.planType === "string" ? req.body.planType : "";
  const subjectId = typeof req.body?.subjectId === "string" ? req.body.subjectId.trim() : "";
  const subjectName = typeof req.body?.subjectName === "string" ? req.body.subjectName.trim() : "";
  const rawRegion = typeof req.body?.region === "string" ? req.body.region.trim() : "";
  const region: "north" | "south" | null =
    rawRegion === "north" ? "north" : rawRegion === "south" ? "south" : null;

  if (!PLAN_GEM_LIMITS[planType]) {
    res.status(400).json({ error: "نوع الباقة غير صحيح" });
    return;
  }
  if (!subjectId || subjectId === "all") {
    res.status(400).json({ error: "يجب تحديد subjectId — كل تخصص اشتراك مستقل." });
    return;
  }
  if (!region) {
    res.status(400).json({ error: "يجب تحديد المنطقة (north أو south) لضبط سقف تكلفة الذكاء الاصطناعي." });
    return;
  }

  // Derive the current admin-configured paid price for this plan/region so
  // the cost-cap system has correct enforcement thresholds even on
  // admin-granted subs. Falls back to the static constant on DB failure.
  const paidPriceYer = (await getPlanPriceFromDb(planType, region)) ?? 0;

  const adminNote = typeof req.body?.note === "string" ? req.body.note.trim() : "";
  const sub = await grantSubjectSubscription({
    userId: targetId,
    subjectId,
    subjectName: subjectName || null,
    planType,
    region,
    paidPriceYer,
    activationCode: null,
    subscriptionRequestId: null,
    source: "admin_grant",
    adminUserId: adminId,
    note: adminNote || null,
  });

  res.json({
    ok: true,
    subjectId: sub.subjectId,
    subjectName: sub.subjectName,
    plan: sub.plan,
    gemsGranted: sub.gemsBalance,
    expiresAt: sub.expiresAt,
  });
});

export default router;
