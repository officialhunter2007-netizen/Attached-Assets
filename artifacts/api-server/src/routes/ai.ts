import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, usersTable, userSubjectSubscriptionsTable, userSubjectFirstLessonsTable, userSubjectPlansTable, lessonSummariesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const FREE_LESSON_MESSAGE_LIMIT = 15;

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

async function getUser(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

// ── Per-subject access check ───────────────────────────────────────────────────
async function getSubjectAccess(userId: number, subjectId: string, user: any) {
  const now = new Date();

  // First lesson for THIS specific subject
  let [firstLessonRecord] = await db
    .select()
    .from(userSubjectFirstLessonsTable)
    .where(and(
      eq(userSubjectFirstLessonsTable.userId, userId),
      eq(userSubjectFirstLessonsTable.subjectId, subjectId)
    ));

  if (!firstLessonRecord) {
    [firstLessonRecord] = await db
      .insert(userSubjectFirstLessonsTable)
      .values({ userId, subjectId, freeMessagesUsed: 0, completed: false })
      .onConflictDoNothing()
      .returning();
    if (!firstLessonRecord) {
      [firstLessonRecord] = await db
        .select()
        .from(userSubjectFirstLessonsTable)
        .where(and(
          eq(userSubjectFirstLessonsTable.userId, userId),
          eq(userSubjectFirstLessonsTable.subjectId, subjectId)
        ));
    }
  }

  // First lesson is available if record exists, not completed, and under message limit
  const isFirstLesson = !firstLessonRecord.completed && firstLessonRecord.freeMessagesUsed < FREE_LESSON_MESSAGE_LIMIT;
  const freeMessagesUsed = firstLessonRecord.freeMessagesUsed;
  const freeMessagesLeft = Math.max(0, FREE_LESSON_MESSAGE_LIMIT - freeMessagesUsed);

  // Per-subject subscription (most recent active one)
  const subjectSubs = await db
    .select()
    .from(userSubjectSubscriptionsTable)
    .where(eq(userSubjectSubscriptionsTable.userId, userId))
    .orderBy(desc(userSubjectSubscriptionsTable.expiresAt));

  const subjectSub = subjectSubs.find(s => s.subjectId === subjectId) ?? null;
  const canAccessViaSubjectSub = !!(
    subjectSub &&
    new Date(subjectSub.expiresAt) > now &&
    subjectSub.messagesUsed < subjectSub.messagesLimit
  );
  const hasActiveSubjectSub = !!(subjectSub && new Date(subjectSub.expiresAt) > now);

  const canAccessViaSubscription = canAccessViaSubjectSub;
  const hasActiveSub = hasActiveSubjectSub;
  const quotaExhausted = hasActiveSub && !canAccessViaSubscription;

  return {
    isFirstLesson,
    canAccessViaSubjectSub,
    canAccessViaLegacyGlobal: false,
    canAccessViaSubscription,
    canAccessViaReferral: false,
    hasActiveSub,
    quotaExhausted,
    subjectSub,
    firstLessonRecord,
    freeMessagesUsed,
    freeMessagesLeft,
  };
}

// Yemen is UTC+3
function getYemenDateString(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function getNextMidnightYemen(): Date {
  const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowYemen = new Date(Date.now() + YEMEN_OFFSET_MS);
  const tomorrowYemen = new Date(nowYemen);
  tomorrowYemen.setUTCHours(0, 0, 0, 0);
  tomorrowYemen.setUTCDate(tomorrowYemen.getUTCDate() + 1);
  return new Date(tomorrowYemen.getTime() - YEMEN_OFFSET_MS);
}

const TEACHER_CSS = `
<style>
  body { background: transparent; font-family: 'Tajawal', 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #e8d5a3; margin: 0; }
  h3 { color: #F59E0B; font-size: 1.2em; margin-bottom: 0.5em; }
  h4 { color: #10B981; font-size: 1.1em; margin-bottom: 0.4em; }
  strong { color: #fde68a; }
  em { color: #6ee7b7; font-style: normal; }
  pre > code { background: #0d1117; color: #89ddff; direction: ltr; text-align: left; display: block; padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; }
  code { background: rgba(245,158,11,0.15); color: #fde68a; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  .question-box { border-right: 3px solid #F59E0B; background: rgba(245,158,11,0.1); padding: 12px 16px; margin-top: 16px; border-radius: 4px; }
  .tip-box { border-right: 3px solid #10B981; background: rgba(16,185,129,0.1); padding: 12px 16px; margin-top: 12px; border-radius: 4px; }
  .praise { color: #10B981; font-weight: bold; }
  .discover-box { border-right: 3px solid #8B5CF6; background: rgba(139,92,246,0.1); padding: 12px 16px; margin-top: 12px; border-radius: 4px; }
  ul, ol { padding-right: 20px; }
  li { margin-bottom: 6px; }
  p { line-height: 1.7; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
`;

router.post("/ai/lesson", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { subjectId, unitId, lessonId, lessonTitle, subjectName, section, grade, isSkill } = req.body;

  const access = await getSubjectAccess(userId, subjectId ?? "unknown", user);

  if (!access.isFirstLesson && !access.canAccessViaSubscription) {
    res.status(403).json({ error: "ACCESS_DENIED", firstLessonDone: true });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const isSecondary = section === "secondary";
  const isTech = isSkill || section === "university";

  const systemPrompt = isSecondary
    ? `أنت أستاذ يمني متميز تدرّس للطلاب اليمنيين بأسلوب سقراطي يثير الفضول ويجعل الطالب يكتشف المعرفة بنفسه.
اكتب الدرس بالعربية الفصحى السهلة. استخدم أمثلة من الحياة اليمنية. الهيكل:

1. **السؤال الاستفزازي** - ابدأ بسؤال يثير الدهشة ويكسر اليقين (مثال: "ماذا لو أخبرتك أن...؟" أو "تخيّل أن...")، لا تُعطِ الإجابة فوراً
2. **اكتشف بنفسك** - تجربة ذهنية أو عملية يمكن للطالب تنفيذها قبل الشرح، مع تساؤل: "ماذا تتوقع أن يحدث؟"
3. **الكشف التدريجي** - شرح يبني على توقعات الطالب خطوة بخطوة، ويقول: "الآن تذكّر توقعك... هل كنت محقاً؟"
4. **أمثلة محلولة** - مثال سهل، متوسط، وزاري النمط (كل مثال يبدأ بسؤال قبل الحل)
5. **الملخص الذهبي** - 5 نقاط لا تُنسى (كل نقطة في سطر)
6. **ماذا تتوقع في الوزاري**
7. **تحدي الاكتشاف** - سؤال يدفع الطالب لتطبيق المفهوم بطريقة جديدة (مع إجابته مخفية تحته)

اكتب كل شيء بـ HTML داخل div واحد. لا Markdown. لا أكواد وهمية.
استخدم class="discover-box" لقسم "اكتشف بنفسك" وclass="question-box" للأسئلة.`
    : `أنت معلم تقني متميز تدرّس بأسلوب سقراطي يثير الفضول ويجعل الطالب يكتشف المفاهيم قبل أن تشرحها.
اكتب المحتوى بالعربية. الهيكل:

1. **اللغز المفتوح** - ابدأ بمشكلة حقيقية أو سيناريو مثير يجعل الطالب يتساءل (لا تُعطِ الإجابة)، مثال: "تخيّل أن سيستمك تعرّض لهجوم وأنت نائم، ماذا كنت ستفعل لو..."
2. **اكتشف بنفسك** - تجربة يمكن تنفيذها أو سؤال فكري: "ماذا تتوقع أن يحدث لو كتبت هذا الكود؟"، اترك الطالب يفكر قبل الشرح
3. **الكشف التدريجي** - شرح يبني على التوقع ويقارنه بالواقع: "الآن جرّب ما توقعته... هل حدث ما خططت له؟"
4. **أمثلة عملية** - أساسي → متوسط → تحدٍّ (كل مثال يبدأ بسؤال: "ماذا تتوقع أن يطبع هذا الكود؟")، مع كود حقيقي
5. **الملخص الذهبي** - 5 نقاط جوهرية
6. **تحدي الاكتشاف** - سؤال يدفع الطالب لتطبيق المفهوم في سياق جديد مع إجابته

اكتب كل شيء بـ HTML داخل div واحد. استخدم pre>code للكود البرمجي. لا Markdown.
استخدم class="discover-box" لقسم "اكتشف بنفسك" وclass="question-box" للأسئلة.`;

  const userMessage = `اكتب درساً شاملاً عن:
المادة: ${subjectName}
الوحدة: ${unitId}
الدرس: ${lessonTitle}
${grade ? `الصف: ${grade}` : ""}
القسم: ${section}`;

  let fullContent = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
  res.end();
});

router.post("/ai/interview", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, subjectName, userMessage, history, questionCount } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `أنت محاور تعليمي ذكي تجري مقابلة استكشافية دقيقة مع الطالب لمعرفة مستواه الحقيقي في مادة: ${subjectName}.

هدفك ليس مجرد معرفة "المستوى العام"، بل بناء صورة دقيقة وحيّة عن:
- **أمثلة محددة يعرفها الطالب فعلاً** من تجربته الخاصة (وليس تصريحه عن نفسه)
- **تجارب سابقة** مررَ بها مع هذه المادة: ماذا جرّب؟ ماذا نجح معه؟ ماذا أربكه؟
- **هدفه الشخصي الحقيقي**: ما المشكلة التي يريد حلها؟ ما المشروع الذي يحلم به؟
- **نقاط قوته الفعلية** من خلال ما يصفه، لا من خلال تقييمه لنفسه

أسلوب المقابلة (مهم جداً):
- اسأل سؤالاً واحداً فقط في كل مرة، مُصاغاً بطريقة تجعل الطالب يُعطي مثالاً أو يصف موقفاً
- بعد كل إجابة، استخدم ما قاله الطالب بالضبط لتعمّق أكثر أو تنتقل للجانب التالي
- مثال على أسئلة جيدة: "ما آخر شيء حاولت تنفيذه في [المادة]؟" / "أعطني مثالاً على شيء فهمته تماماً في هذه المادة"
- تجنب الأسئلة المغلقة مثل: "هل أنت مبتدئ؟" أو "هل تعرف X؟"

قواعد المقابلة:
1. اسأل سؤالاً واحداً فقط في كل رسالة، بالعربية الفصحى الودودة
2. لا تكرر أسئلة تمت الإجابة عليها
3. كن فضولياً وودوداً، وأظهر اهتماماً حقيقياً بما يقوله الطالب
4. إذا طرحت 4 أسئلة أو أكثر وتوافرت معلومات كافية (مستوى واضح + هدف شخصي + مثال محدد + وقت متاح)، أجب بـ "READY" فقط
5. إذا لم تكتمل الصورة، اسأل سؤالاً واحداً إضافياً يُعمّق المعلومات الناقصة

عدد الأسئلة المطروحة حتى الآن: ${questionCount}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, isReady: fullResponse.startsWith("READY") })}\n\n`);
  res.end();
});

router.post("/ai/build-plan", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { subjectId, subjectName, userName, interviewSummary } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `أنت خبير تربوي يصمم خططاً دراسية مخصصة. أنشئ خطة HTML احترافية وجميلة.

المتطلبات:
- HTML كامل مع CSS مضمّن
- خلفية: #0f1117
- العناوين: #F59E0B (ذهبي)
- التفاصيل: #10B981 (زمردي)
- المراحل: بنفسجي
- النصوص: #e8d5a3
- خاطب الطالب باسمه شخصياً
- المحتوى الإلزامي:
  1. تحليل مستوى الطالب
  2. خطة مراحل (3 مراحل مثلاً)
  3. جدول أسبوعي تفصيلي
  4. توزيع الوقت اليومي
  5. الموارد المقترحة
  6. الهدف النهائي

اجعل التصميم فاخراً ومحفزاً. استخدم خط Tajawal/Cairo.`;

  const userMessage = `اسم الطالب: ${userName}
المادة: ${subjectName}
ملخص المقابلة: ${interviewSummary}

أنشئ خطة دراسية HTML احترافية كاملة.`;

  let fullContent = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
  res.end();
});

router.post("/ai/teach", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await getUser(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { subjectId, subjectName, userMessage, history, planContext, stages, currentStage, isDiagnosticPhase, hasCoding = true } = req.body;

  const access = await getSubjectAccess(userId, subjectId ?? "unknown", user);
  const { isFirstLesson, canAccessViaSubscription, hasActiveSub, quotaExhausted, subjectSub, firstLessonRecord } = access;
  const isNewSession = !userMessage;

  // ── Session limit (1 session per day, resets at midnight Yemen time) ──
  if (isNewSession && canAccessViaSubscription) {
    const today = getYemenDateString();
    if (user.lastSessionDate === today) {
      const nextSessionAt = getNextMidnightYemen().toISOString();
      res.status(429).json({ code: "DAILY_LIMIT", nextSessionAt });
      return;
    }
  }

  // ── Streak + session tracking — all users (first-lesson, subscription) ──
  if (isNewSession && (isFirstLesson || canAccessViaSubscription)) {
    const today = getYemenDateString();
    const yesterdayMs = Date.now() + 3 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000;
    const yesterday = new Date(yesterdayMs).toISOString().slice(0, 10);
    const lastActive = user.lastActive ?? null;
    let newStreak = user.streakDays ?? 0;

    if (lastActive === today) {
      // already active today — no streak change
    } else if (lastActive === yesterday) {
      newStreak = newStreak + 1;
    } else {
      newStreak = 1;
    }

    await db.update(usersTable)
      .set({
        lastSessionDate: today,
        lastSessionAt: new Date(),
        streakDays: newStreak,
        lastActive: today,
      })
      .where(eq(usersTable.id, userId));
  }

  // ── Access gate ─────────────────────────────────────────────────────────────
  if (!isFirstLesson && !canAccessViaSubscription) {
    if (!hasActiveSub) {
      res.status(403).json({ error: "ACCESS_DENIED", firstLessonDone: true });
      return;
    }
    const stagesArr = stages ?? [];
    const farewell = `<div><p>لقد استنفدت رصيدك من الرسائل لهذا التخصص 😔</p><p>سأُنهي جلستنا هنا — يمكنك مراجعة ملخصها في لوحة التحكم.</p><p>لمواصلة التعلم، جدّد اشتراكك في هذه المادة من صفحة الاشتراكات.</p></div>`;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ content: farewell })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, stageComplete: true, nextStage: stagesArr.length, quotaExhausted: true, messagesRemaining: 0 })}\n\n`);
    res.end();
    return;
  }

  // ── Increment message counter ──────────────────────────────────────────────
  if (isFirstLesson && firstLessonRecord) {
    const newCount = firstLessonRecord.freeMessagesUsed + 1;
    const isNowComplete = newCount >= FREE_LESSON_MESSAGE_LIMIT;
    await db.update(userSubjectFirstLessonsTable)
      .set({
        freeMessagesUsed: sql`${userSubjectFirstLessonsTable.freeMessagesUsed} + 1`,
        ...(isNowComplete ? { completed: true } : {}),
      })
      .where(eq(userSubjectFirstLessonsTable.id, firstLessonRecord.id));
    if (isNowComplete) {
      await db.update(usersTable)
        .set({ firstLessonComplete: true })
        .where(eq(usersTable.id, userId));
    }
  } else if (canAccessViaSubscription) {
    if (access.canAccessViaSubjectSub && subjectSub) {
      await db.update(userSubjectSubscriptionsTable)
        .set({ messagesUsed: subjectSub.messagesUsed + 1 })
        .where(eq(userSubjectSubscriptionsTable.id, subjectSub.id));
    }
  }

  // ── Load persisted plan + last 2 session summaries from DB ───────────────
  let dbPlanContext = planContext ?? null;
  let sessionContextNote = "";
  if (!isDiagnosticPhase && subjectId) {
    const [dbPlan] = await db
      .select()
      .from(userSubjectPlansTable)
      .where(and(
        eq(userSubjectPlansTable.userId, userId),
        eq(userSubjectPlansTable.subjectId, subjectId)
      ));
    if (dbPlan && !dbPlanContext) {
      dbPlanContext = dbPlan.planHtml;
    }

    const recentSummaries = await db
      .select()
      .from(lessonSummariesTable)
      .where(and(
        eq(lessonSummariesTable.userId, userId),
        eq(lessonSummariesTable.subjectId, subjectId)
      ))
      .orderBy(desc(lessonSummariesTable.conversationDate))
      .limit(2);

    if (recentSummaries.length > 0) {
      sessionContextNote = `\n--- ملخصات الجلسات السابقة (آخر ${recentSummaries.length} جلسات) ---\n` +
        recentSummaries.map((s, i) => `الجلسة السابقة ${recentSummaries.length - i}:\n${s.title ? `العنوان: ${s.title}\n` : ""}${s.summaryHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 800)}`).join("\n\n") +
        "\n---\nابدأ الجلسة بالإشارة باختصار إلى ما تعلمه الطالب في آخر جلسة، ثم انتقل مباشرةً للمرحلة الحالية.\n---";
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stageCount = stages?.length || 3;
  const stageIdx = currentStage ?? 0;
  const currentStageName = stages?.[stageIdx] || `المرحلة ${stageIdx + 1}`;
  const nextStageName = stages?.[stageIdx + 1];

  const codingRules = hasCoding ? `
- الكود البرمجي داخل <pre><code> واتجاهه LTR
- **مهم جداً — تحديات الكتابة:** عندما تطلب من الطالب كتابة كود أو تطبيق برمجي، ضع دائماً مثالاً أو هيكلاً للكود داخل <pre><code>...</code></pre> كنقطة بداية. مثال: <pre><code>def greet(name):
    # اكتب كودك هنا
    pass</code></pre>
- **إرشاد الطالب لاستخدام IDE — إلزامي عند كل تحدٍّ برمجي:** في نهاية كل تحدٍّ برمجي، أضف دائماً فقرة إرشادية قصيرة تشرح له كيف يكتب الكود، مثل:
  <div class="tip-box">💡 <strong>كيف تكتب الكود؟</strong> اضغط على زر <strong>«فتح IDE»</strong> في أعلى نافذة المحادثة ← اضغط <strong>«+»</strong> لإنشاء ملف جديد ← اكتب اسم الملف بامتداد اللغة المطلوبة (مثلاً <code>main.py</code> لبايثون، أو <code>main.js</code> لجافاسكريبت، أو <code>main.kt</code> لكوتلن) ← سيتعرف IDE تلقائياً على لغة البرمجة من الامتداد ← اكتب كودك وانقر «تشغيل ▶».</div>
- **اللغات المدعومة في IDE المنصة (مرتبطة بالمنهج):** HTML, CSS, JavaScript, TypeScript, Python, Java, C++, C, Dart, Kotlin, Bash, SQL.
- **ميزة معاينة صفحات الويب الحية (Live Preview) — لمواد HTML وCSS وJavaScript فقط:** عندما يكون التحدي متعلقاً بتصميم صفحة ويب (HTML أو CSS أو JavaScript)، أرشد الطالب دائماً لاستخدام ميزة المعاينة الحية:
  <div class="tip-box">🌐 <strong>معاينة صفحتك!</strong> بعد كتابة كود HTML أو CSS أو JavaScript، اضغط زر <strong>«معاينة 👁»</strong> الأخضر لرؤية صفحتك الحقيقية مباشرة! يمكنك إنشاء عدة ملفات (مثلاً <code>index.html</code> + <code>style.css</code> + <code>script.js</code>) وسيتم دمجها تلقائياً في المعاينة. إذا كانت هناك أخطاء ستظهر في سجل الأخطاء أسفل المعاينة. يمكنك أيضاً الضغط على «شارك مع المعلم» لأراجع عملك وأساعدك!</div>
- **عند مراجعة كود الطالب من المعاينة:** إذا شارك الطالب معاينته معك (ستصلك الملفات + سجل الأخطاء)، راجع الكود بعناية: صحح الأخطاء، اقترح تحسينات، وامدح الأجزاء الجيدة. إذا كان هناك أخطاء JavaScript، اشرح سبب كل خطأ وكيفية إصلاحه بلغة بسيطة.
- **إذا كان التحدي يتطلب لغة غير مدعومة** (مثل Swift, Go, Rust, Ruby, PHP, R, Elixir, MATLAB, Assembly, Haskell, وغيرها): اعترف بذلك واسأل الطالب سؤالاً واحداً: "هل أنت الآن على هاتف أم كمبيوتر؟" ثم:
  - **إذا كمبيوتر:** أرشده بوضوح لتثبيت VS Code + امتداد اللغة، أو استخدام موقع مجاني مثل replit.com. مثال: <div class="tip-box">💻 <strong>على الكمبيوتر:</strong> ثبّت VS Code من code.visualstudio.com ثم ثبّت امتداد اللغة المطلوبة، أو استخدم replit.com مباشرةً من المتصفح بدون تثبيت.</div>
  - **إذا هاتف:** أرشده لتطبيقات مناسبة. مثال: <div class="tip-box">📱 <strong>على الهاتف:</strong> جرّب تطبيق <strong>Dcoder</strong> (Android/iOS) أو <strong>Replit</strong> — كلاهما مجاني ويدعم عشرات اللغات.</div>
  - **بديل دائم — المحاكاة داخل المحادثة:** بغض النظر عن الجهاز، اعرض على الطالب أن تسير معه خطوة بخطوة: "يمكنني أن أريك الكود كاملاً وأشرح كل سطر هنا في المحادثة، ثم تكتبه أنت في بيئتك وتخبرني بالنتيجة." إذا وافق، اشرح الكود سطراً سطراً واطلب منه لصق المخرجات أو وصفها هنا.` : `
- **هذه المادة ليست برمجية:** لا تُعطِ أي تحدٍّ يتطلب كتابة كود برمجي أو استخدام بيئة برمجة. ركّز على الفهم النظري والتطبيق العملي في سياق المادة فقط.${subjectId === "uni-food-eng" ? `
- **مختبر الهندسة الغذائية متاح!** المنصة تحتوي على مختبر غذائي تفاعلي (زر 🔬 «المختبر» في أعلى المحادثة) يحتوي على:
  1. **حاسبة المعاملات الحرارية** — لحساب D-value وF-value وزمن التعقيم عند درجات حرارة مختلفة
  2. **حاسبة النشاط المائي (Aw)** — لمعرفة خطر نمو الكائنات الدقيقة في غذاء معين
  3. **حاسبة التركيب الغذائي** — لحساب السعرات الحرارية وتوزيع المغذيات
  4. **حاسبة زمن البسترة** — لحساب الزمن المطلوب للبسترة عند درجة حرارة معينة
  5. **رسوم بيانية تفاعلية** — منحنى النمو البكتيري ومنحنى الموت الحراري ومخطط النشاط المائي
  6. **مُنشئ مخطط HACCP** — لبناء مخطط تدفق العملية وتحديد نقاط التحكم الحرجة
- **إرشاد الطالب للمختبر — إلزامي عند التطبيق العملي:** عندما تشرح مفهوماً يمكن حسابه أو تطبيقه عملياً، وجّه الطالب للمختبر هكذا:
  <div class="tip-box">🔬 <strong>جرّب بنفسك!</strong> اضغط على زر <strong>«المختبر»</strong> 🔬 في أعلى المحادثة ← اختر <strong>«الحاسبات»</strong> ← استخدم حاسبة المعاملات الحرارية لحساب F-value. بعد ما تحصل على النتيجة، اضغط <strong>«شارك النتيجة مع المعلم»</strong> وسأراجعها معك.</div>
- **عند استلام نتائج من المختبر:** إذا أرسل الطالب نتائج من المختبر الغذائي، حلّلها وعلّق عليها بالتفصيل: هل الحسابات صحيحة؟ ما دلالتها العملية؟ كيف يمكن تحسينها؟` : ""}${subjectId === "skill-yemensoft" ? `
- **البيئة التطبيقية ليمن سوفت متاحة!** المنصة تحتوي على بيئة محاكاة تطبيقية (زر 🏢 «البيئة التطبيقية» في أعلى المحادثة) تحتوي على:
  1. **القيود المحاسبية** — إنشاء قيود يدوية بأطراف مدينة ودائنة مع التحقق من التوازن وترحيلها لشجرة الحسابات
  2. **شجرة الحسابات** — عرض شجري كامل (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات) مع إمكانية إضافة حسابات جديدة ومتابعة الأرصدة
  3. **الفواتير** — إنشاء فواتير مبيعات ومشتريات (نقدي/آجل) مع تأثيرها التلقائي على الحسابات والمخزون
  4. **المخزون** — إدارة الأصناف وتنفيذ حركات إدخال وإخراج مع حساب المتوسط المرجح تلقائياً
  5. **ميزان المراجعة** — عرض ميزان المراجعة وقائمة الدخل المختصرة والمركز المالي
- **إرشاد الطالب للبيئة التطبيقية — إلزامي عند كل تطبيق عملي:** عندما تشرح مفهوماً محاسبياً يمكن تطبيقه عملياً، وجّه الطالب للبيئة هكذا:
  <div class="tip-box">🏢 <strong>طبّق بنفسك!</strong> اضغط على زر <strong>«البيئة التطبيقية»</strong> 🏢 في أعلى المحادثة ← اختر القسم المناسب (القيود / الفواتير / المخزون) ← نفّذ العملية المطلوبة. بعد ما تنتهي، اضغط <strong>«شارك مع المعلم»</strong> وسأراجع عملك معك.</div>
- **أمثلة على توجيهات عملية:**
  - عند شرح القيود: "سجّل قيد شراء بضاعة بقيمة 500,000 ريال نقداً"
  - عند شرح المبيعات: "أنشئ فاتورة مبيعات بالآجل للعميل شركة النور"
  - عند شرح المخزون: "أضف صنف جديد وسجّل سند إدخال بـ 50 وحدة"
  - عند شرح ميزان المراجعة: "افتح ميزان المراجعة وتحقق أنه متوازن"
- **عند استلام نتائج من البيئة التطبيقية:** إذا أرسل الطالب نتائج، حلّلها بالتفصيل: هل القيد صحيح ومتوازن؟ هل الحسابات المستخدمة مناسبة؟ هل التصنيف صحيح؟ قدّم ملاحظات تصحيحية إن لزم الأمر.` : ""}`;

  const formattingRules = `**قواعد التنسيق (مهم جداً):**
- كل ردودك HTML داخل <div> واحد فقط. لا Markdown أبداً.
- class="question-box" → للأسئلة والتحديات (إطار ذهبي)
- class="praise" → للإشادة بالطالب (أخضر)
- class="discover-box" → لطلبات الاكتشاف (بنفسجي)
- class="tip-box" → للتلميحات والنصائح
${codingRules}
- لا تستخدم ** أو # أو أي Markdown`;

  const diagnosticSystemPrompt = `أنت معلم خاص متمكن في مادة: ${subjectName}. هذه أول جلسة للطالب في هذه المادة ومهمتك الآن معرفة مستواه وبناء خطة مخصصة له.

**المرحلة الأولى — التشخيص (3 أسئلة فقط):**
- رسالتك الأولى: رحّب بالطالب بحماس واسأله سؤالاً واحداً فقط عن مستواه الحالي في المادة (مثل: هل سبق لك دراستها؟ ما الذي تعرفه عنها؟).
- بعد إجابته: اسأله عن هدفه المحدد (ماذا يريد أن يُتقن أو يحقق من هذه المادة).
- بعد إجابته الثانية: اسأله عن التحدي أو السبب الأكبر الذي يجعل هذه المادة صعبة عليه.
- لا تطرح أكثر من 3 أسئلة. كل سؤال في رسالة منفصلة.

**المرحلة الثانية — عرض الخطة:**
بعد جمع الإجابات الثلاث، اعرض خطة تعليمية مخصصة شاملة تحتوي على:
1. تشخيص مستوى الطالب بكلمتين
2. هدف الخطة
3. مراحل التعلم المرتبة (5-7 مراحل) مع وصف قصير لكل مرحلة
4. توقع زمني مقترح لكل مرحلة

اختم الخطة بهذا السطر بالضبط على سطر منفرد: [PLAN_READY]
ثم قل: "هل أنت مستعد؟ لنبدأ بالمرحلة الأولى!"

**قاعدة:** لا تبدأ التدريس الفعلي أبداً قبل [PLAN_READY].

${formattingRules}`;

  const teachingSystemPrompt = `أنت معلم خاص متمكن في مادة: ${subjectName}. فلسفتك: الطالب لا يستطيع الإجابة على سؤال لم يفهم سياقه بعد — لذلك تشرح دائماً قبل أن تسأل.

${dbPlanContext ? `--- خطة الطالب الشخصية ---\n${dbPlanContext}\n---\n` : ""}
${sessionContextNote}

**التزام صارم بالخطة:** ابقَ دائماً ضمن مراحل الخطة الشخصية للطالب بالترتيب. لا تتجاوز إلى موضوع خارج المرحلة الحالية. إذا حاول الطالب الانحراف، أعده بلطف إلى المرحلة الحالية.

**الجلسة الحالية:**
- المرحلة الحالية (${stageIdx + 1}/${stageCount}): "${currentStageName}"
${nextStageName ? `- المرحلة التالية: "${nextStageName}" (لا تنتقل إليها حتى يُتقن الطالب الحالية)` : "- هذه المرحلة الأخيرة"}

**أسلوبك في التدريس (التزم به في كل رد):**

قاعدة ذهبية: **لا تطرح سؤالاً على الطالب إذا لم تُعطِه السياق الكافي للإجابة عليه أولاً.**

بنية كل رد تعليمي:
1. **الشرح أولاً** — اشرح المفهوم بمثال واقعي ملموس من الحياة اليومية أو من مجال الطالب. قل: "دعني أُوضّح لك أولاً..."
2. **المثال العملي** — قدّم مثالاً محدداً يُجسّد الفكرة قبل أي سؤال
3. **التساؤل المبني على السياق** — بعد الشرح فقط، اطرح سؤالاً تفاعلياً يبني على ما شرحت. قل: "الآن بعد ما شرحت... ماذا تتوقع أن يحدث لو؟"
4. عند الإجابة الصحيحة: قل "لاحظت بنفسك أن..." واستشهد بكلام الطالب تحديداً
5. عند الإجابة الخاطئة: لا تصحح مباشرة — أعده إلى المثال: "تذكّر المثال الذي ذكرناه... ماذا حدث فيه؟"
6. إذا أجاب الطالب على تحديين متتاليين بشكل صحيح → ضع [STAGE_COMPLETE] في آخر ردك ثم قل بوضوح "انتهينا من هذه المرحلة!"
7. إذا طلب الطالب الإنهاء أو قال وداعاً أو أراد التوقف → لخّص ما تعلمه اليوم ثم ضع [STAGE_COMPLETE] في آخر ردك حتماً. **لا تقل وداعاً أبداً بدون [STAGE_COMPLETE].**

${formattingRules}`;

  const systemPrompt = isDiagnosticPhase ? diagnosticSystemPrompt : teachingSystemPrompt;

  const claudeMessages = history.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content || " ",
  }));
  if (userMessage) {
    claudeMessages.push({ role: "user" as const, content: userMessage });
  } else if (claudeMessages.length === 0) {
    const initPrompt = isDiagnosticPhase
      ? `ابدأ جلسة التشخيص`
      : `ابدأ تدريسي في مرحلة: ${currentStageName}`;
    claudeMessages.push({ role: "user" as const, content: initPrompt });
  }

  let fullResponse = "";
  let stageComplete = false;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: claudeMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const text = event.delta.text;
      fullResponse += text;
      const clean = text.replace("[STAGE_COMPLETE]", "").replace("[PLAN_READY]", "");
      if (clean) res.write(`data: ${JSON.stringify({ content: clean })}\n\n`);
    }
  }

  stageComplete = fullResponse.includes("[STAGE_COMPLETE]");
  const planReady = fullResponse.includes("[PLAN_READY]");
  let messagesRemaining: number | null = null;
  if (isFirstLesson && firstLessonRecord) {
    messagesRemaining = Math.max(0, FREE_LESSON_MESSAGE_LIMIT - (firstLessonRecord.freeMessagesUsed + 1));
  } else if (canAccessViaSubscription) {
    if (access.canAccessViaSubjectSub && subjectSub) {
      messagesRemaining = Math.max(0, subjectSub.messagesLimit - (subjectSub.messagesUsed + 1));
    }
  }
  const isQuotaExhausted = messagesRemaining === 0;
  res.write(`data: ${JSON.stringify({ done: true, stageComplete, nextStage: stageComplete ? stageIdx + 1 : stageIdx, messagesRemaining, planReady, quotaExhausted: isQuotaExhausted })}\n\n`);
  res.end();
});

router.post("/ai/run-code", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { code, language } = req.body as { code: string; language: string };
  if (!code || !language) return res.status(400).json({ error: "Missing code or language" });

  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const { mkdtemp, writeFile, rm } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const execAsync = promisify(exec);
  const TIMEOUT = 8000;
  const MAX_BUF = 1024 * 100;

  async function runInTempDir(
    filename: string,
    buildCmd: (dir: string) => string,
    runCmd: (dir: string) => string
  ) {
    const dir = await mkdtemp(join(tmpdir(), "nukhba-"));
    try {
      await writeFile(join(dir, filename), code, "utf8");
      try {
        await execAsync(buildCmd(dir), { timeout: TIMEOUT, maxBuffer: MAX_BUF });
      } catch (e: any) {
        return { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
      }
      try {
        const { stdout, stderr } = await execAsync(runCmd(dir), { timeout: TIMEOUT, maxBuffer: MAX_BUF });
        return { output: stdout, error: stderr, exitCode: 0 };
      } catch (e: any) {
        return { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  try {
    let result: { output: string; error: string; exitCode: number };

    // ── Interpreted / direct-run languages ──────────────────────────────
    if (language === "python") {
      result = await runInTempDir("main.py", (_d) => "true", (d) => `python3 ${join(d, "main.py")}`);
    } else if (language === "javascript") {
      result = await runInTempDir("main.js", (_d) => "true", (d) => `node ${join(d, "main.js")}`);
    } else if (language === "typescript") {
      result = await runInTempDir("main.ts", (_d) => "true",
        (d) => `npx --yes ts-node --skip-project --compiler-options '{"module":"commonjs","esModuleInterop":true}' ${join(d, "main.ts")}`);
    } else if (language === "bash") {
      result = await runInTempDir("script.sh", (_d) => "true", (d) => `bash ${join(d, "script.sh")}`);
    } else if (language === "sql") {
      result = await runInTempDir("main.sql", (_d) => "true", (d) => `sqlite3 :memory: < ${join(d, "main.sql")}`);
    } else if (language === "dart") {
      result = await runInTempDir("main.dart", (_d) => "true", (d) => `dart run ${join(d, "main.dart")}`);

    // ── Compiled languages ──────────────────────────────────────────────
    } else if (language === "cpp") {
      result = await runInTempDir("main.cpp",
        (d) => `g++ -o ${join(d, "out")} ${join(d, "main.cpp")}`,
        (d) => join(d, "out"));
    } else if (language === "c") {
      result = await runInTempDir("main.c",
        (d) => `gcc -o ${join(d, "out")} ${join(d, "main.c")}`,
        (d) => join(d, "out"));

    // ── JVM languages (Java / Kotlin) ────────────────────────────────────
    } else if (language === "java") {
      const dir = await mkdtemp(join(tmpdir(), "nukhba-"));
      try {
        await writeFile(join(dir, "Main.java"), code, "utf8");
        try {
          await execAsync(`javac ${join(dir, "Main.java")}`, { timeout: TIMEOUT, maxBuffer: MAX_BUF });
        } catch (e: any) {
          result = { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
          return res.json(result);
        }
        try {
          const { stdout, stderr } = await execAsync(`java -cp ${dir} Main`, { timeout: TIMEOUT, maxBuffer: MAX_BUF });
          result = { output: stdout, error: stderr, exitCode: 0 };
        } catch (e: any) {
          result = { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    } else if (language === "kotlin") {
      const dir = await mkdtemp(join(tmpdir(), "nukhba-"));
      try {
        await writeFile(join(dir, "Main.kt"), code, "utf8");
        try {
          await execAsync(`kotlinc ${join(dir, "Main.kt")} -include-runtime -d ${join(dir, "out.jar")}`, { timeout: 45000, maxBuffer: MAX_BUF });
        } catch (e: any) {
          result = { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
          return res.json(result);
        }
        try {
          const { stdout, stderr } = await execAsync(`java -jar ${join(dir, "out.jar")}`, { timeout: TIMEOUT, maxBuffer: MAX_BUF });
          result = { output: stdout, error: stderr, exitCode: 0 };
        } catch (e: any) {
          result = { output: e.stdout || "", error: e.stderr || e.message, exitCode: 1 };
        }
      } finally {
        await rm(dir, { recursive: true, force: true });
      }

    } else {
      return res.status(400).json({ error: `اللغة غير مدعومة: ${language}` });
    }

    return res.json(result);
  } catch (e: any) {
    return res.json({ output: "", error: e.message || "خطأ غير معروف", exitCode: 1 });
  }
});

export default router;
