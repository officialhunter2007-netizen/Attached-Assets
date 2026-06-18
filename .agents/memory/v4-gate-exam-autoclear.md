---
name: v4 gate-exam auto-clear safety
description: Why an AI-generated stage/level gate that "auto-clears on thin content" must distinguish a malformed AI response from genuinely-unauthorable content.
---

# v4 stage/level gate-exam auto-clear

Stage/level gate exams are adaptive AI-generated MCQ pools (same machinery as the
unit test-out). A scope with no runnable pool (<13 questions) is **auto-cleared**
(records a pass) as a no-brick fallback — the explicit version of the old
"missing authored bank ⇒ gate open" leniency.

## The trap
The per-unit generator returns parsed questions, and the pool layer auto-clears
the gate only when the pool is "clean thin" (`failedUnits === 0` and total < 13).
If the generator swallows a malformed / truncated / all-invalid AI response by
returning `[]` **without** flagging the unit as failed, a transient provider
outage is misread as "genuinely unauthorable content" and the gate silently
auto-passes the student (and if 1–12 junk questions get persisted, every future
cached start auto-clears too).

**Rule:** a unit that HAS authorable material (lessons or concepts) but yields
ZERO usable questions is a **generation failure** (retryable), not thin content —
it must increment `failedUnits`. Only a unit with no authorable material may
legitimately produce zero questions.

**Why:** auto-clear must fire only on a cleanly-generated pool. The provider-vs-thin
distinction is the entire safety boundary; an over-broad "empty result = thin"
classification turns one AI hiccup into a permanent free unlock.

**How to apply:** any future scoped AI-pool generator whose emptiness triggers a
lenient side-effect (auto-clear, auto-grant) must classify "empty from non-empty
input" as failure, and the consumer must refuse the lenient path while
`failedUnits > 0 && !fromCache`.

## Idempotency
`applyGateExamPass` writes a passing `v4_exam_attempts` row then re-applies a
union-only unlock snapshot. The snapshot is safe to re-apply, but the attempt
insert is not — guard it by checking for an existing passed attempt on
`(user, subject, version, scope, scopeRefId)` so re-finalize / concurrent /
auto-clear-after-pass never duplicates the audit row.

## Pool cache namespace
Gate pools share `v4_testout_pools` with unit test-out but key on a scope key
(`stage:<code>` / `level:<idx>`), which is disjoint from canonical numeric unit
codes — the two never collide under the unique `(versionId, targetUnitCode)`.
