import { useMemo } from "react";
import type { AttackScenario, NetworkState, Host } from "./types";

interface Props {
  scenario: AttackScenario;
  state: NetworkState;
  onSelectHost?: (hostId: string) => void;
  selectedHostId?: string | null;
}

const COLORS = {
  attacker: { fill: "#0ea5e9", stroke: "#7dd3fc", label: "أنت" },
  target: { fill: "#1e293b", stroke: "#475569", label: "هدف" },
  router: { fill: "#7c3aed", stroke: "#a78bfa", label: "موجّه" },
  service: { fill: "#0f766e", stroke: "#5eead4", label: "خدمة" },
} as const;

function statusBadge(scenario: AttackScenario, state: NetworkState, host: Host) {
  if (host.id === state.currentHost) return { text: "أنت هنا", color: "#22c55e" };
  const s = state.hosts[host.id];
  if (!s) return { text: "غير مكتشَف", color: "#64748b" };
  if (s.compromised) return { text: `مُختَرَق · ${s.accessLevel || "user"}`, color: "#ef4444" };
  if (s.portsScanned) return { text: "مفحوص", color: "#f59e0b" };
  if (s.discovered) return { text: "مكتشَف", color: "#06b6d4" };
  return { text: "غير مكتشَف", color: "#64748b" };
}

export function NetworkDiagram({ scenario, state, onSelectHost, selectedHostId }: Props) {
  const { width, height } = useMemo(() => {
    let maxX = 600, maxY = 400;
    for (const h of scenario.hosts) {
      if (h.x > maxX) maxX = h.x;
      if (h.y > maxY) maxY = h.y;
    }
    return { width: maxX + 140, height: maxY + 100 };
  }, [scenario.hosts]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-950 rounded-lg border border-white/10 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto min-h-[260px]"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(125,211,252,0.6)" />
          </marker>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {scenario.edges.map((e, i) => {
          const a = scenario.hosts.find(h => h.id === e.from);
          const b = scenario.hosts.find(h => h.id === e.to);
          if (!a || !b) return null;
          const aDiscovered = state.hosts[a.id]?.discovered;
          const bDiscovered = state.hosts[b.id]?.discovered;
          const visible = aDiscovered || bDiscovered;
          return (
            <g key={i} opacity={visible ? 1 : 0.3}>
              <line
                x1={a.x + 60} y1={a.y + 30}
                x2={b.x + 60} y2={b.y + 30}
                stroke="rgba(125,211,252,0.4)" strokeWidth={1.5}
                strokeDasharray={visible ? "" : "4 4"}
                markerEnd="url(#arr)"
              />
              {e.label && visible && (
                <text
                  x={(a.x + b.x) / 2 + 60}
                  y={(a.y + b.y) / 2 + 24}
                  fill="rgba(165,180,252,0.7)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {scenario.hosts.map((h) => {
          const s = state.hosts[h.id];
          const visible = !!s?.discovered;
          const c = COLORS[h.role] || COLORS.target;
          const badge = statusBadge(scenario, state, h);
          const isSelected = selectedHostId === h.id;
          const isCurrent = state.currentHost === h.id;
          return (
            <g
              key={h.id}
              transform={`translate(${h.x}, ${h.y})`}
              opacity={visible ? 1 : 0.45}
              style={{ cursor: onSelectHost ? "pointer" : "default" }}
              onClick={() => onSelectHost?.(h.id)}
            >
              <rect
                x={0} y={0}
                width={120} height={60}
                rx={10}
                fill={c.fill}
                stroke={isSelected ? "#fbbf24" : isCurrent ? "#22c55e" : c.stroke}
                strokeWidth={isSelected || isCurrent ? 3 : 1.5}
              />
              <text x={60} y={22} fill="#f1f5f9" fontSize="13" fontWeight="bold" textAnchor="middle">
                {visible ? h.name : "??"}
              </text>
              <text x={60} y={40} fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">
                {visible ? h.ip : "?.?.?.?"}
              </text>
              {visible && h.os && (
                <text x={60} y={54} fill="#94a3b8" fontSize="9" textAnchor="middle">
                  {h.os}
                </text>
              )}
              <g transform="translate(0, 64)">
                <rect x={6} y={0} width={108} height={18} rx={9} fill="rgba(0,0,0,0.5)" stroke={badge.color} strokeWidth={1} />
                <text x={60} y={13} fill={badge.color} fontSize="10" textAnchor="middle" fontWeight="bold">
                  {badge.text}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-white/60 px-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> أنت</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> مُختَرَق</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> مفحوص</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> مكتشَف</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> غير مكتشَف</span>
      </div>
    </div>
  );
}
