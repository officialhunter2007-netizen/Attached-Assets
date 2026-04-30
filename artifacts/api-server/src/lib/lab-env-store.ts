import { randomBytes } from "crypto";

// Phase 3 hardening — server-issued lab-env registry. Closes the
// "/exam/start accepts an arbitrary client-supplied env" attack: a malicious
// student could otherwise POST a trivially-easy env (one form whose answer
// they know), submit it, finalize, and receive a valid HMAC mastery token
// for any subject they have access to. With this registry the only envs an
// exam attempt can be opened against are envs the SERVER itself generated
// (via /ai/lab/build-env or /ai/lab/generate-variant), keyed by an opaque
// envId that's only handed back to the same user.
//
// Like lab-exam-store.ts, this is in-memory only — envIds expire 24h after
// issuance, and a server restart invalidates all of them. The student-facing
// failure mode is "regenerate the env"; we accept this rather than add a DB
// migration just for a rolling cache.

type IssuedEnv = {
  envId: string;
  userId: number;
  subjectId: string;
  /** The validated env snapshot the server will hand to /exam/start. */
  env: any;
  createdAt: number;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 60 * 60 * 1000;
const MAX_ENVS_PER_USER = 32;

const store = new Map<string, IssuedEnv>();
let lastSweepAt = 0;

function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  for (const [id, e] of store.entries()) {
    if (now - e.createdAt > MAX_AGE_MS) store.delete(id);
  }
}

function evictOldestForUser(userId: number): void {
  // Cheap O(N) eviction. With MAX_ENVS_PER_USER=32 and N rarely above the
  // low hundreds across all users, this is fine and avoids a second index.
  const mine: IssuedEnv[] = [];
  for (const e of store.values()) if (e.userId === userId) mine.push(e);
  if (mine.length < MAX_ENVS_PER_USER) return;
  mine.sort((a, b) => a.createdAt - b.createdAt);
  const toDrop = mine.length - MAX_ENVS_PER_USER + 1;
  for (let i = 0; i < toDrop; i++) store.delete(mine[i].envId);
}

export function newEnvId(): string {
  return randomBytes(16).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function rememberIssuedEnv(p: {
  envId: string;
  userId: number;
  subjectId: string;
  env: any;
}): void {
  maybeSweep();
  evictOldestForUser(p.userId);
  store.set(p.envId, {
    envId: p.envId,
    userId: p.userId,
    subjectId: p.subjectId,
    env: p.env,
    createdAt: Date.now(),
  });
}

export function getIssuedEnv(envId: string, userId: number, subjectId: string): IssuedEnv | null {
  if (typeof envId !== "string" || !envId) return null;
  const e = store.get(envId);
  if (!e) return null;
  if (e.userId !== userId) return null;
  if (e.subjectId !== subjectId) return null;
  if (Date.now() - e.createdAt > MAX_AGE_MS) {
    store.delete(envId);
    return null;
  }
  return e;
}

// ── Single-use mastery-token registry ────────────────────────────────────
// Tracks which mastery-token attempt-ids (`aid`) have already been honored
// by /ai/teach so a student can't replay one valid token across multiple
// [LAB_REPORT] submissions to advance unrelated stages in the same subject
// during the token's 8h TTL. First verification consumes the aid; later
// verifications return false even when the HMAC is valid.

const consumedTokens = new Map<string, number>();
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
let lastTokenSweepAt = 0;

function maybeSweepTokens(): void {
  const now = Date.now();
  if (now - lastTokenSweepAt < SWEEP_EVERY_MS) return;
  lastTokenSweepAt = now;
  for (const [aid, t] of consumedTokens.entries()) {
    if (now - t > TOKEN_TTL_MS) consumedTokens.delete(aid);
  }
}

/** Atomically consume an attempt-id. Returns true on first call, false on every replay. */
export function consumeAttemptToken(aid: string): boolean {
  if (typeof aid !== "string" || !aid) return false;
  maybeSweepTokens();
  if (consumedTokens.has(aid)) return false;
  consumedTokens.set(aid, Date.now());
  return true;
}
