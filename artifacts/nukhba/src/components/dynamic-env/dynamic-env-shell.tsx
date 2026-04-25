import { useEffect, useMemo, useRef, useState } from "react";
import type { DynamicEnv } from "./types";
import { ComponentRenderer } from "./component-renderer";
import { EnvStateProvider, useEnvState } from "./state-engine";
import { EnvThemeProvider, themeForKind, themeCssVars, KIND_THEMES } from "./theme";
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

  // Pick a theme: explicit env.theme wins, else map by env.kind. Falls back
  // to the neutral cyan "generic" theme if neither matches.
  const theme = useMemo(() => {
    const explicit = env.theme && KIND_THEMES[env.theme] ? KIND_THEMES[env.theme] : null;
    return explicit || themeForKind(env.kind);
  }, [env.theme, env.kind]);

  return (
    <EnvThemeProvider theme={theme}>
      <EnvStateProvider initialState={env.initialState || {}} storageKey={storageKey}>
        <DynamicEnvShellInner env={env} subjectId={subjectId} onClose={onClose} onSubmitToTeacher={onSubmitToTeacher} />
      </EnvStateProvider>
    </EnvThemeProvider>
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
  const theme = useMemo(() => {
    const explicit = env.theme && KIND_THEMES[env.theme] ? KIND_THEMES[env.theme] : null;
    return explicit || themeForKind(env.kind);
  }, [env.theme, env.kind]);
  const screens = env.screens || [];
  const [activeId, setActiveId] = useState<string>(screens[0]?.id || "");
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [assistMsgs, setAssistMsgs] = useState<AssistMsg[]>([]);
  const [assistInput, setAssistInput] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  // Lightweight motivation: an ephemeral banner that appears for ~5s after
  // a task is checked off. Holds a friendly message + an optional fun fact.
  const [pulse, setPulse] = useState<{ msg: string; fact?: string; key: number } | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => screens.find((s) => s.id === activeId) || screens[0], [screens, activeId]);

  // Extract the first conceptCard from any screen so we can surface its
  // single-line "idea" in the header as a quick-glance "زاوية الفكرة"
  // anchor — the student sees the core idea even before scrolling.
  const headerIdea = useMemo<string | undefined>(() => {
    for (const s of screens) {
      const c = (s.components || []).find((x: any) => x?.type === "conceptCard" && typeof x?.idea === "string" && x.idea.trim());
      if (c) return String((c as any).idea).trim();
    }
    return undefined;
  }, [screens]);

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

    // Pick the first not-yet-done task as "current task" so the AI
    // assistant stays anchored on what the student is supposed to do now.
    const currentTask = (env.tasks || []).find((t) => !doneTasks.has(t.id));
    // Send only a compact summary of the world state (full state can be huge).
    const worldStateSummary = summarizeWorldState(envState.state);
    // Last few assistant↔user turns inside the lab give continuity.
    const recentHistory = assistMsgs.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    // The very last state mutation, summarized so the AI can answer
    // "ماذا حدث للتو؟" / "لماذا تغيّرت هذه القيمة؟"
    const lm = envState.lastMutation;
    const lastMutation = lm
      ? {
          ops: (lm.ops || []).slice(0, 6).map((o: any) => ({
            action: o?.action,
            path: o?.path,
            value: typeof o?.value === "object" ? JSON.stringify(o.value).slice(0, 160) : o?.value,
          })),
          form: lm.form ? Object.fromEntries(Object.entries(lm.form).slice(0, 8)) : undefined,
          ageSeconds: Math.round((Date.now() - lm.at) / 1000),
        }
      : null;
    // Latest console output from any sandboxed webApp/browser iframe so the
    // AI can debug user code or explain runtime errors live.
    const consoleOutput = (envState.consoleLog || [])
      .slice(-12)
      .map((e: any) => `[${e.level}] ${e.text}`)
      .join("\n");

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
          worldStateSummary,
          currentTask: currentTask
            ? { id: currentTask.id, description: currentTask.description, targetScreen: currentTask.targetScreen, hint: currentTask.hint }
            : undefined,
          history: recentHistory,
          lastMutation,
          consoleOutput: consoleOutput || undefined,
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

  // Built-in motivational lines, picked per subject kind so they "feel"
  // local and relevant. Used when env.encouragement is not provided.
  const DEFAULT_ENCOURAGE: Record<string, string[]> = {
    cybersecurity: ["خطوة جيدة، أيها المخترق الأخلاقي 🥷", "كل ثغرة تكتشفها تحمي مستخدماً حقيقياً", "الأناة في التحقيق نصف النجاح"],
    "web-pentest": ["payload فعّالة! تابع التحقق من الأثر", "كل طلب HTTP قصة كاملة — اقرأها بهدوء"],
    forensics: ["دليل جديد في الملف! وثّقه قبل أن تنساه", "العين المتأنية ترى ما لا يراه الآخرون"],
    networking: ["الحزمة وصلت! تتبّع المسار للنهاية", "كل بروتوكول له لغة — وأنت تتعلّمها"],
    os: ["أمر ناجح في الطرفية ✓", "السيطرة على الصدفة = السيطرة على النظام"],
    programming: ["الكود يعمل! جرّب حالة حافة الآن", "كل bug تصلحه = خبرة تتراكم"],
    "data-science": ["استنتاج جيد من البيانات", "الرسم يكشف ما لا تكشفه الأرقام"],
    business: ["قرار مدروس ✓", "كل مؤشر يحكي قصة — استمع لها"],
    physics: ["معادلة محلولة بدقة", "الفيزياء تفسّر العالم — وأنت تفهمها"],
    language: ["جملة سليمة 100%", "كل قاعدة تتقنها = طلاقة أكبر"],
    food: ["معايير الجودة محققة ✓", "السلامة الغذائية حماية للناس"],
    accounting: ["قيد متوازن 🌟", "الميزان لا يكذب — وأنت أتقنته"],
    yemensoft: ["عملية تم ترحيلها بنجاح", "نظام يمن سوفت يكافئ الدقة"],
    generic: ["خطوة ممتازة!", "كل مهمة تنجزها = مستوى جديد"],
  };

  const pickEncouragement = (): { msg: string; fact?: string } => {
    const list = (env.encouragement && env.encouragement.length > 0)
      ? env.encouragement
      : (DEFAULT_ENCOURAGE[String(env.kind || "generic")] || DEFAULT_ENCOURAGE.generic);
    const msg = list[Math.floor(Math.random() * list.length)];
    const facts = env.funFacts || [];
    const fact = facts.length > 0 ? facts[Math.floor(Math.random() * facts.length)] : undefined;
    return { msg, fact };
  };

  // Streak counter — counts CONSECUTIVE task completions in this session
  // (not unchecks). Reaching the 25%/50%/75%/100% mark of total tasks fires
  // a quarter-medal in addition to the regular encouragement banner.
  const [streak, setStreak] = useState(0);
  const [medal, setMedal] = useState<{ pct: number; key: number } | null>(null);
  const lastQuarterRef = useRef<number>(0);

  const toggleTask = (id: string) => {
    setDoneTasks((p) => {
      const had = p.has(id);
      const n = new Set(p);
      if (had) n.delete(id); else n.add(id);
      // Only celebrate when going from undone → done (not when un-checking).
      if (!had) {
        setStreak((s) => s + 1);
        const { msg, fact } = pickEncouragement();
        setPulse({ msg, fact, key: Date.now() });
        const total = env.tasks?.length || 0;
        if (total > 0) {
          const newDone = n.size;
          const pct = Math.floor((newDone / total) * 100);
          const quarter = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
          if (quarter > 0 && quarter > lastQuarterRef.current) {
            lastQuarterRef.current = quarter;
            setMedal({ pct: quarter, key: Date.now() });
          }
        }
      } else {
        // Un-checking breaks the streak.
        setStreak(0);
      }
      return n;
    });
  };

  // Auto-dismiss the medal after 4s.
  useEffect(() => {
    if (!medal) return;
    const t = setTimeout(() => setMedal((cur) => (cur && cur.key === medal.key ? null : cur)), 4000);
    return () => clearTimeout(t);
  }, [medal]);

  // Auto-dismiss the celebratory banner.
  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse((cur) => (cur && cur.key === pulse.key ? null : cur)), 5500);
    return () => clearTimeout(t);
  }, [pulse]);

  const totalTasks = env.tasks?.length || 0;
  const doneCount = doneTasks.size;
  const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // MOBILE: side drawers replace permanent panels on small screens.
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  // DESKTOP: the right tasks aside can be collapsed to free horizontal space
  // when the user wants to focus on the screen content. Persisted in memory only.
  const [tasksAsideCollapsed, setTasksAsideCollapsed] = useState(false);
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
    <div
      className="bg-gradient-to-b from-slate-950 to-slate-900 text-white md:rounded-2xl md:border border-white/10 overflow-hidden flex flex-col shadow-2xl"
      style={{ minHeight: 600, ...themeCssVars(theme) }}
    >
      <style>{`@keyframes envPulse{0%{opacity:0;transform:translateY(-4px) scale(0.98)}60%{opacity:1;transform:translateY(0) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        className="relative p-4 md:p-5 border-b border-white/10"
        style={{ background: `linear-gradient(105deg, ${theme.gradFrom}, rgba(2,6,23,0.55) 55%, ${theme.gradFrom})` }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: theme.bgRadial }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: theme.accentSoft, border: `1px solid ${theme.accentBorder}`, color: theme.accentText }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: theme.accent }} />
                {theme.label}
              </span>
              {totalTasks > 0 && (
                <span className="text-[10px] text-white/50 font-medium">{doneCount}/{totalTasks} مهمة</span>
              )}
            </div>
            <h2 className="text-lg md:text-2xl font-black text-white tracking-tight leading-tight">{env.title}</h2>
            <p className="text-xs md:text-sm text-white/70 mt-2 leading-relaxed line-clamp-3 md:line-clamp-none whitespace-pre-line">{env.briefing}</p>
            {/* "زاوية الفكرة" — quick-glance core idea pulled from the first conceptCard. */}
            {headerIdea && (
              <div className="mt-3 flex items-start gap-2 rounded-lg p-2"
                style={{ background: theme.accentSoft, border: `1px solid ${theme.accentBorder}` }}>
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: theme.accent, color: theme.primaryBtnText }}>الفكرة</span>
                <span className="text-[12px] md:text-sm leading-relaxed text-white/90 min-w-0 flex-1">{headerIdea}</span>
                <button
                  onClick={() => askAi(`اشرح لي هذه الفكرة بمثال من الحياة اليومية، بأسلوب بسيط ومختصر:\n"${headerIdea}"`)}
                  className="text-[11px] font-bold rounded px-2 py-1 shrink-0 transition-opacity hover:opacity-90 min-h-[32px]"
                  style={{ background: theme.primaryBtnBg, color: theme.primaryBtnText }}
                  title="اطلب من المعلم الذكي أن يشرحها بمثال يومي"
                >اشرح بمثال يومي</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button
              onClick={() => {
                if (window.confirm("هل تريد إعادة البيئة لحالتها الأولية؟ سيتم حذف جميع البيانات التي أدخلتها.")) {
                  envState.reset();
                }
              }}
              className="text-white/60 hover:text-white text-[11px] md:text-xs px-2.5 md:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="إعادة ضبط البيئة"
            >
              ↻
              <span className="hidden md:inline mr-1">إعادة ضبط</span>
            </button>
            {onSubmitToTeacher && (
              <button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-gradient-to-l from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-900 font-bold text-[11px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-lg shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
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
                className="text-white/60 hover:text-white text-xs md:text-sm px-2.5 md:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                ✕
                <span className="hidden md:inline mr-1">إغلاق</span>
              </button>
            )}
          </div>
        </div>

        {totalTasks > 0 && (
          <div className="relative mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentText})`,
                boxShadow: `0 0 12px ${theme.accentBorder}`,
              }}
            />
          </div>
        )}

        {/* Quarter medal — appears briefly when the student crosses 25/50/75/100%. */}
        {medal && (
          <div
            key={medal.key}
            className="relative mt-3 rounded-xl p-3 flex items-center gap-3"
            style={{
              background: `linear-gradient(90deg, ${theme.accentSoft}, transparent)`,
              border: `2px solid ${theme.accentBorder}`,
              animation: "envPulse 0.7s ease-out",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shrink-0"
              style={{ background: theme.accent, color: theme.primaryBtnText, boxShadow: `0 0 16px ${theme.accentBorder}` }}
            >
              {medal.pct === 100 ? "🏆" : medal.pct === 75 ? "🥇" : medal.pct === 50 ? "🥈" : "🥉"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black" style={{ color: theme.accentText }}>
                {medal.pct === 100 ? "أنهيت البيئة بالكامل!" : `أنجزت ${medal.pct}% — استمر!`}
              </div>
              {streak > 1 && (
                <div className="text-[11px] text-white/70 mt-0.5">سلسلة متتالية: {streak} مهام بدون توقف 🔥</div>
              )}
            </div>
            <button
              onClick={() => setMedal(null)}
              className="text-white/50 hover:text-white text-xs shrink-0"
              aria-label="إغلاق الميدالية"
            >×</button>
          </div>
        )}

        {/* Ephemeral encouragement banner — appears briefly when a task is
            ticked off. Built into the header so it does not push layout. */}
        {pulse && (
          <div
            key={pulse.key}
            className="relative mt-3 rounded-xl p-2.5 flex items-start gap-2.5"
            style={{
              background: `linear-gradient(90deg, ${theme.accentSoft}, transparent 80%)`,
              border: `1px solid ${theme.accentBorder}`,
              animation: "envPulse 0.6s ease-out",
            }}
          >
            <span className="text-xl shrink-0">🎉</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold" style={{ color: theme.accentText }}>{pulse.msg}</div>
              {pulse.fact && <div className="text-[11px] text-white/70 mt-0.5 leading-snug">معلومة سريعة: {pulse.fact}</div>}
            </div>
            <button
              onClick={() => setPulse(null)}
              className="text-white/50 hover:text-white text-xs shrink-0"
              aria-label="إغلاق الإشعار"
            >×</button>
          </div>
        )}

        <div className="relative grid md:grid-cols-2 gap-2.5 mt-4">
          {Array.isArray((env as any).successCriteria) && (env as any).successCriteria.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3.5 py-2.5 backdrop-blur-sm">
              <div className="text-[11px] font-black text-emerald-300 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                <span>🎯</span> معايير النجاح
              </div>
              <ul className="text-[11px] md:text-xs text-emerald-50/85 space-y-1">
                {(env as any).successCriteria.slice(0, 5).map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400/70 shrink-0 mt-0.5">▸</span>
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {env.objectives?.length > 0 && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-3.5 py-2.5 backdrop-blur-sm">
              <button
                onClick={() => setObjectivesOpen((v) => !v)}
                className="md:hidden text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1 w-full justify-between"
              >
                <span className="flex items-center gap-1.5"><span>📌</span> الأهداف ({env.objectives.length})</span>
                <span>{objectivesOpen ? "▼" : "◀"}</span>
              </button>
              <div className="hidden md:flex text-[11px] font-black text-cyan-300 mb-1.5 items-center gap-1.5 uppercase tracking-wider">
                <span>📌</span> الأهداف
              </div>
              <ul className={`${objectivesOpen ? "block" : "hidden"} md:block text-[11px] md:text-xs text-cyan-50/85 space-y-1 mt-1.5 md:mt-0`}>
                {env.objectives.map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-cyan-400/70 shrink-0 mt-0.5">▸</span>
                    <span className="leading-relaxed">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
        {/* Tasks/hints panel — desktop: collapsible sidebar. Mobile: drawer overlay. */}
        {tasksDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-[80] bg-black/60"
            onClick={() => setTasksDrawerOpen(false)}
          />
        )}
        {/* Desktop collapsed strip — clickable column to re-open */}
        {tasksAsideCollapsed && (
          <button
            onClick={() => setTasksAsideCollapsed(false)}
            className="hidden md:flex flex-col items-center gap-3 shrink-0 w-10 border-l border-white/10 bg-black/30 hover:bg-white/5 transition-colors py-3 group"
            title="إظهار لوحة المهام"
          >
            <span className="text-white/40 group-hover:text-cyan-300 text-lg">‹</span>
            <span
              className="text-[10px] font-bold text-white/50 group-hover:text-cyan-300 tracking-wider"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              المهام {totalTasks > 0 && `${doneCount}/${totalTasks}`}
            </span>
          </button>
        )}
        <aside
          className={`${tasksDrawerOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
            ${tasksAsideCollapsed ? "md:hidden" : "md:flex"}
            md:relative md:translate-x-0 md:flex-col
            fixed md:static top-0 right-0 bottom-0 z-[81] md:z-auto
            w-[88%] max-w-sm md:w-[19rem]
            border-l border-white/10 bg-slate-950 md:bg-black/30 p-3 overflow-y-auto shrink-0
            transition-transform duration-200`}
        >
          {/* Mobile drawer header / desktop collapse button */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="text-sm font-bold text-white">المهام والتلميحات</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTasksAsideCollapsed(true)}
                className="hidden md:inline-flex text-white/50 hover:text-cyan-300 text-base leading-none w-7 h-7 items-center justify-center rounded-md hover:bg-white/5"
                title="إخفاء اللوحة"
              >
                ›
              </button>
              <button
                onClick={() => setTasksDrawerOpen(false)}
                className="md:hidden text-white/60 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
          </div>
          <div className="mb-4 rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black text-white/80 uppercase tracking-wider">التقدّم</span>
              <span className="text-[11px] text-cyan-300 font-mono tabular-nums">{doneCount}<span className="text-white/30">/{totalTasks}</span></span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]" style={{ width: `${progress}%` }} />
            </div>
            {progress === 100 && (
              <div className="mt-2 text-[10px] text-emerald-300 flex items-center gap-1">
                <span>🎉</span> أتممت كل المهام! أرسل تقريرك للمعلم.
              </div>
            )}
          </div>
          <div className="mb-4">
            <div className="text-[11px] font-black text-white/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>📋</span> قائمة المهام
            </div>
            <ol className="space-y-1.5">
              {env.tasks?.map((t, idx) => {
                const done = doneTasks.has(t.id);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => handleTaskTap(t.id, t.targetScreen)}
                      className={`text-right w-full p-2.5 rounded-lg border transition-all group ${
                        done
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-100"
                          : "bg-white/[0.03] border-white/10 text-white/85 hover:bg-white/[0.07] hover:border-white/20"
                      }`}
                    >
                      <div className="flex gap-2.5 items-start">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                          done
                            ? "bg-emerald-500 border-emerald-400 text-slate-900"
                            : "bg-white/5 border-white/20 text-white/50 group-hover:border-cyan-400/50 group-hover:text-cyan-300"
                        }`}>
                          {done ? "✓" : idx + 1}
                        </span>
                        <span className={`text-[12px] leading-snug ${done ? "line-through opacity-70" : ""}`}>{t.description}</span>
                      </div>
                      {t.hint && !done && (
                        <div className="mt-1.5 mr-7 text-[10px] text-white/40 italic">💡 {t.hint}</div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
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
            <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/85 backdrop-blur-md px-2 md:px-4 py-3">
              {/* Stepper rail — shows linear progression with connector line */}
              <div className="flex items-center gap-0 overflow-x-auto pb-1">
                {screens.map((s, idx) => {
                  const isActive = activeId === s.id;
                  const activeIdx = screens.findIndex((x) => x.id === activeId);
                  const isPast = idx < activeIdx;
                  const isLast = idx === screens.length - 1;
                  return (
                    <div key={s.id} className="flex items-center shrink-0">
                      <button
                        onClick={() => setActiveId(s.id)}
                        className={`group flex flex-col items-center gap-1.5 px-2 transition-all ${isActive ? "" : "opacity-80 hover:opacity-100"}`}
                        title={s.title}
                      >
                        <div className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-cyan-400 to-cyan-500 border-cyan-300 text-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110"
                            : isPast
                              ? "bg-emerald-500/15 border-emerald-400/60 text-emerald-300"
                              : "bg-white/[0.04] border-white/15 text-white/50 group-hover:border-white/30 group-hover:text-white/80"
                        }`}>
                          {isPast ? "✓" : (s.icon || (idx + 1))}
                          {isActive && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <span className={`text-[10px] md:text-[11px] font-bold whitespace-nowrap max-w-[120px] md:max-w-[180px] truncate ${
                          isActive ? "text-cyan-300" : isPast ? "text-emerald-300/70" : "text-white/45"
                        }`}>
                          {s.title.replace(/^[\p{Emoji}\s]+/u, "")}
                        </span>
                      </button>
                      {!isLast && (
                        <div className={`h-0.5 w-6 md:w-10 rounded-full transition-colors ${
                          isPast ? "bg-emerald-400/50" : "bg-white/10"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Breadcrumb line */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
                <div className="text-white/50 flex items-center gap-1.5">
                  <span className="font-mono text-cyan-400/70">
                    الخطوة {Math.max(1, screens.findIndex((x) => x.id === activeId) + 1)}/{screens.length}
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/80 font-bold truncate">{active?.title}</span>
                </div>
                {(() => {
                  const screenTasks = (env.tasks || []).filter((t) => t.targetScreen === activeId);
                  if (screenTasks.length === 0) return null;
                  const doneOnScreen = screenTasks.filter((t) => doneTasks.has(t.id)).length;
                  return (
                    <span className="text-[10px] text-white/40">
                      مهام هذه الشاشة: <span className="text-cyan-300 font-bold">{doneOnScreen}/{screenTasks.length}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 md:p-5 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.02),transparent_50%)]">
            <div className="max-w-5xl mx-auto space-y-3 md:space-y-4">
              {/* Per-screen "اشرح هذه الخطوة" affordance — opens the assistant
                  pre-filled with the current screen + active task context. */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const t = (env.tasks || []).find((x) => !doneTasks.has(x.id) && x.targetScreen === activeId)
                      || (env.tasks || []).find((x) => !doneTasks.has(x.id));
                    const screenName = active?.title || "هذه الشاشة";
                    const taskPart = t ? ` ومهمتي الحالية: «${t.description}»` : "";
                    askAi(`اشرح لي هذه الخطوة (${screenName})${taskPart} — ماذا أفعل بالضبط، ولماذا، وما النتيجة المتوقعة؟`);
                  }}
                  className="text-[11px] md:text-xs font-bold rounded-full px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/30 text-purple-200 hover:text-purple-100 transition-colors flex items-center gap-1.5"
                  title="افتح المساعد لشرح هذه الخطوة"
                >
                  <span>💡</span>
                  <span>اشرح هذه الخطوة</span>
                </button>
              </div>

              {/* Tasks for this screen — inline call-to-action card.
                  On desktop, hide when the right tasks aside is visible to
                  avoid showing the same tasks twice. */}
              {(() => {
                const screenTasks = (env.tasks || []).filter((t) => t.targetScreen === activeId);
                if (screenTasks.length === 0) return null;
                const pending = screenTasks.filter((t) => !doneTasks.has(t.id));
                if (pending.length === 0) {
                  return (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-emerald-200">أتممتَ كل مهام هذه الشاشة</div>
                        <div className="text-[11px] text-emerald-100/70">انتقل للخطوة التالية لمواصلة التقدّم.</div>
                      </div>
                    </div>
                  );
                }
                const hideOnDesktop = !tasksAsideCollapsed;
                return (
                  <div className={`${hideOnDesktop ? "md:hidden" : ""} rounded-xl border border-cyan-500/25 bg-gradient-to-l from-cyan-500/[0.06] to-transparent px-3 py-3 sm:px-4`}>
                    <div className="text-[11px] font-black text-cyan-300 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <span>🎯</span> مهام هذه الشاشة ({pending.length})
                    </div>
                    <ul className="space-y-2">
                      {pending.map((t) => (
                        <li key={t.id}>
                          <button
                            onClick={() => toggleTask(t.id)}
                            className="group w-full text-right flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/5 hover:border-cyan-400/30 transition-colors min-h-[44px]"
                            title="ضع علامة منجَزة"
                          >
                            <span className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-white/30 group-hover:border-cyan-400 group-hover:bg-cyan-400/10 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] text-white/85 leading-snug">{t.description}</div>
                              {t.hint && <div className="text-[11px] text-white/45 mt-1">💡 {t.hint}</div>}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {(Array.isArray(active?.components) ? active!.components : []).map((c, i) => (
                <ComponentRenderer key={i} comp={c} ctx={{ onGoToScreen: goToScreen, onAskAi: askAi }} />
              ))}
              {(!active || !Array.isArray(active.components) || active.components.length === 0) && (
                <div className="text-white/40 text-sm p-8 text-center border border-dashed border-white/10 rounded-2xl">
                  لا توجد عناصر في هذه الشاشة بعد.
                </div>
              )}
            </div>
          </div>

          {/* Sticky prev/next nav footer */}
          {screens.length > 1 && (() => {
            const idx = screens.findIndex((x) => x.id === activeId);
            const prev = idx > 0 ? screens[idx - 1] : null;
            const next = idx < screens.length - 1 ? screens[idx + 1] : null;
            return (
              <div className="border-t border-white/10 bg-slate-950/80 backdrop-blur-md px-3 py-2.5 flex items-center justify-between gap-2">
                <button
                  onClick={() => prev && setActiveId(prev.id)}
                  disabled={!prev}
                  className={`text-xs md:text-sm font-bold rounded-lg px-3 md:px-4 py-2 transition-all flex items-center gap-2 ${
                    prev
                      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white/85"
                      : "bg-white/[0.02] border border-white/5 text-white/25 cursor-not-allowed"
                  }`}
                >
                  <span>→</span>
                  <span className="hidden sm:inline truncate max-w-[140px]">{prev ? prev.title.replace(/^[\p{Emoji}\s]+/u, "") : "السابق"}</span>
                  <span className="sm:hidden">السابق</span>
                </button>

                <div className="text-[11px] text-white/40 font-mono tabular-nums hidden md:block">
                  {idx + 1} / {screens.length}
                </div>

                <button
                  onClick={() => {
                    if (next) {
                      setActiveId(next.id);
                    } else {
                      // Last screen: finish the session and close the dialog
                      onClose?.();
                    }
                  }}
                  className={`text-xs md:text-sm font-bold rounded-lg px-3 md:px-4 py-2 transition-all flex items-center gap-2 ${
                    next
                      ? "bg-gradient-to-l from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 shadow-lg shadow-cyan-500/20"
                      : "bg-gradient-to-l from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-900 shadow-lg shadow-emerald-500/20"
                  }`}
                  title={next ? "الانتقال للخطوة التالية" : "إنهاء الجلسة وإغلاق المختبر"}
                >
                  <span className="sm:hidden">{next ? "التالي" : "إنهاء"}</span>
                  <span className="hidden sm:inline truncate max-w-[160px]">{next ? next.title.replace(/^[\p{Emoji}\s]+/u, "") : "إنهاء الجلسة"}</span>
                  <span>{next ? "←" : "✓"}</span>
                </button>
              </div>
            );
          })()}
        </main>

        {/* Chat panel — always an overlay drawer (mobile + desktop) so it
            never competes with the screen content for horizontal space. */}
        {chatOpen && (
          <>
            <div className="fixed inset-0 z-[80] bg-black/60" onClick={() => setChatOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-[81] w-[92%] max-w-sm md:w-96 border-r border-white/10 bg-slate-950 flex flex-col shadow-2xl">
              <div className="p-3 border-b border-white/10 text-sm font-bold text-purple-300 flex items-center justify-between">
                <span>المساعد الذكي 🤖</span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-white/60 hover:text-white text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-md hover:bg-white/10"
                  aria-label="إغلاق المساعد"
                >
                  ×
                </button>
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
            {/* Subject-specific suggested prompts. The set is chosen from
                env.kind so each subject gets a relevant starting point. */}
            {(() => {
              const k = String(env.kind || "generic");
              const SUGGESTIONS: Record<string, string[]> = {
                cybersecurity: ["كيف أبدأ هذه البيئة؟", "اشرح الثغرة الموجودة هنا", "ما الخطوة التالية بعد ما فعلتُه للتو؟", "كيف أُثبت أن الهجوم نجح؟"],
                "web-pentest": ["ما نوع الثغرة في هذه الصفحة؟", "أعطني payload مناسبة (تعليمياً)", "كيف أقرأ ردّ الخادم؟", "كيف أحمي هذا التطبيق لاحقاً؟"],
                forensics: ["ما الذي تشير إليه هذه السجلات؟", "ما الدليل الأهم هنا؟", "اشرح الـ timeline", "ماذا أكتب في التقرير؟"],
                networking: ["اشرح هذه الحزمة", "ما البروتوكول المستخدم؟", "ما الخطأ في الإعدادات؟", "كيف أتحقق من الاتصال؟"],
                os: ["اشرح الأمر الأخير", "كيف أنفّذ هذه المهمة عبر الطرفية؟", "ما الفرق بين الصلاحيات هنا؟", "كيف أرى العمليات النشطة؟"],
                programming: ["لماذا فشل الكود؟", "اشرح الخطأ في الكونسول", "اقترح إصلاحاً", "ما تحسينات الأداء الممكنة؟"],
                "data-science": ["ماذا يعني هذا الرسم؟", "ما القيمة الشاذة؟", "اقترح تحويلاً مناسباً للبيانات", "ما الاستنتاج المبدئي؟"],
                food: ["كيف أحسب نسبة الأمان الغذائي؟", "ما الخطوة التالية في الإنتاج؟", "اشرح المعايير المطلوبة", "ما الخطأ في القراءات؟"],
                accounting: ["اشرح هذا القيد المحاسبي", "كيف أُرحّله للأستاذ؟", "ما توازن الميزان بعد هذا القيد؟", "أين الخطأ في الفاتورة؟"],
                yemensoft: ["كيف أُنشئ فاتورة جديدة؟", "اشرح حركة المخزون هذه", "ما تقرير اليوم المتوقع؟", "كيف أصلح خطأ الترحيل؟"],
                business: ["اشرح هذا المؤشر", "ما تحليل SWOT للحالة؟", "ما الخطوة التالية كصاحب قرار؟", "كيف أبرّر هذا التوصية؟"],
                physics: ["اشرح القانون المستخدم", "كيف أحسب الناتج خطوة بخطوة؟", "ما تأثير تغيير المتغير الفلاني؟", "أين الخطأ في حسابي؟"],
                language: ["صحّح هذه الجملة", "اشرح القاعدة المطبقة", "اقترح صياغة أفضل", "ما الترجمة الأدق؟"],
                generic: ["كيف أبدأ؟", "اشرح الخطوة الحالية", "أعطني تلميحاً دون حلّ كامل", "ما المعيار الذي يثبت أني أنجزتُ المهمة؟"],
              };
              const items = SUGGESTIONS[k] || SUGGESTIONS.generic;
              return (
                <div className="px-2 pt-2 pb-1 border-t border-white/10 flex flex-wrap gap-1.5">
                  {items.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={assistBusy}
                      onClick={() => askAi(q)}
                      className="text-[11px] rounded-full px-2.5 py-1 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 text-white/75 hover:text-purple-100 disabled:opacity-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              );
            })()}
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
