# Nukhba Platform — Claude Code Rules

## Cost Control (MANDATORY — follow always)
- grep/glob FIRST to find exact lines, THEN read only that range
- Never read a file wider than needed; use offset+limit on large files
- Batch ALL independent reads and edits in one response
- No commentary between steps — work silently, explain once at the end
- Skip type-checking, running tests, or exploring unrelated files unless asked
- Never re-read a file already in context

## Project Structure (memorize — do not re-explore)

```
artifacts/
  api-server/src/
    routes/          ← Express route handlers
      v4_teach.ts    ← v4 AI teaching SSE stream (main teach route)
      v4_path.ts     ← v4 student path / diagnostic / placement
      ai.ts          ← LEGACY teaching route (subject.tsx)
    lib/
      v4-teaching-core.ts   ← builds Gemini system prompt (all layers)
      v4-gem-wallet.ts      ← student gem wallet (charge/refund/purchase)
      v4-path-engine.ts     ← lesson unlocking / placement logic
      v4-memory.ts          ← student memory capture
      image-generation.ts   ← FLUX.1 via fal.ai → Pollinations → SVG
      teacher-image-store.ts← disk cache + provider chain for images
      gem-ledger.ts         ← GemLedgerSource type + ledger writes
      auto-migrate.ts       ← DB schema auto-migration (REQUIRED_TABLES)
      gemini-stream.ts      ← streamGeminiTeaching() via OpenRouter
    index.ts         ← Express app entry + route mounting

  nukhba/src/
    pages/
      v4-lesson.tsx  ← v4 teacher chat UI (main student-facing page)
      v4-map.tsx     ← learning path map
      path-choice.tsx← entry: choose custom vs booklet path
      path-custom.tsx← diagnostic → placement → result flow
      subject.tsx    ← LEGACY lesson page (still in use)
      admin.tsx      ← admin panel (subscriptions, ledger, settings)
    index.css        ← global styles (dark luxury theme)
    App.tsx          ← routes

lib/
  db/src/            ← Drizzle schema (source of truth for DB types)
```

## Key Constants
- Teaching model: `google/gemini-2.0-flash-001` via OpenRouter
- Theme: background `hsl(222,28%,7%)`, gold `#F59E0B`, emerald `#10B981`
- Fonts: Tajawal, Cairo (Arabic RTL)
- Gem rate: 1¢ = 10 gems  |  FLUX image = $0.003 = 30 gems
- All v4 mutating routes need header `X-Nukhba-Csrf: 1`

## Dev Commands
```bash
# Start everything
PORT=5000 pnpm --filter @workspace/nukhba run dev &
PORT=8080 pnpm --filter @workspace/api-server run dev

# Build backend only
pnpm --filter @workspace/api-server run build

# Type-check a specific package
pnpm --filter @workspace/api-server exec tsc --noEmit
pnpm --filter @workspace/nukhba exec tsc --noEmit
```

## Architecture Rules (never violate)
1. v4 wallet charges: always use `chargeV4Ai()` with a unique `requestId`
   — idempotent on requestId, safe to retry
2. Image billing: source `v4_ai_image`, charged immediately on fal.ai
   confirmation, NOT folded into the teaching turn charge
3. Auto-migrate: add new columns to `REQUIRED_COLUMNS` array in
   auto-migrate.ts — never run drizzle-kit push or raw ALTER TABLE
4. SSE stream: always emit `data: JSON\n\n` format; end with `done:true` event
5. CSRF: all POST/DELETE admin and v4 mutating routes need
   `requireSameOriginCsrf` middleware
6. AI teach model is LOCKED to Gemini 2.0 Flash — never change it

## Ignore (never open these)
- node_modules/, dist/, *.map, pnpm-lock.yaml
- artifacts/api-server/data/ (runtime image cache)
- lib/*/dist/ (compiled output, not source)
- .local/, .agents/ (Replit agent internals)
