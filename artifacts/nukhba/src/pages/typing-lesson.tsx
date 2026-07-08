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
  allLessons,
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

const EARLY_TIPS = [
  { icon: "🖐", text: "ضع أصابعك على الصف الرئيسي — A S D F لليد اليسرى، J K L ; لليمنى — هذا موطنك" },
  { icon: "👁", text: "انظر دائماً إلى الشاشة وليس للوحة المفاتيح — هذا سر المحترفين" },
  { icon: "🐢", text: "ابدأ ببطء — الدقة أهم من السرعة الآن، والسرعة ستأتي لوحدها لاحقاً" },
  { icon: "📍", text: "مفتاح F له نتوء صغير تحسّه بإصبعك — وكذلك J — دعهما يكونا مرساتك دون أن تنظر" },
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

const KEY_HAND_MAP: Record<string, "left" | "right" | "both"> = {
  "`": "left", "~": "left", "1": "left", "!": "left",
  "2": "left", "@": "left", "3": "left", "#": "left",
  "4": "left", "$": "left", "5": "left", "%": "left",
  "q": "left", "Q": "left", "w": "left", "W": "left",
  "e": "left", "E": "left", "r": "left", "R": "left",
  "t": "left", "T": "left",
  "a": "left", "A": "left", "s": "left", "S": "left",
  "d": "left", "D": "left", "f": "left", "F": "left",
  "g": "left", "G": "left",
  "z": "left", "Z": "left", "x": "left", "X": "left",
  "c": "left", "C": "left", "v": "left", "V": "left",
  "b": "left", "B": "left",
  "6": "right", "^": "right", "7": "right", "&": "right",
  "8": "right", "*": "right", "9": "right", "(": "right",
  "0": "right", ")": "right", "-": "right", "_": "right",
  "=": "right", "+": "right",
  "y": "right", "Y": "right", "u": "right", "U": "right",
  "i": "right", "I": "right", "o": "right", "O": "right",
  "p": "right", "P": "right",
  "[": "right", "{": "right", "]": "right", "}": "right",
  "\\": "right", "|": "right",
  "h": "right", "H": "right", "j": "right", "J": "right",
  "k": "right", "K": "right", "l": "right", "L": "right",
  ";": "right", ":": "right", "'": "right", '"': "right",
  "n": "right", "N": "right", "m": "right", "M": "right",
  ",": "right", "<": "right", ".": "right", ">": "right",
  "/": "right", "?": "right",
  " ": "both",
};

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
  { color: "yellow", cx: 71,  tipY: 42, baseY: 154, hw: 13   },
  { color: "blue",   cx: 105, tipY: 24, baseY: 154, hw: 14.5 },
  { color: "green",  cx: 138, tipY: 40, baseY: 154, hw: 13   },
  { color: "red",    cx: 170, tipY: 65, baseY: 154, hw: 11.5 },
];

const L_THUMB: FingerDef & { pivotX: number; pivotY: number; angle: number } = {
  color: "gray", cx: 163, tipY: 168, baseY: 232, hw: 13,
  pivotX: 163, pivotY: 232, angle: 28,
};
const R_THUMB: FingerDef & { pivotX: number; pivotY: number; angle: number } = {
  color: "gray", cx: 57, tipY: 168, baseY: 232, hw: 13,
  pivotX: 57, pivotY: 232, angle: -28,
};

function HandGroup({
  side,
  fingerColor,
  isActive,
  shiftPinky,
}: {
  side: "left" | "right";
  fingerColor: FingerColor | null;
  isActive: boolean;
  shiftPinky: boolean;
}) {
  const fingerDefs = side === "left" ? L_FINGER_DEFS : R_FINGER_DEFS;
  const thumb      = side === "left" ? L_THUMB       : R_THUMB;
  const palmX      = side === "left" ? 26 : 34;

  const palmFill      = isActive ? "rgba(50,62,100,0.78)" : "rgba(18,24,48,0.28)";
  const palmStroke    = isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)";
  const inactiveFill  = isActive ? "rgba(52,65,105,0.85)" : "rgba(16,22,44,0.25)";
  const inactiveStroke= isActive ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)";

  const grayFc  = FINGER_COLORS["gray"];
  const thumbOn = isActive && fingerColor === "gray";
  const thumbTf = `translate(${thumb.pivotX},${thumb.pivotY}) rotate(${thumb.angle}) translate(-${thumb.pivotX},-${thumb.pivotY})`;

  return (
    <>
      <rect x={palmX} y={148} width={158} height={90} rx={20}
        fill={palmFill} stroke={palmStroke} strokeWidth={1.5}
      />
      {fingerDefs.map((f, i) => {
        const lit = (isActive && fingerColor === f.color) || (shiftPinky && f.color === "red");
        const fc  = FINGER_COLORS[f.color];
        return (
          <path
            key={i}
            d={fingerPill(f.cx, f.tipY, f.baseY, f.hw)}
            fill={lit ? fc.bg : inactiveFill}
            stroke={lit ? "rgba(255,255,255,0.35)" : inactiveStroke}
            strokeWidth={lit ? 2 : 1.2}
            strokeLinejoin="round"
            style={{ filter: lit ? `drop-shadow(0 0 12px ${fc.glow})` : undefined }}
          />
        );
      })}
      <g transform={thumbTf}>
        <path
          d={fingerPill(thumb.cx, thumb.tipY, thumb.baseY, thumb.hw)}
          fill={thumbOn ? grayFc.bg : inactiveFill}
          stroke={thumbOn ? "rgba(255,255,255,0.35)" : inactiveStroke}
          strokeWidth={thumbOn ? 2 : 1.2}
          strokeLinejoin="round"
          style={{ filter: thumbOn ? `drop-shadow(0 0 12px ${grayFc.glow})` : undefined }}
        />
      </g>
      <text x={110} y={245} textAnchor="middle" fontSize={11}
        fill="rgba(255,255,255,0.30)"
        fontFamily="system-ui,sans-serif"
      >
        {side === "left" ? "اليسرى" : "اليمنى"}
      </text>
    </>
  );
}

function HomeRowDiagram() {
  const SKIN_LT = "#DBA882";
  const SKIN    = "#C8916A";
  const SKIN_DK = "#9F6A42";
  const NAIL    = "#E0C4B0";
  const NAIL_DK = "#BFA090";

  const KEY_W  = 38;
  const KEY_H  = 36;
  const KEY_Y  = 136;
  const KEY_R  = 6;
  const PALM_Y = 6;
  const PALM_H = 28;
  const BASE_Y = PALM_Y + PALM_H;

  const L_CX  = [72,  114, 156, 198];
  const R_CX  = [346, 388, 430, 472];
  const L_LBL = ["A","S","D","F"];
  const R_LBL = ["J","K","L",";"];

  const L_DIM: [number,number][] = [[18,13],[21,15],[23,17],[21,15]];
  const R_DIM: [number,number][] = [[21,15],[23,17],[21,15],[18,13]];
  const L_FC: FingerColor[] = ["red","green","blue","yellow"];
  const R_FC: FingerColor[] = ["yellow","blue","green","red"];

  const KEY_STROKE: Record<FingerColor, string> = {
    red:    "rgba(239,68,68,0.50)",
    green:  "rgba(34,197,94,0.50)",
    blue:   "rgba(59,130,246,0.50)",
    yellow: "rgba(234,179,8,0.50)",
    gray:   "rgba(107,114,128,0.50)",
  };

  const mkFinger = (cx: number, bw: number, tw: number): string => {
    const tipY = KEY_Y - tw;
    const midY = BASE_Y + (tipY - BASE_Y) * 0.46;
    return [
      `M ${cx-bw} ${BASE_Y}`,
      `C ${cx-bw} ${midY} ${cx-tw} ${tipY} ${cx-tw} ${tipY}`,
      `A ${tw} ${tw} 0 0 1 ${cx+tw} ${tipY}`,
      `C ${cx+tw} ${tipY} ${cx+bw} ${midY} ${cx+bw} ${BASE_Y}`,
      "Z",
    ].join(" ");
  };

  const mkNail = (cx: number, tw: number): string => {
    const tipY = KEY_Y - tw;
    const nw = tw * 1.10;
    const nh = tw * 0.52;
    const y0 = tipY + 3;
    const r  = 2.5;
    return [
      `M ${cx-nw/2+r} ${y0}`,
      `Q ${cx-nw/2} ${y0} ${cx-nw/2} ${y0+r}`,
      `L ${cx-nw/2} ${y0+nh}`,
      `Q ${cx-nw/2} ${y0+nh+1} ${cx} ${y0+nh+1}`,
      `Q ${cx+nw/2} ${y0+nh+1} ${cx+nw/2} ${y0+nh}`,
      `L ${cx+nw/2} ${y0+r}`,
      `Q ${cx+nw/2} ${y0} ${cx+nw/2-r} ${y0}`,
      "Z",
    ].join(" ");
  };

  const SVG_W = 544;
  const SVG_H = KEY_Y + KEY_H + 20;

  const renderHand = (
    cxArr: number[],
    dims: [number,number][],
    fcs: FingerColor[],
    lbls: string[],
    anchorIdx: number,
    palmW: number,
  ) => {
    const palmX = cxArr[0] - 22;
    return (
      <>
        <rect x={palmX} y={PALM_Y} width={palmW} height={PALM_H} rx={13}
          fill="url(#hrd-palm)" stroke={SKIN_DK} strokeWidth={1.2} />
        {cxArr.map((cx, i) => {
          const [bw, tw] = dims[i];
          const fc       = FINGER_COLORS[fcs[i]];
          const tipY     = KEY_Y - tw;
          const totH     = tipY - BASE_Y;
          const k1y = BASE_Y + totH * 0.27;
          const k2y = BASE_Y + totH * 0.54;
          const k1w = (bw - (bw-tw)*0.27) * 0.78;
          const k2w = (bw - (bw-tw)*0.54) * 0.86;
          return (
            <g key={`f${i}`}>
              <path d={mkFinger(cx, bw, tw)}
                fill="url(#hrd-skin)" stroke={fc.bg} strokeWidth={1.6}
                strokeLinejoin="round" />
              <line x1={cx-k1w} y1={k1y} x2={cx+k1w} y2={k1y}
                stroke={SKIN_DK} strokeWidth={0.9} strokeLinecap="round" opacity={0.65} />
              <line x1={cx-k2w} y1={k2y} x2={cx+k2w} y2={k2y}
                stroke={SKIN_DK} strokeWidth={0.9} strokeLinecap="round" opacity={0.65} />
              <path d={mkNail(cx, tw)} fill={NAIL} stroke={NAIL_DK} strokeWidth={0.8} />
            </g>
          );
        })}
        {cxArr.map((cx, i) => {
          const isAnc = i === anchorIdx;
          const fc    = FINGER_COLORS[fcs[i]];
          return (
            <g key={`k${i}`}>
              <rect x={cx-KEY_W/2} y={KEY_Y} width={KEY_W} height={KEY_H} rx={KEY_R}
                fill={isAnc ? "rgba(245,158,11,0.28)" : "rgba(28,40,70,0.92)"}
                stroke={isAnc ? "rgba(245,158,11,0.82)" : KEY_STROKE[fcs[i]]}
                strokeWidth={isAnc ? 2 : 1.2} />
              {isAnc && (
                <rect x={cx-5} y={KEY_Y+KEY_H-8} width={10} height={4} rx={2}
                  fill="#F59E0B" />
              )}
              <text x={cx} y={KEY_Y+KEY_H/2+5.5} textAnchor="middle"
                fontSize={14} fontWeight="bold"
                fill={isAnc ? "#F59E0B" : fc.bg}
                fontFamily="monospace">{lbls[i]}</text>
            </g>
          );
        })}
      </>
    );
  };

  const L_PALM_W = L_CX[3] - L_CX[0] + 44;
  const R_PALM_W = R_CX[3] - R_CX[0] + 44;
  const L_SURF_X = L_CX[0] - KEY_W/2 - 6;
  const L_SURF_W = L_CX[3] - L_CX[0] + KEY_W + 12;
  const R_SURF_X = R_CX[0] - KEY_W/2 - 6;
  const R_SURF_W = R_CX[3] - R_CX[0] + KEY_W + 12;
  const MID_X    = (L_CX[3] + R_CX[0]) / 2;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      <defs>
        <linearGradient id="hrd-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={SKIN_LT} />
          <stop offset="55%"  stopColor={SKIN}    />
          <stop offset="100%" stopColor={SKIN_DK} />
        </linearGradient>
        <linearGradient id="hrd-palm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={SKIN}    />
          <stop offset="100%" stopColor={SKIN_DK} />
        </linearGradient>
      </defs>

      <rect x={L_SURF_X} y={KEY_Y-5} width={L_SURF_W} height={KEY_H+11} rx={10}
        fill="rgba(16,24,48,0.92)" />
      <rect x={R_SURF_X} y={KEY_Y-5} width={R_SURF_W} height={KEY_H+11} rx={10}
        fill="rgba(16,24,48,0.92)" />

      {renderHand(L_CX, L_DIM, L_FC, L_LBL, 3, L_PALM_W)}
      {renderHand(R_CX, R_DIM, R_FC, R_LBL, 0, R_PALM_W)}

      <text x={(L_CX[0]+L_CX[3])/2} y={SVG_H-4} textAnchor="middle"
        fontSize={9.5} fill="rgba(255,255,255,0.28)" fontFamily="system-ui,sans-serif">
        اليد اليسرى
      </text>
      <text x={(R_CX[0]+R_CX[3])/2} y={SVG_H-4} textAnchor="middle"
        fontSize={9.5} fill="rgba(255,255,255,0.28)" fontFamily="system-ui,sans-serif">
        اليد اليمنى
      </text>
      <text x={MID_X} y={KEY_Y+KEY_H/2+5.5} textAnchor="middle"
        fontSize={8.5} fill="rgba(255,255,255,0.15)" fontFamily="system-ui,sans-serif">
        ← فراغ →
      </text>
    </svg>
  );
}

function VirtualKeyboard({ nextChar }: { nextChar: string }) {
  const activeKey  = KEY_MAP.get(nextChar.toLowerCase());
  const needsShift = activeKey != null && (
    (nextChar.length === 1 && nextChar >= "A" && nextChar <= "Z") ||
    (activeKey.shiftLabel != null && activeKey.shiftLabel === nextChar)
  );

  const handSide: "left" | "right" | "both" | null = nextChar ? (KEY_HAND_MAP[nextChar] ?? null) : null;
  const fingerColor: FingerColor | null = nextChar
    ? (keyFingerMap[nextChar] ?? keyFingerMap[nextChar.toLowerCase()] ?? null)
    : null;
  const leftActive  = handSide === "left"  || handSide === "both";
  const rightActive = handSide === "right" || handSide === "both";
  const isIdle      = !nextChar || !handSide;

  const SCALE  = 0.636;
  const HAND_Y = 59;

  return (
    <div className="w-full overflow-x-auto select-none">
      <svg
        viewBox="0 0 996 220"
        className="w-full block"
        style={{ minWidth: 0 }}
      >
        <g
          transform={`translate(0,${HAND_Y}) scale(${SCALE})`}
          opacity={isIdle ? 0.5 : leftActive ? 1 : 0.2}
        >
          <HandGroup
            side="left"
            fingerColor={leftActive ? fingerColor : null}
            isActive={true}
            shiftPinky={needsShift && handSide === "right"}
          />
        </g>

        <g transform="translate(140, 0)">
          {KEYBOARD_KEYS.map((k) => {
            const isActive      = activeKey === k;
            const isShiftActive = (k.key === "LShift" || k.key === "RShift") && needsShift;
            const finger        = k.finger;
            const colors        = FINGER_COLORS[finger];
            const highlighted   = isActive || isShiftActive;

            return (
              <g key={k.key} style={{ filter: highlighted ? `drop-shadow(0 0 6px ${colors.glow})` : undefined }}>
                <rect
                  x={k.x + 1} y={k.y + 1} width={k.w - 2} height={k.h - 2} rx={5}
                  fill={highlighted ? colors.bg : "rgba(30,36,56,0.9)"}
                  stroke={highlighted ? colors.bg : "rgba(255,255,255,0.08)"}
                  strokeWidth={highlighted ? 1.5 : 1}
                />
                <text
                  x={k.x + k.w / 2} y={k.y + k.h / 2 + 5}
                  textAnchor="middle"
                  fontSize={k.w >= 68 ? 9 : 12}
                  fill={highlighted ? colors.text : "rgba(255,255,255,0.7)"}
                  fontFamily="monospace"
                  fontWeight={highlighted ? "700" : "400"}
                >
                  {k.label}
                </text>
                {k.shiftLabel && k.w < 68 && (
                  <text
                    x={k.x + k.w - 5} y={k.y + 12}
                    textAnchor="end" fontSize={8}
                    fill="rgba(255,255,255,0.3)" fontFamily="monospace"
                  >
                    {k.shiftLabel}
                  </text>
                )}
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
            shiftPinky={needsShift && handSide === "left"}
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

type Phase = "idle" | "active" | "complete";

export default function TypingLesson() {
  const [, params] = useRoute("/typing/lesson/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id ?? "1", 10);
  const lesson = getLessonById(id);

  const [lockChecked, setLockChecked] = useState(false);

  useEffect(() => {
    if (id === 1) { setLockChecked(true); return; }
    (async () => {
      try {
        const r = await fetch("/api/typing/progress", { credentials: "include" });
        if (r.ok) {
          const data: Array<{ lessonId: number; stars: number }> = await r.json();
          const completedIds = new Set(data.filter((d) => d.stars >= 1).map((d) => d.lessonId));
          const ordered = allLessons;
          let unlockedUpTo = ordered[0]?.id ?? 1;
          for (const l of ordered) {
            if (completedIds.has(l.id)) { unlockedUpTo = l.id + 1; } else { break; }
          }
          if (id > unlockedUpTo) { navigate("/typing"); return; }
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
      if (phase === "complete") return;
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
        setPhase("complete");
        playLessonComplete();
        saveProgress(id, finalStars, finalWpm, finalAccuracy);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, typed, errors, text, currentIndex, startTime, id, showIntro]);

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
          <div className="text-white/50">الدرس غير موجود</div>
        </div>
      </AppLayout>
    );
  }

  if (!lockChecked) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen" style={{ direction: "ltr" }}>
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const nextLesson = getNextLesson(lesson);

  return (
    <AppLayout>
      <div className="min-h-screen pt-2 pb-2 px-4" style={{ direction: "ltr" }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/typing">
              <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
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
                <div className="text-2xl font-black" style={{ color: "#F59E0B" }}>{wpm}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">كلمة/د</div>
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
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.18)",
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
              <h2 className="text-2xl font-black text-white mb-2">انتهيت الدرس!</h2>

              <div className="my-5">
                <StarDisplay count={stars} />
                <div className="text-xs text-white/40 mt-2">
                  {stars === 3 ? "ممتاز! أداء رائع!" : stars === 2 ? "جود عالي!" : "واصل التدريب!"}
                </div>
              </div>

              <div className="flex gap-6 justify-center my-5">
                <div>
                  <div className="text-3xl font-black" style={{ color: "#F59E0B" }}>{wpm}</div>
                  <div className="text-xs text-white/40">كلمة/د</div>
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
                    onClick={() => navigate(`/typing/lesson/${nextLesson.id}`)}
                    className="py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: "#F59E0B", color: "#000" }}
                  >
                    الدرس التالي
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link href="/typing">
                    <button
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={{ background: "#10B981", color: "#fff" }}
                    >
                      انتهيت الكل!
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
              className="rounded-3xl p-7 max-w-md w-full"
              style={{
                background: "linear-gradient(150deg, rgba(14,18,32,0.99), rgba(9,12,24,0.99))",
                border: "1px solid rgba(245,158,11,0.20)",
                boxShadow: "0 0 80px rgba(245,158,11,0.08), 0 28px 80px rgba(0,0,0,0.65)",
              }}
            >
              <div className="text-center mb-5">
                <div className="text-3xl mb-2">⌨️</div>
                <h2 className="text-lg font-black text-white leading-snug">{lesson.title}</h2>
                <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  قبل أن تبدأ — تأكد من هذه النقاط الثلاث
                </p>
              </div>

              <div className="space-y-2.5 mb-6">
                <div
                  className="flex items-start gap-3.5 rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.16)" }}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">👁️</span>
                  <div>
                    <div className="text-sm font-bold mb-0.5" style={{ color: "#F59E0B" }}>
                      عيناك على الشاشة
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
                      انظر دائماً إلى النص فقط — لا تنظر إلى لوحة المفاتيح أبداً. هذا هو سر الكتابة السريعة.
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.16)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🖐️</span>
                    <span className="text-sm font-bold" style={{ color: "#10B981" }}>أصابعك على الصف الرئيسي</span>
                  </div>
                  <HomeRowDiagram />
                  <div className="text-xs mt-2 text-center" style={{ color: "rgba(255,255,255,0.38)" }}>
                    كل إصبع له لون — <span style={{ color: "#F59E0B" }}>F</span> و <span style={{ color: "#F59E0B" }}>J</span> بهما نتوء تحسّه دون النظر
                  </div>
                </div>

                <div
                  className="flex items-start gap-3.5 rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.16)" }}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">💺</span>
                  <div>
                    <div className="text-sm font-bold mb-0.5" style={{ color: "#818CF8" }}>
                      الوضعية الصحيحة
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.52)" }}>
                      ظهر مستقيم، رأس مرفوع، مرفقان بزاوية 90° على الطاولة — تقلل التعب وتزيد السرعة.
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIntro(false)}
                className="w-full py-3.5 rounded-2xl font-black text-base transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#000" }}
              >
                ابدأ الكتابة ←
              </button>
              <p className="text-center text-xs mt-2.5" style={{ color: "rgba(255,255,255,0.18)" }}>
                أو اضغط أي مفتاح للبدء
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
