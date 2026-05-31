import { useEffect, useRef, useState, useCallback } from "react";
import type { AttackScenario, NetworkState, TerminalEntry, SuggestedCommand } from "./types";

interface Props {
  scenario: AttackScenario;
  state: NetworkState;
  history: TerminalEntry[];
  onExec: (cmd: string) => Promise<void>;
  busy: boolean;
  suggested?: SuggestedCommand[];
}

export function SimTerminal({ scenario, state, history, onExec, busy, suggested }: Props) {
  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentHostObj = scenario.hosts.find(h => h.id === state.currentHost);
  const accessLevel = state.hosts[state.currentHost]?.accessLevel || "user";
  const userPart = accessLevel === "root" ? "root" : "student";
  const hostPart = currentHostObj?.name?.replace(/\s+/g, "-").toLowerCase() || state.currentHost;
  const promptPrefix = `${userPart}@${hostPart}:~$`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, busy]);

  const submit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || busy) return;
    setInput("");
    setHistoryIdx(-1);
    await onExec(cmd);
  }, [input, busy, onExec]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cmds = history.map(h => h.cmd);
      if (cmds.length === 0) return;
      const next = historyIdx === -1 ? cmds.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setInput(cmds[next] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cmds = history.map(h => h.cmd);
      if (historyIdx === -1) return;
      const next = historyIdx + 1;
      if (next >= cmds.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(next);
        setInput(cmds[next] || "");
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // Ctrl+L clears the visible buffer locally — does not affect history list.
      // We do this by adding a "clear" entry that swallows previous output visually.
      onExec("clear");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[320px] bg-black rounded-lg border border-emerald-500/20 overflow-hidden font-mono text-[12px]" dir="ltr">
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/50 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-emerald-300 text-[11px] mr-2">terminal — {currentHostObj?.name || state.currentHost}</span>
        </div>
        <span className="text-emerald-400/60 text-[10px]">
          {history.length} cmd · {accessLevel}
        </span>
      </div>

      {suggested && suggested.length > 0 && history.length === 0 && (
        <div className="p-2 border-b border-emerald-500/10 bg-emerald-950/20">
          <div className="text-emerald-400/70 text-[10px] mb-1.5" dir="rtl">أوامر مقترحة للبدء:</div>
          <div className="flex flex-wrap gap-1.5">
            {suggested.slice(0, 4).map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s.cmd)}
                disabled={busy}
                className="text-[11px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-50"
                title={s.why}
              >
                $ {s.cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 text-emerald-200 whitespace-pre-wrap leading-relaxed">
        {history.length === 0 && (
          <div className="text-emerald-400/60">
            <div className="text-emerald-300 mb-2">🎯 {scenario.title}</div>
            <div className="text-[11px]" dir="rtl">
              مرحباً. أنت داخل {currentHostObj?.name || "الجهاز المهاجم"}. اكتب أمراً للبدء (مثل <span className="text-emerald-300">nmap -sV {scenario.hosts.find(h => h.role === "target")?.ip || "10.10.10.20"}</span>).
            </div>
            <div className="text-[10px] mt-2 text-emerald-400/40" dir="rtl">↑/↓ للتنقل في السجل · Ctrl+L للمسح</div>
          </div>
        )}
        {history.map((e) => {
          if (e.cmd === "clear") return null;
          return (
            <div key={e.id} className="mb-2">
              <div className="text-emerald-400">
                <span className="text-cyan-300">{e.host === state.currentHost ? promptPrefix : `${userPart}@${e.host}:~$`}</span>{" "}
                <span className="text-white">{e.cmd}</span>
              </div>
              {e.out && <div className="text-emerald-200 mt-0.5">{e.out}</div>}
              {e.err && <div className="text-red-400 mt-0.5">{e.err}</div>}
            </div>
          );
        })}
        {busy && (
          <div className="text-amber-300 animate-pulse">… simulating</div>
        )}
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-emerald-500/20 bg-black">
        <span className="text-cyan-300 shrink-0">{promptPrefix}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent text-emerald-200 outline-none placeholder:text-emerald-700 min-h-[28px]"
          placeholder={busy ? "..." : "اكتب أمراً واضغط Enter"}
        />
        <button
          onClick={submit}
          disabled={busy || !input.trim()}
          className="text-[11px] px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30"
        >
          run
        </button>
      </div>
    </div>
  );
}
