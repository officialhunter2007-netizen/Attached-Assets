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

Pattern lives in `artifacts/api-server/src/routes/v4_admin_instructions.ts` as `requireSameOriginCsrf` — copy it into other route files until a global middleware replaces them all.

The FE must send the matching header on those calls (`X-Nukhba-Csrf: 1`).
