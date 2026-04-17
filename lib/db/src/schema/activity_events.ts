import { pgTable, text, serial, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const activityEventsTable = pgTable(
  "activity_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    eventType: text("event_type").notNull(),
    path: text("path"),
    label: text("label"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("activity_events_user_idx").on(t.userId, t.createdAt),
    typeIdx: index("activity_events_type_idx").on(t.eventType, t.createdAt),
    createdIdx: index("activity_events_created_idx").on(t.createdAt),
  }),
);

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
export type InsertActivityEvent = typeof activityEventsTable.$inferInsert;
