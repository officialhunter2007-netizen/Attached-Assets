---
name: Mermaid VIZ template — additive, not a replacement
description: Decision record for adding Mermaid.js diagrams to the VIZ system, plus the stepper design and pnpm monorepo install gotcha hit along the way.
---

## Decision: extend VIZ, don't replace it
User proposed a 3-layer architecture (separate Claude "detection" call → JSON → pick Mermaid.js/D3.js/SVG-stepper renderer). Rejected in favor of extending the existing single-model VIZ pipeline (same model that teaches also emits `[[VIZ: template=X, payload=...]]` inline, no second AI call) because:
- A dedicated detection call adds latency + AI cost per visual, conflicting with the platform's cost-cap constraint.
- The existing registry/catalog/mount architecture already does 90% of what was proposed.
**Why:** cost/latency discipline already established for teaching (Gemini Flash Lite only) must extend to any new per-turn AI-visual pipeline, not just the main teaching call.
**How to apply:** when asked to add a new visual/diagram capability, default to adding ONE more VIZ template (registry.ts + VIZ_TEMPLATES entry + pickTemplatesForSpecialty), never a parallel AI-call architecture, unless the user explicitly insists after being shown the cost tradeoff.

## Mermaid template design (`mermaid_diagram`)
Payload = `{ code: string, steps?: string[] }`. `code` is the final valid mermaid source. `steps`, when present, is an array of **independently-valid, cumulative** mermaid sources (each = one more line/message than the last; last entry === `code`). The FE just re-renders `mermaid.render()` on the selected array element — no DOM diffing, no line-level incremental parsing. This works uniformly across sequenceDiagram/graph/timeline because the model authors each cumulative snapshot itself.
**Why:** Mermaid's diagram grammars differ too much (sequence messages vs graph edges vs timeline sections) to build one generic "reveal first N lines" algorithm; pushing the cumulative-snapshot burden onto the authoring model sidesteps that entirely.

## Implementation notes
- `mermaid` npm package is lazy-loaded via `await import("mermaid")` inside a module-level singleton promise (not a static top-level import) to avoid bloating the main teacher-chat bundle for users who never trigger a mermaid diagram.
- Global `mermaid.initialize({ theme: "dark", ... })` is only a fallback baseline for diagrams without their own `%%{init}%%` directive — per-diagram `style`/`classDef`/`init` blocks the AI writes always take precedence, so semantic node coloring (e.g. red=attacker, blue=victim) survives regardless of the global theme.
- Rendering errors are caught locally inside the component's effect (mermaid.render is async) — never let them throw during React render, since the VIZ mount path (`v4-lesson.tsx`/`subject.tsx`) has no error boundary around `createRoot(el).render(...)` and would crash the whole message.

## Environment gotcha: pnpm workspace add
`pnpm add <pkg>` from the repo root in this monorepo fails with `ERR_PNPM_ADDING_TO_ROOT` (blocked by a lockfile setting). The install-packages tool call hits the same wall since it also runs from root.
**How to apply:** for any package needed by a specific workspace member (e.g. `artifacts/nukhba`), run `pnpm --filter @workspace/<name> add <pkg>` directly via bash instead of the generic package-install tool.
