/**
 * ask-options.ts — Shared utility for extracting and rendering [[ASK_OPTIONS]]
 * protocol tags from AI teacher messages, plus Arabic text normalisation.
 *
 * The format is: [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| opt3 ||| غير ذلك]]
 *
 * Used by both subject.tsx (legacy teaching path) and v4-lesson.tsx (v4 path).
 */

/**
 * Arabic text passthrough — intentionally a no-op.
 *
 * We do NOT post-process the AI teacher's Arabic to "repair" spacing.
 * Reconstructing Arabic word boundaries with regular expressions is
 * fundamentally impossible without a full morphological analyzer/dictionary:
 * the definite article "ال" and the single-letter prefixes (ب، ل، ك، ف، و)
 * occur INSIDE ordinary words (عالم، رسالة، بالعملاء، بالضبط …), so every
 * space-insertion heuristic eventually splits a valid word. Repeated attempts
 * to tune such heuristics only traded one broken word-class for another
 * (e.g. عالم → "ع الم", رسالة → "رس الة"), so the heuristic was removed for good.
 *
 * Correct spacing is guaranteed at the source instead: the teaching models emit
 * correctly-spaced Arabic, and the L9 language-layer system prompt carries an
 * explicit "no fused words" rule. This identity function is retained so its call
 * sites (v4-lesson.tsx, subject.tsx, and the ASK_OPTIONS labels below) keep a
 * single, safe place where a future dictionary-based normalizer could live.
 */
export function normalizeArabicText(text: string): string {
  return text;
}

export type AskOptionsResult = {
  stripped: string;
  ask: {
    question: string;
    options: string[];
    allowOther: boolean;
  } | null;
};

/**
 * Decode HTML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, `&nbsp;`)
 * so that teacher-emitted tag examples (e.g. `&lt;p&gt;`) render as readable
 * text in button labels rather than raw escaped sequences.
 *
 * Runs decoding twice to handle the rare double-escaped case (e.g. when
 * the model writes `&amp;lt;p&amp;gt;`).
 */
export function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  if (typeof document === "undefined") {
    // SSR fallback — handle the common entities only.
    return s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  let out = ta.value;
  if (out.includes("&") && /&(?:lt|gt|amp|quot|#\d+|#x[0-9a-f]+);/i.test(out)) {
    ta.innerHTML = out;
    out = ta.value;
  }
  return out;
}

/**
 * Extracts [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| غير ذلك]] from content.
 *
 * Uses ||| as delimiter so question/options can safely contain a single |
 * Uses [\s\S]+? (non-greedy any-char) so single `]` inside the question or
 * options (e.g. programming examples like `arr[0]`) doesn't break the parser —
 * the `]]` closing fence is what terminates the match.
 */
export function extractAskOptions(content: string): AskOptionsResult {
  const m = content.match(/\[\[\s*ASK_OPTIONS\s*:\s*([\s\S]+?)\]\](?!\])/);
  if (!m) return { stripped: content, ask: null };
  // Prefer ||| delimiter; fall back to single | only if ||| not present
  const raw = m[1];
  const parts = (raw.includes("|||") ? raw.split("|||") : raw.split("|"))
    .map((s) => s.trim())
    .filter(Boolean);
  // After stripping the tag, also collapse any wrapper tags it left empty
  // (e.g. the model put it inside its own <p>...</p> or <div>...</div>).
  // REPLACE (don't just DELETE) empty wrappers with a single space so word
  // boundaries are preserved — "على<p></p>الشاشة" → "على الشاشة".
  const cleanStripped = (raw0: string) =>
    raw0
      .replace(m[0], " ")
      .replace(/<(p|div|span)[^>]*>\s*<\/\1>/gi, " ")
      .replace(/(\s*<br\s*\/?>\s*){2,}/gi, "<br/>")
      .replace(/\s{2,}/g, " ")
      .trim();
  if (parts.length < 2) return { stripped: cleanStripped(content), ask: null };
  const [questionRaw, ...rawOpts] = parts;
  const allowOther = rawOpts.some((o) => /غير\s*ذلك/i.test(o) || /^other$/i.test(o));

  /** Normalise common Arabic typos that affect readability. */
  const normAr = (s: string) =>
    s
      .replace(/إنكلمة/g, "إن كلمة")
      .replace(/كلمةيعرفها/g, "كلمة يعرفها")
      .replace(/لازمأستخدم/g, "لازم أستخدم");

  // Decode HTML entities in question + each option so labels containing
  // tag examples (e.g. `وسم <p> (فقرة عادية)`) render readable text instead
  // of raw `&lt;p&gt;` escape sequences in the buttons.
  let question = normalizeArabicText(normAr(decodeHtmlEntities(questionRaw)));
  let options = rawOpts
    .filter((o) => !(/غير\s*ذلك/i.test(o) || /^other$/i.test(o)))
    .map((o) => normalizeArabicText(normAr(decodeHtmlEntities(o))));

  let strippedOut = cleanStripped(content);

  // ── FINAL GUARD: rescue a mis-slotted first option ──────────────────────
  // The segment before the first `|||` is parsed as `question`. But the model
  // very frequently writes the real question in the narrative body and then
  // starts the tag directly with the options, so `question` ends up holding the
  // FIRST OPTION (often the correct answer). Symptom the user reported: the
  // first option ALWAYS renders as a non-clickable highlighted label instead of
  // a button, and the option-letter badges (أ ب ج) start from the 2nd option.
  //
  // Detection (deliberately conservative to avoid eating a real question):
  //   1. `question` does NOT read like a question (no ؟/? and doesn't start
  //      with an Arabic question/imperative word), AND
  //   2. the body already ends with a question — i.e. the real question is
  //      shown above the buttons.
  // When both hold, demote `question` to the first option and clear the slot so
  // every option (including the first) becomes a proper clickable button and
  // the duplicate gold label disappears.
  const readsLikeQuestion = (s: string): boolean => {
    const t = (s || "").trim();
    if (!t) return false;
    if (/[؟?]/.test(t)) return true;
    // A stem ending with a colon ("…النظام يسمى:") is a fill-in prompt, not an
    // option — never demote it to a button.
    if (/[:：]$/.test(t)) return true;
    return /^(هل|شو|كيف|كيفية|لماذا|ليش|وين|أين|متى|ماذا|أيّ|أيُّ|أي\s|ما\s|ماهو|ما\s*هو|ما\s*هي|كم\s|اختر|اختَر|أكمل|حدّد|حدد|صنّف|صنف|رتّب|رتب|اذكر|عرّف|عرف|أيّهما|أيهما)/u.test(t);
  };

  // Strings that look like answers/options rather than questions.
  // When the first segment matches this pattern it is almost certainly a
  // mis-slotted option — the model wrote the real question in the prose body
  // and started the tag directly with the first option text.
  const readsLikeAnswer = (s: string): boolean => {
    const t = (s || "").trim();
    if (!t) return false;
    return /^(نعم|لا\s|لا،|أفضل|صحيح|يمكن|يعتمد|غالباً|بالتأكيد|ممكن|أعتقد|أظن|ليس|سهل|صعب|مجاني|مدفوع|كلا|كلاهما|واحد|اثنان|أكثر|أقل|الأول|الثاني|الثالث|سأ|جاري|انتهيت|واجهتني|يظهر|ظهر)/u.test(t);
  };

  // Strip tags then check whether the body's final sentence is a question.
  // Tolerate trailing markdown emphasis (**bold**, _italic_, `code`), quotes,
  // brackets and emoji after the mark, since the model frequently ends its
  // question that way ("**شو تتوقع؟**", "شو تتوقع؟ 🤔") — without this the guard
  // misses and the first option silently relapses into a label.
  const bodyTail = strippedOut
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /[\s*_`~"'«»()\[\]\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1FAFF}]+$/u,
      "",
    );
  const bodyEndsWithQuestion = /[؟?]$/.test(bodyTail);

  // Also check the last 300 characters of the body for a question mark.
  // This catches the case where the model writes "...مهم في البرمجة؟ حتى لو
  // كان الشرح بالعربي، الكود لازم يكون واضح عالمياً." — the ؟ exists but
  // isn't the last character, so bodyEndsWithQuestion misses it.
  const bodyLast300 = strippedOut
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(-300);
  const bodyHasRecentQuestion = /[؟?]/.test(bodyLast300);

  if (
    question &&
    !readsLikeQuestion(question) &&
    (bodyEndsWithQuestion || bodyHasRecentQuestion || readsLikeAnswer(question))
  ) {
    options = [question, ...options];
    question = "";
  }

  return { stripped: strippedOut, ask: { question, options, allowOther } };
}
