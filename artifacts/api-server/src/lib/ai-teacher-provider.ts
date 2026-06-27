/**
 * AI-teacher provider resolver.
 *
 * Single source of truth for the admin-configurable teaching provider.
 * The v4 smart teacher (teaching chat + lesson-content generation) calls
 * `getTeacherProviderOverride()` before every AI request:
 *
 *   1. OpenRouter Model Override (model picker): when `orModelOverride` is set
 *      to one of the allowed slugs (gemini-2.5-flash / claude-haiku-4-5), the
 *      teacher uses that model via the same OPENROUTER_API_KEY — no extra
 *      config needed. This is the primary switch for the admin.
 *
 *   2. Custom Provider (advanced): when `enabled` + baseUrl + apiKeyEnv + model
 *      are all set, the teacher routes calls to that OpenAI-compatible endpoint.
 *      Useful for self-hosted or alternative providers.
 *
 *   - returns a concrete { baseUrl, apiKey, model } when either of the above
 *     applies; returns null otherwise to use the default channel.
 *
 * SECURITY: API keys are read from process.env by NAME. Key values are never
 * stored in the database — only the env-var name (e.g. OPENROUTER_API_KEY).
 */

import { db, aiTeacherProviderSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type TeacherProviderOverride = {
  /** Normalised chat-completions endpoint (always ends with /chat/completions). */
  endpoint: string;
  /** Raw base URL as entered (for display/diagnostics). */
  baseUrl: string;
  /** The resolved API key (from process.env[apiKeyEnv]). */
  apiKey: string;
  /** The model id passed verbatim to the provider (full OpenRouter slug). */
  model: string;
  /** The env-var name the key came from (for logs — never the value). */
  apiKeyEnv: string;
};

export type TeacherProviderStatus = {
  /** Which OpenRouter model is selected via the model picker. Empty = default. */
  orModelOverride: string;
  /** Human-readable label for the active model (for the status banner). */
  activeModelLabel: string;
  enabled: boolean;
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  /** True when process.env[apiKeyEnv] holds a non-empty value. */
  keyPresent: boolean;
  /** Last 4 chars of the key when present — safe to render in admin. */
  keyTail: string;
  /** True when a custom provider will be used (OR model override OR custom provider). */
  active: boolean;
  updatedAt: string | null;
};

/**
 * Allowed OpenRouter model slugs for the model picker.
 * Key = slug stored in DB. Value = display label.
 * Empty string = default (gemini-2.5-flash-lite, no override needed).
 */
export const OR_PICKER_MODELS: Record<string, string> = {
  "": "Gemini 2.5 Flash Lite (الافتراضي)",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "anthropic/claude-haiku-4-5": "Claude Haiku 4.5",
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_BASE_URL  = "https://openrouter.ai/api/v1";

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
 *
 * Priority order:
 *   1. OR model override (model picker) — uses OPENROUTER_API_KEY + selected model.
 *   2. Custom provider (advanced) — uses admin-configured endpoint + env key.
 *   3. null → default channel (OpenRouter + gemini-2.5-flash-lite).
 */
export async function getTeacherProviderOverride(): Promise<TeacherProviderOverride | null> {
  const row = await readSettingsRow();

  // ── 1. OpenRouter model picker override ─────────────────────────────────
  const orModelOverride = String(row?.orModelOverride || "").trim();
  if (orModelOverride && orModelOverride in OR_PICKER_MODELS) {
    // Non-empty + valid slug → use OpenRouter with the selected model
    const apiKey = String(process.env["OPENROUTER_API_KEY"] || "").trim();
    if (!apiKey) {
      logger.warn?.(
        { orModelOverride },
        "[ai-teacher-provider] OR model override set but OPENROUTER_API_KEY missing — falling back to default",
      );
      return null;
    }
    return {
      endpoint: OPENROUTER_ENDPOINT,
      baseUrl: OPENROUTER_BASE_URL,
      apiKey,
      model: orModelOverride,
      apiKeyEnv: "OPENROUTER_API_KEY",
    };
  }

  // ── 2. Custom provider (advanced) ───────────────────────────────────────
  if (!row || !row.enabled) return null;

  const baseUrl  = String(row.baseUrl  || "").trim();
  const apiKeyEnv = String(row.apiKeyEnv || "").trim();
  const model    = String(row.model    || "").trim();
  if (!baseUrl || !apiKeyEnv || !model) return null;

  const endpoint = normaliseEndpoint(baseUrl);
  if (!endpoint) return null;

  const apiKey = String(process.env[apiKeyEnv] || "").trim();
  if (!apiKey) {
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
  const orModelOverride = String(row?.orModelOverride || "").trim();
  const activeModelLabel = OR_PICKER_MODELS[orModelOverride] ?? OR_PICKER_MODELS[""];
  const enabled   = !!row?.enabled;
  const baseUrl   = String(row?.baseUrl   || "");
  const apiKeyEnv = String(row?.apiKeyEnv || "");
  const model     = String(row?.model     || "");
  const keyVal    = apiKeyEnv ? String(process.env[apiKeyEnv] || "").trim() : "";
  const keyPresent = keyVal.length > 0;
  const keyTail   = keyPresent && keyVal.length >= 4 ? keyVal.slice(-4) : "";
  // active = OR model override is set to a non-default valid slug, OR custom provider is fully configured
  const orActive  = !!(orModelOverride && orModelOverride in OR_PICKER_MODELS);
  const custActive = enabled && !!baseUrl && !!apiKeyEnv && !!model && keyPresent;
  const active = orActive || custActive;
  return {
    orModelOverride,
    activeModelLabel,
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
