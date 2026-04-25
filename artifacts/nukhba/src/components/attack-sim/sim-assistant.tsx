import { useEffect, useRef, useState } from "react";
import type { AttackScenario, NetworkState, AssistantMessage, TerminalEntry } from "./types";

interface Props {
  scenario: AttackScenario;
  subjectId?: string;
  state: NetworkState;
  terminalHistory: TerminalEntry[];
}

export function SimAssistant({ scenario, subjectId, state, terminalHistory }: Props) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const userMsg: AssistantMessage = { role: "user", content: question, timestamp: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const terminalLog = terminalHistory.slice(-8).map(e =>
        `$ ${e.cmd}\n${(e.out || "").slice(0, 200)}${e.err ? `\n[err] ${e.err}` : ""}`
      ).join("\n---\n");

      const r = await fetch(`${import.meta.env.BASE_URL}api/ai/attack-sim/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectId,
          scenario,
          networkState: state,
          currentHost: state.currentHost,
          terminalLog,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          question,
        }),
      });

      if (!r.ok || !r.body) {
        const text = await r.text().catch(() => "");
        let msg = `${r.status}`;
        try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch { if (text) msg = text.slice(0, 160); }
        throw new Error(msg);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = ""; // Carry-over for partial SSE frames split across chunks.
      const placeholder: AssistantMessage = { role: "assistant", content: "", timestamp: Date.now() };
      setMessages(m => [...m, placeholder]);

      const handleEvent = (raw: string) => {
        // Each SSE message is a block of lines; collect all `data:` lines into one payload.
        const dataLines = raw.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trimStart());
        if (dataLines.length === 0) return;
        const payload = dataLines.join("\n");
        try {
          const ev = JSON.parse(payload);
          if (ev.content) {
            acc += ev.content;
            setMessages(m => {
              const next = [...m];
              next[next.length - 1] = { ...next[next.length - 1], content: acc };
              return next;
            });
          }
          if (ev.error) {
            acc += `\n[خطأ: ${ev.error}]`;
            setMessages(m => {
              const next = [...m];
              next[next.length - 1] = { ...next[next.length - 1], content: acc };
              return next;
            });
          }
        } catch { /* incomplete or non-JSON frame — ignore */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Flush any trailing buffered frame.
          if (buffer.trim().length > 0) handleEvent(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines (\n\n).
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (frame.trim().length > 0) handleEvent(frame);
        }
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", content: `تعذّر الوصول للمساعد: ${e?.message || "خطأ"}`, timestamp: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  const quickAsks = [
    "ماذا أفعل الآن؟",
    "اشرح آخر مخرجات",
    "أعطني تلميحاً",
  ];

  return (
    <div className="flex flex-col h-full min-h-[320px] bg-slate-950 rounded-lg border border-purple-500/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-purple-950/40 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-purple-200 text-sm font-bold">المدرّب الذكي</span>
        </div>
        <span className="text-purple-300/60 text-[10px]">{messages.length} رسالة</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div className="text-center text-purple-300/70 py-6">
            <div className="text-2xl mb-2">💡</div>
            <div className="text-sm">اسألني أي شيء عن السيناريو</div>
            <div className="text-[11px] text-purple-400/50 mt-1">أنا أرى الشاشة معك وأعرف ما اكتشفت</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              m.role === "user"
                ? "bg-purple-500/20 border border-purple-400/30 text-purple-100"
                : "bg-white/5 border border-white/10 text-white/90"
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-sm">{m.content || "…"}</div>
            </div>
          </div>
        ))}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-white/60 text-sm animate-pulse">
              … يكتب
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-purple-500/20 bg-slate-900 p-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {quickAsks.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={busy}
              className="text-[11px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            disabled={busy}
            placeholder="اكتب سؤالك…"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-purple-400/50 min-h-[40px]"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="px-3 py-2 rounded-xl bg-purple-500/30 border border-purple-400/40 text-purple-100 hover:bg-purple-500/40 disabled:opacity-40 text-sm font-bold"
          >
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}
