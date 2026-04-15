import { useState } from "react";
import { useLabContext } from "../context";
import { Plus, Trash2, Scale, ArrowLeftRight } from "lucide-react";

export default function EquationTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, getAccountBalance, auditLog } = useLabContext();
  const [transactions, setTransactions] = useState<{ id: number; desc: string; assets: number; liabilities: number; equity: number }[]>([]);
  const [desc, setDesc] = useState("");
  const [assetChange, setAssetChange] = useState("");
  const [liabChange, setLiabChange] = useState("");
  const [equityChange, setEquityChange] = useState("");

  const totalAssets = tAccounts.filter(a => a.type === "asset").reduce((s, a) => {
    const d = a.debits.reduce((x, y) => x + y.amount, 0);
    const c = a.credits.reduce((x, y) => x + y.amount, 0);
    return s + d - c;
  }, 0);
  const totalLiabilities = tAccounts.filter(a => a.type === "liability").reduce((s, a) => {
    const d = a.debits.reduce((x, y) => x + y.amount, 0);
    const c = a.credits.reduce((x, y) => x + y.amount, 0);
    return s + c - d;
  }, 0);
  const totalEquity = tAccounts.filter(a => a.type === "equity").reduce((s, a) => {
    const d = a.debits.reduce((x, y) => x + y.amount, 0);
    const c = a.credits.reduce((x, y) => x + y.amount, 0);
    return s + c - d;
  }, 0);

  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
  const simAssets = transactions.reduce((s, t) => s + t.assets, 0);
  const simLiab = transactions.reduce((s, t) => s + t.liabilities, 0);
  const simEquity = transactions.reduce((s, t) => s + t.equity, 0);
  const simBalanced = Math.abs(simAssets - (simLiab + simEquity)) < 0.01 || transactions.length === 0;

  const addTransaction = () => {
    const a = parseFloat(assetChange) || 0;
    const l = parseFloat(liabChange) || 0;
    const e = parseFloat(equityChange) || 0;
    if (!desc.trim() || (a === 0 && l === 0 && e === 0)) return;
    setTransactions(prev => [...prev, { id: Date.now(), desc: desc.trim(), assets: a, liabilities: l, equity: e }]);
    auditLog(`إضافة عملية للمعادلة: ${desc}`);
    setDesc(""); setAssetChange(""); setLiabChange(""); setEquityChange("");
  };

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-400" />
          المعادلة المحاسبية
        </h3>
        <button onClick={() => onShare(`📊 المعادلة المحاسبية:\nالأصول: ${fmt(totalAssets)} | الخصوم: ${fmt(totalLiabilities)} | حقوق الملكية: ${fmt(totalEquity)}\nمتوازنة: ${isBalanced ? "نعم ✅" : "لا ❌"}\n\nالعمليات التجريبية:\n${transactions.map(t => `• ${t.desc}: أصول ${fmt(t.assets)} | خصوم ${fmt(t.liabilities)} | ملكية ${fmt(t.equity)}`).join("\n")}`)}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك مع المعلم
        </button>
      </div>

      <div className={`rounded-2xl border-2 ${isBalanced ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"} p-4 sm:p-6`}>
        <div className="text-center mb-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isBalanced ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {isBalanced ? "✅ المعادلة متوازنة" : "❌ المعادلة غير متوازنة"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
          <div className="text-center p-3 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-[10px] text-blue-300 mb-1 font-bold">الأصول</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-400 font-mono">{fmt(totalAssets)}</p>
          </div>
          <div className="text-center text-xl sm:text-2xl font-bold text-white/40 hidden sm:block">=</div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-red-300 mb-1 font-bold">الخصوم</p>
            <p className="text-lg sm:text-2xl font-bold text-red-400 font-mono">{fmt(totalLiabilities)}</p>
          </div>
          <div className="text-center text-xl sm:text-2xl font-bold text-white/40 hidden sm:block">+</div>
          <div className="text-center p-3 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-[10px] text-purple-300 mb-1 font-bold">حقوق الملكية</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-400 font-mono">{fmt(totalEquity)}</p>
          </div>
        </div>
        <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden flex">
          {totalAssets > 0 && <>
            <div className="bg-blue-500/60 h-full transition-all" style={{ width: `${(totalAssets / (totalAssets + totalLiabilities + totalEquity)) * 100}%` }} />
            <div className="bg-red-500/60 h-full transition-all" style={{ width: `${(totalLiabilities / (totalAssets + totalLiabilities + totalEquity)) * 100}%` }} />
            <div className="bg-purple-500/60 h-full transition-all" style={{ width: `${(totalEquity / (totalAssets + totalLiabilities + totalEquity)) * 100}%` }} />
          </>}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 space-y-3">
        <h4 className="text-xs font-bold text-amber-400">🧪 تجربة تأثير العمليات على المعادلة</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف العملية (مثال: شراء بضاعة نقداً)" className="sm:col-span-2 bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div>
              <label className="block text-[10px] text-blue-300 mb-1">تغيير الأصول</label>
              <input type="number" value={assetChange} onChange={e => setAssetChange(e.target.value)} placeholder="0" className="w-full bg-[#1e1e2e] border border-blue-500/20 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-blue-400/50 text-center" />
            </div>
            <div>
              <label className="block text-[10px] text-red-300 mb-1">تغيير الخصوم</label>
              <input type="number" value={liabChange} onChange={e => setLiabChange(e.target.value)} placeholder="0" className="w-full bg-[#1e1e2e] border border-red-500/20 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-red-400/50 text-center" />
            </div>
            <div>
              <label className="block text-[10px] text-purple-300 mb-1">تغيير الملكية</label>
              <input type="number" value={equityChange} onChange={e => setEquityChange(e.target.value)} placeholder="0" className="w-full bg-[#1e1e2e] border border-purple-500/20 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-purple-400/50 text-center" />
            </div>
          </div>
        </div>
        <button onClick={addTransaction} className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> إضافة العملية
        </button>

        {transactions.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60">العمليات التجريبية</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${simBalanced ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {simBalanced ? "متوازنة ✅" : "غير متوازنة ❌"}
              </span>
            </div>
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2 text-[11px]">
                <span className="text-white/80">{t.desc}</span>
                <div className="flex items-center gap-3">
                  <span className="text-blue-400">{fmt(t.assets)}</span>
                  <span className="text-red-400">{fmt(t.liabilities)}</span>
                  <span className="text-purple-400">{fmt(t.equity)}</span>
                  <button onClick={() => setTransactions(prev => prev.filter(x => x.id !== t.id))} className="text-white/30 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between bg-white/[0.05] rounded-lg px-3 py-2 text-[11px] font-bold border border-white/10">
              <span className="text-white">الإجمالي</span>
              <div className="flex items-center gap-3">
                <span className="text-blue-400">{fmt(simAssets)}</span>
                <span className="text-red-400">{fmt(simLiab)}</span>
                <span className="text-purple-400">{fmt(simEquity)}</span>
                <div className="w-3" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
