import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, Plus, Check } from "lucide-react";
import type { AdjustingEntry } from "../types";

const TEMPLATES: { type: AdjustingEntry["type"]; label: string; desc: string; debit: string; credit: string; amount: number }[] = [
  { type: "accrual-expense", label: "استحقاق رواتب", desc: "رواتب مستحقة لم تُدفع بعد", debit: "502", credit: "204", amount: 25000 },
  { type: "accrual-revenue", label: "إيراد مستحق", desc: "إيراد خدمات مكتسب لم يُحصّل", debit: "103", credit: "402", amount: 15000 },
  { type: "deferral-expense", label: "تسوية تأمين مدفوع مقدماً", desc: "تسوية حصة الشهر من التأمين", debit: "507", credit: "106", amount: 1000 },
  { type: "deferral-revenue", label: "تسوية إيراد مقبوض مقدماً", desc: "تسوية حصة الشهر المكتسبة", debit: "203", credit: "402", amount: 5000 },
  { type: "depreciation", label: "مصروف استهلاك", desc: "استهلاك المعدات للفترة", debit: "506", credit: "111", amount: 4000 },
  { type: "deferral-expense", label: "تسوية لوازم مكتبية", desc: "لوازم مستخدمة خلال الفترة", debit: "505", credit: "105", amount: 2000 },
];

export default function AdjustingEntriesTab({ onShare }: { onShare: (data: string) => void }) {
  const { adjustingEntries, setAdjustingEntries, tAccounts, postEntryToTAccounts, setEntries, auditLog } = useLabContext();
  const [customDesc, setCustomDesc] = useState("");
  const [customDebit, setCustomDebit] = useState("");
  const [customCredit, setCustomCredit] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customType, setCustomType] = useState<AdjustingEntry["type"]>("accrual-expense");
  const [showClosing, setShowClosing] = useState(false);

  const typeLabels: Record<string, string> = {
    "accrual-expense": "مصروف مستحق", "accrual-revenue": "إيراد مستحق",
    "deferral-expense": "مصروف مدفوع مقدماً", "deferral-revenue": "إيراد مقبوض مقدماً",
    depreciation: "استهلاك", closing: "إقفال"
  };
  const typeColors: Record<string, string> = {
    "accrual-expense": "text-red-400 bg-red-500/10 border-red-500/20",
    "accrual-revenue": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    "deferral-expense": "text-orange-400 bg-orange-500/10 border-orange-500/20",
    "deferral-revenue": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    depreciation: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    closing: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  const addTemplate = (t: typeof TEMPLATES[0]) => {
    const entry: AdjustingEntry = { id: Date.now(), type: t.type, description: t.desc, debitAccount: t.debit, creditAccount: t.credit, amount: t.amount, isApplied: false };
    setAdjustingEntries(prev => [...prev, entry]);
    auditLog(`إضافة قيد تسوية: ${t.label}`);
  };

  const addCustom = () => {
    if (!customDesc.trim() || !customDebit || !customCredit || !customAmount) return;
    const entry: AdjustingEntry = { id: Date.now(), type: customType, description: customDesc.trim(), debitAccount: customDebit, creditAccount: customCredit, amount: parseFloat(customAmount), isApplied: false };
    setAdjustingEntries(prev => [...prev, entry]);
    auditLog(`إضافة قيد تسوية مخصص: ${customDesc}`);
    setCustomDesc(""); setCustomAmount("");
  };

  const applyEntry = (entry: AdjustingEntry) => {
    const debitAcc = tAccounts.find(a => a.code === entry.debitAccount);
    const creditAcc = tAccounts.find(a => a.code === entry.creditAccount);
    if (!debitAcc || !creditAcc) return;

    const journalEntry = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      description: `[تسوية] ${entry.description}`,
      lines: [
        { accountCode: entry.debitAccount, accountName: debitAcc.name, debit: entry.amount, credit: 0 },
        { accountCode: entry.creditAccount, accountName: creditAcc.name, debit: 0, credit: entry.amount },
      ],
      isPosted: false,
    };
    setEntries(prev => [...prev, journalEntry]);
    postEntryToTAccounts(journalEntry);
    setAdjustingEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isApplied: true } : e));
    auditLog(`تطبيق قيد تسوية: ${entry.description}`);
  };

  const fmt = (n: number) => n.toLocaleString("ar-YE");
  const getAccName = (code: string) => tAccounts.find(a => a.code === code)?.name || code;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">⚙️ قيود التسوية والإقفال</h3>
        <button onClick={() => {
          const data = adjustingEntries.map(e => `${e.isApplied ? "✅" : "⏳"} [${typeLabels[e.type]}] ${e.description}: من حـ/${getAccName(e.debitAccount)} إلى حـ/${getAccName(e.creditAccount)} بمبلغ ${fmt(e.amount)}`).join("\n");
          onShare(`⚙️ قيود التسوية والإقفال:\n${data || "لا توجد قيود تسوية"}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">قوالب جاهزة للتسوية</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => addTemplate(t)} className={`text-right p-2.5 rounded-xl border ${typeColors[t.type]} hover:opacity-80 transition-all`}>
              <span className="text-xs font-bold">{t.label}</span>
              <p className="text-[10px] text-white/40 mt-0.5">{t.desc}</p>
              <p className="text-[10px] font-mono mt-1">من حـ/{getAccName(t.debit)} → إلى حـ/{getAccName(t.credit)} | {fmt(t.amount)}</p>
            </button>
          ))}
        </div>
      </div>

      {adjustingEntries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-white/70">قيود التسوية ({adjustingEntries.length})</h4>
          {adjustingEntries.map(entry => (
            <div key={entry.id} className={`rounded-xl border p-3 ${entry.isApplied ? "border-emerald-500/20 bg-emerald-500/5" : `${typeColors[entry.type]}`}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${typeColors[entry.type]}`}>{typeLabels[entry.type]}</span>
                  <span className="text-xs font-bold text-white">{entry.description}</span>
                </div>
                {entry.isApplied ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> مُطبّق</span>
                ) : (
                  <button onClick={() => applyEntry(entry)} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 transition-all">
                    تطبيق وترحيل
                  </button>
                )}
              </div>
              <div className="text-[10px] text-white/50 font-mono">
                من حـ/{getAccName(entry.debitAccount)} ← إلى حـ/{getAccName(entry.creditAccount)} | {fmt(entry.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">إضافة قيد تسوية مخصص</h4>
        <input value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="وصف قيد التسوية" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={customType} onChange={e => setCustomType(e.target.value as any)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={customDebit} onChange={e => setCustomDebit(e.target.value)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
            <option value="">حساب مدين</option>
            {tAccounts.map(a => <option key={a.code} value={a.code}>{a.code}-{a.name}</option>)}
          </select>
          <select value={customCredit} onChange={e => setCustomCredit(e.target.value)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none">
            <option value="">حساب دائن</option>
            {tAccounts.map(a => <option key={a.code} value={a.code}>{a.code}-{a.name}</option>)}
          </select>
          <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="المبلغ" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none text-center" />
        </div>
        <button onClick={addCustom} className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> إضافة قيد التسوية
        </button>
      </div>
    </div>
  );
}
