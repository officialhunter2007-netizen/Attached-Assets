import { Flame, BookOpen, Target } from "lucide-react";
import { DashboardCard, AccentVariant } from "./dashboard-card";

function Tile({
  accent, icon, value, label,
}: { accent: AccentVariant; icon: React.ReactNode; value: number; label: string }) {
  return (
    <DashboardCard accent={accent} padding="p-3 sm:p-4 md:p-5" className="min-h-[100px] sm:min-h-[112px]">
      <div className="flex flex-col items-center justify-center text-center gap-1 sm:gap-1.5">
        <div className="opacity-90">{icon}</div>
        <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-none">{value.toLocaleString("ar-EG")}</div>
        <div className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground leading-tight">{label}</div>
      </div>
    </DashboardCard>
  );
}

export function StatTiles({
  streakDays, lessonsCompleted, challengesAnswered,
}: { streakDays: number; lessonsCompleted: number; challengesAnswered: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
      <Tile accent="amber"   icon={<Flame    className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />}   value={streakDays}         label="أيام متتالية" />
      <Tile accent="blue"    icon={<BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />}    value={lessonsCompleted}   label="دروس مكتملة" />
      <Tile accent="emerald" icon={<Target   className="w-6 h-6 sm:w-7 sm:h-7 text-emerald" />}     value={challengesAnswered} label="تحديات مجابة" />
    </div>
  );
}
