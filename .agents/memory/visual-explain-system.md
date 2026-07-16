---
name: Visual Explain System
description: Playwright + manus.im + AI Doctor pipeline that generates interactive HTML pages from teacher messages, triggered by a "شرح بصري" button in the chat UI.
---

## Architecture

**Route**: `POST /api/v4/visual-explain` — `artifacts/api-server/src/routes/v4_visual_explain.ts`

**Pipeline (3 stages)**:
1. **Playwright → manus.im**: Headless Chromium (Nix `chromium` package) logs into manus.im using `MANUS_EMAIL`/`MANUS_PASSWORD` secrets, sends teacher message as prompt to `https://manus.im/app/22FeoQNbqHXYsOhRScAosc`, collects HTML response. Handles multi-part responses by sending "أكمل" up to 3 times.
2. **HTML Doctor**: `fixHtmlWithAI()` sends raw HTML to `google/gemini-2.5-flash-lite` via OpenRouter. Prompt instructs it to fix errors, complete truncated code, and return a self-contained page. Falls back to raw HTML if key missing or call fails.
3. **Frontend overlay**: `<iframe srcDoc={html} sandbox="allow-scripts allow-same-origin">` inside a full-screen dark modal.

## Key Implementation Details

- **Singleton browser**: one `BrowserContext` reused across requests; invalidated on error
- **Session persistence**: cookies saved to `/tmp/manus-session.json` to avoid re-login
- **Busy guard**: `_busy` flag — 429 if a request is already in flight
- **Timeouts**: 100s wait for manus response; 45s for AI Doctor; 150s overall hard timeout
- **Chromium path**: auto-detected via `which chromium` or env `CHROMIUM_PATH`; added via `[nix] packages` in `.replit`
- **Build**: `playwright-core` added to `external` list in `build.mjs`

## Frontend Changes (subject.tsx)

- `Eye` icon added to lucide imports
- `onVisualExplain?: () => void` prop added to `MessageToolbar`
- "شرح بصري" button (amber color) added to toolbar — appears under EVERY AI message
- `visualOverlay` state: `{ html, loading, error } | null`
- `handleVisualExplain(messageContent)` callback — POSTs, sets state
- Overlay modal: animated loading rings → iframe → error state; closes on X or backdrop click

## Translation Keys Added

`toolbarVisualExplain`, `toolbarVisualExplainTitle`, `visualExplainModalTitle`, `visualExplainLoading`, `visualExplainLoadingHint`, `visualExplainClose`, `visualExplainError`, `visualExplainRetry`, `visualExplainBusy`

**Why:** No shared `requireAuth` middleware exists — auth is done locally via `getUserId(req)` pattern (session.userId).
