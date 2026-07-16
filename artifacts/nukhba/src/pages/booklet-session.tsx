// ─────────────────────────────────────────────────────────────────────────────
// Booklet Session — v2 (proactive teacher).
//
// Key differences vs v1:
//   • Teacher starts automatically when a lesson opens — no static "اسألني"
//     welcome. A hidden auto-kick message fires the SSE stream so the AI
//     begins explaining on its own.
//   • Full rich rendering pipeline: marked → DOMPurify → KaTeX → enhanceTeacherDom
//     (same as v4-lesson.tsx) — bold, code, math, citations all work correctly.
//   • Chat UI visually matches the custom-path session (v4-lesson).
//
// Unchanged:
//   • Lessons panel (bottom sheet mobile / right drawer md+)
//   • Collapsible context strip
//   • Citation drawer
//   • /api/v4/booklet/teach SSE protocol
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  enhanceTeacherDom,
  ensureMarkdownBlockGaps,
  extractMathBlocks,
  restoreMathPlaceholders,
  sanitizeStrayMarkdown,
} from "@/lib/teacher-render";
import { extractAskOptions } from "@/lib/ask-options";
import { OptionsQuestion } from "@/components/dynamic-env/options-question";
import {
  Loader2, Send, BookOpen, FileText, X,
  AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
  LayoutList, Map, Sparkles, Code2, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorPanel } from "@/components/code-editor-panel";
import { detectCodeTask } from "@/components/code-input-area";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// isAutoKick: hidden trigger message (not rendered, stripped from apiHistory)
// isWelcome: true if this is a ui-only "needsReview" block message
type Msg = { role: "user" | "assistant"; content: string; isAutoKick?: boolean; isWelcome?: boolean };

type DrawerState =
  | { kind: "closed" }
  | { kind: "loading"; page: number; pageEnd?: number }
  | { kind: "ready"; page: number; pageEnd?: number; chunks: Array<{ id: number; pageNumber: number; chunkText: string }> }
  | { kind: "error"; page: number; pageEnd?: number; error: string };

const CSRF = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" };

// ─── Citation badge helpers ───────────────────────────────────────────────────
const CITATION_RE =
  /\[ص:\s*(\d+)(?:\s*[-–]\s*(\d+))?\]|\(\s*ص\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/g;

function injectCitationButtons(
  html: string,
  onClick: (p: number, pe?: number) => void,
): string {
  return html.replace(CITATION_RE, (_m, a, b, c, d) => {
    const p1 = Number(a ?? c);
    const p2 = b ?? d;
    const rangeLabel = p2 ? `${p1}–${Number(p2)}` : `${p1}`;
    const encoded = JSON.stringify({ p1, p2: p2 ? Number(p2) : undefined });
    return `<button
      class="citation-badge inline-flex items-center gap-0.5 mx-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-colors align-baseline cursor-pointer"
      data-cite="${encodeURIComponent(encoded)}"
      title="افتح نص الصفحة من الملزمة"
    >📄 ص ${rangeLabel}</button>`;
  });
}

// ─── Minimal render helpers (subset of v4-lesson's renderHtml) ───────────────
// Strip complete and partial [[ASK_OPTIONS:...]] and status tags so they never
// leak into the markdown renderer as raw text.
function sanitizeProtocol(raw: string): string {
  return raw
    .replace(/\[\[\s*ASK_OPTIONS\s*:[\s\S]*?\]\](?!\])/g, "")
    .replace(/\[\[\s*ASK_OPTIONS\s*:(?:(?!\]\])[\s\S])*$/g, "")
    .replace(/\[\[\s*CODE_TASK\s*:[\s\S]*?\]\](?!\])/g, "")
    .replace(/\[\[\s*CODE_TASK\s*:(?:(?!\]\])[\s\S])*$/g, "")
    .replace(/\[(SESSION_COMPLETE|LESSON_MASTERED|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE)\]/g, "")
    .replace(/\[(SESSION_COMPLETE|LESSON_MASTERED)?$/i, "");
}

function normalizeFences(src: string): string {
  if (!src || src.indexOf("```") === -1) return src;
  const FENCE_LANG_RE =
    /^(python|py|javascript|js|typescript|ts|jsx|tsx|html|css|bash|sh|json|yaml|sql|c|cpp|java|rust|go|php|ruby|kotlin|swift|dart)$/i;
  const parts = src.split("```");
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      let seg = parts[i];
      if (i > 0 && seg && !seg.startsWith("\n")) seg = "\n" + seg;
      out += seg;
    } else {
      let body = parts[i];
      let lang = "";
      const m = body.match(/^[ \t]*([A-Za-z0-9+#_.\-]+)(?=[ \t\n]|$)/);
      if (m && FENCE_LANG_RE.test(m[1])) {
        lang = m[1].toLowerCase();
        body = body.slice(m[0].length).replace(/^[ \t]+/, "").replace(/^\r?\n/, "");
      } else {
        body = body.replace(/^\r?\n/, "");
      }
      body = body.replace(/[ \t\r\n]+$/, "");
      if (out.length && !out.endsWith("\n")) out += "\n";
      out += "```" + lang + "\n" + body + "\n```";
    }
  }
  return out;
}

const _HASH_LANGS = new Set(["python","py","ruby","rb","bash","sh","shell","zsh","r","perl","pl","yaml","yml","toml","ini","env","dotenv","dockerfile","docker","makefile","make"]);
const _SLASH_LANGS = new Set(["javascript","js","typescript","ts","jsx","tsx","java","kotlin","kt","swift","dart","go","rust","c","cpp","c++","cxx","cc","csharp","cs","scala","groovy","php"]);

function _stripLineComments(code: string, lang: string): string {
  const L = lang.toLowerCase();
  const useHash = _HASH_LANGS.has(L);
  const useSlash = _SLASH_LANGS.has(L);
  if (!useHash && !useSlash) return code;
  const out: string[] = [];
  for (const rawLine of code.split("\n")) {
    if (useHash && /^\s*#/.test(rawLine)) continue;
    if (useSlash && /^\s*\/\//.test(rawLine)) continue;
    let result = "";
    let inStr: string | null = null;
    let i = 0;
    while (i < rawLine.length) {
      const ch = rawLine[i];
      if (inStr) {
        result += ch;
        if (ch === "\\" && i + 1 < rawLine.length) { i++; result += rawLine[i]; }
        else if (ch === inStr) inStr = null;
      } else if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch; result += ch;
      } else if (useHash && ch === "#" && rawLine[i - 1] !== "!") {
        break;
      } else if (useSlash && ch === "/" && rawLine[i + 1] === "/" && !/https?:$/.test(result.trimEnd())) {
        break;
      } else {
        result += ch;
      }
      i++;
    }
    const t = result.trimEnd();
    if (t) out.push(t);
  }
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out.join("\n");
}

function stripFenceCommentsBooklet(src: string): string {
  if (!src || src.indexOf("```") === -1) return src;
  const parts = src.split("```");
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      result += parts[i];
    } else {
      const firstNl = parts[i].indexOf("\n");
      const lang = firstNl === -1 ? "" : parts[i].slice(0, firstNl).trim();
      const body = firstNl === -1 ? parts[i] : parts[i].slice(firstNl + 1);
      result += "```" + lang + "\n" + _stripLineComments(body, lang) + "\n```";
    }
  }
  return result;
}

function renderHtml(raw: string): string {
  if (!raw) return "";
  const clean = sanitizeProtocol(raw);
  const withNoise = sanitizeStrayMarkdown(clean);
  const withFences = normalizeFences(withNoise);
  const withNoComments = stripFenceCommentsBooklet(withFences);
  const { text: stripped, blocks } = extractMathBlocks(withNoComments);
  const html = marked.parse(ensureMarkdownBlockGaps(stripped ?? ""), { async: false }) as string;
  // Sanitize FIRST so DOMPurify never sees KaTeX's complex span tree,
  // then restore math — placeholders are plain ASCII and survive sanitization.
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "aria-label", "aria-hidden", "type"],
    ADD_TAGS: ["figure", "figcaption", "button"],
  });
  return restoreMathPlaceholders(sanitized, blocks);
}

// ─── TeacherBubble ────────────────────────────────────────────────────────────
function TeacherBubble({
  content,
  isStreaming,
  onCite,
  onAnswerOption,
  onVisualExplain,
}: {
  content: string;
  isStreaming: boolean;
  onCite: (p: number, pe?: number) => void;
  onAnswerOption?: (answer: string) => void;
  onVisualExplain?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Extract ASK_OPTIONS BEFORE rendering so the tag is never passed to marked
  const { stripped, ask } = useMemo(() => extractAskOptions(content ?? ""), [content]);

  const html = useMemo(() => {
    if (!stripped) return "";
    const base = renderHtml(stripped);
    return injectCitationButtons(base, onCite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripped]);

  useEffect(() => {
    enhanceTeacherDom(ref.current);
  }, [html]);

  useEffect(() => {
    if (isStreaming) return;
    const id = requestAnimationFrame(() => enhanceTeacherDom(ref.current));
    return () => cancelAnimationFrame(id);
  }, [isStreaming]);

  // Wire citation button clicks after DOM update
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest("[data-cite]");
      if (!btn) return;
      try {
        const raw = decodeURIComponent((btn as HTMLElement).dataset.cite ?? "");
        const { p1, p2 } = JSON.parse(raw);
        onCite(p1, p2);
      } catch {}
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [html, onCite]);

  if (!content && isStreaming) {
    return (
      <div className="flex justify-start items-end gap-2">
        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base select-none">
          📖
        </div>
        <div className="rounded-3xl bg-white/5 border border-white/10 px-4 py-3">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-end gap-2 w-full">
      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base select-none mb-0.5 self-start mt-1">
        📖
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {html && (
          <div className="max-w-[92%] px-4 py-3 rounded-3xl rounded-bl-sm bg-white/[0.06] border border-white/10">
            <div
              ref={ref}
              className="ai-msg"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
        {/* ── شرح بصري button — shown after streaming is done ── */}
        {!isStreaming && onVisualExplain && html && (
          <div className="max-w-[92%] flex">
            <button
              type="button"
              onClick={onVisualExplain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.25)",
                color: "rgba(251,191,36,0.8)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,191,36,0.18)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(251,191,36,1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,191,36,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(251,191,36,0.8)";
              }}
            >
              <Eye className="w-3 h-3" />
              شرح بصري
            </button>
          </div>
        )}

        {/* Render ASK_OPTIONS as clickable buttons (only when streaming is done) */}
        {ask && !isStreaming && onAnswerOption && (
          <div className="max-w-[92%]">
            <OptionsQuestion
              question={ask.question}
              options={ask.options}
              allowOther={ask.allowOther}
              onAnswer={onAnswerOption}
            />
          </div>
        )}
      </div>
    </div>
  );
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
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [ideOpen, setIdeOpen] = useState(false);
  const [pendingCodeTask, setPendingCodeTask] =
    useState<{ requirement: string; lang: string } | null>(null);
  const [codeTaskCardCollapsed, setCodeTaskCardCollapsed] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "closed" });
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [visualOverlay, setVisualOverlay] = useState<{
    html: string | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track in-flight SSE so we can abort on lesson switch
  const inflightRef = useRef<AbortController | null>(null);
  // Prevent double auto-kick
  const autoKickedRef = useRef(false);

  // ── Fetch booklet ────────────────────────────────────────────────────────
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
            if (!l.needsReview) { firstLesson = l.code; break; }
          }
          if (firstLesson) break;
        }
        setActiveCode(focusValid ? focus! : firstLesson);
      } catch (e: unknown) {
        setErr(String((e as Error)?.message ?? e));
      }
    })();
  }, [id]);

  // ── Derive active lesson ─────────────────────────────────────────────────
  const activeLesson = useMemo(() => {
    if (!booklet || !activeCode) return null;
    for (const u of booklet.tree.units ?? []) {
      for (const l of u.lessons ?? []) {
        if (l.code === activeCode) return { lesson: l, unit: u };
      }
    }
    return null;
  }, [booklet, activeCode]);

  // Show IDE button only for programming/coding booklets (same regex as v4-lesson)
  const isProgramming = useMemo(
    () => /(python|بايثون|web|ويب|program|برمج|cod|js|javascript|java|cyber|سايبر|أمن|امن|شبك|network|software|تطوير|تقني|\bit\b|erp)/i
      .test(booklet?.subjectId ?? ""),
    [booklet?.subjectId],
  );

  // Share-code handler: injects code + output into the conversation as a user message
  const handleShareWithTeacher = useCallback((code: string, language: string, output: string) => {
    const preview = output.trim().slice(0, 400);
    const shareMsg = `جرّبت الكود (${language}):\n\`\`\`${language}\n${code}\n\`\`\`\n${preview ? `**النتيجة:**\n\`\`\`\n${preview}\n\`\`\`` : ""}`;
    setIdeOpen(false);
    void sendMessage(shareMsg);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visual Explain ───────────────────────────────────────────────────────
  const handleVisualExplain = useCallback(async (messageContent: string) => {
    setVisualOverlay({ html: null, loading: true, error: null });
    const POLL_MS  = 5_000;
    const DEADLINE = Date.now() + 10 * 60_000;
    try {
      const startRes = await fetch("/api/v4/visual-explain/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: messageContent }),
      });
      if (!startRes.ok) {
        const d = await startRes.json().catch(() => ({}));
        throw new Error(d.error || "تعذّر إنشاء الشرح البصري.");
      }
      const { jobId } = await startRes.json();

      while (Date.now() < DEADLINE) {
        await new Promise(r => setTimeout(r, POLL_MS));
        const statusRes = await fetch(`/api/v4/visual-explain/status/${jobId}`, { credentials: "include" });
        if (!statusRes.ok) {
          const d = await statusRes.json().catch(() => ({}));
          throw new Error(d.error || "تعذّر إنشاء الشرح البصري.");
        }
        const data = await statusRes.json();
        if (data.status === "done")  { setVisualOverlay({ html: data.html, loading: false, error: null }); return; }
        if (data.status === "error") { throw new Error(data.error || "تعذّر إنشاء الشرح البصري."); }
      }
      throw new Error("انتهت مهلة الانتظار (5 دقائق) — حاول مرة أخرى");
    } catch (err) {
      setVisualOverlay({
        html: null, loading: false,
        error: err instanceof Error ? err.message : "تعذّر إنشاء الشرح البصري.",
      });
    }
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // ── Abort in-flight on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      try { inflightRef.current?.abort(); } catch {}
    };
  }, []);

  // ── Citation drawer opener ───────────────────────────────────────────────
  const openCitation = async (page: number, pageEnd?: number) => {
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
  };

  // ── Core send function ───────────────────────────────────────────────────
  // `hidden` = true for the auto-kick trigger — the user msg is not rendered.
  async function sendMessage(text: string, opts?: { hidden?: boolean }) {
    const msg = text.trim();
    if (!msg || !booklet || !activeCode || streaming) return;
    setError(null);

    // Strip auto-kick and welcome messages from history sent to API
    const apiHistory: Msg[] = messages.filter((m) => !m.isAutoKick && !m.isWelcome);

    const userMsg: Msg = {
      role: "user",
      content: msg,
      ...(opts?.hidden ? { isAutoKick: true } : {}),
    };
    const nextMessages: Msg[] = [
      ...apiHistory,
      userMsg,
      { role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    if (!opts?.hidden) setInput("");
    setStreaming(true);

    // Abort previous in-flight if any (e.g. rapid lesson switch)
    try { inflightRef.current?.abort(); } catch {}
    const controller = new AbortController();
    inflightRef.current = controller;

    try {
      const r = await fetch("/api/v4/booklet/teach", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: CSRF,
        body: JSON.stringify({
          bookletId: booklet.id,
          lessonCode: activeCode,
          message: msg,
          history: apiHistory,
        }),
      });
      if (!r.ok || !r.body) {
        let errMsg = `http_${r.status}`;
        try { const j = await r.json(); if (j?.error) errMsg = j.error; } catch {}
        throw new Error(errMsg);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) { try { reader.cancel(); } catch {} return; }
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              content?: string;
              done?: boolean;
              error?: string;
              friendlyMessage?: string;
            };
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
            if (payload?.done) {
              setStreaming(false);
              const p = payload as { sessionComplete?: boolean; codeTask?: { requirement: string; lang: string | null } | null };
              if (p.sessionComplete) setSessionComplete(true);
              if (p.codeTask?.requirement) {
                const lang = (
                  p.codeTask.lang ||
                  detectCodeTask([p.codeTask.requirement]).lang ||
                  "python"
                ).toLowerCase();
                setPendingCodeTask({ requirement: p.codeTask.requirement, lang });
                setCodeTaskCardCollapsed(false);
              }
            }
            if (payload?.error || payload?.friendlyMessage) {
              setError(payload.friendlyMessage ?? payload.error ?? "حدث خطأ");
            }
          } catch {
            // ignore SSE parse errors
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") return;
      const msg2 = String((e as Error)?.message ?? e);
      setMessages((prev) => {
        const copy = prev.slice();
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = {
            ...last,
            content: `تعذّر الوصول للمعلم الآن. تحقّق من اتصالك وحاول مرة أخرى. (${msg2.slice(0, 80)})`,
          };
        }
        return copy;
      });
    } finally {
      if (!controller.signal.aborted) setStreaming(false);
    }
  }

  // ── Auto-kick: fire when lesson changes and no history exists ────────────
  // Mirrors v4-lesson.tsx's first-turn auto-kick pattern.
  // The trigger message is hidden — the teacher appears to start on its own.
  useEffect(() => {
    if (!activeLesson) {
      // Abort any in-flight from previous lesson
      try { inflightRef.current?.abort(); } catch {}
      inflightRef.current = null;
      autoKickedRef.current = false;
      setMessages([]);
      setStreaming(false);
      setError(null);
      return;
    }
    const { lesson } = activeLesson;

    // Reset state for new lesson
    try { inflightRef.current?.abort(); } catch {}
    inflightRef.current = null;
    autoKickedRef.current = false;
    setMessages([]);
    setStreaming(false);
    setError(null);

    // Reset session-complete flag and IDE state for new lesson
    setSessionComplete(false);
    setIdeOpen(false);
    setPendingCodeTask(null);

    if (lesson.needsReview) {
      // Show a static warning — no API call needed
      setMessages([{
        role: "assistant",
        content: `هذا الدرس (${lesson.name}) يحتاج مراجعة من المشرف قبل البدء. الرجاء اختيار درس آخر من القائمة.`,
        isWelcome: true,
      }]);
      return;
    }

    // Fire the auto-kick after state has settled
    const timer = setTimeout(() => {
      if (autoKickedRef.current) return;
      autoKickedRef.current = true;
      void sendMessage("ابدأ معي شرح محتوى هذا الدرس من الملزمة بأسلوبك التفاعلي.", { hidden: true });
    }, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.lesson.code]);

  // ── Loading / error screens ──────────────────────────────────────────────
  if (err) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-white"
        style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
      >
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-white/70">{err}</p>
        <button onClick={() => navigate("/learn")} className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-sm">
          رجوع
        </button>
      </div>
    );
  }
  if (!booklet) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
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
          <div className="flex items-center gap-2 mb-2">
            <span className="shrink-0 text-[11px] font-bold text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              {u.code}
            </span>
            <span className="text-xs font-bold text-white/70 flex-1 truncate">{u.name}</span>
            <span className="shrink-0 text-[11px] text-white/30">ص. {u.pages[0]}-{u.pages[1]}</span>
          </div>
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
                      ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                      : "bg-white/[0.03] border-white/10 text-white/65 hover:bg-white/[0.07] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    {blocked ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : active ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    ) : (
                      <FileText className="w-3 h-3 text-white/30 shrink-0" />
                    )}
                    <span className="flex-1 truncate font-semibold">{l.name}</span>
                    {blocked ? (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        مراجعة
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] text-emerald-400/70">
                        ص.{l.pages[0]}-{l.pages[1]}
                      </span>
                    )}
                  </div>
                  {l.objective && !blocked && (
                    <p className="mt-0.5 text-[10px] text-white/35 truncate pr-4">{l.objective}</p>
                  )}
                  {blocked && l.needsReviewReason && (
                    <p className="mt-0.5 text-[10px] text-amber-400/60 truncate pr-4">{l.needsReviewReason}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-2 px-3 h-14 border-b border-white/10 bg-background/90 backdrop-blur-sm z-10">
        <button
          onClick={() => navigate(`/booklet/${id}/map`)}
          className="shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="خريطة الملزمة"
        >
          <Map className="w-5 h-5" />
        </button>
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
        {/* IDE button — only for coding specialties */}
        {isProgramming && (
          <div className="relative shrink-0">
            <button
              onClick={() => setIdeOpen(true)}
              className={`p-2 rounded-xl transition-colors ${
                pendingCodeTask
                  ? "text-amber-300 bg-amber-400/15 hover:bg-amber-400/25"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
              title={pendingCodeTask ? "محرّر نُخبة — لديك مهمّة برمجية بانتظارك" : "محرّر نُخبة"}
            >
              <Code2 className="w-5 h-5" />
              {pendingCodeTask && (
                <span className="absolute -top-0.5 -left-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-background" />
                </span>
              )}
            </button>
            {/* Bouncing tooltip pill when teacher pushes a code task */}
            <AnimatePresence>
              {pendingCodeTask && !ideOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -4 }}
                  transition={{ duration: 0.35, delay: 1.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 flex flex-col items-center"
                  style={{ direction: "rtl" }}
                >
                  <div className="w-0 h-0"
                    style={{ borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderBottom: "7px solid #F59E0B", filter: "drop-shadow(0 -2px 6px rgba(245,158,11,0.6))" }}
                  />
                  <motion.button
                    onClick={() => setIdeOpen(true)}
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-2xl font-black text-[11px] whitespace-nowrap select-none"
                    style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", color: "#1a0d00", padding: "5px 13px", boxShadow: "0 4px 20px rgba(245,158,11,0.55), 0 0 0 3px rgba(245,158,11,0.15)" }}
                  >
                    ↑ جرّب محرّر نُخبة
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <button
          onClick={() => setLessonsOpen((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LayoutList className="w-4 h-4" />
          <span className="hidden sm:inline">الدروس</span>
        </button>
      </header>

      {/* ── Collapsible context strip ───────────────────────────────────────── */}
      {activeLesson && (
        <div className="shrink-0 border-b border-emerald-500/20 bg-emerald-500/[0.04]">
          <button
            onClick={() => setContextOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2 text-right text-xs hover:bg-emerald-500/5 transition-colors"
          >
            <span className="text-emerald-400 font-semibold truncate flex-1">
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

      {/* ── Main area: chat + side drawer ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Chat messages ─────────────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

            {/* Empty / loading state while waiting for first AI message */}
            {messages.filter((m) => !m.isAutoKick).length === 0 && !streaming && (
              <div className="text-center text-white/50 text-sm py-12">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-amber-400/70" />
                جاري تجهيز الجلسة…
              </div>
            )}

            {messages.map((m, i) => {
              // Hide the hidden trigger message from the UI
              if (m.isAutoKick) return null;

              const isLast = i === messages.length - 1;
              const isUser = m.role === "user";

              if (isUser) {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[78%] px-4 py-2.5 rounded-3xl rounded-br-sm bg-amber-400/15 border border-amber-400/30 text-white text-sm leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                );
              }

              // AI bubble — use rich rendering
              const isLastAi = isLast && m.role === "assistant";
              return (
                <TeacherBubble
                  key={i}
                  content={m.content}
                  isStreaming={streaming && isLast}
                  onCite={openCitation}
                  onAnswerOption={isLastAi && !streaming ? (ans) => { void sendMessage(ans); } : undefined}
                  onVisualExplain={!m.content.trim().startsWith("⚠️") ? () => handleVisualExplain(m.content) : undefined}
                />
              );
            })}

            {/* Typing indicator after user sends (before AI starts streaming) */}
            {streaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start items-end gap-2">
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base select-none">
                  📖
                </div>
                <div className="rounded-3xl bg-white/5 border border-white/10 px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {/* Session-complete banner — shown once the teacher signals all
                lesson concepts are covered (server emits [SESSION_COMPLETE]). */}
            {sessionComplete && !streaming && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <span className="text-xl shrink-0 mt-0.5">🎉</span>
                <div>
                  <p className="font-bold text-emerald-300 mb-0.5">أتممت دراسة هذا الدرس!</p>
                  <p className="text-emerald-200/80 text-[13px]">
                    غطّينا جميع مفاهيم الدرس. إذا كان لديك سؤال يمكنك الاستمرار،
                    أو ارجع إلى الخريطة لاختيار درس جديد.
                  </p>
                  <button
                    onClick={() => navigate(`/booklet/${id}/map`)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    العودة إلى الخريطة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Lessons panel — desktop right drawer ───────────────────────────
             Mobile: translate-y-full (hidden) / translate-y-0 (open)
             Desktop md+: translate-x-full (hidden) / translate-x-0 (open)       */}
        <div
          className={`
            absolute inset-x-0 bottom-0 top-0
            md:inset-y-0 md:right-0 md:left-auto md:w-72
            bg-card border-t border-white/10 md:border-t-0 md:border-r md:border-white/10
            flex flex-col z-20
            transition-transform duration-300 ease-in-out
            ${lessonsOpen
              ? "translate-y-0 md:translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full"
            }
          `}
          style={{ maxHeight: "100%" }}
        >
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm font-bold text-white/80">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              دروس الملزمة
            </div>
            <button
              onClick={() => setLessonsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {lessonsTree}
        </div>

        {/* Backdrop for mobile lessons panel */}
        {lessonsOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-10 md:hidden"
            onClick={() => setLessonsOpen(false)}
          />
        )}
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/5 bg-background/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!streaming && input.trim()) void sendMessage(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!streaming && input.trim()) void sendMessage(input);
                  }
                }}
                disabled={streaming}
                rows={1}
                placeholder="اكتب ردّك للمعلم…"
                className="flex-1 resize-none bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 disabled:opacity-60 max-h-40"
                style={{ minHeight: 48 }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                title="إرسال"
              >
                {streaming
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Nukhba IDE overlay ─────────────────────────────────────────────── */}
      {ideOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-white/10">
            <button
              onClick={() => setIdeOpen(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="أغلق المحرّر"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white/80 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-amber-400" />
              محرّر نُخبة
            </span>
            {/* Pinned code-task card inside IDE */}
            {pendingCodeTask && (
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-2 max-w-xs">
                  <button
                    onClick={() => setCodeTaskCardCollapsed((v) => !v)}
                    className="text-[10px] text-amber-300/70 hover:text-amber-300 transition-colors whitespace-nowrap"
                  >
                    {codeTaskCardCollapsed ? "عرض المهمّة" : "طيّ"}
                  </button>
                  {!codeTaskCardCollapsed && (
                    <div className="text-[11px] bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-1.5 text-amber-200 leading-snug line-clamp-2">
                      <span className="font-bold text-amber-300 ml-1">{pendingCodeTask.lang}</span>
                      {pendingCodeTask.requirement}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditorPanel
              sectionContent={activeLesson?.lesson.objective ?? ""}
              subjectId={booklet?.subjectId}
              onShareWithTeacher={handleShareWithTeacher}
            />
          </div>
        </div>
      )}

      {/* ── Citation drawer ────────────────────────────────────────────────── */}
      {drawer.kind !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDrawer({ kind: "closed" }); }}
        >
          <div
            className="w-full max-w-lg mx-4 mb-4 rounded-3xl border border-white/15 bg-card shadow-2xl overflow-hidden"
            style={{ maxHeight: "60dvh", display: "flex", flexDirection: "column" }}
          >
            {/* Drawer header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                {drawer.kind === "loading"
                  ? "جاري تحميل الصفحات…"
                  : drawer.kind === "error"
                  ? "تعذّر تحميل الصفحة"
                  : `ص. ${drawer.page}${drawer.pageEnd && drawer.pageEnd !== drawer.page ? `–${drawer.pageEnd}` : ""} من الملزمة`}
              </div>
              <button
                onClick={() => setDrawer({ kind: "closed" })}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {drawer.kind === "loading" && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              )}
              {drawer.kind === "error" && (
                <p className="text-rose-300 text-sm">{drawer.error}</p>
              )}
              {drawer.kind === "ready" && drawer.chunks.length === 0 && (
                <p className="text-white/50 text-sm text-center py-8">لا يوجد نص لهذه الصفحة</p>
              )}
              {drawer.kind === "ready" &&
                drawer.chunks.map((c) => (
                  <div key={c.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                    <div className="text-[11px] text-white/40 mb-2 font-bold">ص. {c.pageNumber}</div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{c.chunkText}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Explain Overlay ──────────────────────────────────────────── */}
      {visualOverlay && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setVisualOverlay(null); }}
        >
          <div
            className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: "min(96vw, 960px)",
              height: "min(92vh, 720px)",
              background: "#0d111e",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0e1a" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5 text-black" />
                </div>
                <span className="text-sm font-bold text-amber-200" style={{ direction: "rtl" }}>
                  الشرح البصري التفاعلي
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVisualOverlay(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 relative overflow-hidden">
              {visualOverlay.loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ direction: "rtl" }}>
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-amber-400/50 animate-ping" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute inset-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-white font-semibold text-base">جارٍ إنشاء الشرح البصري…</p>
                  <p className="text-white/45 text-xs text-center max-w-xs leading-relaxed">
                    يُنشئ الذكاء الاصطناعي صفحة تفاعلية لشرح هذا المفهوم بصرياً. قد يستغرق ذلك دقيقة أو دقيقتين.
                  </p>
                </div>
              )}
              {visualOverlay.error && !visualOverlay.loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ direction: "rtl" }}>
                  <div className="text-4xl">⚠️</div>
                  <p className="text-rose-300 font-semibold text-center">{visualOverlay.error}</p>
                  <button
                    type="button"
                    onClick={() => setVisualOverlay(null)}
                    className="px-5 py-2 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-white/80 hover:text-white text-sm font-medium transition-all"
                  >
                    إغلاق
                  </button>
                </div>
              )}
              {visualOverlay.html && !visualOverlay.loading && (
                <iframe
                  srcDoc={visualOverlay.html}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts"
                  title="الشرح البصري التفاعلي"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
