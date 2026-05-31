/**
 * v4-exam.tsx — Unified exam screen for unit/stage/level exams (task #7).
 *
 * Flow:
 *   1. GET /api/v4/exam/:slug/:examCode → variant pick (round-robin),
 *      questions, and wallet check (`cost.canAfford`).
 *   2. If first attempt and not affordable → block with "buy gems" CTA.
 *   3. Render questions (MCQ as radio, others as textarea).
 *   4. POST .../submit → server grades, charges (first attempt only),
 *      records attempt, returns score + per-question feedback.
 *   5. Pass → celebration. Fail → "retry alt-bank free" CTA that just
 *      re-fetches (rotation logic on the server hands a different variant).
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Loader2, ChevronRight, CheckCircle2, XCircle, AlertCircle, Gem } from "lucide-react";

type ExamQuestion = {
  id: number;
  questionIndex: number;
  kind: string;             // "mcq" | "short_answer" | "practical"
  prompt: string;
  choices?: string[];       // only when kind=mcq
};
type ExamPayload = {
  slug: string;
  exam: {
    examCode: string;
    scope: "unit" | "stage" | "level";
    variantIndex: number;
    totalVariantsAvailable: number;
    priorAttempts: number;
    questions: ExamQuestion[];
  };
  cost: { willCharge: boolean; costUsd: number; costGems: number; balance: number | null; canAfford: boolean };
  passThreshold: number;
};
type EvalRow = {
  questionId: number; questionIndex: number; kind: string; prompt: string;
  studentAnswer: string;
  verdict: "correct" | "partial" | "wrong";
  score: number;
  explanation: string;
};
type SubmitResult = {
  score: number;
  passed: boolean;
  passThreshold: number;
  variantIndex: number;
  attemptNumber: number;
  gemsDeducted: number;
  evaluatorLog: EvalRow[];
  unlocked: { newlyUnlocked: string[]; nextLessonCode: string | null } | null;
};

const SCOPE_LABEL: Record<string, string> = {
  unit: "اختبار وحدة",
  stage: "اختبار مرحلة",
  level: "اختبار مستوى",
};

export default function V4Exam() {
  const [, params] = useRoute<{ slug: string; examCode: string }>("/exam/:slug/:examCode");
  const slug = params?.slug ?? "";
  const examCode = decodeURIComponent(params?.examCode ?? "");
  const [, navigate] = useLocation();

  const [data, setData] = useState<ExamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | number | null)[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // retryMode is set when the student comes back from a failed attempt:
  //   "paid_same_bank" → pay gems, same variant     (server reuses last variantIndex)
  //   "free_alt_bank"  → free, rotated next variant (default round-robin)
  // It is sent on BOTH the GET (so the preview shows the right variant +
  // re-enables the gem-confirmation gate) and the POST (so the server
  // charges accordingly).
  const [retryMode, setRetryMode] = useState<"" | "paid_same_bank" | "free_alt_bank">("");

  async function loadExam(mode: "" | "paid_same_bank" | "free_alt_bank" = "") {
    setLoading(true);
    setErr(null);
    setResult(null);
    setConfirmed(false);
    setRetryMode(mode);
    try {
      const qs = mode ? `?retryMode=${mode}` : "";
      const r = await fetch(`/api/v4/exam/${encodeURIComponent(slug)}/${encodeURIComponent(examCode)}${qs}`, { credentials: "include" });
      if (!r.ok) throw new Error(`http_${r.status}`);
      const d: ExamPayload = await r.json();
      setData(d);
      setAnswers(new Array(d.exam.questions.length).fill(null));
    } catch (e: any) {
      setErr(String(e?.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (slug && examCode) loadExam(""); /* eslint-disable-next-line */ }, [slug, examCode]);

  async function submit() {
    if (!data) return;
    if (answers.some(a => a == null || (typeof a === "string" && !a.trim()))) {
      alert("أكمل جميع الأسئلة قبل التسليم.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/v4/exam/${encodeURIComponent(slug)}/${encodeURIComponent(examCode)}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ answers, retryMode: retryMode || undefined }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 402) {
          alert(`رصيدك غير كافٍ. تحتاج ${body.costGems} جوهرة (رصيدك ${body.balance ?? 0}).`);
          return;
        }
        throw new Error(body.error ?? `http_${r.status}`);
      }
      setResult(body as SubmitResult);
    } catch (e: any) {
      alert("تعذّر إرسال الإجابات: " + String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
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
        <button onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">
          رجوع للخريطة
        </button>
      </div>
    );
  }

  // ── Pre-confirm gate (only on first attempt, only if gems will be charged) ──
  if (!confirmed && !result && data.cost.willCharge) {
    const canAfford = data.cost.canAfford;
    return (
      <div className="min-h-[100dvh] bg-background text-white" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)} className="text-white/50 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-xl">📝</div>
            <div className="flex-1 font-black text-sm">{SCOPE_LABEL[data.exam.scope]} · {data.exam.examCode}</div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 pt-12 text-center space-y-5">
          <div className="text-6xl">{data.exam.scope === "level" ? "🏆" : data.exam.scope === "stage" ? "🎯" : "📝"}</div>
          <h1 className="text-2xl font-black">{SCOPE_LABEL[data.exam.scope]}</h1>
          <p className="text-white/60 text-sm">
            عدد الأسئلة: {data.exam.questions.length} · الحد الأدنى للنجاح: {data.passThreshold}%
          </p>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 inline-flex items-center gap-3">
            <Gem className="w-5 h-5 text-amber-400" />
            <div className="text-right">
              <div className="text-xs text-white/60">تكلفة المحاولة الأولى</div>
              <div className="font-black text-amber-300">{data.cost.costGems} جوهرة</div>
            </div>
          </div>
          {data.cost.balance != null && (
            <div className="text-xs text-white/50">رصيدك الحالي: {data.cost.balance} جوهرة</div>
          )}
          <div className="text-xs text-white/40 leading-relaxed px-4">
            عند الرسوب، الإعادة بمجموعة بديلة <span className="text-emerald-300">بدون خصم</span>.
          </div>
          {canAfford ? (
            <button
              onClick={() => setConfirmed(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black"
            >
              ابدأ الاختبار
            </button>
          ) : (
            <>
              <div className="text-rose-300 text-sm">رصيدك غير كافٍ.</div>
              <button onClick={() => navigate("/subscription")} className="w-full py-3 rounded-2xl bg-white/10 text-white">شحن الجواهر</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-white pb-24" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)} className="text-white/50 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="text-xl">📝</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-amber-300/70 font-semibold">
              {SCOPE_LABEL[data.exam.scope]} · المجموعة {data.exam.variantIndex}/{data.exam.totalVariantsAvailable}
            </div>
            <div className="font-black text-sm truncate">{data.exam.examCode}</div>
          </div>
          {data.exam.priorAttempts > 0 && (
            <div className="text-[10px] bg-white/10 rounded-full px-2 py-1 text-white/70">
              محاولة #{data.exam.priorAttempts + 1}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {result ? (
          <ResultPanel
            result={result}
            slug={slug}
            scope={data.exam.scope}
            costGems={data.cost.costGems}
            onRetryFreeAltBank={() => loadExam("free_alt_bank")}
            onRetryPaidSameBank={() => loadExam("paid_same_bank")}
            onBackToMap={() => navigate(`/specialty/${encodeURIComponent(slug)}/map`)}
          />
        ) : (
          <>
            {data.exam.questions.map((q, i) => (
              <div key={q.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-[11px] text-white/40 mb-2">السؤال {q.questionIndex}</div>
                <p className="text-white/95 leading-relaxed mb-3">{q.prompt}</p>
                {q.kind === "mcq" && q.choices && q.choices.length > 0 ? (
                  <div className="space-y-2">
                    {q.choices.map((c, j) => (
                      <label
                        key={j}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          answers[i] === j ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[i] === j}
                          onChange={() => {
                            const next = [...answers]; next[i] = j; setAnswers(next);
                          }}
                          className="accent-amber-400"
                        />
                        <span className="text-sm text-white/90">{c}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={(answers[i] as string) ?? ""}
                    onChange={(e) => {
                      const next = [...answers]; next[i] = e.target.value; setAnswers(next);
                    }}
                    rows={3}
                    placeholder="اكتب إجابتك هنا..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50"
                  />
                )}
              </div>
            ))}
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black disabled:opacity-40"
            >
              {submitting ? "جاري التقييم..." : "تسليم الاختبار"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ResultPanel(props: {
  result: SubmitResult;
  slug: string;
  scope: "unit" | "stage" | "level";
  costGems: number;
  onRetryFreeAltBank: () => void;
  onRetryPaidSameBank: () => void;
  onBackToMap: () => void;
}) {
  const r = props.result;
  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center ${r.passed ? "bg-emerald-500/10 border-emerald-400/30" : "bg-rose-500/10 border-rose-400/30"}`}>
        <div className="text-5xl mb-2">{r.passed ? "🏆" : "🔄"}</div>
        <div className={`text-2xl font-black ${r.passed ? "text-emerald-300" : "text-rose-300"}`}>
          {r.score}/100
        </div>
        <div className="text-sm text-white/70 mt-1">
          {r.passed ? `اجتزت! (الحد ${r.passThreshold}%)` : `لم تنجح — تحتاج ${r.passThreshold}% على الأقل`}
        </div>
        <div className="text-[11px] text-white/40 mt-2">المجموعة {r.variantIndex} · المحاولة {r.attemptNumber}{r.gemsDeducted > 0 ? ` · ${r.gemsDeducted} جوهرة` : " · بلا خصم"}</div>
        {r.unlocked && r.unlocked.newlyUnlocked.length > 0 && (
          <div className="mt-3 inline-block bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-1.5 text-xs text-emerald-200">
            ✨ فُتح {r.unlocked.newlyUnlocked.length} درس جديد
          </div>
        )}
      </div>

      {r.evaluatorLog.map((row) => (
        <div key={row.questionId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            {row.verdict === "correct" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
             row.verdict === "partial" ? <AlertCircle className="w-4 h-4 text-amber-400" /> :
             <XCircle className="w-4 h-4 text-rose-400" />}
            <span className="text-[11px] text-white/40">السؤال {row.questionIndex}</span>
            <span className="text-[11px] text-white/60 ms-auto">{row.score}/100</span>
          </div>
          <div className="text-sm text-white/80 mb-2">{row.prompt}</div>
          <div className="text-xs text-white/50 mb-2 bg-black/20 rounded-lg px-2 py-1.5 whitespace-pre-wrap">
            <span className="text-white/30">إجابتك: </span>{row.studentAnswer}
          </div>
          <div className="text-xs text-white/70 leading-relaxed">{row.explanation}</div>
        </div>
      ))}

      {/* Two-option failure UX (spec §13.2): pay-same-bank OR free-alt-bank */}
      {!r.passed ? (
        <div className="space-y-3">
          <div className="text-[11px] text-white/50 text-center">اختر طريقة الإعادة</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={props.onRetryFreeAltBank}
              className="rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-4 text-right hover:bg-emerald-500/20 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <Gem className="w-4 h-4 text-emerald-300" />
                <div className="text-emerald-200 text-sm font-black">مجاناً · بنك بديل</div>
              </div>
              <div className="text-[11px] text-white/60 leading-relaxed">أسئلة من مجموعة بديلة (تدوير تلقائي)، بلا خصم جواهر.</div>
            </button>
            <button
              onClick={props.onRetryPaidSameBank}
              className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 text-right hover:bg-amber-500/15 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <Gem className="w-4 h-4 text-amber-300" />
                <div className="text-amber-200 text-sm font-black">{props.costGems} جوهرة · نفس البنك</div>
              </div>
              <div className="text-[11px] text-white/60 leading-relaxed">نفس الأسئلة لتمرّن على ضعفك، مع خصم جواهر إضافي.</div>
            </button>
          </div>
          <button onClick={props.onBackToMap} className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold">
            العودة للخريطة
          </button>
        </div>
      ) : (
        <button onClick={props.onBackToMap} className="w-full py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black">
          العودة للخريطة
        </button>
      )}
    </div>
  );
}
