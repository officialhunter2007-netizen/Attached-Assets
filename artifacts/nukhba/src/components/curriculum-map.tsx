import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useLang } from "@/lib/lang-context";
import type { Subject } from "@/lib/curriculum";

interface CurriculumMapProps {
  subject: Subject;
  completedLessonIds: Set<string>;
  isOpen: boolean;
  onClose: () => void;
}

function UnitNode({
  unit,
  unitIndex,
  completedLessonIds,
  subjectId,
  onClose,
}: {
  unit: { id: string; name: string; lessons: { id: string; title: string }[] };
  unitIndex: number;
  completedLessonIds: Set<string>;
  subjectId: string;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const { tr } = useLang();
  const t = tr.subject;
  const [expanded, setExpanded] = useState(false);

  const total = unit.lessons.length;
  const done = unit.lessons.filter(l => completedLessonIds.has(l.id)).length;
  const allDone = done >= total;
  const hasProgress = done > 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const firstIncomplete = unit.lessons.find(l => !completedLessonIds.has(l.id));
  const targetLesson = firstIncomplete ?? unit.lessons[unit.lessons.length - 1];

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all ${
        allDone
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
          : hasProgress
            ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
            : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-4 flex items-center gap-3"
      >
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
            allDone
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : hasProgress
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-white/30 border border-white/10"
          }`}
        >
          {allDone ? "✓" : hasProgress ? "◉" : String(unitIndex + 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-bold ${
              allDone ? "text-emerald-200" : hasProgress ? "text-amber-200" : "text-white/70"
            }`}
          >
            {unit.name}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            {done}/{total} {done === 1 ? "درس" : "دروس"}
          </div>
        </div>
        <div className="shrink-0 text-white/30">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {hasProgress && (
        <div className="px-4 pb-2">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-400" : "bg-amber-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="flex gap-1.5 flex-wrap">
          {unit.lessons.map((lesson, li) => {
            const isLessonDone = completedLessonIds.has(lesson.id);
            return (
              <div
                key={lesson.id}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer hover:scale-110 ${
                  isLessonDone
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/8 text-white/40 border border-white/10 hover:bg-white/15 hover:text-white/60"
                }`}
                title={lesson.title}
              >
                {isLessonDone ? "✓" : li + 1}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-4 pt-0">
        <button
          type="button"
          onClick={() => {
            onClose();
            setLocation(`/lesson/${subjectId}/${unit.id}/${targetLesson.id}`);
          }}
          className={`w-full text-xs font-bold py-2.5 rounded-xl border transition-all ${
            allDone
              ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-200"
              : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-200"
          }`}
        >
          {allDone ? "↻ " + (t.reviewStage ?? "راجع الوحدة") : hasProgress ? "▶ " + (t.continueUnit ?? "تابع التعلّم") : "▶ " + (t.startUnit ?? "ابدأ الوحدة")}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5 border-t border-white/[0.06] pt-3">
              {unit.lessons.map((lesson, li) => {
                const isLessonDone = completedLessonIds.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      setLocation(`/lesson/${subjectId}/${unit.id}/${lesson.id}`);
                    }}
                    className="w-full text-right flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div
                      className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isLessonDone
                          ? "bg-emerald-500/25 text-emerald-300"
                          : "bg-white/8 text-white/40"
                      }`}
                    >
                      {isLessonDone ? "✓" : li + 1}
                    </div>
                    <span
                      className={`text-[12px] ${
                        isLessonDone ? "text-white/50" : "text-white/70"
                      }`}
                    >
                      {lesson.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CurriculumMap({ subject, completedLessonIds, isOpen, onClose }: CurriculumMapProps) {
  const { tr } = useLang();
  const t = tr.subject;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (!isOpen) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [isOpen]);

  const totalLessons = subject.units.reduce((s, u) => s + u.lessons.length, 0);
  const completedCount = subject.units.reduce(
    (s, u) => s + u.lessons.filter(l => completedLessonIds.has(l.id)).length,
    0,
  );
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ direction: "rtl" }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            className="relative z-10 w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "hsl(222,28%,9%)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
              style={{ borderColor: "rgba(245,158,11,0.15)", background: "hsl(222,28%,11%)" }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 text-base">
                  🗺️
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-white truncate">
                    {t.curriculumTitle ?? "خريطة المنهج"}
                  </div>
                  <div className="text-[11px] text-white/50 truncate">{subject.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/60 tabular-nums ml-1">
                <span className="font-bold text-white/80">{overallPct}%</span>
                <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-amber-400 transition-all"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="relative">
                <div
                  className="absolute right-[26px] top-2 bottom-2 w-[2px] pointer-events-none hidden sm:block"
                  style={{
                    background: "linear-gradient(180deg, rgba(16,185,129,0.35), rgba(245,158,11,0.2), rgba(255,255,255,0.04))",
                  }}
                />
                <div className="space-y-4 sm:space-y-5 relative">
                  {subject.units.map((unit, idx) => (
                    <div key={unit.id} className="relative sm:mr-14">
                      <div
                        className="hidden sm:flex absolute -right-[31px] top-6 w-3.5 h-3.5 rounded-full border-2 z-10 items-center justify-center transition-colors"
                        style={{
                          borderColor:
                            completedCount > 0 && unit.lessons.every(l => completedLessonIds.has(l.id))
                              ? "rgb(16,185,129)"
                              : completedCount > 0 && unit.lessons.some(l => completedLessonIds.has(l.id))
                                ? "rgb(245,158,11)"
                                : "rgba(255,255,255,0.12)",
                          background:
                            completedCount > 0 && unit.lessons.every(l => completedLessonIds.has(l.id))
                              ? "rgb(16,185,129)"
                              : completedCount > 0 && unit.lessons.some(l => completedLessonIds.has(l.id))
                                ? "rgb(245,158,11)"
                                : "transparent",
                        }}
                      />
                      <UnitNode
                        unit={unit}
                        unitIndex={idx}
                        completedLessonIds={completedLessonIds}
                        subjectId={subject.id}
                        onClose={onClose}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
