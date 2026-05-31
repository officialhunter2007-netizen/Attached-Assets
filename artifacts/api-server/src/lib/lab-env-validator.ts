// ─────────────────────────────────────────────────────────────────────────────
// Lab Environment Validator + Healer
//
// Goal: a generated env is structurally guaranteed to render and behave
// correctly before it ever reaches the student. We walk the entire env
// tree and:
//
//   1. Auto-heal everything we can fix without changing intent
//      (missing initialState paths created with sensible defaults,
//       dangling go-to-screen actions replaced with safe show-message,
//       malformed components dropped, etc.).
//
//   2. Collect anything we cannot safely auto-fix into `unfixable[]` so
//      the caller can decide to trigger a surgical re-prompt.
//
// The renderer in artifacts/nukhba/src/components/dynamic-env/* is the
// source of truth for what a "valid" env looks like — these checks
// mirror its real-world expectations.
// ─────────────────────────────────────────────────────────────────────────────

export type HealAction = {
  kind:
    | "created-binding-path"
    | "created-mutation-path"
    | "created-statepath-array"
    | "created-completewhen-path"
    | "replaced-orphan-screen-action"
    | "dropped-malformed-component"
    | "dropped-orphan-mutation-op"
    | "dropped-form-without-fields"
    | "dropped-unknown-form-field-ref"
    | "dropped-unknown-action-form-ref"
    | "fixed-task-target-screen"
    | "trimmed-oversized-html"
    | "filled-missing-required";
  location: string; // e.g. "screens[1].components[2].bindTo=accounts.0.balance"
  detail: string;
};

export type UnfixableIssue = {
  kind:
    | "no-screens"
    | "no-initial-state-and-many-bindings"
    | "task-references-missing-component";
  location: string;
  detail: string;
};

export type ValidationReport = {
  healed: HealAction[];
  unfixable: UnfixableIssue[];
};

export type ValidateOpts = {
  kind?: string;
  /** Cap on inline HTML (webApp.html / browser.pages[].html) before we trim. */
  maxHtmlBytes?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Path utilities — mirror state-engine.tsx semantics so what the validator
// "sees" matches exactly what the runtime will accept.
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

function isSafeSegment(seg: string): boolean {
  return seg.length > 0 && seg.length < 100 && !FORBIDDEN.has(seg);
}

export function isSafePath(path: unknown): path is string {
  if (typeof path !== "string" || !path) return false;
  if (path.length > 500) return false;
  return path.split(".").every(isSafeSegment);
}

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

/**
 * In-place set; creates intermediate objects/arrays based on next-segment shape.
 * Returns true ONLY when the value was actually written. Returns false on any
 * shape conflict (e.g., expecting array index on an object that's not an array,
 * or vice versa) so callers don't claim a heal that didn't happen.
 */
function setByPathInPlace(root: Record<string, any>, path: string, value: any): boolean {
  const parts = path.split(".");
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const next = parts[i + 1];
    const nextIsIndex = /^\d+$/.test(next);
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0) return false;
      if (cur[idx] == null) cur[idx] = nextIsIndex ? [] : {};
      // Shape conflict: existing leaf can't be descended into.
      if (typeof cur[idx] !== "object") return false;
      cur = cur[idx];
    } else {
      if (typeof cur !== "object" || cur === null) return false;
      if (cur[seg] == null) cur[seg] = nextIsIndex ? [] : {};
      if (typeof cur[seg] !== "object") return false;
      cur = cur[seg];
    }
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(cur)) {
    const idx = Number(last);
    if (!Number.isInteger(idx) || idx < 0) return false;
    cur[idx] = value;
    return true;
  }
  if (typeof cur !== "object" || cur === null) return false;
  cur[last] = value;
  return true;
}

function pathExists(root: any, path: string): boolean {
  if (!isSafePath(path)) return false;
  const parts = path.split(".");
  let cur = root;
  for (const seg of parts) {
    if (cur == null || typeof cur !== "object") return false;
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return false;
      cur = cur[idx];
    } else {
      if (!(seg in cur)) return false;
      cur = cur[seg];
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default-value inference — what should a freshly-created path hold?
// We bias toward the *least disruptive* default for the consuming component.
// ─────────────────────────────────────────────────────────────────────────────

type DefaultHint =
  | "number"
  | "string"
  | "array-of-objects"
  | "array-of-numbers"
  | "object"
  | "boolean"
  | "any";

function inferDefaultByComponent(comp: any, fieldKey: "bindTo" | "statePath" | "accountsPath" | "entriesPath"): DefaultHint {
  if (!comp || typeof comp !== "object") return "any";
  switch (comp.type) {
    case "kpi":
      if (comp.format === "text") return "string";
      return "number";
    case "kpiGrid":
      return "any"; // items are bound individually
    case "table":
    case "editableTable":
    case "list":
    case "kvList":
    case "journal":
    case "journalEditor":
    case "packetCapture":
    case "logViewer":
      return "array-of-objects";
    case "chart":
      return "array-of-objects";
    case "fileSystemExplorer":
      return "array-of-objects"; // tree nodes
    case "trialBalance":
      return fieldKey === "accountsPath" ? "array-of-objects" : "array-of-objects";
    case "invoice":
      return "object";
    case "networkDiagram":
      return "object";
    case "dataInspector":
      return "any";
    case "terminal":
      return "array-of-objects";
    case "form": {
      // selectFromState always wants an array
      return "array-of-objects";
    }
    default:
      return "any";
  }
}

function defaultValueFor(hint: DefaultHint): any {
  switch (hint) {
    case "number": return 0;
    case "string": return "";
    case "array-of-objects":
    case "array-of-numbers":
      return [];
    case "object": return {};
    case "boolean": return false;
    case "any":
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation default inference — for a `mutate.ops[].path` that doesn't exist
// yet in initialState, derive what type the path should hold based on the op.
// ─────────────────────────────────────────────────────────────────────────────

function defaultForMutationOp(op: any): any {
  if (!op || typeof op !== "object") return null;
  switch (op.op) {
    case "set":
      // value's type wins
      if (typeof op.value === "number") return 0;
      if (typeof op.value === "boolean") return false;
      if (Array.isArray(op.value)) return [];
      if (op.value && typeof op.value === "object") return {};
      return "";
    case "add":
    case "sub":
      // numeric add (or string concat for add); default number is safer.
      return 0;
    case "append":
      return [];
    case "remove":
    case "update":
    case "incrementInArray":
      return [];
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Form-placeholder reference scanner — finds {form.X} usages inside any
// JSON-able value tree so we can verify field names exist.
//
// IMPORTANT: this regex MUST match runtime semantics in state-engine.tsx
// (`/\{(form|state)\.([^}]+)\}/g`) which captures any character until the
// closing brace — including Arabic/Unicode. Using a stricter ASCII-identifier
// pattern here would cause the validator to silently miss legitimate refs to
// Arabic-named fields and let typos through as silent no-op mutations.
// ─────────────────────────────────────────────────────────────────────────────

const FORM_PLACEHOLDER_RE = /\{form\.([^}]+)\}/g;

function collectFormRefs(value: any, out: Set<string>): void {
  if (typeof value === "string") {
    let m: RegExpExecArray | null;
    FORM_PLACEHOLDER_RE.lastIndex = 0;
    while ((m = FORM_PLACEHOLDER_RE.exec(value)) !== null) out.add(m[1]);
    return;
  }
  if (Array.isArray(value)) { for (const v of value) collectFormRefs(v, out); return; }
  if (value && typeof value === "object") for (const v of Object.values(value)) collectFormRefs(v, out);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component required-field check (light schema). We only DROP a component
// when it is structurally unrenderable — never when it's just sparse.
// ─────────────────────────────────────────────────────────────────────────────

function isComponentMinimallyValid(c: any): boolean {
  if (!c || typeof c !== "object" || typeof c.type !== "string") return false;
  switch (c.type) {
    case "text":           return typeof c.markdown === "string";
    case "alert":          return typeof c.text === "string";
    case "codeBlock":      return typeof c.code === "string";
    case "form":           return Array.isArray(c.fields) && c.fields.length > 0 && c.submit && typeof c.submit === "object";
    case "editableTable":
    case "journalEditor":
    case "fileSystemExplorer":
      return typeof c.bindTo === "string" && c.bindTo.trim().length > 0;
    case "trialBalance":   return typeof c.entriesPath === "string" && c.entriesPath.length > 0;
    case "invoice":        return typeof c.bindTo === "string" && c.bindTo.length > 0;
    case "table":          return Array.isArray(c.columns);
    case "kpi":            return typeof c.label === "string";
    case "kpiGrid":        return Array.isArray(c.items);
    case "chart":          return typeof c.chartType === "string";
    case "stepper":        return Array.isArray(c.steps);
    case "richDocument":   return typeof c.title === "string" && Array.isArray(c.sections);
    case "achievement":    return typeof c.title === "string";
    case "conceptCard":    return typeof c.title === "string" && typeof c.idea === "string";
    case "freePlayground": return typeof c.flavor === "string";
    case "button":         return typeof c.label === "string" && c.action && typeof c.action === "object";
    case "webApp":         return typeof c.html === "string";
    case "browser":        return Array.isArray(c.pages) || typeof c.bindTo === "string";
    case "terminal":       return true; // very permissive — read-only or interactive
    case "packetCapture":  return Array.isArray(c.packets) || typeof c.bindTo === "string";
    case "networkDiagram": return Array.isArray(c.nodes) || typeof c.bindTo === "string";
    case "logViewer":      return Array.isArray(c.entries) || typeof c.bindTo === "string";
    case "dataInspector":  return typeof c.bindTo === "string" || c.data !== undefined;
    case "calculator":     return true;
    case "list":
    case "kvList":
    case "journal":
      return Array.isArray(c.items) || typeof c.bindTo === "string";
    default:
      return true; // unknown types pass through; renderer ignores them safely
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action walker — actions live on buttons, on form.submit (if mutate), and
// inside terminal/webApp/browser eventMap entries. We need to validate:
//   - go-to-screen.screenId references a real screen
//   - mutate.ops[].path is a path we can guarantee exists
// ─────────────────────────────────────────────────────────────────────────────

function ensurePathInState(
  state: Record<string, any>,
  path: string,
  defaultValue: any,
  healed: HealAction[],
  unfixable: UnfixableIssue[],
  location: string,
  hintKind: HealAction["kind"],
): boolean {
  if (!isSafePath(path)) return false;
  if (pathExists(state, path)) return true;
  const ok = setByPathInPlace(state, path, defaultValue);
  if (!ok) {
    // Shape conflict — e.g., op tries to write `accounts.balance` but
    // `accounts` already exists as a primitive. Cannot heal silently.
    unfixable.push({
      kind: "task-references-missing-component",
      location,
      detail: `Cannot create \`${path}\` — shape conflict with existing initialState (some ancestor is a non-object leaf).`,
    });
    return false;
  }
  healed.push({
    kind: hintKind,
    location,
    detail: `created \`${path}\` in initialState (default = ${JSON.stringify(defaultValue)})`,
  });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-scan for "exists"/"equals" predicate paths.
//
// Runtime semantics for the `exists` op (component-renderer.tsx) are
// `v !== undefined && v !== null && v !== ""`. That means seeding a
// predicate-target path with `false`, `0`, `[]`, or `{}` would IMMEDIATELY
// satisfy the predicate — firing achievements at start, marking tasks done
// before the student does anything, etc.
//
// Solution: collect every `showWhen.path` and `completeWhen.path` (op = exists)
// BEFORE the main walk, then seed those paths with `null` first. The main
// walk's `pathExists` check sees the `null` leaf as present and skips
// re-creating, so subsequent ops on the same path don't overwrite the seed.
// At runtime, the actual mutation (set/append/etc.) replaces `null` with the
// real value and the predicate flips correctly.
// ─────────────────────────────────────────────────────────────────────────────

function preSeedExistsPredicatePaths(env: any, healed: HealAction[]): void {
  const paths = new Set<string>();
  if (Array.isArray(env.screens)) {
    for (const s of env.screens) {
      if (!Array.isArray(s?.components)) continue;
      for (const c of s.components) {
        if (c?.type === "achievement" && c.showWhen?.op === "exists" && typeof c.showWhen.path === "string") {
          paths.add(c.showWhen.path);
        }
      }
    }
  }
  if (Array.isArray(env.tasks)) {
    for (const t of env.tasks) {
      if (t?.completeWhen?.op === "exists" && typeof t.completeWhen.path === "string") {
        paths.add(t.completeWhen.path);
      }
    }
  }
  for (const p of paths) {
    if (!isSafePath(p) || pathExists(env.initialState, p)) continue;
    if (setByPathInPlace(env.initialState, p, null)) {
      healed.push({
        kind: "created-binding-path",
        location: `[pre-scan] exists-predicate target`,
        detail: `seeded \`${p}\` = null so "exists" predicate stays false until real mutation.`,
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The main pass.
// ─────────────────────────────────────────────────────────────────────────────

export function validateAndHealEnv(envIn: any, opts: ValidateOpts = {}): { env: any; report: ValidationReport } {
  const healed: HealAction[] = [];
  const unfixable: UnfixableIssue[] = [];
  const maxHtmlBytes = opts.maxHtmlBytes ?? 100_000;

  // Defensive top-level structure
  const env: any = envIn && typeof envIn === "object" ? envIn : {};
  if (!env.initialState || typeof env.initialState !== "object" || Array.isArray(env.initialState)) {
    env.initialState = {};
  }
  if (!Array.isArray(env.screens)) env.screens = [];
  if (!Array.isArray(env.tasks)) env.tasks = [];

  // Pre-seed any "exists"-predicate target paths with `null` BEFORE the main
  // walk creates them with falsy primitives that would satisfy the predicate.
  // See `preSeedExistsPredicatePaths` for the full reasoning.
  preSeedExistsPredicatePaths(env, healed);

  // Drop screens that are unusable
  env.screens = env.screens
    .filter((s: any) => s && typeof s === "object")
    .map((s: any, si: number) => {
      const id = (typeof s.id === "string" && s.id.trim()) ? s.id.trim() : `screen${si + 1}`;
      const title = (typeof s.title === "string" && s.title.trim()) ? s.title : `شاشة ${si + 1}`;
      const components = Array.isArray(s.components) ? s.components : [];
      return { ...s, id, title, components };
    });

  if (env.screens.length === 0) {
    unfixable.push({
      kind: "no-screens",
      location: "env.screens",
      detail: "Generator returned zero usable screens. Caller should fall back or re-prompt.",
    });
    return { env, report: { healed, unfixable } };
  }

  const screenIds = new Set<string>(env.screens.map((s: any) => s.id));

  // Walk each screen → drop malformed components + heal references
  for (let si = 0; si < env.screens.length; si++) {
    const screen = env.screens[si];
    const next: any[] = [];
    for (let ci = 0; ci < screen.components.length; ci++) {
      const comp = screen.components[ci];
      const loc = `screens[${si}].components[${ci}](type=${comp?.type ?? "?"})`;

      if (!isComponentMinimallyValid(comp)) {
        healed.push({
          kind: comp?.type === "form" && (!Array.isArray(comp?.fields) || comp.fields.length === 0)
            ? "dropped-form-without-fields"
            : "dropped-malformed-component",
          location: loc,
          detail: `Missing required fields for component type "${comp?.type ?? "?"}".`,
        });
        continue;
      }

      // Trim oversized inline HTML to protect the iframe sandbox
      if (comp.type === "webApp" && typeof comp.html === "string" && comp.html.length > maxHtmlBytes) {
        comp.html = comp.html.slice(0, maxHtmlBytes) + "<!-- truncated -->";
        healed.push({ kind: "trimmed-oversized-html", location: loc, detail: `webApp.html trimmed to ${maxHtmlBytes} bytes.` });
      }
      if (comp.type === "browser" && Array.isArray(comp.pages)) {
        for (let pi = 0; pi < comp.pages.length; pi++) {
          const p = comp.pages[pi];
          if (p && typeof p.html === "string" && p.html.length > maxHtmlBytes) {
            p.html = p.html.slice(0, maxHtmlBytes) + "<!-- truncated -->";
            healed.push({ kind: "trimmed-oversized-html", location: `${loc}.pages[${pi}]`, detail: `pages[${pi}].html trimmed.` });
          }
        }
      }

      // Heal bindTo
      if (typeof comp.bindTo === "string" && comp.bindTo.trim()) {
        const hint = inferDefaultByComponent(comp, "bindTo");
        ensurePathInState(env.initialState, comp.bindTo, defaultValueFor(hint), healed, unfixable, `${loc}.bindTo`, "created-binding-path");
      }

      // journalEditor.accountsPath / trialBalance.entriesPath/accountsPath
      if (comp.type === "journalEditor" && typeof comp.accountsPath === "string") {
        ensurePathInState(env.initialState, comp.accountsPath, [], healed, unfixable, `${loc}.accountsPath`, "created-binding-path");
      }
      if (comp.type === "trialBalance") {
        if (typeof comp.entriesPath === "string") {
          ensurePathInState(env.initialState, comp.entriesPath, [], healed, unfixable, `${loc}.entriesPath`, "created-binding-path");
        }
        if (typeof comp.accountsPath === "string") {
          ensurePathInState(env.initialState, comp.accountsPath, [], healed, unfixable, `${loc}.accountsPath`, "created-binding-path");
        }
      }

      // kpiGrid items individually
      if (comp.type === "kpiGrid" && Array.isArray(comp.items)) {
        for (let ii = 0; ii < comp.items.length; ii++) {
          const it = comp.items[ii];
          if (it && typeof it.bindTo === "string" && it.bindTo.trim()) {
            const dt = it.format === "text" ? "" : 0;
            ensurePathInState(env.initialState, it.bindTo, dt, healed, unfixable, `${loc}.items[${ii}].bindTo`, "created-binding-path");
          }
        }
      }

      // form fields with selectFromState — statePath must be an array
      if (comp.type === "form" && Array.isArray(comp.fields)) {
        const knownFieldNames = new Set<string>();
        for (let fi = 0; fi < comp.fields.length; fi++) {
          const f = comp.fields[fi];
          if (!f || typeof f !== "object" || typeof f.name !== "string") continue;
          knownFieldNames.add(f.name);
          if (f.type === "selectFromState" && typeof f.statePath === "string") {
            ensurePathInState(env.initialState, f.statePath, [], healed, unfixable, `${loc}.fields[${fi}].statePath`, "created-statepath-array");
          }
        }
        // Validate submit
        const sub = comp.submit;
        if (sub && typeof sub === "object") {
          if (sub.type === "mutate" && Array.isArray(sub.ops)) {
            sub.ops = sub.ops.filter((op: any, oi: number) => {
              if (!op || typeof op !== "object" || typeof op.path !== "string") {
                healed.push({ kind: "dropped-orphan-mutation-op", location: `${loc}.submit.ops[${oi}]`, detail: "Missing path." });
                return false;
              }
              if (!isSafePath(op.path)) {
                healed.push({ kind: "dropped-orphan-mutation-op", location: `${loc}.submit.ops[${oi}]`, detail: `Unsafe path "${op.path}".` });
                return false;
              }
              // check form refs inside the op value tree
              const refs = new Set<string>();
              collectFormRefs(op, refs);
              for (const r of refs) {
                if (!knownFieldNames.has(r)) {
                  healed.push({
                    kind: "dropped-unknown-form-field-ref",
                    location: `${loc}.submit.ops[${oi}]`,
                    detail: `References {form.${r}} but no field of that name on this form.`,
                  });
                  return false;
                }
              }
              ensurePathInState(env.initialState, op.path, defaultForMutationOp(op), healed, unfixable, `${loc}.submit.ops[${oi}].path`, "created-mutation-path");
              return true;
            });
          } else if (sub.type === "check" && sub.expected && typeof sub.expected === "object") {
            // expected keys must match field names
            for (const k of Object.keys(sub.expected)) {
              if (!knownFieldNames.has(k)) {
                healed.push({
                  kind: "dropped-unknown-form-field-ref",
                  location: `${loc}.submit.expected.${k}`,
                  detail: `expected key "${k}" has no matching field; removing.`,
                });
                delete sub.expected[k];
              }
            }
          }
        }
      }

      // button actions
      if (comp.type === "button" && comp.action && typeof comp.action === "object") {
        const a = comp.action;
        if (a.type === "go-to-screen") {
          if (typeof a.screenId !== "string" || !screenIds.has(a.screenId)) {
            const orig = String(a.screenId ?? "");
            comp.action = { type: "show-message", text: "هذه الشاشة لم تُجهَّز بعد. عُد للقائمة الجانبية." };
            healed.push({
              kind: "replaced-orphan-screen-action",
              location: `${loc}.action`,
              detail: `go-to-screen target "${orig}" not found; replaced with show-message.`,
            });
          }
        } else if (a.type === "mutate" && Array.isArray(a.ops)) {
          a.ops = a.ops.filter((op: any, oi: number) => {
            if (!op || typeof op !== "object" || typeof op.path !== "string" || !isSafePath(op.path)) {
              healed.push({ kind: "dropped-orphan-mutation-op", location: `${loc}.action.ops[${oi}]`, detail: "Missing/unsafe path." });
              return false;
            }
            // Button mutate ops have no form context — drop any form refs
            const refs = new Set<string>();
            collectFormRefs(op, refs);
            if (refs.size > 0) {
              healed.push({
                kind: "dropped-unknown-action-form-ref",
                location: `${loc}.action.ops[${oi}]`,
                detail: `Button mutate cannot reference {form.*} — has no form context.`,
              });
              return false;
            }
            ensurePathInState(env.initialState, op.path, defaultForMutationOp(op), healed, unfixable, `${loc}.action.ops[${oi}].path`, "created-mutation-path");
            return true;
          });
        }
      }

      // Heal eventMap mutation paths inside terminal/webApp/browser
      if ((comp.type === "terminal" || comp.type === "webApp" || comp.type === "browser") && comp.eventMap && typeof comp.eventMap === "object") {
        for (const [evt, ops] of Object.entries(comp.eventMap)) {
          if (!Array.isArray(ops)) continue;
          comp.eventMap[evt] = (ops as any[]).filter((op: any, oi: number) => {
            if (!op || typeof op !== "object" || typeof op.path !== "string" || !isSafePath(op.path)) {
              healed.push({ kind: "dropped-orphan-mutation-op", location: `${loc}.eventMap["${evt}"][${oi}]`, detail: "Missing/unsafe path." });
              return false;
            }
            // Skip auto-create when path contains a runtime placeholder
            // (`${event.data.x}`, `${form.X}`, etc.) — the path is dynamic
            // and only resolved at mutation time, so we can't seed it now
            // without polluting initialState with literal placeholder keys.
            if (!op.path.includes("${")) {
              ensurePathInState(env.initialState, op.path, defaultForMutationOp(op), healed, unfixable, `${loc}.eventMap["${evt}"][${oi}].path`, "created-mutation-path");
            }
            return true;
          });
        }
      }

      // achievement.showWhen.path
      // Note: "exists" predicate paths were already pre-seeded with `null`
      // (see preSeedExistsPredicatePaths). For non-exists ops we fall through
      // to a generic safe default that won't accidentally satisfy the
      // predicate at start.
      if (comp.type === "achievement" && comp.showWhen && typeof comp.showWhen === "object" && typeof comp.showWhen.path === "string") {
        const swOp = comp.showWhen.op;
        const swDefault =
          swOp === "lengthGte" ? [] :
          (swOp === "gte" || swOp === "lte") ? 0 :
          swOp === "exists" ? null :
          null; // equals / unknown
        ensurePathInState(env.initialState, comp.showWhen.path, swDefault, healed, unfixable, `${loc}.showWhen.path`, "created-binding-path");
      }

      next.push(comp);
    }
    screen.components = next;
  }

  // Tasks
  env.tasks = env.tasks.map((t: any, ti: number) => {
    const id = (typeof t?.id === "string" && t.id.trim()) ? t.id.trim() : `t${ti + 1}`;
    const description = typeof t?.description === "string" ? t.description : "";
    let targetScreen: string | undefined;
    if (typeof t?.targetScreen === "string" && screenIds.has(t.targetScreen)) {
      targetScreen = t.targetScreen;
    } else if (t?.targetScreen) {
      // had one, but it doesn't exist — fall back to first screen
      targetScreen = env.screens[0]?.id;
      healed.push({
        kind: "fixed-task-target-screen",
        location: `tasks[${ti}].targetScreen`,
        detail: `Original "${t.targetScreen}" missing; reassigned to "${targetScreen}".`,
      });
    } else {
      targetScreen = env.screens[0]?.id;
    }

    let completeWhen: any = undefined;
    if (t?.completeWhen && typeof t.completeWhen === "object" && typeof t.completeWhen.path === "string" && isSafePath(t.completeWhen.path)) {
      const op = t.completeWhen.op;
      if (["exists", "equals", "gte", "lte", "lengthGte"].includes(op)) {
        completeWhen = t.completeWhen;
        // ensure path exists so the predicate can actually flip.
        // "exists" already handled by preSeedExistsPredicatePaths (null seed);
        // pathExists will return true so this becomes a no-op.
        // For "equals" / unknown we use null so the predicate can't be
        // satisfied accidentally before the student does anything.
        const def =
          op === "lengthGte" ? [] :
          (op === "gte" || op === "lte") ? 0 :
          op === "exists" ? null :
          null; // equals / fallback
        ensurePathInState(env.initialState, t.completeWhen.path, def, healed, unfixable, `tasks[${ti}].completeWhen.path`, "created-completewhen-path");
      }
    }

    return { id, description, targetScreen, hint: t?.hint, ...(completeWhen ? { completeWhen } : {}) };
  });

  return { env, report: { healed, unfixable } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Surgical re-prompt helper — caller uses this to formulate a tight,
// targeted message to the model when validation produced unfixable issues.
// Kept here so the prompt copy is co-located with the validator.
// ─────────────────────────────────────────────────────────────────────────────

export function buildSurgicalRepairPrompt(env: any, unfixable: UnfixableIssue[]): string {
  const lines: string[] = [];
  lines.push("⚠️ البيئة التي أنتجتَها تحتوي على مشاكل بنيوية يجب إصلاحها قبل عرضها على الطالب.");
  lines.push("");
  lines.push("**القواعد:**");
  lines.push("1. أرجع نفس البيئة بعد الإصلاح بصيغة JSON كاملة صالحة، **بدون أي شرح**.");
  lines.push("2. لا تغيّر ما يعمل — أصلح فقط النقاط المذكورة أدناه.");
  lines.push("3. حافظ على نفس عدد الشاشات والمهام إذا أمكن.");
  lines.push("");
  lines.push("**المشاكل التي يجب إصلاحها:**");
  for (const i of unfixable) {
    lines.push(`- [${i.kind}] في ${i.location}: ${i.detail}`);
  }
  lines.push("");
  lines.push("**البيئة الحالية (للسياق فقط — أعد إرسالها كاملة بعد الإصلاح):**");
  lines.push("```json");
  lines.push(JSON.stringify(env, null, 2).slice(0, 12000));
  lines.push("```");
  return lines.join("\n");
}
