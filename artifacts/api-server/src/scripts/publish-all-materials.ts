#!/usr/bin/env tsx
/**
 * Bulk publish script — ينشر جميع ملفات Material_files/ على المنصة
 * Usage:  tsx src/scripts/publish-all-materials.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { publishV4InstructionFile } from "../lib/v4-instruction-normalizer";
import { validateV4InstructionFile } from "../lib/v4-instruction-validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MATERIALS_DIR = path.resolve(__dirname, "../../../../Material_files");

async function publishFile(filePath: string): Promise<{ ok: boolean; slug: string; errors?: string[]; elapsed?: string; specialtyId?: number; versionId?: number; version?: number }> {
  const slug = path.basename(filePath, ".json");
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📂 [${slug}] قراءة الملف...`);

  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e: any) {
    console.error(`   ❌ فشل قراءة الملف: ${e.message}`);
    return { ok: false, slug, errors: [`فشل القراءة: ${e.message}`] };
  }

  const actualSlug = raw?.specialty?.slug ?? slug;
  console.log(`   schema_version=${raw.schema_version}  specialty=${actualSlug}`);

  console.log(`   🔍 التحقق من الصحة...`);
  const report = validateV4InstructionFile(raw);
  const errors   = report.issues.filter((i: any) => i.severity === "error");
  const warnings = report.issues.filter((i: any) => i.severity === "warning");
  console.log(`   الأخطاء: ${errors.length} | التحذيرات: ${warnings.length}`);

  if (errors.length > 0) {
    errors.slice(0, 5).forEach((e: any) => console.log(`   ❌ ${e.path}: ${e.message}`));
    if (errors.length > 5) console.log(`   ... و ${errors.length - 5} أخطاء إضافية`);
    console.error(`   ❌ التحقق فشل — تخطي هذا الملف`);
    return { ok: false, slug: actualSlug, errors: errors.map((e: any) => `${e.path}: ${e.message}`) };
  }

  if (warnings.length > 0) {
    warnings.slice(0, 3).forEach((w: any) => console.log(`   ⚠️  ${w.path}: ${w.message}`));
    if (warnings.length > 3) console.log(`   ... و ${warnings.length - 3} تحذيرات إضافية`);
  }

  console.log(`   ✅ الملف صحيح — جاري النشر...`);
  const t0 = Date.now();

  try {
    const result = await publishV4InstructionFile(raw, 1); // userId=1 (admin)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`   ✅ نُشر بنجاح في ${elapsed}s | specialtyId=${result.specialtyId} versionId=${result.versionId} version=${result.version}`);
    return { ok: true, slug: actualSlug, elapsed, specialtyId: result.specialtyId, versionId: result.versionId, version: result.version };
  } catch (e: any) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`   ❌ فشل النشر بعد ${elapsed}s: ${e?.message ?? e}`);
    return { ok: false, slug: actualSlug, errors: [e?.message ?? String(e)] };
  }
}

async function main() {
  console.log("🚀 بدء نشر جميع ملفات Material_files/");
  console.log(`   المجلد: ${MATERIALS_DIR}`);

  if (!fs.existsSync(MATERIALS_DIR)) {
    console.error(`❌ المجلد غير موجود: ${MATERIALS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MATERIALS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .map(f => path.join(MATERIALS_DIR, f));

  console.log(`   الملفات المكتشفة: ${files.length}`);
  files.forEach(f => console.log(`   • ${path.basename(f)}`));

  const results: Awaited<ReturnType<typeof publishFile>>[] = [];

  for (const filePath of files) {
    const result = await publishFile(filePath);
    results.push(result);
  }

  // ─── ملخص ─────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 الملخص النهائي`);
  console.log(`${"═".repeat(60)}`);

  const succeeded = results.filter(r => r.ok);
  const failed    = results.filter(r => !r.ok);

  console.log(`✅ نجح: ${succeeded.length}/${results.length}`);
  succeeded.forEach(r => console.log(`   ✔ ${r.slug} (v${r.version}, specialtyId=${r.specialtyId}, ${r.elapsed}s)`));

  if (failed.length > 0) {
    console.log(`\n❌ فشل: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   ✗ ${r.slug}`);
      r.errors?.slice(0, 3).forEach(e => console.log(`     - ${e}`));
    });
    process.exit(1);
  }

  console.log(`\n🎉 تم نشر جميع الملفات بنجاح!`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ خطأ غير متوقع:", e?.message ?? e);
  if (e?.stack) console.error(e.stack);
  process.exit(1);
});
