import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LogOut, LogIn, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode } from "react";
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

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const loginUrl = "/api/auth/google";

  const NavLinks = () => (
    <>
      <Link href="/learn" className="text-foreground hover:text-gold transition-colors font-medium">تعلّم</Link>
      <Link href="/dashboard" className="text-foreground hover:text-gold transition-colors font-medium">لوحتي</Link>
      <Link href="/subscription" className="text-foreground hover:text-gold transition-colors font-medium">الاشتراك</Link>
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
