import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString("hex");
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return false;
    const [, nStr, rStr, pStr, salt, hash] = parts;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    let computed: Buffer;
    try {
      computed = scryptSync(password, salt, SCRYPT_KEYLEN, { N, r, p });
    } catch {
      return false;
    }
    const expected = Buffer.from(hash, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  }

  // Legacy sha256 format: "salt:hash"
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const hash = stored.slice(colonIdx + 1);
  const computed = createHash("sha256").update(password + salt).digest("hex");
  if (computed.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export function isLegacyPasswordHash(stored: string): boolean {
  return !!stored && !stored.startsWith("scrypt$");
}

export function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function generateActivationCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}
