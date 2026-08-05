import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, ChevronRight, Star, Gem } from "lucide-react";
import { Link } from "wouter";
import {
  getLessonById,
  getNextLesson,
  computeStars,
  arKeyFingerMap,
  arKeyHandMap,
  allLessons,
  type FingerColor,
  type Lesson,
} from "@/lib/typing-curriculum-ar";
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

const EARLY_TIPS = [
  { icon: "🖐", text: "ضع أصابعك على الصف الرئيسي — ش س ي ب لليد اليسرى، ا ت ن م لليمنى — هذا موطنك" },
  { icon: "👁", text: "انظر دائماً إلى الشاشة وليس للوحة المفاتيح — هذا سر المحترفين" },
  { icon: "🐢", text: "ابدأ ببطء — الدقة أهم من السرعة الآن، والسرعة ستأتي لوحدها لاحقاً" },
  { icon: "📍", text: "مفتاح ب له نتوء صغير تحسّه بإصبعك — وكذلك ت — دعهما يكونا مرساتك دون أن تنظر" },
  { icon: "🌊", text: "أبقِ أصابعك قريبة من المفاتيح — حركات صغيرة = سرعة أكبر" },
];

const MID_TIPS = [
  { icon: "👍", text: "مفتاح المسافة يُضغط بالإبهام — يمكنك استخدام أي إبهام تريد" },
  { icon: "📖", text: "اقرأ الكلمة كاملة بعينك قبل أن تبدأ كتابتها — يقلل الأخطاء كثيراً" },
  { icon: "🎯", text: "دقة 95% وما فوق تعني أنك تتعلم بالطريقة الصحيحة — لا تتعجل" },
  { icon: "🪑", text: "اجلس بظهر مستقيم وكوعاك بزاوية 90 درجة — راحة الجسم تعني راحة الأصابع" },
  { icon: "⌫", text: "عند الخطأ، اضغط Backspace بهدوء وتابع — لا تتوقف طويلاً" },
];

const ADVANCED_TIPS = [
  { icon: "🎵", text: "أصابعك الآن تعرف مواقعها — ركّز على الإيقاع والتدفق لا على كل مفتاح" },
  { icon: "👀", text: "حاول متابعة الكلمة التالية بعينك بينما تكتب الحالية" },
  { icon: "💨", text: "الكتابة السريعة إيقاع موسيقي — اترك أصابعك تتدفق بانسجام دون توقف" },
  { icon: "🏆", text: "تجاوز 40 كلمة/د هو خط المحترفين — أنت قريب من ذلك" },
];

const LOW_ACCURACY = [
  { text: "ابطئ قليلاً — الدقة أهم من السرعة الآن", icon: "🎯" },
  { text: "ركّز على كل مفتاح — السرعة ستأتي تلقائياً", icon: "🔍" },
  { text: "اقرأ الكلمة بعينك قبل أن تضغط أي مفتاح", icon: "👁" },
  { text: "لا بأس — كل خطأ يُقوّي ذاكرة أصابعك", icon: "💪" },
];

const ENCOURAGEMENT = [
  { text: "رائع! أصابعك تجد طريقها وحدها", icon: "🔥" },
  { text: "ممتاز! هذا هو الإيقاع الصحيح", icon: "⚡" },
  { text: "استمر! تقدمك واضح جداً", icon: "🚀" },
  { text: "أداء احترافي! واصل بنفس الأسلوب", icon: "✨" },
];

type KeyDef = {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  finger: FingerColor;
};

const U = 44;
const G = 4;
const H = 40;
const STEP = U + G;

function makeArKey(arChar: string, x: number, row: number, w = U): KeyDef {
  const finger = arKeyFingerMap[arChar] ?? "gray";
  return { key: arChar, label: arChar, x, y: row * (H + G), w, h: H, finger };
}

const AR_KEYBOARD_KEYS: KeyDef[] = [
  { key: "`", label: "`", x: 0, y: 0, w: U, h: H, finger: "red" },
  { key: "1", label: "١", x: STEP, y: 0, w: U, h: H, finger: "red" },
  { key: "2", label: "٢", x: STEP*2, y: 0, w: U, h: H, finger: "red" },
  { key: "3", label: "٣", x: STEP*3, y: 0, w: U, h: H, finger: "red" },
  { key: "4", label: "٤", x: STEP*4, y: 0, w: U, h: H, finger: "yellow" },
  { key: "5", label: "٥", x: STEP*5, y: 0, w: U, h: H, finger: "yellow" },
  { key: "6", label: "٦", x: STEP*6, y: 0, w: U, h: H, finger: "yellow" },
  { key: "7", label: "٧", x: STEP*7, y: 0, w: U, h: H, finger: "yellow" },
  { key: "8", label: "٨", x: STEP*8, y: 0, w: U, h: H, finger: "blue" },
  { key: "9", label: "٩", x: STEP*9, y: 0, w: U, h: H, finger: "green" },
  { key: "0", label: "٠", x: STEP*10, y: 0, w: U, h: H, finger: "red" },
  { key: "-", label: "-", x: STEP*11, y: 0, w: U, h: H, finger: "red" },
  { key: "=", label: "=", x: STEP*12, y: 0, w: U, h: H, finger: "red" },
  { key: "Backspace", label: "⌫", x: STEP*13, y: 0, w: 92, h: H, finger: "red" },

  { key: "Tab", label: "Tab", x: 0, y: H+G, w: 68, h: H, finger: "red" },
  makeArKey("ض", 72, 1),
  makeArKey("ص", 72+STEP, 1),
  makeArKey("ث", 72+STEP*2, 1),
  makeArKey("ق", 72+STEP*3, 1),
  makeArKey("ف", 72+STEP*4, 1),
  makeArKey("غ", 72+STEP*5, 1),
  makeArKey("ع", 72+STEP*6, 1),
  makeArKey("ه", 72+STEP*7, 1),
  makeArKey("خ", 72+STEP*8, 1),
  makeArKey("ح", 72+STEP*9, 1),
  makeArKey("ج", 72+STEP*10, 1),
  makeArKey("د", 72+STEP*11, 1),
  makeArKey("ذ", 72+STEP*12, 1, 68),

  { key: "Caps", label: "Caps", x: 0, y: 2*(H+G), w: 82, h: H, finger: "red" },
  makeArKey("ش", 86, 2),
  makeArKey("س", 86+STEP, 2),
  makeArKey("ي", 86+STEP*2, 2),
  makeArKey("ب", 86+STEP*3, 2),
  makeArKey("ل", 86+STEP*4, 2),
  makeArKey("ا", 86+STEP*5, 2),
  makeArKey("ت", 86+STEP*6, 2),
  makeArKey("ن", 86+STEP*7, 2),
  makeArKey("م", 86+STEP*8, 2),
  makeArKey("ك", 86+STEP*9, 2),
  { key: "Enter", label: "↵", x: 86+STEP*10, y: 2*(H+G), w: 100, h: H, finger: "red" },

  { key: "LShift", label: "⇧", x: 0, y: 3*(H+G), w: 108, h: H, finger: "red" },
  makeArKey("ئ", 112, 3),
  makeArKey("ء", 112+STEP, 3),
  makeArKey("ؤ", 112+STEP*2, 3),
  makeArKey("ر", 112+STEP*3, 3),
  makeArKey("ى", 112+STEP*5, 3),
  makeArKey("ة", 112+STEP*6, 3),
  makeArKey("و", 112+STEP*7, 3),
  makeArKey("ز", 112+STEP*8, 3),
  makeArKey("ظ", 112+STEP*9, 3),
  { key: "RShift", label: "⇧", x: 112+STEP*10, y: 3*(H+G), w: 124, h: H, finger: "red" },

  { key: " ", label: "مسافة", x: 176, y: 4*(H+G), w: 352, h: H, finger: "gray" },
];

const AR_KEY_MAP = new Map<string, KeyDef>();
for (const k of AR_KEYBOARD_KEYS) {
  AR_KEY_MAP.set(k.key, k);
}

function fingerPill(cx: number, tipY: number, baseY: number, hw: number): string {
  return `M ${cx - hw} ${baseY} L ${cx - hw} ${tipY + hw} A ${hw} ${hw} 0 0 1 ${cx + hw} ${tipY + hw} L ${cx + hw} ${baseY}`;
}

type FingerDef = { color: FingerColor; cx: number; tipY: number; baseY: number; hw: number };

const L_FINGER_DEFS: FingerDef[] = [
  { color: "red",    cx: 50,  tipY: 65, baseY: 154, hw: 11.5 },
  { color: "green",  cx: 82,  tipY: 40, baseY: 154, hw: 13   },
  { color: "blue",   cx: 115, tipY: 24, baseY: 154, hw: 14.5 },
  { color: "yellow", cx: 149, tipY: 42, baseY: 154, hw: 13   },
];
const R_FINGER_DEFS: FingerDef[] = [
  { color: "yellow", cx: 50,  tipY: 42, baseY: 154, hw: 13   },
  { color: "blue",   cx: 84,  tipY: 24, baseY: 154, hw: 14.5 },
  { color: "green",  cx: 117, tipY: 40, baseY: 154, hw: 13   },
  { color: "red",    cx: 149, tipY: 65, baseY: 154, hw: 11.5 },
];

function HandGroup({
  side,
  fingerColor,
  isActive,
  shiftPinky = false,
}: {
  side: "left" | "right";
  fingerColor: FingerColor | null;
  isActive: boolean;
  shiftPinky?: boolean;
}) {
  const defs = side === "left" ? L_FINGER_DEFS : R_FINGER_DEFS;
  const thumbCx = side === "left" ? 190 : 12;
  const thumbTipY = 118;
  const thumbBaseY = 154;
  const PALM_W = 220;
  const PALM_H = 65;
  const palmX = 0;
  const palmY = 154 - PALM_H / 2;

  return (
    <g>
      <rect
        x={palmX} y={palmY} width={PALM_W} height={PALM_H}
        rx={14}
        fill="rgba(30,35,55,0.9)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />
      {defs.map((fd) => {
        const isTargetFinger = fingerColor !== null && fd.color === fingerColor;
        const isShift = shiftPinky && fd.color === "red";
        const active = isTargetFinger || isShift;
        const { bg, glow } = FINGER_COLORS[fd.color];
        return (
          <path
            key={fd.color}
            d={fingerPill(fd.cx, fd.tipY, fd.baseY, fd.hw)}
            fill={active ? bg : "rgba(40,47,72,0.95)"}
            stroke={active ? glow : "rgba(255,255,255,0.07)"}
            strokeWidth={active ? 2 : 1}
            style={{ filter: active ? `drop-shadow(0 0 8px ${glow})` : undefined, transition: "all 0.12s" }}
          />
        );
      })}
      <path
        d={fingerPill(thumbCx, thumbTipY, thumbBaseY + 10, 12.5)}
        fill={fingerColor === "gray" ? FINGER_COLORS.gray.bg : "rgba(40,47,72,0.95)"}
        stroke={fingerColor === "gray" ? FINGER_COLORS.gray.glow : "rgba(255,255,255,0.07)"}
        strokeWidth={fingerColor === "gray" ? 2 : 1}
        style={{ filter: fingerColor === "gray" ? `drop-shadow(0 0 8px ${FINGER_COLORS.gray.glow})` : undefined, transition: "all 0.12s" }}
      />
    </g>
  );
}

function VirtualKeyboard({ nextChar }: { nextChar: string }) {
  const kd = AR_KEY_MAP.get(nextChar);
  const fingerColor: FingerColor = (kd?.finger ?? arKeyFingerMap[nextChar] ?? "gray") as FingerColor;
  const handSide = (arKeyHandMap[nextChar] ?? "both") as "left" | "right" | "both";
  const isIdle = nextChar === "";

  const leftActive  = !isIdle && (handSide === "left"  || handSide === "both");
  const rightActive = !isIdle && (handSide === "right" || handSide === "both");

  const SCALE  = 0.636;
  const HAND_Y = 59;

  return (
    <div className="w-full overflow-x-auto select-none">
      <svg viewBox="0 0 996 220" className="w-full block" style={{ minWidth: 0 }}>
        <g
          transform={`translate(0,${HAND_Y}) scale(${SCALE})`}
          opacity={isIdle ? 0.5 : leftActive ? 1 : 0.2}
        >
          <HandGroup
            side="left"
            fingerColor={leftActive ? fingerColor : null}
            isActive={true}
            shiftPinky={false}
          />
        </g>

        <g transform="translate(140, 0)">
          {AR_KEYBOARD_KEYS.map((k) => {
            const isActive = kd ? k.key === kd.key : false;
            const colors = FINGER_COLORS[k.finger];
            return (
              <g key={k.key} style={{ filter: isActive ? `drop-shadow(0 0 6px ${colors.glow})` : undefined }}>
                <rect
                  x={k.x + 1} y={k.y + 1} width={k.w - 2} height={k.h - 2}
                  rx={5}
                  fill={isActive ? colors.bg : "rgba(30,36,56,0.9)"}
                  stroke={isActive ? colors.bg : "rgba(255,255,255,0.08)"}
                  strokeWidth={isActive ? 1.5 : 1}
                />
                <text
                  x={k.x + k.w / 2}
                  y={k.y + k.h / 2 + 5}
                  textAnchor="middle"
                  fontSize={k.key === " " ? 9 : k.w >= 68 ? 9 : 12}
                  fontFamily="Tajawal, Cairo, sans-serif"
                  fill={isActive ? colors.text : "rgba(255,255,255,0.7)"}
                  fontWeight={isActive ? "700" : "400"}
                >
                  {k.label}
                </text>
              </g>
            );
          })}
        </g>

        <g
          transform={`translate(856,${HAND_Y}) scale(${SCALE})`}
          opacity={isIdle ? 0.5 : rightActive ? 1 : 0.2}
        >
          <HandGroup
            side="right"
            fingerColor={rightActive ? fingerColor : null}
            isActive={true}
            shiftPinky={false}
          />
        </g>
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

type Phase = "idle" | "active" | "paying" | "complete";
type WalletInfo = { subjectId: string; gemsBalance: number; specialtyName: string | null; specialtyIcon: string | null };

export default function TypingLessonAr() {
  const [, params] = useRoute("/typing-ar/lesson/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "10001", 10);
  const lesson = getLessonById(id);

  const [lockChecked, setLockChecked] = useState(false);

  useEffect(() => {
    if (id === 10001) { setLockChecked(true); return; }
    (async () => {
      try {
        const r = await fetch("/api/typing/progress", { credentials: "include" });
        if (r.ok) {
          const data: Array<{ lessonId: number; stars: number }> = await r.json();
          const completedIds = new Set(data.filter((d) => d.stars >= 1).map((d) => d.lessonId));
          const ordered = allLessons;
          let unlockedUpTo = ordered[0]?.id ?? 10001;
          for (const l of ordered) {
            if (completedIds.has(l.id)) { unlockedUpTo = l.id + 1; } else { break; }
          }
          if (id > unlockedUpTo) { navigate("/typing-ar"); return; }
        }
      } catch {}
      setLockChecked(true);
    })();
  }, [id]);

  const [typed, setTyped] = useState<string[]>([]);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("idle");
  const [startTime, setStartTime] = useState<number>(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [saved, setSaved] = useState(false);
  const wpmTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Gem deduction modal ──────────────────────────────────────────────────────
  type GemModal = { wallets: WalletInfo[]; loading: boolean; error: string | null; charging: boolean; selectedWallet: string | null };
  const [gemModal, setGemModal] = useState<GemModal | null>(null);
  const [pendingResult, setPendingResult] = useState<{ lessonId: number; stars: 1|2|3; wpm: number; accuracy: number } | null>(null);
  const billingRef = useRef({ shown: false, lastSubjectId: null as string | null });

  const [showIntro, setShowIntro] = useState(true);
  const [showTip, setShowTip] = useState(true);
  const [guidanceMsg, setGuidanceMsg] = useState<{ text: string; icon: string; kind: "warn" | "ok" } | null>(null);
  const guidanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGuidanceAt = useRef(0);
  const guidanceCycle = useRef(0);

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
    setShowIntro(true);
    setShowTip(true);
    setGuidanceMsg(null);
    setGemModal(null);
    setPendingResult(null);
    lastGuidanceAt.current = 0;
    guidanceCycle.current = 0;
    if (wpmTimer.current) clearInterval(wpmTimer.current);
    if (guidanceTimer.current) clearTimeout(guidanceTimer.current);
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
    if (phase !== "active" || typed.length < 18) return;
    const gap = typed.length - lastGuidanceAt.current;
    const showWarn = accuracy < 80 && gap >= 20;
    const showOk   = accuracy >= 96 && gap >= 38;
    if (!showWarn && !showOk) return;
    lastGuidanceAt.current = typed.length;
    guidanceCycle.current += 1;
    const cycle = guidanceCycle.current;
    const item = showWarn
      ? LOW_ACCURACY[cycle % LOW_ACCURACY.length]
      : ENCOURAGEMENT[cycle % ENCOURAGEMENT.length];
    setGuidanceMsg({ ...item, kind: showWarn ? "warn" : "ok" });
    if (guidanceTimer.current) clearTimeout(guidanceTimer.current);
    guidanceTimer.current = setTimeout(() => setGuidanceMsg(null), showWarn ? 5500 : 4000);
  }, [typed.length, accuracy, phase]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "complete" || phase === "paying") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (showIntro) { setShowIntro(false); return; }
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

      const liveErrorCount = errors.size + (correct ? 0 : 1);
      const liveAccuracy = Math.round(((newTyped.length - liveErrorCount) / newTyped.length) * 100);
      setAccuracy(liveAccuracy);

      if (newTyped.length >= text.length) {
        if (wpmTimer.current) clearInterval(wpmTimer.current);
        const elapsed = (Date.now() - startTime) / 1000 / 60;
        const finalWpm = elapsed > 0 ? Math.round((newTyped.length / 5) / elapsed) : 0;
        const finalAccuracy = liveAccuracy;
        const finalStars = computeStars(finalWpm, finalAccuracy);
        setWpm(finalWpm);
        setAccuracy(finalAccuracy);
        setStars(finalStars);
        playLessonComplete();
        // Show gem payment modal before completing
        setPhase("paying");
        setPendingResult({ lessonId: id, stars: finalStars, wpm: finalWpm, accuracy: finalAccuracy });
        fetchWalletsAndShowModal();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, typed, errors, text, currentIndex, startTime, id, showIntro]);

  async function saveProgress(lessonId: number, s: 1 | 2 | 3, w: number, a: number) {
    try {
      await fetch("/api/typing/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify({ lessonId, stars: s, wpm: w, accuracy: a }),
      });
      setSaved(true);
    } catch {}
  }

  async function fetchWalletsAndShowModal() {
    try {
      const r = await fetch("/api/typing/wallets", { credentials: "include" });
      if (!r.ok) throw new Error("تعذّر تحميل المحافظ");
      const { wallets }: { wallets: WalletInfo[] } = await r.json();

      if (billingRef.current.shown && wallets.length === 1 && pendingResult) {
        const result = pendingResult;
        setPendingResult(null);
        await chargeLesson(result.lessonId, result.stars, result.wpm, result.accuracy, wallets[0].subjectId);
        return;
      }

      const autoSelect = wallets.length === 1 ? wallets[0].subjectId : null;
      setGemModal({ wallets, loading: false, error: null, charging: false, selectedWallet: autoSelect });
      billingRef.current.shown = true;
    } catch (e: any) {
      setGemModal({ wallets: [], loading: false, error: e?.message ?? "خطأ في تحميل المحافظ", charging: false, selectedWallet: null });
    }
  }

  async function chargeLesson(lessonId: number, stars: 1|2|3, wpm: number, accuracy: number, subjectId: string) {
    setGemModal(prev => prev ? { ...prev, charging: true, error: null } : null);
    try {
      const r = await fetch("/api/typing/charge-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify({ lessonId, subjectId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setGemModal(prev => prev ? { ...prev, charging: false, error: d.error ?? "فشل الخصم" } : null);
        return;
      }
      billingRef.current.lastSubjectId = subjectId;
      setGemModal(null);
      setPhase("complete");
      saveProgress(lessonId, stars, wpm, accuracy);
      setPendingResult(null);
    } catch (e: any) {
      setGemModal(prev => prev ? { ...prev, charging: false, error: e?.message ?? "خطأ في الشبكة" } : null);
    }
  }

  async function confirmGemCharge() {
    if (!pendingResult || !gemModal?.selectedWallet) return;
    await chargeLesson(pendingResult.lessonId, pendingResult.stars, pendingResult.wpm, pendingResult.accuracy, gemModal.selectedWallet);
  }

  if (!lesson) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen" style={{ direction: "rtl" }}>
          <div className="text-white/50">الدرس غير موجود</div>
        </div>
      </AppLayout>
    );
  }

  if (!lockChecked) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen" style={{ direction: "rtl" }}>
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const nextLesson = getNextLesson(lesson);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (isMobile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-4" style={{ direction: "rtl" }}>
          <div className="text-5xl mb-1">⌨️</div>
          <h2 className="text-xl font-black text-white">تدريب الكتابة</h2>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            هذه الميزة تعمل على الكمبيوتر فقط — تحتاج إلى لوحة مفاتيح فيزيائية
          </p>
          <Link href="/learn">
            <button className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
              ← العودة للتعلم
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen pt-2 pb-2 px-4" style={{ direction: "rtl" }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/typing-ar">
              <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 rotate-180" />
                العودة إلى الدروس
              </button>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs text-white/30">القسم {lesson.sectionIndex + 1} · الدرس {lesson.lessonIndex + 1}</span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: "#10B981" }}>{wpm}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">ك/دقيقة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: wpm > 0 && accuracy < 90 ? "#EF4444" : "#10B981" }}>{accuracy}%</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">دقة</div>
              </div>
              <div className="flex-1" />
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة
              </button>
            </div>
          </div>

          {(() => {
            if (!lesson || !showTip) return null;
            const si = lesson.sectionIndex;
            if (si > 10) return null;
            const pool = si <= 3 ? EARLY_TIPS : si <= 7 ? MID_TIPS : ADVANCED_TIPS;
            const tip = pool[lesson.id % pool.length];
            return (
              <motion.div
                key={`tip-${lesson.id}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                dir="rtl"
                className="flex items-start gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.18)",
                }}
              >
                <span className="text-lg mt-0.5 flex-shrink-0">{tip.icon}</span>
                <p className="text-xs leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {tip.text}
                </p>
                <button
                  onClick={() => setShowTip(false)}
                  className="flex-shrink-0 text-white/20 hover:text-white/50 transition-colors text-sm leading-none mt-0.5"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </motion.div>
            );
          })()}

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
                ابدأ الكتابة لتنطلق...
              </div>
            )}
            <div
              className="font-mono text-lg leading-relaxed tracking-wider select-none"
              dir="rtl"
              style={{ letterSpacing: "0.08em", minHeight: 60, fontFamily: "Tajawal, Cairo, monospace" }}
            >
              {text.split("").map((char, idx) => {
                const isTyped = idx < typed.length;
                const isCurrent = idx === currentIndex;
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
                      borderBottom: isCurrent && phase !== "complete" ? "2px solid #10B981" : undefined,
                      paddingBottom: isCurrent ? 1 : undefined,
                      background: isCurrent ? "rgba(16,185,129,0.08)" : undefined,
                      borderRadius: isCurrent ? 2 : undefined,
                    }}
                  >
                    {char === " " ? "\u00a0" : char}
                  </span>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {guidanceMsg && (
              <motion.div
                key={guidanceMsg.text}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.28 }}
                dir="rtl"
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                style={{
                  background: guidanceMsg.kind === "warn"
                    ? "rgba(245,158,11,0.07)"
                    : "rgba(16,185,129,0.07)",
                  border: guidanceMsg.kind === "warn"
                    ? "1px solid rgba(245,158,11,0.22)"
                    : "1px solid rgba(16,185,129,0.22)",
                }}
              >
                <span className="text-base flex-shrink-0">{guidanceMsg.icon}</span>
                <p
                  className="text-xs flex-1 font-medium"
                  style={{ color: guidanceMsg.kind === "warn" ? "rgba(245,158,11,0.9)" : "rgba(16,185,129,0.9)" }}
                >
                  {guidanceMsg.text}
                </p>
                <button
                  onClick={() => setGuidanceMsg(null)}
                  className="flex-shrink-0 text-white/15 hover:text-white/40 transition-colors text-sm leading-none"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <VirtualKeyboard nextChar={nextChar} />

          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="text-xs text-white/30">
              {typed.length} / {text.length} حرف
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

      {/* ── Gem Payment Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {gemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", direction: "rtl" }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4"
              style={{ background: "linear-gradient(145deg,#0f1220,#0a0d1a)", border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 60px rgba(16,185,129,0.08), 0 20px 60px rgba(0,0,0,0.5)" }}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                  <Gem className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="font-black text-white text-sm">أتممت الدرس! 🎉</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>اختر المادة التي تخصم منها الجواهر</p>
                </div>
              </div>

              {/* Cost badge */}
              <div className="rounded-xl px-4 py-2.5 flex items-center gap-2.5" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
                <Gem className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} />
                <p className="text-sm font-bold" style={{ color: "#a7f3d0" }}>تكلفة هذا الدرس: <span style={{ color: "#10b981" }}>4 جواهر</span></p>
              </div>

              {/* Wallet list */}
              {gemModal.loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#10b981", borderTopColor: "transparent" }} />
                </div>
              ) : gemModal.wallets.length === 0 ? (
                <div className="rounded-xl px-4 py-3 text-sm text-rose-300 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  لا يوجد رصيد كافٍ في أي مادة. تحتاج على الأقل 4 جواهر.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {gemModal.wallets.length > 1 && <p className="text-xs text-white/40 mb-1">اختر المادة:</p>}
                  {gemModal.wallets.map(w => (
                    <button
                      key={w.subjectId}
                      onClick={() => setGemModal(prev => prev ? { ...prev, selectedWallet: w.subjectId } : null)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all"
                      style={{
                        background: gemModal.selectedWallet === w.subjectId ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${gemModal.selectedWallet === w.subjectId ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      <span className="text-lg">{w.specialtyIcon ?? "📚"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{w.specialtyName ?? w.subjectId}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{w.gemsBalance} جوهرة متبقية</p>
                      </div>
                      {gemModal.selectedWallet === w.subjectId && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#10b981" }} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {gemModal.error && (
                <p className="text-xs text-rose-300 text-center px-2" style={{ direction: "rtl" }}>{gemModal.error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-1">
                <button
                  disabled={!gemModal.selectedWallet || gemModal.charging || gemModal.loading}
                  onClick={confirmGemCharge}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-black disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
                >
                  {gemModal.charging ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> جاري الخصم...</> : "تأكيد وحفظ الدرس"}
                </button>
                <button
                  disabled={gemModal.charging}
                  onClick={reset}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              dir="rtl"
              style={{
                background: "linear-gradient(145deg, rgba(15,18,28,0.98), rgba(10,13,22,0.99))",
                border: "1px solid rgba(16,185,129,0.25)",
                boxShadow: "0 0 60px rgba(16,185,129,0.15), 0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-white mb-2">انتهيت الدرس!</h2>

              <div className="my-5">
                <StarDisplay count={stars} />
                <div className="text-xs text-white/40 mt-2">
                  {stars === 3 ? "ممتاز! أداء رائع!" : stars === 2 ? "جيد عالي!" : "واصل التدريب!"}
                </div>
              </div>

              <div className="flex gap-6 justify-center my-5">
                <div>
                  <div className="text-3xl font-black" style={{ color: "#10B981" }}>{wpm}</div>
                  <div className="text-xs text-white/40">ك/دقيقة</div>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <div className="text-3xl font-black" style={{ color: accuracy >= 90 ? "#10B981" : "#EF4444" }}>{accuracy}%</div>
                  <div className="text-xs text-white/40">دقة</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={reset}
                  className="py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  حاول مجدداً
                </button>
                {nextLesson ? (
                  <button
                    onClick={() => navigate(`/typing-ar/lesson/${nextLesson.id}`)}
                    className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: "#10B981", color: "#fff" }}
                  >
                    الدرس التالي
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                ) : (
                  <Link href="/typing-ar">
                    <button
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={{ background: "#10B981", color: "#fff" }}
                    >
                      انتهيت الكل! 🎊
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntro && lesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(4,6,14,0.90)", backdropFilter: "blur(12px)" }}
            onClick={() => setShowIntro(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 28 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 270, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              className="rounded-3xl w-full overflow-y-auto"
              style={{
                maxWidth: 680,
                maxHeight: "92vh",
                background: "linear-gradient(150deg, rgba(12,16,30,0.99), rgba(8,11,22,0.99))",
                border: "1px solid rgba(16,185,129,0.22)",
                boxShadow: "0 0 100px rgba(16,185,129,0.09), 0 32px 80px rgba(0,0,0,0.70)",
              }}
            >
              <div className="p-6 pb-0">
                <div className="text-center mb-4">
                  <div className="text-2xl mb-1.5">⌨️</div>
                  <h2 className="text-base font-black text-white leading-snug">{lesson.title}</h2>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.32)" }}>
                    اقرأ هذا قبل أن تبدأ — سيوفّر عليك أسابيع من العادات الخاطئة
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-3">
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <img
                    src="/home-row-hands.png"
                    alt="وضع الأصابع على الصف الرئيسي"
                    className="w-full block"
                    style={{ maxHeight: 210, objectFit: "cover", objectPosition: "center 40%" }}
                  />
                  <div className="px-4 py-2.5" style={{ background: "rgba(16,185,129,0.08)" }}>
                    <p className="text-xs font-bold text-center" style={{ color: "#10B981" }}>
                      هكذا تُوضع يداك على الصف الرئيسي — كل إصبع على مفتاحه الثابت
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="text-xs font-bold mb-2.5" style={{ color: "#10B981" }}>🖐️ توزيع الأصابع على المفاتيح العربية</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {([
                      ["🔴","الخنصر",     "ش","ك"],
                      ["🟢","البنصر",     "س","م"],
                      ["🔵","الوسطى",     "ي","ن"],
                      ["🟡","السبّابة",  "ب+ل","ا+ت"],
                    ] as const).map(([dot, name, left, right]) => (
                      <div key={name as string} className="col-span-2 flex items-center gap-2 text-xs">
                        <span className="text-sm">{dot as string}</span>
                        <span className="font-semibold" style={{ color: "rgba(255,255,255,0.65)", minWidth: 56 }}>{name as string}</span>
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>اليسرى: {left as string}</span>
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>اليمنى: {right as string}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 pt-2.5 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.38)" }}>
                    👍 الإبهامان على مفتاح <strong style={{ color: "rgba(255,255,255,0.55)" }}>المسافة (Space)</strong> — يمكنك استخدام أي منهما
                  </div>
                </div>

                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="text-xs font-bold mb-1.5" style={{ color: "#10B981" }}>✨ سرّ مفتاحَي ب و ت</div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
                    ستجد على مفتاح <strong style={{ color: "#10B981" }}>ب</strong> و <strong style={{ color: "#10B981" }}>ت</strong> نتوءاً صغيراً يمكن تحسّسه بالإصبع. ضع سبّابتيك عليهما دون النظر — هذان هما <strong style={{ color: "rgba(255,255,255,0.7)" }}>نقطتا الارتكاز</strong> اللتان تُعيد يديك إليهما دائماً بعد كل ضغطة.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl px-3.5 py-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.13)" }}>
                    <div className="text-sm mb-1">👁️</div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#10B981" }}>عيناك على الشاشة</div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                      لا تنظر إلى لوحة المفاتيح أبداً — حتى لو أخطأت. هذا هو السر الوحيد لأي كاتب سريع.
                    </div>
                  </div>
                  <div className="rounded-2xl px-3.5 py-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.13)" }}>
                    <div className="text-sm mb-1">💺</div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#818CF8" }}>الجلسة الصحيحة</div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                      ظهر مستقيم، مرفقان بزاوية 90°، الشاشة على مستوى العينين. لا تنحنِ أمام الجهاز.
                    </div>
                  </div>
                  <div className="rounded-2xl px-3.5 py-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.13)" }}>
                    <div className="text-sm mb-1">🐢</div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#F87171" }}>البطء أولاً</div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                      ابدأ ببطء شديد مع دقة 100%. السرعة ستأتي وحدها لاحقاً — لا تتعجّل الآن.
                    </div>
                  </div>
                  <div className="rounded-2xl px-3.5 py-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.13)" }}>
                    <div className="text-sm mb-1">🏠</div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: "#A78BFA" }}>عُد دائماً للبيت</div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                      بعد كل ضغطة على مفتاح بعيد، أعد أصابعك فوراً إلى الصف الرئيسي. ب و ت هما البيت.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIntro(false)}
                  className="w-full py-3.5 rounded-2xl font-black text-base transition-opacity hover:opacity-90 mt-1"
                  style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff" }}
                >
                  فهمت — ابدأ الكتابة ←
                </button>
                <p className="text-center text-xs pb-1" style={{ color: "rgba(255,255,255,0.16)" }}>
                  أو اضغط أي مفتاح للبدء
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
