---
name: Adding a platform subject/skill to the Nukhba catalog
description: How a new subject propagates across the Nukhba FE + admin, and what must be kept in sync when adding one.
---

# Adding a subject (university course or skill) to Nukhba

Single source of truth: `artifacts/nukhba/src/lib/curriculum.ts`, which exports
`university: Subject[]` and `skills: Category[]`. Adding an entry there auto-propagates to:
- the subscription page (imports `university`+`skills`, iterates + searches both),
- the learn catalog page,
- the admin v4 instruction picker (`admin-v4-instructions.tsx` builds its `CATALOG` from `university`+`skills`),
- the home subject-count stat is NOT dynamic (see below).

`Subject` shape: `{ id, name, emoji, colorFrom, colorTo, units, defaultStages, hasCoding }`.
Build `units` with `buildUnitsWithManualU1(idPrefix, totalUnits, lessonsPerUnit, {name, lessons})`
— a hand-written `u1` (l1..lN) plus generated placeholder units, matching existing entries.

**Must be kept in sync (parallel edit):** `artifacts/nukhba/src/lib/curriculum-en.ts` for English mode.
Fill five id-keyed maps: `SUBJECT_NAMES_EN[subjectId]`, `CATEGORY_NAMES_EN[categoryId]`,
`STAGES_EN[subjectId]`, `UNIT_NAMES_EN[`subjectId__u1`]`, `LESSON_TITLES_EN[`subjectId__u1__lN`]`.
Helpers fall back to the Arabic string on a missing key, so a miss degrades **silently** to Arabic
(no error) — easy to forget and never notice in AR mode.

**No backend allowlist gates subjects.** Subscription routes accept any non-empty `subjectId`.
Backend per-subject references are OPTIONAL with graceful fallbacks, so a new subject works without them:
- `subject-showcase-kits.ts` (`SUBJECT_SHOWCASE_KITS` via `getShowcaseKit` → `undefined`; `FIRST_MISTAKE_TOPICS` via `getFirstMistakeTopic` → default),
- conditional prompt hints in `routes/ai.ts` and the `isComputing` regex in `v4-teaching-core.ts`.

**v4 instruction file** (the full curriculum JSON) is **admin-authored**, NOT created by adding a catalog
entry. "ملف التعليمات على المشرف / define in admin" = make the subject *selectable* in the admin
instruction picker (which adding to curriculum.ts does). Do not auto-generate the giant per-specialty
JSON unless explicitly asked.

**Home stat:** `home.tsx` has a hardcoded `<StatCard value={N} suffix="+" label={tr.home.statSubjects}>`
— a rounded marketing floor, not exact. Bump it when the catalog grows noticeably (was understated at 15+
for 24 subjects).
