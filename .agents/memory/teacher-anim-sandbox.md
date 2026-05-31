---
name: Live animation tag ([[ANIM]]) sandbox pattern
description: How the v4 teacher renders untrusted LLM-generated HTML/CSS/JS animations safely inside the chat bubble.
---

# [[ANIM]] live-animation rendering

The v4 teacher can emit a self-contained HTML/CSS/JS animation between
`[[ANIM]] … [[/ANIM]]` that plays like a short video inside the message bubble
(used for *processes*: TLS/NTLM handshakes, sorting algorithms, packet flows —
things a static FLUX image can't show, and FLUX can't render Arabic text at all).

**Security model — isolation, NOT sanitization.** The raw markup deliberately
bypasses DOMPurify. It is only ever executed inside an
`<iframe sandbox="allow-scripts">` with **NO `allow-same-origin`** → the frame
gets an opaque origin and cannot touch parent cookies/localStorage/DOM or make
credentialed requests. Never add `allow-same-origin` to that iframe — it would
collapse the entire boundary.

**Why a side channel + mount div:** the block is extracted BEFORE marked/DOMPurify
run, URL-encoded onto `<div data-anim-mount data-anim-html>`, and hydrated into the
iframe imperatively (same pattern as the VIZ mounts). Complete blocks become inert
mount divs; an unterminated trailing `[[ANIM]]` is stripped during streaming so raw
HTML never flashes as text.

**Auto-resize:** the wrapper doc posts its height via `postMessage`; the parent
listener accepts only `e.origin === "null"` (opaque sandboxed origin) AND matches
`e.source === frame.contentWindow`, then clamps height. Both checks are anti-spoof —
keep them.

**Pass-through:** `stripProtocolTags` (v4-protocol-tags.ts) must NOT strip `[[ANIM]]`
(its regexes only match single-bracket tags + CREATE_LAB_ENV/VIZ). The teacher is
instructed to emit body-only markup (no <html>/<body>); buildAnimDoc supplies the
RTL dark shell.
