# First-Session Verification — Task #36

## Code-level checks

1. **Kit table is exhaustive** — `SUBJECT_SHOWCASE_KITS` in `artifacts/api-server/src/lib/subject-showcase-kits.ts` has exactly 24 entries, one per subjectId in `curriculum.ts`. Verified by manual diff against `getSubjectById` lookup table.

2. **Kit injection is gated PER SUBJECT, post-plan** — kit fires when `isShowcaseOpener === true`. The condition is:
   - `!isDiagnosticPhase` — request body flag set by the frontend; teaching turn (the frontend persists `chatPhase` and flips it to `teaching` when the planReady stream signal arrives).
   - `!hasPriorLabEnvTag` — no prior `[[CREATE_LAB_ENV:` in history (showcase didn't already run).
   - `!hasPriorTeachingReply` — no prior assistant message contains a teaching-only marker that survives `cleanTeachingChunk()`: `[[CREATE_LAB_ENV:`, `[[IMAGE:`, or `<div class="(question-box|praise|discover-box)`. We do NOT scan for `[PLAN_READY]` because `cleanTeachingChunk()` strips it before persistence. We do NOT use the global `users.firstLessonComplete` billing flag because it's consumed once per account and would have suppressed subjects #2..24. Diagnostic ASK_OPTIONS turns and the plan-reveal HTML do NOT contain these teaching markers, so they don't trigger the guard.
   - Conversation history is per-subject, so the signal is naturally per-subject. Re-runs of l1 after the lab was launched do NOT re-inject the kit (no infinite tour).

3. **Kit block is appended LAST** — placement is after `buildGeminiTeachingAddendum`, so the kit's literal instructions are the most-recent guidance the model reads, overriding any earlier "ask first" / "don't build a lab in first reply" rules.

4. **No Arabic inside FLUX prompts** — every `imageBlueprint.fluxPrompt` is English-only and ends with explicit `NO TEXT, NO LABELS, NO WORDS, only numbered colored circles 1 2 3` to prevent FLUX from rendering broken Arabic glyphs.

5. **Caption HTML is well-formed** — every `<figcaption>` template has matching `<strong>`, `<ol>`, three `<li>` items with `.num.n1/.n2/.n3` spans matching the existing CSS used elsewhere in the platform.

6. **lab descriptions contain the 5 mandatory sections** — every `labEnvBlueprint` string includes: السياق / البيانات الأولية / الشاشات / معايير النجاح / الخطأ المتوقّع. The existing `validateAndHealEnv` lab validator will accept these without rejection.

7. **u1 lesson IDs preserved** — every hand-written u1 keeps `id: "l1"`..`"l5"` (or `"ys-l1"` etc. for yemensoft which uses prefixed ids). No deep-link breakage from lesson-route URLs.

8. **Specialized-lab guidance only claims what exists** — branches added for cybersecurity / data-science / networking / business / mobile-se-ai explicitly say "البيئة تُبنى ديناميكياً عبر CREATE_LAB_ENV" and avoid claiming hard-coded specialized labs. No false promises.

## Manual smoke test plan
For at least 3 representative subjects (uni-it, uni-cybersecurity, skill-python):
1. Open a fresh subject as a brand-new user.
2. Complete diagnostic, accept the personalized plan.
3. Open lesson l1, send the first user message.
4. Expect in the model's first reply:
   - The hookConcept appears verbatim (or close paraphrase) in the second paragraph.
   - The Yemeni scenario from the kit is woven in (city + numbers).
   - One `[[IMAGE: ...]]` block matches the kit's English FLUX prompt.
   - One `<figcaption>` block matches the kit's Arabic caption + 3 legend lines.
   - One `[[CREATE_LAB_ENV: ...]]` block whose description contains the 5 mandatory sections from the blueprint.
5. Click into the lab, fall into the documented mistake trap, confirm `[MISTAKE: ...]` is emitted on the next turn matching the kit's `firstMistakeTrap`.
6. After the lab, confirm the model says the kit's exact `transitionLine` (or close paraphrase) and pivots into stage 1 of the plan.

## Risks and mitigations
- **Risk:** Kit text is long; system prompt may exceed token budget on showcase opener.
  **Mitigation:** kit is injected only on the FIRST reply of the subject (one-shot), and `FREE_LESSON_GEM_LIMIT = 80` already absorbs the extra cost. Subsequent turns drop the addendum entirely.
- **Risk:** Model may quote the kit literally rather than weave it naturally.
  **Mitigation:** kit instructions explicitly say "استخدمها حرفياً" only for the LAB description, IMAGE prompt, caption, and transitionLine — for the hookConcept and scenario the wording allows natural integration into prose.
- **Risk:** Lab description doesn't pass `validateAndHealEnv`.
  **Mitigation:** every blueprint manually includes context + initialData (with concrete numbers) + screens + success criteria + expected mistake — the same 5 sections the validator checks.
