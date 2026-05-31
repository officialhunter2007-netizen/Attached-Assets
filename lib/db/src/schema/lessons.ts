import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cachedLessonsTable = pgTable("cached_lessons", {
  id: serial("id").primaryKey(),
  lessonKey: text("lesson_key").notNull().unique(),
  section: text("section").notNull(),
  gradeOrSpecialization: text("grade_or_specialization"),
  subject: text("subject").notNull(),
  unitTitle: text("unit_title").notNull(),
  lessonTitle: text("lesson_title").notNull(),
  contentAr: text("content_ar").notNull(),
  viewCount: integer("view_count").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCachedLessonSchema = createInsertSchema(cachedLessonsTable).omit({ id: true, createdAt: true });
export type InsertCachedLesson = z.infer<typeof insertCachedLessonSchema>;
export type CachedLesson = typeof cachedLessonsTable.$inferSelect;

export const lessonViewsTable = pgTable("lesson_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  unitId: text("unit_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  lessonTitle: text("lesson_title").notNull(),
  subjectName: text("subject_name").notNull(),
  pointsEarned: integer("points_earned").notNull().default(15),
  challengeAnswered: boolean("challenge_answered").notNull().default(false),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLessonViewSchema = createInsertSchema(lessonViewsTable).omit({ id: true, viewedAt: true });
export type InsertLessonView = z.infer<typeof insertLessonViewSchema>;
export type LessonView = typeof lessonViewsTable.$inferSelect;
