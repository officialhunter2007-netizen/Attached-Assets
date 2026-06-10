import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { lessonsTable } from "./curriculum_hierarchy";

export const lessonConceptsTable = pgTable("lesson_concepts", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  concept: text("concept").notNull(),
  conceptAr: text("concept_ar"),
  masteryCriteria: text("mastery_criteria"),
  masteryCriteriaAr: text("mastery_criteria_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_lesson_concepts_lesson").on(t.lessonId),
]);

export const insertLessonConceptSchema = createInsertSchema(lessonConceptsTable).omit({ id: true, createdAt: true });
export type InsertLessonConcept = z.infer<typeof insertLessonConceptSchema>;
export type LessonConcept = typeof lessonConceptsTable.$inferSelect;

export const lessonCommonMistakesTable = pgTable("lesson_common_mistakes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  mistake: text("mistake").notNull(),
  mistakeAr: text("mistake_ar"),
  correction: text("correction").notNull(),
  correctionAr: text("correction_ar"),
  treatment: text("treatment"),
  treatmentAr: text("treatment_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_lesson_common_mistakes_lesson").on(t.lessonId),
]);

export const insertLessonCommonMistakeSchema = createInsertSchema(lessonCommonMistakesTable).omit({ id: true, createdAt: true });
export type InsertLessonCommonMistake = z.infer<typeof insertLessonCommonMistakeSchema>;
export type LessonCommonMistake = typeof lessonCommonMistakesTable.$inferSelect;
