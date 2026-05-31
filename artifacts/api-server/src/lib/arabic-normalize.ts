// Arabic text normalization for indexing and querying.
//
// Goal: a search for "الإسلام" must match indexed text containing "الاسلام"
// or even a diacritized "الإِسْلام". Postgres' built-in tsvector ('simple'
// config) does case-folding only — it does not unify the alef forms, strip
// diacritics (harakat), drop tatweel, or normalize taa marbuta / alef
// maqsura. Without this layer, FTS over Arabic books finds almost nothing
// when the student types a word with even slightly different spelling.
//
// We therefore normalize BOTH:
//   * what we store on `material_chunks.content_normalized` at ingest time
//   * what we feed into `to_tsquery('simple', …)` at query time
// using the exact same function, so the comparison is apples-to-apples.

const TATWEEL = /\u0640/g;
const HARAKAT = /[\u064B-\u0652\u0670\u0671]/g; // diacritics + dagger alef + alef wasla
const ALEF_VARIANTS = /[\u0623\u0625\u0622\u0671\u0670]/g; // أ إ آ ٱ ٰ → ا
const ALEF_MAKSURA = /\u0649/g;                 // ى → ي
const TAA_MARBUTA = /\u0629/g;                  // ة → ه
const ARABIC_PRESENTATION_FORMS = /[\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Normalize Arabic text for case-insensitive, diacritic-insensitive FTS.
 *
 * Pure function. Runs on every chunk row inserted plus every search query —
 * keep it cheap (no regex compilation per call, no allocations beyond the
 * resulting string).
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC");
  // Drop Arabic presentation-form ligatures by re-decomposing them; most
  // come from Word/Office exports. NFKC above already handles most of them
  // but we strip any leftovers defensively.
  s = s.replace(ARABIC_PRESENTATION_FORMS, "");
  s = s.replace(HARAKAT, "");
  s = s.replace(TATWEEL, "");
  s = s.replace(ALEF_VARIANTS, "\u0627"); // → ا
  s = s.replace(ALEF_MAKSURA, "\u064A");  // → ي
  s = s.replace(TAA_MARBUTA, "\u0647");   // → ه
  // Convert Arabic-Indic digits to ASCII so "صفحة ١٢" indexes the same as
  // "صفحة 12". Search input is also passed through here so they unify.
  s = s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
  // Collapse any whitespace run (incl. Unicode whitespace from PDF layout
  // resets) into a single ASCII space — the tsvector tokenizer splits on it.
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

// Common single-letter Arabic clitics (conjunctions/prepositions) that fuse
// onto the front of a noun: و (and), ف (then), ب (with/in), ل (for/to),
// ك (like), س (will). These must be peeled BEFORE the "ال" article so a
// query like "بالذرات" reduces through "الذرات" → "ذرات" → stem "ذر".
const LEADING_CLITICS = ["و", "ف", "ب", "ل", "ك", "س"];
// Common Arabic noun/verb suffixes — possessives, plural & feminine markers.
// Order matters: longer suffixes first so "ـات" doesn't get truncated by "ـة".
const TRAILING_SUFFIXES = ["ات", "ون", "ين", "ان", "ها", "هم", "هن", "نا", "كم", "كن", "تم", "تن", "ة", "ه", "ي", "ا"];

function stripArabicClitics(tok: string): string {
  let s = tok;
  for (const c of LEADING_CLITICS) {
    if (s.startsWith(c) && s.length > c.length + 2) {
      s = s.slice(c.length);
      break;
    }
  }
  if (s.startsWith("ال") && s.length >= 4) s = s.slice(2);
  return s;
}

function stripArabicSuffix(tok: string): string {
  for (const sfx of TRAILING_SUFFIXES) {
    // Min residue 2 (not 3) so taa-marbuta words like "ذره" → "ذر" still
    // produce a usable stem; the Arabic root system tops out at trilateral
    // but bilateral fragments are still meaningful for prefix matching.
    if (tok.endsWith(sfx) && tok.length - sfx.length >= 2) return tok.slice(0, -sfx.length);
  }
  return tok;
}

/**
 * Index-time projection: returns the normalized text PLUS its stem variants,
 * each separated by a space, so that to_tsvector('simple', …) emits both
 * the original and the stem as searchable lexemes. With this, an indexed
 * "بالذرات" produces lexemes for "بالذرات", "ذرات", and "ذر" — letting a
 * query for "الذرة" (which expands to "ذره" / "ذر") hit the row.
 */
export function normalizeArabicForIndex(input: string): string {
  const base = normalizeArabic(input);
  if (!base) return "";
  const tokens = base.split(/\s+/);
  const extras: string[] = [];
  const seen = new Set<string>();
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    const noClitic = stripArabicClitics(tok);
    if (noClitic !== tok && noClitic.length >= 2 && !seen.has(noClitic)) {
      seen.add(noClitic);
      extras.push(noClitic);
    }
    const stem = stripArabicSuffix(noClitic);
    if (stem !== noClitic && stem.length >= 2 && !seen.has(stem)) {
      seen.add(stem);
      extras.push(stem);
    }
  }
  return extras.length === 0 ? base : `${base} ${extras.join(" ")}`;
}

/**
 * Normalize a query string and split into tokens suitable for to_tsquery.
 * Strips short tokens, dedupes, and limits to the top 12 most distinctive.
 * For each token we also emit a stem (clitic-stripped, suffix-stripped)
 * variant so a search for "الذرة" matches "بالذرات", "ذرات", "ذرتها", etc.
 * Tokens are returned WITHOUT a tsquery prefix marker — the caller decides
 * whether to append `:*`.
 */
export function normalizeQueryTokens(query: string, opts: { stripAl?: boolean } = {}): string[] {
  const stripAl = opts.stripAl ?? true;
  const normalized = normalizeArabic(query);
  if (!normalized) return [];
  const raw = normalized.split(/[^\p{L}\p{N}]+/u);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (val: string) => {
    if (val.length < 2 || seen.has(val)) return;
    seen.add(val);
    out.push(val);
  };
  for (const t of raw) {
    const tok = t.trim();
    if (tok.length < 2) continue;
    push(tok);
    if (stripAl) {
      const noClitic = stripArabicClitics(tok);
      if (noClitic !== tok) push(noClitic);
      const stem = stripArabicSuffix(noClitic);
      if (stem !== noClitic && stem.length >= 3) push(stem);
    }
    if (out.length >= 24) break;
  }
  return out.slice(0, 16);
}

/**
 * Detect the offset between PDF page number and the printed page number
 * shown in the book's footer. Cover/front-matter pages typically push the
 * printed "1" to PDF page 5 or 6, so a citation of "صفحة 12" should map to
 * PDF page 12 + offset.
 *
 * Looks at the last 1-3 lines of each of the first 30 pages for a bare
 * digit or a labeled digit ("صفحة 5", "ص ٥", "Page 5"). Picks the most
 * frequent (printedPage - pdfPage) delta. Returns 0 when undetermined —
 * preserves legacy citation behaviour for digital PDFs that already have
 * matching numbers.
 */
export function detectPrintedPageOffset(pageTexts: Map<number, string>): number {
  if (pageTexts.size < 5) return 0;
  const tally = new Map<number, number>();
  const pages = Array.from(pageTexts.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 30);
  for (const [pdfPage, raw] of pages) {
    if (!raw) continue;
    // Soft-normalize ONLY characters relevant to footer/header digit detection
    // (digits, alef variants, taa marbuta, diacritics, tatweel) while
    // preserving line breaks. The full normalizeArabic() collapses whitespace
    // into single spaces, which destroys the per-line structure we need.
    let text = String(raw).normalize("NFKC");
    text = text.replace(HARAKAT, "").replace(TATWEEL, "");
    text = text.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    text = text.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
    text = text.toLowerCase();
    if (!text.trim()) continue;
    const lines = text.split(/[\n\r]+/).map((l) => l.replace(/[ \t\u00A0]+/g, " ").trim()).filter(Boolean);
    // Inspect the footer (last 2 lines) and header (first 1 line) for a
    // bare digit. PDF page numbers in book scans almost always live there.
    const candidates = [
      ...lines.slice(-2),
      ...(lines.length > 4 ? [lines[0]] : []),
    ];
    for (const line of candidates) {
      // Match either a bare 1-3 digit number, or one preceded/followed by
      // a label. We constrain to <= 999 so big footnote numbers don't poison
      // the tally.
      const m =
        line.match(/^(?:صفحه|صفحة|ص\.?|page|p\.?|pg|-)?\s*(\d{1,3})\s*(?:\/\s*\d+)?$/i) ||
        line.match(/^(\d{1,3})\s*(?:صفحه|صفحة|page|p\.?)$/i);
      if (!m) continue;
      const printed = Number(m[1]);
      if (!Number.isInteger(printed) || printed < 1 || printed > 999) continue;
      const delta = pdfPage - printed; // PDF page is delta higher than printed page
      tally.set(delta, (tally.get(delta) ?? 0) + 1);
      break; // one vote per page max
    }
  }
  if (tally.size === 0) return 0;
  // Pick the delta with the most votes — but require at least 3 supporting
  // pages so a single coincidental "Chapter 5" header doesn't decide it.
  let bestDelta = 0;
  let bestCount = 0;
  for (const [delta, count] of tally.entries()) {
    if (count > bestCount) {
      bestDelta = delta;
      bestCount = count;
    }
  }
  if (bestCount < 3) return 0;
  // Negative deltas mean the footer numbers were ahead of the PDF page index
  // (rare; usually a malformed scan). Treat those as undetermined.
  if (bestDelta < 0) return 0;
  // Sanity cap: a 30+ page front matter is almost never legitimate.
  if (bestDelta > 30) return 0;
  return bestDelta;
}

/**
 * Format a citation tag for one chunk, taking the printed page offset into
 * account. When offset = 0 we keep the legacy "صفحة N" form to avoid noisy
 * UI changes. When offset > 0 the citation surfaces both the printed and
 * the PDF page so the student can locate it in either view.
 */
export function formatPageCitation(pdfPage: number, offset: number): string {
  if (!offset || offset <= 0) return `صفحة ${pdfPage}`;
  const printed = pdfPage - offset;
  if (printed < 1) return `صفحة ${pdfPage}`;
  return `صفحة ${printed} (PDF ${pdfPage})`;
}
