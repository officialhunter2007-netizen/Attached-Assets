import { useState } from "react";
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, ShareButton, ActionButton, Badge } from "../shared-ui";
import { formatNum, todayStr, nowStr } from "../utils";
import type { JournalLine, JournalEntry } from "../types";

export function JournalTab() {
  const { accounts, entries, setEntries, entryCounter, setEntryCounter, postEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { accountCode: "", debit: 0, credit: 0, description: "" },
    { accountCode: "", debit: 0, credit: 0, description: "" },
  ]);
  const [showEntries, setShowEntries] = useState(false);

  const leafAccounts = accounts.filter(a => a.parent);
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
  const hasAccounts = lines.every(l => l.accountCode !== "");

  const addLine = () => setLines(prev => [...prev, { accountCode: "", debit: 0, credit: 0, description: "" }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof JournalLine, val: string | number) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === "debit" && Number(val) > 0) return { ...l, debit: Number(val), credit: 0 };
      if (field === "credit" && Number(val) > 0) return { ...l, credit: Number(val), debit: 0 };
      return { ...l, [field]: val };
    }));
  };

  const saveEntry = () => {
    if (!isBalanced || !hasAccounts || !description.trim()) return;
    const newEntry: JournalEntry = {
      id: entryCounter, date, description,
      lines: lines.filter(l => l.debit > 0 || l.credit > 0),
      isPosted: false, createdAt: nowStr(),
    };
    setEntries(prev => [...prev, newEntry]);
    setEntryCounter(prev => prev + 1);
    addAudit("إنشاء قيد", "القيود", description);
    setDescription("");
    setLines([
      { accountCode: "", debit: 0, credit: 0, description: "" },
      { accountCode: "", debit: 0, credit: 0, description: "" },
    ]);
  };

  const shareEntry = () => {
    if (!onShareWithTeacher) return;
    const lineDetails = lines.filter(l => l.debit > 0 || l.credit > 0).map(l => {
      const acc = accounts.find(a => a.code === l.accountCode);
      return `  ${acc?.name || l.accountCode}: مدين ${formatNum(l.debit)} / دائن ${formatNum(l.credit)}`;
    }).join("\n");
    onShareWithTeacher(
      `قيد محاسبي جديد:\n• الوصف: ${description || "(بدون وصف)"}\n• التاريخ: ${date}\n• التفاصيل:\n${lineDetails}\n• إجمالي المدين: ${formatNum(totalDebit)} ريال\n• إجمالي الدائن: ${formatNum(totalCredit)} ريال\n• متوازن: ${isBalanced ? "نعم ✓" : "لا ✗"}`
    );
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-400" />
          إنشاء قيد محاسبي
        </h3>
        {entries.length > 0 && (
          <button onClick={() => setShowEntries(!showEntries)} className="text-[11px] text-teal-400 flex items-center gap-1">
            القيود المسجلة ({entries.length})
            {showEntries ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {showEntries && entries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {entries.map(entry => (
            <div key={entry.id} className={`rounded-xl border p-3 text-xs ${entry.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                <span className="font-bold text-white text-[11px] leading-tight">قيد #{entry.id} — {entry.description}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={entry.isPosted ? "emerald" : "amber"}>{entry.isPosted ? "مرحّل ✓" : "غير مرحّل"}</Badge>
                  {entry.source && <Badge color="blue">{entry.source}</Badge>}
                  {!entry.isPosted && (
                    <button onClick={() => postEntry(entry)} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors font-bold">ترحيل</button>
                  )}
                </div>
              </div>
              <div className="text-[#a6adc8]">{entry.date}</div>
              {entry.lines.map((l, i) => {
                const acc = accounts.find(a => a.code === l.accountCode);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 mt-1 text-[#a6adc8]">
                    <span className="font-mono text-[10px]">{l.accountCode}</span>
                    <span className="flex-1 min-w-0">{acc?.name}</span>
                    {l.debit > 0 && <span className="text-blue-400">{formatNum(l.debit)} مدين</span>}
                    {l.credit > 0 && <span className="text-red-400">{formatNum(l.credit)} دائن</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SimField label="التاريخ" value={date} onChange={setDate} type="date" dir="ltr" />
        <SimField label="وصف القيد" value={description} onChange={setDescription} placeholder="مثال: شراء بضاعة نقداً" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a6adc8] font-bold">بنود القيد</span>
          <button onClick={addLine} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors">
            <Plus className="w-3 h-3" /> إضافة بند
          </button>
        </div>

        <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] text-[#6e6a86] font-bold px-1">
          <span className="col-span-4">الحساب</span>
          <span className="col-span-3">مدين</span>
          <span className="col-span-3">دائن</span>
          <span className="col-span-2">البيان</span>
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className="space-y-2 sm:space-y-0">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10 sm:col-span-4">
                <select value={line.accountCode} onChange={e => updateLine(idx, "accountCode", e.target.value)} className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50">
                  <option value="">اختر حساب...</option>
                  {leafAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:hidden flex items-center justify-center">
                {lines.length > 2 && (
                  <button onClick={() => removeLine(idx)} className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <div className="col-span-6 sm:col-span-3">
                <input type="number" min={0} value={line.debit || ""} onChange={e => updateLine(idx, "debit", e.target.value)} placeholder="مدين" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-blue-400 outline-none focus:border-blue-400/50 text-center" style={{ direction: "ltr" }} />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <input type="number" min={0} value={line.credit || ""} onChange={e => updateLine(idx, "credit", e.target.value)} placeholder="دائن" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-red-400 outline-none focus:border-red-400/50 text-center" style={{ direction: "ltr" }} />
              </div>
              <div className="hidden sm:col-span-2 sm:flex items-center gap-1">
                <input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} placeholder="بيان" className="flex-1 bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50" />
                {lines.length > 2 && (
                  <button onClick={() => removeLine(idx)} className="text-red-400/40 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-3 border ${isBalanced ? "border-emerald-500/20 bg-emerald-500/5" : totalDebit > 0 || totalCredit > 0 ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/3"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-blue-400 font-bold text-xs">مدين: {formatNum(totalDebit)}</span>
            <span className="text-red-400 font-bold text-xs">دائن: {formatNum(totalCredit)}</span>
          </div>
          {isBalanced ? (
            <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" /> متوازن</span>
          ) : (totalDebit > 0 || totalCredit > 0) ? (
            <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> غير متوازن</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onShareWithTeacher && (totalDebit > 0 || totalCredit > 0) && <ShareButton onClick={shareEntry} />}
        <ActionButton onClick={saveEntry} disabled={!isBalanced || !hasAccounts || !description.trim()}>
          <Check className="w-3.5 h-3.5" /> حفظ القيد
        </ActionButton>
      </div>
    </div>
  );
}
