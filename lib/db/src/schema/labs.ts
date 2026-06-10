import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unitsTable } from "./curriculum_hierarchy";

export const labScenariosTable = pgTable("lab_scenarios", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => unitsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  scenarioText: text("scenario_text").notNull(),
  scenarioTextAr: text("scenario_text_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_lab_scenarios_unit").on(t.unitId),
]);

export const insertLabScenarioSchema = createInsertSchema(labScenariosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLabScenario = z.infer<typeof insertLabScenarioSchema>;
export type LabScenario = typeof labScenariosTable.$inferSelect;

export const labQuestionsTable = pgTable("lab_questions", {
  id: serial("id").primaryKey(),
  labScenarioId: integer("lab_scenario_id").notNull().references(() => labScenariosTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  options: text("options").notNull().default("[]"),
  optionsAr: text("options_ar"),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  explanationAr: text("explanation_ar"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_lab_questions_scenario").on(t.labScenarioId),
]);

export const insertLabQuestionSchema = createInsertSchema(labQuestionsTable).omit({ id: true, createdAt: true });
export type InsertLabQuestion = z.infer<typeof insertLabQuestionSchema>;
export type LabQuestion = typeof labQuestionsTable.$inferSelect;
