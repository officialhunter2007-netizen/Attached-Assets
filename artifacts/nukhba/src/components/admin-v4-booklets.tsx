// ─────────────────────────────────────────────────────────────────────────────
// R1 — Admin tab: booklets needing supervisor review.
//
// Lists booklets whose Gemini-generated outline produced lessons the LLM
// could not safely bind to specific pages (`needsReview=true`). The admin
// can manually set [start,end] page ranges for each lesson, which clears
// the needsReview flag and re-enables the teach route.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle2, BookOpen, RotateCcw } from "lucide-react";

type NeedsReviewLesson = {
  unitCode: string;
  unitName: string;
  lessonCode: string;
  lessonName: string;
  pages: [number, number];
  reason?: string;
};
type Booklet = {
  id: number;
  userId: number;
  subjectId: string;
  title: string;
  pagesCount: number;
  status: string;
  createdAt: string;
  needsReviewLessons: NeedsReviewLesson[];
};

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export function AdminV4Booklets() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Booklet[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Record<string, { start: string; end: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await api("/api/admin/v4/booklets/needs-review");
      setRows(Array.isArray(data?.booklets) ? data.booklets : []);
    } catch (e: any) {
      toast({ title: "فشل تحميل الملازم", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  function dKey(bookletId: number, lessonCode: string): string {
    return `${bookletId}::${lessonCode}`;
  }

  async function bind(bookletId: number, lessonCode: string) {
    const k = dKey(bookletId, lessonCode);
    const d = draft[k];
    const start = Number(d?.start ?? 0);
    const end = Number(d?.end ?? 0);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      toast({ title: "نطاق صفحات غير صالح", description: "أدخل start و end صحيحين (end ≥ start ≥ 1).", variant: "destructive" });
      return;
    }
    setBusy(k);
    try {
      await api(`/api/admin/v4/booklets/${bookletId}/bind-lesson`, {
        method: "POST",
        body: JSON.stringify({ lessonCode, startPage: start, endPage: end }),
      });
      toast({ title: "تم الربط ✓", description: `${lessonCode} → صفحات ${start}-${end}` });
      await refresh();
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[k];
        return copy;
      });
    } catch (e: any) {
      toast({ title: "فشل الربط", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const totalNeedsReview = rows.reduce((s, r) => s + r.needsReviewLessons.length, 0);

  return (
    <div className="space-y-4" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" /> ملازم بحاجة لمراجعة
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {totalNeedsReview > 0
              ? `${rows.length} ملزمة فيها ${totalNeedsReview} درساً لم نتمكن من ربطه بصفحات.`
              : "لا توجد ملازم بحاجة لمراجعة حالياً."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-white/10 rounded-xl">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400/70" />
          ✓ كل الملازم مربوطة بشكل سليم
        </div>
      )}

      {rows.map((b) => (
        <div key={b.id} className="border border-amber-500/30 bg-amber-500/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-bold text-sm">{b.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                #{b.id} · user {b.userId} · {b.subjectId} · {b.pagesCount} صفحة
              </div>
            </div>
            <Badge className="bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
              <AlertTriangle className="w-3 h-3 ml-1" /> {b.needsReviewLessons.length} دروس
            </Badge>
          </div>

          <div className="divide-y divide-white/5">
            {b.needsReviewLessons.map((l) => {
              const k = dKey(b.id, l.lessonCode);
              const d = draft[k] ?? { start: String(l.pages[0]), end: String(l.pages[1]) };
              return (
                <div key={l.lessonCode} className="px-4 py-3 grid md:grid-cols-[1fr_auto] gap-3 items-center">
                  <div>
                    <div className="font-mono text-[11px] text-white/40">{l.unitCode} · {l.unitName}</div>
                    <div className="text-sm font-semibold mt-0.5">{l.lessonName} <span className="text-white/40 font-mono text-[11px]">({l.lessonCode})</span></div>
                    {l.reason && <div className="text-[11px] text-amber-400 mt-1">السبب: {l.reason}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-white/50">صفحة:</div>
                    <Input
                      type="number" min={1} max={b.pagesCount || undefined}
                      value={d.start}
                      onChange={(e) => setDraft((p) => ({ ...p, [k]: { ...d, start: e.target.value } }))}
                      className="w-20 h-8 text-xs" placeholder="من"
                    />
                    <span className="text-white/40">—</span>
                    <Input
                      type="number" min={1} max={b.pagesCount || undefined}
                      value={d.end}
                      onChange={(e) => setDraft((p) => ({ ...p, [k]: { ...d, end: e.target.value } }))}
                      className="w-20 h-8 text-xs" placeholder="إلى"
                    />
                    <Button
                      size="sm" onClick={() => bind(b.id, l.lessonCode)}
                      disabled={busy === k}
                      className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                    >
                      {busy === k ? <Loader2 className="w-3 h-3 animate-spin" /> : "اربط"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminV4Booklets;
