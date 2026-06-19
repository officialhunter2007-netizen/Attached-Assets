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

## Scene QUALITY levers
- **Few-shot gold example is the #1 quality lever.** Freeform "author HTML/CSS/JS"
  prompting (however verbose the rules) makes the model improvise SPARSE,
  MOTIONLESS scenes — a couple of static labelled boxes on an empty grid. The fix
  that actually moved quality was embedding ONE complete runnable gold-standard
  example in the system prompt (full stage, ≥3 labelled elements, an obvious
  continuous looping motion, brand colours) + an explicit "fatal errors to avoid"
  block naming the exact failures (empty scene / no visible motion / vague boxes /
  wasted space). Prose rules alone don't land; the model copies the *level* of a
  concrete example.
- **Changing the prompt does NOTHING for already-cached topics.** Scenes are
  disk-cached by `sha256(lessonName \u0000 topic)` under
  `artifacts/api-server/data/v4-scenes/*.json` and served verbatim forever. After
  any prompt/quality change you MUST clear that dir (or bump the hash basis) or
  the user keeps seeing the old poor scene. (Schema *shape* changes self-invalidate
  via safeParse; prompt-only quality changes do not.)

## FE flash/disappear bug (manual-nav stepper)
The lesson renders teacher HTML via `dangerouslySetInnerHTML`, which destroys the
entire DOM subtree on every `html` change → the `data-scene-mount` node loses
identity → `SceneMount` unmounts/remounts on a NEW node → state resets to
"loading" → looks like the scene "appeared then vanished". Fix = a **module-level
`_sceneCache = new Map<key,Scene>()`** in scene-stepper.tsx; `SceneMount` inits
state from it (`useState(() => cache.get(key) ? ready : loading)`) and writes on
fetch success, so remounts restore instantly. Key mirrors the server basis
(`lessonName\u0000topic`, trimmed+lowercased). Autoplay was also removed — the
stepper is manual-only (التالي/السابق) per user preference.
