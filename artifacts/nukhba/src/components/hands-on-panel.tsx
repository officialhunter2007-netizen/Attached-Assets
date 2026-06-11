/**
 * hands-on-panel.tsx — PROACTIVE hands-on practice ("التطبيق العملي").
 *
 * Nukhba's core differentiator. The moment a concept is grasped, the v4 teach
 * `done` event carries a handsOnOffer and the lesson pins a "تطبيق عملي" card;
 * opening it mounts this panel. The student is given ONE real Yemeni-context
 * task to PRODUCE/DO (not a quiz), submits their deliverable, and an isolated
 * Haiku grader scores it instantly — feeding the same monotonic mastery
 * («المفهوم»: 50 → 88). Mirrors concept-drill-panel.tsx, but it is a single
 * produce-task instead of a 3-question drill, and it fires onApplied as soon as
 * the first attempt is graded (the concept is marked applied server-side then).
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, X, Wrench } from "lucide-react";

type HandsOnTask = { title: string; scenario: string; deliverable: string; steps: string[] };
type Phase = "loading" | "answer" | "grading" | "result" | "error";

export function HandsOnPanel({
  slug, lessonCode, conceptIndex, conceptName, onBalance, onApplied, onClose,
}: {
  slug: string;
  lessonCode: string;
  conceptIndex: number;
  conceptName: string;
  onBalance: (b: number) => void;
  /** Fired once the first attempt is graded (concept is now applied server-side). */
  onApplied: (conceptIndex: number) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [task, setTask] = useState<HandsOnTask | null>(null);
  const [submission, setSubmission] = useState("");
  const [scoreBefore, setScoreBefore] = useState(0);
  const [nonce, setNonce] = useState("");
  const [result, setResult] = useState<
    { scoreAfter: number; passed: boolean; verdict: string; explanation: string } | null
  >(null);

  const base = `/api/v4/handson/${encodeURIComponent(slug)}/${encodeURIComponent(lessonCode)}/${conceptIndex}`;

  const newNonce = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const load = useCallback(async () => {
    setPhase("loading"); setErrMsg(""); setResult(null);
    try {
      const res = await fetch(base, { credentials: "include" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErrMsg(data?.error === "handson_unavailable"
          ? "تعذّر تجهيز المهمة الآن — حاول بعد قليل."
          : "تعذّر تحميل التطبيق العملي.");
        setPhase("error");
        return;
      }
      const t = data?.task && typeof data.task === "object" ? (data.task as HandsOnTask) : null;
      if (!t || !t.deliverable) {
        setErrMsg("لا توجد مهمة متاحة لهذا المفهوم.");
        setPhase("error");
        return;
      }
      setTask({
        title: typeof t.title === "string" ? t.title : "تطبيق عملي",
        scenario: typeof t.scenario === "string" ? t.scenario : "",
        deliverable: t.deliverable,
        steps: Array.isArray(t.steps) ? t.steps.filter((s) => typeof s === "string") : [],
      });
      setScoreBefore(typeof data.scoreBefore === "number" ? data.scoreBefore : 0);
      setSubmission("");
      setNonce(newNonce());
      setPhase("answer");
    } catch {
      setErrMsg("تعذّر الاتصال بالخادم.");
      setPhase("error");
    }
  }, [base]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!submission.trim()) { setErrMsg("اكتب ناتجك أولاً."); return; }
    setErrMsg(""); setPhase("grading");
    try {
      const res = await fetch(base, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ submission, attemptNonce: nonce }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.status === 402) { setErrMsg("رصيد الجواهر غير كافٍ لهذا التطبيق."); setPhase("answer"); return; }
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
        verdict: typeof data.verdict === "string" ? data.verdict : "partial",
        explanation: typeof data.explanation === "string" ? data.explanation : "",
      });
      if (typeof data.balanceAfter === "number") onBalance(data.balanceAfter);
      // ANY graded attempt marks the concept applied server-side → drop the pin.
      onApplied(conceptIndex);
      setPhase("result");
    } catch {
      setErrMsg("تعذّر الاتصال بالخادم.");
      setPhase("answer");
    }
  }

  function retry() {
    setResult(null);
    setSubmission("");
    setNonce(newNonce());
    setErrMsg("");
    setPhase("answer");
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
          <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-amber-300/80 font-semibold">تطبيق عملي</div>
            <div className="font-black text-white text-sm truncate">«{conceptName}»</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1" title="إغلاق" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === "loading" && (
          <div className="py-10 flex flex-col items-center gap-3 text-white/60 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            يجهّز معلّمك مهمّة عملية تطبّق بها ما فهمته…
          </div>
        )}

        {phase === "error" && (
          <div className="py-8 text-center space-y-3">
            <div className="text-sm text-rose-200">{errMsg || "حدث خطأ."}</div>
            <button onClick={() => void load()} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">إعادة المحاولة</button>
          </div>
        )}

        {(phase === "answer" || phase === "grading") && task && (
          <div className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed">
              طبّق ما فهمته بإنتاج ناتج حقيقي؛ سيصحّحه مصحّح مستقل ويرفع إتقانك. مستواك الحالي: <span className="text-amber-300 font-bold tabular-nums">{scoreBefore}/100</span>
            </p>

            {/* The task */}
            <div className="rounded-2xl bg-white/5 border border-amber-400/20 p-3.5 space-y-3">
              {task.title && <div className="font-black text-amber-200 text-sm">{task.title}</div>}
              {task.scenario && (
                <div className="text-sm text-white/85 leading-relaxed">{task.scenario}</div>
              )}
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 p-2.5">
                <div className="text-[10px] text-amber-300/90 font-bold mb-1">المطلوب إنتاجه</div>
                <div className="text-sm text-white/90 leading-relaxed">{task.deliverable}</div>
              </div>
              {task.steps.length > 0 && (
                <ol className="space-y-1.5 list-none">
                  {task.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/70 leading-relaxed">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 grid place-items-center text-[10px] font-bold tabular-nums">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              disabled={phase === "grading"}
              rows={6}
              placeholder="اكتب ناتجك هنا (الخطة / التصميم / الحساب / الكود / التحليل…)"
              className="w-full resize-none bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 disabled:opacity-60 leading-relaxed"
            />
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
            {/* Before → after — the "I actually applied it" payoff moment */}
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
                  ? "أتقنتَ هذا المفهوم بتطبيقه فعلاً — هذا هو الفرق ✅"
                  : "تطبيق جيّد! حسّن ناتجك لترفع إتقانك فوق ٧٥."}
              </div>
            </div>

            {/* Grader feedback */}
            {result.explanation && (
              <div className={`rounded-xl border p-3 text-xs leading-relaxed ${result.verdict === "correct" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100" : result.verdict === "partial" ? "border-amber-500/30 bg-amber-500/5 text-amber-100" : "border-rose-500/30 bg-rose-500/5 text-rose-100"}`}>
                {result.explanation}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={retry} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold">
                حاول مجدداً
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
