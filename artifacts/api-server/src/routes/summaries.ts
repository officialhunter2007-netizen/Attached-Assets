import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, lessonSummariesTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

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
اكتب ملخصاً احترافياً ومنظماً بـ HTML داخل <div> واحد.

الملخص يجب أن يشمل:
1. **ما تعلمه الطالب** — المفاهيم والأفكار الرئيسية (نقاط)
2. **أبرز الأمثلة والتطبيقات** — التي مر عليها في الجلسة
3. **نقاط القوة** — ما أجاده الطالب
4. **للمراجعة لاحقاً** — أهم ما يجب تذكره

التنسيق HTML داخل div واحد. ألوان: عناوين #F59E0B، نقاط الإنجاز #10B981.
لا Markdown. لا ** أو #. كل شيء HTML فقط.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `المادة: ${subjectName}\n\nمحادثة الجلسة:\n${conversationText}\n\nاكتب ملخصاً شاملاً لهذه الجلسة.`,
        },
      ],
    });

    const summaryHtml = response.content[0]?.type === "text" ? response.content[0].text : "";

    const [saved] = await db.insert(lessonSummariesTable).values({
      userId,
      subjectId,
      subjectName,
      summaryHtml,
      messagesCount: messagesCount ?? messages.length,
      conversationDate: parsedDate,
    }).returning();

    res.json(saved);
  } catch (err: any) {
    console.error("Summarize error:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.get("/lesson-summaries", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const summaries = await db
    .select()
    .from(lessonSummariesTable)
    .where(eq(lessonSummariesTable.userId, userId))
    .orderBy(desc(lessonSummariesTable.conversationDate));

  res.json(summaries);
});

export default router;
