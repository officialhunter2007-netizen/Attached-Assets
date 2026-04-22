import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle2, XCircle, Trophy, AlertTriangle, BookOpen, RefreshCw, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";

export type QuizKind = "chapter" | "exam";

interface QuizQuestion {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  choices?: string[];
  topic?: string;
  page?: number | null;
  // present after submit:
  answer?: string;
  explanation?: string;
}

interface QuestionResult {
  id: string;
  correct: boolean;
  given: string;
  expected: string;
  explanation?: string;
  topic?: string;
  feedback?: string;
  page?: number | null;
}

interface SubmitResult {
  attemptId: number;
  kind: QuizKind;
  chapterIndex: number | null;
  chapterTitle: string | null;
  score: number;
  totalQuestions: number;
  correctCount: number;
  weakAreas: { topic: string; missed: number }[];
  results: QuestionResult[];
  questions: QuizQuestion[];
}

export function QuizPanel({
  open,
  onClose,
  materialId,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  materialId: number | null;
  kind: QuizKind;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "answering" | "submitting" | "results" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const lastFetchedKey = useRef<string | null>(null);

  const reset = () => {
    setError(null);
    setAttemptId(null);
    setChapterTitle(null);
    setQuestions([]);
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
  };

  useEffect(() => {
    if (!open || !materialId) return;
    const key = `${materialId}::${kind}`;
    if (lastFetchedKey.current === key && phase !== "idle") return;
    lastFetchedKey.current = key;
    reset();
    setPhase("loading");
    const url = kind === "exam"
      ? `/api/materials/${materialId}/exam`
      : `/api/materials/${materialId}/quiz`;
    fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        setAttemptId(Number(data.attemptId));
        setChapterTitle(data.chapterTitle ?? null);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setPhase("answering");
        setCurrentIdx(0);
      })
      .catch((e: any) => {
        setError(humanizeError(e?.message));
        setPhase("error");
      });
  }, [open, materialId, kind]);

  // When closed, reset so re-open generates fresh quiz next time.
  useEffect(() => {
    if (!open) {
      lastFetchedKey.current = null;
      setPhase("idle");
    }
  }, [open]);

  const current = questions[currentIdx];
  const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim().length > 0).length;
  const allAnswered = answeredCount === questions.length;

  const submit = async () => {
    if (!attemptId) return;
    setPhase("submitting");
    try {
      const r = await fetch(`/api/materials/quiz-attempts/${attemptId}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      const data: SubmitResult = await r.json();
      setResult(data);
      setPhase("results");
    } catch (e: any) {
      setError(humanizeError(e?.message));
      setPhase("error");
    }
  };

  const retry = () => {
    if (!materialId) return;
    lastFetchedKey.current = null;
    reset();
    // Force re-trigger by toggling phase; useEffect will refetch since key cleared.
    setPhase("idle");
    setTimeout(() => {
      lastFetchedKey.current = `${materialId}::${kind}`;
      reset();
      setPhase("loading");
      const url = kind === "exam"
        ? `/api/materials/${materialId}/exam`
        : `/api/materials/${materialId}/quiz`;
      fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            throw new Error(body?.error || `HTTP ${r.status}`);
          }
          return r.json();
        })
        .then((data) => {
          setAttemptId(Number(data.attemptId));
          setChapterTitle(data.chapterTitle ?? null);
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
          setPhase("answering");
          setCurrentIdx(0);
        })
        .catch((e: any) => {
          setError(humanizeError(e?.message));
          setPhase("error");
        });
    }, 50);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ direction: "rtl" }}
      >
        <motion.div
          initial={{ scale: 0.96, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(180deg, #0d111e 0%, #07090f 100%)", border: "1px solid rgba(245,158,11,0.2)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.06))" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                {kind === "exam" ? <Trophy className="w-5 h-5 text-gold" /> : <BookOpen className="w-5 h-5 text-gold" />}
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-white">
                  {kind === "exam" ? "الامتحان النهائي" : "اختبار الفصل"}
                </div>
                <div className="text-[11px] text-white/50 truncate">
                  {kind === "exam"
                    ? "30 سؤالاً يغطّي كامل الملف"
                    : (chapterTitle ? `الفصل: ${chapterTitle}` : "اختبار قصير")}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {phase === "loading" && (
              <LoadingState kind={kind} />
            )}

            {phase === "error" && (
              <ErrorState message={error || "حدث خطأ غير متوقّع"} onRetry={retry} />
            )}

            {phase === "answering" && current && (
              <AnsweringState
                questions={questions}
                current={current}
                currentIdx={currentIdx}
                answers={answers}
                setAnswer={(qid, val) => setAnswers((a) => ({ ...a, [qid]: val }))}
                goPrev={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                goNext={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                jumpTo={(i) => setCurrentIdx(i)}
              />
            )}

            {phase === "submitting" && (
              <div className="p-12 flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <div className="text-white/80 text-sm">جارٍ تصحيح إجاباتك وتحليل نقاط الضعف...</div>
              </div>
            )}

            {phase === "results" && result && (
              <ResultsState result={result} onClose={onClose} onRetry={retry} />
            )}
          </div>

          {/* Footer for answering phase */}
          {phase === "answering" && (
            <div className="shrink-0 border-t border-white/10 px-5 py-3 flex items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[11px] text-white/50">
                أُجبت على <span className="text-gold font-bold">{answeredCount}</span> / {questions.length}
              </div>
              <button
                onClick={submit}
                disabled={!allAnswered}
                className="text-sm font-bold px-5 py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {allAnswered ? "تسليم وتصحيح" : `أجب على ${questions.length - answeredCount} سؤالاً متبقياً`}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function humanizeError(code?: string): string {
  switch (code) {
    case "MATERIAL_NOT_READY": return "لا يزال الملف قيد المعالجة. حاول بعد لحظات.";
    case "MATERIAL_HAS_NO_TEXT": return "تعذّر استخراج نص قابل للقراءة من هذا الملف.";
    case "QUIZ_GEN_UNAVAILABLE": return "خدمة توليد الأسئلة غير متاحة حالياً.";
    case "QUIZ_GEN_TOO_FEW":
    case "EXAM_GEN_TOO_FEW": return "تعذّر توليد عدد كافٍ من الأسئلة من هذا الملف. حاول مرة أخرى.";
    case "QUIZ_GEN_FAILED":
    case "EXAM_GEN_FAILED": return "فشل توليد الأسئلة. يرجى المحاولة لاحقاً.";
    case "ALREADY_SUBMITTED": return "هذه المحاولة مُسلّمة بالفعل.";
    default: return code || "حدث خطأ غير متوقّع.";
  }
}

function LoadingState({ kind }: { kind: QuizKind }) {
  return (
    <div className="p-12 flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 animate-spin text-gold relative" />
      </div>
      <div className="text-white font-bold">
        {kind === "exam" ? "نُولّد امتحانك النهائي من الملف..." : "نُولّد اختباراً مخصّصاً لهذا الفصل..."}
      </div>
      <div className="text-[12px] text-white/50 max-w-sm leading-relaxed">
        نقرأ المحتوى، نختار النقاط الجوهرية، ونصوغ أسئلة متنوّعة المستوى. قد يستغرق ذلك من 15 إلى 40 ثانية.
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-10 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <div className="text-white font-bold text-sm">{message}</div>
      <button
        onClick={onRetry}
        className="text-sm font-bold px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-white flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" /> إعادة المحاولة
      </button>
    </div>
  );
}

function AnsweringState({
  questions, current, currentIdx, answers, setAnswer, goPrev, goNext, jumpTo,
}: {
  questions: QuizQuestion[];
  current: QuizQuestion;
  currentIdx: number;
  answers: Record<string, string>;
  setAnswer: (qid: string, val: string) => void;
  goPrev: () => void;
  goNext: () => void;
  jumpTo: (i: number) => void;
}) {
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);
  return (
    <div className="p-5 sm:p-6">
      {/* Progress strip */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] text-white/55 mb-1.5">
          <span>السؤال {currentIdx + 1} من {questions.length}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-amber-400 to-amber-600 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        {/* dot navigation */}
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
          {questions.map((q, i) => {
            const ans = (answers[q.id] ?? "").trim().length > 0;
            const here = i === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => jumpTo(i)}
                className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                  here ? "bg-gold text-black ring-2 ring-amber-300/50"
                    : ans ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
                    : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                }`}
                title={`السؤال ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* The question */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-start gap-2 mb-3">
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            current.type === "mcq" ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          }`}>
            {current.type === "mcq" ? "اختيار من متعدد" : "إجابة قصيرة"}
          </span>
          {current.page ? (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
              صفحة {current.page}
            </span>
          ) : null}
        </div>
        <div className="text-white text-[15px] font-semibold leading-relaxed mb-4 whitespace-pre-wrap">{current.prompt}</div>
        {current.type === "mcq" && current.choices ? (
          <div className="space-y-2">
            {current.choices.map((c, idx) => {
              const selected = (answers[current.id] ?? "") === c;
              return (
                <button
                  key={idx}
                  onClick={() => setAnswer(current.id, c)}
                  className={`w-full text-right p-3 rounded-xl transition-all flex items-start gap-3 ${
                    selected
                      ? "bg-amber-500/15 border border-amber-500/50 ring-1 ring-amber-500/30"
                      : "bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20"
                  }`}
                >
                  <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                    selected ? "border-amber-400 bg-amber-400 text-black" : "border-white/30 text-white/40"
                  }`}>
                    {String.fromCharCode(0x0623 + idx) /* أ ب ت ث */}
                  </div>
                  <div className="text-[14px] text-white/90 leading-relaxed flex-1">{c}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            value={answers[current.id] ?? ""}
            onChange={(e) => setAnswer(current.id, e.target.value)}
            rows={4}
            placeholder="اكتب إجابتك هنا..."
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.05] outline-none text-white text-[14px] leading-relaxed resize-none"
            style={{ direction: "rtl" }}
          />
        )}
      </div>

      {/* Prev/Next */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" /> السابق
        </button>
        <button
          onClick={goNext}
          disabled={currentIdx >= questions.length - 1}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          التالي <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ResultsState({ result, onClose, onRetry }: { result: SubmitResult; onClose: () => void; onRetry: () => void }) {
  const passed = result.score >= 60;
  const scoreColor = result.score >= 80 ? "text-emerald-400" : result.score >= 60 ? "text-amber-300" : "text-red-400";
  const scoreBg = result.score >= 80 ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30"
    : result.score >= 60 ? "from-amber-500/15 to-amber-500/5 border-amber-500/30"
    : "from-red-500/15 to-red-500/5 border-red-500/30";

  return (
    <div className="p-5 sm:p-6">
      {/* Summary */}
      <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl p-5 mb-5`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full bg-black/30 border-2 flex items-center justify-center font-black text-2xl ${scoreColor} ${passed ? "border-current" : "border-current"}`}>
            {result.score}
          </div>
          <div>
            <div className="text-white font-black text-lg">
              {result.score >= 80 ? "ممتاز! 🌟" : result.score >= 60 ? "جيد، استمر 💪" : "تحتاج لمراجعة 📚"}
            </div>
            <div className="text-[13px] text-white/70">
              أصبت <span className={`font-bold ${scoreColor}`}>{result.correctCount}</span> من أصل {result.totalQuestions}
              {result.chapterTitle ? <> — اختبار: <span className="text-white/90">{result.chapterTitle}</span></> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Weak areas */}
      {result.weakAreas.length > 0 && (
        <div className="mb-5 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="text-[12px] font-black text-amber-300 mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> نقاط تحتاج مراجعة
          </div>
          <div className="flex flex-wrap gap-2">
            {result.weakAreas.map((w, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200"
              >
                {w.topic} <span className="text-amber-400/60">({w.missed})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-question review */}
      <div className="space-y-3 mb-5">
        <div className="text-[12px] font-black text-white/70">مراجعة الأسئلة</div>
        {result.questions.map((q, i) => {
          const r = result.results.find((x) => x.id === q.id);
          if (!r) return null;
          return (
            <div
              key={q.id}
              className={`rounded-2xl p-4 border ${r.correct ? "bg-emerald-500/[0.04] border-emerald-500/25" : "bg-red-500/[0.04] border-red-500/25"}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${r.correct ? "bg-emerald-500/30" : "bg-red-500/30"}`}>
                  {r.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <XCircle className="w-4 h-4 text-red-300" />}
                </div>
                <div className="text-[13px] text-white font-semibold leading-relaxed flex-1">
                  <span className="text-white/40 ml-1">{i + 1}.</span> {q.prompt}
                </div>
              </div>
              <div className="space-y-1.5 text-[12px] mr-8">
                <div>
                  <span className="text-white/40 ml-1">إجابتك:</span>
                  <span className={r.correct ? "text-emerald-300" : "text-red-300"}>{r.given || "— لم تجب —"}</span>
                </div>
                {!r.correct && (
                  <div>
                    <span className="text-white/40 ml-1">الإجابة الصحيحة:</span>
                    <span className="text-emerald-300">{r.expected}</span>
                  </div>
                )}
                {r.feedback && (
                  <div className="text-white/55 italic">{r.feedback}</div>
                )}
                {q.explanation && (
                  <div className="text-white/65 mt-1 pt-1.5 border-t border-white/5">
                    <span className="text-white/40 ml-1">شرح:</span>{q.explanation}
                  </div>
                )}
                {q.page ? <div className="text-white/35 text-[10px]">المرجع: صفحة {q.page}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onRetry}
          className="text-sm font-bold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/85 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> اختبار جديد
        </button>
        <button
          onClick={onClose}
          className="text-sm font-bold px-5 py-2 rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20"
        >
          إنهاء
        </button>
      </div>
    </div>
  );
}
