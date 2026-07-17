/**
 * Visual Explain Route — POST /v4/visual-explain
 *
 * Generates a self-contained interactive Arabic HTML page that visually
 * explains a teacher message, using OpenAI GPT-5 via GitHub Models API.
 *
 * Flow:
 *  1. Receive { message } from the student frontend
 *  2. Build a prompt with strict design specs + reference examples
 *  3. Call gpt-5 via GitHub Models (models.inference.ai.azure.com)
 *  4. Extract HTML from response and return { html }
 */

import { Router } from "express";
import crypto    from "crypto";

// ── Auth ──────────────────────────────────────────────────────────────────────
function getUserId(req: any): number | null {
  return (req.session as any)?.userId ?? null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MORPHLLM_API_BASE = "https://openrouter.ai/api/v1";
const MORPHLLM_MODEL    = "google/gemini-2.5-pro";
const MORPHLLM_TIMEOUT  = 90_000; // 90 s — generous for a large HTML generation
const MAX_MESSAGE_CHARS = 5_000;

// ── Simple in-memory cache ────────────────────────────────────────────────────
// Same teacher message → same HTML, no need to re-generate
const htmlCache = new Map<string, string>();

function cacheKey(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex").slice(0, 20);
}

// ── HTML extraction ───────────────────────────────────────────────────────────
// Handles all response formats Gemini Flash Lite may produce:
//   • Extended-thinking tags (<think>…</think> or <thinking>…</thinking>) before HTML
//   • ```html … ``` fenced blocks (with or without "html" specifier)
//   • Bare <!DOCTYPE html … </html>
//   • <html … </html> without doctype
//   • Truncated HTML (model hit max_tokens before </html>)
function extractHtml(rawText: string): string | null {
  // Strip extended-thinking blocks that Gemini may include before the HTML.
  // These appear as <think>…</think> or <thinking>…</thinking> wrappers.
  const text = rawText
    .replace(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "")
    .trim();

  const MIN = 500; // minimum plausible HTML size

  // 1. ```html … ``` fenced block (with "html" specifier)
  const fencedHtml = /```html\s*([\s\S]*?)```/i.exec(text);
  if (fencedHtml?.[1]?.trim().length > MIN) return fencedHtml[1].trim();

  // 2. Generic ``` … ``` fenced block (model may omit the "html" tag)
  const fencedAny = /```(?:\w*\s*)?\n?(<!DOCTYPE[\s\S]*?<\/html>)/i.exec(text);
  if (fencedAny?.[1]?.trim().length > MIN) return fencedAny[1].trim();

  // 3. Bare <!DOCTYPE html … </html>
  const bare = /<!DOCTYPE\s+html[\s\S]*?<\/html>/i.exec(text);
  if (bare?.[0]?.length > MIN) return bare[0].trim();

  // 4. <html … </html> without doctype
  const tag = /<html[\s\S]*?<\/html>/i.exec(text);
  if (tag?.[0]?.length > MIN) return tag[0].trim();

  // 5. Truncated — model hit token limit before </html>; recover everything
  //    from <!DOCTYPE (or <html) to end-of-text, as long as it's substantial.
  const partial = /(!DOCTYPE\s+html|<html\b)[\s\S]+/i.exec(text);
  if (partial?.[0]?.length > MIN) return "<" + partial[0].trim();

  return null;
}

// ── Server-side HTML template ─────────────────────────────────────────────────
// All boilerplate (CSS, JS engine, layout) lives HERE on the server.
// GPT-5 generates ONLY the 4 dynamic sections (title, subtitle, SVG, JS).
// This keeps the prompt well under 4000 tokens.
const VISUAL_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}}</title>
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
.ltr{direction:ltr;display:inline-block;}.code-font{font-family:'Fira Code',monospace;}
.card{background:rgba(30,41,59,0.85);border:1px solid rgba(51,65,85,0.8);border-radius:16px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 24px -4px rgba(0,0,0,0.5),0 1px 0 0 rgba(255,255,255,0.04) inset;}
.scene-wrap{width:100%;border-radius:12px;border:1px solid #1e293b;background:#060d1a;overflow:hidden;}
.scene-svg{width:100%;display:block;}
.explanation-bar{background:rgba(180,83,9,0.12);border-right:4px solid #d97706;padding:1.1rem 1.4rem;min-height:88px;display:flex;align-items:center;backdrop-filter:blur(6px);}
#explanation{font-size:1.05rem;color:#fef3c7;line-height:1.75;min-height:2.5rem;}
.control-bar{display:flex;justify-content:space-between;align-items:center;padding:0.9rem 1.25rem;border-top:1px solid rgba(51,65,85,0.6);background:rgba(15,23,42,0.7);backdrop-filter:blur(8px);}
.btn-next{background:linear-gradient(135deg,#d97706,#b45309);color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:1rem;padding:0.65rem 1.6rem;border-radius:10px;border:none;cursor:pointer;transition:filter 0.2s,transform 0.15s;box-shadow:0 2px 12px rgba(217,119,6,0.35);display:flex;align-items:center;gap:8px;}
.btn-next:hover:not(:disabled){filter:brightness(1.12);}.btn-next:active:not(:disabled){transform:scale(0.96);}.btn-next:disabled{opacity:0.35;cursor:not-allowed;box-shadow:none;}
.btn-prev{background:rgba(51,65,85,0.7);color:#e2e8f0;font-family:'Cairo',sans-serif;font-weight:600;font-size:0.95rem;padding:0.65rem 1.1rem;border-radius:10px;border:1px solid rgba(71,85,105,0.5);cursor:pointer;transition:background 0.2s,transform 0.15s;}
.btn-prev:hover:not(:disabled){background:rgba(71,85,105,0.8);}.btn-prev:disabled{opacity:0.25;cursor:not-allowed;}
.btn-reset{background:rgba(30,41,59,0.6);color:#94a3b8;font-family:'Cairo',sans-serif;font-weight:600;font-size:0.9rem;padding:0.55rem 1rem;border-radius:8px;border:1px solid rgba(51,65,85,0.5);cursor:pointer;transition:background 0.2s,color 0.2s;}
.btn-reset:hover{background:rgba(51,65,85,0.7);color:#e2e8f0;}
.step-badge{color:#94a3b8;font-weight:700;padding:0.4rem 0.9rem;border-radius:8px;border:1px solid rgba(51,65,85,0.6);font-size:0.9rem;background:rgba(15,23,42,0.5);}
.step-badge.done{background:#166534;color:#fff;border-color:#166534;}
.code-panel{display:none;padding:0 1.25rem 1.25rem;}
.code-panel pre[class*="language-"]{border-radius:10px;font-size:0.88rem;line-height:1.85;border:1px solid #1e293b;margin:0;box-shadow:0 2px 12px rgba(0,0,0,0.4);}
.code-panel .code-line-hl{display:block;background:rgba(56,189,248,0.12);border-right:3px solid #38bdf8;border-radius:3px;transition:background 0.4s;}
.watch-panel{position:absolute;top:10px;right:10px;background:rgba(15,23,42,0.82);border:1px solid rgba(56,189,248,0.25);border-radius:8px;padding:6px 10px;font-family:'Fira Code',monospace;font-size:0.78rem;min-width:90px;direction:ltr;text-align:left;backdrop-filter:blur(6px);z-index:10;}
.watch-panel .wv{color:#9cdcfe;transition:color 0.3s;}.watch-panel .wv.changed{color:#22c55e;animation:wFlip 0.4s ease;}
@keyframes wFlip{0%{transform:rotateX(90deg);opacity:0;}60%{transform:rotateX(-10deg);}100%{transform:rotateX(0);opacity:1;}}
.t-bounce{transition:transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55),opacity 0.3s ease;}
.t-glide{transition:transform 0.6s cubic-bezier(0.22,1,0.36,1),opacity 0.35s ease;}
.t-snap{transition:transform 0.25s cubic-bezier(0.4,0,0.2,1),opacity 0.2s ease;}
.svg-dim{opacity:0.25;transition:opacity 0.4s ease;}.svg-focus{filter:drop-shadow(0 0 8px #38bdf8);transition:filter 0.4s,opacity 0.4s;}
.svg-success{filter:drop-shadow(0 0 10px #22c55e);}.svg-error{filter:drop-shadow(0 0 10px #ef4444);}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
.cursor{display:inline-block;width:2px;height:1em;background:#d97706;vertical-align:text-bottom;animation:blink 0.8s step-end infinite;margin-right:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes popIn{from{opacity:0;transform:scale(0.4);}to{opacity:1;transform:scale(1);}}
@keyframes bounceY{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-5px);}75%{transform:translateX(5px);}}
</style>
</head>
<body class="p-4 flex flex-col items-center">
  <header style="text-align:center;margin-bottom:1.5rem;width:100%;max-width:740px;">
    <h1 style="font-size:1.75rem;font-weight:800;color:#fbbf24;margin-bottom:0.2rem;">{{TITLE}}</h1>
    <p style="color:#94a3b8;font-size:0.92rem;">{{SUBTITLE}}</p>
  </header>
  <main class="card" style="width:100%;max-width:740px;overflow:hidden;">
    <div class="explanation-bar">
      <p id="explanation">👆 اضغط <b>«التالي»</b> لتبدأ الشرح البصري.</p>
    </div>
    <div style="padding:1.25rem;">
      <div class="scene-wrap" style="position:relative;">
        <svg id="scene" class="scene-svg" viewBox="0 0 700 260" style="height:260px;">
          {{SVG_SCENE}}
        </svg>
        <div class="watch-panel" id="watch" style="display:none;"></div>
      </div>
    </div>
    <div class="code-panel" id="code-panel">
      <p style="color:#94a3b8;font-size:0.82rem;margin-bottom:0.6rem;text-align:center;">الكود المقابل للمشهد ↓</p>
      <pre><code id="code-block" class="language-javascript">/* الكود يظهر هنا */</code></pre>
    </div>
    <div class="control-bar">
      <div id="step-badge" class="step-badge">ابدأ</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button class="btn-reset" onclick="resetAll()">🔄</button>
        <button class="btn-prev" id="btn-prev" onclick="prevStep()" disabled>&#9664; السابق</button>
        <button class="btn-next" id="btn-next" onclick="nextStep()">التالي &#9654;</button>
      </div>
    </div>
  </main>
<script>
let _ac=null;
function playSound(type){try{if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();if(_ac.state==='suspended')_ac.resume();const o=_ac.createOscillator(),g=_ac.createGain();o.connect(g);g.connect(_ac.destination);const t=_ac.currentTime;const cfg={click:{type:'sine',f:[520],vol:0.07,dur:0.09},step:{type:'triangle',f:[330,520],vol:0.08,dur:0.16},success:{type:'triangle',f:[400,600,800],vol:0.10,dur:0.30},back:{type:'sine',f:[300,240],vol:0.06,dur:0.14}}[type]||{type:'sine',f:[440],vol:0.06,dur:0.1};o.type=cfg.type;cfg.f.forEach((f,i)=>o.frequency.setValueAtTime(f,t+i*(cfg.dur/cfg.f.length)));g.gain.setValueAtTime(cfg.vol,t);g.gain.linearRampToValueAtTime(0.001,t+cfg.dur);o.start(t);o.stop(t+cfg.dur+0.05);}catch(e){}}
let _twTimer=null;
function typewrite(html,targetId='explanation',speed=22){clearTimeout(_twTimer);const el=document.getElementById(targetId);if(!el)return;el.innerHTML='<span class="cursor"></span>';const tmp=document.createElement('div');tmp.innerHTML=html;const text=tmp.textContent||'';let i=0;function tick(){if(i<=text.length){el.innerHTML=text.slice(0,i)+'<span class="cursor"></span>';i++;_twTimer=setTimeout(tick,speed);}else{el.innerHTML=html;}}tick();}
function spotlight(ids){const all=document.querySelectorAll('#scene [data-actor]');all.forEach(el=>{if(ids.length===0||ids.includes(el.id)){el.classList.remove('svg-dim');if(ids.length>0)el.classList.add('svg-focus');else el.classList.remove('svg-focus');}else{el.classList.remove('svg-focus');el.classList.add('svg-dim');}});}
function updateWatch(vars){const panel=document.getElementById('watch');if(panel)panel.style.display='block';Object.entries(vars).forEach(([k,v])=>{const el=document.getElementById('wv-'+k);if(!el)return;el.classList.remove('changed');void el.offsetWidth;el.textContent=v;el.classList.add('changed');setTimeout(()=>el.classList.remove('changed'),600);});}
// ── showCode helper — safe code panel renderer ────────────────────────────────
// Usage: showCode('python', myCodeVar)
// Always pass code as a variable defined with String.raw above the steps array.
// Never inline code strings directly inside action() — escaping will break.
function showCode(lang, code){
  const block=document.getElementById('code-block');
  const panel=document.getElementById('code-panel');
  if(!block||!panel)return;
  block.className='language-'+(lang||'javascript');
  block.textContent=code; // textContent = safe, no HTML-escaping issues
  if(window.Prism)Prism.highlightElement(block);
  panel.style.display='block';
}
// ── highlightLine helper — add blue glow to one code line ─────────────────────
// Usage: highlightLine(3)  ← 1-based line number
function highlightLine(n){
  const block=document.getElementById('code-block');
  if(!block)return;
  const lines=block.innerHTML.split('\n');
  const idx=n-1;
  if(idx<0||idx>=lines.length)return;
  lines[idx]='<span class="code-line-hl">'+lines[idx]+'</span>';
  block.innerHTML=lines.join('\n');
}
let currentStep=0;
{{STEPS_AND_RESET}}
function applyStep(i){if(i<0||i>=steps.length)return;const s=steps[i];typewrite(s.text);if(s.action)s.action();const badge=document.getElementById('step-badge');const done=i===steps.length-1;if(badge){badge.textContent=done?'✅ اكتمل':(i+1)+' / '+steps.length;badge.classList.toggle('done',done);}const nb=document.getElementById('btn-next'),pb=document.getElementById('btn-prev');if(nb)nb.disabled=done;if(pb)pb.disabled=(i===0);if(done)playSound('success');}
function nextStep(){if(currentStep>=steps.length)return;playSound('step');applyStep(currentStep);currentStep++;}
function prevStep(){if(currentStep<=1)return;playSound('back');currentStep--;resetVisuals();for(let i=0;i<currentStep-1;i++)if(steps[i].action)steps[i].action();applyStep(currentStep-1);}
function resetAll(){currentStep=0;clearTimeout(_twTimer);playSound('click');document.getElementById('explanation').innerHTML='👆 اضغط <b>«التالي»</b> لتبدأ الشرح البصري.';const nb=document.getElementById('btn-next'),pb=document.getElementById('btn-prev');if(nb)nb.disabled=false;if(pb)pb.disabled=true;const badge=document.getElementById('step-badge');if(badge){badge.textContent='ابدأ';badge.classList.remove('done');}const cp=document.getElementById('code-panel');if(cp)cp.style.display='none';spotlight([]);const wp=document.getElementById('watch');if(wp)wp.style.display='none';resetVisuals();}
<\/script>
</body>
</html>`;

// ── Minimal system prompt (~400 tokens — fits well inside GPT-5 GitHub Models limit) ──
const SYSTEM_PROMPT = `You are an Arabic educational visualization expert. Your output MUST contain ONLY these 4 labeled sections — no other text, no HTML wrapper, no explanations.

=== TITLE ===
[Concise Arabic title, 3-6 words]
=== END_TITLE ===

=== SUBTITLE ===
[One Arabic sentence: a vivid real-world analogy for the concept]
=== END_SUBTITLE ===

=== SVG_SCENE ===
[SVG child elements that go INSIDE <svg viewBox="0 0 700 260">]
[Use: rect, circle, ellipse, path, polygon, text, g, defs, marker — NO <svg> tag itself]
[Every animated element: id="unique-id" data-actor="true"]
[Warm colors for real-world: #fbbf24 #f97316 #a78bfa]
[Cool colors for abstract data: #38bdf8 #22c55e #818cf8]
[SVG Arabic text: font-family="Cairo, sans-serif"]
=== END_SVG_SCENE ===

=== JS_CODE ===
// ── RULE: define ALL code strings ABOVE the steps array using a multiline string ──
// Example:
//   const CODE_PYTHON = "def example(x):\\n    return x * 2\\nprint(example(3))";
// Then in action(): showCode('python', CODE_PYTHON); highlightLine(1);

const steps = [
  {
    text: "Arabic HTML — use <bdi class=\"ltr code-font\">identifier</bdi> for identifiers, <bdi class=\"ltr\" style=\"color:#38bdf8\">Term</bdi> for English terms",
    action: () => {
      // SVG movement:   el.style.transform='translate(Xpx,Ypx)'; el.classList.add('t-glide');
      // SVG opacity:    el.style.opacity='0';
      // Spotlight:      spotlight(['actor-id'])  or  spotlight([]) to clear
      // Watch panel:    updateWatch({i: 3, total: 10})
      // Show code:      showCode('python', CODE_EXAMPLE)   ← use the variable above
      // Highlight line: highlightLine(2)                   ← 1-based line number
    }
  },
  // ... 6 to 8 steps total
];
function resetVisuals() {
  // Restore ALL animated elements: clear transform, reset opacity, reset fill
}
=== END_JS_CODE ===

STEP RULES: 6-8 steps. Phase 1 (steps 1-2): real-world SVG, warm colors, ZERO tech terms. Phase 2 (steps 3-5): morph real-world → abstract data structure, cool colors. Phase 3 (steps 6-8): reveal code with showCode(), highlight lines with highlightLine(). Each step: ONE action, spotlight the active actor.

CODE PANEL RULES (CRITICAL):
- ALWAYS declare code as a plain string variable BEFORE the steps array — never paste raw code inside action()
- Call showCode('language', VARIABLE_NAME) — supported langs: python, javascript, java, c, cpp, sql, bash
- After showCode(), call highlightLine(n) in the SAME action to glow the relevant line
- In resetVisuals(): call document.getElementById('code-panel').style.display='none'`;


// ── Build user message (short — the system prompt is already concise) ─────────
function buildTaskPrompt(message: string): { system: string; user: string } {
  const truncated =
    message.length > MAX_MESSAGE_CHARS
      ? message.slice(0, MAX_MESSAGE_CHARS) + "\n\n[... الرسالة مختصرة لأنها طويلة جداً]"
      : message;

  const user = `رسالة المعلم:\n\n${truncated}\n\nأخرج الأقسام الأربعة المطلوبة فقط (TITLE, SUBTITLE, SVG_SCENE, JS_CODE).`;
  return { system: SYSTEM_PROMPT, user };
}

// ── Parse model sections ──────────────────────────────────────────────────────
// Extracts the 4 labeled sections from the model's response.
function parseModelSections(text: string): {
  title: string; subtitle: string; svgScene: string; jsCode: string;
} | null {
  function extract(tag: string): string {
    const re = new RegExp(`===\\s*${tag}\\s*===([\\s\\S]*?)===\\s*END_${tag}\\s*===`, "i");
    const m = re.exec(text);
    return m ? m[1].trim() : "";
  }
  const title    = extract("TITLE");
  const subtitle = extract("SUBTITLE");
  const svgScene = extract("SVG_SCENE");
  const jsCode   = extract("JS_CODE");

  if (!svgScene || !jsCode) {
    console.error("[visual-explain] parseModelSections failed. Preview:", text.slice(0, 1000));
    return null;
  }
  return { title: title || "الشرح البصري", subtitle: subtitle || "", svgScene, jsCode };
}

// ── Assemble final HTML ───────────────────────────────────────────────────────
function assembleVisualHtml(
  title: string, subtitle: string, svgScene: string, jsCode: string
): string {
  return VISUAL_HTML_TEMPLATE
    .replace(/\{\{TITLE\}\}/g,            escapeHtml(title))
    .replace(/\{\{SUBTITLE\}\}/g,         escapeHtml(subtitle))
    .replace("{{SVG_SCENE}}",             svgScene)
    .replace("{{STEPS_AND_RESET}}",       jsCode);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
           .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ── Morph LLM: call morph-v3-fast via OpenAI-compatible API ──────────────────
async function callMorphLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY غير محدد في الـ Secrets");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MORPHLLM_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${MORPHLLM_API_BASE}/chat/completions`, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       MORPHLLM_MODEL,
        max_tokens:  16000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt   },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Morph LLM فشل (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
    error?:   { message: string };
  };

  if (data.error) throw new Error(`Morph LLM خطأ: ${data.error.message}`);

  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Morph LLM أرجع رداً فارغاً");

  return text; // raw model output — caller parses sections and assembles HTML
}

// ── Main entry ────────────────────────────────────────────────────────────────
async function generateVisualHtml(message: string): Promise<string> {
  const key = cacheKey(message);
  const cached = htmlCache.get(key);
  if (cached) {
    console.log("[visual-explain] Cache hit →", key);
    return cached;
  }

  console.log("[visual-explain] Calling Morph LLM / morph-v3-fast…");
  const t0 = Date.now();

  const { system, user } = buildTaskPrompt(message);
  const rawText = await callMorphLLM(system, user);

  const sections = parseModelSections(rawText);
  if (!sections) throw new Error("النموذج لم يُرجع الأقسام المطلوبة — حاول مرة أخرى");

  const html = assembleVisualHtml(sections.title, sections.subtitle, sections.svgScene, sections.jsCode);

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
