// ─────────────────────────────────────────────────────────────────────────────
// Cross-reference + numbering + structural validator for v4 instruction files.
//
// Runs on top of `v4InstructionFileSchema.safeParse(...)` to catch issues
// Zod can't express:
//   - Stage/unit/lesson/lab numbering matches their position in the tree.
//   - Every prerequisite_unit / prerequisite_lesson / enables_* code refers
//     to a code that actually exists in the same file.
//   - No cycles in the prerequisite graph.
//   - Lab questions have one of each kind (no duplicate kinds).
//   - exam_banks keys refer to existing unit/stage/level codes.
//   - Warnings (non-blocking): bridge_sentence < 10 words, missing exam
//     banks for codes that exist, count mismatches vs spec (5/7/9/10).
//
// Every error/warning carries a `path` string pointing at the JSON location
// (e.g. `levels[0].stages[1].units[2].lessons[3].bridge_sentence`) so the
// admin UI can highlight it inline.
// ─────────────────────────────────────────────────────────────────────────────
import { v4InstructionFileSchema, type V4InstructionFileJson } from "@workspace/db";
import { z } from "zod/v4";

export type V4ValidationIssue = {
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type V4ValidationReport = {
  ok: boolean;
  // Successfully parsed JSON (only present when shape passes Zod). Cross-ref
  // errors may still set ok=false even when parsed is present.
  parsed?: V4InstructionFileJson;
  issues: V4ValidationIssue[];
  // Cached summary inserted into instruction_file_versions.parsed_summary
  // so the admin list page can show counts without re-parsing.
  summary: {
    levels: number;
    stages: number;
    units: number;
    lessons: number;
    labs: number;
    labQuestions: number;
    concepts: number;
    commonMistakes: number;
    examQuestions: number;
    placementQuestions: number;
  };
};

const EXPECTED_LAB_KINDS = ["diagnostic", "decision", "application", "analysis", "connection"] as const;

// Spec-recommended counts (§9.2). Mismatches are *warnings*, not errors —
// the admin should be able to publish a partial file.
const SPEC = { levels: 5, stagesPerLevel: 7, unitsPerStage: 9, lessonsPerUnit: 10 };

function joinPath(parts: Array<string | number>): string {
  let out = "";
  for (const p of parts) {
    if (typeof p === "number") out += `[${p}]`;
    else out += out ? `.${p}` : p;
  }
  return out;
}

function emptySummary(): V4ValidationReport["summary"] {
  return {
    levels: 0, stages: 0, units: 0, lessons: 0, labs: 0, labQuestions: 0,
    concepts: 0, commonMistakes: 0, examQuestions: 0, placementQuestions: 0,
  };
}

/**
 * Validate the raw JSON document. Returns a structured report with errors
 * and warnings keyed by path. Never throws — even malformed input returns
 * a report with `ok: false`.
 */
export function validateV4InstructionFile(rawJson: unknown): V4ValidationReport {
  const issues: V4ValidationIssue[] = [];
  const summary = emptySummary();

  // ─── Stage 1: Zod shape parse ───────────────────────────────────────────
  const parseResult = v4InstructionFileSchema.safeParse(rawJson);
  if (!parseResult.success) {
    for (const err of parseResult.error.issues) {
      issues.push({
        severity: "error",
        path: joinPath(err.path as Array<string | number>),
        message: err.message,
      });
    }
    return { ok: false, issues, summary };
  }

  const parsed = parseResult.data;

  // ─── Stage 2: numbering + tree walk + summary counts ────────────────────
  // Collect every code we'll need to verify cross-references against.
  const unitCodes = new Set<string>();
  const lessonCodes = new Set<string>();
  const levelIndices = new Set<number>();
  const stageCodes = new Set<string>();
  const labCodes = new Set<string>();

  summary.levels = parsed.levels.length;

  parsed.levels.forEach((level, lIdx) => {
    const lvIdx = level.level_index ?? lIdx + 1;
    if (levelIndices.has(lvIdx)) {
      issues.push({
        severity: "error",
        path: joinPath(["levels", lIdx, "level_index"]),
        message: `رقم المستوى ${lvIdx} مكرر`,
      });
    }
    levelIndices.add(lvIdx);

    summary.stages += level.stages.length;
    level.stages.forEach((stage, sIdx) => {
      const stIdx = stage.stage_index ?? sIdx + 1;
      const stageCode = `${lvIdx}.${stIdx}`;
      if (stageCodes.has(stageCode)) {
        issues.push({
          severity: "error",
          path: joinPath(["levels", lIdx, "stages", sIdx]),
          message: `كود المرحلة ${stageCode} مكرر`,
        });
      }
      stageCodes.add(stageCode);

      summary.units += stage.units.length;
      stage.units.forEach((unit, uIdx) => {
        const uxIdx = unit.unit_index ?? uIdx + 1;
        const unitCode = `${stageCode}.${uxIdx}`;
        if (unitCodes.has(unitCode)) {
          issues.push({
            severity: "error",
            path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx]),
            message: `كود الوحدة ${unitCode} مكرر`,
          });
        }
        unitCodes.add(unitCode);

        // Labs ----------------------------------------------------------
        summary.labs += unit.labs.length;
        unit.labs.forEach((lab, labIdx) => {
          const labI = lab.lab_index ?? labIdx + 1;
          const labCode = `${unitCode}.م${labI}`;
          if (labCodes.has(labCode)) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "labs", labIdx]),
              message: `كود المعمل ${labCode} مكرر`,
            });
          }
          labCodes.add(labCode);
          summary.labQuestions += lab.questions.length;

          // Lab questions must cover all 5 kinds exactly once.
          const kinds = lab.questions.map((q) => q.kind);
          const missingKinds = EXPECTED_LAB_KINDS.filter((k) => !kinds.includes(k));
          if (missingKinds.length > 0) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "labs", labIdx, "questions"]),
              message: `أنواع أسئلة مفقودة من المعمل: ${missingKinds.join("، ")}`,
            });
          }
          if (new Set(kinds).size !== kinds.length) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "labs", labIdx, "questions"]),
              message: `أنواع أسئلة المعمل مكررة — كل نوع يجب أن يظهر مرة واحدة`,
            });
          }
        });

        // Lessons ------------------------------------------------------
        summary.lessons += unit.lessons.length;
        unit.lessons.forEach((lesson, lessIdx) => {
          const lsIdx = lesson.lesson_index ?? lessIdx + 1;
          const lessonCode = `${unitCode}.${lsIdx}`;
          if (lessonCodes.has(lessonCode)) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx]),
              message: `كود الدرس ${lessonCode} مكرر`,
            });
          }
          lessonCodes.add(lessonCode);
          summary.concepts += lesson.concepts.length;
          summary.commonMistakes += lesson.common_mistakes.length;

          // Bridge sentence warning — < 10 words is allowed but flagged.
          const words = lesson.bridge_sentence.trim().split(/\s+/).filter(Boolean).length;
          if (words < 10) {
            issues.push({
              severity: "warning",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx, "bridge_sentence"]),
              message: `جملة الجسر قصيرة (${words} كلمات) — يُستحسن ≥١٠ كلمات`,
            });
          }
        });

        // Spec count warnings (§9.2) for units/lessons.
        if (unit.lessons.length !== SPEC.lessonsPerUnit) {
          issues.push({
            severity: "warning",
            path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons"]),
            message: `الوحدة فيها ${unit.lessons.length} دروس — المواصفات تتوقع ${SPEC.lessonsPerUnit}`,
          });
        }
      });

      if (stage.units.length !== SPEC.unitsPerStage) {
        issues.push({
          severity: "warning",
          path: joinPath(["levels", lIdx, "stages", sIdx, "units"]),
          message: `المرحلة فيها ${stage.units.length} وحدات — المواصفات تتوقع ${SPEC.unitsPerStage}`,
        });
      }
    });

    if (level.stages.length !== SPEC.stagesPerLevel) {
      issues.push({
        severity: "warning",
        path: joinPath(["levels", lIdx, "stages"]),
        message: `المستوى فيه ${level.stages.length} مراحل — المواصفات تتوقع ${SPEC.stagesPerLevel}`,
      });
    }
  });

  if (parsed.levels.length !== SPEC.levels) {
    issues.push({
      severity: "warning",
      path: "levels",
      message: `الملف فيه ${parsed.levels.length} مستويات — المواصفات تتوقع ${SPEC.levels}`,
    });
  }

  // ─── Stage 3: cross-reference checks ────────────────────────────────────
  // Build adjacency for cycle detection.
  const unitGraph = new Map<string, string[]>();
  const lessonGraph = new Map<string, string[]>();

  parsed.levels.forEach((level, lIdx) => {
    const lvIdx = level.level_index ?? lIdx + 1;
    level.stages.forEach((stage, sIdx) => {
      const stIdx = stage.stage_index ?? sIdx + 1;
      const stageCode = `${lvIdx}.${stIdx}`;
      stage.units.forEach((unit, uIdx) => {
        const uxIdx = unit.unit_index ?? uIdx + 1;
        const unitCode = `${stageCode}.${uxIdx}`;

        for (const prereq of unit.prerequisite_units) {
          if (!unitCodes.has(prereq)) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "prerequisite_units"]),
              message: `الوحدة ${unitCode}: متطلب سابق غير موجود "${prereq}"`,
            });
          }
        }
        for (const en of unit.enables_units) {
          if (!unitCodes.has(en)) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "enables_units"]),
              message: `الوحدة ${unitCode}: enables_units يشير لوحدة غير موجودة "${en}"`,
            });
          }
        }
        unitGraph.set(unitCode, [...unit.prerequisite_units]);

        unit.lessons.forEach((lesson, lessIdx) => {
          const lsIdx = lesson.lesson_index ?? lessIdx + 1;
          const lessonCode = `${unitCode}.${lsIdx}`;
          for (const prereq of lesson.prerequisite_lessons) {
            if (!lessonCodes.has(prereq)) {
              issues.push({
                severity: "error",
                path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx, "prerequisite_lessons"]),
                message: `الدرس ${lessonCode}: متطلب سابق غير موجود "${prereq}"`,
              });
            }
          }
          for (const en of lesson.enables_lessons) {
            if (!lessonCodes.has(en)) {
              issues.push({
                severity: "error",
                path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx, "enables_lessons"]),
                message: `الدرس ${lessonCode}: enables_lessons يشير لدرس غير موجود "${en}"`,
              });
            }
          }
          lessonGraph.set(lessonCode, [...lesson.prerequisite_lessons]);
        });
      });
    });
  });

  // Cycle detection via DFS (iterative to avoid stack blow-ups).
  function findCycle(graph: Map<string, string[]>): string[] | null {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const node of graph.keys()) color.set(node, WHITE);

    for (const start of graph.keys()) {
      if (color.get(start) !== WHITE) continue;
      // [node, neighbours iterator, pathSoFar]
      const stack: Array<{ node: string; it: Iterator<string>; path: string[] }> = [];
      color.set(start, GRAY);
      stack.push({ node: start, it: (graph.get(start) ?? [])[Symbol.iterator](), path: [start] });

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const next = top.it.next();
        if (next.done) {
          color.set(top.node, BLACK);
          stack.pop();
          continue;
        }
        const child = next.value;
        if (!graph.has(child)) continue; // unknown ref already reported
        const c = color.get(child) ?? WHITE;
        if (c === GRAY) {
          // Cycle: slice path from where child first appeared.
          const idx = top.path.indexOf(child);
          return [...top.path.slice(idx), child];
        }
        if (c === BLACK) continue;
        color.set(child, GRAY);
        stack.push({ node: child, it: (graph.get(child) ?? [])[Symbol.iterator](), path: [...top.path, child] });
      }
    }
    return null;
  }

  const unitCycle = findCycle(unitGraph);
  if (unitCycle) {
    issues.push({
      severity: "error",
      path: "levels[*].stages[*].units[*].prerequisite_units",
      message: `حلقة اعتمادية في الوحدات: ${unitCycle.join(" → ")}`,
    });
  }
  const lessonCycle = findCycle(lessonGraph);
  if (lessonCycle) {
    issues.push({
      severity: "error",
      path: "levels[*].stages[*].units[*].lessons[*].prerequisite_lessons",
      message: `حلقة اعتمادية في الدروس: ${lessonCycle.join(" → ")}`,
    });
  }

  // ─── Stage 3.5 (v4.1): cross-checks for the new optional fields ────────
  // These checks fire for both v4.0 and v4.1 files — when the field is
  // absent we simply skip. Only `pass_threshold_percent` bounds are
  // enforced regardless of schema_version because the old schema also
  // accepts arbitrary 0..100 values and a 5% pass rate is clearly a bug.
  const isV41 = parsed.schema_version === "v4.1";

  const checkExamMeta = (em: any, path: string) => {
    if (!em) return;
    const pt = em.pass_threshold_percent;
    if (typeof pt === "number" && (pt < 40 || pt > 95)) {
      issues.push({
        severity: "warning",
        path: `${path}.pass_threshold_percent`,
        message: `عتبة النجاح ${pt}% خارج النطاق الموصى به (40-95)`,
      });
    }
  };

  parsed.levels.forEach((level, lIdx) => {
    checkExamMeta(level.exam, joinPath(["levels", lIdx, "exam"]));
    level.stages.forEach((stage, sIdx) => {
      checkExamMeta(stage.exam, joinPath(["levels", lIdx, "stages", sIdx, "exam"]));
      stage.units.forEach((unit, uIdx) => {
        checkExamMeta(unit.exam, joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "exam"]));

        unit.lessons.forEach((lesson, lessIdx) => {
          // Duplicate concept names within a lesson — a frequent admin typo
          // that confuses the weighted mastery gate (two concepts share
          // the same name but different indices).
          const names = lesson.concepts.map((c) => c.name.trim());
          const dupes = names.filter((n, i) => names.indexOf(n) !== i);
          if (dupes.length > 0) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx, "concepts"]),
              message: `أسماء مفاهيم مكررة داخل الدرس: ${[...new Set(dupes)].join("، ")}`,
            });
          }
          // Sum of concept weights must be > 0 (defensive — Zod min(1) on
          // weight already prevents 0, but additional safety against admin
          // editing the JSON outside the editor).
          const wSum = lesson.concepts.reduce((a, c) => a + (c.weight ?? 1), 0);
          if (wSum <= 0) {
            issues.push({
              severity: "error",
              path: joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "lessons", lessIdx, "concepts"]),
              message: `مجموع أوزان المفاهيم لا يمكن أن يكون صفراً`,
            });
          }
        });

        // Lab prerequisite_lessons FK check + missing-rubric warnings (v4.1).
        unit.labs.forEach((lab, labIdx) => {
          const labPath = joinPath(["levels", lIdx, "stages", sIdx, "units", uIdx, "labs", labIdx]);
          if (lab.prerequisite_lessons && lab.prerequisite_lessons.length > 0) {
            for (const pre of lab.prerequisite_lessons) {
              if (!lessonCodes.has(pre)) {
                issues.push({
                  severity: "error",
                  path: `${labPath}.prerequisite_lessons`,
                  message: `معمل ${lab.title}: متطلب درس سابق غير موجود "${pre}"`,
                });
              }
            }
          }
          if (isV41) {
            lab.questions.forEach((q, qi) => {
              if (!q.rubric && !q.solution_outline) {
                issues.push({
                  severity: "warning",
                  path: `${labPath}.questions[${qi}]`,
                  message: `سؤال معمل بدون rubric ولا solution_outline — جودة التصحيح ستضعف`,
                });
              }
            });
          }
        });
      });
    });
  });

  // ─── Stage 4: exam_banks reference checks ───────────────────────────────
  if (parsed.exam_banks) {
    const { unit_banks, stage_banks, level_banks } = parsed.exam_banks;
    if (unit_banks) {
      for (const code of Object.keys(unit_banks)) {
        if (!unitCodes.has(code)) {
          issues.push({
            severity: "error",
            path: `exam_banks.unit_banks["${code}"]`,
            message: `بنك أسئلة لوحدة غير موجودة: ${code}`,
          });
        }
        const bank = unit_banks[code];
        if (bank) summary.examQuestions += bank.variants.reduce((n, v) => n + v.length, 0);
      }
    }
    if (stage_banks) {
      for (const code of Object.keys(stage_banks)) {
        if (!stageCodes.has(code)) {
          issues.push({
            severity: "error",
            path: `exam_banks.stage_banks["${code}"]`,
            message: `بنك أسئلة لمرحلة غير موجودة: ${code}`,
          });
        }
        const bank = stage_banks[code];
        if (bank) summary.examQuestions += bank.variants.reduce((n, v) => n + v.length, 0);
      }
    }
    if (level_banks) {
      for (const key of Object.keys(level_banks)) {
        const lvIdx = Number(key);
        if (!Number.isInteger(lvIdx) || !levelIndices.has(lvIdx)) {
          issues.push({
            severity: "error",
            path: `exam_banks.level_banks["${key}"]`,
            message: `بنك أسئلة لمستوى غير موجود: ${key}`,
          });
        }
        const bank = level_banks[key];
        if (bank) summary.examQuestions += bank.variants.reduce((n, v) => n + v.length, 0);
      }
    }
  }

  summary.placementQuestions = parsed.placement_test_questions?.length ?? 0;

  const hasError = issues.some((i) => i.severity === "error");
  return { ok: !hasError, parsed, issues, summary };
}

// Re-export for convenience (consumers import from one place).
export type V4ValidatedFile = NonNullable<V4ValidationReport["parsed"]>;
export { z };
