// User-scoped localStorage helpers.
// CRITICAL: every key written to localStorage must include the current user's id
// so data does NOT leak between accounts on the same browser.

const PREFIX = "nukhba::";

function safeUserId(userId: string | undefined | null): string | null {
  if (!userId) return null;
  return String(userId);
}

/**
 * Build a fully-scoped storage key. Returns null if there is no user
 * (caller must skip read/write entirely in that case).
 */
export function userKey(userId: string | undefined | null, suffix: string): string | null {
  const uid = safeUserId(userId);
  if (!uid) return null;
  return `${PREFIX}u:${uid}::${suffix}`;
}

/**
 * Read a JSON-encoded value from localStorage scoped to the user.
 * Returns `fallback` if there is no user, no value, or parsing fails.
 */
export function readUserJson<T>(userId: string | undefined | null, suffix: string, fallback: T): T {
  const k = userKey(userId, suffix);
  if (!k) return fallback;
  try {
    const raw = localStorage.getItem(k);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeUserJson(userId: string | undefined | null, suffix: string, value: unknown): void {
  const k = userKey(userId, suffix);
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify(value)); } catch {}
}

export function removeUserKey(userId: string | undefined | null, suffix: string): void {
  const k = userKey(userId, suffix);
  if (!k) return;
  try { localStorage.removeItem(k); } catch {}
}

/**
 * Clear EVERY nukhba-related localStorage entry, regardless of user.
 * Called on logout to make sure nothing leaks between accounts.
 * Also clears any legacy keys (older versions used non-prefixed names like
 * `nukhba-chat-…`, `nukhba-ide-files-v3`, `nukhba-scenario-…`).
 */
export function clearAllNukhbaStorage(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(PREFIX) || k.startsWith("nukhba-") || k.startsWith("nukhba::")) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {}
}

/**
 * Track which user the browser was last used by; if it changes (e.g. user
 * logged out and someone else logged in), wipe all per-user storage as a
 * safety net even if a key was forgotten somewhere.
 */
const LAST_USER_KEY = "nukhba::last-user-id";

export function rotateUserIfChanged(userId: string | undefined | null): void {
  try {
    const uid = safeUserId(userId) || "";
    const prev = localStorage.getItem(LAST_USER_KEY) || "";
    if (uid && prev && prev !== uid) {
      // Different user on this browser — wipe everything from the previous account.
      clearAllNukhbaStorage();
    }
    if (uid) localStorage.setItem(LAST_USER_KEY, uid);
  } catch {}
}
