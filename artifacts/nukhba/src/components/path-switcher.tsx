// ─────────────────────────────────────────────────────────────────────────────
// R1 — PathSwitcher.
//
// Compact tab strip showing the two v4 paths available for a subject:
//   - المسار المخصص (custom) — if the student has a custom path row.
//   - مسار ملازم جامعية (booklet) — one tab per ready booklet.
//
// Injected into the header of subject pages, the v4 map, and booklet
// sessions so the student can flip between paths without leaving the
// learning surface.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, BookOpen, Loader2 } from "lucide-react";

type ActivePaths = {
  slug: string;
  currentPathType: "custom" | "booklet" | null;
  currentBookletId: number | null;
  hasCustomPath: boolean;
  booklets: Array<{ id: number; title: string; pagesCount: number }>;
};

type Props = {
  slug: string;
  /** What the caller currently considers "active" — overrides server view
   *  (useful when the active row hasn't been committed yet, e.g. mid-session). */
  activeOverride?: { kind: "custom" } | { kind: "booklet"; bookletId: number };
  /** Compact mode for narrow headers. */
  compact?: boolean;
};

export function PathSwitcher({ slug, activeOverride, compact }: Props) {
  const [, navigate] = useLocation();
  const [data, setData] = useState<ActivePaths | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/v4/booklet/active-paths/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const json = await r.json();
        if (!cancelled) setData(json as ActivePaths);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-white/40">
        <Loader2 className="w-3 h-3 animate-spin" /> المسارات…
      </div>
    );
  }
  if (!data) return null;

  const isCustomActive = activeOverride?.kind === "custom"
    || (!activeOverride && data.currentPathType === "custom");
  const activeBookletId = activeOverride?.kind === "booklet"
    ? activeOverride.bookletId
    : (activeOverride ? null : (data.currentPathType === "booklet" ? data.currentBookletId : null));

  // If no paths exist yet, send the student to the path-choice screen.
  if (!data.hasCustomPath && data.booklets.length === 0) {
    return (
      <button
        onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" /> اختر مساراً
      </button>
    );
  }

  const baseTab =
    "inline-flex items-center gap-1.5 rounded-lg text-xs border transition-colors whitespace-nowrap";
  const pad = compact ? "px-2 py-1" : "px-3 py-1.5";
  const inactive = "bg-white/[0.03] border-white/10 text-white/60 hover:border-white/30 hover:text-white";

  return (
    <div className="flex items-center gap-1.5 flex-wrap" style={{ direction: "rtl" }}>
      <span className="text-[10px] text-white/40 ml-1">المسار:</span>

      {data.hasCustomPath && (
        isCustomActive ? (
          <span
            className={`${baseTab} ${pad} bg-gold/15 border-gold/60 text-gold cursor-default`}
            title="المسار المخصص"
          >
            <Sparkles className="w-3 h-3" />
            {compact ? "مخصص" : "المسار المخصص"}
          </span>
        ) : (
          <button
            onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
            className={`${baseTab} ${pad} ${inactive}`}
            title="المسار المخصص"
          >
            <Sparkles className="w-3 h-3" />
            {compact ? "مخصص" : "المسار المخصص"}
          </button>
        )
      )}

      {data.booklets.map((b) => {
        const active = activeBookletId === b.id;
        const label = compact ? `ملزمة #${b.id}` : (b.title.length > 28 ? b.title.slice(0, 26) + "…" : b.title);
        return (
          <button
            key={b.id}
            onClick={() => navigate(`/booklet/${b.id}`)}
            className={`${baseTab} ${pad} ${active
              ? "bg-emerald/15 border-emerald/60 text-emerald"
              : inactive}`}
            title={b.title}
          >
            <BookOpen className="w-3 h-3" />
            {label}
          </button>
        );
      })}

    </div>
  );
}

export default PathSwitcher;
