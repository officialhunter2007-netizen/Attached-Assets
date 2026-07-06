import { marked } from "marked";
import fs from "fs";
import { latinizeCodeIdentifiers } from "./src/lib/code-latinize.ts";
import { extractMathBlocks, restoreMathPlaceholders } from "./src/lib/teacher-render.ts";


function renderImageMarkers(raw, loadingLabel = "جارٍ توليد الصورة التوضيحية…") {
  return raw.replace(/\[\[IMAGE:([a-f0-9]{6,16})\]\]/gi, (_m, id) =>
    `\n\n<figure class="teach-image teach-image-loading" data-image-id="${id}"><div class="teach-image-spinner"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="label">${loadingLabel}</span></div></figure>\n\n`,
  );
}
function expandAnimTags(raw) {
  if (!raw || !raw.includes("[[ANIM]]")) return raw;
  return raw.replace(/\[\[ANIM\]\][\s\S]*?\[\[\/ANIM\]\]/g, "");
}
function expandSceneTags(raw) {
  if (!raw || !raw.includes("[[SCENE:")) return raw;
  return raw.replace(/\[\[SCENE:[\s\S]*?\]\]/g, "");
}
function sanitizeProtocolNoise(raw) {
  return raw
    .replace(/\[\[ANIM\]\](?:(?!\[\[\/ANIM\]\])[\s\S])*$/g, "")
    .replace(/\[\[SCENE:(?:(?!\]\])[\s\S])*$/g, "")
    .replace(/\[\[\s*CODE_TASK\s*:[\s\S]*?\]\](?!\])/g, "")
    .replace(/\[\[\s*CODE_TASK\s*:(?:(?!\]\])[\s\S])*$/g, "")
    .replace(/\[\[VIZ:[\s\S]*$/g, "")
    .replace(/\[\[IMAGE:[a-f0-9]*$/i, "")
    .replace(/\[(MASTERY|NEEDS_REVIEW|CREATE_LAB_ENV|LAB_MASTERED|EXAM_MASTERED|LESSON_MASTERED|SESSION_COMPLETE|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE|DIFFICULTY_UP|DIFFICULTY_DOWN)?$/i, "")
    .replace(/\[(LESSON_MASTERED|SESSION_COMPLETE|UNIT_COMPLETE|STAGE_COMPLETE|LEVEL_COMPLETE|DIFFICULTY_UP|DIFFICULTY_DOWN)\]/g, "")
    .replace(/\[(?:MASTERY|NEEDS_REVIEW|CREATE_LAB_ENV|LAB_MASTERED|EXAM_MASTERED)[^\]]*\]/g, "")
    .replace(/\[\[\s*ASK_OPTIONS\s*:[\s\S]*?\]\](?!\])/g, "")
    .replace(/\[\[\s*ASK_OPTIONS\s*:(?:(?!\]\])[\s\S])*$/g, "");
}
const FENCE_LANG_RE =
  /^(python|py|javascript|js|typescript|ts|jsx|tsx|node|html|xml|svg|css|scss|sass|less|bash|sh|shell|zsh|console|cmd|bat|cpp|c\+\+|cxx|cc|c|objc|csharp|cs|java|kotlin|kt|scala|groovy|ruby|rb|go|golang|rust|rs|sql|mysql|postgres|psql|graphql|json|json5|yaml|yml|toml|ini|env|dotenv|php|swift|dart|lua|perl|pl|r|matlab|julia|haskell|elixir|erlang|clojure|powershell|ps1|dockerfile|docker|makefile|make|nginx|apache|diff|patch|markdown|md|mdx|tex|latex|text|txt|plaintext|plain|regex|http)$/i;
const HASH_COMMENT_LANGS = new Set([
  "python","py","ruby","rb","bash","sh","shell","zsh","r","perl","pl",
  "yaml","yml","toml","ini","env","dotenv","dockerfile","docker","makefile","make",
]);
const SLASH_COMMENT_LANGS = new Set([
  "javascript","js","typescript","ts","jsx","tsx","java","kotlin","kt",
  "swift","dart","go","golang","rust","rs","c","cpp","c++","cxx","cc","objc",
  "csharp","cs","scala","groovy","php",
]);
const INLINE_ONLY_LANGS = new Set(["html","xml","svg","sql","mysql","postgres","psql"]);
function stripLineComments(code, lang) {
  const L = lang.toLowerCase();
  const useHash  = HASH_COMMENT_LANGS.has(L);
  const useSlash = SLASH_COMMENT_LANGS.has(L);
  if (!useHash && !useSlash) return code;
  const out = [];
  let inStr = null;
  for (const rawLine of code.split("\n")) {
    if (useHash) { if (/^\s*#/.test(rawLine)) continue; }
    else { if (/^\s*\/\//.test(rawLine)) continue; }
    let result = "";
    let i = 0;
    inStr = null;
    while (i < rawLine.length) {
      const ch = rawLine[i];
      if (inStr) {
        result += ch;
        if (ch === "\\" && i + 1 < rawLine.length) { i++; result += rawLine[i]; }
        else if (ch === inStr) { inStr = null; }
      } else if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; result += ch; }
      else if (useHash && ch === "#" && rawLine[i - 1] !== "!") { break; }
      else if (useSlash && ch === "/" && rawLine[i + 1] === "/" && !/https?:$/.test(result.trimEnd())) { break; }
      else { result += ch; }
      i++;
    }
    const trimmed = result.trimEnd();
    if (trimmed) out.push(trimmed);
  }
  while (out.length > 0 && !out[0].trim()) out.shift();
  while (out.length > 0 && !out[out.length - 1].trim()) out.pop();
  return out.join("\n");
}
function stripFenceComments(src) {
  if (!src || src.indexOf("```") === -1) return src;
  const parts = src.split("```");
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { result += parts[i]; }
    else {
      const firstNl = parts[i].indexOf("\n");
      const lang = firstNl === -1 ? "" : parts[i].slice(0, firstNl).trim();
      const body = firstNl === -1 ? parts[i] : parts[i].slice(firstNl + 1);
      const stripped = INLINE_ONLY_LANGS.has(lang.toLowerCase()) ? body : stripLineComments(body, lang);
      result += "```" + lang + "\n" + stripped + "\n```";
    }
  }
  return result;
}
function normalizeFences(src) {
  if (!src || src.indexOf("```") === -1) return src;
  const parts = src.split("```");
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      let seg = parts[i];
      if (i > 0 && seg && !seg.startsWith("\n")) seg = "\n" + seg;
      out += seg;
    } else {
      let body = parts[i];
      let lang = "";
      const m = body.match(/^[ \t]*([A-Za-z0-9+#_.\-]+)(?=[ \t\n]|$)/);
      if (m && FENCE_LANG_RE.test(m[1])) {
        lang = m[1].toLowerCase();
        body = body.slice(m[0].length).replace(/^[ \t]+/, "").replace(/^\r?\n/, "");
      } else {
        body = body.replace(/^\r?\n/, "");
      }
      body = body.replace(/[ \t\r\n]+$/, "");
      if (out.length && !out.endsWith("\n")) out += "\n";
      out += "```" + lang + "\n" + body + "\n```";
    }
  }
  return out;
}
function stripMissingImageMarkers(raw, missingIds) {
  if (!raw || missingIds.size === 0) return raw;
  return raw.replace(
    /\[\[IMAGE:([a-f0-9]{6,16})\]\](\s*<figcaption\b[\s\S]*?<\/figcaption>)?/gi,
    (m, id) => (missingIds.has(String(id).toLowerCase()) ? "" : m),
  );
}
function expandVizTags(raw) {
  if (!raw || !raw.includes("[[VIZ:")) return raw;
  let out = "";
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf("[[VIZ:", i);
    if (start < 0) { out += raw.slice(i); break; }
    out += raw.slice(i, start);
    let j = start + 6;
    let depth = 0;
    let end = -1;
    let inString = false;
    let escape = false;
    while (j < raw.length) {
      const ch = raw[j];
      if (inString) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === "[" || ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === "]") {
        if (depth > 0) depth--;
        else if (raw[j + 1] === "]") { end = j; break; }
      }
      j++;
    }
    if (end < 0) { i = raw.length; break; }
    const body = raw.slice(start + 6, end).trim();
    const tmplMatch = body.match(/template\s*=\s*([A-Za-z0-9_-]+)/);
    const payloadIdx = body.indexOf("payload");
    let payloadJson = "{}";
    if (payloadIdx >= 0) {
      const eqIdx = body.indexOf("=", payloadIdx);
      if (eqIdx > 0) payloadJson = body.slice(eqIdx + 1).trim().replace(/,$/, "");
    }
    const tmpl = tmplMatch?.[1] ?? "";
    out += `\n\n<div data-viz-mount data-viz-template="${tmpl}" data-viz-payload="${encodeURIComponent(payloadJson)}"></div>\n\n`;
    i = end + 2;
  }
  return out;
}
const SPLIT_CODE_TOKENS = new Set([
  "print", "input", "import", "return", "range", "while", "class", "false",
  "true", "none", "null", "length", "append", "console", "function", "elif",
  "string", "integer", "boolean", "isinstance", "define", "output", "format",
  "lambda", "yield", "global", "continue", "default", "switch", "typeof",
  "println", "printf", "scanf", "foreach",
]);
function mergeSplitCodeTokens(md) {
  if (!md || md.indexOf("`") === -1) return md;
  return md.replace(
    /`([A-Za-z_][A-Za-z0-9_]*)`\s?`([A-Za-z0-9_]+)`/g,
    (m, a, b) => SPLIT_CODE_TOKENS.has((a + b).toLowerCase()) ? "`" + a + b + "`" : m,
  );
}

function renderHtml(raw, missingImageIds) {
  if (!raw) return "";
  const deMissed = missingImageIds && missingImageIds.size > 0 ? stripMissingImageMarkers(raw, missingImageIds) : raw;
  const cleaned = sanitizeProtocolNoise(deMissed);
  const withAnim = expandAnimTags(cleaned);
  const withScene = expandSceneTags(withAnim);
  const withImages = renderImageMarkers(withScene);
  const withViz = expandVizTags(withImages);
  const withFences = normalizeFences(withViz);
  const withNoComments = stripFenceComments(withFences);
  const withLatinCode = latinizeCodeIdentifiers(withNoComments);
  const { text: stripped, blocks } = extractMathBlocks(withLatinCode);
  const merged = mergeSplitCodeTokens(stripped);
  const html = marked.parse(merged ?? "", { async: false });
  const withMath = restoreMathPlaceholders(html, blocks);
  return withMath;
}

const raw = fs.readFileSync(process.argv[2] || "/tmp/msg197_raw.txt", "utf8");
const out = renderHtml(raw);
console.log(out);
