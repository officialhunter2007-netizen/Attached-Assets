// ─────────────────────────────────────────────────────────────────────────────
// v4 task #3 — Custom path setup flow.  LUXURY REDESIGN.
//
// One-page state machine:
//   1. diagnostic   — 5 fixed Arabic questions, sequential chat-style UI
//   2. start-choice — "ابدأ من الصفر" vs "اختبار تحديد المستوى"
//   3. placement    — adaptive MCQ test, stops on 2 consecutive fails
//   4. result       — shows starting level + redirects back to subject
//
// Network: all mutating calls send X-Nukhba-Csrf:1 to satisfy the v4 CSRF
// middleware (custom header pattern; same-origin enforced server-side).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ChevronLeft, Send, Rocket, Target, Check, X as XIcon,
  Trophy, RefreshCw, Sparkles, MessageCircle, MapPin, Gem, Brain,
  BookOpen, ArrowLeft,
} from "lucide-react";
import { extractAskOptions } from "@/lib/ask-options";

type Phase = "loading" | "diagnostic" | "start-choice" | "placement" | "result" | "error";

type DiagState = { sessionId: number; currentIndex: number; currentQuestion: string; totalQuestions: number; done: boolean };

type PlacementScope = "level" | "stage" | "unit";
type PlacementProgress = {
  phase: PlacementScope | "done";
  answered: number;
  levelProbes: number;
  stageProbes: number;
  unitProbes: number;
};
type PlacementQuestion = {
  id: number;
  targetLevelIndex: number;
  kind: string;
  prompt: string;
  choices: string[] | null;
};
type PlacementResult = {
  startMode: "placement";
  startingLevelIndex: number;
  levelIndex: number;
  stageCode: string | null;
  unitCode: string | null;
  currentLessonCode: string | null;
  precision: "unit" | "level";
  reason: string;
};
type PlacementState =
  | {
      kind: "ask";
      sessionId: number;
      scope: PlacementScope;
      scopeCode: string;
      phaseLabel: string;
      progress: PlacementProgress;
      question: PlacementQuestion;
    }
  | { kind: "finalize"; sessionId: number; progress: PlacementProgress; result: PlacementResult };

type PlacementFinalizeInfo = {
  precision: "unit" | "level";
  levelIndex: number;
  stageCode: string | null;
  unitCode: string | null;
  currentLessonCode: string | null;
  reason: string;
};
type FinalizeResponse = {
  ok: boolean;
  path: {
    startMode: string;
    startingLevelIndex: number;
    placementUnitCode: string | null;
    currentLessonCode: string | null;
    unlockedLessonCodes: string[];
  };
  placement: PlacementFinalizeInfo | null;
};

const CSRF_HEADERS = { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" };

async function postJson<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: CSRF_HEADERS,
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return (await r.json()) as T;
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const ALPHA_LABELS = ["أ", "ب", "ج", "د", "هـ", "و"];

/**
 * Renders a placement/diagnostic question prompt with proper code formatting.
 * - Triple-backtick fenced blocks → styled <pre> code block (LTR, monospace)
 * - Single-backtick spans → inline <code>
 * - Everything else → plain whitespace-preserved text
 */
function RenderPrompt({ text, size = "base" }: { text: string; size?: "sm" | "base" }) {
  const fontSize = size === "sm" ? "text-sm" : "text-[15px]";
  const segments = text.split(/(```(?:[\w]*)\n?[\s\S]*?```)/g);
  return (
    <>
      {segments.map((seg, idx) => {
        const blockMatch = seg.match(/^```(?:[\w]*)\n?([\s\S]*?)```$/);
        if (blockMatch) {
          return (
            <pre
              key={idx}
              className="my-3 p-4 rounded-xl bg-black/70 border border-emerald/20 text-emerald/85 text-sm font-mono leading-relaxed overflow-x-auto shadow-[inset_0_0_24px_rgba(16,185,129,0.06)]"
              style={{ direction: "ltr", textAlign: "left" }}
            >
              {blockMatch[1].trim()}
            </pre>
          );
        }
        const parts = seg.split(/(`[^`\n]+`)/g);
        return (
          <span key={idx} className={`whitespace-pre-wrap ${fontSize} leading-relaxed`}>
            {parts.map((p, j) => {
              const inlineMatch = p.match(/^`([^`\n]+)`$/);
              if (inlineMatch) {
                return (
                  <code
                    key={j}
                    className="px-2 py-0.5 mx-0.5 rounded-md bg-black/60 border border-emerald/20 text-emerald/80 text-[0.83em] font-mono"
                    style={{ direction: "ltr" }}
                  >
                    {inlineMatch[1]}
                  </code>
                );
              }
              return <span key={j}>{p}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PathCustom() {
  const [, params] = useRoute<{ slug: string }>("/path/:slug/custom");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [diag, setDiag] = useState<DiagState | null>(null);
  const [transcript, setTranscript] = useState<{ q: string; a: string }[]>([]);
  const [diagInput, setDiagInput] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);

  const [placement, setPlacement] = useState<PlacementState | null>(null);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementGenerating, setPlacementGenerating] = useState(false);
  const [placementPickedIdx, setPlacementPickedIdx] = useState<number | null>(null);
  const [placementShortAnswer, setPlacementShortAnswer] = useState("");
  const [finalLevel, setFinalLevel] = useState<number | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [finalPlacement, setFinalPlacement] = useState<PlacementFinalizeInfo | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [transcript, diag, phase]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/path/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const data = await r.json();
        if (cancelled) return;
        if (!data.available) {
          setErrMsg("التخصص غير متاح بعد.");
          setPhase("error");
          return;
        }
        const d = await postJson<DiagState>(`/api/v4/path/${encodeURIComponent(slug)}/diagnostic/start`, {});
        if (cancelled) return;
        setDiag(d);
        setPhase(d.done ? "start-choice" : "diagnostic");
      } catch (e: any) {
        if (cancelled) return;
        setErrMsg(String(e?.message ?? e));
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  async function submitDiagAnswer(optionText?: string) {
    if (!diag || diagBusy) return;
    const answerText = optionText ?? diagInput.trim();
    if (!answerText) return;
    const sentQ = diag.currentQuestion;
    const sentA = answerText;
    setDiagBusy(true);
    setTranscript((t) => [...t, { q: sentQ, a: sentA }]);
    setDiagInput("");
    try {
      const r = await postJson<{ done: boolean; currentIndex?: number; currentQuestion?: string; totalQuestions: number }>(
        `/api/v4/path/${encodeURIComponent(slug)}/diagnostic/answer`,
        { sessionId: diag.sessionId, answer: sentA },
      );
      if (r.done) {
        await postJson(`/api/v4/path/${encodeURIComponent(slug)}/diagnostic/finish`, { sessionId: diag.sessionId });
        setPhase("start-choice");
      } else {
        setDiag({
          sessionId: diag.sessionId,
          currentIndex: r.currentIndex!,
          currentQuestion: r.currentQuestion!,
          totalQuestions: r.totalQuestions,
          done: false,
        });
      }
    } catch {
      setErrMsg("ما قدرنا نحفظ جوابك. حاول مجدداً.");
      if (!optionText) setDiagInput(sentA);
      setTranscript((t) => t.slice(0, -1));
    } finally {
      setDiagBusy(false);
    }
  }

  async function chooseFromZero() {
    setPlacementBusy(true);
    try {
      const fr = await postJson<FinalizeResponse>(
        `/api/v4/path/${encodeURIComponent(slug)}/placement/finalize`,
        { startMode: "from_zero" },
      );
      setFinalLevel(fr.path.startingLevelIndex);
      setUnlockedCount(Array.isArray(fr.path.unlockedLessonCodes) ? fr.path.unlockedLessonCodes.length : 0);
      setFinalPlacement(fr.placement);
      setPhase("result");
    } catch {
      setErrMsg("تعذّر حفظ اختيارك. حاول مجدداً.");
    } finally {
      setPlacementBusy(false);
    }
  }

  async function startPlacement() {
    setPlacementGenerating(true);
    setPhase("placement");
    try {
      // Generate AI-authored questions from the curriculum content first.
      // If admin-authored questions exist (≥13), the server returns them
      // without an AI call. Otherwise Haiku produces 20 targeted questions.
      const genRes = await postJson<{ questionCount: number; source: string }>(
        `/api/v4/path/${encodeURIComponent(slug)}/placement/generate`,
        {},
      );
      if (genRes.questionCount < 10) {
        setErrMsg(`تعذّر توليد أسئلة كافية للاختبار (${genRes.questionCount} سؤال فقط). الرجاء المحاولة لاحقاً.`);
        setPlacementGenerating(false);
        setPhase("start-choice");
        return;
      }
    } catch {
      setErrMsg("تعذّر تجهيز اختبار تحديد المستوى. الرجاء المحاولة لاحقاً.");
      setPlacementGenerating(false);
      setPhase("start-choice");
      return;
    }
    setPlacementGenerating(false);
    setPlacementBusy(true);

    try {
      const r = await postJson<PlacementState>(`/api/v4/path/${encodeURIComponent(slug)}/placement/next`, {});
      handlePlacementResponse(r);
    } catch {
      setErrMsg("تعذّر بدء اختبار تحديد المستوى.");
      setPhase("start-choice");
    } finally {
      setPlacementBusy(false);
    }
  }

  function handlePlacementResponse(r: PlacementState) {
    setPlacement(r);
    setPlacementPickedIdx(null);
    setPlacementShortAnswer("");
  }

  async function submitPlacementAnswer() {
    if (!placement || placement.kind !== "ask" || placementBusy) return;
    const q = placement.question;
    let rawAnswer: string | number;
    if (q.kind === "mcq" && Array.isArray(q.choices) && q.choices.length > 0) {
      if (placementPickedIdx === null) return;
      rawAnswer = placementPickedIdx;
    } else {
      if (!placementShortAnswer.trim()) return;
      rawAnswer = placementShortAnswer.trim();
    }
    setPlacementBusy(true);
    try {
      const r = await postJson<PlacementState>(
        `/api/v4/path/${encodeURIComponent(slug)}/placement/next`,
        { rawAnswer },
      );
      handlePlacementResponse(r);
      if (r.kind === "finalize") {
        const fr = await postJson<FinalizeResponse>(
          `/api/v4/path/${encodeURIComponent(slug)}/placement/finalize`,
          { startMode: "placement" },
        );
        setFinalLevel(fr.path.startingLevelIndex);
        setUnlockedCount(Array.isArray(fr.path.unlockedLessonCodes) ? fr.path.unlockedLessonCodes.length : 0);
        setFinalPlacement(fr.placement ?? r.result);
        setPhase("result");
      }
    } catch {
      setErrMsg("تعذّر إرسال إجابتك. حاول مجدداً.");
    } finally {
      setPlacementBusy(false);
    }
  }

  const progressPct = useMemo(() => {
    if (phase === "loading") return 0;
    if (phase === "diagnostic" && diag) return Math.round((transcript.length / diag.totalQuestions) * 45);
    if (phase === "start-choice") return 55;
    if (phase === "placement") return 78;
    if (phase === "result") return 100;
    return 0;
  }, [phase, diag, transcript.length]);

  return (
    <div
      className="min-h-[100dvh] bg-background text-white"
      style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
    >
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── Header: back + progress bar ────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">رجوع</span>
          </button>
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-amber-300 via-gold to-amber-500"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ boxShadow: "0 0 8px rgba(245,158,11,0.5)" }}
            />
          </div>
          <span className="text-[11px] text-white/30 tabular-nums font-mono">{progressPct}%</span>
        </div>

        {/* ── Error toast ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {errMsg && phase !== "error" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 text-xs text-red-300/90 bg-red-950/40 border border-red-500/25 rounded-xl px-4 py-2.5 flex items-center justify-between"
            >
              <span>{errMsg}</span>
              <button onClick={() => setErrMsg(null)} className="text-red-300/50 hover:text-red-200 mr-2">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {phase === "loading" && (
          <div className="py-24 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-gold/60" />
              </div>
              <div className="absolute inset-0 rounded-2xl animate-ping bg-gold/5" />
            </div>
            <span className="text-white/40 text-sm">جارٍ التجهيز…</span>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {phase === "error" && (
          <div className="py-24 text-center space-y-5">
            <div className="text-6xl">⚠️</div>
            <p className="text-white/60">{errMsg ?? "حدث خطأ غير متوقع."}</p>
            <button
              onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
              className="px-6 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm hover:bg-white/12 transition-colors"
            >
              رجوع
            </button>
          </div>
        )}

        {/* ── Diagnostic chat ─────────────────────────────────────────────── */}
        {phase === "diagnostic" && diag && (
          <DiagnosticChat
            diag={diag}
            diagBusy={diagBusy}
            diagInput={diagInput}
            transcript={transcript}
            scrollerRef={scrollerRef}
            setDiagInput={setDiagInput}
            submitDiagAnswer={submitDiagAnswer}
          />
        )}

        {/* ── Start choice ─────────────────────────────────────────────────── */}
        {phase === "start-choice" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-3"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-amber-500/10 border border-gold/25 mb-2"
                style={{ boxShadow: "0 0 32px rgba(245,158,11,0.15)" }}
              >
                <span className="text-3xl">🎯</span>
              </motion.div>
              <h2 className="text-2xl font-black text-white">جاهز نبدأ — من وين؟</h2>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                استلمنا إجاباتك التشخيصية. اختر طريقة البداية التي تناسبك.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* From zero */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={chooseFromZero}
                disabled={placementBusy}
                className="group text-right relative overflow-hidden rounded-2xl border border-emerald/25 hover:border-emerald/50 p-5 transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald/50 to-emerald/10 rounded-l-2xl" />
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald/15 border border-emerald/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Rocket className="w-5 h-5 text-emerald" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-base text-white mb-1">ابدأ من الصفر</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      يفتح لك الدرس الأول فقط. تتدرّج خطوة بخطوة بدون أي تخطٍّ.
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Placement test */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 }}
                onClick={startPlacement}
                disabled={placementBusy}
                className="group text-right relative overflow-hidden rounded-2xl border border-gold/25 hover:border-gold/50 p-5 transition-all duration-300 disabled:opacity-50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(255,255,255,0.02) 100%)" }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold/60 to-gold/10 rounded-l-2xl" />
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-base text-white">اختبار تحديد المستوى</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gold/15 border border-gold/25 text-gold/80 font-bold">مُوصى به</span>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">
                      أسئلة ذكية متدرّجة تكتشف مستواك بدقة وتوصلك لنقطة بدايتك المثالية.
                    </p>
                  </div>
                </div>
              </motion.button>
            </div>

            {placementBusy && (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ التجهيز…</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Placement test ─────────────────────────────────────────────── */}
        {phase === "placement" && placementGenerating && (
          <div className="py-12 text-center space-y-4">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-gold/20"
              style={{ background: "linear-gradient(120deg, rgba(139,92,246,0.08) 0%, rgba(245,158,11,0.08) 100%)" }}
            >
              <Loader2 className="w-5 h-5 animate-spin text-gold" />
              <span className="text-white/70 text-sm font-bold">جاري إعداد أسئلة اختبار تحديد المستوى…</span>
            </motion.div>
            <p className="text-white/30 text-xs">يتم توليد 20 سؤالاً ذكياً من محتوى المنهج لتحديد مستواك بدقة</p>
          </div>
        )}
        {phase === "placement" && placement?.kind === "ask" && (
          <div className="space-y-5 py-1">

            {/* Phase stepper */}
            <div className="flex items-center justify-center gap-0">
              {(["level", "stage", "unit"] as const).map((sc, i) => {
                const labels = { level: "المستوى", stage: "المرحلة", unit: "الوحدة" } as const;
                const order = { level: 0, stage: 1, unit: 2 } as const;
                const active = placement.scope === sc;
                const done = order[placement.scope] > order[sc];
                return (
                  <div key={sc} className="flex items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <motion.div
                        animate={active ? {
                          boxShadow: [
                            "0 0 0px rgba(245,158,11,0)",
                            "0 0 20px rgba(245,158,11,0.5)",
                            "0 0 0px rgba(245,158,11,0)",
                          ],
                        } : {}}
                        transition={{ duration: 2.2, repeat: Infinity }}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                          done
                            ? "bg-emerald/20 border-emerald text-emerald"
                            : active
                            ? "bg-gold/15 border-gold text-gold"
                            : "bg-white/[0.03] border-white/10 text-white/25"
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
                      </motion.div>
                      <span className={`text-[10px] font-bold tracking-wide transition-colors ${
                        done ? "text-emerald/80" : active ? "text-gold/90" : "text-white/20"
                      }`}>
                        {labels[sc]}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className="relative w-14 h-0.5 mx-1 mb-4 rounded-full bg-white/[0.08]">
                        <motion.div
                          className="absolute inset-y-0 right-0 rounded-full bg-emerald/60"
                          animate={{ width: done ? "100%" : "0%" }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Meta info bar */}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                placement.scope === "unit"
                  ? "text-violet-300 bg-violet-500/10 border-violet-500/25"
                  : placement.scope === "stage"
                  ? "text-sky-300 bg-sky-500/10 border-sky-500/25"
                  : "text-gold bg-gold/10 border-gold/25"
              }`}>
                {placement.phaseLabel}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-pulse inline-block" />
                <span className="tabular-nums">{placement.progress.answered}</span>
                <span>سؤال</span>
              </div>
            </div>

            {/* Question card — key on question.id so it re-animates on each new question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={placement.question.id}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="relative"
              >
                {/* Glow border effect */}
                <div
                  className="absolute -inset-[1px] rounded-2xl opacity-70 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,158,11,0.3) 0%, transparent 50%, rgba(139,92,246,0.15) 100%)",
                  }}
                />
                <div
                  className="relative rounded-2xl border border-gold/15 overflow-hidden"
                  style={{ background: "hsl(222,28%,8%)" }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-white/[0.05]">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-gold/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white/35 font-medium">اختبار تحديد المستوى</div>
                    </div>
                    <div className="text-[10px] font-mono text-white/25 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                      L{placement.question.targetLevelIndex}
                    </div>
                  </div>

                  {/* Question body */}
                  <div className="px-5 py-4 text-white/90">
                    <RenderPrompt text={placement.question.prompt} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* MCQ choices */}
            {placement.question.kind === "mcq" && Array.isArray(placement.question.choices) && (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {placement.question.choices.map((c, i) => {
                    const sel = placementPickedIdx === i;
                    return (
                      <motion.button
                        key={`${placement.question.id}-${i}`}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 + i * 0.065, type: "spring", stiffness: 300, damping: 26 }}
                        onClick={() => !placementBusy && setPlacementPickedIdx(i)}
                        className={`w-full text-right flex items-center gap-3.5 rounded-xl px-4 py-3.5 border transition-all duration-200 active:scale-[0.985] ${
                          sel
                            ? "border-gold/50 shadow-[0_0_24px_rgba(245,158,11,0.14),inset_0_0_0_1px_rgba(245,158,11,0.1)]"
                            : "border-white/8 hover:border-white/18 hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
                        }`}
                        style={
                          sel
                            ? { background: "linear-gradient(120deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.05) 100%)" }
                            : { background: "rgba(255,255,255,0.025)" }
                        }
                      >
                        {/* Arabic letter badge */}
                        <div className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all duration-200 ${
                          sel
                            ? "bg-gold border-gold text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                            : "bg-white/[0.04] border-white/12 text-white/30"
                        }`}>
                          {ALPHA_LABELS[i] ?? i + 1}
                        </div>

                        {/* Choice text */}
                        <div className={`flex-1 text-sm leading-relaxed transition-colors ${sel ? "text-white" : "text-white/70"}`}>
                          <RenderPrompt text={c} size="sm" />
                        </div>

                        {/* Selected tick */}
                        <AnimatePresence>
                          {sel && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="shrink-0 w-6 h-6 rounded-full bg-gold flex items-center justify-center"
                            >
                              <Check className="w-3.5 h-3.5 text-black" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Short answer */}
            {placement.question.kind !== "mcq" && (
              <div className="relative">
                <div
                  className="absolute -inset-[1px] rounded-xl opacity-40 pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, transparent 100%)" }}
                />
                <textarea
                  value={placementShortAnswer}
                  onChange={(e) => setPlacementShortAnswer(e.target.value)}
                  placeholder="اكتب إجابتك هنا…"
                  rows={4}
                  className="relative w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm outline-none resize-none placeholder:text-white/20 focus:border-violet-500/35 transition-colors leading-relaxed"
                />
              </div>
            )}

            {/* Submit button */}
            <motion.button
              onClick={submitPlacementAnswer}
              disabled={
                placementBusy ||
                (placement.question.kind === "mcq" ? placementPickedIdx === null : !placementShortAnswer.trim())
              }
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden rounded-xl py-4 font-black text-[15px] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
            >
              <div className="absolute inset-0 bg-gradient-to-l from-amber-300 via-gold to-amber-500" />
              <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(to left, rgba(255,255,255,0.08) 0%, transparent 100%)" }}
              />
              <div className="relative flex items-center justify-center gap-2 text-black">
                {placementBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>إجابة والسؤال التالي</span>
                    <ChevronLeft className="w-5 h-5" />
                  </>
                )}
              </div>
            </motion.button>
          </div>
        )}

        {/* ── Result ─────────────────────────────────────────────────────── */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6 space-y-6 text-center"
          >
            {/* Trophy */}
            <div className="relative flex justify-center">
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.6) 0%, transparent 70%)" }}
              />
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.1 }}
                className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  boxShadow: "0 0 60px rgba(245,158,11,0.45), 0 20px 40px rgba(0,0,0,0.4)",
                }}
              >
                <Trophy className="w-14 h-14 text-black/80" />
              </motion.div>
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-1.5"
            >
              <h1 className="text-3xl font-black text-white">
                {finalPlacement && finalPlacement.precision === "unit" && finalPlacement.unitCode
                  ? "🎯 وجدنا مستواك بالضبط!"
                  : "جهّزنا مسارك! 🎉"}
              </h1>
              <p className="text-white/45 text-sm">
                {finalPlacement && finalPlacement.precision === "unit" && finalPlacement.unitCode
                  ? "حسب اختبار تحديد المستوى — هذه النتيجة الأنسب لك"
                  : "اكتشفنا مستواك الحقيقي — إليك نتيجتك"}
              </p>
            </motion.div>

            {/* Result details card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="relative overflow-hidden rounded-2xl border border-gold/20 text-right"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-gold to-gold/10 rounded-r-2xl" />
              <div className="px-5 py-4 space-y-3">
                {/* Unit-precise placement */}
                {finalPlacement && finalPlacement.precision === "unit" && finalPlacement.unitCode ? (
                  <>
                    <div className="bg-emerald/10 rounded-xl border border-emerald/25 p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 mb-2">
                        <MapPin className="w-4 h-4 text-emerald" />
                        <span className="text-emerald text-sm font-bold">
                          هذه الوحدة مناسبة جداً لمستواك الحالي
                        </span>
                      </div>
                      <div className="text-base font-black text-white mb-1">
                        الوحدة {finalPlacement.unitCode}
                      </div>
                      <p className="text-white/50 text-xs">
                        ابدأ منها — وما قبلها مفتوح لك للمراجعة في أي وقت
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "المستوى", val: `${finalPlacement.levelIndex}` },
                        { label: "المرحلة", val: finalPlacement.stageCode ?? "—" },
                        { label: "الوحدة", val: finalPlacement.unitCode },
                      ].map((item) => (
                        <div key={item.label} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07] text-center">
                          <div className="text-lg font-black text-gold">{item.val}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gold/5 rounded-xl border border-gold/15 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="w-4 h-4 text-gold/70 shrink-0" />
                        <span className="text-gold/80 text-xs font-bold">نقطة البداية</span>
                      </div>
                      <div className="font-mono text-white/80 text-sm">{finalPlacement.currentLessonCode}</div>
                      <p className="text-white/40 text-[11px] mt-1.5 leading-relaxed">
                        ✅ فتحنا لك كل ما قبله للمراجعة ({unlockedCount} درساً)<br/>
                        🔓 وما بعده يُفتح تباعاً مع تقدّمك
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-white/50 font-bold">دقة — مستوى</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center shrink-0">
                        <span className="text-4xl font-black text-gold">{finalLevel}</span>
                      </div>
                      <div className="flex-1 text-right">
                        <div className="font-black text-white text-lg mb-1">المستوى {finalLevel}</div>
                        <p className="text-white/45 text-sm leading-relaxed">
                          {finalLevel === 1
                            ? "ستبدأ من الدرس الأول. خطوة خطوة بإذن الله."
                            : `فتحنا لك الدروس من المستوى ١ حتى ${finalLevel} (${unlockedCount} درساً).`}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Gem reward */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-3 bg-gradient-to-l from-violet-500/10 to-gold/[0.06] border border-gold/20 rounded-xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center shrink-0">
                <Gem className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1 text-right">
                <div className="font-bold text-gold text-sm">+١٠٠ جوهرة هدية الترحيب</div>
                <div className="text-[11px] text-white/40 mt-0.5">تكفي لبدء أول جلسات تعلّمك الآن</div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72 }}
              className="flex flex-col gap-2.5 pt-1"
            >
              {/* Primary: start from the determined point */}
              <button
                onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                className="relative w-full overflow-hidden rounded-xl py-4 font-black text-[15px]"
                style={{ boxShadow: "0 8px 24px rgba(245,158,11,0.25)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-l from-amber-300 via-gold to-amber-500" />
                <div className="relative flex items-center justify-center gap-2 text-black">
                  <span>🚀 ابدأ رحلتك التعليمية</span>
                </div>
              </button>
              <div className="flex gap-2">
                {/* Map: see all content including unlocked previous material */}
                <button
                  onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white/80 text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4 text-gold/70" />
                  تصفّح الخريطة
                </button>
                {/* Review previous level content */}
                <button
                  onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                  className="flex-1 py-3 rounded-xl bg-emerald/10 border border-emerald/20 text-emerald text-sm font-bold hover:bg-emerald/15 transition-colors flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  راجع السابق
                </button>
                {/* Retake placement test */}
                <button
                  onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
                  className="px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/08 text-white/30 text-xs transition-colors flex items-center gap-1.5 border border-white/[0.06]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DiagnosticChat — luxury chat-style diagnostic Q&A.
// ─────────────────────────────────────────────────────────────────────────────
function DiagnosticChat({
  diag,
  diagBusy,
  diagInput,
  transcript,
  scrollerRef,
  setDiagInput,
  submitDiagAnswer,
}: {
  diag: DiagState;
  diagBusy: boolean;
  diagInput: string;
  transcript: { q: string; a: string }[];
  scrollerRef: RefObject<HTMLDivElement | null>;
  setDiagInput: (v: string) => void;
  submitDiagAnswer: (optionText?: string) => void;
}) {
  const diagAsk = useMemo(() => extractAskOptions(diag.currentQuestion), [diag.currentQuestion]);
  const progressPct = Math.round(((diag.currentIndex + 1) / diag.totalQuestions) * 100);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col" style={{ maxHeight: "calc(100dvh - 9rem)" }}>

      {/* Header */}
      <div className="shrink-0 text-center pb-3 mb-2">
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/20"
          style={{ background: "linear-gradient(120deg, rgba(139,92,246,0.08) 0%, rgba(245,158,11,0.08) 100%)" }}
        >
          <span className="text-base">🤖</span>
          <span className="text-sm text-white/75 font-bold">نتعرّف عليك</span>
          <Sparkles className="w-3.5 h-3.5 text-gold/70" />
          <span className="text-[11px] text-white/35 tabular-nums font-mono">{progressPct}%</span>
        </motion.div>
      </div>

      {/* Step dots */}
      <div className="shrink-0 flex items-center justify-center gap-1.5 mb-4">
        {Array.from({ length: diag.totalQuestions }, (_, i) => {
          const done = i < diag.currentIndex;
          const cur = i === diag.currentIndex;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <motion.div
                animate={cur ? { scale: [1, 1.18, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${
                  done
                    ? "bg-emerald/20 border-emerald/50 text-emerald"
                    : cur
                    ? "bg-gold/15 border-gold/50 text-gold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-white/[0.03] border-white/8 text-white/20"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </motion.div>
              {i < diag.totalQuestions - 1 && (
                <div className="w-5 h-0.5 rounded-full bg-white/8">
                  <div className={`h-full rounded-full bg-emerald/50 transition-all ${i < diag.currentIndex ? "w-full" : "w-0"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable transcript */}
      <div ref={scrollerRef} className="flex-1 min-h-[6rem] overflow-y-auto space-y-3 pb-2">
        <AnimatePresence>
          {transcript.map((m, i) => {
            const tq = extractAskOptions(m.q);
            return (
              <motion.div
                key={`t-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl rounded-tr-sm p-3.5 text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">🤖</span>
                    <span className="text-[10px] text-gold/50 font-bold">سؤال {i + 1}</span>
                  </div>
                  <div className="text-white/75 whitespace-pre-wrap text-[13px]">{tq.stripped || m.q}</div>
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm p-3.5 text-sm leading-relaxed mr-8 border border-gold/15"
                  style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(139,92,246,0.06) 100%)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">🧑‍🎓</span>
                    <span className="text-[10px] text-gold/40 font-bold">إجابتك</span>
                  </div>
                  <div className="text-white/85 whitespace-pre-wrap text-[13px]">{m.a}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Current question */}
        <motion.div
          key={`q-${diag.currentIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="relative"
        >
          <div
            className="absolute -inset-[1px] rounded-2xl pointer-events-none opacity-60"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, transparent 60%, rgba(139,92,246,0.1) 100%)" }}
          />
          <div
            className="relative rounded-2xl rounded-tr-sm border border-gold/18 p-4"
            style={{ background: "hsl(222,28%,9%)" }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <motion.span
                animate={{ rotate: [0, 14, -14, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3.5 }}
                className="text-xl"
              >🤖</motion.span>
              <span className="text-[11px] text-gold/75 font-bold">
                سؤال {diag.currentIndex + 1} من {diag.totalQuestions}
              </span>
              <span className="flex-1" />
              <span className="text-[10px] text-violet-300/50 bg-violet-500/10 border border-violet-400/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> اختر أو اكتب
              </span>
            </div>
            <div className="text-white/88 text-[14px] leading-relaxed whitespace-pre-wrap">
              {diagAsk.stripped || diagAsk.ask?.question || diag.currentQuestion.replace(/\[\[\s*ASK_OPTIONS\s*:[\s\S]*?\]\](?!\])/g, "").trim()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Clickable option buttons */}
      {diagAsk.ask && !diagBusy && (
        <motion.div
          key={`opts-${diag.currentIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="shrink-0 space-y-2 pt-3 pb-1 border-t border-white/[0.05]"
        >
          {diagAsk.ask.options.map((opt, i) => {
            const label = opt.replace(/^[^\s]+\s/, "");
            const emoji = opt.match(/^(\S+)/)?.[1] ?? "";
            const hasEmoji = /^[\p{Emoji}]{1,2}$/u.test(emoji);
            return (
              <motion.button
                key={`opt-${i}`}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.055, type: "spring", stiffness: 280, damping: 24 }}
                onClick={() => submitDiagAnswer(opt)}
                className="w-full text-right px-4 py-3 rounded-xl border bg-white/[0.02] hover:bg-gold/8 hover:border-gold/40 text-white/80 text-sm transition-all active:scale-[0.98] flex items-center gap-3 border-white/8 hover:shadow-[0_0_20px_rgba(245,158,11,0.07)]"
              >
                <span className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-sm shrink-0 font-bold">
                  {hasEmoji ? emoji : ALPHA_LABELS[i] ?? i + 1}
                </span>
                <span className="flex-1 leading-snug">{label}</span>
                <ChevronLeft className="w-3.5 h-3.5 text-white/15 shrink-0" />
              </motion.button>
            );
          })}
          {diagAsk.ask.allowOther && (
            <motion.button
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + diagAsk.ask.options.length * 0.055 }}
              onClick={() => setTimeout(() => inputRef.current?.focus(), 50)}
              className="w-full text-right px-4 py-2.5 rounded-xl border border-dashed border-violet-400/20 bg-violet-500/[0.03] hover:bg-violet-500/8 hover:border-violet-400/40 text-violet-200/60 text-xs transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <span className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-400/15 flex items-center justify-center text-sm shrink-0">✏️</span>
              <span className="flex-1">غير ذلك — أكتب إجابتي</span>
              <MessageCircle className="w-3 h-3 text-violet-300/25 shrink-0" />
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Text input */}
      <div className="shrink-0 pt-2">
        <div
          className="flex items-end gap-2 border border-white/8 rounded-2xl p-2"
          style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 -8px 24px rgba(0,0,0,0.35)" }}
        >
          <textarea
            ref={inputRef}
            value={diagInput}
            onChange={(e) => setDiagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitDiagAnswer();
              }
            }}
            placeholder="أو اكتب إجابتك هنا…"
            rows={2}
            disabled={diagBusy}
            className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-white/20 leading-relaxed"
            autoFocus
          />
          <button
            onClick={() => submitDiagAnswer()}
            disabled={diagBusy || !diagInput.trim()}
            className="shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#000" }}
          >
            {diagBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> إرسال</>}
          </button>
        </div>
      </div>
    </div>
  );
}
