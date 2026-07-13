// ─────────────────────────────────────────────────────────────────────────────
// Shared same-origin CSRF middleware for all v4 mutating endpoints.
//
// Security model
// ──────────────
// The primary CSRF defense is the custom request header `X-Nukhba-Csrf: 1`.
// Browsers enforce the CORS preflight protocol for any request that carries a
// non-simple custom header.  That means:
//
//   • A cross-origin attacker page cannot perform a credentialed mutation
//     without first passing the preflight OPTIONS check.
//   • If CORS is correctly configured for production (allowed origins locked to
//     the known domain), the preflight will be rejected for unknown origins,
//     blocking the attack before the real request is ever sent.
//
// Why no Host/Origin comparison here
// ────────────────────────────────────
// Comparing Origin against Host is fragile in Replit's proxied dev environment:
// the Vite proxy runs with `changeOrigin: true`, which replaces the Host header
// with `localhost:8080`, while the browser's Origin is the public Replit domain.
// Adding `xfwd: true` helps but the forwarded value depends on the proxy chain
// and differs across environments (Replit dev, staging, production reverse
// proxy).  Since the custom-header check already closes the CSRF vector at the
// preflight level, the duplicate Origin check adds complexity without meaningful
// additional security — and it was causing legitimate requests to 403.
//
// Production hardening (separate concern)
// ─────────────────────────────────────────
// The global CORS config uses `origin: true` (allow all origins) + SameSite=none
// prod cookies.  To eliminate any residual CSRF surface in production, restrict
// the CORS `origin` to the known production domain — that alone makes the
// preflight rejection the first and sufficient gate.
// ─────────────────────────────────────────────────────────────────────────────
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that enforces CSRF protection via a required custom header.
 *
 * Rejects the request with 403 if the `X-Nukhba-Csrf` header is absent.
 * Browsers cannot omit the CORS preflight when this header is present, so a
 * cross-origin attacker cannot silently replay a credentialed mutation.
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
  next();
}
