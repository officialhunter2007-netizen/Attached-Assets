import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LogOut, LogIn, Menu, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { NukhbaLogo } from "@/components/nukhba-logo";

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

  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

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
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <UserAvatar src={user.profileImage} name={user.displayName} size={30} />
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
