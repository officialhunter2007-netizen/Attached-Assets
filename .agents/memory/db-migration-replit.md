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
