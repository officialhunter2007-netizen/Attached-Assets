---
name: FE protocol-tag tail-strip regex
description: How the teacher-bubble renderer hides unterminated [[X: ...]] / [[X]]...[[/X]] markers mid-stream without eating complete tags.
---

# FE double-bracket protocol tags (VIZ / ANIM / SCENE / IMAGE) tail-strip

The lesson renderer streams partial text. Markers like `[[VIZ: …]]`, `[[ANIM]]…[[/ANIM]]`,
`[[SCENE: …]]`, `[[IMAGE: …]]` must NOT flash as raw text before they're complete, then
must be expanded into mount `<div>`s once whole (a React root is hydrated per mount in
TeacherBubble — same lifecycle for VIZ and SCENE).

## The gotcha

`sanitizeProtocolNoise` strips unterminated tails at end-of-buffer. The CRUDE form
`/\[\[VIZ:[\s\S]*$/` is greedy and will ALSO nuke a COMPLETE trailing tag (works for
VIZ only because the teacher is told to follow it with a Socratic line, so it's rarely
the literal last token). For any NEW marker, use the PRECISE lookahead form so only
unterminated tails are hidden and complete tags survive to the expand step:

```
.replace(/\[\[SCENE:(?:(?!\]\])[\s\S])*$/g, "")          // param tag, closes with ]]
.replace(/\[\[ANIM\]\](?:(?!\[\[\/ANIM\]\])[\s\S])*$/g, "") // block tag, closes with [[/ANIM]]
```

**Why:** a complete `[[SCENE: …]]` that happens to be the last thing in a finalized
message would be eaten by the greedy form and never render.

**Also remember:** add the mount data-attrs to DOMPurify `ADD_ATTR`, expand the marker
into a `<div data-x-mount …>` in `renderHtml` BEFORE `marked.parse`, and gate the
React-root mount effect on `!isStreaming`. Server `stripProtocolTags` leaves these
double-bracket markers intact so they reach the FE.
