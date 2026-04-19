import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSpecializationCoursesTable = pgTable("user_specialization_courses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  specializationId: text("specialization_id").notNull(),
  courseName: text("course_name").notNull(),
  emoji: text("emoji").notNull().default("📘"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("user_spec_courses_user_spec_idx").on(t.userId, t.specializationId),
]);

export const insertUserSpecializationCourseSchema = createInsertSchema(userSpecializationCoursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserSpecializationCourse = z.infer<typeof insertUserSpecializationCourseSchema>;
export type UserSpecializationCourse = typeof userSpecializationCoursesTable.$inferSelect;

export const userCourseFilesTable = pgTable("user_course_files", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  userId: integer("user_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("user_course_files_course_idx").on(t.courseId),
]);

export const insertUserCourseFileSchema = createInsertSchema(userCourseFilesTable).omit({ id: true, uploadedAt: true });
export type InsertUserCourseFile = z.infer<typeof insertUserCourseFileSchema>;
export type UserCourseFile = typeof userCourseFilesTable.$inferSelect;
