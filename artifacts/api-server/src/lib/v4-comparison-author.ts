/**
 * v4-comparison-author.ts — Claude Haiku authors a structured "X vs Y"
 * comparison table from a lightweight request.
 *
 * Mirrors v4-diagram-author.ts exactly: the teaching model (Gemini) NEVER
 * invents the comparison axes/values itself — it only requests one via the
 * `[[COMPARE: entityA ||| entityB ||| entityC(optional) ||| context]]` tag
 * (see v4_teach.ts interception + v4-teaching-core.ts prompt layer). This
 * module is the side-channel call that turns that request into a real,
 * schema-valid `{title, axes, items}` comparison VIZ payload.
 *
 * Failure mode: NEVER throws. Returns null on any transport/parse/validation
 * failure (after one repair retry) so the caller can emit `comparisonMissing`
 * and drop the request cleanly — mirrors the DIAGRAM pipeline's contract.
 */

import { z } from "zod";
import { generateGeminiJson } from "./openrouter-generate";
import { logger } from "./logger";

const HAIKU_MODEL = "anthropic/claude-haiku-4.5";

// Same flat per-call estimate convention as DIAGRAM_AI_USD — a short
// system+user prompt with a few hundred output tokens on Haiku 4.5 pricing
// ($1/M in, $5/M out) lands well under a cent.
export const COMPARISON_AI_USD = 0.004;

export type ComparisonRequest = {
  entities: string[];
  context: string;
};

const comparisonPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    axes: z.array(z.string().trim().min(1).max(60)).min(2).max(6),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          values: z.array(z.string().trim().min(1).max(200)).min(1),
        }),
      )
      .min(2)
      .max(4),
  })
  .refine((p) => p.items.every((it) => it.values.length === p.axes.length), {
    message: "each item's values length must equal axes length",
  });

export type ComparisonResult = z.infer<typeof comparisonPayloadSchema>;

function buildSystemPrompt(): string {
  return (
    "أنت خبير في بناء جداول مقارنة تعليمية واضحة. مهمتك الوحيدة: تحويل طلب مقارنة " +
    "بين عنصرين أو ثلاثة إلى JSON صرف فقط بالشكل التالي، بلا أي نص خارجه ولا markdown fences:\n" +
    '{"title":"<عنوان قصير للمقارنة>","axes":["<محور 1>","<محور 2>", "..."],' +
    '"items":[{"name":"<اسم العنصر>","values":["<قيمة تقابل axes[0]>","<قيمة تقابل axes[1]>", "..."]}]}\n\n' +
    "قواعد صارمة:\n" +
    "- بين 2 و6 محاور (axes) — اختر المحاور الأكثر فائدة تعليمياً وتمييزاً بين العناصر، لا العشوائية.\n" +
    "- بين 2 و4 عناصر (items) بعدد العناصر المطلوبة بالضبط من الطلب.\n" +
    "- كل عنصر يجب أن يحتوي values بنفس عدد وترتيب axes تماماً — لا نقص ولا زيادة.\n" +
    "- كل قيمة موجزة (جملة قصيرة أو رقم أو كلمة)، لا فقرات طويلة.\n" +
    "- استخدم العربية الفصحى المبسّطة، ويمكن إضافة رمز/إيموجي مناسب داخل القيمة لتوضيحها (✅ ❌ ⚡ 💰 …).\n" +
    "- إن كان أحد المحاور رقمياً بطبيعته (سرعة، تكلفة، سنة...) اكتب الرقم مع وحدته كنص قصير."
  );
}

function buildUserPrompt(req: ComparisonRequest): string {
  const entitiesLine = req.entities.filter(Boolean).join(" ⟷ ");
  return (
    `قارن بين: ${entitiesLine}\n` +
    `سياق المقارنة/ما يريد الطالب فهمه بالضبط:\n${req.context}\n\n` +
    `عدد العناصر في الجدول يجب أن يكون بالضبط ${req.entities.filter(Boolean).length}.`
  );
}

function tryParse(raw: string | undefined | null): ComparisonResult | null {
  if (!raw) return null;
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) text = fenceMatch[1];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const result = comparisonPayloadSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Author one comparison table via Haiku. Never throws. One repair retry on
 * an invalid/unparseable first attempt, then gives up (null).
 */
export async function authorComparison(
  req: ComparisonRequest,
): Promise<ComparisonResult | null> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await generateGeminiJson({
        systemPrompt,
        userPrompt:
          attempt === 0
            ? userPrompt
            : userPrompt +
              "\n\n⚠ محاولتك السابقة كانت JSON غير صالح أو لا تطابق الشكل المطلوب (تأكد أن كل item.values بنفس عدد axes تماماً). " +
              "أعد المحاولة بعناية والتزم بالتنسيق تماماً.",
        model: HAIKU_MODEL,
        temperature: 0.4,
        maxOutputTokens: 700,
        timeoutMs: 20_000,
        logTag: "v4-comparison-author",
      });
      const result = tryParse(res.text);
      if (result) return result;
    } catch (e) {
      logger.warn?.(
        `[v4-comparison-author] attempt=${attempt} failed: ${String((e as any)?.message ?? e)}`,
      );
    }
  }
  return null;
}
