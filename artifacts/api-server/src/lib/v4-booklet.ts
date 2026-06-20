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
  V4_CONTENT_GEN_MODEL,
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

// A lab = a practical-application block bound to a page range. When the
// booklet has an explicit exercises/problems section we bind the lab to it
// (hasExercises=true) and later turn those exercises into interactive
// practice; for pure-theory units we still emit ONE lab (hasExercises=false)
// whose questions are generated GROUNDED in the unit's own content.
export type BookletLab = {
  labIndex: number;
  code: string;            // "U<n>.LAB<m>"
  title: string;
  pages: [number, number]; // source pages (exercises section or unit content)
  hasExercises: boolean;
  needsReview?: boolean;
  needsReviewReason?: string;
};

// An exam reference. Questions are generated lazily on first attempt from
// `sourcePages`; `scope` separates a per-unit test from the booklet-wide
// final. Exams are assessment-only (stars/mastery) — they never gate nav.
export type BookletExamRef = {
  code: string;            // "U<n>.TEST" | "FINAL"
  title: string;
  scope: "unit" | "final";
  sourcePages: [number, number];
};

export type BookletUnit = {
  unitIndex: number;
  code: string;
  name: string;
  pages: [number, number];
  lessons: BookletLesson[];
  // Additive (optional for backward-compat with v1 flat trees).
  labs?: BookletLab[];
  unitTest?: BookletExamRef | null;
};

// Lightweight grouping layer OVER the flat `units` list. Stages reference
// unit *codes* (not nested unit objects) so `units` stays the single source
// of truth and every existing consumer (routes + FE) keeps working unchanged
// while the map renders the full levels→stages→units→lessons hierarchy.
export type BookletStageGroup = {
  stageIndex: number;
  name: string;
  unitCodes: string[];
};
export type BookletLevelGroup = {
  levelIndex: number;
  name: string;
  stages: BookletStageGroup[];
};

// `depth` records how much hierarchy the booklet actually warranted so the FE
// can render adaptively (a 6-page handout shouldn't fake 5 layers).
export type BookletDepth = "lessons" | "units" | "stages" | "levels";

export type BookletTree = {
  units: BookletUnit[];                 // canonical flat list (unchanged)
  levels?: BookletLevelGroup[];         // optional grouping over unit codes
  finalTest?: BookletExamRef | null;    // booklet-wide assessment
  depth?: BookletDepth;
};

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
    "أنت خبير بناء فهارس تعليمية تكيّفية. تستلم نصوص صفحات ملزمة جامعية وتبني منها هيكلاً تعليمياً متدرّجاً.",
    "أعِد JSON صالحاً فقط (بدون أي شرح أو markdown). الشكل:",
    `{"depth":"lessons|units|stages|levels","units":[{"unitIndex":1,"code":"U1","name":"...","pages":[1,8],"lessons":[{"lessonIndex":1,"code":"U1.L1","name":"...","pages":[1,3],"objective":"..."}],"labs":[{"labIndex":1,"code":"U1.LAB1","title":"...","pages":[7,8],"hasExercises":true}],"unitTest":{"code":"U1.TEST","title":"...","sourcePages":[1,8]}}],"levels":[{"levelIndex":1,"name":"...","stages":[{"stageIndex":1,"name":"...","unitCodes":["U1"]}]}],"finalTest":{"code":"FINAL","title":"...","sourcePages":[1,8]}}`,
    "",
    "العمق التكيّفي (depth) — اختر حسب الحجم والبنية الفعلية، ولا تختلق طبقات وهمية:",
    "- \"lessons\": ملزمة صغيرة/موضوع واحد → وحدة واحدة فيها دروس.",
    "- \"units\": عدة مواضيع بلا فصول واضحة → عدة وحدات، مستوى ومرحلة واحدة.",
    "- \"stages\": توجد فصول → اجمع الوحدات في مراحل ضمن مستوى واحد.",
    "- \"levels\": توجد أجزاء وفصول → مستويات تحوي مراحل تحوي وحدات.",
    "الربط الطبيعي: الأجزاء→مستويات، الفصول→مراحل، الأقسام→وحدات، المواضيع→دروس، التمارين→معامل.",
    "",
    "قواعد الوحدات والدروس:",
    "- استنتج الوحدات والدروس من العناوين والمحتوى الفعلي (٣-١٠ وحدات، وكل وحدة ٢-٨ دروس حسب الحجم).",
    "- نطاق [start,end] داخل [1, totalPages]، غير متداخل بين الدروس، ومرتب تصاعدياً.",
    "- code: \"U<n>\" للوحدة، \"U<n>.L<m>\" للدرس، \"U<n>.LAB<m>\" للمعمل، \"U<n>.TEST\" لاختبار الوحدة، \"FINAL\" للنهائي.",
    "- objective: جملة قصيرة (٨-٢٠ كلمة) لِما سيتعلمه الطالب.",
    "- دقة أرقام الصفحات أولوية قصوى: إذا تعذّر ربط درس بثقة فاربطه بأضيق تقدير ولا توسّع النطاق ليشمل الملزمة كلها.",
    "",
    "المعامل (labs) — التطبيق العملي:",
    "- إن احتوت الوحدة على تمارين/مسائل/أسئلة، أنشئ معملاً يشير إلى صفحات تلك التمارين مع hasExercises=true.",
    "- إن كانت الوحدة نظرية بلا تمارين، أنشئ معملاً واحداً hasExercises=false يشير إلى صفحات محتوى الوحدة.",
    "",
    "الاختبارات (exams) — تقييمية فقط (لا تكتب نص الأسئلة الآن، فقط المراجع والنطاقات):",
    "- لكل وحدة unitTest يشير إلى صفحات أسئلة المراجعة/نهاية الفصل إن وُجدت، وإلا صفحات محتوى الوحدة.",
    "- finalTest واحد يغطي الملزمة (sourcePages غالباً [1, totalPages]).",
    "",
    "التجميع (levels): ضع كل وحدة في مرحلة واحدة فقط ضمن مستوى واحد، وغطِّ كل الوحدات دون تكرار. للملازم الصغيرة: مستوى واحد ومرحلة واحدة تضم كل الوحدات.",
    "إن كان الملف أصغر من ٥ صفحات: وحدة واحدة ودرس واحد يغطي كل الصفحات وdepth=\"lessons\".",
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
    model: V4_CONTENT_GEN_MODEL,
    temperature: 0.3,
    maxOutputTokens: 8192,
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

  const tree = normalizeBookletTree(parsed, opts.totalPages);
  assertValidBookletTree(tree); // reject degenerate/garbage LLM output
  return tree;
}

// ─── Tree normalization / validation ────────────────────────────────────────
// Single entry point that turns a raw tree (fresh from the LLM OR an old
// flat {units:[]} tree read back from storage) into a canonical BookletTree:
//   - validates every page range (lessons keep the strict needsReview gate;
//     labs/exams clamp to the unit/booklet envelope since a slightly-off
//     practice range is acceptable but a missing lab/exam is not),
//   - guarantees ≥1 lab + a unit test per unit,
//   - builds a `levels` grouping that covers every unit exactly once
//     (sweeping any LLM-omitted units into a trailing stage),
//   - derives the booklet-wide final test,
//   - infers an adaptive `depth`.
// Idempotent: re-normalizing an already-canonical tree returns the same shape.
// Derive depth purely from the NORMALIZED structure so a malformed raw `depth`
// can never claim a hierarchy the grouping doesn't actually support.
function inferBookletDepth(levels: BookletLevelGroup[], units: BookletUnit[]): BookletDepth {
  if (levels.length > 1) return "levels";
  const maxStages = Math.max(0, ...levels.map((l) => l.stages.length));
  if (maxStages > 1) return "stages";
  if (units.length > 1) return "units";
  return "lessons";
}

export function normalizeBookletTree(raw: any, totalPages: number): BookletTree {
  const tp = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;

  function validatePages(rawP: any): { ok: true; pages: [number, number] } | { ok: false; reason: string } {
    if (!Array.isArray(rawP) || rawP.length < 2) return { ok: false, reason: "missing_pages" };
    const start = Number(rawP[0]);
    const end = Number(rawP[1]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return { ok: false, reason: "non_numeric_pages" };
    const s = Math.floor(start);
    const e = Math.floor(end);
    if (s < 1 || e < 1) return { ok: false, reason: "non_positive_pages" };
    if (s > tp || e > tp) return { ok: false, reason: "pages_out_of_range" };
    if (s > e) return { ok: false, reason: "inverted_pages" };
    return { ok: true, pages: [s, e] as [number, number] };
  }

  // Clamp a valid page range to a unit/booklet envelope. A practice/exam range
  // that drifts outside its unit is pulled back inside; a range with no overlap
  // at all falls back to the whole envelope (a slightly-off range is acceptable
  // but a lab/exam pointing at the wrong chapter is not).
  function clampToEnvelope(pages: [number, number], env: [number, number]): [number, number] {
    const lo = Math.max(pages[0], env[0]);
    const hi = Math.min(pages[1], env[1]);
    return lo > hi ? env : [lo, hi];
  }

  const rawUnits = Array.isArray(raw?.units) ? raw.units : [];

  // Canonicalize unit codes positionally so they are GLOBALLY UNIQUE even when
  // the LLM emits duplicates (e.g. two "U1"). Remember each LLM original code →
  // canonical mapping so the `levels` grouping (which references units by code)
  // can be translated through it below. First occurrence of a duplicate original
  // code wins the mapping; later dupes fall through to the uncovered sweep so
  // two distinct units are never conflated into one map/progress node.
  const origToCanon = new Map<string, string>();

  const cleanUnits: BookletUnit[] = rawUnits.map((u: any, ui: number) => {
    const code = `U${ui + 1}`;
    const origCode = u?.code != null ? String(u.code) : "";
    if (origCode && !origToCanon.has(origCode)) origToCanon.set(origCode, code);

    // Lessons — strict page-binding gate (citation integrity).
    const lessons = Array.isArray(u?.lessons) ? u.lessons : [];
    const cleanLessons: BookletLesson[] = lessons.map((l: any, li: number) => {
      const pageCheck = validatePages(l?.pages);
      const base: BookletLesson = {
        lessonIndex: Number.isInteger(l?.lessonIndex) ? l.lessonIndex : li + 1,
        // Derive codes positionally from the canonical unit code so they are
        // globally unique (the LLM's own lesson codes can collide across units).
        code: `${code}.L${li + 1}`,
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

    // Labs — clamp bad ranges to the unit envelope; guarantee ≥1 lab.
    const rawLabs = Array.isArray(u?.labs) ? u.labs : [];
    const cleanLabs: BookletLab[] = rawLabs.map((lab: any, ki: number) => {
      const pc = validatePages(lab?.pages);
      return {
        labIndex: Number.isInteger(lab?.labIndex) ? lab.labIndex : ki + 1,
        code: `${code}.LAB${ki + 1}`,
        title: String(lab?.title ?? `تطبيق عملي ${ki + 1}`).slice(0, 160),
        pages: pc.ok ? clampToEnvelope(pc.pages, upages) : upages,
        hasExercises: Boolean(lab?.hasExercises),
      };
    });
    if (!cleanLabs.length) {
      cleanLabs.push({ labIndex: 1, code: `${code}.LAB1`, title: "تطبيق عملي", pages: upages, hasExercises: false });
    }

    // Unit test (assessment-only; questions generated lazily on first attempt).
    let unitTest: BookletExamRef;
    const rawTest = u?.unitTest;
    if (rawTest && typeof rawTest === "object") {
      const pc = validatePages(rawTest?.sourcePages);
      unitTest = {
        code: `${code}.TEST`,
        title: String(rawTest?.title ?? `اختبار: ${String(u?.name ?? `الوحدة ${ui + 1}`)}`).slice(0, 160),
        scope: "unit",
        sourcePages: pc.ok ? clampToEnvelope(pc.pages, upages) : upages,
      };
    } else {
      unitTest = {
        code: `${code}.TEST`,
        title: `اختبار: ${String(u?.name ?? `الوحدة ${ui + 1}`)}`.slice(0, 160),
        scope: "unit",
        sourcePages: upages,
      };
    }

    return {
      unitIndex: Number.isInteger(u?.unitIndex) ? u.unitIndex : ui + 1,
      code,
      name: String(u?.name ?? `الوحدة ${ui + 1}`).slice(0, 160),
      pages: upages,
      lessons: cleanLessons.length ? cleanLessons : [{
        lessonIndex: 1,
        code: `${code}.L1`,
        name: String(u?.name ?? `الوحدة ${ui + 1}`).slice(0, 160),
        pages: upages,
        objective: "",
        needsReview: true,
        needsReviewReason: "unit_has_no_lessons",
      }],
      labs: cleanLabs,
      unitTest,
    };
  });

  // Levels grouping — every unit code must appear in exactly one stage.
  const unitCodeSet = new Set(cleanUnits.map((u) => u.code));
  const seen = new Set<string>();
  let levels: BookletLevelGroup[] = [];
  const rawLevels = Array.isArray(raw?.levels) ? raw.levels : [];
  if (rawLevels.length) {
    levels = rawLevels
      .map((lv: any, li: number) => {
        const stages = Array.isArray(lv?.stages) ? lv.stages : [];
        const cleanStages: BookletStageGroup[] = stages
          .map((st: any, si: number) => {
            const codes = (Array.isArray(st?.unitCodes) ? st.unitCodes : [])
              // Translate the LLM's original unit code → its canonical code, then
              // keep only real, not-yet-claimed units (dedupes + drops dangling).
              .map((c: any) => {
                const r = String(c);
                return origToCanon.get(r) ?? r;
              })
              .filter((c: string) => unitCodeSet.has(c) && !seen.has(c));
            codes.forEach((c: string) => seen.add(c));
            return {
              stageIndex: Number.isInteger(st?.stageIndex) ? st.stageIndex : si + 1,
              name: String(st?.name ?? `المرحلة ${si + 1}`).slice(0, 160),
              unitCodes: codes,
            };
          })
          .filter((s: BookletStageGroup) => s.unitCodes.length);
        return {
          levelIndex: Number.isInteger(lv?.levelIndex) ? lv.levelIndex : li + 1,
          name: String(lv?.name ?? `المستوى ${li + 1}`).slice(0, 160),
          stages: cleanStages,
        };
      })
      .filter((l: BookletLevelGroup) => l.stages.length);
  }
  // Sweep any uncovered units into a trailing stage so the map never drops one.
  const uncovered = cleanUnits.map((u) => u.code).filter((c) => !seen.has(c));
  if (uncovered.length) {
    if (!levels.length) {
      levels = [{ levelIndex: 1, name: "المستوى الأول", stages: [{ stageIndex: 1, name: "المحتوى", unitCodes: uncovered }] }];
    } else {
      const last = levels[levels.length - 1];
      last.stages.push({ stageIndex: last.stages.length + 1, name: "محتوى إضافي", unitCodes: uncovered });
    }
  }

  // Booklet-wide final test.
  let finalTest: BookletExamRef | null = null;
  const rawFinal = raw?.finalTest;
  if (rawFinal && typeof rawFinal === "object") {
    const pc = validatePages(rawFinal?.sourcePages);
    finalTest = {
      code: String(rawFinal?.code ?? "FINAL"),
      title: String(rawFinal?.title ?? "الاختبار النهائي").slice(0, 160),
      scope: "final",
      sourcePages: pc.ok ? pc.pages : [1, tp],
    };
  } else if (cleanUnits.length) {
    finalTest = { code: "FINAL", title: "الاختبار النهائي", scope: "final", sourcePages: [1, tp] };
  }

  const depth = inferBookletDepth(levels, cleanUnits);

  return { units: cleanUnits, levels, finalTest, depth };
}

// Post-normalization invariant gate for the GENERATION path only (read paths
// stay tolerant so old booklets always load). Throws on a degenerate tree that
// would teach nothing — a transient/garbage LLM response — so the upload is
// marked failed + refunded rather than persisting an unusable booklet.
export function assertValidBookletTree(tree: BookletTree): void {
  if (!Array.isArray(tree.units) || !tree.units.length) {
    throw new Error("booklet_tree_no_units");
  }
  const codes = tree.units.map((u) => u.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error("booklet_tree_duplicate_unit_codes");
  }
  const teachable = tree.units.some((u) => (u.lessons ?? []).some((l) => !l.needsReview));
  if (!teachable) {
    throw new Error("booklet_tree_no_bindable_lessons");
  }
  // Every unit must be claimed by exactly one stage (the normalizer guarantees
  // this via the uncovered sweep; assert it so a future change can't regress).
  const claimed = new Set<string>();
  for (const lv of tree.levels ?? []) {
    for (const st of lv.stages ?? []) {
      for (const c of st.unitCodes ?? []) claimed.add(c);
    }
  }
  if (codes.some((c) => !claimed.has(c))) {
    throw new Error("booklet_tree_unit_not_grouped");
  }
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
  if (!row) return null;
  // Normalize on read so old flat {units:[]} trees AND any pre-canonical tree
  // are upgraded to the current hierarchical shape — routes, the teach loop, the
  // map endpoint, and the FE all then see ONE canonical shape. Idempotent, so
  // re-normalizing an already-canonical tree is a no-op.
  const tree = (row as any).instructionTree;
  if (tree && typeof tree === "object" && Array.isArray(tree.units) && tree.units.length) {
    (row as any).instructionTree = normalizeBookletTree(tree, row.pagesCount || tree.units.length);
  }
  return row;
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
