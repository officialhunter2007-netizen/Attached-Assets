/**
 * ask-options.ts — Shared utility for extracting and rendering [[ASK_OPTIONS]]
 * protocol tags from AI teacher messages, plus Arabic text normalisation.
 *
 * The format is: [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| opt3 ||| غير ذلك]]
 *
 * Used by both subject.tsx (legacy teaching path) and v4-lesson.tsx (v4 path).
 */

/**
 * Fix Arabic spacing errors that multiple AI providers produce.
 *
 * Strategy — layered in order of safety (highest-precision first):
 *
 *  Layer 1 (high-precision): tanwin-alef (اً) and ta-marbuta (ة) — both are
 *            unambiguous word-ending signals. Split after them whenever
 *            another Arabic letter follows.
 *
 *  Layer 2 (high-precision): standalone adverbs (جداً, أيضاً, تماماً, …) —
 *            adverbs ending in اً are never internal substrings.
 *
 *  Layer 3 (high-precision): prefix/preposition followed by a definite noun
 *            (prefix + "ال…") when the prefix is NOT preceded by an Arabic
 *            letter — e.g. "فيالبيت" → "في البيت".
 *
 *  Layer 4 (high-precision): standalone particles (هذا, هذه, ذلك, تلك,
 *            ليس, ليست, لكن, بدون, سوف, بعض, ضد, عندما, أيضاً) — these
 *            are never substrings of larger words, so splitting on them is
 *            safe in all positions including end-of-text.
 *
 *  Layer 5 (medium-precision): short prepositions (في, من, على, عن, مع, …)
 *            fused between Arabic words. Guarded by a 4-character minimum
 *            lookahead to avoid splitting inside compound words like معروف.
 *
 *  Layer 6 (lower-precision, defensive): insert a space before every
 *            definite article (ال) that follows an Arabic letter. This is
 *            the safety net for deeply-fused runs where earlier layers
 *            cannot identify individual word boundaries.
 *
 * The AR range includes letters (0621-064a) plus diacritics (064b-065f)
 * so vowel marks (fatha, damma, kasra, shadda, sukun) don't break the
 * consecutive-Arabic-character counters used by the length guards.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return text;

  // Arabic letters (0621-064a) + diacritics (064b-065f) + digits/presentation (0660-06ff).
  // The diacritic range was previously missing, causing layers that look for
  // ≥N consecutive Arabic characters to fail whenever a vowel mark (fatha,
  // damma, kasra, shadda, sukun) appeared between two letters.
  const AR = "\u0621-\u065f\u0660-\u06ff";

  // ── Layer 1: word-ending signals — strongest, almost zero false positives ──
  //   a) 'اً' = tanwin-alef — always marks the END of an Arabic word.
  //      Split AFTER it when another Arabic letter follows.
  //   b) 'ة'  = ta-marbuta — only ever appears at word endings.
  let out = text.replace(
    new RegExp(`([${AR}])اً([${AR}])`, "g"),
    "$1اً $2",
  );
  out = out.replace(
    new RegExp(`(ة)([${AR}])`, "g"),
    "$1 $2",
  );

  // ── Layer 2: standalone adverbs — every adverb in this list ends in 'اً'
  //   and is never a substring of a larger word.
  out = out.replace(
    new RegExp(
      `([${AR}])(جداً|أيضاً|تماماً|قليلاً|مثلاً|أحياناً|فعلاً|عموماً|أساساً|كثيراً|سريعاً|دائماً|حقاً|فوراً|أخيراً|عادةً|غالباً|طبعاً|تقريباً|نادراً)`,
      "g",
    ),
    "$1 $2",
  );

  // ── Layer 3: prefix/preposition fused to a definite noun (prefix + "ال…") ──
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
  out = out.replace(
    new RegExp(
      `(?<![${AR}])(${prefixes.join("|")})(ال[${AR}])`,
      "g",
    ),
    (_m, prefix, rest) => `${prefix} ${rest}`,
  );

  // ── Layer 4: high-confidence standalone particles fused between Arabic words ──
  // These are words that are essentially never substrings of larger words,
  // so splitting on them is safe even without a length guard.
  const particles = [
    "هذا", "هذه", "ذلك", "تلك", "هذي", "هذيك", "هذولا",
    "هؤلاء", "أولئك",
    "ليس", "ليست", "لكن", "بدون", "سوف", "بعض", "ضد",
    "عندما", "أيضاً",
  ];
  const pPattern = particles.sort((a, b) => b.length - a.length).join("|");
  // Split on both sides when the particle sits between Arabic letters, and
  // also at end-of-text (the model frequently fuses a trailing هذا/هذه/لكن
  // with no following word).
  out = out.replace(
    new RegExp(`([${AR}])(${pPattern})([${AR}]|$)`, "g"),
    "$1 $2$3",
  );

  // ── Layer 5: short prepositions fused between Arabic words ──
  // Guard: the preposition must be followed by 4+ Arabic letters to avoid
  // splitting inside compound words like معروف (مع + روف = 3 chars), فيلق…
  // Also catches preposition at start-of-text or after non-Arabic (e.g. a
  // space inserted by an earlier layer).
  const preps = [
    "في", "من", "إلى", "على", "عن", "مع", "عند",
    "بين", "تحت", "فوق", "حتى", "منذ", "خلال",
    "حول", "قبل", "بعد", "دون",
  ];
  const ppPattern = preps.sort((a, b) => b.length - a.length).join("|");
  // Case A: preposition between two Arabic words
  out = out.replace(
    new RegExp(`([${AR}])(${ppPattern})(?=[${AR}]{4,})`, "g"),
    "$1 $2 ",
  );
  // Case B: preposition at the start of an Arabic run (after non-Arabic or
  // start-of-text) — e.g. "فينُخبة" at the beginning of a fused segment.
  out = out.replace(
    new RegExp(`(^|[^${AR}])(${ppPattern})(?=[${AR}]{4,})`, "g"),
    "$1$2 ",
  );

  // ── Layer 6: long-run heuristic for deeply fused Arabic ──
  // For runs of 12+ consecutive Arabic letters without a space, insert a
  // space before every definite article (ال) and before every standalone
  // particle from Layer 4 (re-applied for runs that survived the first pass).
  // This is the safety net — low precision but catches the worst cases.
  out = out.replace(
    new RegExp(`([${AR}])(ال)(?=[${AR}])`, "g"),
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
