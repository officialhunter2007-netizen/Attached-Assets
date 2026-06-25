/**
 * AI-teacher provider resolver.
 *
 * Single source of truth for the admin-configurable teaching provider.
 * The v4 smart teacher (teaching chat + lesson-content generation) calls
 * `getTeacherProviderOverride()` before every AI request:
 *
 *   - returns a concrete { baseUrl, apiKey, model } when the admin has
 *     enabled a custom OpenAI-compatible provider AND the named env var
 *     actually holds a key;
 *   - returns null otherwise, in which case the caller keeps its existing
 *     default behaviour (OpenRouter + gemini-2.0-flash). This guarantees
 *     zero breakage when the feature is unconfigured.
 *
 * SECURITY: the API key is read from process.env by NAME. The key value is
 * never stored in the database — only the env-var name (e.g. FREEMODEL_API_KEY).
 */

import { db, aiTeacherProviderSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type TeacherProviderOverride = {
  /** Normalised chat-completions endpoint (always ends with /chat/completions). */
  endpoint: string;
  /** Raw base URL as the admin entered it (for display/diagnostics). */
  baseUrl: string;
  /** The resolved API key (from process.env[apiKeyEnv]). */
  apiKey: string;
  /** The model id passed verbatim to the provider. */
  model: string;
  /** The env-var name the key came from (for logs — never the value). */
  apiKeyEnv: string;
};

export type TeacherProviderStatus = {
  enabled: boolean;
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  /** True when process.env[apiKeyEnv] holds a non-empty value. */
  keyPresent: boolean;
  /** Last 4 chars of the key when present — safe to render in admin. */
  keyTail: string;
  /** True when enabled + all fields set + key present (i.e. will be used). */
  active: boolean;
  updatedAt: string | null;
};

/**
 * Build the chat-completions endpoint from a base URL the admin typed.
 * Accepts forms like:
 *   https://api.freemodel.dev/v1
 *   https://api.freemodel.dev/v1/
 *   https://api.freemodel.dev/v1/chat/completions
 */
export function normaliseEndpoint(baseUrl: string): string {
  let b = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!b) return "";
  if (/\/chat\/completions$/i.test(b)) return b;
  return `${b}/chat/completions`;
}

// ─── In-process cache (30 s TTL) ────────────────────────────────────────────
// Without this, every single teaching turn hits the DB just to read one row.
// The cache is invalidated immediately when the admin saves new settings via
// `invalidateTeacherProviderCache()`, so changes take effect right away.
type CachedRow = Awaited<ReturnType<typeof _readSettingsRowFromDB>>;
let _cachedRow: CachedRow | undefined;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

/** Call this from the PUT /admin/ai-teacher-provider route after a save. */
export function invalidateTeacherProviderCache(): void {
  _cachedRow = undefined;
  _cacheExpiresAt = 0;
}

async function _readSettingsRowFromDB() {
  try {
    const rows = await db
      .select()
      .from(aiTeacherProviderSettingsTable)
      .where(eq(aiTeacherProviderSettingsTable.id, 1))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    // Table may not exist yet on a brand-new DB before auto-migrate runs.
    logger.warn?.({ err: String(e) }, "[ai-teacher-provider] settings read failed");
    return null;
  }
}

async function readSettingsRow() {
  const now = Date.now();
  if (_cachedRow !== undefined && now < _cacheExpiresAt) {
    return _cachedRow;
  }
  const row = await _readSettingsRowFromDB();
  _cachedRow = row;
  _cacheExpiresAt = now + CACHE_TTL_MS;
  return row;
}

/**
 * Returns the active custom provider, or null to use the default channel.
 * Never throws — any failure degrades gracefully to the default channel.
 */
export async function getTeacherProviderOverride(): Promise<TeacherProviderOverride | null> {
  const row = await readSettingsRow();
  if (!row || !row.enabled) return null;

  const baseUrl = String(row.baseUrl || "").trim();
  const apiKeyEnv = String(row.apiKeyEnv || "").trim();
  const model = String(row.model || "").trim();
  if (!baseUrl || !apiKeyEnv || !model) return null;

  const endpoint = normaliseEndpoint(baseUrl);
  if (!endpoint) return null;

  const apiKey = String(process.env[apiKeyEnv] || "").trim();
  if (!apiKey) {
    // Enabled but the key is missing from .env — fall back rather than
    // hard-fail, so the teacher keeps working on the default channel.
    logger.warn?.(
      { apiKeyEnv },
      "[ai-teacher-provider] custom provider enabled but env key missing — falling back to default channel",
    );
    return null;
  }

  return { endpoint, baseUrl, apiKey, model, apiKeyEnv };
}

/** Admin-facing status (never exposes the key value). */
export async function getTeacherProviderStatus(): Promise<TeacherProviderStatus> {
  const row = await readSettingsRow();
  const enabled = !!row?.enabled;
  const baseUrl = String(row?.baseUrl || "");
  const apiKeyEnv = String(row?.apiKeyEnv || "");
  const model = String(row?.model || "");
  const keyVal = apiKeyEnv ? String(process.env[apiKeyEnv] || "").trim() : "";
  const keyPresent = keyVal.length > 0;
  const keyTail = keyPresent && keyVal.length >= 4 ? keyVal.slice(-4) : "";
  const active = enabled && !!baseUrl && !!apiKeyEnv && !!model && keyPresent;
  return {
    enabled,
    baseUrl,
    apiKeyEnv,
    model,
    keyPresent,
    keyTail,
    active,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
