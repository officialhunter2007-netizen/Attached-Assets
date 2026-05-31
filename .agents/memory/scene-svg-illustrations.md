---
name: SCENE animated illustrations (Sonnet HTML/CSS/JS in sandboxed iframe)
description: How the in-lesson illustrative-animation feature works and the security rule for rendering untrusted model-authored animation markup.
---

# SCENE = Sonnet-authored animation (the in-lesson illustrative-animation feature)

The teacher emits `[[SCENE: <arabic description>]]`; the FE lazily POSTs it to
`/api/v4/scene`, which has **Claude Sonnet** author a self-contained animation
(+ a short step caption track), disk-cached by content hash. This is the
platform's **sole** illustrative-animation tool — the legacy Gemini `[[ANIM]]`
HTML/CSS/JS path is removed from the teacher prompt (`buildAnimationLayer` is
defined-but-NOT-wired into the layers array; its FE iframe mount code is left
intact but unused).

**Medium history (why it kept changing):**
- v1: emoji actors + a sliding text chip → users called it weak/childish.
- v2: Sonnet-authored animated **inline SVG** (SMIL), DOMPurify-sanitized,
  rendered inline. Users STILL called it "بايخ/lame" — SMIL-SVG is the ceiling.
- v3 (current): Sonnet authors a **self-contained HTML/CSS/JS motion graphic**
  (smooth CSS keyframes / requestAnimationFrame / canvas) rendered in a
  **sandboxed `<iframe srcdoc>`**. Far smoother, video-like.

**Why the weak model's complaint was actually right:** the weak Gemini teacher
only ever writes the *description*; Sonnet draws it. But the medium (SMIL-SVG)
was the real limiter, not the author. Upgrading the medium — not re-prompting —
was the fix. The `[[SCENE: …]]` marker name is unchanged across all versions, so
only the store + renderer change, never the teacher protocol.

## Security rule — rendering UNTRUSTED model-authored animation
**Rule:** untrusted HTML/CSS/JS animation runs in a sandboxed iframe with
`sandbox="allow-scripts"` and **NEVER `allow-same-origin`** (opaque origin =
the isolation boundary). On TOP of that, the `srcdoc` carries a strict CSP meta:
`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';
img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'`.

**Why the CSP is not optional:** this app's CORS is `origin:true,
credentials:true` with prod cookies `SameSite=None` (see app-wide-csrf-gap.md).
An `Origin: null` sandboxed script could otherwise attempt credentialed
`fetch()` and read authenticated API responses. `connect-src 'none'` kills all
network egress (fetch/XHR/WebSocket/sendBeacon) so isolation + CSP together
close the exfil path WITHOUT touching the global CORS posture (that remains a
separate, deferred security pass). Because JS is allowed, server-side string
sanitizing is pointless here — do NOT strip `<script>`; rely on iframe+CSP.

**postMessage height autosize:** child posts `{__nukhbaScene:true, height}`;
parent accepts ONLY when `e.origin === "null"`, `Number.isFinite(height)`, and
`e.source === frame.contentWindow` (anti-spoof). Use `Number.isFinite`, not
`typeof === "number"` (the latter accepts NaN and poisons the height).

**Backward compat:** old cached scene files held `{svg}`; the schema now requires
`{html}`, so `SceneSchema.safeParse` fails on read → treated as cache miss →
regenerated. No migration needed.
