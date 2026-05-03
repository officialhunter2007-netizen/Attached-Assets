import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex, jsonb, index } from "drizzle-orm/pg-core";
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
  discountCodeId: integer("discount_code_id"),
  discountCode: text("discount_code"),
  discountPercent: integer("discount_percent"),
  basePrice: integer("base_price"),
  finalPrice: integer("final_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Discount codes (admin-managed promo codes) ────────────────────────────────
// `maxUses`: total redemptions allowed across all users (null = unlimited).
// `perUserLimit`: how many times one user can redeem (null = unlimited but the
//   discount_code_redemptions unique index still enforces "one row per code+user"
//   for analytics; per-user re-redemption is gated by this column).
// `startsAt`/`endsAt`: optional active window — outside this window the code is
//   treated as inactive even when `active = true`.
export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: integer("percent").notNull(),
  note: text("note"),
  active: boolean("active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  maxUses: integer("max_uses"),
  perUserLimit: integer("per_user_limit"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdByUserId: integer("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-user redemption ledger for discount codes. One row per *successful*
// redemption (i.e. inserted inside the approve-request transaction so it
// only counts when the admin actually grants the subscription, not at
// request-creation time). Used to enforce `perUserLimit` and to power the
// "who used this code" admin view.
export const discountCodeRedemptionsTable = pgTable("discount_code_redemptions", {
  id: serial("id").primaryKey(),
  codeId: integer("code_id").notNull(),
  userId: integer("user_id").notNull(),
  subscriptionRequestId: integer("subscription_request_id"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_discount_code_redemptions_code_user").on(t.codeId, t.userId),
  index("idx_discount_code_redemptions_user").on(t.userId),
]);

export type DiscountCodeRedemption = typeof discountCodeRedemptionsTable.$inferSelect;

export const insertDiscountCodeSchema = createInsertSchema(discountCodesTable).omit({ id: true, createdAt: true });
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodesTable.$inferSelect;

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

// Per-subject subscription table — each subject = an independent subscription
// (Gold for Cybersecurity does NOT grant access to AI; user must subscribe
// separately per subject). Gem fields (`gems*`) live HERE (per-subject) so a
// user can hold multiple plans simultaneously, each with its own daily cap.
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
  // Price the student paid (YER) and region (north/south) — used to enforce
  // the cost-cap rule (AI cost ≤ 50% of what they paid).
  paidPriceYer: integer("paid_price_yer").notNull().default(0),
  region: text("region"),
  // ── Per-subject gems wallet ───────────────────────────────────────────────
  // Replaces the legacy global gems columns on usersTable for new subs.
  // gemsBalance: total remaining for the 14-day window.
  // gemsDailyLimit: max gems usable per Yemen-day. Unused = forfeit at midnight.
  // gemsUsedToday: counter reset at each new Yemen-day (see gems.ts).
  // gemsResetDate: the YYYY-MM-DD Yemen date when usedToday was last reset.
  gemsBalance: integer("gems_balance").notNull().default(0),
  gemsUsedToday: integer("gems_used_today").notNull().default(0),
  gemsDailyLimit: integer("gems_daily_limit").notNull().default(0),
  gemsResetDate: text("gems_reset_date"),
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
  // Micro-step progress within the current stage. Added May 2026 (Task #37).
  // Columns are created by auto-migrate before the server accepts requests.
  currentMicroStepIndex: integer("current_micro_step_index").notNull().default(0),
  completedMicroSteps: text("completed_micro_steps").notNull().default('[]'),
  growthReflections: text("growth_reflections").notNull().default('[]'),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("user_subject_plans_user_subject_idx").on(t.userId, t.subjectId),
]);

export const insertUserSubjectPlanSchema = createInsertSchema(userSubjectPlansTable).omit({ id: true });
export type InsertUserSubjectPlan = z.infer<typeof insertUserSubjectPlanSchema>;
export type UserSubjectPlan = typeof userSubjectPlansTable.$inferSelect;

// Structured audit log for compliance events (mastery drift suppression, etc.)
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  event: text("event").notNull(),
  userId: integer("user_id"),
  subjectId: text("subject_id"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: text("user_name"),
  userEmail: text("user_email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  threadId: integer("thread_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupportMessageSchema = createInsertSchema(supportMessagesTable).omit({ id: true, createdAt: true });
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;

// Admin-controlled price table — one row per (region, planType).
// The active prices used by the subscription page, request creation, discount
// preview and admin grant. Defaults are seeded by the auto-migrate at boot
// (north: 1k/2k/3k, south: 2k/4k/6k) and never overwritten on subsequent
// boots so admin edits persist. The numeric `BASE_PRICES` in
// subscriptions.ts route file is kept ONLY as an in-process fallback for the
// rare case where the DB read fails — never as the source of truth.
export const planPricesTable = pgTable("plan_prices", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(),
  planType: text("plan_type").notNull(),
  priceYer: integer("price_yer").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id"),
}, (t) => [
  uniqueIndex("uq_plan_prices_region_plan").on(t.region, t.planType),
]);

export type PlanPrice = typeof planPricesTable.$inferSelect;

// Admin-editable YER→USD exchange rates — one row per region.
// Stored as the divisor (e.g. 600 means 1 USD = 600 YER, i.e. rate = 1/600).
// Defaults are seeded by the auto-migrate at boot (north: 600, south: 2800)
// and never overwritten on subsequent boots so admin edits persist. The
// pricing-formula.ts module exposes an in-memory cache populated from this
// table at startup and after every admin PATCH; the static constants in
// pricing-formula.ts are kept ONLY as an in-process fallback when the DB
// read fails — never as the source of truth.
export const exchangeRatesTable = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  region: text("region").notNull().unique(),
  yerPerUsd: integer("yer_per_usd").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: integer("updated_by_user_id"),
});

export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;

// ── Gem ledger ────────────────────────────────────────────────────────────────
// Append-only audit log of every gem balance change. Written from:
//   - approve / activate-card / admin grant   → reason='grant',   delta=+total
//   - per-turn AI debit                       → reason='debit',   delta=-cost
//   - admin refund                            → reason='refund',  delta=+x
//   - admin manual adjust                     → reason='adjust',  delta=±x
//   - daily forfeit at Yemen midnight          → reason='forfeit', delta=-leftover
// Either `subjectSubId` (per-subject wallet) OR `legacyUser=true` is set, so
// the dashboard can group ledger rows per wallet.
export const gemLedgerTable = pgTable("gem_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectSubId: integer("subject_sub_id"),
  subjectId: text("subject_id"),
  delta: integer("delta").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  source: text("source"),
  adminUserId: integer("admin_user_id"),
  note: text("note"),
  metadata: jsonb("metadata"),
  // Idempotency key for AI-call settlement. A unique partial index on
  // (user_id, request_id) WHERE request_id IS NOT NULL is created in
  // auto-migrate so two concurrent settles for the same AI call collapse
  // into a single debit. Legacy rows have NULL and are exempt.
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_gem_ledger_user_created").on(t.userId, t.createdAt),
  index("idx_gem_ledger_subject_sub").on(t.subjectSubId),
  index("idx_gem_ledger_reason").on(t.reason),
]);

export type GemLedger = typeof gemLedgerTable.$inferSelect;
export type InsertGemLedger = typeof gemLedgerTable.$inferInsert;

// ── Payment settings ──────────────────────────────────────────────────────────
// Admin-editable runtime configuration: Kuraimi account numbers, account
// holder names, etc. Stored as key/value rows so the admin can add new keys
// (e.g. wechat/USDT) without a schema migration. Values are plain strings —
// JSON-encoded at the application level when needed.
export const paymentSettingsTable = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  label: text("label"),
  category: text("category").notNull().default("payment"),
  updatedByUserId: integer("updated_by_user_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentSetting = typeof paymentSettingsTable.$inferSelect;
