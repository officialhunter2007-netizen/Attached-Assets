// ─────────────────────────────────────────────────────────────────────────────
// v4 task #8 — Booklet path schema.
//
// student_booklets : one row per uploaded PDF.
//   - instruction_tree (jsonb) — Gemini-generated outline:
//       { units: [{ unitIndex, code, name, pages:[start,end],
//                   lessons:[{ lessonIndex, code, name, pages:[start,end],
//                              objective:string }] }] }
//   - status: 'processing' | 'ready' | 'failed'
//
// booklet_chunks   : ~500-word chunks with embeddings (stored as jsonb
//   float array — JS cosine retrieval, no pgvector dependency).
//
// Parallel to legacy book_units / v4 tables. The booklet flow runs on
// its own routes (/api/v4/booklet/*) and does NOT touch v4_lessons.
// ─────────────────────────────────────────────────────────────────────────────
import { pgTable, text, serial, timestamp, integer, jsonb, index, uniqueIndex, real } from "drizzle-orm/pg-core";

export const v4StudentBookletsTable = pgTable("v4_student_booklets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  title: text("title").notNull(),
  pagesCount: integer("pages_count").notNull().default(0),
  // Full Gemini-generated outline (see header).
  instructionTree: jsonb("instruction_tree").notNull().default({}),
  status: text("status").notNull().default("processing"),
  // Live processing stage for the FE progress bar:
  //   'extracting' | 'chunking' | 'embedding' | 'binding' | 'done' | 'failed'
  processingStage: text("processing_stage").notNull().default("extracting"),
  // 0-100 within the current stage (bar uses stage index + this).
  processingPercent: integer("processing_percent").notNull().default(0),
  errorMessage: text("error_message"),
  // Prep cost actually charged from the v4 wallet (in USD).
  prepCostUsd: real("prep_cost_usd").notNull().default(0),
  // SHA-256 of the full PDF bytes. Used for explicit (user, subject, hash)
  // dedupe so re-uploads return the existing booklet instead of re-paying.
  contentHash: text("content_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_v4_booklets_user_subject").on(t.userId, t.subjectId),
  uniqueIndex("uq_v4_booklets_user_subject_hash").on(t.userId, t.subjectId, t.contentHash),
]);

export const v4BookletChunksTable = pgTable("v4_booklet_chunks", {
  id: serial("id").primaryKey(),
  bookletId: integer("booklet_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  chunkIdx: integer("chunk_idx").notNull(),
  chunkText: text("chunk_text").notNull(),
  // Float array, length = 1536 (text-embedding-3-small). jsonb so the
  // schema is portable across PG installs without pgvector.
  embedding: jsonb("embedding").notNull(),
}, (t) => [
  index("idx_v4_booklet_chunks_booklet").on(t.bookletId),
  index("idx_v4_booklet_chunks_booklet_page").on(t.bookletId, t.pageNumber),
]);

export type V4StudentBooklet = typeof v4StudentBookletsTable.$inferSelect;
export type InsertV4StudentBooklet = typeof v4StudentBookletsTable.$inferInsert;
export type V4BookletChunk = typeof v4BookletChunksTable.$inferSelect;
export type InsertV4BookletChunk = typeof v4BookletChunksTable.$inferInsert;
