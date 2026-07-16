/**
 * Visual Explain Route — /v4/visual-explain
 *
 * Uses Playwright + manus.im to generate a self-contained interactive HTML
 * page that visually explains a teacher message. The student triggers this
 * explicitly by clicking the "شرح بصري" button in the chat UI.
 *
 * Flow:
 *  1. Receive POST with { message: string }
 *  2. Launch/reuse headless Chromium, maintain manus.im session via cookies
 *  3. Navigate to the pre-configured manus.im app URL
 *  4. Send crafted prompt; wait for response
 *  5. If response is partial, send "أكمل" up to MAX_CONTINUATIONS times
 *  6. Extract, validate, and return the HTML string
 */

import { Router } from "express";
import type { Browser, BrowserContext, Page } from "playwright-core";
import fs from "fs";

function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

const router = Router();

// ── Constants ────────────────────────────────────────────────────────────────
const MANUS_APP_URL = "https://manus.im/app/22FeoQNbqHXYsOhRScAosc";
const SESSION_FILE = "/tmp/manus-session.json";
const RESPONSE_TIMEOUT_MS = 100_000; // 100 s waiting for manus to finish
const MAX_CONTINUATIONS = 3;
const REQUEST_TIMEOUT_MS = 150_000; // max time for the whole request

// ── Singleton browser state ───────────────────────────────────────────────────
let _browser: Browser | null = null;
let _context: BrowserContext | null = null;
let _busy = false;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;

  // playwright-core is already installed; point it at the system chromium
  // that lives in the Nix environment ($PATH → /nix/store/…/bin/chromium).
  const { chromium } = await import("playwright-core");
  const executablePath =
    process.env.CHROMIUM_PATH ||
    (await findChromium()) ||
    "chromium";

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
    ],
  });
  _context = null;
  return _browser;
}

async function findChromium(): Promise<string | null> {
  const { execSync } = await import("child_process");
  try {
    return execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null", { encoding: "utf-8" }).trim() || null;
  } catch { return null; }
}

async function getContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  if (_context) return _context;

  _context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "ar",
    timezoneId: "Asia/Aden",
    viewport: { width: 1280, height: 800 },
  });

  // Restore saved cookies (if any)
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      if (Array.isArray(cookies) && cookies.length > 0) {
        await _context.addCookies(cookies);
      }
    } catch { /* ignore bad session file */ }
  }

  return _context;
}

async function saveSession(context: BrowserContext): Promise<void> {
  try {
    const cookies = await context.cookies();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
  } catch { /* best-effort */ }
}

// ── Login handling ────────────────────────────────────────────────────────────
async function ensureLoggedIn(page: Page): Promise<void> {
  const url = page.url();
  const needsLogin =
    url.includes("/login") ||
    url.includes("/signin") ||
    url.includes("/auth") ||
    url.includes("sign-in");

  // Also check if there's an email input on the current page
  const hasEmailInput = await page
    .$('input[type="email"], input[name="email"]')
    .then((el) => !!el)
    .catch(() => false);

  if (!needsLogin && !hasEmailInput) return;

  const email = process.env.MANUS_EMAIL;
  const password = process.env.MANUS_PASSWORD;
  if (!email || !password) {
    throw new Error("MANUS_EMAIL / MANUS_PASSWORD environment secrets are not set");
  }

  console.log("[visual-explain] Logging in to manus.im…");

  // Fill email
  const emailEl = await page.waitForSelector(
    'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    { timeout: 15_000 }
  );
  await emailEl.fill(email);
  await page.waitForTimeout(300);

  // Fill password
  const pwEl = await page.waitForSelector(
    'input[type="password"], input[name="password"]',
    { timeout: 10_000 }
  );
  await pwEl.fill(password);
  await page.waitForTimeout(300);

  // Submit
  const submitBtn = await page
    .$('button[type="submit"]')
    .catch(() => null);
  if (submitBtn) {
    await submitBtn.click();
  } else {
    await page.keyboard.press("Enter");
  }

  // Wait until we leave the login page (up to 30 s)
  await page
    .waitForFunction(
      () =>
        !location.href.includes("/login") &&
        !location.href.includes("/signin") &&
        !location.href.includes("/auth"),
      { timeout: 30_000 }
    )
    .catch(() => {
      throw new Error("Login failed — still on login page after 30 s");
    });

  await saveSession(page.context());
  console.log("[visual-explain] Login successful");
}

// ── Chat input helpers ────────────────────────────────────────────────────────
const INPUT_SELECTORS = [
  'textarea:not([readonly]):not([disabled])',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]',
  '[data-testid*="chat-input"]',
  '[data-testid*="message-input"]',
  '[class*="chat-input"] textarea',
  '[class*="input-area"] textarea',
  '[class*="message-input"]',
];

const SEND_SELECTORS = [
  'button[type="submit"]',
  '[aria-label="Send"]',
  '[aria-label="send"]',
  '[aria-label*="发送"]',
  '[data-testid*="send"]',
  '[class*="send-button"]',
  '[class*="submit-button"]',
];

const LOADING_SELECTORS = [
  '[class*="loading"]',
  '[class*="thinking"]',
  '[class*="generating"]',
  '[class*="spinner"]',
  '[class*="pending"]',
  ".animate-spin",
  "[aria-busy='true']",
];

async function findInput(page: Page): Promise<import("playwright-core").Locator> {
  for (const sel of INPUT_SELECTORS) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      const visible = await page.locator(sel).first().isVisible().catch(() => false);
      if (visible) {
        console.log(`[visual-explain] Input found: ${sel}`);
        return page.locator(sel).first();
      }
    }
  }
  throw new Error("Could not locate manus.im chat input field");
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = await findInput(page);
  await input.click();
  await input.fill(text);
  await page.waitForTimeout(400);

  // Try dedicated send button first
  for (const sel of SEND_SELECTORS) {
    const btn = page.locator(sel).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      console.log(`[visual-explain] Sent via button: ${sel}`);
      return;
    }
  }

  // Fallback: Ctrl+Enter or Enter
  await page.keyboard.press("Control+Enter");
  console.log("[visual-explain] Sent via Ctrl+Enter");
}

async function waitForResponseComplete(page: Page): Promise<void> {
  // 1. Wait a moment for loading indicators to appear
  await page.waitForTimeout(2_000);

  // 2. Wait for every loading indicator to disappear
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let anyVisible = false;
    for (const sel of LOADING_SELECTORS) {
      const v = await page.locator(sel).first().isVisible().catch(() => false);
      if (v) { anyVisible = true; break; }
    }
    if (!anyVisible) break;
    await page.waitForTimeout(1_000);
  }

  // 3. Extra stabilisation
  await page.waitForTimeout(1_500);
}

// ── HTML extraction ───────────────────────────────────────────────────────────
function extractHtmlBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Fenced ```html … ``` blocks
  const htmlFenced = /```html\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlFenced.exec(text)) !== null) {
    const b = m[1].trim();
    if (b.length > 100) blocks.push(b);
  }

  // Generic fenced block starting with <!DOCTYPE or <html
  if (blocks.length === 0) {
    const genericFenced = /```\s*(<!DOCTYPE[\s\S]*?<\/html>)\s*```/gi;
    while ((m = genericFenced.exec(text)) !== null) {
      const b = m[1].trim();
      if (b.length > 100) blocks.push(b);
    }
  }

  // Bare HTML (no backticks) as last resort
  if (blocks.length === 0) {
    const bare = /<!DOCTYPE html[\s\S]*?<\/html>/gi;
    while ((m = bare.exec(text)) !== null) {
      const b = m[0].trim();
      if (b.length > 100) blocks.push(b);
    }
  }

  return blocks;
}

function isHtmlComplete(html: string): boolean {
  return (
    html.length > 200 &&
    (html.includes("<!DOCTYPE") || html.includes("<html")) &&
    html.includes("</html>")
  );
}

function responseSeemsPartial(text: string): boolean {
  // manus.im sometimes stops mid-code and signals continuation
  if (extractHtmlBlocks(text).length === 0) return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("يتبع") ||
    lower.includes("الجزء الأول") ||
    lower.includes("أكمل الكود") ||
    lower.includes("سأكمل") ||
    /```html[^`]*$/.test(text) // open code block without closing ```
  );
}

async function scrapeLastAssistantText(page: Page): Promise<string> {
  // Strategy list — tried in order, returns first non-empty result
  const strategies: Array<() => Promise<string | null>> = [
    // 1. Elements explicitly marked as assistant/AI
    async () => {
      const els = await page.$$('[data-role="assistant"], [class*="assistant-message"], [class*="ai-message"]');
      if (!els.length) return null;
      return await els[els.length - 1].innerText();
    },
    // 2. All code blocks (for when the whole response is code)
    async () => {
      const codes = await page.$$("pre code, code[class*='language-html']");
      if (!codes.length) return null;
      const parts = await Promise.all(codes.map((c) => c.innerText()));
      return parts.join("\n\n");
    },
    // 3. Generic message containers
    async () => {
      const msgs = await page.$$('[class*="message"]:not([class*="input"]):not([class*="user"])');
      if (!msgs.length) return null;
      return await msgs[msgs.length - 1].innerText();
    },
    // 4. Markdown/prose containers
    async () => {
      const prose = await page.$$('[class*="markdown"], [class*="prose"], [class*="content-body"]');
      if (!prose.length) return null;
      const parts = await Promise.all(prose.map((p) => p.innerText()));
      return parts[parts.length - 1] ?? null;
    },
    // 5. Last-resort: all visible text in main area
    async () => {
      const main = await page.$("main, [role='main'], #main-content, .app-content");
      return main ? main.innerText() : null;
    },
  ];

  for (const s of strategies) {
    const txt = await s().catch(() => null);
    if (txt && txt.trim().length > 50) return txt.trim();
  }
  return "";
}

// ── Main visual explain logic ─────────────────────────────────────────────────
async function generateVisualHtml(teacherMessage: string): Promise<string> {
  const context = await getContext();
  const page = await context.newPage();

  try {
    // Navigate to the pre-configured manus.im app
    console.log("[visual-explain] Navigating to manus.im…");
    await page.goto(MANUS_APP_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(2_000);

    // Login if redirected to auth
    await ensureLoggedIn(page);
    await page.waitForTimeout(1_000);

    // If we ended up somewhere other than our app, navigate back
    if (!page.url().includes("/app/")) {
      await page.goto(MANUS_APP_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(2_000);
    }

    // Strip HTML tags and truncate so the prompt stays reasonable
    const plainText = teacherMessage
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2_500);

    const prompt =
      `أنشئ صفحة HTML تفاعلية وبصرية جميلة تشرح المحتوى التالي:\n\n"${plainText}"\n\n` +
      `المتطلبات الإلزامية:\n` +
      `• صفحة HTML كاملة self-contained في ملف واحد\n` +
      `• CSS و JavaScript مدمجَان داخل الصفحة بدون مكتبات خارجية\n` +
      `• animations وعناصر تفاعلية جذابة\n` +
      `• تصميم احترافي بخلفية داكنة وألوان جذابة\n` +
      `• نصوص عربية كاملة مع direction: rtl\n` +
      `• تشرح المفهوم بصرياً بطريقة مبدعة وتعليمية\n` +
      `• مناسبة للعرض في iframe`;

    // Send first message
    await sendMessage(page, prompt);
    await waitForResponseComplete(page);

    let accumulatedText = await scrapeLastAssistantText(page);
    let htmlBlocks = extractHtmlBlocks(accumulatedText);

    // Handle continuation if response seems partial
    let continuations = 0;
    while (
      (htmlBlocks.length === 0 || responseSeemsPartial(accumulatedText)) &&
      continuations < MAX_CONTINUATIONS
    ) {
      console.log(`[visual-explain] Requesting continuation ${continuations + 1}/${MAX_CONTINUATIONS}`);
      await sendMessage(page, "أكمل");
      await waitForResponseComplete(page);
      const newText = await scrapeLastAssistantText(page);
      accumulatedText += "\n" + newText;
      htmlBlocks = extractHtmlBlocks(accumulatedText);
      continuations++;
    }

    if (htmlBlocks.length === 0) {
      throw new Error("لم يتمكن النظام من استخراج كود HTML من استجابة manus.im");
    }

    // Pick the best block (prefer a complete one)
    const best = htmlBlocks.find(isHtmlComplete) ?? htmlBlocks[0];

    console.log(
      `[visual-explain] Extracted HTML (${best.length} chars, continuations=${continuations})`
    );
    return best;
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post("/v4/visual-explain", async (req, res) => {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (_busy) {
    return res
      .status(429)
      .json({ error: "جارٍ معالجة طلب توضيح بصري آخر. انتظر لحظات ثم حاول مجدداً." });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return res.status(400).json({ error: "message is required" });
  }

  _busy = true;

  // Set a hard overall timeout so the request doesn't hang forever
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: "استغرق إنشاء الشرح البصري وقتاً طويلاً. حاول مجدداً." });
    }
    _busy = false;
  }, REQUEST_TIMEOUT_MS);

  try {
    const html = await generateVisualHtml(message);
    clearTimeout(timer);
    if (!res.headersSent) {
      res.json({ html });
    }
  } catch (err) {
    clearTimeout(timer);
    console.error("[visual-explain] Error:", err);
    // Invalidate the browser context so next call gets a fresh one
    try { await _context?.close(); } catch {}
    _context = null;
    if (!res.headersSent) {
      res.status(500).json({
        error: `فشل إنشاء الشرح البصري: ${(err as Error).message ?? "خطأ غير متوقع"}`,
      });
    }
  } finally {
    _busy = false;
  }
});

export default router;
