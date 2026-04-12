import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { university, skills } from "@/lib/curriculum";
import type { Subject } from "@/lib/curriculum";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { useGetLessonViews } from "@workspace/api-client-react";
import { CheckCircle2 } from "lucide-react";

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
          <p
            className="mt-3 text-sm md:text-base font-bold text-red-500 flex items-center justify-center md:justify-start gap-2"
            style={{ textShadow: "0 0 12px rgba(239,68,68,0.9), 0 0 28px rgba(239,68,68,0.5)" }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" style={{ boxShadow: "0 0 8px rgba(239,68,68,0.9)" }} />
            تصفح المنصة بالكمبيوتر إذا ستتعلم شيئاً له علاقة بالبرمجة حتى لا تواجه مشاكل مستقبلاً
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" style={{ boxShadow: "0 0 8px rgba(239,68,68,0.9)" }} />
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
      </div>
    </AppLayout>
  );
}
