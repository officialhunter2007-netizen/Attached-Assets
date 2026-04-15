import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";

export default function DepreciationTab({ onShare }: { onShare: (data: string) => void }) {
  const { depAssets, setDepAssets, auditLog } = useLabContext();
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newSalvage, setNewSalvage] = useState("");
  const [newLife, setNewLife] = useState("");
  const [newMethod, setNewMethod] = useState<"straight-line" | "declining" | "units">("straight-line");
  const [selectedId, setSelectedId] = useState<number | null>(depAssets[0]?.id || null);

  const addAsset = () => {
    if (!newName.trim() || !newCost || !newLife) return;
    const asset = {
      id: Date.now(),
      name: newName.trim(),
      cost: parseFloat(newCost),
      salvageValue: parseFloat(newSalvage) || 0,
      usefulLife: parseInt(newLife),
      method: newMethod,
    };
    setDepAssets(prev => [...prev, asset]);
    auditLog(`إضافة أصل للإهلاك: ${newName}`);
    setNewName(""); setNewCost(""); setNewSalvage(""); setNewLife("");
  };

  const selected = depAssets.find(a => a.id === selectedId);

  const calculateSchedule = (asset: typeof depAssets[0]) => {
    const { cost, salvageValue, usefulLife, method } = asset;
    const depreciable = cost - salvageValue;
    const schedule: { year: number; expense: number; accumulated: number; bookValue: number }[] = [];
    let accumulated = 0;

    for (let y = 1; y <= usefulLife; y++) {
      let expense = 0;
      if (method === "straight-line") {
        expense = depreciable / usefulLife;
      } else if (method === "declining") {
        const rate = (2 / usefulLife);
        const bookVal = cost - accumulated;
        expense = Math.max(bookVal * rate, 0);
        if (cost - accumulated - expense < salvageValue) {
          expense = cost - accumulated - salvageValue;
        }
      } else {
        expense = depreciable / usefulLife;
      }
      expense = Math.max(expense, 0);
      if (accumulated + expense > depreciable) expense = depreciable - accumulated;
      accumulated += expense;
      schedule.push({ year: y, expense: Math.round(expense), accumulated: Math.round(accumulated), bookValue: Math.round(cost - accumulated) });
    }
    return schedule;
  };

  const schedule = selected ? calculateSchedule(selected) : [];
  const fmt = (n: number) => n.toLocaleString("ar-YE");
  const methodLabels = { "straight-line": "القسط الثابت", declining: "القسط المتناقص", units: "وحدات الإنتاج" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">🏗️ حاسبة الإهلاك</h3>
        <button onClick={() => {
          if (!selected) return;
          const s = calculateSchedule(selected);
          const txt = s.map(r => `السنة ${r.year}: مصروف ${fmt(r.expense)} | مجمع ${fmt(r.accumulated)} | قيمة دفترية ${fmt(r.bookValue)}`).join("\n");
          onShare(`🏗️ جدول إهلاك: ${selected.name}\nالتكلفة: ${fmt(selected.cost)} | القيمة التخريدية: ${fmt(selected.salvageValue)}\nالعمر: ${selected.usefulLife} سنة | الطريقة: ${methodLabels[selected.method]}\n\n${txt}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {depAssets.map(a => (
          <button key={a.id} onClick={() => setSelectedId(a.id)}
            className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${selectedId === a.id ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/50 border border-white/10 hover:text-white/80"}`}>
            {a.name}
            <button onClick={e => { e.stopPropagation(); setDepAssets(prev => prev.filter(x => x.id !== a.id)); if (selectedId === a.id) setSelectedId(null); }}
              className="text-white/20 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <p className="text-[9px] text-blue-300 mb-1">التكلفة</p>
              <p className="text-sm font-bold text-blue-400 font-mono">{fmt(selected.cost)}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-[9px] text-red-300 mb-1">القيمة التخريدية</p>
              <p className="text-sm font-bold text-red-400 font-mono">{fmt(selected.salvageValue)}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[9px] text-emerald-300 mb-1">القابل للإهلاك</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">{fmt(selected.cost - selected.salvageValue)}</p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
              <p className="text-[9px] text-purple-300 mb-1">الطريقة</p>
              <p className="text-xs font-bold text-purple-400">{methodLabels[selected.method]}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="bg-white/[0.03] px-3 py-2 grid grid-cols-4 gap-2 text-[10px] font-bold text-white/50 border-b border-white/10">
              <span>السنة</span><span className="text-center">مصروف الإهلاك</span><span className="text-center">مجمع الإهلاك</span><span className="text-center">القيمة الدفترية</span>
            </div>
            {schedule.map(row => (
              <div key={row.year} className="px-3 py-2 grid grid-cols-4 gap-2 text-[11px] border-b border-white/5 hover:bg-white/[0.02]">
                <span className="text-white/60">{row.year}</span>
                <span className="text-center text-orange-400 font-mono">{fmt(row.expense)}</span>
                <span className="text-center text-red-400 font-mono">{fmt(row.accumulated)}</span>
                <span className="text-center text-emerald-400 font-mono">{fmt(row.bookValue)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <h4 className="text-xs font-bold text-white/60 mb-2">رسم بياني للإهلاك</h4>
            <svg viewBox="0 0 100 60" className="w-full" style={{ maxHeight: "180px" }}>
              {schedule.map((row, i) => {
                const w = 80 / schedule.length;
                const x = 10 + i * w;
                const bvH = (row.bookValue / selected.cost) * 50;
                const accH = (row.accumulated / selected.cost) * 50;
                return (
                  <g key={i}>
                    <rect x={x + 1} y={55 - bvH} width={w * 0.4 - 1} height={bvH} fill="rgba(34,197,94,0.4)" rx="0.5" />
                    <rect x={x + w * 0.4 + 1} y={55 - accH} width={w * 0.4 - 1} height={accH} fill="rgba(239,68,68,0.4)" rx="0.5" />
                    <text x={x + w * 0.4} y="59" fill="rgba(255,255,255,0.3)" fontSize="2.5" textAnchor="middle">{row.year}</text>
                  </g>
                );
              })}
              <line x1="10" y1="55" x2="90" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
            </svg>
            <div className="flex justify-center gap-4 mt-1">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" /><span className="text-[9px] text-white/40">قيمة دفترية</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/40" /><span className="text-[9px] text-white/40">مجمع الإهلاك</span></div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">إضافة أصل جديد</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم الأصل" className="sm:col-span-2 bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <select value={newMethod} onChange={e => setNewMethod(e.target.value as any)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
            <option value="straight-line">قسط ثابت</option>
            <option value="declining">قسط متناقص</option>
            <option value="units">وحدات إنتاج</option>
          </select>
          <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="التكلفة" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <input type="number" value={newSalvage} onChange={e => setNewSalvage(e.target.value)} placeholder="القيمة التخريدية" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <input type="number" value={newLife} onChange={e => setNewLife(e.target.value)} placeholder="العمر (سنوات)" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
        </div>
        <button onClick={addAsset} className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> إضافة الأصل
        </button>
      </div>
    </div>
  );
}
