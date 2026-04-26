import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  subscriptionRequestsTable,
  activationCardsTable,
  usersTable,
  userSubjectSubscriptionsTable,
  userSubjectFirstLessonsTable,
  discountCodesTable,
} from "@workspace/db";
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

const router: IRouter = Router();

const PLAN_MESSAGE_LIMITS: Record<string, number> = {
  bronze: 20,
  silver: 40,
  gold: 70,
};

// Authoritative price table (server-side source of truth).
const BASE_PRICES: Record<"north" | "south", Record<string, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 3000, silver: 6000, gold: 9000 },
};

function getBasePrice(planType: string, region: string): number | null {
  const r = BASE_PRICES[region as "north" | "south"];
  if (!r) return null;
  return r[planType] ?? null;
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

  const subjectId: string = (req.body.subjectId ?? "").toString().trim();
  const subjectName: string | undefined = req.body.subjectName;

  if (!subjectId || subjectId === "all") {
    res.status(400).json({ error: "يجب تحديد المادة أو التخصص. اختر مادةً محددة قبل إرسال طلب الاشتراك." });
    return;
  }

  const user = await getUser(userId);

  const basePrice = getBasePrice(parsed.data.planType, parsed.data.region);
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

  try {
    const created = await db.transaction(async (tx) => {
      let discountCodeRow: typeof discountCodesTable.$inferSelect | null = null;
      if (codeNorm) {
        // Validate code exists and is active. We snapshot the percent on the
        // request, but we do NOT increment usageCount here — the counter
        // tracks *approved* subscriptions (real marketer attribution), so it
        // is incremented in the approval transaction below.
        const [row] = await tx
          .select()
          .from(discountCodesTable)
          .where(eq(discountCodesTable.code, codeNorm));
        if (!row) {
          throw new Error("INVALID_CODE");
        }
        if (!row.active) {
          throw new Error("INACTIVE_CODE");
        }
        discountCodeRow = row;
      }

      const percent = discountCodeRow?.percent ?? 0;
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
        discountCode: discountCodeRow?.code ?? null,
        discountPercent: discountCodeRow ? percent : null,
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

  const basePrice = getBasePrice(planType, region);
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

  if (!card.subjectId) {
    res.status(400).json({ success: false, message: "هذا الكود قديم ولا يحتوي على مادة محددة. يرجى استخدام كود جديد." });
    return;
  }

  const messagesLimit = PLAN_MESSAGE_LIMITS[card.planType];
  if (!messagesLimit) {
    res.status(400).json({ success: false, message: `نوع الباقة غير معروف: ${card.planType}` });
    return;
  }
  const subscriptionExpiresAt = card.expiresAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.update(activationCardsTable).set({
    isUsed: true,
    usedByUserId: userId,
    usedAt: new Date(),
  }).where(eq(activationCardsTable.id, card.id));

  // Capture region + price-paid on the subscription so the cost-cap enforcer
  // (50%-of-paid red line) can compute the per-subscription budget without a
  // join to the activation card.
  const cardRegion = card.region ?? "south";
  const cardBasePrice = getBasePrice(card.planType, cardRegion) ?? 0;
  await db.insert(userSubjectSubscriptionsTable).values({
    userId,
    subjectId: card.subjectId,
    subjectName: card.subjectName ?? null,
    plan: card.planType,
    messagesUsed: 0,
    messagesLimit,
    expiresAt: subscriptionExpiresAt,
    activationCode: code,
    paidPriceYer: cardBasePrice,
    region: cardRegion,
  });

  res.json({
    success: true,
    planType: card.planType,
    subjectId: card.subjectId,
    message: `تم تفعيل اشتراك ${card.planType} لمادة ${card.subjectName ?? card.subjectId} بنجاح!`,
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

  if (!request.subjectId || request.subjectId === "all") {
    res.status(400).json({ error: "طلب الاشتراك لا يحتوي على مادة محددة. يرجى رفضه وإنشاء طلب جديد بمادة محددة." });
    return;
  }

  const code = generateActivationCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const messagesLimit = PLAN_MESSAGE_LIMITS[request.planType];
  if (!messagesLimit) {
    res.status(400).json({ error: `نوع الباقة غير معروف في الطلب: ${request.planType}` });
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
        subjectId: request.subjectId!,
        subjectName: request.subjectName ?? null,
        isUsed: true,
        usedByUserId: request.userId,
        usedAt: new Date(),
        expiresAt,
        subscriptionRequestId: id,
      }).returning();

      // Persist the price the student actually paid (after any discount) on
      // the subscription so the cost-cap enforcer treats real revenue, not
      // the list price.
      const paidYer = request.finalPrice ?? request.basePrice ?? getBasePrice(request.planType, request.region) ?? 0;
      await tx.insert(userSubjectSubscriptionsTable).values({
        userId: request.userId,
        subjectId: request.subjectId!,
        subjectName: request.subjectName ?? null,
        plan: request.planType,
        messagesUsed: 0,
        messagesLimit,
        expiresAt,
        activationCode: code,
        subscriptionRequestId: id,
        paidPriceYer: paidYer,
        region: request.region,
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

  const { planType, subjectId, subjectName } = req.body;
  if (!planType || !PLAN_MESSAGE_LIMITS[planType]) {
    res.status(400).json({ error: "Invalid plan type" });
    return;
  }

  const cleanSubjectId = (subjectId ?? "").toString().trim();
  if (!cleanSubjectId || cleanSubjectId === "all") {
    res.status(400).json({ error: "يجب تحديد المادة أو التخصص لإنشاء بطاقة التفعيل." });
    return;
  }

  const code = generateActivationCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const [card] = await db.insert(activationCardsTable).values({
    activationCode: code,
    planType,
    subjectId: cleanSubjectId,
    subjectName: subjectName ?? null,
    isUsed: false,
    expiresAt,
  }).returning();

  res.json(card);
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

// ── Admin: grant subject subscription directly ─────────────────────────────────
router.post("/admin/users/:id/grant-subject-subscription", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { subjectId, subjectName, planType, daysValid = 14, region: bodyRegion } = req.body;
  if (!subjectId || !planType || !PLAN_MESSAGE_LIMITS[planType]) {
    res.status(400).json({ error: "subjectId and valid planType required" });
    return;
  }

  const messagesLimit = PLAN_MESSAGE_LIMITS[planType];
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
  // Admin-grant path: assume south region (more conservative cap) when the
  // admin doesn't explicitly pass one. Price defaults to the list price for
  // that region so the cost cap still applies — admins shouldn't be able to
  // accidentally create a "free" sub that bypasses the 50%-of-paid rule.
  const region = bodyRegion === "north" || bodyRegion === "south" ? bodyRegion : "south";
  const paidYer = getBasePrice(planType, region) ?? 0;

  const [sub] = await db.insert(userSubjectSubscriptionsTable).values({
    userId: targetId,
    subjectId,
    subjectName: subjectName ?? null,
    plan: planType,
    messagesUsed: 0,
    messagesLimit,
    expiresAt,
    paidPriceYer: paidYer,
    region,
  }).returning();

  res.json({ success: true, subscription: sub });
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

// ── Admin: grant subject subscription (simplified path) ───────────────────────
router.post("/admin/grant-subject-subscription", async (req, res): Promise<void> => {
  const adminId = getUserId(req);
  if (!adminId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admin = await getUser(adminId);
  if (admin?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId, subjectId, subjectName, plan, daysValid = 14, region: bodyRegion } = req.body;
  if (!userId || !subjectId || !plan || !PLAN_MESSAGE_LIMITS[plan]) {
    res.status(400).json({ error: "userId, subjectId, and valid plan required" });
    return;
  }

  const messagesLimit = PLAN_MESSAGE_LIMITS[plan];
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
  // Same logic as the per-user grant route — default to south region with the
  // matching list price so the cost-cap rule remains enforceable.
  const region = bodyRegion === "north" || bodyRegion === "south" ? bodyRegion : "south";
  const paidYer = getBasePrice(plan, region) ?? 0;

  const [sub] = await db.insert(userSubjectSubscriptionsTable).values({
    userId,
    subjectId,
    subjectName: subjectName ?? null,
    plan,
    messagesUsed: 0,
    messagesLimit,
    expiresAt,
    paidPriceYer: paidYer,
    region,
  }).returning();

  res.json({ success: true, subscription: sub });
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

export default router;
