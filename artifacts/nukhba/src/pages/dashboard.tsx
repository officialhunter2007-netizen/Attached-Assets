import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Library, FlaskConical, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import { useGetLessonViews } from "@workspace/api-client-react";
import { getSubjectById } from "@/lib/curriculum";

import { SectionHeading, SectionState } from "@/components/dashboard/dashboard-card";
import { useDashboardFetch } from "@/components/dashboard/use-dashboard-fetch";
import { HeroLevelCard } from "@/components/dashboard/hero-level-card";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { SubscriptionSummaryCard } from "@/components/dashboard/subscription-summary-card";
import { RecentLessonsList } from "@/components/dashboard/recent-lessons-list";
import { MaterialProgressGrid } from "@/components/dashboard/material-progress-grid";
import { LabReportsSection } from "@/components/dashboard/lab-reports-section";
import { SummariesSection } from "@/components/dashboard/summaries-section";
import { ExpiredSubsBanner, ExpiringSoonBanner, LockedHero } from "@/components/dashboard/banners";
import {
  MobileCodingWarning,
  getMobileCodingDismissKey,
} from "@/components/dashboard/mobile-coding-warning";
import {
  LabReport,
  LessonSummary,
  MaterialWithProgress,
  SubjectSub,
} from "@/components/dashboard/types";

const asArray = <T,>(raw: unknown): T[] => (Array.isArray(raw) ? (raw as T[]) : []);

interface GemsBalanceProbe {
  source?: string | null;
  hasActiveSub?: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const {
    data: views,
    isLoading: viewsLoading,
    isError: viewsIsError,
    refetch: refetchViews,
  } = useGetLessonViews();

  const summaries = useDashboardFetch<LessonSummary[]>(
    "/api/lesson-summaries",
    raw => asArray<LessonSummary>(raw),
    [],
  );
  const labReports = useDashboardFetch<LabReport[]>(
    "/api/lab-reports",
    raw => asArray<LabReport>(raw),
    [],
  );
  const subjectSubs = useDashboardFetch<SubjectSub[]>(
    "/api/subscriptions/my-subjects",
    raw => asArray<SubjectSub>(raw),
    [],
  );
  const legacyProbe = useDashboardFetch<boolean | null>(
    "/api/subscriptions/gems-balance",
    raw => {
      const d = raw as GemsBalanceProbe | null;
      return !!(d && d.source === "legacy" && d.hasActiveSub);
    },
    null,
  );

  // ── Materials grid (depends on the loaded subject subscriptions) ──
  const [materials, setMaterials] = useState<MaterialWithProgress[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialsTick, setMaterialsTick] = useState(0);
  const refetchMaterials = () => {
    if (subjectSubs.error) subjectSubs.refetch();
    setMaterialsTick(t => t + 1);
  };

  useEffect(() => {
    let cancelled = false;
    // Wait until the subscriptions fetch has settled — otherwise we'd
    // show "no books" while subscriptions are still loading.
    if (subjectSubs.loading) {
      setMaterialsLoading(true);
      setMaterialsError(null);
      return;
    }
    if (subjectSubs.error) {
      setMaterials([]);
      setMaterialsLoading(false);
      setMaterialsError("تعذّر تحميل اشتراكاتك، ولذلك لا يمكن عرض كتبك. حاول مجدداً.");
      return;
    }
    const subs = subjectSubs.data;
    if (subs.length === 0) {
      setMaterials([]);
      setMaterialsLoading(false);
      setMaterialsError(null);
      return;
    }
    setMaterialsLoading(true);
    setMaterialsError(null);
    const uniqueSubjects = new Map<string, string>();
    subs.forEach(s => {
      if (!uniqueSubjects.has(s.subjectId)) {
        uniqueSubjects.set(s.subjectId, s.subjectName || getSubjectById(s.subjectId)?.name || s.subjectId);
      }
    });
    interface ApiMaterial {
      id: number;
      fileName: string;
      status: "processing" | "ready" | "error";
      createdAt?: string | null;
      progress: {
        chaptersTotal: number;
        completedCount: number;
        currentChapterIndex: number;
        currentChapterTitle: string | null;
        lastInteractedAt?: string | null;
      } | null;
    }
    interface ApiMaterialsResponse { materials?: ApiMaterial[] }
    Promise.all(
      Array.from(uniqueSubjects.entries()).map(async ([subjectId, subjectName]): Promise<MaterialWithProgress[]> => {
        const r = await fetch(`/api/materials?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "include" });
        if (!r.ok) throw new Error(`materials ${subjectId} ${r.status}`);
        const data = (await r.json()) as ApiMaterialsResponse;
        const list = Array.isArray(data?.materials) ? data.materials : [];
        return list
          .filter((m): m is ApiMaterial & { progress: NonNullable<ApiMaterial["progress"]> } =>
            m.status === "ready" && !!m.progress && m.progress.chaptersTotal > 0)
          .map((m): MaterialWithProgress => ({
            id: m.id,
            fileName: m.fileName,
            status: m.status,
            subjectId,
            subjectName,
            createdAt: m.createdAt ?? null,
            lastInteractedAt: m.progress.lastInteractedAt ?? null,
            progress: {
              chaptersTotal: m.progress.chaptersTotal,
              completedCount: m.progress.completedCount,
              currentChapterIndex: m.progress.currentChapterIndex,
              currentChapterTitle: m.progress.currentChapterTitle ?? null,
            },
          }));
      }),
    )
      .then(results => {
        if (cancelled) return;
        const flat = results.flat();
        const ts = (m: MaterialWithProgress): number => {
          const v = m.lastInteractedAt ?? m.createdAt;
          const t = v ? Date.parse(v) : NaN;
          return Number.isFinite(t) ? t : 0;
        };
        flat.sort((a, b) => ts(b) - ts(a));
        setMaterials(flat);
      })
      .catch(() => {
        if (cancelled) return;
        setMaterialsError("تعذّر تحميل تقدّم الكتب. حاول مجدداً.");
      })
      .finally(() => { if (!cancelled) setMaterialsLoading(false); });
    return () => { cancelled = true; };
  }, [subjectSubs.data, subjectSubs.loading, subjectSubs.error, materialsTick]);

  // ── Mobile coding warning ──
  const [showMobileCodingWarning, setShowMobileCodingWarning] = useState(false);
  useEffect(() => {
    const subs = subjectSubs.data;
    if (subs.length === 0) return;
    const now = new Date();
    const activeSubs = subs.filter(s => {
      if (new Date(s.expiresAt) <= now) return false;
      if (typeof s.gemsBalance === "number") return s.gemsBalance > 0;
      return s.messagesUsed < s.messagesLimit;
    });
    const hasCodingSub = activeSubs.some(s => getSubjectById(s.subjectId)?.hasCoding === true);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    const dismissKey = user?.id ? getMobileCodingDismissKey(String(user.id)) : "";
    const dismissed = dismissKey ? localStorage.getItem(dismissKey) === "true" : false;
    if (isMobile && hasCodingSub && !dismissed) setShowMobileCodingWarning(true);
  }, [subjectSubs.data, user?.id]);

  const handleDismissMobileCoding = () => {
    if (user?.id) localStorage.setItem(getMobileCodingDismissKey(String(user.id)), "true");
    setShowMobileCodingWarning(false);
  };

  // ── Derived state ──
  const totalLessons = views?.length || 0;
  const challengesAnswered = views?.filter(v => v.challengeAnswered).length || 0;
  const points = user?.points || 0;
  const recentViews = (views ?? []).map(v => ({
    id: v.id,
    subjectId: v.subjectId,
    unitId: v.unitId,
    lessonId: v.lessonId,
    lessonTitle: v.lessonTitle,
    subjectName: v.subjectName,
  }));

  const { usableSubs, expiredSubs, expiringSoonSubs, isBlocked } = useMemo(() => {
    // Never derive blocked / expired-banner state from a failed or
    // in-flight subscriptions probe — that would show the "renew now"
    // experience to a paying user during a transient network error.
    if (subjectSubs.loading || subjectSubs.error || legacyProbe.loading || legacyProbe.error) {
      return { usableSubs: [] as SubjectSub[], expiredSubs: [] as SubjectSub[], expiringSoonSubs: [] as SubjectSub[], isBlocked: false };
    }
    const now = new Date();
    const subs = subjectSubs.data;
    const active = subs.filter(s => new Date(s.expiresAt) > now);
    const usable = active.filter(s => {
      if (typeof s.gemsBalance === "number") {
        return s.gemsBalance > 0 || (s.dailyRemaining ?? 0) > 0;
      }
      return s.messagesUsed < s.messagesLimit;
    });
    const hasLegacyPreGemsAccess = !!(
      user?.nukhbaPlan &&
      user?.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) > now &&
      (user.messagesUsed ?? 0) < (user.messagesLimit ?? 0)
    );
    const hasAnyLegacyAccess = hasLegacyPreGemsAccess || legacyProbe.data === true;

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const allExpired = subs.filter(s => new Date(s.expiresAt) <= now);
    const recentlyExpired = allExpired.filter(s => {
      const t = new Date(s.expiresAt).getTime();
      return Number.isFinite(t) && (now.getTime() - t) < THIRTY_DAYS_MS;
    });

    // Expired-renewal banner only when no other usable access exists.
    const expired = !usable.length && !hasAnyLegacyAccess ? recentlyExpired : [];

    // Expiring-soon banner: usable subs whose deadline is within 2 days,
    // and dedup against the expired list (a subject that already shows in
    // the more severe red banner shouldn't also show the orange one).
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const expiredIds = new Set(expired.map(s => s.subjectId));
    const expiringSoon = usable
      .filter(s => new Date(s.expiresAt) <= twoDaysFromNow)
      .filter(s => !expiredIds.has(s.subjectId));

    const blocked =
      !!user?.firstLessonComplete &&
      !usable.length &&
      !hasAnyLegacyAccess &&
      legacyProbe.data === false &&
      recentlyExpired.length === 0;

    return {
      usableSubs: usable,
      expiredSubs: expired,
      expiringSoonSubs: expiringSoon,
      isBlocked: blocked,
    };
  }, [
    subjectSubs.data, subjectSubs.loading, subjectSubs.error,
    legacyProbe.data, legacyProbe.loading, legacyProbe.error,
    user?.nukhbaPlan, user?.subscriptionExpiresAt, user?.messagesUsed, user?.messagesLimit, user?.firstLessonComplete,
  ]);

  return (
    <AppLayout>
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-grid-fine opacity-25 pointer-events-none" />
        <div
          className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        <div className="relative container mx-auto px-4 py-10 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-8 w-1 rounded-full"
                style={{ background: "linear-gradient(180deg, #F59E0B, #D97706)", boxShadow: "0 0 12px rgba(245,158,11,0.5)" }}
              />
              <h1 className="text-3xl md:text-4xl font-black">لوحة القيادة</h1>
            </div>
            <p className="text-xs text-gold/70 pr-4">
              معلّمك يتذكّر كل جلسة، كل خطأ صحّحته، وكل مهارة أتقنتها — هذا ما لا يفعله ChatGPT.
            </p>
          </motion.div>

          <AnimatePresence>
            {showMobileCodingWarning && (
              <MobileCodingWarning onDismiss={handleDismissMobileCoding} />
            )}
          </AnimatePresence>

          {isBlocked && <LockedHero />}
          <ExpiredSubsBanner expiredSubs={expiredSubs} />
          <ExpiringSoonBanner expiringSubs={expiringSoonSubs} />

          {/* ── Hero + stats ── */}
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mb-10">
            <HeroLevelCard points={points} />
            <StatTiles
              streakDays={user?.streakDays || 0}
              lessonsCompleted={totalLessons}
              challengesAnswered={challengesAnswered}
            />
          </div>

          {/* ── Recent lessons + subscription summary ── */}
          <div className="grid lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2">
              <SectionHeading accent="gold" icon={<BookOpen className="w-5 h-5" />}>
                الدروس الأخيرة
              </SectionHeading>
              <SectionState
                loading={viewsLoading}
                error={viewsIsError ? "تعذّر تحميل سجل الدروس. حاول مجدداً." : null}
                empty={false}
                emptyMessage=""
                onRetry={() => { void refetchViews(); }}
              >
                <RecentLessonsList views={recentViews} locked={isBlocked} />
              </SectionState>
            </div>
            <div>
              <SectionHeading accent="gold">حالة الاشتراك</SectionHeading>
              <SectionState
                loading={subjectSubs.loading || legacyProbe.loading}
                error={
                  subjectSubs.error || legacyProbe.error
                    ? "تعذّر تحميل حالة اشتراكك. حاول مجدداً."
                    : null
                }
                empty={false}
                emptyMessage=""
                onRetry={() => { subjectSubs.refetch(); legacyProbe.refetch(); }}
              >
                <SubscriptionSummaryCard usableSubs={usableSubs} locked={isBlocked} />
              </SectionState>
            </div>
          </div>

          {/* ── Books progress ── */}
          <div className="mb-10">
            <SectionHeading accent="amber" icon={<Library className="w-6 h-6" />}>
              تقدّم كتبك
            </SectionHeading>
            <SectionState
              loading={materialsLoading}
              error={materialsError}
              empty={materials.length === 0}
              emptyIcon={<Library className="w-10 h-10" />}
              emptyMessage="لم تُحمِّل أي كتاب PDF بعد. ارفع كتابك من داخل الجلسة لتظهر فصوله وتقدّمك هنا."
              onRetry={refetchMaterials}
            >
              <MaterialProgressGrid materials={materials} locked={isBlocked} />
            </SectionState>
          </div>

          {/* ── Lab reports ── */}
          <div className="mb-10">
            <SectionHeading accent="emerald" icon={<FlaskConical className="w-6 h-6" />}>
              تقارير المختبرات
            </SectionHeading>
            <LabReportsSection
              reports={labReports.data}
              loading={labReports.loading}
              error={labReports.error}
              onRetry={labReports.refetch}
            />
          </div>

          {/* ── Summaries ── */}
          <div>
            <SectionHeading accent="gold">ملخصاتي</SectionHeading>
            <SummariesSection
              summaries={summaries.data}
              loading={summaries.loading}
              error={summaries.error}
              onRetry={summaries.refetch}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
