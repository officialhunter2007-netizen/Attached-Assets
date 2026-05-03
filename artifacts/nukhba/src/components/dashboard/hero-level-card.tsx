import { Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DashboardCard } from "./dashboard-card";
import { getLevelInfo } from "@/lib/levels";

export function HeroLevelCard({ points }: { points: number }) {
  const info = getLevelInfo(points);
  return (
    <DashboardCard accent="gold" padding="p-6 md:p-8" className="lg:col-span-2">
      <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(245,158,11,0.12), transparent 65%)" }}
      />
      <div className="absolute top-0 left-6 right-6 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)" }}
      />
      <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">المستوى الحالي</p>
          <h2 className={`text-3xl md:text-4xl font-black ${info.tier.colorClass}`}>{info.tier.name}</h2>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted-foreground mb-1">مجموع النقاط</p>
          <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            {points.toLocaleString("ar-EG")} <Trophy className="w-5 h-5 md:w-6 md:h-6 text-gold" />
          </div>
        </div>
      </div>
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{points.toLocaleString("ar-EG")} نقطة</span>
          <span>
            {info.isMaxLevel
              ? "🏆 وصلت للقمة!"
              : `${info.max.toLocaleString("ar-EG")} نقطة للمستوى التالي`}
          </span>
        </div>
        <Progress value={info.progress} className={`h-3 bg-white/5 ${info.tier.barClass}`} />
      </div>
    </DashboardCard>
  );
}
