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
const SYSTEM_PROMPT = `You are an expert Arabic educational interaction designer. Your ONLY output is a single complete self-contained HTML file — no explanations, no text outside the HTML.

══════════════════════════════════════════════════════════════════
PART 1 — MANDATORY HTML SKELETON (copy exactly every time)
══════════════════════════════════════════════════════════════════

\`\`\`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>الشرح البصري</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;min-height:100vh;overflow-x:hidden;}
body{font-family:'Cairo',sans-serif;background:#0f172a;color:#e2e8f0;direction:rtl;}
.ltr{direction:ltr;display:inline-block;}
.code-font{font-family:'Fira Code',monospace;}

/* ── Glass card ── */
.card{
  background:rgba(30,41,59,0.85);
  border:1px solid rgba(51,65,85,0.8);
  border-radius:16px;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 4px 24px -4px rgba(0,0,0,0.5),0 1px 0 0 rgba(255,255,255,0.04) inset;
}

/* ── SVG scene wrapper ── */
.scene-wrap{width:100%;border-radius:12px;border:1px solid #1e293b;background:#060d1a;overflow:hidden;}
.scene-svg{width:100%;display:block;}

/* ── Explanation bar ── */
.explanation-bar{
  background:rgba(180,83,9,0.12);
  border-right:4px solid #d97706;
  padding:1.1rem 1.4rem;
  min-height:88px;
  display:flex;align-items:center;
  backdrop-filter:blur(6px);
}
#explanation{font-size:1.05rem;color:#fef3c7;line-height:1.75;min-height:2.5rem;}

/* ── Control bar ── */
.control-bar{
  display:flex;justify-content:space-between;align-items:center;
  padding:0.9rem 1.25rem;
  border-top:1px solid rgba(51,65,85,0.6);
  background:rgba(15,23,42,0.7);
  backdrop-filter:blur(8px);
}

/* ── Buttons ── */
.btn-next{
  background:linear-gradient(135deg,#d97706,#b45309);
  color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:1rem;
  padding:0.65rem 1.6rem;border-radius:10px;border:none;cursor:pointer;
  transition:filter 0.2s,transform 0.15s;
  box-shadow:0 2px 12px rgba(217,119,6,0.35);
  display:flex;align-items:center;gap:8px;
}
.btn-next:hover:not(:disabled){filter:brightness(1.12);}
.btn-next:active:not(:disabled){transform:scale(0.96);}
.btn-next:disabled{opacity:0.35;cursor:not-allowed;box-shadow:none;}
.btn-prev{
  background:rgba(51,65,85,0.7);color:#e2e8f0;
  font-family:'Cairo',sans-serif;font-weight:600;font-size:0.95rem;
  padding:0.65rem 1.1rem;border-radius:10px;
  border:1px solid rgba(71,85,105,0.5);cursor:pointer;
  transition:background 0.2s,transform 0.15s;
}
.btn-prev:hover:not(:disabled){background:rgba(71,85,105,0.8);}
.btn-prev:disabled{opacity:0.25;cursor:not-allowed;}
.btn-reset{
  background:rgba(30,41,59,0.6);color:#94a3b8;
  font-family:'Cairo',sans-serif;font-weight:600;font-size:0.9rem;
  padding:0.55rem 1rem;border-radius:8px;
  border:1px solid rgba(51,65,85,0.5);cursor:pointer;
  transition:background 0.2s,color 0.2s;
}
.btn-reset:hover{background:rgba(51,65,85,0.7);color:#e2e8f0;}

/* ── Step badge ── */
.step-badge{
  color:#94a3b8;font-weight:700;
  padding:0.4rem 0.9rem;border-radius:8px;
  border:1px solid rgba(51,65,85,0.6);
  font-size:0.9rem;background:rgba(15,23,42,0.5);
}
.step-badge.done{background:#166534;color:#fff;border-color:#166534;}

/* ── Code panel (Prism-powered) ── */
.code-panel{display:none;padding:0 1.25rem 1.25rem;}
.code-panel pre[class*="language-"]{
  border-radius:10px;font-size:0.88rem;line-height:1.85;
  border:1px solid #1e293b;margin:0;
  box-shadow:0 2px 12px rgba(0,0,0,0.4);
}
.code-panel .code-line-hl{
  display:block;
  background:rgba(56,189,248,0.12);
  border-right:3px solid #38bdf8;
  border-radius:3px;
  transition:background 0.4s;
}

/* ── Watch panel (variable tracker) ── */
.watch-panel{
  position:absolute;top:10px;right:10px;
  background:rgba(15,23,42,0.82);
  border:1px solid rgba(56,189,248,0.25);
  border-radius:8px;padding:6px 10px;
  font-family:'Fira Code',monospace;font-size:0.78rem;
  min-width:90px;direction:ltr;text-align:left;
  backdrop-filter:blur(6px);z-index:10;
}
.watch-panel .wv{color:#9cdcfe;transition:color 0.3s;}
.watch-panel .wv.changed{color:#22c55e;animation:wFlip 0.4s ease;}
@keyframes wFlip{0%{transform:rotateX(90deg);opacity:0;}60%{transform:rotateX(-10deg);}100%{transform:rotateX(0);opacity:1;}}

/* ── Physics transitions (GPU-accelerated) ── */
.t-bounce{transition:transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55),opacity 0.3s ease;}
.t-glide {transition:transform 0.6s cubic-bezier(0.22,1,0.36,1),opacity 0.35s ease;}
.t-snap  {transition:transform 0.25s cubic-bezier(0.4,0,0.2,1),opacity 0.2s ease;}

/* ── SVG element state helpers ── */
.svg-dim    {opacity:0.25;transition:opacity 0.4s ease;}
.svg-focus  {filter:drop-shadow(0 0 8px #38bdf8);transition:filter 0.4s,opacity 0.4s;}
.svg-success{filter:drop-shadow(0 0 10px #22c55e);}
.svg-error  {filter:drop-shadow(0 0 10px #ef4444);}

/* ── Typewriter cursor ── */
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
.cursor{display:inline-block;width:2px;height:1em;background:#d97706;
  vertical-align:text-bottom;animation:blink 0.8s step-end infinite;margin-right:2px;}

/* ── Keyframes library ── */
@keyframes fadeUp  {from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes popIn   {from{opacity:0;transform:scale(0.4);}to{opacity:1;transform:scale(1);}}
@keyframes bounceY {0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
@keyframes pulse   {0%,100%{opacity:1;}50%{opacity:0.5;}}
@keyframes spin    {to{transform:rotate(360deg);}}
@keyframes shake   {0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}
</style>
</head>
\`\`\`

══════════════════════════════════════════════════════════════════
PART 2 — STRICT COLOR SYSTEM (never deviate)
══════════════════════════════════════════════════════════════════

BACKGROUNDS:
  Page           → #0f172a  (always)
  Card glass     → rgba(30,41,59,0.85)
  SVG scene bg   → #060d1a
  Code editor    → handled by Prism tomorrow-theme automatically

BORDERS:
  Default        → rgba(51,65,85,0.8)
  Active/focus   → #38bdf8  + filter:drop-shadow(0 0 8px #38bdf8)
  Success        → #22c55e  + filter:drop-shadow(0 0 10px #22c55e)
  Error          → #ef4444  + filter:drop-shadow(0 0 10px #ef4444)

TEXT:
  Primary        → #e2e8f0
  Muted          → #94a3b8
  Explanation    → #fef3c7
  Watch panel    → #9cdcfe (variables), #22c55e (changed value)

SVG ELEMENT COLORS:
  Real-world objects  → warm: #fbbf24, #f97316, #a78bfa
  Data/abstract nodes → cool: #38bdf8, #22c55e, #818cf8
  Connectors/arrows   → #475569

ACCENT:
  Amber/gold     → #d97706
  Sky/blue       → #38bdf8
  Green          → #22c55e
  Red            → #ef4444

══════════════════════════════════════════════════════════════════
PART 3 — PAGE LAYOUT (mandatory structure)
══════════════════════════════════════════════════════════════════

\`\`\`html
<body class="p-4 flex flex-col items-center">

  <!-- HEADER -->
  <header style="text-align:center;margin-bottom:1.5rem;width:100%;max-width:740px;">
    <h1 style="font-size:1.75rem;font-weight:800;color:#fbbf24;margin-bottom:0.2rem;">العنوان</h1>
    <p style="color:#94a3b8;font-size:0.92rem;">تشبيه الواقع في سطر</p>
  </header>

  <!-- MAIN CARD -->
  <main class="card" style="width:100%;max-width:740px;overflow:hidden;">

    <!-- 1. EXPLANATION BAR -->
    <div class="explanation-bar">
      <p id="explanation">👆 اضغط <b>«التالي»</b> لتبدأ الشرح البصري.</p>
    </div>

    <!-- 2. SVG SCENE (ALL visuals drawn inside SVG — no divs for shapes) -->
    <div style="padding:1.25rem;">
      <div class="scene-wrap" style="position:relative;">
        <svg id="scene" class="scene-svg" viewBox="0 0 700 260" style="height:260px;">
          <!-- DRAW ALL SHAPES HERE using rect, circle, path, text, g -->
          <!-- Watch panel lives here as a foreignObject or as SVG text group -->
        </svg>

        <!-- WATCH PANEL: only include if concept has trackable variables -->
        <div class="watch-panel" id="watch" style="display:none;">
          <!-- <div><span style="color:#94a3b8;">i</span> = <span class="wv" id="wv-i">0</span></div> -->
        </div>
      </div>
    </div>

    <!-- 3. CODE PANEL (Prism.js — shown only in last 1-2 steps) -->
    <div class="code-panel" id="code-panel">
      <p style="color:#94a3b8;font-size:0.82rem;margin-bottom:0.6rem;text-align:center;">الكود المقابل للمشهد ↓</p>
      <pre><code id="code-block" class="language-javascript">/* الكود يظهر هنا */</code></pre>
    </div>

    <!-- 4. CONTROL BAR -->
    <div class="control-bar">
      <div id="step-badge" class="step-badge">ابدأ</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-reset" onclick="resetAll()">🔄</button>
        <button class="btn-prev" id="btn-prev" onclick="prevStep()" disabled>&#9664; السابق</button>
        <button class="btn-next" id="btn-next" onclick="nextStep()">التالي &#9654;</button>
      </div>
    </div>

  </main>

</body>
\`\`\`

══════════════════════════════════════════════════════════════════
PART 4 — MANDATORY JAVASCRIPT ENGINE (copy and complete)
══════════════════════════════════════════════════════════════════

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
      click:  {type:'sine',    f:[520],          vol:0.07, dur:0.09},
      step:   {type:'triangle',f:[330,520],       vol:0.08, dur:0.16},
      success:{type:'triangle',f:[400,600,800],   vol:0.10, dur:0.30},
      back:   {type:'sine',    f:[300,240],       vol:0.06, dur:0.14},
    }[type]||{type:'sine',f:[440],vol:0.06,dur:0.1};
    o.type=cfg.type;
    cfg.f.forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*(cfg.dur/cfg.f.length)));
    g.gain.setValueAtTime(cfg.vol,t);
    g.gain.linearRampToValueAtTime(0.001,t+cfg.dur);
    o.start(t);o.stop(t+cfg.dur+0.05);
  }catch(e){}
}

// ── Typewriter ─────────────────────────────────────────────────
let _twTimer=null;
function typewrite(html,targetId='explanation',speed=22){
  clearTimeout(_twTimer);
  const el=document.getElementById(targetId);
  if(!el) return;
  // strip tags to plain chars, keep HTML for final set
  el.innerHTML='<span class="cursor"></span>';
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  const text=tmp.textContent||'';
  let i=0;
  function tick(){
    if(i<=text.length){
      el.innerHTML=text.slice(0,i)+'<span class="cursor"></span>';
      i++;_twTimer=setTimeout(tick,speed);
    } else {
      el.innerHTML=html; // restore full HTML (links, bold, bdi)
    }
  }
  tick();
}

// ── Spotlight: dim all, focus one ──────────────────────────────
// ids: array of SVG element ids to spotlight; pass [] to clear
function spotlight(ids){
  const all=document.querySelectorAll('#scene [data-actor]');
  all.forEach(el=>{
    if(ids.length===0||ids.includes(el.id)){
      el.classList.remove('svg-dim');
      if(ids.length>0) el.classList.add('svg-focus');
      else el.classList.remove('svg-focus');
    } else {
      el.classList.remove('svg-focus');
      el.classList.add('svg-dim');
    }
  });
}

// ── Watch panel update ─────────────────────────────────────────
// vars: { varName: newValue, ... }
function updateWatch(vars){
  const panel=document.getElementById('watch');
  if(panel) panel.style.display='block';
  Object.entries(vars).forEach(([k,v])=>{
    const el=document.getElementById('wv-'+k);
    if(!el) return;
    el.classList.remove('changed');
    void el.offsetWidth; // reflow to restart animation
    el.textContent=v;
    el.classList.add('changed');
    setTimeout(()=>el.classList.remove('changed'),600);
  });
}

// ── Step engine ────────────────────────────────────────────────
let currentStep=0;

// steps[i] = { text: "...", action: ()=>{} }
// text supports full HTML (bold, bdi, code spans)
const steps=[
  // Phase 1 (Macro — Real World): steps 0–1
  // Phase 2 (Micro — Abstraction): steps 2–4: scene morphs to data structures
  // Phase 3 (Code): last 1–2 steps: code panel revealed, lines highlighted in sync
];

function applyStep(i){
  if(i<0||i>=steps.length) return;
  const s=steps[i];
  typewrite(s.text);
  if(s.action) s.action();
  // sync badge
  const badge=document.getElementById('step-badge');
  const done=i===steps.length-1;
  if(badge){
    badge.textContent= done ? '✅ اكتمل' : (i+1)+' / '+steps.length;
    badge.classList.toggle('done',done);
  }
  // buttons
  const nb=document.getElementById('btn-next'),pb=document.getElementById('btn-prev');
  if(nb) nb.disabled=done;
  if(pb) pb.disabled=(i===0);
  if(done) playSound('success');
}

function nextStep(){
  if(currentStep>=steps.length) return;
  playSound('step');
  applyStep(currentStep);
  currentStep++;
}

function prevStep(){
  if(currentStep<=1) return;
  playSound('back');
  currentStep--;
  // replay from scratch to step currentStep-1 (ensures consistent state)
  resetVisuals();
  for(let i=0;i<currentStep-1;i++) if(steps[i].action) steps[i].action();
  applyStep(currentStep-1);
}

function resetAll(){
  currentStep=0;
  clearTimeout(_twTimer);
  playSound('click');
  document.getElementById('explanation').innerHTML=
    '👆 اضغط <b>«التالي»</b> لتبدأ الشرح البصري.';
  const nb=document.getElementById('btn-next'),pb=document.getElementById('btn-prev');
  if(nb) nb.disabled=false;
  if(pb) pb.disabled=true;
  const badge=document.getElementById('step-badge');
  if(badge){badge.textContent='ابدأ';badge.classList.remove('done');}
  const cp=document.getElementById('code-panel');
  if(cp) cp.style.display='none';
  spotlight([]); // clear all spotlights
  const wp=document.getElementById('watch');
  if(wp) wp.style.display='none';
  resetVisuals(); // YOUR CUSTOM: restore SVG elements to initial state
}

// resetVisuals() — YOU MUST FILL THIS IN
// Restore every SVG element's transform, opacity, fill, etc. to initial values.
function resetVisuals(){
  // e.g.: document.getElementById('box1').setAttribute('transform','translate(0,0)');
}
\`\`\`

══════════════════════════════════════════════════════════════════
PART 5 — SVG SCENE RULES (non-negotiable)
══════════════════════════════════════════════════════════════════

THE GOLDEN RULE: The visual scene MUST be built entirely with <svg>. No <div> elements for shapes.

SVG ELEMENT RULES:
✅ Use viewBox="0 0 700 260" — fixed coordinate space, scales perfectly on all screens
✅ Use <rect>, <circle>, <ellipse>, <path>, <polygon> for shapes
✅ Use <text> for labels inside the scene (font-size: 12–16px, fill: #e2e8f0 or #94a3b8)
✅ Use <g id="..."> to group related actors
✅ Every actor element that may animate → add data-actor="true" and a unique id
✅ Use <defs><marker> for arrowheads on connectors

SVG ANIMATION RULES (GPU-accelerated — mandatory):
✅ ALL movement via: element.style.transform = 'translate(Xpx, Ypx)' + CSS class .t-glide or .t-bounce
✅ NEVER use left/top/right/bottom for SVG element movement
✅ NEVER use @keyframes for positional movement — only for: bounce, pulse, spin, shake, popIn
✅ Opacity changes: element.style.opacity = '0.25' with CSS transition
✅ After a @keyframes animation finishes: reset animation to 'none' in a timeout

PHYSICS TRANSITIONS (use these class names defined in CSS):
  .t-bounce → cubic-bezier(0.68,-0.55,0.265,1.55) — for elements popping into view
  .t-glide  → cubic-bezier(0.22,1,0.36,1)        — for smooth data flow
  .t-snap   → cubic-bezier(0.4,0,0.2,1)          — for quick state changes

SPOTLIGHT RULE:
✅ When explaining a specific actor, call spotlight(['actor-id']) — dims others to 0.25 opacity
✅ When moving to a new actor, update spotlight to the new id
✅ At scene-level steps (no single focus), call spotlight([]) to clear

══════════════════════════════════════════════════════════════════
PART 6 — TEACHING FRAMEWORK: THE ZOOM-IN METHOD (3 mandatory phases)
══════════════════════════════════════════════════════════════════

Every explanation MUST pass through exactly 3 cognitive phases:

PHASE 1 — MACRO (Real World): Steps 1–2
  Draw the real-world scene using warm-colored SVG shapes and emoji-style icons.
  ZERO tech terms. Make it vivid and immediate.
  Example for "Queue": People standing in line at a hospital emergency room.

PHASE 2 — MICRO (Abstraction): Steps 3–(N-2)
  Gradually morph the real-world scene into data structures:
  - People → data nodes (rectangles with values)
  - Physical location → memory blocks
  Use smooth .t-glide transitions. The same SVG elements TRANSFORM — do not replace them.
  Show the Watch Panel if the concept has trackable variables (loop counters, pointers, etc.)

PHASE 3 — CODE: Last 1–2 steps
  Reveal the code panel (Prism.js highlighted).
  With each "next" click, highlight ONE line of code (add .code-line-hl to a <span>)
  AND simultaneously move/change the corresponding SVG actor.
  The student sees: code line fires → scene reacts → understanding clicks.

MANDATORY STEP COUNT: Minimum 6 steps, maximum 10 steps.

COGNITIVE LOAD RULES (one thing at a time):
✅ Each step = ONE action in the SVG scene (one element moves, one appears, one changes)
✅ Each step = ONE explanation sentence (typewriter reveals it word by word)
✅ Never move two unrelated elements in the same step
✅ Spotlight the active element in every step

WATCH PANEL RULE:
✅ For loops, recursion, algorithms → show the Watch Panel
✅ Update it on every step where variables change using updateWatch({varName: newVal})
✅ Panel flashes green on change (animation built in)
✅ Hide the panel for pure concept steps (variables/functions/OOP intro)

REAL-WORLD ANALOGIES TABLE:
| Concept      | Phase 1 (Real World)                        | Phase 2 (Abstraction)             |
|--------------|---------------------------------------------|-----------------------------------|
| Variable     | صندوق عليه لافتة ملصقة باسمه               | مربع ذاكرة بعنوان وقيمة           |
| Array        | رف خبّاز بخانات مرقّمة من 0               | كتلة ذاكرة متجاورة بمؤشرات        |
| for loop     | ساعي بريد يزور كل بيت بالترتيب             | مؤشر يتحرك على خلايا الذاكرة      |
| while loop   | حارس يفحص الباب باستمرار                   | مؤشر شرطي يدور حتى flag = false   |
| if/else      | موظف أمن: تذكرة → ادخل، بدون → ارجع       | مشعب قرار ثنائي في مخطط التدفق    |
| function     | ماكينة قهوة: أدخل مدخلات، تخرج نتيجة      | كتلة كود لها input/output         |
| Stack        | برج أطباق: تضع فوق، تأخذ فوق              | مصفوفة LIFO بمؤشر top             |
| Queue        | طابور مستشفى: أول داخل أول يُخدَم          | قائمة FIFO بمؤشري head/tail       |
| Recursion    | مرايا متقابلة: كل مرآة تحتوي نفس المشهد   | دالة تستدعي نفسها مع حالة أصغر    |
| Class/Object | قالب + منتجات مصنوعة منه                  | blueprint + instance في الذاكرة   |
| Binary       | مفاتيح كهرباء: 0=مطفأ، 1=مضاء             | bits في سجل ذاكرة                 |
| Pointer      | لافتة "التوجه إلى غرفة 42"                | متغير يحمل عنواناً لا قيمة         |

══════════════════════════════════════════════════════════════════
PART 7 — ARABIC / LTR MIXING RULES
══════════════════════════════════════════════════════════════════

✅ Code identifiers in Arabic text → <bdi class="ltr code-font">myVar</bdi>
✅ English tech terms → <bdi class="ltr" style="color:#38bdf8;font-weight:600;">Stack</bdi>
✅ Inline code → <code class="ltr code-font" style="background:rgba(30,41,59,0.8);padding:2px 7px;border-radius:4px;color:#9cdcfe;border:1px solid #334155;">x = 5</code>
✅ Math expressions → <bdi class="ltr code-font" style="color:#b5cea8;">O(n²)</bdi>
✅ SVG <text> elements with Latin content → add text-anchor and direction:ltr in style
❌ NEVER bare English words in Arabic text — causes RTL corruption

══════════════════════════════════════════════════════════════════
PART 8 — FORBIDDEN PATTERNS
══════════════════════════════════════════════════════════════════

❌ Using <div> to draw shapes in the scene — SVG only
❌ Using left/top/right/bottom CSS for movement — transform only
❌ Position:absolute on scene actors — SVG coordinates only
❌ Two @keyframes animations on the same element simultaneously
❌ Animations auto-playing on page load — nextStep() triggers everything
❌ More than ONE action per step
❌ Tech terms in Phase 1 steps (first 2 steps)
❌ Code panel visible before Phase 3
❌ resetVisuals() that doesn't restore every animated element
❌ Font size < 12px anywhere
❌ Background lighter than #1e293b
❌ Missing <bdi> around English identifiers in Arabic prose
❌ Hardcoded pixel positions that break on different widths (use viewBox % positions)
❌ Skipping spotlight() — every step must dim inactive actors and focus the active one

══════════════════════════════════════════════════════════════════
PART 9 — SELF-CHECK (mandatory before outputting)
══════════════════════════════════════════════════════════════════

□ Head block includes Prism.js CDN + Cairo + Fira Code?
□ SVG viewBox="0 0 700 260" used for the scene?
□ ALL shapes are SVG elements (rect/circle/path) — no divs for shapes?
□ ALL movement uses transform, never left/top?
□ Spotlight applied in every step?
□ 3-phase structure respected (real-world → abstraction → code)?
□ At least 6 steps total?
□ Phase 1 steps (1–2) have zero tech terms?
□ Code panel only in last 1–2 steps?
□ Prism.js code block has correct language class?
□ Watch panel shown only for concepts with trackable variables?
□ prevStep() correctly replays state from scratch?
□ resetVisuals() restores every SVG element's transform, opacity, fill?
□ typewrite() used for every step's explanation text?
□ All English identifiers wrapped in <bdi class="ltr code-font">?
□ No auto-playing animations on page load?

If any box fails → fix before outputting.`;

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
