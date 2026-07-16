#!/usr/bin/env tsx
/**
 * publish-materials.ts
 * Publishes all JSON instruction files from Material_files/ directly via
 * the internal publishV4InstructionFile function — no HTTP auth needed.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// The workspace root is 2 levels up from scripts/
const ROOT = resolve(import.meta.dirname, "..");
const MATERIAL_DIR = join(ROOT, "Material_files");

// Dynamic import after env is set so DB picks up DATABASE_URL
async function main() {
  const { publishV4InstructionFile } = await import(
    "../artifacts/api-server/src/lib/v4-instruction-normalizer.js"
  );
  const { autoFixV4InstructionFile } = await import(
    "../artifacts/api-server/src/lib/v4-instruction-autofix.js"
  );
  const { validateV4InstructionFile } = await import(
    "../artifacts/api-server/src/lib/v4-instruction-validator.js"
  );

  const files = readdirSync(MATERIAL_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`\nFound ${files.length} instruction files to publish.\n`);

  const results: { file: string; status: "ok" | "error"; detail: string }[] =
    [];

  for (const file of files) {
    const filePath = join(MATERIAL_DIR, file);
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📄  ${file}`);

    let rawJson: unknown;
    try {
      const content = readFileSync(filePath, "utf8");
      rawJson = JSON.parse(content);
    } catch (e: any) {
      const msg = `JSON parse error: ${e.message}`;
      console.error(`  ❌  ${msg}`);
      results.push({ file, status: "error", detail: msg });
      continue;
    }

    // Validate first
    let report = validateV4InstructionFile(rawJson);

    // Auto-fix if there are errors
    if (!report.ok) {
      const errCount = report.issues.filter((i) => i.severity === "error").length;
      console.log(`  ⚠️   ${errCount} validation error(s) — running autofix…`);
      try {
        const fixed = autoFixV4InstructionFile(rawJson);
        rawJson = fixed.fixedDoc;
        console.log(`  🔧  autofix applied ${fixed.changes.length} change(s)`);
        // Re-validate
        report = validateV4InstructionFile(rawJson);
        if (!report.ok) {
          const remaining = report.issues.filter((i) => i.severity === "error");
          const msg = `autofix did not resolve all errors (${remaining.length} remaining): ${remaining
            .slice(0, 3)
            .map((i) => `${i.path}: ${i.message}`)
            .join(" | ")}`;
          console.error(`  ❌  ${msg}`);
          results.push({ file, status: "error", detail: msg });
          continue;
        }
        console.log(`  ✅  autofix resolved all errors`);
      } catch (e: any) {
        const msg = `autofix threw: ${e.message}`;
        console.error(`  ❌  ${msg}`);
        results.push({ file, status: "error", detail: msg });
        continue;
      }
    } else {
      console.log(`  ✅  validation passed (0 errors)`);
    }

    // Publish
    try {
      let lastPhase = "";
      const result = await publishV4InstructionFile(
        rawJson,
        null, // publishedByUserId — null for script
        (p) => {
          if (p.phase !== lastPhase) {
            process.stdout.write(`  📦  ${p.phase}: ${p.label} (${p.count})\n`);
            lastPhase = p.phase;
          }
        },
      );
      const msg = `published version ${result.version} (versionId=${result.versionId})`;
      console.log(`  🚀  ${msg}`);
      results.push({ file, status: "ok", detail: msg });
    } catch (e: any) {
      const msg = e?.report
        ? `validation failed during publish: ${e.report.issues
            .filter((i: any) => i.severity === "error")
            .slice(0, 3)
            .map((i: any) => `${i.path}: ${i.message}`)
            .join(" | ")}`
        : `publish threw: ${e.message}`;
      console.error(`  ❌  ${msg}`);
      results.push({ file, status: "error", detail: msg });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${"═".repeat(60)}`);
  const ok = results.filter((r) => r.status === "ok");
  const errors = results.filter((r) => r.status === "error");
  console.log(`  ✅  ${ok.length}/${results.length} published successfully`);
  if (errors.length > 0) {
    console.log(`  ❌  ${errors.length} failed:`);
    for (const r of errors) {
      console.log(`       • ${r.file}: ${r.detail}`);
    }
    process.exit(1);
  } else {
    console.log(`\n  All files published with ZERO errors. ✓`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
