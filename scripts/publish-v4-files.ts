import fs from "fs";
import path from "path";
import { publishV4InstructionFile } from "../artifacts/api-server/src/lib/v4-instruction-normalizer";

const ROOT = path.resolve(new URL(import.meta.url).pathname, "..", "..");

const FILES = [
  { file: path.join(ROOT, "uni-cybersec-instruction.json"), slug: "uni-cybersec" },
  { file: path.join(ROOT, "uni-datascience-instruction.json"), slug: "uni-datascience" },
  { file: path.join(ROOT, "uni-ai-instruction.json"), slug: "uni-ai" },
  { file: path.join(ROOT, "uni-it-instruction.json"), slug: "uni-it" },
];

async function main() {
  for (const { file, slug } of FILES) {
    if (!fs.existsSync(file)) {
      console.log(`SKIP ${slug}: file not found`);
      continue;
    }

    console.log(`\n--- Publishing ${slug} ---`);
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));

    try {
      const result = await publishV4InstructionFile(raw, null, (p) => {
        process.stdout.write(`  [${p.phase}] ${p.label ?? ""} (${p.count ?? 0})\n`);
      });

      console.log(`OK ${slug}: versionId=${result.versionId} v${result.version} specialtyId=${result.specialtyId}`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error(`ERROR ${slug}:`, msg.slice(0, 600));
      if (err?.detail) console.error("  detail:", err.detail);
      if (err?.report) {
        const errs = err.report.issues?.filter((i: any) => i.severity === "error") ?? [];
        console.error(`  validation errors: ${errs.length}`);
        errs.slice(0, 10).forEach((e: any) => console.error("   ", e.path, "-", e.message));
      }
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
