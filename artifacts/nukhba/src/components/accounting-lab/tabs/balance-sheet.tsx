import { useLabContext } from "../context";
import { ArrowLeftRight } from "lucide-react";

export default function BalanceSheetTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, getAccountBalance } = useLabContext();

  const assets = tAccounts.filter(a => a.type === "asset").map(a => ({ name: a.name, code: a.code, amount: getAccountBalance(a.code) })).filter(a => a.amount !== 0);
  const liabilities = tAccounts.filter(a => a.type === "liability").map(a => ({ name: a.name, code: a.code, amount: getAccountBalance(a.code) })).filter(a => a.amount !== 0);
  const equity = tAccounts.filter(a => a.type === "equity").map(a => ({ name: a.name, code: a.code, amount: getAccountBalance(a.code) })).filter(a => a.amount !== 0);

  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);
  const totalEquity = equity.reduce((s, e) => s + e.amount, 0);
  const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const Section = ({ title, items, total, color }: { title: string; items: { name: string; amount: number }[]; total: number; color: string }) => (
    <div className="space-y-1">
      <h4 className={`text-xs font-bold ${color} mb-2`}>{title}</h4>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center py-1 pr-4">
          <span className="text-xs text-white/60">{item.name}</span>
          <span className="text-xs font-mono text-white/80">{fmt(item.amount)}</span>
        </div>
      ))}
      {items.length === 0 && <p className="text-[10px] text-white/20 text-center py-2">لا توجد أرصدة</p>}
      <div className="flex justify-between items-center py-1.5 border-t border-white/10 mt-1">
        <span className="text-xs font-bold text-white">{title}</span>
        <span className={`text-xs font-bold font-mono ${color}`}>{fmt(total)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">📋 الميزانية العمومية</h3>
        <button onClick={() => {
          onShare(`📋 الميزانية العمومية:\nالأصول: ${fmt(totalAssets)}\nالخصوم: ${fmt(totalLiabilities)}\nحقوق الملكية: ${fmt(totalEquity)}\nمتوازنة: ${isBalanced ? "✅" : "❌"}\n\nالأصول:\n${assets.map(a => `  ${a.name}: ${fmt(a.amount)}`).join("\n")}\n\nالخصوم:\n${liabilities.map(l => `  ${l.name}: ${fmt(l.amount)}`).join("\n")}\n\nحقوق الملكية:\n${equity.map(e => `  ${e.name}: ${fmt(e.amount)}`).join("\n")}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className={`rounded-xl border-2 ${isBalanced ? "border-emerald-500/20" : "border-red-500/20"} bg-white/[0.02] overflow-hidden`}>
        <div className="bg-gradient-to-l from-blue-500/10 to-purple-500/10 px-4 py-3 border-b border-white/10">
          <h4 className="text-xs font-bold text-white text-center">الميزانية العمومية (قائمة المركز المالي)</h4>
          <p className="text-[10px] text-white/40 text-center mt-0.5">كما في {new Date().toLocaleDateString("ar-YE")}</p>
          <div className="text-center mt-2">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${isBalanced ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {isBalanced ? "✅ متوازنة" : "❌ غير متوازنة"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-white/10">
          <div className="p-3 sm:p-4">
            <Section title="الأصول" items={assets} total={totalAssets} color="text-blue-400" />
          </div>
          <div className="p-3 sm:p-4 space-y-4">
            <Section title="الخصوم" items={liabilities} total={totalLiabilities} color="text-red-400" />
            <div className="border-t border-white/10 pt-3">
              <Section title="حقوق الملكية" items={equity} total={totalEquity} color="text-purple-400" />
            </div>
            <div className="border-t-2 border-white/20 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">الخصوم + حقوق الملكية</span>
                <span className={`text-xs font-bold font-mono ${isBalanced ? "text-emerald-400" : "text-red-400"}`}>{fmt(totalLiabilities + totalEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
