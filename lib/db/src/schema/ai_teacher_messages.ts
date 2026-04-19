import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiTeacherMessagesTable = pgTable("ai_teacher_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectName: text("subject_name"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  isDiagnostic: integer("is_diagnostic").notNull().default(0),
  stageIndex: integer("stage_index"),
  courseId: integer("course_id"),
  courseName: text("course_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ai_teacher_messages_user_subject_idx").on(t.userId, t.subjectId, t.createdAt),
  index("ai_teacher_messages_created_idx").on(t.createdAt),
]);

export const insertAiTeacherMessageSchema = createInsertSchema(aiTeacherMessagesTable).omit({ id: true, createdAt: true });
export type InsertAiTeacherMessage = z.infer<typeof insertAiTeacherMessageSchema>;
export type AiTeacherMessage = typeof aiTeacherMessagesTable.$inferSelect;
