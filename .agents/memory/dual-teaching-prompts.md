---
name: Dual teaching system prompts
description: Two independent teacher system prompts exist by lesson path; teaching/protocol rules must be edited in both or behavior diverges.
---

The AI teacher's system prompt is built in TWO independent places, one per lesson path:

- `artifacts/api-server/src/lib/v4-teaching-core.ts` — the **v4** teaching path.
- `artifacts/api-server/src/routes/ai.ts` — the **legacy** `/subject` path (still
  live; remains in service until the legacy→v4 cutover is finished).

Both render the **same** frontend `OptionsQuestion` component and the same
`[[ASK_OPTIONS: …]]` protocol, but their prompt text is maintained separately
(ai.ts also has a parallel English block and a separate diagnostic-question block).

**Rule:** any change to teaching/protocol behavior (ASK_OPTIONS formatting, option
count/quality rules, message-length rules, callout/markdown guidance) must be made
in **both** files in lockstep, or a student on one path gets the new behavior and a
student on the other path keeps the old one.

**Why:** a fix that requires "always 3–4 distinct options, never a lone «لا أعرف»"
was added to v4-teaching-core.ts only; the legacy path would still emit the weak
single-option questions, so the user's complaint would appear "unfixed" depending
on which path their session used.

**How to apply:** when editing one teacher prompt, grep the other file for the same
rule (e.g. `rg -n "ASK_OPTIONS|غير ذلك"`) and mirror the edit. Don't assume one
prompt is dead until the legacy `/subject` path is actually removed.
