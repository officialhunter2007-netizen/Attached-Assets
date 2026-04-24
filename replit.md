# نُخبة — Nukhba Educational Platform

## Overview

AI-powered Yemeni educational platform with personalized learning paths, gamification, paywall, and an admin panel. RTL Arabic UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (bundle)
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **AI**: OpenAI gpt-5.2 via Replit AI integration (SSE streaming)
- **Auth**: Cookie-based sessions (HMAC-SHA256 signed tokens, scrypt-hashed passwords with lazy upgrade from legacy SHA-256)

## Production deploys

- **Build phase** runs only `pnpm build` for the api-server — no DB push, so deploys are fast and never hang on "Validating database migrations".
- **Schema sync** is handled at server startup by `artifacts/api-server/src/lib/auto-migrate.ts`: it queries `information_schema` for the live DB columns and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` any missing ones from a hardcoded list. Add new required columns to the `REQUIRED_COLUMNS` array there when extending the schema.
- For full schema sync (new tables, indexes, FKs) use `pnpm --filter @workspace/db push` in dev; for prod, run the same command from a deployment shell with the prod `DATABASE_URL`.

## Artifacts

- **nukhba** (`/`): React-Vite web app — full educational platform frontend
- **api-server**: Express API server on port 8080, proxied via `/api/`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- **AI Learning Sessions**: 3-phase (interview → plan → teaching) using SSE streaming
- **Curriculum**: High school (chemistry, biology, Arabic, English × 3 grades), University (11 specializations incl. Food Engineering), Skills (web, programming, OS, networking, security, ERP/YemenSoft)
- **Food Engineering Lab**: Interactive lab panel for food engineering students — thermal calculators (D/z/F-value), water activity, nutrition, pasteurization time, interactive charts (growth curve, death curve, Aw chart), HACCP flow builder. Integrated with AI teacher via share button.
- **YemenSoft Simulator**: Interactive ERP practice environment for `skill-yemensoft` students — 19 tabs across 3 levels (daily ops, reports/analysis, advanced management). All tabs mobile-optimized with responsive grids. Integrated with AI teacher via share button.
- **Accounting Lab (مختبر المحاسبة)**: Academic accounting lab for `uni-accounting` students — 12 interactive tools across 3 levels. **Level 1 (Fundamentals):** Accounting Equation visualizer (A=L+E with animated balance), T-Accounts workspace, Journal Entries with auto-posting, Accounting Cycle simulator (9-step). **Level 2 (Statements):** Income Statement, Balance Sheet, Cash Flow Statement (indirect method), Financial Ratio Analysis (liquidity/profitability/activity/leverage with health indicators). **Level 3 (Advanced):** Break-Even/CVP analysis with chart, Depreciation calculator (straight-line/declining/units comparison), Bank Reconciliation practice, Adjusting & Closing Entries with templates. Desktop sidebar + mobile horizontal tab bar. Each tool has share-with-teacher button. Separate from YemenSoft (academic vs ERP focus).
- **Code Editor (Nukhba IDE)**: Multi-file Monaco editor supporting HTML, CSS, JavaScript, TypeScript, Python, Java, C++, C, Dart, Kotlin, Bash, SQL. Features: file tabs, syntax highlighting, code execution via `/api/ai/run-code`. **VS Code-like File Tree Sidebar** — collapsible folder tree with nested file/folder support (`css/style.css`, `js/app.js`, `pages/about.html`). Folders show gold folder icons, files show language-specific icons. Inline create (file/folder) at any depth, hover actions for add file/subfolder/delete on each folder. Explorer toggle button in toolbar. `.gitkeep` placeholder files for empty folders (hidden from UI). File paths stored as `IDEFile.name` (e.g. `css/style.css`). localStorage key: `nukhba-ide-files-v3`. **Virtual Filesystem Resolution** — `<link href="css/style.css">` and `<script src="js/app.js">` in HTML are resolved from the virtual filesystem and inlined at build time. Relative paths (`../`), absolute paths (`/css/style.css`) supported. Unlinked CSS/JS files still auto-injected as before. **Live Web Preview** for HTML/CSS/JS subjects — renders student's code in sandboxed iframe, captures console.log/errors/warnings via postMessage (nonce-validated), multi-file merging (HTML+CSS+JS auto-combined), share preview with AI teacher. Mobile fallback uses textarea instead of Monaco. **Multi-Page Web Projects** — students can create multiple HTML files (index.html, about.html, contact.html, etc.) forming a real website. CSS/JS files are shared resources injected into all pages. **Nukhba Browser** — realistic fullscreen browser simulator: editable address bar (type URLs to navigate), working back/forward with history stack, Home button, page dropdown for quick switching between HTML pages. Link clicks (`<a href>`) intercepted and routed between pages. `history.pushState`/`replaceState` and form submissions also intercepted. 404 page with available pages list when navigating to non-existent pages. Viewport switcher (Desktop/Tablet 768px/Mobile 375px), real-time console panel, page count indicator, navigation position counter, share-with-teacher (includes current page + all pages info). URL format: `https://my-project.nukhba.dev/page.html`. `index.html` maps to `/`. CSS-only preview provides rich sample HTML (header, nav, cards, forms, tables, footer). JS-only preview shows inline terminal console. Safe circular-object serialization, bounded 200-entry log storage.
- **Cybersecurity Lab (مختبر الأمن السيبراني)**: Two modes — **Interactive Environment** (multi-machine virtual network simulation with 8 preset scenarios: linux-pentest, windows-pentest, web-security, network-analysis, password-cracking, privilege-escalation, forensics, network-defense; each spawns 2-4 VMs with unique IPs, realistic OS-specific filesystems, service simulations for SSH/HTTP/FTP/MySQL/SMB/RDP/SMTP/DNS, hidden flags, 40+ Linux commands including nmap/hydra/john/gobuster/nikto/sqlmap/ssh/curl/wget/iptables, Windows commands dir/type/systeminfo/ipconfig/net/tasklist; AI teacher can create custom environments) and **Quick Tools** (7 legacy tools: Terminal Sim, Port Scanner, Crypto Lab, Hash Cracker, SQL Injection, XSS Lab, Packet Analyzer). Environment files: `env/cyber-env-types.ts`, `env/cyber-env-engine.ts`, `env/cyber-env-commands.ts`, `env/cyber-lab-environment.tsx`, `env/cyber-lab-setup.tsx`. `onAskHelp` prop wired to send context back to AI teacher. Located at `artifacts/nukhba/src/components/cyber-lab/`.
- **Gamification**: 5 levels (مبتدئ→أسطورة), points (+15 lesson, +25 challenge), badges, streaks
- **Paywall**: 1 free lesson PER SUBJECT → subscription (per-subject) or referral sessions
- **Subscriptions**: Bronze(30 msg)/Silver(60 msg)/Gold(100 msg) per subject, 14-day validity via Karimi wallet (regional pricing North/South Yemen)
- **Admin Panel**: Approve/reject subscription requests, grant/revoke per-subject subscriptions, view activation cards, stats

## DB Schema

Tables: users, cached_lessons, lesson_views, user_progress, learning_paths, subscription_requests, activation_cards, referrals, conversations, messages, **user_subject_subscriptions** (per-subject sub tracking), **user_subject_first_lessons** (per-subject paywall)

## API Routes

- `GET/POST /api/auth/*` — auth (login, register, logout, me, update)
- `GET/POST /api/lessons/*` — lessons (cache, views, challenge)
- `GET/POST /api/progress` — user progress
- `POST /api/subscriptions/*` — subscription requests & activation
- `GET /api/subscriptions/my-subjects` — per-subject subscriptions for current user
- `GET /api/subscriptions/subject-access/:subjectId` — check access for a specific subject
- `GET/POST /api/admin/*` — admin panel (subscription requests, activation cards, stats)
- `GET /api/admin/subject-subscriptions/:userId` — get user's subject subs
- `POST /api/admin/grant-subject-subscription` — grant subject subscription
- `DELETE /api/admin/revoke-subject-subscription/:subId` — revoke subject subscription
- `GET/POST /api/referrals/*` — referral system
- `POST /api/ai/*` — AI endpoints (lesson, interview, build-plan, teach) — SSE streaming

## Design System

- Dark luxury theme: background hsl(222,28%,7%), cards hsl(222,24%,10%)
- Gold: #F59E0B, Emerald: #10B981
- Fonts: Tajawal + Cairo (Arabic RTL throughout)
- Glassmorphism cards, glow effects
