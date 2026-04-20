-- Migration: Add OCR-related columns to user_course_files
-- Applied via: pnpm --filter @workspace/db run push
--
-- We persist the original PDF bytes so students can re-extract a file with
-- OCR later if the cheap pdf-parse path produced garbled text. ocr_applied_at
-- records when an OCR re-extraction successfully replaced extracted_text.
ALTER TABLE "user_course_files"
  ADD COLUMN IF NOT EXISTS "original_bytes" bytea,
  ADD COLUMN IF NOT EXISTS "ocr_applied_at" timestamp with time zone;
