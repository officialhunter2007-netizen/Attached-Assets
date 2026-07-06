---
name: DB migration approach for Replit dev environment
description: How to sync the Drizzle schema when drizzle-kit push is interactive and can't be run non-interactively
---

# DB Schema Migration in Replit

## The Rule
`drizzle-kit push` is interactive (asks about renames) and cannot be piped non-interactively via shell. Use raw `psql "$DATABASE_URL"` with a hand-written SQL script to create missing tables.

**Why:** The project uses drizzle-kit push (not drizzle-kit migrate) in production. In a fresh Replit PostgreSQL DB, the base application tables (users, subscriptions, etc.) don't exist — only the tables managed by the server's `auto-migrate.ts` (admin_alerts, gem_ledger, payment_settings, etc.) get created on server start.

**How to apply:** If the DB is missing tables after a fresh environment setup, run the full `CREATE TABLE IF NOT EXISTS` SQL block from `lib/db/src/schema/*.ts` directly via psql. The correct order respects foreign key dependencies:
1. users, conversations
2. messages (→ conversations), lesson_summaries/lab_reports/ai_usage_events (→ users)
3. course_materials → course_material_blobs, book_units → book_unit_images
4. All other tables (no FK deps)

## Success Signal
Server logs `auto-migrate: schema is up to date — ms: N` with 0 errors on startup.

## Restoring from a pg_dump when whole tables are missing (not just columns)
If `auto-migrate` logs many "failed to add column" errors on tables that don't exist at all (check with `psql \dt`), a column-level fix won't work — the base tables themselves are gone, likely because a migration from the original DB (e.g. Neon) to the new Replit-managed Postgres never happened.

**Why:** `auto-migrate.ts` only ALTERs tables it finds; it never CREATEs the legacy application tables from scratch. If a `pg_dump` backup of the original DB exists in the repo, it's the fastest path to recovery — it has both the exact schema AND real user data.

**How to apply:**
1. Copy the dump, don't edit the original.
2. Strip anything referencing infra-specific schemas/roles that don't exist on the new DB: `\restrict`/`\unrestrict` meta-commands, `CREATE SCHEMA _system` and every `_system.*` object (including orphaned continuation lines if you delete by pattern-match — verify none leak through), and expect (safe to ignore) `role "X" does not exist` errors from `ALTER ... OWNER TO`.
3. Run with `psql -v ON_ERROR_STOP=0 -f dump.sql` so unrelated errors (e.g. `relation already exists` for tables the new schema already created independently) don't abort the whole restore.
4. After restore, confirm both: `auto-migrate: schema is up to date` with `errorCount: 0`, and spot-check real row counts (`SELECT count(*) FROM users`) to confirm data actually landed, not just schema.
