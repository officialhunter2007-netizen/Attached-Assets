import { Switch, Route, Router as WouterRouter, useLocation, useRoute } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import { LangProvider } from "./lib/lang-context";
import { useAuth } from "./lib/use-auth";
import { useEffect, useState, Component, useRef, type ReactNode } from "react";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Welcome from "@/pages/welcome";
import Learn from "@/pages/learn";
import Subject from "@/pages/subject";
import Lesson from "@/pages/lesson";
import Subscription from "@/pages/subscription";
import Usage from "@/pages/usage";
import { WelcomeOfferModal } from "@/components/welcome-offer-modal";
import { InAppNotifications } from "@/components/in-app-notifications";
import { WelcomeGiftModal } from "@/components/welcome-gift-modal";
import Admin from "@/pages/admin";
import Support from "@/pages/support";
import PathChoice from "@/pages/path-choice";
import PathCustom from "@/pages/path-custom";
import V4Map from "@/pages/v4-map";
import V4Lab from "@/pages/v4-lab";
import V4ImmersiveLab from "@/pages/v4-immersive-lab";
import V4Exam from "@/pages/v4-exam";
import V4Lesson from "@/pages/v4-lesson";
import PathBooklet from "@/pages/path-booklet";
import BookletSession from "@/pages/booklet-session";
import BookletMap from "@/pages/booklet-map";
import BookletLab from "@/pages/booklet-lab";
import BookletExam from "@/pages/booklet-exam";
import CodingRooms from "@/pages/coding-rooms";
import CodingRoom from "@/pages/coding-room";
import { ReferralGemsModal } from "@/components/referral-gems-modal";
import TypingEn from "@/pages/typing-en";
import TypingLesson from "@/pages/typing-lesson";
import Certificates from "@/pages/certificates";
import TypingChoice from "@/pages/typing";
import TypingAr from "@/pages/typing-ar";
import TypingLessonAr from "@/pages/typing-lesson-ar";

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

  // Key by user id so an account rotation (logout + login on the same
  // tab) forces a full remount of the protected page. This prevents
  // first-paint exposure of the previous account's in-memory state on
  // chat/lesson screens that hold streamed content.
  return (
    <PageErrorBoundary>
      <Component key={`u:${String(user.id)}`} />
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

// v4 task #3 — gate /subject/:slug on v4-enabled specialties.
// For v4-enabled specialties WITHOUT a student_paths row, redirect to the
// path-choice screen. Specialties without an active v4 instruction file
// fall through unchanged (legacy v3 Subject page renders for them).
function SubjectGate() {
  const [match, params] = useRoute<{ subjectId: string }>("/subject/:subjectId");
  const slug = params?.subjectId ?? "";
  const [, navigate] = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!match || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/path/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (!r.ok) { if (!cancelled) setChecked(true); return; }
        const data = await r.json();
        if (cancelled) return;
        if (data?.available && !data?.existingPath) {
          navigate(`/path/${encodeURIComponent(slug)}`);
          return;
        }
        // v4 cutover: v4-enabled specialty WITH an existing path.
        // If the student has uploaded booklets for this specialty, send them
        // to their booklet list. Otherwise fall through to the v4 map.
        if (data?.available && data?.existingPath) {
          try {
            const br = await fetch(`/api/v4/booklet/list/${encodeURIComponent(slug)}`, { credentials: "include" });
            if (br.ok) {
              const bd = await br.json();
              const hasBooklets = Array.isArray(bd?.booklets) &&
                bd.booklets.some((b: { status: string }) => b.status !== "failed");
              if (hasBooklets) {
                if (!cancelled) navigate(`/path/${encodeURIComponent(slug)}/booklet`);
                return;
              }
            }
          } catch {}
          if (!cancelled) navigate(`/specialty/${encodeURIComponent(slug)}/map`);
          return;
        }
        setChecked(true);
      } catch {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [match, slug, navigate]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <Subject />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={() => <GuestRoute component={Login} />} />
      <Route path="/register" component={() => <GuestRoute component={Register} />} />
      <Route path="/welcome" component={() => <ProtectedRoute component={Welcome} />} />
      <Route path="/learn" component={() => <ProtectedRoute component={Learn} />} />
      <Route path="/path/:slug" component={() => <ProtectedRoute component={PathChoice} />} />
      <Route path="/path/:slug/custom" component={() => <ProtectedRoute component={PathCustom} />} />
      <Route path="/path/:slug/booklet" component={() => <ProtectedRoute component={PathBooklet} />} />
      <Route path="/booklet/:id/map" component={() => <ProtectedRoute component={BookletMap} />} />
      <Route path="/booklet/:id/lab/:labCode" component={() => <ProtectedRoute component={BookletLab} />} />
      <Route path="/booklet/:id/exam/:examCode" component={() => <ProtectedRoute component={BookletExam} />} />
      <Route path="/booklet/:id" component={() => <ProtectedRoute component={BookletSession} />} />
      <Route path="/specialty/demo/map" component={V4Map} />
      <Route path="/specialty/:slug/map" component={() => <ProtectedRoute component={V4Map} />} />
      <Route path="/lab/:slug/:labCode" component={() => <ProtectedRoute component={V4ImmersiveLab} />} />
      <Route path="/exam/:slug/:examCode" component={() => <ProtectedRoute component={V4Exam} />} />
      <Route path="/specialty/:slug/lesson/:code" component={() => <ProtectedRoute component={V4Lesson} />} />
      <Route path="/subject/:subjectId" component={() => <ProtectedRoute component={SubjectGate} />} />
      <Route path="/lesson/:subjectId/:unitId/:lessonId" component={() => <ProtectedRoute component={Lesson} />} />
      <Route path="/subscription" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/usage" component={() => <ProtectedRoute component={Usage} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
      <Route path="/coding-rooms" component={() => <ProtectedRoute component={CodingRooms} />} />
      <Route path="/coding-room/:roomId" component={() => <ProtectedRoute component={CodingRoom} />} />
      <Route path="/typing" component={() => <ProtectedRoute component={TypingChoice} />} />
      <Route path="/typing-en" component={() => <ProtectedRoute component={TypingEn} />} />
      <Route path="/typing-ar" component={() => <ProtectedRoute component={TypingAr} />} />
      <Route path="/typing/lesson/:id" component={() => <ProtectedRoute component={TypingLesson} />} />
      <Route path="/typing-ar/lesson/:id" component={() => <ProtectedRoute component={TypingLessonAr} />} />
      <Route path="/certificates" component={() => <ProtectedRoute component={Certificates} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Registers the service worker and subscribes the device to Web Push */
function PushSetup() {
  const { user } = useAuth();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) =>
      console.warn("[sw] registration failed:", err)
    );
  }, []);

  useEffect(() => {
    if (!user || subscribedRef.current) return;

    async function subscribe() {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        // اطلب الإذن أولاً
        if (Notification.permission === "denied") return;
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") return;
        }

        // اجلب VAPID key
        const keyRes = await fetch("/api/push/vapid-public-key", { credentials: "include" });
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        let subscription = await reg.pushManager.getSubscription();

        // تحقق من صلاحية الاشتراك الموجود
        const isExpired =
          subscription?.expirationTime != null &&
          subscription.expirationTime < Date.now() + 5 * 60 * 1000; // أقل من 5 دقائق

        if (isExpired && subscription) {
          // اشتراك منتهي — أعد التسجيل من الصفر
          await subscription.unsubscribe();
          subscription = null;
        }

        if (!subscription) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }

        // أرسل الاشتراك للباكند — دائماً عند كل تحميل للتجديد
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
          body: JSON.stringify({ subscription: subscription.toJSON(), meta: {} }),
        });

        if (res.ok) {
          subscribedRef.current = true;
          console.log("[push] ✓ اشتراك مُسجَّل");
        }
      } catch (err) {
        console.warn("[push] subscribe failed:", err);
      }
    }

    subscribe();
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
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
              <WelcomeGiftModal />
              <ReferralGemsModal />
              <PushSetup />
              <InAppNotifications />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
