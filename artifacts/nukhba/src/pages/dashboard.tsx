import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Crown, ChevronLeft, BookOpen, FileText, Lock, ChevronDown, ChevronUp, Loader2, Monitor, X, AlertTriangle, Clock, FlaskConical, Search, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { getSubjectById } from "@/lib/curriculum";

interface LessonSummary {
  id: number;
  subjectId: string;
  subjectName: string;
  title: string;
  summaryHtml: string;
  conversationDate: string;
  messagesCount: number;
}

function SummaryCard({ summary }: { summary: LessonSummary }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(summary.conversationDate).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const safeHtml = summary.summaryHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');

  return (
    <div className="glass border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-sm">{summary.title || `جلسة ${summary.subjectName}`}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.subjectName} · {date} · {summary.messagesCount} رسالة</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeHtml }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LabReport {
  id: number;
  subjectId: string;
  subjectName: string;
  envTitle: string;
  envBriefing: string;
  reportText: string;
  feedbackHtml: string;
  createdAt: string;
}

function LabReportCard({ report }: { report: LabReport }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(report.createdAt).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const safeFeedback = (report.feedbackHtml || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');

  return (
    <div className="glass border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-emerald" />
          </div>
          <div className="text-right min-w-0">
            <h4 className="font-bold text-sm truncate">{report.envTitle || "تقرير مختبر"}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {report.subjectName || report.subjectId} · {date}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {report.envBriefing && (
                <div className="text-xs text-muted-foreground italic">{report.envBriefing}</div>
              )}
              <div>
                <div className="text-xs font-bold text-gold mb-2">📋 تقريرك المرسل</div>
                <pre className="text-xs whitespace-pre-wrap bg-black/30 border border-white/5 rounded-xl p-3 text-white/85 leading-relaxed font-sans" dir="rtl">{report.reportText}</pre>
              </div>
              {safeFeedback ? (
                <div>
                  <div className="text-xs font-bold text-emerald mb-2">📝 ملاحظات المعلم</div>
                  <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeFeedback }} />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">لم تُسجَّل ملاحظات المعلم لهذا التقرير.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type DateRange = "all" | "7d" | "30d" | "month" | "custom";

function LabReportsSection({ reports, loading }: { reports: LabReport[]; loading: boolean }) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const subjects = Array.from(
    reports.reduce((map, r) => {
      if (!map.has(r.subjectId)) map.set(r.subjectId, r.subjectName || r.subjectId);
      return map;
    }, new Map<string, string>())
  ).map(([id, name]) => ({ id, name }));

  const { fromDate, toDate } = (() => {
    const now = new Date();
    if (dateRange === "7d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "30d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      let to: Date | null = null;
      if (customTo) {
        to = new Date(customTo);
        to.setHours(23, 59, 59, 999);
      }
      return { fromDate: from, toDate: to };
    }
    return { fromDate: null as Date | null, toDate: null as Date | null };
  })();

  const q = query.trim().toLowerCase();
  const filtered = reports.filter(r => {
    if (selectedSubject && r.subjectId !== selectedSubject) return false;
    if (fromDate || toDate) {
      const created = new Date(r.createdAt);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
    }
    if (!q) return true;
    const title = (r.envTitle || "").toLowerCase();
    const feedback = (r.feedbackHtml || "").toLowerCase();
    return title.includes(q) || feedback.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin ml-2" />
        جاري التحميل...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="glass p-10 rounded-3xl border-white/5 text-center text-muted-foreground">
        <FlaskConical className="w-10 h-10 mx-auto mb-4 opacity-30" />
        <p>لم تُرسل أي تقرير من البيئات التطبيقية بعد. عند إنهاء بيئة وإرسالها للمعلم، تظهر تقاريرك هنا للمراجعة لاحقاً.</p>
      </div>
    );
  }

  const dateFilterActive =
    dateRange === "7d" ||
    dateRange === "30d" ||
    dateRange === "month" ||
    (dateRange === "custom" && (customFrom !== "" || customTo !== ""));
  const isFiltering = selectedSubject !== null || q.length > 0 || dateFilterActive;

  const dateChips: { id: DateRange; label: string }[] = [
    { id: "all", label: "كل الفترات" },
    { id: "7d", label: "آخر ٧ أيام" },
    { id: "30d", label: "آخر ٣٠ يوم" },
    { id: "month", label: "هذا الشهر" },
    { id: "custom", label: "مدى مخصّص" },
  ];

  const resetFilters = () => {
    setSelectedSubject(null);
    setQuery("");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                selectedSubject === null
                  ? "bg-emerald/20 border-emerald/40 text-emerald"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
              }`}
            >
              الكل ({reports.length})
            </button>
            {subjects.map(s => {
              const count = reports.filter(r => r.subjectId === s.id).length;
              const active = selectedSubject === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(active ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? "bg-emerald/20 border-emerald/40 text-emerald"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {s.name} ({count})
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {dateChips.map(c => {
            const active = dateRange === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setDateRange(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {dateRange === "custom" && (
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-xs text-muted-foreground">من</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald/40"
            />
            <label className="text-xs text-muted-foreground">إلى</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald/40"
            />
          </div>
        )}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث في عناوين البيئات أو ملاحظات المعلم..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald/40"
            dir="rtl"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass p-10 rounded-3xl border-white/5 text-center text-muted-foreground">
          <FlaskConical className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p className="mb-3">لا توجد تقارير مطابقة للبحث.</p>
          {isFiltering && (
            <button
              onClick={resetFilters}
              className="text-xs text-emerald hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => <LabReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}

interface SubjectSub {
  id: number;
  subjectId: string;
  subjectName: string | null;
  planType: string;
  messagesUsed: number;
  messagesLimit: number;
  expiresAt: string;
}

interface MaterialProgressInfo {
  chaptersTotal: number;
  completedCount: number;
  currentChapterIndex: number;
  currentChapterTitle: string | null;
}

interface MaterialWithProgress {
  id: number;
  fileName: string;
  status: "processing" | "ready" | "error";
  subjectId: string;
  subjectName: string;
  progress: MaterialProgressInfo | null;
  createdAt: string | null;
  lastInteractedAt: string | null;
}

function MaterialProgressCard({ material }: { material: MaterialWithProgress }) {
  const p = material.progress!;
  const pct = p.chaptersTotal > 0 ? Math.round((p.completedCount / p.chaptersTotal) * 100) : 0;
  return (
    <Link href={`/subject/${material.subjectId}?sources=${material.id}`}>
      <div className="glass border border-white/5 rounded-2xl p-5 hover:bg-white/5 hover:border-amber-400/30 transition-all cursor-pointer h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm truncate" title={material.fileName}>{material.fileName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{material.subjectName}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>تقدّم القراءة: {p.completedCount} / {p.chaptersTotal} فصول</span>
            <span className="font-bold text-amber-300">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {p.currentChapterTitle && (
            <p className="mt-2 text-[11px] text-muted-foreground truncate">
              الفصل الحالي: <span className="text-white/70">{p.currentChapterTitle}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

const getMobileCodingDismissKey = (userId: string) => `nukhba_coding_mobile_dismissed_${userId}`;

function MobileCodingWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-l from-amber-500/20 via-orange-500/15 to-amber-500/20 p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-x-6 -translate-y-6" />
      <button
        onClick={onDismiss}
        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
          <Monitor className="w-7 h-7 text-amber-400" />
        </div>
        <div className="flex-1 pt-1">
          <h3 className="font-bold text-amber-300 text-base mb-1">تجربة أفضل على الكمبيوتر</h3>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            أنت مشترك في مواد برمجية تحتاج محرر أكواد — استخدم جهاز كمبيوتر أو لابتوب للحصول على أفضل تجربة تعليمية مع محرر الأكواد التفاعلي.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: views } = useGetLessonViews();
  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);
  const [mySubjectSubs, setMySubjectSubs] = useState<SubjectSub[]>([]);
  const [showMobileCodingWarning, setShowMobileCodingWarning] = useState(false);
  const [materials, setMaterials] = useState<MaterialWithProgress[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lesson-summaries", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));

    fetch("/api/lab-reports", { credentials: "include" })
      .then(r => r.json())
      .then(data => setLabReports(Array.isArray(data) ? data : []))
      .catch(() => setLabReports([]))
      .finally(() => setLabReportsLoading(false));

    fetch("/api/subscriptions/my-subjects", { credentials: "include" })
      .then(r => r.json())
      .then((data: SubjectSub[]) => {
        if (!Array.isArray(data)) return;
        setMySubjectSubs(data);

        const now = new Date();
        const activeSubs = data.filter(s => new Date(s.expiresAt) > now && s.messagesUsed < s.messagesLimit);
        const hasCodingSub = activeSubs.some(s => {
          const subject = getSubjectById(s.subjectId);
          return subject?.hasCoding === true;
        });

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
        const dismissKey = user?.id ? getMobileCodingDismissKey(user.id) : "";
        const dismissed = dismissKey ? localStorage.getItem(dismissKey) === "true" : false;

        if (isMobile && hasCodingSub && !dismissed) {
          setShowMobileCodingWarning(true);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const subs = mySubjectSubs;
    if (subs.length === 0) {
      setMaterials([]);
      setMaterialsLoading(false);
      return;
    }
    setMaterialsLoading(true);
    const uniqueSubjects = new Map<string, string>();
    subs.forEach(s => {
      if (!uniqueSubjects.has(s.subjectId)) {
        uniqueSubjects.set(s.subjectId, s.subjectName || getSubjectById(s.subjectId)?.name || s.subjectId);
      }
    });
    interface ApiMaterial {
      id: number;
      fileName: string;
      status: "processing" | "ready" | "error";
      createdAt?: string | null;
      progress: {
        chaptersTotal: number;
        completedCount: number;
        currentChapterIndex: number;
        currentChapterTitle: string | null;
        lastInteractedAt?: string | null;
      } | null;
    }
    interface ApiMaterialsResponse { materials?: ApiMaterial[] }
    Promise.all(
      Array.from(uniqueSubjects.entries()).map(async ([subjectId, subjectName]): Promise<MaterialWithProgress[]> => {
        try {
          const r = await fetch(`/api/materials?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "include" });
          if (!r.ok) return [];
          const data = (await r.json()) as ApiMaterialsResponse;
          const list = Array.isArray(data?.materials) ? data.materials : [];
          return list
            .filter((m): m is ApiMaterial & { progress: NonNullable<ApiMaterial["progress"]> } =>
              m.status === "ready" && !!m.progress && m.progress.chaptersTotal > 0)
            .map((m): MaterialWithProgress => ({
              id: m.id,
              fileName: m.fileName,
              status: m.status,
              subjectId,
              subjectName,
              createdAt: m.createdAt ?? null,
              lastInteractedAt: m.progress.lastInteractedAt ?? null,
              progress: {
                chaptersTotal: m.progress.chaptersTotal,
                completedCount: m.progress.completedCount,
                currentChapterIndex: m.progress.currentChapterIndex,
                currentChapterTitle: m.progress.currentChapterTitle ?? null,
              },
            }));
        } catch {
          return [];
        }
      }),
    )
      .then(results => {
        if (cancelled) return;
        const flat = results.flat();
        const ts = (m: MaterialWithProgress): number => {
          const v = m.lastInteractedAt ?? m.createdAt;
          const t = v ? Date.parse(v) : NaN;
          return Number.isFinite(t) ? t : 0;
        };
        flat.sort((a, b) => ts(b) - ts(a));
        setMaterials(flat);
      })
      .finally(() => { if (!cancelled) setMaterialsLoading(false); });
    return () => { cancelled = true; };
  }, [mySubjectSubs]);

  const totalLessons = views?.length || 0;
  const challengesAnswered = views?.filter(v => v.challengeAnswered).length || 0;
  const points = user?.points || 0;

  const now = new Date();
  const activeSubjectSubs = mySubjectSubs.filter(s => new Date(s.expiresAt) > now);
  const usableSubjectSubs = activeSubjectSubs.filter(s => s.messagesUsed < s.messagesLimit);
  const hasAnyActiveSubjectSub = activeSubjectSubs.length > 0;
  const isBlocked = user?.firstLessonComplete && !hasAnyActiveSubjectSub;

  const expiredSubs = mySubjectSubs.filter(s => new Date(s.expiresAt) <= now);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiringSoonSubs = usableSubjectSubs.filter(s => new Date(s.expiresAt) <= twoDaysFromNow);

  const handleDismissMobileCoding = () => {
    if (user?.id) {
      localStorage.setItem(getMobileCodingDismissKey(user.id), "true");
    }
    setShowMobileCodingWarning(false);
  };

  let level = "مبتدئ";
  let maxPoints = 100;
  let levelColor = "text-zinc-400";
  const isMaxLevel = points > 1500;
  if (isMaxLevel) { level = "أسطورة"; maxPoints = points; levelColor = "text-purple-400"; }
  else if (points > 700) { level = "نُخبة"; maxPoints = 1500; levelColor = "text-emerald"; }
  else if (points > 300) { level = "متقدم"; maxPoints = 700; levelColor = "text-gold"; }
  else if (points > 100) { level = "متعلم"; maxPoints = 300; levelColor = "text-blue-400"; }

  const progress = isMaxLevel ? 100 : Math.min(100, (points / maxPoints) * 100);

  if (isBlocked) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="glass p-5 rounded-3xl border-gold/20 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold">انتهت جلستك المجانية</h2>
              <p className="text-sm text-muted-foreground">اختر طريقتك للاستمرار أدناه</p>
            </div>
          </div>

          <div className="mb-8">
            {/* Subscription Card */}
            <div className="glass-gold rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center mb-3">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-bold text-gold mb-1">اشترك في نُخبة</h3>
                <p className="text-sm text-muted-foreground mb-2">وصول غير محدود مع كل المواد والمسارات</p>
                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  <div>🟤 برونز — ٢٠ رسالة يومياً / ١٤ يوم</div>
                  <div>⚪ فضة — ٤٠ رسالة يومياً / ١٤ يوم</div>
                  <div>🟡 ذهب — ٧٠ رسالة يومياً / ١٤ يوم</div>
                </div>
              </div>
              <Link href="/subscription">
                <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">
                  عرض الباقات والأسعار
                </Button>
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-black mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald rounded-full" />
            تقارير المختبرات
          </h1>
          <div className="mb-8">
            <LabReportsSection reports={labReports} loading={labReportsLoading} />
          </div>

          <h1 className="text-2xl font-black mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gold rounded-full" />
            ملخصاتي
          </h1>

          {summariesLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : summaries.length === 0 ? (
            <div className="glass p-12 rounded-3xl border-white/5 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>لم تُكمل أي جلسة بعد لتُولّد منها ملخص.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(s => <SummaryCard key={s.id} summary={s} />)}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative min-h-screen">
        {/* Background */}
        <div className="absolute inset-0 bg-grid-fine opacity-25 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

      <div className="relative container mx-auto px-4 py-10 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #F59E0B, #D97706)", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }} />
            <h1 className="text-3xl md:text-4xl font-black">لوحة القيادة</h1>
          </div>
          <p className="text-xs text-gold/70 pr-4">معلّمك يتذكّر كل جلسة، كل خطأ صحّحته، وكل مهارة أتقنتها — هذا ما لا يفعله ChatGPT.</p>
        </motion.div>

        <AnimatePresence>
          {showMobileCodingWarning && (
            <MobileCodingWarning onDismiss={handleDismissMobileCoding} />
          )}
        </AnimatePresence>

        {expiredSubs.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-red-500/40 bg-gradient-to-l from-red-500/15 via-red-600/10 to-red-500/15 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-300 text-base mb-1">انتهت اشتراكاتك!</h3>
                <div className="space-y-1 mb-3">
                  {expiredSubs.map(s => (
                    <p key={s.id} className="text-sm text-red-200/70">
                      <span className="font-bold text-red-300">{s.subjectName || s.subjectId}</span>
                      {" — "}انتهى بتاريخ {new Date(s.expiresAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  ))}
                </div>
                <p className="text-sm text-red-200/60 mb-3">لن تتمكن من الاستمرار في التعلم إلا بعد تجديد الاشتراك.</p>
                <Link href="/subscription">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-bold rounded-xl shadow-lg shadow-gold/20">
                    جدّد الاشتراك الآن
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {expiringSoonSubs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-l from-yellow-500/10 via-yellow-600/5 to-yellow-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-300 text-sm">اشتراكات على وشك الانتهاء</h4>
                <p className="text-xs text-yellow-200/60">
                  {expiringSoonSubs.map(s => s.subjectName || s.subjectId).join("، ")} — ستنتهي خلال يومين
                </p>
              </div>
              <Link href="/subscription">
                <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs rounded-xl">
                  مدّد الآن
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Level + Progress card */}
          <div className="lg:col-span-2 relative rounded-3xl p-6 md:p-8 overflow-hidden"
            style={{
              background: "rgba(10,13,22,0.85)",
              border: "1px solid rgba(245,158,11,0.25)",
              boxShadow: "0 0 30px rgba(245,158,11,0.08), 0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full pointer-events-none"
              style={{ background: "radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 65%)" }}
            />
            <div className="absolute top-0 left-6 right-6 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)" }}
            />
            <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10">
              <div>
                <p className="text-xs text-muted-foreground mb-1">المستوى الحالي</p>
                <h2 className={`text-3xl md:text-4xl font-black ${levelColor}`}>{level}</h2>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground mb-1">مجموع النقاط</p>
                <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  {points} <Trophy className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                </div>
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{points} نقطة</span>
                <span>{isMaxLevel ? "🏆 وصلت للقمة!" : `${maxPoints} نقطة للمستوى التالي`}</span>
              </div>
              <Progress value={progress} className={`h-3 bg-white/5 ${isMaxLevel ? "[&>div]:bg-purple-500" : "[&>div]:bg-gold"}`} />
            </div>
          </div>

          {/* Stats mini cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="relative rounded-2xl p-4 md:p-6 flex flex-col justify-center items-center text-center overflow-hidden"
              style={{
                background: "rgba(10,10,18,0.85)",
                border: "1px solid rgba(249,115,22,0.35)",
                boxShadow: "0 0 18px rgba(249,115,22,0.12)",
              }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(249,115,22,0.15), transparent)" }}
              />
              <Flame className="w-7 h-7 md:w-8 md:h-8 mb-2" style={{ color: "#f97316" }} />
              <div className="text-2xl md:text-3xl font-bold mb-0.5">{user?.streakDays || 0}</div>
              <div className="text-xs text-muted-foreground">أيام متتالية</div>
            </div>
            <div className="relative rounded-2xl p-4 md:p-6 flex flex-col justify-center items-center text-center overflow-hidden"
              style={{
                background: "rgba(8,12,22,0.85)",
                border: "1px solid rgba(59,130,246,0.35)",
                boxShadow: "0 0 18px rgba(59,130,246,0.12)",
              }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(59,130,246,0.15), transparent)" }}
              />
              <BookOpen className="w-7 h-7 md:w-8 md:h-8 mb-2 text-blue-400" />
              <div className="text-2xl md:text-3xl font-bold mb-0.5">{totalLessons}</div>
              <div className="text-xs text-muted-foreground">دروس مكتملة</div>
            </div>
            <div className="relative rounded-2xl p-4 md:p-5 flex flex-col justify-center items-center text-center col-span-2 overflow-hidden"
              style={{
                background: "rgba(5,15,12,0.85)",
                border: "1px solid rgba(16,185,129,0.35)",
                boxShadow: "0 0 18px rgba(16,185,129,0.12)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center top, rgba(16,185,129,0.08), transparent 60%)" }}
              />
              <Target className="w-7 h-7 mb-2 relative z-10" style={{ color: "#10b981" }} />
              <div className="text-2xl font-bold mb-0.5 relative z-10">{challengesAnswered}</div>
              <div className="text-xs text-muted-foreground relative z-10">تحديات مجابة</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-2 h-8 bg-gold rounded-full" />
              الدروس الأخيرة
            </h3>
            <div className="glass rounded-3xl border-white/5 overflow-hidden">
              {views?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  لم تبدأ أي درس بعد. <Link href="/learn" className="text-gold">ابدأ الآن!</Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {views?.slice(0, 5).map(view => (
                    <Link key={view.id} href={`/lesson/${view.subjectId}/${view.unitId}/${view.lessonId}`}>
                      <div className="p-4 md:p-6 hover:bg-white/5 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gold">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg group-hover:text-gold transition-colors">{view.lessonTitle}</h4>
                            <p className="text-sm text-muted-foreground">{view.subjectName}</p>
                          </div>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-6 rounded-3xl border-gold/20">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold" />
                حالة الاشتراك
              </h3>
              {usableSubjectSubs.length > 0 ? (
                <div>
                  <div className="text-lg font-black text-gold mb-2">{usableSubjectSubs.length} {usableSubjectSubs.length === 1 ? "اشتراك نشط" : "اشتراكات نشطة"}</div>
                  <div className="space-y-2 mb-3">
                    {usableSubjectSubs.slice(0, 3).map(s => (
                      <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>{s.subjectName || s.subjectId}</span>
                        <span className="text-emerald">{Math.max(0, s.messagesLimit - s.messagesUsed)} رسالة متبقية</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-emerald flex items-center gap-1"><Target className="w-4 h-4"/> مفعل وفعال</p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">لا توجد اشتراكات نشطة أو لم يتبقَّ رصيد رسائل</p>
                  <Link href="/subscription">
                    <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">اشترك الآن</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-400 rounded-full" />
            <Library className="w-6 h-6 text-amber-400" />
            تقدّم كتبك
          </h3>
          {materialsLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : materials.length === 0 ? (
            <div className="glass p-10 rounded-3xl border-white/5 text-center text-muted-foreground">
              <Library className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>لم تُحمِّل أي كتاب PDF بعد. ارفع كتابك من داخل الجلسة لتظهر فصوله وتقدّمك هنا.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map(m => <MaterialProgressCard key={m.id} material={m} />)}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-emerald rounded-full" />
            تقارير المختبرات
          </h3>
          <LabReportsSection reports={labReports} loading={labReportsLoading} />
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gold rounded-full" />
            ملخصاتي
          </h3>
          {summariesLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : summaries.length === 0 ? (
            <div className="glass p-10 rounded-3xl border-white/5 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p>لم تُكمل أي جلسة تعليمية بعد. أكمل مراحل جلسة تعليمية لتظهر ملخصاتها هنا.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(s => <SummaryCard key={s.id} summary={s} />)}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
