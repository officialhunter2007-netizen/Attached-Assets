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

export const university: Subject[] = [
  {
    id: "uni-it",
    name: "تقنية المعلومات",
    emoji: "💻",
    colorFrom: "from-blue-600",
    colorTo: "to-blue-400",
    units: generateUnits("it", 4, 4),
    defaultStages: ["أساسيات الحاسوب والأنظمة", "قواعد البيانات والشبكات", "البرمجة والتطبيقات", "المشروع التطبيقي"]
  },
  {
    id: "uni-cybersecurity",
    name: "أمن سيبراني",
    emoji: "🛡️",
    colorFrom: "from-red-600",
    colorTo: "to-red-400",
    units: generateUnits("cyber", 4, 4),
    defaultStages: ["مفاهيم الأمن والتهديدات", "التشفير والحماية", "اختبار الاختراق والأدوات", "الاستجابة للحوادث"]
  },
  {
    id: "uni-data-science",
    name: "علوم بيانات",
    emoji: "📊",
    colorFrom: "from-green-600",
    colorTo: "to-green-400",
    units: generateUnits("data", 4, 4),
    defaultStages: ["إحصاء وتحليل البيانات", "Python للبيانات ومكتبات NumPy/Pandas", "تصور البيانات والتنبؤ", "نماذج التعلم الآلي"]
  },
  {
    id: "uni-accounting",
    name: "محاسبة",
    emoji: "📉",
    colorFrom: "from-yellow-600",
    colorTo: "to-yellow-400",
    units: generateUnits("acc", 4, 4),
    defaultStages: ["أساسيات المحاسبة والقيد المزدوج", "الميزانية والتقارير المالية", "محاسبة التكاليف", "التدقيق والضريبة"]
  },
  {
    id: "uni-business",
    name: "إدارة أعمال",
    emoji: "📈",
    colorFrom: "from-orange-600",
    colorTo: "to-orange-400",
    units: generateUnits("bus", 4, 4),
    defaultStages: ["مبادئ الإدارة والتخطيط الاستراتيجي", "التسويق وبناء العلامة", "الموارد البشرية والقيادة", "ريادة الأعمال والمشاريع"]
  },
  {
    id: "uni-software-eng",
    name: "هندسة برمجية",
    emoji: "⚙️",
    colorFrom: "from-indigo-600",
    colorTo: "to-indigo-400",
    units: generateUnits("se", 4, 4),
    defaultStages: ["هندسة المتطلبات والتصميم", "أنماط التصميم والبرمجة الكائنية", "الاختبار وضمان الجودة", "نشر التطبيقات وCI/CD"]
  },
  {
    id: "uni-ai",
    name: "ذكاء اصطناعي",
    emoji: "🤖",
    colorFrom: "from-purple-600",
    colorTo: "to-purple-400",
    units: generateUnits("ai", 4, 4),
    defaultStages: ["أساسيات الذكاء الاصطناعي والمنطق", "تعلم الآلة والشبكات العصبية", "معالجة اللغة الطبيعية", "تطبيقات الذكاء الاصطناعي الحديثة"]
  },
  {
    id: "uni-mobile",
    name: "تطوير موبايل",
    emoji: "📱",
    colorFrom: "from-teal-600",
    colorTo: "to-teal-400",
    units: generateUnits("mob", 4, 4),
    defaultStages: ["أساسيات تطوير المحمول", "واجهة المستخدم وتجربة UX", "إدارة الحالة والبيانات", "النشر على المتاجر"]
  },
  {
    id: "uni-cloud",
    name: "حوسبة سحابية",
    emoji: "☁️",
    colorFrom: "from-sky-600",
    colorTo: "to-sky-400",
    units: generateUnits("cloud", 4, 4),
    defaultStages: ["مفاهيم الحوسبة السحابية", "AWS/Azure الأساسيات", "الحاويات وKubernetes", "الأمن السحابي والتكاليف"]
  },
  {
    id: "uni-networks",
    name: "شبكات متقدمة",
    emoji: "🌐",
    colorFrom: "from-cyan-600",
    colorTo: "to-cyan-400",
    units: generateUnits("net", 4, 4),
    defaultStages: ["نموذج OSI وبروتوكولات TCP/IP", "تصميم الشبكات والتوجيه", "الشبكات اللاسلكية والأمن", "إدارة الشبكات والمراقبة"]
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
        units: generateUnits("html", 3, 4),
        defaultStages: ["هيكل صفحة HTML وعناصرها", "النماذج والوسائط والروابط", "HTML5 والعناصر الدلالية"]
      },
      {
        id: "skill-css",
        name: "CSS",
        emoji: "🎨",
        colorFrom: "from-blue-500",
        colorTo: "to-blue-300",
        units: generateUnits("css", 3, 4),
        defaultStages: ["المحددات والألوان والخطوط", "Box Model والتخطيط Flexbox", "Grid وResponsive Design"]
      },
      {
        id: "skill-js",
        name: "JavaScript",
        emoji: "⚡",
        colorFrom: "from-yellow-400",
        colorTo: "to-yellow-200",
        units: generateUnits("js", 4, 5),
        defaultStages: ["أساسيات JavaScript والمتغيرات", "الدوال والمصفوفات والكائنات", "DOM والأحداث والتفاعل", "Async/Await والـ APIs"]
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
        units: generateUnits("py", 5, 5),
        defaultStages: ["أساسيات Python والمتغيرات", "الدوال والقوائم والقواميس", "البرمجة الكائنية OOP", "الملفات والمكتبات الأساسية", "المشروع التطبيقي"]
      },
      {
        id: "skill-cpp",
        name: "C++",
        emoji: "⚙️",
        colorFrom: "from-blue-600",
        colorTo: "to-blue-400",
        units: generateUnits("cpp", 5, 5),
        defaultStages: ["أساسيات C++ والمتغيرات", "المؤشرات والذاكرة", "البرمجة الكائنية", "القوالب وSTL", "تطبيقات متقدمة"]
      },
      {
        id: "skill-c",
        name: "C",
        emoji: "💻",
        colorFrom: "from-gray-600",
        colorTo: "to-gray-400",
        units: generateUnits("c", 4, 5),
        defaultStages: ["أساسيات C والمتغيرات", "المؤشرات والمصفوفات", "الدوال وإدارة الذاكرة", "هياكل البيانات"]
      },
      {
        id: "skill-java",
        name: "Java",
        emoji: "☕",
        colorFrom: "from-red-500",
        colorTo: "to-red-300",
        units: generateUnits("java", 5, 5),
        defaultStages: ["أساسيات Java والكلاسات", "الوراثة والتعددية الشكلية", "المجموعات والمكتبات", "البرمجة المتزامنة", "تطبيقات عملية"]
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
        units: generateUnits("linux", 4, 4),
        defaultStages: ["أساسيات Linux والأوامر الأساسية", "إدارة الملفات والمستخدمين", "Shell Scripting والأتمتة", "الشبكات والأمن في Linux"]
      },
      {
        id: "skill-windows",
        name: "Windows",
        emoji: "🪟",
        colorFrom: "from-blue-500",
        colorTo: "to-blue-300",
        units: generateUnits("win", 3, 4),
        defaultStages: ["إدارة نظام Windows", "PowerShell والأتمتة", "أمن Windows والـ Active Directory"]
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
        units: generateUnits("net", 4, 4),
        defaultStages: ["نموذج OSI وTCP/IP", "عناوين IP والـ Subnetting", "البروتوكولات الأساسية", "تكوين الشبكات وحل المشكلات"]
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
        units: generateUnits("nmap", 3, 4),
        defaultStages: ["مبادئ Nmap ومسح المنافذ", "أنواع المسح والتقنيات المتقدمة", "تحليل النتائج وكتابة التقارير"]
      },
      {
        id: "skill-wireshark",
        name: "Wireshark",
        emoji: "🦈",
        colorFrom: "from-blue-400",
        colorTo: "to-blue-200",
        units: generateUnits("ws", 3, 4),
        defaultStages: ["تثبيت Wireshark والتقاط الحزم", "تحليل البروتوكولات والتصفية", "تحليل الهجمات وحركة المرور الشبكي"]
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
