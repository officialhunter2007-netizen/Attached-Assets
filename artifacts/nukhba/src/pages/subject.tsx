import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage } from "@workspace/api-client-react/generated/api.schemas";
import { Send, Bot, User, Sparkles, Loader2, PlayCircle, Lock, FileText, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LessonSummary {
  id: number;
  subjectId: string;
  subjectName: string;
  title: string;
  summaryHtml: string;
  conversationDate: string;
  messagesCount: number;
}

const SUMMARY_IFRAME_STYLES = `
  body{background:transparent;font-family:'Tajawal',sans-serif;direction:rtl;padding:8px 0;color:#e8d5a3;margin:0;font-size:14px;line-height:1.65}
  h3{color:#F59E0B;font-size:1.05em;margin:10px 0 5px}h4{color:#10B981;font-size:1em;margin:8px 0 4px}
  strong{color:#fde68a}ul,ol{padding-right:18px;margin:6px 0}li{margin-bottom:4px}p{margin:6px 0}
`;

function SubjectSummaryCard({ summary }: { summary: LessonSummary }) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const date = new Date(summary.conversationDate).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const srcDoc = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>${SUMMARY_IFRAME_STYLES}</style></head><body>${summary.summaryHtml}</body></html>`;

  const adjustHeight = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow?.document?.body) {
      const h = iframe.contentWindow.document.body.scrollHeight;
      if (h > 0) iframe.style.height = (h + 16) + "px";
    }
  };

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
              <iframe
                ref={iframeRef}
                srcDoc={srcDoc}
                sandbox="allow-same-origin"
                className="w-full border-none"
                style={{ minHeight: "180px", height: "250px" }}
                onLoad={adjustHeight}
                scrolling="no"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Subject() {
  const { subjectId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);

  const loadSummaries = () => {
    fetch(`/api/lesson-summaries?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));
  };

  useEffect(() => { loadSummaries(); }, [subject.id]);

  const handleSessionComplete = () => {
    setIsChatOpen(false);
    setSummariesLoading(true);
    loadSummaries();
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Subject Header */}
        <div className="glass p-6 rounded-3xl border-white/5 mb-8 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} opacity-10 rounded-bl-full`} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-4xl shadow-lg`}>
                {subject.emoji}
              </div>
              <div>
                <h1 className="text-3xl font-black mb-1">{subject.name}</h1>
                <p className="text-muted-foreground text-sm">{subject.units.length} وحدات • {subject.units.reduce((acc, u) => acc + u.lessons.length, 0)} دروس</p>
              </div>
            </div>
            <Button
              onClick={() => setIsChatOpen(true)}
              className="gradient-gold text-primary-foreground font-bold px-6 h-11 rounded-xl shadow-lg shadow-gold/20 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              جلسة جديدة
            </Button>
          </div>
        </div>

        {/* Summaries Section */}
        <div className="mb-12">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
            <div className="w-2 h-7 bg-gold rounded-full" />
            ملخصات الجلسات السابقة
          </h3>

          {summariesLoading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : summaries.length === 0 ? (
            <div className="glass-gold p-10 rounded-3xl border-gold/20 text-center shadow-lg shadow-gold/5 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-3xl -z-10" />
              <Sparkles className="w-12 h-12 text-gold mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-3">لا توجد جلسات سابقة</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                ابدأ جلستك الأولى مع معلم {subject.name} الذكي. بعد إكمالها سيظهر ملخصها هنا تلقائياً.
              </p>
              <Button
                onClick={() => setIsChatOpen(true)}
                className="gradient-gold text-primary-foreground font-bold px-8 h-11 rounded-xl shadow-lg shadow-gold/20"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                ابدأ أول جلسة
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(s => (
                <SubjectSummaryCard key={s.id} summary={s} />
              ))}
            </div>
          )}
        </div>

        {/* Curriculum */}
        <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
          <div className="w-2 h-7 bg-white/20 rounded-full" />
          المنهج الدراسي
        </h3>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {subject.units.map((unit, uIdx) => (
            <AccordionItem key={unit.id} value={unit.id} className="glass border border-white/5 rounded-2xl overflow-hidden px-2">
              <AccordionTrigger className="hover:no-underline px-4 py-4 data-[state=open]:text-gold transition-colors">
                <div className="flex items-center gap-4 text-right">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-lg">
                    {uIdx + 1}
                  </div>
                  <span className="text-lg font-bold">{unit.name}</span>
                  {unit.hasPractical && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">عملي</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 mt-2">
                  {unit.lessons.map((lesson, lIdx) => (
                    <Link key={lesson.id} href={`/lesson/${subject.id}/${unit.id}/${lesson.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10 group">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm text-muted-foreground group-hover:text-gold transition-colors">
                          {uIdx + 1}.{lIdx + 1}
                        </div>
                        <span className="flex-1 font-medium group-hover:text-gold transition-colors">{lesson.title}</span>
                        <PlayCircle className="w-5 h-5 text-muted-foreground group-hover:text-gold opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Chat Dialog */}
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="sm:max-w-[800px] h-[85vh] p-0 flex flex-col glass border-gold/20 gap-0 overflow-hidden bg-background/95">
            <DialogTitle className="sr-only">المعلم الذكي</DialogTitle>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center shadow-lg`}>
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">معلم {subject.name}</h3>
                  <p className="text-xs text-gold">متصل الآن</p>
                </div>
              </div>
            </div>
            <SubjectPathChat
              subject={subject}
              onAccessDenied={() => { setIsChatOpen(false); setLocation("/subscription"); }}
              onSessionComplete={handleSessionComplete}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

const TEACHER_STYLES = `
  body { 
    background: transparent; 
    font-family: 'Tajawal', 'Cairo', sans-serif; 
    direction: rtl; 
    padding: 16px 20px; 
    color: #e8d5a3; 
    margin: 0; 
    line-height: 1.75;
    font-size: 15px;
  }
  h3 { color: #F59E0B; font-size: 1.15em; margin: 14px 0 8px; }
  h4 { color: #10B981; font-size: 1.05em; margin: 10px 0 6px; }
  strong { color: #fde68a; }
  em { color: #6ee7b7; font-style: normal; }
  pre { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px; overflow-x: auto; margin: 12px 0; }
  pre > code { background: transparent; color: #89ddff; direction: ltr; text-align: left; display: block; font-family: 'Fira Code', 'Consolas', monospace; font-size: 13px; white-space: pre; }
  code { background: rgba(245,158,11,0.15); color: #fde68a; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em; direction: ltr; display: inline-block; }
  .question-box { border-right: 3px solid #F59E0B; background: rgba(245,158,11,0.08); padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
  .tip-box { border-right: 3px solid #10B981; background: rgba(16,185,129,0.08); padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
  .discover-box { border-right: 3px solid #8B5CF6; background: rgba(139,92,246,0.08); padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
  .praise { color: #10B981; font-weight: bold; }
  ul, ol { padding-right: 22px; margin: 8px 0; }
  li { margin-bottom: 6px; }
  p { margin: 8px 0; }
`;

function AIMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const srcDoc = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>${TEACHER_STYLES}</style></head><body>${content}</body></html>`;

  const adjustHeight = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow?.document?.body) {
      const h = iframe.contentWindow.document.body.scrollHeight;
      if (h > 0) iframe.style.height = (h + 8) + 'px';
    }
  };

  useEffect(() => {
    if (!isStreaming && content) {
      setIframeKey(k => k + 1);
      const t = setTimeout(adjustHeight, 300);
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  if (isStreaming) {
    const plainText = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return (
      <div className="w-full rounded-2xl border border-gold/20 bg-white/5 p-4">
        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">{plainText}</p>
        <div className="flex items-center gap-1 mt-3">
          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
          <div className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <iframe
        key={iframeKey}
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-none block"
        style={{ minHeight: '80px', height: '150px' }}
        onLoad={adjustHeight}
        scrolling="no"
      />
    </div>
  );
}

function SubjectPathChat({ 
  subject,
  onAccessDenied,
  onSessionComplete,
}: { 
  subject: any;
  onAccessDenied: () => void;
  onSessionComplete?: () => void;
}) {
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages] = useState<string[]>(subject.defaultStages);
  const [currentStage, setCurrentStage] = useState(0);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      sendTeachMessage("", stages, 0);
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

  const sendTeachMessage = async (text: string, stagesParam?: string[], stageParam?: number) => {
    setIsStreaming(true);
    if (text) {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }
    setInput("");
    const usedStages = stagesParam ?? stages;
    const usedStage = stageParam ?? currentStage;

    try {
      const response = await fetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          planContext: null,
          stages: usedStages,
          currentStage: usedStage,
        })
      });

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
              if (data.stageComplete && data.nextStage !== undefined) {
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

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-gold" />
        </div>
        <h3 className="text-2xl font-bold mb-3">انتهت الجلسة المجانية</h3>
        <p className="text-muted-foreground mb-8 max-w-sm">
          لقد استخدمت جلستك التعليمية المجانية. اشترك الآن للاستمرار في التعلم، أو ادعُ 5 أصدقاء للحصول على 3 أيام مجاناً.
        </p>
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {stages.length > 0 && (
        <div className="shrink-0 px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">تقدمك في الجلسة</span>
              <span className="text-xs font-bold text-gold">{Math.round(((currentStage) / stages.length) * 100)}%</span>
            </div>
            <div className="flex gap-1.5">
              {stages.map((s, i) => (
                <div key={i} className="flex-1 group relative">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${
                    i < currentStage ? 'bg-emerald' : i === currentStage ? 'bg-gold' : 'bg-white/10'
                  }`} />
                  <div className={`absolute bottom-3 right-0 hidden group-hover:block z-20 bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-xs whitespace-nowrap ${
                    i < currentStage ? 'text-emerald' : i === currentStage ? 'text-gold' : 'text-muted-foreground'
                  }`}>{s}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {stages[currentStage] && (
                <span className="text-xs text-gold font-medium">
                  {currentStage + 1}/{stages.length} — {stages[currentStage]}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-gold/20 text-gold' : 'gradient-gold text-primary-foreground'}`}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
                </div>
                <div className={`flex-1 ${msg.role === 'user' ? 'text-left' : 'text-right'}`}>
                  {msg.role === 'user' ? (
                    <div className="inline-block max-w-[85%] rounded-2xl p-4 bg-gold/10 border border-gold/20 text-foreground text-base leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <AIMessage content={msg.content} isStreaming={isStreaming && i === messages.length - 1} />
                  )}
                </div>
              </motion.div>
            ))}
            {isStreaming && messages[messages.length-1]?.role === 'user' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 flex-row">
                 <div className="w-10 h-10 shrink-0 rounded-full gradient-gold flex items-center justify-center text-primary-foreground">
                   <Bot className="w-6 h-6" />
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-2">
                   <div className="w-2 h-2 bg-gold rounded-full animate-bounce" />
                   <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                   <div className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
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
      </div>
    </div>
  );
}
