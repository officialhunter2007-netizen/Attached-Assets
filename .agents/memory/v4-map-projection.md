---
name: v4 map is a pure projection + SSE partial-update gap
description: How the v4 student map page derives state, and which fields go stale on live SSE updates.
---

# v4 map (`/specialty/:slug/map`) is a pure projection

The map route (`GET /v4/path/:slug/map`) renders state, it never mutates
gating/progress/charging. Node statuses are derived from the unlocked set +
completion rows + exam attempts. The optional `?level=N` param only changes
*which* level is read and rendered; it is validated against the version's levels
and falls back to the student's real current level. There are two distinct level
indices that must not be conflated:

- **realCurrentLevelIndex** — the student's actual position (first segment of
  `currentLessonCode`, fallback `startingLevelIndex`). Drives the "you are here"
  marker, the `levels[]` rail status (completed/current/upcoming), and `nextLevels`.
- **viewedLevelIndex** — the level currently being browsed (from `?level`). Drives
  which stages/units/lessons/labs/exam are fetched and the level header/`levelTest`
  code. `currentLevelIndex` in the response intentionally equals the *viewed* level
  for backward compat with existing header UI.

**How to apply:** any new map behavior must keep `?level` read-only — never route
it into wallet/charge/unlock helpers. When adding a field that depends on real
progress vs. browsed level, pick the right index deliberately.

# SSE partial-update gap (non-blocking, self-healing)

The map's EventSource handler applies `node_completed` / `nodes_unlocked` by
mutating only the **visible nodes** + `studentPath` in place. It does NOT
recompute the full-projection fields (`levels[]`, `realCurrentLevelIndex`,
`nextLevels`). So if a student crosses a level boundary in another tab, the level
rail / "you are here" marker can show stale status until a full GET refetch fires
(SSE reconnect, component remount, or reload).

**Why:** the SSE updaters are incremental immutable patches over the loaded map,
not a re-fetch, to avoid tearing down the view on every event. The full-projection
fields are only computed server-side per GET.

**How to apply:** if you ever need the rail/real-level marker to update live on a
boundary crossing, trigger a full refetch (`mapUrl(viewedLevelRef.current)`) when
`nodes_unlocked.nextLessonCode`'s level segment exceeds the current
`realCurrentLevelIndex` — don't try to patch the projection fields incrementally.
