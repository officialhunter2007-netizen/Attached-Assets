-- Migration: Add lesson_summaries table
-- Applied via: pnpm --filter @workspace/db run push-force
CREATE TABLE IF NOT EXISTS "lesson_summaries" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject_id" text NOT NULL,
  "subject_name" text NOT NULL,
  "summary_html" text NOT NULL,
  "conversation_date" timestamp with time zone DEFAULT now() NOT NULL,
  "messages_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
