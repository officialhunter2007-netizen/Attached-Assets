import { useState, useMemo } from "react";
import { Building, Plus, Check, X, Link2 } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum, todayStr } from "../utils";
import type { BankStatementLine } from "../types";

export function BankReconciliationTab() {
  const { bankLines, setBankLines, entries, accounts, addAudit, addJournalEntry, onShareWithTeacher } = useSimulator();
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [lineType, setLineType] = useState<"debit" | "credit">("credit");
  const [bankBalance, setBankBalance] = useState("200000");

  const bookBalance = accounts.find(a => a.code === "1200")?.balance || 0;
  const reconciledLines = bankLines.filter(l => l.isReconciled);
  const unreconciledLines = bankLines.filter(l => !l.isReconciled);
  const bankAdjustments = unreconciledLines.reduce((s, l) => s + (l.type === "credit" ? l.amount : -l.amount), 0);
  const adjustedBankBalance = Number(bankBalance) - bankAdjustments;

  const bankEntries = useMemo(() => {
    return entries.filter(e => e.isPosted && e.lines.some(l => l.accountCode === "1200"));
  }, [entries]);

  const addBankLine = () => {
    if (!desc.trim() || Number(amount) <= 0) return;
    setBankLines(prev => [...prev, {
      id: prev.length + 1, date, description: desc,
      amount: Number(amount), type: lineType, isReconciled: false,
    }]);
    addAudit("إضافة بند بنكي", "التسوية البنكية", desc);
    setDesc(""); setAmount("");
  };

  const reconcileLine = (line: BankStatementLine) => {
    setBankLines(prev => prev.map(l => l.id === line.id ? { ...l, isReconciled: true } : l));
    addAudit("تسوية بند", "التسوية البنكية", line.description);
  };

  const addBankCharge = (line: BankStatementLine) => {
    addJournalEntry(line.date, `عمولة/مصاريف بنكية: ${line.description}`, [
      { accountCode: "5400", debit: line.amount, credit: 0, description: "مصاريف بنكية" },
      { accountCode: "1200", debit: 0, credit: line.amount, description: "البنك" },
    ], "التسوية البنكية");
    reconcileLine(line);
  };

  const addBankInterest = (line: BankStatementLine) => {
    addJournalEntry(line.date, `فوائد بنكية مكتسبة: ${line.description}`, [
      { accountCode: "1200", debit: line.amount, credit: 0, description: "البنك" },
      { accountCode: "4200", debit: 0, credit: line.amount, description: "إيرادات فوائد" },
    ], "التسوية البنكية");
    reconcileLine(line);
  };

  const isReconciled = Math.abs(bookBalance - adjustedBankBalance) < 0.01;

  const shareReconciliation = () => {
    if (!onShareWithTeacher) return;
    let text = `تقرير التسوية البنكية:\n\nرصيد الدفاتر: ${formatNum(bookBalance)} ريال\nرصيد كشف البنك: ${formatNum(Number(bankBalance))} ريال\n`;
    text += `\nبنود غير مسواة: ${unreconciledLines.length}\n`;
    for (const l of unreconciledLines) {
      text += `  • ${l.description}: ${l.type === "credit" ? "+" : "-"}${formatNum(l.amount)} (${l.date})\n`;
    }
    text += `\nالرصيد المعدّل للبنك: ${formatNum(adjustedBankBalance)} ريال\n`;
    text += `الحالة: ${isReconciled ? "متطابق ✓" : "غير متطابق ✗"}`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building className="w-4 h-4 text-teal-400" /> التسوية البنكية</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && <ShareButton onClick={shareReconciliation} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> بند بنكي</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="text-[10px] text-[#6e6a86] mb-1">رصيد الدفاتر (البنك)</div>
          <div className="text-lg font-bold text-blue-400 font-mono">{formatNum(bookBalance)}</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="text-[10px] text-[#6e6a86] mb-1">رصيد كشف البنك</div>
          <input type="number" value={bankBalance} onChange={e => setBankBalance(e.target.value)} className="text-lg font-bold text-amber-400 font-mono bg-transparent outline-none w-full" style={{ direction: "ltr" }} />
        </div>
      </div>

      <div className={`rounded-xl p-3 border ${isReconciled ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">الرصيد المعدّل للبنك</span>
          <span className={`text-sm font-bold font-mono ${isReconciled ? "text-emerald-400" : "text-red-400"}`}>{formatNum(adjustedBankBalance)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-[#a6adc8]">الفرق</span>
          <span className={`text-xs font-mono ${isReconciled ? "text-emerald-400" : "text-red-400"}`}>{formatNum(Math.abs(bookBalance - adjustedBankBalance))} {isReconciled ? "✓ متطابق" : "✗ غير متطابق"}</span>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setLineType("credit")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${lineType === "credit" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86]"}`}>إيداع (دائن)</button>
            <button onClick={() => setLineType("debit")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${lineType === "debit" ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-white/5 text-[#6e6a86]"}`}>سحب (مدين)</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="التاريخ" value={date} onChange={setDate} type="date" dir="ltr" />
            <SimField label="الوصف" value={desc} onChange={setDesc} placeholder="مثال: عمولة تحويل" />
            <SimField label="المبلغ" value={amount} onChange={setAmount} type="number" dir="ltr" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addBankLine} disabled={!desc.trim() || Number(amount) <= 0}>إضافة</ActionButton></div>
        </div>
      )}

      {unreconciledLines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-amber-400">بنود غير مسواة ({unreconciledLines.length})</h4>
          {unreconciledLines.map(line => (
            <div key={line.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge color={line.type === "credit" ? "emerald" : "red"}>{line.type === "credit" ? "إيداع" : "سحب"}</Badge>
                  <span className="text-xs text-white">{line.description}</span>
                </div>
                <span className={`text-sm font-bold font-mono ${line.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>{line.type === "credit" ? "+" : "-"}{formatNum(line.amount)}</span>
              </div>
              <div className="text-[10px] text-[#6e6a86] mb-2">{line.date}</div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => reconcileLine(line)} className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold"><Check className="w-3 h-3 inline ml-1" /> تسوية</button>
                {line.type === "debit" && <button onClick={() => addBankCharge(line)} className="text-[10px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold">تسجيل كمصروف بنكي</button>}
                {line.type === "credit" && <button onClick={() => addBankInterest(line)} className="text-[10px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold">تسجيل كإيراد فوائد</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {reconciledLines.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-400">بنود مسواة ({reconciledLines.length})</h4>
          {reconciledLines.slice(-5).map(line => (
            <div key={line.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white/3">
              <span className="text-[#a6adc8]">{line.description}</span>
              <span className={`font-mono ${line.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>{line.type === "credit" ? "+" : "-"}{formatNum(line.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {bankLines.length === 0 && <EmptyState icon={<Building className="w-10 h-10" />} title="لا توجد بنود بنكية" subtitle="أضف بنود كشف البنك لبدء عملية التسوية" />}
    </div>
  );
}
