import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Target, CheckCircle2, Circle, Lightbulb,
  MessageCircle, Send, X, ChevronDown, ChevronUp, GripVertical, Bot, Loader2,
} from "lucide-react";
import type { DynamicScenario, LabAssistMessage, LabKind } from "./types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  scenario: DynamicScenario;
  subjectId: string;
  onClose: () => void;
  onTaskJump?: (targetTab: string) => void;
  onShareWithTeacher?: (content: string) => void;
}

const KIND_META: Record<LabKind, { label: string; emoji: string; gradient: string; accent: string }> = {
  cyber:     { label: "أمن سيبراني",    emoji: "🛡️", gradient: "from-red-500/20 to-rose-500/10",      accent: "border-red-500/30 text-red-300" },
  nmap:      { label: "Nmap",           emoji: "🔍", gradient: "from-cyan-500/20 to-sky-500/10",      accent: "border-cyan-500/30 text-cyan-300" },
  wireshark: { label: "Wireshark",      emoji: "🦈", gradient: "from-blue-500/20 to-indigo-500/10",   accent: "border-blue-500/30 text-blue-300" },
  food:      { label: "هندسة غذائية",   emoji: "🔬", gradient: "from-lime-500/20 to-emerald-500/10",  accent: "border-lime-500/30 text-lime-300" },
  accounting:{ label: "محاسبة",          emoji: "🎓", gradient: "from-amber-500/20 to-orange-500/10", accent: "border-amber-500/30 text-amber-300" },
  yemensoft: { label: "يمن سوفت",        emoji: "🏢", gradient: "from-teal-500/20 to-cyan-500/10",    accent: "border-teal-500/30 text-teal-300" },
};

const DIFFICULTY_LABEL = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" };

export function DynamicScenarioOverlay({ scenario, subjectId, onClose, onTaskJump, onShareWithTeacher }: Props) {
  const meta = KIND_META[scenario.kind];
  const { user } = useAuth();
  // SECURITY: scope scenario progress by user.id so accounts don't share state.
  const STORAGE_KEY = user?.id ? `nukhba::u:${user.id}::scenario::${scenario.id}` : null;

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    if (!STORAGE_KEY) return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  const [completedChecks, setCompletedChecks] = useState<Set<string>>(new Set());
  const [revealedHints, setRevealedHints] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== "undefined" ? Math.max(20, window.innerWidth - 420) : 20,
    y: 80,
  }));
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    if (!STORAGE_KEY) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedTasks))); } catch {}
  }, [completedTasks, STORAGE_KEY]);

  const toggleTask = (id: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheck = (id: string) => {
    setCompletedChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDragStart = (e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: position.x, sy: position.y };
    const onMove = (mv: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = mv.clientX - dragRef.current.ox;
      const dy = mv.clientY - dragRef.current.oy;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 360, dragRef.current.sx + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.sy + dy)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const totalTasks = scenario.tasks.length;
  const doneTasks = scenario.tasks.filter(t => completedTasks.has(t.id)).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: collapsed ? 280 : 380,
        maxHeight: "calc(100vh - 100px)",
        zIndex: 60,
        direction: "rtl",
      }}
      className="rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div
        onMouseDown={onDragStart}
        className={`shrink-0 cursor-move flex items-center gap-2 p-3 bg-gradient-to-l ${meta.gradient} border-b border-white/10`}
        style={{ background: `linear-gradient(135deg, rgba(15,18,32,0.95), rgba(20,24,40,0.95))` }}
      >
        <GripVertical className="w-4 h-4 text-white/30 shrink-0" />
        <div className="text-2xl shrink-0">{meta.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">{meta.label} · {DIFFICULTY_LABEL[scenario.difficulty]}</div>
          <div className="font-bold text-sm truncate text-white">{scenario.title}</div>
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          {collapsed ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Progress bar */}
      {!collapsed && totalTasks > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-white/50">التقدم</span>
            <span className="text-[10px] font-bold text-white/70 mr-auto">{doneTasks}/{totalTasks}</span>
            {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${allDone ? "bg-emerald-400" : "bg-gold"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ background: "rgba(8,10,17,0.95)" }}
          >
            <div className="overflow-y-auto p-3 space-y-3" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {/* Briefing */}
              <div className="rounded-xl p-3 border border-white/5 bg-white/3">
                {scenario.context && (
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{scenario.context}</div>
                )}
                <p className="text-[12px] text-white/80 leading-relaxed">{scenario.briefing}</p>
              </div>

              {/* Objectives */}
              {scenario.objectives.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-white/70">
                    <Target className="w-3.5 h-3.5 text-gold" />
                    الأهداف
                  </div>
                  <ul className="space-y-1">
                    {scenario.objectives.map((o, i) => (
                      <li key={i} className="text-[11px] text-white/70 flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-gold/70 mt-0.5 shrink-0" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tasks (checkable, jump-to-tab) */}
              {scenario.tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-white/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    المهام ({doneTasks}/{totalTasks})
                  </div>
                  <ul className="space-y-1.5">
                    {scenario.tasks.map((t, i) => {
                      const done = completedTasks.has(t.id);
                      return (
                        <li key={t.id}>
                          <div className={`rounded-lg p-2 border transition-colors ${done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/3 border-white/5"}`}>
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleTask(t.id)}
                                className="mt-0.5 shrink-0"
                              >
                                {done
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  : <Circle className="w-4 h-4 text-white/30" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className={`text-[12px] font-medium leading-snug ${done ? "text-white/40 line-through" : "text-white/85"}`}>
                                  {i + 1}. {t.title}
                                </div>
                                {t.description && (
                                  <div className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{t.description}</div>
                                )}
                                {t.targetTab && onTaskJump && (
                                  <button
                                    onClick={() => onTaskJump(t.targetTab!)}
                                    className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.accent} hover:bg-white/5 transition-colors`}
                                  >
                                    افتح في: {t.targetTab}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Success Checks */}
              {scenario.successChecks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-white/70">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    معايير النجاح
                  </div>
                  <ul className="space-y-1">
                    {scenario.successChecks.map(c => {
                      const done = completedChecks.has(c.id);
                      return (
                        <li key={c.id} className="flex items-start gap-2">
                          <button onClick={() => toggleCheck(c.id)} className="mt-0.5 shrink-0">
                            {done ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <Circle className="w-3.5 h-3.5 text-white/30" />}
                          </button>
                          <span className={`text-[11px] ${done ? "text-amber-200/70 line-through" : "text-white/70"}`}>{c.description}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Hints */}
              {scenario.hints.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-white/70">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                    التلميحات ({revealedHints}/{scenario.hints.length})
                  </div>
                  <ul className="space-y-1">
                    {scenario.hints.slice(0, revealedHints).map((h, i) => (
                      <li key={i} className="text-[11px] text-yellow-200/80 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
                        💡 {h}
                      </li>
                    ))}
                  </ul>
                  {revealedHints < scenario.hints.length && (
                    <button
                      onClick={() => setRevealedHints(n => n + 1)}
                      className="mt-2 text-[10px] font-bold text-yellow-300 hover:text-yellow-200 px-2 py-1 rounded-md border border-yellow-500/30 hover:bg-yellow-500/10 transition-colors"
                    >
                      كشف تلميح إضافي
                    </button>
                  )}
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => setAssistOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-l from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:from-amber-500/30 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  مساعد ذكي
                </button>
                {onShareWithTeacher && (
                  <button
                    onClick={() => {
                      const summary = `📋 السيناريو: ${scenario.title}\nالتقدم: ${doneTasks}/${totalTasks} مهمة\nالمهام المكتملة: ${scenario.tasks.filter(t => completedTasks.has(t.id)).map(t => "• " + t.title).join("\n") || "(لا شيء بعد)"}`;
                      onShareWithTeacher(summary);
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[11px] font-bold hover:bg-white/10 transition-all"
                    title="شارك تقدمك مع المعلم"
                  >
                    شارك
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant chat */}
      <AnimatePresence>
        {assistOpen && (
          <AILabAssistant
            subjectId={subjectId}
            scenario={scenario}
            onClose={() => setAssistOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AILabAssistant({ subjectId, scenario, onClose }: { subjectId: string; scenario: DynamicScenario; onClose: () => void }) {
  const [messages, setMessages] = useState<LabAssistMessage[]>([
    { role: "assistant", content: `أنا هنا لمساعدتك في "${scenario.title}". اسألني عن أي مهمة أو خطوة عالقة فيها.` },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const ask = async () => {
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setInput("");
    setStreaming(true);
    setMessages(m => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);

    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectId,
          kind: scenario.kind,
          scenario,
          history: messages,
          question: q,
        }),
      });
      if (!r.body) throw new Error("no body");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              acc += data.content;
              setMessages(m => {
                const nm = [...m];
                nm[nm.length - 1] = { role: "assistant", content: acc };
                return nm;
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(m => {
        const nm = [...m];
        nm[nm.length - 1] = { role: "assistant", content: "تعذّر الاتصال بالمساعد. حاول لاحقاً." };
        return nm;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute inset-x-0 bottom-0 top-0 flex flex-col"
      style={{ background: "rgba(8,10,17,0.98)", zIndex: 70 }}
    >
      <div className="shrink-0 flex items-center gap-2 p-3 border-b border-white/10 bg-gradient-to-l from-amber-500/10 to-transparent">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white">المساعد الذكي</div>
          <div className="text-[10px] text-white/40 truncate">{scenario.title}</div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                m.role === "user"
                  ? "bg-white/5 border border-white/10 text-white/85 rounded-br-none"
                  : "bg-gradient-to-l from-amber-500/15 to-amber-500/5 border border-amber-500/25 text-amber-50 rounded-bl-none"
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="w-3 h-3 animate-spin" /> : null)}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="shrink-0 p-2.5 border-t border-white/10 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسأل المساعد..."
          disabled={streaming}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-amber-500/50 disabled:opacity-50 text-white placeholder:text-white/30"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {streaming
            ? <Loader2 className="w-4 h-4 animate-spin text-black" />
            : <Send className="w-4 h-4 text-black" />}
        </button>
      </form>
    </motion.div>
  );
}
