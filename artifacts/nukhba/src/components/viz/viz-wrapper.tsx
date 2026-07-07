import { useEffect, useRef, useState, type ReactNode } from "react";
import { trackEvent } from "@/lib/activity-tracker";

type VizWrapperProps = {
  icon: string;
  title: string;
  accentBg: string;
  templateName: string;
  children: ReactNode;
  stepIndex?: number;
  stepCount?: number;
  onStepChange?: (next: number) => void;
  stepLabel?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

async function reportVizProblem(template: string): Promise<void> {
  try {
    await fetch("/api/v4/viz/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
      credentials: "include",
      body: JSON.stringify({ template, reason: "student-reported rendering problem" }),
    });
  } catch {
    // Best-effort — a failed report must never break the lesson UI.
  }
}

/**
 * Shared chrome for every VIZ template: consistent a11y (aria-live step
 * announcements, real <button> keyboard-focusable nav, ArrowLeft/Right
 * shortcuts when steppable), a mobile-safe horizontal scroll area, a
 * prefers-reduced-motion-aware transition class, and a small "report a
 * problem" affordance that logs to the backend. Individual templates own
 * their own visual content; this only wraps the shell + step controls.
 */
export function VizWrapper({
  icon,
  title,
  accentBg,
  templateName,
  children,
  stepIndex,
  stepCount,
  onStepChange,
  stepLabel = "الخطوة",
}: VizWrapperProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [reported, setReported] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isStepped = typeof stepIndex === "number" && typeof stepCount === "number" && stepCount > 1;
  const trackedStepChange = (next: number) => {
    trackEvent("viz_step_nav", { detail: { template: templateName, step: next } });
    onStepChange?.(next);
  };

  useEffect(() => {
    if (!isStepped || !onStepChange) return;
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        trackedStepChange(Math.min((stepCount as number) - 1, (stepIndex as number) + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        trackedStepChange(Math.max(0, (stepIndex as number) - 1));
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [isStepped, onStepChange, stepIndex, stepCount]);

  return (
    <div
      ref={containerRef}
      tabIndex={isStepped ? 0 : undefined}
      role={isStepped ? "group" : undefined}
      aria-label={isStepped ? `${title} — قابل للتنقّل بالأسهم` : undefined}
      className="my-3 rounded-2xl border border-amber-400/25 bg-slate-950/70 overflow-hidden shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      dir="rtl"
    >
      <div className={`px-3 py-2 ${accentBg} border-b border-white/10 flex items-center gap-2`}>
        <span className="text-sm">{icon}</span>
        <div className="text-xs font-bold text-amber-200 flex-1">{title}</div>
        {!reported ? (
          <button
            type="button"
            onClick={() => {
              setReported(true);
              trackEvent("viz_report", { detail: { template: templateName } });
              void reportVizProblem(templateName);
            }}
            className="text-[10px] text-white/30 hover:text-white/60 transition px-1.5 py-0.5 rounded"
            aria-label="الإبلاغ عن مشكلة في هذا الرسم"
            title="الإبلاغ عن مشكلة في هذا الرسم"
          >
            ⚑
          </button>
        ) : (
          <span className="text-[10px] text-emerald-300/70">شكراً، تم الإبلاغ</span>
        )}
      </div>
      <div className={`p-4 overflow-x-auto ${reducedMotion ? "" : "transition-all duration-200"}`}>
        {children}
        {isStepped && (
          <>
            <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => trackedStepChange(Math.max(0, (stepIndex as number) - 1))}
                disabled={stepIndex === 0}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border border-amber-400/30 text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/10 transition"
              >
                السابق
              </button>
              <span className="text-[11px] text-white/60 font-semibold min-w-[70px] text-center">
                {stepLabel} {(stepIndex as number) + 1} / {stepCount}
              </span>
              <button
                type="button"
                onClick={() => trackedStepChange(Math.min((stepCount as number) - 1, (stepIndex as number) + 1))}
                disabled={stepIndex === (stepCount as number) - 1}
                className="px-3 py-1 rounded-full text-[11px] font-semibold border border-emerald-400/30 text-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500/10 transition"
              >
                التالي
              </button>
            </div>
            <div aria-live="polite" className="sr-only">
              {stepLabel} {(stepIndex as number) + 1} من {stepCount}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
