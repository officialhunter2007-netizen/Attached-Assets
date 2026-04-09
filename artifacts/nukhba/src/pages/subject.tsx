import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage } from "@workspace/api-client-react/generated/api.schemas";
import { Send, Bot, User, Sparkles, Loader2, Lock, FileText, ChevronDown, ChevronUp, Plus, Clock, Trophy, RefreshCw, Calendar, Code2, ArrowRight } from "lucide-react";
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
        <Button
          variant="outline"
          className="flex-1 border-white/10 h-12 rounded-xl flex items-center justify-center gap-2"
          onClick={onRenew}
        >
          دعوة أصدقاء (5 دعوات = 3 أيام)
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
          <div className="flex items-center gap-4 md:gap-5 relative z-10">
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl md:text-4xl shadow-lg shrink-0`}>
              {subject.emoji}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{subject.name}</h1>
            </div>
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
          <DialogContent className="sm:max-w-[900px] h-[90vh] p-0 flex flex-col glass border-gold/20 gap-0 overflow-hidden bg-background/95">
            <DialogTitle className="sr-only">المعلم الذكي</DialogTitle>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                {isIDEOpen && (
                  <button
                    onClick={() => setIsIDEOpen(false)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors ml-1"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>المحادثة</span>
                  </button>
                )}
                {!isIDEOpen && (
                  <>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center shadow-lg`}>
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">معلم {subject.name}</h3>
                      <p className="text-xs text-gold">متصل الآن</p>
                    </div>
                  </>
                )}
                {isIDEOpen && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1e1e2e] border border-white/10 flex items-center justify-center">
                      <Code2 className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight">بيئة التطبيق</h3>
                      <p className="text-xs text-muted-foreground">اكتب وشغّل كودك</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsIDEOpen(v => !v)}
                className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-all border ${
                  isIDEOpen
                    ? "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                    : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>{isIDEOpen ? "إغلاق IDE" : "فتح IDE"}</span>
              </button>
            </div>
            <SubjectPathChat
              subject={subject}
              isFirstSession={!summariesLoading && summaries.length === 0}
              onAccessDenied={() => { setIsChatOpen(false); setLocation("/subscription"); }}
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


function AIMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const safe = stripInlineStyles(content);

  return (
    <div className="rounded-2xl rounded-bl-none bg-[hsl(222,24%,16%)] border border-white/8 p-4 max-w-[90%] shadow-sm">
      <div className="ai-msg" dangerouslySetInnerHTML={{ __html: isStreaming ? `<p>${plainText}</p>` : safe }} />
      {isStreaming && (
        <div className="flex items-center gap-1 mt-3">
          <div className="w-2 h-2 bg-white/25 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/25 rounded-full animate-bounce" style={{animationDelay:'0.18s'}} />
          <div className="w-2 h-2 bg-white/25 rounded-full animate-bounce" style={{animationDelay:'0.36s'}} />
        </div>
      )}
    </div>
  );
}

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
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [dailyLimitUntil, setDailyLimitUntil] = useState<string | null>(null);
  const [chatPhase, setChatPhase] = useState<'diagnostic' | 'teaching'>(isFirstSession ? 'diagnostic' : 'teaching');
  const [customPlan, setCustomPlan] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      sendTeachMessage("", stages, 0, chatPhase === 'diagnostic');
    }
  }, []);

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
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          planContext: customPlan,
          stages: usedStages,
          currentStage: usedStage,
          isDiagnosticPhase: diagMode,
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
              if (data.messagesRemaining !== null && data.messagesRemaining !== undefined) {
                setMessagesRemaining(data.messagesRemaining);
              }
              if (data.planReady) {
                setCustomPlan(assistantMsg);
                setChatPhase('teaching');
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
                }
              }
              break;
            }
            if (data.content) {
              assistantMsg += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: "assistant", content: assistantMsg };
                return newMessages;
              });
            }
          } catch {}
        }
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
        <h3 className="text-2xl font-bold mb-3">انتهت الجلسة المجانية</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          لقد استخدمت جلستك التعليمية المجانية. اشترك الآن للاستمرار في التعلم، أو ادعُ 5 أصدقاء للحصول على 3 أيام مجاناً.
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
          <Button variant="outline" onClick={onAccessDenied} className="border-white/10 h-12 rounded-xl">
            دعوة أصدقاء (5 دعوات = 3 أيام)
          </Button>
        </div>
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
      <div className="flex-1 overflow-y-auto" style={{ direction: "ltr" }}>
        <div className="p-4">
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
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {chatPhase === 'diagnostic' && (
        <div className="shrink-0 px-4 py-2.5 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-xs text-purple-300 font-medium">مرحلة التشخيص — سيبني معلمك خطتك الشخصية بعد 3 أسئلة</p>
        </div>
      )}
      {messagesRemaining !== null && messagesRemaining <= 5 && messagesRemaining > 0 && (
        <div className="shrink-0 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-center">
          <p className="text-xs text-amber-400 font-medium">
            تبقّى لك <strong>{messagesRemaining}</strong> {messagesRemaining === 1 ? 'رسالة' : 'رسائل'} في خطتك هذا الشهر
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-5" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-4 pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isLastMsg = i === messages.length - 1;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ direction: 'ltr' }}
                  className={`flex gap-3 items-end ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold shadow ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white/70'
                      : 'gradient-gold text-primary-foreground'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  {/* Bubble */}
                  <div style={{ direction: 'rtl' }}>
                    {msg.role === 'user' ? (
                      <div className="rounded-2xl rounded-br-none px-4 py-3 bg-white/10 border border-white/15 text-white text-[15px] leading-relaxed max-w-[75vw] md:max-w-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <AIMessage content={msg.content} isStreaming={isStreaming && isLastMsg} />
                    )}
                  </div>
                </motion.div>
              );
            })}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ direction: 'ltr' }}
                className="flex gap-3 items-end"
              >
                <div className="w-8 h-8 shrink-0 rounded-full gradient-gold flex items-center justify-center text-primary-foreground shadow">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-2xl rounded-bl-none bg-[hsl(222,24%,16%)] border border-white/8 px-5 py-3.5 flex items-center gap-2">
                  <div className="w-2 h-2 bg-white/35 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-white/35 rounded-full animate-bounce" style={{animationDelay:'0.18s'}} />
                  <div className="w-2 h-2 bg-white/35 rounded-full animate-bounce" style={{animationDelay:'0.36s'}} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/10 shrink-0 bg-background relative z-10">
        <form 
          className="relative max-w-3xl mx-auto"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل معلمك، ناقشه، أو اطلب توضيحاً..."
            className="w-full h-14 pl-14 pr-6 bg-black/40 border-white/10 rounded-2xl text-lg focus-visible:ring-gold focus-visible:border-gold/50"
            disabled={isStreaming}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isStreaming}
            className="absolute left-2 top-2 h-10 w-10 rounded-xl gradient-gold text-primary-foreground"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
        {messages.length >= 2 && !isStreaming && (
          <div className="max-w-3xl mx-auto mt-2 flex justify-center">
            <button
              onClick={handleEndSession}
              className="text-sm font-medium text-gold/80 hover:text-gold transition-colors border border-gold/20 hover:border-gold/40 hover:bg-gold/5 rounded-xl px-5 py-2 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              إنهاء جلسة اليوم وحفظ الملخص
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
