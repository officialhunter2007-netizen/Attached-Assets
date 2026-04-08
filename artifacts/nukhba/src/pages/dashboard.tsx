import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useGetLessonViews, useGetReferralInfo } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Users, Crown, ChevronLeft, BookOpen, FileText, Lock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function Dashboard() {
  const { user } = useAuth();
  const { data: views } = useGetLessonViews();
  const { data: refInfo } = useGetReferralInfo();
  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lesson-summaries", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));
  }, []);

  const totalLessons = views?.length || 0;
  const challengesAnswered = views?.filter(v => v.challengeAnswered).length || 0;
  const points = user?.points || 0;

  const hasSubscriptionAccess = user?.nukhbaPlan
    && user?.subscriptionExpiresAt
    && new Date(user.subscriptionExpiresAt) > new Date()
    && (user?.messagesUsed ?? 0) < (user?.messagesLimit ?? 0);
  const hasReferralAccess = user?.referralAccessUntil
    && new Date(user.referralAccessUntil) > new Date();
  const isBlocked = user?.firstLessonComplete && !hasSubscriptionAccess && !hasReferralAccess;

  let level = "مبتدئ";
  let maxPoints = 100;
  let levelColor = "text-zinc-400";
  if (points > 1500) { level = "أسطورة"; maxPoints = points + 1000; levelColor = "text-purple-400"; }
  else if (points > 700) { level = "نُخبة"; maxPoints = 1500; levelColor = "text-emerald"; }
  else if (points > 300) { level = "متقدم"; maxPoints = 700; levelColor = "text-gold"; }
  else if (points > 100) { level = "متعلم"; maxPoints = 300; levelColor = "text-blue-400"; }

  const progress = Math.min(100, (points / maxPoints) * 100);

  if (isBlocked) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="glass p-6 rounded-3xl border-gold/20 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">انتهت جلستك المجانية</h2>
              <p className="text-sm text-muted-foreground">اشترك الآن للوصول لجميع الميزات، أو ادعُ 5 أصدقاء للحصول على 3 أيام مجاناً</p>
            </div>
            <Link href="/subscription">
              <Button className="gradient-gold text-primary-foreground font-bold shrink-0">اشترك الآن</Button>
            </Link>
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
                <span>{maxPoints} نقطة للمستوى التالي</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/5 [&>div]:bg-gold" />
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
            <div className="glass p-6 rounded-3xl border-emerald/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald/10 rounded-br-full -z-10" />
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald" />
                سفير نُخبة
              </h3>
              <p className="text-sm text-muted-foreground mb-4">ادعُ ٥ أصدقاء واحصل على ٣ أيام مجانية من منصة نُخبة</p>
              <div className="mb-2 flex justify-between text-xs text-emerald font-bold">
                <span>{refInfo?.referralCount || 0} أصدقاء سجلوا</span>
                <span>الهدف: {refInfo?.referralGoal || 5}</span>
              </div>
              <Progress value={((refInfo?.referralCount || 0) / (refInfo?.referralGoal || 5)) * 100} className="h-2 bg-black/40 [&>div]:bg-emerald mb-4" />
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/register?ref=${refInfo?.referralCode}`);
              }}>انسخ رابط الدعوة</Button>
            </div>

            <div className="glass p-6 rounded-3xl border-gold/20">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold" />
                حالة الاشتراك
              </h3>
              {user?.nukhbaPlan ? (
                <div>
                  <div className="text-2xl font-black text-gold mb-2">{user.nukhbaPlan}</div>
                  <p className="text-sm text-emerald flex items-center gap-1"><Target className="w-4 h-4"/> مفعل وفعال</p>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">أنت على الباقة المجانية</p>
                  <Link href="/subscription">
                    <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">رقي حسابك الآن</Button>
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
