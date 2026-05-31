---
name: VIZ template system (v4 teacher)
description: How interactive [[VIZ: ...]] diagrams flow from teacher prompt to rendered React component, and the contract that must stay in sync.
---

# VIZ template system

The teacher emits `[[VIZ: template=<name>, payload=<JSON>]]` inline. Rendering is a
3-point contract that MUST stay in sync or the diagram silently fails:

1. **Backend catalog** — `VIZ_TEMPLATES` in `v4-teaching-core.ts`: advertises the
   template name + an Arabic payload schema + example to the model. If a name
   isn't here, the teacher won't emit it.
2. **Backend gating** — `pickTemplatesForSpecialty(slug,name)` keyword-matches the
   specialty and returns the allowed template names. **Gotcha:** matching is by
   slug/name keyword; a slug like `uni-it` matched NOTHING and fell back to a lone
   `regex_match`. Any new specialty family needs an explicit keyword branch.
   `specialty.meta.allowed_viz_templates` (v4.1) overrides the keyword defaults.
3. **FE registry + component** — `components/viz/registry.ts` maps the name → a
   React component receiving `{ payload }`. Component prop shape MUST match the
   backend schema keys exactly.

**Why:** the three points are decoupled; adding a template requires editing all
three. DOMPurify already allow-lists `data-viz-*` attrs and the FE renders an
"unknown template" warning if a name has no registry entry, so a missing FE
component degrades gracefully but a schema/prop mismatch renders an empty box.

**How to apply:** when adding a VIZ template — add to VIZ_TEMPLATES, register the
component, and confirm the payload keys line up. When a specialty "has no
diagrams," check pickTemplatesForSpecialty keyword coverage first.
