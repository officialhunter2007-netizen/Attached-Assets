import { useEffect, useMemo, useState } from "react";

type Node = { id: string; label: string };
type Edge = { from: string; to: string; label?: string };
// R3 spec accepts EITHER the rich `{nodes[], edges[]}` graph OR the
// lightweight `{src, dst, hops?}` chain where `hops` is a list of
// intermediate node labels (e.g. `["client","router","ISP","server"]`).
// We normalize the lightweight form into nodes/edges so the SVG renderer
// stays single-source.
type Payload = {
  nodes?: Node[];
  edges?: Edge[];
  src?: string;
  dst?: string;
  hops?: Array<string | { label?: string; id?: string }>;
};

function normalizePayload(p: Payload): { nodes: Node[]; edges: Edge[] } {
  if (Array.isArray(p?.nodes) && p.nodes.length > 0) {
    return {
      nodes: p.nodes.slice(0, 5),
      edges: Array.isArray(p.edges) ? p.edges : [],
    };
  }
  // Lightweight: build chain src → hop₁ → hop₂ → … → dst.
  const chainLabels: string[] = [];
  if (p?.src) chainLabels.push(String(p.src));
  if (Array.isArray(p?.hops)) {
    for (const h of p.hops) {
      if (typeof h === "string") chainLabels.push(h);
      else if (h && typeof h === "object") chainLabels.push(String(h.label ?? h.id ?? ""));
    }
  }
  if (p?.dst) chainLabels.push(String(p.dst));
  const cleaned = chainLabels.filter((s) => s.trim().length > 0).slice(0, 5);
  const nodes: Node[] = cleaned.map((label, idx) => ({ id: `n${idx}`, label }));
  const edges: Edge[] = nodes.slice(0, -1).map((n, i) => ({
    from: n.id,
    to: nodes[i + 1].id,
    label: i === 0 ? "→" : undefined,
  }));
  return { nodes, edges };
}

export function PacketFlow({ payload }: { payload: Payload }) {
  const { nodes, edges } = useMemo(() => normalizePayload(payload ?? {}), [payload]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (edges.length === 0) return;
    const t = setInterval(() => setTick((x) => (x + 1) % edges.length), 1500);
    return () => clearInterval(t);
  }, [edges.length]);

  if (nodes.length < 2) {
    return (
      <div className="my-3 p-4 rounded-2xl border border-white/10 bg-slate-900/60 text-xs text-white/40 text-center" dir="rtl">
        تدفّق الحزم — يحتاج عقدتين على الأقل
      </div>
    );
  }

  // Lay nodes evenly on a horizontal line
  const W = 480;
  const H = 180;
  const padX = 60;
  const dx = nodes.length > 1 ? (W - padX * 2) / (nodes.length - 1) : 0;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => positions.set(n.id, { x: padX + dx * i, y: H / 2 }));

  const activeEdge = edges[tick];

  return (
    <div className="my-3 rounded-2xl border-2 border-cyan-400/50 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/15 border-b border-white/10">
        <div className="text-xs font-bold text-cyan-300">تدفّق حزم الشبكة</div>
        {activeEdge?.label && (
          <div className="text-[10px] text-cyan-200 font-mono px-2 py-0.5 rounded bg-cyan-500/10" dir="ltr">
            {activeEdge.label}
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        {/* edges */}
        {edges.map((e, idx) => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          const isActive = idx === tick;
          return (
            <line
              key={idx}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isActive ? "#22d3ee" : "rgba(255,255,255,0.15)"}
              strokeWidth={isActive ? 3 : 2}
              strokeDasharray={isActive ? "6 3" : "0"}
            />
          );
        })}

        {/* animated packet on active edge */}
        {activeEdge && (() => {
          const a = positions.get(activeEdge.from);
          const b = positions.get(activeEdge.to);
          if (!a || !b) return null;
          return (
            <circle r="7" fill="#fde68a" stroke="#f59e0b" strokeWidth="2">
              <animate
                attributeName="cx"
                from={a.x} to={b.x}
                dur="1.2s" repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                from={a.y} to={b.y}
                dur="1.2s" repeatCount="indefinite"
              />
            </circle>
          );
        })()}

        {/* nodes */}
        {nodes.map((n) => {
          const p = positions.get(n.id)!;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r="22" fill="#1e293b" stroke="#06b6d4" strokeWidth="2.5" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fill="#67e8f9" fontFamily="monospace">
                {n.id.slice(0, 6)}
              </text>
              <text x={p.x} y={p.y + 42} textAnchor="middle" fontSize="11" fill="#cbd5e1" style={{ direction: "rtl" }}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="px-3 py-1.5 bg-slate-900/60 border-t border-white/10 text-[10px] text-white/40 text-center">
        {edges.length > 0 ? `حركة ${tick + 1} / ${edges.length}` : "لا توجد روابط"}
      </div>
    </div>
  );
}
