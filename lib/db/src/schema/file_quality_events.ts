import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";

// Lightweight audit trail of every text-extraction quality decision so we can
// revisit the thresholds in computeQuality after a week of real traffic. We
// store the metric values (not just the verdict) so we can ask questions like
// "what does the letterRatio distribution look like for files we marked
// suspicious vs good?" without re-running extraction.
export const fileQualityEventsTable = pgTable("file_quality_events", {
  id: serial("id").primaryKey(),
  // fileId / courseId / userId are nullable so the row survives a later
  // cascade-delete of the underlying file or course; we still want the
  // historical signal.
  fileId: integer("file_id"),
  courseId: integer("course_id"),
  userId: integer("user_id"),
  // "upload" = first text extraction at upload time.
  // "ocr"    = re-extraction via the OCR endpoint.
  source: text("source").notNull(),
  quality: text("quality").notNull(), // "good" | "suspicious"
  qualityReason: text("quality_reason"), // null when quality == good
  letterRatio: doublePrecision("letter_ratio").notNull(),
  wsRatio: doublePrecision("ws_ratio").notNull(),
  replacementRatio: doublePrecision("replacement_ratio").notNull(),
  avgLineLen: doublePrecision("avg_line_len").notNull(),
  sampleChars: integer("sample_chars").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("file_quality_events_created_idx").on(t.createdAt),
  index("file_quality_events_quality_idx").on(t.quality, t.qualityReason),
]);

export type FileQualityEvent = typeof fileQualityEventsTable.$inferSelect;
