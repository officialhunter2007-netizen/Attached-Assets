/**
 * Shared helpers for AI-driven HTML quiz generation.
 * Used by both v4_unit_quizzes.ts and v4_stage_quizzes.ts.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { generateGemini, GenerateGeminiError } from "./openrouter-generate";
import { validateQuizHtml } from "./validate-quiz-html";

export { GenerateGeminiError };

// ─── Content types ────────────────────────────────────────────────────────────

export interface LessonSummary {
  name: string;
  goal: string;
  finalCheckQuestion: string;
  concepts: Array<{ name: string; explanation: string }>;
  mistakes: Array<{ mistake: string; correction: string }>;
}

export interface UnitContent {
  name: string;
  goal: string;
  keyConcepts: string[];
  lessons: LessonSummary[];
}

export interface UnitSummary {
  name: string;
  goal: string;
  keyConcepts: string[];
  /** First few lesson names only — for stage-level prompts */
  lessonNames: string[];
}

export interface StageContent {
  name: string;
  goal: string;
  units: UnitSummary[];
}

export interface StageSummary {
  name: string;
  goal: string;
  units: Array<{ name: string; goal: string; keyConcepts: string[] }>;
}

export interface LevelContent {
  name: string;
  goal: string;
  stages: StageSummary[];
}

// ─── DB extraction ───────────────────────────────────────────────────────────

/**
 * Returns the latest published version_id for a specialty slug,
 * or null if none exists.
 */
async function getPublishedVersionId(specialtySlug: string): Promise<number | null> {
  const rows = await db.execute(
    sql`SELECT v.id
        FROM v4_instruction_file_versions v
        JOIN v4_specialties s ON s.id = v.specialty_id
        WHERE s.slug = ${specialtySlug} AND v.status = 'published'
        ORDER BY v.id DESC LIMIT 1`
  );
  if (!rows.rows.length) return null;
  return Number(rows.rows[0].id);
}

/**
 * Extract all lesson content for a single unit (unit_id already known).
 * Caps: 10 lessons, 5 concepts/lesson, 2 mistakes/lesson.
 */
async function fetchLessonsForUnit(unitId: number): Promise<LessonSummary[]> {
  const lessonRows = await db.execute(
    sql`SELECT l.id, l.name, l.goal, l.final_check_question
        FROM v4_lessons l
        WHERE l.unit_id = ${unitId}
        ORDER BY l.lesson_index
        LIMIT 10`
  );
  if (!lessonRows.rows.length) return [];

  // Concepts — join through v4_lessons (no IN array needed)
  const conceptRows = await db.execute(
    sql`SELECT lc.lesson_id, lc.name, lc.explanation
        FROM v4_lesson_concepts lc
        JOIN v4_lessons l ON l.id = lc.lesson_id
        WHERE l.unit_id = ${unitId}
        ORDER BY lc.lesson_id, lc.concept_index`
  );
  const conceptsByLesson: Record<number, Array<{ name: string; explanation: string }>> = {};
  for (const c of conceptRows.rows as any[]) {
    const lid = Number(c.lesson_id);
    if (!conceptsByLesson[lid]) conceptsByLesson[lid] = [];
    if (conceptsByLesson[lid].length < 5) {   // cap: 5 concepts per lesson
      conceptsByLesson[lid].push({ name: c.name, explanation: String(c.explanation).slice(0, 160) });
    }
  }

  // Mistakes
  const mistakeRows = await db.execute(
    sql`SELECT lm.lesson_id, lm.mistake, lm.correction
        FROM v4_lesson_common_mistakes lm
        JOIN v4_lessons l ON l.id = lm.lesson_id
        WHERE l.unit_id = ${unitId}
        ORDER BY lm.lesson_id, lm.mistake_index`
  );
  const mistakesByLesson: Record<number, Array<{ mistake: string; correction: string }>> = {};
  for (const m of mistakeRows.rows as any[]) {
    const lid = Number(m.lesson_id);
    if (!mistakesByLesson[lid]) mistakesByLesson[lid] = [];
    if (mistakesByLesson[lid].length < 2) {   // cap: 2 mistakes per lesson
      mistakesByLesson[lid].push({ mistake: m.mistake, correction: m.correction });
    }
  }

  return (lessonRows.rows as any[]).map((l) => ({
    name: l.name,
    goal: l.goal,
    finalCheckQuestion: l.final_check_question ?? "",
    concepts: conceptsByLesson[Number(l.id)] ?? [],
    mistakes: mistakesByLesson[Number(l.id)] ?? [],
  }));
}

/**
 * Full unit content for a unit quiz.
 * Returns null when specialty has no published version or unit code not found.
 */
export async function extractUnitContent(
  specialtySlug: string,
  unitCode: string
): Promise<UnitContent | null> {
  const versionId = await getPublishedVersionId(specialtySlug);
  if (!versionId) return null;

  const unitRows = await db.execute(
    sql`SELECT u.id, u.name, u.goal, u.key_concepts
        FROM v4_units u
        WHERE u.version_id = ${versionId} AND u.code = ${unitCode}
        LIMIT 1`
  );
  if (!unitRows.rows.length) return null;
  const unit = unitRows.rows[0] as any;

  const lessons = await fetchLessonsForUnit(Number(unit.id));
  const keyConcepts = Array.isArray(unit.key_concepts) ? (unit.key_concepts as string[]) : [];

  return { name: unit.name, goal: unit.goal, keyConcepts, lessons };
}

/**
 * Stage content for a stage quiz.
 * Captures each unit's name + goal + key_concepts + first 4 lesson names.
 * Keeps prompt size manageable for large stages (9 units / stage).
 */
export async function extractStageContent(
  specialtySlug: string,
  levelIndex: number,
  stageIndex: number
): Promise<StageContent | null> {
  const versionId = await getPublishedVersionId(specialtySlug);
  if (!versionId) return null;

  // Get stage
  const stageRows = await db.execute(
    sql`SELECT st.id, st.name, st.goal
        FROM v4_stages st
        JOIN v4_levels lv ON lv.id = st.level_id
        WHERE st.version_id = ${versionId}
          AND lv.level_index = ${levelIndex}
          AND st.stage_index = ${stageIndex}
        LIMIT 1`
  );
  if (!stageRows.rows.length) return null;
  const stage = stageRows.rows[0] as any;
  const stageId = Number(stage.id);

  // Get units in this stage (ordered)
  const unitRows = await db.execute(
    sql`SELECT u.id, u.name, u.goal, u.key_concepts
        FROM v4_units u
        WHERE u.stage_id = ${stageId} AND u.version_id = ${versionId}
        ORDER BY u.unit_index
        LIMIT 9`
  );
  const units = unitRows.rows as any[];
  if (!units.length) return null;

  // For each unit: first 5 lesson names only (keeps prompt compact)
  const unitSummaries: UnitSummary[] = await Promise.all(
    units.map(async (u) => {
      const lessonRows = await db.execute(
        sql`SELECT l.name
            FROM v4_lessons l
            WHERE l.unit_id = ${Number(u.id)}
            ORDER BY l.lesson_index
            LIMIT 5`
      );
      const keyConcepts = Array.isArray(u.key_concepts) ? (u.key_concepts as string[]) : [];
      return {
        name: u.name,
        goal: u.goal,
        keyConcepts,
        lessonNames: (lessonRows.rows as any[]).map((l) => l.name),
      };
    })
  );

  return { name: stage.name, goal: stage.goal, units: unitSummaries };
}

// ─── HTML template ───────────────────────────────────────────────────────────

/**
 * Returns the complete HTML quiz template skeleton.
 * Grading reads per-card data-points so mixed-weight level quizzes work.
 *
 * Supported question types: mcq | tf | fill | match | sort
 *
 * CORRECT object schema per type:
 *   mcq/tf/fill : { ans: string, fb_ok: string, fb_err: string }
 *   match       : { type:"match", ans: {a:string,b:string,...}, fb_ok:string, fb_err:string }
 *   sort        : { type:"sort",  ans: string[],               fb_ok:string, fb_err:string }
 *
 * match HTML: selects use id="match-qN-a", "match-qN-b", etc. inside <div class="match-grid" id="match-qN">
 * sort  HTML: items use data-order="1","2"… inside <div class="sort-list" id="sort-qN">
 *
 * @param totalQuestions  10 (unit) | 20 (stage) | 30 (level)
 */
export function buildQuizHtmlTemplate(totalQuestions: number): string {
  const progressSuffix = `${totalQuestions} سؤالاً`;
  const submitHint = `تأكد من الإجابة على جميع الأسئلة الـ ${totalQuestions} قبل الإرسال`;
  const ptsEach = Math.floor(100 / totalQuestions);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>اختبار</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap">
<style>
:root{
  --bg:#0d0f14;--surface:#141720;--surface2:#1c2030;
  --border:#252a3a;--accent:#4f8ef7;--accent2:#7c5cfc;
  --ok:#22c55e;--err:#ef4444;--yellow:#f59e0b;
  --text:#e8eaf0;--muted:#8891aa;
  --mono:'JetBrains Mono',monospace;--sans:'IBM Plex Sans Arabic',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;line-height:1.6}

/* ── HEADER ── */
.header{
  background:linear-gradient(135deg,#0d0f14 0%,#141c35 60%,#0d1524 100%);
  border-bottom:1px solid var(--border);
  padding:32px 24px 28px;text-align:center;position:relative;overflow:hidden;
}
.header::before{
  content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);
  width:400px;height:160px;
  background:radial-gradient(ellipse,rgba(79,142,247,.18) 0%,transparent 70%);
  pointer-events:none;
}
.header .badge{
  display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.12em;
  color:var(--accent);background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.25);
  border-radius:4px;padding:4px 12px;margin-bottom:14px;
}
.header h1{
  font-size:clamp(20px,4vw,32px);font-weight:700;letter-spacing:-.02em;margin-bottom:6px;
  background:linear-gradient(135deg,#e8eaf0,var(--accent));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.header p{color:var(--muted);font-size:13px;max-width:480px;margin:0 auto}

/* ── PROGRESS (sticky) ── */
.progress-bar-wrap{
  background:var(--surface);border-bottom:1px solid var(--border);
  padding:10px 24px;display:flex;align-items:center;gap:14px;
  position:sticky;top:0;z-index:50;
}
.progress-track{flex:1;height:4px;background:var(--border);border-radius:999px;overflow:hidden}
.progress-fill{
  height:100%;background:linear-gradient(90deg,var(--accent2),var(--accent));
  border-radius:999px;transition:width .4s ease;width:0%;
}
.progress-label{font-family:var(--mono);font-size:12px;color:var(--muted);white-space:nowrap}

/* ── CONTAINER ── */
.container{max-width:820px;margin:0 auto;padding:28px 20px 80px}

/* ── QUESTION CARD ── */
.q-card{
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:22px;margin-bottom:14px;transition:border-color .2s;
  animation:fadeUp .3s ease both;
}
.q-card:nth-child(1){animation-delay:.04s}
.q-card:nth-child(2){animation-delay:.08s}
.q-card:nth-child(3){animation-delay:.12s}
.q-card:nth-child(4){animation-delay:.16s}
.q-card:nth-child(5){animation-delay:.20s}
.q-card:nth-child(6){animation-delay:.24s}
.q-card.answered{border-color:rgba(79,142,247,.3)}
.q-card.correct{border-color:rgba(34,197,94,.4)!important;background:rgba(34,197,94,.03)}
.q-card.wrong{border-color:rgba(239,68,68,.35)!important;background:rgba(239,68,68,.03)}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

.q-meta{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.q-num{
  font-family:var(--mono);font-size:11px;color:var(--accent2);
  background:rgba(124,92,252,.1);border:1px solid rgba(124,92,252,.2);
  border-radius:4px;padding:2px 8px;
}
.q-type{font-size:11px;color:var(--muted);background:var(--surface2);border-radius:4px;padding:2px 8px;border:1px solid var(--border)}
.q-points{margin-right:auto;font-family:var(--mono);font-size:11px;color:var(--yellow)}
.q-text{font-size:14px;font-weight:500;margin-bottom:16px;line-height:1.75;color:var(--text)}
.q-text code{font-family:var(--mono);color:var(--accent);background:rgba(79,142,247,.1);padding:1px 5px;border-radius:3px}

/* ── MCQ ── */
.options{display:flex;flex-direction:column;gap:8px}
.option{
  display:flex;align-items:flex-start;gap:12px;padding:11px 15px;
  border-radius:8px;border:1px solid var(--border);background:var(--surface2);
  cursor:pointer;transition:all .18s;font-size:14px;text-align:right;user-select:none;
}
.option:hover{border-color:var(--accent);background:rgba(79,142,247,.06)}
.option.selected{border-color:var(--accent);background:rgba(79,142,247,.1)}
.option.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.08)!important}
.option.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.08)!important}
.option input{display:none}
.option-letter{
  font-family:var(--mono);font-size:11px;color:var(--muted);
  background:var(--border);border-radius:4px;padding:1px 7px;flex-shrink:0;margin-top:1px;
}
.option.selected .option-letter{background:var(--accent);color:#fff}
.option.correct-ans .option-letter{background:var(--ok);color:#fff}
.option.wrong-ans .option-letter{background:var(--err);color:#fff}

/* ── TRUE / FALSE ── */
.tf-row{display:flex;gap:10px}
.tf-btn{
  flex:1;padding:11px;border-radius:8px;border:1px solid var(--border);
  background:var(--surface2);color:var(--text);font-family:var(--sans);font-size:14px;
  font-weight:500;cursor:pointer;transition:all .18s;
}
.tf-btn:hover{border-color:var(--accent)}
.tf-btn.selected{border-color:var(--accent);background:rgba(79,142,247,.12)}
.tf-btn.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.1)!important}
.tf-btn.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.1)!important}

/* ── FILL ── */
.fill-input{
  width:100%;background:var(--surface2);border:1px solid var(--border);
  border-radius:8px;padding:11px 15px;font-family:var(--mono);font-size:14px;
  color:var(--text);outline:none;transition:border-color .18s;direction:ltr;text-align:center;
}
.fill-input:focus{border-color:var(--accent)}
.fill-input.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.06)}
.fill-input.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.06)}

/* ── MATCH ── */
.match-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:10px 14px;align-items:center}
.match-left{
  background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:9px 13px;font-family:var(--mono);font-size:13px;text-align:center;direction:ltr;
}
.match-arrow{color:var(--muted);font-size:16px;text-align:center}
.match-select{
  background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  padding:8px 11px;font-family:var(--sans);font-size:13px;color:var(--text);
  cursor:pointer;width:100%;outline:none;transition:border-color .18s;text-align:center;
}
.match-select:focus{border-color:var(--accent)}
.match-select.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.08)!important}
.match-select.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.08)!important}
@media(max-width:600px){.match-grid{grid-template-columns:1fr}.match-arrow{display:none}}

/* ── SORT ── */
.sort-list{display:flex;flex-direction:column;gap:8px}
.sort-item{
  display:flex;align-items:center;gap:12px;padding:10px 14px;
  background:var(--surface2);border:1px solid var(--border);border-radius:8px;
  cursor:grab;transition:all .15s;font-size:14px;user-select:none;
}
.sort-item:hover{border-color:var(--accent2)}
.sort-item.dragging{opacity:.4;border-style:dashed}
.sort-item.correct-sort{border-color:var(--ok)!important;background:rgba(34,197,94,.07)!important}
.sort-item.wrong-sort{border-color:var(--err)!important;background:rgba(239,68,68,.07)!important}
.drag-handle{color:var(--muted);font-size:15px;cursor:grab}

/* ── FEEDBACK ── */
.q-feedback{
  margin-top:10px;padding:9px 13px;border-radius:8px;
  font-size:13px;display:none;line-height:1.6;
}
.q-feedback.show{display:block}
.q-feedback.ok{background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.22);color:#86efac}
.q-feedback.err{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.22);color:#fca5a5}

/* ── SUBMIT ── */
.submit-wrap{text-align:center;margin-top:36px}
.btn-submit{
  background:linear-gradient(135deg,var(--accent2),var(--accent));color:#fff;
  border:none;border-radius:10px;padding:15px 44px;font-family:var(--sans);
  font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s;
}
.btn-submit:hover{opacity:.9;transform:translateY(-1px)}
.btn-submit:disabled{opacity:.4;cursor:not-allowed;transform:none}

/* ── RESULT ── */
.result-screen{display:none;text-align:center;padding:56px 20px;max-width:820px;margin:0 auto}
.result-screen.show{display:block}
.score-ring{width:160px;height:160px;margin:0 auto 26px;position:relative}
.score-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:var(--surface2);stroke-width:10}
.ring-val{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s ease,stroke .4s}
.score-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
.score-num{font-family:var(--mono);font-size:36px;font-weight:700;line-height:1}
.score-denom{font-size:13px;color:var(--muted);font-family:var(--mono)}
.result-grade{font-size:26px;font-weight:700;margin-bottom:6px}
.result-sub{color:var(--muted);font-size:13px;margin-bottom:28px}
.result-breakdown{
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:18px;max-width:480px;margin:0 auto 24px;text-align:right;
}
.breakdown-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;
}
.breakdown-row:last-child{border-bottom:none}
.pts-ok{color:var(--ok);font-family:var(--mono);font-weight:700}
.pts-err{color:var(--err);font-family:var(--mono);font-weight:700}
.btn-retry{
  background:var(--surface);border:1px solid var(--border);color:var(--text);
  border-radius:10px;padding:11px 30px;font-family:var(--sans);font-size:14px;
  cursor:pointer;transition:border-color .2s;
}
.btn-retry:hover{border-color:var(--accent)}
</style>
</head>
<body>

<div class="header">
  <div class="badge" id="quizBadge"></div>
  <h1 id="quizTitle">اختبار</h1>
  <p id="quizSub"></p>
</div>

<div class="progress-bar-wrap">
  <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
  <div class="progress-label" id="progressLabel">0 / ${progressSuffix}</div>
</div>

<div class="container" id="quizContainer">
<!-- QUESTION_CARDS_START -->
<!-- QUESTION_CARDS_END -->

  <div class="submit-wrap">
    <button class="btn-submit" id="submitBtn" onclick="submitQuiz()">إرسال الاختبار والحصول على درجتي 🎯</button>
    <p style="margin-top:10px;font-size:12px;color:var(--muted)">${submitHint}</p>
  </div>
</div>

<div class="result-screen" id="resultScreen">
  <div class="score-ring">
    <svg viewBox="0 0 120 120">
      <circle class="ring-bg" cx="60" cy="60" r="50"/>
      <circle class="ring-val" id="ringVal" cx="60" cy="60" r="50" stroke-dasharray="314" stroke-dashoffset="314"/>
    </svg>
    <div class="score-center">
      <div class="score-num" id="scoreNum">0</div>
      <div class="score-denom">/100</div>
    </div>
  </div>
  <div class="result-grade" id="resultGrade"></div>
  <div class="result-sub" id="resultSub"></div>
  <div class="result-breakdown" id="breakdown"></div>
  <button class="btn-retry" onclick="location.reload()">↺ إعادة الاختبار</button>
</div>

<script>
// ── Init title/badge from <title> ─────────────────────────────────────────────
(function(){
  var t=document.title,sep=t.indexOf('|');
  var titleEl=document.getElementById('quizTitle');
  var subEl=document.getElementById('quizSub');
  var badgeEl=document.getElementById('quizBadge');
  if(sep>0){
    titleEl.textContent=t.slice(sep+1).trim();
    // badge = part before |
    var badge=t.slice(0,sep).trim();
    if(badge){badgeEl.textContent=badge;badgeEl.style.display='inline-block';}
    else{badgeEl.style.display='none';}
    subEl.textContent='اختبار شامل (${totalQuestions} سؤالاً) — أجب عن جميع الأسئلة ثم اضغط إرسال';
  } else {
    titleEl.textContent=t;
    badgeEl.style.display='none';
    subEl.textContent='اختبار شامل (${totalQuestions} سؤالاً)';
  }
})();

var answers={};
var submitted=false;
var TOTAL=${totalQuestions};
var PTS_EACH=${ptsEach};

// ── CORRECT ANSWERS — AI fills this object ────────────────────────────────────
// Key = question number as STRING ("1","2",…,"${totalQuestions}")
// mcq/tf/fill: { ans:"a"|"b"|"c"|"d"|"true"|"false"|"word", fb_ok:"...", fb_err:"..." }
// match:       { type:"match", ans:{a:"val",b:"val",c:"val",d:"val"}, fb_ok:"...", fb_err:"..." }
// sort:        { type:"sort",  ans:["1","2","3","4"], fb_ok:"...", fb_err:"..." }
const CORRECT={
};
// ─────────────────────────────────────────────────────────────────────────────

// ── MCQ ───────────────────────────────────────────────────────────────────────
document.querySelectorAll('.option input[type="radio"]').forEach(function(r){
  r.addEventListener('change',function(){
    if(submitted)return;
    var card=this.closest('.q-card');
    card.querySelectorAll('.option').forEach(function(o){o.classList.remove('selected');});
    this.closest('.option').classList.add('selected');
    answers[card.dataset.qid]=this.value;
    card.classList.add('answered');
    updateProgress();
  });
});

// ── FILL ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.fill-input').forEach(function(inp){
  inp.addEventListener('input',function(){
    if(submitted)return;
    var card=this.closest('.q-card');
    var v=this.value.trim();
    answers[card.dataset.qid]=v;
    if(v)card.classList.add('answered');else card.classList.remove('answered');
    updateProgress();
  });
});

// ── T/F ───────────────────────────────────────────────────────────────────────
function selectTF(btn,qid){
  if(submitted)return;
  var card=btn.closest('.q-card');
  card.querySelectorAll('.tf-btn').forEach(function(b){b.classList.remove('selected');});
  btn.classList.add('selected');
  answers[String(qid)]=btn.dataset.val;
  card.classList.add('answered');
  updateProgress();
}

// ── MATCH ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.match-select').forEach(function(sel){
  sel.addEventListener('change',function(){
    if(submitted)return;
    var card=this.closest('.q-card');
    var qid=card.dataset.qid;
    var obj={};
    card.querySelectorAll('select').forEach(function(s){
      // id pattern: match-qN-KEY  →  last segment is the key
      var key=s.id.split('-').pop();
      obj[key]=s.value;
    });
    answers[qid]=obj;
    if(Object.values(obj).some(function(v){return v!=='';}))card.classList.add('answered');
    updateProgress();
  });
});

// ── DRAG-SORT ─────────────────────────────────────────────────────────────────
var dragSrc=null;
document.querySelectorAll('.sort-list').forEach(function(list){
  list.querySelectorAll('.sort-item').forEach(function(item){
    item.addEventListener('dragstart',function(e){
      dragSrc=this;this.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    item.addEventListener('dragend',function(){this.classList.remove('dragging');});
    item.addEventListener('dragover',function(e){
      e.preventDefault();
      if(dragSrc&&dragSrc!==this){
        var items=[].slice.call(this.parentNode.querySelectorAll('.sort-item'));
        var srcIdx=items.indexOf(dragSrc),tgtIdx=items.indexOf(this);
        if(srcIdx<tgtIdx)this.parentNode.insertBefore(dragSrc,this.nextSibling);
        else this.parentNode.insertBefore(dragSrc,this);
      }
    });
    item.addEventListener('drop',function(e){e.preventDefault();});
  });
});

// ── PROGRESS ─────────────────────────────────────────────────────────────────
function countAnswered(){
  var n=0;
  document.querySelectorAll('.q-card').forEach(function(card){
    var type=card.dataset.type,qid=card.dataset.qid;
    if(type==='sort'){n++;return;} // sort always has some order
    var v=answers[qid];
    if(v===undefined||v===null||v==='')return;
    if(typeof v==='object'){
      if(Object.values(v).some(function(x){return x!=='';}))n++;
    } else n++;
  });
  return n;
}
function updateProgress(){
  var n=countAnswered();
  document.getElementById('progressFill').style.width=(n/TOTAL*100)+'%';
  document.getElementById('progressLabel').textContent=n+' / ${progressSuffix}';
}

// ── SUBMIT ────────────────────────────────────────────────────────────────────
function submitQuiz(){
  submitted=true;
  document.getElementById('submitBtn').disabled=true;
  var total=0,sections=[];
  document.querySelectorAll('.q-card').forEach(function(card){
    var qid=card.dataset.qid,cfg=CORRECT[qid];
    if(!cfg)return;
    var fb=card.querySelector('.q-feedback');
    var type=card.dataset.type,correct=false;

    if(type==='fill'){
      var inp=card.querySelector('.fill-input');
      var userVal=(inp?inp.value:'').trim().toLowerCase();
      var expVal=String(cfg.ans).toLowerCase().replace(/\\s+/g,'');
      correct=userVal.replace(/\\s+/g,'')===expVal;
      if(inp)inp.classList.add(correct?'correct-ans':'wrong-ans');

    } else if(type==='mcq'){
      var uv=answers[qid];correct=uv===cfg.ans;
      card.querySelectorAll('.option').forEach(function(opt){
        var r=opt.querySelector('input');
        if(!r)return;
        if(r.value===cfg.ans)opt.classList.add('correct-ans');
        else if(r.value===uv&&!correct)opt.classList.add('wrong-ans');
      });

    } else if(type==='tf'){
      var uv2=answers[qid];correct=uv2===cfg.ans;
      card.querySelectorAll('.tf-btn').forEach(function(btn){
        if(btn.dataset.val===cfg.ans)btn.classList.add('correct-ans');
        else if(btn.dataset.val===uv2&&!correct)btn.classList.add('wrong-ans');
      });

    } else if(type==='match'){
      var allOk=true;
      var correctMap=cfg.ans||{};
      card.querySelectorAll('select').forEach(function(sel){
        var key=sel.id.split('-').pop();
        var ok=(sel.value===correctMap[key]);
        if(!ok)allOk=false;
        sel.classList.add(ok?'correct-ans':'wrong-ans');
        sel.disabled=true;
      });
      correct=allOk;

    } else if(type==='sort'){
      var sortList=document.getElementById('sort-q'+qid);
      if(sortList){
        var items=[].slice.call(sortList.querySelectorAll('.sort-item'));
        var userOrder=items.map(function(i){return i.dataset.order;});
        var expOrder=Array.isArray(cfg.ans)?cfg.ans:[];
        correct=JSON.stringify(userOrder)===JSON.stringify(expOrder);
        items.forEach(function(i){i.classList.add(correct?'correct-sort':'wrong-sort');i.draggable=false;});
      }
    }

    card.classList.add(correct?'correct':'wrong');
    fb.textContent=(correct?'✓ ':'✗ ')+(correct?cfg.fb_ok:cfg.fb_err);
    fb.className='q-feedback show '+(correct?'ok':'err');
    var pts=parseInt(card.dataset.points,10)||PTS_EACH;
    if(correct)total+=pts;
    sections.push({qid:Number(qid),correct:correct,pts:correct?pts:0});
  });
  total=Math.min(100,total);
  showResult(total,sections);
  if(typeof window.submitScore==='function'){window.submitScore(total);}
}

// ── RESULT ────────────────────────────────────────────────────────────────────
function showResult(score,sections){
  document.getElementById('quizContainer').style.display='none';
  var rs=document.getElementById('resultScreen');
  rs.classList.add('show');
  var color=score>=80?'#22c55e':score>=60?'#f59e0b':'#ef4444';
  var ring=document.getElementById('ringVal');
  ring.style.stroke=color;
  setTimeout(function(){ring.style.strokeDashoffset=314*(1-score/100);},100);
  var numEl=document.getElementById('scoreNum');
  numEl.style.color=color;
  var n=0,t=setInterval(function(){n=Math.min(n+2,score);numEl.textContent=n;if(n>=score)clearInterval(t);},18);
  var grade=document.getElementById('resultGrade');
  var sub=document.getElementById('resultSub');
  if(score>=90){grade.textContent='🏆 ممتاز';grade.style.color='#22c55e';sub.textContent='أداء استثنائي! أنت تتقن هذا المحتوى تماماً.';}
  else if(score>=70){grade.textContent='⭐ جيد جداً';grade.style.color='#4f8ef7';sub.textContent='فهم متين للأساسيات، واصل التقدم!';}
  else if(score>=50){grade.textContent='✔ مقبول';grade.style.color='#f59e0b';sub.textContent='اجتزت الاختبار، راجع الأخطاء لترسيخ الفهم.';}
  else{grade.textContent='📚 يحتاج مراجعة';grade.style.color='#ef4444';sub.textContent='ننصح بمراجعة المحتوى مرة أخرى قبل إعادة الاختبار.';}
  var bd=document.getElementById('breakdown');
  bd.innerHTML='<div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">تفصيل الدرجات</div>';
  sections.sort(function(a,b){return a.qid-b.qid;}).forEach(function(s){
    bd.innerHTML+='<div class="breakdown-row"><span>س'+s.qid+'</span><span class="'+(s.correct?'pts-ok':'pts-err')+'">'+(s.correct?'+'+s.pts+' ✓':'0 ✗')+'</span></div>';
  });
  bd.innerHTML+='<div class="breakdown-row" style="font-weight:700;font-size:15px;margin-top:4px"><span>المجموع</span><span style="color:'+color+'">'+score+' / 100</span></div>';
  window.scrollTo({top:0,behavior:'smooth'});
}
</script>
</body>
</html>`;
}

// ─── AI prompt builders ───────────────────────────────────────────────────────

/** Formats UnitContent into a concise Arabic text summary for the AI prompt */
export function buildUnitContentSummary(unit: UnitContent): string {
  let s = `اسم الوحدة: ${unit.name}\nهدف الوحدة: ${unit.goal}\n`;
  if (unit.keyConcepts.length > 0) {
    s += `المفاهيم الرئيسية: ${unit.keyConcepts.slice(0, 8).join("، ")}\n`;
  }
  s += "\nالدروس:\n";
  for (const lesson of unit.lessons.slice(0, 10)) {
    s += `\n• ${lesson.name}: ${lesson.goal}`;
    if (lesson.concepts.length > 0) {
      s += "\n  المفاهيم:";
      for (const c of lesson.concepts.slice(0, 5)) {
        s += `\n  - ${c.name}: ${c.explanation}`;
      }
    }
    if (lesson.mistakes.length > 0) {
      s += "\n  أخطاء شائعة:";
      for (const m of lesson.mistakes) {
        s += `\n  - خطأ: ${m.mistake} → الصحيح: ${m.correction}`;
      }
    }
    if (lesson.finalCheckQuestion) {
      s += `\n  سؤال مراجعة: ${lesson.finalCheckQuestion}`;
    }
  }
  return s;
}

/** Formats StageContent into a concise Arabic text summary for the AI prompt */
export function buildStageContentSummary(stage: StageContent): string {
  let s = `اسم المرحلة: ${stage.name}\nهدف المرحلة: ${stage.goal}\n\nوحدات المرحلة:\n`;
  for (const unit of stage.units) {
    s += `\n## ${unit.name}\nالهدف: ${unit.goal}`;
    if (unit.keyConcepts.length > 0) {
      s += `\nمفاهيم رئيسية: ${unit.keyConcepts.slice(0, 6).join("، ")}`;
    }
    if (unit.lessonNames.length > 0) {
      s += `\nالدروس: ${unit.lessonNames.join(" | ")}`;
    }
  }
  return s;
}

// ─── Level content extraction ─────────────────────────────────────────────────

/**
 * Extract level overview for level quiz generation.
 * Pulls: level name/goal → stages (≤8) → per-stage top 6 units with key_concepts.
 * Keeps prompt compact (no lesson-level detail — level quiz tests broad concepts).
 */
export async function extractLevelContent(
  specialtySlug: string,
  levelIndex: number
): Promise<LevelContent | null> {
  const versionId = await getPublishedVersionId(specialtySlug);
  if (!versionId) return null;

  // Get the level row for name + goal
  const levelRows = await db.execute(
    sql`SELECT lv.id, lv.name, lv.goal
        FROM v4_levels lv
        WHERE lv.version_id = ${versionId} AND lv.level_index = ${levelIndex}
        LIMIT 1`
  );
  if (!levelRows.rows.length) return null;
  const level = levelRows.rows[0] as any;
  const levelId = Number(level.id);

  // Get stages (ordered)
  const stageRows = await db.execute(
    sql`SELECT st.id, st.name, st.goal, st.stage_index
        FROM v4_stages st
        WHERE st.level_id = ${levelId} AND st.version_id = ${versionId}
        ORDER BY st.stage_index
        LIMIT 8`
  );
  if (!stageRows.rows.length) return null;

  // For each stage: top 6 units with key_concepts
  const stages: StageSummary[] = await Promise.all(
    (stageRows.rows as any[]).map(async (st) => {
      const unitRows = await db.execute(
        sql`SELECT u.name, u.goal, u.key_concepts
            FROM v4_units u
            WHERE u.stage_id = ${Number(st.id)} AND u.version_id = ${versionId}
            ORDER BY u.unit_index
            LIMIT 6`
      );
      const units = (unitRows.rows as any[]).map((u) => ({
        name: u.name,
        goal: u.goal,
        keyConcepts: Array.isArray(u.key_concepts) ? (u.key_concepts as string[]).slice(0, 5) : [],
      }));
      return { name: st.name, goal: st.goal, units };
    })
  );

  return { name: level.name, goal: level.goal, stages };
}

/** Formats LevelContent into a concise Arabic text summary for the AI prompt. */
export function buildLevelContentSummary(level: LevelContent): string {
  let s = `اسم المستوى: ${level.name}\nهدف المستوى: ${level.goal}\n\nمراحل المستوى:\n`;
  for (const stage of level.stages) {
    s += `\n### ${stage.name}\nالهدف: ${stage.goal}\n`;
    for (const unit of stage.units) {
      s += `  • ${unit.name}: ${unit.goal}`;
      if (unit.keyConcepts.length > 0) {
        s += ` — [${unit.keyConcepts.join("، ")}]`;
      }
      s += "\n";
    }
  }
  return s;
}

// ─── QUIZ_MODEL: Claude Haiku 4.5 via OpenRouter ─────────────────────────────
const QUIZ_MODEL = "anthropic/claude-haiku-4-5";

// ─── Structured output approach ───────────────────────────────────────────────
//
// The AI is never given the full HTML template to fill in. Instead it generates
// ONLY two XML-tagged blocks:
//
//   <QUESTIONS>…question card HTML…</QUESTIONS>
//   <CORRECT>…{"1":{…},"2":{…},…}…</CORRECT>
//
// The server then injects these into the fixed template (buildQuizHtmlTemplate).
// This guarantees window.submitScore and all JS logic is ALWAYS present.

async function callAiGenerateAndInject(
  systemPrompt: string,
  userPrompt: string,
  totalQuestions: number,
  title: string,
  logTag: string
): Promise<string> {
  const maxTokens = totalQuestions <= 10 ? 8_000 : totalQuestions <= 20 ? 16_000 : 24_000;

  const result = await generateGemini({
    systemPrompt,
    userParts: [{ type: "text", text: userPrompt }],
    model: QUIZ_MODEL,
    temperature: 0.5,
    maxOutputTokens: maxTokens,
    timeoutMs: 210_000,
    logTag,
  });

  const raw = result.text.trim();

  // ── Extract <QUESTIONS> block ─────────────────────────────────────────────
  const questionsMatch = raw.match(/<QUESTIONS>([\s\S]*?)<\/QUESTIONS>/i);
  if (!questionsMatch) {
    throw new Error("AI_PARSE: missing <QUESTIONS> block in response");
  }
  const questionCards = questionsMatch[1].trim();

  // ── Extract <CORRECT> block ───────────────────────────────────────────────
  const correctMatch = raw.match(/<CORRECT>([\s\S]*?)<\/CORRECT>/i);
  if (!correctMatch) {
    throw new Error("AI_PARSE: missing <CORRECT> block in response");
  }
  let correctStr = correctMatch[1].trim();
  // Strip optional markdown fences the model may wrap around JSON
  correctStr = correctStr.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  let correctObj: unknown;
  try {
    correctObj = JSON.parse(correctStr);
  } catch (e: any) {
    throw new Error(`AI_PARSE: CORRECT JSON invalid — ${e?.message}`);
  }

  // ── Build fixed template + inject ─────────────────────────────────────────
  let html = buildQuizHtmlTemplate(totalQuestions);

  // Set the page title
  html = html.replace(/<title>اختبار<\/title>/, `<title>${title}</title>`);

  // Inject question cards between the slot markers
  html = html.replace(
    /<!-- QUESTION_CARDS_START -->[\s\S]*?<!-- QUESTION_CARDS_END -->/,
    `<!-- QUESTION_CARDS_START -->\n${questionCards}\n<!-- QUESTION_CARDS_END -->`
  );

  // Inject the CORRECT object (replace the empty placeholder `const CORRECT={\n};`)
  html = html.replace(
    /const CORRECT=\{\s*\};/,
    `const CORRECT=${JSON.stringify(correctObj)};`
  );

  return html;
}

// ─── Unit quiz system prompt ──────────────────────────────────────────────────

const UNIT_QUIZ_SYSTEM_PROMPT = `أنت مصمم اختبارات لمنصة نُخبة التعليمية.
أنشئ اختبار وحدة دراسية (10 أسئلة، كل سؤال = 10 نقاط).

التوزيع الإلزامي:
• 4 اختيار من متعدد  (mcq)
• 2 صح / خطأ         (tf)
• 2 أكمل الفراغ      (fill)
• 1 مطابقة           (match)
• 1 ترتيب خطوات      (sort)

أخرج بالتنسيق التالي بالضبط، ولا شيء خارجه:

<QUESTIONS>
[بطاقات الأسئلة HTML هنا]
</QUESTIONS>
<CORRECT>
{"1":{…},"2":{…},…,"10":{…}}
</CORRECT>

━━ هياكل HTML المسموح بها ━━

MCQ — استبدل N برقم السؤال:
<div class="q-card" data-qid="N" data-type="mcq" data-points="10">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">اختيار من متعدد</span><span class="q-points">10 نقاط</span></div>
  <div class="q-text">نص السؤال</div>
  <div class="options">
    <label class="option"><input type="radio" name="qN" value="a"><span class="option-letter">أ</span>الخيار أ</label>
    <label class="option"><input type="radio" name="qN" value="b"><span class="option-letter">ب</span>الخيار ب</label>
    <label class="option"><input type="radio" name="qN" value="c"><span class="option-letter">ج</span>الخيار ج</label>
    <label class="option"><input type="radio" name="qN" value="d"><span class="option-letter">د</span>الخيار د</label>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "a", "fb_ok": "شرح قصير للإجابة الصحيحة", "fb_err": "شرح التصحيح مع الإجابة الصحيحة" }

T/F:
<div class="q-card" data-qid="N" data-type="tf" data-points="10">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">صح / خطأ</span><span class="q-points">10 نقاط</span></div>
  <div class="q-text">العبارة</div>
  <div class="tf-row">
    <button class="tf-btn" data-val="true" onclick="selectTF(this,N)">✓ صح</button>
    <button class="tf-btn" data-val="false" onclick="selectTF(this,N)">✗ خطأ</button>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "true", "fb_ok": "…", "fb_err": "…" }

Fill:
<div class="q-card" data-qid="N" data-type="fill" data-points="10">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">أكمل الفراغ</span><span class="q-points">10 نقاط</span></div>
  <div class="q-text">نص السؤال مع ___ للفراغ</div>
  <input class="fill-input" id="fill-qN" type="text" placeholder="اكتب إجابتك هنا" autocomplete="off">
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "الكلمة", "fb_ok": "…", "fb_err": "…" }

Match — المهم: id القوائم يجب أن يكون match-qN-a, match-qN-b, match-qN-c, match-qN-d (حيث N رقم السؤال):
<div class="q-card" data-qid="N" data-type="match" data-points="10">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">مطابقة</span><span class="q-points">10 نقاط</span></div>
  <div class="q-text">طابق كل عنصر بمقابله الصحيح:</div>
  <div class="match-grid" id="match-qN">
    <div class="match-left">العنصر 1</div><div class="match-arrow">←</div>
    <select class="match-select" id="match-qN-a"><option value="">اختر...</option><option value="v1">وصف 1</option><option value="v2">وصف 2</option><option value="v3">وصف 3</option><option value="v4">وصف 4</option></select>
    <div class="match-left">العنصر 2</div><div class="match-arrow">←</div>
    <select class="match-select" id="match-qN-b"><option value="">اختر...</option><option value="v1">وصف 1</option><option value="v2">وصف 2</option><option value="v3">وصف 3</option><option value="v4">وصف 4</option></select>
    <div class="match-left">العنصر 3</div><div class="match-arrow">←</div>
    <select class="match-select" id="match-qN-c"><option value="">اختر...</option><option value="v1">وصف 1</option><option value="v2">وصف 2</option><option value="v3">وصف 3</option><option value="v4">وصف 4</option></select>
    <div class="match-left">العنصر 4</div><div class="match-arrow">←</div>
    <select class="match-select" id="match-qN-d"><option value="">اختر...</option><option value="v1">وصف 1</option><option value="v2">وصف 2</option><option value="v3">وصف 3</option><option value="v4">وصف 4</option></select>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "type": "match", "ans": {"a":"v3","b":"v1","c":"v4","d":"v2"}, "fb_ok": "…", "fb_err": "…" }

Sort — المهم: id القائمة يجب أن يكون sort-qN؛ data-order = الترتيب الصحيح للعنصر (1,2,3,4)؛ اعرض العناصر بترتيب مختلط:
<div class="q-card" data-qid="N" data-type="sort" data-points="10">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">ترتيب الخطوات</span><span class="q-points">10 نقاط</span></div>
  <div class="q-text">رتّب الخطوات التالية بالترتيب الصحيح (اسحب لإعادة الترتيب):</div>
  <div class="sort-list" id="sort-qN">
    <div class="sort-item" draggable="true" data-order="3"><span class="drag-handle">⠿</span>الخطوة الثالثة</div>
    <div class="sort-item" draggable="true" data-order="1"><span class="drag-handle">⠿</span>الخطوة الأولى</div>
    <div class="sort-item" draggable="true" data-order="4"><span class="drag-handle">⠿</span>الخطوة الرابعة</div>
    <div class="sort-item" draggable="true" data-order="2"><span class="drag-handle">⠿</span>الخطوة الثانية</div>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "type": "sort", "ans": ["1","2","3","4"], "fb_ok": "…", "fb_err": "…" }

قواعد عامة:
• مستوى الصعوبة سهل — الهدف قياس الفهم الأساسي لا الحفظ أو التعمق.
• الأسئلة واضحة ومباشرة، تقيس فهم المفاهيم الجوهرية للوحدة.
• تجنب الأسئلة الحِيَلية أو التفاصيل الثانوية — ركّز على ما يجب أن يفهمه كل طالب.
• استخدم code blocks بـ <code>…</code> عند ذكر أوامر أو قيم رقمية.
• التغذية الراجعة مفيدة وواضحة بالعربية.
• أرقام الأسئلة من 1 إلى 10 تسلسلياً.`;

// ─── Stage quiz system prompt ─────────────────────────────────────────────────

const STAGE_QUIZ_SYSTEM_PROMPT = `أنت مصمم اختبارات لمنصة نُخبة التعليمية.
أنشئ اختبار مرحلة دراسية (20 سؤالاً، كل سؤال = 5 نقاط).

التوزيع الإلزامي:
• 8 اختيار من متعدد  (mcq)
• 6 صح / خطأ         (tf)
• 6 أكمل الفراغ      (fill)

أخرج بالتنسيق التالي بالضبط، ولا شيء خارجه:

<QUESTIONS>
[بطاقات الأسئلة HTML هنا]
</QUESTIONS>
<CORRECT>
{"1":{…},"2":{…},…,"20":{…}}
</CORRECT>

━━ هياكل HTML المسموح بها ━━

MCQ (data-points="5"):
<div class="q-card" data-qid="N" data-type="mcq" data-points="5">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">اختيار من متعدد</span><span class="q-points">5 نقاط</span></div>
  <div class="q-text">نص السؤال</div>
  <div class="options">
    <label class="option"><input type="radio" name="qN" value="a"><span class="option-letter">أ</span>الخيار أ</label>
    <label class="option"><input type="radio" name="qN" value="b"><span class="option-letter">ب</span>الخيار ب</label>
    <label class="option"><input type="radio" name="qN" value="c"><span class="option-letter">ج</span>الخيار ج</label>
    <label class="option"><input type="radio" name="qN" value="d"><span class="option-letter">د</span>الخيار د</label>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "b", "fb_ok": "…", "fb_err": "…" }

T/F (data-points="5"):
<div class="q-card" data-qid="N" data-type="tf" data-points="5">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">صح / خطأ</span><span class="q-points">5 نقاط</span></div>
  <div class="q-text">العبارة</div>
  <div class="tf-row">
    <button class="tf-btn" data-val="true" onclick="selectTF(this,N)">✓ صح</button>
    <button class="tf-btn" data-val="false" onclick="selectTF(this,N)">✗ خطأ</button>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "false", "fb_ok": "…", "fb_err": "…" }

Fill (data-points="5"):
<div class="q-card" data-qid="N" data-type="fill" data-points="5">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">أكمل الفراغ</span><span class="q-points">5 نقاط</span></div>
  <div class="q-text">نص السؤال مع ___ للفراغ</div>
  <input class="fill-input" id="fill-qN" type="text" placeholder="اكتب إجابتك هنا" autocomplete="off">
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "الكلمة", "fb_ok": "…", "fb_err": "…" }

قواعد عامة:
• مستوى الصعوبة سهل — الهدف قياس الفهم الأساسي لا الحفظ أو التعمق.
• الأسئلة واضحة ومباشرة، موزعة بالتساوي على جميع وحدات المرحلة.
• تجنب الأسئلة الحِيَلية أو التفاصيل الثانوية — ركّز على المفاهيم الجوهرية.
• التغذية الراجعة مفيدة وواضحة بالعربية.
• أرقام الأسئلة من 1 إلى 20 تسلسلياً.`;

// ─── Level quiz system prompt ─────────────────────────────────────────────────

const LEVEL_QUIZ_SYSTEM_PROMPT = `أنت مصمم اختبارات لمنصة نُخبة التعليمية.
أنشئ اختبار مستوى دراسي شامل (30 سؤالاً، المجموع = 100 نقطة بالضبط).

التوزيع الإلزامي بالنقاط:
• 10 اختيار من متعدد → data-points="5"  (10 × 5 = 50 نقطة)
• 10 صح / خطأ        → data-points="3"  (10 × 3 = 30 نقطة)
• 10 أكمل الفراغ     → data-points="2"  (10 × 2 = 20 نقطة)

أخرج بالتنسيق التالي بالضبط، ولا شيء خارجه:

<QUESTIONS>
[بطاقات الأسئلة HTML هنا]
</QUESTIONS>
<CORRECT>
{"1":{…},"2":{…},…,"30":{…}}
</CORRECT>

━━ هياكل HTML المسموح بها ━━

MCQ (data-points="5"):
<div class="q-card" data-qid="N" data-type="mcq" data-points="5">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">اختيار من متعدد</span><span class="q-points">5 نقاط</span></div>
  <div class="q-text">نص السؤال</div>
  <div class="options">
    <label class="option"><input type="radio" name="qN" value="a"><span class="option-letter">أ</span>الخيار أ</label>
    <label class="option"><input type="radio" name="qN" value="b"><span class="option-letter">ب</span>الخيار ب</label>
    <label class="option"><input type="radio" name="qN" value="c"><span class="option-letter">ج</span>الخيار ج</label>
    <label class="option"><input type="radio" name="qN" value="d"><span class="option-letter">د</span>الخيار د</label>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "c", "fb_ok": "…", "fb_err": "…" }

T/F (data-points="3"):
<div class="q-card" data-qid="N" data-type="tf" data-points="3">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">صح / خطأ</span><span class="q-points">3 نقاط</span></div>
  <div class="q-text">العبارة</div>
  <div class="tf-row">
    <button class="tf-btn" data-val="true" onclick="selectTF(this,N)">✓ صح</button>
    <button class="tf-btn" data-val="false" onclick="selectTF(this,N)">✗ خطأ</button>
  </div>
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "true", "fb_ok": "…", "fb_err": "…" }

Fill (data-points="2"):
<div class="q-card" data-qid="N" data-type="fill" data-points="2">
  <div class="q-meta"><span class="q-num">0N</span><span class="q-type">أكمل الفراغ</span><span class="q-points">2 نقاط</span></div>
  <div class="q-text">نص السؤال مع ___ للفراغ</div>
  <input class="fill-input" id="fill-qN" type="text" placeholder="اكتب إجابتك هنا" autocomplete="off">
  <div class="q-feedback"></div>
</div>
CORRECT entry: "N": { "ans": "الكلمة", "fb_ok": "…", "fb_err": "…" }

قواعد عامة:
• مستوى الصعوبة سهل — الهدف قياس الفهم الشامل لا الحفظ أو التعمق.
• الأسئلة واضحة ومباشرة، موزعة بالتساوي على مراحل المستوى.
• تجنب الأسئلة الحِيَلية أو التفاصيل الثانوية — ركّز على المفاهيم الجوهرية.
• data-points إلزامية على كل بطاقة بالقيم المحددة أعلاه.
• التغذية الراجعة مفيدة وواضحة بالعربية.
• أرقام الأسئلة من 1 إلى 30 تسلسلياً.`;

// ─── Public generate functions ────────────────────────────────────────────────

/** Generate and validate a 10-question unit quiz HTML page. */
export async function generateUnitQuizHtml(
  unit: UnitContent,
  unitCode: string = "",
  specialtySlug: string = ""
): Promise<string> {
  const contentSummary = buildUnitContentSummary(unit);
  const userPrompt = `محتوى الوحدة الدراسية:\n${contentSummary}`;
  const badge = [unitCode, specialtySlug].filter(Boolean).join(" · ");
  const title = badge ? `${badge} | ${unit.name}` : unit.name;

  const html = await callAiGenerateAndInject(
    UNIT_QUIZ_SYSTEM_PROMPT,
    userPrompt,
    10,
    title,
    "unit-quiz-gen"
  );

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}

/** Generate and validate a 20-question stage quiz HTML page. */
export async function generateStageQuizHtml(stage: StageContent): Promise<string> {
  const contentSummary = buildStageContentSummary(stage);
  const userPrompt = `محتوى المرحلة الدراسية:\n${contentSummary}`;
  const title = `اختبار المرحلة | ${stage.name}`;

  const html = await callAiGenerateAndInject(
    STAGE_QUIZ_SYSTEM_PROMPT,
    userPrompt,
    20,
    title,
    "stage-quiz-gen"
  );

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}

/** Generate and validate a 30-question level quiz HTML page (mixed point weights, total = 100). */
export async function generateLevelQuizHtml(level: LevelContent): Promise<string> {
  const contentSummary = buildLevelContentSummary(level);
  const userPrompt = `محتوى المستوى الدراسي:\n${contentSummary}`;
  const title = `اختبار المستوى | ${level.name}`;

  const html = await callAiGenerateAndInject(
    LEVEL_QUIZ_SYSTEM_PROMPT,
    userPrompt,
    30,
    title,
    "level-quiz-gen"
  );

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}
