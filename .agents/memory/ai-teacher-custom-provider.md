---
name: AI teacher custom provider override
description: How the v4 smart-teacher provider/model override behaves and why it has no cross-channel fallback.
---

# v4 smart-teacher custom provider override

Admin can point the v4 smart teacher (teaching chat + lesson content gen ONLY) at any
OpenAI-compatible provider: a singleton settings row stores base URL + the **env-var
NAME** of the key + model name. The actual API key value lives in `.env` and is read at
runtime by name — never stored in the DB, never returned by the admin status/test
endpoints (only key-present + tail).

## Fallback rule (deliberate)
- **Unconfigured / disabled / missing env key / blank model → resolver returns null →
  default OpenRouter+Gemini channel + Gemini model lock enforced.** This is the only
  fallback. It fully satisfies the "zero breakage when unconfigured" requirement.
- **Configured + enabled but the live call fails (wrong model, provider down, bad key)
  → NO cross-channel fallback.** The turn surfaces the friendly Arabic apology + refunds
  the gems, and logs the failure loudly tagged `CUSTOM-PROVIDER` so the admin can fix
  their config.

**Why:** the user runs on their own VPS and their default `OPENROUTER_API_KEY` is dead —
the whole reason they configure a custom provider. Auto-falling-back to the default
channel would (a) still fail (dead key) and (b) MASK the custom provider's real error,
making their config impossible to debug. User explicitly chose apology+refund+loud-log
over silent fallback. Do NOT add cross-channel fallback without re-confirming.

**How to apply:** the model lock is bypassed ONLY when the resolver returns a genuinely
active override. Any new student-facing teacher call site must route through the same
resolver, not a hardcoded provider, and must keep the friendly-failure + refund on the
catch path. Keep the `CUSTOM-PROVIDER` log tag on custom-path failures.
