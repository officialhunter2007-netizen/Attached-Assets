import { useState, useMemo } from "react";
import { Shield, Search, Filter, Download } from "lucide-react";
import { useSimulator } from "../context";
import { SimField, SimSelect, ShareButton, Badge, EmptyState } from "../shared-ui";
import { formatNum } from "../utils";

export function AuditTrailTab() {
  const { auditLog: auditTrail, entries, onShareWithTeacher } = useSimulator();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModule, setFilterModule] = useState("");

  const modules = useMemo(() => {
    const mods = new Set(auditTrail.map(a => a.module));
    return Array.from(mods);
  }, [auditTrail]);

  const filteredTrail = useMemo(() => {
    let filtered = [...auditTrail];
    if (searchTerm) {
      filtered = filtered.filter(a => a.action.includes(searchTerm) || a.description.includes(searchTerm) || a.module.includes(searchTerm));
    }
    if (filterModule) {
      filtered = filtered.filter(a => a.module === filterModule);
    }
    return filtered.reverse();
  }, [auditTrail, searchTerm, filterModule]);

  const stats = useMemo(() => {
    const byModule: Record<string, number> = {};
    for (const a of auditTrail) {
      byModule[a.module] = (byModule[a.module] || 0) + 1;
    }
    return { total: auditTrail.length, byModule, postedEntries: entries.filter(e => e.isPosted).length, unpostedEntries: entries.filter(e => !e.isPosted).length };
  }, [auditTrail, entries]);

  const share = () => {
    if (!onShareWithTeacher) return;
    let text = `سجل التدقيق:\n\nإجمالي العمليات: ${stats.total}\nقيود مرحّلة: ${stats.postedEntries} | غير مرحّلة: ${stats.unpostedEntries}\n\n`;
    text += "حسب الوحدة:\n";
    for (const [mod, count] of Object.entries(stats.byModule)) text += `  ${mod}: ${count} عملية\n`;
    text += "\nآخر 20 عملية:\n";
    for (const a of filteredTrail.slice(0, 20)) text += `  [${a.timestamp}] ${a.module} — ${a.action}: ${a.description}\n`;
    onShareWithTeacher(text);
  };

  const moduleColors: Record<string, string> = {
    "القيود": "bg-blue-500/20 text-blue-400",
    "الفواتير": "bg-emerald-500/20 text-emerald-400",
    "المخزون": "bg-teal-500/20 text-teal-400",
    "الشيكات": "bg-amber-500/20 text-amber-400",
    "الأصول الثابتة": "bg-purple-500/20 text-purple-400",
    "الرواتب": "bg-pink-500/20 text-pink-400",
    "التسوية البنكية": "bg-indigo-500/20 text-indigo-400",
    "مراكز التكلفة": "bg-cyan-500/20 text-cyan-400",
    "العملات": "bg-orange-500/20 text-orange-400",
    "الضريبة": "bg-red-500/20 text-red-400",
    "الإقفال": "bg-yellow-500/20 text-yellow-400",
    "الموازنات": "bg-lime-500/20 text-lime-400",
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-teal-400" /> سجل التدقيق</h3>
        {onShareWithTeacher && auditTrail.length > 0 && <ShareButton onClick={share} />}
      </div>

      {auditTrail.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">إجمالي العمليات</div><div className="text-sm font-bold text-teal-400">{stats.total}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">الوحدات النشطة</div><div className="text-sm font-bold text-purple-400">{Object.keys(stats.byModule).length}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">قيود مرحّلة</div><div className="text-sm font-bold text-emerald-400">{stats.postedEntries}</div></div>
            <div className="rounded-xl border border-white/5 p-3 text-center"><div className="text-[10px] text-[#6e6a86] mb-1">غير مرحّلة</div><div className="text-sm font-bold text-amber-400">{stats.unpostedEntries}</div></div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(stats.byModule).map(([mod, count]) => (
              <button key={mod} onClick={() => setFilterModule(filterModule === mod ? "" : mod)} className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${filterModule === mod ? "ring-1 ring-teal-400" : ""} ${moduleColors[mod] || "bg-white/10 text-white"}`}>
                {mod} ({count})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6a86]" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث في سجل التدقيق..." className="w-full bg-[#1e1e2e] border border-white/10 rounded-lg pr-9 pl-3 py-2 text-xs text-white outline-none focus:border-teal-400/50" />
            </div>
            {(searchTerm || filterModule) && (
              <button onClick={() => { setSearchTerm(""); setFilterModule(""); }} className="text-[10px] px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold">مسح الفلتر</button>
            )}
          </div>
        </>
      )}

      {auditTrail.length === 0 ? (
        <EmptyState icon={<Shield className="w-10 h-10" />} title="سجل التدقيق فارغ" subtitle="سيتم تسجيل جميع العمليات تلقائياً هنا" />
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filteredTrail.map((entry, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-[11px] px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
              <span className="text-[10px] font-mono text-[#6e6a86] shrink-0">{entry.timestamp}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${moduleColors[entry.module] || "bg-white/10 text-white"}`}>{entry.module}</span>
              <span className="text-white font-bold">{entry.action}</span>
              <span className="text-[#a6adc8]">{entry.description}</span>
            </div>
          ))}
          {filteredTrail.length === 0 && <div className="text-center py-6 text-[11px] text-[#6e6a86]">لا توجد نتائج للبحث</div>}
        </div>
      )}
    </div>
  );
}
