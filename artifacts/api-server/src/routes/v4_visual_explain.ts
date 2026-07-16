/**
 * Visual Explain Route — POST /v4/visual-explain
 *
 * Generates a self-contained interactive Arabic HTML page that visually
 * explains a teacher message, using Gemini 2.5 Flash via OpenRouter.
 *
 * Flow:
 *  1. Receive { message } from the student frontend
 *  2. Build a prompt with strict design specs + reference examples
 *  3. Call google/gemini-2.5-flash via OpenRouter
 *  4. Extract HTML from response and return { html }
 *
 * Replaces the old Playwright/manus.im approach entirely.
 */

import { Router } from "express";
import crypto    from "crypto";

// ── Auth ──────────────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const OPENROUTER_API_URL  = "https://openrouter.ai/api/v1/chat/completions";
const MODEL               = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS  = 90_000;
const MAX_TOKENS          = 12_000;
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
// Describes the exact design language used in the reference examples,
// so every generated page feels like part of the same design system.
const SYSTEM_PROMPT = `أنت خبير في إنشاء صفحات HTML تعليمية تفاعلية احترافية عالية الجودة باللغة العربية.

## مهمتك
إنشاء صفحة HTML واحدة كاملة، مكتفية بذاتها، تشرح المفهوم الوارد في رسالة المعلم بصرياً وتفاعلياً.

---

## قواعد إلزامية لا يمكن تجاوزها

### 1. المكتبات الخارجية (CDN فقط — لا backend)
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>
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

### 3. بنية الصفحة الإلزامية
\`\`\`html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[عنوان المفهوم]</title>
    <!-- CDN imports هنا -->
    <style>
        body { font-family: 'Cairo', sans-serif; background-color: #0f172a; color: #e2e8f0; }
        .math-text { direction: ltr !important; display: inline-block; font-family: 'Fira Code', monospace; }
        /* ... CSS classes ... */
    </style>
</head>
<body class="min-h-screen p-4 md:p-8 flex flex-col items-center">

    <!-- Header -->
    <header class="text-center mb-8 w-full max-w-5xl">
        <h1 class="text-3xl md:text-4xl font-extrabold text-[COLOR] mb-2">[عنوان]</h1>
        <p class="text-slate-400">[وصف فرعي]</p>
    </header>

    <!-- Main card -->
    <main class="w-full max-w-5xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

        <!-- شريط الشرح النصي -->
        <div class="bg-blue-900/30 border-r-4 border-blue-500 p-6 min-h-[120px] flex items-center shadow-inner">
            <p id="explanation" class="text-xl text-blue-50 leading-relaxed">
                [نص الترحيب + تعليمات الضغط على "الخطوة التالية"]
            </p>
        </div>

        <!-- منطقة العرض البصري — تبدأ مخفية -->
        <div id="visual-area" class="p-6 md:p-8 opacity-30 pointer-events-none transition-opacity duration-500">
            <!-- العناصر البصرية هنا -->
        </div>

        <!-- شريط التحكم -->
        <div class="flex justify-between items-center border-t border-slate-700 p-6 bg-slate-900">
            <div id="step-counter" class="text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700">مرحلة الشرح العام</div>
            <div class="flex gap-3">
                <button onclick="resetAll()" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all">
                    🔄 إعادة
                </button>
                <button id="btn-next" onclick="nextStep()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all flex items-center gap-2">
                    الخطوة التالية <i class="fas fa-step-forward"></i>
                </button>
            </div>
        </div>
    </main>

    <script>
        // ... JavaScript هنا ...
    </script>
</body>
</html>
\`\`\`

### 4. نمط الخطوات (إلزامي)
\`\`\`javascript
let currentStep = 0;

const steps = [
    {
        text: "<b>الخطوة 1:</b> شرح العنصر الأول...",
        action: () => {
            // تفعيل العناصر البصرية
            document.getElementById('visual-area').classList.remove('opacity-30', 'pointer-events-none');
            document.getElementById('element-1').classList.add('active');
            playSound('click');
        }
    },
    {
        text: "<b>الخطوة 2:</b> شرح العنصر التالي...",
        action: () => {
            document.getElementById('element-2').classList.add('active');
            playSound('success');
        }
    },
    // ... المزيد (6 إلى 15 خطوة)
];

function nextStep() {
    if (document.getElementById('btn-next').style.display === 'none') return;
    playSound('click');
    if (currentStep < steps.length) {
        const step = steps[currentStep];
        document.getElementById('explanation').innerHTML = step.text;
        if (step.action) step.action();
        currentStep++;
    }
    if (currentStep >= steps.length) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('step-counter').innerHTML = '✅ اكتمل الدرس';
        document.getElementById('step-counter').className =
            'text-white font-bold bg-green-500 px-4 py-2 rounded-lg border border-green-600';
    }
}

function resetAll() {
    currentStep = 0;
    document.getElementById('explanation').innerHTML = '...النص الأولي...';
    document.getElementById('visual-area').classList.add('opacity-30', 'pointer-events-none');
    document.getElementById('btn-next').style.display = '';
    document.getElementById('step-counter').innerText = 'مرحلة الشرح العام';
    document.getElementById('step-counter').className = 'text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700';
    // إعادة كل العناصر لحالتها الابتدائية
    playSound('click');
}
\`\`\`

### 5. Web Audio API (إلزامي في كل صفحة)
\`\`\`javascript
let audioCtx = null;
function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(700, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        } else if (type === 'fail') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.linearRampToValueAtTime(120, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        } else if (type === 'activate') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        }
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}
\`\`\`

### 6. CSS للعناصر التفاعلية (إلزامي)
\`\`\`css
/* بطاقات/صناديق قابلة للتفعيل */
.viz-box {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid #334155;
    background-color: #1e293b;
    border-radius: 0.75rem;
    padding: 1.25rem;
}
.viz-box.active {
    border-color: #38bdf8;
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.25);
    transform: translateY(-4px);
    background-color: #0f172a;
}
.viz-box.success {
    border-color: #22c55e;
    background-color: rgba(34, 197, 94, 0.08);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
}
.viz-box.fail {
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.08);
    opacity: 0.75;
}

/* عناصر قائمة/عناصر قابلة للتمييز */
.item-node {
    transition: all 0.3s ease;
    border: 1px solid #475569;
    background-color: #0f172a;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    text-align: center;
    font-weight: bold;
}
.item-node.highlight {
    background-color: #1d4ed8;
    border-color: #60a5fa;
    color: white;
    transform: scale(1.08);
    box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
}

/* أسهم/موصلات */
.connector {
    height: 4px;
    background-color: #334155;
    transition: all 0.3s;
    flex-grow: 1;
}
.connector.active {
    background-color: #38bdf8;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
}
\`\`\`

### 7. تمييز الكود (للمواضيع البرمجية)
\`\`\`css
.code-editor {
    direction: ltr !important;
    text-align: left !important;
    font-family: 'Fira Code', monospace;
    background-color: #1e1e1e;
    font-size: 1.1rem;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid #334155;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
    line-height: 1.8;
    white-space: nowrap;
    overflow-x: auto;
}
.code-chunk {
    transition: all 0.3s ease;
    border-radius: 6px;
    padding: 4px 8px;
    display: inline-block;
}
.code-chunk.active {
    background-color: rgba(56, 189, 248, 0.2);
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
    border-bottom: 2px solid #38bdf8;
}
\`\`\`

### 8. قواعد النص العربي والكود
- **العربي**: يُعرض RTL تلقائياً (الافتراضي)
- **الكود/المتغيرات/الأرقام**: يجب وضعها في \`<bdi dir="ltr" class="math-text">...</bdi>\`
- **حقول الكود الكاملة**: \`direction: ltr !important; text-align: left !important;\`
- **الشرح داخل الخطوات**: يمكن استخدام \`<b>...</b>\` للتمييز
- **تلوين الكود**: استخدم ألوان VS Code:
  - الكلمات المفتاحية: \`#c586c0\`
  - المتغيرات: \`#9cdcfe\`
  - الأرقام: \`#b5cea8\`
  - النصوص/Strings: \`#ce9178\`
  - الدوال: \`#dcdcaa\`
  - الرمزي: \`#d4d4d4\`

---

## مبادئ التصميم البصري
1. **تمثيل مجازي ذكي**: كل مفهوم له تمثيل بصري خاص — لا تستخدم مجرد نص، بل ابتكر visualizaton مناسب
2. **التدرج والكشف**: المنطقة البصرية تبدأ مخفية، كل خطوة تكشف جزءاً جديداً
3. **ربط الكود بالحركة**: عند شرح الكود، يُضاء مقطع الكود ويتحرك العنصر المقابل له بصرياً في نفس الوقت
4. **الأصوات التعبيرية**: كل حدث له صوت مختلف (click/success/fail/activate) يعزز التغذية الراجعة
5. **اللون كلغة**: أزرق=معلومات، أخضر=نجاح، أحمر=خطأ، أصفر=تحذير/ترقيم
6. **العمق والمحاذاة**: استخدم flex/grid لتخطيطات واضحة مع gap مناسب
7. **البوابات والتدفق**: للمفاهيم التي تحتوي على تدفق بيانات، استخدم pipeline/flow مع أسهم
8. **لا static text**: كل عنصر يجب أن يتغير حالته عند خطوة ما

---

## مثال مرجعي كامل (بوابات منطقية):
\`\`\`html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>البوابات المنطقية - عقل الكمبيوتر</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&family=Fira+Code:wght@500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { font-family: 'Cairo', sans-serif; background-color: #0f172a; color: #e2e8f0; }
        .math-text { direction: ltr !important; display: inline-block; font-family: 'Fira Code', monospace; }
        .simple-box { background-color: #1e293b; border: 2px solid #334155; border-radius: 0.75rem; transition: all 0.3s ease; }
        .input-node { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; font-family: 'Fira Code', monospace; border-radius: 0.5rem; transition: all 0.3s; }
        .input-0 { background-color: #334155; color: #94a3b8; border: 2px solid #475569; }
        .input-1 { background-color: #0ea5e9; color: #fff; border: 2px solid #38bdf8; box-shadow: 0 0 15px rgba(14,165,233,0.4); }
        .gate-box { padding: 1rem 2rem; font-size: 1.5rem; font-weight: bold; border-radius: 0.5rem; color: white; transition: all 0.3s; }
        .gate-and { background-color: #3b82f6; border: 2px solid #60a5fa; }
        .gate-or  { background-color: #10b981; border: 2px solid #34d399; }
        .gate-not { background-color: #f43f5e; border: 2px solid #fb7185; }
        .bulb { font-size: 4rem; transition: all 0.3s; }
        .bulb-off { color: #334155; }
        .bulb-on  { color: #fbbf24; text-shadow: 0 0 30px rgba(251,191,36,0.8); transform: scale(1.1); }
        .arrow-line { height: 4px; background-color: #475569; flex-grow: 1; transition: all 0.3s; }
        .arrow-line.active { background-color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.5); }
    </style>
</head>
<body class="min-h-screen p-4 md:p-8 flex flex-col items-center">
    <header class="text-center mb-8 w-full max-w-4xl">
        <h1 class="text-3xl md:text-4xl font-extrabold text-blue-400 mb-2">البوابات المنطقية (Logic Gates)</h1>
        <p class="text-slate-400 text-lg">عقل الكمبيوتر المبسط - خطوة بخطوة</p>
    </header>
    <main class="w-full max-w-4xl bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div class="bg-blue-900/30 border-b-4 border-blue-500 p-6 min-h-[140px] flex items-center shadow-inner">
            <p id="explanation" class="text-xl text-blue-50 leading-relaxed w-full">
                مرحباً بك! الكمبيوتر يفكر باستخدام دوائر بسيطة جداً تسمى <b>البوابات المنطقية</b>. اضغط على <b>"الخطوة التالية"</b> لنبدأ.
            </p>
        </div>
        <div class="p-8 md:p-12 flex flex-col items-center justify-center min-h-[300px] opacity-30 transition-opacity duration-500" id="visual-area">
            <h2 id="gate-title" class="text-2xl font-bold text-slate-300 mb-8 math-text">---</h2>
            <div class="flex items-center justify-center w-full max-w-2xl gap-4">
                <div class="flex flex-col gap-6">
                    <div class="flex items-center gap-2"><span class="text-slate-400 text-sm">المدخل 1</span><div id="input-a" class="input-node input-0"><bdi dir="ltr">0</bdi></div></div>
                    <div class="flex items-center gap-2" id="input-b-row"><span class="text-slate-400 text-sm">المدخل 2</span><div id="input-b" class="input-node input-0"><bdi dir="ltr">0</bdi></div></div>
                </div>
                <div id="wire-in" class="arrow-line w-16 md:w-24"></div>
                <div id="gate-box" class="gate-box gate-and math-text">AND</div>
                <div id="wire-out" class="arrow-line w-16 md:w-24"></div>
                <div class="flex flex-col items-center gap-2">
                    <span class="text-slate-400 text-sm">النتيجة</span>
                    <i id="output-bulb" class="fas fa-lightbulb bulb bulb-off"></i>
                    <div id="output-val" class="math-text text-xl font-bold text-slate-500 mt-2"><bdi dir="ltr">0</bdi></div>
                </div>
            </div>
            <div id="math-eq" class="mt-10 text-2xl font-bold text-slate-400 math-text opacity-0 transition-opacity"><bdi dir="ltr">0 AND 0 = 0</bdi></div>
        </div>
        <div class="flex justify-between items-center border-t border-slate-700 p-6 bg-slate-900">
            <div id="step-counter" class="text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700">مقدمة</div>
            <div class="flex gap-3">
                <button onclick="resetAll()" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all">🔄 إعادة</button>
                <button id="btn-next" onclick="nextStep()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all flex items-center gap-2">الخطوة التالية <i class="fas fa-step-forward"></i></button>
            </div>
        </div>
    </main>
    <script>
        let audioCtx=null;
        function playSound(t){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const n=audioCtx.currentTime;if(t==='click'){o.type='sine';o.frequency.setValueAtTime(600,n);g.gain.setValueAtTime(0.1,n);g.gain.exponentialRampToValueAtTime(0.01,n+0.1);}else if(t==='on'){o.type='triangle';o.frequency.setValueAtTime(400,n);o.frequency.setValueAtTime(800,n+0.1);g.gain.setValueAtTime(0.1,n);g.gain.linearRampToValueAtTime(0.01,n+0.3);}else if(t==='off'){o.type='sawtooth';o.frequency.setValueAtTime(300,n);o.frequency.linearRampToValueAtTime(150,n+0.2);g.gain.setValueAtTime(0.1,n);g.gain.linearRampToValueAtTime(0.01,n+0.2);}o.start(n);o.stop(n+0.3);}catch(e){}}
        function setInput(id,v){const el=document.getElementById(id);el.innerHTML=\`<bdi dir="ltr">\${v}</bdi>\`;el.className=v===1?'input-node input-1':'input-node input-0';}
        function setOutput(v){const bulb=document.getElementById('output-bulb'),ov=document.getElementById('output-val'),wo=document.getElementById('wire-out');ov.innerHTML=\`<bdi dir="ltr">\${v}</bdi>\`;if(v===1){bulb.className='fas fa-lightbulb bulb bulb-on';ov.className='math-text text-xl font-bold text-yellow-400 mt-2';wo.classList.add('active');playSound('on');}else{bulb.className='fas fa-lightbulb bulb bulb-off';ov.className='math-text text-xl font-bold text-slate-500 mt-2';wo.classList.remove('active');playSound('off');}}
        function setGate(name,cls){document.getElementById('gate-box').innerHTML=name;document.getElementById('gate-box').className=\`gate-box \${cls} math-text\`;document.getElementById('gate-title').innerHTML=\`بوابة \${name}\`;}
        function setEq(eq){const el=document.getElementById('math-eq');el.innerHTML=\`<bdi dir="ltr">\${eq}</bdi>\`;el.style.opacity='1';}
        let step=0;
        const steps=[
            {text:"<b>1. بوابة AND (و):</b> صارمة — لا تُخرج (1) إلا إذا كانت <b>كل</b> المدخلات (1). كأنك تحتاج المفتاح <b>و</b> الرقم السري معاً.",action:()=>{document.getElementById('visual-area').classList.remove('opacity-30');document.getElementById('step-counter').innerText='بوابة AND';setGate('AND','gate-and');setInput('input-a',0);setInput('input-b',0);setOutput(0);setEq('0 AND 0 = 0');}},
            {text:"<b>تجربة AND:</b> أدخلنا (1) في المدخل الأول فقط — النتيجة: مطفأ (0) لأن المدخل الثاني ما زال (0).",action:()=>{setInput('input-a',1);document.getElementById('wire-in').classList.add('active');setOutput(0);setEq('1 AND 0 = 0');}},
            {text:"<b>نجاح AND:</b> كلا المدخلين (1) — الشرط تحقق! المصباح يضيء.",action:()=>{setInput('input-b',1);setOutput(1);setEq('1 AND 1 = 1');}},
            {text:"<b>2. بوابة OR (أو):</b> متساهلة — تُخرج (1) إذا كان <b>أي</b> مدخل يساوي (1). كأن الباب يفتح بالمفتاح <b>أو</b> الرقم السري.",action:()=>{document.getElementById('step-counter').innerText='بوابة OR';setGate('OR','gate-or');setInput('input-a',0);setInput('input-b',0);document.getElementById('wire-in').classList.remove('active');setOutput(0);setEq('0 OR 0 = 0');}},
            {text:"<b>تجربة OR:</b> مدخل واحد فقط (1) — يكفي! المصباح يضيء.",action:()=>{setInput('input-a',1);document.getElementById('wire-in').classList.add('active');setOutput(1);setEq('1 OR 0 = 1');}},
            {text:"<b>3. بوابة NOT (النفي):</b> مدخل واحد فقط، وظيفتها العكس — (0) يصبح (1) و(1) يصبح (0).",action:()=>{document.getElementById('step-counter').innerText='بوابة NOT';setGate('NOT','gate-not');document.getElementById('input-b-row').style.display='none';setInput('input-a',0);document.getElementById('wire-in').classList.remove('active');setOutput(1);setEq('NOT 0 = 1');}},
            {text:"<b>تجربة NOT:</b> ندخل (1) — البوابة تعكسه فيطفأ المصباح.",action:()=>{setInput('input-a',1);document.getElementById('wire-in').classList.add('active');setOutput(0);setEq('NOT 1 = 0');}},
            {text:"<b>الخلاصة:</b> بملايين من هذه البوابات البسيطة مجتمعة، يستطيع الكمبيوتر الحساب وتشغيل البرامج وعرض الصور! لقد أتممت الدرس بنجاح 🎉",action:()=>{document.getElementById('btn-next').style.display='none';document.getElementById('step-counter').innerHTML='✅ اكتمل الدرس';document.getElementById('step-counter').className='text-white font-bold bg-green-500 px-4 py-2 rounded-lg border border-green-600';playSound('on');setTimeout(()=>playSound('on'),200);}}
        ];
        function nextStep(){if(document.getElementById('btn-next').style.display==='none')return;playSound('click');if(step<steps.length){const s=steps[step];document.getElementById('explanation').innerHTML=s.text;if(s.action)s.action();step++;}}
        function resetAll(){step=0;document.getElementById('explanation').innerHTML="مرحباً بك! الكمبيوتر يفكر باستخدام دوائر بسيطة جداً تسمى <b>البوابات المنطقية</b>. اضغط على <b>'الخطوة التالية'</b> لنبدأ.";document.getElementById('visual-area').classList.add('opacity-30');document.getElementById('btn-next').style.display='';document.getElementById('step-counter').innerText='مقدمة';document.getElementById('step-counter').className='text-slate-400 font-bold px-4 py-2 rounded-lg border border-slate-700';document.getElementById('input-b-row').style.display='';document.getElementById('wire-in').classList.remove('active');document.getElementById('wire-out').classList.remove('active');document.getElementById('math-eq').style.opacity='0';setInput('input-a',0);setInput('input-b',0);setGate('AND','gate-and');document.getElementById('output-bulb').className='fas fa-lightbulb bulb bulb-off';document.getElementById('output-val').innerHTML='<bdi dir="ltr">0</bdi>';document.getElementById('output-val').className='math-text text-xl font-bold text-slate-500 mt-2';playSound('click');}
    </script>
</body>
</html>
\`\`\`

---

## تعليمات التسليم
- أخرج صفحة HTML واحدة فقط، محاطة بـ \`\`\`html و \`\`\`
- لا تضف أي نص خارج الكود
- الصفحة يجب أن تشغّل بشكل كامل في المتصفح بدون أي server
- اجعل التصميم البصري مخصصاً لطبيعة المفهوم المطلوب تحديداً`;

// ── Build user prompt ─────────────────────────────────────────────────────────
function buildUserPrompt(message: string): string {
  const truncated =
    message.length > MAX_MESSAGE_CHARS
      ? message.slice(0, MAX_MESSAGE_CHARS) + "\n\n[... تم اختصار الرسالة لأن طولها تجاوز الحد]"
      : message;

  return `## رسالة المعلم المراد شرحها بصرياً:

${truncated}

---

أنشئ صفحة HTML تفاعلية تشرح المفهوم الرئيسي في هذه الرسالة بصرياً.
التزم بالمواصفات الثابتة تماماً، وابتكر طريقة عرض بصرية مناسبة لطبيعة هذا المفهوم.`;
}

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function generateVisualHtml(message: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY غير محدد في الـ Secrets");

  const key = cacheKey(message);
  const cached = htmlCache.get(key);
  if (cached) {
    console.log("[visual-explain] Cache hit →", key);
    return cached;
  }

  console.log("[visual-explain] Calling", MODEL, "via OpenRouter…");
  const t0 = Date.now();

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://nukhba.app",
        "X-Title":       "Nukhba Visual Explain",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.75,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: buildUserPrompt(message) },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(tid);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      // Sanitize error — strip key URLs/hashes before surfacing to client
      const sanitized = errText
        .replace(/https?:\/\/[^\s"]+keys\/[a-f0-9]{20,}[^\s""]*/gi, "[key-url]")
        .replace(/"code":\s*\d+/g, "")
        .slice(0, 300);
      if (response.status === 403) {
        // Key limit exceeded or auth error
        const isLimitExceeded = errText.toLowerCase().includes("limit exceeded");
        if (isLimitExceeded) {
          throw new Error("تجاوز مفتاح OpenRouter الحد المالي المحدد — يرجى رفع الحد من لوحة openrouter.ai");
        }
        throw new Error(`خطأ في مصادقة OpenRouter (403): ${sanitized}`);
      }
      throw new Error(`OpenRouter ${response.status}: ${sanitized}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?:   { message: string };
    };

    if (data.error) throw new Error(`OpenRouter: ${data.error.message}`);

    const raw = data.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("النموذج أعاد محتوى فارغاً");

    console.log(`[visual-explain] Got ${raw.length} chars in ${Date.now() - t0} ms`);

    const extracted = extractHtml(raw);
    if (!extracted) {
      console.error("[visual-explain] Raw response sample:", raw.slice(0, 600));
      throw new Error(
        "لم يتمكن النموذج من توليد صفحة HTML صالحة — حاول مرة أخرى"
      );
    }

    html = extracted;
  } finally {
    clearTimeout(tid);
  }

  // Cache — evict oldest when > 100 entries
  htmlCache.set(key, html);
  if (htmlCache.size > 100) {
    const oldest = htmlCache.keys().next().value;
    if (oldest) htmlCache.delete(oldest);
  }

  return html;
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

router.post("/v4/visual-explain", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });

  // Frontend sends { message: "..." }
  const { message } = req.body as { message?: string };
  if (!message?.trim()) {
    return res.status(400).json({ error: "حقل message مطلوب" });
  }

  res.setTimeout(REQUEST_TIMEOUT_MS + 15_000);

  try {
    const html = await generateVisualHtml(message.trim());
    return res.json({ html });
  } catch (err: any) {
    const msg: string = err?.message ?? "خطأ غير معروف";
    console.error("[visual-explain] Error:", msg);

    if (err?.name === "AbortError") {
      return res.status(504).json({ error: "انتهت المهلة — النموذج استغرق وقتاً طويلاً، حاول مرة أخرى" });
    }
    return res.status(500).json({ error: msg });
  }
});

export default router;
