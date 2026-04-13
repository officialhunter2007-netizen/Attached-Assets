import { Router, type IRouter } from "express";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { db, supportMessagesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}
async function isAdmin(req: any): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.role === "admin";
}

const liveUsers = new Map<number, { name: string; email: string; page: string; profileImage: string | null; lastSeen: number }>();
const HEARTBEAT_TIMEOUT = 60000;

router.get("/support/my-messages", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const msgs = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.userId, userId))
    .orderBy(desc(supportMessagesTable.createdAt));

  res.json(msgs);
});

router.post("/support/send", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { subject, message, threadId } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "الموضوع والرسالة مطلوبان" });
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);

  const [msg] = await db.insert(supportMessagesTable).values({
    userId,
    userName: user?.displayName ?? null,
    userEmail: user?.email ?? null,
    subject: subject.trim(),
    message: message.trim(),
    isFromAdmin: false,
    isRead: false,
    threadId: threadId ?? null,
  }).returning();

  res.json(msg);
});

router.post("/support/mark-read", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await db.update(supportMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(supportMessagesTable.userId, userId),
      eq(supportMessagesTable.isFromAdmin, true),
      eq(supportMessagesTable.isRead, false),
    ));

  res.json({ success: true });
});

router.get("/support/unread-count", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportMessagesTable)
    .where(and(
      eq(supportMessagesTable.userId, userId),
      eq(supportMessagesTable.isFromAdmin, true),
      eq(supportMessagesTable.isRead, false),
    ));

  res.json({ count: result?.count ?? 0 });
});

router.get("/admin/support/threads", async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const allMessages = await db
    .select()
    .from(supportMessagesTable)
    .orderBy(desc(supportMessagesTable.createdAt));

  const threadMap = new Map<number, {
    userId: number;
    userName: string | null;
    userEmail: string | null;
    lastSubject: string;
    lastMessage: string;
    lastAt: string;
    unreadCount: number;
    totalMessages: number;
    messages: typeof allMessages;
  }>();

  for (const msg of allMessages) {
    if (!threadMap.has(msg.userId)) {
      threadMap.set(msg.userId, {
        userId: msg.userId,
        userName: msg.userName,
        userEmail: msg.userEmail,
        lastSubject: msg.subject,
        lastMessage: msg.message,
        lastAt: msg.createdAt?.toISOString() ?? "",
        unreadCount: 0,
        totalMessages: 0,
        messages: [],
      });
    }
    const thread = threadMap.get(msg.userId)!;
    thread.totalMessages++;
    if (!msg.isFromAdmin && !msg.isRead) thread.unreadCount++;
    thread.messages.push(msg);
  }

  const threads = Array.from(threadMap.values())
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  res.json(threads);
});

router.post("/admin/support/reply", async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const { userId, subject, message } = req.body;
  if (!userId || !message?.trim()) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const [msg] = await db.insert(supportMessagesTable).values({
    userId: Number(userId),
    userName: "المشرف",
    userEmail: "admin",
    subject: subject?.trim() || "رد من المشرف",
    message: message.trim(),
    isFromAdmin: true,
    isRead: false,
    threadId: null,
  }).returning();

  await db.update(supportMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(supportMessagesTable.userId, Number(userId)),
      eq(supportMessagesTable.isFromAdmin, false),
      eq(supportMessagesTable.isRead, false),
    ));

  res.json(msg);
});

router.get("/admin/support/unread-count", async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportMessagesTable)
    .where(and(
      eq(supportMessagesTable.isFromAdmin, false),
      eq(supportMessagesTable.isRead, false),
    ));

  res.json({ count: result?.count ?? 0 });
});

router.post("/heartbeat", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const { page } = req.body;
  const existing = liveUsers.get(userId);
  if (existing) {
    existing.page = page || "/";
    existing.lastSeen = Date.now();
  } else {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    liveUsers.set(userId, {
      name: user?.displayName || "",
      email: user?.email || "",
      page: page || "/",
      profileImage: user?.profileImage || null,
      lastSeen: Date.now(),
    });
  }
  res.json({ ok: true });
});

router.get("/admin/live-users", async (req, res) => {
  if (!(await isAdmin(req))) return res.status(403).json({ error: "Forbidden" });
  const now = Date.now();
  const active: any[] = [];
  for (const [uid, data] of liveUsers.entries()) {
    if (now - data.lastSeen < HEARTBEAT_TIMEOUT) {
      active.push({ userId: uid, ...data, secondsAgo: Math.floor((now - data.lastSeen) / 1000) });
    } else {
      liveUsers.delete(uid);
    }
  }
  active.sort((a, b) => a.secondsAgo - b.secondsAgo);
  res.json(active);
});

export default router;
