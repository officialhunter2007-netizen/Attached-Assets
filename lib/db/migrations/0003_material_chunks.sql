-- Migration: Add material_chunks table for per-page retrieval
CREATE TABLE IF NOT EXISTS "material_chunks" (
  "id" serial PRIMARY KEY NOT NULL,
  "material_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "page_number" integer NOT NULL,
  "chunk_index" integer NOT NULL DEFAULT 0,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "material_chunks_material_idx"
  ON "material_chunks" ("material_id");

CREATE INDEX IF NOT EXISTS "material_chunks_material_page_idx"
  ON "material_chunks" ("material_id", "page_number");

-- Full-text search index using the 'simple' configuration so it works for both
-- Arabic and English (no language-specific stemming, just case-folding + tokenization).
CREATE INDEX IF NOT EXISTS "material_chunks_content_fts_idx"
  ON "material_chunks" USING GIN (to_tsvector('simple', "content"));
