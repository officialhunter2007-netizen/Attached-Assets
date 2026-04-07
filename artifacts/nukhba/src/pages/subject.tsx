import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { useGetLearningPathBySubject, useSaveLearningPath, getGetLearningPathBySubjectQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage, ChatMessageRole } from "@workspace/api-client-react/generated/api.schemas";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

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

  const { data: path, isLoading: pathLoading } = useGetLearningPathBySubject(subject.id, {
    query: {
      enabled: !!subject.id && !!user,
      queryKey: getGetLearningPathBySubjectQueryKey(subject.id),
      retry: false
    }
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPhase, setChatPhase] = useState<"INTERVIEWING" | "BUILDING" | "TEACHING">("INTERVIEWING");

  const startChat = () => {
    if (path?.planHtml) {
      setChatPhase("TEACHING");
    } else {
      setChatPhase("INTERVIEWING");
    }
    setIsChatOpen(true);
  };

  const restartChat = () => {
    setChatPhase("INTERVIEWING");
    setIsChatOpen(true);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="glass p-8 rounded-3xl border-white/5 mb-10 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} opacity-10 rounded-bl-full`} />
          <div className="flex items-center gap-6 relative z-10">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-5xl shadow-lg`}>
              {subject.emoji}
            </div>
            <div>
              <h1 className="text-3xl font-black mb-2">{subject.name}</h1>
              <p className="text-muted-foreground">{subject.units.length} وحدات • {subject.units.reduce((acc, u) => acc + u.lessons.length, 0)} دروس</p>
            </div>
          </div>
        </div>

        <div className="glass-gold p-8 rounded-3xl border-gold/20 mb-12 text-center shadow-lg shadow-gold/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-3xl -z-10" />
          <Sparkles className="w-12 h-12 text-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">جلستك التعليمية المخصصة</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            يقوم معلمك الذكي ببناء مسار مخصص لك بناءً على مستواك الحالي وأهدافك، ثم يرافقك خطوة بخطوة في رحلة التعلم.
          </p>
          
          {pathLoading ? (
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold" />
          ) : path?.planHtml ? (
            <div className="flex justify-center gap-4">
              <Button onClick={startChat} size="lg" className="gradient-gold text-primary-foreground font-bold px-8 h-12 rounded-xl text-lg shadow-lg shadow-gold/20">
                <PlayCircle className="w-5 h-5 ml-2" />
                استمر في جلستك
              </Button>
              <Button onClick={restartChat} variant="outline" size="lg" className="border-white/10 hover:bg-white/5 h-12 rounded-xl">
                <RefreshCw className="w-5 h-5 ml-2" />
                إعادة البدء
              </Button>
            </div>
          ) : (
            <Button onClick={startChat} size="lg" className="gradient-gold text-primary-foreground font-bold px-8 h-12 rounded-xl text-lg shadow-lg shadow-gold/20">
              <Sparkles className="w-5 h-5 ml-2" />
              ابدأ جلستي التعليمية المخصصة
            </Button>
          )}
        </div>

        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-gold rounded-full" />
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
              phase={chatPhase} 
              setPhase={setChatPhase} 
              initialPath={path}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function SubjectPathChat({ 
  subject, 
  phase, 
  setPhase,
  initialPath
}: { 
  subject: any; 
  phase: string; 
  setPhase: (p: any) => void;
  initialPath: any;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [planHtml, setPlanHtml] = useState<string | null>(initialPath?.planHtml || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const savePathMutation = useSaveLearningPath();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, planHtml, phase]);

  useEffect(() => {
    if (phase === "INTERVIEWING" && messages.length === 0) {
      sendInterviewMessage("");
    } else if (phase === "TEACHING" && messages.length === 0) {
      sendTeachMessage("");
    }
  }, [phase]);

  const sendInterviewMessage = async (text: string) => {
    setIsStreaming(true);
    if (text) {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }
    setInput("");

    try {
      const response = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          questionCount: messages.filter(m => m.role === 'assistant').length
        })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              if (data.isReady) {
                setPhase("BUILDING");
                buildPlan();
              }
              break;
            }
            if (data.content) {
              assistantMsg += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMsg;
                return newMessages;
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  };

  const buildPlan = async () => {
    setMessages([]);
    setIsStreaming(true);
    try {
      const interviewSummary = messages.map(m => `${m.role}: ${m.content}`).join("\n");
      const response = await fetch('/api/ai/build-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          userName: user?.displayName || user?.email || "طالب",
          interviewSummary
        })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              await savePathMutation.mutateAsync({
                data: { subjectId: subject.id, planHtml: html }
              });
              queryClient.invalidateQueries({ queryKey: getGetLearningPathBySubjectQueryKey(subject.id) });
              break;
            }
            if (data.content) {
              html += data.content;
              setPlanHtml(html);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  };

  const sendTeachMessage = async (text: string) => {
    setIsStreaming(true);
    if (text) {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }
    setInput("");

    try {
      const response = await fetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          planContext: planHtml
        })
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              assistantMsg += data.content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMsg;
                return newMessages;
              });
            }
          }
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
    if (phase === "INTERVIEWING") sendInterviewMessage(input);
    if (phase === "TEACHING") sendTeachMessage(input);
  };

  if (phase === "BUILDING" && !planHtml) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 mb-8 relative">
          <div className="absolute inset-0 border-t-2 border-gold rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-2 border-emerald rounded-full animate-spin-reverse"></div>
          <Bot className="w-10 h-10 text-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-2xl font-bold mb-2">جاري بناء مسارك المخصص...</h3>
        <p className="text-muted-foreground text-center">يقوم معلمك الذكي بتحليل إجاباتك وتصميم خطة دراسية تناسبك تماماً</p>
      </div>
    );
  }

  if (phase === "BUILDING" && planHtml) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gold text-center">خطتك الدراسية المخصصة</h2>
            <iframe 
              srcDoc={`
                <html dir="rtl">
                  <head>
                    <style>
                      body { font-family: 'Cairo', 'Tajawal', sans-serif; color: #e8d5a3; background: transparent; padding: 20px; line-height: 1.6; }
                      h1, h2, h3 { color: #F59E0B; }
                      .plan-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
                    </style>
                  </head>
                  <body>${planHtml}</body>
                </html>
              `}
              className="w-full min-h-[500px] border-none"
              onLoad={(e) => {
                const target = e.target as HTMLIFrameElement;
                target.style.height = target.contentWindow?.document.body.scrollHeight + 'px';
              }}
            />
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-white/10 shrink-0 bg-black/20">
          <Button onClick={() => setPhase("TEACHING")} className="w-full gradient-gold text-primary-foreground font-bold h-12 text-lg rounded-xl">
            ابدأ الجلسة التعليمية
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
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
                  <div className={`inline-block max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user' 
                      ? 'bg-gold/10 border border-gold/20 text-foreground' 
                      : 'bg-white/5 border border-white/10 text-foreground prose prose-invert prose-p:leading-relaxed'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                       phase === "TEACHING" ? (
                        <iframe 
                          srcDoc={`
                            <html dir="rtl">
                              <head>
                                <style>
                                  body { font-family: 'Cairo', 'Tajawal', sans-serif; color: #e8d5a3; background: transparent; margin: 0; line-height: 1.7; font-size: 16px; }
                                  h1, h2, h3 { color: #F59E0B; margin-top: 0;}
                                  code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #10B981; direction: ltr; display: inline-block;}
                                  pre { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; direction: ltr; text-align: left; border: 1px solid rgba(255,255,255,0.1); overflow-x: auto;}
                                  ul, ol { padding-right: 20px; }
                                  li { margin-bottom: 8px; }
                                </style>
                              </head>
                              <body>${msg.content}</body>
                            </html>
                          `}
                          className="w-full border-none"
                          style={{ minHeight: "60px" }}
                          onLoad={(e) => {
                            const target = e.target as HTMLIFrameElement;
                            if (target.contentWindow?.document.body) {
                              target.style.height = target.contentWindow.document.body.scrollHeight + 20 + 'px';
                            }
                          }}
                        />
                       ) : (
                         <div dangerouslySetContent={{__html: msg.content.replace(/\n/g, '<br/>')}} />
                       )
                    )}
                  </div>
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
            placeholder={phase === "INTERVIEWING" ? "أجب عن سؤال المعلم..." : "اسأل معلمك، ناقشه، أو اطلب توضيحاً..."}
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
