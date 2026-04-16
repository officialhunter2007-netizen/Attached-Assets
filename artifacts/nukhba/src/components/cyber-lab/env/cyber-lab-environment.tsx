import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleQuestion, ChevronLeft, Monitor, Share2, Info, X, AlertTriangle, Send, Minimize2 } from "lucide-react";
import type { CyberEnvironment, VirtualMachine, FSNode, MachineSession, CommandResult } from "./cyber-env-types";
import { executeCommand, getPrompt, resolvePath, checkSSHAuth } from "./cyber-env-commands";

interface Props {
  env: CyberEnvironment;
  onBack: () => void;
  onShare?: (content: string) => void;
  onAskHelp?: (context: string) => void;
}

function applyFsModification(fs: FSNode, path: string, newNode: FSNode): FSNode {
  const sep = path.includes("\\") ? "\\" : "/";
  const parts = path.split(sep).filter(Boolean);
  const clone = JSON.parse(JSON.stringify(fs));
  let current = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current.children?.[parts[i]]) {
      current.children = current.children || {};
      current.children[parts[i]] = { type: "dir", children: {} };
    }
    current = current.children[parts[i]];
  }
  current.children = current.children || {};
  current.children[parts[parts.length - 1]] = newNode;
  return clone;
}

function deleteFsNode(fs: FSNode, path: string): FSNode {
  const sep = path.includes("\\") ? "\\" : "/";
  const parts = path.split(sep).filter(Boolean);
  const clone = JSON.parse(JSON.stringify(fs));
  let current = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current.children?.[parts[i]]) return clone;
    current = current.children[parts[i]];
  }
  if (current.children) delete current.children[parts[parts.length - 1]];
  return clone;
}

const colorMap: Record<string, string> = {
  "0": "", "1": "font-bold", "2": "opacity-60",
  "31": "text-red-400", "32": "text-emerald-400", "33": "text-amber-400",
  "34": "text-blue-400", "36": "text-cyan-400", "35": "text-purple-400",
};

function renderAnsi(line: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\x1b\[(\d+)m/g;
  let lastIndex = 0;
  let match;
  let currentClass = "";
  let i = 0;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={i++} className={currentClass}>{line.slice(lastIndex, match.index)}</span>);
    }
    currentClass = colorMap[match[1]] || "";
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={i++} className={currentClass}>{line.slice(lastIndex)}</span>);
  }
  return parts.length > 0 ? <>{parts}</> : <>{line}</>;
}

function NetworkDiagram({ machines, network, activeMachineId, onSelectMachine }: {
  machines: VirtualMachine[];
  network: { gateway: string; subnet: string };
  activeMachineId: string;
  onSelectMachine: (id: string) => void;
}) {
  const centerX = 50;
  const centerY = 30;
  const radius = 28;

  return (
    <div className="w-full p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-amber-400">📡 مخطط الشبكة</span>
        <span className="text-[10px] text-muted-foreground/50">{network.subnet}</span>
      </div>
      <div className="relative w-full" style={{ paddingBottom: "55%" }}>
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full">
          <circle cx={centerX} cy={centerY} r={3} fill="#F59E0B" opacity={0.3} />
          <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-[2.5px] fill-amber-400/80 font-bold">Router</text>
          <text x={centerX} y={centerY + 5.5} textAnchor="middle" className="text-[2px] fill-white/30">{network.gateway}</text>

          {machines.map((m, idx) => {
            const angle = (idx / machines.length) * Math.PI * 2 - Math.PI / 2;
            const mx = centerX + Math.cos(angle) * radius;
            const my = centerY + Math.sin(angle) * radius;
            const isActive = m.id === activeMachineId;
            const isAttacker = m.role === "attacker";

            return (
              <g key={m.id} className="cursor-pointer" onClick={() => m.isAccessible && onSelectMachine(m.id)}>
                <line x1={centerX} y1={centerY} x2={mx} y2={my} stroke={isActive ? "#F59E0B" : isAttacker ? "#EF4444" : "#374151"} strokeWidth={isActive ? 0.4 : 0.2} strokeDasharray={m.isAccessible ? "none" : "1,1"} />
                <circle cx={mx} cy={my} r={isActive ? 5 : 4} fill={isActive ? "#1a1a2e" : "#0d1117"} stroke={isActive ? "#F59E0B" : isAttacker ? "#EF4444" : "#374151"} strokeWidth={isActive ? 0.6 : 0.3} />
                <text x={mx} y={my + 0.5} textAnchor="middle" className="text-[3px]" fill="white">{m.os.includes("windows") ? "🪟" : m.os === "kali-linux" ? "🐧" : "🖥️"}</text>
                <text x={mx} y={my + 7} textAnchor="middle" className="text-[2.2px] font-bold" fill={isActive ? "#F59E0B" : "white"}>{m.hostname}</text>
                <text x={mx} y={my + 9.5} textAnchor="middle" className="text-[1.8px]" fill="#6B7280">{m.ip}</text>
                {!m.isAccessible && <text x={mx} y={my + 11.5} textAnchor="middle" className="text-[1.8px]" fill="#EF4444">🔒</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function CyberLabEnvironment({ env, onBack, onShare, onAskHelp }: Props) {
  const [machines, setMachines] = useState<VirtualMachine[]>(env.machines);
  const [sessions, setSessions] = useState<Record<string, MachineSession>>(() => {
    const s: Record<string, MachineSession> = {};
    for (const m of env.machines.filter(m => m.isAccessible)) {
      const isWin = m.os.includes("windows");
      s[m.id] = {
        machineId: m.id,
        cwd: isWin ? "C:\\Users\\" + m.currentUser : (m.env.HOME || "/home/" + m.currentUser),
        sshStack: [],
        commandHistory: [],
        output: [],
      };
    }
    return s;
  });

  const accessibleMachines = machines.filter(m => m.isAccessible);
  const [activeMachineId, setActiveMachineId] = useState(accessibleMachines[0]?.id || "");
  const [input, setInput] = useState("");
  const [histIdx, setHistIdx] = useState(-1);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showMachines, setShowMachines] = useState(false);
  const [passwordMode, setPasswordMode] = useState<{ machineId: string; user: string } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInput, setHelpInput] = useState("");
  const [helpMessages, setHelpMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [shellType, setShellType] = useState<Record<string, "cmd" | "powershell">>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const helpScrollRef = useRef<HTMLDivElement>(null);

  const activeMachine = machines.find(m => m.id === activeMachineId) || machines[0];
  const activeSession = sessions[activeMachineId];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeSession?.output]);

  useEffect(() => {
    if (!helpOpen) inputRef.current?.focus();
  }, [activeMachineId, showBriefing, helpOpen]);

  useEffect(() => {
    if (helpScrollRef.current) helpScrollRef.current.scrollTop = helpScrollRef.current.scrollHeight;
  }, [helpMessages]);

  const currentMachine = useCallback((): VirtualMachine => {
    if (!activeSession || activeSession.sshStack.length === 0) return activeMachine;
    const lastSSH = activeSession.sshStack[activeSession.sshStack.length - 1];
    return machines.find(m => m.id === lastSSH.machineId) || activeMachine;
  }, [activeSession, activeMachine, machines]);

  const addOutput = useCallback((machineId: string, lines: Array<{ text: string; type: 'input' | 'output' | 'error' | 'system' }>) => {
    setSessions(prev => {
      const session = prev[machineId];
      if (!session) return prev;
      return { ...prev, [machineId]: { ...session, output: [...session.output, ...lines] } };
    });
  }, []);

  const selectMachineFromDiagram = useCallback((machineId: string) => {
    const m = machines.find(x => x.id === machineId);
    if (!m || !m.isAccessible) return;
    if (!sessions[machineId]) {
      const mIsWin = m.os.includes("windows");
      setSessions(prev => ({
        ...prev,
        [machineId]: {
          machineId, cwd: mIsWin ? "C:\\Users\\" + m.currentUser : (m.env.HOME || "/home/" + m.currentUser),
          sshStack: [], commandHistory: [], output: [],
        }
      }));
    }
    setActiveMachineId(machineId);
    setShowBriefing(false);
  }, [machines, sessions]);

  const handleExec = useCallback((cmd: string) => {
    if (!activeSession || !activeMachine) return;
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const cm = currentMachine();
    const prompt = getPrompt(cm, activeSession.cwd);
    const isWin = cm.os.includes("windows");
    const currentShell = shellType[activeMachineId] || "cmd";
    const promptText = isWin
      ? (currentShell === "powershell" ? `PS ${prompt.path}> ` : `${prompt.path}${prompt.symbol}`)
      : `${prompt.user}@${prompt.host}:${prompt.path}${prompt.symbol}`;

    if (passwordMode) {
      const target = machines.find(m => m.id === passwordMode.machineId);
      if (target && checkSSHAuth(target, passwordMode.user, trimmed)) {
        const targetHome = target.users.find(u => u.username === passwordMode.user)?.home || "/home/" + passwordMode.user;
        addOutput(activeMachineId, [
          { text: `${passwordMode.user}@${target.ip}'s password: ****`, type: "input" },
          { text: "", type: "output" },
          { text: `Welcome to ${target.osLabel}`, type: "system" },
          { text: `Last login: Mon Jan 15 08:00:00 2024`, type: "system" },
          { text: "", type: "output" },
        ]);

        setSessions(prev => ({
          ...prev,
          [activeMachineId]: {
            ...prev[activeMachineId],
            sshStack: [...prev[activeMachineId].sshStack, { machineId: target.id, user: passwordMode.user }],
            cwd: targetHome,
          }
        }));
        setMachines(prev => prev.map(m => m.id === target.id ? { ...m, isAccessible: true, currentUser: passwordMode.user } : m));
      } else {
        addOutput(activeMachineId, [
          { text: `${passwordMode.user}@${passwordMode.machineId}'s password: ****`, type: "input" },
          { text: "Permission denied, please try again.", type: "error" },
        ]);
      }
      setPasswordMode(null);
      return;
    }

    addOutput(activeMachineId, [{ text: `${promptText} ${trimmed}`, type: "input" }]);
    setSessions(prev => {
      const session = prev[activeMachineId];
      return { ...prev, [activeMachineId]: { ...session, commandHistory: [trimmed, ...session.commandHistory].slice(0, 100) } };
    });
    setHistIdx(-1);

    const resolvePathFn = (path: string, cwd: string) => resolvePath(cm.filesystem, path, cwd);
    const ctx = {
      machine: cm,
      cwd: activeSession.cwd,
      env,
      allMachines: machines,
      sshStack: activeSession.sshStack,
      commandHistory: activeSession.commandHistory,
      resolvePath: resolvePathFn,
    };

    const result: CommandResult = executeCommand(trimmed, ctx);

    if (result.clearScreen) {
      setSessions(prev => ({ ...prev, [activeMachineId]: { ...prev[activeMachineId], output: [] } }));
      return;
    }
    if (result.output.length > 0) {
      addOutput(activeMachineId, result.output.map(t => ({ text: t, type: (result.error ? "error" : "output") as 'error' | 'output' })));
    }
    if (result.newCwd) {
      setSessions(prev => ({ ...prev, [activeMachineId]: { ...prev[activeMachineId], cwd: result.newCwd! } }));
    }
    if (result.modifyFs) {
      const { path, node } = result.modifyFs;
      setMachines(prev => prev.map(m => m.id === cm.id ? { ...m, filesystem: applyFsModification(m.filesystem, path, node) } : m));
    }
    if (result.deleteFs) {
      setMachines(prev => prev.map(m => m.id === cm.id ? { ...m, filesystem: deleteFsNode(m.filesystem, result.deleteFs!) } : m));
    }
    if (result.passwordPrompt) {
      setPasswordMode({ machineId: result.passwordPrompt.machineId || "", user: result.passwordPrompt.user || "" });
    }
    if (result.exitSession && activeSession.sshStack.length > 0) {
      const prevStack = [...activeSession.sshStack];
      prevStack.pop();
      const prevMachine = prevStack.length > 0
        ? machines.find(m => m.id === prevStack[prevStack.length - 1].machineId) || activeMachine
        : activeMachine;
      const prevHome = prevMachine.env.HOME || "/home/" + prevMachine.currentUser;
      setSessions(prev => ({
        ...prev,
        [activeMachineId]: { ...prev[activeMachineId], sshStack: prevStack, cwd: prevHome }
      }));
    }
  }, [activeSession, activeMachine, activeMachineId, currentMachine, machines, env, addOutput, passwordMode, shellType]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { handleExec(input); setInput(""); }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!activeSession) return;
      const next = Math.min(histIdx + 1, activeSession.commandHistory.length - 1);
      setHistIdx(next);
      setInput(activeSession.commandHistory[next] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : (activeSession?.commandHistory[next] || ""));
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (!activeSession) return;
      const cm = currentMachine();
      const { node } = resolvePath(cm.filesystem, ".", activeSession.cwd);
      if (node?.children) {
        const partial = input.split(/\s+/).pop() || "";
        const matches = Object.keys(node.children).filter(n => n.startsWith(partial));
        if (matches.length === 1) {
          const parts = input.split(/\s+/);
          parts[parts.length - 1] = matches[0];
          setInput(parts.join(" "));
        }
      }
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setSessions(prev => ({ ...prev, [activeMachineId]: { ...prev[activeMachineId], output: [] } }));
    }
  }, [input, histIdx, activeSession, activeMachineId, currentMachine, handleExec]);

  const handleShare = useCallback(() => {
    if (!activeSession || !onShare) return;
    const cm = currentMachine();
    const text = [
      `🔐 بيئة: ${env.nameAr}`,
      `💻 جهاز: ${cm.hostname} (${cm.ip}) — ${cm.osLabel}`,
      `👤 مستخدم: ${cm.currentUser}`,
      `📂 مسار: ${activeSession.cwd}`,
      ``,
      `═══ آخر الأوامر ═══`,
      ...activeSession.output.slice(-30).map(o => o.text.replace(/\x1b\[\d+m/g, "")),
    ].join("\n");
    onShare(text);
  }, [activeSession, currentMachine, env, onShare]);

  const handleHelpSend = useCallback(() => {
    if (!helpInput.trim()) return;
    const question = helpInput.trim();
    setHelpMessages(prev => [...prev, { role: "user", text: question }]);
    setHelpInput("");

    const cm = currentMachine();
    const context = activeSession ? activeSession.output.slice(-15).map(o => o.text.replace(/\x1b\[\d+m/g, "")).join("\n") : "";

    const helpResponse = generateLocalHelp(question, cm, env, context);
    setTimeout(() => {
      setHelpMessages(prev => [...prev, { role: "assistant", text: helpResponse }]);
    }, 300);

    if (onAskHelp) {
      const fullContext = `🔐 سؤال من مختبر الأمن السيبراني:\nجهاز: ${cm.hostname} (${cm.ip}) — ${cm.osLabel}\nمستخدم: ${cm.currentUser}\nمسار: ${activeSession?.cwd || "/"}\n\nآخر الأوامر:\n${context}\n\nالسؤال: ${question}`;
      onAskHelp(fullContext);
    }
  }, [helpInput, currentMachine, activeSession, env, onAskHelp]);

  const handleBackAttempt = () => {
    setShowExitConfirm(true);
  };

  const cm = currentMachine();
  const prompt = cm ? getPrompt(cm, activeSession?.cwd || "/") : null;
  const isWin = cm?.os.includes("windows");
  const currentShell = shellType[activeMachineId] || "cmd";

  if (showBriefing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto" style={{ background: "#080a11", direction: "rtl" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1119] p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-white mb-1">{env.nameAr}</h2>
            <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${
              env.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              env.difficulty === "intermediate" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {env.difficulty === "beginner" ? "🟢 مبتدئ" : env.difficulty === "intermediate" ? "🟡 متوسط" : "🔴 متقدم"}
            </span>
          </div>

          <div className="mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans" dir="rtl">{env.briefing}</pre>
          </div>

          <NetworkDiagram
            machines={machines}
            network={env.network}
            activeMachineId={activeMachineId}
            onSelectMachine={selectMachineFromDiagram}
          />

          {env.objectives.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-bold text-emerald-400 mb-2">🎯 الأهداف:</h3>
              <div className="space-y-1">
                {env.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/40 shrink-0">{i + 1}.</span>
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-xs font-bold text-amber-400 mb-2">🖥️ الأجهزة في الشبكة:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {machines.map(m => (
                <button
                  key={m.id}
                  onClick={() => m.isAccessible && selectMachineFromDiagram(m.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-right transition-all ${
                    m.isAccessible ? "bg-white/[0.03] border-white/10 hover:border-emerald-500/30 cursor-pointer" : "bg-white/[0.01] border-white/5 opacity-60"
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{m.hostname}</div>
                    <div className="text-[10px] text-muted-foreground">{m.ip} • {m.osLabel}</div>
                    {m.services.filter(s => s.running).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.services.filter(s => s.running).map(s => (
                          <span key={s.port} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-muted-foreground/70">{s.name}:{s.port}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.isAccessible && <span className="text-[9px] text-emerald-400 font-bold">متاح ←</span>}
                  {!m.isAccessible && <span className="text-[9px] text-red-400/60">🔒</span>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setShowBriefing(false)} className="w-full py-3 rounded-xl bg-gradient-to-l from-red-600 to-red-500 text-white font-black text-sm shadow-lg shadow-red-500/20 hover:brightness-110 transition-all">
            ⚡ بدء التجربة
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: "#0d1117" }}>
      <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 bg-[#0a0e18] border-b border-white/5 overflow-x-auto" dir="ltr">
        <button onClick={handleBackAttempt} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="خروج">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => setShowBriefing(true)} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="مخطط الشبكة">
          <Info className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

        <button
          onClick={() => setShowMachines(!showMachines)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0 sm:hidden"
        >
          <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-bold">{cm?.hostname}</span>
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {accessibleMachines.map(m => {
            const isActive = m.id === activeMachineId;
            const isSSH = activeSession?.sshStack.some(s => s.machineId === m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (!sessions[m.id]) {
                    const mIsWin = m.os.includes("windows");
                    setSessions(prev => ({
                      ...prev,
                      [m.id]: { machineId: m.id, cwd: mIsWin ? "C:\\Users\\" + m.currentUser : (m.env.HOME || "/home/" + m.currentUser), sshStack: [], commandHistory: [], output: [] }
                    }));
                  }
                  setActiveMachineId(m.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive ? "bg-white/10 text-white border border-white/15" : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="text-sm">{m.icon}</span>
                <span>{m.hostname}</span>
                <span className="text-[9px] text-muted-foreground/40">{m.ip}</span>
                {isSSH && <span className="text-[9px] text-amber-400">SSH</span>}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {isWin && (
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setShellType(prev => ({ ...prev, [activeMachineId]: "cmd" }))}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${currentShell === "cmd" ? "bg-white/10 text-white" : "text-muted-foreground/50"}`}
            >CMD</button>
            <button
              onClick={() => setShellType(prev => ({ ...prev, [activeMachineId]: "powershell" }))}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${currentShell === "powershell" ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground/50"}`}
            >PowerShell</button>
          </div>
        )}

        {onShare && (
          <button onClick={handleShare} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="مشاركة مع المعلم">
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showMachines && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 left-2 right-2 z-50 rounded-xl border border-white/10 bg-[#0d1119] p-2 shadow-2xl sm:hidden" dir="rtl"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-bold text-muted-foreground">الأجهزة</span>
              <button onClick={() => setShowMachines(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            {accessibleMachines.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (!sessions[m.id]) {
                    const mIsWin = m.os.includes("windows");
                    setSessions(prev => ({ ...prev, [m.id]: { machineId: m.id, cwd: mIsWin ? "C:\\Users\\" + m.currentUser : m.env.HOME || "/home/" + m.currentUser, sshStack: [], commandHistory: [], output: [] } }));
                  }
                  setActiveMachineId(m.id);
                  setShowMachines(false);
                }}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs ${m.id === activeMachineId ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"}`}
              >
                <span>{m.icon}</span>
                <span className="font-bold">{m.hostname}</span>
                <span className="text-[10px] text-muted-foreground/50">{m.ip}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed cursor-text ${helpOpen ? "hidden sm:block" : ""}`}
          dir="ltr"
          onClick={() => inputRef.current?.focus()}
        >
          {activeSession && activeSession.output.length === 0 && (
            <div className="mb-2">
              <div className="text-emerald-400 text-xs font-bold mb-1">
                {cm?.icon} Connected to {cm?.hostname} ({cm?.ip}) — {cm?.osLabel}
              </div>
              {isWin && <div className="text-blue-400/60 text-xs mb-1">Shell: {currentShell === "powershell" ? "PowerShell" : "Command Prompt (CMD)"}</div>}
              <div className="text-muted-foreground/40 text-xs">Type 'help' for available commands</div>
              <div className="text-muted-foreground/40 text-xs mb-2">---</div>
            </div>
          )}

          {activeSession?.output.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-all min-h-[1.3em] ${
              line.type === "input" ? "text-white" :
              line.type === "error" ? "text-red-400" :
              line.type === "system" ? "text-amber-400/80 italic" :
              "text-gray-300"
            }`}>
              {renderAnsi(line.text)}
            </div>
          ))}

          {prompt && (
            <div className="flex items-center gap-0">
              {isWin ? (
                currentShell === "powershell" ? (
                  <span className="text-blue-400">PS {prompt.path}&gt; </span>
                ) : (
                  <span className="text-gray-300">{prompt.path}{prompt.symbol}</span>
                )
              ) : (
                <>
                  <span className={cm?.currentUser === "root" ? "text-red-400" : "text-cyan-400"}>{prompt.user}@{prompt.host}</span>
                  <span className="text-white">:</span>
                  <span className="text-blue-400">{prompt.path}</span>
                  <span className="text-white">{prompt.symbol} </span>
                </>
              )}
              <input
                ref={inputRef}
                type={passwordMode ? "password" : "text"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-white font-mono text-[13px] caret-emerald-400 min-w-0"
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder={passwordMode ? "Enter password..." : ""}
              />
            </div>
          )}
        </div>

        <AnimatePresence>
          {helpOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-l border-white/10 bg-[#0a0e18] flex flex-col overflow-hidden sm:relative fixed inset-0 z-50 sm:inset-auto sm:z-auto"
              style={{ direction: "rtl" }}
            >
              <div className="shrink-0 px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white flex-1">المساعد</span>
                <button onClick={() => setHelpOpen(false)} className="p-1 rounded hover:bg-white/5 transition-colors">
                  <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div ref={helpScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {helpMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <MessageCircleQuestion className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">اسأل أي سؤال عن المختبر</p>
                    <p className="text-[10px] text-muted-foreground/50">سأساعدك بالأوامر والأدوات المناسبة</p>
                  </div>
                )}
                {helpMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[90%] p-2.5 rounded-xl text-[11px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-red-500/10 border border-red-500/20 text-white"
                        : "bg-white/[0.03] border border-white/5 text-muted-foreground"
                    }`}>
                      <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                    </div>
                  </div>
                ))}
              </div>

              <div className="shrink-0 p-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input
                    value={helpInput}
                    onChange={e => setHelpInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleHelpSend()}
                    placeholder="اكتب سؤالك..."
                    className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white placeholder:text-muted-foreground/30 focus:border-amber-500/30 focus:outline-none"
                    dir="rtl"
                  />
                  <button onClick={handleHelpSend} className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors">
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!helpOpen && (
        <motion.button
          onClick={() => setHelpOpen(true)}
          className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ boxShadow: ["0 0 10px rgba(245,158,11,0.2)", "0 0 20px rgba(245,158,11,0.4)", "0 0 10px rgba(245,158,11,0.2)"] }}
          transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
        >
          <MessageCircleQuestion className="w-4 h-4" />
          <span>مساعدة</span>
        </motion.button>
      )}

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-[#0d1119] p-6 shadow-2xl text-center"
              dir="rtl"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/25">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-base font-black text-white mb-2">هل أنت متأكد من الخروج؟</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                سيتم إنهاء الجلسة بالكامل وحذف جميع البيانات والأوامر. لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-muted-foreground hover:bg-white/[0.05] transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => { setShowExitConfirm(false); onBack(); }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-red-600 to-red-500 text-white font-bold text-xs shadow-lg shadow-red-500/20 hover:brightness-110 transition-all"
                >
                  نعم، أنهِ الجلسة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function generateLocalHelp(question: string, machine: VirtualMachine, env: CyberEnvironment, recentOutput: string): string {
  const q = question.toLowerCase();
  const machineInfo = `أنت على ${machine.hostname} (${machine.ip}) بنظام ${machine.osLabel}`;
  const svcs = env.machines.flatMap(m => m.services.filter(s => s.running).map(s => `${m.hostname}:${s.port} (${s.name})`));

  if (q.includes("nmap") || q.includes("مسح") || q.includes("scan")) {
    const targets = env.machines.filter(m => m.id !== machine.id).map(m => m.ip);
    return `🔍 لمسح الشبكة:\n\nمسح سريع:\nnmap ${targets[0] || "192.168.1.0/24"}\n\nمسح شامل مع الخدمات:\nnmap -sV -sC ${targets[0] || "192.168.1.0/24"}\n\nمسح جميع الأجهزة:\nnmap -sV ${env.network.subnet}\n\nالأجهزة المتاحة:\n${targets.map(t => `• ${t}`).join("\n")}`;
  }
  if (q.includes("ssh") || q.includes("اتصال") || q.includes("دخول")) {
    const sshTargets = env.machines.filter(m => m.services.some(s => s.name === "ssh" && s.running) && m.id !== machine.id);
    if (sshTargets.length === 0) return "لا توجد أجهزة تدعم SSH في هذه البيئة.";
    return `🔑 للاتصال عبر SSH:\n\n${sshTargets.map(t => `ssh admin@${t.ip}\nأو: ssh root@${t.ip}`).join("\n\n")}\n\nبعد الاتصال أدخل كلمة المرور. جرب:\n• admin123\n• password123\n• toor123`;
  }
  if (q.includes("hydra") || q.includes("brute") || q.includes("كسر") || q.includes("كلمة")) {
    const sshTargets = env.machines.filter(m => m.services.some(s => s.name === "ssh") && m.id !== machine.id);
    return `🔐 لكسر كلمات المرور:\n\nhydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://${sshTargets[0]?.ip || "192.168.1.50"}\n\nأو باستخدام قائمة مخصصة:\nhydra -l root -P /usr/share/wordlists/common-passwords.txt ssh://${sshTargets[0]?.ip || "192.168.1.50"}\n\nنصيحة: ابدأ بملف common-passwords.txt لأنه أسرع`;
  }
  if (q.includes("flag") || q.includes("علم") || q.includes("هدف")) {
    return `🎯 الأهداف:\n\n${env.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\n💡 تلميحات:\n${env.hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}\n\nابحث عن ملفات FLAG.txt في المسارات المهمة مثل:\n/root/\n/home/admin/Documents/\nC:\\Users\\Administrator\\Desktop\\`;
  }
  if (q.includes("خدم") || q.includes("service") || q.includes("port")) {
    return `🌐 الخدمات النشطة في الشبكة:\n\n${svcs.map(s => `• ${s}`).join("\n")}\n\nاستخدم nmap -sV للتحقق من الإصدارات`;
  }
  if (q.includes("help") || q.includes("أوامر") || q.includes("مساعد") || q.includes("ماذا")) {
    return `📚 الأوامر المتاحة:\n\n🔍 استكشاف: ls, cd, cat, find, grep\n🌐 شبكة: nmap, ping, ifconfig, netstat, ssh, curl\n🔐 هجوم: hydra, john, gobuster, nikto, sqlmap\n🛡️ دفاع: iptables, ufw\n📋 نظام: ps, whoami, id, uname, history\n\n${machineInfo}`;
  }

  return `💡 ${machineInfo}\n\nالخدمات المتاحة:\n${svcs.slice(0, 5).map(s => `• ${s}`).join("\n")}\n\n${env.hints.length > 0 ? `تلميح: ${env.hints[0]}` : "جرب أمر help لرؤية الأوامر المتاحة"}`;
}
