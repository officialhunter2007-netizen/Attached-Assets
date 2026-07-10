import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "python-instruction.json");
const OUT = path.join(ROOT, "python-instruction.json");

console.log("Reading file...");
const d = JSON.parse(fs.readFileSync(SRC, "utf-8"));

function fixConcepts(concepts) {
  if (!Array.isArray(concepts)) return concepts;
  return concepts.map((c) => {
    const fixed = { ...c };
    if ("name_ar" in fixed && !("name" in fixed)) {
      fixed.name = fixed.name_ar;
      delete fixed.name_ar;
    }
    if ("explanation_ar" in fixed && !("explanation" in fixed)) {
      fixed.explanation = fixed.explanation_ar;
      delete fixed.explanation_ar;
    }
    return fixed;
  });
}

function fixLesson(lesson) {
  return {
    ...lesson,
    concepts: fixConcepts(lesson.concepts),
  };
}

function fixExamBankQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    const out = {};
    out.kind = q.kind || "mcq";
    out.prompt = q.prompt || q.question || "";
    out.choices = q.choices || q.options || [];
    out.correct_index = typeof q.correct_index === "number" ? q.correct_index : (typeof q.correctIndex === "number" ? q.correctIndex : 0);
    out.explanation = q.explanation || "";
    out.difficulty = q.difficulty || 2;
    return out;
  });
}

function fixUnit(unit) {
  return {
    ...unit,
    lessons: (unit.lessons || []).map(fixLesson),
  };
}

function fixStage(stage) {
  const units = (stage.units || []).slice(0, 9).map(fixUnit);
  return {
    ...stage,
    units,
  };
}

function fixLevel(level) {
  return {
    ...level,
    stages: (level.stages || []).map(fixStage),
  };
}

console.log("Fixing concepts (name_ar → name, explanation_ar → explanation)...");
d.levels = (d.levels || []).map(fixLevel);

console.log("Fixing exam_banks (questions → variants format)...");
if (d.exam_banks) {
  ["unit_banks", "stage_banks", "level_banks"].forEach((bankType) => {
    if (!d.exam_banks[bankType]) return;
    Object.keys(d.exam_banks[bankType]).forEach((key) => {
      const bank = d.exam_banks[bankType][key];
      if (bank.variants) return;
      const qs = fixExamBankQuestions(bank.questions || []);
      d.exam_banks[bankType][key] = { variants: [qs] };
    });
  });
}

console.log("Writing fixed file...");
fs.writeFileSync(OUT, JSON.stringify(d, null, 0));

const stats = fs.statSync(OUT);
let totalLessons = 0;
let totalUnits = 0;
d.levels.forEach((lv) => {
  lv.stages?.forEach((st) => {
    totalUnits += st.units?.length || 0;
    st.units?.forEach((u) => {
      totalLessons += u.lessons?.length || 0;
    });
  });
});

console.log(`\nDone!`);
console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Levels: ${d.levels.length}`);
console.log(`  Total units: ${totalUnits}`);
console.log(`  Total lessons: ${totalLessons}`);
console.log(`  Placement questions: ${d.placement_test_questions?.length || 0}`);
