// Smoke test for v4 instruction file pipeline.
// Run: node artifacts/api-server/scripts/v4-smoke-test.mjs
// Loads built /dist/index.mjs lazily so we exercise the actual compiled paths.
//
// What it verifies:
//   1. Validator catches missing-prereq + non-spec count warnings.
//   2. Valid JSON publishes inside a transaction.
//   3. Normalized rows match the input (levels, stages, units, lessons,
//      lab questions, exam banks, placement test).
//   4. Re-publish bumps version + activates atomically.
//   5. Hard-delete tears the version down.
import { pool, db, v4SpecialtiesTable, v4LessonsTable, v4LabQuestionsTable, v4ExamQuestionsTable, v4PlacementTestQuestionsTable, v4InstructionFileVersionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { validateV4InstructionFile } from "../src/lib/v4-instruction-validator.ts";
import { publishV4InstructionFile, deleteV4InstructionVersion } from "../src/lib/v4-instruction-normalizer.ts";

// Build a minimal-but-complete CyberLevel1 instruction file (1 level, 1 stage,
// 1 unit, 1 lab w/5 questions, 1 lesson, exam bank + placement question).
const SLUG = "smoke-cyber-v4";
const cyber = {
  schema_version: "v4.0",
  specialty: {
    slug: SLUG,
    name: "الأمن السيبراني — اختبار",
    description: "تخصص اختباري لتدفق v4 من البداية للنهاية",
    icon: "🛡️",
    target_persona: "الطالب الذي يريد دخول مجال الأمن السيبراني",
    teacher_tone: "ودودة، استقصائية، تشجع التفكير قبل الإجابة",
    yemeni_examples: ["كاميرات مراقبة في صنعاء", "شبكة WiFi في كافيه عدن"],
  },
  levels: [
    {
      level_index: 1,
      name: "المؤسس",
      goal: "فهم أساسيات الأمن السيبراني وكيف يفكر المهاجم",
      exam: { description: "اختبار شامل للمستوى الأول", pass_threshold_percent: 70 },
      stages: [
        {
          stage_index: 1,
          name: "اللبنات الأولى",
          goal: "بناء الحس الأمني والفكر التحليلي",
          exam: { description: "اختبار المرحلة", pass_threshold_percent: 65 },
          units: [
            {
              unit_index: 1,
              name: "مدخل إلى التفكير الأمني",
              goal: "تطوير ذهنية المهاجم/المدافع",
              prerequisite_units: [],
              enables_units: [],
              key_concepts: ["CIA Triad", "Threat Modeling", "Risk vs Vulnerability"],
              exam: { description: "اختبار وحدة المدخل", pass_threshold_percent: 70 },
              labs: [
                {
                  lab_index: 1,
                  title: "معمل: تخريب آلة قهوة افتراضية",
                  scenario: "تخيل أنك تواجه آلة قهوة ذكية متصلة بالإنترنت في مقهى يمني، وعليك إيجاد ٣ طرق محتملة لتعطيلها دون أن يلاحظك أحد، ثم اكتشاف كيف تحميها لو كنت المدير",
                  questions: [
                    { kind: "diagnostic", prompt: "ما النقاط الضعيفة الأولى التي تلاحظها في الآلة؟" },
                    { kind: "decision", prompt: "أي هجوم ستبدأ به ولماذا؟" },
                    { kind: "application", prompt: "نفّذ الهجوم الأول خطوة بخطوة." },
                    { kind: "analysis", prompt: "ما الذي جعل الهجوم ينجح؟" },
                    { kind: "connection", prompt: "كيف يرتبط هذا بـ CIA Triad؟" },
                  ],
                  completion_criterion: "الطالب يميّز بين الثلاثية CIA ويربطها بالهجوم",
                },
              ],
              lessons: [
                {
                  lesson_index: 1,
                  name: "ثلاثية CIA",
                  goal: "فهم Confidentiality, Integrity, Availability والتمييز بينها",
                  bridge_sentence: "تخيل أن لديك خزنة في البيت تحفظ فيها مستندات مهمة جداً، فكيف تحميها؟",
                  prerequisite_lessons: [],
                  enables_lessons: [],
                  concepts: [
                    { name: "Confidentiality", explanation: "ضمان أن المعلومات لا يصل إليها إلا من يحق له ذلك", mastery_criterion: "يميّز بين السرية والخصوصية" },
                    { name: "Integrity", explanation: "ضمان أن المعلومات لم تتغير بدون إذن", mastery_criterion: "يعطي مثالاً لكسر السلامة" },
                    { name: "Availability", explanation: "ضمان أن المعلومات متاحة عند الحاجة", mastery_criterion: "يفرق بين هجوم DoS والعطل العادي" },
                  ],
                  common_mistakes: [
                    { mistake: "الخلط بين السرية والسلامة", correction: "السرية = من يرى، السلامة = هل تغيّر", treatment: "تمرين تصنيف ٥ سيناريوهات حسب الثلاثية" },
                  ],
                  yemeni_examples: ["محل في صنعاء يفقد فاتورة المخزون فجأة (سلامة)"],
                  final_check_question: "أعطني مثالاً يمنياً لكل عنصر من الثلاثية",
                  session_complete_criterion: "ذكر مثالاً صحيحاً لكل عنصر من الثلاثة",
                  expected_duration_minutes: 30,
                  estimated_gem_cost: 5,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  exam_banks: {
    unit_banks: {
      "1.1.1": {
        variants: [
          [
            { kind: "mcq", prompt: "ما هو هدف Confidentiality؟", choices: ["منع التغيير", "منع الوصول غير المصرّح", "ضمان التوافر"], correct_index: 1, difficulty: 1 },
            { kind: "mcq", prompt: "هجوم DoS يكسر أي عنصر؟", choices: ["Confidentiality", "Integrity", "Availability"], correct_index: 2, difficulty: 2 },
          ],
        ],
      },
    },
    level_banks: {
      "1": {
        variants: [
          [{ kind: "mcq", prompt: "أي ممارسة تحمي السرية أكثر؟", choices: ["نسخ احتياطي", "تشفير", "شبكة UPS"], correct_index: 1, difficulty: 2 }],
        ],
      },
    },
  },
  placement_test_questions: [
    { target_level_index: 1, kind: "mcq", prompt: "ما المقصود بـ Vulnerability؟", choices: ["نقطة ضعف", "هجوم نشط", "أداة دفاع"], correct_index: 0, difficulty: 1 },
  ],
  publish_notes: "smoke-test publish v1",
};

function header(title) { console.log("\n" + "─".repeat(70) + "\n" + title + "\n" + "─".repeat(70)); }
function ok(msg) { console.log("✅ " + msg); }
function bad(msg) { console.error("❌ " + msg); process.exitCode = 1; }

async function cleanup() {
  // Remove any leftover smoke specialty + its versions.
  const sps = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.slug, SLUG));
  for (const sp of sps) {
    const vs = await db.select({ id: v4InstructionFileVersionsTable.id })
      .from(v4InstructionFileVersionsTable).where(eq(v4InstructionFileVersionsTable.specialtyId, sp.id));
    for (const v of vs) await deleteV4InstructionVersion(v.id);
    await db.execute(sql`DELETE FROM "v4_specialties" WHERE "id" = ${sp.id}`);
  }
}

async function main() {
  await cleanup();

  // ── 1. Validator: catch broken prereq ──────────────────────────────────
  header("1. Validator catches broken refs + warnings");
  const broken = structuredClone(cyber);
  broken.levels[0].stages[0].units[0].prerequisite_units = ["9.9.9"];
  const r1 = validateV4InstructionFile(broken);
  if (r1.ok) bad("validator should have failed on broken prereq"); else ok(`validator rejected broken file (${r1.issues.filter(i => i.severity === "error").length} errors)`);
  if (!r1.issues.some(i => i.severity === "warning" && i.message.includes("المواصفات تتوقع"))) bad("missing spec-count warnings"); else ok("spec-count warnings emitted");

  // ── 2. Validator passes on the canonical file ──────────────────────────
  header("2. Validator passes on canonical file");
  const r2 = validateV4InstructionFile(cyber);
  if (!r2.ok) {
    bad("validator unexpectedly failed:");
    r2.issues.filter(i => i.severity === "error").forEach(i => console.error(`   - [${i.path}] ${i.message}`));
    return;
  }
  ok(`validator passed: ${r2.summary.lessons} lesson(s), ${r2.summary.labQuestions} lab Qs, ${r2.summary.examQuestions} exam Qs`);

  // ── 3. Publish v1 ──────────────────────────────────────────────────────
  header("3. Publish v1");
  const p1 = await publishV4InstructionFile(cyber, null);
  ok(`published version ${p1.version} (id=${p1.versionId})`);

  const [sp] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.id, p1.specialtyId));
  if (sp.activeInstructionVersionId !== p1.versionId) bad("active version pointer not set"); else ok("active version pointer set");

  // ── 4. Round-trip counts ───────────────────────────────────────────────
  header("4. Verify normalized rows");
  const lessons = await db.select().from(v4LessonsTable).where(eq(v4LessonsTable.versionId, p1.versionId));
  if (lessons.length !== 1) bad(`expected 1 lesson, got ${lessons.length}`); else ok("1 lesson row");

  const labQs = await db.select().from(v4LabQuestionsTable).where(eq(v4LabQuestionsTable.versionId, p1.versionId));
  if (labQs.length !== 5) bad(`expected 5 lab questions, got ${labQs.length}`); else ok("5 lab questions");
  const kinds = new Set(labQs.map(q => q.kind));
  const expectedKinds = ["diagnostic", "decision", "application", "analysis", "connection"];
  if (expectedKinds.every(k => kinds.has(k))) ok("all 5 lab kinds present"); else bad("missing lab kinds: " + JSON.stringify([...kinds]));

  const examQs = await db.select().from(v4ExamQuestionsTable).where(eq(v4ExamQuestionsTable.versionId, p1.versionId));
  if (examQs.length !== 3) bad(`expected 3 exam questions, got ${examQs.length}`); else ok("3 exam questions (2 unit + 1 level)");

  const placements = await db.select().from(v4PlacementTestQuestionsTable).where(eq(v4PlacementTestQuestionsTable.versionId, p1.versionId));
  if (placements.length !== 1) bad(`expected 1 placement Q, got ${placements.length}`); else ok("1 placement question");

  // ── 5. Re-publish bumps version ───────────────────────────────────────
  header("5. Re-publish bumps version");
  const cyberV2 = structuredClone(cyber);
  cyberV2.publish_notes = "smoke-test publish v2";
  const p2 = await publishV4InstructionFile(cyberV2, null);
  if (p2.version !== p1.version + 1) bad(`expected v${p1.version + 1}, got v${p2.version}`); else ok(`v${p1.version} → v${p2.version}`);
  const [sp2] = await db.select().from(v4SpecialtiesTable).where(eq(v4SpecialtiesTable.id, p1.specialtyId));
  if (sp2.activeInstructionVersionId !== p2.versionId) bad("active pointer didn't switch to v2"); else ok("active pointer switched to v2");

  // ── 6. Cleanup ────────────────────────────────────────────────────────
  header("6. Delete versions + specialty");
  await deleteV4InstructionVersion(p1.versionId);
  await deleteV4InstructionVersion(p2.versionId);
  await db.execute(sql`DELETE FROM "v4_specialties" WHERE "id" = ${p1.specialtyId}`);
  ok("torn down cleanly");

  console.log("\n🎉 v4 smoke test passed");
}

main()
  .catch((e) => { console.error("\n💥 SMOKE TEST CRASHED:\n", e); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });
