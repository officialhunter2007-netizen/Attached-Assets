export type DynFormField =
  | { name: string; label: string; type: "text" | "number" | "textarea"; placeholder?: string; unit?: string; required?: boolean }
  | { name: string; label: string; type: "select"; options: string[]; required?: boolean };

export type DynFormCheck = {
  type: "check";
  expected: Record<string, string | number>;
  tolerance?: number;
  correctMessage?: string;
  incorrectMessage?: string;
};

export type DynFormAskAi = {
  type: "ask-ai";
  prompt: string;
};

export type DynFormSubmit = DynFormCheck | DynFormAskAi;

export type DynActionAskAi = { type: "ask-ai"; prompt: string };
export type DynActionShowMessage = { type: "show-message"; text: string };
export type DynActionGoToScreen = { type: "go-to-screen"; screenId: string };
export type DynAction = DynActionAskAi | DynActionShowMessage | DynActionGoToScreen;

export type DynComponent =
  | { type: "text"; markdown: string }
  | { type: "alert"; tone: "info" | "warn" | "error" | "success"; title?: string; text: string }
  | { type: "kpi"; label: string; value: string; sublabel?: string }
  | { type: "kpiGrid"; items: Array<{ label: string; value: string; sublabel?: string }> }
  | { type: "table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "journal"; title?: string; items: Array<{ date: string; desc: string; debit?: string; credit?: string; account?: string }> }
  | { type: "list"; title?: string; items: Array<{ title: string; subtitle?: string; badge?: string }> }
  | { type: "kvList"; title?: string; items: Array<{ key: string; value: string }> }
  | { type: "form"; title?: string; description?: string; fields: DynFormField[]; submitLabel?: string; submit: DynFormSubmit }
  | { type: "button"; label: string; tone?: "primary" | "secondary"; action: DynAction }
  | { type: "codeBlock"; language?: string; code: string }
  | { type: "chart"; chartType: "bar" | "line" | "pie"; title?: string; labels: string[]; datasets: Array<{ label: string; data: number[] }> }
  | { type: "stepper"; title?: string; steps: Array<{ title: string; description?: string; status?: "todo" | "current" | "done" }> }
  | { type: "richDocument"; title: string; sections: Array<{ heading: string; body: string }> };

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
};

export type DynamicEnv = {
  kind: string;
  title: string;
  briefing: string;
  objectives: string[];
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
