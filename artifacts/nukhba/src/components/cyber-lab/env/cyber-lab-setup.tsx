import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, ChevronLeft } from "lucide-react";
import { ENV_PRESETS, generateEnvironment } from "./cyber-env-engine";
import type { CyberEnvironment, EnvironmentSetupRequest } from "./cyber-env-types";

interface Props {
  onEnvReady: (env: CyberEnvironment) => void;
  onBack: () => void;
  pendingAIEnv?: CyberEnvironment | null;
}

export default function CyberLabSetup({ onEnvReady, onBack, pendingAIEnv }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [goals, setGoals] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStep, setBuildStep] = useState("");

  if (pendingAIEnv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: "#080a11" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg rounded-3xl border border-emerald-500/20 bg-[#0d1119] p-8 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">البيئة جاهزة من المعلم الذكي! 🎯</h2>
          <p className="text-sm text-muted-foreground mb-2 font-bold">{pendingAIEnv.nameAr}</p>
          <p className="text-xs text-muted-foreground/70 mb-6 leading-relaxed whitespace-pre-line" dir="rtl">{pendingAIEnv.briefing.slice(0, 300)}...</p>
          <div className="flex items-center gap-2 mb-4 justify-center flex-wrap">
            {pendingAIEnv.machines.map(m => (
              <span key={m.id} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white">
                {m.icon} {m.hostname} ({m.ip})
              </span>
            ))}
          </div>
          <button
            onClick={() => onEnvReady(pendingAIEnv)}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-black text-base hover:brightness-110 transition-all"
          >
            🚀 دخول البيئة
          </button>
        </motion.div>
      </div>
    );
  }

  const handleBuild = async () => {
    if (!selectedPreset) return;
    setBuilding(true);

    const steps = [
      "تهيئة الشبكة الافتراضية...",
      "بناء أنظمة التشغيل...",
      "تثبيت الأدوات والخدمات...",
      "إعداد الملفات والمستخدمين...",
      "تشغيل الخدمات...",
      "اختبار الاتصال بين الأجهزة...",
      "البيئة جاهزة! 🎉",
    ];

    for (let i = 0; i < steps.length; i++) {
      setBuildStep(steps[i]);
      setBuildProgress(((i + 1) / steps.length) * 100);
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
    }

    const req: EnvironmentSetupRequest = { presetId: selectedPreset, goals, difficulty };
    const env = generateEnvironment(req);
    await new Promise(r => setTimeout(r, 300));
    onEnvReady(env);
  };

  if (building) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: "#080a11" }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
            <Loader2 className="w-10 h-10 text-red-400 animate-spin" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">جارٍ بناء البيئة...</h2>
          <p className="text-sm text-emerald-400 font-bold mb-6">{buildStep}</p>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-l from-red-500 to-amber-500 rounded-full"
              animate={{ width: `${buildProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{Math.round(buildProgress)}%</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080a11", direction: "rtl" }}>
      <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-[#0d1119] flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <h1 className="text-base font-black text-white">كيف تريد أن تكون بيئتك التطبيقية؟</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ENV_PRESETS.map(preset => {
            const isSelected = selectedPreset === preset.id;
            return (
              <motion.button
                key={preset.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedPreset(preset.id)}
                className={`relative p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-red-500/50 bg-gradient-to-b from-red-500/10 to-transparent shadow-lg shadow-red-500/5"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                }`}
              >
                <span className="text-2xl block mb-1.5">{preset.icon}</span>
                <span className="text-xs font-bold text-white block leading-tight">{preset.nameAr}</span>
                <span className="text-[10px] text-muted-foreground/60 block mt-1 leading-snug">{preset.descriptionAr}</span>
                {isSelected && (
                  <motion.div
                    layoutId="preset-ring"
                    className="absolute inset-0 rounded-xl border-2 border-red-500/50"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedPreset && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">
                  📝 صف هدفك — ماذا تريد أن تتعلم أو تجرب؟
                </label>
                <textarea
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  placeholder="مثال: أريد تعلم كيفية اختراق خادم SSH وسرقة الملفات الحساسة..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/40 focus:border-red-500/30 focus:outline-none resize-none"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2">⚡ مستوى الصعوبة</label>
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
                        difficulty === d.id
                          ? "border-red-500/30 bg-red-500/10 text-white"
                          : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuild}
                className="w-full py-3.5 rounded-xl bg-gradient-to-l from-red-600 to-red-500 text-white font-black text-sm shadow-lg shadow-red-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>بناء البيئة التطبيقية</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
