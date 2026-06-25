import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
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
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const msgs = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.userId, userId))
      .orderBy(desc(supportMessagesTable.createdAt));
    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: "تعذّر تحميل الرسائل" });
  }
});

router.post("/support/send", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subject, message, threadId } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "الموضوع والرسالة مطلوبان" }); return;
  }

  try {
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
  } catch (err: any) {
    res.status(500).json({ error: "تعذّر إرسال الرسالة، يرجى المحاولة مجدداً" });
  }
});

router.post("/support/mark-read", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    await db.update(supportMessagesTable)
      .set({ isRead: true })
      .where(and(
        eq(supportMessagesTable.userId, userId),
        eq(supportMessagesTable.isFromAdmin, true),
        eq(supportMessagesTable.isRead, false),
      ));
  } catch {}

  res.json({ success: true });
});

router.get("/support/unread-count", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportMessagesTable)
      .where(and(
        eq(supportMessagesTable.userId, userId),
        eq(supportMessagesTable.isFromAdmin, true),
        eq(supportMessagesTable.isRead, false),
      ));
    res.json({ count: result?.count ?? 0 });
  } catch {
    res.json({ count: 0 });
  }
});

router.get("/admin/support/threads", async (req, res) => {
  if (!(await isAdmin(req))) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
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
  } catch (err: any) {
    res.status(500).json({ error: "تعذّر تحميل المحادثات" });
  }
});

router.post("/admin/support/reply", async (req, res) => {
  if (!(await isAdmin(req))) { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId, subject, message } = req.body;
  if (!userId || !message?.trim()) {
    res.status(400).json({ error: "Missing fields" }); return;
  }

  try {
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
  } catch (err: any) {
    res.status(500).json({ error: "تعذّر إرسال الرد" });
  }
});

router.get("/admin/support/unread-count", async (req, res) => {
  if (!(await isAdmin(req))) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportMessagesTable)
      .where(and(
        eq(supportMessagesTable.isFromAdmin, false),
        eq(supportMessagesTable.isRead, false),
      ));
    res.json({ count: result?.count ?? 0 });
  } catch {
    res.json({ count: 0 });
  }
});

router.post("/heartbeat", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { page } = req.body;
  try {
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
  } catch {}
  res.json({ ok: true });
});

router.get("/admin/live-users", async (req, res) => {
  if (!(await isAdmin(req))) { res.status(403).json({ error: "Forbidden" }); return; }
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
