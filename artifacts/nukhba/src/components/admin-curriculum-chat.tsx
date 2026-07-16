import { useState, useRef, useEffect } from "react";
import {
  BookOpen, Send, Loader2, Search, ChevronRight, ChevronDown,
  FlaskConical, AlertTriangle, CheckCircle2, Brain, Lightbulb,
  GraduationCap, Layers, BookMarked, HelpCircle, X, MessageSquarePlus,
  Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ── Types returned from the backend ──────────────────────────────────────────
interface Specialty { name: string; slug: string; icon?: string | null; id?: number; activeInstructionVersionId?: number | null }
interface Level { id: number; levelIndex: number; name: string; goal: string; examMeta?: any; meta?: any }
interface Stage { id: number; stageIndex: number; code: string; name: string; goal: string; meta?: any }
interface Unit  { id: number; unitIndex: number; code: string; name: string; goal: string; keyConcepts?: string[]; meta?: any }
interface Concept { id: number; conceptIndex: number; name: string; explanation: string; masteryCriterion: string; weight?: number }
interface Mistake { id: number; mistakeIndex: number; mistake: string; correction: string; treatment: string; severity?: string }
interface LabQuestion { id: number; questionIndex: number; kind: string; prompt: string; rubric?: string | null; solutionOutline?: string | null; points?: number }
interface Lab { id: number; labIndex: number; code: string; title: string; scenario: string; completionCriterion: string; questions: LabQuestion[] }
interface Lesson {
  id: number; lessonIndex: number; code: string; name: string; goal: string;
  bridgeSentence: string; finalCheckQuestion: string; sessionCompleteCriterion: string;
  yemeniExamples?: string[]; expectedDurationMinutes?: number | null; estimatedGemCost?: number | null;
  solutionOutline?: string | null; meta?: any;
  concepts: Concept[]; mistakes: Mistake[];
}
interface UnitDetail extends Unit {
  lessons: Lesson[];
  labs: Lab[];
}

interface ContentResult {
  specialty: Specialty;
  scope: "specialty" | "level" | "stage" | "unit" | "lesson";
  versionId: number;
  level?: Level;
  stage?: Stage;
  unit?: Unit;
  lesson?: Lesson;
  levels?: Level[];
  stages?: Stage[];
  units?: Unit[];
  unitsDetail?: UnitDetail[]; // stage scope: full per-unit content
  lessons?: Lesson[];
  labs?: Lab[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content?: string;
  result?: ContentResult;
}

interface ParsedQuery {
  specialtySlug: string | null;
  levelIndex: number | null;
  stageIndex: number | null;
  unitIndex: number | null;
  lessonIndex: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CSRF_HEADER = { "X-Nukhba-Csrf": "1" };

async function apiFetch(path: string, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...CSRF_HEADER },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

function scopeLabel(scope: string): string {
  const map: Record<string, string> = {
    specialty: "التخصص كاملاً",
    level: "المستوى",
    stage: "المرحلة",
    unit: "الوحدة",
    lesson: "الدرس",
  };
  return map[scope] ?? scope;
}

function severityColor(s?: string) {
  if (s === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (s === "minor") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  return "text-orange-400 bg-orange-500/10 border-orange-500/30";
}

const KIND_ICONS: Record<string, string> = {
  diagnostic: "🔍", decision: "🎯", application: "⚙️", analysis: "📊", connection: "🔗",
};

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, icon, count, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors text-right"
      >
        {icon}
        <span className="flex-1 text-right">{title}</span>
        {count != null && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">{count}</span>
        )}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ── Concept card ──────────────────────────────────────────────────────────────
function ConceptCard({ c, index }: { c: Concept; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-emerald-500/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-right hover:bg-emerald-500/5 transition-colors"
      >
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">{index}</span>
        <span className="flex-1 text-sm font-medium text-white/90">{c.name}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5">
          <div>
            <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wide mb-1">الشرح</p>
            <p className="text-sm text-white/75 leading-relaxed">{c.explanation}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide mb-1">معيار الإتقان</p>
            <p className="text-sm text-white/75 leading-relaxed">{c.masteryCriterion}</p>
          </div>
          {c.weight && c.weight !== 1 && (
            <p className="text-[11px] text-white/40">الوزن النسبي: {c.weight}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lesson card (inside unit view) ────────────────────────────────────────────
function LessonCard({ lesson, lessonNum }: { lesson: Lesson; lessonNum: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-sky-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-sky-500/5 transition-colors"
      >
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 shrink-0 mt-0.5">
          درس {lessonNum}
        </span>
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold text-white/90">{lesson.name}</p>
          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{lesson.goal}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {lesson.concepts.length > 0 && (
            <span className="text-[10px] text-emerald-400/80">{lesson.concepts.length} مفهوم</span>
          )}
          {open ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* Goal */}
          <div className="bg-sky-500/5 border border-sky-500/15 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold text-sky-400/70 mb-1">هدف الدرس</p>
            <p className="text-sm text-white/75 leading-relaxed">{lesson.goal}</p>
          </div>
          {/* Bridge sentence */}
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold text-amber-400/70 mb-1">جملة الربط (الافتتاح)</p>
            <p className="text-sm text-white/75 leading-relaxed italic">"{lesson.bridgeSentence}"</p>
          </div>
          {/* Concepts */}
          {lesson.concepts.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-emerald-400/70 mb-2 flex items-center gap-1.5">
                <Brain className="w-3 h-3" /> المفاهيم ({lesson.concepts.length})
              </p>
              <div className="space-y-2">
                {lesson.concepts.map((c) => <ConceptCard key={c.id} c={c} index={c.conceptIndex} />)}
              </div>
            </div>
          )}
          {/* Common mistakes */}
          {lesson.mistakes.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-orange-400/70 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> الأخطاء الشائعة ({lesson.mistakes.length})
              </p>
              <div className="space-y-2">
                {lesson.mistakes.map((m) => (
                  <div key={m.id} className={`border rounded-lg px-3 py-2.5 text-sm ${severityColor(m.severity ?? "major")}`}>
                    <p className="font-medium">{m.mistake}</p>
                    <p className="text-white/60 mt-1">✅ {m.correction}</p>
                    {m.treatment && <p className="text-white/50 text-[11px] mt-1">🔧 {m.treatment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Final check */}
          <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold text-purple-400/70 mb-1">سؤال الفحص النهائي</p>
            <p className="text-sm text-white/75 leading-relaxed">{lesson.finalCheckQuestion}</p>
          </div>
          {/* Yemeni examples */}
          {lesson.yemeniExamples && lesson.yemeniExamples.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-teal-400/70 mb-2">أمثلة يمنية</p>
              <ul className="space-y-1">
                {lesson.yemeniExamples.map((ex, i) => (
                  <li key={i} className="text-sm text-white/65 flex gap-2">
                    <span className="text-teal-400 shrink-0">•</span>{ex}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Meta */}
          <div className="flex gap-3 flex-wrap text-[11px] text-white/40">
            {lesson.expectedDurationMinutes && <span>⏱ {lesson.expectedDurationMinutes} دقيقة</span>}
            {lesson.estimatedGemCost && <span>💎 {lesson.estimatedGemCost} جوهرة</span>}
            <span className="font-mono opacity-60">{lesson.code}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unit detail card (used inside stage view) ─────────────────────────────────
function UnitDetailCard({ unit }: { unit: UnitDetail }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-amber-500/25 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-right hover:bg-amber-500/5 transition-colors"
      >
        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
          وحدة {unit.unitIndex}
        </span>
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold text-white/90">{unit.name}</p>
          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">{unit.goal}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {unit.lessons.length > 0 && (
            <span className="text-[10px] text-sky-400/70">{unit.lessons.length} درس</span>
          )}
          {unit.labs.length > 0 && (
            <span className="text-[10px] text-violet-400/70">{unit.labs.length} معمل</span>
          )}
          {open ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* Key concepts chips */}
          {Array.isArray(unit.keyConcepts) && unit.keyConcepts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white/40 mb-1.5">المفاهيم الرئيسية</p>
              <div className="flex flex-wrap gap-1.5">
                {unit.keyConcepts.map((kc, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">{kc}</span>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          {unit.lessons.length > 0 && (
            <Section title="الدروس" icon={<BookOpen className="w-4 h-4 text-sky-400" />} count={unit.lessons.length} defaultOpen>
              <div className="space-y-2">
                {unit.lessons.map((l) => <LessonCard key={l.id} lesson={l} lessonNum={l.lessonIndex} />)}
              </div>
            </Section>
          )}

          {/* Labs */}
          {unit.labs.length > 0 && (
            <Section title="المعامل التطبيقية" icon={<FlaskConical className="w-4 h-4 text-violet-400" />} count={unit.labs.length} defaultOpen>
              <div className="space-y-2">
                {unit.labs.map((lab) => <LabCard key={lab.id} lab={lab} />)}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lab card ──────────────────────────────────────────────────────────────────
function LabCard({ lab }: { lab: Lab }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-violet-500/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-violet-500/5 transition-colors"
      >
        <FlaskConical className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-right">
          <p className="text-sm font-semibold text-white/90">{lab.title}</p>
          <p className="text-[11px] text-white/50 font-mono">{lab.code}</p>
        </div>
        <span className="text-[10px] text-violet-400/70 shrink-0 mt-0.5">{lab.questions.length} أسئلة</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          <div className="bg-violet-500/5 border border-violet-500/15 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-bold text-violet-400/70 mb-1">السيناريو</p>
            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">{lab.scenario}</p>
          </div>
          {lab.completionCriterion && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-bold text-emerald-400/70 mb-1">معيار الإتمام</p>
              <p className="text-sm text-white/75">{lab.completionCriterion}</p>
            </div>
          )}
          {lab.questions.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-white/50">أسئلة المعمل</p>
              {lab.questions.map((q) => (
                <div key={q.id} className="border border-white/8 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs">{KIND_ICONS[q.kind] ?? "❓"}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase">{q.kind}</span>
                    {q.points && q.points !== 1 && (
                      <span className="text-[10px] text-amber-400/60 mr-auto">{q.points} نقطة</span>
                    )}
                  </div>
                  <p className="text-sm text-white/80">{q.prompt}</p>
                  {q.rubric && (
                    <p className="text-[11px] text-white/40 mt-1.5 border-t border-white/5 pt-1.5">
                      📋 {q.rubric}
                    </p>
                  )}
                  {q.solutionOutline && (
                    <p className="text-[11px] text-emerald-400/60 mt-1 border-t border-white/5 pt-1">
                      💡 {q.solutionOutline}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Serialize result to plain text for copying ────────────────────────────────
function serializeResult(r: ContentResult): string {
  const lines: string[] = [];
  const sep = (char = "─", len = 50) => char.repeat(len);

  const addLesson = (l: Lesson, indent = "") => {
    lines.push(`${indent}📖 درس ${l.lessonIndex}: ${l.name}`);
    lines.push(`${indent}   الكود: ${l.code}`);
    lines.push(`${indent}   الهدف: ${l.goal}`);
    lines.push(`${indent}   جملة الربط: "${l.bridgeSentence}"`);
    if (l.concepts.length > 0) {
      lines.push(`${indent}   المفاهيم (${l.concepts.length}):`);
      l.concepts.forEach((c) => {
        lines.push(`${indent}     [${c.conceptIndex}] ${c.name}`);
        lines.push(`${indent}         الشرح: ${c.explanation}`);
        lines.push(`${indent}         معيار الإتقان: ${c.masteryCriterion}`);
      });
    }
    if (l.mistakes.length > 0) {
      lines.push(`${indent}   الأخطاء الشائعة (${l.mistakes.length}):`);
      l.mistakes.forEach((m) => {
        lines.push(`${indent}     ❌ ${m.mistake}`);
        lines.push(`${indent}     ✅ ${m.correction}`);
        if (m.treatment) lines.push(`${indent}     🔧 ${m.treatment}`);
      });
    }
    lines.push(`${indent}   سؤال الفحص النهائي: ${l.finalCheckQuestion}`);
    lines.push(`${indent}   معيار اكتمال الجلسة: ${l.sessionCompleteCriterion}`);
    if (l.solutionOutline) lines.push(`${indent}   نموذج الإجابة: ${l.solutionOutline}`);
    if (l.yemeniExamples && l.yemeniExamples.length > 0) {
      lines.push(`${indent}   أمثلة يمنية:`);
      l.yemeniExamples.forEach((ex) => lines.push(`${indent}     • ${ex}`));
    }
  };

  const addLab = (lab: Lab, indent = "") => {
    lines.push(`${indent}🧪 معمل ${lab.labIndex}: ${lab.title} (${lab.code})`);
    lines.push(`${indent}   السيناريو: ${lab.scenario}`);
    if (lab.completionCriterion) lines.push(`${indent}   معيار الإتمام: ${lab.completionCriterion}`);
    if (lab.questions.length > 0) {
      lines.push(`${indent}   أسئلة المعمل (${lab.questions.length}):`);
      lab.questions.forEach((q) => {
        lines.push(`${indent}     [${q.questionIndex}] ${q.prompt}`);
        if (q.rubric) lines.push(`${indent}         📋 ${q.rubric}`);
        if (q.solutionOutline) lines.push(`${indent}         💡 ${q.solutionOutline}`);
      });
    }
  };

  // Header
  lines.push(`التخصص: ${r.specialty.name} (${r.specialty.slug})`);
  lines.push(`النطاق: ${r.scope} | الإصدار: ${r.versionId}`);
  lines.push(sep("═"));

  if (r.scope === "lesson" && r.lesson) {
    addLesson(r.lesson);
  } else if (r.scope === "unit" && r.unit) {
    lines.push(`📦 وحدة ${r.unit.unitIndex}: ${r.unit.name} (${r.unit.code})`);
    lines.push(`   الهدف: ${r.unit.goal}`);
    if (r.unit.keyConcepts?.length) lines.push(`   المفاهيم الرئيسية: ${r.unit.keyConcepts.join("، ")}`);
    lines.push(sep());
    (r.lessons ?? []).forEach((l) => { addLesson(l, ""); lines.push(sep("·")); });
    (r.labs ?? []).forEach((lab) => { addLab(lab, ""); lines.push(sep("·")); });
  } else if (r.scope === "stage" && r.stage) {
    lines.push(`🗂 مرحلة ${r.stage.stageIndex}: ${r.stage.name} (${r.stage.code})`);
    lines.push(`   الهدف: ${r.stage.goal}`);
    lines.push(sep("═"));
    if (r.unitsDetail && r.unitsDetail.length > 0) {
      // Full detail (new)
      r.unitsDetail.forEach((u) => {
        lines.push(`📦 وحدة ${u.unitIndex}: ${u.name} (${u.code})`);
        lines.push(`   الهدف: ${u.goal}`);
        if (u.keyConcepts?.length) lines.push(`   المفاهيم الرئيسية: ${u.keyConcepts.join("، ")}`);
        lines.push(sep());
        (u.lessons ?? []).forEach((l) => { addLesson(l, "  "); lines.push(sep("·")); });
        (u.labs ?? []).forEach((lab) => { addLab(lab, "  "); lines.push(sep("·")); });
        lines.push(sep("═"));
      });
    } else {
      // Fallback: summary only
      (r.units ?? []).forEach((u) => {
        lines.push(`  📦 وحدة ${u.unitIndex}: ${u.name} (${u.code})`);
        lines.push(`     الهدف: ${u.goal}`);
        if (u.keyConcepts?.length) lines.push(`     المفاهيم: ${u.keyConcepts.join("، ")}`);
        lines.push("");
      });
    }
  } else if (r.scope === "level" && r.level) {
    lines.push(`🎓 مستوى ${r.level.levelIndex}: ${r.level.name}`);
    lines.push(`   الهدف: ${r.level.goal}`);
    lines.push(sep());
    (r.stages ?? []).forEach((s) => {
      lines.push(`  🗂 مرحلة ${s.stageIndex}: ${s.name} (${s.code})`);
      lines.push(`     الهدف: ${s.goal}`);
      lines.push("");
    });
  } else if (r.scope === "specialty") {
    (r.levels ?? []).forEach((lv) => {
      lines.push(`🎓 مستوى ${lv.levelIndex}: ${lv.name}`);
      lines.push(`   الهدف: ${lv.goal}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

// ── Copy button with transient feedback ───────────────────────────────────────
function CopyButton({ result }: { result: ContentResult }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(serializeResult(result)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="نسخ كل المحتوى"
      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border transition-all duration-200 ${
        copied
          ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
          : "border-white/10 text-white/35 hover:text-white/70 hover:border-white/20 hover:bg-white/5"
      }`}
    >
      {copied ? <><Check className="w-3 h-3" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ المحتوى</>}
    </button>
  );
}

// ── Main result renderer ──────────────────────────────────────────────────────
function ResultView({ result }: { result: ContentResult }) {
  const { specialty, scope, level, stage, unit, lesson, levels, stages, units, lessons, labs } = result;

  const scopeBreadcrumb = [
    specialty.name,
    level ? `المستوى ${level.levelIndex}: ${level.name}` : null,
    stage ? `المرحلة ${stage.stageIndex}: ${stage.name}` : null,
    unit ? `الوحدة ${unit.unitIndex}: ${unit.name}` : null,
    lesson ? `الدرس ${lesson.lessonIndex}: ${lesson.name}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-white/40">
        {scopeBreadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
            <span className={i === scopeBreadcrumb.length - 1 ? "text-white/70 font-medium" : ""}>{crumb}</span>
          </span>
        ))}
      </div>

      {/* ── LESSON scope ── */}
      {scope === "lesson" && lesson && (
        <div className="space-y-4">
          <div className="bg-gradient-to-bl from-sky-500/10 to-purple-500/5 border border-sky-500/20 rounded-xl px-4 py-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-bold text-sky-400/70 mb-0.5">الدرس {lesson.lessonIndex}</p>
                <h3 className="text-base font-bold text-white">{lesson.name}</h3>
                <p className="text-xs font-mono text-white/30 mt-0.5">{lesson.code}</p>
              </div>
              <div className="flex gap-2 text-[11px] text-white/40 shrink-0 flex-col items-end">
                {lesson.expectedDurationMinutes && <span>⏱ {lesson.expectedDurationMinutes} د</span>}
                {lesson.estimatedGemCost && <span>💎 {lesson.estimatedGemCost}</span>}
              </div>
            </div>
            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-bold text-white/40 mb-1">الهدف</p>
                <p className="text-sm text-white/80 leading-relaxed">{lesson.goal}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-amber-400/70 mb-1.5">جملة الربط الافتتاحية</p>
            <p className="text-sm text-white/80 leading-relaxed italic">"{lesson.bridgeSentence}"</p>
          </div>

          {lesson.concepts.length > 0 && (
            <Section title={`المفاهيم الأساسية`} icon={<Brain className="w-4 h-4 text-emerald-400" />} count={lesson.concepts.length} defaultOpen>
              <div className="space-y-2">
                {lesson.concepts.map((c) => <ConceptCard key={c.id} c={c} index={c.conceptIndex} />)}
              </div>
            </Section>
          )}

          {lesson.mistakes.length > 0 && (
            <Section title="الأخطاء الشائعة" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} count={lesson.mistakes.length} defaultOpen>
              <div className="space-y-2">
                {lesson.mistakes.map((m) => (
                  <div key={m.id} className={`border rounded-lg px-3 py-2.5 text-sm ${severityColor(m.severity ?? "major")}`}>
                    <p className="font-medium">{m.mistake}</p>
                    <p className="text-white/65 mt-1">✅ {m.correction}</p>
                    {m.treatment && <p className="text-white/50 text-[11px] mt-1">🔧 {m.treatment}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="التقييم النهائي" icon={<CheckCircle2 className="w-4 h-4 text-purple-400" />} defaultOpen>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-purple-400/70 mb-1">سؤال الفحص النهائي</p>
                <p className="text-sm text-white/80 leading-relaxed">{lesson.finalCheckQuestion}</p>
              </div>
              {lesson.solutionOutline && (
                <div>
                  <p className="text-[10px] font-bold text-emerald-400/70 mb-1">نموذج الإجابة</p>
                  <p className="text-sm text-white/70 leading-relaxed">{lesson.solutionOutline}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-white/40 mb-1">معيار اكتمال الجلسة</p>
                <p className="text-sm text-white/60 leading-relaxed">{lesson.sessionCompleteCriterion}</p>
              </div>
            </div>
          </Section>

          {lesson.yemeniExamples && lesson.yemeniExamples.length > 0 && (
            <Section title="أمثلة يمنية" icon={<Lightbulb className="w-4 h-4 text-teal-400" />} count={lesson.yemeniExamples.length}>
              <ul className="space-y-1.5">
                {lesson.yemeniExamples.map((ex, i) => (
                  <li key={i} className="text-sm text-white/70 flex gap-2">
                    <span className="text-teal-400 shrink-0">•</span>{ex}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* ── UNIT scope ── */}
      {scope === "unit" && unit && (
        <div className="space-y-4">
          <div className="bg-gradient-to-bl from-amber-500/10 to-emerald-500/5 border border-amber-500/20 rounded-xl px-4 py-4">
            <p className="text-[10px] font-bold text-amber-400/70 mb-0.5">الوحدة {unit.unitIndex} · {unit.code}</p>
            <h3 className="text-base font-bold text-white mb-2">{unit.name}</h3>
            <p className="text-sm text-white/70 leading-relaxed">{unit.goal}</p>
            {Array.isArray(unit.keyConcepts) && unit.keyConcepts.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-white/40 mb-1.5">المفاهيم الرئيسية</p>
                <div className="flex flex-wrap gap-1.5">
                  {unit.keyConcepts.map((kc, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">{kc}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {lessons && lessons.length > 0 && (
            <Section title="الدروس" icon={<BookOpen className="w-4 h-4 text-sky-400" />} count={lessons.length} defaultOpen>
              <div className="space-y-2">
                {lessons.map((l) => <LessonCard key={l.id} lesson={l} lessonNum={l.lessonIndex} />)}
              </div>
            </Section>
          )}

          {labs && labs.length > 0 && (
            <Section title="المعامل التطبيقية" icon={<FlaskConical className="w-4 h-4 text-violet-400" />} count={labs.length} defaultOpen>
              <div className="space-y-2">
                {labs.map((lab) => <LabCard key={lab.id} lab={lab} />)}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── STAGE scope ── */}
      {scope === "stage" && stage && (
        <div className="space-y-4">
          <div className="bg-gradient-to-bl from-purple-500/10 to-sky-500/5 border border-purple-500/20 rounded-xl px-4 py-4">
            <p className="text-[10px] font-bold text-purple-400/70 mb-0.5">المرحلة {stage.stageIndex} · {stage.code}</p>
            <h3 className="text-base font-bold text-white mb-2">{stage.name}</h3>
            <p className="text-sm text-white/70 leading-relaxed">{stage.goal}</p>
          </div>

          {/* Full detail — one collapsible card per unit with lessons + labs */}
          {unitsDetail && unitsDetail.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] text-white/35 flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                {unitsDetail.length} وحدة — المحتوى الكامل
              </p>
              {unitsDetail.map((u) => <UnitDetailCard key={u.id} unit={u} />)}
            </div>
          ) : units && units.length > 0 ? (
            /* Fallback for old responses */
            <Section title="الوحدات" icon={<Layers className="w-4 h-4 text-amber-400" />} count={units.length} defaultOpen>
              <div className="space-y-2">
                {units.map((u) => (
                  <div key={u.id} className="border border-white/10 rounded-lg px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 shrink-0">{u.unitIndex}</span>
                      <div>
                        <p className="text-sm font-medium text-white/90">{u.name}</p>
                        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{u.goal}</p>
                        {Array.isArray(u.keyConcepts) && u.keyConcepts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {u.keyConcepts.map((kc, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">{kc}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-white/30 font-mono shrink-0 mr-auto">{u.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      )}

      {/* ── LEVEL scope ── */}
      {scope === "level" && level && (
        <div className="space-y-4">
          <div className="bg-gradient-to-bl from-emerald-500/10 to-sky-500/5 border border-emerald-500/20 rounded-xl px-4 py-4">
            <p className="text-[10px] font-bold text-emerald-400/70 mb-0.5">المستوى {level.levelIndex}</p>
            <h3 className="text-base font-bold text-white mb-2">{level.name}</h3>
            <p className="text-sm text-white/70 leading-relaxed">{level.goal}</p>
            {level.meta?.bloom_focus && (
              <p className="text-[11px] text-white/40 mt-2">تركيز بلوم: {level.meta.bloom_focus}</p>
            )}
          </div>
          {stages && stages.length > 0 && (
            <Section title="المراحل" icon={<GraduationCap className="w-4 h-4 text-purple-400" />} count={stages.length} defaultOpen>
              <div className="space-y-2">
                {stages.map((s) => (
                  <div key={s.id} className="border border-white/10 rounded-lg px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 shrink-0">{s.stageIndex}</span>
                      <div>
                        <p className="text-sm font-medium text-white/90">{s.name}</p>
                        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{s.goal}</p>
                      </div>
                      <span className="text-[10px] text-white/30 font-mono shrink-0 mr-auto">{s.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── SPECIALTY scope (all levels) ── */}
      {scope === "specialty" && levels && levels.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-white/50">المستويات في {specialty.name}</p>
          {levels.map((lv) => (
            <div key={lv.id} className="border border-white/10 rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">مستوى {lv.levelIndex}</span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{lv.name}</p>
                  <p className="text-[11px] text-white/50 mt-0.5">{lv.goal}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Structured selector (fallback / shortcut) ─────────────────────────────────
function StructuredSelector({
  specialties,
  selected,
  onChange,
}: {
  specialties: Specialty[];
  selected: { specialtySlug: string; levelIndex: string; stageIndex: string; unitIndex: string; lessonIndex: string };
  onChange: (k: string, v: string) => void;
}) {
  const inputCls = "h-8 text-sm bg-white/5 border border-white/10 rounded-lg px-3 text-white/80 w-full focus:outline-none focus:border-amber-500/50 focus:bg-white/8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 border border-white/10 rounded-xl bg-white/3">
      <div className="col-span-2 sm:col-span-3">
        <label className="text-[10px] text-white/40 block mb-1">التخصص</label>
        <select
          value={selected.specialtySlug}
          onChange={e => onChange("specialtySlug", e.target.value)}
          className="h-8 text-sm bg-white/5 border border-white/10 rounded-lg px-2 text-white/80 w-full focus:outline-none focus:border-amber-500/50"
        >
          <option value="">اختر التخصص</option>
          {specialties.map(s => <option key={s.slug} value={s.slug}>{s.icon} {s.name}</option>)}
        </select>
      </div>
      {[
        { key: "levelIndex", label: "المستوى (1-5)" },
        { key: "stageIndex", label: "المرحلة (1-7)" },
        { key: "unitIndex", label: "الوحدة (1-9)" },
        { key: "lessonIndex", label: "الدرس (1-10) — اختياري" },
      ].map(({ key, label }) => (
        <div key={key}>
          <label className="text-[10px] text-white/40 block mb-1">{label}</label>
          <input
            type="number"
            min={1}
            value={(selected as any)[key]}
            onChange={e => onChange(key, e.target.value)}
            placeholder="—"
            className={inputCls}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AdminCurriculumChat() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"chat" | "structured">("chat");
  const [structured, setStructured] = useState({
    specialtySlug: "", levelIndex: "", stageIndex: "", unitIndex: "", lessonIndex: "",
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load specialties once
  useEffect(() => {
    fetch("/api/admin/curriculum/specialties", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.specialties) setSpecialties(d.specialties); })
      .catch(() => {})
      .finally(() => setLoadingSpecialties(false));
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const addMsg = (msg: Omit<ChatMessage, "id">) => {
    const full = { ...msg, id: Math.random().toString(36).slice(2) };
    setMessages(prev => [...prev, full]);
    return full;
  };

  async function submitChat(queryText: string, overrideParams?: ParsedQuery) {
    if (loading) return;
    setLoading(true);
    const userMsg = queryText.trim();
    addMsg({ role: "user", content: userMsg });
    setInput("");

    try {
      let params: ParsedQuery;

      if (overrideParams) {
        params = overrideParams;
      } else {
        // Step 1: Parse query with AI
        const parseRes = await apiFetch("/api/admin/curriculum/parse-query", { query: userMsg });
        if (parseRes.noAi) {
          // No AI key — suggest switching to structured mode
          addMsg({ role: "error", content: "⚠️ لا يوجد مفتاح OpenRouter مُعيَّن. استخدم الوضع المنظَّم (الأزرار أدناه) لتحديد التخصص والمستوى يدوياً." });
          setMode("structured");
          setLoading(false);
          return;
        }
        params = parseRes.parsed;
      }

      if (!params.specialtySlug) {
        addMsg({ role: "error", content: "لم أتمكن من تحديد التخصص من استفسارك. يُرجى تحديد التخصص بوضوح (مثلاً: الأمن السيبراني، لغة C، إلخ)." });
        setLoading(false);
        return;
      }

      // Step 2: Fetch content from DB
      const contentRes = await apiFetch("/api/admin/curriculum/content", {
        specialtySlug: params.specialtySlug,
        levelIndex: params.levelIndex ?? undefined,
        stageIndex: params.stageIndex ?? undefined,
        unitIndex: params.unitIndex ?? undefined,
        lessonIndex: params.lessonIndex ?? undefined,
      });

      addMsg({ role: "assistant", result: contentRes as ContentResult });
    } catch (err: any) {
      addMsg({ role: "error", content: `❌ خطأ: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function submitStructured() {
    if (!structured.specialtySlug) return;
    const parts: string[] = [];
    const spec = specialties.find(s => s.slug === structured.specialtySlug);
    parts.push(spec?.name ?? structured.specialtySlug);
    if (structured.levelIndex) parts.push(`المستوى ${structured.levelIndex}`);
    if (structured.stageIndex) parts.push(`المرحلة ${structured.stageIndex}`);
    if (structured.unitIndex) parts.push(`الوحدة ${structured.unitIndex}`);
    if (structured.lessonIndex) parts.push(`الدرس ${structured.lessonIndex}`);
    const label = parts.join(" — ");

    await submitChat(label, {
      specialtySlug: structured.specialtySlug,
      levelIndex: structured.levelIndex ? Number(structured.levelIndex) : null,
      stageIndex: structured.stageIndex ? Number(structured.stageIndex) : null,
      unitIndex: structured.unitIndex ? Number(structured.unitIndex) : null,
      lessonIndex: structured.lessonIndex ? Number(structured.lessonIndex) : null,
    });
  }

  const hasSpecialty = specialties.length > 0;
  const noContent = messages.length === 0;

  return (
    <div className="flex flex-col h-[82vh] max-h-[900px] gap-0" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-bl from-amber-500/20 to-emerald-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <BookMarked className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">مستكشف المنهج</h2>
          <p className="text-[11px] text-white/40">استعراض محتوى ملفات التعليمات بدقة متناهية — بدون هلوسة</p>
        </div>
        <div className="mr-auto flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={() => setMode(m => m === "chat" ? "structured" : "chat")}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
          >
            {mode === "chat" ? <><Layers className="w-3 h-3" /> وضع منظَّم</> : <><MessageSquarePlus className="w-3 h-3" /> وضع المحادثة</>}
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> مسح
            </button>
          )}
        </div>
      </div>

      {/* Chat history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {noContent && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-bl from-amber-500/15 to-emerald-500/8 border border-amber-500/20 flex items-center justify-center">
              <Search className="w-7 h-7 text-amber-400/70" />
            </div>
            <div>
              <p className="text-white/60 font-medium mb-1">اسأل عن أي محتوى في المنهج</p>
              <p className="text-[12px] text-white/35 max-w-xs leading-relaxed">
                كل المحتوى يُستخرج مباشرةً من ملفات التعليمات المنشورة — دون أي هلوسة أو توليد.
              </p>
            </div>
            {loadingSpecialties ? (
              <p className="text-[11px] text-white/30 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> جاري تحميل التخصصات...</p>
            ) : hasSpecialty ? (
              <div className="space-y-2 w-full max-w-sm">
                <p className="text-[11px] text-white/30">أمثلة على الأسئلة:</p>
                {[
                  "الوحدة الأولى في المرحلة الثانية من المستوى الأول في الأمن السيبراني",
                  "الدرس الثالث في الوحدة الثانية من المرحلة الأولى",
                  "كل مستويات تخصص لغة C",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setMode("chat"); }}
                    className="w-full text-right text-[12px] px-3 py-2 rounded-lg border border-white/8 text-white/50 hover:text-white/75 hover:border-white/15 hover:bg-white/3 transition-colors"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-400/60">لا توجد تخصصات منشورة بعد. انشر ملف تعليمات أولاً.</p>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
            {msg.role === "user" && (
              <div className="max-w-[85%] bg-amber-500/10 border border-amber-500/20 rounded-2xl rounded-br-md px-4 py-3">
                <p className="text-sm text-white/85">{msg.content}</p>
              </div>
            )}
            {msg.role === "assistant" && msg.result && (
              <div className="w-full bg-black/20 border border-white/8 rounded-2xl rounded-bl-md px-4 py-4">
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/6">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-emerald-400/80">
                    نتيجة البحث · نطاق: {scopeLabel(msg.result.scope)}
                  </span>
                  <span className="text-[10px] text-white/25">إصدار {msg.result.versionId}</span>
                  <div className="mr-auto">
                    <CopyButton result={msg.result} />
                  </div>
                </div>
                <ResultView result={msg.result} />
              </div>
            )}
            {msg.role === "error" && (
              <div className="w-full bg-red-500/8 border border-red-500/20 rounded-2xl rounded-bl-md px-4 py-3 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300/80">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-black/20 border border-white/8 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-[12px] text-white/50">جاري الاستعلام من قاعدة البيانات...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="pt-4 border-t border-white/8 space-y-3">
        {mode === "structured" && (
          <StructuredSelector
            specialties={specialties}
            selected={structured}
            onChange={(k, v) => setStructured(prev => ({ ...prev, [k]: v }))}
          />
        )}

        {mode === "chat" ? (
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) submitChat(input); }
              }}
              placeholder="مثال: أريد الوحدة الثالثة في المرحلة الثانية من المستوى الأول في الأمن السيبراني..."
              className="flex-1 min-h-[56px] max-h-[120px] resize-none bg-white/5 border-white/10 text-sm placeholder:text-white/25 text-white/85 rounded-xl focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40"
              disabled={loading}
              dir="rtl"
            />
            <Button
              onClick={() => { if (input.trim()) submitChat(input); }}
              disabled={loading || !input.trim()}
              className="h-14 px-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl self-end"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        ) : (
          <Button
            onClick={submitStructured}
            disabled={loading || !structured.specialtySlug}
            className="w-full h-10 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Search className="w-4 h-4 ml-2" />}
            استعراض المحتوى
          </Button>
        )}

        <p className="text-center text-[10px] text-white/20">
          المحتوى مصدره قاعدة البيانات مباشرةً · لا هلوسة · لا توليد
        </p>
      </div>
    </div>
  );
}
