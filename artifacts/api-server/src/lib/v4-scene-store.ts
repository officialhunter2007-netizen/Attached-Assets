/**
 * v4 Scene store — Claude-Sonnet-generated, disk-cached "actor story" scenes.
 *
 * Why this exists:
 *   The free `[[ANIM]]` mechanism (teacher emits raw HTML/CSS/JS that runs in
 *   a sandboxed iframe) produced weak, inconsistent, often confusing
 *   step-by-step "story between actors" animations (e.g. a social-engineering
 *   victim ↔ hacker exchange). We replace that dominant pattern with a
 *   STRUCTURED scene: the teaching model emits a lightweight `[[SCENE: …]]`
 *   marker describing the process; the FE lazily asks THIS module to turn the
 *   description into a validated step-by-step JSON via Claude Sonnet (through
 *   OpenRouter), then renders it in a polished React stepper we own
 *   (prev/next, autoplay, pause, rich Arabic per-step explanation, RTL).
 *
 * Cost control (mirrors teacher-image-store):
 *   - Each unique scene description is generated ONCE and persisted to
 *     `data/v4-scenes/<hash>.json`. Repeat views (any student) are free disk
 *     reads. In-flight de-duplication shares one Promise across concurrent
 *     identical requests so we never pay twice for the same scene.
 *   - Count-based background eviction keeps the cache bounded.
 *
 * Failure semantics:
 *   - Missing OPENROUTER_API_KEY → throws SceneGenerationError({reason:"unconfigured"}).
 *   - Generation/parse/validation failure → throws SceneGenerationError.
 *   The route maps these to a friendly JSON error; the FE then degrades to a
 *   plain text card (it never blocks the lesson).
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { generateGemini, GenerateGeminiError } from "./openrouter-generate";
import { robustJsonParse } from "./json-repair";
import { logger } from "./logger";

// ── Config ──────────────────────────────────────────────────────────────────
const CACHE_DIR =
  process.env.V4_SCENE_DIR ?? path.join(process.cwd(), "data", "v4-scenes");

/** Max cached scene files before background eviction trims to 75%. */
const CACHE_MAX_FILES = (() => {
  const raw = parseInt(process.env.V4_SCENE_MAX_FILES ?? "", 10);
  return Number.isFinite(raw) && raw >= 200 && raw <= 200_000 ? raw : 5_000;
})();

/**
 * The model that authors scenes. The user asked for Claude Sonnet via the
 * OpenRouter key. `generateGemini` passes any id containing "/" through to
 * OpenRouter unchanged, so we use the OpenRouter Anthropic slug. Overridable
 * via env so an operator can bump the version without a code change.
 */
const SCENE_MODEL = (process.env.SCENE_MODEL || "anthropic/claude-sonnet-4.5").trim();

const SCENE_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.V4_SCENE_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000 ? raw : 45_000;
})();

// ── Schema ────────────────────────────────────────────────────────────────
// A scene is a PROFESSIONAL, self-contained ANIMATED SVG illustration authored
// by Claude Sonnet, plus a short ordered caption track the student steps
// through. The SVG carries the actual "drawing" (the part that used to be a
// weak emoji row); `steps` carry the pedagogy (per-step Arabic explanation).
const SceneStepSchema = z.object({
  title: z.string().min(1).max(90),
  explanation: z.string().min(1).max(700),
  note: z.string().max(320).optional(),
});

export const SceneSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(220).optional(),
  /**
   * Self-contained animated SVG markup. MUST start with `<svg …>` and contain
   * no `<script>` and no external references — it is rendered inline after a
   * DOMPurify SVG-profile sanitize on the client, with a defensive server-side
   * strip in normalizeScene().
   */
  svg: z.string().min(40).max(60_000),
  steps: z.array(SceneStepSchema).min(2).max(10),
});

export type Scene = z.infer<typeof SceneSchema>;

// ── Error type ──────────────────────────────────────────────────────────────
export class SceneGenerationError extends Error {
  reason: "unconfigured" | "credits" | "transient" | "bad_output" | "internal" | "rate_limited";
  retryAfterSec?: number;
  constructor(message: string, reason: SceneGenerationError["reason"], retryAfterSec?: number) {
    super(message);
    this.name = "SceneGenerationError";
    this.reason = reason;
    this.retryAfterSec = retryAfterSec;
  }
}

// ── Per-user burst limiter (paid generation path only) ──────────────────────
// `/v4/scene` triggers a paid Claude-Sonnet call on every cache MISS. Auth +
// CSRF stop cross-site abuse, but an authenticated student could still spam
// unique topics and rack up real spend. This in-memory window blocks bursts up
// front. Cache hits and in-flight-dedup joiners are free and never consume a
// token — only a request that actually reaches the model does. Mirrors the
// variant limiter in routes/ai.ts.
const SCENE_RATE_WINDOW_MS = 60_000;
const SCENE_RATE_MAX_PER_WINDOW = (() => {
  const raw = parseInt(process.env.V4_SCENE_RATE_MAX ?? "", 10);
  return Number.isFinite(raw) && raw >= 1 && raw <= 120 ? raw : 8;
})();
const sceneRateMap = new Map<number, number[]>();
function consumeSceneRateToken(userId: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - SCENE_RATE_WINDOW_MS;
  const recent = (sceneRateMap.get(userId) || []).filter((t) => t > cutoff);
  if (recent.length >= SCENE_RATE_MAX_PER_WINDOW) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + SCENE_RATE_WINDOW_MS - now) / 1000));
    sceneRateMap.set(userId, recent);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  sceneRateMap.set(userId, recent);
  // Periodic GC so the map doesn't grow forever in long-running processes.
  if (sceneRateMap.size > 5000) {
    for (const [k, v] of sceneRateMap) {
      const fresh = v.filter((t) => t > cutoff);
      if (fresh.length === 0) sceneRateMap.delete(k);
      else sceneRateMap.set(k, fresh);
    }
  }
  return { ok: true };
}

// ── Cache helpers ───────────────────────────────────────────────────────────
let __dirEnsured = false;
async function ensureDir(): Promise<void> {
  if (__dirEnsured) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  __dirEnsured = true;
}

/**
 * Stable cache key from the normalized scene description PLUS the lesson
 * context. `lessonName` is fed to the generation prompt, so it must be part of
 * the cache identity — otherwise the same topic under two different lessons
 * could serve a context-stale scene. A NUL separator avoids field-boundary
 * collisions (e.g. "ab"+"c" vs "a"+"bc").
 */
function hashKey(topic: string, lessonName?: string): string {
  const basis = `${(lessonName || "").trim().toLowerCase()}\u0000${topic.trim().toLowerCase()}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 20);
}

function fileFor(hash: string): string {
  return path.join(CACHE_DIR, `${hash}.json`);
}

async function readCached(hash: string): Promise<Scene | null> {
  try {
    const raw = await fs.readFile(fileFor(hash), "utf8");
    const parsed = JSON.parse(raw);
    const validated = SceneSchema.safeParse(parsed);
    if (!validated.success) return null;
    // Refresh mtime so eviction treats recent reads as hot.
    const now = new Date();
    fs.utimes(fileFor(hash), now, now).catch(() => {});
    return validated.data;
  } catch {
    return null;
  }
}

async function writeCached(hash: string, scene: Scene): Promise<void> {
  await ensureDir();
  const file = fileFor(hash);
  const tmp = `${file}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(scene), "utf8");
    await fs.rename(tmp, file);
  } catch (err: any) {
    logger.warn(
      { message: err?.message || String(err), file },
      "v4-scene-store: failed to persist scene (continuing without cache)",
    );
  }
  maybeEvict().catch(() => {});
}

// ── Count-based background eviction ─────────────────────────────────────────
let __evicting = false;
async function maybeEvict(): Promise<void> {
  if (__evicting) return;
  __evicting = true;
  try {
    const entries = (await fs.readdir(CACHE_DIR)).filter((e) => e.endsWith(".json"));
    if (entries.length <= CACHE_MAX_FILES) return;
    const stats: Array<{ file: string; mtimeMs: number }> = [];
    for (const e of entries) {
      try {
        const full = path.join(CACHE_DIR, e);
        const s = await fs.stat(full);
        if (s.isFile()) stats.push({ file: full, mtimeMs: s.mtimeMs });
      } catch { /* skip */ }
    }
    const target = Math.floor(CACHE_MAX_FILES * 0.75);
    stats.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const toRemove = stats.length - target;
    let removed = 0;
    for (let i = 0; i < toRemove && i < stats.length; i++) {
      try { await fs.unlink(stats[i].file); removed++; } catch { /* skip */ }
    }
    if (removed > 0) {
      logger.info({ removed, remaining: stats.length - removed }, "v4-scene-store: eviction complete");
    }
  } catch (err: any) {
    logger.warn({ message: err?.message || String(err) }, "v4-scene-store: eviction failed");
  } finally {
    __evicting = false;
  }
}

// ── Prompt ──────────────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return [
    "أنت مصمّم رسوم معلوماتية متحرّكة محترف (Senior Motion / Infographic Designer) للمنصّة التعليمية اليمنية «نُخبة».",
    "مهمّتك: تحويل وصفِ مفهومٍ أو عمليةٍ تعليمية إلى **رسم SVG متحرّك احترافي** يشرح الفكرة بصرياً بدقّة ومنطق — وليس مجرّد رموز تعبيرية (emoji) أو فقاعات نص.",
    "النتيجة تُعرض داخل بطاقة عربية (RTL) في درس، مع شريط خطوات أسفلها (سابق/تالي/تشغيل تلقائي) يقرأه الطالب بالتوازي مع الرسم.",
    "",
    "أعِد **JSON فقط** (بدون أي نص خارج JSON، وبدون أسوار ```) بهذا الشكل بالضبط:",
    "{",
    '  "title": "عنوان قصير جذّاب",',
    '  "subtitle": "سطر واحد اختياري يلخّص الفكرة",',
    '  "svg": "<svg ...>…رسم متحرّك مكتفٍ ذاتياً…</svg>",',
    '  "steps": [',
    '    {"title":"عنوان الخطوة","explanation":"شرح عالي الجودة بجملتين إلى أربع جمل، عربية مبسّطة بنبرة يمنية ودودة، يفسّر ماذا يحدث ولماذا ويبرز الفكرة أو الخطر","note":"تنبيه اختياري قصير"}',
    "  ]",
    "}",
    "",
    "=== قواعد الرسم (svg) — هذا هو جوهر الجودة ===",
    "- ابدأ بـ `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 460\" ...>` واجعله **متجاوباً** (لا تضع width/height ثابتين بالبكسل؛ اكتفِ بـ viewBox). نسبة الأبعاد المفضّلة عريضة (مثل 800×460).",
    "- **مكتفٍ ذاتياً تماماً**: لا `<script>`، لا روابط خارجية، لا صور إنترنت، لا خطوط CDN، لا أي طلب شبكة. أشكال متجهة خالصة فقط (rect, circle, path, line, polygon, text, g).",
    "- **الحركة عبر SMIL داخل الـ SVG**: استخدم عناصر `<animate>` و`<animateTransform>` و`<animateMotion>` بـ `repeatCount=\"indefinite\"` لتدور الحركة باستمرار (تدفّق أسهم/حُزَم، ظهور تدريجي، نبض، انتقال). تجنّب الاعتماد على CSS keyframes (قد تُزال عند التعقيم) — اجعل الحركة الأساسية بـ SMIL.",
    "- **التصميم احترافي ومنطقي**: مثّل العناصر الحقيقية للمفهوم بأشكال واضحة (صناديق مُعنونة، عُقَد، طبقات، أسهم اتجاه، مكدّس، شبكة، خط زمني…) مرتّبة منطقياً تعكس العملية فعلاً. مسافات مريحة، محاذاة منتظمة، حواف دائرية، تباين جيّد.",
    "- **الثيم (إلزامي)**: خلفية داكنة شفّافة أو `#0d1117`، نص فاتح `#e9edf5`، واللونان الأساسيان ذهبي `#F59E0B` وزمرّدي `#10B981` للإبراز، ورمادي هادئ `#9aa4b2` للثانوي.",
    "- **كل النصوص داخل الرسم بالعربية** وبخط واضح: `font-family=\"Tajawal, Cairo, sans-serif\"`، واضبط الاتجاه `direction=\"rtl\"` و`text-anchor` المناسب حتى تظهر التسميات صحيحة. ضع تسمية عربية على كل عنصر أو خطوة مهمّة بحيث يُفهَم الرسم وحده.",
    "- اجعله **توضيحياً لا زخرفياً**: كل شكل وكل حركة يجب أن يحمل معنى تعليمياً يخدم فهم المفهوم.",
    "- أبقِه نظيفاً ومتقَناً (عشرات العناصر لا مئات) وبلا أخطاء في صيغة XML — سيُعرَض كما هو.",
    "",
    "=== قواعد الخطوات (steps) ===",
    "- عدد الخطوات بين 3 و 7 (لا تتجاوز 10)، مرتّبة منطقياً من البداية حتى النتيجة، وتشرح ما يجري في الرسم بلغة الطالب.",
    "- explanation دقيق وتعليمي ومحدّد (لا عبارات عامة)، يُبرز «لماذا» و«ما الفائدة/الخطر» حين يناسب. كل النصوص عربية فصحى مبسّطة بنبرة يمنية ودودة.",
    "",
    "التزم تماماً ببنية JSON أعلاه ولا تُضِف حقولاً غير معرّفة. الأولوية القصوى: رسم SVG **احترافي ومنطقي وواضح** — لا شيء ضعيف أو طفولي.",
  ].join("\n");
}

function buildUserPrompt(topic: string, lessonName?: string): string {
  const ctx = lessonName ? `سياق الدرس: «${lessonName}».\n` : "";
  return `${ctx}صمّم رسم SVG متحرّكاً احترافياً يشرح ما يلي بوضوح ومنطق، مع شريط خطوات مرافق، والتزم تماماً ببنية JSON المطلوبة:\n\n«${topic.trim()}»`;
}

// ── Normalization ───────────────────────────────────────────────────────────
/**
 * Defensively strip anything unsafe or non-renderable from the model's SVG
 * before we persist/serve it. The client DOMPurify (SVG profile) is the real
 * security boundary; this is belt-and-suspenders + cleans up common model
 * wrapping (code fences, stray prose) so the inline render is crisp.
 */
function sanitizeSvgServer(raw: string): string {
  let s = (raw || "").trim();
  // Unwrap accidental code fences.
  s = s.replace(/^```(?:svg|xml|html)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Keep only the <svg>…</svg> span (drop any prose the model leaked around it).
  const lower = s.toLowerCase();
  const start = lower.indexOf("<svg");
  const end = lower.lastIndexOf("</svg>");
  if (start >= 0 && end > start) s = s.slice(start, end + "</svg>".length);
  // Remove scripts, inline event handlers (any quoting), and ALL href/xlink:href
  // attributes (the client also forbids them — an animated attribute then has no
  // navigable/fetchable target). The client DOMPurify SVG profile remains the
  // real security boundary; this just keeps the cached payload clean.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/\s(?:xlink:href|href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Neutralize dangerous URL schemes anywhere (e.g. an animated `to="javascript:…"`
  // the attribute strip above can't see). Belt-and-suspenders only.
  s = s.replace(/javascript:/gi, "blocked:").replace(/data:text\/html/gi, "blocked:");
  return s.trim();
}

function normalizeScene(scene: Scene): Scene {
  return { ...scene, svg: sanitizeSvgServer(scene.svg) };
}

// ── Public API ──────────────────────────────────────────────────────────────
const inflight = new Map<string, Promise<Scene>>();

export type GenerateSceneOptions = {
  lessonName?: string;
  /** When provided, enforces the per-user burst limit on the paid miss path. */
  userId?: number;
  signal?: AbortSignal;
};

/**
 * Returns a validated Scene for `topic`, generating via Claude Sonnet on a
 * cache miss and persisting the result. Throws SceneGenerationError on any
 * failure (the caller maps it to a friendly response).
 */
export async function generateScene(
  topic: string,
  options: GenerateSceneOptions = {},
): Promise<Scene> {
  const clean = (topic || "").trim().slice(0, 1200);
  if (clean.length < 3) {
    throw new SceneGenerationError("scene topic too short", "internal");
  }
  const hash = hashKey(clean, options.lessonName);

  // 1. Disk cache (free).
  await ensureDir();
  const cached = await readCached(hash);
  if (cached) return cached;

  // 2. In-flight de-duplication — concurrent identical requests share one
  //    Promise, so they neither pay twice nor each consume a rate token.
  const existing = inflight.get(hash);
  if (existing) return existing;

  // 3. Paid path from here — enforce the per-user burst limit BEFORE the model
  //    call. Placed after the cache + in-flight checks so only genuine misses
  //    count against the quota.
  if (typeof options.userId === "number") {
    const rl = consumeSceneRateToken(options.userId);
    if (!rl.ok) {
      throw new SceneGenerationError("scene rate limit exceeded", "rate_limited", rl.retryAfterSec);
    }
  }

  const job = (async (): Promise<Scene> => {
    let result;
    try {
      result = await generateGemini({
        systemPrompt: buildSystemPrompt(),
        userParts: [{ type: "text", text: buildUserPrompt(clean, options.lessonName) }],
        model: SCENE_MODEL,
        temperature: 0.55,
        maxOutputTokens: 6500,
        jsonMode: false, // Anthropic-on-OpenRouter: rely on prompt + robust parse.
        timeoutMs: SCENE_TIMEOUT_MS,
        signal: options.signal,
        logTag: "v4-scene",
      });
    } catch (err: any) {
      if (err instanceof GenerateGeminiError) {
        if (err.unconfigured) throw new SceneGenerationError("OPENROUTER_API_KEY missing", "unconfigured");
        if (err.creditsExhausted) throw new SceneGenerationError("openrouter credits exhausted", "credits");
        if (err.badOutput) throw new SceneGenerationError("model returned blocked/empty output", "bad_output");
        throw new SceneGenerationError(`openrouter error (status ${err.status})`, "transient");
      }
      throw new SceneGenerationError(String(err?.message ?? err).slice(0, 200), "internal");
    }

    const parsed = robustJsonParse(result.text, "v4-scene");
    if (!parsed) {
      throw new SceneGenerationError("could not parse scene JSON from model output", "bad_output");
    }
    const validated = SceneSchema.safeParse(parsed);
    if (!validated.success) {
      logger.warn(
        { issues: validated.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`) },
        "v4-scene-store: model output failed schema validation",
      );
      throw new SceneGenerationError("scene JSON failed schema validation", "bad_output");
    }

    const scene = normalizeScene(validated.data);
    // Post-sanitize guard: if cleaning left an empty/invalid SVG, treat it as
    // bad output rather than caching a scene that renders the "تعذّر عرض الرسم"
    // fallback forever.
    if (!scene.svg || scene.svg.length < 40 || !/<svg[\s>]/i.test(scene.svg)) {
      throw new SceneGenerationError("scene SVG empty/invalid after sanitize", "bad_output");
    }
    await writeCached(hash, scene);
    return scene;
  })();

  inflight.set(hash, job);
  try {
    return await job;
  } finally {
    inflight.delete(hash);
  }
}
