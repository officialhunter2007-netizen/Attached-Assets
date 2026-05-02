import { pgTable, serial, integer, text, timestamp, uniqueIndex, index, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const courseMaterialsTable = pgTable("course_materials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  status: text("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  pageCount: integer("page_count").notNull().default(0),
  language: text("language"),
  extractedText: text("extracted_text"),
  outline: text("outline"),
  structuredOutline: text("structured_outline"),
  summary: text("summary"),
  starters: text("starters"),
  printedPageOffset: integer("printed_page_offset").notNull().default(0),
  role: text("role").notNull().default("primary"),
  coverageStatus: text("coverage_status").notNull().default("ok"),
  processingMetrics: text("processing_metrics"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("course_materials_user_subject_idx").on(t.userId, t.subjectId),
]);

export const insertCourseMaterialSchema = createInsertSchema(courseMaterialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourseMaterial = z.infer<typeof insertCourseMaterialSchema>;
export type CourseMaterial = typeof courseMaterialsTable.$inferSelect;

export const userSubjectTeachingModesTable = pgTable("user_subject_teaching_modes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  mode: text("mode").notNull().default("unset"),
  activeMaterialId: integer("active_material_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_subject_teaching_mode_idx").on(t.userId, t.subjectId),
]);

export const insertTeachingModeSchema = createInsertSchema(userSubjectTeachingModesTable).omit({ id: true, updatedAt: true });
export type InsertTeachingMode = z.infer<typeof insertTeachingModeSchema>;
export type UserSubjectTeachingMode = typeof userSubjectTeachingModesTable.$inferSelect;

export const materialChapterProgressTable = pgTable("material_chapter_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  materialId: integer("material_id").notNull(),
  chapters: text("chapters").notNull().default("[]"),
  currentChapterIndex: integer("current_chapter_index").notNull().default(0),
  completedChapterIndices: text("completed_chapter_indices").notNull().default("[]"),
  skippedChapterIndices: text("skipped_chapter_indices").notNull().default("[]"),
  coveredPoints: text("covered_points").notNull().default("{}"),
  lastInteractedAt: timestamp("last_interacted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("material_chapter_progress_user_material_idx").on(t.userId, t.materialId),
]);

export const insertMaterialChapterProgressSchema = createInsertSchema(materialChapterProgressTable).omit({ id: true, updatedAt: true });
export type InsertMaterialChapterProgress = z.infer<typeof insertMaterialChapterProgressSchema>;
export type MaterialChapterProgress = typeof materialChapterProgressTable.$inferSelect;

export const materialChunksTable = pgTable("material_chunks", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  content: text("content").notNull(),
  // Arabic-normalized version of `content` for FTS — alef variants unified,
  // diacritics stripped, Arabic-Indic digits → ASCII. The tsvector index
  // (built in auto-migrate) targets this column so search queries run
  // through the same normalize() function find the right rows.
  contentNormalized: text("content_normalized"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("material_chunks_material_idx").on(t.materialId),
  index("material_chunks_material_page_idx").on(t.materialId, t.pageNumber),
]);

export const insertMaterialChunkSchema = createInsertSchema(materialChunksTable).omit({ id: true, createdAt: true });
export type InsertMaterialChunk = z.infer<typeof insertMaterialChunkSchema>;
export type MaterialChunk = typeof materialChunksTable.$inferSelect;

// Per-page OCR/extraction status for partial-coverage tracking and retry.
// One row per (materialId, pageNumber). Status is one of:
//   * 'ok'              — text was extracted (native or OCR) successfully
//   * 'failed'          — OCR returned nothing usable; retry candidate
//   * 'low_confidence'  — text returned but unusually short/garbled
// `lastProvider` records which OCR provider answered last so retry can
// try a *different* one rather than re-hammering the same failed one.
export const materialPageStatusTable = pgTable("material_page_status", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  status: text("status").notNull().default("ok"),
  attempts: integer("attempts").notNull().default(1),
  lastProvider: text("last_provider"),
  errorMessage: text("error_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("material_page_status_material_page_idx").on(t.materialId, t.pageNumber),
]);

export type MaterialPageStatus = typeof materialPageStatusTable.$inferSelect;

// Stores the raw PDF bytes for a course material. Kept in a separate table so
// the bytea column (which can be tens of MB) is never accidentally pulled into
// list/detail queries that only need metadata. The ON DELETE CASCADE is
// declared at the database level via the foreign key reference below.
export const courseMaterialBlobsTable = pgTable("course_material_blobs", {
  materialId: integer("material_id").primaryKey().references(() => courseMaterialsTable.id, { onDelete: "cascade" }),
  pdfData: bytea("pdf_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CourseMaterialBlob = typeof courseMaterialBlobsTable.$inferSelect;
