export interface Lesson {
  id: string;
  title: string;
}

export interface Unit {
  id: string;
  name: string;
  hasPractical: boolean;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  emoji: string;
  colorFrom: string;
  colorTo: string;
  units: Unit[];
  defaultStages: string[];
  hasCoding: boolean;
}

export interface Category {
  id: string;
  name: string;
  subjects: Subject[];
}

const generateLessons = (unitId: string, count: number): Lesson[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `l${i + 1}`,
    title: `الدرس ${i + 1}: مفاهيم أساسية في ${unitId}`
  }));
};

const generateUnits = (subjectId: string, count: number, lessonCount: number): Unit[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `u${i + 1}`,
    name: `الوحدة ${i + 1}`,
    hasPractical: i % 2 === 0,
    lessons: generateLessons(`u${i + 1}`, lessonCount)
  }));
};

// Build units with hand-written u1 lessons; later units fall back to placeholders.
const buildUnitsWithManualU1 = (
  subjectId: string,
  totalUnits: number,
  lessonsPerUnit: number,
  u1: { name: string; lessons: Lesson[] }
): Unit[] => {
  const units: Unit[] = [
    { id: "u1", name: u1.name, hasPractical: true, lessons: u1.lessons },
  ];
  for (let i = 1; i < totalUnits; i++) {
    units.push({
      id: `u${i + 1}`,
      name: `الوحدة ${i + 1}`,
      hasPractical: i % 2 === 0,
      lessons: generateLessons(`u${i + 1}`, lessonsPerUnit),
    });
  }
  return units;
};

export const university: Subject[] = [
  {
    id: "uni-it",
    name: "تقنية المعلومات",
    emoji: "💻",
    colorFrom: "from-blue-600",
    colorTo: "to-blue-400",
    units: buildUnitsWithManualU1("it", 4, 4, {
      name: "أساسيات الحاسوب والأنظمة",
      lessons: [
        { id: "l1", title: "ما هو الحاسوب فعلاً: العتاد والبرمجيات والتفاعل بينهما" },
        { id: "l2", title: "نظام التشغيل: من يدير الموارد ويترجم رغباتك للجهاز" },
        { id: "l3", title: "كيف تتحدث الأجهزة في الشبكة: IP والمنفذ والبروتوكول" },
        { id: "l4", title: "الإنترنت من الداخل: من جوّالك إلى الخادم وبالعكس" },
      ],
    }),
    defaultStages: ["أساسيات الحاسوب والأنظمة", "قواعد البيانات والشبكات", "البرمجة والتطبيقات", "المشروع التطبيقي"],
    hasCoding: true
  },
  {
    id: "uni-cybersecurity",
    name: "أمن سيبراني",
    emoji: "🛡️",
    colorFrom: "from-red-600",
    colorTo: "to-red-400",
    units: buildUnitsWithManualU1("cyber", 4, 4, {
      name: "مفاهيم الأمن والتهديدات",
      lessons: [
        { id: "l1", title: "ثلاثية الأمن: السرية والسلامة والتوافر (CIA)" },
        { id: "l2", title: "أنواع التهديدات: من البرمجيات الخبيثة إلى الهندسة الاجتماعية" },
        { id: "l3", title: "كيف يفكّر المهاجم: مراحل الهجوم السيبراني السبعة" },
        { id: "l4", title: "خط الدفاع الأول: المستخدم البشري وسياسات كلمات المرور" },
      ],
    }),
    defaultStages: ["مفاهيم الأمن والتهديدات", "التشفير والحماية", "اختبار الاختراق والأدوات", "الاستجابة للحوادث"],
    hasCoding: true
  },
  {
    id: "uni-data-science",
    name: "علوم بيانات",
    emoji: "📊",
    colorFrom: "from-green-600",
    colorTo: "to-green-400",
    units: buildUnitsWithManualU1("data", 4, 4, {
      name: "إحصاء وتحليل البيانات",
      lessons: [
        { id: "l1", title: "أنواع البيانات: كمّية ونوعية، مستمرّة ومنفصلة" },
        { id: "l2", title: "مقاييس النزعة المركزية: المتوسط والوسيط والمنوال — ومتى يكذب أيّها" },
        { id: "l3", title: "مقاييس التشتّت: الانحراف المعياري والمدى الربيعي" },
        { id: "l4", title: "تصوير التوزيع: Histogram وBoxplot وكشف القيم المتطرفة" },
      ],
    }),
    defaultStages: ["إحصاء وتحليل البيانات", "Python للبيانات ومكتبات NumPy/Pandas", "تصور البيانات والتنبؤ", "نماذج التعلم الآلي"],
    hasCoding: true
  },
  {
    id: "uni-accounting",
    name: "محاسبة",
    emoji: "📉",
    colorFrom: "from-yellow-600",
    colorTo: "to-yellow-400",
    units: buildUnitsWithManualU1("acc", 4, 4, {
      name: "أساسيات المحاسبة والقيد المزدوج",
      lessons: [
        { id: "l1", title: "المعادلة المحاسبية: الأصول = الخصوم + حقوق الملكية" },
        { id: "l2", title: "المدين والدائن: قاعدة القيد المزدوج وكيف لا يختل الميزان" },
        { id: "l3", title: "حسابات T والترحيل من اليومية لدفتر الأستاذ" },
        { id: "l4", title: "ميزان المراجعة: متى يكشف الخطأ ومتى يصمت عنه" },
      ],
    }),
    defaultStages: ["أساسيات المحاسبة والقيد المزدوج", "الميزانية والتقارير المالية", "محاسبة التكاليف", "التدقيق والضريبة"],
    hasCoding: false
  },
  {
    id: "uni-business",
    name: "إدارة أعمال",
    emoji: "📈",
    colorFrom: "from-orange-600",
    colorTo: "to-orange-400",
    units: buildUnitsWithManualU1("bus", 4, 4, {
      name: "مبادئ الإدارة والتخطيط الاستراتيجي",
      lessons: [
        { id: "l1", title: "الإدارة من الداخل: التخطيط، التنظيم، التوجيه، الرقابة" },
        { id: "l2", title: "تحليل SWOT: قراءة نقاط القوة والضعف والفرص والتهديدات" },
        { id: "l3", title: "Business Model Canvas: تسعة صناديق تختصر أي مشروع" },
        { id: "l4", title: "نقطة التعادل ودراسة الجدوى الأولية لمشروع صغير" },
      ],
    }),
    defaultStages: ["مبادئ الإدارة والتخطيط الاستراتيجي", "التسويق وبناء العلامة", "الموارد البشرية والقيادة", "ريادة الأعمال والمشاريع"],
    hasCoding: false
  },
  {
    id: "uni-software-eng",
    name: "هندسة برمجية",
    emoji: "⚙️",
    colorFrom: "from-indigo-600",
    colorTo: "to-indigo-400",
    units: buildUnitsWithManualU1("se", 4, 4, {
      name: "هندسة المتطلبات والتصميم",
      lessons: [
        { id: "l1", title: "ما الفرق بين البرمجة والهندسة البرمجية" },
        { id: "l2", title: "جمع المتطلبات: الوظيفية وغير الوظيفية وقصص المستخدم" },
        { id: "l3", title: "مبادئ SOLID: لماذا الكود الجيد يدوم" },
        { id: "l4", title: "من الفكرة إلى التصميم: مخطط UML مبسّط ومسؤوليات الكلاسات" },
      ],
    }),
    defaultStages: ["هندسة المتطلبات والتصميم", "أنماط التصميم والبرمجة الكائنية", "الاختبار وضمان الجودة", "نشر التطبيقات وCI/CD"],
    hasCoding: true
  },
  {
    id: "uni-ai",
    name: "ذكاء اصطناعي",
    emoji: "🤖",
    colorFrom: "from-purple-600",
    colorTo: "to-purple-400",
    units: buildUnitsWithManualU1("ai", 4, 4, {
      name: "أساسيات الذكاء الاصطناعي والمنطق",
      lessons: [
        { id: "l1", title: "ما هو الذكاء الاصطناعي حقاً (وما ليس كذلك)" },
        { id: "l2", title: "كيف يتعلّم النموذج من البيانات: التدريب والتنبؤ" },
        { id: "l3", title: "الاحتمالية أساس كل شيء: من Bigram إلى نماذج اللغة الكبيرة" },
        { id: "l4", title: "أنواع التعلّم الثلاثة: المراقَب، غير المراقَب، التعزيزي" },
      ],
    }),
    defaultStages: ["أساسيات الذكاء الاصطناعي والمنطق", "تعلم الآلة والشبكات العصبية", "معالجة اللغة الطبيعية", "تطبيقات الذكاء الاصطناعي الحديثة"],
    hasCoding: true
  },
  {
    id: "uni-mobile",
    name: "تطوير موبايل",
    emoji: "📱",
    colorFrom: "from-teal-600",
    colorTo: "to-teal-400",
    units: buildUnitsWithManualU1("mob", 4, 4, {
      name: "أساسيات تطوير المحمول",
      lessons: [
        { id: "l1", title: "Native vs Cross-Platform: متى تختار كلاً منهما" },
        { id: "l2", title: "بنية تطبيق الموبايل: Activities وViews وState" },
        { id: "l3", title: "دورة حياة الشاشة (Lifecycle): onCreate، onPause، onResume، onDestroy" },
        { id: "l4", title: "التخزين المحلي: SharedPreferences والقواعد المحلية" },
      ],
    }),
    defaultStages: ["أساسيات تطوير المحمول", "واجهة المستخدم وتجربة UX", "إدارة الحالة والبيانات", "النشر على المتاجر"],
    hasCoding: true
  },
  {
    id: "uni-cloud",
    name: "حوسبة سحابية",
    emoji: "☁️",
    colorFrom: "from-sky-600",
    colorTo: "to-sky-400",
    units: buildUnitsWithManualU1("cloud", 4, 4, {
      name: "مفاهيم الحوسبة السحابية",
      lessons: [
        { id: "l1", title: "ماذا تعني السحابة فعلاً: IaaS وPaaS وSaaS" },
        { id: "l2", title: "نماذج النشر: السحابة العامة والخاصة والهجينة" },
        { id: "l3", title: "اقتصاد السحابة: الدفع حسب الاستخدام والمرونة الزمنية" },
        { id: "l4", title: "Auto Scaling وLoad Balancer: كيف تتعامل السحابة مع الذروة" },
      ],
    }),
    defaultStages: ["مفاهيم الحوسبة السحابية", "AWS/Azure الأساسيات", "الحاويات وKubernetes", "الأمن السحابي والتكاليف"],
    hasCoding: true
  },
  {
    id: "uni-networks",
    name: "شبكات متقدمة",
    emoji: "🌐",
    colorFrom: "from-cyan-600",
    colorTo: "to-cyan-400",
    units: buildUnitsWithManualU1("net", 4, 4, {
      name: "نموذج OSI وبروتوكولات TCP/IP",
      lessons: [
        { id: "l1", title: "الطبقات السبع لنموذج OSI: لماذا التقسيم يبسّط التشخيص" },
        { id: "l2", title: "TCP مقابل UDP: الموثوقية مقابل السرعة" },
        { id: "l3", title: "تجزئة البيانات لحزم وإعادة تجميعها في الطرف الآخر" },
        { id: "l4", title: "اختيار المسار (Routing) ولماذا أسرع طريق ليس دائماً الأفضل" },
      ],
    }),
    defaultStages: ["نموذج OSI وبروتوكولات TCP/IP", "تصميم الشبكات والتوجيه", "الشبكات اللاسلكية والأمن", "إدارة الشبكات والمراقبة"],
    hasCoding: false
  },
  {
    id: "uni-food-eng",
    name: "هندسة غذائية",
    emoji: "🔬",
    colorFrom: "from-lime-600",
    colorTo: "to-lime-400",
    units: [
      {
        id: "u1",
        name: "أساسيات علوم الأغذية",
        hasPractical: true,
        lessons: [
          { id: "l1", title: "تركيب الأغذية: الماء والبروتينات والدهون والكربوهيدرات" },
          { id: "l2", title: "الفيتامينات والمعادن ودورها في جودة الغذاء" },
          { id: "l3", title: "النشاط المائي وعلاقته بفساد الأغذية" },
          { id: "l4", title: "التفاعلات الكيميائية في الأغذية: تفاعل ميلارد والأكسدة" },
          { id: "l5", title: "الخصائص الفيزيائية للأغذية: اللزوجة والكثافة والقوام" },
        ]
      },
      {
        id: "u2",
        name: "ميكروبيولوجيا وسلامة الأغذية",
        hasPractical: true,
        lessons: [
          { id: "l1", title: "الكائنات الدقيقة في الأغذية: البكتيريا والفطريات والخمائر" },
          { id: "l2", title: "مسببات التسمم الغذائي: السالمونيلا والإيكولاي والليستيريا" },
          { id: "l3", title: "نظام تحليل المخاطر HACCP: المبادئ السبعة" },
          { id: "l4", title: "تطبيق HACCP عملياً في خط إنتاج حقيقي" },
          { id: "l5", title: "المواصفات والمعايير الدولية لسلامة الغذاء: ISO 22000" },
        ]
      },
      {
        id: "u3",
        name: "تقنيات حفظ وتصنيع الأغذية",
        hasPractical: true,
        lessons: [
          { id: "l1", title: "الحفظ بالحرارة: البسترة والتعقيم والتجفيف" },
          { id: "l2", title: "الحفظ بالتبريد والتجميد: السلسلة الباردة" },
          { id: "l3", title: "تقنيات التجفيف: التجفيف بالرذاذ والتجميدي والشمسي" },
          { id: "l4", title: "التصنيع الغذائي: الألبان والعصائر والمعلبات" },
          { id: "l5", title: "التقنيات الحديثة: الضغط العالي والنبضات الكهربائية والأشعة" },
        ]
      },
      {
        id: "u4",
        name: "هندسة العمليات الغذائية",
        hasPractical: false,
        lessons: [
          { id: "l1", title: "انتقال الحرارة في العمليات الغذائية" },
          { id: "l2", title: "انتقال الكتلة والتبخير والتقطير" },
          { id: "l3", title: "الترشيح والفصل الميكانيكي" },
          { id: "l4", title: "تصميم خطوط الإنتاج الغذائي وموازنة الطاقة" },
          { id: "l5", title: "حسابات زمن التعقيم والمعاملات الحرارية" },
        ]
      },
      {
        id: "u5",
        name: "ضبط الجودة والتقييم الحسي",
        hasPractical: true,
        lessons: [
          { id: "l1", title: "مفهوم الجودة الشاملة TQM في صناعة الأغذية" },
          { id: "l2", title: "التحليل الكيميائي والفيزيائي لجودة الأغذية" },
          { id: "l3", title: "التقييم الحسي: اختبارات التذوق والتمييز والقبول" },
          { id: "l4", title: "بطاقة البيانات الغذائية والتشريعات" },
          { id: "l5", title: "إدارة المصنع الغذائي: التخطيط والتكاليف والإنتاجية" },
        ]
      },
      {
        id: "u6",
        name: "التعبئة والتغليف وتطوير المنتجات",
        hasPractical: true,
        lessons: [
          { id: "l1", title: "مواد التعبئة والتغليف: البلاستيك والزجاج والمعادن" },
          { id: "l2", title: "تقنيات التغليف: التغليف بالتفريغ والغاز المعدّل" },
          { id: "l3", title: "تطوير منتج غذائي جديد: من الفكرة إلى الرف" },
          { id: "l4", title: "اختبارات العمر الافتراضي والثبات" },
          { id: "l5", title: "مشروع تطبيقي: تصميم منتج غذائي كامل مع دراسة جدوى" },
        ]
      },
    ],
    defaultStages: [
      "أساسيات علوم الأغذية وتركيبها",
      "ميكروبيولوجيا الأغذية ونظام HACCP",
      "تقنيات الحفظ والتصنيع الغذائي",
      "هندسة العمليات والحسابات الحرارية",
      "ضبط الجودة والتقييم الحسي",
      "التعبئة والتغليف وتطوير المنتجات",
    ],
    hasCoding: false
  },
];

export const skills: Category[] = [
  {
    id: "skill-web",
    name: "بناء الويب",
    subjects: [
      {
        id: "skill-html",
        name: "HTML",
        emoji: "🌐",
        colorFrom: "from-orange-500",
        colorTo: "to-orange-300",
        units: buildUnitsWithManualU1("html", 3, 4, {
      name: "هيكل صفحة HTML وعناصرها الدلالية",
      lessons: [
        { id: "l1", title: "ما يفهمه المتصفح فعلاً: الـDOM ومعنى الوسوم" },
        { id: "l2", title: "العناصر الدلالية: header وnav وmain وarticle وفووتر" },
        { id: "l3", title: "العناوين والفقرات والقوائم: تسلسل بصري وتسلسل دلالي" },
        { id: "l4", title: "الصور والروابط وأهمية alt للوصول وSEO" },
      ],
    }),
        defaultStages: ["هيكل صفحة HTML وعناصرها", "النماذج والوسائط والروابط", "HTML5 والعناصر الدلالية"],
        hasCoding: true
      },
      {
        id: "skill-css",
        name: "CSS",
        emoji: "🎨",
        colorFrom: "from-blue-500",
        colorTo: "to-blue-300",
        units: buildUnitsWithManualU1("css", 3, 4, {
      name: "المحددات والـBox Model",
      lessons: [
        { id: "l1", title: "كيف يربط CSS الأنماط بالعناصر: المحددات وأولوياتها" },
        { id: "l2", title: "الألوان والخطوط ومتى نستخدم rem مقابل px" },
        { id: "l3", title: "Box Model: المحتوى والحشوة والحد والهامش — وحلّ مشاكل التخطيط" },
        { id: "l4", title: "box-sizing: border-box ولماذا يفرّق كل شيء" },
      ],
    }),
        defaultStages: ["المحددات والألوان والخطوط", "Box Model والتخطيط Flexbox", "Grid وResponsive Design"],
        hasCoding: true
      },
      {
        id: "skill-js",
        name: "JavaScript",
        emoji: "⚡",
        colorFrom: "from-yellow-400",
        colorTo: "to-yellow-200",
        units: buildUnitsWithManualU1("js", 4, 5, {
      name: "أساسيات JavaScript والـEvent Loop",
      lessons: [
        { id: "l1", title: "المتغيّرات والأنواع: var وlet وconst والفروق الجوهرية" },
        { id: "l2", title: "التعابير الشرطية والحلقات وأنواع المساواة (== مقابل ===)" },
        { id: "l3", title: "Event Loop: كيف يبقى المتصفح متجاوباً وأنت تحسب" },
        { id: "l4", title: "المؤقّتات setTimeout وsetInterval ومتى تستخدمهما" },
        { id: "l5", title: "تحويل العمل الثقيل من Main Thread إلى chunks وWeb Workers" },
      ],
    }),
        defaultStages: ["أساسيات JavaScript والمتغيرات", "الدوال والمصفوفات والكائنات", "DOM والأحداث والتفاعل", "Async/Await والـ APIs"],
        hasCoding: true
      },
    ]
  },
  {
    id: "skill-programming",
    name: "لغات البرمجة",
    subjects: [
      {
        id: "skill-python",
        name: "Python",
        emoji: "🐍",
        colorFrom: "from-blue-400",
        colorTo: "to-yellow-400",
        units: buildUnitsWithManualU1("py", 5, 5, {
      name: "أساسيات Python والمتغيّرات",
      lessons: [
        { id: "l1", title: "المتغيّرات والأنواع الأساسية في Python" },
        { id: "l2", title: "القوائم (Lists) والقواميس (Dicts): الأدوات الأكثر استخداماً" },
        { id: "l3", title: "List Comprehension: كيف تختصر 30 سطراً في سطر" },
        { id: "l4", title: "الدوال المضمّنة: sum, max, min, sorted, zip" },
        { id: "l5", title: "قراءة وكتابة الملفات: التعامل مع البيانات الواقعية" },
      ],
    }),
        defaultStages: ["أساسيات Python والمتغيرات", "الدوال والقوائم والقواميس", "البرمجة الكائنية OOP", "الملفات والمكتبات الأساسية", "المشروع التطبيقي"],
        hasCoding: true
      },
      {
        id: "skill-cpp",
        name: "C++",
        emoji: "⚙️",
        colorFrom: "from-blue-600",
        colorTo: "to-blue-400",
        units: buildUnitsWithManualU1("cpp", 5, 5, {
      name: "أساسيات C++ والذاكرة",
      lessons: [
        { id: "l1", title: "بنية برنامج C++: main وincludes وnamespace" },
        { id: "l2", title: "المتغيّرات والمراجع وقيم الإسناد بالقيمة وبالمرجع" },
        { id: "l3", title: "Stack مقابل Heap: أين تُخزَّن متغيّراتك" },
        { id: "l4", title: "new وdelete: عقد التخصيص والتحرير اليدوي" },
        { id: "l5", title: "Destructor والـRAII: كيف لا تنسى تحرير ذاكرة" },
      ],
    }),
        defaultStages: ["أساسيات C++ والمتغيرات", "المؤشرات والذاكرة", "البرمجة الكائنية", "القوالب وSTL", "تطبيقات متقدمة"],
        hasCoding: true
      },
      {
        id: "skill-c",
        name: "C",
        emoji: "💻",
        colorFrom: "from-gray-600",
        colorTo: "to-gray-400",
        units: buildUnitsWithManualU1("c", 4, 5, {
      name: "أساسيات C والمؤشّرات",
      lessons: [
        { id: "l1", title: "بنية برنامج C: main وstdio وأنواع البيانات الأساسية" },
        { id: "l2", title: "المؤشّرات: العنوان مقابل القيمة والـ& والـ*" },
        { id: "l3", title: "المصفوفات والمؤشّرات: لماذا هما توأمان في C" },
        { id: "l4", title: "Stack vs Heap وعمر المتغيّر المحلّي داخل الدالة" },
        { id: "l5", title: "Dangling pointers: السبب الأول لانهيار البرامج بـ C" },
      ],
    }),
        defaultStages: ["أساسيات C والمتغيرات", "المؤشرات والمصفوفات", "الدوال وإدارة الذاكرة", "هياكل البيانات"],
        hasCoding: true
      },
      {
        id: "skill-java",
        name: "Java",
        emoji: "☕",
        colorFrom: "from-red-500",
        colorTo: "to-red-300",
        units: buildUnitsWithManualU1("java", 5, 5, {
      name: "أساسيات Java والكلاسات",
      lessons: [
        { id: "l1", title: "بنية برنامج Java: class وmain وpackages" },
        { id: "l2", title: "المتغيّرات وأنواعها وفرق primitive عن reference types" },
        { id: "l3", title: "تعريف كلاس: الحقول، الدوال، الباني (Constructor)" },
        { id: "l4", title: "إنشاء كائنات والتعامل مع المراجع وnull" },
        { id: "l5", title: "مبدأ Single Responsibility: تجنّب God Class" },
      ],
    }),
        defaultStages: ["أساسيات Java والكلاسات", "الوراثة والتعددية الشكلية", "المجموعات والمكتبات", "البرمجة المتزامنة", "تطبيقات عملية"],
        hasCoding: true
      },
    ]
  },
  {
    id: "skill-os",
    name: "أنظمة التشغيل",
    subjects: [
      {
        id: "skill-linux",
        name: "Linux",
        emoji: "🐧",
        colorFrom: "from-yellow-500",
        colorTo: "to-yellow-300",
        units: buildUnitsWithManualU1("linux", 4, 4, {
      name: "أساسيات Linux والأوامر الأساسية",
      lessons: [
        { id: "l1", title: "فلسفة Linux: كل شيء ملف، وكل أمر أداة صغيرة محكمة" },
        { id: "l2", title: "التنقّل في الشجرة: pwd, ls, cd, tree" },
        { id: "l3", title: "حجم القرص والملفات: df, du, find, ls -lhS" },
        { id: "l4", title: "قراءة السجلات وتتبّعها: cat, less, tail -f" },
      ],
    }),
        defaultStages: ["أساسيات Linux والأوامر الأساسية", "إدارة الملفات والمستخدمين", "Shell Scripting والأتمتة", "الشبكات والأمن في Linux"],
        hasCoding: true
      },
      {
        id: "skill-windows",
        name: "Windows",
        emoji: "🪟",
        colorFrom: "from-blue-500",
        colorTo: "to-blue-300",
        units: buildUnitsWithManualU1("win", 3, 4, {
      name: "إدارة نظام Windows",
      lessons: [
        { id: "l1", title: "بنية Windows: الـRegistry والخدمات وحساب المستخدم" },
        { id: "l2", title: "PowerShell vs CMD: لماذا PowerShell يستحق التعلّم" },
        { id: "l3", title: "Cmdlets الأساسية: Get-ChildItem, Rename-Item, Move-Item" },
        { id: "l4", title: "الاختبار الآمن: -WhatIf و-Confirm قبل أي تعديل جماعي" },
      ],
    }),
        defaultStages: ["إدارة نظام Windows", "PowerShell والأتمتة", "أمن Windows والـ Active Directory"],
        hasCoding: true
      },
    ]
  },
  {
    id: "skill-networks",
    name: "الشبكات",
    subjects: [
      {
        id: "skill-net-basics",
        name: "أساسيات الشبكات",
        emoji: "🔌",
        colorFrom: "from-green-500",
        colorTo: "to-green-300",
        units: buildUnitsWithManualU1("net-basics", 4, 4, {
          name: "نموذج OSI وTCP/IP",
          lessons: [
            { id: "l1", title: "نموذج OSI: لماذا 7 طبقات وليس واحدة" },
            { id: "l2", title: "كل طبقة ومسؤوليتها: من الكابل إلى التطبيق" },
            { id: "l3", title: "تشخيص المشاكل بالطبقات: أيّ طبقة هي العطل" },
            { id: "l4", title: "التكامل بين OSI وTCP/IP في الشبكة الفعلية" },
          ],
        }),
        defaultStages: ["نموذج OSI وTCP/IP", "عناوين IP والـ Subnetting", "البروتوكولات الأساسية", "تكوين الشبكات وحل المشكلات"],
        hasCoding: false
      },
    ]
  },
  {
    id: "skill-security",
    name: "أدوات الأمن",
    subjects: [
      {
        id: "skill-nmap",
        name: "Nmap",
        emoji: "👁️",
        colorFrom: "from-slate-600",
        colorTo: "to-slate-400",
        units: buildUnitsWithManualU1("nmap", 3, 4, {
      name: "مبادئ Nmap ومسح المنافذ",
      lessons: [
        { id: "l1", title: "ما هو Nmap وماذا يفعل فعلاً (وما لا يفعله)" },
        { id: "l2", title: "TCP Connect مقابل SYN Stealth Scan" },
        { id: "l3", title: "اكتشاف الخدمات والإصدارات بـ -sV" },
        { id: "l4", title: "تصنيف المنافذ: متوقّع، مشبوه، خطر حرج" },
      ],
    }),
        defaultStages: ["مبادئ Nmap ومسح المنافذ", "أنواع المسح والتقنيات المتقدمة", "تحليل النتائج وكتابة التقارير"],
        hasCoding: false
      },
      {
        id: "skill-wireshark",
        name: "Wireshark",
        emoji: "🦈",
        colorFrom: "from-blue-400",
        colorTo: "to-blue-200",
        units: buildUnitsWithManualU1("ws", 3, 4, {
      name: "تثبيت Wireshark والتقاط الحزم",
      lessons: [
        { id: "l1", title: "ما الذي يلتقطه Wireshark على واجهة الشبكة" },
        { id: "l2", title: "قراءة حزمة واحدة: الإيثرنت والـIP والـTCP وحمولة التطبيق" },
        { id: "l3", title: "الفلاتر الأساسية: dns, http, tcp.port == 443" },
        { id: "l4", title: "قراءة ملفات pcap وتمييز النمط الطبيعي من المشبوه" },
      ],
    }),
        defaultStages: ["تثبيت Wireshark والتقاط الحزم", "تحليل البروتوكولات والتصفية", "تحليل الهجمات وحركة المرور الشبكي"],
        hasCoding: false
      },
    ]
  },
  {
    id: "skill-erp",
    name: "أنظمة ERP",
    subjects: [
      {
        id: "skill-yemensoft",
        name: "يمن سوفت",
        emoji: "🏢",
        colorFrom: "from-teal-600",
        colorTo: "to-teal-400",
        units: [
          {
            id: "ys-u1", name: "أساسيات النظام والتهيئة", hasPractical: true,
            lessons: [
              { id: "ys-l1", title: "تعريف بنظام يمن سوفت وبيئة العمل" },
              { id: "ys-l2", title: "إنشاء الشركة وتهيئة البيانات الأساسية" },
              { id: "ys-l3", title: "إعداد الفروع والمخازن ومراكز التكلفة" },
              { id: "ys-l4", title: "إدارة المستخدمين والصلاحيات" },
              { id: "ys-l5", title: "إعداد السنة المالية والفترات المحاسبية" },
            ]
          },
          {
            id: "ys-u2", name: "الحسابات العامة والقيود", hasPractical: true,
            lessons: [
              { id: "ys-l6", title: "شجرة الحسابات وتصنيفها (أصول، خصوم، إيرادات، مصروفات)" },
              { id: "ys-l7", title: "إنشاء القيود المحاسبية اليدوية" },
              { id: "ys-l8", title: "القيود المركبة وقيود التسوية" },
              { id: "ys-l9", title: "دفتر الأستاذ وميزان المراجعة" },
              { id: "ys-l10", title: "إقفال الفترات والسنة المالية" },
            ]
          },
          {
            id: "ys-u3", name: "المبيعات والمشتريات", hasPractical: true,
            lessons: [
              { id: "ys-l11", title: "إعداد بيانات العملاء وإدارة حساباتهم" },
              { id: "ys-l12", title: "فواتير المبيعات (نقدي وآجل) والمرتجعات" },
              { id: "ys-l13", title: "إعداد بيانات الموردين وأوامر الشراء" },
              { id: "ys-l14", title: "فواتير المشتريات والمرتجعات" },
              { id: "ys-l15", title: "تقارير المبيعات والمشتريات والتحليل" },
            ]
          },
          {
            id: "ys-u4", name: "المخازن وإدارة المخزون", hasPractical: true,
            lessons: [
              { id: "ys-l16", title: "تعريف الأصناف والمجموعات والوحدات" },
              { id: "ys-l17", title: "سندات الإدخال والإخراج والتحويل بين المخازن" },
              { id: "ys-l18", title: "الجرد الفعلي والتسويات" },
              { id: "ys-l19", title: "طرق التسعير (FIFO, متوسط مرجح, LIFO)" },
              { id: "ys-l20", title: "تقارير المخزون وحد إعادة الطلب" },
            ]
          },
          {
            id: "ys-u5", name: "الخزينة والبنوك", hasPractical: true,
            lessons: [
              { id: "ys-l21", title: "إعداد الصناديق والحسابات البنكية" },
              { id: "ys-l22", title: "سندات القبض والصرف النقدي" },
              { id: "ys-l23", title: "الشيكات (إصدار، استلام، تحصيل، ارتجاع)" },
              { id: "ys-l24", title: "التسوية البنكية (Bank Reconciliation)" },
              { id: "ys-l25", title: "التحويلات بين الصناديق والبنوك" },
            ]
          },
          {
            id: "ys-u6", name: "التقارير والقوائم المالية", hasPractical: true,
            lessons: [
              { id: "ys-l26", title: "ميزان المراجعة وتحليل الحسابات" },
              { id: "ys-l27", title: "قائمة الدخل (الأرباح والخسائر)" },
              { id: "ys-l28", title: "الميزانية العمومية (المركز المالي)" },
              { id: "ys-l29", title: "قائمة التدفقات النقدية" },
              { id: "ys-l30", title: "تقارير أعمار الديون والتقارير المخصصة" },
            ]
          },
        ],
        defaultStages: [
          "أساسيات النظام والتهيئة",
          "الحسابات العامة والقيود المحاسبية",
          "دورة المبيعات والمشتريات",
          "المخازن وإدارة المخزون",
          "الخزينة والبنوك والتسويات",
          "التقارير والقوائم المالية"
        ],
        hasCoding: false
      },
    ]
  }
];

export const getSubjectById = (id: string): Subject | undefined => {
  const uniSub = university.find(s => s.id === id);
  if (uniSub) return uniSub;

  for (const cat of skills) {
    const sub = cat.subjects.find(s => s.id === id);
    if (sub) return sub;
  }

  return undefined;
};
