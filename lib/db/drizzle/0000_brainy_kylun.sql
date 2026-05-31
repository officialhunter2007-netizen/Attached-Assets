CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"display_name" text,
	"profile_image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_active" text,
	"badges" text[] DEFAULT '{}' NOT NULL,
	"nukhba_plan" text,
	"region" text,
	"messages_used" integer DEFAULT 0 NOT NULL,
	"messages_limit" integer DEFAULT 0 NOT NULL,
	"subscription_expires_at" timestamp with time zone,
	"gems_balance" integer DEFAULT 0 NOT NULL,
	"gems_used_today" integer DEFAULT 0 NOT NULL,
	"gems_daily_limit" integer DEFAULT 0 NOT NULL,
	"gems_reset_date" text,
	"gems_expires_at" timestamp with time zone,
	"referral_access_until" timestamp with time zone,
	"first_lesson_complete" boolean DEFAULT false NOT NULL,
	"referral_code" text,
	"last_session_date" text,
	"last_session_at" timestamp with time zone,
	"referral_sessions_left" integer DEFAULT 0 NOT NULL,
	"tryhackme_username" text,
	"sub_page_first_visited_at" timestamp with time zone,
	"sub_page_left_at" timestamp with time zone,
	"welcome_offer_shown_at" timestamp with time zone,
	"welcome_offer_expires_at" timestamp with time zone,
	"welcome_offer_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "cached_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"lesson_key" text NOT NULL,
	"section" text NOT NULL,
	"grade_or_specialization" text,
	"subject" text NOT NULL,
	"unit_title" text NOT NULL,
	"lesson_title" text NOT NULL,
	"content_ar" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cached_lessons_lesson_key_unique" UNIQUE("lesson_key")
);
--> statement-breakpoint
CREATE TABLE "lesson_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"lesson_title" text NOT NULL,
	"subject_name" text NOT NULL,
	"points_earned" integer DEFAULT 15 NOT NULL,
	"challenge_answered" boolean DEFAULT false NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"motivation" text,
	"duration" text,
	"outcome" text,
	"plan_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"section" text NOT NULL,
	"subject_or_specialization" text NOT NULL,
	"grade_or_track" text,
	"completed_lessons" integer DEFAULT 0 NOT NULL,
	"total_lessons" integer DEFAULT 0 NOT NULL,
	"mastery_percentage" integer DEFAULT 0 NOT NULL,
	"last_accessed_lesson" text,
	"last_accessed_unit" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activation_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"activation_code" text NOT NULL,
	"plan_type" text NOT NULL,
	"region" text,
	"subject_id" text,
	"subject_name" text,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by_user_id" integer,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"subscription_request_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activation_cards_activation_code_unique" UNIQUE("activation_code")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"user_id" integer,
	"subject_id" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_code_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_request_id" integer,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"percent" integer NOT NULL,
	"note" text,
	"active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"per_user_limit" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"yer_per_usd" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" integer,
	CONSTRAINT "exchange_rates_region_unique" UNIQUE("region")
);
--> statement-breakpoint
CREATE TABLE "gem_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_sub_id" integer,
	"subject_id" text,
	"delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text NOT NULL,
	"source" text,
	"admin_user_id" integer,
	"note" text,
	"metadata" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"label" text,
	"category" text DEFAULT 'payment' NOT NULL,
	"updated_by_user_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "plan_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"plan_type" text NOT NULL,
	"price_yer" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" integer
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_user_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"referral_code" text NOT NULL,
	"access_days_granted" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_email" text NOT NULL,
	"user_name" text,
	"account_name" text DEFAULT '' NOT NULL,
	"transaction_id" text,
	"plan_type" text NOT NULL,
	"region" text NOT NULL,
	"subject_id" text DEFAULT 'all' NOT NULL,
	"subject_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"activation_code" text,
	"notes" text,
	"admin_note" text,
	"discount_code_id" integer,
	"discount_code" text,
	"discount_percent" integer,
	"base_price" integer,
	"final_price" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_name" text,
	"user_email" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_from_admin" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"thread_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subject_first_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"free_messages_used" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subject_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"plan_html" text NOT NULL,
	"current_stage_index" integer DEFAULT 0 NOT NULL,
	"current_micro_step_index" integer DEFAULT 0 NOT NULL,
	"completed_micro_steps" text DEFAULT '[]' NOT NULL,
	"growth_reflections" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subject_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text,
	"plan" text NOT NULL,
	"messages_used" integer DEFAULT 0 NOT NULL,
	"messages_limit" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"activation_code" text,
	"subscription_request_id" integer,
	"paid_price_yer" integer DEFAULT 0 NOT NULL,
	"region" text,
	"gems_balance" integer DEFAULT 0 NOT NULL,
	"gems_used_today" integer DEFAULT 0 NOT NULL,
	"gems_daily_limit" integer DEFAULT 0 NOT NULL,
	"gems_reset_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary_html" text NOT NULL,
	"conversation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text DEFAULT '' NOT NULL,
	"env_title" text DEFAULT '' NOT NULL,
	"env_briefing" text DEFAULT '' NOT NULL,
	"report_text" text NOT NULL,
	"feedback_html" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"path" text,
	"label" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_teacher_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"subject_name" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"is_diagnostic" integer DEFAULT 0 NOT NULL,
	"stage_index" integer,
	"word_count" integer,
	"over_length" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_material_blobs" (
	"material_id" integer PRIMARY KEY NOT NULL,
	"pdf_data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"file_name" text NOT NULL,
	"object_path" text NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"page_count" integer DEFAULT 0 NOT NULL,
	"language" text,
	"extracted_text" text,
	"outline" text,
	"structured_outline" text,
	"summary" text,
	"starters" text,
	"printed_page_offset" integer DEFAULT 0 NOT NULL,
	"role" text DEFAULT 'primary' NOT NULL,
	"coverage_status" text DEFAULT 'ok' NOT NULL,
	"processing_metrics" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_chapter_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"chapters" text DEFAULT '[]' NOT NULL,
	"current_chapter_index" integer DEFAULT 0 NOT NULL,
	"completed_chapter_indices" text DEFAULT '[]' NOT NULL,
	"skipped_chapter_indices" text DEFAULT '[]' NOT NULL,
	"covered_points" text DEFAULT '{}' NOT NULL,
	"last_interacted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"page_number" integer NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"content_normalized" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_page_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_provider" text,
	"error_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subject_teaching_modes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"mode" text DEFAULT 'unset' NOT NULL,
	"active_material_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"kind" text NOT NULL,
	"chapter_index" integer,
	"chapter_title" text,
	"questions" text DEFAULT '[]' NOT NULL,
	"answers" text DEFAULT '{}' NOT NULL,
	"per_question_results" text DEFAULT '[]' NOT NULL,
	"weak_areas" text DEFAULT '[]' NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"subject_id" text,
	"route" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(14, 8) DEFAULT '0' NOT NULL,
	"latency_ms" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_mistakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"topic" text NOT NULL,
	"mistake" text NOT NULL,
	"correction" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"stage_index" integer,
	"stage_name" text,
	"card_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" integer,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"last_occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_summaries" ADD CONSTRAINT "lesson_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_material_blobs" ADD CONSTRAINT "course_material_blobs_material_id_course_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."course_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_discount_code_redemptions_code_user" ON "discount_code_redemptions" USING btree ("code_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_discount_code_redemptions_user" ON "discount_code_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_gem_ledger_user_created" ON "gem_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gem_ledger_subject_sub" ON "gem_ledger" USING btree ("subject_sub_id");--> statement-breakpoint
CREATE INDEX "idx_gem_ledger_reason" ON "gem_ledger" USING btree ("reason");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_plan_prices_region_plan" ON "plan_prices" USING btree ("region","plan_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_subject_first_lesson" ON "user_subject_first_lessons" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_subject_plans_user_subject_idx" ON "user_subject_plans" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "activity_events_user_idx" ON "activity_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_type_idx" ON "activity_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "activity_events_created_idx" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_teacher_messages_user_subject_idx" ON "ai_teacher_messages" USING btree ("user_id","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_teacher_messages_created_idx" ON "ai_teacher_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "course_materials_user_subject_idx" ON "course_materials" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "material_chapter_progress_user_material_idx" ON "material_chapter_progress" USING btree ("user_id","material_id");--> statement-breakpoint
CREATE INDEX "material_chunks_material_idx" ON "material_chunks" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_chunks_material_page_idx" ON "material_chunks" USING btree ("material_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "material_page_status_material_page_idx" ON "material_page_status" USING btree ("material_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "user_subject_teaching_mode_idx" ON "user_subject_teaching_modes" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_material_idx" ON "quiz_attempts" USING btree ("user_id","material_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_subject_idx" ON "quiz_attempts" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_user" ON "ai_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_created" ON "ai_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_model" ON "ai_usage_events" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_route" ON "ai_usage_events" USING btree ("route");--> statement-breakpoint
CREATE INDEX "student_mistakes_user_subject_idx" ON "student_mistakes" USING btree ("user_id","subject_id","resolved");--> statement-breakpoint
CREATE INDEX "study_cards_user_subject_idx" ON "study_cards" USING btree ("user_id","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_alerts_resolved_created_idx" ON "admin_alerts" USING btree ("resolved","created_at");--> statement-breakpoint
CREATE INDEX "admin_alerts_type_idx" ON "admin_alerts" USING btree ("type","resolved");