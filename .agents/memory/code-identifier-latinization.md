---
name: Forcing English code identifiers (Arabic teacher)
description: Why prompt-only fixes fail to keep LLM code identifiers in English, and the deterministic render-time transliteration that does work.
---

# Forcing English code identifiers in teacher code blocks

The Arabic AI teacher (weak model) keeps writing Arabic variable/function/class
names inside code blocks. Prompt rules + per-turn reminders reduce it but NEVER
eliminate it — treating prompt engineering as the guarantee fails repeatedly and
burns user trust.

**Rule:** the guarantee must be a deterministic FE render-time transform, not the
prompt. Transliterate Arabic identifier runs inside ``` fences and inline `code`
spans to English; preserve Arabic in comments (`#`, `//`, `/* */`) and string
literals; EXCEPT interpolated identifiers inside Python f-strings `{…}` and JS
template literals `${…}` (those are real identifiers and must be latinized so the
copied code still runs). Keep prompt rules only as a best-effort reducer.

**Why:** the user's complaint is purely visual (display + copy). Server storage /
TTS keeping the original Arabic is acceptable; the rendered DOM and the copy
button (which read latinized `textContent`) are what matter.

**How to apply — the traps that broke earlier attempts:**
- **Run the latinizer AFTER VIZ tag expansion**, not before. VIZ bodies are raw
  JS/HTML containing backtick template literals with Arabic UI labels; if the
  latinizer sees them first it treats the backticks as code spans and mangles
  the Arabic. After expansion they're encoded into element attributes and out
  of reach — only genuine markdown fences remain. (ANIM/SCENE used to need the
  same treatment before they were permanently retired — see
  `visual-mechanisms-scene-anim-retired.md`; they are now stripped outright,
  earlier in the pipeline, so they no longer factor into this ordering.)
- **Collision guard is mandatory.** Different Arabic words can map to the same
  English (معدل & متوسط → "average"). Without a per-message name map that suffixes
  duplicates (`average_2`), two distinct variables silently merge and the copied
  code is broken. Same Arabic run must always map to the same name (consistency
  across definition + f-string interpolation + later references).
- **Inline spans: only latinize single tokens (no internal whitespace).** The
  teacher wraps Arabic PHRASES in backticks for emphasis (`قائمة الطلاب`); those
  must stay Arabic. A space-free check separates identifier references (latinize)
  from prose emphasis (leave).
- Must be streaming-safe: handle unterminated fences/strings (latinize the
  remainder) since it runs on every partial SSE chunk; the transform is stateless
  per invocation so re-running per chunk converges.

**Residual leaks (accepted, document only):** double-backtick inline spans bypass
the scanner; untagged blocks treat `//` as a comment so Arabic operands after
Python floor-division stay Arabic; non-chat surfaces (dynamic-env renderer,
exam/lab/hands-on panels) are not wired.

**Second incident (2026-07-06) — the allow-list had to flip direction.** The
original design (above) treated fenced code blocks as "latinize by default,
unless the lang tag is explicitly one we skip." That is backwards for a
teaching app: when a fence shows literal PROGRAM OUTPUT (e.g. an untagged ```
block, or one loosely tagged "output"/"text"), the old default-permissive
`commentStyle()` treated it as code and transliterated real Arabic program
output ("مرحبا" → "mrhba") — a correctness bug, not just a cosmetic one,
since it silently rewrote what the program actually prints. **Fix:** flipped
to a `isKnownCodeLang()` allow-list — a fence is only latinized if its lang
tag is an explicitly recognized real language; anything untagged/unknown/
"output"/"text" is left 100% verbatim. Paired with a prompt convention (both
`v4-teaching-core.ts` and legacy `routes/ai.ts` — see `dual-teaching-prompts.md`)
telling the model to always wrap literal output in a dedicated ` ```output `
fence, and a matching FE render path (`teacher-render.ts`: `OUTPUT_LANGS`,
`buildOutputCardHtml`/`decorateOutputBlock`) that renders it in a visually
distinct emerald "screen" card (no gutter, no traffic-light dots) instead of
the gold IDE-style code card, so students can't confuse output with source.
**Why this order matters:** the deterministic allow-list is the real
guarantee (works even if the model forgets the `output` fence convention);
the prompt/rendering split is UX polish on top, not the safety net itself.

**Third incident (2026-07-08) — intentional wrong-code examples lost pedagogical point.**
The AI teacher uses «English vs Arabic» comparisons to teach correct naming conventions
(correct = English identifiers, wrong = Arabic identifiers). But the latinizer was
converting BOTH sides — turning the deliberate Arabic into garbled transliterations
(e.g. `price_وحدة` → `price_whda`) and destroying the lesson's point.

**Fix: `-خطأ` fence-tag suffix.** The teacher writes the wrong-code block as:
` ```python-خطأ ` (or `js-خطأ`, `java-خطأ`, etc.). The latinizer (`code-latinize.ts`)
detects `WRONG_SUFFIX_RE = /-(خطأ|wrong|bad)$/i`, skips transliteration for that
block, and outputs the clean base tag (e.g. `python`) so highlight.js works normally.
No renderer changes needed — the suffix is stripped at the latinizer level.

The AI prompt was updated at 6 locations (3 in `routes/ai.ts` + 3 in
`v4-teaching-core.ts`): rule 8, rule 18, and the per-turn codeLangReminder injection,
plus the 3 matching rules in v4 teaching core. All say: correct code = `python` (always
English identifiers); wrong-example code = `python-خطأ` (Arabic identifiers preserved
by the system automatically).

**Important:** editing `routes/ai.ts` requires an api-server rebuild+restart because
it is bundled by esbuild (no watch mode). Backtick characters inside those template
literals must be escaped as `\`` or esbuild throws "Expected ';'".
