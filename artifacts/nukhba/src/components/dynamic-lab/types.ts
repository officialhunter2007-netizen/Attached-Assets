// ⚠️ LEGACY-ONLY MODULE — DO NOT EXTEND.
// This `dynamic-lab` system (overlay + scenarios) is kept solely for
// back-compat with already-stored Food / Accounting / YemenSoft scenarios.
// All NEW practice environments MUST go through the universal system in
// `dynamic-env/` (see types.ts there + the AI builder at
// /api/ai/lab/build-env). The single floating "🧪 ابنِ بيئة تطبيقية" entry
// point in subject.tsx, the inline `[[CREATE_LAB_ENV]]` teacher tag, and
// the deterministic free-text intent detection in /api/ai/teach all build
// dynamic-env environments — never dynamic-lab ones.
export type LabKind = "food" | "accounting" | "yemensoft";

export interface ScenarioTask {
  id: string;
  title: string;
  description?: string;
  targetTab?: string;
  expectedAnswer?: string;
}

export interface ScenarioCheck {
  id: string;
  description: string;
}

export interface DynamicScenario {
  id: string;
  kind: LabKind;
  title: string;
  briefing: string;
  context?: string;
  objectives: string[];
  tasks: ScenarioTask[];
  successChecks: ScenarioCheck[];
  hints: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: number;
  createdBy?: "ai" | "student" | "teacher";

  product?: {
    nameAr: string;
    category?: string;
    initialAw?: number;
    initialPH?: number;
    initialTempC?: number;
  };
  microorganisms?: string[];

  transactions?: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    currency?: string;
  }>;

  company?: { nameAr: string; fiscalYear?: string };
  seedData?: {
    customers?: Array<{ id: string; nameAr: string; balance?: number }>;
    items?: Array<{ id: string; nameAr: string; price?: number; stock?: number }>;
    [key: string]: any;
  };
}

export interface LabAssistMessage {
  role: "user" | "assistant";
  content: string;
}
