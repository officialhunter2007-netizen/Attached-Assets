import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { BookOpen, RefreshCw, Loader2, GraduationCap, MessageSquare, Users as UsersIcon, X, AlertTriangle, Copy, Download, Check } from "lucide-react";

type Course = {
  courseId: number | null;
  courseName: string | null;
  subjectId: string;
  subjectName: string | null;
  messageCount: number;
  userMessages: number;
  distinctUsers: number;
  sessionCount: number;
  poorSessions: number;
  lastAt: string;
};

type QualityTier = "good" | "warning" | "poor";

function qualityFor(c: { sessionCount: number; poorSessions: number }): { tier: QualityTier; ratio: number } {
  const total = c.sessionCount || 0;
  if (total === 0) return { tier: "good", ratio: 0 };
  const ratio = c.poorSessions / total;
  if (ratio >= 0.5) return { tier: "poor", ratio };
  if (ratio >= 0.25) return { tier: "warning", ratio };
  return { tier: "good", ratio };
}

const QUALITY_STYLES: Record<QualityTier, { dot: string; chip: string; label: string }> = {
  good:    { dot: "bg-emerald-400", chip: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200", label: "جيدة" },
  warning: { dot: "bg-amber-400",   chip: "bg-amber-500/15 border-amber-400/30 text-amber-200",       label: "متوسطة" },
  poor:    { dot: "bg-rose-400",    chip: "bg-rose-500/15 border-rose-400/30 text-rose-200",          label: "ضعيفة" },
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

type ThreadKey = { userId: number; courseKey: string; userName: string | null; userEmail: string | null; courseName: string | null; subjectName: string | null };

export function AdminTeacherMessagesPanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [thread, setThread] = useState<ThreadKey | null>(null);
  const [sortBy, setSortBy] = useState<"messages" | "poorRatio" | "poorCount">("messages");
  const [qualityFilter, setQualityFilter] = useState<"all" | QualityTier>("all");

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

  const displayCourses = useMemo(() => {
    const filtered = qualityFilter === "all"
      ? topCourses
      : topCourses.filter((c) => qualityFor(c).tier === qualityFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "poorCount") return b.poorSessions - a.poorSessions;
      if (sortBy === "poorRatio") return qualityFor(b).ratio - qualityFor(a).ratio;
      return b.messageCount - a.messageCount;
    });
    return sorted;
  }, [topCourses, sortBy, qualityFilter]);

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
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <div className="text-xs font-bold text-white/85">المواد الجامعية الأكثر دراسةً</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-white/55">
              <span>الجودة:</span>
              {(["all", "good", "warning", "poor"] as const).map((q) => {
                const active = qualityFilter === q;
                const label = q === "all" ? "الكل" : QUALITY_STYLES[q].label;
                return (
                  <button
                    key={q}
                    onClick={() => setQualityFilter(q)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                      active
                        ? (q === "all" ? "bg-white/15 border-white/30 text-white" : QUALITY_STYLES[q as QualityTier].chip)
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {q !== "all" && <span className={`w-1.5 h-1.5 rounded-full ${QUALITY_STYLES[q as QualityTier].dot}`} />}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/55">
              <span>ترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white/85 focus:outline-none focus:border-amber-400/40"
              >
                <option value="messages" className="bg-[#0b0d12]">الأكثر رسائل</option>
                <option value="poorRatio" className="bg-[#0b0d12]">الأعلى نسبة جلسات ضعيفة</option>
                <option value="poorCount" className="bg-[#0b0d12]">الأكثر جلسات ضعيفة</option>
              </select>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-white/40 mb-2">
          نحسب «جلسة» لكل (طالب × مادة) خلال آخر ٧ أيام. الجلسة الضعيفة: الطالب أرسل أقل من رسالتين أو لم يردّ المعلم إطلاقاً.
        </div>
        {displayCourses.length === 0 ? (
          <div className="text-[11px] text-white/40 py-2">
            {topCourses.length === 0
              ? "لا توجد جلسات مرتبطة بمادة جامعية خلال آخر ٧ أيام."
              : "لا توجد مواد ضمن فلتر الجودة الحالي."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {displayCourses.slice(0, 9).map((c) => {
              const q = qualityFor(c);
              const styles = QUALITY_STYLES[q.tier];
              const pct = c.sessionCount > 0 ? Math.round(q.ratio * 100) : 0;
              return (
                <button
                  key={`${c.courseId}-${c.subjectId}`}
                  onClick={() => setFilter(String(c.courseId))}
                  className={`text-right rounded-lg border px-3 py-2 transition-colors relative ${
                    filter === String(c.courseId)
                      ? "bg-amber-500/15 border-amber-400/40"
                      : "bg-black/20 border-white/10 hover:border-amber-400/30 hover:bg-amber-500/5"
                  }`}
                  title={`فلترة الرسائل بهذه المادة • ${c.poorSessions} من ${c.sessionCount} جلسة ضعيفة (${pct}%)`}
                >
                  <span className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full ${styles.dot}`} aria-hidden />
                  <div className="text-xs font-bold text-white truncate pl-3">{c.courseName ?? `مادة #${c.courseId}`}</div>
                  <div className="text-[10px] text-white/50 truncate">{c.subjectName ?? c.subjectId}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/70 flex-wrap">
                    <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> {c.distinctUsers} طالب</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {c.messageCount} رسالة</span>
                  </div>
                  <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${styles.chip}`}>
                    {q.tier === "poor" && <AlertTriangle className="w-3 h-3" />}
                    <span>جلسات ضعيفة: {c.poorSessions}/{c.sessionCount} ({pct}%)</span>
                  </div>
                </button>
              );
            })}
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
            <button
              key={m.id}
              type="button"
              onClick={() => setThread({
                userId: m.userId,
                courseKey: m.courseId != null ? String(m.courseId) : "none",
                userName: m.userName,
                userEmail: m.userEmail,
                courseName: m.courseName,
                subjectName: m.subjectName,
              })}
              className="w-full text-right grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 hover:bg-white/[0.05] focus:bg-white/[0.05] focus:outline-none transition-colors cursor-pointer"
              title="عرض كامل المحادثة بين هذا الطالب والمعلم في هذه المادة"
            >
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
            </button>
          ))}
        </div>
      </div>

      {thread && <ThreadDrawer thread={thread} onClose={() => setThread(null)} />}
    </div>
  );
}

type ThreadMsg = {
  id: number;
  userId: number;
  subjectId: string;
  subjectName: string | null;
  courseId: number | null;
  courseName: string | null;
  role: "user" | "assistant";
  content: string;
  isDiagnostic: number;
  stageIndex: number | null;
  createdAt: string;
};

type ThreadResponse = {
  user: { id: number; name: string | null; email: string | null };
  course: { id: number | null; name: string | null; subjectId: string | null; subjectName: string | null };
  totals: { total: number; userMessages: number; firstAt: string | null; lastAt: string | null };
  messages: ThreadMsg[];
  nextCursor: string | null;
  nextCursorId: number | null;
  hasMore: boolean;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  try {
    return d.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d.toISOString().replace("T", " ").slice(0, 16);
  }
}

function ThreadDrawer({ thread, onClose }: { thread: ThreadKey; onClose: () => void }) {
  const [messages, setMessages] = useState<ThreadMsg[]>([]);
  const [meta, setMeta] = useState<{
    user: ThreadResponse["user"];
    course: ThreadResponse["course"];
    totals: ThreadResponse["totals"];
  } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"copy" | "download" | null>(null);
  const [exportNotice, setExportNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        userId: String(thread.userId),
        course: thread.courseKey,
        limit: "50",
      });
      if (cursor) params.set("before", cursor);
      if (cursorId !== null) params.set("beforeId", String(cursorId));
      const res = await fetch(`/api/admin/insights/teacher-thread?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 403 ? "هذه البيانات للمشرفين فقط." : "تعذّر تحميل المحادثة.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ThreadResponse;
      setMessages((prev) => [...prev, ...json.messages]);
      setCursor(json.nextCursor);
      setCursorId(json.nextCursorId);
      setHasMore(json.hasMore);
      setMeta((prev) => prev ?? { user: json.user, course: json.course, totals: json.totals });
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, [thread.userId, thread.courseKey, cursor, cursorId]);

  // Initial load
  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setCursorId(null);
    setHasMore(true);
    setMeta(null);
    // Trigger fresh load
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          userId: String(thread.userId),
          course: thread.courseKey,
          limit: "50",
        });
        const res = await fetch(`/api/admin/insights/teacher-thread?${params.toString()}`, { credentials: "include" });
        if (!res.ok) {
          setError(res.status === 403 ? "هذه البيانات للمشرفين فقط." : "تعذّر تحميل المحادثة.");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ThreadResponse;
        setMessages(json.messages);
        setCursor(json.nextCursor);
        setCursorId(json.nextCursorId);
        setHasMore(json.hasMore);
        setMeta({ user: json.user, course: json.course, totals: json.totals });
      } catch {
        setError("تعذّر الاتصال بالخادم.");
      } finally {
        setLoading(false);
      }
    })();
  }, [thread.userId, thread.courseKey]);

  // Infinite scroll: load more when scrolled near the bottom (older messages)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (loading || !hasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        loadMore();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMore, loading, hasMore]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const headerName = meta?.user.name ?? thread.userName ?? meta?.user.email ?? thread.userEmail ?? `#${thread.userId}`;
  const headerCourse = meta?.course.name ?? thread.courseName ?? (thread.courseKey === "none" ? "بدون مادة جامعية" : `مادة #${thread.courseKey}`);
  const headerSubject = meta?.course.subjectName ?? thread.subjectName;

  const fetchAllMessages = useCallback(async (): Promise<ThreadMsg[]> => {
    const all: ThreadMsg[] = [...messages];
    let c = cursor;
    let cId = cursorId;
    let more = hasMore;
    let safetyHops = 0;
    while (more && safetyHops < 200) {
      safetyHops++;
      const params = new URLSearchParams({
        userId: String(thread.userId),
        course: thread.courseKey,
        limit: "200",
      });
      if (c) params.set("before", c);
      if (cId !== null) params.set("beforeId", String(cId));
      const res = await fetch(`/api/admin/insights/teacher-thread?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as ThreadResponse;
      all.push(...json.messages);
      c = json.nextCursor;
      cId = json.nextCursorId;
      more = json.hasMore;
    }
    // Dedupe by id and sort chronologically (oldest first)
    const byId = new Map<number, ThreadMsg>();
    for (const m of all) byId.set(m.id, m);
    return [...byId.values()].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return a.id - b.id;
    });
  }, [messages, cursor, cursorId, hasMore, thread.userId, thread.courseKey]);

  const buildExport = useCallback((all: ThreadMsg[]): { content: string; filename: string } => {
    const studentName = meta?.user.name ?? thread.userName ?? null;
    const studentEmail = meta?.user.email ?? thread.userEmail ?? null;
    const courseName = meta?.course.name ?? thread.courseName ?? (thread.courseKey === "none" ? "بدون مادة جامعية" : `مادة #${thread.courseKey}`);
    const subjectName = meta?.course.subjectName ?? thread.subjectName ?? null;
    const headerLines = [
      `# محادثة المعلم الذكي`,
      ``,
      `- الطالب: ${studentName ?? "—"}${studentEmail ? ` <${studentEmail}>` : ""}`,
      `- معرّف الطالب: ${thread.userId}`,
      `- المادة: ${courseName}`,
    ];
    if (subjectName) headerLines.push(`- التخصص: ${subjectName}`);
    headerLines.push(`- إجمالي الرسائل: ${all.length}`);
    headerLines.push(`- تاريخ التصدير: ${new Date().toISOString()}`);
    headerLines.push(``, `---`, ``);
    const body = all.map((m) => {
      const role = m.role === "user" ? "طالب" : "معلم";
      const ts = new Date(m.createdAt).toISOString();
      const tags: string[] = [];
      if (m.isDiagnostic) tags.push("تشخيصي");
      if (m.stageIndex != null) tags.push(`مرحلة ${m.stageIndex}`);
      const tagStr = tags.length ? ` _(${tags.join("، ")})_` : "";
      return `## ${role} — ${ts}${tagStr}\n\n${m.content}\n`;
    }).join("\n");
    const datePart = new Date().toISOString().slice(0, 10);
    const courseSlug = String(courseName)
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `course-${thread.courseKey}`;
    const filename = `student-${thread.userId}-${courseSlug}-${datePart}.md`;
    return { content: headerLines.join("\n") + body, filename };
  }, [meta, thread]);

  const handleExport = useCallback(async (mode: "copy" | "download") => {
    if (exporting) return;
    setExporting(mode);
    setExportNotice(null);
    try {
      const all = await fetchAllMessages();
      if (all.length === 0) {
        setExportNotice({ kind: "err", text: "لا توجد رسائل للتصدير." });
        setExporting(null);
        return;
      }
      const { content, filename } = buildExport(all);
      if (mode === "copy") {
        await navigator.clipboard.writeText(content);
        setExportNotice({ kind: "ok", text: `تم نسخ ${all.length} رسالة إلى الحافظة.` });
      } else {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportNotice({ kind: "ok", text: `تم تنزيل ${filename}` });
      }
    } catch {
      setExportNotice({ kind: "err", text: "تعذّر تصدير المحادثة." });
    } finally {
      setExporting(null);
      setTimeout(() => setExportNotice(null), 4000);
    }
  }, [exporting, fetchAllMessages, buildExport]);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="كامل المحادثة بين الطالب والمعلم"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full sm:w-[560px] md:w-[640px] bg-[#0b0d12] border-l border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-emerald-300" />
              <div className="text-sm font-bold text-white truncate" title={meta?.user.email ?? thread.userEmail ?? undefined}>
                {headerName}
              </div>
              <span className="text-[10px] text-white/40">ID {thread.userId}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 flex items-center gap-1 max-w-[260px] truncate">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{headerCourse}</span>
              </span>
              {headerSubject && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/65">
                  {headerSubject}
                </span>
              )}
              {meta?.totals && (
                <span className="text-white/45 text-[10px]">
                  {meta.totals.total} رسالة • {meta.totals.userMessages} من الطالب
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleExport("copy")}
              disabled={exporting !== null || messages.length === 0}
              className="flex items-center gap-1 text-[11px] text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="نسخ كامل المحادثة إلى الحافظة"
              aria-label="نسخ المحادثة"
            >
              {exporting === "copy"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Copy className="w-3.5 h-3.5" />}
              نسخ
            </button>
            <button
              onClick={() => handleExport("download")}
              disabled={exporting !== null || messages.length === 0}
              className="flex items-center gap-1 text-[11px] text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="تنزيل المحادثة كملف Markdown"
              aria-label="تنزيل المحادثة"
            >
              {exporting === "download"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              تنزيل
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-1.5"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {exportNotice && (
          <div
            className={`mx-3 mt-3 text-[11px] rounded-lg px-3 py-2 border flex items-center gap-1.5 ${
              exportNotice.kind === "ok"
                ? "text-emerald-200 bg-emerald-500/10 border-emerald-400/25"
                : "text-red-300 bg-red-500/10 border-red-400/20"
            }`}
            role="status"
          >
            {exportNotice.kind === "ok" && <Check className="w-3.5 h-3.5" />}
            <span>{exportNotice.text}</span>
          </div>
        )}

        {error && (
          <div className="m-3 text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !loading && !error && (
            <div className="text-center text-xs text-white/45 py-10">
              لا توجد رسائل في هذه المحادثة.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border px-3 py-2 ${
                m.role === "user"
                  ? "bg-blue-500/10 border-blue-400/20"
                  : "bg-purple-500/10 border-purple-400/20"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded font-bold ${
                  m.role === "user"
                    ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
                    : "bg-purple-500/20 text-purple-200 border border-purple-400/30"
                }`}>
                  {m.role === "user" ? "طالب" : "معلم"}
                </span>
                {m.isDiagnostic ? (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25 text-amber-200 text-[10px]">
                    تشخيصي
                  </span>
                ) : null}
                {m.stageIndex != null && (
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/55 text-[10px]">
                    مرحلة {m.stageIndex}
                  </span>
                )}
                <span className="text-white/40 text-[10px] mr-auto">{formatDateTime(m.createdAt)}</span>
              </div>
              <div className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-center text-xs text-white/55 py-3">
              <Loader2 className="w-4 h-4 animate-spin inline-block ml-2" />
              جاري التحميل…
            </div>
          )}

          {!loading && hasMore && messages.length > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={loadMore}
                className="text-[11px] text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5"
              >
                تحميل رسائل أقدم
              </button>
            </div>
          )}

          {!loading && !hasMore && messages.length > 0 && (
            <div className="text-center text-[10px] text-white/35 pt-2 pb-1">
              — بداية المحادثة —
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
