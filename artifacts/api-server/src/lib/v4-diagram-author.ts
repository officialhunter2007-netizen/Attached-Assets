/**
 * v4-diagram-author.ts — Claude Haiku authors a single Mermaid.js diagram.
 *
 * The teaching model (Gemini) NEVER writes Mermaid syntax itself anymore —
 * it only requests one via the `[[DIAGRAM: kind ||| topic ||| details |||
 * steps=yes|no]]` tag (see v4_teach.ts interception + v4-teaching-core.ts
 * prompt layer). This module is the side-channel call that turns that
 * request into real `{code, steps}` mermaid-diagram VIZ payload, the same
 * shape the model used to author inline.
 *
 * Failure mode: NEVER throws. Returns null on any transport/parse/validation
 * failure (after one repair retry) so the caller can emit `diagramMissing`
 * and drop the request cleanly — mirrors the PHOTO pipeline's swallow-all
 * contract.
 */

import { generateGeminiJson } from "./openrouter-generate";
import { logger } from "./logger";

const HAIKU_MODEL = "anthropic/claude-haiku-4.5";

// Flat per-call estimate (same convention as BOOKLET_LAB_GRADE_USD) — a short
// system+user prompt with a few hundred output tokens on Haiku 4.5 pricing
// ($1/M in, $5/M out) lands well under a cent; no need for token-accurate
// billing on a side-channel call this small.
export const DIAGRAM_AI_USD = 0.004;

export type DiagramKind = "sequence" | "flow" | "mindmap" | "timeline" | "pie";

const ALLOWED_KINDS: DiagramKind[] = ["sequence", "flow", "mindmap", "timeline", "pie"];

export function normalizeDiagramKind(raw: string): DiagramKind | null {
  const k = raw.trim().toLowerCase();
  return (ALLOWED_KINDS as string[]).includes(k) ? (k as DiagramKind) : null;
}

export type DiagramRequest = {
  kind: DiagramKind;
  topic: string;
  details: string;
  wantSteps: boolean;
};

export type DiagramResult = {
  code: string;
  steps?: string[];
};

const KIND_LABEL_AR: Record<DiagramKind, string> = {
  sequence: "sequenceDiagram — تسلسل رسائل بين أطراف",
  flow: "graph LR أو graph TD — تدفّق عمليات/معمارية",
  mindmap: "mindmap — خريطة ذهنية",
  timeline: "timeline — خطوات عبر الزمن",
  pie: "pie title <عنوان> — نسب مئوية",
};

// First-token check that the model actually used the right diagram TYPE for
// the requested kind — cheap sanity gate before trusting the syntax itself.
function startsWithExpectedKeyword(code: string, kind: DiagramKind): boolean {
  const head = code.trim().slice(0, 40).toLowerCase();
  switch (kind) {
    case "sequence": return head.startsWith("sequencediagram");
    case "flow": return head.startsWith("graph ") || head.startsWith("flowchart ");
    case "mindmap": return head.startsWith("mindmap");
    case "timeline": return head.startsWith("timeline");
    case "pie": return head.startsWith("pie");
    default: return false;
  }
}

function buildSystemPrompt(): string {
  return (
    "أنت رسّام Mermaid.js متخصص. مهمتك الوحيدة: تحويل طلب رسم إلى كود Mermaid " +
    "صحيح 100% (بناء جملي صارم، بدون أي خطأ). أعد JSON صرف فقط بالشكل: " +
    '{"code":"<كود Mermaid كامل وصحيح، أسطر بـ\\n>","steps":["<اختياري: نسخة ' +
    'تراكمية لكل خطوة>"]}. لا تكتب أي نص خارج الـ JSON. لا تستخدم markdown fences.\n\n' +
    "قواعد لكل نوع:\n" +
    "- sequenceDiagram: ابدأ بـ `sequenceDiagram`، استخدم `actor`/`participant` ثم `->>`/`-->>`.\n" +
    "- graph (flow): ابدأ بـ `graph LR` أو `graph TD`. يمكن تلوين العقد بـ `style <id> fill:#hex,stroke:#hex` أو `classDef`.\n" +
    "- mindmap: ابدأ بـ `mindmap`.\n" +
    "- timeline: ابدأ بـ `timeline`.\n" +
    "- pie: ابدأ بـ `pie title <عنوان>` ثم أسطر `\"تسمية\" : رقم`.\n" +
    "استخدم إيموجي داخل تسميات العقد لتوضيحها بصرياً (🧑‍💻 🌐 🏢 🔓 …)، والنصوص بالعربية الفصحى المبسّطة. " +
    "لا تكتب أي تعليق `%%` داخل الكود إلا توجيه `%%{init: ...}%%` إن رغبت بتخصيص الألوان.\n\n" +
    "حقل `steps` (إن طُلب): مصفوفة تراكمية — كل عنصر كود Mermaid كامل وصحيح بذاته يحتوي خطوة " +
    "إضافية عن سابقه، وآخر عنصر يطابق `code` تماماً (نفس النص حرفياً)."
  );
}

function buildUserPrompt(req: DiagramRequest): string {
  return (
    `نوع الرسم المطلوب: ${KIND_LABEL_AR[req.kind]}\n` +
    `الموضوع: ${req.topic}\n` +
    `التفاصيل المطلوب تمثيلها في الرسم:\n${req.details}\n\n` +
    (req.wantSteps
      ? "زوّد أيضاً حقل `steps` بمصفوفة تراكمية تكشف الرسم خطوة بخطوة."
      : "لا حاجة لحقل `steps` — رسم ثابت واحد يكفي.")
  );
}

function tryParse(raw: string | undefined | null, req: DiagramRequest): DiagramResult | null {
  if (!raw) return null;
  let text = raw.trim();
  // Defensive: strip a stray ```json ... ``` fence if the model wrapped it
  // despite the "no markdown fences" instruction.
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) text = fenceMatch[1];
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const code = typeof parsed?.code === "string" ? parsed.code.trim() : "";
  if (!code || !startsWithExpectedKeyword(code, req.kind)) return null;

  let steps: string[] | undefined;
  if (Array.isArray(parsed?.steps)) {
    const cleaned = parsed.steps
      .filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
      .map((s: string) => s.trim());
    if (cleaned.length > 1 && cleaned[cleaned.length - 1] === code) {
      steps = cleaned;
    }
    // Invalid/mismatched steps array → silently drop steps rather than fail
    // the whole diagram; the static `code` is still a valid, useful result.
  }
  return steps ? { code, steps } : { code };
}

/**
 * Author one Mermaid diagram via Haiku. Never throws. One repair retry on an
 * invalid/unparseable first attempt, then gives up (null).
 */
export async function authorMermaidDiagram(
  req: DiagramRequest,
): Promise<DiagramResult | null> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateGeminiJson({
        systemPrompt,
        userPrompt: attempt === 0
          ? userPrompt
          : userPrompt +
            "\n\n⚠ محاولتك السابقة كانت JSON غير صالح أو لا تبدأ بالكلمة المفتاحية الصحيحة لنوع الرسم. " +
            "أعد المحاولة بعناية والتزم بالتنسيق تماماً.",
        model: HAIKU_MODEL,
        temperature: 0.4,
        maxOutputTokens: 900,
        timeoutMs: 20_000,
        logTag: "v4-diagram-author",
      });
      const result = tryParse(res.text, req);
      if (result) return result;
    } catch (e) {
      logger.warn?.(
        `[v4-diagram-author] attempt=${attempt} kind=${req.kind} failed: ${String((e as any)?.message ?? e)}`,
      );
    }
  }
  return null;
}
