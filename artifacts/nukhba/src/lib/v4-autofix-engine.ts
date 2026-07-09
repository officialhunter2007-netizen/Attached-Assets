const BLOOM = new Set(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
const SEVERITY = new Set(["minor", "major", "critical"]);
const LAB_KINDS = ["diagnostic", "decision", "application", "analysis", "connection"] as const;

export type FixProgress = {
  phase: string;
  pct: number;
  detail?: string;
};

export type FixCounters = {
  num: number;
  enumFix: number;
  indexDel: number;
  textPad: number;
  textDrop: number;
  arrFill: number;
  labKinds: number;
  mcqFix: number;
  refs: number;
  banks: number;
  slug: number;
  schemaVer: number;
};

export type ClientAutoFixResult = {
  fixedDoc: any;
  changes: string[];
  counters: FixCounters;
};

const isNum = (x: any): x is number => typeof x === "number" && Number.isFinite(x);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
const tlen = (s: any): number => (typeof s === "string" ? s.trim().length : 0);
const isArr = (x: any): x is any[] => Array.isArray(x);

function makeCounters(): FixCounters {
  return { num: 0, enumFix: 0, indexDel: 0, textPad: 0, textDrop: 0, arrFill: 0, labKinds: 0, mcqFix: 0, refs: 0, banks: 0, slug: 0, schemaVer: 0 };
}

function countersToChanges(c: FixCounters): string[] {
  const out: string[] = [];
  const push = (n: number, label: string) => { if (n > 0) out.push(`${label}: ${n}`); };
  push(c.num, "قيم رقمية ضُبطت ضمن مداها المسموح");
  push(c.enumFix, "قيم خيارات غير صالحة صُحّحت (bloom / severity / الأنواع)");
  push(c.indexDel, "أرقام ترقيم خارج النطاق حُذفت (إعادة ترقيم تلقائية)");
  push(c.textPad, "حقول نصية إجبارية قصيرة عُبّئت بنص استرشادي — تحتاج مراجعة");
  push(c.textDrop, "حقول نصية اختيارية قصيرة جداً حُذفت");
  push(c.arrFill, "مصفوفات إجبارية فارغة عُبّئت بعناصر افتراضية — تحتاج مراجعة");
  push(c.labKinds, "معامل أُعيد ضبط أسئلتها لتغطّي الأنواع الخمسة بالترتيب الصحيح");
  push(c.mcqFix, "أسئلة MCQ معطوبة حُوّلت إلى إجابة قصيرة");
  push(c.refs, "مراجع متطلّبات معطوبة/ذاتية/حلقية حُذفت");
  push(c.banks, "مفاتيح بنوك اختبارات لأكواد غير موجودة حُذفت");
  push(c.slug, "مُعرّف التخصص (slug) صُحِّح");
  push(c.schemaVer, "إصدار المخطط (schema_version) صُحِّح");
  return out;
}

function deepClone(x: any): any {
  try { return structuredClone(x); } catch { return JSON.parse(JSON.stringify(x)); }
}

function contextPad(min: number, context: string): string {
  let s = context.trim();
  while (s.length < min) s = s + " — يحتاج إلى إكمال";
  return s;
}

function reqText(obj: any, key: string, min: number, c: FixCounters, fallback?: string) {
  if (tlen(obj?.[key]) >= min) return;
  const existing = typeof obj?.[key] === "string" && obj[key].trim() ? obj[key].trim() : "";
  const base = existing || fallback || "يحتاج هذا الحقل إلى محتوى مناسب";
  obj[key] = contextPad(min, base);
  c.textPad++;
}

function optText(obj: any, key: string, min: number, c: FixCounters) {
  if (obj && typeof obj[key] === "string" && tlen(obj[key]) < min) {
    delete obj[key];
    c.textDrop++;
  }
}

function clampField(obj: any, key: string, lo: number, hi: number, c: FixCounters) {
  if (obj && isNum(obj[key])) {
    const v = clamp(obj[key], lo, hi);
    if (v !== obj[key]) { obj[key] = v; c.num++; }
  }
}

function delIndexIfBad(obj: any, key: string, lo: number, hi: number, c: FixCounters) {
  if (!obj || !(key in obj)) return;
  const v = obj[key];
  const bad = !isNum(v) || v < lo || v > hi;
  delete obj[key];
  if (bad) c.indexDel++;
}

function fixBloom(obj: any, key: string, c: FixCounters) {
  if (obj && typeof obj[key] === "string" && !BLOOM.has(obj[key])) {
    delete obj[key];
    c.enumFix++;
  }
}

function fixExamMeta(exam: any, c: FixCounters) {
  if (!exam || typeof exam !== "object") return;
  if (!isNum(exam.pass_threshold_percent)) { exam.pass_threshold_percent = 70; c.num++; }
  else clampField(exam, "pass_threshold_percent", 0, 100, c);
  clampField(exam, "points", 1, 1000, c);
  clampField(exam, "time_limit_minutes", 1, 240, c);
  optText(exam, "description", 5, c);
}

function fixLearningObjectives(node: any, c: FixCounters) {
  if (!node || !isArr(node.learning_objectives)) return;
  node.learning_objectives = node.learning_objectives
    .filter((lo: any) => lo && typeof lo === "object" && tlen(lo.statement) >= 8)
    .map((lo: any) => {
      if (typeof lo.bloom_level === "string" && !BLOOM.has(lo.bloom_level)) {
        lo.bloom_level = "understand";
        c.enumFix++;
      }
      return lo;
    });
  if (node.learning_objectives.length === 0) delete node.learning_objectives;
}

function fixConcept(con: any, c: FixCounters, unitName: string) {
  reqText(con, "name", 2, c, unitName);
  reqText(con, "explanation", 10, c, `شرح ${con.name || unitName}`);
  reqText(con, "mastery_criterion", 5, c, `إتقان ${con.name || unitName}`);
  if ("weight" in con) clampField(con, "weight", 1, 5, c);
}

function fixMistake(mk: any, c: FixCounters) {
  reqText(mk, "mistake", 5, c, "خطأ شائع في هذا الموضوع");
  reqText(mk, "correction", 5, c, "التصحيح الصحيح لهذا الخطأ");
  reqText(mk, "treatment", 5, c, "التعامل مع الطالب عند وقوعه في هذا الخطأ بسؤال موجَّه");
  if (typeof mk.severity === "string" && !SEVERITY.has(mk.severity)) { delete mk.severity; c.enumFix++; }
}

function fixLabQuestion(q: any, c: FixCounters) {
  reqText(q, "prompt", 5, c, `سؤال ${q.kind || "تطبيقي"}`);
  if ("points" in q) clampField(q, "points", 1, 10, c);
  optText(q, "rubric", 10, c);
  optText(q, "solution_outline", 10, c);
}

function fixLab(lab: any, c: FixCounters, unitName: string) {
  delIndexIfBad(lab, "lab_index", 1, 5, c);
  reqText(lab, "title", 3, c, `معمل ${unitName}`);
  reqText(lab, "scenario", 20, c, `سيناريو تطبيقي على ${unitName} — يتطلب الإكمال`);
  reqText(lab, "completion_criterion", 5, c, `إتمام جميع أسئلة معمل ${unitName}`);
  optText(lab, "pedagogical_sequence", 15, c);
  if (isArr(lab.prerequisite_lessons)) {
    lab.prerequisite_lessons = lab.prerequisite_lessons.filter((x: any) => typeof x === "string");
  }

  let qs = isArr(lab.questions) ? lab.questions.filter((q: any) => q && typeof q === "object") : [];
  for (const q of qs) fixLabQuestion(q, c);

  const byKind = new Map<string, any>();
  for (const q of qs) {
    const k = String(q.kind ?? "");
    if (LAB_KINDS.includes(k as any) && !byKind.has(k)) byKind.set(k, q);
  }
  const leftovers = qs.filter((q: any) => !LAB_KINDS.includes(String(q.kind) as any) || byKind.get(String(q.kind)) !== q);
  const rebuilt: any[] = [];
  const kindLabels: Record<string, string> = { diagnostic: "تشخيصي", decision: "قرار", application: "تطبيقي", analysis: "تحليلي", connection: "ربط" };
  for (const kind of LAB_KINDS) {
    let q = byKind.get(kind);
    if (!q) {
      q = leftovers.shift() ? deepClone(leftovers[0] ?? qs[0] ?? {}) : {};
      q.kind = kind;
      q.prompt = q.prompt || `سؤال ${kindLabels[kind]} على ${unitName} — يتطلب الإكمال`;
    }
    if (tlen(q.prompt) < 5) q.prompt = `سؤال ${kindLabels[kind]} على ${unitName} — يتطلب الإكمال`;
    rebuilt.push(q);
  }

  const changed = rebuilt.length !== qs.length || rebuilt.some((q, i) => qs[i] !== q);
  if (changed) c.labKinds++;
  lab.questions = rebuilt;
}

function fixLesson(les: any, c: FixCounters, unitName: string, lessonNum: number) {
  delIndexIfBad(les, "lesson_index", 1, 10, c);
  const lesName = les.name || `درس ${lessonNum} في ${unitName}`;
  reqText(les, "name", 3, c, `درس ${lessonNum} — ${unitName}`);
  reqText(les, "goal", 10, c, `إتقان مفاهيم ${unitName} في الدرس ${lessonNum}`);
  reqText(les, "bridge_sentence", 10, c, `في هذا الدرس نتناول جانباً عملياً مهماً من ${unitName} يبني على ما سبق ويفتح الباب لما يأتي`);
  reqText(les, "final_check_question", 5, c, `كيف تُطبّق ما تعلّمته في هذا الدرس على مثال عملي من ${unitName}؟`);
  reqText(les, "session_complete_criterion", 5, c, `أكمل الطالب الدرس وأجاب على سؤال التحقق النهائي`);

  if ("estimated_gem_cost" in les) clampField(les, "estimated_gem_cost", 0, 500, c);
  if ("expected_duration_minutes" in les) clampField(les, "expected_duration_minutes", 1, 240, c);
  optText(les, "motivation_hook", 15, c);
  optText(les, "solution_outline", 10, c);
  fixLearningObjectives(les, c);
  fixBloom(les, "bloom_focus", c);

  if (!isArr(les.prerequisite_lessons)) les.prerequisite_lessons = [];
  if (!isArr(les.enables_lessons)) les.enables_lessons = [];

  let concepts = isArr(les.concepts) ? les.concepts.filter((x: any) => x && typeof x === "object") : [];
  for (const con of concepts) fixConcept(con, c, lesName);
  const seen = new Set<string>();
  concepts = concepts.filter((con: any) => {
    const n = (con.name || "").trim();
    if (seen.has(n)) { c.enumFix++; return false; }
    seen.add(n);
    return true;
  });
  if (concepts.length === 0) {
    concepts = [{ name: `مفهوم أساسي في ${unitName}`, explanation: `يتطلب هذا المفهوم شرحاً مفصّلاً ضمن سياق ${unitName}`, mastery_criterion: `قدرة الطالب على تطبيق المفهوم بشكل مستقل` }];
    c.arrFill++;
  }
  les.concepts = concepts;

  let mistakes = isArr(les.common_mistakes) ? les.common_mistakes.filter((x: any) => x && typeof x === "object") : [];
  for (const mk of mistakes) fixMistake(mk, c);
  if (mistakes.length === 0) {
    mistakes = [{ mistake: `خطأ شائع عند تعلّم ${unitName}`, correction: `الفهم الصحيح والمنهجي لمفهوم ${unitName}`, treatment: `يُعيد المعلم الشرح بمثال تطبيقي ثم يطرح سؤالاً تحقّقياً` }];
    c.arrFill++;
  }
  les.common_mistakes = mistakes;

  let ye = isArr(les.yemeni_examples) ? les.yemeni_examples.filter((e: any) => tlen(e) >= 5) : [];
  if (ye.length === 0) {
    ye = [`مثال عملي على ${unitName} من بيئة العمل المهنية — يتطلب الإكمال`];
    c.arrFill++;
  }
  les.yemeni_examples = ye;
}

function fixUnit(unit: any, c: FixCounters, stageCtx: string, unitNum: number) {
  delIndexIfBad(unit, "unit_index", 1, 9, c);
  const unitName = unit.name || `وحدة ${unitNum} — ${stageCtx}`;
  reqText(unit, "name", 3, c, `وحدة ${unitNum} — ${stageCtx}`);
  reqText(unit, "goal", 10, c, `إتقان مهارات ${unitName}`);
  fixExamMeta(unit.exam, c);
  fixBloom(unit, "bloom_focus", c);
  optText(unit, "motivation_hook", 15, c);
  fixLearningObjectives(unit, c);

  if (isArr(unit.key_concepts)) {
    unit.key_concepts = unit.key_concepts.filter((k: any) => tlen(k) >= 2);
  } else { unit.key_concepts = []; }
  if (!isArr(unit.prerequisite_units)) unit.prerequisite_units = [];
  if (!isArr(unit.enables_units)) unit.enables_units = [];

  let labs = isArr(unit.labs) ? unit.labs.filter((x: any) => x && typeof x === "object") : [];
  for (const lab of labs) fixLab(lab, c, unitName);
  if (labs.length === 0) {
    labs = [{ title: `معمل تطبيقي — ${unitName}`, scenario: `سيناريو عملي على ${unitName} يتطلب التطبيق والتحليل — يحتاج إلى إكمال`, completion_criterion: `إتمام جميع مراحل المعمل`, questions: LAB_KINDS.map((k) => ({ kind: k, prompt: `سؤال ${k} على ${unitName}` })) }];
    c.arrFill++;
  } else if (labs.length > 5) { labs = labs.slice(0, 5); }
  unit.labs = labs;

  let lessons = isArr(unit.lessons) ? unit.lessons.filter((x: any) => x && typeof x === "object") : [];
  lessons.forEach((les: any, i: number) => fixLesson(les, c, unitName, i + 1));
  if (lessons.length === 0) {
    lessons = [{ name: `درس 1 — ${unitName}`, goal: `فهم المبادئ الأساسية لـ${unitName}`, bridge_sentence: `نبدأ هذا الدرس باستكشاف المفاهيم الجوهرية لـ${unitName} التي ستبني عليها كل ما يأتي بعد ذلك`, final_check_question: `كيف تُطبّق ما تعلّمته على مثال عملي من ${unitName}؟`, session_complete_criterion: `أجاب الطالب على سؤال التحقق`, prerequisite_lessons: [], enables_lessons: [], concepts: [{ name: `مفهوم أساسي في ${unitName}`, explanation: `يتطلب هذا المفهوم شرحاً مفصّلاً`, mastery_criterion: `تطبيق مستقل` }], common_mistakes: [{ mistake: `خطأ شائع في ${unitName}`, correction: `الفهم الصحيح`, treatment: `إعادة الشرح بمثال` }], yemeni_examples: [`مثال على ${unitName}`] }];
    c.arrFill++;
  } else if (lessons.length > 10) { lessons = lessons.slice(0, 10); }
  unit.lessons = lessons;
}

function fixStage(stage: any, c: FixCounters, levelCtx: string, stageNum: number) {
  delIndexIfBad(stage, "stage_index", 1, 7, c);
  const stageName = stage.name || `مرحلة ${stageNum} — ${levelCtx}`;
  reqText(stage, "name", 3, c, `مرحلة ${stageNum} — ${levelCtx}`);
  reqText(stage, "goal", 10, c, `إتقان مهارات مرحلة ${stageName}`);
  fixExamMeta(stage.exam, c);
  fixBloom(stage, "bloom_focus", c);

  let units = isArr(stage.units) ? stage.units.filter((x: any) => x && typeof x === "object") : [];
  units.forEach((u: any, i: number) => fixUnit(u, c, stageName, i + 1));
  if (units.length === 0) {
    units = [makeStubUnit(stageName, 1)];
    c.arrFill++;
  } else if (units.length > 9) { units = units.slice(0, 9); }
  stage.units = units;
}

function fixLevel(level: any, c: FixCounters, levelNum: number) {
  delIndexIfBad(level, "level_index", 1, 5, c);
  const levelName = level.name || `المستوى ${levelNum}`;
  reqText(level, "name", 3, c, `المستوى ${levelNum}`);
  reqText(level, "goal", 10, c, `إتقان مهارات ${levelName}`);
  fixExamMeta(level.exam, c);
  fixBloom(level, "bloom_focus", c);

  let stages = isArr(level.stages) ? level.stages.filter((x: any) => x && typeof x === "object") : [];
  stages.forEach((s: any, i: number) => fixStage(s, c, levelName, i + 1));
  if (stages.length === 0) {
    stages = [{ name: `مرحلة 1 — ${levelName}`, goal: `إتقان مرحلة أولى من ${levelName}`, units: [makeStubUnit(levelName, 1)] }];
    c.arrFill++;
  } else if (stages.length > 7) { stages = stages.slice(0, 7); }
  level.stages = stages;
}

function makeStubUnit(ctx: string, num: number): any {
  return {
    name: `وحدة ${num}`, goal: `إتقان مهارات الوحدة ${num} من ${ctx}`,
    prerequisite_units: [], enables_units: [], key_concepts: [],
    labs: [{ title: `معمل تطبيقي`, scenario: `سيناريو تطبيقي على ${ctx} — يتطلب الإكمال`, completion_criterion: `إتمام المعمل`, questions: LAB_KINDS.map((k) => ({ kind: k, prompt: `سؤال ${k}` })) }],
    lessons: [{ name: `درس 1`, goal: `فهم أساسيات ${ctx}`, bridge_sentence: `نبدأ بالمفاهيم الأساسية لـ${ctx} التي ستبني عليها كل ما يأتي`, final_check_question: `كيف تُطبّق ما تعلّمته؟`, session_complete_criterion: `إكمال الدرس`, prerequisite_lessons: [], enables_lessons: [], concepts: [{ name: `مفهوم أساسي`, explanation: `يتطلب هذا المفهوم شرحاً مفصّلاً`, mastery_criterion: `تطبيق مستقل` }], common_mistakes: [{ mistake: `خطأ شائع`, correction: `التصحيح الصحيح`, treatment: `إعادة الشرح بمثال` }], yemeni_examples: [`مثال تطبيقي`] }],
  };
}

function fixSpecialty(sp: any, c: FixCounters) {
  let slug = typeof sp.slug === "string" ? sp.slug.trim().toLowerCase() : "";
  let cleaned = slug.replace(/[^a-z0-9_-]/g, "-").replace(/^[^a-z0-9]+/, "");
  if (cleaned.length < 2) cleaned = (cleaned + "specialty").slice(0, 64);
  if (cleaned.length > 64) cleaned = cleaned.slice(0, 64);
  if (cleaned !== sp.slug) { sp.slug = cleaned; c.slug++; }
  reqText(sp, "name", 2, c, "تخصص");
  optText(sp, "description", 10, c);
  optText(sp, "target_persona", 5, c);
  optText(sp, "teacher_tone", 5, c);
  if (typeof sp.icon === "string" && sp.icon.length > 8) { delete sp.icon; c.textDrop++; }
  if (isArr(sp.yemeni_examples)) {
    const f = sp.yemeni_examples.filter((e: any) => tlen(e) >= 3);
    if (f.length) sp.yemeni_examples = f; else delete sp.yemeni_examples;
  }
}

function buildCodeMaps(doc: any): { unitCodes: Set<string>; lessonCodes: Set<string>; stageCodes: Set<string>; levelIdx: Set<string> } {
  const unitCodes = new Set<string>();
  const lessonCodes = new Set<string>();
  const stageCodes = new Set<string>();
  const levelIdx = new Set<string>();
  doc.levels.forEach((lv: any, li: number) => {
    const L = li + 1;
    levelIdx.add(String(L));
    (lv.stages ?? []).forEach((st: any, si: number) => {
      const S = `${L}.${si + 1}`;
      stageCodes.add(S);
      (st.units ?? []).forEach((u: any, ui: number) => {
        const U = `${S}.${ui + 1}`;
        unitCodes.add(U);
        (u.lessons ?? []).forEach((_: any, lsi: number) => lessonCodes.add(`${U}.${lsi + 1}`));
      });
    });
  });
  return { unitCodes, lessonCodes, stageCodes, levelIdx };
}

function cleanReferences(doc: any, c: FixCounters) {
  const { unitCodes, lessonCodes } = buildCodeMaps(doc);
  const clean = (arr: any, set: Set<string>, self: string | null): any[] => {
    if (!isArr(arr)) return [];
    const out = arr.filter((x: any) => typeof x === "string" && set.has(x) && x !== self);
    c.refs += arr.length - out.length;
    return out;
  };
  doc.levels.forEach((lv: any, li: number) => {
    const L = li + 1;
    (lv.stages ?? []).forEach((st: any, si: number) => {
      const S = `${L}.${si + 1}`;
      (st.units ?? []).forEach((u: any, ui: number) => {
        const U = `${S}.${ui + 1}`;
        u.prerequisite_units = clean(u.prerequisite_units, unitCodes, U);
        u.enables_units = clean(u.enables_units, unitCodes, U);
        (u.lessons ?? []).forEach((les: any, lsi: number) => {
          const LC = `${U}.${lsi + 1}`;
          les.prerequisite_lessons = clean(les.prerequisite_lessons, lessonCodes, LC);
          les.enables_lessons = clean(les.enables_lessons, lessonCodes, LC);
        });
        (u.labs ?? []).forEach((lab: any) => {
          if (isArr(lab.prerequisite_lessons)) lab.prerequisite_lessons = clean(lab.prerequisite_lessons, lessonCodes, null);
        });
      });
    });
  });
}

function fixExamQuestion(q: any, c: FixCounters) {
  reqText(q, "prompt", 5, c, "سؤال اختبار");
  if ("difficulty" in q) clampField(q, "difficulty", 1, 3, c); else q.difficulty = 2;
  if ("points" in q) clampField(q, "points", 1, 10, c);
  if ("time_limit_seconds" in q) clampField(q, "time_limit_seconds", 10, 3600, c);
  optText(q, "rubric", 10, c);
  optText(q, "solution_outline", 10, c);
  optText(q, "explanation", 2, c);
  if (q.kind === "mcq") {
    const choices = isArr(q.choices) ? q.choices.filter((ch: any) => tlen(ch) >= 1) : [];
    const ci = q.correct_index;
    const ok = choices.length >= 2 && isNum(ci) && ci >= 0 && ci < choices.length;
    if (ok) { q.choices = choices; q.correct_index = clamp(ci, 0, choices.length - 1); }
    else { q.kind = "short_answer"; delete q.choices; delete q.correct_index; c.mcqFix++; }
  } else if (!["practical", "short_answer"].includes(q.kind)) {
    q.kind = "short_answer"; c.enumFix++;
  }
}

function fixExamBanks(doc: any, c: FixCounters) {
  const banks = doc.exam_banks;
  if (!banks || typeof banks !== "object") return;
  const { unitCodes, stageCodes, levelIdx } = buildCodeMaps(doc);
  const fixGroup = (group: any, validCodes: Set<string>) => {
    if (!group || typeof group !== "object") return;
    for (const code of Object.keys(group)) {
      if (!validCodes.has(code)) { delete group[code]; c.banks++; continue; }
      const bank = group[code];
      let variants = isArr(bank?.variants) ? bank.variants : [];
      variants = variants.filter((v: any) => isArr(v)).slice(0, 3);
      for (const v of variants) for (const q of v) if (q && typeof q === "object") fixExamQuestion(q, c);
      variants = variants.filter((v: any) => v.length >= 1);
      if (variants.length === 0) { delete group[code]; c.banks++; }
      else bank.variants = variants;
    }
  };
  fixGroup(banks.unit_banks, unitCodes);
  fixGroup(banks.stage_banks, stageCodes);
  fixGroup(banks.level_banks, levelIdx);
}

export async function runClientAutofix(
  input: any,
  onProgress?: (p: FixProgress) => void,
): Promise<ClientAutoFixResult> {
  const doc = deepClone(input);
  const c = makeCounters();
  const report = (phase: string, pct: number, detail?: string) => onProgress?.({ phase, pct, detail });

  report("تحليل البنية", 2);
  await tick();

  if (!doc || typeof doc !== "object") {
    return { fixedDoc: doc, changes: ["الملف فارغ أو غير قابل للقراءة"], counters: c };
  }

  if (doc.schema_version !== "v4.0" && doc.schema_version !== "v4.1") { doc.schema_version = "v4.1"; c.schemaVer++; }

  const sp = doc.specialty && typeof doc.specialty === "object" ? doc.specialty : (doc.specialty = {});
  fixSpecialty(sp, c);
  report("تصليح بيانات التخصص", 5);

  let levels = isArr(doc.levels) ? doc.levels.filter((x: any) => x && typeof x === "object") : [];
  if (levels.length === 0) { levels = [{ name: "المستوى 1", goal: "إتقان مهارات المستوى الأول", stages: [] }]; c.arrFill++; }
  else if (levels.length > 5) { levels = levels.slice(0, 5); }
  doc.levels = levels;

  const totalLevels = levels.length;
  for (let li = 0; li < totalLevels; li++) {
    const lv = levels[li];
    const lName = lv.name || `المستوى ${li + 1}`;
    report(`تصليح ${lName}`, 5 + Math.round((li / totalLevels) * 60), lName);
    fixLevel(lv, c, li + 1);
    await tick();
  }

  report("تنظيف المراجع والمتطلّبات", 66);
  await tick();
  cleanReferences(doc, c);

  report("تصليح بنوك الاختبارات", 75);
  await tick();
  if (doc.exam_banks && typeof doc.exam_banks === "object") fixExamBanks(doc, c);

  report("تصليح أسئلة تحديد المستوى", 88);
  await tick();
  if (isArr(doc.placement_test_questions)) {
    for (const q of doc.placement_test_questions) {
      if (!q || typeof q !== "object") continue;
      if (isNum(q.target_level_index)) clampField(q, "target_level_index", 1, 5, c); else { q.target_level_index = 1; c.num++; }
      fixExamQuestion(q, c);
    }
  }

  optText(doc, "publish_notes", 2, c);
  report("اكتمل الإصلاح", 100);

  return { fixedDoc: doc, changes: countersToChanges(c), counters: c };
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
