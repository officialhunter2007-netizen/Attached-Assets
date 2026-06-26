import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Admin-configurable AI provider for the v4 smart teacher ONLY.
 *
 * Singleton row (id = 1). When `enabled` is true AND all of base_url /
 * api_key_env / model are set AND the named env var actually holds a key,
 * the teacher routes its teaching-chat + lesson-content-generation calls
 * through this OpenAI-compatible provider instead of the default
 * OpenRouter + Gemini channel.
 *
 * API keys are NEVER stored here — only the NAME of the env var that holds
 * the key (e.g. "FREEMODEL_API_KEY"). The operator sets the value in .env
 * on the server. This keeps secrets out of the database entirely.
 *
 * When disabled or misconfigured, the teacher silently falls back to the
 * existing OpenRouter + gemini-2.0-flash behaviour, so nothing breaks.
 */
export const aiTeacherProviderSettingsTable = pgTable("ai_teacher_provider_settings", {
  id: integer("id").primaryKey().default(1),
  /**
   * OpenRouter model override (model picker).
   * When set to a non-default slug (e.g. "google/gemini-2.5-flash" or
   * "anthropic/claude-3-5-haiku-20241022"), the teacher uses that model
   * via the same OPENROUTER_API_KEY — no custom provider needed.
   * Empty string = use default (gemini-2.5-flash-lite).
   */
  orModelOverride: text("or_model_override").notNull().default(""),
  /** Master switch — when false, the teacher uses the default channel. */
  enabled: boolean("enabled").notNull().default(false),
  /** OpenAI-compatible base URL, e.g. "https://api.freemodel.dev/v1". */
  baseUrl: text("base_url").notNull().default(""),
  /** NAME of the .env var holding the API key (never the key itself). */
  apiKeyEnv: text("api_key_env").notNull().default(""),
  /** Exact model id the provider expects, e.g. "gpt-4o-mini". */
  model: text("model").notNull().default(""),
  updatedByUserId: integer("updated_by_user_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiTeacherProviderSettings = typeof aiTeacherProviderSettingsTable.$inferSelect;
