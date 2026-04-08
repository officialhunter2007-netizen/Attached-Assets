import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role").notNull().default("user"),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  points: integer("points").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastActive: text("last_active"),
  badges: text("badges").array().notNull().default([]),
  nukhbaPlan: text("nukhba_plan"),
  region: text("region"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(0),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  referralAccessUntil: timestamp("referral_access_until", { withTimezone: true }),
  firstLessonComplete: boolean("first_lesson_complete").notNull().default(false),
  referralCode: text("referral_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
