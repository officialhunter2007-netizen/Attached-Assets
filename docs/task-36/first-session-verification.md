# Task #36 — First-Session Verification (24 subjects)

Executable per-subject manual verification checklist for the showcase opener (the very first teaching reply after the diagnostic plan). Run this whenever the kit table or addendum is changed.

## How to run for one subject

1. Sign in as a fresh user (or a user that has never opened this subject).
2. Pick the subject from the curriculum grid.
3. Complete the diagnostic phase normally (answer the ASK_OPTIONS questions).
4. When the personalized plan appears (`[PLAN_READY]` streamed → frontend flips `chatPhase` to teaching), send your first teaching message (e.g. "ابدأ").
5. Verify the **Opener checks** for that subject below.
6. Send a second teaching message and verify **Repeat suppression** below.

## Common opener checks (must hold for ALL 24 subjects)

- [ ] Reply contains exactly **one** `[[CREATE_LAB_ENV: …]]` whose body is the kit's `labEnvBlueprint` verbatim (you should see all 5 sections — السياق، البيانات الأولية، الشاشات، معايير النجاح، الخطأ المتوقّع).
- [ ] Reply contains exactly **one** `[[IMAGE: …]]` whose prompt matches the kit's English `fluxPrompt`, and an Arabic `<figcaption>` whose title equals the kit's `captionTitleAr` and whose 3 numbered lines equal `legendLinesAr[0..2]`.
- [ ] When the student then makes the expected first-mistake (the kit's `firstMistakeTrap`), the next assistant reply contains the canonical `[MISTAKE: <topic> ||| <description>]` tag where `<topic>` is the subject's entry in `FIRST_MISTAKE_TOPICS` and `<description>` is the kit's `firstMistakeTrap`. Confirm the row appears in `studentMistakesTable` for `(userId, subjectId)`.
- [ ] After the student tries the lab, the assistant emits the kit's `transitionLine` and the conversation continues into the personalized plan's first stage.
- [ ] No re-injection on the SECOND teaching message: the addendum must not appear again in the system prompt (no second `[[CREATE_LAB_ENV:]]` from the kit). This is the **Repeat suppression** check.

## Per-subject checklist (24)

For each row: confirm the opener's hook line begins with the kit `hookConcept`, the scenario reflects the kit's Yemeni `concreteScenario`, and the expected first mistake topic is the one shown.

### University (11)

| # | Subject | Expected hook (start of opener) | Yemeni scenario marker | Expected MISTAKE topic |
|---|---|---|---|---|
| 1 | uni-it | "كل شبكة في الدنيا تتكلم برقمين فقط…" | سبأفون / 192.168.1.x / المنفذ 443 | `IP والمنفذ` |
| 2 | uni-cybersecurity | "أكثر اختراق أمني خطير لا يحدث بهجوم تقني…" | بنك كاك / أحمد / 4.2 مليون ريال | `تصنيف التهديد` |
| 3 | uni-data-science | "البيانات الخام لا تتكلم…" | عدن / 220,000 vs 65,000 ريال | `المتوسط مقابل الوسيط` |
| 4 | uni-accounting | "كل عملية مالية في الكون تُسجَّل بطرفين متوازنين…" | أبو سامي / شارع الزبيري / 500,000 ريال | `قيد البيع المزدوج` |
| 5 | uni-business | "كل مشروع ناجح يُولد من 4 أسئلة فقط…" | يوسف / تعز / خسارة 800,000 ريال | `تقدير حصة السوق` |
| 6 | uni-software-eng | "الكود الجيد ليس الذي يعمل اليوم…" | شركة برمجيات صنعاء / 18 يوم لسطر | `إعادة الهيكلة` |
| 7 | uni-ai | "الذكاء الاصطناعي لا «يفهم» — بل يحسب احتمالية…" | جامعة صنعاء / ChatGPT / المخا | `فهم النماذج اللغوية` |
| 8 | uni-mobile | "تطبيق الموبايل ليس صفحة ويب — إنه دائرة حياة…" | بنت من عدن / رسالة ضائعة | `دورة حياة التطبيق` |
| 9 | uni-cloud | "السحابة ليست «جهاز شخص آخر»…" | شركة حضرموت / 14,000$ سيرفر vs 90$/شهر | `المرونة السحابية` |
| 10 | uni-networks | "كل بيانات على الإنترنت تُقطَّع لحزم صغيرة…" | شركة YOU صنعاء→عدن / ملف 4MB / 2,800 حزمة | `Latency مقابل فقدان الحزم` |
| 11 | uni-food-eng | "النشاط المائي (Aw) — وليس نسبة الرطوبة — هو من يقرر…" | مصنع تمور حضرموت / Aw=0.78 | `النشاط المائي Aw` |

### Skills (13)

| # | Subject | Expected hook (start of opener) | Yemeni scenario marker | Expected MISTAKE topic |
|---|---|---|---|---|
| 12 | skill-html | "HTML ليس «تصميم» — إنه بنية ذات معنى…" | متجر صنعاء / `<div>` فقط / +40% زيارات | `دلالة HTML` |
| 13 | skill-css | "Box Model — كل عنصر في الصفحة هو 4 طبقات…" | مطوّر عدن / بطاقة خراف اضحية | `Box Model` |
| 14 | skill-js | "JavaScript ليس مجرد كود — إنه «حدث ينتظر حدثاً»…" | تطبيق توصيل صنعاء / تجمّد 3 ثوان | `غير المتزامن` |
| 15 | skill-python | "Python يشبه الإنجليزية لدرجة مخادعة…" | بقالة صنعاء / 60 سطر JS → 8 سطر Python | `أسلوب Pythonic` |
| 16 | skill-cpp | "C++ يعطيك سلطة مطلقة على الذاكرة…" | لعبة صنعانية / 2GB بعد 50 جولة | `إدارة الذاكرة` |
| 17 | skill-c | "لغة C هي «الأم»…" | طالب عدن / رقم عشوائي بدل الاسم | `نطاق المتغيرات` |
| 18 | skill-java | "Java كل شيء فيها كائن (Object)…" | طلاب تعز / مكتبة 1200 → 280 سطر | `تصميم الكلاسات` |
| 19 | skill-linux | "Linux يعطيك التحكّم الكامل — كل شيء في النظام ملف…" | مدير سيرفر صنعاء / log 6GB | `الأوامر التدميرية` |
| 20 | skill-windows | "Windows ليس فقط واجهة رسومية…" | وزارة صنعاء / 200 ملف بسطر PowerShell | `اختبار سكربت PowerShell` |
| 21 | skill-net-basics | "كل اتصال شبكي يمرّ بـ 7 طبقات (OSI)…" | موظف صنعاء / كيبل ضعيف | `تشخيص الطبقات` |
| 22 | skill-nmap | "Nmap لا يخترق — إنه يسأل بأدب…" | استشارات صنعاء / MySQL مفتوح للإنترنت | `كشف الإصدار` |
| 23 | skill-wireshark | "Wireshark يجعلك ترى ما يقوله جهازك «بصوت عالٍ»…" | بنك صنعاني / DNS كل 30 ثانية | `حزم DNS الصغيرة` |
| 24 | skill-yemensoft | "يمن سوفت ليس برنامجاً — إنه نظام محاسبي متكامل…" | محل قطع غيار شارع تعز / 8% فاقد | `نوع الفاتورة` |

## Code-level checks

1. **Kit table is exhaustive** — `SUBJECT_SHOWCASE_KITS` has 24 entries, one per subjectId in `curriculum.ts`. `FIRST_MISTAKE_TOPICS` has 24 matching keys. Verified by manual diff against `getSubjectById` lookup table.

2. **Opener gating fires once per subject** — `isShowcaseOpener` is true iff:
   - `!isDiagnosticPhase` — request body flag set by the frontend (frontend persists `chatPhase` in localStorage and flips it to `teaching` when planReady streams in). This is the authoritative "current turn is teaching" signal.
   - `!hasPriorLabEnvTag` — no prior `[[CREATE_LAB_ENV:` in this subject's history. The kit's lab tag survives `cleanTeachingChunk()`.
   - `!hasPriorImageTag` — no prior `[[IMAGE:` in this subject's history. The kit's image tag survives `cleanTeachingChunk()` and diagnostic turns never emit images, so this is a reliable redundancy check against history truncation that drops the lab tag.
   - Conversation history is keyed per (user, subject) on the client (`CHAT_STORAGE_KEY = nukhba::u:${user.id}::chat::${subject.id}`), and the client never truncates before sending.
   - We deliberately do NOT scan for HTML class markers like `praise`/`question-box`/`discover-box`: the diagnostic plan-reveal template uses `<div class="praise">` inside the learning-path block, which would false-trigger and suppress the showcase on the first teaching turn.
   - We deliberately do NOT use the global `users.firstLessonComplete` billing flag (consumed once per account, would suppress subjects #2..24).

3. **Kit block is appended LAST** — placement is after `buildGeminiTeachingAddendum`, so the kit's literal instructions are the most-recent guidance the model reads, overriding any earlier "ask first" / "don't build a lab in first reply" rules.

4. **No Arabic inside FLUX prompts** — every `imageBlueprint.fluxPrompt` is English-only and ends with explicit `NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3` to prevent FLUX from rendering broken Arabic glyphs. Arabic labels live entirely in the `<figcaption>`.

5. **MISTAKE format is parser-compatible** — addendum (هـ) section emits the literal canonical tag `[MISTAKE: ${getFirstMistakeTopic(subjectId)} ||| ${kit.firstMistakeTrap}]`. The server-side parser at `routes/ai.ts` (`newMistakeMatch = fullResponse.match(/\[MISTAKE:\s*([^|\]]+?)\s*\|\|\|\s*([^\]]+?)\s*\]/i)`) requires both a topic and a description separated by `|||`; the kit must therefore always supply both via `FIRST_MISTAKE_TOPICS`.

6. **Specialized lab guidance covers all 24** — `routes/ai.ts` (~L1391) has explicit branches for: cybersecurity/nmap/wireshark, data-science, networks/net-basics, business, mobile/software-eng/ai, cloud/IT, and Linux/Windows. Subjects without a dedicated branch (HTML/CSS/JS/Python/C/C++/Java, food-eng, yemensoft, accounting) still receive the kit's CREATE_LAB_ENV plus the existing generic guidance.

## Cost & quota smoke test

- [ ] On showcase opener: image budget caps at 1 (MAX_IMAGES_PER_REPLY = isShowcaseOpener ? 1 : 3).
- [ ] On showcase opener: the lab launched by the kit is exempt from the free-cap accounting (`exemptFromFreeCap = isShowcaseOpener && turnIncludedLabEnv`).
