import { useState } from "react";
import { CreditCard, Plus, Check, X, ArrowUpCircle, ArrowDownCircle, RotateCcw } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton, Badge, EmptyState } from "../shared-ui";
import { formatNum, todayStr } from "../utils";
import type { Cheque } from "../types";

const statusLabels: Record<string, string> = { pending: "معلق", collected: "محصّل", deposited: "مودع", bounced: "مرتجع", cancelled: "ملغي" };
const statusColors: Record<string, "amber" | "emerald" | "blue" | "red" | "purple"> = { pending: "amber", collected: "emerald", deposited: "blue", bounced: "red", cancelled: "purple" };

export function ChequesTab() {
  const { cheques, setCheques, accounts, setAccounts, updateAccountBalance, addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();
  const [showAdd, setShowAdd] = useState(false);
  const [chequeType, setChequeType] = useState<"received" | "issued">("received");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(todayStr());
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [bankAccount, setBankAccount] = useState("البنك الأهلي");
  const [note, setNote] = useState("");

  const addCheque = () => {
    if (!number.trim() || !amount || Number(amount) <= 0 || !counterparty.trim()) return;
    const amt = Number(amount);
    const newCheque: Cheque = {
      id: cheques.length + 1, number, date, dueDate, amount: amt,
      type: chequeType, counterparty, status: "pending", bankAccount, note,
    };
    setCheques(prev => [...prev, newCheque]);

    if (chequeType === "received") {
      addJournalEntry(date, `استلام شيك رقم ${number} من ${counterparty}`, [
        { accountCode: "1600", debit: amt, credit: 0, description: "أوراق قبض" },
        { accountCode: "1300", debit: 0, credit: amt, description: "المدينون" },
      ], "الشيكات");
    } else {
      addJournalEntry(date, `إصدار شيك رقم ${number} لـ ${counterparty}`, [
        { accountCode: "2100", debit: amt, credit: 0, description: "الدائنون" },
        { accountCode: "2400", debit: 0, credit: amt, description: "أوراق دفع" },
      ], "الشيكات");
    }

    setNumber(""); setAmount(""); setCounterparty(""); setNote(""); setShowAdd(false);
  };

  const collectCheque = (cheque: Cheque) => {
    setCheques(prev => prev.map(c => c.id === cheque.id ? { ...c, status: "collected" } : c));
    if (cheque.type === "received") {
      addJournalEntry(todayStr(), `تحصيل شيك رقم ${cheque.number}`, [
        { accountCode: "1200", debit: cheque.amount, credit: 0, description: "البنك" },
        { accountCode: "1600", debit: 0, credit: cheque.amount, description: "أوراق قبض" },
      ], "الشيكات");
    } else {
      addJournalEntry(todayStr(), `صرف شيك رقم ${cheque.number}`, [
        { accountCode: "2400", debit: cheque.amount, credit: 0, description: "أوراق دفع" },
        { accountCode: "1200", debit: 0, credit: cheque.amount, description: "البنك" },
      ], "الشيكات");
    }
  };

  const bounceCheque = (cheque: Cheque) => {
    setCheques(prev => prev.map(c => c.id === cheque.id ? { ...c, status: "bounced" } : c));
    if (cheque.type === "received") {
      addJournalEntry(todayStr(), `ارتجاع شيك رقم ${cheque.number} من ${cheque.counterparty}`, [
        { accountCode: "1300", debit: cheque.amount, credit: 0, description: "المدينون" },
        { accountCode: "1600", debit: 0, credit: cheque.amount, description: "أوراق قبض" },
      ], "الشيكات");
    } else {
      addJournalEntry(todayStr(), `ارتجاع شيك رقم ${cheque.number} المصدر لـ ${cheque.counterparty}`, [
        { accountCode: "2400", debit: cheque.amount, credit: 0, description: "أوراق دفع" },
        { accountCode: "2100", debit: 0, credit: cheque.amount, description: "الدائنون" },
      ], "الشيكات");
    }
  };

  const receivedCheques = cheques.filter(c => c.type === "received");
  const issuedCheques = cheques.filter(c => c.type === "issued");
  const pendingTotal = cheques.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  const shareCheques = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير الشيكات:\n\n";
    text += `إجمالي الشيكات المعلقة: ${formatNum(pendingTotal)} ريال\n`;
    text += `شيكات مستلمة: ${receivedCheques.length} | شيكات مصدرة: ${issuedCheques.length}\n\n`;
    for (const c of cheques) {
      text += `• شيك #${c.number} — ${c.counterparty}: ${formatNum(c.amount)} ريال [${statusLabels[c.status]}] (${c.type === "received" ? "مستلم" : "مصدر"})\n`;
    }
    onShareWithTeacher(text);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><CreditCard className="w-4 h-4 text-teal-400" /> إدارة الشيكات</h3>
        <div className="flex items-center gap-2">
          {onShareWithTeacher && cheques.length > 0 && <ShareButton onClick={shareCheques} />}
          <button onClick={() => setShowAdd(!showAdd)} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300"><Plus className="w-3 h-3" /> شيك جديد</button>
        </div>
      </div>

      {cheques.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86] mb-1">شيكات معلقة</div>
            <div className="text-sm font-bold text-amber-400 font-mono">{formatNum(pendingTotal)}</div>
          </div>
          <div className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86] mb-1">مستلمة</div>
            <div className="text-sm font-bold text-emerald-400">{receivedCheques.length}</div>
          </div>
          <div className="rounded-xl border border-white/5 p-3 text-center">
            <div className="text-[10px] text-[#6e6a86] mb-1">مصدرة</div>
            <div className="text-sm font-bold text-blue-400">{issuedCheques.length}</div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setChequeType("received")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${chequeType === "received" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86]"}`}><ArrowDownCircle className="w-3 h-3 inline ml-1" /> شيك مستلم</button>
            <button onClick={() => setChequeType("issued")} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${chequeType === "issued" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-white/5 text-[#6e6a86]"}`}><ArrowUpCircle className="w-3 h-3 inline ml-1" /> شيك مصدر</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SimField label="رقم الشيك" value={number} onChange={setNumber} placeholder="مثال: 123456" dir="ltr" />
            <SimField label={chequeType === "received" ? "المستلم من" : "المصدر لـ"} value={counterparty} onChange={setCounterparty} placeholder="اسم الجهة" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SimField label="المبلغ (ريال)" value={amount} onChange={setAmount} type="number" dir="ltr" />
            <SimField label="تاريخ الشيك" value={date} onChange={setDate} type="date" dir="ltr" />
            <SimField label="تاريخ الاستحقاق" value={dueDate} onChange={setDueDate} type="date" dir="ltr" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SimField label="البنك" value={bankAccount} onChange={setBankAccount} placeholder="البنك الأهلي" />
            <SimField label="ملاحظة" value={note} onChange={setNote} placeholder="ملاحظة اختيارية" />
          </div>
          <div className="flex justify-end"><ActionButton onClick={addCheque} disabled={!number.trim() || Number(amount) <= 0 || !counterparty.trim()}>حفظ الشيك</ActionButton></div>
        </div>
      )}

      {cheques.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-10 h-10" />} title="لا توجد شيكات" subtitle="أضف شيك مستلم أو مصدر لتتبع دورة حياته" />
      ) : (
        <div className="space-y-2">
          {cheques.map(c => (
            <div key={c.id} className="rounded-xl border border-white/5 p-3 hover:bg-white/3 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {c.type === "received" ? <ArrowDownCircle className="w-4 h-4 text-emerald-400" /> : <ArrowUpCircle className="w-4 h-4 text-blue-400" />}
                  <span className="text-xs font-bold text-white">شيك #{c.number}</span>
                  <Badge color={statusColors[c.status]}>{statusLabels[c.status]}</Badge>
                </div>
                <span className="text-sm font-bold text-amber-400 font-mono">{formatNum(c.amount)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#a6adc8] mb-2">
                <span>{c.counterparty}</span>
                <span>{c.date}</span>
                <span>استحقاق: {c.dueDate}</span>
                <span>{c.bankAccount}</span>
              </div>
              {c.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button onClick={() => collectCheque(c)} className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-bold"><Check className="w-3 h-3 inline ml-1" /> تحصيل</button>
                  <button onClick={() => bounceCheque(c)} className="text-[10px] px-3 py-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold"><RotateCcw className="w-3 h-3 inline ml-1" /> ارتجاع</button>
                  <button onClick={() => setCheques(prev => prev.map(ch => ch.id === c.id ? { ...ch, status: "cancelled" } : ch))} className="text-[10px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 font-bold"><X className="w-3 h-3 inline ml-1" /> إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
