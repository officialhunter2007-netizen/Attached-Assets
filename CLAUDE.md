# Nukhba (نُخبة) — Claude Code Development Guide

AI-powered Yemeni educational platform. RTL Arabic UI, dark luxury theme.
Runs on the user's OWN VPS via pm2 (NOT Replit). Communicate with the user in
everyday Yemeni Arabic.

---

## 0. COST CONTROL (read every session, obey always)
- grep/glob FIRST to find exact lines → THEN read only that range (offset+limit)
- Never read a whole large file; never re-read a file already in context
- Batch ALL independent reads/edits into ONE response
- Work silently between steps; give ONE concise summary at the end
- Don't run tests/type-checks/builds unless asked or about to finish a real change
- Files blocked from reading: see `.claude/settings.json` (node_modules, dist,
  maps, lockfiles, .git, data/ cache, Replit internals). Don't try to open them.

---

## 1. STACK
- Node 24 · pnpm workspace monorepo · TypeScript 5.9 (strict)
- Backend: Express 5, Drizzle ORM, PostgreSQL, Zod
- Frontend: React + Vite + Tailwind + Framer Motion (wouter for routing)
- AI via OpenRouter:
  - Teaching = `google/gemini-2.0-flash-001` (LOCKED — never change)
  - Lesson/interview/plan = GPT-4o · Summaries = Claude Sonnet · grading = Claude Haiku
- Images: FLUX.1 [schnell] via fal.ai → Pollinations → SVG fallback
- Auth: cookie sessions (HMAC-SHA256 signed, scrypt passwords)

---

## 2. PROJECT MAP (verified — do not re-explore)

```
artifacts/
  api-server/src/                  ← Express backend (port 8080)
    index.ts                       ← app entry + route mounting
    routes/
      index.ts                     ← router; mounted via app.use("/api", r)
                                      ⚠ define paths WITHOUT /api prefix
      ai.ts                        ← LEGACY teaching (subject.tsx, /lesson)
      v4_teach.ts                  ← v4 AI teaching SSE stream (MAIN)
      v4_path.ts                   ← path / diagnostic / placement
      v4_booklet.ts                ← university booklet (ملازم) flow
      v4_lab_exam.ts               ← labs + exams
      v4_admin_instructions.ts     ← admin: publish/validate instruction files
      auth.ts subscriptions.ts admin_insights.ts ai_usage.ts
      lessons.ts plans.ts materials.ts progress.ts summaries.ts
      teacher-images.ts voice.ts support.ts health.ts lab_reports.ts
    lib/
      v4-teaching-core.ts          ← builds Gemini system prompt (all layers L1..L8)
      v4-protocol-tags.ts          ← [[SCENE]] [[IMAGE]] [[VIZ]] [[ANIM]] parsing
      v4-gem-wallet.ts             ← charge/refund/purchase (chargeV4Ai, refundV4Ai)
      v4-path-engine.ts            ← lesson unlocking / placement / starting level
      v4-diagnostic-engine.ts      ← 5 fixed Arabic diagnostic questions
      v4-lab-exam-engine.ts v4-exam-evaluator.ts  ← lab/exam run + Haiku grading
      v4-booklet.ts                ← booklet ingest/session
      v4-memory.ts                 ← student memory capture/recall
      v4-scene-store.ts            ← [[SCENE]] disk cache (data/v4-scenes)
      v4-progress-events.ts        ← SSE progress event helpers
      v4-instruction-normalizer.ts ← atomic publish (validate→tx→swap pointer)
      v4-instruction-validator.ts  ← cross-ref validation of instruction files
      image-generation.ts          ← FLUX pipeline ($0.003/image = 30 gems)
      teacher-image-store.ts       ← image disk cache + provider chain
      gemini-stream.ts             ← streamGeminiTeaching() over OpenRouter
      gem-ledger.ts                ← GemLedgerSource union + append-only writes
      gems.ts                      ← LEGACY gem logic (daily cap)
      auto-migrate.ts              ← schema migration (REQUIRED_TABLES/COLUMNS)

  nukhba/src/                      ← student frontend (port 5000)
    App.tsx                        ← routes (wouter)
    index.css                      ← global styles (dark luxury theme)
    pages/
      v4-lesson.tsx                ← v4 teacher chat UI (MAIN student page)
      v4-map.tsx                   ← learning path map
      v4-lab.tsx v4-exam.tsx       ← lab + exam UIs
      path-choice.tsx              ← choose custom vs booklet path
      path-custom.tsx              ← diagnostic → placement → result
      path-booklet.tsx booklet-session.tsx  ← booklet flow
      admin.tsx                    ← admin panel (subs, ledger, settings)
      subject.tsx lesson.tsx learn.tsx  ← LEGACY student flow (still live)
      dashboard.tsx usage.tsx subscription.tsx welcome.tsx home.tsx
      login.tsx register.tsx support.tsx not-found.tsx

  nukhba-promo/                    ← marketing site (separate, editable)
  mockup-sandbox/                  ← component preview (separate, editable)

lib/                               ← shared workspace packages (@workspace/*)
  db/src/                          ← Drizzle SCHEMA = source of truth for DB types
  api-spec/  api-zod/              ← shared API contracts
  api-client-react/                ← typed FE API client
  integrations-*/                  ← OpenAI / Anthropic integration wrappers
```

---

## 3. KEY CONSTANTS
- Background `hsl(222,28%,7%)` · cards `hsl(222,24%,10%)`
- Gold `#F59E0B` · Emerald `#10B981` · Fonts: Tajawal, Cairo
- Gem rate: **1¢ = 10 gems** · FLUX image = $0.003 = **30 gems**
- v4 wallet: monthly, 30-day expiry + 3-day grace, no daily cap, +100 welcome gift
- All v4/admin mutating routes require header `X-Nukhba-Csrf: 1` + same-origin

---

## 4. DEV COMMANDS
```bash
# Run both (dev)
PORT=5000 pnpm --filter @workspace/nukhba run dev &
PORT=8080 pnpm --filter @workspace/api-server run dev

# Type-check (do this before declaring a change done)
pnpm --filter @workspace/api-server exec tsc --noEmit
pnpm --filter @workspace/nukhba exec tsc --noEmit

# Build a shared lib if you see TS6305 (stale project reference)
pnpm --filter @workspace/db run build

# pm2 (production on the VPS)
pm2 restart all          # after backend changes
pm2 logs --lines 100     # debug
```

---

## 5. CRITICAL RULES (these caused real bugs — never violate)

### Database / migrations
- **Never** run `drizzle-kit push` (interactive, hangs) or raw `ALTER TABLE`.
  Add new tables to `REQUIRED_TABLES` and new columns to `REQUIRED_COLUMNS` in
  `auto-migrate.ts` — they apply idempotently on boot.
- Partial-unique indexes that reference a NEW column must be created AFTER
  `ensureRequiredColumns()` runs — not inside `REQUIRED_TABLES.indexes`.
- pgvector may be unavailable on managed PG: probe at startup, keep JSONB fallback.

### Billing (gems) — money-critical
- Charge AI via `chargeV4Ai()` with a UNIQUE `requestId`; idempotent on requestId.
- `chargeV4Ai` returning `charged:false` with NO explicit flag is AMBIGUOUS —
  it can mean ledger-dedupe OR a transient DB error. Inspect the ledger to
  disambiguate before granting free work.
- One-shot/file-prep requestIds must be scoped by `user + subject + full content
  hash` (not a hash prefix) to avoid cross-subject billing suppression.
- To gate paid work behind a one-use token: consume the token AND record the
  paid work in ONE transaction. Pre-commit claim + compensating release is not
  crash-safe.
- Image billing: source `v4_ai_image`, requestId `v4img_<id>`, charged on fal.ai
  confirmation — NOT folded into the teaching-turn charge. Abort-safe.

### Routing / API
- Routes are mounted with `app.use("/api", router)` → define paths WITHOUT the
  `/api` prefix or they 404.
- SSE: emit `data: <json>\n\n`; finish with a `done:true` event. Always wrap
  student-facing AI routes in try/catch + `emitFriendlyAiFailure` (Arabic apology,
  never a bare 500).

### Security
- App-wide CORS is `origin:true, credentials:true` and prod cookies are
  `SameSite=none` → every mutating admin/v4 route needs `requireSameOriginCsrf`
  (custom `X-Nukhba-Csrf: 1` header + Origin/Referer check). Don't add a mutating
  route without it.

### AI content
- Teaching model is LOCKED to Gemini 2.0 Flash. The teacher may only reference
  UI features that actually exist and supported protocol tags — no external apps.

---

## 6. HOW-TO (common tasks)

**Add a v4 backend route:** create `routes/v4_x.ts` → register in `routes/index.ts`
(no `/api` prefix) → add `requireUser` + `requireSameOriginCsrf` to mutations.

**Add a DB column:** add to `REQUIRED_COLUMNS` in `auto-migrate.ts` AND to the
Drizzle schema in `lib/db/src/`. Restart backend; migration runs on boot.

**Add a new ledger reason/source:** extend the `GemLedgerSource` union in
`gem-ledger.ts`, then add an Arabic label in the admin ledger tab + usage page.

**Add a teacher protocol tag:** parse it in `v4-protocol-tags.ts`, document it in
the prompt layer in `v4-teaching-core.ts`, render it in `v4-lesson.tsx`.

**Touch the prompt:** edit the relevant layer in `v4-teaching-core.ts`
(L1 persona/tone · L2 lesson/objectives/glossary · L8 difficulty weighting).

---

## 7. CONVENTIONS
- RTL: keep `dir="rtl"`; use logical CSS (`margin-inline`, `inset-inline`) not
  left/right; mirror icons that imply direction.
- Arabic UI strings live inline in components — match existing tone (Yemeni,
  practical, warm). No machine-like phrasing.
- Keep v4 code parallel to legacy — don't modify `/subject` or `/lesson` flows
  unless the task is explicitly about legacy.
- Prefer editing existing files; don't create new files/abstractions unasked.
- No comments unless the logic is genuinely non-obvious.
- After a real change: type-check the affected package, then `pm2 restart` +
  check `pm2 logs` for boot errors before declaring done.
