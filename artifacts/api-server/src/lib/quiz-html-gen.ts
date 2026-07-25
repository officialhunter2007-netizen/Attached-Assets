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
 * @param totalQuestions  10 (unit) | 20 (stage) | 30 (level)
 */
export function buildQuizHtmlTemplate(totalQuestions: number): string {
  const progressSuffix = `${totalQuestions} أسئلة مُجاب عنها`;
  const submitHint = `تأكد من الإجابة على جميع الأسئلة الـ ${totalQuestions} قبل الإرسال`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>اختبار</title>
<style>
:root{--bg:#0b0f1a;--card:#111827;--border:#1e293b;--accent:#f59e0b;--ok:#22c55e;--err:#ef4444;--text:#e2e8f0;--muted:#64748b}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',Tahoma,Cairo,sans-serif;min-height:100vh;padding:16px}
.header{max-width:660px;margin:0 auto 24px;text-align:center}
.header-icon{font-size:2.4rem;margin-bottom:8px}
.header-title{font-size:1.4rem;font-weight:800;color:var(--accent);margin-bottom:4px}
.header-sub{color:var(--muted);font-size:.875rem;margin-bottom:16px}
.progress-track{background:var(--border);border-radius:99px;height:6px;margin-bottom:6px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(to left,var(--accent),#f97316);border-radius:99px;transition:width .4s}
.progress-label{font-size:.75rem;color:var(--muted)}
.container{max-width:660px;margin:0 auto}
.q-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px;transition:.3s}
.q-card.correct{border-color:#22c55e30;background:#0d201a}
.q-card.wrong{border-color:#ef444430;background:#1f0d0d}
.q-meta{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.q-num{background:var(--accent);color:#000;font-weight:800;font-size:.7rem;padding:2px 8px;border-radius:6px}
.q-type{color:var(--muted);font-size:.75rem}
.q-points{margin-right:auto;color:var(--accent);font-size:.75rem;font-weight:700}
.q-text{font-size:.95rem;line-height:1.7;margin-bottom:16px}
.options{display:flex;flex-direction:column;gap:8px}
.option{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:.2s}
.option:hover{border-color:#f59e0b50;background:rgba(245,158,11,.05)}
.option.selected{border-color:var(--accent);background:rgba(245,158,11,.08)}
.option.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.1)!important}
.option.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.08)!important}
.opt-letter{min-width:26px;height:26px;background:var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:var(--accent);flex-shrink:0}
.option input{display:none}
.option span:last-child{font-size:.9rem;line-height:1.5}
.tf-row{display:flex;gap:10px}
.tf-btn{flex:1;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:.9rem;cursor:pointer;transition:.2s;font-family:inherit}
.tf-btn:hover{border-color:#f59e0b50}
.tf-btn.selected{border-color:var(--accent);background:rgba(245,158,11,.08)}
.tf-btn.correct-ans{border-color:var(--ok)!important;background:rgba(34,197,94,.1)!important}
.tf-btn.wrong-ans{border-color:var(--err)!important;background:rgba(239,68,68,.08)!important}
.fill-input{width:100%;background:#060d1a;border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:.9rem;outline:none;transition:.2s;font-family:inherit}
.fill-input:focus{border-color:var(--accent)}
.fill-input.correct-ans{border-color:var(--ok)!important}
.fill-input.wrong-ans{border-color:var(--err)!important}
.q-feedback{margin-top:10px;font-size:.825rem;padding:8px 12px;border-radius:8px;display:none}
.q-feedback.show{display:block}
.q-feedback.ok{background:rgba(34,197,94,.1);color:var(--ok)}
.q-feedback.err{background:rgba(239,68,68,.08);color:#fca5a5}
.submit-wrap{text-align:center;margin:28px 0}
.btn-submit{background:linear-gradient(to left,var(--accent),#f97316);border:none;color:#000;font-weight:800;font-size:1rem;padding:14px 36px;border-radius:12px;cursor:pointer;transition:.2s;font-family:inherit}
.btn-submit:hover{opacity:.9;transform:scale(1.02)}
.btn-submit:disabled{opacity:.4;cursor:not-allowed;transform:none}
.result-screen{display:none;text-align:center;padding:32px 16px;max-width:660px;margin:0 auto}
.result-screen.show{display:block}
.score-ring{width:150px;height:150px;margin:0 auto 24px;position:relative}
.score-ring svg{transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:var(--border);stroke-width:10}
.ring-val{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s ease,stroke .4s}
.score-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
.score-num{font-size:2.4rem;font-weight:900}
.score-denom{font-size:.8rem;color:var(--muted)}
.result-grade{font-size:1.5rem;font-weight:800;margin-bottom:6px}
.result-sub{color:var(--muted);font-size:.875rem;margin-bottom:24px}
.breakdown{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px;text-align:right}
.breakdown-row{display:flex;justify-content:space-between;padding:6px 0;font-size:.85rem;border-bottom:1px solid var(--border)}
.breakdown-row:last-child{border-bottom:none}
.pts-ok{color:var(--ok);font-weight:700}
.pts-err{color:var(--err);font-weight:700}
.btn-retry{background:var(--border);border:none;color:var(--text);font-size:.9rem;padding:10px 28px;border-radius:10px;cursor:pointer;font-family:inherit;transition:.2s}
.btn-retry:hover{background:var(--accent);color:#000}
</style>
</head>
<body>
<div class="header">
  <div class="header-icon">📝</div>
  <div class="header-title" id="quizTitle"></div>
  <div class="header-sub" id="quizSub"></div>
  <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
  <div class="progress-label" id="progressLabel">0 / ${progressSuffix}</div>
</div>

<div class="container" id="quizContainer">
<!-- QUESTION_CARDS_START -->
<!-- AI: Insert exactly ${totalQuestions} question cards here.
     Available types — use this EXACT HTML structure:

MCQ (اختيار من متعدد):
<div class="q-card" data-qid="N" data-type="mcq" data-points="${Math.floor(100/totalQuestions)}">
  <div class="q-meta"><span class="q-num">NN</span><span class="q-type">اختيار من متعدد</span><span class="q-points">${Math.floor(100/totalQuestions)} نقاط</span></div>
  <div class="q-text">نص السؤال</div>
  <div class="options">
    <label class="option"><input type="radio" name="qN" value="a"><span class="opt-letter">أ</span><span>الخيار أ</span></label>
    <label class="option"><input type="radio" name="qN" value="b"><span class="opt-letter">ب</span><span>الخيار ب</span></label>
    <label class="option"><input type="radio" name="qN" value="c"><span class="opt-letter">ج</span><span>الخيار ج</span></label>
    <label class="option"><input type="radio" name="qN" value="d"><span class="opt-letter">د</span><span>الخيار د</span></label>
  </div>
  <div class="q-feedback"></div>
</div>

T/F (صح / خطأ):
<div class="q-card" data-qid="N" data-type="tf" data-points="${Math.floor(100/totalQuestions)}">
  <div class="q-meta"><span class="q-num">NN</span><span class="q-type">صح / خطأ</span><span class="q-points">${Math.floor(100/totalQuestions)} نقاط</span></div>
  <div class="q-text">العبارة</div>
  <div class="tf-row">
    <button class="tf-btn" data-val="true" onclick="selectTF(this,N)">✓ صح</button>
    <button class="tf-btn" data-val="false" onclick="selectTF(this,N)">✗ خطأ</button>
  </div>
  <div class="q-feedback"></div>
</div>

Fill (أكمل الفراغ):
<div class="q-card" data-qid="N" data-type="fill" data-points="${Math.floor(100/totalQuestions)}">
  <div class="q-meta"><span class="q-num">NN</span><span class="q-type">أكمل الفراغ</span><span class="q-points">${Math.floor(100/totalQuestions)} نقاط</span></div>
  <div class="q-text">السؤال مع ___ للفراغ</div>
  <div class="fill-input-wrap"><input class="fill-input" id="fillN" type="text" placeholder="اكتب إجابتك هنا" autocomplete="off"></div>
  <div class="q-feedback"></div>
</div>
-->
<!-- QUESTION_CARDS_END -->

  <div class="submit-wrap">
    <button class="btn-submit" id="submitBtn" onclick="submitQuiz()">إرسال الاختبار والحصول على درجتي 🎯</button>
    <p style="margin-top:10px;font-size:12px;color:var(--muted)">${submitHint}</p>
  </div>
</div>

<div class="result-screen" id="resultScreen">
  <div class="score-ring">
    <svg viewBox="0 0 120 120" width="150" height="150">
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
  <div class="breakdown" id="breakdown"></div>
  <button class="btn-retry" onclick="location.reload()">↺ إعادة الاختبار</button>
</div>

<script>
(function(){
  var titleEl=document.getElementById('quizTitle');
  var subEl=document.getElementById('quizSub');
  var t=document.title;
  var sep=t.indexOf('|');
  if(sep>0){titleEl.textContent=t.slice(0,sep).trim();subEl.textContent=t.slice(sep+1).trim();}
  else{titleEl.textContent=t;subEl.textContent='';}
})();

var answers={};
var submitted=false;
var TOTAL=${totalQuestions};
var PTS_EACH=${Math.floor(100/totalQuestions)};

// ── CORRECT ANSWERS — AI fills this object ──────────────────────────────────
// Key = question number as STRING (e.g. "1","2",…,"${totalQuestions}")
// Value = { ans: string, fb_ok: string, fb_err: string }
// MCQ ans: "a"|"b"|"c"|"d"   T/F ans: "true"|"false"   Fill ans: expected word/phrase
const CORRECT={
};
// ────────────────────────────────────────────────────────────────────────────

document.querySelectorAll('.option input[type="radio"]').forEach(function(r){
  r.addEventListener('change',function(){
    if(submitted)return;
    var card=this.closest('.q-card');
    card.querySelectorAll('.option').forEach(function(o){o.classList.remove('selected');});
    this.closest('.option').classList.add('selected');
    answers[card.dataset.qid]=this.value;
    updateProgress();
  });
});
document.querySelectorAll('.fill-input').forEach(function(inp){
  inp.addEventListener('input',function(){
    if(submitted)return;
    var card=this.closest('.q-card');
    answers[card.dataset.qid]=this.value.trim();
    updateProgress();
  });
});
function selectTF(btn,qid){
  if(submitted)return;
  btn.closest('.q-card').querySelectorAll('.tf-btn').forEach(function(b){b.classList.remove('selected');});
  btn.classList.add('selected');
  answers[String(qid)]=btn.dataset.val;
  updateProgress();
}
function updateProgress(){
  var n=Object.values(answers).filter(function(v){return v!=='';}).length;
  document.getElementById('progressFill').style.width=(n/TOTAL*100)+'%';
  document.getElementById('progressLabel').textContent=n+' / ${progressSuffix}';
}

function submitQuiz(){
  submitted=true;
  document.getElementById('submitBtn').disabled=true;
  var total=0;
  var sections=[];
  document.querySelectorAll('.q-card').forEach(function(card){
    var qid=card.dataset.qid;
    var cfg=CORRECT[qid];
    if(!cfg)return;
    var fb=card.querySelector('.q-feedback');
    var type=card.dataset.type;
    var correct=false;
    if(type==='fill'){
      var inp=card.querySelector('.fill-input');
      correct=inp.value.trim().toLowerCase()===String(cfg.ans).toLowerCase();
      inp.classList.add(correct?'correct-ans':'wrong-ans');
    } else if(type==='mcq'){
      var userVal=answers[qid];
      correct=userVal===cfg.ans;
      card.querySelectorAll('.option').forEach(function(opt){
        var radio=opt.querySelector('input');
        if(radio.value===cfg.ans)opt.classList.add('correct-ans');
        else if(radio.value===userVal&&!correct)opt.classList.add('wrong-ans');
      });
    } else if(type==='tf'){
      var userVal=answers[qid];
      correct=userVal===cfg.ans;
      card.querySelectorAll('.tf-btn').forEach(function(btn){
        if(btn.dataset.val===cfg.ans)btn.classList.add('correct-ans');
        else if(btn.dataset.val===userVal&&!correct)btn.classList.add('wrong-ans');
      });
    }
    card.classList.add(correct?'correct':'wrong');
    fb.textContent=(correct?'✓ ':' ✗ ')+(correct?cfg.fb_ok:cfg.fb_err);
    fb.className='q-feedback show '+(correct?'ok':'err');
    var cardPts=parseInt(card.dataset.points,10)||PTS_EACH;
    if(correct)total+=cardPts;
    sections.push({qid:Number(qid),correct:correct,pts:correct?cardPts:0});
  });
  // clamp to 100 in case of floating-point / rounding surplus
  total=Math.min(100,total);
  showResult(total,sections);
  if(typeof window.submitScore==='function'){window.submitScore(total);}
}

function showResult(score,sections){
  document.getElementById('quizContainer').style.display='none';
  var rs=document.getElementById('resultScreen');
  rs.classList.add('show');
  var color=score>=80?'#22c55e':score>=60?'#f59e0b':'#ef4444';
  var ring=document.getElementById('ringVal');
  ring.style.stroke=color;
  setTimeout(function(){ring.style.strokeDashoffset=314*(1-score/100);},80);
  var numEl=document.getElementById('scoreNum');
  numEl.style.color=color;
  var n=0;var t=setInterval(function(){n=Math.min(n+2,score);numEl.textContent=n;if(n>=score)clearInterval(t);},18);
  var grade=document.getElementById('resultGrade');
  var sub=document.getElementById('resultSub');
  if(score>=90){grade.textContent='🏆 ممتاز';grade.style.color='#22c55e';sub.textContent='أداء رائع! أنت تتقن هذا المحتوى.';}
  else if(score>=70){grade.textContent='⭐ جيد جداً';grade.style.color='#4f8ef7';sub.textContent='فهم متين، واصل التقدم!';}
  else if(score>=50){grade.textContent='✔ مقبول';grade.style.color='#f59e0b';sub.textContent='راجع الأخطاء لترسيخ الفهم.';}
  else{grade.textContent='📚 يحتاج مراجعة';grade.style.color='#ef4444';sub.textContent='ننصح بمراجعة المحتوى مرة أخرى.';}
  var bd=document.getElementById('breakdown');
  bd.innerHTML='<div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">تفصيل الدرجات</div>';
  sections.sort(function(a,b){return a.qid-b.qid;}).forEach(function(s){
    bd.innerHTML+='<div class="breakdown-row"><span>سؤال '+s.qid+'</span><span class="'+(s.correct?'pts-ok':'pts-err')+'">'+(s.correct?'+'+s.pts+' ✓':'0 ✗')+'</span></div>';
  });
  bd.innerHTML+='<div class="breakdown-row" style="font-weight:800"><span>المجموع الكلي</span><span style="color:'+color+'">'+score+'/100</span></div>';
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

// ─── AI quiz generation ───────────────────────────────────────────────────────

const UNIT_QUIZ_SYSTEM_PROMPT =
  `أنت خبير تصميم اختبارات للمنصة التعليمية نُخبة. مهمتك توليد ملف HTML كامل لاختبار وحدة دراسية.
قواعد صارمة:
1. الناتج HTML خام فقط — ابدأ بـ <!DOCTYPE html> مباشرة بلا أي نص قبله.
2. استخدم القالب المُرفق بالضبط (CSS + JS). لا تحذف منه شيئاً.
3. 10 أسئلة بالضبط: 4 اختيار من متعدد + 3 صح/خطأ + 3 أكمل الفراغ. كل سؤال = 10 نقاط.
4. ضع عنوان الاختبار في <title> بالتنسيق: "اختبار الوحدة | اسم الوحدة".
5. الأسئلة تختبر الفهم والتطبيق، لا الحفظ الحرفي.
6. أكمل كائن CORRECT بالأجوبة الصحيحة وتغذية راجعة مفيدة عربية.
7. window.submitScore(total) يُستدعى تلقائياً في showResult — لا تغيّر هذا.`;

const STAGE_QUIZ_SYSTEM_PROMPT =
  `أنت خبير تصميم اختبارات للمنصة التعليمية نُخبة. مهمتك توليد ملف HTML كامل لاختبار مرحلة دراسية كاملة.
قواعد صارمة:
1. الناتج HTML خام فقط — ابدأ بـ <!DOCTYPE html> مباشرة بلا أي نص قبله.
2. استخدم القالب المُرفق بالضبط (CSS + JS). لا تحذف منه شيئاً.
3. 20 سؤالاً بالضبط: 8 اختيار من متعدد + 6 صح/خطأ + 6 أكمل الفراغ. كل سؤال = 5 نقاط.
4. ضع عنوان الاختبار في <title> بالتنسيق: "اختبار المرحلة | اسم المرحلة".
5. الأسئلة سهلة — تختبر المفاهيم الأساسية فقط، موزعة على جميع وحدات المرحلة بالتساوي.
6. أكمل كائن CORRECT بالأجوبة الصحيحة وتغذية راجعة مفيدة عربية.
7. window.submitScore(total) يُستدعى تلقائياً في showResult — لا تغيّر هذا.`;

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

async function callAiAndExtractHtml(
  systemPrompt: string,
  userPrompt: string,
  totalQuestions: number,
  logTag: string
): Promise<string> {
  // Scale output tokens with quiz length: 10→10K, 20→18K, 30→26K
  const maxTokens = totalQuestions <= 10 ? 10_000 : totalQuestions <= 20 ? 18_000 : 26_000;

  const result = await generateGemini({
    systemPrompt,
    userParts: [{ type: "text", text: userPrompt }],
    model: "gemini-2.5-flash",
    temperature: 0.6,
    maxOutputTokens: maxTokens,
    timeoutMs: 180_000,
    logTag,
  });

  let html = result.text.trim();

  // Strip markdown fences if the model wrapped the output
  const fenceMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceMatch) html = fenceMatch[1].trim();

  // If model prefixed with explanation text, skip to DOCTYPE
  const doctypeIdx = html.search(/<!doctype\s+html/i);
  if (doctypeIdx > 0) html = html.slice(doctypeIdx);

  return html;
}

/** Generate and validate a 10-question unit quiz HTML page. */
export async function generateUnitQuizHtml(unit: UnitContent): Promise<string> {
  const template = buildQuizHtmlTemplate(10);
  const contentSummary = buildUnitContentSummary(unit);
  const userPrompt =
    `محتوى الوحدة الدراسية:\n${contentSummary}\n\nالقالب الكامل (أضف الأسئلة داخله):\n${template}`;

  const html = await callAiAndExtractHtml(UNIT_QUIZ_SYSTEM_PROMPT, userPrompt, 10, "unit-quiz-gen");

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}

/** Generate and validate a 20-question stage quiz HTML page. */
export async function generateStageQuizHtml(stage: StageContent): Promise<string> {
  const template = buildQuizHtmlTemplate(20);
  const contentSummary = buildStageContentSummary(stage);
  const userPrompt =
    `محتوى المرحلة الدراسية:\n${contentSummary}\n\nالقالب الكامل (أضف الأسئلة الـ 20 داخله):\n${template}`;

  const html = await callAiAndExtractHtml(STAGE_QUIZ_SYSTEM_PROMPT, userPrompt, 20, "stage-quiz-gen");

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}

// ─── Level quiz (30 questions, mixed points → exactly 100) ───────────────────
// Breakdown: 10 MCQ × 5 pts = 50 | 10 T/F × 3 pts = 30 | 10 Fill × 2 pts = 20

const LEVEL_QUIZ_SYSTEM_PROMPT =
  `أنت خبير تصميم اختبارات للمنصة التعليمية نُخبة. مهمتك توليد ملف HTML كامل لاختبار مستوى دراسي كامل.
قواعد صارمة (الإخلال بها يُبطل الاختبار):
1. الناتج HTML خام فقط — ابدأ بـ <!DOCTYPE html> مباشرة، لا نص قبله أبداً.
2. استخدم القالب المُرفق بالضبط (CSS + JS كاملَين). لا تحذف منه شيئاً.
3. 30 سؤالاً بالضبط — التوزيع الإلزامي بالنقاط:
   • 10 أسئلة اختيار من متعدد  → data-points="5" لكل منها  (10 × 5 = 50 نقطة)
   • 10 أسئلة صح / خطأ        → data-points="3" لكل منها  (10 × 3 = 30 نقطة)
   • 10 أسئلة أكمل الفراغ     → data-points="2" لكل منها  (10 × 2 = 20 نقطة)
   المجموع = 100 نقطة بالضبط.
4. وزّع الأسئلة بالتساوي على جميع مراحل المستوى — كل مرحلة تحصل على حصة متكافئة.
5. ضع عنوان الاختبار في <title> بالتنسيق: "اختبار المستوى | اسم المستوى".
6. الأسئلة سهلة إلى متوسطة — تختبر المفاهيم الأساسية والأهداف الجوهرية، لا التفاصيل الدقيقة.
7. أكمل كائن CORRECT بالأجوبة الصحيحة وتغذية راجعة مفيدة وواضحة بالعربية.
8. تأكد أن data-points موجودة على كل بطاقة سؤال (البرمجة تقرأها لحساب الدرجة).
9. window.submitScore(total) تُستدعى تلقائياً في showResult — لا تغيّرها.`;

/** Generate and validate a 30-question level quiz HTML page (mixed point weights, total = 100). */
export async function generateLevelQuizHtml(level: LevelContent): Promise<string> {
  const template = buildQuizHtmlTemplate(30);
  const contentSummary = buildLevelContentSummary(level);
  const userPrompt =
    `محتوى المستوى الدراسي:\n${contentSummary}\n\nالقالب الكامل (أضف الأسئلة الـ 30 داخله — تذكر data-points لكل بطاقة):\n${template}`;

  const html = await callAiAndExtractHtml(LEVEL_QUIZ_SYSTEM_PROMPT, userPrompt, 30, "level-quiz-gen");

  const check = validateQuizHtml(html);
  if (!check.valid) throw new Error(`validation_failed: ${check.error}`);
  return html;
}
