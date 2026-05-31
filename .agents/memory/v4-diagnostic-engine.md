---
name: v4 diagnostic drill engine
description: Deterministic per-turn weakness-targeting directive that makes a weak teaching model feel "genius" at detecting + drilling gaps; and why a blind missing-tag fallback was deliberately rejected.
---

# v4 Diagnostic Drill Engine

The teaching chat model is locked to a weak model that emits mastery tags
inconsistently and picks concepts at random. The fix is to move the
intelligence OUT of the model into deterministic server code that computes the
single next move each turn and injects it as the FINAL (highest-salience)
prompt layer.

**Core algorithm (stateless, per-turn, no DB writes):** read live per-concept
mastery + chronic weaknesses → pick ONE target concept root-cause-first
(lowest conceptIndex that is untested or weak; else earliest shaky; else all
mastered → advance) → emit a concrete move (PROBE untested / DRILL weak /
REINFORCE shaky / ADVANCE) → pre-empt the most-severe common mistake as a trap
→ mandate a `[MASTERY]/[NEEDS_REVIEW]` tag for the target.

**Key correctness detail:** untested vs scored-0 MUST be distinguished by
`Map.has(conceptIndex)`, not by value — a real 0 is a "weak" diagnosis, a
missing key is "never tested" (PROBE). Conflating them breaks targeting.

## Why NO blind "missing-tag → default judgment" fallback

**The rule:** do NOT auto-apply a default mastery/needs-review when the model
omits the tag.

**Why:** the loop is PROBE-then-judge across two turns. On the turn the teacher
*asks* the diagnostic question the student has not answered yet, so NO judgment
tag is due. The judgment is due on the NEXT turn after the student replies. A
server guard that injects a default tag whenever it is absent would corrupt
mastery on every question-asking turn (penalizing the student for being asked).

**How to apply:** the engine is stateless per-turn and (by the no-schema-change
constraint) cannot tell a probe turn from a judge turn, so it cannot safely
fabricate a judgment. The mitigation is the directive text itself (highest
salience + explicit mandate at the right moment). If you ever want true
enforcement, it requires new per-(user,concept) turn-state (schema change) to
count "targeted-as-untested N turns without a score" and only then rotate the
target — never fabricate a score.
