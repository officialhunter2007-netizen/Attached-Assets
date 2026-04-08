import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cachedLessonsTable, lessonViewsTable, usersTable } from "@workspace/db";
import {
  GetCachedLessonQueryParams,
  SaveCachedLessonBody,
  RecordLessonViewBody,
  MarkChallengeAnsweredParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUserWithAccess(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const hasSubscriptionAccess = !!user.nukhbaPlan &&
    !!user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date() &&
    (user.messagesUsed ?? 0) < (user.messagesLimit ?? 0);

  const hasReferralAccess = !!user.referralAccessUntil &&
    new Date(user.referralAccessUntil) > new Date();

  const isFirstLesson = !user.firstLessonComplete;
  const canAccess = isFirstLesson || hasSubscriptionAccess || hasReferralAccess;

  return { user, canAccess, isFirstLesson, hasSubscriptionAccess, hasReferralAccess };
}

router.get("/lessons/cached", async (req, res): Promise<void> => {
  const params = GetCachedLessonQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lesson] = await db
    .select()
    .from(cachedLessonsTable)
    .where(eq(cachedLessonsTable.lessonKey, params.data.lesson_key));

  if (!lesson) {
    res.status(404).json({ error: "Lesson not found in cache" });
    return;
  }

  await db
    .update(cachedLessonsTable)
    .set({ viewCount: lesson.viewCount + 1 })
    .where(eq(cachedLessonsTable.id, lesson.id));

  res.json({ ...lesson, viewCount: lesson.viewCount + 1 });
});

router.post("/lessons/cached/save", async (req, res): Promise<void> => {
  const parsed = SaveCachedLessonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(cachedLessonsTable)
    .where(eq(cachedLessonsTable.lessonKey, parsed.data.lessonKey));

  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const [saved] = await db.insert(cachedLessonsTable).values(parsed.data).returning();
  res.status(201).json(saved);
});

router.get("/lessons/views", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const views = await db
    .select()
    .from(lessonViewsTable)
    .where(eq(lessonViewsTable.userId, userId))
    .orderBy(lessonViewsTable.viewedAt);

  res.json(views);
});

router.post("/lessons/views", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RecordLessonViewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(lessonViewsTable)
    .where(
      and(
        eq(lessonViewsTable.userId, userId),
        eq(lessonViewsTable.subjectId, parsed.data.subjectId),
        eq(lessonViewsTable.unitId, parsed.data.unitId),
        eq(lessonViewsTable.lessonId, parsed.data.lessonId),
      )
    );

  if (existing.length > 0) {
    res.status(201).json(existing[0]);
    return;
  }

  const access = await getUserWithAccess(userId);
  if (!access || !access.canAccess) {
    res.status(403).json({ error: "ACCESS_DENIED" });
    return;
  }

  const [view] = await db.insert(lessonViewsTable).values({
    userId,
    ...parsed.data,
    pointsEarned: 15,
    challengeAnswered: false,
  }).returning();

  await db
    .update(usersTable)
    .set({ points: (await db.select({ p: usersTable.points }).from(usersTable).where(eq(usersTable.id, userId)))[0]?.p + 15 ?? 15 })
    .where(eq(usersTable.id, userId));

  res.status(201).json(view);
});

router.patch("/lessons/views/:id/challenge", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [view] = await db
    .select()
    .from(lessonViewsTable)
    .where(and(eq(lessonViewsTable.id, id), eq(lessonViewsTable.userId, userId)));

  if (!view) {
    res.status(404).json({ error: "View not found" });
    return;
  }

  if (view.challengeAnswered) {
    res.json(view);
    return;
  }

  const [updated] = await db
    .update(lessonViewsTable)
    .set({ challengeAnswered: true })
    .where(eq(lessonViewsTable.id, id))
    .returning();

  const [user] = await db.select({ p: usersTable.points }).from(usersTable).where(eq(usersTable.id, userId));
  await db
    .update(usersTable)
    .set({ points: (user?.p ?? 0) + 25 })
    .where(eq(usersTable.id, userId));

  res.json(updated);
});

export default router;
