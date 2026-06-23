import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/lang-context";
import { Gift, X, Sparkles, Check, Loader2, Plus, Copy, Users, Share2, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// Referral-gems feature: floating sky-blue "get extra gems" button + modal.
//
// Flow:
//   1. A friend opens an invite link `…/?ref=CODE`. We capture the code into
//      localStorage immediately (works signed-out — survives the OAuth redirect).
//   2. Once that visitor signs in, we POST it to /api/v4/referral/attribute,
//      which records the referral pair (brand-new accounts only).
//   3. When BOTH the referrer AND the referred friend simultaneously hold an
//      active Silver/Gold subscription, the backend credits 300 gems to EACH
//      side's reward pool (paid by the per-grant hook / hourly sweep).
//   4. Each student then CHOOSES which subject wallet(s) to direct their pool
//      gems into — exactly like the welcome gift. That happens in this modal.
//
// Backend: GET /api/v4/referral/info, POST /api/v4/referral/attribute,
//          GET /api/v4/referral/reward, POST /api/v4/referral/reward/allocate.
// ─────────────────────────────────────────────────────────────────────────────

const REF_STORAGE_KEY = "nukhba.referralCode";
const CSRF_HEADERS = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" } as const;
// Attribution outcomes that will never succeed on retry → stop re-trying.
const TERMINAL_ATTR_ERRORS = new Set([
  "SELF_REFERRAL",
  "ALREADY_REFERRED",
  "NOT_ELIGIBLE",
  "UNKNOWN_CODE",
  "BAD_CODE",
]);

type ReferralInfo = { code: string; referredCount: number; rewardedCount: number; rewardGems: number };
type RewardAllocation = { subjectId: string; gemsAllocated: number };
type RewardStatus = {
  earnedGems: number;
  allocatedGems: number;
  remainingGems: number;
  rewardGems: number;
  allocations: RewardAllocation[];
};
type Specialty = { slug: string; name: string; description?: string; icon?: string };

function readStoredRef(): string {
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
function clearStoredRef(): void {
  try {
    localStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function mapAllocErr(code: unknown, ar: boolean): string {
  switch (code) {
    case "EXCEEDS_BALANCE":
      return ar ? "تجاوزت الجواهر المتاحة للتوزيع" : "That exceeds your available gems.";
    case "BAD_AMOUNT":
      return ar ? "قيمة غير صالحة" : "Invalid amount.";
    case "specialty not available":
      return ar ? "هذا التخصص غير متاح حالياً" : "That specialty isn't available.";
    default:
      return ar ? "حدث خطأ — أعد المحاولة" : "Something went wrong — try again.";
  }
}

export function ReferralGemsModal({ inline = false }: { inline?: boolean }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";

  // ── 1) Capture ?ref on first mount (runs even signed-out) ──────────────────
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        localStorage.setItem(REF_STORAGE_KEY, ref.trim().toUpperCase());
        // Strip ?ref from the visible URL so it isn't re-shared or re-applied.
        params.delete("ref");
        const qs = params.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
        window.history.replaceState({}, "", url);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [reward, setReward] = useState<RewardStatus | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [amount, setAmount] = useState("");

  const refreshInfo = useCallback(async () => {
    try {
      const r = await fetch("/api/v4/referral/info", { credentials: "include" });
      if (r.ok) setInfo((await r.json()) as ReferralInfo);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshReward = useCallback(async () => {
    try {
      const r = await fetch("/api/v4/referral/reward", { credentials: "include" });
      if (r.ok) setReward((await r.json()) as RewardStatus);
    } catch {
      /* ignore */
    }
  }, []);

  // ── 2) Attribute the stored ref once the user is signed in ─────────────────
  useEffect(() => {
    if (!user) {
      setInfo(null);
      setReward(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const code = readStoredRef();
      if (code) {
        try {
          const r = await fetch("/api/v4/referral/attribute", {
            method: "POST",
            credentials: "include",
            headers: CSRF_HEADERS,
            body: JSON.stringify({ code }),
          });
          if (r.ok) {
            clearStoredRef();
          } else {
            const j = await r.json().catch(() => ({}));
            // Only drop the code on a permanent rejection; keep it for retry on
            // transient (network / 5xx) failures.
            if (TERMINAL_ATTR_ERRORS.has((j as any)?.error)) clearStoredRef();
          }
        } catch {
          /* keep stored code for a later retry */
        }
      }
      if (cancelled) return;
      await Promise.all([refreshInfo(), refreshReward()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshInfo, refreshReward]);

  const loadSpecialties = useCallback(async () => {
    try {
      const r = await fetch("/api/v4/specialties/available", { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setSpecialties(Array.isArray(j?.specialties) ? j.specialties : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const openModal = useCallback(async () => {
    setError(null);
    setOpen(true);
    await Promise.all([refreshInfo(), refreshReward(), loadSpecialties()]);
  }, [refreshInfo, refreshReward, loadSpecialties]);

  const inviteLink = useMemo(
    () => (info?.code ? `${window.location.origin}/?ref=${encodeURIComponent(info.code)}` : ""),
    [info?.code],
  );

  const copyLink = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [inviteLink]);

  const nativeShare = useCallback(async () => {
    if (!inviteLink) return;
    const shareData = {
      title: ar ? "نُخبة — تعلّم بذكاء" : "Nukhba — learn smarter",
      text: ar
        ? "انضم إليّ في نُخبة، ولنحصل سوياً على جواهر إضافية!"
        : "Join me on Nukhba and let's both earn extra gems!",
      url: inviteLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled or unsupported — fall through to copy */
    }
    await copyLink();
  }, [inviteLink, ar, copyLink]);

  const remaining = reward?.remainingGems ?? 0;
  const earned = reward?.earnedGems ?? 0;
  const rewardGems = info?.rewardGems ?? reward?.rewardGems ?? 300;

  const nameOf = useCallback(
    (slug: string) => specialties.find((s) => s.slug === slug)?.name || slug,
    [specialties],
  );
  const iconOf = useCallback(
    (slug: string) => specialties.find((s) => s.slug === slug)?.icon || "📚",
    [specialties],
  );

  const allocations = useMemo(
    () => (reward?.allocations ?? []).filter((a) => a.gemsAllocated > 0),
    [reward],
  );

  const doAllocate = useCallback(async () => {
    if (!selectedSlug) {
      setError(ar ? "اختر تخصصاً أولاً" : "Choose a specialty first.");
      return;
    }
    const gems = Math.floor(Number(amount));
    if (!Number.isFinite(gems) || gems <= 0) {
      setError(ar ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero.");
      return;
    }
    if (gems > remaining) {
      setError(ar ? `المتاح ${remaining} جوهرة فقط` : `Only ${remaining} gems available.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/v4/referral/reward/allocate", {
        method: "POST",
        credentials: "include",
        headers: CSRF_HEADERS,
        body: JSON.stringify({ subjectId: selectedSlug, gems }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(mapAllocErr((j as any)?.error, ar));
        await refreshReward();
        return;
      }
      setReward(j as RewardStatus);
      setAmount("");
      setSelectedSlug("");
      try {
        window.dispatchEvent(new Event("nukhba:gems-changed"));
      } catch {
        /* ignore */
      }
    } catch {
      setError(ar ? "تعذّر الاتصال — أعد المحاولة" : "Connection failed — try again.");
    } finally {
      setBusy(false);
    }
  }, [selectedSlug, amount, remaining, ar, refreshReward]);

  // Signed-out → render nothing (the ?ref capture effect above still ran).
  if (!user) return null;

  // ── Trigger button ─────────────────────────────────────────────────────────
  if (!open) {
    // inline=true → full-width banner embedded in the page (used in /learn)
    // inline=false → fixed floating pill (legacy; no longer used by default)
    const buttonClass = inline
      ? "w-full flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-extrabold text-white mb-6"
      : "fixed left-3 top-[76px] z-[120] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-white";

    return (
      <motion.button
        onClick={openModal}
        dir={ar ? "rtl" : "ltr"}
        initial={{ opacity: 0, y: inline ? 12 : -8 }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: [
            "0 0 18px rgba(56,189,248,0.55), 0 0 36px rgba(14,165,233,0.30)",
            "0 0 28px rgba(56,189,248,0.85), 0 0 56px rgba(14,165,233,0.45)",
            "0 0 18px rgba(56,189,248,0.55), 0 0 36px rgba(14,165,233,0.30)",
          ],
        }}
        transition={{
          opacity: { duration: 0.4 },
          y: { duration: 0.4 },
          boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ scale: inline ? 1.01 : 1.05 }}
        whileTap={{ scale: 0.97 }}
        className={buttonClass}
        style={{
          background: "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 45%, #0ea5e9 100%)",
          border: "1px solid rgba(186,230,253,0.7)",
          textShadow: "0 1px 2px rgba(2,132,199,0.45)",
        }}
        data-testid="referral-gems-button"
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-start">
          {ar ? "احصل على جواهر اضافية" : "Get extra gems"}
        </span>
        {remaining > 0 && (
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-black tabular-nums">
            {remaining} 💎
          </span>
        )}
      </motion.button>
    );
  }

  const pct =
    reward && reward.earnedGems > 0
      ? Math.min(100, Math.round((reward.allocatedGems / reward.earnedGems) * 100))
      : 0;

  // ── Modal ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      dir={ar ? "rtl" : "ltr"}
      data-testid="referral-gems-modal"
    >
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-sky-400/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl shadow-sky-500/20 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className={`absolute top-3 ${ar ? "left-3" : "right-3"} text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition`}
          aria-label={ar ? "إغلاق" : "Close"}
          data-testid="referral-gems-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-400/30 blur-2xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-sky-300 via-sky-400 to-sky-600 flex items-center justify-center">
              <Gift className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-sky-300/80 tracking-widest uppercase">
              {ar ? "ادعُ أصدقاءك" : "Invite friends"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-sky-200 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
              {ar ? `${rewardGems} جوهرة لك + ${rewardGems} لصاحبك` : `${rewardGems} gems for you + ${rewardGems} for them`}
            </h2>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 space-y-3 text-sm text-zinc-300">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
            <p>{ar ? "شارك رابط دعوتك مع صديق وادعُه للتسجيل في نُخبة." : "Share your invite link and have a friend sign up to Nukhba."}</p>
          </div>
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
            <p>
              {ar
                ? "عندما تكونان معاً مشتركَين بباقة فضية أو ذهبية فعّالة في الوقت نفسه، يحصل كلٌّ منكما على المكافأة. الباقة البرونزية لا تؤهل."
                : "When you BOTH hold an active Silver or Gold subscription at the same time, each of you earns the reward. Bronze does not qualify."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
            <p>{ar ? "تختار أنت التخصص الذي تنزل فيه جواهرك — تماماً مثل هدية الترحيب." : "You choose which subject your gems land in — just like the welcome gift."}</p>
          </div>
        </div>

        {/* Invite link */}
        <div className="mt-5 space-y-2">
          <p className="text-xs font-medium text-zinc-400">{ar ? "رابط دعوتك الخاص" : "Your personal invite link"}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-400/50 truncate"
              data-testid="referral-invite-link"
              dir="ltr"
            />
            <Button
              onClick={copyLink}
              disabled={!inviteLink}
              className="bg-sky-500 text-white hover:bg-sky-400 font-bold shrink-0"
              data-testid="referral-copy-link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              onClick={nativeShare}
              disabled={!inviteLink}
              variant="outline"
              className="border-sky-400/40 text-sky-300 hover:bg-sky-500/10 font-bold shrink-0"
              data-testid="referral-share-link"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
          {info?.code && (
            <p className="text-[11px] text-zinc-500 text-center">
              {ar ? "رمز الدعوة:" : "Invite code:"}{" "}
              <span className="font-mono font-bold text-sky-300 tracking-widest">{info.code}</span>
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              {ar ? "أصدقاء دعوتهم" : "Friends invited"}
            </div>
            <div className="mt-1 text-2xl font-black text-white tabular-nums">{info?.referredCount ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-emerald/20 bg-emerald/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs">
              <Check className="w-3.5 h-3.5" />
              {ar ? "دعوات مكافأة" : "Rewarded"}
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-300 tabular-nums">{info?.rewardedCount ?? 0}</div>
          </div>
        </div>

        {/* Reward pool + allocation */}
        {earned > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-sky-400/30 bg-black/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{ar ? "جواهر المكافأة المتاحة" : "Reward gems available"}</span>
                <span className="text-2xl font-black text-sky-300 tabular-nums">{remaining} 💎</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 text-center">
                {ar
                  ? `وُزّع ${reward?.allocatedGems ?? 0} من ${earned} جوهرة`
                  : `${reward?.allocatedGems ?? 0} of ${earned} gems allocated`}
              </div>
            </div>

            {allocations.length > 0 && (
              <ul className="space-y-2">
                {allocations.map((a) => (
                  <li
                    key={a.subjectId}
                    className="flex items-center justify-between rounded-xl border border-emerald/30 bg-emerald/5 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm text-zinc-200">
                      <span>{iconOf(a.subjectId)}</span>
                      {nameOf(a.subjectId)}
                    </span>
                    <span className="text-sm font-bold text-emerald-300 tabular-nums">{a.gemsAllocated} 💎</span>
                  </li>
                ))}
              </ul>
            )}

            {remaining > 0 && specialties.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-xs text-zinc-400">{ar ? "وجّه جواهرك إلى تخصص" : "Direct your gems to a specialty"}</p>
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:border-sky-400/50 outline-none"
                  data-testid="referral-specialty"
                >
                  <option value="">{ar ? "— اختر تخصصاً —" : "— choose a specialty —"}</option>
                  {specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {(s.icon ? s.icon + " " : "") + s.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={remaining}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={ar ? `حتى ${remaining}` : `up to ${remaining}`}
                    className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:border-sky-400/50 outline-none"
                    data-testid="referral-amount"
                  />
                  <button
                    onClick={() => setAmount(String(remaining))}
                    className="rounded-lg border border-sky-400/30 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/10 transition whitespace-nowrap"
                    type="button"
                  >
                    {ar ? "الكل" : "All"}
                  </button>
                  <Button
                    onClick={doAllocate}
                    disabled={busy}
                    className="bg-sky-500 text-white hover:bg-sky-400 font-bold"
                    data-testid="referral-add"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 text-center" data-testid="referral-error">
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-5 text-center text-xs text-zinc-500">
            {ar
              ? "لا توجد جواهر مكافأة بعد — ادعُ صديقاً واشتركا معاً بباقة فضية أو ذهبية لتبدأ المكافآت."
              : "No reward gems yet — invite a friend and both subscribe to Silver or Gold to start earning."}
          </p>
        )}
      </div>
    </div>
  );
}
