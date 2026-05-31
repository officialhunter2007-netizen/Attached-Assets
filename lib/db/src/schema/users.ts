import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  displayName: text("display_name"),
  profileImage: text("profile_image"),
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
  // ── Gems system (replaces per-subject message counters) ──────────────────────
  gemsBalance: integer("gems_balance").notNull().default(0),
  gemsUsedToday: integer("gems_used_today").notNull().default(0),
  gemsDailyLimit: integer("gems_daily_limit").notNull().default(0),
  gemsResetDate: text("gems_reset_date"),
  gemsExpiresAt: timestamp("gems_expires_at", { withTimezone: true }),
  referralAccessUntil: timestamp("referral_access_until", { withTimezone: true }),
  firstLessonComplete: boolean("first_lesson_complete").notNull().default(false),
  referralCode: text("referral_code"),
  lastSessionDate: text("last_session_date"),
  lastSessionAt: timestamp("last_session_at", { withTimezone: true }),
  referralSessionsLeft: integer("referral_sessions_left").notNull().default(0),
  tryhackmeUsername: text("tryhackme_username"),
  // Welcome offer (50% off for first-time visitors who leave subscription page).
  subPageFirstVisitedAt: timestamp("sub_page_first_visited_at", { withTimezone: true }),
  subPageLeftAt: timestamp("sub_page_left_at", { withTimezone: true }),
  welcomeOfferShownAt: timestamp("welcome_offer_shown_at", { withTimezone: true }),
  welcomeOfferExpiresAt: timestamp("welcome_offer_expires_at", { withTimezone: true }),
  welcomeOfferUsedAt: timestamp("welcome_offer_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
