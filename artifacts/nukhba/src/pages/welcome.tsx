import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  
  const updateMutation = useUpdateMe();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const updatedUser = await updateMutation.mutateAsync({
        data: { displayName: name, onboardingDone: true }
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
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-24 h-24 mx-auto rounded-3xl gradient-gold flex items-center justify-center text-primary-foreground mb-8 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
            <Sparkles className="w-12 h-12" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4">أهلاً بك في النخبة</h1>
          <p className="text-xl text-muted-foreground mb-12">كيف تحب أن نناديك؟</p>
        </motion.div>

        <motion.form 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit} 
          className="space-y-6 max-w-sm mx-auto"
        >
          <Input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الأول أو اللقب..." 
            className="h-16 text-center text-2xl bg-black/40 border-gold/30 focus-visible:ring-gold rounded-2xl"
            autoFocus
          />
          
          <Button 
            type="submit" 
            disabled={!name.trim() || updateMutation.isPending}
            className="w-full h-14 rounded-2xl text-lg font-bold gradient-gold text-primary-foreground shadow-lg shadow-gold/20"
          >
            {updateMutation.isPending ? "جاري الإعداد..." : "لنبدأ الرحلة"}
          </Button>
        </motion.form>
      </motion.div>
    </div>
  );
}
