import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Wallet, RefreshCw, Filter, Plus, Minus, Gem } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Admin: v4 monthly gem wallets (student_gem_wallets).
//
// This is the v4 source of truth for a student's spendable balance per
// specialty — DISTINCT from the legacy "اشتراكات المواد" tab which only lists
// legacy user_subject_subscriptions rows. A welcome-gift-only student has a v4
// wallet but NO legacy row, so this tab is the only place they appear.
//
// Lists wallets with status (active|expired|exhausted) + days remaining, and
// lets an admin credit/deduct gems with a mandatory reason (append-only ledger).
// ─────────────────────────────────────────────────────────────────────────────

type WalletRow = {
  id: number;
  userId: number;
  userEmail: string;
  userName: string | null;
  subjectId: string;
  specialtyName: string;
  specialtyIcon: string | null;
  gemsBalance: number;
  expiresAt: string | null;
  lastRenewalAt: string | null;
  status: "active" | "expired" | "exhausted";
  daysRemaining: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const STATUS_META: Record<WalletRow["status"], { label: string; cls: string }> = {
  active: { label: "نشطة", cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
  expired: { label: "منتهية", cls: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
  exhausted: { label: "نفدت", cls: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
};

function fmtGems(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG");
}

export function AdminV4Wallets() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");

  // Adjust dialog state.
  const [adjustWallet, setAdjustWallet] = useState<WalletRow | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set("userId", userId.trim());
      if (subjectId.trim()) params.set("subjectId", subjectId.trim());
      if (status) params.set("status", status);
      const r = await fetch(`/api/admin/v4/wallets?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "تعذّر تحميل محافظ v4", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, subjectId, status, toast]);

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openAdjust(w: WalletRow) {
    setAdjustWallet(w);
    setDelta("");
    setReason("");
  }

  async function submitAdjust() {
    if (!adjustWallet) return;
    const deltaNum = Number(delta);
    if (!Number.isInteger(deltaNum) || deltaNum === 0) {
      toast({ title: "أدخل عدداً صحيحاً غير صفر", variant: "destructive" });
      return;
    }
    if (reason.trim().length < 3) {
      toast({ title: "اكتب سبباً مفصّلاً (٣ أحرف على الأقل)", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/v4/wallets/${adjustWallet.id}/adjust`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ delta: deltaNum, reason: reason.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      toast({
        title: "تم تعديل المحفظة",
        description: `${deltaNum > 0 ? "+" : ""}${fmtGems(deltaNum)} جوهرة — الرصيد الآن ${fmtGems(j?.wallet?.gemsBalance ?? 0)}`,
        className: "bg-emerald-600 border-none text-white",
      });
      setAdjustWallet(null);
      await load();
    } catch (err: any) {
      toast({ title: "فشل التعديل", description: err?.message ?? "حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const totalGems = rows.reduce((acc, r) => acc + (r.gemsBalance || 0), 0);
  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold" /> محافظ الجواهر الشهرية (v4)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            المصدر الحقيقي لرصيد الطالب لكل تخصص في v4 — يشمل طلاب هدية الترحيب الذين لا يظهرون في تبويب الاشتراكات القديم.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 border-white/10">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">عدد المحافظ</p>
          <p className="font-bold text-sm">{fmtGems(rows.length)}</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">محافظ نشطة</p>
          <p className="font-bold text-sm text-emerald-400">{fmtGems(activeCount)}</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center col-span-2 sm:col-span-1">
          <p className="text-[10px] text-muted-foreground mb-1">إجمالي الأرصدة</p>
          <p className="font-bold text-sm text-gold flex items-center justify-center gap-1">
            <Gem className="w-3.5 h-3.5" /> {fmtGems(totalGems)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-[11px]">User ID</Label>
            <Input className="bg-black/40 h-9" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="مثال: 12" />
          </div>
          <div>
            <Label className="text-[11px]">تخصص (slug)</Label>
            <Input className="bg-black/40 h-9 font-mono text-xs" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="مثال: cyber" />
          </div>
          <div>
            <Label className="text-[11px]">الحالة</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 rounded-md bg-black/40 border border-white/10 px-2 text-sm"
            >
              <option value="">الكل</option>
              <option value="active">نشطة</option>
              <option value="expired">منتهية</option>
              <option value="exhausted">نفدت</option>
            </select>
          </div>
          <Button onClick={load} disabled={loading} className="gap-1.5 h-9 gradient-gold text-primary-foreground font-bold">
            <Filter className="w-4 h-4" /> تصفية
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-black/40 text-xs text-muted-foreground">
              <tr>
                <th className="p-2">الطالب</th>
                <th className="p-2">التخصص</th>
                <th className="p-2">الرصيد</th>
                <th className="p-2">الانتهاء</th>
                <th className="p-2">أيام متبقية</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                    {loading ? "جاري التحميل..." : "لا توجد محافظ مطابقة."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const sm = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="p-2 text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold">{r.userName || `#${r.userId}`}</span>
                          <span className="text-[10px] text-muted-foreground" dir="ltr">{r.userEmail || ""}</span>
                        </div>
                      </td>
                      <td className="p-2 text-xs">
                        <span className="flex items-center gap-1">
                          {r.specialtyIcon ? <span>{r.specialtyIcon}</span> : null}
                          {r.specialtyName || r.subjectId}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-gold whitespace-nowrap">{fmtGems(r.gemsBalance)}</td>
                      <td className="p-2 text-xs whitespace-nowrap">{fmtDate(r.expiresAt)}</td>
                      <td className="p-2 text-xs">{r.daysRemaining != null ? fmtGems(r.daysRemaining) : "—"}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
                      </td>
                      <td className="p-2">
                        <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/10 gap-1" onClick={() => openAdjust(r)}>
                          تعديل الرصيد
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust dialog */}
      <Dialog open={!!adjustWallet} onOpenChange={(o) => { if (!o) setAdjustWallet(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold" /> تعديل رصيد المحفظة
          </DialogTitle>
          {adjustWallet && (
            <div className="space-y-3 mt-2">
              <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الطالب</span>
                  <span className="font-semibold">{adjustWallet.userName || adjustWallet.userEmail || `#${adjustWallet.userId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التخصص</span>
                  <span className="font-semibold">{adjustWallet.specialtyName || adjustWallet.subjectId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرصيد الحالي</span>
                  <span className="font-bold text-gold">{fmtGems(adjustWallet.gemsBalance)} جوهرة</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">قيمة التعديل (موجب = إضافة، سالب = خصم)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 border-white/10 shrink-0"
                    onClick={() => setDelta((d) => String(-(Math.abs(Number(d) || 0))))}
                    title="جعلها خصماً">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    value={delta}
                    onChange={(e) => setDelta(e.target.value)}
                    inputMode="numeric"
                    dir="ltr"
                    className="text-center font-mono font-bold bg-black/40"
                    placeholder="مثال: 100 أو 100-"
                  />
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 border-white/10 shrink-0"
                    onClick={() => setDelta((d) => String(Math.abs(Number(d) || 0)))}
                    title="جعلها إضافة">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  الرصيد لا ينزل تحت الصفر. الحد الأقصى للتعديل ١٠٠٬٠٠٠ جوهرة في المرة.
                </p>
              </div>

              <div>
                <Label className="text-xs">السبب (إلزامي — يُسجَّل في سجل الجواهر)</Label>
                <Input className="bg-black/40 mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تعويض عن انقطاع الخدمة" />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" className="border-white/10" onClick={() => setAdjustWallet(null)} disabled={saving}>إلغاء</Button>
                <Button className="gradient-gold text-primary-foreground font-bold gap-1.5" onClick={submitAdjust} disabled={saving}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gem className="w-4 h-4" />}
                  {saving ? "جاري الحفظ..." : "تطبيق التعديل"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
