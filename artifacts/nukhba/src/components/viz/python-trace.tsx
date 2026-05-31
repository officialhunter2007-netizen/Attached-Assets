import { useState, useEffect, useMemo, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";

type Step = { line: number; vars?: Record<string, string | number>; output?: string };
// R3 spec accepts EITHER the rich `{code, steps[]}` schema (teacher-precomputed
// trace, preferred for accurate animation) OR the lightweight `{code, stdin?}`
// schema where the teacher emits only the code. In the lightweight case we
// synthesize a one-step-per-line walkthrough so the cursor still animates and
// the student sees the code being read top-to-bottom. `stdin` is rendered in
// a dedicated input strip so the teacher's example input is visible without
// needing a live execution endpoint (live exec is in scope of the existing
// /api/ai/run-code button, not this inline diagram).
type Payload = { code?: string; stdin?: string; steps?: Step[] };

export function PythonTrace({ payload }: { payload: Payload }) {
  return <CodeTrace payload={payload} lang="python" label="بايثون" accent="emerald" />;
}

export function CodeTrace({
  payload,
  lang,
  label,
  accent,
}: {
  payload: Payload;
  lang: "python" | "javascript";
  label: string;
  accent: "emerald" | "amber";
}) {
  const code = String(payload?.code ?? "");
  const stdin = payload?.stdin != null ? String(payload.stdin) : "";
  const lines = code.split("\n");
  // Synthesize a one-step-per-non-blank-line walkthrough when the teacher
  // emitted the lightweight `{code, stdin}` form. This keeps the cursor
  // animation alive without needing a live execution engine.
  const steps: Step[] = useMemo(() => {
    if (Array.isArray(payload?.steps) && payload!.steps!.length > 0) return payload!.steps!;
    return lines
      .map((ln, idx) => ({ line: idx + 1, raw: ln }))
      .filter((x) => x.raw.trim().length > 0)
      .map(({ line }) => ({ line }) as Step);
  }, [payload, lines.join("\n")]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (i >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => setI((x) => x + 1), 1100);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, i, steps.length]);

  const step = steps[i];
  const activeLine = step?.line ?? -1;
  const allVars: Record<string, string> = {};
  for (let k = 0; k <= i; k++) {
    const s = steps[k];
    if (s?.vars) for (const [n, v] of Object.entries(s.vars)) allVars[n] = String(v);
  }
  const outputs: string[] = [];
  for (let k = 0; k <= i; k++) {
    const o = steps[k]?.output;
    if (o) outputs.push(String(o));
  }

  const accentRing = accent === "emerald" ? "border-emerald-400/60" : "border-amber-400/60";
  const accentBg = accent === "emerald" ? "bg-emerald-500/15" : "bg-amber-500/15";
  const accentText = accent === "emerald" ? "text-emerald-300" : "text-amber-300";

  if (steps.length === 0) {
    return (
      <div className="my-3 p-4 rounded-2xl border border-white/10 bg-slate-900/60 text-xs text-white/40 text-center" dir="rtl">
        تتبّع {label} — لا توجد خطوات
      </div>
    );
  }

  return (
    <div className={`my-3 rounded-2xl border-2 ${accentRing} bg-slate-950/70 overflow-hidden shadow-lg`} dir="rtl">
      <div className={`flex items-center justify-between px-3 py-2 ${accentBg} border-b border-white/10`}>
        <div className={`text-xs font-bold ${accentText}`}>تتبّع تنفيذ {label}</div>
        <div className="text-[10px] text-white/50">خطوة {i + 1} / {steps.length}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <pre className="text-[12px] leading-6 p-3 m-0 overflow-x-auto bg-[#0d1117] text-slate-200" dir="ltr">
          {lines.map((ln, idx) => {
            const lineNo = idx + 1;
            const isActive = lineNo === activeLine;
            return (
              <div
                key={idx}
                className={`px-2 -mx-2 flex gap-3 transition-colors rounded ${
                  isActive ? `${accentBg} ${accentText} font-bold` : ""
                }`}
              >
                <span className="text-slate-600 select-none w-6 text-right shrink-0">{lineNo}</span>
                <code className="font-mono whitespace-pre">{ln || " "}</code>
              </div>
            );
          })}
        </pre>

        <div className="p-3 border-t md:border-t-0 md:border-r border-white/10 bg-slate-900/40">
          <div className="text-[10px] text-white/40 mb-2 font-bold">المتغيرات</div>
          {Object.keys(allVars).length === 0 ? (
            <div className="text-[11px] text-white/30 italic">لا متغيرات بعد</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(allVars).map(([n, v]) => (
                <div key={n} className="px-2 py-1 rounded-md bg-slate-800 border border-white/10 text-[11px]" dir="ltr">
                  <span className="text-violet-300 font-mono">{n}</span>
                  <span className="text-white/40 mx-1">=</span>
                  <span className="text-emerald-300 font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}

          {stdin && (
            <>
              <div className="text-[10px] text-white/40 mt-3 mb-1 font-bold">المدخلات (stdin)</div>
              <pre className="text-[11px] leading-5 p-2 bg-black/40 rounded-md text-cyan-200 m-0 max-h-20 overflow-y-auto" dir="ltr">
                {stdin}
              </pre>
            </>
          )}
          {outputs.length > 0 && (
            <>
              <div className="text-[10px] text-white/40 mt-3 mb-1 font-bold">المخرجات</div>
              <pre className="text-[11px] leading-5 p-2 bg-black/40 rounded-md text-emerald-200 m-0 max-h-24 overflow-y-auto" dir="ltr">
                {outputs.join("\n")}
              </pre>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900/60 border-t border-white/10">
        <button
          onClick={() => { setI(0); setPlaying(false); }}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/70"
          title="إعادة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setI((x) => Math.max(0, x - 1))}
          disabled={i === 0}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/70 disabled:opacity-30"
          title="السابق"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className={`p-2 rounded-full ${accentBg} ${accentText} hover:scale-105 transition-transform`}
          title={playing ? "إيقاف" : "تشغيل"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))}
          disabled={i >= steps.length - 1}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/70 disabled:opacity-30"
          title="التالي"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
