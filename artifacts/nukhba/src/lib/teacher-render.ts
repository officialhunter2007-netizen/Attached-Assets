import hljs from "highlight.js";
import katex from "katex";
import { marked } from "marked";

const MATH_PLACEHOLDER_PREFIX = "XNUKHBAMATHX";
const MATH_PLACEHOLDER_SUFFIX = "XENDMATHX";

export interface MathPlaceholderResult {
  text: string;
  blocks: Array<{ tex: string; display: boolean }>;
}

const ESCAPED_DOLLAR = "XNUKHBAESCDOLLARX";

export function extractMathBlocks(raw: string): MathPlaceholderResult {
  if (!raw) return { text: raw, blocks: [] };
  const blocks: Array<{ tex: string; display: boolean }> = [];
  let pre = raw.replace(/\\\$/g, ESCAPED_DOLLAR);

  // ── Display math: $…$ (primary) ─────────────────────────────────────────
  pre = pre.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    const idx = blocks.length;
    blocks.push({ tex: String(tex).trim(), display: true });
    return `${MATH_PLACEHOLDER_PREFIX}${idx}${MATH_PLACEHOLDER_SUFFIX}`;
  });

  // ── Display math: \[…\] (AI models often emit this despite the prompt) ────
  pre = pre.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex) => {
    const t = String(tex).trim();
    if (!t) return _m;
    const idx = blocks.length;
    blocks.push({ tex: t, display: true });
    return `${MATH_PLACEHOLDER_PREFIX}${idx}${MATH_PLACEHOLDER_SUFFIX}`;
  });

  // ── Inline math: \(…\) (AI models often emit this instead of $…$) ─────────
  pre = pre.replace(/\\\((.{1,400}?)\\\)/gs, (_m, tex) => {
    const t = String(tex).trim();
    if (!t) return _m;
    const idx = blocks.length;
    blocks.push({ tex: t, display: false });
    return `${MATH_PLACEHOLDER_PREFIX}${idx}${MATH_PLACEHOLDER_SUFFIX}`;
  });

  // ── Inline math: $…$ (with smart currency guard) ──────────────────────────
  pre = pre.replace(/(?<![\\\w])\$([^\n$]{1,400}?)\$(?!\w)/g, (_m, tex) => {
    const t = String(tex).trim();
    if (!t) return "$" + tex + "$";
    if (!/[\\^_=+\-*/<>()[\]{}|]/.test(t) && !/[a-zA-Z]/.test(t)) return "$" + tex + "$";
    const idx = blocks.length;
    blocks.push({ tex: t, display: false });
    return `${MATH_PLACEHOLDER_PREFIX}${idx}${MATH_PLACEHOLDER_SUFFIX}`;
  });

  pre = pre.replace(new RegExp(ESCAPED_DOLLAR, "g"), "\\$");
  return { text: pre, blocks };
}

export function restoreMathPlaceholders(html: string, blocks: Array<{ tex: string; display: boolean }>): string {
  if (!blocks.length) return html;
  const re = new RegExp(`${MATH_PLACEHOLDER_PREFIX}(\\d+)${MATH_PLACEHOLDER_SUFFIX}`, "g");
  return html.replace(re, (_m, idx) => {
    const block = blocks[Number(idx)];
    if (!block) return "";
    try {
      return katex.renderToString(block.tex, {
        displayMode: block.display,
        throwOnError: false,
        strict: false,
        output: "html",
      });
    } catch {
      const safe = block.tex
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return block.display
        ? `<pre class="katex-fallback">${safe}</pre>`
        : `<code class="katex-fallback">${safe}</code>`;
    }
  });
}

const CALLOUT_EMOJI: Array<{ re: RegExp; cls: string }> = [
  { re: /^\s*(💡|🔑)/u, cls: "callout-tip" },
  { re: /^\s*(⚠️|⚠|🚨|❗)/u, cls: "callout-warn" },
  { re: /^\s*(✅|✔️|⭐)/u, cls: "callout-key" },
  { re: /^\s*(🎯|🚀)/u, cls: "callout-goal" },
  { re: /^\s*(📌|📝|ℹ️|🧠)/u, cls: "callout-note" },
];

function classifyCallouts(root: HTMLElement): void {
  const quotes = root.querySelectorAll<HTMLElement>("blockquote");
  quotes.forEach((bq) => {
    if (bq.dataset.calloutApplied === "1") return;
    const text = (bq.textContent || "").trim();
    for (const { re, cls } of CALLOUT_EMOJI) {
      if (re.test(text)) {
        bq.classList.add(cls);
        break;
      }
    }
    bq.dataset.calloutApplied = "1";
  });
}

const PARA_CALLOUT_RULES: Array<{ re: RegExp; cls: string }> = [
  { re: /^\s*(✅|✔️|⭐)\s*(القاعدة|قاعدة|الخلاصة|خلاصة|المفهوم|مفهوم|النتيجة)/u, cls: "callout-key" },
  { re: /^\s*(القاعدة|قاعدة)\s*:/u, cls: "callout-key" },
  { re: /^\s*(💡|🔑)\s*/u, cls: "callout-tip" },
  { re: /^\s*(⚠️|⚠|🚨|❗)\s*/u, cls: "callout-warn" },
  { re: /^\s*(🎯|🚀)\s*/u, cls: "callout-goal" },
  { re: /^\s*(📌|📝|ℹ️|🧠)\s*/u, cls: "callout-note" },
];

function promoteParagraphCallouts(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("p").forEach((p) => {
    if (p.closest("blockquote")) return;
    const text = (p.textContent || "").trim();
    for (const { re, cls } of PARA_CALLOUT_RULES) {
      if (re.test(text)) {
        const bq = document.createElement("blockquote");
        bq.className = cls;
        p.parentNode?.insertBefore(bq, p);
        bq.appendChild(p);
        break;
      }
    }
  });
}

export { promoteParagraphCallouts };

function scrubInlineMarkdownNoise(line: string): string {
  const parts = line.split(/(`[^`\n]*`)/);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part
        .replace(/#{2,}/g, "")
        .replace(/-{3,}/g, "")
        .replace(/(^|[^=\-<])>(?!=)/g, "$1")
        .replace(/[ \t]{2,}/g, " ");
    })
    .join("")
    .trim();
}

function cleanStrayMarkdownLine(line: string): string {
  if (/^[ \t]{0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/.test(line)) return line;

  const heading = line.match(/^([ \t]{0,3})(#{1,6})([ \t]+)(.*)$/);
  if (heading) {
    const [, indent, hashes, gap, body] = heading;
    return `${indent}${hashes}${gap}${scrubInlineMarkdownNoise(body)}`;
  }

  const quote = line.match(/^([ \t]{0,3}>[ \t]?)(.*)$/);
  if (quote) {
    return `${quote[1]}${scrubInlineMarkdownNoise(quote[2])}`;
  }

  return scrubInlineMarkdownNoise(line);
}

function splitTableCells(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "`") {
      inCode = !inCode;
      cur += ch;
      continue;
    }
    if (ch === "\\" && line[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (ch === "|" && !inCode) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  let trimmed = cells.map((c) => c.trim());
  if (trimmed.length > 1 && trimmed[0] === "") trimmed = trimmed.slice(1);
  if (trimmed.length > 1 && trimmed[trimmed.length - 1] === "") trimmed = trimmed.slice(0, -1);
  return trimmed;
}

const TABLE_DELIMITER_RE = /^[ \t]{0,3}\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/;

function isTableDelimiterRow(line: string): boolean {
  return line.includes("-") && line.includes("|") && TABLE_DELIMITER_RE.test(line);
}

function isTableRowCandidate(line: string): boolean {
  if (!line.includes("|")) return false;
  if (/^[ \t]{0,3}>/.test(line)) return false;
  const cells = splitTableCells(line);
  if (cells.length < 2) return false;
  if (!/^\s*\|/.test(line) && cells[0].trim().length > 40) return false;
  return true;
}

function buildDelimiterRow(cellCount: number): string {
  return `|${Array.from({ length: cellCount }, () => " --- ").join("|")}|`;
}

function expandInlineHeading(line: string): string[] {
  if (/^[ \t]{0,3}#{1,6}[ \t]/.test(line)) return [line];
  if (!line.includes("#")) return [line];
  let inCode = false;
  let hashStart = -1;
  for (let j = 0; j < line.length; j++) {
    if (line[j] === "`") { inCode = !inCode; continue; }
    if (inCode) continue;
    if (line[j] === "#") {
      let count = 0;
      while (j + count < line.length && line[j + count] === "#") count++;
      if (count >= 1 && count <= 6 && j + count < line.length && /[ \t]/.test(line[j + count]) && j > 0) {
        hashStart = j;
        break;
      }
    }
  }
  if (hashStart <= 0) return [line];
  const prose = line.slice(0, hashStart).replace(/\s*[-—–]+\s*$/, "").trim();
  const heading = line.slice(hashStart).trim();
  if (!prose || !heading) return [line];
  return [prose, "", heading];
}

function expandInlineTableSuffix(line: string): string[] {
  if (!line.includes("|")) return [line];
  const m = line.match(/^([\s\S]+?\S)\s+(\|[^\n]+\|)\s*$/);
  if (!m) return [line];
  const prose = m[1].trim();
  const tableRow = m[2].trim();
  if (!tableRow || !prose) return [line];
  if (/^\s*\|/.test(prose)) return [line];
  if (splitTableCells(tableRow).length < 2) return [line];
  if (isTableRowCandidate(prose)) return [line];
  return [prose, "", tableRow];
}

function expandLine(line: string): string[] {
  const headingParts = expandInlineHeading(line);
  if (headingParts.length > 1) {
    const last = headingParts[headingParts.length - 1];
    const tableParts = expandInlineTableSuffix(last);
    if (tableParts.length > 1) return [...headingParts.slice(0, -1), ...tableParts];
    return headingParts;
  }
  return expandInlineTableSuffix(line);
}

function processProseLines(lines: string[]): string[] {
  const expanded: string[] = [];
  for (const line of lines) {
    for (const sub of expandLine(line)) expanded.push(sub);
  }

  const out: string[] = [];
  let i = 0;
  while (i < expanded.length) {
    const line = expanded[i];

    const isAtxHeading = /^[ \t]{0,3}#{1,6}[ \t]/.test(line);
    if (isAtxHeading) {
      if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
      out.push(cleanStrayMarkdownLine(line));
      const nextLine = expanded[i + 1];
      if (nextLine !== undefined && nextLine.trim() !== "" && !/^[ \t]{0,3}#{1,6}[ \t]/.test(nextLine)) {
        out.push("");
      }
      i++;
      continue;
    }

    if (isTableRowCandidate(line)) {
      const next = expanded[i + 1];
      if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
      if (next !== undefined && isTableDelimiterRow(next)) {
        out.push(line, next);
        i += 2;
        while (i < expanded.length && isTableRowCandidate(expanded[i])) {
          out.push(expanded[i]);
          i++;
        }
        out.push("");
        continue;
      }
      if (next !== undefined && isTableRowCandidate(next)) {
        const cellCount = splitTableCells(line).length;
        out.push(line, buildDelimiterRow(cellCount));
        i++;
        while (i < expanded.length && isTableRowCandidate(expanded[i])) {
          out.push(expanded[i]);
          i++;
        }
        out.push("");
        continue;
      }
      const cellCount = splitTableCells(line).length;
      if (cellCount >= 2) {
        out.push(line, buildDelimiterRow(cellCount));
        out.push("");
        i++;
        continue;
      }
    }

    out.push(cleanStrayMarkdownLine(line));
    i++;
  }
  return out;
}

function scrubProseSegment(segment: string): string {
  return processProseLines(segment.split("\n")).join("\n");
}

export function sanitizeStrayMarkdown(raw: string): string {
  if (!raw) return raw;
  if (raw.indexOf("```") === -1) return scrubProseSegment(raw);
  const parts = raw.split("```");
  return parts.map((part, i) => (i % 2 === 0 ? scrubProseSegment(part) : part)).join("```");
}

export function ensureMarkdownBlockGaps(md: string): string {
  if (!md) return md;
  const segments = md.split("```");
  const processed = segments.map((seg, si) => {
    if (si % 2 === 1) return seg;
    const lines = seg.split("\n");
    const out: string[] = [];
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const trimmed = line.trim();
      const prevTrimmed = out.length > 0 ? out[out.length - 1].trim() : "";
      const isHeading = /^#{1,6} /.test(trimmed);
      const isTableRow = /^\|/.test(trimmed);
      const prevIsTableRow = /^\|/.test(prevTrimmed);
      if (isHeading && prevTrimmed !== "" && out.length > 0) {
        out.push("");
      } else if (isTableRow && !prevIsTableRow && prevTrimmed !== "" && out.length > 0) {
        out.push("");
      }
      out.push(line);
      if (isHeading) {
        const nextTrimmed = j + 1 < lines.length ? lines[j + 1].trim() : "";
        if (nextTrimmed !== "" && !/^#{1,6} /.test(nextTrimmed) && !/^\|/.test(nextTrimmed)) {
          out.push("");
        }
      }
    }
    return out.join("\n");
  });
  return processed.join("```");
}

const LANG_LABELS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", jsx: "JSX",
  ts: "TypeScript", typescript: "TypeScript", tsx: "TSX",
  py: "Python", python: "Python",
  rb: "Ruby", ruby: "Ruby",
  php: "PHP",
  java: "Java", kotlin: "Kotlin", swift: "Swift", dart: "Dart",
  c: "C", cpp: "C++", "c++": "C++", cs: "C#", csharp: "C#",
  go: "Go", rust: "Rust",
  html: "HTML", xml: "XML", css: "CSS", scss: "SCSS", less: "LESS",
  json: "JSON", yaml: "YAML", yml: "YAML", toml: "TOML",
  sql: "SQL", bash: "Bash", sh: "Shell", shell: "Shell", zsh: "Zsh",
  dockerfile: "Dockerfile", docker: "Dockerfile",
  md: "Markdown", markdown: "Markdown",
  plaintext: "نص", text: "نص",
};

function prettyLangName(lang: string): string {
  if (!lang) return "كود";
  const key = lang.toLowerCase();
  return LANG_LABELS[key] ?? lang.toUpperCase();
}

const AUTO_DETECT_LANGS = [
  "python", "javascript", "typescript", "json", "html", "xml", "css", "scss",
  "sql", "bash", "shell", "java", "c", "cpp", "csharp", "go", "rust", "ruby",
  "php", "kotlin", "swift", "dart", "yaml", "ini", "markdown",
];

// A fenced block tagged with one of these is literal program OUTPUT, never
// source code. The teacher prompt is instructed to always use ```output```
// for this; the aliases below are defensive in case the model drifts.
// Rendered with a deliberately different, non-editor look (see
// buildOutputCardHtml) so students can never mistake output for code, and
// code-latinize.ts guarantees this content is never transliterated.
const OUTPUT_LANGS = new Set(["output", "stdout", "console", "terminal", "result", "screen"]);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOutputCardHtml(text: string): string {
  const outText = text.replace(/\n$/, "");
  return (
    `<pre class="output-enhanced">` +
    `<div class="output-head">` +
    `<span class="output-icon" aria-hidden="true">▶</span>` +
    `<span class="output-lang">الناتج على الشاشة</span>` +
    `<button type="button" class="copy-code-btn" aria-label="نسخ الناتج">نسخ</button>` +
    `</div>` +
    `<code class="output-text">${escapeHtml(outText)}</code>` +
    `</pre>`
  );
}

function buildCodeCardHtml(text: string, lang: string, highlighted: string): string {
  const codeText = text.replace(/\n$/, "");
  const lineCount = Math.max(1, codeText.split("\n").length);
  const gutter = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n");
  const label = prettyLangName(lang);
  const codeClass = lang ? `language-${lang} hljs` : "hljs";
  return (
    `<pre class="code-enhanced">` +
    `<div class="code-head">` +
    `<span class="code-dots" aria-hidden="true"><i></i><i></i><i></i></span>` +
    `<span class="code-lang">${label}</span>` +
    `<button type="button" class="copy-code-btn" aria-label="نسخ الكود">نسخ</button>` +
    `</div>` +
    `<div class="code-body">` +
    `<span class="code-gutter" aria-hidden="true">${gutter}</span>` +
    `<code class="${codeClass}">${highlighted}</code>` +
    `</div>` +
    `</pre>`
  );
}

// Tracks recursive blockquote nesting depth while marked's `blockquote`
// renderer parses its inner tokens (`this.parser.parse(token.tokens)`). Those
// inner tokens are parsed with the SAME renderer overrides, so a paragraph
// living inside a blockquote (e.g. an ⚠️-led callout body) would otherwise
// match PARA_CALLOUT_RULES again and get wrapped in a second, nested
// `<blockquote>` — producing `<blockquote><blockquote>...`. `paragraph()`
// skips its own promotion whenever this is > 0.
let blockquoteDepth = 0;

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }): string {
      if (lang && OUTPUT_LANGS.has(lang.toLowerCase().trim())) {
        return buildOutputCardHtml(text);
      }
      try {
        const language = lang && hljs.getLanguage(lang) ? lang : null;
        let highlighted: string;
        let usedLang = "";
        if (language) {
          highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
          usedLang = language;
        } else {
          const result = hljs.highlightAuto(text, AUTO_DETECT_LANGS);
          highlighted = result.value;
          usedLang = result.language || "";
        }
        return buildCodeCardHtml(text, usedLang, highlighted);
      } catch {
        return `<pre><code>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
      }
    },

    paragraph(token: { text: string; tokens: object[] }): string | false {
      if (blockquoteDepth > 0) return false;
      const raw = token.text ?? "";
      for (const { re, cls } of PARA_CALLOUT_RULES) {
        if (re.test(raw)) {
          const body = (this as unknown as { parser: { parseInline(t: object[]): string } }).parser.parseInline(token.tokens);
          return `<blockquote class="${cls}"><p>${body}</p></blockquote>\n`;
        }
      }
      return false;
    },

    blockquote(token: { text: string; tokens: object[] }): string | false {
      const raw = token.text ?? "";
      let cls = "";
      for (const { re, cls: c } of CALLOUT_EMOJI) {
        if (re.test(raw)) { cls = c; break; }
      }
      if (!cls) return false;
      blockquoteDepth++;
      let body: string;
      try {
        body = (this as unknown as { parser: { parse(t: object[]): string } }).parser.parse(token.tokens);
      } finally {
        blockquoteDepth--;
      }
      return `<blockquote class="${cls}">${body}</blockquote>\n`;
    },
  },
});

if (typeof document !== "undefined") {
  document.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    const btn = target.closest?.(".copy-code-btn") as HTMLElement | null;
    if (!btn) return;
    ev.stopPropagation();
    ev.preventDefault();
    const pre = btn.closest("pre");
    const code = pre?.querySelector("code");
    const text = code?.textContent || "";
    try {
      navigator.clipboard?.writeText(text);
      btn.textContent = "تم النسخ ✓";
      btn.classList.add("copy-code-btn-copied");
      setTimeout(() => {
        btn.textContent = "نسخ";
        btn.classList.remove("copy-code-btn-copied");
      }, 1400);
    } catch {
      btn.textContent = "تعذر النسخ";
    }
  }, true);
}

export function enhanceTeacherDom(root: HTMLElement | null): void {
  if (!root) return;
  promoteParagraphCallouts(root);
  classifyCallouts(root);

  // Wrap every table in a scrollable div so:
  //   • too-wide  → horizontal scroll (أعمدة كثيرة)
  //   • too-tall  → vertical scroll   (صفوف كثيرة) capped by CSS max-height
  root.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    if (table.parentElement?.classList.contains("table-scroll-wrapper")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll-wrapper";
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
  root.querySelectorAll<HTMLElement>("pre code").forEach((el) => {
    if (el.classList.contains("hljs") || el.classList.contains("output-text")) return;
    const pre = el.parentElement;
    if (pre && pre.classList.contains("output-enhanced")) return;
    try {
      const cls = el.className || "";
      const langMatch = cls.match(/language-([\w+\-#]+)/i);
      const rawLang = langMatch ? langMatch[1].toLowerCase() : "";
      if (OUTPUT_LANGS.has(rawLang) && pre && pre.tagName === "PRE" && !pre.querySelector(".output-head")) {
        decorateOutputBlock(pre, el);
        return;
      }
      let langName = "";
      if (langMatch && hljs.getLanguage(langMatch[1])) {
        const res = hljs.highlight(el.textContent || "", { language: langMatch[1], ignoreIllegals: true });
        el.innerHTML = res.value;
        el.classList.add("hljs");
        langName = langMatch[1];
      } else {
        const res = hljs.highlightAuto(el.textContent || "", AUTO_DETECT_LANGS);
        el.innerHTML = res.value;
        el.classList.add("hljs");
        if (res.language) {
          el.classList.add(`language-${res.language}`);
          langName = res.language;
        }
      }
      if (pre && pre.tagName === "PRE" && !pre.querySelector(".code-head")) {
        decorateCodeBlock(pre, el, langName);
      }
    } catch {
    }
  });
}

function decorateOutputBlock(pre: HTMLElement, code: HTMLElement): void {
  if (pre.querySelector(".output-head")) return;
  pre.classList.add("output-enhanced");
  code.classList.add("output-text");

  const head = document.createElement("div");
  head.className = "output-head";

  const icon = document.createElement("span");
  icon.className = "output-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "▶";

  const label = document.createElement("span");
  label.className = "output-lang";
  label.textContent = "الناتج على الشاشة";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-code-btn";
  btn.textContent = "نسخ";
  btn.setAttribute("aria-label", "نسخ الناتج");

  head.appendChild(icon);
  head.appendChild(label);
  head.appendChild(btn);

  pre.insertBefore(head, code);
}

function decorateCodeBlock(pre: HTMLElement, code: HTMLElement, langName: string): void {
  if (pre.querySelector(".code-head")) return;
  pre.classList.add("code-enhanced");

  const head = document.createElement("div");
  head.className = "code-head";

  const dots = document.createElement("span");
  dots.className = "code-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = "<i></i><i></i><i></i>";

  const lang = document.createElement("span");
  lang.className = "code-lang";
  lang.textContent = prettyLangName(langName);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-code-btn";
  btn.textContent = "نسخ";
  btn.setAttribute("aria-label", "نسخ الكود");

  head.appendChild(dots);
  head.appendChild(lang);
  head.appendChild(btn);

  const codeText = (code.textContent || "").replace(/\n$/, "");
  const lineCount = Math.max(1, codeText.split("\n").length);
  const gutter = document.createElement("span");
  gutter.className = "code-gutter";
  gutter.setAttribute("aria-hidden", "true");
  gutter.textContent = Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n");

  const body = document.createElement("div");
  body.className = "code-body";

  pre.insertBefore(head, code);
  body.appendChild(gutter);
  pre.insertBefore(body, code);
  body.appendChild(code);
}
