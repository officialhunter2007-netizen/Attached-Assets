import { VizWrapper } from "./viz-wrapper";

type ComparisonItem = { name?: string; values?: string[] };
type Payload = { title?: string; axes?: string[]; items?: ComparisonItem[] };

const ITEM_ACCENT = [
  { text: "text-amber-200", bg: "bg-amber-500/10", border: "border-amber-400/30" },
  { text: "text-emerald-200", bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  { text: "text-sky-200", bg: "bg-sky-500/10", border: "border-sky-400/30" },
];

export function Comparison({ payload }: { payload: Payload }) {
  const title = typeof payload?.title === "string" ? payload.title : "";
  const axes = Array.isArray(payload?.axes) ? payload.axes.filter((a) => typeof a === "string") : [];
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (axes.length === 0 || items.length === 0) {
    return <div className="my-3 text-[11px] text-rose-300/80">⚠ جدول مقارنة فارغ</div>;
  }

  return (
    <VizWrapper icon="⚖️" title={title || "مقارنة"} accentBg="bg-amber-500/12" templateName="comparison">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="p-2.5 text-right text-[10px] font-semibold text-slate-400 bg-white/[0.03] border-b border-white/10 min-w-[92px]">
                المحور
              </th>
              {items.map((it, i) => {
                const accent = ITEM_ACCENT[i % ITEM_ACCENT.length];
                return (
                  <th
                    key={i}
                    className={`p-2.5 text-center font-bold border-b border-white/10 ${accent.text} ${accent.bg}`}
                  >
                    {it?.name ?? `عنصر ${i + 1}`}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {axes.map((axis, ai) => (
              <tr key={ai} className={ai % 2 === 0 ? "bg-white/[0.015]" : ""}>
                <td className="p-2.5 text-right font-semibold text-slate-300 border-b border-white/5 align-top">
                  {axis}
                </td>
                {items.map((it, ii) => {
                  const accent = ITEM_ACCENT[ii % ITEM_ACCENT.length];
                  const val = Array.isArray(it?.values) ? it.values[ai] : undefined;
                  return (
                    <td
                      key={ii}
                      className={`p-2.5 text-center text-slate-100 border-b border-white/5 border-r ${accent.border} align-top`}
                    >
                      {val ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VizWrapper>
  );
}
