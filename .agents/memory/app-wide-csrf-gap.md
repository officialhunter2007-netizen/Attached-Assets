---
name: App-wide CSRF gap in api-server
description: Cookie-auth + open CORS + SameSite=none means every admin mutating endpoint needs a local CSRF guard.
---

## The gap
`artifacts/api-server/src/app.ts` enables:

- `cors({ origin: true, credentials: true })` — reflects any Origin and accepts credentials.
- Session cookie is set with `sameSite: isProd ? "none" : "lax"`.

Together this means a malicious page can issue authenticated POST/DELETE requests against any admin endpoint as long as the admin's session cookie is live. Classic CSRF.

**Why:** The CORS + cookie config predates v4 and is depended on by every admin tab and the FE. Fixing it globally (Origin allowlist + custom-header requirement + SameSite=lax) is a project-wide security pass that the user has not yet authorized.

## How to apply (until the global fix lands)
For any new admin mutating endpoint (POST/PUT/PATCH/DELETE), add a local middleware that requires:

1. A custom request header that simple cross-site forms cannot add (e.g. `X-Nukhba-Csrf: 1`). This is the strong defense — browsers must preflight to send custom headers cross-origin.
2. `Origin` (or `Referer`) host equals the request `Host`. Belt-and-suspenders.

Pattern lives in `artifacts/api-server/src/routes/v4_admin_instructions.ts` / `v4_path.ts` as `requireSameOriginCsrf` — copy it into other route files until a global middleware replaces them all.

The FE must send the matching header on those calls (`X-Nukhba-Csrf: 1`).

## Trap: the guard is copy-pasted per file and they DIVERGE
`requireSameOriginCsrf` is NOT shared — each route file has its own copy, and they are not identical. `subscriptions.ts` historically had a **header-only** version (checked `X-Nukhba-Csrf` but skipped the Origin/Referer host check) despite the same name — a misnomer that left every admin mutating endpoint in that file (approve/reject/card-create/plan-prices/refund-gems/v4 wallet adjust) protected by header alone. The `v4_path.ts` copy is the complete one (header **plus** `Origin`/`Referer` host == `Host`).

**How to apply:** When you touch or add a mutating endpoint, do not trust the local `requireSameOriginCsrf` by name — read its body and confirm it does BOTH checks. Bring weak copies up to the v4_path.ts version (both checks) rather than assuming the name guarantees behavior.
