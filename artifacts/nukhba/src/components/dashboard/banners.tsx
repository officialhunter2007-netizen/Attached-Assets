import { Link } from "wouter";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "./dashboard-card";
import { SubjectSub } from "./types";
import { useLang } from "@/lib/lang-context";

export function ExpiredSubsBanner({ expiredSubs }: { expiredSubs: SubjectSub[] }) {
  const { tr, lang } = useLang();
  const t = tr.banners;
  if (expiredSubs.length === 0) return null;
  return (
    <DashboardCard accent="red" padding="p-5" className="mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-red-300 text-base mb-1">{t.expiredTitle}</h3>
          <div className="space-y-1 mb-3">
            {expiredSubs.map(s => (
              <p key={s.id} className="text-sm text-red-200/70">
                <span className="font-bold text-red-300">{s.subjectName || s.subjectId}</span>
                {" — "}{t.expiredExpiry}{" "}
                {new Date(s.expiresAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            ))}
          </div>
          <p className="text-sm text-red-200/60 mb-3">{t.expiredInfo}</p>
          <Link href="/subscription">
            <Button size="sm" className="gradient-gold text-primary-foreground font-bold rounded-xl shadow-lg shadow-gold/20">
              {t.expiredBtn}
            </Button>
          </Link>
        </div>
      </div>
    </DashboardCard>
  );
}

export function ExpiringSoonBanner({ expiringSubs }: { expiringSubs: SubjectSub[] }) {
  const { tr } = useLang();
  const t = tr.banners;
  if (expiringSubs.length === 0) return null;
  return (
    <DashboardCard accent="yellow" padding="p-4" className="mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-yellow-300 text-sm">{t.expiringTitle}</h4>
          <p className="text-xs text-yellow-200/60 truncate">
            {expiringSubs.map(s => s.subjectName || s.subjectId).join("، ")} {t.expiringSuffix}
          </p>
        </div>
        <Link href="/subscription">
          <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs rounded-xl">
            {t.expiringBtn}
          </Button>
        </Link>
      </div>
    </DashboardCard>
  );
}

export function LockedHero() {
  const { tr } = useLang();
  const t = tr.banners;
  return (
    <DashboardCard accent="gold" padding="p-6 md:p-8" className="mb-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
          <Lock className="w-7 h-7 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-xl md:text-2xl text-gold mb-1">{t.lockedTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {t.lockedDesc}
          </p>
          <Link href="/subscription">
            <Button className="gradient-gold text-primary-foreground font-bold rounded-xl shadow-lg shadow-gold/20 px-6">
              {t.lockedBtn}
            </Button>
          </Link>
        </div>
      </div>
    </DashboardCard>
  );
}
