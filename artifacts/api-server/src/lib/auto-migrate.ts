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
];

const REQUIRED_COLUMNS: TableSpec[] = [
  {
    table: "course_materials",
    columns: [
      { name: "structured_outline", ddl: "text" },
    ],
  },
  {
    table: "material_chapter_progress",
    columns: [
      { name: "covered_points", ddl: "text NOT NULL DEFAULT '{}'" },
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
    table: "user_subject_subscriptions",
    columns: [
      { name: "paid_price_yer", ddl: "integer" },
      { name: "region", ddl: "text" },
    ],
  },
];

async function getExistingColumns(table: string): Promise<Set<string>> {
  const rows = await db.execute<{ column_name: string }>(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
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
    let existing: Set<string>;
    try {
      existing = await getExistingColumns(spec.table);
    } catch (err: any) {
      logger.warn(
        { table: spec.table, err: err?.message },
        "auto-migrate: could not introspect table; skipping",
      );
      continue;
    }

    for (const col of spec.columns) {
      if (existing.has(col.name)) continue;
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
    const { added, errors } = await ensureRequiredColumns();
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
