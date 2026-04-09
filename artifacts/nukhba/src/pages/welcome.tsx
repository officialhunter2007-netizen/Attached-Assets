import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"name" | "region">("name");
  const [name, setName] = useState("");
  const [region, setRegion] = useState<"north" | "south" | null>(null);
  
  const updateMutation = useUpdateMe();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("region");
  };

  const handleRegionSubmit = async () => {
    if (!region) return;
    try {
      const updatedUser = await updateMutation.mutateAsync({
        data: { displayName: name.trim(), onboardingDone: true, region }
      });
      setUser(updatedUser);
      setLocation("/learn");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "لم نتمكن من حفظ بياناتك، حاول مجدداً",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/10 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center"
      >
        <div className="w-24 h-24 mx-auto rounded-3xl gradient-gold flex items-center justify-center text-primary-foreground mb-8 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
          {step === "name" ? <Sparkles className="w-12 h-12" /> : <MapPin className="w-12 h-12" />}
        </div>

        <AnimatePresence mode="wait">
          {step === "name" ? (
            <motion.div
              key="name-step"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <h1 className="text-3xl md:text-5xl font-black mb-3 md:mb-4">أهلاً بك في النخبة</h1>
              <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-12">كيف تحب أن نناديك؟</p>
              <form onSubmit={handleNameSubmit} className="space-y-4 md:space-y-6 max-w-sm mx-auto">
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الأول أو اللقب..." 
                  className="h-12 md:h-16 text-center text-lg md:text-2xl bg-black/40 border-gold/30 focus-visible:ring-gold rounded-2xl"
                  autoFocus
                />
                <Button 
                  type="submit" 
                  disabled={!name.trim()}
                  className="w-full h-14 rounded-2xl text-lg font-bold gradient-gold text-primary-foreground shadow-lg shadow-gold/20"
                >
                  التالي
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="region-step"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <h1 className="text-4xl font-black mb-4">أين تدرس يا {name}؟</h1>
              <p className="text-xl text-muted-foreground mb-10">
                نحدد أسعار الاشتراكات حسب منطقتك
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                <button
                  onClick={() => setRegion("north")}
                  className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                    region === "north"
                      ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "border-white/10 glass hover:border-gold/30"
                  }`}
                >
                  <div className="text-3xl mb-2">🏔️</div>
                  المحافظات الشمالية
                </button>
                <button
                  onClick={() => setRegion("south")}
                  className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                    region === "south"
                      ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "border-white/10 glass hover:border-gold/30"
                  }`}
                >
                  <div className="text-3xl mb-2">🌊</div>
                  المحافظات الجنوبية
                </button>
              </div>
              <div className="space-y-3 max-w-sm mx-auto">
                <Button 
                  onClick={handleRegionSubmit}
                  disabled={!region || updateMutation.isPending}
                  className="w-full h-14 rounded-2xl text-lg font-bold gradient-gold text-primary-foreground shadow-lg shadow-gold/20"
                >
                  {updateMutation.isPending ? "جاري الإعداد..." : "لنبدأ الرحلة"}
                </Button>
                <button
                  onClick={() => setStep("name")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← رجوع
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
