import { useState } from "react";
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, ActionButton, Badge } from "../shared-ui";
import { formatNum, todayStr, nowStr } from "../utils";
import type { InvoiceItem, Invoice } from "../types";

export function InvoicesTab() {
  const { invoices, setInvoices, invoiceCounter, setInvoiceCounter, postInvoice, inventory, addAudit, onShareWithTeacher } = useSimulator();
  const [invType, setInvType] = useState<"sale" | "purchase">("sale");
  const [date, setDate] = useState(todayStr());
  const [counterparty, setCounterparty] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [vatRate, setVatRate] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([{ itemName: "", qty: 1, unitPrice: 0, vatRate: 0 }]);
  const [showInvoices, setShowInvoices] = useState(false);

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const totalVAT = items.reduce((s, it) => s + it.qty * it.unitPrice * (it.vatRate / 100), 0);
  const total = subtotal + totalVAT;

  const addItem = () => setItems(prev => [...prev, { itemName: "", qty: 1, unitPrice: 0, vatRate: Number(vatRate) }]);
  const removeItem = (idx: number) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, i) => i !== idx)); };
  const updateItem = (idx: number, field: keyof InvoiceItem, val: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === "itemName" ? val : Number(val) } : it));
  };

  const saveInvoice = () => {
    if (!counterparty.trim() || items.some(it => !it.itemName.trim() || it.qty <= 0 || it.unitPrice <= 0)) return;
    const newInv: Invoice = {
      id: invoiceCounter, type: invType, date, counterparty,
      items: [...items], paymentType, isPosted: false, currency: "YER",
    };
    setInvoices(prev => [...prev, newInv]);
    setInvoiceCounter(prev => prev + 1);
    addAudit("إنشاء فاتورة", "الفواتير", `${invType === "sale" ? "مبيعات" : "مشتريات"} — ${counterparty}`);
    setCounterparty("");
    setItems([{ itemName: "", qty: 1, unitPrice: 0, vatRate: Number(vatRate) }]);
  };

  const shareInvoice = () => {
    if (!onShareWithTeacher) return;
    const itemsText = items.map(it => `  - ${it.itemName}: ${it.qty} × ${formatNum(it.unitPrice)} = ${formatNum(it.qty * it.unitPrice)} ريال${it.vatRate > 0 ? ` (VAT ${it.vatRate}%)` : ""}`).join("\n");
    onShareWithTeacher(
      `فاتورة ${invType === "sale" ? "مبيعات" : "مشتريات"} جديدة:\n• ${invType === "sale" ? "العميل" : "المورد"}: ${counterparty || "(غير محدد)"}\n• التاريخ: ${date}\n• طريقة الدفع: ${paymentType === "cash" ? "نقدي" : "آجل"}\n• الأصناف:\n${itemsText}\n• الإجمالي قبل الضريبة: ${formatNum(subtotal)} ريال\n• الضريبة: ${formatNum(totalVAT)} ريال\n• الإجمالي: ${formatNum(total)} ريال`
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-teal-400" /> إنشاء فاتورة</h3>
        {invoices.length > 0 && (
          <button onClick={() => setShowInvoices(!showInvoices)} className="text-[11px] text-teal-400 flex items-center gap-1">
            الفواتير ({invoices.length}) {showInvoices ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {showInvoices && invoices.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {invoices.map(inv => (
            <div key={inv.id} className={`rounded-xl border p-3 text-xs ${inv.isPosted ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <span className="font-bold text-white text-[11px] leading-tight">{inv.type === "sale" ? "مبيعات" : "مشتريات"} #{inv.id} — {inv.counterparty}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge color={inv.isPosted ? "emerald" : "amber"}>{inv.isPosted ? "مرحّلة ✓" : "غير مرحّلة"}</Badge>
                  {!inv.isPosted && <button onClick={() => postInvoice(inv)} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors font-bold">ترحيل</button>}
                </div>
              </div>
              <div className="text-[#a6adc8]">{inv.date} · {inv.paymentType === "cash" ? "نقدي" : "آجل"} · إجمالي: {formatNum(inv.items.reduce((s, it) => s + it.qty * it.unitPrice * (1 + it.vatRate / 100), 0))} ريال</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setInvType("sale")} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${invType === "sale" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-white/5 text-[#6e6a86] hover:bg-white/5"}`}>فاتورة مبيعات</button>
        <button onClick={() => setInvType("purchase")} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${invType === "purchase" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "border-white/5 text-[#6e6a86] hover:bg-white/5"}`}>فاتورة مشتريات</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SimField label="التاريخ" value={date} onChange={setDate} type="date" dir="ltr" />
        <SimField label={invType === "sale" ? "اسم العميل" : "اسم المورد"} value={counterparty} onChange={setCounterparty} placeholder={invType === "sale" ? "مثال: شركة النور" : "مثال: مؤسسة التقنية"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SimSelect label="طريقة الدفع" value={paymentType} onChange={v => setPaymentType(v as "cash" | "credit")} options={[{ value: "cash", label: "نقدي" }, { value: "credit", label: "آجل (على الحساب)" }]} />
        <SimSelect label="نسبة الضريبة الافتراضية" value={vatRate} onChange={v => { setVatRate(v); setItems(prev => prev.map(it => ({ ...it, vatRate: Number(v) }))); }} options={[{ value: "0", label: "بدون ضريبة" }, { value: "5", label: "5%" }, { value: "10", label: "10%" }, { value: "15", label: "15%" }]} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a6adc8] font-bold">الأصناف</span>
          <button onClick={addItem} className="text-[11px] text-teal-400 flex items-center gap-1 hover:text-teal-300 transition-colors"><Plus className="w-3 h-3" /> إضافة صنف</button>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 sm:space-y-0">
            <div className="flex sm:hidden items-center justify-between gap-2">
              <input value={item.itemName} onChange={e => updateItem(idx, "itemName", e.target.value)} placeholder="اسم الصنف" className="flex-1 bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-400/50" />
              {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400/40 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="hidden sm:block sm:col-span-5">
                <input value={item.itemName} onChange={e => updateItem(idx, "itemName", e.target.value)} placeholder="اسم الصنف" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-400/50" />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)} placeholder="الكمية" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50 text-center" style={{ direction: "ltr" }} />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <input type="number" min={0} value={item.unitPrice || ""} onChange={e => updateItem(idx, "unitPrice", e.target.value)} placeholder="السعر" className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-teal-400/50 text-center" style={{ direction: "ltr" }} />
              </div>
              <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1">
                <span className="text-[11px] text-amber-400 font-mono font-bold">{formatNum(item.qty * item.unitPrice)}</span>
                <span className="hidden sm:inline">{items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 border border-white/5 bg-white/3 space-y-1">
        {totalVAT > 0 && (
          <>
            <div className="flex items-center justify-between text-xs"><span className="text-[#a6adc8]">الإجمالي قبل الضريبة</span><span className="font-mono text-white">{formatNum(subtotal)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-[#a6adc8]">ضريبة القيمة المضافة</span><span className="font-mono text-red-400">{formatNum(totalVAT)}</span></div>
            <div className="border-t border-white/10 my-1" />
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a6adc8]">الإجمالي</span>
          <span className="text-base font-bold text-amber-400 font-mono">{formatNum(total)} <span className="text-[10px] text-[#6e6a86]">ريال</span></span>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {onShareWithTeacher && total > 0 && <ShareButton onClick={shareInvoice} />}
        <ActionButton onClick={saveInvoice} disabled={!counterparty.trim() || items.some(it => !it.itemName.trim() || it.qty <= 0 || it.unitPrice <= 0)}>
          <Check className="w-3.5 h-3.5" /> حفظ الفاتورة
        </ActionButton>
      </div>
    </div>
  );
}
