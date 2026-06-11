/**
 * v4 Teaching Quality Test — realistic multi-turn student session
 * against the live api-server on localhost:8080.
 *
 * Usage:  node scripts/test-v4-teaching.mjs < /dev/null
 */
import { createHmac } from "crypto";

const API = "http://localhost:8080/api";
const SLUG = "skill-python";
const LESSON = "1.1.1.1";
const USER_ID = 3;
const TURN_TIMEOUT_MS = 90_000;

// ── session signing (mirrors lib/session.ts) ──────────────────────────────────
function signSession(userId) {
  const SECRET = process.env.SESSION_SECRET ?? "nukhba-dev-only-insecure-fallback";
  const payload = JSON.stringify({ userId });
  const data = Buffer.from(payload, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${data}.${sig}`;
}

// ── SSE reader with per-chunk streaming print ─────────────────────────────────
async function readSSEStream(body, onChunk) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let effects = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let ev;
      try { ev = JSON.parse(line.slice(6)); } catch { continue; }
      if (ev.content) {
        text += ev.content;
        onChunk(ev.content);
      }
      if (ev.done) effects = ev;
    }
  }
  return { text, effects };
}

// ── single teaching turn with timeout ────────────────────────────────────────
async function teach(cookie, message, history) {
  const requestId = `t${Date.now().toString(36)}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TURN_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API}/v4/teach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nukhba-Csrf": "1",
        Origin: "http://localhost:8080",
        Cookie: `session=${cookie}`,
      },
      body: JSON.stringify({ slug: SLUG, lessonCode: LESSON, message, requestId, history }),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }

  process.stdout.write("\n");
  const { text, effects } = await readSSEStream(res.body, chunk => {
    process.stdout.write(chunk);
  });
  process.stdout.write("\n");
  return { text, effects };
}

// ── strip internal protocol markers for display ───────────────────────────────
function summariseEffects(effects) {
  if (!effects) return [];
  const out = [];
  if (effects.error) out.push(`⚠️  ${effects.error}`);
  if (effects.masteredConcepts?.length) out.push(`✅ أتقن: ${effects.masteredConcepts.join(", ")}`);
  if (effects.lessonMastered) out.push("🏆 أتقن الدرس!");
  if (effects.facetAsked) out.push(`🔬 وجه الفهم: ${effects.facetAsked}`);
  if (effects.gemsCharged != null) out.push(`💎 -${effects.gemsCharged} جيم`);
  if (effects.charged === false) out.push("(تحذير: لم تُخصم جيمات)");
  return out;
}

// ── student simulation turns ──────────────────────────────────────────────────
const TURNS = [
  "مرحباً، ما هو المتغير في بايثون؟ أنا ما تعلمت برمجة قبل.",
  "طيب فهمت إن المتغير مثل الصندوق. بس ما فهمت ليش أحياناً نكتب name = 'أحمد' وأحياناً name = 5 — هل الفرق مهم؟",
  "جربت أكتب: student name = 'علي' وطلعت عندي error. ما أفهم ليش!",
];

const SEP = "═".repeat(68);
const DIV = "─".repeat(68);

const cookie = signSession(USER_ID);
const history = [];

console.log(SEP);
console.log("🧪  اختبار جودة التعليم — نخبة v4");
console.log(`📚  التخصص: ${SLUG}  |  الدرس: ${LESSON}`);
console.log(`👤  طالب تجريبي (userId=${USER_ID})`);
console.log(SEP);

for (let i = 0; i < TURNS.length; i++) {
  const msg = TURNS[i];
  console.log(`\n${DIV}`);
  console.log(`📌  الدور ${i + 1}/${TURNS.length} — الطالب 🙋`);
  console.log(DIV);
  console.log(msg);
  console.log(`\n${DIV}`);
  console.log(`📌  الدور ${i + 1}/${TURNS.length} — المعلم 🤖 (يكتب...)`);
  console.log(DIV);

  const t0 = Date.now();
  let result;
  try {
    result = await teach(cookie, msg, history);
  } catch (err) {
    console.error(`\n❌  خطأ: ${err.message}`);
    break;
  }

  const ms = Date.now() - t0;
  const fx = summariseEffects(result.effects);
  console.log(`\n⏱  ${(ms / 1000).toFixed(1)}ث`);
  if (fx.length) console.log("📊  آثار:", fx.join("  |  "));

  history.push({ role: "user", content: msg });
  history.push({ role: "assistant", content: result.text });

  // brief pause so in-flight guard resets cleanly
  await new Promise(r => setTimeout(r, 800));
}

console.log(`\n${SEP}`);
console.log("✅  انتهى الاختبار");
console.log(SEP);
