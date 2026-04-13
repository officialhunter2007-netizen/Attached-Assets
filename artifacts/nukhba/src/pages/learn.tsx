import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { university, skills } from "@/lib/curriculum";
import type { Subject } from "@/lib/curriculum";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { useGetLessonViews } from "@workspace/api-client-react";
import { CheckCircle2, Star, Quote } from "lucide-react";

function SubjectProgressBadge({ subject, viewedLessonIds }: { subject: Subject; viewedLessonIds: Set<string> }) {
  const totalLessons = subject.units.reduce((sum, u) => sum + u.lessons.length, 0);
  const completedLessons = subject.units.reduce((sum, u) => {
    return sum + u.lessons.filter(l => viewedLessonIds.has(`${subject.id}__${l.id}`)).length;
  }, 0);

  if (completedLessons === 0) return null;

  const pct = Math.round((completedLessons / totalLessons) * 100);
  const isDone = completedLessons >= totalLessons;

  return (
    <div className="w-full mt-2">
      {isDone ? (
        <div className="flex items-center justify-center gap-1 text-xs text-emerald font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>مكتمل</span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedLessons}/{totalLessons} درس</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-emerald to-emerald/60 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const { data: views } = useGetLessonViews();

  const viewedLessonIds = new Set<string>(
    (views ?? []).map(v => `${v.subjectId}__${v.lessonId}`)
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-12 text-center md:text-right">
          <h1 className="text-4xl font-black mb-4">مسارات التعلم</h1>
          <p className="text-xl text-muted-foreground">اختر مسارك وابدأ التعلم المخصص مع معلمك الذكي</p>
          <p className="mt-3 text-sm text-muted-foreground">
            يمكنك تصفح المنصة من الهاتف أو الكمبيوتر
          </p>
        </div>

        <Tabs defaultValue="university" className="w-full">
          <TabsList className="w-full md:w-auto flex md:inline-flex h-auto p-1 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl mb-10">
            <TabsTrigger value="university" className="flex-1 md:px-8 py-3 rounded-xl text-lg font-bold data-[state=active]:bg-emerald data-[state=active]:text-white transition-all">الجامعي</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1 md:px-8 py-3 rounded-xl text-lg font-bold data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all">المهارات</TabsTrigger>
          </TabsList>

          {/* University Tab */}
          <TabsContent value="university" className="focus-visible:outline-none">
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
            >
              {university.map(subject => (
                <Link key={subject.id} href={`/subject/${subject.id}`}>
                  <motion.div variants={item} className="group relative block h-full">
                    <div className="glass p-6 rounded-3xl border-white/5 hover:border-emerald/30 transition-all h-full flex flex-col items-center text-center">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                        {subject.emoji}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{subject.name}</h3>
                      <SubjectProgressBadge subject={subject} viewedLessonIds={viewedLessonIds} />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="focus-visible:outline-none space-y-12">
            {skills.map((category) => (
              <div key={category.id}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-2 h-8 bg-blue-500 rounded-full" />
                  {category.name}
                </h2>
                <motion.div 
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  {category.subjects.map(subject => (
                    <Link key={subject.id} href={`/subject/${subject.id}`}>
                      <motion.div variants={item} className="group relative block h-full">
                        <div className="glass p-6 rounded-3xl border-white/5 hover:border-blue-500/30 transition-all h-full flex flex-col items-center text-center">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl mb-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                            {subject.emoji}
                          </div>
                          <h3 className="text-lg font-bold mb-2">{subject.name}</h3>
                          <SubjectProgressBadge subject={subject} viewedLessonIds={viewedLessonIds} />
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </motion.div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="mt-16 border-t border-white/5 pt-12">
          <div className="text-center mb-8">
            <Quote className="w-8 h-8 text-gold/30 mx-auto mb-3 rotate-180" />
            <h2 className="text-2xl font-black mb-2">كلام طلاب سبقوك</h2>
            <p className="text-sm text-muted-foreground">تجارب من طلاب بدأوا مثلك وحققوا تقدم حقيقي</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "خالد ص.", subject: "البرمجة", text: "كنت أضيع وقت كثير أدور شروحات هنا وهناك. لما بدأت مع نُخبة حسيت إن التعلم صار منظم وكل جلسة تبني على اللي قبلها. الفرق واضح.", stars: 5 },
              { name: "ريم ع.", subject: "قواعد البيانات", text: "أنا طالبة سنة ثالثة وكانت قواعد البيانات أصعب مادة عندي. المعلم الذكي شرحها لي بطريقة بسيطة وربطها بأمثلة من حياتنا. حرفياً أنقذني قبل الاختبار.", stars: 5 },
              { name: "عمار ح.", subject: "تطوير الويب", text: "أحلى شي إنك تقدر تسأل أي سؤال مهما كان بسيط وما أحد يحكم عليك. المعلم يجاوبك بصبر ويعطيك أمثلة عملية. بديت أبني مشاريعي الخاصة.", stars: 5 },
              { name: "منى أ.", subject: "الخوارزميات", text: "كنت أشوف الخوارزميات شي معقد ومستحيل. بعد شهر مع نُخبة صرت أفهم كيف أحلل المسألة وأختار الحل المناسب. التقدم اللي حققته ما كنت أتخيله.", stars: 4 },
              { name: "باسم ن.", subject: "الشبكات", text: "الشي المميز إن المعلم يعرف مستواك ويبدأ معك من نقطتك. ما يفترض إنك فاهم شي ما تعرفه. هذا اللي خلاني أستمر وما أترك.", stars: 5 },
              { name: "هدى م.", subject: "البرمجة بلغة Python", text: "بدأت من صفر حرفياً وما كنت أعرف شي عن البرمجة. الحين أقدر أكتب برامج كاملة لحالي. الـ ١٥ رسالة المجانية كانت كافية أتأكد إن المنصة تستاهل.", stars: 5 },
            ].map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="glass rounded-2xl p-5 border border-white/5 flex flex-col"
              >
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: review.stars }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-gold fill-gold" />
                  ))}
                  {Array.from({ length: 5 - review.stars }).map((_, si) => (
                    <Star key={`e${si}`} className="w-3.5 h-3.5 text-white/15" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed flex-1 mb-3">"{review.text}"</p>
                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold">{review.name}</span>
                  <span className="text-[10px] text-muted-foreground">{review.subject}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
