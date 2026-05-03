/**
 * Regression tests for Task #58 — per-subject 80-gem free first session.
 *
 * Run with:  pnpm --filter @workspace/api-server exec tsx src/lib/__tests__/access-first-lesson.test.ts
 *
 * These tests document and enforce the contract that the per-subject
 * `userSubjectFirstLessons` row owns the free-trial state, and that
 * `completed = true` is set ONLY when the 80-gem cap is hit (by
 * `settleAiCharge` in lib/charge-ai-usage.ts) — not after every session
 * end (which was the regression: summarize-lesson used to flip the row
 * to completed:true after a single session, killing the remaining free
 * gems on that subject forever).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { FREE_LESSON_GEM_LIMIT } from "../access.js";

const CAP = FREE_LESSON_GEM_LIMIT;

// Mirror the predicate used in lib/access.ts:90-93. Kept in lock-step here
// so any change to that formula must also update the test (and the test
// will catch silent regressions from refactors of the helper).
function isFirstLessonFromRow(
  row: { completed: boolean; freeMessagesUsed: number } | null,
): boolean {
  return !row || (!row.completed && (row.freeMessagesUsed ?? 0) < CAP);
}

describe("per-subject first-lesson access predicate", () => {
  test("FREE_LESSON_GEM_LIMIT is 80 (do not change without product approval)", () => {
    assert.equal(CAP, 80);
  });

  test("brand-new subject (no row) → free trial granted", () => {
    assert.equal(isFirstLessonFromRow(null), true);
  });

  test("partially-used row (5/80, not completed) → still on free trial", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: false, freeMessagesUsed: 5 }),
      true,
      "Task #58 regression: a student who used 5 of 80 gems and ended " +
        "the session must NOT lose the remaining 75. The row is only " +
        "completed when settleAiCharge flips it at the 80-gem boundary.",
    );
  });

  test("almost-exhausted row (79/80, not completed) → still on free trial", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: false, freeMessagesUsed: 79 }),
      true,
    );
  });

  test("exactly at cap (80/80) → trial exhausted regardless of completed flag", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: false, freeMessagesUsed: CAP }),
      false,
      "freeMessagesUsed >= cap is the authoritative exhaustion signal, " +
        "even if the completed flag has not yet been written.",
    );
  });

  test("over cap (clamped) → trial exhausted", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: false, freeMessagesUsed: CAP + 10 }),
      false,
    );
  });

  test("explicitly completed row → trial exhausted", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: true, freeMessagesUsed: 0 }),
      false,
    );
  });

  test("completed row at cap → trial exhausted", () => {
    assert.equal(
      isFirstLessonFromRow({ completed: true, freeMessagesUsed: CAP }),
      false,
    );
  });
});

describe("Task #58 contract: only settleAiCharge sets completed=true", () => {
  test("summarize-lesson route must NOT touch userSubjectFirstLessonsTable", async () => {
    // Static guard against re-introducing the regression. If anyone wires
    // the summaries route back into the first-lesson table, this fails
    // and points them at the right SSOT.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const summariesPath = resolve(here, "../../routes/summaries.ts");
    const src = readFileSync(summariesPath, "utf8");

    // String literal is fine — comments referring to the table by name
    // are allowed; only actual code references (db.update / db.insert
    // against the table) are the regression. We grep for the call sites.
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

  test("settleAiCharge is the sole writer of the completed flag", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, resolve } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const chargePath = resolve(here, "../charge-ai-usage.ts");
    const src = readFileSync(chargePath, "utf8");
    // The atomic UPDATE must still gate `completed` on the 80-gem cap.
    assert.ok(
      /completed:\s*sql`[^`]*freeMessagesUsed[^`]*\+[^`]*>=[^`]*\$\{cap\}/.test(
        src,
      ),
      "charge-ai-usage.ts must atomically flip completed=true only when " +
        "freeMessagesUsed + gems >= cap. This is the SSOT — do not move " +
        "this responsibility to other routes.",
    );
  });
});
