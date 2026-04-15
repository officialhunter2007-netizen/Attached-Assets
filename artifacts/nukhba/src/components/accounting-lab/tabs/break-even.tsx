import { useState } from "react";
import { ArrowLeftRight, Calculator } from "lucide-react";

export default function BreakEvenTab({ onShare }: { onShare: (data: string) => void }) {
  const [fixedCosts, setFixedCosts] = useState("100000");
  const [pricePerUnit, setPricePerUnit] = useState("500");
  const [varCostPerUnit, setVarCostPerUnit] = useState("300");
  const [targetProfit, setTargetProfit] = useState("50000");

  const fc = parseFloat(fixedCosts) || 0;
  const sp = parseFloat(pricePerUnit) || 0;
  const vc = parseFloat(varCostPerUnit) || 0;
  const tp = parseFloat(targetProfit) || 0;

  const cm = sp - vc;
  const cmRatio = sp ? (cm / sp) * 100 : 0;
  const beUnits = cm ? Math.ceil(fc / cm) : 0;
  const beRevenue = cm ? fc / (cm / sp) : 0;
  const targetUnits = cm ? Math.ceil((fc + tp) / cm) : 0;
  const targetRevenue = cm ? (fc + tp) / (cm / sp) : 0;
  const mosUnits = targetUnits - beUnits;
  const mosPercent = targetUnits ? (mosUnits / targetUnits) * 100 : 0;

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const chartHeight = 200;
  const maxUnits = Math.max(beUnits * 2, targetUnits * 1.5, 100);
  const maxAmount = Math.max(beRevenue * 1.5, sp * maxUnits);

  const toX = (units: number) => (units / maxUnits) * 100;
  const toY = (amount: number) => chartHeight - (amount / maxAmount) * chartHeight;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-400" />
          تحليل التعادل (CVP)
        </h3>
        <button onClick={() => {
          onShare(`📊 تحليل التعادل:\nالتكاليف الثابتة: ${fmt(fc)}\nسعر البيع: ${fmt(sp)} | التكلفة المتغيرة: ${fmt(vc)}\nهامش المساهمة: ${fmt(cm)} (${cmRatio.toFixed(1)}%)\n\nنقطة التعادل: ${fmt(beUnits)} وحدة = ${fmt(beRevenue)} ريال\nالربح المستهدف ${fmt(tp)}: ${fmt(targetUnits)} وحدة = ${fmt(targetRevenue)} ريال\nهامش الأمان: ${fmt(mosUnits)} وحدة (${mosPercent.toFixed(1)}%)`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] text-white/50 mb-1 font-bold">التكاليف الثابتة</label>
          <input type="number" value={fixedCosts} onChange={e => setFixedCosts(e.target.value)} className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50 text-center" />
        </div>
        <div>
          <label className="block text-[10px] text-white/50 mb-1 font-bold">سعر البيع/وحدة</label>
          <input type="number" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50 text-center" />
        </div>
        <div>
          <label className="block text-[10px] text-white/50 mb-1 font-bold">ت. متغيرة/وحدة</label>
          <input type="number" value={varCostPerUnit} onChange={e => setVarCostPerUnit(e.target.value)} className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50 text-center" />
        </div>
        <div>
          <label className="block text-[10px] text-white/50 mb-1 font-bold">الربح المستهدف</label>
          <input type="number" value={targetProfit} onChange={e => setTargetProfit(e.target.value)} className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50 text-center" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-[9px] text-amber-300 mb-1">هامش المساهمة/وحدة</p>
          <p className="text-sm font-bold text-amber-400 font-mono">{fmt(cm)}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{cmRatio.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[9px] text-emerald-300 mb-1">نقطة التعادل (وحدات)</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">{fmt(beUnits)}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{fmt(beRevenue)} ريال</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center col-span-2 sm:col-span-1">
          <p className="text-[9px] text-blue-300 mb-1">وحدات الربح المستهدف</p>
          <p className="text-sm font-bold text-blue-400 font-mono">{fmt(targetUnits)}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{fmt(targetRevenue)} ريال</p>
        </div>
      </div>

      {cm > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <h4 className="text-xs font-bold text-white/60 mb-3">رسم بياني للتعادل</h4>
          <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full" style={{ maxHeight: "250px" }}>
            <line x1="0" y1={chartHeight} x2="100" y2={chartHeight} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
            <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />

            <line x1="0" y1={toY(fc)} x2="100" y2={toY(fc + vc * maxUnits)} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,1" />
            <text x="92" y={toY(fc + vc * maxUnits) - 3} fill="#ef4444" fontSize="3.5">ت. كلية</text>

            <line x1="0" y1={chartHeight} x2="100" y2={toY(sp * maxUnits)} stroke="#22c55e" strokeWidth="0.5" />
            <text x="92" y={toY(sp * maxUnits) - 3} fill="#22c55e" fontSize="3.5">إيرادات</text>

            <line x1="0" y1={toY(fc)} x2="100" y2={toY(fc)} stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" />
            <text x="2" y={toY(fc) - 2} fill="#f59e0b" fontSize="3">ت. ثابتة</text>

            <circle cx={toX(beUnits)} cy={toY(beRevenue)} r="1.5" fill="#f59e0b" />
            <line x1={toX(beUnits)} y1={toY(beRevenue)} x2={toX(beUnits)} y2={chartHeight} stroke="#f59e0b" strokeWidth="0.3" strokeDasharray="1,1" />
            <text x={toX(beUnits) - 5} y={toY(beRevenue) - 4} fill="#f59e0b" fontSize="3">نقطة التعادل</text>

            <rect x={toX(beUnits)} y={toY(sp * maxUnits * 0.3)} width={toX(targetUnits) - toX(beUnits)} height={chartHeight - toY(sp * maxUnits * 0.3)} fill="rgba(34,197,94,0.05)" />
            <rect x="0" y={toY(sp * maxUnits * 0.3)} width={toX(beUnits)} height={chartHeight - toY(sp * maxUnits * 0.3)} fill="rgba(239,68,68,0.05)" />
          </svg>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-emerald-500 rounded" /><span className="text-[9px] text-white/40">الإيرادات</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-red-500 rounded" style={{ borderStyle: "dashed" }} /><span className="text-[9px] text-white/40">التكاليف الكلية</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] text-white/40">نقطة التعادل</span></div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
        <h4 className="text-xs font-bold text-purple-400 mb-2">هامش الأمان</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-white/50">بالوحدات</p>
            <p className="text-sm font-bold text-purple-400 font-mono">{fmt(mosUnits)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/50">كنسبة مئوية</p>
            <p className="text-sm font-bold text-purple-400 font-mono">{mosPercent.toFixed(1)}%</p>
          </div>
        </div>
        <p className="text-[10px] text-white/40 mt-2">
          هامش الأمان = عدد الوحدات فوق نقطة التعادل. كلما زاد، كانت المنشأة أكثر أماناً من الخسارة.
        </p>
      </div>
    </div>
  );
}
