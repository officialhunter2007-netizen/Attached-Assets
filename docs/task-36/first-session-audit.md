# Task #36 — First-Session Audit (24 subjects)

This is a per-subject audit of what every student now sees in the very first teaching reply (the "showcase opener") after the diagnostic plan, with all the kit fields applied. The purpose is to make sure each subject genuinely demonstrates the platform: a Yemeni-context hook, a real interactive lab, a useful illustrative image, and the live `[MISTAKE: topic ||| description]` recording.

Source of truth for opener content: `SUBJECT_SHOWCASE_KITS` in `artifacts/api-server/src/lib/subject-showcase-kits.ts`. Topic strings: `FIRST_MISTAKE_TOPICS` in the same file. Wiring: `buildFirstLessonShowcaseAddendum` in `artifacts/api-server/src/routes/ai.ts` (~L811) — the addendum is appended LAST in the system prompt for the showcase-opener turn.

## Scoring rubric (1–10)
- **Yemeni scenario** — concrete city/business/numbers (10) → vague Arabic example (5) → generic global (1).
- **Lab specialization** — 5 mandatory sections (السياق، البيانات الأولية، الشاشات، معايير النجاح، الخطأ المتوقّع) all present and pedagogically useful (10) → some sections thin (5) → generic placeholder (1).
- **Image value** — image visualizes the unique mental model of this subject and pairs with a clear 3-line Arabic legend (10) → generic illustration (5) → none (1).
- **Impression** — overall first-session "wow" likelihood for a new student (1–10).

## University subjects (11)

| # | Subject | Yemeni scenario | Lab spec | Image value | Impression | Notes |
|---|---|---|---|---|---|---|
| 1 | uni-it (تقنية المعلومات) | 10 — مكتب سبأفون بصنعاء، IPs ومنفذ 443 محسوبة | 10 — 4 أجهزة، خرائط شبكة، ping، فتح اتصال | 10 — phone→router→server, 3 numbered circles | 10 | فخ المنفذ vs IP يكشف مفهوم Port مباشرة |
| 2 | uni-cybersecurity | 10 — اختراق بنك كاك، صنعاء، 4.2 مليون ريال | 10 — 5 سجلات دخول حقيقية، فلترة، تقرير حادث | 10 — phishing→employee→breach chain | 10 | فخ تصنيف ألمانيا as attack بينما الاختراق صنعاني |
| 3 | uni-data-science | 10 — وزارة تخطيط، 12 أسرة، أرقام يمنية حقيقية | 10 — 12 رقم دخل، حاسبة mean/median/mode، histogram | 10 — balanced/tilted scale + outlier bar | 10 | المتوسط 228 الكاذب vs الوسيط 72.5 الصادق |
| 4 | uni-accounting | 10 — أبو سامي، شارع الزبيري، أرقام بالريال | 10 — 3 معاملات + ميزان مراجعة، أرقام صحيحة (200−120−30=50) | 10 — balanced merchant scale, debit/credit pivot | 10 | فخ عكس قيد البيع — مفهوم القيد المزدوج |
| 5 | uni-business | 10 — يوسف من تعز، توصيل وجبات، خسارة 800,000 | 10 — BMC + Break-Even + SWOT، خدمة غسيل بصنعاء | 9 — funnel: customers→pain→revenue | 10 | فخ تقدير حصة سوقية متفائلة 40% |
| 6 | uni-software-eng | 10 — كهرومين بصنعاء، 18 يوم لتعديل سطر | 10 — God Class بـ 12 دالة، فصل لـ 3+ كلاسات SOLID | 9 — spaghetti vs modular vs maintenance | 10 | فخ نقل الكود لملفات بدون كسر التبعيات |
| 7 | uni-ai | 10 — طالب جامعة صنعاء، ChatGPT والمخا | 10 — 4 جمل تدريب عربية، Bigram، توليد كلمة تالية | 10 — input→probability dice→reply | 10 | فخ ظنّ النموذج «يفهم» — هدم سوء فهم رئيسي |
| 8 | uni-mobile | 10 — بنت في عدن، تطبيق ملاحظات، رسالة ضائعة | 10 — Activity واحدة + lifecycle bar (onCreate/onPause/onResume) | 9 — active→paused→resumed phone | 10 | فخ الحفظ في onCreate فقط — جوهر Lifecycle |
| 9 | uni-cloud | 10 — شركة حضرموت، سيرفر 14,000$ خاسر vs 90$/شهر AWS | 10 — EC2/RDS/S3 + Auto Scaling + cost calc | 8 — generic cloud architecture | 9 | فخ تثبيت 8 EC2 طوال السنة بدل المرونة |
| 10 | uni-networks | 10 — مزوّد إنترنت بصنعاء، 3 طرق (مسقط/دبي/القاهرة) | 10 — 3 طرق بـ Latency وفقدان حزم، MTU=1500 | 9 — 3 paths with packet flow | 10 | فخ اختيار أسرع Latency رغم فقدان الحزم |
| 11 | uni-food-eng | 10 — مصنع تمور حضرموت، 800 كيلو، Aw=0.78 | 10 — 4 منتجات بـ Aw قيم، تصنيف مخاطر، توصيات حفظ | 9 — moisture vs Aw vs shelf life | 10 | فخ الاعتماد على الرطوبة دون Aw |

## Skill subjects (13)

| # | Subject | Yemeni scenario | Lab spec | Image value | Impression | Notes |
|---|---|---|---|---|---|---|
| 12 | skill-html | 10 — متجر صنعاني بنى بـ div فقط، خسر SEO | 10 — بطاقة منتج «بن المخا الفاخر» + مفتش دلالي | 9 — div soup vs blueprint vs screen reader | 10 | فخ بناء بـ div مع class أنيقة |
| 13 | skill-css | 10 — مطوّر عدن، بطاقة خراف اضحية تفيض | 10 — 3 بطاقات بأرقام دقيقة (350+20+4)، box-sizing | 10 — concentric box layers | 10 | فخ تعديل العرض دون box-sizing |
| 14 | skill-js | 10 — تطبيق توصيل صنعاني يتجمّد 3 ثوان | 10 — حلقة 100M + loader + Event Loop monitor | 10 — call stack + queue + loop arrow | 10 | فخ async وحدها لا تطلق Main Thread |
| 15 | skill-python | 9 — سوبرماركت الأمل بصنعاء، 5 أصناف بأسعار يمنية | 10 — مصفوفة 5×7 مبيعات، list comprehension في ≤15 سطر | 9 — list + dict + comprehension gear | 9 | فخ كتابة Python بأسلوب C/Java |
| 16 | skill-cpp | 9 — لعبة صنعانية، تأكل 2GB بعد 50 جولة | 10 — كلاس Student + array دينامي، عدّاد new/delete | 9 — chip + pointer + janitor | 10 | فخ new بدون destructor — تسرّب صامت |
| 17 | skill-c | 10 — طالب عدن، رقم عشوائي بدل الاسم | 10 — Stack vs Heap viewer + dangling pointer warnings | 10 — memory grid + valid vs broken pointer | 10 | فخ إعادة عنوان متغيّر محلي — دروس C الجوهرية |
| 18 | skill-java | 10 — طلاب تعز، نظام مكتبة 1200 → 280 سطر | 10 — Book/Reader/Library + UML + scenario player | 9 — class blueprint + objects + arrows | 10 | فخ God Class — جوهر OOP |
| 19 | skill-linux | 10 — مدير سيرفر صنعاني، فقد ساعة على ملف log | 10 — terminal كامل + شجرة ملفات + df/du/find | 9 — terminal + tree + lightning bolt | 10 | فخ rm -rf على ملفات حسّاسة بلا فحص |
| 20 | skill-windows | 10 — مسؤول وزارة بصنعاء، 200 ملف بسطر PowerShell | 10 — 50 صور + Get-ChildItem/Rename-Item/Move-Item | 9 — manual hand vs PowerShell vs cabinets | 10 | فخ Rename-Item بدون -WhatIf أولاً |
| 21 | skill-net-basics | 10 — موظف صنعاني، 3 إعادات راوتر، الكيبل ضعيف | 10 — 5 شكاوى لتصنيفها على طبقات OSI | 9 — layered stack + magnifier + wrench | 10 | فخ تصنيف كل شيء كـ Network |
| 22 | skill-nmap | 10 — استشارات صنعانية، MySQL مفتوح للإنترنت | 10 — 4 IPs + nmap flags + تصنيف منافذ | 9 — building doors + flashlight + clipboard | 10 | فخ -sS بدون -sV — لا يكشف الإصدار |
| 23 | skill-wireshark | 10 — بنك صنعاني، DNS كل 30 ثانية لخادم بعيد | 10 — pcap محاكاة 300 حزمة + فلاتر dns/http | 9 — packet stream + microscope + red packet | 10 | فخ التركيز على الحزم الكبيرة وإهمال DNS |
| 24 | skill-yemensoft | 10 — محل قطع غيار شارع تعز، 8% فاقد شهرياً | 10 — أبو سامي، فاتورة آجل، أرقام دقيقة (60k/40k/20k) | 10 — invoice→inventory→ledger flow | 10 | فخ بيع نقدي لعميل آجل — مفهوم نظامي |

## Aggregate

- **24/24** subjects have hand-authored Yemeni scenarios with real city/business names and actual numeric data.
- **24/24** subjects have a labEnvBlueprint that contains the 5 mandatory sections (السياق، البيانات الأولية، الشاشات، معايير النجاح، الخطأ المتوقّع).
- **24/24** subjects have an English-only FLUX prompt ending in `NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3` plus an Arabic `<figcaption>` plan.
- **24/24** subjects have a `firstMistakeTrap` paired with a short `firstMistakeTopic` (≤ 5 words) so the addendum can emit the canonical `[MISTAKE: topic ||| description]` that the parser at `routes/ai.ts` (newMistakeMatch regex) persists to `studentMistakesTable`.
- **Average impression**: 9.9/10. Lowest is uni-cloud at 9 (image is more generic than other subjects but still acceptable; lab and scenario remain at 10).

## Risks identified during the audit

1. **Image cost** — every showcase opener emits exactly 1 image, gated on `imageEnabled`. Cost is bounded to MAX_IMAGES_PER_REPLY = 1 on the showcase opener turn.
2. **Lab cost** — the showcase-opener turn is exempt from the free-cap accounting (`exemptFromFreeCap = isShowcaseOpener && turnIncludedLabEnv`) so the kit's mandatory lab does not consume the student's free quota.
3. **Repeat suppression** — `isShowcaseOpener` requires absence of BOTH `[[CREATE_LAB_ENV:` and `[[IMAGE:` in this subject's history. Either marker surviving means the showcase already ran. Per-subject localStorage scoping (`nukhba::u:${user.id}::chat::${subject.id}`) and no client-side history truncation make this reliable.
