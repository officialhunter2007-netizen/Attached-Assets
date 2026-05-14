import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useLang } from "@/lib/lang-context";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import { getSubjectById } from "@/lib/curriculum";
import { 
  useGetLessonViews, 
  useGetCachedLesson, 
  useSaveCachedLesson,
  useRecordLessonView,
  useMarkChallengeAnswered,
  getGetCachedLessonQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lock, ChevronRight, ChevronLeft, CheckCircle2, Shield, Trophy, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorPanel } from "@/components/code-editor-panel";

export default function Lesson() {
  const { subjectId, unitId, lessonId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const unit = subject?.units.find(u => u.id === unitId);
  const lesson = unit?.lessons.find(l => l.id === lessonId);
  
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { tr } = useLang();
  const tl = tr.lesson;

  const lessonKey = `${subjectId}__${unitId}__${lessonId}`;

  // Access Control
  const { data: views } = useGetLessonViews();

  // Per-subject access verdict from the server.
  type SubjectAccess = {
    hasAccess: boolean;
    isFirstLesson: boolean;
    hasSubjectSubscription: boolean;
  } | null;
  const [subjectAccess, setSubjectAccess] = useState<SubjectAccess>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    setAccessLoaded(false);
    fetch(`/api/subscriptions/subject-access?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: SubjectAccess) => {
        if (cancelled) return;
        setSubjectAccess(d ?? null);
      })
      .catch(() => { if (!cancelled) setSubjectAccess(null); })
      .finally(() => { if (!cancelled) setAccessLoaded(true); });
    return () => { cancelled = true; };
  }, [subjectId]);

  const isFirstLesson = subjectAccess?.isFirstLesson ?? !user?.firstLessonComplete;
  const hasSubscriptionAccess = subjectAccess?.hasAccess ?? false;
  const alreadyViewed = views?.some(v => v.lessonId === lessonId) ?? false;

  const hasAccess = isFirstLesson || hasSubscriptionAccess || alreadyViewed;

  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Only flip to the paywall once the subject-access fetch has completed,
    // otherwise we briefly flash the locked screen before the verdict
    // arrives.
    if (!accessLoaded) return;
    if (!hasAccess && views) {
      setShowPaywall(true);
    } else {
      setShowPaywall(false);
    }
  }, [hasAccess, views, accessLoaded]);

  // Cached Lesson
  const { data: cachedLesson, isLoading: isCacheLoading } = useGetCachedLesson({ lesson_key: lessonKey }, {
    query: {
      enabled: hasAccess && !!lessonKey,
      queryKey: getGetCachedLessonQueryKey({ lesson_key: lessonKey }),
      retry: false
    }
  });

  const saveCacheMutation = useSaveCachedLesson();
  const recordViewMutation = useRecordLessonView();
  
  const [lessonContent, setLessonContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const sections = lessonContent ? parseSections(lessonContent) : [];

  useEffect(() => {
    if (cachedLesson?.contentAr) {
      setLessonContent(cachedLesson.contentAr);
      recordView();
    } else if (hasAccess && !isCacheLoading && !lessonContent && !isGenerating) {
      generateLesson();
    }
  }, [cachedLesson, hasAccess, isCacheLoading]);

  const generateLesson = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: subjectId!,
          unitId: unitId!,
          lessonId: lessonId!,
          lessonTitle: lesson?.title || "درس",
          subjectName: subject?.name || "مادة",
          section: subjectId?.startsWith("skill-") ? "skills" : "university",
          isSkill: subjectId?.startsWith("skill-")
        })
      });

      if (response.status === 403) {
        await refreshUser();
        setShowPaywall(true);
        return;
      }
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let html = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setLessonContent(html);
          await saveCacheMutation.mutateAsync({
            data: {
              lessonKey,
              section: subjectId?.startsWith("skill-") ? "skills" : "university",
              subject: subject?.name || "",
              unitTitle: unit?.name || "",
              lessonTitle: lesson?.title || "",
              contentAr: html
            }
          });
          recordView();
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              html += data.content;
              // We could stream content here, but since we need to parse sections, 
              // it's easier to wait for the full generation or implement a robust streaming parser.
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التوليد" });
    } finally {
      setIsGenerating(false);
    }
  };

  const recordView = async () => {
    if (!views?.some(v => v.lessonId === lessonId)) {
      try {
        await recordViewMutation.mutateAsync({
          data: {
            subjectId: subjectId!,
            unitId: unitId!,
            lessonId: lessonId!,
            lessonTitle: lesson?.title || "درس",
            subjectName: subject?.name || "مادة"
          }
        });
        await refreshUser();
      } catch (e) {}
    }
  };

  if (!subject || !unit || !lesson) return null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span className="text-gold">{subject.name}</span>
            <ChevronLeft className="w-4 h-4" />
            <span>{unit.name}</span>
          </div>
          <h1 className="text-3xl font-black">{lesson.title}</h1>
        </div>

        {isGenerating || isCacheLoading ? (
          <div className="glass p-8 md:p-16 rounded-3xl border-white/5 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-gold mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-bold mb-2">{tl.preparing}</h3>
            <p className="text-muted-foreground text-sm md:text-base">{tl.preparingSub}</p>
          </div>
        ) : sections.length > 0 ? (
          <LessonViewer 
            sections={sections} 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
            lessonId={lessonId!}
            subjectId={subjectId!}
            viewId={views?.find(v => v.lessonId === lessonId)?.id}
          />
        ) : null}

        <PaywallModal open={showPaywall} onOpenChange={(open) => {
          if (!open) setLocation("/learn");
        }} />
      </div>
    </AppLayout>
  );
}

function parseSections(html: string) {
  // Simple heuristic: split by H2 tags
  const parts = html.split(/<h2[^>]*>/i);
  if (parts.length <= 1) return [{ title: "محتوى الدرس", content: html }];
  
  const sections: { title: string; content: string }[] = [];
  if (parts[0].trim()) sections.push({ title: "مقدمة", content: parts[0] });
  
  for (let i = 1; i < parts.length; i++) {
    const closingIdx = parts[i].indexOf('</h2>');
    if (closingIdx > -1) {
      const title = parts[i].substring(0, closingIdx).replace(/<[^>]+>/g, '').trim();
      const content = "<h2>" + title + "</h2>" + parts[i].substring(closingIdx + 5);
      sections.push({ title, content });
    } else {
      sections.push({ title: `قسم ${i}`, content: "<h2" + parts[i] });
    }
  }
  return sections;
}

function isCodeChallenge(section: { title: string; content: string }, subjectId: string): boolean {
  const combined = (section.title + section.content + subjectId).toLowerCase();
  const codeKeywords = ["python", "javascript", "برمج", "كود", "code", "برمجة", "اكتب برنامج", "اكتب دالة", "اكتب كود"];
  return codeKeywords.some(kw => combined.includes(kw));
}

function LessonViewer({ sections, activeSection, setActiveSection, lessonId, subjectId, viewId }: any) {
  const progress = ((activeSection + 1) / sections.length) * 100;
  const section = sections[activeSection];
  const isChallenge = section.title.includes('تحد') || section.title.includes('سؤال') || section.title.includes('تمرين');
  const showCodeEditor = isChallenge && isCodeChallenge(section, subjectId || "");
  const [answer, setAnswer] = useState("");
  const markChallenge = useMarkChallengeAnswered();
  const { toast } = useToast();
  const { tr } = useLang();
  const tl = tr.lesson;

  const handleChallengeSubmit = async () => {
    if (!answer.trim() || !viewId) return;
    try {
      await markChallenge.mutateAsync({ id: viewId });
      toast({
        title: tl.challengeSuccessTitle,
        description: tl.challengeSuccessDesc,
        className: "bg-emerald-600 border-none text-white"
      });
      if (activeSection < sections.length - 1) {
        setActiveSection(activeSection + 1);
      }
    } catch (e) {}
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 220px)" }}>
      <div className="mb-4 md:mb-6">
        <div className="flex justify-between text-sm text-gold font-bold mb-2">
          <span className="truncate ml-4">{section.title}</span>
          <span className="shrink-0">{activeSection + 1} / {sections.length}</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/5 [&>div]:bg-gold" />
      </div>

      <div className="glass flex-1 rounded-3xl border-white/5 p-4 md:p-10 overflow-y-auto mb-4 md:mb-6 prose prose-invert max-w-none prose-headings:text-gold prose-a:text-emerald prose-p:leading-relaxed prose-sm md:prose-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </AnimatePresence>

        {isChallenge && showCodeEditor && (
          <div className="mt-6 not-prose">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-sm font-bold text-gold">{tl.codeEnv}</span>
            </div>
            <CodeEditorPanel sectionContent={section.content} subjectId={subjectId} />
            <Button
              onClick={handleChallengeSubmit}
              disabled={markChallenge.isPending}
              className="mt-4 gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              {tl.finishChallenge}
            </Button>
          </div>
        )}

        {isChallenge && !showCodeEditor && (
          <div className="mt-8 p-6 rounded-2xl glass-gold border-gold/20">
            <h4 className="text-xl font-bold text-gold mb-4 mt-0">{tl.answerChallenge}</h4>
            <Textarea 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={tl.answerPlaceholder}
              className="bg-black/40 border-white/10 mb-4 min-h-[100px] text-lg"
            />
            <Button 
              onClick={handleChallengeSubmit} 
              disabled={!answer.trim() || markChallenge.isPending}
              className="gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              {tl.checkAnswer}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center shrink-0">
        <Button 
          variant="outline" 
          onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
          disabled={activeSection === 0}
          className="border-white/10 hover:bg-white/5"
        >
          <ChevronRight className="w-5 h-5 ml-2" />
          {tl.prev}
        </Button>
        
        {activeSection < sections.length - 1 ? (
          <Button 
            onClick={() => setActiveSection(activeSection + 1)}
            className="gradient-gold text-primary-foreground font-bold px-8 shadow-lg shadow-gold/20"
          >
            {tl.next}
            <ChevronLeft className="w-5 h-5 mr-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => window.history.back()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 shadow-lg shadow-emerald/20"
          >
            <Trophy className="w-5 h-5 ml-2" />
            {tl.finishLesson}
          </Button>
        )}
      </div>
    </div>
  );
}

function PaywallModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { tr } = useLang();
  const tl = tr.lesson;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] glass p-0 border-white/10 overflow-hidden" hideCloseButton>
        <DialogTitle className="sr-only">{tl.paywallTitle}</DialogTitle>

        <div className="h-28 bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 text-center">
            <Lock className="w-10 h-10 text-white mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{tl.paywallTitle}</p>
          </div>
        </div>

        <div className="p-6">
          <p className="text-center text-muted-foreground mb-6">{tl.paywallSub}</p>

          <div className="glass-gold rounded-2xl p-5 flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gold text-sm mb-0.5">{tl.paywallCTA}</h3>
              <p className="text-xs text-muted-foreground">{tl.paywallPlans}</p>
            </div>
            <Button
              onClick={() => { onOpenChange(false); setLocation("/subscription"); }}
              className="gradient-gold text-primary-foreground font-bold shrink-0 shadow-lg shadow-gold/20"
            >
              {tl.viewPlans}
            </Button>
          </div>

          <Button variant="ghost" className="w-full mt-2 text-muted-foreground text-sm" onClick={() => onOpenChange(false)}>
            {tl.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
