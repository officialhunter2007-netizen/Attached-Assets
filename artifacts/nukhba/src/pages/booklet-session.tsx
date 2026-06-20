// ─────────────────────────────────────────────────────────────────────────────
// v4 task #8 + R1 — Booklet session page.
//
// Layout:
//   - Sidebar (right, RTL): unit/lesson tree with binding-status badges.
//   - Header strip: PathSwitcher + current lesson + bound pages.
//   - Main: chat with /api/v4/booklet/teach SSE.
//   - Citations [ص:N] / [ص:N-M] in assistant messages render as clickable
//     badges that open a side Drawer with the actual chunk text.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2, Send, ChevronLeft, BookOpen, FileText, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PathSwitcher } from "@/components/path-switcher";

type Lesson = { lessonIndex: number; code: string; name: string; pages: [number, number]; objective: string; needsReview?: boolean; needsReviewReason?: string };
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

type Msg = { role: "user" | "assistant"; content: string };

type DrawerState =
  | { kind: "closed" }
  | { kind: "loading"; page: number; pageEnd?: number }
  | { kind: "ready"; page: number; pageEnd?: number; chunks: Array<{ id: number; pageNumber: number; chunkText: string }> }
  | { kind: "error"; page: number; pageEnd?: number; error: string };

const CSRF = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" };

// Parses `[ص:N]` or `[ص:N-M]` citations and converts them into JSX with
// clickable badges. The match also recognises spelling variants ("ص. N",
// "صفحة N") that older sessions may have used so legacy turns still
// render badges.
const CITATION_RE = /\[ص:\s*(\d+)(?:\s*[-–]\s*(\d+))?\]|\(\s*ص\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/g;

function renderWithCitations(text: string, onClick: (page: number, pageEnd?: number) => void): React.ReactNode[] {
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
      </button>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<span key={`t${key++}`}>{text.slice(last)}</span>);
  return out;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Number.isInteger(id)) return;
    (async () => {
      try {
        const r = await fetch(`/api/v4/booklet/${id}`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const data = await r.json();
        const b: Booklet = data?.booklet;
        setBooklet(b);
        // Map nodes deep-link a specific lesson via ?lesson=CODE — honour it
        // when the code exists in the tree, else fall back to the first lesson.
        const focus = new URLSearchParams(window.location.search).get("lesson");
        const focusValid = !!focus && (b?.tree?.units ?? []).some((u) => (u.lessons ?? []).some((l) => l.code === focus));
        let firstLesson: string | null = null;
        for (const u of (b?.tree?.units ?? [])) {
          for (const l of (u.lessons ?? [])) {
            if (!l.needsReview) { firstLesson = l.code; break; }
          }
          if (firstLesson) break;
        }
        setActiveCode(focusValid ? focus : firstLesson);
      } catch (e: any) {
        setErr(String(e?.message ?? e));
      }
    })();
  }, [id]);

  useEffect(() => { setMessages([]); }, [activeCode]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const activeLesson = useMemo(() => {
    if (!booklet || !activeCode) return null;
    for (const u of booklet.tree.units ?? []) {
      for (const l of u.lessons ?? []) {
        if (l.code === activeCode) return { lesson: l, unit: u };
      }
    }
    return null;
  }, [booklet, activeCode]);

  async function openCitation(page: number, pageEnd?: number) {
    if (!booklet) return;
    setDrawer({ kind: "loading", page, pageEnd });
    try {
      const pages = [];
      const last = pageEnd ?? page;
      for (let p = page; p <= last; p++) pages.push(p);
      const results = await Promise.all(pages.map((p) =>
        fetch(`/api/v4/booklet/${booklet.id}/chunks-by-page/${p}`, { credentials: "include" })
          .then((r) => r.ok ? r.json() : { chunks: [] })
          .catch(() => ({ chunks: [] }))
      ));
      const merged = results.flatMap((r: any) => Array.isArray(r?.chunks) ? r.chunks : []);
      setDrawer({ kind: "ready", page, pageEnd, chunks: merged });
    } catch (e: any) {
      setDrawer({ kind: "error", page, pageEnd, error: String(e?.message ?? e) });
    }
  }

  async function send() {
    const msg = input.trim();
    if (!msg || !booklet || !activeCode || streaming) return;
    setInput("");
    const newHistory: Msg[] = [...messages, { role: "user", content: msg }];
    setMessages([...newHistory, { role: "assistant", content: "" }]);
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
          history: messages,
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
            const payload = JSON.parse(line.slice(6));
            if (payload?.content) {
              setMessages((prev) => {
                const copy = prev.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: last.content + payload.content };
                }
                return copy;
              });
            }
            if (payload?.done) setStreaming(false);
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = { role: "assistant", content: `تعذّر الرد: ${String(e?.message ?? e).slice(0, 160)}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (err) return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-white" style={{ direction: "rtl" }}>
      <div className="text-5xl mb-3">⚠️</div>
      <p className="text-white/70">{err}</p>
      <button onClick={() => navigate("/learn")} className="mt-4 px-4 py-2 rounded-xl bg-white/10">رجوع</button>
    </div>
  );
  if (!booklet) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-emerald" /></div>
  );
  if (booklet.status !== "ready") return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-white" style={{ direction: "rtl" }}>
      <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
      <p className="text-white/70">جاري تحضير الملزمة… {booklet.status === "failed" ? `(فشل: ${booklet.errorMessage ?? "—"})` : ""}</p>
      <button onClick={() => navigate(`/path/${encodeURIComponent(booklet.subjectId)}/booklet`)} className="mt-4 px-4 py-2 rounded-xl bg-white/10">قائمة الملازم</button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-white flex flex-col md:flex-row relative" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      {/* Sidebar */}
      <aside className="md:w-80 md:max-w-[22rem] border-l border-white/10 bg-card/30 p-4 overflow-y-auto md:h-[100dvh]">
        <button
          onClick={() => navigate(`/path/${encodeURIComponent(booklet.subjectId)}/booklet`)}
          className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1 mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> الملازم
        </button>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-emerald" />
          <h1 className="font-black text-lg truncate">{booklet.title}</h1>
        </div>
        <p className="text-xs text-white/40 mb-4">{booklet.pagesCount} صفحة</p>
        <div className="space-y-3">
          {(booklet.tree.units ?? []).map((u) => (
            <div key={u.code}>
              <div className="text-xs font-bold text-white/60 mb-1.5">
                {u.code}. {u.name} <span className="text-white/30">(ص. {u.pages[0]}-{u.pages[1]})</span>
              </div>
              <div className="space-y-1">
                {(u.lessons ?? []).map((l) => {
                  const active = l.code === activeCode;
                  const blocked = !!l.needsReview;
                  return (
                    <button
                      key={l.code}
                      onClick={() => { if (!blocked) setActiveCode(l.code); }}
                      disabled={blocked}
                      title={blocked ? "هذا الدرس بحاجة لمراجعة مشرف قبل التدريس (تعذّر ربطه بصفحات محددة)." : undefined}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs border transition-colors ${
                        blocked
                          ? "bg-white/[0.02] border-amber-500/30 text-white/40 cursor-not-allowed"
                          : active
                            ? "bg-emerald/15 border-emerald/50 text-white"
                            : "bg-white/5 border-white/10 text-white/70 hover:border-white/30"
                      }`}
                    >
                      <div className="font-bold mb-0.5 inline-flex items-center gap-1 w-full">
                        <FileText className="w-3 h-3" /> <span className="flex-1 truncate text-right">{l.name}</span>
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" /> مراجعة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald/15 border border-emerald/40 text-emerald text-[9px] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" /> ص. {l.pages[0]}-{l.pages[1]}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {blocked ? (l.needsReviewReason || "لم نتمكن من ربط الدرس بصفحات محددة") : (l.objective || "—")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col h-[100dvh]">
        <header className="px-5 py-3 border-b border-white/10 bg-card/20 space-y-2">
          <PathSwitcher
            slug={booklet.subjectId}
            activeOverride={{ kind: "booklet", bookletId: booklet.id }}
            compact
          />
          {activeLesson && (
            <div>
              <div className="text-sm font-bold">{activeLesson.lesson.name}</div>
              <div className="text-xs text-white/50 mt-0.5">
                {activeLesson.unit.name} • <span className="text-emerald">📄 الصفحات المربوطة: {activeLesson.lesson.pages[0]}-{activeLesson.lesson.pages[1]}</span>
                {activeLesson.lesson.objective && <> • {activeLesson.lesson.objective}</>}
              </div>
            </div>
          )}
        </header>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-white/40 text-sm py-8">
              ابدأ بسؤال يخص هذا الدرس. المعلم سيستشهد بصفحات الملزمة على شكل شارات قابلة للنقر تفتح نص الصفحة الأصلي.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-gold/15 border border-gold/30" : "bg-white/5 border border-white/10"
              }`}>
                {m.role === "assistant"
                  ? (m.content
                      ? renderWithCitations(m.content, openCitation)
                      : (streaming && i === messages.length - 1 ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null))
                  : m.content}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-3 bg-card/30">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              rows={1}
              placeholder="اسأل عن أي شيء في الصفحات المخصّصة لهذا الدرس…"
              className="flex-1 resize-none px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald/60 max-h-32"
              disabled={streaming}
            />
            <button
              onClick={send} disabled={streaming || !input.trim()}
              className="px-4 py-2 rounded-xl bg-emerald text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>

      {/* Citation Drawer */}
      {drawer.kind !== "closed" && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDrawer({ kind: "closed" })}
          />
          <aside className="fixed top-0 left-0 h-[100dvh] w-full sm:w-[28rem] bg-card border-l border-white/10 z-50 flex flex-col" style={{ direction: "rtl" }}>
            <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-emerald/10">
              <div>
                <div className="text-xs text-white/50">من الملزمة</div>
                <div className="font-bold text-sm">
                  📄 {drawer.pageEnd ? `الصفحات ${drawer.page}-${drawer.pageEnd}` : `صفحة ${drawer.page}`}
                </div>
              </div>
              <button
                onClick={() => setDrawer({ kind: "closed" })}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawer.kind === "loading" && (
                <div className="text-center py-10 text-white/50"><Loader2 className="w-6 h-6 animate-spin inline" /></div>
              )}
              {drawer.kind === "error" && (
                <div className="text-sm text-red-400">تعذّر التحميل: {drawer.error}</div>
              )}
              {drawer.kind === "ready" && drawer.chunks.length === 0 && (
                <div className="text-sm text-white/50">لا توجد مقاطع محفوظة لهذه الصفحة.</div>
              )}
              {drawer.kind === "ready" && drawer.chunks.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-emerald font-bold mb-1.5">صفحة {c.pageNumber}</div>
                  <div className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{c.chunkText}</div>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
