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

**Default-model decision (June 2026):** the student teacher default was set to
`gemini-2.5-flash-lite`, NOT plain `gemini-2.5-flash`. **Why:** lite is priced
IDENTICALLY to the retired 2.0 Flash ($0.10 in / $0.40 out per 1M tok) — so it
restores the old per-turn cost the operator wanted — while being stronger on
Arabic. Plain 2.5-flash is ~4× more expensive on output ($2.50/M).
**Billing trap:** the per-turn gem charge is computed by `costForUsage({model})`
where `model` flows from `geminiResult.model` (= the lock-forced id). The
teacher-turn telemetry `recordAiUsage({model:"..."})` literals in `routes/ai.ts`
ALSO feed `costForUsage` for the cost-cap analytics — so when you change the lock
you MUST update those short-name literals too, or the cap overcounts ~4×. Leave
the full-slug `google/gemini-2.5-flash` calls (ai/lesson|interview|build-plan)
and `V4_CONTENT_GEN_MODEL` on plain flash — only the *teaching* path is lite.
