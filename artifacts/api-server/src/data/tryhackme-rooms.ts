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
          { code: "portsecurityvulnerabilities", name: "Common Attacks", nameAr: "الهجمات الشائعة", difficulty: "easy", description: "استكشف أنواع الهجمات السيبرانية الأكثر شيوعاً وكيف تعمل", tags: ["attacks", "phishing"], isFree: true },
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
          { code: "dvwacryptography", name: "Cryptography Basics", nameAr: "أساسيات علم التشفير", difficulty: "medium", description: "طبّق مفاهيم التشفير عملياً", tags: ["cryptography"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "اختبار الاختراق والأدوات",
        rooms: [
          { code: "dvwa", name: "DVWA", nameAr: "اختبار اختراق تطبيقات الويب", difficulty: "easy", description: "تدرّب على اختبار اختراق تطبيقات الويب في بيئة آمنة", tags: ["pentesting", "web"], isFree: true },
          { code: "dvwainjection", name: "SQL Injection", nameAr: "حقن SQL", difficulty: "medium", description: "تعلّم ثغرة SQL Injection واكتشفها واستغلها", tags: ["sql", "injection"], isFree: true },
          { code: "dvwaxss", name: "Cross-site Scripting", nameAr: "هجوم XSS", difficulty: "medium", description: "تعلّم هجمات XSS وكيف تحمي تطبيقاتك منها", tags: ["xss", "web"], isFree: true },
          { code: "dvwabrute", name: "Brute Force", nameAr: "هجوم القوة الغاشمة", difficulty: "easy", description: "تعلّم هجمات Brute Force وكيف تمنعها", tags: ["bruteforce", "passwords"], isFree: true },
          { code: "dvwaupload", name: "File Upload Vulnerabilities", nameAr: "ثغرات رفع الملفات", difficulty: "medium", description: "اكتشف ثغرات رفع الملفات واستغلها", tags: ["upload", "web"], isFree: true },
        ]
      },
      {
        stageIndex: 3,
        stageName: "الاستجابة للحوادث",
        rooms: [
          { code: "dvwaincident", name: "Incident Response", nameAr: "الاستجابة للحوادث الأمنية", difficulty: "medium", description: "تعلّم كيف تستجيب للحوادث الأمنية خطوة بخطوة", tags: ["incident", "response"], isFree: true },
          { code: "dvwaforensics", name: "Digital Forensics", nameAr: "التحقيق الجنائي الرقمي", difficulty: "medium", description: "تعلّم أساسيات التحقيق الجنائي في الحوادث الرقمية", tags: ["forensics", "investigation"], isFree: true },
          { code: "dvwamalware", name: "Malware Analysis", nameAr: "تحليل البرمجيات الخبيثة", difficulty: "hard", description: "تعلّم تحليل البرمجيات الخبيثة واكتشاف سلوكها", tags: ["malware", "analysis"], isFree: true },
          { code: "dvwarecovery", name: "Disaster Recovery", nameAr: "استعادة الأنظمة بعد الحوادث", difficulty: "medium", description: "تعلّم خطط التعافي من الكوارث واستمرارية الأعمال", tags: ["recovery", "planning"], isFree: true },
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
          { code: "dvwanmap", name: "Nmap", nameAr: "أداة Nmap - مقدمة", difficulty: "easy", description: "تعلّم أساسيات Nmap ومسح الشبكات واكتشاف المنافذ المفتوحة", tags: ["nmap", "scanning"], isFree: true },
          { code: "dvwanmapbasics", name: "Nmap Basics", nameAr: "أساسيات مسح المنافذ", difficulty: "easy", description: "تدرّب على مسح المنافذ الأساسي وفهم النتائج", tags: ["nmap", "ports"], isFree: true },
          { code: "dvwanmaplive", name: "Nmap Live Host Discovery", nameAr: "اكتشاف الأجهزة النشطة", difficulty: "easy", description: "تعلّم اكتشاف الأجهزة المتصلة بالشبكة", tags: ["nmap", "discovery"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "أنواع المسح والتقنيات المتقدمة",
        rooms: [
          { code: "dvwanmapadvanced", name: "Nmap Advanced Port Scans", nameAr: "مسح المنافذ المتقدم", difficulty: "medium", description: "تعلّم أنواع المسح المتقدمة: SYN, UDP, NULL, FIN, Xmas", tags: ["nmap", "advanced"], isFree: true },
          { code: "dvwanmappost", name: "Nmap Post Port Scans", nameAr: "ما بعد مسح المنافذ", difficulty: "medium", description: "اكتشاف الخدمات وأنظمة التشغيل والسكربتات", tags: ["nmap", "services"], isFree: true },
          { code: "dvwanmapnse", name: "Nmap Scripting Engine", nameAr: "محرك سكربتات Nmap", difficulty: "medium", description: "استخدم NSE لأتمتة المسح واكتشاف الثغرات", tags: ["nmap", "nse", "scripting"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "تحليل النتائج وكتابة التقارير",
        rooms: [
          { code: "dvwanmapreport", name: "Nmap Reporting", nameAr: "تحليل وتقارير Nmap", difficulty: "medium", description: "تعلّم تحليل نتائج Nmap وكتابة تقارير احترافية", tags: ["nmap", "reporting"], isFree: true },
          { code: "dvwapentesting", name: "Pentesting Fundamentals", nameAr: "أساسيات اختبار الاختراق", difficulty: "easy", description: "ضع مهارات Nmap في سياق عملية اختبار الاختراق الكاملة", tags: ["pentesting", "methodology"], isFree: true },
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
          { code: "dvwawireshark", name: "Wireshark 101", nameAr: "Wireshark - المقدمة", difficulty: "easy", description: "تعلّم تثبيت Wireshark والتقاط حزم الشبكة وتصفحها", tags: ["wireshark", "packets"], isFree: true },
          { code: "dvwawiresharkbasics", name: "Wireshark: The Basics", nameAr: "أساسيات Wireshark", difficulty: "easy", description: "فهم واجهة Wireshark وكيفية التقاط حركة الشبكة", tags: ["wireshark", "basics"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "تحليل البروتوكولات والتصفية",
        rooms: [
          { code: "dvwawiresharkops", name: "Wireshark: Packet Operations", nameAr: "عمليات الحزم في Wireshark", difficulty: "medium", description: "تعلّم تصفية الحزم وتحليل البروتوكولات المختلفة", tags: ["wireshark", "filters"], isFree: true },
          { code: "dvwawiresharkhttp", name: "Wireshark: HTTP Analysis", nameAr: "تحليل HTTP", difficulty: "medium", description: "حلل حركة HTTP واكتشف البيانات المرسلة", tags: ["wireshark", "http"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "تحليل الهجمات وحركة المرور الشبكي",
        rooms: [
          { code: "dvwawiresharkattack", name: "Wireshark: Traffic Analysis", nameAr: "تحليل حركة المرور المشبوهة", difficulty: "medium", description: "اكتشف الهجمات الشبكية من خلال تحليل حركة المرور", tags: ["wireshark", "attacks"], isFree: true },
          { code: "dvwanetworksecurity", name: "Network Security", nameAr: "أمن الشبكات", difficulty: "medium", description: "طبّق مهارات Wireshark في سيناريوهات أمن الشبكات", tags: ["network", "security"], isFree: true },
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
          { code: "dvwalinux1", name: "Linux Fundamentals Part 1", nameAr: "أساسيات لينكس - الجزء 1", difficulty: "easy", description: "تعلّم أساسيات نظام Linux وأوامر الطرفية الأساسية", tags: ["linux", "basics"], isFree: true },
          { code: "dvwalinux2", name: "Linux Fundamentals Part 2", nameAr: "أساسيات لينكس - الجزء 2", difficulty: "easy", description: "تعمّق في أوامر Linux: الأنابيب والعمليات والصلاحيات", tags: ["linux", "commands"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "إدارة الملفات والمستخدمين",
        rooms: [
          { code: "dvwalinux3", name: "Linux Fundamentals Part 3", nameAr: "أساسيات لينكس - الجزء 3", difficulty: "easy", description: "إدارة المستخدمين والمجموعات ونظام الملفات", tags: ["linux", "users", "files"], isFree: true },
          { code: "dvwalinuxpermissions", name: "Linux File Permissions", nameAr: "صلاحيات الملفات في لينكس", difficulty: "easy", description: "فهم نظام الصلاحيات في Linux وكيفية إدارته", tags: ["linux", "permissions"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "Shell Scripting والأتمتة",
        rooms: [
          { code: "dvwabashscripting", name: "Bash Scripting", nameAr: "برمجة Bash", difficulty: "medium", description: "تعلّم كتابة سكربتات Bash لأتمتة المهام", tags: ["bash", "scripting"], isFree: true },
          { code: "dvwalinuxautomation", name: "Linux Automation", nameAr: "أتمتة لينكس", difficulty: "medium", description: "أتمت المهام الروتينية باستخدام Cron و Bash", tags: ["automation", "cron"], isFree: true },
        ]
      },
      {
        stageIndex: 3,
        stageName: "الشبكات والأمن في Linux",
        rooms: [
          { code: "dvwalinuxnetworking", name: "Linux Networking", nameAr: "الشبكات في لينكس", difficulty: "medium", description: "تعلّم إعدادات الشبكة والجدار الناري في Linux", tags: ["linux", "networking"], isFree: true },
          { code: "dvwalinuxhardening", name: "Linux System Hardening", nameAr: "تقوية نظام لينكس", difficulty: "hard", description: "تعلّم تأمين نظام Linux ضد الهجمات", tags: ["linux", "hardening", "security"], isFree: true },
          { code: "dvwalinuxprivesc", name: "Linux PrivEsc", nameAr: "تصعيد الصلاحيات في لينكس", difficulty: "medium", description: "تعلّم تقنيات تصعيد الصلاحيات في Linux", tags: ["linux", "privesc"], isFree: true },
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
          { code: "dvwawindows1", name: "Windows Fundamentals 1", nameAr: "أساسيات ويندوز - الجزء 1", difficulty: "easy", description: "تعلّم أساسيات نظام Windows وأدوات الإدارة", tags: ["windows", "basics"], isFree: true },
          { code: "dvwawindows2", name: "Windows Fundamentals 2", nameAr: "أساسيات ويندوز - الجزء 2", difficulty: "easy", description: "تعمّق في أدوات إدارة Windows والخدمات", tags: ["windows", "admin"], isFree: true },
          { code: "dvwawindows3", name: "Windows Fundamentals 3", nameAr: "أساسيات ويندوز - الجزء 3", difficulty: "easy", description: "تعلّم أمن Windows والتحديثات والجدار الناري", tags: ["windows", "security"], isFree: true },
        ]
      },
      {
        stageIndex: 1,
        stageName: "PowerShell والأتمتة",
        rooms: [
          { code: "dvwapowershell", name: "Hacking with PowerShell", nameAr: "PowerShell للأمن", difficulty: "medium", description: "تعلّم استخدام PowerShell في سيناريوهات الأمن السيبراني", tags: ["powershell", "scripting"], isFree: true },
          { code: "dvwacmdline", name: "Windows Command Line", nameAr: "سطر أوامر ويندوز", difficulty: "easy", description: "أتقن سطر أوامر Windows وأوامره الأساسية", tags: ["cmd", "commands"], isFree: true },
        ]
      },
      {
        stageIndex: 2,
        stageName: "أمن Windows والـ Active Directory",
        rooms: [
          { code: "dvwaactivedirectory", name: "Active Directory Basics", nameAr: "أساسيات Active Directory", difficulty: "medium", description: "تعلّم بنية Active Directory وإدارة المستخدمين والسياسات", tags: ["ad", "directory"], isFree: true },
          { code: "dvwawindowshardening", name: "Windows Hardening", nameAr: "تقوية نظام ويندوز", difficulty: "hard", description: "تعلّم تأمين نظام Windows وسياسات المجموعة", tags: ["windows", "hardening"], isFree: true },
          { code: "dvwawindowsprivesc", name: "Windows PrivEsc", nameAr: "تصعيد الصلاحيات في ويندوز", difficulty: "medium", description: "اكتشف تقنيات تصعيد الصلاحيات في Windows", tags: ["windows", "privesc"], isFree: true },
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
