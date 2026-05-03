import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, lessonSummariesTable, usersTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { recordAiUsage, extractAnthropicUsage } from "../lib/ai-usage";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.post("/ai/summarize-lesson", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, subjectName, messages, messagesCount, conversationDate } = req.body;

  if (!subjectId || !subjectName || !messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (messages.length > 200) {
    res.status(400).json({ error: "Too many messages (max 200)" });
    return;
  }

  let parsedDate = new Date();
  if (conversationDate) {
    const d = new Date(conversationDate);
    if (!isNaN(d.getTime())) parsedDate = d;
  }

  const conversationText = messages
    .map((m: any) => {
      const role = m.role === "user" ? "الطالب" : "المعلم";
      const text = typeof m.content === "string"
        ? m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : "";
      return `${role}: ${text}`;
    })
    .filter((line: string) => line.length > 10)
    .join("\n");

  const systemPrompt = `أنت خبير تعليمي تلخص جلسات تعليمية باللغة العربية.
أجب بـ JSON فقط بهذا الشكل (بدون أي نص خارجه):
{
  "title": "عنوان قصير معبر عن موضوع الجلسة (لا يتجاوز 8 كلمات)",
  "summaryHtml": "HTML داخل div واحد يشمل: ما تعلمه الطالب، أبرز الأمثلة، نقاط القوة، وأهم ما يجب تذكره"
}

قواعد التنسيق للـ summaryHtml:
- HTML داخل div واحد فقط، ألوان: عناوين #F59E0B، إنجازات #10B981
- لا Markdown. لا ** أو #. كل شيء HTML`;

  const __aiStart = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `المادة: ${subjectName}\n\nمحادثة الجلسة:\n${conversationText}\n\nاكتب الملخص والعنوان.`,
        },
      ],
    });

    const __u = extractAnthropicUsage(response);
    void recordAiUsage({
      userId,
      subjectId: subjectId ?? null,
      route: "ai/summarize-lesson",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputTokens: __u.inputTokens,
      outputTokens: __u.outputTokens,
      cachedInputTokens: __u.cachedInputTokens,
      latencyMs: Date.now() - __aiStart,
    });

    const rawText = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    let title = `جلسة ${subjectName}`;
    let summaryHtml = "";

    try {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
        title = parsed.title || title;
        summaryHtml = parsed.summaryHtml || rawText;
      } else {
        summaryHtml = rawText;
      }
    } catch {
      summaryHtml = rawText;
    }

    const [saved] = await db.insert(lessonSummariesTable).values({
      userId,
      subjectId,
      subjectName,
      title,
      summaryHtml,
      messagesCount: messagesCount ?? messages.length,
      conversationDate: parsedDate,
    }).returning();

    // NOTE: We deliberately do NOT touch `userSubjectFirstLessonsTable` here.
    // The per-subject 80-gem free trial is owned end-to-end by the gem-charge
    // pipeline: `settleAiCharge` (lib/charge-ai-usage.ts) atomically flips
    // `completed = true` the moment `freeMessagesUsed + gems >= cap`, and
    // `getSubjectAccess` (routes/ai.ts) creates the row with
    // `completed:false` on the first /ai/teach call. Marking the row
    // completed here — after a single session end, regardless of how many
    // of the 80 free gems were actually consumed — was the regression
    // reported in Task #58: a student who used 5 of 80 gems and ended the
    // session lost the remaining 75 forever, because the next visit
    // resolved as `isFirstLesson:false`. The summarize endpoint must stay
    // a pure write to `lesson_summaries`.

    // Award points for completing the lesson summary. We intentionally do
    // NOT set `users.firstLessonComplete = true` here either: that global
    // one-shot flag is legacy from the pre-per-subject era; the
    // authoritative "did this user burn the free trial on subject X?"
    // signal is the per-subject row, which `settleAiCharge` owns.
    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 15` })
      .where(eq(usersTable.id, userId));

    res.json(saved);
  } catch (err: any) {
    console.error("Summarize error:", err);
    void recordAiUsage({
      userId,
      subjectId: subjectId ?? null,
      route: "ai/summarize-lesson",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - __aiStart,
      status: "error",
      errorMessage: String(err?.message || err).slice(0, 500),
    });
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.get("/lesson-summaries", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : null;

  const summaries = await db
    .select()
    .from(lessonSummariesTable)
    .where(
      subjectId
        ? and(eq(lessonSummariesTable.userId, userId), eq(lessonSummariesTable.subjectId, subjectId))
        : eq(lessonSummariesTable.userId, userId)
    )
    .orderBy(desc(lessonSummariesTable.conversationDate));

  res.json(summaries);
});

export default router;
