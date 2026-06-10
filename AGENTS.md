# AGENTS.md — Nukhba (نُخبة)

## Commands

```bash
pnpm install                   # install (never npm/yarn — enforced by preinstall)
pnpm run dev                   # docker compose up --build (local dev)
pnpm run build                 # pnpm run typecheck && pnpm -r --if-present run build
pnpm run typecheck:libs        # tsc --build (lib packages via project references)
pnpm run typecheck             # typecheck:libs + workspace artifacts
pnpm run deploy                # bash docker/deploy.sh (initial HTTP deploy)
pnpm run deploy:ssl            # bash docker/deploy.sh --ssl (HTTPS)
pnpm run deploy:update         # bash docker/deploy.sh --update (after git pull)
pnpm run logs                  # docker compose logs -f
pnpm run health                # docker compose ps && curl -s http://localhost/api/healthz

pnpm --filter @workspace/api-server run dev    # build + start api server
pnpm --filter @workspace/api-server run build  # esbuild bundle → dist/index.mjs
pnpm --filter @workspace/nukhba run dev        # vite dev server for frontend
pnpm --filter @workspace/db run push           # drizzle-kit push (schema → DB)
pnpm --filter @workspace/api-spec run codegen  # orval: OpenAPI → zod + react-query hooks
```

## Tests

No test framework — uses Node built-in `node:test` + `node:assert/strict`:
```
tsx src/lib/__tests__/plan-quality.test.ts
tsx src/lib/__tests__/access-first-lesson.test.ts
tsx src/lib/__tests__/teacher-image-store.test.ts
tsx src/routes/__tests__/teacher-images.route.test.ts
tsx src/lib/pricing-formula.test.ts
```
Also: `pnpm --filter @workspace/api-server run test` runs all 5 sequentially.

## Architecture

- **Monorepo** (pnpm workspaces): `artifacts/*` = apps, `lib/*` = shared, `scripts/`
- **API server** (`artifacts/api-server`): Express 5, bundled by esbuild into single ESM `dist/index.mjs`. Entry: `src/index.ts`
- **Frontend** (`artifacts/nukhba`): React 19 SPA via Vite, Tailwind CSS v4 (CSS-based, no tailwind.config.js), shadcn/ui (new-york style, RTL Arabic). Entry: `src/main.tsx`
- **DB** (`lib/db`): Drizzle ORM + PostgreSQL. Schema in `src/schema/index.ts`. Auto-migration on startup (ADD COLUMN IF NOT EXISTS — no manual step for new columns).
- **Shared types**: `lib/api-zod` (zod schemas) and `lib/api-client-react` (react-query hooks) — **both generated** by Orval from `lib/api-spec/openapi.yaml`. After editing the spec, run: `pnpm --filter @workspace/api-spec run codegen`
- **AI integrations**: `lib/integrations-openai-ai-server` (server), `lib/integrations-openai-ai-react` (client), `lib/integrations-anthropic-ai` (server)
- **Auth**: HMAC-SHA256 signed cookies, scrypt password hashing, Google OAuth. Session auto-written on `res.json()` / `res.redirect()`.
- **Production**: Docker Compose (api + nginx + postgres + certbot), managed via PM2 on VPS (`ecosystem.config.js`). See `docker/deploy.sh` for the deploy lifecycle.

## Key conventions

- **pnpm catalog** in `pnpm-workspace.yaml` pins shared dependency versions (`drizzle-orm`, `zod`, `react`, `vite`, `tailwindcss`, etc.)
- **Replit dev**: uses the `.replit` workflow — runs api-server and frontend in parallel
- **Post-merge**: `scripts/post-merge.sh` runs `pnpm install --frozen-lockfile && pnpm --filter db push`
- **No linter** configured. Prettier listed in root but no config file.
- **Typecheck order matters**: `root tsc --build` (libs) first, then workspace typechecks. `pnpm run build` runs typecheck before builds.
- **Session cookie**: 30-day expiry, httpOnly, sameSite `none` in prod / `lax` in dev, secure in prod.
- **Nginx** proxies `/api/` to api:8080 with SSE-friendly buffering disabled, serves SPA with `try_files $uri /index.html`.
- **Startup**: api-server checks if port is already bound (graceful no-op duplicate exit), runs auto-migrations, starts hourly scheduled jobs (gem rollover sweep).
