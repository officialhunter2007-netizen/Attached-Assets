-- Migration: Add quiz_attempts table for chapter quizzes & final exams
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "material_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "kind" text NOT NULL,
  "chapter_index" integer,
  "chapter_title" text,
  "questions" text NOT NULL DEFAULT '[]',
  "answers" text NOT NULL DEFAULT '{}',
  "per_question_results" text NOT NULL DEFAULT '[]',
  "weak_areas" text NOT NULL DEFAULT '[]',
  "total_questions" integer NOT NULL DEFAULT 0,
  "correct_count" integer NOT NULL DEFAULT 0,
  "score" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'in_progress',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_material_idx"
  ON "quiz_attempts" ("user_id", "material_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_subject_idx"
  ON "quiz_attempts" ("user_id", "subject_id");
