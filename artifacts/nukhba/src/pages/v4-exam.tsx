/**
 * v4-exam.tsx — Unified exam screen for unit / stage / level exams.
 *
 * Scope-adaptive: a UNIT exam gets the richest brief (real unit name, goal,
 * key concepts, level/stage breadcrumb); stage & level exams reuse the SAME
 * screen with lighter labels. One component, branch by `scope` for context
 * richness only.
 *
 * Flow:
 *   1. GET /api/v4/exam/:slug/:examCode → variant pick, questions, wallet
 *      check (`cost.canAfford`), scope `context`, and summary `stats`.
 *   2. Brief / start screen — shows the context + stats and folds in the gem
 *      confirmation gate (first attempt charges; alt-bank retry is free).
 *   3. One question at a time (stepper) with a progress bar, answered dots,
 *      prev/next, and a review screen to jump back before submitting.
 *   4. POST .../submit — server grades, charges (first attempt only), records
 *      the attempt, returns score + per-question feedback. UNCHANGED.
 *   5. Pass → celebration. Fail → two retry options (free alt-bank / paid
 *      same-bank), both just re-fetch — rotation logic lives on the server.
 *
 * Presentation notes:
 *   - Prompts/feedback may contain admin-authored fenced code (```lang ...```).
 *     They are rendered with a small, SAFE, escape-by-construction renderer:
 *     plain text is a React child (auto-escaped); recognized code languages
 *     use highlight.js output (which escapes the code text itself). There is
 *     NO raw-HTML injection of unsanitized content.
 *   - This screen serves NON-technical specialties too, so code rendering is
 *     CONTENT-driven (only when a code fence is actually present), never
 *     hardcoded to "this is a programming subject".
 *
 * The `answers` array MUST stay index-parallel to `questions` exactly as the
 * submit endpoint expects — questions are never sorted/filtered client-side,
 * and answers are reset on every (re)load since the variant may change.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRoute, useLocation } from "wouter";
import hljs from "highlight.js";
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, XCircle, AlertCircle,
  Gem, Clock, Target, ListChecks, Award, BookOpen, ArrowRight, ListTodo,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type ExamQuestion = {
  id: number;
  questionIndex: number;
  kind: string;             // "mcq" | "short_answer" | "practical"
  prompt: string;
  choices?: string[];       // only when kind=mcq
  points?: number;
  timeLimitSeconds?: number | null;
};
type ExamContext = {
  scope: "unit" | "stage" | "level";
  title: string;
  goal: string;
  keyConcepts: string[];
  levelName: string | null;
  stageName: string | null;
  instructions: string | null;
} | null;
type ExamStats = {
  questionCount: number;
  totalPoints: number;
  suggestedTotalSeconds: number | null;
  kindBreakdown: Record<string, number>;
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
  context?: ExamContext;
  stats?: ExamStats;
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

// ── Static label maps (no dynamic tailwind classes) ───────────────────────────
const SCOPE_LABEL: Record<string, string> = {
  unit: "اختبار وحدة",
  stage: "اختبار مرحلة",
  level: "اختبار مستوى",
};
const SCOPE_EMOJI: Record<string, string> = { unit: "📝", stage: "🎯", level: "🏆" };
const KIND_LABEL: Record<string, string> = {
  mcq: "اختيار",
  short_answer: "كتابة",
  practical: "عملي",
};
function kindLabel(k: string): string { return KIND_LABEL[k] ?? k; }
function kindBadgeClass(k: string): string {
  if (k === "mcq") return "bg-sky-500/15 border-sky-400/30 text-sky-200";
  if (k === "practical") return "bg-amber-500/15 border-amber-400/30 text-amber-200";
  if (k === "short_answer") return "bg-emerald-500/15 border-emerald-400/30 text-emerald-200";
  return "bg-white/10 border-white/15 text-white/70";
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}ث`;
  if (r === 0) return `${m}د`;
  return `${m}د ${r}ث`;
}
function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// ── Safe rich-text renderer (fenced code + inline code, escape-by-construction) ─
type Seg = { type: "text" | "code"; content: string; lang?: string };
function parseSegments(input: string): Seg[] {
  const segs: Seg[] = [];
  const re = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) segs.push({ type: "text", content: input.slice(last, m.index) });
    const lang = (m[1] || "").trim().toLowerCase();
    segs.push({ type: "code", content: m[2].replace(/\n+$/, ""), lang: lang || undefined });
    last = re.lastIndex;
  }
  if (last < input.length) segs.push({ type: "text", content: input.slice(last) });
  if (segs.length === 0) segs.push({ type: "text", content: input });
  return segs;
}
function renderInline(text: string): ReactNode[] {
  // Split on `inline code` spans; everything else is plain (auto-escaped) text.
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`")) {
      return (
        <code
          key={i}
          dir="ltr"
          className="inline-block align-middle mx-0.5 px-1.5 py-0.5 rounded-md bg-black/40 border border-white/10 font-mono text-[0.85em] text-amber-200"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  let html: string | null = null;
  if (lang && hljs.getLanguage(lang)) {
    // highlight.js escapes the code text itself; its output is safe to inject.
    try { html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value; }
    catch { html = null; }
  }
  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-amber-400/15 bg-[#0a0e16]">
      {lang && (
        <div dir="ltr" className="px-3 py-1.5 text-[10px] font-mono text-amber-300/60 bg-black/40 border-b border-white/5 tracking-wider">
          {lang}
        </div>
      )}
      <pre dir="ltr" className="overflow-x-auto p-3.5 text-left text-[13px] leading-relaxed font-mono text-white/90">
        {html != null
          ? <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
          : <code className="hljs whitespace-pre">{code}</code>}
      </pre>
    </div>
  );
}
function RichText({ text, className }: { text: string; className?: string }) {
  const segs = parseSegments(text ?? "");
  return (
    <div className={className}>
      {segs.map((s, i) => {
        if (s.type === "code") return <CodeBlock key={i} code={s.content} lang={s.lang} />;
        if (!s.content.trim()) return null; // drop whitespace-only gaps between fences
        return (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {renderInline(s.content)}
          </p>
        );
      })}
    </div>
  );
}

// Plain one-line preview (used in the review list) — strips fences & collapses ws.
function previewText(input: string, max = 90): string {
  const noCode = (input ?? "").replace(/```[\s\S]*?```/g, " [كود] ").replace(/`([^`]+)`/g, "$1");
  const flat = noCode.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max) + "…" : flat;
}

function deriveStats(questions: ExamQuestion[]): ExamStats {
  const kindBreakdown: Record<string, number> = {};
  let totalPoints = 0;
  let suggested = 0;
  let anyTime = false;
  for (const q of questions) {
    kindBreakdown[q.kind] = (kindBreakdown[q.kind] ?? 0) + 1;
    totalPoints += Math.max(1, Number(q.points ?? 1) || 1);
    if (q.timeLimitSeconds != null) { suggested += Math.max(0, Number(q.timeLimitSeconds) || 0); anyTime = true; }
  }
  return { questionCount: questions.length, totalPoints, suggestedTotalSeconds: anyTime ? suggested : null, kindBreakdown };
}

function isAnswered(a: string | number | null | undefined): boolean {
  if (a == null) return false;
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}

// ── Shared top bar ────────────────────────────────────────────────────────────
function TopBar(props: { onBack: () => void; eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <button onClick={props.onBack} className="text-white/50 hover:text-white shrink-0">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="text-xl shrink-0">📝</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-amber-300/70 font-semibold truncate">{props.eyebrow}</div>
          <div className="font-black text-sm truncate">{props.title}</div>
        </div>
        {props.right}
      </div>
    </div>
  );
}

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

  // Stepper state.
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  // Per-question practical input mode override (true=code, false=text). When a
  // question isn't in the map we default by whether its prompt contains a code
  // fence — so coding questions get an LTR code box and prose questions don't.
  const [codeModeMap, setCodeModeMap] = useState<Record<number, boolean>>({});

  // Informational countdown clock (never auto-submits / penalizes).
  const [nowTick, setNowTick] = useState(Date.now());
  const qStartRef = useRef(Date.now());

  // retryMode is set when the student comes back from a failed attempt:
  //   "paid_same_bank" → pay gems, same variant     (server reuses last variantIndex)
  //   "free_alt_bank"  → free, rotated next variant (default round-robin)
  const [retryMode, setRetryMode] = useState<"" | "paid_same_bank" | "free_alt_bank">("");

  async function loadExam(mode: "" | "paid_same_bank" | "free_alt_bank" = "") {
    setLoading(true);
    setErr(null);
    setResult(null);
    setConfirmed(false);
    setReviewing(false);
    setStep(0);
    setCodeModeMap({});
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

  // Reset the per-question clock whenever the active question changes.
  useEffect(() => { qStartRef.current = Date.now(); setNowTick(Date.now()); }, [step, confirmed, reviewing]);
  // Tick once a second only while a question is on screen.
  useEffect(() => {
    if (!confirmed || reviewing || result) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [confirmed, reviewing, result, step]);

  async function submit() {
    if (!data) return;
    if (answers.some(a => !isAnswered(a))) {
      setReviewing(true);
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
      setReviewing(false);
    } catch (e: any) {
      alert("تعذّر إرسال الإجابات: " + String(e?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────────
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

  const scope = data.exam.scope;
  const ctx = data.context ?? null;
  const stats = data.stats ?? deriveStats(data.exam.questions);
  const headerTitle = ctx?.title || SCOPE_LABEL[scope] || "اختبار";
  const backToMap = () => navigate(`/specialty/${encodeURIComponent(slug)}/map`);

  // ── Brief / start screen (folds in the gem gate) ────────────────────────────
  if (!confirmed && !result) {
    const breadcrumb = scope === "unit"
      ? [ctx?.levelName, ctx?.stageName].filter(Boolean).join(" › ")
      : scope === "stage"
        ? [ctx?.levelName].filter(Boolean).join(" › ")
        : "";
    const kinds = stats.kindBreakdown;
    const kindChips = Object.keys(kinds)
      .filter(k => kinds[k] > 0)
      .map(k => `${kinds[k]} ${kindLabel(k)}`);

    return (
      <div className="min-h-[100dvh] bg-background text-white pb-16" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
        <TopBar onBack={backToMap} eyebrow={`${SCOPE_LABEL[scope]} · ${data.exam.examCode}`} title={headerTitle} />

        <div className="max-w-md mx-auto px-4 pt-8 space-y-5">
          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="text-6xl">{SCOPE_EMOJI[scope]}</div>
            <div className="text-[11px] text-amber-300/70 font-bold tracking-wide">{SCOPE_LABEL[scope]}</div>
            <h1 className="text-2xl font-black leading-tight">{headerTitle}</h1>
            {breadcrumb && <div className="text-[11px] text-white/40">{breadcrumb}</div>}
          </div>

          {/* Goal */}
          {ctx?.goal && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-emerald-300/80 text-[11px] font-bold mb-1">
                <Target className="w-3.5 h-3.5" /> الهدف من هذا الاختبار
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{ctx.goal}</p>
            </div>
          )}

          {/* Key concepts (unit only) */}
          {scope === "unit" && ctx?.keyConcepts && ctx.keyConcepts.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-amber-300/80 text-[11px] font-bold mb-2">
                <BookOpen className="w-3.5 h-3.5" /> ماذا يغطّي
              </div>
              <div className="flex flex-wrap gap-2">
                {ctx.keyConcepts.map((c, i) => (
                  <span key={i} dir="auto" className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-100/90">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={<ListChecks className="w-4 h-4" />} label="عدد الأسئلة" value={`${stats.questionCount}`} />
            <StatTile icon={<Award className="w-4 h-4" />} label="مجموع النقاط" value={`${stats.totalPoints}`} />
            {stats.suggestedTotalSeconds != null && (
              <StatTile icon={<Clock className="w-4 h-4" />} label="الوقت المقترح" value={formatDuration(stats.suggestedTotalSeconds)} />
            )}
            <StatTile icon={<Target className="w-4 h-4" />} label="حد النجاح" value={`${data.passThreshold}%`} />
          </div>

          {/* Question-type breakdown */}
          {kindChips.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.keys(kinds).filter(k => kinds[k] > 0).map(k => (
                <span key={k} className={`text-[11px] px-2.5 py-1 rounded-full border ${kindBadgeClass(k)}`}>
                  {kinds[k]} {kindLabel(k)}
                </span>
              ))}
            </div>
          )}

          {/* Optional admin instructions */}
          {ctx?.instructions && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/60 leading-relaxed">
              {ctx.instructions}
            </div>
          )}

          {/* Cost / gem gate */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Gem className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[11px] text-white/55">{data.cost.willCharge ? "تكلفة هذه المحاولة" : "هذه المحاولة"}</div>
                <div className="font-black text-amber-300">
                  {data.cost.willCharge ? `${data.cost.costGems} جوهرة` : "مجاناً"}
                </div>
              </div>
            </div>
            {data.cost.balance != null && (
              <div className="text-left">
                <div className="text-[11px] text-white/40">رصيدك</div>
                <div className="text-sm font-bold text-white/80">{data.cost.balance} جوهرة</div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-white/40 leading-relaxed text-center px-2">
            عند الرسوب، الإعادة بمجموعة بديلة <span className="text-emerald-300">بدون خصم</span>. لا يوجد مؤقّت إجباري — خذ وقتك.
          </div>

          {/* Start CTA / insufficient gate */}
          {data.cost.willCharge && !data.cost.canAfford ? (
            <div className="space-y-3">
              <div className="text-rose-300 text-sm text-center">رصيدك غير كافٍ لبدء هذا الاختبار.</div>
              <button onClick={() => navigate("/subscription")} className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold">
                شحن الجواهر
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setStep(0); setReviewing(false); setConfirmed(true); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black shadow-lg shadow-amber-500/20"
            >
              ابدأ الاختبار
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-[100dvh] bg-background text-white pb-24" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
        <TopBar onBack={backToMap} eyebrow={`${SCOPE_LABEL[scope]} · ${data.exam.examCode}`} title={headerTitle} />
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <ResultPanel
            result={result}
            questions={data.exam.questions}
            scope={scope}
            costGems={data.cost.costGems}
            onRetryFreeAltBank={() => loadExam("free_alt_bank")}
            onRetryPaidSameBank={() => loadExam("paid_same_bank")}
            onBackToMap={backToMap}
          />
        </div>
      </div>
    );
  }

  // ── In-exam: review screen ──────────────────────────────────────────────────
  const total = data.exam.questions.length;
  const answeredCount = answers.filter(isAnswered).length;

  // Defensive: a variant should never resolve to zero questions, but guard so
  // the stepper never dereferences an undefined question.
  if (total === 0) {
    return (
      <div className="min-h-[100dvh] bg-background text-white" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
        <TopBar onBack={backToMap} eyebrow={`${SCOPE_LABEL[scope]} · ${data.exam.examCode}`} title={headerTitle} />
        <div className="max-w-md mx-auto px-4 pt-24 text-center space-y-4">
          <div className="text-5xl">📭</div>
          <p className="text-white/60">لا توجد أسئلة متاحة لهذا الاختبار حالياً.</p>
          <button onClick={backToMap} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm">رجوع للخريطة</button>
        </div>
      </div>
    );
  }

  if (reviewing) {
    const missing: number[] = [];
    data.exam.questions.forEach((_, i) => { if (!isAnswered(answers[i])) missing.push(i); });
    return (
      <div className="min-h-[100dvh] bg-background text-white pb-28" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
        <TopBar onBack={() => setReviewing(false)} eyebrow={`${SCOPE_LABEL[scope]} · مراجعة`} title={headerTitle} />
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-black">مراجعة قبل التسليم</h2>
            <p className="text-sm text-white/50 mt-1">أجبت على {answeredCount} من {total} سؤال</p>
          </div>

          <div className="space-y-2.5">
            {data.exam.questions.map((q, i) => {
              const done = isAnswered(answers[i]);
              return (
                <button
                  key={q.id}
                  onClick={() => { setStep(i); setReviewing(false); }}
                  className={`w-full text-right rounded-2xl border p-3.5 flex items-center gap-3 transition ${
                    done ? "border-emerald-400/25 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-rose-400/25 bg-rose-500/5 hover:bg-rose-500/10"
                  }`}
                >
                  <div className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-black ${done ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>
                    {q.questionIndex}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${kindBadgeClass(q.kind)}`}>{kindLabel(q.kind)}</span>
                      <span className="text-[10px] text-white/35">{done ? "تمت الإجابة" : "بدون إجابة"}</span>
                    </div>
                    <div className="text-xs text-white/60 truncate">{previewText(q.prompt)}</div>
                  </div>
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {missing.length > 0 && (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/5 p-3 text-xs text-rose-200/80 text-center">
              لديك {missing.length} سؤال بدون إجابة. أكملها قبل التسليم.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setReviewing(false)}
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-bold"
            >
              رجوع للأسئلة
            </button>
            <button
              onClick={submit}
              disabled={submitting || missing.length > 0}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black disabled:opacity-40"
            >
              {submitting ? "جاري التقييم..." : "تسليم الاختبار"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── In-exam: one-question stepper ───────────────────────────────────────────
  const safeStep = Math.min(Math.max(0, step), total - 1);
  const q = data.exam.questions[safeStep];
  const points = Math.max(1, Number(q.points ?? 1) || 1);
  const isLast = safeStep === total - 1;
  const progressPct = total > 0 ? Math.round(((safeStep + 1) / total) * 100) : 0;

  // Informational timer for the current question.
  let timeNode: ReactNode = null;
  if (q.timeLimitSeconds != null && q.timeLimitSeconds > 0) {
    const elapsed = Math.floor((nowTick - qStartRef.current) / 1000);
    const remaining = (q.timeLimitSeconds as number) - elapsed;
    timeNode = remaining >= 0 ? (
      <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
        <Clock className="w-3.5 h-3.5" /> {mmss(remaining)}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[11px] text-white/35">
        <Clock className="w-3.5 h-3.5" /> الوقت المقترح انتهى — خذ راحتك
      </span>
    );
  }

  const practicalCodeMode = codeModeMap[safeStep] ?? /```/.test(q.prompt);

  return (
    <div className="min-h-[100dvh] bg-background text-white pb-28" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      <TopBar
        onBack={backToMap}
        eyebrow={`${SCOPE_LABEL[scope]} · المجموعة ${data.exam.variantIndex}/${data.exam.totalVariantsAvailable}`}
        title={headerTitle}
        right={data.exam.priorAttempts > 0 ? (
          <div className="text-[10px] bg-white/10 rounded-full px-2 py-1 text-white/70 shrink-0">محاولة #{data.exam.priorAttempts + 1}</div>
        ) : undefined}
      />

      {/* Progress bar + answered dots */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between text-[11px] text-white/45 mb-1.5">
          <span>السؤال {safeStep + 1} من {total}</span>
          <span>{answeredCount}/{total} مُجاب</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-amber-500 to-amber-400 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.exam.questions.map((qq, i) => {
            const done = isAnswered(answers[i]);
            const current = i === safeStep;
            const base = "w-7 h-7 rounded-lg grid place-items-center text-[11px] font-bold transition";
            const cls = current
              ? "bg-amber-400 text-black ring-2 ring-amber-300/50"
              : done
                ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/30"
                : "bg-white/5 text-white/40 border border-white/10 hover:border-white/25";
            return (
              <button key={qq.id} onClick={() => setStep(i)} className={`${base} ${cls}`} aria-label={`السؤال ${qq.questionIndex}`}>
                {qq.questionIndex}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-md border ${kindBadgeClass(q.kind)}`}>{kindLabel(q.kind)}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md border bg-white/5 border-white/10 text-white/60">{points} نقطة</span>
            <span className="ms-auto">{timeNode}</span>
          </div>

          <RichText text={q.prompt} className="text-white/95 text-[15px] mb-4 space-y-1" />

          {/* Inputs by kind */}
          {q.kind === "mcq" && q.choices && q.choices.length > 0 ? (
            <div className="space-y-2">
              {q.choices.map((c, j) => {
                const selected = answers[safeStep] === j;
                return (
                  <label
                    key={j}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      selected ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-black/20 hover:border-white/25"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={selected}
                      onChange={() => { const next = [...answers]; next[safeStep] = j; setAnswers(next); }}
                      className="accent-amber-400 mt-1 shrink-0"
                    />
                    <div className="text-sm text-white/90 flex-1"><RichText text={c} /></div>
                  </label>
                );
              })}
            </div>
          ) : q.kind === "practical" ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/45">إجابتك</span>
                <button
                  onClick={() => setCodeModeMap(m => ({ ...m, [safeStep]: !practicalCodeMode }))}
                  className="text-[11px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/90"
                >
                  {practicalCodeMode ? "تبديل إلى نص" : "تبديل إلى كود"}
                </button>
              </div>
              <textarea
                value={(answers[safeStep] as string) ?? ""}
                onChange={(e) => { const next = [...answers]; next[safeStep] = e.target.value; setAnswers(next); }}
                rows={practicalCodeMode ? 9 : 5}
                dir={practicalCodeMode ? "ltr" : "rtl"}
                spellCheck={!practicalCodeMode}
                placeholder={practicalCodeMode ? "// اكتب الكود هنا" : "اكتب إجابتك هنا..."}
                className={`w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 ${
                  practicalCodeMode ? "font-mono text-left leading-relaxed" : "text-right leading-relaxed"
                }`}
              />
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-white/45 mb-2">إجابتك</div>
              <textarea
                value={(answers[safeStep] as string) ?? ""}
                onChange={(e) => { const next = [...answers]; next[safeStep] = e.target.value; setAnswers(next); }}
                rows={4}
                placeholder="اكتب إجابتك هنا..."
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400/50 text-right leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={safeStep === 0}
            className="flex items-center gap-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 disabled:opacity-30 font-bold text-sm"
          >
            <ChevronRight className="w-4 h-4" /> السابق
          </button>
          {isLast ? (
            <button
              onClick={() => setReviewing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black"
            >
              <ListTodo className="w-4 h-4" /> مراجعة وتسليم
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(total - 1, s + 1))}
              className="flex-1 flex items-center justify-center gap-1 py-3 rounded-2xl bg-white/10 text-white font-bold"
            >
              التالي <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small stat tile ───────────────────────────────────────────────────────────
function StatTile(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 grid place-items-center text-amber-300">
        {props.icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-white/45">{props.label}</div>
        <div className="font-black text-white/90 truncate">{props.value}</div>
      </div>
    </div>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────
function ResultPanel(props: {
  result: SubmitResult;
  questions: ExamQuestion[];
  scope: "unit" | "stage" | "level";
  costGems: number;
  onRetryFreeAltBank: () => void;
  onRetryPaidSameBank: () => void;
  onBackToMap: () => void;
}) {
  const r = props.result;
  const byId = new Map(props.questions.map(q => [q.id, q]));

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center ${r.passed ? "bg-emerald-500/10 border-emerald-400/30" : "bg-rose-500/10 border-rose-400/30"}`}>
        <div className="text-5xl mb-2">{r.passed ? "🏆" : "🔄"}</div>
        <div className={`text-3xl font-black ${r.passed ? "text-emerald-300" : "text-rose-300"}`}>{r.score}/100</div>
        <div className="text-sm text-white/70 mt-1">
          {r.passed ? `اجتزت! (الحد ${r.passThreshold}%)` : `لم تنجح — تحتاج ${r.passThreshold}% على الأقل`}
        </div>
        <div className="text-[11px] text-white/40 mt-2">
          المجموعة {r.variantIndex} · المحاولة {r.attemptNumber}{r.gemsDeducted > 0 ? ` · ${r.gemsDeducted} جوهرة` : " · بلا خصم"}
        </div>
        {r.unlocked && r.unlocked.newlyUnlocked.length > 0 && (
          <div className="mt-3 inline-block bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-1.5 text-xs text-emerald-200">
            ✨ فُتح {r.unlocked.newlyUnlocked.length} درس جديد
          </div>
        )}
      </div>

      {r.evaluatorLog.map((row) => {
        const q = byId.get(row.questionId);
        // For MCQ the studentAnswer is the chosen index — map it to the option text.
        let answerNode: ReactNode;
        if (q && q.kind === "mcq" && q.choices && q.choices.length > 0) {
          const idx = parseInt(String(row.studentAnswer), 10);
          answerNode = Number.isFinite(idx) && q.choices[idx] != null
            ? <RichText text={q.choices[idx]} />
            : <span className="text-white/40">— بدون إجابة —</span>;
        } else {
          answerNode = row.studentAnswer.trim()
            ? <RichText text={row.studentAnswer} />
            : <span className="text-white/40">— بدون إجابة —</span>;
        }
        const tone = row.verdict === "correct"
          ? "border-emerald-400/25"
          : row.verdict === "partial" ? "border-amber-400/25" : "border-rose-400/25";
        return (
          <div key={row.questionId} className={`rounded-2xl border ${tone} bg-white/5 p-4`}>
            <div className="flex items-center gap-2 mb-2.5">
              {row.verdict === "correct" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
               row.verdict === "partial" ? <AlertCircle className="w-4 h-4 text-amber-400" /> :
               <XCircle className="w-4 h-4 text-rose-400" />}
              <span className="text-[11px] text-white/40">السؤال {row.questionIndex}</span>
              {q && <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${kindBadgeClass(q.kind)}`}>{kindLabel(q.kind)}</span>}
              <span className="text-[11px] text-white/60 ms-auto">{row.score}/100</span>
            </div>
            <RichText text={row.prompt} className="text-sm text-white/80 mb-2.5" />
            <div className="text-xs text-white/60 mb-2 bg-black/25 rounded-xl px-3 py-2">
              <div className="text-white/30 mb-1">إجابتك:</div>
              {answerNode}
            </div>
            {row.explanation && (
              <RichText text={row.explanation} className="text-xs text-white/70 leading-relaxed" />
            )}
          </div>
        );
      })}

      {/* Two-option failure UX: free alt-bank OR paid same-bank (logic unchanged) */}
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
                <div className="text-amber-200 text-sm font-black">{props.costGems > 0 ? `${props.costGems} جوهرة · نفس البنك` : "نفس البنك · بخصم جواهر"}</div>
              </div>
              <div className="text-[11px] text-white/60 leading-relaxed">{props.costGems > 0 ? "نفس الأسئلة لتمرّن على ضعفك، مع خصم جواهر إضافي." : "نفس الأسئلة لتمرّن على ضعفك — يظهر السعر قبل البدء."}</div>
            </button>
          </div>
          <button onClick={props.onBackToMap} className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold">
            العودة للخريطة
          </button>
        </div>
      ) : (
        <button onClick={props.onBackToMap} className="w-full py-3 rounded-2xl bg-gradient-to-l from-amber-500 to-amber-400 text-black font-black">
          العودة للخريطة <ArrowRight className="w-4 h-4 inline" />
        </button>
      )}
    </div>
  );
}
