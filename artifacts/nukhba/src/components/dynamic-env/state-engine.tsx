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

  const mutate = useCallback((ops: DynMutation[], form?: Record<string, any>) => {
    dispatch({ type: "mutate", ops, form });
    setLastMutation({ ops, form, at: Date.now() });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "reset", initial: initialRef.current });
    setLastMutation(null);
    setConsoleLog([]);
    if (storageKey) try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

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
    }),
    [state, mutate, reset, setState, lastMutation, consoleLog, pushConsole, clearConsole]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Helpers exported for components that need them
export const envUtils = { getByPath, setByPath, interpolate, toNumber };
