import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function Register() {
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") || "";
  });

  const handleGoogleRegister = () => {
    const params = referralCode.trim()
      ? `?ref=${encodeURIComponent(referralCode.trim())}`
      : "";
    const url = `${window.location.origin}/api/auth/google${params}`;
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }
    if (inIframe) {
      window.open(url, "_blank");
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald/5 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-10 rounded-3xl border-emerald/10 relative"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-primary-foreground font-black text-4xl mb-6 shadow-lg shadow-emerald/20">ن</div>
          <h1 className="text-3xl font-bold mb-2">حساب جديد</h1>
          <p className="text-muted-foreground">انضم للنخبة وابدأ رحلة تعلمك الذكية</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ref" className="text-sm font-medium">كود الدعوة (اختياري)</Label>
            <Input
              id="ref"
              placeholder="إذا دعاك صديق، أدخل رمزه هنا"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="bg-background/50 border-white/10 h-12 text-left"
              dir="ltr"
            />
          </div>

          <Button
            onClick={handleGoogleRegister}
            className="w-full h-14 rounded-xl text-base font-bold bg-white hover:bg-gray-100 text-gray-800 flex items-center justify-center gap-3 shadow-md transition-all"
          >
            <GoogleIcon />
            إنشاء حساب بـ Google
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-emerald font-bold hover:underline">
            سجل الدخول
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

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
