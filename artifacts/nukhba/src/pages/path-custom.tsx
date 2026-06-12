// ─────────────────────────────────────────────────────────────────────────────
// v4 task #3 — Custom path setup flow.
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
  Loader2, ChevronLeft, Send, Rocket, Target, Check, X as XIcon, Trophy, RefreshCw, Sparkles, MessageCircle,
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
// Server-graded final placement (recomputed from the authoritative session).
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

export default function PathCustom() {
  const [, params] = useRoute<{ slug: string }>("/path/:slug/custom");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // diagnostic state
  const [diag, setDiag] = useState<DiagState | null>(null);
  const [transcript, setTranscript] = useState<{ q: string; a: string }[]>([]);
  const [diagInput, setDiagInput] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);

  // placement state
  const [placement, setPlacement] = useState<PlacementState | null>(null);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementPickedIdx, setPlacementPickedIdx] = useState<number | null>(null);
  const [placementShortAnswer, setPlacementShortAnswer] = useState("");
  const [finalLevel, setFinalLevel] = useState<number | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [finalPlacement, setFinalPlacement] = useState<PlacementFinalizeInfo | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [transcript, diag, phase]);

  // Boot: ensure specialty is v4-available, then start diagnostic.
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
        if (d.done) {
          setPhase("start-choice");
        } else {
          setPhase("diagnostic");
        }
      } catch (e: any) {
        if (cancelled) return;
        setErrMsg(String(e?.message ?? e));
        setPhase("error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // ─── Diagnostic ────────────────────────────────────────────────────────────
  /** Send a diagnostic answer — either from text input or from an option click. */
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
    } catch (e: any) {
      setErrMsg("ما قدرنا نحفظ جوابك. حاول مجدداً.");
      if (!optionText) setDiagInput(sentA);
      setTranscript((t) => t.slice(0, -1));
    } finally {
      setDiagBusy(false);
    }
  }

  // ─── Start choice → from-zero or placement ────────────────────────────────
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
    } catch (e: any) {
      setErrMsg("تعذّر حفظ اختيارك. حاول مجدداً.");
    } finally {
      setPlacementBusy(false);
    }
  }

  async function startPlacement() {
    setPlacementBusy(true);
    try {
      // First call carries no answer — the server creates/reopens the session
      // and returns the first probe (questionId held server-side in `pending`).
      const r = await postJson<PlacementState>(`/api/v4/path/${encodeURIComponent(slug)}/placement/next`, {});
      handlePlacementResponse(r);
      setPhase("placement");
    } catch (e: any) {
      setErrMsg("تعذّر بدء اختبار تحديد المستوى.");
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
      // Server-authoritative: it grades the pending probe it issued, appends to
      // the session, and returns the next probe (or a finalize verdict). We send
      // only the raw answer — never the questionId or a running tally.
      const r = await postJson<PlacementState>(
        `/api/v4/path/${encodeURIComponent(slug)}/placement/next`,
        { rawAnswer },
      );
      handlePlacementResponse(r);
      if (r.kind === "finalize") {
        // Commit the path. The server IGNORES any client level and recomputes
        // the precise placement (level + stage + unit) from the graded session.
        const fr = await postJson<FinalizeResponse>(
          `/api/v4/path/${encodeURIComponent(slug)}/placement/finalize`,
          { startMode: "placement" },
        );
        setFinalLevel(fr.path.startingLevelIndex);
        setUnlockedCount(Array.isArray(fr.path.unlockedLessonCodes) ? fr.path.unlockedLessonCodes.length : 0);
        setFinalPlacement(fr.placement ?? r.result);
        setPhase("result");
      }
    } catch (e: any) {
      setErrMsg("تعذّر إرسال إجابتك. حاول مجدداً.");
    } finally {
      setPlacementBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  // Progress never goes backwards: diagnostic fills 0→45%, then 55→78→100.
  const progressPct = useMemo(() => {
    if (phase === "loading") return 0;
    if (phase === "diagnostic" && diag) return Math.round((transcript.length / diag.totalQuestions) * 45);
    if (phase === "start-choice") return 55;
    if (phase === "placement") return 78;
    if (phase === "result") return 100;
    return 0;
  }, [phase, diag, transcript.length]);

  return (
    <div className="min-h-[100dvh] bg-background text-white" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)} className="text-white/50 hover:text-white text-sm">
            ← رجوع
          </button>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-gold to-amber-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-white/40 tabular-nums">{progressPct}%</span>
        </div>

        {errMsg && phase !== "error" && (
          <div className="mb-3 text-xs text-red-300/90 bg-red-950/30 border border-red-500/30 rounded-xl px-3 py-2 flex items-center justify-between">
            <span>{errMsg}</span>
            <button onClick={() => setErrMsg(null)} className="text-red-300/60 hover:text-red-200"><XIcon className="w-3 h-3" /></button>
          </div>
        )}

        {phase === "loading" && (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
        )}

        {phase === "error" && (
          <div className="py-20 text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-white/70">{errMsg ?? "حدث خطأ غير متوقع."}</p>
            <button onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">
              رجوع
            </button>
          </div>
        )}

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

        {phase === "start-choice" && (
          <div className="space-y-5 py-4">
            <div className="text-center mb-2">
              <div className="text-4xl mb-2">🎯</div>
              <h2 className="text-2xl font-black">جاهز نبدأ — من وين تحب نبدأ؟</h2>
              <p className="text-white/60 text-sm mt-2">
                استلمنا إجاباتك التشخيصية وسيعرفها معلّمك عنك. الآن اختر طريقة البداية.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <button
                onClick={chooseFromZero}
                disabled={placementBusy}
                className="text-right glass rounded-2xl border border-emerald/30 hover:border-emerald/60 p-5 transition-colors disabled:opacity-50"
              >
                <Rocket className="w-7 h-7 text-emerald mb-2" />
                <h3 className="font-black text-lg mb-1">ابدأ من الصفر</h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  يفتح فقط الدرس الأول. تتدرّج خطوة خطوة بدون تخطّي.
                </p>
              </button>
              <button
                onClick={startPlacement}
                disabled={placementBusy}
                className="text-right glass rounded-2xl border border-gold/30 hover:border-gold/60 p-5 transition-colors disabled:opacity-50"
              >
                <Target className="w-7 h-7 text-gold mb-2" />
                <h3 className="font-black text-lg mb-1">اختبار تحديد المستوى</h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  أسئلة سريعة تتدرّج بالصعوبة. توقف عند أول فشلين متتاليين، ويفتحلك المنهج من نقطتك.
                </p>
              </button>
            </div>
          </div>
        )}

        {phase === "placement" && placement?.kind === "ask" && (
          <div className="space-y-5 py-2">
            {/* Descent phase pills: نُحدّد المستوى → المرحلة → الوحدة */}
            <div className="flex items-center justify-center gap-1.5">
              {(["level", "stage", "unit"] as const).map((sc, i) => {
                const labels = { level: "المستوى", stage: "المرحلة", unit: "الوحدة" } as const;
                const active = placement.scope === sc;
                const order = { level: 0, stage: 1, unit: 2 } as const;
                const done = order[placement.scope] > order[sc];
                return (
                  <div key={sc} className="flex items-center gap-1.5">
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        active
                          ? "bg-gold/20 border-gold/50 text-gold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                          : done
                          ? "bg-emerald/15 border-emerald/40 text-emerald"
                          : "bg-white/[0.03] border-white/10 text-white/35"
                      }`}
                    >
                      {done ? "✓ " : ""}{labels[sc]}
                    </div>
                    {i < 2 && <div className={`w-4 h-0.5 rounded-full ${done ? "bg-emerald/40" : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>
            <div className="text-center text-xs text-gold/70">
              {placement.phaseLabel} • أجبت على {placement.progress.answered} سؤالاً
            </div>
            <div className="glass rounded-2xl border border-white/10 p-4 text-sm leading-relaxed">
              {placement.question.prompt}
            </div>
            {placement.question.kind === "mcq" && Array.isArray(placement.question.choices) && (
              <div className="space-y-2">
                {placement.question.choices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setPlacementPickedIdx(i)}
                    className={`w-full text-right px-4 py-3 rounded-xl border transition-colors ${
                      placementPickedIdx === i
                        ? "border-gold bg-gold/15 text-white"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 text-white/80"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {placement.question.kind !== "mcq" && (
              <textarea
                value={placementShortAnswer}
                onChange={(e) => setPlacementShortAnswer(e.target.value)}
                placeholder="اكتب إجابتك…"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-sm outline-none resize-none placeholder:text-white/30"
              />
            )}
            <button
              onClick={submitPlacementAnswer}
              disabled={
                placementBusy ||
                (placement.question.kind === "mcq" ? placementPickedIdx === null : !placementShortAnswer.trim())
              }
              className="w-full px-4 py-3 rounded-xl bg-gold text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {placementBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
              إجابة وتالي
            </button>
          </div>
        )}

        {phase === "result" && (
          <div className="text-center py-8 space-y-5">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-gold flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)]"
            >
              <Trophy className="w-12 h-12 text-black" />
            </motion.div>
            <h1 className="text-3xl font-black">جهّزنا مسارك!</h1>
            {/* Unit-precise placement (descent) vs. level-only / from-zero copy. */}
            {finalPlacement && finalPlacement.precision === "unit" && finalPlacement.unitCode ? (
              <div className="space-y-3">
                <p className="text-white/70 text-sm">
                  حدّدنا نقطة بدايتك بدقة — المستوى{" "}
                  <span className="text-gold font-bold">{finalPlacement.levelIndex}</span>، المرحلة{" "}
                  <span className="text-gold font-bold">{finalPlacement.stageCode}</span>، الوحدة{" "}
                  <span className="text-gold font-bold">{finalPlacement.unitCode}</span>.
                </p>
                <div className="glass rounded-2xl border border-emerald/30 bg-emerald/5 p-4 text-sm">
                  <div className="text-emerald font-bold mb-1">🎯 تبدأ من الدرس {finalPlacement.currentLessonCode}</div>
                  <p className="text-white/60 text-xs leading-relaxed">
                    فتحنا لك كل ما قبله للمراجعة وقت ما تحب ({unlockedCount} درساً)، وما بعده يُفتح تباعاً مع تقدّمك.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/70 text-sm">
                {finalLevel === 1
                  ? "ستبدأ من الدرس الأول. خطوة خطوة بإذن الله."
                  : `ستبدأ من المستوى ${finalLevel}. فتحنا لك كل الدروس من المستوى ١ حتى ${finalLevel} (${unlockedCount} درساً).`}
              </p>
            )}
            <div className="glass rounded-2xl border border-gold/30 bg-gold/5 p-4 text-xs text-gold/80">
              💎 استلمت ١٠٠ جوهرة هدية ترحيب — تكفي لبدء أول جلسات التعلّم.
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-l from-amber-500 to-gold border border-amber-300/40 text-black font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                🗺️ افتح خريطتك التعليمية
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald/15 border border-emerald/30 text-emerald text-sm font-semibold hover:bg-emerald/20 transition-colors"
                >
                  ادخل إلى الخريطة
                </button>
                <button
                  onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors flex items-center gap-1.5"
                  title="إعادة الإعداد من البداية"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة الإعداد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DiagnosticChat — full polished diagnostic Q&A UI with clickable options,
// progress tracker, chat transcript, and sticky input. Extracted as a named
// component so state variables stay stable across re-renders.
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
  // Parse [[ASK_OPTIONS]] from current question for clickable buttons
  const diagAsk = useMemo(() => extractAskOptions(diag.currentQuestion), [diag.currentQuestion]);
  const progressPct = Math.round(((diag.currentIndex + 1) / diag.totalQuestions) * 100);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100dvh - 9rem)" }}>
      {/* ── Header banner ──────────────────────────────────────────────────── */}
      <div className="shrink-0 text-center py-3 mb-1">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 via-gold/10 to-amber-400/10 border border-gold/20"
        >
          <span className="text-lg">🤖</span>
          <span className="text-sm text-white/80 font-bold">نتعرّف عليك</span>
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span className="text-[11px] text-white/40 tabular-nums">{progressPct}%</span>
        </motion.div>
      </div>

      {/* ── Progress stepper ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-center gap-1.5 mb-3 px-2">
        {Array.from({ length: diag.totalQuestions }, (_, i) => {
          const isDone = i < diag.currentIndex;
          const isCurrent = i === diag.currentIndex;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <motion.div
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border transition-all ${
                  isDone
                    ? "bg-emerald/20 border-emerald/40 text-emerald"
                    : isCurrent
                    ? "bg-gold/20 border-gold/40 text-gold shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-white/30"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : i + 1}
              </motion.div>
              {i < diag.totalQuestions - 1 && (
                <div className={`w-6 h-0.5 rounded-full ${i < diag.currentIndex ? "bg-emerald/40" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Chat transcript (scrollable) ───────────────────────────────────── */}
      <div ref={scrollerRef} className="flex-1 min-h-[8rem] overflow-y-auto px-1 pb-1 space-y-3">
        <AnimatePresence>
          {transcript.map((m, i) => {
            const thisQ = extractAskOptions(m.q);
            return (
              <motion.div
                key={`transcript-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {/* Question bubble */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tr-sm p-3 text-sm leading-relaxed">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🤖</span>
                    <span className="text-[11px] text-gold/60">سؤال {i + 1}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-white/85">
                    {thisQ.stripped || m.q}
                  </div>
                </div>
                {/* Answer bubble */}
                <div className="bg-gradient-to-bl from-gold/10 to-violet-500/10 border border-gold/20 rounded-2xl rounded-tl-sm p-3 text-sm leading-relaxed ml-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🧑‍🎓</span>
                    <span className="text-[11px] text-gold/40">إجابتك</span>
                  </div>
                  <div className="whitespace-pre-wrap text-white/90">{m.a}</div>
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
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="relative overflow-hidden"
        >
          <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/10 via-gold/10 to-transparent rounded-2xl blur-sm pointer-events-none" />
          <div className="relative bg-white/[0.05] border border-gold/30 rounded-2xl rounded-tr-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <motion.span
                animate={{ rotate: [0, 12, -12, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 4 }}
                className="text-xl"
              >🤖</motion.span>
              <span className="text-[11px] text-gold/80 font-bold">
                سؤال {diag.currentIndex + 1} من {diag.totalQuestions}
              </span>
              <span className="flex-1" />
              <span className="flex items-center gap-1 text-[10px] text-violet-300/60 bg-violet-500/10 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> اختر أو اكتب
              </span>
            </div>
            {/* Question body — show stripped content, fallback to the ask question, fallback to raw question */}
            <div className="whitespace-pre-wrap text-white/90 text-sm leading-relaxed">
              {diagAsk.stripped || diagAsk.ask?.question || diag.currentQuestion.replace(/\[\[\s*ASK_OPTIONS\s*:[\s\S]*?\]\](?!\])/g, "").replace(/\[\[\s*ASK_OPTIONS\s*:(?:(?!\]\])[\s\S])*$/g, "").trim()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Clickable options ──────────────────────────────────────────────── */}
      {diagAsk.ask && !diagBusy && (
        <motion.div
          key={`opts-${diag.currentIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="shrink-0 space-y-2 px-1 pt-3 pb-1 border-t border-white/[0.06] relative z-10"
        >
          {diagAsk.ask.options.map((opt, i) => {
            // Strip emoji prefix from the option text (keeps the emoji visible in the button)
            const label = opt.replace(/^[^\s]+\s/, "");
            const emoji = opt.match(/^(\S+)/)?.[1] ?? "";
            // Only use emoji if it's actually a single/double emoji character
            const hasEmoji = /^[\p{Emoji}]{1,2}$/u.test(emoji);
            return (
              <motion.button
                key={`opt-${i}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + i * 0.06 }}
                onClick={() => submitDiagAnswer(opt)}
                className="w-full text-right px-4 py-3 rounded-xl border bg-white/[0.02] hover:bg-gold/10 hover:border-gold/50 text-white/85 text-sm transition-all active:scale-[0.98] flex items-center gap-3 border-white/10 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
              >
                <span className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-sm shrink-0">
                  {hasEmoji ? emoji : i + 1}
                </span>
                <span className="flex-1 leading-snug">{label}</span>
                <ChevronLeft className="w-3.5 h-3.5 text-white/15 shrink-0" />
              </motion.button>
            );
          })}
          {/* Write-your-own */}
          {diagAsk.ask.allowOther && (
            <motion.button
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 + diagAsk.ask.options.length * 0.06 }}
              onClick={() => { setDiagInput(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="w-full text-right px-4 py-2.5 rounded-xl border border-dashed border-violet-400/25 bg-violet-500/[0.04] hover:bg-violet-500/10 hover:border-violet-400/50 text-violet-200/70 text-xs transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-400/20 flex items-center justify-center text-sm shrink-0">✏️</span>
              <span className="flex-1">غير ذلك — أكتب إجابتي بنفسي</span>
              <MessageCircle className="w-3 h-3 text-violet-300/30 shrink-0" />
            </motion.button>
          )}
        </motion.div>
      )}

      {/* ── Sticky text input ───────────────────────────────────────────────── */}
      <div className="shrink-0 pt-2">
        <div className="flex items-end gap-2 bg-white/[0.05] border border-white/10 rounded-2xl p-2 shadow-[0_-8px_20px_rgba(0,0,0,0.3)]">
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
            className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-white/25"
            autoFocus
          />
          <button
            onClick={() => submitDiagAnswer()}
            disabled={diagBusy || !diagInput.trim()}
            className="shrink-0 px-4 py-2 rounded-xl bg-gold text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            {diagBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                إرسال
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
