import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LogOut, LogIn, Menu, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { PlatformChatWidget } from "@/components/platform-chat-widget";
import { startActivityTracker, trackPageView } from "@/lib/activity-tracker";

type GemsState = {
  gemsBalance: number;
  dailyRemaining: number;
  gemsDailyLimit: number;
  hasActiveSub: boolean;
  // For multi-subject summary: number of active subs. 1 for per-subject or legacy.
  activeSubjectCount?: number;
  // Label shown beside the badge (e.g. subject name when inside a subject)
  label?: string | null;
} | null;

function GemsBadge({ gems, compact = false }: { gems: GemsState; compact?: boolean }) {
  // Show whenever the user has a time-active subscription, even if their gems
  // balance has hit zero — in that case the badge flips to an alert state so
  // the student understands they need to renew (rather than silently
  // disappearing).
  if (!gems || !gems.hasActiveSub) return null;

  const balanceEmpty = gems.gemsBalance <= 0;
  const dailyExhausted = gems.dailyRemaining <= 0 && gems.gemsDailyLimit > 0;
  const lowDaily = gems.dailyRemaining < 20;
  const lowBalance = gems.gemsBalance < 200;
  const alert = balanceEmpty || dailyExhausted || lowDaily || lowBalance;

  const multiSub = (gems.activeSubjectCount ?? 1) > 1;
  // Tooltip always carries the same aggregate context (active subject count
  // + total balance) regardless of state, with an extra renewal hint when
  // the balance has been fully consumed.
  const subjectsPart = multiSub
    ? ` — لديك ${gems.activeSubjectCount} مادة نشطة`
    : (gems.label ? ` (${gems.label})` : "");
  const baseTooltip = `المتبقي اليوم: ${gems.dailyRemaining.toLocaleString("ar-EG")} / ${gems.gemsDailyLimit.toLocaleString("ar-EG")} 💎${subjectsPart} — الرصيد الكلي: ${gems.gemsBalance.toLocaleString("ar-EG")}`;
  const tooltip = balanceEmpty
    ? `${baseTooltip} — نفد الرصيد، اشتراكك ساري لكنك بحاجة لتجديد الجواهر`
    : baseTooltip;

  // Inline scope label so the student knows which subscription this gems
  // count belongs to (single subject → its name, multiple → count).
  // Without this, a student with two active subjects sees one number and
  // can't tell whether it's their "محاسبة" or "إدارة" wallet.
  const scopeLabel = multiSub
    ? `${gems.activeSubjectCount} مواد`
    : (gems.label ?? null);

  // We always show "remaining / dailyLimit اليوم" so the format is
  // consistent across states; the alert styling alone communicates the
  // empty-balance situation.
  return (
    <Link href="/subscription">
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold cursor-pointer transition-colors whitespace-nowrap max-w-[260px]
          ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}
          ${alert
            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
            : "bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20"}`}
        title={tooltip}
      >
        💎
        <span>{gems.dailyRemaining.toLocaleString("ar-EG")}</span>
        {!compact && (
          <span className="opacity-60 font-normal">/ {gems.gemsDailyLimit.toLocaleString("ar-EG")} اليوم</span>
        )}
        {scopeLabel && (
          <span
            className={`opacity-80 font-normal truncate max-w-[120px] border-r pr-1 mr-0.5 ${alert ? "border-red-500/40" : "border-gold/30"}`}
          >
            {scopeLabel}
          </span>
        )}
      </span>
    </Link>
  );
}

function UserAvatar({ src, name, size = 32 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        width={size}
        height={size}
        className="rounded-full border-2 border-gold/30 object-cover shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="rounded-full border-2 border-gold/30 bg-gold/10 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <User className="w-4 h-4 text-gold" />
    </div>
  );
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string, url?: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    const notif = new Notification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "nukhba-support",
      renotify: true,
    });
    if (url) {
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
        notif.close();
      };
    }
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const [location] = useLocation();
  const [gems, setGems] = useState<GemsState>(null);

  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  // Activity tracker — start once user is logged in, track route changes
  useEffect(() => {
    if (!user) return;
    startActivityTracker();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    trackPageView(location);
  }, [user, location]);

  useEffect(() => {
    if (!user) return;
    const sendHeartbeat = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: location }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(interval);
  }, [user, location]);

  // Fetch gems balance periodically + on demand after AI turns.
  // ─ Inside /subject/:id/... → fetch per-subject endpoint for live accuracy.
  // ─ Everywhere else (learn, dashboard, subscription …) → fetch the summary
  //   endpoint which aggregates across all active subscriptions, so the badge
  //   is visible on every page that has a header, not just the lesson screen.
  const currentSubjectId = (() => {
    const m = location.match(/^\/subject\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  })();
  useEffect(() => {
    if (!user) { setGems(null); return; }
    const fetchGems = () => {
      if (currentSubjectId) {
        // Inside a subject session — precise per-subject wallet
        const url = `/api/subscriptions/gems-balance?subjectId=${encodeURIComponent(currentSubjectId)}`;
        fetch(url, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            // Same fallback chain as the summary endpoint so the badge
            // never displays a bare gem count without a scope label.
            const label =
              (typeof d.subjectName === "string" && d.subjectName.trim()) ||
              (typeof d.subjectId === "string" && d.subjectId.trim() && d.subjectId !== "all" ? d.subjectId : null) ||
              currentSubjectId ||
              "اشتراكي";
            setGems({
              gemsBalance: d.gemsBalance ?? 0,
              dailyRemaining: d.dailyRemaining ?? 0,
              gemsDailyLimit: d.gemsDailyLimit ?? 0,
              hasActiveSub: d.hasActiveSub ?? false,
              activeSubjectCount: 1,
              label,
            });
          })
          .catch(() => {});
      } else {
        // Other pages — aggregate across all active subscriptions
        fetch("/api/subscriptions/gems-balance-summary", { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d || !d.hasActiveSub) { setGems(null); return; }
            // Resolve a single-subject label so the badge shows "محاسبة"
            // (or a code fallback) instead of just a number — students
            // need to know WHICH wallet the gems belong to.
            // Falls back through: subjectName → subjectId → "اشتراكي"
            // for legacy rows where subject_name was never written.
            let label: string | null = null;
            if (d.activeSubjectCount === 1) {
              const w = d.worstSubject;
              if (w) {
                label =
                  (typeof w.subjectName === "string" && w.subjectName.trim()) ||
                  (typeof w.subjectId === "string" && w.subjectId.trim() && w.subjectId !== "all" ? w.subjectId : null) ||
                  "اشتراكي";
              } else {
                // legacy global gold wallet (source: "legacy")
                label = "كل المواد";
              }
            }
            setGems({
              gemsBalance: d.totalBalance ?? 0,
              dailyRemaining: d.totalDailyRemaining ?? 0,
              gemsDailyLimit: d.totalDailyLimit ?? 0,
              hasActiveSub: true,
              activeSubjectCount: d.activeSubjectCount ?? 1,
              label,
            });
          })
          .catch(() => {});
      }
    };
    fetchGems();
    const interval = setInterval(fetchGems, 10000);
    // Immediate refresh triggered by subject page after each AI turn
    window.addEventListener("nukhba:gems-changed", fetchGems);
    return () => {
      clearInterval(interval);
      window.removeEventListener("nukhba:gems-changed", fetchGems);
    };
  }, [user, currentSubjectId]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      const endpoint = user.role === 'admin' ? '/api/admin/support/unread-count' : '/api/support/unread-count';
      fetch(endpoint, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const newCount = d.count ?? 0;
          if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            const isAdmin = user.role === 'admin';
            sendBrowserNotification(
              isAdmin ? "رسالة جديدة من مستخدم" : "رد جديد من المشرف",
              isAdmin ? "لديك رسالة دعم جديدة تنتظر ردك" : "المشرف رد على رسالتك — افتح صفحة الدعم",
              isAdmin ? "/admin" : "/support"
            );
          }
          prevUnreadRef.current = newCount;
          setUnreadCount(newCount);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loginUrl = "/api/auth/google";

  const NavLinks = () => (
    <>
      <Link href="/learn" className="text-foreground hover:text-gold transition-colors font-medium">تعلّم</Link>
      <Link href="/dashboard" className="text-foreground hover:text-gold transition-colors font-medium">لوحتي</Link>
      <Link href="/subscription" className="text-foreground hover:text-gold transition-colors font-medium">الاشتراك</Link>
      <Link href="/support" className="text-foreground hover:text-gold transition-colors font-medium relative inline-flex items-center gap-1">
        <MessageCircle className="w-4 h-4" />
        <span>الدعم</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">{unreadCount}</span>
        )}
      </Link>
      {user?.role === 'admin' && (
        <Link href="/admin" className="text-foreground hover:text-gold transition-colors font-medium">إدارة</Link>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={user ? "/learn" : "/"}>
            <NukhbaLogo size="md" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
            <div className="h-6 w-px bg-border/50 mx-2" />
            {user ? (
              <div className="flex items-center gap-3">
                <GemsBadge gems={gems} />
                <UserAvatar src={user.profileImage} name={user.displayName} size={34} />
                <span className="text-sm text-muted-foreground max-w-[140px] truncate">{user.displayName || user.email}</span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <Button asChild size="sm" className="gradient-gold text-primary-foreground font-bold">
                <a href={loginUrl}>
                  <LogIn className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </a>
              </Button>
            )}
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <>
                <GemsBadge gems={gems} compact />
                <UserAvatar src={user.profileImage} name={user.displayName} size={30} />
              </>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-gold border-l-border">
                <div className="flex flex-col gap-6 mt-8">
                  {user && (
                    <div className="flex items-center gap-3 pb-2">
                      <UserAvatar src={user.profileImage} name={user.displayName} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{user.displayName || "مستخدم"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  )}
                  <NavLinks />
                  <GemsBadge gems={gems} />
                  <div className="h-px w-full bg-border/50" />
                  {user ? (
                    <Button variant="destructive" onClick={logout} className="w-full justify-start">
                      <LogOut className="w-4 h-4 ml-2" />
                      تسجيل الخروج
                    </Button>
                  ) : (
                    <Button asChild className="w-full gradient-gold text-primary-foreground font-bold justify-start">
                      <a href={loginUrl}>
                        <LogIn className="w-4 h-4 ml-2" />
                        تسجيل الدخول
                      </a>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Floating platform help chat — hidden inside learning sessions */}
      {user && !location.startsWith("/subject") && <PlatformChatWidget />}

      <footer className="border-t border-border/40 py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex justify-center items-center mb-4">
            <NukhbaLogo size="sm" />
          </div>
          <p>جميع الحقوق محفوظة {new Date().getFullYear()} © نُخبة</p>
        </div>
      </footer>
    </div>
  );
}
