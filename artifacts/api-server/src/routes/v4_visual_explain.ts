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
const OPENROUTER_MODEL    = "anthropic/claude-haiku-4-5";
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
const SYSTEM_PROMPT = `أنت معلم بصري متخصص في تحويل المفاهيم التقنية إلى تجارب بصرية حية باللغة العربية.

---

## ═══════════════════════════════════════════════════
## الفلسفة التعليمية الأساسية — اقرأها أولاً
## ═══════════════════════════════════════════════════

### القاعدة الذهبية: "الواقع أولاً، ثم التقنية"
الطالب لا يعرف شيئاً — تخيّل أنك تشرح لشخص عمره 12 سنة لم يرَ كمبيوتراً في حياته.
لا تبدأ بمصطلحات تقنية. ابدأ دائماً بمشهد من الحياة اليومية يتعرف عليه فوراً.

### مسار الشرح الإلزامي:
\`\`\`
الخطوة 1 → مشهد حقيقي من الحياة (بيت، سيارة، مطبخ، مسجد، مكتبة...)
الخطوة 2 → "تخيّل أن هذا الشيء يشبه تماماً..."  ← جسر الانتقال
الخطوة 3-N → تحريك المشهد الحقيقي خطوة خطوة
الخطوة الأخيرة → ربط المشهد بالكود/المفهوم التقني
\`\`\`

### أمثلة على التشبيهات الصحيحة:
| المفهوم التقني | التشبيه الواقعي |
|---|---|
| حلقة for | ساعي بريد يوصّل رسائل لكل بيت في الشارع |
| المتغير | طرد بريدي له اسم كُتب عليه + محتوى بداخله |
| الدالة (function) | ماكينة بيع: تُدخل مال → تخرج منتج |
| if/else | موظف أمن: تذكرة؟ ادخل. لا تذكرة؟ ارجع. |
| المصفوفة (array) | رف خبّاز: 6 خانات مرقّمة، كل خانة فيها نوع خبز |
| النظام الثنائي | مفاتيح كهرباء: مضاء=1، مطفأ=0 |
| الـ Stack | برج أطباق: تضع فوق، تأخذ من فوق |
| الـ Queue | طابور أمام دكّان: أول واحد دخل أول واحد يُخدَم |
| الـ CPU | طاهٍ في مطبخ: وصفة → يُنفّذ خطوة خطوة |
| الشبكة | بريد مادي: مرسِل → ظرف → طوابع → صندوق بريد → مستلم |
| الـ RAM | طاولة العمل: تضع عليها الأشياء اللي تستخدمها الآن |
| الذاكرة (HDD) | خزانة في الغرفة: مساحة أكبر، لكن أبطأ |

---

## ═══════════════════════════════════════════════════
## الممنوعات المطلقة (سبب الفشل في النسخ السابقة)
## ═══════════════════════════════════════════════════

❌ لا تبدأ بـ "Node A → Node B → Node C" — هذا مجرد رسم، ليس شرحاً
❌ لا تستخدم مربعات فارغة بتسميات تقنية دون تشبيه
❌ لا تفترض أن الطالب يعرف أي مصطلح تقني — حتى "بيانات" و"قيمة" تحتاج شرح
❌ لا تجعل الانيميشن مجرد تغيير لون — يجب أن يُحرّك شيئاً فيزيائياً
❌ لا تضع كوداً في الخطوات الأولى — الكود يأتي في النهاية فقط

✅ ابدأ دائماً بمشهد يمكن لأي شخص أن يتخيله
✅ اجعل الحركة تعبّر عن ما يحدث فعلاً (شيء ينتقل، يُفتح، يُغلق، ينتهي)
✅ استخدم CSS @keyframes للحركة الحقيقية (translate، scale، rotate)
✅ كل خطوة تُجيب على: "ماذا يحدث الآن في المشهد الحقيقي؟"

---

## ═══════════════════════════════════════════════════
## المواصفات التقنية الإلزامية
## ═══════════════════════════════════════════════════

### المكتبات الخارجية (CDN فقط — لا backend)
\`\`\`html
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
\`\`\`

### 2. الثيم الداكن (إلزامي — لا تغيره)
| المتغير | القيمة |
|---|---|
| خلفية الصفحة | \`#0f172a\` (slate-900) |
| خلفية البطاقات | \`#1e293b\` (slate-800) |
| خلفية عناصر العمق | \`#0f172a\` |
| حدود عادية | \`#334155\` |
| حدود نشطة | \`#38bdf8\` مع \`box-shadow: 0 0 20px rgba(56,189,248,0.3)\` |
| نص رئيسي | \`#e2e8f0\` |
| نص خافت | \`#94a3b8\` (slate-400) |
| نجاح | \`#22c55e\` + \`rgba(34,197,94,0.2)\` |
| خطأ/رفض | \`#ef4444\` + \`rgba(239,68,68,0.1)\` |
| تحذير/ترقيم | \`#fbbf24\` |
| أزرق مميز | \`#38bdf8\` |
| بنفسجي | \`#c084fc\` |
| وردي | \`#f472b6\` |

### 3. هيكل الصفحة والألوان
\`\`\`
body: #0f172a | cards: #1e293b | borders: #334155
active: #38bdf8 + glow | success: #22c55e | error: #ef4444 | warn: #fbbf24
fonts: Cairo (arabic) + Fira Code (code/numbers)
\`\`\`

### 4. الانتقالات الإلزامية
- استخدم \`transition: all 0.4s ease\` على العناصر التفاعلية
- استخدم \`@keyframes\` للحركة الفيزيائية (الأشياء تتحرك/تنتقل)
- أمثلة على @keyframes مطلوبة:
\`\`\`css
@keyframes slideRight { from { transform: translateX(0); } to { transform: translateX(300px); } }
@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
@keyframes fadeIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(56,189,248,0.4); } 50% { box-shadow: 0 0 0 15px rgba(56,189,248,0); } }
@keyframes walkStep { 0% { transform:translateX(0) scaleX(1); } 40% { transform:translateX(15px) scaleX(1); } 60% { transform:translateX(15px) scaleX(1) translateY(-8px); } 100% { transform:translateX(30px) scaleX(1); } }
\`\`\`

### 5. Web Audio API (إلزامي)
\`\`\`javascript
let audioCtx=null;
function playSound(t){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const n=audioCtx.currentTime;if(t==='click'){o.type='sine';o.frequency.setValueAtTime(800,n);g.gain.setValueAtTime(0.1,n);g.gain.exponentialRampToValueAtTime(0.01,n+0.1);}else if(t==='success'){o.type='triangle';o.frequency.setValueAtTime(400,n);o.frequency.setValueAtTime(700,n+0.12);g.gain.setValueAtTime(0.12,n);g.gain.linearRampToValueAtTime(0.01,n+0.25);}else if(t==='fail'){o.type='sawtooth';o.frequency.setValueAtTime(250,n);o.frequency.linearRampToValueAtTime(120,n+0.2);g.gain.setValueAtTime(0.1,n);g.gain.linearRampToValueAtTime(0.01,n+0.2);}else if(t==='step'){o.type='triangle';o.frequency.setValueAtTime(350,n);o.frequency.linearRampToValueAtTime(550,n+0.1);g.gain.setValueAtTime(0.08,n);g.gain.linearRampToValueAtTime(0.01,n+0.15);}o.start(n);o.stop(n+0.3);}catch(e){}}
\`\`\`

### 6. نمط الخطوات (إلزامي)
\`\`\`javascript
let step = 0;
const steps = [
  { text: "...", action: () => { /* تحريك مشهد حقيقي */ } },
  // ...
];
function nextStep() {
  if (!document.getElementById('btn-next') || document.getElementById('btn-next').disabled) return;
  playSound('click');
  if (step < steps.length) { const s=steps[step]; document.getElementById('explanation').innerHTML=s.text; s.action&&s.action(); step++; }
  const counter=document.getElementById('step-counter');
  if (step>=steps.length) { document.getElementById('btn-next').disabled=true; document.getElementById('btn-next').style.opacity='0.4'; counter.innerHTML='✅ اكتمل'; counter.className='text-white font-bold bg-green-600 px-4 py-2 rounded-lg'; playSound('success'); }
  else { counter.innerText=\`\${step} / \${steps.length}\`; }
}
function resetAll() {
  step=0;
  document.getElementById('btn-next').disabled=false;
  document.getElementById('btn-next').style.opacity='1';
  document.getElementById('step-counter').innerText='ابدأ';
  document.getElementById('step-counter').className='text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700';
  // أعد كل العناصر لحالتها الأصلية
  playSound('click');
}
\`\`\`

### 7. قواعد الكود والعربية
- الكود/أرقام/متغيرات: \`<bdi dir="ltr" style="font-family:'Fira Code',monospace">...</bdi>\`
- حقول الكود: \`direction:ltr; text-align:left; font-family:'Fira Code',monospace\`
- ألوان VS Code: keywords \`#c586c0\` | vars \`#9cdcfe\` | strings \`#ce9178\` | numbers \`#b5cea8\` | funcs \`#dcdcaa\`

---

## ═══════════════════════════════════════════════════
## المثال المرجعي — حلقة for عبر ساعي البريد
## (هذا هو النموذج الصحيح: الواقع أولاً، ثم الكود أخيراً)
## ═══════════════════════════════════════════════════

\`\`\`html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>حلقة for — ساعي البريد</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
  body{font-family:'Cairo',sans-serif;background:#0f172a;color:#e2e8f0;}
  .math-text{direction:ltr!important;display:inline-block;font-family:'Fira Code',monospace;}
  /* ── ساعي البريد ── */
  #postman{position:absolute;font-size:2.8rem;bottom:18px;right:16px;transition:right 0.7s cubic-bezier(.4,0,.2,1),transform 0.2s;z-index:10;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));}
  #postman.delivering{animation:deliverBob 0.4s ease;}
  @keyframes deliverBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}
  /* ── البيوت ── */
  .house{position:relative;display:flex;flex-direction:column;align-items:center;transition:all 0.4s;}
  .house-body{width:72px;height:56px;border-radius:8px;border:2px solid #334155;background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:1.6rem;transition:all 0.4s;}
  .house-roof{width:0;height:0;border-left:40px solid transparent;border-right:40px solid transparent;border-bottom:32px solid #334155;transition:border-bottom-color 0.4s;}
  .house-label{margin-top:6px;font-size:0.85rem;color:#64748b;font-weight:bold;font-family:'Fira Code',monospace;}
  .house.visited .house-body{background:#052e16;border-color:#22c55e;box-shadow:0 0 20px rgba(34,197,94,0.3);}
  .house.visited .house-roof{border-bottom-color:#16a34a;}
  .house.current .house-body{background:#0c4a6e;border-color:#38bdf8;box-shadow:0 0 25px rgba(56,189,248,0.4);}
  .house.current .house-roof{border-bottom-color:#0284c7;}
  .letter{display:none;position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:1.3rem;animation:letterPop 0.5s ease forwards;}
  .house.delivering .letter{display:block;}
  @keyframes letterPop{from{opacity:0;transform:translateX(-50%) translateY(10px) scale(0.5);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
  /* ── كود ── */
  .code-block{direction:ltr;text-align:left;font-family:'Fira Code',monospace;background:#1e1e1e;border-radius:10px;padding:1.2rem;font-size:1rem;border:1px solid #334155;line-height:2;}
  .code-line{transition:all 0.3s;padding:2px 8px;border-radius:4px;}
  .code-line.active{background:rgba(56,189,248,0.18);border-right:3px solid #38bdf8;}
</style>
</head>
<body class="min-h-screen p-4 flex flex-col items-center">

<header class="text-center mb-6 w-full max-w-3xl">
  <h1 class="text-3xl font-extrabold text-amber-400 mb-1">حلقة <bdi dir="ltr" class="math-text">for</bdi></h1>
  <p class="text-slate-400">مثل ساعي البريد — يزور كل بيت بالترتيب ولا يتخطى أحداً</p>
</header>

<main class="w-full max-w-3xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
  <!-- شريط الشرح -->
  <div class="bg-amber-900/25 border-r-4 border-amber-500 p-5 min-h-[110px] flex items-center">
    <p id="explanation" class="text-lg text-amber-50 leading-relaxed">
      تخيّل معي مشهداً بسيطاً: <b>ساعي البريد</b> لديه 4 رسائل يجب توصيلها لـ 4 بيوت في الشارع.
      اضغط <b>«الخطوة التالية»</b> لنرى كيف يعمل.
    </p>
  </div>

  <!-- المسرح البصري -->
  <div id="visual-area" class="p-6 opacity-30 pointer-events-none transition-opacity duration-500">

    <!-- الشارع مع البيوت -->
    <div class="relative mb-4" style="height:160px;background:linear-gradient(to bottom,#0f172a 0%,#0f172a 70%,#1e293b 70%,#1e293b 100%);border-radius:12px;border:1px solid #334155;overflow:hidden;">
      <!-- الرصيف -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:46px;background:#1e293b;border-top:2px dashed #334155;"></div>
      <!-- البيوت -->
      <div id="houses" class="absolute flex items-end justify-around w-full" style="bottom:46px;padding:0 20px;">
        <div class="house" id="house-0"><div class="house-roof"></div><div class="house-body">🏠<span class="letter">✉️</span></div><div class="house-label">[0]</div></div>
        <div class="house" id="house-1"><div class="house-roof"></div><div class="house-body">🏡<span class="letter">✉️</span></div><div class="house-label">[1]</div></div>
        <div class="house" id="house-2"><div class="house-roof"></div><div class="house-body">🏘<span class="letter">✉️</span></div><div class="house-label">[2]</div></div>
        <div class="house" id="house-3"><div class="house-roof"></div><div class="house-body">🏚<span class="letter">✉️</span></div><div class="house-label">[3]</div></div>
      </div>
      <!-- ساعي البريد -->
      <div id="postman">🧑‍💼</div>
    </div>

    <!-- حقيبة الرسائل -->
    <div class="flex items-center justify-center gap-3 mb-5">
      <span class="text-slate-400 text-sm">الرسائل المتبقية:</span>
      <div id="bag" class="flex gap-2">
        <span id="l0" class="text-xl transition-all">✉️</span>
        <span id="l1" class="text-xl transition-all">✉️</span>
        <span id="l2" class="text-xl transition-all">✉️</span>
        <span id="l3" class="text-xl transition-all">✉️</span>
      </div>
    </div>

    <!-- عداد التكرار -->
    <div id="loop-counter" class="text-center text-slate-500 text-sm font-bold mb-5 hidden">
      التكرار الحالي: <span id="iter-num" class="text-amber-400 text-xl font-extrabold math-text">—</span>
    </div>

    <!-- الكود — يظهر في النهاية -->
    <div id="code-section" class="hidden">
      <p class="text-slate-400 text-sm mb-2 text-center">هكذا تكتبها بالبايثون:</p>
      <div class="code-block">
        <div class="code-line" id="cl-for"><span style="color:#c586c0">for</span> <span style="color:#9cdcfe">i</span> <span style="color:#d4d4d4">in</span> <span style="color:#dcdcaa">range</span><span style="color:#d4d4d4">(</span><span style="color:#b5cea8">4</span><span style="color:#d4d4d4">):</span></div>
        <div class="code-line" id="cl-body"><span style="color:#d4d4d4">&nbsp;&nbsp;&nbsp;&nbsp;</span><span style="color:#dcdcaa">deliver</span><span style="color:#d4d4d4">(houses[</span><span style="color:#9cdcfe">i</span><span style="color:#d4d4d4">])</span></div>
      </div>
    </div>
  </div>

  <!-- شريط التحكم -->
  <div class="flex justify-between items-center border-t border-slate-700 p-5 bg-slate-900">
    <div id="step-counter" class="text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700">ابدأ</div>
    <div class="flex gap-3">
      <button onclick="resetAll()" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all">🔄 إعادة</button>
      <button id="btn-next" onclick="nextStep()" class="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-7 rounded-xl transition-all flex items-center gap-2">الخطوة التالية <i class="fas fa-step-forward"></i></button>
    </div>
  </div>
</main>

<script>
let audioCtx=null;
function playSound(t){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const n=audioCtx.currentTime;if(t==='click'){o.type='sine';o.frequency.setValueAtTime(700,n);g.gain.setValueAtTime(0.08,n);g.gain.exponentialRampToValueAtTime(0.01,n+0.1);}else if(t==='step'){o.type='triangle';o.frequency.setValueAtTime(400,n);o.frequency.linearRampToValueAtTime(600,n+0.12);g.gain.setValueAtTime(0.1,n);g.gain.linearRampToValueAtTime(0.01,n+0.18);}else if(t==='success'){o.type='triangle';o.frequency.setValueAtTime(400,n);o.frequency.setValueAtTime(700,n+0.1);o.frequency.setValueAtTime(900,n+0.2);g.gain.setValueAtTime(0.1,n);g.gain.linearRampToValueAtTime(0.01,n+0.3);}o.start(n);o.stop(n+0.35);}catch(e){}}

// مواضع ساعي البريد لكل بيت (من اليمين)
const housePositions = [16, 120, 224, 328];
const letterIds = ['l0','l1','l2','l3'];

function movePostman(houseIdx, cb) {
  const pm = document.getElementById('postman');
  pm.style.right = housePositions[houseIdx] + 'px';
  setTimeout(cb, 750);
}

function visitHouse(i) {
  document.querySelectorAll('.house').forEach(h => h.classList.remove('current','delivering'));
  const house = document.getElementById('house-'+i);
  house.classList.add('current');
  movePostman(i, () => {
    house.classList.add('delivering');
    playSound('step');
    const ltr = document.getElementById(letterIds[i]);
    ltr.style.opacity = '0.2';
    ltr.style.transform = 'scale(0.5)';
    document.getElementById('iter-num').innerText = i;
    setTimeout(() => {
      house.classList.remove('delivering','current');
      house.classList.add('visited');
    }, 600);
  });
}

let step = 0;
const steps = [
  {
    text: '🧑‍💼 هذا ساعي البريد. لديه <b>4 رسائل</b> في حقيبته يجب توصيلها لـ <b>4 بيوت</b> في الشارع — بالترتيب من اليمين لليسار.',
    action: () => {
      document.getElementById('visual-area').classList.remove('opacity-30','pointer-events-none');
    }
  },
  {
    text: '📬 البيت الأول (رقم 0): ساعي البريد يمشي للبيت الأول ويطرق الباب... ويُسلّم الرسالة! ✉️',
    action: () => {
      document.getElementById('loop-counter').classList.remove('hidden');
      visitHouse(0);
    }
  },
  {
    text: '📬 البيت الثاني (رقم 1): دون أن يتوقف أو يسأل — ينتقل مباشرة للبيت التالي ويُسلّم الرسالة.',
    action: () => { visitHouse(1); }
  },
  {
    text: '📬 البيت الثالث (رقم 2): نفس الشيء تماماً — يكرر الخطوة ذاتها مع كل بيت جديد. هذا هو جوهر الحلقة!',
    action: () => { visitHouse(2); }
  },
  {
    text: '📬 البيت الأخير (رقم 3): آخر رسالة! بعدها تنتهي الحلقة لأنه أنجز كل المهام.',
    action: () => { visitHouse(3); }
  },
  {
    text: '🔗 <b>الربط بالبرمجة:</b> الحلقة <b>for</b> في بايثون تفعل نفس الشيء تماماً — تُنفّذ نفس الأمر لكل عنصر بالترتيب حتى ينتهوا.',
    action: () => {
      document.getElementById('code-section').classList.remove('hidden');
      document.getElementById('cl-for').classList.add('active');
      playSound('step');
    }
  },
  {
    text: '✅ <b>كل مرة تدور الحلقة:</b> يتغير <b>i</b> تلقائياً (0 ثم 1 ثم 2 ثم 3) وتُنفَّذ السطر الداخلي مرة واحدة لكل قيمة. تماماً مثل ساعي البريد يزور بيتاً جديداً في كل جولة!',
    action: () => {
      document.getElementById('cl-for').classList.remove('active');
      document.getElementById('cl-body').classList.add('active');
      setTimeout(() => { document.getElementById('cl-body').classList.remove('active'); document.getElementById('cl-for').classList.add('active'); }, 600);
      playSound('success');
    }
  }
];

function nextStep() {
  const btn = document.getElementById('btn-next');
  if (btn.disabled) return;
  playSound('click');
  if (step < steps.length) {
    const s = steps[step];
    document.getElementById('explanation').innerHTML = s.text;
    s.action && s.action();
    step++;
  }
  const counter = document.getElementById('step-counter');
  if (step >= steps.length) {
    btn.disabled = true; btn.style.opacity = '0.4';
    counter.innerHTML = '✅ اكتمل الدرس';
    counter.className = 'text-white font-bold bg-green-600 px-4 py-2 rounded-lg';
    playSound('success');
  } else {
    counter.innerText = step + ' / ' + steps.length;
  }
}

function resetAll() {
  step = 0;
  document.getElementById('btn-next').disabled = false;
  document.getElementById('btn-next').style.opacity = '1';
  document.getElementById('step-counter').innerText = 'ابدأ';
  document.getElementById('step-counter').className = 'text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700';
  document.getElementById('explanation').innerHTML = 'تخيّل معي مشهداً بسيطاً: <b>ساعي البريد</b> لديه 4 رسائل يجب توصيلها لـ 4 بيوت في الشارع. اضغط <b>«الخطوة التالية»</b> لنرى كيف يعمل.';
  document.getElementById('visual-area').classList.add('opacity-30','pointer-events-none');
  document.getElementById('loop-counter').classList.add('hidden');
  document.getElementById('iter-num').innerText = '—';
  document.getElementById('code-section').classList.add('hidden');
  document.getElementById('postman').style.right = '16px';
  document.querySelectorAll('.house').forEach(h => h.classList.remove('visited','current','delivering'));
  letterIds.forEach(id => { document.getElementById(id).style.opacity='1'; document.getElementById(id).style.transform='scale(1)'; });
  playSound('click');
}
<\/script>
</body>
</html>
\`\`\`

---

## تعليمات التسليم النهائية
- أخرج صفحة HTML واحدة فقط بين \`\`\`html و \`\`\`
- لا نص خارج الكود إطلاقاً
- الصفحة تعمل بالكامل بدون أي server
- **الواقع أولاً**: خطوتك الأولى دائماً مشهد من الحياة — لا كود، لا مصطلحات
- **المحاكاة حية**: استخدم CSS @keyframes لتحريك الأشياء فعلاً (انتقال، حركة، ظهور)
- **الكود آخراً**: أظهر الكود فقط في الخطوة قبل الأخيرة أو الأخيرة بعد أن فهم الطالب المفهوم من الواقع`;

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
