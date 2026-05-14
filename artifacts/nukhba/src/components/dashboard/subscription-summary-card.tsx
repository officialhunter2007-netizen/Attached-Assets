import { Link } from "wouter";
import { Crown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "./dashboard-card";
import { SubjectSub } from "./types";
import { useLang } from "@/lib/lang-context";

export function SubscriptionSummaryCard({
  usableSubs, locked = false,
}: { usableSubs: SubjectSub[]; locked?: boolean }) {
  const { tr, lang } = useLang();
  const t = tr.subCard;
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  return (
    <DashboardCard accent="gold" padding="p-6">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-gold" />
        {t.title}
      </h3>
      {usableSubs.length > 0 ? (
        <div>
          <div className="text-lg font-black text-gold mb-3">
            {usableSubs.length.toLocaleString(locale)} {usableSubs.length === 1 ? t.activeSingle : t.activeMulti}
          </div>
          <div className="space-y-2 mb-3">
            {usableSubs.slice(0, 3).map(s => {
              const isGemWallet = typeof s.gemsBalance === "number";
              const remaining = isGemWallet
                ? Math.max(0, s.gemsBalance ?? 0)
                : Math.max(0, s.messagesLimit - s.messagesUsed);
              const label = isGemWallet ? t.gemsLeft : t.msgsLeft;
              return (
                <div key={s.id} className="text-xs text-muted-foreground flex items-center justify-between gap-3">
                  <span className="truncate">{s.subjectName || s.subjectId}</span>
                  <span className="text-emerald shrink-0">
                    {remaining.toLocaleString(locale)} 💎 {label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-emerald flex items-center gap-1">
            <Target className="w-4 h-4" /> {t.active}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {locked ? t.noSubLocked : t.noSub}
          </p>
          <Link href="/subscription">
            <Button className="w-full gradient-gold text-primary-foreground font-bold shadow-lg shadow-gold/20">
              {locked ? t.renewBtn : t.subscribeBtn}
            </Button>
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}
