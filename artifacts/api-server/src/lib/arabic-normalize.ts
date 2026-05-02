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

/**
 * Normalize a query string and split into tokens suitable for to_tsquery.
 * Strips short tokens, dedupes, and limits to the top 12 most distinctive.
 * The optional al- prefix on Arabic nouns is removed so "الفصل" matches
 * "فصل" (frequent in PDFs that drop the article in section headers).
 */
export function normalizeQueryTokens(query: string, opts: { stripAl?: boolean } = {}): string[] {
  const stripAl = opts.stripAl ?? true;
  const normalized = normalizeArabic(query);
  if (!normalized) return [];
  const raw = normalized.split(/[^\p{L}\p{N}]+/u);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of raw) {
    let tok = t.trim();
    if (tok.length < 2) continue;
    if (stripAl && /^ال/.test(tok) && tok.length >= 4) {
      // Strip definite article "ال" only when the result is still meaningful
      // (>=2 chars). "الـ" by itself becomes empty and is dropped above.
      const stripped = tok.slice(2);
      if (stripped.length >= 2 && !seen.has(stripped)) {
        seen.add(stripped);
        out.push(stripped);
      }
    }
    if (!seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
    }
    if (out.length >= 24) break;
  }
  return out.slice(0, 12);
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
    const text = normalizeArabic(raw);
    if (!text) continue;
    const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
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
