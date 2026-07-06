---
name: Teacher render pipeline order
description: The fixed ordering of the v4 AI-teacher markdown render pipeline and why each step must run where it does.
---

The v4 teacher message renderer (`renderHtml` in v4-lesson.tsx) transforms raw model text through a FIXED sequence. The order is load-bearing:

1. strip ANIM / SCENE tags (retired mechanisms — see `visual-mechanisms-scene-anim-retired.md`), then expand VIZ markers — VIZ encodes its JS/HTML (which legitimately contains backticks) into element attributes, out of reach of later backtick-aware steps.
2. normalizeFences — repair malformed ``` code fences.
3. latinizeCodeIdentifiers — force Arabic identifiers inside code → English (comments/strings stay Arabic).
4. extractMathBlocks → mergeSplitCodeTokens → marked → restoreMath → DOMPurify.

**marked gotcha that drives step 2:** a code fence written mid-line (not at line start), e.g. `جرب: ```python print(x)````, is parsed by marked as a single INLINE `<code>` badge with the language tag baked into the visible text. A glued same-line lang tag (` ```python print(x)`) leaks the tag into the block. Do NOT try to fix this by stripping the rendered HTML after marked — that is fragile and false-strips legit first code lines that happen to equal a language word ("text", "go", "c"). Fix at the SOURCE: `normalizeFences` splits on the triple-backtick delimiter (odd segments = inside a fence), lifts a KNOWN language tag onto the fence line, pushes code to its own line, forces the opening fence to start a new line, and re-closes the block — so marked always sees a clean ```lang\nbody\n```.

**Why fence-normalize must run BEFORE latinize:** the latinizer detects a fence by reading everything from ``` up to the first newline as the "language line". A malformed single-line fence (` ```python سعر = 5``` `) has no internal newline, so the latinizer swallows the whole body as a lang tag and the Arabic identifier leaks through un-latinized. Normalizing first guarantees the clean ```lang\nbody\n``` the latinizer's line-based parser needs.

**Why normalize must stay AFTER VIZ expansion:** VIZ bodies contain real backticks; expansion encodes them into attributes so neither the fence normalizer nor the latinizer mis-splits on them. (ANIM/SCENE are now stripped, not expanded, since their permanent retirement.)

**How to apply:** never reorder these steps. Any new backtick/fence-aware transform belongs between VIZ-expansion and marked, and must assume latinize requires already-normalized fences. normalizeFences is a no-op when the text has no ``` so it is cheap to keep first. IMAGE generation is also retired (see `visual-mechanisms-scene-anim-retired.md`); only `[[PHOTO]]` real-photo markers remain, handled separately from this markdown pipeline.
