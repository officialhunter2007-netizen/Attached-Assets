import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/lang-context";
import { useLocation } from "wouter";
import { Gift, X, Sparkles, Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────────────────────────
// v4 welcome-gift first-entry modal + allocation screen.
//
// Every student gets ONE 150-gem welcome gift (global pool) which they freely
// distribute across at most 3 specialties. Allocated gems land in that subject's
// monthly wallet. Backend: GET/POST /api/v4/welcome-gift{,/shown,/allocate}.
//
// Lifecycle:
//   - finalizedAt != null  → gift is locked forever → render nothing.
//   - finalizedAt == null  → show a floating "claim" pill + auto-open the modal
//     once per browser session (until finalized or dismissed-this-session).
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_DISMISS = "nukhba.welcomeGiftDismissed";
const CSRF_HEADERS = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" } as const;

type Allocation = { subjectId: string; gemsAllocated: number };
type GiftStatus = {
  totalGems: number;
  allocatedGems: number;
  remainingGems: number;
  maxSubjects: number;
  subjectCount: number;
  shownAt: string | null;
  finalizedAt: string | null;
  allocations: Allocation[];
};
type Specialty = { slug: string; name: string; description?: string; icon?: string };

function mapErr(code: unknown, ar: boolean): string {
  switch (code) {
    case "WELCOME_GIFT_FINALIZED":
      return ar ? "الهدية مُثبتة بالفعل ولا يمكن تعديلها" : "The gift is already finalized.";
    case "WELCOME_GIFT_EXCEEDS_TOTAL":
      return ar ? "تجاوزت الحد الأقصى للهدية (١٥٠ جوهرة)" : "That exceeds the 150-gem limit.";
    case "WELCOME_GIFT_TOO_MANY_SUBJECTS":
      return ar ? "لا يمكن التوزيع على أكثر من ٣ تخصصات" : "You can't split across more than 3 specialties.";
    case "WELCOME_GIFT_BAD_AMOUNT":
      return ar ? "قيمة غير صالحة" : "Invalid amount.";
    default:
      return ar ? "حدث خطأ — أعد المحاولة" : "Something went wrong — try again.";
  }
}

export function WelcomeGiftModal() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [location] = useLocation();
  const ar = lang === "ar";

  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "allocate" | "done">("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const nameOf = useCallback(
    (slug: string) => specialties.find((s) => s.slug === slug)?.name || slug,
    [specialties],
  );
  const iconOf = useCallback(
    (slug: string) => specialties.find((s) => s.slug === slug)?.icon || "📚",
    [specialties],
  );

  const refresh = useCallback(async (): Promise<GiftStatus | null> => {
    try {
      const r = await fetch("/api/v4/welcome-gift", { credentials: "include" });
      if (!r.ok) return null;
      const s: GiftStatus = await r.json();
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  // Initial load + auto-open decision.
  useEffect(() => {
    if (!user) {
      setStatus(null);
      setOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await refresh();
      if (cancelled || !s) return;

      let specs: Specialty[] = [];
      try {
        const sr = await fetch("/api/v4/specialties/available", { credentials: "include" });
        if (sr.ok) {
          const j = await sr.json();
          specs = Array.isArray(j?.specialties) ? j.specialties : [];
          if (!cancelled) setSpecialties(specs);
        }
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      if (s.finalizedAt) return; // locked forever
      // Nothing to allocate into and nothing allocated yet → don't nag.
      if (specs.length === 0 && s.allocatedGems === 0) return;

      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(SESSION_DISMISS) === "1";
      } catch {
        /* ignore */
      }
      if (dismissed) return;

      setStep(s.allocatedGems > 0 ? "allocate" : "intro");
      setOpen(true);

      if (!s.shownAt) {
        try {
          await fetch("/api/v4/welcome-gift/shown", {
            method: "POST",
            credentials: "include",
            headers: CSRF_HEADERS,
          });
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  const dismiss = useCallback(() => {
    setOpen(false);
    setConfirmFinalize(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const reopen = useCallback(async () => {
    setError(null);
    setConfirmFinalize(false);
    const s = (await refresh()) ?? status;
    if (specialties.length === 0) {
      try {
        const sr = await fetch("/api/v4/specialties/available", { credentials: "include" });
        if (sr.ok) {
          const j = await sr.json();
          setSpecialties(Array.isArray(j?.specialties) ? j.specialties : []);
        }
      } catch {
        /* ignore */
      }
    }
    setStep(s && s.allocatedGems > 0 ? "allocate" : "intro");
    setOpen(true);
  }, [refresh, status, specialties.length]);

  const allocatableSpecialties = useMemo(() => {
    if (!status) return specialties;
    const atSubjectCap = status.subjectCount >= status.maxSubjects;
    if (!atSubjectCap) return specialties;
    // At the 3-subject cap → only already-allocated subjects can be topped up.
    const allocated = new Set(status.allocations.map((a) => a.subjectId));
    return specialties.filter((s) => allocated.has(s.slug));
  }, [status, specialties]);

  const remaining = status?.remainingGems ?? 0;

  const doAllocate = useCallback(async (): Promise<boolean> => {
    if (!selectedSlug) {
      setError(ar ? "اختر تخصصاً أولاً" : "Choose a specialty first.");
      return false;
    }
    const gems = Math.floor(Number(amount));
    if (!Number.isFinite(gems) || gems <= 0) {
      setError(ar ? "أدخل عدداً صحيحاً أكبر من صفر" : "Enter a whole number greater than zero.");
      return false;
    }
    if (gems > remaining) {
      setError(ar ? `المتبقي ${remaining} جوهرة فقط` : `Only ${remaining} gems remaining.`);
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/v4/welcome-gift/allocate", {
        method: "POST",
        credentials: "include",
        headers: CSRF_HEADERS,
        body: JSON.stringify({ subjectId: selectedSlug, gems }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(mapErr((j as any)?.error, ar));
        await refresh();
        return false;
      }
      setStatus(j as GiftStatus);
      setAmount("");
      setSelectedSlug("");
      try {
        window.dispatchEvent(new Event("nukhba:gems-changed"));
      } catch {
        /* ignore */
      }
      return true;
    } catch {
      setError(ar ? "تعذّر الاتصال — أعد المحاولة" : "Connection failed — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [selectedSlug, amount, remaining, ar, refresh]);

  const hasPendingEntry = Boolean(selectedSlug) && Number.isFinite(Number(amount)) && Number(amount) > 0;

  const requestFinalize = useCallback(async () => {
    if (hasPendingEntry) {
      const ok = await doAllocate();
      if (!ok) return;
    }
    setConfirmFinalize(true);
  }, [hasPendingEntry, doAllocate]);

  const doFinalize = useCallback(async () => {
    // Need a valid specialty slug to carry the finalize flag (gems:0 just locks).
    const anchorSlug =
      status?.allocations?.[0]?.subjectId || allocatableSpecialties[0]?.slug || specialties[0]?.slug || "";
    if (!anchorSlug) {
      dismiss();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/v4/welcome-gift/allocate", {
        method: "POST",
        credentials: "include",
        headers: CSRF_HEADERS,
        body: JSON.stringify({ subjectId: anchorSlug, gems: 0, finalize: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(mapErr((j as any)?.error, ar));
        await refresh();
        return;
      }
      setStatus(j as GiftStatus);
      setStep("done");
      setConfirmFinalize(false);
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
  }, [status, allocatableSpecialties, specialties, ar, refresh, dismiss]);

  // Don't render anything once the gift is locked or before status loads.
  if (!user || !status || status.finalizedAt) return null;

  // Only show the welcome-gift UI on the /learn page.
  if (location !== "/learn") return null;

  // Top banner bar when the modal is closed but the gift is unclaimed.
  if (!open) {
    return (
      <button
        onClick={reopen}
        dir={ar ? "rtl" : "ltr"}
        className="fixed top-0 left-0 right-0 z-[150] flex gap-2 bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400 px-4 py-2.5 text-zinc-900 shadow-md hover:opacity-90 transition animate-in fade-in slide-in-from-top-2 text-[14px] font-normal text-center flex-row justify-center items-center mt-[60px] mb-[60px] border-t-[#2e2e2e] border-r-[#2e2e2e] border-b-[#2e2e2e] border-l-[#2e2e2e]"
        data-testid="welcome-gift-pill"
      >
        <span className="text-base">🎉</span>
        {ar ? "هديتك الترحيبية" : "Your welcome gift"}
        <span className="rounded-full bg-zinc-900/15 px-2 py-0.5 text-xs">
          {remaining} 💎
        </span>
      </button>
    );
  }

  const allocations = status.allocations.filter((a) => a.gemsAllocated > 0);
  const pct = Math.min(100, Math.round((status.allocatedGems / status.totalGems) * 100));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      dir={ar ? "rtl" : "ltr"}
      data-testid="welcome-gift-modal"
    >
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl shadow-gold/20 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {step !== "done" && (
          <button
            onClick={dismiss}
            className={`absolute top-3 ${ar ? "left-3" : "right-3"} text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition`}
            aria-label={ar ? "إغلاق" : "Close"}
            data-testid="welcome-gift-close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ── INTRO ─────────────────────────────────────────────────── */}
        {step === "intro" && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gold via-amber-400 to-orange-500 flex items-center justify-center">
                <Gift className="w-10 h-10 text-zinc-900" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gold/80 tracking-widest uppercase">
                {ar ? "هدية ترحيبية" : "Welcome gift"}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-300 via-gold to-orange-300 bg-clip-text text-transparent">
                {ar ? "١٥٠ جوهرة مجاناً 🎁" : "150 free gems 🎁"}
              </h2>
              <p className="text-base text-zinc-300 leading-relaxed pt-2">
                {ar ? (
                  <>
                    أهلاً بك في <span className="font-bold text-gold">نُخبة</span>! وزّع هديتك على ما يصل إلى{" "}
                    <span className="font-bold text-gold">٣ تخصصات</span> تختارها، وابدأ التعلّم فوراً.
                  </>
                ) : (
                  <>
                    Welcome to <span className="font-bold text-gold">Nukhba</span>! Spread your gift across up to{" "}
                    <span className="font-bold text-gold">3 specialties</span> and start learning right away.
                  </>
                )}
              </p>
            </div>
            <div className="w-full space-y-2 pt-2">
              <Button
                onClick={() => {
                  setError(null);
                  setStep("allocate");
                }}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-gold via-amber-400 to-gold text-zinc-900 hover:opacity-90 transition shadow-lg shadow-gold/30"
                data-testid="welcome-gift-start"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                {ar ? "وزّع هديتك الآن" : "Distribute your gift"}
              </Button>
              <button
                onClick={dismiss}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition py-2"
                data-testid="welcome-gift-later"
              >
                {ar ? "لاحقاً" : "Later"}
              </button>
            </div>
          </div>
        )}

        {/* ── ALLOCATE ──────────────────────────────────────────────── */}
        {step === "allocate" && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-gold">
                {ar ? "وزّع هديتك" : "Distribute your gift"}
              </h2>
              <p className="text-xs text-zinc-400">
                {ar
                  ? "أضف الجواهر لكل تخصص — حتى ٣ تخصصات. المتبقي بعد التثبيت لا يُسترد."
                  : "Add gems to each specialty — up to 3. Anything left after finalizing is forfeited."}
              </p>
            </div>

            {/* Remaining meter */}
            <div className="rounded-2xl border border-gold/30 bg-black/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{ar ? "المتبقي" : "Remaining"}</span>
                <span className="text-2xl font-black text-gold tabular-nums">{remaining} 💎</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold to-amber-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 text-center">
                {ar
                  ? `وُزّع ${status.allocatedGems} من ${status.totalGems} • ${status.subjectCount}/${status.maxSubjects} تخصصات`
                  : `${status.allocatedGems} of ${status.totalGems} allocated • ${status.subjectCount}/${status.maxSubjects} specialties`}
              </div>
            </div>

            {/* Existing allocations */}
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

            {/* Add allocation */}
            {remaining > 0 && allocatableSpecialties.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                <select
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:border-gold/50 outline-none"
                  data-testid="welcome-gift-specialty"
                >
                  <option value="">{ar ? "— اختر تخصصاً —" : "— choose a specialty —"}</option>
                  {allocatableSpecialties.map((s) => (
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
                    className="flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:border-gold/50 outline-none"
                    data-testid="welcome-gift-amount"
                  />
                  <button
                    onClick={() => setAmount(String(remaining))}
                    className="rounded-lg border border-gold/30 px-3 py-2 text-xs text-gold hover:bg-gold/10 transition whitespace-nowrap"
                    type="button"
                  >
                    {ar ? "كل المتبقي" : "All"}
                  </button>
                  <Button
                    onClick={doAllocate}
                    disabled={busy}
                    className="bg-gold text-zinc-900 hover:opacity-90 font-bold gap-1 px-3"
                    data-testid="welcome-gift-add"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span className="text-xs">{ar ? "إضافة" : "Add"}</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 text-center">
                  {ar
                    ? "اضغط \"إضافة\" لتثبيت العدد على هذا التخصص، أو اترك العدد كما هو واضغط \"تثبيت الهدية نهائياً\" مباشرة."
                    : 'Press "Add" to lock this amount to the specialty, or leave it and press "Finalize gift" directly.'}
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 text-center" data-testid="welcome-gift-error">
                {error}
              </p>
            )}

            {/* Finalize */}
            <div className="space-y-2 pt-1">
              {!confirmFinalize ? (
                <Button
                  onClick={requestFinalize}
                  disabled={busy || (status.allocatedGems === 0 && !hasPendingEntry)}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:opacity-90 transition disabled:opacity-40"
                  data-testid="welcome-gift-finalize"
                >
                  {busy ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Check className="w-5 h-5 ml-2" />}
                  {ar ? "تثبيت الهدية نهائياً" : "Finalize gift"}
                </Button>
              ) : (
                <div className="rounded-2xl border border-emerald/40 bg-emerald/5 p-3 space-y-2">
                  <p className="text-xs text-zinc-300 text-center">
                    {remaining > 0
                      ? ar
                        ? `سيتم تثبيت التوزيع نهائياً وستفقد ${remaining} جوهرة متبقية. متأكد؟`
                        : `This locks your distribution and forfeits ${remaining} remaining gems. Sure?`
                      : ar
                        ? "سيتم تثبيت التوزيع نهائياً ولا يمكن تعديله بعد ذلك. متأكد؟"
                        : "This locks your distribution permanently. Sure?"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={doFinalize}
                      disabled={busy}
                      className="flex-1 bg-emerald-500 text-white hover:opacity-90 font-bold"
                      data-testid="welcome-gift-finalize-confirm"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ar ? "نعم، ثبّت" : "Yes, finalize"}
                    </Button>
                    <Button
                      onClick={() => setConfirmFinalize(false)}
                      variant="outline"
                      className="flex-1 border-white/20 text-zinc-300 hover:bg-white/5"
                    >
                      {ar ? "رجوع" : "Back"}
                    </Button>
                  </div>
                </div>
              )}
              <button
                onClick={dismiss}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition py-1"
                data-testid="welcome-gift-allocate-later"
              >
                {ar ? "أكمل لاحقاً" : "Continue later"}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald/30 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-emerald-300">
                {ar ? "تم تثبيت هديتك! 🎉" : "Your gift is set! 🎉"}
              </h2>
              <p className="text-sm text-zinc-300">
                {ar ? "جواهرك جاهزة في التخصصات التالية:" : "Your gems are ready in these specialties:"}
              </p>
            </div>
            <ul className="w-full space-y-2">
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
            <Button
              onClick={() => setOpen(false)}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-gold via-amber-400 to-gold text-zinc-900 hover:opacity-90 transition shadow-lg shadow-gold/30"
              data-testid="welcome-gift-done"
            >
              {ar ? "ابدأ التعلّم" : "Start learning"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
