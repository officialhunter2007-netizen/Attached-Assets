import { createHmac, timingSafeEqual } from "crypto";

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  // Loud warning so a missing secret in dev/staging is impossible to ignore.
  // Any non-local environment must set SESSION_SECRET explicitly.
  // eslint-disable-next-line no-console
  console.warn(
    "[session] SESSION_SECRET is not set — using an insecure development fallback. " +
      "Set SESSION_SECRET in any non-local environment.",
  );
}

const SECRET = process.env.SESSION_SECRET ?? "nukhba-dev-only-insecure-fallback";

export type SessionPayload = { userId?: number };

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const normalized = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(normalized, "base64");
}

export function signSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const data = b64urlEncode(Buffer.from(json, "utf8"));
  const sig = b64urlEncode(createHmac("sha256", SECRET).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expectedSig = createHmac("sha256", SECRET).update(data).digest();
  const tokenSig = b64urlDecode(sig);

  if (expectedSig.length !== tokenSig.length || !timingSafeEqual(expectedSig, tokenSig)) {
    return null;
  }

  try {
    const json = b64urlDecode(data).toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed as SessionPayload;
    return null;
  } catch {
    return null;
  }
}
