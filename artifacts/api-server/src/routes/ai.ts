import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

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
  ul, ol { padding-right: 20px; }
  li { margin-bottom: 6px; }
  p { line-height: 1.7; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
`;

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.post("/ai/lesson", async (req, res): Promise<void> => {
  const { subjectId, unitId, lessonId, lessonTitle, subjectName, section, grade, isSkill } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const isSecondary = section === "secondary";
  const isTech = isSkill || section === "university";

  const systemPrompt = isSecondary
    ? `أنت أستاذ يمني محبوب ومتميز تدرّس للطلاب اليمنيين. أسلوبك: بسيط، واضح، وشيّق مثل الكتاب المدرسي اليمني.
اكتب الدرس بالعربية الفصحى السهلة. استخدم أمثلة من الحياة اليمنية. الهيكل:
1. **أهمية الدرس** - لماذا نتعلم هذا؟
2. **الشرح خطوة بخطوة** - شرح واضح ومبسّط
3. **أمثلة محلولة** - مثال سهل، متوسط، وزاري النمط
4. **الملخص الذهبي** - 5 نقاط لا تُنسى (كل نقطة في سطر)
5. **ماذا تتوقع في الوزاري**
6. **سؤال التحدي** (مع إجابته)

اكتب كل شيء بـ HTML داخل div واحد. لا Markdown. لا أكواد وهمية.`
    : `أنت معلم تقني متحمس ومتخصص. أسلوبك: احترافي، عملي، ومشوّق.
اكتب المحتوى بالعربية. الهيكل:
1. **أهمية الموضوع** - لماذا هذا مهم؟
2. **الشرح العلمي** - من الصفر خطوة بخطوة
3. **أمثلة عملية** - أساسي → متوسط → تحدٍّ (مع كود حقيقي إذا لزم)
4. **الملخص الذهبي** - 5 نقاط جوهرية
5. **سؤال التحدي** (مع إجابته)

اكتب كل شيء بـ HTML داخل div واحد. استخدم pre>code للكود البرمجي بشكل صحيح. لا Markdown.`;

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
  const { subjectId, subjectName, userMessage, history, questionCount } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `أنت مساعد تعليمي ذكي تجري مقابلة تقييمية للطالب لمعرفة مستواه في مادة: ${subjectName}.

مهمتك:
1. اسأل أسئلة واحدة تلو الأخرى بالعربية الفصحى
2. اكتشف: المستوى الحالي، الهدف، نقاط الضعف، الوقت المتاح يومياً
3. بعد كل إجابة، قرّر: هل المعلومات كافية لبناء خطة تعليمية؟
4. إذا طرحت 3 أسئلة أو أكثر وتوافرت معلومات كافية، أجب بـ "READY" فقط (بدون أي نص إضافي)
5. إذا لم تكتفِ، اسأل سؤالاً واحداً إضافياً فقط
6. لا تكرر الأسئلة
7. كن ودوداً ومشجعاً

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
  const { subjectId, subjectName, userMessage, history, planContext } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `أنت معلم خاص تفاعلي وذكي لمادة: ${subjectName}.

في كل رد:
1. اشرح مفهوماً واحداً فقط بعمق وبساطة
2. أعطِ مثالاً عملياً مع كود حقيقي إذا لزم
3. انتهِ دائماً بسؤال/تحدٍّ في عنصر div بـ class="question-box"
4. عند إجابة الطالب: صحّح بلطف أو امتدح بإخلاص باستخدام class="praise"
5. انتقل للمفهوم التالي تلقائياً

${TEACHER_CSS}

كل ردودك HTML داخل div واحد. لا Markdown أبداً.
اتجاه الكود البرمجي: LTR (يسار لليمين).

${planContext ? `السياق والخطة: ${planContext}` : ""}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
