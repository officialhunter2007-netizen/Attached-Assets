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

  pre = pre.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => {
    const idx = blocks.length;
    blocks.push({ tex: String(tex).trim(), display: true });
    return `${MATH_PLACEHOLDER_PREFIX}${idx}${MATH_PLACEHOLDER_SUFFIX}`;
  });

  pre = pre.replace(/(?<![\\\w])\$([^\n$]{1,400}?)\$(?!\w)/g, (_m, tex) => {
    const t = String(tex).trim();
    if (!t) return `$${tex}$`;
    if (!/[\\^_=+\-*/<>()[\]{}|]/.test(t) && !/[a-zA-Z]/.test(t)) return `$${tex}$`;
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
  root.querySelectorAll<HTMLElement>("pre code").forEach((el) => {
    if (el.classList.contains("hljs")) return;
    try {
      const cls = el.className || "";
      const langMatch = cls.match(/language-([\w+\-#]+)/i);
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
      const pre = el.parentElement;
      if (pre && pre.tagName === "PRE" && !pre.querySelector(".code-head")) {
        decorateCodeBlock(pre, el, langName);
      }
    } catch {
    }
  });
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
