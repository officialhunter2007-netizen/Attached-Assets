import { pgTable, serial, integer, text, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Operational alerts surfaced to the admin panel — e.g. "OpenRouter
 * credit exhausted", "Gemini auth failed", "high error rate". Records
 * are de-duplicated by `type` over a 30-minute cool-down window: the
 * second/third/N-th occurrence increments `occurrenceCount` and
 * updates `lastOccurredAt` instead of inserting a new row, so the
 * admin sees one card with a counter rather than 50 identical rows.
 */
export const adminAlertsTable = pgTable("admin_alerts", {
  id: serial("id").primaryKey(),
  /** Stable code, e.g. "openrouter_insufficient_credits", "openrouter_auth_failed", "gemini_pre_stream_failure". */
  type: text("type").notNull(),
  /** "info" | "warning" | "error" | "critical" — drives badge color. */
  severity: text("severity").notNull().default("warning"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  /** Free-form context: status code, body excerpt, route, model, etc. */
  metadata: jsonb("metadata"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByUserId: integer("resolved_by_user_id"),
  /** Bumped on every recurrence inside the cool-down window. */
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("admin_alerts_resolved_created_idx").on(t.resolved, t.createdAt),
  index("admin_alerts_type_idx").on(t.type, t.resolved),
]);

export const insertAdminAlertSchema = createInsertSchema(adminAlertsTable).omit({
  id: true,
  createdAt: true,
  lastOccurredAt: true,
  occurrenceCount: true,
});
export type InsertAdminAlert = z.infer<typeof insertAdminAlertSchema>;
export type AdminAlert = typeof adminAlertsTable.$inferSelect;
