// Full highlight.js registry (vs `/lib/common`) so language tags the AI
// teacher emits — php, kotlin, swift, dart, dockerfile, yaml, etc. —
// all render with colour.
import hljs from "highlight.js";
import katex from "katex";

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
        strict: "ignore",
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

// Map a blockquote's leading emoji → a callout variant class so the CSS can
// recolor the card (tip/warn/key/goal/note). Markdown gives us a plain
// <blockquote>; this is the only place we know its text content client-side.
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

// Pretty display names for the code-block language label. Anything not
// listed falls back to the raw tag (upper-cased), or "كود" when unknown.
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

// Restructure a highlighted <pre><code> into an IDE-style card:
//   <pre>
//     <div class="code-head"> ●●●  LANG  [نسخ] </div>
//     <div class="code-body"> <span class="code-gutter">1 2 3</span> <code/> </div>
//   </pre>
function decorateCodeBlock(pre: HTMLElement, code: HTMLElement, langName: string): void {
  if (pre.dataset.codeEnhanced === "1") return;
  pre.dataset.codeEnhanced = "1";

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
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    const text = code.textContent || "";
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
  });

  head.appendChild(dots);
  head.appendChild(lang);
  head.appendChild(btn);

  // Line-number gutter — built from the plain text so it never depends on
  // (or breaks) the highlighted HTML inside <code>.
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

export function enhanceTeacherDom(root: HTMLElement | null): void {
  if (!root) return;
  classifyCallouts(root);
  const blocks = root.querySelectorAll<HTMLElement>("pre code");
  blocks.forEach((el) => {
    if (el.dataset.hljsApplied === "1") return;
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
        const res = hljs.highlightAuto(el.textContent || "");
        el.innerHTML = res.value;
        el.classList.add("hljs");
        if (res.language) {
          el.classList.add(`language-${res.language}`);
          langName = res.language;
        }
      }
      el.dataset.hljsApplied = "1";
      const pre = el.parentElement;
      if (pre && pre.tagName === "PRE") {
        decorateCodeBlock(pre as HTMLElement, el, langName);
      }
    } catch {
      // hljs failures are non-fatal — leave plain code in place.
    }
  });
}
