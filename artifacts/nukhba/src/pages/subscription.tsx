import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useCreateSubscriptionRequest, useActivateSubscription } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Crown, Shield, CreditCard, Key, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function Subscription() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  
  const [region, setRegion] = useState<"north" | "south">("north");
  const [selectedPlan, setSelectedPlan] = useState<"silver" | "gold" | "nukhba" | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [activationCode, setActivationCode] = useState("");

  const createReqMutation = useCreateSubscriptionRequest();
  const activateMutation = useActivateSubscription();

  const plans = {
    silver: { name: "الفضية", desc: "وصول كامل، مسارات غير محدودة", priceNorth: "٢٠٠٠ ريال / شهر", priceSouth: "١٨٠٠ ريال / شهر" },
    gold: { name: "الذهبية", desc: "توفير ٢٠٪ + أولوية الدعم", priceNorth: "٥٠٠٠ ريال / ٣ أشهر", priceSouth: "٤٥٠٠ ريال / ٣ أشهر" },
    nukhba: { name: "نُخبة", desc: "توفير ٤٠٪ + جميع الميزات المستقبلية", priceNorth: "١٥٠٠٠ ريال / سنة", priceSouth: "١٣٥٠٠ ريال / سنة" }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPlan || !transactionId) return;
    try {
      await createReqMutation.mutateAsync({
        data: {
          planType: selectedPlan,
          region,
          transactionId,
          notes
        }
      });
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك وتفعيله خلال 24 ساعة",
        className: "bg-emerald-600 border-none text-white"
      });
      setSelectedPlan(null);
      setTransactionId("");
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
          description: `تم تفعيل باقة ${res.planType} لحسابك.`,
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
          <h1 className="text-4xl font-black mb-4">الاشتراكات والباقات</h1>
          <p className="text-xl text-muted-foreground">استثمر في مستقبلك مع أقوى منصة تعليمية ذكية في اليمن</p>
        </div>

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
          {(Object.keys(plans) as Array<keyof typeof plans>).map(key => {
            const plan = plans[key];
            const isSelected = selectedPlan === key;
            return (
              <div 
                key={key} 
                onClick={() => setSelectedPlan(key)}
                className={`cursor-pointer rounded-3xl p-8 transition-all duration-300 border-2 ${
                  isSelected 
                    ? 'border-gold bg-gold/5 shadow-[0_0_30px_rgba(245,158,11,0.2)] transform scale-105 z-10 relative' 
                    : 'glass border-white/5 hover:border-gold/30'
                }`}
              >
                {key === 'gold' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-foreground font-bold text-xs px-4 py-1 rounded-full">الأكثر طلباً</div>}
                <h3 className={`text-2xl font-bold mb-2 ${isSelected ? 'text-gold' : ''}`}>{plan.name}</h3>
                <div className="text-3xl font-black mb-4">
                  {region === 'north' ? plan.priceNorth.split(' ')[0] : plan.priceSouth.split(' ')[0]}
                  <span className="text-lg text-muted-foreground font-normal mr-2">
                    {region === 'north' ? plan.priceNorth.substring(plan.priceNorth.indexOf(' ')) : plan.priceSouth.substring(plan.priceSouth.indexOf(' '))}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-emerald'}`} /> مسارات ذكية مخصصة</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-emerald'}`} /> محادثات مع المعلم الذكي</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-emerald'}`} /> بيئة تطبيق مدمجة</li>
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
                الرجاء اختيار إحدى الباقات في الأعلى<br/>لعرض تفاصيل الدفع
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-sm text-muted-foreground mb-2">قم بتحويل المبلغ إلى حسابنا في الكريمي:</p>
                  <div className="text-2xl font-bold text-gold text-center tracking-widest bg-black/50 py-3 rounded-xl border border-gold/20" dir="ltr">
                    712345678
                  </div>
                  <p className="text-center text-xs mt-2 text-muted-foreground">باسم: منصة نخبة التعليمية</p>
                </div>

                <div className="space-y-3">
                  <Label>رقم الحوالة (Transaction ID)</Label>
                  <Input 
                    placeholder="أدخل رقم الحوالة المكون من 9-12 رقم" 
                    className="bg-black/40 h-12 text-left" 
                    dir="ltr"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
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
                  disabled={!transactionId || createReqMutation.isPending}
                  onClick={handlePaymentSubmit}
                >
                  {createReqMutation.isPending ? "جاري الإرسال..." : "تأكيد الدفع"}
                </Button>
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
                onChange={(e) => setActivationCode(e.target.value)}
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
      </div>
    </AppLayout>
  );
}
