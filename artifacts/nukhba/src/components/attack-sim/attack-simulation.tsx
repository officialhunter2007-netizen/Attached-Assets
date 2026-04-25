import { useMemo, useState } from "react";
import type { AttackScenario, NetworkState, TerminalEntry, Host } from "./types";
import { createInitialState } from "./types";
import { NetworkDiagram } from "./network-diagram";
import { SimTerminal } from "./sim-terminal";
import { SimAssistant } from "./sim-assistant";

interface Props {
  scenario: AttackScenario;
  subjectId?: string;
  onClose: () => void;
}

type MobileTab = "diagram" | "terminal" | "assistant";

export function AttackSimulation({ scenario, subjectId, onClose }: Props) {
  const [state, setState] = useState<NetworkState>(() => createInitialState(scenario));
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("terminal");
  const [showHostInfo, setShowHostInfo] = useState(false);

  const totalFlags = scenario.flags?.length || 0;
  const capturedFlags = state.capturedFlagIds.length;
  const progress = totalFlags > 0 ? Math.round((capturedFlags / totalFlags) * 100) : 0;

  const onExec = async (cmd: string) => {
    if (cmd === "clear") {
      setHistory([]);
      return;
    }
    setBusy(true);
    const entryId = `t-${Date.now()}`;
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/ai/attack-sim/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectId,
          scenario,
          networkState: state,
          currentHost: state.currentHost,
          command: cmd,
          history: history.slice(-6).map(h => ({ cmd: h.cmd, out: h.out })),
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        let msg = `HTTP ${r.status}`;
        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch { if (text) msg += `: ${text.slice(0, 160)}`; }
        setHistory(h => [...h, {
          id: entryId, cmd, out: "", err: `simulator: ${msg}`,
          exitCode: 1, host: state.currentHost, timestamp: Date.now(),
        }]);
        return;
      }
      const data = await r.json();

      const entry: TerminalEntry = {
        id: entryId,
        cmd,
        out: data.stdout || "",
        err: data.stderr || undefined,
        exitCode: typeof data.exitCode === "number" ? data.exitCode : 0,
        host: state.currentHost,
        timestamp: Date.now(),
      };
      setHistory(h => [...h, entry]);

      if (data.stateUpdate) {
        setState(prev => {
          const next: NetworkState = { ...prev, hosts: { ...prev.hosts } };
          if (data.stateUpdate.hosts && typeof data.stateUpdate.hosts === "object") {
            for (const [hostId, patch] of Object.entries(data.stateUpdate.hosts)) {
              const cur = next.hosts[hostId] || {
                discovered: false, portsScanned: false, knownServices: [],
                compromised: false, capturedFlags: [],
              };
              const p = patch as Partial<NetworkState["hosts"][string]>;
              next.hosts[hostId] = {
                discovered: cur.discovered || !!p.discovered,
                portsScanned: cur.portsScanned || !!p.portsScanned,
                knownServices: Array.from(new Set([...(cur.knownServices || []), ...(p.knownServices || [])])),
                compromised: cur.compromised || !!p.compromised,
                accessLevel: p.accessLevel || cur.accessLevel,
                capturedFlags: Array.from(new Set([...(cur.capturedFlags || []), ...(p.capturedFlags || [])])),
              };
            }
          }
          if (data.stateUpdate.currentHost && typeof data.stateUpdate.currentHost === "string") {
            const targetHost = scenario.hosts.find(h => h.id === data.stateUpdate.currentHost);
            if (targetHost) {
              next.currentHost = data.stateUpdate.currentHost;
              if (next.hosts[next.currentHost]) {
                next.hosts[next.currentHost].discovered = true;
              }
            }
          }
          const allCapturedFlags = new Set(prev.capturedFlagIds);
          for (const h of Object.values(next.hosts)) {
            for (const fId of h.capturedFlags) allCapturedFlags.add(fId);
          }
          next.capturedFlagIds = Array.from(allCapturedFlags);
          return next;
        });
      }
    } catch (e: any) {
      setHistory(h => [...h, {
        id: entryId, cmd, out: "", err: `simulator: ${e?.message || "network error"}`,
        exitCode: 1, host: state.currentHost, timestamp: Date.now(),
      }]);
    } finally {
      setBusy(false);
    }
  };

  const selectedHost = useMemo(
    () => selectedHostId ? scenario.hosts.find(h => h.id === selectedHostId) : null,
    [selectedHostId, scenario.hosts]
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-950" style={{ direction: "rtl" }}>
      <div className="shrink-0 px-3 py-2 border-b border-white/10 bg-gradient-to-l from-red-950/40 via-slate-900 to-slate-900 flex items-center gap-3 flex-wrap">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center text-lg shrink-0"
          title="إغلاق المحاكاة"
        >
          ←
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl shrink-0">🎯</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">{scenario.title}</h2>
            <p className="text-[11px] text-white/55 truncate">{scenario.story}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[11px] text-white/70">
            <span className="text-amber-300 font-bold">{capturedFlags}</span>
            <span className="text-white/40">/</span>
            <span>{totalFlags} flags</span>
          </div>
          <div className="hidden sm:block w-32 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-l from-emerald-400 to-amber-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {scenario.objectives && scenario.objectives.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-white/10 bg-black/40 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-white/50 shrink-0">الأهداف:</span>
          {scenario.objectives.map((o, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/75 whitespace-nowrap">
              {i + 1}. {o}
            </span>
          ))}
        </div>
      )}

      <div className="flex md:hidden border-b border-white/10 bg-black/30 shrink-0">
        {([
          { k: "diagram", l: "🌐 الشبكة" },
          { k: "terminal", l: "💻 الطرفية" },
          { k: "assistant", l: "🤖 المدرّب" },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setMobileTab(t.k)}
            className={`flex-1 py-2 text-xs font-bold transition ${mobileTab === t.k ? "text-red-300 border-b-2 border-red-400 bg-red-500/5" : "text-white/50"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3 gap-3 hidden md:grid md:grid-cols-12">
        <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0">
            <NetworkDiagram
              scenario={scenario}
              state={state}
              selectedHostId={selectedHostId}
              onSelectHost={(id) => { setSelectedHostId(id); setShowHostInfo(true); }}
            />
          </div>
          {selectedHost && showHostInfo && (
            <HostDetail host={selectedHost} state={state} onClose={() => setShowHostInfo(false)} />
          )}
        </div>
        <div className="md:col-span-5 lg:col-span-5 min-h-0">
          <SimTerminal
            scenario={scenario}
            state={state}
            history={history}
            onExec={onExec}
            busy={busy}
            suggested={scenario.suggestedCommands}
          />
        </div>
        <div className="md:col-span-3 lg:col-span-3 min-h-0">
          <SimAssistant scenario={scenario} subjectId={subjectId} state={state} terminalHistory={history} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3 md:hidden">
        {mobileTab === "diagram" && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex-1 min-h-0">
              <NetworkDiagram
                scenario={scenario}
                state={state}
                selectedHostId={selectedHostId}
                onSelectHost={(id) => { setSelectedHostId(id); setShowHostInfo(true); }}
              />
            </div>
            {selectedHost && showHostInfo && (
              <HostDetail host={selectedHost} state={state} onClose={() => setShowHostInfo(false)} />
            )}
          </div>
        )}
        {mobileTab === "terminal" && (
          <SimTerminal
            scenario={scenario}
            state={state}
            history={history}
            onExec={onExec}
            busy={busy}
            suggested={scenario.suggestedCommands}
          />
        )}
        {mobileTab === "assistant" && (
          <SimAssistant scenario={scenario} subjectId={subjectId} state={state} terminalHistory={history} />
        )}
      </div>
    </div>
  );
}

function HostDetail({ host, state, onClose }: { host: Host; state: NetworkState; onClose: () => void }) {
  const s = state.hosts[host.id];
  const visible = !!s?.discovered;

  return (
    <div className="rounded-lg bg-black/50 border border-white/10 p-3 text-sm max-h-[200px] overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-white text-sm">
          {host.name} <span className="text-cyan-300 font-mono text-xs">({host.ip})</span>
        </h4>
        <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none">×</button>
      </div>
      {!visible ? (
        <div className="text-xs text-white/50">جهاز غير مكتشَف بعد. جرّب مسح الشبكة أوّلاً.</div>
      ) : (
        <div className="space-y-2 text-xs">
          {host.os && <div className="text-white/70">نظام: <span className="text-white">{host.os}</span></div>}
          {s?.compromised && (
            <div className="text-red-300">مُختَرَق · صلاحيات: {s.accessLevel || "user"}</div>
          )}
          {s?.portsScanned && host.services && host.services.length > 0 && (
            <div>
              <div className="text-white/60 mb-1">الخدمات المكتشَفة:</div>
              <ul className="space-y-1">
                {host.services.map((sv, i) => (
                  <li key={i} className="font-mono text-[11px] text-emerald-200">
                    {sv.port}/{sv.protocol} {sv.name}{sv.version ? ` ${sv.version}` : ""}
                    {sv.vulnerable && <span className="text-red-300 mr-1">⚠</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s && s.capturedFlags.length > 0 && (
            <div className="text-amber-300">🚩 flags ملتقَطة: {s.capturedFlags.join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
}
