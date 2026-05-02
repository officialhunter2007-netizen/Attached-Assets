import { useState, useEffect, useRef, memo, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { writeUserJson, readUserJson, removeUserKey } from "@/lib/user-storage";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth-context";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@workspace/api-client-react/generated/api.schemas";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Send, Bot, User, Sparkles, Loader2, Lock, FileText, ChevronDown, ChevronUp, Plus, Clock, Trophy, RefreshCw, Calendar, Code2, ArrowRight, CheckCircle2, X, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeEditorPanel } from "@/components/code-editor-panel";
import { FoodLabPanel } from "@/components/food-lab-panel";
import { YemenSoftSimulatorV2 } from "@/components/yemensoft/yemensoft-v2";
import AccountingLab from "@/components/accounting-lab/accounting-lab";
import { AttackSimulation } from "@/components/attack-sim/attack-simulation";
import { IntakeDialog as AttackIntakeDialog } from "@/components/attack-sim/intake-dialog";
import type { AttackScenario } from "@/components/attack-sim/types";
import { DynamicEnvShell } from "@/components/dynamic-env/dynamic-env-shell";
import { MobileDesktopHint } from "@/components/mobile-desktop-hint";
import { OptionsQuestion } from "@/components/dynamic-env/options-question";
import { CourseMaterialsPanel, TeachingModeChoiceCard } from "@/components/course-materials-panel";
import { QuizPanel, type QuizKind } from "@/components/quiz-panel";
import { BookOpen } from "lucide-react";

interface LessonSummary {
  id: number;
  subjectId: string;
  subjectName: string;
  title: string;
  summaryHtml: string;
  conversationDate: string;
  messagesCount: number;
}

function SubjectSummaryCard({ summary }: { summary: LessonSummary }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(summary.conversationDate).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const safeHtml = summary.summaryHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-white/5 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div className="text-right">
            <h4 className="font-bold text-base">{summary.title || `جلسة ${summary.subjectName}`}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{date} · {summary.messagesCount} رسالة</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeHtml }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface LabReport {
  id: number;
  subjectId: string;
  subjectName: string;
  envTitle: string;
  envBriefing: string;
  reportText: string;
  feedbackHtml: string;
  createdAt: string;
}

function SubjectLabReportCard({ report }: { report: LabReport }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(report.createdAt).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const safeFeedback = (report.feedbackHtml || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-white/5 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-emerald" />
          </div>
          <div className="text-right min-w-0">
            <h4 className="font-bold text-base truncate">{report.envTitle || "تقرير مختبر"}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{date}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {report.envBriefing && (
                <div className="text-xs text-muted-foreground italic">{report.envBriefing}</div>
              )}
              <div>
                <div className="text-xs font-bold text-gold mb-2">📋 تقريرك المرسل</div>
                <pre className="text-xs whitespace-pre-wrap bg-black/30 border border-white/5 rounded-xl p-3 text-white/85 leading-relaxed font-sans" dir="rtl">{report.reportText}</pre>
              </div>
              {safeFeedback ? (
                <div>
                  <div className="text-xs font-bold text-emerald mb-2">📝 ملاحظات المعلم</div>
                  <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeFeedback }} />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">لم تُسجَّل ملاحظات المعلم لهذا التقرير.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SubscriptionExpiredWall({
  subject,
  allSummaries,
  onRenew,
}: {
  subject: any;
  allSummaries: LessonSummary[];
  onRenew: () => void;
}) {
  const uniqueSubjects = [...new Set(allSummaries.map(s => s.subjectName))];
  const nextStages = subject.defaultStages?.slice(0, 3) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border border-gold/20 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-lg shadow-gold/5"
    >
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -z-10" />

      {/* Achievement summary */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
          <Trophy className="w-7 h-7 text-gold" />
        </div>
        <div>
          <h2 className="text-xl font-bold">انتهت فترة اشتراكك</h2>
          <p className="text-sm text-muted-foreground">إليك ما أنجزته خلال الأسبوعين الماضيين</p>
        </div>
      </div>

      {allSummaries.length > 0 ? (
        <div className="bg-black/30 rounded-2xl p-5 mb-6 border border-white/5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-gold">{allSummaries.length}</div>
              <div className="text-xs text-muted-foreground mt-1">جلسة تعليمية مكتملة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald">{uniqueSubjects.length}</div>
              <div className="text-xs text-muted-foreground mt-1">مادة درستها</div>
            </div>
          </div>
          {uniqueSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uniqueSubjects.map(name => (
                <span key={name} className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-muted-foreground">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-black/30 rounded-2xl p-5 mb-6 border border-white/5 text-center text-muted-foreground text-sm">
          لم تُكمل جلسات بعد — ابدأ اشتراكاً جديداً وابنِ مسارك التعليمي
        </div>
      )}

      {/* What they'll learn next */}
      {nextStages.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            ستتعلم في {subject.name} خلال اشتراكك القادم:
          </p>
          <ul className="space-y-1.5">
            {nextStages.map((stage: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-gold/60 shrink-0" />
                {stage}
              </li>
            ))}
            {subject.defaultStages?.length > 3 && (
              <li className="text-xs text-muted-foreground/60 mr-3.5">
                و{subject.defaultStages.length - 3} مرحلة أخرى...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onRenew}
          className="flex-1 gradient-gold text-primary-foreground font-bold h-12 rounded-xl shadow-md shadow-gold/20 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          جدّد اشتراكك الآن
        </Button>
      </div>
    </motion.div>
  );
}

function parsePlanStages(planHtml: string | null): { title: string; descHtml: string; duration: string }[] {
  if (!planHtml) return [];
  try {
    const match = planHtml.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (!match) return [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items: { title: string; descHtml: string; duration: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = liRegex.exec(match[1])) !== null) {
      const inner = m[1];
      const strong = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? "";
      const em = inner.match(/<em[^>]*>([\s\S]*?)<\/em>/i)?.[1] ?? "";
      const cleanTitle = strong.replace(/<[^>]+>/g, "").trim().replace(/^المرحلة\s*\d+\s*[—\-:]\s*/, "");
      const cleanDuration = em.replace(/<[^>]+>/g, "").replace(/^المدة[:\s]*/i, "").trim();
      const descHtml = inner
        .replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, "")
        .replace(/<em[^>]*>[\s\S]*?<\/em>/i, "")
        .trim();
      items.push({ title: cleanTitle || "مرحلة", descHtml, duration: cleanDuration });
    }
    return items;
  } catch { return []; }
}

function LearningPathPanel({ planHtml, currentStage, totalStages }: { planHtml: string | null; currentStage: number; totalStages: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!planHtml) return null;
  const stages = parsePlanStages(planHtml);
  if (stages.length === 0) return null;
  const effectiveTotal = totalStages || stages.length;
  const progressPct = Math.min(100, Math.round((currentStage / Math.max(effectiveTotal, 1)) * 100));
  const active = stages[currentStage] ?? stages[0];

  return (
    <div className="shrink-0 border-b border-amber-500/15" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.07), rgba(139,92,246,0.05))" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
        style={{ direction: "rtl" }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4 text-black" />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="text-[12px] font-bold text-amber-200 flex items-center gap-2">
              <span>المرحلة {Math.min(currentStage + 1, stages.length)} من {stages.length}</span>
              <span className="text-amber-300/70 font-normal">·</span>
              <span className="text-white/85 truncate">{active.title}</span>
            </div>
            <div className="mt-1 h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-l from-amber-400 to-amber-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-300 shrink-0" /> : <ChevronDown className="w-4 h-4 text-amber-300 shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1" style={{ direction: "rtl" }}>
              <ol className="space-y-1.5">
                {stages.map((s, idx) => {
                  const isActive = idx === currentStage;
                  const isDone = idx < currentStage;
                  return (
                    <li
                      key={idx}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 border text-[12px] leading-relaxed ${
                        isActive
                          ? "path-panel-stage-active"
                          : isDone
                            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-100/85"
                            : "bg-white/[0.03] border-white/8 text-white/65"
                      }`}
                    >
                      <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black ${
                        isActive
                          ? "bg-amber-500 text-black"
                          : isDone
                            ? "bg-emerald-500/30 text-emerald-200"
                            : "bg-white/8 text-white/60"
                      }`}>
                        {isDone ? "✓" : idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{s.title}</div>
                        {s.duration && (
                          <div className="text-[10px] mt-0.5 inline-block bg-purple-500/15 border border-purple-400/25 text-purple-200 rounded-full px-2 py-0.5">
                            ⏱ {s.duration}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ENV_BUILD_PHRASES = [
  { icon: "🧠", text: "نُحلّل مستواك ونصمّم بيئة تطبيقية تناسبك تماماً..." },
  { icon: "📐", text: "نرسم خطوات التعلم بترتيب ذكي يبني المهارة تدريجياً..." },
  { icon: "🛠️", text: "نُجهّز الأدوات والشاشات التي ستحتاجها أثناء التطبيق..." },
  { icon: "🎯", text: "نضع لك معايير نجاح واضحة لتقيس تقدّمك بنفسك..." },
  { icon: "📚", text: "نضيف تلميحات وموارد مساعدة في كل مهمة..." },
  { icon: "✨", text: "نُضيف اللمسات الأخيرة — بيئتك على وشك الجاهزية..." },
  { icon: "🧪", text: "نُولّد سيناريوهات تطبيقية حقيقية لتتدرّب عليها..." },
  { icon: "🪜", text: "نرتّب المهام من الأسهل إلى الأعمق لتتقدم بثقة..." },
];

function EnvBuildingOverlay() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % ENV_BUILD_PHRASES.length);
    }, 2600);
    const secTimer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(phraseTimer);
      clearInterval(secTimer);
    };
  }, []);

  const phrase = ENV_BUILD_PHRASES[phraseIdx];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ direction: "rtl" }}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-gold/20 rounded-3xl px-7 py-7 shadow-2xl max-w-md w-full pointer-events-auto">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
            <Loader2 className="w-8 h-8 animate-spin text-gold relative" />
          </div>
          <div className="text-right">
            <div className="text-white font-black text-lg leading-tight">جارٍ بناء بيئتك التطبيقية</div>
            <div className="text-[11px] text-gold/70">قد يستغرق الأمر من ٢٠ إلى ٤٥ ثانية — اللحظة تستحق الانتظار</div>
          </div>
        </div>

        <div
          key={phraseIdx}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 min-h-[68px] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <span className="text-2xl shrink-0">{phrase.icon}</span>
          <p className="text-white/90 text-sm font-medium leading-relaxed">{phrase.text}</p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>المعلم الذكي يعمل من أجلك</span>
          </div>
          <span className="font-mono tabular-nums">{seconds}s</span>
        </div>

        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold/40 via-gold to-gold/40 animate-pulse" style={{ width: `${Math.min(95, 15 + seconds * 2.5)}%`, transition: "width 0.8s ease-out" }} />
        </div>
      </div>
    </div>
  );
}

export default function Subject() {
  const { subjectId } = useParams();
  const subject = getSubjectById(subjectId || "");
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // If launched with `?sources=<materialId>` (e.g. from the dashboard's
  // chapter-progress card), open the chat and the Sources side panel
  // pre-selected to that PDF for quick review.
  const initialSourcesMaterialId = (() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("sources");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : -1; // -1 means "open panel only"
  })();
  const [isChatOpen, setIsChatOpen] = useState(initialSourcesMaterialId !== null);
  const [isIDEOpen, setIsIDEOpen] = useState(false);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [isYemenSoftOpen, setIsYemenSoftOpen] = useState(false);
  const isFoodSubject = subject?.id === "uni-food-eng";
  const isYemenSoftSubject = subject?.id === "skill-yemensoft";
  const isAccountingLabSubject = subject?.id === "uni-accounting";
  const [isAccountingLabOpen, setIsAccountingLabOpen] = useState(false);
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  // Attack Simulation — independent feature, only for cybersecurity/networking.
  const [isAttackSimOpen, setIsAttackSimOpen] = useState(false);
  const [pendingAttackScenario, setPendingAttackScenario] = useState<AttackScenario | null>(null);
  const [isAttackIntakeOpen, setIsAttackIntakeOpen] = useState(false);
  const [isBuildingAttack, setIsBuildingAttack] = useState(false);
  const [attackBuildError, setAttackBuildError] = useState<string | null>(null);
  // Mirrors the backend allowlist (artifacts/api-server/src/routes/ai.ts:isSecuritySubjectId).
  // Keep both in sync whenever a new security/networking subject id is introduced.
  const isSecuritySubject = (() => {
    const id = String(subject?.id || "").trim().toLowerCase();
    if (!id) return false;
    if (id === "uni-cybersecurity" || id === "skill-security" || id === "skill-networks") return true;
    return /^uni-cyber(security)?(-|$)/.test(id)
      || /^skill-(security|networks?|pentest|cyber(sec)?)(-|$)/.test(id);
  })();
  const [pendingFoodScenario, setPendingFoodScenario] = useState<any | null>(null);
  const [pendingAccountingScenario, setPendingAccountingScenario] = useState<any | null>(null);
  const [pendingYemenSoftScenario, setPendingYemenSoftScenario] = useState<any | null>(null);
  // The active interactive lab environment.
  // It is persisted per-user+subject so that closing or refreshing the page
  // does NOT lose the env — the user can come back to exactly where they were.
  const [pendingDynamicEnv, setPendingDynamicEnvState] = useState<any | null>(null);
  const [isDynamicEnvOpen, setIsDynamicEnvOpen] = useState(false);
  const dynamicEnvStorageSuffix = subject?.id ? `dynamic-env::${subject.id}` : null;
  // Wrap the setter so every change to the env is mirrored to per-user storage.
  const setPendingDynamicEnv = useCallback((env: any | null) => {
    setPendingDynamicEnvState(env);
    if (!user?.id || !dynamicEnvStorageSuffix) return;
    if (env) writeUserJson(user.id, dynamicEnvStorageSuffix, env);
    else removeUserKey(user.id, dynamicEnvStorageSuffix);
  }, [user?.id, dynamicEnvStorageSuffix]);
  // On mount / when user or subject changes, restore any saved env so a
  // page reload or accidental close still finds the previous lab.
  useEffect(() => {
    if (!user?.id || !dynamicEnvStorageSuffix) return;
    const saved = readUserJson<any | null>(user.id, dynamicEnvStorageSuffix, null);
    if (saved && typeof saved === "object") setPendingDynamicEnvState(saved);
  }, [user?.id, dynamicEnvStorageSuffix]);
  const [chatStarter, setChatStarter] = useState<string | null>(null);
  const [createEnvError, setCreateEnvError] = useState<string | null>(null);
  const [pendingLabStarter, setPendingLabStarter] = useState<string | null>(null);
  const { data: lessonViews } = useGetLessonViews();

  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [allSummaries, setAllSummaries] = useState<LessonSummary[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);

  const isSubscriptionExpired = !!(
    user?.nukhbaPlan &&
    user?.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) < new Date()
  );

  const loadSummaries = () => {
    if (!subject) return;
    fetch(`/api/lesson-summaries?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setSummaries(Array.isArray(data) ? data : []))
      .catch(() => setSummaries([]))
      .finally(() => setSummariesLoading(false));
  };

  const loadLabReports = () => {
    if (!subject) return;
    setLabReportsLoading(true);
    fetch(`/api/lab-reports?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setLabReports(Array.isArray(data) ? data : []))
      .catch(() => setLabReports([]))
      .finally(() => setLabReportsLoading(false));
  };

  useEffect(() => {
    if (subject) {
      loadSummaries();
      loadLabReports();
    }
  }, [subject?.id]);

  useEffect(() => {
    if (isSubscriptionExpired) {
      fetch('/api/lesson-summaries', { credentials: 'include' })
        .then(r => r.json())
        .then(data => setAllSummaries(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [isSubscriptionExpired]);

  // True whenever any interactive lab/panel is currently open. Used to
  // expand the chat dialog to fill the entire viewport (instead of the
  // default 860px-wide modal) and to trigger the mobile "use a desktop"
  // hint, so labs and simulators get the maximum possible canvas.
  const anyPanelOpen =
    isIDEOpen || isLabOpen || isYemenSoftOpen || isAccountingLabOpen ||
    isDynamicEnvOpen || isAttackSimOpen;

  const handleSessionComplete = () => {
    setIsChatOpen(false);
    setSummariesLoading(true);
    loadSummaries();
  };

  if (!subject) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">المادة غير موجودة</h1>
          <Button onClick={() => setLocation("/learn")}>العودة للتعلم</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-4xl">

        {/* Subject Header */}
        <div className="glass p-4 md:p-6 rounded-3xl border-white/5 mb-6 md:mb-8 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} opacity-10 rounded-bl-full`} />
          <div className="relative z-10">
            <div className="flex items-center gap-4 md:gap-5 mb-4">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center text-3xl md:text-4xl shadow-lg shrink-0`}>
                {subject.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-black">{subject.name}</h1>
                {lessonViews && lessonViews.length > 0 && (() => {
                  const subjectViews = lessonViews.filter(v => v.subjectId === subject.id);
                  const totalLessons = subject.units.reduce((s, u) => s + u.lessons.length, 0);
                  const completedIds = new Set(subjectViews.map(v => v.lessonId));
                  const completed = subject.units.reduce((s, u) => s + u.lessons.filter(l => completedIds.has(l.id)).length, 0);
                  if (completed === 0) return null;
                  const pct = Math.round((completed / totalLessons) * 100);
                  return (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-emerald to-emerald/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-emerald font-bold shrink-0">{pct}%</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Unit progress grid */}
            {lessonViews && subject.units.length > 0 && (() => {
              const subjectViews = lessonViews.filter(v => v.subjectId === subject.id);
              const completedIds = new Set(subjectViews.map(v => v.lessonId));
              const hasAnyProgress = subjectViews.length > 0;
              if (!hasAnyProgress) return null;
              return (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(subject.units.length, 4)}, 1fr)` }}>
                  {subject.units.map(unit => {
                    const done = unit.lessons.filter(l => completedIds.has(l.id)).length;
                    const total = unit.lessons.length;
                    const unitDone = done >= total;
                    return (
                      <div key={unit.id} className={`rounded-xl p-2.5 border ${unitDone ? "border-emerald/30 bg-emerald/5" : "border-white/5 bg-white/3"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground truncate">{unit.name}</span>
                          {unitDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald shrink-0" />}
                        </div>
                        <div className="flex gap-1">
                          {unit.lessons.map(l => (
                            <div
                              key={l.id}
                              className={`flex-1 h-1.5 rounded-full ${completedIds.has(l.id) ? "bg-emerald" : "bg-white/10"}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{done}/{total}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── جدار انتهاء الاشتراك ── */}
        {isSubscriptionExpired && (
          <SubscriptionExpiredWall
            subject={subject}
            allSummaries={allSummaries}
            onRenew={() => setLocation("/subscription")}
          />
        )}

        {/* ── الأسئلة التوجيهية الأولية ── Gold session intro card (RESTORED) */}
        {!isSubscriptionExpired && (
        <div className="glass-gold p-5 md:p-8 rounded-3xl border-gold/20 mb-8 md:mb-10 shadow-lg shadow-gold/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-3xl -z-10" />
          <div className="flex items-start gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl gradient-gold flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-2">جلستك التعليمية المخصصة</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                يرافقك معلمك الذكي خطوة بخطوة، يشرح المفهوم أولاً بمثال واقعي، ثم يطرح عليك سؤالاً توجيهياً للتثبيت قبل الانتقال للمرحلة التالية.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setIsChatOpen(true)}
                  variant="outline"
                  className="border-gold/30 text-gold hover:bg-gold/10 h-10 rounded-xl px-5 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  جلسة جديدة
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ── تقارير المختبرات السابقة ── */}
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
            <div className="w-2 h-7 bg-emerald rounded-full" />
            تقارير المختبرات السابقة
          </h3>

          {labReportsLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : labReports.length === 0 ? (
            <div className="glass border border-white/5 rounded-2xl p-8 text-center text-muted-foreground">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد تقارير مختبر بعد</p>
              <p className="text-sm mt-1 opacity-70">عند إرسال تقرير من البيئة التطبيقية لهذه المادة سيظهر هنا للمراجعة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {labReports.map(r => (
                <SubjectLabReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* ── ملخصات الجلسات السابقة ── */}
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-3">
            <div className="w-2 h-7 bg-gold rounded-full" />
            ملخصات جلساتك السابقة
          </h3>

          {summariesLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              جاري التحميل...
            </div>
          ) : summaries.length === 0 ? (
            <div className="glass border border-white/5 rounded-2xl p-8 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد ملخصات بعد</p>
              <p className="text-sm mt-1 opacity-70">بعد إكمال أول جلسة سيظهر ملخصها هنا تلقائياً للمراجعة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(s => (
                <SubjectSummaryCard key={s.id} summary={s} />
              ))}
            </div>
          )}
        </div>

        {/* Chat Overlay — always mounted, toggled via CSS so all state (messages, IDE, lab) persists when closed */}
        <div
          aria-hidden={!isChatOpen}
          style={{ display: isChatOpen ? "flex" : "none" }}
          className="fixed inset-0 z-50 items-center justify-center bg-black/80"
          onClick={(e) => { if (e.target === e.currentTarget) setIsChatOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`
              max-sm:!w-full max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!rounded-none max-sm:!border-0
              ${anyPanelOpen
                ? "sm:!max-w-none sm:!w-[100vw] sm:!h-[100dvh] sm:!rounded-none sm:!border-0"
                : "sm:max-w-[860px] sm:h-[90vh] sm:rounded-3xl"}
              w-full p-0 flex flex-col gap-0 overflow-hidden border shadow-lg
              bg-[#080a11] border-white/8
            `}
          >

            {/* Header */}
            <div className="shrink-0 border-b border-white/8" style={{ background: "linear-gradient(180deg, #0f1220 0%, #080a11 100%)" }}>
              {/* Top bar */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isIDEOpen ? (
                    <>
                      <button
                        onClick={() => setIsIDEOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-[#1e1e2e] border border-white/10 flex items-center justify-center">
                        <Code2 className="w-4 h-4 text-gold" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">بيئة التطبيق</p>
                        <p className="text-[11px] text-muted-foreground">اكتب وشغّل كودك</p>
                      </div>
                    </>
                  ) : isLabOpen ? (
                    <>
                      <button
                        onClick={() => setIsLabOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-lime-500/20 border border-lime-500/30 flex items-center justify-center">
                        <span className="text-sm">🔬</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">المختبر الغذائي</p>
                        <p className="text-[11px] text-muted-foreground">حاسبات ورسوم ومخطط HACCP</p>
                      </div>
                    </>
                  ) : isYemenSoftOpen ? (
                    <>
                      <button
                        onClick={() => setIsYemenSoftOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                        <span className="text-sm">🏢</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">البيئة التطبيقية</p>
                        <p className="text-[11px] text-muted-foreground">محاكاة يمن سوفت المحاسبية</p>
                      </div>
                    </>
                  ) : isAccountingLabOpen ? (
                    <>
                      <button
                        onClick={() => setIsAccountingLabOpen(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                        <span className="text-sm">🎓</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">مختبر المحاسبة</p>
                        <p className="text-[11px] text-muted-foreground">12 أداة أكاديمية تفاعلية</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center shadow-lg shrink-0`}>
                        <span className="text-lg">{subject.emoji}</span>
                      </div>
                      <div>
                        <p className="font-bold text-base leading-tight">معلم {subject.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <p className="text-[11px] text-emerald-400 font-medium">متصل الآن</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {subject.hasCoding && !isIDEOpen && !isLabOpen && !isYemenSoftOpen && !isAccountingLabOpen && (
                    <button
                      onClick={() => setIsIDEOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-gold/10 border border-gold/25 text-gold hover:bg-gold/20 transition-all"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">IDE</span>
                    </button>
                  )}
                  {/* Legacy per-subject "بيئة عملية مخصصة" header buttons
                      were removed. The single universal floating "🧪 ابنِ
                      بيئة تطبيقية" button now serves every subject and
                      flows through the same teacher-orchestrated dialog. */}
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <MobileDesktopHint show={anyPanelOpen} />

            <SubjectPathChat
              subject={subject}
              isFirstSession={!summariesLoading && summaries.length === 0}
              onAccessDenied={() => {
                setIsChatOpen(false);
                setLocation(`/subscription?subject=${encodeURIComponent(subject.id)}&subjectName=${encodeURIComponent(subject.name)}`);
              }}
              onSessionComplete={handleSessionComplete}
              ideOpen={isIDEOpen}
              onCloseIDE={() => setIsIDEOpen(false)}
              labOpen={isLabOpen}
              onCloseLab={() => setIsLabOpen(false)}
              yemenSoftOpen={isYemenSoftOpen}
              onCloseYemenSoft={() => setIsYemenSoftOpen(false)}
              accountingLabOpen={isAccountingLabOpen}
              onCloseAccountingLab={() => setIsAccountingLabOpen(false)}
              pendingFoodScenario={pendingFoodScenario}
              onClearPendingFoodScenario={() => setPendingFoodScenario(null)}
              pendingAccountingScenario={pendingAccountingScenario}
              onClearPendingAccountingScenario={() => setPendingAccountingScenario(null)}
              pendingYemenSoftScenario={pendingYemenSoftScenario}
              onClearPendingYemenSoftScenario={() => setPendingYemenSoftScenario(null)}
              pendingDynamicEnv={pendingDynamicEnv}
              // Permanently destroys the env (used by an explicit "delete" — currently unused)
              onClearPendingDynamicEnv={() => { setPendingDynamicEnv(null); setIsDynamicEnvOpen(false); }}
              // Phase 3 — variant generator hot-swap. Re-uses the existing
              // setter so the env stays open and the user lands on the new
              // version immediately.
              onLoadVariantEnv={(variantEnv) => { setPendingDynamicEnv(variantEnv); }}
              dynamicEnvOpen={isDynamicEnvOpen}
              // Closing only HIDES the env so the user can come back to it.
              onCloseDynamicEnv={() => setIsDynamicEnvOpen(false)}
              // Reopen previously-built env from the floating button.
              onReopenDynamicEnv={() => setIsDynamicEnvOpen(true)}
              chatStarter={chatStarter}
              onConsumeChatStarter={() => setChatStarter(null)}
              initialSourcesMaterialId={initialSourcesMaterialId}
              onCreateLabEnv={async (description: string) => {
                console.log("[create-lab-env] click; isCreatingEnv=", isCreatingEnv, "description=", description);
                if (isCreatingEnv) return;
                setCreateEnvError(null);
                setIsCreatingEnv(true);
                try {
                  // Universal AI-built dynamic env — works for ANY subject.
                  const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/build-env`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ subjectId: subject!.id, description }),
                  });
                  console.log("[create-lab-env] dynamic response:", r.status);
                  if (!r.ok) {
                    const errText = await r.text().catch(() => "");
                    throw new Error(`فشل بناء البيئة (${r.status}): ${errText.slice(0, 200)}`);
                  }
                  const data = await r.json();
                  console.log("[create-lab-env] dynamic data:", data);
                  if (data.env) {
                    setPendingDynamicEnv(data.env);
                    setIsDynamicEnvOpen(true);
                    setIsLabOpen(false);
                    setIsYemenSoftOpen(false);
                    setIsAccountingLabOpen(false);
                  } else {
                    throw new Error("الاستجابة لا تحتوي على بيئة صالحة");
                  }
                } catch (e: any) {
                  console.error("[create-lab-env] failed:", e);
                  setCreateEnvError(e?.message || "حدث خطأ غير متوقع أثناء بناء البيئة");
                } finally {
                  setIsCreatingEnv(false);
                }
              }}
              isCreatingEnv={isCreatingEnv}
              onStartLabEnvIntent={() => setPendingLabStarter("أريد بناء بيئة تطبيقية تفاعلية مخصصة لي في هذه المادة. اطرح عليّ ٢-٤ أسئلة متعددة الخيارات (مع خيار «غير ذلك») لتحديد ما أريد التدرب عليه ومستواي الحالي، ثم ابنِ البيئة المناسبة.")}
              attackSimEnabled={isSecuritySubject}
              attackSimOpen={isAttackSimOpen}
              pendingAttackScenario={pendingAttackScenario}
              onOpenAttackIntake={() => { setAttackBuildError(null); setIsAttackIntakeOpen(true); }}
              onReopenAttackSim={() => setIsAttackSimOpen(true)}
              onCloseAttackSim={() => setIsAttackSimOpen(false)}
            />
          </div>
        </div>

        {/* Loading overlay while building env */}
        {isCreatingEnv && <EnvBuildingOverlay />}

        {/* Attack Simulation intake dialog (security/networking subjects) */}
        <AttackIntakeDialog
          open={isAttackIntakeOpen}
          busy={isBuildingAttack}
          error={attackBuildError}
          onCancel={() => { if (!isBuildingAttack) setIsAttackIntakeOpen(false); }}
          onBuild={async ({ description, difficulty, category }) => {
            if (isBuildingAttack) return;
            setAttackBuildError(null);
            setIsBuildingAttack(true);
            try {
              const r = await fetch(`${import.meta.env.BASE_URL}api/ai/attack-sim/build`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ subjectId: subject?.id, description, difficulty, category }),
              });
              if (!r.ok) {
                const t = await r.text().catch(() => "");
                throw new Error(`فشل بناء السيناريو (${r.status}): ${t.slice(0, 200)}`);
              }
              const data = await r.json();
              if (!data?.scenario) throw new Error("الاستجابة لا تحتوي على سيناريو صالح");
              setPendingAttackScenario(data.scenario as AttackScenario);
              setIsAttackSimOpen(true);
              setIsAttackIntakeOpen(false);
              // Close other panels so the simulation gets focus.
              setIsLabOpen(false);
              setIsYemenSoftOpen(false);
              setIsAccountingLabOpen(false);
              setIsDynamicEnvOpen(false);
            } catch (e: any) {
              setAttackBuildError(e?.message || "حدث خطأ غير متوقع");
            } finally {
              setIsBuildingAttack(false);
            }
          }}
        />

        {/* Recommendation modal before opening custom-env chat starter */}
        {pendingLabStarter && (
          <div
            className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPendingLabStarter(null)}
          >
            <div
              className="bg-slate-900 border border-gold/30 rounded-2xl shadow-2xl max-w-md w-full p-6"
              style={{ direction: "rtl" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-xl shrink-0">💡</div>
                <div className="flex-1">
                  <h3 className="text-white font-extrabold text-lg mb-1">قبل أن تبدأ بناء بيئتك بنفسك</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    يُفضّل أن تتبع المعلم الذكي في مسارك التعليمي — فهو سيُنشئ لك البيئة التطبيقية تلقائياً وفق المفاهيم التي تتعلمها في كل مرحلة، فيكون التطبيق العملي مرتبطاً مباشرة بما درسته.
                  </p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-xs text-muted-foreground leading-relaxed">
                إن أصرّيت على فتح بيئة مخصّصة الآن، سيطرح عليك المعلم سؤالاً متعدد الخيارات لتحديد ما تريد التدرّب عليه، ثم يبني لك البيئة من الصفر.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingLabStarter(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gold text-slate-900 font-bold hover:bg-gold/90 transition-colors text-sm"
                >
                  حسناً، سأتابع مع المعلم
                </button>
                <button
                  onClick={() => {
                    setChatStarter(pendingLabStarter);
                    setPendingLabStarter(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-sm"
                >
                  أريدها الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error toast */}
        {createEnvError && !isCreatingEnv && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[92%]">
            <div className="bg-red-950/95 border border-red-500/40 rounded-xl px-4 py-3 shadow-xl flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div className="flex-1 text-sm text-red-100" style={{ direction: "rtl" }}>
                {createEnvError}
              </div>
              <button
                onClick={() => setCreateEnvError(null)}
                className="text-red-300 hover:text-white text-lg leading-none shrink-0"
              >×</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}


function Countdown({ until, onExpired }: { until: string; onExpired?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, new Date(until).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) onExpired?.();
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center justify-center gap-2 md:gap-3" dir="ltr">
      {[{ v: hours, l: "ساعة" }, { v: minutes, l: "دقيقة" }, { v: seconds, l: "ثانية" }].map((item, i, arr) => (
        <div key={item.l} className="flex items-center gap-2 md:gap-3">
          <div className="bg-black/40 border border-gold/20 rounded-xl md:rounded-2xl px-3 py-2 md:px-5 md:py-3 text-center min-w-[52px] md:min-w-[72px]">
            <div className="text-2xl md:text-4xl font-black text-gold font-mono">{String(item.v).padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.l}</div>
          </div>
          {i < arr.length - 1 && <span className="text-xl md:text-2xl font-bold text-gold/50">:</span>}
        </div>
      ))}
    </div>
  );
}

function stripInlineStyles(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\sbackground(?:-color)?\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\scolor\s*=\s*["'][^"']*["']/gi, '');
}

// Configure marked once: GitHub-flavored markdown + treat single line breaks
// as <br/>, which matches how the model thinks about Arabic prose.
marked.setOptions({ gfm: true, breaks: true });

// The teaching model is *supposed* to emit HTML, but in practice it routinely
// mixes raw markdown (`---`, `**bold**`, `1.` lists, blank-line paragraphs)
// into its output — and the chat used to render that markdown as a single
// unformatted wall of text. This helper converts any markdown the model
// emits into HTML while leaving real HTML tags it already produced intact,
// then sanitizes the result so we can safely drop it into the bubble via
// dangerouslySetInnerHTML.
//
// Key behaviors:
//   • `---` on its own line becomes `<hr/>` (the model uses these as visual
//     separators between sections).
//   • Blank lines become paragraph breaks.
//   • Single newlines become `<br/>` (gfm `breaks: true`).
//   • Existing inline HTML the model produced (e.g. `<div class="tip-box">…`)
//     is preserved verbatim.
//   • DOMPurify strips `<script>`, event handlers, etc. — but we keep the
//     `data-build-env` attribute on buttons because that's how the lab-env
//     trigger wires itself up in the click handler below.
// The teaching model is *supposed* to emit HTML directly, but it sometimes
// wraps its entire response in a ```html … ``` markdown fence (treating its
// own HTML as a code sample). When that happens, marked renders it as a
// `<pre><code>` block and the user sees raw `<div class="praise">` etc.
// instead of formatted output. This helper unwraps any html/HTML code
// fences in-place so the inner HTML reaches the sanitizer as real markup.
// Code fences with other languages (```js, ```python, ```bash, …) are left
// alone because the model legitimately uses them to teach code.
function unwrapHtmlCodeFences(raw: string): string {
  // Step 1: unwrap explicit ```html / ```HTML / ```Html fences
  let result = raw.replace(
    /```(?:html|HTML|Html)\s*\r?\n?([\s\S]*?)```/g,
    (_m, inner) => inner,
  );
  // Step 2: unwrap bare ``` fences whose content clearly starts with an HTML
  // tag (e.g. Gemini wraps <div>…</div> in ``` without the language hint).
  // We only unwrap when the first non-whitespace character after the opening
  // fence is '<', so we don't accidentally unwrap actual code blocks.
  result = result.replace(
    /```\s*\r?\n?(<[\s\S]*?)```/g,
    (_m, inner) => inner,
  );
  return result;
}

// Strip code spans that contain raw HTML button markup (e.g. `<class='build-env-btn'...>`)
// which occur when the AI model incorrectly writes button HTML as inline code instead of
// using the [[CREATE_LAB_ENV:...]] tag. These spans are not actionable and confuse users.
function stripBrokenButtonCodeSpans(html: string): string {
  return html.replace(
    /<code[^>]*>[^<]*(?:build-env-btn|type=['"]button['"]|<class=|<button\s)[^<]*<\/code>/gi,
    '',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL DEFENSE — Lab-env button normalizer.
//
// Gemini sometimes ignores the `[[CREATE_LAB_ENV: ...]]` tag instruction and
// instead echoes the literal `<button data-build-env="...">` HTML it saw in
// the prompt example. The user then sees raw HTML in a code block (or a
// half-broken truncated button). This normalizer converts EVERY observed
// failure mode back into the canonical `[[CREATE_LAB_ENV: ...]]` tag, so
// the existing `expandLabEnvTags` pipeline renders a real, clickable button
// regardless of what the model emitted.
//
// Failure modes handled:
//   1. Well-formed:   `<button data-build-env="X" class="build-env-btn">L</button>`
//   2. Truncated:     `<button data-build-env="X" class` (no `=`/`>`/`</button>`)
//   3. HTML-escaped:  `&lt;button data-build-env=&quot;X&quot;...&gt;`
//   4. Code-fenced:   surrounded by ``` or ` (single/triple backticks)
//   5. Bare attr:     `data-build-env="X"` floating in text (last-resort)
//
// Description length is clamped (4..600) to avoid runaway captures, and we
// de-duplicate so the same env isn't emitted twice in one message.
function normalizeLabEnvButtons(raw: string): string {
  if (!raw) return raw;

  const seen = new Set<string>();
  const toTag = (descRaw: string): string => {
    const desc = String(descRaw || "")
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    if (!desc || desc.length < 4 || desc.length > 4000) return "";
    const key = desc.slice(0, 80);
    if (seen.has(key)) return "";
    seen.add(key);
    return `\n\n[[CREATE_LAB_ENV: ${desc}]]\n\n`;
  };

  let result = raw;

  // (A) Fully HTML-entity-escaped form (model double-encoded its own output).
  result = result.replace(
    /`{0,3}\s*&lt;button[^&]*?data-build-env\s*=\s*&quot;([\s\S]*?)&quot;[\s\S]*?(?:&lt;\/button&gt;|(?=`{0,3}\s*(?:\n|$)))\s*`{0,3}/gi,
    (_m, desc) => toTag(desc),
  );

  // (B) Real-character, fully closed: `<button ...>label</button>`.
  result = result.replace(
    /`{0,3}\s*<button[^>]*?data-build-env\s*=\s*["']([\s\S]*?)["'][^>]*>[\s\S]*?<\/button>\s*`{0,3}/gi,
    (_m, desc) => toTag(desc),
  );

  // (C) Real-character, truncated / no closing `</button>` (cut by stream end
  // or model running out of tokens). Capture stops at the first matching
  // closing quote so the description is bounded.
  result = result.replace(
    /`{0,3}\s*<button[^>]*?data-build-env\s*=\s*["']([^"']{4,4000})["'][^<>]*?(?:>[\s\S]*?(?:<\/button>)?|class\b[^<>\n`]*|(?=\n\n|$|`{3}))\s*`{0,3}/gi,
    (_m, desc) => toTag(desc),
  );

  // (D) Bare floating attribute (last resort, only when not already inside a
  // <button or &lt;button context — those were handled above).
  result = result.replace(
    /(?<!button[^>]{0,400})(?<!&lt;button[^&]{0,400})data-build-env\s*=\s*["']([^"']{4,4000})["']/gi,
    (_m, desc) => toTag(desc),
  );

  return result;
}

// Replaces inline `[[IMAGE:hex]]` markers (12-char hex IDs from the backend
// streaming detector) with placeholder <figure> markup. The figure carries
// `data-image-id` so an effect in AIMessage can swap in the real <img> when
// the matching SSE `imageReady` event resolves the URL.
function renderImageMarkers(raw: string): string {
  return raw.replace(/\[\[IMAGE:([a-f0-9]{6,16})\]\]/gi, (_m, id) =>
    `\n\n<figure class="teach-image teach-image-loading" data-image-id="${id}"><div class="teach-image-spinner"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="label">جارٍ توليد الصورة التوضيحية…</span></div></figure>\n\n`,
  );
}

function renderAssistantHtml(raw: string): string {
  if (!raw) return "";
  // NOTE: `normalizeLabEnvButtons` must be called by the CALLER, BEFORE
  // `expandLabEnvTags` runs — otherwise it would also match the proper
  // <button> markup that expandLabEnvTags just produced and undo it.
  // marked is synchronous when no async extensions are registered, but the
  // type signature is `string | Promise<string>` — `as string` is safe here.
  const withImages = renderImageMarkers(raw);
  const html = marked.parse(stripInlineStyles(unwrapHtmlCodeFences(withImages))) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-build-env', 'target', 'data-image-id', 'loading'],
    ADD_TAGS: ['button', 'figure', 'figcaption'],
  });
  return stripBrokenButtonCodeSpans(sanitized);
}

// Streaming variant: same conversion, but we must tolerate half-finished
// HTML/markdown tokens arriving mid-flight. We render whatever we have so
// far through marked (it's forgiving), and skip the lab-env tag expansion
// since the user can't click those until the stream completes anyway.
function renderStreamingHtml(raw: string): string {
  if (!raw) return "";
  // (1) Normalize any complete broken button HTML the model already emitted
  // into the canonical tag, then (2) strip an in-progress button that hasn't
  // finished streaming yet so the user never sees its raw HTML mid-flight,
  // then (3) strip the canonical tags themselves (the button is rendered
  // only on the final non-streaming render).
  const normalized = normalizeLabEnvButtons(raw)
    .replace(/<button[^>]*data-build-env[\s\S]*?(?:<\/button>|$)/gi, '')
    .replace(/&lt;button[^&]*?data-build-env[\s\S]*?(?:&lt;\/button&gt;|$)/gi, '')
    .replace(/\[\[CREATE_LAB_ENV:[^\]]*\]\]/g, '')
    .replace(/\[\[ASK_OPTIONS:[^\]]*\]\]/g, '');
  // IMAGE markers are kept and converted to placeholder <figure> elements
  // mid-stream; the AIMessage effect swaps in the real <img> when the
  // imageReady SSE event resolves. Renders BEFORE marked so the raw HTML
  // block survives markdown parsing intact.
  const withImages = renderImageMarkers(normalized);
  const cleaned = unwrapHtmlCodeFences(withImages);
  const html = marked.parse(stripInlineStyles(cleaned)) as string;
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-build-env', 'target', 'data-image-id', 'loading'],
    ADD_TAGS: ['button', 'figure', 'figcaption'],
  });
}


// Transforms [[CREATE_LAB_ENV: description]] tags into clickable buttons
function expandLabEnvTags(html: string): string {
  return html.replace(/\[\[CREATE_LAB_ENV:\s*([^\]]+?)\]\]/g, (_m, desc) => {
    const safe = desc.trim().replace(/"/g, '&quot;');
    return `<button data-build-env="${safe}" class="build-env-btn" type="button">⚡ ابنِ هذه البيئة التطبيقية لي الآن</button>`;
  });
}

// Decode HTML entities (&lt; &gt; &amp; &quot; &#39; &nbsp; ...) so that
// teacher-emitted examples like `&lt;p&gt;` render as `<p>` in plain text
// nodes (e.g. ASK_OPTIONS button labels). The teacher is REQUIRED to escape
// HTML tag examples in its raw output (otherwise dangerouslySetInnerHTML in
// the message body would render them as real elements instead of text); we
// must therefore decode them back when surfacing those same strings as
// React text nodes that don't go through the browser's HTML parser.
// Runs decoding twice to handle the rare double-escaped case (e.g. when
// the model writes `&amp;lt;p&amp;gt;`).
function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  if (typeof document === "undefined") {
    // SSR fallback — handle the common entities only.
    return s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  let out = ta.value;
  if (out.includes("&") && /&(?:lt|gt|amp|quot|#\d+|#x[0-9a-f]+);/i.test(out)) {
    ta.innerHTML = out;
    out = ta.value;
  }
  return out;
}

// Extracts [[ASK_OPTIONS: question ||| opt1 ||| opt2 ||| غير ذلك]] from content
// Uses ||| as delimiter so question/options can safely contain a single |
// Uses [\s\S]+? (non-greedy any-char) so single `]` inside the question or
// options (e.g. programming examples like `arr[0]`) doesn't break the parser —
// the `]]` closing fence is what terminates the match.
function extractAskOptions(content: string): { stripped: string; ask: { question: string; options: string[]; allowOther: boolean } | null } {
  const m = content.match(/\[\[ASK_OPTIONS:\s*([\s\S]+?)\]\]/);
  if (!m) return { stripped: content, ask: null };
  // Prefer ||| delimiter; fall back to single | only if ||| not present
  const raw = m[1];
  const parts = (raw.includes("|||") ? raw.split("|||") : raw.split("|"))
    .map((s) => s.trim())
    .filter(Boolean);
  // After stripping the tag, also collapse any wrapper tags it left empty
  // (e.g. the model put it inside its own <p>...</p> or <div>...</div>).
  const cleanStripped = (raw0: string) =>
    raw0
      .replace(m[0], "")
      .replace(/<(p|div|span)[^>]*>\s*<\/\1>/gi, "")
      .replace(/(\s*<br\s*\/?>\s*){2,}/gi, "<br/>")
      .trim();
  if (parts.length < 2) return { stripped: cleanStripped(content), ask: null };
  const [questionRaw, ...rawOpts] = parts;
  const allowOther = rawOpts.some((o) => /غير\s*ذلك/i.test(o) || /^other$/i.test(o));
  // Decode HTML entities in question + each option so labels containing
  // tag examples (e.g. `وسم <p> (فقرة عادية)`) render readable text instead
  // of raw `&lt;p&gt;` escape sequences in the buttons.
  const question = decodeHtmlEntities(questionRaw);
  const options = rawOpts
    .filter((o) => !(/غير\s*ذلك/i.test(o) || /^other$/i.test(o)))
    .map(decodeHtmlEntities);
  return { stripped: cleanStripped(content), ask: { question, options, allowOther } };
}

// In-flight teacher-image state shared with AIMessage. `loading` shows the
// spinner placeholder; `ready` swaps in <img>; `error` shows a friendly
// retry hint. URLs from fal.ai are short-lived (≈1h CDN cache) so we don't
// persist this map — once the page reloads the historical message will
// have the `<p class="image-historical">` stub the backend wrote on save.
type TeacherImageState = { status: 'loading' | 'ready' | 'error'; url?: string };
type TeacherImageMap = Map<string, TeacherImageState>;

const AIMessage = memo(function AIMessage({ content, isStreaming, onCreateLabEnv, onAnswerOption, imageMap }: { content: string; isStreaming: boolean; onCreateLabEnv?: (desc: string) => void; onAnswerOption?: (answer: string) => void; imageMap?: TeacherImageMap }) {
  const safeRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { stripped, ask } = !isStreaming ? extractAskOptions(content) : { stripped: content, ask: null };

  if (!isStreaming) {
    // Run the lab-env tag expansion *first* (it inserts a real <button> with
    // a `data-build-env` attribute the click handler below relies on), then
    // pass the result through marked + DOMPurify so any markdown the model
    // emitted (`---`, `**bold**`, lists, blank-line paragraphs) renders as
    // proper HTML instead of a wall of unformatted text.
    // Order matters: normalize broken Gemini button-HTML emissions FIRST
    // (converts them to canonical [[CREATE_LAB_ENV: ...]] tags), THEN expand
    // ALL such tags into real <button> markup, THEN run marked + sanitize.
    safeRef.current = renderAssistantHtml(expandLabEnvTags(normalizeLabEnvButtons(stripped)));
  }
  // While streaming we route the partial content through the same
  // markdown→HTML pipeline so the formatting builds up live as the model
  // types (instead of the previous behavior of stripping every tag and
  // collapsing all whitespace into a single paragraph until completion).
  const displayHtml = isStreaming
    ? renderStreamingHtml(content)
    : safeRef.current;

  useEffect(() => {
    if (!containerRef.current || !onCreateLabEnv) return;
    const root = containerRef.current;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-build-env]') as HTMLElement | null;
      if (btn) {
        e.preventDefault();
        const desc = (btn.getAttribute('data-build-env') || '').trim();
        // Sanity-check the payload before triggering env creation. The
        // teacher prompt requires a ≥200-char description with 5 structured
        // sections (context, initial data, screens, success criteria,
        // common misconceptions), which routinely produces 300-1500 char
        // descriptions. The previous 500-char cap silently swallowed the
        // majority of clicks → "nothing happens" UX disaster. We now allow
        // up to 4000 chars (matches the server's tolerance) and on the
        // (very rare) malformed cases give the user an explicit, visible
        // signal instead of failing in silence.
        console.log("[lab-env-btn] click; desc length=", desc.length, "preview=", desc.slice(0, 80));
        if (!desc || desc.length < 4) {
          console.warn("[lab-env-btn] rejected: empty or too short");
          alert("تعذّر فتح هذه البيئة — وصفها مفقود. اطلب من المعلم بناء بيئة جديدة.");
          return;
        }
        if (desc.length > 4000) {
          console.warn("[lab-env-btn] rejected: too long (", desc.length, ")");
          alert("وصف البيئة طويل جداً. اطلب من المعلم اختصاره.");
          return;
        }
        onCreateLabEnv(desc);
      }
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, [displayHtml, onCreateLabEnv]);

  // ── Teacher-image figure updater ──────────────────────────────────────────
  // dangerouslySetInnerHTML rebuilds the figure markup on every chunk during
  // streaming, blowing away any <img> we previously injected. So we re-walk
  // the DOM after every render and reconcile each figure's contents with
  // the latest `imageMap` state. Cheap (≤2 figures per message in practice).
  useEffect(() => {
    if (!containerRef.current || !imageMap || imageMap.size === 0) return;
    const root = containerRef.current;
    const figures = root.querySelectorAll<HTMLElement>('figure[data-image-id]');
    figures.forEach((fig) => {
      const id = fig.getAttribute('data-image-id') || '';
      const state = imageMap.get(id);
      if (!state) return;
      if (state.status === 'ready' && state.url) {
        // Skip if the same URL is already rendered (avoids a flicker on
        // every chunk during streaming).
        const existing = fig.querySelector('img') as HTMLImageElement | null;
        if (existing && existing.src === state.url) return;
        fig.classList.remove('teach-image-loading');
        fig.classList.add('teach-image-ready');
        // Use textContent reset + appendChild instead of innerHTML to keep
        // attribute escaping consistent with the rest of the React tree.
        fig.innerHTML = '';
        const img = document.createElement('img');
        img.src = state.url;
        img.alt = 'صورة توضيحية';
        img.loading = 'lazy';
        fig.appendChild(img);
      } else if (state.status === 'error') {
        if (fig.classList.contains('teach-image-error')) return;
        fig.classList.remove('teach-image-loading');
        fig.classList.add('teach-image-error');
        fig.innerHTML = '<div class="teach-image-fail">⚠️ تعذّر توليد الصورة — أكمل القراءة.</div>';
      }
    });
  }, [displayHtml, imageMap]);

  // ── Teacher-image click-to-zoom (lightbox) ────────────────────────────────
  // Delegated click handler on the message container. Opens any ready
  // teacher illustration in a full-screen modal so students on small phones
  // can read the small numbered circles / overlapping elements.
  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const fig = target.closest('figure.teach-image-ready') as HTMLElement | null;
      if (!fig) return;
      const img = fig.querySelector('img') as HTMLImageElement | null;
      if (!img || !img.src) return;
      e.preventDefault();
      setLightboxUrl(img.src);
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, []);

  // While the lightbox is open: close on Escape (desktop convenience), lock
  // body scroll so mobile browsers don't scroll the chat behind the modal,
  // and move focus to the close button (restoring it to the previously
  // focused element on dismissal). Touch users tap the backdrop or × to
  // close — both wired up in the JSX below.
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Defer focus until after the close button is mounted.
    const focusTimer = window.setTimeout(() => {
      lightboxCloseRef.current?.focus();
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      previouslyFocused?.focus?.();
    };
  }, [lightboxUrl]);

  return (
    <div className="relative rounded-2xl rounded-tr-none min-w-0 max-w-[92%] sm:max-w-[92%] max-sm:max-w-[calc(100vw-60px)] shadow-md"
      style={{ background: "linear-gradient(135deg, #131726 0%, #0f1220 100%)", borderLeft: "2px solid rgba(245,158,11,0.35)", overflow: "hidden" }}>
      <div className="px-3 sm:px-4 py-3 sm:py-3.5 overflow-x-hidden">
        <div ref={containerRef} className="ai-msg overflow-x-hidden" dangerouslySetInnerHTML={{ __html: displayHtml }} />
        {ask && onAnswerOption && (
          <OptionsQuestion
            question={ask.question}
            options={ask.options}
            allowOther={ask.allowOther}
            onAnswer={onAnswerOption}
          />
        )}
        {isStreaming && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
            <span className="w-2 h-2 bg-gold/50 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
          </div>
        )}
      </div>
      {lightboxUrl && (
        <div
          className="teach-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة بحجم كامل"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            ref={lightboxCloseRef}
            type="button"
            className="teach-image-lightbox-close"
            aria-label="إغلاق"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
          >
            ×
          </button>
          <img
            src={lightboxUrl}
            alt="صورة توضيحية مكبّرة"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
});

function SubjectPathChat({ 
  subject,
  isFirstSession,
  onAccessDenied,
  onSessionComplete,
  ideOpen,
  onCloseIDE,
  labOpen,
  onCloseLab,
  yemenSoftOpen,
  onCloseYemenSoft,
  accountingLabOpen,
  onCloseAccountingLab,
  pendingFoodScenario,
  onClearPendingFoodScenario,
  pendingAccountingScenario,
  onClearPendingAccountingScenario,
  pendingYemenSoftScenario,
  onClearPendingYemenSoftScenario,
  pendingDynamicEnv,
  onClearPendingDynamicEnv,
  onLoadVariantEnv,
  dynamicEnvOpen,
  onCloseDynamicEnv,
  onReopenDynamicEnv,
  chatStarter,
  onConsumeChatStarter,
  initialSourcesMaterialId,
  onCreateLabEnv,
  isCreatingEnv,
  onStartLabEnvIntent,
  attackSimEnabled,
  attackSimOpen,
  pendingAttackScenario,
  onOpenAttackIntake,
  onReopenAttackSim,
  onCloseAttackSim,
}: {
  subject: any;
  isFirstSession?: boolean;
  onAccessDenied: () => void;
  onSessionComplete?: () => void;
  ideOpen?: boolean;
  onCloseIDE?: () => void;
  labOpen?: boolean;
  onCloseLab?: () => void;
  yemenSoftOpen?: boolean;
  onCloseYemenSoft?: () => void;
  accountingLabOpen?: boolean;
  onCloseAccountingLab?: () => void;
  pendingFoodScenario?: any | null;
  onClearPendingFoodScenario?: () => void;
  pendingAccountingScenario?: any | null;
  onClearPendingAccountingScenario?: () => void;
  pendingYemenSoftScenario?: any | null;
  onClearPendingYemenSoftScenario?: () => void;
  pendingDynamicEnv?: any | null;
  onClearPendingDynamicEnv?: () => void;
  /** Phase 3 — hot-swap the active env with a freshly-generated variant. */
  onLoadVariantEnv?: (env: any) => void;
  dynamicEnvOpen?: boolean;
  onCloseDynamicEnv?: () => void;
  onReopenDynamicEnv?: () => void;
  chatStarter?: string | null;
  onConsumeChatStarter?: () => void;
  initialSourcesMaterialId?: number | null;
  onCreateLabEnv?: (description: string) => void;
  isCreatingEnv?: boolean;
  onStartLabEnvIntent?: () => void;
  attackSimEnabled?: boolean;
  attackSimOpen?: boolean;
  pendingAttackScenario?: AttackScenario | null;
  onOpenAttackIntake?: () => void;
  onReopenAttackSim?: () => void;
  onCloseAttackSim?: () => void;
}) {
  const { user } = useAuth();
  // SECURITY: scope chat history by user.id so accounts on the same browser
  // never see each other's messages. If user is not yet loaded, we start
  // empty and only persist once we have a verified user.
  const CHAT_STORAGE_KEY = user?.id ? `nukhba::u:${user.id}::chat::${subject.id}` : null;
  const loadInitialChat = (): { messages: ChatMessage[]; currentStage: number } => {
    if (!CHAT_STORAGE_KEY) return { messages: [], currentStage: 0 };
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return { messages: [], currentStage: 0 };
      const parsed = JSON.parse(raw);
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        currentStage: typeof parsed.currentStage === "number" ? parsed.currentStage : 0,
      };
    } catch { return { messages: [], currentStage: 0 }; }
  };
  const initial = loadInitialChat();
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stages] = useState<string[]>(subject.defaultStages);
  const [currentStage, setCurrentStage] = useState(initial.currentStage);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [gemsRemaining, setGemsRemaining] = useState<number | null>(null);
  // Tracks in-flight teacher-image generations keyed by the 12-char hex id
  // the backend embeds in `[[IMAGE:id]]` markers. AIMessage uses this map
  // to swap placeholder figures for real <img>s as `imageReady` SSE events
  // arrive. Not persisted — fal.ai URLs expire and historical messages
  // already store a `<p class="image-historical">` stub (server side).
  const [imageMap, setImageMap] = useState<TeacherImageMap>(() => new Map());
  const [dailyLimitUntil, setDailyLimitUntil] = useState<string | null>(null);
  const [countdownExpired, setCountdownExpired] = useState(false);
  // Bumped every time the student clicks "ابدأ الجلسة التالية الآن" so the
  // bootstrap effect re-fires (its other deps don't change after restart).
  const [sessionRestartKey, setSessionRestartKey] = useState(0);
  const [chatPhase, setChatPhase] = useState<'diagnostic' | 'teaching'>(isFirstSession ? 'diagnostic' : 'teaching');
  const [customPlan, setCustomPlan] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  // Set to `true` the moment the diagnostic stream finishes with [PLAN_READY].
  // A dedicated effect watches this + isStreaming so the very next teacher
  // message (Phase 1, kicked off automatically) starts immediately after the
  // student has had a moment to glance at the plan. Without this trigger the
  // student would see a beautiful plan and then... nothing — chat sits idle.
  const [pendingTeachStart, setPendingTeachStart] = useState(false);
  // Mirrors `isStreaming` for use inside delayed callbacks (setTimeout) where
  // closing over the latest streaming state via React state would be stale.
  // The auto-start timer reads this just before firing Phase 1 to make sure
  // the student didn't manually send a message during the 700ms delay window.
  const isStreamingRef = useRef(false);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  // Set to `true` if the diagnostic stream ended without [PLAN_READY] (e.g.
  // truncation past max_tokens, network blip, model refusal). We surface a
  // visible retry button so the student never gets silently stranded.
  const [diagnosticIncomplete, setDiagnosticIncomplete] = useState(false);
  // Set when a regular teaching reply ended without the server's terminating
  // `done` event — almost always a network/proxy truncation. Holds the user's
  // last message so the retry button can re-send it without making the
  // student retype anything. Cleared when retry fires or when the next
  // successful turn completes.
  const [streamTruncated, setStreamTruncated] = useState<{ lastUserMessage: string } | null>(null);
  // Professor-curriculum mode state
  const [teachingMode, setTeachingMode] = useState<'unset' | 'custom' | 'professor' | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(
    initialSourcesMaterialId && initialSourcesMaterialId > 0 ? initialSourcesMaterialId : null,
  );
  const [activeMaterialStarters, setActiveMaterialStarters] = useState<string | null>(null);
  const [activeMaterialWeakAreas, setActiveMaterialWeakAreas] = useState<{ topic: string; missed: number }[]>([]);
  const [quizPanel, setQuizPanel] = useState<{ open: boolean; kind: QuizKind }>({ open: false, kind: "chapter" });
  const [showSourcesPanel, setShowSourcesPanel] = useState(initialSourcesMaterialId != null);
  const consumedSourcesParamRef = useRef(false);
  useEffect(() => {
    if (initialSourcesMaterialId == null || consumedSourcesParamRef.current) return;
    consumedSourcesParamRef.current = true;
    // Strip the query param so refreshing or sharing the URL later doesn't
    // keep re-opening the panel unexpectedly.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("sources");
      window.history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
    }
  }, [initialSourcesMaterialId]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleShareWithTeacher = (code: string, language: string, output: string) => {
    const langLabels: Record<string, string> = {
      html: "HTML 🌐", css: "CSS 🎨", javascript: "JavaScript ⚡",
      typescript: "TypeScript 💙", python: "Python 🐍", java: "Java ☕",
      cpp: "C++ ⚙️", c: "C 🔩", go: "Go 🐹", rust: "Rust 🦀",
      ruby: "Ruby 💎", php: "PHP 🐘", bash: "Bash 🐚",
      dart: "Dart 🎯", kotlin: "Kotlin 🤖", sql: "SQL 🗄️",
    };
    const label = langLabels[language] || language;
    const msg = `كتبت هذا الكود بلغة ${label}:\n\`\`\`${language}\n${code}\n\`\`\`\nالناتج:\n${output || "(لا يوجد إخراج)"}`;
    onCloseIDE?.();
    sendTeachMessage(msg);
  };

  const messageCount = messages.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messageCount]);

  // Persist chat messages + stage so they survive close/reopen and refresh.
  // Only persists when CHAT_STORAGE_KEY is non-null (i.e. user is loaded).
  useEffect(() => {
    if (!CHAT_STORAGE_KEY) return;
    if (messages.length === 0 && currentStage === 0) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages, currentStage }));
    } catch {}
  }, [messages, currentStage, CHAT_STORAGE_KEY]);

  // Clear persisted chat once the session is finalized
  useEffect(() => {
    if (sessionComplete && CHAT_STORAGE_KEY) {
      try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
    }
  }, [sessionComplete, CHAT_STORAGE_KEY]);

  // Fetch persisted plan from DB on mount
  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/user-plan?subjectId=${encodeURIComponent(subject.id)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.plan?.planHtml) {
            setCustomPlan(data.plan.planHtml);
            if (data.plan.currentStageIndex > 0) {
              setCurrentStage(data.plan.currentStageIndex);
            }
            // A persisted plan means diagnostic phase already completed — switch to teaching
            setChatPhase('teaching');
          } else {
            // No saved plan yet → diagnostic phase MUST run for first session of this subject
            setChatPhase('diagnostic');
          }
        }
      } catch {}
      setPlanLoaded(true);
    }
    fetchPlan();
  }, [subject.id]);

  // Fetch teaching mode (custom vs professor) for this subject
  useEffect(() => {
    let cancelled = false;
    async function fetchMode() {
      try {
        const res = await fetch(`/api/teaching-mode?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTeachingMode(data.mode || 'unset');
          // If the page was opened with `?sources=<materialId>`, keep that
          // material selected instead of clobbering it with the server's
          // saved active material.
          if (initialSourcesMaterialId == null || initialSourcesMaterialId <= 0) {
            setActiveMaterialId(data.activeMaterialId ?? null);
          }
        }
      } catch {
        if (!cancelled) setTeachingMode('unset');
      }
    }
    fetchMode();
    return () => { cancelled = true; };
  }, [subject.id]);

  // When active material changes, fetch its starters for the chip row
  useEffect(() => {
    if (!activeMaterialId) { setActiveMaterialStarters(null); setActiveMaterialWeakAreas([]); return; }
    let cancelled = false;
    fetch(`/api/materials/${activeMaterialId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d) return;
        setActiveMaterialStarters(d.starters || null);
        setActiveMaterialWeakAreas(Array.isArray(d.recentWeakAreas) ? d.recentWeakAreas : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeMaterialId]);

  const handleChooseMode = async (mode: 'custom' | 'professor') => {
    setTeachingMode(mode);
    try {
      await fetch("/api/teaching-mode", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: subject.id, mode }),
      });
    } catch {}
    if (mode === 'professor') setShowSourcesPanel(true);
  };

  // Wait for /api/teaching-mode to resolve before any auto-start, so the choice
  // card shows BEFORE the diagnostic kicks off and there's no race window.
  const teachingModeLoaded = teachingMode !== null;
  // The "professor curriculum vs custom path" choice card must ONLY appear on
  // the very first session for this subject. Returning students whose mode is
  // still 'unset' (e.g. a stale row was wiped, or they ended a session before
  // choosing) should not be re-asked every time the daily countdown expires —
  // we silently default them to the custom path and drop them straight into
  // the next lesson.
  const needsModeChoice = teachingMode === 'unset' && !!isFirstSession;
  // Professor mode is meaningless without source material — the AI must teach
  // FROM the student's PDFs/notes, not invent a parallel custom path. If the
  // student picks 'أستاذي' but never uploads a file (or closes the sources
  // drawer without activating one), gate the chat so they can't accidentally
  // get the diagnostic + custom-style teaching pretending to be professor mode.
  // The gate UI gives them two paths forward: upload material now, OR switch
  // to the custom-path mode which doesn't need any source files.
  const needsMaterial = teachingMode === 'professor' && !activeMaterialId;
  const chatGated = !teachingModeLoaded || needsModeChoice || needsMaterial;

  // NOTE: we used to silently downgrade returning 'unset' students to 'custom'
  // here. That was wrong: it threw away professor-mode continuity for anyone
  // whose teaching-mode row had been wiped (or never written) but who already
  // had ready PDFs or chapter progress. The backend GET /api/teaching-mode now
  // restores 'professor' from the most-recent ready material on this user's
  // subject, so by the time we get here `teachingMode` is the truthful value.
  // If it's still 'unset' for a returning student, that means there's truly
  // no material/progress — `needsModeChoice` is already false (gated on
  // `isFirstSession`), so the chat will boot in custom-style without
  // overwriting any persisted mode.

  // Start session once plan fetch is done — use the persisted stage index and phase
  // Both planLoaded and chatPhase are set together in fetchPlan, so chatPhase is
  // already resolved (teaching or diagnostic) before this effect fires.
  useEffect(() => {
    if (!planLoaded) return;
    // Wait until the teaching-mode fetch has resolved AND, if unset, until the
    // student has explicitly chosen a mode. This closes the race window where
    // teachingMode is still `null` and would otherwise let the diagnostic fire.
    if (chatGated) return;
    // Kick off the first teacher message if the chat has no assistant reply yet
    // (covers fresh sessions AND stale localStorage where only a user message was cached).
    const hasAssistant = messages.some((m) => m.role === "assistant" && (m.content || "").trim().length > 0);
    if (!hasAssistant) {
      // If the cache only has orphan user messages, clear them so the teacher can start cleanly.
      if (messages.length > 0) {
        setMessages([]);
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
      }
      sendTeachMessage("", stages, currentStage, chatPhase === 'diagnostic');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoaded, chatGated, sessionRestartKey]);

  const triggerSummary = async (allMessages: ChatMessage[]) => {
    setIsSummarizing(true);
    setSummaryError(false);
    try {
      const res = await fetch('/api/ai/summarize-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          messages: allMessages,
          messagesCount: allMessages.length,
          conversationDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) setSummaryError(true);
    } catch {
      setSummaryError(true);
    }
    setIsSummarizing(false);
  };

  // Auto-send a starter message when the parent passes one (e.g. user clicked a "custom env" button).
  // Guard against firing before the initial session bootstrap (planLoaded + first assistant reply),
  // or while a stream is in progress, to avoid clobbering the diagnostic/teaching start.
  useEffect(() => {
    if (!chatStarter) return;
    if (!planLoaded || isStreaming) return;
    sendTeachMessage(chatStarter);
    onConsumeChatStarter?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatStarter, planLoaded, isStreaming]);

  // After the diagnostic finishes with [PLAN_READY], chatPhase flips to
  // 'teaching' and pendingTeachStart is set. We then fire the *first* teaching
  // message (Phase 1) automatically — but only after the diagnostic stream has
  // fully ended (isStreaming === false), to avoid concurrent requests, and
  // with a tiny delay so the student can register that the plan finished.
  useEffect(() => {
    if (!pendingTeachStart) return;
    if (isStreaming) return;
    if (chatPhase !== 'teaching') return;
    // Consume the flag immediately to prevent re-entry on subsequent renders
    // (e.g. if isStreaming flips between calls).
    setPendingTeachStart(false);
    const t = setTimeout(() => {
      // Final runtime guard: if the student manually fired a message during
      // the 700ms delay window, isStreamingRef will be true and we abort —
      // the student's message takes precedence over our auto-trigger.
      if (isStreamingRef.current) return;
      // Empty text + explicit isDiagnostic=false starts Phase 1 cleanly.
      sendTeachMessage("", stages, 0, false);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTeachStart, isStreaming, chatPhase]);

  const sendTeachMessage = async (text: string, stagesParam?: string[], stageParam?: number, isDiagnostic?: boolean, labReportMeta?: { envTitle: string; envBriefing: string; reportText: string }) => {
    setIsStreaming(true);
    // A new turn supersedes any prior truncation banner — either the retry
    // button is what fired this call, or the student has decided to move
    // on with a fresh question. Either way the stale banners shouldn't
    // hover over the new exchange.
    setStreamTruncated(null);
    setDiagnosticIncomplete(false);
    if (text) {
      setMessages(prev => [...prev, { role: "user", content: text }]);
    }
    setInput("");
    const usedStages = stagesParam ?? stages;
    const usedStage = stageParam ?? currentStage;
    const diagMode = isDiagnostic ?? (chatPhase === 'diagnostic');

    // Network safety net: a teaching reply should arrive within ~90s. Without
    // this, a stalled connection could leave the UI hanging on the spinner
    // until the browser's default socket timeout (often 5+ minutes), and the
    // student would have no way to retry. AbortController lets us bail out
    // cleanly and surface a clear error message.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          userMessage: text,
          history: messages,
          planContext: customPlan,
          stages: usedStages,
          currentStage: usedStage,
          isDiagnosticPhase: diagMode,
          hasCoding: subject.hasCoding,
        })
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "DAILY_LIMIT" && data.nextSessionAt) {
          setDailyLimitUntil(data.nextSessionAt);
        }
        setIsStreaming(false);
        return;
      }

      if (response.status === 403) {
        setAccessDenied(true);
        setIsStreaming(false);
        return;
      }

      // Any other non-2xx must NOT add an empty assistant placeholder —
      // doing so would poison the next request's history with a whitespace
      // assistant turn and Anthropic would reject the whole turn (400).
      // But the student still deserves visible feedback — show a clear,
      // friendly error message instead of leaving the chat eerily silent.
      if (!response.ok) {
        console.error("[teach] non-ok response:", response.status);
        const status = response.status;
        const errorHtml = status === 401 || status === 419
          ? `<p><em>⚠️ انتهت جلستك. سجّل الدخول مجدّداً للمتابعة.</em></p>`
          : `<p><em>⚠️ تعذّر الردّ بسبب خلل مؤقّت في الخادم (${status}). أعد المحاولة بعد لحظات — لم يُحسب لك هذا الطلب من رصيد الرسائل.</em></p>`;
        setMessages(prev => [...prev, { role: 'assistant', content: errorHtml }]);
        clearTimeout(timeoutId);
        setIsStreaming(false);
        return;
      }

      if (!response.body) {
        const errorHtml = `<p><em>⚠️ لم يصل أي ردّ من الخادم. أعد المحاولة بعد لحظات.</em></p>`;
        setMessages(prev => [...prev, { role: 'assistant', content: errorHtml }]);
        clearTimeout(timeoutId);
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      // `fatal: false` keeps the decoder lenient — invalid bytes become U+FFFD
      // instead of throwing, so we never bail out of the loop because of a
      // single garbled chunk. The end-of-stream flush below recovers any
      // pending partial UTF-8 sequence (Arabic glyphs are 2–3 bytes each).
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let assistantMsg = "";
      let emptyStream = false;
      let buffer = "";
      // Tracks whether the diagnostic stream actually emitted [PLAN_READY].
      // If diagMode was true but this stays false at end-of-stream AND we
      // produced substantive content, the plan was almost-certainly truncated
      // (or the model went off-script) — surface a clear retry banner so the
      // student isn't silently stranded staring at a half-finished plan.
      let gotPlanReady = false;
      // Tracks whether the server actually sent its terminating
      // `data: {"done": true}` event. If the underlying reader hits EOF
      // *without* having seen this event, the stream was truncated by the
      // network/proxy mid-flight — every legitimate completion path on the
      // server emits `done`. We use this to distinguish "the model finished
      // and politely said goodbye" from "the cable got yanked out".
      let gotDoneEvent = false;

      // Throttle state updates: batch streaming chunks every 50ms.
      // CRITICAL: the previous implementation captured the `content` argument
      // in the timer's closure at the FIRST call, which meant every chunk
      // that arrived during the 50ms window was silently lost — only the
      // first chunk of each window was ever rendered. We now read from a
      // ref that always holds the latest accumulated text, so the timer
      // paints whatever exists at the moment it fires, never a stale slice.
      const latestContentRef = { current: "" };
      let updateTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleUpdate = () => {
        if (updateTimer) return;
        updateTimer = setTimeout(() => {
          setMessages(prev => {
            const nm = [...prev];
            nm[nm.length - 1] = { role: "assistant", content: latestContentRef.current };
            return nm;
          });
          updateTimer = null;
        }, 50);
      };

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              gotDoneEvent = true;
              if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }
              // Empty-stream guard: if the model produced zero content (network
              // hiccup, safety refusal, etc.) drop the empty assistant bubble
              // and surface a friendly retry hint. The backend already skips
              // counter/streak increments in this case, so the student isn't
              // charged for the silent failure.
              if (assistantMsg.trim().length === 0) {
                emptyStream = true;
                setMessages(prev => {
                  const trimmed = [...prev];
                  if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "assistant" && !trimmed[trimmed.length - 1].content) {
                    trimmed.pop();
                  }
                  return trimmed;
                });
                console.warn("[ai/teach] empty stream — dropped placeholder, no quota burned");
                break;
              }
              if (data.messagesRemaining !== null && data.messagesRemaining !== undefined) {
                setMessagesRemaining(data.messagesRemaining);
              }
              if (data.gemsRemaining !== null && data.gemsRemaining !== undefined) {
                setGemsRemaining(data.gemsRemaining);
                // Notify header badge to refresh immediately
                window.dispatchEvent(new Event("nukhba:gems-changed"));
              }
              if (data.planReady) {
                gotPlanReady = true;
                setCustomPlan(assistantMsg);
                setChatPhase('teaching');
                // Persist plan to DB
                fetch('/api/user-plan', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    subjectId: subject.id,
                    planHtml: assistantMsg,
                    currentStageIndex: 0,
                  }),
                }).catch(() => {});
                // Trigger automatic start of Phase 1: a watcher effect picks
                // this up once the current stream has fully ended (so we don't
                // race with isStreaming === true). Without this, the student
                // sees the plan and then nothing happens.
                setPendingTeachStart(true);
              }
              // Quota exhausted — disable input, trigger summary, show exhausted screen
              if (data.quotaExhausted || data.messagesRemaining === 0) {
                setQuotaExhausted(true);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                  triggerSummary(updated);
                  return updated;
                });
                break;
              }
              if (!diagMode && data.stageComplete && data.nextStage !== undefined) {
                if (data.nextStage >= usedStages.length) {
                  setCurrentStage(usedStages.length);
                  setSessionComplete(true);
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                    triggerSummary(updated);
                    return updated;
                  });
                } else {
                  setCurrentStage(data.nextStage);
                  // Persist updated stage to DB
                  fetch('/api/user-plan/stage', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ subjectId: subject.id, currentStageIndex: data.nextStage }),
                  }).catch(() => {});
                }
              }
              break;
            }
            // ── Teacher-image SSE events (mid-stream) ─────────────────────
            // Three event shapes from the server, fired BEFORE `data.done`:
            //   { imagePlaceholder: { id } }       — generation kicked off
            //   { imageReady: { id, url } }        — URL resolved (≈3-6s)
            //   { imageError: { id, message? } }   — flux/timeout failure
            // We mutate imageMap via setState; AIMessage reacts and swaps
            // the placeholder figure for the real <img>. CRITICAL: these
            // handlers MUST live outside the `if (data.done)` branch above
            // — they arrive interleaved with `data.content` chunks during
            // the stream, never as part of the terminal done event.
            if (data.imagePlaceholder?.id) {
              const id = String(data.imagePlaceholder.id);
              setImageMap(prev => {
                if (prev.has(id)) return prev;
                const next = new Map(prev);
                next.set(id, { status: 'loading' });
                return next;
              });
              continue;
            }
            if (data.imageReady?.id && data.imageReady.url) {
              const id = String(data.imageReady.id);
              const url = String(data.imageReady.url);
              setImageMap(prev => {
                const next = new Map(prev);
                next.set(id, { status: 'ready', url });
                return next;
              });
              continue;
            }
            if (data.imageError?.id) {
              const id = String(data.imageError.id);
              setImageMap(prev => {
                const next = new Map(prev);
                next.set(id, { status: 'error' });
                return next;
              });
              continue;
            }
            if (data.content) {
              assistantMsg += data.content;
              // Update the ref BEFORE scheduling so when the timer fires it
              // paints the latest accumulated text — fixes the stale-closure
              // bug where only the first chunk of each 50ms window survived.
              latestContentRef.current = assistantMsg;
              scheduleUpdate();
            }
          } catch {}
        }
      }
      // Flush any pending update at stream end. Skip the final overwrite when
      // the stream produced zero content — the empty-stream guard already
      // popped the placeholder bubble, so writing assistantMsg ("") back here
      // would either resurrect the empty bubble or corrupt the previous
      // assistant message.
      if (updateTimer) { clearTimeout(updateTimer); updateTimer = null; }

      // ── End-of-stream UTF-8 flush ────────────────────────────────────────
      // The decoder holds back any incomplete multi-byte sequence at the
      // end of each chunk (a 3-byte Arabic glyph that arrives split across
      // two TCP packets is the worst offender). Without this final flush
      // those trailing bytes are silently dropped and the message ends
      // either mid-character or with U+FFFD. Calling decode() with no
      // arguments and no `{stream: true}` tells the decoder "this is the
      // last chunk — give me whatever you've still got buffered".
      buffer += decoder.decode();

      // Drain any complete `data: …` events still sitting in the buffer.
      // Normally this is empty (the server's `done` event terminates with a
      // proper `\n\n` separator and we processed it inside the loop), but
      // an abrupt mid-stream disconnect can leave a complete event without
      // its trailing newline still in the buffer — we'd lose those last
      // few characters of `assistantMsg` if we didn't drain it here.
      if (buffer.length > 0) {
        const tailLines = buffer.split('\n');
        for (const line of tailLines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) gotDoneEvent = true;
            if (data.content && !emptyStream) {
              assistantMsg += data.content;
              latestContentRef.current = assistantMsg;
            }
            if (data.planReady) gotPlanReady = true;
          } catch {}
        }
        buffer = "";
      }

      if (!emptyStream) {
        setMessages(prev => {
          const nm = [...prev];
          nm[nm.length - 1] = { role: "assistant", content: assistantMsg };
          return nm;
        });
      }

      // ── Diagnostic completeness check ──────────────────────────────────
      // We only fire the "plan incomplete" banner when two things are true
      // simultaneously:
      //   1. The server's terminating `done` event never arrived — meaning the
      //      stream was physically cut off mid-flight (network drop, proxy
      //      timeout, max_tokens truncation).
      //   2. We're in diagnostic mode and [PLAN_READY] wasn't seen.
      //
      // Without the `!gotDoneEvent` guard, this banner used to fire after
      // every single Q&A question in the diagnostic phase because those
      // messages are > 200 chars but legitimately have no [PLAN_READY].
      // Now we only show it when the stream actually stopped unexpectedly.
      if (diagMode && !gotPlanReady && !gotDoneEvent && !emptyStream && assistantMsg.trim().length > 200) {
        console.warn('[teach] diagnostic stream cut off without [PLAN_READY] — likely truncation');
        setDiagnosticIncomplete(true);
      }

      // ── Generic mid-stream truncation check ────────────────────────────
      // Every legitimate completion path on the server emits `data: {done:true}`
      // before closing the socket. If the reader hit EOF without ever seeing
      // that event AND we did write some content to the bubble, the network
      // (or the proxy) cut us off mid-flight. Silently leaving a half-sentence
      // in the chat is the bug the student photographed; surface a visible
      // retry banner so they know what happened and can re-send.
      if (!gotDoneEvent && !emptyStream && assistantMsg.trim().length > 0 && text.trim().length > 0) {
        console.warn('[teach] stream ended without done event — likely network truncation');
        if (diagMode) {
          // diagMode: handled above by the diagnosticIncomplete banner unless
          // the message was too short to be a plan attempt.
          if (assistantMsg.trim().length <= 200) {
            setStreamTruncated({ lastUserMessage: text });
          }
        } else {
          setStreamTruncated({ lastUserMessage: text });
        }
      }

      // Persist lab report + teacher feedback so the student can revisit later.
      if (labReportMeta && assistantMsg.trim()) {
        fetch('/api/lab-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subjectId: subject.id,
            subjectName: subject.name,
            envTitle: labReportMeta.envTitle,
            envBriefing: labReportMeta.envBriefing,
            reportText: labReportMeta.reportText,
            feedbackHtml: assistantMsg,
          }),
        }).catch(() => {});
      }
    } catch (e: any) {
      // Network failure path: fetch threw (offline, DNS failure, server
      // unreachable, or our 90s AbortController fired). The student is
      // staring at an empty bubble — replace it with a clearly-marked error
      // message so they know what happened and how to recover.
      networkErrored = true;
      const aborted = e?.name === 'AbortError';
      console.error('[teach] network error:', aborted ? 'timeout' : e?.message || e);
      const errorHtml = aborted
        ? `<p><em>⚠️ استغرقت الاستجابة وقتاً طويلاً وتمّ قطعها. تحقّق من الاتصال وأعد إرسال رسالتك — لم يُحسب لك هذا الطلب من رصيد الرسائل.</em></p>`
        : `<p><em>⚠️ تعذّر الاتصال بالمعلّم الآن. تحقّق من الإنترنت وأعد المحاولة بعد لحظات — لم يُحسب لك هذا الطلب من رصيد الرسائل.</em></p>`;
      setMessages(prev => {
        const updated = [...prev];
        // If we already added an empty assistant placeholder (stream had
        // started but died), replace it. Otherwise append a new bubble.
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
          updated[updated.length - 1] = { role: 'assistant', content: errorHtml };
        } else {
          updated.push({ role: 'assistant', content: errorHtml });
        }
        return updated;
      });
    } finally {
      clearTimeout(timeoutId);
      setIsStreaming(false);
      void networkErrored;
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendTeachMessage(input);
    if (inputRef.current) {
      inputRef.current.style.height = "56px";
    }
  };

  const handleEndSession = () => {
    if (messages.length < 2 || isStreaming) return;
    setSessionComplete(true);
    triggerSummary(messages);
  };

  // Hoisted so the auto-restart effect below and the countdown UI share one
  // implementation.
  const startNextSession = () => {
    // Wipe the per-session UI state — but DO NOT touch `currentStage`. The
    // student's progress through the curriculum is persisted server-side
    // (loaded by fetchPlan into `currentStage`); resetting it here would
    // throw them back to stage 0. We bump `sessionRestartKey` so the
    // bootstrap useEffect re-fires after React commits the cleared
    // `messages` state, avoiding the stale-closure issue you'd get from
    // calling `sendTeachMessage` synchronously here.
    setDailyLimitUntil(null);
    setCountdownExpired(false);
    setSessionComplete(false);
    setMessages([]);
    setQuotaExhausted(false);
    setSummaryError(false);
    setIsSummarizing(false);
    try { if (CHAT_STORAGE_KEY) localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
    setSessionRestartKey((k) => k + 1);
  };

  // Auto-restart: if the page renders with `dailyLimitUntil` already in the
  // past (e.g. student returned the morning after hitting the cap), kick off
  // the next session immediately instead of forcing them to click the
  // countdown CTA. This is intentionally separate from the Countdown's
  // `onExpired` callback, which only fires for sessions that were live when
  // the timer reached zero.
  useEffect(() => {
    if (!dailyLimitUntil) return;
    if (new Date(dailyLimitUntil).getTime() <= Date.now()) {
      startNextSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLimitUntil]);

  if (dailyLimitUntil) {
    const expired = countdownExpired || new Date(dailyLimitUntil).getTime() <= Date.now();
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <Clock className="w-12 h-12 text-gold" />
          </div>
          {expired ? (
            <>
              <h3 className="text-2xl font-bold mb-2">جلستك التالية جاهزة! 🎉</h3>
              <p className="text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
                مرّ يوم جديد — يمكنك بدء الجلسة التالية الآن ومتابعة المسار من حيث توقفت.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold mb-2">أحسنت! أتممت جلستك اليوم 🎯</h3>
              <p className="text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
                يُفتح لك الدرس التالي تلقائياً في نهاية العد التنازلي — التعلم المنتظم يُرسّخ المعلومة أكثر من الحفظ دفعةً واحدة.
              </p>
              <div className="mb-8">
                <p className="text-xs text-muted-foreground mb-4">الجلسة القادمة تبدأ خلال</p>
                <Countdown until={dailyLimitUntil} onExpired={() => setCountdownExpired(true)} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            {expired && (
              <Button
                onClick={startNextSession}
                className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl"
              >
                <Sparkles className="w-5 h-5 ml-2" />
                ابدأ الجلسة التالية الآن
              </Button>
            )}
            <Button
              variant="outline"
              className="border-white/10 h-10 rounded-xl text-sm"
              onClick={() => onSessionComplete ? onSessionComplete() : setDailyLimitUntil(null)}
            >
              <FileText className="w-4 h-4 ml-2" />
              عرض الملخصات
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-gold" />
        </div>
        <h3 className="text-2xl font-bold mb-3">انتهت جواهرك 💎</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          لقد استنفدت رصيد جواهرك. اشترك في خطة جديدة للاستمرار في التعلم مع جميع التخصصات.
        </p>
        <div className="flex items-center gap-3 mb-8 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
          <img src="/karimi-logo.png" alt="كريمي" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          الدفع عبر حوالة كريمي — سريع بدون بطاقة بنكية
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={onAccessDenied} className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl">
            <Sparkles className="w-5 h-5 ml-2" />
            اشترك الآن
          </Button>
        </div>
      </div>
    );
  }

  if (quotaExhausted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-2xl font-bold mb-3">جواهرك نفدت 💎</h3>
          <p className="text-muted-foreground mb-2 max-w-sm text-sm leading-relaxed">
            لقد استنفدت رصيد جواهرك لهذا الاشتراك.
          </p>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
            {isSummarizing
              ? "جاري حفظ ملخص جلستك الأخيرة..."
              : summaryError
                ? "لم يتم حفظ الملخص — تحقق من اتصالك."
                : "تم حفظ ملخص جلستك الأخيرة في لوحة التحكم ✓"}
          </p>
          <div className="flex items-center gap-3 mb-8 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-muted-foreground max-w-xs mx-auto">
            <img src="/karimi-logo.png" alt="كريمي" className="w-8 h-8 rounded-lg object-cover shrink-0" />
            الدفع عبر حوالة كريمي — سريع بدون بطاقة بنكية
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button
              onClick={onAccessDenied}
              className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              جدّد الاشتراك الآن
            </Button>
            <Button
              variant="outline"
              className="border-white/10 h-10 rounded-xl text-sm"
              onClick={() => onSessionComplete ? onSessionComplete() : onAccessDenied()}
            >
              <FileText className="w-4 h-4 ml-2" />
              عرض الملخصات
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-emerald/10 border-2 border-emerald/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-12 h-12 text-emerald" />
          </div>
          <h3 className="text-3xl font-black mb-3 text-emerald">أحسنت! اكتملت الجلسة 🎉</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            أتممت جميع مراحل جلسة <strong className="text-foreground">{subject.name}</strong>.
          </p>
          {isSummarizing ? (
            <div className="flex items-center gap-2 justify-center text-gold mb-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري حفظ ملخص الجلسة...</span>
            </div>
          ) : summaryError ? (
            <div className="flex flex-col items-center gap-2 mb-8">
              <p className="text-sm text-red-400">لم يتم حفظ الملخص — تحقق من اتصالك</p>
              <button
                onClick={() => {
                  const msgs = messages;
                  setMessages(msgs);
                  triggerSummary(msgs);
                }}
                className="text-xs text-gold underline hover:no-underline"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <p className="text-sm text-emerald mb-8">تم حفظ ملخص الجلسة في لوحة التحكم ✓</p>
          )}
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button
              onClick={() => onSessionComplete ? onSessionComplete() : onAccessDenied()}
              disabled={isSummarizing}
              className="gradient-gold text-primary-foreground font-bold h-12 rounded-xl"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              {isSummarizing ? "جاري الحفظ..." : "عرض الملخص"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // All lab/IDE panels are ALWAYS mounted so their state persists across tab switches.
  // Visibility is toggled with CSS display only — never conditional rendering.
  const handleLabShare = (content: string) => {
    onCloseLab?.();
    sendTeachMessage(`نتائج من المختبر الغذائي:\n${content}`);
  };
  const handleYemenSoftShare = (content: string) => {
    onCloseYemenSoft?.();
    sendTeachMessage(`نتائج من البيئة التطبيقية (يمن سوفت):\n${content}`);
  };
  const handleAccountingLabShare = (content: string) => {
    onCloseAccountingLab?.();
    sendTeachMessage(`نتائج من مختبر المحاسبة:\n${content}`);
  };
  const anyPanelOpen = !!(ideOpen || labOpen || yemenSoftOpen || accountingLabOpen || (dynamicEnvOpen && pendingDynamicEnv) || (attackSimOpen && pendingAttackScenario));
  const chatVisible = !anyPanelOpen;
  // Show the "return to your env" button whenever an env exists for this
  // subject but is not currently open AND no other major panel is open.
  const showReopenEnv = !!pendingDynamicEnv && !dynamicEnvOpen && !ideOpen && !labOpen && !yemenSoftOpen && !accountingLabOpen && !attackSimOpen;
  const showReopenAttack = !!pendingAttackScenario && !attackSimOpen && !ideOpen && !labOpen && !yemenSoftOpen && !accountingLabOpen && !dynamicEnvOpen;

  return (
    <>
    {/* Floating "return to your env" button — keeps the user from losing
        their interactive lab if they accidentally closed it. */}
    {showReopenEnv && (
      <button
        onClick={() => onReopenDynamicEnv?.()}
        className="fixed bottom-20 md:bottom-6 right-4 z-[70] bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-cyan-300/50"
        style={{ direction: "rtl" }}
        title={pendingDynamicEnv?.title || "العودة لبيئتك"}
      >
        <span className="text-lg">🧪</span>
        <span className="max-w-[160px] truncate">العودة لبيئتك: {pendingDynamicEnv?.title || "البيئة التطبيقية"}</span>
      </button>
    )}
    {/* Universal floating "build env" button — available across ALL subjects.
        Hidden when an env already exists (the "return" button takes over),
        when a panel is open, or while the build is in flight.
        IMPORTANT: this does NOT call /ai/lab/build-env directly. It triggers
        the teacher-orchestrated dialog (ASK_OPTIONS in /ai/teach), which
        emits [[CREATE_LAB_ENV]] only after the student picks specifics. */}
    {!pendingDynamicEnv && !anyPanelOpen && !isCreatingEnv && onStartLabEnvIntent && chatVisible && (
      <button
        onClick={() => onStartLabEnvIntent()}
        className="fixed bottom-20 md:bottom-6 right-4 z-[70] bg-gradient-to-l from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-amber-300/50"
        style={{ direction: "rtl" }}
        title="ابنِ بيئة تطبيقية تفاعلية لهذه المادة"
      >
        <span className="text-lg">🧪</span>
        <span>ابنِ بيئة تطبيقية</span>
      </button>
    )}
    {/* Attack Simulation: floating "build" button (security/networking only). */}
    {attackSimEnabled && !pendingAttackScenario && !anyPanelOpen && chatVisible && onOpenAttackIntake && (
      <button
        onClick={() => onOpenAttackIntake()}
        className="fixed bottom-36 md:bottom-20 right-4 z-[70] bg-gradient-to-l from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-red-400/50"
        style={{ direction: "rtl" }}
        title="ابدأ محاكاة هجمة تعليمية"
      >
        <span className="text-lg">🎯</span>
        <span>محاكاة هجمة</span>
      </button>
    )}
    {/* Attack Simulation: re-open button when scenario exists but panel closed. */}
    {showReopenAttack && (
      <button
        onClick={() => onReopenAttackSim?.()}
        className="fixed bottom-36 md:bottom-20 right-4 z-[70] bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-red-400/50"
        style={{ direction: "rtl" }}
        title={pendingAttackScenario?.title || "العودة لمحاكاة الهجمة"}
      >
        <span className="text-lg">🎯</span>
        <span className="max-w-[160px] truncate">العودة للمحاكاة</span>
      </button>
    )}
    {/* IDE panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ direction: "ltr", background: "#080a11", display: ideOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <CodeEditorPanel
          sectionContent=""
          subjectId={subject.id}
          onShareWithTeacher={handleShareWithTeacher}
        />
      </div>
    </div>

    {/* Food Lab panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: labOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <FoodLabPanel
          onShareWithTeacher={handleLabShare}
          pendingScenario={pendingFoodScenario}
          onClearScenario={onClearPendingFoodScenario}
          subjectId={subject.id}
        />
      </div>
    </div>

    {/* YemenSoft panel — always mounted */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: yemenSoftOpen ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        <YemenSoftSimulatorV2
          onShareWithTeacher={handleYemenSoftShare}
          pendingScenario={pendingYemenSoftScenario}
          onClearScenario={onClearPendingYemenSoftScenario}
          subjectId={subject.id}
        />
      </div>
    </div>

    {/* Accounting Lab panel — always mounted */}
    <div className="flex-1 overflow-hidden w-full min-w-0" style={{ background: "#080a11", display: accountingLabOpen ? "flex" : "none" }}>
      <AccountingLab
        onShare={handleAccountingLabShare}
        pendingScenario={pendingAccountingScenario}
        onClearScenario={onClearPendingAccountingScenario}
        subjectId={subject.id}
      />
    </div>

    {/* Attack Simulation panel — independent feature for security subjects.
        Always mounted (display toggled) so terminal/state survive close/reopen. */}
    {pendingAttackScenario && (
      <div className="flex-1 overflow-hidden w-full min-w-0" style={{ background: "#080a11", display: attackSimOpen ? "flex" : "none" }}>
        <AttackSimulation
          scenario={pendingAttackScenario}
          subjectId={subject.id}
          onClose={() => onCloseAttackSim?.()}
        />
      </div>
    )}

    {/* Dynamic AI-built environment — universal across all subjects */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0" style={{ background: "#080a11", display: dynamicEnvOpen && pendingDynamicEnv ? "block" : "none" }}>
      <div className="p-3 sm:p-4 w-full min-w-0">
        {pendingDynamicEnv && (
          <DynamicEnvShell
            env={pendingDynamicEnv}
            subjectId={subject.id}
            // Closing the env should NOT delete it — only hide it. The user
            // can reopen it from the floating "العودة لبيئتك" button. Their
            // work inside the env is preserved by the env state engine.
            onClose={() => { onCloseDynamicEnv?.(); }}
            onSubmitToTeacher={(report, meta) => {
              onCloseDynamicEnv?.();
              sendTeachMessage(report, undefined, undefined, undefined, {
                envTitle: meta.envTitle,
                envBriefing: meta.envBriefing,
                reportText: report,
              });
            }}
            // Phase 3 — when the student requests a fresh variant in exam
            // mode, hot-swap the rendered env. The env-state engine resets
            // itself on the swap so the student gets a clean slate.
            onLoadVariantEnv={onLoadVariantEnv}
          />
        )}
      </div>
    </div>

    {/* Chat UI — visible only when no panel is open */}
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080a11", display: chatVisible ? "flex" : "none" }}>

      {/* Mode-choice overlay (first session, before diagnostic).
          When shown, the chat UI below is hidden so the choice card fills the
          screen — no half-screen split. */}
      {needsModeChoice && planLoaded && (
        <TeachingModeChoiceCard subjectName={subject.name} onChoose={handleChooseMode} />
      )}

      {/* Professor-mode-without-material gate. Shown when the student picked
          'أستاذي' but hasn't activated any source file yet. Without this, the
          chat would silently fall back to custom-style teaching while still
          claiming to be in professor mode — confusing and wrong. */}
      {!needsModeChoice && needsMaterial && planLoaded && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center" style={{ direction: "rtl", background: "#080a11" }}>
          <div className="max-w-xl w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <span className="text-3xl">📚</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">أرفق ملازمك أو كتاب الأستاذ</h2>
              <p className="text-sm text-white/60 leading-relaxed">
                اخترت <span className="font-bold text-amber-300">منهج الأستاذ</span> — لا أستطيع تدريسك حتى ترفع ملف PDF (ملزمة، فصلاً من كتاب، أو شرحاً) لأشرح لك منه فصلاً بفصل بنفس ترتيبه ومصطلحاته.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowSourcesPanel(true)}
                className="w-full p-4 rounded-2xl border-2 border-amber-500/60 hover:border-amber-500 bg-amber-500/15 hover:bg-amber-500/25 transition-all flex items-center justify-center gap-3 group"
              >
                <BookOpen className="w-5 h-5 text-amber-300 group-hover:text-amber-200" />
                <span className="text-base font-bold text-amber-200 group-hover:text-white">ارفع ملزمتك الآن</span>
              </button>

              <div className="text-center text-xs text-white/30 py-1">— أو —</div>

              <button
                onClick={() => handleChooseMode('custom')}
                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-purple-500/60 bg-white/[0.03] hover:bg-purple-500/10 transition-all flex items-center justify-center gap-3 group"
              >
                <span className="text-2xl">🧭</span>
                <span className="text-base font-bold text-white group-hover:text-purple-300">حوّلني إلى المسار المخصّص بدلاً من ذلك</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-white/30 mt-5">
              المسار المخصّص لا يحتاج ملازم — المعلم يبني لك خطة كاملة بناءً على مستواك وأهدافك.
            </p>
          </div>
        </div>
      )}

      {/* Sources panel drawer (rendered as overlay; safe to mount always) */}
      <CourseMaterialsPanel
        subjectId={subject.id}
        open={showSourcesPanel}
        onClose={() => setShowSourcesPanel(false)}
        activeMaterialId={activeMaterialId}
        onActiveChange={setActiveMaterialId}
      />

      {/* Everything below renders only AFTER the student has picked a mode AND
          (if professor) activated a source file — so the choice card, the
          material-required gate, and the chat never share the screen. */}
      {!needsModeChoice && !needsMaterial && (<>

      {/* Mode/sources mini-bar (visible whenever mode is set) */}
      {teachingMode && teachingMode !== 'unset' && (
        <div className="shrink-0 px-3 py-2 border-b border-white/5 flex items-center justify-between gap-2" style={{ background: "rgba(245,158,11,0.04)" }}>
          <div className="flex items-center gap-2 min-w-0" style={{ direction: "rtl" }}>
            {teachingMode === 'professor' ? (
              <>
                <span className="text-[11px] font-bold text-amber-300">📚 منهج الأستاذ</span>
                <span className="text-[10px] text-white/40 truncate">{activeMaterialId ? "ملف نشط" : "لم تختر ملفاً بعد"}</span>
              </>
            ) : (
              <span className="text-[11px] font-bold text-purple-300">🧭 مسار مخصّص</span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {teachingMode === 'professor' && activeMaterialId && (
              <>
                <button
                  onClick={() => setQuizPanel({ open: true, kind: 'chapter' })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 text-amber-200 transition-all flex items-center gap-1.5"
                  title="اختبر نفسك على الفصل الحالي"
                >
                  📘 اختبرني على هذا الفصل
                </button>
                <button
                  onClick={() => setQuizPanel({ open: true, kind: 'exam' })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-500/50 text-purple-200 transition-all flex items-center gap-1.5"
                  title="امتحان شامل من 30 سؤالاً يغطّي كامل الملف"
                >
                  🏆 الامتحان النهائي
                </button>
              </>
            )}
            <button
              onClick={() => setShowSourcesPanel(true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-white/70 hover:text-amber-200 transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3" />
              مصادري
            </button>
          </div>
        </div>
      )}

      {/* Quiz / final exam launcher */}
      <QuizPanel
        open={quizPanel.open && !!activeMaterialId}
        onClose={() => setQuizPanel((q) => ({ ...q, open: false }))}
        materialId={activeMaterialId}
        kind={quizPanel.kind}
      />

      {/* Stage progress bar */}
      {chatPhase === 'teaching' && stages.length > 0 && (
        <div className="shrink-0 px-4 py-2.5 border-b border-white/5 flex items-center gap-3" style={{ background: "#0b0d17" }}>
          <div className="flex items-center gap-1.5 flex-1">
            {stages.map((s, idx) => {
              const done = idx < currentStage;
              const active = idx === currentStage;
              return (
                <div key={idx} className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${
                    done ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : active ? "bg-gold text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    : "bg-white/10 text-white/30"
                  }`}>
                    {done ? "✓" : idx + 1}
                  </div>
                  <div className="flex-1 hidden sm:block truncate">
                    <span className={`text-[11px] truncate ${active ? "text-gold font-semibold" : done ? "text-emerald-400/70" : "text-white/25"}`}>{s}</span>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`h-px flex-1 mx-1 transition-all ${done ? "bg-emerald-500/50" : "bg-white/8"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {gemsRemaining !== null && gemsRemaining > 0 && (
            <div className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 ${gemsRemaining < 50 ? 'bg-red-500/15 border border-red-500/30 animate-pulse' : gemsRemaining < 150 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
              <span className="text-[11px]">💎</span>
              <span className={`text-[11px] font-bold ${gemsRemaining < 50 ? 'text-red-400' : gemsRemaining < 150 ? 'text-amber-400' : 'text-muted-foreground'}`}>{gemsRemaining}</span>
              <span className={`text-[10px] hidden sm:inline ${gemsRemaining < 50 ? 'text-red-400/70' : gemsRemaining < 150 ? 'text-amber-400/70' : 'text-muted-foreground/70'}`}>جوهرة اليوم</span>
            </div>
          )}
        </div>
      )}

      {/* Personalized learning path — sticky panel above messages once plan is built */}
      {chatPhase === 'teaching' && customPlan && (
        <LearningPathPanel planHtml={customPlan} currentStage={currentStage} totalStages={stages.length} />
      )}

      {/* Diagnostic phase banner */}
      {chatPhase === 'diagnostic' && (
        <div className="shrink-0 px-4 py-2.5 border-b border-purple-500/15 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(139,92,246,0.06)" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <p className="text-[12px] text-purple-300 font-medium">مرحلة التشخيص — يبني معلمك خطتك التعليمية الشخصية</p>
          </div>
          <p className="text-[10px] text-purple-300/60">معلّم متخصّص يُصمَّم لك أنت — ليس إجابات عامة كـChatGPT.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-5 py-4 sm:py-5" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-4">
          {messages.map((msg, i) => {
            const isLastMsg = i === messages.length - 1;
            return (
              <div
                key={i}
                style={{ animation: 'msg-in 0.2s ease-out' }}
                className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center shadow-lg mb-0.5 ${
                  msg.role === 'user'
                    ? 'bg-white/10 border border-white/15'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white/60" />
                    : <Bot className="w-3.5 h-3.5 text-black" />
                  }
                </div>
                {/* Bubble */}
                <div style={{ direction: 'rtl' }} className={`min-w-0 ${msg.role === 'user' ? 'flex justify-start' : 'flex-1'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] max-sm:max-w-[calc(100vw-70px)] rounded-2xl rounded-br-none px-3 sm:px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed"
                      style={{ background: "linear-gradient(135deg, #1e2235 0%, #191c2a 100%)", border: "1px solid rgba(255,255,255,0.1)", overflowWrap: "break-word", wordBreak: "break-word", whiteSpace: "pre-wrap", width: "fit-content" }}>
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      <AIMessage
                        content={msg.content}
                        isStreaming={isStreaming && isLastMsg}
                        onCreateLabEnv={onCreateLabEnv}
                        onAnswerOption={isLastMsg && !isStreaming ? (ans) => sendTeachMessage(ans) : undefined}
                        imageMap={imageMap}
                      />
                      {/* Quick-action buttons under the latest AI message — let
                          the student ask for help in one tap. Only on the last
                          AI message, when not streaming, and only if the
                          message is long enough to be a real explanation
                          (skip short prompts like "ما اسمك؟"). */}
                      {isLastMsg && !isStreaming && msg.role === 'assistant' && (msg.content || '').length > 80 && (
                        <div className="mt-2 flex flex-wrap gap-1.5" style={{ direction: 'rtl' }}>
                          {[
                            { label: '🤔 لم أفهم تماماً', msg: 'لم أفهم تماماً، هل يمكنك إعادة الشرح بطريقة أبسط وأكثر تفصيلاً؟' },
                            { label: '🔁 اشرح بطريقة أخرى', msg: 'اشرح لي نفس الفكرة بطريقة مختلفة كلياً (تشبيه آخر أو مثال آخر).' },
                            { label: '📝 أعطني مثالاً آخر', msg: 'أعطني مثالاً تطبيقياً آخر مختلفاً عن الذي ذكرته.' },
                            { label: '✏️ لخّص بنقاط', msg: 'لخّص لي ما شرحته الآن في 3 نقاط مختصرة وواضحة.' },
                            { label: '🎯 اختبرني', msg: 'اختبرني بسؤال تطبيقي صعب على ما شرحته للتأكد من فهمي.' },
                          ].map((b) => (
                            <button
                              key={b.label}
                              onClick={() => sendTeachMessage(b.msg)}
                              className="text-[11px] sm:text-xs px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-white/70 hover:text-amber-200 transition-all"
                              title={b.msg}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {/* Typing indicator */}
          {isStreaming && messages[messages.length - 1]?.role === 'user' && (
            <div style={{ animation: 'msg-in 0.2s ease-out' }} className="flex items-end gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg mb-0.5">
                <Bot className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="rounded-2xl rounded-tr-none px-5 py-3.5 flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #131726 0%, #0f1220 100%)", borderLeft: "2px solid rgba(245,158,11,0.35)" }}>
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{animationDelay:'0.15s'}} />
                <span className="w-2 h-2 bg-gold/60 rounded-full animate-bounce" style={{animationDelay:'0.3s'}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/8 p-3 sm:p-4" style={{ background: "#0b0d17" }}>
        {/* Universal subject-specific suggested-prompt chips. Detected from
            the subject name/id so each domain gets relevant kick-off prompts.
            Always available (also when chat has progressed) so the student
            can pivot quickly. Generic fallback covers anything unknown. */}
        {!isStreaming && !chatGated && !quotaExhausted && (() => {
          const text = `${String(subject?.id || "")} ${String(subject?.name || "")}`.toLowerCase();
          const has = (re: RegExp) => re.test(text);
          let kind: string = "generic";
          if (has(/cyber|سيبران|أمن.*معلومات|اختراق/)) kind = "cybersecurity";
          else if (has(/web|ويب|تطبيق.*ويب|http/)) kind = "web-pentest";
          else if (has(/forensic|جنائي|رقمي.*جنائ/)) kind = "forensics";
          else if (has(/network|شبكات|tcp|ip|router/)) kind = "networking";
          else if (has(/linux|os|نظام.*تشغيل|kernel|طرفية/)) kind = "os";
          else if (has(/program|برمج|code|python|java|javascript|c\+\+/)) kind = "programming";
          else if (has(/data|بيانات|تحليل|إحصاء|machine|ذكاء.*اصطناع/)) kind = "data-science";
          else if (has(/food|أغذية|غذائي/)) kind = "food";
          else if (has(/yemensoft|يمن.*سوفت/)) kind = "yemensoft";
          else if (has(/account|محاسب|مالي/)) kind = "accounting";
          else if (has(/business|إدار|تسويق|اقتصاد|ريادة/)) kind = "business";
          else if (has(/physic|فيزياء/)) kind = "physics";
          else if (has(/lang|لغة|عرب|إنجليز|نحو|صرف|ترجمة/)) kind = "language";
          const SUGGESTIONS: Record<string, string[]> = {
            cybersecurity: ["ابنِ لي بيئة تطبيقية لمحاكاة هجوم تعليمي", "اشرح لي مفهوم XSS بمثال", "أعطني تمرين تشخيص ثغرة"],
            "web-pentest": ["ابنِ لي بيئة ويب فيها ثغرة لأكتشفها", "اشرح SQL Injection بمثال", "كيف أحمي تطبيقاً من CSRF؟"],
            forensics: ["ابنِ لي سيناريو تحقيق رقمي", "اشرح دور سجلات النظام في التحقيق", "ما خطوات استخراج الأدلة؟"],
            networking: ["ابنِ لي بيئة لتحليل حزم شبكة", "اشرح TCP handshake خطوة بخطوة", "كيف أصمم شبكة صغيرة؟"],
            os: ["ابنِ لي بيئة طرفية لينكس للتدرب", "اشرح صلاحيات الملفات", "كيف أدير العمليات في لينكس؟"],
            programming: ["ابنِ لي بيئة برمجة لحل مسألة", "اشرح الفرق بين stack و heap", "أعطني تمرين خوارزميات"],
            "data-science": ["ابنِ لي بيئة لاستكشاف dataset", "اشرح الفرق بين mean و median", "كيف أكتشف القيم الشاذة؟"],
            food: ["ابنِ لي بيئة محاكاة لمراقبة الجودة", "اشرح معايير سلامة الغذاء", "أعطني تمرين حسابات HACCP"],
            yemensoft: ["ابنِ لي بيئة تدريب على فاتورة بيع", "اشرح حركة المخزون", "كيف أُنشئ تقرير يومي؟"],
            accounting: ["ابنِ لي بيئة تدريب على القيود اليومية", "اشرح الميزانية العمومية", "أعطني تمرين ميزان مراجعة"],
            business: ["ابنِ لي محاكاة قرار إداري", "اشرح تحليل SWOT بمثال", "كيف أُقيم مشروعاً ناشئاً؟"],
            physics: ["ابنِ لي محاكاة لقانون نيوتن الثاني", "اشرح الفرق بين السرعة والتسارع", "أعطني تمرين على الطاقة"],
            language: ["ابنِ لي تمرين قواعد تفاعلي", "صحّح هذه الجملة وأشر للقاعدة", "أعطني نصاً للترجمة"],
            generic: ["ابنِ لي بيئة تطبيقية تفاعلية", "اشرح لي أهم مفهوم في هذه المادة", "أعطني تمريناً يناسب مستواي"],
          };
          const items = SUGGESTIONS[kind] || SUGGESTIONS.generic;
          return (
            <div className="max-w-2xl mx-auto mb-2 flex flex-wrap gap-1.5 justify-center" style={{ direction: "rtl" }}>
              {items.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendTeachMessage(q)}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/30 hover:border-cyan-400/60 text-cyan-200 hover:text-cyan-100 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          );
        })()}
        {/* Professor-mode starter chips — show only when chat is empty and we have starters */}
        {teachingMode === 'professor' && (activeMaterialStarters || activeMaterialWeakAreas.length > 0) && messages.length <= 1 && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-2.5 flex flex-wrap gap-1.5 justify-center" style={{ direction: "rtl" }}>
            {activeMaterialWeakAreas.length > 0 && (
              <button
                onClick={() => sendTeachMessage("ركّز على نقاط ضعفي")}
                title={activeMaterialWeakAreas.map(w => `${w.topic} (${w.missed})`).join("، ")}
                className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500/70 text-rose-200 transition-all font-bold"
              >
                ركّز على نقاط ضعفي ({activeMaterialWeakAreas.length})
              </button>
            )}
            {activeMaterialStarters && activeMaterialStarters
              .split('\n')
              .map(s => s.replace(/^[•\-\*\d+\.\)]\s*/, '').trim())
              .filter(s => s.length > 5)
              .slice(0, 4)
              .map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendTeachMessage(q)}
                  className="text-[11px] sm:text-xs px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/60 text-amber-200 transition-all"
                >
                  {q}
                </button>
              ))}
          </div>
        )}
        {messages.length >= 2 && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-2.5 flex justify-center">
            <button
              onClick={handleEndSession}
              className="text-sm font-bold text-amber-300 hover:text-amber-200 transition-all flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
            >
              <FileText className="w-4 h-4" />
              إنهاء الجلسة وحفظ الملخص
            </button>
          </div>
        )}
        {streamTruncated && !isStreaming && !diagnosticIncomplete && (
          <div className="max-w-2xl mx-auto mb-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 shadow-lg shadow-amber-500/10">
            <div className="text-amber-200 text-sm font-bold mb-2">
              ⚠️ يبدو أن ردّ المعلّم انقطع قبل أن يكتمل
            </div>
            <div className="text-amber-100/90 text-sm mb-3 leading-relaxed">
              قد يكون السبب ضعفاً مؤقّتاً في الاتصال. اضغط الزر أدناه لإعادة إرسال آخر رسالة وإكمال الفكرة.
            </div>
            <button
              onClick={() => {
                // Pop the truncated assistant bubble and the user message
                // that produced it, then re-send so the model starts the
                // reply over from a clean slate. We capture the message
                // text first because clearing state is async.
                const lastMsg = streamTruncated.lastUserMessage;
                setStreamTruncated(null);
                setMessages(prev => {
                  const nm = [...prev];
                  // Drop trailing assistant bubble if present.
                  if (nm.length > 0 && nm[nm.length - 1].role === 'assistant') nm.pop();
                  // Drop the matching user bubble so sendTeachMessage can
                  // re-add it cleanly without producing a duplicate.
                  if (nm.length > 0 && nm[nm.length - 1].role === 'user') nm.pop();
                  return nm;
                });
                setTimeout(() => sendTeachMessage(lastMsg, stages, currentStage, false), 100);
              }}
              className="text-sm font-bold text-amber-100 hover:text-white transition-all px-4 py-2 rounded-lg bg-amber-500/40 hover:bg-amber-500/60 border border-amber-400/50"
            >
              أعد إرسال آخر رسالة
            </button>
          </div>
        )}
        {diagnosticIncomplete && !isStreaming && (
          <div className="max-w-2xl mx-auto mb-3 p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 shadow-lg shadow-rose-500/10">
            <div className="text-rose-200 text-sm font-bold mb-2">
              ⚠️ يبدو أن الخطة لم تكتمل
            </div>
            <div className="text-rose-100/90 text-sm mb-3 leading-relaxed">
              لم تصل علامة نهاية الخطة من المعلم — قد تكون انقطعت أثناء التوليد. اضغط الزر أدناه لإعادة بناء الخطة من جديد.
            </div>
            <button
              onClick={() => {
                setDiagnosticIncomplete(false);
                setMessages([]);
                setCustomPlan(null);
                setChatPhase('diagnostic');
                setPendingTeachStart(false);
                // Re-run the diagnostic from a clean slate. The higher
                // max_tokens ceiling on the backend now makes truncation
                // very unlikely on the second pass.
                setTimeout(() => sendTeachMessage("", stages, 0, true), 200);
              }}
              className="text-sm font-bold text-rose-100 hover:text-white transition-all px-4 py-2 rounded-lg bg-rose-500/40 hover:bg-rose-500/60 border border-rose-400/50"
            >
              أعد بناء الخطة
            </button>
          </div>
        )}
        <form
          className="max-w-2xl mx-auto flex items-end gap-2.5"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 144) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={chatGated ? "اختر طريقة التعلّم أولاً..." : quotaExhausted ? "انتهى رصيدك — يرجى تجديد الاشتراك" : "اكتب رسالتك للمعلم..."}
            disabled={isStreaming || quotaExhausted || chatGated}
            style={{
              minHeight: "48px",
              maxHeight: "144px",
              resize: "none",
              direction: "rtl",
              background: "#131726",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            className="flex-1 px-4 py-3 rounded-2xl text-[15px] leading-relaxed outline-none focus:border-gold/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)] disabled:opacity-40 text-white placeholder:text-white/25 overflow-y-auto transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || quotaExhausted || chatGated}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: input.trim() && !isStreaming && !quotaExhausted ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(245,158,11,0.15)", boxShadow: input.trim() && !isStreaming && !quotaExhausted ? "0 4px 15px rgba(245,158,11,0.3)" : "none" }}
          >
            <Send className="w-4.5 h-4.5 text-black" style={{ width: "18px", height: "18px" }} />
          </button>
        </form>
        <p className="text-center text-[10px] text-white/15 mt-1.5 max-w-2xl mx-auto" style={{ direction: "rtl" }}>
          Ctrl+Enter للإرسال السريع
        </p>
      </div>

      </>)}
    </div>
    </>
  );
}
