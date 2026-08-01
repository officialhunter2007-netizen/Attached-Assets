---
name: Coding room presence billing
description: How the 1-gem/2-min coding-room charge is secured and kept idempotent
---

Coding rooms bill 1 gem per 2 minutes of presence via a client-called tick endpoint.

**The rule:** a presence-based debit endpoint must verify LIVE WebSocket presence server-side (`isUserOnlineInRoom` in coding-room-ws.ts), never just the durable membership row — plus the shared `requireSameOriginCsrf` (frontend sends `X-Nukhba-Csrf: 1`), plus the `charge.error → 503` fail-closed check.

**Why:** the first implementation trusted `coding_room_members.status='joined'` + no CSRF; with `SameSite=none` cookies and reflective CORS, any page could debit an absent user every bucket. Code review caught it.

**How to apply:** any future time/presence-metered billing (voice minutes, live sessions) needs the same trio: live-presence proof, CSRF header, fail-closed on charge.error. Idempotency = time-bucket in the requestId (`floor(now/120000)`), which also makes reconnects safe.

Wallet selection is automatic (highest positive unexpired balance); zero balance = silent free pass by design, not a bug.
