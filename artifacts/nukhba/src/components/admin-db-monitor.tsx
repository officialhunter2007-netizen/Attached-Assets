import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";

type TableStat = {
  name: string;
  totalMb: number;
  dataMb: number;
  indexMb: number;
  rowEstimate: number;
};

type DbSize = {
  totalMb: number;
  tables: TableStat[];
};

function fmtMb(mb: number): string {
  if (!Number.isFinite(mb)) return "0 KB";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}

function fmtRows(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const TABLE_LABELS: Record<string, string> = {
  ai_teacher_messages: "محادثات المعلم",
  ai_usage_events: "أحداث الذكاء الاصطناعي",
  users: "المستخدمون",
  subscription_requests: "طلبات الاشتراك",
  user_subject_subscriptions: "اشتراكات المواد",
  user_subject_first_lessons: "الدروس المجانية",
  user_subject_plans: "خطط التعلم",
  activation_cards: "بطاقات التفعيل",
  student_mistakes: "أخطاء الطلاب",
  lesson_summaries: "ملخصات الدروس",
  study_cards: "بطاقات الدراسة",
  lesson_views: "مشاهدات الدروس",
  quiz_attempts: "محاولات الاختبارات",
  activity_events: "أحداث النشاط",
  lab_reports: "تقارير المختبر",
  course_materials: "المواد الدراسية",
  material_chapters: "الفصول",
  material_chunks: "مقاطع المواد",
  chapter_progress: "تقدم الفصول",
  referrals: "الإحالات",
  conversations: "المحادثات القديمة",
  messages: "الرسائل القديمة",
  discount_codes: "رموز الخصم",
  discount_code_uses: "استخدامات الخصم",
  material_chapter_progress: "تقدم الفصول",
};

function severityColor(ratio: number): string {
  if (ratio >= 0.8) return "text-red-400 border-red-500/30 from-red-500/10";
  if (ratio >= 0.5) return "text-amber-400 border-amber-500/30 from-amber-500/10";
  return "text-emerald-400 border-emerald-500/30 from-emerald-500/10";
}

const WARN_MB = 400;

export function AdminDbMonitor() {
  const { toast } = useToast();
  const [data, setData] = useState<DbSize | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkDays, setBulkDays] = useState<string>("30");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [studentUserId, setStudentUserId] = useState<string>("");
  const [studentSubjectId, setStudentSubjectId] = useState<string>("");
  const [studentDeleting, setStudentDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/db-size", { credentials: "include" });
      const json = await r.json();
      if (json?.error) throw new Error(json.error);
      setData(json as DbSize);
    } catch (err: any) {
      toast({ title: "تعذّر تحميل حجم قاعدة البيانات", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const bulkDelete = useCallback(async () => {
    const days = Number(bulkDays);
    if (!Number.isFinite(days) || days < 1) {
      toast({ title: "أدخل عدد أيام صحيح", variant: "destructive" });
      return;
    }
    setBulkDeleting(true);
    try {
      const r = await fetch(`/api/admin/conversation-logs/bulk?olderThanDays=${days}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok || json?.error) throw new Error(json?.error || "خطأ");
      toast({
        title: "تم الحذف",
        description: `حُذفت ${json.deleted} رسالة أقدم من ${days} يوماً`,
      });
      setShowBulkDialog(false);
      await load();
    } catch (err: any) {
      toast({ title: "فشل الحذف", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  }, [bulkDays, load, toast]);

  const studentDelete = useCallback(async () => {
    const uid = studentUserId.trim();
    const sid = studentSubjectId.trim();
    if (!uid || !sid) {
      toast({ title: "أدخل معرّف الطالب ومعرّف المادة", variant: "destructive" });
      return;
    }
    setStudentDeleting(true);
    try {
      const url = `/api/admin/conversation-logs?userId=${encodeURIComponent(uid)}&subjectId=${encodeURIComponent(sid)}`;
      const r = await fetch(url, { method: "DELETE", credentials: "include" });
      const json = await r.json();
      if (!r.ok || json?.error) throw new Error(json?.error || "خطأ");
      toast({
        title: "تم حذف المحادثة",
        description: `حُذفت ${json.deleted} رسالة للطالب ${uid} في المادة ${sid}`,
      });
      setShowStudentDialog(false);
      setStudentUserId("");
      setStudentSubjectId("");
      await load();
    } catch (err: any) {
      toast({ title: "فشل الحذف", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setStudentDeleting(false);
    }
  }, [studentUserId, studentSubjectId, load, toast]);

  const totalMb = data?.totalMb ?? 0;
  const ratio = Math.min(1, totalMb / WARN_MB);
  const colorCls = severityColor(ratio);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-sm">حجم قاعدة البيانات</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            onClick={() => setShowStudentDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            حذف محادثة طالب
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
            onClick={() => setShowBulkDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
            حذف محادثات قديمة
          </Button>
          <Button onClick={refresh} disabled={refreshing || loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${(refreshing || loading) ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Total size card */}
      <div className={`rounded-2xl border bg-gradient-to-br to-transparent ${colorCls} p-5`}>
        <p className="text-xs text-muted-foreground mb-1">الحجم الإجمالي لقاعدة البيانات</p>
        <p className={`text-4xl font-black ${colorCls.split(" ")[0]}`}>
          {loading ? "—" : fmtMb(totalMb)}
        </p>
        {!loading && totalMb >= WARN_MB * 0.5 && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {totalMb >= WARN_MB * 0.8
              ? "الحجم مرتفع — يُنصح بحذف المحادثات القديمة"
              : "الحجم في حدود الاعتدال — راقبه بانتظام"}
          </p>
        )}
      </div>

      {/* Per-table breakdown */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-bold text-sm">تفصيل حسب الجدول</h3>
          <p className="text-xs text-muted-foreground mt-0.5">مرتّبة من الأكبر للأصغر</p>
        </div>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">جارٍ التحميل…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/30 text-right text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">الجدول</th>
                  <th className="px-4 py-2 font-medium">الحجم الكلي</th>
                  <th className="px-4 py-2 font-medium">البيانات</th>
                  <th className="px-4 py-2 font-medium">الفهارس</th>
                  <th className="px-4 py-2 font-medium">الصفوف (تقريبي)</th>
                  <th className="px-4 py-2 font-medium">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {(data?.tables ?? []).map((t, i) => {
                  const tableRatio = totalMb > 0 ? t.totalMb / totalMb : 0;
                  const isTop = t.name === "ai_teacher_messages" || t.name === "ai_usage_events";
                  return (
                    <tr key={t.name} className={`border-t border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""} ${isTop ? "bg-amber-500/5" : ""}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-xs">
                          {TABLE_LABELS[t.name] ?? t.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground mr-1 font-mono" dir="ltr">({t.name})</span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-xs">
                        <span className={t.totalMb > 10 ? "text-amber-400" : "text-white/80"}>
                          {fmtMb(t.totalMb)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtMb(t.dataMb)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtMb(t.indexMb)}</td>
                      <td className="px-4 py-2.5 text-xs">{fmtRows(t.rowEstimate)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                              style={{ width: `${Math.min(100, tableRatio * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground min-w-[32px] text-left" dir="ltr">
                            {(tableRatio * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data?.tables?.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-student delete dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-sm bg-black/95 border-white/10">
          <DialogTitle className="flex items-center gap-2 text-orange-400">
            <Trash2 className="w-4 h-4" />
            حذف محادثة طالب محدد
          </DialogTitle>
          <div dir="rtl" className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              سيتم حذف جميع رسائل المحادثة الخاصة بهذا الطالب في المادة المحددة نهائياً. لا يمكن التراجع.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">معرّف الطالب (userId)</label>
                <input
                  type="text"
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  placeholder="مثال: 42"
                  className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">معرّف المادة (subjectId)</label>
                <input
                  type="text"
                  value={studentSubjectId}
                  onChange={(e) => setStudentSubjectId(e.target.value)}
                  placeholder="مثال: 3"
                  className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-right"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowStudentDialog(false); setStudentUserId(""); setStudentSubjectId(""); }}
                disabled={studentDeleting}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={studentDelete}
                disabled={studentDeleting || !studentUserId.trim() || !studentSubjectId.trim()}
                className="gap-1 bg-orange-600 hover:bg-orange-700"
              >
                {studentDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {studentDeleting ? "جارٍ الحذف…" : "تأكيد الحذف"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-sm bg-black/95 border-white/10">
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="w-4 h-4" />
            حذف محادثات قديمة
          </DialogTitle>
          <div dir="rtl" className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              سيتم حذف جميع رسائل المحادثات الأقدم من العدد المحدد من الأيام نهائياً من جدول{" "}
              <span className="font-mono text-xs text-white/80">ai_teacher_messages</span>.
              لا يمكن التراجع عن هذه العملية.
            </p>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">احذف الرسائل الأقدم من:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={bulkDays}
                  onChange={(e) => setBulkDays(e.target.value)}
                  className="w-24 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-right"
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">يوم</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(false)} disabled={bulkDeleting}>
                إلغاء
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="gap-1"
              >
                {bulkDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                {bulkDeleting ? "جارٍ الحذف…" : "تأكيد الحذف"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
