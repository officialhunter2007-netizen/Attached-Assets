// ─────────────────────────────────────────────────────────────────────────────
// v4.0 — Hierarchical curriculum schema.
//
// Tree shape (per `Pasted--v4-0-...txt` §9):
//   specialty → 5 levels → 7 stages → 9 units → 10 lessons
//             + per-unit labs (2–5)  + per-unit / per-stage / per-level exam banks
//             + a per-specialty placement test bank
//
// Every node hangs off a single `instruction_file_versions.id` so a new
// instruction-file publish is atomic: insert one version row, upsert all
// child rows pointing at it, then swap `specialties.active_instruction_version_id`
// to that id. Running sessions stay pinned to whichever version_id they were
// started on (Architectural Constraint #1 in the task plan).
//
// All v4 tables coexist with the legacy `subjects` / `user_subject_plans`
// tables until the migration task (#10) — nothing here drops or rewrites the
// legacy structure.
// ─────────────────────────────────────────────────────────────────────────────
import { pgTable, text, serial, timestamp, integer, jsonb, uniqueIndex, index, boolean } from "drizzle-orm/pg-core";

// ── specialties: top-level subject (cyber, accounting, web-dev, …) ──────────
// Mirrors the legacy `subjects` notion but is the v4 source of truth.
// `active_instruction_version_id` points at the currently-published file;
// older versions remain in `instruction_file_versions` for rollback.
export const v4SpecialtiesTable = pgTable("v4_specialties", {
  id: serial("id").primaryKey(),
  // Stable string key used by routes/sessions/UI (e.g. "cyber"). Unique.
  slug: text("slug").notNull().unique(),
  // Human-readable name (Arabic).
  name: text("name").notNull(),
  // Optional short tagline shown in admin lists / specialty cards.
  description: text("description"),
  // Optional emoji / icon hint surfaced in the curriculum tree UI.
  icon: text("icon"),
  // FK → v4_instruction_file_versions.id. Nullable because a specialty can
  // exist before its first instruction file is published. Enforced via app
  // layer (cannot start a session without an active version).
  activeInstructionVersionId: integer("active_instruction_version_id"),
  // v4.1 — opaque JSONB blob for the new specialty-level fields
  // (target_persona, teacher_tone, yemeni_examples, allowed_viz_templates,
  // allowed_tools, glossary). Kept in a single column so adding more v4.1
  // fields later doesn't require another migration round.
  meta: jsonb("meta").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── instruction_file_versions: append-only history of published JSON files ──
// Every publish inserts a row here. `raw_json` is the full document (archived
// verbatim for audit), `parsed_summary` is small metrics (lesson count, etc.)
// surfaced in the admin list without re-parsing the full JSON.
export const v4InstructionFileVersionsTable = pgTable("v4_instruction_file_versions", {
  id: serial("id").primaryKey(),
  specialtyId: integer("specialty_id").notNull(),
  // 1-based, monotonically increasing per specialty.
  version: integer("version").notNull(),
  // Status: "draft" | "published" | "archived". Only "published" rows can
  // be set as active_instruction_version_id.
  status: text("status").notNull().default("published"),
  // Raw JSON document (the entire instruction file the admin pasted/uploaded).
  rawJson: jsonb("raw_json").notNull(),
  // Cached summary {levels, stages, units, lessons, labs, examQuestions}.
  parsedSummary: jsonb("parsed_summary"),
  // Free-text changelog the admin types on publish.
  notes: text("notes"),
  publishedByUserId: integer("published_by_user_id"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_instr_specialty_version").on(t.specialtyId, t.version),
  index("idx_v4_instr_specialty_status").on(t.specialtyId, t.status),
]);

// ── levels: 5 per specialty ─────────────────────────────────────────────────
export const v4LevelsTable = pgTable("v4_levels", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  // 1..5
  levelIndex: integer("level_index").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  // Free-form metadata for the level exam — questionTypes, passThreshold.
  // Stored as JSON so the admin can add fields without a schema change.
  examMeta: jsonb("exam_meta"),
  // v4.1 — bloom_focus + any future level-level extras.
  meta: jsonb("meta").notNull().default({}),
}, (t) => [
  uniqueIndex("uq_v4_levels_version_index").on(t.versionId, t.levelIndex),
]);

// ── stages: 7 per level ─────────────────────────────────────────────────────
export const v4StagesTable = pgTable("v4_stages", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  levelId: integer("level_id").notNull(),
  // 1..7
  stageIndex: integer("stage_index").notNull(),
  // Canonical numbering "L.S" (e.g. "1.3").
  code: text("code").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  examMeta: jsonb("exam_meta"),
  // v4.1 — bloom_focus + future stage-level extras.
  meta: jsonb("meta").notNull().default({}),
}, (t) => [
  uniqueIndex("uq_v4_stages_version_code").on(t.versionId, t.code),
  index("idx_v4_stages_level").on(t.levelId),
]);

// ── units: 9 per stage ──────────────────────────────────────────────────────
export const v4UnitsTable = pgTable("v4_units", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  stageId: integer("stage_id").notNull(),
  // 1..9
  unitIndex: integer("unit_index").notNull(),
  // Canonical numbering "L.S.U" (e.g. "1.3.5").
  code: text("code").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  // Arrays of stringified canonical codes ("1.1.2", …). Validated by the
  // cross-reference validator to ensure every referenced code exists in the
  // same version.
  prerequisiteUnitCodes: jsonb("prerequisite_unit_codes").notNull().default([]),
  enablesUnitCodes: jsonb("enables_unit_codes").notNull().default([]),
  // Key concepts list (array of strings) introduced at unit-level.
  keyConcepts: jsonb("key_concepts").notNull().default([]),
  examMeta: jsonb("exam_meta"),
  // v4.1 — motivation_hook + learning_objectives (Bloom-tagged) live here.
  meta: jsonb("meta").notNull().default({}),
}, (t) => [
  uniqueIndex("uq_v4_units_version_code").on(t.versionId, t.code),
  index("idx_v4_units_stage").on(t.stageId),
]);

// ── lessons: 10 per unit ────────────────────────────────────────────────────
export const v4LessonsTable = pgTable("v4_lessons", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  unitId: integer("unit_id").notNull(),
  // 1..10
  lessonIndex: integer("lesson_index").notNull(),
  // Canonical numbering "L.S.U.Lesson" (e.g. "1.3.5.7").
  code: text("code").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  // The mandatory opening sentence the teacher must say first (§9.5).
  bridgeSentence: text("bridge_sentence").notNull(),
  prerequisiteLessonCodes: jsonb("prerequisite_lesson_codes").notNull().default([]),
  enablesLessonCodes: jsonb("enables_lesson_codes").notNull().default([]),
  // The literal final-check question that must be answered correctly before
  // [LESSON_MASTERED] can be emitted.
  finalCheckQuestion: text("final_check_question").notNull(),
  // Exact textual criterion the teacher must satisfy before [SESSION_COMPLETE].
  sessionCompleteCriterion: text("session_complete_criterion").notNull(),
  // Yemeni-life examples — array of strings (≥1 required per spec §9.2).
  yemeniExamples: jsonb("yemeni_examples").notNull().default([]),
  expectedDurationMinutes: integer("expected_duration_minutes"),
  estimatedGemCost: integer("estimated_gem_cost"),
  // v4.1 — model answer outline for the final-check question. Real column
  // (not in meta) so the grader can read it cheaply during exam evaluation.
  solutionOutline: text("solution_outline"),
  // v4.1 — motivation_hook + learning_objectives + glossary live here.
  meta: jsonb("meta").notNull().default({}),
}, (t) => [
  uniqueIndex("uq_v4_lessons_version_code").on(t.versionId, t.code),
  index("idx_v4_lessons_unit").on(t.unitId),
]);

// ── lesson_concepts: ordered list of concepts inside one lesson ─────────────
export const v4LessonConceptsTable = pgTable("v4_lesson_concepts", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  // 1-based ordering within the lesson.
  conceptIndex: integer("concept_index").notNull(),
  name: text("name").notNull(),
  explanation: text("explanation").notNull(),
  // Textual mastery criterion the teacher checks against (Layer 4 / §9.2).
  masteryCriterion: text("mastery_criterion").notNull(),
  // v4.1 — relative weight for the weighted mastery gate. Default 1 keeps
  // legacy v4.0 behavior (all concepts equally weighted).
  weight: integer("weight").notNull().default(1),
}, (t) => [
  uniqueIndex("uq_v4_lconcepts_lesson_idx").on(t.lessonId, t.conceptIndex),
  index("idx_v4_lconcepts_version").on(t.versionId),
]);

// ── lesson_common_mistakes ──────────────────────────────────────────────────
export const v4LessonCommonMistakesTable = pgTable("v4_lesson_common_mistakes", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  mistakeIndex: integer("mistake_index").notNull(),
  // The mistake itself, what the right answer is, and the remediation.
  mistake: text("mistake").notNull(),
  correction: text("correction").notNull(),
  treatment: text("treatment").notNull(),
  // v4.1 — minor|major|critical. Defaults to 'major' for legacy rows.
  severity: text("severity").notNull().default("major"),
}, (t) => [
  uniqueIndex("uq_v4_lmistakes_lesson_idx").on(t.lessonId, t.mistakeIndex),
  index("idx_v4_lmistakes_version").on(t.versionId),
]);

// ── lab_scenarios: 2..5 per unit ────────────────────────────────────────────
export const v4LabScenariosTable = pgTable("v4_lab_scenarios", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  unitId: integer("unit_id").notNull(),
  // 1..5
  labIndex: integer("lab_index").notNull(),
  // Canonical numbering "L.S.U.مX" (e.g. "1.3.5.م1") — stored as plain text.
  code: text("code").notNull(),
  title: text("title").notNull(),
  // Full narrative scenario (multi-paragraph allowed).
  scenario: text("scenario").notNull(),
  completionCriterion: text("completion_criterion").notNull(),
  // v4.1 — pedagogical_sequence, prerequisite_lessons[], allowed_tools[].
  meta: jsonb("meta").notNull().default({}),
}, (t) => [
  uniqueIndex("uq_v4_lab_version_code").on(t.versionId, t.code),
  index("idx_v4_lab_unit").on(t.unitId),
]);

// ── lab_questions: exactly 5 per lab (diagnostic|decision|application|
//                                      analysis|connection) per spec §9.2 ────
export const v4LabQuestionsTable = pgTable("v4_lab_questions", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  labId: integer("lab_id").notNull(),
  questionIndex: integer("question_index").notNull(),
  // One of: diagnostic | decision | application | analysis | connection.
  kind: text("kind").notNull(),
  prompt: text("prompt").notNull(),
  // v4.1 — Haiku grader anchors.
  rubric: text("rubric"),
  solutionOutline: text("solution_outline"),
  // v4.1 — relative weight for averaging the lab score. Default 1.
  points: integer("points").notNull().default(1),
}, (t) => [
  uniqueIndex("uq_v4_labq_lab_idx").on(t.labId, t.questionIndex),
  index("idx_v4_labq_version").on(t.versionId),
]);

// ── exam banks ──────────────────────────────────────────────────────────────
// One shared table, discriminated by `scope` (unit|stage|level) and a single
// nullable FK group. Spec §13.1 calls for "3 alternative sets per exam";
// `variantIndex` (1..3) supports that without three near-identical tables.
export const v4ExamQuestionsTable = pgTable("v4_exam_questions", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  // "unit" | "stage" | "level"
  scope: text("scope").notNull(),
  // Exactly one of these is populated based on `scope`.
  unitId: integer("unit_id"),
  stageId: integer("stage_id"),
  levelId: integer("level_id"),
  // 1..3 — the question-bank variant this question belongs to.
  variantIndex: integer("variant_index").notNull().default(1),
  questionIndex: integer("question_index").notNull(),
  // "mcq" | "practical" | "short_answer" — practical questions don't need
  // choices/correctIndex (they're graded by Haiku in task #7).
  kind: text("kind").notNull().default("mcq"),
  prompt: text("prompt").notNull(),
  choices: jsonb("choices"),
  correctIndex: integer("correct_index"),
  explanation: text("explanation"),
  // 1=easy, 2=medium, 3=hard — fed to the adaptive selector in task #7.
  difficulty: integer("difficulty").notNull().default(2),
  // v4.1 — Haiku grader anchors for short_answer / practical.
  rubric: text("rubric"),
  solutionOutline: text("solution_outline"),
  // v4.1 — weight contribution to the exam total. Default 1.
  points: integer("points").notNull().default(1),
  // v4.1 — optional per-question soft time hint (FE displays).
  timeLimitSeconds: integer("time_limit_seconds"),
}, (t) => [
  index("idx_v4_exam_scope_targets").on(t.scope, t.unitId, t.stageId, t.levelId, t.variantIndex),
  index("idx_v4_exam_version").on(t.versionId),
]);

// ── placement test bank: separate per-specialty pool ────────────────────────
export const v4PlacementTestQuestionsTable = pgTable("v4_placement_test_questions", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  questionIndex: integer("question_index").notNull(),
  // Which level this question maps to (1..5). Used by task #3's diagnostic
  // to land the student at a specific starting level.
  targetLevelIndex: integer("target_level_index").notNull(),
  kind: text("kind").notNull().default("mcq"),
  prompt: text("prompt").notNull(),
  choices: jsonb("choices"),
  correctIndex: integer("correct_index"),
  difficulty: integer("difficulty").notNull().default(2),
}, (t) => [
  uniqueIndex("uq_v4_placement_version_idx").on(t.versionId, t.questionIndex),
]);

// ── student_paths: per-user enrollment in one specialty path ───────────────
// Created on first successful path setup (custom diagnostic+placement, or
// booklet flow). One row per (userId, subjectId). `versionId` pins the
// student to whichever instruction-file version was active at setup time,
// so a later admin re-publish does not retroactively shift their map.
//
// `pathType`        : 'custom' | 'booklet' (booklet flow ships in task #8;
//                     this schema accepts the value so we don't migrate later).
// `startMode`       : 'from_zero' | 'placement' — how startingLevelIndex was
//                     decided. Used by the admin dashboard / analytics.
// `unlockedLessonCodes`: snapshot of every lesson code unlocked at the moment
//                     of setup. Task #4 will extend this as the student
//                     progresses; task #3 only writes the initial snapshot.
export const v4StudentPathsTable = pgTable("v4_student_paths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  versionId: integer("version_id").notNull(),
  pathType: text("path_type").notNull(),
  // Task #8 — link to the booklet that backs this path when
  // pathType='booklet'. NULL for 'custom' paths.
  bookletId: integer("booklet_id"),
  startMode: text("start_mode").notNull(),
  startingLevelIndex: integer("starting_level_index").notNull().default(1),
  currentLessonCode: text("current_lesson_code"),
  unlockedLessonCodes: jsonb("unlocked_lesson_codes").notNull().default([]),
  // Maps lesson_code → star count (1|2|3). Persisted server-side so
  // stars survive page refreshes (previously only stored in live SSE state).
  lessonStars: jsonb("lesson_stars").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_student_paths_user_subject").on(t.userId, t.subjectId),
  index("idx_v4_student_paths_user").on(t.userId),
]);

// ── diagnostic_sessions: the 5-question intake conversation ─────────────────
// One row per attempt (idempotency is enforced at the application layer:
// the latest in_progress row is reused on the next request). `answers` is
// a json array of {question, answer} pairs the student typed before
// finalisation. After finalize the row's status flips to 'completed' and
// the answers become the seed for the personal_dictionary in task #5.
export const v4DiagnosticSessionsTable = pgTable("v4_diagnostic_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  answers: jsonb("answers").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [
  index("idx_v4_diag_user_subject").on(t.userId, t.subjectId),
]);

// ── Inferred types ──────────────────────────────────────────────────────────
export type V4Specialty = typeof v4SpecialtiesTable.$inferSelect;
export type V4InstructionFileVersion = typeof v4InstructionFileVersionsTable.$inferSelect;
export type V4Level = typeof v4LevelsTable.$inferSelect;
export type V4Stage = typeof v4StagesTable.$inferSelect;
export type V4Unit = typeof v4UnitsTable.$inferSelect;
export type V4Lesson = typeof v4LessonsTable.$inferSelect;
export type V4LessonConcept = typeof v4LessonConceptsTable.$inferSelect;
export type V4LessonCommonMistake = typeof v4LessonCommonMistakesTable.$inferSelect;
export type V4LabScenario = typeof v4LabScenariosTable.$inferSelect;
export type V4LabQuestion = typeof v4LabQuestionsTable.$inferSelect;
export type V4ExamQuestion = typeof v4ExamQuestionsTable.$inferSelect;
export type V4PlacementTestQuestion = typeof v4PlacementTestQuestionsTable.$inferSelect;
export type V4StudentPath = typeof v4StudentPathsTable.$inferSelect;
export type InsertV4StudentPath = typeof v4StudentPathsTable.$inferInsert;
export type V4DiagnosticSession = typeof v4DiagnosticSessionsTable.$inferSelect;
export type InsertV4DiagnosticSession = typeof v4DiagnosticSessionsTable.$inferInsert;

// ── v4 task #5 — Teaching core ──────────────────────────────────────────────
// Per-lesson generated content cache. Keyed on (versionId, lessonId, language)
// so a re-publish of the instruction file produces a fresh cache row instead
// of serving stale content. First student to touch a lesson absorbs the
// one-time Gemini cost via chargeV4Ai; every subsequent student reads from
// cache for free.
export const v4LessonContentCacheTable = pgTable("v4_lesson_content_cache", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  language: text("language").notNull().default("ar"),
  // Full generated payload: { intro, microExplanations[], examples[],
  // checks[], analogies[], closingBridge } — exact shape owned by
  // v4-teaching-core.ts. Stored as jsonb so we can read individual fields
  // in admin tooling without re-parsing.
  contentJson: jsonb("content_json").notNull(),
  generationCostUsd: text("generation_cost_usd"),
  generationRequestId: text("generation_request_id"),
  firstStudentId: integer("first_student_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_lcc_version_lesson_lang").on(t.versionId, t.lessonId, t.language),
  index("idx_v4_lcc_lesson").on(t.lessonId),
]);

// Per-concept mastery score (0..100). One row per (userId, lessonId,
// conceptIndex). Updated by [MASTERY: concept=N value=...] tag parser and
// read by Layer 4 of the system prompt to keep the teacher focused on
// gaps. Placeholder for task #6 (mastery dashboard) — the table ships now
// so the teaching layer can write to it from day one.
export const v4ConceptMasteryTable = pgTable("v4_concept_mastery", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  conceptIndex: integer("concept_index").notNull(),
  // 0..100; 100 = fully mastered.
  score: integer("score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_cmastery_user_lesson_concept").on(t.userId, t.lessonId, t.conceptIndex),
  index("idx_v4_cmastery_user").on(t.userId),
]);

export type V4LessonContentCache = typeof v4LessonContentCacheTable.$inferSelect;
export type InsertV4LessonContentCache = typeof v4LessonContentCacheTable.$inferInsert;
export type V4ConceptMastery = typeof v4ConceptMasteryTable.$inferSelect;
export type InsertV4ConceptMastery = typeof v4ConceptMasteryTable.$inferInsert;

// ── v4 task #7 — Lab completions ────────────────────────────────────────────
// One row per (user, lab) — upsert on retry so the map always reflects the
// student's latest attempt. `evaluatorLog` is the full Haiku-graded payload
// (per-question verdict + explanation) so admins can audit later. Labs are
// passed when `passed = true`; threshold is owned by the engine, not the row.
export const v4LabCompletionsTable = pgTable("v4_lab_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  labId: integer("lab_id").notNull(),
  versionId: integer("version_id").notNull(),
  subjectId: text("subject_id").notNull(),
  // 0..100 — average of per-question scores from Haiku.
  score: integer("score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  evaluatorLog: jsonb("evaluator_log").notNull().default([]),
  attempts: integer("attempts").notNull().default(1),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_lab_completions_user_lab").on(t.userId, t.labId),
  index("idx_v4_lab_completions_user").on(t.userId),
]);

// ── v4 task #7 — Exam attempts ──────────────────────────────────────────────
// Append-only — every attempt records its variantIndex, answers, score, and
// whether gems were deducted. Variant rotation = ((priorAttemptCount % 3)+1),
// so a failing student retrying on alt-bank #2 then #3 then #1 again is free.
// Only the very first attempt charges gems (per spec §13.3 retry rule).
export const v4ExamAttemptsTable = pgTable("v4_exam_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  versionId: integer("version_id").notNull(),
  subjectId: text("subject_id").notNull(),
  // "unit" | "stage" | "level"
  scope: text("scope").notNull(),
  // Canonical exam code: "L.S.U.exam" | "L.S.exam" | "L.exam"
  examCode: text("exam_code").notNull(),
  // FK to the unit/stage/level — exactly one populated based on scope.
  scopeRefId: integer("scope_ref_id").notNull(),
  variantIndex: integer("variant_index").notNull().default(1),
  // Full payload: [{ questionId, prompt, kind, studentAnswer, verdict, score, explanation }]
  answers: jsonb("answers").notNull().default([]),
  // 0..100 — average of per-question scores.
  score: integer("score").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  gemsDeducted: integer("gems_deducted").notNull().default(0),
  // Idempotency key for the gem charge (mirrored into gem_ledger.request_id).
  requestId: text("request_id"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_v4_exam_attempts_user_scope").on(t.userId, t.scope, t.scopeRefId),
  index("idx_v4_exam_attempts_user").on(t.userId),
]);

export type V4LabCompletion = typeof v4LabCompletionsTable.$inferSelect;
export type InsertV4LabCompletion = typeof v4LabCompletionsTable.$inferInsert;
export type V4ExamAttempt = typeof v4ExamAttemptsTable.$inferSelect;
export type InsertV4ExamAttempt = typeof v4ExamAttemptsTable.$inferInsert;

// ── v4 task #6 — Unified teacher memory (cross-subject) ─────────────────────
// One row per user — memory is intentionally NOT keyed by subject because the
// product premise is "the student is one person across every specialty"
// (spec §5: "ذاكرة المعلم موحّدة عبر المسارات والمواد"). The 3 jsonb fields
// are injected into Layer 4 of the teaching system prompt:
//   - personal_dictionary: { occupation?, hobbies?[], examples?[], places?[],
//                            family?[], extras?[] } — captured from the
//     diagnostic (#3) and lightly scanned from every session afterwards.
//   - warmth_anchors: { laughs?[], confidence?[], worries?[] } — appended
//     after every session by a small Haiku summarisation pass.
//   - learning_style: one of "analytical" | "applied" | "visual" | null —
//     captured opportunistically from session content.
export const v4StudentProfileTable = pgTable("v4_student_profile", {
  userId: integer("user_id").primaryKey(),
  personalDictionary: jsonb("personal_dictionary").notNull().default({}),
  learningStyle: text("learning_style"),
  warmthAnchors: jsonb("warmth_anchors").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Weekly compressed memory summary — generated by Haiku once a week per
// active student and used in Layer 4 to defuse the "token bomb" of carrying
// every session forward. Only the latest row is read by the teaching prompt;
// older rows are kept for audit / regeneration only.
export const v4StudentMemorySummariesTable = pgTable("v4_student_memory_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  summaryText: text("summary_text").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  tokensEstimate: integer("tokens_estimate").notNull().default(0),
  costUsd: text("cost_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_v4_smsum_user_created").on(t.userId, t.createdAt),
]);

// Per-(user, lesson, concept) weakness counter. Incremented by the
// `NEEDS_REVIEW` protocol tag (and any future mistake-detection paths) so
// the teaching layer can surface the student's chronic gaps in Layer 4
// even when a particular session is on an unrelated lesson.
export const v4WeaknessTrackerTable = pgTable("v4_weakness_tracker", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  lessonId: integer("lesson_id").notNull(),
  conceptIndex: integer("concept_index").notNull(),
  errorCount: integer("error_count").notNull().default(1),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_v4_weak_user_lesson_concept").on(t.userId, t.lessonId, t.conceptIndex),
  index("idx_v4_weak_user_last").on(t.userId, t.lastSeen),
]);

export type V4StudentProfile = typeof v4StudentProfileTable.$inferSelect;
export type InsertV4StudentProfile = typeof v4StudentProfileTable.$inferInsert;
export type V4StudentMemorySummary = typeof v4StudentMemorySummariesTable.$inferSelect;
export type V4WeaknessTracker = typeof v4WeaknessTrackerTable.$inferSelect;

export type V4PersonalDictionary = {
  occupation?: string;
  hobbies?: string[];
  examples?: string[];
  places?: string[];
  family?: string[];
  extras?: string[];
};
export type V4WarmthAnchors = {
  laughs?: string[];
  confidence?: string[];
  worries?: string[];
};
