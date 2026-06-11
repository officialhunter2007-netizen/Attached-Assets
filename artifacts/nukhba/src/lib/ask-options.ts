/**
 * ask-options.ts — Shared utility for extracting and rendering [[ASK_OPTIONS]]
 * protocol tags from AI teacher messages, plus Arabic text normalisation.
 *
 * The format is: [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| opt3 ||| غير ذلك]]
 *
 * Used by both subject.tsx (legacy teaching path) and v4-lesson.tsx (v4 path).
 */

/**
 * Fix the one common Arabic spacing error the AI teacher actually produces:
 * a preposition / demonstrative / كان-family word fused to a FOLLOWING DEFINITE
 * NOUN, i.e. prefix + "ال…"  (e.g. "علىالشاشة" → "على الشاشة",
 * "عندالباب" → "عند الباب", "هذاالكتاب" → "هذا الكتاب").
 *
 * KEY DESIGN — split ONLY when the prefix is immediately followed by the
 * definite article "ال" plus at least one more letter. This is deliberately
 * narrow because it is the highest-precision signal of a real fusion:
 *   • Every genuine fusion the model emits is prefix + الـ (definite nouns are
 *     overwhelmingly what follows a preposition in real text).
 *   • It eliminates the entire false-positive class that a "prefix + any Arabic
 *     letter" rule mangles: عنصر (element!) → "عن صر", منهج → "من هج",
 *     منطق، عنوان، منطقة، منتج، عندك، منه، بينهم، هذان، يكونوا … all survive,
 *     because none of them have "ال" right after the prefix.
 *   • Valid words that ARE prefix+ال with nothing after (e.g. the name/word
 *     "منال") are spared by requiring a letter after the article.
 * The only thing sacrificed is the rare indefinite fusion ("منهاتف"); the model
 * almost never produces those, so the trade strongly favours precision.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return text;

  // Words that get fused to a following "الـ" noun. Sorted longest-first so the
  // alternation prefers the longer match (عندما before عند, عند before عن,
  // منذ before من, ليست before ليس) — though the required "ال" boundary already
  // resolves most overlaps on its own.
  const prefixes = [
    "عندما", "هؤلاء", "أولئك",
    "هذه", "ذلك", "تلك", "هذا",
    "بدون", "ليست", "ليس",
    "عند", "على", "منذ", "بين", "خلال", "حول", "حتى", "قبل",
    "تحت", "فوق", "ضد",
    "كانت", "كان", "يكون",
    "سوف", "بعض",
    "عن", "من", "إلى",
    "مع", "في", "لكن",
  ];

  // Require: (word boundary) prefix + "ال" + (a noun letter). The leading
  // negative lookbehind keeps us at a real word start (so "أهلاً" isn't touched);
  // the trailing letter after "ال" prevents splitting "منال" → "من ال".
  const megare = new RegExp(
    `(?<![\\u0621-\\u064a\\u0660-\\u06ff])(${prefixes.join("|")})(ال[\\u0621-\\u064a\\u0660-\\u06ff])`,
    "g",
  );

  let out = text.replace(megare, (_m, prefix, rest) => `${prefix} ${rest}`);

  // Pass 2: common standalone adverbs (always end with tanwin, never a suffix
  // of a larger word) fused to a preceding Arabic word without a space.
  // e.g. "مهمجداً" → "مهم جداً", "صحيحأيضاً" → "صحيح أيضاً".
  // The leading Arabic char group ensures we only split when there is no space.
  out = out.replace(
    /([\u0621-\u064a\u0660-\u06ff])(جداً|أيضاً|تماماً|قليلاً|مثلاً|أحياناً|فعلاً|عموماً|أساساً|كثيراً|سريعاً|دائماً|حقاً|فوراً|أخيراً|عادةً|غالباً)/g,
    "$1 $2",
  );

  return out;
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
  const m = content.match(/\[\[ASK_OPTIONS:\s*([\s\S]+?)\]\]/);
  if (!m) return { stripped: content, ask: null };
  // Prefer ||| delimiter; fall back to single | only if ||| not present
  const raw = m[1];
  const parts = (raw.includes("|||") ? raw.split("|||") : raw.split("|"))
    .map((s) => s.trim())
    .filter(Boolean);
  // After stripping the tag, also collapse any wrapper tags it left empty
  // (e.g. the model put it inside its own <p>...</p> or <div>...</div>).
  const cleanStripped = (raw0: string) =>
    raw0
      .replace(m[0], "")
      .replace(/<(p|div|span)[^>]*>\s*<\/\1>/gi, "")
      .replace(/(\s*<br\s*\/?>\s*){2,}/gi, "<br/>")
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
  let question = normAr(decodeHtmlEntities(questionRaw));
  let options = rawOpts
    .filter((o) => !(/غير\s*ذلك/i.test(o) || /^other$/i.test(o)))
    .map((o) => normAr(decodeHtmlEntities(o)));

  // Detect orphaned first option that the model wrote as part of the
  // narrative sentence before the [[ASK_OPTIONS]] tag instead of inside it.
  // Two strategies, tried in order:
  //
  // (a) The text IMMEDIATELY before the tag (in the original content) is a
  //     standalone sentence — the model wrote the first option as narration
  //     and then put only the remaining options inside the tag.
  // (b) Fallback: the trailing text in the stripped output matches a known
  //     Arabic sentence-starter pattern.
  let strippedOut = cleanStripped(content);
  const tagIndex = content.indexOf(m[0]);

  // Strategy (a): extract text between the last sentence break before the
  // tag and the tag itself. If the text between the last double-newline (or
  // start-of-content) and the [[ASK_OPTIONS]] tag is a short standalone line
  // that looks like an option — regardless of which word it starts with —
  // move it into the options array.
  //
  // Special case: if the pre-tag line looks like a QUESTION (contains ؟ or
  // starts with a question word) and the in-tag question is a trivial
  // placeholder (≤ 3 chars, e.g. just "؟"), the model wrote the real question
  // outside the tag. We promote it to be the question instead of an option.
  if (tagIndex > 0) {
    const before = content.slice(0, tagIndex);
    // Look for the last "paragraph break": two consecutive newlines, or a
    // newline preceded by sentence-ending punctuation. This catches orphaned
    // options that the model wrote as their own line before the tag.
    const paraBreak = Math.max(
      before.lastIndexOf("\n\n"),
      before.lastIndexOf(".\n"),
      before.lastIndexOf("؟\n"),
    );
    const candidateStart = paraBreak >= 0 ? paraBreak + 1 : 0;
    let candidate = before.slice(candidateStart).trim();
    // Strip trailing punctuation / spaces / emoji that glue it to the tag.
    candidate = candidate.replace(/[.؟،!\s\u{1F300}-\u{1FAFF}]+$/u, "").trim();

    // Conditions for a valid orphan:
    //   - Reasonable length (3-120 chars)
    //   - Not identical to the question inside the tag
    //   - The original content had fewer than 26 chars per line on average
    //     (a long paragraph is unlikely to be a standalone option)
    const candidateLines = candidate.split("\n").filter(Boolean);
    const isShortLine =
      candidateLines.length <= 3 &&
      candidateLines.every((l) => l.length <= 120);

    // Detect if the candidate looks like a question sentence rather than an
    // option label. A question-like candidate should NEVER be shown as a
    // clickable option button — it is always either the actual question or
    // the teacher's transition sentence.
    const candidateLooksLikeQuestion =
      candidate.includes("؟") ||
      candidate.includes("?") ||
      /^(هل|ما\s|شو|كيف|لماذا|من\s|أين|متى|الحين|خليني|دعني|ما\s+هو|ما\s+هي|ماذا|أيّ|أي\s)/u.test(candidate);

    // Detect if the in-tag question is a trivial placeholder (e.g. just "؟").
    // This happens when the model writes the real question as narration before
    // the tag and only puts a stub inside it.
    const questionIsPlaceholder = questionRaw.trim().length <= 3;

    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (
      candidate.length >= 3 &&
      candidate.length <= 120 &&
      candidate !== questionRaw.trim() &&
      isShortLine
    ) {
      if (candidateLooksLikeQuestion) {
        // The pre-tag sentence is the real question — use it as the question.
        // If the in-tag question was already a real question, keep the better
        // one (the longer / more informative of the two).
        if (questionIsPlaceholder || candidate.length > question.length) {
          question = normAr(decodeHtmlEntities(candidate));
        }
        // Always remove the candidate from the stripped narrative text.
        strippedOut = strippedOut
          .replace(new RegExp(escaped + "\\s*", "g"), "")
          .trim();
        // Do NOT add it to options.
      } else {
        // Original orphan recovery — add as first option.
        strippedOut = strippedOut
          .replace(new RegExp(escaped + "\\s*", "g"), "")
          .trim();
        options = [normAr(decodeHtmlEntities(candidate)), ...options];
      }
    }
  }

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

  if (question && !readsLikeQuestion(question) && bodyEndsWithQuestion) {
    options = [question, ...options];
    question = "";
  }

  return { stripped: strippedOut, ask: { question, options, allowOther } };
}
