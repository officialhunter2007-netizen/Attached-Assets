// ─────────────────────────────────────────────────────────────────────────────
// v4 instruction-file JSON schema (shared between FE editor + BE validator).
//
// This is the contract the admin pastes/uploads. Parsed with Zod for shape
// + required-field checks; the *cross-reference* validator (FK between
// codes, sequential numbering, no cycles) runs on top in a second pass —
// see `v4-instruction-validator.ts`.
//
// ── v4.1 expansion (Task #13) ─────────────────────────────────────────────
// schema_version accepts both "v4.0" and "v4.1". Every field added in v4.1
// is optional and back-compat: existing v4.0 files publish unchanged.
// v4.1 adds (all optional):
//   - specialty.allowed_viz_templates / allowed_tools / glossary
//   - level/stage/unit/lesson motivation_hook, learning_objectives (Bloom),
//     glossary, solution_outline
//   - lesson_concept.weight (default 1)
//   - common_mistake.severity (minor|major|critical)
//   - lab.pedagogical_sequence + prerequisite_lessons + allowed_tools
//   - lab_question.rubric + solution_outline + points
//   - exam_question.rubric + solution_outline + points + time_limit_seconds
//   - exam_meta.points + time_limit_minutes
// These activate richer Layer-1/2/8 prompt scaffolding, weighted mastery,
// and rubric-anchored Haiku grading in v4-exam-evaluator.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod/v4";

// Helper — a non-empty Arabic/text string with a minimum length. We use
// `.trim().min(N)` so leading/trailing whitespace doesn't sneak through.
const reqText = (min = 1, label?: string) =>
  z.string().trim().min(min, label ? `${label} مطلوب (≥${min} حرف)` : `نص مطلوب (≥${min} حرف)`);

// Slug — lowercase ASCII for stable routing keys (specialty.slug).
const slug = z
  .string()
  .trim()
  .min(2, "المعرّف قصير جداً")
  .max(64, "المعرّف طويل جداً")
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "المعرّف يجب أن يكون lowercase ASCII (أحرف، أرقام، -، _)");

// ── v4.1 — Bloom taxonomy levels ──────────────────────────────────────────
export const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
export type V4BloomLevel = (typeof BLOOM_LEVELS)[number];

// ── v4.1 — learning objective ─────────────────────────────────────────────
export const v4LearningObjectiveSchema = z.object({
  statement: reqText(8, "نص الهدف التعلمي"),
  bloom_level: z.enum(BLOOM_LEVELS).default("understand"),
});
export type V4LearningObjectiveJson = z.infer<typeof v4LearningObjectiveSchema>;

// ── v4.1 — glossary term ──────────────────────────────────────────────────
export const v4GlossaryTermSchema = z.object({
  term: reqText(1, "المصطلح"),
  definition: reqText(5, "تعريف المصطلح"),
});
export type V4GlossaryTermJson = z.infer<typeof v4GlossaryTermSchema>;

// ── Concept inside a lesson ────────────────────────────────────────────────
export const v4ConceptSchema = z.object({
  name: reqText(2, "اسم المفهوم"),
  explanation: reqText(10, "شرح المفهوم"),
  mastery_criterion: reqText(5, "معيار إتقان المفهوم"),
  // v4.1 — relative weight for the weighted mastery gate. Default 1 keeps
  // v4.0 behavior (uniform weights). Admins can raise to 2–3 for pivotal
  // concepts so the gate refuses [LESSON_MASTERED] until they're strong.
  weight: z.number().int().min(1).max(5).default(1).optional(),
});
export type V4ConceptJson = z.infer<typeof v4ConceptSchema>;

// ── Common mistake inside a lesson ─────────────────────────────────────────
export const v4CommonMistakeSchema = z.object({
  mistake: reqText(5, "الخطأ الشائع"),
  correction: reqText(5, "التصحيح"),
  treatment: reqText(5, "العلاج"),
  // v4.1 — severity hint surfaces in Layer 2 so the teacher prioritizes.
  severity: z.enum(["minor", "major", "critical"]).default("major").optional(),
});
export type V4CommonMistakeJson = z.infer<typeof v4CommonMistakeSchema>;

// ── Lab question — discriminated by `kind` per spec §9.2 ───────────────────
const labQuestionKinds = ["diagnostic", "decision", "application", "analysis", "connection"] as const;
export type V4LabQuestionKind = (typeof labQuestionKinds)[number];

export const v4LabQuestionSchema = z.object({
  kind: z.enum(labQuestionKinds),
  prompt: reqText(5, "نص سؤال المعمل"),
  // v4.1 — grader anchors. When present, the Haiku grader is fed the rubric
  // + solution_outline as the source of truth instead of only the lab-level
  // completion_criterion, producing much sharper partial-credit decisions.
  rubric: reqText(10, "روبريك التصحيح").optional(),
  solution_outline: reqText(10, "ملخّص الإجابة النموذجية").optional(),
  // v4.1 — relative weight for averaging the lab score. Default 1.
  points: z.number().int().min(1).max(10).default(1).optional(),
});
export type V4LabQuestionJson = z.infer<typeof v4LabQuestionSchema>;

// ── Lab scenario ───────────────────────────────────────────────────────────
export const v4LabSchema = z.object({
  // Optional explicit lab index (1..5). If omitted the normalizer assigns
  // sequentially. Kept optional so the admin can re-order labs by editing
  // the array without renumbering.
  lab_index: z.number().int().min(1).max(5).optional(),
  title: reqText(3, "عنوان المعمل"),
  scenario: reqText(20, "سيناريو المعمل"),
  // Spec §9.2: exactly 5 questions (diagnostic, decision, application,
  // analysis, connection). We enforce length=5 here so the editor shows the
  // error immediately. The validator additionally checks the kinds are the
  // five expected ones (no duplicates).
  questions: z.array(v4LabQuestionSchema).length(5, "كل معمل يحتاج ٥ أسئلة بأنواع: تشخيص، قرار، تطبيق، تحليل، ربط"),
  completion_criterion: reqText(5, "معيار إكمال المعمل"),
  // v4.1 — pedagogical narrative explaining how the 5 questions flow (which
  // builds on which, what the desired "aha" moment is). Surfaced in the
  // grader's preamble so its judgment of "partial" is calibrated.
  pedagogical_sequence: reqText(15).optional(),
  // v4.1 — lab-level lesson prerequisites. Validator FK-checks each code.
  prerequisite_lessons: z.array(z.string().trim()).default([]).optional(),
  // v4.1 — optional override of specialty.allowed_tools for this lab only.
  allowed_tools: z.array(reqText(2)).optional(),
});
export type V4LabJson = z.infer<typeof v4LabSchema>;

// ── Lesson ─────────────────────────────────────────────────────────────────
export const v4LessonSchema = z.object({
  lesson_index: z.number().int().min(1).max(10).optional(),
  name: reqText(3, "اسم الدرس"),
  goal: reqText(10, "هدف الدرس"),
  // The mandatory bridge sentence the teacher opens with. Spec §9.3 rule 4
  // says < 10 words is a *warning*, not an error — we still enforce a
  // minimum character floor here for safety.
  bridge_sentence: reqText(10, "جملة الجسر"),
  // Arrays of canonical lesson codes ("L.S.U.Lesson"). Empty array =
  // "no prerequisites". Strings (not numbers) to support cross-unit refs.
  prerequisite_lessons: z.array(z.string().trim()).default([]),
  enables_lessons: z.array(z.string().trim()).default([]),
  // At least one concept per spec §9.2.
  concepts: z.array(v4ConceptSchema).min(1, "كل درس يحتاج مفهوم واحد على الأقل"),
  // At least one common mistake per spec §9.2.
  common_mistakes: z.array(v4CommonMistakeSchema).min(1, "كل درس يحتاج خطأ شائع متوقع واحد على الأقل"),
  // Spec §9.2: "أمثلة من حياة الطالب اليمني (إلزامية): - مثال ١".
  yemeni_examples: z.array(reqText(5)).min(1, "كل درس يحتاج مثالاً واحداً على الأقل من حياة الطالب اليمني"),
  final_check_question: reqText(5, "سؤال التحقق النهائي"),
  session_complete_criterion: reqText(5, "معيار اكتمال الجلسة"),
  expected_duration_minutes: z.number().int().min(1).max(240).optional(),
  estimated_gem_cost: z.number().int().min(0).max(500).optional(),
  // v4.1 — pedagogical extras (all optional, additive).
  motivation_hook: reqText(15, "خطّاف التحفيز").optional(),
  learning_objectives: z.array(v4LearningObjectiveSchema).optional(),
  glossary: z.array(v4GlossaryTermSchema).optional(),
  // v4.1 — model answer / outline used as Haiku anchor for the final-check
  // question and to ground the teacher when the student stalls.
  solution_outline: reqText(10, "ملخّص الإجابة النموذجية").optional(),
});
export type V4LessonJson = z.infer<typeof v4LessonSchema>;

// ── Exam meta (per level/stage/unit) ───────────────────────────────────────
// We keep this loose because the question banks themselves are stored
// separately (top-level `exam_banks` keyed by code). This holds presentation
// metadata only.
export const v4ExamMetaSchema = z.object({
  description: reqText(5, "وصف الاختبار").optional(),
  question_types: z.array(reqText(2)).default([]).optional(),
  pass_threshold_percent: z.number().int().min(0).max(100),
  // v4.1 — total exam weight + time budget surfaced to the FE.
  points: z.number().int().min(1).max(1000).optional(),
  time_limit_minutes: z.number().int().min(1).max(240).optional(),
}).optional();

// ── Unit ───────────────────────────────────────────────────────────────────
export const v4UnitSchema = z.object({
  unit_index: z.number().int().min(1).max(9).optional(),
  name: reqText(3, "اسم الوحدة"),
  goal: reqText(10, "هدف الوحدة"),
  prerequisite_units: z.array(z.string().trim()).default([]),
  enables_units: z.array(z.string().trim()).default([]),
  key_concepts: z.array(reqText(2)).default([]),
  labs: z.array(v4LabSchema).min(1, "كل وحدة تحتاج معملاً واحداً على الأقل (الحد الأقصى ٥)").max(5, "حد أقصى ٥ معامل لكل وحدة"),
  // Spec target: 10 lessons. We allow 1..10 to support partial publishes.
  lessons: z.array(v4LessonSchema).min(1, "كل وحدة تحتاج درساً واحداً على الأقل").max(10, "حد أقصى ١٠ دروس لكل وحدة"),
  exam: v4ExamMetaSchema,
  // v4.1 — surfaced in L3 (context layer) so the teacher frames the unit.
  motivation_hook: reqText(15).optional(),
  learning_objectives: z.array(v4LearningObjectiveSchema).optional(),
});
export type V4UnitJson = z.infer<typeof v4UnitSchema>;

// ── Stage ──────────────────────────────────────────────────────────────────
export const v4StageSchema = z.object({
  stage_index: z.number().int().min(1).max(7).optional(),
  name: reqText(3, "اسم المرحلة"),
  goal: reqText(10, "هدف المرحلة"),
  units: z.array(v4UnitSchema).min(1, "كل مرحلة تحتاج وحدة واحدة على الأقل").max(9, "حد أقصى ٩ وحدات لكل مرحلة"),
  exam: v4ExamMetaSchema,
  // v4.1 — coarse Bloom focus for the stage as a whole (informational).
  bloom_focus: z.enum(BLOOM_LEVELS).optional(),
});
export type V4StageJson = z.infer<typeof v4StageSchema>;

// ── Level ──────────────────────────────────────────────────────────────────
export const v4LevelSchema = z.object({
  level_index: z.number().int().min(1).max(5).optional(),
  name: reqText(3, "اسم المستوى"),
  goal: reqText(10, "هدف المستوى"),
  stages: z.array(v4StageSchema).min(1, "كل مستوى يحتاج مرحلة واحدة على الأقل").max(7, "حد أقصى ٧ مراحل لكل مستوى"),
  exam: v4ExamMetaSchema,
  bloom_focus: z.enum(BLOOM_LEVELS).optional(),
});
export type V4LevelJson = z.infer<typeof v4LevelSchema>;

// ── Exam question (used inside top-level exam_banks) ───────────────────────
export const v4ExamQuestionSchema = z.object({
  kind: z.enum(["mcq", "practical", "short_answer"]).default("mcq"),
  prompt: reqText(5, "نص السؤال"),
  // MCQ-only fields. Required when kind="mcq", optional otherwise. We use
  // a refine() at the parent level to enforce this so the error is anchored
  // at the question, not the bank.
  choices: z.array(reqText(1)).optional(),
  correct_index: z.number().int().min(0).optional(),
  explanation: reqText(2).optional(),
  difficulty: z.number().int().min(1).max(3).default(2),
  // v4.1 — Haiku grader anchors for short_answer / practical. For MCQ they
  // are ignored. The validator warns when missing on non-MCQ kinds.
  rubric: reqText(10).optional(),
  solution_outline: reqText(10).optional(),
  // v4.1 — weight contribution to the exam total. Default 1.
  points: z.number().int().min(1).max(10).default(1).optional(),
  // v4.1 — optional per-question soft time hint (FE displays).
  time_limit_seconds: z.number().int().min(10).max(3600).optional(),
}).refine(
  (q) => {
    if (q.kind !== "mcq") return true;
    if (!q.choices || q.choices.length < 2) return false;
    if (typeof q.correct_index !== "number") return false;
    if (q.correct_index < 0 || q.correct_index >= q.choices.length) return false;
    return true;
  },
  { message: "أسئلة الاختيار من متعدد تحتاج ≥٢ خيارات و correct_index صالح" },
);
export type V4ExamQuestionJson = z.infer<typeof v4ExamQuestionSchema>;

// ── Exam bank (3 variants per scope/code) ──────────────────────────────────
// `target_code` = the unit/stage/level code these questions belong to.
// `scope` is implicit from where the bank lives in the JSON:
//   exam_banks.unit_banks[code]   → scope=unit
//   exam_banks.stage_banks[code]  → scope=stage
//   exam_banks.level_banks[index] → scope=level (key is the level_index)
export const v4ExamBankSchema = z.object({
  // 1..3 question-bank variants. The adaptive selector (task #7) picks one.
  variants: z
    .array(z.array(v4ExamQuestionSchema).min(1, "كل variant يحتاج سؤالاً واحداً على الأقل"))
    .min(1, "كل بنك يحتاج variant واحداً على الأقل")
    .max(3, "حد أقصى ٣ variants لكل بنك"),
});
export type V4ExamBankJson = z.infer<typeof v4ExamBankSchema>;

// ── Top-level exam banks ───────────────────────────────────────────────────
// Keyed object so the admin can omit banks that aren't ready yet without
// breaking the file. Cross-ref validator warns about missing banks for
// codes that exist in the curriculum.
export const v4ExamBanksSchema = z.object({
  unit_banks: z.record(z.string(), v4ExamBankSchema).optional(),
  stage_banks: z.record(z.string(), v4ExamBankSchema).optional(),
  // Level banks are keyed by level_index as a string ("1".."5").
  level_banks: z.record(z.string(), v4ExamBankSchema).optional(),
}).optional();

// ── Placement test bank (per-specialty) ────────────────────────────────────
export const v4PlacementQuestionSchema = z.object({
  target_level_index: z.number().int().min(1).max(5),
  kind: z.enum(["mcq", "practical", "short_answer"]).default("mcq"),
  prompt: reqText(5, "نص سؤال تحديد المستوى"),
  choices: z.array(reqText(1)).optional(),
  correct_index: z.number().int().min(0).optional(),
  difficulty: z.number().int().min(1).max(3).default(2),
}).refine(
  (q) => {
    if (q.kind !== "mcq") return true;
    if (!q.choices || q.choices.length < 2) return false;
    if (typeof q.correct_index !== "number") return false;
    if (q.correct_index < 0 || q.correct_index >= q.choices.length) return false;
    return true;
  },
  { message: "أسئلة الاختيار من متعدد تحتاج ≥٢ خيارات و correct_index صالح" },
);
export type V4PlacementQuestionJson = z.infer<typeof v4PlacementQuestionSchema>;

// ── Specialty (root) ───────────────────────────────────────────────────────
export const v4SpecialtyMetaSchema = z.object({
  slug,
  name: reqText(2, "اسم التخصص"),
  description: reqText(10, "وصف التخصص").optional(),
  icon: z.string().trim().max(8).optional(),
  // Per spec §9.2 — these four fields are part of the spec template even
  // though only `name` is strictly required to render the UI.
  // v4.1 — target_persona + teacher_tone are now wired into Layer 1 of the
  // teaching prompt (persona). yemeni_examples flow into Layer 2 as global
  // hooks alongside the lesson-level ones.
  target_persona: reqText(5).optional(),
  teacher_tone: reqText(5).optional(),
  yemeni_examples: z.array(reqText(3)).optional(),
  // v4.1 — restrict the VIZ catalog announced in Layer 10 to a whitelist
  // instead of falling back to slug-keyword guessing. When omitted the
  // legacy heuristic in v4-teaching-core.ts continues to apply.
  allowed_viz_templates: z.array(reqText(2)).optional(),
  // v4.1 — list of tool/playground codes the teacher is allowed to suggest
  // (e.g. ["nukhba_ide_js", "nukhba_t_account", "regex_playground"]). Empty
  // / omitted = no restriction beyond the global L1 ban on external tools.
  allowed_tools: z.array(reqText(2)).optional(),
  // v4.1 — specialty-wide glossary, merged with per-lesson glossaries when
  // building Layer 2.
  glossary: z.array(v4GlossaryTermSchema).optional(),
});
export type V4SpecialtyMetaJson = z.infer<typeof v4SpecialtyMetaSchema>;

// ── ROOT instruction file ─────────────────────────────────────────────────
export const v4InstructionFileSchema = z.object({
  // v4.1 — accepts both legacy "v4.0" files and the richer "v4.1" template.
  // Every v4.1 field is additive + optional so old files continue to publish
  // unchanged. The validator surfaces v4.1-only warnings only when the file
  // declares schema_version="v4.1" (so v4.0 files don't get noise).
  schema_version: z.union([z.literal("v4.0"), z.literal("v4.1")]),
  specialty: v4SpecialtyMetaSchema,
  levels: z.array(v4LevelSchema).min(1, "ملف التعليمات يحتاج مستوى واحداً على الأقل").max(5, "حد أقصى ٥ مستويات لكل تخصص"),
  exam_banks: v4ExamBanksSchema,
  placement_test_questions: z.array(v4PlacementQuestionSchema).optional(),
  // Admin-supplied changelog note attached to this publish.
  publish_notes: reqText(2).optional(),
});
export type V4InstructionFileJson = z.infer<typeof v4InstructionFileSchema>;
