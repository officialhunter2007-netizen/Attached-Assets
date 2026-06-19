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

// UX SLA: a teacher image must be visible within ~10s on a normal
// connection. With the SVG poster as a guaranteed local fallback we
// can afford aggressive provider deadlines — the worst case is now
// 4s (fal) + 4s (pollinations) = 8s before SVG, comfortably inside
// the 10s target. In practice fal usually returns in 3-5s and the
// chain rarely advances. Override via env if a slow upstream needs
// more headroom.
const FAL_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.FAL_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 2_000 && raw <= 120_000 ? raw : 4_000;
})();

const POLLINATIONS_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.POLLINATIONS_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 2_000 && raw <= 120_000 ? raw : 4_000;
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
  // 16 hex chars = 64 bits of entropy ≈ 1 collision in 2^32 unique
  // prompts (roughly 4 billion). For an educational chat that's the
  // sweet spot between URL length and uniqueness — short enough to
  // embed in SSE events without bloat, long enough that a student
  // never collides across the lifetime of the platform. The full
  // SHA-256 is overkill for this usage.
  return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex").slice(0, 16);
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
  // Prefer the Arabic substring of the prompt as the topic label so the
  // RTL student sees a recognisable concept word rather than a stray
  // English token. Falls back to the first non-trivial word, then to
  // the generic "صورة توضيحية" caption.
  const sanitize = (s: string) => s.replace(/[<>&"']/g, "").trim().slice(0, 28);
  const arabicMatch = prompt.match(/[\u0600-\u06FF][\u0600-\u06FF\s]{2,}/);
  const topic = sanitize(
    (arabicMatch && arabicMatch[0])
      || (prompt.split(/\s+/).find((w) => w.length > 3) || ""),
  );
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
  <g transform="translate(512 440)" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" fill="rgba(255,255,255,0.95)">
    <circle r="120" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" stroke-width="4"/>
    <text y="30" font-size="120" font-weight="700">💡</text>
  </g>
  <text x="512" y="680" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif"
        font-size="42" font-weight="700" fill="rgba(255,255,255,0.95)" direction="rtl">صورة توضيحية</text>
  ${topic ? `<text x="512" y="740" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif"
        font-size="32" fill="rgba(255,255,255,0.85)" direction="rtl">${topic}</text>` : ""}
  <!-- Brand mark: small "نُخبة" wordmark in the bottom-right corner -->
  <g transform="translate(940 970)" text-anchor="end" font-family="system-ui,Segoe UI,sans-serif">
    <text font-size="28" font-weight="700" fill="rgba(255,255,255,0.85)" direction="rtl">نُخبة</text>
  </g>
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
    () => {
      ensureDir().then(() => maybeEvict()).catch(() => {});
      // Emit a single line summarising provider outcomes for the past
      // hour so ops can spot regressions (e.g. svg-fallback ratio
      // climbing means timeouts are too tight or fal is down).
      logger.info(
        { providerCounts: getTeacherImageStats() },
        "teacher-image-store: hourly provider stats",
      );
    },
    60 * 60 * 1000,
  );
  // unref so the timer doesn't keep the process alive on shutdown.
  if (typeof interval.unref === "function") interval.unref();
  logger.info(
    { budgetMB: CACHE_BUDGET_MB, dir: CACHE_DIR },
    "teacher-image-store: maintenance scheduled (startup + hourly)",
  );
}

// ── Telemetry ───────────────────────────────────────────────────────────────
// Lightweight in-memory counters so ops can monitor whether provider
// timeouts are too aggressive (excessive svg fallbacks) or whether
// fal/pollinations is consistently failing. Zero deps, reset on
// process restart. Logged once per maintenance sweep.
const __providerCounts: Record<ResolveResult["provider"], number> = {
  cache: 0,
  fal: 0,
  pollinations: 0,
  svg: 0,
};
function recordProvider(p: ResolveResult["provider"]): void {
  __providerCounts[p] = (__providerCounts[p] || 0) + 1;
}
export function getTeacherImageStats(): Readonly<Record<ResolveResult["provider"], number>> {
  return { ...__providerCounts };
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

export type ResolveOptions = {
  /** Skip the paid fal.ai provider; use cache → pollinations → svg only. */
  noFal?: boolean;
};

export async function resolveTeacherImage(
  prompt: string,
  options: ResolveOptions = {},
): Promise<ResolveResult> {
  const start = Date.now();
  const cleanPrompt = (prompt || "").trim();
  const hash = hashPrompt(cleanPrompt || "empty-prompt");
  const noFal = !!options.noFal;

  // De-duplicate identical concurrent requests with the SAME provider
  // policy (a noFal call shouldn't piggy-back on an in-flight paid call,
  // and vice versa).
  const inflightKey = noFal ? `nf:${hash}` : hash;
  const existing = inflight.get(inflightKey);
  if (existing) return existing;

  const job = (async (): Promise<ResolveResult> => {
    await ensureDir();

    // 1. Disk cache hit?
    const hit = await findCached(hash);
    if (hit) {
      recordProvider("cache");
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
    if (!buf && !noFal) {
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

    recordProvider(provider);
    return { url: urlFor(hash, ext), provider, latencyMs: Date.now() - start };
  })();

  inflight.set(inflightKey, job);
  try { return await job; }
  finally { inflight.delete(inflightKey); }
}

// ── Real web photos (Wikipedia / Wikimedia Commons) ─────────────────────────
/**
 * The IMAGE pipeline above produces STYLIZED, generated infographics (FLUX /
 * Pollinations / SVG). For concrete real-world things — a RAM stick, a CPU, a
 * human heart, the Eiffel Tower — the student is far better served by an ACTUAL
 * PHOTOGRAPH. `resolveWebPhoto` fetches one from Wikipedia (and, failing that,
 * Wikimedia Commons), persists it under the SAME same-origin disk cache, and
 * returns a same-origin URL — so the existing `[[IMAGE:id]]` + imageReady wire
 * contract renders it with ZERO frontend changes.
 *
 * It is ALWAYS FREE (no fal.ai) and NEVER throws: if no real photo is found it
 * falls back to the free generated path (`resolveTeacherImage(..,{noFal})`),
 * so a placeholder never stuck-spins.
 *
 * SSRF lockdown: image BYTES are only ever downloaded from trusted Wikimedia
 * upload hosts (the search APIs themselves are fixed en.wikipedia.org /
 * commons.wikimedia.org endpoints). A crafted/poisoned URL pointing anywhere
 * else is refused before any fetch.
 */
const WEB_PHOTO_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.WEB_PHOTO_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw >= 2_000 && raw <= 60_000 ? raw : 6_000;
})();
const WEB_PHOTO_MAX_BYTES = 8 * 1024 * 1024; // hard cap — reject oversized downloads
const WEB_PHOTO_MIN_BYTES = 1_500; // reject blank/placeholder tiny files
const WEB_PHOTO_MIN_WIDTH = 250; // clarity floor — skip thumbnails too small to read
const WIKI_USER_AGENT =
  "NukhbaEducation/1.0 (Yemeni educational platform; teacher illustration lookup)";

/** SSRF guard: only HTTPS image bytes from Wikimedia upload hosts are fetched. */
function isAllowedPhotoHost(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "upload.wikimedia.org" || h.endsWith(".wikimedia.org");
  } catch {
    return false;
  }
}

function safeHost(rawUrl: string): string {
  try { return new URL(rawUrl).hostname; } catch { return "?"; }
}

async function fetchJsonWithTimeout(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), WEB_PHOTO_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": WIKI_USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Download image bytes from an ALLOWLISTED Wikimedia host, size-capped. */
async function fetchPhotoBuffer(url: string): Promise<Buffer | null> {
  if (!isAllowedPhotoHost(url)) {
    logger.warn?.({ host: safeHost(url) }, "web-photo: blocked non-allowlisted host");
    return null;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), WEB_PHOTO_TIMEOUT_MS);
  try {
    // SSRF hardening: do NOT let fetch silently follow a redirect to an
    // off-allowlist (or internal) host. `redirect: "manual"` surfaces 3xx as an
    // opaque response; we re-validate each Location against the SAME allowlist
    // and follow at most a couple of hops manually.
    let current = url;
    let res: Response | null = null;
    for (let hop = 0; hop < 3; hop++) {
      res = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "User-Agent": WIKI_USER_AGENT },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        const next = new URL(loc, current).toString();
        if (!isAllowedPhotoHost(next)) {
          logger.warn?.({ host: safeHost(next) }, "web-photo: blocked redirect to non-allowlisted host");
          return null;
        }
        current = next;
        continue;
      }
      break;
    }
    if (!res || !res.ok) return null;
    const declared = parseInt(res.headers.get("content-length") ?? "", 10);
    if (Number.isFinite(declared) && declared > WEB_PHOTO_MAX_BYTES) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length > WEB_PHOTO_MAX_BYTES || buf.length < WEB_PHOTO_MIN_BYTES) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Wikipedia lead-image: best matching article → its rasterized thumbnail. */
async function searchWikipediaThumb(query: string): Promise<string | null> {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "2",
    gsrnamespace: "0",
    prop: "pageimages",
    piprop: "thumbnail",
    // 800px keeps inline clarity while shaving search+download latency vs 900px;
    // gsrlimit/pilimit trimmed to 2 (the loop only needs the top lead image).
    pithumbsize: "800",
    pilimit: "2",
    origin: "*",
  });
  const json = await fetchJsonWithTimeout(`https://en.wikipedia.org/w/api.php?${qs}`);
  const pages = json?.query?.pages;
  if (!pages || typeof pages !== "object") return null;
  const arr = (Object.values(pages) as any[]).sort(
    (a, b) => (a?.index ?? 999) - (b?.index ?? 999),
  );
  for (const p of arr) {
    const src = p?.thumbnail?.source;
    const w = Number(p?.thumbnail?.width ?? 0);
    // Skip SVG-derived thumbnails. A Wikipedia article's lead image is very often
    // a schematic / diagram / logo / icon authored as SVG (e.g. the "Computer
    // monitor" lead is MonitorLCDlcd.svg) rasterized on a transparent
    // background — it renders as a near-blank box, NOT a real photo. Falling
    // through to the Commons `filetype:bitmap` search yields an actual
    // photograph (and still a raster diagram for genuine diagram queries).
    if (typeof src !== "string" || /\.svg(?:\.|\/)/i.test(src)) continue;
    if (w >= WEB_PHOTO_MIN_WIDTH && isAllowedPhotoHost(src)) return src;
  }
  return null;
}

/** Wikimedia Commons fallback: search the File namespace for a bitmap photo. */
async function searchCommonsThumb(query: string): Promise<string | null> {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "5",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: "900",
    origin: "*",
  });
  const json = await fetchJsonWithTimeout(`https://commons.wikimedia.org/w/api.php?${qs}`);
  const pages = json?.query?.pages;
  if (!pages || typeof pages !== "object") return null;
  const arr = (Object.values(pages) as any[]).sort(
    (a, b) => (a?.index ?? 999) - (b?.index ?? 999),
  );
  // Rank valid bitmap candidates by how many query words appear in the file
  // title, so a semantically on-topic photo wins over an unrelated image that
  // raw search relevance happened to float to the top (e.g. "computer monitor"
  // should pick "EIZO … computer monitor …", not "Amiga500 system"). Ties keep
  // search order (best is only replaced on a strictly higher score).
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  let best: { url: string; score: number } | null = null;
  for (const p of arr) {
    const ii = p?.imageinfo?.[0];
    const thumb = ii?.thumburl;
    const w = Number(ii?.thumbwidth ?? 0);
    const mime = String(ii?.mime ?? "");
    if (
      typeof thumb !== "string" ||
      w < WEB_PHOTO_MIN_WIDTH ||
      !/^image\/(png|jpeg|webp)$/.test(mime) ||
      !isAllowedPhotoHost(thumb)
    ) continue;
    const title = String(p?.title ?? "").toLowerCase();
    const score = tokens.reduce((s, t) => s + (title.includes(t) ? 1 : 0), 0);
    if (!best || score > best.score) best = { url: thumb, score };
    if (tokens.length > 0 && best.score === tokens.length) break;
  }
  return best?.url ?? null;
}

export type WebPhotoResult = {
  url: string;
  provider: "cache" | "wiki" | "commons" | "fallback";
  latencyMs: number;
};

const __photoCounts: Record<WebPhotoResult["provider"], number> = {
  cache: 0,
  wiki: 0,
  commons: 0,
  fallback: 0,
};
function recordPhoto(p: WebPhotoResult["provider"]): void {
  __photoCounts[p] = (__photoCounts[p] || 0) + 1;
}
export function getWebPhotoStats(): Readonly<Record<WebPhotoResult["provider"], number>> {
  return { ...__photoCounts };
}

const inflightPhotos = new Map<string, Promise<WebPhotoResult>>();

/**
 * Resolve a same-origin URL for a REAL photograph matching `query` (an English
 * noun phrase, e.g. "DDR4 RAM module"). Cache → Wikipedia → Commons → free
 * generated fallback. Never throws; never bills fal.
 */
export async function resolveWebPhoto(query: string): Promise<WebPhotoResult> {
  const start = Date.now();
  const clean = (query || "").trim().slice(0, 200);
  // Namespaced cache key — disjoint from FLUX prompt hashes so a photo lookup
  // and an identically-worded generated image never collide on disk.
  // `v2` namespace bump: invalidates every photo cached BEFORE the SVG-skip +
  // Commons-ranking fix. Pre-fix entries (e.g. the blank "computer monitor"
  // schematic) would otherwise be served forever from disk, bypassing the new
  // provider logic. Old files orphan harmlessly and are LRU-evicted over time.
  const hash = hashPrompt(`photo:v2:${clean.toLowerCase()}`);

  const existing = inflightPhotos.get(hash);
  if (existing) return existing;

  const job = (async (): Promise<WebPhotoResult> => {
    await ensureDir();

    // 1. Disk cache hit?
    const hit = await findCached(hash);
    if (hit) {
      recordPhoto("cache");
      return { url: urlFor(hash, hit.ext), provider: "cache", latencyMs: Date.now() - start };
    }

    // Empty query → straight to the free generated fallback.
    if (!clean) {
      const r = await resolveTeacherImage("", { noFal: true });
      recordPhoto("fallback");
      return { url: r.url, provider: "fallback", latencyMs: Date.now() - start };
    }

    // 2. Provider chain: Wikipedia → Commons. Each candidate is host-checked,
    //    size-capped, and magic-byte validated before we trust it.
    //    Both searches are fired CONCURRENTLY: the search round-trip (~1–2s) is
    //    the dominant cost of a web photo (the byte download is ~0.3s), so by
    //    the time Wikipedia is judged empty the Commons search has already run
    //    in parallel — the fallback no longer adds a second sequential hop.
    let buf: Buffer | null = null;
    let provider: WebPhotoResult["provider"] = "fallback";

    const wikiSearch = searchWikipediaThumb(clean).catch(() => null);
    const commonsSearch = searchCommonsThumb(clean).catch(() => null);

    const wikiUrl = await wikiSearch;
    if (wikiUrl) {
      const b = await fetchPhotoBuffer(wikiUrl);
      if (b && detectImageExt(b)) { buf = b; provider = "wiki"; }
    }
    if (!buf) {
      const commonsUrl = await commonsSearch;
      if (commonsUrl) {
        const b = await fetchPhotoBuffer(commonsUrl);
        if (b && detectImageExt(b)) { buf = b; provider = "commons"; }
      }
    }

    // 3. No real photo found → free generated fallback (guarantees a URL).
    if (!buf) {
      const r = await resolveTeacherImage(clean, { noFal: true });
      recordPhoto("fallback");
      return { url: r.url, provider: "fallback", latencyMs: Date.now() - start };
    }

    // Persist the real photo under the photo: hash (atomic tmp → rename).
    const ext = detectImageExt(buf) ?? ".jpg";
    const file = path.join(CACHE_DIR, hash + ext);
    const tmp = file + ".tmp";
    try {
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, file);
    } catch (err: any) {
      logger.error(
        { message: err?.message || String(err), file },
        "web-photo: failed to persist — returning base64 data URL fallback",
      );
      const b64 = buf.toString("base64");
      const mime =
        ext === ".png" ? "image/png" :
        ext === ".webp" ? "image/webp" :
        ext === ".svg" ? "image/svg+xml" : "image/jpeg";
      recordPhoto(provider);
      return { url: `data:${mime};base64,${b64}`, provider, latencyMs: Date.now() - start };
    }

    maybeEvict().catch(() => {});
    recordPhoto(provider);
    return { url: urlFor(hash, ext), provider, latencyMs: Date.now() - start };
  })();

  inflightPhotos.set(hash, job);
  try { return await job; }
  finally { inflightPhotos.delete(hash); }
}

/**
 * Express handler: serve a previously-cached image by filename.
 * Filename must be `<16 hex chars><ext>` — anything else is rejected to
 * prevent path traversal.
 */
export async function serveTeacherImage(filename: string): Promise<
  | { ok: true; path: string; size: number; contentType: string }
  | { ok: false; status: number; message: string }
> {
  if (!/^[a-f0-9]{16}\.(png|jpg|jpeg|webp|svg)$/i.test(filename)) {
    return { ok: false, status: 400, message: "invalid filename" };
  }
  const file = path.join(CACHE_DIR, filename);
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return { ok: false, status: 404, message: "not found" };
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
    // Refresh mtime for LRU.
    const now = new Date();
    fs.utimes(file, now, now).catch(() => {});
    return { ok: true, path: file, size: stat.size, contentType };
  } catch {
    return { ok: false, status: 404, message: "not found" };
  }
}

export const TEACHER_IMAGE_URL_PREFIX = URL_PREFIX;
