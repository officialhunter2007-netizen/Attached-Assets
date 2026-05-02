import { useEffect, useRef } from "react";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightSpecialChars,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle,
  foldGutter, foldKeymap,
} from "@codemirror/language";
import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
  type CompletionContext, type CompletionResult,
} from "@codemirror/autocomplete";
import { search, highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";

export type Lang = "javascript" | "css" | "html" | "text";

const JS_KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "default", "try", "catch", "finally",
  "throw", "new", "delete", "typeof", "instanceof", "in", "of", "true", "false",
  "null", "undefined", "class", "extends", "super", "this", "import", "export",
  "from", "async", "await", "yield", "void",
  "console.log", "console.warn", "console.error", "console.info", "console.table",
  "Math.floor", "Math.ceil", "Math.round", "Math.abs", "Math.max", "Math.min",
  "Math.random", "Math.pow", "Math.sqrt", "Math.PI", "Math.sign",
  "Array.isArray", "Array.from", "Array.of",
  "Object.keys", "Object.values", "Object.entries", "Object.assign", "Object.freeze",
  "JSON.stringify", "JSON.parse",
  "Number.parseInt", "Number.parseFloat", "Number.isNaN", "Number.isInteger",
  "String.fromCharCode", "String.raw",
  "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame",
  "Promise", "Promise.all", "Promise.allSettled", "Promise.resolve", "Promise.reject", "Promise.race",
  "fetch", "Response", "Request", "Headers",
  "localStorage", "sessionStorage", "document", "window", "navigator",
  "document.querySelector", "document.querySelectorAll", "document.getElementById",
  "document.createElement", "document.addEventListener",
  "map", "filter", "reduce", "forEach", "find", "findIndex", "some", "every",
  "includes", "indexOf", "lastIndexOf", "slice", "splice", "push", "pop",
  "shift", "unshift", "join", "split", "concat", "sort", "reverse",
  "flat", "flatMap", "fill", "copyWithin", "at",
  "length", "toString", "valueOf", "hasOwnProperty",
  "addEventListener", "removeEventListener", "dispatchEvent", "preventDefault", "stopPropagation",
  "innerHTML", "textContent", "classList", "style", "dataset", "getAttribute", "setAttribute",
  "appendChild", "removeChild", "insertBefore", "replaceChild", "cloneNode",
  "trim", "trimStart", "trimEnd", "startsWith", "endsWith", "repeat", "padStart", "padEnd",
  "replace", "replaceAll", "match", "matchAll", "search", "substring", "charAt", "charCodeAt",
  "toUpperCase", "toLowerCase",
];

const CSS_KEYWORDS = [
  "color", "background", "background-color", "background-image", "background-size",
  "background-position", "background-repeat", "background-attachment", "background-clip",
  "border", "border-radius", "border-color", "border-width", "border-style",
  "border-top", "border-right", "border-bottom", "border-left",
  "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
  "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
  "justify-content", "align-items", "align-content", "align-self", "gap", "row-gap", "column-gap", "order",
  "grid", "grid-template-columns", "grid-template-rows", "grid-template-areas",
  "grid-area", "grid-column", "grid-row", "grid-gap",
  "font", "font-family", "font-size", "font-weight", "font-style", "font-variant",
  "line-height", "letter-spacing", "word-spacing", "text-align", "text-decoration",
  "text-transform", "text-shadow", "text-overflow", "white-space", "word-break",
  "opacity", "visibility", "overflow", "overflow-x", "overflow-y", "clip-path",
  "transition", "transform", "animation", "cursor", "pointer-events",
  "box-shadow", "filter", "backdrop-filter", "object-fit", "object-position",
  "content", "counter-reset", "counter-increment",
  "block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "none", "contents",
  "absolute", "relative", "fixed", "sticky", "static",
  "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly", "stretch",
  "bold", "normal", "italic", "oblique",
  "uppercase", "lowercase", "capitalize",
  "auto", "hidden", "visible", "scroll", "clip",
  "transparent", "currentColor", "inherit", "initial", "unset", "revert",
  "linear-gradient", "radial-gradient", "conic-gradient",
  "calc", "var", "min", "max", "clamp", "env",
  "px", "em", "rem", "vh", "vw", "vmin", "vmax", "%", "fr",
  "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset",
  "ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end",
  "rotate", "scale", "translate", "skew", "translateX", "translateY", "translateZ",
  "scaleX", "scaleY", "rotateX", "rotateY", "rotateZ",
  "rgba", "rgb", "hsl", "hsla", "oklch",
  "@media", "@keyframes", "@import", "@supports", "@layer",
  "prefers-color-scheme", "prefers-reduced-motion", "max-width", "min-width",
  "hover", "focus", "active", "visited", "focus-visible", "disabled", "checked",
  "nth-child", "nth-of-type", "first-child", "last-child", "not", "is", "where", "has",
  "before", "after", "placeholder", "selection",
];

const HTML_KEYWORDS = [
  "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "section", "article", "header", "footer", "nav", "main", "aside", "figure", "figcaption",
  "button", "input", "form", "label", "select", "option", "optgroup", "textarea",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "video", "audio", "source", "track", "picture", "canvas", "svg", "path", "circle",
  "details", "summary", "dialog", "template", "slot",
  "script", "style", "link", "meta", "title", "base",
  "blockquote", "cite", "code", "pre", "kbd", "samp", "var",
  "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "sub", "sup",
  "class", "id", "style", "src", "href", "alt", "title", "type", "value",
  "name", "placeholder", "disabled", "checked", "required", "readonly", "multiple",
  "action", "method", "enctype", "for", "autocomplete", "autofocus",
  "data-", "aria-", "role", "tabindex",
  "width", "height", "loading", "decoding", "crossorigin", "referrerpolicy",
  "target", "_blank", "_self", "_parent", "_top", "rel", "noopener", "noreferrer",
  "charset", "content", "viewport", "description", "og:title", "og:image",
  "lang", "dir", "ltr", "rtl", "translate",
  "contenteditable", "draggable", "hidden", "spellcheck",
  "onload", "onerror", "onclick", "onsubmit", "onchange", "oninput",
  "async", "defer", "crossorigin", "integrity",
  "media", "sizes", "srcset",
  "controls", "autoplay", "loop", "muted", "preload", "poster",
  "download", "ping", "hreflang",
  "min", "max", "step", "pattern", "list",
  "rows", "cols", "wrap", "maxlength", "minlength",
  "colspan", "rowspan", "scope", "headers",
  "frameborder", "allowfullscreen", "sandbox",
];

function makeWordCompletion(words: string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\w\.\-@#]+/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;
    return {
      from: word.from,
      options: words.map((w) => ({
        label: w,
        type: w.includes(".") || w.includes("(") ? "function"
          : w.startsWith("@") ? "keyword"
          : w.startsWith("#") || w.startsWith(".") ? "class"
          : "keyword",
        boost: w.startsWith(word.text) ? 1 : 0,
      })),
      validFor: /^[\w\.\-@#]*$/,
    };
  };
}

function langExtension(lang: Lang): Extension {
  switch (lang) {
    case "javascript":
      return [javascript({ jsx: true, typescript: false }), autocompletion({ override: [makeWordCompletion(JS_KEYWORDS)] })];
    case "css":
      return [css(), autocompletion({ override: [makeWordCompletion(CSS_KEYWORDS)] })];
    case "html":
      return [html({ matchClosingTags: true, autoCloseTags: true }), autocompletion({ override: [makeWordCompletion(HTML_KEYWORDS)] })];
    case "text":
    default:
      return [];
  }
}

const nukhbaNeonTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0b0d17",
      color: "#E2E8F0",
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    ".cm-content": {
      caretColor: "#F59E0B",
      padding: "8px 0",
    },
    ".cm-gutters": {
      backgroundColor: "#090b14",
      color: "rgba(245,158,11,0.3)",
      border: "none",
      borderRight: "1px solid rgba(245,158,11,0.08)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      color: "#4a4a6a",
      padding: "0 8px 0 4px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(245,158,11,0.08)",
      color: "#F59E0B !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(245,158,11,0.05)",
      borderLeft: "2px solid rgba(245,158,11,0.2)",
    },
    ".cm-cursor": {
      borderLeftColor: "#F59E0B",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(245,158,11,0.2) !important",
    },
    ".cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(245,158,11,0.25) !important",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      lineHeight: "1.6",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(245,158,11,0.2)",
      border: "1px solid rgba(245,158,11,0.5)",
      borderRadius: "2px",
    },
    ".cm-tooltip": {
      backgroundColor: "#0f1221",
      color: "#e2e8f0",
      border: "1px solid rgba(245,158,11,0.25)",
      borderRadius: "8px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.1)",
      padding: "2px",
    },
    ".cm-tooltip-autocomplete > ul": {
      fontFamily: "inherit",
    },
    ".cm-tooltip-autocomplete > ul > li": {
      padding: "4px 10px",
      borderRadius: "6px",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "rgba(245,158,11,0.2)",
      color: "#fbbf24",
    },
    ".cm-tooltip-autocomplete > ul > li:hover": {
      backgroundColor: "rgba(245,158,11,0.1)",
    },
    ".cm-completionIcon": {
      fontSize: "0.85em",
    },
    ".cm-completionLabel": {
      color: "#e2e8f0",
    },
    ".cm-completionDetail": {
      color: "rgba(245,158,11,0.6)",
      fontSize: "0.85em",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "rgba(245,158,11,0.12)",
      border: "1px solid rgba(245,158,11,0.3)",
      color: "#F59E0B",
      borderRadius: "4px",
      padding: "0 4px",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(245,158,11,0.25)",
      border: "1px solid rgba(245,158,11,0.4)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(245,158,11,0.4)",
    },
    ".cm-panel.cm-search": {
      backgroundColor: "#0d1017",
      borderTop: "1px solid rgba(245,158,11,0.2)",
      padding: "6px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: "#1a1a2e",
      border: "1px solid rgba(245,158,11,0.25)",
      borderRadius: "6px",
      color: "#e2e8f0",
      padding: "2px 8px",
      outline: "none",
    },
    ".cm-panel.cm-search input:focus": {
      borderColor: "rgba(245,158,11,0.5)",
      boxShadow: "0 0 0 2px rgba(245,158,11,0.15)",
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "rgba(245,158,11,0.15)",
      border: "1px solid rgba(245,158,11,0.25)",
      borderRadius: "6px",
      color: "#F59E0B",
      cursor: "pointer",
      padding: "2px 8px",
    },
    ".cm-panel.cm-search button:hover": {
      backgroundColor: "rgba(245,158,11,0.25)",
    },
    ".cm-panel.cm-search label": {
      color: "#a0a0b0",
      fontSize: "0.85em",
    },
    ".cm-button": {
      backgroundImage: "none",
      backgroundColor: "rgba(245,158,11,0.15)",
      border: "1px solid rgba(245,158,11,0.25)",
      borderRadius: "6px",
      color: "#F59E0B",
    },
    ".cm-textfield": {
      backgroundColor: "#1a1a2e",
      border: "1px solid rgba(245,158,11,0.25)",
      color: "#e2e8f0",
      borderRadius: "6px",
    },
  },
  { dark: true },
);

export interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  language: Lang;
  minHeight?: number;
  className?: string;
  ariaLabel?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, language, minHeight = 160, className, ariaLabel }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const langComp = new Compartment();
    langCompRef.current = langComp;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        search({ top: false }),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": ariaLabel || "code editor", dir: "ltr" }),
        nukhbaNeonTheme,
        langComp.of(langExtension(language)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const text = u.state.doc.toString();
            onChangeRef.current(text);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      langCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    const comp = langCompRef.current;
    if (!view || !comp) return;
    view.dispatch({ effects: comp.reconfigure(langExtension(language)) });
  }, [language]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ minHeight, maxHeight: Math.max(minHeight * 2, 480), overflow: "auto" }}
      dir="ltr"
    />
  );
}
