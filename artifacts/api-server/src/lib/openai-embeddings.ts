// ─────────────────────────────────────────────────────────────────────────────
// OpenAI embeddings client (text-embedding-3-small, 1536 dims).
//
// Used by v4 task #8 booklet RAG. We route through OpenRouter
// (https://openrouter.ai/api/v1/embeddings) which proxies OpenAI's
// text-embedding-3-small. This avoids requiring a separate OPENAI_API_KEY;
// the same OPENROUTER_API_KEY used for all AI teaching calls works here.
//
// The model ID on OpenRouter is "openai/text-embedding-3-small"; the vector
// shape is identical to direct OpenAI (1536 dims), so existing pgvector
// rows remain compatible.
// ─────────────────────────────────────────────────────────────────────────────

import { getOpenRouterKey } from "./openrouter-key";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
// OpenRouter model ID for OpenAI's text-embedding-3-small.
export const EMBED_MODEL = "openai/text-embedding-3-small";
export const EMBED_DIMS = 1536;
// $0.020 / 1M input tokens (OpenAI pricing, passed through by OpenRouter).
const EMBED_USD_PER_TOKEN = 0.020 / 1_000_000;

export class EmbeddingError extends Error {
  status: number;
  unconfigured: boolean;
  constructor(message: string, opts: { status: number; unconfigured?: boolean } = { status: 0 }) {
    super(message);
    this.name = "EmbeddingError";
    this.status = opts.status;
    this.unconfigured = !!opts.unconfigured;
  }
}

function getKey(): string {
  const k = getOpenRouterKey();
  if (!k) throw new EmbeddingError("OPENROUTER_API_KEY not configured", { status: 0, unconfigured: true });
  return k;
}

export type EmbedResult = {
  embeddings: number[][];
  inputTokens: number;
  costUsd: number;
};

/**
 * Batch-embed a list of texts. OpenAI accepts up to ~2048 inputs per call
 * and 8191 tokens per input; we chunk conservatively into ~64-item batches
 * to keep memory bounded.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  if (!texts.length) return { embeddings: [], inputTokens: 0, costUsd: 0 };
  const key = getKey();

  const BATCH = 64;
  const out: number[][] = [];
  let totalInputTokens = 0;

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => (t || "").slice(0, 24_000)); // ~6k tokens hard cap
    const resp = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://learnukhba.com",
        "X-Title": "Nukhba Booklet RAG",
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: batch,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new EmbeddingError(`OpenRouter embeddings failed: HTTP ${resp.status} — ${body.slice(0, 300)}`, { status: resp.status });
    }
    const data: any = await resp.json();
    const items: Array<{ embedding: number[] }> = data?.data ?? [];
    for (const it of items) out.push(it.embedding);
    totalInputTokens += Number(data?.usage?.prompt_tokens ?? data?.usage?.total_tokens ?? 0);
  }

  return {
    embeddings: out,
    inputTokens: totalInputTokens,
    costUsd: totalInputTokens * EMBED_USD_PER_TOKEN,
  };
}

export async function embedQuery(text: string): Promise<number[]> {
  const r = await embedTexts([text || " "]);
  return r.embeddings[0] ?? [];
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
