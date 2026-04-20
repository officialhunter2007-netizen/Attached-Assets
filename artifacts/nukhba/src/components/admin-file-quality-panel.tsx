import { useEffect, useState, useCallback } from "react";
import { FileWarning, RefreshCw, Loader2 } from "lucide-react";

type Summary = {
  total: number;
  good: number;
  suspicious: number;
  byReason: Record<string, number>;
  bySource: Record<string, { total: number; suspicious: number }>;
};

type RecentRow = {
  id: number;
  fileId: number | null;
  courseId: number | null;
  userId: number | null;
  source: string;
  quality: string;
  qualityReason: string | null;
  letterRatio: number;
  wsRatio: number;
  replacementRatio: number;
  avgLineLen: number;
  sampleChars: number;
  createdAt: string;
};

type ApiResponse = {
  generatedAt: string;
  last7d: Summary;
  last30d: Summary;
  recent: RecentRow[];
};

const REASON_LABEL: Record<string, string> = {
  ENCODING: "ترميز معطوب",
  LOW_LETTERS: "نسبة الحروف منخفضة",
  WHITESPACE: "مسافات بيضاء كثيرة",
  SHORT_LINES: "أسطر قصيرة جداً",
  TOO_SHORT: "نص قصير جداً",
};

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ar", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminFileQualityPanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/insights/file-quality", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ApiResponse;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "تعذّر التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-amber-400" />
          جودة الملفات المرفوعة
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          تحديث
        </button>
      </div>

      {err && <div className="text-xs text-rose-300 mb-2">خطأ: {err}</div>}

      {data && (
        <div className="space-y-4">
          {(["last7d", "last30d"] as const).map((key) => {
            const s = data[key];
            const label = key === "last7d" ? "آخر 7 أيام" : "آخر 30 يوم";
            const susPct = s.total ? pct(s.suspicious, s.total) : "—";
            return (
              <div key={key} className="rounded-lg border border-white/5 bg-black/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs">
                    إجمالي الرفعات: <strong>{s.total}</strong> · ضعيفة: <strong className="text-amber-300">{s.suspicious}</strong> ({susPct})
                  </span>
                </div>

                {s.total > 0 && (
                  <>
                    <div className="text-xs mb-2 grid grid-cols-2 gap-2">
                      {Object.entries(s.bySource).map(([src, v]) => (
                        <div key={src} className="bg-white/5 rounded px-2 py-1">
                          <span className="text-muted-foreground">{src === "upload" ? "رفع جديد" : "OCR"}:</span>{" "}
                          <strong>{v.total}</strong> · ضعيفة <strong className="text-amber-300">{v.suspicious}</strong> ({pct(v.suspicious, v.total)})
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(REASON_LABEL).map((reason) => {
                        const n = s.byReason[reason] ?? 0;
                        if (n === 0) return null;
                        return (
                          <span
                            key={reason}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200"
                          >
                            {REASON_LABEL[reason]}: <strong>{n}</strong>
                          </span>
                        );
                      })}
                      {Object.keys(s.byReason).length === 0 && (
                        <span className="text-[11px] text-emerald-300">كل الرفعات اعتُبرت جيدة.</span>
                      )}
                    </div>
                  </>
                )}
                {s.total === 0 && <div className="text-xs text-muted-foreground">لا توجد رفعات في هذه الفترة.</div>}
              </div>
            );
          })}

          {data.recent.length > 0 && (
            <details className="rounded-lg border border-white/5 bg-black/20 p-3">
              <summary className="cursor-pointer text-xs font-semibold">آخر 50 حدث (للمعايرة)</summary>
              <div className="mt-2 max-h-64 overflow-auto text-[11px]">
                <table className="w-full">
                  <thead className="text-muted-foreground text-right">
                    <tr>
                      <th className="py-1 pr-2">الوقت</th>
                      <th className="py-1 pr-2">المصدر</th>
                      <th className="py-1 pr-2">النتيجة</th>
                      <th className="py-1 pr-2">السبب</th>
                      <th className="py-1 pr-2">letterRatio</th>
                      <th className="py-1 pr-2">wsRatio</th>
                      <th className="py-1 pr-2">avgLineLen</th>
                      <th className="py-1 pr-2">file/course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.id} className="border-t border-white/5">
                        <td className="py-1 pr-2 whitespace-nowrap">{fmtTime(r.createdAt)}</td>
                        <td className="py-1 pr-2">{r.source}</td>
                        <td className={`py-1 pr-2 ${r.quality === "suspicious" ? "text-amber-300" : "text-emerald-300"}`}>{r.quality}</td>
                        <td className="py-1 pr-2">{r.qualityReason ?? "—"}</td>
                        <td className="py-1 pr-2">{r.letterRatio.toFixed(2)}</td>
                        <td className="py-1 pr-2">{r.wsRatio.toFixed(2)}</td>
                        <td className="py-1 pr-2">{r.avgLineLen.toFixed(1)}</td>
                        <td className="py-1 pr-2">{r.fileId ?? "-"} / {r.courseId ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
