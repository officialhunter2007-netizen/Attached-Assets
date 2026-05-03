import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Activity, ArrowRight, Sparkles, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";

type LedgerRow = {
  id: number;
  createdAt: string;
  delta: number;
  balanceAfter: number | null;
  reason: string;
  source: string;
  note: string | null;
  subjectId: string | null;
  subjectSubId: number | null;
};

type Summary = {
  hasActiveSub: boolean;
  canUseGems: boolean;
  totalDailyRemaining: number;
  totalDailyLimit: number;
  totalBalance: number;
  activeSubjectCount: number;
  subjects: Array<{
    subjectId: string;
    subjectName: string | null;
    dailyRemaining: number;
    gemsDailyLimit: number;
    gemsBalance: number;
    gemsExpiresAt: string;
  }>;
  source: "per-subject" | "legacy" | "none";
};

const REASON_LABEL: Record<string, string> = {
  grant: "منح",
  debit: "خصم",
  refund: "استرداد",
  adjust: "تعديل",
  forfeit: "إسقاط منتصف الليل",
  extend: "تمديد",
};

const SOURCE_LABEL: Record<string, string> = {
  approve_request: "اعتماد طلب اشتراك",
  activate_card: "بطاقة تفعيل",
  admin_grant: "منح من الإدارة",
  admin_refund: "استرداد إداري",
  admin_adjust: "تعديل إداري",
  ai_teach: "جلسة مع المعلم الذكي",
  ai_lesson: "توليد درس",
  ai_image: "صورة تعليمية",
  platform_help: "المساعد العام",
  daily_rollover: "تجديد يومي",
  subscription_extend: "تمديد اشتراك",
  subscription_revoke: "إلغاء اشتراك",
};

export default function UsagePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [s, h] = await Promise.all([
          fetch("/api/subscriptions/gems-balance-summary", { credentials: "include" }).then(r => r.json()),
          fetch("/api/subscriptions/gems-history?limit=50", { credentials: "include" }).then(r => r.json()),
        ]);
        if (!alive) return;
        setSummary(s);
        setHistory(Array.isArray(h) ? h : []);
      } catch {
        /* fail-soft — leave UI in empty state */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const grouped = useMemo(() => {
    // Group ledger rows by Yemen-day for the activity feed.
    const byDay = new Map<string, LedgerRow[]>();
    for (const r of history) {
      const day = new Date(r.createdAt).toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(r);
    }
    return Array.from(byDay.entries());
  }, [history]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              استهلاك الجواهر
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              متابعة شفّافة لكل عملية على رصيدك — منح، خصم، استرداد، أو إسقاط منتصف الليل.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-white/10">
              <ArrowRight className="w-4 h-4 ml-1" /> لوحتي
            </Button>
          </Link>
        </div>

        {/* Per-subject snapshot */}
        <section className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5 space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> الاشتراكات النشطة
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل…</p>
          ) : !summary?.hasActiveSub ? (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>لا توجد اشتراكات نشطة حالياً.</p>
              <Link href="/subscription">
                <Button size="sm" className="gradient-gold text-primary-foreground">اشترك الآن</Button>
              </Link>
            </div>
          ) : summary.subjects.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-black/30 p-3 flex items-center justify-between text-sm">
              <span>اشتراك عام (قديم)</span>
              <span className="text-emerald-400 font-bold">
                {summary.totalDailyRemaining.toLocaleString("ar-EG")} / {summary.totalDailyLimit.toLocaleString("ar-EG")}
              </span>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {summary.subjects.map(s => {
                const dailyPct = s.gemsDailyLimit > 0 ? Math.round(((s.gemsDailyLimit - s.dailyRemaining) / s.gemsDailyLimit) * 100) : 0;
                return (
                  <div key={s.subjectId} className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm truncate">{s.subjectName || s.subjectId}</span>
                      <span className="text-xs text-muted-foreground">رصيد: {s.gemsBalance.toLocaleString("ar-EG")}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      اليوم: {(s.gemsDailyLimit - s.dailyRemaining).toLocaleString("ar-EG")} / {s.gemsDailyLimit.toLocaleString("ar-EG")}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${dailyPct}%` }} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ينتهي: {new Date(s.gemsExpiresAt).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Activity feed */}
        <section className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5 space-y-3">
          <h2 className="text-base font-bold">آخر العمليات</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عمليات بعد.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, rows]) => (
                <div key={day} className="space-y-2">
                  <div className="text-xs text-muted-foreground font-bold">{day}</div>
                  <div className="space-y-1">
                    {rows.map(r => (
                      <div key={r.id} className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-xs">
                            {SOURCE_LABEL[r.source] ?? r.source} · {REASON_LABEL[r.reason] ?? r.reason}
                          </div>
                          {r.note && (
                            <div className="text-[11px] text-muted-foreground truncate" title={r.note}>{r.note}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-bold ${r.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {r.delta > 0 ? "+" : ""}{r.delta.toLocaleString("ar-EG")}
                          </div>
                          {r.balanceAfter != null && (
                            <div className="text-[10px] text-muted-foreground">
                              الرصيد: {r.balanceAfter.toLocaleString("ar-EG")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
