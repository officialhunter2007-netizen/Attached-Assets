import hljs from "highlight.js/lib/common";
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

export function enhanceTeacherDom(root: HTMLElement | null): void {
  if (!root) return;
  const blocks = root.querySelectorAll<HTMLElement>("pre code");
  blocks.forEach((el) => {
    if (el.dataset.hljsApplied === "1") return;
    try {
      const cls = el.className || "";
      const langMatch = cls.match(/language-([\w+\-#]+)/i);
      if (langMatch && hljs.getLanguage(langMatch[1])) {
        const res = hljs.highlight(el.textContent || "", { language: langMatch[1], ignoreIllegals: true });
        el.innerHTML = res.value;
        el.classList.add("hljs");
      } else {
        const res = hljs.highlightAuto(el.textContent || "");
        el.innerHTML = res.value;
        el.classList.add("hljs");
        if (res.language) el.classList.add(`language-${res.language}`);
      }
      el.dataset.hljsApplied = "1";
      const pre = el.parentElement;
      if (pre && pre.tagName === "PRE" && !pre.querySelector(":scope > .copy-code-btn")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-code-btn";
        btn.textContent = "نسخ";
        btn.setAttribute("aria-label", "نسخ الكود");
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          const text = el.textContent || "";
          try {
            navigator.clipboard?.writeText(text);
            btn.textContent = "تم النسخ ✓";
            setTimeout(() => { btn.textContent = "نسخ"; }, 1400);
          } catch {
            btn.textContent = "تعذر النسخ";
          }
        });
        pre.style.position = pre.style.position || "relative";
        pre.appendChild(btn);
      }
    } catch {
      // hljs failures are non-fatal — leave plain code in place.
    }
  });
}
