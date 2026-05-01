import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { university, skills } from "@/lib/curriculum";
import type { Subject } from "@/lib/curriculum";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { useGetLessonViews } from "@workspace/api-client-react";
import { CheckCircle2, Star, Quote, GraduationCap, Terminal, Sparkles } from "lucide-react";

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
            <span className="font-bold text-gold">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #10B981, #F59E0B)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Subject card ─── */
function SubjectCard({ subject, viewedLessonIds, accentColor = "#F59E0B" }: {
  subject: Subject;
  viewedLessonIds: Set<string>;
  accentColor?: string;
}) {
  return (
    <Link href={`/subject/${subject.id}`}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.95 },
          show: { opacity: 1, y: 0, scale: 1 },
        }}
        whileHover={{ y: -6, scale: 1.03 }}
        className="group relative h-full cursor-pointer"
      >
        <div
          className="relative h-full rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden transition-all duration-300"
          style={{
            background: "rgba(10,13,20,0.75)",
            border: `1px solid rgba(255,255,255,0.07)`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          {/* Hover glow */}
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentColor}10, transparent)` }}
          />
          {/* Top border glow on hover */}
          <div
            className="absolute top-0 left-1/4 right-1/4 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }}
          />

          {/* Emoji icon */}
          <motion.div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl mb-4 relative z-10`}
            whileHover={{ scale: 1.15, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 20px ${accentColor}20` }}
          >
            {subject.emoji}
          </motion.div>

          <h3 className="text-base font-bold mb-2 relative z-10 leading-snug">{subject.name}</h3>
          <SubjectProgressBadge subject={subject} viewedLessonIds={viewedLessonIds} />
        </div>
      </motion.div>
    </Link>
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
      transition: { staggerChildren: 0.07 }
    }
  };

  return (
    <AppLayout>
      <div className="relative min-h-screen">
        {/* Background */}
        <div className="absolute inset-0 bg-grid-fine opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        <div className="relative container mx-auto px-4 py-12 max-w-7xl">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center md:text-right"
          >
            <div className="inline-flex items-center gap-2 mb-3 text-sm font-bold text-gold">
              <Sparkles className="w-4 h-4" />
              اختر مسارك التعليمي
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              مسارات{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #F59E0B, #10B981)" }}
              >
                التعلم
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              اختر مسارك وابدأ التعلم المخصص مع معلّمك الذكي الذي يعرفك ويتذكر تقدّمك
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="university" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TabsList
                className="flex md:inline-flex h-auto p-1.5 rounded-2xl mb-10 w-full md:w-auto"
                style={{
                  background: "rgba(10,13,20,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <TabsTrigger
                  value="university"
                  className="flex-1 md:px-8 py-3 rounded-xl text-base font-bold transition-all data-[state=active]:shadow-lg flex items-center gap-2 justify-center"
                  style={{
                    ["--tw-data-active-bg" as string]: "transparent",
                  }}
                >
                  <GraduationCap className="w-4 h-4" />
                  الجامعي
                </TabsTrigger>
                <TabsTrigger
                  value="skills"
                  className="flex-1 md:px-8 py-3 rounded-xl text-base font-bold transition-all data-[state=active]:shadow-lg flex items-center gap-2 justify-center"
                >
                  <Terminal className="w-4 h-4" />
                  المهارات
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* University Tab */}
            <TabsContent value="university" className="focus-visible:outline-none">
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5"
              >
                {university.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    viewedLessonIds={viewedLessonIds}
                    accentColor="#10B981"
                  />
                ))}
              </motion.div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="focus-visible:outline-none space-y-14">
              {skills.map((category, catIdx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{
                        background: "linear-gradient(180deg, #3B82F6, #06B6D4)",
                        boxShadow: "0 0 12px rgba(59,130,246,0.5)",
                      }}
                    />
                    <h2 className="text-xl md:text-2xl font-bold">{category.name}</h2>
                  </div>
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5"
                  >
                    {category.subjects.map(subject => (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        viewedLessonIds={viewedLessonIds}
                        accentColor="#3B82F6"
                      />
                    ))}
                  </motion.div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>

          {/* Testimonials */}
          <div className="mt-20 pt-14 border-t border-white/6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <Quote className="w-8 h-8 mx-auto mb-3 rotate-180" style={{ color: "rgba(245,158,11,0.3)" }} />
              <h2 className="text-2xl md:text-3xl font-black mb-2">كلام طلاب سبقوك</h2>
              <p className="text-sm text-muted-foreground">تجارب من طلاب بدأوا مثلك وحققوا تقدّماً حقيقياً</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { name: "خالد ص.", subject: "البرمجة", text: "كنت أضيع وقتاً كثيراً أدوّر شروحات. لما بدأت مع نُخبة، التعلم صار منظماً وكل جلسة تبني على اللي قبلها.", stars: 5 },
                { name: "ريم ع.", subject: "قواعد البيانات", text: "المعلم الذكي شرحها بطريقة بسيطة وربطها بأمثلة من حياتنا. حرفياً أنقذني قبل الاختبار.", stars: 5 },
                { name: "عمار ح.", subject: "تطوير الويب", text: "أحلى شي إنك تقدر تسأل أي سؤال مهما كان بسيط. بديت أبني مشاريعي الخاصة بعد أسابيع.", stars: 5 },
                { name: "منى أ.", subject: "الخوارزميات", text: "بعد شهر مع نُخبة، صرت أفهم كيف أحلل المسألة وأختار الحل المناسب. التقدم الذي حققته كان مفاجأة.", stars: 4 },
                { name: "باسم ن.", subject: "الشبكات", text: "المعلم يعرف مستواك ويبدأ معك من نقطتك. ما يفترض إنك فاهم شي ما تعرفه — هذا اللي خلاني أستمر.", stars: 5 },
                { name: "هدى م.", subject: "Python", text: "بدأت من صفر ما أعرف شي عن البرمجة. الآن أكتب برامج كاملة. الـ ١٥ رسالة المجانية أثبتت إن المنصة تستاهل.", stars: 5 },
              ].map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl p-5 flex flex-col relative overflow-hidden"
                  style={{
                    background: "rgba(10,13,20,0.7)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Quote mark */}
                  <div className="absolute top-3 left-4 text-4xl font-black leading-none pointer-events-none select-none"
                    style={{ color: "rgba(245,158,11,0.07)" }}
                  >
                    "
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: review.stars }).map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 fill-gold text-gold" />
                    ))}
                    {Array.from({ length: 5 - review.stars }).map((_, si) => (
                      <Star key={`e${si}`} className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.12)" }} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed flex-1 mb-4">"{review.text}"</p>
                  <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-xs font-bold">{review.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      {review.subject}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
