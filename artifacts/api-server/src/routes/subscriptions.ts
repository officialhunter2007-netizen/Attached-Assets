import { Router, type IRouter } from "express";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import {
  db,
  subscriptionRequestsTable,
  activationCardsTable,
  usersTable,
  userSubjectSubscriptionsTable,
  userSubjectFirstLessonsTable,
  discountCodesTable,
  planPricesTable,
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
      if (Number.isFinite(row.priceYer) && row.priceYer >= 0) {
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
async function grantSubjectSubscription(opts: {
  userId: number;
  subjectId: string;
  subjectName: string | null;
  planType: string;
  region: string | null;
  paidPriceYer: number;
  activationCode: string | null;
  subscriptionRequestId: number | null;
}): Promise<typeof userSubjectSubscriptionsTable.$inferSelect> {
  const planGems = PLAN_GEM_LIMITS[opts.planType];
  if (!planGems) throw new Error(`Unknown plan type: ${opts.planType}`);

  const expiresAt = new Date(Date.now() + SUB_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const yemenDate = getYemenDateLabel();

  return await db.transaction(async (tx) => {
    // Drop any prior row for this (userId, subjectId) — the new payment buys
    // a fresh 14-day window and gem wallet for that subject.
    await tx.delete(userSubjectSubscriptionsTable).where(and(
      eq(userSubjectSubscriptionsTable.userId, opts.userId),
      eq(userSubjectSubscriptionsTable.subjectId, opts.subjectId),
    ));

    const [row] = await tx.insert(userSubjectSubscriptionsTable).values({
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

    return row;
  });
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
        const [row] = await tx
          .select()
          .from(discountCodesTable)
          .where(eq(discountCodesTable.code, codeNorm));
        if (!row) throw new Error("INVALID_CODE");
        if (!row.active) throw new Error("INACTIVE_CODE");
        discountCodeRow = row;
        percent = row.percent;
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

  const [row] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, code));
  if (!row) {
    res.json({ valid: false, message: "كود الخصم غير موجود" });
    return;
  }
  if (!row.active) {
    res.json({ valid: false, message: "كود الخصم متوقف حالياً" });
    return;
  }

  const finalPrice = computeFinalPrice(basePrice, row.percent);
  res.json({
    valid: true,
    code: row.code,
    percent: row.percent,
    basePrice,
    finalPrice,
    discountAmount: basePrice - finalPrice,
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

  res.json(subs);
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

  // Per-subject first lesson
  const [firstLesson] = await db
    .select()
    .from(userSubjectFirstLessonsTable)
    .where(and(
      eq(userSubjectFirstLessonsTable.userId, userId),
      eq(userSubjectFirstLessonsTable.subjectId, subjectId)
    ));

  const isFirstLesson = !firstLesson || (!firstLesson.completed && firstLesson.freeMessagesUsed < 15);

  // Per-subject subscription
  const [subjectSub] = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(and(
      eq(userSubjectSubscriptionsTable.userId, userId),
      eq(userSubjectSubscriptionsTable.subjectId, subjectId)
    ))
    .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

  const now = new Date();
  // messagesLimit is now a *daily* cap that resets when the user claims a new
  // daily session. If the user hasn't claimed a session today (lastSessionDate
  // != today in Yemen TZ), then the persisted messagesUsed is from a previous
  // day and will be reset on the next /ai/teach call, so we should treat their
  // effective remaining-for-today as the full limit.
  const todayYemen = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const isStaleCounter = (user.lastSessionDate ?? null) !== todayYemen;
  const effectiveMessagesUsed = subjectSub
    ? (isStaleCounter ? 0 : subjectSub.messagesUsed)
    : 0;
  const hasSubjectSub = !!(subjectSub && new Date(subjectSub.expiresAt) > now && effectiveMessagesUsed < subjectSub.messagesLimit);

  const hasAccess = isFirstLesson || hasSubjectSub;

  let messagesRemaining: number | null = null;
  let expiresAt: string | null = null;
  let planType: string | null = null;

  if (hasSubjectSub && subjectSub) {
    messagesRemaining = subjectSub.messagesLimit - effectiveMessagesUsed;
    expiresAt = subjectSub.expiresAt.toISOString();
    planType = subjectSub.plan;
  }

  res.json({
    hasAccess,
    isFirstLesson,
    hasSubjectSubscription: hasSubjectSub,
    hasLegacyGlobalSubscription: false,
    messagesRemaining,
    expiresAt,
    planType,
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
  try {
    const card = await db.transaction(async (tx) => {
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
      // atomically here (only after the request is officially approved).
      if (request.discountCodeId) {
        await tx
          .update(discountCodesTable)
          .set({ usageCount: sql`${discountCodesTable.usageCount} + 1` })
          .where(eq(discountCodesTable.id, request.discountCodeId));
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

      // Per-subject grant — wipes any prior wallet for this (user, subject)
      // so a re-approved subject starts fresh for the new 14-day window.
      await tx.delete(userSubjectSubscriptionsTable).where(and(
        eq(userSubjectSubscriptionsTable.userId, request.userId),
        eq(userSubjectSubscriptionsTable.subjectId, requestSubjectId),
      ));

      const yemenDate = getYemenDateLabel();
      await tx.insert(userSubjectSubscriptionsTable).values({
        userId: request.userId,
        subjectId: requestSubjectId,
        subjectName: request.subjectName ?? null,
        plan: request.planType,
        messagesUsed: 0,
        messagesLimit: planGems.total,
        expiresAt,
        activationCode: code,
        subscriptionRequestId: id,
        paidPriceYer: request.finalPrice ?? 0,
        region: request.region,
        gemsBalance: planGems.total,
        gemsDailyLimit: planGems.daily,
        gemsUsedToday: 0,
        gemsResetDate: yemenDate,
      });

      return insertedCard;
    });

    res.json(card);
  } catch (e: any) {
    if (e?.message === "ALREADY_PROCESSED") {
      res.status(409).json({ error: "تمت معالجة هذا الطلب بالفعل" });
      return;
    }
    throw e;
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
    const activeSubjectSubs = userSubjectSubs.filter(s => new Date(s.expiresAt) > now && s.messagesUsed < s.messagesLimit);

    const totalMessagesUsed = userSubjectSubs.reduce((sum, s) => sum + s.messagesUsed, 0);
    const totalMessagesLimit = userSubjectSubs.reduce((sum, s) => sum + s.messagesLimit, 0);
    const messagesLeft = activeSubjectSubs.reduce((sum, s) => sum + (s.messagesLimit - s.messagesUsed), 0);

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
      messagesUsed: totalMessagesUsed,
      messagesLimit: totalMessagesLimit,
      messagesLeft,
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

  await db.delete(userSubjectSubscriptionsTable).where(eq(userSubjectSubscriptionsTable.id, subId));
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
router.delete("/admin/revoke-subject-subscription/:subId", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const subId = parseInt(req.params.subId, 10);
  if (isNaN(subId)) { res.status(400).json({ error: "Invalid subscription id" }); return; }

  await db.delete(userSubjectSubscriptionsTable).where(eq(userSubjectSubscriptionsTable.id, subId));
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
  const result = subs.map(s => {
    const u = userMap[s.userId];
    const isExpired = new Date(s.expiresAt) < now;
    const isExhausted = s.messagesUsed >= s.messagesLimit;
    const status = isExpired ? "expired" : isExhausted ? "exhausted" : "active";
    return {
      ...s,
      userEmail: u?.email ?? "",
      userName: u?.displayName ?? null,
      status,
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

  res.json({ success: true, subscription: updated });
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

  const [existing] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, code));
  if (existing) { res.status(409).json({ error: "هذا الكود موجود مسبقاً" }); return; }

  const [row] = await db.insert(discountCodesTable).values({
    code,
    percent: percentRaw,
    note: note || null,
    active: true,
    usageCount: 0,
    createdByUserId: adminId,
  }).returning();

  res.status(201).json(row);
});

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
// Takes ?subjectId=X — gem wallets are per-subject. If a subject has an active
// per-subject subscription, we report that wallet. Otherwise we fall back to
// the legacy global wallet on usersTable (for grandfathered users from before
// the per-subject pivot) so they don't lose access mid-period.
router.get("/subscriptions/gems-balance", async (req, res): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getUser(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
    const now = new Date();

    if (subjectId) {
      const [sub] = await db
        .select()
        .from(userSubjectSubscriptionsTable)
        .where(and(
          eq(userSubjectSubscriptionsTable.userId, userId),
          eq(userSubjectSubscriptionsTable.subjectId, subjectId),
        ))
        .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

      if (sub && new Date(sub.expiresAt) > now) {
        await applyDailyGemsRolloverForSubjectSub(sub).catch(() => {});
        const usedToday = sub.gemsUsedToday ?? 0;
        const dailyRemaining = Math.max(0, (sub.gemsDailyLimit ?? 0) - usedToday);
        // ── API contract ────────────────────────────────────────────────
        // hasActiveSub  = subscription window is open (time-active). The
        //                 header badge uses this so it can stay visible
        //                 (in alert mode) when the student has burned
        //                 through their gems and needs to renew.
        // canUseGems    = the user can actually spend gems right now
        //                 (time-active AND balance > 0). Use this for any
        //                 access/permission gating.
        // AI gating itself does NOT depend on either flag — it re-checks
        // expiry+balance at the call site (see ai.ts).
        const canUseGems = (sub.gemsBalance ?? 0) > 0;
        res.json({
          subjectId,
          subjectName: sub.subjectName ?? null,
          gemsBalance: sub.gemsBalance ?? 0,
          gemsDailyLimit: sub.gemsDailyLimit ?? 0,
          gemsUsedToday: usedToday,
          dailyRemaining,
          gemsExpiresAt: sub.expiresAt,
          hasActiveSub: true,
          canUseGems,
          plan: sub.plan,
          source: "per-subject" as const,
        });
        return;
      }
    }

    // Legacy fallback: pre-pivot users still have a global wallet.
    await applyDailyGemsRollover(user).catch(() => {});
    // Legacy wallet is considered active whenever it has a future expiry,
    // regardless of remaining balance (mirrors the per-subject behaviour).
    const hasLegacyActive = !!(user.gemsExpiresAt && new Date(user.gemsExpiresAt) > now);
    const usedToday = user.gemsUsedToday ?? 0;
    const dailyRemaining = Math.max(0, (user.gemsDailyLimit ?? 0) - usedToday);
    const legacyCanUseGems = hasLegacyActive && (user.gemsBalance ?? 0) > 0;

    res.json({
      subjectId: subjectId || null,
      subjectName: null,
      gemsBalance: hasLegacyActive ? (user.gemsBalance ?? 0) : 0,
      gemsDailyLimit: hasLegacyActive ? (user.gemsDailyLimit ?? 0) : 0,
      gemsUsedToday: hasLegacyActive ? usedToday : 0,
      dailyRemaining: hasLegacyActive ? dailyRemaining : 0,
      gemsExpiresAt: hasLegacyActive ? user.gemsExpiresAt : null,
      hasActiveSub: hasLegacyActive,
      canUseGems: legacyCanUseGems,
      plan: hasLegacyActive ? (user.nukhbaPlan ?? null) : null,
      source: hasLegacyActive ? ("legacy" as const) : ("none" as const),
    });
  } catch (err) {
    console.error("[gems-balance] failed:", err);
    // Defensive fallback so the polling header endpoint never spams the
    // client with 500s. Server-side error is still logged above.
    res.json({
      subjectId: null,
      subjectName: null,
      gemsBalance: 0,
      gemsDailyLimit: 0,
      gemsUsedToday: 0,
      dailyRemaining: 0,
      gemsExpiresAt: null,
      hasActiveSub: false,
      canUseGems: false,
      plan: null,
      source: "none" as const,
    });
  }
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
      await applyDailyGemsRolloverForSubjectSub(sub).catch(() => {});
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
        subjects: activeSubs,
        source: "per-subject" as const,
      });
      return;
    }

    // Fallback: legacy global wallet — also keep visible while time-active,
    // even if the balance is zero, so the user knows they've run out.
    await applyDailyGemsRollover(user).catch(() => {});
    const hasLegacyActive = !!(user.gemsExpiresAt && new Date(user.gemsExpiresAt) > now);
    if (hasLegacyActive) {
      const usedLeg = user.gemsUsedToday ?? 0;
      const limitLeg = user.gemsDailyLimit ?? 0;
      const remaining = Math.max(0, limitLeg - usedLeg);
      const legacyBalance = user.gemsBalance ?? 0;
      res.json({
        hasActiveSub: true,
        canUseGems: legacyBalance > 0,
        totalDailyRemaining: remaining,
        totalDailyLimit: limitLeg,
        totalBalance: legacyBalance,
        activeSubjectCount: 1,
        worstSubject: null,
        subjects: [],
        source: "legacy" as const,
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

  const sub = await grantSubjectSubscription({
    userId: targetId,
    subjectId,
    subjectName: subjectName || null,
    planType,
    region,
    paidPriceYer,
    activationCode: null,
    subscriptionRequestId: null,
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
