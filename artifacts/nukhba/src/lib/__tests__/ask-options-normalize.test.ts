/**
 * Regression test for normalizeArabicText — it MUST be an identity passthrough.
 *
 * History: normalizeArabicText used to be a multi-layer regex heuristic that
 * inserted spaces to "repair" fused Arabic. Because the definite article "ال"
 * and the single-letter prefixes live INSIDE ordinary words, it split valid
 * words in lesson text and in clickable ASK_OPTIONS cards (عالم → "ع الم",
 * رسالة → "رس الة", بالعملاء → "ب العملاء"). It was permanently replaced with an
 * identity function. This test fails if any space-insertion heuristic is ever
 * re-introduced.
 *
 * Run (tsx is NOT at the repo root):
 *   ./scripts/node_modules/.bin/tsx artifacts/nukhba/src/lib/__tests__/ask-options-normalize.test.ts
 */
import { normalizeArabicText } from "../ask-options";

// Words that legitimately contain ا+ل or a prefix letter and must NEVER split.
// Drawn from the reported screenshots + the keep-set in memory
// (.agents/memory/arabic-spacing-normalization.md).
const mustStayIntact = [
  "عالم",
  "رسالة",
  "بالعملاء",
  "الأسعار",
  "بالضبط",
  "بأمر",
  "العملاء",
  "الكمبيوتر",
  "الشاشة",
  "النظام",
  "البرمجة",
  "سؤال",
  "أهلاً",
  "صنعاء",
  "في عالم البرمجة",
  "كيف يخلي الكمبيوتر يعرض لك أي كلام تبغاه على الشاشة",
  "كيف نخلي الكمبيوتر يعرض لنا رسالة ترحيبية",
  'print("رسالة")',
  'display("رسالة")',
  // keep-set from memory
  "عنصر", "منهج", "هذان", "يكونوا", "عندك", "كيفية", "فيها", "فيه", "معها",
];

const failures: string[] = [];
for (const w of mustStayIntact) {
  const out = normalizeArabicText(w);
  if (out !== w) failures.push(`  in=[${w}]  out=[${out}]`);
}

if (failures.length > 0) {
  console.error(
    `FAIL: normalizeArabicText altered ${failures.length}/${mustStayIntact.length} strings — it must be an identity passthrough:\n${failures.join("\n")}`,
  );
  process.exit(1);
}

console.log(`PASS: normalizeArabicText left all ${mustStayIntact.length} strings unchanged.`);
