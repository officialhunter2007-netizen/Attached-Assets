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
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ChevronLeft, Send, Rocket, Target, Check, X as XIcon, Trophy, RefreshCw,
} from "lucide-react";

type Phase = "loading" | "diagnostic" | "start-choice" | "placement" | "result" | "error";

type DiagState = { sessionId: number; currentIndex: number; currentQuestion: string; totalQuestions: number; done: boolean };

type PlacementAnswered = { questionId: number; targetLevelIndex: number; correct: boolean };
type PlacementQuestion = {
  id: number;
  targetLevelIndex: number;
  kind: string;
  prompt: string;
  choices: string[] | null;
};
type PlacementState =
  | { kind: "ask"; question: PlacementQuestion; answered: PlacementAnswered[] }
  | { kind: "finalize"; startingLevelIndex: number; answered: PlacementAnswered[] };

type FinalizeResponse = { ok: boolean; path: { startingLevelIndex: number; unlockedLessonCodes: string[] } };

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
  async function submitDiagAnswer() {
    if (!diag || !diagInput.trim() || diagBusy) return;
    const sentQ = diag.currentQuestion;
    const sentA = diagInput.trim();
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
      // restore input so user doesn't lose what they wrote
      setDiagInput(sentA);
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
      const r = await postJson<PlacementState>(`/api/v4/path/${encodeURIComponent(slug)}/placement/next`, { answered: [] });
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
      const r = await postJson<PlacementState>(
        `/api/v4/path/${encodeURIComponent(slug)}/placement/next`,
        {
          answered: placement.answered,
          previousQuestionId: q.id,
          previousRawAnswer: rawAnswer,
        },
      );
      handlePlacementResponse(r);
      if (r.kind === "finalize") {
        // Auto-finalize the path on the server with the computed level.
        const fr = await postJson<FinalizeResponse>(
          `/api/v4/path/${encodeURIComponent(slug)}/placement/finalize`,
          { startMode: "placement", startingLevelIndex: r.startingLevelIndex },
        );
        setFinalLevel(fr.path.startingLevelIndex);
        setUnlockedCount(Array.isArray(fr.path.unlockedLessonCodes) ? fr.path.unlockedLessonCodes.length : 0);
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
          <div className="space-y-4">
            <div ref={scrollerRef} className="space-y-3 max-h-[55vh] overflow-y-auto py-2 pr-1">
              {transcript.map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tr-sm p-3 text-sm leading-relaxed">
                    <div className="text-[11px] text-gold/70 mb-1">السؤال {i + 1}</div>
                    {m.q}
                  </div>
                  <div className="bg-gold/10 border border-gold/30 rounded-2xl rounded-tl-sm p-3 text-sm leading-relaxed mr-8">
                    {m.a}
                  </div>
                </div>
              ))}
              <motion.div
                key={diag.currentIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tr-sm p-3 text-sm leading-relaxed"
              >
                <div className="text-[11px] text-gold/70 mb-1">السؤال {diag.currentIndex + 1} من {diag.totalQuestions}</div>
                {diag.currentQuestion}
              </motion.div>
            </div>
            <div className="flex items-end gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-2">
              <textarea
                value={diagInput}
                onChange={(e) => setDiagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitDiagAnswer(); } }}
                placeholder="اكتب إجابتك…"
                rows={2}
                disabled={diagBusy}
                className="flex-1 bg-transparent outline-none text-sm resize-none placeholder:text-white/30"
                autoFocus
              />
              <button
                onClick={submitDiagAnswer}
                disabled={diagBusy || !diagInput.trim()}
                className="px-3 py-2 rounded-xl bg-gold text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {diagBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال
              </button>
            </div>
          </div>
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
            <div className="text-xs text-gold/70">
              أسئلة المستوى {placement.question.targetLevelIndex} • أجبت على {placement.answered.length} حتى الآن
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
            <p className="text-white/70 text-sm">
              {finalLevel === 1
                ? "ستبدأ من الدرس الأول. خطوة خطوة بإذن الله."
                : `ستبدأ من المستوى ${finalLevel}. فتحنا لك كل الدروس من المستوى ١ حتى ${finalLevel} (${unlockedCount} درساً).`}
            </p>
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
