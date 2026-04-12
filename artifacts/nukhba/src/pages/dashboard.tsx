import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Crown, ChevronLeft, BookOpen, FileText, Lock, ChevronDown, ChevronUp, Loader2, Monitor, X, AlertTriangle, Clock } from "lucide-react";
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

interface SubjectSub {
  id: number;
  subjectId: string;
  subjectName: string | null;
  planType: string;
  messagesUsed: number;
  messagesLimit: number;
  expiresAt: string;
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
  const [mySubjectSubs, setMySubjectSubs] = useState<SubjectSub[]>([]);
  const [showMobileCodingWarning, setShowMobileCodingWarning] = useState(false);

  useEffect(() => {
    fetch("/api/lesson-summaries", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));

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

  const totalLessons = views?.length || 0;
  const challengesAnswered = views?.filter(v => v.challengeAnswered).length || 0;
  const points = user?.points || 0;

  const now = new Date();
  const activeSubjectSubs = mySubjectSubs.filter(s => new Date(s.expiresAt) > now && s.messagesUsed < s.messagesLimit);
  const hasAnyActiveSubjectSub = activeSubjectSubs.length > 0;
  const isBlocked = user?.firstLessonComplete && !hasAnyActiveSubjectSub;

  const expiredSubs = mySubjectSubs.filter(s => new Date(s.expiresAt) <= now);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiringSoonSubs = activeSubjectSubs.filter(s => new Date(s.expiresAt) <= twoDaysFromNow);

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
                  <div>🟤 برونز — ٣٠ رسالة / ١٤ يوم</div>
                  <div>⚪ فضة — ٦٠ رسالة / ١٤ يوم</div>
                  <div>🟡 ذهب — ١٠٠ رسالة / ١٤ يوم</div>
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-black mb-8">لوحة القيادة</h1>

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

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass p-8 rounded-3xl border-white/5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-full blur-2xl bg-current ${levelColor}`} />
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-muted-foreground mb-1">المستوى الحالي</p>
                <h2 className={`text-4xl font-black ${levelColor}`}>{level}</h2>
              </div>
              <div className="text-left">
                <p className="text-muted-foreground mb-1">مجموع النقاط</p>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {points} <Trophy className="w-6 h-6 text-gold" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{points} نقطة</span>
                <span>{isMaxLevel ? "🏆 وصلت للقمة!" : `${maxPoints} نقطة للمستوى التالي`}</span>
              </div>
              <Progress value={progress} className={`h-3 bg-white/5 ${isMaxLevel ? "[&>div]:bg-purple-500" : "[&>div]:bg-gold"}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-3xl border-white/5 flex flex-col justify-center items-center text-center">
              <Flame className="w-8 h-8 text-orange-500 mb-3" />
              <div className="text-3xl font-bold mb-1">{user?.streakDays || 0}</div>
              <div className="text-sm text-muted-foreground">أيام متتالية</div>
            </div>
            <div className="glass p-6 rounded-3xl border-white/5 flex flex-col justify-center items-center text-center">
              <BookOpen className="w-8 h-8 text-blue-400 mb-3" />
              <div className="text-3xl font-bold mb-1">{totalLessons}</div>
              <div className="text-sm text-muted-foreground">دروس مكتملة</div>
            </div>
            <div className="glass p-6 rounded-3xl border-white/5 flex flex-col justify-center items-center text-center col-span-2">
              <Target className="w-8 h-8 text-emerald mb-3" />
              <div className="text-3xl font-bold mb-1">{challengesAnswered}</div>
              <div className="text-sm text-muted-foreground">تحديات مجابة</div>
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
              {activeSubjectSubs.length > 0 ? (
                <div>
                  <div className="text-lg font-black text-gold mb-2">{activeSubjectSubs.length} {activeSubjectSubs.length === 1 ? "اشتراك نشط" : "اشتراكات نشطة"}</div>
                  <div className="space-y-2 mb-3">
                    {activeSubjectSubs.slice(0, 3).map(s => (
                      <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>{s.subjectName || s.subjectId}</span>
                        <span className="text-emerald">{s.messagesLimit - s.messagesUsed} رسالة متبقية</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-emerald flex items-center gap-1"><Target className="w-4 h-4"/> مفعل وفعال</p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">لا توجد اشتراكات نشطة</p>
                  <Link href="/subscription">
                    <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">اشترك الآن</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
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
    </AppLayout>
  );
}
