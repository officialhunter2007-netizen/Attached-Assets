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
const SCENE_MODEL = (process.env.SCENE_MODEL || "anthropic/claude-sonnet-4-5").trim();

const SCENE_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.V4_SCENE_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000 ? raw : 70_000;
})();

// ── Schema ────────────────────────────────────────────────────────────────
// A scene is a PROFESSIONAL, self-contained ANIMATED HTML/CSS/JS motion graphic
// authored by Claude Sonnet, plus a short ordered caption track the student
// steps through. The `html` carries the actual moving illustration (smooth,
// video-like — far richer than the old SMIL-SVG); `steps` carry the pedagogy
// (per-step Arabic explanation).
const SceneStepSchema = z.object({
  title: z.string().min(1).max(90),
  explanation: z.string().min(1).max(700),
  note: z.string().max(320).optional(),
});

export const SceneSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(220).optional(),
  /**
   * Self-contained body-only HTML/CSS/JS animation markup (no DOCTYPE/html/
   * head/body wrappers — the FE wraps it in a themed document). It is rendered
   * inside a sandboxed `<iframe srcdoc>` (allow-scripts, NO allow-same-origin),
   * so the untrusted markup runs at an opaque origin and cannot touch cookies,
   * storage, or the parent DOM. Isolation — not sanitization — is the security
   * boundary, which is why JS animation is allowed here (unlike inline SVG).
   */
  html: z.string().min(40).max(90_000),
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
 * Bump this whenever the generation PROMPT/quality changes. Prompt-only changes
 * do NOT change a scene's shape, so already-cached disk files (and the FE's
 * module cache, which mirrors this version) would otherwise serve the OLD scene
 * forever. Bumping the version changes every hash → guaranteed regeneration of
 * every topic with the new prompt. Keep this in sync with SCENE_CACHE_VERSION in
 * the FE `scene-stepper.tsx`.
 */
const SCENE_PROMPT_VERSION = "2";

/**
 * Stable cache key from the normalized scene description PLUS the lesson
 * context. `lessonName` is fed to the generation prompt, so it must be part of
 * the cache identity — otherwise the same topic under two different lessons
 * could serve a context-stale scene. A NUL separator avoids field-boundary
 * collisions (e.g. "ab"+"c" vs "a"+"bc"). The prompt version is prefixed so a
 * prompt change invalidates the whole cache.
 */
function hashKey(topic: string, lessonName?: string): string {
  const basis = `${SCENE_PROMPT_VERSION}\u0000${(lessonName || "").trim().toLowerCase()}\u0000${topic.trim().toLowerCase()}`;
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
//
// A complete, runnable GOLD-STANDARD example. Few-shot anchoring is the single
// biggest quality lever: without a concrete target the model improvises sparse,
// motionless layouts (a couple of static labelled boxes on an empty grid). This
// example demonstrates everything we want — a full stage, ≥3 meaningful labelled
// elements, an OBVIOUS continuous looping motion (a packet traveling the wire),
// brand colours, glow on the active actor, and visual storytelling that reads
// even with the sound off.
const GOLD_EXAMPLE_HTML = [
  '<div class="sc">',
  '  <h3 class="sc-ttl">رحلة الرسالة عبر الإنترنت</h3>',
  '  <div class="sc-row">',
  '    <div class="sc-box dev"><span class="sc-ico">💻</span><span class="sc-lbl">جهازك</span></div>',
  '    <div class="sc-wire"><span class="sc-dot"></span><span class="sc-pkt">📨</span></div>',
  '    <div class="sc-box srv"><span class="sc-ico">🗄️</span><span class="sc-lbl">الخادم</span></div>',
  '  </div>',
  '  <div class="sc-cap">البيانات تسافر ذهاباً وإياباً عبر الشبكة</div>',
  '</div>',
  '<style>',
  '  .sc{display:flex;flex-direction:column;align-items:center;gap:20px;padding:24px 14px;}',
  '  .sc-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
  '  .sc-row{display:flex;align-items:center;gap:10px;width:min(470px,94%);}',
  '  .sc-box{display:flex;flex-direction:column;align-items:center;gap:8px;flex:0 0 auto;}',
  '  .sc-ico{width:68px;height:68px;border-radius:18px;display:grid;place-items:center;font-size:32px;background:#141a24;border:2px solid #2a3242;transition:box-shadow .4s;}',
  '  .dev .sc-ico{border-color:#10B981;box-shadow:0 0 20px rgba(16,185,129,.5);}',
  '  .srv .sc-ico{border-color:#F59E0B;box-shadow:0 0 20px rgba(245,158,11,.5);}',
  '  .sc-lbl{font-size:14px;font-weight:700;color:#e9edf5;}',
  '  .sc-wire{position:relative;flex:1 1 auto;height:4px;border-radius:4px;background:linear-gradient(90deg,#10B981,#F59E0B);opacity:.5;}',
  '  .sc-dot{position:absolute;top:50%;right:0;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff;animation:sc-go 3.4s ease-in-out infinite;}',
  '  .sc-pkt{position:absolute;top:-26px;right:0;font-size:24px;animation:sc-go 3.4s ease-in-out infinite;}',
  '  .sc-cap{font-size:13px;color:#9aa4b2;}',
  '  @keyframes sc-go{0%{right:0;opacity:0;}10%{opacity:1;}48%{right:calc(100% - 14px);opacity:1;}60%{right:calc(100% - 14px);opacity:1;}98%{right:0;opacity:0;}100%{right:0;opacity:0;}}',
  '</style>',
].join("\n");

function buildSystemPrompt(): string {
  return [
    "أنت مخرج موشن جرافيك تعليمي محترف للمنصّة اليمنية «نُخبة». مهمّتك أن تصنع **رسماً متحرّكاً واضحاً يشرح الفكرة بصرياً من أول نظرة**، مصحوباً بقصّة قصيرة بلهجة يمنية بسيطة. الطالب يجب أن يفهم الفكرة من الحركة وحدها حتى لو لم يقرأ.",
    "",
    "=== أخطاء قاتلة — ممنوع منعاً باتّاً (هذا أهمّ جزء) ===",
    "احذر من إنتاج مشهد ضعيف. تجنّب تماماً هذه الأخطاء التي تجعل الرسم بلا فائدة:",
    "- ✗ **مشهد فارغ**: مربّعان ساكنان وسط مساحة فاضية كبيرة بلا حركة. هذا فشل تامّ.",
    "- ✗ **بلا حركة واضحة**: عناصر تظهر فقط دون أن يتحرّك شيء يحكي العملية. لا بدّ من حركة واضحة ومستمرّة (شيء يسافر، يتحوّل، يتدفّق، يكبر، يتغيّر لونه…).",
    "- ✗ **رموز مجرّدة غامضة**: مربّعات بلا معنى بدل أيقونات/أشكال معبّرة. كل عنصر يجب أن يُفهَم فوراً.",
    "- ✗ **مساحة مهدورة**: اجعل الرسم يملأ عرض المسرح بشكل متوازن ومُركَّز، بلا فراغات كبيرة ميّتة.",
    "",
    "=== المواصفات الإلزامية للرسم المتحرّك ===",
    "- **حركة مستمرّة وواضحة في حلقة (loop) لا تتوقّف**: تبدأ فور التحميل وتتكرّر. هذه أهمّ صفة — الحركة هي التي تشرح. استخدم `@keyframes`/`transition` مع `ease-in-out`، أو `requestAnimationFrame`/Canvas.",
    "- **٣ إلى ٥ عناصر معبّرة معنونة بالعربية على الأقل**، كلٌّ بدوره الواضح في القصّة (مرسِل، مستقبِل، بيانات، خطوة…). استخدم أيقونات رمزية (emoji أو أشكال SVG/CSS بسيطة) لجعل كل عنصر مفهوماً بنظرة.",
    "- **سرد بصري متدرّج**: تتحرّك العناصر بنفس تسلسل الـ steps، فيرى الطالب القصّة تتحرّك أمامه: بداية ← تطوّر ← نتيجة.",
    "- **تشبيه ملموس من الحياة**: فضّل تمثيل الفكرة بشيء واقعي (رسالة تسافر، ماء يجري، مفتاح يفتح قفلاً، صندوق يُملأ…) على الرموز المجرّدة.",
    "- **املأ المسرح**: المسرح أفقي عريض؛ وزّع العناصر لتملأ العرض (مثلاً صفّ أفقي ممتدّ)، مع مسافات مريحة لا فراغ ميّت.",
    "",
    "=== هذا مثال ذهبي كامل — اقتدِ بمستواه (ولا تنسخه حرفياً) ===",
    "لاحظ فيه: مسرح ممتلئ، ٣ عناصر معنونة بأيقونات، حركة واضحة مستمرّة (نقطة بيانات تسافر على السلك ذهاباً وإياباً)، ألوان الثيم، وتوهّج على العنصر الفاعل:",
    "```html",
    GOLD_EXAMPLE_HTML,
    "```",
    "اصنع رسماً بنفس هذا المستوى من الوضوح والحركة والامتلاء، لكن مصمّماً خصّيصاً للفكرة المطلوبة منك.",
    "",
    "=== القيود التقنية للرسم (html) ===",
    "- اكتب **محتوى الجسم فقط**: عناصر HTML و`<style>` و`<script>`. بلا `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` — النظام يغلّفها.",
    "- **مكتفٍ ذاتياً تماماً**: لا روابط خارجية، لا صور إنترنت، لا CDN، لا خطوط خارجية، ولا أيّ طلب شبكة (البيئة معزولة). HTML/CSS/SVG/Canvas/JS خالصة فقط. (الإيموجي مسموح كأيقونات.)",
    "- **الثيم (إلزامي)**: خلفية شفّافة، نص فاتح `#e9edf5`، ذهبي `#F59E0B` وزمرّدي `#10B981` للإبراز، رمادي `#9aa4b2` للثانوي. بطاقات بحواف دائرية، ظلال خفيفة، وتوهّج لطيف على العنصر الفاعل.",
    "- **كل النصوص داخل الرسم بالعربية**، اتجاه RTL، خط `Tajawal, Cairo, sans-serif`، بحجم مقروء. تسمية عربية مختصرة على كل عنصر مهمّ.",
    "- **المقاس**: العرض 100% تلقائياً؛ الارتفاع المنطقي بين ~260 و ~430 بكسل. بلا `position:fixed`، بلا نوافذ منبثقة، بلا تمرير (scroll).",
    "- كود نظيف متقَن بلا أخطاء — يُنفَّذ كما هو داخل إطار معزول.",
    "",
    "=== النصوص (steps) ===",
    "- عدد الخطوات بين 3 و 5، مرتّبة كقصّة (بداية ← تطوّر ← نتيجة) تقود الطالب بيده.",
    "- كل `explanation` **جملة أو جملتان قصيرتان فقط** بلهجة يمنية بسيطة ودودة، تشرحان ما يتحرّك على الشاشة في تلك اللحظة بالضبط ولماذا — بلا حشو ولا مصطلحات معقّدة. كل خطوة تطابق لحظة في الحركة.",
    "",
    "=== صيغة الإخراج ===",
    "أعِد **JSON فقط** (بدون أيّ نص خارجه، وبدون أسوار ```) بهذا الشكل بالضبط:",
    "{",
    '  "title": "عنوان قصير واضح يلخّص القصّة",',
    '  "subtitle": "سطر واحد يوضّح الفكرة بكلمات بسيطة",',
    '  "html": "…محتوى الجسم: HTML + <style> + <script> لرسمٍ متحرّك مكتفٍ ذاتياً بحركة واضحة مستمرّة…",',
    '  "steps": [',
    '    {"title":"عنوان قصير للخطوة","explanation":"جملة أو جملتان قصيرتان بلهجة يمنية بسيطة تشرحان ما يحدث الآن في المشهد ولماذا","note":"تنبيه اختياري قصير جداً"}',
    "  ]",
    "}",
    "لا تُضِف حقولاً غير معرّفة. الأولوية: (١) حركة واضحة مستمرّة تشرح الفكرة، (٢) مسرح ممتلئ بعناصر معبّرة معنونة، (٣) نصوص يمنية قصيرة راقية متطابقة مع الحركة.",
  ].join("\n");
}

function buildUserPrompt(topic: string, lessonName?: string): string {
  const ctx = lessonName ? `سياق الدرس: «${lessonName}».\n` : "";
  return `${ctx}صمّم رسماً متحرّكاً تعليمياً بمستوى المثال الذهبي: **مسرح ممتلئ، عناصر معبّرة معنونة بالعربية، وحركة واضحة مستمرّة تشرح الفكرة بصرياً من أول نظرة** — احذر المشهد الفارغ الساكن. أرفِق شريط خطوات بنصوص يمنية قصيرة متطابقة مع الحركة. التزم تماماً ببنية JSON المطلوبة. الفكرة المطلوب شرحها:\n\n«${topic.trim()}»`;
}

// ── Normalization ───────────────────────────────────────────────────────────
/**
 * Clean up the model's body-only HTML/CSS/JS before we persist/serve it.
 *
 * IMPORTANT: this is NOT a security sanitizer. The animation is rendered inside
 * a sandboxed `<iframe srcdoc>` (allow-scripts, NO allow-same-origin) — the
 * opaque origin is the real security boundary, exactly like the existing ANIM
 * path. We deliberately KEEP `<script>` and CSS animation (that is the whole
 * point — smooth JS/CSS motion the old inline-SVG path couldn't do). This
 * function only unwraps common model wrapping (code fences, a full-document
 * shell, stray prose) so the iframe renders cleanly.
 */
function sanitizeAnimHtml(raw: string): string {
  let s = (raw || "").trim();
  // Unwrap accidental code fences.
  s = s.replace(/^```(?:html|xml|svg)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // If the model leaked a full document despite instructions, keep only the
  // <body> inner content.
  const bodyOpen = s.match(/<body[^>]*>/i);
  if (bodyOpen) {
    const startIdx = s.toLowerCase().indexOf(bodyOpen[0].toLowerCase()) + bodyOpen[0].length;
    const endIdx = s.toLowerCase().lastIndexOf("</body>");
    if (endIdx > startIdx) s = s.slice(startIdx, endIdx);
  }
  // Strip any DOCTYPE / <html> / <head> wrappers that survived (we re-wrap on FE).
  s = s
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "");
  return s.trim();
}

function normalizeScene(scene: Scene): Scene {
  return { ...scene, html: sanitizeAnimHtml(scene.html) };
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
        temperature: 0.5,
        maxOutputTokens: 9000,
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
    // Post-clean guard: if unwrapping left empty/no-markup HTML, treat it as
    // bad output rather than caching a scene that renders the "تعذّر عرض الرسم"
    // fallback forever.
    if (!scene.html || scene.html.length < 40 || !/<[a-z]/i.test(scene.html)) {
      throw new SceneGenerationError("scene HTML empty/invalid after clean", "bad_output");
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
