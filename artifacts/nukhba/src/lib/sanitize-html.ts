import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span",
  "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
  "u", "ul",
];

const ALLOWED_ATTR = ["href", "title", "alt", "src", "dir", "lang", "class"];

const FORBIDDEN_ATTR = ["style", "color", "background", "bgcolor"];

export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: FORBIDDEN_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    ALLOW_DATA_ATTR: false,
  });
}
