/**
 * v4-diagnostic-engine.ts — the "genius weakness hunter".
 *
 * PROBLEM this solves: the teaching model (Gemini 2.5 Flash Lite, locked) is weak.
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
 *
 * 3-FACET DEPTH: a concept isn't "done" at a single mastery score. Practical
 * mastery has three facets — W1 «ماذا» (behavior = the mastery `score`), W2
 * «لماذا» (rationale), W3 «الحدود» (boundary/break). The two middle facets
 * (W2/W3) are tracked per concept in `facetsByConcept`. Depth is WEIGHTED: an
 * IMPORTANT concept (weight>1) must clear all three facets; an ordinary
 * concept (weight=1) only needs W1 — so we go deep where it matters and stay
 * light elsewhere ("دون مبالغة"). The decision ladder inserts RATIONALE (W2)
 * and BOUNDARY (W3) moves between DRILL (W1) and REINFORCE for important
 * concepts only.
 */

import type { V4ConceptFacets, V4FacetKey } from "@workspace/db";

/** Concept mastery thresholds (kept in sync with the L2/L8 flags + the
 *  task #6 mastery gate of 75). */
const MASTERED_AT = 75;
const WEAK_BELOW = 50;

/**
 * A middle facet (W2/W3) counts as covered once its coverage state has the
 * `covered` flag set — written by the isolated grader (score recorded) OR by
 * the 2-attempt cap (exposure-covered, score null). Absent/legacy `{}` facets
 * read as not-covered, so important concepts surface their W2/W3 gap.
 */
function facetCovered(facets: V4ConceptFacets | undefined, key: V4FacetKey): boolean {
  const st = facets?.[key];
  return !!st && st.covered === true;
}

/** Important concepts (weight>1) require the two middle facets; ordinary
 *  concepts (weight=1) only need W1 (score) + W4 (applied). */
function requiresMiddleFacets(weight: number): boolean {
  return weight > 1;
}

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
  /** Per-concept coverage of the two middle facets (W2/W3). Drives the
   *  RATIONALE/BOUNDARY moves for important (weight>1) concepts. */
  facetsByConcept?: Map<number, V4ConceptFacets>;
  /** STUDENT-FACING content for THIS turn's facet move (rationale/boundary),
   *  lazily generated + cached by the caller. Absent when the move isn't a
   *  facet move, or when generation failed — the directive then falls back to
   *  generic, model-authored facet coverage. The rubric/solutionOutline are
   *  NEVER passed here; they stay server-side for the isolated grader. */
  facetContent?: FacetDirectiveContent | null;
  mistakes: DiagnosticMistake[];
  chronicWeaknesses?: ChronicWeakness[];
  currentLessonCode: string;
};

/** The student-facing slice of a facet nugget the directive may reveal. */
export type FacetDirectiveContent = {
  facet: V4FacetKey;
  /** Predict-then-reveal question to ASK before revealing. */
  predictPrompt: string;
  /** W2 only — the rationale to reveal after the student tries. */
  rationale?: string;
  /** W3 only — what may change without breaking it. */
  variesFreely?: string;
  /** W3 only — the deviation that breaks it. */
  breaks?: string;
  /** W3 only — the resulting error and why it happens. */
  errorAndWhy?: string;
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

export type DiagnosticMove =
  | "probe"
  | "drill"
  | "rationale"
  | "boundary"
  | "reinforce"
  | "advance";

export type DiagnosticTarget = {
  conceptIndex: number;
  name: string;
  masteryCriterion: string;
  state: ConceptState;
  score: number | null;
};

export type DiagnosticDecision = {
  move: DiagnosticMove;
  /** null only when move === "advance" (all required facets cleared for all
   *  concepts). */
  target: DiagnosticTarget | null;
  /** Which middle facet a facet move targets. Set ONLY for "rationale" (w2)
   *  and "boundary" (w3); null for every other move. */
  facet: V4FacetKey | null;
};

/**
 * The single source of truth for "what should happen with which concept THIS
 * turn". A disjoint, strict-priority decision (exactly one move per turn). The
 * ladder is breadth-first by facet — finish a facet across the whole lesson
 * before the next deepens — so foundations come before depth:
 *
 *   1. earliest untested|weak                         → PROBE / DRILL  (W1)
 *   2. else earliest IMPORTANT(weight>1) grasped concept missing W2 → RATIONALE (W2)
 *   3. else earliest IMPORTANT grasped concept W2-covered missing W3 → BOUNDARY  (W3)
 *   4. else earliest shaky concept                    → REINFORCE     (nudge >75)
 *   5. else (every required facet cleared everywhere) → ADVANCE
 *
 * Weighted depth: steps 2–3 fire ONLY for weight>1 concepts, so ordinary
 * concepts skip straight from W1 to REINFORCE/ADVANCE (no overkill).
 *
 * Pure + side-effect-free so it can be reused verbatim by the prompt builder
 * to author the directive. When `facetsByConcept` is omitted (or weights are
 * all 1) it degrades EXACTLY to the pre-facet probe→reinforce→advance ladder.
 */
export function decideDiagnosticMove(input: {
  concepts: DiagnosticConcept[];
  masteryByConcept: Map<number, number>;
  /** Per-concept coverage of the two middle facets (W2/W3). Absent = legacy. */
  facetsByConcept?: Map<number, V4ConceptFacets>;
}): DiagnosticDecision {
  const facetsByConcept = input.facetsByConcept ?? new Map<number, V4ConceptFacets>();
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
  const grasped = (s: ConceptState) => s === "shaky" || s === "mastered";

  // 1. earliest untested|weak → PROBE/DRILL (a real W1 gap blocks everything).
  const gap = withState.find((c) => c.state === "untested" || c.state === "weak");
  if (gap) return { move: gap.state === "untested" ? "probe" : "drill", target: mk(gap), facet: null };

  // 2. else earliest IMPORTANT concept that's grasped but missing W2 → RATIONALE.
  const w2gap = withState.find(
    (c) =>
      requiresMiddleFacets(c.concept.weight) &&
      grasped(c.state) &&
      !facetCovered(facetsByConcept.get(c.concept.conceptIndex), "w2"),
  );
  if (w2gap) return { move: "rationale", target: mk(w2gap), facet: "w2" };

  // 3. else earliest IMPORTANT concept that's grasped, W2-covered, missing W3 → BOUNDARY.
  const w3gap = withState.find(
    (c) =>
      requiresMiddleFacets(c.concept.weight) &&
      grasped(c.state) &&
      facetCovered(facetsByConcept.get(c.concept.conceptIndex), "w2") &&
      !facetCovered(facetsByConcept.get(c.concept.conceptIndex), "w3"),
  );
  if (w3gap) return { move: "boundary", target: mk(w3gap), facet: "w3" };

  // 4. else earliest shaky concept → REINFORCE over the 75 line.
  const toReinforce = withState.find((c) => c.state === "shaky");
  if (toReinforce) return { move: "reinforce", target: mk(toReinforce), facet: null };

  // 5. else every required facet is cleared everywhere → advance.
  return { move: "advance", target: null, facet: null };
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

  // Disjoint per-turn decision (the single source of truth).
  const decision = decideDiagnosticMove({
    concepts: input.concepts,
    masteryByConcept: input.masteryByConcept,
    facetsByConcept: input.facetsByConcept,
  });
  const target = decision.target;

  const lines: string[] = [
    "## 16. موجّه التشخيص الذكي — خطة هذا الدور (إلزامية، نفّذها بدقّة)",
    "هذه خطة محسوبة آلياً من سجلّ إتقان الطالب الفعلي. التزم بها هذا الدور — هي ما يجعل الطالب يشعر أنك تعرف نقاط ضعفه بالضبط وتعالجها.",
    `- خريطة الإتقان الحالية (مفهوم:سكور): ${mapLine}  →  متقن ${masteredCount}/${withState.length}`,
  ];

  if (decision.move === "advance" || !target) {
    // Everything ≥ 75 — drive toward final check + mastery.
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
    } else if (decision.move === "rationale") {
      // W2 «لماذا» — the student knows WHAT the concept does; cement WHY.
      lines.push(
        "- **الحركة المطلوبة: ترسيخ العلّة (RATIONALE — وجه «لماذا»).** الطالب يعرف «ماذا» يفعل هذا المفهوم، لكن لم تترسّخ عنده «لماذا» هو هكذا. اطرح أولاً سؤال التوقّع ودعه يحاول، ثم اكشف العلّة بإيجاز محسوس بلغته (جملة أو جملتان، دون مبالغة):",
      );
      if (input.facetContent && input.facetContent.facet === "w2") {
        lines.push(
          `  • سؤال التوقّع (اطرحه أولاً، ولا تكشف الجواب قبل محاولته): ${input.facetContent.predictPrompt}`,
          `  • العلّة (اكشفها بأسلوبك بعد محاولته): ${input.facetContent.rationale ?? ""}`,
        );
      } else {
        lines.push(
          "  • اطرح سؤال «لماذا» يقود الطالب لاكتشاف علّة هذا المفهوم بنفسه، ثم اكشف العلّة بإيجاز محسوس.",
        );
      }
    } else if (decision.move === "boundary") {
      // W3 «الحدود» — the student grasped WHAT + WHY; cement where it breaks.
      lines.push(
        "- **الحركة المطلوبة: استكشاف الحدود (BOUNDARY — وجه «الحدود»).** الطالب فهم المفهوم وعلّته؛ الآن رسّخ حدوده: ما الذي يتغيّر بحرية، وما الذي يكسره، والخطأ الناتج ولماذا. اطرح أولاً سؤال «توقّع: وش يصير لو…» ثم اكشف بإيجاز:",
      );
      if (input.facetContent && input.facetContent.facet === "w3") {
        lines.push(
          `  • سؤال التوقّع (اطرحه أولاً): ${input.facetContent.predictPrompt}`,
          `  • يتغيّر بحرية (لا يكسره): ${input.facetContent.variesFreely ?? ""}`,
          `  • يكسره: ${input.facetContent.breaks ?? ""}`,
          `  • الخطأ الناتج وسببه: ${input.facetContent.errorAndWhy ?? ""}`,
        );
      } else {
        lines.push(
          "  • اطرح سؤال «ماذا لو/توقّع» يكشف حدّ المفهوم (ما الذي يكسره والخطأ الناتج)، ثم اكشف الحدّ بإيجاز.",
        );
      }
    } else {
      lines.push(
        "- **الحركة المطلوبة: ترسيخ (REINFORCE).** الطالب قريب من الإتقان. اطرح **تطبيقاً ألطف بدرجة** (سيناريو أو «ماذا لو») يرفعه فوق ٧٥ بدل إعادة الأساسيات.",
      );
    }

    // Signal capture. One move class writes mastery server-side, so the model
    // must NOT emit a tag for it (it would double-count, and the weak model
    // can't be trusted to grade): the facet moves RATIONALE/BOUNDARY — the
    // isolated grader scores the facet from the student's next reply.
    const facetMove = decision.move === "rationale" || decision.move === "boundary";
    if (facetMove) {
      lines.push(
        `- **لا تُصدر [MASTERY] ولا [NEEDS_REVIEW] للمفهوم ${target.conceptIndex} هذا الدور** — هذا الوجه يُقيَّم آلياً من ردّ الطالب. اكتفِ بطرح سؤال التوقّع ثم الكشف القصير.`,
        "- **اجعل الذكاء مرئياً (بلطف):** اربط السؤال بنقطة الضعف بإشارة دافئة طبيعية مرّة واحدة — دون لهجة آلية ولا كشف أنّ هناك «نظام» يحسب لك.",
      );
    } else {
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
