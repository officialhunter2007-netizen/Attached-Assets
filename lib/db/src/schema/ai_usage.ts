import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  numeric,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiUsageEventsTable = pgTable(
  "ai_usage_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    subjectId: text("subject_id"),
    route: text("route").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 14, scale: 8 })
      .notNull()
      .default("0"),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull().default("success"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("idx_ai_usage_user").on(t.userId),
    createdIdx: index("idx_ai_usage_created").on(t.createdAt),
    modelIdx: index("idx_ai_usage_model").on(t.model),
    routeIdx: index("idx_ai_usage_route").on(t.route),
  }),
);

export type AiUsageEvent = typeof aiUsageEventsTable.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEventsTable.$inferInsert;
