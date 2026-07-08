import { useState } from "react";
import { FlaskConical, Search, X } from "lucide-react";
import { SectionState } from "./dashboard-card";
import { LabReportCard } from "./lab-report-card";
import { LabReport } from "./types";
import { useLang } from "@/lib/lang-context";

type DateRange = "all" | "7d" | "30d" | "month" | "custom";

export function LabReportsSection({
  reports, loading, error, onRetry,
}: { reports: LabReport[]; loading: boolean; error: string | null; onRetry: () => void }) {
  const { tr } = useLang();
  const td = tr.dashboard;

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const subjects = Array.from(
    reports.reduce((map, r) => {
      if (!map.has(r.subjectId)) map.set(r.subjectId, r.subjectName || r.subjectId);
      return map;
    }, new Map<string, string>())
  ).map(([id, name]) => ({ id, name }));

  const { fromDate, toDate } = (() => {
    const now = new Date();
    if (dateRange === "7d") {
      const from = new Date(now); from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "30d") {
      const from = new Date(now); from.setDate(from.getDate() - 30); from.setHours(0, 0, 0, 0);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: from, toDate: null as Date | null };
    }
    if (dateRange === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      let to: Date | null = null;
      if (customTo) { to = new Date(customTo); to.setHours(23, 59, 59, 999); }
      return { fromDate: from, toDate: to };
    }
    return { fromDate: null as Date | null, toDate: null as Date | null };
  })();

  const q = query.trim().toLowerCase();
  const filtered = reports.filter(r => {
    if (selectedSubject && r.subjectId !== selectedSubject) return false;
    if (fromDate || toDate) {
      const created = new Date(r.createdAt);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
    }
    if (!q) return true;
    const title = (r.envTitle || "").toLowerCase();
    const feedback = (r.feedbackHtml || "").toLowerCase();
    return title.includes(q) || feedback.includes(q);
  });

  const dateFilterActive =
    dateRange === "7d" || dateRange === "30d" || dateRange === "month" ||
    (dateRange === "custom" && (customFrom !== "" || customTo !== ""));
  const isFiltering = selectedSubject !== null || q.length > 0 || dateFilterActive;

  const dateChips: { id: DateRange; label: string }[] = [
    { id: "all",    label: td.filterAll },
    { id: "7d",     label: td.filter7d },
    { id: "30d",    label: td.filter30d },
    { id: "month",  label: td.filterMonth },
    { id: "custom", label: td.filterCustom },
  ];

  const resetFilters = () => {
    setSelectedSubject(null); setQuery(""); setDateRange("all"); setCustomFrom(""); setCustomTo("");
  };

  return (
    <SectionState
      loading={loading}
      error={error}
      empty={reports.length === 0}
      emptyIcon={<FlaskConical className="w-10 h-10" />}
      emptyMessage={td.emptyLabReports}
      onRetry={onRetry}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          {subjects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  selectedSubject === null
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {td.filterAllReports} ({reports.length})
              </button>
              {subjects.map(s => {
                const count = reports.filter(r => r.subjectId === s.id).length;
                const active = selectedSubject === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubject(active ? null : s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? "bg-emerald/20 border-emerald/40 text-emerald"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {s.name} ({count})
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {dateChips.map(c => {
              const active = dateRange === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setDateRange(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active
                      ? "bg-emerald/20 border-emerald/40 text-emerald"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {dateRange === "custom" && (
            <div className="flex flex-wrap gap-2 items-center">
              <label className="text-xs text-muted-foreground">{td.filterFrom}</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald/40" />
              <label className="text-xs text-muted-foreground">{td.filterTo}</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald/40" />
            </div>
          )}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={td.filterSearch}
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald/40"
              dir="rtl"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"
                aria-label={td.filterSearchClear}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-muted-foreground">
            <FlaskConical className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="mb-3">{td.noResults}</p>
            {isFiltering && (
              <button onClick={resetFilters} className="text-xs text-emerald hover:underline">
                {td.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(r => <LabReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </SectionState>
  );
}
