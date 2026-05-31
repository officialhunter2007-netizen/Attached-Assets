---
name: OpenRouter key shadowing via .replit userenv
description: A scrubbed placeholder key in .replit [userenv.shared] silently 401s every AI call; symptom is a misleading text/error fallback in the UI.
---

# Symptom
In-lesson animations (and any AI feature) silently degrade — e.g. an animation renders
as a plain TEXT/error card instead of the real motion graphic. No obvious crash; the FE
just shows its graceful fallback. Underlying cause is an HTTP 401 "Missing Authentication
header" from OpenRouter on every model call.

# Root cause
`.replit` `[userenv.shared]` can hold an `OPENROUTER_API_KEY` entry. When Replit's
secret-scrubber rewrites a committed plaintext key, it leaves a literal placeholder
(observed: `"REMOVED_KEY"`, 11 chars, ends `_KEY`). That placeholder loads as the runtime
env var and the server authenticates with a dead string → 401 → AI features fall back.

# Diagnosis
- `viewEnvVars` for the key shows both a `shared` env var (the placeholder) and `secrets:true`.
  In this project those are the SAME single entry, not two — deleting the shared one clears both.
- Fastest confirmation: a key self-test reporting format/length/tail + an OpenRouter ping. A
  valid key is ~73 chars, `sk-or-...`, ping httpStatus 200.

# Fix
Drop the placeholder from `.replit` `[userenv.shared]` (clears the unified entry → runtime reads
`missing`), then have the user paste a valid `sk-or-` key into the Secrets store and restart.

**Why:** never keep API keys in `.replit` userenv — they get committed/scrubbed and shadow
the real Secret. Keep them only in the Secrets store.

**How to apply:** if any AI feature silently shows a text/error fallback, FIRST check the key
with viewEnvVars + a ping self-test before suspecting model slugs, prompts, or integration
code. A scrubbed placeholder in userenv is a prime suspect.

# Related
Repo also contained real keys in plaintext (`ecosystem.config.js`, attached_assets) and a
plaintext `GOOGLE_CLIENT_SECRET` in `.replit`. Flag for rotation; exposed keys should be
revoked and regenerated.
