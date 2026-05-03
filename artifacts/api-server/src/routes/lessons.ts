import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, cachedLessonsTable, lessonViewsTable, usersTable, userProgressTable } from "@workspace/db";
import {
  GetCachedLessonQueryParams,
  SaveCachedLessonBody,
  RecordLessonViewBody,
  MarkChallengeAnsweredParams,
} from "@workspace/api-zod";
import { getAccessForUser } from "../lib/access";

function getYemenDateString(): string {
  const yemenOffsetMs = 3 * 60 * 60 * 1000;
  const yemenNow = new Date(Date.now() + yemenOffsetMs);
  return yemenNow.toISOString().split("T")[0];
}

function getYesterdayYemenString(): string {
  const yemenOffsetMs = 3 * 60 * 60 * 1000;
  const yemenNow = new Date(Date.now() + yemenOffsetMs - 24 * 60 * 60 * 1000);
  return yemenNow.toISOString().split("T")[0];
}

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUserWithAccess(userId: number, subjectId: string | null) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const access = await getAccessForUser({ userId, subjectId });
  const hasReferralAccess = (user.referralSessionsLeft ?? 0) > 0;
  // Lesson views/progress only need a subscription or first-lesson
  // grace — daily AI cap should not block them.
  const canAccess = access.hasActiveSub || access.isFirstLesson || hasReferralAccess;

  return {
    user,
    canAccess,
    isFirstLesson: access.isFirstLesson,
    hasSubscriptionAccess: access.hasActiveSub,
    hasReferralAccess,
  };
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

  const access = await getUserWithAccess(userId, parsed.data.subjectId);
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

  const [currentUser] = await db
    .select({ points: usersTable.points, streakDays: usersTable.streakDays, lastActive: usersTable.lastActive })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const today = getYemenDateString();
  const yesterday = getYesterdayYemenString();
  const lastActive = currentUser?.lastActive ?? null;
  let newStreak = currentUser?.streakDays ?? 0;

  if (lastActive === today) {
    // already tracked today — no streak change
  } else if (lastActive === yesterday) {
    newStreak = newStreak + 1;
  } else {
    newStreak = 1;
  }

  const updateFields: Record<string, any> = {
    points: (currentUser?.points ?? 0) + 15,
    streakDays: newStreak,
    lastActive: today,
  };
  if (access.isFirstLesson) {
    updateFields.firstLessonComplete = true;
  }
  await db.update(usersTable).set(updateFields).where(eq(usersTable.id, userId));

  // Auto-update subject progress in userProgressTable
  const [completedResult] = await db
    .select({ completedLessons: count() })
    .from(lessonViewsTable)
    .where(and(eq(lessonViewsTable.userId, userId), eq(lessonViewsTable.subjectId, parsed.data.subjectId)));

  const completedLessons = Number(completedResult?.completedLessons ?? 0);
  const section = parsed.data.subjectId.startsWith("skill-") ? "skills" : "university";

  const [existingProgress] = await db
    .select()
    .from(userProgressTable)
    .where(and(
      eq(userProgressTable.userId, userId),
      eq(userProgressTable.subjectOrSpecialization, parsed.data.subjectId)
    ));

  if (existingProgress) {
    await db
      .update(userProgressTable)
      .set({
        completedLessons,
        lastAccessedLesson: parsed.data.lessonId,
        lastAccessedUnit: parsed.data.unitId,
      })
      .where(eq(userProgressTable.id, existingProgress.id));
  } else {
    await db.insert(userProgressTable).values({
      userId,
      section,
      subjectOrSpecialization: parsed.data.subjectId,
      completedLessons,
      totalLessons: 0,
      masteryPercentage: 0,
      lastAccessedLesson: parsed.data.lessonId,
      lastAccessedUnit: parsed.data.unitId,
    });
  }

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
