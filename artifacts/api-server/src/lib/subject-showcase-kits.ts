/**
 * Per-subject "Showcase Kit" used by the FIRST teaching reply (the showcase
 * opener) of each subject. Hand-authored, Yemeni-context, concrete and
 * sensory. The teaching prompt builder injects these fields literally into
 * the system prompt so the model has zero room to drift into generic
 * "welcome to the course" filler.
 *
 * Goal: every first reply must demonstrate the platform's actual capability
 * (interactive lab via [[CREATE_LAB_ENV]], visual infographic via [[IMAGE]],
 * mistake-tracking via [MISTAKE]) using a single concrete moment from Yemeni
 * daily life — not by describing features.
 *
 * The kit is OPTIONAL. When a subjectId has no kit registered, the addendum
 * builder falls back to its previous generic instructions.
 */

export interface SubjectShowcaseKit {
  /** ≤20-word phrasing of the single concept the first reply will showcase. */
  hookConcept: string;

  /** 3–4 line Yemeni-context scenario with real names/places/numbers. */
  concreteScenario: string;

  /**
   * Full description string that goes inside [[CREATE_LAB_ENV: …]]. MUST
   * include the 5 mandatory sections (context, initial data with real
   * numbers, screens, success criteria, expected first mistake) so the
   * lab-builder accepts it. Authored as one dense Arabic paragraph.
   */
  labEnvBlueprint: string;

  /**
   * The English FLUX prompt body (NO Arabic — diffusion models can't render
   * Arabic) describing the visual the first reply will inject via [[IMAGE]],
   * plus the Arabic caption parts that go beneath the image.
   */
  imageBlueprint: {
    /** English-only FLUX body. No text/labels inside the image. */
    fluxPrompt: string;
    /** Arabic caption title (the bold heading inside <figcaption>). */
    captionTitleAr: string;
    /** 3 numbered Arabic legend lines describing the 3 numbered circles. */
    legendLinesAr: [string, string, string];
  };

  /**
   * The first specific misconception we EXPECT the student to fall into
   * during the showcase, so the model can demonstrate [MISTAKE: …] live.
   * Phrased as the wrong belief, not the question.
   */
  firstMistakeTrap: string;

  /**
   * Single Arabic transition sentence the model says immediately after the
   * student tries the lab — bridging from "tour" back into the personal
   * plan's first stage.
   */
  transitionLine: string;
}

/**
 * Authoritative kit table keyed by subjectId. Every subject in
 * `curriculum.ts` should have an entry. Missing entries simply fall back
 * to the legacy generic showcase.
 */
export const SUBJECT_SHOWCASE_KITS: Record<string, SubjectShowcaseKit> = {
  // ─────────────────────────── UNIVERSITY ───────────────────────────
  "uni-it": {
    hookConcept: "كل شبكة في الدنيا تتكلم برقمين فقط: عنوان IP ومنفذ Port — وبدونهم لا توجد إنترنت.",
    concreteScenario: "تخيّل أنك في مكتب شركة سبأفون بصنعاء ودخلت من جوّالك على موقع البنك المركزي. جوّالك أخذ IP محلي 192.168.1.34، الموقع له IP عام 213.55.x.x، والاتصال يفتح على المنفذ 443. لو غاب أي رقم من هذي الثلاثة، تُقطع المحادثة فوراً.",
    labEnvBlueprint: "السياق: أنت فني شبكة جديد في مكتب صغير بشارع حدّة بصنعاء، عندك 4 أجهزة (راوتر، لابتوب، طابعة شبكية، خادم محلي). البيانات الأولية: راوتر 192.168.1.1، لابتوب 192.168.1.20، طابعة 192.168.1.30، خادم 192.168.1.40 يستضيف موقع داخلي على المنفذ 8080. الشاشات: شاشة خريطة الشبكة، شاشة محاكي ping، شاشة فتح اتصال (IP + Port)، شاشة تقرير. معايير النجاح: نجاح ping من اللابتوب للطابعة، فتح صفحة الخادم على 192.168.1.40:8080 من المتصفح. الخطأ المتوقّع: محاولة فتح الخادم بدون كتابة المنفذ (192.168.1.40 فقط) فيفشل، وكشف أن المنفذ هو الذي يحدد الخدمة لا الجهاز.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout, isometric flat icons of a smartphone, a router, and a remote web server, color-coded sections (soft blue panel for device, mint green panel for router, warm orange panel for server), thin connector arrows showing packet flow, generous whitespace, modern educational poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the smartphone, the router, and the server",
      captionTitleAr: "المفتاح: رحلة طلب HTTP من جوّالك إلى الخادم",
      legendLinesAr: [
        "1 جهازك يحمل IP محلي ويفتح اتصالاً على منفذ معيّن (مثلاً 443).",
        "2 الراوتر يترجم عنوانك المحلي إلى عنوان عام ويوجّه الحزمة.",
        "3 الخادم يستقبل على نفس المنفذ ويرد بصفحة الويب.",
      ],
    },
    firstMistakeTrap: "ظنّ أن الـ IP وحده يكفي لفتح أي خدمة، ونسيان أن المنفذ هو الذي يحدد البرنامج المستهدف.",
    transitionLine: "ممتاز — الآن ولأنك لمست الفكرة بيدك، نرجع لخطتك ونبدأ المرحلة الأولى «أساسيات الحاسوب والأنظمة» على أرض صلبة.",
  },

  "uni-cybersecurity": {
    hookConcept: "أكثر اختراق أمني خطير لا يحدث بهجوم تقني، بل بكلمة مرور ضعيفة في موظف واحد.",
    concreteScenario: "بنك كاك في صنعاء، يوم اثنين عادي. موظف فرع تعز اسمه أحمد ضغط على رابط في رسالة قال له: «حدّث كلمة مرورك الآن». بعد دقيقتين، المهاجم دخل بصلاحياته وحوّل 4.2 مليون ريال. ما اخترق التشفير، اخترق أحمد.",
    labEnvBlueprint: "السياق: أنت محلل أمني جديد في فريق SOC ببنك سبأ الإسلامي، شاشتك تعرض 5 محاولات دخول مشبوهة في آخر 10 دقائق. البيانات الأولية: 5 سجلّات دخول لمستخدمين (asalem، fmohamed، amohsen، nhassan، rali) من IPs مختلفة، بعضها من صنعاء وبعضها من ألمانيا، مع طوابع زمنية متقاربة. الشاشات: لوحة محاولات الدخول، نافذة فحص قوة كلمات المرور، أداة تصنيف التهديد (طبيعي/مشبوه/هجوم)، شاشة كتابة تقرير الحادث. معايير النجاح: تصنيف صحيح للسجلات الخمسة + كتابة تقرير من 3 أسطر يحدد المستخدم المخترَق. الخطأ المتوقّع: تصنيف الدخول من ألمانيا كهجوم تلقائياً دون فحص كلمة المرور وتاريخ الدخول، وتجاهل دخول من صنعاء بكلمة مرور ضعيفة جداً (Pass1234) في توقيت غريب — وهذا الأخير هو الاختراق الحقيقي.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting cybersecurity attack chain, isometric flat icons of a phishing email envelope, a worried office employee at a desk, and a hacker silhouette accessing a vault, color-coded sections (soft lavender for email panel, warm orange for employee panel, deep red for breach panel), thin connector arrows showing attack progression, modern editorial poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the email, the employee, and the vault",
      captionTitleAr: "المفتاح: كيف يتسلّل الهجوم عبر الموظف",
      legendLinesAr: [
        "1 رسالة تصيّد تصل لموظف بصياغة عاجلة وثقة بصرية.",
        "2 الموظف يدخل بياناته على صفحة مزيّفة دون انتباه.",
        "3 المهاجم يدخل النظام بنفس صلاحيات الموظف ويتحرك بهدوء.",
      ],
    },
    firstMistakeTrap: "اعتبار الدخول من خارج اليمن دائماً هجوماً، بينما الاختراق الفعلي كان من داخل صنعاء بكلمة مرور ضعيفة.",
    transitionLine: "هذا بالضبط شعور المحلل الأمني الحقيقي — الآن نرجع لخطتك ونبدأ «مفاهيم الأمن والتهديدات» وأنت فاهم لماذا.",
  },

  "uni-data-science": {
    hookConcept: "البيانات الخام لا تتكلم، لكن المتوسط والوسيط يكشفان قصتين مختلفتين تماماً عن نفس الواقع.",
    concreteScenario: "مكتب تخطيط في عدن أصدر تقريراً قال: «متوسط دخل الأسرة 220,000 ريال شهرياً». الناس صدمت. الحقيقة؟ خمس عائلات ثرية رفعت المتوسط، بينما الوسيط الحقيقي كان 65,000 ريال — قصتان مختلفتان من نفس البيانات.",
    labEnvBlueprint: "السياق: أنت محلل بيانات في وزارة التخطيط بصنعاء، طُلب منك تحليل دخل 12 أسرة في حي معيّن قبل اتخاذ قرار دعم. البيانات الأولية: 12 رقم دخل بالريال اليمني (45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 90000, 95000, 850000, 1200000). الشاشات: جدول البيانات، حاسبة المتوسط/الوسيط/المنوال، رسم histogram للتوزيع، خانة لكتابة الاستنتاج. معايير النجاح: حساب صحيح للمتوسط (≈228,000) والوسيط (72,500) + تمييز أن البيانات ليست متماثلة + اختيار الوسيط للقرار. الخطأ المتوقّع: استخدام المتوسط الحسابي للحديث عن «الأسرة العادية» مع وجود قِيَم متطرفة، مما يؤدي لقرار دعم خاطئ.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout comparing statistical measures, isometric flat icons of a balanced scale, a tilted scale, and a bar chart with one tall outlier bar, color-coded sections (soft blue for mean panel, mint green for median panel, warm orange for outlier panel), thin connector arrows showing how outliers tilt the mean, generous whitespace, modern educational poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the mean, the median, and the outlier",
      captionTitleAr: "المفتاح: لماذا يكذب المتوسط أحياناً",
      legendLinesAr: [
        "1 المتوسط: مجموع القيم ÷ العدد، حسّاس للقيم المتطرفة.",
        "2 الوسيط: القيمة الوسطى بعد الترتيب، يتجاهل التطرف.",
        "3 القيمة المتطرفة: رقم واحد يكفي لإمالة المتوسط بعيداً عن الواقع.",
      ],
    },
    firstMistakeTrap: "الاعتماد على المتوسط الحسابي وحده دون النظر إلى توزيع البيانات وقيمها المتطرفة.",
    transitionLine: "هذا أبسط مثال — وهو يوضح لماذا «الإحصاء» هو حجر الأساس. الآن نرجع لخطتك ونبدأ المرحلة الأولى.",
  },

  "uni-accounting": {
    hookConcept: "كل عملية مالية في الكون تُسجَّل بطرفين متوازنين: مدين ودائن. اختلال جنيه واحد يُسقط النظام كله.",
    concreteScenario: "محل بقالة في شارع الزبيري بصنعاء، صاحبه أبو سامي اشترى بضاعة بـ 500,000 ريال نقداً. كثير من الناس يقولون «نقص فلوس». محاسبياً، لم ينقص شيء — تحوّلت قيمة من حساب «الصندوق» إلى حساب «المخزون»، والمعادلة بقيت متوازنة تماماً.",
    labEnvBlueprint: "السياق: أنت محاسب جديد في شركة الأمل التجارية بصنعاء — يناير 2026. صاحب الشركة يطلب منك إثبات 3 معاملات بسيطة وإخراج ميزان مراجعة. البيانات الأولية: رصيد افتتاحي للصندوق 1,000,000 ريال، شراء بضاعة نقداً 500,000، بيع بضاعة نقداً بـ 200,000 (تكلفتها 120,000)، سداد إيجار 30,000. الشاشات: شجرة الحسابات، إدخال القيود، حسابات T، ميزان المراجعة. معايير النجاح: ميزان المراجعة متوازن، صافي الربح 50,000 ريال (مبيعات 200,000 − تكلفة 120,000 − إيجار 30,000 = 50,000)، ورصيد الصندوق النهائي 670,000 ريال. الخطأ المتوقّع: عكس طرفَي قيد البيع (وضع البضاعة دائنة بالقيمة البيعية بدل التكلفة، وعدم الفصل بين قيد البيع وقيد تكلفة البضاعة المباعة).",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout of a perfectly balanced merchant scale, isometric flat icons of a coin pile on the left pan and a stack of goods on the right pan, with a central pivot pointer perfectly horizontal, color-coded sections (soft mint green for debit panel, warm orange for credit panel, deep blue for balance pivot), thin connector arrows pointing to each pan, generous whitespace, modern accounting poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the left pan, the right pan, and the balance pivot",
      captionTitleAr: "المفتاح: المعادلة المحاسبية الأبدية",
      legendLinesAr: [
        "1 الجانب المدين: ما دخل إلى الحساب أو زاد فيه.",
        "2 الجانب الدائن: ما خرج من الحساب أو نقص منه.",
        "3 التوازن: مجموع المدين = مجموع الدائن دائماً وأبداً.",
      ],
    },
    firstMistakeTrap: "اعتبار شراء البضاعة نقداً «خسارة» أو «نقص» في المال، بدل أن يكون تحويل قيمة من حساب لآخر داخل نفس المعادلة.",
    transitionLine: "بهذي اللحظة فهمتَ روح المحاسبة كلها — الآن نرجع لخطتك ونبني المرحلة الأولى «أساسيات المحاسبة والقيد المزدوج» بعمق.",
  },

  "uni-business": {
    hookConcept: "كل مشروع ناجح يُولد من 4 أسئلة فقط: من العميل؟ ما الألم؟ ما الحل؟ من سيدفع؟",
    concreteScenario: "شاب من تعز اسمه يوسف بدأ مشروع توصيل وجبات منزلية لطلاب الجامعة — استثمر 800,000 ريال. خسر كل شيء في 4 أشهر. السبب؟ صمّم الفكرة قبل أن يكتشف أن الطلاب يأكلون من بقالات الحي بـ 500 ريال، لا يدفعون 1500 لوجبة منزلية.",
    labEnvBlueprint: "السياق: أنت مستشار أعمال جديد، جاءك أمين بفكرة «خدمة غسيل ملابس متنقلة» في حي حدّة بصنعاء، ويريد منك دراسة جدوى أولية قبل أن يستثمر 1,500,000 ريال. البيانات الأولية: عدد سكان الحي ≈ 8,000 أسرة، متوسط دخل الأسرة 180,000 ريال شهرياً، 3 محلات غسيل تقليدية تشتغل بسعر 1,200 ريال للحلّة. الشاشات: لوحة Business Model Canvas (9 خانات)، حاسبة Break-Even Point، تحليل SWOT، خانة قرار (ابدأ/لا تبدأ/عدّل). معايير النجاح: ملء 9 خانات بمنطق متّسق + حساب نقطة التعادل (تقريباً 416 حلّة شهرياً عند سعر 1,500 ريال) + توصية مبنّاة على رقم. الخطأ المتوقّع: تقدير حصة سوقية متفائلة (40% من الحي) دون مبرر، فيخرج Break-Even منخفض زائف ويتوصّى بالبدء على بيانات وردية.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout of a business validation funnel, isometric flat icons of a crowd of customers, a magnifying glass examining a pain point, and a coin dropping into a piggy bank, color-coded sections (soft lavender for customer panel, warm orange for problem panel, mint green for revenue panel), thin connector arrows narrowing from left to right like a funnel, generous whitespace, modern entrepreneurship poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the customers, the magnifying glass, and the piggy bank",
      captionTitleAr: "المفتاح: القمع الذي يميّز الفكرة الناجحة من الفاشلة",
      legendLinesAr: [
        "1 شريحة عملاء واضحة قابلة للوصول.",
        "2 ألم حقيقي يدفعهم للبحث عن حل الآن.",
        "3 استعداد فعلي للدفع بسعر يغطّي تكاليفك.",
      ],
    },
    firstMistakeTrap: "افتراض أن وجود الناس في الحي يعني وجود سوق، دون التحقق من قدرة الدفع وحجم الألم الحقيقي.",
    transitionLine: "هذي طريقة المستشارين الكبار في التفكير — الآن نرجع لخطتك ونبدأ «مبادئ الإدارة والتخطيط الاستراتيجي» بعقلية محلّل.",
  },

  "uni-software-eng": {
    hookConcept: "الكود الجيد ليس الذي يعمل اليوم، بل الذي يفهمه زميلك بعد ستة أشهر دون أن يشتمك.",
    concreteScenario: "فريق تطوير في شركة برمجيات بصنعاء سلّم نظام محاسبة كامل لعميل بـ 6 ملايين ريال. بعد 7 أشهر طلب العميل تعديلاً صغيراً: إضافة حقل «الفرع». المهندس المسؤول استقال، الكود بلا توثيق، الفريق احتاج 18 يوماً لتعديل سطر واحد. كلفة سوء التصميم > سعر النظام نفسه.",
    labEnvBlueprint: "السياق: أنت مهندس برمجيات جديد في شركة كهرومين بصنعاء، ورثتَ كلاس User يكتب فيه كود الحفظ والتحقق وإرسال الإيميل وكل شيء في 600 سطر. عليك إعادة هيكلته. البيانات الأولية: كلاس واحد بـ 12 دالة (saveUser, validateEmail, sendWelcomeEmail, hashPassword, logActivity, exportToPdf, …). الشاشات: عرض الكود الأصلي، لوحة تطبيق مبادئ SOLID خطوة بخطوة، شجرة الكلاسات الجديدة، اختبار قبل/بعد. معايير النجاح: فصل المسؤوليات إلى 3+ كلاسات (UserRepository، EmailService، UserValidator)، اجتياز اختبارات الوحدة دون كسر السلوك. الخطأ المتوقّع: نقل الكود كما هو إلى ملفات منفصلة دون كسر التبعيات الفعلية، فيظل الترابط قوياً (Tight Coupling) ولا يتحقق هدف SRP رغم تغيّر شكل الملفات.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout comparing software architectures, isometric flat icons of a tangled spaghetti ball, a clean modular building, and a maintenance technician holding a wrench, color-coded sections (deep red for spaghetti panel, mint green for modular panel, soft blue for technician panel), thin connector arrows showing transformation from chaos to order, generous whitespace, modern software engineering poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the spaghetti, the modular building, and the technician",
      captionTitleAr: "المفتاح: الفرق بين كود يعمل وكود يدوم",
      legendLinesAr: [
        "1 كود متشابك: مسؤوليات مختلطة، تعديل واحد يكسر كل شيء.",
        "2 كود معماري: كل مكوّن مسؤولية واحدة واضحة.",
        "3 الصيانة المستقبلية: تكلفة منخفضة وسرعة عالية للتعديل.",
      ],
    },
    firstMistakeTrap: "الاعتقاد بأن إعادة الهيكلة تعني فقط تقسيم الملفات، دون إعادة توزيع المسؤوليات الحقيقية بين الكلاسات.",
    transitionLine: "هذا الإحساس بالفرق بين كود يعمل وكود يدوم — هو روح الهندسة. الآن نرجع لخطتك ونبدأ «هندسة المتطلبات والتصميم» بنية واعية.",
  },

  "uni-ai": {
    hookConcept: "الذكاء الاصطناعي لا «يفهم» — بل يحسب احتمالية أن الكلمة التالية مناسبة بناءً على ملايين الأمثلة.",
    concreteScenario: "طالب في جامعة صنعاء سأل ChatGPT: «اكتب لي مقال عن المخا». النموذج لم يقرأ عن المخا فعلياً، بل حسب أكثر الكلمات احتمالاً بعد كل كلمة سابقة (المخا → ميناء → بحري → اليمن…). نتيجة لغوية مذهلة، لكنها رياضيات، لا فهم.",
    labEnvBlueprint: "السياق: أنت باحث ذكاء اصطناعي ناشئ، تريد أن تفهم بنفسك كيف يتعلم النموذج. البيانات الأولية: 4 جمل تدريب بالعربية («القهوة اليمنية لذيذة»، «الشاي اليمني لذيذ»، «المخا ميناء»، «صنعاء عاصمة»)، ومُدخل اختبار: «الـ يمنية لـ». الشاشات: جدول كلمات وتكراراتها، حاسبة احتماليات Bigram، شاشة توليد الكلمة التالية، خانة تجربة جمل جديدة. معايير النجاح: حساب احتمالية صحيحة لظهور «لذيذة» بعد «اليمنية» (≈0.5)، توليد جملة منطقية من النموذج البسيط، وفهم لماذا «صنعاء» لن تظهر بعد «اليمنية». الخطأ المتوقّع: ظنّ أن النموذج «يعرف» معنى القهوة، بينما هو فقط لاحظ أن «لذيذة» تتلوها كثيراً في بيانات التدريب.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout illustrating language model prediction, isometric flat icons of a question mark bubble, a probability dice with multiple faces, and a chat reply bubble, color-coded sections (soft lavender for input panel, warm orange for probability panel, mint green for output panel), thin connector arrows showing flow from question to probabilities to answer, generous whitespace, modern AI educational poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the question, the dice, and the reply",
      captionTitleAr: "المفتاح: كيف «يتكلم» نموذج اللغة",
      legendLinesAr: [
        "1 المُدخل: سؤال أو بداية جملة.",
        "2 الاحتمالات: لكل كلمة محتملة وزن مبني على بيانات التدريب.",
        "3 الإخراج: الكلمة الأعلى احتمالاً تُختار وتتكرر العملية.",
      ],
    },
    firstMistakeTrap: "ظنّ أن النموذج يفهم المعنى الدلالي للكلمات، بينما هو في الحقيقة يحسب احتمالات إحصائية فقط.",
    transitionLine: "بهذي اللحظة هدمنا أكبر سوء فهم عن AI — الآن نرجع لخطتك ونبدأ «أساسيات الذكاء الاصطناعي والمنطق» على فهم صلب.",
  },

  "uni-mobile": {
    hookConcept: "تطبيق الموبايل ليس صفحة ويب — إنه دائرة حياة (Lifecycle) تبدأ وتُجمَّد وتُستأنف عشرات المرّات يومياً.",
    concreteScenario: "بنت في عدن كانت تكتب رسالة طويلة في تطبيق ملاحظات على جوّالها. جاءها اتصال، التطبيق اختفى، رجعت بعد 5 دقائق… الرسالة ضاعت. السبب؟ المطوّر لم يحفظ الحالة في onPause. ثلاث أسطر كود غيّرت تجربة 50,000 مستخدم.",
    labEnvBlueprint: "السياق: أنت مطوّر موبايل جديد في شركة بصنعاء، طُلب منك بناء شاشة بسيطة لإدخال ملاحظة سريعة، مع حفظها تلقائياً. البيانات الأولية: شاشة فيها TextField واحد + زر حفظ + متغير state للنص + قائمة 5 ملاحظات سابقة. الشاشات: محرّر الكود (شاشة Activity واحدة)، محاكي جوّال يعرض النتيجة، شريط أحداث Lifecycle (onCreate, onPause, onResume, onDestroy)، شاشة اختبار «أوقف التطبيق وارجع». معايير النجاح: عند الخروج المؤقّت ثم العودة، النص ما زال موجوداً في الحقل، والملاحظة محفوظة في القائمة عند الضغط على الزر. الخطأ المتوقّع: حفظ الحالة فقط داخل onCreate، فعند تدوير الشاشة أو خروج التطبيق مؤقتاً يضيع كل شيء، دون استخدام onSaveInstanceState أو ViewModel.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting mobile app lifecycle, isometric flat icons of a smartphone with active app screen, a paused frozen state with pause symbol, and a phone resuming with refresh circular arrow, color-coded sections (soft blue for active panel, warm gray for paused panel, mint green for resumed panel), thin connector arrows showing cyclic state transitions, generous whitespace, modern mobile development poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the active phone, the paused phone, and the resumed phone",
      captionTitleAr: "المفتاح: دورة حياة شاشة الموبايل",
      legendLinesAr: [
        "1 الإنشاء والعرض: تشغيل أوّل ودخول للشاشة.",
        "2 التجميد: عند مكالمة أو تطبيق آخر، النظام يُجمّد ويحرّر الذاكرة.",
        "3 الاستئناف: العودة للشاشة، يجب أن تستعيد كل ما حفظتَه.",
      ],
    },
    firstMistakeTrap: "افتراض أن متغيرات الكود تبقى حيّة طول عمر التطبيق، وتجاهل أن النظام يقتل العمليات بصمت لتحرير الذاكرة.",
    transitionLine: "هذا أهم درس في تطوير الموبايل — الآن نرجع لخطتك ونبدأ «أساسيات تطوير المحمول» وعندك حاسة سادسة للـLifecycle.",
  },

  "uni-cloud": {
    hookConcept: "السحابة ليست «جهاز شخص آخر»، بل قدرة على دفع تكلفة ما تستخدمه فعلاً، بالثانية لا بالشهر.",
    concreteScenario: "شركة تجارة إلكترونية في حضرموت اشترت سيرفر فعلي بـ 14,000 دولار ليتحمّل ذروة العيد، ثم بقي السيرفر خاملاً 11 شهراً. لو رفعتها على AWS، كانت ستدفع 90$ شهرياً + 600$ مؤقتاً في رمضان فقط. الفرق: 11,000 دولار في سنة واحدة.",
    labEnvBlueprint: "السياق: أنت مهندس سحابي جديد لشركة «نسيم» للتجارة الإلكترونية بصنعاء، عليك تصميم بنية تحتية مرنة لموقعهم قبل موسم العيد. البيانات الأولية: متوسط 200 زائر/ساعة، ذروة متوقعة 8,000 زائر/ساعة 4 أيام في السنة، قاعدة بيانات منتجات بحجم 12 GB، صور المنتجات 80 GB. الشاشات: مخطط البنية (EC2 + RDS + S3 + Load Balancer)، حاسبة تكاليف شهرية ثابتة مقابل سحابية، شاشة تفعيل Auto Scaling، تقرير مقارنة سيناريو واحد سنوي. معايير النجاح: تصميم بنية تستوعب الذروة، مع تكلفة سنوية إجمالية أقل من شراء سيرفر فعلي بـ ≥ 60%. الخطأ المتوقّع: تثبيت 8 EC2 طوال السنة لتحمّل الذروة، فتُلغى ميزة المرونة وترتفع التكاليف لأكثر من السيرفر الفعلي نفسه — دون استخدام Auto Scaling.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout comparing infrastructure models, isometric flat icons of a single bulky physical server in a small office, a flexible cloud with elastic stretching arrows, and a billing receipt with thin meter dial, color-coded sections (warm gray for physical panel, soft blue for cloud panel, mint green for billing panel), thin connector arrows showing scaling up and down, generous whitespace, modern cloud computing poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the physical server, the elastic cloud, and the receipt",
      captionTitleAr: "المفتاح: لماذا السحابة أرخص للمشاريع المتذبذبة",
      legendLinesAr: [
        "1 السيرفر التقليدي: تدفع ثمن الذروة طوال السنة.",
        "2 السحابة المرنة: تتوسّع وتنكمش حسب الحمل لحظياً.",
        "3 الفاتورة: لا تدفع إلا ثمن ما استخدمتَه فعلاً.",
      ],
    },
    firstMistakeTrap: "إبقاء سعة الذروة مشغّلة طوال السنة في السحابة، فتُهدر الميزة الأهم: المرونة الزمنية.",
    transitionLine: "هذي اللحظة فهمتَ سرّ السحابة الحقيقي — الآن نرجع لخطتك ونبدأ «مفاهيم الحوسبة السحابية» وأنت ترى التكلفة مع كل قرار.",
  },

  "uni-networks": {
    hookConcept: "كل بيانات على الإنترنت تُقطَّع لحزم صغيرة، تسافر في طرق مختلفة، وتُجمَّع في الطرف الآخر بترتيب صحيح.",
    concreteScenario: "موظف في شركة YOU بصنعاء أرسل ملف Excel بحجم 4 ميجا لزميله في عدن. الملف لم يُرسَل دفعة واحدة — قُسِّم إلى 2,800 حزمة، كل حزمة سلكت طريقاً مختلفاً، ووصلت بترتيب فوضوي، وبروتوكول TCP أعاد ترتيبها قبل أن يفتحها الزميل في 3 ثوان.",
    labEnvBlueprint: "السياق: أنت مهندس شبكات جديد في مزوّد إنترنت بصنعاء، عليك تشخيص لماذا اتصال أحد العملاء بطيء جداً. البيانات الأولية: 3 طرق ممكنة من العميل إلى الخادم (طريق عبر مسقط zoom 80ms، طريق عبر دبي 120ms، طريق عبر القاهرة 200ms مع 5% فقدان حزم)، حجم الملف المراد نقله 10 MB، MTU = 1500 بايت. الشاشات: خريطة الشبكة بالطرق الثلاثة، محاكي تجزئة الملف لحزم، عرض حركة الحزم في الوقت الحقيقي، مقارنة زمن الوصول الكلّي. معايير النجاح: حساب صحيح لعدد الحزم (≈6,667)، اختيار الطريق الأمثل (الطريق الأسرع غير الفاقد)، وفهم لماذا الطريق ذو 200ms + فقدان حزم هو الأسوأ بفارق كبير بسبب إعادة الإرسال. الخطأ المتوقّع: اختيار الطريق الأسرع نظرياً (80ms) دون التحقق من خسارة الحزم على هذا الطريق، فيكتشف لاحقاً أن إعادة الإرسال تجعل الزمن الحقيقي أبطأ من الطريق 120ms المستقر.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting packet routing across a network, isometric flat icons of a sender desktop, a multi-route mesh of network nodes with arrows taking different paths, and a receiver desktop reassembling pieces, color-coded sections (soft blue for sender panel, warm orange for routing panel, mint green for receiver panel), thin connector arrows showing parallel and divergent paths, generous whitespace, modern networking poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the sender, the routing mesh, and the receiver",
      captionTitleAr: "المفتاح: رحلة الملف عبر الإنترنت",
      legendLinesAr: [
        "1 المُرسِل: يقسّم الملف لحزم صغيرة بأرقام تسلسلية.",
        "2 الشبكة: كل حزمة تختار أسرع طريق متاح لحظياً.",
        "3 المستقبِل: يعيد ترتيب الحزم ويُجمّع الملف الأصلي.",
      ],
    },
    firstMistakeTrap: "اختيار الطريق ذي أقل Latency نظرياً دون النظر إلى نسبة فقدان الحزم وأثرها على إعادة الإرسال.",
    transitionLine: "هذا قلب الشبكات الحقيقي — الآن نرجع لخطتك ونبدأ «نموذج OSI وبروتوكولات TCP/IP» وعندك حدس عملي.",
  },

  "uni-food-eng": {
    hookConcept: "النشاط المائي (Aw) — وليس نسبة الرطوبة — هو من يقرر متى يفسد الغذاء، وهذه المعلومة وحدها تنقذ آلاف العائلات.",
    concreteScenario: "مصنع تمور في حضرموت أنتج دفعة 800 كيلو، نسبة رطوبتها 20% فقط. الإدارة اطمأنت. بعد 6 أسابيع، 30% من الدفعة عفنت. السبب؟ النشاط المائي Aw كان 0.78 — ضمن نطاق نمو الفطريات. الرطوبة خدعتهم، النشاط المائي قال الحقيقة.",
    labEnvBlueprint: "السياق: أنت مهندس جودة جديد في مصنع «الأمل» للتمور والعسل بحضرموت، عندك 4 منتجات وعليك تصنيف خطر الفساد لكل منها قبل التسعير. البيانات الأولية: تمر مجفف Aw=0.65، عسل خام Aw=0.55، تمر مكبوس بدبس Aw=0.82، عسل مخفّف بقليل ماء Aw=0.85. الشاشات: حاسبة Aw، خريطة نمو الكائنات الدقيقة (بكتيريا/خمائر/فطريات حسب Aw)، تصنيف المنتجات (آمن/يحتاج حفظ/خطر)، تقرير توصية. معايير النجاح: تصنيف صحيح للمنتجات الأربعة (التمر المجفف والعسل الخام آمنان، الاثنان الآخران في منطقة خطر)، مع توصية حفظ مناسبة لكل منتج. الخطأ المتوقّع: الاعتقاد أن العسل آمن دائماً بسبب حلاوته، وعدم إدراك أن إضافة قليل من الماء ترفع Aw فجأة فوق حد نمو الخمائر العثمانية.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout comparing food spoilage indicators, isometric flat icons of a moisture droplet meter, a water activity gauge with bacterial silhouettes at different levels, and a calendar showing shelf life, color-coded sections (soft blue for moisture panel, warm orange for water activity panel, mint green for shelf life panel), thin connector arrows showing the misleading gap between moisture and water activity, generous whitespace, modern food science poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the moisture meter, the water activity gauge, and the calendar",
      captionTitleAr: "المفتاح: لماذا النشاط المائي هو الحَكَم الحقيقي",
      legendLinesAr: [
        "1 الرطوبة: كمية الماء الكلّية، لكنها لا تكفي للحكم على الفساد.",
        "2 النشاط المائي Aw: نسبة الماء المتاح للكائنات الدقيقة فعلياً.",
        "3 العمر الافتراضي: يتحدّد بـ Aw + الحرارة + التغليف معاً.",
      ],
    },
    firstMistakeTrap: "الاعتماد على نسبة الرطوبة المئوية للحكم على سلامة الغذاء، وتجاهل النشاط المائي Aw الذي هو المعيار الفعلي.",
    transitionLine: "هذي قاعدة تقي مدناً كاملة من التسمم — الآن نرجع لخطتك ونبدأ «أساسيات علوم الأغذية وتركيبها» بحدس مهني.",
  },

  // ─────────────────────────── SKILLS ───────────────────────────
  "skill-html": {
    hookConcept: "HTML ليس «تصميم» — إنه بنية ذات معنى يقرأها المتصفح، محرّك البحث، وقارئ الشاشة للمكفوفين.",
    concreteScenario: "متجر إلكتروني بصنعاء بنى صفحته بـ <div> فقط. النتيجة: جوجل لم يفهم أن «iPhone 15» عنوان منتج، وقارئ شاشة الزبائن المكفوفين قرأ كل شيء بصوت ميكانيكي مسطّح. لما استبدلوا <div> بـ <h1>, <article>, <button>… زادت زياراتهم 40%.",
    labEnvBlueprint: "السياق: أنت مطوّر جديد في وكالة تسويق إلكتروني بصنعاء، طُلب منك بناء بطاقة منتج «بن المخا الفاخر» بمعنى دلالي صحيح، تقرأها جوجل وقارئ الشاشة بسلاسة. البيانات الأولية: اسم المنتج «بن المخا الفاخر»، السعر 12,000 ريال/كيلو، صورة (مسار وهمي)، 3 مميزات (محمَّص يدوياً، حبة عربية أصيلة، تعبئة 2026)، زر «أضف للسلة». الشاشات: محرّر HTML (ملف index.html فقط)، معاينة حية، مفتش دلالي يعدّ Heading/Article/Button/Img-alt، شاشة محاكاة قارئ شاشة. معايير النجاح: استخدام <article> للبطاقة، <h2> للاسم، <p> للوصف، <button> (لا <div>) للزر، <img alt=\"…\"> ذو وصف مفيد. الخطأ المتوقّع: استخدام <div> لكل العناصر مع class أنيقة، فتظهر الصفحة جميلة لكن مفتش الدلالة يصرّح بأن الصفحة بلا بنية، وقارئ الشاشة يقرأها كنصّ متواصل بلا معالم.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout comparing semantic vs non-semantic markup, isometric flat icons of a generic gray box wall, a labeled architectural blueprint with named rooms, and a screen reader headset device, color-coded sections (warm gray for div soup panel, soft blue for semantic panel, mint green for accessibility panel), thin connector arrows showing how structure helps machines understand, generous whitespace, modern web development poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the gray wall, the blueprint, and the headset",
      captionTitleAr: "المفتاح: لماذا الوسوم الدلالية تغيّر كل شيء",
      legendLinesAr: [
        "1 الـ div فقط: شكل بصري بلا معنى للمتصفح.",
        "2 الوسوم الدلالية: تخبر المتصفح ماذا يمثّل كل قسم.",
        "3 إمكانية الوصول وSEO: قارئ الشاشة وجوجل يفهمون البنية.",
      ],
    },
    firstMistakeTrap: "بناء الصفحة كاملة بـ <div> مع class أنيقة، والاعتقاد أن النتيجة البصرية الجميلة تكفي.",
    transitionLine: "ممتاز — الآن صفحتك «تتكلّم» بالمعنى الصحيح. نرجع لخطتك ونبدأ «هيكل صفحة HTML وعناصرها» بفهم عميق.",
  },

  "skill-css": {
    hookConcept: "Box Model — كل عنصر في الصفحة هو 4 طبقات متداخلة (محتوى، حشوة، حد، هامش)، وفهمه يحلّ 80% من مشاكل التخطيط.",
    concreteScenario: "مطوّر شاب في عدن أمضى 3 ساعات يحاول فهم لماذا زر «اشترِ الآن» يخرج من حدّ البطاقة. السبب لم يكن في الزر — كان في padding داخلي و box-sizing افتراضي يضيف الحجم بدل أن يطرحه. سطر CSS واحد حلّ المشكلة كلها.",
    labEnvBlueprint: "السياق: أنت مطوّر واجهات في وكالة بصنعاء، طُلب منك إصلاح بطاقة منتج «خراف اضحية العيد» تخرج عن حدود الصفحة على شاشة الموبايل. البيانات الأولية: HTML بسيط فيه 3 بطاقات، عرض كل بطاقة 350px + padding 20px + border 4px، وعرض الحاوية 1080px على ديسكتوب و 360px على موبايل. الشاشات: محرّر CSS، معاينة حية بشاشتين (موبايل/ديسكتوب)، مفتش Box Model يلوّن المحتوى/الحشوة/الحد/الهامش بألوان مختلفة، عدّاد العرض الفعلي. معايير النجاح: البطاقات الثلاث تظهر بالكامل داخل الحاوية على الشاشتين، باستخدام box-sizing: border-box مع تعديل عرض البطاقة لتلائم الموبايل. الخطأ المتوقّع: تعديل عرض البطاقة فقط دون تغيير box-sizing، فتظل البطاقة 350+20+20+4+4 = 398px وتفيض، أو إزالة الـpadding والـborder لتصلح المظهر فيخسر التصميم جماله.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout dissecting CSS box model layers, isometric flat icons of a layered concentric rectangle showing content/padding/border/margin, a measuring tape wrapping around a card, and two phone screens side by side comparing fits, color-coded sections (mint green for content panel, soft blue for padding panel, warm orange for border panel, lavender for margin panel), thin connector arrows decomposing the box, generous whitespace, modern CSS poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the content layer, the padding layer, and the border layer",
      captionTitleAr: "المفتاح: تشريح صندوق CSS",
      legendLinesAr: [
        "1 المحتوى: النص والصور التي تكتبها.",
        "2 الحشوة Padding: مسافة داخلية بين المحتوى والحد.",
        "3 الحد Border: السمك المرئي حول العنصر.",
      ],
    },
    firstMistakeTrap: "تعديل عرض العنصر دون فهم أن الـpadding والـborder يُضافان للعرض افتراضياً، فتفيض البطاقة عن حدود الحاوية.",
    transitionLine: "بهذي اللحظة هضمتَ Box Model عملياً — الآن نرجع لخطتك ونبدأ «المحددات والألوان والخطوط» بأساس متين.",
  },

  "skill-js": {
    hookConcept: "JavaScript ليس مجرد كود — إنه «حدث ينتظر حدثاً». تفهم Event Loop، تفهم لماذا تظل الواجهة تتحرك بينما البيانات تُحمَّل.",
    concreteScenario: "تطبيق توصيل في صنعاء كان يتجمّد كلما الزبون ضغط «احسب المسافة». السبب؟ المطوّر كتب حلقة طويلة على Main Thread تحجب كل شيء. لما حوّلها لـ async + setTimeout، الزر بدأ يستجيب فوراً والحساب يتم في الخلفية. مستخدم سعيد = مبيعات أكثر.",
    labEnvBlueprint: "السياق: أنت مطوّر فرونت إند جديد في تطبيق توصيل بصنعاء، عليك إصلاح زر «احسب التوصيل» الذي يجمّد الواجهة 3 ثوان. البيانات الأولية: ملف HTML بسيط، زر يستدعي دالة calculateDelivery() تشغّل حلقة 100,000,000 تكرار، شاشة فيها متحرك (loader) يجب أن يدور أثناء الحساب. الشاشات: محرّر JS، معاينة حية، شريط مراقبة Event Loop يعرض المهام في Call Stack وTask Queue، عدّاد إطارات FPS. معايير النجاح: الزر يستجيب فوراً، اللودر يدور أثناء الحساب، النتيجة تظهر بعد ≤4 ثواني، وFPS يبقى ≥30. الخطأ المتوقّع: محاولة جعل الحلقة async بكتابة async أمام الدالة فقط، دون تقسيم العمل لـchunks باستخدام setTimeout أو Web Worker — فتظل الواجهة متجمّدة لأن async وحدها لا تطلق الـMain Thread.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting JavaScript event loop, isometric flat icons of a single-lane call stack with arriving tasks, a queue line of waiting events, and a circular event loop arrow connecting them, color-coded sections (warm orange for stack panel, soft blue for queue panel, mint green for loop panel), thin connector arrows showing tasks moving from queue to stack, generous whitespace, modern JavaScript poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the call stack, the task queue, and the event loop",
      captionTitleAr: "المفتاح: قلب JavaScript النابض",
      legendLinesAr: [
        "1 Call Stack: مسار واحد ينفّذ مهمة واحدة في كل لحظة.",
        "2 Task Queue: طابور المهام المؤجّلة المنتظرة دورها.",
        "3 Event Loop: ينقل من الطابور للستاك حالما يفرغ.",
      ],
    },
    firstMistakeTrap: "إضافة كلمة async إلى دالة طويلة وافتراض أنها أصبحت تشتغل في الخلفية، دون تقسيم العمل أو استخدام Web Worker.",
    transitionLine: "هذا الفرق بين كاتب كود وكاتب تجربة — الآن نرجع لخطتك ونبدأ «أساسيات JavaScript والمتغيرات» بفهم Event Loop في خلفيتك.",
  },

  "skill-python": {
    hookConcept: "Python يشبه الإنجليزية لدرجة مخادعة — قوته الحقيقية في القوائم والقواميس وخدعها التي توفّر صفحات كود.",
    concreteScenario: "صاحب بقالة في صنعاء يريد تتبّع مبيعات 30 صنف يومياً. كتب زميلنا بـ JavaScript 60 سطر مع حلقات وكائنات. أعاد كتابتها بـ Python باستخدام Dictionary و list comprehension في 8 سطور. قراءة وفهماً، صيانةً، وتوسيعاً — Python كسبت بفارق ساحق.",
    labEnvBlueprint: "السياق: أنت محلل بيانات جديد لمحل سوبرماركت «الأمل» بصنعاء، عليك تحليل مبيعات 5 أصناف خلال أسبوع وإخراج تقرير. البيانات الأولية: قائمة 5 أصناف (سكر، أرز، زيت، شاي، حليب)، أسعارها بالريال (450, 1200, 2800, 800, 600)، كميات بيع يومية لـ 7 أيام كقائمة قوائم (مصفوفة 5×7). الشاشات: محرّر Python، نتيجة التشغيل (terminal)، ورقة بيانات الجدول، خانة كتابة التحليل النهائي. معايير النجاح: حساب إجمالي مبيعات كل صنف بالريال، معرفة الصنف الأعلى مبيعاً، وحساب متوسط البيع اليومي للسوبرماركت — كل ذلك في ≤15 سطر باستخدام list comprehension و zip. الخطأ المتوقّع: كتابة حلقة for داخل for مع متغير عدّاد يدوي وعمليات تجميع طويلة (≥30 سطر)، بدلاً من استخدام sum() وmax() وlist comprehension التي تُختصر كل ذلك.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout showing Python data structures in action, isometric flat icons of a numbered ordered list, a labeled key-value drawer cabinet, and a sleek single-line gear assembly producing output, color-coded sections (soft blue for list panel, warm orange for dictionary panel, mint green for comprehension panel), thin connector arrows showing data flowing into compact transformations, generous whitespace, modern Python poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the list, the cabinet, and the gear assembly",
      captionTitleAr: "المفتاح: الأدوات التي تجعل Python موجزة",
      legendLinesAr: [
        "1 القائمة List: مجموعة مرتّبة من العناصر.",
        "2 القاموس Dict: ربط مفتاح بقيمة بسرعة فائقة.",
        "3 List Comprehension: حلقة + تحويل + جمع في سطر واحد.",
      ],
    },
    firstMistakeTrap: "كتابة Python بأسلوب C/Java بحلقات for التقليدية ومتغيرات عدّ يدوية، بدل استخدام دواله المختصرة وlist comprehension.",
    transitionLine: "هذي روح Python الحقيقية — الآن نرجع لخطتك ونبدأ «أساسيات Python والمتغيرات» وعندك حدس بايثوني سليم.",
  },

  "skill-cpp": {
    hookConcept: "C++ يعطيك سلطة مطلقة على الذاكرة — وكل سلطة بلا فهم تتحوّل لتسريب يقتل البرنامج بصمت.",
    concreteScenario: "مطوّر في شركة ألعاب صنعانية بنى لعبة بسيطة. كل جولة كانت تخصّص ذاكرة لشخصية اللاعب وتنسى تحريرها. بعد 50 جولة، اللعبة تأكل 2 GB رام وتنهار. سبب الانهيار؟ نسيان `delete` بعد `new`. سطر واحد كلّف فريقاً كاملاً أسبوعاً من البحث.",
    labEnvBlueprint: "السياق: أنت مطوّر C++ جديد، عليك بناء برنامج صغير يدير قائمة 10 طلاب في مدرسة بصنعاء، يضيف ويحذف ويعرض. البيانات الأولية: كلاس Student فيه اسم وعمر ومعدّل، مع مؤشّر ديناميكي لمصفوفة درجات بحجم متغيّر. الشاشات: محرّر كود C++، نتيجة التشغيل (terminal)، شريط مراقبة الذاكرة المخصَّصة لحظياً، عدّاد new/delete. معايير النجاح: إضافة وحذف 10 طلاب، عدد new = عدد delete في النهاية، الذاكرة المخصَّصة = 0 عند الخروج. الخطأ المتوقّع: استخدام new عند إنشاء الطالب دون كتابة destructor يحرّر مصفوفة الدرجات الديناميكية، فيظهر تسريب في كل عملية حذف ويزداد استهلاك الذاكرة بمرور الوقت.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting C++ memory management, isometric flat icons of a memory chip with empty slots, a finger pointer pressing into a slot, and a janitor with broom cleaning released slots, color-coded sections (soft blue for stack panel, warm orange for heap panel, mint green for cleanup panel), thin connector arrows showing allocation and deallocation cycles, generous whitespace, modern systems programming poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the chip, the pointer, and the janitor",
      captionTitleAr: "المفتاح: عقد الذاكرة في C++",
      legendLinesAr: [
        "1 الذاكرة المتاحة: مساحة محدودة تُقسَّم بين كل برامج النظام.",
        "2 التخصيص new: تحجز جزءاً منها لكائنك.",
        "3 التحرير delete: يجب أن يقابل كل new، وإلا يحدث تسرّب.",
      ],
    },
    firstMistakeTrap: "استخدام new دون كتابة destructor يحرّر الموارد الديناميكية الداخلية للكائن، فيحدث تسرّب صامت لا يظهر فوراً.",
    transitionLine: "بهذي اللحظة لمستَ روح C++ الحقيقية — الآن نرجع لخطتك ونبدأ «أساسيات C++ والمتغيرات» وعندك وعي بالذاكرة.",
  },

  "skill-c": {
    hookConcept: "لغة C هي «الأم» — كل لغة حديثة (Python, Java, JavaScript) مكتوبة بها أو بمشتقّاتها. المؤشرات هي قلبها النابض.",
    concreteScenario: "طالب في كلية الحاسوب بجامعة عدن قضى ليلتين يحاول فهم لماذا برنامجه يطبع رقماً عشوائياً بدل اسم المستخدم. السبب: كان يعيد عنوان متغيّر محلّي من الدالة. لمّا فهم أن المتغيّر «يموت» مع نهاية الدالة، عرف لماذا المؤشّر صار «مكسوراً».",
    labEnvBlueprint: "السياق: أنت مبرمج C جديد، عليك كتابة برنامج يأخذ اسماً من المستخدم ويعيده مع تحية. البيانات الأولية: ملف C فارغ، إدخال نصي «أحمد»، مكتبتا stdio.h و string.h فقط. الشاشات: محرّر C، terminal للتشغيل، عارض الذاكرة (Stack vs Heap) مع تتبّع المتغيّرات وعمرها، شاشة تحذيرات المؤشرات. معايير النجاح: البرنامج يقرأ الاسم بأمان (دون buffer overflow)، يصنع جملة «أهلاً يا أحمد»، ويطبعها مرة واحدة دون قمامة ذاكرة. الخطأ المتوقّع: إعادة عنوان مصفوفة محلّية من دالة greet()، فيُظهر العارض أن المؤشّر يشير لمنطقة ذاكرة تحرّرت بعد انتهاء الدالة، وقراءتها تعطي قيماً عشوائية أو تُحدث Segfault.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout illustrating C pointers, isometric flat icons of a row of memory slots with addresses, an arrow finger pointing into a specific slot, and a broken arrow pointing to an empty void, color-coded sections (soft blue for memory grid panel, warm orange for valid pointer panel, deep red for dangling pointer panel), thin connector arrows showing reference and dereference, generous whitespace, modern C programming poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the memory grid, the valid pointer, and the broken pointer",
      captionTitleAr: "المفتاح: المؤشّر بين الصحّة والكسر",
      legendLinesAr: [
        "1 الذاكرة: شبكة مواقع، كل موقع له عنوان.",
        "2 المؤشّر السليم: يحمل عنواناً لمتغيّر ما زال حيّاً.",
        "3 المؤشّر المكسور: يحمل عنوان متغيّر تحرّر — قراءته كارثة.",
      ],
    },
    firstMistakeTrap: "إعادة عنوان متغيّر محلّي من داخل دالة، وافتراض أن العنوان يبقى صالحاً بعد انتهاء الدالة.",
    transitionLine: "هذا أهم درس في C كله — الآن نرجع لخطتك ونبدأ «أساسيات C والمتغيرات» وعندك حذر صحّي تجاه المؤشرات.",
  },

  "skill-java": {
    hookConcept: "Java كل شيء فيها كائن (Object) — حتى البرنامج الأبسط يبدأ بـ class. فهمت OOP، فهمت Java.",
    concreteScenario: "فريق طلاب في جامعة تعز بنى نظام إدارة مكتبة بـ Java. كل كتاب كان متغيّراً منفرداً، كل قارئ متغيّراً منفرداً، النتيجة 1200 سطر لا يمكن صيانتها. لمّا أعادوا الكتابة بـ class Book و class Reader و class Library، صار النظام 280 سطراً وقابلاً للتوسيع.",
    labEnvBlueprint: "السياق: أنت مطوّر Java جديد في شركة برمجيات بصنعاء، عليك بناء نظام صغير لمكتبة محلية فيها 4 كتب و2 قارئ. البيانات الأولية: قائمة كتب أولية («تاريخ اليمن»، «الإمام الشوكاني»، «شعر البردوني»، «معجم البلدان اليمني»)، قائمة قراء أوّلية (سامر، فاطمة)، عمليات استعارة وإرجاع وعرض الكتب المتاحة. الشاشات: محرّر Java، terminal، عارض الكلاسات والعلاقات (UML مبسّط)، شاشة تشغيل سيناريو (سامر يستعير كتاب…). معايير النجاح: تعريف كلاسات Book و Reader و Library بمسؤوليات منفصلة، استعارة كتاب تنقل ملكيته للقارئ، إرجاع يعيد إتاحته. الخطأ المتوقّع: وضع كل المنطق داخل كلاس Library واحد (God Class)، حيث Library تعرف تفاصيل القارئ وتفاصيل الكتاب وتنفّذ كل شيء — مما يخالف Single Responsibility ويمنع التوسّع.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting object-oriented design, isometric flat icons of a class blueprint diagram, three distinct labeled containers passing items between each other, and a UML-style relationship arrow diagram, color-coded sections (soft blue for class panel, warm orange for object panel, mint green for relationship panel), thin connector arrows showing message passing, generous whitespace, modern Java OOP poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the blueprint, the containers, and the arrow diagram",
      captionTitleAr: "المفتاح: عقل البرمجة الكائنية",
      legendLinesAr: [
        "1 الكلاس: قالب يصف خصائص الكائن وسلوكه.",
        "2 الكائن: نسخة حيّة من الكلاس بقيم محدّدة.",
        "3 العلاقات: كائن يستخدم كائناً آخر بمسؤولية واحدة لكل واحد.",
      ],
    },
    firstMistakeTrap: "وضع كل المنطق داخل كلاس واحد كبير (God Class) بدل توزيع المسؤوليات على كلاسات متخصّصة.",
    transitionLine: "بهذي اللحظة لمستَ روح OOP — الآن نرجع لخطتك ونبدأ «أساسيات Java والكلاسات» بفهم معماري.",
  },

  "skill-linux": {
    hookConcept: "Linux يعطيك التحكّم الكامل — كل شيء في النظام ملف، وكل ملف يقبل الأوامر التي تختار.",
    concreteScenario: "مدير سيرفر في شركة استضافة بصنعاء فقد ساعة كاملة يبحث عن ملف لوغ امتلأ وأوقف الخدمة. لو عرف 3 أوامر فقط (du -sh، find، tail -f)، كان وجد الملف في 30 ثانية وحرّر 8 GB قبل أن يلاحظ العملاء.",
    labEnvBlueprint: "السياق: أنت مدير نظام Linux مبتدئ في سيرفر استضافة بصنعاء، طُلب منك تشخيص لماذا القرص امتلأ وإيجاد أكبر 3 ملفات والتحقّق من السجلات. البيانات الأولية: نظام افتراضي فيه /var/log/app.log بحجم 6 GB، /home/user/dump.sql بحجم 2 GB، /tmp/cache بحجم 1 GB، ومجلد /etc طبيعي. الشاشات: terminal كامل (bash)، شجرة الملفات بصرية، شاشة عرض حجم القرص لحظياً، شاشة سجل أوامر مكتشف. معايير النجاح: تشغيل df -h لرؤية امتلاء القرص، استخدام du لتحديد المجلد الكبير، استخدام find أو ls -lhS لتحديد أكبر 3 ملفات، وtail لقراءة آخر الأخطاء. الخطأ المتوقّع: تشغيل rm -rf على ملف اللوغ مباشرةً دون التحقّق من الخدمة التي تكتب فيه، أو حذف ملفات داخل /etc بظنّ أنها مؤقتة، مما يكسر إعدادات حسّاسة.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting Linux command line power, isometric flat icons of a terminal window with a blinking cursor, a tree of folders and files with a magnifying glass scanning sizes, and a lightning bolt symbolizing instant action, color-coded sections (deep navy for terminal panel, soft blue for filesystem panel, warm orange for action panel), thin connector arrows showing commands flowing into actions, generous whitespace, modern Linux poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the terminal, the file tree, and the lightning bolt",
      captionTitleAr: "المفتاح: قوة سطر الأوامر",
      legendLinesAr: [
        "1 Terminal: نقطة دخولك المباشرة لكل شيء في النظام.",
        "2 Filesystem: شجرة موحّدة، كل شيء فيها ملف بمسار واضح.",
        "3 الأمر: كلمة واحدة قد تستبدل ساعة عمل بالواجهة الرسومية.",
      ],
    },
    firstMistakeTrap: "تشغيل rm -rf على ملفات يبدو أنها كبيرة دون التأكّد من ارتباطها بخدمات حيّة أو إعدادات حسّاسة.",
    transitionLine: "هذي اللحظة فهمتَ سرّ Linux — الآن نرجع لخطتك ونبدأ «أساسيات Linux والأوامر الأساسية» بثقة.",
  },

  "skill-windows": {
    hookConcept: "Windows ليس فقط واجهة رسومية — له PowerShell الذي يجعلك تدير 1000 جهاز بأمر واحد.",
    concreteScenario: "مسؤول شبكة في وزارة بصنعاء طُلب منه إعادة تسمية 200 ملف على سيرفر. بدأ يدوياً، أمضى ساعتين. زميله أنهى المهمة بسطر PowerShell واحد في 4 ثوان. الفرق ليس في الجهاز، الفرق في معرفة الأداة.",
    labEnvBlueprint: "السياق: أنت مسؤول تقنية معلومات جديد لمكتب صغير بصنعاء، عليك تنظيم 50 ملف صور في مجلد عملاء، إعادة تسميتها بنمط موحّد وتحريك القديمة لأرشيف. البيانات الأولية: مجلد C:\\Customers فيه 50 ملف بأسماء عشوائية (IMG_0234.jpg، scan1.png…)، تواريخ تعديل تتراوح خلال 6 أشهر. الشاشات: PowerShell، File Explorer (محاكاة)، عارض السكربت خطوة بخطوة، شاشة سجل التغييرات. معايير النجاح: استخدام Get-ChildItem لقراءة الملفات، Rename-Item بنمط موحّد (Customer_001.jpg…)، Move-Item للقديمة (>3 شهور) إلى مجلد Archive — كل ذلك بسكربت واحد قابل للتشغيل ثانيةً. الخطأ المتوقّع: تشغيل أمر إعادة تسمية بدون -WhatIf أولاً، فيُعاد تسمية كل الملفات بنفس الاسم (الأخير يكتب فوق الأوّل) ويفقد المستخدم 49 ملفاً قبل أن يدرك الخطأ.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting Windows PowerShell automation, isometric flat icons of a manual hand dragging files one by one, a powershell terminal window with a single magic command, and a row of perfectly organized folder cabinets, color-coded sections (warm gray for manual panel, deep blue for powershell panel, mint green for organized panel), thin connector arrows showing transformation from chaos to order, generous whitespace, modern Windows administration poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the manual hand, the terminal, and the cabinets",
      captionTitleAr: "المفتاح: قوة الأتمتة",
      legendLinesAr: [
        "1 العمل اليدوي: ساعات لمهمّة متكرّرة معرّضة للخطأ.",
        "2 PowerShell: سطر واحد ينفّذ المهمّة على كل العناصر.",
        "3 النتيجة: تنظيم متسق وقابل للتكرار في ثوان.",
      ],
    },
    firstMistakeTrap: "تشغيل سكربت Rename-Item كامل دون اختباره أولاً بـ -WhatIf، فيتم استبدال جميع الأسماء بنفس النمط ويُكتب الملف فوق الآخر.",
    transitionLine: "هذي قوة Windows الحقيقية — الآن نرجع لخطتك ونبدأ «إدارة نظام Windows» بعقلية أتمتة.",
  },

  "skill-net-basics": {
    hookConcept: "كل اتصال شبكي يمرّ بـ 7 طبقات (OSI) — وفهم أيها مسؤول عن أيّ مشكلة هو الفرق بين تشخيص دقيق وتخمين عشوائي.",
    concreteScenario: "موظف في شركة بصنعاء قال «الإنترنت لا يعمل». الفنّي قال «جرّب أعد تشغيل الراوتر». 3 إعادات لم تنفع. حقيقة المشكلة: الكيبل ضعيف (طبقة 1 — Physical). لو سأل في البداية «هل تستطيع رؤية رمز الشبكة؟» لوصل للحل في 30 ثانية بدل ساعة.",
    labEnvBlueprint: "السياق: أنت فنّي شبكات في مزوّد إنترنت بصنعاء، يصلك 5 شكاوى مختلفة من عملاء، وعليك تشخيص الطبقة المسؤولة عن كل شكوى قبل اقتراح الحل. البيانات الأولية: شكوى1 «الكيبل مفصول»، شكوى2 «IP يتعارض مع جهاز آخر»، شكوى3 «أستطيع تصفّح المواقع لكن البريد لا يفتح»، شكوى4 «الواي فاي ضعيف»، شكوى5 «شهادة SSL منتهية». الشاشات: لوحة الشكاوى، مخطط طبقات OSI تفاعلي، شاشة تصنيف كل شكوى للطبقة الصحيحة، شاشة كتابة خطوات التشخيص. معايير النجاح: تصنيف صحيح للطبقات الخمس (Physical، Network، Application، Physical، Application)، واقتراح خطوة تشخيص واحدة منطقية لكل طبقة. الخطأ المتوقّع: تصنيف كل المشاكل في «طبقة الإنترنت» (Network)، وعدم التمييز بين مشكلة كابل (Layer 1) ومشكلة بروتوكول SSL (Layer 7)، فيُعطى الحل الخاطئ ويستنزف وقت العميل.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout illustrating OSI layered model, isometric flat icons of a stacked layered cake with seven horizontal slices in graduated colors, a magnifying glass focused on one specific slice, and a wrench fixing only that slice, color-coded sections (gradient blue-to-orange across stack panel, mint green for diagnosis panel, warm yellow for fix panel), thin connector arrows showing how each layer sits on the one below, generous whitespace, modern networking education poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the bottom layer, the middle layer, and the top layer",
      captionTitleAr: "المفتاح: نموذج OSI ولماذا يهمّك",
      legendLinesAr: [
        "1 الطبقات السفلية: كابل، إشارة، عنوان MAC.",
        "2 الطبقات الوسطى: IP، توجيه، اتصال TCP.",
        "3 الطبقات العليا: HTTP، DNS، SSL، التطبيق.",
      ],
    },
    firstMistakeTrap: "الافتراض أن «الإنترنت لا يعمل» يعني دائماً مشكلة في الشبكة، دون تشخيص أي طبقة بالضبط هي المعطّلة.",
    transitionLine: "هذي عقلية مهندس الشبكات الحقيقي — الآن نرجع لخطتك ونبدأ «نموذج OSI وTCP/IP» بعمق وممارسة.",
  },

  "skill-nmap": {
    hookConcept: "Nmap لا يخترق — إنه يسأل بأدب: «أيّ منافذ مفتوحة لديك؟» وإجابات هذي السؤال تكشف 80% من نقاط الضعف.",
    concreteScenario: "مختبر اختراق في شركة استشارات بصنعاء فحص شركة عميلة. بـ nmap -sV -p 1-1000 على نطاق واحد، اكتشف منفذاً مفتوحاً لقاعدة بيانات MySQL على الإنترنت بكلمة مرور افتراضية. ثغرة بحجم كارثة — كشفها أمر واحد في 12 ثانية.",
    labEnvBlueprint: "السياق: أنت محلل أمني جديد طُلب منك إجراء تقييم سريع لشبكة شركة افتراضية «نسيم» قبل تدقيق رسمي. البيانات الأولية: نطاق IP مكوّن من 4 أجهزة (192.168.10.10 خادم ويب، 192.168.10.20 قاعدة بيانات، 192.168.10.30 محطّة عمل، 192.168.10.40 طابعة شبكية). كل جهاز يفتح منافذ مختلفة (بعضها متوقّع وبعضها غير متوقّع). الشاشات: واجهة Nmap مبسّطة مع خيارات (-sS -sV -O -p)، شاشة عرض النتائج، شاشة تصنيف المنافذ (متوقّع/مشبوه/خطر)، شاشة كتابة تقرير. معايير النجاح: اكتشاف المنافذ المفتوحة، تصنيف 80/443 على الويب كـ«طبيعي»، 3306 على قاعدة البيانات المعرّضة للإنترنت كـ«خطر حرج»، و23 (Telnet) على الطابعة كـ«مشبوه». الخطأ المتوقّع: استخدام مسح -sS بدون -sV فيُكتشف المنفذ مفتوحاً لكن لا يُعرف نوع الخدمة وإصدارها، فيُعطى تقرير ضعيف لا يحدّد ما إذا كانت الخدمة قديمة وقابلة للاستغلال.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting network port scanning, isometric flat icons of a building facade with multiple labeled doors at various floors, a flashlight beam systematically illuminating each door, and a checklist clipboard noting which doors opened, color-coded sections (soft blue for building panel, warm orange for scanning panel, mint green for report panel), thin connector arrows showing the scan progression door by door, generous whitespace, modern cybersecurity poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the building, the flashlight, and the clipboard",
      captionTitleAr: "المفتاح: كيف يرى Nmap الشبكة",
      legendLinesAr: [
        "1 الجهاز: مبنى افتراضي بمنافذ كثيرة محتملة.",
        "2 المسح: سؤال منظَّم لكل منفذ هل هو مفتوح ولأي خدمة.",
        "3 التقرير: قائمة المنافذ المفتوحة والخدمات وإصداراتها.",
      ],
    },
    firstMistakeTrap: "الاكتفاء بمسح -sS الذي يقول إن المنفذ مفتوح، دون -sV الذي يكشف نوع الخدمة وإصدارها لتقدير الخطر الحقيقي.",
    transitionLine: "هذي روح المسح الذكي — الآن نرجع لخطتك ونبدأ «مبادئ Nmap ومسح المنافذ» على فهم متين.",
  },

  "skill-wireshark": {
    hookConcept: "Wireshark يجعلك ترى ما يقوله جهازك «بصوت عالٍ» على الشبكة — وأحياناً ما يقوله يكشف أنه مخترَق.",
    concreteScenario: "في فحص اعتيادي لشبكة بنك صنعاني، فتح المحلل Wireshark على واجهة الشبكة فلاحظ جهاز موظف يرسل حزم DNS إلى خادم في دولة بعيدة كل 30 ثانية بانتظام. لم يكن نشاطاً عادياً — كان برنامج تجسّس يُسرّب كلمات السر. شاشة Wireshark وحدها كشفت ما لم يره مكافح الفيروسات.",
    labEnvBlueprint: "السياق: أنت محلل أمني جديد في فريق SOC ببنك بصنعاء، استلمت ملف pcap من جهاز موظف يُشتبه أنه مخترَق، وعليك تحليله. البيانات الأولية: ملف pcap محاكاة فيه ≈300 حزمة (تصفّح ويب طبيعي + 12 حزمة DNS مشبوهة لخادم خارجي + 4 حزمات HTTP بكلمات مرور بصيغة plain text). الشاشات: واجهة Wireshark مبسّطة، شاشة الفلاتر (filter)، شاشة تفاصيل الحزمة، شاشة كتابة استنتاج الحادث. معايير النجاح: استخدام فلتر dns لرؤية حزم DNS، اكتشاف النمط الزمني المشبوه، استخدام فلتر http للعثور على كلمات المرور المرسلة بنص واضح، وكتابة استنتاج من 3 جمل يحدد الجهاز المخترَق. الخطأ المتوقّع: التركيز فقط على الحزم الكبيرة الحجم وإهمال حزم DNS الصغيرة المتكرّرة، فيفوّت المحلل القناة السرّية الحقيقية المستخدمة للتسريب.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting packet inspection with a network analyzer, isometric flat icons of a stream of multicolored packets flowing through a pipe, a microscope examining one packet in detail, and a magnifying glass over a suspicious red packet hidden in the stream, color-coded sections (soft blue for stream panel, warm orange for inspection panel, deep red for suspicious panel), thin connector arrows showing the analyst zooming into hidden detail, generous whitespace, modern cybersecurity analysis poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the packet stream, the microscope, and the suspicious packet",
      captionTitleAr: "المفتاح: عيون المحلل في الشبكة",
      legendLinesAr: [
        "1 الحركة: كل اتصال يحوي عشرات الحزم بأنواع مختلفة.",
        "2 الفلتر: يقصر الرؤية على نوع محدّد (DNS، HTTP…).",
        "3 الكشف: نمط متكرّر وغير مبرَّر = تحقيق فوري.",
      ],
    },
    firstMistakeTrap: "التركيز على الحزم الكبيرة الحجم وإهمال الحزم الصغيرة المتكرّرة (مثل DNS) التي تُستخدم كقنوات سرّية للتسريب.",
    transitionLine: "بهذي اللحظة تذوّقت تحليل الحزم الحقيقي — الآن نرجع لخطتك ونبدأ «تثبيت Wireshark والتقاط الحزم» باحترافية.",
  },

  "skill-yemensoft": {
    hookConcept: "يمن سوفت ليس برنامجاً — إنه نظام محاسبي متكامل يُترجم كل عملية تجارية لقيد محاسبي تلقائي.",
    concreteScenario: "محل قطع غيار بشارع تعز بصنعاء كان يكتب فواتيره يدوياً ويحسب مخزونه في دفتر. خلال شهر يفقد 8% من المبيعات بسبب أخطاء حسابية وفقدان مرجع. بعد تركيب يمن سوفت، كل فاتورة تُرحَّل تلقائياً للحسابات وتنقص من المخزون لحظياً — فقد الفاقد، ووُلد قرار شراء مبني على بيانات لا على ذاكرة.",
    labEnvBlueprint: "السياق: أنت محاسب جديد في محل «الأمل لقطع الغيار» بصنعاء، صاحب المحل ركّب لك يمن سوفت لأول مرة، ويريد منك إثبات أول دورة بيع كاملة. البيانات الأولية: شركة جديدة برصيد افتتاحي للصندوق 2,000,000 ريال، صنف واحد «فلتر زيت تويوتا» 500 وحدة بسعر تكلفة 800 ريال، عميل «أبو سامي» بحدّ ائتماني 500,000 ريال. الشاشات: شاشة شجرة الحسابات، شاشة الأصناف، شاشة فاتورة المبيعات (نقدي/آجل)، شاشة ميزان المراجعة. معايير النجاح: إصدار فاتورة بيع آجل لأبو سامي بـ 50 فلتر بسعر 1,200 ريال، التحقّق من نقص المخزون 50 وحدة، وأن ميزان المراجعة يعرض ذمة العميل 60,000 وأن إجمالي تكلفة المبيعات 40,000 وأن الربح المحتمل 20,000. الخطأ المتوقّع: إصدار فاتورة بيع نقدي بدلاً من آجل لعميل لم يدفع بعد، أو تجاهل اختيار «حساب العميل» فلا يظهر دَين المستحقّ في كشف العملاء، فينكشف الخطأ في تقرير الذمم المدينة.",
    imageBlueprint: {
      fluxPrompt: "professional editorial infographic illustration, clean three-panel layout depicting integrated accounting flow, isometric flat icons of a sales invoice document, a warehouse with shelves showing decreasing stock, and a financial report ledger with auto-generated entries, color-coded sections (soft blue for invoice panel, warm orange for inventory panel, mint green for ledger panel), thin connector arrows showing automatic propagation from one to the others, generous whitespace, modern ERP poster style, vector art, ultra detailed, 4k quality, NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3 marking the invoice, the warehouse, and the ledger",
      captionTitleAr: "المفتاح: قوة الترحيل التلقائي في يمن سوفت",
      legendLinesAr: [
        "1 الفاتورة: عملية تجارية واحدة يُسجّلها المحاسب.",
        "2 المخزون: ينقص تلقائياً بعدد الوحدات المباعة.",
        "3 الحسابات: قيد محاسبي يُرحَّل لحظياً للذمم والإيرادات.",
      ],
    },
    firstMistakeTrap: "إصدار فاتورة بيع نقدي لعميل لم يدفع بعد، أو نسيان ربط الفاتورة بحساب العميل، فلا تظهر الذمة في كشف العملاء.",
    transitionLine: "هذا أهم درس في يمن سوفت كله — الآن نرجع لخطتك ونبدأ «أساسيات النظام والتهيئة» بفهم نظامي.",
  },
};

/**
 * Lookup a kit by subjectId. Returns undefined for subjects without a
 * registered kit (the addendum builder then falls back to its legacy
 * generic instructions).
 */
export function getShowcaseKit(subjectId: string | undefined | null): SubjectShowcaseKit | undefined {
  if (!subjectId) return undefined;
  return SUBJECT_SHOWCASE_KITS[subjectId];
}

/**
 * Short topic (≤ 5 Arabic words) per subject for the canonical
 * `[MISTAKE: topic ||| description]` tag. Pairs with `firstMistakeTrap`
 * (used as the description). The server-side parser at
 * `routes/ai.ts` requires both a topic and a description separated by
 * `|||`; emitting only the trap text would silently fail to persist
 * into `studentMistakesTable`.
 */
export const FIRST_MISTAKE_TOPICS: Record<string, string> = {
  "uni-it": "IP والمنفذ",
  "uni-cybersecurity": "تصنيف التهديد",
  "uni-data-science": "المتوسط مقابل الوسيط",
  "uni-accounting": "قيد البيع المزدوج",
  "uni-business": "تقدير حصة السوق",
  "uni-software-eng": "إعادة الهيكلة",
  "uni-ai": "فهم النماذج اللغوية",
  "uni-mobile": "دورة حياة التطبيق",
  "uni-cloud": "المرونة السحابية",
  "uni-networks": "Latency مقابل فقدان الحزم",
  "uni-food-eng": "النشاط المائي Aw",
  "skill-html": "دلالة HTML",
  "skill-css": "Box Model",
  "skill-js": "غير المتزامن",
  "skill-python": "أسلوب Pythonic",
  "skill-cpp": "إدارة الذاكرة",
  "skill-c": "نطاق المتغيرات",
  "skill-java": "تصميم الكلاسات",
  "skill-linux": "الأوامر التدميرية",
  "skill-windows": "اختبار سكربت PowerShell",
  "skill-net-basics": "تشخيص الطبقات",
  "skill-nmap": "كشف الإصدار",
  "skill-wireshark": "حزم DNS الصغيرة",
  "skill-yemensoft": "نوع الفاتورة",
};

/** Helper: returns canonical topic for a subject, or a safe fallback. */
export function getFirstMistakeTopic(subjectId: string | undefined | null): string {
  if (!subjectId) return "خطأ مفاهيمي أول";
  return FIRST_MISTAKE_TOPICS[subjectId] ?? "خطأ مفاهيمي أول";
}
