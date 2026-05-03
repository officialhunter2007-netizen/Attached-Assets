import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, RefreshCw, Filter } from "lucide-react";

// One row from /api/admin/gem-ledger. Mirrors the gemLedger schema
// loosely — we render whatever is present without strict typing so a
// schema tweak doesn't silently blank the table.
type LedgerRow = {
  id: number;
  userId: number | null;
  subjectSubId: number | null;
  delta: number;
  balanceAfter: number | null;
  reason: string;
  source: string;
  note: string | null;
  adminUserId: number | null;
  createdAt: string;
  // Optional joined fields (the API may include them in a future iteration).
  userName?: string | null;
  userEmail?: string | null;
  subjectName?: string | null;
};

const REASON_LABEL: Record<string, string> = {
  grant: "منح",
  debit: "خصم",
  refund: "استرداد",
  adjust: "تعديل يدوي",
  forfeit: "إسقاط (انتهاء)",
  extend: "تمديد",
};

const SOURCE_LABEL: Record<string, string> = {
  approve_request: "اعتماد طلب",
  activate_card: "بطاقة تفعيل",
  admin_grant: "منح إداري",
  admin_refund: "استرداد إداري",
  admin_adjust: "تعديل إداري",
  ai_teach: "درس ذكي",
  ai_lesson: "توليد درس",
  ai_image: "صورة تعليمية",
  platform_help: "المساعد العام",
  daily_rollover: "تجديد يومي",
  subscription_extend: "تمديد اشتراك",
  subscription_revoke: "إلغاء اشتراك",
};

export function AdminGemLedger() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [subjectSubId, setSubjectSubId] = useState("");
  const [reason, setReason] = useState("");
  const [source, setSource] = useState("");
  const [requestId, setRequestId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set("userId", userId.trim());
      if (subjectSubId.trim()) params.set("subjectSubId", subjectSubId.trim());
      if (reason) params.set("reason", reason);
      if (source) params.set("source", source);
      if (requestId.trim()) params.set("requestId", requestId.trim());
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      params.set("limit", "200");
      const r = await fetch(`/api/admin/gem-ledger?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "تعذّر تحميل سجل الجواهر", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, subjectSubId, reason, source, requestId, from, to, toast]);

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = rows.reduce((acc, r) => {
    if (r.delta > 0) acc.in += r.delta;
    else acc.out += -r.delta;
    return acc;
  }, { in: 0, out: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" /> سجل الجواهر
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          كل عملية منح/خصم/استرداد للجواهر — استخدم الفلاتر للتدقيق على مستخدم أو فترة زمنية محدّدة.
        </p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <Label className="text-[11px]">User ID</Label>
            <Input className="bg-black/40 h-9" value={userId} onChange={e => setUserId(e.target.value)} placeholder="مثال: 12" />
          </div>
          <div>
            <Label className="text-[11px]">Subject Sub ID</Label>
            <Input className="bg-black/40 h-9" value={subjectSubId} onChange={e => setSubjectSubId(e.target.value)} placeholder="مثال: 88" />
          </div>
          <div>
            <Label className="text-[11px]">السبب</Label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full h-9 rounded-md bg-black/40 border border-white/10 text-sm px-2"
            >
              <option value="">الكل</option>
              {Object.entries(REASON_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[11px]">المصدر</Label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full h-9 rounded-md bg-black/40 border border-white/10 text-sm px-2"
            >
              <option value="">الكل</option>
              {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Request ID</Label>
            <Input
              className="bg-black/40 h-9 font-mono text-xs"
              value={requestId}
              onChange={e => setRequestId(e.target.value)}
              placeholder="r_xxx_yyy"
            />
          </div>
          <div>
            <Label className="text-[11px]">من</Label>
            <Input type="datetime-local" className="bg-black/40 h-9" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px]">إلى</Label>
            <Input type="datetime-local" className="bg-black/40 h-9" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="text-xs text-muted-foreground mr-auto">
            {rows.length} عملية — منح: <span className="text-emerald-400 font-bold">+{totals.in.toLocaleString("ar-EG")}</span>
            {" • "}
            خصم: <span className="text-red-400 font-bold">−{totals.out.toLocaleString("ar-EG")}</span>
          </div>
          <Button variant="outline" size="sm" className="border-white/10" onClick={load} disabled={loading}>
            <Filter className="w-4 h-4 ml-1" /> تطبيق الفلاتر
          </Button>
          <Button variant="outline" size="sm" className="border-white/10" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {loading ? "جاري التحميل..." : "لا توجد عمليات تطابق الفلاتر."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">المستخدم</th>
                  <th className="text-right p-2">المادة</th>
                  <th className="text-right p-2">الكمية</th>
                  <th className="text-right p-2">الرصيد بعد</th>
                  <th className="text-right p-2">السبب</th>
                  <th className="text-right p-2">المصدر</th>
                  <th className="text-right p-2">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="p-2 text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString("ar-EG")}</td>
                    <td className="p-2 text-xs">
                      {r.userName || r.userEmail || (r.userId != null ? `#${r.userId}` : "—")}
                    </td>
                    <td className="p-2 text-xs">
                      {r.subjectName || (r.subjectSubId != null ? `#${r.subjectSubId}` : "—")}
                    </td>
                    <td className={`p-2 font-bold whitespace-nowrap ${r.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {r.delta > 0 ? "+" : ""}{r.delta.toLocaleString("ar-EG")}
                    </td>
                    <td className="p-2 text-xs">
                      {r.balanceAfter != null ? r.balanceAfter.toLocaleString("ar-EG") : "—"}
                    </td>
                    <td className="p-2 text-xs">{REASON_LABEL[r.reason] ?? r.reason}</td>
                    <td className="p-2 text-xs">{SOURCE_LABEL[r.source] ?? r.source}</td>
                    <td className="p-2 text-xs max-w-[260px] truncate" title={r.note ?? ""}>
                      {r.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
