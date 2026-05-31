---
name: pgvector availability on managed Postgres
description: CREATE EXTENSION vector may fail or partially install on managed Postgres; always probe at startup and keep a JSONB fallback.
---
On managed Postgres (Replit's bundled DB, Neon, etc.), `CREATE EXTENSION vector` may fail (extension not in the allowlist), succeed but leave the column at a non-vector type (older pgvector versions), or succeed fully. Hard-coding `vector(N)` in the schema makes the app un-bootable on environments where it isn't available.

**Why:** infrastructure availability is out of the app's control; a hard dependency turns a deployable feature into a deploy-time blocker.

**How to apply:**
- Always probe at startup: try `CREATE EXTENSION IF NOT EXISTS vector`, then `ALTER TABLE ADD COLUMN IF NOT EXISTS embedding_v vector(N)`, then verify via `information_schema.columns` that `udt_name = 'vector'`.
- Cache the result in a module-level `_pgvectorReady` flag exposed via a getter.
- Keep JSONB embedding storage as the schema-of-record (works without the extension); mirror to the vector column when available.
- In retrieval, prefer SQL `<=>` distance when pgvector is ready; fall back to in-JS cosine over the JSONB column otherwise. Sub-2000-chunk corpora are sub-second in JS.
