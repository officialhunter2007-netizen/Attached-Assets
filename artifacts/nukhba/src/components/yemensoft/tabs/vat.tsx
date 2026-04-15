import { useMemo } from "react";
import { Receipt, FileText, Check } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton, ActionButton, Badge } from "../shared-ui";
import { formatNum } from "../utils";

export function VatTab() {
  const { invoices, accounts, addJournalEntry, addAudit, onShareWithTeacher } = useSimulator();

  const data = useMemo(() => {
    const postedInvoices = invoices.filter(inv => inv.isPosted);
    const salesInvoices = postedInvoices.filter(inv => inv.type === "sale");
    const purchaseInvoices = postedInvoices.filter(inv => inv.type === "purchase");

    const calcVat = (invs: typeof invoices) => {
      let taxableAmount = 0; let vatAmount = 0;
      for (const inv of invs) {
        for (const item of inv.items) {
          const lineTotal = item.qty * item.unitPrice;
          taxableAmount += lineTotal;
          vatAmount += lineTotal * (item.vatRate / 100);
        }
      }
      return { taxableAmount, vatAmount };
    };

    const salesVat = calcVat(salesInvoices);
    const purchaseVat = calcVat(purchaseInvoices);
    const netVat = salesVat.vatAmount - purchaseVat.vatAmount;
    const outputVatBalance = accounts.find(a => a.code === "2600")?.balance || 0;
    const inputVatBalance = accounts.find(a => a.code === "1700")?.balance || 0;

    return { salesInvoices, purchaseInvoices, salesVat, purchaseVat, netVat, outputVatBalance, inputVatBalance };
  }, [invoices, accounts]);

  const settleVat = () => {
    if (data.netVat <= 0) return;
    addJournalEntry(new Date().toISOString().split("T")[0], "تسوية ضريبة القيمة المضافة", [
      { accountCode: "2600", debit: data.outputVatBalance, credit: 0, description: "تصفية ضريبة مخرجات" },
      { accountCode: "1700", debit: 0, credit: data.inputVatBalance, description: "تصفية ضريبة مدخلات" },
      ...(data.netVat > 0 ? [{ accountCode: "1100", debit: 0, credit: data.netVat, description: "دفع صافي الضريبة" }] : [{ accountCode: "1100", debit: Math.abs(data.netVat), credit: 0, description: "استرداد ضريبة" }]),
    ], "الضريبة");
    addAudit("تسوية ضريبة", "الضريبة", `صافي: ${formatNum(data.netVat)}`);
  };

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "إقرار ضريبة القيمة المضافة:\n\n";
    text += `📤 ضريبة المخرجات (المبيعات):\n`;
    text += `  الوعاء الضريبي: ${formatNum(data.salesVat.taxableAmount)} ريال\n`;
    text += `  الضريبة المستحقة: ${formatNum(data.salesVat.vatAmount)} ريال\n`;
    text += `  عدد الفواتير: ${data.salesInvoices.length}\n\n`;
    text += `📥 ضريبة المدخلات (المشتريات):\n`;
    text += `  الوعاء الضريبي: ${formatNum(data.purchaseVat.taxableAmount)} ريال\n`;
    text += `  الضريبة القابلة للخصم: ${formatNum(data.purchaseVat.vatAmount)} ريال\n`;
    text += `  عدد الفواتير: ${data.purchaseInvoices.length}\n\n`;
    text += `💰 صافي الضريبة: ${formatNum(data.netVat)} ريال (${data.netVat > 0 ? "مستحقة للدفع" : "قابلة للاسترداد"})`;
    onShareWithTeacher(text);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-teal-400" /> ضريبة القيمة المضافة</h3>
        {onShareWithTeacher && <ShareButton onClick={share} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> ضريبة المخرجات (مبيعات)</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الوعاء الضريبي</span><span className="text-white font-mono">{formatNum(data.salesVat.taxableAmount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الضريبة المستحقة</span><span className="text-blue-400 font-mono font-bold">{formatNum(data.salesVat.vatAmount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">عدد الفواتير</span><span className="text-white">{data.salesInvoices.length}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> ضريبة المدخلات (مشتريات)</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الوعاء الضريبي</span><span className="text-white font-mono">{formatNum(data.purchaseVat.taxableAmount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">الضريبة القابلة للخصم</span><span className="text-emerald-400 font-mono font-bold">{formatNum(data.purchaseVat.vatAmount)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#a6adc8]">عدد الفواتير</span><span className="text-white">{data.purchaseInvoices.length}</span></div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${data.netVat > 0 ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#a6adc8] mb-1">صافي ضريبة القيمة المضافة</div>
            <div className={`text-xl font-bold font-mono ${data.netVat > 0 ? "text-red-400" : "text-emerald-400"}`}>{formatNum(Math.abs(data.netVat))} <span className="text-sm text-[#6e6a86]">ريال</span></div>
            <Badge color={data.netVat > 0 ? "red" : "emerald"}>{data.netVat > 0 ? "مستحقة للدفع" : data.netVat < 0 ? "قابلة للاسترداد" : "لا توجد ضريبة"}</Badge>
          </div>
          {(data.outputVatBalance > 0 || data.inputVatBalance > 0) && (
            <ActionButton onClick={settleVat} variant="amber"><Check className="w-3 h-3" /> تسوية الضريبة</ActionButton>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 p-4 space-y-3">
        <h4 className="text-xs font-bold text-white">تفاصيل الفواتير</h4>
        {data.salesInvoices.length === 0 && data.purchaseInvoices.length === 0 ? (
          <div className="text-center py-4 text-[11px] text-[#6e6a86]">لا توجد فواتير مرحّلة حتى الآن</div>
        ) : (
          <div className="space-y-1">
            {[...data.salesInvoices, ...data.purchaseInvoices].map(inv => {
              const total = inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
              const vat = inv.items.reduce((s, it) => s + it.qty * it.unitPrice * (it.vatRate / 100), 0);
              return (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/3">
                  <div className="flex items-center gap-2">
                    <Badge color={inv.type === "sale" ? "blue" : "emerald"}>{inv.type === "sale" ? "مبيعات" : "مشتريات"}</Badge>
                    <span className="text-white">{inv.counterparty}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#6e6a86]">الأساس: {formatNum(total)}</span>
                    <span className="text-amber-400 font-mono font-bold">الضريبة: {formatNum(vat)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
