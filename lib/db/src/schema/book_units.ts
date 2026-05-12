import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { courseMaterialsTable } from "./course_materials";

export const bookUnitsTable = pgTable("book_units", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").notNull().references(() => courseMaterialsTable.id, { onDelete: "cascade" }),
  unitNumber: integer("unit_number").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  startPage: integer("start_page"),
  endPage: integer("end_page"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("book_units_material_idx").on(t.materialId),
]);

export type BookUnit = typeof bookUnitsTable.$inferSelect;

export const bookUnitImagesTable = pgTable("book_unit_images", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull().references(() => bookUnitsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number"),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("book_unit_images_unit_idx").on(t.unitId),
]);

export type BookUnitImage = typeof bookUnitImagesTable.$inferSelect;
