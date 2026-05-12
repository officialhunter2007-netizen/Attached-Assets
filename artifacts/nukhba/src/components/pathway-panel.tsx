import { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Lock, Map as MapIcon, Loader2, BookOpen, Target, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlanStage {
  title: string;
  descHtml: string;
  duration: string;
  objectives: string[];
  microSteps: string[];
  deliverable: string;
  masteryCriterion: string;
  reasonForStudent: string;
  prerequisite: string;
}

function getOutermostOlContent(html: string): string | null {
  const start = html.indexOf('<ol');
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;
  let depth = 1;
  let pos = tagEnd + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf('<ol', pos);
    const nextClose = html.indexOf('</ol>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 3;
    } else {
      depth--;
      if (depth === 0) return html.slice(tagEnd + 1, nextClose);
      pos = nextClose + 5;
    }
  }
  return null;
}

function getTopLevelLiItems(olContent: string): string[] {
  const items: string[] = [];
  let i = 0;
  while (i < olContent.length) {
    const liStart = olContent.indexOf('<li', i);
    if (liStart === -1) break;
    const tagEnd = olContent.indexOf('>', liStart);
    if (tagEnd === -1) break;
    let depth = 1;
    let pos = tagEnd + 1;
    let found = false;
    while (pos < olContent.length) {
      const nextOpen = olContent.indexOf('<li', pos);
      const nextClose = olContent.indexOf('</li>', pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 3;
      } else {
        depth--;
        if (depth === 0) {
          items.push(olContent.slice(tagEnd + 1, nextClose));
          i = nextClose + 5;
          found = true;
          break;
        }
        pos = nextClose + 5;
      }
    }
    if (!found) break;
  }
  return items;
}

function extractClassedList(html: string, cls: string): string[] {
  const re = new RegExp(`class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:ul|ol)>`, 'i');
  const m = html.match(re);
  if (!m) return [];
  const items: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = liRe.exec(m[1])) !== null) {
    items.push(lm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return items;
}

function extractClassedText(html: string, cls: string): string {
  const re = new RegExp(`class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:p|div|span)>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parsePlanStages(planHtml: string | null): PlanStage[] {
  if (!planHtml) return [];
  try {
    const olContent = getOutermostOlContent(planHtml);
    if (!olContent) return [];
    const liItems = getTopLevelLiItems(olContent);
    const items: PlanStage[] = [];
    for (const inner of liItems) {
      const strong = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? '';
      const em = inner.match(/<em[^>]*>([\s\S]*?)<\/em>/i)?.[1] ?? '';
      const cleanTitle = strong.replace(/<[^>]+>/g, '').trim().replace(/^المرحلة\s*\d+\s*[—\-:]\s*/, '');
      const cleanDuration = em.replace(/<[^>]+>/g, '').replace(/^المدة[:\s]*/i, '').trim();
      const objectives = extractClassedList(inner, 'stage-objectives');
      const microSteps = extractClassedList(inner, 'stage-microsteps');
      const deliverable = extractClassedText(inner, 'stage-deliverable');
      const masteryCriterion = extractClassedText(inner, 'stage-mastery');
      const reasonForStudent = extractClassedText(inner, 'stage-reason');
      const prerequisite = extractClassedText(inner, 'stage-prerequisite');
      if (!cleanTitle && objectives.length === 0 && microSteps.length === 0) continue;
      items.push({
        title: cleanTitle || `مرحلة ${items.length + 1}`,
        descHtml: '',
        duration: cleanDuration,
        objectives,
        microSteps,
        deliverable,
        masteryCriterion,
        reasonForStudent,
        prerequisite,
      });
    }
    return items;
  } catch { return []; }
}

interface PathwayPanelProps {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
}

export function PathwayPanel({ subjectId, subjectName, onClose }: PathwayPanelProps) {
  const [loading, setLoading] = useState(true);
  const [planHtml, setPlanHtml] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [completedMicroSteps, setCompletedMicroSteps] = useState<number[]>([]);
  const [expandedStage, setExpandedStage] = useState<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/user-plan?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data?.plan?.planHtml) {
          setPlanHtml(data.plan.planHtml);
          const stage = data.plan.currentStageIndex ?? 0;
          setCurrentStage(stage);
          setExpandedStage(stage);
          if (Array.isArray(data.plan.completedMicroSteps)) {
            setCompletedMicroSteps(data.plan.completedMicroSteps);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const stages = parsePlanStages(planHtml);
  const effectiveTotal = stages.length;
  const progressPct = effectiveTotal > 0
    ? Math.min(100, Math.round((currentStage / Math.max(effectiveTotal, 1)) * 100))
    : 0;

  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (progressPct / 100) * c;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ direction: "rtl" }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          ref={panelRef}
          className="relative z-10 w-full sm:max-w-md max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "hsl(222,28%,9%)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
            style={{ borderColor: "rgba(245,158,11,0.15)", background: "hsl(222,28%,11%)" }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                <MapIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-white truncate">المسار التكيّفي</div>
                <div className="text-[11px] text-white/50 truncate">{subjectName}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <div className="text-[13px] text-white/50">جاري تحميل مسارك التعليمي...</div>
              </div>
            ) : !planHtml || stages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-amber-400/70" />
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white/80 mb-1">لا يوجد مسار بعد</div>
                  <div className="text-[12px] text-white/45 leading-relaxed">
                    ابدأ جلسة تعليمية وسيقوم المعلم بإنشاء مسارك التكيّفي المخصص تلقائياً
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-4">
                {/* Progress ring */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.06))",
                    borderColor: "rgba(245,158,11,0.18)",
                  }}
                >
                  <div className="relative w-20 h-20 shrink-0">
                    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                      <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                      <circle
                        cx="40" cy="40" r={r}
                        stroke="url(#pwGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${dash} ${c}`}
                        style={{ transition: "stroke-dasharray 0.5s ease-out" }}
                      />
                      <defs>
                        <linearGradient id="pwGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[15px] font-black text-amber-200 tabular-nums">
                      {progressPct}%
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-amber-300/70 font-bold mb-1">التقدّم العام</div>
                    <div className="text-[14px] font-bold text-white truncate">
                      {stages[Math.min(currentStage, stages.length - 1)]?.title || ''}
                    </div>
                    <div className="text-[11px] text-white/45 mt-0.5">
                      المرحلة {Math.min(currentStage + 1, stages.length)} من {stages.length}
                    </div>
                  </div>
                </div>

                {/* Stages list */}
                <ol className="space-y-2">
                  {stages.map((s, idx) => {
                    const isActive = idx === currentStage;
                    const isDone = idx < currentStage;
                    const isLocked = idx > currentStage;
                    const isExpanded = expandedStage === idx;

                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => setExpandedStage(isExpanded ? -1 : idx)}
                          className="w-full text-right"
                        >
                          <div
                            className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                            style={{
                              background: isActive
                                ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))"
                                : isDone
                                ? "rgba(16,185,129,0.06)"
                                : "rgba(255,255,255,0.03)",
                              borderColor: isActive
                                ? "rgba(245,158,11,0.35)"
                                : isDone
                                ? "rgba(16,185,129,0.25)"
                                : "rgba(255,255,255,0.07)",
                            }}
                          >
                            <div className="shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : isActive ? (
                                <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-400/20 flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                </div>
                              ) : (
                                <Lock className="w-5 h-5 text-white/25" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <div
                                className="text-[13px] font-bold truncate"
                                style={{
                                  color: isActive ? "#fbbf24" : isDone ? "#34d399" : "rgba(255,255,255,0.45)",
                                }}
                              >
                                <span className="text-[11px] opacity-60 ml-1">المرحلة {idx + 1}:</span>
                                {s.title}
                              </div>
                              {s.duration && (
                                <div className="text-[10px] text-white/35 mt-0.5">{s.duration}</div>
                              )}
                            </div>
                            <div className="shrink-0 text-white/30">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="mx-1 mb-2 p-3 rounded-b-xl space-y-2.5 border-x border-b"
                                style={{ borderColor: isActive ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)" }}
                              >
                                {s.objectives.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <Target className="w-3 h-3 text-amber-400/70" />
                                      <div className="text-[10px] font-bold text-amber-300/70">الأهداف</div>
                                    </div>
                                    <ul className="space-y-1">
                                      {s.objectives.map((obj, oi) => (
                                        <li key={oi} className="flex gap-2 text-[11px] text-white/60">
                                          <span className="text-amber-400/50 shrink-0">•</span>
                                          <span>{obj}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {s.microSteps.length > 0 && (
                                  <div>
                                    <div className="text-[10px] font-bold text-purple-300/60 mb-1.5">الخطوات التفصيلية</div>
                                    <ul className="space-y-1">
                                      {s.microSteps.map((step, si) => {
                                        const globalIndex = idx * 100 + si;
                                        const done = completedMicroSteps.includes(globalIndex) || isDone;
                                        return (
                                          <li key={si} className="flex gap-2 text-[11px]">
                                            <span className={done ? "text-emerald-400/70" : "text-white/30"}>
                                              {done ? "✓" : `${si + 1}.`}
                                            </span>
                                            <span className={done ? "text-white/45 line-through" : "text-white/60"}>
                                              {step}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                                {s.deliverable && (
                                  <div className="text-[10px] text-white/40">
                                    <span className="font-bold text-white/55">المُخرَج: </span>{s.deliverable}
                                  </div>
                                )}
                                {s.masteryCriterion && (
                                  <div
                                    className="rounded-lg px-2 py-1.5 border"
                                    style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.15)" }}
                                  >
                                    <div className="text-[10px] font-bold text-amber-300/60 mb-0.5">معيار الإتقان</div>
                                    <div className="text-[11px] text-amber-100/65">{s.masteryCriterion}</div>
                                  </div>
                                )}
                                {s.reasonForStudent && (
                                  <div
                                    className="rounded-lg px-2 py-1.5 border"
                                    style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.15)" }}
                                  >
                                    <div className="text-[10px] font-bold text-purple-300/60 mb-0.5">لماذا هذه المرحلة لك</div>
                                    <div className="text-[11px] text-purple-100/65">{s.reasonForStudent}</div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
