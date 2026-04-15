import { useState } from "react";
import { Globe, Plus, ArrowLeftRight, RefreshCw } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum, todayStr } from "../utils";

type ExchangeRate = { currency: string; name: string; rate: number; date: string };
type ForexTransaction = { id: number; date: string; type: "buy" | "sell"; currency: string; amount: number; rate: number; yemenRate: number; gainLoss: number };

const defaultRates: ExchangeRate[] = [
  { currency: "USD", name: "دولار أمريكي", rate: 250, date: todayStr() },
  { currency: "SAR", name: "ريال سعودي", rate: 66, date: todayStr() },
  { currency: "AED", name: "درهم إماراتي", rate: 68, date: todayStr() },
  { currency: "EUR", name: "يورو", rate: 275, date: todayStr() },
];

export function MultiCurrencyTab() {
  const { addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [rates, setRates] = useState<ExchangeRate[]>(defaultRates);
  const [transactions, setTransactions] = useState<ForexTransaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [txType, setTxType] = useState<"buy" | "sell">("buy");
  const [txCurrency, setTxCurrency] = useState("USD");
  const [txAmount, setTxAmount] = useState("");
  const [txRate, setTxRate] = useState("");
  const [txDate, setTxDate] = useState(todayStr());
  const [newCurrency, setNewCurrency] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newRate, setNewRate] = useState("");

  const currentRate = rates.find(r => r.currency === txCurrency)?.rate || 0;
  const txYemenAmount = Number(txAmount) * Number(txRate || currentRate);
  const bookAmount = Number(txAmount) * currentRate;
  const gainLoss = txType === "sell" ? txYemenAmount - bookAmount : bookAmount - txYemenAmount;

  const addTransaction = () => {
    if (!txAmount || Number(txAmount) <= 0) return;
    const rate = Number(txRate || currentRate);
    const yemenAmount = Number(txAmount) * rate;
    const gl = txType === "sell" ? yemenAmount - bookAmount : bookAmount - yemenAmount;

    setTransactions(prev => [...prev, { id: prev.length + 1, date: txDate, type: txType, currency: txCurrency, amount: Number(txAmount), rate, yemenRate: currentRate, gainLoss: gl }]);

    const lines = [];
    if (txType === "buy") {
      lines.push({ accountCode: "1100", debit: 0, credit: yemenAmount, description: `شراء ${txAmount} ${txCurrency}` });
      lines.push({ accountCode: "1150", debit: bookAmount, credit: 0, description: `عملات أجنبية ${txCurrency}` });
      if (gl > 0) lines.push({ accountCode: "4300", debit: 0, credit: gl, description: "أرباح فروقات عملة" });
      else if (gl < 0) lines.push({ accountCode: "5700", debit: Math.abs(gl), credit: 0, description: "خسائر فروقات عملة" });
    } else {
      lines.push({ accountCode: "1100", debit: yemenAmount, credit: 0, description: `بيع ${txAmount} ${txCurrency}` });
      lines.push({ accountCode: "1150", debit: 0, credit: bookAmount, description: `عملات أجنبية ${txCurrency}` });
      if (gl > 0) lines.push({ accountCode: "4300", debit: 0, credit: gl, description: "أرباح فروقات عملة" });
      else if (gl < 0) lines.push({ accountCode: "5700", debit: Math.abs(gl), credit: 0, description: "خسائر فروقات عملة" });
    }
    addJournalEntry(txDate, `${txType === "buy" ? "شراء" : "بيع"} ${txAmount} ${txCurrency} بسعر ${rate}`, lines, "العملات");
    setTxAmount(""); setTxRate(""); setShowAdd(false);
  };

  const addNewRate = () => {
    if (!newCurrency.trim() || !newCurrencyName.trim() || Number(newRate) <= 0) return;
    setRates(prev => [...prev.filter(r => r.currency !== newCurrency), { currency: newCurrency.toUpperCase(), name: newCurrencyName, rate: Number(newRate), date: todayStr() }]);
    setNewCurrency(""); setNewCurrencyName(""); setNewRate(""); setShowRate(false);
  };

  const totalGainLoss = transactions.reduce((s, t) => s + t.gainLoss, 0);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير العملات الأجنبية:\n\nأسعار الصرف الحالية:\n";
    for (const r of rates) text += `  ${r.currency} (${r.name}): ${formatNum(r.rate)} ريال\n`;
    text += `\nإجمالي عمليات الصرف: ${transactions.length}\n`;
    text += `صافي أرباح/خسائر العملة: ${formatNum(totalGainLoss)} ريال\n\n`;
    for (const t of transactions) text += `  ${t.date}: ${t.type === "buy" ? "شراء" : "بيع"} ${t.amount} ${t.currency} @ ${t.rate} | ربح/خسارة: ${formatNum(t.gainLoss)}\n`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-teal-400" /> العملات الأجنبية</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={share} />}
          <button onClick={() => setShowRate(!showRate)} className="text-[11px] text-purple-400 flex items-center gap-1 hover:text-purple-300"><RefreshCw className="w-3 h-3" /> أسعار</button>
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><ArrowLeftRight className="w-3 h-3" /> عملية صرف</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {rates.map(r => (
          <div key={r.currency} className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86]">{r.name}</div>
            <div className="text-sm font-bold text-amber-400 font-mono">{formatNum(r.rate)}</div>
            <div className="text-[10px] text-[#6e6a86]">ريال/{r.currency}</div>
          </div>
        ))}
      </div>

      {showRate && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="رمز العملة" value={newCurrency} onChange={setNewCurrency} placeholder="GBP" dir="ltr" />
            <SimField label="اسم العملة" value={newCurrencyName} onChange={setNewCurrencyName} placeholder="جنيه إسترليني" />
            <SimField label="سعر الصرف (ريال)" value={newRate} onChange={setNewRate} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addNewRate} disabled={!newCurrency.trim() || Number(newRate) <= 0} variant="amber">حفظ/تحديث</ActionButton></div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setTxType("buy")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${txType === "buy" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86]"}`}>شراء عملة</button>
            <button onClick={() => setTxType("sell")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${txType === "sell" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-white/5 text-[#6e6a86]"}`}>بيع عملة</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <SimField label="التاريخ" value={txDate} onChange={setTxDate} type="date" dir="ltr" />
            <SimSelect label="العملة" value={txCurrency} onChange={setTxCurrency} options={rates.map(r => ({ value: r.currency, label: `${r.currency} — ${r.name}` }))} />
            <SimField label="المبلغ بالعملة" value={txAmount} onChange={setTxAmount} type="number" dir="ltr" />
            <SimField label={`السعر (افتراضي: ${currentRate})`} value={txRate} onChange={setTxRate} type="number" dir="ltr" />
          </div>
          {Number(txAmount) > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-[#a6adc8]">المعادل: <span className="text-amber-400 font-mono font-bold">{formatNum(txYemenAmount)}</span> ريال</span>
              {gainLoss !== 0 && <span className={gainLoss > 0 ? "text-emerald-400" : "text-red-400"}>فرق العملة: <span className="font-mono font-bold">{formatNum(gainLoss)}</span></span>}
            </div>
          )}
          <div className="flex justify-end"><ActionButton onClick={addTransaction} disabled={Number(txAmount) <= 0}>تنفيذ</ActionButton></div>
        </div>
      )}

      {transactions.length > 0 && (
        <>
          <div className={`rounded-xl border p-3 ${totalGainLoss >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a6adc8]">صافي أرباح/خسائر فروقات العملة</span>
              <span className={`text-sm font-bold font-mono ${totalGainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatNum(totalGainLoss)} ريال</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#a6adc8]">سجل العمليات ({transactions.length})</span>
            {transactions.map(t => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/3">
                <Badge color={t.type === "buy" ? "emerald" : "blue"}>{t.type === "buy" ? "شراء" : "بيع"}</Badge>
                <span className="text-white font-mono">{t.amount} {t.currency}</span>
                <span className="text-[#6e6a86]">@ {t.rate}</span>
                <span className={`font-mono font-bold ${t.gainLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>{t.gainLoss !== 0 ? formatNum(t.gainLoss) : "—"}</span>
                <span className="mr-auto text-[#6e6a86]">{t.date}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {transactions.length === 0 && <EmptyState icon={<Globe className="w-10 h-10" />} title="لا توجد عمليات صرف" subtitle="أضف عمليات شراء أو بيع عملات أجنبية" />}
    </div>
  );
}
