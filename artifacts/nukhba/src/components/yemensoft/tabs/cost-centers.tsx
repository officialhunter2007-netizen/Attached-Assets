import { useState } from "react";
import { Target, Plus } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, ShareButton, ActionButton, EmptyState } from "../shared-ui";
import { formatNum } from "../utils";

export function CostCentersTab() {
  const { costCenters, setCostCenters, entries, addAudit, onShareWithTeacher } = useSimulator();
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");

  const addCenter = () => {
    if (!code.trim() || !name.trim()) return;
    if (costCenters.find(c => c.code === code)) return;
    setCostCenters(prev => [...prev, { code, name, budget: Number(budget) || 0, actual: 0 }]);
    addAudit("إضافة مركز تكلفة", "مراكز التكلفة", name);
    setCode(""); setName(""); setBudget(""); setShowAdd(false);
  };

  const totalBudget = costCenters.reduce((s, c) => s + c.budget, 0);
  const totalActual = costCenters.reduce((s, c) => s + c.actual, 0);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = `تقرير مراكز التكلفة:\n\nإجمالي الموازنة: ${formatNum(totalBudget)} ريال\nإجمالي الفعلي: ${formatNum(totalActual)} ريال\n\n`;
    for (const c of costCenters) {
      const variance = c.budget - c.actual;
      const pct = c.budget > 0 ? ((c.actual / c.budget) * 100).toFixed(1) : "0";
      text += `• ${c.code} — ${c.name}\n  الموازنة: ${formatNum(c.budget)} | الفعلي: ${formatNum(c.actual)} | الانحراف: ${formatNum(variance)} (${pct}%)\n`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Target className="w-4 h-4 text-teal-400" /> مراكز التكلفة</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && costCenters.length > 0 && <ShareButton onClick={share} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> مركز جديد</button>
        </div>
      </div>

      {costCenters.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86] mb-1">إجمالي الموازنة</div>
            <div className="text-sm font-bold text-blue-400 font-mono">{formatNum(totalBudget)}</div>
          </div>
          <div className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86] mb-1">إجمالي الفعلي</div>
            <div className="text-sm font-bold text-amber-400 font-mono">{formatNum(totalActual)}</div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="رمز المركز" value={code} onChange={setCode} placeholder="CC05" dir="ltr" />
            <SimField label="اسم المركز" value={name} onChange={setName} placeholder="مثال: التسويق" />
            <SimField label="الموازنة (ريال)" value={budget} onChange={setBudget} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addCenter} disabled={!code.trim() || !name.trim()}>إضافة</ActionButton></div>
        </div>
      )}

      {costCenters.length === 0 ? (
        <EmptyState icon={<Target className="w-10 h-10" />} title="لا توجد مراكز تكلفة" subtitle="أنشئ مراكز تكلفة لتوزيع المصروفات على الأقسام" />
      ) : (
        <div className="space-y-2">
          {costCenters.map(center => {
            const variance = center.budget - center.actual;
            const pct = center.budget > 0 ? (center.actual / center.budget) * 100 : 0;
            const isOverBudget = pct > 100;
            return (
              <div key={center.code} className="rounded-xl border border-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white">{center.name}</span>
                    <span className="text-[10px] font-mono text-[#6e6a86]">{center.code}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOverBudget ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-[11px]">
                  <div><span className="text-[#6e6a86]">الموازنة: </span><span className="text-blue-400 font-mono">{formatNum(center.budget)}</span></div>
                  <div><span className="text-[#6e6a86]">الفعلي: </span><span className="text-amber-400 font-mono">{formatNum(center.actual)}</span></div>
                  <div><span className="text-[#6e6a86]">الانحراف: </span><span className={`font-mono ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(variance)}</span></div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${isOverBudget ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
