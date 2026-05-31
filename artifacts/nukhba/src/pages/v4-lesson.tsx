/**
 * v4-lesson.tsx — v4 teaching session screen (task #17).
 *
 * Wires the v4-map's lesson click → /api/v4/teach SSE → chat-style chat UI.
 * Reuses subject.tsx's rendering pipeline (marked + DOMPurify + KaTeX +
 * VIZ + IMAGE) so the v4 teacher visual output matches the legacy one.
 *
 * Charges the v4 monthly wallet (server-side). On [LESSON_MASTERED] the
 * server already advances v4_student_paths.currentLessonCode + unlocks the
 * next code; the FE just surfaces a "next lesson" CTA from the terminal
 * SSE event payload. Insufficient gems is detected from the terminal
 * event's `insufficientGems` / `noWallet` flags.
 */
import { useCallback, useEffect, useMemo, useRef, useState, createElement } from "react";
import { useRoute, useLocation } from "wouter";
import { createRoot, type Root } from "react-dom/client";
import { Loader2, ChevronRight, Send, Sparkles, ArrowLeft, Trophy, Gem, History, Plus, Code2, X, ImagePlus } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { enhanceTeacherDom, extractMathBlocks, restoreMathPlaceholders } from "@/lib/teacher-render";
import { getVizComponent } from "@/components/viz/registry";
import { SceneMount } from "@/components/scene-stepper";
import { CodeEditorPanel } from "@/components/code-editor-panel";
import { useAuth } from "@/lib/use-auth";
import { readUserJson, writeUserJson, userKey } from "@/lib/user-storage";

// Generic, student-friendly Arabic fallback for technical/network failures so
// the chat never surfaces raw strings like "http_500" or "Failed to fetch".
const FRIENDLY_RETRY_MSG = "تعذّر الوصول للمعلم الآن. تحقّق من اتصالك وحاول مرة أخرى بعد لحظات.";

type ChatMsg = { role: "user" | "assistant"; content: string; image?: string };
type V4ImageState = { status: "loading" | "ready"; url?: string };

// Cap an attached image at ~4MB (pre-base64) so the SSE turn stays sane.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type TerminalEffects = {
  done: true;
  lessonMastered?: boolean;
  nextLessonCode?: string | null;
  sessionComplete?: boolean;
  masteryGateBlocked?: { missing: Array<{ conceptIndex: number; score: number }> } | null;
  charged?: boolean;
  insufficientGems?: boolean;
  noWallet?: boolean;
  balanceAfter?: number | null;
};

type MapLessonRef = { code: string; name: string };

/* ── Local-session persistence keys (per user · slug · lesson) ─────────── */
// All keys are user-scoped via `userKey` to prevent cross-account leaks
// when multiple users share the same browser. A missing/changed user
// causes user-storage helpers to short-circuit (no read/no write), and
// the AuthProvider already wipes everything on logout/user-rotation.
type StoredSession = { id: string; createdAt: number; updatedAt: number; messages: ChatMsg[] };
function sessionsSuffix(slug: string, code: string): string {
  return `v4:sessions:${slug}:${code}`;
}
function activeSuffix(slug: string, code: string): string {
  return `v4:active:${slug}:${code}`;
}
function loadSessions(userId: string | null, slug: string, code: string): StoredSession[] {
  const list = readUserJson<StoredSession[]>(userId, sessionsSuffix(slug, code), []);
  return Array.isArray(list) ? list : [];
}
function saveSessions(userId: string | null, slug: string, code: string, list: StoredSession[]): void {
  writeUserJson(userId, sessionsSuffix(slug, code), list.slice(0, 10));
}
function loadActiveId(userId: string | null, slug: string, code: string): string | null {
  const k = userKey(userId, activeSuffix(slug, code));
  if (!k) return null;
  try { return localStorage.getItem(k); } catch { return null; }
}
function saveActiveId(userId: string | null, slug: string, code: string, id: string | null): void {
  const k = userKey(userId, activeSuffix(slug, code));
  if (!k) return;
  try {
    if (id) localStorage.setItem(k, id);
    else localStorage.removeItem(k);
  } catch {}
}

/* ── IMAGE marker → loading <figure> placeholder ──────────────────────── */
function renderImageMarkers(raw: string, loadingLabel = "جارٍ توليد الصورة التوضيحية…"): string {
  return raw.replace(/\[\[IMAGE:([a-f0-9]{6,16})\]\]/gi, (_m, id) =>
    `\n\n<figure class="teach-image teach-image-loading" data-image-id="${id}"><div class="teach-image-spinner"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="label">${loadingLabel}</span></div></figure>\n\n`,
  );
}

// Bake resolved images into stored content so reloaded sessions render the real
// picture (the in-memory imageMap is gone after a refresh). A still-loading or
// unknown id keeps its `[[IMAGE:id]]` marker (re-renders as a spinner). The
// escaping is minimal because urls are same-origin paths we generate ourselves.
function inlineReadyImages(content: string, imageMap: Map<string, V4ImageState>): string {
  if (!content || imageMap.size === 0) return content;
  return content.replace(/\[\[IMAGE:([a-f0-9]{6,16})\]\]/gi, (m, id) => {
    const st = imageMap.get(String(id));
    if (st?.status === "ready" && st.url) {
      const safeUrl = String(st.url).replace(/"/g, "%22");
      return `\n\n<figure class="teach-image teach-image-ready" data-image-id="${id}"><img src="${safeUrl}" alt="صورة توضيحية" loading="lazy" /></figure>\n\n`;
    }
    return m;
  });
}

/* ── VIZ tag → mount placeholder (depth-aware so nested ] survives) ──── */
function expandVizTags(raw: string): string {
  if (!raw || !raw.includes("[[VIZ:")) return raw;
  let out = "";
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf("[[VIZ:", i);
    if (start < 0) { out += raw.slice(i); break; }
    out += raw.slice(i, start);
    let j = start + 6;
    let depth = 0;
    let end = -1;
    let inString = false;
    let escape = false;
    while (j < raw.length) {
      const ch = raw[j];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === "[" || ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === "]") {
        if (depth > 0) depth--;
        else if (raw[j + 1] === "]") { end = j; break; }
      }
      j++;
    }
    if (end < 0) { // unterminated — drop the partial
      i = raw.length;
      break;
    }
    const body = raw.slice(start + 6, end).trim();
    // body format: template=NAME, payload=JSON
    const tmplMatch = body.match(/template\s*=\s*([A-Za-z0-9_-]+)/);
    const payloadIdx = body.indexOf("payload");
    let payloadJson = "{}";
    if (payloadIdx >= 0) {
      const eqIdx = body.indexOf("=", payloadIdx);
      if (eqIdx > 0) payloadJson = body.slice(eqIdx + 1).trim().replace(/,$/, "");
    }
    const tmpl = tmplMatch?.[1] ?? "";
    out += `\n\n<div data-viz-mount data-viz-template="${tmpl}" data-viz-payload="${encodeURIComponent(payloadJson)}"></div>\n\n`;
    i = end + 2;
  }
  return out;
}

/* ── ANIM tag → sandboxed-iframe mount placeholder ───────────────────────
 * The teacher emits a self-contained HTML/CSS/JS animation between
 * `[[ANIM]] … [[/ANIM]]`. We extract the raw markup BEFORE marked/DOMPurify
 * run on the message, stash it URL-encoded on a mount <div>, and later hydrate
 * it inside a sandboxed <iframe srcdoc> (see mountAnimFrames). The iframe runs
 * with `sandbox="allow-scripts"` and NO `allow-same-origin`, so the untrusted
 * teacher markup gets an opaque origin — it cannot read cookies, localStorage,
 * the parent DOM, or issue credentialed requests. This is why the raw markup
 * may safely bypass DOMPurify: isolation, not sanitization, is the boundary. */
function expandAnimTags(raw: string): string {
  if (!raw || !raw.includes("[[ANIM]]")) return raw;
  let out = "";
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf("[[ANIM]]", i);
    if (start < 0) { out += raw.slice(i); break; }
    out += raw.slice(i, start);
    const bodyStart = start + "[[ANIM]]".length;
    const end = raw.indexOf("[[/ANIM]]", bodyStart);
    if (end < 0) { i = raw.length; break; } // unterminated — drop the partial
    const body = raw.slice(bodyStart, end).trim();
    out += `\n\n<div data-anim-mount data-anim-html="${encodeURIComponent(body)}"></div>\n\n`;
    i = end + "[[/ANIM]]".length;
  }
  return out;
}

/* ── SCENE tag → lazy interactive-scene mount placeholder ────────────────
 * The teacher emits `[[SCENE: <Arabic description>]]`. We stash the
 * description URL-encoded on a mount <div>; later the SceneMount component
 * (hydrated in TeacherBubble) POSTs it to /api/v4/scene, which returns a
 * Claude-Sonnet-authored structured scene rendered by the SceneStepper. */
function expandSceneTags(raw: string): string {
  if (!raw || !raw.includes("[[SCENE:")) return raw;
  let out = "";
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf("[[SCENE:", i);
    if (start < 0) { out += raw.slice(i); break; }
    out += raw.slice(i, start);
    const bodyStart = start + "[[SCENE:".length;
    const end = raw.indexOf("]]", bodyStart);
    if (end < 0) { i = raw.length; break; } // unterminated — drop the partial
    const topic = raw.slice(bodyStart, end).trim();
    out += `\n\n<div data-scene-mount data-scene-topic="${encodeURIComponent(topic)}"></div>\n\n`;
    i = end + 2;
  }
  return out;
}

/* ── Strip incomplete protocol tags / VIZ tails mid-stream ────────────── */
function sanitizeProtocolNoise(raw: string): string {
  return raw
    // Strip partial bracketed protocol fragments at the END of the buffer.
    // We're conservative: only strip if the buffer is "tailed" by a
    // dangling bracket sequence that hasn't closed yet.
    // An ANIM block that hasn't received its [[/ANIM]] terminator yet must be
    // hidden during streaming (raw HTML/JS would otherwise flash as text).
    .replace(/\[\[ANIM\]\](?:(?!\[\[\/ANIM\]\])[\s\S])*$/g, "")
    // Hide an unterminated SCENE tail (no closing `]]` yet) so the raw marker
    // never flashes as text mid-stream. A complete tag is left intact.
    .replace(/\[\[SCENE:(?:(?!\]\])[\s\S])*$/g, "")
    .replace(/\[\[VIZ:[\s\S]*$/g, "")
    .replace(/\[\[IMAGE:[a-f0-9]*$/i, "")
    .replace(/\[(MASTERY|NEEDS_REVIEW|CREATE_LAB_ENV|LAB_MASTERED|EXAM_MASTERED|LESSON_MASTERED|SESSION_COMPLETE|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE|DIFFICULTY_UP|DIFFICULTY_DOWN)?$/i, "")
    // Strip COMPLETE simple/param protocol tags (server already strips most,
    // but be defensive in case a chunk boundary sliced one through).
    .replace(/\[(LESSON_MASTERED|SESSION_COMPLETE|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE|DIFFICULTY_UP|DIFFICULTY_DOWN)\]/g, "")
    .replace(/\[(?:MASTERY|NEEDS_REVIEW|CREATE_LAB_ENV|LAB_MASTERED|EXAM_MASTERED)[^\]]*\]/g, "");
}

function renderHtml(raw: string): string {
  if (!raw) return "";
  const cleaned = sanitizeProtocolNoise(raw);
  const withAnim = expandAnimTags(cleaned);
  const withScene = expandSceneTags(withAnim);
  const withImages = renderImageMarkers(withScene);
  const withViz = expandVizTags(withImages);
  // extractMathBlocks returns `{ text, blocks }` — destructuring it as
  // `stripped` left marked() with undefined input and crashed the page.
  const { text: stripped, blocks } = extractMathBlocks(withViz);
  const html = marked.parse(stripped ?? "", { async: false }) as string;
  const withMath = restoreMathPlaceholders(html, blocks);
  return DOMPurify.sanitize(withMath, {
    ADD_ATTR: ["target", "data-image-id", "loading", "data-viz-mount", "data-viz-template", "data-viz-payload", "data-anim-mount", "data-anim-html", "data-scene-mount", "data-scene-topic"],
    ADD_TAGS: ["figure", "figcaption"],
  });
}

/* ── Sandboxed animation frame document ──────────────────────────────────
 * Wraps the teacher's body-only markup in a full RTL dark document that
 * matches the Nukhba theme (gold/emerald on near-black) and auto-reports its
 * height to the parent via postMessage so the iframe never clips or leaves a
 * dead gap. The teacher is instructed to emit ONLY body content (HTML +
 * <style> + <script>), so this wrapper guarantees a consistent shell. */
function buildAnimDoc(bodyHtml: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<style>
  :root{--gold:#F59E0B;--emerald:#10B981;--bg:#0d1117;--card:#141a24;--ink:#e9edf5;}
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;background:transparent;color:var(--ink);
    font-family:'Tajawal','Cairo',system-ui,-apple-system,sans-serif;}
  body{padding:10px;overflow:hidden;}
  a{color:var(--gold);}
  ::-webkit-scrollbar{width:0;height:0;}
</style></head><body>
${bodyHtml}
<script>
  (function(){
    function report(){
      var h = Math.max(
        document.documentElement.scrollHeight||0,
        document.body ? document.body.scrollHeight : 0
      );
      try{ parent.postMessage({__nukhbaAnim:true, height:h}, "*"); }catch(e){}
    }
    window.addEventListener("load", report);
    if (window.ResizeObserver){ try{ new ResizeObserver(report).observe(document.body); }catch(e){} }
    [120,400,900,1800].forEach(function(t){ setTimeout(report, t); });
  })();
</script>
</body></html>`;
}

function TeacherBubble({ html, isStreaming, imageMap }: { html: string; isStreaming: boolean; imageMap: Map<string, V4ImageState> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { enhanceTeacherDom(ref.current); }, [html]);

  // FLUX image reconcile — runs on every html/imageMap change (NOT gated on
  // isStreaming, so the picture appears the instant `imageReady` arrives even
  // mid-stream). Two jobs: (1) pull a sibling <figcaption> the markdown parser
  // pushed out of the <figure> back inside it; (2) swap the loading spinner for
  // the real <img> once the matching id resolves to ready.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const figs = Array.from(root.querySelectorAll<HTMLElement>("figure[data-image-id]"));
    for (const fig of figs) {
      // (1) Caption adoption: marked() often emits the figcaption as the figure's
      // next sibling (sometimes wrapped in a <p>). Move it back inside.
      if (!fig.querySelector(":scope > figcaption.image-caption")) {
        const next = fig.nextElementSibling as HTMLElement | null;
        let cap: HTMLElement | null = null;
        let wrap: HTMLElement | null = null;
        if (next) {
          if (next.tagName === "FIGCAPTION" && next.classList.contains("image-caption")) {
            cap = next;
          } else if (
            next.tagName === "P" &&
            next.children.length === 1 &&
            next.firstElementChild instanceof HTMLElement &&
            next.firstElementChild.tagName === "FIGCAPTION" &&
            next.firstElementChild.classList.contains("image-caption")
          ) {
            cap = next.firstElementChild as HTMLElement;
            wrap = next;
          }
        }
        if (cap) {
          fig.appendChild(cap);
          if (wrap && !wrap.textContent?.trim()) wrap.remove();
        }
      }
      // (2) Spinner → <img> swap once the id resolves.
      const id = fig.getAttribute("data-image-id") || "";
      const st = id ? imageMap.get(id) : undefined;
      if (st?.status === "ready" && st.url) {
        const existing = fig.querySelector(":scope > img") as HTMLImageElement | null;
        if (existing && existing.getAttribute("src") === st.url) continue;
        const cap = fig.querySelector(":scope > figcaption.image-caption") as HTMLElement | null;
        while (fig.firstChild) fig.removeChild(fig.firstChild);
        const img = document.createElement("img");
        img.src = st.url;
        img.alt = "صورة توضيحية";
        img.loading = "eager";
        fig.appendChild(img);
        if (cap) fig.appendChild(cap);
        fig.classList.remove("teach-image-loading");
        fig.classList.add("teach-image-ready");
      }
    }
  }, [html, imageMap]);

  // VIZ React-root mounting — only on finalized (non-streaming) HTML so
  // we don't repeatedly mount/unmount during chunk arrival.
  const rootsRef = useRef<Map<Element, Root>>(new Map());
  useEffect(() => {
    if (!ref.current || isStreaming) return;
    const container = ref.current;
    const mounts = Array.from(container.querySelectorAll<HTMLElement>("[data-viz-mount]"));
    const alive = new Set<Element>();
    for (const el of mounts) {
      alive.add(el);
      const tmpl = el.getAttribute("data-viz-template") || "";
      const payloadAttr = el.getAttribute("data-viz-payload") || "";
      const Component = getVizComponent(tmpl);
      if (!Component) {
        while (el.firstChild) el.removeChild(el.firstChild);
        const warn = document.createElement("div");
        warn.className = "text-[11px] text-rose-300/80 my-2";
        warn.textContent = `⚠ قالب VIZ غير معروف: ${tmpl}`;
        el.appendChild(warn);
        continue;
      }
      let payload: any = {};
      try { payload = JSON.parse(decodeURIComponent(payloadAttr)); } catch { payload = {}; }
      let r = rootsRef.current.get(el);
      if (!r) {
        r = createRoot(el);
        rootsRef.current.set(el, r);
      }
      r.render(createElement(Component, { payload }));
    }
    for (const [node, r] of rootsRef.current.entries()) {
      if (!alive.has(node)) {
        queueMicrotask(() => { try { r.unmount(); } catch {} });
        rootsRef.current.delete(node);
      }
    }
  }, [html, isStreaming]);
  useEffect(() => () => {
    for (const r of rootsRef.current.values()) {
      queueMicrotask(() => { try { r.unmount(); } catch {} });
    }
    rootsRef.current.clear();
  }, []);

  // ── SCENE React-root mounting (interactive actor-story stepper) ───────
  // Same lifecycle as VIZ: mount only on finalized HTML, reuse roots across
  // re-renders, and unmount roots whose host node has gone away.
  const sceneRootsRef = useRef<Map<Element, Root>>(new Map());
  useEffect(() => {
    if (!ref.current || isStreaming) return;
    const container = ref.current;
    const mounts = Array.from(container.querySelectorAll<HTMLElement>("[data-scene-mount]"));
    const alive = new Set<Element>();
    for (const el of mounts) {
      alive.add(el);
      let topic = "";
      try { topic = decodeURIComponent(el.getAttribute("data-scene-topic") || ""); } catch { topic = ""; }
      if (!topic.trim()) continue;
      let r = sceneRootsRef.current.get(el);
      if (!r) {
        r = createRoot(el);
        sceneRootsRef.current.set(el, r);
      }
      r.render(createElement(SceneMount, { topic }));
    }
    for (const [node, r] of sceneRootsRef.current.entries()) {
      if (!alive.has(node)) {
        queueMicrotask(() => { try { r.unmount(); } catch {} });
        sceneRootsRef.current.delete(node);
      }
    }
  }, [html, isStreaming]);
  useEffect(() => () => {
    for (const r of sceneRootsRef.current.values()) {
      queueMicrotask(() => { try { r.unmount(); } catch {} });
    }
    sceneRootsRef.current.clear();
  }, []);

  // ── Sandboxed-animation mounting ──────────────────────────────────────
  // For each `[[ANIM]]` mount we inject an isolated <iframe srcdoc>. The
  // iframe → height map lets one window-level message listener resize the
  // right frame as its content settles (animations grow after first paint).
  const animFramesRef = useRef<Map<HTMLIFrameElement, HTMLElement>>(new Map());
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // Sandboxed srcdoc frames have an opaque origin → e.origin === "null".
      // Reject anything else so a real cross-origin page can't spoof a resize.
      if (e.origin !== "null") return;
      const d = e.data;
      if (!d || d.__nukhbaAnim !== true || !Number.isFinite(d.height)) return;
      for (const frame of animFramesRef.current.keys()) {
        if (frame.contentWindow === e.source) {
          const h = Math.min(Math.max(d.height, 80), 1400);
          frame.style.height = `${h + 4}px`;
          break;
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!ref.current || isStreaming) return;
    const container = ref.current;
    const mounts = Array.from(container.querySelectorAll<HTMLElement>("[data-anim-mount]"));
    for (const el of mounts) {
      if (el.dataset.animApplied === "1") continue;
      el.dataset.animApplied = "1";
      let body = "";
      try { body = decodeURIComponent(el.getAttribute("data-anim-html") || ""); } catch { body = ""; }
      if (!body.trim()) continue;
      const frame = document.createElement("iframe");
      frame.className = "nukhba-anim-frame";
      // allow-scripts WITHOUT allow-same-origin → opaque origin: untrusted
      // teacher markup cannot touch parent cookies/DOM/storage.
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("loading", "lazy");
      frame.setAttribute("title", "رسم متحرك توضيحي");
      frame.srcdoc = buildAnimDoc(body);
      el.appendChild(frame);
      animFramesRef.current.set(frame, el);
    }
  }, [html, isStreaming]);
  useEffect(() => () => { animFramesRef.current.clear(); }, []);

  return (
    <div
      ref={ref}
      className="ai-msg prose prose-invert prose-sm max-w-none leading-relaxed text-white/90"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function V4Lesson() {
  const [, params] = useRoute<{ slug: string; code: string }>("/specialty/:slug/lesson/:code");
  const slug = params?.slug ?? "";
  const code = decodeURIComponent(params?.code ?? "");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const userId = user ? String(user.id) : null;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  // Live FLUX image state, keyed by the id in `[[IMAGE:id]]` markers. The
  // backend streams `imagePlaceholder` (spinner) then `imageReady` (same-origin
  // URL); TeacherBubble swaps the real <img> in once a marker's status is ready.
  const [imageMap, setImageMap] = useState<Map<string, V4ImageState>>(new Map());
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [lessonMeta, setLessonMeta] = useState<MapLessonRef | null>(null);
  const [terminal, setTerminal] = useState<TerminalEffects | null>(null);
  const [insufficientGems, setInsufficientGems] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletExists, setWalletExists] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [ideOpen, setIdeOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Show the integrated Nukhba code editor only for code-oriented specialties
  // (programming / web / cyber / ERP…). Accounting / food specialties keep the
  // plain chat composer. Keyword-matched on the specialty slug.
  const isProgramming = useMemo(
    () => /(python|بايثون|web|ويب|program|برمج|cod|js|javascript|java|cyber|سايبر|أمن|امن|شبك|network|software|تطوير|تقني|\bit\b|erp)/i.test(slug),
    [slug],
  );

  // Defense-in-depth: any time the authenticated user changes (logout +
  // login on the same tab, or initial mount with a different user than
  // last load), wipe ALL in-memory lesson state so prior-account messages
  // can never be rendered to the new user — even if the AuthProvider
  // hasn't finished its localStorage rotation yet.
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastUserIdRef.current !== null && lastUserIdRef.current !== userId) {
      // Abort any in-flight /v4/teach stream BEFORE updating lastUserIdRef
      // so the request's `stillValid()` guard sees the rotation.
      try { inflightRef.current?.abort(); } catch {}
      inflightRef.current = null;
      autoKickedRef.current = false;
      setStreaming(false);
      setMessages([]);
      setSessions([]);
      setActiveSessionId(null);
      setTerminal(null);
      setError(null);
      setInsufficientGems(false);
      setWalletBalance(null);
      setWalletExists(null);
      setLessonMeta(null);
    }
    lastUserIdRef.current = userId;
  }, [userId]);

  // Hard cleanup on unmount — abort any in-flight stream.
  useEffect(() => {
    return () => {
      try { inflightRef.current?.abort(); } catch {}
      inflightRef.current = null;
    };
  }, []);

  // Re-read the authoritative wallet balance from the server. Used after a
  // stream failure so the displayed balance never drifts from reality.
  const refreshWalletBalance = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/v4/path/${encodeURIComponent(slug)}/wallet`, {
        credentials: "include",
      });
      if (!r.ok) return;
      const w = await r.json();
      setWalletExists(!!w?.exists);
      setWalletBalance(typeof w?.gemsBalance === "number" ? w.gemsBalance : 0);
    } catch {}
  }, [slug]);

  // Load lesson metadata + initial wallet snapshot + prior sessions list.
  // userId is in the dep list so a user rotation triggers a clean rehydrate
  // against the new account's scoped storage (fixes in-memory leak).
  //
  // IMPORTANT – state reset strategy:
  //   1. We reset all lesson-specific state synchronously at the top (before
  //      the async IIFE) so that same-instance navigation (slug/code changing
  //      while the component stays mounted) never shows stale terminal banners,
  //      stale error messages, or a frozen streaming state from the prior lesson.
  //      This also resets autoKickedRef so the new lesson gets its auto-kick.
  //   2. We call setLessonMeta AFTER all awaits, together with setMessages and
  //      every other state setter, in a single synchronous batch.  If we called
  //      setLessonMeta before `await walletRes.json()`, React could flush a
  //      render where lessonMeta is set but messages is still [], causing the
  //      auto-kick effect to fire and start a new session on top of the one we
  //      are about to restore from localStorage.
  useEffect(() => {
    if (!slug || !code || !userId) return;

    // ── Synchronous reset (runs before any await) ────────────────────────
    // Abort any in-flight stream from the previous lesson first so the
    // stillValid() guard in sendMessage stops writing to state.
    try { inflightRef.current?.abort(); } catch {}
    inflightRef.current = null;
    autoKickedRef.current = false;
    setLessonMeta(null);
    setBootError(null);
    setMessages([]);
    setSessions([]);
    setActiveSessionId(null);
    setTerminal(null);
    setError(null);
    setInsufficientGems(false);
    setStreaming(false);
    setSessionsOpen(false);
    setAttachedImage(null);
    // Wallet state back to "not loaded yet" so the header pill hides during
    // the fetch and cannot show a stale balance from a different lesson.
    setWalletExists(null);
    setWalletBalance(null);
    // ─────────────────────────────────────────────────────────────────────

    let cancelled = false;
    (async () => {
      try {
        const [mapRes, walletRes] = await Promise.all([
          fetch(`/api/v4/path/${encodeURIComponent(slug)}/map`, { credentials: "include" }),
          fetch(`/api/v4/path/${encodeURIComponent(slug)}/wallet`, { credentials: "include" }),
        ]);
        if (!mapRes.ok) throw new Error(`map_http_${mapRes.status}`);
        const d = await mapRes.json();
        if (cancelled) return;

        let found: { name: string; status: string } | null = null;
        for (const st of d?.map?.stages ?? []) {
          for (const un of st?.units ?? []) {
            for (const ls of un?.lessons ?? []) {
              if (ls?.code === code) found = { name: ls.name, status: ls.status };
            }
          }
        }
        if (!found) { setBootError("هذا الدرس غير متاح في خريطتك."); return; }
        if (found.status === "locked") { setBootError("هذا الدرس مقفل — أكمل ما قبله أولاً."); return; }

        // Parse wallet response (still needs its own await — do it here before
        // touching any state so we only write state once at the end).
        let newWalletExists = false;
        let newWalletBalance = 0;
        if (walletRes.ok) {
          try {
            const w = await walletRes.json();
            if (cancelled) return;
            newWalletExists = !!w?.exists;
            newWalletBalance = typeof w?.gemsBalance === "number" ? w.gemsBalance : 0;
          } catch {}
        }

        // Hydrate prior sessions from localStorage (synchronous — no await).
        const list = loadSessions(userId, slug, code);
        const aid = loadActiveId(userId, slug, code);
        const active = aid ? list.find(s => s.id === aid) : null;

        if (cancelled) return;

        // ── Batch all state updates in one synchronous block ─────────────
        // React batches these into a single render so the auto-kick effect
        // sees lessonMeta AND messages simultaneously, preventing it from
        // firing on a stored session.
        setLessonMeta({ code, name: found.name });
        setWalletExists(newWalletExists);
        setWalletBalance(newWalletBalance);
        setSessions(list);
        if (active && active.messages.length > 0) {
          setMessages(active.messages);
          setActiveSessionId(active.id);
        }
        // ─────────────────────────────────────────────────────────────────
      } catch {
        if (!cancelled) setBootError("تعذّر تحميل بيانات الدرس.");
      }
    })();
    return () => { cancelled = true; };
  }, [slug, code, userId]);

  // Persist messages on every change.
  useEffect(() => {
    if (!userId || !slug || !code || !activeSessionId || messages.length === 0) return;
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === activeSessionId);
      const now = Date.now();
      // Never persist the multi-MB base64 thumbnail to localStorage — drop the
      // `image` field; the placeholder text remains so resumed sessions read OK.
      // For assistant turns, bake any resolved FLUX image (same-origin URL, tiny)
      // into the stored content so a reloaded session still shows the picture
      // instead of a stuck spinner (imageMap is in-memory only).
      const persistMessages = messages.map(m => {
        if (m.role === "assistant") {
          return { role: m.role, content: inlineReadyImages(m.content, imageMap) };
        }
        return m.image ? { role: m.role, content: m.content } : m;
      });
      const updated: StoredSession = idx >= 0
        ? { ...prev[idx], messages: persistMessages, updatedAt: now }
        : { id: activeSessionId, createdAt: now, updatedAt: now, messages: persistMessages };
      const next = idx >= 0
        ? [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)]
        : [updated, ...prev];
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessions(userId, slug, code, next);
      return next;
    });
  }, [messages, activeSessionId, userId, slug, code]);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // First-turn auto-kick (only when no resumed session has prior messages).
  const autoKickedRef = useRef(false);
  useEffect(() => {
    if (!lessonMeta || !userId || autoKickedRef.current || streaming || messages.length > 0) return;
    autoKickedRef.current = true;
    if (!activeSessionId) {
      const newId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      setActiveSessionId(newId);
      saveActiveId(userId, slug, code, newId);
    }
    void sendMessage("ابدأ معي شرح الدرس بأسلوبك التفاعلي.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonMeta, userId]);

  // Auto-redirect to map after the lesson is completed (mastered + no next).
  const redirectTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!terminal) return;
    if (terminal.lessonMastered) {
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
      const delay = terminal.nextLessonCode ? 5000 : 7000;
      redirectTimerRef.current = window.setTimeout(() => {
        if (terminal.nextLessonCode) {
          navigate(`/specialty/${encodeURIComponent(slug)}/lesson/${encodeURIComponent(terminal.nextLessonCode)}`);
        } else {
          navigate(`/specialty/${encodeURIComponent(slug)}/map`);
        }
      }, delay);
    }
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [terminal, slug, navigate]);

  function startNewSession() {
    if (!userId) return;
    abortInflight();
    setStreaming(false);
    if (redirectTimerRef.current) { window.clearTimeout(redirectTimerRef.current); redirectTimerRef.current = null; }
    autoKickedRef.current = false;
    const newId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setActiveSessionId(newId);
    saveActiveId(userId, slug, code, newId);
    setMessages([]);
    setTerminal(null);
    setError(null);
    setInsufficientGems(false);
    setSessionsOpen(false);
  }

  function resumeSession(id: string) {
    if (!userId) return;
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    abortInflight();
    setStreaming(false);
    if (redirectTimerRef.current) { window.clearTimeout(redirectTimerRef.current); redirectTimerRef.current = null; }
    autoKickedRef.current = true;
    setActiveSessionId(id);
    saveActiveId(userId, slug, code, id);
    setMessages(s.messages);
    setTerminal(null);
    setError(null);
    setInsufficientGems(false);
    setSessionsOpen(false);
  }

  // In-flight stream tracking — required to cancel + ignore late writes
  // on user rotation / new-session / unmount. Without this, an SSE chunk
  // arriving after auth identity changes could repopulate the UI under a
  // different account.
  const inflightRef = useRef<AbortController | null>(null);
  const requestUserRef = useRef<string | null>(null);

  function abortInflight() {
    if (inflightRef.current) {
      try { inflightRef.current.abort(); } catch {}
      inflightRef.current = null;
    }
  }

  async function sendMessage(rawText: string, imageDataUrl?: string) {
    const text = rawText.trim();
    if ((!text && !imageDataUrl) || streaming || !lessonMeta || !userId) return;
    setError(null);
    setInsufficientGems(false);
    setTerminal(null);

    // Strip any base64 image out of the history we ship (the backend filters
    // to {role, content} anyway, but this keeps the request body small).
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    // Display content keeps NO base64 (only a placeholder); the raw data URL is
    // carried separately in `image` for the in-session thumbnail and is sent to
    // the backend ONLY via the wire `message` field (this turn only).
    const displayContent = text || "📎 صورة مرفقة";
    const wireMessage = imageDataUrl
      ? (text ? `${text}\n\n![صورة مرفقة](${imageDataUrl})` : `![صورة مرفقة](${imageDataUrl})`)
      : text;
    const userMsg: ChatMsg = imageDataUrl
      ? { role: "user", content: displayContent, image: imageDataUrl }
      : { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setAttachedImage(null);
    setStreaming(true);

    const requestUserId = userId;
    requestUserRef.current = requestUserId;
    const controller = new AbortController();
    inflightRef.current = controller;
    // Identity guard: if the user has rotated since the request started,
    // skip every state write so prior-account stream output can never
    // surface in a new account's UI.
    const stillValid = () => requestUserRef.current === requestUserId
      && lastUserIdRef.current === requestUserId
      && !controller.signal.aborted;

    try {
      const res = await fetch("/api/v4/teach", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({
          slug,
          lessonCode: lessonMeta.code,
          message: wireMessage,
          history,
        }),
      });

      if (!res.ok || !res.body) {
        if (!stillValid()) return;
        if (res.status === 402) setInsufficientGems(true);
        // Prefer a server-provided Arabic message; otherwise show a friendly
        // retry message instead of a raw "http_500" the student can't parse.
        let msg = FRIENDLY_RETRY_MSG;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!stillValid()) { try { reader.cancel(); } catch {}; return; }
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of raw.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt: any;
            try { evt = JSON.parse(payload); } catch { continue; }
            if (!stillValid()) return;
            if (evt?.done) {
              const t = evt as TerminalEffects;
              setTerminal(t);
              if (t.insufficientGems || t.noWallet) setInsufficientGems(true);
              if (typeof t.balanceAfter === "number") {
                setWalletBalance(t.balanceAfter);
                setWalletExists(true);
              }
              continue;
            }
            if (evt?.error || evt?.friendlyMessage) {
              setError(evt.friendlyMessage || evt.error);
              continue;
            }
            if (evt?.imagePlaceholder?.id) {
              const id = String(evt.imagePlaceholder.id);
              setImageMap((prev) => {
                const next = new Map(prev);
                next.set(id, { status: "loading" });
                return next;
              });
              continue;
            }
            if (evt?.imageReady?.id && typeof evt.imageReady.url === "string") {
              const id = String(evt.imageReady.id);
              const url = evt.imageReady.url as string;
              setImageMap((prev) => {
                const next = new Map(prev);
                next.set(id, { status: "ready", url });
                return next;
              });
              continue;
            }
            if (typeof evt?.content === "string") {
              acc += evt.content;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") next[next.length - 1] = { ...last, content: acc };
                return next;
              });
            }
          }
        }
      }
    } catch (e: any) {
      if (controller.signal.aborted) return;
      if (!stillValid()) return;
      // Surface a friendly Arabic message. Server-sent Arabic errors (already
      // human-readable) pass through; bare network/technical strings are
      // replaced with a generic retry prompt.
      const raw = String(e?.message ?? e);
      const looksTechnical = /^http_|^Failed to fetch|NetworkError|TypeError|fetch/i.test(raw);
      setError(looksTechnical || !/[\u0600-\u06FF]/.test(raw) ? FRIENDLY_RETRY_MSG : raw);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.content) next.pop();
        return next;
      });
      // The turn may have partially charged (or the gate may have changed the
      // balance) before failing — refresh the wallet so the displayed balance
      // never drifts from the server's truth.
      void refreshWalletBalance();
    } finally {
      // Guard the finalizer: only flip `streaming` if this request is
      // still the current one. Otherwise an aborted/rotated request
      // could clobber UI state of a newer session/user.
      if (stillValid()) {
        setStreaming(false);
        if (inflightRef.current === controller) inflightRef.current = null;
      }
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input, attachedImage ?? undefined);
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("الملف المرفق ليس صورة."); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError("الصورة كبيرة جداً (الحد ٤ ميجابايت)."); return; }
    const reader = new FileReader();
    reader.onload = () => { const url = reader.result; if (typeof url === "string") { setError(null); setAttachedImage(url); } };
    reader.onerror = () => setError("تعذّر قراءة الصورة.");
    reader.readAsDataURL(file);
  }

  // Keep a live ref to sendMessage so the (stable) share handler always calls
  // the latest closure without re-subscribing CodeEditorPanel's effects.
  const sendMessageRef = useRef<(t: string) => void>(() => {});
  sendMessageRef.current = (t: string) => { void sendMessage(t); };

  // Student shares their code + run output with the teacher → injected as a
  // normal turn so the teacher sees the exact code and result and can react to
  // errors. Mirrors the legacy subject.tsx share flow.
  const handleShareWithTeacher = useCallback((codeStr: string, language: string, output: string) => {
    const langLabels: Record<string, string> = {
      html: "HTML 🌐", css: "CSS 🎨", javascript: "JavaScript ⚡",
      typescript: "TypeScript 💙", python: "Python 🐍", java: "Java ☕",
      cpp: "C++ ⚙️", c: "C 🔩", go: "Go 🐹", rust: "Rust 🦀",
      ruby: "Ruby 💎", php: "PHP 🐘", bash: "Bash 🐚",
      dart: "Dart 🎯", kotlin: "Kotlin 🤖", sql: "SQL 🗄️",
    };
    const label = langLabels[language] || language;
    const msg = `راجع معي الكود اللي كتبته بلغة ${label}:\n\`\`\`${language}\n${codeStr}\n\`\`\`\nالناتج:\n${output || "(لا يوجد ناتج)"}`;
    setIdeOpen(false);
    sendMessageRef.current(msg);
  }, []);

  if (bootError) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6" style={{ direction: "rtl" }}>
        <div className="text-5xl">⚠️</div>
        <p className="text-white/70 text-center max-w-sm">{bootError}</p>
        <button
          onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm"
        >
          رجوع للخريطة
        </button>
      </div>
    );
  }
  if (!lessonMeta) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] bg-background text-white flex flex-col"
      style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5 shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
            className="text-white/50 hover:text-white"
            title="رجوع للخريطة"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-xl">📚</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-violet-300/80 font-semibold">درس · {lessonMeta.code}</div>
            <div className="font-black text-sm truncate">{lessonMeta.name}</div>
          </div>

          {/* Wallet pill */}
          {walletExists !== null && (
            <button
              onClick={() => navigate("/subscription")}
              title={walletExists ? "رصيد جواهرك في هذا التخصص" : "لا توجد محفظة لهذا التخصص"}
              className={`flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1 border ${
                walletExists
                  ? (walletBalance ?? 0) <= 50
                    ? "bg-rose-500/10 border-rose-400/30 text-rose-200"
                    : "bg-amber-500/10 border-amber-400/30 text-amber-200"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              <Gem className="w-3.5 h-3.5" />
              <span className="font-black tabular-nums">{walletBalance ?? 0}</span>
            </button>
          )}

          {/* Nukhba code editor toggle (code-oriented specialties only) */}
          {isProgramming && (
            <button
              onClick={() => setIdeOpen(true)}
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
              title="محرر الأكواد"
            >
              <Code2 className="w-4 h-4" />
            </button>
          )}

          {/* Sessions menu */}
          <div className="relative">
            <button
              onClick={() => setSessionsOpen(v => !v)}
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
              title="الجلسات السابقة"
            >
              <History className="w-4 h-4" />
            </button>
            {sessionsOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-40">
                <button
                  onClick={startNewSession}
                  disabled={streaming}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-amber-200 hover:bg-white/5 border-b border-white/5 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  <span>بدء جلسة جديدة</span>
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {sessions.length === 0 && (
                    <div className="px-3 py-3 text-xs text-white/40 text-center">لا توجد جلسات سابقة</div>
                  )}
                  {sessions.map(s => {
                    const first = s.messages.find(m => m.role === "user")?.content ?? "—";
                    const d = new Date(s.updatedAt);
                    const dateStr = `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    return (
                      <button
                        key={s.id}
                        onClick={() => resumeSession(s.id)}
                        disabled={streaming}
                        className={`w-full text-right px-3 py-2 text-xs hover:bg-white/5 border-b border-white/5 last:border-0 disabled:opacity-40 ${
                          s.id === activeSessionId ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-white/80 truncate flex-1">{first.slice(0, 60)}</div>
                          <div className="text-white/40 shrink-0">{dateStr}</div>
                        </div>
                        <div className="text-white/40 text-[10px] mt-0.5">{s.messages.length} رسالة</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {terminal && terminal.charged === false && !insufficientGems && (
            <div className="text-[10px] bg-rose-500/15 border border-rose-400/30 text-rose-200 rounded-full px-2 py-1">
              لم يُخصم
            </div>
          )}
        </div>
      </div>

      {/* Chat scroller */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/50 text-sm py-12">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-amber-400/70" />
              جاري تجهيز جلستك...
            </div>
          )}
          {messages.map((m, i) => {
            const isLast = i === messages.length - 1;
            return (
              <MessageBubble key={i} msg={m} isStreaming={streaming && isLast && m.role === "assistant"} imageMap={imageMap} />
            );
          })}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="rounded-3xl bg-white/5 border border-white/10 px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              </div>
            </div>
          )}

          {terminal?.masteryGateBlocked && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              المعلم حاول إنهاء الدرس، لكن بعض المفاهيم لم تُتقن بعد
              ({terminal.masteryGateBlocked.missing.map(m => `#${m.conceptIndex}=${m.score}`).join(", ")}).
              تابع الشرح ليكتمل الإتقان.
            </div>
          )}

          {terminal?.lessonMastered && (
            <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center space-y-3">
              <div className="text-4xl">🏆</div>
              <div className="text-emerald-200 font-black text-lg">أتقنت الدرس!</div>
              <div className="text-white/70 text-sm">
                {terminal.nextLessonCode
                  ? "فُتح الدرس التالي. هل تريد المتابعة؟"
                  : "ممتاز! هذا آخر درس مفتوح لديك حالياً."}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                {terminal.nextLessonCode && (
                  <button
                    onClick={() => {
                      const next = terminal.nextLessonCode!;
                      setTerminal(null);
                      setMessages([]);
                      autoKickedRef.current = false;
                      navigate(`/specialty/${encodeURIComponent(slug)}/lesson/${encodeURIComponent(next)}`);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black text-sm flex items-center justify-center gap-2"
                  >
                    الدرس التالي
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  العودة للخريطة
                </button>
              </div>
            </div>
          )}

          {insufficientGems && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100 flex items-center gap-3">
              <Gem className="w-5 h-5 text-rose-300 shrink-0" />
              <div className="flex-1">
                {terminal?.noWallet
                  ? "لا توجد محفظة جواهر لهذا التخصص بعد — اشترك لبدء الجلسات."
                  : "رصيد الجواهر غير كافٍ لمتابعة الجلسة."}
              </div>
              <button
                onClick={() => navigate("/subscription")}
                className="px-3 py-1.5 rounded-lg bg-rose-500/30 text-white text-xs font-bold"
              >
                شحن
              </button>
            </div>
          )}

          {error && !insufficientGems && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-white/5 bg-background/95 backdrop-blur-md"
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          {attachedImage && (
            <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 w-fit">
              <img src={attachedImage} alt="الصورة المرفقة" className="w-12 h-12 rounded-lg object-cover" />
              <span className="text-xs text-white/70">صورة مرفقة</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="text-white/50 hover:text-rose-300 p-1 rounded-lg hover:bg-white/5"
                title="إزالة الصورة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickImage}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="shrink-0 h-12 w-12 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-amber-300 hover:border-amber-400/40 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              title="إرفاق صورة"
              aria-label="إرفاق صورة"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!streaming) void sendMessage(input, attachedImage ?? undefined);
                }
              }}
              disabled={streaming}
              rows={1}
              placeholder="اكتب ردّك للمعلم..."
              className="flex-1 resize-none bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 disabled:opacity-60 max-h-40"
              style={{ minHeight: 48 }}
            />
            <button
              type="submit"
              disabled={streaming || (!input.trim() && !attachedImage)}
              className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              title="إرسال"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </form>

      {/* Nukhba IDE overlay — Monaco editor + run + share-with-teacher */}
      {ideOpen && (
        <div className="fixed inset-0 z-[80] bg-[#080a11] flex flex-col" style={{ direction: "ltr" }}>
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-background shrink-0"
            style={{ direction: "rtl" }}
          >
            <div className="flex items-center gap-2 text-white/80 text-sm font-bold">
              <Code2 className="w-4 h-4 text-amber-400" />
              محرر نُخبة
            </div>
            <button
              onClick={() => setIdeOpen(false)}
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
              title="إغلاق المحرر"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
            <div className="p-3 sm:p-4 w-full min-w-0">
              <CodeEditorPanel
                sectionContent=""
                subjectId={slug}
                onShareWithTeacher={handleShareWithTeacher}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MessageBubble = ({ msg, isStreaming, imageMap }: { msg: ChatMsg; isStreaming: boolean; imageMap: Map<string, V4ImageState> }) => {
  const html = useMemo(() => renderHtml(msg.content), [msg.content]);
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-tl-lg bg-gradient-to-bl from-violet-500/30 to-violet-700/20 border border-violet-400/30 px-4 py-3 text-sm text-white/95 leading-relaxed whitespace-pre-wrap">
          {msg.image && (
            <img
              src={msg.image}
              alt="صورة مرفقة"
              className="mb-2 max-h-48 w-auto rounded-xl border border-white/10 object-contain"
            />
          )}
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-3xl rounded-tr-lg bg-white/5 border border-white/10 px-4 py-3">
        {html ? <TeacherBubble html={html} isStreaming={isStreaming} imageMap={imageMap} /> : <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
      </div>
    </div>
  );
};
