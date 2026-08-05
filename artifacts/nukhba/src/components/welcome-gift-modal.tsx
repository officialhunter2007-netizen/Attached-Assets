import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/lang-context";
import { useLocation } from "wouter";
import { Sparkles, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_DISMISS = "nukhba.welcomeGiftDismissed";
const CSRF_HEADERS = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" } as const;

type GiftStatus = {
  totalGems: number;
  allocatedGems: number;
  remainingGems: number;
  finalizedAt: string | null;
};

export function WelcomeGiftModal() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [location] = useLocation();
  const ar = lang === "ar";
  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);

  const fetchStatus = useCallback(async (): Promise<GiftStatus | null> => {
    try {
      const r = await fetch("/api/v4/welcome-gift", { credentials: "include" });
      if (!r.ok) return null;
      const s: GiftStatus = await r.json();
      setStatus(s);
      return s;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const s = await fetchStatus();
      if (cancelled || !s) return;
      if (s.finalizedAt) return;
      let dismissed = false;
      try { dismissed = sessionStorage.getItem(SESSION_DISMISS) === "1"; } catch {}
      if (dismissed) return;
      // Auto-mark shown on first visit (backend auto-allocates + finalizes)
      if (!s.shownAt) {
        try { await fetch("/api/v4/welcome-gift/shown", { method: "POST", credentials: "include", headers: CSRF_HEADERS }); } catch {}
      }
      setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user, fetchStatus, location]);

  const claim = async () => {
    if (!status) return;
    setClaiming(true);
    setClaimErr(null);
    try {
      const r = await fetch("/api/v4/welcome-gift/shown", {
        method: "POST", credentials: "include", headers: CSRF_HEADERS,
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setClaimErr((j as any)?.message || (ar ? "تعذّر تفعيل الهدية — حاول مجدداً" : "Couldn't activate gift — try again"));
        setClaiming(false);
        return;
      }
      setClaimed(true);
      try { window.dispatchEvent(new Event("nukhba:gems-changed")); } catch {}
    } catch {
      setClaimErr(ar ? "تعذّر الاتصال — تحقق من الشبكة" : "Connection failed — check your network");
    }
    setClaiming(false);
  };

  const done = useCallback(() => {
    setOpen(false);
    try { sessionStorage.setItem(SESSION_DISMISS, "1"); } catch {}
  }, []);

  if (!user || !open) return null;
  if (location !== "/learn") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-500" role="dialog" aria-modal="true" dir={ar ? "rtl" : "ltr"}>
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500" style={{ background: "linear-gradient(145deg, #0f172a 0%, #0a0f1e 50%, #060912 100%)", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 80px rgba(245,158,11,0.12), 0 20px 60px rgba(0,0,0,0.5)" }}>

        {/* Animated gradient bar at top */}
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b, #d97706)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />

        <div className="p-6 flex flex-col items-center text-center gap-6">

          {!claimed ? (
            <>
              {/* Gift icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))", border: "2px solid rgba(245,158,11,0.3)" }}>
                  <Gem className="w-12 h-12" style={{ color: "#fbbf24", filter: "drop-shadow(0 0 12px rgba(245,158,11,0.5))" }} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold" style={{ color: "#fbbf24" }}>
                  {ar ? "🎁 هدية ترحيبية" : "🎁 Welcome Gift"}
                </p>
                <h2 className="text-5xl font-black" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 8px rgba(245,158,11,0.3))" }}>
                  150
                </h2>
                <p className="text-lg font-bold text-white/90">
                  {ar ? "جوهرة" : "Gems"}
                </p>
                <div className="h-px w-16 mx-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)" }} />
                <p className="text-sm text-white/50 leading-relaxed px-2">
                  {ar ? "جاهز لبدء رحلة التعلّم في جميع التخصصات والمهارات." : "Ready to start learning across all specialties and skills."}
                </p>
              </div>

              <div className="w-full space-y-3">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <p className="text-[11px] text-white/40 leading-relaxed text-right flex-1">
                    {ar ? "الـ 150 جوهرة تعمل مع جميع التخصصات تلقائياً — بدون توزيع ولا تعقيد." : "150 gems work across ALL subjects automatically — no distribution needed."}
                  </p>
                </div>

                <Button onClick={claim} disabled={claiming}
                  className="w-full h-14 text-lg font-black rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0f172a", boxShadow: "0 8px 32px rgba(245,158,11,0.3)", border: "none" }}>
                  {claiming ? (
                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 ml-2" />
                      {ar ? "ابدأ التعلّم" : "Start Learning"}
                    </>
                  )}
                </Button>
                {claimErr && (
                  <p className="text-xs text-red-400 text-center -mt-1">{claimErr}</p>
                )}
                <button onClick={done} className="w-full text-xs text-white/25 hover:text-white/45 transition-colors py-1">
                  {ar ? "لاحقاً" : "Later"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success checkmark */}
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))", border: "2px solid rgba(16,185,129,0.3)" }}>
                  <svg className="w-12 h-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-emerald-300">
                  {ar ? "تم تفعيل هديتك! 🎉" : "Gift Activated! 🎉"}
                </h2>
                <p className="text-sm text-white/50">
                  {ar ? "150 جوهرة في محفظتك — جاهزة لجميع التخصصات." : "150 gems in your wallet — ready for all subjects."}
                </p>
              </div>

              <Button onClick={done}
                className="w-full h-14 text-lg font-black rounded-2xl transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", boxShadow: "0 8px 32px rgba(16,185,129,0.25)", border: "none" }}>
                {ar ? "فلنبدأ! 🚀" : "Let's Go! 🚀"}
              </Button>
            </>
          )}
        </div>

        {/* Sub-footer text */}
        <div className="px-6 pb-4 text-center text-[10px] text-white/20">
          {ar ? "نُخبة — منصة التعلّم الذكي" : "Nukhba — The Intelligent Learning Platform"}
        </div>
      </div>
    </div>
  );
}
