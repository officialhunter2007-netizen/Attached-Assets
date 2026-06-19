---
name: Arabic spacing normalization (normalizeArabicText)
description: Why the teacher-text Arabic spacing "repair" heuristic was removed for good and must never be re-added as regex.
---

`normalizeArabicText` (artifacts/nukhba/src/lib/ask-options.ts) is now an
**identity passthrough** — `return text;`. It is applied to teacher message
bodies (v4-lesson.tsx, subject.tsx) and to ASK_OPTIONS question/option labels.

**Rule:** never re-introduce regex-based space-insertion into displayed Arabic.

**Why:** Reconstructing Arabic word boundaries with regex is impossible without
a morphological analyzer/dictionary. The definite article "ال" and the
single-letter prefixes (ب، ل، ك، ف، و) occur *inside* perfectly ordinary words,
so any heuristic that inserts a space before "ال" or after a "prefix" eventually
splits a valid word. Successive tuning attempts (prefix+any-letter → prefix+ال,
tanwin/particle passes, a final "space before every ال" safety net) each fixed
one word-class and broke another. The last version visibly mangled common words
in lessons AND in clickable answer cards: عالم → "ع الم", رسالة → "رس الة",
بالعملاء → "ب العملاء", بالضبط → "ب الضبط". The user demanded a permanent fix
("حل جذري نهائي … لا تتكرر مستقبلا اطلاقا"); the only zero-false-positive
behavior is to not split at all.

**How to apply:** correct spacing is guaranteed *at the source* — the teaching
models emit well-spaced Arabic and the L9 language-layer system prompt
(buildLanguageLayer) carries an explicit "no fused words" rule. If fused words
(e.g. "علىالشاشة") ever resurface, strengthen that prompt rule — do NOT add
post-processing. A genuinely safe normalizer would require a dictionary /
morphological analyzer, and that single function is the place it would live.

**Other Arabic normalizers are unrelated and safe:** `normalizeArabic` /
`normalizeArabicForIndex` (api-server arabic-normalize.ts) only normalize for
search-indexing/dedup comparison — never written back to displayed text;
`normalizeArabicDigits` only maps ٠-٩ → 0-9. Neither inserts spaces.

**Test (when touching this):** run the real function via
`./scripts/node_modules/.bin/tsx` over a keep-set (عالم, رسالة, بالعملاء,
بالضبط, عنصر, منهج, هذان, يكونوا, عندك, كيفية, فيها, فيه, معها) and assert
`output === input` for every entry. tsx is NOT at the repo root — it lives at
`./scripts/node_modules/.bin/tsx`.
