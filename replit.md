# نُخبة — Nukhba Educational Platform

## Overview
Nukhba is an AI-powered Yemeni educational platform offering personalized learning paths, gamification, and a gems-based monetization system. It features an RTL Arabic UI and aims to provide an engaging and effective learning experience across various subjects, including high school curriculum, university specializations (like Food Engineering and Accounting), and professional skills (web development, programming, cybersecurity, ERP). The platform's vision is to leverage AI to deliver tailored education, practical application environments, and continuous feedback to Yemeni students, with a strong emphasis on practical, hands-on learning through interactive labs and simulations.

## User Preferences
- **Communication Style**: Direct and practical, using everyday Yemeni Arabic with analogies relevant to daily life. Avoid overly academic or machine-like phrasing.
- **Learning Methodology**: Emphasis on Socratic teaching, predict-then-reveal, and hands-on application through interactive environments. Encourage critical thinking and self-correction over direct answers.
- **Interaction Style**: Proactive engagement, offering interactive labs, mini-projects, and visual aids. Seek to understand the user's thought process rather than just confirming correct answers.
- **Feedback**: Provide specific feedback on mistakes and reincorporate them into future explanations until resolved.
- **User Interface**: Clear, intuitive, and aesthetically pleasing with a dark luxury theme, gold and emerald accents, and RTL Arabic text.

## System Architecture

### UI/UX Decisions
- **Theme**: Dark luxury theme using `hsl(222,28%,7%)` for background and `hsl(222,24%,10%)` for cards. Accent colors are Gold (`#F59E0B`) and Emerald (`#10B981`).
- **Typography**: Uses Tajawal and Cairo fonts for Arabic RTL display.
- **Components**: Features glassmorphism cards and subtle glow effects for a modern feel.
- **Teacher Session UI**: Enhanced with rich rendering (highlight.js for code, KaTeX for math), per-message toolbars (copy, regenerate, TTS, feedback), and a pro input box (image attach, mic, char counter, draft autosave).
- **Learning Path**: Implemented as a side `Drawer` with pure-SVG circular progress, stage statuses, and jump/review options.
- **Dynamic Environments**: Subject-themed environments (e.g., cyber=green, accounting=gold) with motivational components, achievement tracking, free playgounds (JS, regex, CSS, math), and data inspectors.
- **Code Editor (Nukhba IDE)**: Monaco editor with multi-file support, VS Code-like file tree, virtual filesystem resolution, live web preview for HTML/CSS/JS, multi-page web projects, and a Nukhba Browser for realistic web simulation.

### Technical Implementations
- **Monetization (Gems System)**: Per-subject subscriptions with Bronze/Silver/Gold plans. Gems are deducted per AI turn, with a daily cap and no daily carry-over. Free first sessions provide an initial gem allowance. All gem movements are recorded in an append-only `gem_ledger` table.
- **AI Learning Sessions**: Follow a 3-phase process (interview → plan → teaching) using Server-Sent Events (SSE) for streaming.
- **AI Content Policy**: Guardrails ensure the AI teacher refers only to existing UI elements and features, uses supported tags, and avoids external app suggestions for unsupported languages.
- **Conversation Context Compression**: `/ai/teach` limits history to 12 messages, with older messages truncated to ~400 characters (head + tail) to reduce token costs while preserving context.
- **Personalized Learning Path**: Rich diagnostic plans with 6-field stages (objectives, micro-steps, deliverable, mastery, reason, prerequisite). The AI teacher is bound to this contract, and mastery drift is guarded against.
- **Teacher Images**: Server-side caching for `[[IMAGE: ...]]` infographics. Images are generated, validated, persisted locally, and served same-origin to ensure reliability and performance.

### Feature Specifications
- **Gamification**: 5 levels, points for lessons/challenges, badges, and streaks.
- **Paywall**: One free lesson per subject, followed by per-subject subscriptions.
- **Admin Panel**: Tools for managing subscription requests, activation cards, and platform statistics. New admin tabs for `gem-ledger` and `payment-settings`.
- **AI Cost Protection**: Server-side enforcement of free lesson limits, cost caps (AI cost never exceeds 50% of subscription payment), and strict model locking to Gemini 2.5 Flash Lite for all student-facing teaching (Gemini 2.0 Flash was retired from OpenRouter; Lite is priced identically — $0.10 in / $0.40 out per 1M tokens — and stronger on Arabic).
- **AI Route Reliability**: All student-facing AI routes include robust `try/catch` blocks and a `emitFriendlyAiFailure` helper to gracefully handle errors with Arabic apology messages instead of bare 500s.

### v4.0 Instruction Files (Task #1 — Foundation)
- **Per-specialty JSON contract**: A single document defines every specialty's full curriculum (5 levels × 7 stages × 9 units × 10 lessons, plus labs with 5 typed questions each, exam banks per scope, and a placement test).
- **Shared Zod schema** (`@workspace/db` → `v4InstructionFileSchema`) — same shape errors surface in both the admin editor (Monaco) and the publish API.
- **Cross-reference validator** (`v4-instruction-validator.ts`) — verifies numbering, prerequisite/enables refs against existing codes, DFS cycle detection, lab kinds (diagnostic/decision/application/analysis/connection — each exactly once), exam-bank refs, and warns on bridge sentences <10 words and counts that don't match spec.
- **Atomic publish** (`v4-instruction-normalizer.ts`) — validates → opens a single transaction → upserts specialty → inserts version + all child rows (levels/stages/units/lessons/concepts/mistakes/labs/lab_questions/exam_questions/placement) → atomically swaps `v4_specialties.active_instruction_version_id`. Prior versions are kept untouched as append-only history; rollback = switch the active pointer.
- **Hard-delete escape hatch** clears the active pointer first, then cascades through child tables.
- **Admin routes** (`/api/admin/v4/*`) — list, fetch versions, validate-without-publish, publish, activate-version, hard-delete, normalized-tree readback. All gated on `users.role = 'admin'`.
- **CSRF defense (v4 mutating endpoints only)**: POST/DELETE require both an `X-Nukhba-Csrf: 1` custom header (browsers can't add this cross-origin without a CORS preflight) and a same-origin `Origin`/`Referer`. Local mitigation because app-wide CORS is `origin: true, credentials: true` and prod cookies are `SameSite=none` — fixing those globally would touch every admin tab and the FE, so it's left for a dedicated security pass.
- **Admin UI tab** — Monaco JSON editor + version-history rail + inline error/warning list + downloadable empty template.
- **Architectural decision**: v4 tables live in parallel to legacy `subjects`/`user_subject_plans` until task #10 cuts the FE over.

### v4.0 Custom Learning Path (Task #3 — Diagnostic + Adaptive Placement)
- **Two new tables**: `v4_student_paths` (one row per `(user, specialty)` — `startMode` ∈ `from_zero|placement`, `startingLevelIndex`, `unlockedLessonCodes` jsonb, `currentLessonCode`) and `v4_diagnostic_sessions` (5 fixed Arabic interview questions, transcript jsonb). Auto-migrate creates both on fresh DBs.
- **Path engine** (`lib/v4-path-engine.ts`):
  - `resolveActiveSpecialty(slug)` — returns the specialty + its active instruction version + a `level → lesson codes` map computed from `v4_lessons.code` (canonical `L.S.U.Lesson` first-segment parse).
  - `computeUnlockedLessons(mode, startingLevel)` — `from_zero` opens **only** the lowest-sorted lesson code; `placement` opens **all** lessons in levels `1..startingLevel`.
  - `createOrReplaceStudentPath(userId, slug, …)` — atomically upserts the path row AND calls `getOrCreateV4Wallet` so the +100 welcome gift fires the first time a student touches the specialty (idempotent via `welcome_gift_claimed` from task #2).
  - Adaptive placement: `pickNextPlacementQuestion` walks levels bottom-up; `gradePlacementAnswer` grades MCQ by index comparison (free) and short-answer via Claude Haiku 3.5 over OpenRouter. Termination: **2 consecutive fails**, level exhaustion, or hitting the max level. `computeStartingLevel` = highest level with a correct answer (default 1).
- **Routes** (`/api/v4/*`, mounted in `routes/index.ts`):
  - `GET /v4/specialties/available` — public list of specialties with a published instruction file.
  - `GET /v4/path/:slug` — `{available, specialty?, existingPath?}` readback used by the FE gate and the path screens.
  - `POST /v4/path/:slug/diagnostic/{start|answer|finish}` — 5 fixed Arabic questions, sequential, no AI call.
  - `POST /v4/path/:slug/placement/{next|finalize}` — adaptive next-question loop + final commit (`startMode=from_zero|placement`).
  - `POST /v4/path/:slug/booklet` — placeholder reserved for task #8 (ملازم الجامعة).
  - All mutating endpoints require `requireUser` + `requireSameOriginCsrf` (same `X-Nukhba-Csrf: 1` + Origin/Referer check used by `v4_admin_instructions`).
- **FE entry flow**:
  - `App.tsx` adds `/path/:slug` (choice screen) and `/path/:slug/custom` (state machine: `diagnostic → start-choice → placement → result`).
  - `SubjectGate` wraps `/subject/:subjectId`: if the specialty is v4-enabled AND the student has no existing path, it redirects to `/path/:slug`; otherwise it falls through to the legacy Subject page. Any API error falls through gracefully (no redirect loop, no blocking).
  - `path-choice.tsx` offers the custom path + a disabled "مسار ملازم جامعية" placeholder (task #8).
  - `path-custom.tsx` renders the full flow with progress bar, chat-style diagnostic, MCQ/short-answer placement, and a result screen that confirms starting level + welcome gift.
- **Parallel to legacy**: nothing in the legacy `/subject/*` or `/lesson/*` flow changed. Specialties without a published v4 instruction file see no behavior change.

### v4.1 Deeper Instruction Template (Task #13 — Pedagogical Expansion)
- **Backward-compatible schema bump** — `schema_version` accepts either `"v4.0"` or `"v4.1"`. Every v4.1 field (target_persona, teacher_tone, motivation_hook, learning_objectives w/ Bloom, glossary, allowed_viz_templates, allowed_tools, lab pedagogical_sequence/prerequisite_lessons/allowed_tools, lab/exam rubric+solution_outline+points, exam_q time_limit_seconds, concept weight, common_mistake severity, level/stage bloom_focus, lesson solution_outline) is **optional**, so all existing v4.0 files keep validating and publishing without modification.
- **Storage strategy** — hot fields (concept.weight, mistake.severity, lab/exam q rubric + solution_outline + points, exam_q time_limit_seconds, lesson.solution_outline) get real typed columns; everything else lives in a per-table `meta` JSONB blob. Auto-migrate `REQUIRED_COLUMNS` adds the new columns idempotently — no Drizzle push, no manual SQL.
- **Validator extensions** — pass_threshold_percent bounds (40-95), duplicate-concept-name detection, concept-weight sum-must-be-positive, lab `prerequisite_lessons` FK check against existing lesson codes, and (v4.1-only) warnings when open-ended lab questions ship without rubric+solution_outline.
- **Teacher prompt wiring** — L1 persona pulls `target_persona` + `teacher_tone`; L2 lesson layer renders `motivation_hook`, `learning_objectives` (with Bloom tags), `glossary` (specialty + lesson merged), concept `weight` markers (⚖), mistake `severity` flags, and includes the lesson's `solution_outline` as an internal-only grader anchor; VIZ catalog can be hard-overridden by `specialty.allowed_viz_templates`; L8 difficulty now uses a weighted average over concept.weight (defaults to plain average when every weight=1, so v4.0 behavior is preserved exactly).
- **Grader strengthening** — `evaluateExamAnswer` and `evaluateLabAnswer` now anchor on `rubric` + `solution_outline` first (falling back to the legacy `explanation` field), instructing Haiku to score against the rubric rather than reward verbosity.
- **Admin template endpoint** — `GET /api/admin/v4/template` returns a fully-populated empty v4.1 JSON skeleton for the admin Monaco editor.

### v4.0 Monthly Gem Wallet (Task #2 — 50/50 Split + Welcome Gift)
- **Per-subject monthly wallet** (`student_gem_wallets`): one row per `(user_id, subject_id)` with a single `gems_balance` field — no daily cap, no midnight forfeit. `expires_at` is 30 days from purchase; a 3-day grace window follows for top-up.
- **50/50 split** on every purchase: `purchaseV4Gems` (in `lib/v4-gem-wallet.ts`) computes `priceUsd = YER × rate(region)`, splits into student-share + platform-share, writes both a `purchase_gems` (+gems) and a `platform_revenue` (delta 0, audit-only) row inside ONE transaction. Finance reporting sums `platform_revenue` directly from `gem_ledger` without joining payment tables.
- **Welcome gift** (+100 gems): granted ONCE per `(user, subject)` when the wallet is first touched (either via `getOrCreateV4Wallet` on first AI access OR inside `purchaseV4Gems` on first purchase, whichever fires first). `welcome_gift_claimed` flag guards re-grants.
- **Carryover**: a renewal during the grace window preserves the leftover balance and audits it as `renewal_carryover`. Past-grace purchases start fresh.
- **Atomic charge** (`chargeV4Ai`): `gems = floor(usd × 1000)` (1¢ = 10 gems). Idempotent on `requestId` via the same `gem_ledger(user_id, request_id)` unique index that powers `settleAiCharge`. Conditional UPDATE refuses to debit when balance is insufficient OR when past grace window.
- **Auto-refund** (`refundV4Ai`): reverses a debit by `requestId`. Idempotent (refund key = `${requestId}:refund`).
- **Expiry sweep**: `sweepV4ExpiredWallets` runs in the existing hourly `scheduled-jobs` tick. Zeroes any wallet whose `expires_at + 3 days < now AND gems_balance > 0` and writes a `monthly_expiry` audit row.
- **New ledger reasons**: `purchase_gems`, `platform_revenue`, `welcome_gift`, `monthly_expiry`, `renewal_carryover`. New sources prefixed `v4_*`. Student usage page and admin ledger tab display them with Arabic labels.
- **Parallel to legacy**: the approve flow writes BOTH the legacy `user_subject_subscriptions` grant AND a v4 `purchaseV4Gems` (best-effort post-tx — a v4 failure logs but does not undo the legacy grant). The legacy daily-cap / midnight-forfeit / free-first-lesson path remains in service for all student-facing reads until task #10 cuts the FE over.

## External Dependencies

- **Node.js**: Version 24
- **Package Manager**: pnpm
- **TypeScript**: Version 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Build Tool**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **AI (Teaching)**: Gemini 2.5 Flash Lite via OpenRouter (primary and only model for student teaching; Gemini 2.0 Flash was retired from OpenRouter, Lite is the same-priced replacement).
- **AI (Teacher Illustrations)**: FLUX.1 [schnell] via fal.ai for inline diagram generation.
- **AI (Lesson/Interview/Plan)**: GPT-4o via OpenRouter.
- **AI (Summaries)**: Claude Sonnet 4.6 via OpenRouter.
- **AI (PDF OCR)**: Gemini 2.5 Flash/Pro via OpenRouter, with Claude Sonnet 4.5 as fallback for scanned PDFs.
- **AI (Routing)**: All Gemini calls go through OpenRouter.
- **Code Execution**: Wandbox public sandbox API (proxied through `/api/ai/run-code`).
- **PDF Processing**: `unpdf` for native text extraction.
- **Auth**: Cookie-based sessions (HMAC-SHA256 signed tokens, scrypt-hashed passwords).
- **UI Libraries**: highlight.js, KaTeX, jspdf, html2canvas.
- **Payment Gateway**: Manual Kuraimi transfer (account details managed via admin-editable `payment_settings`).