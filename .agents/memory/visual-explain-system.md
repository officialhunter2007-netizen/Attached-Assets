---
name: Visual Explain System
description: Playwright + manus.im + AI Doctor pipeline for interactive HTML visual explanations. Triggered by "شرح بصري" button. Hardened for maximum resilience.
---

## Architecture

**Route**: `POST /api/v4/visual-explain` — `artifacts/api-server/src/routes/v4_visual_explain.ts`

## Pipeline

```
Student clicks button
      ↓
[1] Playwright → manus.im
      ↓
[2] AI Doctor (3-model fallback)
      ↓
[3] Frontend overlay (iframe)
```

## Critical Build Notes

- **Import**: `import("playwright")` NOT `import("playwright-core")` — playwright-core is NOT installed; playwright IS installed in `artifacts/api-server/node_modules/playwright`
- **build.mjs external**: `playwright`, `playwright-core`, `playwright-chromium` all marked external
- **Chromium**: Nix package `chromium` added to `.replit [nix] packages`; path auto-detected via `which chromium`

## Resilience Mechanisms

### Browser lifecycle
- `_browser.on("disconnected")` handler → auto-clears `_browser`, `_context`, `_contextValid` on crash
- `_contextValid` flag → `getContext()` rebuilds context if stale without crashing
- `invalidateContext(alsoCloseBrowser?)` — clean teardown on error

### Retry
- `withRetry(fn)` — 1 automatic retry with full browser+context reset + 2.5s pause on any Playwright error

### Input detection
- `sendMessage` has 3 strategies: fill → JS evaluate+dispatch → keyboard type
- `trySend` has 3 strategies: button selectors → Ctrl+Enter → Enter

### Response waiting
- Phase 1: wait for loading indicators to disappear
- Phase 2: DOM stability — `STABILITY_POLLS=4` consecutive identical `body.innerText` snapshots × `STABILITY_INTERVAL=1500ms`

### HTML scraping
- `scrapeAllAssistantText` — 5 strategies, returns ALL assistant messages (not just last) for continuations
- `extractHtmlBlocks` — 4 patterns: ```html fenced, generic fenced, bare DOCTYPE, partial `<html` fallback
- `isHtmlComplete` — checks DOCTYPE/html + `<body` + `</html>`
- Picks largest complete block; falls back to page.content() as last resort

### Continuations
- `MAX_CONTINUATIONS=4` — sends "أكمل الكود من حيث توقفت"
- `responseSeemsPartial` checks open fences + Arabic partial signals

### AI Doctor (3-model fallback chain)
- `google/gemini-2.5-flash-lite` → `google/gemini-2.5-flash` → `openai/gpt-4o-mini`
- `max_tokens: 32_768`, `temperature: 0.05`
- Skips if `OPENROUTER_API_KEY` missing or HTML > 400KB
- Returns raw HTML if all 3 models fail (never throws to caller)

## Frontend Notes (subject.tsx)

- `AbortController` + `setTimeout(160_000)` — NOT `AbortSignal.timeout()` (browser compat)
- iframe sandbox: `"allow-scripts"` ONLY — `allow-same-origin` removed (security: AI HTML cannot steal session)
- 429 → shows `visualExplainBusy` message (not generic error)
- Abort → shows "انتهت مهلة الانتظار" message

## Auth pattern

No shared `requireAuth` middleware — use `getUserId(req)` from `(req.session as any)?.userId`

## Session persistence

Cookies saved to `/tmp/manus-session.json` — survives restarts but lost on container recycle (triggers re-login on next request)

## Timeouts

- `RESPONSE_TIMEOUT_MS = 120_000` — manus.im response wait
- `REQUEST_TIMEOUT_MS = 160_000` — hard HTTP ceiling
- Doctor per-model: `50_000ms`
- Frontend abort: `160_000ms`
