import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, Loader2, MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type ChatMsg = { role: "user" | "assistant"; content: string };

const STORAGE_PREFIX = "nukhba_help_chat_v1_";
const SUGGESTIONS = [
  "كيف أبدأ جلسة تعليمية؟",
  "ما الفرق بين الباقات؟",
  "ما هو المختبر التفاعلي؟",
  "كيف أرى تقاريري السابقة؟",
];

function renderMarkdown(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = escape(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-[11px]">$1</code>');
  html = html.replace(/\[([^\]]+)\]\((\/[^\s)]+)\)/g, '<a href="$2" class="text-gold underline">$1</a>');
  const lines = html.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (m) {
      if (!inList) { out.push('<ul class="list-disc pr-5 space-y-1 my-1.5">'); inList = true; }
      out.push(`<li>${m[1]}</li>`);
    } else if (num) {
      if (!inList) { out.push('<ul class="list-decimal pr-5 space-y-1 my-1.5">'); inList = true; }
      out.push(`<li>${num[2]}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim().length === 0) out.push("<div class='h-1.5'></div>");
      else out.push(`<p class="leading-relaxed">${line}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

export function PlatformChatWidget() {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load persisted history
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Persist
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamBuf, open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Cancel on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    setStreamBuf("");

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/ai/platform-help", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const errText = res.status === 401
          ? "يجب تسجيل الدخول لاستخدام المساعد."
          : "تعذّر الاتصال بالمساعد، حاول لاحقًا.";
        setMessages((p) => [...p, { role: "assistant", content: errText }]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
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
            if (data.error) {
              acc += `\n\n_${data.error}_`;
              setStreamBuf(acc);
            } else if (data.content) {
              acc += data.content;
              setStreamBuf(acc);
            } else if (data.done) {
              if (acc.trim()) {
                setMessages((p) => [...p, { role: "assistant", content: acc }]);
              }
              setStreamBuf("");
              setStreaming(false);
              abortRef.current = null;
              return;
            }
          } catch {}
        }
      }
      if (acc.trim()) setMessages((p) => [...p, { role: "assistant", content: acc }]);
      setStreamBuf("");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages((p) => [...p, { role: "assistant", content: "حدث خطأ غير متوقّع. حاول مرّة أخرى." }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreamBuf("");
    setStreaming(false);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="افتح مساعد نُخبة"
          className="fixed bottom-5 left-5 z-[60] group"
        >
          <span className="absolute inset-0 rounded-full bg-gold/40 blur-xl opacity-60 group-hover:opacity-90 transition-opacity"></span>
          <span className="relative flex items-center gap-2 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-900 font-bold px-4 py-3 rounded-full shadow-2xl shadow-amber-500/30 border border-amber-300/40 hover:scale-105 active:scale-95 transition-transform">
            <Sparkles className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">مساعد نُخبة</span>
          </span>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse"></span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          dir="rtl"
          className="fixed z-[60] bottom-3 left-3 right-3 sm:right-auto sm:bottom-5 sm:left-5 sm:w-[400px] h-[min(620px,calc(100dvh-2rem))] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="relative px-4 py-3 border-b border-white/10 bg-gradient-to-l from-amber-500/15 via-amber-400/5 to-transparent flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-5 h-5 text-slate-900" />
                </div>
                <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  مساعد نُخبة
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">AI</span>
                </div>
                <div className="text-[10px] text-white/50">يجيبك عن كل شيء في المنصة</div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="محادثة جديدة"
                  className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="إغلاق"
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-sm font-black text-white mb-1">مرحبًا بك في نُخبة 👋</h3>
                <p className="text-[11px] text-white/55 mb-4 leading-relaxed px-2">
                  اسألني عن أي شيء في المنصة — الباقات، المختبرات، الجلسات، أو كيف تبدأ.
                </p>
                <div className="grid gap-1.5 px-1">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="text-right text-[11.5px] text-white/75 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 rounded-lg px-3 py-2 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}

            {streaming && (
              <MessageBubble role="assistant" content={streamBuf || "···"} streaming={!streamBuf} />
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-white/10 bg-slate-950/60 p-2.5">
            <div className="flex items-end gap-2 bg-white/[0.05] border border-white/10 focus-within:border-amber-400/50 rounded-xl px-2.5 py-1.5 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="اكتب سؤالك هنا..."
                rows={1}
                disabled={streaming}
                maxLength={2000}
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 resize-none outline-none py-1.5 max-h-24 leading-relaxed"
                style={{ minHeight: "28px" }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  streaming || !input.trim()
                    ? "bg-white/5 text-white/25 cursor-not-allowed"
                    : "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20"
                }`}
                aria-label="إرسال"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[9px] text-white/30 text-center mt-1.5">
              مساعد ذكي — قد يخطئ أحيانًا. للمساعدة البشرية افتح <a href="/support" className="text-gold hover:underline">صفحة الدعم</a>.
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function MessageBubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] ${
          isUser
            ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/25 text-white rounded-br-sm"
            : "bg-white/[0.06] border border-white/10 text-white/90 rounded-bl-sm"
        }`}
      >
        {streaming ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "120ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "240ms" }}></span>
          </div>
        ) : (
          <div
            className="prose-chat space-y-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}
