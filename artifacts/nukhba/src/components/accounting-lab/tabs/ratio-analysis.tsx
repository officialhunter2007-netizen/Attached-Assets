import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function RatioAnalysisTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, getAccountBalance } = useLabContext();
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  const getVal = (key: string, fallback: number) => customValues[key] ?? fallback;

  const totalAssets = tAccounts.filter(a => a.type === "asset").reduce((s, a) => s + getAccountBalance(a.code), 0);
  const cash = getAccountBalance("101") + getAccountBalance("102");
  const receivables = getAccountBalance("103");
  const inventory = getAccountBalance("104");
  const currentAssets = cash + receivables + inventory + getAccountBalance("105") + getAccountBalance("106") + getAccountBalance("107");
  const totalLiabilities = tAccounts.filter(a => a.type === "liability").reduce((s, a) => s + getAccountBalance(a.code), 0);
  const currentLiabilities = getAccountBalance("201") + getAccountBalance("202") + getAccountBalance("204");
  const totalEquity = tAccounts.filter(a => a.type === "equity").reduce((s, a) => s + getAccountBalance(a.code), 0);
  const revenue = tAccounts.filter(a => a.type === "revenue").reduce((s, a) => s + getAccountBalance(a.code), 0);
  const netIncome = revenue - tAccounts.filter(a => a.type === "expense").reduce((s, a) => s + getAccountBalance(a.code), 0);
  const cogs = getAccountBalance("501");

  const ratios = [
    {
      category: "نسب السيولة",
      color: "blue",
      items: [
        { name: "النسبة الجارية", formula: "الأصول المتداولة ÷ الخصوم المتداولة", value: currentLiabilities ? currentAssets / currentLiabilities : 0, ideal: "2:1", unit: ":1" },
        { name: "نسبة السيولة السريعة", formula: "(الأصول المتداولة - المخزون) ÷ الخصوم المتداولة", value: currentLiabilities ? (currentAssets - inventory) / currentLiabilities : 0, ideal: "1:1", unit: ":1" },
        { name: "نسبة النقدية", formula: "النقدية ÷ الخصوم المتداولة", value: currentLiabilities ? cash / currentLiabilities : 0, ideal: "0.5:1", unit: ":1" },
      ]
    },
    {
      category: "نسب الربحية",
      color: "emerald",
      items: [
        { name: "هامش الربح الصافي", formula: "صافي الدخل ÷ الإيرادات × 100", value: revenue ? (netIncome / revenue) * 100 : 0, ideal: "> 10%", unit: "%" },
        { name: "هامش مجمل الربح", formula: "(الإيرادات - تكلفة المبيعات) ÷ الإيرادات × 100", value: revenue ? ((revenue - cogs) / revenue) * 100 : 0, ideal: "> 30%", unit: "%" },
        { name: "العائد على الأصول (ROA)", formula: "صافي الدخل ÷ إجمالي الأصول × 100", value: totalAssets ? (netIncome / totalAssets) * 100 : 0, ideal: "> 5%", unit: "%" },
        { name: "العائد على حقوق الملكية (ROE)", formula: "صافي الدخل ÷ حقوق الملكية × 100", value: totalEquity ? (netIncome / totalEquity) * 100 : 0, ideal: "> 15%", unit: "%" },
      ]
    },
    {
      category: "نسب النشاط",
      color: "amber",
      items: [
        { name: "معدل دوران المخزون", formula: "تكلفة المبيعات ÷ المخزون", value: inventory ? cogs / inventory : 0, ideal: "> 4 مرات", unit: " مرة" },
        { name: "معدل دوران المدينين", formula: "الإيرادات ÷ المدينين", value: receivables ? revenue / receivables : 0, ideal: "> 6 مرات", unit: " مرة" },
        { name: "معدل دوران الأصول", formula: "الإيرادات ÷ إجمالي الأصول", value: totalAssets ? revenue / totalAssets : 0, ideal: "> 1", unit: " مرة" },
      ]
    },
    {
      category: "نسب المديونية",
      color: "red",
      items: [
        { name: "نسبة الدين إلى الأصول", formula: "إجمالي الخصوم ÷ إجمالي الأصول × 100", value: totalAssets ? (totalLiabilities / totalAssets) * 100 : 0, ideal: "< 50%", unit: "%" },
        { name: "نسبة الدين إلى حقوق الملكية", formula: "إجمالي الخصوم ÷ حقوق الملكية", value: totalEquity ? totalLiabilities / totalEquity : 0, ideal: "< 1", unit: ":1" },
      ]
    },
  ];

  const getHealthIcon = (value: number, ideal: string) => {
    if (value === 0) return <Minus className="w-3 h-3 text-white/30" />;
    const isGood = ideal.includes(">") ? value > parseFloat(ideal.replace(/[^0-9.]/g, "")) : value < parseFloat(ideal.replace(/[^0-9.]/g, ""));
    return isGood ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />;
  };

  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">📈 التحليل بالنسب المالية</h3>
        <button onClick={() => {
          const data = ratios.map(g => `${g.category}:\n${g.items.map(r => `  ${r.name}: ${fmt(r.value)}${r.unit} (المعيار: ${r.ideal})`).join("\n")}`).join("\n\n");
          onShare(`📈 التحليل بالنسب المالية:\n${data}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      {totalAssets === 0 && revenue === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-white/60 mb-1">لا توجد أرصدة لاحتساب النسب</p>
          <p className="text-[10px] text-white/40">ارجع لتبويب «القيود» وسجّل عمليات (أو حمّل بيانات تجريبية) لترى النسب الحقيقية.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
          <p className="text-[9px] text-blue-300 mb-1">إجمالي الأصول</p>
          <p className="text-sm font-bold text-blue-400 font-mono">{totalAssets.toLocaleString("ar-YE")}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-[9px] text-red-300 mb-1">إجمالي الخصوم</p>
          <p className="text-sm font-bold text-red-400 font-mono">{totalLiabilities.toLocaleString("ar-YE")}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[9px] text-emerald-300 mb-1">الإيرادات</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">{revenue.toLocaleString("ar-YE")}</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
          <p className="text-[9px] text-purple-300 mb-1">صافي الدخل</p>
          <p className={`text-sm font-bold font-mono ${netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>{netIncome.toLocaleString("ar-YE")}</p>
        </div>
      </div>

      {ratios.map((group, gi) => {
        const colorMap: Record<string, string> = { blue: "border-blue-500/20 bg-blue-500/5", emerald: "border-emerald-500/20 bg-emerald-500/5", amber: "border-amber-500/20 bg-amber-500/5", red: "border-red-500/20 bg-red-500/5" };
        const textMap: Record<string, string> = { blue: "text-blue-400", emerald: "text-emerald-400", amber: "text-amber-400", red: "text-red-400" };
        return (
          <div key={gi} className="space-y-2">
            <h4 className={`text-xs font-bold ${textMap[group.color]}`}>{group.category}</h4>
            {group.items.map((ratio, ri) => (
              <div key={ri} className={`rounded-xl border ${colorMap[group.color]} p-3`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getHealthIcon(ratio.value, ratio.ideal)}
                    <span className="text-xs font-bold text-white">{ratio.name}</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${textMap[group.color]}`}>{fmt(ratio.value)}{ratio.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">{ratio.formula}</span>
                  <span className="text-[10px] text-white/40">المعيار: {ratio.ideal}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
