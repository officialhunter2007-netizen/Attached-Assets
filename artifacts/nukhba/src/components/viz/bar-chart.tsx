import { useEffect, useState } from "react";

type Bar = { label: string; value: number; color?: string };
type Payload = { title?: string; unit?: string; bars?: Bar[] };

const PALETTE = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee", "#facc15"];

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
}

export function BarChart({ payload }: { payload: Payload }) {
  const title = typeof payload?.title === "string" ? payload.title : "";
  const unit = typeof payload?.unit === "string" ? payload.unit : "";
  const bars = Array.isArray(payload?.bars) ? payload!.bars!.filter((b) => b && Number.isFinite(Number(b.value))) : [];
  const max = bars.reduce((m, b) => Math.max(m, Number(b.value) || 0), 0) || 1;

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGrown(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  if (bars.length === 0) {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ رسم بياني فارغ</div>;
  }

  return (
    <div className="my-3 rounded-2xl border border-amber-400/30 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-amber-500/12 border-b border-white/10 flex items-center gap-2">
        <span className="text-sm">📊</span>
        <div className="text-xs font-bold text-amber-200">{title || "رسم بياني"}</div>
        {unit && <div className="text-[10px] text-white/40 mr-auto">الوحدة: {unit}</div>}
      </div>
      <div className="p-4 space-y-2.5">
        {bars.map((b, i) => {
          const v = Number(b.value) || 0;
          const pct = Math.max(2, Math.round((v / max) * 100));
          const color = b.color || PALETTE[i % PALETTE.length];
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-[11px] text-white/70 truncate text-left" title={b.label}>
                {b.label}
              </div>
              <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out flex items-center"
                  style={{ width: grown ? `${pct}%` : "0%", background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-mono font-bold text-white/90">
                  {fmt(v)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
