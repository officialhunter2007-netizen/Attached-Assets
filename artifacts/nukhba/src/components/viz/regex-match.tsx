import { useMemo } from "react";

type Payload = { regex?: string; flags?: string; input?: string };

export function RegexMatch({ payload }: { payload: Payload }) {
  const pattern = String(payload?.regex ?? "");
  const flags = String(payload?.flags ?? "g");
  const input = String(payload?.input ?? "");

  const { segments, error, count } = useMemo(() => {
    if (!pattern) return { segments: [{ text: input, match: false }], error: null as string | null, count: 0 };
    try {
      const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
      const segs: { text: string; match: boolean }[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      let c = 0;
      while ((m = re.exec(input)) !== null) {
        if (m.index > last) segs.push({ text: input.slice(last, m.index), match: false });
        segs.push({ text: m[0] || "", match: true });
        c++;
        last = m.index + (m[0]?.length || 0);
        if (m[0]?.length === 0) re.lastIndex++;
        if (c > 500) break;
      }
      if (last < input.length) segs.push({ text: input.slice(last), match: false });
      return { segments: segs, error: null, count: c };
    } catch (e: any) {
      return { segments: [{ text: input, match: false }], error: String(e?.message ?? e), count: 0 };
    }
  }, [pattern, flags, input]);

  return (
    <div className="my-3 rounded-2xl border-2 border-violet-400/50 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-violet-500/15 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-bold text-violet-300">مطابقة Regex</div>
        <div className="font-mono text-[11px] text-white/70" dir="ltr">
          <span className="text-white/40">/</span>
          <span className="text-amber-300">{pattern || "…"}</span>
          <span className="text-white/40">/{flags}</span>
        </div>
      </div>

      <div className="p-3 bg-[#0d1117]">
        {error ? (
          <div className="text-xs text-rose-300 font-mono" dir="ltr">⚠ {error}</div>
        ) : (
          <div className="font-mono text-[13px] leading-7 break-words text-slate-200 whitespace-pre-wrap" dir="ltr">
            {segments.map((s, i) =>
              s.match ? (
                <mark
                  key={i}
                  className="bg-amber-400/30 text-amber-100 px-1 py-0.5 rounded border-b-2 border-amber-400"
                >
                  {s.text || "∅"}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 bg-slate-900/60 border-t border-white/10 text-[10px] text-white/50 text-center">
        {error ? "تعبير نمطي غير صالح" : `${count} مطابقة`}
      </div>
    </div>
  );
}
