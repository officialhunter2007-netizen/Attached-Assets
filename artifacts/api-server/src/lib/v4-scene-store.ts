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
import { canAffordV4Turn, chargeV4Ai, refundV4Ai, resolveRebillKey } from "./v4-gem-wallet";

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

/**
 * Fixed USD cost basis for ONE scene generation (a Claude Sonnet call). The
 * student wallet is debited `usdToGems(SCENE_USD)` via the admin-configured
 * rate; mirrors the fixed-estimate model used by the other non-stream paid
 * surfaces (hands-on, lab, exam). Overridable via env for ops tuning.
 */
const SCENE_USD = (() => {
  const raw = parseFloat(process.env.V4_SCENE_USD ?? "");
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.05;
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
  reason: "unconfigured" | "credits" | "transient" | "bad_output" | "internal" | "rate_limited" | "insufficient";
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
const SCENE_PROMPT_VERSION = "3";

/**
 * Cheap classifier model used ONLY to pick a visual archetype before the real
 * (expensive) Sonnet generation call. Flash Lite is fast/near-free; a wrong
 * guess just means a slightly less-ideal (but still valid) gold example, so
 * this never needs to be perfect.
 */
const SCENE_CLASSIFIER_MODEL = "gemini-2.5-flash-lite";

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
// Visual archetypes. The single biggest reason generated scenes converged on
// one repetitive "box—wire—box" look (real user feedback) is that only ONE
// gold example existed, and it WAS that motif — every topic got anchored to
// it regardless of fit (a cycle, a tree, a comparison, a ledger all got
// flattened into "two boxes and a traveling dot"). Fix: classify the topic
// into one of these archetypes first (cheap Flash-Lite call), then hand the
// Sonnet generation call ONLY the matching gold example, so the model
// anchors on a structurally-appropriate template instead of the one it
// always saw before.
type SceneArchetype =
  | "linear_flow"
  | "cycle"
  | "hierarchy"
  | "comparison"
  | "timeline"
  | "accumulation";

const ARCHETYPE_DESCRIPTIONS: Record<SceneArchetype, string> = {
  linear_flow:
    "تدفّق خطّي بين طرفين — بيانات/رسالة/طلب ينتقل من نقطة إلى أخرى عبر مسار واضح (شبكات، هجمات إلكترونية، طلب/استجابة، معالجة تسلسلية).",
  cycle:
    "دورة متكرّرة تعود لنقطة البداية — خطوات مرتّبة في حلقة (دورة حياة، عملية متكرّرة، تغذية راجعة، حلقة تكرار برمجية).",
  hierarchy:
    "هيكلية أو شجرة — عنصر رئيسي يتفرّع إلى عناصر فرعية بمستويات (تصنيف، تركيب نظام، شجرة قرار، هيكل تنظيمي، بنية بيانات شجرية).",
  comparison:
    "مقارنة بين شيئين أو حالتين جنباً إلى جنب — قبل/بعد، خيار أ/خيار ب، صحيح/خطأ، طريقة قديمة/طريقة جديدة.",
  timeline:
    "خطّ زمني أو تسلسل حالات متتابعة — عدّة محطّات مرقّمة بترتيب زمني واضح من البداية للنهاية (وليس طرفين فقط).",
  accumulation:
    "تراكم أو تجميع — كمية أو رصيد يزيد أو ينقص تدريجياً أمام عين الطالب (أرصدة محاسبية، عدّادات، شريط تعبئة، مخزون).",
};

const ARCHETYPE_KEYS = Object.keys(ARCHETYPE_DESCRIPTIONS) as SceneArchetype[];
const DEFAULT_ARCHETYPE: SceneArchetype = "linear_flow";

// A small reusable inline-SVG icon set the model MAY copy/adapt instead of
// leaning on emoji alone (emoji renders inconsistently across platforms and
// reads as "childish" — repeated real-user feedback). All paths use
// `currentColor` / `stroke` so they inherit whatever brand colour is applied
// via CSS `color`. Fully self-contained (no external font/icon CDN).
const ICON_KIT_SNIPPET = [
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/></svg> <!-- شخص/مستخدم -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> <!-- قفل -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="17" r="1"/></svg> <!-- خادم/سيرفر -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> <!-- بريد/رسالة -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 9h3.2a1.8 1.8 0 0 1 0 3.6H9m0 0h3.5a1.8 1.8 0 0 1 0 3.6H9m3-9v9"/></svg> <!-- عملة/مال -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg> <!-- صح -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg> <!-- خطأ -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/></svg> <!-- مستند/ملف -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg> <!-- درع/حماية -->',
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 18h7.6M12 14V6m0 0l-3 3m3-3l3 3"/></svg> <!-- شجرة/تفرّع مبسّط -->',
].join("\n");

// A complete, runnable GOLD-STANDARD example PER ARCHETYPE. Few-shot anchoring
// is the single biggest quality lever: without a concrete target the model
// improvises sparse, motionless layouts. Each example demonstrates a full
// stage, ≥3 meaningful labelled elements, an OBVIOUS continuous looping
// motion appropriate to ITS structure, brand colours, and glow on the active
// actor. Only ONE of these is inlined into any given generation call.
const GOLD_EXAMPLES: Record<SceneArchetype, string> = {
  linear_flow: [
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
  ].join("\n"),
  cycle: [
    '<div class="cy">',
    '  <h3 class="cy-ttl">دورة معالجة الطلب</h3>',
    '  <div class="cy-stage">',
    '    <div class="cy-node n1"><span class="cy-ico">📥</span><span class="cy-lbl">استقبال</span></div>',
    '    <div class="cy-node n2"><span class="cy-ico">⚙️</span><span class="cy-lbl">معالجة</span></div>',
    '    <div class="cy-node n3"><span class="cy-ico">✅</span><span class="cy-lbl">تحقّق</span></div>',
    '    <div class="cy-node n4"><span class="cy-ico">📤</span><span class="cy-lbl">إرسال</span></div>',
    '    <div class="cy-orbit"></div>',
    '  </div>',
    '  <div class="cy-cap">العملية تتكرّر تلقائياً من جديد كل دورة</div>',
    '</div>',
    '<style>',
    '  .cy{display:flex;flex-direction:column;align-items:center;gap:18px;padding:22px 14px;}',
    '  .cy-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
    '  .cy-stage{position:relative;width:220px;height:220px;}',
    '  .cy-node{position:absolute;display:flex;flex-direction:column;align-items:center;gap:6px;width:76px;}',
    '  .cy-ico{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:#141a24;border:2px solid #2a3242;}',
    '  .cy-lbl{font-size:12px;font-weight:700;color:#e9edf5;}',
    '  .n1{top:0;left:50%;transform:translateX(-50%);}',
    '  .n2{top:50%;right:0;transform:translateY(-50%);}',
    '  .n3{bottom:0;left:50%;transform:translateX(-50%);}',
    '  .n4{top:50%;left:0;transform:translateY(-50%);}',
    '  .n1 .cy-ico{border-color:#10B981;} .n3 .cy-ico{border-color:#F59E0B;}',
    '  .cy-orbit{position:absolute;top:50%;left:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;box-shadow:0 0 16px #fff;animation:cy-go 4.8s linear infinite;transform-origin:8px 90px;}',
    '  @keyframes cy-go{from{transform:rotate(0deg) translateY(-90px) rotate(0deg);}to{transform:rotate(360deg) translateY(-90px) rotate(-360deg);}}',
    '  .cy-cap{font-size:13px;color:#9aa4b2;}',
    '</style>',
  ].join("\n"),
  hierarchy: [
    '<div class="hi">',
    '  <h3 class="hi-ttl">هيكل الصلاحيات</h3>',
    '  <div class="hi-tree">',
    '    <div class="hi-row"><div class="hi-node root"><span class="hi-ico">👑</span><span class="hi-lbl">المدير</span></div></div>',
    '    <div class="hi-lines"><span></span><span></span></div>',
    '    <div class="hi-row two">',
    '      <div class="hi-node c1"><span class="hi-ico">👤</span><span class="hi-lbl">مشرف</span></div>',
    '      <div class="hi-node c2"><span class="hi-ico">👤</span><span class="hi-lbl">موظّف</span></div>',
    '    </div>',
    '  </div>',
    '  <div class="hi-cap">الصلاحية تنزل من الأعلى إلى الأسفل عبر المستويات</div>',
    '</div>',
    '<style>',
    '  .hi{display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 14px;}',
    '  .hi-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
    '  .hi-row{display:flex;justify-content:center;gap:34px;}',
    '  .hi-node{display:flex;flex-direction:column;align-items:center;gap:6px;}',
    '  .hi-ico{width:56px;height:56px;border-radius:14px;display:grid;place-items:center;font-size:26px;background:#141a24;border:2px solid #2a3242;transition:box-shadow .5s;}',
    '  .hi-lbl{font-size:13px;font-weight:700;color:#e9edf5;}',
    '  .root .hi-ico{border-color:#F59E0B;animation:hi-pulse 3s ease-in-out infinite;}',
    '  .c1 .hi-ico{border-color:#10B981;animation:hi-pulse 3s ease-in-out infinite .5s;}',
    '  .c2 .hi-ico{border-color:#10B981;animation:hi-pulse 3s ease-in-out infinite 1s;}',
    '  .hi-lines{width:2px;height:26px;background:#2a3242;margin:0 auto;position:relative;}',
    '  @keyframes hi-pulse{0%,100%{box-shadow:0 0 0 rgba(245,158,11,0);}50%{box-shadow:0 0 20px rgba(245,158,11,.6);}}',
    '  .hi-cap{font-size:13px;color:#9aa4b2;}',
    '</style>',
  ].join("\n"),
  comparison: [
    '<div class="cp">',
    '  <h3 class="cp-ttl">كلمة مرور ضعيفة مقابل قوية</h3>',
    '  <div class="cp-row">',
    '    <div class="cp-col bad"><span class="cp-ico">❌</span><span class="cp-lbl">123456</span><span class="cp-sub">تُخترق فوراً</span></div>',
    '    <div class="cp-vs">VS</div>',
    '    <div class="cp-col good"><span class="cp-ico">✅</span><span class="cp-lbl">Yem$en24!k</span><span class="cp-sub">آمنة</span></div>',
    '  </div>',
    '  <div class="cp-cap">قارن بين الجانبين وشوف الفرق في النتيجة</div>',
    '</div>',
    '<style>',
    '  .cp{display:flex;flex-direction:column;align-items:center;gap:18px;padding:22px 14px;}',
    '  .cp-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
    '  .cp-row{display:flex;align-items:center;gap:16px;width:min(480px,96%);}',
    '  .cp-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 10px;border-radius:16px;background:#141a24;border:2px solid #2a3242;transition:box-shadow .6s,border-color .6s;}',
    '  .cp-ico{font-size:26px;}',
    '  .cp-lbl{font-size:15px;font-weight:800;color:#e9edf5;}',
    '  .cp-sub{font-size:11px;color:#9aa4b2;}',
    '  .cp-vs{font-weight:900;color:#9aa4b2;}',
    '  .bad{animation:cp-glow-bad 3.2s ease-in-out infinite;}',
    '  .good{animation:cp-glow-good 3.2s ease-in-out infinite 1.6s;}',
    '  @keyframes cp-glow-bad{0%,40%,100%{border-color:#2a3242;box-shadow:none;}15%{border-color:#ef4444;box-shadow:0 0 22px rgba(239,68,68,.5);}}',
    '  @keyframes cp-glow-good{0%,40%,100%{border-color:#2a3242;box-shadow:none;}15%{border-color:#10B981;box-shadow:0 0 22px rgba(16,185,129,.5);}}',
    '  .cp-cap{font-size:13px;color:#9aa4b2;}',
    '</style>',
  ].join("\n"),
  timeline: [
    '<div class="tl">',
    '  <h3 class="tl-ttl">مراحل معالجة الطلب</h3>',
    '  <div class="tl-track">',
    '    <div class="tl-line"></div>',
    '    <div class="tl-flag">🚩</div>',
    '    <div class="tl-pt p1"><span class="tl-dot"></span><span class="tl-lbl">استلام</span></div>',
    '    <div class="tl-pt p2"><span class="tl-dot"></span><span class="tl-lbl">فحص</span></div>',
    '    <div class="tl-pt p3"><span class="tl-dot"></span><span class="tl-lbl">توثيق</span></div>',
    '    <div class="tl-pt p4"><span class="tl-dot"></span><span class="tl-lbl">إنجاز</span></div>',
    '  </div>',
    '  <div class="tl-cap">العلم يمرّ على كل مرحلة بالترتيب حتى النهاية</div>',
    '</div>',
    '<style>',
    '  .tl{display:flex;flex-direction:column;align-items:center;gap:22px;padding:26px 14px;}',
    '  .tl-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
    '  .tl-track{position:relative;width:min(480px,94%);height:56px;}',
    '  .tl-line{position:absolute;top:6px;left:0;right:0;height:4px;border-radius:4px;background:#2a3242;}',
    '  .tl-flag{position:absolute;top:-14px;right:0;font-size:20px;animation:tl-go 5s steps(4) infinite;}',
    '  .tl-pt{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;gap:6px;}',
    '  .tl-dot{width:12px;height:12px;border-radius:50%;background:#141a24;border:2px solid #2a3242;}',
    '  .tl-lbl{font-size:11px;color:#9aa4b2;white-space:nowrap;}',
    '  .p1{right:0;} .p2{right:33%;} .p3{right:66%;} .p4{right:100%;}',
    '  @keyframes tl-go{0%{right:0;}25%{right:33%;}50%{right:66%;}75%{right:100%;}100%{right:100%;}}',
    '  .tl-cap{font-size:13px;color:#9aa4b2;}',
    '</style>',
  ].join("\n"),
  accumulation: [
    '<div class="ac">',
    '  <h3 class="ac-ttl">تراكم الرصيد بعد كل عملية بيع</h3>',
    '  <div class="ac-stage">',
    '    <div class="ac-bars">',
    '      <div class="ac-bar b1"></div>',
    '      <div class="ac-bar b2"></div>',
    '      <div class="ac-bar b3"></div>',
    '    </div>',
    '    <div class="ac-count">0 <span>ريال</span></div>',
    '  </div>',
    '  <div class="ac-cap">الرصيد يزيد تدريجياً مع كل عملية جديدة</div>',
    '</div>',
    '<style>',
    '  .ac{display:flex;flex-direction:column;align-items:center;gap:18px;padding:22px 14px;}',
    '  .ac-ttl{margin:0;color:#F59E0B;font-weight:800;font-size:19px;}',
    '  .ac-stage{display:flex;align-items:flex-end;gap:22px;}',
    '  .ac-bars{display:flex;align-items:flex-end;gap:10px;height:110px;}',
    '  .ac-bar{width:26px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#10B981,#F59E0B);}',
    '  .b1{animation:ac-grow1 4s ease-in-out infinite;}',
    '  .b2{animation:ac-grow2 4s ease-in-out infinite .3s;}',
    '  .b3{animation:ac-grow3 4s ease-in-out infinite .6s;}',
    '  @keyframes ac-grow1{0%,100%{height:20%;}60%{height:55%;}}',
    '  @keyframes ac-grow2{0%,100%{height:15%;}60%{height:80%;}}',
    '  @keyframes ac-grow3{0%,100%{height:10%;}60%{height:100%;}}',
    '  .ac-count{font-size:22px;font-weight:900;color:#e9edf5;}',
    '  .ac-count span{font-size:12px;color:#9aa4b2;font-weight:600;}',
    '  .ac-cap{font-size:13px;color:#9aa4b2;}',
    '</style>',
    '<script>',
    '(function(){var el=document.currentScript.previousElementSibling;var n=0;setInterval(function(){n=(n+250)%2250;el.textContent=n+" ";var s=document.createElement("span");s.textContent="ريال";el.appendChild(s);},600);})();',
    '</script>',
  ].join("\n"),
};

/**
 * Classifies a scene topic into one of the visual archetypes using a cheap
 * Flash-Lite call. Fails SAFE to the default archetype on ANY error/timeout —
 * a wrong-but-valid archetype is a minor quality loss, never a hard failure.
 */
async function classifyArchetype(topic: string, lessonName?: string): Promise<SceneArchetype> {
  try {
    const ctx = lessonName ? `سياق الدرس: «${lessonName}».\n` : "";
    const prompt = `${ctx}صنّف الفكرة التالية إلى نوع بصري واحد فقط من هذه القائمة:\n${ARCHETYPE_KEYS.map(
      (k) => `- ${k}: ${ARCHETYPE_DESCRIPTIONS[k]}`,
    ).join("\n")}\n\nالفكرة: «${topic.trim()}»\n\nأعِد كلمة واحدة فقط من المفاتيح أعلاه (مثلاً: cycle) بدون أي نص إضافي.`;
    const result = await generateGemini({
      userParts: [{ type: "text", text: prompt }],
      model: SCENE_CLASSIFIER_MODEL,
      temperature: 0.1,
      maxOutputTokens: 20,
      jsonMode: false,
      timeoutMs: 12_000,
      logTag: "v4-scene-classify",
    });
    const guess = result.text.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (ARCHETYPE_KEYS.includes(guess as SceneArchetype)) return guess as SceneArchetype;
    return DEFAULT_ARCHETYPE;
  } catch {
    return DEFAULT_ARCHETYPE;
  }
}

function buildSystemPrompt(archetype: SceneArchetype): string {
  const goldExample = GOLD_EXAMPLES[archetype] ?? GOLD_EXAMPLES[DEFAULT_ARCHETYPE];
  const archetypeLabel = ARCHETYPE_DESCRIPTIONS[archetype] ?? ARCHETYPE_DESCRIPTIONS[DEFAULT_ARCHETYPE];
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
    `=== النوع البصري المطلوب لهذه الفكرة تحديداً: ${archetype} ===`,
    `الفكرة صُنِّفت بأنها من نوع: «${archetypeLabel}». صمّم بنية الرسم والحركة بما يخدم هذا النوع تحديداً (لا تفرض عليه نمط "صندوقين وخط بينهما" إن لم يكن مناسباً).`,
    "",
    "=== هذا مثال ذهبي كامل من نفس النوع البصري — اقتدِ بمستواه وببنيته (ولا تنسخه حرفياً) ===",
    "لاحظ فيه: مسرح ممتلئ، عناصر معنونة بأيقونات، حركة واضحة مستمرّة تناسب هذا النوع البصري تحديداً، ألوان الثيم، وتوهّج على العنصر الفاعل:",
    "```html",
    goldExample,
    "```",
    "اصنع رسماً بنفس هذا المستوى من الوضوح والحركة والامتلاء والبنية، لكن مصمّماً خصّيصاً للفكرة المطلوبة منك.",
    "",
    "=== أيقونات SVG جاهزة (اختياري لكنها تحسّن الشكل الاحترافي — يمكنك نسخ/تعديل أياً منها بدل الاعتماد الكامل على الإيموجي) ===",
    "```html",
    ICON_KIT_SNIPPET,
    "```",
    "",
    "=== القيود التقنية للرسم (html) ===",
    "- اكتب **محتوى الجسم فقط**: عناصر HTML و`<style>` و`<script>`. بلا `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` — النظام يغلّفها.",
    "- **مكتفٍ ذاتياً تماماً**: لا روابط خارجية، لا صور إنترنت، لا CDN، لا خطوط خارجية، ولا أيّ طلب شبكة (البيئة معزولة). HTML/CSS/SVG/Canvas/JS خالصة فقط. (الإيموجي أو أيقونات SVG المرفقة أعلاه مسموحة.)",
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

function buildUserPrompt(topic: string, lessonName: string | undefined, archetype: SceneArchetype): string {
  const ctx = lessonName ? `سياق الدرس: «${lessonName}».\n` : "";
  const archetypeLabel = ARCHETYPE_DESCRIPTIONS[archetype] ?? ARCHETYPE_DESCRIPTIONS[DEFAULT_ARCHETYPE];
  return `${ctx}صمّم رسماً متحرّكاً تعليمياً بمستوى المثال الذهبي **من نفس النوع البصري (${archetypeLabel})**: مسرح ممتلئ، عناصر معبّرة معنونة بالعربية، وحركة واضحة مستمرّة تشرح الفكرة بصرياً من أول نظرة، ببنية تناسب هذا النوع تحديداً — احذر المشهد الفارغ الساكن وتجنّب فرض بنية غير مناسبة. أرفِق شريط خطوات بنصوص يمنية قصيرة متطابقة مع الحركة. التزم تماماً ببنية JSON المطلوبة. الفكرة المطلوب شرحها:\n\n«${topic.trim()}»`;
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
  /**
   * v4 specialty slug. When present (with userId), a genuine cache-miss model
   * call is charged against the student's gem wallet for this subject and
   * refunded if generation fails. Omitted ⇒ no billing (free).
   */
  subjectId?: string;
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

  // 4. Billing — a genuine cache miss is a paid Sonnet call. Pre-gate the
  //    wallet, then charge (idempotent on the topic-hash requestId, so a
  //    failed→retried scene bills at most once per topic). Active only when a
  //    subject context is supplied by the caller; otherwise the call is free.
  let chargeRequestId: string | null = null;
  let didCharge = false;
  const billable = typeof options.userId === "number" && !!options.subjectId;
  if (billable) {
    const afford = await canAffordV4Turn(options.userId!, options.subjectId!);
    if (!afford.ok) {
      throw new SceneGenerationError("insufficient gems for scene", "insufficient");
    }
    // Refund-aware key: a prior failed scene on this topic refunded its debit;
    // reusing the bare `v4scene_${user}_${hash}` would NO_OP on retry and serve
    // the regenerated scene for free.
    chargeRequestId = await resolveRebillKey(options.userId!, `v4scene_${options.userId}_${hash}`);
    const charge = await chargeV4Ai({
      requestId: chargeRequestId,
      userId: options.userId!,
      subjectId: options.subjectId!,
      costUsd: SCENE_USD,
      source: "v4_ai_scene",
      model: SCENE_MODEL,
      note: "مشهد تفاعلي",
    });
    if (!charge.charged && charge.insufficient) {
      throw new SceneGenerationError("insufficient gems for scene", "insufficient");
    }
    // Fail closed on a transient charge error: otherwise the (paid) scene below
    // is generated and served for FREE. A genuine ledger-dedupe NO_OP (no error
    // flag) still falls through — that's a real duplicate, already billed.
    if (!charge.charged && charge.error) {
      throw new SceneGenerationError("scene charge failed (transient)", "transient");
    }
    didCharge = charge.charged;
  }

  const job = (async (): Promise<Scene> => {
   try {
    const archetype = await classifyArchetype(clean, options.lessonName);
    let result;
    try {
      result = await generateGemini({
        systemPrompt: buildSystemPrompt(archetype),
        userParts: [{ type: "text", text: buildUserPrompt(clean, options.lessonName, archetype) }],
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
   } catch (sceneErr) {
     // Refund on ANY failure (transport, parse, validation) so a scene the
     // student never received is never billed.
     if (chargeRequestId && billable && didCharge) {
       await refundV4Ai({
         requestId: chargeRequestId,
         userId: options.userId!,
         subjectId: options.subjectId!,
         source: "v4_ai_scene",
         reason: "scene_failed",
       }).catch(() => {});
     }
     throw sceneErr;
   }
  })();

  inflight.set(hash, job);
  try {
    return await job;
  } finally {
    inflight.delete(hash);
  }
}
