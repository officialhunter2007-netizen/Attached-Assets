import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
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
import { Crown, CreditCard, Key, CheckCircle2, Zap, Star, Gem, Clock, AlertTriangle, CheckCircle, MessageCircle, BadgeCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

type PlanKey = "bronze" | "silver" | "gold";

const plans: Record<PlanKey, {
  name: string;
  icon: React.ReactNode;
  messages: number;
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
    messages: 30,
    priceNorth: "١٬٠٠٠ ريال",
    priceSouth: "٣٬٠٠٠ ريال",
    priceNorthNum: "١٬٠٠٠",
    priceSouthNum: "٣٬٠٠٠",
    desc: "مثالية للبداية وتجربة المنصة",
    color: "text-orange-400",
    features: ["٣٠ رسالة مع المعلم الذكي", "جميع مسارات التعلم", "تتبع التقدم"],
  },
  silver: {
    name: "الفضية",
    icon: <Star className="w-7 h-7 text-slate-300" />,
    messages: 60,
    priceNorth: "٢٬٠٠٠ ريال",
    priceSouth: "٦٬٠٠٠ ريال",
    priceNorthNum: "٢٬٠٠٠",
    priceSouthNum: "٦٬٠٠٠",
    desc: "للمتعلم الجاد الذي يريد التقدم",
    color: "text-slate-300",
    features: ["٦٠ رسالة مع المعلم الذكي", "جميع مسارات التعلم", "تتبع التقدم", "أولوية الدعم"],
    popular: true,
  },
  gold: {
    name: "الذهبية",
    icon: <Gem className="w-7 h-7 text-gold" />,
    messages: 100,
    priceNorth: "٣٬٠٠٠ ريال",
    priceSouth: "٩٬٠٠٠ ريال",
    priceNorthNum: "٣٬٠٠٠",
    priceSouthNum: "٩٬٠٠٠",
    desc: "الخيار الأمثل لأقصى فائدة تعليمية",
    color: "text-gold",
    features: ["١٠٠ رسالة مع المعلم الذكي", "جميع مسارات التعلم", "تتبع التقدم", "أولوية الدعم", "الميزات المستقبلية"],
  },
};

export default function Subscription() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [region, setRegion] = useState<"north" | "south">("north");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createReqMutation = useCreateSubscriptionRequest();
  const activateMutation = useActivateSubscription();
  const { data: myRequests, refetch: refetchMyRequests } = useGetMySubscriptionRequests();

  const latestRequest = myRequests
    ?.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  const hasPendingRequest = latestRequest?.status === "pending";
  const hasIncompleteRequest = latestRequest?.status === "incomplete";

  const isSubscribed = !!user?.nukhbaPlan && user.nukhbaPlan !== "free";
  const currentPlan = isSubscribed ? plans[user!.nukhbaPlan as PlanKey] : null;

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !accountName.trim()) return;
    try {
      await createReqMutation.mutateAsync({
        data: {
          planType: selectedPlan,
          region,
          accountName: accountName.trim(),
          notes: notes.trim() || null,
        }
      });
      toast({
        title: "تم إرسال الطلب",
        description: "سيراجع المشرف طلبك ويفعّل الاشتراك خلال وقت قصير",
        className: "bg-emerald-600 border-none text-white"
      });
      setSubmitted(true);
      setSelectedPlan(null);
      setAccountName("");
      setNotes("");
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
          description: `تم تفعيل باقة ${plans[res.planType as PlanKey]?.name || res.planType} لحسابك.`,
          className: "bg-emerald-600 border-none text-white"
        });
        if (user) {
          setUser({ ...user, nukhbaPlan: res.planType });
        }
        setActivationCode("");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message || "كود التفعيل غير صالح أو مستخدم مسبقاً" });
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-4xl font-black mb-4">{isSubscribed ? "اشتراكك الحالي" : "اختر باقتك"}</h1>
          <p className="text-xl text-muted-foreground">
            {isSubscribed
              ? "أنت مشترك حالياً في منصة نُخبة"
              : "استثمر في مستقبلك مع أقوى منصة تعليمية ذكية في اليمن"}
          </p>
        </div>

        {/* ── Active Subscription Card ── */}
        {isSubscribed && currentPlan && (
          <div className="max-w-lg mx-auto mb-10">
            <div className="glass rounded-3xl p-8 border-2 border-gold/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] text-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-5">
                <BadgeCheck className="w-10 h-10 text-gold" />
              </div>
              <div className="flex justify-center mb-3">{currentPlan.icon}</div>
              <h2 className={`text-3xl font-black mb-2 ${currentPlan.color}`}>
                الباقة {currentPlan.name}
              </h2>
              <p className="text-muted-foreground mb-6">{currentPlan.desc}</p>

              <div className="bg-black/30 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
                <MessageCircle className="w-5 h-5 text-gold" />
                <span className="text-lg font-bold">
                  {user?.messagesLeft ?? currentPlan.messages} رسالة متبقية
                </span>
              </div>

              <ul className="space-y-2 text-sm text-right mb-2">
                {currentPlan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-gold" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Non-subscribed view ── */}
        {!isSubscribed && (
          <>
            {/* Status Banners */}
            {hasPendingRequest && !submitted && (
              <div className="mb-8 p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5 flex items-start gap-4">
                <Clock className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-orange-400 mb-1">طلبك قيد المراجعة</p>
                  <p className="text-sm text-muted-foreground">
                    أرسلت طلب اشتراك باسم الحساب <strong className="text-foreground">{latestRequest.accountName}</strong> لباقة{" "}
                    <strong className="text-foreground">{plans[latestRequest.planType as PlanKey]?.name || latestRequest.planType}</strong>.
                    سيتم تفعيل اشتراكك فور موافقة المشرف.
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
                    سيراجع المشرف طلبك ويفعّل اشتراكك مباشرة بعد التحقق. سيظهر لك إشعار هنا في حال وجود أي ملاحظة.
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
                    رسالة من المشرف: <span className="text-foreground font-medium">{latestRequest.adminNote}</span>
                  </p>
                  <p className="text-sm text-orange-400 font-medium">
                    يرجى إكمال المبلغ وإرسال طلب جديد بعد الدفع.
                  </p>
                </div>
              </div>
            )}

            {/* Region Toggle */}
            <div className="flex justify-center mb-12">
              <div className="glass p-1 rounded-2xl flex gap-2 border-white/10">
                <button
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${region === 'north' ? 'gradient-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setRegion('north')}
                >
                  المحافظات الشمالية
                </button>
                <button
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${region === 'south' ? 'gradient-gold text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setRegion('south')}
                >
                  المحافظات الجنوبية
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {(Object.keys(plans) as PlanKey[]).map(key => {
                const plan = plans[key];
                const isSelected = selectedPlan === key;
                const price = region === 'north' ? plan.priceNorthNum : plan.priceSouthNum;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`cursor-pointer rounded-3xl p-8 transition-all duration-300 border-2 relative ${
                      isSelected
                        ? 'border-gold bg-gold/5 shadow-[0_0_30px_rgba(245,158,11,0.2)] transform scale-105 z-10'
                        : 'glass border-white/5 hover:border-gold/30'
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
                      <span className="text-sm text-muted-foreground mr-1">ريال / أسبوعين</span>
                    </div>
                    <div className="text-xs text-emerald font-bold mb-6">{plan.messages} رسالة كل أسبوعين</div>
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

            <div className="grid md:grid-cols-2 gap-8">
              {/* Payment Form */}
              <div className="glass p-8 rounded-3xl border-white/5">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-gold" />
                  الدفع وتأكيد الاشتراك
                </h3>

                {!selectedPlan ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-center border-2 border-dashed border-white/10 rounded-2xl">
                    الرجاء اختيار إحدى الباقات في الأعلى<br />لعرض تفاصيل الدفع
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                      <p className="text-sm text-muted-foreground mb-1">المبلغ المطلوب:</p>
                      <p className="text-gold font-bold text-lg mb-3">
                        {region === 'north' ? plans[selectedPlan].priceNorth : plans[selectedPlan].priceSouth} ريال
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">قم بتحويل المبلغ إلى حسابنا في الكريمي:</p>
                      {region === 'north' ? (
                        <>
                          <div className="text-2xl font-bold text-gold text-center tracking-widest bg-black/50 py-3 rounded-xl border border-gold/20" dir="ltr">
                            3165778412
                          </div>
                          <p className="text-center text-xs mt-2 text-muted-foreground">باسم: عمرو خالد عبد المولى</p>
                        </>
                      ) : (
                        <div className="bg-black/30 py-4 rounded-xl border border-white/10 text-center">
                          <p className="text-sm text-muted-foreground">سيتم إضافة حساب المحافظات الجنوبية قريباً</p>
                          <p className="text-xs text-muted-foreground mt-1">تواصل معنا للدفع في الوقت الحالي</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold">
                        اسم الحساب المرسل منه
                      </Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        أدخل الاسم الظاهر في تطبيق الكريمي عند إرسال المبلغ
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
                        placeholder="أي ملاحظات إضافية حول التحويل..."
                        className="bg-black/40"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full gradient-gold text-primary-foreground font-bold h-12 rounded-xl text-lg shadow-lg shadow-gold/20"
                      disabled={!accountName.trim() || createReqMutation.isPending}
                      onClick={handlePaymentSubmit}
                    >
                      {createReqMutation.isPending ? "جاري الإرسال..." : "تأكيد الدفع وإرسال الطلب"}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      سيقوم المشرف بالتحقق من وصول المبلغ باسمك وتفعيل الاشتراك مباشرة
                    </p>
                  </div>
                )}
              </div>

              {/* Activation Code */}
              <div className="glass p-8 rounded-3xl border-emerald/20 relative overflow-hidden h-fit">
                <div className="absolute top-0 left-0 w-40 h-40 bg-emerald/10 rounded-br-full -z-10" />
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Key className="w-6 h-6 text-emerald" />
                  تفعيل عبر كود
                </h3>
                <p className="text-muted-foreground mb-6">
                  إذا حصلت على كود تفعيل من وكلائنا أو كهدية، أدخله هنا لتفعيل اشتراكك فوراً.
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
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
