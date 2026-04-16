import { useEffect, useMemo, useRef, useState } from "react";
import type { DynamicEnv } from "./types";
import { ComponentRenderer } from "./component-renderer";

type AssistMsg = { role: "user" | "assistant"; content: string };

export function DynamicEnvShell({
  env,
  subjectId,
  onClose,
}: {
  env: DynamicEnv;
  subjectId: string;
  onClose?: () => void;
}) {
  const screens = env.screens || [];
  const [activeId, setActiveId] = useState<string>(screens[0]?.id || "");
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [assistMsgs, setAssistMsgs] = useState<AssistMsg[]>([]);
  const [assistInput, setAssistInput] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => screens.find((s) => s.id === activeId) || screens[0], [screens, activeId]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [assistMsgs, chatOpen]);

  const goToScreen = (id: string) => {
    if (screens.some((s) => s.id === id)) setActiveId(id);
  };

  const askAi = async (prompt: string) => {
    if (!prompt.trim() || assistBusy) return;
    setChatOpen(true);
    setAssistMsgs((p) => [...p, { role: "user", content: prompt }, { role: "assistant", content: "" }]);
    setAssistInput("");
    setAssistBusy(true);
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectId,
          kind: env.kind,
          envTitle: env.title,
          briefing: env.briefing,
          activeScreen: active?.title,
          question: prompt,
        }),
      });
      if (!r.ok || !r.body) throw new Error("assist failed");
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.content) {
              setAssistMsgs((p) => {
                const copy = [...p];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") last.content += j.content;
                return copy;
              });
            } else if (j.error) {
              setAssistMsgs((p) => {
                const copy = [...p];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant" && !last.content) last.content = `تعذّر الرد: ${j.error}`;
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {
      setAssistMsgs((p) => {
        const copy = [...p];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content) last.content = "تعذّر الوصول للمساعد الآن.";
        return copy;
      });
    } finally {
      setAssistBusy(false);
    }
  };

  const toggleTask = (id: string) => {
    setDoneTasks((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const totalTasks = env.tasks?.length || 0;
  const doneCount = doneTasks.size;
  const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  return (
    <div className="bg-slate-950 text-white rounded-xl border border-white/10 overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
      <div className="bg-gradient-to-l from-cyan-600/20 to-purple-600/20 p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{env.title}</h2>
            <p className="text-sm text-white/75 mt-1">{env.briefing}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-sm px-3 py-1 rounded bg-white/5 hover:bg-white/10"
            >
              إغلاق البيئة
            </button>
          )}
        </div>
        {env.objectives?.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-white/60 mb-1">الأهداف:</div>
            <ul className="list-disc list-inside text-sm text-white/85 space-y-0.5">
              {env.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-l border-white/10 bg-black/30 p-3 overflow-y-auto shrink-0">
          <div className="mb-4">
            <div className="text-xs text-white/60 mb-2">التقدّم: {doneCount}/{totalTasks}</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="mb-4">
            <div className="text-xs font-bold text-white/80 mb-2">المهام:</div>
            <ul className="space-y-1.5">
              {env.tasks?.map((t) => {
                const done = doneTasks.has(t.id);
                return (
                  <li key={t.id} className="text-xs">
                    <button
                      onClick={() => {
                        toggleTask(t.id);
                        if (t.targetScreen) goToScreen(t.targetScreen);
                      }}
                      className={`text-right w-full p-2 rounded border transition-colors ${
                        done ? "bg-green-500/10 border-green-500/30 text-green-200 line-through"
                             : "bg-white/5 border-white/10 text-white/85 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex gap-2 items-start">
                        <span className="shrink-0">{done ? "✓" : "○"}</span>
                        <span className="text-right">{t.description}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {env.hints && env.hints.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowHints((v) => !v)}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                {showHints ? "إخفاء" : "إظهار"} التلميحات ({env.hints.length})
              </button>
              {showHints && (
                <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
                  {env.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={() => setChatOpen((v) => !v)}
            className="w-full mt-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 rounded-lg p-2"
          >
            {chatOpen ? "إخفاء المساعد الذكي" : "💬 سؤال للمساعد الذكي"}
          </button>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          {screens.length > 1 && (
            <div className="border-b border-white/10 bg-black/20 px-3 overflow-x-auto">
              <div className="flex gap-1 py-2">
                {screens.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg whitespace-nowrap ${
                      activeId === s.id
                        ? "bg-cyan-500 text-slate-900 font-bold"
                        : "bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {s.icon && <span className="ml-1">{s.icon}</span>}
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {(Array.isArray(active?.components) ? active!.components : []).map((c, i) => (
              <ComponentRenderer key={i} comp={c} ctx={{ onGoToScreen: goToScreen, onAskAi: askAi }} />
            ))}
            {(!active || !Array.isArray(active.components) || active.components.length === 0) && (
              <div className="text-white/50 text-sm p-4">لا توجد عناصر في هذه الشاشة.</div>
            )}
          </div>
        </main>

        {chatOpen && (
          <aside className="w-80 border-r border-white/10 bg-black/40 flex flex-col shrink-0">
            <div className="p-3 border-b border-white/10 text-sm font-bold text-purple-300">
              المساعد الذكي 🤖
            </div>
            <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {assistMsgs.length === 0 && (
                <div className="text-white/50 text-xs">اطرح سؤالاً عن البيئة، الخطوات، أو الحلول الجزئية.</div>
              )}
              {assistMsgs.map((m, i) => (
                <div key={i} className={`p-2 rounded-lg ${m.role === "user" ? "bg-cyan-500/10 text-cyan-100" : "bg-white/5 text-white/90"}`}>
                  <div className="text-[10px] text-white/50 mb-1">{m.role === "user" ? "أنت" : "المساعد"}</div>
                  <div className="whitespace-pre-wrap">{m.content || (assistBusy && i === assistMsgs.length - 1 ? "…" : "")}</div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); askAi(assistInput); }}
              className="p-2 border-t border-white/10 flex gap-2"
            >
              <input
                value={assistInput}
                onChange={(e) => setAssistInput(e.target.value)}
                placeholder="اكتب سؤالك..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm"
                disabled={assistBusy}
              />
              <button
                type="submit"
                disabled={assistBusy || !assistInput.trim()}
                className="bg-purple-500 hover:bg-purple-400 disabled:bg-white/10 text-white rounded-lg px-3 text-sm"
              >
                إرسال
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
