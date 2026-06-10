/**
 * ask-options.ts — Shared utility for extracting and rendering [[ASK_OPTIONS]]
 * protocol tags from AI teacher messages, plus Arabic text normalisation.
 *
 * The format is: [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| opt3 ||| غير ذلك]]
 *
 * Used by both subject.tsx (legacy teaching path) and v4-lesson.tsx (v4 path).
 */

/**
 * Fix common Arabic spacing errors where words are stuck together.
 * Handles two classes of bugs:
 *   1. Known prefixes/prepositions fused to the following word
 *      (e.g. "علىالشاشه" → "على الشاشه").
 *   2. Empty HTML tags (span/div/p) that were stripped without preserving the
 *      word boundary they represented.
 *
 * This is intentionally conservative — it only inserts a space when a known
 * standalone prefix is immediately followed by an Arabic letter, and the
 * resulting prefix is ≥ 2 chars. It does NOT split legitimate single-word
 * forms like "بالكتاب" (بـ + ال + كتاب).
 */
export function normalizeArabicText(text: string): string {
  if (!text) return text;

  // Known prefixes that the model frequently fails to separate.
  // MUST be sorted longest-first so that "عندما" matches before "عند",
  // "عند" before "عن", "منذ" before "من", "ليست" before "ليس", etc.
  // A shorter prefix that is also a substring of a longer one would
  // otherwise consume the start of the longer prefix and leave a broken
  // remnant (e.g. "عن" matching first in "عندالباب" → "عن دالباب").
  const prefixes = [
    "عندما", "هؤلاء", "أولئك",
    "هذه", "ذلك", "تلك", "هذا",
    "بدون", "ليست", "ليس",
    "عند", "على", "منذ", "بين", "خلال", "حول", "حتى", "قبل",
    "تحت", "فوق", "ضد",
    "كانت", "كان", "يكون",
    "سوف", "بعض",
    "عن", "من", "إلى",
    "هل", "قد", "لا", "ما", "أي",
  ];

  // NOTE — the following common prefix-like words are intentionally removed
  // because the AI model (Gemini) consistently separates them with spaces,
  // making the "fused" case vanishingly rare. Keeping them caused visible
  // false positives inside valid single words:
  //   "بعد"  — breaks "بعدين" (then)        | "بعدالدرس" ≈ never
  //   "مع"   — breaks "معلومة" (information) | "معالدرس"  ≈ never
  //   "لن"   — breaks "لنا" (for us)         | "لنيذهب"   ≈ never
  //   "لم"   — breaks "لما" (when)          | "لميذهب"   ≈ never
  //   "في"   — breaks "فيه" (inside it)     | "فيالدرس"  ≈ never
  //   "كل"   — breaks "كلام" (speech)       | "كلطالب"   ≈ never
  //
  // The negative lookbehind ignores internal substrings (e.g. "أهلاً" →
  // "هل" preceded by "أ" → skip). The single-pass alternation ensures
  // "عند" always wins over "عن" (longer alternative tested first).

  let result = text;

  // Build a single alternation regex with ALL prefixes joined by |.
  // Because the array is sorted longest-first, the regex engine tries the
  // longest alternatives first (ECMAScript leftmost-alternation rule).
  // A single-pass replace avoids the destructive chain where a shorter
  // prefix (e.g. "عن") re-matches inside the output of a longer one
  // (e.g. "عند الباب" → "عن د الباب").
  //
  // The replace callback also guards against "prefix chain" breakage:
  // when a shorter prefix matches because the longer one was followed by
  // a non-Arabic character (e.g. "عندما" followed by space, causing
  // "عند" to match inside "عندما"), we check whether prefix+nextChar
  // starts a longer known prefix and skip the match if it does.
  const megare = new RegExp(
    `(?<![\\u0621-\\u064a\\u0660-\\u06ff])(${prefixes.join("|")})([\\u0621-\\u064a\\u0660-\\u06ff])`,
    "g",
  );
  result = result.replace(megare, (match, prefix, nextChar) => {
    const candidate = prefix + nextChar;
    for (const p of prefixes) {
      if (p.length > prefix.length && p.startsWith(candidate)) {
        return match;
      }
    }
    return prefix + " " + nextChar;
  });

  return result;
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
  // tag and the tag itself. If it looks like an option (starts with
  // إن/بأن/أي/لازم etc. or is a complete sentence), move it into options.
  if (tagIndex > 0) {
    const before = content.slice(0, tagIndex);
    // Find the last sentence boundary (period, question mark, newline, or
    // HTML block tag) before the tag.
    const lastBreak = Math.max(
      before.lastIndexOf("\n"),
      before.lastIndexOf(". "),
      before.lastIndexOf("؟ "),
      before.lastIndexOf("? "),
      before.lastIndexOf("<br"),
    );
    const candidateStart = lastBreak >= 0 ? lastBreak + 1 : 0;
    let candidate = before.slice(candidateStart).trim();
    // Strip trailing punctuation/spaces that glue it to the tag.
    candidate = candidate.replace(/[.؟،!\s]+$/, "").trim();

    if (
      candidate.length >= 6 &&
      /^(?:إنَّ?|بأنَّ?|أي|يعني|لازم|يجب|م(?:ن|ا)|هذا|هذه|ذلك|تلك|لأن|فإن|قد|سـ|لا|لن|لم|هل|عندما|إذا|كل|بعض)[\s\u0600-\u06ffa-zA-Z0-9`'"()[\]{}=+\-*/<>!@#$%^&|\\.,;:?_~]/.test(candidate) &&
      candidate !== questionRaw.trim()
    ) {
      strippedOut = strippedOut
        .replace(new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "g"), "")
        .trim();
      options = [normAr(decodeHtmlEntities(candidate)), ...options];
    }
  }

  // Strategy (b): trailing-text fallback — broader than before, now accepts
  // Latin + digits so options containing English/code are caught.
  if (options.length > 0) {
    const orphanMatch2 = strippedOut.match(
      /(?:^|\n)\s*((?:إنَّ?|بأنَّ?|أي|يعني|لازم|يجب|م(?:ن|ا)|هذا|هذه|ذلك|لأن|فإن)\s[\u0600-\u06ffa-zA-Z0-9`'"()[\]{}=+\-*/<>\s.,;:!?_~]+?)(?:\s*)$/,
    );
    if (orphanMatch2) {
      const orphan2 = orphanMatch2[1].trim();
      if (orphan2.length >= 6 && orphan2 !== questionRaw.trim()) {
        strippedOut = strippedOut.replace(orphanMatch2[0], "").trim();
        // Only add if not already captured by strategy (a)
        const alreadyAdded = options.some((o) => o.indexOf(orphan2) >= 0 || orphan2.indexOf(o) >= 0);
        if (!alreadyAdded) {
          options = [normAr(decodeHtmlEntities(orphan2)), ...options];
        }
      }
    }
  }

  return { stripped: strippedOut, ask: { question, options, allowOther } };
}
