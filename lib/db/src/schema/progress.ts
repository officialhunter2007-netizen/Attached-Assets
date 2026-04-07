import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  section: text("section").notNull(),
  subjectOrSpecialization: text("subject_or_specialization").notNull(),
  gradeOrTrack: text("grade_or_track"),
  completedLessons: integer("completed_lessons").notNull().default(0),
  totalLessons: integer("total_lessons").notNull().default(0),
  masteryPercentage: integer("mastery_percentage").notNull().default(0),
  lastAccessedLesson: text("last_accessed_lesson"),
  lastAccessedUnit: text("last_accessed_unit"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserProgressSchema = createInsertSchema(userProgressTable).omit({ id: true, updatedAt: true });
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgressTable.$inferSelect;

export const learningPathsTable = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  motivation: text("motivation"),
  duration: text("duration"),
  outcome: text("outcome"),
  planHtml: text("plan_html"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLearningPathSchema = createInsertSchema(learningPathsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type LearningPath = typeof learningPathsTable.$inferSelect;
