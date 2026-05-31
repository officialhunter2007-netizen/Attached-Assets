import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const lessonSummariesTable = pgTable("lesson_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull(),
  subjectName: text("subject_name").notNull(),
  title: text("title").notNull().default(""),
  summaryHtml: text("summary_html").notNull(),
  conversationDate: timestamp("conversation_date", { withTimezone: true }).notNull().defaultNow(),
  messagesCount: integer("messages_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
