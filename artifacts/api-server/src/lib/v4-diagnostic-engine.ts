/**
 * v4-diagnostic-engine.ts — the "genius weakness hunter".
 *
 * PROBLEM this solves: the teaching model (Gemini 2.0 Flash, locked) is weak.
 * Left on its own it forgets to probe weak points, picks concepts at random,
 * and emits mastery/needs-review tags inconsistently — so the student never
 * feels the "it knows exactly where I'm weak and drills it" experience.
 *
 * SOLUTION: move the intelligence OUT of the weak model and into deterministic
 * server code. Every turn we read the student's live per-concept mastery (+
 * chronic cross-lesson weaknesses) and compute ONE concrete next move:
 *
 *   • which concept to target  — root-cause first: the lowest-index (=earliest
 *     prerequisite) concept that is still untested or weak, so we fix the
 *     foundation before the symptom.
 *   • what to do with it       — PROBE (untested) / DRILL (weak) / REINFORCE
 *     (shaky) / ADVANCE (all mastered).
 *   • how to capture the signal — an explicit, mandatory instruction to emit
 *     [MASTERY]/[NEEDS_REVIEW] for the target after the student answers, so the
 *     tracker stays accurate without trusting the model to remember.
 *
 * The output is a high-salience Arabic directive injected as the FINAL layer of
 * the teaching prompt (freshest = most obeyed). It names the target out loud so
 * the teacher can surface it warmly to the student ("لاحظت إن X محتاج تقوية…"),
 * which is what makes the help feel personal and sharp.
 *
 * No DB writes, no schema changes — it reads signals that v4-protocol-tags.ts
 * and v4-memory.ts already persist.
 */

/** Concept mastery thresholds (kept in sync with the L2/L8 flags + the
 *  task #6 mastery gate of 75). */
const MASTERED_AT = 75;
const WEAK_BELOW = 50;

export type DiagnosticConcept = {
  conceptIndex: number;
  name: string;
  masteryCriterion: string;
  weight: number;
};

export type DiagnosticMistake = {
  mistake: string;
  correction: string;
  treatment: string;
  severity?: string;
};

export type ChronicWeakness = {
  lessonCode: string | null;
  lessonName: string | null;
  conceptIndex: number;
  errorCount: number;
};

export type DiagnosticDirectiveInput = {
  concepts: DiagnosticConcept[];
  /** Only concepts the student has an actual stored score for are present —
   *  absence = "never tested" (treated very differently from a real 0). */
  masteryByConcept: Map<number, number>;
  mistakes: DiagnosticMistake[];
  chronicWeaknesses?: ChronicWeakness[];
  currentLessonCode: string;
};

type ConceptState = "untested" | "weak" | "shaky" | "mastered";

function classify(
  conceptIndex: number,
  mastery: Map<number, number>,
): { state: ConceptState; score: number | null } {
  if (!mastery.has(conceptIndex)) return { state: "untested", score: null };
  const s = mastery.get(conceptIndex) ?? 0;
  if (s < WEAK_BELOW) return { state: "weak", score: s };
  if (s < MASTERED_AT) return { state: "shaky", score: s };
  return { state: "mastered", score: s };
}

const STATE_GLYPH: Record<ConceptState, string> = {
  untested: "❔ لم يُختبر",
  weak: "⛔ ضعف واضح",
  shaky: "⚠️ يحتاج تدعيم",
  mastered: "✅ متقن",
};

/**
 * Pick the single most severe / highest-impact common mistake to pre-empt
 * while drilling. The schema doesn't link a mistake to a concept, so we
 * surface the most dangerous one (critical > major > minor) as a generic
 * trap to watch for. Returns null when there are no recorded mistakes.
 */
function pickTopMistake(mistakes: DiagnosticMistake[]): DiagnosticMistake | null {
  if (!mistakes.length) return null;
  const rank = (m: DiagnosticMistake): number =>
    m.severity === "critical" ? 0 : m.severity === "minor" ? 2 : 1;
  return [...mistakes].sort((a, b) => rank(a) - rank(b))[0];
}

/**
 * Build the deterministic per-turn diagnostic directive. Returns "" only when
 * there are no indexed concepts at all (skeletal lesson) — in every other case
 * it returns a concrete plan for THIS turn.
 */
export function buildDiagnosticDirective(input: DiagnosticDirectiveInput): string {
  const concepts = [...input.concepts].sort((a, b) => a.conceptIndex - b.conceptIndex);
  if (concepts.length === 0) return "";

  const withState = concepts.map((c) => ({
    ...c,
    ...classify(c.conceptIndex, input.masteryByConcept),
  }));

  // Live concept map line — gives the model an at-a-glance picture so its
  // narration to the student is grounded ("أتقنت ٢ من ٣").
  const mapLine = withState
    .map((c) => `${c.conceptIndex}:${c.score == null ? "—" : c.score}`)
    .join(" · ");
  const masteredCount = withState.filter((c) => c.state === "mastered").length;

  // Root-cause-first target selection: earliest (lowest-index) concept that
  // is untested or weak; else earliest shaky; else null (all mastered).
  const target =
    withState.find((c) => c.state === "untested" || c.state === "weak") ??
    withState.find((c) => c.state === "shaky") ??
    null;

  const lines: string[] = [
    "## 14. موجّه التشخيص الذكي — خطة هذا الدور (إلزامية، نفّذها بدقّة)",
    "هذه خطة محسوبة آلياً من سجلّ إتقان الطالب الفعلي. التزم بها هذا الدور — هي ما يجعل الطالب يشعر أنك تعرف نقاط ضعفه بالضبط وتعالجها.",
    `- خريطة الإتقان الحالية (مفهوم:سكور): ${mapLine}  →  متقن ${masteredCount}/${withState.length}`,
  ];

  if (!target) {
    // Everything ≥ 75 — drive toward the final check + mastery, don't re-teach.
    lines.push(
      "- **الحالة: كل المفاهيم متقنة.** لا تُعد شرح ما أُتقن. انتقل إلى **سؤال التحقق النهائي** (القسم ٢) كتحدٍّ تطبيقي واحد متشعّب.",
      "- إذا أجاب صحيحاً، أصدر [MASTERY] لأي مفهوم لم يصل ١٠٠ ثم [LESSON_MASTERED]. إذا تعثّر، اهبط فوراً للمفهوم الذي ظهر فيه التعثّر ودرّبه.",
    );
  } else {
    const glyph = STATE_GLYPH[target.state];
    const scoreTxt = target.score == null ? "لم يُختبر بعد" : `${target.score}/100`;
    lines.push(
      `- **هدف هذا الدور: المفهوم ${target.conceptIndex} «${target.name}»** [${glyph} — ${scoreTxt}].`,
      `  معيار إتقانه: ${target.masteryCriterion}`,
    );

    if (target.state === "untested") {
      lines.push(
        "- **الحركة المطلوبة: تشخيص (PROBE).** اطرح سؤالاً واحداً دقيقاً يكشف هل يفهم هذا المفهوم فعلاً — سؤال «لماذا/ماذا لو» لا استرجاع تعريف. لا تشرح قبل أن يحاول.",
      );
    } else if (target.state === "weak") {
      const top = pickTopMistake(input.mistakes);
      lines.push(
        "- **الحركة المطلوبة: علاج جذري (DRILL).** الطالب ضعيف هنا وهذا أبكر مفهوم غير متقن (أساس لِما بعده). صحّح الفهم بمثال مضادّ صغير محسوس، ثم اطرح **سؤال ممارسة جديداً** يستهدف نفس الزلّة بالضبط — لا تكرّر نفس السؤال السابق.",
      );
      if (top) {
        lines.push(
          `  ⚠️ الفخّ الأكثر خطورة المتوقّع: «${top.mistake}» — الصواب: ${top.correction}؛ العلاج: ${top.treatment}. استبق هذا الفخّ في تدريبك.`,
        );
      }
    } else {
      lines.push(
        "- **الحركة المطلوبة: ترسيخ (REINFORCE).** الطالب قريب من الإتقان. اطرح **تطبيقاً ألطف بدرجة** (سيناريو أو «ماذا لو») يرفعه فوق ٧٥ بدل إعادة الأساسيات.",
      );
    }

    lines.push(
      `- **التقاط الإشارة (إلزامي):** بعد ردّ الطالب على سؤالك، أصدر في نهاية رسالتك حكماً للمفهوم ${target.conceptIndex}: إمّا \`[MASTERY: concept=${target.conceptIndex} value=<0..100>]\` (قدّر فهمه بصدق) أو \`[NEEDS_REVIEW: concept=${target.conceptIndex}]\` إن أخطأ أو تردّد. لا تترك الدور بلا حكم على الهدف.`,
      "- **اجعل الذكاء مرئياً (بلطف):** اربط السؤال بنقطة الضعف بإشارة دافئة طبيعية مرّة واحدة (مثل «خلّنا نثبّت هذي النقطة بالذات…») — دون لهجة آلية ولا كشف أنّ هناك «نظام» يحسب لك.",
    );
  }

  // Spaced cross-lesson callback: weave a quick check on a chronic weakness
  // from an EARLIER lesson when it fits naturally — this is what makes the
  // teacher feel like it never forgets where the student struggles.
  const chronic = (input.chronicWeaknesses ?? [])
    .filter((w) => w.errorCount >= 2 && w.lessonCode && w.lessonCode !== input.currentLessonCode)
    .slice(0, 1);
  if (chronic.length) {
    const w = chronic[0];
    const where = w.lessonName ? `${w.lessonCode} — ${w.lessonName}` : w.lessonCode;
    lines.push(
      `- **استدعاء مُتباعد (عند أول مناسبة طبيعية فقط):** للطالب ضعف متكرّر سابق في ${where} (مفهوم ${w.conceptIndex}، تعثّر ×${w.errorCount}). اربطه بالدرس الحالي بسؤال خاطف إن أمكن، دون تشتيت عن هدف هذا الدور.`,
    );
  }

  return lines.join("\n");
}
