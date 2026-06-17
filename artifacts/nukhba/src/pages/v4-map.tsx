// ─────────────────────────────────────────────────────────────────────────────
// v4 Task #4 — Duolingo-style Visual Map
//
// Renders the student's learning path as a beautiful zigzag node map:
// 7 node types, SVG progress ring, celebration badge, locked-level boxes.
//
// Architecture constraints (from spec):
//   - Zero JS for basic animation — pure CSS only (pulse, shake).
//   - Static Tailwind class names only (no dynamic `bg-${x}-500`).
//   - framer-motion only for the stage-celebration badge.
//   - No AI calls — all data from /api/v4/path/:slug/map.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Lock, Star, FlaskConical, Trophy, Crown, BookOpen,
  CheckCircle, Play, ChevronRight, Sparkles, Map, ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PathSwitcher } from "@/components/path-switcher";

// ─── Types ───────────────────────────────────────────────────────────────────
type NodeStatus = "completed" | "active" | "available" | "locked";
type NodeKind = "lesson" | "lab" | "unit_test" | "stage_test" | "level_test";

interface LessonNode { code: string; name: string; kind: "lesson"; status: NodeStatus; stars: 0 | 1 | 2 | 3 }
interface LabNode { code: string; title: string; kind: "lab"; status: NodeStatus }
interface TestNode { code: string; kind: "unit_test" | "stage_test" | "level_test"; status: NodeStatus }

interface UnitTree {
  unitIndex: number; code: string; name: string;
  lessons: LessonNode[]; labs: LabNode[];
  hasUnitTest: boolean; unitTest: TestNode | null;
}
interface StageTree {
  stageIndex: number; code: string; name: string;
  units: UnitTree[];
  hasStageTest: boolean; stageTest: TestNode | null;
}
interface MapData {
  currentLevelIndex: number; totalLevels: number;
  levelName: string; levelGoal: string;
  progressPct: number; completedNodes: number; totalNodes: number;
  stages: StageTree[];
  levelTest: TestNode | null;
}
interface MapResponse {
  specialty: { slug: string; name: string; icon: string | null };
  studentPath: { startMode: string; currentLessonCode: string | null; pathType: string; placementUnitCode?: string | null };
  map: MapData;
  nextLevels: { levelIndex: number; name: string; locked: boolean }[];
}

// ─── Flat node for rendering ─────────────────────────────────────────────────
interface FlatNode {
  id: string;
  label: string;
  sublabel?: string;
  kind: NodeKind;
  status: NodeStatus;
  stars?: 0 | 1 | 2 | 3;
  stageStart?: { stageIndex: number; stageName: string };
  unitStart?: { unitIndex: number; unitName: string };
  isLastInStage?: boolean;
}

function flattenMap(mapData: MapData): FlatNode[] {
  const nodes: FlatNode[] = [];
  for (const stage of mapData.stages) {
    let firstInStage = true;
    for (const unit of stage.units) {
      let firstInUnit = true;
      for (const lesson of unit.lessons) {
        nodes.push({
          id: lesson.code,
          label: lesson.name,
          kind: "lesson",
          status: lesson.status,
          stars: lesson.stars,
          stageStart: firstInStage && firstInUnit ? { stageIndex: stage.stageIndex, stageName: stage.name } : undefined,
          unitStart: firstInUnit ? { unitIndex: unit.unitIndex, unitName: unit.name } : undefined,
        });
        firstInStage = false;
        firstInUnit = false;
      }
      for (const lab of unit.labs) {
        nodes.push({ id: lab.code, label: lab.title, kind: "lab", status: lab.status });
      }
      if (unit.hasUnitTest && unit.unitTest) {
        nodes.push({ id: unit.unitTest.code, label: "اختبار الوحدة", sublabel: unit.name, kind: "unit_test", status: unit.unitTest.status });
      }
    }
    if (stage.hasStageTest && stage.stageTest) {
      nodes.push({ id: stage.stageTest.code, label: "اختبار المرحلة", sublabel: stage.name, kind: "stage_test", status: stage.stageTest.status, isLastInStage: true });
    }
  }
  if (mapData.levelTest) {
    nodes.push({ id: mapData.levelTest.code, label: "اختبار المستوى", sublabel: mapData.levelName, kind: "level_test", status: mapData.levelTest.status });
  }
  return nodes;
}

// ─── R5: Live-event state updaters ───────────────────────────────────────────
// These are pure functions that produce a new MapResponse with the targeted
// node(s) mutated. Keeping them at module scope (a) makes them easy to unit
// test, and (b) avoids re-creating closures on every render.

/**
 * Mark a single node (lesson/lab/exam) as completed and bump the map
 * counters. A passing lab/exam flips status → "completed"; a failed
 * attempt leaves the status alone but is still surfaced (the FE could
 * show a ❌ overlay later — out of scope here).
 *
 * The `nodeId` is the canonical code: "1.1.1.2" for a lesson,
 * "1.1.1.م1" for a lab, "1.1.1.exam" / "1.1.exam" / "1.exam" for an
 * exam at the matching scope.
 */
function applyNodeCompleted(prev: MapResponse, nodeId: string, score: number, passed: boolean): MapResponse {
  if (!passed) return prev;          // Failures don't change visual state.
  let bumped = false;
  const newStages = prev.map.stages.map((stage) => {
    const newUnits = stage.units.map((unit) => {
      let unitChanged = false;
      // Lesson?
      const newLessons = unit.lessons.map((l) => {
        if (l.code !== nodeId || l.status === "completed") return l;
        unitChanged = true; bumped = true;
        // Award a star tier from the score band — purely cosmetic.
        const stars: 0 | 1 | 2 | 3 = score >= 90 ? 3 : score >= 75 ? 2 : 1;
        return { ...l, status: "completed" as NodeStatus, stars };
      });
      // Lab?
      const newLabs = unit.labs.map((lab) => {
        if (lab.code !== nodeId || lab.status === "completed") return lab;
        unitChanged = true; bumped = true;
        return { ...lab, status: "completed" as NodeStatus };
      });
      // Unit exam?
      let newUnitTest = unit.unitTest;
      if (unit.unitTest && unit.unitTest.code === nodeId && unit.unitTest.status !== "completed") {
        unitChanged = true; bumped = true;
        newUnitTest = { ...unit.unitTest, status: "completed" as NodeStatus };
      }
      if (!unitChanged) return unit;
      return { ...unit, lessons: newLessons, labs: newLabs, unitTest: newUnitTest };
    });
    // Stage exam?
    let newStageTest = stage.stageTest;
    let stageChanged = newUnits.some((u, i) => u !== stage.units[i]);
    if (stage.stageTest && stage.stageTest.code === nodeId && stage.stageTest.status !== "completed") {
      newStageTest = { ...stage.stageTest, status: "completed" as NodeStatus };
      stageChanged = true; bumped = true;
    }
    if (!stageChanged) return stage;
    return { ...stage, units: newUnits, stageTest: newStageTest };
  });

  // Level exam?
  let newLevelTest = prev.map.levelTest;
  if (prev.map.levelTest && prev.map.levelTest.code === nodeId && prev.map.levelTest.status !== "completed") {
    newLevelTest = { ...prev.map.levelTest, status: "completed" as NodeStatus };
    bumped = true;
  }

  if (!bumped) return prev;
  const completedNodes = Math.min(prev.map.totalNodes, prev.map.completedNodes + 1);
  const progressPct = prev.map.totalNodes > 0
    ? Math.round((completedNodes / prev.map.totalNodes) * 100)
    : prev.map.progressPct;
  return {
    ...prev,
    map: { ...prev.map, stages: newStages, levelTest: newLevelTest, completedNodes, progressPct },
  };
}

/**
 * Flip newly-unlocked lesson nodes from "locked" → "available", and
 * promote the new currentLessonCode to "active". Only mutates lessons —
 * exam/lab unlocks derive from lesson state on the next map refetch.
 */
function applyLessonsUnlocked(prev: MapResponse, codes: string[], nextLessonCode: string | null): MapResponse {
  if (codes.length === 0 && !nextLessonCode) return prev;
  const codeSet = new Set(codes);
  const newStages = prev.map.stages.map((stage) => {
    const newUnits = stage.units.map((unit) => {
      let unitChanged = false;
      const newLessons = unit.lessons.map((l) => {
        if (l.code === nextLessonCode && l.status !== "active") {
          unitChanged = true;
          return { ...l, status: "active" as NodeStatus };
        }
        if (codeSet.has(l.code) && l.status === "locked") {
          unitChanged = true;
          return { ...l, status: "available" as NodeStatus };
        }
        return l;
      });
      return unitChanged ? { ...unit, lessons: newLessons } : unit;
    });
    const stageChanged = newUnits.some((u, i) => u !== stage.units[i]);
    return stageChanged ? { ...stage, units: newUnits } : stage;
  });
  return {
    ...prev,
    map: { ...prev.map, stages: newStages },
    studentPath: nextLessonCode
      ? { ...prev.studentPath, currentLessonCode: nextLessonCode }
      : prev.studentPath,
  };
}

// ─── Zigzag X-offset pattern (8-cycle, px) ───────────────────────────────────
// Produces a winding snake road matching Duolingo's aesthetic.
const ZIGZAG_PX = [0, 72, 110, 72, 0, -72, -110, -72];

// ─── Progress Ring SVG ───────────────────────────────────────────────────────
function ProgressRing({ pct, size = 88, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
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

// ─── Star Row ────────────────────────────────────────────────────────────────
function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex gap-0.5 justify-center mt-1">
      {[1, 2, 3].map((n) => (
        <Star key={n} className={`w-3 h-3 ${n <= count ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"}`} />
      ))}
    </div>
  );
}

// ─── Node Components (7 types) ───────────────────────────────────────────────
// All classes are static Tailwind — no dynamic `bg-${x}` interpolation.

function LessonNode({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const shakeRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (node.status === "locked") {
      shakeRef.current?.classList.add("animate-bounce");
      setTimeout(() => shakeRef.current?.classList.remove("animate-bounce"), 600);
    }
    onClick();
  }

  const base = "relative flex flex-col items-center cursor-pointer select-none";

  if (node.status === "completed") {
    return (
      <button ref={shakeRef} onClick={handleClick} className={base} title={node.label}>
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
      <button ref={shakeRef} onClick={handleClick} className={base} title={node.label}>
        <div className="relative">
          {/* Outer pulse ring - pure CSS */}
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

  if (node.status === "available") {
    return (
      <button ref={shakeRef} onClick={handleClick} className={base} title={node.label}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/60 to-indigo-700/70 border-2 border-indigo-400/50 shadow-md shadow-indigo-400/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
          <BookOpen className="w-7 h-7 text-indigo-200" />
        </div>
        <span className="text-[10px] text-white/50 text-center max-w-[72px] mt-1 leading-tight line-clamp-2">{node.label}</span>
      </button>
    );
  }

  // locked
  return (
    <div className="group relative flex flex-col items-center cursor-not-allowed" onClick={handleClick}>
      <button
        ref={shakeRef}
        onClick={handleClick}
        className="w-16 h-16 rounded-full bg-slate-800/80 border-2 border-slate-700 flex items-center justify-center transition-all group-hover:scale-105"
      >
        <Lock className="w-6 h-6 text-slate-500" />
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        أكمل الدرس السابق أولاً
        <div className="absolute top-full right-1/2 translate-x-1/2 border-4 border-transparent border-t-slate-700" />
      </div>
      <span className="text-[10px] text-slate-600 text-center max-w-[72px] mt-1 leading-tight line-clamp-2">{node.label}</span>
    </div>
  );
}

// Hexagon SVG mask for unit/stage tests
function HexShape({ size, children, className }: { size: number; children: React.ReactNode; className: string }) {
  const id = `hex-${size}`;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${size / 2 + (size / 2 - 2) * Math.cos(a)},${size / 2 + (size / 2 - 2) * Math.sin(a)}`;
  }).join(" ");
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className={`absolute inset-0 ${className}`} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={pts} />
      </svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
}

// Octagon for level test
function OctShape({ size, children, className }: { size: number; children: React.ReactNode; className: string }) {
  const s = size;
  const d = s * 0.293;
  const pts = `${d},0 ${s - d},0 ${s},${d} ${s},${s - d} ${s - d},${s} ${d},${s} 0,${s - d} 0,${d}`;
  return (
    <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
      <svg className={`absolute inset-0 ${className}`} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={pts} />
      </svg>
      <div className="relative z-10 flex items-center justify-center">{children}</div>
    </div>
  );
}

function TestNodeComp({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const isLocked = node.status === "locked";

  if (node.kind === "unit_test") {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group" title={node.label}>
        <div className={`transition-transform group-hover:scale-105 ${isLocked ? "opacity-50" : ""}`}>
          <HexShape size={56} className={isLocked ? "fill-slate-700" : "fill-slate-400 drop-shadow-lg"}>
            <Trophy className={`w-5 h-5 ${isLocked ? "text-slate-500" : "text-slate-900"}`} />
          </HexShape>
        </div>
        <span className="text-[10px] text-center text-slate-400 max-w-[72px] leading-tight line-clamp-1">{node.label}</span>
      </button>
    );
  }

  if (node.kind === "stage_test") {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group" title={node.label}>
        <div className={`transition-transform group-hover:scale-105 ${isLocked ? "opacity-50" : ""}`}>
          <HexShape size={68} className={isLocked ? "fill-slate-700" : "fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"}>
            <Trophy className={`w-7 h-7 ${isLocked ? "text-slate-500" : "text-amber-900"}`} />
          </HexShape>
        </div>
        <span className="text-[10px] text-center text-amber-300/70 max-w-[80px] leading-tight">{node.label}</span>
      </button>
    );
  }

  // level_test
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 cursor-pointer group" title={node.label}>
      <div className={`transition-transform group-hover:scale-110 ${isLocked ? "opacity-50" : ""}`}>
        <OctShape size={76} className={isLocked ? "fill-slate-700" : "fill-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]"}>
          <Crown className={`w-8 h-8 ${isLocked ? "text-slate-500" : "text-amber-900"}`} />
        </OctShape>
      </div>
      <span className="text-[10px] text-center text-amber-200/80 max-w-[80px] leading-tight font-semibold">{node.label}</span>
    </button>
  );
}

function LabNodeComp({ node, onClick }: { node: FlatNode; onClick: () => void }) {
  const isLocked = node.status === "locked";
  const isDone = node.status === "completed";
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group" title={node.label}>
      <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-transform group-hover:scale-105 relative ${
        isLocked  ? "bg-slate-800 border-slate-700 opacity-60" :
        isDone    ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 shadow-lg shadow-emerald-400/40" :
                    "bg-gradient-to-br from-orange-400 to-orange-600 border-orange-300 shadow-lg shadow-orange-400/40"
      }`}>
        {isDone
          ? <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
          : <FlaskConical className={`w-7 h-7 ${isLocked ? "text-slate-500" : "text-white"}`} />
        }
      </div>
      <span className={`text-[10px] text-center max-w-[72px] leading-tight line-clamp-2 ${
        isLocked ? "text-slate-600" : isDone ? "text-emerald-300" : "text-orange-300"
      }`}>{node.label}</span>
    </button>
  );
}

// ─── Celebration Badge ───────────────────────────────────────────────────────
// Task #3 (R3): level-transition animation. Enhanced from the original
// stage-complete badge with a confetti burst (24 particles, randomized
// trajectories), a zoom-pulse on the badge body, and a level-mode banner
// that swaps "أكملت مرحلة" for "ارتقيت مستوى" when `mode === "level"`.
function CelebrationBadge({
  stageName,
  onDone,
  mode = "stage",
}: {
  stageName: string;
  onDone: () => void;
  // R5 — added "lab" and "unit" for lab/unit-exam completion popups.
  // Visual treatment: lab/unit = lightweight (no backdrop, shorter
  // duration); stage = upgraded; level = full screen with banner.
  mode?: "lab" | "unit" | "stage" | "level";
}) {
  useEffect(() => {
    const ms =
      mode === "level" ? 4200 :
      mode === "stage" ? 3200 :
      2400;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [onDone, mode]);

  // Deterministic-ish randomized particles. 24 colored confetti dots
  // shoot outward from the centre on random vectors so each burst feels
  // slightly different without per-frame JS.
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 360 + (Math.random() * 30 - 15);
        const distance = 140 + Math.random() * 80;
        const colors = ["#fde68a", "#fbbf24", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"];
        return {
          dx: Math.cos((angle * Math.PI) / 180) * distance,
          dy: Math.sin((angle * Math.PI) / 180) * distance,
          color: colors[i % colors.length],
          rotate: Math.random() * 720 - 360,
          delay: Math.random() * 0.15,
        };
      }),
    [stageName, mode],
  );

  const isLevel = mode === "level";
  const headline =
    mode === "level" ? "ارتقيت مستوى!" :
    mode === "stage" ? "أكملت مرحلة!" :
    mode === "unit"  ? "أتممت الوحدة!" :
    "أتقنت المعمل!";
  const emoji = isLevel ? "👑" : mode === "lab" ? "🧪" : "🎉";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 30 }}
        animate={{ scale: [0, 1.15, 1], opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: -30 }}
        transition={{ type: "spring", stiffness: 240, damping: 16, scale: { duration: 0.6 } }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        {/* Backdrop wash for level transitions */}
        {isLevel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-amber-500/15 backdrop-blur-sm"
          />
        )}

        {/* Confetti burst */}
        {particles.map((p, idx) => (
          <motion.div
            key={idx}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{
              x: p.dx,
              y: p.dy,
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.9, 0.6],
              rotate: p.rotate,
            }}
            transition={{ duration: 1.6, delay: p.delay, ease: "easeOut" }}
            className="absolute w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}
          />
        ))}

        <motion.div
          animate={{ rotate: [0, -3, 3, -2, 2, 0], scale: isLevel ? [1, 1.08, 1] : 1 }}
          transition={{
            rotate: { repeat: 2, duration: 0.6, delay: 0.3 },
            scale: { repeat: isLevel ? Infinity : 0, duration: 1.6, ease: "easeInOut" },
          }}
          className={`relative ${
            isLevel
              ? "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-4 border-amber-100"
              : "bg-gradient-to-br from-amber-400 to-gold border-4 border-amber-200"
          } rounded-3xl px-10 py-8 text-center shadow-2xl shadow-amber-400/60`}
        >
          {/* Rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <motion.div
              key={deg}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 0] }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className={`absolute w-1 ${isLevel ? "h-12" : "h-8"} bg-amber-200/60 rounded-full`}
              style={{
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateY(-${isLevel ? 100 : 80}px)`,
                transformOrigin: "bottom center",
              }}
            />
          ))}
          <div className="text-5xl mb-2">{emoji}</div>
          <div className="text-xl font-black text-amber-900">{headline}</div>
          <div className="text-sm text-amber-800 mt-1 font-semibold">{stageName}</div>
          {isLevel && (
            <div className="mt-3 text-[11px] text-amber-900/70 font-semibold">
              فُتح مستوى جديد بالكامل ✨
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Locked Level Box ────────────────────────────────────────────────────────
function LockedLevelBox({ level }: { level: { levelIndex: number; name: string } }) {
  return (
    <div className="w-full max-w-sm mx-auto glass border border-white/10 rounded-2xl p-5 flex items-center gap-4 opacity-50">
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <Lock className="w-5 h-5 text-white/40" />
      </div>
      <div className="flex-1 text-right">
        <div className="text-xs text-white/30 mb-0.5">المستوى {level.levelIndex}</div>
        <div className="font-bold text-white/50 text-sm">{level.name}</div>
        <div className="text-[10px] text-white/30 mt-0.5">سيُبنى بعد إكمال المستوى الحالي</div>
      </div>
    </div>
  );
}

// ─── Connector path between nodes (SVG) ──────────────────────────────────────
// Renders a curved dotted line connecting consecutive node positions.
function ConnectorLine({ fromX, toX, color }: { fromX: number; toX: number; color: string }) {
  const midY = 50;
  const path = `M ${110 + fromX} 0 C ${110 + fromX} ${midY}, ${110 + toX} ${midY}, ${110 + toX} 100`;
  return (
    <svg
      viewBox="0 0 220 100"
      preserveAspectRatio="none"
      className="w-full h-12 overflow-visible pointer-events-none"
      aria-hidden
    >
      <path d={path} stroke={color} strokeWidth="3" strokeDasharray="6 4" fill="none" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

// ─── Stage Header banner ─────────────────────────────────────────────────────
const STAGE_PALETTES = [
  { accent: "#F59E0B", glow: "rgba(245,158,11,0.45)", text: "#FDE68A", badgeTop: "#FBBF24", badgeBot: "#B45309", bg: "rgba(245,158,11,0.12)", icon: "✦" },
  { accent: "#10B981", glow: "rgba(16,185,129,0.45)", text: "#A7F3D0", badgeTop: "#34D399", badgeBot: "#065F46", bg: "rgba(16,185,129,0.12)", icon: "◈" },
  { accent: "#8B5CF6", glow: "rgba(139,92,246,0.45)", text: "#DDD6FE", badgeTop: "#A78BFA", badgeBot: "#4C1D95", bg: "rgba(139,92,246,0.12)", icon: "❋" },
  { accent: "#0EA5E9", glow: "rgba(14,165,233,0.45)", text: "#BAE6FD", badgeTop: "#38BDF8", badgeBot: "#075985", bg: "rgba(14,165,233,0.12)", icon: "◉" },
  { accent: "#F43F5E", glow: "rgba(244,63,94,0.45)",  text: "#FECDD3", badgeTop: "#FB7185", badgeBot: "#881337", bg: "rgba(244,63,94,0.12)",  icon: "✿" },
  { accent: "#F97316", glow: "rgba(249,115,22,0.45)", text: "#FED7AA", badgeTop: "#FB923C", badgeBot: "#7C2D12", bg: "rgba(249,115,22,0.12)", icon: "⬡" },
  { accent: "#14B8A6", glow: "rgba(20,184,166,0.45)", text: "#99F6E4", badgeTop: "#2DD4BF", badgeBot: "#134E4A", bg: "rgba(20,184,166,0.12)", icon: "✧" },
];

function StageHeader({ stageIndex, name }: { stageIndex: number; name: string }) {
  const p = STAGE_PALETTES[(stageIndex - 1) % STAGE_PALETTES.length];
  return (
    <div
      className="w-full max-w-xs mx-auto my-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${p.bg} 0%, rgba(255,255,255,0.04) 50%, ${p.bg} 100%)`,
        border: `1px solid ${p.accent}50`,
        boxShadow: `
          0 0 0 1px rgba(255,255,255,0.06) inset,
          0 1px 0 0 rgba(255,255,255,0.15) inset,
          0 -2px 0 0 rgba(0,0,0,0.4) inset,
          0 4px 16px ${p.glow},
          0 10px 32px rgba(0,0,0,0.5),
          0 2px 4px rgba(0,0,0,0.6)
        `,
        transform: "perspective(300px) rotateX(1.5deg)",
        transformOrigin: "top center",
      }}
    >
      {/* top shine */}
      <div className="absolute top-0 right-0 left-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.35) 60%, transparent)` }} />
      {/* bottom shadow */}
      <div className="absolute bottom-0 right-0 left-0 h-[2px] pointer-events-none rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${p.accent}60 50%, transparent)` }} />
      {/* subtle left glow */}
      <div className="absolute top-0 right-0 h-full w-16 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${p.glow.replace("0.45","0.08")}, transparent)` }} />

      {/* 3D Badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-white text-sm relative"
        style={{
          background: `linear-gradient(145deg, ${p.badgeTop}, ${p.badgeBot})`,
          boxShadow: `0 1px 0 rgba(255,255,255,0.25) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 4px 12px ${p.glow}, 0 2px 4px rgba(0,0,0,0.5)`,
        }}
      >
        {stageIndex}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: p.accent, opacity: 0.85 }}>
          المرحلة {stageIndex}
        </div>
        <span className="text-sm font-black truncate block leading-tight" style={{ color: p.text }}>{name}</span>
      </div>

      <span className="text-lg shrink-0 opacity-40 select-none" style={{ color: p.accent }}>{p.icon}</span>
    </div>
  );
}

// ─── Unit Label ───────────────────────────────────────────────────────────────
function UnitLabel({ unitIndex, name, stageIndex = 1 }: { unitIndex: number; name: string; stageIndex?: number }) {
  const p = STAGE_PALETTES[(stageIndex - 1) % STAGE_PALETTES.length];
  return (
    <div
      className="w-full max-w-[272px] mx-auto my-3 relative flex items-center gap-3 px-4 py-2.5 rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(to left, ${p.bg.replace("0.12","0.18")}, rgba(255,255,255,0.04) 70%, transparent)`,
        border: `1px solid ${p.accent}30`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.07) inset, 0 3px 12px rgba(0,0,0,0.35), 0 0 0 0.5px ${p.accent}15`,
      }}
    >
      {/* Right-side color bar (RTL) */}
      <div
        className="absolute top-2 bottom-2 right-0 w-[3px] rounded-full"
        style={{ background: `linear-gradient(to bottom, ${p.accent}cc, ${p.accent}33)` }}
      />
      {/* Subtle glow behind badge */}
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full pointer-events-none"
        style={{ background: p.glow.replace("0.45","0.12"), filter: "blur(8px)" }}
      />

      {/* Numbered badge */}
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 relative z-10"
        style={{
          background: `linear-gradient(145deg, ${p.badgeTop}cc, ${p.badgeBot}99)`,
          border: `1px solid ${p.accent}50`,
          color: "#fff",
          boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 3px 8px ${p.glow.replace("0.45","0.4")}`,
        }}
      >
        {unitIndex}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="text-[9px] font-bold tracking-widest mb-px" style={{ color: p.accent, opacity: 0.75 }}>الوحدة {unitIndex}</div>
        <div className="text-[11px] font-bold truncate" style={{ color: p.text, opacity: 0.85 }}>{name}</div>
      </div>
    </div>
  );
}

// ─── Demo data (shown at /specialty/demo/map or ?demo=1) ─────────────────────
function buildDemoData(): MapResponse {
  const statuses: NodeStatus[] = ["completed", "completed", "active", "available", "locked", "locked", "locked", "locked", "locked", "locked"];
  const lessons = statuses.map((status, i) => ({
    code: `1.1.1.${i + 1}`, name: `درس ${i + 1}: ${["المفاهيم الأساسية","التطبيق العملي","التمييز بين الأنواع","بناء النموذج","التحليل","التوليف","التقييم","الربط","الإتقان","المراجعة"][i]}`,
    kind: "lesson" as const, status, stars: (status === "completed" ? (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1) : 0) as 0|1|2|3,
  }));
  return {
    specialty: { slug: "demo", name: "هندسة الغذاء", icon: "🧪" },
    studentPath: { startMode: "placement", currentLessonCode: "1.1.1.3", pathType: "custom" },
    map: {
      currentLevelIndex: 1, totalLevels: 5,
      levelName: "أساسيات علوم الغذاء", levelGoal: "فهم المبادئ الأساسية",
      progressPct: 24, completedNodes: 15, totalNodes: 63,
      stages: [
        {
          stageIndex: 1, code: "1.1", name: "مقدمة في علوم الغذاء",
          units: [{
            unitIndex: 1, code: "1.1.1", name: "تركيب المواد الغذائية",
            lessons, labs: [{ code: "1.1.1.م1", title: "معمل: تحليل المغذيات", kind: "lab" as const, status: "locked" as const }],
            hasUnitTest: true, unitTest: { code: "1.1.1.exam", kind: "unit_test" as const, status: "locked" as const },
          }],
          hasStageTest: true, stageTest: { code: "1.1.exam", kind: "stage_test" as const, status: "locked" as const },
        },
        {
          stageIndex: 2, code: "1.2", name: "الكيمياء الغذائية",
          units: [{
            unitIndex: 1, code: "1.2.1", name: "البروتينات والكربوهيدرات",
            lessons: ["الأحماض الأمينية","الغلوتين","النشا","السكريات","الألياف"].map((n,i) => ({ code:`1.2.1.${i+1}`,name:n,kind:"lesson" as const,status:"locked" as const,stars:0 as const })),
            labs: [], hasUnitTest: false, unitTest: null,
          }],
          hasStageTest: false, stageTest: null,
        },
      ],
      levelTest: { code: "1.exam", kind: "level_test" as const, status: "locked" as const },
    },
    nextLevels: [
      { levelIndex: 2, name: "تقنيات الحفظ والمعالجة", locked: true },
      { levelIndex: 3, name: "رقابة الجودة الغذائية", locked: true },
    ],
  };
}

// ─── Main Map Page ────────────────────────────────────────────────────────────
export default function V4Map() {
  const [, params] = useRoute<{ slug: string }>("/specialty/:slug/map");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();
  const isDemo = slug === "demo" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"));

  const [data, setData] = useState<MapResponse | null>(isDemo ? buildDemoData() : null);
  const [loading, setLoading] = useState(!isDemo);
  const [err, setErr] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ name: string; mode: "lab" | "unit" | "stage" | "level" } | null>(null);
  const [tooltip, setTooltip] = useState<{ code: string; text: string } | null>(null);
  // R5 — transient highlight for newly-unlocked lessons (yellow ring on
  // the node for ~2.5s) so the student notices what just became playable.
  const [flashCodes, setFlashCodes] = useState<Set<string>>(new Set());
  // Scroll-to-active: after a precise placement the student's current node can
  // sit deep in the map (e.g. unit 3.2.1). Center it on first load so they land
  // exactly where they start instead of at the top of the curriculum.
  const activeRef = useRef<HTMLDivElement | null>(null);
  const didCenterRef = useRef(false);

  useEffect(() => {
    if (!slug || isDemo) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/path/${encodeURIComponent(slug)}/map`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const d: MapResponse = await r.json();
        if (cancelled) return;
        setData(d);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message ?? "unknown"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, isDemo]);

  // ── R5 — Live progress channel ─────────────────────────────────────
  // EventSource holds an SSE connection to /v4/path/:slug/events. The
  // backend pushes node_completed / nodes_unlocked / celebration when
  // the student finishes a lab or exam from any other tab. Browser
  // EventSource auto-reconnects on transport errors, so we don't need
  // a manual retry loop. We only open the channel once we have data
  // loaded so the immutable updaters below have something to mutate.
  useEffect(() => {
    if (!slug || isDemo || !data) return;
    const es = new EventSource(`/api/v4/path/${encodeURIComponent(slug)}/events`, { withCredentials: true });

    // On reconnect (any open after the first) the map state may be stale
    // because we missed events while disconnected. Re-fetch the full map.
    let firstOpen = true;
    es.onopen = () => {
      if (firstOpen) { firstOpen = false; return; }
      // Slight delay so the server SSE channel is fully established before
      // we also fire the HTTP map request (avoids a micro-race on the server).
      setTimeout(() => {
        fetch(`/api/v4/path/${encodeURIComponent(slug)}/map`, { credentials: "include" })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && !cancelled) setData(d); })
          .catch(() => {/* silent — stale data is better than a crash */});
      }, 300);
    };

    const onMessage = (ev: MessageEvent): void => {
      let evt: any;
      try { evt = JSON.parse(ev.data); } catch { return; }
      if (!evt || typeof evt !== "object") return;
      if (evt.kind === "hello") return;
      // Defensive slug filter — the bus is already scoped by (userId, slug)
      // on the server, but guard here too so a stale connection (e.g. a
      // navigation that didn't fully close the EventSource yet) can't
      // mutate the new map. Events without a slug field are treated as
      // matching for forward-compat.
      if (typeof evt.slug === "string" && evt.slug && evt.slug !== slug) return;

      if (evt.kind === "node_completed") {
        const { nodeId, score, passed } = evt as { nodeId: string; score: number; passed: boolean };
        setData(prev => prev ? applyNodeCompleted(prev, nodeId, score, !!passed) : prev);
        // Persist stars for lesson nodes so they survive a page refresh.
        // Lessons have dotted codes like "1.2.3.4"; labs contain "م" and
        // exams contain "exam" — skip those.
        if (passed && score > 0 && !nodeId.includes("م") && !nodeId.includes("exam")) {
          const earnedStars: 1 | 2 | 3 = score >= 90 ? 3 : score >= 75 ? 2 : 1;
          fetch(`/api/v4/path/${encodeURIComponent(slug)}/lesson-stars`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
            body: JSON.stringify({ code: nodeId, stars: earnedStars }),
          }).catch(() => {/* fire-and-forget; refresh will re-derive from DB */});
        }
        return;
      }

      if (evt.kind === "nodes_unlocked") {
        const codes: string[] = Array.isArray(evt.codes) ? evt.codes : [];
        const next: string | null = evt.nextLessonCode ?? null;
        // Only skip if BOTH codes and nextLessonCode are empty — if only
        // nextLessonCode is set (e.g. advancing to the next lesson without
        // unlocking additional codes) we still need to flip it to "active".
        if (codes.length === 0 && !next) return;
        setData(prev => prev ? applyLessonsUnlocked(prev, codes, next) : prev);
        // Flash highlight for ~2.5s.
        setFlashCodes(prevSet => {
          const merged = new Set(prevSet);
          for (const c of codes) merged.add(c);
          return merged;
        });
        setTimeout(() => {
          setFlashCodes(prevSet => {
            const trimmed = new Set(prevSet);
            for (const c of codes) trimmed.delete(c);
            return trimmed;
          });
        }, 2500);
        return;
      }

      if (evt.kind === "celebration") {
        const scope = (evt.scope ?? "lab") as "lab" | "unit" | "stage" | "level";
        setCelebration({ name: String(evt.name ?? ""), mode: scope });
        return;
      }
    };
    es.addEventListener("message", onMessage);
    es.onerror = () => { /* let browser auto-reconnect */ };
    return () => {
      try { es.removeEventListener("message", onMessage); } catch {}
      try { es.close(); } catch {}
    };
    // Only depend on whether `data` has loaded (null → object), NOT on
    // `data` itself — otherwise every event-driven setData would tear
    // down and reopen the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isDemo, data !== null]);

  // Center the active node once, after the first map render. A short delay
  // lets the zigzag layout + images settle so scrollIntoView lands accurately.
  useEffect(() => {
    if (loading || !data || didCenterRef.current) return;
    const code = data.studentPath?.currentLessonCode;
    if (!code) return;
    const t = setTimeout(() => {
      if (activeRef.current) {
        activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        didCenterRef.current = true;
      }
    }, 350);
    return () => clearTimeout(t);
  }, [loading, data]);

  function handleNodeClick(node: FlatNode, _index: number, _total: number) {
    if (node.status === "locked") {
      setTooltip({ code: node.id, text: "أكمل ما قبلها أولاً" });
      setTimeout(() => setTooltip(null), 2000);
      return;
    }
    if (node.kind === "lesson" && (node.status === "active" || node.status === "available" || node.status === "completed")) {
      navigate(`/specialty/${encodeURIComponent(slug)}/lesson/${encodeURIComponent(node.id)}`);
      return;
    }
    if (node.kind === "lab" && (node.status === "available" || node.status === "completed")) {
      navigate(`/lab/${encodeURIComponent(slug)}/${encodeURIComponent(node.id)}`);
      return;
    }
    if ((node.kind === "unit_test" || node.kind === "stage_test" || node.kind === "level_test") &&
        (node.status === "available" || node.status === "completed")) {
      navigate(`/exam/${encodeURIComponent(slug)}/${encodeURIComponent(node.id)}`);
      return;
    }
    // NOTE: Celebrations are driven ONLY by the SSE "celebration" event
    // that fires after the student actually passes a lab/exam on the
    // server. Never fire them on click — the student might not pass.
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gold" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6" style={{ direction: "rtl" }}>
        <div className="text-5xl">⚠️</div>
        <p className="text-white/60">تعذّر تحميل الخريطة. {err?.includes("404") ? "لا يوجد مسار لهذا التخصص." : "حاول مجدداً."}</p>
        <button onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">
          رجوع
        </button>
      </div>
    );
  }

  const { specialty, map, nextLevels } = data;
  const flatNodes = flattenMap(map);
  const isPlacement = data.studentPath.startMode === "placement" && !!data.studentPath.placementUnitCode;

  return (
    <div
      className="min-h-[100dvh] bg-background text-white pb-20"
      style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
    >
      {/* ── Placement result banner ── */}
      {isPlacement && (
        <div className="mx-4 mt-4 mb-2 p-4 rounded-2xl border border-emerald/30 bg-emerald/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1">
              <p className="text-sm text-emerald-300 font-bold">
                وفقاً لنتائج اختبار تحديد المستوى، من المناسب أن تكمل رحلتك من هذه الوحدة:
              </p>
              <p className="text-lg text-emerald-100 font-black mt-1">
                {data.studentPath.placementUnitCode}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ── Inline CSS for custom animations (shake, glow-pulse) ── */}
      <style>{`
        @keyframes nodeShake {
          0%,100%{ transform:translateX(0); }
          20%{ transform:translateX(-6px); }
          40%{ transform:translateX(6px); }
          60%{ transform:translateX(-4px); }
          80%{ transform:translateX(4px); }
        }
        .shake { animation: nodeShake 0.45s ease; }

        @keyframes roadGlow {
          0%,100%{ opacity:0.3; }
          50%{ opacity:0.6; }
        }
        .road-glow { animation: roadGlow 3s ease-in-out infinite; }
      `}</style>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/learn`)}
            className="text-white/50 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-xl">{specialty.icon ?? "📚"}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm truncate">{specialty.name}</div>
            <div className="text-[10px] text-white/40 truncate">{map.levelName}</div>
            <div className="mt-1.5"><PathSwitcher slug={slug} activeOverride={{ kind: "custom" }} compact /></div>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5">
              {map.progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero Progress Block ── */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        <div className="glass rounded-3xl border border-gold/20 p-6 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            {/* Big ring */}
            <div className="relative shrink-0">
              <ProgressRing pct={map.progressPct} size={88} stroke={7} />
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black text-amber-300">{map.progressPct}%</span>
              </div>
            </div>

            <div className="flex-1 text-right">
              <div className="text-[11px] text-gold/70 mb-0.5 font-semibold">
                المستوى {map.currentLevelIndex} من {map.totalLevels}
              </div>
              <h1 className="text-lg font-black leading-tight mb-1">{map.levelName}</h1>
              {map.levelGoal && (
                <p className="text-[11px] text-white/45 leading-relaxed mb-2 line-clamp-2">{map.levelGoal}</p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-amber-400 to-amber-300 rounded-full transition-all duration-1000"
                    style={{ width: `${map.progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/40 whitespace-nowrap">
                  {map.completedNodes}/{map.totalNodes}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                {/* Node count pills */}
                <div className="text-[10px] bg-white/5 rounded-full px-2 py-0.5 text-white/50">
                  {map.stages.length} مراحل
                </div>
                <div className="text-[10px] bg-white/5 rounded-full px-2 py-0.5 text-white/50">
                  {map.stages.reduce((s, st) => s + st.units.reduce((u, un) => u + un.lessons.length, 0), 0)} درساً
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAP: Zigzag nodes ──
        Task #3 (R3): when a level-end celebration fires, briefly zoom the
        map container OUT then back IN, "revealing" the broader path. The
        transform is applied to the wrapper of the map + locked-next-levels
        so the new level (already rendered beneath in `nextLevels`) comes
        into view as the camera pulls back. */}
      <div
        className="transition-transform duration-700 ease-out origin-top"
        style={{
          transform: celebration?.mode === "level" ? "scale(0.72) translateY(-12px)" : "scale(1)",
        }}
      >
      <div className="max-w-lg mx-auto px-4 relative">

        {/* Vertical road gradient behind nodes */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 pointer-events-none road-glow"
          style={{ background: "linear-gradient(to bottom, rgba(251,191,36,0.15), rgba(139,92,246,0.15), rgba(251,191,36,0.05))" }}
        />

        <div className="flex flex-col items-center gap-0 py-4">
          {(() => {
            let nodeIdx = 0;
            let prevStage = -1;
            let prevUnit = "";

            return flatNodes.map((node, i) => {
              const xOff = ZIGZAG_PX[nodeIdx % ZIGZAG_PX.length];
              nodeIdx++;

              const showStageHeader = !!node.stageStart && node.stageStart.stageIndex !== prevStage;
              const showUnitLabel = !!node.unitStart && node.unitStart.unitName !== prevUnit;
              if (node.stageStart) prevStage = node.stageStart.stageIndex;
              if (node.unitStart) prevUnit = node.unitStart.unitName;

              return (
                <div key={node.id} className="flex flex-col items-center w-full">
                  {/* Stage header */}
                  {showStageHeader && node.stageStart && (
                    <StageHeader stageIndex={node.stageStart.stageIndex} name={node.stageStart.stageName} />
                  )}
                  {/* Unit label — always show when this is the first node of
                      a unit, even if a stage header is also rendering above
                      it (unit 1 of a stage was previously silenced by the
                      !showStageHeader guard, leaving it unlabelled). */}
                  {showUnitLabel && node.unitStart && (
                    <UnitLabel unitIndex={node.unitStart.unitIndex} name={node.unitStart.unitName} stageIndex={prevStage > 0 ? prevStage : 1} />
                  )}

                  {/* Node wrapper with zigzag offset. The active node carries
                      activeRef so the map can auto-center the student's start. */}
                  <div
                    ref={node.status === "active" ? activeRef : undefined}
                    className={`my-2 transition-transform duration-300 ${flashCodes.has(node.id) ? "rounded-full ring-4 ring-amber-300/70 ring-offset-2 ring-offset-background animate-pulse" : ""}`}
                    style={{ transform: `translateX(${xOff}px)` }}
                  >
                    {/* Tooltip for locked tap */}
                    <div className="relative">
                      {tooltip?.code === node.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-white/80 whitespace-nowrap z-50 shadow-xl pointer-events-none"
                        >
                          {tooltip.text}
                        </motion.div>
                      )}

                      {node.kind === "lesson" && (
                        <LessonNode node={node} onClick={() => handleNodeClick(node, i, flatNodes.length)} />
                      )}
                      {node.kind === "lab" && (
                        <LabNodeComp node={node} onClick={() => handleNodeClick(node, i, flatNodes.length)} />
                      )}
                      {(node.kind === "unit_test" || node.kind === "stage_test" || node.kind === "level_test") && (
                        <TestNodeComp node={node} onClick={() => handleNodeClick(node, i, flatNodes.length)} />
                      )}
                    </div>
                  </div>

                  {/* Connector dot between nodes */}
                  {i < flatNodes.length - 1 && (
                    <div className="w-1 h-6 flex flex-col items-center justify-between py-1 pointer-events-none">
                      {[0, 1, 2].map((d) => (
                        <div
                          key={d}
                          className={`w-1 h-1 rounded-full ${
                            node.status === "completed" ? "bg-emerald-400/60" :
                            node.status === "active" ? "bg-violet-400/60" :
                            "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── Locked next levels ── */}
      {nextLevels.length > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-8 space-y-3">
          <div className="text-center text-xs text-white/30 mb-4 flex items-center justify-center gap-2">
            <div className="h-px bg-white/10 flex-1" />
            المستويات القادمة
            <div className="h-px bg-white/10 flex-1" />
          </div>
          {nextLevels.map((lvl) => (
            <LockedLevelBox key={lvl.levelIndex} level={lvl} />
          ))}
        </div>
      )}
      </div>{/* end zoom-out wrapper (R3 level transition) */}

      {/* ── Bottom CTA ── */}
      <div className="max-w-lg mx-auto px-4 mt-10 flex justify-center">
        <button
          onClick={() => {
            const cur = data?.studentPath?.currentLessonCode;
            if (cur) navigate(`/specialty/${encodeURIComponent(slug)}/lesson/${encodeURIComponent(cur)}`);
          }}
          disabled={!data?.studentPath?.currentLessonCode}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-gold border border-amber-300/40 text-black font-black shadow-lg shadow-gold/30 hover:shadow-gold/50 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          ادخل إلى الدرس
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Celebration Badge ── */}
      {celebration !== null && (
        <CelebrationBadge
          stageName={celebration.name}
          mode={celebration.mode}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
