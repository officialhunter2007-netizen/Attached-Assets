import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unitsTable, stagesTable, levelsTable } from "./curriculum_hierarchy";
import { specialtiesTable } from "./specialties";

// ─── Unit Exams (3 alternative banks per unit) ────────────────────────────────
export const unitExamsTable = pgTable("unit_exams", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  examNumber: integer("exam_number").notNull(),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  options: text("options").notNull().default("[]"),
  optionsAr: text("options_ar"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationAr: text("explanation_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_unit_exam_bank").on(t.unitId, t.examNumber, t.orderIndex),
  index("idx_unit_exams_unit").on(t.unitId),
]);

export const insertUnitExamSchema = createInsertSchema(unitExamsTable).omit({ id: true, createdAt: true });
export type InsertUnitExam = z.infer<typeof insertUnitExamSchema>;
export type UnitExam = typeof unitExamsTable.$inferSelect;

// ─── Stage Exams (3 alternative banks per stage) ──────────────────────────────
export const stageExamsTable = pgTable("stage_exams", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => stagesTable.id, { onDelete: "cascade" }),
  examNumber: integer("exam_number").notNull(),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  options: text("options").notNull().default("[]"),
  optionsAr: text("options_ar"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationAr: text("explanation_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_stage_exam_bank").on(t.stageId, t.examNumber, t.orderIndex),
  index("idx_stage_exams_stage").on(t.stageId),
]);

export const insertStageExamSchema = createInsertSchema(stageExamsTable).omit({ id: true, createdAt: true });
export type InsertStageExam = z.infer<typeof insertStageExamSchema>;
export type StageExam = typeof stageExamsTable.$inferSelect;

// ─── Level Exams (3 alternative banks per level) ──────────────────────────────
export const levelExamsTable = pgTable("level_exams", {
  id: serial("id").primaryKey(),
  levelId: integer("level_id").notNull().references(() => levelsTable.id, { onDelete: "cascade" }),
  examNumber: integer("exam_number").notNull(),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  options: text("options").notNull().default("[]"),
  optionsAr: text("options_ar"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationAr: text("explanation_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_level_exam_bank").on(t.levelId, t.examNumber, t.orderIndex),
  index("idx_level_exams_level").on(t.levelId),
]);

export const insertLevelExamSchema = createInsertSchema(levelExamsTable).omit({ id: true, createdAt: true });
export type InsertLevelExam = z.infer<typeof insertLevelExamSchema>;
export type LevelExam = typeof levelExamsTable.$inferSelect;

// ─── Placement Test Questions ─────────────────────────────────────────────────
export const placementTestQuestionsTable = pgTable("placement_test_questions", {
  id: serial("id").primaryKey(),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  options: text("options").notNull().default("[]"),
  optionsAr: text("options_ar"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationAr: text("explanation_ar"),
  difficulty: integer("difficulty").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_placement_test_specialty").on(t.specialtyId, t.difficulty),
]);

export const insertPlacementTestQuestionSchema = createInsertSchema(placementTestQuestionsTable).omit({ id: true, createdAt: true });
export type InsertPlacementTestQuestion = z.infer<typeof insertPlacementTestQuestionSchema>;
export type PlacementTestQuestion = typeof placementTestQuestionsTable.$inferSelect;
