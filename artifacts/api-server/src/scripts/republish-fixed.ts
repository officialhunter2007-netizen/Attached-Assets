#!/usr/bin/env tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { publishV4InstructionFile } from "../lib/v4-instruction-normalizer";
import { validateV4InstructionFile } from "../lib/v4-instruction-validator";

const FILES = [
  "../../Material_files/business-admin-instruction.json",
  "../../Material_files/uni-cybersec-instruction.json",
  "../../Material_files/uni-datascience-instruction.json",
];

async function main() {
  for (const f of FILES) {
    const raw = JSON.parse(fs.readFileSync(path.resolve("/home/runner/workspace", f.replace("../../", "")), "utf-8"));
    const slug = raw.specialty.slug;
    const report = validateV4InstructionFile(raw);
    const errors = report.issues.filter((i: any) => i.severity === "error");
    if (errors.length) { console.error(`❌ ${slug}: ${errors[0].message}`); process.exit(1); }
    const t0 = Date.now();
    const result = await publishV4InstructionFile(raw, 1);
    console.log(`✅ ${slug} | specialtyId=${result.specialtyId} versionId=${result.versionId} version=${result.version} (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  }
  process.exit(0);
}

main().catch(e => { console.error("❌", e?.message ?? e); process.exit(1); });
