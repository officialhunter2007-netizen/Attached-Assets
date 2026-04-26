import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentMistakesTable = pgTable("student_mistakes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  topic: text("topic").notNull(),
  mistake: text("mistake").notNull(),
  correction: text("correction"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("student_mistakes_user_subject_idx").on(t.userId, t.subjectId, t.resolved),
]);

export const insertStudentMistakeSchema = createInsertSchema(studentMistakesTable).omit({ id: true, createdAt: true });
export type InsertStudentMistake = z.infer<typeof insertStudentMistakeSchema>;
export type StudentMistake = typeof studentMistakesTable.$inferSelect;

export const studyCardsTable = pgTable("study_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  stageIndex: integer("stage_index"),
  stageName: text("stage_name"),
  cardHtml: text("card_html").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("study_cards_user_subject_idx").on(t.userId, t.subjectId, t.createdAt),
]);

export const insertStudyCardSchema = createInsertSchema(studyCardsTable).omit({ id: true, createdAt: true });
export type InsertStudyCard = z.infer<typeof insertStudyCardSchema>;
export type StudyCard = typeof studyCardsTable.$inferSelect;
