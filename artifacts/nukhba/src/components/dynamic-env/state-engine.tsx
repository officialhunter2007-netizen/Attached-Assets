import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { DynMutation, DynState } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Path utilities — get/set deep values via dot.notation paths.
// Supports array indices ("inventory.0.qty") and object keys.
// ─────────────────────────────────────────────────────────────────────────────

export function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Reject path segments that could pollute prototypes or escape the
// intended root object. Mutations from AI-generated envs must stay in
// the env's own state graph.
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
function isSafeSegment(seg: string): boolean {
  return !FORBIDDEN_SEGMENTS.has(seg) && seg.length < 100;
}
function isSafePath(path: string): boolean {
  if (typeof path !== "string" || !path) return false;
  if (path.length > 500) return false;
  return path.split(".").every(isSafeSegment);
}

function setByPath(obj: any, path: string, value: any): any {
  if (!isSafePath(path)) return obj;
  const parts = path.split(".");
  if (parts.length === 0) return value;
  const head = parts[0];
  const rest = parts.slice(1).join(".");
  if (Array.isArray(obj)) {
    const idx = Number(head);
    if (!Number.isFinite(idx) || idx < 0) return obj;
    const copy = obj.slice();
    if (rest) copy[idx] = setByPath(copy[idx] ?? {}, rest, value);
    else copy[idx] = value;
    return copy;
  }
  const copy = { ...(obj || {}) };
  if (rest) copy[head] = setByPath(copy[head] ?? (Number.isInteger(Number(rest.split(".")[0])) ? [] : {}), rest, value);
  else copy[head] = value;
  return copy;
}

// Substitute {form.x} and {state.path} placeholders in a string value.
// **Type preservation**: if the entire string is a single placeholder
// (e.g. "{form.qty}" or "{state.inventory.0.price}"), return the raw value
// without coercing to string — so numbers stay numbers, booleans stay
// booleans, objects/arrays remain structured. This is critical because
// `add`/`sub`/`incrementInArray` rely on numeric values.
const SINGLE_PLACEHOLDER_RE = /^\{(form|state)\.([^}]+)\}$/;
function interpolate(value: any, ctx: { form: Record<string, any>; state: DynState }): any {
  if (typeof value === "string") {
    const single = value.match(SINGLE_PLACEHOLDER_RE);
    if (single) {
      const [, kind, p] = single;
      if (kind === "state" && !isSafePath(p)) return undefined;
      return kind === "form" ? ctx.form[p] : getByPath(ctx.state, p);
    }
    // Mixed-content strings: substitute each placeholder with its string form.
    return value.replace(/\{(form|state)\.([^}]+)\}/g, (_m, kind, p) => {
      if (kind === "state" && !isSafePath(p)) return "";
      const v = kind === "form" ? ctx.form[p] : getByPath(ctx.state, p);
      return v == null ? "" : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, ctx));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v, ctx);
    return out;
  }
  return value;
}

function toNumber(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// Apply a single mutation to state. Any unsafe path or unknown op returns
// the prior state unchanged — ensuring a single broken op never corrupts
// the whole world.
function applyMutation(state: DynState, mut: DynMutation, form: Record<string, any> = {}): DynState {
  if (!mut || typeof mut !== "object" || typeof mut.path !== "string") return state;
  if (!isSafePath(mut.path)) return state;
  const ctx = { form, state };
  const path = mut.path;
  switch (mut.op) {
    case "set": {
      return setByPath(state, path, interpolate(mut.value, ctx));
    }
    case "add": {
      const cur = getByPath(state, path);
      const inc = interpolate(mut.value, ctx);
      if (typeof cur === "number" || typeof inc === "number") {
        return setByPath(state, path, toNumber(cur) + toNumber(inc));
      }
      return setByPath(state, path, String(cur ?? "") + String(inc ?? ""));
    }
    case "sub": {
      const cur = toNumber(getByPath(state, path));
      const dec = toNumber(interpolate(mut.value, ctx));
      return setByPath(state, path, cur - dec);
    }
    case "append": {
      const arr = getByPath(state, path);
      const list: any[] = Array.isArray(arr) ? arr.slice() : [];
      const value = interpolate(mut.value, ctx);
      const idField = mut.idField || "id";
      if (value && typeof value === "object" && value[idField] === undefined) {
        value[idField] = `${path}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      list.push(value);
      return setByPath(state, path, list);
    }
    case "remove": {
      const arr = getByPath(state, path);
      if (!Array.isArray(arr)) return state;
      const target = interpolate(mut.matchValue, ctx);
      const filtered = arr.filter((it: any) => it?.[mut.matchField] !== target);
      return setByPath(state, path, filtered);
    }
    case "update": {
      const arr = getByPath(state, path);
      if (!Array.isArray(arr)) return state;
      const target = interpolate(mut.matchValue, ctx);
      const patch = interpolate(mut.patch, ctx);
      const updated = arr.map((it: any) => (it?.[mut.matchField] === target ? { ...it, ...patch } : it));
      return setByPath(state, path, updated);
    }
    case "incrementInArray": {
      const arr = getByPath(state, path);
      if (!Array.isArray(arr)) return state;
      const target = interpolate(mut.matchValue, ctx);
      const by = toNumber(interpolate(mut.by, ctx));
      const updated = arr.map((it: any) =>
        it?.[mut.matchField] === target ? { ...it, [mut.field]: toNumber(it?.[mut.field]) + by } : it
      );
      return setByPath(state, path, updated);
    }
    default:
      return state;
  }
}

// Reducer — supports a list of mutations + reset/replace/loadFromStorage
type Action =
  | { type: "mutate"; ops: DynMutation[]; form?: Record<string, any> }
  | { type: "reset"; initial: DynState }
  | { type: "replace"; state: DynState };

function reducer(state: DynState, action: Action): DynState {
  switch (action.type) {
    case "mutate": {
      // Atomic semantics: try every op against a working copy. If any single
      // op throws (defensive), revert to the original state so the user is
      // never left with a half-applied mutation.
      try {
        let next = state;
        for (const op of action.ops) next = applyMutation(next, op, action.form || {});
        return next;
      } catch (err) {
        if (typeof console !== "undefined") console.error("[env-state] mutation aborted:", err);
        return state;
      }
    }
    case "reset":
      return JSON.parse(JSON.stringify(action.initial || {}));
    case "replace":
      return action.state || {};
    default:
      return state;
  }
}

// Context API
export type LastMutationInfo = {
  ops: DynMutation[];
  form?: Record<string, any>;
  at: number;
};
export type ConsoleEntry = { level: "log" | "info" | "warn" | "error"; text: string; at: number };

/**
 * Phase 3 — Mastery telemetry. Every mutation, every failed form check, every
 * screen change feeds into this struct. The lab shell reads it at submit-time
 * to compute per-task mastery scores in the [LAB_REPORT] payload, and the
 * teacher gates [STAGE_COMPLETE] on the resulting averages.
 *
 * Crucially: telemetry is ALWAYS recorded — even outside exam mode — because
 * the teacher uses it for routine remediation suggestions. `examModeStartedAt`
 * is the only field that distinguishes self-test runs from casual play.
 */
export type ExamTelemetry = {
  /** Lab-shell load time. Drives totalElapsedMs in the report. */
  startedAt: number;
  /** When the student toggled exam mode ON. null = not in exam mode this session. */
  examModeStartedAt: number | null;
  /** Per-task: how many form-check submits returned `incorrect`. */
  failedSubmitsByTask: Record<string, number>;
  /** Per-task: total mutations attributed to this task (form submits, button clicks). */
  mutationsByTask: Record<string, number>;
  /** Per-screen: cumulative ms the student spent on this screen. */
  screenTimeMs: Record<string, number>;
  /** Per-task: did the student get the very first attempt right? */
  firstAttemptCorrectByTask: Record<string, boolean>;
  /** Per-task: total submit attempts (correct + incorrect). */
  totalSubmitsByTask: Record<string, number>;
  /** Total mutations across the whole session — proxy for "decisions made". */
  totalMutations: number;
  /** Total failed submits across the whole session. */
  totalFailedSubmits: number;
};

type StateCtx = {
  state: DynState;
  initialState: DynState;
  mutate: (ops: DynMutation[], form?: Record<string, any>) => void;
  reset: () => void;
  setState: (s: DynState) => void;
  lastMutation: LastMutationInfo | null;
  consoleLog: ConsoleEntry[];
  pushConsole: (entry: Omit<ConsoleEntry, "at">) => void;
  clearConsole: () => void;

  // ─── Phase 3 telemetry surface ─────────────────────────────────────────
  examTelemetry: ExamTelemetry;
  /** Marks the start/stop of exam mode. The shell calls this from the toggle. */
  setExamMode: (on: boolean) => void;
  /** Called by FormBlock when a `submit.type === "check"` returns incorrect. */
  recordFailedSubmit: (taskId: string | null) => void;
  /** Called by FormBlock when a `submit.type === "check"` returns correct. */
  recordCorrectSubmit: (taskId: string | null) => void;
  /** Called by the shell when the active screen changes — accumulates time on prev. */
  recordScreenChange: (newScreenId: string) => void;
  /**
   * Phase 3 — synchronous, ref-backed snapshot used by buildReport. Folds the
   * in-flight current-screen dwell into screenTimeMs so a freshly-flushed
   * screen tick is always present in the submitted [LAB_REPORT].
   */
  getExamTelemetrySnapshot: (activeScreenId?: string | null) => ExamTelemetry;
  /** Reset all telemetry counters (used by the env-reset button). */
  resetTelemetry: () => void;
};

const Ctx = createContext<StateCtx | null>(null);

export function useEnvState(): StateCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEnvState must be used inside <EnvStateProvider>");
  return v;
}

export function EnvStateProvider({
  initialState,
  storageKey,
  children,
}: {
  initialState: DynState;
  storageKey?: string;
  children: ReactNode;
}) {
  const initialRef = useRef<DynState>(JSON.parse(JSON.stringify(initialState || {})));

  const [state, dispatch] = useReducer(
    reducer,
    initialRef.current,
    (init): DynState => {
      if (!storageKey) return init;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch {}
      return init;
    }
  );

  // Persist on change (debounced)
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [state, storageKey]);

  // Track the last applied mutation so the AI assistant can answer
  // "ماذا حدث للتو؟" questions with real context.
  const [lastMutation, setLastMutation] = useState<LastMutationInfo | null>(null);
  // Ring buffer for console output emitted by sandboxed iframes (webApp/browser).
  const [consoleLog, setConsoleLog] = useState<ConsoleEntry[]>([]);

  // ─── Phase 3: telemetry state ──────────────────────────────────────────
  // We keep telemetry in BOTH a ref (authoritative, synchronous reads — used
  // by buildReport so a just-recorded submit/screen-flush is in the report
  // before React state has had a chance to flush) AND React state (for the
  // header timer + any UI that needs to re-render on telemetry changes).
  // Every mutator updates the ref first, then schedules a state mirror.
  const sessionStartRef = useRef<number>(Date.now());
  const blankTelemetry = (now: number): ExamTelemetry => ({
    startedAt: now,
    examModeStartedAt: null,
    failedSubmitsByTask: {},
    mutationsByTask: {},
    screenTimeMs: {},
    firstAttemptCorrectByTask: {},
    totalSubmitsByTask: {},
    totalMutations: 0,
    totalFailedSubmits: 0,
  });
  const examTelemetryRef = useRef<ExamTelemetry>(blankTelemetry(sessionStartRef.current));
  const [examTelemetry, setExamTelemetry] = useState<ExamTelemetry>(examTelemetryRef.current);
  const commitTelemetry = useCallback((next: ExamTelemetry) => {
    examTelemetryRef.current = next;
    setExamTelemetry(next);
  }, []);
  // Tracks the currently-active screen + when the student arrived on it, so
  // we can attribute elapsed time to the right screen on the next change.
  const screenTrackerRef = useRef<{ id: string | null; arrivedAt: number }>({
    id: null,
    arrivedAt: Date.now(),
  });

  const mutate = useCallback((ops: DynMutation[], form?: Record<string, any>) => {
    dispatch({ type: "mutate", ops, form });
    setLastMutation({ ops, form, at: Date.now() });
    // Bump the global mutation counter. Per-task attribution happens via
    // recordCorrectSubmit / recordFailedSubmit when the renderer knows
    // which task owns this submission.
    commitTelemetry({
      ...examTelemetryRef.current,
      totalMutations: examTelemetryRef.current.totalMutations + 1,
    });
  }, [commitTelemetry]);

  const setExamMode = useCallback((on: boolean) => {
    const now = Date.now();
    if (on) {
      // EXAM-MODE INTEGRITY: when the student enters self-test, wipe ALL
      // playground-era counters/screen times so the report only contains
      // attempts made while the assistant + hints were hidden. This is the
      // only way the teacher's `[STAGE_COMPLETE] gate on avgMastery >= 70`
      // is meaningful — otherwise a student could rack up assisted
      // first-attempt-correct rows in playground, then toggle exam-mode
      // and submit a "perfect" run.
      sessionStartRef.current = now;
      screenTrackerRef.current = {
        id: screenTrackerRef.current.id, // keep current screen, reset clock
        arrivedAt: now,
      };
      commitTelemetry({
        ...blankTelemetry(now),
        examModeStartedAt: now,
      });
    } else {
      commitTelemetry({
        ...examTelemetryRef.current,
        examModeStartedAt: null,
      });
    }
  }, [commitTelemetry]);

  const recordFailedSubmit = useCallback((taskId: string | null) => {
    const prev = examTelemetryRef.current;
    const tid = taskId || "__no_task__";
    const prevTotal = prev.totalSubmitsByTask[tid] ?? 0;
    const isFirstAttempt = prevTotal === 0;
    commitTelemetry({
      ...prev,
      failedSubmitsByTask: {
        ...prev.failedSubmitsByTask,
        [tid]: (prev.failedSubmitsByTask[tid] ?? 0) + 1,
      },
      totalSubmitsByTask: {
        ...prev.totalSubmitsByTask,
        [tid]: prevTotal + 1,
      },
      firstAttemptCorrectByTask: isFirstAttempt && !(tid in prev.firstAttemptCorrectByTask)
        ? { ...prev.firstAttemptCorrectByTask, [tid]: false }
        : prev.firstAttemptCorrectByTask,
      totalFailedSubmits: prev.totalFailedSubmits + 1,
    });
  }, [commitTelemetry]);

  const recordCorrectSubmit = useCallback((taskId: string | null) => {
    const prev = examTelemetryRef.current;
    const tid = taskId || "__no_task__";
    const prevTotal = prev.totalSubmitsByTask[tid] ?? 0;
    const isFirstAttempt = prevTotal === 0;
    commitTelemetry({
      ...prev,
      totalSubmitsByTask: {
        ...prev.totalSubmitsByTask,
        [tid]: prevTotal + 1,
      },
      firstAttemptCorrectByTask: isFirstAttempt && !(tid in prev.firstAttemptCorrectByTask)
        ? { ...prev.firstAttemptCorrectByTask, [tid]: true }
        : prev.firstAttemptCorrectByTask,
      mutationsByTask: {
        ...prev.mutationsByTask,
        [tid]: (prev.mutationsByTask[tid] ?? 0) + 1,
      },
    });
  }, [commitTelemetry]);

  const recordScreenChange = useCallback((newScreenId: string) => {
    const now = Date.now();
    const tracker = screenTrackerRef.current;
    if (tracker.id) {
      const elapsed = Math.max(0, now - tracker.arrivedAt);
      if (elapsed > 0) {
        const prev = examTelemetryRef.current;
        commitTelemetry({
          ...prev,
          screenTimeMs: {
            ...prev.screenTimeMs,
            [tracker.id]: (prev.screenTimeMs[tracker.id] ?? 0) + elapsed,
          },
        });
      }
    }
    screenTrackerRef.current = { id: newScreenId, arrivedAt: now };
  }, [commitTelemetry]);

  /**
   * Phase 3 — synchronous snapshot for buildReport. Returns a fresh copy of
   * telemetry with the in-flight current-screen dwell already folded into
   * `screenTimeMs[activeScreenId]`. Required because React state updates
   * are async, so a `recordScreenChange(activeId)` call followed by an
   * immediate `examTelemetry` read would miss the just-flushed dwell.
   */
  const getExamTelemetrySnapshot = useCallback((activeScreenId?: string | null): ExamTelemetry => {
    const base = examTelemetryRef.current;
    const tracker = screenTrackerRef.current;
    const flushId = activeScreenId || tracker.id;
    if (!flushId) return JSON.parse(JSON.stringify(base));
    const now = Date.now();
    const elapsed = Math.max(0, now - tracker.arrivedAt);
    const screenTimeMs: Record<string, number> = { ...base.screenTimeMs };
    if (elapsed > 0) {
      screenTimeMs[flushId] = (screenTimeMs[flushId] ?? 0) + elapsed;
    }
    return { ...base, screenTimeMs };
  }, []);

  const resetTelemetry = useCallback(() => {
    const now = Date.now();
    sessionStartRef.current = now;
    screenTrackerRef.current = { id: null, arrivedAt: now };
    commitTelemetry(blankTelemetry(now));
  }, [commitTelemetry]);

  const reset = useCallback(() => {
    dispatch({ type: "reset", initial: initialRef.current });
    setLastMutation(null);
    setConsoleLog([]);
    if (storageKey) try { localStorage.removeItem(storageKey); } catch {}
    resetTelemetry();
  }, [storageKey, resetTelemetry]);

  const setState = useCallback((s: DynState) => {
    dispatch({ type: "replace", state: s });
  }, []);

  const pushConsole = useCallback((entry: Omit<ConsoleEntry, "at">) => {
    setConsoleLog((prev) => {
      const next = [...prev, { ...entry, at: Date.now() }];
      // Keep only the most recent 30 entries to bound memory and prompt size.
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }, []);

  const clearConsole = useCallback(() => setConsoleLog([]), []);

  const value = useMemo(
    () => ({
      state,
      initialState: initialRef.current,
      mutate,
      reset,
      setState,
      lastMutation,
      consoleLog,
      pushConsole,
      clearConsole,
      examTelemetry,
      setExamMode,
      recordFailedSubmit,
      recordCorrectSubmit,
      recordScreenChange,
      getExamTelemetrySnapshot,
      resetTelemetry,
    }),
    [
      state, mutate, reset, setState, lastMutation, consoleLog, pushConsole, clearConsole,
      examTelemetry, setExamMode, recordFailedSubmit, recordCorrectSubmit,
      recordScreenChange, getExamTelemetrySnapshot, resetTelemetry,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Helpers exported for components that need them
export const envUtils = { getByPath, setByPath, interpolate, toNumber };
