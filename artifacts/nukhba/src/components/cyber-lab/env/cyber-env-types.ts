export type OSType = 'kali-linux' | 'ubuntu-server' | 'ubuntu-desktop' | 'centos' | 'debian' | 'windows-10' | 'windows-server';

export type MachineRole = 'attacker' | 'target' | 'server' | 'workstation' | 'router';

export interface VMUser {
  username: string;
  password: string;
  isRoot: boolean;
  home: string;
  shell: string;
  groups: string[];
  uid: number;
}

export interface VMService {
  name: string;
  port: number;
  protocol: 'tcp' | 'udp';
  version: string;
  running: boolean;
  banner: string;
  vulnerabilities: string[];
  webContent?: Record<string, string>;
  ftpFiles?: string[];
  dbTables?: Record<string, string[][]>;
  smbShares?: Record<string, string[]>;
}

export interface FSNode {
  type: 'file' | 'dir';
  content?: string;
  children?: Record<string, FSNode>;
  permissions?: string;
  owner?: string;
  executable?: boolean;
  hidden?: boolean;
}

export interface VirtualMachine {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  os: OSType;
  osLabel: string;
  role: MachineRole;
  users: VMUser[];
  currentUser: string;
  filesystem: FSNode;
  services: VMService[];
  tools: string[];
  isAccessible: boolean;
  description: string;
  descriptionAr: string;
  icon: string;
  processes: VMProcess[];
  env: Record<string, string>;
}

export interface VMProcess {
  pid: number;
  user: string;
  cpu: string;
  mem: string;
  command: string;
}

export interface NetworkConfig {
  subnet: string;
  netmask: string;
  gateway: string;
  dns: string;
}

export interface CyberEnvironment {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  briefing: string;
  objectives: string[];
  hints: string[];
  network: NetworkConfig;
  machines: VirtualMachine[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  createdBy: 'student' | 'ai';
  createdAt: number;
}

export interface EnvironmentPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  descriptionAr: string;
  color: string;
  category: string;
}

export interface CommandResult {
  output: string[];
  newCwd?: string;
  switchToMachine?: string;
  sshPrompt?: { machineId: string; user: string };
  exitSession?: boolean;
  clearScreen?: boolean;
  error?: boolean;
  modifyFs?: { path: string; node: FSNode };
  deleteFs?: string;
  passwordPrompt?: { callback: string; machineId?: string; user?: string };
}

export interface CommandContext {
  machine: VirtualMachine;
  cwd: string;
  env: CyberEnvironment;
  allMachines: VirtualMachine[];
  sshStack: Array<{ machineId: string; user: string }>;
  commandHistory: string[];
  resolvePath: (path: string, cwd: string) => { node: FSNode | null; absPath: string };
}

export interface MachineSession {
  machineId: string;
  cwd: string;
  sshStack: Array<{ machineId: string; user: string }>;
  commandHistory: string[];
  output: Array<{ text: string; type: 'input' | 'output' | 'error' | 'system' }>;
}

export interface EnvironmentSetupRequest {
  presetId: string;
  goals: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
