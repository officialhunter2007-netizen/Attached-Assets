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

export const highSchool: Category[] = [
  {
    id: "grade1",
    name: "الصف الأول الثانوي",
    subjects: [
      { id: "grade1-chemistry", name: "كيمياء", emoji: "🧪", colorFrom: "from-blue-500", colorTo: "to-cyan-400", units: generateUnits("chem", 5, 5) },
      { id: "grade1-biology", name: "أحياء", emoji: "🧬", colorFrom: "from-green-500", colorTo: "to-emerald-400", units: generateUnits("bio", 5, 5) },
      { id: "grade1-arabic", name: "لغة عربية", emoji: "📖", colorFrom: "from-amber-500", colorTo: "to-orange-400", units: generateUnits("ar", 5, 5) },
      { id: "grade1-english", name: "لغة إنجليزية", emoji: "🌍", colorFrom: "from-indigo-500", colorTo: "to-blue-400", units: generateUnits("en", 5, 5) },
    ]
  },
  {
    id: "grade2",
    name: "الصف الثاني الثانوي",
    subjects: [
      { id: "grade2-chemistry", name: "كيمياء", emoji: "🧪", colorFrom: "from-blue-500", colorTo: "to-cyan-400", units: generateUnits("chem", 5, 5) },
      { id: "grade2-biology", name: "أحياء", emoji: "🧬", colorFrom: "from-green-500", colorTo: "to-emerald-400", units: generateUnits("bio", 5, 5) },
      { id: "grade2-arabic", name: "لغة عربية", emoji: "📖", colorFrom: "from-amber-500", colorTo: "to-orange-400", units: generateUnits("ar", 5, 5) },
      { id: "grade2-english", name: "لغة إنجليزية", emoji: "🌍", colorFrom: "from-indigo-500", colorTo: "to-blue-400", units: generateUnits("en", 5, 5) },
    ]
  },
  {
    id: "grade3",
    name: "الصف الثالث الثانوي",
    subjects: [
      { id: "grade3-chemistry", name: "كيمياء", emoji: "🧪", colorFrom: "from-blue-500", colorTo: "to-cyan-400", units: generateUnits("chem", 5, 5) },
      { id: "grade3-biology", name: "أحياء", emoji: "🧬", colorFrom: "from-green-500", colorTo: "to-emerald-400", units: generateUnits("bio", 5, 5) },
      { id: "grade3-arabic", name: "لغة عربية", emoji: "📖", colorFrom: "from-amber-500", colorTo: "to-orange-400", units: generateUnits("ar", 5, 5) },
      { id: "grade3-english", name: "لغة إنجليزية", emoji: "🌍", colorFrom: "from-indigo-500", colorTo: "to-blue-400", units: generateUnits("en", 5, 5) },
    ]
  }
];

export const university: Subject[] = [
  { id: "uni-it", name: "تقنية المعلومات", emoji: "💻", colorFrom: "from-blue-600", colorTo: "to-blue-400", units: generateUnits("it", 4, 4) },
  { id: "uni-cybersecurity", name: "أمن سيبراني", emoji: "🛡️", colorFrom: "from-red-600", colorTo: "to-red-400", units: generateUnits("cyber", 4, 4) },
  { id: "uni-data-science", name: "علوم بيانات", emoji: "📊", colorFrom: "from-green-600", colorTo: "to-green-400", units: generateUnits("data", 4, 4) },
  { id: "uni-accounting", name: "محاسبة", emoji: "📉", colorFrom: "from-yellow-600", colorTo: "to-yellow-400", units: generateUnits("acc", 4, 4) },
  { id: "uni-business", name: "إدارة أعمال", emoji: "📈", colorFrom: "from-orange-600", colorTo: "to-orange-400", units: generateUnits("bus", 4, 4) },
  { id: "uni-software-eng", name: "هندسة برمجية", emoji: "⚙️", colorFrom: "from-indigo-600", colorTo: "to-indigo-400", units: generateUnits("se", 4, 4) },
  { id: "uni-ai", name: "ذكاء اصطناعي", emoji: "🤖", colorFrom: "from-purple-600", colorTo: "to-purple-400", units: generateUnits("ai", 4, 4) },
  { id: "uni-mobile", name: "تطوير موبايل", emoji: "📱", colorFrom: "from-teal-600", colorTo: "to-teal-400", units: generateUnits("mob", 4, 4) },
  { id: "uni-cloud", name: "حوسبة سحابية", emoji: "☁️", colorFrom: "from-sky-600", colorTo: "to-sky-400", units: generateUnits("cloud", 4, 4) },
  { id: "uni-networks", name: "شبكات متقدمة", emoji: "🌐", colorFrom: "from-cyan-600", colorTo: "to-cyan-400", units: generateUnits("net", 4, 4) },
];

export const skills: Category[] = [
  {
    id: "skill-web",
    name: "بناء الويب",
    subjects: [
      { id: "skill-html", name: "HTML", emoji: "🌐", colorFrom: "from-orange-500", colorTo: "to-orange-300", units: generateUnits("html", 3, 4) },
      { id: "skill-css", name: "CSS", emoji: "🎨", colorFrom: "from-blue-500", colorTo: "to-blue-300", units: generateUnits("css", 3, 4) },
      { id: "skill-js", name: "JavaScript", emoji: "⚡", colorFrom: "from-yellow-400", colorTo: "to-yellow-200", units: generateUnits("js", 4, 5) },
    ]
  },
  {
    id: "skill-programming",
    name: "لغات البرمجة",
    subjects: [
      { id: "skill-python", name: "Python", emoji: "🐍", colorFrom: "from-blue-400", colorTo: "to-yellow-400", units: generateUnits("py", 5, 5) },
      { id: "skill-cpp", name: "C++", emoji: "⚙️", colorFrom: "from-blue-600", colorTo: "to-blue-400", units: generateUnits("cpp", 5, 5) },
      { id: "skill-c", name: "C", emoji: "💻", colorFrom: "from-gray-600", colorTo: "to-gray-400", units: generateUnits("c", 4, 5) },
      { id: "skill-java", name: "Java", emoji: "☕", colorFrom: "from-red-500", colorTo: "to-red-300", units: generateUnits("java", 5, 5) },
    ]
  },
  {
    id: "skill-os",
    name: "أنظمة التشغيل",
    subjects: [
      { id: "skill-linux", name: "Linux", emoji: "🐧", colorFrom: "from-yellow-500", colorTo: "to-yellow-300", units: generateUnits("linux", 4, 4) },
      { id: "skill-windows", name: "Windows", emoji: "🪟", colorFrom: "from-blue-500", colorTo: "to-blue-300", units: generateUnits("win", 3, 4) },
    ]
  },
  {
    id: "skill-networks",
    name: "الشبكات",
    subjects: [
      { id: "skill-net-basics", name: "أساسيات الشبكات", emoji: "🔌", colorFrom: "from-green-500", colorTo: "to-green-300", units: generateUnits("net", 4, 4) },
    ]
  },
  {
    id: "skill-security",
    name: "أدوات الأمن",
    subjects: [
      { id: "skill-nmap", name: "Nmap", emoji: "👁️", colorFrom: "from-slate-600", colorTo: "to-slate-400", units: generateUnits("nmap", 3, 4) },
      { id: "skill-wireshark", name: "Wireshark", emoji: "🦈", colorFrom: "from-blue-400", colorTo: "to-blue-200", units: generateUnits("ws", 3, 4) },
    ]
  }
];

export const getSubjectById = (id: string): Subject | undefined => {
  for (const cat of highSchool) {
    const sub = cat.subjects.find(s => s.id === id);
    if (sub) return sub;
  }
  const uniSub = university.find(s => s.id === id);
  if (uniSub) return uniSub;
  
  for (const cat of skills) {
    const sub = cat.subjects.find(s => s.id === id);
    if (sub) return sub;
  }
  
  return undefined;
};
