import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LogOut, LogIn, Menu, User, MessageCircle, Home, BookOpen, CreditCard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { PlatformChatWidget } from "@/components/platform-chat-widget";
import { startActivityTracker, trackPageView } from "@/lib/activity-tracker";
import { motion, AnimatePresence } from "framer-motion";

type GemsState = {
  gemsBalance: number;
  dailyRemaining: number;
  gemsDailyLimit: number;
  hasActiveSub: boolean;
  activeSubjectCount?: number;
  label?: string | null;
  // Nearest-expiry warning. ≤ 7 days flips the badge into a warning state;
  // 0–1 days reuses the existing red alert visuals so the user can't miss it.
  expiresInDays?: number | null;
} | null;

function GemsBadge({ gems, compact = false }: { gems: GemsState; compact?: boolean }) {
  if (!gems || !gems.hasActiveSub) return null;

  const balanceEmpty = gems.gemsBalance <= 0;
  const dailyExhausted = gems.dailyRemaining <= 0 && gems.gemsDailyLimit > 0;
  const lowDaily = gems.dailyRemaining < 20;
  const lowBalance = gems.gemsBalance < 200;
  // Sub-window expiry warning. < 2 days = red alert, < 7 days = orange warn.
  const days = gems.expiresInDays;
  const expiringCritical = days != null && days >= 0 && days < 2;
  const expiringSoon = days != null && days >= 0 && days < 7;
  const alert = balanceEmpty || dailyExhausted || lowDaily || lowBalance || expiringCritical;
  const warn = !alert && expiringSoon;

  const multiSub = (gems.activeSubjectCount ?? 1) > 1;
  const subjectsPart = multiSub
    ? ` — لديك ${gems.activeSubjectCount} مادة نشطة`
    : (gems.label ? ` (${gems.label})` : "");
  const baseTooltip = `المتبقي اليوم: ${gems.dailyRemaining.toLocaleString("ar-EG")} / ${gems.gemsDailyLimit.toLocaleString("ar-EG")} 💎${subjectsPart} — الرصيد الكلي: ${gems.gemsBalance.toLocaleString("ar-EG")}`;
  const expiryPart = expiringSoon ? ` — ينتهي ${days === 0 ? "اليوم" : `خلال ${days} يوم`}` : "";
  const tooltip = balanceEmpty
    ? `${baseTooltip}${expiryPart} — نفد الرصيد، اشتراكك ساري لكنك بحاجة لتجديد الجواهر`
    : `${baseTooltip}${expiryPart}`;

  const scopeLabel = multiSub
    ? `${gems.activeSubjectCount} مواد`
    : (gems.label ?? null);

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
        <span>{gems.dailyRemaining.toLocaleString("ar-EG")}</span>
        {!compact && (
          <span className="opacity-60 font-normal">/ {gems.gemsDailyLimit.toLocaleString("ar-EG")} اليوم</span>
        )}
        {warn && !compact && (
          <span className="opacity-90 font-bold border-r pr-1 mr-0.5"
            style={{ borderColor: "rgba(249,115,22,0.4)" }}
          >
            ⏰ {days === 0 ? "آخر يوم" : `${days}ي`}
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
      // `renotify` is a real Chrome/Edge field that re-fires the alert sound
      // even when an existing notification with the same `tag` is replaced,
      // but it isn't in the standard NotificationOptions lib type. Cast the
      // options bag to skip the type-check while preserving runtime behavior.
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

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
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
    const m = location.match(/^\/subject\/([^/?#]+)/);
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
              "اشتراكي";
            // Compute days-until-expiry from the per-subject endpoint's
            // gemsExpiresAt so the badge can show the warning state even
            // when the user is inside a single subject view. The endpoint
            // historically returned the field as `expiresAt` in some
            // responses; keep the fallback to avoid breaking when the
            // server is rolled forward but the page is cached.
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
            if (!d || !d.hasActiveSub) { setGems(null); return; }
            let label: string | null = null;
            if (d.activeSubjectCount === 1) {
              const w = d.worstSubject;
              if (w) {
                label =
                  (typeof w.subjectName === "string" && w.subjectName.trim()) ||
                  (typeof w.subjectId === "string" && w.subjectId.trim() && w.subjectId !== "all" ? w.subjectId : null) ||
                  "اشتراكي";
              } else {
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

  const navItems = [
    { href: "/learn", label: "تعلّم" },
    { href: "/dashboard", label: "لوحتي" },
    { href: "/subscription", label: "الاشتراك" },
    ...(user?.role === 'admin' ? [{ href: "/admin", label: "إدارة" }] : []),
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
            background: scrolled
              ? "rgba(6,9,16,0.92)"
              : "rgba(8,12,20,0.8)",
            backdropFilter: "blur(20px) saturate(180%)",
            borderColor: scrolled ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
            boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.4), 0 1px 0 rgba(245,158,11,0.08)" : "none",
          }}
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
                    الدعم
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
              {user ? (
                <>
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
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </motion.button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold font-medium">
                      دخول
                    </Button>
                  </Link>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Button asChild size="sm" className="gradient-gold text-primary-foreground font-bold rounded-full px-5"
                      style={{ boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
                    >
                      <a href={loginUrl}>
                        <LogIn className="w-4 h-4 ml-2" />
                        تسجيل الدخول
                      </a>
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Mobile nav */}
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <>
                  <GemsBadge gems={gems} compact />
                  <UserAvatar src={user.profileImage} name={user.displayName} size={30} />
                </>
              )}
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
                          <p className="font-bold text-foreground truncate">{user.displayName || "مستخدم"}</p>
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
                            الدعم
                            {unreadCount > 0 && (
                              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center mr-auto">{unreadCount}</span>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>

                    <GemsBadge gems={gems} />

                    <div className="h-px w-full bg-white/8" />

                    {user ? (
                      <Button variant="destructive" onClick={logout} className="w-full justify-start rounded-xl">
                        <LogOut className="w-4 h-4 ml-2" />
                        تسجيل الخروج
                      </Button>
                    ) : (
                      <Button asChild className="w-full gradient-gold text-primary-foreground font-bold justify-start rounded-xl"
                        style={{ boxShadow: "0 0 20px rgba(245,158,11,0.2)" }}
                      >
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
          <p className="text-sm">جميع الحقوق محفوظة {new Date().getFullYear()} © نُخبة</p>
        </div>
      </footer>
    </div>
  );
}
