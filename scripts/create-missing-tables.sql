-- Create all missing core tables for Nukhba platform
-- Run with: psql $DATABASE_URL -f scripts/create-missing-tables.sql
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS throughout

-- ── Core: users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "password_hash" text,
  "google_id" text,
  "display_name" text,
  "profile_image" text,
  "role" text NOT NULL DEFAULT 'user',
  "onboarding_done" boolean NOT NULL DEFAULT false,
  "points" integer NOT NULL DEFAULT 0,
  "streak_days" integer NOT NULL DEFAULT 0,
  "last_active" text,
  "badges" text[] NOT NULL DEFAULT '{}',
  "nukhba_plan" text,
  "region" text,
  "messages_used" integer NOT NULL DEFAULT 0,
  "messages_limit" integer NOT NULL DEFAULT 0,
  "subscription_expires_at" timestamp with time zone,
  "gems_balance" integer NOT NULL DEFAULT 0,
  "gems_used_today" integer NOT NULL DEFAULT 0,
  "gems_daily_limit" integer NOT NULL DEFAULT 0,
  "gems_reset_date" text,
  "gems_expires_at" timestamp with time zone,
  "referral_access_until" timestamp with time zone,
  "first_lesson_complete" boolean NOT NULL DEFAULT false,
  "referral_code" text,
  "last_session_date" text,
  "last_session_at" timestamp with time zone,
  "referral_sessions_left" integer NOT NULL DEFAULT 0,
  "tryhackme_username" text,
  "sub_page_first_visited_at" timestamp with time zone,
  "sub_page_left_at" timestamp with time zone,
  "welcome_offer_shown_at" timestamp with time zone,
  "welcome_offer_expires_at" timestamp with time zone,
  "welcome_offer_used_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Conversations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY,
  "conversation_id" integer NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Subscriptions & payments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscription_requests" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "user_email" text NOT NULL,
  "user_name" text,
  "account_name" text NOT NULL DEFAULT '',
  "transaction_id" text,
  "plan_type" text NOT NULL,
  "region" text NOT NULL,
  "subject_id" text NOT NULL DEFAULT 'all',
  "subject_name" text,
  "status" text NOT NULL DEFAULT 'pending',
  "activation_code" text,
  "notes" text,
  "admin_note" text,
  "discount_code_id" integer,
  "discount_code" text,
  "discount_percent" integer,
  "base_price" integer,
  "final_price" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "discount_codes" (
  "id" serial PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "percent" integer NOT NULL,
  "note" text,
  "active" boolean NOT NULL DEFAULT true,
  "usage_count" integer NOT NULL DEFAULT 0,
  "max_uses" integer,
  "per_user_limit" integer,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_by_user_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "activation_cards" (
  "id" serial PRIMARY KEY,
  "activation_code" text NOT NULL UNIQUE,
  "plan_type" text NOT NULL,
  "region" text,
  "subject_id" text,
  "subject_name" text,
  "is_used" boolean NOT NULL DEFAULT false,
  "used_by_user_id" integer,
  "used_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "subscription_request_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user_subject_subscriptions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "subject_name" text,
  "plan" text NOT NULL,
  "messages_used" integer NOT NULL DEFAULT 0,
  "messages_limit" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "activation_code" text,
  "subscription_request_id" integer,
  "paid_price_yer" integer NOT NULL DEFAULT 0,
  "region" text,
  "gems_balance" integer NOT NULL DEFAULT 0,
  "gems_used_today" integer NOT NULL DEFAULT 0,
  "gems_daily_limit" integer NOT NULL DEFAULT 0,
  "gems_reset_date" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user_subject_first_lessons" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "free_messages_used" integer NOT NULL DEFAULT 0,
  "completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_subject_first_lesson" ON "user_subject_first_lessons"("user_id", "subject_id");

CREATE TABLE IF NOT EXISTS "user_subject_plans" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "plan_html" text NOT NULL,
  "current_stage_index" integer NOT NULL DEFAULT 0,
  "current_micro_step_index" integer NOT NULL DEFAULT 0,
  "completed_micro_steps" text NOT NULL DEFAULT '[]',
  "growth_reflections" text NOT NULL DEFAULT '[]',
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_subject_plans_user_subject_idx" ON "user_subject_plans"("user_id", "subject_id");

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "user_name" text,
  "user_email" text,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "is_from_admin" boolean NOT NULL DEFAULT false,
  "is_read" boolean NOT NULL DEFAULT false,
  "thread_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Lessons ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "cached_lessons" (
  "id" serial PRIMARY KEY,
  "lesson_key" text NOT NULL UNIQUE,
  "section" text NOT NULL,
  "grade_or_specialization" text,
  "subject" text NOT NULL,
  "unit_title" text NOT NULL,
  "lesson_title" text NOT NULL,
  "content_ar" text NOT NULL,
  "view_count" integer NOT NULL DEFAULT 0,
  "is_free" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "lesson_views" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "unit_id" text NOT NULL,
  "lesson_id" text NOT NULL,
  "lesson_title" text NOT NULL,
  "subject_name" text NOT NULL,
  "points_earned" integer NOT NULL DEFAULT 15,
  "challenge_answered" boolean NOT NULL DEFAULT false,
  "viewed_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Progress ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_progress" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "section" text NOT NULL,
  "subject_or_specialization" text NOT NULL,
  "grade_or_track" text,
  "completed_lessons" integer NOT NULL DEFAULT 0,
  "total_lessons" integer NOT NULL DEFAULT 0,
  "mastery_percentage" integer NOT NULL DEFAULT 0,
  "last_accessed_lesson" text,
  "last_accessed_unit" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "learning_paths" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "motivation" text,
  "duration" text,
  "outcome" text,
  "plan_html" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── AI Teacher Messages ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_teacher_messages" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "subject_name" text,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "is_diagnostic" integer NOT NULL DEFAULT 0,
  "stage_index" integer,
  "word_count" integer,
  "over_length" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "ai_teacher_messages_user_subject_idx" ON "ai_teacher_messages"("user_id", "subject_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_teacher_messages_created_idx" ON "ai_teacher_messages"("created_at");

-- ── Lesson Summaries ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lesson_summaries" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject_id" text NOT NULL,
  "subject_name" text NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "summary_html" text NOT NULL,
  "conversation_date" timestamp with time zone NOT NULL DEFAULT NOW(),
  "messages_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Lab Reports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lab_reports" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject_id" text NOT NULL,
  "subject_name" text NOT NULL DEFAULT '',
  "env_title" text NOT NULL DEFAULT '',
  "env_briefing" text NOT NULL DEFAULT '',
  "report_text" text NOT NULL,
  "feedback_html" text NOT NULL DEFAULT '',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Activity Events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "activity_events" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "event_type" text NOT NULL,
  "path" text,
  "label" text,
  "detail" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "activity_events_user_idx" ON "activity_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_events_type_idx" ON "activity_events"("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "activity_events_created_idx" ON "activity_events"("created_at");

-- ── Course Materials ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "course_materials" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "file_name" text NOT NULL,
  "object_path" text NOT NULL,
  "file_size_bytes" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'processing',
  "error_message" text,
  "page_count" integer NOT NULL DEFAULT 0,
  "language" text,
  "extracted_text" text,
  "outline" text,
  "structured_outline" text,
  "summary" text,
  "starters" text,
  "printed_page_offset" integer NOT NULL DEFAULT 0,
  "role" text NOT NULL DEFAULT 'primary',
  "coverage_status" text NOT NULL DEFAULT 'ok',
  "processing_metrics" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "course_materials_user_subject_idx" ON "course_materials"("user_id", "subject_id");

CREATE TABLE IF NOT EXISTS "user_subject_teaching_modes" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "mode" text NOT NULL DEFAULT 'unset',
  "active_material_id" integer,
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_subject_teaching_mode_idx" ON "user_subject_teaching_modes"("user_id", "subject_id");

CREATE TABLE IF NOT EXISTS "material_chapter_progress" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "material_id" integer NOT NULL,
  "chapters" text NOT NULL DEFAULT '[]',
  "current_chapter_index" integer NOT NULL DEFAULT 0,
  "completed_chapter_indices" text NOT NULL DEFAULT '[]',
  "skipped_chapter_indices" text NOT NULL DEFAULT '[]',
  "covered_points" text NOT NULL DEFAULT '{}',
  "last_interacted_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "material_chapter_progress_user_material_idx" ON "material_chapter_progress"("user_id", "material_id");

CREATE TABLE IF NOT EXISTS "material_chunks" (
  "id" serial PRIMARY KEY,
  "material_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "page_number" integer NOT NULL,
  "chunk_index" integer NOT NULL DEFAULT 0,
  "content" text NOT NULL,
  "content_normalized" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "material_chunks_material_idx" ON "material_chunks"("material_id");
CREATE INDEX IF NOT EXISTS "material_chunks_material_page_idx" ON "material_chunks"("material_id", "page_number");

CREATE TABLE IF NOT EXISTS "course_material_blobs" (
  "material_id" integer PRIMARY KEY REFERENCES "course_materials"("id") ON DELETE CASCADE,
  "pdf_data" bytea NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- ── Quiz Attempts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
  "id" serial PRIMARY KEY,
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
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "submitted_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_material_idx" ON "quiz_attempts"("user_id", "material_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_subject_idx" ON "quiz_attempts"("user_id", "subject_id");

-- ── AI Usage Events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "subject_id" text,
  "route" text NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "input_tokens" integer NOT NULL DEFAULT 0,
  "output_tokens" integer NOT NULL DEFAULT 0,
  "cached_input_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd" numeric(14,8) NOT NULL DEFAULT 0,
  "latency_ms" integer,
  "status" text NOT NULL DEFAULT 'success',
  "error_message" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ai_usage_user" ON "ai_usage_events"("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_usage_created" ON "ai_usage_events"("created_at");
CREATE INDEX IF NOT EXISTS "idx_ai_usage_model" ON "ai_usage_events"("model");
CREATE INDEX IF NOT EXISTS "idx_ai_usage_route" ON "ai_usage_events"("route");

-- ── Specialties & Curriculum Hierarchy ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "specialties" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "name_ar" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "description_ar" text,
  "icon" text,
  "color" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_specialties_active_order" ON "specialties"("is_active", "order_index");

CREATE TABLE IF NOT EXISTS "instruction_files" (
  "id" serial PRIMARY KEY,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "title_ar" text,
  "content" text NOT NULL,
  "version" text NOT NULL DEFAULT '1.0',
  "file_date" timestamp with time zone NOT NULL DEFAULT NOW(),
  "file_type" text NOT NULL DEFAULT 'instruction',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_instruction_files_specialty" ON "instruction_files"("specialty_id", "is_active");

CREATE TABLE IF NOT EXISTS "levels" (
  "id" serial PRIMARY KEY,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "level_number" integer NOT NULL,
  "title" text NOT NULL,
  "title_ar" text NOT NULL,
  "description" text,
  "description_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_level_specialty_number" ON "levels"("specialty_id", "level_number");
CREATE INDEX IF NOT EXISTS "idx_levels_specialty" ON "levels"("specialty_id");

CREATE TABLE IF NOT EXISTS "stages" (
  "id" serial PRIMARY KEY,
  "level_id" integer NOT NULL REFERENCES "levels"("id") ON DELETE CASCADE,
  "stage_number" integer NOT NULL,
  "title" text NOT NULL,
  "title_ar" text NOT NULL,
  "description" text,
  "description_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stage_level_number" ON "stages"("level_id", "stage_number");
CREATE INDEX IF NOT EXISTS "idx_stages_level" ON "stages"("level_id");

CREATE TABLE IF NOT EXISTS "units" (
  "id" serial PRIMARY KEY,
  "stage_id" integer NOT NULL REFERENCES "stages"("id") ON DELETE CASCADE,
  "unit_number" integer NOT NULL,
  "title" text NOT NULL,
  "title_ar" text NOT NULL,
  "description" text,
  "description_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_stage_number" ON "units"("stage_id", "unit_number");
CREATE INDEX IF NOT EXISTS "idx_units_stage" ON "units"("stage_id");

CREATE TABLE IF NOT EXISTS "lessons" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "lesson_number" integer NOT NULL,
  "title" text NOT NULL,
  "title_ar" text NOT NULL,
  "content" text,
  "content_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "is_free" boolean NOT NULL DEFAULT false,
  "estimated_minutes" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_unit_number" ON "lessons"("unit_id", "lesson_number");
CREATE INDEX IF NOT EXISTS "idx_lessons_unit" ON "lessons"("unit_id");

CREATE TABLE IF NOT EXISTS "unit_prerequisites" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "prerequisite_unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_prerequisite" ON "unit_prerequisites"("unit_id", "prerequisite_unit_id");
CREATE INDEX IF NOT EXISTS "idx_unit_prerequisites_unit" ON "unit_prerequisites"("unit_id");
CREATE INDEX IF NOT EXISTS "idx_unit_prerequisites_prereq" ON "unit_prerequisites"("prerequisite_unit_id");

CREATE TABLE IF NOT EXISTS "unit_enables" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "enables_unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_enables" ON "unit_enables"("unit_id", "enables_unit_id");
CREATE INDEX IF NOT EXISTS "idx_unit_enables_unit" ON "unit_enables"("unit_id");
CREATE INDEX IF NOT EXISTS "idx_unit_enables_enables" ON "unit_enables"("enables_unit_id");

CREATE TABLE IF NOT EXISTS "lesson_prerequisites" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "prerequisite_lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_prerequisite" ON "lesson_prerequisites"("lesson_id", "prerequisite_lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_prerequisites_lesson" ON "lesson_prerequisites"("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_prerequisites_prereq" ON "lesson_prerequisites"("prerequisite_lesson_id");

CREATE TABLE IF NOT EXISTS "lesson_enables" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "enables_lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_lesson_enables" ON "lesson_enables"("lesson_id", "enables_lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_enables_lesson" ON "lesson_enables"("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_lesson_enables_enables" ON "lesson_enables"("enables_lesson_id");

-- ── Lesson Concepts & Common Mistakes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lesson_concepts" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "concept" text NOT NULL,
  "concept_ar" text,
  "mastery_criteria" text,
  "mastery_criteria_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_lesson_concepts_lesson" ON "lesson_concepts"("lesson_id");

CREATE TABLE IF NOT EXISTS "lesson_common_mistakes" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "lessons"("id") ON DELETE CASCADE,
  "mistake" text NOT NULL,
  "mistake_ar" text,
  "correction" text NOT NULL,
  "correction_ar" text,
  "treatment" text,
  "treatment_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_lesson_common_mistakes_lesson" ON "lesson_common_mistakes"("lesson_id");

-- ── Labs ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lab_scenarios" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "title_ar" text,
  "description" text,
  "description_ar" text,
  "scenario_text" text NOT NULL,
  "scenario_text_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_lab_scenarios_unit" ON "lab_scenarios"("unit_id");

CREATE TABLE IF NOT EXISTS "lab_questions" (
  "id" serial PRIMARY KEY,
  "lab_scenario_id" integer NOT NULL REFERENCES "lab_scenarios"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "question_ar" text,
  "options" text NOT NULL DEFAULT '[]',
  "options_ar" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "explanation_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_lab_questions_scenario" ON "lab_questions"("lab_scenario_id");

-- ── Exams ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "unit_exams" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "units"("id") ON DELETE CASCADE,
  "exam_number" integer NOT NULL,
  "question" text NOT NULL,
  "question_ar" text,
  "options" text NOT NULL DEFAULT '[]',
  "options_ar" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "explanation_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_exam_bank" ON "unit_exams"("unit_id", "exam_number", "order_index");
CREATE INDEX IF NOT EXISTS "idx_unit_exams_unit" ON "unit_exams"("unit_id");

CREATE TABLE IF NOT EXISTS "stage_exams" (
  "id" serial PRIMARY KEY,
  "stage_id" integer NOT NULL REFERENCES "stages"("id") ON DELETE CASCADE,
  "exam_number" integer NOT NULL,
  "question" text NOT NULL,
  "question_ar" text,
  "options" text NOT NULL DEFAULT '[]',
  "options_ar" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "explanation_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stage_exam_bank" ON "stage_exams"("stage_id", "exam_number", "order_index");
CREATE INDEX IF NOT EXISTS "idx_stage_exams_stage" ON "stage_exams"("stage_id");

CREATE TABLE IF NOT EXISTS "level_exams" (
  "id" serial PRIMARY KEY,
  "level_id" integer NOT NULL REFERENCES "levels"("id") ON DELETE CASCADE,
  "exam_number" integer NOT NULL,
  "question" text NOT NULL,
  "question_ar" text,
  "options" text NOT NULL DEFAULT '[]',
  "options_ar" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "explanation_ar" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_level_exam_bank" ON "level_exams"("level_id", "exam_number", "order_index");
CREATE INDEX IF NOT EXISTS "idx_level_exams_level" ON "level_exams"("level_id");

CREATE TABLE IF NOT EXISTS "placement_test_questions" (
  "id" serial PRIMARY KEY,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "question_ar" text,
  "options" text NOT NULL DEFAULT '[]',
  "options_ar" text,
  "correct_answer" text NOT NULL,
  "explanation" text,
  "explanation_ar" text,
  "difficulty" integer NOT NULL DEFAULT 1,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_placement_test_specialty" ON "placement_test_questions"("specialty_id", "difficulty");

-- ── Student Progress ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lab_completions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lab_scenario_id" integer NOT NULL REFERENCES "lab_scenarios"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'in_progress',
  "score" integer NOT NULL DEFAULT 0,
  "max_score" integer NOT NULL DEFAULT 0,
  "answers" jsonb NOT NULL DEFAULT '{}',
  "started_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_lab_completions_user_lab" ON "lab_completions"("user_id", "lab_scenario_id");
CREATE INDEX IF NOT EXISTS "idx_lab_completions_status" ON "lab_completions"("user_id", "status");

CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "exam_type" text NOT NULL,
  "exam_bank_id" integer,
  "exam_number" integer NOT NULL DEFAULT 1,
  "context_id" integer NOT NULL,
  "answers" jsonb NOT NULL DEFAULT '{}',
  "per_question_results" jsonb NOT NULL DEFAULT '[]',
  "total_questions" integer NOT NULL DEFAULT 0,
  "correct_count" integer NOT NULL DEFAULT 0,
  "score" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'in_progress',
  "started_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_user_type" ON "exam_attempts"("user_id", "exam_type");
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_user_context" ON "exam_attempts"("user_id", "exam_type", "context_id");

-- ── Student Data (Paths, Booklets) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "student_paths" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "path_type" text NOT NULL DEFAULT 'custom',
  "path_data" jsonb NOT NULL DEFAULT '{}',
  "is_active" integer NOT NULL DEFAULT 1,
  "started_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_student_paths_user_specialty" ON "student_paths"("user_id", "specialty_id", "is_active");

CREATE TABLE IF NOT EXISTS "student_booklets" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "student_path_id" integer REFERENCES "student_paths"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "description" text,
  "description_ar" text,
  "booklet_type" text NOT NULL DEFAULT 'study',
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_student_booklets_user" ON "student_booklets"("user_id");
CREATE INDEX IF NOT EXISTS "idx_student_booklets_path" ON "student_booklets"("student_path_id");

CREATE TABLE IF NOT EXISTS "booklet_chunks" (
  "id" serial PRIMARY KEY,
  "student_booklet_id" integer NOT NULL REFERENCES "student_booklets"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "content_ar" text,
  "embedding" text,
  "page_number" integer,
  "chunk_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_booklet_chunks_booklet" ON "booklet_chunks"("student_booklet_id");

-- ── Book Units ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "book_units" (
  "id" serial PRIMARY KEY,
  "material_id" integer NOT NULL REFERENCES "course_materials"("id") ON DELETE CASCADE,
  "unit_number" integer NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "start_page" integer,
  "end_page" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "book_units_material_idx" ON "book_units"("material_id");

CREATE TABLE IF NOT EXISTS "book_unit_images" (
  "id" serial PRIMARY KEY,
  "unit_id" integer NOT NULL REFERENCES "book_units"("id") ON DELETE CASCADE,
  "page_number" integer,
  "image_path" text NOT NULL,
  "caption" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "book_unit_images_unit_idx" ON "book_unit_images"("unit_id");

-- ── Admin Knowledge ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_knowledge_modules" (
  "id" serial PRIMARY KEY,
  "subject_id" text NOT NULL,
  "module_name" text NOT NULL,
  "module_name_ar" text NOT NULL,
  "module_order" integer NOT NULL DEFAULT 0,
  "description_ar" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_module_subject_name" ON "admin_knowledge_modules"("subject_id", "module_name");
CREATE INDEX IF NOT EXISTS "idx_module_subject" ON "admin_knowledge_modules"("subject_id", "module_order");

CREATE TABLE IF NOT EXISTS "admin_module_level_files" (
  "id" serial PRIMARY KEY,
  "module_id" integer NOT NULL REFERENCES "admin_knowledge_modules"("id") ON DELETE CASCADE,
  "level" integer NOT NULL,
  "file_name" text NOT NULL,
  "content" text NOT NULL,
  "uploaded_by" text NOT NULL,
  "uploaded_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_module_level" ON "admin_module_level_files"("module_id", "level");

CREATE TABLE IF NOT EXISTS "student_module_levels" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "module_id" integer NOT NULL REFERENCES "admin_knowledge_modules"("id") ON DELETE CASCADE,
  "level" integer NOT NULL,
  "placement_score" jsonb NOT NULL DEFAULT '{}',
  "placed_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_student_module_level" ON "student_module_levels"("user_id", "module_id");
CREATE INDEX IF NOT EXISTS "idx_student_module_levels_user" ON "student_module_levels"("user_id");

CREATE TABLE IF NOT EXISTS "student_rag_sessions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "subject_id" text NOT NULL,
  "conversation_id" integer,
  "current_module_id" integer,
  "current_level" integer,
  "session_phase" text NOT NULL DEFAULT 'diagnostic',
  "diagnostic_answers" jsonb NOT NULL DEFAULT '[]',
  "placement_history" jsonb NOT NULL DEFAULT '[]',
  "pathway_order" jsonb NOT NULL DEFAULT '[]',
  "pathway_index" integer NOT NULL DEFAULT 0,
  "lab_env_json" text,
  "started_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rag_session_user_subject" ON "student_rag_sessions"("user_id", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_rag_session_user" ON "student_rag_sessions"("user_id", "subject_id");

-- ── Student AI Memory ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "student_profile" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "personal_dictionary" jsonb NOT NULL DEFAULT '{}',
  "warmth_memory" text,
  "learning_style" text,
  "preferences" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_student_profile_user_specialty" ON "student_profile"("user_id", "specialty_id");

CREATE TABLE IF NOT EXISTS "concept_mastery_scores" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "concept_id" integer NOT NULL REFERENCES "lesson_concepts"("id") ON DELETE CASCADE,
  "mastery_score" integer NOT NULL DEFAULT 0,
  "attempts" integer NOT NULL DEFAULT 0,
  "correct_attempts" integer NOT NULL DEFAULT 0,
  "last_assessed_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_concept_mastery_user_concept" ON "concept_mastery_scores"("user_id", "concept_id");
CREATE INDEX IF NOT EXISTS "idx_concept_mastery_user" ON "concept_mastery_scores"("user_id");

CREATE TABLE IF NOT EXISTS "weakness_tracker" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "area" text NOT NULL,
  "area_ar" text,
  "weakness_description" text NOT NULL,
  "weakness_description_ar" text,
  "detected_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "remediation_status" text NOT NULL DEFAULT 'open',
  "resolved_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_weakness_tracker_user_specialty" ON "weakness_tracker"("user_id", "specialty_id", "remediation_status");

CREATE TABLE IF NOT EXISTS "student_memory_summaries" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "specialty_id" integer NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
  "summary_text" text NOT NULL,
  "summary_text_ar" text,
  "context_type" text NOT NULL DEFAULT 'general',
  "context_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_student_memory_summaries_user_specialty" ON "student_memory_summaries"("user_id", "specialty_id", "created_at");
