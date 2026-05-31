import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const labReportsTable = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").notNull(),
  subjectName: text("subject_name").notNull().default(""),
  envTitle: text("env_title").notNull().default(""),
  envBriefing: text("env_briefing").notNull().default(""),
  reportText: text("report_text").notNull(),
  feedbackHtml: text("feedback_html").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
