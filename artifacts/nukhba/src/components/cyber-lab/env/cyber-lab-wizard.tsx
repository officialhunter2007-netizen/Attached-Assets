import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Server, Monitor, User, Wrench, PenLine } from "lucide-react";
import type { CyberEnvironment, OSType, MachineRole } from "./cyber-env-types";
import { generateWizardEnvironment } from "./cyber-env-engine";

interface Props {
  onEnvReady: (env: CyberEnvironment) => void;
  onBack: () => void;
  pendingAIEnv?: CyberEnvironment | null;
}

interface WizardMachine {
  id: string;
  name: string;
  os: OSType;
  role: MachineRole;
  isAttacker: boolean;
}

interface WizardUser {
  machineId: string;
  username: string;
  password: string;
  isRoot: boolean;
}

interface WizardService {
  machineId: string;
  services: string[];
}

interface ScenarioOption {
  id: string;
  icon: string;
  label: string;
  desc: string;
  defaultMachines: WizardMachine[];
}

const OS_OPTIONS: Array<{ id: OSType; label: string; icon: string }> = [
  { id: "kali-linux", label: "Kali Linux", icon: "🐧" },
  { id: "ubuntu-server", label: "Ubuntu Server", icon: "🖥️" },
  { id: "ubuntu-desktop", label: "Ubuntu Desktop", icon: "🖥️" },
  { id: "debian", label: "Debian", icon: "🐧" },
  { id: "centos", label: "CentOS", icon: "🐧" },
  { id: "windows-10", label: "Windows 10", icon: "🪟" },
  { id: "windows-server", label: "Windows Server", icon: "🪟" },
];

const SERVICE_OPTIONS = [
  { id: "ssh", label: "SSH", icon: "🔑", port: 22 },
  { id: "http", label: "HTTP/Apache", icon: "🌐", port: 80 },
  { id: "ftp", label: "FTP", icon: "📁", port: 21 },
  { id: "mysql", label: "MySQL", icon: "🗄️", port: 3306 },
  { id: "smb", label: "SMB/Samba", icon: "📂", port: 445 },
  { id: "rdp", label: "RDP", icon: "🖥️", port: 3389 },
  { id: "smtp", label: "SMTP", icon: "📧", port: 25 },
  { id: "dns", label: "DNS", icon: "📡", port: 53 },
];

const SCENARIOS: ScenarioOption[] = [
  {
    id: "ad-attack", icon: "🏢", label: "هجوم على بيئة Active Directory",
    desc: "بيئة شبكة مؤسسية مع Domain Controller — اختراق، تصعيد صلاحيات، حركة أفقية",
    defaultMachines: [
      { id: "m1", name: "kali-attacker", os: "kali-linux", role: "attacker", isAttacker: true },
      { id: "m2", name: "dc01", os: "windows-server", role: "server", isAttacker: false },
      { id: "m3", name: "workstation01", os: "windows-10", role: "workstation", isAttacker: false },
    ],
  },
  {
    id: "web-pentest", icon: "🌐", label: "اختبار اختراق تطبيقات الويب",
    desc: "خوادم ويب مع ثغرات OWASP — حقن SQL، XSS، تحميل ملفات، تنفيذ أوامر",
    defaultMachines: [
      { id: "m1", name: "kali-attacker", os: "kali-linux", role: "attacker", isAttacker: true },
      { id: "m2", name: "web-server", os: "ubuntu-server", role: "server", isAttacker: false },
    ],
  },
  {
    id: "network-pentest", icon: "📡", label: "اختبار اختراق الشبكات",
    desc: "عدة أجهزة مترابطة — مسح شبكي، استغلال خدمات، حركة أفقية بين الأجهزة",
    defaultMachines: [
      { id: "m1", name: "kali-attacker", os: "kali-linux", role: "attacker", isAttacker: true },
      { id: "m2", name: "target-server", os: "ubuntu-server", role: "target", isAttacker: false },
      { id: "m3", name: "file-server", os: "ubuntu-server", role: "server", isAttacker: false },
    ],
  },
  {
    id: "forensics", icon: "🔍", label: "تحليل جنائي رقمي",
    desc: "جهاز مخترق — حلّل الأدلة، تتبع المهاجم، استخرج الملفات المحذوفة",
    defaultMachines: [
      { id: "m1", name: "forensic-ws", os: "kali-linux", role: "attacker", isAttacker: true },
      { id: "m2", name: "compromised-server", os: "ubuntu-server", role: "target", isAttacker: false },
    ],
  },
  {
    id: "password-cracking", icon: "🔑", label: "كسر كلمات المرور والمصادقة",
    desc: "خدمات بكلمات مرور ضعيفة — هجمات Brute Force، Dictionary، كسر هاشات",
    defaultMachines: [
      { id: "m1", name: "kali-attacker", os: "kali-linux", role: "attacker", isAttacker: true },
      { id: "m2", name: "auth-server", os: "ubuntu-server", role: "target", isAttacker: false },
    ],
  },
  {
    id: "priv-escalation", icon: "⬆️", label: "تصعيد الصلاحيات",
    desc: "نظام بصلاحيات محدودة — هدفك الوصول لـ root أو Administrator",
    defaultMachines: [
      { id: "m1", name: "target-linux", os: "ubuntu-server", role: "target", isAttacker: false },
    ],
  },
  {
    id: "network-defense", icon: "🛡️", label: "أمن الشبكات والدفاع",
    desc: "إعداد جدران نارية، كشف التسلل، حماية الخوادم، تحليل السجلات",
    defaultMachines: [
      { id: "m1", name: "firewall", os: "ubuntu-server", role: "router", isAttacker: false },
      { id: "m2", name: "web-server", os: "ubuntu-server", role: "server", isAttacker: false },
      { id: "m3", name: "attacker", os: "kali-linux", role: "attacker", isAttacker: true },
    ],
  },
];

let machineCounter = 10;
function nextMachineId() { return `m${++machineCounter}`; }

export default function CyberLabWizard({ onEnvReady, onBack, pendingAIEnv }: Props) {
  const [step, setStep] = useState(pendingAIEnv ? -1 : 1);
  const [scenario, setScenario] = useState<string | null>(null);
  const [customScenario, setCustomScenario] = useState("");
  const [showCustomScenario, setShowCustomScenario] = useState(false);
  const [wizMachines, setWizMachines] = useState<WizardMachine[]>([]);
  const [wizUsers, setWizUsers] = useState<WizardUser[]>([]);
  const [wizServices, setWizServices] = useState<WizardService[]>([]);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [envName, setEnvName] = useState("");
  const [customNotes, setCustomNotes] = useState({ machines: "", users: "", services: "" });
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStep, setBuildStep] = useState("");

  if (pendingAIEnv && step === -1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: "#080a11", direction: "rtl" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg rounded-3xl border border-emerald-500/20 bg-[#0d1119] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
            <span className="text-4xl">🎯</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">البيئة جاهزة من المعلم الذكي!</h2>
          <p className="text-sm text-muted-foreground mb-2 font-bold">{pendingAIEnv.nameAr}</p>
          <p className="text-xs text-muted-foreground/70 mb-6 leading-relaxed whitespace-pre-line">{pendingAIEnv.briefing.slice(0, 300)}</p>
          <div className="flex items-center gap-2 mb-4 justify-center flex-wrap">
            {pendingAIEnv.machines.map(m => (
              <span key={m.id} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white">
                {m.icon} {m.hostname} ({m.ip})
              </span>
            ))}
          </div>
          <button onClick={() => onEnvReady(pendingAIEnv)} className="w-full px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-black text-base hover:brightness-110 transition-all">
            🚀 دخول البيئة
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSelectScenario = (id: string) => {
    setScenario(id);
    setShowCustomScenario(false);
    const sc = SCENARIOS.find(s => s.id === id);
    if (sc) {
      setWizMachines(sc.defaultMachines.map(m => ({ ...m })));
      const defaultUsers: WizardUser[] = [];
      const defaultServices: WizardService[] = [];
      for (const m of sc.defaultMachines) {
        if (m.os === "kali-linux") {
          defaultUsers.push({ machineId: m.id, username: "kali", password: "kali", isRoot: false });
          defaultUsers.push({ machineId: m.id, username: "root", password: "toor", isRoot: true });
          defaultServices.push({ machineId: m.id, services: ["ssh"] });
        } else if (m.os.includes("windows")) {
          defaultUsers.push({ machineId: m.id, username: "Administrator", password: "P@ssw0rd", isRoot: true });
          defaultUsers.push({ machineId: m.id, username: "user1", password: "password123", isRoot: false });
          defaultServices.push({ machineId: m.id, services: m.os === "windows-server" ? ["rdp", "smb", "dns"] : ["rdp", "smb"] });
        } else {
          defaultUsers.push({ machineId: m.id, username: "root", password: "toor123", isRoot: true });
          defaultUsers.push({ machineId: m.id, username: "admin", password: "admin123", isRoot: false });
          defaultServices.push({ machineId: m.id, services: ["ssh", "http"] });
        }
      }
      setWizUsers(defaultUsers);
      setWizServices(defaultServices);
      setEnvName(sc.label);
    }
  };

  const handleSelectCustom = () => {
    setScenario("custom");
    setShowCustomScenario(true);
    const defaultId = nextMachineId();
    setWizMachines([{ id: defaultId, name: "kali-attacker", os: "kali-linux", role: "attacker", isAttacker: true }]);
    setWizUsers([
      { machineId: defaultId, username: "kali", password: "kali", isRoot: false },
      { machineId: defaultId, username: "root", password: "toor", isRoot: true },
    ]);
    setWizServices([{ machineId: defaultId, services: ["ssh"] }]);
    setEnvName("بيئة مخصصة");
  };

  const addMachine = () => {
    const id = nextMachineId();
    setWizMachines(prev => [...prev, { id, name: `machine-${prev.length + 1}`, os: "ubuntu-server", role: "target", isAttacker: false }]);
    setWizUsers(prev => [...prev, { machineId: id, username: "admin", password: "admin123", isRoot: false }, { machineId: id, username: "root", password: "toor", isRoot: true }]);
    setWizServices(prev => [...prev, { machineId: id, services: ["ssh"] }]);
  };

  const removeMachine = (id: string) => {
    setWizMachines(prev => prev.filter(m => m.id !== id));
    setWizUsers(prev => prev.filter(u => u.machineId !== id));
    setWizServices(prev => prev.filter(s => s.machineId !== id));
  };

  const updateMachine = (id: string, updates: Partial<WizardMachine>) => {
    setWizMachines(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addUser = (machineId: string) => {
    setWizUsers(prev => [...prev, { machineId, username: "", password: "", isRoot: false }]);
  };

  const removeUser = (machineId: string, idx: number) => {
    setWizUsers(prev => {
      let count = 0;
      return prev.filter(u => {
        if (u.machineId === machineId) {
          if (count === idx) { count++; return false; }
          count++;
        }
        return true;
      });
    });
  };

  const updateUser = (machineId: string, idx: number, updates: Partial<WizardUser>) => {
    setWizUsers(prev => {
      let count = 0;
      return prev.map(u => {
        if (u.machineId === machineId) {
          if (count === idx) { count++; return { ...u, ...updates }; }
          count++;
        }
        return u;
      });
    });
  };

  const toggleService = (machineId: string, svc: string) => {
    setWizServices(prev => {
      const existing = prev.find(s => s.machineId === machineId);
      if (!existing) return [...prev, { machineId, services: [svc] }];
      return prev.map(s => {
        if (s.machineId !== machineId) return s;
        const has = s.services.includes(svc);
        return { ...s, services: has ? s.services.filter(x => x !== svc) : [...s.services, svc] };
      });
    });
  };

  const handleBuild = useCallback(async () => {
    setBuilding(true);
    const steps = [
      "تهيئة الشبكة الافتراضية...",
      "بناء أنظمة التشغيل...",
      "إنشاء المستخدمين والصلاحيات...",
      "تثبيت الأدوات والخدمات...",
      "إعداد الملفات وأنظمة الملفات...",
      "تشغيل الخدمات وفحص الاتصال...",
      "البيئة جاهزة! 🎉",
    ];
    for (let i = 0; i < steps.length; i++) {
      setBuildStep(steps[i]);
      setBuildProgress(((i + 1) / steps.length) * 100);
      await new Promise(r => setTimeout(r, 350 + Math.random() * 350));
    }
    const resolvedScenario = scenario === "custom" ? "network-pentest" : (scenario || "network-pentest");
    const env = generateWizardEnvironment({
      scenario: resolvedScenario,
      machines: wizMachines,
      users: wizUsers,
      services: wizServices,
      difficulty,
      name: envName || (scenario === "custom" ? (customScenario.slice(0, 60) || "بيئة مخصصة") : envName),
    });
    if (scenario === "custom" && customScenario.trim()) {
      env.briefing = `بيئة مخصصة:\n${customScenario}\n\n${env.briefing}`;
    }
    await new Promise(r => setTimeout(r, 300));
    onEnvReady(env);
  }, [scenario, customScenario, wizMachines, wizUsers, wizServices, difficulty, envName, onEnvReady]);

  if (building) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: "#080a11" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
            <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">جارٍ بناء البيئة...</h2>
          <p className="text-sm text-emerald-400 font-bold mb-6">{buildStep}</p>
          <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden mb-2">
            <motion.div className="h-full bg-gradient-to-l from-red-500 to-amber-500 rounded-full" animate={{ width: `${buildProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
          <p className="text-xs text-muted-foreground">{Math.round(buildProgress)}%</p>
        </motion.div>
      </div>
    );
  }

  const canNext = () => {
    if (step === 1) return scenario === "custom" ? customScenario.trim().length > 0 : !!scenario;
    if (step === 2) return wizMachines.length > 0 && wizMachines.every(m => m.name.trim());
    if (step === 3) return wizUsers.length > 0 && wizUsers.every(u => u.username.trim());
    if (step === 4) return true;
    return true;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080a11", direction: "rtl" }}>
      <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-[#0d1119] flex items-center gap-3">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-white truncate">🔬 إعداد المختبر — الخطوة {step} من 5</h1>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(s => (
            <div key={s} className={`w-6 h-1.5 rounded-full transition-all ${s < step ? "bg-emerald-500" : s === step ? "bg-red-500" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/25 shrink-0">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">ما نوع التجربة التي تريدها؟</h2>
                    <p className="text-[11px] text-muted-foreground">اختر نوع الهجوم أو الدفاع، أو اكتب ما تريد بنفسك</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {SCENARIOS.map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc.id)}
                      className={`w-full p-3.5 rounded-xl border text-right transition-all ${
                        scenario === sc.id
                          ? "border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/5"
                          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">{sc.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white">{sc.label}</div>
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sc.desc}</div>
                        </div>
                        {scenario === sc.id && <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0"><span className="text-white text-xs">✓</span></div>}
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={handleSelectCustom}
                    className={`w-full p-3.5 rounded-xl border text-right transition-all ${
                      scenario === "custom"
                        ? "border-amber-500/40 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                        : "border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                        <PenLine className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-amber-400">مخصص — اكتب ما تريد</div>
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5">صِف البيئة التي تريد بناءها بكلماتك</div>
                      </div>
                      {scenario === "custom" && <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0"><span className="text-white text-xs">✓</span></div>}
                    </div>
                  </button>

                  {showCustomScenario && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                      <textarea
                        value={customScenario}
                        onChange={e => setCustomScenario(e.target.value)}
                        placeholder="مثال: أريد بيئة فيها خادم ويب مع قاعدة بيانات وجهاز مهاجم، أريد التدرب على اختراق تطبيق ويب وسحب بيانات من القاعدة..."
                        className="w-full px-4 py-3 rounded-xl border border-amber-500/20 bg-white/[0.03] text-sm text-white placeholder:text-muted-foreground/30 focus:border-amber-500/40 focus:outline-none leading-relaxed"
                        rows={4}
                        dir="rtl"
                        autoFocus
                      />
                      <p className="text-[10px] text-muted-foreground/40 mt-1.5">صِف ما تريد بالتفصيل — سيتم بناء البيئة بناءً على وصفك + الأجهزة التي تحددها في الخطوات التالية</p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/25 shrink-0">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">ما الأجهزة التي تريدها في البيئة؟</h2>
                    <p className="text-[11px] text-muted-foreground">حدد اسم كل جهاز ونظام تشغيله ودوره — يمكنك إضافة أو حذف أجهزة</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {wizMachines.map((m, idx) => (
                    <div key={m.id} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-bold text-amber-400 shrink-0">جهاز {idx + 1}</span>
                        <div className="flex-1" />
                        {wizMachines.length > 1 && (
                          <button onClick={() => removeMachine(m.id)} className="p-1 rounded hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground/60 mb-1 block">اسم الجهاز</label>
                          <input
                            value={m.name}
                            onChange={e => updateMachine(m.id, { name: e.target.value.replace(/\s/g, "-") })}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white focus:border-red-500/30 focus:outline-none"
                            dir="ltr"
                            placeholder="hostname"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground/60 mb-1 block">نظام التشغيل</label>
                          <select
                            value={m.os}
                            onChange={e => updateMachine(m.id, { os: e.target.value as OSType })}
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0d1119] text-xs text-white focus:border-red-500/30 focus:outline-none"
                          >
                            {OS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.icon} {o.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground/60">الدور:</label>
                        {(["attacker", "target", "server", "workstation", "router"] as MachineRole[]).map(role => (
                          <button
                            key={role}
                            onClick={() => updateMachine(m.id, { role, isAttacker: role === "attacker" })}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                              m.role === role ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/5 text-muted-foreground/60 border border-transparent hover:bg-white/10"
                            }`}
                          >
                            {role === "attacker" ? "مهاجم" : role === "target" ? "هدف" : role === "server" ? "خادم" : role === "workstation" ? "محطة عمل" : "موجّه"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addMachine}
                    className="w-full py-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-center gap-2 text-muted-foreground text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة جهاز جديد
                  </button>

                  <div className="mt-3">
                    <label className="text-[10px] text-muted-foreground/50 mb-1 flex items-center gap-1">
                      <PenLine className="w-3 h-3" />
                      ملاحظات إضافية (اختياري)
                    </label>
                    <textarea
                      value={customNotes.machines}
                      onChange={e => setCustomNotes(prev => ({ ...prev, machines: e.target.value }))}
                      placeholder="أي تفاصيل إضافية تريدها عن الأجهزة..."
                      className="w-full px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] text-white placeholder:text-muted-foreground/20 focus:border-white/15 focus:outline-none leading-relaxed"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/25 shrink-0">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">من هم المستخدمون في كل جهاز؟</h2>
                    <p className="text-[11px] text-muted-foreground">حدد أسماء المستخدمين وكلمات المرور لكل جهاز</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {wizMachines.map(m => {
                    const machineUsers = wizUsers.filter(u => u.machineId === m.id);
                    const osIcon = OS_OPTIONS.find(o => o.id === m.os)?.icon || "🖥️";
                    return (
                      <div key={m.id} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                          <span>{osIcon}</span>
                          <span className="text-xs font-bold text-white" dir="ltr">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground/50">({machineUsers.length} مستخدم)</span>
                        </div>
                        <div className="space-y-2">
                          {machineUsers.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                value={u.username}
                                onChange={e => updateUser(m.id, idx, { username: e.target.value })}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white focus:border-red-500/30 focus:outline-none"
                                placeholder="اسم المستخدم"
                                dir="ltr"
                              />
                              <input
                                value={u.password}
                                onChange={e => updateUser(m.id, idx, { password: e.target.value })}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white focus:border-red-500/30 focus:outline-none"
                                placeholder="كلمة المرور"
                                dir="ltr"
                              />
                              <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                <input type="checkbox" checked={u.isRoot} onChange={e => updateUser(m.id, idx, { isRoot: e.target.checked })} className="accent-red-500 w-3 h-3" />
                                root
                              </label>
                              {machineUsers.length > 1 && (
                                <button onClick={() => removeUser(m.id, idx)} className="p-0.5 rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addUser(m.id)} className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 mt-1">
                            <Plus className="w-3 h-3" /> إضافة مستخدم
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-3">
                    <label className="text-[10px] text-muted-foreground/50 mb-1 flex items-center gap-1">
                      <PenLine className="w-3 h-3" />
                      ملاحظات إضافية (اختياري)
                    </label>
                    <textarea
                      value={customNotes.users}
                      onChange={e => setCustomNotes(prev => ({ ...prev, users: e.target.value }))}
                      placeholder="مثال: أريد مستخدم بصلاحيات محدودة فقط يمكنه تشغيل python..."
                      className="w-full px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] text-white placeholder:text-muted-foreground/20 focus:border-white/15 focus:outline-none leading-relaxed"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/25 shrink-0">
                    <Wrench className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">ما الخدمات التي تريدها على كل جهاز؟</h2>
                    <p className="text-[11px] text-muted-foreground">فعّل الخدمات المطلوبة لكل جهاز — يمكنك تخصيصها كما تريد</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {wizMachines.map(m => {
                    const ms = wizServices.find(s => s.machineId === m.id);
                    const activeSvcs = ms?.services || [];
                    const osIcon = OS_OPTIONS.find(o => o.id === m.os)?.icon || "🖥️";
                    return (
                      <div key={m.id} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-3">
                          <span>{osIcon}</span>
                          <span className="text-xs font-bold text-white" dir="ltr">{m.name}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {SERVICE_OPTIONS.map(svc => {
                            const isOn = activeSvcs.includes(svc.id);
                            return (
                              <button
                                key={svc.id}
                                onClick={() => toggleService(m.id, svc.id)}
                                className={`p-2 rounded-lg text-[10px] font-bold transition-all border ${
                                  isOn ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.02] text-muted-foreground/50 border-white/5 hover:bg-white/5"
                                }`}
                              >
                                {svc.icon} {svc.label}
                                <span className="block text-[9px] text-muted-foreground/40 mt-0.5">:{svc.port}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-3">
                    <label className="text-[10px] text-muted-foreground/50 mb-1 flex items-center gap-1">
                      <PenLine className="w-3 h-3" />
                      ملاحظات إضافية (اختياري)
                    </label>
                    <textarea
                      value={customNotes.services}
                      onChange={e => setCustomNotes(prev => ({ ...prev, services: e.target.value }))}
                      placeholder="مثال: أريد خادم ويب بثغرة SQL Injection في صفحة تسجيل الدخول..."
                      className="w-full px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-[11px] text-white placeholder:text-muted-foreground/20 focus:border-white/15 focus:outline-none leading-relaxed"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                    <span className="text-lg">🏁</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">مراجعة نهائية وإطلاق البيئة</h2>
                    <p className="text-[11px] text-muted-foreground">راجع إعداداتك ثم ابدأ بناء البيئة</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">اسم البيئة</label>
                  <input
                    value={envName}
                    onChange={e => setEnvName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white focus:border-red-500/30 focus:outline-none"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1.5 block">مستوى الصعوبة</label>
                  <div className="flex gap-2">
                    {([
                      { id: "beginner" as const, label: "مبتدئ", icon: "🟢" },
                      { id: "intermediate" as const, label: "متوسط", icon: "🟡" },
                      { id: "advanced" as const, label: "متقدم", icon: "🔴" },
                    ]).map(d => (
                      <button
                        key={d.id}
                        onClick={() => setDifficulty(d.id)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          difficulty === d.id ? "border-red-500/30 bg-red-500/10 text-white" : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
                        }`}
                      >
                        {d.icon} {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                  <h3 className="text-xs font-bold text-amber-400">📋 ملخص البيئة</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>🏷️ السيناريو: <span className="text-white font-bold">{scenario === "custom" ? "مخصص" : SCENARIOS.find(s => s.id === scenario)?.label}</span></div>
                    {scenario === "custom" && customScenario.trim() && (
                      <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px] text-muted-foreground/80 mt-1 mb-1 whitespace-pre-wrap">{customScenario}</div>
                    )}
                    <div>🖥️ عدد الأجهزة: <span className="text-white font-bold">{wizMachines.length}</span></div>
                    <div>👤 إجمالي المستخدمين: <span className="text-white font-bold">{wizUsers.length}</span></div>
                  </div>
                  <div className="grid gap-1.5 mt-2">
                    {wizMachines.map(m => {
                      const mu = wizUsers.filter(u => u.machineId === m.id);
                      const ms = wizServices.find(s => s.machineId === m.id);
                      const osIcon = OS_OPTIONS.find(o => o.id === m.os)?.icon || "🖥️";
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span>{osIcon}</span>
                          <span className="text-[11px] font-bold text-white" dir="ltr">{m.name}</span>
                          <span className="text-[9px] text-muted-foreground/50">{m.role === "attacker" ? "مهاجم" : m.role === "target" ? "هدف" : m.role === "server" ? "خادم" : m.role}</span>
                          <span className="text-[9px] text-muted-foreground/40">{mu.length} مستخدم</span>
                          <span className="text-[9px] text-emerald-400/50">{ms?.services.join(", ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/5 bg-[#0d1119] flex items-center gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-muted-foreground hover:bg-white/[0.04] transition-all flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
        )}
        <div className="flex-1" />
        {step < 5 ? (
          <button
            onClick={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              canNext()
                ? "bg-gradient-to-l from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20 hover:brightness-110"
                : "bg-white/5 text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleBuild}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all flex items-center gap-2"
          >
            🚀 بناء البيئة
          </button>
        )}
      </div>
    </div>
  );
}
