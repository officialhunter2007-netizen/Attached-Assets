import { useEffect, useRef } from "react";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightSpecialChars,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle,
  foldGutter, foldKeymap,
} from "@codemirror/language";
import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
  type CompletionContext, type CompletionResult,
} from "@codemirror/autocomplete";
import { search, highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";

export type Lang =
  | "javascript" | "typescript"
  | "css" | "html"
  | "python"
  | "java"
  | "cpp" | "c"
  | "sql"
  | "text";

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
  "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame",
  "Promise", "Promise.all", "Promise.allSettled", "Promise.resolve", "Promise.reject",
  "fetch", "Response", "Request", "Headers",
  "localStorage", "sessionStorage", "document", "window", "navigator",
  "map", "filter", "reduce", "forEach", "find", "findIndex", "some", "every",
  "includes", "indexOf", "slice", "splice", "push", "pop", "shift", "unshift",
  "join", "split", "concat", "sort", "reverse", "flat", "flatMap", "fill",
  "trim", "trimStart", "trimEnd", "startsWith", "endsWith", "repeat",
  "padStart", "padEnd", "replace", "replaceAll", "match", "substring",
  "toUpperCase", "toLowerCase", "length", "toString", "valueOf",
];

const CSS_KEYWORDS = [
  "color", "background", "background-color", "background-image", "background-size",
  "border", "border-radius", "border-color", "border-width", "border-style",
  "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
  "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
  "justify-content", "align-items", "align-content", "gap",
  "grid", "grid-template-columns", "grid-template-rows",
  "font", "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "text-align", "text-decoration", "text-transform",
  "opacity", "visibility", "overflow", "transition", "transform", "animation",
  "box-shadow", "filter", "cursor", "pointer-events", "content",
  "block", "inline", "inline-block", "none", "absolute", "relative", "fixed", "sticky",
  "center", "flex-start", "flex-end", "space-between", "space-around",
  "bold", "normal", "italic", "auto", "hidden", "visible",
  "rgba", "rgb", "hsl", "hsla", "calc", "var", "min", "max", "clamp",
  "px", "em", "rem", "vh", "vw", "%", "fr",
  "solid", "dashed", "dotted", "ease", "ease-in", "ease-out", "ease-in-out", "linear",
  "@media", "@keyframes", "@import",
];

const HTML_KEYWORDS = [
  "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "section", "article", "header", "footer", "nav", "main", "aside",
  "button", "input", "form", "label", "select", "option", "textarea",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "video", "audio", "source", "canvas", "svg",
  "script", "style", "link", "meta", "title",
  "strong", "em", "b", "i", "u", "code", "pre",
  "class", "id", "style", "src", "href", "alt", "type", "value",
  "name", "placeholder", "disabled", "checked", "required",
];

const PYTHON_KEYWORDS = [
  "print", "input", "len", "range", "type", "int", "float", "str", "bool", "list",
  "dict", "tuple", "set", "if", "else", "elif", "for", "while", "def", "class",
  "return", "import", "from", "as", "in", "not", "and", "or", "is", "True", "False",
  "None", "try", "except", "finally", "raise", "with", "pass", "break", "continue",
  "lambda", "yield", "global", "nonlocal", "del", "assert",
  "append", "extend", "insert", "remove", "pop", "sort", "reverse", "index", "count",
  "keys", "values", "items", "get", "update", "clear",
  "open", "read", "write", "close", "readline", "readlines",
  "abs", "max", "min", "sum", "round", "sorted", "enumerate", "zip", "map", "filter",
  "isinstance", "issubclass", "hasattr", "getattr", "setattr",
  "math", "random", "os", "sys", "json", "re",
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
    case "typescript":
      return [javascript({ jsx: true, typescript: lang === "typescript" }), autocompletion({ override: [makeWordCompletion(JS_KEYWORDS)] })];
    case "css":
      return [css(), autocompletion({ override: [makeWordCompletion(CSS_KEYWORDS)] })];
    case "html":
      return [html({ matchClosingTags: true, autoCloseTags: true }), autocompletion({ override: [makeWordCompletion(HTML_KEYWORDS)] })];
    case "python":
      return [python(), autocompletion({ override: [makeWordCompletion(PYTHON_KEYWORDS)] })];
    case "java":
      return [java()];
    case "cpp":
    case "c":
      return [cpp()];
    case "sql":
      return [sql()];
    case "text":
    default:
      return [];
  }
}

// VS Code Dark+ inspired highlight style
const vscodeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword,              color: "#569CD6", fontWeight: "bold" },
  { tag: tags.controlKeyword,       color: "#C586C0", fontWeight: "bold" },
  { tag: tags.definitionKeyword,    color: "#569CD6", fontWeight: "bold" },
  { tag: tags.moduleKeyword,        color: "#569CD6", fontWeight: "bold" },
  { tag: tags.operatorKeyword,      color: "#569CD6" },
  { tag: tags.string,               color: "#CE9178" },
  { tag: tags.special(tags.string), color: "#CE9178" },
  { tag: tags.escape,               color: "#D7BA7D" },
  { tag: tags.regexp,               color: "#D16969" },
  { tag: tags.number,               color: "#B5CEA8" },
  { tag: tags.bool,                 color: "#569CD6" },
  { tag: tags.null,                 color: "#569CD6" },
  { tag: tags.comment,              color: "#6A9955", fontStyle: "italic" },
  { tag: tags.lineComment,          color: "#6A9955", fontStyle: "italic" },
  { tag: tags.blockComment,         color: "#6A9955", fontStyle: "italic" },
  { tag: tags.docComment,           color: "#5C8F5C", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#DCDCAA" },
  { tag: tags.function(tags.propertyName), color: "#DCDCAA" },
  { tag: tags.definition(tags.variableName), color: "#9CDCFE" },
  { tag: tags.definition(tags.function(tags.variableName)), color: "#DCDCAA" },
  { tag: tags.variableName,         color: "#9CDCFE" },
  { tag: tags.propertyName,         color: "#9CDCFE" },
  { tag: tags.className,            color: "#4EC9B0", fontWeight: "bold" },
  { tag: tags.typeName,             color: "#4EC9B0" },
  { tag: tags.typeOperator,         color: "#569CD6" },
  { tag: tags.self,                 color: "#569CD6", fontStyle: "italic" },
  { tag: tags.namespace,            color: "#4EC9B0" },
  { tag: tags.tagName,              color: "#569CD6" },
  { tag: tags.attributeName,        color: "#9CDCFE" },
  { tag: tags.attributeValue,       color: "#CE9178" },
  { tag: tags.angleBracket,         color: "#808080" },
  { tag: tags.operator,             color: "#D4D4D4" },
  { tag: tags.punctuation,          color: "#D4D4D4" },
  { tag: tags.bracket,              color: "#FFD700" },
  { tag: tags.squareBracket,        color: "#2F9DD1" },
  { tag: tags.paren,                color: "#DA70D6" },
  { tag: tags.brace,                color: "#D4D4D4" },
  { tag: tags.derefOperator,        color: "#D4D4D4" },
  { tag: tags.separator,            color: "#D4D4D4" },
  { tag: tags.meta,                 color: "#DCDCAA" },
  { tag: tags.annotation,           color: "#DCDCAA", fontStyle: "italic" },
  { tag: tags.invalid,              color: "#F44747", textDecoration: "underline" },
]);

const nukhbaNeonTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0b0d17",
      color: "#D4D4D4",
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
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      padding: "2px",
    },
    ".cm-tooltip-autocomplete > ul > li": {
      padding: "4px 10px",
      borderRadius: "6px",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "rgba(245,158,11,0.2)",
      color: "#fbbf24",
    },
    ".cm-completionLabel": { color: "#e2e8f0" },
    ".cm-completionDetail": { color: "rgba(245,158,11,0.6)", fontSize: "0.85em" },
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
    ".cm-panel.cm-search button": {
      backgroundColor: "rgba(245,158,11,0.15)",
      border: "1px solid rgba(245,158,11,0.25)",
      borderRadius: "6px",
      color: "#F59E0B",
      cursor: "pointer",
      padding: "2px 8px",
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
        syntaxHighlighting(vscodeHighlightStyle, { fallback: true }),
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
