import { useMemo } from "react";
import { FileBarChart, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton } from "../shared-ui";
import { formatNum } from "../utils";

export function FinancialStatementsTab() {
  const { accounts, entries, onShareWithTeacher } = useSimulator();

  const data = useMemo(() => {
    const leaf = accounts.filter(a => a.parent);
    const revenue = leaf.filter(a => a.type === "revenue");
    const expense = leaf.filter(a => a.type === "expense");
    const assets = leaf.filter(a => a.type === "asset");
    const liabilities = leaf.filter(a => a.type === "liability");
    const equity = leaf.filter(a => a.type === "equity");

    const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
    const totalExpense = expense.reduce((s, a) => s + a.balance, 0);
    const cogs = leaf.find(a => a.code === "5100")?.balance || 0;
    const grossProfit = totalRevenue - cogs;
    const operatingExpenses = totalExpense - cogs;
    const netIncome = totalRevenue - totalExpense;

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0) + netIncome;

    const cashFromOps = netIncome;
    const depExpense = leaf.find(a => a.code === "5600")?.balance || 0;
    const receivables = leaf.find(a => a.code === "1300")?.balance || 0;
    const payables = leaf.find(a => a.code === "2100")?.balance || 0;
    const inventoryChange = leaf.find(a => a.code === "1400")?.balance || 0;
    const cashOps = cashFromOps + depExpense - receivables + payables - inventoryChange;

    const fixedAssetChanges = leaf.find(a => a.code === "1500")?.balance || 0;
    const cashInvesting = -fixedAssetChanges;

    const loansChange = leaf.find(a => a.code === "2200")?.balance || 0;
    const cashFinancing = loansChange;

    const netCashChange = cashOps + cashInvesting + cashFinancing;

    return {
      revenue, expense, assets, liabilities, equity,
      totalRevenue, totalExpense, cogs, grossProfit, operatingExpenses, netIncome,
      totalAssets, totalLiabilities, totalEquity,
      cashOps, cashInvesting, cashFinancing, netCashChange,
      depExpense, receivables, payables, inventoryChange,
    };
  }, [accounts]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "=== القوائم المالية ===\n\n";
    text += "📊 قائمة الدخل:\n";
    text += `إيرادات المبيعات: ${formatNum(data.totalRevenue)}\n`;
    text += `(-) تكلفة البضاعة: (${formatNum(data.cogs)})\n`;
    text += `= مجمل الربح: ${formatNum(data.grossProfit)}\n`;
    text += `(-) مصروفات تشغيلية: (${formatNum(data.operatingExpenses)})\n`;
    text += `= صافي الربح: ${formatNum(data.netIncome)}\n\n`;
    text += "📋 المركز المالي:\n";
    text += `إجمالي الأصول: ${formatNum(data.totalAssets)}\n`;
    text += `إجمالي الخصوم: ${formatNum(data.totalLiabilities)}\n`;
    text += `حقوق الملكية: ${formatNum(data.totalEquity)}\n\n`;
    text += "💰 التدفقات النقدية:\n";
    text += `أنشطة تشغيلية: ${formatNum(data.cashOps)}\n`;
    text += `أنشطة استثمارية: ${formatNum(data.cashInvesting)}\n`;
    text += `أنشطة تمويلية: ${formatNum(data.cashFinancing)}\n`;
    text += `صافي التغير: ${formatNum(data.netCashChange)}`;
    onShareWithTeacher(text);
  };

  const StatementRow = ({ label, amount, bold, indent, negative }: { label: string; amount: number; bold?: boolean; indent?: boolean; negative?: boolean }) => (
    <div className={`flex items-center justify-between py-1.5 ${indent ? "pr-6" : ""} ${bold ? "border-t border-white/10 pt-2" : ""}`}>
      <span className={`text-xs ${bold ? "font-bold text-white" : "text-[#a6adc8]"}`}>{label}</span>
      <span className={`text-xs font-mono font-bold ${amount >= 0 ? (negative ? "text-red-400" : "text-emerald-400") : "text-red-400"}`}>
        {negative && amount > 0 ? `(${formatNum(amount)})` : formatNum(amount)}
      </span>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileBarChart className="w-4 h-4 text-teal-400" /> القوائم المالية</h3>
        {onShareWithTeacher && <ShareButton onClick={share} />}
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /> قائمة الدخل</h4>
        {data.revenue.filter(a => a.balance !== 0).map(a => <StatementRow key={a.code} label={a.name} amount={a.balance} indent />)}
        <StatementRow label="إجمالي الإيرادات" amount={data.totalRevenue} bold />
        {data.cogs > 0 && <StatementRow label="(-) تكلفة البضاعة المباعة" amount={data.cogs} indent negative />}
        {data.cogs > 0 && <StatementRow label="مجمل الربح" amount={data.grossProfit} bold />}
        {data.expense.filter(a => a.balance !== 0 && a.code !== "5100").map(a => <StatementRow key={a.code} label={a.name} amount={a.balance} indent negative />)}
        {data.operatingExpenses > 0 && <StatementRow label="إجمالي المصروفات التشغيلية" amount={data.operatingExpenses} bold />}
        <div className={`flex items-center justify-between py-2 border-t-2 ${data.netIncome >= 0 ? "border-emerald-500/30" : "border-red-500/30"} mt-2`}>
          <span className="text-sm font-bold text-white">{data.netIncome >= 0 ? "صافي الربح" : "صافي الخسارة"}</span>
          <span className={`text-base font-bold font-mono ${data.netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(Math.abs(data.netIncome))}</span>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-1">
        <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-3"><FileBarChart className="w-4 h-4" /> قائمة المركز المالي (الميزانية العمومية)</h4>
        <div className="text-[10px] font-bold text-blue-300 mt-2 mb-1">الأصول</div>
        {data.assets.filter(a => a.balance !== 0).map(a => <StatementRow key={a.code} label={a.name} amount={a.balance} indent />)}
        <StatementRow label="إجمالي الأصول" amount={data.totalAssets} bold />
        <div className="text-[10px] font-bold text-red-300 mt-3 mb-1">الخصوم</div>
        {data.liabilities.filter(a => a.balance !== 0).map(a => <StatementRow key={a.code} label={a.name} amount={a.balance} indent />)}
        <StatementRow label="إجمالي الخصوم" amount={data.totalLiabilities} bold />
        <div className="text-[10px] font-bold text-purple-300 mt-3 mb-1">حقوق الملكية</div>
        {data.equity.filter(a => a.balance !== 0).map(a => <StatementRow key={a.code} label={a.name} amount={a.balance} indent />)}
        {data.netIncome !== 0 && <StatementRow label={data.netIncome >= 0 ? "صافي ربح الفترة" : "صافي خسارة الفترة"} amount={data.netIncome} indent />}
        <StatementRow label="إجمالي حقوق الملكية" amount={data.totalEquity} bold />
        <div className="flex items-center justify-between py-2 border-t-2 border-blue-500/30 mt-2">
          <span className="text-sm font-bold text-white">الخصوم + حقوق الملكية</span>
          <span className="text-base font-bold font-mono text-blue-400">{formatNum(data.totalLiabilities + data.totalEquity)}</span>
        </div>
        {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) > 0.01 && (
          <div className="text-[10px] text-red-400 text-center mt-1">⚠ الميزانية غير متوازنة — الفرق: {formatNum(Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)))}</div>
        )}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
        <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3"><ArrowUpDown className="w-4 h-4" /> قائمة التدفقات النقدية (الطريقة غير المباشرة)</h4>
        <div className="text-[10px] font-bold text-amber-300 mb-1">أنشطة تشغيلية</div>
        <StatementRow label="صافي الربح/الخسارة" amount={data.netIncome} indent />
        {data.depExpense > 0 && <StatementRow label="(+) مصروف الاستهلاك" amount={data.depExpense} indent />}
        {data.receivables !== 0 && <StatementRow label={`${data.receivables > 0 ? "(-)" : "(+)"} التغير في المدينين`} amount={-data.receivables} indent />}
        {data.payables !== 0 && <StatementRow label={`${data.payables > 0 ? "(+)" : "(-)"} التغير في الدائنين`} amount={data.payables} indent />}
        {data.inventoryChange !== 0 && <StatementRow label={`${data.inventoryChange > 0 ? "(-)" : "(+)"} التغير في المخزون`} amount={-data.inventoryChange} indent />}
        <StatementRow label="صافي النقد من الأنشطة التشغيلية" amount={data.cashOps} bold />
        <div className="text-[10px] font-bold text-amber-300 mt-3 mb-1">أنشطة استثمارية</div>
        <StatementRow label="شراء/بيع أصول ثابتة" amount={data.cashInvesting} indent />
        <StatementRow label="صافي النقد من الأنشطة الاستثمارية" amount={data.cashInvesting} bold />
        <div className="text-[10px] font-bold text-amber-300 mt-3 mb-1">أنشطة تمويلية</div>
        <StatementRow label="تغير في القروض" amount={data.cashFinancing} indent />
        <StatementRow label="صافي النقد من الأنشطة التمويلية" amount={data.cashFinancing} bold />
        <div className="flex items-center justify-between py-2 border-t-2 border-amber-500/30 mt-2">
          <span className="text-sm font-bold text-white">صافي التغير في النقدية</span>
          <span className={`text-base font-bold font-mono ${data.netCashChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(data.netCashChange)}</span>
        </div>
      </div>
    </div>
  );
}
