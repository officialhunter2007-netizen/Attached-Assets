---
name: v4 instruction generator field-name mapping
description: The bash curriculum generator emits helper field names that must be normalized to the platform schema during merge, or data is silently lost.
---

# v4 generator → platform schema field mapping

`scripts/generate-v4-instructions.sh` prompts the LLM to emit **helper field names**
that do NOT match the official `v4InstructionFileSchema` (in `@workspace/db`). The
generator needs some of them (especially `code`) for its internal jq joins, but the
platform schema uses different names and Zod **strips unknown keys silently** on
publish.

The merge phase (`phase_merge`) is the single place that must normalize before
writing `final.json`:

- `prerequisite_unit_codes`  → `prerequisite_units`
- `enables_unit_codes`       → `enables_units`
- `prerequisite_lesson_codes`→ `prerequisite_lessons`
- `enables_lesson_codes`     → `enables_lessons`
- `exam_meta` (level/stage/unit) → `exam`
- `code`, `scope`, `language`, `region`, `question_index` → kept; Zod strips them.

**Why:** without normalization the file still passes validation (those target
fields are optional/default `[]`), but every prerequisite link and every exam
pass-threshold is dropped — an "official" file that is pedagogically gutted with
an empty dependency graph.

**How to apply:** any edit to the generator's prompts that renames a relationship
or exam field must update the merge normalization in lockstep. Also: when copying
`exam_meta`→`exam`, only set it when present — Zod `.optional()` rejects an explicit
`null`, so never write `.exam = null`.

Merge also **sanitizes dangling refs**: a prereq/enables code that doesn't match any
existing unit/lesson code (or self-references) is dropped, so LLM numbering drift
becomes a safe drop instead of a hard validator error.

**Verify offline** (no API key needed): build fixtures with the helper names, run
`merge` then `validate`, then run the real validator via the installed tsx:
`node node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs <check.ts> final.json`
importing `validateV4InstructionFile`. Expect `ok:true`, 0 errors (count warnings
only). Note: the script auto-detects provider from `VERTEX_PROJECT` env (a secret
present in dev) and then needs `gcloud`; override `VERTEX_PROJECT=` empty for
offline merge/validate runs.
