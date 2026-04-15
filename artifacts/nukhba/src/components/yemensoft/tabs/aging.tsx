import { useMemo } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { useSimulator } from "../context";
import { ShareButton } from "../shared-ui";
import { formatNum } from "../utils";

export function AgingTab() {
  const { invoices, onShareWithTeacher } = useSimulator();

  const data = useMemo(() => {
    const today = new Date();
    const creditInvoices = invoices.filter(inv => inv.isPosted && inv.paymentType === "credit");

    const computeAging = (type: "sale" | "purchase") => {
      const filtered = creditInvoices.filter(inv => inv.type === type);
      const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d120: 0 };
      const details: { name: string; amount: number; days: number; bucket: string }[] = [];

      for (const inv of filtered) {
        const total = inv.items.reduce((s, it) => s + it.qty * it.unitPrice * (1 + it.vatRate / 100), 0);
        const invDate = new Date(inv.date);
        const days = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
        let bucket = "current";
        if (days <= 30) { buckets.current += total; bucket = "حالي"; }
        else if (days <= 60) { buckets.d30 += total; bucket = "31-60"; }
        else if (days <= 90) { buckets.d60 += total; bucket = "61-90"; }
        else if (days <= 120) { buckets.d90 += total; bucket = "91-120"; }
        else { buckets.d120 += total; bucket = "120+"; }
        details.push({ name: inv.counterparty, amount: total, days, bucket });
      }
      return { buckets, details, total: Object.values(buckets).reduce((s, v) => s + v, 0) };
    };

    return { receivable: computeAging("sale"), payable: computeAging("purchase") };
  }, [invoices]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = "تقرير تقادم الذمم:\n\n";
    text += "📥 ذمم العملاء (مدينون):\n";
    text += `  الإجمالي: ${formatNum(data.receivable.total)} ريال\n`;
    for (const d of data.receivable.details) text += `  • ${d.name}: ${formatNum(d.amount)} ريال (${d.days} يوم — ${d.bucket})\n`;
    text += "\n📤 ذمم الموردين (دائنون):\n";
    text += `  الإجمالي: ${formatNum(data.payable.total)} ريال\n`;
    for (const d of data.payable.details) text += `  • ${d.name}: ${formatNum(d.amount)} ريال (${d.days} يوم — ${d.bucket})\n`;
    onShareWithTeacher(text);
  };

  const BucketBar = ({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) => {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#a6adc8]">{label}</span>
          <span className={`font-mono font-bold ${color}`}>{formatNum(amount)}</span>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${color.includes("emerald") ? "bg-emerald-500" : color.includes("amber") ? "bg-amber-500" : color.includes("red") ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const AgingSection = ({ title, icon, data: sectionData, color }: { title: string; icon: React.ReactNode; data: typeof data.receivable; color: string }) => (
    <div className={`rounded-xl border p-4 space-y-3 ${color}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-2">{icon} {title}</h4>
        <span className="text-sm font-bold font-mono text-amber-400">{formatNum(sectionData.total)}</span>
      </div>
      <BucketBar label="حالي (0-30 يوم)" amount={sectionData.buckets.current} total={sectionData.total} color="text-emerald-400" />
      <BucketBar label="31-60 يوم" amount={sectionData.buckets.d30} total={sectionData.total} color="text-blue-400" />
      <BucketBar label="61-90 يوم" amount={sectionData.buckets.d60} total={sectionData.total} color="text-amber-400" />
      <BucketBar label="91-120 يوم" amount={sectionData.buckets.d90} total={sectionData.total} color="text-amber-400" />
      <BucketBar label="أكثر من 120 يوم" amount={sectionData.buckets.d120} total={sectionData.total} color="text-red-400" />
      {sectionData.details.length > 0 && (
        <div className="mt-3 space-y-1">
          <span className="text-[10px] text-[#6e6a86] font-bold">التفاصيل</span>
          {sectionData.details.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/3">
              <span className="text-white">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[#6e6a86]">{d.days} يوم</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${d.days > 90 ? "bg-red-500/20 text-red-400" : d.days > 60 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{d.bucket}</span>
                <span className="font-mono font-bold text-amber-400">{formatNum(d.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {sectionData.details.length === 0 && <div className="text-center py-4 text-[11px] text-[#6e6a86]">لا توجد ذمم آجلة</div>}
    </div>
  );

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-teal-400" /> تقادم الذمم</h3>
        {onShareWithTeacher && <ShareButton onClick={share} />}
      </div>
      <AgingSection title="ذمم العملاء (مدينون)" icon={<AlertTriangle className="w-4 h-4 text-blue-400" />} data={data.receivable} color="border-blue-500/20 bg-blue-500/5" />
      <AgingSection title="ذمم الموردين (دائنون)" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} data={data.payable} color="border-red-500/20 bg-red-500/5" />
    </div>
  );
}
