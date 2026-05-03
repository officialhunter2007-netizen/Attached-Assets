import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

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
];

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

const REQUIRED_COLUMNS: TableSpec[] = [
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
    // gem_ledger: request_id column powers idempotent settle/refund. The
    // accompanying unique partial index is created in ensureGemLedgerRequestIdIndex
    // because REQUIRED_COLUMNS only handles ADD COLUMN, not CREATE INDEX.
    table: "gem_ledger",
    columns: [
      { name: "request_id", ddl: "text" },
    ],
  },
  {
    // Newer fields on subscription_requests (discount + per-subject fields)
    // that may be missing on legacy databases. Without them, request
    // creation works but approve later cannot read e.g. finalPrice/region.
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
    await seedPaymentSettings();
    const { added, errors } = await ensureRequiredColumns();
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
