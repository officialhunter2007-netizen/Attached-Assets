-- Migration: Add material_chapter_progress table
CREATE TABLE IF NOT EXISTS "material_chapter_progress" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "material_id" integer NOT NULL,
  "chapters" text NOT NULL DEFAULT '[]',
  "current_chapter_index" integer NOT NULL DEFAULT 0,
  "completed_chapter_indices" text NOT NULL DEFAULT '[]',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "material_chapter_progress_user_material_idx"
  ON "material_chapter_progress" ("user_id", "material_id");
