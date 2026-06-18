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
  `imageReady` SSE events. The FE only ever knows about `[[IMAGE:<hex>]]`. When
  adding a new visual authoring tag, prefer reusing this wire contract over
  inventing a new FE renderer path.
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
