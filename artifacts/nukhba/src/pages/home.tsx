import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, Terminal, Sparkles, Zap, Shield, Crown, Check, X, Brain, Cpu, Star, ArrowLeft, ChevronDown, Globe } from "lucide-react";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { useLang } from "@/lib/lang-context";
import { useRef, useEffect, useState } from "react";

function HomeLangToggle() {
  const { lang, toggle, tr } = useLang();
  const isAr = lang === "ar";
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      title={tr.lang.switchTo}
      aria-label={tr.lang.switchTo}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold select-none transition-colors duration-200"
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
        color: "rgba(245,158,11,0.9)",
      }}
    >
      <Globe className="w-3.5 h-3.5" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={lang}
          initial={{ opacity: 0, y: isAr ? -6 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: isAr ? 6 : -6 }}
          transition={{ duration: 0.18 }}
          style={{ minWidth: 18, display: "inline-block", textAlign: "center" }}
        >
          {isAr ? "EN" : "ع"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <div ref={ref}>{count.toLocaleString("ar-EG")}{suffix}</div>;
}

/* ─── Floating orb ─── */
function FloatingOrb({ className, delay = 0, size = 300 }: { className?: string; delay?: number; size?: number }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        filter: "blur(80px)",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function FloatingIcon({ icon: Icon, color, size = 40, delay = 0, x = 0, y = 0 }: {
  icon: React.ElementType; color: string; size?: number; delay?: number; x?: number | string; y?: number | string;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      animate={{
        y: [0, -14, 0],
        rotate: [0, 5, -5, 0],
        scale: [1, 1.06, 1],
      }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 20px ${color}30, 0 0 40px ${color}15, inset 0 1px 0 ${color}20`,
        }}
      >
        <Icon style={{ width: size * 0.45, height: size * 0.45, color }} />
      </div>
    </motion.div>
  );
}

/* ─── Particle dots ─── */
function ParticleDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#F59E0B" : i % 3 === 1 ? "#10B981" : "#8B5CF6",
            opacity: 0.4 + Math.random() * 0.4,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon: Icon, title, desc, color, delay }: {
  icon: React.ElementType; title: string; desc: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileTap={{ scale: 0.98 }}
      className="relative p-5 md:p-7 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(10,13,22,0.85)",
        border: `1px solid ${color}35`,
        boxShadow: `0 0 18px ${color}18, 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 ${color}10`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-bl-full pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${color}15, transparent 70%)` }}
      />
      <div
        className="absolute bottom-0 left-4 right-4 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
      />

      <div
        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-5"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}40`,
          boxShadow: `0 0 16px ${color}25, inset 0 1px 0 ${color}20`,
        }}
      >
        <Icon style={{ width: 24, height: 24, color }} />
      </div>

      <h4 className="text-base md:text-lg font-bold mb-2 md:mb-3" style={{ color }}>
        {title}
      </h4>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{desc}</p>
    </motion.div>
  );
}

/* ─── Stat card ─── */
function StatCard({ value, label, color, suffix = "", delay }: {
  value: number; label: string; color: string; suffix?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, type: "spring" }}
      className="text-center relative"
    >
      <div
        className="text-3xl md:text-5xl font-black mb-2 tabular-nums"
        style={{
          color,
          textShadow: `0 0 20px ${color}70, 0 0 40px ${color}40`,
        }}
      >
        <AnimatedNumber target={value} suffix={suffix} />
      </div>
      <div className="text-xs md:text-sm text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { tr } = useLang();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-gold/30 overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full z-50">
        <div className="relative">
          <div className="absolute inset-0 glass-dark border-b border-white/5" />
          <div className="relative container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
            <NukhbaLogo size="md" />
            <div className="flex items-center gap-3">
              <HomeLangToggle />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-gold transition-colors font-medium">
                  {tr.home.loginBtn}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gradient-gold text-primary-foreground font-bold rounded-full px-5 shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow">
                  {tr.home.startFree}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-12 overflow-hidden aurora-bg">
          
          <div className="absolute inset-0 bg-grid opacity-60" />
          
          <FloatingOrb className="bg-amber-400/8 nk-float-slow top-[15%] left-[10%]" delay={0} size={400} />
          <FloatingOrb className="bg-emerald-400/6 nk-float-slow top-[50%] right-[5%]" delay={2} size={350} />
          <FloatingOrb className="bg-purple-500/5 bottom-[10%] left-[30%]" delay={4} size={300} />

          <div className="absolute inset-0 pointer-events-none">
            <FloatingIcon icon={Brain}   color="#F59E0B" size={42} delay={0}   x="5%"  y="22%" />
            <FloatingIcon icon={Zap}     color="#06B6D4" size={36} delay={0.8} x="88%" y="58%" />
            <div className="hidden sm:block">
              <FloatingIcon icon={Cpu}     color="#10B981" size={44} delay={1.5} x="88%" y="28%" />
              <FloatingIcon icon={Star}    color="#8B5CF6" size={36} delay={2.5} x="10%" y="62%" />
              <FloatingIcon icon={BookOpen} color="#F59E0B" size={38} delay={3}  x="4%"  y="43%" />
              <FloatingIcon icon={Shield}  color="#10B981" size={34} delay={1.2} x="92%" y="44%" />
            </div>
          </div>

          <ParticleDots />

          <div className="relative z-10 container mx-auto px-4 text-center max-w-5xl">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-sm font-bold"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                boxShadow: "0 0 20px rgba(245,158,11,0.15), 0 0 40px rgba(245,158,11,0.07)",
                color: "#F59E0B",
              }}
            >
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
              >
                ✨
              </motion.span>
              {tr.home.badge}
              <motion.span
                animate={{ rotate: [0, -15, 15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, delay: 0.3 }}
              >
                🇾🇪
              </motion.span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tight"
            >
              {tr.home.heroTitle1}
              <br />
              <span className="relative inline-block">
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 45%, #D97706 80%, #92400E 100%)",
                    filter: "drop-shadow(0 0 30px rgba(245,158,11,0.6))",
                  }}
                >
                  {tr.home.heroTitle2}
                </span>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 1 }}
                  className="absolute -bottom-2 right-0 left-0 h-1 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, #F59E0B, #FDE68A, #F59E0B, transparent)",
                    boxShadow: "0 0 12px #F59E0B, 0 0 24px rgba(245,158,11,0.6)",
                    transformOrigin: "right",
                  }}
                />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg md:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto"
            >
              {tr.home.heroDesc.split("—")[0]}—{" "}
              <span className="text-white font-semibold">{tr.home.heroDescBuild}</span>،
              {" "}<span className="text-white font-semibold">{tr.home.heroDescRemember}</span>،
              {" "}{tr.home.heroDesc.split("،").slice(-1)[0]}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gradient-gold text-primary-foreground font-black text-lg h-14 px-10 rounded-2xl relative overflow-hidden group"
                    style={{
                      boxShadow: "0 0 30px rgba(245,158,11,0.4), 0 4px 20px rgba(245,158,11,0.3)",
                    }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {tr.home.joinNow}
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-l from-yellow-300/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="#pricing" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-14 px-10 rounded-2xl font-bold text-lg transition-all"
                    style={{
                      borderColor: "rgba(245,158,11,0.4)",
                      color: "#F59E0B",
                      background: "rgba(245,158,11,0.06)",
                    }}
                  >
                    {tr.home.viewPlans}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-3 gap-4 md:gap-10 max-w-2xl mx-auto pt-10 border-t border-white/8"
            >
              <StatCard value={1000} suffix="+" label={tr.home.statStudents} color="#F59E0B" delay={0.9} />
              <StatCard value={500} suffix="+" label={tr.home.statLessons} color="#10B981" delay={1.0} />
              <StatCard value={15} suffix="+" label={tr.home.statSubjects} color="#8B5CF6" delay={1.1} />
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-muted-foreground/40"
            >
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════
            SECTIONS
        ══════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              {tr.home.choosePathTitle}{" "}
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #F59E0B, #10B981)" }}>
                {tr.home.choosePathHighlight}
              </span>
            </h2>
            <p className="text-muted-foreground text-lg">{tr.home.choosePathDesc}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* University card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-6 md:p-10 rounded-3xl overflow-hidden cursor-pointer"
              style={{
                background: "rgba(10,18,14,0.88)",
                border: "1px solid rgba(16,185,129,0.4)",
                boxShadow: "0 0 32px rgba(16,185,129,0.12), 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(16,185,129,0.12)",
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 rounded-bl-full pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(16,185,129,0.14), transparent 65%)" }}
              />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent)", filter: "blur(20px)" }}
              />
              <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.7), transparent)" }}
              />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "rgba(16,185,129,0.14)",
                    border: "1px solid rgba(16,185,129,0.45)",
                    boxShadow: "0 0 22px rgba(16,185,129,0.25)",
                  }}
                >
                  <GraduationCap className="w-7 h-7" style={{ color: "#10B981" }} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-3"
                  style={{ color: "#10B981", textShadow: "0 0 20px rgba(16,185,129,0.5)" }}
                >
                  {tr.home.uniTitle}
                </h3>
                <p className="leading-relaxed mb-5 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {tr.home.uniDesc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tr.home.uniTags.map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Skills card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-6 md:p-10 rounded-3xl overflow-hidden cursor-pointer"
              style={{
                background: "rgba(8,13,22,0.88)",
                border: "1px solid rgba(59,130,246,0.4)",
                boxShadow: "0 0 32px rgba(59,130,246,0.12), 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(59,130,246,0.1)",
              }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 rounded-bl-full pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 65%)" }}
              />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.2), transparent)", filter: "blur(20px)" }}
              />
              <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.7), transparent)" }}
              />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "rgba(59,130,246,0.14)",
                    border: "1px solid rgba(59,130,246,0.45)",
                    boxShadow: "0 0 22px rgba(59,130,246,0.25)",
                  }}
                >
                  <Terminal className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-3 text-blue-400"
                  style={{ textShadow: "0 0 20px rgba(59,130,246,0.5)" }}
                >
                  {tr.home.skillsTitle}
                </h3>
                <p className="leading-relaxed mb-5 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {tr.home.skillsDesc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tr.home.skillsTags.map(tag => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            WHY NUKHBA — FEATURES
        ══════════════════════════════════════ */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-grid-fine opacity-40" />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(245,158,11,0.04), transparent)" }}
          />
          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 mb-4 text-gold text-sm font-bold">
                <Sparkles className="w-4 h-4" /> {tr.home.whyBadge}
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                {tr.home.whyTitle1}{" "}
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                >
                  {tr.home.whyTitle2}
                </span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {tr.home.whyDesc}
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              <FeatureCard icon={Brain}    title={tr.home.feat1Title} desc={tr.home.feat1Desc} color="#F59E0B" delay={0} />
              <FeatureCard icon={Zap}      title={tr.home.feat2Title} desc={tr.home.feat2Desc} color="#10B981" delay={0.1} />
              <FeatureCard icon={Terminal} title={tr.home.feat3Title} desc={tr.home.feat3Desc} color="#3B82F6" delay={0.2} />
              <FeatureCard icon={Shield}   title={tr.home.feat4Title} desc={tr.home.feat4Desc} color="#8B5CF6" delay={0.3} />
              <FeatureCard icon={BookOpen} title={tr.home.feat5Title} desc={tr.home.feat5Desc} color="#F59E0B" delay={0.4} />
              <FeatureCard icon={Crown}    title={tr.home.feat6Title} desc={tr.home.feat6Desc} color="#06B6D4" delay={0.5} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            COMPARISON TABLE
        ══════════════════════════════════════ */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4">
              {tr.home.cmpTitle1}{" "}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(135deg, #F59E0B, #D97706)" }}
              >
                ChatGPT / DeepSeek
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {tr.home.cmpDesc}{" "}
              <span className="text-gold font-bold">{tr.home.cmpDescHighlight}</span>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto rounded-3xl overflow-hidden relative"
            style={{
              background: "rgba(10,13,20,0.8)",
              border: "1px solid rgba(245,158,11,0.2)",
              boxShadow: "0 0 60px rgba(245,158,11,0.06), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)" }} />

            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(245,158,11,0.06)" }}>
                    <th className="p-4 text-sm font-bold text-foreground/70 w-[45%]">{tr.home.cmpFeature}</th>
                    <th className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Crown className="w-5 h-5 text-gold" />
                        <span className="text-base font-black text-gold">نُخبة</span>
                      </div>
                    </th>
                    <th className="p-4 text-center">
                      <span className="text-sm font-bold text-muted-foreground">ChatGPT</span>
                    </th>
                    <th className="p-4 text-center">
                      <span className="text-sm font-bold text-muted-foreground">DeepSeek</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {tr.home.cmpRows.map((feature, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                      }}
                      className="hover:bg-gold/[0.03] transition-colors"
                    >
                      <td className="p-4 font-medium text-foreground/85 text-sm leading-relaxed">{feature}</td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                          style={{
                            background: "rgba(245,158,11,0.15)",
                            border: "1px solid rgba(245,158,11,0.35)",
                            boxShadow: "0 0 12px rgba(245,158,11,0.2)",
                          }}
                        >
                          <Check className="w-4 h-4 text-gold" strokeWidth={3} />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <X className="w-5 h-5 text-red-400/50 mx-auto" strokeWidth={2.5} />
                      </td>
                      <td className="p-4 text-center">
                        <X className="w-5 h-5 text-red-400/50 mx-auto" strokeWidth={2.5} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5" style={{ background: "rgba(245,158,11,0.05)", borderTop: "1px solid rgba(245,158,11,0.1)" }}>
              <p className="text-sm text-center text-foreground/75 leading-relaxed">
                <span className="text-gold font-bold">{tr.home.cmpSummaryLabel}</span> {tr.home.cmpSummary}{" "}
                <span className="text-white font-semibold">{tr.home.cmpSummaryHighlight}</span>.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════
            PRICING
        ══════════════════════════════════════ */}
        <section id="pricing" className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-dots opacity-30" />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.04), transparent)" }}
          />

          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-black mb-4">{tr.home.pricingTitle}</h2>
              <p className="text-muted-foreground text-lg">{tr.home.pricingDesc}</p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Free */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                whileHover={{ y: -6 }}
                className="rounded-3xl p-7 flex flex-col"
                style={{
                  background: "rgba(10,13,20,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="text-sm font-bold text-muted-foreground mb-2">{tr.home.planFreeLabel}</div>
                <div className="text-3xl font-black mb-1">{tr.home.planFreePrice} <span className="text-base text-muted-foreground font-normal">{tr.home.planFreeCurrency}</span></div>
                <p className="text-xs text-muted-foreground mb-6">{tr.home.planFreeTagline}</p>
                <ul className="space-y-3 mb-8 flex-1 text-sm">
                  {tr.home.planFreeFeatures.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/learn" className="w-full">
                  <Button className="w-full rounded-2xl" variant="outline">{tr.home.planFreeCta}</Button>
                </Link>
              </motion.div>

              {/* Silver */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -6 }}
                className="rounded-3xl p-7 flex flex-col"
                style={{
                  background: "rgba(10,13,20,0.6)",
                  border: "1px solid rgba(161,161,170,0.3)",
                  boxShadow: "0 4px 30px rgba(161,161,170,0.05)",
                }}
              >
                <div className="text-sm font-bold text-zinc-300 mb-2">{tr.home.planSilverLabel}</div>
                <div className="text-3xl font-black mb-1 text-zinc-100">٢٬٠٠٠ <span className="text-base text-muted-foreground font-normal">💎</span></div>
                <p className="text-xs text-muted-foreground mb-6">{tr.home.planSilverTagline}</p>
                <ul className="space-y-3 mb-8 flex-1 text-sm">
                  {tr.home.planSilverFeatures.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/subscription" className="w-full">
                  <Button className="w-full rounded-2xl bg-zinc-700 hover:bg-zinc-600 text-white">{tr.home.planSubscribeCta}</Button>
                </Link>
              </motion.div>

              {/* Gold */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -6 }}
                className="rounded-3xl p-7 flex flex-col relative"
                style={{
                  background: "rgba(20,14,5,0.85)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  boxShadow: "0 0 40px rgba(245,158,11,0.12), 0 8px 40px rgba(0,0,0,0.5)",
                }}
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 gradient-gold text-primary-foreground font-black text-xs px-4 py-1.5 rounded-full shadow-lg shadow-gold/30">
                  {tr.home.planGoldPopular}
                </div>
                <div className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,0.08), transparent)" }}
                />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="text-sm font-bold text-gold mb-2">{tr.home.planGoldLabel}</div>
                  <div className="text-3xl font-black mb-1" style={{ color: "#FDE68A" }}>
                    ٣٬٠٠٠ <span className="text-base text-gold/60 font-normal">💎</span>
                  </div>
                  <p className="text-xs text-gold/60 mb-6">{tr.home.planGoldTagline}</p>
                  <ul className="space-y-3 mb-8 flex-1 text-sm">
                    {tr.home.planGoldFeatures.map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-gold flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/subscription" className="w-full">
                    <Button
                      className="w-full rounded-2xl gradient-gold text-primary-foreground font-bold"
                      style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
                    >
                      {tr.home.planGoldCta}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Bronze note */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 max-w-2xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden p-5 flex flex-col sm:flex-row items-center gap-4"
                style={{
                  background: "rgba(180,83,9,0.08)",
                  border: "1px solid rgba(180,83,9,0.35)",
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(180,83,9,0.2)", border: "1px solid rgba(180,83,9,0.4)" }}
                >
                  <Shield className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 text-center sm:text-right">
                  <p className="text-sm font-bold text-amber-400 mb-0.5">{tr.home.bronzeTitle}</p>
                  <p className="text-xs text-muted-foreground">{tr.home.bronzeDesc}</p>
                </div>
                <Link href="/subscription" className="shrink-0">
                  <Button size="sm" className="rounded-xl text-white font-bold px-5"
                    style={{ background: "rgba(180,83,9,0.8)", border: "1px solid rgba(180,83,9,0.5)" }}
                  >
                    {tr.home.planSubscribeCta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-white/6 py-10 overflow-hidden"
        style={{ background: "rgba(5,8,15,0.8)" }}
      >
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="relative container mx-auto px-4 flex flex-col items-center justify-center gap-4">
          <div className="opacity-70"><NukhbaLogo size="sm" /></div>
          <p className="text-muted-foreground text-sm text-center">
            {tr.home.footerTagline} · {tr.footer.rights} {new Date().getFullYear()} ©
          </p>
        </div>
      </footer>
    </div>
  );
}
