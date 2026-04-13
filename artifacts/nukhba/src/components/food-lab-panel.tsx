import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, BarChart3, GitBranch, RotateCcw, Thermometer,
  Droplets, Apple, FlaskConical, TrendingUp, AlertTriangle,
  Plus, Trash2, GripVertical, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";

type LabTab = "calc" | "charts" | "haccp";
type CalcType = "thermal" | "water-activity" | "nutrition" | "pasteurization";
type ChartType = "growth" | "death" | "water-activity";

interface Props {
  onShareWithTeacher?: (content: string) => void;
}

export function FoodLabPanel({ onShareWithTeacher }: Props) {
  const [activeTab, setActiveTab] = useState<LabTab>("calc");

  const tabs: { id: LabTab; label: string; icon: React.ReactNode }[] = [
    { id: "calc", label: "الحاسبات", icon: <Calculator className="w-4 h-4" /> },
    { id: "charts", label: "الرسوم التفاعلية", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "haccp", label: "مخطط HACCP", icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40 w-full min-w-0" style={{ direction: "rtl" }}>
      <div className="bg-[#1e1e2e] px-4 py-2 flex items-center gap-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <FlaskConical className="w-3.5 h-3.5 text-lime-400" />
        <span className="text-xs text-[#6e6a86] font-mono flex-1">مختبر الهندسة الغذائية</span>
      </div>

      <div className="bg-[#181825] border-b border-white/5 flex items-center overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-lime-400 text-white bg-[#1e1e2e]"
                : "border-transparent text-[#6e6a86] hover:text-white/60 hover:bg-white/5"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-[#0d1117] min-h-[300px] max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "calc" && (
            <motion.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CalculatorsTab onShareWithTeacher={onShareWithTeacher} />
            </motion.div>
          )}
          {activeTab === "charts" && (
            <motion.div key="charts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChartsTab onShareWithTeacher={onShareWithTeacher} />
            </motion.div>
          )}
          {activeTab === "haccp" && (
            <motion.div key="haccp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HACCPTab onShareWithTeacher={onShareWithTeacher} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-lime-600 px-4 py-0.5 flex items-center gap-4">
        <span className="text-[10px] text-white/80 font-mono">🔬 مختبر الهندسة الغذائية</span>
        <div className="flex-1" />
        <span className="text-[10px] text-white/80 font-mono">Nukhba Food Lab</span>
      </div>
    </div>
  );
}

function CalculatorsTab({ onShareWithTeacher }: { onShareWithTeacher?: (content: string) => void }) {
  const [activeCalc, setActiveCalc] = useState<CalcType>("thermal");

  const calcs: { id: CalcType; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "thermal", label: "المعاملات الحرارية", icon: <Thermometer className="w-4 h-4" />, desc: "D-value, z-value, F-value" },
    { id: "water-activity", label: "النشاط المائي", icon: <Droplets className="w-4 h-4" />, desc: "Aw وعلاقته بنمو الكائنات" },
    { id: "nutrition", label: "التركيب الغذائي", icon: <Apple className="w-4 h-4" />, desc: "السعرات والبروتين والدهون" },
    { id: "pasteurization", label: "زمن البسترة", icon: <FlaskConical className="w-4 h-4" />, desc: "حساب زمن المعاملة الحرارية" },
  ];

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {calcs.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCalc(c.id)}
            className={`rounded-xl p-3 text-right border transition-all ${
              activeCalc === c.id
                ? "border-lime-400/50 bg-lime-400/10 text-white"
                : "border-white/5 bg-white/3 text-[#6e6a86] hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">{c.icon}<span className="text-xs font-bold">{c.label}</span></div>
            <p className="text-[10px] opacity-60" style={{ direction: "ltr", textAlign: "right" }}>{c.desc}</p>
          </button>
        ))}
      </div>

      {activeCalc === "thermal" && <ThermalCalc onShare={onShareWithTeacher} />}
      {activeCalc === "water-activity" && <WaterActivityCalc onShare={onShareWithTeacher} />}
      {activeCalc === "nutrition" && <NutritionCalc onShare={onShareWithTeacher} />}
      {activeCalc === "pasteurization" && <PasteurizationCalc onShare={onShareWithTeacher} />}
    </div>
  );
}

function CalcField({ label, value, onChange, unit, hint }: {
  label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[#a6adc8] mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-lime-400/50 transition-colors"
          style={{ direction: "ltr" }}
        />
        {unit && <span className="text-xs text-[#6e6a86] shrink-0 font-mono">{unit}</span>}
      </div>
      {hint && <p className="text-[10px] text-[#6e6a86] mt-1">{hint}</p>}
    </div>
  );
}

function ResultBox({ label, value, unit, color = "lime" }: { label: string; value: string; unit?: string; color?: string }) {
  const colors: Record<string, string> = {
    lime: "border-lime-400/30 bg-lime-400/5 text-lime-300",
    gold: "border-yellow-400/30 bg-yellow-400/5 text-yellow-300",
    red: "border-red-400/30 bg-red-400/5 text-red-300",
    blue: "border-blue-400/30 bg-blue-400/5 text-blue-300",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.lime}`}>
      <p className="text-[10px] opacity-60 mb-1">{label}</p>
      <p className="text-sm sm:text-lg font-bold font-mono truncate" style={{ direction: "ltr" }}>{value} {unit || ""}</p>
    </div>
  );
}

function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all"
    >
      <span>📤</span>
      <span>شارك النتيجة مع المعلم</span>
    </button>
  );
}

function ThermalCalc({ onShare }: { onShare?: (s: string) => void }) {
  const [n0, setN0] = useState("1000000");
  const [n, setN] = useState("1");
  const [t, setT] = useState("5");
  const [dRef, setDRef] = useState("1.5");
  const [tRef, setTRef] = useState("121");
  const [tActual, setTActual] = useState("115");

  const D = parseFloat(dRef);
  const logReduction = Math.log10(parseFloat(n0) / parseFloat(n));
  const fValue = D * logReduction;
  const z = 10;
  const dAtTemp = D * Math.pow(10, (parseFloat(tRef) - parseFloat(tActual)) / z);
  const fAtTemp = dAtTemp * logReduction;

  const shareText = `حاسبة المعاملات الحرارية:\n• N₀ = ${n0} CFU/g\n• N = ${n} CFU/g\n• D-value (${tRef}°C) = ${dRef} min\n• Log reduction = ${logReduction.toFixed(2)}\n• F-value (${tRef}°C) = ${fValue.toFixed(2)} min\n• D-value (${tActual}°C) = ${dAtTemp.toFixed(2)} min\n• F-value (${tActual}°C) = ${fAtTemp.toFixed(2)} min`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
        <h4 className="text-sm font-bold text-lime-300 mb-3 flex items-center gap-2">
          <Thermometer className="w-4 h-4" /> حساب D-value و F-value
        </h4>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <CalcField label="العدد الابتدائي للبكتيريا (N₀)" value={n0} onChange={setN0} unit="CFU/g" hint="عدد الخلايا البكتيرية الابتدائي" />
          <CalcField label="العدد المطلوب بعد المعاملة (N)" value={n} onChange={setN} unit="CFU/g" hint="العدد المستهدف بعد المعاملة الحرارية" />
          <CalcField label="D-value عند درجة الحرارة المرجعية" value={dRef} onChange={setDRef} unit="دقيقة" hint="الزمن اللازم لقتل 90% من البكتيريا" />
          <CalcField label="درجة الحرارة المرجعية" value={tRef} onChange={setTRef} unit="°C" />
          <CalcField label="درجة الحرارة الفعلية" value={tActual} onChange={setTActual} unit="°C" hint="درجة حرارة التعقيم الفعلية" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <ResultBox label="Log Reduction" value={isFinite(logReduction) ? logReduction.toFixed(2) : "—"} color="blue" />
          <ResultBox label={`F-value (${tRef}°C)`} value={isFinite(fValue) ? fValue.toFixed(2) : "—"} unit="min" color="lime" />
          <ResultBox label={`D (${tActual}°C)`} value={isFinite(dAtTemp) ? dAtTemp.toFixed(2) : "—"} unit="min" color="gold" />
          <ResultBox label={`F (${tActual}°C)`} value={isFinite(fAtTemp) ? fAtTemp.toFixed(2) : "—"} unit="min" color="red" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#6e6a86]">z-value = {z}°C (افتراضي لـ C. botulinum)</p>
          {onShare && <ShareButton onClick={() => onShare(shareText)} />}
        </div>
      </div>
    </div>
  );
}

function WaterActivityCalc({ onShare }: { onShare?: (s: string) => void }) {
  const [aw, setAw] = useState("0.85");
  const awVal = parseFloat(aw);

  const getRisk = (val: number) => {
    if (val >= 0.95) return { level: "خطر عالٍ جداً", bacteria: "جميع البكتيريا، الخمائر، الفطريات", color: "text-red-400", examples: "اللحوم الطازجة، الحليب، الخضار" };
    if (val >= 0.91) return { level: "خطر عالٍ", bacteria: "معظم البكتيريا (Salmonella, E.coli, C.botulinum)", color: "text-red-400", examples: "الخبز الطازج، النقانق" };
    if (val >= 0.87) return { level: "خطر متوسط", bacteria: "Staphylococcus aureus، معظم الخمائر", color: "text-orange-400", examples: "الأجبان الطرية، المربيات" };
    if (val >= 0.80) return { level: "خطر منخفض", bacteria: "الفطريات فقط (Aspergillus)", color: "text-yellow-400", examples: "الفواكه المجففة، المربيات المركزة" };
    if (val >= 0.60) return { level: "آمن نسبياً", bacteria: "بعض الفطريات المقاومة للجفاف فقط", color: "text-lime-400", examples: "الدقيق، الأرز، العسل" };
    return { level: "آمن", bacteria: "لا نمو ميكروبي ممكن", color: "text-emerald-400", examples: "البسكويت، الحليب المجفف، التوابل" };
  };

  const risk = getRisk(awVal);
  const shareText = `حاسبة النشاط المائي:\n• Aw = ${aw}\n• مستوى الخطر: ${risk.level}\n• كائنات ممكن تنمو: ${risk.bacteria}\n• أمثلة أغذية: ${risk.examples}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
        <h4 className="text-sm font-bold text-lime-300 mb-3 flex items-center gap-2">
          <Droplets className="w-4 h-4" /> النشاط المائي وسلامة الغذاء
        </h4>
        <div className="mb-4">
          <label className="text-xs text-[#a6adc8] mb-2 block">النشاط المائي (Aw): <span className="text-lime-300 font-bold font-mono">{aw}</span></label>
          <input
            type="range" min="0" max="1" step="0.01" value={aw}
            onChange={e => setAw(e.target.value)}
            className="w-full accent-lime-400"
          />
          <div className="flex justify-between text-[10px] text-[#6e6a86] mt-1">
            <span>0.0 (جاف تماماً)</span>
            <span>0.5</span>
            <span>1.0 (ماء نقي)</span>
          </div>
        </div>

        <div className={`rounded-xl border border-white/10 p-4 bg-[#1e1e2e] mb-3`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${risk.color}`} />
            <span className={`text-sm font-bold ${risk.color}`}>{risk.level}</span>
          </div>
          <div className="space-y-2 text-xs">
            <p><span className="text-[#6e6a86]">كائنات ممكن تنمو:</span> <span className="text-white/90">{risk.bacteria}</span></p>
            <p><span className="text-[#6e6a86]">أمثلة أغذية بهذا Aw:</span> <span className="text-white/90">{risk.examples}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1e1e2e] p-3 mb-3">
          <p className="text-[10px] text-[#6e6a86] mb-2">مخطط النشاط المائي ونمو الكائنات:</p>
          <div className="flex gap-1 h-6 rounded overflow-hidden">
            {[
              { from: 0, to: 0.6, color: "bg-emerald-500", label: "آمن" },
              { from: 0.6, to: 0.8, color: "bg-lime-500", label: "فطريات" },
              { from: 0.8, to: 0.87, color: "bg-yellow-500", label: "خمائر" },
              { from: 0.87, to: 0.91, color: "bg-orange-500", label: "Staph" },
              { from: 0.91, to: 0.95, color: "bg-red-500", label: "بكتيريا" },
              { from: 0.95, to: 1.0, color: "bg-red-700", label: "كل شي" },
            ].map((band, i) => (
              <div key={i} className={`${band.color} relative group`} style={{ flex: (band.to - band.from) * 100 }}>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/70 whitespace-nowrap overflow-hidden">{band.label}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-1" style={{ direction: "ltr" }}>
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white absolute -top-1" style={{ left: `${awVal * 100}%`, transform: "translateX(-50%)" }} />
          </div>
        </div>
        {onShare && <div className="flex justify-end"><ShareButton onClick={() => onShare(shareText)} /></div>}
      </div>
    </div>
  );
}

function NutritionCalc({ onShare }: { onShare?: (s: string) => void }) {
  const [protein, setProtein] = useState("20");
  const [fat, setFat] = useState("10");
  const [carbs, setCarbs] = useState("50");
  const [fiber, setFiber] = useState("5");
  const [weight, setWeight] = useState("100");

  const p = parseFloat(protein) || 0;
  const f = parseFloat(fat) || 0;
  const c = parseFloat(carbs) || 0;
  const fb = parseFloat(fiber) || 0;
  const w = parseFloat(weight) || 100;

  const caloriesP = p * 4;
  const caloriesF = f * 9;
  const caloriesC = c * 4;
  const totalCal = caloriesP + caloriesF + caloriesC;
  const totalCalForWeight = (totalCal * w) / 100;
  const pctP = totalCal > 0 ? (caloriesP / totalCal * 100) : 0;
  const pctF = totalCal > 0 ? (caloriesF / totalCal * 100) : 0;
  const pctC = totalCal > 0 ? (caloriesC / totalCal * 100) : 0;

  const shareText = `حاسبة التركيب الغذائي:\n• بروتين: ${protein}g (${pctP.toFixed(1)}% من السعرات)\n• دهون: ${fat}g (${pctF.toFixed(1)}% من السعرات)\n• كربوهيدرات: ${carbs}g (${pctC.toFixed(1)}% من السعرات)\n• ألياف: ${fiber}g\n• إجمالي السعرات لكل 100g: ${totalCal.toFixed(0)} kcal\n• السعرات لـ ${weight}g: ${totalCalForWeight.toFixed(0)} kcal`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
        <h4 className="text-sm font-bold text-lime-300 mb-3 flex items-center gap-2">
          <Apple className="w-4 h-4" /> حاسبة التركيب الغذائي
        </h4>
        <p className="text-[10px] text-[#6e6a86] mb-3">القيم لكل 100 جرام من المنتج</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <CalcField label="البروتين" value={protein} onChange={setProtein} unit="g/100g" />
          <CalcField label="الدهون" value={fat} onChange={setFat} unit="g/100g" />
          <CalcField label="الكربوهيدرات" value={carbs} onChange={setCarbs} unit="g/100g" />
          <CalcField label="الألياف" value={fiber} onChange={setFiber} unit="g/100g" />
          <CalcField label="وزن الحصة" value={weight} onChange={setWeight} unit="g" hint="لحساب السعرات الفعلية" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <ResultBox label="سعرات/100g" value={totalCal.toFixed(0)} unit="kcal" color="lime" />
          <ResultBox label={`سعرات/${weight}g`} value={totalCalForWeight.toFixed(0)} unit="kcal" color="gold" />
          <ResultBox label="بروتين %" value={pctP.toFixed(1)} unit="%" color="blue" />
          <ResultBox label="دهون %" value={pctF.toFixed(1)} unit="%" color="red" />
        </div>

        <div className="rounded-xl border border-white/5 bg-[#1e1e2e] p-3 mb-3">
          <p className="text-[10px] text-[#6e6a86] mb-2">توزيع السعرات الحرارية:</p>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {pctP > 0 && <div className="bg-blue-500 flex items-center justify-center" style={{ flex: pctP }}><span className="text-[9px] font-bold text-white">بروتين {pctP.toFixed(0)}%</span></div>}
            {pctF > 0 && <div className="bg-red-500 flex items-center justify-center" style={{ flex: pctF }}><span className="text-[9px] font-bold text-white">دهون {pctF.toFixed(0)}%</span></div>}
            {pctC > 0 && <div className="bg-yellow-500 flex items-center justify-center" style={{ flex: pctC }}><span className="text-[9px] font-bold text-black">كربوهيدرات {pctC.toFixed(0)}%</span></div>}
          </div>
        </div>
        {onShare && <div className="flex justify-end"><ShareButton onClick={() => onShare(shareText)} /></div>}
      </div>
    </div>
  );
}

function PasteurizationCalc({ onShare }: { onShare?: (s: string) => void }) {
  const [dRef, setDRef] = useState("0.25");
  const [tRef, setTRef] = useState("72");
  const [zVal, setZVal] = useState("7");
  const [tTarget, setTTarget] = useState("63");
  const [logTarget, setLogTarget] = useState("5");

  const D = parseFloat(dRef);
  const z = parseFloat(zVal);
  const dAtTarget = D * Math.pow(10, (parseFloat(tRef) - parseFloat(tTarget)) / z);
  const pastTime = dAtTarget * parseFloat(logTarget);

  const method = parseFloat(tTarget) >= 72 ? "بسترة سريعة (HTST)" : parseFloat(tTarget) >= 63 ? "بسترة بطيئة (LTLT)" : "معاملة حرارية منخفضة";
  const shareText = `حاسبة زمن البسترة:\n• D-value المرجعية (${tRef}°C) = ${dRef} min\n• z-value = ${zVal}°C\n• درجة الحرارة المستهدفة = ${tTarget}°C\n• عدد اختزالات Log = ${logTarget}\n• D-value عند ${tTarget}°C = ${dAtTarget.toFixed(3)} min\n• زمن البسترة المطلوب = ${pastTime.toFixed(2)} min\n• نوع البسترة: ${method}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/3 p-4">
        <h4 className="text-sm font-bold text-lime-300 mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" /> حساب زمن البسترة
        </h4>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <CalcField label="D-value المرجعية" value={dRef} onChange={setDRef} unit="دقيقة" hint="مثال: 0.25 min عند 72°C للحليب" />
          <CalcField label="درجة الحرارة المرجعية" value={tRef} onChange={setTRef} unit="°C" />
          <CalcField label="z-value" value={zVal} onChange={setZVal} unit="°C" hint="z=7°C للبسترة، z=10°C للتعقيم" />
          <CalcField label="درجة الحرارة المستهدفة" value={tTarget} onChange={setTTarget} unit="°C" />
          <CalcField label="عدد اختزالات Log المطلوبة" value={logTarget} onChange={setLogTarget} hint="5-log = قتل 99.999%" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <ResultBox label={`D عند ${tTarget}°C`} value={isFinite(dAtTarget) ? dAtTarget.toFixed(3) : "—"} unit="min" color="gold" />
          <ResultBox label="زمن البسترة" value={isFinite(pastTime) ? pastTime.toFixed(2) : "—"} unit="min" color="lime" />
          <div className="col-span-2 sm:col-span-1">
            <ResultBox label="نوع المعاملة" value={method} color="blue" />
          </div>
        </div>
        {onShare && <div className="flex justify-end"><ShareButton onClick={() => onShare(shareText)} /></div>}
      </div>
    </div>
  );
}

function ChartsTab({ onShareWithTeacher }: { onShareWithTeacher?: (s: string) => void }) {
  const [activeChart, setActiveChart] = useState<ChartType>("growth");
  const charts: { id: ChartType; label: string; icon: React.ReactNode }[] = [
    { id: "growth", label: "منحنى النمو البكتيري", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "death", label: "منحنى الموت الحراري", icon: <Thermometer className="w-4 h-4" /> },
    { id: "water-activity", label: "النشاط المائي والنمو", icon: <Droplets className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        {charts.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveChart(c.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeChart === c.id
                ? "bg-lime-400/15 text-lime-300 border border-lime-400/30"
                : "bg-white/3 text-[#6e6a86] border border-white/5 hover:bg-white/5"
            }`}
          >
            {c.icon}{c.label}
          </button>
        ))}
      </div>
      {activeChart === "growth" && <GrowthCurveChart onShare={onShareWithTeacher} />}
      {activeChart === "death" && <DeathCurveChart onShare={onShareWithTeacher} />}
      {activeChart === "water-activity" && <WaterActivityChart onShare={onShareWithTeacher} />}
    </div>
  );
}

function GrowthCurveChart({ onShare }: { onShare?: (s: string) => void }) {
  const [temp, setTemp] = useState(37);
  const [ph, setPh] = useState(7.0);

  const data = useMemo(() => {
    const growthRate = Math.max(0, 1 - Math.abs(temp - 37) / 30) * Math.max(0, 1 - Math.abs(ph - 7) / 4);
    const lagTime = Math.max(1, 4 / (growthRate + 0.01));
    const points = [];
    for (let t = 0; t <= 48; t += 0.5) {
      let logN;
      if (t < lagTime) {
        logN = 3 + (t / lagTime) * 0.2;
      } else if (t < lagTime + 12 / (growthRate + 0.05)) {
        const expTime = t - lagTime;
        logN = 3.2 + expTime * growthRate * 0.5;
      } else {
        const maxLog = 3.2 + (12 / (growthRate + 0.05)) * growthRate * 0.5;
        const declineTime = t - lagTime - 12 / (growthRate + 0.05);
        logN = Math.max(maxLog - declineTime * 0.02, maxLog * 0.8);
      }
      logN = Math.min(logN, 10);
      points.push({ time: t, logCFU: parseFloat(logN.toFixed(2)) });
    }
    return points;
  }, [temp, ph]);

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-4">
      <h4 className="text-sm font-bold text-lime-300 mb-3">منحنى النمو البكتيري التفاعلي</h4>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-[#a6adc8] mb-1 block">درجة الحرارة: <span className="text-lime-300 font-bold">{temp}°C</span></label>
          <input type="range" min="0" max="60" step="1" value={temp} onChange={e => setTemp(+e.target.value)} className="w-full accent-lime-400" />
          <div className="flex justify-between text-[10px] text-[#6e6a86]"><span>0°C</span><span>37°C (مثالي)</span><span>60°C</span></div>
        </div>
        <div>
          <label className="text-xs text-[#a6adc8] mb-1 block">الرقم الهيدروجيني pH: <span className="text-lime-300 font-bold">{ph.toFixed(1)}</span></label>
          <input type="range" min="2" max="12" step="0.1" value={ph} onChange={e => setPh(+e.target.value)} className="w-full accent-lime-400" />
          <div className="flex justify-between text-[10px] text-[#6e6a86]"><span>2 (حمضي)</span><span>7 (متعادل)</span><span>12 (قلوي)</span></div>
        </div>
      </div>
      <div className="h-[200px] sm:h-[250px] w-full" style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#6e6a86" fontSize={9} label={{ value: "Time (h)", position: "insideBottom", offset: -5, fill: "#6e6a86", fontSize: 9 }} />
            <YAxis stroke="#6e6a86" fontSize={9} label={{ value: "Log CFU/g", angle: -90, position: "insideLeft", fill: "#6e6a86", fontSize: 9 }} domain={[0, 11]} />
            <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }} labelFormatter={v => `${v} ساعة`} formatter={(v: number) => [`${v} log CFU/g`, "الكثافة"]} />
            <Area type="monotone" dataKey="logCFU" stroke="#84cc16" fill="url(#growthGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-[#6e6a86]">
        <span className="bg-white/5 px-2 py-1 rounded">🔵 طور التأخر (Lag)</span>
        <span className="bg-white/5 px-2 py-1 rounded">📈 طور النمو الأُسّي (Log)</span>
        <span className="bg-white/5 px-2 py-1 rounded">📊 الطور الثابت (Stationary)</span>
        <span className="bg-white/5 px-2 py-1 rounded">📉 طور الموت (Death)</span>
      </div>
      {onShare && <div className="flex justify-end mt-3"><ShareButton onClick={() => onShare(`منحنى النمو البكتيري عند ${temp}°C وpH ${ph.toFixed(1)}:\n• أقصى كثافة: ${Math.max(...data.map(d => d.logCFU)).toFixed(2)} log CFU/g`)} /></div>}
    </div>
  );
}

function DeathCurveChart({ onShare }: { onShare?: (s: string) => void }) {
  const [temp, setTemp] = useState(121);
  const [dValue, setDValue] = useState(1.5);

  const data = useMemo(() => {
    const points = [];
    for (let t = 0; t <= 15; t += 0.25) {
      const logN = Math.max(0, 6 - (t / dValue));
      points.push({ time: t, logCFU: parseFloat(logN.toFixed(2)) });
    }
    return points;
  }, [temp, dValue]);

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-4">
      <h4 className="text-sm font-bold text-lime-300 mb-3">منحنى الموت الحراري (Thermal Death Curve)</h4>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-[#a6adc8] mb-1 block">درجة الحرارة: <span className="text-lime-300 font-bold">{temp}°C</span></label>
          <input type="range" min="60" max="140" step="1" value={temp} onChange={e => { setTemp(+e.target.value); setDValue(Math.max(0.1, 1.5 * Math.pow(10, (121 - (+e.target.value)) / 10))); }} className="w-full accent-red-400" />
          <div className="flex justify-between text-[10px] text-[#6e6a86]"><span>60°C</span><span>100°C</span><span>140°C</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ResultBox label="D-value" value={dValue.toFixed(2)} unit="min" color="red" />
          <ResultBox label="12D (تعقيم تجاري)" value={(dValue * 12).toFixed(1)} unit="min" color="gold" />
        </div>
      </div>
      <div className="h-[200px] sm:h-[250px] w-full" style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="time" stroke="#6e6a86" fontSize={9} label={{ value: "Time (min)", position: "insideBottom", offset: -5, fill: "#6e6a86", fontSize: 9 }} />
            <YAxis stroke="#6e6a86" fontSize={9} label={{ value: "Log CFU/g", angle: -90, position: "insideLeft", fill: "#6e6a86", fontSize: 9 }} domain={[0, 7]} />
            <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }} labelFormatter={v => `${v} دقيقة`} formatter={(v: number) => [`${v} log CFU/g`, "البقاء"]} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "تعقيم كامل", fill: "#ef4444", fontSize: 10 }} />
            <Line type="monotone" dataKey="logCFU" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {onShare && <div className="flex justify-end mt-3"><ShareButton onClick={() => onShare(`منحنى الموت الحراري عند ${temp}°C:\n• D-value = ${dValue.toFixed(2)} min\n• 12D (تعقيم تجاري) = ${(dValue * 12).toFixed(1)} min`)} /></div>}
    </div>
  );
}

function WaterActivityChart({ onShare }: { onShare?: (s: string) => void }) {
  const data = useMemo(() => {
    const points = [];
    for (let aw = 0; aw <= 1; aw += 0.02) {
      const bacteria = aw > 0.91 ? Math.pow((aw - 0.91) / 0.09, 1.5) * 100 : 0;
      const yeast = aw > 0.87 ? Math.pow((aw - 0.87) / 0.13, 1.5) * 80 : 0;
      const mold = aw > 0.70 ? Math.pow((aw - 0.70) / 0.30, 1.5) * 60 : 0;
      points.push({
        aw: parseFloat(aw.toFixed(2)),
        bacteria: parseFloat(bacteria.toFixed(1)),
        yeast: parseFloat(yeast.toFixed(1)),
        mold: parseFloat(mold.toFixed(1)),
      });
    }
    return points;
  }, []);

  return (
    <div className="rounded-xl border border-white/5 bg-white/3 p-4">
      <h4 className="text-sm font-bold text-lime-300 mb-3">علاقة النشاط المائي بنمو الكائنات الدقيقة</h4>
      <div className="h-[220px] sm:h-[280px] w-full" style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="bacGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              <linearGradient id="yeaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
              <linearGradient id="molGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} /><stop offset="95%" stopColor="#84cc16" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="aw" stroke="#6e6a86" fontSize={9} label={{ value: "Water Activity (Aw)", position: "insideBottom", offset: -5, fill: "#6e6a86", fontSize: 9 }} />
            <YAxis stroke="#6e6a86" fontSize={9} label={{ value: "Growth Rate %", angle: -90, position: "insideLeft", fill: "#6e6a86", fontSize: 9 }} />
            <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid #ffffff15", borderRadius: 8, fontSize: 11 }} labelFormatter={v => `Aw = ${v}`} />
            <Area type="monotone" dataKey="mold" name="فطريات" stroke="#84cc16" fill="url(#molGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="yeast" name="خمائر" stroke="#f59e0b" fill="url(#yeaGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="bacteria" name="بكتيريا" stroke="#ef4444" fill="url(#bacGrad)" strokeWidth={2} dot={false} />
            <ReferenceLine x={0.6} stroke="#10b981" strokeDasharray="5 5" label={{ value: "حد الأمان", fill: "#10b981", fontSize: 9, position: "top" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> بكتيريا (Aw &gt; 0.91)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> خمائر (Aw &gt; 0.87)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-lime-500" /> فطريات (Aw &gt; 0.70)</span>
      </div>
      {onShare && <div className="flex justify-end mt-3"><ShareButton onClick={() => onShare("مخطط علاقة النشاط المائي بنمو الكائنات الدقيقة:\n• البكتيريا تنمو عند Aw > 0.91\n• الخمائر تنمو عند Aw > 0.87\n• الفطريات تنمو عند Aw > 0.70\n• حد الأمان: Aw < 0.60")} /></div>}
    </div>
  );
}

interface HACCPStep {
  id: string;
  name: string;
  isCCP: boolean;
  hazard: string;
  criticalLimit: string;
  monitoring: string;
  corrective: string;
}

function HACCPTab({ onShareWithTeacher }: { onShareWithTeacher?: (s: string) => void }) {
  const [steps, setSteps] = useState<HACCPStep[]>([
    { id: "1", name: "استقبال المواد الخام", isCCP: true, hazard: "تلوث بيولوجي (بكتيريا ممرضة)", criticalLimit: "درجة الحرارة < 5°C", monitoring: "قياس درجة الحرارة عند الاستلام", corrective: "رفض الشحنة إذا تجاوزت الحرارة الحد" },
    { id: "2", name: "التخزين المبرد", isCCP: false, hazard: "", criticalLimit: "", monitoring: "", corrective: "" },
    { id: "3", name: "التحضير والخلط", isCCP: false, hazard: "", criticalLimit: "", monitoring: "", corrective: "" },
    { id: "4", name: "المعاملة الحرارية", isCCP: true, hazard: "بقاء كائنات ممرضة", criticalLimit: "72°C لمدة 15 ثانية (بسترة)", monitoring: "مراقبة مستمرة للحرارة والزمن", corrective: "إعادة المعاملة الحرارية" },
    { id: "5", name: "التبريد السريع", isCCP: true, hazard: "إعادة نمو البكتيريا", criticalLimit: "الوصول إلى < 5°C خلال 90 دقيقة", monitoring: "قياس الحرارة كل 15 دقيقة", corrective: "تقليل كمية المنتج أو زيادة التبريد" },
    { id: "6", name: "التعبئة والتغليف", isCCP: false, hazard: "", criticalLimit: "", monitoring: "", corrective: "" },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>("1");

  const addStep = () => {
    const newStep: HACCPStep = {
      id: Date.now().toString(),
      name: "خطوة جديدة",
      isCCP: false, hazard: "", criticalLimit: "", monitoring: "", corrective: "",
    };
    setSteps(prev => [...prev, newStep]);
    setExpandedId(newStep.id);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<HACCPStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const shareHACCP = () => {
    const ccpCount = steps.filter(s => s.isCCP).length;
    let text = `مخطط HACCP (${steps.length} خطوة، ${ccpCount} نقطة تحكم حرجة):\n\n`;
    steps.forEach((s, i) => {
      text += `${i + 1}. ${s.name}${s.isCCP ? " ⚠️ [CCP]" : ""}\n`;
      if (s.isCCP) {
        text += `   • الخطر: ${s.hazard || "—"}\n`;
        text += `   • الحد الحرج: ${s.criticalLimit || "—"}\n`;
        text += `   • المراقبة: ${s.monitoring || "—"}\n`;
        text += `   • الإجراء التصحيحي: ${s.corrective || "—"}\n`;
      }
    });
    onShareWithTeacher?.(text);
  };

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-lime-300 flex items-center gap-2">
            <Shield className="w-4 h-4" /> مُنشئ مخطط HACCP
          </h4>
          <p className="text-[10px] text-[#6e6a86] mt-0.5">صمّم مخطط تدفق العملية وحدد نقاط التحكم الحرجة (CCPs)</p>
        </div>
        <button onClick={addStep} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all self-start">
          <Plus className="w-3.5 h-3.5" /> إضافة خطوة
        </button>
      </div>

      <div className="relative">
        <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-white/10 z-0" />

        <div className="space-y-3 relative z-10">
          {steps.map((step, i) => (
            <div key={step.id} className={`rounded-xl border transition-all ${
              step.isCCP
                ? "border-red-400/30 bg-red-400/5"
                : "border-white/5 bg-white/3"
            }`}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  step.isCCP ? "bg-red-500 text-white" : "bg-white/10 text-[#6e6a86]"
                }`}>
                  {step.isCCP ? "⚠️" : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  {expandedId === step.id ? (
                    <input
                      value={step.name}
                      onChange={e => updateStep(step.id, { name: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      className="w-full bg-transparent border-b border-white/20 text-sm font-bold text-white outline-none py-0.5"
                    />
                  ) : (
                    <span className="text-sm font-bold">{step.name}</span>
                  )}
                  {step.isCCP && <span className="text-[10px] text-red-400 font-bold mr-2">CCP — نقطة تحكم حرجة</span>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); updateStep(step.id, { isCCP: !step.isCCP }); }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                      step.isCCP
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-white/5 text-[#6e6a86] border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {step.isCCP ? "CCP ✓" : "CCP"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeStep(step.id); }} className="text-[#6e6a86] hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedId === step.id ? <ChevronUp className="w-4 h-4 text-[#6e6a86]" /> : <ChevronDown className="w-4 h-4 text-[#6e6a86]" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === step.id && step.isCCP && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 sm:pr-14 space-y-2">
                      <HACCPField label="الخطر المحتمل" value={step.hazard} onChange={v => updateStep(step.id, { hazard: v })} placeholder="مثال: تلوث بيولوجي بالسالمونيلا" />
                      <HACCPField label="الحد الحرج" value={step.criticalLimit} onChange={v => updateStep(step.id, { criticalLimit: v })} placeholder="مثال: درجة الحرارة ≥ 72°C لمدة 15 ثانية" />
                      <HACCPField label="إجراء المراقبة" value={step.monitoring} onChange={v => updateStep(step.id, { monitoring: v })} placeholder="مثال: فحص الحرارة كل 30 دقيقة" />
                      <HACCPField label="الإجراء التصحيحي" value={step.corrective} onChange={v => updateStep(step.id, { corrective: v })} placeholder="مثال: إعادة المعاملة الحرارية أو حجز المنتج" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {i < steps.length - 1 && (
                <div className="flex justify-center -mb-1.5 relative z-20">
                  <div className="w-0 h-0 border-r-4 border-l-4 border-t-4 border-r-transparent border-l-transparent border-t-white/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-[#6e6a86]">
          <span>إجمالي الخطوات: {steps.length}</span>
          <span>نقاط التحكم الحرجة: {steps.filter(s => s.isCCP).length}</span>
        </div>
        {onShareWithTeacher && <ShareButton onClick={shareHACCP} />}
      </div>
    </div>
  );
}

function HACCPField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#a6adc8] mb-0.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-lime-400/50 transition-colors placeholder:text-[#3a3a4a]"
      />
    </div>
  );
}
