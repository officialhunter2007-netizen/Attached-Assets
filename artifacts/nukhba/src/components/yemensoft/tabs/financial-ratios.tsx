import { useMemo } from "react";
import { Gauge, TrendingUp, Shield, Activity, Zap } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton } from "../shared-ui";
import { formatNum } from "../utils";

export function FinancialRatiosTab() {
  const { accounts, invoices, onShareWithTeacher } = useSimulator();

  const ratios = useMemo(() => {
    const leaf = accounts.filter(a => a.parent);
    const cash = (leaf.find(a => a.code === "1100")?.balance || 0) + (leaf.find(a => a.code === "1200")?.balance || 0);
    const receivables = leaf.find(a => a.code === "1300")?.balance || 0;
    const inventory = leaf.find(a => a.code === "1400")?.balance || 0;
    const currentAssets = cash + receivables + inventory;
    const totalAssets = leaf.filter(a => a.type === "asset").reduce((s, a) => s + a.balance, 0);
    const currentLiabilities = leaf.filter(a => a.type === "liability").reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = currentLiabilities;
    const totalEquity = leaf.filter(a => a.type === "equity").reduce((s, a) => s + a.balance, 0);
    const totalRevenue = leaf.filter(a => a.type === "revenue").reduce((s, a) => s + a.balance, 0);
    const totalExpense = leaf.filter(a => a.type === "expense").reduce((s, a) => s + a.balance, 0);
    const cogs = leaf.find(a => a.code === "5100")?.balance || 0;
    const netIncome = totalRevenue - totalExpense;
    const grossProfit = totalRevenue - cogs;

    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
    const cashRatio = currentLiabilities > 0 ? cash / currentLiabilities : 0;

    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    const roa = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const roe = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;

    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    const equityRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    const receivablesTurnover = receivables > 0 ? totalRevenue / receivables : 0;
    const inventoryTurnover = inventory > 0 ? cogs / inventory : 0;
    const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
    const daysReceivables = receivablesTurnover > 0 ? 365 / receivablesTurnover : 0;
    const daysInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;

    return {
      currentRatio, quickRatio, cashRatio,
      grossMargin, netMargin, roa, roe,
      debtRatio, equityRatio, debtToEquity,
      receivablesTurnover, inventoryTurnover, assetTurnover,
      daysReceivables, daysInventory,
      totalAssets, totalRevenue, netIncome,
    };
  }, [accounts]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير النسب المالية:\n\n";
    text += "📊 نسب السيولة:\n";
    text += `  النسبة الحالية: ${ratios.currentRatio.toFixed(2)}\n  النسبة السريعة: ${ratios.quickRatio.toFixed(2)}\n  نسبة النقدية: ${ratios.cashRatio.toFixed(2)}\n\n`;
    text += "📈 نسب الربحية:\n";
    text += `  هامش الربح الإجمالي: ${ratios.grossMargin.toFixed(1)}%\n  هامش الربح الصافي: ${ratios.netMargin.toFixed(1)}%\n  العائد على الأصول: ${ratios.roa.toFixed(1)}%\n  العائد على حقوق الملكية: ${ratios.roe.toFixed(1)}%\n\n`;
    text += "🛡 نسب الرافعة المالية:\n";
    text += `  نسبة الدين: ${ratios.debtRatio.toFixed(1)}%\n  نسبة الملكية: ${ratios.equityRatio.toFixed(1)}%\n  الدين/الملكية: ${ratios.debtToEquity.toFixed(2)}\n\n`;
    text += "⚡ نسب النشاط:\n";
    text += `  معدل دوران المدينين: ${ratios.receivablesTurnover.toFixed(2)} مرة\n  معدل دوران المخزون: ${ratios.inventoryTurnover.toFixed(2)} مرة\n  معدل دوران الأصول: ${ratios.assetTurnover.toFixed(2)} مرة`;
    onShareWithTeacher(text);
  };

  const RatioGauge = ({ label, value, unit, ideal, isGood }: { label: string; value: number; unit: string; ideal: string; isGood: boolean }) => (
    <div className="rounded-xl border border-white/5 p-3 space-y-2">
      <div className="text-[10px] text-[#6e6a86] font-bold">{label}</div>
      <div className={`text-lg font-bold font-mono ${isGood ? "text-emerald-400" : "text-amber-400"}`}>
        {value.toFixed(2)}<span className="text-[10px] text-[#6e6a86] mr-1">{unit}</span>
      </div>
      <div className="text-[10px] text-[#6e6a86]">المثالي: {ideal}</div>
      <div className="w-full bg-white/5 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${isGood ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(Math.abs(value) * (unit === "%" ? 1 : 33), 100)}%` }} />
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Gauge className="w-4 h-4 text-teal-400" /> النسب المالية</h3>
        {onShareWithTeacher && <ShareButton onClick={share} />}
      </div>

      {ratios.totalAssets === 0 && ratios.totalRevenue === 0 ? (
        <div className="text-center py-12 text-[#6e6a86]"><Gauge className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد بيانات كافية لحساب النسب</p></div>
      ) : (
        <>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2 mb-3"><TrendingUp className="w-3.5 h-3.5" /> نسب السيولة</h4>
            <div className="grid grid-cols-3 gap-2">
              <RatioGauge label="النسبة الحالية" value={ratios.currentRatio} unit="" ideal="≥ 2" isGood={ratios.currentRatio >= 2} />
              <RatioGauge label="النسبة السريعة" value={ratios.quickRatio} unit="" ideal="≥ 1" isGood={ratios.quickRatio >= 1} />
              <RatioGauge label="نسبة النقدية" value={ratios.cashRatio} unit="" ideal="≥ 0.5" isGood={ratios.cashRatio >= 0.5} />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-3"><TrendingUp className="w-3.5 h-3.5" /> نسب الربحية</h4>
            <div className="grid grid-cols-2 gap-2">
              <RatioGauge label="هامش الربح الإجمالي" value={ratios.grossMargin} unit="%" ideal="≥ 30%" isGood={ratios.grossMargin >= 30} />
              <RatioGauge label="هامش الربح الصافي" value={ratios.netMargin} unit="%" ideal="≥ 10%" isGood={ratios.netMargin >= 10} />
              <RatioGauge label="العائد على الأصول (ROA)" value={ratios.roa} unit="%" ideal="≥ 5%" isGood={ratios.roa >= 5} />
              <RatioGauge label="العائد على الملكية (ROE)" value={ratios.roe} unit="%" ideal="≥ 15%" isGood={ratios.roe >= 15} />
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <h4 className="text-xs font-bold text-red-400 flex items-center gap-2 mb-3"><Shield className="w-3.5 h-3.5" /> نسب الرافعة المالية</h4>
            <div className="grid grid-cols-3 gap-2">
              <RatioGauge label="نسبة الدين" value={ratios.debtRatio} unit="%" ideal="≤ 50%" isGood={ratios.debtRatio <= 50} />
              <RatioGauge label="نسبة الملكية" value={ratios.equityRatio} unit="%" ideal="≥ 50%" isGood={ratios.equityRatio >= 50} />
              <RatioGauge label="الدين/الملكية" value={ratios.debtToEquity} unit="" ideal="≤ 1" isGood={ratios.debtToEquity <= 1} />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3"><Activity className="w-3.5 h-3.5" /> نسب النشاط</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <RatioGauge label="دوران المدينين" value={ratios.receivablesTurnover} unit=" مرة" ideal="≥ 6" isGood={ratios.receivablesTurnover >= 6} />
              <RatioGauge label="دوران المخزون" value={ratios.inventoryTurnover} unit=" مرة" ideal="≥ 4" isGood={ratios.inventoryTurnover >= 4} />
              <RatioGauge label="دوران الأصول" value={ratios.assetTurnover} unit=" مرة" ideal="≥ 1" isGood={ratios.assetTurnover >= 1} />
              <RatioGauge label="أيام تحصيل المدينين" value={ratios.daysReceivables} unit=" يوم" ideal="≤ 60" isGood={ratios.daysReceivables <= 60 && ratios.daysReceivables > 0} />
              <RatioGauge label="أيام بيع المخزون" value={ratios.daysInventory} unit=" يوم" ideal="≤ 90" isGood={ratios.daysInventory <= 90 && ratios.daysInventory > 0} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
