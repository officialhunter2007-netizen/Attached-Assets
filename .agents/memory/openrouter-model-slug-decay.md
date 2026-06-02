---
name: OpenRouter model slug decay
description: OpenRouter retires model slugs over time; the teaching model id is resolved at several independent points that must stay in sync.
---

# OpenRouter model slug decay

OpenRouter **retires older model slugs entirely**. Gemini 2.0 Flash was removed
from the catalog — every 2.0 slug now fails: `google/gemini-2.0-flash-001` → 404
"No endpoints found", `google/gemini-2.0-flash` → 400 "not a valid model ID".
The lowest available Gemini Flash generation became 2.5 (`google/gemini-2.5-flash`).

**Why this hurt:** the symptom was the friendly Arabic failure message
("تعذّر الردّ بسبب خلل مؤقّت") on EVERY teacher turn after disabling the custom
provider — looked like an auth/key problem, but the key was valid (auth/key ping
returned 200, funded). The real cause was a 404 on the hardcoded model slug.

**How to diagnose (from the operator's own Docker box):** the api container has
no `curl`, use `node -e` with global fetch. Hit `GET /api/v1/auth/key` to prove
the key is valid + funded, then POST `chat/completions` with the exact slug to
see the 404/400. List valid slugs via `GET /api/v1/models` filtered by regex.

**How to apply:** the teaching model id is resolved at SEVERAL independent points
that must all be updated together when a slug dies:
- `lib/gemini-stream.ts` — `TEACHING_MODEL_LOCK` + its own `toOpenRouterModel` map
- `lib/openrouter-generate.ts` — a SECOND, separate `toOpenRouterModel` map
- `lib/v4-teaching-core.ts` — `V4_TEACHING_MODEL`, `V4_CONTENT_GEN_MODEL`, and the
  `V4_ALLOWED_TEACHING_MODELS` allow-list (assertGeminiForTeaching throws if the
  new id isn't whitelisted)
- `routes/ai.ts` — direct `openai.chat.completions.create({ model: "google/..." })`
  calls (ai/lesson, ai/interview, ai/plan) that BYPASS both mappers entirely

Defensive pattern added: both `toOpenRouterModel` functions now redirect retired
full 2.0 slugs → 2.5 at the return, so a stray hardcoded slug degrades instead of
404ing. But the allow-list + the lock constant still need manual updates.
