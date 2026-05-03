/**
 * Teacher-image disk store — bulletproof, same-origin image URLs.
 *
 * Why this exists:
 *   The previous pipeline returned third-party CDN URLs (fal.ai or
 *   pollinations.ai) directly to the browser. Two failure modes:
 *     1. Pollinations fetch from the browser routinely takes 10-30s OR
 *        times out entirely on slow Yemeni mobile networks → student
 *        sees the spinner forever.
 *     2. fal.ai signed CDN URLs expire after ~1h, so historical messages
 *        end up with broken images.
 *
 * Radical fix:
 *   - We fetch the binary on the SERVER (fast, reliable, has fallbacks).
 *   - We hash the FLUX prompt with SHA-256 and persist the bytes to
 *     `data/teacher-images/<hash>.<ext>`.
 *   - We hand the browser a same-origin URL (`/api/teacher-images/<hash>.<ext>`)
 *     that loads from our own Express static handler — no CORS, no third-
 *     party latency, no signed-URL expiry.
 *   - Three providers tried in order: fal.ai → Pollinations → SVG poster.
 *     The SVG poster ALWAYS succeeds (it's generated locally), so the
 *     student never sees a perpetual spinner again.
 *
 * Disk-budget guard:
 *   When the total cache size exceeds TEACHER_IMAGE_CACHE_MB (default 500),
 *   we delete the oldest files (by mtime) until we're 25% under the cap.
 *   Eviction runs in the background after every write, never blocks the
 *   request path.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { config as falConfig, subscribe as falSubscribe } from "@fal-ai/serverless-client";
import { logger } from "./logger";

// ── Config ──────────────────────────────────────────────────────────────────
const CACHE_DIR =
  process.env.TEACHER_IMAGE_DIR ??
  path.join(process.cwd(), "data", "teacher-images");

const CACHE_BUDGET_MB = (() => {
  const raw = parseInt(process.env.TEACHER_IMAGE_CACHE_MB ?? "", 10);
  return Number.isFinite(raw) && raw >= 50 && raw <= 50_000 ? raw : 500;
})();

const FAL_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.FAL_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000 ? raw : 25_000;
})();

const POLLINATIONS_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.POLLINATIONS_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 5_000 && raw <= 120_000 ? raw : 35_000;
})();

const URL_PREFIX = "/api/teacher-images/";

let __dirEnsured = false;
async function ensureDir(): Promise<void> {
  if (__dirEnsured) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  __dirEnsured = true;
}

let __falConfigured = false;
function isFalConfigured(): boolean {
  if (__falConfigured) return true;
  const key = (process.env.FAL_KEY || "").trim();
  if (!key) return false;
  falConfig({ credentials: key });
  __falConfigured = true;
  return true;
}

// ── Cache key + lookup ──────────────────────────────────────────────────────
function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
}

const CANDIDATE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".svg"] as const;

async function findCached(hash: string): Promise<{ ext: string } | null> {
  for (const ext of CANDIDATE_EXTS) {
    const file = path.join(CACHE_DIR, hash + ext);
    try {
      await fs.access(file);
      // Refresh mtime so LRU eviction treats recent reads as hot.
      const now = new Date();
      fs.utimes(file, now, now).catch(() => {});
      return { ext };
    } catch { /* not present */ }
  }
  return null;
}

function urlFor(hash: string, ext: string): string {
  return URL_PREFIX + hash + ext;
}

// ── Provider 1: fal.ai (server-side generation, fast) ───────────────────────
async function tryFal(prompt: string): Promise<Buffer | null> {
  if (!isFalConfigured()) return null;
  let timeout: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`fal.ai timeout ${FAL_TIMEOUT_MS}ms`)),
      FAL_TIMEOUT_MS,
    );
  });
  try {
    const result: any = await Promise.race([
      falSubscribe("fal-ai/flux/schnell", {
        input: {
          prompt,
          num_inference_steps: 4,
          image_size: "square_hd",
          num_images: 1,
          enable_safety_checker: true,
          sync_mode: false,
        },
        logs: false,
      }),
      timeoutPromise,
    ]);
    if (timeout) clearTimeout(timeout);
    const url: string | undefined = result?.images?.[0]?.url;
    if (!url) return null;
    const buf = await fetchToBuffer(url, FAL_TIMEOUT_MS);
    return buf;
  } catch (err: any) {
    if (timeout) clearTimeout(timeout);
    logger.warn(
      { provider: "fal", message: err?.message || String(err) },
      "teacher-image-store: fal.ai failed — falling through",
    );
    return null;
  }
}

// ── Provider 2: Pollinations.ai (free, server-side fetch) ───────────────────
async function tryPollinations(prompt: string): Promise<Buffer | null> {
  const clean = prompt.trim().slice(0, 600);
  const seed = Math.floor(Math.random() * 999_999) + 1;
  const qs = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    nologo: "true",
    nofeed: "true",
    enhance: "false",
    seed: String(seed),
  });
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?${qs}`;
  try {
    const buf = await fetchToBuffer(url, POLLINATIONS_TIMEOUT_MS);
    return buf;
  } catch (err: any) {
    logger.warn(
      { provider: "pollinations", message: err?.message || String(err) },
      "teacher-image-store: pollinations failed — falling through to SVG",
    );
    return null;
  }
}

async function fetchToBuffer(url: string, timeoutMs: number): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

// ── Provider 3: SVG poster (always succeeds) ────────────────────────────────
/**
 * Generates a deterministic, on-brand SVG placeholder so the student NEVER
 * sees a broken image. The poster colour is derived from the prompt hash so
 * each concept gets a recognisable distinct accent.
 */
function buildSvgPoster(prompt: string, hash: string): Buffer {
  // Pick a pleasing accent hue from the hash (avoid muddy greens/yellows).
  const hue = parseInt(hash.slice(0, 4), 16) % 360;
  const accent = `hsl(${hue}, 70%, 55%)`;
  const accent2 = `hsl(${(hue + 30) % 360}, 65%, 45%)`;
  const ideaWord = (prompt.split(/\s+/).find((w) => w.length > 3) || "idea")
    .replace(/[<>&"']/g, "")
    .slice(0, 20);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <g transform="translate(512 460)" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" fill="rgba(255,255,255,0.95)">
    <circle r="120" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" stroke-width="4"/>
    <text y="30" font-size="120" font-weight="700">💡</text>
  </g>
  <text x="512" y="700" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif"
        font-size="42" font-weight="700" fill="rgba(255,255,255,0.95)">صورة توضيحية</text>
  <text x="512" y="760" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif"
        font-size="28" fill="rgba(255,255,255,0.75)">${ideaWord}</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Returns the canonical file extension for a buffer IFF its magic bytes
 * match a supported image format, or `null` if the buffer is something
 * else (HTML error page, JSON, plain text, empty, etc.). Used to reject
 * non-image responses BEFORE persisting them — without this, a 200-OK
 * Pollinations error page could be cached as `.png` and the browser would
 * silently render a broken-image icon, defeating the "always visible
 * image" guarantee.
 */
function detectImageExt(buf: Buffer): string | null {
  if (buf.length < 8) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  // WEBP: "RIFF....WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return ".webp";
  // GIF (87a/89a): we deliberately reject these. The /api/teacher-images
  // route only allow-lists png/jpg/jpeg/webp/svg, and re-labeling GIF
  // bytes as `.png` would yield a wrong Content-Type. Treating GIF as
  // "non-image" forces the provider chain to fall through to the
  // guaranteed-good SVG poster instead.
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return null;
  // SVG: "<?xml" or "<svg"
  const head = buf.slice(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return ".svg";
  return null;
}

// ── LRU disk-budget eviction (background) ───────────────────────────────────
let __evicting = false;
async function maybeEvict(): Promise<void> {
  if (__evicting) return;
  __evicting = true;
  try {
    const entries = await fs.readdir(CACHE_DIR);
    type Stat = { file: string; mtimeMs: number; size: number };
    const stats: Stat[] = [];
    let total = 0;
    for (const e of entries) {
      try {
        const full = path.join(CACHE_DIR, e);
        const s = await fs.stat(full);
        if (!s.isFile()) continue;
        stats.push({ file: full, mtimeMs: s.mtimeMs, size: s.size });
        total += s.size;
      } catch { /* skip */ }
    }
    const budget = CACHE_BUDGET_MB * 1024 * 1024;
    if (total <= budget) return;
    // Evict oldest first until we're at 75% of budget (hysteresis to avoid
    // thrashing on every write).
    const target = Math.floor(budget * 0.75);
    stats.sort((a, b) => a.mtimeMs - b.mtimeMs);
    let removed = 0;
    for (const s of stats) {
      if (total <= target) break;
      try { await fs.unlink(s.file); total -= s.size; removed++; } catch {}
    }
    if (removed > 0) {
      logger.info(
        { removed, totalAfterMB: Math.round(total / 1024 / 1024), budgetMB: CACHE_BUDGET_MB },
        "teacher-image-store: LRU eviction complete",
      );
    }
  } catch (err: any) {
    logger.warn({ message: err?.message || String(err) }, "teacher-image-store: eviction failed");
  } finally {
    __evicting = false;
  }
}

/**
 * Schedule cache maintenance: one sweep at startup (after a short delay so
 * boot isn't blocked by disk I/O) and then once every hour. Idempotent —
 * `maybeEvict` itself short-circuits if the cache is under budget or a
 * sweep is already in flight.
 *
 * Called once from `startScheduledJobs` at server startup.
 */
let __maintenanceStarted = false;
export function startTeacherImageMaintenance(): void {
  if (__maintenanceStarted) return;
  __maintenanceStarted = true;
  // Initial sweep after 30s — gives the server time to finish startup
  // migrations and accept the first requests before we touch the disk.
  setTimeout(() => { ensureDir().then(() => maybeEvict()).catch(() => {}); }, 30_000);
  // Hourly thereafter.
  const interval = setInterval(
    () => { ensureDir().then(() => maybeEvict()).catch(() => {}); },
    60 * 60 * 1000,
  );
  // unref so the timer doesn't keep the process alive on shutdown.
  if (typeof interval.unref === "function") interval.unref();
  logger.info(
    { budgetMB: CACHE_BUDGET_MB, dir: CACHE_DIR },
    "teacher-image-store: maintenance scheduled (startup + hourly)",
  );
}

// ── Public API ──────────────────────────────────────────────────────────────
export type ResolveResult = {
  /** Same-origin URL the browser should load. */
  url: string;
  /** Provider that ultimately produced the bytes. */
  provider: "cache" | "fal" | "pollinations" | "svg";
  /** Total wall-clock latency in ms. */
  latencyMs: number;
};

/**
 * Returns a same-origin URL for an image matching `prompt`. The function
 * NEVER throws — if every external provider fails, an SVG poster is
 * synthesised locally and persisted, so the caller can rely on always
 * receiving a valid URL.
 *
 * In-flight de-duplication: two concurrent calls with the same prompt
 * share a single Promise so we don't waste API credits or disk writes.
 */
const inflight = new Map<string, Promise<ResolveResult>>();

export async function resolveTeacherImage(prompt: string): Promise<ResolveResult> {
  const start = Date.now();
  const cleanPrompt = (prompt || "").trim();
  const hash = hashPrompt(cleanPrompt || "empty-prompt");

  // De-duplicate identical concurrent requests.
  const existing = inflight.get(hash);
  if (existing) return existing;

  const job = (async (): Promise<ResolveResult> => {
    await ensureDir();

    // 1. Disk cache hit?
    const hit = await findCached(hash);
    if (hit) {
      return { url: urlFor(hash, hit.ext), provider: "cache", latencyMs: Date.now() - start };
    }

    // 2. Provider chain: fal → pollinations → svg.
    // Each external buffer is content-validated by `detectImageExt`. If the
    // bytes are NOT a real image (e.g. Pollinations occasionally serves an
    // HTML 200 error page when overloaded), we discard them and fall
    // through. This is what upholds the "always visible image" guarantee:
    // garbage in, SVG poster out.
    let buf: Buffer | null = null;
    let ext: string | null = null;
    let provider: ResolveResult["provider"] = "svg";
    if (!buf) {
      const b = await tryFal(cleanPrompt);
      if (b) {
        const e = detectImageExt(b);
        if (e) { buf = b; ext = e; provider = "fal"; }
        else logger.warn({ provider: "fal", bytes: b.length }, "teacher-image-store: fal returned non-image bytes — falling through");
      }
    }
    if (!buf) {
      const b = await tryPollinations(cleanPrompt);
      if (b) {
        const e = detectImageExt(b);
        if (e) { buf = b; ext = e; provider = "pollinations"; }
        else logger.warn({ provider: "pollinations", bytes: b.length }, "teacher-image-store: pollinations returned non-image bytes — falling through");
      }
    }
    if (!buf) {
      buf = buildSvgPoster(cleanPrompt, hash);
      ext = ".svg";
      provider = "svg";
    }
    if (!ext) ext = ".svg"; // defensive — buf is always set by the SVG branch.
    const file = path.join(CACHE_DIR, hash + ext);
    // Write atomically: tmp → rename. Avoids serving a half-written file.
    const tmp = file + ".tmp";
    try {
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, file);
    } catch (err: any) {
      logger.error(
        { message: err?.message || String(err), file },
        "teacher-image-store: failed to persist image — returning SVG inline data URL fallback",
      );
      // Last-resort: return a base64 data URL so the browser still renders
      // SOMETHING. Disk write should rarely fail (we own the volume).
      const b64 = buf.toString("base64");
      const mime = ext === ".svg" ? "image/svg+xml" : "image/png";
      return {
        url: `data:${mime};base64,${b64}`,
        provider,
        latencyMs: Date.now() - start,
      };
    }

    // Background eviction (never awaited).
    maybeEvict().catch(() => {});

    return { url: urlFor(hash, ext), provider, latencyMs: Date.now() - start };
  })();

  inflight.set(hash, job);
  try { return await job; }
  finally { inflight.delete(hash); }
}

/**
 * Express handler: serve a previously-cached image by filename.
 * Filename must be `<64 hex chars><ext>` — anything else is rejected to
 * prevent path traversal.
 */
export async function serveTeacherImage(filename: string): Promise<
  | { ok: true; body: Buffer; contentType: string }
  | { ok: false; status: number; message: string }
> {
  if (!/^[a-f0-9]{64}\.(png|jpg|jpeg|webp|svg)$/i.test(filename)) {
    return { ok: false, status: 400, message: "invalid filename" };
  }
  const file = path.join(CACHE_DIR, filename);
  try {
    const body = await fs.readFile(file);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
    // Refresh mtime for LRU.
    const now = new Date();
    fs.utimes(file, now, now).catch(() => {});
    return { ok: true, body, contentType };
  } catch {
    return { ok: false, status: 404, message: "not found" };
  }
}

export const TEACHER_IMAGE_URL_PREFIX = URL_PREFIX;
