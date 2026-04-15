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
- **Auth**: Cookie-based sessions (base64 JSON, SHA-256 hashed passwords)

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
- **Code Editor (Nukhba IDE)**: Multi-file Monaco editor supporting HTML, CSS, JavaScript, TypeScript, Python, Java, C++, C, Dart, Kotlin, Bash, SQL. Features: file tabs, syntax highlighting, code execution via `/api/ai/run-code`. **Live Web Preview** for HTML/CSS/JS subjects — renders student's code in sandboxed iframe, captures console.log/errors/warnings via postMessage (nonce-validated), multi-file merging (HTML+CSS+JS auto-combined), share preview with AI teacher. Mobile fallback uses textarea instead of Monaco.
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
