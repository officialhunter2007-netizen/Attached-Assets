// ─────────────────────────────────────────────────────────────────────────────
// v4-instruction-cache.ts — short-lived server cache of a just-validated /
// just-autofixed instruction doc, keyed by an opaque token.
//
// Why: a 70MB instruction file is gzipped in the browser, uploaded, inflated,
// JSON-parsed and Zod-validated on EVERY click. The old flow did that twice
// (validate, then publish — which re-validated internally). This cache lets
// validate/autofix do the heavy parse+validate ONCE, hand back a tiny token,
// and lets publish run straight from the cached (already Zod-parsed) doc — no
// re-upload of 70MB, no re-inflate, no re-parse, no re-validate.
//
// We store `report.parsed` (the Zod-coerced doc the normalizer inserts from),
// not the raw upload. Capacity is tiny (admin publishes one file at a time)
// and TTL short, because each parsed doc can be a few hundred MB in memory.
// ─────────────────────────────────────────────────────────────────────────────
import { randomBytes } from "crypto";
import type { V4ValidationReport } from "./v4-instruction-validator";

type Entry = { token: string; parsed: any; report: V4ValidationReport; ts: number };

const TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for "validate → publish".
const CAP = 2;                 // most-recent two (one in flight + a spare).

const store = new Map<string, Entry>();

function sweep(): void {
  const now = Date.now();
  for (const [k, e] of store) if (now - e.ts > TTL_MS) store.delete(k);
  while (store.size > CAP) {
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    for (const [k, e] of store) if (e.ts < oldestTs) { oldestTs = e.ts; oldestKey = k; }
    if (oldestKey) store.delete(oldestKey); else break;
  }
}

/** Cache a validated/coerced doc; returns an opaque token for publish. */
export function cacheValidatedDoc(parsed: any, report: V4ValidationReport): string {
  sweep();
  const token = randomBytes(12).toString("hex");
  store.set(token, { token, parsed, report, ts: Date.now() });
  sweep();
  return token;
}

/** Look up a cached doc by token (null if missing/expired). */
export function getValidatedDoc(token: string): Entry | null {
  if (!token) return null;
  const e = store.get(token);
  if (!e) return null;
  if (Date.now() - e.ts > TTL_MS) { store.delete(token); return null; }
  return e;
}

/** Evict a token (call after a successful publish). */
export function dropValidatedDoc(token: string): void {
  if (token) store.delete(token);
}
