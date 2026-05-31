-- Migration: track when a student last interacted with a material's chapter progress.
-- Nullable on purpose — only real progress writes (mutateProgress) populate this.
-- Untouched / freshly hydrated rows leave it NULL so the dashboard falls back to
-- the material's upload time.
ALTER TABLE "material_chapter_progress"
  ADD COLUMN IF NOT EXISTS "last_interacted_at" timestamp with time zone;
