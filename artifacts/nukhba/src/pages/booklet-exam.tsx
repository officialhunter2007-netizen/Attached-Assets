/**
 * booklet-exam.tsx — Booklet exam runner (Phase G).
 *
 * Unit tests (U<n>.TEST) and the booklet final (FINAL) share this MCQ runner.
 * Questions are lazy-generated server-side from the booklet's own pages on
 * first open, then cached (so a reload shows the same set) and graded
 * deterministically server-side — the client never sees the answer key.
 *
 * Assessment-only: a result records stars/mastery but NEVER gates navigation.
 *
 * Flow:
 *   1. GET  /api/v4/booklet/:id/exam/:examCode → questions (no correctIndex).
 *   2. Student picks one choice per question (stepper, can go back).
 *   3. POST .../submit { answers: number[] } → { score, passed, evaluatorLog }.
 *   4. Result screen: passed (≥ threshold) celebrates; failed offers retry.
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

type ExamQuestion = {
  id: number;
  questionIndex: number;
  kind: "mcq";
  prompt: string;
  choices: string[];
};
type EvalRow = {
  questionId: number; questionIndex: number; kind: string; prompt: string;
  studentAnswer: string;
  verdict: "correct" | "partial" | "wrong";
  score: number;
  explanation: string;
};
type ExamPayload = {
  booklet: { id: number; title: string };
  exam: {
    code: string;
    title: string;
    scope: "unit" | "final";
    questions: ExamQuestion[];
  };
  prior: { score: number; passed: boolean; attempts: number; correct: number; total: number } | null;
  passThreshold: number;
};
type ExamResult = {
  score: number; passed: boolean; passThreshold: number; correct: number; total: number; evaluatorLog: EvalRow[];
};

export default function BookletExam() {
  const [, params] = useRoute<{ id: string; examCode: string }>("/booklet/:id/exam/:examCode");
  const id = Number(params?.id ?? 0);
  const examCode = decodeURIComponent(params?.examCode ?? "");
  const [, navigate] = useLocation();

  const [data, setData] = useState<ExamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const backToMap = () => navigate(`/booklet/${id}/map`);

  useEffect(() => {
    if (!id || !examCode) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/booklet/${id}/exam/${encodeURIComponent(examCode)}`, { credentials: "include" });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.message ?? body?.error ?? `http_${r.status}`);
        if (cancelled) return;
        const d = body as ExamPayload;
        setData(d);
        setAnswers(new Array(d.exam.questions.length).fill(null));
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message ?? "unknown"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, examCode]);

  function pick(choiceIndex: number) {
    const next = [...answers];
    next[cursor] = choiceIndex;
    setAnswers(next);
  }

  async function submit() {
    if (!data) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v4/booklet/${id}/exam/${encodeURIComponent(examCode)}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ answers }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message ?? body?.error ?? `http_${r.status}`);
      setResult(body);
    } catch (e: any) {
      alert("تعذّر تسليم الاختبار: " + String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    if (!data) return;
    setResult(null);
    setCursor(0);
    setAnswers(new Array(data.exam.questions.length).fill(null));
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6" style={{ direction: "rtl" }}>
        <div className="text-5xl">⚠️</div>
        <p className="text-white/60">تعذّر تحميل الاختبار. {err}</p>
        <button onClick={backToMap} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">رجوع للخريطة</button>
      </div>
    );
  }

  const totalQs = data.exam.questions.length;
  const currentQ = data.exam.questions[cursor];
  const selected = answers[cursor];
  const isLast = cursor === totalQs - 1;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === totalQs;
  const scopeLabel = data.exam.scope === "final" ? "اختبار نهائي" : "اختبار وحدة";

  return (
    <div className="min-h-[100dvh] bg-background text-white pb-24" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={backToMap} className="text-white/50 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-2xl">{data.exam.scope === "final" ? "🏆" : "📝"}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-amber-300/70 font-semibold">{scopeLabel} · {data.exam.code}</div>
            <div className="font-black text-sm truncate">{data.exam.title}</div>
          </div>
          {!result && <div className="text-[11px] bg-white/10 rounded-full px-2 py-1 text-white/70">{cursor + 1} / {totalQs}</div>}
        </div>
        {!result && (
          <div className="max-w-2xl mx-auto px-4 pb-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-to-l from-amber-500 to-amber-300 transition-all" style={{ width: `${(answeredCount / totalQs) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Prior attempt banner */}
        {data.prior && !result && (
          <div className={`rounded-2xl p-3 text-sm border ${data.prior.passed ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-rose-500/10 border-rose-400/30 text-rose-200"}`}>
            محاولتك السابقة: {data.prior.score}/100 ({data.prior.correct}/{data.prior.total}) — {data.prior.passed ? "اجتزت" : "لم تنجح"}
          </div>
        )}

        {result ? (
          <ResultPanel result={result} onRetry={retry} onBackToMap={backToMap} />
        ) : (
          <>
            {/* Question card */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-[11px] text-white/40 mb-3">السؤال {currentQ.questionIndex}</div>
              <p className="text-white/95 leading-relaxed mb-4 text-base whitespace-pre-wrap">{currentQ.prompt}</p>
              <div className="space-y-2.5">
                {currentQ.choices.map((choice, ci) => {
                  const isSel = selected === ci;
                  return (
                    <button
                      key={ci}
                      onClick={() => pick(ci)}
                      className={`w-full text-right rounded-2xl border px-4 py-3 text-sm leading-relaxed transition-all flex items-center gap-3 ${
                        isSel
                          ? "border-amber-400/60 bg-amber-500/15 text-white"
                          : "border-white/10 bg-black/20 text-white/80 hover:border-white/25"
                      }`}
                    >
                      <span className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${isSel ? "border-amber-400 bg-amber-400 text-black font-black" : "border-white/30"}`}>
                        {isSel ? "✓" : ""}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">{choice}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="px-4 py-3 rounded-2xl bg-white/10 text-white font-bold disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </button>

              {!isLast ? (
                <button
                  onClick={() => setCursor((c) => Math.min(totalQs - 1, c + 1))}
                  disabled={selected === null}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!allAnswered || submitting}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-400 text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? "جاري التصحيح..." : allAnswered ? "تسليم الاختبار" : `أجب على كل الأسئلة (${answeredCount}/${totalQs})`}
                  {!submitting && allAnswered && <ArrowLeft className="w-4 h-4" />}
                </button>
              )}
            </div>

            {isLast && !allAnswered && (
              <p className="text-center text-[11px] text-white/40">عليك الإجابة على جميع الأسئلة قبل التسليم.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel(props: { result: ExamResult; onRetry: () => void; onBackToMap: () => void }) {
  const r = props.result;
  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center ${r.passed ? "bg-emerald-500/10 border-emerald-400/30" : "bg-rose-500/10 border-rose-400/30"}`}>
        <div className="text-5xl mb-2">{r.passed ? "🎉" : "🔄"}</div>
        <div className={`text-2xl font-black ${r.passed ? "text-emerald-300" : "text-rose-300"}`}>{r.score}/100</div>
        <div className="text-sm text-white/70 mt-1">
          {r.correct}/{r.total} صحيحة · {r.passed ? `اجتزت (الحد الأدنى ${r.passThreshold})` : `لم تجتز — تحتاج ${r.passThreshold} على الأقل`}
        </div>
      </div>

      {r.evaluatorLog.map((row) => (
        <div key={row.questionId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            {row.verdict === "correct"
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-[11px] text-white/40">السؤال {row.questionIndex}</span>
            <span className="text-[11px] text-white/60 ms-auto">{row.score}/100</span>
          </div>
          <div className="text-sm text-white/80 mb-2 whitespace-pre-wrap">{row.prompt}</div>
          <div className="text-xs text-white/50 mb-2 bg-black/20 rounded-lg px-2 py-1.5 whitespace-pre-wrap">
            <span className="text-white/30">إجابتك: </span>{row.studentAnswer || "—"}
          </div>
          {row.explanation && <div className="text-xs text-white/70 leading-relaxed">{row.explanation}</div>}
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={props.onRetry} className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-bold">إعادة المحاولة</button>
        <button onClick={props.onBackToMap} className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black">العودة للخريطة</button>
      </div>
    </div>
  );
}
