import { useState, useMemo } from "react";
import { Crosshair, Plus, TrendingUp } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, ShareButton, ActionButton, EmptyState } from "../shared-ui";
import { formatNum } from "../utils";

export function BreakEvenTab() {
  const { accounts, onShareWithTeacher } = useSimulator();
  const [fixedCosts, setFixedCosts] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [varCostPerUnit, setVarCostPerUnit] = useState("");
  const [actualUnits, setActualUnits] = useState("");

  const data = useMemo(() => {
    const fc = Number(fixedCosts) || 0;
    const price = Number(pricePerUnit) || 0;
    const vc = Number(varCostPerUnit) || 0;
    const actual = Number(actualUnits) || 0;

    if (price <= vc || price === 0) return null;

    const contributionMargin = price - vc;
    const contributionRatio = contributionMargin / price;
    const breakEvenUnits = Math.ceil(fc / contributionMargin);
    const breakEvenSales = fc / contributionRatio;
    const actualSales = actual * price;
    const actualTotalCost = fc + (vc * actual);
    const actualProfit = actualSales - actualTotalCost;
    const marginOfSafety = actual > 0 ? ((actual - breakEvenUnits) / actual) * 100 : 0;
    const marginOfSafetySales = actualSales > 0 ? ((actualSales - breakEvenSales) / actualSales) * 100 : 0;
    const operatingLeverage = contributionMargin > 0 && actualProfit !== 0 ? (actual * contributionMargin) / actualProfit : 0;

    const leaf = accounts.filter(a => a.parent);
    const totalRevenue = leaf.filter(a => a.type === "revenue").reduce((s, a) => s + a.balance, 0);
    const totalExpense = leaf.filter(a => a.type === "expense").reduce((s, a) => s + a.balance, 0);

    return {
      fc, price, vc, contributionMargin, contributionRatio,
      breakEvenUnits, breakEvenSales, actual,
      actualSales, actualTotalCost, actualProfit,
      marginOfSafety, marginOfSafetySales, operatingLeverage,
      totalRevenue, totalExpense,
    };
  }, [fixedCosts, pricePerUnit, varCostPerUnit, actualUnits, accounts]);

  const share = () => {
    if (!onShareWithTeacher || !data) return;
    let text = "تحليل نقطة التعادل:\n\n";
    text += `التكاليف الثابتة: ${formatNum(data.fc)} ريال\n`;
    text += `سعر البيع للوحدة: ${formatNum(data.price)} ريال\n`;
    text += `التكلفة المتغيرة للوحدة: ${formatNum(data.vc)} ريال\n`;
    text += `هامش المساهمة: ${formatNum(data.contributionMargin)} ريال (${(data.contributionRatio * 100).toFixed(1)}%)\n\n`;
    text += `نقطة التعادل بالوحدات: ${data.breakEvenUnits} وحدة\n`;
    text += `نقطة التعادل بالمبيعات: ${formatNum(data.breakEvenSales)} ريال\n\n`;
    if (data.actual > 0) {
      text += `المبيعات الفعلية: ${data.actual} وحدة = ${formatNum(data.actualSales)} ريال\n`;
      text += `الربح الفعلي: ${formatNum(data.actualProfit)} ريال\n`;
      text += `هامش الأمان: ${data.marginOfSafety.toFixed(1)}%\n`;
      text += `الرافعة التشغيلية: ${data.operatingLeverage.toFixed(2)}`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Crosshair className="w-4 h-4 text-teal-400" /> تحليل نقطة التعادل</h3>
        {onShareWithTeacher && data && <ShareButton onClick={share} />}
      </div>

      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
        <h4 className="text-xs font-bold text-teal-400">بيانات التحليل</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SimField label="التكاليف الثابتة (ريال)" value={fixedCosts} onChange={setFixedCosts} type="number" dir="ltr" />
          <SimField label="سعر البيع للوحدة" value={pricePerUnit} onChange={setPricePerUnit} type="number" dir="ltr" />
          <SimField label="التكلفة المتغيرة للوحدة" value={varCostPerUnit} onChange={setVarCostPerUnit} type="number" dir="ltr" />
          <SimField label="المبيعات الفعلية (وحدات)" value={actualUnits} onChange={setActualUnits} type="number" dir="ltr" />
        </div>
      </div>

      {!data ? (
        <EmptyState icon={<Crosshair className="w-10 h-10" />} title="أدخل البيانات" subtitle="سعر البيع يجب أن يكون أكبر من التكلفة المتغيرة" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <div className="text-[10px] text-[#6e6a86] mb-2">نقطة التعادل (وحدات)</div>
              <div className="text-2xl font-bold text-amber-400 font-mono">{data.breakEvenUnits}</div>
              <div className="text-[10px] text-[#6e6a86] mt-1">وحدة</div>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
              <div className="text-[10px] text-[#6e6a86] mb-2">نقطة التعادل (مبيعات)</div>
              <div className="text-2xl font-bold text-blue-400 font-mono">{formatNum(data.breakEvenSales)}</div>
              <div className="text-[10px] text-[#6e6a86] mt-1">ريال</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 p-4 space-y-3">
            <h4 className="text-xs font-bold text-white">تفاصيل التحليل</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between"><span className="text-[#a6adc8]">هامش المساهمة</span><span className="text-emerald-400 font-mono font-bold">{formatNum(data.contributionMargin)} ريال</span></div>
              <div className="flex justify-between"><span className="text-[#a6adc8]">نسبة هامش المساهمة</span><span className="text-emerald-400 font-mono font-bold">{(data.contributionRatio * 100).toFixed(1)}%</span></div>
            </div>
          </div>

          {data.actual > 0 && (
            <>
              <div className="rounded-xl border border-white/5 p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> الأداء الفعلي</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between"><span className="text-[#a6adc8]">المبيعات الفعلية</span><span className="text-blue-400 font-mono">{formatNum(data.actualSales)}</span></div>
                  <div className="flex justify-between"><span className="text-[#a6adc8]">إجمالي التكاليف</span><span className="text-red-400 font-mono">{formatNum(data.actualTotalCost)}</span></div>
                  <div className="flex justify-between"><span className="text-[#a6adc8]">الربح/الخسارة</span><span className={`font-mono font-bold ${data.actualProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(data.actualProfit)}</span></div>
                  <div className="flex justify-between"><span className="text-[#a6adc8]">الرافعة التشغيلية</span><span className="text-purple-400 font-mono">{data.operatingLeverage.toFixed(2)}</span></div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${data.marginOfSafety >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">هامش الأمان</span>
                  <span className={`text-lg font-bold font-mono ${data.marginOfSafety >= 0 ? "text-emerald-400" : "text-red-400"}`}>{data.marginOfSafety.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 relative">
                  <div className="absolute right-0 top-0 h-3 rounded-full bg-gradient-to-l from-red-500 via-amber-500 to-emerald-500" style={{ width: "100%" }} />
                  <div className="absolute top-[-4px] h-5 w-0.5 bg-white" style={{ right: `${Math.max(0, Math.min(100, ((data.actual / data.breakEvenUnits) * 50)))}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#6e6a86] mt-1">
                  <span>خسارة</span><span>نقطة التعادل</span><span>ربح</span>
                </div>
                <div className="mt-2 text-xs text-[#a6adc8]">
                  {data.marginOfSafety > 20 ? "وضع آمن — المبيعات أعلى من نقطة التعادل بنسبة جيدة" :
                   data.marginOfSafety > 0 ? "وضع مقبول — لكن هامش الأمان منخفض" :
                   "خطر — المبيعات أقل من نقطة التعادل"}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
