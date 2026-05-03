import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  userSubjectPlansTable,
  lessonSummariesTable,
  aiTeacherMessagesTable,
} from "@workspace/db";
import {
  validatePlanQuality,
  checkDiagnosticOverlap,
  extractClassedTextContent,
  getStageItems,
} from "../lib/plan-quality.js";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/user-plan", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subjectId } = req.query as { subjectId?: string };
  if (!subjectId) { res.status(400).json({ error: "subjectId required" }); return; }

  const [plan] = await db
    .select()
    .from(userSubjectPlansTable)
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId),
    ));

  const recentSummaries = await db
    .select()
    .from(lessonSummariesTable)
    .where(and(
      eq(lessonSummariesTable.userId, userId),
      eq(lessonSummariesTable.subjectId, subjectId),
    ))
    .orderBy(desc(lessonSummariesTable.conversationDate))
    .limit(2);

  if (!plan) {
    res.json({ plan: null, recentSummaries });
    return;
  }

  let completedMicroSteps: number[] = [];
  try { completedMicroSteps = JSON.parse(plan.completedMicroSteps ?? "[]"); } catch {}

  let growthReflections: Array<{ stageIndex: number; text: string; date: string }> = [];
  try { growthReflections = JSON.parse(plan.growthReflections ?? "[]"); } catch {}

  res.json({ plan: { ...plan, completedMicroSteps, growthReflections }, recentSummaries });
});

router.post("/user-plan", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subjectId, planHtml, currentStageIndex } = req.body;
  if (!subjectId || !planHtml) {
    res.status(400).json({ error: "subjectId and planHtml required" });
    return;
  }

  const quality = validatePlanQuality(planHtml);
  if (!quality || !quality.ok) {
    res.status(422).json({
      error: "PLAN_QUALITY_FAILED",
      reason: quality?.reason ?? "الخطة لا تحتوي على عناصر البنية المطلوبة",
      details: quality?.details ?? ["لم يُعثر على عناصر class المطلوبة في الخطة المُولَّدة"],
      message: "الخطة المُولَّدة لم تجتز فحص الجودة. يرجى طلب إعادة التوليد.",
    });
    return;
  }

  // Cross-reference stage-reason fields against the student's actual diagnostic
  // answers. If zero stages have meaningful word overlap with what the student
  // said in the diagnostic conversation, the plan is a generic template — reject it.
  const diagnosticMessages = await db
    .select({ content: aiTeacherMessagesTable.content })
    .from(aiTeacherMessagesTable)
    .where(and(
      eq(aiTeacherMessagesTable.userId, userId),
      eq(aiTeacherMessagesTable.subjectId, subjectId),
      eq(aiTeacherMessagesTable.role, "user"),
      eq(aiTeacherMessagesTable.isDiagnostic, 1),
    ));

  if (diagnosticMessages.length > 0) {
    const corpus = diagnosticMessages.map((m) => m.content).join(" ");
    const stageItems = getStageItems(planHtml);
    const reasons = stageItems.map((s) => extractClassedTextContent(s, "stage-reason"));
    const overlap = checkDiagnosticOverlap(reasons, corpus);

    if (overlap.uncoveredIndices.length > 0) {
      res.status(422).json({
        error: "PLAN_NOT_PERSONALIZED",
        reason: "بعض المراحل لا تستند إلى إجابات الطالب التشخيصية",
        details: overlap.uncoveredIndices.map(
          (i) => `المرحلة ${i + 1}: stage-reason لا يتضمن مرجعاً لإجاباتك التشخيصية`,
        ),
        message: "لم يتمكن المعلم من ربط جميع المراحل بإجاباتك. يرجى طلب إعادة التوليد.",
      });
      return;
    }
  }

  const [existing] = await db
    .select()
    .from(userSubjectPlansTable)
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId),
    ));

  if (existing) {
    await db
      .update(userSubjectPlansTable)
      .set({
        planHtml,
        currentStageIndex: currentStageIndex ?? existing.currentStageIndex,
        currentMicroStepIndex: 0,
        completedMicroSteps: "[]",
        growthReflections: "[]",
        updatedAt: new Date(),
      })
      .where(eq(userSubjectPlansTable.id, existing.id));
  } else {
    await db.insert(userSubjectPlansTable).values({
      userId,
      subjectId,
      planHtml,
      currentStageIndex: currentStageIndex ?? 0,
      currentMicroStepIndex: 0,
      completedMicroSteps: "[]",
      growthReflections: "[]",
      updatedAt: new Date(),
    });
  }

  res.json({ ok: true });
});

router.patch("/user-plan/stage", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subjectId, currentStageIndex } = req.body as {
    subjectId?: string;
    currentStageIndex?: number;
  };
  if (!subjectId || currentStageIndex === undefined) {
    res.status(400).json({ error: "subjectId and currentStageIndex required" });
    return;
  }

  await db
    .update(userSubjectPlansTable)
    .set({
      currentStageIndex,
      currentMicroStepIndex: 0,
      completedMicroSteps: "[]",
      updatedAt: new Date(),
    })
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId),
    ));

  res.json({ ok: true });
});

router.patch("/user-plan/micro-step", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subjectId, microStepIndex } = req.body as {
    subjectId?: string;
    microStepIndex?: number;
  };
  if (!subjectId || microStepIndex === undefined) {
    res.status(400).json({ error: "subjectId and microStepIndex required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userSubjectPlansTable)
    .where(and(
      eq(userSubjectPlansTable.userId, userId),
      eq(userSubjectPlansTable.subjectId, subjectId),
    ));

  if (!existing) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  let completed: number[] = [];
  try { completed = JSON.parse(existing.completedMicroSteps ?? "[]"); } catch {}
  if (!completed.includes(microStepIndex)) completed.push(microStepIndex);

  await db
    .update(userSubjectPlansTable)
    .set({
      currentMicroStepIndex: microStepIndex,
      completedMicroSteps: JSON.stringify(completed),
      updatedAt: new Date(),
    })
    .where(eq(userSubjectPlansTable.id, existing.id));

  res.json({ ok: true, currentMicroStepIndex: microStepIndex, completedMicroSteps: completed });
});

export default router;
