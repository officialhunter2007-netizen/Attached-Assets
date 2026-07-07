import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { Lock, Star, ChevronDown, ChevronUp, Keyboard } from "lucide-react";
import { sections, type Lesson, type Section } from "@/lib/typing-curriculum";

type ProgressMap = Record<number, { stars: number; wpm: number; accuracy: number }>;

function StarRow({ count, size = "sm" }: { count: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= count ? "fill-amber-400 text-amber-400" : "text-white/10"}`}
        />
      ))}
    </div>
  );
}

function LessonCard({
  lesson,
  progress,
  locked,
  index,
}: {
  lesson: Lesson;
  progress?: { stars: number; wpm: number; accuracy: number };
  locked: boolean;
  index: number;
}) {
  const done = !!progress;
  const stars = progress?.stars ?? 0;

  return (
    <Link href={locked ? "#" : `/typing/lesson/${lesson.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className={`relative rounded-xl p-3 flex items-center gap-3 transition-all ${locked ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:scale-[1.02] active:scale-[0.98]"}`}
        style={{
          background: done
            ? "rgba(16,185,129,0.07)"
            : "rgba(255,255,255,0.03)",
          border: done
            ? "1px solid rgba(16,185,129,0.2)"
            : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
          style={{
            background: done
              ? "rgba(16,185,129,0.15)"
              : "rgba(255,255,255,0.04)",
            color: done ? "#10B981" : "rgba(255,255,255,0.3)",
          }}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : lesson.lessonIndex + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: locked ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)" }}
          >
            {lesson.title}
          </div>
          {done && (
            <div className="flex items-center gap-2 mt-0.5">
              <StarRow count={stars} size="xs" />
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {progress?.wpm} WPM · {progress?.accuracy}%
              </span>
            </div>
          )}
        </div>

        {done && stars === 3 && (
          <div className="text-xs">✅</div>
        )}
      </motion.div>
    </Link>
  );
}

function SectionPanel({
  section,
  progress,
  unlockedUpTo,
  defaultOpen,
}: {
  section: Section;
  progress: ProgressMap;
  unlockedUpTo: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completedCount = section.lessons.filter((l) => progress[l.id]).length;
  const totalCount = section.lessons.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: section.bgColor,
        border: `1px solid ${section.color}30`,
      }}
    >
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${section.color}20` }}
        >
          {section.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{section.title}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${section.color}20`, color: section.color }}
            >
              Section {section.index + 1}
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {section.subtitle}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: section.color }}
              />
            </div>
            <span className="text-[10px] font-bold" style={{ color: section.color }}>
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.3)" }}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {section.lessons.map((lesson, li) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              progress={progress[lesson.id]}
              locked={lesson.id > unlockedUpTo}
              index={li}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Typing() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/typing/progress", { credentials: "include" });
        if (r.ok) {
          const data: Array<{ lessonId: number; stars: number; bestWpm: number; bestAccuracy: number }> = await r.json();
          const map: ProgressMap = {};
          for (const row of data) {
            map[row.lessonId] = { stars: row.stars, wpm: row.bestWpm, accuracy: row.bestAccuracy };
          }
          setProgress(map);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const completedIds = new Set(Object.keys(progress).map(Number));

  function getUnlockedUpTo(): number {
    const allLessons = sections.flatMap((s) => s.lessons);
    let last = allLessons[0]?.id ?? 1;
    for (const lesson of allLessons) {
      if (completedIds.has(lesson.id)) {
        last = lesson.id + 1;
      } else {
        break;
      }
    }
    return last;
  }

  const unlockedUpTo = loading ? 1 : getUnlockedUpTo();
  const totalLessons = sections.reduce((s, sec) => s + sec.lessons.length, 0);
  const totalCompleted = completedIds.size;
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const firstIncomplete = sections
    .flatMap((s) => s.lessons)
    .find((l) => !completedIds.has(l.id));

  return (
    <AppLayout>
      <div className="min-h-screen" style={{ direction: "ltr" }}>
        <div className="relative overflow-hidden py-10 px-4">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 70%)",
            }}
          />
          <div className="relative max-w-2xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "#F59E0B",
              }}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Typing Trainer
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              Learn to Type Fast
            </h1>
            <p className="text-sm text-white/40 mb-6">
              {totalLessons} lessons · 14 sections · from Home Row to full keyboard
            </p>

            <div className="max-w-xs mx-auto mb-3">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span>{totalCompleted} completed</span>
                <span className="font-bold" style={{ color: "#F59E0B" }}>{overallPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #10B981, #F59E0B)" }}
                />
              </div>
            </div>

            {firstIncomplete && (
              <Link href={`/typing/lesson/${firstIncomplete.id}`}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 px-6 py-3 rounded-2xl text-sm font-bold text-black"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
                >
                  {totalCompleted === 0 ? "Start Typing" : "Continue"} →
                </motion.button>
              </Link>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-12 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            sections.map((section, si) => {
              const firstLessonId = section.lessons[0]?.id ?? 1;
              const isUnlocked = firstLessonId <= unlockedUpTo;
              const hasProgress = section.lessons.some((l) => progress[l.id]);
              const defaultOpen = hasProgress || si === 0 ||
                (si > 0 && sections[si - 1]?.lessons.every((l) => progress[l.id]));
              return (
                <SectionPanel
                  key={section.index}
                  section={section}
                  progress={progress}
                  unlockedUpTo={unlockedUpTo}
                  defaultOpen={defaultOpen}
                />
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
