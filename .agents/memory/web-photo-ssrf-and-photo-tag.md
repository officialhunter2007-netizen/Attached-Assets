---
name: Web-photo SSRF + [[PHOTO]] teacher tag
description: How the real-photo teacher tag is wired, and why allowlist-before-fetch alone is not SSRF-safe.
---

## The [[PHOTO: english query]] tag
The v4 AI teacher can emit `[[PHOTO: <english noun phrase>]]` to show a REAL
photograph (e.g. an actual RAM stick) — distinct from `[[IMAGE:]]` which makes a
STYLIZED generated infographic (FLUX/Pollinations).

- Resolution chain: disk cache (`photo:<normalized>` key) → Wikipedia pageimages
  thumbnail → Wikimedia Commons file search → free generated fallback
  (`resolveTeacherImage(q,{noFal:true})`). Never throws; never bills fal.
- **Zero-FE-change trick**: both `[[PHOTO:]]` and `[[IMAGE:]]` are converted
  server-side into the SAME `[[IMAGE:<hex>]]` wire marker + `imagePlaceholder` /
  `imageReady` SSE events. The FE renders both via the same figure/spinner path.
  When adding a new visual authoring tag, prefer reusing this wire contract over
  inventing a new FE renderer path.
- **BUT the shared marker means the FE can't tell a fetched real photo from a
  generated infographic** — so a real-photo fetch showed the GENERATING spinner
  ("جارٍ توليد الصورة التوضيحية…"), which read as wasteful/slow to users. Fix:
  carry `kind: "photo"|"image"` on the `imagePlaceholder` event; the FE stores it
  and the reconcile effect rewrites the spinner label (photo → "جارٍ جلب صورة
  حقيقية من الإنترنت…"). The server writes `imagePlaceholder` BEFORE the marker
  text, so `kind` is usually in imageMap by render time; the label is still
  corrected in a normal `useEffect`, so a one-frame default-label flash is
  possible (negligible; use `useLayoutEffect` or a kind-aware renderer to kill
  it). Lesson: any user-facing copy that implies the MECHANISM (generate vs
  fetch) must be driven by the real `kind`, not hardcoded on the shared render
  path.
- The per-reply visual cap (`MAX_IMAGES_PER_REPLY`) is SHARED across IMAGE +
  PHOTO via one `__imageCount`. The stream parser scans the EARLIEST of the two
  8-char markers and holds back partial prefixes of EITHER until complete.

## SSRF: allowlist-before-fetch is NOT enough
Checking the host allowlist on the candidate URL *before* `fetch()` does NOT make
the fetch SSRF-safe, because Node's `fetch` auto-follows redirects. A 3xx
`Location` can point at an off-allowlist or internal host and the bytes get read
from there.

**Rule:** any server-side fetch of an AI- or user-influenced URL that is
restricted to an allowlist must set `redirect: "manual"` and re-validate each
`Location` against the SAME allowlist (cap the hop count), not just the initial
URL.

**Why:** architect flagged exactly this gap on the web-photo fetcher — the
pre-fetch host check was bypassable via redirect. Wikimedia upload URLs serve
directly (no redirect) so the happy path is unaffected.

**How to apply:** look for this pattern anywhere a fetch is gated by an
`isAllowed*Host` check; the gate belongs on every hop, not just hop 0. Also note:
an 8MB cap enforced only after `arrayBuffer()` (when no `content-length`) is
looser than a streaming cutoff — acceptable here given the trusted source + 6s
timeout, but tighten if the source set ever widens.

## Latency: the search round-trip dominates, NOT the download
The perceived "photo appears too slowly" delay is the Wikipedia
`generator=search` round-trip (~1.8–2.7s, occasionally a ~5s cold start), not the
byte download (~0.3s for an 800–960px thumb). Two levers fixed it without
touching the same-origin caching design: (1) fire the Wikipedia AND Commons
searches CONCURRENTLY (prefer Wikipedia, fall back to the already-resolved
Commons promise) so the fallback adds no second sequential hop; (2) lean the
search params (gsrlimit/pilimit small, pithumbsize 800).

**Do NOT** rewrite the thumbnail-width bucket in the returned URL (e.g. forcing
`/800px-`): Wikimedia returns HTTP 400 + a ~2KB error body for non-prerendered
widths. Always use the API-provided `thumbnail.source` URL verbatim.

The REST summary endpoint (`/api/rest_v1/page/summary/<Title>`) is ~3x faster
(~0.5s, CDN-cached) but its thumbnail is only ~330px (too soft for inline) and
can't be upscaled by URL rewrite — so it's not a drop-in quality replacement.
