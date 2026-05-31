import { useLabContext } from "../context";
import { ArrowLeftRight } from "lucide-react";

export default function IncomeStatementTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, getAccountBalance } = useLabContext();

  const revenues = tAccounts.filter(a => a.type === "revenue").map(a => ({ name: a.name, code: a.code, amount: getAccountBalance(a.code) })).filter(a => a.amount !== 0);
  const expenses = tAccounts.filter(a => a.type === "expense").map(a => ({ name: a.name, code: a.code, amount: getAccountBalance(a.code) })).filter(a => a.amount !== 0);

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const cogsItem = expenses.find(e => e.code === "501");
  const cogs = cogsItem?.amount || 0;
  const grossProfit = totalRevenue - cogs;
  const operatingExpenses = expenses.filter(e => e.code !== "501");
  const totalOpExp = operatingExpenses.reduce((s, e) => s + e.amount, 0);
  const netIncome = grossProfit - totalOpExp;

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const lines: { label: string; amount: number; isTotal?: boolean; isBold?: boolean; indent?: boolean }[] = [
    ...revenues.map(r => ({ label: r.name, amount: r.amount, indent: true })),
    { label: "إجمالي الإيرادات", amount: totalRevenue, isTotal: true, isBold: true },
    { label: "تكلفة البضاعة المباعة", amount: -cogs, indent: true },
    { label: "مجمل الربح", amount: grossProfit, isTotal: true, isBold: true },
    ...operatingExpenses.map(e => ({ label: e.name, amount: -e.amount, indent: true })),
    { label: "إجمالي المصروفات التشغيلية", amount: -totalOpExp, isTotal: true },
    { label: netIncome >= 0 ? "صافي الربح" : "صافي الخسارة", amount: netIncome, isTotal: true, isBold: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">📊 قائمة الدخل</h3>
        <button onClick={() => {
          const txt = lines.map(l => `${l.isBold ? "**" : ""}${l.indent ? "  " : ""}${l.label}: ${fmt(l.amount)}${l.isBold ? "**" : ""}`).join("\n");
          onShare(`📊 قائمة الدخل:\n${txt}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="bg-gradient-to-l from-amber-500/10 to-amber-600/10 px-4 py-3 border-b border-white/10">
          <h4 className="text-xs font-bold text-amber-400 text-center">قائمة الدخل</h4>
          <p className="text-[10px] text-white/40 text-center mt-0.5">للفترة المنتهية في {new Date().toLocaleDateString("ar-YE")}</p>
        </div>

        <div className="p-3 sm:p-4 space-y-1">
          {totalRevenue === 0 && totalOpExp === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/30 text-xs">لا توجد إيرادات أو مصروفات مسجلة</p>
              <p className="text-[10px] text-white/20 mt-1">سجّل قيود يومية أولاً ثم رحّلها لتظهر هنا</p>
            </div>
          ) : (
            <>
              <div className="text-xs font-bold text-emerald-400 mb-2">الإيرادات</div>
              {lines.map((l, i) => {
                if (l.label === "مجمل الربح") return (
                  <div key={i}>
                    <div className="border-t border-white/10 my-2" />
                    <div className="text-xs font-bold text-white/40 mb-2">المصروفات التشغيلية</div>
                  </div>
                );
                return (
                  <div key={i} className={`flex justify-between items-center py-1 ${l.isTotal ? "border-t border-white/10 pt-2 mt-1" : ""}`}>
                    <span className={`text-xs ${l.isBold ? "font-bold text-white" : "text-white/60"} ${l.indent ? "pr-4" : ""}`}>{l.label}</span>
                    <span className={`text-xs font-mono ${l.isBold ? "font-bold" : ""} ${l.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {l.amount < 0 ? `(${fmt(Math.abs(l.amount))})` : fmt(l.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t-2 border-white/20 mt-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span>
                  <span className={`text-sm font-bold font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmt(Math.abs(netIncome))} {netIncome < 0 ? "خسارة" : ""}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <h4 className="text-xs font-bold text-amber-400 mb-1">💡 ملاحظة</h4>
        <p className="text-[11px] text-white/50 leading-relaxed">
          قائمة الدخل تُعد تلقائياً من الحسابات المرحّلة. سجّل قيود مبيعات ومصروفات ثم رحّلها من تبويب "القيود اليومية" لتظهر النتائج هنا.
        </p>
      </div>
    </div>
  );
}
