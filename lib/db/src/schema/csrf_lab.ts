import { pgTable, serial, text, integer, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

// Accounts table — stores victim/attacker balances
export const csrfLabAccounts = pgTable("csrf_lab_accounts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  balance: integer("balance").notNull().default(5000),
  sessionId: text("session_id"),
}, (t) => [
  index("idx_csrf_lab_accounts_username").on(t.username),
]);

// Transactions log — shows the "material evidence" of attacks
export const csrfLabTransactions = pgTable("csrf_lab_transactions", {
  id: serial("id").primaryKey(),
  fromUser: text("from_user").notNull(),
  toUser: text("to_user").notNull(),
  amount: integer("amount").notNull(),
  success: boolean("success").notNull().default(true),
  csrfTokenMatched: boolean("csrf_token_matched"),
  sameSiteBlocked: boolean("same_site_blocked"),
  origin: text("origin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Internal server call log — evidence for Blind SSRF
export const csrfLabInternalLog = pgTable("csrf_lab_internal_log", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  sourceIp: text("source_ip").notNull().default("127.0.0.1"),
  responseStatus: integer("response_status").notNull(),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_csrf_lab_internal_log_created").on(t.createdAt),
]);

// Lab session state — tracks student's current defenses configuration
export const csrfLabState = pgTable("csrf_lab_state", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  csrfTokenEnabled: boolean("csrf_token_enabled").notNull().default(false),
  sameSite: text("same_site").notNull().default("None"),
  allowlistEnabled: boolean("allowlist_enabled").notNull().default(false),
  allowlistDomains: text("allowlist_domains").notNull().default("cdn.sanaabank.com"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_csrf_lab_state_user").on(t.userId),
]);

// Cloud metadata (fake secrets)
export const csrfLabSecrets = pgTable("csrf_lab_secrets", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});
