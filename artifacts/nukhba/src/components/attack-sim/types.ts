export type Difficulty = "beginner" | "intermediate" | "advanced";

export type Service = {
  port: number;
  protocol: "tcp" | "udp";
  name: string;
  version?: string;
  vulnerable?: boolean;
  hint?: string;
};

export type HostUser = { name: string; password?: string; note?: string };

export type HostFile = { path: string; content?: string };

export type Host = {
  id: string;
  name: string;
  ip: string;
  os?: string;
  role: "attacker" | "target" | "router" | "service";
  x: number;
  y: number;
  services?: Service[];
  users?: HostUser[];
  files?: HostFile[];
  tools?: string[];
};

export type Edge = { from: string; to: string; label?: string };

export type Flag = {
  id: string;
  host: string;
  path: string;
  label: string;
  points?: number;
};

export type Hint = { trigger: string; text: string };

export type SuggestedCommand = { cmd: string; why?: string };

export type AttackScenario = {
  title: string;
  story: string;
  difficulty: Difficulty;
  category?: string;
  objectives: string[];
  studentHost: string;
  hosts: Host[];
  edges: Edge[];
  flags: Flag[];
  hints?: Hint[];
  suggestedCommands?: SuggestedCommand[];
};

export type HostState = {
  discovered: boolean;
  portsScanned: boolean;
  knownServices: string[];
  compromised: boolean;
  accessLevel?: "user" | "root";
  capturedFlags: string[];
};

export type NetworkState = {
  hosts: Record<string, HostState>;
  currentHost: string;
  capturedFlagIds: string[];
  startedAt: string;
};

export type TerminalEntry = {
  id: string;
  cmd: string;
  out: string;
  err?: string;
  exitCode: number;
  host: string;
  timestamp: number;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export function createInitialState(scenario: AttackScenario): NetworkState {
  const hosts: Record<string, HostState> = {};
  for (const h of scenario.hosts) {
    hosts[h.id] = {
      discovered: h.id === scenario.studentHost,
      portsScanned: h.id === scenario.studentHost,
      knownServices: [],
      compromised: h.id === scenario.studentHost,
      accessLevel: h.id === scenario.studentHost ? "root" : undefined,
      capturedFlags: [],
    };
  }
  return {
    hosts,
    currentHost: scenario.studentHost,
    capturedFlagIds: [],
    startedAt: new Date().toISOString(),
  };
}
