type TreeNode = { label: string; note?: string; children?: TreeNode[] };
type Payload = { title?: string; root?: TreeNode };

const LEVEL_COLOR = [
  "border-amber-400/50 bg-amber-500/12 text-amber-100",
  "border-emerald-400/45 bg-emerald-500/12 text-emerald-100",
  "border-sky-400/45 bg-sky-500/12 text-sky-100",
  "border-violet-400/45 bg-violet-500/12 text-violet-100",
];

function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const children = Array.isArray(node?.children) ? node.children : [];
  const color = LEVEL_COLOR[depth % LEVEL_COLOR.length];
  return (
    <li className="relative">
      <div className="flex items-center gap-1.5 py-0.5">
        {depth > 0 && <span className="text-white/30 text-xs leading-none select-none">└</span>}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${color} text-[11px] font-semibold`}>
          {node.label}
          {node.note && <span className="text-[9px] opacity-60 font-normal">— {node.note}</span>}
        </span>
      </div>
      {children.length > 0 && (
        <ul className="pr-4 mr-3 border-r border-white/10 space-y-0.5 mt-0.5">
          {children.map((c, i) => (
            <Node key={i} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeDiagram({ payload }: { payload: Payload }) {
  const title = typeof payload?.title === "string" ? payload.title : "";
  const root = payload?.root;

  if (!root || typeof root.label !== "string") {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ شجرة فارغة</div>;
  }

  return (
    <div className="my-3 rounded-2xl border border-violet-400/30 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-violet-500/12 border-b border-white/10 flex items-center gap-2">
        <span className="text-sm">🌳</span>
        <div className="text-xs font-bold text-violet-200">{title || "مخطّط شجري"}</div>
      </div>
      <div className="p-4">
        <ul className="space-y-0.5">
          <Node node={root} depth={0} />
        </ul>
      </div>
    </div>
  );
}
