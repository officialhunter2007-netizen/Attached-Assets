import { useState, useEffect, useRef, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { markLeftSubPageWithoutSub, clearLeftSubPageWithoutSub } from "@/components/welcome-offer-modal";
import { university, skills } from "@/lib/curriculum";
import {
  useCreateSubscriptionRequest,
  useActivateSubscription,
  useGetMySubscriptionRequests,
  getGetMySubscriptionRequestsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Crown, CreditCard, Key, CheckCircle2, Zap, Star, Gem, Clock, AlertTriangle, CheckCircle, ArrowRight, ChevronDown, ShieldCheck, HelpCircle, PhoneCall, Send, Banknote, UserCheck, ClipboardCheck, Check, X, Sparkles, MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";


type PlanKey = "bronze" | "silver" | "gold";

const plans: Record<PlanKey, {
  name: string;
  icon: React.ReactNode;
  gems: number;
  gemsPerDay: number;
  priceNorth: string;
  priceSouth: string;
  priceNorthNum: string;
  priceSouthNum: string;
  desc: string;
  features: string[];
  popular?: boolean;
  color: string;
}> = {
  bronze: {
    name: "البرونزية",
    icon: <Zap className="w-7 h-7 text-orange-400" />,
    gems: 1000,
    gemsPerDay: 71,
    priceNorth: "١٬٠٠٠ ريال",
    priceSouth: "٢٬٠٠٠ ريال",
    priceNorthNum: "١٬٠٠٠",
    priceSouthNum: "٢٬٠٠٠",
    desc: "ابدأ تجربتك مع المعلم الذكي والمختبرات التطبيقية",
    color: "text-orange-400",
    features: [
      "١٬٠٠٠ 💎 جوهرة لهذا التخصص — ١٤ يوماً",
      "حتى ٧١ جوهرة يومياً تتجدّد كل يوم طوال مدة الاشتراك",
      "مختبرات تطبيقية تفاعلية تُبنى لك حسب الدرس",
      "تقييم ذكي لعملك في المختبر مع نقاط القوة والتطوير",
      "خطة تعلم شخصية مبنية على مستواك",
    ],
  },
  silver: {
    name: "الفضية",
    icon: <Star className="w-7 h-7 text-slate-300" />,
    gems: 2000,
    gemsPerDay: 142,
    priceNorth: "٢٬٠٠٠ ريال",
    priceSouth: "٤٬٠٠٠ ريال",
    priceNorthNum: "٢٬٠٠٠",
    priceSouthNum: "٤٬٠٠٠",
    desc: "للطالب الجاد — تعلّم أعمق في جميع التخصصات",
    color: "text-slate-300",
    features: [
      "٢٬٠٠٠ 💎 جوهرة لهذا التخصص — ١٤ يوماً",
      "حتى ١٤٢ جوهرة يومياً تتجدّد كل يوم طوال مدة الاشتراك",
      "مختبرات تطبيقية تفاعلية بلا حدود",
      "تقارير مفصّلة عن أدائك في كل مختبر",
      "خطة تعلم تتطوّر مع تقدمك ومراجعات دورية",
      "أولوية في الدعم الفني",
    ],
    popular: true,
  },
  gold: {
    name: "الذهبية",
    icon: <Gem className="w-7 h-7 text-gold" />,
    gems: 3000,
    gemsPerDay: 214,
    priceNorth: "٣٬٠٠٠ ريال",
    priceSouth: "٦٬٠٠٠ ريال",
    priceNorthNum: "٣٬٠٠٠",
    priceSouthNum: "٦٬٠٠٠",
    desc: "الخيار الأشمل — تعلّم كثيف بلا توقف",
    color: "text-gold",
    features: [
      "٣٬٠٠٠ 💎 جوهرة لهذا التخصص — ١٤ يوماً",
      "حتى ٢١٤ جوهرة يومياً تتجدّد كل يوم طوال مدة الاشتراك",
      "مختبرات تطبيقية متقدمة بلا حدود",
      "تقييم احترافي مفصّل + مراجعات أسبوعية",
      "توليد دروس وتمارين ومشاريع حسب الطلب",
      "أولوية قصوى في الدعم الفني",
    ],
  },
};

// Numeric price table mirrors backend `BASE_PRICES` — used for client-side
// display only (e.g. computing the welcome offer's halved total). The
// authoritative price is always re-computed on the server.
const BASE_PRICES_DISPLAY: Record<"north" | "south", Record<PlanKey, number>> = {
  north: { bronze: 1000, silver: 2000, gold: 3000 },
  south: { bronze: 2000, silver: 4000, gold: 6000 },
};

export default function Subscription() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const [region, setRegion] = useState<"north" | "south">("north");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Subject picker panel state
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"university" | "skills">("university");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showSubjectPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSubjectPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSubjectPicker]);

  // Search across BOTH university and all skills categories
  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    const fromUniversity = university.find((s) => s.id === selectedSubjectId);
    if (fromUniversity) return fromUniversity;
    for (const category of skills) {
      const found = category.subjects.find((s) => s.id === selectedSubjectId);
      if (found) return found;
    }
    return null;
  }, [selectedSubjectId]);

  // Welcome offer (20% off, one-time, auto-applied for first-time visitors
  // who left without subscribing and came back). Backend is source of truth.
  const [welcomeOffer, setWelcomeOffer] = useState<{
    active: boolean;
    expiresAt: string | null;
    percent: number;
  }>({ active: false, expiresAt: null, percent: 20 });
  const submittedRef = useRef(false);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  // Track first visit to subscription page + read welcome offer state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/subscriptions/welcome-offer/visit", {
          method: "POST", credentials: "include",
        });
      } catch {}
      try {
        const r = await fetch("/api/subscriptions/welcome-offer", { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        setWelcomeOffer({
          active: !!data.active,
          expiresAt: data.expiresAt ?? null,
          percent: data.percent ?? 20,
        });
        if (data.active) clearLeftSubPageWithoutSub();
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // On unmount / page hide: notify the server that the user left the
  // subscription page without subscribing. The server uses this as a
  // precondition for welcome-offer eligibility, so we cannot rely on
  // sessionStorage alone (which a curious client could bypass by calling
  // /show directly). We use sendBeacon for reliability across both
  // SPA navigations and full page unloads (close tab / refresh).
  useEffect(() => {
    const sendLeaveBeacon = () => {
      if (submittedRef.current) return;
      try {
        const url = "/api/subscriptions/welcome-offer/leave";
        const blob = new Blob([JSON.stringify({})], { type: "application/json" });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, blob);
        } else {
          // Fallback: keepalive fetch.
          fetch(url, { method: "POST", credentials: "include", keepalive: true }).catch(() => {});
        }
      } catch {}
    };
    const onPageHide = () => sendLeaveBeacon();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (!submittedRef.current) {
        markLeftSubPageWithoutSub();
        sendLeaveBeacon();
      }
    };
  }, []);

  // When welcome offer becomes active, drop any previously-entered coupon
  // (red line: cannot stack discounts).
  useEffect(() => {
    if (welcomeOffer.active) {
      setDiscountInfo(null);
      setDiscountInput("");
      setDiscountError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeOffer.active]);

  // Live countdown for the active welcome banner.
  const [welcomeNow, setWelcomeNow] = useState(() => Date.now());
  useEffect(() => {
    if (!welcomeOffer.active) return;
    const t = setInterval(() => setWelcomeNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [welcomeOffer.active]);

  const welcomeRemainingMs = welcomeOffer.expiresAt
    ? Math.max(0, new Date(welcomeOffer.expiresAt).getTime() - welcomeNow)
    : 0;
  const welcomeRemainingLabel = (() => {
    if (!welcomeOffer.active || welcomeRemainingMs <= 0) return "";
    const totalSec = Math.floor(welcomeRemainingMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
  })();

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{
    code: string;
    percent: number;
    basePrice: number;
    finalPrice: number;
    discountAmount: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);

  // Re-validate when plan or region changes (price depends on them).
  useEffect(() => {
    if (!discountInfo || !selectedPlan) return;
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/subscriptions/discount-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: discountInfo.code, planType: selectedPlan, region }),
        });
        const data = await r.json();
        if (aborted) return;
        if (r.ok && data.valid) {
          setDiscountInfo({
            code: data.code,
            percent: data.percent,
            basePrice: data.basePrice,
            finalPrice: data.finalPrice,
            discountAmount: data.discountAmount,
          });
        } else {
          setDiscountInfo(null);
          setDiscountError(data.message || data.error || "كود غير صالح");
        }
      } catch {
        // Network errors leave existing info; user can re-apply.
      }
    })();
    return () => { aborted = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, region]);

  const handleApplyDiscount = async () => {
    setDiscountError(null);
    if (!selectedPlan) {
      setDiscountError("اختر باقة أولاً قبل تطبيق الكود");
      return;
    }
    const code = discountInput.trim().toUpperCase();
    if (!code) {
      setDiscountError("أدخل كود الخصم");
      return;
    }
    setDiscountChecking(true);
    try {
      const r = await fetch("/api/subscriptions/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, planType: selectedPlan, region }),
      });
      const data = await r.json();
      if (r.ok && data.valid) {
        setDiscountInfo({
          code: data.code,
          percent: data.percent,
          basePrice: data.basePrice,
          finalPrice: data.finalPrice,
          discountAmount: data.discountAmount,
        });
        setDiscountInput(data.code);
      } else {
        setDiscountInfo(null);
        setDiscountError(data.message || data.error || "كود غير صالح");
      }
    } catch (e: any) {
      setDiscountError("تعذّر التحقق — أعد المحاولة");
    } finally {
      setDiscountChecking(false);
    }
  };

  const handleClearDiscount = () => {
    setDiscountInfo(null);
    setDiscountInput("");
    setDiscountError(null);
  };


  const createReqMutation = useCreateSubscriptionRequest();
  const activateMutation = useActivateSubscription();
  const { data: myRequestsRaw, refetch: refetchMyRequests } = useGetMySubscriptionRequests();
  const myRequests = Array.isArray(myRequestsRaw) ? myRequestsRaw : [];

  const latestRequest = [...myRequests]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  const hasPendingRequest = latestRequest?.status === "pending";
  const hasIncompleteRequest = latestRequest?.status === "incomplete";

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !accountName.trim()) return;
    if (!selectedSubject) {
      toast({ variant: "destructive", title: "اختر التخصص أولاً", description: "كل اشتراك مرتبط بتخصص واحد — اختر المادة قبل إرسال الطلب." });
      return;
    }
    try {
      await createReqMutation.mutateAsync({
        data: {
          planType: selectedPlan,
          region,
          accountName: accountName.trim(),
          notes: notes.trim() || null,
          // @ts-ignore — extra fields accepted by backend
          subjectId: selectedSubject.id,
          // @ts-ignore — extra fields accepted by backend
          subjectName: selectedSubject.name,
          // @ts-ignore — extra fields accepted by backend
          discountCode: discountInfo?.code ?? undefined,
        }
      });
      toast({
        title: "تم إرسال الطلب",
        description: `سيراجع المشرف طلب اشتراك "${selectedSubject.name}" ويُفعّل جواهرك قريباً`,
        className: "bg-emerald-600 border-none text-white"
      });
      setSubmitted(true);
      submittedRef.current = true;
      clearLeftSubPageWithoutSub();
      // Welcome offer is single-use — refresh state from backend.
      setWelcomeOffer({ active: false, expiresAt: null, percent: 20 });
      setSelectedPlan(null);
      setAccountName("");
      setNotes("");
      // Clear discount state so the next request starts fresh.
      setDiscountInfo(null);
      setDiscountInput("");
      setDiscountError(null);
      queryClient.invalidateQueries({ queryKey: getGetMySubscriptionRequestsQueryKey() });
      refetchMyRequests();
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    }
  };

  const handleActivationSubmit = async () => {
    if (!activationCode) return;
    try {
      const res = await activateMutation.mutateAsync({
        data: { code: activationCode }
      });
      if (res.success) {
        toast({
          title: "تم التفعيل بنجاح!",
          description: (res as any).subjectId
            ? `تم تفعيل باقة ${plans[(res as any).planType as PlanKey]?.name || (res as any).planType} لمادة "${(res as any).subjectId}".`
            : `تم تفعيل الباقة بنجاح.`,
          className: "bg-emerald-600 border-none text-white"
        });
        if (user) {
          setUser({ ...user, nukhbaPlan: (res as any).planType });
        }
        setActivationCode("");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message || "كود التفعيل غير صالح أو مستخدم مسبقاً" });
    }
  };

  const planLabelMap: Record<string, string> = { bronze: "البرونزية", silver: "الفضية", gold: "الذهبية" };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-4xl font-black mb-4">اشترك في نُخبة</h1>
          <p className="text-xl text-muted-foreground">
            اشتراك مستقل لكل تخصص — اختر مادتك أولاً، ثم الباقة المناسبة لك
          </p>
          <p className="text-sm text-gold/70 mt-3 max-w-2xl mx-auto leading-relaxed">
            أنت لا تشترك في "محادثة" — أنت تشترك في معلّم متخصّص يتذكّر تقدّمك، يبني خططاً ومختبرات تطبيقية، ويراجع عملك. ميزات لا تجدها في ChatGPT أو DeepSeek مهما دفعت.
          </p>
        </div>

        {hasPendingRequest && !submitted && (
          <div className="mb-8 p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5 flex items-start gap-4">
            <Clock className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-400 mb-1">طلبك قيد المراجعة</p>
              <p className="text-sm text-muted-foreground">
                أرسلت طلب اشتراك باسم الحساب{" "}
                <strong className="text-foreground">{latestRequest?.accountName}</strong>{" "}
                لباقة{" "}
                <strong className="text-foreground">{plans[latestRequest?.planType as PlanKey]?.name || latestRequest?.planType}</strong>.
                {" "}سيتم تفعيل جواهرك فور موافقة المشرف.
              </p>
            </div>
          </div>
        )}

        {submitted && (
          <div className="mb-8 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-400 mb-1">تم إرسال طلبك بنجاح!</p>
              <p className="text-sm text-muted-foreground">
                سيراجع المشرف طلبك ويفعّل اشتراكك مباشرة بعد التحقق.
              </p>
            </div>
          </div>
        )}

        {hasIncompleteRequest && (
          <div className="mb-8 p-5 rounded-2xl border border-red-500/30 bg-red-500/5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-400 mb-2">المبلغ المرسل غير مكتمل</p>
              <p className="text-sm text-muted-foreground mb-3">
                رسالة من المشرف: <span className="text-foreground font-medium">{latestRequest?.adminNote}</span>
              </p>
              <p className="text-sm text-orange-400 font-medium">
                يرجى إكمال المبلغ وإرسال طلب جديد بعد الدفع.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="text-center mb-3">
            <p className="text-sm font-bold text-gold mb-1">أولاً: حدد منطقتك</p>
            <p className="text-xs text-muted-foreground">لكل منطقة رقم حساب كريمي مختلف وسعر مختلف — اختر المنطقة الصحيحة حتى يظهر لك الحساب المناسب للدفع</p>
          </div>
          <div className="flex justify-center">
            <div className="glass p-1 rounded-2xl flex gap-2 border-white/10">
              <button
                className={`px-6 sm:px-8 py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${region === 'north' ? 'gradient-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRegion('north')}
              >
                المحافظات الشمالية
              </button>
              <button
                className={`px-6 sm:px-8 py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${region === 'south' ? 'gradient-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRegion('south')}
              >
                المحافظات الجنوبية
              </button>
            </div>
          </div>
        </div>

        {/* Subject picker — REQUIRED before plan selection. Each subject is
            its own subscription; gems do NOT cross subject boundaries. */}
        <div className="mb-6">
          <div className="text-center mb-3">
            <p className="text-sm font-bold text-gold mb-1">ثانياً: اختر التخصص الذي ستشترك فيه</p>
            <p className="text-xs text-muted-foreground">
              كل تخصص اشتراك مستقل — جواهر باقة الأمن السيبراني تُستخدم في الأمن السيبراني فقط، وهكذا لكل مادة.
            </p>
          </div>

          {/* Custom subject picker */}
          <div className="max-w-2xl mx-auto" ref={pickerRef} data-testid="subject-picker">
            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setShowSubjectPicker(p => !p)}
              className={`w-full h-14 rounded-2xl px-5 flex items-center justify-between gap-3 font-bold text-base border-2 transition-all
                ${selectedSubject
                  ? "bg-gold/10 border-gold/60 text-gold hover:bg-gold/20"
                  : "bg-black/40 border-white/10 text-muted-foreground hover:border-gold/30 hover:text-foreground"}`}
            >
              <span className="flex items-center gap-2">
                {selectedSubject
                  ? <><span className="text-xl">{selectedSubject.emoji}</span> {selectedSubject.name}</>
                  : "— اختر تخصصك —"}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform shrink-0 ${showSubjectPicker ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown panel */}
            {showSubjectPicker && (
              <div className="mt-2 rounded-2xl border border-white/10 bg-[hsl(222,28%,8%)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Tabs */}
                <div className="flex border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setPickerTab("university")}
                    className={`flex-1 py-3 text-sm font-bold transition-colors
                      ${pickerTab === "university"
                        ? "bg-emerald-500/15 text-emerald-400 border-b-2 border-emerald-400"
                        : "text-muted-foreground hover:text-foreground"}`}
                  >
                    🎓 الجامعي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab("skills")}
                    className={`flex-1 py-3 text-sm font-bold transition-colors
                      ${pickerTab === "skills"
                        ? "bg-blue-500/15 text-blue-400 border-b-2 border-blue-400"
                        : "text-muted-foreground hover:text-foreground"}`}
                  >
                    ⚡ المهارات
                  </button>
                </div>

                {/* University subjects */}
                {pickerTab === "university" && (
                  <div className="p-3 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {university.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedSubjectId(s.id); setSelectedPlan(null); setShowSubjectPicker(false); }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-right transition-all
                            ${selectedSubjectId === s.id
                              ? "bg-gold/20 border border-gold/60 text-gold"
                              : "bg-white/5 border border-white/5 text-foreground hover:bg-white/10 hover:border-white/20"}`}
                        >
                          <span className="text-lg shrink-0">{s.emoji}</span>
                          <span className="leading-tight">{s.name}</span>
                          {selectedSubjectId === s.id && <Check className="w-3.5 h-3.5 text-gold mr-auto shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills subjects — grouped by category */}
                {pickerTab === "skills" && (
                  <div className="p-3 max-h-64 overflow-y-auto space-y-4">
                    {skills.map((category) => (
                      <div key={category.id}>
                        <p className="text-xs font-bold text-muted-foreground mb-2 px-1">{category.name}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {category.subjects.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { setSelectedSubjectId(s.id); setSelectedPlan(null); setShowSubjectPicker(false); }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-right transition-all
                                ${selectedSubjectId === s.id
                                  ? "bg-blue-500/20 border border-blue-500/60 text-blue-300"
                                  : "bg-white/5 border border-white/5 text-foreground hover:bg-white/10 hover:border-white/20"}`}
                            >
                              <span className="text-lg shrink-0">{s.emoji}</span>
                              <span className="leading-tight">{s.name}</span>
                              {selectedSubjectId === s.id && <Check className="w-3.5 h-3.5 text-blue-400 mr-auto shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSubject && (
              <p className="text-xs text-center text-emerald-400 mt-2">
                ✓ ستشترك في تخصص: <strong>{selectedSubject.name}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-gold mb-1">ثالثاً: اضغط على الباقة التي تناسبك</p>
          <p className="text-xs text-muted-foreground">
            {selectedSubject
              ? `الباقة المختارة ستفعّل جواهر تخصّص "${selectedSubject.name}" فقط — لن تعمل في أي تخصص آخر.`
              : "اختر تخصصاً أولاً ثم ستظهر لك تفاصيل الدفع المطلوبة."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {(Object.keys(plans) as PlanKey[]).map(key => {
            const plan = plans[key];
            const isSelected = selectedPlan === key;
            const price = region === 'north' ? plan.priceNorthNum : plan.priceSouthNum;
            return (
              <div
                key={key}
                onClick={() => {
                  if (!selectedSubject) {
                    toast({
                      variant: "destructive",
                      title: "اختر التخصص أولاً",
                      description: "اختر التخصص من القائمة المنسدلة في الأعلى قبل اختيار الباقة.",
                    });
                    return;
                  }
                  setSelectedPlan(key);
                }}
                className={`rounded-3xl p-8 transition-all duration-300 border-2 relative ${
                  !selectedSubject
                    ? 'glass border-white/5 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'cursor-pointer border-gold bg-gold/5 shadow-[0_0_30px_rgba(245,158,11,0.2)] transform scale-105 z-10'
                    : 'cursor-pointer glass border-white/5 hover:border-gold/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground font-bold text-xs px-4 py-1 rounded-full whitespace-nowrap">
                    الأكثر طلباً
                  </div>
                )}
                <div className="mb-4">{plan.icon}</div>
                <h3 className={`text-2xl font-bold mb-1 ${isSelected ? 'text-gold' : ''}`}>{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                <div className="mb-2">
                  <span className={`text-3xl font-black ${isSelected ? 'text-gold' : ''}`}>{price}</span>
                  <span className="text-sm text-muted-foreground mr-1">ريال / ١٤ يوماً</span>
                </div>
                <div className="text-xs text-gold font-bold mb-2 flex items-center gap-1">
                  <span>💎</span>
                  <span>{plan.gems.toLocaleString("ar-EG")} جوهرة إجمالي</span>
                </div>
                <div className="text-xs text-emerald-400 font-bold mb-6">
                  حتى {plan.gemsPerDay} جوهرة / يوم — لهذا التخصص فقط
                </div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-gold' : 'text-emerald'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black flex items-center justify-center gap-3 mb-3">
              <Sparkles className="w-7 h-7 text-gold" />
              لماذا نُخبة وليس ChatGPT أو DeepSeek؟
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              المساعدات العامة ممتازة للأسئلة العابرة، لكنها لا تعرفك ولا تتذكر تقدّمك. نُخبة بُنيت خصيصاً لتكون <span className="text-gold font-bold">معلّمك المتخصّص</span> طوال رحلة تعلّمك.
            </p>
          </div>

          <div className="glass rounded-3xl border-2 border-gold/20 overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="border-b border-white/10 bg-gradient-to-l from-gold/10 via-gold/5 to-transparent">
                    <th className="p-3 sm:p-4 text-sm sm:text-base font-bold text-foreground/80 w-[40%]">الميزة</th>
                    <th className="p-3 sm:p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Crown className="w-5 h-5 text-gold" />
                        <span className="text-sm sm:text-base font-black text-gold">نُخبة</span>
                      </div>
                    </th>
                    <th className="p-3 sm:p-4 text-center">
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground">ChatGPT</span>
                    </th>
                    <th className="p-3 sm:p-4 text-center">
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground">DeepSeek</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { feature: "يتذكّر تقدّمك ونقاط ضعفك بين الجلسات", n: true, c: false, d: false },
                    { feature: "يبني خطة تعلّم شخصية لمادتك", n: true, c: false, d: false },
                    { feature: "مختبرات تطبيقية تفاعلية داخل المنصة", n: true, c: false, d: false },
                    { feature: "مراجعة معلّم بشري لتقاريرك وأعمالك", n: true, c: false, d: false },
                    { feature: "محتوى مبني على المنهج اليمني والجامعي المحلي", n: true, c: false, d: false },
                    { feature: "إجابات عامة على الأسئلة", n: true, c: true, d: true },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-white/[0.015]" : ""} hover:bg-gold/[0.03] transition-colors`}>
                      <td className="p-3 sm:p-4 font-medium text-foreground/90 text-xs sm:text-sm leading-relaxed">{row.feature}</td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.n ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold/15 border border-gold/30">
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gold" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/10 border border-red-500/20">
                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" strokeWidth={3} />
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.c ? (
                          <Check className="w-5 h-5 text-emerald-400/80 mx-auto" strokeWidth={2.5} />
                        ) : (
                          <X className="w-5 h-5 text-red-400/60 mx-auto" strokeWidth={2.5} />
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {row.d ? (
                          <Check className="w-5 h-5 text-emerald-400/80 mx-auto" strokeWidth={2.5} />
                        ) : (
                          <X className="w-5 h-5 text-red-400/60 mx-auto" strokeWidth={2.5} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 sm:p-5 bg-gradient-to-l from-gold/10 to-transparent border-t border-gold/15">
              <p className="text-xs sm:text-sm text-center text-foreground/80 leading-relaxed">
                <span className="text-gold font-bold">الخلاصة:</span> أنت لا تدفع مقابل "محادثة" — أنت تستثمر في معلّم متخصّص يرافقك خطوة بخطوة حتى تتقن مادتك.
              </p>
            </div>
          </div>
        </div>

        {/* ── Claude branding + smart-rotation reassurance ─────────────────── */}
        <div className="mb-14" dir="rtl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black flex items-center justify-center gap-3 mb-3">
              <ShieldCheck className="w-7 h-7 text-gold" />
              تقنية المعلّم وضمان الجودة
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              نريدك أن تعرف بالضبط ما الذي يقف خلف معلّمك الذكي في نُخبة، ولماذا يبقى معك حتى آخر يوم في اشتراكك.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Card A — AI tech branding */}
            <div className="glass rounded-3xl border-2 border-gold/20 p-6 sm:p-7 shadow-[0_0_40px_rgba(245,158,11,0.06)] flex flex-col">
              <div className="flex items-center gap-4 mb-5">
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] sm:text-xs font-bold text-gold/80 mb-1 tracking-wide">
                    POWERED BY AI
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">
                    مدعوم بأقوى نماذج الذكاء الاصطناعي
                  </h3>
                </div>
              </div>
              <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed mb-4">
                معلّمك في نُخبة لا يعمل على ChatGPT ولا DeepSeek — بل على نماذج ذكاء اصطناعي متخصصة اخترناها بعناية لتناسب التعلم الشخصي العميق.
              </p>
              <ul className="space-y-2.5 text-sm text-foreground/80 mt-auto">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" strokeWidth={3} />
                  <span>
                    <span className="font-bold text-foreground">نموذج التفكير العميق</span> للتشخيص، اختبار الفهم، تقارير المختبر، ولحظات "لم أفهم".
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" strokeWidth={3} />
                  <span>
                    <span className="font-bold text-foreground">نموذج الاستجابة السريعة</span> للأسئلة اليومية والإجابات الفورية دون انتظار.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card B — Smart daily rotation reassurance */}
            <div className="glass rounded-3xl border-2 border-emerald-500/20 p-6 sm:p-7 shadow-[0_0_40px_rgba(16,185,129,0.06)] flex flex-col">
              <div className="flex items-center gap-4 mb-5">
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-400/90 mb-1 tracking-wide">
                    ضمان الاستمرارية
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground leading-tight">
                    نظام جودة ذكي طوال الأسبوعين
                  </h3>
                </div>
              </div>
              <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed mb-4">
                صمّمنا نظاماً يضمن لك خدمة <span className="text-emerald-400 font-bold">متّسقة وعادلة</span> طوال أيام اشتراكك الـ١٤ — لصالحك أنت قبل أي شيء آخر.
              </p>
              <ul className="space-y-2.5 text-sm text-foreground/80 mt-auto">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" strokeWidth={3} />
                  <span>
                    لن يُقطع عنك المعلّم في منتصف الاشتراك مهما كان استخدامك — ستستمر في التعلّم كل يوم حتى آخر يوم.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" strokeWidth={3} />
                  <span>
                    النموذجان (العميق والسريع) يتناوبان داخل اليوم بحسب نوع سؤالك، فيصلك دائماً النموذج المناسب للحظة المناسبة.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" strokeWidth={3} />
                  <span>
                    كل صباح يُجدَّد رصيدك اليومي تلقائياً — اليوم الجديد يبدأ دائماً بصفحة بيضاء.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black flex items-center justify-center gap-3 mb-2">
              <ClipboardCheck className="w-7 h-7 text-gold" />
              كيف تشترك؟ — خطوات بسيطة وواضحة
            </h2>
            <p className="text-muted-foreground">اتبع هذه الخطوات وسيتم تفعيل اشتراكك خلال دقائق</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "١", icon: <Crown className="w-6 h-6 text-gold" />, title: "اختر الباقة", desc: "اختر الباقة المناسبة لك (برونزية، فضية، أو ذهبية) من الأعلى" },
              { step: "٢", icon: <Banknote className="w-6 h-6 text-emerald-400" />, title: "حوّل المبلغ", desc: "افتح تطبيق الكريمي وحوّل المبلغ المطلوب إلى رقم الحساب الظاهر أدناه" },
              { step: "٣", icon: <Send className="w-6 h-6 text-blue-400" />, title: "أرسل الطلب", desc: "اكتب اسم الحساب الذي حوّلت منه (نفس الاسم في الكريمي) واضغط تأكيد" },
              { step: "٤", icon: <UserCheck className="w-6 h-6 text-purple-400" />, title: "التفعيل الفوري", desc: "المشرف يتحقق من وصول المبلغ ويفعّل اشتراكك — ستصلك رسالة التفعيل" },
            ].map(s => (
              <div key={s.step} className="glass rounded-2xl p-5 border border-white/5 relative">
                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full gradient-gold flex items-center justify-center text-sm font-black text-black">{s.step}</div>
                <div className="mb-3 mt-1">{s.icon}</div>
                <h3 className="font-bold text-base mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-14 p-6 rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-emerald-400 mb-3">ضمان التفعيل — اطمئن تماماً</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "اشتراكك يُفعّل فوراً بعد التحقق من وصول التحويل — لا تأخير",
                  "إذا لم يصل المبلغ أو كان ناقصاً، سنُبلغك فوراً برسالة واضحة",
                  "كل تحويل يُسجّل باسمك تلقائياً — أموالك محفوظة ومضمونة",
                  "إذا واجهت أي مشكلة، تواصل معنا وسنحلها فوراً",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass p-8 rounded-3xl border-white/5">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-gold" />
              الدفع وتأكيد الاشتراك
            </h3>

            {!selectedPlan ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-center border-2 border-dashed border-gold/20 rounded-2xl px-4 bg-gold/[0.02]">
                <div>
                  <ChevronDown className="w-8 h-8 mx-auto mb-2 text-gold/40 animate-bounce" style={{animationDuration: '2s'}} />
                  <p className="text-base font-bold mb-1 text-gold/70">لم تختر باقة بعد</p>
                  <p className="text-xs">ارجع للأعلى واضغط على إحدى الباقات الثلاث (برونزية، فضية، أو ذهبية) — بعدها سيظهر هنا رقم حساب الكريمي وتفاصيل الدفع</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-xs text-emerald-400 font-bold text-center mb-1">الخطوة الأولى: حوّل المبلغ عبر الكريمي</p>
                  <p className="text-[11px] text-center text-muted-foreground">افتح تطبيق الكريمي على هاتفك وحوّل المبلغ إلى الرقم التالي</p>
                </div>

                <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                  <p className="text-sm text-muted-foreground mb-1">المبلغ المطلوب:</p>
                  {welcomeOffer.active ? (() => {
                    const basePriceNum = (BASE_PRICES_DISPLAY[region] as any)[selectedPlan] as number;
                    const finalPriceNum = Math.round(basePriceNum * (1 - welcomeOffer.percent / 100));
                    return (
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-gold font-bold text-2xl" data-testid="welcome-final-price">
                            {finalPriceNum.toLocaleString("ar-EG")} ريال
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            {basePriceNum.toLocaleString("ar-EG")} ريال
                          </span>
                        </div>
                        <p className="text-xs text-gold mt-1">
                          خصم {welcomeOffer.percent}٪ عبر العرض الترحيبي — وفّرت {(basePriceNum - finalPriceNum).toLocaleString("ar-EG")} ريال
                        </p>
                      </div>
                    );
                  })() : discountInfo ? (
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-emerald-400 font-bold text-2xl">
                          {discountInfo.finalPrice.toLocaleString("ar-EG")} ريال
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {discountInfo.basePrice.toLocaleString("ar-EG")} ريال
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400 mt-1">
                        خصم {discountInfo.percent}% عبر كود <span className="font-mono font-bold">{discountInfo.code}</span> — وفّرت {discountInfo.discountAmount.toLocaleString("ar-EG")} ريال
                      </p>
                    </div>
                  ) : (
                    <p className="text-gold font-bold text-xl mb-4">
                      {region === 'north' ? plans[selectedPlan].priceNorth : plans[selectedPlan].priceSouth} ريال
                    </p>
                  )}

                  {/* Welcome offer banner — replaces coupon input when active */}
                  {welcomeOffer.active ? (
                    <div
                      className="mb-4 p-4 rounded-xl bg-gradient-to-br from-gold/15 via-amber-500/10 to-orange-500/10 border border-gold/40"
                      data-testid="welcome-offer-banner"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-gold" />
                        <p className="font-bold text-gold">العرض الترحيبي مُفعّل — خصم {welcomeOffer.percent}٪</p>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed mb-2">
                        سيُطبَّق الخصم تلقائياً عند إرسال طلب الاشتراك. لا حاجة لإدخال أي كود.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 bg-black/40 rounded-lg py-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ينتهي خلال:</span>
                        <span className="font-mono font-bold text-gold tabular-nums" data-testid="welcome-banner-countdown">
                          {welcomeRemainingLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center mt-2">
                        لا يمكن إدخال كود خصم آخر مع هذا العرض.
                      </p>
                    </div>
                  ) : (
                    /* Discount code input */
                    <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                      <p className="text-xs text-purple-300 font-bold mb-2 text-center">
                        عندك كود خصم؟ أدخله هنا قبل التحويل
                      </p>
                      {discountInfo ? (
                        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono font-bold text-emerald-400 text-sm">{discountInfo.code}</span>
                            <span className="text-xs text-emerald-400">−{discountInfo.percent}%</span>
                          </div>
                          <button
                            onClick={handleClearDiscount}
                            className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                            type="button"
                          >
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              placeholder="مثال: SUMMER20"
                              className="bg-black/40 h-10 flex-1 text-center font-mono uppercase"
                              dir="ltr"
                              value={discountInput}
                              onChange={(e) => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(null); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyDiscount(); } }}
                            />
                            <Button
                              type="button"
                              className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 h-10"
                              disabled={discountChecking || !discountInput.trim()}
                              onClick={handleApplyDiscount}
                            >
                              {discountChecking ? "..." : "تطبيق"}
                            </Button>
                          </div>
                          {discountError && (
                            <p className="text-xs text-red-400 mt-2 text-center">{discountError}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-sm font-bold mb-2">رقم حساب الكريمي:</p>
                  {region === 'north' ? (
                    <>
                      <div className="text-2xl font-bold text-gold text-center tracking-widest bg-black/50 py-4 rounded-xl border border-gold/20" dir="ltr">
                        3165778412
                      </div>
                      <p className="text-center text-sm mt-2 font-medium">باسم: <span className="text-gold">عمرو خالد عبد المولى</span></p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-gold text-center tracking-widest bg-black/50 py-4 rounded-xl border border-gold/20" dir="ltr">
                        3167076083
                      </div>
                      <p className="text-center text-sm mt-2 font-medium">باسم: <span className="text-gold">عمرو خالد عبد المولى</span></p>
                    </>
                  )}
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300 text-center font-medium">
                      تأكد من تحويل المبلغ كاملاً — أي نقص سيؤخر التفعيل
                    </p>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-400 font-bold text-center mb-1">الخطوة الثانية: أكّد الدفع هنا</p>
                  <p className="text-[11px] text-center text-muted-foreground">بعد التحويل، اكتب اسم حسابك في الكريمي واضغط تأكيد</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    اسم الحساب المرسل منه
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    اكتب <strong className="text-foreground">نفس الاسم</strong> الظاهر في تطبيق الكريمي الخاص بك (الاسم المسجّل في حسابك)
                  </p>
                  <Input
                    placeholder="مثال: أحمد محمد علي"
                    className="bg-black/40 h-12 text-right"
                    dir="rtl"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>ملاحظات (اختياري)</Label>
                  <Textarea
                    placeholder="مثال: حوّلت من حساب أخي، أو رقم العملية..."
                    className="bg-black/40"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full gradient-gold text-primary-foreground font-bold h-14 rounded-xl text-lg shadow-lg shadow-gold/20"
                  disabled={!accountName.trim() || createReqMutation.isPending}
                  onClick={handlePaymentSubmit}
                >
                  {createReqMutation.isPending ? "جاري الإرسال..." : "تأكيد الدفع وإرسال الطلب ✓"}
                </Button>

                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-xs text-center text-emerald-400 font-bold mb-1">ماذا بعد الضغط؟</p>
                  <p className="text-xs text-center text-muted-foreground">
                    سيصلنا طلبك فوراً ← نتحقق من وصول التحويل ← نفعّل اشتراكك ← تبدأ التعلم مباشرة!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="glass p-8 rounded-3xl border-emerald/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-40 h-40 bg-emerald/10 rounded-br-full -z-10" />
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-emerald" />
                تفعيل عبر كود
              </h3>
              <p className="text-muted-foreground mb-6">
                إذا حصلت على كود تفعيل من وكلائنا أو كهدية، أدخله هنا لتفعيل اشتراكك فوراً — بدون تحويل.
              </p>

              <div className="space-y-4">
                <Input
                  placeholder="أدخل كود التفعيل المكون من 16 حرف"
                  className="bg-black/40 h-14 text-center tracking-widest text-lg font-mono uppercase focus-visible:ring-emerald focus-visible:border-emerald"
                  dir="ltr"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                />
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl text-lg shadow-lg shadow-emerald/20"
                  disabled={!activationCode || activateMutation.isPending}
                  onClick={handleActivationSubmit}
                >
                  {activateMutation.isPending ? "جاري التفعيل..." : "تفعيل الحساب"}
                </Button>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border-white/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gold" />
                أسئلة شائعة
              </h3>
              <div className="space-y-4">
                {[
                  { q: "كم يستغرق تفعيل الاشتراك؟", a: "عادةً خلال دقائق من إرسال الطلب. في أقصى حد لا يتجاوز بضع ساعات." },
                  { q: "ماذا لو حوّلت مبلغاً خاطئاً؟", a: "سنرسل لك إشعاراً بالمبلغ الناقص، ويمكنك إكماله وإرسال طلب جديد." },
                  { q: "هل يمكنني الاشتراك في أكثر من مادة؟", a: "نعم! كل مادة لها اشتراك منفصل. يمكنك الاشتراك في أي عدد من المواد." },
                  { q: "متى يبدأ حساب الأسبوعين؟", a: "يبدأ العد من لحظة تفعيل الاشتراك، وليس من لحظة الدفع." },
                  { q: "هل أموالي في أمان؟", a: "نعم. كل تحويل مسجّل ومرتبط بحسابك. إذا حدث أي خطأ، تواصل معنا وسنحل المشكلة فوراً." },
                ].map((item, i) => (
                  <div key={i} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-bold mb-1 text-gold/90">{item.q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black mb-2">ماذا يقول طلابنا؟</h2>
            <p className="text-muted-foreground text-sm">تجارب حقيقية من طلاب استفادوا من نُخبة</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "عبدالله م.", subject: "البرمجة بلغة Python", text: "بصراحة ما توقعت إن الذكاء الاصطناعي يقدر يشرح بهالطريقة. كنت أعاني من الحلقات التكرارية وما كنت فاهمها أبداً، المعلم الذكي شرحها لي خطوة خطوة لين فهمتها. أحسن استثمار.", stars: 5 },
              { name: "سارة أ.", subject: "قواعد البيانات", text: "كنت خايفة من SQL وكل ما أشوف استعلام معقد أحس بإحباط. بعد أسبوعين مع نُخبة صرت أكتب استعلامات JOIN لحالي. المعلم صبور ويعيد الشرح بأكثر من طريقة.", stars: 5 },
              { name: "محمد ع.", subject: "تطوير الويب", text: "الشي اللي عجبني إنه ما يعطيك الإجابة مباشرة، يخليك تفكر وتوصل لها بنفسك. هذا اللي خلاني فعلاً أتعلم مو بس أحفظ. وبيئة الأكواد داخل المنصة وفرت علي وقت كثير.", stars: 5 },
              { name: "أحمد ن.", subject: "هياكل البيانات", text: "كنت أدرس من يوتيوب وما كنت فاهم شي بالضبط. هنا الفرق إنك تسأل وتحصل جواب مخصص لمشكلتك بالتحديد. الباقة الفضية كافية ووافية.", stars: 4 },
              { name: "نور هـ.", subject: "الخوارزميات", text: "أول مرة أحس إن دراسة الخوارزميات ممتعة. المعلم يربط كل شي بأمثلة عملية وما يخليك تحس إنك غبي لما تغلط. صرت أحل مسائل كنت أشوفها مستحيلة.", stars: 5 },
              { name: "يوسف ك.", subject: "تطوير تطبيقات الجوال", text: "بدأت بالـ 15 رسالة المجانية وقلت أجرب. بعدها اشتركت مباشرة لأن الفايدة كانت واضحة من أول جلسة. التفعيل كان سريع عبر الكريمي.", stars: 5 },
            ].map((review, i) => (
              <div key={i} className="glass rounded-2xl p-5 border border-white/5 flex flex-col">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: review.stars }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-gold fill-gold" />
                  ))}
                  {Array.from({ length: 5 - review.stars }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-white/15" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed flex-1 mb-3">"{review.text}"</p>
                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold">{review.name}</span>
                  <span className="text-[10px] text-muted-foreground">{review.subject}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-14 p-6 sm:p-8 rounded-3xl border-2 border-blue-500/20 bg-blue-500/5">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
              <PhoneCall className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-black text-blue-300 mb-2">واجهتك مشكلة؟ نحن هنا لمساعدتك</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              إذا واجهت أي صعوبة في الاشتراك أو الدفع أو التفعيل، لا تتردد — تواصل معنا مباشرة وسنساعدك فوراً
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <a
              href="/support"
              className="glass rounded-2xl p-5 border border-blue-500/20 hover:border-blue-500/40 transition-all group text-center"
            >
              <MessageCircle className="w-8 h-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-base mb-1">رسائل الدعم الداخلية</p>
              <p className="text-xs text-muted-foreground mb-3">أرسل رسالة مباشرة من داخل المنصة وسيرد عليك المشرف في أقرب وقت</p>
              <span className="text-xs text-blue-400 font-bold">اذهب لصفحة الدعم ←</span>
            </a>
            <div className="glass rounded-2xl p-5 border border-white/5 text-center">
              <Send className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-base mb-1">كيف ترسل رسالة دعم؟</p>
              <div className="text-xs text-muted-foreground text-right space-y-2">
                <p className="flex items-start gap-2"><span className="text-gold font-bold shrink-0">١.</span> اضغط على "الدعم" من القائمة الجانبية أو الرابط بجانبه</p>
                <p className="flex items-start gap-2"><span className="text-gold font-bold shrink-0">٢.</span> اكتب عنوان لمشكلتك (مثال: "مشكلة في الدفع")</p>
                <p className="flex items-start gap-2"><span className="text-gold font-bold shrink-0">٣.</span> اشرح المشكلة بالتفصيل في خانة الرسالة</p>
                <p className="flex items-start gap-2"><span className="text-gold font-bold shrink-0">٤.</span> اضغط إرسال — سيصلك رد المشرف مباشرة في نفس الصفحة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
