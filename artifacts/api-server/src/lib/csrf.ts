// ─────────────────────────────────────────────────────────────────────────────
// Shared same-origin CSRF middleware for all v4 mutating endpoints.
//
// Security model
// ──────────────
// The global CORS config uses `origin: true, credentials: true` and production
// cookies are SameSite=none (required for cross-site iframe embeds).  Two
// mitigations together close CSRF:
//
//  1. Custom header  `X-Nukhba-Csrf: 1`  — browsers always preflight custom
//     headers, so a real cross-origin fetch is blocked by the preflight CORS
//     rejection before it reaches this handler.
//
//  2. Origin/Referer comparison — a belt-and-suspenders check that the request
//     origin matches the host the server thinks it is on.
//
// Proxy awareness (Vite dev / production reverse proxy)
// ──────────────────────────────────────────────────────
// When the Vite dev proxy runs with `changeOrigin: true`, it replaces the
// `Host` header with `localhost:8080`, so naively comparing `Host` with
// `Origin` always fails.  The fix: the proxy is configured with `xfwd: true`
// which injects `X-Forwarded-Host` with the real public hostname.  We prefer
// that header over `Host` so the comparison stays meaningful in every
// environment.
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from "express";

/**
 * Resolves the "effective" host the browser believes it's talking to.
 *
 * Priority:
 *  1. `X-Forwarded-Host` (set by Vite proxy with `xfwd:true` and by prod reverse proxies)
 *  2. `Host` (raw header — accurate when there's no proxy in the path)
 *
 * Returns the first element only (comma-separated lists from chained proxies)
 * and lowercases it for case-insensitive comparison.
 */
function effectiveHost(req: Request): string {
  const forwarded = req.headers["x-forwarded-host"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return raw.split(",")[0].trim().toLowerCase();
  }
  return (req.headers.host || "").toLowerCase();
}

/**
 * Express middleware that enforces same-origin CSRF protection.
 *
 * Rejects the request with 403 if:
 *  - The `X-Nukhba-Csrf` custom header is absent, OR
 *  - The request `Origin` / `Referer` host doesn't match the effective host.
 */
export function requireSameOriginCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.headers["x-nukhba-csrf"]) {
    res.status(403).json({ error: "CSRF protection: X-Nukhba-Csrf header required" });
    return;
  }

  const host = effectiveHost(req);
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();

  const sourceHost = origin
    ? (() => { try { return new URL(origin).host; } catch { return ""; } })()
    : referer
      ? (() => { try { return new URL(referer).host; } catch { return ""; } })()
      : "";

  if (!sourceHost || sourceHost !== host) {
    res.status(403).json({ error: "CSRF protection: cross-origin request rejected" });
    return;
  }

  next();
}
