import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { 
  useGetLessonViews, 
  useGetCachedLesson, 
  useSaveCachedLesson,
  useRecordLessonView,
  useMarkChallengeAnswered,
  getGetCachedLessonQueryKey,
  useGetReferralInfo
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lock, ChevronRight, ChevronLeft, CheckCircle2, Shield, Copy, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Lesson() {
  const { subjectId, unitId, lessonId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const unit = subject?.units.find(u => u.id === unitId);
  const lesson = unit?.lessons.find(l => l.id === lessonId);
  
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const lessonKey = `${subjectId}__${unitId}__${lessonId}`;

  // Access Control
  const { data: views } = useGetLessonViews();
  const uniqueLessonsViewed = new Set(views?.map(v => v.lessonId)).size || 0;
  const hasAccess = user?.nukhbaPlan || uniqueLessonsViewed < 1 || views?.some(v => v.lessonId === lessonId);
  
  const [showPaywall, setShowPaywall] = useState(!hasAccess);

  useEffect(() => {
    if (!hasAccess && views) {
      setShowPaywall(true);
    }
  }, [hasAccess, views]);

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
          section: "university",
          isSkill: subjectId?.startsWith("skill-")
        })
      });

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
              section: "university",
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
          <div className="glass p-16 rounded-3xl border-white/5 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 animate-spin text-gold mb-6" />
            <h3 className="text-2xl font-bold mb-2">جاري تحضير الدرس...</h3>
            <p className="text-muted-foreground">يقوم الذكاء الاصطناعي ببناء الشرح الأمثل لك</p>
          </div>
        ) : sections.length > 0 ? (
          <LessonViewer 
            sections={sections} 
            activeSection={activeSection} 
            setActiveSection={setActiveSection}
            lessonId={lessonId!}
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
  
  const sections = [];
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

function LessonViewer({ sections, activeSection, setActiveSection, lessonId, viewId }: any) {
  const progress = ((activeSection + 1) / sections.length) * 100;
  const section = sections[activeSection];
  const isChallenge = section.title.includes('تحد') || section.title.includes('سؤال');
  const [answer, setAnswer] = useState("");
  const markChallenge = useMarkChallengeAnswered();
  const { toast } = useToast();

  const handleChallengeSubmit = async () => {
    if (!answer.trim() || !viewId) return;
    try {
      await markChallenge.mutateAsync({ id: viewId });
      toast({
        title: "أحسنت!",
        description: "تم تسجيل إجابتك، لقد كسبت نقاط التحدي.",
        className: "bg-emerald-600 border-none text-white"
      });
      if (activeSection < sections.length - 1) {
        setActiveSection(activeSection + 1);
      }
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gold font-bold mb-2">
          <span>{section.title}</span>
          <span>{activeSection + 1} / {sections.length}</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/5 [&>div]:bg-gold" />
      </div>

      <div className="glass flex-1 rounded-3xl border-white/5 p-6 md:p-10 overflow-y-auto mb-6 prose prose-invert max-w-none prose-headings:text-gold prose-a:text-emerald prose-p:leading-relaxed prose-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            dangerouslySetContent={{ __html: section.content }}
          />
        </AnimatePresence>

        {isChallenge && (
          <div className="mt-8 p-6 rounded-2xl glass-gold border-gold/20">
            <h4 className="text-xl font-bold text-gold mb-4 mt-0">أجب عن التحدي</h4>
            <Textarea 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="اكتب إجابتك هنا للتحقق منها..."
              className="bg-black/40 border-white/10 mb-4 min-h-[100px] text-lg"
            />
            <Button 
              onClick={handleChallengeSubmit} 
              disabled={!answer.trim() || markChallenge.isPending}
              className="gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20"
            >
              <CheckCircle2 className="w-5 h-5 ml-2" />
              تحقق من إجابتي
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
          السابق
        </Button>
        
        {activeSection < sections.length - 1 ? (
          <Button 
            onClick={() => setActiveSection(activeSection + 1)}
            className="gradient-gold text-primary-foreground font-bold px-8 shadow-lg shadow-gold/20"
          >
            التالي
            <ChevronLeft className="w-5 h-5 mr-2" />
          </Button>
        ) : (
          <Button 
            onClick={() => window.history.back()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 shadow-lg shadow-emerald/20"
          >
            <Trophy className="w-5 h-5 ml-2" />
            إنهاء الدرس
          </Button>
        )}
      </div>
    </div>
  );
}

function PaywallModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { data: refInfo } = useGetReferralInfo({ query: { enabled: open } });
  const { toast } = useToast();

  const copyLink = () => {
    if (refInfo?.referralCode) {
      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${refInfo.referralCode}`);
      toast({ title: "تم النسخ!", description: "شارك الرابط مع أصدقائك" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass p-0 border-white/10 overflow-hidden" hideCloseButton>
        <DialogTitle className="sr-only">ترقية الحساب</DialogTitle>
        
        <div className="h-32 bg-gradient-to-br from-gold/20 to-emerald/20 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <Lock className="w-12 h-12 text-white relative z-10" />
        </div>

        <div className="p-8 text-center">
          <h2 className="text-3xl font-black mb-4">انتهى الدرس المجاني</h2>
          <p className="text-muted-foreground mb-8">
            لديك خياران لمتابعة التعلم مع النخبة:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl border-emerald/20 text-center">
              <h3 className="font-bold text-lg text-emerald mb-2">١. ادعُ أصدقاءك (مجاناً)</h3>
              <p className="text-sm text-muted-foreground mb-4">ادعُ ٥ أصدقاء واحصل على ٣ أيام مجانية</p>
              
              <div className="bg-black/40 rounded-lg p-3 mb-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate ml-2" dir="ltr">
                  {refInfo ? `...register?ref=${refInfo.referralCode}` : 'جاري التحميل...'}
                </span>
                <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0 text-emerald" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>التقدم</span>
                <span>{refInfo?.referralCount || 0} / 5</span>
              </div>
              <Progress value={((refInfo?.referralCount || 0) / 5) * 100} className="h-1.5 bg-white/5 [&>div]:bg-emerald" />
            </div>

            <div className="glass-gold p-6 rounded-2xl text-center flex flex-col justify-center">
              <h3 className="font-bold text-lg text-gold mb-2">٢. اشترك الآن</h3>
              <p className="text-sm text-muted-foreground mb-6">باقات تبدأ من ١٠٠٠ ريال فقط</p>
              <Button onClick={() => setLocation("/subscription")} className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">
                عرض الباقات
              </Button>
            </div>
          </div>
          
          <Button variant="ghost" className="mt-6 text-muted-foreground" onClick={() => onOpenChange(false)}>
            العودة للرئيسية
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
