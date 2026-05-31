export type PlanQualityResult =
  | { ok: true }
  | { ok: false; reason: string; details: string[] };

function getOutermostOlContent(html: string): string | null {
  const start = html.indexOf("<ol");
  if (start === -1) return null;
  const tagEnd = html.indexOf(">", start);
  if (tagEnd === -1) return null;
  let depth = 1;
  let pos = tagEnd + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf("<ol", pos);
    const nextClose = html.indexOf("</ol>", pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 3;
    } else {
      depth--;
      if (depth === 0) return html.slice(tagEnd + 1, nextClose);
      pos = nextClose + 5;
    }
  }
  return null;
}

function getTopLevelLiItems(olContent: string): string[] {
  const items: string[] = [];
  let i = 0;
  while (i < olContent.length) {
    const liStart = olContent.indexOf("<li", i);
    if (liStart === -1) break;
    const tagEnd = olContent.indexOf(">", liStart);
    if (tagEnd === -1) break;
    let depth = 1;
    let pos = tagEnd + 1;
    let found = false;
    while (pos < olContent.length) {
      const nextOpen = olContent.indexOf("<li", pos);
      const nextClose = olContent.indexOf("</li>", pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 3;
      } else {
        depth--;
        if (depth === 0) {
          items.push(olContent.slice(tagEnd + 1, nextClose));
          i = nextClose + 5;
          found = true;
          break;
        }
        pos = nextClose + 5;
      }
    }
    if (!found) break;
  }
  return items;
}

function countClassedListItems(html: string, cls: string): number {
  const re = new RegExp(`class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:ul|ol)>`, "i");
  const m = html.match(re);
  if (!m) return 0;
  return (m[1].match(/<li/gi) ?? []).length;
}

export function extractClassedTextContent(html: string, cls: string): string {
  const re = new RegExp(`class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:p|div|span)>`, "i");
  const m = html.match(re);
  if (!m) return "";
  return m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const DIAGNOSTIC_REFERENCE_MARKERS = [
  "ذكرت", "قلت", "أشرت", "بناءً على", "وفق", "حسب", "أفدت", "أجبت",
  "لأنك", "لديك", "تحتاج", "أنت", "هدفك", "مستواك",
];

const REQUIRED_CLASSES = [
  { cls: "stage-objectives",   label: "الأهداف القابلة للقياس" },
  { cls: "stage-microsteps",   label: "الخطوات الفرعية" },
  { cls: "stage-deliverable",  label: "المُخرَج العملي" },
  { cls: "stage-mastery",      label: "معيار الإتقان" },
  { cls: "stage-reason",       label: "لماذا هذه المرحلة للطالب" },
  { cls: "stage-prerequisite", label: "المتطلب القبلي" },
];

export function getStageItems(planHtml: string): string[] {
  const olContent = getOutermostOlContent(planHtml);
  if (!olContent) return [];
  return getTopLevelLiItems(olContent);
}

export function validatePlanQuality(planHtml: string): PlanQualityResult | null {
  if (!planHtml.includes("stage-objectives") && !planHtml.includes("stage-microsteps")) {
    return null;
  }

  const stageItems = getStageItems(planHtml);

  if (stageItems.length < 5 || stageItems.length > 7) {
    return {
      ok: false,
      reason: `عدد المراحل ${stageItems.length} خارج النطاق المطلوب (5–7)`,
      details: [`الخطة تحتوي على ${stageItems.length} مرحلة. المطلوب 5–7.`],
    };
  }

  const errors: string[] = [];

  stageItems.forEach((stageHtml, idx) => {
    const n = idx + 1;

    for (const { cls, label } of REQUIRED_CLASSES) {
      if (!stageHtml.includes(cls)) {
        errors.push(`المرحلة ${n}: حقل «${label}» مفقود (class="${cls}")`);
      }
    }

    const microCount = countClassedListItems(stageHtml, "stage-microsteps");
    if (microCount > 0 && microCount < 3) {
      errors.push(`المرحلة ${n}: stage-microsteps تحتوي على ${microCount} خطوة فقط (الحد الأدنى 3)`);
    }

    const objCount = countClassedListItems(stageHtml, "stage-objectives");
    if (objCount > 0 && objCount < 2) {
      errors.push(`المرحلة ${n}: stage-objectives تحتوي على ${objCount} هدف فقط (الحد الأدنى 2)`);
    }

    const mastery = extractClassedTextContent(stageHtml, "stage-mastery");
    if (mastery && mastery.length < 15) {
      errors.push(`المرحلة ${n}: stage-mastery قصير جداً — يجب أن يكون معياراً محدداً وقابلاً للقياس`);
    }

    const reason = extractClassedTextContent(stageHtml, "stage-reason");
    if (reason) {
      if (reason.length < 20) {
        errors.push(`المرحلة ${n}: stage-reason قصير جداً — يجب ربطه بما أعلنه الطالب في التشخيص`);
      } else if (!DIAGNOSTIC_REFERENCE_MARKERS.some((w) => reason.includes(w))) {
        errors.push(`المرحلة ${n}: stage-reason لا يحتوي على مرجع تشخيصي للطالب (ذكرت/بناءً على/لديك/…)`);
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, reason: "الخطة تفتقر إلى حقول أو محتوى مطلوب في بعض المراحل", details: errors };
  }

  return { ok: true };
}

const ARABIC_STOP = new Set([
  "في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "كان", "لكن",
  "ولكن", "كذلك", "لأن", "لذا", "حتى", "إذا", "عند", "وقد", "وهو",
]);

export function checkDiagnosticOverlap(
  stageReasons: string[],
  diagnosticCorpus: string,
): { coveredIndices: number[]; uncoveredIndices: number[]; totalStages: number } {
  const totalStages = stageReasons.length;
  if (!diagnosticCorpus.trim()) {
    const all = stageReasons.map((_, i) => i);
    return { coveredIndices: all, uncoveredIndices: [], totalStages };
  }
  const corpusWords = new Set(
    diagnosticCorpus
      .replace(/[،؟!.,:؛\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !ARABIC_STOP.has(w)),
  );
  const coveredIndices: number[] = [];
  const uncoveredIndices: number[] = [];
  stageReasons.forEach((reason, idx) => {
    const words = reason
      .replace(/[،؟!.,:؛\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !ARABIC_STOP.has(w));
    if (words.some((w) => corpusWords.has(w))) {
      coveredIndices.push(idx);
    } else {
      uncoveredIndices.push(idx);
    }
  });
  return { coveredIndices, uncoveredIndices, totalStages };
}
