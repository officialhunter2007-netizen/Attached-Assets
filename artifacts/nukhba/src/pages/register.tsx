import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { Link, useLocation } from "wouter";
import { Check, Brain, GraduationCap, Terminal, Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/use-auth";

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function Particle({ x, y, color, size, delay }: { x: string; y: string; color: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, opacity: 0.5 }}
      animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.4, 1] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function Register() {
  const { tr } = useLang();
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const registerMutation = useRegisterUser();

  const benefits = [
    { icon: Brain, text: tr.register.benefit1, color: "#F59E0B" },
    { icon: GraduationCap, text: tr.register.benefit2, color: "#10B981" },
    { icon: Terminal, text: tr.register.benefit3, color: "#3B82F6" },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) return;
    if (password.trim().length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    try {
      const user = await registerMutation.mutateAsync({
        data: {
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
        },
      });
      setUser(user);
      navigate("/welcome");
    } catch (err: any) {
      const msg = err?.data?.error || err?.body?.error || err?.message || "";
      if (msg.includes("مسجل مسبقاً") || msg.includes("already")) {
        setError(tr.register.emailTaken);
      } else {
        setError(msg || tr.register.emailTaken);
      }
    }
  };

  const handleGoogleRegister = () => {
    const url = `${window.location.origin}/api/auth/google`;
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }
    if (inIframe) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  };

  const isSubmitting = registerMutation.isPending;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.09) 0%, transparent 70%)", filter: "blur(70px)" }}
      />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 70%)", filter: "blur(70px)" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, transparent 70%)", filter: "blur(80px)" }}
      />

      {/* Particles */}
      <Particle x="8%" y="25%" color="#10B981" size={4} delay={0} />
      <Particle x="88%" y="20%" color="#F59E0B" size={3} delay={1.5} />
      <Particle x="80%" y="70%" color="#8B5CF6" size={4} delay={0.8} />
      <Particle x="12%" y="72%" color="#06B6D4" size={3} delay={2.2} />
      <Particle x="50%" y="8%" color="#10B981" size={2} delay={1.8} />
      <Particle x="95%" y="45%" color="#F59E0B" size={3} delay={0.4} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-3xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(6,182,212,0.2), rgba(245,158,11,0.2))",
            filter: "blur(1px)",
            borderRadius: "25px",
          }}
        />

        <div className="relative rounded-3xl p-8 md:p-10"
          style={{
            background: "rgba(8,11,18,0.92)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(16,185,129,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Top shine */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px rounded-full pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)" }}
          />

          {/* Logo */}
          <div className="text-center mb-7">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-5"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-md"
                  style={{ background: "rgba(16,185,129,0.25)", transform: "scale(1.3)" }}
                />
                <NukhbaLogo size="lg" showText={false} />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black mb-2"
            >
              {tr.register.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-sm leading-relaxed"
            >
              {tr.register.desc}
            </motion.p>
          </div>

          {/* ── Email/Password Form ─────────────────────────────────── */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-3 mb-5"
          >
            {/* Display Name */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <User className="w-4 h-4 text-white/30" />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={tr.register.namePlaceholder}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald/50 transition-colors"
                autoComplete="name"
                disabled={isSubmitting}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Mail className="w-4 h-4 text-white/30" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr.register.emailPlaceholder}
                dir="ltr"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald/50 transition-colors"
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Lock className="w-4 h-4 text-white/30" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr.register.passwordPlaceholder}
                dir="ltr"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-12 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald/50 transition-colors"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-l from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr.register.registering}
                </>
              ) : (
                tr.register.submitBtn
              )}
            </Button>
          </motion.form>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">{tr.register.orDivider}</span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* Google button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl text-base font-bold bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)" }}
            >
              <GoogleIcon />
              {tr.register.googleBtn}
            </Button>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="space-y-2 mt-5"
          >
            {benefits.map(({ icon: Icon, text, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: `${color}08`,
                  border: `1px solid ${color}25`,
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 12px ${color}20`,
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color }} />
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: "rgba(255,255,255,0.85)" }}>{text}</span>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <Check className="w-3 h-3 text-emerald" strokeWidth={3} />
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {tr.register.hasAccount}{" "}
            <Link href="/login" className="text-emerald font-bold hover:underline transition-colors">
              {tr.register.loginLink}
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground/50"
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
            </div>
            {tr.register.freeNote}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
