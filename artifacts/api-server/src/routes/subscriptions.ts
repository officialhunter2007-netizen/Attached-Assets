import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, subscriptionRequestsTable, activationCardsTable, usersTable, referralsTable } from "@workspace/db";
import {
  CreateSubscriptionRequestBody,
  ActivateSubscriptionBody,
  GetAdminSubscriptionRequestsQueryParams,
  ApproveSubscriptionRequestParams,
  RejectSubscriptionRequestParams,
} from "@workspace/api-zod";
import { generateActivationCode } from "../lib/auth";

const router: IRouter = Router();

const PLAN_MESSAGE_LIMITS: Record<string, number> = {
  bronze: 30,
  silver: 60,
  gold: 100,
};

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

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

  const user = await getUser(userId);

  const [request] = await db.insert(subscriptionRequestsTable).values({
    userId,
    userEmail: user?.email ?? "",
    userName: user?.displayName ?? null,
    transactionId: parsed.data.transactionId,
    planType: parsed.data.planType,
    region: parsed.data.region,
    notes: parsed.data.notes ?? null,
    status: "pending",
  }).returning();

  res.status(201).json(request);
});

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

  const messagesLimit = PLAN_MESSAGE_LIMITS[card.planType] ?? 30;
  const subscriptionExpiresAt = card.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.update(activationCardsTable).set({
    isUsed: true,
    usedByUserId: userId,
    usedAt: new Date(),
  }).where(eq(activationCardsTable.id, card.id));

  await db.update(usersTable).set({
    nukhbaPlan: card.planType,
    messagesLimit,
    messagesUsed: 0,
    subscriptionExpiresAt,
  }).where(eq(usersTable.id, userId));

  res.json({
    success: true,
    planType: card.planType,
    message: `تم تفعيل اشتراك ${card.planType} بنجاح!`,
  });
});

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
  let query = db.select().from(subscriptionRequestsTable);

  if (params.success && params.data.status) {
    const requests = await db
      .select()
      .from(subscriptionRequestsTable)
      .where(eq(subscriptionRequestsTable.status, params.data.status));
    res.json(requests);
    return;
  }

  const requests = await query;
  res.json(requests);
});

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

  const code = generateActivationCode();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const messagesLimit = PLAN_MESSAGE_LIMITS[request.planType] ?? 30;

  const [card] = await db.insert(activationCardsTable).values({
    activationCode: code,
    planType: request.planType,
    region: request.region,
    isUsed: true,
    usedByUserId: request.userId,
    usedAt: new Date(),
    expiresAt,
    subscriptionRequestId: id,
  }).returning();

  await db.update(subscriptionRequestsTable).set({
    status: "approved",
    activationCode: code,
  }).where(eq(subscriptionRequestsTable.id, id));

  await db.update(usersTable).set({
    nukhbaPlan: request.planType,
    messagesLimit,
    messagesUsed: 0,
    subscriptionExpiresAt: expiresAt,
  }).where(eq(usersTable.id, request.userId));

  res.json(card);
});

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

  const cards = await db.select().from(activationCardsTable);
  res.json(cards);
});

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
  const activeSubscriptions = allRequests.filter(r => r.status === "approved").length;
  const cards = await db.select().from(activationCardsTable);
  const users = await db.select().from(usersTable);

  res.json({
    pendingRequests,
    activeSubscriptions,
    totalCards: cards.length,
    totalUsers: users.length,
  });
});

router.get("/referrals/info", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, userId));

  res.json({
    referralCode: user.referralCode ?? "",
    referralCount: referrals.length,
    referralGoal: 5,
    hasReferralAccess: user.referralAccessUntil ? new Date(user.referralAccessUntil) > new Date() : false,
    referralAccessUntil: user.referralAccessUntil,
  });
});

router.post("/referrals/register", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { referralCode } = req.body;
  if (!referralCode) {
    res.status(400).json({ error: "Referral code required" });
    return;
  }

  const [referrer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referralCode, referralCode.toUpperCase()));

  if (!referrer) {
    res.status(404).json({ error: "Referral code not found" });
    return;
  }

  if (referrer.id === userId) {
    res.status(400).json({ error: "Cannot refer yourself" });
    return;
  }

  const existing = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, userId));

  if (existing.length > 0) {
    res.json({ success: true });
    return;
  }

  await db.insert(referralsTable).values({
    referrerUserId: referrer.id,
    referredUserId: userId,
    referralCode: referralCode.toUpperCase(),
  });

  const referrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, referrer.id));

  if (referrals.length >= 5) {
    const accessUntil = new Date();
    accessUntil.setDate(accessUntil.getDate() + 3);
    await db.update(usersTable)
      .set({ referralAccessUntil: accessUntil })
      .where(eq(usersTable.id, referrer.id));
  }

  res.json({ success: true });
});

export default router;
