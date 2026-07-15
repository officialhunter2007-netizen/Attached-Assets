/**
 * Validates that an HTML string is a well-formed quiz page compatible with the
 * Nukhba platform (i.e. it calls window.submitScore to report a grade).
 */
export type QuizHtmlValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateQuizHtml(raw: unknown): QuizHtmlValidationResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, error: "محتوى HTML الاختبار فارغ أو غير موجود" };
  }

  const html = raw.trim();

  // Must look like an HTML document
  const hasHtmlTag = /<html[\s>]/i.test(html);
  const hasDoctype = /<!doctype\s+html/i.test(html);
  const hasBody = /<body[\s>]/i.test(html);
  if (!hasHtmlTag && !hasDoctype && !hasBody) {
    return {
      valid: false,
      error:
        "الملف لا يبدو HTML صالحاً — يجب أن يحتوي على <!DOCTYPE html> أو وسم <html> أو <body>",
    };
  }

  // Must integrate with the platform score bridge
  if (!/window\.submitScore\s*\(/.test(html)) {
    return {
      valid: false,
      error:
        "الاختبار يجب أن يستدعي window.submitScore(درجة) عند الانتهاء من التصحيح — راجع دليل مؤلف الاختبار",
    };
  }

  return { valid: true };
}
