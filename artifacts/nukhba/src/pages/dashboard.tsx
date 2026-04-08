import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { useGetLessonViews, useGetReferralInfo } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Target, Users, Crown, ChevronLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: views } = useGetLessonViews();
  const { data: refInfo } = useGetReferralInfo();

  const totalLessons = views?.length || 0;
  const challengesAnswered = views?.filter(v => v.challengeAnswered).length || 0;
  const points = user?.points || 0;

  // Level Logic
  let level = "مبتدئ";
  let maxPoints = 100;
  let levelColor = "text-zinc-400";
  if (points > 1500) { level = "أسطورة"; maxPoints = points + 1000; levelColor = "text-purple-400"; }
  else if (points > 700) { level = "نُخبة"; maxPoints = 1500; levelColor = "text-emerald"; }
  else if (points > 300) { level = "متقدم"; maxPoints = 700; levelColor = "text-gold"; }
  else if (points > 100) { level = "متعلم"; maxPoints = 300; levelColor = "text-blue-400"; }

  const progress = Math.min(100, (points / maxPoints) * 100);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-black mb-8">لوحة القيادة</h1>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Level Card */}
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

          {/* Stats Grid */}
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Lessons */}
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

          {/* Side Column */}
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
      </div>
    </AppLayout>
  );
}
