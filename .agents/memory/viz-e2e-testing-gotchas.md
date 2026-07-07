---
name: v4 teach turn history & VIZ e2e testing gotchas
description: Why curl-based multi-turn testing of /api/v4/teach silently looks broken, and how to prove a VIZ side-channel (COMPARE/DIAGRAM) actually renders without a live browser.
---

## isFirstTurn is 100% client-supplied, not server session state
`POST /api/v4/teach` computes `isFirstTurn = history.length === 0` from the `history` array in the
**request body** — there is no server-side conversation/session record. If a test script (or any
non-FE caller) fires each turn as an independent request without echoing back the growing
`[{role,content}...]` transcript, EVERY turn looks like the opening message forever.

**Why:** the opening-message guardrail deterministically strips/blocks VIZ-family tags
(SCENE/IMAGE/PHOTO/DIAGRAM/COMPARE) so lesson intros can't misfire a half-broken visual. A test
harness that doesn't replay history will see every COMPARE/DIAGRAM attempt logged as
`dropped ... tag — opening message` and will misdiagnose it as an interception bug.

**How to apply:** when curl-testing multi-turn AI behavior, capture the full streamed assistant
`content` from turn N and pass it back as `history` on turn N+1. Don't conclude a visual-tag
feature is broken until you've confirmed you're actually on turn 2+.

## Proving a VIZ side-channel end-to-end without a working browser test
The hard part of a COMPARE/DIAGRAM/etc. side-channel is NOT the React render (that's a normal,
easily-reviewed component) — it's the async round trip: model emits `[[COMPARE:...]]` → server
converts it in-stream to `[[VIZ: template=comparison, payload={pendingId}]]` → a background author
job runs → a `comparisonReady`/`diagramReady` SSE event lands later in the same stream with the
real payload. That round trip is fully provable via curl/SSE inspection alone (grep the raw stream
for the `Ready` event and diff its payload shape against the renderer's expected props) — a
Playwright browser is only needed to confirm CSS/layout, not data-flow correctness.

**Why:** Playwright/browser-testing infra can go down independently of the app (symptom: `river
service (jsNotebook - evaluate): Notebook not found` or `Page crashed` on every attempt, while a
direct `screenshot` tool call and workflow logs show the app itself is healthy). Don't let
transient testing-infra outages block shipping when the harder backend contract is already proven.
