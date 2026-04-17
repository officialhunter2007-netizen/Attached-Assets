// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Environment — Type System
// Supports a shared state engine, declarative mutations, bindings, and CRUD.
// ─────────────────────────────────────────────────────────────────────────────

export type DynFormField =
  | { name: string; label: string; type: "text" | "number" | "date" | "textarea"; placeholder?: string; unit?: string; required?: boolean; default?: string | number }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean; default?: string }
  | { name: string; label: string; type: "selectFromState"; statePath: string; labelKey?: string; valueKey?: string; required?: boolean }
  | { name: string; label: string; type: "checkbox"; required?: boolean; default?: boolean };

// A mutation operation against the shared env state.
// Templates can reference {form.x} to substitute submitted form values, or {state.path} to read state.
export type DynMutation =
  | { op: "set"; path: string; value: any }
  | { op: "add"; path: string; value: number | string }            // numeric add (or string concat)
  | { op: "sub"; path: string; value: number }                      // numeric subtract
  | { op: "append"; path: string; value: any; idField?: string }    // append to array (auto-id if idField missing)
  | { op: "remove"; path: string; matchField: string; matchValue: any }
  | { op: "update"; path: string; matchField: string; matchValue: any; patch: any }
  | { op: "incrementInArray"; path: string; matchField: string; matchValue: any; field: string; by: number };

// Form submit modes
export type DynFormCheck = {
  type: "check";
  expected: Record<string, string | number>;
  tolerance?: number;
  correctMessage?: string;
  incorrectMessage?: string;
};

export type DynFormAskAi = { type: "ask-ai"; prompt: string };

export type DynFormMutate = {
  type: "mutate";
  ops: DynMutation[];
  successMessage?: string;
  validate?: { rule: "balanced-journal" | "positive-balance" | "non-empty"; field?: string; message?: string }[];
  resetOnSubmit?: boolean;
};

export type DynFormSubmit = DynFormCheck | DynFormAskAi | DynFormMutate;

// Component-level actions (for buttons)
export type DynActionAskAi = { type: "ask-ai"; prompt: string };
export type DynActionShowMessage = { type: "show-message"; text: string };
export type DynActionGoToScreen = { type: "go-to-screen"; screenId: string };
export type DynActionMutate = { type: "mutate"; ops: DynMutation[]; message?: string };
export type DynAction = DynActionAskAi | DynActionShowMessage | DynActionGoToScreen | DynActionMutate;

// Components — every component may be bound to a state path with `bindTo`.
// Static data (rows, items, value) is treated as initial/fallback when bindTo is set.
export type DynComponent =
  | { type: "text"; markdown: string }
  | { type: "alert"; tone: "info" | "warn" | "error" | "success"; title?: string; text: string }
  | { type: "kpi"; label: string; value?: string; sublabel?: string; bindTo?: string; format?: "number" | "currency" | "percent" | "text"; decimals?: number }
  | { type: "kpiGrid"; items: Array<{ label: string; value?: string; sublabel?: string; bindTo?: string; format?: "number" | "currency" | "percent" | "text"; decimals?: number }> }
  | { type: "table"; title?: string; columns: string[]; rows?: string[][]; bindTo?: string; columnKeys?: string[]; sortable?: boolean; searchable?: boolean }
  | { type: "editableTable"; title?: string; bindTo: string; columns: Array<{ key: string; label: string; type?: "text" | "number" | "date" | "select"; options?: string[] }>; allowAdd?: boolean; allowDelete?: boolean; idField?: string }
  | { type: "journal"; title?: string; items?: Array<{ date: string; desc: string; debit?: string; credit?: string; account?: string }>; bindTo?: string }
  | { type: "journalEditor"; title?: string; bindTo: string; accountsPath?: string; allowAdd?: boolean; allowDelete?: boolean }
  | { type: "list"; title?: string; items?: Array<{ title: string; subtitle?: string; badge?: string }>; bindTo?: string }
  | { type: "kvList"; title?: string; items?: Array<{ key: string; value: string }>; bindTo?: string }
  | { type: "form"; title?: string; description?: string; fields: DynFormField[]; submitLabel?: string; submit: DynFormSubmit }
  | { type: "button"; label: string; tone?: "primary" | "secondary" | "danger"; action: DynAction }
  | { type: "codeBlock"; language?: string; code: string }
  | { type: "chart"; chartType: "bar" | "line" | "pie"; title?: string; labels?: string[]; datasets?: Array<{ label: string; data: number[] }>; bindTo?: string; labelKey?: string; valueKey?: string }
  | { type: "stepper"; title?: string; steps: Array<{ title: string; description?: string; status?: "todo" | "current" | "done" }> }
  | { type: "richDocument"; title: string; sections: Array<{ heading: string; body: string }> }
  | { type: "invoice"; title?: string; bindTo: string; companyName?: string; companyDetails?: string }
  | { type: "trialBalance"; title?: string; entriesPath: string; accountsPath?: string }
  | { type: "calculator"; title?: string; description?: string; expression?: string };

export type DynScreen = {
  id: string;
  title: string;
  icon?: string;
  components: DynComponent[];
};

export type DynTask = {
  id: string;
  description: string;
  targetScreen?: string;
  hint?: string;
  // Auto-completion: task is checked off when this state condition is satisfied
  completeWhen?: { path: string; op: "exists" | "equals" | "gte" | "lte" | "lengthGte"; value?: any };
};

// The shared state object — schema is free-form; each env defines what it needs.
export type DynState = Record<string, any>;

export type DynamicEnv = {
  kind: string;
  title: string;
  briefing: string;
  objectives: string[];
  initialState?: DynState;     // ← NEW: starting world state (accounts, inventory, etc.)
  screens: DynScreen[];
  tasks: DynTask[];
  hints?: string[];
  successCriteria?: string[];
};

export type AskOptionsBlock = {
  question: string;
  options: string[];
  allowOther: boolean;
};
