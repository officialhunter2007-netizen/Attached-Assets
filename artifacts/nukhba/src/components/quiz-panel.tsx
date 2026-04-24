import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, CheckCircle2, XCircle, Trophy, AlertTriangle, BookOpen,
  RefreshCw, Sparkles, ArrowLeft, ArrowRight, Target, Library, Layers,
} from "lucide-react";

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

interface ScopeChapter {
  index: number;
  title: string;
  startPage: number;
  endPage: number;
}

interface ScopeData {
  materialId: number;
  fileName: string;
  pageCount: number | null;
  currentChapterIndex: number | null;
  chapters: ScopeChapter[];
}

type ScopeMode = "chapter" | "custom" | "full";

type Phase = "idle" | "scope" | "loading" | "answering" | "submitting" | "results" | "error";

interface ResolvedScope {
  source: "chapter" | "explicit" | "full";
  pageStart: number;
  pageEnd: number;
  chapterTitle: string | null;
  chapterIndex: number | null;
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Scope-picker state (chapter quiz only).
  const [scope, setScope] = useState<ScopeData | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>("chapter");
  const [pickedChapterIdx, setPickedChapterIdx] = useState<number | null>(null);
  // Stored as raw strings so the student can type freely (clear the field,
  // type a new number, etc.) without us forcing a value of 1 into empty inputs.
  // Validation/clamping happens at submit time.
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  // Pages actually used for the current run, echoed by the server.
  const [activeScope, setActiveScope] = useState<ResolvedScope | null>(null);

  const lastInitKey = useRef<string | null>(null);

  const reset = () => {
    setError(null);
    setAttemptId(null);
    setChapterTitle(null);
    setQuestions([]);
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    setActiveScope(null);
  };

  // Open: for "exam" jump straight to loading; for "chapter" fetch scope info first.
  useEffect(() => {
    if (!open || !materialId) return;
    const key = `${materialId}::${kind}`;
    if (lastInitKey.current === key && phase !== "idle") return;
    lastInitKey.current = key;
    reset();
    if (kind === "exam") {
      startGeneration({ kind: "exam", materialId });
      return;
    }
    // chapter → fetch scope, then show picker
    setPhase("loading");
    fetch(`/api/materials/${materialId}/quiz-scope`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: ScopeData) => {
        setScope(data);
        const idx = data.currentChapterIndex ?? (data.chapters[0]?.index ?? null);
        setPickedChapterIdx(idx);
        // Leave the custom-range inputs empty — the student types their own
        // numbers. (Earlier we pre-filled them from the current chapter, but
        // that produced a "1" placeholder users couldn't easily clear.)
        setCustomStart("");
        setCustomEnd("");
        // If there are no chapters, default to "full file" mode.
        setScopeMode(data.chapters.length === 0 ? "full" : "chapter");
        setPhase("scope");
      })
      .catch((e: any) => {
        // Soft-fail: skip the picker and generate with defaults.
        console.warn("[QuizPanel] scope fetch failed:", e?.message || e);
        startGeneration({ kind: "chapter", materialId });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materialId, kind]);

  // When closed, reset so re-open generates fresh quiz next time.
  useEffect(() => {
    if (!open) {
      lastInitKey.current = null;
      setPhase("idle");
      setScope(null);
    }
  }, [open]);

  const startGeneration = async (opts: {
    kind: QuizKind;
    materialId: number;
    body?: { chapterIndex?: number | null; pageStart?: number; pageEnd?: number };
  }) => {
    reset();
    setPhase("loading");
    const url = opts.kind === "exam"
      ? `/api/materials/${opts.materialId}/exam`
      : `/api/materials/${opts.materialId}/quiz`;
    try {
      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts.body ?? {}),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setAttemptId(Number(data.attemptId));
      setChapterTitle(data.chapterTitle ?? null);
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setActiveScope({
        source: data.scopeSource ?? (opts.kind === "exam" ? "full" : "chapter"),
        pageStart: Number(data.pageStart) || 0,
        pageEnd: Number(data.pageEnd) || 0,
        chapterTitle: data.chapterTitle ?? null,
        chapterIndex: data.chapterIndex ?? null,
      });
      setPhase("answering");
      setCurrentIdx(0);
    } catch (e: any) {
      setError(humanizeError(e?.message));
      setPhase("error");
    }
  };

  const onConfirmScope = () => {
    if (!materialId || !scope) return;
    const total = Math.max(1, scope.pageCount ?? 1);
    let body: { chapterIndex?: number | null; pageStart?: number; pageEnd?: number } = {};
    if (scopeMode === "chapter" && pickedChapterIdx != null) {
      body = { chapterIndex: pickedChapterIdx };
    } else if (scopeMode === "custom") {
      // Inputs are free-form strings — parse once here and clamp into the
      // valid file range. If either field is empty/non-numeric we abort
      // (canStart already prevents this from being reached).
      const sNum = Math.round(Number(customStart));
      const eNum = Math.round(Number(customEnd));
      if (!Number.isFinite(sNum) || !Number.isFinite(eNum)) return;
      const s = Math.max(1, Math.min(total, sNum));
      const e = Math.max(s, Math.min(total, eNum));
      body = { pageStart: s, pageEnd: e };
    } else {
      body = { pageStart: 1, pageEnd: total };
    }
    startGeneration({ kind: "chapter", materialId, body });
  };

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

  // "اختبار جديد" — go back to scope picker for chapter quizzes, or rerun for exam.
  const retry = () => {
    if (!materialId) return;
    if (kind === "exam") {
      startGeneration({ kind: "exam", materialId });
    } else if (scope) {
      reset();
      setPhase("scope");
    } else {
      // No cached scope (came from error path) → re-init.
      lastInitKey.current = null;
      setPhase("idle");
      setTimeout(() => { lastInitKey.current = ""; setPhase("idle"); }, 30);
    }
  };

  // How many pages without a confirmed reference (model returned null).
  // Must be computed before any conditional return to obey the rules of hooks.
  const unknownPageCount = useMemo(
    () => questions.filter((q) => !q.page).length,
    [questions],
  );

  // First question whose answer is empty — used to jump there when the user
  // tries to submit before answering everything. -1 if all answered.
  const firstUnansweredIdx = useMemo(
    () => questions.findIndex((q) => !(answers[q.id] ?? "").trim()),
    [questions, answers],
  );

  // Track which questions the user has visited so we can mark visited-but-
  // unanswered ones with a red border (helps the student spot what's missing).
  const [visited, setVisited] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (phase !== "answering") return;
    setVisited((s) => {
      if (s.has(currentIdx)) return s;
      const next = new Set(s);
      next.add(currentIdx);
      return next;
    });
  }, [currentIdx, phase]);
  // Reset visited when a fresh quiz loads.
  useEffect(() => {
    if (phase === "loading" || phase === "scope") setVisited(new Set());
  }, [phase]);

  // Submit button handler: if everything is answered, submit; otherwise
  // navigate to the first missing question instead of being silently disabled.
  const submitOrJump = () => {
    if (allAnswered) {
      submit();
    } else if (firstUnansweredIdx >= 0) {
      setCurrentIdx(firstUnansweredIdx);
    }
  };

  if (!open) return null;

  // Compute the displayed title + subtitle based on phase + active scope.
  const header = computeHeader(kind, phase, scope, activeScope);

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
                {header.icon}
              </div>
              <div className="min-w-0">
                <div className="text-base font-black text-white truncate">
                  {header.title}
                </div>
                <div className="text-[11px] text-white/55 truncate">
                  {header.subtitle}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {header.rangeBadge && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">
                  <Layers className="w-3 h-3" /> {header.rangeBadge}
                </span>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {phase === "scope" && scope && (
              <ScopePicker
                scope={scope}
                mode={scopeMode}
                setMode={setScopeMode}
                pickedChapterIdx={pickedChapterIdx}
                setPickedChapterIdx={setPickedChapterIdx}
                customStart={customStart}
                customEnd={customEnd}
                setCustomStart={setCustomStart}
                setCustomEnd={setCustomEnd}
                onStart={onConfirmScope}
              />
            )}

            {phase === "loading" && (
              <LoadingState kind={kind} activeScope={activeScope} pendingScope={pendingScopeLabel(scope, scopeMode, pickedChapterIdx, customStart, customEnd, kind)} />
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
                visited={visited}
                setAnswer={(qid, val) => setAnswers((a) => ({ ...a, [qid]: val }))}
                goPrev={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                goNext={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                jumpTo={(i) => setCurrentIdx(i)}
                unknownPageCount={unknownPageCount}
                allAnswered={allAnswered}
                firstUnansweredIdx={firstUnansweredIdx}
                onSubmit={submitOrJump}
              />
            )}

            {phase === "submitting" && (
              <div className="p-12 flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <div className="text-white/80 text-sm">جارٍ تصحيح إجاباتك وتحليل نقاط الضعف...</div>
              </div>
            )}

            {phase === "results" && result && (
              <ResultsState result={result} activeScope={activeScope} onClose={onClose} onRetry={retry} />
            )}
          </div>

          {/* Footer */}
          {phase === "answering" && (
            <div className="shrink-0 border-t border-white/10 px-5 py-3 flex items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[11px] text-white/50">
                أُجبت على <span className="text-gold font-bold">{answeredCount}</span> / {questions.length}
              </div>
              <button
                onClick={submitOrJump}
                className={`text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all ${
                  allAnswered
                    ? "bg-gradient-to-l from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20"
                    : "bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20"
                }`}
                title={allAnswered ? "تسليم الاختبار للتصحيح" : "اذهب للسؤال غير المُجاب"}
              >
                <Sparkles className="w-4 h-4" />
                {allAnswered
                  ? "تسليم وتصحيح ✓"
                  : firstUnansweredIdx >= 0
                    ? `↩ اذهب للسؤال ${firstUnansweredIdx + 1}`
                    : `أجب على ${questions.length - answeredCount} سؤالاً متبقياً`}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── header helpers ───────────────────────────────────────────────────────────

function computeHeader(
  kind: QuizKind,
  phase: Phase,
  scope: ScopeData | null,
  active: ResolvedScope | null,
): { icon: React.ReactNode; title: string; subtitle: string; rangeBadge: string | null } {
  if (kind === "exam") {
    return {
      icon: <Trophy className="w-5 h-5 text-gold" />,
      title: "الامتحان النهائي الشامل 🏆",
      subtitle: "30 سؤالاً يغطّي كامل الملف بكل فصوله",
      rangeBadge: active && active.pageEnd >= active.pageStart && active.pageStart > 0
        ? `صفحات 1–${active.pageEnd}` : null,
    };
  }
  // chapter / scoped quiz
  if (phase === "scope") {
    return {
      icon: <Target className="w-5 h-5 text-gold" />,
      title: "تجهيز اختبارك ✨",
      subtitle: scope?.fileName ? `الملف: ${scope.fileName}` : "اختر النطاق الذي تريد اختباره",
      rangeBadge: null,
    };
  }
  if (active) {
    if (active.source === "chapter" && active.chapterTitle) {
      return {
        icon: <BookOpen className="w-5 h-5 text-gold" />,
        title: `📘 اختبار: ${active.chapterTitle}`,
        subtitle: `صفحات ${active.pageStart}–${active.pageEnd}`,
        rangeBadge: `صفحات ${active.pageStart}–${active.pageEnd}`,
      };
    }
    if (active.source === "explicit") {
      return {
        icon: <Target className="w-5 h-5 text-gold" />,
        title: "🎯 اختبار مخصّص",
        subtitle: `صفحات ${active.pageStart}–${active.pageEnd}`,
        rangeBadge: `صفحات ${active.pageStart}–${active.pageEnd}`,
      };
    }
    return {
      icon: <Library className="w-5 h-5 text-gold" />,
      title: "📚 اختبار شامل من الملف",
      subtitle: `صفحات 1–${active.pageEnd}`,
      rangeBadge: `كل الملف`,
    };
  }
  return {
    icon: <BookOpen className="w-5 h-5 text-gold" />,
    title: "اختبارك المخصّص",
    subtitle: "نُحضّر الأسئلة...",
    rangeBadge: null,
  };
}

function pendingScopeLabel(
  scope: ScopeData | null,
  mode: ScopeMode,
  pickedIdx: number | null,
  customStart: string,
  customEnd: string,
  kind: QuizKind,
): string | null {
  if (kind === "exam") return null;
  if (!scope) return null;
  if (mode === "chapter" && pickedIdx != null) {
    const ch = scope.chapters.find((c) => c.index === pickedIdx);
    if (ch) return `${ch.title} (صفحات ${ch.startPage}–${ch.endPage})`;
  }
  if (mode === "custom" && customStart && customEnd) return `صفحات ${customStart}–${customEnd}`;
  if (mode === "full" && scope.pageCount) return `كل الملف (صفحات 1–${scope.pageCount})`;
  return null;
}

// ── Scope picker ─────────────────────────────────────────────────────────────

function ScopePicker({
  scope, mode, setMode,
  pickedChapterIdx, setPickedChapterIdx,
  customStart, customEnd, setCustomStart, setCustomEnd,
  onStart,
}: {
  scope: ScopeData;
  mode: ScopeMode;
  setMode: (m: ScopeMode) => void;
  pickedChapterIdx: number | null;
  setPickedChapterIdx: (i: number | null) => void;
  customStart: string;
  customEnd: string;
  setCustomStart: (val: string) => void;
  setCustomEnd: (val: string) => void;
  onStart: () => void;
}) {
  const total = Math.max(1, scope.pageCount ?? 1);
  const hasChapters = scope.chapters.length > 0;
  const pickedChapter = pickedChapterIdx != null
    ? scope.chapters.find((c) => c.index === pickedChapterIdx) ?? null
    : null;
  // Custom-range start gate: both fields must be filled with numbers that
  // form a valid range inside the file. Empty fields keep the button disabled
  // without forcing any default value into the inputs.
  const customStartNum = Number(customStart);
  const customEndNum = Number(customEnd);
  const customRangeValid =
    customStart.trim() !== "" &&
    customEnd.trim() !== "" &&
    Number.isFinite(customStartNum) &&
    Number.isFinite(customEndNum) &&
    customStartNum >= 1 &&
    customEndNum >= customStartNum &&
    customEndNum <= total;
  const canStart =
    (mode === "chapter" && pickedChapter != null) ||
    (mode === "custom" && customRangeValid) ||
    mode === "full";

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <div className="text-white font-black text-base mb-1">اختر نطاق اختبارك</div>
        <div className="text-[12px] text-white/55 leading-relaxed">
          سيُولِّد المعلّم أسئلة من الصفحات التي تختارها فقط، مع ذكر رقم الصفحة المرجعية لكل سؤال بدقّة.
        </div>
      </div>

      {/* preset cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ScopeCard
          icon={<BookOpen className="w-4 h-4" />}
          label="الفصل الحالي"
          hint={hasChapters ? "النطاق الموصى به" : "غير متاح"}
          active={mode === "chapter"}
          disabled={!hasChapters}
          onClick={() => setMode("chapter")}
        />
        <ScopeCard
          icon={<Target className="w-4 h-4" />}
          label="نطاق مخصّص"
          hint="اختر صفحات محدّدة"
          active={mode === "custom"}
          onClick={() => setMode("custom")}
        />
        <ScopeCard
          icon={<Library className="w-4 h-4" />}
          label="كل الملف"
          hint={`صفحات 1–${total}`}
          active={mode === "full"}
          onClick={() => setMode("full")}
        />
      </div>

      {/* Chapter dropdown */}
      {mode === "chapter" && hasChapters && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-white/65">اختر الفصل</label>
          <select
            value={pickedChapterIdx ?? ""}
            onChange={(e) => setPickedChapterIdx(Number(e.target.value))}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-[14px] focus:border-amber-500/50 outline-none"
            style={{ direction: "rtl" }}
          >
            {scope.chapters.map((c) => (
              <option key={c.index} value={c.index} className="bg-[#0d111e]">
                {c.title} — صفحات {c.startPage}–{c.endPage}
              </option>
            ))}
          </select>
          {pickedChapter && (
            <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              ستُولَّد الأسئلة من <b>{pickedChapter.title}</b> فقط — صفحات {pickedChapter.startPage} إلى {pickedChapter.endPage}.
            </div>
          )}
        </div>
      )}

      {/* Custom range */}
      {mode === "custom" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="من صفحة" value={customStart} min={1} max={total} placeholder="مثلاً 1" onChange={setCustomStart} />
            <NumField label="إلى صفحة" value={customEnd} min={1} max={total} placeholder={`مثلاً ${total}`} onChange={setCustomEnd} />
          </div>
          <div className="text-[11px] text-white/55">
            عدد الصفحات في الملف: <span className="text-white/85 font-bold">{total}</span>
          </div>
        </div>
      )}

      {mode === "full" && (
        <div className="text-[12px] text-white/65 bg-white/[0.03] border border-white/10 rounded-xl p-3">
          ستُولَّد أسئلة من كامل محتوى الملف — يناسب المراجعة الشاملة قبل الاختبار النهائي.
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!canStart}
        className="w-full text-sm font-black px-5 py-3 rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        ابدأ الاختبار
      </button>
    </div>
  );
}

function ScopeCard({
  icon, label, hint, active, disabled, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-right p-3 rounded-2xl border transition-all ${
        active
          ? "bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30"
          : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <div className={`flex items-center gap-2 mb-1 ${active ? "text-amber-300" : "text-white/85"}`}>
        {icon}
        <span className="text-[13px] font-bold">{label}</span>
      </div>
      <div className="text-[10.5px] text-white/55">{hint}</div>
    </button>
  );
}

function NumField({
  label, value, min, max, placeholder, onChange,
}: {
  label: string;
  // Free-form string so the field can be cleared completely while typing.
  // The parent is responsible for parsing/validating before submission.
  value: string;
  min: number;
  max: number;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-white/65 mb-1.5">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          // Forward the raw string. Allow empty so the student can erase
          // and retype any number without us snapping back to a default.
          // Strip any non-digit characters defensively.
          const raw = e.target.value.replace(/[^\d]/g, "");
          onChange(raw);
        }}
        className="w-full p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-[14px] font-bold text-center focus:border-amber-500/50 outline-none placeholder:text-white/25 placeholder:font-normal"
      />
    </div>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

// ── Code-aware prompt renderer ────────────────────────────────────────────────

const CPP_KEYWORDS = new Set([
  "int","long","short","char","float","double","bool","void","unsigned","signed",
  "auto","const","static","extern","volatile","register","mutable","inline",
  "if","else","for","while","do","switch","case","break","continue","return","goto",
  "class","struct","union","enum","public","private","protected","virtual","override",
  "new","delete","this","nullptr","true","false","sizeof","typedef","using","namespace",
  "template","typename","throw","try","catch","include","define","pragma","ifdef","ifndef",
  "endif","cout","cin","endl","string","vector","map","set","pair","make_pair","push_back",
]);

type Token = { kind: "kw"|"str"|"num"|"cmt"|"pre"|"op"|"id"|"ws"; text: string };

function tokenizeCpp(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    // Line comment
    if (line[i] === "/" && line[i+1] === "/") {
      tokens.push({ kind: "cmt", text: line.slice(i) });
      break;
    }
    // Preprocessor at start of non-whitespace
    if (line[i] === "#") {
      tokens.push({ kind: "pre", text: line.slice(i) });
      break;
    }
    // String literal
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ kind: "str", text: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(line[i]) || (line[i] === "." && /[0-9]/.test(line[i+1] ?? ""))) {
      let j = i;
      while (j < line.length && /[0-9a-fA-FxX._uUlL]/.test(line[j])) j++;
      tokens.push({ kind: "num", text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier or keyword
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      tokens.push({ kind: CPP_KEYWORDS.has(word) ? "kw" : "id", text: word });
      i = j;
      continue;
    }
    // Multi-char operators
    const ops2 = ["<<",">>","->","::","==","!=","<=",">=","&&","||","++","--","+=","-=","*=","/="];
    const op2 = ops2.find((op) => line.startsWith(op, i));
    if (op2) {
      tokens.push({ kind: "op", text: op2 });
      i += op2.length;
      continue;
    }
    // Single-char operator/punctuation
    if (/[+\-*/=<>&|!^%~?:;,.()\[\]{}]/.test(line[i])) {
      tokens.push({ kind: "op", text: line[i] });
      i++;
      continue;
    }
    // Whitespace
    if (/\s/.test(line[i])) {
      let j = i;
      while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ kind: "ws", text: line.slice(i, j) });
      i = j;
      continue;
    }
    // Fallthrough: unknown char
    tokens.push({ kind: "id", text: line[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLOR: Record<Token["kind"], string> = {
  kw: "text-sky-300 font-semibold",
  str: "text-emerald-300",
  num: "text-amber-300",
  cmt: "text-white/40 italic",
  pre: "text-rose-300",
  op: "text-blue-300",
  id: "text-white",
  ws: "",
};

function isCodeLine(line: string): boolean {
  if (!line.trim()) return false;
  // Has Arabic characters → treat as text
  if (/[\u0600-\u06FF]/.test(line)) return false;
  // Starts with known code patterns
  if (/^\s*(#|\/\/|\/\*|int |double |float |char |bool |void |cout|cin|return|if\s*\(|for\s*\(|while\s*\(|class |struct |namespace |using |template|[a-zA-Z_]\w*\s*[=({\[;])/.test(line)) return true;
  // Contains code-ish operators with no Arabic
  if (/[{};]|<<|>>|->|::/.test(line)) return true;
  // Majority of printable chars are ASCII (>70%)
  const printable = line.replace(/\s/g, "");
  if (!printable) return false;
  const ascii = printable.split("").filter((c) => c.charCodeAt(0) < 128).length;
  return ascii / printable.length > 0.7;
}

function HighlightedCode({ line }: { line: string }) {
  const tokens = tokenizeCpp(line || " ");
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i} className={TOKEN_COLOR[tok.kind]}>{tok.text}</span>
      ))}
    </>
  );
}

// Renders the question prompt with automatic code-block detection.
// Pure-code lines are grouped into a LTR monospace block with syntax
// highlighting; Arabic prose lines stay RTL with the regular font.
function PromptWithCode({ text }: { text: string }) {
  type Segment = { type: "text"; lines: string[] } | { type: "code"; lines: string[] };
  const segments: Segment[] = [];
  for (const raw of text.split("\n")) {
    const isCode = isCodeLine(raw);
    const last = segments[segments.length - 1];
    if (last && last.type === (isCode ? "code" : "text")) {
      last.lines.push(raw);
    } else {
      segments.push({ type: isCode ? "code" : "text", lines: [raw] });
    }
  }

  return (
    <div className="space-y-2">
      {segments.map((seg, si) => {
        if (seg.type === "text") {
          return (
            <div key={si} dir="auto" className="text-white text-[15px] font-semibold leading-relaxed whitespace-pre-wrap">
              {seg.lines.join("\n")}
            </div>
          );
        }
        return (
          <pre
            key={si}
            dir="ltr"
            className="rounded-xl bg-[#0d111e] border border-white/10 px-4 py-3 text-[13px] leading-relaxed overflow-x-auto font-mono text-left"
            style={{ unicodeBidi: "isolate" }}
          >
            {seg.lines.map((line, li) => (
              <div key={li}><HighlightedCode line={line} /></div>
            ))}
          </pre>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function humanizeError(code?: string): string {
  switch (code) {
    case "MATERIAL_NOT_READY": return "لا يزال الملف قيد المعالجة. حاول بعد لحظات.";
    case "MATERIAL_HAS_NO_TEXT": return "تعذّر استخراج نص قابل للقراءة من هذا الملف.";
    case "QUIZ_GEN_UNAVAILABLE": return "خدمة توليد الأسئلة غير متاحة حالياً.";
    case "QUIZ_GEN_TOO_FEW":
    case "EXAM_GEN_TOO_FEW": return "تعذّر توليد عدد كافٍ من الأسئلة من هذا النطاق. جرّب نطاقاً أوسع.";
    case "QUIZ_GEN_FAILED":
    case "EXAM_GEN_FAILED": return "فشل توليد الأسئلة. يرجى المحاولة لاحقاً.";
    case "ALREADY_SUBMITTED": return "هذه المحاولة مُسلّمة بالفعل.";
    default: return code || "حدث خطأ غير متوقّع.";
  }
}

function LoadingState({
  kind, activeScope, pendingScope,
}: {
  kind: QuizKind;
  activeScope: ResolvedScope | null;
  pendingScope: string | null;
}) {
  const scopeText = pendingScope
    ?? (activeScope
      ? `صفحات ${activeScope.pageStart}–${activeScope.pageEnd}`
      : null);
  return (
    <div className="p-12 flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 animate-spin text-gold relative" />
      </div>
      <div className="text-white font-bold">
        {kind === "exam" ? "نُولّد امتحانك النهائي من الملف..." : "نُحضّر اختبارك..."}
      </div>
      {scopeText && (
        <div className="text-[12px] text-amber-200 font-semibold bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1">
          {scopeText}
        </div>
      )}
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
  questions, current, currentIdx, answers, visited, setAnswer, goPrev, goNext, jumpTo,
  unknownPageCount, allAnswered, firstUnansweredIdx, onSubmit,
}: {
  questions: QuizQuestion[];
  current: QuizQuestion;
  currentIdx: number;
  answers: Record<string, string>;
  visited: Set<number>;
  setAnswer: (qid: string, val: string) => void;
  goPrev: () => void;
  goNext: () => void;
  jumpTo: (i: number) => void;
  unknownPageCount: number;
  allAnswered: boolean;
  firstUnansweredIdx: number;
  onSubmit: () => void;
}) {
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);
  const isLast = currentIdx >= questions.length - 1;
  const currentAnswered = (answers[current.id] ?? "").trim().length > 0;
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
            const wasVisited = visited.has(i);
            // Visual hierarchy:
            //  • current  + answered     → gold + green dot (showing it's saved)
            //  • current  + empty        → gold + amber pulse (needs answer)
            //  • answered (not current)  → green
            //  • visited but empty       → red border (alerts the student)
            //  • not yet visited         → faint gray
            let cls: string;
            if (here && ans) {
              cls = "bg-gold text-black ring-2 ring-emerald-400/70";
            } else if (here) {
              cls = "bg-gold text-black ring-2 ring-amber-300/50 animate-pulse";
            } else if (ans) {
              cls = "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40";
            } else if (wasVisited) {
              cls = "bg-red-500/10 text-red-300 border border-red-500/50 hover:bg-red-500/20";
            } else {
              cls = "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10";
            }
            const ttl = ans
              ? `السؤال ${i + 1} — تمّت الإجابة`
              : wasVisited
                ? `السؤال ${i + 1} — لم تُجَب بعد`
                : `السؤال ${i + 1}`;
            return (
              <button
                key={q.id}
                onClick={() => jumpTo(i)}
                className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${cls}`}
                title={ttl}
                aria-label={ttl}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* The question */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            current.type === "mcq" ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          }`}>
            {current.type === "mcq" ? "اختيار من متعدد" : "إجابة قصيرة"}
          </span>
          {current.page ? (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
              📍 صفحة {current.page}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/35 border border-white/10" title="لم يُحدِّد المعلّم رقم الصفحة بدقّة لتجنّب التخمين">
              صفحة غير محدّدة
            </span>
          )}
        </div>
        {/* PromptWithCode auto-detects code lines and renders them as a
            LTR syntax-highlighted block while Arabic prose stays RTL. */}
        <div className="mb-4">
          <PromptWithCode text={current.prompt} />
        </div>
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
          // dir="auto": browser sets LTR for code/English lines, RTL for Arabic.
          <textarea
            dir="auto"
            value={answers[current.id] ?? ""}
            onChange={(e) => setAnswer(current.id, e.target.value)}
            rows={4}
            placeholder="اكتب إجابتك هنا..."
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.05] outline-none text-white text-[14px] leading-relaxed resize-none"
          />
        )}
      </div>

      {/* Prev/Next  ·  on the LAST question, "next" turns into a submit/jump
         button so the student can clearly finish without hunting for the
         footer. Disabled-silent buttons confused users (they thought they
         were stuck on the last question with nothing to press). */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" /> السابق
        </button>
        {isLast ? (
          <button
            onClick={onSubmit}
            className={`text-sm font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg transition-all ${
              allAnswered
                ? "bg-gradient-to-l from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20"
                : "bg-gradient-to-l from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20"
            }`}
            title={allAnswered ? "تسليم الاختبار للتصحيح" : "اذهب للسؤال غير المُجاب"}
          >
            <Sparkles className="w-4 h-4" />
            {allAnswered
              ? "تسليم وتصحيح ✓"
              : firstUnansweredIdx >= 0
                ? `↩ السؤال ${firstUnansweredIdx + 1} غير مُجاب`
                : "تسليم وتصحيح"}
          </button>
        ) : (
          <button
            onClick={goNext}
            className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center gap-1.5"
          >
            التالي <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Inline hint: when on the last question and the current answer is
         saved but other questions are still empty, point the student to
         them so they don't think the system is broken. */}
      {isLast && currentAnswered && !allAnswered && firstUnansweredIdx >= 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-amber-300/90">
          <span>تمّت الإجابة على هذا السؤال ✓ — لكن السؤال</span>
          <button
            onClick={() => jumpTo(firstUnansweredIdx)}
            className="font-bold underline decoration-amber-400/60 hover:text-amber-200"
          >
            رقم {firstUnansweredIdx + 1}
          </button>
          <span>لم يُجَب بعد.</span>
        </div>
      )}

      {unknownPageCount > 0 && (
        <div className="mt-4 text-[10.5px] text-white/45 text-center leading-relaxed">
          {unknownPageCount === questions.length
            ? "لم يستطع المعلّم تحديد رقم صفحة مرجعية لهذه الأسئلة بدقّة."
            : `${unknownPageCount} من الأسئلة بدون رقم صفحة مؤكّد — تم إخفاؤها بدلاً من تخمين رقم خاطئ.`}
        </div>
      )}
    </div>
  );
}

function ResultsState({
  result, activeScope, onClose, onRetry,
}: {
  result: SubmitResult;
  activeScope: ResolvedScope | null;
  onClose: () => void;
  onRetry: () => void;
}) {
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
            {activeScope && activeScope.pageEnd >= activeScope.pageStart && activeScope.pageStart > 0 && (
              <div className="text-[11px] text-white/50 mt-0.5">
                النطاق: صفحات {activeScope.pageStart}–{activeScope.pageEnd}
              </div>
            )}
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
                {q.page ? <div className="text-white/35 text-[10px]">📍 المرجع: صفحة {q.page}</div> : null}
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
