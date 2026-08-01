// ─────────────────────────────────────────────────────────────────────────────
// QuizViewer — iframe wrapper for self-grading HTML quizzes
//
// Props:
//   quizId   — DB id of the quiz
//   quizType — 'unit' | 'level' | 'stage'
//   title    — display title (optional)
//   onClose  — called when the student closes the viewer
//   onScoreSubmitted — called with the persisted score after successful submit
//
// Flow:
//   1. Renders an iframe pointing to /api/v4/<type>-quizzes/<id>/view
//   2. The backend injects window.submitScore(n) into the HTML
//   3. When the quiz calls submitScore(n), this component receives the
//      postMessage {type:'NUKHBA_QUIZ_SCORE', quizId, quizType, score}
//   4. POSTs to /api/v4/quiz-scores and shows a score badge
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";

export type QuizType = "unit" | "level" | "stage";

interface Props {
  quizId: number;
  quizType: QuizType;
  title?: string;
  onClose: () => void;
  onScoreSubmitted?: (score: number, bestScore: number) => void;
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; score: number; bestScore: number }
  // Keep the score so "أعد المحاولة" can actually re-POST it — the iframe
  // only emits submitScore once, so losing it would lose the attempt.
  | { status: "error"; message: string; score: number };

const TYPE_LABEL: Record<QuizType, string> = {
  unit:  "اختبار الوحدة",
  level: "اختبار المستوى",
  stage: "اختبار المرحلة",
};

const TYPE_COLOR: Record<QuizType, string> = {
  unit:  "#0EA5E9",
  level: "#8B5CF6",
  stage: "#6366F1",
};

function ScoreRing({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 85 ? "#22C55E" :
    score >= 60 ? "#D4AF37" : "#EF4444";

  return (
    <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle
        cx="42" cy="42" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="42" y="42"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "42px 42px",
          fill: color,
          fontSize: "16px",
          fontWeight: 800,
          fontFamily: "Cairo, sans-serif",
        }}
      >
        {score}%
      </text>
    </svg>
  );
}

export default function QuizViewer({
  quizId,
  quizType,
  title,
  onClose,
  onScoreSubmitted,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  // Ref-based gate: state setters alone can't stop two async handlers racing.
  const submitLockRef = useRef(false);
  const color = TYPE_COLOR[quizType];

  const quizUrl = `/api/v4/${quizType}-quizzes/${quizId}/view`;

  // ── score POST (used by both the message handler and the retry button) ────
  async function postScore(score: number) {
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/v4/quiz-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quiz_type: quizType, quiz_id: quizId, score }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const rec = data.scoreRecord ?? {};
      const best = Number(rec.best_score ?? score);
      setSubmitState({ status: "done", score, bestScore: best });
      onScoreSubmitted?.(score, best);
    } catch (err: any) {
      setSubmitState({ status: "error", message: err?.message ?? "حدث خطأ في حفظ الدرجة", score });
    }
  }
  const postScoreRef = useRef(postScore);
  postScoreRef.current = postScore;

  // ── postMessage listener ──────────────────────────────────────────────────
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Only trust messages coming from OUR quiz iframe.
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (
        !d ||
        d.type     !== "NUKHBA_QUIZ_SCORE" ||
        d.quizId   !== quizId               ||
        d.quizType !== quizType
      ) return;

      const score = Number(d.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) return;

      // One submission per quiz attempt (retry goes through postScore directly)
      if (submitLockRef.current) return;
      submitLockRef.current = true;

      void postScoreRef.current(score);
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [quizId, quizType]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isDone = submitState.status === "done";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ direction: "rtl" }}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
        // Intentionally NOT clickable — an accidental backdrop tap mid-quiz
        // would throw away the student's answers. Close via X / إغلاق / Esc.
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative z-10 flex flex-col m-3 md:m-6 rounded-2xl overflow-hidden"
        style={{
          flex: 1,
          background: "rgba(7,9,18,0.98)",
          border: `1px solid ${color}33`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px ${color}1a`,
          minHeight: 0,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${color}1a`, color, border: `1px solid ${color}33` }}
            >
              {TYPE_LABEL[quizType]}
            </span>
            {title && (
              <span className="text-sm font-bold text-white truncate">{title}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── iframe ─────────────────────────────────────────────────── */}
        <div className="relative flex-1 min-h-0 bg-white">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0c18]">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color }} />
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={quizUrl}
            title={title ?? TYPE_LABEL[quizType]}
            onLoad={() => setIframeLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: iframeLoaded ? "block" : "none",
            }}
            // X-Frame-Options: SAMEORIGIN is set by the backend, so same-origin iframes work.
            // No sandbox attribute here so the quiz HTML can run scripts freely.
          />
        </div>

        {/* ── Score overlay (once submitted) ─────────────────────────── */}
        <AnimatePresence>
          {(submitState.status === "submitting" ||
            submitState.status === "done"        ||
            submitState.status === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-6 pt-3"
              style={{ background: "linear-gradient(to top, rgba(7,9,18,0.97) 60%, transparent)" }}
            >
              {submitState.status === "submitting" && (
                <div className="flex items-center gap-2 px-5 py-3 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                  <span className="text-sm text-white/60">جارٍ حفظ درجتك…</span>
                </div>
              )}

              {submitState.status === "done" && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 250, damping: 18 }}
                  className="flex flex-col items-center gap-3"
                >
                  <ScoreRing score={submitState.score} />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#22C55E" }} />
                      <span className="text-sm font-bold text-white">تم حفظ درجتك!</span>
                    </div>
                    {submitState.bestScore > submitState.score && (
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        أفضل درجة سابقة: {submitState.bestScore}%
                      </p>
                    )}
                    {submitState.bestScore === submitState.score && submitState.bestScore > 0 && (
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        هذه أفضل درجة لك 🎉
                      </p>
                    )}
                    <button
                      onClick={onClose}
                      className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                    >
                      إغلاق
                    </button>
                  </div>
                </motion.div>
              )}

              {submitState.status === "error" && (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">{submitState.message}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (submitState.status === "error") void postScore(submitState.score);
                    }}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    أعد المحاولة
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
