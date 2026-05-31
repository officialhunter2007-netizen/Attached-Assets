import { useState } from "react";
import { useLabContext } from "../context";
import { ArrowLeftRight, Check, X, Plus } from "lucide-react";

export default function BankReconciliationTab({ onShare }: { onShare: (data: string) => void }) {
  const { bankItems, setBankItems, auditLog } = useLabContext();
  const [bankBalance, setBankBalance] = useState("250000");
  const [bookBalance, setBookBalance] = useState("255000");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"deposit" | "withdrawal">("deposit");
  const [newInBank, setNewInBank] = useState(true);
  const [newInBooks, setNewInBooks] = useState(false);

  const bb = parseFloat(bankBalance) || 0;
  const bk = parseFloat(bookBalance) || 0;

  const depositsInTransit = bankItems.filter(i => i.type === "deposit" && i.inBooks && !i.inBank);
  const outstandingChecks = bankItems.filter(i => i.type === "withdrawal" && i.inBooks && !i.inBank);
  const bankCharges = bankItems.filter(i => i.type === "withdrawal" && i.inBank && !i.inBooks);
  const bankCredits = bankItems.filter(i => i.type === "deposit" && i.inBank && !i.inBooks);

  const adjustedBank = bb
    + depositsInTransit.reduce((s, i) => s + i.amount, 0)
    - outstandingChecks.reduce((s, i) => s + i.amount, 0);

  const adjustedBooks = bk
    + bankCredits.reduce((s, i) => s + i.amount, 0)
    - bankCharges.reduce((s, i) => s + i.amount, 0);

  const isReconciled = Math.abs(adjustedBank - adjustedBooks) < 0.01;
  const fmt = (n: number) => n.toLocaleString("ar-YE");

  const addItem = () => {
    if (!newDesc.trim() || !newAmount) return;
    setBankItems([...bankItems, { id: Date.now(), description: newDesc.trim(), amount: parseFloat(newAmount), type: newType, inBank: newInBank, inBooks: newInBooks }]);
    auditLog(`إضافة بند تسوية: ${newDesc}`);
    setNewDesc(""); setNewAmount("");
  };

  const toggleItem = (id: number, field: "inBank" | "inBooks") => {
    setBankItems(bankItems.map(i => i.id === id ? { ...i, [field]: !i[field] } : i));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">🏦 التسوية البنكية</h3>
        <button onClick={() => {
          onShare(`🏦 التسوية البنكية:\nرصيد كشف البنك: ${fmt(bb)}\nرصيد الدفاتر: ${fmt(bk)}\n\nالرصيد المعدّل للبنك: ${fmt(adjustedBank)}\nالرصيد المعدّل للدفاتر: ${fmt(adjustedBooks)}\nمتطابقة: ${isReconciled ? "✅" : "❌"}\n\nإيداعات قيد التحصيل: ${depositsInTransit.map(i => `${i.description}: ${fmt(i.amount)}`).join(", ") || "لا يوجد"}\nشيكات معلقة: ${outstandingChecks.map(i => `${i.description}: ${fmt(i.amount)}`).join(", ") || "لا يوجد"}`);
        }} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <ArrowLeftRight className="w-3.5 h-3.5" /> شارك
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-blue-300 mb-1 font-bold">رصيد كشف البنك</label>
          <input type="number" value={bankBalance} onChange={e => setBankBalance(e.target.value)} className="w-full bg-[#1e1e2e] border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-400/50 text-center" />
        </div>
        <div>
          <label className="block text-[10px] text-purple-300 mb-1 font-bold">رصيد الدفاتر</label>
          <input type="number" value={bookBalance} onChange={e => setBookBalance(e.target.value)} className="w-full bg-[#1e1e2e] border border-purple-500/20 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-400/50 text-center" />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="bg-white/[0.03] px-3 py-2 grid grid-cols-[1fr_60px_40px_40px_40px] gap-2 text-[10px] font-bold text-white/50 border-b border-white/10">
          <span>البند</span><span className="text-center">المبلغ</span><span className="text-center">النوع</span><span className="text-center">بنك</span><span className="text-center">دفاتر</span>
        </div>
        {bankItems.map(item => (
          <div key={item.id} className="px-3 py-2 grid grid-cols-[1fr_60px_40px_40px_40px] gap-2 text-[11px] border-b border-white/5 hover:bg-white/[0.02] items-center">
            <span className="text-white/70 truncate">{item.description}</span>
            <span className={`text-center font-mono ${item.type === "deposit" ? "text-emerald-400" : "text-red-400"}`}>{fmt(item.amount)}</span>
            <span className="text-center text-[9px] text-white/40">{item.type === "deposit" ? "إيداع" : "سحب"}</span>
            <button onClick={() => toggleItem(item.id, "inBank")} className="flex justify-center">
              {item.inBank ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-white/20" />}
            </button>
            <button onClick={() => toggleItem(item.id, "inBooks")} className="flex justify-center">
              {item.inBooks ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-white/20" />}
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`rounded-xl border-2 ${isReconciled ? "border-emerald-500/20" : "border-blue-500/20"} bg-blue-500/5 p-3 space-y-2`}>
          <h4 className="text-xs font-bold text-blue-400 text-center">تعديل رصيد البنك</h4>
          <div className="flex justify-between text-[11px]"><span className="text-white/60">رصيد كشف البنك</span><span className="text-white font-mono">{fmt(bb)}</span></div>
          {depositsInTransit.length > 0 && <div className="flex justify-between text-[11px]"><span className="text-emerald-400">+ إيداعات قيد التحصيل</span><span className="text-emerald-400 font-mono">+{fmt(depositsInTransit.reduce((s, i) => s + i.amount, 0))}</span></div>}
          {outstandingChecks.length > 0 && <div className="flex justify-between text-[11px]"><span className="text-red-400">- شيكات معلقة</span><span className="text-red-400 font-mono">-{fmt(outstandingChecks.reduce((s, i) => s + i.amount, 0))}</span></div>}
          <div className="border-t border-white/10 pt-1 flex justify-between text-xs font-bold"><span className="text-white">الرصيد المعدّل</span><span className="text-blue-400 font-mono">{fmt(adjustedBank)}</span></div>
        </div>

        <div className={`rounded-xl border-2 ${isReconciled ? "border-emerald-500/20" : "border-purple-500/20"} bg-purple-500/5 p-3 space-y-2`}>
          <h4 className="text-xs font-bold text-purple-400 text-center">تعديل رصيد الدفاتر</h4>
          <div className="flex justify-between text-[11px]"><span className="text-white/60">رصيد الدفاتر</span><span className="text-white font-mono">{fmt(bk)}</span></div>
          {bankCredits.length > 0 && <div className="flex justify-between text-[11px]"><span className="text-emerald-400">+ إشعارات دائنة</span><span className="text-emerald-400 font-mono">+{fmt(bankCredits.reduce((s, i) => s + i.amount, 0))}</span></div>}
          {bankCharges.length > 0 && <div className="flex justify-between text-[11px]"><span className="text-red-400">- مصاريف بنكية</span><span className="text-red-400 font-mono">-{fmt(bankCharges.reduce((s, i) => s + i.amount, 0))}</span></div>}
          <div className="border-t border-white/10 pt-1 flex justify-between text-xs font-bold"><span className="text-white">الرصيد المعدّل</span><span className="text-purple-400 font-mono">{fmt(adjustedBooks)}</span></div>
        </div>
      </div>

      <div className={`text-center py-2 rounded-xl border-2 ${isReconciled ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
        <span className={`text-sm font-bold ${isReconciled ? "text-emerald-400" : "text-red-400"}`}>
          {isReconciled ? "✅ التسوية متطابقة!" : `❌ فرق: ${fmt(Math.abs(adjustedBank - adjustedBooks))}`}
        </span>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
        <h4 className="text-xs font-bold text-amber-400">إضافة بند تسوية</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="الوصف" className="sm:col-span-2 bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
          <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="المبلغ" className="bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none text-center" />
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <label className="flex items-center gap-1 text-white/50"><input type="radio" checked={newType === "deposit"} onChange={() => setNewType("deposit")} /> إيداع</label>
          <label className="flex items-center gap-1 text-white/50"><input type="radio" checked={newType === "withdrawal"} onChange={() => setNewType("withdrawal")} /> سحب</label>
          <span className="text-white/20">|</span>
          <label className="flex items-center gap-1 text-white/50"><input type="checkbox" checked={newInBank} onChange={() => setNewInBank(!newInBank)} /> في البنك</label>
          <label className="flex items-center gap-1 text-white/50"><input type="checkbox" checked={newInBooks} onChange={() => setNewInBooks(!newInBooks)} /> في الدفاتر</label>
        </div>
        <button onClick={addItem} className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> إضافة
        </button>
      </div>
    </div>
  );
}
