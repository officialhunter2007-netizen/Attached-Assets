---
name: Schema drift on a read path crashes the whole Express 4 API
description: Why a single missing column on a legacy-shaped table takes down the entire backend, and the fix pattern
---

# A missing column on any read path crashes the entire API

## The failure mode
A legacy table can exist with an OLD shape (e.g. `lesson_summaries` had `lesson_id`/`stage_index` but was missing `subject_name`/`title`/`conversation_date`/`messages_count` that the current Drizzle schema + a route SELECT require). When a route reads it, Postgres throws `column "X" does not exist` (42703). Because most routes are `async` with **no try/catch**, that becomes an **unhandled promise rejection**, and Node (15+) **exits the whole process** — taking every other route down with it (symptom can look unrelated, e.g. "booklet system doesn't work" when the crash is actually in the plans route).

**Why it bites:** auto-migrate only adds columns listed in `REQUIRED_COLUMNS`. A table that is created elsewhere (older push / fresh-env SQL) and never listed there silently drifts from the schema — no startup error, just a latent crash the first time that column is read.

## The fix pattern
Add a `REQUIRED_COLUMNS` block in `auto-migrate.ts` covering **every** column the current schema/SELECT expects (not just the first one the error names — fixing one just exposes the next). Use **backfill-safe DDL**: every added column must carry a `DEFAULT` so `ADD COLUMN ... NOT NULL` succeeds on already-populated tables.
- `text NOT NULL DEFAULT ''`, `integer NOT NULL DEFAULT 0`, `timestamp with time zone NOT NULL DEFAULT now()`.
- A DB `DEFAULT` does NOT conflict with a Drizzle `.notNull()` that has no `.default()`: app inserts still supply the value; the default only backfills existing rows and covers omitted-column SQL.

## Tables confirmed to have legacy shape drift
`lesson_summaries` (missing subject_name/title/conversation_date/messages_count), `lab_reports` (missing subject_name/env_title/env_briefing/report_text/feedback_html), `quiz_attempts` (missing material_id/kind/questions/per_question_results/weak_areas/total_questions/correct_count/status/submitted_at). All fixed via REQUIRED_COLUMNS + direct psql backfill.

## Global unhandledRejection handler (last-line defense)
Added to `artifacts/api-server/src/index.ts`: `process.on("unhandledRejection", ...)` + `process.on("uncaughtException", ...)` that LOG but do NOT `process.exit()`. This keeps the server alive when an async route throws without try/catch — the individual request times out, but every other route keeps serving. This does NOT replace root-cause column fixes; it just prevents a single bad request from taking down the whole backend.

## Verify
`psql "$DATABASE_URL" -c "\d <table>"` shows the new columns; re-run the exact crashing SELECT (EXIT=0); port 8080 returns 401 (up) not `000` (down).
