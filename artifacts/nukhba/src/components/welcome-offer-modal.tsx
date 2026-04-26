import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, X, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const LEFT_FLAG = "nukhba.leftSubPageWithoutSub";
const DISMISSED_FLAG = "nukhba.welcomeOfferDismissed";

type OfferState = {
  eligibleToShow: boolean;
  active: boolean;
  expiresAt: string | null;
  shownAt: string | null;
  usedAt: string | null;
  percent: number;
  hasAnySubscription: boolean;
  durationMs: number;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "انتهى العرض";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
}

export function WelcomeOfferModal() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(50);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  // Tick every second for countdown
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  // Decide whether to show — runs whenever route changes or user changes.
  useEffect(() => {
    if (!user) return;
    if (location.startsWith("/subscription")) return; // never on subscription page itself
    let leftFlag: string | null = null;
    try { leftFlag = sessionStorage.getItem(LEFT_FLAG); } catch {}
    let dismissed: string | null = null;
    try { dismissed = localStorage.getItem(DISMISSED_FLAG); } catch {}
    if (!leftFlag) return;
    if (dismissed) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/subscriptions/welcome-offer", { credentials: "include" });
        if (!r.ok) return;
        const data: OfferState = await r.json();
        if (cancelled) return;
        if (data.hasAnySubscription) {
          try { sessionStorage.removeItem(LEFT_FLAG); } catch {}
          return;
        }
        if (!data.eligibleToShow) {
          // already shown before, or never visited — clear flag
          try { sessionStorage.removeItem(LEFT_FLAG); } catch {}
          return;
        }
        // Mark as shown on backend (starts 24h countdown).
        const showRes = await fetch("/api/subscriptions/welcome-offer/show", {
          method: "POST", credentials: "include",
        });
        if (!showRes.ok) return;
        const showData = await showRes.json();
        if (cancelled) return;
        if (showData.expiresAt) setExpiresAt(new Date(showData.expiresAt));
        if (showData.percent) setPercent(showData.percent);
        try { sessionStorage.removeItem(LEFT_FLAG); } catch {}
        try { localStorage.setItem(DISMISSED_FLAG, "1"); } catch {}
        setOpen(true);
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [user, location]);

  const close = useCallback(() => setOpen(false), []);

  const handleAccept = useCallback(async () => {
    setSubmitting(true);
    setOpen(false);
    navigate("/subscription");
    setSubmitting(false);
  }, [navigate]);

  if (!open || !expiresAt) return null;

  const remainingMs = expiresAt.getTime() - now;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-offer-title"
      data-testid="welcome-offer-modal"
    >
      <div
        className="relative w-full max-w-md rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl shadow-gold/20 animate-in zoom-in-95 duration-300"
      >
        <button
          onClick={close}
          className="absolute top-3 left-3 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          aria-label="إغلاق"
          data-testid="welcome-offer-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gold via-amber-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-zinc-900" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-gold/80 tracking-widest uppercase">عرض ترحيبي خاص</p>
            <h2
              id="welcome-offer-title"
              className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-300 via-gold to-orange-300 bg-clip-text text-transparent"
            >
              خصم {percent}٪ لك أنت!
            </h2>
            <p className="text-base text-zinc-300 leading-relaxed pt-2">
              لأنك طالب جديد في <span className="font-bold text-gold">نُخبة</span>،
              <br />
              نقدّم لك خصمًا فوريًا على أول اشتراك لك.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-gold/30 bg-black/40 p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs">
              <Clock className="w-4 h-4" />
              <span>ينتهي العرض خلال</span>
            </div>
            <div
              className="text-3xl font-mono font-bold text-gold tracking-wider tabular-nums"
              data-testid="welcome-offer-countdown"
            >
              {formatRemaining(remainingMs)}
            </div>
            <p className="text-[11px] text-zinc-500">ساعة : دقيقة : ثانية</p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={handleAccept}
              disabled={submitting || remainingMs <= 0}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-gold via-amber-400 to-gold text-zinc-900 hover:opacity-90 transition shadow-lg shadow-gold/30"
              data-testid="welcome-offer-accept"
            >
              <Zap className="w-5 h-5 ml-2" />
              احصل على الخصم الآن
            </Button>
            <button
              onClick={close}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition py-2"
              data-testid="welcome-offer-dismiss"
            >
              لاحقاً (سيظل العرض ساريًا حتى انتهاء العداد)
            </button>
          </div>

          <p className="text-[10px] text-zinc-600 leading-snug">
            * لا يمكن استخدام كود خصم آخر مع هذا العرض.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helpers used by subscription page to set/clear the "left without subscribing" flag.
export function markLeftSubPageWithoutSub() {
  try { sessionStorage.setItem(LEFT_FLAG, "1"); } catch {}
}
export function clearLeftSubPageWithoutSub() {
  try { sessionStorage.removeItem(LEFT_FLAG); } catch {}
}
