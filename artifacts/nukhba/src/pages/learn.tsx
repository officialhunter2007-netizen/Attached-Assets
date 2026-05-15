import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { university, skills } from "@/lib/curriculum";
import type { Subject } from "@/lib/curriculum";
import { getSubjectName, getCategoryName } from "@/lib/curriculum-en";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { useGetLessonViews } from "@workspace/api-client-react";
import { CheckCircle2, Star, GraduationCap, Terminal, Sparkles, ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";

/* Map Tailwind color class prefix to actual hex for glow */
const colorGlowMap: Record<string, { glow: string; gradFrom: string; gradTo: string; border: string }> = {
  "blue":    { glow: "rgba(59,130,246,0.35)",  gradFrom: "#1d4ed8", gradTo: "#3b82f6", border: "rgba(59,130,246,0.5)" },
  "red":     { glow: "rgba(239,68,68,0.35)",   gradFrom: "#b91c1c", gradTo: "#ef4444", border: "rgba(239,68,68,0.5)" },
  "green":   { glow: "rgba(34,197,94,0.35)",   gradFrom: "#15803d", gradTo: "#22c55e", border: "rgba(34,197,94,0.5)" },
  "emerald": { glow: "rgba(16,185,129,0.35)",  gradFrom: "#065f46", gradTo: "#10b981", border: "rgba(16,185,129,0.5)" },
  "yellow":  { glow: "rgba(234,179,8,0.35)",   gradFrom: "#a16207", gradTo: "#eab308", border: "rgba(234,179,8,0.5)" },
  "amber":   { glow: "rgba(245,158,11,0.35)",  gradFrom: "#b45309", gradTo: "#f59e0b", border: "rgba(245,158,11,0.5)" },
  "orange":  { glow: "rgba(249,115,22,0.35)",  gradFrom: "#c2410c", gradTo: "#f97316", border: "rgba(249,115,22,0.5)" },
  "purple":  { glow: "rgba(168,85,247,0.35)",  gradFrom: "#7e22ce", gradTo: "#a855f7", border: "rgba(168,85,247,0.5)" },
  "violet":  { glow: "rgba(139,92,246,0.35)",  gradFrom: "#6d28d9", gradTo: "#8b5cf6", border: "rgba(139,92,246,0.5)" },
  "pink":    { glow: "rgba(236,72,153,0.35)",  gradFrom: "#9d174d", gradTo: "#ec4899", border: "rgba(236,72,153,0.5)" },
  "sky":     { glow: "rgba(14,165,233,0.35)",  gradFrom: "#0369a1", gradTo: "#0ea5e9", border: "rgba(14,165,233,0.5)" },
  "cyan":    { glow: "rgba(6,182,212,0.35)",   gradFrom: "#0e7490", gradTo: "#06b6d4", border: "rgba(6,182,212,0.5)" },
  "teal":    { glow: "rgba(20,184,166,0.35)",  gradFrom: "#0f766e", gradTo: "#14b8a6", border: "rgba(20,184,166,0.5)" },
  "indigo":  { glow: "rgba(99,102,241,0.35)",  gradFrom: "#4338ca", gradTo: "#6366f1", border: "rgba(99,102,241,0.5)" },
  "rose":    { glow: "rgba(244,63,94,0.35)",   gradFrom: "#be123c", gradTo: "#f43f5e", border: "rgba(244,63,94,0.5)" },
  "lime":    { glow: "rgba(132,204,22,0.35)",  gradFrom: "#4d7c0f", gradTo: "#84cc16", border: "rgba(132,204,22,0.5)" },
  "fuchsia": { glow: "rgba(217,70,239,0.35)",  gradFrom: "#86198f", gradTo: "#d946ef", border: "rgba(217,70,239,0.5)" },
};

function getColors(colorFrom: string) {
  const match = colorFrom.match(/from-([a-z]+)-/);
  const key = match?.[1] ?? "blue";
  return colorGlowMap[key] ?? colorGlowMap["blue"];
}

function SubjectProgressBadge({ subject, viewedLessonIds }: { subject: Subject; viewedLessonIds: Set<string> }) {
  const { tr } = useLang();
  const totalLessons = subject.units.reduce((sum, u) => sum + u.lessons.length, 0);
  const completedLessons = subject.units.reduce((sum, u) => {
    return sum + u.lessons.filter(l => viewedLessonIds.has(`${subject.id}__${l.id}`)).length;
  }, 0);

  if (completedLessons === 0) return null;

  const pct = Math.round((completedLessons / totalLessons) * 100);
  const isDone = completedLessons >= totalLessons;

  return (
    <div className="w-full mt-2.5">
      {isDone ? (
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold" style={{ color: "#10b981" }}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{tr.learn.completed}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            <span>{completedLessons}/{totalLessons} {tr.learn.lesson}</span>
            <span className="font-bold" style={{ color: "#f59e0b" }}>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #10B981, #F59E0B)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SubjectCard({ subject, viewedLessonIds, index = 0 }: {
  subject: Subject;
  viewedLessonIds: Set<string>;
  index?: number;
}) {
  const { tr, lang } = useLang();
  const colors = getColors(subject.colorFrom);

  return (
    <Link href={`/subject/${subject.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
        whileTap={{ scale: 0.97 }}
        className="group cursor-pointer h-full"
      >
        <div
          className="relative h-full rounded-2xl p-4 flex flex-col items-center text-center overflow-hidden"
          style={{
            background: `linear-gradient(145deg, rgba(15,18,28,0.95) 0%, rgba(10,13,22,0.98) 100%)`,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 20px ${colors.glow}, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}
        >
          {/* Corner accent */}
          <div
            className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 0% 0%, ${colors.glow} 0%, transparent 70%)`,
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 100% 100%, ${colors.glow.replace("0.35", "0.2")} 0%, transparent 70%)`,
            }}
          />

          {/* Colored top line */}
          <div
            className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${colors.gradTo}, transparent)` }}
          />

          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3 relative z-10 flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${colors.gradFrom}cc, ${colors.gradTo}cc)`,
              boxShadow: `0 4px 18px ${colors.glow}, 0 0 0 1px ${colors.border}`,
            }}
          >
            {subject.emoji}
          </div>

          <h3
            className="text-sm font-bold relative z-10 leading-snug mb-0.5"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {getSubjectName(subject.id, subject.name, lang)}
          </h3>

          {/* Arrow hint */}
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: colors.gradTo }}>
            <span className="text-[10px] font-bold">{tr.learn.startNow}</span>
            <ArrowLeft className="w-2.5 h-2.5" />
          </div>

          <SubjectProgressBadge subject={subject} viewedLessonIds={viewedLessonIds} />
        </div>
      </motion.div>
    </Link>
  );
}

export default function Learn() {
  const { data: views } = useGetLessonViews();
  const { tr, lang } = useLang();

  const viewedLessonIds = new Set<string>(
    (views ?? []).map(v => `${v.subjectId}__${v.lessonId}`)
  );

  return (
    <AppLayout>
      <div className="relative min-h-screen">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-grid-fine opacity-20" />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-72"
            style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 70%)", filter: "blur(40px)" }}
          />
          <div
            className="absolute top-32 right-0 w-80 h-80"
            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)", filter: "blur(50px)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-72 h-72"
            style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.05) 0%, transparent 70%)", filter: "blur(50px)" }}
          />
        </div>

        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-7xl">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 md:mb-12 text-center"
          >
            <div
              className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "#f59e0b",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {tr.learn.badge}
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
              {tr.learn.title}{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #F59E0B, #10B981)" }}
              >
                {tr.learn.titleHighlight}
              </span>
            </h1>
            <p className="text-sm md:text-base max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              {tr.learn.desc}
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="university" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6 md:mb-10"
            >
              <TabsList
                className="grid grid-cols-2 h-auto p-1.5 rounded-2xl w-full max-w-sm mx-auto md:mx-0 md:w-auto md:inline-grid"
                style={{
                  background: "rgba(10,13,20,0.85)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                <TabsTrigger
                  value="university"
                  className="py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 justify-center data-[state=active]:bg-white/8 data-[state=active]:text-gold"
                >
                  <GraduationCap className="w-4 h-4" />
                  {tr.learn.tabUniversity}
                </TabsTrigger>
                <TabsTrigger
                  value="skills"
                  className="py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 justify-center data-[state=active]:bg-white/8 data-[state=active]:text-gold"
                >
                  <Terminal className="w-4 h-4" />
                  {tr.learn.tabSkills}
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* University Tab */}
            <TabsContent value="university" className="focus-visible:outline-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {university.map((subject, i) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    viewedLessonIds={viewedLessonIds}
                    index={i}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="focus-visible:outline-none space-y-10 md:space-y-14">
              {skills.map((category, catIdx) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.08 }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="h-7 w-1 rounded-full flex-shrink-0"
                      style={{
                        background: "linear-gradient(180deg, #6366f1, #06B6D4)",
                        boxShadow: "0 0 10px rgba(99,102,241,0.5)",
                      }}
                    />
                    <h2 className="text-lg md:text-xl font-bold">{getCategoryName(category.id, category.name, lang)}</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {category.subjects.map((subject, i) => (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        viewedLessonIds={viewedLessonIds}
                        index={i}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>

          {/* Testimonials */}
          <div className="mt-16 md:mt-24 pt-10 md:pt-14" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-10"
            >
              <h2 className="text-xl md:text-3xl font-black mb-2">{tr.learn.testimonialsTitle}</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {tr.learn.testimonialsDesc}
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
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
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl p-4 md:p-5 flex flex-col relative overflow-hidden"
                  style={{
                    background: "rgba(12,15,26,0.8)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}
                >
                  <div className="absolute top-3 left-3 text-5xl font-black leading-none pointer-events-none select-none"
                    style={{ color: "rgba(245,158,11,0.06)" }}>
                    "
                  </div>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: review.stars }).map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    {Array.from({ length: 5 - review.stars }).map((_, si) => (
                      <Star key={`e${si}`} className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.12)" }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
                    "{review.text}"
                  </p>
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>{review.name}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
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
