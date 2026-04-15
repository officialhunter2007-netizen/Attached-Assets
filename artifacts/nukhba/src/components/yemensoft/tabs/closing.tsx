import { useState, useMemo } from "react";
import { Lock, AlertTriangle, Check, RotateCcw } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum, todayStr } from "../utils";

type ClosingPeriod = { id: number; year: number; month: number; date: string; netIncome: number; status: "open" | "closed" };

export function ClosingTab() {
  const { accounts, setAccounts, addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [closingPeriods, setClosingPeriods] = useState<ClosingPeriod[]>([]);
  const [closingYear, setClosingYear] = useState(String(new Date().getFullYear()));
  const [closingMonth, setClosingMonth] = useState(String(new Date().getMonth() + 1));

  const data = useMemo(() => {
    const revenueAccounts = accounts.filter(a => a.type === "revenue" && a.parent && a.balance !== 0);
    const expenseAccounts = accounts.filter(a => a.type === "expense" && a.parent && a.balance !== 0);
    const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
    const totalExpense = expenseAccounts.reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpense;
    return { revenueAccounts, expenseAccounts, totalRevenue, totalExpense, netIncome };
  }, [accounts]);

  const performClosing = () => {
    const year = Number(closingYear); const month = Number(closingMonth);
    if (closingPeriods.find(p => p.year === year && p.month === month && p.status === "closed")) return;

    const closingLines = [];

    for (const acc of data.revenueAccounts) {
      if (acc.balance > 0) closingLines.push({ accountCode: acc.code, debit: acc.balance, credit: 0, description: `إقفال ${acc.name}` });
    }
    for (const acc of data.expenseAccounts) {
      if (acc.balance > 0) closingLines.push({ accountCode: acc.code, debit: 0, credit: acc.balance, description: `إقفال ${acc.name}` });
    }

    if (data.netIncome >= 0) {
      closingLines.push({ accountCode: "3300", debit: 0, credit: data.netIncome, description: "ملخص الدخل — صافي ربح" });
    } else {
      closingLines.push({ accountCode: "3300", debit: Math.abs(data.netIncome), credit: 0, description: "ملخص الدخل — صافي خسارة" });
    }

    if (closingLines.length > 0) {
      addJournalEntry(`${year}-${String(month).padStart(2, "0")}-${month === 12 ? "31" : "30"}`, `قيد إقفال الفترة ${month}/${year}`, closingLines, "الإقفال");
    }

    addJournalEntry(`${year}-${String(month).padStart(2, "0")}-${month === 12 ? "31" : "30"}`, "ترحيل ملخص الدخل إلى الأرباح المحتجزة", [
      ...(data.netIncome >= 0
        ? [{ accountCode: "3300", debit: data.netIncome, credit: 0, description: "ملخص الدخل" }, { accountCode: "3200", debit: 0, credit: data.netIncome, description: "أرباح محتجزة" }]
        : [{ accountCode: "3200", debit: Math.abs(data.netIncome), credit: 0, description: "أرباح محتجزة" }, { accountCode: "3300", debit: 0, credit: Math.abs(data.netIncome), description: "ملخص الدخل" }]
      ),
    ], "الإقفال");

    setAccounts(accounts.map(acc => {
      if ((acc.type === "revenue" || acc.type === "expense") && acc.parent) return { ...acc, balance: 0 };
      if (acc.code === "3300") return { ...acc, balance: 0 };
      if (acc.code === "3200") return { ...acc, balance: acc.balance + data.netIncome };
      return acc;
    }));

    setClosingPeriods(prev => [...prev, { id: prev.length + 1, year, month, date: todayStr(), netIncome: data.netIncome, status: "closed" }]);
    addAudit("إقفال الفترة", "الإقفال", `${month}/${year}`);
  };

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير الإقفال:\n\n";
    text += `الإيرادات المقفلة: ${formatNum(data.totalRevenue)} ريال\n`;
    text += `المصروفات المقفلة: ${formatNum(data.totalExpense)} ريال\n`;
    text += `صافي الربح/الخسارة: ${formatNum(data.netIncome)} ريال\n\n`;
    text += "الفترات المقفلة:\n";
    for (const p of closingPeriods) text += `  ${p.month}/${p.year}: ${formatNum(p.netIncome)} ريال [${p.status === "closed" ? "مقفل" : "مفتوح"}]\n`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Lock className="w-4 h-4 text-teal-400" /> إقفال الفترات</h3>
        {onShareWithTeacher && <ShareButton onClick={share} />}
      </div>

      <div className="rounded-xl border border-white/5 p-4 space-y-3">
        <h4 className="text-xs font-bold text-white">ملخص ما قبل الإقفال</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">إجمالي الإيرادات</div><div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">{formatNum(data.totalRevenue)}</div></div>
          <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">إجمالي المصروفات</div><div className="text-xs sm:text-sm font-bold text-red-400 font-mono">{formatNum(data.totalExpense)}</div></div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">{data.netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</div><div className={`text-xs sm:text-sm font-bold font-mono ${data.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(Math.abs(data.netIncome))}</div></div>
        </div>

        {data.revenueAccounts.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold">حسابات الإيرادات المفتوحة</span>
            {data.revenueAccounts.map(a => (
              <div key={a.code} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white/3">
                <span className="text-[#a6adc8]">{a.code} — {a.name}</span><span className="text-emerald-400 font-mono">{formatNum(a.balance)}</span>
              </div>
            ))}
          </div>
        )}
        {data.expenseAccounts.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-red-400 font-bold">حسابات المصروفات المفتوحة</span>
            {data.expenseAccounts.map(a => (
              <div key={a.code} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white/3">
                <span className="text-[#a6adc8]">{a.code} — {a.name}</span><span className="text-red-400 font-mono">{formatNum(a.balance)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs">
            <label className="text-[#6e6a86]">السنة:</label>
            <input type="number" value={closingYear} onChange={e => setClosingYear(e.target.value)} className="w-20 bg-[#1e1e2e] border border-white/10 rounded px-2 py-1 text-white text-xs font-mono outline-none" style={{ direction: "ltr" }} />
            <label className="text-[#6e6a86]">الشهر:</label>
            <input type="number" value={closingMonth} onChange={e => setClosingMonth(e.target.value)} min="1" max="12" className="w-16 bg-[#1e1e2e] border border-white/10 rounded px-2 py-1 text-white text-xs font-mono outline-none" style={{ direction: "ltr" }} />
          </div>
          <ActionButton onClick={performClosing} disabled={data.totalRevenue === 0 && data.totalExpense === 0} variant="amber">
            <Lock className="w-3 h-3" /> إقفال الفترة
          </ActionButton>
        </div>
      </div>

      {closingPeriods.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[#a6adc8]">سجل الإقفالات</h4>
          {closingPeriods.map(p => (
            <div key={p.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">{p.month}/{p.year}</span>
                <Badge color="emerald">مقفل</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${p.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(p.netIncome)}</span>
                <span className="text-[10px] text-[#6e6a86]">{p.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
