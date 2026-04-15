import { useMemo } from "react";
import { BarChart3, Calculator, Check, AlertTriangle } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton } from "../shared-ui";
import { formatNum } from "../utils";

export function TrialBalanceTab() {
  const { accounts, entries, onShareWithTeacher } = useSimulator();

  const data = useMemo(() => {
    const leafAccounts = accounts.filter(a => a.parent && a.balance !== 0);
    const totalDebit = leafAccounts.filter(a => {
      const isDebitNormal = a.type === "asset" || a.type === "expense";
      return isDebitNormal ? a.balance > 0 : a.balance < 0;
    }).reduce((s, a) => s + Math.abs(a.balance), 0);
    const totalCredit = leafAccounts.filter(a => {
      const isDebitNormal = a.type === "asset" || a.type === "expense";
      return isDebitNormal ? a.balance < 0 : a.balance > 0;
    }).reduce((s, a) => s + Math.abs(a.balance), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const totalRevenue = accounts.filter(a => a.type === "revenue" && a.parent).reduce((s, a) => s + a.balance, 0);
    const totalExpense = accounts.filter(a => a.type === "expense" && a.parent).reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpense;
    const totalAssets = accounts.filter(a => a.type === "asset" && a.parent).reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = accounts.filter(a => a.type === "liability" && a.parent).reduce((s, a) => s + a.balance, 0);
    const totalEquity = accounts.filter(a => a.type === "equity" && a.parent).reduce((s, a) => s + a.balance, 0);

    return { leafAccounts, totalDebit, totalCredit, isBalanced, totalRevenue, totalExpense, netIncome, totalAssets, totalLiabilities, totalEquity };
  }, [accounts]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "ميزان المراجعة:\n\n| الحساب | مدين | دائن |\n";
    for (const acc of data.leafAccounts) {
      const isDebitNormal = acc.type === "asset" || acc.type === "expense";
      const d = (isDebitNormal && acc.balance > 0) || (!isDebitNormal && acc.balance < 0) ? Math.abs(acc.balance) : 0;
      const c = (isDebitNormal && acc.balance < 0) || (!isDebitNormal && acc.balance > 0) ? Math.abs(acc.balance) : 0;
      text += `| ${acc.code} ${acc.name} | ${formatNum(d)} | ${formatNum(c)} |\n`;
    }
    text += `\nإجمالي المدين: ${formatNum(data.totalDebit)} | إجمالي الدائن: ${formatNum(data.totalCredit)}\n`;
    text += `متوازن: ${data.isBalanced ? "نعم ✓" : "لا ✗"}\nصافي الربح: ${formatNum(data.netIncome)}`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-teal-400" /> ميزان المراجعة</h3>
        {onShareWithTeacher && data.leafAccounts.length > 0 && <ShareButton onClick={share} />}
      </div>

      {data.leafAccounts.length === 0 ? (
        <div className="text-center py-12 text-[#6e6a86]">
          <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد حركات مالية بعد</p>
          <p className="text-xs mt-1">ابدأ بإنشاء قيود أو فواتير لتظهر هنا</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-white/5 text-[10px] text-[#6e6a86] font-bold">
              <span className="col-span-2">الرقم</span><span className="col-span-4">اسم الحساب</span><span className="col-span-3 text-center">مدين</span><span className="col-span-3 text-center">دائن</span>
            </div>
            {data.leafAccounts.map(acc => {
              const isDebitNormal = acc.type === "asset" || acc.type === "expense";
              const debitAmt = (isDebitNormal && acc.balance > 0) || (!isDebitNormal && acc.balance < 0) ? Math.abs(acc.balance) : 0;
              const creditAmt = (isDebitNormal && acc.balance < 0) || (!isDebitNormal && acc.balance > 0) ? Math.abs(acc.balance) : 0;
              return (
                <div key={acc.code}>
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-t border-white/5 hover:bg-white/3 text-xs">
                    <span className="col-span-2 font-mono text-[#6e6a86]">{acc.code}</span>
                    <span className="col-span-4 text-white">{acc.name}</span>
                    <span className="col-span-3 text-center font-mono text-blue-400 font-bold">{debitAmt > 0 ? formatNum(debitAmt) : "—"}</span>
                    <span className="col-span-3 text-center font-mono text-red-400 font-bold">{creditAmt > 0 ? formatNum(creditAmt) : "—"}</span>
                  </div>
                  <div className="sm:hidden border-t border-white/5 px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0"><span className="text-[10px] font-mono text-[#6e6a86]">{acc.code} </span><span className="text-xs text-white">{acc.name}</span></div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px]">
                      <span className="font-mono text-blue-400 font-bold">{debitAmt > 0 ? formatNum(debitAmt) : "—"}</span>
                      <span className="font-mono text-red-400 font-bold">{creditAmt > 0 ? formatNum(creditAmt) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex sm:grid sm:grid-cols-12 gap-2 px-4 py-3 border-t-2 border-teal-400/30 bg-teal-500/5 text-xs font-bold items-center justify-between">
              <span className="sm:col-span-6 text-teal-400">الإجمالي</span>
              <div className="flex items-center gap-3 sm:contents">
                <span className="sm:col-span-3 sm:text-center font-mono text-blue-400">{formatNum(data.totalDebit)}</span>
                <span className="sm:col-span-3 sm:text-center font-mono text-red-400">{formatNum(data.totalCredit)}</span>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${data.isBalanced ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            {data.isBalanced ? (
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" /> ميزان المراجعة متوازن ✓</span>
            ) : (
              <span className="text-sm font-bold text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> غير متوازن (فرق: {formatNum(Math.abs(data.totalDebit - data.totalCredit))})</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white mb-2">قائمة الدخل المختصرة</h4>
              <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">إجمالي الإيرادات</span><span className="text-emerald-400 font-mono font-bold">{formatNum(data.totalRevenue)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">إجمالي المصروفات</span><span className="text-red-400 font-mono font-bold">({formatNum(data.totalExpense)})</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                <span className="font-bold text-white">{data.netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span>
                <span className={`font-bold font-mono ${data.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(Math.abs(data.netIncome))}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/5 p-4 space-y-2">
              <h4 className="text-xs font-bold text-white mb-2">المركز المالي المختصر</h4>
              <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الأصول</span><span className="text-blue-400 font-mono font-bold">{formatNum(data.totalAssets)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الخصوم</span><span className="text-red-400 font-mono font-bold">{formatNum(data.totalLiabilities)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">حقوق الملكية</span><span className="text-purple-400 font-mono font-bold">{formatNum(data.totalEquity)}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
