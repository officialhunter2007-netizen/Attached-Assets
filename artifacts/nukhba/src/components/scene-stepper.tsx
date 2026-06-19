/**
 * SceneStepper — polished player for a Claude-Sonnet-authored animated
 * HTML/CSS/JS motion graphic + an Arabic step-by-step caption track.
 *
 * The teaching model emits `[[SCENE: <Arabic description>]]`. The lesson page
 * turns each marker into a `<SceneMount topic=… />` which lazily POSTs the
 * description to `/api/v4/scene` (Claude-Sonnet-authored, server-cached) and
 * renders the returned scene here.
 *
 * The scene's `html` is a self-contained, professionally-designed animated
 * HTML/CSS/JS motion graphic (smooth CSS/JS animation, brand palette, RTL
 * Arabic labels) — far richer and smoother than the old SMIL-SVG. It runs
 * inside a sandboxed `<iframe srcdoc>` (allow-scripts, NO allow-same-origin):
 * the opaque origin is the security boundary, so the untrusted markup cannot
 * read cookies, storage, or the parent DOM. The `steps` are a short caption
 * track the student walks through (prev/next ONLY — no autoplay) to read the
 * pedagogy alongside the animation.
 *
 * WHY a module-level cache (`_sceneCache`):
 *   `dangerouslySetInnerHTML` in TeacherBubble replaces the entire DOM subtree
 *   on every `html` change (image updates, streaming end, etc.). This destroys
 *   the `data-scene-mount` DOM node identity, causing SceneMount to unmount and
 *   remount on a NEW node — resetting React state to "loading" and re-triggering
 *   the fetch. The module-level map survives remounts: a remounted SceneMount
 *   for the same (lessonName, topic) pair immediately restores the cached scene
 *   with no loading flash.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ChevronRight, ChevronLeft, RotateCcw, AlertTriangle,
} from "lucide-react";

// ── Types (mirror the server Zod schema) ────────────────────────────────────
type SceneStep = {
  title: string;
  explanation: string;
  note?: string;
};
export type Scene = {
  title: string;
  subtitle?: string;
  html: string;
  steps: SceneStep[];
};

// ── Module-level scene cache ─────────────────────────────────────────────────
// Keyed by `lessonName\u0000topic` (mirrors the server hash basis).
// Survives SceneMount remounts so a re-created mount node for the same topic
// shows the scene instantly (no loading flash).
const _sceneCache = new Map<string, Scene>();

function makeCacheKey(topic: string, lessonName?: string): string {
  return `${(lessonName || "").trim().toLowerCase()}\u0000${topic.trim().toLowerCase()}`;
}

// Wrap the model's body-only HTML/CSS/JS in a full RTL dark document that
// matches the Nukhba theme and auto-reports its height to the parent via
// postMessage so the iframe never clips or leaves a dead gap.
function buildSceneDoc(bodyHtml: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<style>
  :root{--gold:#F59E0B;--emerald:#10B981;--bg:#0d1117;--card:#141a24;--ink:#e9edf5;--muted:#9aa4b2;}
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
      try{ parent.postMessage({__nukhbaScene:true, height:h}, "*"); }catch(e){}
    }
    window.addEventListener("load", report);
    if (window.ResizeObserver){ try{ new ResizeObserver(report).observe(document.body); }catch(e){} }
    [120,400,900,1800].forEach(function(t){ setTimeout(report, t); });
  })();
</script>
</body></html>`;
}

// Isolated animation surface. The sandboxed srcdoc frame has an opaque origin
// (e.origin === "null"); we only accept resize messages from our own frame's
// contentWindow so a real cross-origin page can't spoof a resize.
function SceneAnimFrame({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== "null") return;
      const d: any = e.data;
      if (!d || d.__nukhbaScene !== true || !Number.isFinite(d.height)) return;
      if (frameRef.current && frameRef.current.contentWindow === e.source) {
        setHeight(Math.min(Math.max(d.height, 120), 1400) + 4);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <iframe
      ref={frameRef}
      title="رسم متحرك توضيحي"
      loading="lazy"
      sandbox="allow-scripts"
      srcDoc={buildSceneDoc(html)}
      style={{ width: "100%", height, border: "0", display: "block" }}
    />
  );
}

// ── The player ──────────────────────────────────────────────────────────────
// Manual-only navigation: the student presses التالي / السابق.
// No autoplay — autoplay is disabled so the student reads each step before advancing.
export function SceneStepper({ scene }: { scene: Scene }) {
  const steps = scene.steps;
  const [idx, setIdx] = useState(0);

  const clampedIdx = Math.min(idx, steps.length - 1);
  const step = steps[clampedIdx];
  const isFirst = clampedIdx === 0;
  const isLast = clampedIdx >= steps.length - 1;

  const goNext = useCallback(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const goPrev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const restart = useCallback(() => setIdx(0), []);

  return (
    <div
      dir="rtl"
      className="my-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 shadow-lg"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-bold text-amber-300">
            <span className="text-base">🎬</span>
            <span className="truncate">{scene.title}</span>
          </div>
          {scene.subtitle && (
            <div className="mt-0.5 text-[11px] text-white/55 line-clamp-2">{scene.subtitle}</div>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70">
          خطوة {clampedIdx + 1} من {steps.length}
        </span>
      </div>

      {/* Animated HTML/CSS/JS stage (sandboxed iframe) */}
      {scene.html ? (
        <div className="scene-anim-stage relative w-full overflow-hidden rounded-xl bg-black/25">
          <SceneAnimFrame html={scene.html} />
        </div>
      ) : (
        <div className="rounded-xl bg-black/25 p-6 text-center text-[12px] text-white/50">
          تعذّر عرض الرسم
        </div>
      )}

      {/* Step explanation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={clampedIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-amber-500/95 px-1.5 py-0.5 text-[9px] font-bold text-amber-950">
              {clampedIdx + 1}
            </span>
            <h4 className="text-[13px] font-bold text-amber-200">{step.title}</h4>
          </div>
          <p className="text-[12.5px] leading-relaxed text-white/85">{step.explanation}</p>
          {step.note && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-500/10 p-2 text-[11.5px] text-rose-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{step.note}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`الذهاب للخطوة ${i + 1}`}
            className={[
              "h-1.5 rounded-full transition-all",
              i === clampedIdx ? "w-5 bg-amber-400" : "w-1.5 bg-white/20 hover:bg-white/40",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Controls — manual navigation only */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-1 rounded-lg bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/12 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </button>

        {isLast ? (
          <button
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/15"
          >
            <RotateCcw className="h-4 w-4" />
            من البداية
          </button>
        ) : (
          <div className="text-[11px] text-white/35">
            اضغط التالي للمتابعة
          </div>
        )}

        <button
          onClick={goNext}
          disabled={isLast}
          className="flex items-center gap-1 rounded-lg bg-amber-500/90 px-3 py-1.5 text-[12px] font-bold text-amber-950 transition hover:bg-amber-400 disabled:opacity-30"
        >
          التالي
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Lazy mount: fetch the scene, handle loading / error / fallback ──────────
type FetchState =
  | { status: "loading" }
  | { status: "ready"; scene: Scene }
  | { status: "error"; topic: string };

export function SceneMount({ topic, lessonName }: { topic: string; lessonName?: string }) {
  const cacheKey = makeCacheKey(topic, lessonName);

  // Initialise directly from the module-level cache so a remounted SceneMount
  // (due to dangerouslySetInnerHTML replacing the host DOM node) shows the scene
  // immediately without any loading flash.
  const [state, setState] = useState<FetchState>(() => {
    const hit = _sceneCache.get(cacheKey);
    return hit ? { status: "ready", scene: hit } : { status: "loading" };
  });

  useEffect(() => {
    // If already cached (either from initial state or a previous mount), no-op.
    if (_sceneCache.has(cacheKey)) {
      setState({ status: "ready", scene: _sceneCache.get(cacheKey)! });
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/v4/scene", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
          body: JSON.stringify({ topic, lessonName }),
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`http ${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        if (typeof data?.scene?.html === "string" && data?.scene?.steps?.length) {
          const scene = data.scene as Scene;
          _sceneCache.set(cacheKey, scene);
          setState({ status: "ready", scene });
        } else {
          setState({ status: "error", topic });
        }
      } catch {
        if (!cancelled) setState({ status: "error", topic });
      }
    })();
    return () => { cancelled = true; ctrl.abort(); };
  }, [cacheKey, topic, lessonName]);

  if (state.status === "loading") {
    return (
      <div dir="rtl" className="my-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-[12.5px] text-white/65">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        جاري تجهيز الرسم التوضيحي المتحرّك…
      </div>
    );
  }

  if (state.status === "error") {
    // Graceful degrade — show the description as a simple card so the lesson
    // is never blocked by a generation failure (e.g. missing API key).
    return (
      <div dir="rtl" className="my-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-bold text-amber-300">
          <span>🎬</span> مشهد توضيحي
        </div>
        <p className="text-[12.5px] leading-relaxed text-white/75">{state.topic}</p>
      </div>
    );
  }

  return <SceneStepper scene={state.scene} />;
}

export default SceneMount;
