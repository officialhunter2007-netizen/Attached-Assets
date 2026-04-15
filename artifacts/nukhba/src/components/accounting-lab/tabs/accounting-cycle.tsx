import { useLabContext } from "../context";
import { ArrowLeftRight, CheckCircle2, Circle, ArrowDown } from "lucide-react";

export default function AccountingCycleTab({ onShare }: { onShare: (data: string) => void }) {
  const { cycleSteps, setCycleSteps, auditLog } = useLabContext();

  const toggleStep = (id: number) => {
    setCycleSteps(cycleSteps.map(s => s.id === id ? { ...s, isComplete: !s.isComplete } : s));
    const step = cycleSteps.find(s => s.id === id);
    if (step) auditLog(`${step.isComplete ? "إلغاء" : "إكمال"} خطوة: ${step.name}`);
  };

  const completedCount = cycleSteps.filter(s => s.isComplete).length;
  const progress = (completedCount / cycleSteps.length) * 100;

  const phaseColors = [
    { from: 1, to: 3, label: "التسجيل", color: "blue" },
    { from: 4, to: 6, label: "التسوية", color: "amber" },
    { from: 7, to: 9, label: "الإعداد والإقفال", color: "emerald" },
  ];

  const getPhase = (id: number) => phaseColors.find(p => id >= p.from && id <= p.to);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">🔄 الدورة المحاسبية</h3>
        <button onClick={() => {
          const data = cycleSteps.map(s => `${s.isComplete ? "✅" : "⬜"} ${s.name}: ${s.description}`).join("\n");
          onShare(`🔄 الدورة المحاسبية:\nالتقدم: ${completedCount}/${cycleSteps.length}\n\n${data}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">التقدم في الدورة</span>
          <span className="text-xs font-bold text-amber-400">{completedCount}/{cycleSteps.length}</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {completedCount === cycleSteps.length && (
          <div className="mt-3 text-center">
            <span className="text-sm font-bold text-emerald-400">🎉 أحسنت! أكملت الدورة المحاسبية بالكامل</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {cycleSteps.map((step, i) => {
          const phase = getPhase(step.id);
          const showPhaseHeader = i === 0 || getPhase(cycleSteps[i - 1].id)?.label !== phase?.label;
          const colorMap: Record<string, string> = {
            blue: "border-blue-500/20 bg-blue-500/5",
            amber: "border-amber-500/20 bg-amber-500/5",
            emerald: "border-emerald-500/20 bg-emerald-500/5",
          };
          const textMap: Record<string, string> = { blue: "text-blue-400", amber: "text-amber-400", emerald: "text-emerald-400" };
          return (
            <div key={step.id}>
              {showPhaseHeader && (
                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg mb-2 mt-3 ${colorMap[phase?.color || "blue"]}`}>
                  <span className={textMap[phase?.color || "blue"]}>{phase?.label}</span>
                </div>
              )}
              <button onClick={() => toggleStep(step.id)} className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-right ${step.isComplete ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                <div className="mt-0.5">
                  {step.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/20" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{step.id}</span>
                    <span className={`text-xs font-bold ${step.isComplete ? "text-emerald-400 line-through" : "text-white"}`}>{step.name}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">{step.description}</p>
                </div>
              </button>
              {i < cycleSteps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-3 h-3 text-white/10" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <h4 className="text-xs font-bold text-amber-400 mb-2">💡 نصيحة</h4>
        <p className="text-[11px] text-white/60 leading-relaxed">
          الدورة المحاسبية هي سلسلة من الخطوات تبدأ بتحليل العمليات وتنتهي بإعداد ميزان المراجعة بعد الإقفال.
          اضغط على كل خطوة عند إكمالها. يمكنك التنقل بين التبويبات الأخرى (القيود، حسابات T، القوائم المالية) لتنفيذ كل خطوة عملياً.
        </p>
      </div>
    </div>
  );
}
