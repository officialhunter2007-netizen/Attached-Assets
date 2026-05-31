---
name: v4 instruction-file publish must scale to tens of MB
description: Why the v4 admin publish pipeline batches inserts and needs a large body limit
---

A full per-specialty v4 instruction file (5 levels × 7 stages × 9 units × 10
lessons + labs + exam banks) serializes to **tens of MB** of Arabic JSON and
expands to **tens of thousands of DB rows**. Two hard constraints fall out:

- **Body limit:** the global `express.json` limit must comfortably exceed the
  serialized file size (currently 64mb in `app.ts`). Too low → the upload dies
  with a 413 *before* reaching `/api/admin/v4/publish`, surfacing as a cryptic
  JSON-parse error on the FE.
- **Inserts must be batched, never per-row.** `publishV4InstructionFile`
  bulk-inserts each table in chunks and wires parent→child FKs by **natural key**
  (`level_index` / `code`) read back from chunked `RETURNING` — NOT by positional
  order (Postgres does not guarantee RETURNING order across a multi-row insert).

**Why:** the original normalizer did one `await tx.insert()` per row inside
nested loops — tens of thousands of sequential round-trips in one transaction
that reliably timed out the HTTP publish for real curricula.

**How to apply:** any future change to the publish normalizer must keep both
properties. Keep `INSERT_CHUNK` so `chunk × widest-table-column-count` stays
under Postgres's 65535 bound-parameter cap (~16 cols → 500 is safe). The whole
publish stays inside one `db.transaction` for all-or-nothing atomicity.

## Body-size ceilings live IN FRONT of express — compress, don't just raise limits

Raising `express.json` limit alone does NOT stop large-file publish failures.
There are body-size ceilings the request hits BEFORE express: nginx
`client_max_body_size` (was 20m in `docker/nginx/*.conf`) and any upstream proxy
(incl. Replit's dev proxy). A multi-MB upload 413s before the route ever runs.

**Permanent fix:** the FE gzip-compresses the JSON in the browser
(`CompressionStream('gzip')`, `Content-Type: application/gzip`, plain-JSON
fallback) for BOTH `/admin/v4/validate` and `/admin/v4/publish`. JSON compresses
~10-20×, so a tens-of-MB curriculum arrives as a few MB and clears every proxy
limit no matter how big the curriculum grows. Server inflates via a route-level
`express.raw({type:['application/gzip','application/octet-stream']})` + a
`decodeInstructionBody` gunzip middleware wired AFTER auth/CSRF, BEFORE handlers;
non-Buffer bodies (plain JSON) pass through untouched.

**Why compression over just bigger limits:** it removes file SIZE as the binding
constraint entirely instead of chasing the next proxy's ceiling. nginx limit was
still bumped 20m→128m as defense-in-depth.

**Gzip-bomb guard:** admin-only endpoints, but the gunzip caps inflated output
(`{ maxOutputLength: 128*1024*1024 }`) so a hostile payload can't exhaust memory.
