---
name: v4 placement test accuracy
description: Why the v4 placement test (اختبار تحديد المستوى) can fail to determine a student's real level — design + content + integrity constraints.
---

# v4 placement test — accuracy constraints

The placement flow (path-custom.tsx → `/v4/path/:slug/placement/{next,finalize}` → v4-path-engine.ts → `/v4/path/:slug/map`) is mechanically correct for the honest happy path: it adaptively walks levels 1→5, stops on 2 consecutive fails or level exhaustion, sets `currentLessonCode` = first lesson of the placed level, unlocks levels 1..N, and the map opens directly at that level with the first lesson "active". The "direct jump to the placed level" works.

But three constraints limit how accurately it places a real student:

1. **Granularity is LEVEL-only — never stage/unit (by design).** Placement questions carry only `targetLevelIndex`; `computeStartingLevel` returns a level; `computeUnlocked` always sets `currentLessonCode` to the FIRST lesson of the level (first stage / first unit). There is no within-level placement. A request for "land them on the right level AND stage AND unit" is NOT satisfiable without adding stage/unit targeting to the question bank + engine.

2. **Silently capped by missing placement questions.** `pickNextPlacementQuestion` returns `finalize: "exhausted"` the moment a target level has no authored placement questions. So if the admin only authored level-1 questions, EVERY student caps at level 1 regardless of ability — placement becomes a no-op equivalent to `from_zero` (just unlocks all of level 1 instead of only the first lesson). Always verify `v4_placement_test_questions` has rows for every level before claiming placement "works". NOTE: what's PUBLISHED in the Replit-cloud DB is often a short temporary stub (e.g. `skill-python` = 1 level only); the REAL full curriculum lives in instruction JSON files (`out/*.json`, `attached_assets/final_*.json`) and is published to the standalone server later. The real `uni-it` file has 5 levels × 7 stages + 4 placement MCQs per level (all 5 levels), so on real content placement DOES discriminate level correctly. Audit the JSON files, not just the dev DB.

2b. **Only ONE question per level is asked in the happy path.** The engine advances to level N+1 on the FIRST correct answer at level N (`orderBy(difficulty, questionIndex)` then `.find` first unasked). The other 3 authored questions per level are only consumed as re-draws AFTER a wrong answer. So a confident student's entire placement rests on a single ~25%-guessable MCQ per level — one lucky guess over-places, one slip (plus a slip on the re-draw) under-places. The author writing 4 questions/level does NOT mean 4 are used.

3. **`finalize` trusts the client.** The `answered[]` history lives client-side and is POSTed back each `next` call (server only grades the single in-flight answer); `finalize` accepts whatever `startingLevelIndex` the client sends (clamped 1-5) without re-deriving it from server-graded answers or proving a test was taken. Honest students are placed accurately, but the test is bypassable (POST finalize with startingLevelIndex=5).

**Why this matters:** the headline symptom — "the placement test puts everyone at level 1" — is usually a CONTENT gap (no questions/levels authored above 1), not an engine bug. The replit.md spec promises 5 levels × 7 stages per specialty, but published content can be far thinner. Check the DB before assuming the curriculum exists.

**Secondary:** v4-map.tsx has no `scrollIntoView` to the active node — fine for placement (active = first lesson, top of level) but a returning student deep in a level must scroll manually.
