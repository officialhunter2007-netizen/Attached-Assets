import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quizAttemptsTable = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  materialId: integer("material_id").notNull(),
  subjectId: text("subject_id").notNull(),
  kind: text("kind").notNull(),
  chapterIndex: integer("chapter_index"),
  chapterTitle: text("chapter_title"),
  questions: text("questions").notNull().default("[]"),
  answers: text("answers").notNull().default("{}"),
  perQuestionResults: text("per_question_results").notNull().default("[]"),
  weakAreas: text("weak_areas").notNull().default("[]"),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
}, (t) => [
  index("quiz_attempts_user_material_idx").on(t.userId, t.materialId),
  index("quiz_attempts_user_subject_idx").on(t.userId, t.subjectId),
]);

export const insertQuizAttemptSchema = createInsertSchema(quizAttemptsTable).omit({ id: true, createdAt: true });
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttemptsTable.$inferSelect;
