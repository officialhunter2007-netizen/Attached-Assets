import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Table 1: admin_knowledge_modules ────────────────────────────────────────
// Admin-created knowledge modules scoped to a subject.
// A module is "complete" when all 5 level files are uploaded.
export const adminKnowledgeModulesTable = pgTable(
  "admin_knowledge_modules",
  {
    id: serial("id").primaryKey(),
    subjectId: text("subject_id").notNull(),
    moduleName: text("module_name").notNull(),
    moduleNameAr: text("module_name_ar").notNull(),
    moduleOrder: integer("module_order").notNull().default(0),
    descriptionAr: text("description_ar"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_module_subject_name").on(t.subjectId, t.moduleName),
    index("idx_module_subject").on(t.subjectId, t.moduleOrder),
  ],
);

export const insertAdminKnowledgeModuleSchema = createInsertSchema(adminKnowledgeModulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type AdminKnowledgeModule = typeof adminKnowledgeModulesTable.$inferSelect;
export type InsertAdminKnowledgeModule = z.infer<typeof insertAdminKnowledgeModuleSchema>;

// ─── Table 2: admin_module_level_files ───────────────────────────────────────
// Stores the 5 level .txt files per module.
// Level 1 = absolute beginner, Level 5 = advanced practitioner.
export const adminModuleLevelFilesTable = pgTable(
  "admin_module_level_files",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => adminKnowledgeModulesTable.id, { onDelete: "cascade" }),
    level: integer("level").notNull(), // 1–5
    fileName: text("file_name").notNull(),
    content: text("content").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_module_level").on(t.moduleId, t.level)],
);

export const insertAdminModuleLevelFileSchema = createInsertSchema(adminModuleLevelFilesTable).omit({
  id: true,
  uploadedAt: true,
});
export type AdminModuleLevelFile = typeof adminModuleLevelFilesTable.$inferSelect;
export type InsertAdminModuleLevelFile = z.infer<typeof insertAdminModuleLevelFileSchema>;

// ─── Table 3: student_module_levels ──────────────────────────────────────────
// Stores each student's level (1-5) per module as assessed by the placement test.
export const studentModuleLevelsTable = pgTable(
  "student_module_levels",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => adminKnowledgeModulesTable.id, { onDelete: "cascade" }),
    level: integer("level").notNull(), // 1–5
    placementScore: jsonb("placement_score").notNull().default({}),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_student_module_level").on(t.userId, t.moduleId),
    index("idx_student_module_levels_user").on(t.userId),
  ],
);

export const insertStudentModuleLevelSchema = createInsertSchema(studentModuleLevelsTable).omit({
  id: true,
  placedAt: true,
  updatedAt: true,
});
export type StudentModuleLevel = typeof studentModuleLevelsTable.$inferSelect;
export type InsertStudentModuleLevel = z.infer<typeof insertStudentModuleLevelSchema>;

// ─── Table 4: student_rag_sessions ───────────────────────────────────────────
// Tracks the full lifecycle of a student's adaptive RAG pathway for a subject.
// One row per (userId, subjectId) — upserted on restart.
export const studentRagSessionsTable = pgTable(
  "student_rag_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    subjectId: text("subject_id").notNull(),
    conversationId: integer("conversation_id"),
    currentModuleId: integer("current_module_id"),
    currentLevel: integer("current_level"),
    // phase: diagnostic | placement | teaching | complete
    sessionPhase: text("session_phase").notNull().default("diagnostic"),
    diagnosticAnswers: jsonb("diagnostic_answers").notNull().default([]),
    placementHistory: jsonb("placement_history").notNull().default([]),
    pathwayOrder: jsonb("pathway_order").notNull().default([]),
    pathwayIndex: integer("pathway_index").notNull().default(0),
    labEnvJson: text("lab_env_json"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_rag_session_user_subject").on(t.userId, t.subjectId),
    index("idx_rag_session_user").on(t.userId, t.subjectId),
  ],
);

export const insertStudentRagSessionSchema = createInsertSchema(studentRagSessionsTable).omit({
  id: true,
  startedAt: true,
  updatedAt: true,
});
export type StudentRagSession = typeof studentRagSessionsTable.$inferSelect;
export type InsertStudentRagSession = z.infer<typeof insertStudentRagSessionSchema>;
