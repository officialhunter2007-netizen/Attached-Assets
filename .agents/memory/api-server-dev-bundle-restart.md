---
name: api-server dev bundle + dual-instance restart
description: Why backend edits don't appear live until you rebuild AND restart the workflow that actually holds port 8080.
---

# api-server is an esbuild bundle in dev, not hot-reload

The api-server `dev` script is `build && start` — it esbuilds `src` into `dist/index.mjs` and runs the bundle. There is **no file watcher**. Editing `src/routes/*.ts` does NOT take effect in the running server until a rebuild + process restart. Symptom of forgetting: a brand-new route returns **404** while sibling routes in the same file return 401/200 (old bundle still loaded).

# Two api-server instances race for port 8080

The platform auto-starts a standalone `artifacts/api-server: API Server` workflow alongside `Start application` (whose command runs the api-server on PORT=8080). `index.ts` `start()` probes `isPortInUse(8080)`; whichever boots **second** calls `process.exit(0)` and steps aside. So exactly one process owns 8080; the other is a benign no-op duplicate.

**Why this bites:** after editing backend code, restarting only one workflow may not refresh the live server — if the *other* instance currently holds 8080 with the stale bundle, your restart just rebuilds, finds the port taken, and exits. The route stays 404.

**How to apply:** after any api-server backend edit, restart the workflow that actually HOLDS 8080 (usually `Start application`). If a route is still 404 after restart, the standalone instance is the holder — but restarting the standalone often times out with `DIDNT_OPEN_A_PORT` because `Start application` grabs 8080 first; that leaves the standalone showing **"failed"**, which is the *expected* stepped-aside state, not a real failure. Confirm success by curling `localhost:8080/api/<route>` (expect 401 for an auth-gated route, not 404), not by the standalone's status badge.

# Verifying a source edit landed in dist/index.mjs (non-ASCII gotcha)

esbuild emits `dist/index.mjs` with **all non-ASCII escaped**: chars >0xFF as uppercase `\uXXXX` (e.g. `\u062C`, note uppercase hex letters), chars 0x80–0xFF as `\xXX`. So grepping the bundle for a literal Arabic/Unicode phrase **always returns 0** even when the text is present — this is NOT evidence the rebuild missed your edit. To verify: (1) compare mtimes — `dist/index.mjs` newer than your `src` edit means the `build && start` restart rebuilt it; or (2) search for the **escaped** form (`%04X` uppercase for >0xFF, `%02X` for 0x80–0xFF), not the raw string.
