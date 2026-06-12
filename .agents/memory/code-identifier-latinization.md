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
- **Run the latinizer AFTER ANIM/SCENE/VIZ tag expansion**, not before. Those
  bodies are raw JS/HTML containing backtick template literals with Arabic UI
  labels; if the latinizer sees them first it treats the backticks as code spans
  and mangles the Arabic. After expansion they're encoded into element
  attributes and out of reach — only genuine markdown fences remain.
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
