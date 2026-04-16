export type LabKind = "cyber" | "nmap" | "wireshark" | "food" | "accounting" | "yemensoft";

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
