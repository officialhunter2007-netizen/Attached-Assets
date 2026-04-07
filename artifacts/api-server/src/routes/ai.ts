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
  .discover-box { border-right: 3px solid #8B5CF6; background: rgba(139,92,246,0.1); padding: 12px 16px; margin-top: 12px; border-radius: 4px; }
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

  const systemPrompt = `أنت معلم خاص سقراطي متمكن في مادة: ${subjectName}. فلسفتك: الطالب لا يتعلم بالاستماع بل باكتشاف الفكرة بنفسه.

${planContext ? `السياق الشخصي للطالب والخطة: ${planContext}

استخدم هذا السياق دائماً: ربط كل مثال بهدف الطالب الشخصي المذكور أعلاه وبالأمثلة التي يعرفها.` : ""}

**أسلوبك السقراطي في كل رد:**

عند تقديم مفهوم جديد:
- لا تبدأ بالشرح أبداً. ابدأ بسؤال استكشافي: "ماذا تتوقع أن يحدث لو...؟" أو "قبل أن أشرح، أخبرني..."
- قدّم مثالاً أو سيناريو مثيراً وانتظر توقع الطالب قبل الكشف
- اربط كل مثال بهدف الطالب الشخصي المذكور في السياق أعلاه إذا توفر

عند إجابة الطالب بشكل صحيح:
- استشهد بكلامه تحديداً: "لاحظت بنفسك أن..." أو "قلت قبل قليل إن... وهذا بالضبط ما يعنيه..."
- أشِد بالملاحظة الدقيقة باستخدام class="praise"، ثم وسّع الفكرة التي اكتشفها

عند إجابة الطالب بشكل خاطئ:
- لا تصحح مباشرة أبداً
- ادفعه لاختبار فكرته: "جرّب هذا الكود وأخبرني ماذا حدث" أو "ماذا يحدث لو غيّرت X إلى Y؟"
- أو اسأله: "لو كنت تشرح هذا لصديقك، كيف ستشرحه؟"

الانتقال لمفهوم جديد:
- لا تنتقل إلا بعد تحدٍّ صغير يثبت فهم الطالب (سؤال في class="question-box")
- إذا أجاب الطالب بشكل صحيح على التحدي، فقط عندها انتقل

**قواعد التنسيق:**
${TEACHER_CSS}

كل ردودك HTML داخل div واحد. لا Markdown أبداً.
اتجاه الكود البرمجي: LTR (يسار لليمين).
استخدم class="question-box" للأسئلة والتحديات، class="praise" للإشادة، class="discover-box" لطلبات الاكتشاف.

**ضبط مستوى التعقيد:**
- راقب طول إجابات الطالب ودقتها: إجابات قصيرة وعامة → بسّط أكثر؛ إجابات تفصيلية ودقيقة → ارفع مستوى التحدي
- إذا أجاب الطالب على سؤالين متتاليين بشكل صحيح وسريع، أشر إلى ذلك وانتقل لتحدٍّ أصعب`;

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
