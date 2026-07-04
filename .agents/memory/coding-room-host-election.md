---
name: Coding Room host election invariant
description: WebSocket host-election must demote the departing host, not just promote the new one, or a reconnecting old host becomes a second host.
---

# Coding Room host election must demote the old host

When the room host's socket disconnects, the election path picks a remaining
joined member and promotes them (DB `role='host', can_write=true` + in-memory).
It MUST also demote the departing host's own member row to
`role='member', can_write=false` in the same pass.

**Why:** the WS upgrade handler treats `member.role === "host"` (and
`host_user_id`) as authoritative, and the REST `/admit` + `/reject` routes check
only the member-row role. If the old host's row stays `role='host'`, a
reconnect after an election yields TWO full hosts (both can kick/admit/permission
/delete; `sendToHost` reaches both; two crowns). The explicit `transfer_host`
handler already demotes correctly — the disconnect-election path was the one that
forgot.

**How to apply:** any host-handover code path (explicit transfer OR
disconnect-driven election) must do promote-new AND demote-old atomically, and
keep the in-memory `client.role`/`canWrite` in sync with the DB write. Guard the
demote with `user_id <> newHost` so a single-candidate edge case can't undo the
promotion.
