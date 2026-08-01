/**
 * InAppNotifications — إشعارات داخلية مباشرة
 * تظهر كلوحة مركزية عند وجود إشعارات غير مقروءة.
 * نوع subscription_approved يحصل على تصميم أخضر احتفالي خاص.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { X, Bell, CheckCircle2, Sparkles, BookOpen, Gem, ExternalLink, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

/** فتح الرابط: خارجي → تبويب جديد، داخلي → التنقل داخل التطبيق */
function openUrl(url: string, navigate: (to: string) => void) {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    navigate(url);
  }
}

function isExternal(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
}

interface NotifData {
  url?: string;
  urlLabel?: string;
  type?: string;
  subjectName?: string;
  planLabel?: string;
  gemsGranted?: number;
  expiresAt?: string;
}

interface InAppNotif {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: NotifData;
  read: boolean;
  created_at: string;
}

const POLL_INTERVAL = 20_000;

// ── Subscription-approved card ────────────────────────────────────────────────
function SubscriptionCard({
  notif,
  onDismiss,
}: {
  notif: InAppNotif;
  onDismiss: () => void;
}) {
  const [, navigate] = useLocation();
  const d = notif.data ?? {};
  const expiryLabel = d.expiresAt
    ? new Date(d.expiresAt).toLocaleDateString("ar-YE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const PLAN_ICONS: Record<string, string> = {
    bronze: "🥉",
    silver: "🥈",
    gold:   "🥇",
  };
  const rawPlan = notif.data?.type === "subscription_approved"
    ? (notif.data as any)?.planType ?? ""
    : "";
  const planIcon = PLAN_ICONS[rawPlan] ?? "✨";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={onDismiss} />

      {/* Card */}
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4" dir="rtl">
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
          style={{ background: "rgba(5,18,12,0.98)" }}
        >
          {/* Top glow bar */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

          {/* Green hero band */}
          <div className="relative px-6 pt-8 pb-5 flex flex-col items-center text-center gap-1"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(52,211,153,0.12) 0%, transparent 70%)" }}>

            {/* Close */}
            <button
              onClick={onDismiss}
              className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge icon */}
            <div className="relative mb-2">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" strokeWidth={1.5} />
              </div>
              <span className="absolute -top-2 -right-2 text-2xl">{planIcon}</span>
            </div>

            <h3 className="text-xl font-bold text-emerald-300 leading-snug">
              تمت الموافقة على اشتراكك!
            </h3>
            <p className="text-sm text-white/50 mt-0.5">مبروك، باقتك أصبحت نشطة الآن</p>
          </div>

          {/* Details grid */}
          <div className="px-6 pb-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 divide-y divide-emerald-500/10">
              {d.subjectName && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-white/45 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> التخصص
                  </span>
                  <span className="text-sm font-semibold text-white">{d.subjectName}</span>
                </div>
              )}
              {d.planLabel && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-white/45 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> الباقة
                  </span>
                  <span className="text-sm font-semibold text-emerald-300">{d.planLabel}</span>
                </div>
              )}
              {d.gemsGranted != null && d.gemsGranted > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-white/45 flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5" /> الجواهر المضافة
                  </span>
                  <span className="text-sm font-bold text-amber-300">
                    +{d.gemsGranted.toLocaleString("ar")} 💎
                  </span>
                </div>
              )}
              {expiryLabel && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-white/45">تنتهي في</span>
                  <span className="text-sm text-white/70">{expiryLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pt-4 pb-6 flex flex-col gap-2">
            <button
              onClick={() => { navigate(d.url ?? "/learn"); onDismiss(); }}
              className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 font-bold text-sm hover:bg-emerald-500/30 transition-colors"
            >
              ابدأ رحلتك التعليمية ←
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-2.5 rounded-xl text-xs text-white/35 hover:text-white/55 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Rejected / Incomplete / Cancelled card ────────────────────────────────────
function RejectedCard({
  notif,
  onDismiss,
}: {
  notif: InAppNotif;
  onDismiss: () => void;
}) {
  const [, navigate] = useLocation();
  const d = notif.data ?? {};
  const isCancelled  = notif.type === "subscription_cancelled";
  const isIncomplete = notif.type === "subscription_incomplete";

  // colour theme: amber for incomplete (fixable), rose for rejected/cancelled
  const accent = isIncomplete ? "amber" : "rose";
  const glowColor  = isIncomplete ? "rgba(251,191,36,0.10)"  : "rgba(244,63,94,0.10)";
  const borderColor = isIncomplete ? "border-amber-400/25"   : "border-rose-400/25";
  const bgColor    = isIncomplete ? "bg-amber-500/15"        : "bg-rose-500/15";
  const textColor  = isIncomplete ? "text-amber-300"         : "text-rose-300";
  const divideColor = isIncomplete ? "divide-amber-500/10"   : "divide-rose-500/10";
  const borderRow   = isIncomplete ? "border-amber-500/20 bg-amber-500/5" : "border-rose-500/20 bg-rose-500/5";
  const btnBg       = isIncomplete ? "bg-amber-500/15 border-amber-400/30 text-amber-200 hover:bg-amber-500/25" : "bg-rose-500/15 border-rose-400/30 text-rose-200 hover:bg-rose-500/25";

  const heading = isCancelled  ? "تم إلغاء اشتراكك"
                : isIncomplete ? "طلب اشتراكك يحتاج متابعة"
                :                "طلب الاشتراك لم يُقبل";

  // Guide text
  const guideText = isCancelled
    ? "إذا كنت تعتقد أن هذا خطأ، أو تريد معرفة السبب، تواصل مع فريق الدعم وسيساعدك."
    : isIncomplete
    ? "المبلغ المُرسل غير مكتمل أو هناك معلومات ناقصة. اضغط على الزر أدناه لمراسلة الدعم وإيضاح وضعك."
    : "إذا كنت تعتقد أن هذا خطأ، أو تريد الاستفسار عن السبب، راسل فريق الدعم وسيرد عليك في أقرب وقت.";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={onDismiss} />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4" dir="rtl">
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
          style={{ background: isCancelled || !isIncomplete ? "rgba(18,5,5,0.98)" : "rgba(16,12,4,0.98)" }}
        >
          {/* Top glow */}
          <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent ${isIncomplete ? "via-amber-400" : "via-rose-500"} to-transparent`} />

          {/* Hero */}
          <div
            className="relative px-6 pt-8 pb-4 flex flex-col items-center text-center gap-1"
            style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${glowColor} 0%, transparent 70%)` }}
          >
            <button
              onClick={onDismiss}
              className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`w-20 h-20 rounded-2xl ${bgColor} border ${borderColor} flex items-center justify-center mb-2`}>
              <X className={`w-9 h-9 ${textColor}`} strokeWidth={1.5} />
            </div>

            <h3 className={`text-xl font-bold ${textColor} leading-snug`}>{heading}</h3>
          </div>

          {/* Details row */}
          {(d.subjectName || d.planLabel || (d as any).adminNote) && (
            <div className="px-6 pb-3">
              <div className={`rounded-xl border ${borderRow} divide-y ${divideColor}`}>
                {d.subjectName && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> التخصص
                    </span>
                    <span className="text-sm font-semibold text-white">{d.subjectName}</span>
                  </div>
                )}
                {d.planLabel && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> الباقة
                    </span>
                    <span className={`text-sm font-semibold ${textColor}`}>{d.planLabel}</span>
                  </div>
                )}
                {(d as any).adminNote && (
                  <div className="px-4 py-2.5">
                    <span className="text-xs text-white/40 block mb-1">ملاحظة المشرف</span>
                    <span className="text-sm text-white/75 leading-relaxed">{(d as any).adminNote}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guide message */}
          <div className="px-6 pb-3">
            <div className={`rounded-xl px-4 py-3 ${isIncomplete ? "bg-amber-500/8 border border-amber-400/15" : "bg-white/4 border border-white/8"}`}>
              <p className="text-[13px] text-white/60 leading-relaxed text-center">{guideText}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col gap-2">
            {/* Support button — always shown for rejected/incomplete */}
            {!isCancelled && (
              <button
                onClick={() => { navigate("/support"); onDismiss(); }}
                className={`w-full py-3 rounded-xl border font-bold text-sm transition-all active:scale-[.98] flex items-center justify-center gap-2 ${btnBg}`}
              >
                <Bell className="w-4 h-4" />
                راسل فريق الدعم
              </button>
            )}
            {isCancelled && (
              <button
                onClick={() => { navigate("/support"); onDismiss(); }}
                className="w-full py-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 font-bold text-sm hover:bg-rose-500/25 transition-all active:scale-[.98] flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                تواصل مع الدعم
              </button>
            )}
            <button
              onClick={onDismiss}
              className="w-full py-2.5 rounded-xl text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Generic notification card ─────────────────────────────────────────────────
function GenericCard({
  notif,
  queueLength,
  onDismiss,
}: {
  notif: InAppNotif;
  queueLength: number;
  onDismiss: () => void;
}) {
  const [, navigate] = useLocation();
  const linkUrl = notif.data?.url;
  const hasLink = !!linkUrl && linkUrl !== "/";
  const external = hasLink && isExternal(linkUrl!);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4" dir="rtl">
        <div
          className="relative rounded-2xl border border-white/10 shadow-2xl shadow-black/70 overflow-hidden"
          style={{ background: "rgba(8,12,24,0.98)" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          <button
            onClick={onDismiss}
            className="absolute top-4 left-4 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Bell className="w-7 h-7 text-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white leading-snug">{notif.title}</h3>
              {notif.body && (
                <p className="text-sm text-white/65 leading-relaxed">{notif.body}</p>
              )}
            </div>

            {queueLength > 1 && (
              <span className="text-[11px] text-amber-400/60 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                {queueLength - 1} إشعار آخر ينتظر
              </span>
            )}

            <div className="flex flex-col gap-2 w-full mt-1">
              {hasLink && (
                <button
                  onClick={() => { openUrl(linkUrl!, navigate); onDismiss(); }}
                  className="w-full py-3 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-sm font-bold hover:bg-amber-400/25 active:scale-[.98] transition-all flex items-center justify-center gap-2"
                >
                  {notif.data?.urlLabel ? (
                    notif.data.urlLabel
                  ) : external ? (
                    <><ExternalLink className="w-4 h-4" />فتح الرابط</>
                  ) : (
                    <><ArrowLeft className="w-4 h-4 rotate-180" />اذهب الآن</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function InAppNotifications() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<InAppNotif[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data: { notifications: InAppNotif[] } = await res.json();
      const unread = data.notifications.filter((n) => !n.read);
      setQueue((prev) => {
        const prevIds = new Set(prev.map((n) => n.id));
        const newOnes = unread.filter((n) => !prevIds.has(n.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setQueue([]); return; }
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, fetchUnread]);

  const dismiss = async (id: number) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Nukhba-Csrf": "1" },
    }).catch(() => {});
  };

  const current = queue[0];
  if (!user || !current) return null;

  if (current.type === "subscription_approved") {
    return <SubscriptionCard notif={current} onDismiss={() => dismiss(current.id)} />;
  }

  if (current.type === "subscription_rejected" || current.type === "subscription_cancelled") {
    return <RejectedCard notif={current} onDismiss={() => dismiss(current.id)} />;
  }

  return (
    <GenericCard
      notif={current}
      queueLength={queue.length}
      onDismiss={() => dismiss(current.id)}
    />
  );
}
