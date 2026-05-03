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
  // Length telemetry (assistant rows only). overLength=1 when wordCount
  // exceeded the response tier's word cap by >10%.
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
