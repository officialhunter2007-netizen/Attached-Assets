import { Link } from "wouter";
import { BookOpen, ChevronLeft } from "lucide-react";
import { DashboardCard } from "./dashboard-card";

interface LessonView {
  id: number | string;
  subjectId: string;
  unitId: string;
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
}

export function RecentLessonsList({ views, locked = false }: { views: LessonView[]; locked?: boolean }) {
  return (
    <DashboardCard accent="gold" padding="p-0">
      {views.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          لم تبدأ أي درس بعد. {!locked && (<Link href="/learn" className="text-gold font-bold">ابدأ الآن!</Link>)}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {views.slice(0, 5).map(view => {
            const href = locked
              ? "/subscription"
              : `/lesson/${view.subjectId}/${view.unitId}/${view.lessonId}`;
            return (
              <Link key={view.id} href={href}>
                <div className="px-5 md:px-6 py-4 min-h-[64px] hover:bg-white/5 transition-colors flex items-center justify-between gap-3 group cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm md:text-base truncate group-hover:text-gold transition-colors">
                        {view.lessonTitle}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{view.subjectName}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
