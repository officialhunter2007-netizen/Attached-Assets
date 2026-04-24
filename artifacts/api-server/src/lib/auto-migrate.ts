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

export async function runStartupMigrations(): Promise<void> {
  const start = Date.now();
  try {
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
