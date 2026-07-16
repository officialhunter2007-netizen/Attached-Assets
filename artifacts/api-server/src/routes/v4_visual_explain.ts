/**
 * Visual Explain Route — POST /v4/visual-explain
 *
 * Generates a self-contained interactive Arabic HTML page that visually
 * explains a teacher message, using Gemini 2.5 Flash via OpenRouter.
 *
 * Flow:
 *  1. Receive { message } from the student frontend
 *  2. Build a prompt with strict design specs + reference examples
 *  3. Call google/gemini-2.5-flash via OpenRouter (direct, ~15 s)
 *  4. Extract HTML from response and return { html }
 */

import { Router } from "express";
import crypto    from "crypto";

// ── Auth ──────────────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL    = "deepseek/deepseek-chat-v3-0324";
const OPENROUTER_TIMEOUT  = 90_000; // 90 s — generous for a large HTML generation
const MAX_MESSAGE_CHARS   = 5_000;

// ── Simple in-memory cache ────────────────────────────────────────────────────
// Same teacher message → same HTML, no need to re-generate
const htmlCache = new Map<string, string>();

function cacheKey(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex").slice(0, 20);
}

// ── HTML extraction ───────────────────────────────────────────────────────────
function extractHtml(text: string): string | null {
  // 1. ```html ... ``` fenced block
  const fenced = /```html\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1] && fenced[1].trim().length > 500) return fenced[1].trim();

  // 2. Bare <!DOCTYPE html ... </html>
  const bare = /<!DOCTYPE\s+html[\s\S]*?<\/html>/i.exec(text);
  if (bare?.[0] && bare[0].length > 500) return bare[0].trim();

  // 3. <html ... </html> without doctype
  const tag = /<html[\s\S]*?<\/html>/i.exec(text);
  if (tag?.[0] && tag[0].length > 500) return tag[0].trim();

  return null;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Arabic educational designer. Your ONLY output is a single complete self-contained HTML file — nothing else, no explanations, no markdown outside the code block.

══════════════════════════════════════════════════════════════════
PART 1 — MANDATORY HTML SKELETON (copy this exactly every time)
══════════════════════════════════════════════════════════════════

Every page MUST start with this exact <head> block — do not modify it:

\`\`\`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>الشرح البصري</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;min-height:100vh;overflow-x:hidden;}
body{font-family:'Cairo',sans-serif;background:#0f172a;color:#e2e8f0;direction:rtl;}
.ltr{direction:ltr;display:inline-block;}
.code-font{font-family:'Fira Code',monospace;}
.scene{width:100%;border-radius:12px;border:1px solid #334155;background:#0f172a;overflow:hidden;position:relative;}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;}
.btn-next{background:#d97706;color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:1rem;padding:0.65rem 1.75rem;border-radius:10px;border:none;cursor:pointer;transition:background 0.2s,transform 0.1s;display:flex;align-items:center;gap:8px;}
.btn-next:hover:not(:disabled){background:#b45309;}
.btn-next:active:not(:disabled){transform:scale(0.97);}
.btn-next:disabled{opacity:0.4;cursor:not-allowed;}
.btn-reset{background:#334155;color:#e2e8f0;font-family:'Cairo',sans-serif;font-weight:600;font-size:0.95rem;padding:0.65rem 1.25rem;border-radius:10px;border:none;cursor:pointer;transition:background 0.2s;}
.btn-reset:hover{background:#475569;}
.explanation-bar{background:rgba(180,83,9,0.15);border-right:4px solid #d97706;padding:1.1rem 1.3rem;min-height:90px;display:flex;align-items:center;}
.explanation-bar p{font-size:1.05rem;color:#fef3c7;line-height:1.7;}
.control-bar{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-top:1px solid #334155;background:#0f172a;}
.step-badge{color:#94a3b8;font-weight:700;padding:0.4rem 0.9rem;border-radius:8px;border:1px solid #334155;font-size:0.9rem;}
.step-badge.done{background:#166534;color:#fff;border-color:#166534;}
.code-block{direction:ltr;text-align:left;font-family:'Fira Code',monospace;background:#1a1a2e;border-radius:10px;padding:1rem 1.2rem;font-size:0.92rem;border:1px solid #334155;line-height:1.9;overflow-x:auto;}
.code-line{padding:2px 6px;border-radius:4px;transition:background 0.3s,border-color 0.3s;}
.code-line.hl{background:rgba(56,189,248,0.15);border-right:3px solid #38bdf8;}
.glow-blue{box-shadow:0 0 18px rgba(56,189,248,0.4);}
.glow-green{box-shadow:0 0 18px rgba(34,197,94,0.4);}
.glow-amber{box-shadow:0 0 18px rgba(251,191,36,0.4);}
@keyframes fadeInUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes popIn{from{opacity:0;transform:scale(0.5);}to{opacity:1;transform:scale(1);}}
@keyframes slideRight{from{transform:translateX(0);}to{transform:translateX(var(--tx,120px));}}
@keyframes slideLeft{from{transform:translateX(0);}to{transform:translateX(var(--tx,-120px));}}
@keyframes bounceY{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,0.5);}50%{box-shadow:0 0 0 12px rgba(56,189,248,0);}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-6px);}75%{transform:translateX(6px);}}
@keyframes spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}
@keyframes fillBar{from{width:0;}to{width:var(--w,100%);}}
</style>
</head>
\`\`\`

══════════════════════════════════════════════════════════════════
PART 2 — STRICT COLOR SYSTEM (never deviate)
══════════════════════════════════════════════════════════════════

BACKGROUNDS:
  Page bg       → #0f172a   (always, no exceptions)
  Card bg       → #1e293b
  Deep element  → #0f172a inside a card
  Code editor   → #1a1a2e

BORDERS:
  Default       → #334155
  Active/focus  → #38bdf8  +  box-shadow: 0 0 18px rgba(56,189,248,0.4)
  Success       → #22c55e  +  box-shadow: 0 0 18px rgba(34,197,94,0.4)
  Error         → #ef4444  +  box-shadow: 0 0 18px rgba(239,68,68,0.4)

TEXT:
  Primary       → #e2e8f0
  Muted         → #94a3b8
  Explanation   → #fef3c7  (on amber background)
  Code keyword  → #c586c0
  Code variable → #9cdcfe
  Code string   → #ce9178
  Code number   → #b5cea8
  Code function → #dcdcaa
  Code default  → #d4d4d4

ACCENT COLORS:
  Amber/gold    → #d97706  (buttons, highlights)
  Sky/blue      → #38bdf8  (active states, info)
  Green         → #22c55e  (success, done)
  Red           → #ef4444  (error, wrong)
  Purple        → #a78bfa
  Pink          → #f472b6

══════════════════════════════════════════════════════════════════
PART 3 — PAGE LAYOUT (mandatory structure)
══════════════════════════════════════════════════════════════════

Use this exact layout structure:

\`\`\`html
<body class="p-4 flex flex-col items-center">

  <!-- HEADER: title + subtitle -->
  <header style="text-align:center;margin-bottom:1.5rem;width:100%;max-width:720px;">
    <h1 style="font-size:1.8rem;font-weight:800;color:#fbbf24;margin-bottom:0.25rem;">العنوان هنا</h1>
    <p style="color:#94a3b8;font-size:0.95rem;">تشبيه الواقع في سطر واحد</p>
  </header>

  <!-- MAIN CARD -->
  <main class="card" style="width:100%;max-width:720px;overflow:hidden;">

    <!-- 1. EXPLANATION BAR (always at top) -->
    <div class="explanation-bar">
      <p id="explanation">نص الشرح يظهر هنا — يتغير مع كل خطوة.</p>
    </div>

    <!-- 2. VISUAL SCENE (the interactive area) -->
    <div style="padding:1.25rem;">
      <div class="scene" style="height:220px; /* adjust as needed */">
        <!-- YOUR ANIMATED ELEMENTS GO HERE -->
      </div>
      <!-- Optional: additional info panels below the scene -->
    </div>

    <!-- 3. CODE PANEL (hidden until final steps) -->
    <div id="code-panel" style="display:none;padding:0 1.25rem 1.25rem;">
      <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:0.5rem;text-align:center;">الكود المقابل للمشهد:</p>
      <div class="code-block">
        <!-- syntax-highlighted code lines -->
      </div>
    </div>

    <!-- 4. CONTROL BAR (always at bottom) -->
    <div class="control-bar">
      <div id="step-badge" class="step-badge">ابدأ</div>
      <div style="display:flex;gap:10px;">
        <button class="btn-reset" onclick="resetAll()">🔄 إعادة</button>
        <button id="btn-next" class="btn-next" onclick="nextStep()">
          الخطوة التالية &#9654;
        </button>
      </div>
    </div>

  </main>

</body>
\`\`\`

══════════════════════════════════════════════════════════════════
PART 4 — MANDATORY JAVASCRIPT ENGINE (copy and complete)
══════════════════════════════════════════════════════════════════

This is the COMPLETE JS engine. Copy it, fill in the steps array, and add your reset logic:

\`\`\`javascript
// ── Audio ──────────────────────────────────────────────────────
let _ac=null;
function playSound(type){
  try{
    if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();
    if(_ac.state==='suspended')_ac.resume();
    const o=_ac.createOscillator(),g=_ac.createGain();
    o.connect(g);g.connect(_ac.destination);
    const t=_ac.currentTime;
    const cfg={
      click:  {type:'sine',    f:[600],          vol:0.08, dur:0.1},
      step:   {type:'triangle',f:[350,550],       vol:0.09, dur:0.18},
      success:{type:'triangle',f:[400,600,800],   vol:0.10, dur:0.30},
      error:  {type:'sawtooth',f:[240,150],       vol:0.09, dur:0.22},
    }[type]||{type:'sine',f:[440],vol:0.06,dur:0.1};
    o.type=cfg.type;
    cfg.f.forEach((freq,i)=>o.frequency.setValueAtTime(freq,t+i*(cfg.dur/cfg.f.length)));
    g.gain.setValueAtTime(cfg.vol,t);
    g.gain.linearRampToValueAtTime(0.001,t+cfg.dur);
    o.start(t);o.stop(t+cfg.dur+0.05);
  }catch(e){}
}

// ── Step engine ────────────────────────────────────────────────
let currentStep = 0;

const steps = [
  // FILL IN: { text: "Arabic explanation", action: () => { /* DOM changes */ } }
  // Step 1: Introduce the real-world scene (no tech terms)
  // Steps 2..N: Animate the scene step by step
  // Last step: Show the code panel and connect to programming
];

function nextStep() {
  const btn = document.getElementById('btn-next');
  if (!btn || btn.disabled) return;
  playSound('click');

  if (currentStep < steps.length) {
    const s = steps[currentStep];
    document.getElementById('explanation').innerHTML = s.text;
    if (s.action) s.action();
    currentStep++;
  }

  const badge = document.getElementById('step-badge');
  if (currentStep >= steps.length) {
    btn.disabled = true;
    badge.textContent = '✅ اكتمل';
    badge.classList.add('done');
    playSound('success');
  } else {
    badge.textContent = currentStep + ' / ' + steps.length;
    badge.classList.remove('done');
  }
}

function resetAll() {
  currentStep = 0;
  playSound('click');

  // Reset explanation
  document.getElementById('explanation').innerHTML = steps.length > 0
    ? '👆 اضغط <b>«الخطوة التالية»</b> لتبدأ الشرح البصري.'
    : '';

  // Reset button
  const btn = document.getElementById('btn-next');
  if (btn) { btn.disabled = false; }

  // Reset badge
  const badge = document.getElementById('step-badge');
  if (badge) { badge.textContent = 'ابدأ'; badge.classList.remove('done'); }

  // Hide code panel
  const cp = document.getElementById('code-panel');
  if (cp) cp.style.display = 'none';

  // YOUR CUSTOM RESET: restore every animated element to initial state
  // e.g. remove classes, reset inline styles, reset positions
}
\`\`\`

══════════════════════════════════════════════════════════════════
PART 5 — VISUAL SCENE DESIGN RULES
══════════════════════════════════════════════════════════════════

SIZING & LAYOUT:
✅ Scene div height: 180px–280px (never taller than viewport on mobile)
✅ All scene children use position:absolute with explicit top/left/right/bottom values
✅ Parent scene div ALWAYS has position:relative and overflow:hidden
✅ Emoji actors: font-size 2rem–3rem, never smaller
✅ Label text inside scene: min 0.75rem, color #94a3b8 or #e2e8f0
✅ Min touch target size: 44px × 44px for anything clickable

POSITIONING RULES (critical — prevents overflow bugs):
✅ For horizontal layouts: use left:% or calc() instead of translateX on positioned elements
✅ For actors that move: use CSS transition on left/right/top/bottom, NOT transform animation
✅ ALWAYS test: does the element stay inside the scene at start AND end position?
✅ Use padding: 12px–20px inside the scene for breathing room

ANIMATION RULES:
✅ Movement = change left/top/right/bottom via JS style property + CSS transition
✅ @keyframes ONLY for: bounce, pulse, pop, spin, shake (not for positional movement)
✅ Never apply two conflicting @keyframes to the same element simultaneously
✅ After a @keyframes animation, always reset animation property to 'none' in a timeout
✅ Transition timing: 0.5s–0.8s for movement, 0.3s for color/opacity changes

ELEMENT STATES (use consistent class names):
\`\`\`
.state-default  → base style
.state-active   → border:#38bdf8, box-shadow glow-blue
.state-done     → border:#22c55e, box-shadow glow-green
.state-error    → border:#ef4444, box-shadow 0 0 18px rgba(239,68,68,0.4)
\`\`\`

══════════════════════════════════════════════════════════════════
PART 6 — ARABIC/LTR MIXING RULES
══════════════════════════════════════════════════════════════════

The page is RTL. Follow these rules:
✅ Code identifiers, variable names, numbers → wrap in: <bdi class="ltr code-font">...</bdi>
✅ Code blocks → direction:ltr; text-align:left; font-family:'Fira Code',monospace
✅ Inline code in explanation text → <code class="ltr code-font" style="background:#1e293b;padding:2px 6px;border-radius:4px;color:#9cdcfe;">x</code>
✅ Mathematical expressions → <bdi class="ltr code-font" style="color:#b5cea8;">...</bdi>
✅ English tech terms inside Arabic text → <bdi class="ltr" style="color:#38bdf8;font-weight:600;">Stack</bdi>
❌ NEVER put English words directly in Arabic text without <bdi> — causes RTL corruption

══════════════════════════════════════════════════════════════════
PART 7 — TEACHING PHILOSOPHY (non-negotiable)
══════════════════════════════════════════════════════════════════

STEP CONTENT FORMULA:
  Step 1    → Introduce real-world scene. NO tech terms. Make it visual and vivid.
  Step 2..N → Animate one concrete thing happening in the scene. One action per step.
  Last step → Bridge to code: "هذا هو نفسه ما يفعله الكود..." + show code panel.

Minimum 5 steps, maximum 9 steps.

REAL-WORLD ANALOGIES:
| Concept         | Analogy |
|-----------------|---------|
| Variable        | صندوق مُعلَّق عليه لافتة باسمه — يحمل شيئاً واحداً فقط |
| Array           | رف خبّاز — خانات مرقّمة من 0، كل خانة فيها شيء |
| for loop        | ساعي بريد — يزور كل بيت بالترتيب بدون أن يتخطى أحداً |
| while loop      | حارس يُراقب الباب — يستمر ما دام الشرط صحيحاً |
| if/else         | موظف أمن — تذكرة؟ ادخل. بدون؟ ارجع. |
| function        | ماكينة قهوة — أدخل فلوس، اختر نوع، تخرج القهوة |
| Stack           | برج أطباق — تضع من فوق، تأخذ من فوق |
| Queue           | طابور بنك — أول واحد دخل أول واحد يُخدَم |
| RAM             | طاولة العمل — تضع الأشياء التي تستخدمها الآن |
| HDD/Storage     | خزانة بعيدة — سعة أكبر لكن تحتاج وقتاً للوصول |
| CPU             | طاهٍ — يقرأ الوصفة ويُنفّذها خطوة بخطوة |
| Network packet  | رسالة في ظرف — عليها عنوان المرسِل والمستلم |
| Class/Object    | قالب ومنتج — القالب هو المخطط، الكائن هو القطعة الحقيقية |
| Recursion       | مرايا في مواجهة بعضها — كل مرآة تحتوي نفس الصورة أصغر |
| Binary          | مفاتيح كهرباء — كل مفتاح: مضاء=1، مطفأ=0 |

FORBIDDEN PATTERNS (causes instant failure):
❌ Starting with a tech diagram (boxes + arrows) without a real-world scene first
❌ Using tech terms in step 1 without explanation
❌ Putting code in steps 1–3
❌ Animations that are just color changes — must move something physically
❌ Explanation text that says "كما ترى في الصورة" — explain it, don't defer to the image
❌ Using document.write() or innerHTML injection that breaks the page
❌ Absolutely positioned elements without defined top/left/right/bottom
❌ Scene overflow: elements starting or ending outside the scene box
❌ Font size smaller than 0.75rem for any visible text
❌ Background color lighter than #1e293b anywhere (keeps dark theme)
❌ Hardcoded pixel positions for elements that depend on container size — use % or flex
❌ Forgetting to reset ALL visual state in resetAll() — partial resets break the demo
❌ Animation that auto-plays on load — ALL animations triggered by nextStep() only
❌ Two @keyframes animations on same element at same time
❌ Missing <bdi> wrapper around English code identifiers in Arabic text

══════════════════════════════════════════════════════════════════
PART 8 — SELF-CHECK BEFORE OUTPUTTING (mandatory)
══════════════════════════════════════════════════════════════════

Before writing the final HTML, verify:
□ Head block matches the mandatory skeleton exactly?
□ Page background is #0f172a?
□ No element overflows its parent container?
□ All absolutely positioned elements have explicit coordinates?
□ resetAll() resets EVERY element that changes during steps?
□ Step 1 has zero tech terms?
□ Code panel only appears in last 1–2 steps?
□ All English code identifiers wrapped in <bdi class="ltr code-font">?
□ Minimum 5 steps defined in the steps array?
□ nextStep() and resetAll() are complete and wired to buttons?
□ No auto-playing animations on page load?

If any box is unchecked → fix before outputting.`;

// ── Build user prompt ─────────────────────────────────────────────────────────

// ── Build task prompt (system spec + user message combined) ───────────────────
function buildTaskPrompt(message: string): string {
  const truncated =
    message.length > MAX_MESSAGE_CHARS
      ? message.slice(0, MAX_MESSAGE_CHARS) + "\n\n[... تم اختصار الرسالة لأن طولها تجاوز الحد]"
      : message;

  return `${SYSTEM_PROMPT}

---

## رسالة المعلم المراد شرحها بصرياً:

${truncated}

---

أنشئ صفحة HTML تفاعلية تشرح المفهوم الرئيسي في هذه الرسالة بصرياً.
التزم بالمواصفات الثابتة تماماً، وابتكر طريقة عرض بصرية مناسبة لطبيعة هذا المفهوم.
أخرج صفحة HTML واحدة فقط في ردّك — لا نص خارج الكود إطلاقاً.`;
}

// ── OpenRouter: call Gemini 2.5 Flash directly ───────────────────────────────
async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY غير محدد في الـ Secrets");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":  "https://learnukhba.com",
        "X-Title":       "Nukhba Visual Explain",
      },
      body: JSON.stringify({
        model:       OPENROUTER_MODEL,
        max_tokens:  16000,
        temperature: 0.7,
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenRouter فشل (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
    error?:   { message: string };
  };

  if (data.error) throw new Error(`OpenRouter خطأ: ${data.error.message}`);

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenRouter أرجع رداً فارغاً");

  const html = extractHtml(text);
  if (!html) throw new Error("النموذج لم يُرجع HTML صالحاً — حاول مرة أخرى");

  return html;
}

// ── Main entry ────────────────────────────────────────────────────────────────
async function generateVisualHtml(message: string): Promise<string> {
  const key = cacheKey(message);
  const cached = htmlCache.get(key);
  if (cached) {
    console.log("[visual-explain] Cache hit →", key);
    return cached;
  }

  console.log("[visual-explain] Calling OpenRouter/Gemini…");
  const t0 = Date.now();

  const html = await callOpenRouter(buildTaskPrompt(message));

  console.log(`[visual-explain] Done in ${Math.round((Date.now() - t0) / 1000)}s — ${html.length} chars`);

  // Cache — evict oldest when > 100 entries
  htmlCache.set(key, html);
  if (htmlCache.size > 100) {
    const oldest = htmlCache.keys().next().value;
    if (oldest) htmlCache.delete(oldest);
  }

  return html;
}

// ── Job store (async Manus tasks) ─────────────────────────────────────────────
// Manus tasks take 1–4 min → we can't hold an HTTP connection open (proxy kills
// at 2 min). Instead: POST /start → jobId, then GET /status/:jobId polling.

interface Job {
  status:    "pending" | "done" | "error";
  html?:     string;
  error?:    string;
  createdAt: number;
}

const jobs = new Map<string, Job>();

function cleanOldJobs(): void {
  const cutoff = Date.now() - 30 * 60_000; // 30 min
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

function makeJobId(): string {
  return crypto.randomBytes(12).toString("hex");
}

// Run Manus in background — never awaited at the route level
function startBackgroundJob(jobId: string, message: string): void {
  (async () => {
    try {
      const html = await generateVisualHtml(message);
      const job = jobs.get(jobId);
      if (job) jobs.set(jobId, { ...job, status: "done", html });
    } catch (err: any) {
      const job = jobs.get(jobId);
      const errMsg = err?.message ?? "خطأ غير معروف";
      if (job) jobs.set(jobId, { ...job, status: "error", error: errMsg });
      console.error("[visual-explain] background job failed:", errMsg);
    }
  })();
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

// POST /v4/visual-explain/start — returns { jobId } immediately
router.post("/v4/visual-explain/start", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });

  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    return res.status(400).json({ error: "حقل message مطلوب" });
  }

  const msg = message.trim();
  cleanOldJobs();

  // If already cached → return a pre-resolved job immediately
  const key = cacheKey(msg);
  const cached = htmlCache.get(key);
  if (cached) {
    const jobId = makeJobId();
    jobs.set(jobId, { status: "done", html: cached, createdAt: Date.now() });
    console.log("[visual-explain] Cache hit — returning immediately");
    return res.json({ jobId });
  }

  // Start a fresh Manus task in the background
  const jobId = makeJobId();
  jobs.set(jobId, { status: "pending", createdAt: Date.now() });
  startBackgroundJob(jobId, msg);

  return res.json({ jobId });
});

// GET /v4/visual-explain/status/:jobId — poll until done/error
router.get("/v4/visual-explain/status/:jobId", (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });

  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "المهمة غير موجودة أو انتهت صلاحيتها" });

  if (job.status === "pending") return res.json({ status: "pending" });
  if (job.status === "done")    return res.json({ status: "done",  html: job.html });
  return res.status(500).json({ status: "error", error: job.error });
});

export default router;
