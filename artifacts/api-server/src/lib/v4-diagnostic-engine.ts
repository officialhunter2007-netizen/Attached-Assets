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
  /** Concepts the student has already done a graded hands-on ("التطبيق
   *  العملي") attempt for. Drives the disjoint APPLY decision so each concept
   *  gets exactly one hands-on offer, then the engine moves on. */
  appliedByConcept?: Set<number>;
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

export type DiagnosticMove = "probe" | "drill" | "apply" | "reinforce" | "advance";

export type DiagnosticTarget = {
  conceptIndex: number;
  name: string;
  masteryCriterion: string;
  state: ConceptState;
  score: number | null;
};

export type DiagnosticDecision = {
  move: DiagnosticMove;
  /** null only when move === "advance" (all concepts mastered + applied). */
  target: DiagnosticTarget | null;
};

/**
 * The single source of truth for "what should happen with which concept THIS
 * turn". A disjoint, strict-priority decision (exactly one move per turn):
 *
 *   1. earliest untested|weak  → PROBE / DRILL   (fix the foundation first)
 *   2. else earliest grasped (≥50) but NOT yet applied → APPLY (hands-on)
 *   3. else earliest shaky that IS applied → REINFORCE (nudge it over 75)
 *   4. else (all mastered + applied) → ADVANCE
 *
 * Pure + side-effect-free so it can be reused verbatim by (a) the prompt
 * builder to author the directive and (b) v4_teach.ts to recompute the
 * hands-on offer over POST-effects mastery for the `done` SSE event.
 */
export function decideDiagnosticMove(input: {
  concepts: DiagnosticConcept[];
  masteryByConcept: Map<number, number>;
  appliedByConcept?: Set<number>;
}): DiagnosticDecision {
  const applied = input.appliedByConcept ?? new Set<number>();
  const withState = [...input.concepts]
    .sort((a, b) => a.conceptIndex - b.conceptIndex)
    .map((c) => ({ concept: c, ...classify(c.conceptIndex, input.masteryByConcept) }));

  const mk = (x: (typeof withState)[number]): DiagnosticTarget => ({
    conceptIndex: x.concept.conceptIndex,
    name: x.concept.name,
    masteryCriterion: x.concept.masteryCriterion,
    state: x.state,
    score: x.score,
  });

  // 1. earliest untested|weak → PROBE/DRILL (a real gap blocks everything).
  const gap = withState.find((c) => c.state === "untested" || c.state === "weak");
  if (gap) return { move: gap.state === "untested" ? "probe" : "drill", target: mk(gap) };

  // 2. else earliest grasped (shaky|mastered) but not yet hands-on applied → APPLY.
  const toApply = withState.find(
    (c) => (c.state === "shaky" || c.state === "mastered") && !applied.has(c.concept.conceptIndex),
  );
  if (toApply) return { move: "apply", target: mk(toApply) };

  // 3. else earliest shaky (already applied) → REINFORCE over the 75 line.
  const toReinforce = withState.find((c) => c.state === "shaky");
  if (toReinforce) return { move: "reinforce", target: mk(toReinforce) };

  // 4. else everything is mastered AND applied → advance.
  return { move: "advance", target: null };
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

  // Disjoint per-turn decision (the single source of truth — also used by
  // v4_teach.ts post-effects to fire the hands-on offer).
  const decision = decideDiagnosticMove({
    concepts: input.concepts,
    masteryByConcept: input.masteryByConcept,
    appliedByConcept: input.appliedByConcept,
  });
  const target = decision.target;

  const lines: string[] = [
    "## 14. موجّه التشخيص الذكي — خطة هذا الدور (إلزامية، نفّذها بدقّة)",
    "هذه خطة محسوبة آلياً من سجلّ إتقان الطالب الفعلي. التزم بها هذا الدور — هي ما يجعل الطالب يشعر أنك تعرف نقاط ضعفه بالضبط وتعالجها.",
    `- خريطة الإتقان الحالية (مفهوم:سكور): ${mapLine}  →  متقن ${masteredCount}/${withState.length}`,
  ];

  if (decision.move === "advance" || !target) {
    // Everything ≥ 75 AND already applied — drive toward final check + mastery.
    lines.push(
      "- **الحالة: كل المفاهيم متقنة ومُطبَّقة عملياً.** لا تُعد شرح ما أُتقن. انتقل إلى **سؤال التحقق النهائي** (القسم ٢) كتحدٍّ تطبيقي واحد متشعّب.",
      "- إذا أجاب صحيحاً، أصدر [MASTERY] لأي مفهوم لم يصل ١٠٠ ثم [LESSON_MASTERED]. إذا تعثّر، اهبط فوراً للمفهوم الذي ظهر فيه التعثّر ودرّبه.",
    );
  } else {
    const glyph = STATE_GLYPH[target.state];
    const scoreTxt = target.score == null ? "لم يُختبر بعد" : `${target.score}/100`;
    lines.push(
      `- **هدف هذا الدور: المفهوم ${target.conceptIndex} «${target.name}»** [${glyph} — ${scoreTxt}].`,
      `  معيار إتقانه: ${target.masteryCriterion}`,
    );

    if (decision.move === "probe") {
      lines.push(
        "- **الحركة المطلوبة: تشخيص (PROBE).** اطرح سؤالاً واحداً دقيقاً يكشف هل يفهم هذا المفهوم فعلاً — سؤال «لماذا/ماذا لو» لا استرجاع تعريف. لا تشرح قبل أن يحاول.",
      );
    } else if (decision.move === "drill") {
      const top = pickTopMistake(input.mistakes);
      lines.push(
        "- **الحركة المطلوبة: علاج جذري (DRILL).** الطالب ضعيف هنا وهذا أبكر مفهوم غير متقن (أساس لِما بعده). صحّح الفهم بمثال مضادّ صغير محسوس، ثم اطرح **سؤال ممارسة جديداً** يستهدف نفس الزلّة بالضبط — لا تكرّر نفس السؤال السابق.",
      );
      if (top) {
        lines.push(
          `  ⚠️ الفخّ الأكثر خطورة المتوقّع: «${top.mistake}» — الصواب: ${top.correction}؛ العلاج: ${top.treatment}. استبق هذا الفخّ في تدريبك.`,
        );
      }
    } else if (decision.move === "apply") {
      lines.push(
        `- **الحركة المطلوبة: تطبيق عملي (APPLY).** الطالب استوعب هذا المفهوم نظرياً، والآن وقت أن يطبّقه بيده. مهّد بجملة واحدة دافئة تُحمّسه للانتقال إلى تطبيق عملي حقيقي على «${target.name}» (مثل: «ممتاز، خلّنا نطبّق اللي فهمته على أرض الواقع الحين»). **لا تطرح أنت سؤالاً ولا تمريناً منفصلاً** — بطاقة «التطبيق العملي» ستظهر للطالب تلقائياً وفيها المهمة كاملة.`,
        `- **لا تُصدر [MASTERY] ولا [NEEDS_REVIEW] للمفهوم ${target.conceptIndex} هذا الدور** — تقييم التطبيق العملي يُحتسب آلياً ويحدّث الإتقان بنفسه. اكتفِ بالتمهيد الدافئ القصير ثم سلّم للبطاقة.`,
      );
    } else {
      lines.push(
        "- **الحركة المطلوبة: ترسيخ (REINFORCE).** الطالب قريب من الإتقان وقد طبّق المفهوم عملياً. اطرح **تطبيقاً ألطف بدرجة** (سيناريو أو «ماذا لو») يرفعه فوق ٧٥ بدل إعادة الأساسيات.",
      );
    }

    // Signal capture applies to every move EXCEPT apply — the hands-on card
    // grades + writes mastery server-side, so a model-emitted tag would
    // double-count (and the weak model can't be trusted to grade production).
    if (decision.move !== "apply") {
      lines.push(
        `- **التقاط الإشارة (إلزامي):** بعد ردّ الطالب على سؤالك، أصدر في نهاية رسالتك حكماً للمفهوم ${target.conceptIndex}: إمّا \`[MASTERY: concept=${target.conceptIndex} value=<0..100>]\` (قدّر فهمه بصدق) أو \`[NEEDS_REVIEW: concept=${target.conceptIndex}]\` إن أخطأ أو تردّد. لا تترك الدور بلا حكم على الهدف.`,
        "- **اجعل الذكاء مرئياً (بلطف):** اربط السؤال بنقطة الضعف بإشارة دافئة طبيعية مرّة واحدة (مثل «خلّنا نثبّت هذي النقطة بالذات…») — دون لهجة آلية ولا كشف أنّ هناك «نظام» يحسب لك.",
      );
    }
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
