/**
 * concept-drill-panel.tsx — weakness-driven targeted practice ("gap filling").
 *
 * Opened from the v4 lesson when the teacher flags a concept weak. Loads a
 * focused 3-question drill from /api/v4/practice, lets the student answer, then
 * grades it server-side (isolated Haiku grader) and shows the in-lesson
 * before→after moment ("«المفهوم»: 40 → 85") — the visible "the teacher
 * understands my weakness and is filling it" payoff.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Sparkles } from "lucide-react";

type DrillQuestion = { prompt: string; kind: string };
type PerQ = { score: number; verdict: "correct" | "partial" | "wrong"; explanation: string };
type Phase = "loading" | "answer" | "grading" | "result" | "error";

const KIND_AR: Record<string, string> = {
  diagnostic: "تشخيص", decision: "قرار", application: "تطبيق", analysis: "تحليل", connection: "ربط",
};

export function ConceptDrillPanel({
  slug, lessonCode, conceptIndex, conceptName, onBalance, onMastered, onClose,
}: {
  slug: string;
  lessonCode: string;
  conceptIndex: number;
  conceptName: string;
  onBalance: (b: number) => void;
  onMastered: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [scoreBefore, setScoreBefore] = useState(0);
  const [round, setRound] = useState(0);
  const [nonce, setNonce] = useState("");
  const [result, setResult] = useState<{ scoreAfter: number; passed: boolean; perQuestion: PerQ[] } | null>(null);

  const base = `/api/v4/practice/${encodeURIComponent(slug)}/${encodeURIComponent(lessonCode)}/${conceptIndex}`;

  const load = useCallback(async (r: number) => {
    setPhase("loading"); setErrMsg(""); setResult(null);
    try {
      const res = await fetch(`${base}?round=${r}`, { credentials: "include" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErrMsg(data?.error === "drill_unavailable"
          ? "تعذّر تجهيز التدريب الآن — حاول بعد قليل."
          : "تعذّر تحميل التدريب.");
        setPhase("error");
        return;
      }
      const qs: DrillQuestion[] = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(""));
      setScoreBefore(typeof data.scoreBefore === "number" ? data.scoreBefore : 0);
      setRound(r);
      setNonce(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
      setPhase(qs.length ? "answer" : "error");
      if (!qs.length) setErrMsg("لا توجد أسئلة متاحة لهذا التدريب.");
    } catch {
      setErrMsg("تعذّر الاتصال بالخادم.");
      setPhase("error");
    }
  }, [base]);

  useEffect(() => { void load(0); }, [load]);

  async function submit() {
    if (answers.some((a) => !a.trim())) { setErrMsg("أجب عن كل الأسئلة أولاً."); return; }
    setErrMsg(""); setPhase("grading");
    try {
      const res = await fetch(base, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ answers, round, attemptNonce: nonce }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.status === 402) { setErrMsg("رصيد الجواهر غير كافٍ لهذا التدريب."); setPhase("answer"); return; }
      if (!res.ok) {
        setErrMsg(data?.error === "grader_unavailable"
          ? "تعذّر التصحيح الآن ولم يُخصم شيء — أعد المحاولة."
          : "تعذّر التصحيح، حاول مجدداً.");
        setPhase("answer");
        return;
      }
      setResult({
        scoreAfter: typeof data.scoreAfter === "number" ? data.scoreAfter : scoreBefore,
        passed: !!data.passed,
        perQuestion: Array.isArray(data.perQuestion) ? data.perQuestion : [],
      });
      if (typeof data.balanceAfter === "number") onBalance(data.balanceAfter);
      if (data.passed) onMastered();
      setPhase("result");
    } catch {
      setErrMsg("تعذّر الاتصال بالخادم.");
      setPhase("answer");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-[#11142a] border border-amber-400/30 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-amber-300/80 font-semibold">تدريب موجَّه لسدّ الثغرة</div>
            <div className="font-black text-white text-sm truncate">«{conceptName}»</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1" title="إغلاق" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === "loading" && (
          <div className="py-10 flex flex-col items-center gap-3 text-white/60 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            يجهّز معلّمك تدريباً مركّزاً على نقطة ضعفك…
          </div>
        )}

        {phase === "error" && (
          <div className="py-8 text-center space-y-3">
            <div className="text-sm text-rose-200">{errMsg || "حدث خطأ."}</div>
            <button onClick={() => void load(round)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">إعادة المحاولة</button>
          </div>
        )}

        {(phase === "answer" || phase === "grading") && (
          <div className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed">
              أجب عن هذه التمارين القصيرة؛ سيصحّحها مصحّح مستقل ويرفع إتقانك للمفهوم. مستواك الحالي: <span className="text-amber-300 font-bold tabular-nums">{scoreBefore}/100</span>
            </p>
            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30">{KIND_AR[q.kind] ?? q.kind}</span>
                  <div className="text-sm text-white/90 leading-relaxed">{q.prompt}</div>
                </div>
                <textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                  disabled={phase === "grading"}
                  rows={2}
                  placeholder="اكتب إجابتك…"
                  className="w-full resize-none bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 disabled:opacity-60"
                />
              </div>
            ))}
            {errMsg && <div className="text-xs text-rose-300">{errMsg}</div>}
            <button
              onClick={submit}
              disabled={phase === "grading"}
              className="w-full py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {phase === "grading" ? <><Loader2 className="w-4 h-4 animate-spin" /> يُصحّح…</> : "سلّم وقيّم"}
            </button>
          </div>
        )}

        {phase === "result" && result && (
          <div className="space-y-4">
            {/* Before → after — the "genius" payoff moment */}
            <div className={`rounded-2xl border p-4 text-center space-y-2 ${result.passed ? "border-emerald-400/40 bg-emerald-500/10" : "border-amber-400/40 bg-amber-500/10"}`}>
              <div className="text-3xl">{result.passed ? "🏆" : "📈"}</div>
              <div className="text-white/80 font-bold text-sm">«{conceptName}»</div>
              <div className="flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
                <span className="text-white/40">{scoreBefore}</span>
                <span className="text-amber-400 text-xl">→</span>
                <span className={result.passed ? "text-emerald-300" : "text-amber-300"}>{result.scoreAfter}</span>
              </div>
              <div className="text-xs text-white/70 leading-relaxed">
                {result.passed
                  ? "أتقنتَ هذا المفهوم — سدّ معلّمك الثغرة معك ✅"
                  : "تحسّنت! واصل التدريب لترفع إتقانك فوق ٧٥."}
              </div>
            </div>

            {/* Per-question feedback */}
            <div className="space-y-2">
              {result.perQuestion.map((r, i) => (
                <div key={i} className={`rounded-xl border p-2.5 text-xs ${r.verdict === "correct" ? "border-emerald-500/30 bg-emerald-500/5" : r.verdict === "partial" ? "border-amber-500/30 bg-amber-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
                  <div className="flex items-center gap-2 font-bold">
                    <span className={r.verdict === "correct" ? "text-emerald-300" : r.verdict === "partial" ? "text-amber-300" : "text-rose-300"}>
                      سؤال {i + 1} — {r.score}/100
                    </span>
                  </div>
                  <div className="text-white/70 mt-1 leading-relaxed">{r.explanation}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => void load(round + 1)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold">
                تدرّب أكثر
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-amber-400 text-black text-sm font-black">
                العودة للدرس
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
