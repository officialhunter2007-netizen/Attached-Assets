/**
 * Visual Explain Route — POST /v4/visual-explain
 *
 * Uses Playwright + manus.im to generate a self-contained interactive HTML
 * page that visually explains a teacher message. The student triggers this
 * by clicking the "شرح بصري" button in the chat UI.
 *
 * Resilience model:
 *  • Singleton browser with disconnect handler → auto-relaunches on crash
 *  • Context validity flag → new context created if old one is dead
 *  • 1 auto-retry with full browser reset on any Playwright error
 *  • DOM stability check → waits for content to stop growing, not just
 *    for loading spinners (which may not appear on every site version)
 *  • Triple-strategy sendMessage → fill / evaluate+dispatch / type-chars
 *  • Doctor with 3-model fallback chain → never leaves student with broken HTML
 *  • Every await that can fail is wrapped in try/catch → no unhandled rejections
 */

import { Router } from "express";
import type { Browser, BrowserContext, Page, Locator } from "playwright";
import fs from "fs";

// ── Auth ──────────────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
// Always navigate to the manus.im home page so we always get a fresh task
// with a clean, unobstructed "Message Manus" input. Using a completed-task
// URL caused the rating overlay ("How well did Manus answer?") to appear on
// top of the input, making it impossible to find/interact with.
const MANUS_APP_URL        = "https://manus.im";
const SESSION_FILE         = "/tmp/manus-session.json";
const RESPONSE_TIMEOUT_MS  = 120_000;  // max wait for manus to finish writing
const STABILITY_POLLS      = 4;        // consecutive identical DOM snapshots needed
const STABILITY_INTERVAL   = 1_500;    // ms between stability polls
const MAX_CONTINUATIONS    = 4;        // "أكمل" attempts before giving up
const REQUEST_TIMEOUT_MS   = 160_000;  // hard ceiling per HTTP request
const MAX_HTML_DOCTOR_BYTES = 400_000; // skip doctor for very large HTML (saves tokens)
const PROMPT_PLAIN_CHARS   = 3_000;    // max teacher-message chars sent to manus

// ── Singleton state ───────────────────────────────────────────────────────────
let _browser:      Browser        | null = null;
let _context:      BrowserContext | null = null;
let _contextValid: boolean               = false;
let _busy:         boolean               = false;

// ── Browser lifecycle ─────────────────────────────────────────────────────────
async function findChromiumPath(): Promise<string> {
  const fromEnv = process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;

  const { execSync } = await import("child_process");
  for (const cmd of ["which chromium", "which chromium-browser", "which google-chrome"]) {
    try {
      const p = execSync(cmd + " 2>/dev/null", { encoding: "utf-8" }).trim();
      if (p) return p;
    } catch {}
  }
  return "chromium"; // last resort — let Playwright resolve from PATH
}

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;

  // playwright (not playwright-core) is installed in the artifact's node_modules
  const { chromium } = await import("playwright");
  const executablePath = await findChromiumPath();

  console.log(`[visual-explain] Launching Chromium: ${executablePath}`);
  _browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--single-process",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
    ],
  });

  // Auto-reset when browser crashes or is killed externally
  _browser.on("disconnected", () => {
    console.warn("[visual-explain] Browser disconnected — will re-launch on next request");
    _browser      = null;
    _context      = null;
    _contextValid = false;
  });

  _context      = null;
  _contextValid = false;
  return _browser;
}

async function getContext(): Promise<BrowserContext> {
  const browser = await getBrowser();

  if (_context && _contextValid) return _context;

  // Close stale context if it exists but is no longer usable
  if (_context) {
    await _context.close().catch(() => {});
    _context = null;
  }

  _context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/138.0.0.0 Safari/537.36",
    locale:     "ar-YE",
    timezoneId: "Asia/Aden",
    viewport:   { width: 1280, height: 800 },
  });

  // Restore session cookies from disk
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      if (Array.isArray(cookies) && cookies.length > 0) {
        await _context.addCookies(cookies);
        console.log(`[visual-explain] Restored ${cookies.length} session cookies`);
      }
    } catch (e) {
      console.warn("[visual-explain] Could not restore session cookies:", (e as Error).message);
    }
  }

  _contextValid = true;
  return _context;
}

async function invalidateContext(alsoCloseBrowser = false): Promise<void> {
  _contextValid = false;
  if (_context) {
    await _context.close().catch(() => {});
    _context = null;
  }
  if (alsoCloseBrowser && _browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

async function saveSession(context: BrowserContext): Promise<void> {
  try {
    const cookies = await context.cookies();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
    console.log(`[visual-explain] Session saved (${cookies.length} cookies)`);
  } catch (e) {
    console.warn("[visual-explain] Could not save session:", (e as Error).message);
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
/**
 * Runs `fn`. On failure, resets the entire browser + context and retries once.
 * This covers transient Chromium crashes, network glitches, and stale contexts.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    const msg = (firstErr as Error).message ?? "";
    console.warn(`[visual-explain] First attempt failed (${msg}). Resetting browser and retrying…`);

    await invalidateContext(/* alsoCloseBrowser */ true);
    await new Promise((r) => setTimeout(r, 2_500));

    // Single retry — if this also fails, bubble the error to the route handler
    return await fn();
  }
}

// ── Login handling ────────────────────────────────────────────────────────────
const LOGIN_URL_PATTERNS = ["/login", "/signin", "/sign-in", "/auth", "/register"];

function looksLikeLoginPage(url: string): boolean {
  return LOGIN_URL_PATTERNS.some((p) => url.includes(p));
}

async function ensureLoggedIn(page: Page): Promise<void> {
  const url = page.url();

  // Check URL patterns first
  let needsLogin = looksLikeLoginPage(url);

  // If URL is fine, also check for an email input (login modal)
  if (!needsLogin) {
    needsLogin = await page
      .$('input[type="email"], input[name="email"], input[placeholder*="email" i]')
      .then((el) => !!el)
      .catch(() => false);
  }

  if (!needsLogin) return; // Already logged in

  const email    = process.env.MANUS_EMAIL;
  const password = process.env.MANUS_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "MANUS_EMAIL أو MANUS_PASSWORD غير محدد في الـ Secrets — " +
      "أضفهما في إعدادات المشروع"
    );
  }

  console.log("[visual-explain] Logging in to manus.im…");

  // Fill email
  const emailEl = await page.waitForSelector(
    'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    { timeout: 20_000 }
  ).catch(() => null);

  if (!emailEl) throw new Error("Email input not found on login page");
  await emailEl.fill(email);
  await page.waitForTimeout(400);

  // Fill password
  const pwEl = await page.waitForSelector(
    'input[type="password"], input[name="password"], input[placeholder*="password" i]',
    { timeout: 10_000 }
  ).catch(() => null);

  if (!pwEl) throw new Error("Password input not found on login page");
  await pwEl.fill(password);
  await page.waitForTimeout(400);

  // Submit form
  const submitBtn = await page.$('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("دخول")').catch(() => null);
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.keyboard.press("Enter");
  }

  // Wait until we leave the login page (up to 35 s)
  await page
    .waitForFunction(
      (patterns: string[]) =>
        !patterns.some((p) => location.href.includes(p)) &&
        !document.querySelector('input[type="email"]'),
      LOGIN_URL_PATTERNS,
      { timeout: 35_000 }
    )
    .catch(() => {
      throw new Error("تعذّر تسجيل الدخول إلى manus.im — انتهت المهلة (35 ث)");
    });

  await saveSession(page.context());
  console.log("[visual-explain] Login successful");
}

// ── Chat input helpers ────────────────────────────────────────────────────────
const INPUT_SELECTORS = [
  // manus.im specific — most precise first
  'textarea[placeholder*="Message" i]',
  'textarea[placeholder*="Manus" i]',
  'textarea[placeholder*="رسالة" i]',
  // generic textarea (visible, not readonly/disabled)
  'textarea:not([readonly]):not([disabled])',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]',
  '[data-testid*="chat-input"]',
  '[data-testid*="message-input"]',
  '[class*="chat-input"] textarea',
  '[class*="input-area"] textarea',
  '[class*="message-input"] textarea',
  '[class*="chat"] textarea',
  'textarea[placeholder]',
];

const SEND_SELECTORS = [
  '[aria-label="Send"]',
  '[aria-label="send"]',
  '[data-testid*="send"]',
  '[class*="send-button"]:not([disabled])',
  '[class*="submit-button"]:not([disabled])',
  'button[type="submit"]:not([disabled])',
  'form button:last-child:not([disabled])',
];

const LOADING_SELECTORS = [
  '[class*="loading"]',
  '[class*="thinking"]',
  '[class*="generating"]',
  '[class*="spinner"]',
  '[class*="pending"]',
  '[class*="streaming"]',
  ".animate-spin",
  ".animate-pulse",
  "[aria-busy='true']",
  "[role='progressbar']",
  '[class*="typing-indicator"]',
];

/**
 * Dismiss any overlay dialogs that manus.im shows (rating, feedback, etc.)
 * These block interaction with the main chat input.
 */
async function dismissOverlays(page: Page): Promise<void> {
  const dismissSelectors = [
    // Rating / feedback dialogs
    'button:has-text("Skip")',
    'button:has-text("تخطى")',
    'button:has-text("Close")',
    'button:has-text("إغلاق")',
    'button:has-text("Later")',
    'button:has-text("No thanks")',
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    // Rating stars area — click outside to dismiss
    '[class*="modal"] button:last-child',
    '[class*="dialog"] button:last-child',
    '[class*="overlay"] button:last-child',
  ];

  for (const sel of dismissSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
        console.log(`[visual-explain] Dismissed overlay via: ${sel}`);
      }
    } catch {}
  }

  // Press Escape as last resort to close any open modal
  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch {}
}

async function findInput(page: Page): Promise<Locator> {
  // First: dismiss any overlays that may block the textarea
  await dismissOverlays(page);

  // Wait up to 12s for ANY known input selector to appear
  const combinedSelector = INPUT_SELECTORS.join(", ");
  await page
    .waitForSelector(combinedSelector, { timeout: 12_000, state: "visible" })
    .catch(() => {
      console.warn("[visual-explain] waitForSelector timed out — proceeding with manual check");
    });

  for (const sel of INPUT_SELECTORS) {
    try {
      const count = await page.locator(sel).count();
      if (count === 0) continue;
      const loc = page.locator(sel).first();
      const visible = await loc.isVisible().catch(() => false);
      if (visible) {
        console.log(`[visual-explain] Chat input found via: ${sel}`);
        return loc;
      }
    } catch {}
  }
  throw new Error(
    "لم يتم العثور على حقل الإدخال في manus.im — " +
    "قد يكون تغيّر تصميم الموقع"
  );
}

async function trySend(page: Page): Promise<void> {
  // Strategy A: dedicated send button
  for (const sel of SEND_SELECTORS) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        console.log(`[visual-explain] Sent via button: ${sel}`);
        return;
      }
    } catch {}
  }

  // Strategy B: Ctrl+Enter (common in chat apps)
  try {
    await page.keyboard.press("Control+Enter");
    console.log("[visual-explain] Sent via Ctrl+Enter");
    return;
  } catch {}

  // Strategy C: plain Enter
  await page.keyboard.press("Enter");
  console.log("[visual-explain] Sent via Enter");
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = await findInput(page);
  await page.waitForTimeout(300);

  // Strategy 1: standard fill() — works for regular <textarea>
  try {
    await input.click();
    await input.fill(text);
    await page.waitForTimeout(500);
    const val = await input.inputValue().catch(() => "");
    if (val.trim().length > 0 || (await input.innerText().catch(() => "")).trim().length > 0) {
      await trySend(page);
      return;
    }
  } catch (e) {
    console.warn("[visual-explain] sendMessage strategy 1 (fill) failed:", (e as Error).message);
  }

  // Strategy 2: JS evaluate + React synthetic events — works for contenteditable
  try {
    await input.click();
    await input.evaluate((el: HTMLElement, t: string) => {
      // Clear first
      el.textContent = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      // Set text
      el.textContent = t;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: t }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, text);
    await page.waitForTimeout(500);
    await trySend(page);
    return;
  } catch (e) {
    console.warn("[visual-explain] sendMessage strategy 2 (evaluate) failed:", (e as Error).message);
  }

  // Strategy 3: select-all + type char by char
  await input.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.waitForTimeout(200);
  await page.keyboard.type(text, { delay: 15 });
  await page.waitForTimeout(500);
  await trySend(page);
  console.log("[visual-explain] sendMessage used strategy 3 (keyboard type)");
}

// ── Wait for manus response ───────────────────────────────────────────────────
/**
 * Two-phase wait:
 *  Phase 1 — wait for loading indicators to disappear (up to RESPONSE_TIMEOUT_MS)
 *  Phase 2 — wait for DOM text to stop growing (STABILITY_POLLS consecutive
 *             identical snapshots spaced STABILITY_INTERVAL ms apart)
 *
 * This handles sites that don't show spinners as well as those that do.
 */
async function waitForResponseComplete(page: Page): Promise<void> {
  // Give manus.im a moment to start streaming
  await page.waitForTimeout(2_500);

  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;

  // Phase 1: wait for loading indicators to vanish
  while (Date.now() < deadline) {
    let anyBusy = false;
    for (const sel of LOADING_SELECTORS) {
      try {
        if (await page.locator(sel).first().isVisible()) {
          anyBusy = true;
          break;
        }
      } catch {}
    }
    if (!anyBusy) break;
    await page.waitForTimeout(1_000);
  }

  // Phase 2: DOM stability — text must be unchanged for STABILITY_POLLS cycles
  let prevSnapshot  = "";
  let stableCount   = 0;

  while (Date.now() < deadline && stableCount < STABILITY_POLLS) {
    const snapshot = await page
      .evaluate(() => {
        // Sample all visible text within the page body
        const body = document.body;
        return body ? body.innerText.slice(-8_000) : ""; // last 8k chars — enough to detect changes
      })
      .catch(() => "");

    if (snapshot.length > 0 && snapshot === prevSnapshot) {
      stableCount++;
    } else {
      stableCount  = 0;
      prevSnapshot = snapshot;
    }
    await page.waitForTimeout(STABILITY_INTERVAL);
  }

  // Final settle
  await page.waitForTimeout(800);
}

// ── HTML extraction ───────────────────────────────────────────────────────────
function extractHtmlBlocks(text: string): string[] {
  const blocks: string[] = [];

  // 1. ```html ... ``` fenced
  const htmlFenced = /```html\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlFenced.exec(text)) !== null) {
    const b = m[1].trim();
    if (b.length > 100) blocks.push(b);
  }

  // 2. Generic fenced that starts with <!DOCTYPE or <html
  if (blocks.length === 0) {
    const genericFenced = /```(?:\w*\s*)?(<!DOCTYPE[\s\S]*?<\/html>)\s*```/gi;
    while ((m = genericFenced.exec(text)) !== null) {
      const b = m[1].trim();
      if (b.length > 100) blocks.push(b);
    }
  }

  // 3. Bare HTML (no backticks)
  if (blocks.length === 0) {
    const bare = /<!DOCTYPE html[\s\S]*?<\/html>/gi;
    while ((m = bare.exec(text)) !== null) {
      const b = m[0].trim();
      if (b.length > 100) blocks.push(b);
    }
  }

  // 4. Partial: open <html tag without proper close (fallback for continuations)
  if (blocks.length === 0) {
    const partial = /<html[\s\S]{200,}/gi;
    while ((m = partial.exec(text)) !== null) {
      blocks.push(m[0].trim());
    }
  }

  return blocks;
}

function isHtmlComplete(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    html.length > 200 &&
    (lower.includes("<!doctype") || lower.includes("<html")) &&
    lower.includes("<body") &&
    lower.includes("</html>")
  );
}

function responseSeemsPartial(text: string, htmlBlocks: string[]): boolean {
  if (htmlBlocks.length === 0) return true;
  // Complete-looking HTML blocks found — check for explicit partial signals
  const lower = text.toLowerCase();
  const hasOpenCodeFence = /```html[^`]*$/.test(text); // unclosed code fence
  const hasPartialSignal =
    lower.includes("يتبع") ||
    lower.includes("الجزء الأول") ||
    lower.includes("أكمل الكود") ||
    lower.includes("سأكمل") ||
    lower.includes("to be continued");
  return hasOpenCodeFence || (hasPartialSignal && !htmlBlocks.some(isHtmlComplete));
}

// ── Scrape assistant messages ─────────────────────────────────────────────────
/**
 * Returns ALL visible assistant/AI text on the page concatenated.
 * On continuation rounds we need the full history, not just the newest message,
 * because the HTML might be split across multiple assistant turns.
 */
async function scrapeAllAssistantText(page: Page): Promise<string> {
  const strategies: Array<() => Promise<string | null>> = [
    // 1. Explicit assistant role markers
    async () => {
      const els = await page.$$('[data-role="assistant"], [class*="assistant-message"], [class*="ai-message"]');
      if (!els.length) return null;
      const parts = await Promise.all(els.map((e) => e.innerText().catch(() => "")));
      return parts.filter(Boolean).join("\n\n");
    },

    // 2. All code blocks combined
    async () => {
      const codes = await page.$$("pre code, code[class*='language-html'], pre[class*='language-html']");
      if (!codes.length) return null;
      const parts = await Promise.all(codes.map((c) => c.innerText().catch(() => "")));
      return parts.filter(Boolean).join("\n\n");
    },

    // 3. Message containers (exclude user/input)
    async () => {
      const msgs = await page.$$(
        '[class*="message"]:not([class*="input"]):not([class*="user"]):not([class*="human"])'
      );
      if (!msgs.length) return null;
      const parts = await Promise.all(msgs.map((m) => m.innerText().catch(() => "")));
      return parts.filter(Boolean).join("\n\n");
    },

    // 4. Markdown/prose areas
    async () => {
      const prose = await page.$$('[class*="markdown"], [class*="prose"], [class*="content-body"]');
      if (!prose.length) return null;
      const parts = await Promise.all(prose.map((p) => p.innerText().catch(() => "")));
      return parts.filter(Boolean).join("\n\n");
    },

    // 5. Main content area as last resort
    async () => {
      const main = await page.$("main, [role='main'], #main-content, .app-content, #root");
      if (!main) return null;
      return main.innerText().catch(() => null);
    },
  ];

  for (const strategy of strategies) {
    try {
      const text = await strategy();
      if (text && text.trim().length > 50) return text.trim();
    } catch {}
  }

  return "";
}

// ── AI Doctor — verify + complete + fix HTML ──────────────────────────────────
const DOCTOR_MODELS = [
  "google/gemini-2.5-flash-lite",  // fastest + cheapest
  "google/gemini-2.5-flash",       // fallback if lite is rate-limited or retired
  "openai/gpt-4o-mini",            // final fallback across providers
];

const DOCTOR_SYSTEM_PROMPT =
  "أنت مهندس HTML متخصص. مهمتك الوحيدة: استلام كود HTML مُولَّد من الذكاء الاصطناعي، " +
  "والتحقق منه وإصلاحه وإعادته كاملاً وصحيحاً.\n\n" +
  "القواعد الصارمة:\n" +
  "• أرجع الكود داخل ```html ... ``` فقط — لا شرح قبلها ولا بعدها إطلاقاً\n" +
  "• يجب أن تبدأ الصفحة بـ <!DOCTYPE html> وتنتهي بـ </html>\n" +
  "• أصلح أي خطأ JavaScript أو CSS أو HTML دون استثناء\n" +
  "• أكمل أي كود مقطوع بشكل منطقي يتناسب مع موضوع الصفحة\n" +
  "• لا تُضف أي مكتبة خارجية — كل الكود inline داخل الصفحة\n" +
  "• حافظ على direction: rtl والنصوص العربية\n" +
  "• لا تُبسّط التصميم — حافظ على الـ animations والعناصر التفاعلية\n" +
  "• إذا كان الكود سليماً 100% أعده كما هو بدون أي تعديل";

async function callDoctorModel(
  apiKey: string,
  model: string,
  rawHtml: string,
): Promise<string | null> {
  const userPrompt =
    `الكود المستلم:\n\n\`\`\`html\n${rawHtml}\n\`\`\`\n\n` +
    `أعد الكود بالكامل كاملاً وصحيحاً بدون أي خطأ:`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${apiKey}`,
      "HTTP-Referer": "https://learnukhba.replit.app",
      "X-Title":      "Nukhba Visual Explain Doctor",
    },
    body: JSON.stringify({
      model,
      max_tokens:  32_768,
      temperature: 0.05, // near-deterministic for code tasks
      messages: [
        { role: "system", content: DOCTOR_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(50_000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    console.warn(`[visual-explain/doctor] ${model} HTTP ${resp.status}: ${errText.slice(0, 150)}`);
    return null; // try next model
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?:   { message?: string };
  };

  if (data.error) {
    console.warn(`[visual-explain/doctor] ${model} API error: ${data.error.message ?? JSON.stringify(data.error)}`);
    return null;
  }

  const content = data?.choices?.[0]?.message?.content ?? "";
  if (!content) return null;

  // Extract HTML from model response
  const fixedBlocks = extractHtmlBlocks(content);
  if (fixedBlocks.length > 0) {
    const best = fixedBlocks.find(isHtmlComplete) ?? fixedBlocks[0];
    console.log(`[visual-explain/doctor] ${model} fixed HTML: ${rawHtml.length}→${best.length} chars`);
    return best;
  }

  // Bare HTML without fences
  const bare = content.match(/<!DOCTYPE html[\s\S]*<\/html>/i)?.[0];
  if (bare && isHtmlComplete(bare)) {
    console.log(`[visual-explain/doctor] ${model} returned bare HTML (${bare.length} chars)`);
    return bare;
  }

  console.warn(`[visual-explain/doctor] ${model} response had no valid HTML block`);
  return null;
}

async function fixHtmlWithAI(rawHtml: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey?.startsWith("sk-or-")) {
    console.warn("[visual-explain/doctor] No valid OPENROUTER_API_KEY — skipping AI doctor");
    return rawHtml;
  }

  if (rawHtml.length > MAX_HTML_DOCTOR_BYTES) {
    console.warn(
      `[visual-explain/doctor] HTML too large (${rawHtml.length} bytes > ${MAX_HTML_DOCTOR_BYTES}) — skipping`
    );
    return rawHtml;
  }

  for (const model of DOCTOR_MODELS) {
    try {
      const result = await callDoctorModel(apiKey, model, rawHtml);
      if (result) return result;
    } catch (err) {
      console.warn(
        `[visual-explain/doctor] Model ${model} threw: ${(err as Error).message?.slice(0, 100)}`
      );
    }
  }

  console.warn("[visual-explain/doctor] All 3 models failed — returning raw HTML");
  return rawHtml;
}

// ── Main visual explain logic ─────────────────────────────────────────────────
async function generateVisualHtml(teacherMessage: string): Promise<string> {
  const context = await getContext();
  const page    = await context.newPage();

  try {
    console.log("[visual-explain] Navigating to manus.im…");
    await page.goto(MANUS_APP_URL, {
      waitUntil: "domcontentloaded",
      timeout:   35_000,
    });
    await page.waitForTimeout(2_000);

    // Handle login redirect
    await ensureLoggedIn(page);
    await page.waitForTimeout(1_000);

    // If login redirected us away from manus.im entirely, navigate back
    if (!page.url().includes("manus.im")) {
      console.log("[visual-explain] Not at manus.im — navigating again…");
      await page.goto(MANUS_APP_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(2_000);
    }

    // Build the prompt
    const plainText = teacherMessage
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, PROMPT_PLAIN_CHARS);

    const prompt =
      `أنشئ صفحة HTML تفاعلية وبصرية جميلة تشرح المحتوى التالي:\n\n"${plainText}"\n\n` +
      `المتطلبات الإلزامية:\n` +
      `• صفحة HTML واحدة self-contained بدون أي ملف خارجي\n` +
      `• CSS و JavaScript مدمجَان داخل الصفحة بالكامل\n` +
      `• animations وعناصر تفاعلية جذابة ومبدعة\n` +
      `• تصميم احترافي بخلفية داكنة وألوان متناسقة\n` +
      `• نصوص عربية كاملة مع direction: rtl\n` +
      `• تشرح المفهوم بصرياً بطريقة تعليمية مبدعة\n` +
      `• مناسبة للعرض في iframe بدون scroll خارجي`;

    await sendMessage(page, prompt);
    await waitForResponseComplete(page);

    let accumulatedText = await scrapeAllAssistantText(page);
    let htmlBlocks      = extractHtmlBlocks(accumulatedText);
    let continuations   = 0;

    while (
      responseSeemsPartial(accumulatedText, htmlBlocks) &&
      continuations < MAX_CONTINUATIONS
    ) {
      continuations++;
      console.log(`[visual-explain] Continuation ${continuations}/${MAX_CONTINUATIONS}…`);
      await sendMessage(page, "أكمل الكود من حيث توقفت");
      await waitForResponseComplete(page);

      const newText    = await scrapeAllAssistantText(page);
      accumulatedText  = newText; // scrapeAll already returns ALL messages; no need to concat
      htmlBlocks       = extractHtmlBlocks(accumulatedText);
    }

    if (htmlBlocks.length === 0) {
      // Last resort: maybe the whole page IS the HTML (some manus.im modes render it directly)
      const pageSource = await page.content().catch(() => "");
      const pBlocks    = extractHtmlBlocks(pageSource);
      if (pBlocks.length > 0) {
        htmlBlocks = pBlocks;
        console.log("[visual-explain] Extracted HTML from page source (fallback)");
      }
    }

    if (htmlBlocks.length === 0) {
      throw new Error(
        `لم يتمكن النظام من استخراج كود HTML بعد ${continuations} متابعة — ` +
        `قد تكون manus.im غيّرت واجهتها`
      );
    }

    // Pick best block — prefer complete, then largest
    const completeBlocks = htmlBlocks.filter(isHtmlComplete);
    const best =
      completeBlocks.length > 0
        ? completeBlocks.reduce((a, b) => (b.length > a.length ? b : a))
        : htmlBlocks.reduce((a, b) => (b.length > a.length ? b : a));

    console.log(
      `[visual-explain] Best HTML: ${best.length} chars, complete=${isHtmlComplete(best)}, continuations=${continuations}`
    );

    return await fixHtmlWithAI(best);

  } finally {
    await page.close().catch(() => {});
  }
}

// ── Express route ─────────────────────────────────────────────────────────────
const router = Router();

router.post("/v4/visual-explain", async (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (_busy) {
    return res.status(429).json({
      error: "جارٍ معالجة طلب شرح بصري آخر. انتظر لحظات ثم حاول مجدداً.",
    });
  }

  const rawMessage = req.body?.message;
  if (!rawMessage || typeof rawMessage !== "string" || rawMessage.trim().length < 5) {
    return res.status(400).json({ error: "message مطلوب (5 أحرف على الأقل)" });
  }

  _busy = true;

  // Hard ceiling — prevents the request from hanging forever on the client side
  const hardTimer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: "استغرق إنشاء الشرح البصري وقتاً طويلاً. حاول مرة أخرى.",
      });
    }
    _busy = false;
  }, REQUEST_TIMEOUT_MS);

  try {
    // withRetry gives one automatic browser-reset retry on transient failures
    const html = await withRetry(() => generateVisualHtml(rawMessage.trim()));
    clearTimeout(hardTimer);

    if (!res.headersSent) {
      res.json({ html });
    }

  } catch (err) {
    clearTimeout(hardTimer);
    const message = (err as Error).message ?? "خطأ غير متوقع";
    console.error("[visual-explain] Final error:", message);

    // Invalidate context so the next request starts fresh
    await invalidateContext();

    if (!res.headersSent) {
      res.status(500).json({
        error: `فشل إنشاء الشرح البصري: ${message}`,
      });
    }
  } finally {
    _busy = false;
  }
});

export default router;
