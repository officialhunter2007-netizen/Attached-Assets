/**
 * Client-side mirror of the backend validateQuizHtml logic.
 * Runs before submitting so the user gets instant feedback without a round-trip.
 */
export type QuizHtmlValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateQuizHtml(raw: string): QuizHtmlValidationResult {
  const html = raw.trim();
  if (!html) {
    return { valid: false, error: "محتوى HTML الاختبار فارغ" };
  }

  const hasHtmlTag  = /<html[\s>]/i.test(html);
  const hasDoctype  = /<!doctype\s+html/i.test(html);
  const hasBody     = /<body[\s>]/i.test(html);
  if (!hasHtmlTag && !hasDoctype && !hasBody) {
    return {
      valid: false,
      error: "الملف لا يبدو HTML صالحاً — يجب أن يحتوي على <!DOCTYPE html> أو وسم <html> أو <body>",
    };
  }

  if (!/window\.submitScore\s*\(/.test(html)) {
    return {
      valid: false,
      error: "الاختبار يجب أن يستدعي window.submitScore(درجة) عند انتهاء التصحيح",
    };
  }

  return { valid: true };
}
