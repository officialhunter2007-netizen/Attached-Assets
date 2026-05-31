import { createHmac, timingSafeEqual, randomBytes } from "crypto";

// Phase 3 hardening — server-issued exam-attempt tokens. The original design
// (HMAC over arbitrary client-supplied {uid, sid, envHash}) was insufficient
// because the client picks both the envHash and the reported mastery, so a
// motivated attacker with devtools could mint a token for any envHash and
// then forge a report claiming 100% mastery. The new design closes that
// loop: the server runs the canonical exam attempt (lab-exam-store.ts),
// counts submissions itself, and at finalize time signs a mastery token
// whose payload INCLUDES the server-computed `avg` mastery score. The
// teacher prompt only honors `[MASTERY_VERIFIED: true]` reports, and the
// avgMastery the model sees comes from the signed payload — not the
// human-readable "متوسط الإتقان" line a forged client could lie about.

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production for lab-exam tokens");
  }
  // eslint-disable-next-line no-console
  console.warn(
    "[lab-exam-token] SESSION_SECRET is not set — using an insecure development fallback. " +
      "Set SESSION_SECRET in any non-local environment.",
  );
}

const SECRET = process.env.SESSION_SECRET ?? "nukhba-dev-only-insecure-fallback";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type MasteryTokenPayload = {
  /** Opaque server attempt id this token finalizes. */
  aid: string;
  /** Owning user. */
  uid: number;
  /** Owning subject. */
  sid: string;
  /** Server-canonical avg mastery percentage 0-100. */
  avg: number;
  /** Total submissions the server observed. */
  ts: number;
  /** Total failed submissions the server observed. */
  tf: number;
  /** Issued-at (ms). */
  iat: number;
};

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(normalized, "base64");
}

export function signMasteryToken(payload: Omit<MasteryTokenPayload, "iat">): string {
  const full: MasteryTokenPayload = { ...payload, iat: Date.now() };
  const json = JSON.stringify(full);
  const data = b64urlEncode(Buffer.from(json, "utf8"));
  const sig = b64urlEncode(createHmac("sha256", SECRET).update(`mastery.${data}`).digest());
  return `${data}.${sig}`;
}

export function verifyMasteryToken(
  token: string,
): { ok: true; payload: MasteryTokenPayload } | { ok: false; reason: string } {
  if (typeof token !== "string") return { ok: false, reason: "not-string" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "shape" };
  const [data, sig] = parts;
  if (!data || !sig) return { ok: false, reason: "shape" };
  const expectedSig = b64urlEncode(createHmac("sha256", SECRET).update(`mastery.${data}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "sig" };
  let parsed: MasteryTokenPayload;
  try {
    parsed = JSON.parse(b64urlDecode(data).toString("utf8"));
  } catch {
    return { ok: false, reason: "json" };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "shape" };
  if (typeof parsed.aid !== "string" || !parsed.aid) return { ok: false, reason: "aid" };
  if (typeof parsed.uid !== "number") return { ok: false, reason: "uid" };
  if (typeof parsed.sid !== "string") return { ok: false, reason: "sid" };
  if (typeof parsed.avg !== "number" || parsed.avg < 0 || parsed.avg > 100) {
    return { ok: false, reason: "avg" };
  }
  if (typeof parsed.iat !== "number") return { ok: false, reason: "iat" };
  if (Date.now() - parsed.iat > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true, payload: parsed };
}

export function newAttemptId(): string {
  // 16 random bytes → 22-char base64url. Long enough to be unguessable.
  return b64urlEncode(randomBytes(16));
}
