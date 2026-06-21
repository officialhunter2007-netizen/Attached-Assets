// ─────────────────────────────────────────────────────────────────────────────
// Booklet Session — Redesign (Task #1).
//
// Layout (mobile-first):
//   - Fixed header: back→map | booklet title + current lesson | lessons button
//   - Collapsible context strip: unit name + bound pages + objective
//   - Full-height scrollable chat area
//   - Fixed input bar at bottom
//   - Lessons panel: bottom sheet on mobile, right side drawer on md+
//   - Citation Drawer (unchanged functionality, improved style)
//
// RTL corrections:
//   - User messages: justify-end (right side), gold bubble
//   - AI messages:   justify-start (left side), dark bubble + 📖 avatar
//
// PathSwitcher removed from this surface.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  Loader2, Send, BookOpen, FileText, X,
  AlertTriangle, ChevronRight, ChevronDown, ChevronUp, LayoutList, Map,
} from "lucide-react";

type Lesson = {
  lessonIndex: number;
  code: string;
  name: string;
  pages: [number, number];
  objective: string;
  needsReview?: boolean;
  needsReviewReason?: string;
};
type Unit = { unitIndex: number; code: string; name: string; pages: [number, number]; lessons: Lesson[] };
type Tree = { units: Unit[] };

type Booklet = {
  id: number;
  title: string;
  subjectId: string;
  pagesCount: number;
  status: "processing" | "ready" | "failed";
  errorMessage: string | null;
  tree: Tree;
};

// isWelcome: true → this message is a local UI-only greeting, excluded from
// the history array sent to the API on every user turn.
type Msg = { role: "user" | "assistant"; content: string; isWelcome?: boolean };

type DrawerState =
  | { kind: "closed" }
  | { kind: "loading"; page: number; pageEnd?: number }
  | { kind: "ready"; page: number; pageEnd?: number; chunks: Array<{ id: number; pageNumber: number; chunkText: string }> }
  | { kind: "error"; page: number; pageEnd?: number; error: string };

const CSRF = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" };

// ─── Citation renderer ────────────────────────────────────────────────────────
const CITATION_RE =
  /\[ص:\s*(\d+)(?:\s*[-–]\s*(\d+))?\]|\(\s*ص\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/g;

function renderWithCitations(
  text: string,
  onClick: (page: number, pageEnd?: number) => void,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  CITATION_RE.lastIndex = 0;
  while ((m = CITATION_RE.exec(text))) {
    if (m.index > last) out.push(<span key={`t${key++}`}>{text.slice(last, m.index)}</span>);
    const p1 = Number(m[1] ?? m[3]);
    const p2 = m[2] ?? m[4];
    const pageEnd = p2 ? Number(p2) : undefined;
    out.push(
      <button
        key={`c${key++}`}
        onClick={() => onClick(p1, pageEnd)}
        className="inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald/15 border border-emerald/40 text-emerald hover:bg-emerald/30 transition-colors align-baseline"
        title="افتح نص الصفحة من الملزمة"
      >
        📄 ص {pageEnd ? `${p1}-${pageEnd}` : p1}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<span key={`t${key++}`}>{text.slice(last)}</span>);
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BookletSession() {
  const [, params] = useRoute<{ id: string }>("/booklet/:id");
  const id = Number(params?.id ?? 0);
  const [, navigate] = useLocation();

  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "closed" });
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch booklet ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return;
    (async () => {
      try {
        const r = await fetch(`/api/v4/booklet/${id}`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const data = await r.json();
        const b: Booklet = data?.booklet;
        setBooklet(b);
        const focus = new URLSearchParams(window.location.search).get("lesson");
        const focusValid =
          !!focus &&
          (b?.tree?.units ?? []).some((u) => (u.lessons ?? []).some((l) => l.code === focus));
        let firstLesson: string | null = null;
        for (const u of b?.tree?.units ?? []) {
          for (const l of u.lessons ?? []) {
            if (!l.needsReview) {
              firstLesson = l.code;
              break;
            }
          }
          if (firstLesson) break;
        }
        setActiveCode(focusValid ? focus! : firstLesson);
      } catch (e: unknown) {
        setErr(String((e as Error)?.message ?? e));
      }
    })();
  }, [id]);

  // ── Derive active lesson ───────────────────────────────────────────────────
  const activeLesson = useMemo(() => {
    if (!booklet || !activeCode) return null;
    for (const u of booklet.tree.units ?? []) {
      for (const l of u.lessons ?? []) {
        if (l.code === activeCode) return { lesson: l, unit: u };
      }
    }
    return null;
  }, [booklet, activeCode]);

  // ── Welcome message when lesson changes ───────────────────────────────────
  // Fires when the resolved lesson code changes (not on every render).
  // The welcome message is UI-only: marked isWelcome:true so it is stripped
  // from the history array sent to the API.
  useEffect(() => {
    if (!activeLesson) {
      setMessages([]);
      return;
    }
    const { lesson, unit } = activeLesson;
    if (lesson.needsReview) {
      setMessages([{
        role: "assistant",
        content: `هذا الدرس (${lesson.name}) يحتاج مراجعة من المشرف قبل البدء. الرجاء اختيار درس آخر من القائمة.`,
        isWelcome: true,
      }]);
      return;
    }
    const obj = lesson.objective?.trim();
    setMessages([{
      role: "assistant",
      content:
        `أهلاً! نحن الآن في **${lesson.name}** (${unit.name})` +
        (obj ? `\n\n🎯 **هدف الدرس:** ${obj}` : "") +
        `\n\n📄 يغطي هذا الدرس الصفحات **${lesson.pages[0]}–${lesson.pages[1]}** من الملزمة. اسألني عن أي شيء! 😊`,
      isWelcome: true,
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.lesson.code]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // ── Citation opener ────────────────────────────────────────────────────────
  async function openCitation(page: number, pageEnd?: number) {
    if (!booklet) return;
    setDrawer({ kind: "loading", page, pageEnd });
    try {
      const pages: number[] = [];
      for (let p = page; p <= (pageEnd ?? page); p++) pages.push(p);
      const results = await Promise.all(
        pages.map((p) =>
          fetch(`/api/v4/booklet/${booklet.id}/chunks-by-page/${p}`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : { chunks: [] }))
            .catch(() => ({ chunks: [] })),
        ),
      );
      const merged = results.flatMap((r: unknown) => {
        const chunks = (r as { chunks?: { id: number; pageNumber: number; chunkText: string }[] })?.chunks;
        return Array.isArray(chunks) ? chunks : [];
      });
      setDrawer({ kind: "ready", page, pageEnd, chunks: merged });
    } catch (e: unknown) {
      setDrawer({ kind: "error", page, pageEnd, error: String((e as Error)?.message ?? e) });
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  // History passed to the API excludes welcome messages.
  // State is built directly from the filtered history — never from `prev` +
  // history together, which would duplicate earlier turns on turn 2+.
  async function send() {
    const msg = input.trim();
    if (!msg || !booklet || !activeCode || streaming) return;
    setInput("");

    // Build history for API call (strip UI-only welcome messages).
    const apiHistory: Msg[] = messages.filter((m) => !m.isWelcome);

    // The new conversation state: everything the user has said + typed + empty AI slot.
    const nextMessages: Msg[] = [
      ...apiHistory,
      { role: "user", content: msg },
      { role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    setStreaming(true);

    try {
      const r = await fetch("/api/v4/booklet/teach", {
        method: "POST",
        credentials: "include",
        headers: CSRF,
        body: JSON.stringify({
          bookletId: booklet.id,
          lessonCode: activeCode,
          message: msg,
          history: apiHistory,
        }),
      });
      if (!r.ok || !r.body) {
        const t = await r.text().catch(() => "");
        throw new Error(t.slice(0, 200) || `http_${r.status}`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (payload?.content) {
              setMessages((prev) => {
                const copy = prev.slice();
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + payload.content! };
                }
                return copy;
              });
            }
            if (payload?.done) setStreaming(false);
          } catch {
            // ignore SSE parse errors
          }
        }
      }
    } catch (e: unknown) {
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: `تعذّر الرد: ${String((e as Error)?.message ?? e).slice(0, 160)}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  // ── Error / loading / not-ready screens ──────────────────────────────────
  if (err) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-white"
        style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
      >
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-white/70">{err}</p>
        <button
          onClick={() => navigate("/learn")}
          className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-sm"
        >
          رجوع
        </button>
      </div>
    );
  }
  if (!booklet) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald" />
      </div>
    );
  }
  if (booklet.status !== "ready") {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-white"
        style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-white/70">
          {booklet.status === "failed"
            ? `فشل تحضير الملزمة: ${booklet.errorMessage ?? "—"}`
            : "جاري تحضير الملزمة…"}
        </p>
        <button
          onClick={() => navigate(`/path/${encodeURIComponent(booklet.subjectId)}/booklet`)}
          className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-sm"
        >
          قائمة الملازم
        </button>
      </div>
    );
  }

  // ── Lessons tree (shared between mobile bottom sheet and desktop drawer) ──
  const lessonsTree = (
    <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
      {(booklet.tree.units ?? []).map((u) => (
        <div key={u.code}>
          {/* Unit header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="shrink-0 text-[11px] font-bold text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              {u.code}
            </span>
            <span className="text-xs font-bold text-white/70 flex-1 truncate">{u.name}</span>
            <span className="shrink-0 text-[11px] text-white/30">ص. {u.pages[0]}-{u.pages[1]}</span>
          </div>
          {/* Lessons */}
          <div className="space-y-1.5 pr-2 border-r border-white/[0.07]">
            {(u.lessons ?? []).map((l) => {
              const active = l.code === activeCode;
              const blocked = !!l.needsReview;
              return (
                <button
                  key={l.code}
                  onClick={() => {
                    if (!blocked) {
                      setActiveCode(l.code);
                      setLessonsOpen(false);
                    }
                  }}
                  disabled={blocked}
                  title={blocked ? "هذا الدرس يحتاج مراجعة مشرف" : undefined}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs border transition-all ${
                    blocked
                      ? "bg-white/[0.02] border-amber-500/20 text-white/35 cursor-not-allowed"
                      : active
                      ? "bg-emerald/15 border-emerald/50 text-white"
                      : "bg-white/[0.03] border-white/10 text-white/65 hover:bg-white/[0.07] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    {blocked ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : active ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald shrink-0 animate-pulse" />
                    ) : (
                      <FileText className="w-3 h-3 text-white/30 shrink-0" />
                    )}
                    <span className="flex-1 truncate font-semibold">{l.name}</span>
                    {blocked ? (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        مراجعة
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-emerald/70">
                        ص.{l.pages[0]}-{l.pages[1]}
                      </span>
                    )}
                  </div>
                  {l.objective && !blocked && (
                    <p className="mt-0.5 text-[10px] text-white/35 truncate pr-4">{l.objective}</p>
                  )}
                  {blocked && l.needsReviewReason && (
                    <p className="mt-0.5 text-[10px] text-amber-400/60 truncate pr-4">
                      {l.needsReviewReason}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {/* Back to booklets list */}
      <div className="pt-2 border-t border-white/10">
        <button
          onClick={() => {
            setLessonsOpen(false);
            navigate(`/path/${encodeURIComponent(booklet.subjectId)}/booklet`);
          }}
          className="w-full text-right text-xs text-white/40 hover:text-white/70 py-2 flex items-center gap-1.5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          العودة إلى قائمة الملازم
        </button>
      </div>
    </div>
  );

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div
      className="h-[100dvh] flex flex-col bg-background text-white overflow-hidden"
      style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-3 h-14 border-b border-white/10 bg-background/90 backdrop-blur-sm z-10">
        {/* Back to map */}
        <button
          onClick={() => navigate(`/booklet/${id}/map`)}
          className="shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="خريطة الملزمة"
        >
          <Map className="w-5 h-5" />
        </button>

        {/* Center: booklet title + lesson name */}
        <div className="flex-1 min-w-0 text-center">
          <p className="text-[11px] text-white/50 leading-none truncate">{booklet.title}</p>
          {activeLesson ? (
            <p className="text-sm font-bold leading-tight truncate mt-0.5">
              {activeLesson.lesson.name}
            </p>
          ) : (
            <p className="text-xs text-white/40 mt-0.5">اختر درساً من القائمة</p>
          )}
        </div>

        {/* Lessons toggle button */}
        <button
          onClick={() => setLessonsOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LayoutList className="w-4 h-4" />
          <span className="hidden sm:inline">الدروس</span>
        </button>
      </header>

      {/* ── Collapsible context strip ────────────────────────────────────────── */}
      {activeLesson && (
        <div className="shrink-0 border-b border-emerald/20 bg-emerald/[0.04]">
          <button
            onClick={() => setContextOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-right text-xs hover:bg-emerald/5 transition-colors"
          >
            <span className="text-emerald font-semibold truncate flex-1">
              {activeLesson.unit.name}
            </span>
            <span className="shrink-0 text-white/50">
              ص. {activeLesson.lesson.pages[0]}–{activeLesson.lesson.pages[1]}
            </span>
            {contextOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-white/40 shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />}
          </button>
          {contextOpen && activeLesson.lesson.objective && (
            <p className="px-4 pb-2 text-[11px] text-white/50 leading-relaxed">
              🎯 {activeLesson.lesson.objective}
            </p>
          )}
        </div>
      )}

      {/* ── Chat messages ───────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          return (
            <div
              key={i}
              className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {/* Teacher avatar (AI side only) */}
              {!isUser && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald/15 border border-emerald/30 flex items-center justify-center text-base select-none mb-0.5">
                  📖
                </div>
              )}
              {/* Message bubble */}
              <div
                className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "rounded-2xl rounded-bl-sm bg-amber-400/15 border border-amber-400/30 text-white"
                    : m.isWelcome
                    ? "rounded-2xl rounded-br-sm bg-emerald/[0.07] border border-emerald/25 text-white/90"
                    : "rounded-2xl rounded-br-sm bg-white/[0.06] border border-white/10 text-white/90"
                }`}
              >
                {isUser
                  ? m.content
                  : m.content
                  ? renderWithCitations(m.content, openCitation)
                  : streaming && isLast
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin inline text-emerald" />
                  : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/10 bg-card/40 px-3 py-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={
              activeLesson
                ? "اسأل عن أي شيء في الصفحات المخصّصة لهذا الدرس…"
                : "اختر درساً أولاً…"
            }
            disabled={streaming || !activeLesson || !!activeLesson.lesson.needsReview}
            className="flex-1 resize-none px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald/60 max-h-32 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={() => void send()}
            disabled={streaming || !input.trim() || !activeLesson || !!activeLesson.lesson.needsReview}
            className="shrink-0 p-2.5 rounded-xl bg-emerald text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald/90 transition-colors"
          >
            {streaming
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Lessons panel ───────────────────────────────────────────────────── */}
      {/* Shared backdrop — dims the chat area behind the panel on both breakpoints. */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          lessonsOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setLessonsOpen(false)}
      />

      {/*
        Mobile (< md): bottom sheet — slides up from the bottom edge.
          Hidden:  translate-y-full
          Visible: translate-y-0

        Desktop (md+): right side drawer — slides in from the right edge.
          Hidden:  translate-x-full  (translate-y reset to 0 via md:translate-y-0)
          Visible: translate-x-0 translate-y-0

        Tailwind transform utilities compose via CSS custom properties
        (--tw-translate-x, --tw-translate-y), so combining them across
        breakpoints works correctly without conflicts.
      */}
      <div
        className={`
          fixed z-50 flex flex-col bg-[hsl(222,28%,9%)] border-white/15 shadow-2xl
          transition-transform duration-300 ease-out
          inset-x-0 bottom-0 max-h-[78dvh] rounded-t-3xl border-t
          md:inset-x-auto md:bottom-auto md:top-0 md:right-0
          md:h-[100dvh] md:max-h-none md:w-80 md:rounded-none md:rounded-l-3xl md:border-t-0 md:border-l
          ${lessonsOpen
            ? "translate-y-0 md:translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
          }
        `}
        style={{ direction: "rtl" }}
      >
        {/* Drag handle (mobile only) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-black text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald shrink-0" />
              <span className="truncate">{booklet.title}</span>
            </h2>
            <p className="text-xs text-white/40 mt-0.5">{booklet.pagesCount} صفحة</p>
          </div>
          <button
            onClick={() => setLessonsOpen(false)}
            className="shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lesson tree (shared render variable) */}
        {lessonsTree}
      </div>

      {/* ── Citation Drawer ──────────────────────────────────────────────────── */}
      {drawer.kind !== "closed" && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDrawer({ kind: "closed" })}
          />
          <aside
            className="fixed top-0 left-0 h-[100dvh] w-full sm:w-[30rem] bg-[hsl(222,28%,9%)] border-l border-white/10 z-50 flex flex-col shadow-2xl"
            style={{ direction: "rtl" }}
          >
            <header className="px-4 py-3 border-b border-emerald/20 bg-emerald/[0.08] flex items-center justify-between shrink-0">
              <div>
                <div className="text-[11px] text-emerald/60 font-medium">من الملزمة</div>
                <div className="font-bold text-sm">
                  📄{" "}
                  {drawer.pageEnd
                    ? `الصفحات ${drawer.page}-${drawer.pageEnd}`
                    : `صفحة ${drawer.page}`}
                </div>
              </div>
              <button
                onClick={() => setDrawer({ kind: "closed" })}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawer.kind === "loading" && (
                <div className="text-center py-12 text-white/50">
                  <Loader2 className="w-6 h-6 animate-spin inline" />
                </div>
              )}
              {drawer.kind === "error" && (
                <div className="text-sm text-red-400">تعذّر التحميل: {drawer.error}</div>
              )}
              {drawer.kind === "ready" && drawer.chunks.length === 0 && (
                <div className="text-sm text-white/50 text-center py-8">
                  لا توجد مقاطع محفوظة لهذه الصفحة.
                </div>
              )}
              {drawer.kind === "ready" &&
                drawer.chunks.map((c) => (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[10px] text-emerald font-bold mb-1.5">
                      صفحة {c.pageNumber}
                    </div>
                    <div className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                      {c.chunkText}
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
