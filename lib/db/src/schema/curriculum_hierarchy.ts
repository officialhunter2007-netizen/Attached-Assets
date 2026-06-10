import { pgTable, serial, integer, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { specialtiesTable } from "./specialties";

// ─── Levels (5 per specialty) ─────────────────────────────────────────────────
export const levelsTable = pgTable("levels", {
  id: serial("id").primaryKey(),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  levelNumber: integer("level_number").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("uq_level_specialty_number").on(t.specialtyId, t.levelNumber),
  index("idx_levels_specialty").on(t.specialtyId),
]);

export const insertLevelSchema = createInsertSchema(levelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLevel = z.infer<typeof insertLevelSchema>;
export type Level = typeof levelsTable.$inferSelect;

// ─── Stages (7 per level) ─────────────────────────────────────────────────────
export const stagesTable = pgTable("stages", {
  id: serial("id").primaryKey(),
  levelId: integer("level_id").notNull().references(() => levelsTable.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("uq_stage_level_number").on(t.levelId, t.stageNumber),
  index("idx_stages_level").on(t.levelId),
]);

export const insertStageSchema = createInsertSchema(stagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stagesTable.$inferSelect;

// ─── Units (9 per stage) ──────────────────────────────────────────────────────
export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => stagesTable.id, { onDelete: "cascade" }),
  unitNumber: integer("unit_number").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("uq_unit_stage_number").on(t.stageId, t.unitNumber),
  index("idx_units_stage").on(t.stageId),
]);

export const insertUnitSchema = createInsertSchema(unitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;

// ─── Lessons (10 per unit) ────────────────────────────────────────────────────
export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  lessonNumber: integer("lesson_number").notNull(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  content: text("content"),
  contentAr: text("content_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("uq_lesson_unit_number").on(t.unitId, t.lessonNumber),
  index("idx_lessons_unit").on(t.unitId),
]);

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;

// ─── Unit Prerequisites (self-referencing junction) ───────────────────────────
export const unitPrerequisitesTable = pgTable("unit_prerequisites", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  prerequisiteUnitId: integer("prerequisite_unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_unit_prerequisite").on(t.unitId, t.prerequisiteUnitId),
  index("idx_unit_prerequisites_unit").on(t.unitId),
  index("idx_unit_prerequisites_prereq").on(t.prerequisiteUnitId),
]);

export type UnitPrerequisite = typeof unitPrerequisitesTable.$inferSelect;
export type InsertUnitPrerequisite = typeof unitPrerequisitesTable.$inferInsert;

// ─── Unit Enables (self-referencing junction) ─────────────────────────────────
export const unitEnablesTable = pgTable("unit_enables", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  enablesUnitId: integer("enables_unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_unit_enables").on(t.unitId, t.enablesUnitId),
  index("idx_unit_enables_unit").on(t.unitId),
  index("idx_unit_enables_enables").on(t.enablesUnitId),
]);

export type UnitEnable = typeof unitEnablesTable.$inferSelect;
export type InsertUnitEnable = typeof unitEnablesTable.$inferInsert;

// ─── Lesson Prerequisites (self-referencing junction) ─────────────────────────
export const lessonPrerequisitesTable = pgTable("lesson_prerequisites", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  prerequisiteLessonId: integer("prerequisite_lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_lesson_prerequisite").on(t.lessonId, t.prerequisiteLessonId),
  index("idx_lesson_prerequisites_lesson").on(t.lessonId),
  index("idx_lesson_prerequisites_prereq").on(t.prerequisiteLessonId),
]);

export type LessonPrerequisite = typeof lessonPrerequisitesTable.$inferSelect;
export type InsertLessonPrerequisite = typeof lessonPrerequisitesTable.$inferInsert;

// ─── Lesson Enables (self-referencing junction) ───────────────────────────────
export const lessonEnablesTable = pgTable("lesson_enables", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  enablesLessonId: integer("enables_lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_lesson_enables").on(t.lessonId, t.enablesLessonId),
  index("idx_lesson_enables_lesson").on(t.lessonId),
  index("idx_lesson_enables_enables").on(t.enablesLessonId),
]);

export type LessonEnable = typeof lessonEnablesTable.$inferSelect;
export type InsertLessonEnable = typeof lessonEnablesTable.$inferInsert;
