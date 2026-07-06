---
name: VIZ tag greedy-strip truncation
description: sanitizeProtocolNoise's VIZ pattern used a greedy end-of-string match instead of a precise dangling-tail check, silently deleting all content after a complete VIZ tag on every render
---

`sanitizeProtocolNoise` (v4-lesson.tsx) exists to hide an *unterminated* protocol tag while it's still streaming in (e.g. `[[VIZ:` with no closing `]]` yet). Every other tag family (`CODE_TASK`, `ASK_OPTIONS`, `SCENE`, `ANIM`) implements this with a precise negative-lookahead pattern: `(?:(?!\]\])[\s\S])*$` — this only matches if there is genuinely no `]]` before the end of the string, so a *complete* tag followed by more content is left untouched.

The `VIZ` line was written as the naive greedy version instead: `\[\[VIZ:[\s\S]*$`. Because `[\s\S]*` matches across newlines and doesn't stop at `]]`, it always matches from `[[VIZ:` to the literal end of the string — even when the tag is fully closed and followed by headings, `---`, more paragraphs, ASK_OPTIONS, or MASTERY tags. Net effect: **any message with a VIZ tag that isn't the very last thing in the message has everything after it silently deleted**, both while streaming and forever after (same function runs on history reload from the DB), while content *before* the VIZ tag renders perfectly — which is why isolated tests of messages without a VIZ tag, or of the text before one, all looked correct and made this bug hard to isolate.

**Why:** a single non-conforming regex among several near-identical sibling patterns is invisible in a diff/read-through unless you compare it line-by-line against its siblings; the visible failure looks like a downstream rendering/formatting bug, not a truncation bug, unless you specifically check whether trailing content survived.

**How to apply:** any future protocol tag added to this family MUST use the two-step pattern — (1) a tempered-close removal for the complete form if it should be hidden after full render, and (2) `(?:(?!\]\])[\s\S])*$` for the dangling/mid-stream tail — never a bare `[\s\S]*$`. When debugging "message looks truncated/merged mid-stream", check every regex in `sanitizeProtocolNoise` against this pattern first, and test with the tag placed mid-message (not last) using a live multi-turn SSE call, not just a static stored message that happens not to contain it.
