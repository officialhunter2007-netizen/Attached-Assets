import { useEffect, useMemo, useState, useCallback } from "react";
import { BookOpen, RefreshCw, Loader2, GraduationCap, MessageSquare, Users as UsersIcon } from "lucide-react";

type Course = {
  courseId: number | null;
  courseName: string | null;
  subjectId: string;
  subjectName: string | null;
  messageCount: number;
  userMessages: number;
  distinctUsers: number;
  lastAt: string;
};

type Msg = {
  id: number;
  userId: number;
  subjectId: string;
  subjectName: string | null;
  courseId: number | null;
  courseName: string | null;
  role: "user" | "assistant";
  contentPreview: string;
  isDiagnostic: number;
  stageIndex: number | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

type ApiResponse = {
  topCourses: Course[];
  messages: Msg[];
  filter: { course: string | null };
};

type FilterValue = "all" | "none" | string; // "all" | "none" | numeric courseId

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

export function AdminTeacherMessagesPanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  const load = useCallback(async (f: FilterValue) => {
    setLoading(true);
    setError(null);
    try {
      const qs = f === "all" ? "" : `?course=${encodeURIComponent(f)}`;
      const res = await fetch(`/api/admin/insights/teacher-messages${qs}`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 403 ? "هذه البيانات للمشرفين فقط." : "تعذّر تحميل البيانات.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  const topCourses = data?.topCourses ?? [];
  const messages = data?.messages ?? [];

  const filterChips = useMemo(() => {
    const chips: Array<{ value: FilterValue; label: string; count?: number }> = [
      { value: "all", label: "كل الرسائل" },
      { value: "none", label: "بدون مادة جامعية" },
    ];
    // Dedupe by courseId — the same course can appear in topCourses multiple
    // times if used across different subjects/specializations. Sum counts.
    const byCourse = new Map<number, { label: string; count: number }>();
    for (const c of topCourses) {
      if (c.courseId == null) continue;
      const existing = byCourse.get(c.courseId);
      if (existing) {
        existing.count += c.messageCount;
      } else {
        byCourse.set(c.courseId, {
          label: c.courseName ?? `مادة #${c.courseId}`,
          count: c.messageCount,
        });
      }
    }
    const sorted = [...byCourse.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
    for (const [courseId, info] of sorted) {
      chips.push({ value: String(courseId), label: info.label, count: info.count });
    }
    return chips;
  }, [topCourses]);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400/30 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">رسائل المعلم الذكي حسب المادة الجامعية</div>
            <div className="text-[11px] text-white/55">آخر ٧ أيام — يظهر اسم المادة الموجَّهة بالملفات حين تكون الجلسة مرتبطة بها.</div>
          </div>
        </div>
        <button
          onClick={() => load(filter)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
          title="تحديث"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          تحديث
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Top courses widget */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-xs font-bold text-white/85">المواد الجامعية الأكثر دراسةً</div>
        </div>
        {topCourses.length === 0 ? (
          <div className="text-[11px] text-white/40 py-2">لا توجد جلسات مرتبطة بمادة جامعية خلال آخر ٧ أيام.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topCourses.slice(0, 9).map((c) => (
              <button
                key={`${c.courseId}-${c.subjectId}`}
                onClick={() => setFilter(String(c.courseId))}
                className={`text-right rounded-lg border px-3 py-2 transition-colors ${
                  filter === String(c.courseId)
                    ? "bg-amber-500/15 border-amber-400/40"
                    : "bg-black/20 border-white/10 hover:border-amber-400/30 hover:bg-amber-500/5"
                }`}
                title="فلترة الرسائل بهذه المادة"
              >
                <div className="text-xs font-bold text-white truncate">{c.courseName ?? `مادة #${c.courseId}`}</div>
                <div className="text-[10px] text-white/50 truncate">{c.subjectName ?? c.subjectId}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/70">
                  <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> {c.distinctUsers} طالب</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {c.messageCount} رسالة</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {filterChips.map((chip) => {
          const active = filter === chip.value;
          return (
            <button
              key={String(chip.value)}
              onClick={() => setFilter(chip.value)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? "bg-amber-500/25 border-amber-400/50 text-white"
                  : "bg-white/5 border-white/10 text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {chip.label}
              {typeof chip.count === "number" && (
                <span className="mr-1 text-[10px] text-white/50">({chip.count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages list */}
      <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 border-b border-white/10 text-[11px] text-white/55 bg-white/[0.03]">
          <div>الرسالة</div>
          <div>الوقت</div>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
          {loading && messages.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-white/50">
              <Loader2 className="w-4 h-4 animate-spin inline-block ml-2" />
              جاري التحميل…
            </div>
          )}
          {!loading && messages.length === 0 && !error && (
            <div className="px-3 py-6 text-center text-xs text-white/45">
              لا توجد رسائل ضمن هذا الفلتر.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 hover:bg-white/[0.03]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    m.role === "user"
                      ? "bg-blue-500/15 text-blue-200 border border-blue-400/25"
                      : "bg-purple-500/15 text-purple-200 border border-purple-400/25"
                  }`}>
                    {m.role === "user" ? "طالب" : "معلم"}
                  </span>
                  <span className="text-white/85 font-medium truncate max-w-[180px]" title={m.userEmail ?? undefined}>
                    {m.userName ?? m.userEmail ?? `#${m.userId}`}
                  </span>
                  <span className="text-white/35 text-[10px]">ID {m.userId}</span>
                  {m.subjectName && (
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 text-[10px]">
                      {m.subjectName}
                    </span>
                  )}
                  {m.courseName ? (
                    <span
                      className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-[10px] flex items-center gap-1 max-w-[220px] truncate"
                      title={m.courseName}
                    >
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{m.courseName}</span>
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/10 text-white/35 text-[10px]">
                      بدون مادة
                    </span>
                  )}
                  {m.isDiagnostic ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25 text-amber-200 text-[10px]">
                      تشخيصي
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                  {m.contentPreview}
                </div>
              </div>
              <div className="text-[10px] text-white/40 whitespace-nowrap pt-0.5">
                {timeAgo(m.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
