export interface THMRoom {
  code: string;
  name: string;
  nameAr: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  tags: string[];
  isFree: boolean;
}

export interface StageRooms {
  stageIndex: number;
  stageName: string;
  rooms: THMRoom[];
}

export interface SubjectRoomMapping {
  subjectId: string;
  subjectName: string;
  stages: StageRooms[];
}

export const TRYHACKME_ROOM_MAPPINGS: SubjectRoomMapping[] = [
  {
    subjectId: "uni-cybersecurity",
    subjectName: "أمن سيبراني",
    stages: [
      {
        stageIndex: 0,
        stageName: "مفاهيم الأمن والتهديدات",
        rooms: [
          { code: "introtocyber", name: "Intro to Cyber Security", nameAr: "مقدمة في الأمن السيبراني", difficulty: "easy", description: "تعرّف على أساسيات الأمن السيبراني وأنواع التهديدات الشائعة", tags: ["basics", "threats"], isFree: true },
          { code: "dvwa", name: "DVWA", nameAr: "تطبيق الويب الضعيف", difficulty: "easy", description: "تعلّم الثغرات الشائعة من خلال تطبيق ويب مصمم للتدريب", tags: ["web", "vulnerabilities"], isFree: true },
          { code: "phishingyl", name: "Phishing", nameAr: "التصيّد الاحتيالي", difficulty: "easy", description: "تعرّف على هجمات التصيّد وكيف تحمي نفسك منها", tags: ["phishing", "social-engineering"], isFree: true },
          { code: "historyofmalware", name: "History of Malware", nameAr: "تاريخ البرمجيات الخبيثة", difficulty: "easy", description: "تعرّف على تطور البرمجيات الخبيثة عبر التاريخ", tags: ["malware", "history"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "التشفير والحماية",
        rooms: [
          { code: "encryptioncrypto101", name: "Encryption - Crypto 101", nameAr: "التشفير - أساسيات", difficulty: "medium", description: "تعلّم أساسيات التشفير: المتماثل وغير المتماثل والهاشينغ", tags: ["encryption", "crypto"], isFree: true },
          { code: "hashingcrypto101", name: "Hashing - Crypto 101", nameAr: "الهاشينغ - أساسيات", difficulty: "easy", description: "فهم دوال الهاش واستخداماتها في الأمن", tags: ["hashing", "crypto"], isFree: true },
          { code: "johntheripper0", name: "John The Ripper", nameAr: "جون ذا ريبر - كسر كلمات المرور", difficulty: "easy", description: "تعلّم كسر كلمات المرور باستخدام أداة John The Ripper", tags: ["password", "cracking"], isFree: true },
          { code: "passwordsecurity", name: "Password Security", nameAr: "أمن كلمات المرور", difficulty: "easy", description: "تعلّم إنشاء كلمات مرور آمنة وتقنيات الحماية", tags: ["passwords", "security"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "اختبار الاختراق والأدوات",
        rooms: [
          { code: "dvwa", name: "DVWA", nameAr: "اختبار اختراق تطبيقات الويب", difficulty: "easy", description: "تدرّب على اختبار اختراق تطبيقات الويب في بيئة آمنة", tags: ["pentesting", "web"], isFree: true },
          { code: "sqli", name: "SQL Injection", nameAr: "حقن SQL", difficulty: "medium", description: "تعلّم ثغرة SQL Injection واكتشفها واستغلها", tags: ["sql", "injection"], isFree: true },
          { code: "dvwaxss", name: "Cross-site Scripting", nameAr: "هجوم XSS", difficulty: "medium", description: "تعلّم هجمات XSS وكيف تحمي تطبيقاتك منها", tags: ["xss", "web"], isFree: true },
          { code: "dvwabrute", name: "Brute Force", nameAr: "هجوم القوة الغاشمة", difficulty: "easy", description: "تعلّم هجمات Brute Force وكيف تمنعها", tags: ["bruteforce", "passwords"], isFree: true },
          { code: "dvwaupload", name: "File Upload Vulnerabilities", nameAr: "ثغرات رفع الملفات", difficulty: "medium", description: "اكتشف ثغرات رفع الملفات واستغلها", tags: ["upload", "web"], isFree: true },
        ]
      },
      {
        stageIndex: 3,
        stageName: "الاستجابة للحوادث",
        rooms: [
          { code: "introtoir", name: "Intro to IR and IM", nameAr: "الاستجابة للحوادث الأمنية", difficulty: "medium", description: "تعلّم كيف تستجيب للحوادث الأمنية خطوة بخطوة", tags: ["incident", "response"], isFree: true },
          { code: "introdigitalforensics", name: "Intro to Digital Forensics", nameAr: "التحقيق الجنائي الرقمي", difficulty: "easy", description: "تعلّم أساسيات التحقيق الجنائي في الحوادث الرقمية", tags: ["forensics", "investigation"], isFree: true },
          { code: "introtomacro", name: "Intro to Malware Analysis", nameAr: "تحليل البرمجيات الخبيثة", difficulty: "medium", description: "تعلّم تحليل البرمجيات الخبيثة واكتشاف سلوكها", tags: ["malware", "analysis"], isFree: true },
        ]
      }
    ]
  },
  {
    subjectId: "skill-nmap",
    subjectName: "Nmap",
    stages: [
      {
        stageIndex: 0,
        stageName: "مبادئ Nmap ومسح المنافذ",
        rooms: [
          { code: "nmap01", name: "Nmap", nameAr: "أداة Nmap - مقدمة", difficulty: "easy", description: "تعلّم أساسيات Nmap ومسح الشبكات واكتشاف المنافذ المفتوحة", tags: ["nmap", "scanning"], isFree: true },
          { code: "nmap02", name: "Nmap Basic Port Scans", nameAr: "أساسيات مسح المنافذ", difficulty: "easy", description: "تدرّب على مسح المنافذ الأساسي وفهم النتائج", tags: ["nmap", "ports"], isFree: true },
          { code: "nmap03", name: "Nmap Advanced Port Scans", nameAr: "مسح المنافذ المتقدم", difficulty: "medium", description: "تعلّم أنواع المسح المتقدمة: SYN, UDP, NULL, FIN, Xmas", tags: ["nmap", "advanced"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "الاكتشاف والسكربتات",
        rooms: [
          { code: "nmap04", name: "Nmap Post Port Scans", nameAr: "ما بعد مسح المنافذ", difficulty: "medium", description: "اكتشاف الخدمات وأنظمة التشغيل والسكربتات", tags: ["nmap", "services"], isFree: true },
          { code: "nmaplivehostdiscovery", name: "Nmap Live Host Discovery", nameAr: "اكتشاف الأجهزة النشطة", difficulty: "easy", description: "تعلّم اكتشاف الأجهزة المتصلة بالشبكة", tags: ["nmap", "discovery"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "التطبيق العملي",
        rooms: [
          { code: "pentestingfundamentals", name: "Pentesting Fundamentals", nameAr: "أساسيات اختبار الاختراق", difficulty: "easy", description: "ضع مهارات Nmap في سياق عملية اختبار الاختراق الكاملة", tags: ["pentesting", "methodology"], isFree: true },
          { code: "introtoresearch", name: "Intro to Research", nameAr: "مقدمة في البحث الأمني", difficulty: "easy", description: "تعلّم كيف تبحث عن الثغرات والمعلومات الأمنية", tags: ["research", "osint"], isFree: true },
        ]
      }
    ]
  },
  {
    subjectId: "skill-wireshark",
    subjectName: "Wireshark",
    stages: [
      {
        stageIndex: 0,
        stageName: "تثبيت Wireshark والتقاط الحزم",
        rooms: [
          { code: "wireshark", name: "Wireshark 101", nameAr: "Wireshark - المقدمة", difficulty: "easy", description: "تعلّم تثبيت Wireshark والتقاط حزم الشبكة وتصفحها", tags: ["wireshark", "packets"], isFree: true },
          { code: "wiresharkthebasics", name: "Wireshark: The Basics", nameAr: "أساسيات Wireshark", difficulty: "easy", description: "فهم واجهة Wireshark وكيفية التقاط حركة الشبكة", tags: ["wireshark", "basics"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "تحليل البروتوكولات والتصفية",
        rooms: [
          { code: "wiresharkpacketoperations", name: "Wireshark: Packet Operations", nameAr: "عمليات الحزم في Wireshark", difficulty: "medium", description: "تعلّم تصفية الحزم وتحليل البروتوكولات المختلفة", tags: ["wireshark", "filters"], isFree: true },
          { code: "introtolan", name: "Intro to LAN", nameAr: "مقدمة في الشبكات المحلية", difficulty: "easy", description: "افهم بنية الشبكات المحلية والبروتوكولات الأساسية", tags: ["lan", "networking"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "تحليل الهجمات وحركة المرور الشبكي",
        rooms: [
          { code: "wiresharktrafficanalysis", name: "Wireshark: Traffic Analysis", nameAr: "تحليل حركة المرور المشبوهة", difficulty: "medium", description: "اكتشف الهجمات الشبكية من خلال تحليل حركة المرور", tags: ["wireshark", "attacks"], isFree: true },
          { code: "introtosecurityarchitecture", name: "Intro to Network Security", nameAr: "أمن الشبكات", difficulty: "easy", description: "طبّق مهارات Wireshark في سيناريوهات أمن الشبكات", tags: ["network", "security"], isFree: true },
        ]
      }
    ]
  },
  {
    subjectId: "skill-linux",
    subjectName: "Linux",
    stages: [
      {
        stageIndex: 0,
        stageName: "أساسيات Linux والأوامر الأساسية",
        rooms: [
          { code: "linuxfundamentalspart1", name: "Linux Fundamentals Part 1", nameAr: "أساسيات لينكس - الجزء 1", difficulty: "easy", description: "تعلّم أساسيات نظام Linux وأوامر الطرفية الأساسية", tags: ["linux", "basics"], isFree: true },
          { code: "linuxfundamentalspart2", name: "Linux Fundamentals Part 2", nameAr: "أساسيات لينكس - الجزء 2", difficulty: "easy", description: "تعمّق في أوامر Linux: الأنابيب والعمليات والصلاحيات", tags: ["linux", "commands"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "إدارة الملفات والمستخدمين",
        rooms: [
          { code: "linuxfundamentalspart3", name: "Linux Fundamentals Part 3", nameAr: "أساسيات لينكس - الجزء 3", difficulty: "easy", description: "إدارة المستخدمين والمجموعات ونظام الملفات", tags: ["linux", "users", "files"], isFree: true },
          { code: "linuxfilepermissions", name: "Linux File Permissions", nameAr: "صلاحيات الملفات في لينكس", difficulty: "easy", description: "فهم نظام الصلاحيات في Linux وكيفية إدارته", tags: ["linux", "permissions"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "Shell Scripting والأتمتة",
        rooms: [
          { code: "bashscripting", name: "Bash Scripting", nameAr: "برمجة Bash", difficulty: "medium", description: "تعلّم كتابة سكربتات Bash لأتمتة المهام", tags: ["bash", "scripting"], isFree: true },
          { code: "introtoshells", name: "What the Shell?", nameAr: "مقدمة في Shell", difficulty: "medium", description: "تعلّم استخدام الأنواع المختلفة من Shells", tags: ["shell", "reverse-shell"], isFree: true },
        ]
      },
      {
        stageIndex: 3,
        stageName: "الشبكات والأمن في Linux",
        rooms: [
          { code: "introtolan", name: "Intro to LAN", nameAr: "الشبكات في لينكس", difficulty: "easy", description: "تعلّم إعدادات الشبكة الأساسية", tags: ["linux", "networking"], isFree: true },
          { code: "linprivesc", name: "Linux PrivEsc", nameAr: "تصعيد الصلاحيات في لينكس", difficulty: "medium", description: "تعلّم تقنيات تصعيد الصلاحيات في Linux", tags: ["linux", "privesc"], isFree: true },
          { code: "hardening", name: "Linux System Hardening", nameAr: "تقوية نظام لينكس", difficulty: "hard", description: "تعلّم تأمين نظام Linux ضد الهجمات", tags: ["linux", "hardening", "security"], isFree: false },
        ]
      }
    ]
  },
  {
    subjectId: "skill-windows",
    subjectName: "Windows",
    stages: [
      {
        stageIndex: 0,
        stageName: "إدارة نظام Windows",
        rooms: [
          { code: "windowsfundamentals1xbx", name: "Windows Fundamentals 1", nameAr: "أساسيات ويندوز - الجزء 1", difficulty: "easy", description: "تعلّم أساسيات نظام Windows وأدوات الإدارة", tags: ["windows", "basics"], isFree: true },
          { code: "windowsfundamentals2x0x", name: "Windows Fundamentals 2", nameAr: "أساسيات ويندوز - الجزء 2", difficulty: "easy", description: "تعمّق في أدوات إدارة Windows والخدمات", tags: ["windows", "admin"], isFree: true },
          { code: "windowsfundamentals3xzx", name: "Windows Fundamentals 3", nameAr: "أساسيات ويندوز - الجزء 3", difficulty: "easy", description: "تعلّم أمن Windows والتحديثات والجدار الناري", tags: ["windows", "security"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "PowerShell والأتمتة",
        rooms: [
          { code: "powershell", name: "Hacking with PowerShell", nameAr: "PowerShell للأمن", difficulty: "medium", description: "تعلّم استخدام PowerShell في سيناريوهات الأمن السيبراني", tags: ["powershell", "scripting"], isFree: true },
          { code: "introtoshells", name: "What the Shell?", nameAr: "سطر أوامر وأنواع الشل", difficulty: "medium", description: "تعرّف على أنواع الشل وكيفية استخدامها", tags: ["shell", "commands"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "أمن Windows والـ Active Directory",
        rooms: [
          { code: "activedirectorybasics", name: "Active Directory Basics", nameAr: "أساسيات Active Directory", difficulty: "medium", description: "تعلّم بنية Active Directory وإدارة المستخدمين والسياسات", tags: ["ad", "directory"], isFree: true },
          { code: "dvwawindowshardening", name: "Windows Hardening", nameAr: "تقوية نظام ويندوز", difficulty: "hard", description: "تعلّم تأمين نظام Windows وسياسات المجموعة", tags: ["windows", "hardening"], isFree: false },
          { code: "dvwawindowsprivesc", name: "Windows PrivEsc", nameAr: "تصعيد الصلاحيات في ويندوز", difficulty: "medium", description: "اكتشف تقنيات تصعيد الصلاحيات في Windows", tags: ["windows", "privesc"], isFree: false },
        ]
      }
    ]
  },
];

export const CYBERSECURITY_SUBJECT_IDS = new Set([
  "uni-cybersecurity",
  "skill-nmap",
  "skill-wireshark",
  "skill-linux",
  "skill-windows",
]);

export function getRoomsForSubjectStage(subjectId: string, stageIndex: number): THMRoom[] {
  const mapping = TRYHACKME_ROOM_MAPPINGS.find(m => m.subjectId === subjectId);
  if (!mapping) return [];
  const stage = mapping.stages.find(s => s.stageIndex === stageIndex);
  return stage?.rooms ?? [];
}

export function getAllRoomsForSubject(subjectId: string): THMRoom[] {
  const mapping = TRYHACKME_ROOM_MAPPINGS.find(m => m.subjectId === subjectId);
  if (!mapping) return [];
  return mapping.stages.flatMap(s => s.rooms);
}

export function getRoomByCode(code: string): THMRoom | undefined {
  for (const mapping of TRYHACKME_ROOM_MAPPINGS) {
    for (const stage of mapping.stages) {
      const room = stage.rooms.find(r => r.code === code);
      if (room) return room;
    }
  }
  return undefined;
}
