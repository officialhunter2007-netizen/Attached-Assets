---
name: Visual Explain — OpenRouter/Gemini Architecture
description: Visual Explain feature uses OpenRouter/Gemini 2.5 Flash directly (fast, ~15s). Manus API was tried but abandoned due to 1-3 min latency inherent to its async agent architecture.
---

## Rule
POST /v4/visual-explain uses OpenRouter (`google/gemini-2.5-flash`) — a direct synchronous call, no polling.
Auth: `Authorization: Bearer ${OPENROUTER_API_KEY}`.

**Why NOT Manus:** Manus API is an async agentic platform with inherent 1-3 min latency even in "chat mode". For HTML generation, OpenRouter returns in ~15 seconds.

## Flow
1. POST `/v4/visual-explain/start` → jobId (returns immediately)
2. Background task calls `callOpenRouter(prompt)` — single fetch, 90s timeout
3. Frontend polls GET `/v4/visual-explain/status/:jobId` every few seconds
4. Job completes in ~15s → frontend renders HTML in iframe

## Key implementation details
- File: `artifacts/api-server/src/routes/v4_visual_explain.ts`
- API base: `https://openrouter.ai/api/v1`
- Model: `google/gemini-2.5-flash`
- Secret: `OPENROUTER_API_KEY`
- Timeout: 90s (generous for large HTML generation)
- In-memory cache: SHA-256(message) → html, max 100 entries
- Frontend sends: `{ message: string }` — unchanged
- Response: `{ html: string }` — unchanged

## System prompt
The SYSTEM_PROMPT (dark theme specs, step-by-step pattern, postman/for-loop reference example) is unchanged.
No agent-mode restrictions needed — OpenRouter is a plain LLM API with no agent capabilities.
