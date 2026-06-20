// ─────────────────────────────────────────────────────────────────────────────
// Shared PDF text-extraction + multi-provider OCR chain.
//
// Extracted from routes/materials.ts so BOTH the professor-mode material
// pipeline AND the v4 university-booklet pipeline use one battle-tested OCR
// path (single rate-limit budget, one provider chain, one page-splitter).
//
// Chain order per chunk (first usable text wins):
//   1. Gemini 2.5 Flash — cheap & fast, but easily rate-limited on a free key
//   2. Gemini 2.5 Pro   — different model = separate quota path
//   3. Anthropic Claude — via Replit AI Integrations proxy (no user quota)
//
// A provider returning 429/503 is parked for a cooldown window so we stop
// hammering the same rate limit. Cooldown state is module-level and therefore
// shared across every caller in the process.
// ─────────────────────────────────────────────────────────────────────────────

import {
  recordAiUsage,
  extractAnthropicUsage,
  extractGeminiUsage,
} from "./ai-usage";
import {
  generateGemini,
  hasGeminiProvider,
  GenerateGeminiError,
} from "./openrouter-generate";

export type AiUsageCtx = { userId: number | null; subjectId?: string | null; materialId?: number | null };

// ─── Per-page text extraction (unpdf — serverless-friendly pdfjs wrapper) ────
// We use `unpdf`, a serverless-friendly wrapper around the legacy pdfjs-dist
// build that does not require browser globals like `DOMMatrix`.
export async function extractPdfTextPerPage(buf: Buffer): Promise<{
  pages: Map<number, string>;
  totalPages: number;
  encrypted: boolean;
  error?: string;
}> {
  const pages = new Map<number, string>();
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    // mergePages:false returns text as Array<string>, one entry per page.
    const result = await extractText(pdf, { mergePages: false });
    const totalPages = result?.totalPages || (Array.isArray(result?.text) ? result.text.length : 0);
    const arr: string[] = Array.isArray(result?.text) ? result.text : [String(result?.text || "")];
    arr.forEach((t, idx) => {
      const trimmed = (t || "").replace(/[ \t]+/g, " ").trim();
      if (trimmed) pages.set(idx + 1, trimmed);
    });
    return { pages, totalPages, encrypted: false };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const encrypted = /encrypt|password/i.test(msg);
    console.warn("[pdf-extract] unpdf failed:", msg);
    return { pages, totalPages: 0, encrypted, error: msg };
  }
}

// ─── Multi-provider OCR chain ────────────────────────────────────────────────
type OcrProviderName = "gemini-flash" | "gemini-pro" | "claude";

type OcrProviderResult =
  | { ok: true; text: string }
  | { ok: false; status: "rate_limited" | "transient" | "fatal"; cooldownMs?: number; reason: string };

const PROVIDER_COOLDOWN_DEFAULT_MS = 30_000;
const PROVIDER_COOLDOWN_MAX_MS = 5 * 60_000;
const providerCooldownUntil = new Map<OcrProviderName, number>();

function isProviderAvailable(p: OcrProviderName): boolean {
  const until = providerCooldownUntil.get(p) || 0;
  return Date.now() >= until;
}

function setProviderCooldown(p: OcrProviderName, ms: number): void {
  const until = Date.now() + Math.min(Math.max(ms, 1000), PROVIDER_COOLDOWN_MAX_MS);
  providerCooldownUntil.set(p, until);
  console.warn(`[ocr] cooldown ${p} for ${Math.round((until - Date.now()) / 1000)}s`);
}

const OCR_PROMPT = `استخرج النص الكامل من هذا المستند صفحة بصفحة. ابدأ كل صفحة بسطر "--- صفحة X ---".
لا تُلخّص ولا تُعدّل، انسخ النص العربي والإنجليزي حرفياً.`;

// Gemini provider — routed via OpenRouter (primary) with Google direct as
// optional fallback. Returns provider result with rate-limit metadata so
// the chain can switch providers cleanly instead of blind retries.
async function ocrChunkGemini(model: "gemini-2.5-flash" | "gemini-2.5-pro", chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<OcrProviderResult> {
  if (!hasGeminiProvider()) return { ok: false, status: "fatal", reason: "no_api_key" };
  const __aiStart = Date.now();
  try {
    const result = await generateGemini({
      userParts: [
        { type: "file", mimeType: "application/pdf", dataBase64: chunkBuf.toString("base64") },
        { type: "text", text: OCR_PROMPT },
      ],
      model,
      temperature: 0.0,
      maxOutputTokens: 8192,
      timeoutMs: 120_000,
      logTag: `ocr:${label}`,
    });
    {
      const __u = extractGeminiUsage(result.usageMetadata);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/ocr",
        provider: "gemini",
        model,
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId
          ? { materialId: ctx.materialId, label, channel: result.channel }
          : { label, channel: result.channel },
      });
    }
    const text = result.text.trim();
    if (text.length === 0) return { ok: false, status: "transient", reason: "empty_response" };
    return { ok: true, text };
  } catch (e: any) {
    if (e instanceof GenerateGeminiError) {
      // 429/503 → real rate-limit signal; honor with provider cooldown.
      if (e.status === 429 || e.status === 503) {
        console.warn(`[ocr] ${label} ${model} ${e.status} → cooldown ${PROVIDER_COOLDOWN_DEFAULT_MS}ms`);
        return { ok: false, status: "rate_limited", cooldownMs: PROVIDER_COOLDOWN_DEFAULT_MS, reason: `http_${e.status}` };
      }
      console.warn(`[ocr] ${label} ${model} http`, e.status, e.body.slice(0, 200));
      // 4xx (other than 429) means request shape problem or auth — fatal.
      if (e.status >= 400 && e.status < 500) {
        return { ok: false, status: "fatal", reason: `http_${e.status}` };
      }
      return { ok: false, status: "transient", reason: `http_${e.status}` };
    }
    console.warn(`[ocr] ${label} ${model} threw:`, e?.message || e);
    return { ok: false, status: "transient", reason: String(e?.message || e).slice(0, 100) };
  }
}

// Anthropic Claude provider — uses native PDF input via Replit AI Integrations
// proxy, so it does not consume the user's own GEMINI_API_KEY quota.
async function ocrChunkClaude(chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<OcrProviderResult> {
  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || !process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    return { ok: false, status: "fatal", reason: "anthropic_not_configured" };
  }
  const __aiStart = Date.now();
  try {
    const { anthropic } = await import("@workspace/integrations-anthropic-ai");
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: chunkBuf.toString("base64"),
            },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      }],
    });
    {
      const __u = extractAnthropicUsage(msg);
      void recordAiUsage({
        userId: ctx?.userId ?? null,
        subjectId: ctx?.subjectId ?? null,
        route: "materials/ocr",
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        inputTokens: __u.inputTokens,
        outputTokens: __u.outputTokens,
        cachedInputTokens: __u.cachedInputTokens,
        latencyMs: Date.now() - __aiStart,
        metadata: ctx?.materialId ? { materialId: ctx.materialId, label } : { label },
      });
    }
    const text = msg.content
      .map((c: any) => (c.type === "text" ? c.text : ""))
      .join("\n")
      .trim();
    if (text.length === 0) return { ok: false, status: "transient", reason: "empty_response" };
    return { ok: true, text };
  } catch (e: any) {
    const emsg = String(e?.message || e);
    const status = e?.status;
    if (status === 429 || status === 529 || /rate.?limit|overloaded/i.test(emsg)) {
      console.warn(`[ocr] ${label} claude rate-limited:`, emsg.slice(0, 150));
      return { ok: false, status: "rate_limited", cooldownMs: PROVIDER_COOLDOWN_DEFAULT_MS, reason: "rate_limited" };
    }
    console.warn(`[ocr] ${label} claude threw:`, emsg.slice(0, 200));
    return { ok: false, status: "transient", reason: emsg.slice(0, 100) };
  }
}

// Per-provider transient-failure retry schedule. We retry only on "transient"
// errors (network blips, empty responses, 5xx) — never on "rate_limited"
// (those skip straight to the next provider with the cooldown set) and never
// on "fatal" (e.g. missing credentials).
const TRANSIENT_RETRY_DELAYS_MS = [5_000, 15_000, 45_000];

// Run a chunk through the provider chain. Returns the first successful text,
// or "" if every provider failed.
export async function ocrPdfChunk(chunkBuf: Buffer, label: string, ctx?: AiUsageCtx): Promise<string> {
  const chain: Array<{ name: OcrProviderName; run: () => Promise<OcrProviderResult> }> = [
    { name: "gemini-flash", run: () => ocrChunkGemini("gemini-2.5-flash", chunkBuf, label, ctx) },
    { name: "gemini-pro", run: () => ocrChunkGemini("gemini-2.5-pro", chunkBuf, label, ctx) },
    { name: "claude", run: () => ocrChunkClaude(chunkBuf, label, ctx) },
  ];

  for (const provider of chain) {
    if (!isProviderAvailable(provider.name)) {
      console.info(`[ocr] ${label} skip ${provider.name} (in cooldown)`);
      continue;
    }

    let attempt = 0;
    let lastResult: OcrProviderResult | null = null;
    while (attempt <= TRANSIENT_RETRY_DELAYS_MS.length) {
      const result = await provider.run();
      lastResult = result;
      if (result.ok) {
        console.info(`[ocr] ${label} ok via ${provider.name} (${result.text.length} chars, attempt ${attempt + 1})`);
        return result.text;
      }
      if (result.status === "rate_limited") {
        if (result.cooldownMs) setProviderCooldown(provider.name, result.cooldownMs);
        break;
      }
      if (result.status === "fatal") {
        setProviderCooldown(provider.name, PROVIDER_COOLDOWN_MAX_MS);
        break;
      }
      // status === "transient": back off and retry the same provider.
      const delay = TRANSIENT_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break; // exhausted retries → fall to next provider
      console.warn(`[ocr] ${label} ${provider.name} transient (${result.reason}); retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
    if (lastResult && !lastResult.ok) {
      console.warn(`[ocr] ${label} ${provider.name} exhausted (${lastResult.status}: ${lastResult.reason})`);
    }
  }
  return "";
}

export const OCR_CHUNK_PAGES = 4;   // smaller chunks = smaller failure blast radius and lower per-call token usage
const OCR_MAX_CHUNKS = 150;  // 150 * 4 = 600 pages — matches the upload page-count ceiling

export interface OcrResult {
  text: string;          // accumulated successful-chunk text (NO failure placeholders)
  totalChunks: number;
  successfulChunks: number;
  placeholders: string;  // failure markers, kept separately for downstream display
  failedRanges: Array<[number, number]>; // 1-based [startPage, endPage] ranges that produced no text
}

// Split the PDF into ≤OCR_CHUNK_PAGES-page chunks, OCR each independently with
// retry on failure, then return whatever succeeded *plus* explicit success
// metrics so the caller can decide whether the document is usable.
export async function ocrPdfWithGemini(buf: Buffer, pageCount: number, ctx?: AiUsageCtx): Promise<OcrResult> {
  // Name kept for backwards compat — this drives the full multi-provider chain
  // (Gemini Flash → Gemini Pro → Claude). Short-circuits only if NO provider is
  // configured; otherwise Claude can serve scans even without a Gemini key.
  const hasAnyProvider = Boolean(
    hasGeminiProvider() ||
    (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL)
  );
  if (!hasAnyProvider) {
    return { text: "", totalChunks: 0, successfulChunks: 0, placeholders: "", failedRanges: [] };
  }

  // Fall back to single-shot if pdf-lib can't open the file (encrypted /
  // malformed); preserves prior behavior so we never regress to "0 text".
  let pdfLibMod: any;
  try {
    pdfLibMod = await import("pdf-lib");
  } catch (e: any) {
    console.warn("[ocr] pdf-lib import failed, single-shot fallback:", e?.message || e);
    const text = await ocrPdfChunk(buf, "full", ctx);
    return { text, totalChunks: 1, successfulChunks: text.length > 0 ? 1 : 0, placeholders: "", failedRanges: text.length > 0 ? [] : [[1, pageCount || 1]] };
  }
  const { PDFDocument } = pdfLibMod;

  let srcDoc: any;
  try {
    srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  } catch (e: any) {
    console.warn("[ocr] pdf-lib load failed, single-shot fallback:", e?.message || e);
    const text = await ocrPdfChunk(buf, "full", ctx);
    return { text, totalChunks: 1, successfulChunks: text.length > 0 ? 1 : 0, placeholders: "", failedRanges: text.length > 0 ? [] : [[1, pageCount || 1]] };
  }

  const totalPages = srcDoc.getPageCount();
  const effectivePages = Math.min(totalPages, pageCount || totalPages, OCR_CHUNK_PAGES * OCR_MAX_CHUNKS);
  const chunkRanges: Array<[number, number]> = [];
  for (let start = 0; start < effectivePages; start += OCR_CHUNK_PAGES) {
    chunkRanges.push([start, Math.min(start + OCR_CHUNK_PAGES, effectivePages)]);
  }

  const successful: string[] = [];
  const placeholders: string[] = [];
  const failedRanges: Array<[number, number]> = []; // 1-based, inclusive end
  let succeededChunks = 0;
  for (const [start, end] of chunkRanges) {
    const label = `pages ${start + 1}-${end}`;
    let chunkBuf: Buffer;
    try {
      const chunkDoc = await PDFDocument.create();
      const indices = Array.from({ length: end - start }, (_, i) => start + i);
      const copied = await chunkDoc.copyPages(srcDoc, indices);
      copied.forEach((p: any) => chunkDoc.addPage(p));
      const bytes = await chunkDoc.save();
      chunkBuf = Buffer.from(bytes);
    } catch (e: any) {
      console.warn(`[ocr] ${label} split failed:`, e?.message || e);
      placeholders.push(`--- صفحات ${start + 1}-${end}: تعذّر تقسيم الصفحات ---`);
      failedRanges.push([start + 1, end]);
      continue;
    }

    const text = await ocrPdfChunk(chunkBuf, label, ctx);
    if (text.length > 0) {
      successful.push(text);
      succeededChunks++;
    } else {
      placeholders.push(`--- صفحات ${start + 1}-${end}: تعذّر استخراج النص ---`);
      failedRanges.push([start + 1, end]);
    }
  }

  console.info(`[ocr] chunked: ${succeededChunks}/${chunkRanges.length} chunks ok, ${effectivePages}/${totalPages} pages attempted`);
  return {
    text: successful.join("\n\n").trim(),
    totalChunks: chunkRanges.length,
    successfulChunks: succeededChunks,
    placeholders: placeholders.join("\n"),
    failedRanges,
  };
}

// Parse OCR output that uses "--- صفحة N ---" / "--- Page N ---" page markers
// into a per-page text map.
export function splitOcrTextIntoPages(ocrText: string): Map<number, string> {
  const map = new Map<number, string>();
  const re = /---\s*(?:صفحة|Page|page)\s*(\d+)\s*---/g;
  let lastIdx = 0;
  let lastPage: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ocrText)) !== null) {
    if (lastPage !== null) {
      const slice = ocrText.slice(lastIdx, m.index).trim();
      if (slice) map.set(lastPage, slice);
    }
    lastPage = parseInt(m[1], 10);
    lastIdx = re.lastIndex;
  }
  if (lastPage !== null) {
    const slice = ocrText.slice(lastIdx).trim();
    if (slice) map.set(lastPage, slice);
  }
  return map;
}
