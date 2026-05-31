type NodeType = "start" | "end" | "process" | "decision" | "io";
type FlowNode = { id: string; text: string; type?: NodeType };
type FlowEdge = { from: string; to: string; label?: string };
type Payload = { title?: string; nodes?: FlowNode[]; edges?: FlowEdge[] };

const TYPE_STYLE: Record<NodeType, { cls: string; shape: string; tag: string }> = {
  start: { cls: "border-emerald-400/60 bg-emerald-500/15 text-emerald-200", shape: "rounded-full", tag: "بداية" },
  end: { cls: "border-rose-400/60 bg-rose-500/15 text-rose-200", shape: "rounded-full", tag: "نهاية" },
  process: { cls: "border-sky-400/50 bg-sky-500/12 text-sky-100", shape: "rounded-xl", tag: "عملية" },
  decision: { cls: "border-amber-400/60 bg-amber-500/15 text-amber-100", shape: "rounded-xl rotate-[0.0001deg]", tag: "قرار" },
  io: { cls: "border-violet-400/50 bg-violet-500/12 text-violet-100", shape: "rounded-2xl", tag: "إدخال/إخراج" },
};

export function Flowchart({ payload }: { payload: Payload }) {
  const title = typeof payload?.title === "string" ? payload.title : "";
  const nodes = Array.isArray(payload?.nodes) ? payload!.nodes! : [];
  const edges = Array.isArray(payload?.edges) ? payload!.edges! : [];

  // Build label lookup: edge between two consecutive nodes (in array order).
  const labelBetween = (fromId: string, toId: string): string => {
    const e = edges.find((x) => x.from === fromId && x.to === toId);
    return e?.label ? String(e.label) : "";
  };
  // Extra branches off a node that are NOT the next-in-sequence node.
  const branchesOf = (nodeId: string, nextId?: string): FlowEdge[] =>
    edges.filter((e) => e.from === nodeId && e.to !== nextId);

  if (nodes.length === 0) {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ مخطّط تدفّق فارغ</div>;
  }

  const nameOf = (id: string) => nodes.find((n) => n.id === id)?.text ?? id;

  return (
    <div className="my-3 rounded-2xl border border-sky-400/30 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-sky-500/12 border-b border-white/10 flex items-center gap-2">
        <span className="text-sm">🔀</span>
        <div className="text-xs font-bold text-sky-200">{title || "مخطّط تدفّق"}</div>
      </div>
      <div className="p-4 flex flex-col items-center gap-0">
        {nodes.map((n, idx) => {
          const t = (n.type && TYPE_STYLE[n.type]) ? n.type : "process";
          const st = TYPE_STYLE[t];
          const next = nodes[idx + 1];
          const branches = branchesOf(n.id, next?.id);
          const seqLabel = next ? labelBetween(n.id, next.id) : "";
          return (
            <div key={n.id ?? idx} className="flex flex-col items-center w-full">
              <div
                className={`max-w-[85%] px-4 py-2 border-2 ${st.cls} ${st.shape} text-center text-[12px] font-semibold shadow-sm`}
              >
                {n.text}
                <span className="block text-[9px] opacity-60 font-normal mt-0.5">{st.tag}</span>
              </div>

              {/* Branches that skip the sequence (e.g. decision "no" loops). */}
              {branches.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-1.5">
                  {branches.map((b, bi) => (
                    <div key={bi} className="text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-400/30 rounded-full px-2 py-0.5">
                      {b.label ? `${b.label} ← ` : "← "}{nameOf(b.to)}
                    </div>
                  ))}
                </div>
              )}

              {/* Down connector to next node. */}
              {next && (
                <div className="flex flex-col items-center py-1">
                  {seqLabel && (
                    <span className="text-[10px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-400/25 rounded-full px-2 py-0.5 mb-0.5">
                      {seqLabel}
                    </span>
                  )}
                  <span className="text-sky-300/70 text-lg leading-none">↓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
