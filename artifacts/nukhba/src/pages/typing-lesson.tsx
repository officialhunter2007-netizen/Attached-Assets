import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import {
  getLessonById,
  getNextLesson,
  computeStars,
  keyFingerMap,
  type FingerColor,
  type Lesson,
} from "@/lib/typing-curriculum";
import {
  playKeyClick,
  playKeyError,
  playLessonComplete,
  resumeAudio,
} from "@/lib/typing-sounds";

const FINGER_COLORS: Record<FingerColor, { bg: string; glow: string; text: string }> = {
  red:    { bg: "#EF4444", glow: "rgba(239,68,68,0.5)",    text: "#fff" },
  green:  { bg: "#22C55E", glow: "rgba(34,197,94,0.5)",    text: "#fff" },
  blue:   { bg: "#3B82F6", glow: "rgba(59,130,246,0.5)",   text: "#fff" },
  yellow: { bg: "#EAB308", glow: "rgba(234,179,8,0.5)",    text: "#000" },
  gray:   { bg: "#6B7280", glow: "rgba(107,114,128,0.5)",  text: "#fff" },
};

type KeyDef = {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  finger: FingerColor;
  shiftLabel?: string;
};

const U = 44;
const G = 4;
const H = 40;
const STEP = U + G;

function makeKey(key: string, label: string, x: number, row: number, w = U, shiftLabel?: string): KeyDef {
  const finger = keyFingerMap[key.toLowerCase()] ?? keyFingerMap[key] ?? "gray";
  return { key, label, x, y: row * (H + G), w, h: H, finger, shiftLabel };
}

const KEYBOARD_KEYS: KeyDef[] = [
  makeKey("`", "`", 0, 0, U, "~"),
  makeKey("1", "1", STEP, 0, U, "!"),
  makeKey("2", "2", STEP*2, 0, U, "@"),
  makeKey("3", "3", STEP*3, 0, U, "#"),
  makeKey("4", "4", STEP*4, 0, U, "$"),
  makeKey("5", "5", STEP*5, 0, U, "%"),
  makeKey("6", "6", STEP*6, 0, U, "^"),
  makeKey("7", "7", STEP*7, 0, U, "&"),
  makeKey("8", "8", STEP*8, 0, U, "*"),
  makeKey("9", "9", STEP*9, 0, U, "("),
  makeKey("0", "0", STEP*10, 0, U, ")"),
  makeKey("-", "-", STEP*11, 0, U, "_"),
  makeKey("=", "=", STEP*12, 0, U, "+"),
  makeKey("Backspace", "⌫", STEP*13, 0, 92),

  makeKey("Tab", "Tab", 0, 1, 68),
  makeKey("q", "Q", 72, 1),
  makeKey("w", "W", 72+STEP, 1),
  makeKey("e", "E", 72+STEP*2, 1),
  makeKey("r", "R", 72+STEP*3, 1),
  makeKey("t", "T", 72+STEP*4, 1),
  makeKey("y", "Y", 72+STEP*5, 1),
  makeKey("u", "U", 72+STEP*6, 1),
  makeKey("i", "I", 72+STEP*7, 1),
  makeKey("o", "O", 72+STEP*8, 1),
  makeKey("p", "P", 72+STEP*9, 1),
  makeKey("[", "[", 72+STEP*10, 1, U, "{"),
  makeKey("]", "]", 72+STEP*11, 1, U, "}"),
  makeKey("\\", "\\", 72+STEP*12, 1, 68, "|"),

  makeKey("Caps", "Caps", 0, 2, 82),
  makeKey("a", "A", 86, 2),
  makeKey("s", "S", 86+STEP, 2),
  makeKey("d", "D", 86+STEP*2, 2),
  makeKey("f", "F", 86+STEP*3, 2),
  makeKey("g", "G", 86+STEP*4, 2),
  makeKey("h", "H", 86+STEP*5, 2),
  makeKey("j", "J", 86+STEP*6, 2),
  makeKey("k", "K", 86+STEP*7, 2),
  makeKey("l", "L", 86+STEP*8, 2),
  makeKey(";", ";", 86+STEP*9, 2, U, ":"),
  makeKey("'", "'", 86+STEP*10, 2, U, '"'),
  makeKey("Enter", "↵", 86+STEP*11, 2, 100),

  makeKey("LShift", "⇧", 0, 3, 108),
  makeKey("z", "Z", 112, 3),
  makeKey("x", "X", 112+STEP, 3),
  makeKey("c", "C", 112+STEP*2, 3),
  makeKey("v", "V", 112+STEP*3, 3),
  makeKey("b", "B", 112+STEP*4, 3),
  makeKey("n", "N", 112+STEP*5, 3),
  makeKey("m", "M", 112+STEP*6, 3),
  makeKey(",", ",", 112+STEP*7, 3, U, "<"),
  makeKey(".", ".", 112+STEP*8, 3, U, ">"),
  makeKey("/", "/", 112+STEP*9, 3, U, "?"),
  makeKey("RShift", "⇧", 112+STEP*10, 3, 152),

  makeKey(" ", "Space", 176, 4, 352),
];

const KEY_MAP = new Map<string, KeyDef>();
for (const k of KEYBOARD_KEYS) {
  KEY_MAP.set(k.key.toLowerCase(), k);
  if (k.shiftLabel) KEY_MAP.set(k.shiftLabel.toLowerCase(), k);
}

function VirtualKeyboard({ nextChar }: { nextChar: string }) {
  const nc = nextChar.toLowerCase();
  const isShift = nextChar !== nextChar.toLowerCase() && nextChar !== nextChar.toUpperCase()
    ? false
    : nextChar !== nextChar.toLowerCase();
  const activeKey = KEY_MAP.get(nc) ?? KEY_MAP.get(nextChar);
  const shiftKey = isShift || (activeKey && activeKey.shiftLabel);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 716 220"
        className="w-full max-w-2xl mx-auto block"
        style={{ minWidth: 400 }}
      >
        {KEYBOARD_KEYS.map((k) => {
          const isActive = activeKey === k;
          const isShiftActive = (k.key === "LShift" || k.key === "RShift") && isShift;
          const finger = k.finger;
          const colors = FINGER_COLORS[finger];
          const highlighted = isActive || isShiftActive;

          const baseColor = highlighted
            ? colors.bg
            : "rgba(30,36,56,0.9)";
          const borderColor = highlighted
            ? colors.bg
            : "rgba(255,255,255,0.08)";
          const textColor = highlighted
            ? colors.text
            : "rgba(255,255,255,0.7)";
          const glowFilter = highlighted
            ? `drop-shadow(0 0 6px ${colors.glow})`
            : undefined;

          return (
            <g key={k.key} style={{ filter: glowFilter }}>
              <rect
                x={k.x + 1}
                y={k.y + 1}
                width={k.w - 2}
                height={k.h - 2}
                rx={5}
                fill={baseColor}
                stroke={borderColor}
                strokeWidth={highlighted ? 1.5 : 1}
              />
              <text
                x={k.x + k.w / 2}
                y={k.y + k.h / 2 + 5}
                textAnchor="middle"
                fontSize={k.w >= 68 ? 9 : 12}
                fill={textColor}
                fontFamily="monospace"
                fontWeight={highlighted ? "700" : "400"}
              >
                {k.label}
              </text>
              {k.shiftLabel && k.w < 68 && (
                <text
                  x={k.x + k.w - 5}
                  y={k.y + 12}
                  textAnchor="end"
                  fontSize={8}
                  fill="rgba(255,255,255,0.3)"
                  fontFamily="monospace"
                >
                  {k.shiftLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StarDisplay({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3].map((s) => (
        <Star
          key={s}
          className={`w-8 h-8 ${s <= count ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
        />
      ))}
    </div>
  );
}

type Phase = "idle" | "active" | "complete";

export default function TypingLesson() {
  const [, params] = useRoute("/typing/lesson/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "1", 10);
  const lesson = getLessonById(id);

  const [typed, setTyped] = useState<string[]>([]);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("idle");
  const [startTime, setStartTime] = useState<number>(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [saved, setSaved] = useState(false);
  const wpmTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const text = lesson?.text ?? "";
  const currentIndex = typed.length;
  const nextChar = phase !== "complete" ? (text[currentIndex] ?? "") : "";

  const reset = useCallback(() => {
    setTyped([]);
    setErrors(new Set());
    setPhase("idle");
    setStartTime(0);
    setWpm(0);
    setAccuracy(100);
    setSaved(false);
    if (wpmTimer.current) clearInterval(wpmTimer.current);
  }, []);

  useEffect(() => { reset(); }, [id, reset]);

  useEffect(() => {
    if (phase !== "active") return;
    wpmTimer.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      if (elapsed > 0) setWpm(Math.round((typed.length / 5) / elapsed));
    }, 300);
    return () => { if (wpmTimer.current) clearInterval(wpmTimer.current); };
  }, [phase, startTime, typed.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "complete") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      resumeAudio();

      if (e.key === "Backspace") {
        e.preventDefault();
        if (typed.length === 0) return;
        const newErrors = new Set(errors);
        newErrors.delete(typed.length - 1);
        setErrors(newErrors);
        setTyped(prev => prev.slice(0, -1));
        return;
      }

      if (e.key.length !== 1) return;
      e.preventDefault();

      if (phase === "idle") {
        setPhase("active");
        setStartTime(Date.now());
      }

      const expected = text[currentIndex];
      const correct = e.key === expected;

      if (correct) {
        playKeyClick();
      } else {
        playKeyError();
        setErrors(prev => new Set(prev).add(currentIndex));
      }

      const newTyped = [...typed, e.key];
      setTyped(newTyped);

      if (newTyped.length >= text.length) {
        if (wpmTimer.current) clearInterval(wpmTimer.current);
        const elapsed = (Date.now() - startTime) / 1000 / 60;
        const finalWpm = elapsed > 0 ? Math.round((newTyped.length / 5) / elapsed) : 0;
        const errorCount = errors.size + (correct ? 0 : 1);
        const finalAccuracy = Math.round(((newTyped.length - errorCount) / newTyped.length) * 100);
        const finalStars = computeStars(finalWpm, finalAccuracy);
        setWpm(finalWpm);
        setAccuracy(finalAccuracy);
        setStars(finalStars);
        setPhase("complete");
        playLessonComplete();
        saveProgress(id, finalStars, finalWpm, finalAccuracy);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, typed, errors, text, currentIndex, startTime, id]);

  async function saveProgress(lessonId: number, stars: 1 | 2 | 3, wpm: number, accuracy: number) {
    try {
      await fetch("/api/typing/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify({ lessonId, stars, wpm, accuracy }),
      });
      setSaved(true);
    } catch {}
  }

  if (!lesson) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen" style={{ direction: "ltr" }}>
          <div className="text-white/50">Lesson not found</div>
        </div>
      </AppLayout>
    );
  }

  const nextLesson = getNextLesson(lesson);

  return (
    <AppLayout>
      <div className="min-h-screen py-6 px-4" style={{ direction: "ltr" }}>
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <Link href="/typing">
              <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to lessons
              </button>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs text-white/30">Section {lesson.sectionIndex + 1} · Lesson {lesson.lessonIndex + 1}</span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: "#F59E0B" }}>{wpm}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">WPM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: wpm > 0 && accuracy < 90 ? "#EF4444" : "#10B981" }}>{accuracy}%</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Accuracy</div>
              </div>
              <div className="flex-1" />
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restart
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(10,13,22,0.9)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
            }}
          >
            {phase === "idle" && (
              <div className="text-center mb-3 text-xs text-white/30 animate-pulse">
                Start typing to begin…
              </div>
            )}
            <div
              className="font-mono text-lg leading-relaxed tracking-wider select-none"
              style={{ letterSpacing: "0.05em", minHeight: 60 }}
            >
              {text.split("").map((char, idx) => {
                const isTyped = idx < typed.length;
                const isCurrent = idx === currentIndex;
                const isError = errors.has(idx);
                const typedChar = typed[idx];
                const wasWrong = isTyped && typedChar !== char;

                let color = "rgba(255,255,255,0.18)";
                if (isTyped && !wasWrong) color = "#10B981";
                if (isTyped && wasWrong) color = "#EF4444";

                return (
                  <span
                    key={idx}
                    style={{
                      color,
                      position: "relative",
                      borderBottom: isCurrent && phase !== "complete" ? "2px solid #F59E0B" : undefined,
                      paddingBottom: isCurrent ? 1 : undefined,
                      background: isCurrent ? "rgba(245,158,11,0.08)" : undefined,
                      borderRadius: isCurrent ? 2 : undefined,
                    }}
                  >
                    {char === " " ? "\u00a0" : char}
                  </span>
                );
              })}
            </div>
          </div>

          <VirtualKeyboard nextChar={nextChar} />

          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="text-xs text-white/30">
              {typed.length} / {text.length} characters
            </div>
            <div className="flex-1 mx-4">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(typed.length / text.length) * 100}%`,
                    background: "linear-gradient(90deg, #10B981, #F59E0B)",
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-white/30">
              {Math.round((typed.length / text.length) * 100)}%
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {phase === "complete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="rounded-3xl p-8 text-center max-w-sm w-full"
              style={{
                background: "linear-gradient(145deg, rgba(15,18,28,0.98), rgba(10,13,22,0.99))",
                border: "1px solid rgba(245,158,11,0.25)",
                boxShadow: "0 0 60px rgba(245,158,11,0.15), 0 20px 60px rgba(0,0,0,0.5)",
                direction: "ltr",
              }}
            >
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-white mb-2">Lesson Complete!</h2>

              <div className="my-5">
                <StarDisplay count={stars} />
                <div className="text-xs text-white/40 mt-2">
                  {stars === 3 ? "Perfect! Outstanding!" : stars === 2 ? "Great job!" : "Keep practicing!"}
                </div>
              </div>

              <div className="flex gap-6 justify-center my-5">
                <div>
                  <div className="text-3xl font-black" style={{ color: "#F59E0B" }}>{wpm}</div>
                  <div className="text-xs text-white/40">WPM</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-3xl font-black" style={{ color: accuracy >= 90 ? "#10B981" : "#EF4444" }}>{accuracy}%</div>
                  <div className="text-xs text-white/40">Accuracy</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={reset}
                  className="py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  Try Again
                </button>
                {nextLesson ? (
                  <button
                    onClick={() => navigate(`/typing/lesson/${nextLesson.id}`)}
                    className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: "#F59E0B", color: "#000" }}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link href="/typing">
                    <button
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={{ background: "#10B981", color: "#fff" }}
                    >
                      All Done!
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
