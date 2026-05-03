/**
 * Task #58 regression suite — per-subject 80-gem free first session.
 *
 * Exercises the pure `computeAccess` core that backs `getAccessForUser`
 * and therefore /api/subscriptions/subject-access. Fixtures are plain
 * objects so no DB is required.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  computeAccess,
  computeFirstLessonView,
  FREE_LESSON_GEM_LIMIT,
  type AccessUserState,
  type AccessSubState,
  type AccessFirstLessonState,
} from "../access.js";

const CAP = FREE_LESSON_GEM_LIMIT;
const NOW = new Date("2026-05-03T12:00:00Z");
const SUBJECT = "subj_math";

function makeUser(overrides: Partial<AccessUserState> = {}): AccessUserState {
  return {
    firstLessonComplete: false,
    gemsBalance: 0,
    gemsDailyLimit: 0,
    gemsUsedToday: 0,
    gemsExpiresAt: null,
    nukhbaPlan: null,
    subscriptionExpiresAt: null,
    messagesLimit: 0,
    messagesUsed: 0,
    ...overrides,
  };
}
function activeSub(overrides: Partial<AccessSubState> = {}): AccessSubState {
  return {
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
    gemsBalance: 1500,
    gemsDailyLimit: 200,
    gemsUsedToday: 0,
    ...overrides,
  };
}

describe("computeFirstLessonView", () => {
  test("FREE_LESSON_GEM_LIMIT is 80", () => assert.equal(CAP, 80));

  test("no row → 80 free", () => {
    const v = computeFirstLessonView(null);
    assert.deepEqual(v, { isFirstLesson: true, gemsRemaining: 80, freeMessagesUsed: 0 });
  });

  test("partial use (5/80) → 75 free", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: 5 });
    assert.equal(v.gemsRemaining, 75);
    assert.equal(v.isFirstLesson, true);
  });

  test("at cap (80/80) → exhausted", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: CAP });
    assert.equal(v.isFirstLesson, false);
    assert.equal(v.gemsRemaining, 0);
  });

  test("Task #58 heal: completed=true with used < cap → still on trial", () => {
    // Old summaries.ts wrote completed=true on session end with used=0 or
    // used<80. freeMessagesUsed is now authoritative for exhaustion so
    // those students get their remaining free gems back.
    const v = computeFirstLessonView({ completed: true, freeMessagesUsed: 0 });
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 80);
    const v2 = computeFirstLessonView({ completed: true, freeMessagesUsed: 5 });
    assert.equal(v2.isFirstLesson, true);
    assert.equal(v2.gemsRemaining, 75);
  });

  test("negative usage clamped to 0", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: -5 });
    assert.equal(v.gemsRemaining, 80);
  });
});

describe("computeAccess — Task #58 access-path scenarios", () => {
  test("A) brand-new user, brand-new subject → first-lesson, 80 gems", () => {
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT, firstLesson: null, subs: [], now: NOW,
    });
    assert.equal(r.source, "first-lesson");
    assert.equal(r.isFirstLesson, true);
    assert.equal(r.canAccess, true);
    assert.equal(r.gemsRemaining, 80);
    assert.equal(r.blockReason, null);
  });

  test("B) returning user (firstLessonComplete=true) on a new subject → first-lesson, 80 gems", () => {
    // The global flag is from the pre-per-subject era and must NOT block
    // a new subject's free trial.
    const r = computeAccess({
      user: makeUser({ firstLessonComplete: true }),
      subjectId: SUBJECT, firstLesson: null, subs: [], now: NOW,
    });
    assert.equal(r.source, "first-lesson");
    assert.equal(r.gemsRemaining, 80);
    assert.equal(r.canAccess, true);
  });

  test("C) partially-used same subject (5/80) → first-lesson, 75 gems", () => {
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT,
      firstLesson: { completed: false, freeMessagesUsed: 5 },
      subs: [], now: NOW,
    });
    assert.equal(r.source, "first-lesson");
    assert.equal(r.gemsRemaining, 75);
    assert.equal(r.canAccess, true);
  });

  test("D) exhausted same subject (80/80) → no access, no_gems", () => {
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT,
      firstLesson: { completed: false, freeMessagesUsed: CAP },
      subs: [], now: NOW,
    });
    assert.equal(r.source, "none");
    assert.equal(r.isFirstLesson, false);
    assert.equal(r.canAccess, false);
    assert.equal(r.gemsRemaining, 0);
  });

  test("E) Task #58 heal: completed=true with used=5 → restored to first-lesson, 75 gems", () => {
    // The summarize route used to corrupt rows like this. Without the
    // heal, these students see canAccess:false / NO_GEMS even though
    // they never used 80 gems. With the heal they get the remaining 75.
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT,
      firstLesson: { completed: true, freeMessagesUsed: 5 },
      subs: [], now: NOW,
    });
    assert.equal(r.source, "first-lesson");
    assert.equal(r.canAccess, true);
    assert.equal(r.gemsRemaining, 75);
  });

  test("F) active paid per-subject sub → source=per-subject, balance=sub.gemsBalance", () => {
    const r = computeAccess({
      user: makeUser({ firstLessonComplete: true }), subjectId: SUBJECT,
      firstLesson: { completed: false, freeMessagesUsed: CAP },
      subs: [activeSub({ gemsBalance: 1200, gemsDailyLimit: 200, gemsUsedToday: 50 })],
      now: NOW,
    });
    assert.equal(r.source, "per-subject");
    assert.equal(r.hasActiveSub, true);
    assert.equal(r.gemsRemaining, 1200);
    assert.equal(r.dailyRemaining, 150);
    assert.equal(r.canAccess, true);
  });

  test("G) active paid sub but daily limit hit → canAccess=false, daily_limit", () => {
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT, firstLesson: null,
      subs: [activeSub({ gemsDailyLimit: 200, gemsUsedToday: 200 })],
      now: NOW,
    });
    assert.equal(r.source, "per-subject");
    assert.equal(r.blockReason, "daily_limit");
    assert.equal(r.canAccess, false);
  });

  test("H) dead per-subject sub + fresh first-lesson row → first-lesson with remaining gems", () => {
    // Ensures the dead-row branch surfaces 80 (not the dead sub's 0).
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT,
      firstLesson: null,
      subs: [activeSub({
        expiresAt: new Date(NOW.getTime() - 1000),
        gemsBalance: 0,
      })],
      now: NOW,
    });
    assert.equal(r.source, "first-lesson");
    assert.equal(r.gemsRemaining, 80);
    assert.equal(r.canAccess, true);
  });

  test("I) dead per-subject sub + exhausted first-lesson → no access", () => {
    const r = computeAccess({
      user: makeUser(), subjectId: SUBJECT,
      firstLesson: { completed: false, freeMessagesUsed: CAP },
      subs: [activeSub({
        expiresAt: new Date(NOW.getTime() - 1000), gemsBalance: 0,
      })],
      now: NOW,
    });
    assert.equal(r.source, "none");
    assert.equal(r.canAccess, false);
  });

  test("J) no user → blockReason=no_user", () => {
    const r = computeAccess({
      user: null, subjectId: SUBJECT, firstLesson: null, subs: [], now: NOW,
    });
    assert.equal(r.blockReason, "no_user");
    assert.equal(r.canAccess, false);
  });

  test("K) subject-less call falls back to global firstLessonComplete flag", () => {
    const fresh = computeAccess({
      user: makeUser(), subjectId: null, firstLesson: null, subs: [], now: NOW,
    });
    assert.equal(fresh.source, "first-lesson");
    assert.equal(fresh.gemsRemaining, 80);

    const done = computeAccess({
      user: makeUser({ firstLessonComplete: true }),
      subjectId: null, firstLesson: null, subs: [], now: NOW,
    });
    assert.equal(done.source, "none");
    assert.equal(done.canAccess, false);
  });
});

describe("Task #58 SSOT guards", () => {
  test("summaries.ts must not write to userSubjectFirstLessonsTable", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../../routes/summaries.ts"), "utf8");
    assert.ok(
      !/db\s*\.\s*(update|insert|delete)\s*\(\s*userSubjectFirstLessonsTable/.test(src),
      "summaries.ts must not write the first-lesson table; settleAiCharge owns it.",
    );
  });

  test("settleAiCharge gates `completed` on freeMessagesUsed + gems >= cap", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../charge-ai-usage.ts"), "utf8");
    assert.ok(
      /completed:\s*sql`[^`]*freeMessagesUsed[^`]*\+[^`]*>=[^`]*\$\{cap\}/.test(src),
      "charge-ai-usage.ts must atomically gate completed=true on the cap.",
    );
  });
});
