import { useState } from "react";

interface Props {
  open: boolean;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onBuild: (params: { description: string; difficulty: "beginner" | "intermediate" | "advanced"; category?: string }) => void;
}

const PRESET_SCENARIOS = [
  {
    title: "اختراق ويب أساسي",
    description: "خادم ويب فيه لوحة إدارة بكلمة مرور افتراضية. اخترقها واقرأ flag.",
    difficulty: "beginner" as const,
    category: "web",
    icon: "🌐",
  },
  {
    title: "فحص شبكة وكشف خدمات",
    description: "شبكة صغيرة فيها عدة أجهزة. اكتشف الأهداف والخدمات بـnmap.",
    difficulty: "beginner" as const,
    category: "recon",
    icon: "📡",
  },
  {
    title: "حقن SQL",
    description: "موقع تسجيل دخول مصاب بثغرة SQL Injection. تجاوز التحقق وادخل.",
    difficulty: "intermediate" as const,
    category: "web",
    icon: "💉",
  },
  {
    title: "تجاوز صلاحيات Linux",
    description: "حصلتَ على shell كمستخدم عادي. ارفع صلاحياتك إلى root.",
    difficulty: "intermediate" as const,
    category: "priv-esc",
    icon: "⬆️",
  },
  {
    title: "كسر كلمة مرور SSH",
    description: "خادم SSH ضعيف. استخدم hydra لاكتشاف بيانات الدخول.",
    difficulty: "intermediate" as const,
    category: "network",
    icon: "🔐",
  },
  {
    title: "تحليل جنائي رقمي",
    description: "صورة قرص فيها أدلة. ابحث عن الملفات المشبوهة والآثار المخفيّة.",
    difficulty: "advanced" as const,
    category: "forensics",
    icon: "🔍",
  },
];

const DIFFICULTY_LABELS = {
  beginner: { ar: "مبتدئ", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/40 text-emerald-200" },
  intermediate: { ar: "متوسط", color: "from-amber-500/20 to-amber-500/5 border-amber-400/40 text-amber-200" },
  advanced: { ar: "متقدّم", color: "from-red-500/20 to-red-500/5 border-red-400/40 text-red-200" },
};

export function IntakeDialog({ open, busy, error, onCancel, onBuild }: Props) {
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [customDesc, setCustomDesc] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [category, setCategory] = useState<string>("");

  if (!open) return null;

  const buildPreset = (p: typeof PRESET_SCENARIOS[number]) => {
    onBuild({ description: p.description, difficulty: p.difficulty, category: p.category });
  };

  const buildCustom = () => {
    const d = customDesc.trim();
    onBuild({
      description: d || "اقترح سيناريو محاكاة هجمة تعليمي مناسب لي",
      difficulty,
      category: category || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3" style={{ direction: "rtl" }}>
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-l from-red-900/30 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h2 className="text-lg font-bold text-white">محاكاة هجمة تعليمية</h2>
              <p className="text-xs text-white/60 mt-0.5">اختر سيناريو جاهز أو اوصف ما تريد التدرّب عليه</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center text-lg disabled:opacity-30"
          >
            ×
          </button>
        </div>

        <div className="flex border-b border-white/10 bg-black/30">
          <button
            onClick={() => setMode("presets")}
            disabled={busy}
            className={`flex-1 py-3 text-sm font-bold transition ${mode === "presets" ? "text-red-300 border-b-2 border-red-400 bg-red-500/5" : "text-white/50 hover:text-white/80"}`}
          >
            سيناريوهات جاهزة
          </button>
          <button
            onClick={() => setMode("custom")}
            disabled={busy}
            className={`flex-1 py-3 text-sm font-bold transition ${mode === "custom" ? "text-red-300 border-b-2 border-red-400 bg-red-500/5" : "text-white/50 hover:text-white/80"}`}
          >
            اوصف ما تريد
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {mode === "presets" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_SCENARIOS.map((p, i) => {
                const dl = DIFFICULTY_LABELS[p.difficulty];
                return (
                  <button
                    key={i}
                    onClick={() => buildPreset(p)}
                    disabled={busy}
                    className="text-right p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/40 transition group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{p.icon}</span>
                      <h3 className="font-bold text-white text-sm flex-1">{p.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-l ${dl.color} border`}>
                        {dl.ar}
                      </span>
                    </div>
                    <p className="text-xs text-white/65 leading-relaxed">{p.description}</p>
                  </button>
                );
              })}
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2 font-bold">اوصف السيناريو الذي تريد التدرّب عليه</label>
                <textarea
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  disabled={busy}
                  placeholder="مثال: شبكة شركة صغيرة فيها خادم ويب وقاعدة بيانات. أريد التدرّب على اكتشافها واختراقها كاملةً."
                  rows={4}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-red-400/50 resize-none min-h-[100px]"
                  style={{ direction: "rtl" }}
                />
                <div className="text-[11px] text-white/40 mt-1">اتركها فارغة وسأقترح عليك سيناريو</div>
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2 font-bold">المستوى</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>).map(k => {
                    const dl = DIFFICULTY_LABELS[k];
                    return (
                      <button
                        key={k}
                        onClick={() => setDifficulty(k)}
                        disabled={busy}
                        className={`py-2 px-3 rounded-xl text-sm font-bold border transition ${
                          difficulty === k
                            ? `bg-gradient-to-l ${dl.color}`
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {dl.ar}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2 font-bold">الفئة (اختياري)</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "", l: "أي شيء" },
                    { v: "web", l: "ويب" },
                    { v: "network", l: "شبكات" },
                    { v: "recon", l: "استطلاع" },
                    { v: "priv-esc", l: "تجاوز صلاحيات" },
                    { v: "forensics", l: "تحليل جنائي" },
                    { v: "crypto", l: "تشفير" },
                  ].map(c => (
                    <button
                      key={c.v}
                      onClick={() => setCategory(c.v)}
                      disabled={busy}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        category === c.v
                          ? "bg-red-500/20 border-red-400/40 text-red-200"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={buildCustom}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-gradient-to-l from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white font-bold text-sm disabled:opacity-40 transition"
              >
                {busy ? "… جاري بناء السيناريو" : "ابنِ السيناريو"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              {error}
            </div>
          )}

          {busy && mode === "presets" && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm text-center animate-pulse">
              … جاري بناء السيناريو، انتظر لحظة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
