import { pgTable, serial, integer, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const specialtiesTable = pgTable("specialties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  icon: text("icon"),
  color: text("color"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_specialties_active_order").on(t.isActive, t.orderIndex),
]);

export const insertSpecialtySchema = createInsertSchema(specialtiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;
export type Specialty = typeof specialtiesTable.$inferSelect;

export const instructionFilesTable = pgTable("instruction_files", {
  id: serial("id").primaryKey(),
  specialtyId: integer("specialty_id").notNull().references(() => specialtiesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  content: text("content").notNull(),
  version: text("version").notNull().default("1.0"),
  fileDate: timestamp("file_date", { withTimezone: true }).notNull().defaultNow(),
  fileType: text("file_type").notNull().default("instruction"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_instruction_files_specialty").on(t.specialtyId, t.isActive),
]);

export const insertInstructionFileSchema = createInsertSchema(instructionFilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInstructionFile = z.infer<typeof insertInstructionFileSchema>;
export type InstructionFile = typeof instructionFilesTable.$inferSelect;
