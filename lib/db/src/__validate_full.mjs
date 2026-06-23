import { readFileSync } from 'fs';
import { v4InstructionFileSchema } from './v4-instruction-schema.ts';
import { validateV4InstructionFile } from '../../../artifacts/api-server/src/lib/v4-instruction-validator.ts';

const slug = process.argv[2];
if (!slug) { console.error('Usage: tsx __validate_full.mjs <slug>'); process.exit(1); }

const raw = JSON.parse(readFileSync(`/root/nukhba/Attached-Assets/out/${slug}/final.json`, 'utf-8'));

const r1 = v4InstructionFileSchema.safeParse(raw);
if (!r1.success) {
  console.log(`❌ Zod: ${r1.error.issues.length} issues`);
  r1.error.issues.slice(0, 5).forEach(i => console.log(`  ${i.path.join('.')} — ${i.message}`));
  process.exit(1);
}

const r2 = validateV4InstructionFile(raw);
const e = r2.issues.filter(i => i.severity === 'error');
const w = r2.issues.filter(i => i.severity === 'warning');
const emoji = r2.ok ? '✅' : '❌';
console.log(`${emoji} ${slug}: errors=${e.length} warnings=${w.length} lessons=${r2.summary.lessons}`);

if (e.length > 0) {
  e.slice(0, 10).forEach(x => console.log('  ERR:', x.path, x.message));
}
if (w.length > 0) {
  w.slice(0, 10).forEach(x => console.log('  WARN:', x.path, x.message));
}

process.exit(r2.ok ? 0 : 1);
