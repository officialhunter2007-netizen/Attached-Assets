/* ──────────────────────────────────────────────────────────────────────────
 * Deterministic code-identifier latinizer.
 *
 * The AI teacher (Gemini Flash Lite) repeatedly ignores prompt rules and writes
 * Arabic variable / function / class names inside code blocks. Prompt-only fixes
 * proved unreliable on a small model, so this module GUARANTEES the rule at
 * render time with zero model dependency:
 *
 *   • Identifiers (variables, functions, classes, constants) → English only.
 *   • Comments (after #, //, /* … *​/) → left untouched (Arabic stays).
 *   • String literals → left untouched (Arabic stays), EXCEPT interpolated
 *     identifiers inside f-strings ({…}) and template literals (${…}).
 *
 * It only ever touches text INSIDE fenced (```) code blocks and inline `code`
 * spans; ordinary prose is returned verbatim.
 * ────────────────────────────────────────────────────────────────────────── */

const AR_RANGE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isArabic(ch: string): boolean {
  return AR_RANGE.test(ch);
}

// Identifier characters: latin, digits, underscore, and Arabic letters.
function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch) || isArabic(ch);
}

// Per-character phonetic transliteration (fallback for words not in the dict).
const AR_CHAR: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ٱ": "a",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ى": "a", "ة": "a", "ء": "",
  "ؤ": "o", "ئ": "e",
  "پ": "p", "چ": "ch", "ژ": "zh", "گ": "g", "ک": "k", "ی": "y", "ڤ": "v",
  // diacritics / tatweel → drop
  "َ": "", "ُ": "", "ِ": "", "ّ": "", "ْ": "", "ً": "", "ٌ": "", "ٍ": "", "ـ": "",
};

// Common educational / programming Arabic words → clean English.
// Stored as base words; translateWord() also strips a leading "ال" before lookup,
// so both "الطالب" and "طالب" resolve to "student".
const DICT: Record<string, string> = {
  // people / school
  "طالب": "student", "طلاب": "students", "الطلاب": "students",
  "معلم": "teacher", "مدرس": "teacher", "مدرسة": "school",
  "مستخدم": "user", "مستخدمين": "users", "مستخدمون": "users",
  "موظف": "employee", "موظفين": "employees",
  "زبون": "customer", "عميل": "client", "عملاء": "clients",
  "لاعب": "player", "لاعبين": "players",
  // identity fields
  "اسم": "name", "أسماء": "names", "الاسم": "name",
  "عمر": "age", "العمر": "age",
  "بريد": "email", "ايميل": "email", "إيميل": "email",
  "هاتف": "phone", "جوال": "phone", "تليفون": "phone",
  "عنوان": "address", "كلمة": "word", "مرور": "password",
  // academic
  "معدل": "average", "متوسط": "average", "تراكمي": "cumulative",
  "درجة": "grade", "درجات": "grades", "علامة": "mark", "علامات": "marks",
  "مادة": "subject", "مواد": "subjects", "صف": "grade", "فصل": "term",
  "مستوى": "level", "مرحلة": "stage",
  // commerce
  "سعر": "price", "اسعار": "prices", "أسعار": "prices",
  "كمية": "quantity", "عدد": "count", "مجموع": "total", "اجمالي": "total", "إجمالي": "total",
  "مبلغ": "amount", "خصم": "discount", "ضريبة": "tax", "صافي": "net",
  "ربح": "profit", "خسارة": "loss", "رصيد": "balance", "حساب": "account",
  "فاتورة": "invoice", "راتب": "salary", "رواتب": "salaries",
  "منتج": "product", "منتجات": "products", "طلب": "order", "طلبات": "orders",
  "اشتراك": "subscription", "اشترك": "subscribed", "مشترك": "subscribed", "تجريبي": "trial",
  // generic data
  "قيمة": "value", "قيم": "values", "رقم": "number", "ارقام": "numbers", "أرقام": "numbers",
  "نتيجة": "result", "نتائج": "results", "بيانات": "data", "معلومات": "info",
  "رسالة": "message", "رسائل": "messages", "نص": "text", "كود": "code",
  "قائمة": "list", "جدول": "table", "صفحة": "page", "ملف": "file", "مجلد": "folder",
  "مفتاح": "key", "عنصر": "item", "عناصر": "items", "فهرس": "index", "عداد": "counter",
  "مجموعة": "group", "نوع": "type", "حالة": "status", "لون": "color",
  // units / measures
  "وحدة": "unit", "وحدات": "units", "عينة": "sample", "نموذج": "model",
  "حد": "limit", "قيد": "constraint", "معامل": "coefficient", "دقة": "precision",
  // sizes / geometry
  "حجم": "size", "طول": "length", "عرض": "width", "ارتفاع": "height",
  "مساحة": "area", "محيط": "perimeter", "نصف": "radius", "قطر": "diameter",
  "مربع": "square", "مكعب": "cube", "دائرة": "circle", "مثلث": "triangle",
  "مستطيل": "rectangle", "زاوية": "angle", "نقطة": "point", "خط": "line",
  // math / control
  "جمع": "sum", "طرح": "subtract", "ضرب": "multiply", "قسمة": "divide",
  "باقي": "remainder", "جذر": "root", "اس": "power", "أس": "power",
  "اكبر": "max", "أكبر": "max", "اصغر": "min", "أصغر": "min",
  "اول": "first", "أول": "first", "اخر": "last", "آخر": "last", "ثاني": "second",
  "متغير": "variable", "ثابت": "constant", "دالة": "function", "دوال": "functions",
  "حلقة": "loop", "شرط": "condition", "متبقي": "remaining",
  // verbs / flags
  "احسب": "calculate", "اطبع": "print", "طباعة": "print", "ادخل": "input", "ادخال": "input",
  "اخراج": "output", "تحقق": "check", "ابحث": "search", "اضف": "add", "احذف": "delete",
  "نشط": "active", "موجود": "exists", "صالح": "valid", "مكرر": "duplicate", "فريد": "unique",
  "بداية": "start", "نهاية": "end", "منتهي": "expired", "وقت": "time", "تاريخ": "date",
  "يوم": "day", "شهر": "month", "سنة": "year", "اليوم": "today",
  // game-ish
  "نقاط": "points", "لعبة": "game", "فوز": "win", "مهمة": "task", "مهام": "tasks",
  "مشروع": "project", "قسم": "department",
};

function transliteratePhonetic(word: string): string {
  let out = "";
  for (const ch of word) out += AR_CHAR[ch] ?? "";
  return out;
}

function translateWord(word: string): string {
  if (DICT[word]) return DICT[word];
  if (word.startsWith("ال") && word.length > 2) {
    const stripped = word.slice(2);
    if (DICT[stripped]) return DICT[stripped];
    const ph = transliteratePhonetic(stripped);
    if (ph) return ph;
  }
  return transliteratePhonetic(word) || "x";
}

// Per-invocation naming state: keeps the SAME Arabic identifier mapped to the
// SAME English name everywhere in a message (consistency, so copied code runs),
// and prevents two DIFFERENT Arabic identifiers from silently merging into one
// English name (e.g. معدل and متوسط both → "average").
interface NameState {
  byRun: Map<string, string>; // original Arabic-bearing run -> assigned English name
  used: Set<string>; // English names already claimed by some run
}

function makeNameState(): NameState {
  return { byRun: new Map(), used: new Set() };
}

// Transliterate one identifier run (may mix Arabic + latin + digits + _).
function latinizeIdentifier(run: string, st: NameState): string {
  const cached = st.byRun.get(run);
  if (cached !== undefined) return cached;
  let base = "";
  let i = 0;
  while (i < run.length) {
    if (isArabic(run[i])) {
      let j = i;
      while (j < run.length && isArabic(run[j])) j++;
      base += translateWord(run.slice(i, j));
      i = j;
    } else {
      let j = i;
      while (j < run.length && !isArabic(run[j])) j++;
      base += run.slice(i, j);
      i = j;
    }
  }
  if (/^[0-9]/.test(base)) base = "_" + base; // identifiers can't start with a digit
  if (!base) base = "_";
  // Collision guard: a distinct Arabic run whose base name is already taken gets
  // a numeric suffix so two variables never collapse into one.
  let name = base;
  let k = 2;
  while (st.used.has(name)) {
    name = base + "_" + k;
    k++;
  }
  st.used.add(name);
  st.byRun.set(run, name);
  return name;
}

interface CommentStyle {
  hash: boolean;
  slash: boolean;
  block: boolean;
}

const HASH_LANGS = new Set([
  "python", "py", "ruby", "rb", "bash", "sh", "shell", "zsh", "yaml", "yml",
  "r", "perl", "pl", "toml", "ini", "makefile", "dockerfile", "nginx", "conf", "cfg",
]);
const SLASH_LANGS = new Set([
  "javascript", "js", "jsx", "typescript", "ts", "tsx", "java", "c", "cpp", "c++",
  "cc", "h", "hpp", "cs", "csharp", "go", "rust", "rs", "swift", "kotlin", "kt",
  "scala", "php", "dart", "json", "json5",
]);
// Other real source-code languages that carry no Arabic-identifier risk in
// practice (markup/config/query languages) but should still be recognized as
// "this is code" for the allow-list below.
const OTHER_CODE_LANGS = new Set([
  "html", "xml", "css", "scss", "less", "sql", "markdown", "md",
]);

/**
 * Only fenced blocks explicitly tagged with a REAL programming/markup
 * language are treated as "code" and latinized. Anything else — untagged,
 * "text"/"plaintext", or a dedicated non-code tag like "output"/"stdout"/
 * "console" — is left completely verbatim.
 *
 * This is intentional and load-bearing: the teacher prompt always tags real
 * code fences with an explicit language (```python, ```javascript, …) and
 * uses a dedicated ```output fence for literal program output. A block with
 * no recognized language tag is therefore NEVER source code, so touching it
 * risks mangling real Arabic text (e.g. transliterating "مرحبا" → "mrhba"
 * when a teacher demonstrates print output). Never widen this to a
 * "permissive by default" allow-list again — see .agents/memory for the
 * incident this guards against.
 */
function isKnownCodeLang(lang: string): boolean {
  const l = (lang || "").toLowerCase().trim();
  if (!l) return false;
  return HASH_LANGS.has(l) || SLASH_LANGS.has(l) || OTHER_CODE_LANGS.has(l);
}

function commentStyle(lang: string): CommentStyle {
  const l = (lang || "").toLowerCase().trim();
  if (HASH_LANGS.has(l)) return { hash: true, slash: false, block: false };
  // SLASH_LANGS and OTHER_CODE_LANGS (html/css/etc.) all use // and /* */ style,
  // or have no comments at all — permissive here is safe since isKnownCodeLang()
  // already gated entry to this function to real code languages only.
  return { hash: false, slash: true, block: true };
}

// Replace interpolation segments inside a captured string body.
// kind 'brace'  → python f-string {…}   (but {{ }} are literal)
// kind 'dollar' → template literal ${…}
function latinizeInterpolations(content: string, kind: "brace" | "dollar", st: NameState): string {
  let out = "";
  let i = 0;
  const n = content.length;
  while (i < n) {
    if (kind === "brace" && content[i] === "{") {
      if (content[i + 1] === "{") { out += "{{"; i += 2; continue; } // literal brace
      const end = content.indexOf("}", i + 1);
      if (end === -1) { out += content.slice(i); break; }
      out += "{" + latinizeCodeBody(content.slice(i + 1, end), "", st) + "}";
      i = end + 1;
      continue;
    }
    if (kind === "dollar" && content[i] === "$" && content[i + 1] === "{") {
      const end = content.indexOf("}", i + 2);
      if (end === -1) { out += content.slice(i); break; }
      out += "${" + latinizeCodeBody(content.slice(i + 2, end), "", st) + "}";
      i = end + 2;
      continue;
    }
    out += content[i];
    i++;
  }
  return out;
}

// Core: latinize identifiers inside a code body, preserving comments & strings.
function latinizeCodeBody(code: string, lang: string, st: NameState): string {
  if (!AR_RANGE.test(code)) return code; // fast path: no Arabic at all
  const cs = commentStyle(lang);
  let out = "";
  let i = 0;
  const n = code.length;
  while (i < n) {
    const ch = code[i];

    // Block comment  /* … */
    if (cs.block && ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    // Line comment  //
    if (cs.slash && ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i);
      const stop = nl === -1 ? n : nl;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    // Line comment  #
    if (cs.hash && ch === "#") {
      const nl = code.indexOf("\n", i);
      const stop = nl === -1 ? n : nl;
      out += code.slice(i, stop);
      i = stop;
      continue;
    }
    // String literal  " ' `   (with triple-quote + interpolation handling)
    if (ch === '"' || ch === "'" || ch === "`") {
      const triple =
        (ch === '"' || ch === "'") && code[i + 1] === ch && code[i + 2] === ch;
      const quote = triple ? ch.repeat(3) : ch;
      // Detect interpolation: backtick template, or f-string prefix (f/F, rf, fr…).
      let interp: "brace" | "dollar" | null = null;
      if (ch === "`") {
        interp = "dollar";
      } else {
        const p1 = code[i - 1] || "";
        const p2 = code[i - 2] || "";
        if (p1 === "f" || p1 === "F" || p2 === "f" || p2 === "F") interp = "brace";
      }
      const bodyStart = i + quote.length;
      // find closing quote, honoring backslash escapes (not for triple, where \ still escapes)
      let j = bodyStart;
      let end = -1;
      while (j < n) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code.startsWith(quote, j)) { end = j; break; }
        j++;
      }
      if (end === -1) {
        // Unterminated (streaming) — keep the rest verbatim as string content.
        out += code.slice(i);
        break;
      }
      const content = code.slice(bodyStart, end);
      const processed = interp ? latinizeInterpolations(content, interp, st) : content;
      out += quote + processed + quote;
      i = end + quote.length;
      continue;
    }
    // Identifier run (may contain Arabic)
    if (isIdentChar(ch)) {
      let j = i;
      let hasAr = false;
      while (j < n && isIdentChar(code[j])) {
        if (isArabic(code[j])) hasAr = true;
        j++;
      }
      const run = code.slice(i, j);
      out += hasAr ? latinizeIdentifier(run, st) : run;
      i = j;
      continue;
    }
    // Any other char
    out += ch;
    i++;
  }
  return out;
}

/**
 * Transliterate Arabic identifiers to English inside every fenced code block
 * and inline `code` span of a markdown string. Prose, comments, and string
 * contents are preserved (only interpolated identifiers inside strings change).
 * Handles unterminated fences/strings so it is safe to run on streaming text.
 */
export function latinizeCodeIdentifiers(md: string): string {
  if (!md || md.indexOf("`") === -1 || !AR_RANGE.test(md)) return md;
  // One shared naming map for the whole message → the same Arabic identifier
  // reads the same in every block and inline reference, and distinct ones never
  // collide.
  const st = makeNameState();
  let out = "";
  let i = 0;
  const n = md.length;
  while (i < n) {
    // Fenced block ```
    if (md.startsWith("```", i)) {
      let j = i + 3;
      while (j < n && md[j] !== "\n") j++; // end of the opening-fence/lang line
      const langTag = md.slice(i + 3, j);
      const lang = langTag.trim();
      const bodyStart = j < n ? j + 1 : n;
      const close = md.indexOf("```", bodyStart);
      // Only a fence tagged with a REAL programming language is source code.
      // Untagged fences, "text"/"output"/"stdout"/etc. are literal content
      // (e.g. program output) and must never be transliterated — see
      // isKnownCodeLang() doc-comment for why this must stay strict.
      const codeLang = isKnownCodeLang(lang) ? lang : null;
      if (close === -1) {
        // Unterminated fence (streaming): latinize the remainder.
        const rest = md.slice(bodyStart);
        out += "```" + langTag + (j < n ? "\n" : "") + (codeLang ? latinizeCodeBody(rest, codeLang, st) : rest);
        i = n;
      } else {
        const body = md.slice(bodyStart, close);
        out += "```" + langTag + "\n" + (codeLang ? latinizeCodeBody(body, codeLang, st) : body) + "```";
        i = close + 3;
      }
      continue;
    }
    // Inline code `…`
    if (md[i] === "`") {
      const close = md.indexOf("`", i + 1);
      if (close === -1) { out += md.slice(i); break; }
      const inner = md.slice(i + 1, close);
      // Only latinize inline spans that look like a single code token (no internal
      // whitespace). This fixes inline identifier references (`student_name`) while
      // leaving Arabic phrases the teacher wraps in backticks for emphasis intact.
      const trimmed = inner.trim();
      const isToken = trimmed.length > 0 && !/\s/.test(trimmed);
      out += "`" + (isToken ? latinizeCodeBody(inner, "", st) : inner) + "`";
      i = close + 1;
      continue;
    }
    // Plain text up to the next backtick.
    const next = md.indexOf("`", i);
    if (next === -1) { out += md.slice(i); break; }
    out += md.slice(i, next);
    i = next;
  }
  return out;
}
