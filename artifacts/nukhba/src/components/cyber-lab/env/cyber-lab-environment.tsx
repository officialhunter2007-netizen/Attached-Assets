import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleQuestion, ChevronLeft, Monitor, Share2, Info, X } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeMachine = machines.find(m => m.id === activeMachineId) || machines[0];
  const activeSession = sessions[activeMachineId];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeSession?.output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeMachineId, showBriefing]);

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

  const handleExec = useCallback((cmd: string) => {
    if (!activeSession || !activeMachine) return;
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const cm = currentMachine();
    const prompt = getPrompt(cm, activeSession.cwd);
    const isWin = cm.os.includes("windows");
    const promptText = isWin
      ? `${prompt.path}${prompt.symbol}`
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

        if (!sessions[target.id]) {
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
          setSessions(prev => ({
            ...prev,
            [activeMachineId]: {
              ...prev[activeMachineId],
              sshStack: [...prev[activeMachineId].sshStack, { machineId: target.id, user: passwordMode.user }],
              cwd: targetHome,
            }
          }));
        }

        setMachines(prev => prev.map(m => m.id === target.id ? { ...m, currentUser: passwordMode.user } : m));
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
  }, [activeSession, activeMachine, activeMachineId, currentMachine, machines, env, addOutput, passwordMode, sessions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleExec(input);
      setInput("");
    }
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

  const handleAskHelp = useCallback(() => {
    if (!activeSession || !onAskHelp) return;
    const cm = currentMachine();
    const context = [
      `[CYBER_LAB_HELP]`,
      `البيئة: ${env.nameAr}`,
      `الجهاز الحالي: ${cm.hostname} (${cm.ip}) — ${cm.osLabel}`,
      `المستخدم: ${cm.currentUser}`,
      `المسار: ${activeSession.cwd}`,
      `آخر 15 أمر ومخرجاتها:`,
      ...activeSession.output.slice(-30).map(o => o.text.replace(/\x1b\[\d+m/g, "")),
      `[/CYBER_LAB_HELP]`,
    ].join("\n");
    onAskHelp(context);
  }, [activeSession, currentMachine, env, onAskHelp]);

  const cm = currentMachine();
  const prompt = cm ? getPrompt(cm, activeSession?.cwd || "/") : null;
  const isWin = cm?.os.includes("windows");

  if (showBriefing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto" style={{ background: "#080a11", direction: "rtl" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1119] p-6 shadow-2xl"
        >
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

          <div className="mb-5">
            <h3 className="text-xs font-bold text-amber-400 mb-2">🖥️ الأجهزة في الشبكة:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {env.machines.map(m => (
                <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
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
                  {m.isAccessible && <span className="text-[9px] text-emerald-400 font-bold">متاح</span>}
                </div>
              ))}
            </div>
          </div>

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

          <button
            onClick={() => setShowBriefing(false)}
            className="w-full py-3 rounded-xl bg-gradient-to-l from-red-600 to-red-500 text-white font-black text-sm shadow-lg shadow-red-500/20 hover:brightness-110 transition-all"
          >
            ⚡ بدء التجربة
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: "#0d1117" }}>
      <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 bg-[#0a0e18] border-b border-white/5 overflow-x-auto" dir="ltr">
        <button onClick={onBack} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="رجوع">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => setShowBriefing(true)} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="وصف البيئة">
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
                      [m.id]: {
                        machineId: m.id, cwd: mIsWin ? "C:\\Users\\" + m.currentUser : (m.env.HOME || "/home/" + m.currentUser),
                        sshStack: [], commandHistory: [], output: [],
                      }
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
        {onShare && (
          <button onClick={handleShare} className="p-1 rounded hover:bg-white/5 transition-colors shrink-0" title="مشاركة مع المعلم">
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showMachines && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 left-2 right-2 z-50 rounded-xl border border-white/10 bg-[#0d1119] p-2 shadow-2xl sm:hidden"
            dir="rtl"
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
                    setSessions(prev => ({
                      ...prev,
                      [m.id]: { machineId: m.id, cwd: mIsWin ? "C:\\Users\\" + m.currentUser : m.env.HOME || "/home/" + m.currentUser, sshStack: [], commandHistory: [], output: [] }
                    }));
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

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed cursor-text"
        dir="ltr"
        onClick={() => inputRef.current?.focus()}
      >
        {activeSession && activeSession.output.length === 0 && (
          <div className="mb-2">
            <div className="text-emerald-400 text-xs font-bold mb-1">
              {cm?.icon} Connected to {cm?.hostname} ({cm?.ip}) — {cm?.osLabel}
            </div>
            <div className="text-muted-foreground/40 text-xs">Type {isWin ? "'help'" : "'help'"} for available commands</div>
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
              <>
                <span className="text-gray-300">{prompt.path}{prompt.symbol}</span>
              </>
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
              placeholder={passwordMode ? "أدخل كلمة المرور..." : ""}
            />
          </div>
        )}
      </div>

      {onAskHelp && (
        <motion.button
          onClick={handleAskHelp}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-l from-amber-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{ boxShadow: ["0 0 10px rgba(245,158,11,0.2)", "0 0 20px rgba(245,158,11,0.4)", "0 0 10px rgba(245,158,11,0.2)"] }}
          transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
        >
          <MessageCircleQuestion className="w-4 h-4" />
          <span>مساعدة</span>
        </motion.button>
      )}
    </div>
  );
}
