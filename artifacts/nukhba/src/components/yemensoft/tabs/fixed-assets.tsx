import { useState } from "react";
import { Landmark, Plus, Calculator, TrendingDown } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum, todayStr } from "../utils";
import type { FixedAsset, DepreciationEntry } from "../types";

export function FixedAssetsTab() {
  const { fixedAssets, setFixedAssets, addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("أثاث ومعدات");
  const [purchaseDate, setPurchaseDate] = useState(todayStr());
  const [cost, setCost] = useState("");
  const [salvage, setSalvage] = useState("0");
  const [usefulLife, setUsefulLife] = useState("5");
  const [depMethod, setDepMethod] = useState<"straight-line" | "declining">("straight-line");
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

  const totalCost = fixedAssets.reduce((s, a) => s + a.cost, 0);
  const totalAccDep = fixedAssets.reduce((s, a) => s + a.accumulatedDep, 0);
  const totalBookValue = totalCost - totalAccDep;

  const addAsset = () => {
    if (!name.trim() || !code.trim() || Number(cost) <= 0) return;
    const newAsset: FixedAsset = {
      id: fixedAssets.length + 1, code, name, category, purchaseDate,
      cost: Number(cost), salvageValue: Number(salvage), usefulLifeYears: Number(usefulLife),
      depMethod, accumulatedDep: 0, status: "active", depEntries: [],
    };
    setFixedAssets(prev => [...prev, newAsset]);
    addJournalEntry(purchaseDate, `شراء أصل ثابت: ${name}`, [
      { accountCode: "1500", debit: Number(cost), credit: 0, description: "أصول ثابتة" },
      { accountCode: "1100", debit: 0, credit: Number(cost), description: "الصندوق" },
    ], "الأصول الثابتة");
    setName(""); setCode(""); setCost(""); setSalvage("0"); setShowAdd(false);
  };

  const calculateDepreciation = (asset: FixedAsset): number => {
    const depreciableAmount = asset.cost - asset.salvageValue;
    const remaining = depreciableAmount - asset.accumulatedDep;
    if (remaining <= 0) return 0;

    if (asset.depMethod === "straight-line") {
      const annual = depreciableAmount / asset.usefulLifeYears;
      return Math.min(annual, remaining);
    } else {
      const rate = (2 / asset.usefulLifeYears);
      const bookValue = asset.cost - asset.accumulatedDep;
      const dep = bookValue * rate;
      return Math.min(dep, remaining);
    }
  };

  const runDepreciation = (asset: FixedAsset) => {
    const depAmount = calculateDepreciation(asset);
    if (depAmount <= 0) return;

    const newAccumulated = asset.accumulatedDep + depAmount;
    const newBookValue = asset.cost - newAccumulated;
    const entry: DepreciationEntry = {
      date: todayStr(), amount: depAmount,
      accumulated: newAccumulated, bookValue: newBookValue,
    };

    setFixedAssets(prev => prev.map(a => {
      if (a.id !== asset.id) return a;
      return {
        ...a, accumulatedDep: newAccumulated,
        depEntries: [...a.depEntries, entry],
        status: newBookValue <= a.salvageValue ? "fully-depreciated" : "active",
      };
    }));

    addJournalEntry(todayStr(), `استهلاك ${asset.name} — الفترة ${asset.depEntries.length + 1}`, [
      { accountCode: "5600", debit: depAmount, credit: 0, description: "مصروف استهلاك" },
      { accountCode: "1510", debit: 0, credit: depAmount, description: "مجمع الاستهلاك" },
    ], "الأصول الثابتة");
  };

  const disposeAsset = (asset: FixedAsset) => {
    const bookValue = asset.cost - asset.accumulatedDep;
    setFixedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: "disposed" } : a));
    addJournalEntry(todayStr(), `التخلص من أصل: ${asset.name}`, [
      { accountCode: "1510", debit: asset.accumulatedDep, credit: 0, description: "مجمع الاستهلاك" },
      ...(bookValue > 0 ? [{ accountCode: "5400", debit: bookValue, credit: 0, description: "خسارة استبعاد أصل" }] : []),
      { accountCode: "1500", debit: 0, credit: asset.cost, description: "أصول ثابتة" },
    ], "الأصول الثابتة");
  };

  const shareAssets = () => {
    if (!onShareWithTeacher) return;
    let text = `سجل الأصول الثابتة:\n\nإجمالي التكلفة: ${formatNum(totalCost)} ريال\nمجمع الاستهلاك: ${formatNum(totalAccDep)} ريال\nصافي القيمة الدفترية: ${formatNum(totalBookValue)} ريال\n\n`;
    for (const a of fixedAssets) {
      text += `• ${a.code} — ${a.name}\n  التكلفة: ${formatNum(a.cost)} | الاستهلاك: ${formatNum(a.accumulatedDep)} | الدفترية: ${formatNum(a.cost - a.accumulatedDep)}\n  الطريقة: ${a.depMethod === "straight-line" ? "القسط الثابت" : "القسط المتناقص"} | العمر: ${a.usefulLifeYears} سنوات | الحالة: ${a.status === "active" ? "نشط" : a.status === "disposed" ? "مستبعد" : "مستهلك بالكامل"}\n`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Landmark className="w-4 h-4 text-teal-400" /> الأصول الثابتة والاستهلاك</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && fixedAssets.length > 0 && <ShareButton onClick={shareAssets} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> أصل جديد</button>
        </div>
      </div>

      {fixedAssets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">التكلفة</div><div className="text-xs sm:text-sm font-bold text-blue-400 font-mono">{formatNum(totalCost)}</div></div>
          <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">مجمع الاستهلاك</div><div className="text-xs sm:text-sm font-bold text-red-400 font-mono">{formatNum(totalAccDep)}</div></div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">القيمة الدفترية</div><div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">{formatNum(totalBookValue)}</div></div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SimField label="رمز الأصل" value={code} onChange={setCode} placeholder="FA001" dir="ltr" />
            <SimField label="اسم الأصل" value={name} onChange={setName} placeholder="مثال: سيارة نقل" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="التكلفة (ريال)" value={cost} onChange={setCost} type="number" dir="ltr" />
            <SimField label="قيمة الخردة" value={salvage} onChange={setSalvage} type="number" dir="ltr" />
            <SimField label="العمر الإنتاجي (سنوات)" value={usefulLife} onChange={setUsefulLife} type="number" dir="ltr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="تاريخ الشراء" value={purchaseDate} onChange={setPurchaseDate} type="date" dir="ltr" />
            <SimSelect label="التصنيف" value={category} onChange={setCategory} options={[{ value: "أثاث ومعدات", label: "أثاث ومعدات" }, { value: "سيارات", label: "سيارات" }, { value: "معدات حاسب", label: "معدات حاسب" }, { value: "مباني", label: "مباني" }, { value: "أخرى", label: "أخرى" }]} />
            <SimSelect label="طريقة الاستهلاك" value={depMethod} onChange={v => setDepMethod(v as "straight-line" | "declining")} options={[{ value: "straight-line", label: "القسط الثابت" }, { value: "declining", label: "القسط المتناقص المزدوج" }]} />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addAsset} disabled={!name.trim() || Number(cost) <= 0}>حفظ الأصل</ActionButton></div>
        </div>
      )}

      {fixedAssets.length === 0 ? (
        <EmptyState icon={<Landmark className="w-10 h-10" />} title="لا توجد أصول ثابتة" subtitle="أضف أصولاً لحساب الاستهلاك وتتبع القيمة الدفترية" />
      ) : (
        <div className="space-y-2">
          {fixedAssets.map(asset => {
            const bookValue = asset.cost - asset.accumulatedDep;
            const depPercent = (asset.accumulatedDep / (asset.cost - asset.salvageValue)) * 100;
            const nextDep = calculateDepreciation(asset);
            return (
              <div key={asset.id} className="rounded-xl border border-white/5 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white">{asset.name}</span>
                    <span className="text-[10px] font-mono text-[#6e6a86]">{asset.code}</span>
                  </div>
                  <Badge color={asset.status === "active" ? "emerald" : asset.status === "disposed" ? "red" : "amber"}>
                    {asset.status === "active" ? "نشط" : asset.status === "disposed" ? "مستبعد" : "مستهلك بالكامل"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="text-[#6e6a86]">التكلفة: </span><span className="text-white font-mono">{formatNum(asset.cost)}</span></div>
                  <div><span className="text-[#6e6a86]">الخردة: </span><span className="text-white font-mono">{formatNum(asset.salvageValue)}</span></div>
                  <div><span className="text-[#6e6a86]">الاستهلاك: </span><span className="text-red-400 font-mono">{formatNum(asset.accumulatedDep)}</span></div>
                  <div><span className="text-[#6e6a86]">الدفترية: </span><span className="text-emerald-400 font-mono">{formatNum(bookValue)}</span></div>
                </div>

                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(depPercent, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#6e6a86]">
                  <span>{asset.depMethod === "straight-line" ? "قسط ثابت" : "قسط متناقص"} — {asset.usefulLifeYears} سنوات</span>
                  <span>{depPercent.toFixed(1)}% مستهلك</span>
                </div>

                {asset.status === "active" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ActionButton onClick={() => runDepreciation(asset)} disabled={nextDep <= 0}>
                      <Calculator className="w-3 h-3" /> استهلاك ({formatNum(nextDep)})
                    </ActionButton>
                    <button onClick={() => disposeAsset(asset)} className="text-[10px] px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold">
                      <TrendingDown className="w-3 h-3 inline ml-1" /> استبعاد
                    </button>
                    <button onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)} className="text-[10px] text-teal-400 hover:text-teal-300">
                      {selectedAsset === asset.id ? "إخفاء السجل" : `سجل الاستهلاك (${asset.depEntries.length})`}
                    </button>
                  </div>
                )}

                {selectedAsset === asset.id && asset.depEntries.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {asset.depEntries.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white/3">
                        <span className="text-[#6e6a86]">الفترة {i + 1} — {e.date}</span>
                        <span className="text-red-400 font-mono">{formatNum(e.amount)}</span>
                        <span className="text-[#6e6a86]">مجمع: {formatNum(e.accumulated)}</span>
                        <span className="text-emerald-400 font-mono">{formatNum(e.bookValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
