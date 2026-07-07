import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import {
  setYerToUsdRates,
  YER_PER_USD_FALLBACK,
  setGemsPer1MTeachingTokens,
  GEMS_PER_1M_SETTING_KEY,
  DEFAULT_GEMS_PER_1M_TEACHING_TOKENS,
} from "./pricing-formula";

type ColumnSpec = {
  name: string;
  ddl: string;
};

type TableSpec = {
  table: string;
  columns: ColumnSpec[];
};

type FullTableSpec = {
  /** Unqualified table name. */
  table: string;
  /** Full CREATE TABLE IF NOT EXISTS ... statement. */
  createSql: string;
  /** Optional CREATE INDEX IF NOT EXISTS statements. */
  indexes?: string[];
};

const REQUIRED_TABLES: FullTableSpec[] = [
  {
    table: "coding_rooms",
    createSql: `
      CREATE TABLE IF NOT EXISTS "coding_rooms" (
        "id" serial PRIMARY KEY,
        "title" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "languages" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "invite_type" text NOT NULL DEFAULT 'private',
        "host_user_id" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'active',
        "closed_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_coding_rooms_status" ON "coding_rooms" ("status", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_coding_rooms_host" ON "coding_rooms" ("host_user_id")`,
    ],
  },
  {
    table: "coding_room_members",
    createSql: `
      CREATE TABLE IF NOT EXISTS "coding_room_members" (
        "id" serial PRIMARY KEY,
        "room_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "role" text NOT NULL DEFAULT 'member',
        "can_write" boolean NOT NULL DEFAULT false,
        "can_run" boolean NOT NULL DEFAULT false,
        "status" text NOT NULL DEFAULT 'waiting',
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_coding_room_members" ON "coding_room_members" ("room_id", "user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_coding_room_members_room" ON "coding_room_members" ("room_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_coding_room_members_user" ON "coding_room_members" ("user_id")`,
    ],
  },
  {
    table: "coding_room_files",
    createSql: `
      CREATE TABLE IF NOT EXISTS "coding_room_files" (
        "id" serial PRIMARY KEY,
        "room_id" integer NOT NULL,
        "file_path" text NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "language" text NOT NULL DEFAULT '',
        "created_by_user_id" integer,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_coding_room_files" ON "coding_room_files" ("room_id", "file_path")`,
      `CREATE INDEX IF NOT EXISTS "idx_coding_room_files_room" ON "coding_room_files" ("room_id")`,
    ],
  },
  {
    table: "coding_room_invitations",
    createSql: `
      CREATE TABLE IF NOT EXISTS "coding_room_invitations" (
        "id" serial PRIMARY KEY,
        "room_id" integer NOT NULL,
        "invited_user_id" integer NOT NULL,
        "invited_by_user_id" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_coding_room_invitations" ON "coding_room_invitations" ("room_id", "invited_user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_coding_room_inv_user" ON "coding_room_invitations" ("invited_user_id")`,
    ],
  },
  {
    table: "typing_progress",
    createSql: `
      CREATE TABLE IF NOT EXISTS "typing_progress" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "stars" integer NOT NULL DEFAULT 1,
        "best_wpm" integer NOT NULL DEFAULT 0,
        "best_accuracy" integer NOT NULL DEFAULT 0,
        "completed_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_typing_progress_user_lesson" ON "typing_progress" ("user_id", "lesson_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_typing_progress_user" ON "typing_progress" ("user_id")`,
    ],
  },
  {
    table: "notifications",
    createSql: `
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "type" text NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL DEFAULT '',
        "data" jsonb,
        "read" boolean NOT NULL DEFAULT false,
        "read_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" ("user_id", "read", "created_at")`,
    ],
  },
  {
    // test-out: GLOBAL cached MCQ pool per (versionId, targetUnitCode).
    table: "v4_testout_pools",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_testout_pools" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "target_unit_code" text NOT NULL,
        "prereq_unit_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "unit_names" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_testout_pools_version_unit" ON "v4_testout_pools" ("version_id", "target_unit_code")`,
    ],
  },
  {
    // test-out: per-attempt session state (server-authoritative pending q).
    table: "v4_testout_sessions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_testout_sessions" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "version_id" integer NOT NULL,
        "target_code" text NOT NULL,
        "target_unit_code" text NOT NULL,
        "status" text NOT NULL DEFAULT 'in_progress',
        "question_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "pending" jsonb,
        "answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "ask_min" integer NOT NULL DEFAULT 13,
        "ask_max" integer NOT NULL DEFAULT 20,
        "score_pct" integer NOT NULL DEFAULT 0,
        "passed" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "completed_at" timestamp with time zone
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_testout_sess_user_subject" ON "v4_testout_sessions" ("user_id", "subject_id")`,
    ],
  },
  {
    // v4 task #8 — uploaded booklet metadata + Gemini-generated tree.
    table: "v4_student_booklets",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_student_booklets" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "title" text NOT NULL,
        "pages_count" integer NOT NULL DEFAULT 0,
        "instruction_tree" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" text NOT NULL DEFAULT 'processing',
        "error_message" text,
        "prep_cost_usd" real NOT NULL DEFAULT 0,
        "content_hash" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_booklets_user_subject" ON "v4_student_booklets" ("user_id", "subject_id")`,
      // NOTE: the partial unique on content_hash is intentionally NOT
      // created here. It depends on `content_hash` existing as a column,
      // which on legacy tables (created before task #8) only gets ADD-ed
      // later in ensureRequiredColumns. The index is created in
      // runStartupMigrations() AFTER columns are reconciled.
    ],
  },
  {
    // v4 task #8 — per-chunk embedding store. embedding is jsonb (float
    // array). We do not require the pgvector extension — JS-side cosine
    // similarity is fast enough for the booklet sizes we expect (<= ~2000
    // chunks per booklet, single-user reads).
    table: "v4_booklet_chunks",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_booklet_chunks" (
        "id" serial PRIMARY KEY,
        "booklet_id" integer NOT NULL,
        "page_number" integer NOT NULL,
        "chunk_idx" integer NOT NULL,
        "chunk_text" text NOT NULL,
        "embedding" jsonb NOT NULL
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_booklet_chunks_booklet" ON "v4_booklet_chunks" ("booklet_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_booklet_chunks_booklet_page" ON "v4_booklet_chunks" ("booklet_id", "page_number")`,
    ],
  },
  {
    table: "ai_usage_events",
    createSql: `
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
        "cost_usd" numeric(14, 8) NOT NULL DEFAULT 0,
        "latency_ms" integer,
        "status" text NOT NULL DEFAULT 'success',
        "error_message" text,
        "metadata" jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_ai_usage_user" ON "ai_usage_events" ("user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_ai_usage_created" ON "ai_usage_events" ("created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_ai_usage_model" ON "ai_usage_events" ("model")`,
      `CREATE INDEX IF NOT EXISTS "idx_ai_usage_route" ON "ai_usage_events" ("route")`,
    ],
  },
  {
    table: "student_mistakes",
    createSql: `
      CREATE TABLE IF NOT EXISTS "student_mistakes" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "topic" text NOT NULL,
        "mistake" text NOT NULL,
        "correction" text,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolved_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "student_mistakes_user_subject_idx" ON "student_mistakes" ("user_id", "subject_id", "resolved")`,
    ],
  },
  {
    table: "study_cards",
    createSql: `
      CREATE TABLE IF NOT EXISTS "study_cards" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "stage_index" integer,
        "stage_name" text,
        "card_html" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "study_cards_user_subject_idx" ON "study_cards" ("user_id", "subject_id", "created_at")`,
    ],
  },
  {
    table: "plan_prices",
    createSql: `
      CREATE TABLE IF NOT EXISTS "plan_prices" (
        "id" serial PRIMARY KEY,
        "region" text NOT NULL,
        "plan_type" text NOT NULL,
        "price_yer" integer NOT NULL,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_by_user_id" integer
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_plan_prices_region_plan" ON "plan_prices" ("region", "plan_type")`,
    ],
  },
  {
    table: "exchange_rates",
    createSql: `
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id" serial PRIMARY KEY,
        "region" text NOT NULL UNIQUE,
        "yer_per_usd" integer NOT NULL,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_by_user_id" integer
      )
    `,
    indexes: [],
  },
  {
    // Gem ledger — append-only history of every balance change. Powers the
    // admin "ledger" tab and refund flow. Indexed on (user_id, created_at)
    // for fast per-user history queries.
    table: "gem_ledger",
    createSql: `
      CREATE TABLE IF NOT EXISTS "gem_ledger" (
        "id" serial PRIMARY KEY,
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
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_gem_ledger_user_created" ON "gem_ledger" ("user_id", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "idx_gem_ledger_subject_sub" ON "gem_ledger" ("subject_sub_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_gem_ledger_reason" ON "gem_ledger" ("reason")`,
    ],
  },
  {
    // Per-user discount-code redemption ledger. Inserted inside the approve
    // transaction so a row only exists for an actually-granted subscription.
    table: "discount_code_redemptions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "discount_code_redemptions" (
        "id" serial PRIMARY KEY,
        "code_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "subscription_request_id" integer,
        "redeemed_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_discount_code_redemptions_code_user" ON "discount_code_redemptions" ("code_id", "user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_discount_code_redemptions_user" ON "discount_code_redemptions" ("user_id")`,
    ],
  },
  {
    // v4 monthly per-subject gem wallet — parallel to the legacy
    // `user_subject_subscriptions` daily-cap wallet. See schema comment in
    // lib/db/src/schema/subscriptions.ts → studentGemWalletsTable.
    table: "student_gem_wallets",
    createSql: `
      CREATE TABLE IF NOT EXISTS "student_gem_wallets" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "gems_balance" integer NOT NULL DEFAULT 0,
        "expires_at" timestamp with time zone,
        "welcome_gift_claimed" boolean NOT NULL DEFAULT false,
        "last_renewal_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_student_gem_wallets_user_subject" ON "student_gem_wallets" ("user_id", "subject_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_student_gem_wallets_expires" ON "student_gem_wallets" ("expires_at")`,
    ],
  },
  {
    // v4 global one-time welcome gift — a 150-gem budget per user, allocated
    // across up to 3 specialties. See schema/subscriptions.ts.
    table: "student_welcome_gifts",
    createSql: `
      CREATE TABLE IF NOT EXISTS "student_welcome_gifts" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL UNIQUE,
        "total_gems" integer NOT NULL DEFAULT 150,
        "allocated_gems" integer NOT NULL DEFAULT 0,
        "shown_at" timestamp with time zone,
        "finalized_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  {
    // v4 welcome-gift per-subject allocation rows (upsert by user + subject).
    table: "student_welcome_gift_allocations",
    createSql: `
      CREATE TABLE IF NOT EXISTS "student_welcome_gift_allocations" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "gems_allocated" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_welcome_gift_alloc_user_subject" ON "student_welcome_gift_allocations" ("user_id", "subject_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_welcome_gift_alloc_user" ON "student_welcome_gift_allocations" ("user_id")`,
    ],
  },
  {
    // Referral pairing rows. Historically created by a legacy drizzle migration
    // and NOT present in fresh DBs (no backend ever inserted into it), so we
    // ensure it idempotently here. One row per referred user (unique).
    // `reward_paid_at` is the idempotency anchor for the 300-gem mutual payout.
    table: "referrals",
    createSql: `
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" serial PRIMARY KEY,
        "referrer_user_id" integer NOT NULL,
        "referred_user_id" integer NOT NULL,
        "referral_code" text NOT NULL,
        "access_days_granted" integer DEFAULT 0,
        "reward_paid_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_referrals_referred_user" ON "referrals" ("referred_user_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_user" ON "referrals" ("referrer_user_id")`,
    ],
  },
  {
    // Referral reward pool — running lifetime total of gems EARNED from
    // referrals, allocated across subjects on the student's choice (mirrors the
    // welcome-gift pool, but accrues over time so there is no finalize lock).
    table: "referral_reward_pools",
    createSql: `
      CREATE TABLE IF NOT EXISTS "referral_reward_pools" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL UNIQUE,
        "earned_gems" integer NOT NULL DEFAULT 0,
        "allocated_gems" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  {
    // Referral reward per-subject allocation rows (upsert by user + subject).
    table: "referral_reward_allocations",
    createSql: `
      CREATE TABLE IF NOT EXISTS "referral_reward_allocations" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "gems_allocated" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_referral_reward_alloc_user_subject" ON "referral_reward_allocations" ("user_id", "subject_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_referral_reward_alloc_user" ON "referral_reward_allocations" ("user_id")`,
    ],
  },
  {
    // Admin-editable payment settings (Kuraimi account numbers, names, etc.).
    // Key/value so new keys can be added from the admin UI without a
    // schema migration.
    table: "payment_settings",
    createSql: `
      CREATE TABLE IF NOT EXISTS "payment_settings" (
        "id" serial PRIMARY KEY,
        "key" text NOT NULL UNIQUE,
        "value" text NOT NULL DEFAULT '',
        "label" text,
        "category" text NOT NULL DEFAULT 'payment',
        "updated_by_user_id" integer,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  {
    // Admin-configurable AI provider for the v4 smart teacher ONLY.
    // Singleton row (id=1). Keys are NEVER stored here — only the NAME of
    // the .env var that holds the key. When disabled/misconfigured the
    // teacher falls back to the default OpenRouter+Gemini channel.
    table: "ai_teacher_provider_settings",
    createSql: `
      CREATE TABLE IF NOT EXISTS "ai_teacher_provider_settings" (
        "id" integer PRIMARY KEY DEFAULT 1,
        "or_model_override" text NOT NULL DEFAULT '',
        "enabled" boolean NOT NULL DEFAULT false,
        "base_url" text NOT NULL DEFAULT '',
        "api_key_env" text NOT NULL DEFAULT '',
        "model" text NOT NULL DEFAULT '',
        "updated_by_user_id" integer,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        CONSTRAINT "ai_teacher_provider_singleton" CHECK ("id" = 1)
      )
    `,
    // Seed the singleton row (id=1) idempotently. Runs as its own
    // statement because the node-postgres extended protocol rejects
    // multiple commands in one db.execute call.
    indexes: [
      `INSERT INTO "ai_teacher_provider_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`,
    ],
  },
  {
    // Operational alerts surfaced to the admin panel (OpenRouter credit
    // exhausted, auth failures, repeated transient errors, etc.). The
    // helper recordAdminAlert() de-dupes by `type` over a 30-min window.
    table: "admin_alerts",
    createSql: `
      CREATE TABLE IF NOT EXISTS "admin_alerts" (
        "id" serial PRIMARY KEY,
        "type" text NOT NULL,
        "severity" text NOT NULL DEFAULT 'warning',
        "title" text NOT NULL,
        "message" text NOT NULL,
        "metadata" jsonb,
        "resolved" boolean NOT NULL DEFAULT false,
        "resolved_at" timestamp with time zone,
        "resolved_by_user_id" integer,
        "occurrence_count" integer NOT NULL DEFAULT 1,
        "last_occurred_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "admin_alerts_resolved_created_idx" ON "admin_alerts" ("resolved", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "admin_alerts_type_idx" ON "admin_alerts" ("type", "resolved")`,
      // Partial unique index — at most ONE unresolved alert per type at
      // any given time. recordAdminAlert() relies on this for race-safe
      // upsert (INSERT ... ON CONFLICT (type) WHERE resolved = false
      // DO UPDATE). Without it, two concurrent error paths could each
      // insert a row before either one's SELECT saw the other.
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_admin_alerts_type_unresolved" ON "admin_alerts" ("type") WHERE resolved = false`,
    ],
  },
  {
    // Per-message student feedback on the AI teacher's answers (👍 / 👎).
    // The MessageToolbar in the chat UI POSTs to /api/ai/feedback after
    // the student rates an assistant turn; rows here power the "تقييمات
    // الطلاب" admin tab that surfaces low-rated answers for prompt tuning.
    // `message_sample` is a short head-snippet of the assistant content
    // (server-truncated to 280 chars) — enough to recognize the answer
    // without inflating the row.
    table: "teacher_feedback",
    createSql: `
      CREATE TABLE IF NOT EXISTS "teacher_feedback" (
        "id" serial PRIMARY KEY,
        "user_id" integer,
        "subject_id" text,
        "rating" text NOT NULL,
        "stage_index" integer,
        "difficulty" text,
        "message_sample" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "teacher_feedback_subject_created_idx" ON "teacher_feedback" ("subject_id", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "teacher_feedback_rating_idx" ON "teacher_feedback" ("rating", "created_at")`,
    ],
  },
  {
    table: "audit_logs",
    createSql: `
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" serial PRIMARY KEY,
        "event" text NOT NULL,
        "user_id" integer,
        "subject_id" text,
        "data" jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "audit_logs_event_created_idx" ON "audit_logs" ("event", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id", "created_at")`,
    ],
  },
  {
    // Self-healing manifest for teacher images. Maps the one-way content hash
    // embedded in /api/teacher-images/<hash>.<ext> back to enough metadata to
    // RE-CREATE the bytes if the cache file is gone (LRU-evicted, orphaned by a
    // cache-namespace bump, or wiped when an ephemeral deploy disk resets).
    // Without this row a missing file 404s forever and the URL baked into a
    // student's saved session renders as a permanent broken image. With it,
    // serveTeacherImage re-fetches the stable `source_url` (real photos) or
    // re-resolves the stored `query`/prompt (free path — NEVER paid fal on an
    // unauthenticated GET). See lib/teacher-image-store.ts.
    table: "teacher_image_manifest",
    createSql: `
      CREATE TABLE IF NOT EXISTS "teacher_image_manifest" (
        "hash" text PRIMARY KEY,
        "ext" text NOT NULL,
        "kind" text NOT NULL,
        "query" text NOT NULL DEFAULT '',
        "source_url" text,
        "provider" text NOT NULL DEFAULT '',
        "heal_count" integer NOT NULL DEFAULT 0,
        "last_heal_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  // ── v4.0 curriculum tables ──────────────────────────────────────────────
  // See lib/db/src/schema/v4.ts for the schema-of-record + design notes. We
  // add them via auto-migrate (not drizzle-kit push) because push is
  // interactive in Replit's environment (see memory/db-migration-replit.md).
  // ORDER MATTERS — child tables reference parent ids and the foreign-key
  // relationships are enforced at the app layer (no DDL FK), but ordering
  // them parent-first keeps the dump readable and any future FK migration
  // trivial.
  {
    table: "v4_specialties",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_specialties" (
        "id" serial PRIMARY KEY,
        "slug" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "description" text,
        "icon" text,
        "active_instruction_version_id" integer,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  {
    table: "v4_instruction_file_versions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_instruction_file_versions" (
        "id" serial PRIMARY KEY,
        "specialty_id" integer NOT NULL,
        "version" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'published',
        "raw_json" jsonb NOT NULL,
        "parsed_summary" jsonb,
        "notes" text,
        "published_by_user_id" integer,
        "published_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_instr_specialty_version" ON "v4_instruction_file_versions" ("specialty_id", "version")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_instr_specialty_status" ON "v4_instruction_file_versions" ("specialty_id", "status")`,
    ],
  },
  {
    table: "v4_levels",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_levels" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "level_index" integer NOT NULL,
        "name" text NOT NULL,
        "goal" text NOT NULL,
        "exam_meta" jsonb
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_levels_version_index" ON "v4_levels" ("version_id", "level_index")`,
    ],
  },
  {
    table: "v4_stages",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_stages" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "level_id" integer NOT NULL,
        "stage_index" integer NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "goal" text NOT NULL,
        "exam_meta" jsonb
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_stages_version_code" ON "v4_stages" ("version_id", "code")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_stages_level" ON "v4_stages" ("level_id")`,
    ],
  },
  {
    table: "v4_units",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_units" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "stage_id" integer NOT NULL,
        "unit_index" integer NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "goal" text NOT NULL,
        "prerequisite_unit_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "enables_unit_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "key_concepts" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "exam_meta" jsonb
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_units_version_code" ON "v4_units" ("version_id", "code")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_units_stage" ON "v4_units" ("stage_id")`,
    ],
  },
  {
    table: "v4_lessons",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lessons" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "unit_id" integer NOT NULL,
        "lesson_index" integer NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "goal" text NOT NULL,
        "bridge_sentence" text NOT NULL,
        "prerequisite_lesson_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "enables_lesson_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "final_check_question" text NOT NULL,
        "session_complete_criterion" text NOT NULL,
        "yemeni_examples" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "expected_duration_minutes" integer,
        "estimated_gem_cost" integer
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lessons_version_code" ON "v4_lessons" ("version_id", "code")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lessons_unit" ON "v4_lessons" ("unit_id")`,
    ],
  },
  {
    table: "v4_lesson_concepts",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lesson_concepts" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "concept_index" integer NOT NULL,
        "name" text NOT NULL,
        "explanation" text NOT NULL,
        "mastery_criterion" text NOT NULL
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lconcepts_lesson_idx" ON "v4_lesson_concepts" ("lesson_id", "concept_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lconcepts_version" ON "v4_lesson_concepts" ("version_id")`,
    ],
  },
  {
    table: "v4_lesson_common_mistakes",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lesson_common_mistakes" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "mistake_index" integer NOT NULL,
        "mistake" text NOT NULL,
        "correction" text NOT NULL,
        "treatment" text NOT NULL
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lmistakes_lesson_idx" ON "v4_lesson_common_mistakes" ("lesson_id", "mistake_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lmistakes_version" ON "v4_lesson_common_mistakes" ("version_id")`,
    ],
  },
  {
    table: "v4_lab_scenarios",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lab_scenarios" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "unit_id" integer NOT NULL,
        "lab_index" integer NOT NULL,
        "code" text NOT NULL,
        "title" text NOT NULL,
        "scenario" text NOT NULL,
        "completion_criterion" text NOT NULL
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lab_version_code" ON "v4_lab_scenarios" ("version_id", "code")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lab_unit" ON "v4_lab_scenarios" ("unit_id")`,
    ],
  },
  {
    table: "v4_lab_questions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lab_questions" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "lab_id" integer NOT NULL,
        "question_index" integer NOT NULL,
        "kind" text NOT NULL,
        "prompt" text NOT NULL
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_labq_lab_idx" ON "v4_lab_questions" ("lab_id", "question_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_labq_version" ON "v4_lab_questions" ("version_id")`,
    ],
  },
  {
    table: "v4_exam_questions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_exam_questions" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "scope" text NOT NULL,
        "unit_id" integer,
        "stage_id" integer,
        "level_id" integer,
        "variant_index" integer NOT NULL DEFAULT 1,
        "question_index" integer NOT NULL,
        "kind" text NOT NULL DEFAULT 'mcq',
        "prompt" text NOT NULL,
        "choices" jsonb,
        "correct_index" integer,
        "explanation" text,
        "difficulty" integer NOT NULL DEFAULT 2
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_exam_scope_targets" ON "v4_exam_questions" ("scope", "unit_id", "stage_id", "level_id", "variant_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_exam_version" ON "v4_exam_questions" ("version_id")`,
    ],
  },
  {
    table: "v4_placement_test_questions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_placement_test_questions" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "question_index" integer NOT NULL,
        "target_level_index" integer NOT NULL,
        "kind" text NOT NULL DEFAULT 'mcq',
        "prompt" text NOT NULL,
        "choices" jsonb,
        "correct_index" integer,
        "difficulty" integer NOT NULL DEFAULT 2
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_placement_version_idx" ON "v4_placement_test_questions" ("version_id", "question_index")`,
    ],
  },
  {
    // v4 task #3 — student's enrollment in a specialty path. One row per
    // (user_id, subject_id). `version_id` pins the student to the
    // instruction-file version active at setup so later re-publishes don't
    // shift their map. `unlocked_lesson_codes` is a JSON array snapshot.
    table: "v4_student_paths",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_student_paths" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "version_id" integer NOT NULL,
        "path_type" text NOT NULL,
        "start_mode" text NOT NULL,
        "starting_level_index" integer NOT NULL DEFAULT 1,
        "current_lesson_code" text,
        "unlocked_lesson_codes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_student_paths_user_subject" ON "v4_student_paths" ("user_id", "subject_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_student_paths_user" ON "v4_student_paths" ("user_id")`,
    ],
  },
  {
    // v4 task #3 — the 5-question intake conversation before path setup.
    // Idempotency is enforced at the application layer: the latest
    // in_progress row for a (user_id, subject_id) is reused. Answers are
    // stored as a JSON array of {question, answer} pairs.
    table: "v4_diagnostic_sessions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_diagnostic_sessions" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "status" text NOT NULL DEFAULT 'in_progress',
        "answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "completed_at" timestamp with time zone
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_diag_user_subject" ON "v4_diagnostic_sessions" ("user_id", "subject_id")`,
    ],
  },
  {
    // v4 placement-accuracy — server-authoritative adaptive placement run.
    // Every probe graded server-side; finalize recomputes from `probes`,
    // ignoring any client-supplied level. `pending` holds the single
    // question awaiting an answer so the client never picks which question
    // it answered. Mirrors the diagnostic-sessions reuse-latest-in_progress
    // pattern.
    table: "v4_placement_sessions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_placement_sessions" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "version_id" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'in_progress',
        "probes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "pending" jsonb,
        "result" jsonb,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
        "completed_at" timestamp with time zone
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_placement_sess_user_subject" ON "v4_placement_sessions" ("user_id", "subject_id")`,
    ],
  },
  {
    // v4 task #7 — lab completions (one row per user/lab, upsert on retry).
    table: "v4_lab_completions",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lab_completions" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "lab_id" integer NOT NULL,
        "version_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "score" integer NOT NULL DEFAULT 0,
        "passed" boolean NOT NULL DEFAULT false,
        "evaluator_log" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "attempts" integer NOT NULL DEFAULT 1,
        "completed_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lab_completions_user_lab" ON "v4_lab_completions" ("user_id", "lab_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lab_completions_user" ON "v4_lab_completions" ("user_id")`,
    ],
  },
  {
    // v4 task #7 — exam attempts (append-only audit log for every attempt).
    table: "v4_exam_attempts",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_exam_attempts" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "version_id" integer NOT NULL,
        "subject_id" text NOT NULL,
        "scope" text NOT NULL,
        "exam_code" text NOT NULL,
        "scope_ref_id" integer NOT NULL,
        "variant_index" integer NOT NULL DEFAULT 1,
        "answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "score" integer NOT NULL DEFAULT 0,
        "passed" boolean NOT NULL DEFAULT false,
        "gems_deducted" integer NOT NULL DEFAULT 0,
        "request_id" text,
        "attempted_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_exam_attempts_user_scope" ON "v4_exam_attempts" ("user_id", "scope", "scope_ref_id")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_exam_attempts_user" ON "v4_exam_attempts" ("user_id")`,
    ],
  },
  {
    // v4 task #5 — per-lesson generated content cache.
    table: "v4_lesson_content_cache",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_lesson_content_cache" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "language" text NOT NULL DEFAULT 'ar',
        "content_json" jsonb NOT NULL,
        "generation_cost_usd" text,
        "generation_request_id" text,
        "first_student_id" integer,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_lcc_version_lesson_lang" ON "v4_lesson_content_cache" ("version_id", "lesson_id", "language")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_lcc_lesson" ON "v4_lesson_content_cache" ("lesson_id")`,
    ],
  },
  {
    // v4 task #5 — per-(user, lesson, concept) mastery score (0..100).
    table: "v4_concept_mastery",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_concept_mastery" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "concept_index" integer NOT NULL,
        "score" integer NOT NULL DEFAULT 0,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_cmastery_user_lesson_concept" ON "v4_concept_mastery" ("user_id", "lesson_id", "concept_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_cmastery_user" ON "v4_concept_mastery" ("user_id")`,
    ],
  },
  {
    // Facet nugget cache (3-facet teaching model: W2 «لماذا» + W3 «الحدود»).
    // One row per (version, lesson, concept). Lazily generated once by the
    // facet engine, reused across all students + turns. `nuggets` holds both
    // middle-facet payloads (rationale/boundary + rubric/solution); the
    // rubric/solution stay server-side, mirroring the lab/exam grading model.
    table: "v4_concept_facets",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_concept_facets" (
        "id" serial PRIMARY KEY,
        "version_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "concept_index" integer NOT NULL,
        "nuggets" jsonb NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_facets_version_lesson_concept" ON "v4_concept_facets" ("version_id", "lesson_id", "concept_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_facets_lesson" ON "v4_concept_facets" ("lesson_id")`,
    ],
  },
  {
    // v4 task #6 — cross-subject student profile (personal dictionary,
    // warmth anchors, learning style). One row per user; injected into
    // Layer 4 of the teaching system prompt.
    table: "v4_student_profile",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_student_profile" (
        "user_id" integer PRIMARY KEY,
        "personal_dictionary" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "learning_style" text,
        "warmth_anchors" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [],
  },
  {
    // v4 task #6 — weekly compressed memory summary (Haiku-generated).
    // Only the latest row per user is read by the teaching prompt; older
    // rows are kept for audit / regeneration.
    table: "v4_student_memory_summaries",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_student_memory_summaries" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "summary_text" text NOT NULL,
        "period_start" timestamp with time zone NOT NULL,
        "period_end" timestamp with time zone NOT NULL,
        "tokens_estimate" integer NOT NULL DEFAULT 0,
        "cost_usd" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "idx_v4_smsum_user_created" ON "v4_student_memory_summaries" ("user_id", "created_at")`,
    ],
  },
  {
    // v4 task #6 — per-(user, lesson, concept) weakness counter,
    // incremented by the NEEDS_REVIEW protocol tag and surfaced in
    // Layer 4 of the teaching prompt.
    table: "v4_weakness_tracker",
    createSql: `
      CREATE TABLE IF NOT EXISTS "v4_weakness_tracker" (
        "id" serial PRIMARY KEY,
        "user_id" integer NOT NULL,
        "lesson_id" integer NOT NULL,
        "concept_index" integer NOT NULL,
        "error_count" integer NOT NULL DEFAULT 1,
        "last_seen" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_weak_user_lesson_concept" ON "v4_weakness_tracker" ("user_id", "lesson_id", "concept_index")`,
      `CREATE INDEX IF NOT EXISTS "idx_v4_weak_user_last" ON "v4_weakness_tracker" ("user_id", "last_seen")`,
    ],
  },
  {
    // Per-page OCR / extraction status for the professor-mode "where did the
    // text go?" debugger and the new retry endpoint. One row per
    // (material_id, page_number); status is one of 'ok' / 'failed' /
    // 'low_confidence'. The unique index lets the OCR pipeline upsert by
    // (material_id, page_number) without a select-then-insert race.
    table: "material_page_status",
    createSql: `
      CREATE TABLE IF NOT EXISTS "material_page_status" (
        "id" serial PRIMARY KEY,
        "material_id" integer NOT NULL,
        "page_number" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'ok',
        "attempts" integer NOT NULL DEFAULT 1,
        "last_provider" text,
        "error_message" text,
        "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
      )
    `,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "material_page_status_material_page_idx" ON "material_page_status" ("material_id", "page_number")`,
      `CREATE INDEX IF NOT EXISTS "material_page_status_status_idx" ON "material_page_status" ("material_id", "status")`,
    ],
  },
];

// Best-effort: ensure the FTS index over `material_chunks.content_normalized`
// exists. We don't gate on the column existing — auto-migrate adds the
// column first via REQUIRED_COLUMNS, and the GIN index creation below uses
// IF NOT EXISTS so re-runs are idempotent. Wrapped in a try/catch so a stale
// schema (column missing on a half-migrated DB) doesn't crash startup.
async function ensureNormalizedFtsIndex(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "material_chunks_normalized_fts_idx"
      ON "material_chunks" USING GIN (to_tsvector('simple', COALESCE("content_normalized", "content")))
    `);
  } catch (err: any) {
    logger.warn(
      { err: err?.message },
      "auto-migrate: failed to create material_chunks_normalized_fts_idx (will be retried next boot)",
    );
  }
}

// Default prices used to seed `plan_prices` on first boot only. Subsequent
// boots NEVER overwrite admin edits — we use ON CONFLICT DO NOTHING so the
// stored values are the source of truth. Mirrors the legacy `BASE_PRICES`
// constant in routes/subscriptions.ts.
const DEFAULT_PLAN_PRICES: Array<{ region: "north" | "south"; planType: string; priceYer: number }> = [
  { region: "north", planType: "bronze", priceYer: 1000 },
  { region: "north", planType: "silver", priceYer: 2000 },
  { region: "north", planType: "gold", priceYer: 3000 },
  { region: "south", planType: "bronze", priceYer: 2000 },
  { region: "south", planType: "silver", priceYer: 4000 },
  { region: "south", planType: "gold", priceYer: 6000 },
];

async function seedPlanPrices(): Promise<void> {
  try {
    for (const p of DEFAULT_PLAN_PRICES) {
      await db.execute(sql`
        INSERT INTO "plan_prices" ("region", "plan_type", "price_yer")
        VALUES (${p.region}, ${p.planType}, ${p.priceYer})
        ON CONFLICT ("region", "plan_type") DO NOTHING
      `);
    }
  } catch (err: any) {
    logger.error(
      { err: err?.message },
      "auto-migrate: failed to seed plan_prices defaults",
    );
  }
}

// Default Kuraimi payment numbers (mirrors the values previously hardcoded in
// admin.tsx and subscription.tsx). Seeded ON CONFLICT DO NOTHING so admin
// edits persist across restarts.
const DEFAULT_PAYMENT_SETTINGS: Array<{
  key: string;
  value: string;
  label: string;
  category: string;
}> = [
  { key: "kuraimi.north.number", value: "3165778412",            label: "رقم حساب كريمي — الشمال", category: "payment" },
  { key: "kuraimi.north.name",   value: "عمرو خالد عبد المولى", label: "اسم صاحب الحساب — الشمال", category: "payment" },
  { key: "kuraimi.south.number", value: "3167076083",            label: "رقم حساب كريمي — الجنوب", category: "payment" },
  { key: "kuraimi.south.name",   value: "عمرو خالد عبد المولى", label: "اسم صاحب الحساب — الجنوب", category: "payment" },
  // AI charge rate — the single admin knob. "Gems per 1,000,000 teaching-model
  // tokens." Translated to the internal gems-per-USD constant in pricing-formula.
  {
    key: GEMS_PER_1M_SETTING_KEY,
    value: String(DEFAULT_GEMS_PER_1M_TEACHING_TOKENS),
    label: "عدد الجواهر لكل مليون توكن (النموذج التعليمي)",
    category: "ai",
  },
];

// Default YER→USD divisors used to seed `exchange_rates` on first boot only.
// Subsequent boots NEVER overwrite admin edits — we use ON CONFLICT DO NOTHING
// so the stored values are the source of truth. Mirrors the static fallback
// constants in pricing-formula.ts.
const DEFAULT_EXCHANGE_RATES: Array<{ region: "north" | "south"; yerPerUsd: number }> = [
  { region: "north", yerPerUsd: YER_PER_USD_FALLBACK.north },
  { region: "south", yerPerUsd: YER_PER_USD_FALLBACK.south },
];

async function seedExchangeRates(): Promise<void> {
  try {
    for (const r of DEFAULT_EXCHANGE_RATES) {
      await db.execute(sql`
        INSERT INTO "exchange_rates" ("region", "yer_per_usd")
        VALUES (${r.region}, ${r.yerPerUsd})
        ON CONFLICT ("region") DO NOTHING
      `);
    }
  } catch (err: any) {
    logger.error(
      { err: err?.message },
      "auto-migrate: failed to seed exchange_rates defaults",
    );
  }
}

// Load the live divisors from the DB and push them into the in-memory cache
// in pricing-formula.ts. Called once after the seed step at startup so the
// formula sees admin-edited values immediately without waiting for the first
// admin PATCH.
async function loadExchangeRatesIntoFormula(): Promise<void> {
  try {
    const rows = await db.execute<{ region: string; yer_per_usd: number }>(sql`
      SELECT "region", "yer_per_usd" FROM "exchange_rates"
    `);
    const map: Record<string, number> = {};
    for (const r of rows.rows) {
      const divisor = Number(r.yer_per_usd);
      if (Number.isFinite(divisor) && divisor > 0) {
        map[r.region] = divisor;
      }
    }
    setYerToUsdRates(map);
  } catch (err: any) {
    logger.warn(
      { err: err?.message },
      "auto-migrate: failed to load exchange_rates; pricing-formula will use static fallback",
    );
  }
}

async function seedPaymentSettings(): Promise<void> {
  try {
    for (const s of DEFAULT_PAYMENT_SETTINGS) {
      await db.execute(sql`
        INSERT INTO "payment_settings" ("key", "value", "label", "category")
        VALUES (${s.key}, ${s.value}, ${s.label}, ${s.category})
        ON CONFLICT ("key") DO NOTHING
      `);
    }
  } catch (err: any) {
    logger.error(
      { err: err?.message },
      "auto-migrate: failed to seed payment_settings defaults",
    );
  }
}

// Load the admin-configured AI charge rate (gems per 1M teaching tokens) from
// payment_settings and push it into the pricing-formula cache so every charge
// uses the live value immediately at startup (mirrors loadExchangeRatesIntoFormula).
// The admin PATCH endpoint calls setGemsPer1MTeachingTokens directly after an edit.
async function loadGemsRateIntoFormula(): Promise<void> {
  try {
    const rows = await db.execute<{ value: string }>(sql`
      SELECT "value" FROM "payment_settings" WHERE "key" = ${GEMS_PER_1M_SETTING_KEY} LIMIT 1
    `);
    const raw = rows.rows[0]?.value;
    const gemsPer1M = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(gemsPer1M) && gemsPer1M > 0) {
      setGemsPer1MTeachingTokens(gemsPer1M);
    }
  } catch (err: any) {
    logger.warn(
      { err: err?.message },
      "auto-migrate: failed to load gems-per-1M rate; using default",
    );
  }
}

const REQUIRED_COLUMNS: TableSpec[] = [
  {
    // Legacy `quiz_attempts` tables predate the current schema and are missing
    // several columns added when the quiz-attempt system was extended for the
    // materials/professor feature. Backfill-safe DDLs (defaults or nullable).
    table: "quiz_attempts",
    columns: [
      { name: "material_id", ddl: "integer" },
      { name: "kind", ddl: "text NOT NULL DEFAULT 'quiz'" },
      { name: "chapter_index", ddl: "integer" },
      { name: "chapter_title", ddl: "text" },
      { name: "questions", ddl: "text NOT NULL DEFAULT '[]'" },
      { name: "per_question_results", ddl: "text NOT NULL DEFAULT '[]'" },
      { name: "weak_areas", ddl: "text NOT NULL DEFAULT '[]'" },
      { name: "total_questions", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "correct_count", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "status", ddl: "text NOT NULL DEFAULT 'in_progress'" },
      { name: "submitted_at", ddl: "timestamp with time zone" },
    ],
  },
  {
    // Legacy `lab_reports` tables predate the current schema and are missing
    // the columns the current Drizzle schema and the lab_reports SELECT need.
    // Same crash pattern as lesson_summaries: async route with no try/catch →
    // unhandled rejection → whole API process exits. Backfill-safe DDLs.
    table: "lab_reports",
    columns: [
      { name: "subject_name", ddl: "text NOT NULL DEFAULT ''" },
      { name: "env_title", ddl: "text NOT NULL DEFAULT ''" },
      { name: "env_briefing", ddl: "text NOT NULL DEFAULT ''" },
      { name: "report_text", ddl: "text NOT NULL DEFAULT ''" },
      { name: "feedback_html", ddl: "text NOT NULL DEFAULT ''" },
    ],
  },
  {
    // Legacy `lesson_summaries` tables predate the current schema and are
    // missing these columns. The plans route SELECTs all of them, and because
    // the handler is async with no try/catch, a missing column surfaces as an
    // unhandled rejection that CRASHES the whole API process — taking every
    // other route (booklets included) down with it. Backfill-safe DDLs (every
    // added column has a default) so existing rows keep validating.
    table: "lesson_summaries",
    columns: [
      { name: "subject_name", ddl: "text NOT NULL DEFAULT ''" },
      { name: "title", ddl: "text NOT NULL DEFAULT ''" },
      { name: "conversation_date", ddl: "timestamp with time zone NOT NULL DEFAULT now()" },
      { name: "messages_count", ddl: "integer NOT NULL DEFAULT 0" },
    ],
  },
  {
    // High-precision adaptive placement — stage/unit targeting columns.
    table: "v4_placement_test_questions",
    columns: [
      { name: "target_stage_code", ddl: "text" },
      { name: "target_unit_code", ddl: "text" },
    ],
  },
  {
    // AI-generated placement question pool — produced by Haiku from the
    // instruction file content. Stored as JSONB array so the adaptive
    // descent algorithm can use them identically to pre-written questions.
    table: "v4_placement_sessions",
    columns: [
      { name: "generated_questions", ddl: "jsonb" },
    ],
  },
  {
    table: "course_materials",
    columns: [
      { name: "structured_outline", ddl: "text" },
      // Professor-mode columns.
      { name: "printed_page_offset", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "role", ddl: "text NOT NULL DEFAULT 'primary'" },
      { name: "coverage_status", ddl: "text NOT NULL DEFAULT 'ok'" },
      { name: "processing_metrics", ddl: "text" },
    ],
  },
  {
    table: "material_chunks",
    columns: [
      // Arabic-normalized search column.
      { name: "content_normalized", ddl: "text" },
    ],
  },
  {
    table: "material_chapter_progress",
    columns: [
      { name: "covered_points", ddl: "text NOT NULL DEFAULT '{}'" },
    ],
  },
  {
    table: "ai_teacher_messages",
    columns: [
      { name: "subject_name", ddl: "text" },
      { name: "is_diagnostic", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "stage_index", ddl: "integer" },
      { name: "word_count", ddl: "integer" },
      { name: "over_length", ddl: "integer" },
    ],
  },
  {
    // Micro-step progress within the current learning plan stage.
    // currentMicroStepIndex: the last micro-step the student completed (0-based).
    // completedMicroSteps: JSON array of all completed micro-step indices,
    //   e.g. "[0, 1, 2]". Persisted so progress survives session reloads.
    table: "user_subject_plans",
    columns: [
      { name: "current_micro_step_index", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "completed_micro_steps", ddl: "text NOT NULL DEFAULT '[]'" },
      { name: "growth_reflections", ddl: "text NOT NULL DEFAULT '[]'" },
    ],
  },
  {
    // reward_paid_at backfill for existing DBs whose `referrals` table predates
    // the referral-reward feature. Fresh DBs already get it via REQUIRED_TABLES.
    table: "referrals",
    columns: [
      { name: "reward_paid_at", ddl: "timestamp with time zone" },
    ],
  },
  {
    table: "users",
    columns: [
      { name: "messages_used", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "messages_limit", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "subscription_expires_at", ddl: "timestamp with time zone" },
      { name: "referral_access_until", ddl: "timestamp with time zone" },
      { name: "first_lesson_complete", ddl: "boolean NOT NULL DEFAULT false" },
      { name: "referral_code", ddl: "text" },
      { name: "last_session_date", ddl: "text" },
      { name: "last_session_at", ddl: "timestamp with time zone" },
      { name: "referral_sessions_left", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "tryhackme_username", ddl: "text" },
      { name: "sub_page_first_visited_at", ddl: "timestamp with time zone" },
      { name: "sub_page_left_at", ddl: "timestamp with time zone" },
      { name: "welcome_offer_shown_at", ddl: "timestamp with time zone" },
      { name: "welcome_offer_expires_at", ddl: "timestamp with time zone" },
      { name: "welcome_offer_used_at", ddl: "timestamp with time zone" },
      { name: "nukhba_plan", ddl: "text" },
      { name: "region", ddl: "text" },
      { name: "gems_balance", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_used_today", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_daily_limit", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_reset_date", ddl: "text" },
      { name: "gems_expires_at", ddl: "timestamp with time zone" },
      { name: "onboarding_done", ddl: "boolean NOT NULL DEFAULT false" },
      { name: "points", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "streak_days", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "last_active", ddl: "text" },
      { name: "badges", ddl: "text[] NOT NULL DEFAULT ARRAY[]::text[]" },
      { name: "google_id", ddl: "text" },
      { name: "display_name", ddl: "text" },
      { name: "profile_image", ddl: "text" },
      { name: "role", ddl: "text NOT NULL DEFAULT 'user'" },
      { name: "password_hash", ddl: "text" },
    ],
  },
  {
    // The admin "approve subscription request" flow inserts ALL of these
    // columns. If production was last migrated before any of them existed,
    // the INSERT throws "column ... does not exist" and approval fails with
    // a 500. Listing every column here as ADD IF NOT EXISTS is safe (no-op
    // when the column already exists) and self-heals legacy databases.
    table: "user_subject_subscriptions",
    columns: [
      { name: "subject_name", ddl: "text" },
      { name: "activation_code", ddl: "text" },
      { name: "subscription_request_id", ddl: "integer" },
      { name: "paid_price_yer", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "region", ddl: "text" },
      { name: "gems_balance", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_used_today", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_daily_limit", ddl: "integer NOT NULL DEFAULT 0" },
      { name: "gems_reset_date", ddl: "text" },
    ],
  },
  {
    // v4 task #8 — booklet dedupe column. Existing rows from earlier
    // deploys of task #8 may not have this; backfill with NULL.
    table: "v4_student_booklets",
    columns: [
      { name: "content_hash", ddl: "text" },
      // R1 — live processing progress for the FE 4-stage bar.
      { name: "processing_stage", ddl: "text NOT NULL DEFAULT 'extracting'" },
      { name: "processing_percent", ddl: "integer NOT NULL DEFAULT 0" },
      // Phase B — per-booklet progress (lesson stars, lab/exam results).
      { name: "progress", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    // Booklet path linkage. NULL when pathType='custom'; set to the
    // backing booklet id when pathType='booklet'. Nullable so legacy
    // custom-path rows backfill cleanly.
    table: "v4_student_paths",
    columns: [
      { name: "booklet_id", ddl: "integer" },
    ],
  },
  {
    // lesson_stars: persists the star rating (1|2|3) the student earned on
    // each completed lesson so stars survive page refreshes. Stored as a
    // JSONB object mapping lesson_code → star count.
    // Existing rows backfill to an empty object (no stars yet).
    table: "v4_student_paths",
    columns: [
      { name: "lesson_stars", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    // High-precision placement anchor. Holds the boundary unit code "L.S.U"
    // when the student was placed INSIDE a level via unit-tagged questions,
    // so a later re-publish recomputes the unlock set unit-precisely instead
    // of falling back to whole-level granularity. NULL for from_zero /
    // legacy level-only placements (backfills cleanly).
    table: "v4_student_paths",
    columns: [
      { name: "placement_unit_code", ddl: "text" },
    ],
  },
  {
    // Cross-lesson conversational continuity — the tail of the teacher's
    // last response from the previous completed lesson, captured on
    // LESSON_MASTERED. { lessonCode, tailSummary, capturedAt }.
    // NULL for students who haven't completed any lesson yet.
    table: "v4_student_paths",
    columns: [
      { name: "last_lesson_context", ddl: "jsonb" },
    ],
  },
  {
    // Placement strengths/weaknesses snapshot captured at finalize so the AI
    // teacher can personalize from the first lesson. JSONB: { placedUnitCode,
    // reason, totalQuestions, capturedAt, strengths[], weaknesses[] }.
    // NULL for from_zero paths (backfills cleanly).
    table: "v4_student_paths",
    columns: [
      { name: "placement_profile", ddl: "jsonb" },
    ],
  },
  {
    // Approve flow also inserts activation cards with these columns.
    table: "activation_cards",
    columns: [
      { name: "region", ddl: "text" },
      { name: "subject_id", ddl: "text" },
      { name: "subject_name", ddl: "text" },
      { name: "subscription_request_id", ddl: "integer" },
      { name: "used_by_user_id", ddl: "integer" },
      { name: "used_at", ddl: "timestamp with time zone" },
      { name: "expires_at", ddl: "timestamp with time zone" },
    ],
  },
  {
    // Discount-code hardening: max-uses, per-user limit, optional active
    // window. Existing rows get NULL (= unlimited / always active) so the
    // behaviour is unchanged for legacy codes.
    table: "discount_codes",
    columns: [
      { name: "max_uses", ddl: "integer" },
      { name: "per_user_limit", ddl: "integer" },
      { name: "starts_at", ddl: "timestamp with time zone" },
      { name: "ends_at", ddl: "timestamp with time zone" },
    ],
  },
  {
    // v4.1 (Task #13) — meta jsonb column + per-table v4.1 extras.
    // All additive + default safe so v4.0 rows continue to work unchanged.
    table: "v4_specialties",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    table: "v4_levels",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    table: "v4_stages",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    table: "v4_units",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    table: "v4_lessons",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
      { name: "solution_outline", ddl: "text" },
    ],
  },
  {
    table: "v4_lesson_concepts",
    columns: [
      { name: "weight", ddl: "integer NOT NULL DEFAULT 1" },
    ],
  },
  {
    table: "v4_lesson_common_mistakes",
    columns: [
      { name: "severity", ddl: "text NOT NULL DEFAULT 'major'" },
    ],
  },
  {
    table: "v4_lab_scenarios",
    columns: [
      { name: "meta", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
  {
    table: "v4_lab_questions",
    columns: [
      { name: "rubric", ddl: "text" },
      { name: "solution_outline", ddl: "text" },
      { name: "points", ddl: "integer NOT NULL DEFAULT 1" },
    ],
  },
  {
    table: "v4_exam_questions",
    columns: [
      { name: "rubric", ddl: "text" },
      { name: "solution_outline", ddl: "text" },
      { name: "points", ddl: "integer NOT NULL DEFAULT 1" },
      { name: "time_limit_seconds", ddl: "integer" },
    ],
  },
  {
    // gem_ledger: request_id column powers idempotent settle/refund. The
    // accompanying unique partial index is created in ensureGemLedgerRequestIdIndex
    // because REQUIRED_COLUMNS only handles ADD COLUMN, not CREATE INDEX.
    table: "gem_ledger",
    columns: [
      { name: "request_id", ddl: "text" },
    ],
  },
  {
    // ai_teacher_provider_settings: or_model_override column added for the
    // admin model picker (switch between Gemini Flash Lite / Flash / Haiku
    // without changing the API key — all go through OPENROUTER_API_KEY).
    // Existing rows default to '' which keeps the current Flash Lite behaviour.
    table: "ai_teacher_provider_settings",
    columns: [
      { name: "or_model_override", ddl: "TEXT NOT NULL DEFAULT ''" },
    ],
  },
  {
    // Newer fields on subscription_requests (discount + per-subject fields)
    // that may be missing on legacy databases. Without them, request
    // creation works but approve later cannot read e.g. finalPrice/region.
    // NOTE: legacy DBs stored plan in a column called "plan"; the Drizzle schema
    // uses "plan_type". Both can coexist — ADD COLUMN IF NOT EXISTS is safe.
    table: "subscription_requests",
    columns: [
      { name: "account_name", ddl: "text NOT NULL DEFAULT ''" },
      { name: "subject_id", ddl: "text NOT NULL DEFAULT 'all'" },
      { name: "subject_name", ddl: "text" },
      { name: "admin_note", ddl: "text" },
      { name: "discount_code_id", ddl: "integer" },
      { name: "discount_code", ddl: "text" },
      { name: "discount_percent", ddl: "integer" },
      { name: "base_price", ddl: "integer" },
      { name: "final_price", ddl: "integer" },
      // Columns present in the Drizzle schema but absent from legacy DBs that
      // were created before the schema was updated to use plan_type/region/etc.
      { name: "plan_type", ddl: "text" },
      { name: "transaction_id", ddl: "text" },
      { name: "region", ddl: "text" },
      { name: "activation_code", ddl: "text" },
      { name: "notes", ddl: "text" },
    ],
  },
  {
    // activation_cards: legacy DBs used "code" and "plan"; Drizzle schema uses
    // "activation_code" and "plan_type". Add the new names alongside old ones.
    table: "activation_cards",
    columns: [
      { name: "activation_code", ddl: "text" },
      { name: "plan_type", ddl: "text" },
      { name: "region", ddl: "text" },
      { name: "subject_id", ddl: "text" },
      { name: "subject_name", ddl: "text" },
      { name: "subscription_request_id", ddl: "integer" },
      { name: "used_by_user_id", ddl: "integer" },
      { name: "used_at", ddl: "timestamp with time zone" },
      { name: "expires_at", ddl: "timestamp with time zone" },
    ],
  },
  {
    // support_messages: older DBs are missing columns added when threading and
    // richer message metadata were introduced.
    table: "support_messages",
    columns: [
      { name: "user_name", ddl: "text" },
      { name: "user_email", ddl: "text" },
      { name: "subject", ddl: "text NOT NULL DEFAULT ''" },
      { name: "thread_id", ddl: "integer" },
    ],
  },
  {
    // `facets` — per-facet coverage state for the 3-facet teaching model (w2
    // «لماذا» / w3 «الحدود» / pending). Defaults to '{}' so legacy rows behave
    // exactly as before (only W1=score in play; middle facets absent).
    table: "v4_concept_mastery",
    columns: [
      { name: "facets", ddl: "jsonb NOT NULL DEFAULT '{}'::jsonb" },
    ],
  },
];

async function getExistingColumns(table: string): Promise<Set<string>> {
  // استخدم 'public' بشكل صريح بدلاً من current_schema() لأن الأخيرة قد ترجع NULL
  // في بعض إعدادات pg pool عندما يكون search_path فارغاً.
  const rows = await db.execute<{ column_name: string }>(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
  `);
  return new Set(rows.rows.map((r) => r.column_name));
}

export async function ensureRequiredColumns(): Promise<{
  added: Array<{ table: string; column: string }>;
  errors: Array<{ table: string; column: string; error: string }>;
}> {
  const added: Array<{ table: string; column: string }> = [];
  const errors: Array<{ table: string; column: string; error: string }> = [];

  for (const spec of REQUIRED_COLUMNS) {
    let existing: Set<string> | null = null;
    try {
      existing = await getExistingColumns(spec.table);
    } catch (err: any) {
      // لا توقف التنفيذ — `ADD COLUMN IF NOT EXISTS` آمن حتى لو ما عرفنا الأعمدة الحالية.
      logger.warn(
        { table: spec.table, err: err?.message, code: err?.code, detail: err?.detail },
        "auto-migrate: could not introspect; will attempt ADD COLUMN IF NOT EXISTS for all required columns",
      );
    }

    for (const col of spec.columns) {
      if (existing && existing.has(col.name)) continue;
      try {
        await db.execute(
          sql.raw(
            `ALTER TABLE "${spec.table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.ddl}`,
          ),
        );
        added.push({ table: spec.table, column: col.name });
        logger.info(
          { table: spec.table, column: col.name },
          "auto-migrate: added missing column",
        );
      } catch (err: any) {
        errors.push({
          table: spec.table,
          column: col.name,
          error: err?.message ?? String(err),
        });
        logger.error(
          { table: spec.table, column: col.name, err: err?.message },
          "auto-migrate: failed to add column",
        );
      }
    }
  }

  return { added, errors };
}

async function ensureRequiredTables(): Promise<{
  created: string[];
  errors: Array<{ table: string; error: string }>;
}> {
  const created: string[] = [];
  const errors: Array<{ table: string; error: string }> = [];

  for (const spec of REQUIRED_TABLES) {
    try {
      await db.execute(sql.raw(spec.createSql));
      for (const idx of spec.indexes ?? []) {
        await db.execute(sql.raw(idx));
      }
      created.push(spec.table);
    } catch (err: any) {
      errors.push({ table: spec.table, error: err?.message ?? String(err) });
      logger.error(
        { table: spec.table, err: err?.message },
        "auto-migrate: failed to create table",
      );
    }
  }
  return { created, errors };
}

export async function runStartupMigrations(): Promise<void> {
  const start = Date.now();
  try {
    await ensureRequiredTables();
    await seedPlanPrices();
    await seedExchangeRates();
    await loadExchangeRatesIntoFormula();
    await seedPaymentSettings();
    await loadGemsRateIntoFormula();
    const { added, errors } = await ensureRequiredColumns();
    // Spec requires pgvector for booklet RAG. Attempt to enable the
    // extension and add the `embedding_v vector(1536)` mirror column on
    // v4_booklet_chunks. Falls back to JSONB + JS cosine if the
    // extension is unavailable on this Postgres install. Best-effort —
    // server boot must not depend on it.
    try {
      const { tryEnablePgvector } = await import("./v4-booklet");
      await tryEnablePgvector();
    } catch (err: any) {
      logger.warn(
        { err: err?.message },
        "auto-migrate: pgvector probe threw; booklet retrieval will use JSONB fallback",
      );
    }
    // Booklet dedupe index — depends on `content_hash` existing, so this
    // must run AFTER ensureRequiredColumns adds it to legacy tables.
    try {
      // Partial unique: scope dedupe to non-failed rows so a prior
      // failed attempt doesn't block retry of the same PDF bytes.
      // The upload route deletes the failed row before re-inserting,
      // but the partial predicate is the durable invariant.
      await db.execute(sql.raw(
        `DROP INDEX IF EXISTS "uq_v4_booklets_user_subject_hash"`,
      ));
      await db.execute(sql.raw(
        `CREATE UNIQUE INDEX IF NOT EXISTS "uq_v4_booklets_user_subject_hash" ` +
        `ON "v4_student_booklets" ("user_id", "subject_id", "content_hash") ` +
        `WHERE "content_hash" IS NOT NULL AND "status" <> 'failed'`,
      ));
    } catch (err: any) {
      logger.error(
        { err: err?.message },
        "auto-migrate: failed to create uq_v4_booklets_user_subject_hash index",
      );
    }
    // FTS index depends on `content_normalized` column existing — order matters.
    await ensureNormalizedFtsIndex();
    // gem_ledger.request_id unique partial index — prerequisite for the
    // INSERT-first idempotency pattern in lib/charge-ai-usage.ts. Partial so
    // legacy ledger rows (where request_id IS NULL) don't collide.
    // Plain (non-partial) unique index — Postgres treats NULL as distinct, so
    // legacy ledger rows (where request_id IS NULL) coexist freely. The plain
    // index lets us use a simple `ON CONFLICT (user_id, request_id)` target;
    // partial-index conflict targets require a matching WHERE predicate that
    // Drizzle's onConflictDoNothing() cannot express, which would silently
    // break all settles in production.
    try {
      // Drop any older partial variant from earlier dev runs to avoid two
      // overlapping uniques.
      await db.execute(sql.raw(`DROP INDEX IF EXISTS "uq_gem_ledger_user_request_partial"`));
      await db.execute(sql.raw(
        `CREATE UNIQUE INDEX IF NOT EXISTS "uq_gem_ledger_user_request" ` +
        `ON "gem_ledger" ("user_id", "request_id")`,
      ));
    } catch (err: any) {
      logger.error(
        { err: err?.message },
        "auto-migrate: failed to create uq_gem_ledger_user_request index",
      );
    }
    // users.referral_code unique index — `referral_code` is added via
    // REQUIRED_COLUMNS, so this MUST run AFTER ensureRequiredColumns. Plain
    // unique (Postgres treats NULL as distinct, so the many users without a
    // lazily-generated code yet coexist freely); this makes the lazy
    // code-generation collision retry race-safe.
    try {
      await db.execute(sql.raw(
        `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_referral_code" ON "users" ("referral_code")`,
      ));
    } catch (err: any) {
      logger.error(
        { err: err?.message },
        "auto-migrate: failed to create uq_users_referral_code index",
      );
    }
    // Hands-on "التطبيق العملي" system — permanently removed. Drop the cache
    // table and the mastery column it depended on. Best-effort, run last, one-
    // time cleanup on already-migrated DBs (fresh DBs never had these).
    try {
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "v4_concept_hands_on"`));
      await db.execute(sql.raw(
        `ALTER TABLE "v4_concept_mastery" DROP COLUMN IF EXISTS "applied_at"`,
      ));
    } catch (err: any) {
      logger.error(
        { err: err?.message },
        "auto-migrate: failed to drop retired hands-on schema",
      );
    }
    const ms = Date.now() - start;
    if (added.length === 0 && errors.length === 0) {
      logger.info({ ms }, "auto-migrate: schema is up to date");
    } else {
      logger.info(
        { ms, addedCount: added.length, errorCount: errors.length },
        "auto-migrate: completed",
      );
    }
  } catch (err: any) {
    logger.error(
      { err: err?.message },
      "auto-migrate: unexpected failure; server will start anyway",
    );
  }
}
