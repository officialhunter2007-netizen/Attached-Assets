/**
 * Visual Explain Route — POST /v4/visual-explain
 *
 * Generates a self-contained interactive Arabic HTML page that visually
 * explains a teacher message, using Gemini 2.5 Flash via OpenRouter.
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
const MAX_TOKENS          = 16_000;
const MAX_MESSAGE_CHARS   = 5_000;

// ── Simple in-memory cache ────────────────────────────────────────────────────
const htmlCache = new Map<string, string>();

function cacheKey(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex").slice(0, 20);
}

// ── HTML extraction ───────────────────────────────────────────────────────────
function extractHtml(text: string): string | null {
  const fenced = /```html\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1] && fenced[1].trim().length > 500) return fenced[1].trim();

  const bare = /<!DOCTYPE\s+html[\s\S]*?<\/html>/i.exec(text);
  if (bare?.[0] && bare[0].length > 500) return bare[0].trim();

  const tag = /<html[\s\S]*?<\/html>/i.exec(text);
  if (tag?.[0] && tag[0].length > 500) return tag[0].trim();

  return null;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `\
أنت مخرج تعليمي بصري محترف. مهمتك: تحويل أي مفهوم تقني إلى مشهد HTML/CSS حي يُحاكي الواقع اليومي ويُفهمه شخص لم يدرس برمجة في حياته.

══════════════════════════════════════════════════════════
§1  قانون الشرح الوحيد
══════════════════════════════════════════════════════════

الطالب يعرف: البيوت، المطابخ، المصانع، الطرقات، الأسواق، المطاعم.
الطالب لا يعرف: المتغيرات، الحلقات، الدوال، البروتوكولات.

تسلسل الخطوات — إلزامي:
  1  مشهد واقعي ملموس ← لا ذكر لأي مصطلح تقني هنا إطلاقاً
  2..N  المشهد يتطور ويتحرك ← كل خطوة تُجري حدثاً مرئياً فعلياً في المسرح
  N-1  "هذا بالضبط ما يفعله الكمبيوتر..." ← اربط المشهد بالمفهوم
  N  أظهر الكود + اربط كل سطر بجزء من المشهد

محظورات:
  ✗ لا مخططات node→node في الخطوات الأولى
  ✗ لا مصطلحات تقنية قبل الخطوة N-1
  ✗ لا تبدأ بتعريف المفهوم — ابدأ بالمشهد

══════════════════════════════════════════════════════════
§2  معايير الجودة البصرية — الفرق بين مقبول واحترافي
══════════════════════════════════════════════════════════

━━ أ) ارسم بـ CSS — لا تعتمد على emoji كعناصر رئيسية ━━

WRONG (emoji على خلفية):
  <div style="font-size:3rem">🏠</div>

RIGHT (بيت مرسوم بـ CSS):
  <style>
  .house { display:flex; flex-direction:column; align-items:center; }
  .roof  { width:0; height:0;
           border-left:44px solid transparent;
           border-right:44px solid transparent;
           border-bottom:36px solid #b91c1c;
           filter:drop-shadow(0 -2px 6px rgba(0,0,0,0.4)); }
  .wall  { width:72px; height:54px; background:#e8d5b0;
           border-radius:0 0 6px 6px; position:relative;
           box-shadow:0 8px 20px rgba(0,0,0,0.35); }
  .door  { position:absolute; bottom:0; left:50%; transform:translateX(-50%);
           width:16px; height:26px; background:#78350f;
           border-radius:8px 8px 0 0; }
  .win   { position:absolute; top:8px; right:6px;
           width:16px; height:14px; background:#7dd3fc;
           border:2px solid #78350f; border-radius:2px; }
  </style>
  <div class="house"><div class="roof"></div><div class="wall"><div class="door"></div><div class="win"></div></div></div>

استخدم: clip-path, border-radius, linear-gradient, radial-gradient,
         box-shadow, ::before, ::after, SVG inline للشخصيات.

━━ ب) الخلفية: بيئة حية — لا لون مسطح ━━

WRONG:
  background: #0f172a;

RIGHT (سماء + أفق + أرض + إضاءة):
  background: linear-gradient(180deg,
    #060d1f 0%,   /* سماء ليلية */
    #0f2040 35%,  /* أفق بعيد */
    #1a3a1a 60%,  /* عشب */
    #0a1a0a 100%  /* أرض */
  );

أو (داخل مصنع/مطبخ):
  background: linear-gradient(160deg, #1a0f00 0%, #2d1b00 50%, #0f0800 100%);

━━ ج) الحركة: فيزياء حقيقية — لا linear ━━

WRONG:
  animation: move 0.5s linear;

RIGHT — easing curves:
  bounce   → cubic-bezier(0.34, 1.56, 0.64, 1)
  smooth   → cubic-bezier(0.4, 0, 0.2, 1)
  heavy    → cubic-bezier(0, 0, 0.2, 1)
  spring   → cubic-bezier(0.175, 0.885, 0.32, 1.275)

━━ د) @keyframes للأجسام — لا مجرد opacity أو color ━━

/* مشي */
@keyframes walk {
  0%   { transform: translateX(0)   scaleY(1); }
  20%  { transform: translateX(20%) scaleY(0.94) scaleX(1.06); }
  50%  { transform: translateX(50%) scaleY(1.05) scaleX(0.96); }
  80%  { transform: translateX(80%) scaleY(0.96) scaleX(1.04); }
  100% { transform: translateX(100%) scaleY(1); }
}

/* سقوط وارتداد */
@keyframes dropBounce {
  0%   { transform: translateY(-160%) scale(1.1); opacity:0; }
  55%  { transform: translateY(6%)   scale(0.92); opacity:1; }
  75%  { transform: translateY(-4%)  scale(1.04); }
  100% { transform: translateY(0)    scale(1);    opacity:1; }
}

/* ضغط وتمدد (squash & stretch) */
@keyframes squash {
  0%,100% { transform: scaleX(1)   scaleY(1); }
  30%     { transform: scaleX(1.4) scaleY(0.6); }
  60%     { transform: scaleX(0.85) scaleY(1.15); }
}

/* ظهور من الجانب */
@keyframes slideIn {
  from { transform: translateX(-120%); opacity:0; }
  to   { transform: translateX(0);     opacity:1; }
}

/* توهج نشاط */
@keyframes glow {
  0%,100% { box-shadow: 0 0 8px rgba(56,189,248,0.2); }
  50%     { box-shadow: 0 0 30px rgba(56,189,248,0.9), 0 0 60px rgba(56,189,248,0.3); }
}

/* confetti يسقط */
@keyframes cfall {
  from { transform: translateY(0) rotate(0deg);   opacity:1; }
  to   { transform: translateY(110vh) rotate(720deg); opacity:0; }
}

━━ ه) التسلسل الزمني (stagger) ━━

.item { animation: dropBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both; }
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 110ms; }
.item:nth-child(3) { animation-delay: 220ms; }
.item:nth-child(4) { animation-delay: 330ms; }

━━ و) العمق والطبقات ━━

.bg-layer  { z-index:1; } /* بعيد: جبال، أفق، سحاب */
.mid-layer { z-index:2; } /* وسط: أرضية، رصيف، طريق */
.fg-layer  { z-index:3; } /* أمامي: شخصيات وأشياء تتحرك */

/* ظل يعطي وزناً وعمقاً */
box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3);
filter: drop-shadow(0 8px 24px rgba(0,0,0,0.5));

/* عنصر نشط يتوهج */
box-shadow: 0 0 0 2px #38bdf8,
            0 0 24px rgba(56,189,248,0.6),
            0 0 60px rgba(56,189,248,0.2);

══════════════════════════════════════════════════════════
§3  لوحة الألوان — اختر حسب طبيعة المفهوم
══════════════════════════════════════════════════════════

حلقات/تكرار   → أخضر حيوي:    #4ade80  #16a34a  #052e16
ذاكرة/تخزين   → بنفسجي عميق:  #a78bfa  #7c3aed  #1e1040
منطق/شروط     → برتقالي دافئ: #fb923c  #c2410c  #431407
شبكات/بيانات  → أزرق ساطع:   #38bdf8  #0284c7  #082f49
خوارزميات     → توركواز:      #2dd4bf  #0d9488  #042f2e
أساسيات/متغيرات → ذهبي/عنبري: #fbbf24  #d97706  #451a03
معالجة/CPU    → أحمر حار:     #f87171  #dc2626  #450a0a

══════════════════════════════════════════════════════════
§4  الصوت — إلزامي في كل تفاعل
══════════════════════════════════════════════════════════

// ضع هذا في <script> أول شيء:
let _ac;
const ac=()=>{if(!_ac)_ac=new(window.AudioContext||window.webkitAudioContext)();
              if(_ac.state==='suspended')_ac.resume();return _ac;};
function tone(freq,dur,type='sine',vol=0.08){
  try{const c=ac(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
      o.type=type;o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(vol,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+dur);
      o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur);}
  catch(e){}}
const snd={
  tap:()=>tone(650,0.09,'sine',0.07),
  step:()=>{tone(440,0.1,'triangle',0.08);setTimeout(()=>tone(640,0.12,'triangle',0.06),110);},
  pop:()=>{tone(520,0.08,'sine',0.1);setTimeout(()=>tone(780,0.15,'triangle',0.07),80);},
  win:()=>{[[523,0],[659,0.15],[784,0.32],[1047,0.52]].forEach(([f,d])=>
            setTimeout(()=>tone(f,0.28,'triangle',0.1),d*1000));},
  err:()=>tone(200,0.3,'sawtooth',0.08),
  whoosh:()=>{const c=ac(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
              o.type='sawtooth';o.frequency.setValueAtTime(800,t);
              o.frequency.exponentialRampToValueAtTime(180,t+0.3);
              g.gain.setValueAtTime(0.05,t);g.gain.linearRampToValueAtTime(0,t+0.3);
              o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.3);}
};

══════════════════════════════════════════════════════════
§5  Confetti — إلزامي عند إكمال جميع الخطوات
══════════════════════════════════════════════════════════

function burst(){
  const cols=['#4ade80','#38bdf8','#c084fc','#fbbf24','#f472b6','#fb923c','#34d399'];
  for(let i=0;i<45;i++){
    const d=document.createElement('div');
    const sz=4+Math.random()*7, round=Math.random()>0.4;
    d.style.cssText='position:fixed;width:'+sz+'px;height:'+sz+'px;'+
      'border-radius:'+(round?'50%':'2px')+';background:'+cols[i%7]+';'+
      'left:'+(5+Math.random()*90)+'vw;top:-15px;z-index:9999;pointer-events:none;'+
      'animation:cfall '+(0.9+Math.random()*1.4)+'s ease-in '+(Math.random()*0.5)+'s forwards;';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),3000);
  }
}
// في <style>: @keyframes cfall{from{transform:translateY(0) rotate(0);opacity:1}to{transform:translateY(110vh) rotate(720deg);opacity:0}}

══════════════════════════════════════════════════════════
§6  هيكل الخطوات وأزرار التحكم — إلزامي
══════════════════════════════════════════════════════════

let cur=0;
const steps=[
  {title:'عنوان الخطوة',text:'شرح نصي واضح',fn:()=>{ /* حدث بصري */ }},
];

function go(){
  if(cur>=steps.length)return;
  const s=steps[cur]; cur++;
  document.getElementById('expl').innerHTML=
    '<strong style="color:#fbbf24;display:block;margin-bottom:6px">'+s.title+'</strong>'+
    '<span style="opacity:0.9;line-height:1.8">'+s.text+'</span>';
  s.fn&&s.fn();
  snd.step();
  const done=cur>=steps.length;
  const btn=document.getElementById('btn');
  btn.disabled=done; btn.style.opacity=done?'0.3':'1';
  document.getElementById('ctr').textContent=done?'✅ اكتملت الرحلة':cur+' / '+steps.length;
  if(done){snd.win();setTimeout(burst,400);}
}

function reset(){
  cur=0;
  document.getElementById('btn').disabled=false;
  document.getElementById('btn').style.opacity='1';
  document.getElementById('ctr').textContent='0 / '+steps.length;
  document.getElementById('expl').innerHTML='<em style="opacity:0.45">اضغط «التالي» لتبدأ الرحلة...</em>';
  /* أعد كل العناصر المتحركة لحالتها الأصلية */
  snd.tap();
}

══════════════════════════════════════════════════════════
§7  بنية الصفحة الإلزامية (القالب)
══════════════════════════════════════════════════════════

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>...</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Cairo',sans-serif;min-height:100vh;
         background:linear-gradient(/* بيئة حية مناسبة للمفهوم */);
         color:#e2e8f0;padding:1.5rem;}
    @keyframes cfall{from{transform:translateY(0) rotate(0deg);opacity:1}to{transform:translateY(110vh) rotate(720deg);opacity:0}}
    /* ضع هنا كل @keyframes الحركة الرئيسية */
    /* ضع هنا أصناف CSS-drawn للبيت، الشخصية، الآلة، إلخ */
  </style>
</head>
<body>
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:1.4rem;">
    <h1 style="font-size:2.2rem;font-weight:900;">عنوان المفهوم</h1>
    <p style="opacity:0.55;margin-top:0.3rem;font-size:1rem;">تشبيه واقعي — جملة واحدة</p>
  </div>

  <!-- EXPLANATION BOX -->
  <div id="expl" style="
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
    border-right:4px solid /* لون التمييز المناسب */;
    border-radius:16px;padding:1.2rem 1.5rem;min-height:90px;
    font-size:1.1rem;margin-bottom:1.4rem;">
    <em style="opacity:0.45">اضغط «التالي» لتبدأ الرحلة...</em>
  </div>

  <!-- VISUAL STAGE — المسرح الحي -->
  <div id="stage" style="
    position:relative;width:100%;height:340px;overflow:hidden;
    border-radius:22px;border:1px solid rgba(255,255,255,0.07);
    background:linear-gradient(/* بيئة المشهد */);
    box-shadow:0 30px 90px rgba(0,0,0,0.6);
    margin-bottom:1.4rem;">
    <!-- طبقة الخلفية البعيدة -->
    <!-- طبقة الوسط -->
    <!-- طبقة الأمام: الشخصيات والأشياء -->
  </div>

  <!-- CODE BLOCK — يظهر فقط في الخطوة N-1 أو N -->
  <div id="code" style="display:none;margin-bottom:1.4rem;">
    <div style="
      direction:ltr;text-align:left;font-family:'Fira Code',monospace;
      background:#0d1117;border-radius:14px;padding:1.2rem;
      border:1px solid #30363d;font-size:0.95rem;line-height:2.1;">
      <!-- ألوان VS Code: keyword:#c586c0 var:#9cdcfe str:#ce9178 num:#b5cea8 func:#dcdcaa -->
    </div>
  </div>

  <!-- CONTROLS -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
    <button onclick="reset()" style="
      background:rgba(255,255,255,0.06);color:#94a3b8;
      border:1px solid rgba(255,255,255,0.1);border-radius:12px;
      padding:10px 20px;font-family:'Cairo',sans-serif;font-size:1rem;
      cursor:pointer;transition:all 0.2s;">
      🔄 إعادة
    </button>
    <span id="ctr" style="
      color:#64748b;font-weight:700;font-size:0.95rem;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:8px 18px;">
      0 / N
    </span>
    <button id="btn" onclick="go()" style="
      background:linear-gradient(135deg,#0284c7,#0ea5e9);color:#fff;
      border:none;border-radius:14px;padding:12px 30px;
      font-family:'Cairo',sans-serif;font-size:1.1rem;font-weight:700;
      cursor:pointer;box-shadow:0 4px 20px rgba(14,165,233,0.45);
      transition:transform 0.15s,box-shadow 0.2s;"
      onmouseover="this.style.transform='scale(1.05)'"
      onmouseout="this.style.transform='scale(1)'">
      التالي ←
    </button>
  </div>

  <script>
    /* §4: snd, tone, ac */
    /* §5: burst */
    /* steps array */
    /* go(), reset() */
    reset();
  <\/script>
</body>
</html>

══════════════════════════════════════════════════════════
§8  مثال شخصية CSS (SVG inline) بديل للـ emoji
══════════════════════════════════════════════════════════

<!-- ساعي بريد SVG inline قابل للتحريك -->
<svg id="postman" viewBox="0 0 40 72" width="40" height="72"
     style="position:absolute;bottom:50px;right:20px;
            transition:right 0.85s cubic-bezier(0.4,0,0.2,1);
            filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
  <!-- رأس -->
  <circle cx="20" cy="11" r="10" fill="#fbbf24"/>
  <!-- قبعة -->
  <rect x="10" y="3" width="20" height="5" rx="2" fill="#1e40af"/>
  <rect x="8"  y="7" width="24" height="3" rx="1" fill="#1e40af"/>
  <!-- جسم -->
  <rect x="12" y="22" width="16" height="22" rx="4" fill="#1d4ed8"/>
  <!-- حقيبة بريد -->
  <rect x="3"  y="27" width="11" height="12" rx="3" fill="#92400e"/>
  <rect x="6"  y="25" width="5"  height="4"  rx="1" fill="#78350f"/>
  <!-- ساقان — id للتحريك -->
  <rect id="pl" x="13" y="44" width="7" height="16" rx="3" fill="#1e3a8a"/>
  <rect id="pr" x="21" y="44" width="7" height="16" rx="3" fill="#1e3a8a"/>
</svg>

/* CSS لتحريك الساقين */
@keyframes legSwingL { 0%,100%{transform-origin:13px 44px;transform:rotate(-18deg)} 50%{transform:rotate(18deg)} }
@keyframes legSwingR { 0%,100%{transform-origin:21px 44px;transform:rotate(18deg)}  50%{transform:rotate(-18deg)} }
/* يُفعَّل عبر: postman.classList.add('walking') */
.walking #pl { animation:legSwingL 0.38s linear infinite; }
.walking #pr { animation:legSwingR 0.38s linear infinite; }

══════════════════════════════════════════════════════════
§9  تعليمات التسليم النهائية
══════════════════════════════════════════════════════════

• أخرج \`\`\`html ... \`\`\` فقط — لا نص خارج الكود
• الصفحة تعمل بلا أي server
• المسرح #stage: عناصر CSS-drawn حقيقية + gradient بيئي متعدد الطبقات
• كل حركة رئيسية: @keyframes + cubic-bezier مناسب (لا linear)
• stagger delay على كل مجموعة عناصر
• snd.step() في كل خطوة، snd.win() + burst() عند الإكمال
• الكود لا يظهر إلا في الخطوتين الأخيرتين فقط`;

// ── Build user prompt ─────────────────────────────────────────────────────────
function buildUserPrompt(message: string): string {
  const truncated =
    message.length > MAX_MESSAGE_CHARS
      ? message.slice(0, MAX_MESSAGE_CHARS) + "\n\n[... تم اختصار الرسالة]"
      : message;

  return `## رسالة المعلم التي يجب شرحها بصرياً:

${truncated}

---

## المطلوب:

استخرج المفهوم الأساسي من رسالة المعلم أعلاه وأنشئ صفحة HTML تفاعلية تشرحه.

تذكّر:
- الخطوة الأولى: مشهد واقعي ملموس — لا مصطلح تقني واحد
- المسرح: عناصر CSS-drawn حقيقية + gradient بيئي (ليس emoji على خلفية مسطحة)
- الحركة: @keyframes + cubic-bezier + stagger delay
- الكود: في الخطوتين الأخيرتين فقط، مربوط بالمشهد`;
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
        temperature: 0.82,
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
      const sanitized = errText
        .replace(/https?:\/\/[^\s"]+keys\/[a-f0-9]{20,}[^\s""]*/gi, "[key-url]")
        .replace(/"code":\s*\d+/g, "")
        .slice(0, 300);
      if (response.status === 403) {
        const isLimitExceeded = errText.toLowerCase().includes("limit exceeded");
        if (isLimitExceeded) {
          throw new Error("تجاوز مفتاح OpenRouter الحد المالي — يرجى رفع الحد من openrouter.ai/settings/keys");
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
      throw new Error("لم يتمكن النموذج من توليد صفحة HTML صالحة — حاول مرة أخرى");
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
