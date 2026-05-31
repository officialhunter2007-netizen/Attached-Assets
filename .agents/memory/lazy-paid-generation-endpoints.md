---
name: Lazy paid-generation endpoints
description: Design rules for FE-triggered, content-hash-cached endpoints that call a paid model on cache miss (e.g. teacher images, interactive scenes).
---

# Lazy paid-generation endpoints (cache-by-hash + model call on miss)

Pattern: the teaching model emits a lightweight marker; the FE lazily POSTs the
description to a route that returns cached JSON or generates once via a paid model
and persists by content hash (disk cache + in-flight dedup). Examples: teacher
image store, v4 interactive "scene" store.

## Rules that bit us / are easy to get wrong

- **Cache key must include EVERY input fed to the prompt.** If `lessonName` (or any
  context) is in the generation prompt but not in the hash, the same topic under a
  different context serves a stale/cross-context result. Concatenate fields with a
  `\u0000` separator before hashing to avoid field-boundary collisions.
  **Why:** silent staleness is invisible until a user reports a "wrong" cached answer.

- **Rate-limit only the genuine cache-MISS path, placed AFTER the cache lookup AND
  the in-flight-dedup check.** Auth + CSRF stop cross-site abuse but NOT first-party
  abuse: an authenticated user can spam unique topics and force unbounded paid calls.
  A per-user sliding-window limiter (mirror `routes/ai.ts` variant limiter) on misses
  closes this. Free hits and dedup-joiners must never consume a token.
  **How to apply:** pass `userId` into the store fn; consume the token between the
  in-flight check and the model call; throw a typed error → route maps to 429 +
  `Retry-After`; FE degrades to a plain text card.

- **Never crash on missing API key.** Map `OPENROUTER_API_KEY` missing → a typed
  error (`reason:"unconfigured"`) → friendly 503; FE shows the description as text so
  the lesson is never blocked. Same for credits-exhausted.

- **Sanitize model output, don't reject it.** Drop dangling actor/entity refs and
  de-duplicate ids (duplicates collapse a FE id→index map and trigger React key
  collisions). Prefer salvaging an otherwise-good payload over a wasted paid call.
