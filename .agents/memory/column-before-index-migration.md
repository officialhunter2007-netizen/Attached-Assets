---
name: Column-before-index migration ordering
description: In auto-migrate, indexes that reference columns added via REQUIRED_COLUMNS must be created after ensureRequiredColumns(), not in REQUIRED_TABLES.indexes.
---
The auto-migrate orchestration runs in this order: ensureRequiredTables() → ensureRequiredColumns() → custom post-column steps. If a table exists on a legacy deploy without column X, and a partial-unique index references X, putting that index in REQUIRED_TABLES.indexes fails at startup (column doesn't yet exist) — ALTER ADD COLUMN IF NOT EXISTS only runs in the later phase.

**Why:** the legacy-database upgrade path silently breaks before any user request lands.

**How to apply:**
- Create such indexes in a dedicated try/catch block inside runStartupMigrations() AFTER `await ensureRequiredColumns()`.
- Use `CREATE INDEX IF NOT EXISTS` so it's idempotent on already-migrated DBs.
- If the index can be created on fresh schemas (where the column is in the original CREATE TABLE), keep ONLY the post-column creation step — don't duplicate it in REQUIRED_TABLES.indexes or you reintroduce the race.
