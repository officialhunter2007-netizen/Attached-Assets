---
name: Quiz Score System
description: Full architecture of the HTML quiz → score storage → certificate display pipeline in Nukhba.
---

## The Pipeline

```
Admin uploads HTML quiz (self-grading)
    ↓  stored in v4_unit_quizzes / v4_level_quizzes / v4_stage_quizzes
Student opens quiz via QuizViewer component
    ↓  iframe src = /api/v4/<type>-quizzes/<id>/view
Backend injects window.submitScore(n) bridge via injectQuizBridge()
    ↓  artifacts/api-server/src/lib/quiz-bridge.ts
Quiz HTML calls window.submitScore(score)
    ↓  fires postMessage { type:'NUKHBA_QUIZ_SCORE', quizId, quizType, score }
QuizViewer receives postMessage, validates origin+quizId
    ↓  artifacts/nukhba/src/components/quiz-viewer.tsx
POST /api/v4/quiz-scores { quiz_type, quiz_id, score }
    ↓  upserts v4_quiz_scores (best_score = GREATEST, attempts++)
Certificate page fetches GET /api/v4/quiz-scores?specialty_slug=X
    ↓  artifacts/nukhba/src/pages/certificates.tsx
Shows collapsible "درجات الاختبارات" section in cert detail modal
```

## Key Rules

**Why:** Scores must persist server-side to appear in final level/specialty certificates. The HTML quiz itself cannot be trusted to store its own result.

**How to apply:**
- Any new quiz HTML uploaded by admin MUST call `window.submitScore(score)` when grading is done — this is the only contract.
- The bridge is injected at view-time by the backend — quiz authors don't need to add postMessage manually (just call `window.submitScore`).
- Scores use UPSERT: `best_score = GREATEST(old, new)`, attempts always increments.
- The certificate GET endpoint does NOT include quiz scores in the cert payload — scores are fetched separately by the frontend via `GET /v4/quiz-scores?specialty_slug=X`.

## Tables

- `v4_quiz_scores`: `(user_id, quiz_type, quiz_id, score, best_score, attempts, last_attempted_at)` — unique on `(user_id, quiz_type, quiz_id)`
- `v4_unit_quizzes`, `v4_level_quizzes`, `v4_stage_quizzes`: store HTML content only

## Route Prefix Gotcha

All four quiz route files (`v4_unit_quizzes.ts`, `v4_level_quizzes.ts`, `v4_stage_quizzes.ts`, `v4_quiz_scores.ts`) define routes as `/v4/...` (NOT `/api/v4/...`). The main app does `app.use("/api", routes_default)` which strips `/api` before matching. Routes defined with the full `/api/v4/...` path silently 404 from the browser.
