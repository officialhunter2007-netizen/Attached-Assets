-- Migration: track chapters the student manually skipped over
ALTER TABLE "material_chapter_progress"
  ADD COLUMN IF NOT EXISTS "skipped_chapter_indices" text NOT NULL DEFAULT '[]';
