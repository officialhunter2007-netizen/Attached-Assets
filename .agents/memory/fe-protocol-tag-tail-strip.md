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

## Bracket-ending payloads need a tempered CLOSE, not just a tempered tail

A separate gotcha from the tail-strip: if a `[[X: payload]]` payload can itself END in `]`
(e.g. a code task whose requirement names an array `[3, 9, 5]`), the stream tail is `]]]`.
A plain non-greedy close `…\]\]` (or tempered `(?:(?!\]\])[\s\S])*?\]\]`) closes on the
FIRST `]]`, which truncates the payload AND leaks a stray `]` into prose. Fix: temper the
CLOSE with `\]\](?!\])` so it skips to the LAST `]]`:

```
/\[\[\s*X\s*:\s*([\s\S]*?)\]\](?!\])/g   // extraction + complete-strip
```

This is used by the CODE_TASK marker (teacher-pushes-a-coding-task signal): the marker is
stripped from prose on BOTH server (`stripProtocolTags`) and FE (`sanitizeProtocolNoise`,
complete-strip before tail-strip), and the requirement is delivered to the FE via the
`done` SSE event, never rendered inline. The earlier VIZ form `[^\]]*?(?:\][^\]]*?)*?` does
NOT solve this — being non-greedy it still closes on the first `]]`.

**Why:** any marker whose human-authored payload can legitimately contain a trailing `]`
will silently truncate + leak without the `(?!\])` close. Residual extreme edge (payload
containing `]]` mid-text followed by more prose) is accepted — natural requirements don't.

## A marker's strip must be mirrored at EVERY render surface

The teacher chat renders the SAME message through several independent code paths, and a
protocol-tag strip is per-path. ASK_OPTIONS (clickable-options marker) taught this: it must
be stripped/parsed at **all** of these or the raw tag leaks at the one you miss —
- the parser/extractor (`extractAskOptions`, tempered close) — drives the buttons;
- the **streaming** render (hides complete + unterminated tails mid-stream);
- the **final / non-streaming** render — even though the extractor ran first, a model
  truncation (max-tokens cutoff) leaves an UNTERMINATED tag the extractor can't match, so
  the final render still needs the complete+tail strip pair as a safety net;
- the TTS plain-text sanitizer (else the tag is spoken aloud);
- any history/summary pair-builder that slices past messages.

And these paths are **duplicated across three pages** — `v4-lesson.tsx` (v4 path),
`subject.tsx` (legacy `/subject`), `path-custom.tsx` (diagnostic/placement) — each with its
own `sanitizeProtocolNoise`/render. The buttons render from the parsed `ask`, NEVER from the
HTML, so adding a strip to a render path can't eat them.

**Why:** the legacy `subject.tsx` once had the strip in its streaming variant but NOT its
final render — a clean fix in one place still leaked on truncation in another. Grep the
marker name across ALL pages + ALL render/TTS/history helpers before declaring it fixed.

## Marker predicate parity (server advertises ⇄ FE renders)

When a teaching-prompt layer tells the model about a UI control (e.g. the `</>` محرّر نُخبة
editor) and that control is gated by a FE predicate, the server's "should I advertise this"
predicate MUST be identical to the FE's render predicate (same regex, same input — slug
only). A broader server predicate makes the teacher describe a button the student can't see
and emit markers that never surface. Both are tagged KEEP-IN-SYNC in the source.
