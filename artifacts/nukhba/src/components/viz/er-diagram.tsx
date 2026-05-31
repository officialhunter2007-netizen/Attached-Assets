type Field = { name: string; type?: string; key?: "PK" | "FK" };
type Entity = { name: string; fields?: Field[] };
type Relation = { from: string; to: string; label?: string; cardinality?: string };
type Payload = { title?: string; entities?: Entity[]; relations?: Relation[] };

function keyBadge(key?: "PK" | "FK") {
  if (key === "PK") return <span className="text-[8px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/40 rounded px-1">PK</span>;
  if (key === "FK") return <span className="text-[8px] font-bold text-sky-300 bg-sky-500/15 border border-sky-400/40 rounded px-1">FK</span>;
  return null;
}

export function ErDiagram({ payload }: { payload: Payload }) {
  const title = typeof payload?.title === "string" ? payload.title : "";
  const entities = Array.isArray(payload?.entities) ? payload!.entities! : [];
  const relations = Array.isArray(payload?.relations) ? payload!.relations! : [];

  if (entities.length === 0) {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ مخطّط علاقات فارغ</div>;
  }

  return (
    <div className="my-3 rounded-2xl border border-emerald-400/30 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-emerald-500/12 border-b border-white/10 flex items-center gap-2">
        <span className="text-sm">🗃️</span>
        <div className="text-xs font-bold text-emerald-200">{title || "مخطّط علاقات الكيانات (ER)"}</div>
      </div>

      <div className="p-4 flex flex-wrap gap-3 justify-center">
        {entities.map((e, i) => {
          const fields = Array.isArray(e.fields) ? e.fields : [];
          return (
            <div key={i} className="min-w-[140px] rounded-xl border-2 border-emerald-400/40 bg-slate-900/80 overflow-hidden shadow-sm">
              <div className="px-3 py-1.5 bg-emerald-500/15 border-b border-emerald-400/30 text-center text-[12px] font-bold text-emerald-100">
                {e.name}
              </div>
              {fields.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-white/30 italic text-center">—</div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {fields.map((f, fi) => (
                    <li key={fi} className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        {keyBadge(f.key)}
                        <span className={f.key === "PK" ? "text-amber-100 font-semibold" : "text-white/80"}>{f.name}</span>
                      </span>
                      {f.type && <span className="text-[9px] text-white/40 font-mono">{f.type}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {relations.length > 0 && (
        <div className="px-4 pb-4 pt-1 space-y-1.5">
          <div className="text-[10px] font-bold text-white/40 border-t border-white/10 pt-2">العلاقات</div>
          {relations.map((r, i) => (
            <div key={i} className="flex items-center flex-wrap gap-1.5 text-[11px]">
              <span className="text-emerald-200 font-semibold">{r.from}</span>
              <span className="text-white/40">——</span>
              {r.cardinality && (
                <span className="text-[9px] text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-full px-1.5">
                  {r.cardinality}
                </span>
              )}
              <span className="text-white/40">——</span>
              <span className="text-emerald-200 font-semibold">{r.to}</span>
              {r.label && <span className="text-white/50 text-[10px]">({r.label})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
