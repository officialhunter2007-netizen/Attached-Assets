/**
 * Verification: weak-model (Flash-Lite) formatting drift is normalised.
 * Run: ./scripts/node_modules/.bin/tsx artifacts/nukhba/src/lib/__tests__/weak-model-format.test.ts
 */
import { sanitizeStrayMarkdown } from "../teacher-render";
import { extractAskOptions } from "../ask-options";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  PASS: ${name}`);
  else { console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`); failures++; }
}

// ── 1. ATX heading → bold paragraph ─────────────────────────────────────
const headingIn = `# ✨ ممتاز! شفت كيف الكود طلع على الشاشة؟

هذا هو أول برنامج حقيقي لك بلغة Python!`;
const headingOut = sanitizeStrayMarkdown(headingIn);
check("h1 converted to bold paragraph", headingOut.includes("**✨ ممتاز! شفت كيف الكود طلع على الشاشة؟**"), headingOut);
check("no heading fence remains", !/^#{1,6} /m.test(headingOut), headingOut);

// ── 2. Nested emphasis inside heading doesn't break ─────────────────────
const nested = `## **طيب، خلّيني أختبرك** بشوية تغييرات:`;
const nestedOut = sanitizeStrayMarkdown(nested);
check("nested emphasis stripped, bold-wrapped once", nestedOut.includes("**طيب، خلّيني أختبرك بشوية تغييرات:**"), nestedOut);

// ── 3. Real weak-model ASK_OPTIONS (mis-slotted first option) ───────────
const weakMsg = `لو حبينا نغير الرسالة اللي تطلع على الشاشة — إيش اللي راح نغيّره في الكود اللي كتبناه؟

[[ASK_OPTIONS: راح نغيّر كلمة print ||| راح نغيّر الأقواس () ||| راح نغيّر النص اللي داخل علامات التنصيص "" ||| غير ذلك]]`;
const r1 = extractAskOptions(weakMsg);
check("mis-slotted first option rescued", r1.ask?.options[0] === "راح نغيّر كلمة print", JSON.stringify(r1.ask));
check("question slot cleared", r1.ask?.question === "", JSON.stringify(r1.ask));
check("3 options total", r1.ask?.options.length === 3, String(r1.ask?.options.length));

// ── 4. Markdown-wrapped labels are cleaned ──────────────────────────────
const mdMsg = `اختار الإجابة الصحيحة:
[[ASK_OPTIONS: **ما ناتج 5 + 3؟** ||| **6** ||| أ) 7 ||| 1. 8 ||| - 9 ||| غير ذلك]]`;
const r2 = extractAskOptions(mdMsg);
check("question ** stripped", r2.ask?.question === "ما ناتج 5 + 3؟", JSON.stringify(r2.ask?.question));
check("option ** stripped", r2.ask?.options[0] === "6", JSON.stringify(r2.ask?.options[0]));
check("Arabic enumerator stripped", r2.ask?.options[1] === "7", JSON.stringify(r2.ask?.options[1]));
check("numeric enumerator stripped", r2.ask?.options[2] === "8", JSON.stringify(r2.ask?.options[2]));
check("bullet enumerator stripped", r2.ask?.options[3] === "9", JSON.stringify(r2.ask?.options[3]));

// ── 5. Backtick code options are preserved (renderer makes chips) ───────
const codeMsg = `[[ASK_OPTIONS: لو أردت أن تطبع كلمة "مرحبا" على الشاشة في Python، أي سطر يعمل؟ ||| \`print("مرحبا")\` ||| \`"مرحبا"\` ||| \`show("مرحبا")\` ||| غير ذلك]]`;
const r3 = extractAskOptions(codeMsg);
check("backtick option preserved", r3.ask?.options[0] === '`print("مرحبا")`', JSON.stringify(r3.ask?.options[0]));
check("question intact", r3.ask?.question.includes("أي سطر يعمل؟"), JSON.stringify(r3.ask?.question));

if (failures > 0) { console.error(`\n${failures} FAILURES`); process.exit(1); }
console.log("\nAll checks passed.");
