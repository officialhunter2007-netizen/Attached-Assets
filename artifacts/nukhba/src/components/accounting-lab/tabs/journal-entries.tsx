import { useState } from "react";
import { useLabContext } from "../context";
import { Plus, Trash2, ArrowLeftRight, Send, BookOpen } from "lucide-react";

export default function JournalEntriesTab({ onShare }: { onShare: (data: string) => void }) {
  const { tAccounts, entries, setEntries, postEntryToTAccounts, auditLog } = useLabContext();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<{ accountCode: string; debit: string; credit: string }[]>([
    { accountCode: "", debit: "", credit: "" },
    { accountCode: "", debit: "", credit: "" },
  ]);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => setLines(prev => [...prev, { accountCode: "", debit: "", credit: "" }]);
  const removeLine = (i: number) => { if (lines.length > 2) setLines(prev => prev.filter((_, idx) => idx !== i)); };

  const saveEntry = () => {
    if (!desc.trim() || !isBalanced) return;
    const entry = {
      id: Date.now(),
      date,
      description: desc.trim(),
      lines: lines.filter(l => l.accountCode && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)).map(l => ({
        accountCode: l.accountCode,
        accountName: tAccounts.find(a => a.code === l.accountCode)?.name || l.accountCode,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
      isPosted: false,
    };
    setEntries(prev => [...prev, entry]);
    auditLog(`تسجيل قيد: ${desc}`);
    setDesc("");
    setLines([{ accountCode: "", debit: "", credit: "" }, { accountCode: "", debit: "", credit: "" }]);
  };

  const fmt = (n: number) => n.toLocaleString("ar-YE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          دفتر القيود اليومية
        </h3>
        <button onClick={() => {
          const data = entries.map(e => `قيد #${e.id} (${e.date}): ${e.description} ${e.isPosted ? "✅ مرحّل" : "⏳ غير مرحّل"}\n${e.lines.map(l => `  ${l.accountName}: مدين ${fmt(l.debit)} | دائن ${fmt(l.credit)}`).join("\n")}`).join("\n\n");
          onShare(`📒 دفتر القيود اليومية:\n${data || "لا توجد قيود"}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4 space-y-3">
        <h4 className="text-xs font-bold text-amber-400">تسجيل قيد جديد</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف القيد" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400/50" />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 text-[10px] text-white/50 font-bold">
            <span>الحساب</span><span className="text-center">مدين</span><span className="text-center">دائن</span><span />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2">
              <select value={line.accountCode} onChange={e => { const nl = [...lines]; nl[i] = { ...nl[i], accountCode: e.target.value }; setLines(nl); }}
                className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-amber-400/50">
                <option value="">اختر حساب</option>
                {tAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
              </select>
              <input type="number" value={line.debit} onChange={e => { const nl = [...lines]; nl[i] = { ...nl[i], debit: e.target.value, credit: e.target.value ? "" : nl[i].credit }; setLines(nl); }}
                placeholder="0" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white text-center outline-none focus:border-blue-400/50" />
              <input type="number" value={line.credit} onChange={e => { const nl = [...lines]; nl[i] = { ...nl[i], credit: e.target.value, debit: e.target.value ? "" : nl[i].debit }; setLines(nl); }}
                placeholder="0" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white text-center outline-none focus:border-red-400/50" />
              <button onClick={() => removeLine(i)} className="text-white/30 hover:text-red-400 flex items-center justify-center">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={addLine} className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300">
            <Plus className="w-3 h-3" /> إضافة سطر
          </button>
          <div className="flex items-center gap-3 text-[11px]">
            <span>مدين: <span className="font-bold text-blue-400 font-mono">{fmt(totalDebit)}</span></span>
            <span>دائن: <span className="font-bold text-red-400 font-mono">{fmt(totalCredit)}</span></span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isBalanced ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {isBalanced ? "متوازن ✅" : "غير متوازن"}
            </span>
          </div>
        </div>

        <button onClick={saveEntry} disabled={!isBalanced || !desc.trim()} className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <Send className="w-3.5 h-3.5" /> حفظ القيد
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white/70">القيود المسجلة ({entries.length})</h4>
          {entries.map(e => (
            <div key={e.id} className={`rounded-xl border ${e.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/[0.02]"} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40">#{e.id}</span>
                  <span className="text-xs font-bold text-white">{e.description}</span>
                  <span className="text-[10px] text-white/40">{e.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {e.isPosted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">مرحّل ✅</span>
                  ) : (
                    <button onClick={() => postEntryToTAccounts(e)} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-all">
                      ترحيل →
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_70px_70px] gap-1 text-[10px]">
                <span className="text-white/40 font-bold">الحساب</span>
                <span className="text-white/40 font-bold text-center">مدين</span>
                <span className="text-white/40 font-bold text-center">دائن</span>
                {e.lines.map((l, i) => (
                  <div key={i} className="contents">
                    <span className={`text-white/80 ${l.credit > 0 ? "pr-4" : ""}`}>{l.accountName}</span>
                    <span className="text-blue-400 font-mono text-center">{l.debit > 0 ? fmt(l.debit) : ""}</span>
                    <span className="text-red-400 font-mono text-center">{l.credit > 0 ? fmt(l.credit) : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
