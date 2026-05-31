/**
 * Shared JSON extraction and repair utilities.
 *
 * Used by multiple AI routes (/ai/lab/build-env, /ai/attack-sim/build, …) to
 * recover valid JSON from model responses that may be truncated (max_tokens
 * cut-off), surrounded by prose, or contain unescaped quotes inside strings.
 */

/**
 * Extract the largest balanced JSON object substring from a raw string.
 * If the response was truncated (depth never returns to 0) we return what we
 * have so the repair pass can try to close it.
 */
export const extractJsonObject = (
  s: string
): { text: string; balanced: boolean } | null => {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { text: s.slice(start, i + 1), balanced: true };
    }
  }
  return { text: s.slice(start), balanced: false };
};

/**
 * Repair a truncated JSON snippet: drop trailing partial token, close any
 * open string, then auto-close all open arrays/objects in correct order.
 */
export const repairJson = (s: string): string => {
  let txt = s;
  const lastGood = Math.max(
    txt.lastIndexOf(","),
    txt.lastIndexOf("{"),
    txt.lastIndexOf("[")
  );
  if (lastGood > 0) {
    const after = txt.slice(lastGood + 1);
    if (
      after.includes(":") &&
      !after.trim().endsWith("}") &&
      !after.trim().endsWith("]")
    ) {
      txt = txt.slice(0, lastGood);
    }
  }
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) txt += '"';
  txt = txt.replace(/,\s*$/, "");
  while (stack.length) txt += stack.pop();
  return txt;
};

/**
 * Attempt a plain JSON.parse first, then fall back to extract → repair.
 * Returns the parsed value or null if all strategies fail.
 *
 * @param raw     Raw string from the model
 * @param logTag  Label used in console messages (e.g. "[build-env]")
 */
export const robustJsonParse = (raw: string, logTag: string): any | null => {
  const tryParse = (s: string): any | null => {
    try { return JSON.parse(s); } catch { return null; }
  };

  let result = tryParse(raw);
  if (result) return result;

  const extracted = extractJsonObject(raw);
  if (!extracted) return null;

  result = tryParse(extracted.text);
  if (result) return result;

  const repaired = repairJson(extracted.text);
  result = tryParse(repaired);
  if (result) console.log(`${logTag} recovered via JSON repair`);
  return result;
};
