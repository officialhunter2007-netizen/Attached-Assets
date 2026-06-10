import { Router, type IRouter } from "express";
import { eq, and, asc, desc, lte } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  db,
  usersTable,
  adminKnowledgeModulesTable,
  adminModuleLevelFilesTable,
  studentModuleLevelsTable,
  studentRagSessionsTable,
  studentMistakesTable,
  userSubjectSubscriptionsTable,
} from "@workspace/db";
import {
  streamGeminiTeaching,
  GeminiAuthError,
  GeminiCreditExhaustedError,
  GeminiTransientError,
  GeminiBadOutputError,
  GeminiClientError,
  type GeminiMessage,
} from "../lib/gemini-stream";
import { generateGemini, GenerateGeminiError } from "../lib/openrouter-generate";
import { recordAiUsage, extractGeminiUsage } from "../lib/ai-usage";
import { costForUsage } from "../lib/ai-pricing";
import { settleAiCharge, newAiRequestId, type ChargeWallet } from "../lib/charge-ai-usage";
import { getAccessForUser, FREE_LESSON_GEM_LIMIT } from "../lib/access";

const router: IRouter = Router();

// ── Auth helpers ─────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

async function getUser(userId: number) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return u ?? null;
}

// ── SSE helpers ───────────────────────────────────────────────────────────────
function setSseHeaders(res: any): void {
  if (res.headersSent) return;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

function sseWrite(res: any, data: object): void {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // half-closed socket
  }
}

// ── IRT helpers ───────────────────────────────────────────────────────────────
interface PlacementAnswer {
  correct: boolean;
  difficulty: number;
  moduleId: number;
}

function computeNextDifficulty(history: PlacementAnswer[]): number {
  if (!history.length) return 2;
  const last = history[history.length - 1];
  return last.correct ? Math.min(5, last.difficulty + 1) : Math.max(1, last.difficulty - 1);
}

function computeModuleLevel(history: PlacementAnswer[]): 1 | 2 | 3 | 4 | 5 {
  let weighted = 0, total = 0;
  for (const a of history) {
    weighted += a.correct ? a.difficulty : 0;
    total += a.difficulty;
  }
  const r = total > 0 ? weighted / total : 0;
  if (r >= 0.85) return 5;
  if (r >= 0.70) return 4;
  if (r >= 0.50) return 3;
  if (r >= 0.30) return 2;
  return 1;
}

function isModuleAssessmentComplete(history: PlacementAnswer[]): boolean {
  if (history.length >= 7) return true;
  if (history.length < 3) return false;
  const last3 = history.slice(-3);
  if (last3.every((a) => a.correct && a.difficulty === 5)) return true;
  if (last3.every((a) => !a.correct && a.difficulty === 1)) return true;
  return false;
}

// ── Non-streaming Gemini call for question generation ────────────────────────
async function callGemini(prompt: string, maxTokens = 400): Promise<string> {
  try {
    const result = await generateGemini({
      userParts: [{ type: "text", text: prompt }],
      model: "gemini-2.0-flash",
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      logTag: "pathway",
    });
    return result.text.trim();
  } catch (err: any) {
    console.error("[pathway] callGemini error:", err?.message || err);
    return "";
  }
}

// ── Diagnostic question goals ─────────────────────────────────────────────────
const DIAGNOSTIC_GOALS = [
  "طموحاته المهنية وأهدافه على المدى البعيد",
  "دوافعه الداخلية لتعلم هذا المجال الآن تحديداً",
  "خبرته السابقة والمعرفة التي يمتلكها حالياً",
  "التحديات أو المخاوف التي تواجهه في التعلم",
  "أسلوبه المفضّل في التعلم (عملي / نظري / مشاريع)",
];

async function generateDiagnosticQuestion(
  subjectNameAr: string,
  questionIndex: number,
  priorQA: Array<{ question: string; answer: string }>,
): Promise<string> {
  const goal = DIAGNOSTIC_GOALS[questionIndex] ?? DIAGNOSTIC_GOALS[0];
  const priorContext =
    priorQA.length > 0
      ? priorQA
          .map((qa, i) => `س${i + 1}: ${qa.question}\nج${i + 1}: ${qa.answer}`)
          .join("\n\n")
      : "لا توجد إجابات سابقة.";

  const prompt = `أنت معلم ذكي في مجال "${subjectNameAr}". تجري مقابلة تشخيصية هادئة ومحادثاتية مع طالب جديد.
هدف السؤال ${questionIndex + 1}: ${goal}.
${priorQA.length > 0 ? `إجابات الطالب حتى الآن:\n${priorContext}\n\nاربط سؤالك القادم بما قاله الطالب.` : ""}
اكتب سؤالاً واحداً فقط بالعربية، بدون تسمية أو مقدمة أو ترقيم.`;

  const text = await callGemini(prompt, 200);
  return text || `ما الذي يدفعك لتعلم ${subjectNameAr} في هذه المرحلة؟`;
}

// ── Placement MCQ generation ──────────────────────────────────────────────────
interface PlacementQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
}

async function generatePlacementQuestion(
  moduleNameAr: string,
  levelContent: string,
  difficulty: number,
): Promise<PlacementQuestion | null> {
  const snippet = levelContent.slice(0, 2500);
  const prompt = `النص التعليمي للوحدة "${moduleNameAr}":
────────────────────────
${snippet}
────────────────────────
أنشئ سؤال اختيار من متعدد بمستوى صعوبة ${difficulty} (1=مبتدئ جداً، 5=متقدم).
أخرج JSON فقط بدون أي نص آخر:
{"questionText":"...","options":["أ. ...","ب. ...","ج. ...","د. ..."],"correctIndex":0}`;

  const raw = await callGemini(prompt, 500);
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (
      typeof parsed.questionText === "string" &&
      Array.isArray(parsed.options) &&
      parsed.options.length === 4 &&
      typeof parsed.correctIndex === "number"
    ) {
      return parsed as PlacementQuestion;
    }
    return null;
  } catch {
    return null;
  }
}

// ── GET /api/pathway/status?subjectId= ───────────────────────────────────────
router.get("/pathway/status", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId.trim() : "";
  if (!subjectId) return res.status(400).json({ error: "subjectId required" });

  const [session] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.userId, userId),
        eq(studentRagSessionsTable.subjectId, subjectId),
      ),
    );

  const allModules = await db
    .select({ id: adminKnowledgeModulesTable.id, moduleNameAr: adminKnowledgeModulesTable.moduleNameAr })
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.subjectId, subjectId))
    .orderBy(asc(adminKnowledgeModulesTable.moduleOrder));

  const completeModuleIds: number[] = [];
  for (const mod of allModules) {
    const files = await db
      .select({ level: adminModuleLevelFilesTable.level })
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, mod.id));
    if (files.length === 5) completeModuleIds.push(mod.id);
  }

  if (completeModuleIds.length < 1) {
    return res.json({ data: { phase: "not_available", reason: "no_modules" } });
  }

  if (!session) {
    return res.json({
      data: {
        phase: "not_started",
        modulesTotal: completeModuleIds.length,
        modulesPlaced: 0,
        canResume: false,
      },
    });
  }

  const modLevels = await db
    .select()
    .from(studentModuleLevelsTable)
    .where(eq(studentModuleLevelsTable.userId, userId));

  const pathwayOrder = (session.pathwayOrder as any[]) ?? [];
  const pathwayProgress = pathwayOrder.map((item: any) => {
    const mod = allModules.find((m) => m.id === item.moduleId);
    const placed = modLevels.find((ml) => ml.moduleId === item.moduleId);
    return {
      moduleId: item.moduleId,
      moduleNameAr: mod?.moduleNameAr ?? "",
      level: placed?.level ?? null,
      complete: session.pathwayIndex > pathwayOrder.indexOf(item),
    };
  });

  return res.json({
    data: {
      phase: session.sessionPhase,
      sessionId: session.id,
      modulesTotal: completeModuleIds.length,
      modulesPlaced: modLevels.length,
      currentModuleId: session.currentModuleId,
      currentLevel: session.currentLevel,
      pathwayProgress,
      canResume: true,
    },
  });
});

// ── POST /api/pathway/start ───────────────────────────────────────────────────
router.post("/pathway/start", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { subjectId, subjectNameAr } = req.body ?? {};
  if (!subjectId) return res.status(400).json({ error: "subjectId required" });

  // Check if modules exist for this subject
  const modules = await db
    .select({ id: adminKnowledgeModulesTable.id })
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.subjectId, subjectId));

  const completeModules: number[] = [];
  for (const mod of modules) {
    const files = await db
      .select({ level: adminModuleLevelFilesTable.level })
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, mod.id));
    if (files.length === 5) completeModules.push(mod.id);
  }

  if (completeModules.length === 0) {
    return res.status(422).json({ error: "no_modules", message: "لا توجد وحدات متاحة لهذا المسار بعد." });
  }

  // Check for existing session
  const [existing] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.userId, userId),
        eq(studentRagSessionsTable.subjectId, subjectId),
      ),
    );

  if (existing && existing.sessionPhase !== "complete") {
    // Resume existing session
    const diagAnswers = (existing.diagnosticAnswers as any[]) ?? [];
    return res.json({
      data: {
        sessionId: existing.id,
        phase: existing.sessionPhase,
        resuming: true,
        diagnosticAnswersCount: diagAnswers.length,
        totalQuestions: 5,
      },
    });
  }

  // Create new session (or reset completed one)
  const subjectLabel = subjectNameAr ?? subjectId;
  const firstQuestion = await generateDiagnosticQuestion(subjectLabel, 0, []);

  const [session] = await db
    .insert(studentRagSessionsTable)
    .values({
      userId,
      subjectId,
      sessionPhase: "diagnostic",
      diagnosticAnswers: [],
      placementHistory: [],
      pathwayOrder: [],
      pathwayIndex: 0,
    })
    .onConflictDoUpdate({
      target: [studentRagSessionsTable.userId, studentRagSessionsTable.subjectId],
      set: {
        sessionPhase: "diagnostic",
        diagnosticAnswers: [],
        placementHistory: [],
        pathwayOrder: [],
        pathwayIndex: 0,
        currentModuleId: null,
        currentLevel: null,
        labEnvJson: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return res.json({
    data: {
      sessionId: session.id,
      phase: "diagnostic",
      firstQuestion: { index: 0, text: firstQuestion },
      totalQuestions: 5,
    },
  });
});

// ── POST /api/pathway/diagnostic/answer (SSE) ────────────────────────────────
router.post("/pathway/diagnostic/answer", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId, questionIndex, answerText, subjectNameAr } = req.body ?? {};
  if (typeof sessionId !== "number" && typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId required" });
  }
  if (typeof questionIndex !== "number") return res.status(400).json({ error: "questionIndex required" });
  if (!answerText || typeof answerText !== "string") return res.status(400).json({ error: "answerText required" });

  const [session] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.id, Number(sessionId)),
        eq(studentRagSessionsTable.userId, userId),
      ),
    );
  if (!session) return res.status(404).json({ error: "Session not found" });

  const diagAnswers: any[] = [...((session.diagnosticAnswers as any[]) ?? [])];

  // Find what question was asked at this index (reconstruct from stored answers)
  const prevQA = diagAnswers.map((a: any) => ({ question: a.question ?? "", answer: a.answer ?? "" }));
  const currentQuestion = prevQA.length > questionIndex ? prevQA[questionIndex]?.question ?? "" : "";

  diagAnswers[questionIndex] = {
    question: currentQuestion,
    answer: answerText.trim(),
    questionIndex,
  };

  const isLastQuestion = questionIndex >= 4;

  setSseHeaders(res);

  if (!isLastQuestion) {
    // Generate next diagnostic question and stream it
    const nextIndex = questionIndex + 1;
    const nextQA = diagAnswers
      .filter((a) => a && a.answer)
      .map((a) => ({ question: a.question ?? "", answer: a.answer ?? "" }));

    const subjectLabel = subjectNameAr ?? session.subjectId;
    const nextQuestion = await generateDiagnosticQuestion(subjectLabel, nextIndex, nextQA);

    // Store the next question back in the session
    diagAnswers[nextIndex] = { question: nextQuestion, answer: "", questionIndex: nextIndex };

    await db
      .update(studentRagSessionsTable)
      .set({ diagnosticAnswers: diagAnswers, updatedAt: new Date() })
      .where(eq(studentRagSessionsTable.id, session.id));

    sseWrite(res, { type: "question", index: nextIndex, text: nextQuestion, total: 5 });
    sseWrite(res, { type: "done", phase: "diagnostic" });
    res.end();
    return;
  }

  // Last diagnostic answer — transition to placement
  await db
    .update(studentRagSessionsTable)
    .set({ diagnosticAnswers: diagAnswers, sessionPhase: "placement", updatedAt: new Date() })
    .where(eq(studentRagSessionsTable.id, session.id));

  // Get first complete module for this subject
  const modules = await db
    .select()
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.subjectId, session.subjectId))
    .orderBy(asc(adminKnowledgeModulesTable.moduleOrder));

  let firstCompleteModule: (typeof modules)[0] | null = null;
  let firstLevelContent = "";
  for (const mod of modules) {
    const files = await db
      .select()
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, mod.id));
    if (files.length === 5) {
      firstCompleteModule = mod;
      // Use level 3 content (mid-level anchor) for initial question generation
      const lvl3 = files.find((f) => f.level === 3) ?? files[0];
      firstLevelContent = lvl3?.content ?? "";
      break;
    }
  }

  if (!firstCompleteModule) {
    sseWrite(res, { type: "error", message: "لا توجد وحدات متاحة للاختبار." });
    res.end();
    return;
  }

  const firstQuestion = await generatePlacementQuestion(
    firstCompleteModule.moduleNameAr,
    firstLevelContent,
    2, // Start at difficulty 2
  );

  sseWrite(res, {
    type: "placement_start",
    phase: "placement",
    module: {
      id: firstCompleteModule.id,
      moduleNameAr: firstCompleteModule.moduleNameAr,
    },
    question: firstQuestion
      ? { ...firstQuestion, difficulty: 2, questionIndex: 0 }
      : null,
  });
  sseWrite(res, { type: "done", phase: "placement" });
  res.end();
});

// ── POST /api/pathway/placement/answer ───────────────────────────────────────
router.post("/pathway/placement/answer", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId, moduleId, correct, difficulty, selectedOptionIndex } = req.body ?? {};
  if (!sessionId || typeof moduleId !== "number") {
    return res.status(400).json({ error: "sessionId and moduleId required" });
  }

  const [session] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.id, Number(sessionId)),
        eq(studentRagSessionsTable.userId, userId),
      ),
    );
  if (!session) return res.status(404).json({ error: "Session not found" });

  const allHistory: PlacementAnswer[] = (session.placementHistory as any[]) ?? [];
  const moduleHistory = allHistory.filter((a) => a.moduleId === moduleId);

  // Append this answer
  moduleHistory.push({ correct: !!correct, difficulty: Number(difficulty) || 2, moduleId });
  const updatedHistory = [
    ...allHistory.filter((a) => a.moduleId !== moduleId),
    ...moduleHistory,
  ];

  const moduleComplete = isModuleAssessmentComplete(moduleHistory);

  if (!moduleComplete) {
    // Need more questions for this module
    const nextDiff = computeNextDifficulty(moduleHistory);
    await db
      .update(studentRagSessionsTable)
      .set({ placementHistory: updatedHistory, updatedAt: new Date() })
      .where(eq(studentRagSessionsTable.id, session.id));

    // Fetch module + level file for next question
    const [mod] = await db
      .select()
      .from(adminKnowledgeModulesTable)
      .where(eq(adminKnowledgeModulesTable.id, moduleId));
    const levelFiles = await db
      .select()
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, moduleId));

    const anchorLevel = Math.min(5, Math.max(1, Math.ceil(nextDiff / 1.0)));
    const lvlFile = levelFiles.find((f) => f.level === anchorLevel) ?? levelFiles[Math.floor(levelFiles.length / 2)];
    const content = lvlFile?.content ?? "";

    const nextQ = await generatePlacementQuestion(mod?.moduleNameAr ?? "", content, nextDiff);
    return res.json({
      data: {
        moduleComplete: false,
        nextQuestion: nextQ ? { ...nextQ, difficulty: nextDiff, questionIndex: moduleHistory.length } : null,
      },
    });
  }

  // Module assessment complete — compute level and save
  const assignedLevel = computeModuleLevel(moduleHistory);
  await db
    .insert(studentModuleLevelsTable)
    .values({ userId, moduleId, level: assignedLevel, placementScore: { correct: moduleHistory.filter((a) => a.correct).length, total: moduleHistory.length } })
    .onConflictDoUpdate({
      target: [studentModuleLevelsTable.userId, studentModuleLevelsTable.moduleId],
      set: { level: assignedLevel, placementScore: { correct: moduleHistory.filter((a) => a.correct).length, total: moduleHistory.length }, updatedAt: new Date() },
    });

  // Save history
  await db
    .update(studentRagSessionsTable)
    .set({ placementHistory: updatedHistory, updatedAt: new Date() })
    .where(eq(studentRagSessionsTable.id, session.id));

  // Find next module to assess
  const allModules = await db
    .select()
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.subjectId, session.subjectId))
    .orderBy(asc(adminKnowledgeModulesTable.moduleOrder));

  const assessedModuleIds = [...new Set(updatedHistory.map((a) => a.moduleId))];
  const completeModules: typeof allModules = [];
  for (const mod of allModules) {
    const files = await db
      .select({ level: adminModuleLevelFilesTable.level })
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, mod.id));
    if (files.length === 5) completeModules.push(mod);
  }

  const nextModule = completeModules.find((m) => !assessedModuleIds.includes(m.id));

  if (nextModule) {
    // More modules to assess
    const levelFiles = await db
      .select()
      .from(adminModuleLevelFilesTable)
      .where(eq(adminModuleLevelFilesTable.moduleId, nextModule.id));
    const lvl3 = levelFiles.find((f) => f.level === 3) ?? levelFiles[0];
    const nextQ = await generatePlacementQuestion(nextModule.moduleNameAr, lvl3?.content ?? "", 2);

    return res.json({
      data: {
        moduleComplete: true,
        assignedLevel,
        nextModule: { id: nextModule.id, moduleNameAr: nextModule.moduleNameAr },
        firstQuestion: nextQ ? { ...nextQ, difficulty: 2, questionIndex: 0 } : null,
      },
    });
  }

  // All modules assessed — build pathway and transition to teaching
  const modLevels = await db
    .select()
    .from(studentModuleLevelsTable)
    .where(eq(studentModuleLevelsTable.userId, userId));

  const pathwayOrder = completeModules.map((m) => {
    const ml = modLevels.find((l) => l.moduleId === m.id);
    return { moduleId: m.id, moduleNameAr: m.moduleNameAr, level: ml?.level ?? 1 };
  });

  const firstPathwayItem = pathwayOrder[0];
  await db
    .update(studentRagSessionsTable)
    .set({
      sessionPhase: "teaching",
      pathwayOrder,
      pathwayIndex: 0,
      currentModuleId: firstPathwayItem?.moduleId ?? null,
      currentLevel: firstPathwayItem?.level ?? null,
      updatedAt: new Date(),
    })
    .where(eq(studentRagSessionsTable.id, session.id));

  return res.json({
    data: {
      moduleComplete: true,
      assignedLevel,
      allComplete: true,
      pathwayOrder,
    },
  });
});

// ── POST /api/pathway/teach (SSE) ────────────────────────────────────────────
router.post("/pathway/teach", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUser(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  const { sessionId, subjectId, subjectNameAr, userMessage, history } = req.body ?? {};
  if (!sessionId || !subjectId || !userMessage) {
    return res.status(400).json({ error: "sessionId, subjectId, userMessage required" });
  }

  // Load session
  const [session] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.id, Number(sessionId)),
        eq(studentRagSessionsTable.userId, userId),
      ),
    );
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.sessionPhase !== "teaching") {
    return res.status(422).json({ error: "Session is not in teaching phase" });
  }

  const moduleId = session.currentModuleId;
  const level = session.currentLevel;
  if (!moduleId || !level) {
    return res.status(422).json({ error: "No active module" });
  }

  // Load module + level file
  const [mod] = await db
    .select()
    .from(adminKnowledgeModulesTable)
    .where(eq(adminKnowledgeModulesTable.id, moduleId));
  const [levelFile] = await db
    .select()
    .from(adminModuleLevelFilesTable)
    .where(
      and(
        eq(adminModuleLevelFilesTable.moduleId, moduleId),
        eq(adminModuleLevelFilesTable.level, level),
      ),
    );

  if (!levelFile) {
    return res.status(404).json({ error: "Level file not found for this module" });
  }

  // Check subject access for gem deduction
  const access = await getAccessForUser({ userId, subjectId });
  const canAccess =
    access.isFirstLesson || access.canAccess || user.role === "admin" || (user as any).role === "unlimited";
  if (!canAccess) {
    return res.status(403).json({
      error: "ACCESS_DENIED",
      message: "انتهى رصيدك. يرجى تجديد الاشتراك للاستمرار.",
    });
  }

  // Top unresolved mistakes
  const mistakes = await db
    .select()
    .from(studentMistakesTable)
    .where(
      and(
        eq(studentMistakesTable.userId, userId),
        eq(studentMistakesTable.subjectId, subjectId),
        eq(studentMistakesTable.resolved, false),
      ),
    )
    .orderBy(desc((studentMistakesTable as any).createdAt ?? studentMistakesTable.id))
    .limit(5);

  const mistakesText =
    mistakes.length > 0
      ? mistakes.map((m, i) => `${i + 1}. [${m.topic}]: ${m.mistake}`).join("\n")
      : "لا توجد أخطاء مسجّلة حتى الآن.";

  // Parse diagnostic profile
  const diagAnswers: any[] = (session.diagnosticAnswers as any[]) ?? [];
  const ambition = diagAnswers[0]?.answer ?? "غير محدد";
  const motivation = diagAnswers[1]?.answer ?? "غير محدد";
  const experience = diagAnswers[2]?.answer ?? "غير محدد";

  // Build strict RAG system prompt
  const systemPrompt = `أنت معلم ذكي متخصص في مجال "${subjectNameAr ?? subjectId}".

═══════════════════════════════════════════════════════════════
⚠️  قاعدة صارمة لا استثناء منها أبداً:
    يجب أن تكون كل عباراتك، شروحاتك، أسئلتك، وأمثلتك
    مستمدة حصرياً من النص التالي ولا شيء خارجه.
    إذا سأل الطالب عن شيء لا يوجد في النص، قل:
    "هذا الموضوع خارج نطاق وحدتك الحالية. سنصله في وحدة قادمة."
═══════════════════════════════════════════════════════════════

📘 محتوى الوحدة المعتمد لهذا الطالب (المستوى ${level} من 5):
الوحدة: ${mod?.moduleNameAr ?? ""}
────────────────────────────────────────────────────
${levelFile.content}
────────────────────────────────────────────────────

🎯 ملف الطالب (من المقابلة التشخيصية):
- طموحه: ${ambition}
- دافعه: ${motivation}
- خبرته السابقة: ${experience}

📋 المستوى المحدد: ${level} من 5
  (1=مبتدئ تام، 5=ممارس متقدم — صمّم شرحك بما يتناسب مع هذا المستوى)

🎓 منهج التدريس — اتبع هذا بدقة:
1. لا تعطِ المعلومة مباشرة — ابدأ بسيناريو من بيئة العمل الحقيقية.
2. اطرح سؤالاً واحداً يحفّز التفكير ويقود الطالب للاستنتاج.
3. اربط كل إجابة بالمحتوى المعتمد في النص.
4. استخدم المقارنة والتشبيه من داخل النص فقط.
5. ردودك ≤ 150 كلمة إلا إذا طلب الطالب تفصيلاً صريحاً.

🏷️ عقد العلامات:
- اكتب [MODULE_COMPLETE] في نهاية ردك عندما تتأكد أن الطالب أتقن كامل محتوى الوحدة.
- اكتب [MISTAKE: الموضوع ||| وصف الخطأ] لأي خطأ مفاهيمي متكرر.

🚫 محظور تماماً:
- استحضار معلومات من خارج النص المعتمد أعلاه.
- الإجابة المباشرة بدون توجيه سقراطي.
- تجاوز حدود الوحدة الحالية مهما كان طلب الطالب.

أخطاء الطالب غير المحلولة:
${mistakesText}`;

  // Build message history
  const clientHistory: Array<{ role: string; content: string }> = Array.isArray(history) ? history : [];
  const geminiMessages: GeminiMessage[] = [
    ...clientHistory.slice(-8).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content ?? "" })),
    { role: "user", content: userMessage },
  ];

  setSseHeaders(res);

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    try { res.write(": heartbeat\n\n"); } catch { /* socket closed */ }
  }, 15_000);

  let fullResponse = "";
  let clientAborted = false;
  req.on("close", () => { clientAborted = true; });

  const __requestId = newAiRequestId();
  const __aiStart = Date.now();
  let __activeModel = "google/gemini-2.0-flash-001";
  let __geminiUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  let __success = false;
  let __lastErr: any = null;

  const abortController = new AbortController();

  try {
    const geminiResult = await streamGeminiTeaching({
      systemPrompt,
      messages: geminiMessages,
      maxOutputTokens: 1200,
      model: "gemini-2.0-flash",
      signal: abortController.signal,
      logTag: "pathway/teach",
      onChunk: (text) => {
        if (clientAborted || res.writableEnded) return;
        fullResponse += text;
        try {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        } catch { /* socket */ }
      },
    });

    __geminiUsage = {
      inputTokens: geminiResult.inputTokens,
      outputTokens: geminiResult.outputTokens,
      cachedInputTokens: geminiResult.cachedInputTokens,
    };
    __activeModel = geminiResult.model;
    __success = true;
  } catch (err: any) {
    __lastErr = err;
    const msg =
      err instanceof GeminiCreditExhaustedError
        ? "انتهت رصيد الخدمة مؤقتاً. أعد المحاولة بعد قليل."
        : "حدث خطأ مؤقت. أعد إرسال رسالتك.";
    if (!res.writableEnded) sseWrite(res, { error: true, message: msg });
  } finally {
    clearInterval(heartbeat);
  }

  // Parse [MODULE_COMPLETE] tag
  if (__success && /\[MODULE_COMPLETE\]/i.test(fullResponse)) {
    await db
      .update(studentRagSessionsTable)
      .set({ sessionPhase: "module_done", updatedAt: new Date() })
      .where(eq(studentRagSessionsTable.id, session.id));
    sseWrite(res, { type: "module_complete" });
  }

  // Parse [MISTAKE: topic ||| description]
  if (__success) {
    const mistakeMatches = fullResponse.matchAll(/\[MISTAKE:\s*([^|]+)\|\|\|([^\]]+)\]/gi);
    for (const match of mistakeMatches) {
      const topic = match[1].trim();
      const mistake = match[2].trim();
      if (topic && mistake) {
        try {
          await db.insert(studentMistakesTable).values({ userId, subjectId, topic, mistake, resolved: false });
        } catch { /* ignore duplicate */ }
      }
    }
  }

  // Emit done event
  sseWrite(res, { type: "done" });
  if (!res.writableEnded) res.end();

  // Gem accounting (fire-and-forget)
  if (__success) {
    try {
      const turnCostUsd = costForUsage({
        provider: "google",
        model: __activeModel,
        inputTokens: __geminiUsage.inputTokens,
        outputTokens: __geminiUsage.outputTokens,
        cachedInputTokens: __geminiUsage.cachedInputTokens,
      } as any);
      const gems = Math.max(1, Math.ceil(turnCostUsd * 1000));

      let wallet: ChargeWallet | null = null;
      if (access.isFirstLesson) {
        // Use free-lesson wallet via getAccessForUser's first lesson tracking
        wallet = null; // absorbed by platform in first lesson
      } else if (access.source === "per-subject") {
        // Find sub id
        const subs = await db
          .select({ id: userSubjectSubscriptionsTable.id })
          .from(userSubjectSubscriptionsTable)
          .where(
            and(
              eq(userSubjectSubscriptionsTable.userId, userId),
              eq(userSubjectSubscriptionsTable.subjectId, subjectId),
            ),
          )
          .orderBy(desc(userSubjectSubscriptionsTable.expiresAt))
          .limit(1);
        if (subs[0]) wallet = { kind: "per-subject", subjectSubId: subs[0].id, subjectId };
      } else if (access.source === "legacy") {
        wallet = { kind: "legacy", subjectId };
      }

      if (wallet) {
        await settleAiCharge({
          requestId: __requestId,
          userId,
          wallet,
          gems,
          source: "ai_teach",
          model: __activeModel,
          costUsd: turnCostUsd,
          note: `pathway/teach (${mod?.moduleNameAr ?? ""} L${level})`,
        });
      }

      void recordAiUsage({
        userId,
        subjectId,
        route: "pathway_teach",
        provider: "google",
        model: __activeModel,
        inputTokens: __geminiUsage.inputTokens,
        outputTokens: __geminiUsage.outputTokens,
        cachedInputTokens: __geminiUsage.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
      });
    } catch (err: any) {
      console.error("[pathway/teach] billing error:", err?.message || err);
    }
  }
});

// ── POST /api/pathway/advance-module ─────────────────────────────────────────
router.post("/pathway/advance-module", async (req, res): Promise<any> => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });

  const [session] = await db
    .select()
    .from(studentRagSessionsTable)
    .where(
      and(
        eq(studentRagSessionsTable.id, Number(sessionId)),
        eq(studentRagSessionsTable.userId, userId),
      ),
    );
  if (!session) return res.status(404).json({ error: "Session not found" });

  const pathwayOrder: any[] = (session.pathwayOrder as any[]) ?? [];
  const nextIndex = (session.pathwayIndex ?? 0) + 1;

  if (nextIndex >= pathwayOrder.length) {
    // All modules complete
    await db
      .update(studentRagSessionsTable)
      .set({ sessionPhase: "complete", pathwayIndex: nextIndex, updatedAt: new Date() })
      .where(eq(studentRagSessionsTable.id, session.id));
    return res.json({ data: { complete: true } });
  }

  const nextItem = pathwayOrder[nextIndex];
  await db
    .update(studentRagSessionsTable)
    .set({
      sessionPhase: "teaching",
      pathwayIndex: nextIndex,
      currentModuleId: nextItem.moduleId,
      currentLevel: nextItem.level,
      updatedAt: new Date(),
    })
    .where(eq(studentRagSessionsTable.id, session.id));

  return res.json({
    data: {
      complete: false,
      pathwayIndex: nextIndex,
      currentModuleId: nextItem.moduleId,
      currentModuleNameAr: nextItem.moduleNameAr,
      currentLevel: nextItem.level,
    },
  });
});

export default router;
