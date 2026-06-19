---
name: Web-photo SSRF + [[PHOTO]] teacher tag
description: How the real-photo teacher tag is wired, and why allowlist-before-fetch alone is not SSRF-safe.
---

## The [[PHOTO: english query]] tag
The v4 AI teacher can emit `[[PHOTO: <english noun phrase>]]` to show a REAL
photograph (e.g. an actual RAM stick) — distinct from `[[IMAGE:]]` which makes a
STYLIZED generated infographic (FLUX/Pollinations).

- Resolution chain: disk cache (`photo:v3:<normalized>` key) → Wikipedia
  pageimages thumbnail → Wikimedia Commons file search → Openverse thumbnails
  (all three searches fire CONCURRENTLY). **On a total miss it returns
  `{url:"", provider:"none"}` — it does NOT fall back to a generated AI image or
  SVG poster.** Deliberate product contract: a REAL-photo feature that silently
  substitutes an AI image on miss defeats its purpose, AND that generated fallback
  (Pollinations, with FAL_KEY unset) was the slow/flaky path users complained
  about. A miss is a first-class terminal outcome, not a fallback to "something".
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
- Per-reply visual caps are PER-KIND: real photos and generated images have
  SEPARATE counters (`__photoCount` ≤ 2, `__imageCount` ≤ 1) so a reply can show
  multiple real photos without starving (or being starved by) a generated
  infographic. The stream parser scans the EARLIEST of the two 8-char markers and
  holds back partial prefixes of EITHER until complete. (SCENE is NOT counted
  here — it's handled on its own route, so it has no server-side per-reply cap.)
- Because a PHOTO can now terminally MISS, the wire protocol has a THIRD SSE
  outcome beside `imagePlaceholder`/`imageReady`: `imageMissing:{id}`. The FE
  carries a `"missing"` image state and STRIPS the `[[IMAGE:id]]` marker (no
  spinner, no broken placeholder) in BOTH the live inline render and the
  post-stream DOM reconcile.

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
`isAllowed*Host` check; the gate belongs on every hop, not just hop 0. The
allowlist now also includes `api.openverse.org` (tertiary provider); Openverse
thumbnails are ALSO host-filtered at search time, so an off-allowlist thumb never
becomes a candidate. The 8MB cap is now a STREAMING cutoff (running byte count via
`getReader()`, abort the instant it crosses the cap), with a capped one-shot
`arrayBuffer()` only when no WHATWG stream exists — this defends against a
missing/lying `content-length` that an `arrayBuffer()`-after check would miss.

## Latency: the search round-trip dominates, NOT the download
The perceived "photo appears too slowly" delay is the Wikipedia
`generator=search` round-trip (~1.8–2.7s, occasionally a ~5s cold start), not the
byte download (~0.3s for an 800–960px thumb). Two levers fixed it without
touching the same-origin caching design: (1) fire the Wikipedia AND Commons
searches CONCURRENTLY (prefer Wikipedia, fall back to the already-resolved
Commons promise) so the fallback adds no second sequential hop; (2) lean the
search params (gsrlimit/pilimit small, pithumbsize 800).

**Bound the DOWNLOAD walk too.** Searches are concurrent, but the byte-download
walk is SEQUENTIAL (wiki → commons → up to 4 ranked openverse candidates), each
with its own per-fetch timeout. A pathological run where every host accepts the
connection then hangs would otherwise stack ~6 single-fetch timeouts. Guard the
whole walk with a total wall-clock deadline (`start + WEB_PHOTO_TOTAL_BUDGET_MS`,
re-checked before each fetch). Rule: any sequential candidate walk where each step
has its own timeout needs an overall deadline, or N hanging candidates = N stacked
timeouts.

**Do NOT** rewrite the thumbnail-width bucket in the returned URL (e.g. forcing
`/800px-`): Wikimedia returns HTTP 400 + a ~2KB error body for non-prerendered
widths. Always use the API-provided `thumbnail.source` URL verbatim.

The REST summary endpoint (`/api/rest_v1/page/summary/<Title>`) is ~3x faster
(~0.5s, CDN-cached) but its thumbnail is only ~330px (too soft for inline) and
can't be upscaled by URL rewrite — so it's not a drop-in quality replacement.

## A Wikipedia article lead image is often a DIAGRAM, not a photo
For a REAL-photo feature, the Wikipedia `pageimages` lead is a trap: for very
many physical objects the lead is an SVG schematic / icon / logo (e.g. "Computer
monitor" → `MonitorLCDlcd.svg`), rasterized on a TRANSPARENT background. It
downloads as a perfectly valid PNG and passes magic-byte validation, so nothing
rejects it — but it renders as a near-blank white box with a faint outline, which
users read as a broken/missing image.

**Rule:** reject SVG-DERIVED thumbnails in the Wikipedia path (Wikimedia encodes
the source type in the URL: `.../Name.svg/960px-Name.svg.png` → match
`/\.svg(?:\.|\/)/i`) and fall through to the Commons `filetype:bitmap` search,
which returns real photographs AND raster (PNG/JPG) diagrams for genuine diagram
queries. Don't try to "fix" this by looking at bytes — a rasterized SVG is a
real PNG; the only signal is the source-file type in the URL.

**Commons relevance:** raw Commons search relevance can float an off-topic real
photo to the top (e.g. "computer monitor" → "Amiga500 system.jpg"). Rank the
valid bitmap candidates by how many query words (len≥3) appear in the file title;
keep search order on ties. Cheap, deterministic, and lifts the on-topic photo.

## Changing the photo RESOLVER means busting the photo CACHE
`resolveWebPhoto` checks the disk cache (`photo:<query>` hash) BEFORE it searches.
So any improvement to the provider/ranking logic is invisible for every query a
user already requested — the stale (possibly blank/wrong) file is served forever
until LRU eviction. **Rule:** whenever you change what the resolver would pick,
bump the cache-key namespace (`photo:` → `photo:v2:`); old files orphan and
evict, every query re-resolves once with the new logic. Verifying the new logic
against the live Wikimedia APIs is NOT enough — a cold-cache test passes while
the user's warm cache still serves the old bad image.

## Async-settled visual state must be a DEP of the persist effect
The FE bakes settled images into the localStorage session snapshot
(`inlineReadyImages`: ready → `<figure><img>`, missing → drop the marker) so a
reloaded session shows the real picture, not a stuck spinner. BUT images settle
(ready/missing) ASYNCHRONOUSLY — typically AFTER the message text finalized, i.e.
after the last change to the `messages` array. If the persist `useEffect` depends
only on `messages` and NOT on the image-state map, the late `imageReady`/
`imageMissing` updates the LIVE UI but is never written to storage — so the
reloaded session renders a PERMANENT spinner for an image the server already
settled (it won't re-fire on reload). **Rule:** the image/visual-state map MUST be
in the persist effect's dependency array. Generalizes to any async-resolved render
state that gets snapshotted to storage.
