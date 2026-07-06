import { useEffect, useRef, useState } from "react";

type Payload = { code?: string; steps?: string[]; pendingId?: string };

let mermaidInitialized = false;
let mermaidModulePromise: Promise<any> | null = null;

async function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((mod) => {
      const mermaid = (mod as any).default ?? mod;
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          fontFamily: "Tajawal, Cairo, sans-serif",
        });
        mermaidInitialized = true;
      }
      return mermaid;
    });
  }
  return mermaidModulePromise;
}

let idCounter = 0;

export function MermaidDiagram({ payload }: { payload: Payload }) {
  // `pendingId` means the [[DIAGRAM: ...]] request is still being authored
  // server-side (Claude Haiku). The chat stream normally splices in the
  // resolved `code`/`steps` before this ever mounts (VIZ roots only render
  // once streaming finishes), so this branch is a defensive fallback for
  // edge cases like an aborted stream — show a spinner instead of "empty".
  if (typeof payload?.pendingId === "string" && !payload?.code) {
    return (
      <div className="my-3 rounded-2xl border border-amber-400/25 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
        <div className="px-3 py-2 bg-amber-500/10 border-b border-white/10 flex items-center gap-2">
          <span className="text-sm">📊</span>
          <div className="text-xs font-bold text-amber-200">رسم توضيحي</div>
        </div>
        <div className="p-4 flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  const rawSteps = Array.isArray(payload?.steps) ? payload!.steps! : [];
  const steps = rawSteps.filter((s) => typeof s === "string" && s.trim().length > 0);
  const hasSteps = steps.length > 1;

  const [stepIndex, setStepIndex] = useState(0);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const idRef = useRef(`mermaid-viz-${++idCounter}`);
  const source = hasSteps ? steps[Math.min(stepIndex, steps.length - 1)] : code;

  useEffect(() => {
    let cancelled = false;
    if (!source || !source.trim()) {
      setError("رسم فارغ");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadMermaid()
      .then(async (mermaid) => {
        if (cancelled) return;
        const renderId = `${idRef.current}-${hasSteps ? stepIndex : "static"}`;
        const { svg: out } = await mermaid.render(renderId, source);
        if (!cancelled) setSvg(out);
      })
      .catch((err) => {
        console.error("mermaid render failed", err);
        if (!cancelled) setError("تعذّر عرض هذا الرسم البصري");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, stepIndex, hasSteps]);

  if (!code && steps.length === 0) {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ رسم بصري فارغ</div>;
  }

  return (
    <div className="my-3 rounded-2xl border border-amber-400/25 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-amber-500/10 border-b border-white/10 flex items-center gap-2">
        <span className="text-sm">📊</span>
        <div className="text-xs font-bold text-amber-200">رسم توضيحي</div>
      </div>
      <div className="p-4">
        {error ? (
          <div className="text-[11px] text-rose-300/80 text-center py-4">⚠ {error}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className="mermaid-viz-svg flex justify-center overflow-x-auto [&_svg]:max-w-none"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        {hasSteps && !error && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border border-amber-400/30 text-amber-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-500/10 transition"
            >
              السابق
            </button>
            <span className="text-[11px] text-white/60 font-semibold min-w-[70px] text-center">
              الخطوة {stepIndex + 1} / {steps.length}
            </span>
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={stepIndex === steps.length - 1}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border border-emerald-400/30 text-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500/10 transition"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
