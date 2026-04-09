import { Link } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ReactNode } from "react";
import { NukhbaLogo } from "@/components/nukhba-logo";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user?.displayName || user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4 ml-2" />
                خروج
              </Button>
            </div>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-gold border-l-border">
                <div className="flex flex-col gap-6 mt-8">
                  <NavLinks />
                  <div className="h-px w-full bg-border/50" />
                  <Button variant="destructive" onClick={logout} className="w-full justify-start">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </Button>
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
