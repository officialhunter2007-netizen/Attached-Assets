---
name: SCENE + IMAGE + ANIM permanently retired (2026-07-06)
description: These three teacher visual mechanisms were deliberately deleted end-to-end; do not resurrect or re-wire them without explicit new instruction.
---

# SCENE + IMAGE + ANIM retired

On 2026-07-06 the user explicitly ordered all three removed **permanently**:
`[[SCENE:]]` (Sonnet-authored HTML/CSS/JS animation via `/api/v4/scene`),
`[[ANIM]]` (legacy Gemini HTML/CSS/JS animation), and the generated-infographic
`[[IMAGE:]]` pipeline (fal.ai FLUX → Pollinations → SVG poster). A user-accepted
gap exists until replacement VIZ templates (`sequence_flow`, `array_trace`) are
built later — do not treat the gap as a bug to silently "fix" by re-adding the
old mechanisms.

**What was explicitly preserved and must NOT be touched by any related work:**
- `[[PHOTO]]` (real web-photo attachment) — fully independent, untouched.
- The VIZ system (`registry.ts`, `buildVizCatalogLayer`, FE VIZ renderer).
- `runV4PaidWork` (shared billing helper) — only the SCENE *route* was deleted,
  not the helper (still used by other paid endpoints).

**Removal shape (for anyone auditing or extending this later):**
- Backend: SCENE/ANIM layer builders deleted from `v4-teaching-core.ts`;
  `/api/v4/scene` route deleted entirely; `v4-scene-store.ts` deleted; the v4
  `emitVisual` for `kind==="image"` now unconditionally drops (never generates).
  In the **legacy** `/subject` path (`routes/ai.ts`), image generation was
  intentionally **dead-capped via flags** (`__imageEnabled=false`,
  `MAX_IMAGES_PER_REPLY=0`) rather than structurally removed — `image-generation.ts`
  and its imports still exist there on purpose (minimal-footprint plan); it is
  correct to see those imports remain in `ai.ts`.
- Frontend (`v4-lesson.tsx`): `expandAnimTags`/`expandSceneTags` are now pure
  stripping regexes (no mount-div generation, no iframe hydration effects);
  `scene-stepper.tsx` component deleted; DOMPurify no longer allows
  `data-anim-*`/`data-scene-*` attributes.
- The render-pipeline ordering docs (`teacher-render-pipeline-order.md`,
  `code-identifier-latinization.md`) were updated to say ANIM/SCENE are
  stripped (not expanded into attributes) — only VIZ still does attribute
  encoding before fence-normalize/latinize.
- Disk cache dirs removed: `artifacts/api-server/data/v4-scenes/`.

**Why this matters for future work:** several older memory topic files
(`teacher-anim-sandbox.md`, `scene-svg-illustrations.md` — now deleted) and the
`teacher-image-reliability.md` topic describe the OLD live mechanisms in detail
(sandboxing rules, prompt/caching quality levers, provider fallback chains).
That security/architecture detail is historically useful if the feature is ever
reinstated, but the mechanisms themselves are gone from the running code as of
this date — do not assume they are active, and do not re-wire them based on
old prompt-generation scripts or stale UI copy without a fresh explicit request.
