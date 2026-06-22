---
name: v4 subscription grace window (grace = 0)
description: Why there is NO grace window after a paid v4 sub expires, and why the inclusive boundary was kept. Read before touching V4_GRACE_DAYS, expiry checks, carryover, or the welcome-gift trial.
---

# v4 subscription grace = 0 (no free days after expiry)

`V4_GRACE_DAYS = 0`. A paid v4 subscription ends at `expires_at` with no extra
free days. The grace logic is intact but degenerates cleanly: `insideGrace`
collapses onto `insideWindow`, and the charge pre-gate / drain SQL / carryover /
expiry sweep all key off the same constant — so re-enabling grace = bump that one
value (no logic rewrite).

**Why:** product decision — the platform owner does NOT want free days after a
subscription lapses; the one-time **global 150-gem welcome gift** is the student's
trial instead.

**Non-obvious (don't break this):** the welcome-gift wallet expiry uses
`V4_SUB_DURATION_DAYS` (30 days), NOT grace. So setting grace to 0 does **not**
shorten the trial — the 150 gems still live 30 days. Never wire the welcome-gift
expiry to `V4_GRACE_DAYS`.

**Deliberate non-change — inclusive `<=` boundary:** the live/charge/carryover
checks use `now <= expiresAt` (inclusive), so at the exact `now === expiresAt`
millisecond usage is still allowed. An architect review flagged this as not
"strictly expired at the instant." It was left as-is on purpose: the boundary is a
single negligible millisecond (not "free days"), it is the pre-existing convention,
and flipping ~6 comparison sites from `<=` to `<` (plus the sweep from `<` to `<=`)
is more risk than the benefit. Do NOT "fix" the operator without a concrete reason.
