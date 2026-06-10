---
name: ASK_OPTIONS first-option-as-label pitfall
description: The teacher's [[ASK_OPTIONS]] question slot is unreliable; the model writes the question in the body and starts the tag with options, so option[0] renders as a non-clickable label. Fix at the parser, not the prompt.
---

`[[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| غير ذلك]]` is parsed in
`artifacts/nukhba/src/lib/ask-options.ts` (`extractAskOptions`), shared by the v4,
legacy-subject, and custom-path lesson views. `OptionsQuestion` renders the parsed
`question` as a gold `opt-question` label (its `؟` icon looks like `٢` at small
size) and the options as lettered buttons (أ ب ج).

**The recurring failure:** the model very often writes the real question in the
narrative **body**, then starts the tag straight at the first option. The parser
treats segment-0 as `question`, so the FIRST OPTION (usually the correct answer)
renders as a non-clickable gold label and the letter badges start from the 2nd
option. User reported it as "the first option always comes as a label, not a
button."

**Why the prompt can't fix it:** `v4-teaching-core.ts` (~line 1081) already
explicitly forbids this format; the model violates it anyway across many turns.
Prompt rules are probabilistic — this needs a deterministic parser-side guard.

**The fix (FINAL GUARD in extractAskOptions):** if the `question` slot does NOT
read like a question (no ؟/?, no Arabic question/imperative starter, not a
colon-terminated fill-in stem) AND the body's last sentence ends with a question
mark, demote the slot to `options[0]` and clear `question`. Be tolerant of trailing
markdown emphasis (`**…؟**`) and emoji (`…؟ 🤔`) when testing the body tail, or the
guard silently misses. Do NOT gate on option length — the mis-slotted first option
is often longer than the distractors, so a length heuristic wrongly blocks the real
cases.

**How to apply:** when touching ASK_OPTIONS parsing, keep both guards (this one and
the older "orphan first option written as narration" block above it) — they cover
complementary failure modes. Validate with the real `extractAskOptions` via
`pnpm exec tsx` on full raw messages, not a replica of the logic.
