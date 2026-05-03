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
  // Length telemetry (assistant messages only — null for user rows).
  // wordCount = whitespace-split word count of the cleaned response.
  // overLength = 1 when the response exceeded the tier soft-cap by >25%
  // (computed server-side from the response tier classifier in /ai/teach).
  // The flag never truncates the student-facing response — it is purely a
  // signal for admin review so we can find prompts that bloat outputs.
  wordCount: integer("word_count"),
  overLength: integer("over_length"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ai_teacher_messages_user_subject_idx").on(t.userId, t.subjectId, t.createdAt),
  index("ai_teacher_messages_created_idx").on(t.createdAt),
]);

export const insertAiTeacherMessageSchema = createInsertSchema(aiTeacherMessagesTable).omit({ id: true, createdAt: true });
export type InsertAiTeacherMessage = z.infer<typeof insertAiTeacherMessageSchema>;
export type AiTeacherMessage = typeof aiTeacherMessagesTable.$inferSelect;
