// ─────────────────────────────────────────────────────────────────────────────
// v4 Booklet — Phase E: Duolingo-style visual map for an uploaded booklet.
//
// Mirrors the custom-path map (v4-map.tsx) aesthetic but LEAN: booklets never
// lock nodes (free navigation), so there is no test-out / gating logic. Data
// comes read-only from GET /api/v4/booklet/:id/map (?level=N to browse levels).
//
// Node click wiring:
//   - lesson   → /booklet/:id?lesson=CODE  (focuses the booklet teaching screen)
//   - lab      → Phase G runner (placeholder toast until then)
//   - exam     → Phase G runner (placeholder toast until then)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Loader2, Star, FlaskConical, Trophy, Crown, BookOpen,
  CheckCircle, Play, ChevronRight, ChevronLeft, ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

// ─── Types (match buildBookletMap output) ───────────────────────────────────
type BkStatus = "completed" | "active" | "available";
type BkKind = "lesson" | "lab" | "unit_test" | "final_test";

interface LessonNode { code: string; name: string; kind: "lesson"; status: BkStatus; stars: number }
interface LabNode { code: string; title: string; kind: "lab"; status: BkStatus; score: number | null }
interface TestNode { code: string; title: string; kind: "unit_test" | "final_test"; status: BkStatus }
interface UnitTree {
  unitIndex: number; code: string; name: string;
  lessons: LessonNode[]; labs: LabNode[];
  hasUnitTest: boolean; unitTest: TestNode | null;
}
interface StageTree { stageIndex: number; name: string; units: UnitTree[] }
interface LevelSummary { levelIndex: number; name: string; status: "completed" | "current" | "upcoming" }
interface BookletMapResponse {
  booklet: { id: number; title: string; subjectId: string; status: string; depth: string };
  map: {
    currentLevelIndex: number; viewedLevelIndex: number; realCurrentLevelIndex: number; totalLevels: number;
    levels: LevelSummary[]; levelName: string;
    progressPct: number; overallProgressPct: number; completedNodes: number; totalNodes: number;
    stages: StageTree[];
    finalTest: TestNode | null;
  };
}

// ─── Flat render node ────────────────────────────────────────────────────────
interface FlatNode {
  id: string;
  label: string;
  sublabel?: string;
  kind: BkKind;
  status: BkStatus;
  stars?: number;
  score?: number | null;
  stageStart?: { name: string };
  unitStart?: { name: string };
}

function flattenMap(map: BookletMapResponse["map"]): FlatNode[] {
  const nodes: FlatNode[] = [];
  for (const stage of map.stages ?? []) {
    let firstInStage = true;
    for (const unit of stage.units ?? []) {
      let firstInUnit = true;
      const markUnit = () => {
        const stageStart = firstInStage ? { name: stage.name } : undefined;
        const unitStart = firstInUnit ? { name: unit.name } : undefined;
        firstInStage = false;
        firstInUnit = false;
        return { stageStart, unitStart };
      };
      for (const lesson of unit.lessons ?? []) {
        const { stageStart, unitStart } = markUnit();
        nodes.push({ id: lesson.code, label: lesson.name, kind: "lesson", status: lesson.status, stars: lesson.stars, stageStart, unitStart });
      }
      for (const lab of unit.labs ?? []) {
        const { stageStart, unitStart } = markUnit();
        nodes.push({ id: lab.code, label: lab.title, kind: "lab", status: lab.status, score: lab.score, stageStart, unitStart });
      }
      if (unit.hasUnitTest && unit.unitTest) {
        const { stageStart, unitStart } = markUnit();
        nodes.push({ id: unit.unitTest.code, label: "اختبار الوحدة", sublabel: unit.name, kind: "unit_test", status: unit.unitTest.status, stageStart, unitStart });
      }
    }
  }
  if (map.finalTest) {
    nodes.push({ id: map.finalTest.code, label: "الاختبار النهائي", sublabel: "الملزمة كاملة", kind: "final_test", status: map.finalTest.status });
  }
  return nodes;
}

// ─── Zigzag X-offset (winding road) ─────────────────────────────────────────
const ZIGZAG_PX = [0, 72, 110, 72, 0, -72, -110, -72];

// ─── Progress ring ───────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 72, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-label={`${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
        strokeLinecap="round"
        style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: "stroke-dashoffset 1s ease" }}
        className="stroke-amber-400"
      />
    </svg>
  );
}

function Stars({ count }: { count: number }) {
  const c = Math.max(0, Math.min(3, count || 0));
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {[1, 2, 3].map((n) => (
        <Star key={n} className={`w-3 h-3 ${n <= c ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"}`} />
      ))}
    </div>
  );
}

// ─── Node components ─────────────────────────────────────────────────────────
function LessonNodeView({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const base = "relative flex flex-col items-center cursor-pointer select-none";
  if (node.status === "completed") {
    return (
      <button onClick={onClick} className={base} title={node.label}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-emerald-300 shadow-lg shadow-emerald-400/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
          <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <Stars count={node.stars ?? 0} />
        <span className="text-[10px] text-white/60 text-center max-w-[72px] mt-1 leading-tight line-clamp-2">{node.label}</span>
      </button>
    );
  }
  if (node.status === "active") {
    return (
      <button onClick={onClick} className={base} title={node.label}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
          <div className="absolute inset-[-4px] rounded-full border-2 border-violet-400/40 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 border-2 border-violet-300 shadow-xl shadow-violet-500/60 flex items-center justify-center relative z-10 transition-transform hover:scale-105 active:scale-95">
            <Play className="w-7 h-7 text-white fill-white" />
          </div>
        </div>
        <span className="text-[10px] text-violet-300 font-semibold text-center max-w-[72px] mt-2 leading-tight line-clamp-2">{node.label}</span>
      </button>
    );
  }
  // available
  return (
    <button onClick={onClick} className={base} title={node.label}>
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/60 to-indigo-700/70 border-2 border-indigo-400/50 shadow-md shadow-indigo-400/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
        <BookOpen className="w-7 h-7 text-indigo-200" />
      </div>
      <span className="text-[10px] text-white/50 text-center max-w-[72px] mt-1 leading-tight line-clamp-2">{node.label}</span>
    </button>
  );
}

function LabNodeView({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const isDone = node.status === "completed";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group" title={node.label}>
      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-transform group-hover:scale-105 ${
        isDone ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 shadow-lg shadow-emerald-400/40"
               : "bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300 shadow-lg shadow-orange-400/40"
      }`}>
        {isDone ? <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} /> : <FlaskConical className="w-7 h-7 text-white" />}
      </div>
      <span className={`text-[10px] text-center max-w-[72px] leading-tight line-clamp-2 ${isDone ? "text-emerald-300" : "text-orange-300"}`}>{node.label}</span>
    </button>
  );
}

function HexShape({ size, children, className }: { size: number; children: React.ReactNode; className: string }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${size / 2 + (size / 2 - 2) * Math.cos(a)},${size / 2 + (size / 2 - 2) * Math.sin(a)}`;
  }).join(" ");
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className={`absolute inset-0 ${className}`} viewBox={`0 0 ${size} ${size}`}><polygon points={pts} /></svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
}

function OctShape({ size, children, className }: { size: number; children: React.ReactNode; className: string }) {
  const s = size;
  const d = s * 0.293;
  const pts = `${d},0 ${s - d},0 ${s},${d} ${s},${s - d} ${s - d},${s} ${d},${s} 0,${s - d} 0,${d}`;
  return (
    <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
      <svg className={`absolute inset-0 ${className}`} viewBox={`0 0 ${s} ${s}`}><polygon points={pts} /></svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
}

function TestNodeView({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const isDone = node.status === "completed";
  if (node.kind === "final_test") {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group" title={node.label}>
        <div className="transition-transform group-hover:scale-110">
          <OctShape size={76} className={isDone ? "fill-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]" : "fill-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]"}>
            <Crown className={`w-8 h-8 ${isDone ? "text-emerald-900" : "text-amber-900"}`} />
          </OctShape>
        </div>
        <span className="text-[10px] text-center text-amber-200/80 max-w-[80px] leading-tight font-semibold">{node.label}</span>
      </button>
    );
  }
  // unit_test
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group" title={node.label}>
      <div className="transition-transform group-hover:scale-105">
        <HexShape size={60} className={isDone ? "fill-emerald-400 drop-shadow-lg" : "fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"}>
          <Trophy className={`w-6 h-6 ${isDone ? "text-emerald-900" : "text-amber-900"}`} />
        </HexShape>
      </div>
      <span className="text-[10px] text-center text-amber-300/70 max-w-[80px] leading-tight line-clamp-1">{node.label}</span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function BookletMap() {
  const [, params] = useRoute<{ id: string }>("/booklet/:id/map");
  const id = Number(params?.id ?? 0);
  const [, navigate] = useLocation();

  const [data, setData] = useState<BookletMapResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notReady, setNotReady] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [soon, setSoon] = useState<string | null>(null);

  const reqRef = useRef(0);
  async function load(level?: number) {
    const myReq = ++reqRef.current; // ignore stale responses after rapid level clicks
    setLoading(true);
    setErr(null);
    setNotReady(null);
    try {
      const q = Number.isFinite(level as number) ? `?level=${level}` : "";
      const r = await fetch(`/api/v4/booklet/${id}/map${q}`, { credentials: "include" });
      if (myReq !== reqRef.current) return;
      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        if (myReq !== reqRef.current) return;
        setNotReady(j?.status === "processing" ? "الملزمة قيد التحضير — انتظر قليلاً ثم حدّث الصفحة." : "الملزمة غير جاهزة بعد.");
        return;
      }
      if (!r.ok) throw new Error(`http_${r.status}`);
      const j = (await r.json()) as BookletMapResponse;
      if (myReq !== reqRef.current) return;
      setData(j);
    } catch (e: any) {
      if (myReq === reqRef.current) setErr(String(e?.message ?? e));
    } finally {
      if (myReq === reqRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isInteger(id) && id > 0) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const flat = useMemo(() => (data ? flattenMap(data.map) : []), [data]);

  function showSoon(msg: string) {
    setSoon(msg);
    window.setTimeout(() => setSoon(null), 2500);
  }

  function openNode(node: FlatNode) {
    if (node.kind === "lesson") {
      navigate(`/booklet/${id}?lesson=${encodeURIComponent(node.id)}`);
    } else if (node.kind === "lab") {
      navigate(`/booklet/${id}/lab/${encodeURIComponent(node.id)}`);
    } else {
      // unit_test | final_test → same MCQ runner
      navigate(`/booklet/${id}/exam/${encodeURIComponent(node.id)}`);
    }
  }

  // Level switcher neighbours (levels may be sparse — derive from the list).
  const levelNav = useMemo(() => {
    if (!data) return { prev: null as number | null, next: null as number | null, total: 0 };
    const sorted = [...(data.map.levels ?? [])].sort((a, b) => a.levelIndex - b.levelIndex);
    const pos = sorted.findIndex((l) => l.levelIndex === data.map.viewedLevelIndex);
    return {
      prev: pos > 0 ? sorted[pos - 1].levelIndex : null,
      next: pos >= 0 && pos < sorted.length - 1 ? sorted[pos + 1].levelIndex : null,
      total: sorted.length,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      </AppLayout>
    );
  }

  if (notReady) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <p className="text-white/70 mb-4">{notReady}</p>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="px-4 py-2 rounded-xl bg-white/10 text-sm">تحديث</button>
            <button onClick={() => navigate(`/booklet/${id}`)} className="px-4 py-2 rounded-xl bg-white/10 text-sm">فتح الملزمة</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (err || !data) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <p className="text-red-300 mb-4">تعذّر تحميل الخريطة.</p>
          <button onClick={() => void load()} className="px-4 py-2 rounded-xl bg-white/10 text-sm">إعادة المحاولة</button>
        </div>
      </AppLayout>
    );
  }

  const m = data.map;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-gradient-to-b from-[hsl(222,28%,7%)] via-[hsl(222,28%,7%)]/95 to-transparent backdrop-blur">
          <button
            onClick={() => navigate(`/path/${encodeURIComponent(data.booklet.subjectId)}/booklet`)}
            className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white mb-2"
          >
            <ChevronRight className="w-4 h-4" /> الملازم
          </button>
          <div className="flex items-center gap-3 rounded-2xl bg-card/40 border border-white/10 p-3">
            <div className="relative shrink-0">
              <ProgressRing pct={m.overallProgressPct} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-300">{m.overallProgressPct}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white truncate">{data.booklet.title}</h1>
              <p className="text-xs text-white/50 mt-0.5">
                {m.completedNodes} / {m.totalNodes} في هذا المستوى · {m.overallProgressPct}% إجمالاً
              </p>
              <button
                onClick={() => navigate(`/booklet/${id}`)}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald/15 border border-emerald/40 text-emerald text-xs font-semibold hover:bg-emerald/25 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> ادخل وضع الشرح
              </button>
            </div>
          </div>

          {/* Level switcher */}
          {levelNav.total > 1 && (
            <div className="flex items-center justify-between mt-3 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5">
              <button
                onClick={() => levelNav.prev != null && void load(levelNav.prev)}
                disabled={levelNav.prev == null}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/70 disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <span className="text-xs font-semibold text-amber-300 text-center px-2 truncate">
                المستوى {m.viewedLevelIndex} — {m.levelName}
              </span>
              <button
                onClick={() => levelNav.next != null && void load(levelNav.next)}
                disabled={levelNav.next == null}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/70 disabled:opacity-30 hover:bg-white/10"
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Node road */}
        <div className="relative mt-6 flex flex-col items-center gap-7">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pt-10 bg-[hsl(222,28%,7%)]/40">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            </div>
          )}
          {flat.length === 0 && (
            <p className="text-white/50 text-sm py-10">لا يوجد محتوى في هذا المستوى.</p>
          )}
          {flat.map((node, i) => {
            const xOff = ZIGZAG_PX[i % ZIGZAG_PX.length];
            return (
              <div key={`${node.kind}:${node.id}`} className="w-full flex flex-col items-center">
                {node.stageStart && (
                  <div className="w-full flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gradient-to-l from-amber-400/40 to-transparent" />
                    <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <ArrowRight className="w-4 h-4" /> {node.stageStart.name}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-amber-400/40 to-transparent" />
                  </div>
                )}
                {node.unitStart && (
                  <div className="mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/60 font-medium">
                    {node.unitStart.name}
                  </div>
                )}
                <div style={{ transform: `translateX(${xOff}px)` }} className="transition-transform">
                  {node.kind === "lesson" && <LessonNodeView node={node} onClick={() => openNode(node)} />}
                  {node.kind === "lab" && <LabNodeView node={node} onClick={() => openNode(node)} />}
                  {(node.kind === "unit_test" || node.kind === "final_test") && <TestNodeView node={node} onClick={() => openNode(node)} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming-soon toast (lab/exam runners land in Phase G) */}
      {soon && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-amber-200 text-sm shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {soon}
        </div>
      )}
    </AppLayout>
  );
}
