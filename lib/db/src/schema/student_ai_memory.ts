import { pgTable, serial, integer, text, timestamp, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { specialtiesTable } from "./specialties";
import { lessonConceptsTable } from "./lesson_concepts";

// ─── Student Profile (personal dictionary, warmth memory, learning style) ─────
export const studentProfileTable = pgTable("student_profile", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  personalDictionary: jsonb("personal_dictionary").notNull().default({}),
  warmthMemory: text("warmth_memory"),
  learningStyle: text("learning_style"),
  preferences: jsonb("preferences").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("uq_student_profile_user_specialty").on(t.userId, t.specialtyId),
]);

export const insertStudentProfileSchema = createInsertSchema(studentProfileTable).omit({ id: true, updatedAt: true });
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfileTable.$inferSelect;

// ─── Concept Mastery Scores ───────────────────────────────────────────────────
export const conceptMasteryScoresTable = pgTable("concept_mastery_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  conceptId: integer("concept_id").notNull().references(() => lessonConceptsTable.id, { onDelete: "cascade" }),
  masteryScore: integer("mastery_score").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  correctAttempts: integer("correct_attempts").notNull().default(0),
  lastAssessedAt: timestamp("last_assessed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_concept_mastery_user_concept").on(t.userId, t.conceptId),
  index("idx_concept_mastery_user").on(t.userId),
]);

export const insertConceptMasteryScoreSchema = createInsertSchema(conceptMasteryScoresTable).omit({ id: true, createdAt: true });
export type InsertConceptMasteryScore = z.infer<typeof insertConceptMasteryScoreSchema>;
export type ConceptMasteryScore = typeof conceptMasteryScoresTable.$inferSelect;

// ─── Weakness Tracker ─────────────────────────────────────────────────────────
export const weaknessTrackerTable = pgTable("weakness_tracker", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  areaAr: text("area_ar"),
  weaknessDescription: text("weakness_description").notNull(),
  weaknessDescriptionAr: text("weakness_description_ar"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  remediationStatus: text("remediation_status").notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_weakness_tracker_user_specialty").on(t.userId, t.specialtyId, t.remediationStatus),
]);

export const insertWeaknessTrackerSchema = createInsertSchema(weaknessTrackerTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWeaknessTracker = z.infer<typeof insertWeaknessTrackerSchema>;
export type WeaknessTracker = typeof weaknessTrackerTable.$inferSelect;

// ─── Student Memory Summaries ─────────────────────────────────────────────────
export const studentMemorySummariesTable = pgTable("student_memory_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  summaryText: text("summary_text").notNull(),
  summaryTextAr: text("summary_text_ar"),
  contextType: text("context_type").notNull().default("general"),
  contextId: integer("context_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_student_memory_summaries_user_specialty").on(t.userId, t.specialtyId, t.createdAt),
]);

export const insertStudentMemorySummarySchema = createInsertSchema(studentMemorySummariesTable).omit({ id: true, createdAt: true });
export type InsertStudentMemorySummary = z.infer<typeof insertStudentMemorySummarySchema>;
export type StudentMemorySummary = typeof studentMemorySummariesTable.$inferSelect;
