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
