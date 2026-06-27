#!/usr/bin/env tsx
/**
 * one-shot publish script — علوم البيانات instruction file v2
 * Usage:  tsx src/scripts/publish-uni-ds.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { publishV4InstructionFile } from "../lib/v4-instruction-normalizer";
import { validateV4InstructionFile } from "../lib/v4-instruction-validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const JSON_PATH = path.resolve(
  __dirname,
  "../../../../out/uni-data-science/quality_v2.json"
);

async function main() {
  console.log("📂 قراءة الملف:", JSON_PATH);
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`   schema_version=${raw.schema_version}  specialty=${raw.specialty_slug}`);

  console.log("\n🔍 التحقق من الصحة...");
  const report = validateV4InstructionFile(raw);
  const errors   = report.issues.filter((i: any) => i.severity === "error");
  const warnings = report.issues.filter((i: any) => i.severity === "warning");
  console.log(`   الأخطاء: ${errors.length} | التحذيرات: ${warnings.length}`);
  if (errors.length > 0) {
    errors.slice(0, 10).forEach((e: any) => console.log(`   ❌ ${e.path}: ${e.message}`));
    if (errors.length > 10) console.log(`   ... و ${errors.length - 10} أخطاء إضافية`);
  }
  if (!report.ok) {
    console.error("\n❌ التحقق فشل — لا يمكن النشر");
    process.exit(1);
  }

  console.log("\n🚀 بدء النشر...");
  const t0 = Date.now();
  const result = await publishV4InstructionFile(raw, 1); // userId=1 (admin)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n✅ نُشر بنجاح في ${elapsed}s:`);
  console.log(`   specialtyId  = ${result.specialtyId}`);
  console.log(`   versionId    = ${result.versionId}`);
  console.log(`   version      = ${result.version}`);
  console.log(`   summary      = ${result.summary}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ خطأ:", e?.message ?? e);
  process.exit(1);
});
