---
name: Visual Explain — OpenRouter Architecture
description: Visual Explain feature replaced Playwright/manus.im with direct OpenRouter Gemini 2.5 Flash call; design spec embedded in system prompt.
---

## Rule
POST /v4/visual-explain now calls google/gemini-2.5-flash via OpenRouter directly.
No Playwright, no Chromium, no manus.im automation.

**Why:** manus.im renders output as live preview (not code blocks), scraping was impossible. Playwright approach was 30–160s, fragile, and manus.im renders HTML as artifact not text.

## Key implementation details
- File: `artifacts/api-server/src/routes/v4_visual_explain.ts` (completely rewritten)
- Model: `google/gemini-2.5-flash` via `https://openrouter.ai/api/v1/chat/completions`
- Frontend sends: `{ message: string }` (NOT `teacherMessage`)
- Response: `{ html: string }`
- In-memory cache: SHA-256(message) → html, max 100 entries
- Timeout: 90s per request
- Max tokens: 12,000

## System prompt design spec
The system prompt contains:
1. The EXACT dark theme color palette from the 4 reference examples (#0f172a, #1e293b, #334155, #38bdf8, etc.)
2. Cairo + Fira Code fonts via Google Fonts CDN
3. Font Awesome 6.4.0 via CDN + Tailwind CDN
4. Mandatory step-by-step navigation pattern (steps[] array + nextStep/resetAll)
5. Web Audio API oscillator sound recipe (click/success/fail/activate)
6. CSS classes for viz-box/item-node/connector/code-chunk
7. RTL layout rules + bdi for LTR code
8. Full reference example (logic gates) embedded in the prompt

## Cost
~$0.013 per request with Gemini 2.5 Flash (input ~7K tokens + output ~5K tokens)
