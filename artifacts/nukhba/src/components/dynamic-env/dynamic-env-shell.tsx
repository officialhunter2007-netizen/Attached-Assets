import { useEffect, useMemo, useRef, useState } from "react";
import type { DynamicEnv } from "./types";
import { ComponentRenderer } from "./component-renderer";
import { EnvStateProvider, useEnvState } from "./state-engine";
import { useAuth } from "@/lib/auth-context";

type AssistMsg = { role: "user" | "assistant"; content: string };

export function DynamicEnvShell({
  env,
  subjectId,
  onClose,
  onSubmitToTeacher,
}: {
  env: DynamicEnv;
  subjectId: string;
  onClose?: () => void;
  onSubmitToTeacher?: (report: string, meta: { envTitle: string; envBriefing: string }) => void;
}) {
  const { user } = useAuth();
  // SECURITY: stable storage key includes user.id so two different accounts on
  // the same browser do NOT share env state. If user is not loaded, the
  // provider gets no storageKey and runs in memory only.
  const storageKey = useMemo(() => {
    if (!user?.id) return undefined;
    const slug = (env.title || "env").replace(/\s+/g, "-").slice(0, 60);
    return `nukhba::u:${user.id}::env-state::${subjectId}::${slug}`;
  }, [user?.id, subjectId, env.title]);

  return (
    <EnvStateProvider initialState={env.initialState || {}} storageKey={storageKey}>
      <DynamicEnvShellInner env={env} subjectId={subjectId} onClose={onClose} onSubmitToTeacher={onSubmitToTeacher} />
    </EnvStateProvider>
  );
}

function summarizeWorldState(state: any): string {
  if (!state || typeof state !== "object") return "(فارغة)";
  const lines: string[] = [];
  for (const [key, val] of Object.entries(state)) {
    if (Array.isArray(val)) {
      lines.push(`• ${key}: ${val.length} عنصر`);
    } else if (val && typeof val === "object") {
      const sub = Object.keys(val).slice(0, 4).join("، ");
      lines.push(`• ${key}: { ${sub}${Object.keys(val).length > 4 ? "…" : ""} }`);
    } else if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") {
      const s = String(val);
      lines.push(`• ${key}: ${s.length > 60 ? s.slice(0, 60) + "…" : s}`);
    }
  }
  return lines.slice(0, 12).join("\n") || "(لا توجد بيانات حية)";
}

function DynamicEnvShellInner({
  env,
  subjectId,
  onClose,
  onSubmitToTeacher,
}: {
  env: DynamicEnv;
  subjectId: string;
  onClose?: () => void;
  onSubmitToTeacher?: (report: string, meta: { envTitle: string; envBriefing: string }) => void;
}) {
  const envState = useEnvState();
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

  // MOBILE: side drawers replace permanent panels on small screens.
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  const buildReport = (notes: string): string => {
    const elapsedMin = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
    const doneList = (env.tasks || [])
      .filter((t) => doneTasks.has(t.id))
      .map((t) => `✓ ${t.description}`)
      .join("\n") || "(لم تُكمَل أي مهمة بعد)";
    const pendingList = (env.tasks || [])
      .filter((t) => !doneTasks.has(t.id))
      .map((t) => `○ ${t.description}`)
      .join("\n") || "(جميع المهام مكتملة)";
    const successList = Array.isArray((env as any).successCriteria) && (env as any).successCriteria.length
      ? `\n\nمعايير النجاح المعلنة:\n${(env as any).successCriteria.map((c: string) => `– ${c}`).join("\n")}`
      : "";
    const stateSnap = summarizeWorldState(envState.state);
    const userNotes = notes.trim() ? `\n\nملاحظاتي:\n${notes.trim()}` : "";
    return `[LAB_REPORT]
البيئة: ${env.title}
الوصف: ${env.briefing || "—"}
المدة المستغرقة: ${elapsedMin} دقيقة
المهام: ${doneCount}/${totalTasks} مكتملة

ما أنجزتُه:
${doneList}

ما تبقّى:
${pendingList}${successList}

ملخّص حالة البيئة:
${stateSnap}${userNotes}`;
  };

  const handleSubmitToTeacher = () => {
    if (!onSubmitToTeacher) return;
    const report = buildReport(extraNotes);
    onSubmitToTeacher(report, { envTitle: env.title || "", envBriefing: env.briefing || "" });
    setShowSubmitDialog(false);
    setShowCloseConfirm(false);
    setExtraNotes("");
  };

  const handleCloseClick = () => {
    if (onSubmitToTeacher && doneCount > 0) {
      setShowCloseConfirm(true);
    } else {
      onClose?.();
    }
  };

  // When a task button is tapped on mobile we want the drawer to close so the
  // user lands on the matching screen.
  const handleTaskTap = (id: string, target?: string) => {
    toggleTask(id);
    if (target) goToScreen(target);
    setTasksDrawerOpen(false);
  };

  return (
    <div className="bg-slate-950 text-white md:rounded-xl md:border border-white/10 overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
      <div className="bg-gradient-to-l from-cyan-600/20 to-purple-600/20 p-3 md:p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-xl font-bold text-white truncate">{env.title}</h2>
            <p className="text-xs md:text-sm text-white/75 mt-1 line-clamp-2 md:line-clamp-none">{env.briefing}</p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button
              onClick={() => {
                if (window.confirm("هل تريد إعادة البيئة لحالتها الأولية؟ سيتم حذف جميع البيانات التي أدخلتها.")) {
                  envState.reset();
                }
              }}
              className="text-white/60 hover:text-white text-[11px] md:text-xs px-2 md:px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              title="إعادة ضبط البيئة"
            >
              ↻
              <span className="hidden md:inline mr-1">إعادة ضبط</span>
            </button>
            {onSubmitToTeacher && (
              <button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-[11px] md:text-xs px-2.5 md:px-3.5 py-1 md:py-1.5 rounded shadow-lg shadow-emerald-500/20 flex items-center gap-1"
                title="إنهاء البيئة وإرسال تقرير للمعلم"
              >
                <span>📤</span>
                <span className="hidden sm:inline">إرسال للمعلم</span>
                <span className="sm:hidden">للمعلم</span>
              </button>
            )}
            {onClose && (
              <button
                onClick={handleCloseClick}
                className="text-white/60 hover:text-white text-xs md:text-sm px-2 md:px-3 py-1 rounded bg-white/5 hover:bg-white/10"
              >
                ✕
                <span className="hidden md:inline mr-1">إغلاق</span>
              </button>
            )}
          </div>
        </div>
        {Array.isArray((env as any).successCriteria) && (env as any).successCriteria.length > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
            <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1">
              <span>🎯</span> معايير النجاح في هذه البيئة:
            </div>
            <ul className="list-disc list-inside text-[11px] md:text-xs text-emerald-100/80 space-y-0.5">
              {(env as any).successCriteria.slice(0, 5).map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {env.objectives?.length > 0 && (
          <div className="mt-3">
            {/* On mobile: collapsible. On desktop: always shown. */}
            <button
              onClick={() => setObjectivesOpen((v) => !v)}
              className="md:hidden text-xs text-white/70 flex items-center gap-1"
            >
              {objectivesOpen ? "▼" : "◀"} الأهداف ({env.objectives.length})
            </button>
            <div className="hidden md:block text-xs text-white/60 mb-1">الأهداف:</div>
            <ul className={`${objectivesOpen ? "block" : "hidden"} md:block list-disc list-inside text-xs md:text-sm text-white/85 space-y-0.5 mt-1`}>
              {env.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Mobile toolbar: progress + drawer toggles. Hidden on md+ */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-black/30 border-b border-white/10">
        <button
          onClick={() => setTasksDrawerOpen(true)}
          className="flex-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1.5 text-right flex items-center justify-between gap-2"
        >
          <span className="text-white/85">📋 المهام {totalTasks > 0 && `(${doneCount}/${totalTasks})`}</span>
          {totalTasks > 0 && (
            <span className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
              <span className="block h-full bg-cyan-500" style={{ width: `${progress}%` }} />
            </span>
          )}
        </button>
        <button
          onClick={() => setChatOpen(true)}
          className="text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 rounded-lg px-3 py-1.5"
        >
          💬 المساعد
        </button>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Tasks/hints panel — desktop: permanent sidebar. Mobile: drawer overlay. */}
        {tasksDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-[80] bg-black/60"
            onClick={() => setTasksDrawerOpen(false)}
          />
        )}
        <aside
          className={`${tasksDrawerOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
            md:relative md:translate-x-0
            fixed md:static top-0 right-0 bottom-0 z-[81] md:z-auto
            w-[85%] max-w-xs md:w-72
            border-l border-white/10 bg-slate-950 md:bg-black/30 p-3 overflow-y-auto shrink-0
            transition-transform duration-200`}
        >
          {/* Mobile-only drawer header with close */}
          <div className="md:hidden flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="text-sm font-bold text-white">المهام والتلميحات</span>
            <button onClick={() => setTasksDrawerOpen(false)} className="text-white/60 hover:text-white text-xl leading-none">×</button>
          </div>
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
                      onClick={() => handleTaskTap(t.id, t.targetScreen)}
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
            onClick={() => { setChatOpen((v) => !v); setTasksDrawerOpen(false); }}
            className="hidden md:block w-full mt-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 rounded-lg p-2"
          >
            {chatOpen ? "إخفاء المساعد الذكي" : "💬 سؤال للمساعد الذكي"}
          </button>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          {screens.length > 1 && (
            <div className="border-b border-white/10 bg-black/20 px-2 md:px-3 overflow-x-auto">
              <div className="flex gap-1 py-2">
                {screens.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`text-xs md:text-sm px-2.5 md:px-3 py-1.5 rounded-lg whitespace-nowrap ${
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
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {(Array.isArray(active?.components) ? active!.components : []).map((c, i) => (
              <ComponentRenderer key={i} comp={c} ctx={{ onGoToScreen: goToScreen, onAskAi: askAi }} />
            ))}
            {(!active || !Array.isArray(active.components) || active.components.length === 0) && (
              <div className="text-white/50 text-sm p-4">لا توجد عناصر في هذه الشاشة.</div>
            )}
          </div>
        </main>

        {/* Chat panel — desktop: side panel. Mobile: full-screen drawer. */}
        {chatOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-[80] bg-black/60" onClick={() => setChatOpen(false)} />
            <aside className="fixed md:static inset-y-0 left-0 md:inset-auto z-[81] md:z-auto w-[92%] max-w-sm md:w-80 border-r border-white/10 bg-slate-950 md:bg-black/40 flex flex-col shrink-0">
              <div className="p-3 border-b border-white/10 text-sm font-bold text-purple-300 flex items-center justify-between">
                <span>المساعد الذكي 🤖</span>
                <button onClick={() => setChatOpen(false)} className="text-white/60 hover:text-white text-xl leading-none md:hidden">×</button>
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
          </>
        )}
      </div>

      {/* Submit-to-teacher dialog */}
      {showSubmitDialog && onSubmitToTeacher && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-xl">📤</div>
              <div>
                <h3 className="text-base font-bold text-white">إرسال تقرير العمل للمعلم</h3>
                <p className="text-xs text-white/60 mt-1">سيستلم المعلم ملخصاً تلقائياً عن البيئة، المهام المنجزة ({doneCount}/{totalTasks})، والمدة المستغرقة، ثم يعطيك ملاحظاته.</p>
              </div>
            </div>
            <label className="text-xs text-white/70 mb-1 block">ملاحظاتك للمعلم (اختياري):</label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="مثلاً: واجهت صعوبة في الخطوة الثالثة، أو: أريد تعليقك على القيد الذي أدخلته..."
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 min-h-[80px] resize-y mb-4"
              dir="rtl"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSubmitDialog(false)}
                className="text-white/70 hover:text-white text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitToTeacher}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-5 py-2 rounded-lg shadow-lg shadow-emerald-500/20"
              >
                إرسال التقرير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close-confirm prompt: offer the user to send a report instead of just closing */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-xl">💡</div>
              <div>
                <h3 className="text-base font-bold text-white">قبل أن تغلق…</h3>
                <p className="text-xs text-white/70 mt-1">أنجزت {doneCount} من {totalTasks} مهام. هل تريد أن يراجع المعلم عملك ويعطيك ملاحظات؟</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowCloseConfirm(false); setShowSubmitDialog(true); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-lg shadow-lg shadow-emerald-500/20"
              >
                نعم، أرسل التقرير للمعلم
              </button>
              <button
                onClick={() => { setShowCloseConfirm(false); onClose?.(); }}
                className="text-white/70 hover:text-white text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
              >
                إغلاق فقط (يمكنك العودة لاحقاً)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
