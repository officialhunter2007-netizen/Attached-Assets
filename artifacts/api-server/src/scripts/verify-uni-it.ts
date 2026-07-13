#!/usr/bin/env tsx
import { db, v4SpecialtiesTable, v4LevelsTable, v4StagesTable, v4UnitsTable, v4LessonsTable, v4LessonConceptsTable, v4LessonCommonMistakesTable, v4LabScenariosTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

async function main() {
  const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, "uni-it"));
  if (!sp) { console.error("❌ التخصص غير موجود"); process.exit(1); }
  console.log("✅ التخصص:", sp.name, "| activeVersionId:", sp.activeInstructionVersionId);

  const vid = sp.activeInstructionVersionId!;
  const [[lc],[sc],[uc],[leC],[cc],[mc],[laC]] = await Promise.all([
    db.select({ c: count() }).from(v4LevelsTable).where(eq(v4LevelsTable.versionId, vid)),
    db.select({ c: count() }).from(v4StagesTable).where(eq(v4StagesTable.versionId, vid)),
    db.select({ c: count() }).from(v4UnitsTable).where(eq(v4UnitsTable.versionId, vid)),
    db.select({ c: count() }).from(v4LessonsTable).where(eq(v4LessonsTable.versionId, vid)),
    db.select({ c: count() }).from(v4LessonConceptsTable).where(eq(v4LessonConceptsTable.versionId, vid)),
    db.select({ c: count() }).from(v4LessonCommonMistakesTable).where(eq(v4LessonCommonMistakesTable.versionId, vid)),
    db.select({ c: count() }).from(v4LabScenariosTable).where(eq(v4LabScenariosTable.versionId, vid)),
  ]);
  console.log(`   مستويات: ${lc.c} | مراحل: ${sc.c} | وحدات: ${uc.c} | دروس: ${leC.c}`);
  console.log(`   مفاهيم: ${cc.c} | أخطاء شائعة: ${mc.c} | معامل: ${laC.c}`);
  process.exit(0);
}
main().catch(e => { console.error("❌", e?.message); process.exit(1); });
