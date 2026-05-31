import { useLabContext } from "../context";
import { ArrowLeftRight, CheckCircle2, Circle, ArrowDown, ExternalLink } from "lucide-react";
import type { LabTab } from "../types";

const STEP_TARGET: Record<number, { tab: LabTab; cta: string; explainer: string }> = {
  1: { tab: "equation", cta: "افتح المعادلة المحاسبية", explainer: "حدّد أثر العملية على الأصول/الخصوم/حقوق الملكية قبل تسجيلها." },
  2: { tab: "journal", cta: "افتح دفتر القيود", explainer: "سجّل العملية كقيد متوازن (مدين = دائن)." },
  3: { tab: "t-accounts", cta: "افتح حسابات T", explainer: "رحّل القيود من اليومية إلى حسابات الأستاذ على شكل T." },
  4: { tab: "t-accounts", cta: "افتح ميزان المراجعة", explainer: "تأكد أن مجموع المدين = مجموع الدائن قبل التسوية." },
  5: { tab: "adjusting", cta: "افتح قيود التسوية", explainer: "أضف الاستحقاقات والتأجيلات والاستهلاك في نهاية الفترة." },
  6: { tab: "t-accounts", cta: "افتح ميزان المراجعة المعدّل", explainer: "تحقّق من التوازن بعد التسويات." },
  7: { tab: "income-statement", cta: "افتح القوائم المالية", explainer: "اعرض قائمة الدخل والميزانية للفترة." },
  8: { tab: "adjusting", cta: "افتح قيود الإقفال", explainer: "أقفل حسابات الإيرادات والمصروفات في حقوق الملكية." },
  9: { tab: "t-accounts", cta: "افتح ميزان ما بعد الإقفال", explainer: "تأكد أن الحسابات المؤقتة أُقفلت وأن الدائمة فقط هي المتبقية." },
};

export default function AccountingCycleTab({ onShare, onJumpTo }: { onShare: (data: string) => void; onJumpTo?: (tab: string) => void }) {
  const { cycleSteps, setCycleSteps, auditLog } = useLabContext();

  const toggleStep = (id: number) => {
    setCycleSteps(cycleSteps.map(s => s.id === id ? { ...s, isComplete: !s.isComplete } : s));
    const step = cycleSteps.find(s => s.id === id);
    if (step) auditLog(`${step.isComplete ? "إلغاء" : "إكمال"} خطوة: ${step.name}`);
  };

  const jumpToStep = (id: number) => {
    const target = STEP_TARGET[id];
    if (!target || !onJumpTo) return;
    auditLog(`الانتقال إلى أداة الخطوة: ${cycleSteps.find(s => s.id === id)?.name || ""}`);
    onJumpTo(target.tab);
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
          const target = STEP_TARGET[step.id];
          return (
            <div key={step.id}>
              {showPhaseHeader && (
                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg mb-2 mt-3 ${colorMap[phase?.color || "blue"]}`}>
                  <span className={textMap[phase?.color || "blue"]}>{phase?.label}</span>
                </div>
              )}
              <div
                role={target && onJumpTo ? "button" : undefined}
                tabIndex={target && onJumpTo ? 0 : undefined}
                onClick={() => target && onJumpTo && jumpToStep(step.id)}
                onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && target && onJumpTo) { e.preventDefault(); jumpToStep(step.id); } }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${step.isComplete ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-400/30"}`}>
                <button onClick={e => { e.stopPropagation(); toggleStep(step.id); }} className="mt-0.5 shrink-0" aria-label={step.isComplete ? "إلغاء الإكمال" : "تعليم كمكتمل"}>
                  {step.isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/20 hover:text-white/60" />
                  )}
                </button>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{step.id}</span>
                    <span className={`text-xs font-bold ${step.isComplete ? "text-emerald-400 line-through" : "text-white"}`}>{step.name}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">{step.description}</p>
                  {target && (
                    <p className="text-[10px] text-amber-300/70 mt-1.5 leading-relaxed">↪ {target.explainer}</p>
                  )}
                </div>
                {target && onJumpTo && (
                  <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <ExternalLink className="w-3 h-3" />
                    <span className="hidden sm:inline">{target.cta}</span>
                    <span className="sm:hidden">افتح</span>
                  </div>
                )}
              </div>
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
        <h4 className="text-xs font-bold text-amber-400 mb-2">💡 كيف تستخدم هذه الصفحة؟</h4>
        <p className="text-[11px] text-white/60 leading-relaxed">
          اضغط على أي خطوة لفتح أداتها مباشرة. مثلاً «تحليل العمليات» يفتح المعادلة المحاسبية، و«القيود اليومية» يفتح دفتر القيود، و«الترحيل لدفتر الأستاذ» يفتح حسابات T، وهكذا. لتعليم الخطوة كمكتملة، اضغط الدائرة الصغيرة على يمين الخطوة فقط.
        </p>
      </div>
    </div>
  );
}
