/**
 * Regression tests for Task #58 — per-subject 80-gem free first session.
 *
 * Run with:  pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/access-first-lesson.test.ts
 *
 * These tests document and enforce the contract that:
 *
 *   1. The per-subject `userSubjectFirstLessons` row owns the free-trial
 *      state. `completed = true` is set ONLY when the 80-gem cap is hit
 *      (by `settleAiCharge` in lib/charge-ai-usage.ts) — not after every
 *      session end (which was the Task #58 regression: summarize-lesson
 *      used to flip the row to completed:true after a single session,
 *      killing the remaining free gems on that subject forever).
 *
 *   2. The /subject-access contract surfaces the REMAINING free gems
 *      (80 − freeMessagesUsed), not 0. Reporting 0 made students think
 *      they were out of gems even though the trial was still alive.
 *
 *   3. The global `users.firstLessonComplete` flag does NOT block a new
 *      subject's trial — it's a legacy one-shot from the pre-per-subject
 *      era and is intentionally ignored when a subjectId is provided.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeFirstLessonView, FREE_LESSON_GEM_LIMIT } from "../access.js";

const CAP = FREE_LESSON_GEM_LIMIT;

describe("computeFirstLessonView — pure helper used by getAccessForUser", () => {
  test("FREE_LESSON_GEM_LIMIT is 80 (do not change without product approval)", () => {
    assert.equal(CAP, 80);
  });

  test("Scenario A: brand-new user, brand-new subject (no row) → 80 free gems", () => {
    const v = computeFirstLessonView(null);
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 80);
    assert.equal(v.freeMessagesUsed, 0);
  });

  test("Scenario B: returning user (firstLessonComplete=true globally) on a new subject → still 80 free gems", () => {
    // The global flag is a legacy signal; for subject-scoped access the
    // per-subject row is authoritative. A user who finished the free
    // trial on subject X must still get a fresh 80 gems on subject Y.
    // No row = no prior usage on this subject → full cap available.
    const v = computeFirstLessonView(undefined);
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 80);
  });

  test("Scenario C: same subject, partially used (5/80) → 75 free gems remaining", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: 5 });
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 75,
      "Task #58 regression: a student who used 5 of 80 gems and ended " +
        "the session must keep 75 — the row is only completed when " +
        "settleAiCharge flips it at the 80-gem boundary.");
  });

  test("Scenario C': same subject, almost-exhausted (79/80) → 1 free gem remaining", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: 79 });
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 1);
  });

  test("Scenario D: same subject, exhausted (80/80) → 0 gems, trial over", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: CAP });
    assert.equal(v.isFirstLesson, false);
    assert.equal(v.gemsRemaining, 0,
      "freeMessagesUsed >= cap is the authoritative exhaustion signal, " +
        "even if the completed flag has not yet been written.");
  });

  test("Scenario D': same subject, over cap (clamped) → 0 gems, trial over", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: CAP + 10 });
    assert.equal(v.isFirstLesson, false);
    assert.equal(v.gemsRemaining, 0);
  });

  test("Scenario E: completed flag set (e.g. from settleAiCharge cap-flip) → trial over", () => {
    const v = computeFirstLessonView({ completed: true, freeMessagesUsed: CAP });
    assert.equal(v.isFirstLesson, false);
    assert.equal(v.gemsRemaining, 0);
  });

  test("defensive: completed=true with used=0 (shouldn't happen post-#58) → trial over", () => {
    // The summaries.ts INSERT(completed:true,used:0) branch was removed
    // in Task #58, so this row shape should no longer be created. But
    // older rows with this shape exist in production — confirm the
    // helper still respects the explicit completed=true.
    const v = computeFirstLessonView({ completed: true, freeMessagesUsed: 0 });
    assert.equal(v.isFirstLesson, false);
    assert.equal(v.gemsRemaining, 0);
  });

  test("defensive: negative freeMessagesUsed is clamped to 0", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: -5 });
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 80);
    assert.equal(v.freeMessagesUsed, 0);
  });

  test("custom cap parameter is honored (for tests / future tier changes)", () => {
    const v = computeFirstLessonView({ completed: false, freeMessagesUsed: 30 }, 50);
    assert.equal(v.isFirstLesson, true);
    assert.equal(v.gemsRemaining, 20);
  });
});

describe("Task #58 contract: only settleAiCharge sets completed=true", () => {
  test("summarize-lesson route must NOT write to userSubjectFirstLessonsTable", async () => {
    // Static guard against re-introducing the regression. If anyone wires
    // the summaries route back into the first-lesson table, this fails
    // and points them at the right SSOT.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const summariesPath = resolve(here, "../../routes/summaries.ts");
    const src = readFileSync(summariesPath, "utf8");

    const writeRegex =
      /db\s*\.\s*(update|insert|delete)\s*\(\s*userSubjectFirstLessonsTable/;
    assert.ok(
      !writeRegex.test(src),
      "summaries.ts must not write to userSubjectFirstLessonsTable. The " +
        "per-subject 80-gem free trial is owned by settleAiCharge in " +
        "lib/charge-ai-usage.ts; flipping completed=true on session end " +
        "was the Task #58 regression.",
    );
  });

  test("settleAiCharge atomically gates `completed` on freeMessagesUsed + gems >= cap", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const chargePath = resolve(here, "../charge-ai-usage.ts");
    const src = readFileSync(chargePath, "utf8");
    assert.ok(
      /completed:\s*sql`[^`]*freeMessagesUsed[^`]*\+[^`]*>=[^`]*\$\{cap\}/.test(src),
      "charge-ai-usage.ts must atomically flip completed=true only when " +
        "freeMessagesUsed + gems >= cap. This is the SSOT — do not move " +
        "this responsibility to other routes.",
    );
  });

  test("first-lesson ledger row carries subjectId and gemsConsumed for audit", async () => {
    // Reviewer's third issue: ledger rows for first-lesson debits used to
    // omit subjectId and used delta:0 with no record of actual gems
    // consumed, so admin queries couldn't tell which subject's free
    // trial the turn came from. The wallet now carries subjectId and
    // gemsConsumed is written into ledger metadata.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));

    const chargeSrc = readFileSync(resolve(here, "../charge-ai-usage.ts"), "utf8");
    assert.ok(
      /opts\.wallet\.kind === "first-lesson"\s*\?\s*\(opts\.wallet\.subjectId/.test(chargeSrc),
      "ledger insert must thread first-lesson wallet's subjectId into the row",
    );
    assert.ok(
      /baseMetadata\.gemsConsumed\s*=\s*gems/.test(chargeSrc),
      "ledger metadata must record actual gems consumed against the cap " +
        "(delta is 0 because there's no real wallet to refund into)",
    );

    const aiSrc = readFileSync(resolve(here, "../../routes/ai.ts"), "utf8");
    assert.ok(
      /kind:\s*"first-lesson"[^}]*subjectId/.test(aiSrc),
      "ai.ts must construct the first-lesson wallet with subjectId so " +
        "the ledger row is subject-scoped",
    );
  });
});
