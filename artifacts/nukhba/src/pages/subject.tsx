import { useState, useEffect, useRef, memo } from "react";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage } from "@workspace/api-client-react/generated/api.schemas";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Send, Bot, User, Sparkles, Loader2, Lock, FileText, ChevronDown, ChevronUp, Plus, Clock, Trophy, RefreshCw, Calendar, Code2, ArrowRight, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorPanel } from "@/components/code-editor-panel";

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

export default function Subject() {
  const { subjectId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isIDEOpen, setIsIDEOpen] = useState(false);
  const { data: lessonViews } = useGetLessonViews();

  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [allSummaries, setAllSummaries] = useState<LessonSummary[]>([]);

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

  useEffect(() => {
    if (subject) loadSummaries();
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

        {/* Chat Dialog */}
        <Dialog open={isChatOpen} onOpenChange={(open) => { setIsChatOpen(open); if (!open) setIsIDEOpen(false); }}>
          <DialogContent className="
            max-sm:!inset-0 max-sm:!translate-x-0 max-sm:!translate-y-0
            max-sm:!w-full max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-0
            sm:max-w-[860px] sm:h-[90vh] sm:rounded-3xl
            p-0 flex flex-col gap-0 overflow-hidden
            bg-[#080a11] border-white/8
          " hideCloseButton>
            <DialogTitle className="sr-only">المعلم الذكي</DialogTitle>

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
                  {subject.hasCoding && !isIDEOpen && (
                    <button
                      onClick={() => setIsIDEOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gold/10 border border-gold/25 text-gold hover:bg-gold/20 transition-all"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">IDE</span>
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
            />
          </DialogContent>
        </Dialog>
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


const AIMessage = memo(function AIMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const safeRef = useRef<string>("");
  if (!isStreaming) {
    safeRef.current = stripInlineStyles(content);
  }
  const displayHtml = isStreaming
    ? `<p>${content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}</p>`
    : safeRef.current;

  return (
    <div className="relative rounded-2xl rounded-tr-none min-w-0 max-w-[92%] shadow-md"
      style={{ background: "linear-gradient(135deg, #131726 0%, #0f1220 100%)", borderLeft: "2px solid rgba(245,158,11,0.35)", overflowX: "clip" }}>
      <div className="px-4 py-3.5">
        <div className="ai-msg" dangerouslySetInnerHTML={{ __html: displayHtml }} />
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
}: { 
  subject: any;
  isFirstSession?: boolean;
  onAccessDenied: () => void;
  onSessionComplete?: () => void;
  ideOpen?: boolean;
  onCloseIDE?: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages] = useState<string[]>(subject.defaultStages);
  const [currentStage, setCurrentStage] = useState(0);
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleShareWithTeacher = (code: string, language: string, output: string) => {
    const langLabels: Record<string, string> = {
      python: "Python 🐍", javascript: "JavaScript ⚡", java: "Java ☕",
      cpp: "C++ ⚙️", c: "C 🔩", go: "Go 🐹", rust: "Rust 🦀",
      ruby: "Ruby 💎", php: "PHP 🐘", bash: "Bash 🐚",
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
          }
        }
      } catch {}
      setPlanLoaded(true);
    }
    fetchPlan();
  }, [subject.id]);

  // Start session once plan fetch is done — use the persisted stage index
  useEffect(() => {
    if (!planLoaded) return;
    if (messages.length === 0) {
      sendTeachMessage("", stages, currentStage, chatPhase === 'diagnostic');
    }
  }, [planLoaded]);

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

  const sendTeachMessage = async (text: string, stagesParam?: string[], stageParam?: number, isDiagnostic?: boolean) => {
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

  if (ideOpen) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ direction: "ltr", background: "#080a11" }}>
        <div className="p-3 sm:p-4 w-full min-w-0">
          <CodeEditorPanel
            sectionContent=""
            subjectId={subject.id}
            onShareWithTeacher={handleShareWithTeacher}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080a11" }}>

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
          {messagesRemaining !== null && messagesRemaining <= 10 && messagesRemaining > 0 && (
            <div className="shrink-0 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-amber-400 font-bold">{messagesRemaining}</span>
              <span className="text-[10px] text-amber-400/70 hidden sm:inline">رسالة</span>
            </div>
          )}
        </div>
      )}

      {/* Diagnostic phase banner */}
      {chatPhase === 'diagnostic' && (
        <div className="shrink-0 px-4 py-2.5 border-b border-purple-500/15 flex items-center justify-center gap-2" style={{ background: "rgba(139,92,246,0.06)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-[12px] text-purple-300 font-medium">مرحلة التشخيص — يبني معلمك خطتك التعليمية الشخصية</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 py-5" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-5 pb-4">
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
                    <div className="mr-auto w-fit max-w-[80%] rounded-2xl rounded-br-none px-4 py-3 text-[15px] leading-relaxed break-words"
                      style={{ background: "linear-gradient(135deg, #1e2235 0%, #191c2a 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {msg.content}
                    </div>
                  ) : (
                    <AIMessage content={msg.content} isStreaming={isStreaming && isLastMsg} />
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
        {messages.length >= 2 && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-2.5 flex justify-end">
            <button
              onClick={handleEndSession}
              className="text-[12px] font-medium text-gold/70 hover:text-gold transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gold/5 border border-transparent hover:border-gold/15"
            >
              <FileText className="w-3.5 h-3.5" />
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
  );
}
