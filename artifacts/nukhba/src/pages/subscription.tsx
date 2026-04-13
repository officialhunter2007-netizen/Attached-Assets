import { useState, useEffect, useMemo } from "react";
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
import { Crown, CreditCard, Key, CheckCircle2, Zap, Star, Gem, Clock, AlertTriangle, CheckCircle, MessageCircle, BadgeCheck, BookOpen, Search, ArrowRight, ChevronDown, ShieldCheck, HelpCircle, PhoneCall, Send, Banknote, UserCheck, ClipboardCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { university, skills } from "@/lib/curriculum";

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
    features: ["٣٠ رسالة مع المعلم الذكي", "وصول كامل للمادة المختارة", "تتبع التقدم"],
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
    features: ["٦٠ رسالة مع المعلم الذكي", "وصول كامل للمادة المختارة", "تتبع التقدم", "أولوية الدعم"],
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
    features: ["١٠٠ رسالة مع المعلم الذكي", "وصول كامل للمادة المختارة", "تتبع التقدم", "أولوية الدعم", "الميزات المستقبلية"],
  },
};

const allSubjectsFlat = [
  ...university.map(s => ({ id: s.id, name: s.name, emoji: s.emoji, category: "تخصصات الجامعة" })),
  ...skills.flatMap(cat => cat.subjects.map(s => ({ id: s.id, name: s.name, emoji: s.emoji, category: cat.name }))),
];

export default function Subscription() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [targetSubjectId, setTargetSubjectId] = useState<string | null>(null);
  const [targetSubjectName, setTargetSubjectName] = useState<string | null>(null);
  const [subjectLocked, setSubjectLocked] = useState(false);

  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subject");
    const sname = params.get("subjectName");
    if (sid) {
      setTargetSubjectId(sid);
      setTargetSubjectName(sname ? decodeURIComponent(sname) : sid);
      setSubjectLocked(true);
    } else {
      setShowSubjectPicker(true);
    }
  }, []);

  const [region, setRegion] = useState<"north" | "south">("north");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [mySubjectSubs, setMySubjectSubs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/subscriptions/my-subjects", { credentials: "include" })
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setMySubjectSubs(d) : null)
      .catch(() => {});
  }, [submitted]);

  const createReqMutation = useCreateSubscriptionRequest();
  const activateMutation = useActivateSubscription();
  const { data: myRequests, refetch: refetchMyRequests } = useGetMySubscriptionRequests();

  const latestRequest = myRequests
    ?.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  const subjectRequest = targetSubjectId
    ? myRequests
        ?.filter((r: any) => r.subjectId === targetSubjectId)
        ?.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]
    : latestRequest;

  const hasPendingRequest = subjectRequest?.status === "pending";
  const hasIncompleteRequest = subjectRequest?.status === "incomplete";

  const now = new Date();
  const activeSubjectSub = targetSubjectId
    ? mySubjectSubs.find(s => s.subjectId === targetSubjectId && new Date(s.expiresAt) > now && s.messagesUsed < s.messagesLimit)
    : null;

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return allSubjectsFlat;
    return allSubjectsFlat.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [subjectSearch]);

  const groupedFilteredSubjects = useMemo(() => {
    const groups: Record<string, typeof allSubjectsFlat> = {};
    for (const s of filteredSubjects) {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    }
    return groups;
  }, [filteredSubjects]);

  const handleSelectSubject = (id: string, name: string) => {
    setTargetSubjectId(id);
    setTargetSubjectName(name);
    setShowSubjectPicker(false);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !accountName.trim() || !targetSubjectId) return;
    try {
      await createReqMutation.mutateAsync({
        data: {
          planType: selectedPlan,
          region,
          accountName: accountName.trim(),
          notes: notes.trim() || null,
          // @ts-ignore — extra fields accepted by backend
          subjectId: targetSubjectId,
          subjectName: targetSubjectName ?? undefined,
        }
      });
      toast({
        title: "تم إرسال الطلب",
        description: `سيراجع المشرف طلبك لمادة "${targetSubjectName}" ويفعّل الاشتراك قريباً`,
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
          description: (res as any).subjectId
            ? `تم تفعيل باقة ${plans[(res as any).planType as PlanKey]?.name || (res as any).planType} لمادة "${(res as any).subjectId}".`
            : `تم تفعيل الباقة بنجاح.`,
          className: "bg-emerald-600 border-none text-white"
        });
        if (user) {
          setUser({ ...user, nukhbaPlan: (res as any).planType });
        }
        setActivationCode("");
        fetch("/api/subscriptions/my-subjects", { credentials: "include" })
          .then(r => r.json())
          .then(d => Array.isArray(d) ? setMySubjectSubs(d) : null)
          .catch(() => {});
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message || "كود التفعيل غير صالح أو مستخدم مسبقاً" });
    }
  };

  const planLabelMap: Record<string, string> = { bronze: "البرونزية", silver: "الفضية", gold: "الذهبية" };

  if (showSubjectPicker) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center mb-10">
            <BookOpen className="w-14 h-14 text-gold mx-auto mb-4" />
            <h1 className="text-3xl font-black mb-3">اختر المادة أو التخصص</h1>
            <p className="text-muted-foreground text-lg">
              كل اشتراك مخصص لمادة واحدة فقط — ستدفع اشتراكاً منفصلاً لكل مادة تريدها
            </p>
          </div>

          <div className="relative mb-8 max-w-lg mx-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مادة أو تخصص..."
              className="bg-black/40 h-13 pr-12 text-right text-base"
              dir="rtl"
              value={subjectSearch}
              onChange={e => setSubjectSearch(e.target.value)}
              autoFocus
            />
          </div>

          {Object.keys(groupedFilteredSubjects).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد نتائج للبحث</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedFilteredSubjects).map(([category, subjects]) => (
                <div key={category}>
                  <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-6 h-px bg-white/20" />
                    {category}
                    <span className="w-6 h-px bg-white/20" />
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {subjects.map(s => {
                      const activeSub = mySubjectSubs.find(sub => sub.subjectId === s.id && new Date(sub.expiresAt) > now && sub.messagesUsed < sub.messagesLimit);
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSubject(s.id, s.name)}
                          className="glass border border-white/5 hover:border-gold/40 hover:bg-gold/5 rounded-2xl p-4 text-right transition-all duration-200 group relative"
                        >
                          {activeSub && (
                            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400" title="اشتراك نشط" />
                          )}
                          <div className="text-2xl mb-2">{s.emoji}</div>
                          <div className="font-bold text-sm group-hover:text-gold transition-colors">{s.name}</div>
                          {activeSub && (
                            <div className="text-xs text-emerald-400 mt-1">{activeSub.messagesLimit - activeSub.messagesUsed} رسالة متبقية</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-4xl font-black mb-4">
            اشترك في: {targetSubjectName}
          </h1>
          <p className="text-xl text-muted-foreground">
            اشتراكك سيكون مخصصاً لمادة "{targetSubjectName}" فقط — كل مادة تتطلب اشتراكاً منفصلاً
          </p>
        </div>

        <div className="mb-8 p-4 rounded-2xl border border-gold/30 bg-gold/5 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-gold shrink-0" />
          <div className="flex-1">
            <p className="text-sm">
              <strong className="text-gold">المادة المختارة:</strong>{" "}
              <span className="text-foreground">{targetSubjectName}</span>
              <span className="text-muted-foreground"> — اشتراكك سيمنحك وصولاً كاملاً لهذه المادة فقط</span>
            </p>
          </div>
          {!subjectLocked && (
            <button
              onClick={() => setShowSubjectPicker(true)}
              className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1 shrink-0"
            >
              تغيير
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>

        {activeSubjectSub && (
          <div className="max-w-lg mx-auto mb-10">
            <div className="glass rounded-3xl p-8 border-2 border-gold/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] text-center">
              <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-5">
                <BadgeCheck className="w-10 h-10 text-gold" />
              </div>
              <div className="flex justify-center mb-3">{plans[activeSubjectSub.plan as PlanKey]?.icon}</div>
              <h2 className={`text-3xl font-black mb-1 ${plans[activeSubjectSub.plan as PlanKey]?.color ?? "text-gold"}`}>
                الباقة {planLabelMap[activeSubjectSub.plan] ?? activeSubjectSub.plan}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{activeSubjectSub.subjectName ?? activeSubjectSub.subjectId}</p>
              <div className="bg-black/30 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3">
                <MessageCircle className="w-5 h-5 text-gold" />
                <span className="text-lg font-bold">
                  {activeSubjectSub.messagesLimit - activeSubjectSub.messagesUsed} رسالة متبقية
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ينتهي في: {new Date(activeSubjectSub.expiresAt).toLocaleDateString("ar-SA")}
              </p>
            </div>
          </div>
        )}

        {mySubjectSubs.filter(s => new Date(s.expiresAt) > now).length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-gold" />
              اشتراكاتك النشطة
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySubjectSubs
                .filter(s => new Date(s.expiresAt) > now)
                .map(s => (
                  <div key={s.id} className="glass rounded-2xl p-4 border border-gold/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{s.subjectName ?? s.subjectId}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        s.plan === "gold" ? "bg-gold/20 text-gold" :
                        s.plan === "silver" ? "bg-slate-500/20 text-slate-300" :
                        "bg-orange-500/20 text-orange-400"
                      }`}>{planLabelMap[s.plan] ?? s.plan}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageCircle className="w-3.5 h-3.5 text-gold" />
                      <span>{s.messagesLimit - s.messagesUsed} / {s.messagesLimit} رسالة</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      ينتهي: {new Date(s.expiresAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {hasPendingRequest && !submitted && (
          <div className="mb-8 p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5 flex items-start gap-4">
            <Clock className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-400 mb-1">طلبك قيد المراجعة</p>
              <p className="text-sm text-muted-foreground">
                أرسلت طلب اشتراك باسم الحساب{" "}
                <strong className="text-foreground">{subjectRequest?.accountName}</strong>{" "}
                لباقة{" "}
                <strong className="text-foreground">{plans[subjectRequest?.planType as PlanKey]?.name || subjectRequest?.planType}</strong>
                {(subjectRequest as any)?.subjectName && (
                  <> لمادة <strong className="text-foreground">{(subjectRequest as any).subjectName}</strong></>
                )}.
                {" "}سيتم تفعيل اشتراكك فور موافقة المشرف.
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
                رسالة من المشرف: <span className="text-foreground font-medium">{subjectRequest?.adminNote}</span>
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

        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-gold mb-1">ثانياً: اضغط على الباقة التي تناسبك</p>
          <p className="text-xs text-muted-foreground">بعد الضغط على الباقة، سيظهر لك رقم حساب الكريمي والمبلغ المطلوب تحويله في الأسفل</p>
        </div>

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
                <div className="text-xs text-gold/70 mb-4 bg-gold/5 rounded-lg p-2 text-center">
                  لمادة: {targetSubjectName}
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
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm text-center">
                  <span className="text-muted-foreground">الاشتراك مخصص لمادة: </span>
                  <strong className="text-gold">{targetSubjectName}</strong>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-xs text-emerald-400 font-bold text-center mb-1">الخطوة الأولى: حوّل المبلغ عبر الكريمي</p>
                  <p className="text-[11px] text-center text-muted-foreground">افتح تطبيق الكريمي على هاتفك وحوّل المبلغ إلى الرقم التالي</p>
                </div>

                <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                  <p className="text-sm text-muted-foreground mb-1">المبلغ المطلوب:</p>
                  <p className="text-gold font-bold text-xl mb-4">
                    {region === 'north' ? plans[selectedPlan].priceNorth : plans[selectedPlan].priceSouth} ريال
                  </p>
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
              { name: "نور هـ.", subject: "الخوارزميات", text: "أول مرة أحس إن دراسة الخوارزميات ممتعة. المعلم يربط كل شي بأمثلة عملية وما يخليك تحس إنك غبي لما تغلط. جربوها والله ما بتندمون.", stars: 5 },
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
