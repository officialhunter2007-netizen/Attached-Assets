import { pgTable, serial, integer, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { labScenariosTable } from "./labs";
import { unitsTable, stagesTable, levelsTable } from "./curriculum_hierarchy";

// ─── Lab Completions ──────────────────────────────────────────────────────────
export const labCompletionsTable = pgTable("lab_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  labScenarioId: integer("lab_scenario_id").notNull().references(() => labScenariosTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"),
  score: integer("score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(0),
  answers: jsonb("answers").notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_lab_completions_user_lab").on(t.userId, t.labScenarioId),
  index("idx_lab_completions_status").on(t.userId, t.status),
]);

export const insertLabCompletionSchema = createInsertSchema(labCompletionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLabCompletion = z.infer<typeof insertLabCompletionSchema>;
export type LabCompletion = typeof labCompletionsTable.$inferSelect;

// ─── Exam Attempts ────────────────────────────────────────────────────────────
// Tracks student attempts on unit, stage, and level exams.
// examType: "unit" | "stage" | "level"
// examBankId: references the respective exam table's id
// examNumber: 1, 2, or 3 (which alternative bank)
export const examAttemptsTable = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  examType: text("exam_type").notNull(),
  examBankId: integer("exam_bank_id"),
  examNumber: integer("exam_number").notNull().default(1),
  contextId: integer("context_id").notNull(),
  answers: jsonb("answers").notNull().default({}),
  perQuestionResults: jsonb("per_question_results").notNull().default([]),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_exam_attempts_user_type").on(t.userId, t.examType),
  index("idx_exam_attempts_user_context").on(t.userId, t.examType, t.contextId),
]);

export const insertExamAttemptSchema = createInsertSchema(examAttemptsTable).omit({ id: true, createdAt: true });
export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;
export type ExamAttempt = typeof examAttemptsTable.$inferSelect;
