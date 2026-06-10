// ── Types ──────────────────────────────────────────────────────────────────────

export type FieldStatus = "ok" | "empty" | "missing";
export type IssueSeverity = "error" | "warning";
export type NodeType = "specialty" | "level" | "stage" | "unit" | "lesson" | "lab" | "exam" | "field";

export interface FieldInfo {
  key: string;
  value: string;
  status: FieldStatus;
  isPlaceholder: boolean;
}

export interface ValidationIssue {
  type: IssueSeverity;
  code: string;
  path: string;
  field: string;
  message: string;
  line?: number;
}

export interface ParsedLesson {
  code: string;
  name: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  concepts: { name: string; explanation: string; mastery: string }[];
  mistakes: { mistake: string; correction: string; treatment: string }[];
  yemeniExamples: string[];
  line: number;
}

export interface ParsedLab {
  code: string;
  name: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  questions: { type: string; text: string }[];
  line: number;
}

export interface ParsedUnit {
  code: string;
  name: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  lessons: ParsedLesson[];
  labs: ParsedLab[];
  exam: ParsedExam | null;
  line: number;
}

export interface ParsedStage {
  code: string;
  name: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  units: ParsedUnit[];
  exam: ParsedExam | null;
  line: number;
}

export interface ParsedLevel {
  code: string;
  name: string;
  number: number;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  stages: ParsedStage[];
  exam: ParsedExam | null;
  line: number;
}

export interface ParsedExam {
  type: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  line: number;
}

export interface ParsedSpecialty {
  name: string;
  fields: Record<string, string>;
  rawFields: { name: string; value: string; line: number }[];
  line: number;
}

export interface ParseResult {
  specialty: ParsedSpecialty | null;
  levels: ParsedLevel[];
  issues: ValidationIssue[];
  stats: {
    levels: number;
    stages: number;
    units: number;
    lessons: number;
    labs: number;
    exams: number;
    totalFields: number;
    emptyFields: number;
    errors: number;
    warnings: number;
  };
  raw: string;
}

// ── JSON Input Types ───────────────────────────────────────────────────────────

export interface InstructionFileJSON {
  specialty: {
    name: string;
    fields: Record<string, string>;
  };
  levels: Array<{
    number: number;
    name: string;
    fields: Record<string, string>;
    stages: Array<{
      number: number;
      name: string;
      fields: Record<string, string>;
      units: Array<{
        number: number;
        name: string;
        fields: Record<string, string>;
        lessons: Array<{
          number: number;
          name: string;
          fields: Record<string, string>;
          concepts: Array<{
            name: string;
            explanation: string;
            mastery: string;
          }>;
          commonMistakes: Array<{
            mistake: string;
            correction: string;
            treatment: string;
          }>;
          yemeniExamples: string[];
        }>;
        labs: Array<{
          number: number;
          name: string;
          fields: Record<string, string>;
          questions: Array<{
            type: string;
            text: string;
          }>;
        }>;
        unitExam?: {
          fields: Record<string, string>;
        } | null;
      }>;
      stageExam?: {
        fields: Record<string, string>;
      } | null;
    }>;
    levelExam?: {
      fields: Record<string, string>;
    } | null;
  }>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EMPTY_PATTERNS = [/^\[\.\.\.\]$/, /^\[فارغ\]$/, /^\[\s*\]$/, /^\[.*\]$/];

const KNOWN_SPECIALTY_FIELDS = [
  "وصف عام", "الشخصية المستهدفة", "نبرة المعلم في هذا التخصص",
  "أمثلة من بيئة الطالب اليمني", "generalDescription", "targetAudience", "teacherTone", "yemeniExamples",
];

const KNOWN_LEVEL_FIELDS = ["هدف المستوى", "عدد المراحل", "عدد الوحدات", "levelGoal", "stageCount", "unitCount"];

const KNOWN_STAGE_FIELDS = ["هدف المرحلة", "عدد الوحدات", "stageGoal", "unitCount"];

const KNOWN_UNIT_FIELDS = [
  "هدف الوحدة", "المتطلبات السابقة", "يفتح لاحقاً", "المفاهيم الأساسية للوحدة",
  "unitGoal", "prerequisites", "unlocks", "coreConcepts",
];

const KNOWN_LESSON_FIELDS = [
  "هدف الدرس", "جملة الجسر", "المتطلبات السابقة", "يفتح لاحقاً",
  "سؤال التحقق النهائي", "معيار", "مدة الدرس المتوقعة", "تكلفة الجواهر التقديرية",
  "lessonGoal", "bridgeSentence", "prerequisites", "unlocks",
  "finalCheckQuestion", "masteryCriterion", "expectedDuration", "estimatedGemCost",
];

const KNOWN_LAB_FIELDS = ["السيناريو", "معيار الإكمال", "scenario", "completionCriterion"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function detectEmpty(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  for (const pat of EMPTY_PATTERNS) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

function codeFromParts(...parts: number[]): string {
  return parts.join(".");
}

function collectRawFields(obj: Record<string, string>): { name: string; value: string; line: number }[] {
  return Object.entries(obj).map(([name, value]) => ({ name, value, line: 0 }));
}

// ── Main Parser ────────────────────────────────────────────────────────────────

export function parseInstructionFile(input: string | InstructionFileJSON): ParseResult {
  const issues: ValidationIssue[] = [];

  let data: InstructionFileJSON;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch (e: any) {
      issues.push({
        type: "error",
        code: "INVALID_JSON",
        path: "",
        field: "",
        message: "محتوى الملف ليس JSON صحيحاً",
      });
      return {
        specialty: null,
        levels: [],
        issues,
        stats: { levels: 0, stages: 0, units: 0, lessons: 0, labs: 0, exams: 0, totalFields: 0, emptyFields: 0, errors: 1, warnings: 0 },
        raw: input,
      };
    }
  } else {
    data = input;
  }

  if (!data || typeof data !== "object" || !data.specialty || !Array.isArray(data.levels)) {
    issues.push({
      type: "error",
      code: "INVALID_STRUCTURE",
      path: "",
      field: "",
      message: "بنية JSON غير صحيحة — يجب أن يحتوي الملف على specialty و levels",
    });
    return {
      specialty: null,
      levels: [],
      issues,
      stats: { levels: 0, stages: 0, units: 0, lessons: 0, labs: 0, exams: 0, totalFields: 0, emptyFields: 0, errors: 1, warnings: 0 },
      raw: JSON.stringify(data, null, 2),
    };
  }

  const specialty = parseSpecialty(data.specialty, issues);
  const levels = data.levels.map((lvl, i) => parseLevel(lvl, i + 1, issues)).filter(Boolean) as ParsedLevel[];

  // Post-parse validation
  validateStructure(data, issues);
  validatePrerequisites(data, issues);

  const stats = computeStats(specialty, levels, issues);

  return {
    specialty,
    levels,
    issues,
    stats,
    raw: JSON.stringify(data, null, 2),
  };
}

// ── Parsing ────────────────────────────────────────────────────────────────────

function parseSpecialty(spec: InstructionFileJSON["specialty"], issues: ValidationIssue[]): ParsedSpecialty {
  if (!spec.name || detectEmpty(spec.name)) {
    issues.push({
      type: "error",
      code: "EMPTY_SPECIALTY_NAME",
      path: "specialty",
      field: "name",
      message: "اسم التخصص فارغ",
    });
  }

  const fields = spec.fields ?? {};
  for (const key of KNOWN_SPECIALTY_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: "specialty",
        field: key,
        message: `حقل "${key}" في التخصص فارغ`,
      });
    }
  }

  return {
    name: spec.name || "",
    fields,
    rawFields: collectRawFields(fields),
    line: 1,
  };
}

function parseLevel(lvl: InstructionFileJSON["levels"][0], expectedNumber: number, issues: ValidationIssue[]): ParsedLevel | null {
  if (lvl.number !== expectedNumber) {
    issues.push({
      type: "error",
      code: "LEVEL_NUMBER_MISMATCH",
      path: `level.${lvl.number}`,
      field: "number",
      message: `المستوى ${lvl.number} في الترتيب ${expectedNumber} — الأرقام يجب أن تكون 1-5 بالتسلسل`,
    });
  }

  if (!lvl.name || detectEmpty(lvl.name)) {
    issues.push({
      type: "error",
      code: "EMPTY_LEVEL_NAME",
      path: `level.${lvl.number}`,
      field: "name",
      message: `اسم المستوى ${lvl.number} فارغ`,
    });
  }

  const fields = lvl.fields ?? {};
  for (const key of KNOWN_LEVEL_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: `level.${lvl.number}`,
        field: key,
        message: `حقل "${key}" في المستوى ${lvl.number} فارغ`,
      });
    }
  }

  const stages = (lvl.stages ?? []).map((stg, i) => parseStage(stg, lvl.number, i + 1, issues)).filter(Boolean) as ParsedStage[];

  let levelExam: ParsedExam | null = null;
  if (lvl.levelExam) {
    levelExam = {
      type: "المستوى",
      fields: lvl.levelExam.fields ?? {},
      rawFields: collectRawFields(lvl.levelExam.fields ?? {}),
      line: 1,
    };
  }

  return {
    code: `${lvl.number}`,
    name: lvl.name || "",
    number: lvl.number,
    fields,
    rawFields: collectRawFields(fields),
    stages,
    exam: levelExam,
    line: 1,
  };
}

function parseStage(stg: InstructionFileJSON["levels"][0]["stages"][0], levelNum: number, stageNum: number, issues: ValidationIssue[]): ParsedStage | null {
  if (stg.number !== stageNum) {
    issues.push({
      type: "warning",
      code: "STAGE_NUMBER_MISMATCH",
      path: `level.${levelNum}.stage.${stg.number}`,
      field: "number",
      message: `المرحلة ${stg.number} في الترتيب ${stageNum} من المستوى ${levelNum}`,
    });
  }

  if (!stg.name || detectEmpty(stg.name)) {
    issues.push({
      type: "error",
      code: "EMPTY_STAGE_NAME",
      path: `level.${levelNum}.stage.${stg.number}`,
      field: "name",
      message: `اسم المرحلة ${codeFromParts(levelNum, stg.number)} فارغ`,
    });
  }

  const fields = stg.fields ?? {};
  for (const key of KNOWN_STAGE_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: `level.${levelNum}.stage.${stg.number}`,
        field: key,
        message: `حقل "${key}" في المرحلة ${codeFromParts(levelNum, stg.number)} فارغ`,
      });
    }
  }

  const units = (stg.units ?? []).map((u, i) => parseUnit(u, levelNum, stg.number, i + 1, issues)).filter(Boolean) as ParsedUnit[];

  let stageExam: ParsedExam | null = null;
  if (stg.stageExam) {
    stageExam = {
      type: "المرحلة",
      fields: stg.stageExam.fields ?? {},
      rawFields: collectRawFields(stg.stageExam.fields ?? {}),
      line: 1,
    };
  }

  return {
    code: codeFromParts(levelNum, stg.number),
    name: stg.name || "",
    fields,
    rawFields: collectRawFields(fields),
    units,
    exam: stageExam,
    line: 1,
  };
}

function parseUnit(u: InstructionFileJSON["levels"][0]["stages"][0]["units"][0], levelNum: number, stageNum: number, unitNum: number, issues: ValidationIssue[]): ParsedUnit | null {
  if (u.number !== unitNum) {
    issues.push({
      type: "warning",
      code: "UNIT_NUMBER_MISMATCH",
      path: `level.${levelNum}.stage.${stageNum}.unit.${u.number}`,
      field: "number",
      message: `الوحدة ${u.number} في الترتيب ${unitNum} من المرحلة ${codeFromParts(levelNum, stageNum)}`,
    });
  }

  if (!u.name || detectEmpty(u.name)) {
    issues.push({
      type: "error",
      code: "EMPTY_UNIT_NAME",
      path: `level.${levelNum}.stage.${stageNum}.unit.${u.number}`,
      field: "name",
      message: `اسم الوحدة ${codeFromParts(levelNum, stageNum, u.number)} فارغ`,
    });
  }

  const fields = u.fields ?? {};
  for (const key of KNOWN_UNIT_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: `level.${levelNum}.stage.${stageNum}.unit.${u.number}`,
        field: key,
        message: `حقل "${key}" في الوحدة ${codeFromParts(levelNum, stageNum, u.number)} فارغ`,
      });
    }
  }

  const code = codeFromParts(levelNum, stageNum, u.number);
  const lessons = (u.lessons ?? []).map((l, i) => parseLesson(l, levelNum, stageNum, u.number, i + 1, issues)).filter(Boolean) as ParsedLesson[];
  const labs = (u.labs ?? []).map((lb, i) => parseLab(lb, levelNum, stageNum, u.number, i + 1, issues)).filter(Boolean) as ParsedLab[];

  let unitExam: ParsedExam | null = null;
  if (u.unitExam) {
    unitExam = {
      type: "الوحدة",
      fields: u.unitExam.fields ?? {},
      rawFields: collectRawFields(u.unitExam.fields ?? {}),
      line: 1,
    };
  }

  return {
    code,
    name: u.name || "",
    fields,
    rawFields: collectRawFields(fields),
    lessons,
    labs,
    exam: unitExam,
    line: 1,
  };
}

function parseLesson(l: InstructionFileJSON["levels"][0]["stages"][0]["units"][0]["lessons"][0], levelNum: number, stageNum: number, unitNum: number, lessonNum: number, issues: ValidationIssue[]): ParsedLesson | null {
  if (l.number !== lessonNum) {
    issues.push({
      type: "warning",
      code: "LESSON_NUMBER_MISMATCH",
      path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
      field: "number",
      message: `الدرس ${l.number} في الترتيب ${lessonNum} من الوحدة ${codeFromParts(levelNum, stageNum, unitNum)}`,
    });
  }

  if (!l.name || detectEmpty(l.name)) {
    issues.push({
      type: "error",
      code: "EMPTY_LESSON_NAME",
      path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
      field: "name",
      message: `اسم الدرس ${codeFromParts(levelNum, stageNum, unitNum, l.number)} فارغ`,
    });
  }

  const fields = l.fields ?? {};
  for (const key of KNOWN_LESSON_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
        field: key,
        message: `حقل "${key}" في الدرس ${codeFromParts(levelNum, stageNum, unitNum, l.number)} فارغ`,
      });
    }
  }

  const code = codeFromParts(levelNum, stageNum, unitNum, l.number);
  const concepts = (l.concepts ?? []).map((c, i) => ({
    name: c.name || `مفهوم ${i + 1}`,
    explanation: c.explanation || "",
    mastery: c.mastery || "",
  }));
  const mistakes = (l.commonMistakes ?? []).map((m) => ({
    mistake: m.mistake || "",
    correction: m.correction || "",
    treatment: m.treatment || "",
  }));
  const yemeniExamples = l.yemeniExamples ?? [];

  // Validate bridge sentence length
  const bridgeSentence = fields["جملة الجسر"] ?? fields["bridgeSentence"] ?? "";
  if (bridgeSentence && !detectEmpty(bridgeSentence)) {
    const wordCount = bridgeSentence.split(/\s+/).length;
    if (wordCount < 10) {
      issues.push({
        type: "warning",
        code: "SHORT_BRIDGE",
        path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
        field: "جملة الجسر",
        message: `جملة الجسر في الدرس ${code} قصيرة (${wordCount} كلمة، المتوقع ≥ 10)`,
      });
    }
  }

  // Validate concepts exist
  if (concepts.length === 0) {
    issues.push({
      type: "error",
      code: "NO_CONCEPTS",
      path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
      field: "concepts",
      message: `الدرس ${code} لا يحتوي على مفاهيم جديدة`,
    });
  }

  // Validate examples exist
  if (yemeniExamples.length === 0) {
    issues.push({
      type: "error",
      code: "NO_EXAMPLES",
      path: `level.${levelNum}.stage.${stageNum}.unit.${unitNum}.lesson.${l.number}`,
      field: "yemeniExamples",
      message: `الدرس ${code} لا يحتوي على أمثلة يمنية (إلزامية)`,
    });
  }

  return {
    code,
    name: l.name || "",
    fields,
    rawFields: collectRawFields(fields),
    concepts,
    mistakes,
    yemeniExamples,
    line: 1,
  };
}

function parseLab(lb: InstructionFileJSON["levels"][0]["stages"][0]["units"][0]["labs"][0], levelNum: number, stageNum: number, unitNum: number, labNum: number, issues: ValidationIssue[]): ParsedLab | null {
  const code = `lab.${levelNum}.${stageNum}.${unitNum}.${labNum}`;
  const fields = lb.fields ?? {};

  for (const key of KNOWN_LAB_FIELDS) {
    if (!(key in fields)) continue;
    if (detectEmpty(fields[key] ?? "")) {
      issues.push({
        type: "error",
        code: "EMPTY_FIELD",
        path: code,
        field: key,
        message: `حقل "${key}" في المعمل ${code} فارغ`,
      });
    }
  }

  return {
    code,
    name: lb.name || `معمل ${labNum}`,
    fields,
    rawFields: collectRawFields(fields),
    questions: (lb.questions ?? []).map((q) => ({
      type: q.type || "عام",
      text: q.text || "",
    })),
    line: 1,
  };
}

// ── Structural Validation ──────────────────────────────────────────────────────

function validateStructure(data: InstructionFileJSON, issues: ValidationIssue[]): void {
  const levels = data.levels ?? [];

  if (levels.length === 0) {
    issues.push({
      type: "error", code: "NO_LEVELS", path: "", field: "",
      message: "الملف لا يحتوي على أي مستوى",
    });
    return;
  }

  // Check level numbers are 1-5
  const levelNums = levels.map(l => l.number).sort((a, b) => a - b);
  for (let i = 1; i <= 5; i++) {
    if (!levelNums.includes(i)) {
      issues.push({
        type: "error", code: "MISSING_LEVEL",
        path: `level.${i}`, field: "",
        message: `المستوى ${i} مفقود من الملف`,
      });
    }
  }

  if (levels.length > 5) {
    issues.push({
      type: "error", code: "TOO_MANY_LEVELS", path: "", field: "",
      message: `الملف يحتوي على ${levels.length} مستوى (الحد الأقصى: 5)`,
    });
  }

  // Check stage count per level
  for (const level of levels) {
    const stages = level.stages ?? [];
    if (stages.length !== 7) {
      issues.push({
        type: "warning", code: "STAGE_COUNT",
        path: `level.${level.number}`, field: "عدد المراحل",
        message: `المستوى ${level.number} يحتوي على ${stages.length} مرحلة (المتوقع: 7)`,
      });
    }

    // Check stage numbers
    const stageNums = stages.map(s => s.number).sort((a, b) => a - b);
    if (stageNums.length > 0) {
      for (let i = 1; i <= Math.max(stageNums.length, 7); i++) {
        if (!stageNums.includes(i)) {
          issues.push({
            type: "warning", code: "MISSING_STAGE",
            path: `level.${level.number}`, field: "",
            message: `المرحلة ${i} مفقودة من المستوى ${level.number}`,
          });
        }
      }
    }

    // Check units per stage
    for (const stage of stages) {
      const units = stage.units ?? [];
      if (units.length !== 9) {
        issues.push({
          type: "warning", code: "UNIT_COUNT",
          path: `level.${level.number}.stage.${stage.number}`, field: "عدد الوحدات",
          message: `المرحلة ${codeFromParts(level.number, stage.number)} تحتوي على ${units.length} وحدة (المتوقع: 9)`,
        });
      }

      // Check unit numbers
      const unitNums = units.map(u => u.number).sort((a, b) => a - b);
      if (unitNums.length > 0) {
        for (let i = 1; i <= 9; i++) {
          if (!unitNums.includes(i)) {
            issues.push({
              type: "warning", code: "MISSING_UNIT",
              path: `level.${level.number}.stage.${stage.number}`, field: "",
              message: `الوحدة ${i} مفقودة من المرحلة ${codeFromParts(level.number, stage.number)}`,
            });
          }
        }
      }

      // Check lessons per unit
      for (const unit of units) {
        const lessons = unit.lessons ?? [];
        const lessonNums = lessons.map(l => l.number).sort((a, b) => a - b);
        if (lessonNums.length > 0) {
          for (let i = 1; i <= 10; i++) {
            if (!lessonNums.includes(i)) {
              issues.push({
                type: "warning", code: "MISSING_LESSON",
                path: `level.${level.number}.stage.${stage.number}.unit.${unit.number}`, field: "",
                message: `الدرس ${i} مفقود من الوحدة ${codeFromParts(level.number, stage.number, unit.number)}`,
              });
            }
          }
        }

        // Validate lab count (2-5)
        const labs = unit.labs ?? [];
        if (labs.length > 0 && (labs.length < 2 || labs.length > 5)) {
          issues.push({
            type: "warning", code: "LAB_COUNT",
            path: `level.${level.number}.stage.${stage.number}.unit.${unit.number}`, field: "عدد المعامل",
            message: `الوحدة ${codeFromParts(level.number, stage.number, unit.number)} تحتوي على ${labs.length} معمل (المتوقع: 2-5)`,
          });
        }
      }
    }
  }
}

// ── Prerequisite Validation ────────────────────────────────────────────────────

function validatePrerequisites(data: InstructionFileJSON, issues: ValidationIssue[]): void {
  const validCodes = new Set<string>();

  for (const level of data.levels ?? []) {
    validCodes.add(`${level.number}`);
    for (const stage of level.stages ?? []) {
      validCodes.add(codeFromParts(level.number, stage.number));
      for (const unit of stage.units ?? []) {
        const unitCode = codeFromParts(level.number, stage.number, unit.number);
        validCodes.add(unitCode);
        for (const lesson of unit.lessons ?? []) {
          validCodes.add(codeFromParts(level.number, stage.number, unit.number, lesson.number));
        }
      }
    }
  }

  for (const level of data.levels ?? []) {
    for (const stage of level.stages ?? []) {
      for (const unit of stage.units ?? []) {
        const unitCode = codeFromParts(level.number, stage.number, unit.number);
        const prereqStr = unit.fields?.["المتطلبات السابقة"] ?? unit.fields?.prerequisites ?? "";
        if (!detectEmpty(prereqStr) && prereqStr !== "لا يوجد" && prereqStr !== "none") {
          const prereqs = prereqStr.split(/[,،\s]+/).filter(Boolean);
          for (const prereq of prereqs) {
            const clean = prereq.replace(/[^\d.]/g, "");
            if (clean && !validCodes.has(clean)) {
              issues.push({
                type: "error", code: "INVALID_PREREQ",
                path: `level.${level.number}.stage.${stage.number}.unit.${unit.number}`,
                field: "المتطلبات السابقة",
                message: `الوحدة ${unitCode}: المتطلب السابق "${prereq}" غير موجود في المنهج`,
              });
            }
          }
        }

        for (const lesson of unit.lessons ?? []) {
          const lessonCode = codeFromParts(level.number, stage.number, unit.number, lesson.number);
          const lessonPrereqStr = lesson.fields?.["المتطلبات السابقة"] ?? lesson.fields?.prerequisites ?? "";
          if (!detectEmpty(lessonPrereqStr) && lessonPrereqStr !== "لا يوجد" && lessonPrereqStr !== "none") {
            const prereqs = lessonPrereqStr.split(/[,،\s]+/).filter(Boolean);
            for (const prereq of prereqs) {
              const clean = prereq.replace(/[^\d.]/g, "");
              if (clean && !validCodes.has(clean)) {
                issues.push({
                  type: "error", code: "INVALID_PREREQ",
                  path: `level.${level.number}.stage.${stage.number}.unit.${unit.number}.lesson.${lesson.number}`,
                  field: "المتطلبات السابقة",
                  message: `الدرس ${lessonCode}: المتطلب السابق "${prereq}" غير موجود في المنهج`,
                });
              }
            }
          }
        }
      }
    }
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

function computeStats(specialty: ParsedSpecialty | null, levels: ParsedLevel[], issues: ValidationIssue[]): ParseResult["stats"] {
  let stages = 0;
  let units = 0;
  let lessons = 0;
  let labs = 0;
  let exams = 0;
  let totalFields = 0;
  let emptyFields = 0;

  if (specialty) {
    totalFields += Object.keys(specialty.fields).length;
    emptyFields += Object.values(specialty.fields).filter(v => detectEmpty(v)).length;
  }

  for (const level of levels) {
    totalFields += Object.keys(level.fields).length;
    emptyFields += Object.values(level.fields).filter(v => detectEmpty(v)).length;
    if (level.exam) exams++;

    for (const stage of level.stages) {
      stages++;
      totalFields += Object.keys(stage.fields).length;
      emptyFields += Object.values(stage.fields).filter(v => detectEmpty(v)).length;
      if (stage.exam) exams++;

      for (const unit of stage.units) {
        units++;
        totalFields += Object.keys(unit.fields).length;
        emptyFields += Object.values(unit.fields).filter(v => detectEmpty(v)).length;
        if (unit.exam) exams++;

        for (const lesson of unit.lessons) {
          lessons++;
          totalFields += Object.keys(lesson.fields).length;
          emptyFields += Object.values(lesson.fields).filter(v => detectEmpty(v)).length;
        }

        for (const lab of unit.labs) {
          labs++;
          totalFields += Object.keys(lab.fields).length;
          emptyFields += Object.values(lab.fields).filter(v => detectEmpty(v)).length;
        }
      }
    }
  }

  const errors = issues.filter(i => i.type === "error").length;
  const warnings = issues.filter(i => i.type === "warning").length;

  return { levels: levels.length, stages, units, lessons, labs, exams, totalFields, emptyFields, errors, warnings };
}
