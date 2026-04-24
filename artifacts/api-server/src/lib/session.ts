import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "nukhba-secret";

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production");
}

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
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = b64urlEncode(createHmac("sha256", SECRET).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = b64urlDecode(data).toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed as SessionPayload;
    return null;
  } catch {
    return null;
  }
}
