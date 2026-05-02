import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Loader2, MessageSquarePlus, Brain, User as UserIcon, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type CourseRow = { subjectId: string; subjectName: string | null; students: number; messages: number; lastAt: string };

type ChatMsg = { role: "user" | "assistant"; content: string };

const STORAGE_PREFIX = "nukhba_admin_insights_v1_";
const SUGGESTIONS = [
  "من هم أكثر ٥ مستخدمين نشاطًا اليوم؟",
  "كم عدد الاشتراكات النشطة وكم نسبة كل مادة؟",
  "ماذا فعل آخر مستخدم سجّل دخوله؟",
  "هل هناك طلبات اشتراك معلّقة؟",
  "أرني آخر تقارير المختبر مع ملخّصها",
  "ما الصفحات الأكثر زيارة آخر ٢٤ ساعة؟",
];

function renderMarkdown(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = escape(text);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="bg-black/40 border border-white/10 rounded-lg p-2 my-1.5 overflow-x-auto text-[11px] text-amber-200/90"><code>${code}</code></pre>`);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 py-0.5 rounded text-[11px]">$1</code>');
  const lines = html.split("\n");
  const out: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  const closeList = () => { if (inList) { out.push(`</${listType}>`); inList = false; } };
  for (const line of lines) {
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (m) {
      if (!inList || listType !== "ul") { closeList(); out.push('<ul class="list-disc pr-5 space-y-1 my-1.5">'); inList = true; listType = "ul"; }
      out.push(`<li>${m[1]}</li>`);
    } else if (num) {
      if (!inList || listType !== "ol") { closeList(); out.push('<ol class="list-decimal pr-5 space-y-1 my-1.5">'); inList = true; listType = "ol"; }
      out.push(`<li>${num[2]}</li>`);
    } else {
      closeList();
      if (line.trim().length === 0) out.push("<div class='h-1.5'></div>");
      else out.push(`<p class="leading-relaxed">${line}</p>`);
    }
  }
  closeList();
  return out.join("");
}

export function AdminInsightsChat() {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_PREFIX}${user.id}` : null;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [focusQuery, setFocusQuery] = useState<string>("");
  const [focusInfo, setFocusInfo] = useState<{ id: number; name: string | null; email: string } | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [contextTrimmed, setContextTrimmed] = useState<boolean>(false);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [exportSubjectId, setExportSubjectId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamBuf]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/insights/courses?days=7", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.courses)) setCourses(data.courses);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const exportCourse = useCallback(async () => {
    if (!exportSubjectId || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const url = `/api/admin/insights/course-conversations-export?subjectId=${encodeURIComponent(exportSubjectId)}&days=7`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setExportError(res.status === 403 ? "هذا التصدير مخصّص للمشرفين فقط." : "تعذّر تنفيذ التصدير.");
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      let filename = "course-conversations.md";
      const m = dispo.match(/filename\*=UTF-8''([^;]+)/i) || dispo.match(/filename="([^"]+)"/i);
      if (m) { try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; } }
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl; a.download = filename;
      document.body.appendChild(a); a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dl), 1500);
    } catch {
      setExportError("تعذّر تنفيذ التصدير.");
    } finally {
      setExporting(false);
    }
  }, [exportSubjectId, exporting]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);
    setStreamBuf("");
    // Clear stale context-trimmed warning from a prior turn so it can never
    // hang under an unrelated error message or a fresh full-context answer.
    setContextTrimmed(false);

    const ac = new AbortController();
    abortRef.current = ac;
    const rawFocus = focusQuery.trim();
    const body: any = { messages: newMsgs };
    if (rawFocus) {
      if (/^\d+$/.test(rawFocus)) body.focusUserId = Number(rawFocus);
      else body.focusQuery = rawFocus;
    }

    try {
      const res = await fetch("/api/admin/ai/insights", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let errText = res.status === 403 ? "هذا المساعد مخصّص للمشرفين فقط." : "تعذّر الاتصال بالمساعد.";
        // Surface the real server-supplied error JSON when present (only for
        // non-403 responses — the 403 message stays user-friendly and stable).
        if (res.status !== 403) {
          try {
            const j = await res.json();
            if (j && typeof j.error === "string" && j.error.trim()) {
              errText = j.error;
            }
          } catch {}
        }
        setMessages((p) => [...p, { role: "assistant", content: errText }]);
        setStreaming(false);
        setContextTrimmed(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      try {
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
                // The server already follows an error payload with a
                // `done` event, but treat the error as terminal here too
                // so a malformed stream cannot leave the UI stuck in
                // "…" forever. We pin the assistant message, close the
                // reader, and bail out cleanly.
                const finalText = acc.trim()
                  ? `${acc}\n\n_${data.error}_`
                  : data.error;
                setMessages((p) => [...p, { role: "assistant", content: finalText }]);
                setStreamBuf("");
                setStreaming(false);
                setContextTrimmed(false);
                abortRef.current = null;
                try { await reader.cancel(); } catch {}
                return;
              } else if (data.content) {
                acc += data.content;
                setStreamBuf(acc);
              } else if (data.done) {
                if (acc.trim()) setMessages((p) => [...p, { role: "assistant", content: acc }]);
                setStreamBuf("");
                setStreaming(false);
                abortRef.current = null;
                const fu = data?.contextStats?.focusUser;
                setFocusInfo(fu ? { id: fu.id, name: fu.name ?? null, email: fu.email } : null);
                setFocusNote(data?.contextStats?.focusResolutionNote ?? null);
                setContextTrimmed(!!data?.contextStats?.contextTrimmed);
                return;
              }
            } catch {}
          }
        }
      } finally {
        try { reader.releaseLock(); } catch {}
      }
      if (acc.trim()) setMessages((p) => [...p, { role: "assistant", content: acc }]);
      setStreamBuf("");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages((p) => [...p, { role: "assistant", content: "حدث خطأ غير متوقّع." }]);
        setContextTrimmed(false);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, focusQuery]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };
  const clearChat = () => {
    // Abort first so any in-flight fetch's reader unwinds before we wipe
    // state — otherwise a late chunk could re-populate the cleared chat.
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setStreamBuf("");
    setMessages([]);
    setFocusInfo(null);
    setFocusNote(null);
    setContextTrimmed(false);
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch {} }
  };

  return (
    <div dir="rtl" className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] rounded-2xl overflow-hidden border border-amber-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-l from-amber-500/15 via-purple-500/5 to-transparent flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse"></span>
          </div>
          <div>
            <div className="text-base font-black text-white flex items-center gap-2">
              مساعد إدارة نُخبة
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-l from-amber-500 to-purple-500 text-white">PRO</span>
            </div>
            <div className="text-[11px] text-white/55">يقرأ كل بيانات المنصة الحيّة — اسأل أي شيء عن أي مستخدم</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="text"
                placeholder="ID / إيميل / اسم"
                value={focusQuery}
                onChange={(e) => setFocusQuery(e.target.value)}
                className="w-40 bg-transparent text-[11px] text-white placeholder:text-white/30 outline-none"
                title="اختياري — للتركيز على مستخدم معيّن"
              />
              {focusQuery && (
                <button
                  type="button"
                  onClick={() => { setFocusQuery(""); setFocusInfo(null); setFocusNote(null); }}
                  className="text-white/40 hover:text-white text-xs px-1"
                  title="مسح"
                >
                  ×
                </button>
              )}
            </div>
            {focusInfo && (
              <div className="text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded px-1.5 py-0.5 max-w-[220px] truncate" title={`${focusInfo.name ?? ""} ${focusInfo.email}`}>
                ✓ {focusInfo.name ?? focusInfo.email} · ID {focusInfo.id}
              </div>
            )}
            {focusNote && !focusInfo && (
              <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-400/20 rounded px-1.5 py-0.5 max-w-[220px]">
                ⚠ {focusNote}
              </div>
            )}
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} title="محادثة جديدة" className="w-9 h-9 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors">
              <MessageSquarePlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk course export */}
      <div className="px-4 py-2.5 border-b border-white/5 bg-black/20 flex items-center gap-2 flex-wrap">
        <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-[11px] text-white/60 shrink-0">تصدير محادثات مادّة كاملة (آخر ٧ أيام):</span>
        <select
          value={exportSubjectId}
          onChange={(e) => { setExportSubjectId(e.target.value); setExportError(null); }}
          disabled={exporting || courses.length === 0}
          className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-amber-400/50 disabled:opacity-50"
          title="اختر المادة"
        >
          <option value="">{courses.length === 0 ? "لا توجد محادثات في آخر ٧ أيام" : "اختر مادة…"}</option>
          {courses.map((c) => (
            <option key={c.subjectId} value={c.subjectId}>
              {(c.subjectName || c.subjectId)} — {c.students} طالب · {c.messages} رسالة
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCourse}
          disabled={!exportSubjectId || exporting}
          className={`text-[11px] font-bold rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all ${
            !exportSubjectId || exporting
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-gradient-to-br from-amber-400 to-purple-600 text-white hover:brightness-110 active:scale-95"
          }`}
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? "جاري التصدير…" : "تصدير .md"}
        </button>
        {exportError && (
          <span className="text-[10px] text-red-300 bg-red-500/10 border border-red-400/30 rounded px-1.5 py-0.5">
            {exportError}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
        {messages.length === 0 && !streaming && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-purple-500/15 border border-amber-400/30 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-base font-black text-white mb-2">اسأل عن أي مستخدم أو أي حدث في المنصة</h3>
            <p className="text-xs text-white/55 mb-5 leading-relaxed max-w-md mx-auto">
              أتعقّب نقرات المستخدمين، صفحاتهم، دروسهم، تقارير مختبراتهم، اشتراكاتهم — كل شيء حيّ ومحفوظ.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto px-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} className="text-right text-xs text-white/80 hover:text-white bg-white/[0.04] hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 rounded-xl px-3.5 py-2.5 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
        {streaming && <Bubble role="assistant" content={streamBuf || "···"} streaming={!streamBuf} />}
        {!streaming && contextTrimmed && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
          <div className="flex justify-end">
            <div className="max-w-[88%] -mt-1 text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-400/25 rounded-lg px-2.5 py-1.5">
              ⚠ السياق مُختصر — اطلب تركيزًا على مستخدم/فترة محددة لإجابة أدقّ.
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-white/10 bg-slate-950/60 p-3">
        <div className="flex items-end gap-2 bg-white/[0.05] border border-white/10 focus-within:border-amber-400/50 rounded-xl px-3 py-2 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="مثال: ماذا فعل المستخدم رقم 42 آخر ساعة؟"
            rows={1}
            disabled={streaming}
            maxLength={2000}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 resize-none outline-none py-1.5 max-h-32 leading-relaxed"
            style={{ minHeight: "32px" }}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              streaming || !input.trim()
                ? "bg-white/5 text-white/25 cursor-not-allowed"
                : "bg-gradient-to-br from-amber-400 to-purple-600 text-white hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20"
            }`}
            aria-label="إرسال"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-[10px] text-white/35 text-center mt-2">
          البيانات حيّة — يُحدَّث السياق مع كل سؤال. الحقل الأيمن للتركيز على مستخدم بالـID أو الإيميل أو الاسم.
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, content, streaming }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[13px] ${
        isUser
          ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-400/25 text-white rounded-br-sm"
          : "bg-white/[0.06] border border-white/10 text-white/90 rounded-bl-sm"
      }`}>
        {streaming ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "120ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "240ms" }}></span>
          </div>
        ) : (
          <div className="prose-chat space-y-1" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        )}
      </div>
    </div>
  );
}
