import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, userSubjectPlansTable, lessonSummariesTable } from "@workspace/db";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/user-plan", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId } = req.query as { subjectId?: string };
  if (!subjectId) {
    res.status(400).json({ error: "subjectId required" });
    return;
  }

  const [plan] = await db
    .select()
    .from(userSubjectPlansTable)
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId)
    ));

  const recentSummaries = await db
    .select()
    .from(lessonSummariesTable)
    .where(and(
      eq(lessonSummariesTable.userId, userId),
      eq(lessonSummariesTable.subjectId, subjectId)
    ))
    .orderBy(desc(lessonSummariesTable.conversationDate))
    .limit(2);

  res.json({
    plan: plan ?? null,
    recentSummaries,
  });
});

router.post("/user-plan", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, planHtml, currentStageIndex } = req.body;
  if (!subjectId || !planHtml) {
    res.status(400).json({ error: "subjectId and planHtml required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userSubjectPlansTable)
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId)
    ));

  if (existing) {
    await db
      .update(userSubjectPlansTable)
      .set({
        planHtml,
        currentStageIndex: currentStageIndex ?? existing.currentStageIndex,
        updatedAt: new Date(),
      })
      .where(eq(userSubjectPlansTable.id, existing.id));
  } else {
    await db.insert(userSubjectPlansTable).values({
      userId,
      subjectId,
      planHtml,
      currentStageIndex: currentStageIndex ?? 0,
      updatedAt: new Date(),
    });
  }

  res.json({ ok: true });
});

router.patch("/user-plan/stage", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, currentStageIndex } = req.body;
  if (!subjectId || currentStageIndex === undefined) {
    res.status(400).json({ error: "subjectId and currentStageIndex required" });
    return;
  }

  await db
    .update(userSubjectPlansTable)
    .set({ currentStageIndex, updatedAt: new Date() })
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId)
    ));

  res.json({ ok: true });
});

export default router;
