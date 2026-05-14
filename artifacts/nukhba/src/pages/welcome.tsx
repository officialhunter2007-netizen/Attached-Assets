import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, MapPin, GraduationCap, MessageSquare, BookOpen,
  ChevronLeft, ChevronRight, Rocket, Crown, Zap,
  Terminal, Check, Unlock, Trophy, Gift
} from "lucide-react";
import { useLang } from "@/lib/lang-context";

const TOTAL_STEPS = 6;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 h-2.5 bg-gold"
              : i < current
              ? "w-2.5 h-2.5 bg-gold/40"
              : "w-2.5 h-2.5 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const { tr } = useLang();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.displayName || "");
  const [region, setRegion] = useState<"north" | "south" | null>(null);

  const updateMutation = useUpdateMe();

  const handleFinish = async () => {
    if (!region) return;
    try {
      const updatedUser = await updateMutation.mutateAsync({
        data: { displayName: name.trim() || user?.displayName || "طالب", onboardingDone: true, region }
      });
      setUser(updatedUser);
      setLocation("/learn");
    } catch {
      toast({ variant: "destructive", title: tr.welcome.errorSave.split("،")[0], description: tr.welcome.errorSave });
    }
  };

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const steps = [
    /* ── Step 0: Name ── */
    <motion.div
      key="step-0"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md mx-auto text-center"
    >
      <div className="w-24 h-24 mx-auto rounded-3xl gradient-gold flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
        <Sparkles className="w-12 h-12 text-primary-foreground" />
      </div>
      <h1 className="text-4xl md:text-5xl font-black mb-3">{tr.welcome.step0Title}</h1>
      <p className="text-muted-foreground mb-2 text-lg">{tr.welcome.step0Subtitle}</p>
      <p className="text-xs text-gold/70 mb-10">{tr.welcome.step0Badge}</p>
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr.welcome.step0Placeholder}
          className="h-14 text-center text-xl bg-black/40 border-gold/30 focus-visible:ring-gold rounded-2xl"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && name.trim() && next()}
        />
        <Button
          onClick={next}
          disabled={!name.trim()}
          className="w-full h-14 rounded-2xl text-lg font-bold gradient-gold text-primary-foreground shadow-lg shadow-gold/20"
        >
          {tr.welcome.nextBtn} <ChevronLeft className="w-5 h-5 mr-2" />
        </Button>
      </div>
    </motion.div>,

    /* ── Step 1: Region ── */
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md mx-auto text-center"
    >
      <div className="w-24 h-24 mx-auto rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-8">
        <MapPin className="w-12 h-12 text-blue-400" />
      </div>
      <h1 className="text-4xl font-black mb-3">{tr.welcome.step1Title.replace("{name}", name)}</h1>
      <p className="text-muted-foreground mb-8">{tr.welcome.step1Desc}</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setRegion("north")}
          className={`p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
            region === "north"
              ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              : "border-white/10 glass hover:border-gold/30"
          }`}
        >
          <div className="text-3xl mb-2">🏔️</div>
          {tr.welcome.step1North}
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
          {tr.welcome.step1South}
        </button>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl">
          <ChevronRight className="w-4 h-4 ml-2" /> {tr.welcome.backBtn}
        </Button>
        <Button
          onClick={next}
          disabled={!region}
          className="flex-1 h-12 rounded-xl font-bold gradient-gold text-primary-foreground"
        >
          {tr.welcome.nextBtn} <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </motion.div>,

    /* ── Step 2: How the AI teacher works ── */
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald/10 border border-emerald/30 flex items-center justify-center mb-6">
          <GraduationCap className="w-10 h-10 text-emerald" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-3">{tr.welcome.step2Title}</h2>
        <p className="text-muted-foreground">{tr.welcome.step2Desc}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="glass p-5 rounded-2xl border-emerald/10">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-emerald" />
          </div>
          <h4 className="font-bold mb-2">{tr.welcome.step2Card1Title}</h4>
          <p className="text-sm text-muted-foreground">{tr.welcome.step2Card1Desc}</p>
        </div>
        <div className="glass p-5 rounded-2xl border-gold/10">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5 text-gold" />
          </div>
          <h4 className="font-bold mb-2">{tr.welcome.step2Card2Title}</h4>
          <p className="text-sm text-muted-foreground">{tr.welcome.step2Card2Desc}</p>
        </div>
        <div className="glass p-5 rounded-2xl border-blue-500/10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Terminal className="w-5 h-5 text-blue-400" />
          </div>
          <h4 className="font-bold mb-2">{tr.welcome.step2Card3Title}</h4>
          <p className="text-sm text-muted-foreground">{tr.welcome.step2Card3Desc}</p>
        </div>
        <div className="glass p-5 rounded-2xl border-purple-500/10">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-purple-400" />
          </div>
          <h4 className="font-bold mb-2">{tr.welcome.step2Card4Title}</h4>
          <p className="text-sm text-muted-foreground">{tr.welcome.step2Card4Desc}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl">
          <ChevronRight className="w-4 h-4 ml-2" /> {tr.welcome.backBtn}
        </Button>
        <Button onClick={next} className="flex-1 h-12 rounded-xl font-bold gradient-gold text-primary-foreground">
          {tr.welcome.step2NextBtn} <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </motion.div>,

    /* ── Step 3: How to start a lesson ── */
    <motion.div
      key="step-3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
          <Rocket className="w-10 h-10 text-gold" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-3">{tr.welcome.step3Title}</h2>
        <p className="text-muted-foreground">{tr.welcome.step3Desc}</p>
      </div>

      <div className="space-y-4 mb-8">
        {tr.welcome.step3Steps.map((item, idx) => {
          const colors = [
            "text-gold bg-gold/10 border-gold/30",
            "text-emerald bg-emerald/10 border-emerald/30",
            "text-blue-400 bg-blue-500/10 border-blue-500/30",
            "text-purple-400 bg-purple-500/10 border-purple-500/30",
          ];
          const nums = ["١", "٢", "٣", "٤"];
          const icons = [
            <GraduationCap key="g" className="w-5 h-5" />,
            <BookOpen key="b" className="w-5 h-5" />,
            <MessageSquare key="m" className="w-5 h-5" />,
            <Trophy key="t" className="w-5 h-5" />,
          ];
          return (
            <div key={idx} className="flex items-start gap-4 glass p-4 rounded-2xl border-white/5">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-black text-lg ${colors[idx]}`}>
                {nums[idx]}
              </div>
              <div>
                <h4 className="font-bold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl">
          <ChevronRight className="w-4 h-4 ml-2" /> {tr.welcome.backBtn}
        </Button>
        <Button onClick={next} className="flex-1 h-12 rounded-xl font-bold gradient-gold text-primary-foreground">
          {tr.welcome.nextBtn} <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </motion.div>,

    /* ── Step 4: Access & Subscription ── */
    <motion.div
      key="step-4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
          <Crown className="w-10 h-10 text-gold" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-3">{tr.welcome.step4Title}</h2>
        <p className="text-muted-foreground">{tr.welcome.step4Desc}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="glass p-5 rounded-2xl border-emerald/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald/10 rounded-br-full -z-10" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/30 flex items-center justify-center shrink-0">
              <Unlock className="w-5 h-5 text-emerald" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold">{tr.welcome.step4FreeTitle}</h4>
                <span className="text-xs bg-emerald/20 text-emerald border border-emerald/30 rounded-full px-2 py-0.5">{tr.welcome.step4FreeBadge}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tr.welcome.step4FreeDesc}</p>
            </div>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-br-full -z-10" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold">{tr.welcome.step4RefTitle}</h4>
                <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5">{tr.welcome.step4RefBadge}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {tr.welcome.step4RefDesc
                  .replace("{n}", <strong key="n" className="text-foreground">٥</strong> as unknown as string)
                  .replace("{r}", <strong key="r" className="text-blue-400">٣</strong> as unknown as string)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border-gold/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-gold/10 rounded-br-full -z-10" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold">{tr.welcome.step4SubTitle}</h4>
                <span className="text-xs bg-gold/20 text-gold border border-gold/30 rounded-full px-2 py-0.5">{tr.welcome.step4SubBadge}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-black/30 rounded-xl p-2 text-center border border-amber-700/20">
                  <div className="font-bold text-amber-600">{tr.welcome.step4Bronze}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4DailyMsg.replace("{n}", "٢٠")}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4Duration}</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2 text-center border border-zinc-400/20">
                  <div className="font-bold text-zinc-300">{tr.welcome.step4Silver}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4DailyMsg.replace("{n}", "٤٠")}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4Duration}</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2 text-center border border-gold/20">
                  <div className="font-bold text-gold">{tr.welcome.step4Gold}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4DailyMsg.replace("{n}", "٧٠")}</div>
                  <div className="text-muted-foreground">{tr.welcome.step4Duration}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl">
          <ChevronRight className="w-4 h-4 ml-2" /> {tr.welcome.backBtn}
        </Button>
        <Button onClick={next} className="flex-1 h-12 rounded-xl font-bold gradient-gold text-primary-foreground">
          {tr.welcome.step4NextBtn} <ChevronLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </motion.div>,

    /* ── Step 5: Ready! ── */
    <motion.div
      key="step-5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-28 h-28 mx-auto rounded-3xl gradient-gold flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(245,158,11,0.4)]"
      >
        <Rocket className="w-14 h-14 text-primary-foreground" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-4xl md:text-5xl font-black mb-4"
      >
        {tr.welcome.step5Title.replace("{name}", name)}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-lg text-muted-foreground mb-8"
      >
        {tr.welcome.step5Desc}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass p-5 rounded-2xl border-gold/20 mb-8 text-right space-y-2"
      >
        {[
          tr.welcome.step5Check1,
          tr.welcome.step5Check2,
          tr.welcome.step5Check3,
          tr.welcome.step5Check4,
        ].map((text, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-emerald" />
            </div>
            <span className="text-sm">{text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Button
          onClick={handleFinish}
          disabled={updateMutation.isPending}
          className="w-full h-16 rounded-2xl text-xl font-black gradient-gold text-primary-foreground shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] transition-all"
        >
          {updateMutation.isPending ? tr.welcome.loadingBtn : tr.welcome.startBtn}
        </Button>
      </motion.div>
    </motion.div>,
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-gold/30 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 rounded-bl-full blur-[80px] -z-10 pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          <StepDots current={step} />

          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
