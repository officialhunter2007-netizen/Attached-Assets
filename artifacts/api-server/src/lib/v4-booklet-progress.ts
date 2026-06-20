// ─────────────────────────────────────────────────────────────────────────────
// Phase B — Booklet progress store + map projection.
//
// Progress is a single JSONB blob on the booklet row (one per booklet):
//   { lessonStars: { [lessonCode]: 0|1|2|3 },
//     labResults:  { [labCode]:  { score, passed, attempts, updatedAt } },
//     examResults: { [examCode]: { score, passed, correct, total, attempts, updatedAt } } }
//
// Writes are row-locked merges (SELECT … FOR UPDATE) and MONOTONIC — a new
// attempt never lowers an earned star or a best score, and `passed` only flips
// false→true. Reads project the booklet's normalized instruction tree + this
// progress into a map shaped like the custom-path map (so the FE adapter in
// Phase E can reuse v4-map patterns) BUT with every node UNLOCKED: booklet
// navigation is free, exams/labs are assessment-only and never gate.
// ─────────────────────────────────────────────────────────────────────────────

import { and, eq } from "drizzle-orm";
import { db, v4StudentBookletsTable } from "@workspace/db";
import type {
  BookletTree,
  BookletUnit,
  BookletLevelGroup,
} from "./v4-booklet";

// ── Types ────────────────────────────────────────────────────────────────
export type BookletLabResult = {
  score: number; // 0..100, best attempt
  passed: boolean;
  attempts: number;
  updatedAt: string;
};
export type BookletExamResult = {
  score: number; // 0..100, best attempt
  passed: boolean;
  correct: number; // of the best attempt
  total: number;
  attempts: number;
  updatedAt: string;
};
export type BookletProgress = {
  lessonStars: Record<string, number>;
  labResults: Record<string, BookletLabResult>;
  examResults: Record<string, BookletExamResult>;
};

export function emptyBookletProgress(): BookletProgress {
  return { lessonStars: {}, labResults: {}, examResults: {} };
}

// Normalize an arbitrary stored jsonb blob into a well-formed BookletProgress.
export function loadBookletProgress(raw: any): BookletProgress {
  const p = emptyBookletProgress();
  if (!raw || typeof raw !== "object") return p;
  const ls = raw.lessonStars;
  if (ls && typeof ls === "object") {
    for (const [k, v] of Object.entries(ls)) {
      const n = Math.max(0, Math.min(3, Math.floor(Number(v) || 0)));
      p.lessonStars[String(k)] = n;
    }
  }
  const lr = raw.labResults;
  if (lr && typeof lr === "object") {
    for (const [k, v] of Object.entries(lr as Record<string, any>)) {
      p.labResults[String(k)] = {
        score: clampScore(v?.score),
        passed: Boolean(v?.passed),
        attempts: Math.max(0, Math.floor(Number(v?.attempts) || 0)),
        updatedAt: typeof v?.updatedAt === "string" ? v.updatedAt : "",
      };
    }
  }
  const er = raw.examResults;
  if (er && typeof er === "object") {
    for (const [k, v] of Object.entries(er as Record<string, any>)) {
      p.examResults[String(k)] = {
        score: clampScore(v?.score),
        passed: Boolean(v?.passed),
        correct: Math.max(0, Math.floor(Number(v?.correct) || 0)),
        total: Math.max(0, Math.floor(Number(v?.total) || 0)),
        attempts: Math.max(0, Math.floor(Number(v?.attempts) || 0)),
        updatedAt: typeof v?.updatedAt === "string" ? v.updatedAt : "",
      };
    }
  }
  return p;
}

function clampScore(v: any): number {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

// ── Row-locked merge helper ───────────────────────────────────────────────
// Loads the booklet's progress under a row lock, applies `mutate`, writes back.
// Scoped by (id, userId) so a student can only touch their own booklet.
async function mergeBookletProgress(
  bookletId: number,
  userId: number,
  mutate: (p: BookletProgress) => void,
): Promise<BookletProgress | null> {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ progress: (v4StudentBookletsTable as any).progress })
      .from(v4StudentBookletsTable)
      .where(and(
        eq(v4StudentBookletsTable.id, bookletId),
        eq(v4StudentBookletsTable.userId, userId),
      ))
      .for("update");
    if (!row) return null;

    const progress = loadBookletProgress((row as any).progress);
    mutate(progress);
    await tx
      .update(v4StudentBookletsTable)
      .set({ progress: progress as any } as any)
      .where(and(
        eq(v4StudentBookletsTable.id, bookletId),
        eq(v4StudentBookletsTable.userId, userId),
      ));
    return progress;
  });
}

// ── Recorders (monotonic) ─────────────────────────────────────────────────
export async function recordBookletLessonStars(
  bookletId: number,
  userId: number,
  lessonCode: string,
  stars: number,
): Promise<BookletProgress | null> {
  const s = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)));
  return mergeBookletProgress(bookletId, userId, (p) => {
    const prev = p.lessonStars[lessonCode] ?? 0;
    p.lessonStars[lessonCode] = Math.max(prev, s); // never lower an earned star
  });
}

export async function recordBookletLabResult(
  bookletId: number,
  userId: number,
  labCode: string,
  res: { score: number; passed: boolean },
): Promise<BookletProgress | null> {
  const score = clampScore(res.score);
  const passed = Boolean(res.passed);
  return mergeBookletProgress(bookletId, userId, (p) => {
    const prev = p.labResults[labCode];
    p.labResults[labCode] = {
      score: Math.max(prev?.score ?? 0, score), // best score wins
      passed: (prev?.passed ?? false) || passed, // only flips false→true
      attempts: (prev?.attempts ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function recordBookletExamResult(
  bookletId: number,
  userId: number,
  examCode: string,
  res: { score: number; passed: boolean; correct: number; total: number },
): Promise<BookletProgress | null> {
  const score = clampScore(res.score);
  const passed = Boolean(res.passed);
  const correct = Math.max(0, Math.floor(Number(res.correct) || 0));
  const total = Math.max(0, Math.floor(Number(res.total) || 0));
  return mergeBookletProgress(bookletId, userId, (p) => {
    const prev = p.examResults[examCode];
    const keepNew = score >= (prev?.score ?? -1); // record best attempt's detail
    p.examResults[examCode] = {
      score: Math.max(prev?.score ?? 0, score),
      passed: (prev?.passed ?? false) || passed,
      correct: keepNew ? correct : (prev?.correct ?? 0),
      total: keepNew ? total : (prev?.total ?? 0),
      attempts: (prev?.attempts ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  });
}

// ── Map projection ─────────────────────────────────────────────────────────
// Booklet pass thresholds (assessment-only; never gate navigation).
export const BOOKLET_EXAM_PASS_PCT = 60;
export const BOOKLET_LAB_PASS_PCT = 60;

type NodeStatus = "completed" | "active" | "available" | "locked";

export type BookletMapResponse = {
  booklet: { id: number; title: string; subjectId: string; status: string; depth: string };
  map: {
    currentLevelIndex: number;
    viewedLevelIndex: number;
    realCurrentLevelIndex: number;
    totalLevels: number;
    levels: Array<{ levelIndex: number; name: string; status: "completed" | "current" | "upcoming" }>;
    levelName: string;
    progressPct: number;       // viewed level
    overallProgressPct: number; // whole booklet
    completedNodes: number;
    totalNodes: number;
    stages: Array<{
      stageIndex: number;
      name: string;
      units: Array<{
        unitIndex: number;
        code: string;
        name: string;
        lessons: Array<{ code: string; name: string; kind: "lesson"; status: NodeStatus; stars: number }>;
        labs: Array<{ code: string; title: string; kind: "lab"; status: NodeStatus; score: number | null }>;
        hasUnitTest: boolean;
        unitTest: { code: string; title: string; kind: "unit_test"; status: NodeStatus } | null;
      }>;
    }>;
    finalTest: { code: string; title: string; kind: "final_test"; status: NodeStatus } | null;
  };
};

// Build the booklet map. Every node is reachable (no locks); `active` marks the
// first not-yet-completed lesson in reading order so the FE can show "you are
// here". `?level` only changes which level's stages are rendered — progress
// numbers for that level recompute, but `overallProgressPct` is global.
export function buildBookletMap(
  booklet: { id: number; title: string; subjectId: string; status: string },
  tree: BookletTree,
  progress: BookletProgress,
  opts: { level?: number } = {},
): BookletMapResponse {
  const units = Array.isArray(tree.units) ? tree.units : [];
  const unitByCode = new Map<string, BookletUnit>();
  for (const u of units) unitByCode.set(u.code, u);

  const levels: BookletLevelGroup[] = Array.isArray(tree.levels) && tree.levels.length
    ? tree.levels
    : [{ levelIndex: 1, name: "المحتوى", stages: [{ stageIndex: 1, name: "المحتوى", unitCodes: units.map((u) => u.code) }] }];

  // Reading-order list of all lesson codes → drives the "active" marker.
  const orderedLessonCodes: string[] = [];
  for (const u of units) for (const l of u.lessons ?? []) orderedLessonCodes.push(l.code);
  const lessonStars = progress.lessonStars;
  const isLessonDone = (code: string) => (lessonStars[code] ?? 0) > 0;
  const activeLessonCode = orderedLessonCodes.find((c) => !isLessonDone(c)) ?? null;

  const lessonStatus = (code: string): NodeStatus => {
    if (isLessonDone(code)) return "completed";
    if (code === activeLessonCode) return "active";
    return "available"; // never locked — free navigation
  };

  // Real current level = level holding the active lesson; if all done, the last.
  const totalLevels = levels.length;
  let realCurrentLevelIndex = totalLevels; // default: everything done → last level
  if (activeLessonCode) {
    const owningUnit = units.find((u) => (u.lessons ?? []).some((l) => l.code === activeLessonCode));
    if (owningUnit) {
      const lvl = levels.find((l) => l.stages.some((s) => s.unitCodes.includes(owningUnit.code)));
      if (lvl) realCurrentLevelIndex = lvl.levelIndex;
    }
  }

  const requested = Math.floor(Number(opts.level));
  const viewedLevelIndex = levels.some((l) => l.levelIndex === requested)
    ? requested
    : realCurrentLevelIndex;
  const currentLevel =
    levels.find((l) => l.levelIndex === viewedLevelIndex) ??
    levels.find((l) => l.levelIndex === realCurrentLevelIndex) ??
    levels[0];

  let viewedTotal = 0;
  let viewedDone = 0;
  const countNode = (done: boolean) => { viewedTotal++; if (done) viewedDone++; };

  const stages = currentLevel.stages.map((stage) => {
    const stageUnits = stage.unitCodes
      .map((c) => unitByCode.get(c))
      .filter((u): u is BookletUnit => !!u);

    const unitTrees = stageUnits.map((unit) => {
      const unitLessons = (unit.lessons ?? []).map((l) => {
        const status = lessonStatus(l.code);
        countNode(status === "completed");
        return { code: l.code, name: l.name, kind: "lesson" as const, status, stars: lessonStars[l.code] ?? 0 };
      });

      const unitLabs = (unit.labs ?? []).map((lab) => {
        const r = progress.labResults[lab.code];
        const status: NodeStatus = r?.passed ? "completed" : "available";
        countNode(status === "completed");
        return { code: lab.code, title: lab.title, kind: "lab" as const, status, score: r?.score ?? null };
      });

      const hasUnitTest = !!unit.unitTest;
      let unitTestNode: { code: string; title: string; kind: "unit_test"; status: NodeStatus } | null = null;
      if (unit.unitTest) {
        const r = progress.examResults[unit.unitTest.code];
        const status: NodeStatus = r?.passed ? "completed" : "available";
        countNode(status === "completed");
        unitTestNode = { code: unit.unitTest.code, title: unit.unitTest.title, kind: "unit_test", status };
      }

      return {
        unitIndex: unit.unitIndex,
        code: unit.code,
        name: unit.name,
        lessons: unitLessons,
        labs: unitLabs,
        hasUnitTest,
        unitTest: unitTestNode,
      };
    });

    return { stageIndex: stage.stageIndex, name: stage.name, units: unitTrees };
  });

  // Final test — booklet-wide, surfaced on the last level only (mirrors the
  // custom map's per-level levelTest placement).
  let finalTest: BookletMapResponse["map"]["finalTest"] = null;
  if (tree.finalTest && viewedLevelIndex === totalLevels) {
    const r = progress.examResults[tree.finalTest.code];
    const status: NodeStatus = r?.passed ? "completed" : "available";
    countNode(status === "completed");
    finalTest = { code: tree.finalTest.code, title: tree.finalTest.title, kind: "final_test", status };
  }

  // Overall progress across the WHOLE booklet (all lessons + labs + unit tests
  // + final test), independent of the viewed level.
  let overallTotal = 0;
  let overallDone = 0;
  for (const u of units) {
    for (const l of u.lessons ?? []) { overallTotal++; if (isLessonDone(l.code)) overallDone++; }
    for (const lab of u.labs ?? []) { overallTotal++; if (progress.labResults[lab.code]?.passed) overallDone++; }
    if (u.unitTest) { overallTotal++; if (progress.examResults[u.unitTest.code]?.passed) overallDone++; }
  }
  if (tree.finalTest) { overallTotal++; if (progress.examResults[tree.finalTest.code]?.passed) overallDone++; }

  const levelSummary = levels.map((l) => ({
    levelIndex: l.levelIndex,
    name: l.name,
    status:
      l.levelIndex < realCurrentLevelIndex ? "completed" as const :
      l.levelIndex === realCurrentLevelIndex ? "current" as const :
      "upcoming" as const,
  }));

  return {
    booklet: { id: booklet.id, title: booklet.title, subjectId: booklet.subjectId, status: booklet.status, depth: tree.depth ?? "lessons" },
    map: {
      currentLevelIndex: viewedLevelIndex,
      viewedLevelIndex,
      realCurrentLevelIndex,
      totalLevels,
      levels: levelSummary,
      levelName: currentLevel.name,
      progressPct: viewedTotal > 0 ? Math.round((viewedDone / viewedTotal) * 100) : 0,
      overallProgressPct: overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0,
      completedNodes: viewedDone,
      totalNodes: viewedTotal,
      stages,
      finalTest,
    },
  };
}
