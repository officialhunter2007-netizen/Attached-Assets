---
name: v4 placement test accuracy
description: Why the v4 placement test (اختبار تحديد المستوى) can fail to determine a student's real level — design + content + integrity constraints.
---

# v4 placement test — accuracy constraints

The placement flow (path-custom.tsx → `/v4/path/:slug/placement/{next,finalize}` → v4-path-engine.ts → `/v4/path/:slug/map`) is mechanically correct for the honest happy path: it adaptively walks levels 1→5, stops on 2 consecutive fails or level exhaustion, sets `currentLessonCode` = first lesson of the placed level, unlocks levels 1..N, and the map opens directly at that level with the first lesson "active". The "direct jump to the placed level" works.

But three constraints limit how accurately it places a real student:

1. **Granularity is LEVEL-only — never stage/unit (by design).** Placement questions carry only `targetLevelIndex`; `computeStartingLevel` returns a level; `computeUnlocked` always sets `currentLessonCode` to the FIRST lesson of the level (first stage / first unit). There is no within-level placement. A request for "land them on the right level AND stage AND unit" is NOT satisfiable without adding stage/unit targeting to the question bank + engine.

2. **Silently capped by missing placement questions.** `pickNextPlacementQuestion` returns `finalize: "exhausted"` the moment a target level has no authored placement questions. So if the admin only authored level-1 questions, EVERY student caps at level 1 regardless of ability — placement becomes a no-op equivalent to `from_zero` (just unlocks all of level 1 instead of only the first lesson). Always verify `v4_placement_test_questions` has rows for every level before claiming placement "works".

3. **`finalize` trusts the client.** The `answered[]` history lives client-side and is POSTed back each `next` call (server only grades the single in-flight answer); `finalize` accepts whatever `startingLevelIndex` the client sends (clamped 1-5) without re-deriving it from server-graded answers or proving a test was taken. Honest students are placed accurately, but the test is bypassable (POST finalize with startingLevelIndex=5).

**Why this matters:** the headline symptom — "the placement test puts everyone at level 1" — is usually a CONTENT gap (no questions/levels authored above 1), not an engine bug. The replit.md spec promises 5 levels × 7 stages per specialty, but published content can be far thinner. Check the DB before assuming the curriculum exists.

**Secondary:** v4-map.tsx has no `scrollIntoView` to the active node — fine for placement (active = first lesson, top of level) but a returning student deep in a level must scroll manually.
