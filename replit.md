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
- **AI Cost Protection**: Server-side enforcement of free lesson limits, cost caps (AI cost never exceeds 50% of subscription payment), and strict model locking to Gemini 2.0 Flash for all student-facing teaching.
- **AI Route Reliability**: All student-facing AI routes include robust `try/catch` blocks and a `emitFriendlyAiFailure` helper to gracefully handle errors with Arabic apology messages instead of bare 500s.

## External Dependencies

- **Node.js**: Version 24
- **Package Manager**: pnpm
- **TypeScript**: Version 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Build Tool**: esbuild
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **AI (Teaching)**: Gemini 2.0 Flash via OpenRouter (primary and only model for student teaching).
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