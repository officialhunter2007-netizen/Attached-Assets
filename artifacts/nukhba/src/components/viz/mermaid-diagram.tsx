import { useEffect, useRef, useState } from "react";
import { VizWrapper } from "./viz-wrapper";

type Payload = { code?: string; steps?: string[]; pendingId?: string };

let mermaidInitialized = false;
let mermaidModulePromise: Promise<any> | null = null;

async function loadMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((mod) => {
      const mermaid = (mod as any).default ?? mod;
      if (!mermaidInitialized) {
        // theme:"base" is the only mermaid preset that fully honors custom
        // themeVariables — "dark"/"default"/etc. partially ignore them and
        // fall back to mermaid's generic blue/grey palette, which clashes
        // with the app's dark-luxury gold/emerald look. Variables below
        // mirror the app palette (gold #F59E0B accents, emerald #10B981
        // secondary, hsl(222,24%,10%) card surfaces) so diagrams read as
        // part of the teacher UI instead of a generic embedded widget.
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "Tajawal, Cairo, sans-serif",
          themeVariables: {
            darkMode: true,
            background: "transparent",
            fontFamily: "Tajawal, Cairo, sans-serif",
            primaryColor: "#1b2433",
            primaryBorderColor: "#F59E0B",
            primaryTextColor: "#f1f5f9",
            secondaryColor: "#0f2a22",
            secondaryBorderColor: "#10B981",
            secondaryTextColor: "#e2e8f0",
            tertiaryColor: "#20293a",
            tertiaryBorderColor: "#fbbf24",
            tertiaryTextColor: "#f1f5f9",
            lineColor: "#d97706",
            textColor: "#e2e8f0",
            mainBkg: "#1b2433",
            nodeBorder: "#F59E0B",
            clusterBkg: "#151d2b",
            clusterBorder: "rgba(245,158,11,0.35)",
            defaultLinkColor: "#d97706",
            titleColor: "#fbbf24",
            edgeLabelBackground: "#111827",
            errorBkgColor: "#3f1d1d",
            errorTextColor: "#fca5a5",
            noteBkgColor: "#1b2433",
            noteBorderColor: "rgba(245,158,11,0.4)",
            noteTextColor: "#e2e8f0",
            actorBkg: "#1b2433",
            actorBorder: "#F59E0B",
            actorTextColor: "#f1f5f9",
            actorLineColor: "rgba(245,158,11,0.45)",
            signalColor: "#e2e8f0",
            signalTextColor: "#e2e8f0",
            labelBoxBkgColor: "#1b2433",
            labelBoxBorderColor: "#F59E0B",
            labelTextColor: "#f1f5f9",
            loopTextColor: "#fbbf24",
            activationBorderColor: "#F59E0B",
            activationBkgColor: "#20293a",
            sequenceNumberColor: "#0b0f14",
            pie1: "#F59E0B",
            pie2: "#10B981",
            pie3: "#FBBF24",
            pie4: "#34D399",
            pie5: "#D97706",
            pie6: "#059669",
            pie7: "#FCD34D",
            pie8: "#6EE7B7",
            pieTitleTextColor: "#f1f5f9",
            pieSectionTextColor: "#0b0f14",
            pieLegendTextColor: "#e2e8f0",
            pieStrokeColor: "#0d1117",
            pieOuterStrokeColor: "#0d1117",
            pieOpacity: "0.92",
          },
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
      <VizWrapper icon="📊" title="رسم توضيحي" accentBg="bg-amber-500/10" templateName="mermaid_diagram">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </VizWrapper>
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
    <VizWrapper
      icon="📊"
      title="رسم توضيحي"
      accentBg="bg-amber-500/10"
      templateName="mermaid_diagram"
      stepIndex={hasSteps ? stepIndex : undefined}
      stepCount={hasSteps ? steps.length : undefined}
      onStepChange={hasSteps ? setStepIndex : undefined}
    >
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
    </VizWrapper>
  );
}
