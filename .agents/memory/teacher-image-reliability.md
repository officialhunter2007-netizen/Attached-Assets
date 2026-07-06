---
name: Teacher image reliability hinges on FAL_KEY
description: Why [[IMAGE]] illustrations render inconsistently in live teaching, and the operational fix
---

# Teacher image reliability hinges on FAL_KEY

The teacher `[[IMAGE:]]` pipeline tries three providers in order: **fal.ai (FLUX schnell) → Pollinations → generic SVG poster**.

**Observed (live e2e, 5 back-to-back Python lessons):** with `FAL_KEY` UNSET, fal.ai is skipped, so every image depends on the free **Pollinations** endpoint. Under rapid sequential lesson turns it is unreliable — it timed out (~4s abort) and returned HTTP 429 (rate limit) on 3 of 4 requests, each falling back to the SVG poster. Only ~1 in 4 produced a real raster illustration.

**Why it matters / how to apply:**
- The SVG fallback is a *generic placeholder* (lightbulb emoji + "صورة توضيحية"), carrying zero instructional content. Worse, the teacher still emits a rich `<figcaption>` legend describing a labeled diagram that was never rendered — so the failure is highly visible to students.
- To get consistent high-quality teacher images, **configure `FAL_KEY`** so fal.ai FLUX schnell becomes the primary (server-side, fast) provider; Pollinations alone cannot carry production teaching load.
- Monitor `getTeacherImageStats()` / the hourly "provider stats" log line: a climbing `svg` ratio means timeouts are too tight or the upstream provider is down/rate-limited.
- Even when a raster image succeeds, text-to-image models render **garbled text inside the image** (gibberish Latin/Arabic). The design intentionally relies on the prose + figcaption for the real labels — never depend on text being legible inside the generated image.

**Note:** README (`replit.md`) claims FLUX via fal.ai is the illustration provider; in practice the active fallback was Pollinations because no `FAL_KEY` is set.

**v4 [[PHOTO]] path is now DECOUPLED from this fallback chain.** The real-photo feature (active v4 `/api/v4/teach` flow) NO LONGER falls back to fal.ai/Pollinations/SVG on a miss — `resolveWebPhoto` returns `provider:"none"` and the FE strips the marker. So `FAL_KEY` now only affects the explicit generated-infographic `[[IMAGE:]]` path, NOT real photos. See `web-photo-ssrf-and-photo-tag.md`.

**UPDATE (2026-07-06): the generated-infographic `[[IMAGE:]]` path itself is now retired.** It is dead-capped rather than deleted in the legacy `/subject` route (`ai.ts`): `__imageEnabled` forced `false`, `MAX_IMAGES_PER_REPLY` forced `0` — the functions/imports still exist there but never fire. In the v4 path it was removed outright (`emitVisual` drops `kind==="image"` unconditionally; no generation call is ever made). Everything above this line describes the OLD live behavior for historical/security reference only — see `visual-mechanisms-scene-anim-retired.md` for the full retirement scope. The manifest self-heal section below still applies to any already-served images and to PHOTO.

## Manifest-backed self-heal (broken-image safety net)

A `[[IMAGE]]`/`[[PHOTO]]` URL baked into a saved session used to become a **permanent** broken image if its file was evicted/wiped (deploy disk reset, LRU eviction). Now there is a DB manifest (`teacher_image_manifest`, hash PK) recording how to RE-CREATE each file, and `serveTeacherImage` self-heals on a miss.

**Why:** disk is ephemeral but session HTML persists; without a recreate-recipe an evicted file is a forever-404.

**How to apply / invariants (do NOT regress these):**
- Serve order is load-bearing: **disk statServe fast-path FIRST** (zero DB cost on the hot path) → manifest lookup only on a miss → heal → bump → statServe again → else 404.
- A 404 (miss) MUST carry `Cache-Control: no-store`; a success keeps `immutable`. Caching a miss would defeat a later heal.
- Heal must stay on the **FREE** path: generated-image heal re-resolves the prompt with `noFal:true` (paid fal is NEVER reachable from the unauthenticated GET); the terminal SVG poster always succeeds, so image heal cannot hard-fail.
- Photo heal re-fetches the exact stored `source_url` through the **same** `fetchPhotoBuffer` (host allowlist + per-redirect-hop revalidation + byte cap + magic-byte check all preserved), then falls back to `resolveWebPhoto(query)`. A manifest row with NO query and a now-off-allowlist source_url correctly yields a 404, never a fetch.
- Random hash with no manifest row → 404 with **no** outbound fetch.
- Concurrent requests for one hash collapse onto a single heal via an in-process `healInflight` Map.
- Manifest writes are fire-and-forget (`void`) and include a **cache-hit backfill** so files created before the manifest existed become healable. The DB upsert's `ON CONFLICT` preserves non-empty `query`/`provider` and `COALESCE`s `source_url`, so a later null backfill can never wipe a real source URL.
- Tradeoff (accepted, architect-confirmed): first hit AFTER an eviction is synchronous and can wait on re-fetch/search; the common (un-evicted) path has zero added latency. If literal zero-delay is ever required, add async pre-warm — do not move heal off the serve path naively.
- Test seam: store exports `__setManifestStoreForTests(store|null)` + a `ManifestStore` type; the default DB store's `getDb()` guards on `!DATABASE_URL` so unit tests stay hermetic (no pg pool). Tests must `delete process.env.DATABASE_URL` in `before()` and dynamic-`import` the module AFTER setting `TEACHER_IMAGE_DIR` (CACHE_DIR is read at module load).
