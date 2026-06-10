import { pgTable, serial, integer, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { specialtiesTable } from "./specialties";

// ─── Student Paths (Custom vs Booklet) ────────────────────────────────────────
export const studentPathsTable = pgTable("student_paths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  pathType: text("path_type").notNull().default("custom"),
  pathData: jsonb("path_data").notNull().default({}),
  isActive: integer("is_active").notNull().default(1),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_student_paths_user_specialty").on(t.userId, t.specialtyId, t.isActive),
]);

export const insertStudentPathSchema = createInsertSchema(studentPathsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudentPath = z.infer<typeof insertStudentPathSchema>;
export type StudentPath = typeof studentPathsTable.$inferSelect;

// ─── Student Booklets ─────────────────────────────────────────────────────────
export const studentBookletsTable = pgTable("student_booklets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  studentPathId: integer("student_path_id").references(() => studentPathsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  bookletType: text("booklet_type").notNull().default("study"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_student_booklets_user").on(t.userId),
  index("idx_student_booklets_path").on(t.studentPathId),
]);

export const insertStudentBookletSchema = createInsertSchema(studentBookletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudentBooklet = z.infer<typeof insertStudentBookletSchema>;
export type StudentBooklet = typeof studentBookletsTable.$inferSelect;

// ─── Booklet Chunks (with embeddings and page numbers) ────────────────────────
export const bookletChunksTable = pgTable("booklet_chunks", {
  id: serial("id").primaryKey(),
  studentBookletId: integer("student_booklet_id").notNull().references(() => studentBookletsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  contentAr: text("content_ar"),
  embedding: text("embedding"),
  pageNumber: integer("page_number"),
  chunkIndex: integer("chunk_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_booklet_chunks_booklet").on(t.studentBookletId),
]);

export const insertBookletChunkSchema = createInsertSchema(bookletChunksTable).omit({ id: true, createdAt: true });
export type InsertBookletChunk = z.infer<typeof insertBookletChunkSchema>;
export type BookletChunk = typeof bookletChunksTable.$inferSelect;
