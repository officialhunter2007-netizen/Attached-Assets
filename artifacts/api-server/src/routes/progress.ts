import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, userProgressTable, learningPathsTable } from "@workspace/db";
import { UpsertUserProgressBody, SaveLearningPathBody } from "@workspace/api-zod";
import { getAccessForUser } from "../lib/access";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/progress", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const progress = await db
    .select()
    .from(userProgressTable)
    .where(eq(userProgressTable.userId, userId));

  res.json(progress);
});

router.post("/progress", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpsertUserProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Use the per-subject access helper when we know the subject; this lets a
  // user who has an active per-subject sub for THIS subject save progress
  // even when their legacy global wallet is empty.
  const subjectId = parsed.data.subjectOrSpecialization || null;
  const access = await getAccessForUser({ userId, subjectId });
  if (!access.canAccess) {
    res.status(403).json({ error: "ACCESS_DENIED" });
    return;
  }

  const existing = await db
    .select()
    .from(userProgressTable)
    .where(
      and(
        eq(userProgressTable.userId, userId),
        eq(userProgressTable.subjectOrSpecialization, parsed.data.subjectOrSpecialization),
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(userProgressTable)
      .set(parsed.data)
      .where(eq(userProgressTable.id, existing[0].id))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db
    .insert(userProgressTable)
    .values({ userId, ...parsed.data })
    .returning();

  res.json(created);
});

router.get("/learning-paths", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const paths = await db
    .select()
    .from(learningPathsTable)
    .where(eq(learningPathsTable.userId, userId));

  res.json(paths);
});

router.post("/learning-paths", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SaveLearningPathBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Per-subject access check using the path's subject. We deliberately do
  // NOT fall back to userHasAnyAccess here: a learning path is bound to
  // ONE subject, so a user with active access to subject A must not be
  // able to create/update a learning path scoped to subject B.
  const access = await getAccessForUser({ userId, subjectId: parsed.data.subjectId });
  if (!access.canAccess) {
    res.status(403).json({ error: "ACCESS_DENIED" });
    return;
  }

  const existing = await db
    .select()
    .from(learningPathsTable)
    .where(
      and(
        eq(learningPathsTable.userId, userId),
        eq(learningPathsTable.subjectId, parsed.data.subjectId),
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(learningPathsTable)
      .set(parsed.data)
      .where(eq(learningPathsTable.id, existing[0].id))
      .returning();
    res.status(201).json(updated);
    return;
  }

  const [created] = await db
    .insert(learningPathsTable)
    .values({ userId, ...parsed.data })
    .returning();

  res.status(201).json(created);
});

router.get("/learning-paths/:subjectId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawId = Array.isArray(req.params.subjectId) ? req.params.subjectId[0] : req.params.subjectId;

  const [path] = await db
    .select()
    .from(learningPathsTable)
    .where(
      and(
        eq(learningPathsTable.userId, userId),
        eq(learningPathsTable.subjectId, rawId),
      )
    );

  if (!path) {
    res.status(404).json({ error: "Learning path not found" });
    return;
  }

  res.json(path);
});

export default router;
