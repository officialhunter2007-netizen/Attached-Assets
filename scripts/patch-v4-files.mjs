import fs from "fs";
import path from "path";

const FILES = [
  "python-instruction.json",
];

const ROOT = path.resolve(new URL(import.meta.url).pathname, "..", "..");

const SEVERITY_MAP = {
  high: "critical",
  critical: "critical",
  medium: "major",
  major: "major",
  low: "minor",
  minor: "minor",
};

function normalizeSeverity(val) {
  if (!val) return "major";
  const key = String(val).toLowerCase().trim();
  return SEVERITY_MAP[key] ?? "major";
}

function patchLabQuestion(q) {
  if (!q) return q;
  if (!q.prompt && q.question) q.prompt = q.question;
  if (!q.prompt && q.stem) q.prompt = q.stem;
  if (!q.prompt) q.prompt = "صف كيف تطبق هذا المفهوم عملياً";
  let pts = Math.round(q.points ?? 5);
  if (pts < 1) pts = 1;
  if (pts > 10) pts = 10;
  q.points = pts;
  return q;
}

function patchLab(lab) {
  if (!lab) return lab;
  if (!lab.title && lab.name) lab.title = lab.name;
  if (!lab.title) lab.title = "مختبر تطبيقي";
  if (!lab.completion_criterion) {
    lab.completion_criterion = lab.name
      ? `يتمكن الطالب من إكمال ${lab.name} بنجاح وتطبيق المهارات المطلوبة`
      : "يتمكن الطالب من إكمال جميع مهام المعمل وتطبيق المفاهيم بشكل صحيح";
  }
  if (Array.isArray(lab.questions)) {
    lab.questions = lab.questions.map(patchLabQuestion);
  }
  return lab;
}

function patchConcept(concept) {
  if (!concept) return concept;
  if (!concept.mastery_criterion) {
    if (concept.explanation) {
      concept.mastery_criterion = concept.explanation;
    } else {
      concept.mastery_criterion = `يتقن الطالب مفهوم ${concept.name || "هذا المفهوم"} ويطبقه بشكل صحيح`;
    }
  }
  if (concept.weight !== undefined) {
    concept.weight = Math.max(1, Math.round(Number(concept.weight)));
  }
  return concept;
}

function patchMistake(m) {
  if (!m) return m;
  if (!m.mistake && m.description) m.mistake = m.description;
  if (!m.mistake && m.error) m.mistake = m.error;
  if (!m.mistake) m.mistake = "خطأ شائع في تطبيق هذا المفهوم";
  if (!m.treatment) {
    if (m.correction) {
      m.treatment = m.correction;
    } else if (m.solution) {
      m.treatment = m.solution;
    } else {
      m.treatment = `مراجعة المفهوم وإعادة التطبيق بالشكل الصحيح`;
    }
  }
  if (!m.correction) m.correction = m.treatment;
  m.severity = normalizeSeverity(m.severity);
  return m;
}

function patchPlacementQuestions(questions) {
  if (!Array.isArray(questions)) return questions;
  const total = questions.length;
  const levelsCount = 3;
  const perLevel = Math.ceil(total / levelsCount);
  return questions.map((q, i) => {
    const patched = { ...q };
    if (!patched.prompt && patched.question) patched.prompt = patched.question;
    if (!patched.prompt && patched.stem) patched.prompt = patched.stem;
    if (!patched.prompt) patched.prompt = "أجب على السؤال التالي";
    if (!patched.choices && patched.options) patched.choices = patched.options;
    if (patched.correct_index === undefined && patched.correctIndex !== undefined) {
      patched.correct_index = patched.correctIndex;
    }
    if (patched.target_level_index === undefined) {
      patched.target_level_index = Math.min(levelsCount, Math.floor(i / perLevel) + 1);
    }
    if (!patched.kind) patched.kind = "mcq";
    if (!patched.difficulty) patched.difficulty = 2;
    return patched;
  });
}

function patchFinalCheckQuestion(val) {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    return val.question || val.text || val.prompt || JSON.stringify(val).slice(0, 200);
  }
  return "ما الذي تعلمته من هذا الدرس؟";
}

function patchExamBanks(banks) {
  if (!banks) return banks;
  function isValidBank(v) {
    if (typeof v !== "object" || v === null) return false;
    return Array.isArray(v.variants);
  }
  function cleanBankRecord(record) {
    if (!record || typeof record !== "object") return {};
    const cleaned = {};
    for (const [k, v] of Object.entries(record)) {
      if (isValidBank(v)) cleaned[k] = v;
    }
    return cleaned;
  }
  if (banks.unit_banks) banks.unit_banks = cleanBankRecord(banks.unit_banks);
  if (banks.stage_banks) banks.stage_banks = cleanBankRecord(banks.stage_banks);
  if (banks.level_banks) banks.level_banks = cleanBankRecord(banks.level_banks);
  return banks;
}

function patchFile(raw) {
  if (raw.exam_banks) {
    raw.exam_banks = patchExamBanks(raw.exam_banks);
  }
  if (raw.placement_test_questions) {
    raw.placement_test_questions = patchPlacementQuestions(raw.placement_test_questions);
  }

  if (!raw.levels || !Array.isArray(raw.levels)) return raw;

  for (const level of raw.levels) {
    if (!level.stages) continue;
    for (const stage of level.stages) {
      if (!stage.units) continue;
      for (const unit of stage.units) {
        if (unit.labs && Array.isArray(unit.labs)) {
          unit.labs = unit.labs.map(patchLab);
        }
        if (unit.lessons && Array.isArray(unit.lessons)) {
          for (const lesson of unit.lessons) {
            if (lesson.concepts && Array.isArray(lesson.concepts)) {
              lesson.concepts = lesson.concepts.map(patchConcept);
              const seen = new Map();
              lesson.concepts = lesson.concepts.map((c) => {
                const orig = c.name || "";
                let name = orig;
                let count = seen.get(name) ?? 0;
                if (count > 0) name = `${orig} (${count + 1})`;
                seen.set(orig, count + 1);
                return name !== orig ? { ...c, name } : c;
              });
            }
            if (lesson.common_mistakes && Array.isArray(lesson.common_mistakes)) {
              lesson.common_mistakes = lesson.common_mistakes.map(patchMistake);
            }
            if (lesson.final_check_question !== undefined && typeof lesson.final_check_question !== "string") {
              lesson.final_check_question = patchFinalCheckQuestion(lesson.final_check_question);
            }
          }
        }
      }
    }
  }
  return raw;
}

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP ${file}: not found`);
    continue;
  }

  console.log(`Patching ${file}...`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const patched = patchFile(raw);
  fs.writeFileSync(filePath, JSON.stringify(patched));
  console.log(`  Done: ${file}`);
}

console.log("\nAll files patched.");
