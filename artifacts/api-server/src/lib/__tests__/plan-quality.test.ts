import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validatePlanQuality, checkDiagnosticOverlap } from "../plan-quality.js";

type FailResult = { ok: false; reason: string; details: string[] };

function assertFail(
  r: ReturnType<typeof validatePlanQuality>,
  detailSubstring?: string,
): asserts r is FailResult {
  assert.ok(r !== null, "expected non-null result");
  assert.equal(r!.ok, false, `expected ok=false, reason=${(r as FailResult).reason ?? "null"}`);
  if (detailSubstring) {
    const found = (r as FailResult).details.some((d) => d.includes(detailSubstring));
    assert.ok(found, `expected details to include "${detailSubstring}". Got: ${JSON.stringify((r as FailResult).details)}`);
  }
}

function makeStage(overrides: Partial<{
  objectives: string; microsteps: string; deliverable: string;
  mastery: string; reason: string; prerequisite: string;
}> = {}): string {
  const o = {
    objectives: `<ul class="stage-objectives"><li>هدف أول</li><li>هدف ثانٍ</li></ul>`,
    microsteps: `<ul class="stage-microsteps"><li>خطوة 1</li><li>خطوة 2</li><li>خطوة 3</li></ul>`,
    deliverable: `<p class="stage-deliverable">مُخرَج تطبيقي واضح للمرحلة</p>`,
    mastery: `<p class="stage-mastery">يستطيع الطالب تطبيق المهارة بدقة تامة في سياقات متعددة</p>`,
    reason: `<p class="stage-reason">بناءً على إجاباتك في التشخيص فإن لديك ضعفاً في هذا المجال تحديداً</p>`,
    prerequisite: `<p class="stage-prerequisite">لا يوجد متطلب قبلي</p>`,
    ...overrides,
  };
  return `<li><strong>عنوان المرحلة</strong>${o.objectives}${o.microsteps}${o.deliverable}${o.mastery}${o.reason}${o.prerequisite}</li>`;
}

function makePlan(stageCount: number, overrides: Parameters<typeof makeStage>[0] = {}): string {
  const stages = Array.from({ length: stageCount }, () => makeStage(overrides)).join("\n");
  return `<ol>${stages}</ol>`;
}

describe("validatePlanQuality", () => {
  test("returns null when plan has no structured classes", () => {
    assert.equal(validatePlanQuality("<p>خطة عادية بدون تنسيق</p>"), null);
  });

  test("accepts a valid 5-stage plan", () => {
    assert.deepEqual(validatePlanQuality(makePlan(5)), { ok: true });
  });

  test("accepts a valid 7-stage plan", () => {
    assert.deepEqual(validatePlanQuality(makePlan(7)), { ok: true });
  });

  test("rejects a 4-stage plan (too few)", () => {
    assertFail(validatePlanQuality(makePlan(4)));
  });

  test("rejects an 8-stage plan (too many)", () => {
    assertFail(validatePlanQuality(makePlan(8)));
  });

  test("rejects when stage-microsteps has only 2 items", () => {
    assertFail(
      validatePlanQuality(makePlan(5, {
        microsteps: `<ul class="stage-microsteps"><li>خطوة 1</li><li>خطوة 2</li></ul>`,
      })),
      "stage-microsteps",
    );
  });

  test("rejects when stage-mastery is too short", () => {
    assertFail(
      validatePlanQuality(makePlan(5, { mastery: `<p class="stage-mastery">قصير جداً</p>` })),
    );
  });

  test("rejects when stage-reason has no diagnostic marker", () => {
    assertFail(
      validatePlanQuality(makePlan(5, {
        reason: `<p class="stage-reason">هذه المرحلة مهمة جداً لتطوير المهارات المتقدمة والعميقة</p>`,
      })),
      "stage-reason",
    );
  });

  test("rejects when stage-objectives is missing", () => {
    assertFail(validatePlanQuality(makePlan(5, { objectives: "" })), "stage-objectives");
  });
});

describe("checkDiagnosticOverlap", () => {
  test("returns full coverage when no diagnostic corpus", () => {
    const r = checkDiagnosticOverlap(["سبب المرحلة"], "");
    assert.equal(r.uncoveredIndices.length, 0);
    assert.equal(r.coveredIndices.length, 1);
  });

  test("detects overlap when reason shares words with corpus", () => {
    const r = checkDiagnosticOverlap(
      ["أنت بحاجة لتحسين مهارات النحو"],
      "أحتاج إلى تحسين مهارات النحو العربي وفهم الإعراب",
    );
    assert.ok(r.coveredIndices.length >= 1);
    assert.equal(r.uncoveredIndices.length, 0);
  });

  test("marks stage as uncovered when no overlap", () => {
    const r = checkDiagnosticOverlap(
      ["هذه المرحلة تعالج موضوع التركيب"],
      "أريد تعلم الرياضيات والفيزياء",
    );
    assert.equal(r.uncoveredIndices.length, 1);
    assert.equal(r.coveredIndices.length, 0);
  });

  test("rejects partial coverage — some stages uncovered", () => {
    const r = checkDiagnosticOverlap(
      [
        "أنت بحاجة لتحسين مهارات النحو لديك",
        "هذه المرحلة تعالج موضوع مختلف تماماً عن التشخيص",
      ],
      "أحتاج إلى تحسين مهارات النحو العربي",
    );
    assert.equal(r.coveredIndices.length, 1);
    assert.equal(r.uncoveredIndices.length, 1);
    assert.deepEqual(r.uncoveredIndices, [1]);
  });
});
