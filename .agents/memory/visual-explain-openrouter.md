---
name: Visual Explain — Manus API Architecture
description: Visual Explain feature uses Manus API (open.manus.ai) to run an AI agent that generates interactive HTML. Previously used OpenRouter/Gemini 2.5 Flash.
---

## Rule
POST /v4/visual-explain now calls the Manus API (api.manus.ai) — an async agentic platform.
Auth: `x-manus-api-key` header with `MANUS_API_KEY` secret.

**Why switched from OpenRouter:** User explicitly requested Manus API (it's very important to them).

## Flow (async polling)
1. POST `/v2/task.create` — send SYSTEM_PROMPT + user message as one combined text block, with `structured_output_schema: { html: string }`
2. Poll `GET /v2/task.listMessages?task_id=...&order=asc` every 4 seconds
3. Watch `status_update` events for `agent_status`: running → keep polling, stopped → extract result, error → throw
4. Extract HTML: prefer `structured_output_result` event's `value.html`, fallback to parsing `assistant_message` text with `extractHtml()`

## Key implementation details
- File: `artifacts/api-server/src/routes/v4_visual_explain.ts`
- API base: `https://api.manus.ai`
- Secret: `MANUS_API_KEY` (header: `x-manus-api-key`)
- Frontend sends: `{ message: string }` — unchanged
- Response: `{ html: string }` — unchanged
- In-memory cache: SHA-256(message) → html, max 100 entries (still in place)
- Poll interval: 4s, Poll timeout: 3 min, Request timeout: 3.5 min
- Manus tasks typically complete in 1–3 minutes for HTML-generation tasks

## System prompt
The SYSTEM_PROMPT (postman/for-loop reference example, dark theme specs, step-by-step pattern) is **unchanged** from the OpenRouter version — it's still in the file as `SYSTEM_PROMPT` const and prepended to the task message.

## Manus API notes
- Docs: https://open.manus.ai/docs/v2/introduction
- Structured output schema must have `additionalProperties: false` and `required` listing all props
- `structured_output_result` event appears after `agent_status=stopped`
- Tasks run async; typical latency for code generation: 1–3 min
