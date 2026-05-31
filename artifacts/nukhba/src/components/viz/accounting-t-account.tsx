type Entry = { desc: string; amount: number };
type Payload = { name?: string; debits?: Entry[]; credits?: Entry[] };

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
}

export function TAccount({ payload }: { payload: Payload }) {
  const name = String(payload?.name ?? "حساب");
  const debits = Array.isArray(payload?.debits) ? payload!.debits! : [];
  const credits = Array.isArray(payload?.credits) ? payload!.credits! : [];
  const debitSum = debits.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const creditSum = credits.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = debitSum - creditSum;

  return (
    <div className="my-3 rounded-2xl border-2 border-amber-400/50 bg-slate-950/70 overflow-hidden shadow-lg" dir="rtl">
      <div className="px-3 py-2 bg-amber-500/15 border-b border-white/10 flex items-center justify-between">
        <div className="text-xs font-bold text-amber-300">حـ/ {name}</div>
        <div className={`text-[11px] font-mono ${balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
          الرصيد: {fmt(Math.abs(balance))} {balance >= 0 ? "مدين" : "دائن"}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-white/10">
        {/* Debit side (right in RTL) */}
        <div className="p-3">
          <div className="text-center text-[10px] font-bold text-emerald-300 mb-2 pb-1 border-b border-emerald-400/30">
            مدين (Debit)
          </div>
          {debits.length === 0 ? (
            <div className="text-[11px] text-white/30 italic text-center py-2">—</div>
          ) : (
            <ul className="space-y-1">
              {debits.map((e, i) => (
                <li key={i} className="flex justify-between text-[11px] gap-2">
                  <span className="text-white/70 truncate">{e.desc}</span>
                  <span className="text-emerald-300 font-mono shrink-0">{fmt(Number(e.amount) || 0)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 pt-1 border-t border-white/10 flex justify-between text-[11px] font-bold">
            <span className="text-white/50">المجموع</span>
            <span className="text-emerald-300 font-mono">{fmt(debitSum)}</span>
          </div>
        </div>

        {/* Credit side */}
        <div className="p-3">
          <div className="text-center text-[10px] font-bold text-rose-300 mb-2 pb-1 border-b border-rose-400/30">
            دائن (Credit)
          </div>
          {credits.length === 0 ? (
            <div className="text-[11px] text-white/30 italic text-center py-2">—</div>
          ) : (
            <ul className="space-y-1">
              {credits.map((e, i) => (
                <li key={i} className="flex justify-between text-[11px] gap-2">
                  <span className="text-white/70 truncate">{e.desc}</span>
                  <span className="text-rose-300 font-mono shrink-0">{fmt(Number(e.amount) || 0)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 pt-1 border-t border-white/10 flex justify-between text-[11px] font-bold">
            <span className="text-white/50">المجموع</span>
            <span className="text-rose-300 font-mono">{fmt(creditSum)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
