---
name: Multiple WebSocket upgrade handlers on one HTTP server
description: A non-matching-path upgrade handler must return, never socket.destroy() — destroying kills the connection for every other WS route on the same server.
---

When more than one feature registers its own `server.on("upgrade", ...)` listener on the same `http.Server` (e.g. two independent WebSocket features), Node calls **all** registered listeners for every upgrade request, not just the one whose path matches.

A handler that doesn't recognize the request path must `return` and do nothing, leaving the socket untouched for the next listener. If it instead calls `socket.destroy()` (or otherwise writes/closes the socket) on a non-match, it silently kills the connection for every *other* WS route sharing that server — the correct handler never gets a chance to run, and the client just sees a bare socket hang-up with no HTTP response at all (not even a 403/401).

**Why:** discovered when a second WS feature's upgrade handler (matching only its own `/ws/room/*` prefix) called `socket.destroy()` on any other path as a "not for me" cleanup step. This broke an unrelated, fully-correct `/ws/solo-run` handler registered right after it — the client saw a generic connection-error/disconnect message with zero diagnostic signal, because the request never even reached the second handler's own auth/validation logic.

**How to apply:** whenever adding a second (or third) `server.on("upgrade", ...)` listener to an existing HTTP server, audit every existing listener's non-matching-path branch. It must be a no-op `return`, never a destroy/write. Test by directly opening a raw WebSocket connection to a sibling route (bypassing the browser/proxy) — a live server that returns a bare "socket hang up" instead of any HTTP status line (even a 401) is the signature of this bug, not an auth or CORS issue.
