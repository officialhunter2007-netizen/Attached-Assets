---
name: Stray markdown noise guard
description: Deterministic fence-aware scrubber for model-emitted markdown syntax that leaks as literal text or produces runaway oversized headings in a chat UI rendered via marked.js.
---

Two distinct symptoms from the same root cause (a markdown-emitting LLM writing `#`/`---`/`>` tokens mid-sentence instead of only at true line starts):

1. **Literal clutter**: `##`, `---` (2+), or a lone `>` glued into the middle of a sentence renders as visible raw text, because marked.js correctly only treats these as block syntax at true line-start — anything else is by design left literal. Prompting the model not to do this is not reliable; a downstream deterministic scrubber is required.
2. **Runaway heading**: the model starts a line with `#`/`##` intending a short heading, but never closes it with a real line break for a long stretch — the entire multi-sentence span becomes one giant heading (matches whatever `.ai-msg h1/h2` CSS weight/size is configured), because markdown headings don't have a natural "end" other than the next newline.

**Why:** Both are rendering-pipeline problems, not prompting problems — the fix must be deterministic and independent of model output quality.

**How to apply:** Add a scrub step that:
- Is fence-aware: split on ``` ``` ``` fences first and only scrub non-fence segments (code blocks with real `#` comments or `>` operators must never be touched).
- Downgrades a line-start heading to plain prose if the body exceeds a length threshold (~100 chars) — this is the "runaway heading" guard.
- Preserves legitimate line-start headings, blockquotes, and pure-hr lines.
- Strips only mid-line 2+ `#`, 3+ `-`, and a lone stray `>`, while protecting `->`, `=>`, `>=`, `<>`, inline code spans (backtick-aware), and list markers.
- Runs in the render pipeline right after VIZ-tag/image-marker expansion and BEFORE fence normalization/stripping and `marked.parse` (see `teacher-render-pipeline-order.md` for why this exact position matters) — must be wired into every render path (streaming AND finalized/historical) and into every page that renders teacher/AI messages (there were 4 independent call sites: legacy subject chat, v4 lesson, booklet session — both live-stream and finalized variants each).

**Testing note:** This UI depends on non-deterministic LLM output, and the message history for existing chats is `localStorage`-driven (not simply re-fetched from a `GET messages` endpoint), so seeding a DB row does not let you preview rendering of historical messages. The fastest reliable verification is: temporarily `export` the page's local (unexported) render function, mount it in a throwaway debug route with hardcoded reproduction strings matching the exact reported bug, screenshot it via app-preview, then fully revert the export/route/file — this exercises the literal shipped pipeline without an expensive full onboarding+diagnostic+AI-streaming e2e run.
