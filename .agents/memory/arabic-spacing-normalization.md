---
name: Arabic spacing normalization (normalizeArabicText)
description: How to safely auto-fix the teacher's fused-word Arabic spacing without mangling ordinary words. Split ONLY on prefix + "ال", never prefix + any letter.
---

`normalizeArabicText` (artifacts/nukhba/src/lib/ask-options.ts) repairs the AI
teacher's occasional fused Arabic words (e.g. "علىالشاشة" → "على الشاشة"). It is
applied to message content in v4-lesson.tsx before render.

**The rule that matters:** split a known prefix off the following word ONLY when
the prefix is immediately followed by the definite article **"ال" + at least one
more letter**. Do NOT split on "prefix + any Arabic letter".

**Why:** the older "prefix + any letter" rule produced visible garbage on common
words where the prefix letters are coincidental — most damaging in THIS app
"عنصر" (element) → "عن صر", plus منهج/منطق/عنوان/منتج/منطقة, the attached-pronoun
words عندك/منه/منها/بينهم/حوله, demonstratives هذان, and verb forms يكونوا/كانوا.
Every genuine fusion the model actually emits is prefix + الـ (a definite noun),
so the "ال" boundary keeps ~all true positives while eliminating the entire
false-positive class. Requiring a letter AFTER "ال" also spares the word/name
"منال" (would otherwise become "من ال"). The only sacrifice is the rare
indefinite fusion ("منهاتف"), which the model almost never produces.

**Pass 2 — tanwin adverbs (added):** standalone adverbs ending in tanwin (جداً,
أيضاً, تماماً, مثلاً, أحياناً, فعلاً, عموماً, دائماً, غالباً, حقاً, etc.) are never
suffixes of larger words. Pattern: `(Arabic char)(جداً|أيضاً|...)` → `$1 $2`.
Zero false-positive risk. Added 2026-06.

**Prefix list additions (2026-06):** added "مع", "في", "لكن" to handle ال-fusions
like "معالطلاب" → "مع الطلاب". These only fire on prefix+ال, so they don't
break valid pronoun forms (فيه/فيها/فيهم/معه/معها remain intact).

**Remaining non-fixable fusions (word + preposition, no ال):**
Examples: "نوعفي" → "نوع في", "هذاالكود" (caught) but "نوعمن" (missed).
These cannot be fixed without morphological analysis — e.g. "كيفية" contains
"في" as interior chars; any regex splitting Arabic-chars+في would break it.
The L9 system prompt now has a spacing reminder to reduce generation frequency.

**System prompt fix (2026-06):** L9 buildLanguageLayer() has an explicit Arabic
spacing rule with negative examples (فيهطريقة, مهمجداً, أكثرمن, معلغة).

**Also removed** the short particles قد/لا/ما/أي/هل from the prefix list entirely
— they are near-pure false positives (break قديم/لازم/مادة/أيام/هلال) and the
model always space-separates them.

**How to apply / test:** when changing the prefix list or the split condition,
run the real function via `pnpm exec tsx` over a keep-set (عنصر, منهج, هذان,
يكونوا, عندك, متغيرفيه, كيفية, فيها, فيه, معها…) AND a split-set (علىالشاشة,
عندالباب, منالكتاب, هذاالكتاب, مهمجداً, صحيحأيضاً…). Keep-set must be unchanged;
split-set must gain exactly one space.
