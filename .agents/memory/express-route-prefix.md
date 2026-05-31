---
name: Express route prefix in api-server
description: Why route files in artifacts/api-server must NOT prefix their paths with /api/.
---

## Rule
Route files under `artifacts/api-server/src/routes/*.ts` must define their paths **without** the `/api/` prefix. The prefix is added by the mounting line in `app.ts`:

```ts
app.use("/api", router);
```

## Why
Defining `router.get("/api/admin/v4/specialties", ...)` produces the live URL `/api/api/admin/v4/specialties` — every request hits 404 silently because the wrong path is never matched.

## How to apply
- New route file: paths start with `/admin/...`, `/ai/...`, etc. — never `/api/...`.
- Curl test from the host: hit `/api/<your-path>`. If you get 404 but the file is registered, double-check you didn't double-prefix.
