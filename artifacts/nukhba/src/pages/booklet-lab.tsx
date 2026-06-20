/**
 * booklet-lab.tsx — Booklet lab runner (Phase G).
 *
 * Mirrors v4-lab.tsx but bound to a student booklet instead of a specialty.
 * Questions are lazy-generated server-side from the booklet's own pages the
 * first time this opens, then cached so a reload shows the same set.
 *
 * Flow:
 *   1. GET /api/v4/booklet/:id/lab/:labCode → scenario + 5 typed questions.
 *   2. Student answers ONE question at a time. On submit:
 *      POST .../evaluate → per-question Haiku verdict + explanation (live).
 *   3. After feedback, "next" reveals Q+1.
 *   4. After the last question, POST .../submit re-grades server-side and
 *      persists the attempt (assessment-only — never gates navigation).
 *   5. Result screen: passed (≥ threshold) celebrates; failed offers retry.
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ChevronRight, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";

type LabQuestion = {
  id: number;
  questionIndex: number;
  kind: string;
  prompt: string;
};
type EvalRow = {
  questionId: number; questionIndex: number; kind: string; prompt: string;
  studentAnswer: string;
  verdict: "correct" | "partial" | "wrong";
  score: number;
  explanation: string;
};
type LabPayload = {
  booklet: { id: number; title: string };
  lab: {
    code: string;
    title: string;
    scenario: string;
    completionCriterion: string;
    questions: LabQuestion[];
  };
  prior: { score: number; passed: boolean; attempts: number } | null;
  passThreshold: number;
};
type LiveFeedback = { verdict: "correct" | "partial" | "wrong"; score: number; explanation: string };

const KIND_ARABIC: Record<string, string> = {
  diagnostic: "تشخيصي",
  decision: "قرار",
  application: "تطبيق",
  analysis: "تحليل",
  connection: "ربط",
};
const KIND_COLOR: Record<string, string> = {
  diagnostic: "from-blue-500/20 to-blue-700/20 border-blue-400/30",
  decision: "from-amber-500/20 to-amber-700/20 border-amber-400/30",
  application: "from-emerald-500/20 to-emerald-700/20 border-emerald-400/30",
  analysis: "from-violet-500/20 to-violet-700/20 border-violet-400/30",
  connection: "from-rose-500/20 to-rose-700/20 border-rose-400/30",
};

export default function BookletLab() {
  const [, params] = useRoute<{ id: string; labCode: string }>("/booklet/:id/lab/:labCode");
  const id = Number(params?.id ?? 0);
  const labCode = decodeURIComponent(params?.labCode ?? "");
  const [, navigate] = useLocation();

  const [data, setData] = useState<LabPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Sequential UX state.
  const [cursor, setCursor] = useState(0);                       // current Q index
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<LiveFeedback[]>([]);   // per-Q evaluator output
  const [evaluating, setEvaluating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [result, setResult] = useState<{
    score: number; passed: boolean; passThreshold: number; evaluatorLog: EvalRow[];
  } | null>(null);

  useEffect(() => {
    if (!id || !labCode) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/booklet/${id}/lab/${encodeURIComponent(labCode)}`, { credentials: "include" });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.message ?? body?.error ?? `http_${r.status}`);
        if (cancelled) return;
        const d = body as LabPayload;
        setData(d);
        const n = d.lab.questions.length;
        setAnswers(new Array(n).fill(""));
        setFeedback(new Array(n).fill(null) as any);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message ?? "unknown"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, labCode]);

  async function evaluateCurrent() {
    if (!data) return;
    const q = data.lab.questions[cursor];
    const answer = (answers[cursor] ?? "").trim();
    if (!answer) { alert("اكتب إجابتك أولاً."); return; }
    setEvaluating(true);
    try {
      const r = await fetch(`/api/v4/booklet/${id}/lab/${encodeURIComponent(labCode)}/evaluate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ questionIndex: q.questionIndex, answer }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message ?? body?.error ?? `http_${r.status}`);
      const next = [...feedback];
      next[cursor] = { verdict: body.verdict, score: body.score, explanation: body.explanation };
      setFeedback(next);
    } catch (e: any) {
      alert("تعذّر التقييم: " + String(e?.message ?? e));
    } finally {
      setEvaluating(false);
    }
  }

  async function advance() {
    if (!data) return;
    if (cursor < data.lab.questions.length - 1) {
      setCursor(cursor + 1);
      return;
    }
    // Last question — finalize with /submit.
    setFinalizing(true);
    try {
      const r = await fetch(`/api/v4/booklet/${id}/lab/${encodeURIComponent(labCode)}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ answers }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message ?? body?.error ?? `http_${r.status}`);
      setResult(body);
    } catch (e: any) {
      alert("تعذّر التسليم النهائي: " + String(e?.message ?? e));
    } finally {
      setFinalizing(false);
    }
  }

  function retry() {
    if (!data) return;
    const n = data.lab.questions.length;
    setResult(null);
    setCursor(0);
    setAnswers(new Array(n).fill(""));
    setFeedback(new Array(n).fill(null) as any);
  }

  const backToMap = () => navigate(`/booklet/${id}/map`);

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
        <p className="text-white/60">تعذّر تحميل المعمل. {err}</p>
        <button onClick={backToMap} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">
          رجوع للخريطة
        </button>
      </div>
    );
  }

  const totalQs = data.lab.questions.length;
  const currentQ = data.lab.questions[cursor];
  const currentFeedback = feedback[cursor];
  const isLast = cursor === totalQs - 1;

  return (
    <div className="min-h-[100dvh] bg-background text-white pb-24" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={backToMap} className="text-white/50 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-2xl">🧪</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-amber-300/70 font-semibold">معمل · {data.lab.code}</div>
            <div className="font-black text-sm truncate">{data.lab.title}</div>
          </div>
          {!result && <div className="text-[11px] bg-white/10 rounded-full px-2 py-1 text-white/70">{cursor + 1} / {totalQs}</div>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Scenario card */}
        <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-amber-700/5 p-5">
          <div className="text-[11px] text-amber-300/80 font-semibold mb-2">السيناريو</div>
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{data.lab.scenario}</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-[11px] text-white/40 font-semibold mb-1">معيار اكتمال المعمل</div>
            <p className="text-white/70 text-sm">{data.lab.completionCriterion}</p>
          </div>
        </div>

        {/* Prior attempt banner */}
        {data.prior && !result && cursor === 0 && !currentFeedback && (
          <div className={`rounded-2xl p-3 text-sm border ${data.prior.passed ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-rose-500/10 border-rose-400/30 text-rose-200"}`}>
            محاولتك السابقة: {data.prior.score}/100 — {data.prior.passed ? "اجتزت" : "لم تنجح"} · {data.prior.attempts} محاولة
          </div>
        )}

        {result ? (
          <ResultPanel result={result} onRetry={retry} onBackToMap={backToMap} />
        ) : (
          <>
            {/* Current question card */}
            <div className={`rounded-3xl border bg-gradient-to-br p-5 ${KIND_COLOR[currentQ.kind] ?? "from-white/5 to-white/0 border-white/10"}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold bg-white/10 rounded-full px-2 py-0.5">{KIND_ARABIC[currentQ.kind] ?? currentQ.kind}</span>
                <span className="text-[11px] text-white/40">السؤال {currentQ.questionIndex}</span>
              </div>
              <p className="text-white/95 leading-relaxed mb-3 text-base whitespace-pre-wrap">{currentQ.prompt}</p>
              <textarea
                value={answers[cursor] ?? ""}
                onChange={(e) => {
                  const next = [...answers]; next[cursor] = e.target.value; setAnswers(next);
                }}
                rows={4}
                disabled={!!currentFeedback || evaluating}
                placeholder="اكتب إجابتك هنا..."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 disabled:opacity-70"
              />

              {/* Live feedback */}
              {currentFeedback && (
                <div className={`mt-4 rounded-2xl border p-4 ${
                  currentFeedback.verdict === "correct" ? "bg-emerald-500/10 border-emerald-400/30" :
                  currentFeedback.verdict === "partial" ? "bg-amber-500/10 border-amber-400/30" :
                  "bg-rose-500/10 border-rose-400/30"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentFeedback.verdict === "correct" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                     currentFeedback.verdict === "partial" ? <AlertCircle className="w-4 h-4 text-amber-400" /> :
                     <XCircle className="w-4 h-4 text-rose-400" />}
                    <span className="text-[11px] font-bold text-white/80">
                      {currentFeedback.verdict === "correct" ? "صحيح" : currentFeedback.verdict === "partial" ? "جزئي" : "خطأ"}
                    </span>
                    <span className="text-[11px] text-white/50 ms-auto">{currentFeedback.score}/100</span>
                  </div>
                  <p className="text-sm text-white/85 leading-relaxed">{currentFeedback.explanation}</p>
                </div>
              )}
            </div>

            {/* Action button */}
            {!currentFeedback ? (
              <button
                onClick={evaluateCurrent}
                disabled={evaluating || !(answers[cursor] ?? "").trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {evaluating ? "جاري التقييم..." : "إرسال الإجابة"}
              </button>
            ) : (
              <button
                onClick={advance}
                disabled={finalizing}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-400 text-black font-black disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {finalizing ? "جاري إنهاء المعمل..." : isLast ? "إنهاء المعمل" : "السؤال التالي"}
                {!finalizing && <ArrowLeft className="w-4 h-4" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel(props: {
  result: { score: number; passed: boolean; passThreshold: number; evaluatorLog: EvalRow[] };
  onRetry: () => void;
  onBackToMap: () => void;
}) {
  const r = props.result;
  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center ${r.passed ? "bg-emerald-500/10 border-emerald-400/30" : "bg-rose-500/10 border-rose-400/30"}`}>
        <div className="text-5xl mb-2">{r.passed ? "🎉" : "🔄"}</div>
        <div className={`text-2xl font-black ${r.passed ? "text-emerald-300" : "text-rose-300"}`}>
          {r.score}/100
        </div>
        <div className="text-sm text-white/70 mt-1">
          {r.passed ? `اجتزت المعمل (الحد الأدنى ${r.passThreshold})` : `لم تجتز — تحتاج ${r.passThreshold} على الأقل`}
        </div>
      </div>

      {r.evaluatorLog.map((row) => (
        <div key={row.questionId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            {row.verdict === "correct" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
             row.verdict === "partial" ? <AlertCircle className="w-4 h-4 text-amber-400" /> :
             <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-[11px] text-white/40">السؤال {row.questionIndex} · {KIND_ARABIC[row.kind] ?? row.kind}</span>
            <span className="text-[11px] text-white/60 ms-auto">{row.score}/100</span>
          </div>
          <div className="text-sm text-white/80 mb-2 whitespace-pre-wrap">{row.prompt}</div>
          <div className="text-xs text-white/50 mb-2 bg-black/20 rounded-lg px-2 py-1.5 whitespace-pre-wrap">
            <span className="text-white/30">إجابتك: </span>{row.studentAnswer}
          </div>
          <div className="text-xs text-white/70 leading-relaxed">{row.explanation}</div>
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={props.onRetry} className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-bold">إعادة المحاولة</button>
        <button onClick={props.onBackToMap} className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black">العودة للخريطة</button>
      </div>
    </div>
  );
}
