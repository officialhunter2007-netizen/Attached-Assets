import { useEffect, useRef } from "react";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";

type Lang = "javascript" | "css" | "html";

const JS_KEYWORDS = [
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "default", "try", "catch", "finally",
  "throw", "new", "delete", "typeof", "instanceof", "in", "of", "true", "false",
  "null", "undefined", "class", "extends", "super", "this", "import", "export",
  "from", "async", "await", "yield", "void",
  "console.log", "console.warn", "console.error", "console.info",
  "Math.floor", "Math.ceil", "Math.round", "Math.abs", "Math.max", "Math.min",
  "Math.random", "Math.pow", "Math.sqrt", "Math.PI",
  "Array.isArray", "Object.keys", "Object.values", "Object.entries",
  "JSON.stringify", "JSON.parse",
  "Number.parseInt", "Number.parseFloat", "Number.isNaN",
  "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  "Promise", "Promise.all", "Promise.resolve", "Promise.reject",
  "map", "filter", "reduce", "forEach", "find", "findIndex", "some", "every",
  "includes", "indexOf", "slice", "splice", "push", "pop", "shift", "unshift",
  "join", "split", "concat", "sort", "reverse", "length",
];

const CSS_KEYWORDS = [
  "color", "background", "background-color", "background-image", "background-size",
  "background-position", "background-repeat", "border", "border-radius", "border-color",
  "border-width", "border-style", "margin", "margin-top", "margin-bottom", "margin-left",
  "margin-right", "padding", "padding-top", "padding-bottom", "padding-left", "padding-right",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "display", "position", "top", "right", "bottom", "left", "z-index",
  "flex", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-content",
  "align-self", "gap", "row-gap", "column-gap", "order",
  "grid", "grid-template-columns", "grid-template-rows", "grid-area",
  "font", "font-family", "font-size", "font-weight", "font-style", "line-height",
  "letter-spacing", "text-align", "text-decoration", "text-transform", "white-space",
  "opacity", "visibility", "overflow", "overflow-x", "overflow-y",
  "transition", "transform", "animation", "cursor", "pointer-events", "box-shadow",
  "filter", "backdrop-filter", "object-fit", "content",
  "block", "inline", "inline-block", "flex", "grid", "none",
  "absolute", "relative", "fixed", "sticky", "static",
  "center", "flex-start", "flex-end", "space-between", "space-around", "space-evenly",
  "bold", "normal", "italic", "uppercase", "lowercase", "capitalize",
  "auto", "hidden", "visible", "scroll", "transparent", "currentColor",
];

const HTML_KEYWORDS = [
  "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "section", "article", "header", "footer", "nav", "main", "aside",
  "button", "input", "form", "label", "select", "option", "textarea",
  "table", "thead", "tbody", "tr", "td", "th",
  "class", "id", "style", "src", "href", "alt", "title", "type", "value", "name",
  "placeholder", "disabled", "checked", "required", "readonly",
];

function makeWordCompletion(words: string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[\w\.\-]+/);
    if (!word) return null;
    if (word.from === word.to && !context.explicit) return null;
    return {
      from: word.from,
      options: words.map((w) => ({
        label: w,
        type: w.includes("(") || w.includes(".") ? "function" : "keyword",
      })),
      validFor: /^[\w\.\-]*$/,
    };
  };
}

function langExtension(lang: Lang): Extension {
  switch (lang) {
    case "javascript":
      return [javascript(), autocompletion({ override: [makeWordCompletion(JS_KEYWORDS)] })];
    case "css":
      return [css(), autocompletion({ override: [makeWordCompletion(CSS_KEYWORDS)] })];
    case "html":
      return [html(), autocompletion({ override: [makeWordCompletion(HTML_KEYWORDS)] })];
  }
}

const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "rgba(0,0,0,0.6)",
      color: "#bbf7d0",
      fontSize: "12px",
      borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.15)",
    },
    ".cm-content": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      caretColor: "#22d3ee",
      padding: "8px 0",
    },
    ".cm-gutters": {
      backgroundColor: "rgba(0,0,0,0.4)",
      color: "rgba(255,255,255,0.4)",
      border: "none",
      borderRight: "1px solid rgba(255,255,255,0.08)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.06)" },
    ".cm-cursor": { borderLeftColor: "#22d3ee" },
    ".cm-selectionBackground, ::selection": { backgroundColor: "rgba(34,211,238,0.25) !important" },
    ".cm-scroller": { fontFamily: "inherit" },
    ".cm-tooltip": {
      backgroundColor: "#0f172a",
      color: "#e2e8f0",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "6px",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "rgba(34,211,238,0.2)",
      color: "#fff",
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
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": ariaLabel || "code editor", dir: "ltr" }),
        editorTheme,
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
    // Mount once; subsequent prop changes are handled by separate effects.
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
