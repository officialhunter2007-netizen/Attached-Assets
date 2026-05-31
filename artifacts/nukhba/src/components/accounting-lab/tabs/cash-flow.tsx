import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import type { CashFlowItem } from "../types";

export default function CashFlowTab({ onShare }: { onShare: (data: string) => void }) {
  const { auditLog } = useLabContext();
  const [items, setItems] = useState<CashFlowItem[]>([
    { label: "صافي الدخل", amount: 0, category: "operating" },
    { label: "الاستهلاك", amount: 0, category: "operating" },
    { label: "التغير في المدينين", amount: 0, category: "operating" },
    { label: "التغير في المخزون", amount: 0, category: "operating" },
    { label: "التغير في الدائنين", amount: 0, category: "operating" },
    { label: "شراء معدات", amount: 0, category: "investing" },
    { label: "بيع أصول ثابتة", amount: 0, category: "investing" },
    { label: "قروض جديدة", amount: 0, category: "financing" },
    { label: "سداد قروض", amount: 0, category: "financing" },
    { label: "توزيعات أرباح", amount: 0, category: "financing" },
  ]);

  const [newLabel, setNewLabel] = useState("");
  const [newCat, setNewCat] = useState<"operating" | "investing" | "financing">("operating");

  const operating = items.filter(i => i.category === "operating");
  const investing = items.filter(i => i.category === "investing");
  const financing = items.filter(i => i.category === "financing");

  const totalOp = operating.reduce((s, i) => s + i.amount, 0);
  const totalInv = investing.reduce((s, i) => s + i.amount, 0);
  const totalFin = financing.reduce((s, i) => s + i.amount, 0);
  const netChange = totalOp + totalInv + totalFin;

  const updateAmount = (idx: number, amount: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, amount } : item));
  };

  const addItem = () => {
    if (!newLabel.trim()) return;
    setItems(prev => [...prev, { label: newLabel.trim(), amount: 0, category: newCat }]);
    auditLog(`إضافة بند تدفق نقدي: ${newLabel}`);
    setNewLabel("");
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const catLabels = { operating: "الأنشطة التشغيلية", investing: "الأنشطة الاستثمارية", financing: "الأنشطة التمويلية" };
  const catColors = { operating: "text-blue-400 border-blue-500/20", investing: "text-emerald-400 border-emerald-500/20", financing: "text-purple-400 border-purple-500/20" };

  const renderSection = (category: "operating" | "investing" | "financing", sectionItems: CashFlowItem[], total: number) => (
    <div className="space-y-2">
      <h4 className={`text-xs font-bold ${catColors[category].split(" ")[0]}`}>{catLabels[category]}</h4>
      {sectionItems.map((item, i) => {
        const globalIdx = items.indexOf(item);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-white/60 flex-1 pr-3">{item.label}</span>
            <input type="number" value={item.amount || ""} onChange={e => updateAmount(globalIdx, parseFloat(e.target.value) || 0)}
              className="w-24 bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-amber-400/50" />
            <button onClick={() => removeItem(globalIdx)} className="text-white/20 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <div className={`flex justify-between items-center py-1.5 border-t ${catColors[category].split(" ")[1]} mt-1`}>
        <span className="text-xs font-bold text-white">صافي التدفقات</span>
        <span className={`text-xs font-bold font-mono ${total >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(total)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">💰 قائمة التدفقات النقدية</h3>
        <button onClick={() => {
          onShare(`💰 قائمة التدفقات النقدية:\nتشغيلية: ${fmt(totalOp)}\nاستثمارية: ${fmt(totalInv)}\nتمويلية: ${fmt(totalFin)}\nصافي التغير: ${fmt(netChange)}\n\n${items.filter(i => i.amount !== 0).map(i => `  ${i.label}: ${fmt(i.amount)}`).join("\n")}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="bg-gradient-to-l from-blue-500/10 to-emerald-500/10 px-4 py-3 border-b border-white/10">
          <h4 className="text-xs font-bold text-white text-center">قائمة التدفقات النقدية (الطريقة غير المباشرة)</h4>
          <p className="text-[10px] text-white/40 text-center mt-0.5">للفترة المنتهية في {new Date().toLocaleDateString("ar-YE")}</p>
        </div>

        <div className="p-3 sm:p-4 space-y-4">
          {renderSection("operating", operating, totalOp)}
          {renderSection("investing", investing, totalInv)}
          {renderSection("financing", financing, totalFin)}

          <div className="border-t-2 border-white/20 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">صافي التغير في النقدية</span>
              <span className={`text-sm font-bold font-mono ${netChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(netChange)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">إضافة بند جديد</h4>
        <div className="flex gap-2">
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="اسم البند" className="flex-1 bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <select value={newCat} onChange={e => setNewCat(e.target.value as any)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
            <option value="operating">تشغيلي</option>
            <option value="investing">استثماري</option>
            <option value="financing">تمويلي</option>
          </select>
          <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
