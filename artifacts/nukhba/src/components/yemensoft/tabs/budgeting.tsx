import { useState, useMemo } from "react";
import { PieChart, Plus, Edit2 } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton, EmptyState } from "../shared-ui";
import { formatNum } from "../utils";

type BudgetLine = { id: number; account: string; accountName: string; q1: number; q2: number; q3: number; q4: number; annual: number };

export function BudgetingTab() {
  const { accounts, addAudit, onShareWithTeacher } = useSimulator();
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selAccount, setSelAccount] = useState("");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");

  const expenseAccounts = accounts.filter(a => a.type === "expense" && a.parent);
  const revenueAccounts = accounts.filter(a => a.type === "revenue" && a.parent);
  const budgetableAccounts = [...revenueAccounts, ...expenseAccounts];

  const addLine = () => {
    if (!selAccount) return;
    const acc = accounts.find(a => a.code === selAccount);
    if (!acc) return;
    const q1v = Number(q1) || 0; const q2v = Number(q2) || 0; const q3v = Number(q3) || 0; const q4v = Number(q4) || 0;
    setBudgetLines(prev => [...prev, { id: prev.length + 1, account: selAccount, accountName: acc.name, q1: q1v, q2: q2v, q3: q3v, q4: q4v, annual: q1v + q2v + q3v + q4v }]);
    addAudit("إضافة بند موازنة", "الموازنات", acc.name);
    setSelAccount(""); setQ1(""); setQ2(""); setQ3(""); setQ4(""); setShowAdd(false);
  };

  const totals = useMemo(() => {
    const revLines = budgetLines.filter(l => revenueAccounts.find(a => a.code === l.account));
    const expLines = budgetLines.filter(l => expenseAccounts.find(a => a.code === l.account));
    const sum = (lines: BudgetLine[], key: "q1" | "q2" | "q3" | "q4" | "annual") => lines.reduce((s, l) => s + l[key], 0);

    const budgetRev = { q1: sum(revLines, "q1"), q2: sum(revLines, "q2"), q3: sum(revLines, "q3"), q4: sum(revLines, "q4"), annual: sum(revLines, "annual") };
    const budgetExp = { q1: sum(expLines, "q1"), q2: sum(expLines, "q2"), q3: sum(expLines, "q3"), q4: sum(expLines, "q4"), annual: sum(expLines, "annual") };

    const actualRevTotal = revenueAccounts.reduce((s, a) => s + a.balance, 0);
    const actualExpTotal = expenseAccounts.reduce((s, a) => s + a.balance, 0);

    return { budgetRev, budgetExp, actualRevTotal, actualExpTotal, budgetNetIncome: budgetRev.annual - budgetExp.annual, actualNetIncome: actualRevTotal - actualExpTotal };
  }, [budgetLines, accounts]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير الموازنة التقديرية:\n\n";
    text += `إجمالي الإيرادات المقدرة: ${formatNum(totals.budgetRev.annual)} | الفعلية: ${formatNum(totals.actualRevTotal)}\n`;
    text += `إجمالي المصروفات المقدرة: ${formatNum(totals.budgetExp.annual)} | الفعلية: ${formatNum(totals.actualExpTotal)}\n`;
    text += `صافي الربح المقدر: ${formatNum(totals.budgetNetIncome)} | الفعلي: ${formatNum(totals.actualNetIncome)}\n\n`;
    for (const l of budgetLines) {
      const actual = accounts.find(a => a.code === l.account)?.balance || 0;
      text += `• ${l.accountName}: الموازنة ${formatNum(l.annual)} | الفعلي ${formatNum(actual)} | الانحراف ${formatNum(l.annual - actual)}\n`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><PieChart className="w-4 h-4 text-teal-400" /> الموازنات التقديرية</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && budgetLines.length > 0 && <ShareButton onClick={share} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> بند جديد</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <SimSelect label="الحساب" value={selAccount} onChange={setSelAccount} options={[{ value: "", label: "اختر حساب..." }, ...budgetableAccounts.map(a => ({ value: a.code, label: `${a.code} — ${a.name}` }))]} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SimField label="الربع 1" value={q1} onChange={setQ1} type="number" dir="ltr" />
            <SimField label="الربع 2" value={q2} onChange={setQ2} type="number" dir="ltr" />
            <SimField label="الربع 3" value={q3} onChange={setQ3} type="number" dir="ltr" />
            <SimField label="الربع 4" value={q4} onChange={setQ4} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addLine} disabled={!selAccount}>إضافة</ActionButton></div>
        </div>
      )}

      {budgetLines.length === 0 ? (
        <EmptyState icon={<PieChart className="w-10 h-10" />} title="لا توجد موازنات" subtitle="أضف بنود الموازنة التقديرية لكل حساب" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">إيرادات مقدرة</div><div className="text-sm font-bold text-emerald-400 font-mono">{formatNum(totals.budgetRev.annual)}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">مصروفات مقدرة</div><div className="text-sm font-bold text-red-400 font-mono">{formatNum(totals.budgetExp.annual)}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">ربح مقدر</div><div className={`text-sm font-bold font-mono ${totals.budgetNetIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(totals.budgetNetIncome)}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">ربح فعلي</div><div className={`text-sm font-bold font-mono ${totals.actualNetIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(totals.actualNetIncome)}</div></div>
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-1 px-3 py-2 bg-white/5 text-[10px] text-[#6e6a86] font-bold">
              <span className="col-span-3">الحساب</span><span className="col-span-2 text-center">الموازنة</span><span className="col-span-2 text-center">الفعلي</span><span className="col-span-2 text-center">الانحراف</span><span className="col-span-3 text-center">التحقيق</span>
            </div>
            {budgetLines.map(line => {
              const actual = accounts.find(a => a.code === line.account)?.balance || 0;
              const variance = line.annual - actual;
              const pct = line.annual > 0 ? (actual / line.annual) * 100 : 0;
              const isRevenue = !!revenueAccounts.find(a => a.code === line.account);
              const isGood = isRevenue ? actual >= line.annual : actual <= line.annual;
              return (
                <div key={line.id}>
                  <div className="hidden sm:grid grid-cols-12 gap-1 px-3 py-2.5 border-t border-white/5 hover:bg-white/3 text-xs items-center">
                    <span className="col-span-3 text-white truncate">{line.accountName}</span>
                    <span className="col-span-2 text-center font-mono text-blue-400">{formatNum(line.annual)}</span>
                    <span className="col-span-2 text-center font-mono text-amber-400">{formatNum(actual)}</span>
                    <span className={`col-span-2 text-center font-mono ${isGood ? "text-emerald-400" : "text-red-400"}`}>{formatNum(variance)}</span>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="flex-1 bg-white/5 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${isGood ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                      <span className="text-[10px] text-[#6e6a86] w-10 text-left">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="sm:hidden border-t border-white/5 px-3 py-2.5 space-y-1">
                    <div className="text-xs text-white font-bold">{line.accountName}</div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-blue-400 font-mono">مقدر: {formatNum(line.annual)}</span>
                      <span className="text-amber-400 font-mono">فعلي: {formatNum(actual)}</span>
                      <span className={`font-mono ${isGood ? "text-emerald-400" : "text-red-400"}`}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
