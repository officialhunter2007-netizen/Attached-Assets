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
- Global `mermaid.initialize({ theme: "base", themeVariables: {...} })` — NOT `theme: "dark"`. Mermaid's built-in "dark" preset ignores most custom `themeVariables` overrides (ships its own hardcoded palette); "base" is the only preset that fully honors a custom `themeVariables` object, which is required to make diagrams match the app's gold/emerald dark-luxury theme (primary/secondary/tertiary, sequence actor/signal/note colors, pie1-8, edge/line/title colors, transparent background).
- Per-diagram `style`/`classDef`/`init` blocks the AI writes still take precedence over the global themeVariables baseline, so semantic node coloring (e.g. red=attacker, blue=victim) survives regardless.
- Rendering errors are caught locally inside the component's effect (mermaid.render is async) — never let them throw during React render, since the VIZ mount path (`v4-lesson.tsx`/`subject.tsx`) has no error boundary around `createRoot(el).render(...)` and would crash the whole message.
- Trigger-case prompt guidance needs explicit bulleted scenario examples (program logic/algorithm flow, mechanism/system workflow, object lifecycle, protocol/message exchange, decision-branch comparison, setup steps, cause→effect chains, concept classification via mindmap, timelines, resource/percentage distribution via pie) — a generic "use diagrams when helpful" instruction under-triggers; models need concrete scenario→diagram-type mappings to invoke broadly. Keep the existing per-reply cap (e.g. 3) to avoid clutter even as trigger coverage widens.
- Common mermaid syntax trap when authoring Arabic test fixtures: literal double-quotes inside a flowchart node label (e.g. `C[اطبع "موجب"]`) breaks the parser ("Expecting ... got STR") — the AI teacher must avoid embedding `"` inside node/edge label text.

## Environment gotcha: pnpm workspace add
`pnpm add <pkg>` from the repo root in this monorepo fails with `ERR_PNPM_ADDING_TO_ROOT` (blocked by a lockfile setting). The install-packages tool call hits the same wall since it also runs from root.
**How to apply:** for any package needed by a specific workspace member (e.g. `artifacts/nukhba`), run `pnpm --filter @workspace/<name> add <pkg>` directly via bash instead of the generic package-install tool.
**Related gotcha:** adding a dependency directly to a workspace member's `package.json` (by hand) and running plain `npm install` inside that folder does NOT link it into the pnpm-managed `node_modules` — the package resolves in `node_modules/.pnpm/<pkg>` but Vite's import-analysis still 500s with "Failed to resolve import". Fix: run `pnpm install --filter @workspace/<name>` from the repo root instead, which properly symlinks it.

## Mockup-sandbox screenshot gotcha
The `screenshot(type=app_preview, path=...)` tool defaults to port 5000 (the main app), which does NOT dev-proxy `/__mockup/*` — hitting it returns the MAIN app's own SPA 404 page (easy to mistake for a mockup-plugin routing failure). The mockup-sandbox dev server runs on its own PORT (check with `ps`/`/proc/<pid>/environ`, commonly 8081) with a required `BASE_PATH` env var (e.g. `/__mockup`) baked into its router. Correct call: pass BOTH the actual `port` param AND a `path` prefixed with that `BASE_PATH`, e.g. `path="/__mockup/preview/<folder>/<Component>", port=8081`.
