# هندسة التوجيهات في منصة نُخبة — تقرير تقني شامل من الكود الفعلي

---

## المبدأ الجوهري

المشكلة الحقيقية التي تحلّها هذه الهندسة: *نموذج Gemini Flash Lite ضعيف بطبيعته*. لو تُرك وحده، سينسى نقاط الضعف، يختار مفاهيم عشوائية، ويُصدر وسوم الإتقان بلا معنى. الحل: **نقل الذكاء التعليمي كله إلى كود حتمي في السيرفر**، ثم إخبار النموذج بالضبط ماذا يفعل هذا الدور.

---

## 1. نقطة الدخول — تسلسل POST /api/v4/teach

الملف: `artifacts/api-server/src/routes/v4_teach.ts`

```
[1] تحقق الهوية + CSRF (requireUser + requireSameOriginCsrf)
    ← X-Nukhba-Csrf header + مطابقة Origin/Host

[2] استدعاء getTeacherProviderOverride()
    ← cache ذاكرة 30 ثانية (قفل ألغي عند حفظ الإعدادات)
    ← إذا لم يكن مزوّد مخصص: assertGeminiForTeaching(V4_TEACHING_MODEL)
       — يرفض أي نموذج ليس في مجموعة {"gemini-2.5-flash-lite", "gemini-2.5-flash"}

[3] تحليل الطلب:
    requestId = "v4t_" + Date.now() + randomBytes(8).hex  ← دائماً من السيرفر
    history[] ← مصفّى: role user|assistant فقط، content string

[4] resolveActiveSpecialty(slug)   ← specialty + versionId
    getStudentPath(uid, slug)      ← unlockedLessonCodes[]
    syncStudentPathToActiveVersion ← مزامنة تلقائية مع أحدث إصدار
    تحقق: lessonCode ∈ unlockedLessonCodes   ← وإلا 403

[5] canAffordV4Turn(uid, slug)
    ← إذا فشل: SSE terminal بـ {done:true, insufficientGems:true}
    ← بدون أي استدعاء AI

[6] قفل الدورة المتزامنة:
    inflightTeachTurns.add(walletKey)
    ← رفض أي طلب ثانٍ متزامن لنفس (user, subject)
    ← يُلغى بـ finally حتى على الأعطال

[7] getOrGenerateLessonContent()  ← lazy gen + cache
    buildTeacherSystemPrompt()    ← 9+ طبقات ← القلب
    classifyV4Turn()              ← تصنيف الدور + سقف الرموز

[8] streamGeminiTeaching()        ← SSE chunks

[9] chargeV4Ai() + parseProtocolTags() + applyTagEffects()

[10] حدث terminal: {done:true, effects, balanceAfter, ...}
```

---

## 2. توليد المحتوى الكسول — Race-Safe

الملف: `v4-teaching-core.ts::getOrGenerateLessonContent()`

أول طالب يفتح درساً يُشغّل هذا المسار:

```
1. SELECT سريع من v4_lesson_content_cache
   → إذا وُجد: أعطِه مجاناً (cache hit، الحالة الشائعة)

2. إذا لم يوجد:
   INSERT placeholder (skeleton من buildFallbackContent)
   ON CONFLICT DO NOTHING RETURNING id

   → نجح RETURNING (رقم موجود):  WIN
     • generateGeminiJson() ← prompt توليد المحتوى
     • maxOutputTokens: 3600 (رُفع من 2400 لشروح كاملة)
     • temperature: 0.4
     • timeoutMs: 40_000
     • chargeV4Ai(winner) ← التكلفة الوحيدة

   → فارغ RETURNING:  LOSE
     • SELECT ما خزّنه الفائز (placeholder أو الكامل)
     • لا تكلفة، لا انتظار
```

**Fallback ذكي**: إذا فشل Gemini في التوليد، يبقى placeholder محفوظاً في الـ cache ولا تتوقف الجلسة.

---

## 3. بناء التوجيه — الترتيب الفعلي

الكود من السطر 790 في `v4-teaching-core.ts`:

```typescript
const layers = [L1, L2, L3, L4, L5, L6, L7, L8, L9, LVIZ, LSCENE, LIMG, LWEBPHOTO];
if (L3A) layers.splice(3, 0, L3A);   // بين L3 و L4
if (LCODE) layers.push(LCODE);       // بعد LWEBPHOTO
if (LOPEN) layers.push(LOPEN);       // بعد LCODE (أول دور فقط)
if (LDIAG) layers.push(LDIAG);       // الأخير دائماً — الأكثر طاعةً
```

---

## 4. الطبقات بالتفصيل الكامل

### الطبقة L1 — الشخصية وقواعد الإخراج

**العنوان**: `## 1. الشخصية وقواعد الإخراج والوسوم البروتوكولية`

**الهوية الثابتة**:
```
أنت معلم نُخبة الذكي — مهمتك أن تكون أمتع وأوضح معلّم عربي على الإطلاق،
تتفوّق على كل المنصات التعليمية العربية في بساطة الشرح ومتعة التعلّم.
منهج «توقّع ثم اكشف» (Socratic + predict-then-reveal)
```

**v4.1 (اختياري)**: إذا حمل ملف التعليمات `target_persona` و `teacher_tone`:
```
الجمهور المستهدف: <قيمة target_persona>
نبرة المعلم المطلوبة: <قيمة teacher_tone>
```

**معرفة الطالب** (تُحقن من DB):
```
المستوى البدائي: [startingLevelLabel]
إجابات التشخيص:
  1. س: [سؤال التشخيص]   ج: [إجابة الطالب]
  2. ...
```

**قواعد ASK_OPTIONS الحرجة (كاملة من الكود)**:

| القاعدة | التفصيل |
|--------|---------|
| موقع السؤال | السؤال الكامل داخل الوسم كأول جزء قبل أول `\|\|\|` — إذا كُتب قبله في الجسم يظهر كزر خيار أول (عطل مرئي فادح) |
| عدد الخيارات | دائماً 3-4 خيارات حقيقية متمايزة + «غير ذلك» = 4-5 أزرار إجمالاً |
| جودة الخيارات | إجابة صحيحة + مشتّتات (distractors) معقولة قريبة منها |
| إغلاق «غير ذلك» | إلزامي دائماً، لا يُخرق |
| الاستثناءات | كود برمجي / شرح طويل مفتوح / إبداع شخصي / «ماذا تلاحظ؟» بعد رسم |
| كود متعدد الأسطر | إذا احتوى الخيار على `if/for/while/def` يجب كتابته بأسطر حقيقية |
| الفاصل | `\|\|\|` ثلاث شُرَط رأسية — لا فاصلة لا شرطة |

**قواعد التنسيق**:
```
• **عريض** = ذهبي (1-3 كلمات مفتاحية/رسالة)
• *مائل* = زمرّدي للتلميحات
• `code` inline + ```python ... ``` blocks
• بطاقات callout: > 💡 / > ⚠️ / > ✅ / > 🎯 / > 📌
• $...$ و $$...$$ للرياضيات
• بطاقة واحدة كحد أقصى/رسالة
```

**قواعد جودة التدريس** (من الكود مباشرة):
```
🚨 لغة بسيطة وممتعة — تبسيط كل مصطلح فوراً
🚨 جملة نظرية واحدة كحد أقصى ثم تطبيق
🚨 تطبيق عملي حاضر في كل وقت
🚨 مهام واقعية خطوة بخطوة (Real-World Tasks)
🚨 اسأل عن الجهاز (كمبيوتر/هاتف) قبل أول مهمة عملية
🚨 تشبيه من الحياة اليمنية لكل مفهوم معقّد
• لا تصحّح مباشرة — اطرح سؤالاً يقود للاكتشاف
• افحص الفهم (لماذا/ماذا لو) لا الحفظ
• أشعِر الطالب بالتقدّم بصوت مسموع
• ممنوع ذكر VS Code/GitHub/Stack Overflow/Gemini/GPT/Claude/Google
```

**قواعد الطوارئ (أُضيفت بعد تحليل محادثة طالب حقيقي غادر غاضباً)**:
```
⛔ فحص ذاتي إلزامي قبل إرسال أي كود/مقارنة:
   (أ) هل المتغيرات إنجليزية فعلاً؟
   (ب) هل الخيار «الخاطئ» فعلاً خاطئ؟
       مثال القاتل: «student_count مقابل count_students» — كلاهما صح!
       الصحيح دائماً: إنجليزي مقابل عربي → student_count مقابل عدد_الطلاب
   (ج) إذا صحّحت خطأً سابقاً، هل تغيّر الكود فعلاً؟

⛔ لا تُحل لأداة لم تُعرّفها في الجلسة

⛔ علّم الصياغة قبل طلب التطبيق

⛔ ممنوع منعاً مطلقاً التخلي عن طالب غاضب
   البديل: (1) جملة اعتراف + (2) نقطة بداية مختلفة + (3) نجاح سريع صغير

⛔ الاعتذار جملة واحدة فقط ثم الحل فوراً
```

**الوسوم البروتوكولية المُعلَنة في L1**:
```
[MASTERY: concept=<i> value=<0..100>]
[NEEDS_REVIEW: concept=<i>]
[LESSON_MASTERED]
[SESSION_COMPLETE]
[DIFFICULTY_UP] / [DIFFICULTY_DOWN]
[UNIT_COMPLETE] / [STAGE_COMPLETE] / [LEVEL_COMPLETE]
[[CREATE_LAB_ENV: kind=diagnostic|decision|application|analysis|connection]]
```

---

### الطبقة L2 — محتوى الدرس

**العنوان**: `## 2. محتوى الدرس`

البيانات الثابتة من DB:
```
التخصص: [subjectName]
كود الدرس: [lesson.code]
الاسم: [lesson.name]
الهدف: [lesson.goal]
```

**v4.1 — حقول اختيارية** (من `lesson.meta` JSONB):
```
خطّاف التحفيز (motivation_hook): ...
أهداف التعلّم (Bloom):
  • [statement] [bloom_level]
مخطّط الإجابة النموذجية (solutionOutline): ... ← للمعلم فقط
```

**الجمل الملزمة**:
```
الجملة الافتتاحية الإلزامية (في أول رسالة فقط): [bridgeSentence]
سؤال التحقق النهائي: [finalCheckQuestion]
معيار اكتمال الجلسة: [sessionCompleteCriterion]
```

**المفاهيم** — كلٌّ على هذا الشكل الدقيق:
```
  N. [اسم المفهوم] [FLAG — score/100] [⚖ وزن:W]
     معيار الإتقان: [masteryCriterion]
```

حيث:
- FLAG = `✅ متقن` إذا score ≥ 80 | `⚠️ يحتاج تدعيم` إذا score ≥ 40 | `⛔ ضعف واضح` إذا score < 40
- `⚖ وزن:W` تظهر فقط إذا weight > 1

**الأخطاء الشائعة** — كلٌّ على هذا الشكل:
```
❌ [نص الخطأ] [شارة الخطورة]
✅ الصواب: [correction]
🛠 العلاج: [treatment]
```

شارات الخطورة (v4.1): `🔥 خطر فادح` للـ critical | `✦ خفيف` للـ minor | لا شارة للـ major

**المحتوى المُولَّد** (من `v4_lesson_content_cache`):
```
التمهيد: [intro — فقرة كاملة]
شروح مصغّرة:
  - مفهوم N: [explanation — 4-6 جمل: تعريف + أهمية + مثال يمني + سوء فهم]
أمثلة:
  - **title**: body
أسئلة تحقّق:
  1. [question]
تشبيهات:
  - [تشبيه من الحياة اليمنية]
جملة الختام: [closingBridge]
```

التعليمة: «مرجع للاستخدام التدريجي — لا تُلقِه دفعة واحدة»

---

### الطبقة L3 — السياق الهرمي

**العنوان**: `## 3. السياق الهرمي (الوحدة/المرحلة/المستوى)`

```
المستوى: [N]. [name] (تركيز Bloom: [bloom_focus])   ← v4.1 فقط
المرحلة: [code] — [name] (تركيز Bloom: [bloom_focus])
الوحدة الحالية: [code] — [name]
لماذا هذه الوحدة (محفّز): [unit.meta.motivation_hook]
أهداف الوحدة:
  • [statement] [bloom_level]
```

---

### الطبقة L3a — استمرارية الدرس السابق (اختيارية)

**شرط الحقن**: `isFirstTurn && previousLessonContext && previousLessonContext.lessonCode !== currentLessonCode`

```
## 3a. استمرارية الدرس السابق
منذ [N ساعة / N يوم / قبل قليل]، أنهيتَ درس "[lessonCode]" مع الطالب. آخر تفاعل:
"""
[tailSummary]
"""
ابدأ هذا الدرس الجديد بربطه عضوياً بالدرس السابق — جملة ربط واحدة أو اثنتان فقط،
لا تعِد شرح ما سبق.
```

---

### الطبقة L4 — الذاكرة الدائمة

**عنوان**: `## 4. الذاكرة الدائمة (Persistent Memory)`

من `getStudentMemory(userId)` → تشمل: warmth / personal dictionary / cross-subject interests / chronic weaknesses

---

### الطبقة L5 — تاريخ الجلسة المضغوط

**العنوان**: `## 5. ملخّصات آخر جلستين + سياق المحادثة الحالية`

الخوارزمية من `compressHistory()`:
```typescript
const maxMessages = 12;       // آخر 12 رسالة: كاملة
const headTail = 400;         // الأقدم: أول 400 + "…" + آخر 400 حرف
```

---

### الطبقة L6 — المادة المرجعية

**المسار العادي**: placeholder بسيط

**مسار الملازم الجامعية** (`buildBookletReferenceLayer()`):
```
## 6. المادة المرجعية (المصدر الوحيد المسموح — RAG من ملزمة الطالب)
- الملزمة: "[bookletTitle]"
- كل ادعاء يُذيَّل بـ [ص:N] أو [ص:N-M]
- الواجهة تحوّل [ص:N] إلى شارة قابلة للنقر
- خطأ واضح في الملزمة → توضيح مُعلَّم بـ (إضافة توضيحية خارج الملزمة)

[صفحة N] نص المقطع...
```

---

### الطبقة L8 — الصعوبة والإيقاع

**الحساب الفعلي** (v4.1 — مرجّح بالوزن):
```typescript
weightedSum += mastery.get(conceptIndex) * weight
avg = weightedSum / weightTotal  // [0..100]
```

| avg | التوجيه |
|-----|---------|
| ≥ 70 | «ارفع الصعوبة: أسئلة تطبيقية متشعّبة» |
| ≥ 35 | «حافظ على مستوى متوسط» |
| < 35 | «خفّض الصعوبة: ابدأ بأسئلة استرجاع» |

**سرعة الاستيعاب** (facet velocity):
```typescript
velocity = meritCleared / totalAttempts
// FACET_VELOCITY_PASS = 70
```

| velocity | الإيقاع |
|---------|---------|
| ≥ 0.8 | «اضغط الإيقاع» |
| ≤ 0.4 | «خفّض الإيقاع» |
| 0.4–0.8 | «حافظ على الإيقاع» |

---

### الطبقة L9 — توجيهات اللغة

```
- عربية فصحى مبسّطة مع نكهة يمنية
- RTL
🚨 المسافات بين الكلمات — 8 أمثلة ❌/✅ من الكود
⛔ أسماء الكود بالإنجليزية قاعدة مطلقة:
  ✅ def calculate_salary(count):
  ❌ def احسب_الراتب(العدد):
```

---

### الطبقة LVIZ — كتالوج المرئيات التفاعلية

الصيغة: `[[VIZ: template=<name>, payload=<JSON_OBJECT>]]`

**9 قوالب في الكود**:

| القالب | الاستخدام | اختيار التخصص |
|-------|---------|-------------|
| `python_trace` | تتبّع Python خطوة بخطوة | python/بايثون |
| `js_trace` | تتبّع JavaScript | js/web/برمج |
| `packet_flow` | تدفّق حزم شبكة 3-5 عقد | network/cyber/سايبر |
| `accounting_t_account` | حساب T محاسبي | account/محاسب/erp/مالي |
| `regex_match` | إبراز مطابقات regex | regex/pattern |
| `flowchart` | مخطّط تدفّق/خوارزمية | **الجميع دائماً** |
| `bar_chart` | رسم بياني أعمدة | account/math/إحصاء |
| `er_diagram` | مخطّط علاقات DB | database/sql |
| `tree_diagram` | مخطّط شجري | database/هياكل بيانات |

**v4.1**: `specialty.meta.allowed_viz_templates` يتجاوز كل ذلك

---

### الطبقة LSCENE — الرسوم المتحركة التفاعلية

الصيغة: `[[SCENE: وصف عربي دقيق وغني]]`

**كيف يعمل**: المعلم يكتب الوصف → Claude Sonnet يحوّله لـ HTML/CSS/JS متحرك → iframe sandboxed (allow-scripts فقط)

**متى**: هجمات أمن، مصافحات، معاملات محاسبية، خوارزميات متحركة

---

### الطبقة LIMG — الصورة المولّدة (FLUX)

الصيغة: `[[IMAGE: english FLUX prompt — purely visual, NO TEXT NO LABELS NO WORDS]]`

**نواة الجودة الإلزامية** في كل prompt:
```
professional editorial infographic illustration, isometric flat icons,
color-coded sections (soft blue, mint green, warm orange, lavender),
subtle gradient background, clear visual hierarchy with thin connector arrows,
generous whitespace, modern educational poster style, vector art,
ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS,
only numbered colored circles 1 2 3
```

بعد الوسم مباشرةً: `<figcaption>` بعنوان عربي وتسلسل الأجزاء

---

### طبقة LWEBPHOTO — الصورة الواقعية

الصيغة: `[[PHOTO: a simple English noun phrase]]`

**القاعدة**: أول مرة يُذكَر أي مكوّن/جهاز/كائن حقيقي → أرِ صورته الفوتوغرافية فوراً (حتى 2 صور/رسالة)

---

### طبقة LCODE — محرر نُخبة (تخصصات برمجية فقط)

شرط الحقن: `isCodingSpecialty` — regex يشمل python|web|program|cyber|network|sql|linux|...

```
[[CODE_TASK: lang=python | المطلوب بدقّة: اكتب دالة تستقبل قائمة أرقام وتُعيد أكبرها]]
```

---

### طبقة LOPEN — عقد رسالة الافتتاح (أول دور فقط)

الترتيب المطلوب:
```
1. تحية قصيرة ودودة + اسم الدرس
2. خطّاف التحفيز أو جملة ربط بالحياة اليمنية
3. ماذا ستقدر تعمل بنهاية الدرس (حتى 4 أهداف)
4. خريطة الدرس المصغّرة: المفاهيم
5. الجملة الافتتاحية الإلزامية [bridgeSentence]
6. أول سؤال سقراطي واحد فقط
```

حتى ~12 جملة، لا VIZ/SCENE/IMAGE في هذه الرسالة.

---

### الطبقة LDIAG — موجّه التشخيص الذكي (الأخير دائماً)

**العنوان**: `## 14. موجّه التشخيص الذكي — خطة هذا الدور (إلزامية، نفّذها بدقّة)`

**شرط الحقن**: `!isFirstTurn`

---

## 5. محرك التشخيص — الكود الحرفي

الملف: `artifacts/api-server/src/lib/v4-diagnostic-engine.ts`

### نموذج الحالة

```typescript
const MASTERED_AT = 75;          // درجة الإتقان المطلوبة
const WEAK_BELOW = 50;           // حد الضعف
const FACET_VELOCITY_PASS = 70;  // في L8 فقط

type ConceptState = "untested" | "weak" | "shaky" | "mastered"
// untested: لم يوجد في masteryByConcept أصلاً (≠ قيمة صفر)
// weak:     < 50
// shaky:    50-74
// mastered: ≥ 75
```

### سلّم القرار — decideDiagnosticMove()

```typescript
// مرتّبة حسب الأولوية، breadth-first بالـ facet

// 1. أبكر مفهوم untested|weak → PROBE / DRILL
const gap = withState.find(c => c.state === "untested" || c.state === "weak");
if (gap) return { move: gap.state === "untested" ? "probe" : "drill" };

// 2. أبكر مفهوم weight>1 مفهوم + shaky|mastered بدون W2 → RATIONALE
const w2gap = withState.find(c =>
  requiresMiddleFacets(c.concept.weight) && grasped(c.state) &&
  !facetCovered(facetsByConcept.get(...), "w2")
);
if (w2gap) return { move: "rationale", facet: "w2" };

// 3. أبكر مفهوم weight>1 + W2 مغطى بدون W3 → BOUNDARY
const w3gap = withState.find(c =>
  requiresMiddleFacets(c.concept.weight) && grasped(c.state) &&
  facetCovered(..., "w2") && !facetCovered(..., "w3")
);
if (w3gap) return { move: "boundary", facet: "w3" };

// 4. أبكر shaky|mastered غير مُطبَّق عملياً → APPLY
const toApply = withState.find(c => grasped(c.state) && !applied.has(c.conceptIndex));
if (toApply) return { move: "apply" };

// 5. أبكر shaky مُطبَّق → REINFORCE
const toReinforce = withState.find(c => c.state === "shaky");
if (toReinforce) return { move: "reinforce" };

// 6. كل شيء متقن ومُطبَّق → ADVANCE
return { move: "advance", target: null };
```

**القيد**: المفاهيم العادية (weight=1) تتخطى الخطوتين 2 و3 — فقط المفاهيم المهمة (weight>1) تستوفي W2+W3 قبل APPLY.

### نص التوجيه لكل حركة (من الكود مباشرة)

```
PROBE:
"اطرح سؤالاً واحداً دقيقاً يكشف هل يفهم هذا المفهوم فعلاً — سؤال «لماذا/ماذا لو»
 لا استرجاع تعريف. لا تشرح قبل أن يحاول."

DRILL:
"الطالب ضعيف هنا وهذا أبكر مفهوم غير متقن. صحّح الفهم بمثال مضادّ صغير محسوس،
 ثم اطرح سؤال ممارسة جديداً — لا تكرّر نفس السؤال السابق."
+ اختيار أخطر خطأ شائع (critical > major > minor):
  "⚠️ الفخّ الأكثر خطورة: «...» — الصواب: ...; العلاج: ..."

RATIONALE (W2 «لماذا»):
"الطالب يعرف «ماذا» لكن لم تترسّخ «لماذا». اطرح سؤال التوقّع أولاً ثم اكشف العلّة"
+ إذا facetContent متاح: سؤال التوقّع + العلّة المحسوبة
+ "لا تُصدر [MASTERY] ولا [NEEDS_REVIEW] — يُقيَّم آلياً"

BOUNDARY (W3 «الحدود»):
"رسّخ حدوده: ما يتغيّر بحرية، ما يكسره، الخطأ الناتج"
+ إذا facetContent متاح: predictPrompt + variesFreely + breaks + errorAndWhy
+ "لا تُصدر [MASTERY] ولا [NEEDS_REVIEW] — يُقيَّم آلياً"

APPLY (W4 «طبّقه»):
"مهّد بجملة دافئة — لا تطرح سؤالاً منفصلاً؛ بطاقة التطبيق ستظهر تلقائياً"
+ "لا تُصدر [MASTERY] ولا [NEEDS_REVIEW] — يحتسب آلياً"

REINFORCE:
"اطرح تطبيقاً أطرف بدرجة (سيناريو أو ماذا لو) يرفعه فوق 75"

ADVANCE:
"كل المفاهيم متقنة. انتقل إلى سؤال التحقق النهائي كتحدٍّ تطبيقي واحد متشعّب."
```

### الذاكرة المزمنة عبر الدروس

```
"استدعاء مُتباعد (عند أول مناسبة طبيعية فقط):
 للطالب ضعف متكرر سابق في [lessonCode] (مفهوم N، تعثّر ×K).
 اربطه بالدرس الحالي بسؤال خاطف إن أمكن."
شرط: errorCount ≥ 2 && lessonCode ≠ currentLessonCode
```

---

## 6. تصنيف الدور وسقف الرموز

| الدور | السقف | التعريف |
|-------|-------|---------|
| `opening` | **1600** رمز | `isFirstTurn = true` |
| `dense` | **1100** رمز | DENSE_EXPLAIN_PATTERN في الرسالة |
| `short_ack` | **360** رمز | رسالة ≤ 60 حرف + ACK_PATTERN + لا CONCEPT_REQUEST |
| `normal` | **1200** رمز | كل الحالات الأخرى |

---

## 7. الترتيب النهائي للطبقات

```
L1   ← الشخصية + قواعد الإخراج + البروتوكول
L2   ← محتوى الدرس (حالة الإتقان + الأخطاء + المحتوى المولَّد)
L3   ← السياق الهرمي (مستوى → مرحلة → وحدة)
L3A  ← استمرارية الدرس السابق [اختيارية، مُحقَنة بعد L3]
L4   ← الذاكرة الدائمة
L5   ← تاريخ الجلسة المضغوط
L6   ← المادة المرجعية (placeholder أو RAG ملازم)
L7   ← معامل الوحدة (placeholder)
L8   ← الصعوبة والإيقاع (مرجّح بالوزن + سرعة الاستيعاب)
L9   ← توجيهات اللغة + قاعدة المسافات
LVIZ ← كتالوج VIZ التفاعلي (9 قوالب)
LSCENE ← توجيهات SCENE (Claude Sonnet)
LIMG   ← توجيهات IMAGE (FLUX → fal.ai)
LWEBPHOTO ← توجيهات PHOTO
LCODE  ← محرر نُخبة [تخصصات برمجية فقط]
LOPEN  ← عقد الافتتاح [أول دور فقط]
LDIAG  ← التشخيص الذكي [كل دور ما عدا الأول — الأخير دائماً]
```

---

## 8. قفل النموذج وبنية المزوّد

```typescript
const V4_TEACHING_MODEL = "gemini-2.5-flash-lite";
const V4_ALLOWED_TEACHING_MODELS = new Set(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
```

**النماذج حسب المهمة**:

| المهمة | النموذج | المسار |
|--------|---------|--------|
| التدريس الطلابي | Gemini 2.5 Flash Lite | OpenRouter |
| توليد محتوى الدرس | Gemini 2.5 Flash Lite | OpenRouter |
| تخطيط الجلسة / مقابلة | GPT-4o | OpenRouter |
| تحويل SCENE لـ HTML | Claude Sonnet | OpenRouter |
| تقييم إجابات الامتحانات | Claude Haiku | OpenRouter |
| OCR الملازم | Gemini 2.5 Flash/Pro → Sonnet | OpenRouter |
| embeddings الملازم | openai/text-embedding-3-small | OpenRouter |
| توليد صور | FLUX.1 schnell | fal.ai |

---

## 9. مخطط التدفق الكامل لكل رسالة

```
طلب الطالب
    │
    ├─ [أمان] requireUser + CSRF
    ├─ [مزوّد] getTeacherProviderOverride() ← cache 30 ثانية
    ├─ [قفل النموذج] assertGeminiForTeaching()
    ├─ [DB] resolveSpecialty + getStudentPath + verifyUnlocked
    ├─ [محفظة] canAffordV4Turn() ← أو SSE terminal فوري
    ├─ [قفل التزامن] inflightTeachTurns.add(key)
    │
    ├─ [محتوى] getOrGenerateLessonContent()
    │   ← cache hit (مجاني) أو race-safe generation
    │
    ├─ [ذاكرة] getStudentMemory(userId)
    ├─ [تاريخ] compressHistory(history, {maxMessages:12, headTail:400})
    │
    ├─ [تصنيف] classifyV4Turn() → tier + maxOutputTokens
    │
    ├─ [التشخيص] decideDiagnosticMove() + getOrGenerateConceptFacets()
    │   ← يحسب: state كل مفهوم → move → facet → facetContent
    │
    ├─ [التوجيه] buildTeacherSystemPrompt()
    │   ← [L1..L9, LVIZ, LSCENE, LIMG, LWEBPHOTO, ±L3A, ±LCODE, ±LOPEN, LDIAG]
    │
    ├─ [البث] streamGeminiTeaching() ← SSE chunks للعميل
    │
    ├─ [تكلفة] chargeV4Ai(requestId) ← idempotent
    │
    ├─ [تحليل] parseProtocolTags(fullText)
    ├─ [تأثيرات] applyTagEffects() → DB updates
    │   [MASTERY]          → v4_concept_mastery.score
    │   [NEEDS_REVIEW]     → chronic weaknesses
    │   [SESSION_COMPLETE] → lesson unlocking
    │   [[SCENE]]          → Claude Sonnet → HTML متحرك
    │   [[IMAGE]]          → FLUX.1 → fal.ai
    │   [[PHOTO]]          → Wikipedia → same-origin
    │
    └─ SSE terminal: {done:true, effects, balanceAfter, ...}
```
