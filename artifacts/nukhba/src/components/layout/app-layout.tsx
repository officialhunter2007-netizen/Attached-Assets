import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/lang-context";
import { LogOut, LogIn, Menu, User, MessageCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode, useState, useEffect, useRef } from "react";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { PlatformChatWidget } from "@/components/platform-chat-widget";
import { startActivityTracker, trackPageView } from "@/lib/activity-tracker";
import { motion, AnimatePresence } from "framer-motion";

type GemsState = {
  gemsBalance: number;
  dailyRemaining: number;
  gemsDailyLimit: number;
  hasActiveSub: boolean;
  isFirstLesson?: boolean;
  activeSubjectCount?: number;
  label?: string | null;
  expiresInDays?: number | null;
} | null;

// ─────────────────────────────────────────────────────────
// Language Toggle Button
// ─────────────────────────────────────────────────────────
function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, toggle, tr } = useLang();
  const isAr = lang === "ar";

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      title={tr.lang.switchTo}
      aria-label={tr.lang.switchTo}
      className={`
        relative flex items-center overflow-hidden rounded-full font-bold
        transition-colors duration-200 select-none
        ${compact ? "gap-1 px-2 py-1 text-[11px]" : "gap-1.5 px-3 py-1.5 text-xs"}
      `}
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
        color: "rgba(245,158,11,0.9)",
        boxShadow: "0 0 8px rgba(245,158,11,0.1)",
      }}
    >
      <Globe className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lang}
          initial={{ opacity: 0, y: isAr ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isAr ? 8 : -8 }}
          transition={{ duration: 0.18 }}
          className="leading-none"
          style={{ minWidth: compact ? 14 : 18, display: "inline-block", textAlign: "center" }}
        >
          {isAr ? "EN" : "ع"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────
// Gems Badge
// ─────────────────────────────────────────────────────────
function GemsBadge({ gems, compact = false }: { gems: GemsState; compact?: boolean }) {
  const { tr, lang } = useLang();
  if (!gems) return null;

  if (gems.isFirstLesson && !gems.hasActiveSub) {
    const remaining = Math.max(0, gems.gemsBalance);
    const limit = gems.gemsDailyLimit > 0 ? gems.gemsDailyLimit : 80;
    const exhausted = remaining <= 0;
    const label = gems.label ? ` — ${gems.label}` : "";
    const fmt = (n: number) => n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
    const tooltip = exhausted
      ? lang === "ar"
        ? `انتهت جواهر الجلسة المجانية${label} — اشترك لمواصلة التعلم`
        : `Free session gems exhausted${label} — Subscribe to continue`
      : lang === "ar"
      ? `لديك ${fmt(remaining)} من ${fmt(limit)} جوهرة مجانية في هذه الجلسة${label}`
      : `You have ${fmt(remaining)} of ${fmt(limit)} free gems this session${label}`;

    return (
      <Link href="/subscription">
        <motion.span
          whileHover={{ scale: 1.05 }}
          className={`inline-flex items-center gap-1 rounded-full font-bold cursor-pointer transition-all whitespace-nowrap max-w-[260px] ${compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs"}`}
          style={exhausted ? {
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#F87171",
            boxShadow: "0 0 12px rgba(239,68,68,0.2)",
          } : {
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#34D399",
            boxShadow: "0 0 10px rgba(16,185,129,0.18)",
          }}
          title={tooltip}
        >
          💎
          {exhausted ? (
            <span>{tr.gems.subscribe}</span>
          ) : (
            <>
              <span>{fmt(remaining)}</span>
              {!compact && (
                <span className="opacity-70 font-normal">
                  / {fmt(limit)} {tr.gems.free}
                </span>
              )}
            </>
          )}
        </motion.span>
      </Link>
    );
  }

  if (!gems.hasActiveSub) return null;

  const fmt = (n: number) => n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
  const balanceEmpty = gems.gemsBalance <= 0;
  const dailyExhausted = gems.dailyRemaining <= 0 && gems.gemsDailyLimit > 0;
  const lowDaily = gems.dailyRemaining < 20;
  const lowBalance = gems.gemsBalance < 200;
  const days = gems.expiresInDays;
  const expiringCritical = days != null && days >= 0 && days < 2;
  const expiringSoon = days != null && days >= 0 && days < 7;
  const alert = balanceEmpty || dailyExhausted || lowDaily || lowBalance || expiringCritical;
  const warn = !alert && expiringSoon;

  const multiSub = (gems.activeSubjectCount ?? 1) > 1;
  const subjectsPart = multiSub
    ? lang === "ar"
      ? ` — لديك ${gems.activeSubjectCount} مادة نشطة`
      : ` — ${gems.activeSubjectCount} active ${tr.gems.subjects}`
    : gems.label ? ` (${gems.label})` : "";
  const baseTooltip = lang === "ar"
    ? `المتبقي اليوم: ${fmt(gems.dailyRemaining)} / ${fmt(gems.gemsDailyLimit)} 💎${subjectsPart} — الرصيد الكلي: ${fmt(gems.gemsBalance)}`
    : `Today: ${fmt(gems.dailyRemaining)} / ${fmt(gems.gemsDailyLimit)} 💎${subjectsPart} — Total: ${fmt(gems.gemsBalance)}`;
  const expiryPart = expiringSoon
    ? lang === "ar"
      ? ` — ينتهي ${days === 0 ? "اليوم" : `خلال ${days} يوم`}`
      : ` — expires ${days === 0 ? "today" : `in ${days} days`}`
    : "";
  const tooltip = balanceEmpty
    ? lang === "ar"
      ? `${baseTooltip}${expiryPart} — نفد الرصيد، اشتراكك ساري لكنك بحاجة لتجديد الجواهر`
      : `${baseTooltip}${expiryPart} — Balance depleted, subscription active but gems need renewal`
    : `${baseTooltip}${expiryPart}`;

  const scopeLabel = multiSub
    ? `${gems.activeSubjectCount} ${tr.gems.subjects}`
    : (gems.label ?? null);

  const dayLabel = days === 0
    ? tr.gems.lastDay
    : lang === "ar" ? `${days}ي` : `${days}d`;

  return (
    <Link href="/subscription">
      <motion.span
        whileHover={{ scale: 1.05 }}
        className={`inline-flex items-center gap-1 rounded-full font-bold cursor-pointer transition-all whitespace-nowrap max-w-[260px] ${compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs"}`}
        style={alert ? {
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "#F87171",
          boxShadow: "0 0 12px rgba(239,68,68,0.2)",
          animation: "neon-border-pulse 2s ease-in-out infinite",
        } : warn ? {
          background: "rgba(249,115,22,0.12)",
          border: "1px solid rgba(249,115,22,0.4)",
          color: "#FB923C",
          boxShadow: "0 0 10px rgba(249,115,22,0.18)",
        } : {
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.3)",
          color: "#F59E0B",
          boxShadow: "0 0 10px rgba(245,158,11,0.15)",
        }}
        title={tooltip}
      >
        💎
        <span>{fmt(gems.dailyRemaining)}</span>
        {!compact && (
          <span className="opacity-60 font-normal">/ {fmt(gems.gemsDailyLimit)} {tr.gems.todayLimit}</span>
        )}
        {warn && !compact && (
          <span className="opacity-90 font-bold border-r pr-1 mr-0.5"
            style={{ borderColor: "rgba(249,115,22,0.4)" }}
          >
            ⏰ {dayLabel}
          </span>
        )}
        {scopeLabel && (
          <span className="opacity-80 font-normal truncate max-w-[120px] border-r pr-1 mr-0.5"
            style={{ borderColor: alert ? "rgba(239,68,68,0.4)" : warn ? "rgba(249,115,22,0.4)" : "rgba(245,158,11,0.3)" }}
          >
            {scopeLabel}
          </span>
        )}
      </motion.span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// User Avatar
// ─────────────────────────────────────────────────────────
function UserAvatar({ src, name, size = 32 }: { src?: string | null; name?: string | null; size?: number }) {
  if (src) {
    return (
      <div className="relative">
        <img
          src={src}
          alt={name || ""}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{
            border: "2px solid rgba(245,158,11,0.4)",
            boxShadow: "0 0 10px rgba(245,158,11,0.2)",
          }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald border-2 border-background" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: size, height: size,
        background: "rgba(245,158,11,0.1)",
        border: "2px solid rgba(245,158,11,0.35)",
        boxShadow: "0 0 10px rgba(245,158,11,0.15)",
      }}
    >
      <User className="w-4 h-4 text-gold" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Notification helpers
// ─────────────────────────────────────────────────────────
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
    } as NotificationOptions);
    if (url) {
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
        notif.close();
      };
    }
  }
}

// ─────────────────────────────────────────────────────────
// Nav Link
// ─────────────────────────────────────────────────────────
function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link href={href}>
      <span
        className="relative text-sm font-semibold transition-all duration-200 px-1 py-0.5"
        style={{ color: active ? "#F59E0B" : "rgba(255,255,255,0.7)" }}
      >
        {children}
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -bottom-1 right-0 left-0 h-0.5 rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, #F59E0B, transparent)",
              boxShadow: "0 0 6px rgba(245,158,11,0.6)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// App Layout
// ─────────────────────────────────────────────────────────
export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { tr, lang } = useLang();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const [location] = useLocation();
  const [gems, setGems] = useState<GemsState>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

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

  const currentSubjectId = (() => {
    const m = location.match(/^\/(?:subject|lesson)\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  })();

  useEffect(() => {
    if (!user) { setGems(null); return; }
    const fetchGems = () => {
      if (currentSubjectId) {
        const url = `/api/subscriptions/gems-balance?subjectId=${encodeURIComponent(currentSubjectId)}`;
        fetch(url, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            const label =
              (typeof d.subjectName === "string" && d.subjectName.trim()) ||
              (typeof d.subjectId === "string" && d.subjectId.trim() && d.subjectId !== "all" ? d.subjectId : null) ||
              currentSubjectId ||
              (lang === "ar" ? "اشتراكي" : "My Plan");
            let expiresInDays: number | null = null;
            const expiryRaw = d.gemsExpiresAt ?? d.expiresAt;
            if (expiryRaw) {
              const ms = new Date(expiryRaw).getTime() - Date.now();
              if (Number.isFinite(ms)) expiresInDays = Math.max(0, Math.ceil(ms / 86_400_000));
            }
            setGems({
              gemsBalance: d.gemsBalance ?? 0,
              dailyRemaining: d.dailyRemaining ?? 0,
              gemsDailyLimit: d.gemsDailyLimit ?? 0,
              hasActiveSub: d.hasActiveSub ?? false,
              isFirstLesson: d.isFirstLesson ?? d.source === "first-lesson",
              activeSubjectCount: 1,
              label,
              expiresInDays,
            });
          })
          .catch(() => {});
      } else {
        fetch("/api/subscriptions/gems-balance-summary", { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) { setGems(null); return; }
            if (!d.hasActiveSub && d.isFirstLesson) {
              setGems({
                gemsBalance: d.totalBalance ?? 0,
                dailyRemaining: d.totalDailyRemaining ?? 0,
                gemsDailyLimit: d.totalDailyLimit ?? 0,
                hasActiveSub: false,
                isFirstLesson: true,
                activeSubjectCount: 0,
                label: null,
                expiresInDays: null,
              });
              return;
            }
            if (!d.hasActiveSub) { setGems(null); return; }
            let label: string | null = null;
            if (d.activeSubjectCount === 1) {
              const w = d.worstSubject;
              if (w) {
                label =
                  (typeof w.subjectName === "string" && w.subjectName.trim()) ||
                  (typeof w.subjectId === "string" && w.subjectId.trim() && w.subjectId !== "all" ? w.subjectId : null) ||
                  (lang === "ar" ? "اشتراكي" : "My Plan");
              } else {
                label = lang === "ar" ? "كل المواد" : "All Subjects";
              }
            }
            setGems({
              gemsBalance: d.totalBalance ?? 0,
              dailyRemaining: d.totalDailyRemaining ?? 0,
              gemsDailyLimit: d.totalDailyLimit ?? 0,
              hasActiveSub: true,
              activeSubjectCount: d.activeSubjectCount ?? 1,
              label,
              expiresInDays: typeof d.nearestExpiresInDays === "number" ? d.nearestExpiresInDays : null,
            });
          })
          .catch(() => {});
      }
    };
    fetchGems();
    const interval = setInterval(fetchGems, 10000);
    window.addEventListener("nukhba:gems-changed", fetchGems);
    return () => {
      clearInterval(interval);
      window.removeEventListener("nukhba:gems-changed", fetchGems);
    };
  }, [user, currentSubjectId, lang]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      const endpoint = user.role === "admin" ? "/api/admin/support/unread-count" : "/api/support/unread-count";
      fetch(endpoint, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const newCount = d.count ?? 0;
          if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
            const isAdmin = user.role === "admin";
            sendBrowserNotification(
              isAdmin
                ? (lang === "ar" ? "رسالة جديدة من مستخدم" : "New message from a user")
                : (lang === "ar" ? "رد جديد من المشرف" : "New reply from admin"),
              isAdmin
                ? (lang === "ar" ? "لديك رسالة دعم جديدة تنتظر ردك" : "A new support message awaits your reply")
                : (lang === "ar" ? "المشرف رد على رسالتك — افتح صفحة الدعم" : "The admin replied — open the support page"),
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
  }, [user, lang]);

  const loginUrl = "/api/auth/google";

  const navItems = [
    { href: "/learn", label: tr.nav.learn },
    { href: "/dashboard", label: tr.nav.dashboard },
    { href: "/subscription", label: tr.nav.subscription },
    ...(user?.role === "admin" ? [{ href: "/admin", label: tr.nav.admin }] : []),
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">

      {/* ── HEADER ── */}
      <motion.header
        className="sticky top-0 z-50 w-full"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="w-full border-b transition-all duration-300"
          style={{
            background: scrolled ? "rgba(6,9,16,0.92)" : "rgba(8,12,20,0.8)",
            backdropFilter: "blur(20px) saturate(180%)",
            borderColor: scrolled ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
            boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.4), 0 1px 0 rgba(245,158,11,0.08)" : "none",
          }}
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">

            {/* Logo */}
            <Link href={user ? "/learn" : "/"}>
              <motion.div whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 400 }}>
                <NukhbaLogo size="md" />
              </motion.div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-7">
              {navItems.map(item => (
                <NavLink key={item.href} href={item.href} active={location.startsWith(item.href)}>
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <NavLink href="/support" active={location.startsWith("/support")}>
                  <span className="relative inline-flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {tr.nav.support}
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-2.5 -left-3 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center"
                          style={{ boxShadow: "0 0 10px rgba(239,68,68,0.5)" }}
                        >
                          {unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </NavLink>
              )}
            </nav>

            {/* Desktop right section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language Toggle */}
              <LangToggle />

              {user ? (
                <>
                  <div className="h-6 w-px bg-white/10" />
                  <GemsBadge gems={gems} />
                  <div className="h-6 w-px bg-white/10 mx-1" />
                  <UserAvatar src={user.profileImage} name={user.displayName} size={34} />
                  <span className="text-sm text-muted-foreground max-w-[130px] truncate hidden lg:block">
                    {user.displayName || user.email}
                  </span>
                  <motion.button
                    onClick={logout}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                    title={tr.auth.logoutFull}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{tr.auth.logout}</span>
                  </motion.button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold font-medium">
                      {tr.auth.login}
                    </Button>
                  </Link>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button asChild size="sm" className="gradient-gold text-primary-foreground font-bold rounded-full px-5"
                      style={{ boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
                    >
                      <a href={loginUrl}>
                        <LogIn className="w-4 h-4 ml-2" />
                        {tr.auth.register}
                      </a>
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>

            {/* ── Mobile header ── */}
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <>
                  <GemsBadge gems={gems} compact />
                  <UserAvatar src={user.profileImage} name={user.displayName} size={30} />
                </>
              )}
              <LangToggle compact />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="border-l"
                  style={{
                    background: "rgba(6,9,16,0.97)",
                    backdropFilter: "blur(24px)",
                    borderColor: "rgba(245,158,11,0.15)",
                  }}
                >
                  <div className="flex flex-col gap-5 mt-8">
                    {user && (
                      <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                        <UserAvatar src={user.profileImage} name={user.displayName} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{user.displayName || (lang === "ar" ? "مستخدم" : "User")}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      {navItems.map(item => (
                        <Link key={item.href} href={item.href}>
                          <div className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${location.startsWith(item.href) ? "bg-gold/10 text-gold border border-gold/20" : "text-foreground/80 hover:bg-white/5"}`}>
                            {item.label}
                          </div>
                        </Link>
                      ))}
                      {user && (
                        <Link href="/support">
                          <div className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${location.startsWith("/support") ? "bg-gold/10 text-gold border border-gold/20" : "text-foreground/80 hover:bg-white/5"}`}>
                            <MessageCircle className="w-4 h-4" />
                            {tr.nav.support}
                            {unreadCount > 0 && (
                              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center mr-auto">{unreadCount}</span>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>

                    {/* Language toggle inside mobile menu */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-white/40 font-medium">
                        {lang === "ar" ? "اللغة" : "Language"}
                      </span>
                      <LangToggle />
                    </div>

                    <GemsBadge gems={gems} />

                    <div className="h-px w-full bg-white/8" />

                    {user ? (
                      <Button variant="destructive" onClick={logout} className="w-full justify-start rounded-xl">
                        <LogOut className="w-4 h-4 ml-2" />
                        {tr.auth.logoutFull}
                      </Button>
                    ) : (
                      <Button asChild className="w-full gradient-gold text-primary-foreground font-bold justify-start rounded-xl"
                        style={{ boxShadow: "0 0 20px rgba(245,158,11,0.2)" }}
                      >
                        <a href={loginUrl}>
                          <LogIn className="w-4 h-4 ml-2" />
                          {tr.auth.register}
                        </a>
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

          </div>
        </div>
      </motion.header>

      <main className="flex-1 w-full relative">
        {children}
      </main>

      {user && !location.startsWith("/subject") && <PlatformChatWidget />}

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 py-8 mt-auto"
        style={{ background: "rgba(5,8,14,0.8)" }}
      >
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex justify-center items-center mb-3">
            <NukhbaLogo size="sm" />
          </div>
          <p className="text-sm">
            {tr.footer.rights} {new Date().getFullYear()} © {lang === "ar" ? "نُخبة" : "Nukhba"}
          </p>
        </div>
      </footer>
    </div>
  );
}
