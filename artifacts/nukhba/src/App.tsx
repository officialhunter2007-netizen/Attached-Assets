import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import { LangProvider } from "./lib/lang-context";
import { useAuth } from "./lib/use-auth";
import { useEffect, Component, type ReactNode } from "react";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Welcome from "@/pages/welcome";
import Learn from "@/pages/learn";
import Subject from "@/pages/subject";
import Lesson from "@/pages/lesson";
import Dashboard from "@/pages/dashboard";
import Subscription from "@/pages/subscription";
import Usage from "@/pages/usage";
import { WelcomeOfferModal } from "@/components/welcome-offer-modal";
import Admin from "@/pages/admin";
import Support from "@/pages/support";

const queryClient = new QueryClient();

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("[PageErrorBoundary] Uncaught error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen bg-background gap-6 px-4"
          style={{ direction: "rtl" }}
        >
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-black text-white">حدث خطأ غير متوقع</h1>
          <p className="text-white/50 text-sm text-center max-w-sm">
            واجهت الصفحة مشكلة تقنية. حاول تحديث الصفحة أو العودة للرئيسية.
          </p>
          {this.state.error && (
            <pre className="text-xs text-red-400/70 bg-red-900/10 border border-red-500/20 rounded-xl px-4 py-3 max-w-lg w-full overflow-auto text-right">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
            >
              تحديث الصفحة
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/"; }}
              className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white font-bold text-sm hover:bg-white/12 transition-colors"
            >
              الرئيسية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageErrorBoundary>
      <Component />
    </PageErrorBoundary>
  );
}

function GuestRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/learn");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={() => <GuestRoute component={Login} />} />
      <Route path="/register" component={() => <GuestRoute component={Register} />} />
      <Route path="/welcome" component={() => <ProtectedRoute component={Welcome} />} />
      <Route path="/learn" component={() => <ProtectedRoute component={Learn} />} />
      <Route path="/subject/:subjectId" component={() => <ProtectedRoute component={Subject} />} />
      <Route path="/lesson/:subjectId/:unitId/:lessonId" component={() => <ProtectedRoute component={Lesson} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/subscription" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/usage" component={() => <ProtectedRoute component={Usage} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <WelcomeOfferModal />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
