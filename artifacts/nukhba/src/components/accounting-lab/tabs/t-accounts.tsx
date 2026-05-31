import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, Plus, Eye, EyeOff } from "lucide-react";

export default function TAccountsTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, setTAccounts, auditLog, getAccountBalance } = useLabContext();
  const [filter, setFilter] = useState<"all" | "asset" | "liability" | "equity" | "revenue" | "expense">("all");
  const [showEmpty, setShowEmpty] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"asset" | "liability" | "equity" | "revenue" | "expense">("asset");

  const typeLabels: Record<string, string> = { asset: "أصول", liability: "خصوم", equity: "حقوق ملكية", revenue: "إيرادات", expense: "مصروفات" };
  const typeColors: Record<string, string> = { asset: "text-blue-400 border-blue-500/20 bg-blue-500/5", liability: "text-red-400 border-red-500/20 bg-red-500/5", equity: "text-purple-400 border-purple-500/20 bg-purple-500/5", revenue: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", expense: "text-orange-400 border-orange-500/20 bg-orange-500/5" };

  const filtered = tAccounts.filter(a => {
    if (filter !== "all" && a.type !== filter) return false;
    if (!showEmpty && a.debits.length === 0 && a.credits.length === 0) return false;
    return true;
  });

  const addAccount = () => {
    if (!newCode.trim() || !newName.trim()) return;
    if (tAccounts.find(a => a.code === newCode.trim())) return;
    setTAccounts([...tAccounts, { code: newCode.trim(), name: newName.trim(), type: newType, debits: [], credits: [] }]);
    auditLog(`إضافة حساب T جديد: ${newCode} - ${newName}`);
    setNewCode(""); setNewName("");
  };

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white">📊 حسابات T</h3>
        <button onClick={() => {
          const data = filtered.map(a => {
            const bal = getAccountBalance(a.code);
            return `${a.code} ${a.name} (${typeLabels[a.type]}): رصيد ${fmt(bal)}`;
          }).join("\n");
          onShare(`📊 حسابات T:\n${data}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك مع المعلم
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "asset", "liability", "equity", "revenue", "expense"] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${filter === t ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/50 border border-white/10 hover:text-white/80"}`}>
            {t === "all" ? "الكل" : typeLabels[t]}
          </button>
        ))}
        <button onClick={() => setShowEmpty(!showEmpty)} className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${showEmpty ? "bg-white/10 text-white/80" : "bg-white/5 text-white/40"} border border-white/10`}>
          {showEmpty ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showEmpty ? "إخفاء الفارغة" : "إظهار الفارغة"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(acc => {
          const totalD = acc.debits.reduce((s, d) => s + d.amount, 0);
          const totalC = acc.credits.reduce((s, c) => s + c.amount, 0);
          const bal = getAccountBalance(acc.code);
          return (
            <div key={acc.code} className={`rounded-xl border ${typeColors[acc.type]} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/60">{acc.code}</span>
                  <span className="text-xs font-bold text-white">{acc.name}</span>
                </div>
                <span className={`text-[10px] font-bold ${typeColors[acc.type].split(" ")[0]}`}>{typeLabels[acc.type]}</span>
              </div>
              <div className="grid grid-cols-2 gap-0 border border-white/10 rounded-lg overflow-hidden">
                <div className="border-l border-white/10 p-2">
                  <p className="text-[9px] text-center font-bold text-white/50 mb-1.5 border-b border-white/10 pb-1">مدين</p>
                  {acc.debits.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] py-0.5">
                      <span className="text-white/60 truncate max-w-[60%]">{d.desc}</span>
                      <span className="text-white font-mono">{fmt(d.amount)}</span>
                    </div>
                  ))}
                  {acc.debits.length === 0 && <p className="text-[10px] text-white/20 text-center">—</p>}
                  <div className="border-t border-white/10 mt-1 pt-1 text-[10px] font-bold text-white/80 text-left font-mono">{fmt(totalD)}</div>
                </div>
                <div className="p-2">
                  <p className="text-[9px] text-center font-bold text-white/50 mb-1.5 border-b border-white/10 pb-1">دائن</p>
                  {acc.credits.map((c, i) => (
                    <div key={i} className="flex justify-between text-[10px] py-0.5">
                      <span className="text-white/60 truncate max-w-[60%]">{c.desc}</span>
                      <span className="text-white font-mono">{fmt(c.amount)}</span>
                    </div>
                  ))}
                  {acc.credits.length === 0 && <p className="text-[10px] text-white/20 text-center">—</p>}
                  <div className="border-t border-white/10 mt-1 pt-1 text-[10px] font-bold text-white/80 text-left font-mono">{fmt(totalC)}</div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-white/50">الرصيد: </span>
                <span className={`text-xs font-bold font-mono ${bal >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(Math.abs(bal))} {bal < 0 ? "(دائن)" : "(مدين)"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">إضافة حساب جديد</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="الرقم" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم الحساب" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <select value={newType} onChange={e => setNewType(e.target.value as any)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={addAccount} className="flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
