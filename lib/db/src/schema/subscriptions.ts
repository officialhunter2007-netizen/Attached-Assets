import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionRequestsTable = pgTable("subscription_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  accountName: text("account_name").notNull().default(""),
  transactionId: text("transaction_id"),
  planType: text("plan_type").notNull(),
  region: text("region").notNull(),
  subjectId: text("subject_id").notNull().default("all"),
  subjectName: text("subject_name"),
  status: text("status").notNull().default("pending"),
  activationCode: text("activation_code"),
  notes: text("notes"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionRequestSchema = createInsertSchema(subscriptionRequestsTable).omit({ id: true, createdAt: true });
export type InsertSubscriptionRequest = z.infer<typeof insertSubscriptionRequestSchema>;
export type SubscriptionRequest = typeof subscriptionRequestsTable.$inferSelect;

export const activationCardsTable = pgTable("activation_cards", {
  id: serial("id").primaryKey(),
  activationCode: text("activation_code").notNull().unique(),
  planType: text("plan_type").notNull(),
  region: text("region"),
  subjectId: text("subject_id"),
  subjectName: text("subject_name"),
  isUsed: boolean("is_used").notNull().default(false),
  usedByUserId: integer("used_by_user_id"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  subscriptionRequestId: integer("subscription_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivationCardSchema = createInsertSchema(activationCardsTable).omit({ id: true, createdAt: true });
export type InsertActivationCard = z.infer<typeof insertActivationCardSchema>;
export type ActivationCard = typeof activationCardsTable.$inferSelect;

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").notNull(),
  referredUserId: integer("referred_user_id").notNull(),
  referralCode: text("referral_code").notNull(),
  accessDaysGranted: integer("access_days_granted").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;

// Per-subject subscription table (new, replaces global plan on users table for new subscriptions)
export const userSubjectSubscriptionsTable = pgTable("user_subject_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectName: text("subject_name"),
  plan: text("plan").notNull(),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  activationCode: text("activation_code"),
  subscriptionRequestId: integer("subscription_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSubjectSubscriptionSchema = createInsertSchema(userSubjectSubscriptionsTable).omit({ id: true, createdAt: true });
export type InsertUserSubjectSubscription = z.infer<typeof insertUserSubjectSubscriptionSchema>;
export type UserSubjectSubscription = typeof userSubjectSubscriptionsTable.$inferSelect;

// Per-subject first lesson tracking
export const userSubjectFirstLessonsTable = pgTable("user_subject_first_lessons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  freeMessagesUsed: integer("free_messages_used").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_user_subject_first_lesson").on(t.userId, t.subjectId),
]);

export const insertUserSubjectFirstLessonSchema = createInsertSchema(userSubjectFirstLessonsTable).omit({ id: true });
export type InsertUserSubjectFirstLesson = z.infer<typeof insertUserSubjectFirstLessonSchema>;
export type UserSubjectFirstLesson = typeof userSubjectFirstLessonsTable.$inferSelect;

// Per-subject persisted learning plan (generated from diagnostic phase)
export const userSubjectPlansTable = pgTable("user_subject_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  planHtml: text("plan_html").notNull(),
  currentStageIndex: integer("current_stage_index").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_subject_plans_user_subject_idx").on(t.userId, t.subjectId),
]);

export const insertUserSubjectPlanSchema = createInsertSchema(userSubjectPlansTable).omit({ id: true });
export type InsertUserSubjectPlan = z.infer<typeof insertUserSubjectPlanSchema>;
export type UserSubjectPlan = typeof userSubjectPlansTable.$inferSelect;
