import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  subscriptionRequestsTable,
  activationCardsTable,
  usersTable,
  userSubjectSubscriptionsTable,
  userSubjectFirstLessonsTable,
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

  const [request] = await db.insert(subscriptionRequestsTable).values({
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
  }).returning();

  res.status(201).json(request);
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

  const isFirstLesson = !firstLesson;

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
  const hasSubjectSub = !!(subjectSub && new Date(subjectSub.expiresAt) > now && subjectSub.messagesUsed < subjectSub.messagesLimit);

  const hasAccess = isFirstLesson || hasSubjectSub;

  let messagesRemaining: number | null = null;
  let expiresAt: string | null = null;
  let planType: string | null = null;

  if (hasSubjectSub && subjectSub) {
    messagesRemaining = subjectSub.messagesLimit - subjectSub.messagesUsed;
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

  const messagesLimit = PLAN_MESSAGE_LIMITS[card.planType] ?? 30;
  const subscriptionExpiresAt = card.expiresAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.update(activationCardsTable).set({
    isUsed: true,
    usedByUserId: userId,
    usedAt: new Date(),
  }).where(eq(activationCardsTable.id, card.id));

  await db.insert(userSubjectSubscriptionsTable).values({
    userId,
    subjectId: card.subjectId,
    subjectName: card.subjectName ?? null,
    plan: card.planType,
    messagesUsed: 0,
    messagesLimit,
    expiresAt: subscriptionExpiresAt,
    activationCode: code,
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

  const code = generateActivationCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const messagesLimit = PLAN_MESSAGE_LIMITS[request.planType] ?? 30;

  if (!request.subjectId || request.subjectId === "all") {
    res.status(400).json({ error: "طلب الاشتراك لا يحتوي على مادة محددة. يرجى رفضه وإنشاء طلب جديد بمادة محددة." });
    return;
  }

  const [card] = await db.insert(activationCardsTable).values({
    activationCode: code,
    planType: request.planType,
    region: request.region,
    subjectId: request.subjectId,
    subjectName: request.subjectName ?? null,
    isUsed: true,
    usedByUserId: request.userId,
    usedAt: new Date(),
    expiresAt,
    subscriptionRequestId: id,
  }).returning();

  await db.update(subscriptionRequestsTable).set({
    status: "approved",
    activationCode: code,
    adminNote: null,
  }).where(eq(subscriptionRequestsTable.id, id));

  await db.insert(userSubjectSubscriptionsTable).values({
    userId: request.userId,
    subjectId: request.subjectId,
    subjectName: request.subjectName ?? null,
    plan: request.planType,
    messagesUsed: 0,
    messagesLimit,
    expiresAt,
    activationCode: code,
    subscriptionRequestId: id,
  });

  res.json(card);
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

  res.json({ success: true });
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

  const { subjectId, subjectName, planType, daysValid = 14 } = req.body;
  if (!subjectId || !planType || !PLAN_MESSAGE_LIMITS[planType]) {
    res.status(400).json({ error: "subjectId and valid planType required" });
    return;
  }

  const messagesLimit = PLAN_MESSAGE_LIMITS[planType];
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  const [sub] = await db.insert(userSubjectSubscriptionsTable).values({
    userId: targetId,
    subjectId,
    subjectName: subjectName ?? null,
    plan: planType,
    messagesUsed: 0,
    messagesLimit,
    expiresAt,
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

  const { userId, subjectId, subjectName, plan, daysValid = 14 } = req.body;
  if (!userId || !subjectId || !plan || !PLAN_MESSAGE_LIMITS[plan]) {
    res.status(400).json({ error: "userId, subjectId, and valid plan required" });
    return;
  }

  const messagesLimit = PLAN_MESSAGE_LIMITS[plan];
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  const [sub] = await db.insert(userSubjectSubscriptionsTable).values({
    userId,
    subjectId,
    subjectName: subjectName ?? null,
    plan,
    messagesUsed: 0,
    messagesLimit,
    expiresAt,
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

export default router;
