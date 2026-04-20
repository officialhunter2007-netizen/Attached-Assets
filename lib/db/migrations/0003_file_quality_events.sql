-- Migration: Add file_quality_events table
-- Applied via: pnpm --filter @workspace/db run push
--
-- Records every quality-heuristic verdict for an uploaded / OCR'd course file
-- so we have visibility into how often the heuristic fires "suspicious" and
-- can revisit the thresholds in computeQuality after real traffic.
CREATE TABLE IF NOT EXISTS "file_quality_events" (
  "id"                serial PRIMARY KEY,
  "file_id"           integer,
  "course_id"         integer,
  "user_id"           integer,
  "source"            text NOT NULL,
  "quality"           text NOT NULL,
  "quality_reason"    text,
  "letter_ratio"      double precision NOT NULL,
  "ws_ratio"          double precision NOT NULL,
  "replacement_ratio" double precision NOT NULL,
  "avg_line_len"      double precision NOT NULL,
  "sample_chars"      integer NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "file_quality_events_created_idx"
  ON "file_quality_events" ("created_at");
CREATE INDEX IF NOT EXISTS "file_quality_events_quality_idx"
  ON "file_quality_events" ("quality", "quality_reason");
