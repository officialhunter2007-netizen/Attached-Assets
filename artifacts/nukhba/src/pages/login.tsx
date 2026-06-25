import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { NukhbaLogo } from "@/components/nukhba-logo";
import { Brain, Zap, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useLoginUser } from "@workspace/api-client-react";
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

export default function Login() {
  const { tr } = useLang();
  const { setUser } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLoginUser();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) return;

    try {
      const user = await loginMutation.mutateAsync({ data: { email: email.trim(), password } });
      setUser(user);
      // Match Google OAuth behaviour: onboardingDone → /learn, otherwise → /welcome
      navigate(user.onboardingDone ? "/learn" : "/welcome");
    } catch (err: any) {
      // ApiError stores the parsed JSON body in `.data`.
      // Guard against HTML responses (e.g. Replit proxy returning a 404 page
      // when the API server is still starting up).
      const jsonMsg = err?.data?.error || err?.body?.error || "";
      const rawMsg: string = err?.message || "";
      const isHtmlResponse =
        rawMsg.includes("<!DOCTYPE") ||
        rawMsg.includes("<html") ||
        rawMsg.includes("<title>") ||
        rawMsg.includes("text/html");

      const msg = jsonMsg || (isHtmlResponse ? "" : rawMsg);

      if (msg.includes("غير صحيحة") || msg.includes("Invalid")) {
        setError(tr.login.invalidCredentials);
      } else if (isHtmlResponse || (!msg && err?.status >= 500)) {
        setError("تعذّر الاتصال بالخادم، يرجى المحاولة مجدداً بعد لحظات");
      } else {
        setError(msg || tr.login.invalidCredentials);
      }
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, "");
    const url = `${apiUrl}/api/auth/google`;
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }

    if (!inIframe) {
      window.location.href = url;
      return;
    }

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // cross-origin
    }

    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      alert(tr.login.iframeAlert);
    }
  };

  const isSubmitting = loginMutation.isPending;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Aurora blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(245,158,11,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Particles */}
      <Particle x="10%" y="20%" color="#F59E0B" size={4} delay={0} />
      <Particle x="85%" y="15%" color="#10B981" size={3} delay={1.2} />
      <Particle x="75%" y="75%" color="#8B5CF6" size={4} delay={2.1} />
      <Particle x="15%" y="80%" color="#06B6D4" size={3} delay={0.8} />
      <Particle x="50%" y="10%" color="#F59E0B" size={2} delay={1.5} />
      <Particle x="92%" y="50%" color="#10B981" size={3} delay={3} />
      <Particle x="5%" y="55%" color="#8B5CF6" size={2} delay={2.5} />

      {/* Floating icons */}
      <motion.div
        className="absolute top-[15%] right-[8%] hidden md:flex"
        animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 20px rgba(245,158,11,0.2)" }}
        >
          <Brain className="w-6 h-6 text-gold" />
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-[20%] left-[8%] hidden md:flex"
        animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}
        >
          <Zap className="w-5 h-5 text-emerald" />
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glow ring behind card */}
        <div className="absolute -inset-px rounded-3xl pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(139,92,246,0.2), rgba(16,185,129,0.2))",
            filter: "blur(1px)",
            borderRadius: "25px",
          }}
        />

        <div className="relative rounded-3xl p-8 md:p-10"
          style={{
            background: "rgba(8,11,18,0.92)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(245,158,11,0.15)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Top shine */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px rounded-full pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)" }}
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
                  style={{ background: "rgba(245,158,11,0.3)", transform: "scale(1.3)" }}
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
              {tr.login.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-sm leading-relaxed"
            >
              {tr.login.desc}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs mt-2 font-medium"
              style={{ color: "rgba(245,158,11,0.75)" }}
            >
              {tr.login.badge}
            </motion.p>
          </div>

          {/* ── Email/Password Form ─────────────────────────────────── */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            onSubmit={handleSubmit}
            className="space-y-3 mb-5"
          >
            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Mail className="w-4 h-4 text-white/30" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr.login.emailPlaceholder}
                dir="ltr"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50 transition-colors"
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
                placeholder={tr.login.passwordPlaceholder}
                dir="ltr"
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pr-10 pl-12 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-gold/50 transition-colors"
                autoComplete="current-password"
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
              className="w-full h-12 rounded-xl text-sm font-bold bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr.login.loggingIn}
                </>
              ) : (
                tr.login.submitBtn
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
            <span className="text-xs text-white/30">{tr.login.orDivider}</span>
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
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl text-base font-bold bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)" }}
            >
              <GoogleIcon />
              {tr.login.googleBtn}
            </Button>
          </motion.div>

          {/* Bottom link */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {tr.login.noAccount}{" "}
            <Link href="/register" className="text-gold font-bold hover:underline transition-colors">
              {tr.login.registerLink}
            </Link>
          </div>

          {/* Security note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/60"
          >
            <div className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald" />
            </div>
            {tr.login.secureNote}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
