// ─────────────────────────────────────────────────────────────────────────────
// v4 task #8 — Booklet path engine.
//
// Pipeline on upload:
//   1. PDF bytes → per-page text via unpdf (same library materials.ts uses).
//   2. Per-page text → Gemini Flash → instruction tree (units → lessons with
//      page bindings + objective). Strict JSON; failure marks booklet failed.
//   3. Per-page text → ~500-word chunks; each chunk embedded via OpenAI
//      text-embedding-3-small; stored in v4_booklet_chunks.
//   4. v4_student_booklets row flipped to 'ready'.
//
// Pipeline on teach turn:
//   - Look up the bound page range for the current lesson.
//   - Pull ALL bound-page chunks first (priority); fill remaining token
//     budget with the top cosine-similar chunks across the whole booklet
//     for the student's message. ~2000 tokens total.
// ─────────────────────────────────────────────────────────────────────────────

import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  v4StudentBookletsTable,
  v4BookletChunksTable,
  type V4StudentBooklet,
} from "@workspace/db";
import { logger } from "./logger";
import { generateGemini } from "./openrouter-generate";
import { embedTexts, embedQuery, cosineSim, EmbeddingError } from "./openai-embeddings";
import {
  buildPersonaLayer,
  buildMemoryPlaceholderLayer,
  buildSessionHistoryLayer,
  buildBookletReferenceLayer,
  buildUnitLabsPlaceholderLayer,
  buildLanguageLayer,
  type V4PromptStudent,
} from "./v4-teaching-core";

// ─── pgvector probe ─────────────────────────────────────────────────────────
// Spec requires pgvector for embedding storage + retrieval. Replit's
// managed Postgres may or may not have the extension available — we try to
// enable it at startup and fall through to a JSONB + JS-cosine path if not.
// Either way, embeddings are also persisted as JSONB (the schema-of-record)
// so a future extension install can backfill the vector column without data
// loss.
let _pgvectorReady = false;
export function isPgvectorReady(): boolean { return _pgvectorReady; }

export async function tryEnablePgvector(): Promise<boolean> {
  try {
    await db.execute(sql.raw(`CREATE EXTENSION IF NOT EXISTS vector`));
    await db.execute(sql.raw(
      `ALTER TABLE "v4_booklet_chunks" ADD COLUMN IF NOT EXISTS "embedding_v" vector(1536)`,
    ));
    // Verify the column actually has vector type (extension may have
    // installed but column add could have silently fallen back to text).
    const r = await db.execute<{ udt_name: string }>(sql.raw(
      `SELECT udt_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'v4_booklet_chunks'
         AND column_name = 'embedding_v' LIMIT 1`,
    ));
    _pgvectorReady = (r.rows[0]?.udt_name === "vector");
    if (_pgvectorReady) {
      // IVFFLAT/HNSW index optional; skip — booklets are small and
      // sequential scans with `<=>` are sub-100ms.
      logger.info?.("[v4-booklet] pgvector ready (embedding_v vector(1536) available)");
    } else {
      logger.warn?.("[v4-booklet] pgvector extension created but column type is not vector — falling back to JSONB cosine");
    }
    return _pgvectorReady;
  } catch (e: any) {
    _pgvectorReady = false;
    logger.warn?.(`[v4-booklet] pgvector unavailable (${String(e?.message ?? e)}); falling back to JSONB + JS cosine`);
    return false;
  }
}

function toPgvectorLiteral(emb: number[]): string {
  // pgvector text format: "[1.0,2.0,...]" — finite-only, NaN/Infinity rejected.
  return "[" + emb.map((x) => (Number.isFinite(x) ? x : 0)).join(",") + "]";
}

// ─── PDF extraction (reuse unpdf — same lib materials.ts uses) ──────────────
export async function extractBookletPages(buf: Buffer): Promise<{
  pages: Map<number, string>;
  totalPages: number;
  encrypted: boolean;
  error?: string;
}> {
  const pages = new Map<number, string>();
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result: any = await extractText(pdf, { mergePages: false });
    const totalPages = result?.totalPages || (Array.isArray(result?.text) ? result.text.length : 0);
    const arr: string[] = Array.isArray(result?.text) ? result.text : [String(result?.text || "")];
    arr.forEach((t: string, idx: number) => {
      const trimmed = (t || "").replace(/[ \t]+/g, " ").trim();
      if (trimmed) pages.set(idx + 1, trimmed);
    });
    return { pages, totalPages, encrypted: false };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const encrypted = /encrypt|password/i.test(msg);
    return { pages, totalPages: 0, encrypted, error: msg };
  }
}

// ─── Chunking ───────────────────────────────────────────────────────────────
const CHUNK_WORDS = 350;
const CHUNK_OVERLAP_WORDS = 50;

export type BookletChunk = { pageNumber: number; chunkIdx: number; text: string };

export function chunkPages(pages: Map<number, string>): BookletChunk[] {
  const out: BookletChunk[] = [];
  let globalIdx = 0;
  const pageNumbers = Array.from(pages.keys()).sort((a, b) => a - b);
  for (const pn of pageNumbers) {
    const text = pages.get(pn) ?? "";
    if (!text) continue;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= CHUNK_WORDS) {
      out.push({ pageNumber: pn, chunkIdx: globalIdx++, text });
      continue;
    }
    let i = 0;
    while (i < words.length) {
      const slice = words.slice(i, i + CHUNK_WORDS).join(" ");
      out.push({ pageNumber: pn, chunkIdx: globalIdx++, text: slice });
      i += CHUNK_WORDS - CHUNK_OVERLAP_WORDS;
    }
  }
  return out;
}

// ─── Gemini structure generation ────────────────────────────────────────────
export type BookletLesson = {
  lessonIndex: number;
  code: string;
  name: string;
  pages: [number, number];
  objective: string;
  // Spec constraint: when the LLM cannot bind a lesson to specific pages,
  // we mark it `needsReview` instead of guessing. The teach route refuses
  // to serve such lessons; the FE renders them with a "needs supervisor
  // review" badge.
  needsReview?: boolean;
  needsReviewReason?: string;
};
export type BookletUnit = {
  unitIndex: number;
  code: string;
  name: string;
  pages: [number, number];
  lessons: BookletLesson[];
};
export type BookletTree = { units: BookletUnit[] };

const MAX_PAGES_FOR_TREE = 200; // hard cap on what we feed Gemini
const MAX_CHARS_PER_PAGE_FOR_TREE = 600; // first-N chars from each page

function buildPageSummariesForTree(pages: Map<number, string>): string {
  const numbers = Array.from(pages.keys()).sort((a, b) => a - b).slice(0, MAX_PAGES_FOR_TREE);
  const lines: string[] = [];
  for (const pn of numbers) {
    const t = (pages.get(pn) ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS_PER_PAGE_FOR_TREE);
    lines.push(`--- صفحة ${pn} ---\n${t}`);
  }
  return lines.join("\n\n");
}

export async function generateBookletTree(opts: {
  pages: Map<number, string>;
  totalPages: number;
  specialtyName: string;
  bookletTitle: string;
}): Promise<BookletTree> {
  const pageSummaries = buildPageSummariesForTree(opts.pages);

  const systemPrompt = [
    "أنت مساعد بنّاء فهارس تعليمية. تستلم نصوص صفحات ملزمة جامعية وتنتج فهرساً منظماً.",
    "أعِد JSON صالحاً فقط (بدون markdown). الشكل:",
    `{"units":[{"unitIndex":1,"code":"U1","name":"...","pages":[1,8],"lessons":[{"lessonIndex":1,"code":"U1.L1","name":"...","pages":[1,3],"objective":"..."}]}]}`,
    "",
    "قواعد:",
    "- استنتج وحدات منطقية من العناوين/المحتوى (٣-١٠ وحدات حسب الحجم).",
    "- كل وحدة فيها ٢-٨ دروس متسلسلة.",
    "- نطاق الصفحات [start,end] يجب أن يكون داخل [1, totalPages] وغير متداخل بين الدروس.",
    "- الـ code: \"U<n>\" للوحدة، \"U<n>.L<m>\" للدرس.",
    "- objective: جملة قصيرة (٨-٢٠ كلمة) توصف ما سيتعلمه الطالب.",
    "- إذا الملف صغير جداً (أقل من ٥ صفحات) أرجع وحدة واحدة بدرس واحد يغطي كل الصفحات.",
  ].join("\n");

  const userText = [
    `العنوان: ${opts.bookletTitle}`,
    `التخصص: ${opts.specialtyName}`,
    `إجمالي الصفحات: ${opts.totalPages}`,
    "",
    "ملخصات الصفحات (أول ~٦٠٠ حرف من كل صفحة):",
    pageSummaries,
  ].join("\n");

  const result = await generateGemini({
    systemPrompt,
    userParts: [{ type: "text", text: userText }],
    model: "gemini-2.0-flash",
    temperature: 0.3,
    maxOutputTokens: 4096,
    jsonMode: true,
    logTag: "v4-booklet-tree",
  });

  let parsed: any;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    // Best-effort: try to extract a JSON block.
    const m = result.text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("booklet_tree_invalid_json");
    parsed = JSON.parse(m[0]);
  }

  const units = Array.isArray(parsed?.units) ? parsed.units : [];
  if (!units.length) throw new Error("booklet_tree_no_units");

  // Normalise + validate page ranges. Spec: when the LLM cannot bind a
  // lesson to specific pages (missing/invalid/out-of-range/inverted), we
  // mark it `needsReview` instead of fabricating defaults like [1, total].
  // A fabricated wide range would let the teacher cite any page in the
  // book under the guise of "this lesson", breaking citation integrity.
  function validatePages(raw: any): { ok: true; pages: [number, number] } | { ok: false; reason: string } {
    if (!Array.isArray(raw) || raw.length < 2) return { ok: false, reason: "missing_pages" };
    const start = Number(raw[0]);
    const end = Number(raw[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return { ok: false, reason: "non_numeric_pages" };
    const s = Math.floor(start);
    const e = Math.floor(end);
    if (s < 1 || e < 1) return { ok: false, reason: "non_positive_pages" };
    if (s > opts.totalPages || e > opts.totalPages) return { ok: false, reason: "pages_out_of_range" };
    if (s > e) return { ok: false, reason: "inverted_pages" };
    return { ok: true, pages: [s, e] as [number, number] };
  }

  const cleanUnits: BookletUnit[] = units.map((u: any, ui: number) => {
    const lessons = Array.isArray(u?.lessons) ? u.lessons : [];
    const cleanLessons: BookletLesson[] = lessons.map((l: any, li: number) => {
      const pageCheck = validatePages(l?.pages);
      const base: BookletLesson = {
        lessonIndex: Number.isInteger(l?.lessonIndex) ? l.lessonIndex : li + 1,
        code: String(l?.code ?? `U${ui + 1}.L${li + 1}`),
        name: String(l?.name ?? `الدرس ${li + 1}`).slice(0, 160),
        pages: pageCheck.ok ? pageCheck.pages : [1, 1],
        objective: String(l?.objective ?? "").slice(0, 280),
      };
      if (!pageCheck.ok) {
        base.needsReview = true;
        base.needsReviewReason = pageCheck.reason;
      }
      return base;
    });
    const upCheck = validatePages(u?.pages);
    const upages: [number, number] = upCheck.ok
      ? upCheck.pages
      : (() => {
          // Derive the unit's page envelope from its non-needs-review
          // lessons so siblings still get a sane outer bound; if ALL
          // lessons need review, the unit itself does too.
          const bound = cleanLessons.filter((x) => !x.needsReview);
          if (!bound.length) return [1, 1] as [number, number];
          const lo = Math.min(...bound.map((x) => x.pages[0]));
          const hi = Math.max(...bound.map((x) => x.pages[1]));
          return [lo, hi] as [number, number];
        })();
    return {
      unitIndex: Number.isInteger(u?.unitIndex) ? u.unitIndex : ui + 1,
      code: String(u?.code ?? `U${ui + 1}`),
      name: String(u?.name ?? `الوحدة ${ui + 1}`).slice(0, 160),
      pages: upages,
      lessons: cleanLessons.length ? cleanLessons : [{
        lessonIndex: 1,
        code: `U${ui + 1}.L1`,
        name: String(u?.name ?? `الوحدة ${ui + 1}`).slice(0, 160),
        pages: upages,
        objective: "",
        needsReview: true,
        needsReviewReason: "unit_has_no_lessons",
      }],
    };
  });

  return { units: cleanUnits };
}

// ─── Embeddings storage ─────────────────────────────────────────────────────
export async function embedAndStoreChunks(bookletId: number, chunks: BookletChunk[]): Promise<{
  count: number;
  inputTokens: number;
  costUsd: number;
}> {
  if (!chunks.length) return { count: 0, inputTokens: 0, costUsd: 0 };
  const { embeddings, inputTokens, costUsd } = await embedTexts(chunks.map((c) => c.text));

  // Bulk-insert in batches of 200 to keep statement size sane.
  const rows = chunks.map((c, i) => ({
    bookletId,
    pageNumber: c.pageNumber,
    chunkIdx: c.chunkIdx,
    chunkText: c.text,
    embedding: embeddings[i] ?? [],
  }));
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    // JSONB is the schema-of-record (works with or without pgvector).
    const inserted = await db
      .insert(v4BookletChunksTable)
      .values(slice as any)
      .returning({ id: v4BookletChunksTable.id });

    // Mirror to pgvector column when available — enables SQL-side cosine
    // similarity during retrieval (`<=>` operator).
    if (_pgvectorReady && inserted.length === slice.length) {
      try {
        const tuples = inserted.map((r, j) => {
          const emb = (slice[j] as any).embedding as number[];
          return sql`(${r.id}::int, ${toPgvectorLiteral(emb)}::vector)`;
        });
        // Build: UPDATE ... FROM (VALUES (id, emb), ...) AS data(id, emb)
        await db.execute(sql`
          UPDATE "v4_booklet_chunks" AS c
          SET "embedding_v" = data.emb
          FROM (VALUES ${sql.join(tuples, sql`, `)}) AS data(id, emb)
          WHERE c."id" = data.id
        `);
      } catch (e: any) {
        logger.warn?.(`[v4-booklet] pgvector mirror failed (will fall back to JSONB for retrieval): ${String(e?.message ?? e)}`);
      }
    }
  }

  return { count: rows.length, inputTokens, costUsd };
}

// ─── Lookup helpers ─────────────────────────────────────────────────────────
export async function getBooklet(bookletId: number, userId: number): Promise<V4StudentBooklet | null> {
  const [row] = await db
    .select()
    .from(v4StudentBookletsTable)
    .where(and(eq(v4StudentBookletsTable.id, bookletId), eq(v4StudentBookletsTable.userId, userId)));
  return row ?? null;
}

export function findLessonInTree(tree: BookletTree, lessonCode: string): BookletLesson | null {
  for (const u of tree.units ?? []) {
    for (const l of u.lessons ?? []) {
      if (l.code === lessonCode) return l;
    }
  }
  return null;
}

// ─── RAG retrieval ──────────────────────────────────────────────────────────
const TOTAL_CHAR_BUDGET = 8000; // ~2000 tokens conservative

export type RetrievedChunk = { pageNumber: number; text: string; score: number };

export async function retrieveBookletContext(opts: {
  bookletId: number;
  lessonPages: [number, number];
  query: string;
}): Promise<{ chunks: RetrievedChunk[]; lessonPages: [number, number] }> {
  const [pStart, pEnd] = opts.lessonPages;

  // 1) Always-include: every chunk whose page is in the lesson's bound range.
  const pageRange: number[] = [];
  for (let p = pStart; p <= pEnd; p++) pageRange.push(p);

  const boundChunks = pageRange.length
    ? await db
        .select()
        .from(v4BookletChunksTable)
        .where(and(
          eq(v4BookletChunksTable.bookletId, opts.bookletId),
          inArray(v4BookletChunksTable.pageNumber, pageRange),
        ))
    : [];

  const out: RetrievedChunk[] = boundChunks
    .sort((a: any, b: any) => a.pageNumber - b.pageNumber || a.chunkIdx - b.chunkIdx)
    .map((c: any) => ({ pageNumber: c.pageNumber, text: c.chunkText, score: 1 }));

  // 2) Trim to fit if bound chunks alone exceed the budget.
  let used = out.reduce((s, c) => s + c.text.length, 0);
  while (used > TOTAL_CHAR_BUDGET && out.length > 1) {
    const popped = out.pop()!;
    used -= popped.text.length;
  }
  if (used >= TOTAL_CHAR_BUDGET) {
    return { chunks: out, lessonPages: opts.lessonPages };
  }

  // 3) Fill remaining budget with top cosine-similar chunks from anywhere
  //    in the booklet (excluding the bound range to avoid duplicates).
  const query = (opts.query || "").trim();
  if (!query) return { chunks: out, lessonPages: opts.lessonPages };

  let queryEmb: number[];
  try {
    queryEmb = await embedQuery(query.slice(0, 4000));
  } catch (e) {
    logger.warn?.(`[v4-booklet] retrieval embed failed: ${String((e as any)?.message ?? e)}`);
    return { chunks: out, lessonPages: opts.lessonPages };
  }

  const boundPageSet = new Set(pageRange);
  let scored: RetrievedChunk[] = [];

  if (_pgvectorReady) {
    // SQL-side cosine similarity via pgvector's `<=>` distance operator.
    // Scales to large booklets without pulling every embedding to JS.
    try {
      const qLit = toPgvectorLiteral(queryEmb);
      const result = await db.execute<{
        page_number: number;
        chunk_text: string;
        score: number;
      }>(sql`
        SELECT "page_number", "chunk_text",
               (1 - ("embedding_v" <=> ${qLit}::vector))::float8 AS score
        FROM "v4_booklet_chunks"
        WHERE "booklet_id" = ${opts.bookletId}
          AND "embedding_v" IS NOT NULL
          AND NOT ("page_number" = ANY(${pageRange}::int[]))
        ORDER BY "embedding_v" <=> ${qLit}::vector
        LIMIT 30
      `);
      scored = result.rows.map((r: any) => ({
        pageNumber: Number(r.page_number),
        text: String(r.chunk_text),
        score: Number(r.score) || 0,
      }));
    } catch (e: any) {
      logger.warn?.(`[v4-booklet] pgvector retrieval failed (${String(e?.message ?? e)}); falling back to JSONB`);
      scored = [];
    }
  }

  if (!scored.length) {
    // JSONB fallback: pull all non-bound chunks for this booklet and
    // compute cosine in JS. Typical booklet ≤2000 chunks → sub-second.
    const others = await db
      .select()
      .from(v4BookletChunksTable)
      .where(eq(v4BookletChunksTable.bookletId, opts.bookletId));
    for (const c of others as any[]) {
      if (boundPageSet.has(c.pageNumber)) continue;
      const emb = Array.isArray(c.embedding) ? (c.embedding as number[]) : [];
      if (!emb.length) continue;
      const score = cosineSim(queryEmb, emb);
      scored.push({ pageNumber: c.pageNumber, text: c.chunkText, score });
    }
    scored.sort((a, b) => b.score - a.score);
  }

  for (const s of scored) {
    if (used + s.text.length > TOTAL_CHAR_BUDGET) continue;
    out.push(s);
    used += s.text.length;
    if (used >= TOTAL_CHAR_BUDGET * 0.95) break;
  }

  return { chunks: out, lessonPages: opts.lessonPages };
}

// ─── Booklet system prompt — assembled from the SAME 9-layer scaffold
// used by the v4 custom path. Layer 2 carries a booklet-shaped lesson
// summary, layer 3 carries the booklet unit context, and layer 6 carries
// the RAG chunks (the only slot whose content differs between custom
// and booklet flows per the spec).
export function buildBookletTeacherPrompt(opts: {
  specialtyName: string;
  bookletTitle: string;
  lesson: BookletLesson;
  unitName: string;
  retrieved: RetrievedChunk[];
  /** Optional student profile so L1 carries the right starting level / diagnostic
   *  answers. When omitted we render an anonymised persona. */
  student?: V4PromptStudent;
  /** Compressed older-history block (same shape as the custom path). */
  compressedHistoryLayer9?: string;
  language?: "ar" | "en";
}): string {
  const lang = opts.language ?? "ar";
  const studentForL1: V4PromptStudent = opts.student ?? {
    userId: 0,
    startingLevelLabel: "مسار ملازم",
    diagnosticAnswers: [],
  };

  const L1 = buildPersonaLayer(studentForL1);

  // L2 — booklet-shaped lesson card (we don't have v4_lesson concepts/
  // mistakes for booklet lessons, so the structure is simpler).
  const L2 = [
    "## 2. محتوى الدرس",
    `- التخصص: ${opts.specialtyName}`,
    `- كود الدرس: ${opts.lesson.code}`,
    `- الاسم: ${opts.lesson.name}`,
    `- الهدف: ${opts.lesson.objective || "(غير محدد — استنتجه من المقاطع المسترجَعة في الطبقة ٦)"}`,
    `- نطاق الصفحات: ${opts.lesson.pages[0]}–${opts.lesson.pages[1]}`,
    "- لا توجد مفاهيم/أخطاء شائعة محفوظة لدروس الملازم — استخلصها أنت من المقاطع.",
  ].join("\n");

  // L3 — booklet hierarchy (unit only; no stage/level concept for booklets).
  const L3 = [
    "## 3. السياق الهرمي (الوحدة/الملزمة)",
    `- الملزمة: "${opts.bookletTitle}"`,
    `- الوحدة الحالية: ${opts.unitName}`,
    "- مسار الملازم: لا توجد مراحل/مستويات هرمية — الوحدات متسلسلة داخل الملزمة فقط.",
  ].join("\n");

  const L4 = buildMemoryPlaceholderLayer();
  const L5 = buildSessionHistoryLayer(opts.compressedHistoryLayer9 ?? "");
  const L6 = buildBookletReferenceLayer({
    bookletTitle: opts.bookletTitle,
    lessonPages: opts.lesson.pages,
    chunks: opts.retrieved,
  });
  const L7 = buildUnitLabsPlaceholderLayer();
  // L8 — booklet flow has no per-concept mastery; provide a neutral hint
  // instead of pretending to compute one.
  const L8 = [
    "## 8. الصعوبة الموصى بها",
    "- ابدأ بمستوى متوسط ثم اضبط بناءً على تجاوب الطالب.",
    "- يمكنك إصدار [DIFFICULTY_UP] أو [DIFFICULTY_DOWN] بعد رسالة الطالب إذا تطلّب الواقع تعديلاً.",
  ].join("\n");
  const L9 = buildLanguageLayer(lang);

  return [L1, L2, L3, L4, L5, L6, L7, L8, L9].join("\n\n");
}
