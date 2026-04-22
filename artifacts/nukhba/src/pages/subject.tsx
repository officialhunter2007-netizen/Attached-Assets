import { useState, useEffect, useRef, memo, useCallback } from "react";
import { writeUserJson, readUserJson, removeUserKey } from "@/lib/user-storage";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@workspace/api-client-react/generated/api.schemas";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Send, Bot, User, Sparkles, Loader2, Lock, FileText, ChevronDown, ChevronUp, Plus, Clock, Trophy, RefreshCw, Calendar, Code2, ArrowRight, CheckCircle2, X, Shield, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorPanel } from "@/components/code-editor-panel";
import { FoodLabPanel } from "@/components/food-lab-panel";
import { YemenSoftSimulatorV2 } from "@/components/yemensoft/yemensoft-v2";
import AccountingLab from "@/components/accounting-lab/accounting-lab";
import CyberLab from "@/components/cyber-lab/cyber-lab";
import { DynamicEnvShell } from "@/components/dynamic-env/dynamic-env-shell";
import { OptionsQuestion } from "@/components/dynamic-env/options-question";
import { CourseMaterialsPanel, TeachingModeChoiceCard } from "@/components/course-materials-panel";
import { BookOpen } from "lucide-react";

interface LessonSummary {
  id: number;
  subjectId: string;
  subjectName: string;
  title: string;
  summaryHtml: string;
  conversationDate: string;
  messagesCount: number;
}

function SubjectSummaryCard({ summary }: { summary: LessonSummary }) {
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-white/5 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-base">{summary.title || `جلسة ${summary.subjectName}`}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{date} · {summary.messagesCount} رسالة</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
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
    </motion.div>
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

function SubjectLabReportCard({ report }: { report: LabReport }) {
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-white/5 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-emerald" />
          </div>
          <div className="text-right min-w-0">
            <h4 className="font-bold text-base truncate">{report.envTitle || "تقرير مختبر"}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{date}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
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
    </motion.div>
  );
}

function SubscriptionExpiredWall({
  subject,
  allSummaries,
  onRenew,
}: {
  subject: any;
  allSummaries: LessonSummary[];
  onRenew: () => void;
}) {
  const uniqueSubjects = [...new Set(allSummaries.map(s => s.subjectName))];
  const nextStages = subject.defaultStages?.slice(0, 3) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-gold/20 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-lg shadow-gold/5"
    >
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -z-10" />

      {/* Achievement summary */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
          <Trophy className="w-7 h-7 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-bold">انتهت فترة اشتراكك</h2>
          <p className="text-sm text-muted-foreground">إليك ما أنجزته خلال الأسبوعين الماضيين</p>
        </div>
      </div>

      {allSummaries.length > 0 ? (
        <div className="bg-black/30 rounded-2xl p-5 mb-6 border border-white/5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-gold">{allSummaries.length}</div>
              <div className="text-xs text-muted-foreground mt-1">جلسة تعليمية مكتملة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald">{uniqueSubjects.length}</div>
              <div className="text-xs text-muted-foreground mt-1">مادة درستها</div>
            </div>
          </div>
          {uniqueSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uniqueSubjects.map(name => (
                <span key={name} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted-foreground">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-black/30 rounded-2xl p-5 mb-6 border border-white/5 text-center text-muted-foreground text-sm">
          لم تُكمل جلسات بعد — ابدأ اشتراكاً جديداً وابنِ مسارك التعليمي
        </div>
      )}

      {/* What they'll learn next */}
      {nextStages.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            ستتعلم في {subject.name} خلال اشتراكك القادم:
          </p>
          <ul className="space-y-1.5">
            {nextStages.map((stage: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                {stage}
              </li>
            ))}
            {subject.defaultStages?.length > 3 && (
              <li className="text-xs text-muted-foreground/60 mr-3.5">
                و{subject.defaultStages.length - 3} مرحلة أخرى...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onRenew}
          className="flex-1 gradient-gold text-primary-foreground font-bold h-12 rounded-xl shadow-md shadow-gold/20 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          جدّد اشتراكك الآن
        </Button>
      </div>
    </motion.div>
  );
}

function parsePlanStages(planHtml: string | null): { title: string; descHtml: string; duration: string }[] {
  if (!planHtml) return [];
  try {
    const match = planHtml.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (!match) return [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items: { title: string; descHtml: string; duration: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = liRegex.exec(match[1])) !== null) {
      const inner = m[1];
      const strong = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? "";
      const em = inner.match(/<em[^>]*>([\s\S]*?)<\/em>/i)?.[1] ?? "";
      const cleanTitle = strong.replace(/<[^>]+>/g, "").trim().replace(/^المرحلة\s*\d+\s*[—\-:]\s*/, "");
      const cleanDuration = em.replace(/<[^>]+>/g, "").replace(/^المدة[:\s]*/i, "").trim();
      const descHtml = inner
        .replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, "")
        .replace(/<em[^>]*>[\s\S]*?<\/em>/i, "")
        .trim();
      items.push({ title: cleanTitle || "مرحلة", descHtml, duration: cleanDuration });
    }
    return items;
  } catch { return []; }
}

function LearningPathPanel({ planHtml, currentStage, totalStages }: { planHtml: string | null; currentStage: number; totalStages: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!planHtml) return null;
  const stages = parsePlanStages(planHtml);
  if (stages.length === 0) return null;
  const effectiveTotal = totalStages || stages.length;
  const progressPct = Math.min(100, Math.round((currentStage / Math.max(effectiveTotal, 1)) * 100));
  const active = stages[currentStage] ?? stages[0];

  return (
    <div className="shrink-0 border-b border-amber-500/15" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.07), rgba(139,92,246,0.05))" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
        style={{ direction: "rtl" }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="text-[12px] font-bold text-amber-200 flex items-center gap-2">
              <span>المرحلة {Math.min(currentStage + 1, stages.length)} من {stages.length}</span>
              <span className="text-amber-300/70 font-normal">·</span>
              <span className="text-white/85 truncate">{active.title}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-amber-400 to-amber-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber-300 shrink-0" />}
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
            <div className="px-4 pb-3 pt-1" style={{ direction: "rtl" }}>
              <ol className="space-y-1.5">
                {stages.map((s, idx) => {
                  const isActive = idx === currentStage;
                  const isDone = idx < currentStage;
                  return (
                    <li
                      key={idx}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 border text-[12px] leading-relaxed ${
                        isActive
                          ? "path-panel-stage-active"
                          : isDone
                            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-100/85"
                            : "bg-white/[0.03] border-white/8 text-white/65"
                      }`}
                    >
                      <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black ${
                        isActive
                          ? "bg-amber-500 text-black"
                          : isDone
                            ? "bg-emerald-500/30 text-emerald-200"
                            : "bg-white/8 text-white/60"
                      }`}>
                        {isDone ? "✓" : idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{s.title}</div>
                        {s.duration && (
                          <div className="text-[10px] mt-0.5 inline-block bg-purple-500/15 border border-purple-400/25 text-purple-200 rounded-full px-2 py-0.5">
                            ⏱ {s.duration}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ENV_BUILD_PHRASES = [
  { icon: "🧠", text: "نُحلّل مستواك ونصمّم بيئة تطبيقية تناسبك تماماً..." },
  { icon: "📐", text: "نرسم خطوات التعلم بترتيب ذكي يبني المهارة تدريجياً..." },
  { icon: "🛠️", text: "نُجهّز الأدوات والشاشات التي ستحتاجها أثناء التطبيق..." },
  { icon: "🎯", text: "نضع لك معايير نجاح واضحة لتقيس تقدّمك بنفسك..." },
  { icon: "📚", text: "نضيف تلميحات وموارد مساعدة في كل مهمة..." },
  { icon: "✨", text: "نُضيف اللمسات الأخيرة — بيئتك على وشك الجاهزية..." },
  { icon: "🧪", text: "نُولّد سيناريوهات تطبيقية حقيقية لتتدرّب عليها..." },
  { icon: "🪜", text: "نرتّب المهام من الأسهل إلى الأعمق لتتقدم بثقة..." },
];

function EnvBuildingOverlay() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % ENV_BUILD_PHRASES.length);
    }, 2600);
    const secTimer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(phraseTimer);
      clearInterval(secTimer);
    };
  }, []);

  const phrase = ENV_BUILD_PHRASES[phraseIdx];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ direction: "rtl" }}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-gold/20 rounded-3xl px-7 py-7 shadow-2xl max-w-md w-full pointer-events-auto">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
            <Loader2 className="w-8 h-8 animate-spin text-gold relative" />
          </div>
          <div className="text-right">
            <div className="text-white font-black text-lg leading-tight">جارٍ بناء بيئتك التطبيقية</div>
            <div className="text-[11px] text-gold/70">قد يستغرق الأمر من ٢٠ إلى ٤٥ ثانية — اللحظة تستحق الانتظار</div>
          </div>
        </div>

        <div
          key={phraseIdx}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 min-h-[68px] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <span className="text-2xl shrink-0">{phrase.icon}</span>
          <p className="text-white/90 text-sm font-medium leading-relaxed">{phrase.text}</p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>المعلم الذكي يعمل من أجلك</span>
          </div>
          <span className="font-mono tabular-nums">{seconds}s</span>
        </div>

        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold/40 via-gold to-gold/40 animate-pulse" style={{ width: `${Math.min(95, 15 + seconds * 2.5)}%`, transition: "width 0.8s ease-out" }} />
        </div>
      </div>
    </div>
  );
}

export default function Subject() {
  const { subjectId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isIDEOpen, setIsIDEOpen] = useState(false);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [isYemenSoftOpen, setIsYemenSoftOpen] = useState(false);
  const isFoodSubject = subject?.id === "uni-food-eng";
  const isYemenSoftSubject = subject?.id === "skill-yemensoft";
  const isAccountingLabSubject = subject?.id === "uni-accounting";
  const [isAccountingLabOpen, setIsAccountingLabOpen] = useState(false);
  const CYBER_SUBJECTS = new Set(["uni-cybersecurity", "skill-nmap", "skill-wireshark", "skill-linux", "skill-windows"]);
  const isCyberSubject = CYBER_SUBJECTS.has(subject?.id || "");
  const [isCyberLabOpen, setIsCyberLabOpen] = useState(false);
  const [pendingCyberEnv, setPendingCyberEnv] = useState<any | null>(null);
  const [isCreatingCyberEnv, setIsCreatingCyberEnv] = useState(false);
  const [pendingFoodScenario, setPendingFoodScenario] = useState<any | null>(null);
  const [pendingAccountingScenario, setPendingAccountingScenario] = useState<any | null>(null);
  const [pendingYemenSoftScenario, setPendingYemenSoftScenario] = useState<any | null>(null);
  // The active interactive lab environment.
  // It is persisted per-user+subject so that closing or refreshing the page
  // does NOT lose the env — the user can come back to exactly where they were.
  const [pendingDynamicEnv, setPendingDynamicEnvState] = useState<any | null>(null);
  const [isDynamicEnvOpen, setIsDynamicEnvOpen] = useState(false);
  const dynamicEnvStorageSuffix = subject?.id ? `dynamic-env::${subject.id}` : null;
  // Wrap the setter so every change to the env is mirrored to per-user storage.
  const setPendingDynamicEnv = useCallback((env: any | null) => {
    setPendingDynamicEnvState(env);
    if (!user?.id || !dynamicEnvStorageSuffix) return;
    if (env) writeUserJson(user.id, dynamicEnvStorageSuffix, env);
    else removeUserKey(user.id, dynamicEnvStorageSuffix);
  }, [user?.id, dynamicEnvStorageSuffix]);
  // On mount / when user or subject changes, restore any saved env so a
  // page reload or accidental close still finds the previous lab.
  useEffect(() => {
    if (!user?.id || !dynamicEnvStorageSuffix) return;
    const saved = readUserJson<any | null>(user.id, dynamicEnvStorageSuffix, null);
    if (saved && typeof saved === "object") setPendingDynamicEnvState(saved);
  }, [user?.id, dynamicEnvStorageSuffix]);
  const [chatStarter, setChatStarter] = useState<string | null>(null);
  const [createEnvError, setCreateEnvError] = useState<string | null>(null);
  const [pendingLabStarter, setPendingLabStarter] = useState<string | null>(null);
  const supportsLabEnv = isCyberSubject || isFoodSubject || isAccountingLabSubject || isYemenSoftSubject;
  const { data: lessonViews } = useGetLessonViews();

  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [allSummaries, setAllSummaries] = useState<LessonSummary[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);

  const isSubscriptionExpired = !!(
    user?.nukhbaPlan &&
    user?.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) < new Date()
  );

  const loadSummaries = () => {
    if (!subject) return;
    fetch(`/api/lesson-summaries?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));
  };

  const loadLabReports = () => {
    if (!subject) return;
    setLabReportsLoading(true);
    fetch(`/api/lab-reports?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setLabReports(Array.isArray(data) ? data : []))
      .catch(() => setLabReports([]))
      .finally(() => setLabReportsLoading(false));
  };

  useEffect(() => {
    if (subject) {
      loadSummaries();
      loadLabReports();
    }
  }, [subject?.id]);

  useEffect(() => {
    if (isSubscriptionExpired) {
      fetch('/api/lesson-summaries', { credentials: 'include' })
        .then(r => r.json())
        .then(data => setAllSummaries(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isSubscriptionExpired]);

  const handleSessionComplete = () => {
    setIsChatOpen(false);
    setSummariesLoading(true);
    loadSummaries();
  };

  if (!subject) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">المادة غير موجودة</h1>
          <Button onClick={() => setLocation("/learn")}>العودة للتعلم</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-4xl">

        {/* Subject Header */}
        <div className="glass p-4 md:p-6 rounded-3xl border-white/5 mb-6 md:mb-8 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} opacity-10 rounded-bl-full`} />
          <div className="relative z-10">
            <div className="flex items-center gap-4 md:gap-5 mb-4">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl md:text-4xl shadow-lg shrink-0`}>
                {subject.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-black">{subject.name}</h1>
                {lessonViews && lessonViews.length > 0 && (() => {
                  const subjectViews = lessonViews.filter(v => v.subjectId === subject.id);
                  const totalLessons = subject.units.reduce((s, u) => s + u.lessons.length, 0);
                  const completedIds = new Set(subjectViews.map(v => v.lessonId));
                  const completed = subject.units.reduce((s, u) => s + u.lessons.filter(l => completedIds.has(l.id)).length, 0);
                  if (completed === 0) return null;
                  const pct = Math.round((completed / totalLessons) * 100);
                  return (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-emerald to-emerald/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-emerald font-bold shrink-0">{pct}%</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Unit progress grid */}
            {lessonViews && subject.units.length > 0 && (() => {
              const subjectViews = lessonViews.filter(v => v.subjectId === subject.id);
              const completedIds = new Set(subjectViews.map(v => v.lessonId));
              const hasAnyProgress = subjectViews.length > 0;
              if (!hasAnyProgress) return null;
              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(subject.units.length, 4)}, 1fr)` }}>
                  {subject.units.map(unit => {
                    const done = unit.lessons.filter(l => completedIds.has(l.id)).length;
                    const total = unit.lessons.length;
                    const unitDone = done >= total;
                    return (
                      <div key={unit.id} className={`rounded-xl p-2.5 border ${unitDone ? "border-emerald/30 bg-emerald/5" : "border-white/5 bg-white/3"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground truncate">{unit.name}</span>
                          {unitDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />}
                        </div>
                        <div className="flex gap-1">
                          {unit.lessons.map(l => (
                            <div
                              key={l.id}
                              className={`flex-1 h-1.5 rounded-full ${completedIds.has(l.id) ? "bg-emerald" : "bg-white/10"}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{done}/{total}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── جدار انتهاء الاشتراك ── */}
        {isSubscriptionExpired && (
          <SubscriptionExpiredWall
            subject={subject}
            allSummaries={allSummaries}
            onRenew={() => setLocation("/subscription")}
          />
        )}

        {/* ── الأسئلة التوجيهية الأولية ── Gold session intro card (RESTORED) */}
        {!isSubscriptionExpired && (
        <div className="glass-gold p-5 md:p-8 rounded-3xl border-gold/20 mb-8 md:mb-10 shadow-lg shadow-gold/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-3xl -z-10" />
          <div className="flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl gradient-gold flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2">جلستك التعليمية المخصصة</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                يرافقك معلمك الذكي خطوة بخطوة، يشرح المفهوم أولاً بمثال واقعي، ثم يطرح عليك سؤالاً توجيهياً للتثبيت قبل الانتقال للمرحلة التالية.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setIsChatOpen(true)}
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10 h-10 rounded-xl px-5 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  جلسة جديدة
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── تقارير المختبرات السابقة ── */}
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
            <div className="w-2 h-7 bg-emerald rounded-full" />
            تقارير المختبرات السابقة
          </h3>

          {labReportsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : labReports.length === 0 ? (
            <div className="glass border border-white/5 rounded-2xl p-8 text-center text-muted-foreground">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد تقارير مختبر بعد</p>
              <p className="text-sm mt-1 opacity-70">عند إرسال تقرير من البيئة التطبيقية لهذه المادة سيظهر هنا للمراجعة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {labReports.map(r => (
                <SubjectLabReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* ── ملخصات الجلسات السابقة ── */}
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
            <div className="w-2 h-7 bg-gold rounded-full" />
            ملخصات جلساتك السابقة
          </h3>

          {summariesLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : summaries.length === 0 ? (
            <div className="glass border border-white/5 rounded-2xl p-8 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد ملخصات بعد</p>
              <p className="text-sm mt-1 opacity-70">بعد إكمال أول جلسة سيظهر ملخصها هنا تلقائياً للمراجعة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(s => (
                <SubjectSummaryCard key={s.id} summary={s} />
              ))}
            </div>
          )}
        </div>

        {/* Chat Overlay — always mounted, toggled via CSS so all state (messages, IDE, lab) persists when closed */}
        <div
          aria-hidden={!isChatOpen}
          style={{ display: isChatOpen ? "flex" : "none" }}
          className="fixed inset-0 z-50 items-center justify-center bg-black/80"
          onClick={(e) => { if (e.target === e.currentTarget) setIsChatOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="
              max-sm:!w-full max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-0
              sm:max-w-[860px] sm:h-[90vh] sm:rounded-3xl
              w-full p-0 flex flex-col gap-0 overflow-hidden border shadow-lg
              bg-[#080a11] border-white/8
            "
          >

            {/* Header */}
            <div className="shrink-0 border-b border-white/8" style={{ background: "linear-gradient(180deg, #0f1220 0%, #080a11 100%)" }}>
              {/* Top bar */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isIDEOpen ? (
                    <>
                      <button
                        onClick={() => setIsIDEOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-[#1e1e2e] border border-white/10 flex items-center justify-center">
                        <Code2 className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">بيئة التطبيق</p>
                        <p className="text-[11px] text-muted-foreground">اكتب وشغّل كودك</p>
                      </div>
                    </>
                  ) : isLabOpen ? (
                    <>
                      <button
                        onClick={() => setIsLabOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-lime-500/20 border border-lime-500/30 flex items-center justify-center">
                        <span className="text-sm">🔬</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">المختبر الغذائي</p>
                        <p className="text-[11px] text-muted-foreground">حاسبات ورسوم ومخطط HACCP</p>
                      </div>
                    </>
                  ) : isYemenSoftOpen ? (
                    <>
                      <button
                        onClick={() => setIsYemenSoftOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                        <span className="text-sm">🏢</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">البيئة التطبيقية</p>
                        <p className="text-[11px] text-muted-foreground">محاكاة يمن سوفت المحاسبية</p>
                      </div>
                    </>
                  ) : isAccountingLabOpen ? (
                    <>
                      <button
                        onClick={() => setIsAccountingLabOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <span className="text-sm">🎓</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">مختبر المحاسبة</p>
                        <p className="text-[11px] text-muted-foreground">12 أداة أكاديمية تفاعلية</p>
                      </div>
                    </>
                  ) : isCyberLabOpen ? (
                    <>
                      <button
                        onClick={() => setIsCyberLabOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">مختبر الأمن السيبراني</p>
                        <p className="text-[11px] text-muted-foreground">بيئة محاكاة تفاعلية</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center shadow-lg shrink-0`}>
                        <span className="text-lg">{subject.emoji}</span>
                      </div>
                      <div>
                        <p className="font-bold text-base leading-tight">معلم {subject.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <p className="text-[11px] text-emerald-400 font-medium">متصل الآن</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {subject.hasCoding && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && (
                    <button
                      onClick={() => setIsIDEOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gold/10 border border-gold/25 text-gold hover:bg-gold/20 transition-all"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">IDE</span>
                    </button>
                  )}
                  {isFoodSubject && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && !isDynamicEnvOpen && (
                    <button
                      onClick={() => setPendingLabStarter("أريد بيئة تطبيقية مخصصة لي في هندسة الأغذية. اطرح عليّ سؤالاً متعدد الخيارات لتحديد ما أريد التدرب عليه بالضبط، مع خيار «غير ذلك» لأكتب طلبي بنفسي.")}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-lime-500/10 border border-lime-500/25 text-lime-400 hover:bg-lime-500/20 transition-all"
                    >
                      <span className="text-sm">🔬</span>
                      <span className="hidden sm:inline">بيئة عملية مخصصة</span>
                    </button>
                  )}
                  {isYemenSoftSubject && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && !isDynamicEnvOpen && (
                    <button
                      onClick={() => setPendingLabStarter("أريد بيئة عملية مخصصة على يمن سوفت. اطرح عليّ سؤالاً متعدد الخيارات لتحديد المهمة المطلوبة، مع خيار «غير ذلك» لأكتب طلبي بنفسي.")}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-400 hover:bg-teal-500/20 transition-all"
                    >
                      <span className="text-sm">🏢</span>
                      <span className="hidden sm:inline">بيئة عملية مخصصة</span>
                    </button>
                  )}
                  {isAccountingLabSubject && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && !isDynamicEnvOpen && (
                    <button
                      onClick={() => setPendingLabStarter("أريد بيئة عملية مخصصة في المحاسبة. اطرح عليّ سؤالاً متعدد الخيارات لتحديد التطبيق المطلوب، مع خيار «غير ذلك» لأكتب طلبي بنفسي.")}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all"
                    >
                      <span className="text-sm">🎓</span>
                      <span className="hidden sm:inline">بيئة عملية مخصصة</span>
                    </button>
                  )}
                  {isCyberSubject && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && !isCyberLabOpen && (
                    <button
                      onClick={() => setIsCyberLabOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">المختبر</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <SubjectPathChat
              subject={subject}
              isFirstSession={!summariesLoading && summaries.length === 0}
              onAccessDenied={() => {
                setIsChatOpen(false);
                setLocation(`/subscription?subject=${encodeURIComponent(subject.id)}&subjectName=${encodeURIComponent(subject.name)}`);
              }}
              onSessionComplete={handleSessionComplete}
              ideOpen={isIDEOpen}
              onCloseIDE={() => setIsIDEOpen(false)}
              labOpen={isLabOpen}
              onCloseLab={() => setIsLabOpen(false)}
              yemenSoftOpen={isYemenSoftOpen}
              onCloseYemenSoft={() => setIsYemenSoftOpen(false)}
              accountingLabOpen={isAccountingLabOpen}
              onCloseAccountingLab={() => setIsAccountingLabOpen(false)}
              cyberLabOpen={isCyberLabOpen}
              onCloseCyberLab={() => setIsCyberLabOpen(false)}
              pendingCyberEnv={pendingCyberEnv}
              onClearPendingCyberEnv={() => setPendingCyberEnv(null)}
              pendingFoodScenario={pendingFoodScenario}
              onClearPendingFoodScenario={() => setPendingFoodScenario(null)}
              pendingAccountingScenario={pendingAccountingScenario}
              onClearPendingAccountingScenario={() => setPendingAccountingScenario(null)}
              pendingYemenSoftScenario={pendingYemenSoftScenario}
              onClearPendingYemenSoftScenario={() => setPendingYemenSoftScenario(null)}
              pendingDynamicEnv={pendingDynamicEnv}
              // Permanently destroys the env (used by an explicit "delete" — currently unused)
              onClearPendingDynamicEnv={() => { setPendingDynamicEnv(null); setIsDynamicEnvOpen(false); }}
              dynamicEnvOpen={isDynamicEnvOpen}
              // Closing only HIDES the env so the user can come back to it.
              onCloseDynamicEnv={() => setIsDynamicEnvOpen(false)}
              // Reopen previously-built env from the floating button.
              onReopenDynamicEnv={() => setIsDynamicEnvOpen(true)}
              chatStarter={chatStarter}
              onConsumeChatStarter={() => setChatStarter(null)}
              supportsLabEnv={supportsLabEnv}
              onCreateLabEnv={async (description: string) => {
                console.log("[create-lab-env] click; isCreatingCyberEnv=", isCreatingCyberEnv, "description=", description);
                if (isCreatingCyberEnv) return;
                setCreateEnvError(null);
                setIsCreatingCyberEnv(true);
                try {
                  if (isCyberSubject) {
                    const sid = subject!.id;
                    const augmented =
                      sid === "skill-nmap"
                        ? `سيناريو يركّز على استخدام Nmap للاستطلاع وفحص الشبكة. ${description}`
                        : sid === "skill-wireshark"
                        ? `سيناريو يولّد تقاط حركة شبكة (PCAP) لتحليلها بـ Wireshark. ${description}`
                        : description;
                    const r = await fetch(`${import.meta.env.BASE_URL}api/ai/cyber/create-env`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ description: augmented }),
                    });
                    console.log("[create-lab-env] cyber response:", r.status);
                    if (!r.ok) {
                      const errText = await r.text().catch(() => "");
                      throw new Error(`فشل إنشاء البيئة (${r.status}): ${errText.slice(0, 200)}`);
                    }
                    const data = await r.json();
                    if (data.env) {
                      setPendingCyberEnv(data.env);
                      setIsCyberLabOpen(true);
                    } else {
                      throw new Error("الاستجابة لا تحتوي على بيئة صالحة");
                    }
                  } else {
                    // Non-cyber: build a fully-tailored dynamic env from the description
                    const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/build-env`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ subjectId: subject!.id, description }),
                    });
                    console.log("[create-lab-env] dynamic response:", r.status);
                    if (!r.ok) {
                      const errText = await r.text().catch(() => "");
                      throw new Error(`فشل بناء البيئة (${r.status}): ${errText.slice(0, 200)}`);
                    }
                    const data = await r.json();
                    console.log("[create-lab-env] dynamic data:", data);
                    if (data.env) {
                      setPendingDynamicEnv(data.env);
                      setIsDynamicEnvOpen(true);
                      setIsLabOpen(false);
                      setIsYemenSoftOpen(false);
                      setIsAccountingLabOpen(false);
                    } else {
                      throw new Error("الاستجابة لا تحتوي على بيئة صالحة");
                    }
                  }
                } catch (e: any) {
                  console.error("[create-lab-env] failed:", e);
                  setCreateEnvError(e?.message || "حدث خطأ غير متوقع أثناء بناء البيئة");
                } finally {
                  setIsCreatingCyberEnv(false);
                }
              }}
              isCreatingCyberEnv={isCreatingCyberEnv}
            />
          </div>
        </div>

        {/* Loading overlay while building env */}
        {isCreatingCyberEnv && <EnvBuildingOverlay />}

        {/* Recommendation modal before opening custom-env chat starter */}
        {pendingLabStarter && (
          <div
            className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPendingLabStarter(null)}
          >
            <div
              className="bg-slate-900 border border-gold/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
              style={{ direction: "rtl" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-xl shrink-0">💡</div>
                <div className="flex-1">
                  <h3 className="text-white font-extrabold text-lg mb-1">قبل أن تبدأ بناء بيئتك بنفسك</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    يُفضّل أن تتبع المعلم الذكي في مسارك التعليمي — فهو سيُنشئ لك البيئة التطبيقية تلقائياً وفق المفاهيم التي تتعلمها في كل مرحلة، فيكون التطبيق العملي مرتبطاً مباشرة بما درسته.
                  </p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-xs text-muted-foreground leading-relaxed">
                إن أصرّيت على فتح بيئة مخصّصة الآن، سيطرح عليك المعلم سؤالاً متعدد الخيارات لتحديد ما تريد التدرّب عليه، ثم يبني لك البيئة من الصفر.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingLabStarter(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gold text-slate-900 font-bold hover:bg-gold/90 transition-colors text-sm"
                >
                  حسناً، سأتابع مع المعلم
                </button>
                <button
                  onClick={() => {
                    setChatStarter(pendingLabStarter);
                    setPendingLabStarter(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-sm"
                >
                  أريدها الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error toast */}
        {createEnvError && !isCreatingCyberEnv && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[92%]">
            <div className="bg-red-950/95 border border-red-500/40 rounded-xl px-4 py-3 shadow-xl flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 text-sm text-red-100" style={{ direction: "rtl" }}>
                {createEnvError}
              </div>
              <button
                onClick={() => setCreateEnvError(null)}
                className="text-red-300 hover:text-white text-lg leading-none shrink-0"
              >×</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}


function Countdown({ until, onExpired }: { until: string; onExpired?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, new Date(until).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) onExpired?.();
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center justify-center gap-2 md:gap-3" dir="ltr">
      {[{ v: hours, l: "ساعة" }, { v: minutes, l: "دقيقة" }, { v: seconds, l: "ثانية" }].map((item, i, arr) => (
        <div key={item.l} className="flex items-center gap-2 md:gap-3">
          <div className="bg-black/40 border border-gold/20 rounded-xl md:rounded-2xl px-3 py-2 md:px-5 md:py-3 text-center min-w-[52px] md:min-w-[72px]">
            <div className="text-2xl md:text-4xl font-black text-gold font-mono">{String(item.v).padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.l}</div>
          </div>
          {i < arr.length - 1 && <span className="text-xl md:text-2xl font-bold text-gold/50">:</span>}
        </div>
      ))}
    </div>
  );
}

function stripInlineStyles(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');
}


// Transforms [[CREATE_LAB_ENV: description]] tags into clickable buttons
function expandLabEnvTags(html: string): string {
  return html.replace(/\[\[CREATE_LAB_ENV:\s*([^\]]+?)\]\]/g, (_m, desc) => {
    const safe = desc.trim().replace(/"/g, '&quot;');
    return `<button data-cyber-env="${safe}" class="cyber-create-env-btn" type="button">⚡ افتح هذه البيئة في المختبر</button>`;
  });
}

// Extracts [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| غير ذلك]] from content
// Uses ||| as delimiter so question/options can safely contain a single |
function extractAskOptions(content: string): { stripped: string; ask: { question: string; options: string[]; allowOther: boolean } | null } {
  const m = content.match(/\[\[ASK_OPTIONS:\s*([^\]]+?)\]\]/);
  if (!m) return { stripped: content, ask: null };
  // Prefer ||| delimiter; fall back to single | only if ||| not present
  const raw = m[1];
  const parts = (raw.includes("|||") ? raw.split("|||") : raw.split("|"))
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return { stripped: content.replace(m[0], ""), ask: null };
  const [question, ...rawOpts] = parts;
  const allowOther = rawOpts.some((o) => /غير\s*ذلك/i.test(o) || /^other$/i.test(o));
  const options = rawOpts.filter((o) => !(/غير\s*ذلك/i.test(o) || /^other$/i.test(o)));
  return { stripped: content.replace(m[0], ""), ask: { question, options, allowOther } };
}

const AIMessage = memo(function AIMessage({ content, isStreaming, onCreateLabEnv, onAnswerOption }: { content: string; isStreaming: boolean; onCreateLabEnv?: (desc: string) => void; onAnswerOption?: (answer: string) => void }) {
  const safeRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { stripped, ask } = !isStreaming ? extractAskOptions(content) : { stripped: content, ask: null };

  if (!isStreaming) {
    safeRef.current = expandLabEnvTags(stripInlineStyles(stripped));
  }
  const displayHtml = isStreaming
    ? `<p>${content.replace(/\[\[CREATE_LAB_ENV:[^\]]*\]\]/g, '').replace(/\[\[ASK_OPTIONS:[^\]]*\]\]/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}</p>`
    : safeRef.current;

  useEffect(() => {
    if (!containerRef.current || !onCreateLabEnv) return;
    const root = containerRef.current;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-cyber-env]') as HTMLElement | null;
      if (btn) {
        e.preventDefault();
        const desc = btn.getAttribute('data-cyber-env') || '';
        if (desc) onCreateLabEnv(desc);
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, [displayHtml, onCreateLabEnv]);

  return (
    <div className="relative rounded-2xl rounded-tr-none min-w-0 max-w-[92%] sm:max-w-[92%] max-sm:max-w-[calc(100vw-60px)] shadow-md"
      style={{ background: "linear-gradient(135deg, #131726 0%, #0f1220 100%)", borderLeft: "2px solid rgba(245,158,11,0.35)", overflow: "hidden" }}>
      <div className="px-3 sm:px-4 py-3 sm:py-3.5 overflow-x-hidden">
        <div ref={containerRef} className="ai-msg overflow-x-hidden" dangerouslySetInnerHTML={{ __html: displayHtml }} />
        {ask && onAnswerOption && (
          <OptionsQuestion
            question={ask.question}
            options={ask.options}
            allowOther={ask.allowOther}
            onAnswer={onAnswerOption}
          />
        )}
        {isStreaming && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
          </div>
        )}
      </div>
    </div>
  );
});

function SubjectPathChat({ 
  subject,
  isFirstSession,
  onAccessDenied,
  onSessionComplete,
  ideOpen,
  onCloseIDE,
  labOpen,
  onCloseLab,
  yemenSoftOpen,
  onCloseYemenSoft,
  accountingLabOpen,
  onCloseAccountingLab,
  cyberLabOpen,
  onCloseCyberLab,
  pendingCyberEnv,
  onClearPendingCyberEnv,
  pendingFoodScenario,
  onClearPendingFoodScenario,
  pendingAccountingScenario,
  onClearPendingAccountingScenario,
  pendingYemenSoftScenario,
  onClearPendingYemenSoftScenario,
  pendingDynamicEnv,
  onClearPendingDynamicEnv,
  dynamicEnvOpen,
  onCloseDynamicEnv,
  onReopenDynamicEnv,
  chatStarter,
  onConsumeChatStarter,
  supportsLabEnv,
  onCreateLabEnv,
  isCreatingCyberEnv,
}: {
  subject: any;
  isFirstSession?: boolean;
  onAccessDenied: () => void;
  onSessionComplete?: () => void;
  ideOpen?: boolean;
  onCloseIDE?: () => void;
  labOpen?: boolean;
  onCloseLab?: () => void;
  yemenSoftOpen?: boolean;
  onCloseYemenSoft?: () => void;
  accountingLabOpen?: boolean;
  onCloseAccountingLab?: () => void;
  cyberLabOpen?: boolean;
  onCloseCyberLab?: () => void;
  pendingCyberEnv?: any | null;
  onClearPendingCyberEnv?: () => void;
  pendingFoodScenario?: any | null;
  onClearPendingFoodScenario?: () => void;
  pendingAccountingScenario?: any | null;
  onClearPendingAccountingScenario?: () => void;
  pendingYemenSoftScenario?: any | null;
  onClearPendingYemenSoftScenario?: () => void;
  pendingDynamicEnv?: any | null;
  onClearPendingDynamicEnv?: () => void;
  dynamicEnvOpen?: boolean;
  onCloseDynamicEnv?: () => void;
  onReopenDynamicEnv?: () => void;
  chatStarter?: string | null;
  onConsumeChatStarter?: () => void;
  supportsLabEnv?: boolean;
  onCreateLabEnv?: (description: string) => void;
  isCreatingCyberEnv?: boolean;
}) {
  const { user } = useAuth();
  // SECURITY: scope chat history by user.id so accounts on the same browser
  // never see each other's messages. If user is not yet loaded, we start
  // empty and only persist once we have a verified user.
  const CHAT_STORAGE_KEY = user?.id ? `nukhba::u:${user.id}::chat::${subject.id}` : null;
  const loadInitialChat = (): { messages: ChatMessage[]; currentStage: number } => {
    if (!CHAT_STORAGE_KEY) return { messages: [], currentStage: 0 };
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return { messages: [], currentStage: 0 };
      const parsed = JSON.parse(raw);
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        currentStage: typeof parsed.currentStage === "number" ? parsed.currentStage : 0,
      };
    } catch { return { messages: [], currentStage: 0 }; }
  };
  const initial = loadInitialChat();
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages] = useState<string[]>(subject.defaultStages);
  const [currentStage, setCurrentStage] = useState(initial.currentStage);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [dailyLimitUntil, setDailyLimitUntil] = useState<string | null>(null);
  const [chatPhase, setChatPhase] = useState<'diagnostic' | 'teaching'>(isFirstSession ? 'diagnostic' : 'teaching');
  const [customPlan, setCustomPlan] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  // Professor-curriculum mode state
  const [teachingMode, setTeachingMode] = useState<'unset' | 'custom' | 'professor' | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [activeMaterialStarters, setActiveMaterialStarters] = useState<string | null>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleShareWithTeacher = (code: string, language: string, output: string) => {
    const langLabels: Record<string, string> = {
      html: "HTML 🌐", css: "CSS 🎨", javascript: "JavaScript ⚡",
      typescript: "TypeScript 💙", python: "Python 🐍", java: "Java ☕",
      cpp: "C++ ⚙️", c: "C 🔩", go: "Go 🐹", rust: "Rust 🦀",
      ruby: "Ruby 💎", php: "PHP 🐘", bash: "Bash 🐚",
      dart: "Dart 🎯", kotlin: "Kotlin 🤖", sql: "SQL 🗄️",
    };
    const label = langLabels[language] || language;
    const msg = `كتبت هذا الكود بلغة ${label}:\n\`\`\`${language}\n${code}\n\`\`\`\nالناتج:\n${output || "(لا يوجد إخراج)"}`;
    onCloseIDE?.();
    sendTeachMessage(msg);
  };

  const messageCount = messages.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messageCount]);

  // Persist chat messages + stage so they survive close/reopen and refresh.
  // Only persists when CHAT_STORAGE_KEY is non-null (i.e. user is loaded).
  useEffect(() => {
    if (!CHAT_STORAGE_KEY) return;
    if (messages.length === 0 && currentStage === 0) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages, currentStage }));
    } catch {}
  }, [messages, currentStage, CHAT_STORAGE_KEY]);

  // Clear persisted chat once the session is finalized
  useEffect(() => {
    if (sessionComplete && CHAT_STORAGE_KEY) {
      try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
    }
  }, [sessionComplete, CHAT_STORAGE_KEY]);

  // Fetch persisted plan from DB on mount
  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/user-plan?subjectId=${encodeURIComponent(subject.id)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.plan?.planHtml) {
            setCustomPlan(data.plan.planHtml);
            if (data.plan.currentStageIndex > 0) {
              setCurrentStage(data.plan.currentStageIndex);
            }
            // A persisted plan means diagnostic phase already completed — switch to teaching
            setChatPhase('teaching');
          } else {
            // No saved plan yet → diagnostic phase MUST run for first session of this subject
            setChatPhase('diagnostic');
          }
        }
      } catch {}
      setPlanLoaded(true);
    }
    fetchPlan();
  }, [subject.id]);

  // Fetch teaching mode (custom vs professor) for this subject
  useEffect(() => {
    let cancelled = false;
    async function fetchMode() {
      try {
        const res = await fetch(`/api/teaching-mode?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTeachingMode(data.mode || 'unset');
          setActiveMaterialId(data.activeMaterialId ?? null);
        }
      } catch {
        if (!cancelled) setTeachingMode('unset');
      }
    }
    fetchMode();
    return () => { cancelled = true; };
  }, [subject.id]);

  // When active material changes, fetch its starters for the chip row
  useEffect(() => {
    if (!activeMaterialId) { setActiveMaterialStarters(null); return; }
    let cancelled = false;
    fetch(`/api/materials/${activeMaterialId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setActiveMaterialStarters(d.starters || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeMaterialId]);

  const handleChooseMode = async (mode: 'custom' | 'professor') => {
    setTeachingMode(mode);
    try {
      await fetch("/api/teaching-mode", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: subject.id, mode }),
      });
    } catch {}
    if (mode === 'professor') setShowSourcesPanel(true);
  };

  // Show the mode-choice card whenever the user has never picked a mode for this
  // subject — applies to first sessions AND returning students who haven't seen
  // it yet (one-time prompt across all subjects).
  const needsModeChoice = teachingMode === 'unset';

  // Start session once plan fetch is done — use the persisted stage index and phase
  // Both planLoaded and chatPhase are set together in fetchPlan, so chatPhase is
  // already resolved (teaching or diagnostic) before this effect fires.
  useEffect(() => {
    if (!planLoaded) return;
    // Block auto-starting the diagnostic until the student has chosen a mode.
    if (needsModeChoice) return;
    // Kick off the first teacher message if the chat has no assistant reply yet
    // (covers fresh sessions AND stale localStorage where only a user message was cached).
    const hasAssistant = messages.some((m) => m.role === "assistant" && (m.content || "").trim().length > 0);
    if (!hasAssistant) {
      // If the cache only has orphan user messages, clear them so the teacher can start cleanly.
      if (messages.length > 0) {
        setMessages([]);
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
      }
      sendTeachMessage("", stages, currentStage, chatPhase === 'diagnostic');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded, needsModeChoice]);

  const triggerSummary = async (allMessages: ChatMessage[]) => {
    setIsSummarizing(true);
    setSummaryError(false);
    try {
      const res = await fetch('/api/ai/summarize-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          messages: allMessages,
          messagesCount: allMessages.length,
          conversationDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) setSummaryError(true);
    } catch {
      setSummaryError(true);
    }
    setIsSummarizing(false);
  };

  // Auto-send a starter message when the parent passes one (e.g. user clicked a "custom env" button).
  // Guard against firing before the initial session bootstrap (planLoaded + first assistant reply),
  // or while a stream is in progress, to avoid clobbering the diagnostic/teaching start.
  useEffect(() => {
    if (!chatStarter) return;
    if (!planLoaded || isStreaming) return;
    sendTeachMessage(chatStarter);
    onConsumeChatStarter?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStarter, planLoaded, isStreaming]);

  const sendTeachMessage = async (text: string, stagesParam?: string[], stageParam?: number, isDiagnostic?: boolean, labReportMeta?: { envTitle: string; envBriefing: string; reportText: string }) => {
    setIsStreaming(true);
    if (text) {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }
    setInput("");
    const usedStages = stagesParam ?? stages;
    const usedStage = stageParam ?? currentStage;
    const diagMode = isDiagnostic ?? (chatPhase === 'diagnostic');

    try {
      const response = await fetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          planContext: customPlan,
          stages: usedStages,
          currentStage: usedStage,
          isDiagnosticPhase: diagMode,
          hasCoding: subject.hasCoding,
        })
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "DAILY_LIMIT" && data.nextSessionAt) {
          setDailyLimitUntil(data.nextSessionAt);
        }
        setIsStreaming(false);
        return;
      }

      if (response.status === 403) {
        setAccessDenied(true);
        setIsStreaming(false);
        return;
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      let buffer = "";

      // Throttle state updates: batch streaming chunks every 50ms
      let updateTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleUpdate = (content: string) => {
        if (!updateTimer) {
          updateTimer = setTimeout(() => {
            setMessages(prev => {
              const nm = [...prev];
              nm[nm.length - 1] = { role: "assistant", content };
              return nm;
            });
            updateTimer = null;
          }, 50);
        }
      };

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }
              if (data.messagesRemaining !== null && data.messagesRemaining !== undefined) {
                setMessagesRemaining(data.messagesRemaining);
              }
              if (data.planReady) {
                setCustomPlan(assistantMsg);
                setChatPhase('teaching');
                // Persist plan to DB
                fetch('/api/user-plan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    subjectId: subject.id,
                    planHtml: assistantMsg,
                    currentStageIndex: 0,
                  }),
                }).catch(() => {});
              }
              // Quota exhausted — disable input, trigger summary, show exhausted screen
              if (data.quotaExhausted || data.messagesRemaining === 0) {
                setQuotaExhausted(true);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                  triggerSummary(updated);
                  return updated;
                });
                break;
              }
              if (!diagMode && data.stageComplete && data.nextStage !== undefined) {
                if (data.nextStage >= usedStages.length) {
                  setCurrentStage(usedStages.length);
                  setSessionComplete(true);
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                    triggerSummary(updated);
                    return updated;
                  });
                } else {
                  setCurrentStage(data.nextStage);
                  // Persist updated stage to DB
                  fetch('/api/user-plan/stage', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ subjectId: subject.id, currentStageIndex: data.nextStage }),
                  }).catch(() => {});
                }
              }
              break;
            }
            if (data.content) {
              assistantMsg += data.content;
              scheduleUpdate(assistantMsg);
            }
          } catch {}
        }
      }
      // Flush any pending update at stream end
      if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }
      setMessages(prev => {
        const nm = [...prev];
        nm[nm.length - 1] = { role: "assistant", content: assistantMsg };
        return nm;
      });

      // Persist lab report + teacher feedback so the student can revisit later.
      if (labReportMeta && assistantMsg.trim()) {
        fetch('/api/lab-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subjectId: subject.id,
            subjectName: subject.name,
            envTitle: labReportMeta.envTitle,
            envBriefing: labReportMeta.envBriefing,
            reportText: labReportMeta.reportText,
            feedbackHtml: assistantMsg,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendTeachMessage(input);
    if (inputRef.current) {
      inputRef.current.style.height = "56px";
    }
  };

  const handleEndSession = () => {
    if (messages.length < 2 || isStreaming) return;
    setSessionComplete(true);
    triggerSummary(messages);
  };

  if (dailyLimitUntil) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <Clock className="w-12 h-12 text-gold" />
          </div>
          <h3 className="text-2xl font-bold mb-2">أحسنت! أتممت جلستك اليوم 🎯</h3>
          <p className="text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
            يُفتح لك الدرس التالي تلقائياً في نهاية العد التنازلي — التعلم المنتظم يُرسّخ المعلومة أكثر من الحفظ دفعةً واحدة.
          </p>
          <div className="mb-8">
            <p className="text-xs text-muted-foreground mb-4">الجلسة القادمة تبدأ خلال</p>
            <Countdown until={dailyLimitUntil} onExpired={() => setDailyLimitUntil(null)} />
          </div>
          <Button
            variant="outline"
            className="border-white/10 h-10 rounded-xl text-sm"
            onClick={() => onSessionComplete ? onSessionComplete() : setDailyLimitUntil(null)}
          >
            <FileText className="w-4 h-4 ml-2" />
            عرض الملخصات
          </Button>
        </motion.div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-gold" />
        </div>
        <h3 className="text-2xl font-bold mb-3">انتهت رسائل هذا التخصص</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          لقد استنفدت رصيدك من الرسائل لهذا التخصص. جدّد اشتراكك للاستمرار في التعلم.
        </p>
        <div className="flex items-center gap-3 mb-8 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
          <img src="/karimi-logo.png" alt="كريمي" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          الدفع عبر حوالة كريمي — سريع بدون بطاقة بنكية
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={onAccessDenied} className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl">
            <Sparkles className="w-5 h-5 ml-2" />
            اشترك الآن
          </Button>
        </div>
      </div>
    );
  }

  if (quotaExhausted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-2xl font-bold mb-3">رصيدك نفد</h3>
          <p className="text-muted-foreground mb-2 max-w-sm text-sm leading-relaxed">
            لقد استنفدت جميع رسائل اشتراكك في <strong className="text-foreground">{subject.name}</strong>.
          </p>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
            {isSummarizing
              ? "جاري حفظ ملخص جلستك الأخيرة..."
              : summaryError
                ? "لم يتم حفظ الملخص — تحقق من اتصالك."
                : "تم حفظ ملخص جلستك الأخيرة في لوحة التحكم ✓"}
          </p>
          <div className="flex items-center gap-3 mb-8 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-muted-foreground max-w-xs mx-auto">
            <img src="/karimi-logo.png" alt="كريمي" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            الدفع عبر حوالة كريمي — سريع بدون بطاقة بنكية
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button
              onClick={onAccessDenied}
              className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              جدّد الاشتراك الآن
            </Button>
            <Button
              variant="outline"
              className="border-white/10 h-10 rounded-xl text-sm"
              onClick={() => onSessionComplete ? onSessionComplete() : onAccessDenied()}
            >
              <FileText className="w-4 h-4 ml-2" />
              عرض الملخصات
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-emerald/10 border-2 border-emerald/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-12 h-12 text-emerald" />
          </div>
          <h3 className="text-3xl font-black mb-3 text-emerald">أحسنت! اكتملت الجلسة 🎉</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            أتممت جميع مراحل جلسة <strong className="text-foreground">{subject.name}</strong>.
          </p>
          {isSummarizing ? (
            <div className="flex items-center gap-2 justify-center text-gold mb-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري حفظ ملخص الجلسة...</span>
            </div>
          ) : summaryError ? (
            <div className="flex flex-col items-center gap-2 mb-8">
              <p className="text-sm text-red-400">لم يتم حفظ الملخص — تحقق من اتصالك</p>
              <button
                onClick={() => {
                  const msgs = messages;
                  setMessages(msgs);
                  triggerSummary(msgs);
                }}
                className="text-xs text-gold underline hover:no-underline"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <p className="text-sm text-emerald mb-8">تم حفظ ملخص الجلسة في لوحة التحكم ✓</p>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button
              onClick={() => onSessionComplete ? onSessionComplete() : onAccessDenied()}
              disabled={isSummarizing}
              className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              {isSummarizing ? "جاري الحفظ..." : "عرض الملخص"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // All lab/IDE panels are ALWAYS mounted so their state persists across tab switches.
  // Visibility is toggled with CSS display only — never conditional rendering.
  const handleLabShare = (content: string) => {
    onCloseLab?.();
    sendTeachMessage(`نتائج من المختبر الغذائي:\n${content}`);
  };
  const handleYemenSoftShare = (content: string) => {
    onCloseYemenSoft?.();
    sendTeachMessage(`نتائج من البيئة التطبيقية (يمن سوفت):\n${content}`);
  };
  const handleAccountingLabShare = (content: string) => {
    onCloseAccountingLab?.();
    sendTeachMessage(`نتائج من مختبر المحاسبة:\n${content}`);
  };
  const handleCyberLabShare = (content: string) => {
    onCloseCyberLab?.();
    sendTeachMessage(`نتائج من مختبر الأمن السيبراني:\n${content}`);
  };
  const handleCyberLabHelp = (context: string) => {
    onCloseCyberLab?.();
    sendTeachMessage(context);
  };

  const anyPanelOpen = !!(ideOpen || labOpen || yemenSoftOpen || accountingLabOpen || cyberLabOpen || (dynamicEnvOpen && pendingDynamicEnv));
  const chatVisible = !anyPanelOpen;
  // Show the "return to your env" button whenever an env exists for this
  // subject but is not currently open AND no other major panel is open.
  const showReopenEnv = !!pendingDynamicEnv && !dynamicEnvOpen && !ideOpen && !labOpen && !yemenSoftOpen && !accountingLabOpen && !cyberLabOpen;

  return (
    <>
    {/* Floating "return to your env" button — keeps the user from losing
        their interactive lab if they accidentally closed it. */}
    {showReopenEnv && (
      <button
        onClick={() => onReopenDynamicEnv?.()}
        className="fixed bottom-20 md:bottom-6 right-4 z-[70] bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-cyan-300/50"
        style={{ direction: "rtl" }}
        title={pendingDynamicEnv?.title || "العودة لبيئتك"}
      >
        <span className="text-lg">🧪</span>
        <span className="max-w-[160px] truncate">العودة لبيئتك: {pendingDynamicEnv?.title || "البيئة التطبيقية"}</span>
      </button>
    )}
    {/* IDE panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ direction: "ltr", background: "#080a11", display: ideOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <CodeEditorPanel
          sectionContent=""
          subjectId={subject.id}
          onShareWithTeacher={handleShareWithTeacher}
        />
      </div>
    </div>

    {/* Food Lab panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: labOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <FoodLabPanel
          onShareWithTeacher={handleLabShare}
          pendingScenario={pendingFoodScenario}
          onClearScenario={onClearPendingFoodScenario}
          subjectId={subject.id}
        />
      </div>
    </div>

    {/* YemenSoft panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: yemenSoftOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <YemenSoftSimulatorV2
          onShareWithTeacher={handleYemenSoftShare}
          pendingScenario={pendingYemenSoftScenario}
          onClearScenario={onClearPendingYemenSoftScenario}
          subjectId={subject.id}
        />
      </div>
    </div>

    {/* Accounting Lab panel — always mounted */}
    <div className="flex-1 overflow-hidden w-full min-w-0" style={{ background: "#080a11", display: accountingLabOpen ? "flex" : "none" }}>
      <AccountingLab
        onShare={handleAccountingLabShare}
        pendingScenario={pendingAccountingScenario}
        onClearScenario={onClearPendingAccountingScenario}
        subjectId={subject.id}
      />
    </div>

    {/* Cyber Lab panel — always mounted */}
    <div className="flex-1 overflow-hidden w-full min-w-0" style={{ background: "#080a11", display: cyberLabOpen ? "flex" : "none" }}>
      <CyberLab
        onShare={handleCyberLabShare}
        onAskHelp={handleCyberLabHelp}
        pendingAIEnv={pendingCyberEnv}
        onClearPendingEnv={onClearPendingCyberEnv}
      />
    </div>

    {/* Dynamic AI-built environment — non-cyber subjects */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: dynamicEnvOpen && pendingDynamicEnv ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        {pendingDynamicEnv && (
          <DynamicEnvShell
            env={pendingDynamicEnv}
            subjectId={subject.id}
            // Closing the env should NOT delete it — only hide it. The user
            // can reopen it from the floating "العودة لبيئتك" button. Their
            // work inside the env is preserved by the env state engine.
            onClose={() => { onCloseDynamicEnv?.(); }}
            onSubmitToTeacher={(report, meta) => {
              onCloseDynamicEnv?.();
              sendTeachMessage(report, undefined, undefined, undefined, {
                envTitle: meta.envTitle,
                envBriefing: meta.envBriefing,
                reportText: report,
              });
            }}
          />
        )}
      </div>
    </div>

    {/* Chat UI — visible only when no panel is open */}
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080a11", display: chatVisible ? "flex" : "none" }}>

      {/* Mode-choice overlay (first session, before diagnostic) */}
      {needsModeChoice && planLoaded && (
        <TeachingModeChoiceCard subjectName={subject.name} onChoose={handleChooseMode} />
      )}

      {/* Sources panel drawer */}
      <CourseMaterialsPanel
        subjectId={subject.id}
        open={showSourcesPanel}
        onClose={() => setShowSourcesPanel(false)}
        activeMaterialId={activeMaterialId}
        onActiveChange={setActiveMaterialId}
      />

      {/* Mode/sources mini-bar (visible whenever mode is set) */}
      {teachingMode && teachingMode !== 'unset' && !needsModeChoice && (
        <div className="shrink-0 px-3 py-2 border-b border-white/5 flex items-center justify-between gap-2" style={{ background: "rgba(245,158,11,0.04)" }}>
          <div className="flex items-center gap-2 min-w-0" style={{ direction: "rtl" }}>
            {teachingMode === 'professor' ? (
              <>
                <span className="text-[11px] font-bold text-amber-300">📚 منهج الأستاذ</span>
                <span className="text-[10px] text-white/40 truncate">{activeMaterialId ? "ملف نشط" : "لم تختر ملفاً بعد"}</span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-purple-300">🧭 مسار مخصّص</span>
            )}
          </div>
          <button
            onClick={() => setShowSourcesPanel(true)}
            className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-white/70 hover:text-amber-200 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-3 h-3" />
            مصادري
          </button>
        </div>
      )}

      {/* Stage progress bar */}
      {chatPhase === 'teaching' && stages.length > 0 && (
        <div className="shrink-0 px-4 py-2.5 border-b border-white/5 flex items-center gap-3" style={{ background: "#0b0d17" }}>
          <div className="flex items-center gap-1.5 flex-1">
            {stages.map((s, idx) => {
              const done = idx < currentStage;
              const active = idx === currentStage;
              return (
                <div key={idx} className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                    done ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : active ? "bg-gold text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "bg-white/10 text-white/30"
                  }`}>
                    {done ? "✓" : idx + 1}
                  </div>
                  <div className="flex-1 hidden sm:block truncate">
                    <span className={`text-[11px] truncate ${active ? "text-gold font-semibold" : done ? "text-emerald-400/70" : "text-white/25"}`}>{s}</span>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-all ${done ? "bg-emerald-500/50" : "bg-white/8"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {messagesRemaining !== null && messagesRemaining > 0 && (
            <div className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 ${messagesRemaining <= 5 ? 'bg-red-500/15 border border-red-500/30 animate-pulse' : messagesRemaining <= 10 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
              <span className={`text-[11px] font-bold ${messagesRemaining <= 5 ? 'text-red-400' : messagesRemaining <= 10 ? 'text-amber-400' : 'text-muted-foreground'}`}>{messagesRemaining}</span>
              <span className={`text-[10px] hidden sm:inline ${messagesRemaining <= 5 ? 'text-red-400/70' : messagesRemaining <= 10 ? 'text-amber-400/70' : 'text-muted-foreground/70'}`}>رسالة متبقية</span>
            </div>
          )}
        </div>
      )}

      {/* Personalized learning path — sticky panel above messages once plan is built */}
      {chatPhase === 'teaching' && customPlan && (
        <LearningPathPanel planHtml={customPlan} currentStage={currentStage} totalStages={stages.length} />
      )}

      {/* Diagnostic phase banner */}
      {chatPhase === 'diagnostic' && (
        <div className="shrink-0 px-4 py-2.5 border-b border-purple-500/15 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(139,92,246,0.06)" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-[12px] text-purple-300 font-medium">مرحلة التشخيص — يبني معلمك خطتك التعليمية الشخصية</p>
          </div>
          <p className="text-[10px] text-purple-300/60">معلّم متخصّص يُصمَّم لك أنت — ليس إجابات عامة كـChatGPT.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-5 py-4 sm:py-5" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-4">
          {messages.map((msg, i) => {
            const isLastMsg = i === messages.length - 1;
            return (
              <div
                key={i}
                style={{ animation: 'msg-in 0.2s ease-out' }}
                className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center shadow-lg mb-0.5 ${
                  msg.role === 'user'
                    ? 'bg-white/10 border border-white/15'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white/60" />
                    : <Bot className="w-3.5 h-3.5 text-black" />
                  }
                </div>
                {/* Bubble */}
                <div style={{ direction: 'rtl' }} className="min-w-0 flex-1">
                  {msg.role === 'user' ? (
                    <div className="mr-auto w-fit max-w-[80%] max-sm:max-w-[calc(100vw-70px)] rounded-2xl rounded-br-none px-3 sm:px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed break-words overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1e2235 0%, #191c2a 100%)", border: "1px solid rgba(255,255,255,0.1)", overflowWrap: "anywhere" }}>
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      <AIMessage
                        content={msg.content}
                        isStreaming={isStreaming && isLastMsg}
                        onCreateLabEnv={supportsLabEnv ? onCreateLabEnv : undefined}
                        onAnswerOption={isLastMsg && !isStreaming ? (ans) => sendTeachMessage(ans) : undefined}
                      />
                      {/* Quick-action buttons under the latest AI message — let
                          the student ask for help in one tap. Only on the last
                          AI message, when not streaming, and only if the
                          message is long enough to be a real explanation
                          (skip short prompts like "ما اسمك؟"). */}
                      {isLastMsg && !isStreaming && msg.role === 'assistant' && (msg.content || '').length > 80 && (
                        <div className="mt-2 flex flex-wrap gap-1.5" style={{ direction: 'rtl' }}>
                          {[
                            { label: '🤔 لم أفهم تماماً', msg: 'لم أفهم تماماً، هل يمكنك إعادة الشرح بطريقة أبسط وأكثر تفصيلاً؟' },
                            { label: '🔁 اشرح بطريقة أخرى', msg: 'اشرح لي نفس الفكرة بطريقة مختلفة كلياً (تشبيه آخر أو مثال آخر).' },
                            { label: '📝 أعطني مثالاً آخر', msg: 'أعطني مثالاً تطبيقياً آخر مختلفاً عن الذي ذكرته.' },
                            { label: '✏️ لخّص بنقاط', msg: 'لخّص لي ما شرحته الآن في 3 نقاط مختصرة وواضحة.' },
                            { label: '🎯 اختبرني', msg: 'اختبرني بسؤال تطبيقي صعب على ما شرحته للتأكد من فهمي.' },
                          ].map((b) => (
                            <button
                              key={b.label}
                              onClick={() => sendTeachMessage(b.msg)}
                              className="text-[11px] sm:text-xs px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-white/70 hover:text-amber-200 transition-all"
                              title={b.msg}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {/* Typing indicator */}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div style={{ animation: 'msg-in 0.2s ease-out' }} className="flex items-end gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg mb-0.5">
                <Bot className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="rounded-2xl rounded-tr-none px-5 py-3.5 flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #131726 0%, #0f1220 100%)", borderLeft: "2px solid rgba(245,158,11,0.35)" }}>
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/8 p-3 sm:p-4" style={{ background: "#0b0d17" }}>
        {/* Professor-mode starter chips — show only when chat is empty and we have starters */}
        {teachingMode === 'professor' && activeMaterialStarters && messages.length <= 1 && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-2.5 flex flex-wrap gap-1.5 justify-center" style={{ direction: "rtl" }}>
            {activeMaterialStarters
              .split('\n')
              .map(s => s.replace(/^[•\-\*\d+\.\)]\s*/, '').trim())
              .filter(s => s.length > 5)
              .slice(0, 4)
              .map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendTeachMessage(q)}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/60 text-amber-200 transition-all"
                >
                  {q}
                </button>
              ))}
          </div>
        )}
        {messages.length >= 2 && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-2.5 flex justify-center">
            <button
              onClick={handleEndSession}
              className="text-sm font-bold text-amber-300 hover:text-amber-200 transition-all flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
            >
              <FileText className="w-4 h-4" />
              إنهاء الجلسة وحفظ الملخص
            </button>
          </div>
        )}
        <form
          className="max-w-2xl mx-auto flex items-end gap-2.5"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 144) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={quotaExhausted ? "انتهى رصيدك — يرجى تجديد الاشتراك" : "اكتب رسالتك للمعلم..."}
            disabled={isStreaming || quotaExhausted}
            style={{
              minHeight: "48px",
              maxHeight: "144px",
              resize: "none",
              direction: "rtl",
              background: "#131726",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            className="flex-1 px-4 py-3 rounded-2xl text-[15px] leading-relaxed outline-none focus:border-gold/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)] disabled:opacity-40 text-white placeholder:text-white/25 overflow-y-auto transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || quotaExhausted}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: input.trim() && !isStreaming && !quotaExhausted ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(245,158,11,0.15)", boxShadow: input.trim() && !isStreaming && !quotaExhausted ? "0 4px 15px rgba(245,158,11,0.3)" : "none" }}
          >
            <Send className="w-4.5 h-4.5 text-black" style={{ width: "18px", height: "18px" }} />
          </button>
        </form>
        <p className="text-center text-[10px] text-white/15 mt-1.5 max-w-2xl mx-auto" style={{ direction: "rtl" }}>
          Ctrl+Enter للإرسال السريع
        </p>
      </div>
    </div>
    </>
  );
}
