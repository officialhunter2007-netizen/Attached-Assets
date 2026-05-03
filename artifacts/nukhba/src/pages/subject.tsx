import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { writeUserJson, readUserJson, removeUserKey } from "@/lib/user-storage";
import { enhanceTeacherDom, extractMathBlocks, restoreMathPlaceholders } from "@/lib/teacher-render";
import { loadDraft, makeDebouncedDraftSaver, clearDraft } from "@/lib/draft-storage";
import { isSpeechRecognitionSupported, isSpeechSynthesisSupported, startRecognition, speakText, stopSpeaking, isSpeaking } from "@/lib/web-speech";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { useParams, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/lib/use-auth";
import { getSubjectById } from "@/lib/curriculum";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@workspace/api-client-react";
import { useGetLessonViews } from "@workspace/api-client-react";
import { Send, Bot, User, Sparkles, Loader2, Lock, FileText, ChevronDown, ChevronUp, Plus, Clock, Trophy, RefreshCw, Calendar, Code2, ArrowRight, CheckCircle2, X, FlaskConical, MoreHorizontal, BookMarked, GraduationCap, Lightbulb, Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, Share2, Mic, MicOff, ImagePlus, Pause, Play, RotateCcw, Download, ZoomIn, ZoomOut, Map as MapIcon, Gauge } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
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

interface PlanStage {
  title: string;
  descHtml: string;
  duration: string;
  objectives: string[];
  microSteps: string[];
  deliverable: string;
  masteryCriterion: string;
  reasonForStudent: string;
  prerequisite: string;
}

// ── Depth-aware HTML helpers ─────────────────────────────────────────────────
// Regex with non-greedy `[\s\S]*?` stops at the FIRST closing tag it sees —
// which is always a nested inner tag, not the intended outer one. These helpers
// walk the string tracking open/close depth instead.

function getOutermostOlContent(html: string): string | null {
  const start = html.indexOf('<ol');
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;
  let depth = 1;
  let pos = tagEnd + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf('<ol', pos);
    const nextClose = html.indexOf('</ol>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 3;
    } else {
      depth--;
      if (depth === 0) return html.slice(tagEnd + 1, nextClose);
      pos = nextClose + 5;
    }
  }
  return null;
}

function getTopLevelLiItems(olContent: string): string[] {
  const items: string[] = [];
  let i = 0;
  while (i < olContent.length) {
    const liStart = olContent.indexOf('<li', i);
    if (liStart === -1) break;
    const tagEnd = olContent.indexOf('>', liStart);
    if (tagEnd === -1) break;
    let depth = 1;
    let pos = tagEnd + 1;
    let found = false;
    while (pos < olContent.length) {
      const nextOpen = olContent.indexOf('<li', pos);
      const nextClose = olContent.indexOf('</li>', pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 3;
      } else {
        depth--;
        if (depth === 0) {
          items.push(olContent.slice(tagEnd + 1, nextClose));
          i = nextClose + 5;
          found = true;
          break;
        }
        pos = nextClose + 5;
      }
    }
    if (!found) break;
  }
  return items;
}

// extractClassedList and extractClassedText operate on a single stage's inner
// HTML, where sub-lists (stage-objectives, stage-microsteps) don't contain
// further nested <ul>/<ol>. The regex is safe at this level.
function extractClassedList(html: string, cls: string): string[] {
  const re = new RegExp(`class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:ul|ol)>`, 'i');
  const m = html.match(re);
  if (!m) return [];
  const items: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = liRe.exec(m[1])) !== null) {
    items.push(lm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return items;
}

function extractClassedText(html: string, cls: string): string {
  const re = new RegExp(`class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:p|div|span)>`, 'i');
  const m = html.match(re);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parsePlanStages(planHtml: string | null): PlanStage[] {
  if (!planHtml) return [];
  try {
    const olContent = getOutermostOlContent(planHtml);
    if (!olContent) return [];
    const liItems = getTopLevelLiItems(olContent);
    const items: PlanStage[] = [];
    for (const inner of liItems) {
      const strong = inner.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? '';
      const em = inner.match(/<em[^>]*>([\s\S]*?)<\/em>/i)?.[1] ?? '';
      const cleanTitle = strong.replace(/<[^>]+>/g, '').trim().replace(/^المرحلة\s*\d+\s*[—\-:]\s*/, '');
      const cleanDuration = em.replace(/<[^>]+>/g, '').replace(/^المدة[:\s]*/i, '').trim();
      const objectives = extractClassedList(inner, 'stage-objectives');
      const microSteps = extractClassedList(inner, 'stage-microsteps');
      const deliverable = extractClassedText(inner, 'stage-deliverable');
      const masteryCriterion = extractClassedText(inner, 'stage-mastery');
      const reasonForStudent = extractClassedText(inner, 'stage-reason');
      const prerequisite = extractClassedText(inner, 'stage-prerequisite');
      const descHtml = inner
        .replace(/<strong[^>]*>[\s\S]*?<\/strong>/gi, '')
        .replace(/<em[^>]*>[\s\S]*?<\/em>/gi, '')
        .trim();
      if (!cleanTitle && objectives.length === 0 && microSteps.length === 0) continue;
      items.push({
        title: cleanTitle || `مرحلة ${items.length + 1}`,
        descHtml,
        duration: cleanDuration,
        objectives,
        microSteps,
        deliverable,
        masteryCriterion,
        reasonForStudent,
        prerequisite,
      });
    }
    return items;
  } catch { return []; }
}

// ── LearningContractCard ──────────────────────────────────────────────────────
// Shown after [PLAN_READY] fires so the student can review and accept (or ask
// to revise) the personalised plan before the teacher auto-starts Phase 1.
const REVISION_OPTIONS = [
  {
    key: "easier",
    label: "الخطة صعبة — أريدها أبسط",
    msg: "الخطة المقترحة صعبة جداً بالنسبة لمستواي الحالي. أريد إعادة بنائها بمستوى أبسط يتدرج بشكل تدريجي، مع تقليل عدد الخطوات الفرعية في كل مرحلة وإضافة وقت أكبر لكل مرحلة.",
  },
  {
    key: "harder",
    label: "الخطة سهلة — أريدها أعمق وأشمل",
    msg: "أريد خطة أعمق وأكثر تحدياً تناسب مستواي. زد من الأهداف في كل مرحلة وأضف موضوعات متقدمة وقلل المدة الزمنية لكل مرحلة.",
  },
  {
    key: "fewer_stages",
    label: "المراحل كثيرة — أريد خطة أقصر",
    msg: "عدد المراحل كبير. أريد دمج المراحل المتشابهة للوصول إلى الهدف بشكل أسرع — حافظ على 5–6 مراحل.",
  },
  {
    key: "add_topic",
    label: "أريد التأكد من تغطية موضوع بعينه",
    msg: "هناك موضوع خاص أريد التأكد من تغطيته في الخطة. ناقشني أولاً لتحديد المواضيع المطلوبة وبناءً على إجاباتي أعد الخطة من جديد.",
  },
];

function LearningContractCard({
  planHtml,
  onAccept,
  onRequestRevision,
}: {
  planHtml: string;
  onAccept: () => void;
  onRequestRevision: (msg: string) => void;
}) {
  const [showRevision, setShowRevision] = useState(false);
  const [expandedContractStage, setExpandedContractStage] = useState<number>(-1);
  const stages = parsePlanStages(planHtml);

  if (showRevision) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", direction: "rtl" }}>
        <div className="rounded-2xl border border-amber-500/30 bg-[#16120e] shadow-2xl max-w-md w-full p-5 space-y-3">
          <div className="font-bold text-white text-[15px] mb-0.5">ما نوع التعديل المطلوب؟</div>
          <div className="text-[12px] text-white/45 mb-2">اختر البُعد الذي تريد تعديله وسيعيد المعلم بناء الخطة بناءً على إجاباتك التشخيصية</div>
          {REVISION_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onRequestRevision(opt.msg)}
              className="w-full text-right px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[13px] text-white transition-colors"
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowRevision(false)}
            className="w-full text-center pt-1 pb-0.5 text-[12px] text-white/35 hover:text-white/60 transition-colors"
          >
            رجوع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.80)", direction: "rtl" }}>
      <div className="rounded-2xl border border-amber-500/30 bg-[#16120e] shadow-2xl max-w-md w-full p-5 space-y-4 max-h-[90dvh] overflow-y-auto">
        <div className="text-center space-y-1">
          <div className="text-2xl font-black text-white">خطتك الشخصية جاهزة 🎯</div>
          <div className="text-[12px] text-white/55">راجع المراحل بالتفصيل وأعلمنا موافقتك لنبدأ التعليم فوراً</div>
        </div>
        {stages.length > 0 && (
          <ol className="space-y-1.5">
            {stages.map((s, idx) => {
              const open = expandedContractStage === idx;
              return (
                <li key={idx} className="rounded-xl border border-white/10 bg-white/[0.025] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedContractStage(open ? -1 : idx)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-right"
                  >
                    <span className="shrink-0 w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[11px] font-bold text-amber-200">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[13px] text-white leading-tight">{s.title}</div>
                      {s.duration && <div className="text-[10px] text-white/35 mt-0.5">{s.duration}</div>}
                    </div>
                    <span className="shrink-0 text-[10px] text-white/30">{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-0.5 space-y-2 border-t border-white/[0.06]">
                      {s.objectives.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-amber-300/70 mb-0.5">الأهداف</div>
                          <ul className="space-y-0.5">
                            {s.objectives.map((o, oi) => (
                              <li key={oi} className="text-[11px] text-white/65 flex gap-1.5">
                                <span className="text-amber-400/50 shrink-0">•</span>{o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {s.microSteps.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-purple-300/70 mb-0.5">الخطوات الفرعية</div>
                          <ol className="space-y-0.5">
                            {s.microSteps.map((step, si) => (
                              <li key={si} className="text-[11px] text-white/60 flex gap-1.5">
                                <span className="shrink-0 w-3.5 h-3.5 rounded-full bg-white/8 flex items-center justify-center text-[8px] font-bold text-white/40 mt-0.5">{si + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {s.masteryCriterion && (
                        <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-2 py-1.5">
                          <div className="text-[10px] font-bold text-amber-300/70 mb-0.5">معيار الإتقان</div>
                          <div className="text-[11px] text-amber-100/75">{s.masteryCriterion}</div>
                        </div>
                      )}
                      {s.deliverable && (
                        <div className="text-[10px] text-white/45">
                          <span className="font-bold text-white/55">المُخرَج: </span>{s.deliverable}
                        </div>
                      )}
                      {s.reasonForStudent && (
                        <div className="rounded-lg bg-purple-500/8 border border-purple-500/20 px-2 py-1.5">
                          <div className="text-[10px] font-bold text-purple-300/70 mb-0.5">لماذا هذه المرحلة لك</div>
                          <div className="text-[11px] text-purple-100/70">{s.reasonForStudent}</div>
                        </div>
                      )}
                      {s.prerequisite && (
                        <div className="text-[10px] text-white/35">
                          <span className="font-bold text-white/45">المتطلب القبلي: </span>{s.prerequisite}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-[14px] transition-colors"
          >
            أعتمد الخطة وأبدأ ✓
          </button>
          <button
            type="button"
            onClick={() => setShowRevision(true)}
            className="flex-1 py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white font-bold text-[14px] transition-colors"
          >
            أريد تعديلاً
          </button>
        </div>
      </div>
    </div>
  );
}

function LearningPathPanel({
  planHtml,
  currentStage,
  totalStages,
  completedMicroSteps,
  growthReflections,
  onJumpToStage,
}: {
  planHtml: string | null;
  currentStage: number;
  totalStages: number;
  completedMicroSteps?: number[];
  growthReflections?: Array<{ stageIndex: number; text: string; date: string }>;
  onJumpToStage?: (stageIndex: number, stageTitle: string) => void;
}) {
  const [expandedStage, setExpandedStage] = useState<number>(currentStage);
  useEffect(() => { setExpandedStage(currentStage); }, [currentStage]);

  const activeStageRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!planHtml) return null;
  const stages = parsePlanStages(planHtml);
  if (stages.length === 0) return null;
  const effectiveTotal = totalStages || stages.length;
  const progressPct = Math.min(100, Math.round((currentStage / Math.max(effectiveTotal, 1)) * 100));

  // Circular progress ring — pure SVG. r=28 → C ≈ 175.93.
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (progressPct / 100) * c;

  return (
    <div className="px-4 py-4 space-y-4" style={{ direction: "rtl" }}>
      {/* Overall progress: ring + headline */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-purple-500/8 border border-amber-500/20">
        <div className="relative w-16 h-16 shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
            <circle
              cx="32" cy="32" r={r}
              stroke="url(#pathGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 0.4s ease-out" }}
            />
            <defs>
              <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-amber-200 tabular-nums">
            {progressPct}%
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-amber-300/80 font-bold mb-0.5">التقدّم العام</div>
          <div className="text-[13px] font-bold text-white truncate">
            {stages[Math.min(currentStage, stages.length - 1)]?.title || ''}
          </div>
          <div className="text-[10px] text-white/50 mt-0.5">
            المرحلة {Math.min(currentStage + 1, stages.length)} من {stages.length}
          </div>
        </div>
      </div>

      {/* Per-stage list: expandable rows */}
      <ol className="space-y-2">
        {stages.map((s, idx) => {
          const isActive = idx === currentStage;
          const isDone = idx < currentStage;
          const isLocked = idx > currentStage;
          const isExpanded = expandedStage === idx;
          const status = isDone ? "مكتملة" : isActive ? "الحالية" : "مقفلة";
          const microTotal = s.microSteps.length;
          const completedCount = isActive
            ? (completedMicroSteps?.length ?? 0)
            : (isDone ? microTotal : 0);
          return (
            <li
              key={idx}
              ref={isActive ? activeStageRef : undefined}
              className={`rounded-xl border transition-all ${
                isActive
                  ? "bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10"
                  : isDone
                    ? "bg-emerald-500/[0.06] border-emerald-500/25"
                    : "bg-white/[0.03] border-white/10"
              }`}
            >
              {/* Stage header row — click to expand/collapse */}
              <button
                type="button"
                onClick={() => setExpandedStage(isExpanded ? -1 : idx)}
                className="w-full text-right px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black ${
                    isActive
                      ? "bg-amber-500 text-black"
                      : isDone
                        ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
                        : "bg-white/8 text-white/50 border border-white/10"
                  }`}>
                    {isDone ? "✓" : isLocked ? "🔒" : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-[13px] ${isActive ? "text-white" : isDone ? "text-emerald-100" : "text-white/70"}`}>
                        {s.title}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-amber-500/30 text-amber-100 border border-amber-400/40"
                          : isDone
                            ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                            : "bg-white/5 text-white/40 border border-white/10"
                      }`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {s.duration && (
                        <span className="text-[10px] inline-block bg-purple-500/15 border border-purple-400/25 text-purple-200 rounded-full px-2 py-0.5">
                          ⏱ {s.duration}
                        </span>
                      )}
                      {microTotal > 0 && (
                        <span className="text-[10px] text-white/40 tabular-nums">
                          {completedCount}/{microTotal} خطوة
                        </span>
                      )}
                    </div>
                    {/* Micro-step progress bar */}
                    {microTotal > 0 && (isActive || isDone) && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isActive ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.round((completedCount / microTotal) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 self-center text-[10px] ml-1 ${isExpanded ? "text-amber-300" : "text-white/25"}`}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded detail: all 6 contract fields — visible for every stage */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.06] pt-2.5">
                  {s.objectives.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-amber-300/70 mb-1">الأهداف القابلة للقياس</div>
                      <ul className="space-y-1">
                        {s.objectives.map((obj, oi) => (
                          <li key={oi} className="text-[11px] text-white/70 flex gap-1.5">
                            <span className="text-amber-400/60 shrink-0">•</span>{obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.microSteps.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-purple-300/70 mb-1">الخطوات التفصيلية</div>
                      <ol className="space-y-1">
                        {s.microSteps.map((step, si) => {
                          const done = isDone || (isActive && (completedMicroSteps ?? []).includes(si));
                          return (
                            <li key={si} className={`text-[11px] flex gap-1.5 ${done ? "text-emerald-300/80" : isLocked ? "text-white/40" : "text-white/60"}`}>
                              <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                                done ? "bg-emerald-500/30 text-emerald-200" : "bg-white/8 text-white/40"
                              }`}>{done ? "✓" : si + 1}</span>
                              {step}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                  {s.masteryCriterion && (
                    <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-2.5 py-2">
                      <div className="text-[10px] font-bold text-amber-300/70 mb-0.5">معيار الإتقان</div>
                      <div className={`text-[11px] ${isLocked ? "text-amber-100/50" : "text-amber-100/80"}`}>{s.masteryCriterion}</div>
                    </div>
                  )}
                  {s.deliverable && (
                    <div className="text-[10px] text-white/50">
                      <span className="font-bold text-white/60">المُخرَج: </span>{s.deliverable}
                    </div>
                  )}
                  {s.reasonForStudent && (
                    <div className="rounded-lg bg-purple-500/8 border border-purple-500/20 px-2.5 py-2">
                      <div className="text-[10px] font-bold text-purple-300/70 mb-0.5">لماذا هذه المرحلة لك</div>
                      <div className={`text-[11px] ${isLocked ? "text-purple-100/40" : "text-purple-100/70"}`}>{s.reasonForStudent}</div>
                    </div>
                  )}
                  {s.prerequisite && (
                    <div className="text-[10px] text-white/40">
                      <span className="font-bold text-white/50">المتطلب القبلي: </span>{s.prerequisite}
                    </div>
                  )}
                </div>
              )}

              {/* Jump-to-stage button */}
              {!isActive && onJumpToStage && (
                <div className="px-3 pb-2.5">
                  <button
                    type="button"
                    onClick={() => onJumpToStage(idx, s.title)}
                    className={`w-full text-[11px] font-bold py-1.5 rounded-lg border transition-all ${
                      isDone
                        ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-100"
                        : "bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30 text-amber-200"
                    }`}
                  >
                    {isDone ? "↻ راجع هذه المرحلة" : "اقفز هنا ←"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Growth reflections: what the student demonstrated at stage-complete moments */}
      {growthReflections && growthReflections.length > 0 && (
        <div className="px-4 pt-2 pb-4 space-y-2">
          <div className="text-[10px] font-bold text-emerald-300/70 mb-1.5">🌱 نمو المهارات</div>
          {growthReflections.slice(-5).map((g, i) => (
            <div key={i} className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-2.5 py-2">
              <div className="text-[9px] text-emerald-300/50 mb-0.5">المرحلة {g.stageIndex + 1} — {new Date(g.date).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}</div>
              <div className="text-[11px] text-emerald-100/75 leading-relaxed">{g.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Client-side mirror of the server's LAB_ENV_INTENT_RE. Used to detect
// natural-language lab-environment requests typed into the chat input so we
// can set labIntakeActiveRef before the model responds — matching the same
// detection the server uses so [[LAB_INTAKE_DONE]] is never silently ignored.
const LAB_INTENT_RE = /(?:أريد|اريد|ابن[ِيه]?|اعمل|انشئ|أنشئ|ابدأ)\s*(?:لي\s*)?(?:بيئة|محاكاة|مختبر|سيناريو|تطبيق)\s*(?:تطبيقي[ةه]?|عملي[ةه]?|تفاعلي[ةه]?|تدريبي[ةه]?|مخصص[ةه]?)?/u;

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
    // user.id is a numeric DB row id; the user-storage helpers expect the
    // stringified form (so the same code path also works for guest sessions
    // that store IDs as strings). Cast at every boundary call.
    if (env) writeUserJson(String(user.id), dynamicEnvStorageSuffix, env);
    else removeUserKey(String(user.id), dynamicEnvStorageSuffix);
  }, [user?.id, dynamicEnvStorageSuffix]);
  // On mount / when user or subject changes, restore any saved env so a
  // page reload or accidental close still finds the previous lab.
  useEffect(() => {
    if (!user?.id || !dynamicEnvStorageSuffix) return;
    const saved = readUserJson<any | null>(String(user.id), dynamicEnvStorageSuffix, null);
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

  type SubjectAccessInfo = {
    hasAccess: boolean;
    isFirstLesson: boolean;
    hasSubjectSubscription: boolean;
    subjectSubExpired: boolean;
    expiredRecently: boolean;
    gemsBalance: number;
    dailyRemaining: number;
    gemsExpiresAt: string | null;
  };
  const [subjectAccessInfo, setSubjectAccessInfo] = useState<SubjectAccessInfo | null>(null);

  const refetchSubjectAccess = async () => {
    if (!subject?.id) return;
    try {
      const r = await fetch(`/api/subscriptions/subject-access?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" });
      if (!r.ok) { setSubjectAccessInfo(null); return; }
      setSubjectAccessInfo(await r.json());
    } catch {
      setSubjectAccessInfo(null);
    }
  };

  useEffect(() => {
    refetchSubjectAccess();
    const onGems = () => refetchSubjectAccess();
    window.addEventListener("nukhba:gems-changed", onGems);
    return () => window.removeEventListener("nukhba:gems-changed", onGems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id]);

  // Server verdict drives the renew wall; legacy inline check is the
  // fallback while the access fetch is still in flight.
  const isSubscriptionExpired = subjectAccessInfo
    ? (subjectAccessInfo.subjectSubExpired && !subjectAccessInfo.hasAccess)
    : !!(
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
      // Force-close every interactive panel so the renew wall is the only
      // surface the student can interact with.
      setIsChatOpen(false);
      setIsIDEOpen(false);
      setIsLabOpen(false);
      setIsYemenSoftOpen(false);
      setIsAccountingLabOpen(false);
      setIsDynamicEnvOpen(false);
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
                : "sm:w-[96vw] sm:max-w-[1400px] sm:h-[95vh] sm:rounded-3xl"}
              w-full p-0 flex flex-col gap-0 overflow-hidden border shadow-lg
              bg-[#080a11] border-white/8
            `}
          >

            {/* Header */}
            <div className="shrink-0 border-b border-white/8" style={{ background: "linear-gradient(180deg, #0f1220 0%, #080a11 100%)" }}>
              {/* Top bar — collapsed to ~44px (was ~64px) to give the chat more
                  vertical room. Avatar shrunk 10→8, paddings reduced, label
                  font sizes bumped down one notch. */}
              <div className="px-3 py-1.5 flex items-center justify-between">
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
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${subject.colorFrom} ${subject.colorTo} flex items-center justify-center shadow-md shrink-0`}>
                        <span className="text-sm">{subject.emoji}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-sm leading-tight truncate max-w-[55vw] sm:max-w-[280px]">معلم {subject.name}</p>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          متصل
                        </span>
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
              onCreateLabEnv={async (description: string, spec?: object) => {
                console.log("[create-lab-env] click; isCreatingEnv=", isCreatingEnv, "spec=", !!spec);
                if (isCreatingEnv) return;
                setCreateEnvError(null);
                setIsCreatingEnv(true);
                // Spec builds get a silent automatic retry (up to 2 total attempts)
                // before surfacing any error to the student. Legacy description builds
                // (no spec) only get one attempt since they already have their own
                // internal retry chain inside build-env.
                const maxAttempts = spec ? 2 : 1;
                let lastErr: Error | null = null;
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                  try {
                    const body = spec
                      ? { subjectId: subject!.id, spec }
                      : { subjectId: subject!.id, description };
                    const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/build-env`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(body),
                    });
                    console.log(`[create-lab-env] response attempt ${attempt}:`, r.status);
                    if (!r.ok) {
                      const errText = await r.text().catch(() => "");
                      lastErr = new Error(`فشل بناء البيئة (${r.status}): ${errText.slice(0, 200)}`);
                      if (attempt < maxAttempts) {
                        console.warn("[create-lab-env] retrying after failure on attempt", attempt);
                        await new Promise((res) => setTimeout(res, 1500));
                        continue;
                      }
                      break;
                    }
                    const data = await r.json();
                    if (data.env) {
                      setPendingDynamicEnv(data.env);
                      setIsDynamicEnvOpen(true);
                      setIsLabOpen(false);
                      setIsYemenSoftOpen(false);
                      setIsAccountingLabOpen(false);
                      lastErr = null;
                      break; // success
                    } else {
                      lastErr = new Error("الاستجابة لا تحتوي على بيئة صالحة");
                      if (attempt < maxAttempts) {
                        await new Promise((res) => setTimeout(res, 1500));
                        continue;
                      }
                      break;
                    }
                  } catch (e: unknown) {
                    lastErr = e instanceof Error ? e : new Error(String(e));
                    console.error(`[create-lab-env] attempt ${attempt} threw:`, lastErr.message);
                    if (attempt < maxAttempts) {
                      await new Promise((res) => setTimeout(res, 1500));
                    }
                  }
                }
                if (lastErr) {
                  console.error("[create-lab-env] all attempts failed:", lastErr.message);
                  setCreateEnvError(lastErr.message || "حدث خطأ غير متوقع أثناء بناء البيئة");
                }
                setIsCreatingEnv(false);
              }}
              isCreatingEnv={isCreatingEnv}
              onStartLabEnvIntent={() => setPendingLabStarter("[LAB_INTAKE_START]")}
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

        {/* Lab intake start confirmation modal */}
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
                <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-xl shrink-0">🧪</div>
                <div className="flex-1">
                  <h3 className="text-white font-extrabold text-lg mb-1">بناء بيئة تطبيقية مخصصة</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    سيطرح عليك المعلم الذكي ٥ أسئلة سريعة لفهم ما تريد التدرّب عليه، ثم يُجهّز لك بيئة تطبيقية مصمّمة خصيصاً لك.
                  </p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-xs text-muted-foreground leading-relaxed">
                ⏱️ تستغرق الأسئلة أقل من دقيقة — ستكون البيئة جاهزة بعدها مباشرة.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setChatStarter(pendingLabStarter!);
                    setPendingLabStarter(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gold text-slate-900 font-bold hover:bg-gold/90 transition-colors text-sm"
                >
                  ابدأ الأسئلة
                </button>
                <button
                  onClick={() => setPendingLabStarter(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-sm"
                >
                  إلغاء
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
  const firedRef = useRef(false);

  useEffect(() => {
    // Reset the "already fired" latch when the deadline changes (e.g. a
    // new per-subject session sets a different `until`), so onExpired can
    // fire again for the new countdown.
    firedRef.current = false;
    const tick = () => {
      const remaining = Math.max(0, new Date(until).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        // Nudge the rest of the app to re-fetch the gems wallet — the
        // overlay should only clear once the server has actually rolled
        // over the daily allowance for the new Yemen day.
        try { window.dispatchEvent(new Event("nukhba:gems-changed")); } catch {}
        onExpired?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  // Cap hours at 23 — `dailyLimitUntil` is always the next Yemen midnight,
  // so we should never display "47:00:00" even if a clock skew or stale
  // `until` value temporarily produces a larger raw delta.
  const hoursRaw = Math.floor(timeLeft / 3600000);
  const hours = Math.min(23, hoursRaw);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex flex-col items-center gap-2">
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
      <p className="text-[11px] text-muted-foreground/70">بتوقيت اليمن (UTC+3)</p>
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
  // Math is extracted as plain ASCII placeholders BEFORE marked + DOMPurify,
  // then restored AFTER sanitization with pre-rendered KaTeX HTML. This keeps
  // KaTeX's inline styles (vertical-align, padding, etc.) intact since they
  // bypass `stripInlineStyles` and DOMPurify's attribute filter.
  const { text: withMathStripped, blocks } = extractMathBlocks(withImages);
  const html = marked.parse(stripInlineStyles(unwrapHtmlCodeFences(withMathStripped))) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-build-env', 'target', 'data-image-id', 'loading'],
    ADD_TAGS: ['button', 'figure', 'figcaption'],
  });
  return restoreMathPlaceholders(stripBrokenButtonCodeSpans(sanitized), blocks);
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
  // Math extraction runs mid-stream too: only complete `$$..$$` and `$..$`
  // blocks match the regex, so partial spans never get rendered. The user
  // sees raw `$...` until the closing `$` arrives — better than rendering
  // half-formed TeX or stalling the stream.
  const { text: withMathStripped, blocks } = extractMathBlocks(withImages);
  const cleaned = unwrapHtmlCodeFences(withMathStripped);
  const html = marked.parse(stripInlineStyles(cleaned)) as string;
  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['data-build-env', 'target', 'data-image-id', 'loading'],
    ADD_TAGS: ['button', 'figure', 'figcaption'],
  });
  return restoreMathPlaceholders(sanitized, blocks);
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

// ─────────────────────────────────────────────────────────────────────────────
// Session-UI helpers: elapsed timer hook, per-message action toolbar,
// welcome empty-state, and unified error state. Purely presentational —
// streaming, [[CREATE_LAB_ENV]], [[IMAGE:id]], gem accounting and stage
// flow remain in the parent component.
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// Ticks once per second whenever `running && !paused`. We accumulate elapsed
// on a ref so pause/resume don't lose progress; the state mirrors the ref
// for re-render. `reset()` clears both ref + state.
function useElapsedTimer(running: boolean, paused: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const accRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || paused) {
      if (startedAtRef.current !== null) {
        accRef.current += (Date.now() - startedAtRef.current) / 1000;
        startedAtRef.current = null;
        setElapsed(accRef.current);
      }
      return;
    }
    startedAtRef.current = Date.now();
    const id = setInterval(() => {
      if (startedAtRef.current === null) return;
      const live = accRef.current + (Date.now() - startedAtRef.current) / 1000;
      setElapsed(live);
    }, 1000);
    return () => {
      clearInterval(id);
      if (startedAtRef.current !== null) {
        accRef.current += (Date.now() - startedAtRef.current) / 1000;
        startedAtRef.current = null;
      }
    };
  }, [running, paused]);

  const reset = useCallback(() => {
    accRef.current = 0;
    startedAtRef.current = running && !paused ? Date.now() : null;
    setElapsed(0);
  }, [running, paused]);

  return { elapsed, reset };
}

// Strips HTML tags and KaTeX/code artifacts from a teacher message so the
// browser TTS engine doesn't read out "less-than slash p greater-than".
function plainTextFromHtmlContent(raw: string): string {
  if (!raw) return "";
  // Drop fenced code blocks entirely (TTS would mangle them).
  let s = raw.replace(/```[\s\S]*?```/g, " ");
  // Drop our internal markers so they don't get spoken.
  s = s.replace(/\[\[(?:CREATE_LAB_ENV|ASK_OPTIONS|IMAGE|PLAN_READY)[^\]]*\]\]/gi, " ");
  // Strip raw HTML tags.
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = s;
    s = tmp.textContent || tmp.innerText || "";
  } else {
    s = s.replace(/<[^>]*>/g, " ");
  }
  return s.replace(/\s+/g, " ").trim();
}

const MessageToolbar = memo(function MessageToolbar({
  content,
  onRegenerate,
  onShare,
  onRate,
  canRegenerate,
  ratingKey,
}: {
  content: string;
  onRegenerate?: () => void;
  onShare?: () => void;
  onRate?: (value: "up" | "down") => void;
  canRegenerate: boolean;
  ratingKey?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "playing">("idle");
  // Ratings are persisted to localStorage under `nukhba.feedback.<key>` so
  // a thumbs-up/down survives reload, remount, and tab close. The backend
  // POST is best-effort/admin-side; the local cache is what the UI shows.
  const [rated, setRated] = useState<null | "up" | "down">(() => {
    if (typeof window === "undefined" || !ratingKey) return null;
    try {
      const v = window.localStorage.getItem(`nukhba.feedback.${ratingKey}`);
      return v === "up" || v === "down" ? v : null;
    } catch { return null; }
  });

  const ttsAvailable = isSpeechSynthesisSupported();

  // Stop any in-flight TTS only on component unmount (not on each state
  // change — otherwise the cleanup from the `loading` render would abort
  // playback the moment `onPlay` flips state to `playing`).
  const ttsStateRef = useRef<"idle" | "loading" | "playing">("idle");
  useEffect(() => { ttsStateRef.current = ttsState; }, [ttsState]);
  useEffect(() => () => { if (ttsStateRef.current !== "idle") stopSpeaking(); }, []);

  const handleCopy = useCallback(async () => {
    const txt = plainTextFromHtmlContent(content);
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [content]);

  const handleShare = useCallback(async () => {
    const txt = plainTextFromHtmlContent(content);
    const payload = `${txt}\n\n— من جلسة نُخبة\n${typeof window !== "undefined" ? window.location.href : ""}`;
    try {
      const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ text: payload });
      } else {
        await navigator.clipboard.writeText(payload);
        setShared(true);
        setTimeout(() => setShared(false), 1400);
      }
    } catch { /* user cancelled */ }
    onShare?.();
  }, [content, onShare]);

  const handleTTS = useCallback(() => {
    if (!ttsAvailable) return;
    if (ttsState !== "idle") {
      stopSpeaking();
      setTtsState("idle");
      return;
    }
    setTtsState("loading");
    const started = speakText(plainTextFromHtmlContent(content), {
      onPlay: () => setTtsState("playing"),
      onEnd: () => setTtsState("idle"),
      onError: () => setTtsState("idle"),
    });
    if (!started) setTtsState("idle");
  }, [content, ttsState, ttsAvailable]);

  const handleRateClick = useCallback((value: "up" | "down") => {
    setRated((prev) => {
      const next = prev === value ? null : value;
      if (typeof window !== "undefined" && ratingKey) {
        try {
          if (next === null) window.localStorage.removeItem(`nukhba.feedback.${ratingKey}`);
          else window.localStorage.setItem(`nukhba.feedback.${ratingKey}`, next);
        } catch {}
      }
      return next;
    });
    onRate?.(value);
  }, [onRate, ratingKey]);

  return (
    <div className="msg-toolbar mt-1.5 flex flex-wrap items-center gap-1" style={{ direction: "rtl" }}>
      <button type="button" className="msg-toolbar-btn" title="نسخ النص" aria-label="نسخ النص" onClick={handleCopy}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="msg-toolbar-label">{copied ? "نُسِخ" : "نسخ"}</span>
      </button>
      {canRegenerate && onRegenerate && (
        <button type="button" className="msg-toolbar-btn" title="أعد توليد الإجابة" aria-label="أعد توليد الإجابة" onClick={onRegenerate}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="msg-toolbar-label">أعد التوليد</span>
        </button>
      )}
      {ttsAvailable && (
        <button
          type="button"
          className={`msg-toolbar-btn ${ttsState !== "idle" ? "msg-toolbar-btn-active" : ""}`}
          title={
            ttsState === "loading" ? "جارٍ تجهيز الصوت..."
            : ttsState === "playing" ? "إيقاف القراءة"
            : "اقرأها بصوت عربي"
          }
          aria-label={ttsState === "playing" ? "إيقاف القراءة" : "اقرأها بصوت عربي"}
          onClick={handleTTS}
        >
          {ttsState === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : ttsState === "playing" ? <VolumeX className="w-3.5 h-3.5" />
            : <Volume2 className="w-3.5 h-3.5" />}
          <span className="msg-toolbar-label">
            {ttsState === "loading" ? "جارٍ التجهيز..." : ttsState === "playing" ? "أوقف" : "اقرأها"}
          </span>
        </button>
      )}
      <button
        type="button"
        className={`msg-toolbar-btn ${rated === "up" ? "msg-toolbar-btn-up" : ""}`}
        title="إجابة مفيدة"
        aria-label="إجابة مفيدة"
        onClick={() => handleRateClick("up")}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        className={`msg-toolbar-btn ${rated === "down" ? "msg-toolbar-btn-down" : ""}`}
        title="إجابة بحاجة لتحسين"
        aria-label="إجابة بحاجة لتحسين"
        onClick={() => handleRateClick("down")}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      <button type="button" className="msg-toolbar-btn" title="مشاركة" aria-label="مشاركة" onClick={handleShare}>
        <Share2 className="w-3.5 h-3.5" />
        <span className="msg-toolbar-label">{shared ? "نُسِخ ✓" : "شارك"}</span>
      </button>
    </div>
  );
});

function WelcomeEmptyState({
  subjectName,
  modeBadge,
  starters,
  onPick,
}: {
  subjectName: string;
  modeBadge: string;
  starters: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center" style={{ direction: "rtl" }}>
      <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Sparkles className="w-8 h-8 text-black" />
      </div>
      <span className="text-[11px] font-bold text-amber-300 mb-1">{modeBadge}</span>
      <h3 className="text-xl font-black text-white mb-1.5">أهلاً بك في {subjectName}</h3>
      <p className="text-sm text-white/55 leading-relaxed max-w-md mb-5">
        ابدأ بسؤال، أو اختر اقتراحاً للأسفل. يستطيع المعلم شرح المفاهيم وحل التمارين وبناء بيئات تطبيقية تفاعلية لك.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-xl">
        {starters.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="text-[12px] sm:text-sm px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/40 text-white/75 hover:text-amber-100 transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function TeacherErrorState({
  title,
  description,
  actionLabel,
  onAction,
  tone = "warning",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "danger" | "info";
}) {
  const palette = tone === "danger"
    ? { bg: "bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-200", body: "text-rose-100/90", btnBg: "bg-rose-500/40 hover:bg-rose-500/60", btnBorder: "border-rose-400/50", btnText: "text-rose-100 hover:text-white" }
    : tone === "info"
    ? { bg: "bg-cyan-500/12", border: "border-cyan-500/35", text: "text-cyan-200", body: "text-cyan-100/90", btnBg: "bg-cyan-500/40 hover:bg-cyan-500/60", btnBorder: "border-cyan-400/50", btnText: "text-cyan-100 hover:text-white" }
    : { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-200", body: "text-amber-100/90", btnBg: "bg-amber-500/40 hover:bg-amber-500/60", btnBorder: "border-amber-400/50", btnText: "text-amber-100 hover:text-white" };
  return (
    <div className={`max-w-2xl mx-auto mb-3 p-4 rounded-xl ${palette.bg} ${palette.border} border shadow-lg`} style={{ direction: "rtl" }}>
      <div className={`text-sm font-bold mb-2 ${palette.text}`}>⚠️ {title}</div>
      <div className={`text-sm mb-3 leading-relaxed ${palette.body}`}>{description}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`text-sm font-bold transition-all px-4 py-2 rounded-lg ${palette.btnBg} ${palette.btnBorder} border ${palette.btnText}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// In-flight teacher-image state shared with AIMessage. `loading` shows the
// spinner placeholder; `ready` swaps in <img>; `error` shows a friendly
// retry hint. URLs from fal.ai are short-lived (≈1h CDN cache) so we don't
// persist this map — once the page reloads the historical message will
// have the `<p class="image-historical">` stub the backend wrote on save.
type TeacherImageState = { status: 'loading' | 'ready' | 'error'; url?: string };
type TeacherImageMap = Map<string, TeacherImageState>;

const AIMessage = memo(function AIMessage({ content, isStreaming, onCreateLabEnv, onAnswerOption, imageMap, onImageTimeout, onReExplainImage, subjectId }: { content: string; isStreaming: boolean; onCreateLabEnv?: (desc: string) => void; onAnswerOption?: (answer: string) => void; imageMap?: TeacherImageMap; onImageTimeout?: (id: string) => void; onReExplainImage?: (url: string) => void; subjectId?: string }) {
  const safeRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
  // streaming and once more when the message stops streaming (the
  // `safeRef.current` switchover). Each rebuild blows away whatever <img>
  // or error UI we previously injected. So we re-walk the DOM after every
  // render and reconcile each figure's contents with the latest `imageMap`
  // state — which is the persistent source of truth. Cheap (≤3 figures
  // per message in practice).
  //
  // The 10-second local timeout (safety net for the stuck-spinner bug
  // reported in task #15) calls `onImageTimeout(id)` so the parent flips
  // imageMap[id] to {status:'error'}. This is critical: mutating the DOM
  // alone would be undone on the very next render. By updating React
  // state, the error survives all subsequent re-renders (including the
  // streaming → final swap) because every render of the effect sees
  // `state.status === 'error'` and re-applies the error UI.
  const localTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;

    // ── Step 1: adopt sibling <figcaption class="image-caption"> ─────────
    // The teacher emits `[[IMAGE:hex]]` followed by a sibling `<figcaption
    // class="image-caption">…</figcaption>`. After our renderImageMarkers
    // + marked + DOMPurify pipeline, the caption ends up as a *sibling*
    // of the <figure>, not a child. We move it inside so:
    //   (a) `.teach-image figcaption.image-caption` CSS rules apply.
    //   (b) Two consecutive image+caption pairs become directly adjacent
    //       <figure>+<figure>, which lets the `.teach-image + .teach-image`
    //       desktop side-by-side rule fire for Compare/Contrast.
    // marked sometimes wraps the figcaption in a stray <p> when it sits
    // alone on a line; we unwrap that case.
    const figuresForAdoption = root.querySelectorAll<HTMLElement>('figure[data-image-id]');
    figuresForAdoption.forEach((fig) => {
      // Already has its own caption? Done.
      if (fig.querySelector(':scope > figcaption.image-caption')) return;
      let next = fig.nextElementSibling as HTMLElement | null;
      let captionEl: HTMLElement | null = null;
      let wrapperToCleanup: HTMLElement | null = null;
      if (next) {
        if (next.tagName === 'FIGCAPTION' && next.classList.contains('image-caption')) {
          captionEl = next;
        } else if (
          next.tagName === 'P' &&
          next.children.length === 1 &&
          next.firstElementChild instanceof HTMLElement &&
          next.firstElementChild.tagName === 'FIGCAPTION' &&
          next.firstElementChild.classList.contains('image-caption')
        ) {
          captionEl = next.firstElementChild as HTMLElement;
          wrapperToCleanup = next;
        }
      }
      if (captionEl) {
        fig.appendChild(captionEl);
        if (wrapperToCleanup && wrapperToCleanup.children.length === 0 && !wrapperToCleanup.textContent?.trim()) {
          wrapperToCleanup.remove();
        }
      }
    });

    // ── Step 2: reconcile each figure with imageMap state ────────────────
    const figures = root.querySelectorAll<HTMLElement>('figure[data-image-id]');
    figures.forEach((fig) => {
      const id = fig.getAttribute('data-image-id') || '';
      if (!id) return;
      const state = imageMap?.get(id);

      // Helper: clear figure body but preserve any adopted caption.
      const clearBodyKeepCaption = (): HTMLElement | null => {
        const cap = fig.querySelector(':scope > figcaption.image-caption') as HTMLElement | null;
        while (fig.firstChild) fig.removeChild(fig.firstChild);
        return cap;
      };

      if (!state || state.status === 'loading') {
        // Safety-net timer — fires only if neither imageReady nor imageError
        // SSE events arrived (dropped connection). The server's worst-case
        // is FAL_TIMEOUT_MS + POLLINATIONS_TIMEOUT_MS ≈ 60s, then SVG
        // fallback (instant). 75s gives a 15s cushion before we declare the
        // SSE channel dead.
        if (!localTimersRef.current.has(id)) {
          const timer = setTimeout(() => {
            console.debug('[teach-image] local timeout fired', { id });
            localTimersRef.current.delete(id);
            onImageTimeout?.(id);
          }, 75_000);
          localTimersRef.current.set(id, timer);
        }
        return;
      }

      if (state.status === 'ready' && state.url) {
        // Cancel any pending timer.
        const t = localTimersRef.current.get(id);
        if (t) { clearTimeout(t); localTimersRef.current.delete(id); }
        // Skip if the same URL is already rendered.
        const existingImg = fig.querySelector(':scope > img') as HTMLImageElement | null;
        if (existingImg && existingImg.src === state.url && fig.classList.contains('teach-image-ready')) return;

        console.debug('[teach-image] figure upgraded to ready', { id });
        const cap = clearBodyKeepCaption();

        // Same-origin URL (`/api/teacher-images/<hash>.<ext>`) served from our
        // own static handler — no CORS, no third-party CDN latency, no
        // signed-URL expiry. Bytes are persisted server-side BEFORE this
        // event arrives so the fetch is essentially instant. No load-overlay
        // and no 90s safety timer needed any more.
        const img = document.createElement('img');
        img.alt = 'صورة توضيحية';
        img.loading = 'eager';
        img.onerror = () => {
          // Only fires if the cached file was deleted between render and
          // request (LRU eviction race) — extremely rare. Show a friendly
          // hint instead of a broken-image icon.
          console.debug('[teach-image] img onerror', { id, src: img.src.slice(0, 80) });
          const cap2 = clearBodyKeepCaption();
          const fail = document.createElement('div');
          fail.className = 'teach-image-fail';
          fail.textContent = '⚠️ تعذّر تحميل الصورة — أعد المحاولة.';
          fig.appendChild(fail);
          if (cap2) fig.appendChild(cap2);
          fig.classList.remove('teach-image-ready', 'teach-image-loading');
          fig.classList.add('teach-image-error');
        };
        img.src = state.url;

        fig.appendChild(img);
        if (cap) fig.appendChild(cap);
        fig.classList.remove('teach-image-loading', 'teach-image-error');
        fig.classList.add('teach-image-ready');
        return;
      }

      if (state.status === 'error') {
        const t = localTimersRef.current.get(id);
        if (t) { clearTimeout(t); localTimersRef.current.delete(id); }
        // Skip if already showing error (and no spinner remains).
        if (fig.classList.contains('teach-image-error') && !fig.querySelector(':scope > .teach-image-spinner')) return;

        console.debug('[teach-image] figure upgraded to error', { id });
        const cap = clearBodyKeepCaption();
        const fail = document.createElement('div');
        fail.className = 'teach-image-fail';
        fail.textContent = '⚠️ تعذّر توليد الصورة — أكمل القراءة.';
        fig.appendChild(fail);
        if (cap) fig.appendChild(cap);
        fig.classList.remove('teach-image-loading', 'teach-image-ready');
        fig.classList.add('teach-image-error');
      }
    });
  }, [displayHtml, imageMap, onImageTimeout]);

  // Cleanup local timers on unmount so timers don't fire after the user
  // navigates away from the session.
  useEffect(() => {
    const timers = localTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

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
      const cap = fig.querySelector('figcaption.image-caption');
      setLightboxAlt((cap?.textContent || img.alt || "").trim());
      setLightboxZoom(1);
      setLightboxPan({ x: 0, y: 0 });
      setLightboxUrl(img.src);
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, []);

  // Apply highlight.js + decorate code blocks (copy button) after every
  // render. KaTeX HTML is already pre-rendered by `restoreMathPlaceholders`
  // so this effect only deals with code styling. Idempotent — guards via
  // dataset.hljsApplied prevent double-highlighting on streaming chunks.
  useEffect(() => {
    enhanceTeacherDom(containerRef.current);
  }, [displayHtml]);

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
    <div className="relative rounded-2xl rounded-tr-none min-w-0 max-w-[92%] sm:max-w-[92%] max-sm:max-w-[calc(100vw-50px)] shadow-md"
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
          <div className="teach-image-lightbox-toolbar" onClick={(e) => e.stopPropagation()} style={{ direction: "rtl" }}>
            <button
              type="button"
              className="lightbox-tool-btn"
              aria-label="تصغير"
              title="تصغير"
              onClick={() => { setLightboxZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))); setLightboxPan({ x: 0, y: 0 }); }}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="lightbox-zoom-label">{Math.round(lightboxZoom * 100)}%</span>
            <button
              type="button"
              className="lightbox-tool-btn"
              aria-label="تكبير"
              title="تكبير"
              onClick={() => { setLightboxZoom(z => Math.min(4, +(z + 0.25).toFixed(2))); }}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="lightbox-tool-btn"
              aria-label="تنزيل الصورة"
              title="تنزيل"
              onClick={async () => {
                try {
                  const r = await fetch(lightboxUrl);
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = subjectId ? `nukhba-${subjectId}-${Date.now()}.png` : `nukhba-${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1500);
                } catch {
                  window.open(lightboxUrl, '_blank', 'noopener');
                }
              }}
            >
              <Download className="w-4 h-4" />
            </button>
            {onReExplainImage && (
              <button
                type="button"
                className="lightbox-tool-btn lightbox-tool-btn-primary"
                onClick={() => {
                  onReExplainImage(lightboxUrl);
                  setLightboxUrl(null);
                }}
              >
                <span className="text-xs">اشرحها لي مرة أخرى</span>
              </button>
            )}
          </div>
          <img
            src={lightboxUrl}
            alt={lightboxAlt || "صورة توضيحية مكبّرة"}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              if (lightboxZoom <= 1) return;
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startPan = lightboxPan;
              const target = e.currentTarget as HTMLImageElement;
              try { target.setPointerCapture(e.pointerId); } catch {}
              target.style.cursor = 'grabbing';
              const move = (ev: PointerEvent) => {
                setLightboxPan({
                  x: startPan.x + (ev.clientX - startX) / lightboxZoom,
                  y: startPan.y + (ev.clientY - startY) / lightboxZoom,
                });
              };
              const up = (ev: PointerEvent) => {
                target.style.cursor = lightboxZoom > 1 ? 'grab' : 'zoom-in';
                target.removeEventListener('pointermove', move);
                target.removeEventListener('pointerup', up);
                target.removeEventListener('pointercancel', up);
                try { target.releasePointerCapture(ev.pointerId); } catch {}
              };
              target.addEventListener('pointermove', move);
              target.addEventListener('pointerup', up);
              target.addEventListener('pointercancel', up);
            }}
            style={{
              transform: `scale(${lightboxZoom}) translate(${lightboxPan.x}px, ${lightboxPan.y}px)`,
              transition: 'transform 0.15s ease-out',
              cursor: lightboxZoom > 1 ? 'grab' : 'zoom-in',
              touchAction: 'none',
              userSelect: 'none',
            }}
          />
          {lightboxAlt && (
            <div className="teach-image-lightbox-caption" onClick={(e) => e.stopPropagation()} style={{ direction: "rtl" }}>
              {lightboxAlt}
            </div>
          )}
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
  onCreateLabEnv?: (description: string, spec?: object) => void;
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
  const loadInitialChat = (): { messages: ChatMessage[]; currentStage: number; chatPhase: 'diagnostic' | 'teaching' | null } => {
    if (!CHAT_STORAGE_KEY) return { messages: [], currentStage: 0, chatPhase: null };
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return { messages: [], currentStage: 0, chatPhase: null };
      const parsed = JSON.parse(raw);
      const persistedPhase = parsed.chatPhase === 'diagnostic' || parsed.chatPhase === 'teaching' ? parsed.chatPhase : null;
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        currentStage: typeof parsed.currentStage === "number" ? parsed.currentStage : 0,
        chatPhase: persistedPhase,
      };
    } catch { return { messages: [], currentStage: 0, chatPhase: null }; }
  };
  const initial = loadInitialChat();
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  // ── Pro-input + session-UX state ──────────────────────────────────────────
  // Draft is restored from localStorage on mount (per subjectId), autosaved
  // on every keystroke (debounced 500ms), and cleared on successful send.
  const [input, setInput] = useState(() => {
    try { return loadDraft(subject.id); } catch { return ""; }
  });
  // Inline image preview (data URL). Sent once via sendPayloadOverride; persisted history holds a short placeholder.
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mic handle: stop() = upload + transcribe, cancel() = drop without
  // sending. See `lib/web-speech.ts`.
  const [recordingHandle, setRecordingHandle] = useState<{ stop: () => void; cancel: () => void } | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  // True while the audio is being uploaded/transcribed (after stop()).
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  // Session control state.
  const [sessionPaused, setSessionPaused] = useState(false);
  const [pathDrawerOpen, setPathDrawerOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // Difficulty hint sent on every /ai/teach request — the server reads it
  // and appends a difficulty-specific addendum to the teaching system
  // prompt (see routes/ai.ts). Persisted per-subject so the choice
  // survives reloads.
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "advanced">(() => {
    try {
      const stored = localStorage.getItem(`nukhba.difficulty.${subject.id}`);
      if (stored === "easy" || stored === "advanced" || stored === "normal") return stored;
    } catch {}
    return "normal";
  });
  // Persist difficulty per-subject so it survives reloads.
  useEffect(() => {
    try { localStorage.setItem(`nukhba.difficulty.${subject.id}`, difficulty); } catch {}
  }, [difficulty, subject.id]);
  const difficultyRef = useRef(difficulty);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  // Stable debounced draft saver — a fresh closure each render would
  // re-create the timer and we'd never coalesce keystrokes.
  const draftSaverRef = useRef<(value: string) => void>(() => {});
  useEffect(() => { draftSaverRef.current = makeDebouncedDraftSaver(subject.id, 500); }, [subject.id]);
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
  // Local 10s safety-net timeout fires from inside AIMessage when neither
  // imageReady nor imageError SSE events arrived in time. Flipping
  // imageMap to `error` here (rather than mutating the DOM inside the
  // child) is what makes the error survive every subsequent render —
  // including the streaming → final `safeRef.current` swap that rebuilds
  // the figure markup from scratch.
  const handleImageTimeout = useCallback((id: string) => {
    setImageMap(prev => {
      const cur = prev.get(id);
      // Don't clobber a successful resolution that raced and won.
      if (cur && cur.status === 'ready') return prev;
      // Idempotent — already error, no change.
      if (cur && cur.status === 'error') return prev;
      console.debug('[teach-image] state → error (local timeout)', { id });
      const next = new Map(prev);
      next.set(id, { status: 'error' });
      return next;
    });
  }, []);
  const [dailyLimitUntil, setDailyLimitUntil] = useState<string | null>(null);
  const [countdownExpired, setCountdownExpired] = useState(false);
  // Bumped every time the student clicks "ابدأ الجلسة التالية الآن" so the
  // bootstrap effect re-fires (its other deps don't change after restart).
  const [sessionRestartKey, setSessionRestartKey] = useState(0);
  // Phase priority: persisted (refresh-safe) → first-session default → teaching.
  // Without restoring from localStorage, refreshing mid-diagnostic would
  // bounce the student into 'teaching' even though no plan was built yet.
  const [chatPhase, setChatPhase] = useState<'diagnostic' | 'teaching'>(
    initial.chatPhase ?? (isFirstSession ? 'diagnostic' : 'teaching'),
  );
  const [customPlan, setCustomPlan] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  // Indices of micro-steps the student has completed in the current stage.
  // Reset to [] whenever currentStage advances. Persisted to DB via
  // PATCH /api/user-plan/micro-step each time the server emits microStepsDone.
  const [completedMicroSteps, setCompletedMicroSteps] = useState<number[]>([]);
  const completedMicroStepsRef = useRef<number[]>([]);
  useEffect(() => { completedMicroStepsRef.current = completedMicroSteps; }, [completedMicroSteps]);
  const [growthReflections, setGrowthReflections] = useState<Array<{ stageIndex: number; text: string; date: string }>>([]);
  // Set when server detects [STAGE_COMPLETE] without the mastery criterion
  // being mentioned (drift guard). Holds criterion text + target nextStage
  // so the student can confirm or reject stage advancement.
  const [masteryDriftWarning, setMasteryDriftWarning] = useState<{
    masteryCriterion: string;
    nextStage: number;
  } | null>(null);
  // Shown after [PLAN_READY] so the student can review and accept (or revise)
  // the personalised plan before Phase 1 auto-starts.
  const [showContractCard, setShowContractCard] = useState(false);
  // Tracks whether the last completed turn ended with a stage transition so
  // the next sendTeachMessage can signal isNewStage to the server prompt.
  const justAdvancedStageRef = useRef(false);
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
  // Mirror of `messages` for closures that fire BEFORE React commits a
  // setMessages update. Used by sendTeachMessage's empty-text branch
  // (auto-start / restart) so the bootstrap orphan-clear path can sync
  // the ref to [] *immediately* after queueing setMessages([]) — without
  // this, the immediate sendTeachMessage("") call below would still see
  // the stale orphan messages from the previous render's closure.
  const messagesRef = useRef<ChatMessage[]>(initial.messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  // Additional state mirrors so the bootstrap / starter / pendingTeachStart
  // effects can read CURRENT values without listing them as deps (which
  // would cause a re-fire on every keystroke / message). The intent of those
  // effects is "fire on the trigger — read everything else fresh", which is
  // exactly what refs encode. Replaces the previous eslint-disable comments.
  const stagesRef = useRef<string[]>(stages);
  useEffect(() => { stagesRef.current = stages; }, [stages]);
  // Keep stagesRef in sync with the custom plan whenever it changes.
  // The server derives stageCount, currentStageName, nextStageName, and
  // completion bounds from this array — defaultStages is a fallback only.
  useEffect(() => {
    if (!customPlan) return;
    const parsed = parsePlanStages(customPlan);
    if (parsed.length > 0) {
      stagesRef.current = parsed.map((s) => s.title);
    }
  }, [customPlan]);
  const currentStageRef = useRef<number>(initial.currentStage);
  useEffect(() => { currentStageRef.current = currentStage; }, [currentStage]);
  const chatPhaseRef = useRef<'diagnostic' | 'teaching'>(chatPhase);
  useEffect(() => { chatPhaseRef.current = chatPhase; }, [chatPhase]);
  // One-shot guard so the bootstrap effect never fires the diagnostic opener
  // twice within a single session. Without it, a flip in `chatGated` (e.g. the
  // teaching-mode fetch resolving after `planLoaded`) or React Strict Mode in
  // dev would re-enter the effect mid-stream, before any assistant content has
  // landed in `messages`, and dispatch a second sendTeachMessage("") — the
  // student then sees the same diagnostic question twice. The guard is reset
  // only when the student explicitly restarts the session via
  // `sessionRestartKey` (see `startNextSession`).
  const diagnosticBootstrapFiredRef = useRef(false);
  // sendTeachMessage is re-created each render. Effects that fire it from a
  // stale closure (auto-start / chatStarter / pendingTeachStart) must call
  // through this ref so they always invoke the latest version, even though
  // we never list the function itself as an effect dep.
  const sendTeachMessageRef = useRef<(text: string, stagesParam?: string[], stageParam?: number, isDiagnostic?: boolean, labReportMeta?: { envTitle: string; envBriefing: string; reportText: string }) => Promise<void>>(async () => {});
  // The "اقتراحات ✨" chip rail used to occupy ~50px above the input on
  // every render — visual clutter the user explicitly asked us to remove.
  // Now collapsed by default; the student taps a small toggle to open it.
  // Persisted so the choice survives a page refresh per browser.
  const SUGGESTIONS_KEY = `nukhba.suggestionsOpen.${subject.id}`;
  const [suggestionsOpen, setSuggestionsOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(SUGGESTIONS_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SUGGESTIONS_KEY, suggestionsOpen ? '1' : '0'); } catch {}
  }, [SUGGESTIONS_KEY, suggestionsOpen]);
  // Set to `true` if the diagnostic stream ended without [PLAN_READY] (e.g.
  // truncation past max_tokens, network blip, model refusal). We surface a
  // visible retry button so the student never gets silently stranded.
  const [diagnosticIncomplete, setDiagnosticIncomplete] = useState(false);
  // Lab intake interview state
  const [labIntakeActive, setLabIntakeActive] = useState(false);
  const labIntakeActiveRef = useRef(false);
  const labIntakeStartIdxRef = useRef<number>(0);
  const [compiledSpec, setCompiledSpec] = useState<Record<string, unknown> | null>(null);
  const [isCompilingSpec, setIsCompilingSpec] = useState(false);
  const [specCompileError, setSpecCompileError] = useState<string | null>(null);
  useEffect(() => { labIntakeActiveRef.current = labIntakeActive; }, [labIntakeActive]);
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
  // Curriculum sidebar data + drawer toggle. Pulled together
  // with starters from /api/materials/:id so we don't make a second round-trip
  // every time the drawer opens.
  type CurriculumChapter = {
    idx: number;
    title: string;
    startPage: number;
    endPage: number;
    summary?: string;
    keyPoints?: string[];
    confidence?: number;
  };
  const [curriculumChapters, setCurriculumChapters] = useState<CurriculumChapter[]>([]);
  const [coveredPointsByChapter, setCoveredPointsByChapter] = useState<Record<string, number[]>>({});
  const [activeMaterialCoverage, setActiveMaterialCoverage] = useState<"ok" | "partial" | "failed" | null>(null);
  const [activeMaterialFileName, setActiveMaterialFileName] = useState<string | null>(null);
  const [showCurriculumDrawer, setShowCurriculumDrawer] = useState(false);
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

  // Persist chat messages + stage + phase so they survive close/reopen and refresh.
  // Only persists when CHAT_STORAGE_KEY is non-null (i.e. user is loaded).
  // chatPhase MUST be persisted: without it, refreshing mid-diagnostic would
  // restore the messages but reset the phase to 'teaching', stranding the
  // student with a half-finished diagnostic and no way to complete the plan.
  useEffect(() => {
    if (!CHAT_STORAGE_KEY) return;
    if (messages.length === 0 && currentStage === 0) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages, currentStage, chatPhase }));
    } catch {}
  }, [messages, currentStage, chatPhase, CHAT_STORAGE_KEY]);

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
            if (Array.isArray(data.plan.completedMicroSteps) && data.plan.completedMicroSteps.length > 0) {
              setCompletedMicroSteps(data.plan.completedMicroSteps);
            }
            if (Array.isArray(data.plan.growthReflections) && data.plan.growthReflections.length > 0) {
              setGrowthReflections(data.plan.growthReflections);
            }
            setChatPhase('teaching');
          } else {
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

  // When active material changes, fetch its starters for the chip row PLUS
  // the structured chapters / covered-points map / coverage_status so the
  // curriculum sidebar can render without a second round-trip.
  useEffect(() => {
    if (!activeMaterialId) {
      setActiveMaterialStarters(null);
      setActiveMaterialWeakAreas([]);
      setCurriculumChapters([]);
      setCoveredPointsByChapter({});
      setActiveMaterialCoverage(null);
      setActiveMaterialFileName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/materials/${activeMaterialId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d) return;
        setActiveMaterialStarters(d.starters || null);
        setActiveMaterialWeakAreas(Array.isArray(d.recentWeakAreas) ? d.recentWeakAreas : []);
        setCurriculumChapters(Array.isArray(d.chapters) ? d.chapters : []);
        setCoveredPointsByChapter(d.coveredPointsByChapter && typeof d.coveredPointsByChapter === "object" ? d.coveredPointsByChapter : {});
        setActiveMaterialCoverage(d.coverageStatus === "ok" || d.coverageStatus === "partial" || d.coverageStatus === "failed" ? d.coverageStatus : null);
        setActiveMaterialFileName(typeof d.fileName === "string" ? d.fileName : null);
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
    // One-shot per session. If we've already fired the opener for this
    // session, skip — even if `chatGated` flips back to false or the effect
    // re-runs under React Strict Mode. The guard is reset only when
    // `sessionRestartKey` changes (see effect below).
    if (diagnosticBootstrapFiredRef.current) return;
    // Kick off the first teacher message if the chat has no assistant reply yet
    // (covers fresh sessions AND stale localStorage where only a user message was cached).
    const hasAssistant = messages.some((m) => m.role === "assistant" && (m.content || "").trim().length > 0);
    if (!hasAssistant) {
      // If the cache only has orphan user messages, clear them so the teacher can start cleanly.
      if (messages.length > 0) {
        setMessages([]);
        // Sync the ref RIGHT NOW so sendTeachMessage("")'s history snapshot
        // — taken from messagesRef.current — sees the cleared array and
        // doesn't leak the orphan turn into the first server request.
        // Without this, React's async setMessages would only commit on the
        // next render, and the immediate call below would close over the
        // stale orphans.
        messagesRef.current = [];
        if (CHAT_STORAGE_KEY) {
          try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch {}
        }
      }
      // Mark fired BEFORE dispatching so any synchronous re-entry (Strict
      // Mode double-invoke, immediate state flip in sendTeachMessage) hits
      // the guard above on its next pass.
      diagnosticBootstrapFiredRef.current = true;
      // Read everything else through refs so this effect doesn't re-fire
      // on every keystroke / phase flip / stage change. Triggers stay
      // intentional: planLoaded, chatGated, sessionRestartKey.
      sendTeachMessageRef.current("", stagesRef.current, currentStageRef.current, chatPhaseRef.current === 'diagnostic');
    } else {
      // Already have an assistant reply (returning student) — count this as
      // "opener handled" so we don't re-fire if chatGated flips later.
      diagnosticBootstrapFiredRef.current = true;
    }
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
    // Use the ref so we always invoke the *latest* sendTeachMessage closure
    // without listing the function as a dep (it's recreated every render).
    sendTeachMessageRef.current(chatStarter);
    onConsumeChatStarter?.();
  }, [chatStarter, planLoaded, isStreaming, onConsumeChatStarter]);

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
      // Latest stages from ref so a plan generated mid-effect uses the
      // up-to-date list, not the closure's empty initial.
      justAdvancedStageRef.current = true;
      sendTeachMessageRef.current("", stagesRef.current, 0, false);
    }, 700);
    return () => clearTimeout(t);
  }, [pendingTeachStart, isStreaming, chatPhase]);

  const compileLabSpec = async (pairs: {q: string; a: string}[]) => {
    setIsCompilingSpec(true);
    setSpecCompileError(null);
    setCompiledSpec(null);
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/ai/lab/compile-spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name,
          intakeAnswers: pairs,
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`فشل تجميع المواصفة (${r.status}): ${t.slice(0, 200)}`);
      }
      const data = await r.json();
      if (data.spec) {
        setCompiledSpec(data.spec);
      } else {
        throw new Error("الاستجابة لا تحتوي على مواصفة صالحة");
      }
    } catch (e: any) {
      setSpecCompileError(e?.message || "حدث خطأ أثناء تجميع مواصفة البيئة");
    } finally {
      setIsCompilingSpec(false);
    }
  };

  // sendPayloadOverride: server-only payload for this turn (e.g. image data URL); messages state stores `text`.
  const sendTeachMessage = async (text: string, stagesParam?: string[], stageParam?: number, isDiagnostic?: boolean, labReportMeta?: { envTitle: string; envBriefing: string; reportText: string }, sendPayloadOverride?: string) => {
    // Tracks whether the network/abort path threw so the `finally` block
    // can branch on it without re-inspecting the error. Declared at function
    // scope so both the `catch` (sets it) and `finally` (reads it) blocks
    // share the same binding — without this, TypeScript flags
    // `networkErrored = true` and `void networkErrored` as undeclared.
    let networkErrored = false;
    // Capture the message-array length before any new messages are pushed.
    // Used as the intake start index for both the explicit-button path and
    // the natural-language fallback so Q&A pair collection is always anchored
    // to the right position in the conversation history.
    const preMessageCount = messagesRef.current.length;
    setIsStreaming(true);
    // Track when the intake interview starts so we can collect Q&A pairs later.
    // Two detection paths:
    //   1. Hidden [LAB_INTAKE_START] token — injected by the floating button.
    //   2. Natural-language lab request matching LAB_INTENT_RE — mirrors the
    //      server-side LAB_ENV_INTENT_RE so the client never misses an intake
    //      triggered by a typed message like "ابنِ لي بيئة تطبيقية".
    if (text.includes("[LAB_INTAKE_START]") || LAB_INTENT_RE.test(text.trim())) {
      setLabIntakeActive(true);
      labIntakeActiveRef.current = true;
      labIntakeStartIdxRef.current = preMessageCount;
    }
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
          // For attachments, the data URL goes ONCE here; the same blob must NOT
          // also appear in the appended history row, otherwise the JSON request
          // body doubles in size and can blow past express.json's 10MB cap.
          userMessage: sendPayloadOverride ?? text,
          // History reads from messagesRef (always latest committed) so regenerate's
          // synchronous trim sticks. The appended last user row always carries the
          // slim `text` (placeholder for attachments), never the override.
          history: text
            ? [...messagesRef.current, { role: "user", content: text }]
            : messagesRef.current,
          planContext: customPlan,
          stages: usedStages,
          currentStage: usedStage,
          isDiagnosticPhase: diagMode,
          hasCoding: subject.hasCoding,
          // Difficulty hint — server appends a difficulty-specific addendum
          // to the teaching system prompt. See routes/ai.ts.
          difficultyHint: difficultyRef.current,
          // Stage contract: the 6 structured fields for the active plan stage.
          // Injected verbatim into the teachingSystemPrompt so the model is
          // bound to the student's agreed objectives, micro-steps, deliverable,
          // mastery criterion, reason-for-student, and prerequisite.
          currentStageContract: (() => {
            if (diagMode || !customPlan) return undefined;
            const richStages = parsePlanStages(customPlan);
            const s = richStages[usedStage];
            if (!s) return undefined;
            return {
              stageIndex: usedStage,
              stageTitle: s.title,
              currentMicroStepIndex: completedMicroStepsRef.current?.length ?? 0,
              objectives: s.objectives,
              microSteps: s.microSteps,
              deliverable: s.deliverable,
              masteryCriterion: s.masteryCriterion,
              reasonForStudent: s.reasonForStudent,
              prerequisite: s.prerequisite,
            };
          })(),
          // Flag so the teacher draws a full stage roadmap on the opening turn
          // of a new stage rather than diving straight into content.
          isNewStage: (() => {
            const was = justAdvancedStageRef.current;
            justAdvancedStageRef.current = false;
            return was;
          })(),
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
                // Flip phase BEFORE the await so React commits and the purple
                // "diagnostic" bar disappears the moment the plan is ready.
                setChatPhase('teaching');
                chatPhaseRef.current = 'teaching';
                // Persist `chatPhase: 'teaching'` to localStorage synchronously
                // so a refresh during the slow await window (POST below) does
                // NOT restore the bar — the persistence effect won't fire
                // until React's next commit, which the await may delay.
                if (CHAT_STORAGE_KEY) {
                  try {
                    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
                    const prev = raw ? JSON.parse(raw) : {};
                    localStorage.setItem(
                      CHAT_STORAGE_KEY,
                      JSON.stringify({ ...prev, chatPhase: 'teaching' }),
                    );
                  } catch {}
                }
                // Persist plan to DB and gate the contract card on the quality
                // check. A 422 means the AI ignored the structured format prompt;
                // show an in-chat error and let the student ask for regeneration
                // rather than loading a shallow plan into the teaching flow.
                try {
                  const saveRes = await fetch('/api/user-plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      subjectId: subject.id,
                      planHtml: assistantMsg,
                      currentStageIndex: 0,
                    }),
                  });
                  if (saveRes.status === 422) {
                    const errData = await saveRes.json().catch(() => ({}));
                    const errMsg = errData.message ?? 'الخطة لم تجتز فحص الجودة. اطلب من المعلم إعادة توليد الخطة بالنقر على أيقونة الإعادة.';
                    setMessages((prev) => {
                      const updated = [...prev];
                      updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
                      return [...updated, { role: 'assistant', content: `⚠️ **تنبيه:** ${errMsg}` }];
                    });
                    // Plan rejected (real 422 only) — revert to diagnostic so
                    // the student can request a regeneration. We deliberately
                    // do NOT revert in any other failure path (network errors
                    // fall into the catch below and proceed optimistically),
                    // because a successfully-shown plan must never bring the
                    // purple "diagnostic" bar back.
                    setChatPhase('diagnostic');
                    chatPhaseRef.current = 'diagnostic';
                    if (CHAT_STORAGE_KEY) {
                      try {
                        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
                        const prev = raw ? JSON.parse(raw) : {};
                        localStorage.setItem(
                          CHAT_STORAGE_KEY,
                          JSON.stringify({ ...prev, chatPhase: 'diagnostic' }),
                        );
                      } catch {}
                    }
                  } else {
                    setCustomPlan(assistantMsg);
                    setShowContractCard(true);
                  }
                } catch {
                  // Network error — proceed optimistically so the student
                  // is not blocked by a transient failure.
                  setCustomPlan(assistantMsg);
                  setShowContractCard(true);
                }
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
                  setCompletedMicroSteps([]);
                  justAdvancedStageRef.current = true;
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
              // ── Growth reflection ─────────────────────────────────────────
              if (!diagMode && data.growthReflection && typeof data.growthReflection === "string") {
                const entry = { stageIndex: data.nextStage !== undefined ? Math.max(0, (data.nextStage as number) - 1) : 0, text: data.growthReflection as string, date: new Date().toISOString() };
                setGrowthReflections((prev) => [...prev, entry]);
              }
              // ── Micro-step completions ────────────────────────────────────
              if (!diagMode && data.microStepsDone && Array.isArray(data.microStepsDone)) {
                const indices: number[] = (data.microStepsDone as number[])
                  .map(Number)
                  .filter((n) => !isNaN(n) && n >= 0);
                if (indices.length > 0) {
                  setCompletedMicroSteps((prev) => {
                    const next = [...prev, ...indices].filter((v, i, arr) => arr.indexOf(v) === i);
                    return next;
                  });
                  const lastIdx = indices[indices.length - 1];
                  fetch('/api/user-plan/micro-step', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ subjectId: subject.id, microStepIndex: lastIdx }),
                  }).catch(() => {});
                }
              }
              // ── Mastery drift guard ───────────────────────────────────────
              // Server detected [STAGE_COMPLETE] but the mastery criterion was
              // not mentioned — show a confirmation dialog instead of auto-advancing.
              if (!diagMode && data.masteryDriftDetected && data.masteryCriterion) {
                setMasteryDriftWarning({
                  masteryCriterion: data.masteryCriterion as string,
                  nextStage: typeof data.intendedNextStage === 'number' ? data.intendedNextStage : (usedStage + 1),
                });
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
              console.debug('[teach-image] placeholder received', { id });
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
              console.debug('[teach-image] ready received', { id, url: url.slice(0, 80) });
              setImageMap(prev => {
                // Late-arriving `ready` after the 60s safety-net flipped to
                // `error` is a genuine fal.ai response — adopt it so the
                // student gets the image even if the dropped-SSE fallback
                // fired first.
                const next = new Map(prev);
                next.set(id, { status: 'ready', url });
                return next;
              });
              continue;
            }
            if (data.imageError?.id) {
              const id = String(data.imageError.id);
              const reason = data.imageError.reason || 'unknown';
              console.debug('[teach-image] error received', { id, reason });
              setImageMap(prev => {
                const next = new Map(prev);
                next.set(id, { status: 'error' });
                return next;
              });
              continue;
            }
            if (data.content) {
              assistantMsg += data.content;
              // Streaming fallback intake detection: if the model starts
              // emitting [[ASK_OPTIONS:]] questions but labIntakeActiveRef was
              // never set (e.g. typed request not caught by LAB_INTENT_RE),
              // retroactively mark the session as an intake anchored at the
              // pre-stream message position.
              if (!labIntakeActiveRef.current && assistantMsg.includes("[[ASK_OPTIONS:]]")) {
                setLabIntakeActive(true);
                labIntakeActiveRef.current = true;
                labIntakeStartIdxRef.current = preMessageCount;
              }
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

      // ── Lab intake completion detection ─────────────────────────────────
      // When the teacher emits [[LAB_INTAKE_DONE]] and we were in intake mode,
      // collect the Q&A pairs from the intake conversation and compile the spec.
      if (!emptyStream && assistantMsg.includes("[[LAB_INTAKE_DONE]]") && labIntakeActiveRef.current) {
        setLabIntakeActive(false);
        labIntakeActiveRef.current = false;
        const startIdx = labIntakeStartIdxRef.current;
        // Read from messagesRef — the state update above is async and may not
        // have committed yet, but the ref we maintain is always current.
        const snapshot = messagesRef.current.slice(startIdx);
        const pairs: { q: string; a: string }[] = [];
        for (let i = 0; i < snapshot.length - 1; i++) {
          const m = snapshot[i];
          const next = snapshot[i + 1];
          if (m.role === "assistant" && next?.role === "user" && next.content?.trim()) {
            const q = m.content
              .replace(/\[\[LAB_INTAKE_DONE\]\]/g, "")
              .replace(/\[\[ASK_OPTIONS:\s*([\s\S]+?)\]\]/g, (_: string, inner: string) => inner.split("|||")[0]?.trim() || "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 400);
            pairs.push({ q, a: next.content.trim() });
          }
        }
        // Require all 5 Q&A pairs before compiling. If fewer are found,
        // the model emitted [[LAB_INTAKE_DONE]] prematurely — treat as
        // an error rather than silently producing an incomplete spec.
        if (pairs.length >= 5) {
          console.log("[lab-intake] detected [[LAB_INTAKE_DONE]] with", pairs.length, "Q&A pairs — compiling spec");
          setTimeout(() => compileLabSpec(pairs), 300);
        } else if (pairs.length >= 1) {
          // Partial completion (2-4 pairs) — surface an error so the student
          // can restart rather than getting a spec built on incomplete input.
          setSpecCompileError(`لم تكتمل المقابلة (وُجدت ${pairs.length} إجابات من 5). يرجى إعادة المحاولة.`);
          setLabIntakeActive(false);
          labIntakeActiveRef.current = false;
          console.warn("[lab-intake] [[LAB_INTAKE_DONE]] with only", pairs.length, "pairs — aborting compile");
        } else {
          console.warn("[lab-intake] [[LAB_INTAKE_DONE]] but no Q&A pairs found — skipping compile");
        }
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

  // Sync sendTeachMessageRef every render so the bootstrap / starter /
  // pendingTeachStart effects always invoke the freshest closure.
  // Runs after commit but BEFORE those effects' callbacks execute on this
  // commit (effects fire in source order — this hook is declared before
  // any effect that calls sendTeachMessageRef.current).
  useEffect(() => {
    sendTeachMessageRef.current = sendTeachMessage;
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedImage) || isStreaming || sessionPaused) return;
    if (attachedImage) {
      const visibleText = trimmed ? `📎 [صورة مرفقة]\n\n${trimmed}` : "📎 [صورة مرفقة]";
      const outgoingText = trimmed
        ? `![صورة مرفقة من الطالب](${attachedImage})\n\n${trimmed}`
        : `![صورة مرفقة من الطالب](${attachedImage})`;
      sendTeachMessage(visibleText, undefined, undefined, undefined, undefined, outgoingText);
    } else {
      sendTeachMessage(trimmed);
    }
    setAttachedImage(null);
    try { clearDraft(subject.id); } catch {}
    if (inputRef.current) inputRef.current.style.height = "56px";
  };

  // Trim the trailing assistant + user pair from the latest committed messagesRef, then re-send.
  const handleRegenerateLast = useCallback(() => {
    if (isStreaming || sessionPaused) return;
    const cur = messagesRef.current;
    if (cur.length === 0) return;
    let cut = cur.length;
    if (cur[cut - 1]?.role === "assistant") cut -= 1;
    if (cut > 0 && cur[cut - 1]?.role === "user") cut -= 1;
    const lastUserText = cur[cut]?.role === "user" ? (cur[cut].content || "") : "";
    if (!lastUserText) return;
    // Image-attachment turns persist only the "📎 [صورة مرفقة]" placeholder
    // in history (the real data URL is sent ONCE inline to avoid history
    // bloat / 10MB body overflow). Regenerating from the placeholder would
    // ship a meaningless prompt to the model, so we refuse and tell the
    // student to re-attach.
    if (lastUserText.includes("📎 [صورة مرفقة]")) {
      alert("لا يمكن إعادة توليد رسالة تحتوي على صورة مرفقة. أرفق الصورة مرة أخرى وأرسلها من جديد.");
      return;
    }
    const trimmed = cur.slice(0, cut);
    messagesRef.current = trimmed;
    setMessages(trimmed);
    sendTeachMessage(lastUserText);
  }, [isStreaming, sessionPaused]);

  // ── Restart current stage ────────────────────────────────────────────────
  // We don't truncate the message history (that would lose context). Instead
  // we synthesize a user request asking the teacher to restart the current
  // stage — keeping all the state-machine invariants intact.
  const handleRestartStage = useCallback(() => {
    if (isStreaming || sessionPaused) return;
    if (!confirm("سيُعيد المعلم شرح هذه المرحلة من البداية. هل تريد المتابعة؟")) return;
    sendTeachMessage("أعد لي شرح هذه المرحلة من البداية بطريقة مختلفة وأبسط، وكأنني أبدأها لأول مرة.");
  }, [isStreaming, sessionPaused]);

  // ── Re-explain image ──────────────────────────────────────────────────────
  // Triggered from the lightbox toolbar — sends a synthesized user message
  // referencing the image so the teacher knows which figure to elaborate on.
  const handleReExplainImage = useCallback((imageUrl: string) => {
    if (isStreaming || sessionPaused) return;
    sendTeachMessage(`اشرح لي الصورة التوضيحية التالية مرة أخرى بتفصيل أكبر، واذكر العناصر المرقمة فيها واحداً تلو الآخر:\n\n![صورة من جلستك](${imageUrl})`);
  }, [isStreaming, sessionPaused]);

  // ── Copy share link ──────────────────────────────────────────────────────
  const handleCopyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1600);
    } catch { /* clipboard denied */ }
  }, []);

  // ── PDF export ───────────────────────────────────────────────────────────
  // Captures the messages-scroll container as a high-resolution canvas, then
  // tiles it across A4 pages so long conversations export cleanly. Loaded
  // dynamically to keep the initial bundle slim — neither library is needed
  // until the student actually clicks "تصدير المحادثة (PDF)".
  const handleExportPDF = useCallback(async () => {
    if (exportingPdf) return;
    const target = scrollRef.current;
    if (!target) return;
    setExportingPdf(true);
    // Save and restore the scrollable container's overflow + height so
    // html2canvas snapshots the FULL conversation (including off-screen
    // messages), not just the visible viewport. Without this the export
    // truncates long sessions to whatever the user happened to be
    // looking at when they clicked.
    const prevOverflow = target.style.overflow;
    const prevHeight = target.style.height;
    const prevMaxHeight = target.style.maxHeight;
    const fullHeight = target.scrollHeight;
    try {
      target.style.overflow = "visible";
      target.style.height = `${fullHeight}px`;
      target.style.maxHeight = "none";
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(target, {
        backgroundColor: "#0b0d17",
        scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
        useCORS: true,
        logging: false,
        height: fullHeight,
        windowHeight: fullHeight,
        scrollY: -window.scrollY,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      const safeName = (subject.name || "session").replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "session";
      pdf.save(`nukhba-${safeName}-${Date.now()}.pdf`);
    } catch (err) {
      console.error("[pdf-export] failed:", err);
      alert("تعذّر تصدير المحادثة كـ PDF. حاول مرة أخرى.");
    } finally {
      target.style.overflow = prevOverflow;
      target.style.height = prevHeight;
      target.style.maxHeight = prevMaxHeight;
      setExportingPdf(false);
    }
  }, [exportingPdf, subject.name]);

  // 3-state mic toggle: idle → recording → uploading (transcribing) → idle.
  const handleToggleMic = useCallback(() => {
    if (isTranscribing) return;
    if (recordingHandle) {
      recordingHandle.stop();
      setRecordingHandle(null);
      setIsTranscribing(true);
      return;
    }
    setRecordingError(null);
    setRecordingElapsedMs(0);
    const handle = startRecognition({
      maxDurationMs: 60_000,
      onProgress: (ms) => setRecordingElapsedMs(ms),
      onResult: (transcript) => {
        setInput(prev => {
          const sep = prev && !prev.endsWith(" ") ? " " : "";
          const next = `${prev}${sep}${transcript}`.trim() + " ";
          draftSaverRef.current(next);
          return next;
        });
      },
      onUploading: () => setIsTranscribing(true),
      onError: (err) => {
        setRecordingError(err);
        setRecordingHandle(null);
        setIsTranscribing(false);
      },
      onEnd: () => {
        setRecordingHandle(null);
        setIsTranscribing(false);
        setRecordingElapsedMs(0);
      },
    });
    if (handle) setRecordingHandle(handle);
  }, [recordingHandle, isTranscribing]);

  // Drop the recording on unmount — don't trigger an upload nobody'll see.
  useEffect(() => () => { recordingHandle?.cancel(); stopSpeaking(); }, [recordingHandle]);

  // ── File attach (image OR text, plus paste) ──────────────────────────────
  // Images become an inline preview chip + are sent ONCE via the data URL
  // override path. Text files have their content extracted client-side and
  // appended to the textarea so the student can edit before sending —
  // avoids backend changes and keeps the existing /ai/teach contract.
  const TEXT_EXTENSIONS = useMemo(
    () => /\.(txt|md|markdown|csv|tsv|json|log|xml|yaml|yml|ini|conf|sql|html?|css|js|jsx|ts|tsx|py|java|c|h|cpp|cs|go|rb|rs|php|sh|bat)$/i,
    [],
  );
  const handleAttachFile = useCallback((file: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isText = file.type.startsWith("text/")
      || file.type === "application/json"
      || TEXT_EXTENSIONS.test(file.name);
    if (isImage) {
      if (file.size > 4 * 1024 * 1024) {
        alert("حجم الصورة أكبر من 4MB. اختر صورة أصغر.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === "string" ? reader.result : "";
        if (url) setAttachedImage(url);
      };
      reader.readAsDataURL(file);
      return;
    }
    if (isText) {
      if (file.size > 256 * 1024) {
        alert("الملف النصي أكبر من 256KB. الصق المقتطف الذي تريد سؤال المعلم عنه.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const txt = typeof reader.result === "string" ? reader.result : "";
        if (!txt) return;
        const truncated = txt.length > 12000 ? txt.slice(0, 12000) + "\n... [اقتُطع الباقي]" : txt;
        const block = `📄 محتوى الملف ${file.name}:\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
        setInput((prev) => (prev ? `${block}${prev}` : `${block}سؤالي عن هذا الملف: `));
      };
      reader.readAsText(file);
      return;
    }
    alert("نوع الملف غير مدعوم. ارفع صورة أو ملف نصي (txt, md, json, csv, code...).");
  }, [TEXT_EXTENSIONS]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!e.clipboardData) return;
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleAttachFile(file);
          return;
        }
      }
    }
  }, [handleAttachFile]);

  // ── Elapsed session timer ─────────────────────────────────────────────────
  // Starts ticking once the student has at least one user message in the
  // chat — i.e. the session is "live". Pauses on session-pause toggle.
  const hasUserActivity = messages.some(m => m.role === "user");
  const { elapsed: elapsedSeconds } = useElapsedTimer(hasUserActivity, sessionPaused);

  // ── Gem balance for the in-session header ────────────────────────────────
  // Kept local to subject.tsx so the chat bar can show a low-balance neon
  // warning without depending on the AppLayout chrome (which is hidden in
  // mobile fullscreen sessions). Refetches on the same `nukhba:gems-changed`
  // event the global header listens to, so a successful /ai/teach turn
  // updates both badges in lockstep.
  const [gemState, setGemState] = useState<{ balance: number; daily: number; remaining: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchGems = () => {
      fetch(`/api/subscriptions/gems-balance?subjectId=${encodeURIComponent(subject.id)}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (cancelled || !d) return;
          setGemState({
            balance: typeof d.gemsBalance === "number" ? d.gemsBalance : 0,
            daily: typeof d.gemsDailyLimit === "number" ? d.gemsDailyLimit : 0,
            remaining: typeof d.dailyRemaining === "number" ? d.dailyRemaining : 0,
          });
        })
        .catch(() => {});
    };
    fetchGems();
    const handler = () => fetchGems();
    window.addEventListener("nukhba:gems-changed", handler);
    return () => { cancelled = true; window.removeEventListener("nukhba:gems-changed", handler); };
  }, [subject.id]);
  // Low-balance threshold: <70 daily-remaining gems is roughly one short
  // turn left before the daily allowance is exhausted on a typical Gemini
  // teach call.
  const gemLowBalance = !!gemState && gemState.remaining > 0 && gemState.remaining < 70;
  const gemEmpty = !!gemState && gemState.remaining <= 0;

  // ── Welcome empty-state starters ──────────────────────────────────────────
  // Same heuristics as the inline suggestion chips, exposed here so the
  // empty-state card can show them too.
  const welcomeStarters = useMemo(() => {
    const text = `${String(subject?.id || "")} ${String(subject?.name || "")}`.toLowerCase();
    const has = (re: RegExp) => re.test(text);
    if (has(/cyber|سيبران|أمن.*معلومات|اختراق/)) return ["ابنِ لي بيئة تطبيقية لمحاكاة هجوم تعليمي", "اشرح لي مفهوم XSS بمثال", "أعطني تمرين تشخيص ثغرة"];
    if (has(/network|شبكات|tcp|ip|router/)) return ["ابنِ لي بيئة لتحليل حزم شبكة", "اشرح TCP handshake خطوة بخطوة", "كيف أصمم شبكة صغيرة؟"];
    if (has(/program|برمج|code|python|java|javascript|c\+\+/)) return ["ابنِ لي بيئة برمجة لحل مسألة", "اشرح الفرق بين stack و heap", "أعطني تمرين خوارزميات"];
    if (has(/account|محاسب|مالي/)) return ["ابنِ لي بيئة تدريب على القيود اليومية", "اشرح الميزانية العمومية", "أعطني تمرين ميزان مراجعة"];
    if (has(/physic|فيزياء/)) return ["ابنِ لي محاكاة لقانون نيوتن الثاني", "اشرح الفرق بين السرعة والتسارع", "أعطني تمرين على الطاقة"];
    return ["ابنِ لي بيئة تطبيقية تفاعلية", "اشرح لي أهم مفهوم في هذه المادة", "أعطني تمريناً يناسب مستواي"];
  }, [subject?.id, subject?.name]);

  const modeBadgeText = teachingMode === "professor" ? "📚 منهج الأستاذ" : teachingMode === "custom" ? "🧭 مسار مخصّص" : "جلسة تعليمية";

  const pickStarter = useCallback((s: string) => {
    setInput(s);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

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
    // Reset the one-shot bootstrap guard SYNCHRONOUSLY before bumping the
    // restart key, so when the bootstrap effect re-runs (triggered by the
    // key change) it sees the guard cleared and dispatches the opener for
    // the new session. Doing this in a separate post-commit effect would
    // race the bootstrap effect on the same render.
    diagnosticBootstrapFiredRef.current = false;
    setSessionRestartKey((k) => k + 1);
  };

  // Auto-restart: if the page renders with `dailyLimitUntil` already in the
  // past (e.g. student returned the morning after hitting the cap), kick off
  // the next session — but ONLY after we've confirmed the server has
  // actually rolled over today's gem allowance. Without this confirmation,
  // a clock-skewed client (or a stale `until`) would auto-restart, fire a
  // /ai/teach call, and immediately get 429'd back into the same overlay.
  useEffect(() => {
    if (!dailyLimitUntil) return;
    // Trigger when EITHER the wall-clock deadline has already passed (page
    // mounted post-midnight) OR the live timer just hit zero in this
    // session (`countdownExpired` set by Countdown.onExpired). Without the
    // latter, a session that watches the timer tick to 00:00:00 would
    // show the green "ابدأ الجلسة التالية" CTA without us ever calling
    // /subscriptions/gems-balance to confirm the server actually rolled.
    const deadlineReached = new Date(dailyLimitUntil).getTime() <= Date.now();
    if (!deadlineReached && !countdownExpired) return;
    let cancelled = false;
    let attempt = 0;
    const verifyAndStart = async () => {
      if (cancelled) return;
      attempt += 1;
      try {
        const sid = subject?.id;
        if (sid) {
          const r = await fetch(`/api/subscriptions/gems-balance?subjectId=${encodeURIComponent(sid)}`, { credentials: "include" });
          if (r.ok) {
            const d = await r.json();
            // Restart only when the server confirms the user can spend
            // gems again — covers daily-cap rollover AND total balance.
            if (d.canUseGems === true) {
              if (!cancelled) startNextSession();
              return;
            }
          }
        } else {
          // No subject scope — fall back to the original behavior.
          if (!cancelled) startNextSession();
          return;
        }
      } catch {/* network — retry */}
      // Server hasn't rolled over yet (clock skew or job lag). Retry with
      // exponential-ish backoff capped at 30s, but give up after ~3 minutes
      // and let the user click the explicit CTA.
      if (attempt < 12 && !cancelled) {
        const delayMs = Math.min(30_000, 2_000 * Math.pow(1.5, attempt));
        setTimeout(verifyAndStart, delayMs);
      }
    };
    verifyAndStart();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLimitUntil, countdownExpired]);

  // ── Overlay cascade-clearing ─────────────────────────────────────────────
  // The four overlays (accessDenied, dailyLimitUntil, quotaExhausted,
  // sessionComplete) used to be able to coexist in state, with the render
  // order arbitrarily picking which one to show. Worse, hitting the daily
  // cap and then losing access (e.g. the per-subject sub also expiring)
  // would leave the daily-cap countdown visible behind a now-broken
  // "renew" call to action.
  //
  // Precedence is fixed at: accessDenied > dailyLimitUntil > quotaExhausted
  // > sessionComplete. Whenever a higher-priority flag fires, we clear all
  // lower-priority ones so the cascade has a single, deterministic owner.
  useEffect(() => {
    if (accessDenied) {
      setDailyLimitUntil(null);
      setQuotaExhausted(false);
      setSessionComplete(false);
    }
  }, [accessDenied]);
  useEffect(() => {
    if (dailyLimitUntil) {
      setQuotaExhausted(false);
      setSessionComplete(false);
    }
  }, [dailyLimitUntil]);
  useEffect(() => {
    if (quotaExhausted) {
      setSessionComplete(false);
    }
  }, [quotaExhausted]);

  // Overlay precedence: accessDenied → dailyLimitUntil → quotaExhausted →
  // sessionComplete. Matches the cascade-clearing effects above.
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

  if (quotaExhausted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}>
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-2xl font-bold mb-3">جواهرك نفدت 💎</h3>
          <p className="text-muted-foreground mb-2 max-w-sm text-sm leading-relaxed">
            استنفدت كامل رصيد جواهرك لهذا الاشتراك في هذه المادة. يمكنك متابعة
            آخر العمليات في صفحة <a href="/usage" className="text-gold underline">استهلاك الجواهر</a>.
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
        className="fixed bottom-24 md:bottom-6 right-4 z-[70] bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-cyan-300/50"
        style={{ direction: "rtl" }}
        title={pendingDynamicEnv?.title || "العودة لبيئتك"}
      >
        <span className="text-lg">🧪</span>
        <span className="max-w-[160px] truncate">العودة لبيئتك: {pendingDynamicEnv?.title || "البيئة التطبيقية"}</span>
      </button>
    )}
    {/* ── Spec compiling overlay — shown while compile-spec is running ─────── */}
    {isCompilingSpec && (
      <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" style={{ direction: "rtl" }}>
        <div className="bg-slate-900 border border-gold/30 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">جاري تجهيز مواصفة بيئتك...</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            يحلّل المعلم الذكي إجاباتك ويُصمّم بيئة تطبيقية مخصصة لك
          </p>
        </div>
      </div>
    )}

    {/* ── Compiled spec preview card ─────────────────────────────────────── */}
    {compiledSpec && !isCompilingSpec && !isCreatingEnv && (
      <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" style={{ direction: "rtl" }}>
        <div className="bg-slate-900 border border-gold/30 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="bg-gradient-to-l from-amber-500/20 to-transparent border-b border-gold/20 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-xl shrink-0">🧪</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-extrabold text-base leading-tight">مواصفة بيئتك التطبيقية جاهزة</h3>
              <p className="text-xs text-muted-foreground mt-0.5">راجع التفاصيل ثم اضغط «ابنِ الآن»</p>
            </div>
          </div>
          <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
            {!!compiledSpec.goal && (
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gold font-bold mb-1">الهدف</p>
                <p className="text-sm text-white leading-relaxed">{String(compiledSpec.goal)}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {!!compiledSpec.difficulty && (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">الصعوبة</p>
                  <p className="text-sm font-bold text-white">{String(compiledSpec.difficulty)}</p>
                </div>
              )}
              {!!compiledSpec.estimatedMinutes && (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">الوقت المتوقع</p>
                  <p className="text-sm font-bold text-white">{String(compiledSpec.estimatedMinutes)} دقيقة</p>
                </div>
              )}
            </div>
            {Array.isArray(compiledSpec.screens) && compiledSpec.screens.length > 0 && (
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gold font-bold mb-2">الشاشات ({compiledSpec.screens.length})</p>
                <div className="space-y-1">
                  {(compiledSpec.screens as Record<string, unknown>[]).map((sc, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-gold shrink-0">{i + 1}.</span>
                      <span className="text-white">{String(sc.title ?? "")}</span>
                      {!!sc.purpose && <span className="text-muted-foreground">— {String(sc.purpose)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(compiledSpec.successCriteria) && compiledSpec.successCriteria.length > 0 && (
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-gold font-bold mb-2">معايير النجاح</p>
                <ul className="space-y-1">
                  {(compiledSpec.successCriteria as string[]).map((c, i: number) => (
                    <li key={i} className="text-xs text-white flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                      <span>{String(c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {specCompileError && (
            <div className="px-5 pb-3">
              <p className="text-xs text-red-400 bg-red-950/50 rounded-lg p-2">{specCompileError}</p>
            </div>
          )}
          <div className="px-5 pb-5 pt-2 flex gap-2">
            <button
              onClick={() => {
                const spec = compiledSpec;
                setCompiledSpec(null);
                onCreateLabEnv?.("", spec);
              }}
              className="flex-1 px-4 py-3 rounded-xl bg-gold text-slate-900 font-extrabold hover:bg-gold/90 transition-colors text-sm"
            >
              🚀 ابنِ الآن
            </button>
            <button
              onClick={() => {
                // Dismiss the spec preview and restart the intake interview from
                // the beginning so the student can re-answer all 5 questions.
                setCompiledSpec(null);
                setSpecCompileError(null);
                setLabIntakeActive(false);
                labIntakeActiveRef.current = false;
                // Re-trigger the intake via the parent's onStartLabEnvIntent callback,
                // which goes through the same pendingLabStarter confirmation modal
                // flow so the student intentionally confirms the restart.
                onStartLabEnvIntent?.();
              }}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors text-sm"
            >
              عدِّل إجاباتي
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Spec compile error toast (when spec card is dismissed but error remains) */}
    {specCompileError && !compiledSpec && !isCompilingSpec && (
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[92%]">
        <div className="bg-red-950/95 border border-red-500/40 rounded-xl px-4 py-3 shadow-xl flex items-start gap-3" style={{ direction: "rtl" }}>
          <span className="text-xl shrink-0">⚠️</span>
          <div className="flex-1 text-sm text-red-100">{specCompileError}</div>
          <button onClick={() => setSpecCompileError(null)} className="text-red-300 hover:text-white text-lg leading-none shrink-0">×</button>
        </div>
      </div>
    )}

    {/* Universal floating "build env" button — available across ALL subjects.
        Hidden when an env already exists (the "return" button takes over),
        when a panel is open, or while the build is in flight.
        IMPORTANT: this does NOT call /ai/lab/build-env directly. It triggers
        the teacher-orchestrated intake interview, which emits
        [[LAB_INTAKE_DONE]] only after all 5 questions complete. */}
    {/* Attack Simulation: re-open button when scenario exists but panel closed. */}
    {showReopenAttack && (
      <button
        onClick={() => onReopenAttackSim?.()}
        className="fixed bottom-40 md:bottom-20 right-4 z-[70] bg-red-600 hover:bg-red-500 text-white font-bold rounded-full shadow-2xl px-4 py-3 text-sm flex items-center gap-2 border-2 border-red-400/50"
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

      {/* Session header: subject name + elapsed timer + drawer toggle + difficulty badge. */}
      {teachingMode && teachingMode !== 'unset' && (
        <div className="shrink-0 px-2.5 sm:px-3 py-1.5 border-b border-white/5 flex items-center justify-between gap-2" style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.05), rgba(245,158,11,0.02))", direction: "rtl" }}>
          <div className="min-w-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPathDrawerOpen(true)}
              className="path-drawer-trigger session-action-btn"
              title="مسار التعلّم"
              aria-label="عرض مسار التعلّم"
              disabled={!customPlan}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">المسار</span>
            </button>
            <div className="hidden xs:flex items-center gap-1 text-[11px] text-white/55">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{formatElapsed(elapsedSeconds)}</span>
            </div>
            {gemState && (
              <div
                className={`hidden sm:flex items-center gap-1 text-[11px] tabular-nums px-1.5 py-0.5 rounded-md border transition-all ${
                  gemEmpty
                    ? "gem-badge-empty text-rose-200 bg-rose-500/15 border-rose-500/40"
                    : gemLowBalance
                      ? "gem-badge-low text-amber-100 bg-amber-500/15 border-amber-500/45"
                      : "text-amber-200/90 bg-amber-500/8 border-amber-500/25"
                }`}
                title={`المتبقي اليوم: ${gemState.remaining.toLocaleString("ar-EG")} / ${gemState.daily.toLocaleString("ar-EG")} 💎 — الرصيد الكلي: ${gemState.balance.toLocaleString("ar-EG")}`}
                aria-label={`الجواهر المتبقية اليوم ${gemState.remaining}`}
              >
                <span aria-hidden>💎</span>
                <span>{gemState.remaining.toLocaleString("ar-EG")}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex items-center gap-2 truncate">
            <span className="text-[12px] font-bold text-white/85 truncate">{subject.name}</span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${
              difficulty === "easy" ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-200"
              : difficulty === "advanced" ? "bg-rose-500/12 border-rose-500/30 text-rose-200"
              : "bg-amber-500/12 border-amber-500/30 text-amber-200"
            }`}>
              <Gauge className="w-3 h-3" />
              {difficulty === "easy" ? "مبسّط" : difficulty === "advanced" ? "متقدّم" : "عادي"}
            </span>
          </div>
        </div>
      )}

      {/* Inline compact path bar — a thin horizontal stage-dot strip directly
          under the session header. Renders alongside (not instead of) the
          side drawer so accustomed users keep their familiar inline path
          view, while new users still get the richer drawer with progress
          ring + per-stage controls. Hidden until a custom plan exists. */}
      {teachingMode && teachingMode !== 'unset' && customPlan && (() => {
        const compactStages = parsePlanStages(customPlan);
        if (compactStages.length === 0) return null;
        const total = compactStages.length;
        const currentIdx = Math.min(currentStage, total - 1);
        return (
          <button
            type="button"
            onClick={() => setPathDrawerOpen(true)}
            className="shrink-0 px-2.5 sm:px-3 py-1 border-b border-white/5 hover:bg-white/[0.03] transition-colors text-right w-full"
            style={{ direction: "rtl" }}
            title={`المرحلة ${Math.min(currentStage + 1, total)} من ${total} — اضغط لفتح المسار الكامل`}
            aria-label="عرض شريط المراحل المضغوط — اضغط لفتح المسار الكامل"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-300/80 shrink-0 tabular-nums">
                {Math.min(currentStage + 1, total)}/{total}
              </span>
              <div className="compact-path-bar flex-1">
                {compactStages.map((_, idx) => {
                  const cls = idx < currentStage ? "is-done" : idx === currentStage ? "is-active" : "is-locked";
                  return <span key={idx} className={`compact-path-dot ${cls}`} />;
                })}
              </div>
              <span className="text-[10px] text-white/45 truncate hidden sm:inline max-w-[100px]">
                {compactStages[currentIdx]?.title || ""}
              </span>
              {(() => {
                const curStageData = compactStages[currentIdx];
                const totalMicro = curStageData?.microSteps?.length ?? 0;
                const doneMicro = completedMicroSteps.length;
                const nextMicro = totalMicro > 0 ? curStageData?.microSteps?.[doneMicro] : undefined;
                if (!nextMicro && totalMicro === 0) return null;
                return (
                  <span className="text-[10px] text-amber-300/55 truncate hidden sm:inline max-w-[120px]">
                    {totalMicro > 0 ? `· خطوة ${Math.min(doneMicro + 1, totalMicro)} من ${totalMicro}${nextMicro ? `: ${nextMicro}` : ""}` : null}
                  </span>
                );
              })()}
            </div>
          </button>
        );
      })()}

      {/* Mode/sources mini-bar (visible whenever mode is set).
          REDESIGN (May 2026): the previous row had 3 separate visible
          buttons (مصادري + اختبرني + الامتحان) that crowded the bar on
          phones and forced text↔icon collapse logic. We replaced them with
          a single dropdown trigger that holds all secondary actions —
          including the new "إنهاء الجلسة" item moved up from the bottom
          of the input area. The mode label stays on the right for context. */}
      {teachingMode && teachingMode !== 'unset' && (
        <div className="shrink-0 px-2.5 sm:px-3 py-1.5 border-b border-white/5 flex items-center justify-between gap-2" style={{ background: "rgba(245,158,11,0.04)" }}>
          <div className="flex items-center gap-1.5 min-w-0" style={{ direction: "rtl" }}>
            {teachingMode === 'professor' ? (
              <>
                <span className="text-[11px] font-bold text-amber-300 shrink-0">📚 منهج الأستاذ</span>
                <span className="text-[10px] text-white/40 truncate">{activeMaterialId ? "ملف نشط" : "اختر ملفاً"}</span>
                {activeMaterialId && activeMaterialCoverage === "partial" && (
                  <span
                    className="shrink-0 text-[9px] font-bold text-amber-200 bg-amber-500/20 border border-amber-500/40 rounded px-1.5 py-0.5"
                    title="بعض صفحات هذا الملف لم يُستخرج نصها بدقة — يمكن إعادة المحاولة من نافذة المصادر"
                  >
                    تغطية جزئية
                  </span>
                )}
                {activeMaterialId && activeMaterialCoverage === "failed" && (
                  <span
                    className="shrink-0 text-[9px] font-bold text-rose-200 bg-rose-500/20 border border-rose-500/40 rounded px-1.5 py-0.5"
                    title="تعذّر استخراج نص هذا الملف — افتح نافذة المصادر لإعادة المحاولة"
                  >
                    فشل التغطية
                  </span>
                )}
              </>
            ) : (
              <span className="text-[11px] font-bold text-purple-300 shrink-0">🧭 مسار مخصّص</span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            {messages.length >= 2 && (
              <button
                type="button"
                onClick={handleEndSession}
                disabled={isStreaming}
                className="session-action-btn flex items-center gap-1 text-[11px] font-bold text-amber-100 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-400/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="إنهاء الجلسة وحفظ ملخص لها في لوحتي"
                aria-label="إنهاء الجلسة وحفظ الملخص"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">إنهاء الجلسة</span>
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="session-action-btn flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-amber-200 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 transition-all"
                  title="إجراءات الجلسة"
                  aria-label="إجراءات الجلسة"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">الإجراءات</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="w-56" style={{ direction: "rtl" }}>
                <DropdownMenuLabel className="text-[11px] text-white/50 font-normal">إجراءات الجلسة</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setShowSourcesPanel(true)}
                  className="cursor-pointer gap-2 text-sm"
                >
                  <BookMarked className="w-4 h-4 text-white/60" />
                  <span>مصادري</span>
                </DropdownMenuItem>
                {teachingMode === 'professor' && activeMaterialId && (
                  <>
                    <DropdownMenuItem
                      onSelect={() => setShowCurriculumDrawer(true)}
                      disabled={curriculumChapters.length === 0}
                      className="cursor-pointer gap-2 text-sm"
                    >
                      <MapIcon className="w-4 h-4 text-amber-300" />
                      <span>خريطة المنهج</span>
                      {curriculumChapters.length > 0 && (
                        <span className="me-auto text-[10px] text-white/40">{curriculumChapters.length} فصل</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setQuizPanel({ open: true, kind: 'chapter' })}
                      className="cursor-pointer gap-2 text-sm"
                    >
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>اختبرني على هذا الفصل</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setQuizPanel({ open: true, kind: 'exam' })}
                      className="cursor-pointer gap-2 text-sm"
                    >
                      <Trophy className="w-4 h-4 text-purple-400" />
                      <span>الامتحان النهائي</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-white/50 font-normal">التحكم بالجلسة</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => setSessionPaused(p => !p)}
                  className="cursor-pointer gap-2 text-sm"
                >
                  {sessionPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-white/60" />}
                  <span>{sessionPaused ? "استئناف الجلسة" : "إيقاف مؤقت"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleRestartStage}
                  disabled={isStreaming || sessionPaused || stages.length === 0}
                  className="cursor-pointer gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4 text-white/60" />
                  <span>إعادة شرح هذه المرحلة</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer gap-2 text-sm">
                    <Gauge className="w-4 h-4 text-white/60" />
                    <span>مستوى الصعوبة</span>
                    <span className="me-auto text-[10px] text-white/40">{difficulty === "easy" ? "مبسّط" : difficulty === "advanced" ? "متقدّم" : "عادي"}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent style={{ direction: "rtl" }}>
                    <DropdownMenuItem onSelect={() => setDifficulty("easy")} className="cursor-pointer gap-2 text-sm">
                      <span className="text-emerald-400">●</span><span>مبسّط</span>{difficulty === "easy" && <Check className="w-4 h-4 me-auto text-emerald-400" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDifficulty("normal")} className="cursor-pointer gap-2 text-sm">
                      <span className="text-amber-400">●</span><span>عادي</span>{difficulty === "normal" && <Check className="w-4 h-4 me-auto text-amber-400" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDifficulty("advanced")} className="cursor-pointer gap-2 text-sm">
                      <span className="text-rose-400">●</span><span>متقدّم</span>{difficulty === "advanced" && <Check className="w-4 h-4 me-auto text-rose-400" />}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleExportPDF}
                  disabled={exportingPdf || messages.length === 0}
                  className="cursor-pointer gap-2 text-sm"
                >
                  {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin text-white/60" /> : <Download className="w-4 h-4 text-white/60" />}
                  <span>{exportingPdf ? "جاري التصدير..." : "تصدير المحادثة (PDF)"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleCopyShareLink}
                  className="cursor-pointer gap-2 text-sm"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-white/60" />}
                  <span>{shareCopied ? "تم نسخ الرابط ✓" : "نسخ رابط المشاركة"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Curriculum sidebar — bottom drawer (matches the existing
          mobile design language). Lists every chapter from the structured
          outline with a status icon (✓ covered, ▶ active, ○ upcoming), a
          page range, and a coverage bar (covered keyPoints / total). The
          "راجع" button injects "راجع الفصل N" into the composer so the
          existing chapter-review intent regex on the server picks it up. */}
      {teachingMode === 'professor' && (
        <Drawer open={showCurriculumDrawer} onOpenChange={setShowCurriculumDrawer}>
          <DrawerContent style={{ direction: "rtl" }} className="max-h-[85vh]">
            <DrawerHeader className="text-right">
              <DrawerTitle className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-amber-300" />
                <span>خريطة المنهج</span>
                {activeMaterialFileName && (
                  <span className="text-xs font-normal text-white/50 truncate">— {activeMaterialFileName}</span>
                )}
              </DrawerTitle>
              <DrawerDescription className="text-right text-xs">
                ✓ مُكتمل · ▶ نشط · ○ قادم — اضغط "راجع" للعودة لأي فصل سابق.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6 space-y-2" style={{ direction: "rtl" }}>
              {curriculumChapters.length === 0 ? (
                <div className="text-center text-sm text-white/50 py-8">
                  لا يوجد فهرس مُولَّد لهذا الملف بعد.
                </div>
              ) : (
                curriculumChapters.map((c) => {
                  const totalPts = Array.isArray(c.keyPoints) ? c.keyPoints.length : 0;
                  const coveredArr = coveredPointsByChapter[String(c.idx)] ?? [];
                  const coveredCount = Math.min(coveredArr.length, totalPts);
                  const ratio = totalPts > 0 ? coveredCount / totalPts : 0;
                  const fullyCovered = totalPts > 0 && coveredCount >= totalPts;
                  // "Active" = the first chapter that isn't fully covered.
                  // We compute this by walking forward and marking the first
                  // not-fully-covered chapter as the active one.
                  const isActive = (() => {
                    for (const ch of curriculumChapters) {
                      const total = Array.isArray(ch.keyPoints) ? ch.keyPoints.length : 0;
                      const got = (coveredPointsByChapter[String(ch.idx)] ?? []).length;
                      if (total === 0 || got < total) return ch.idx === c.idx;
                    }
                    return false;
                  })();
                  const icon = fullyCovered ? "✓" : isActive ? "▶" : "○";
                  const iconColor = fullyCovered
                    ? "text-emerald-400"
                    : isActive
                      ? "text-amber-300"
                      : "text-white/30";
                  return (
                    <div
                      key={c.idx}
                      className={`rounded-lg border p-3 transition-colors ${
                        isActive
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-lg font-bold shrink-0 ${iconColor}`} aria-hidden>
                          {icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white/90 truncate">
                              {c.idx + 1}. {c.title}
                            </span>
                            {c.startPage > 0 && c.endPage > 0 && (
                              <span className="text-[10px] text-white/40 shrink-0">
                                صفحات {c.startPage}–{c.endPage}
                              </span>
                            )}
                          </div>
                          {totalPts > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-white/10 rounded overflow-hidden">
                                <div
                                  className={`h-full ${fullyCovered ? "bg-emerald-400" : isActive ? "bg-amber-400" : "bg-white/30"}`}
                                  style={{ width: `${Math.round(ratio * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-white/50 shrink-0 tabular-nums">
                                {coveredCount}/{totalPts}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-bold px-2 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/15 transition-colors"
                          title={`أرسل "راجع الفصل ${c.idx + 1}" للمعلّم`}
                          onClick={() => {
                            const text = `راجع الفصل ${c.idx + 1}`;
                            setInput((prev) => (prev && prev.trim().length > 0 ? `${prev}\n${text}` : text));
                            setShowCurriculumDrawer(false);
                            setTimeout(() => inputRef.current?.focus(), 80);
                          }}
                        >
                          راجع
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Stage progress bar.
          Two layouts based on stage count to keep things legible on 360px:
          • ≤5 stages → original step-by-step bullets with labels.
          • >5 stages → compact mode: single linear progress bar +
            "المرحلة X من Y" text + current stage name. The dotted UI
            collapses awkwardly when there are 6+ stages on a phone. */}
      {chatPhase === 'teaching' && stages.length > 0 && (
        <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-white/5 flex items-center gap-2 sm:gap-3" style={{ background: "#0b0d17" }}>
          {stages.length <= 5 ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
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
          ) : (
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-gold text-black flex items-center justify-center text-[10px] font-black shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    {Math.min(currentStage + 1, stages.length)}
                  </div>
                  <span className="text-[11px] text-gold font-semibold truncate">
                    {stages[Math.min(currentStage, stages.length - 1)]}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 shrink-0 tabular-nums">
                  {Math.min(currentStage + 1, stages.length)} / {stages.length}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-emerald-500 to-gold transition-all duration-500"
                  style={{ width: `${Math.min(100, ((currentStage) / Math.max(1, stages.length)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {gemsRemaining !== null && gemsRemaining > 0 && (
            <div className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 ${gemsRemaining < 50 ? 'bg-red-500/15 border border-red-500/30 animate-pulse' : gemsRemaining < 150 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
              <span className="text-[11px]">💎</span>
              <span className={`text-[11px] font-bold tabular-nums ${gemsRemaining < 50 ? 'text-red-400' : gemsRemaining < 150 ? 'text-amber-400' : 'text-muted-foreground'}`}>{gemsRemaining}</span>
            </div>
          )}
        </div>
      )}

      {/* Personalized learning path — side drawer (RTL right edge) opened from the header path icon. */}
      {chatPhase === 'teaching' && customPlan && (
        <Drawer open={pathDrawerOpen} onOpenChange={setPathDrawerOpen} direction="right">
          <DrawerContent
            className="!inset-x-auto !right-0 !left-auto !bottom-0 !top-0 !mt-0 !h-full !rounded-none !rounded-l-2xl border-l border-white/10 border-r-0 bg-[#0b0d17] w-full sm:!w-[440px] md:!w-[480px]"
            style={{ direction: "rtl" }}
          >
            <DrawerHeader className="border-b border-white/10 flex-row items-center justify-between gap-2">
              <div>
                <DrawerTitle className="text-white text-base">مسار التعلّم</DrawerTitle>
                <DrawerDescription className="text-[11px] text-white/50">المرحلة {Math.min(currentStage + 1, stages.length || 1)} من {stages.length || 1}</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <button type="button" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white" aria-label="إغلاق">
                  <X className="w-4 h-4" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1">
              <LearningPathPanel
                planHtml={customPlan}
                currentStage={currentStage}
                totalStages={stages.length}
                completedMicroSteps={completedMicroSteps}
                growthReflections={growthReflections}
                onJumpToStage={(idx, title) => {
                  if (isStreaming || sessionPaused) return;
                  setPathDrawerOpen(false);
                  const text = idx < currentStage
                    ? `أريد مراجعة المرحلة ${idx + 1}: ${title}. ابدأ الشرح من بدايتها.`
                    : `أريد الانتقال إلى المرحلة ${idx + 1}: ${title}. ابدأ شرحها الآن.`;
                  sendTeachMessage(text);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Diagnostic phase banner — single-line slim strip (~28px, was ~52px). */}
      {chatPhase === 'diagnostic' && (
        <div className="shrink-0 px-3 py-1 border-b border-purple-500/15 flex items-center justify-center gap-2" style={{ background: "rgba(139,92,246,0.06)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <p className="text-[11px] text-purple-300 font-medium truncate">مرحلة التشخيص — يبني معلمك خطتك التعليمية الشخصية</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-5 py-4 sm:py-5 relative" ref={scrollRef}>
        {/* Welcome empty-state — shown when no messages, plan ready, chat ungated. */}
        {messages.length === 0 && !isStreaming && planLoaded && !chatGated && chatPhase !== 'diagnostic' && (
          <WelcomeEmptyState
            subjectName={subject.name}
            modeBadge={modeBadgeText}
            starters={welcomeStarters}
            onPick={pickStarter}
          />
        )}
        {/* Paused overlay — blocks the chat surface so the student can't keep
            typing while a pause is in effect. Click "استئناف" to resume. */}
        {sessionPaused && (
          <div className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(11,13,23,0.78)" }}>
            <div className="text-center max-w-sm mx-auto p-6 rounded-2xl bg-[#131726] border border-amber-500/30 shadow-2xl shadow-amber-500/10" style={{ direction: "rtl" }}>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                <Pause className="w-6 h-6 text-amber-300" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">الجلسة متوقّفة مؤقتاً</h4>
              <p className="text-[12px] text-white/60 leading-relaxed mb-4">المؤقّت متوقّف وحقل الإدخال معطّل. اضغط "استئناف" للعودة للتعلّم.</p>
              <button
                type="button"
                onClick={() => setSessionPaused(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold text-sm hover:from-amber-300 hover:to-amber-500 transition-all"
              >
                <Play className="w-4 h-4" />
                استئناف
              </button>
            </div>
          </div>
        )}
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
                    <div className="max-w-[80%] max-sm:max-w-[calc(100vw-60px)] rounded-2xl rounded-br-none px-3 sm:px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed"
                      style={{ background: "linear-gradient(135deg, #1e2235 0%, #191c2a 100%)", border: "1px solid rgba(255,255,255,0.1)", overflowWrap: "break-word", wordBreak: "break-word", whiteSpace: "pre-wrap", width: "fit-content" }}>
                      {/* Strip internal control tokens from the visible chat bubble.
                          [LAB_INTAKE_START] is kept in message storage so server-side
                          history scanning can detect the intake session, but should
                          never be shown to the student as raw text. */}
                      {msg.content.replace(/\[LAB_INTAKE_START\]/g, "").trim() || "ابنِ بيئة تطبيقية"}
                    </div>
                  ) : (
                    <>
                      <AIMessage
                        content={msg.content}
                        isStreaming={isStreaming && isLastMsg}
                        onCreateLabEnv={onCreateLabEnv}
                        onAnswerOption={isLastMsg && !isStreaming ? (ans) => sendTeachMessage(ans) : undefined}
                        imageMap={imageMap}
                        onImageTimeout={handleImageTimeout}
                        onReExplainImage={handleReExplainImage}
                        subjectId={subject.id}
                      />
                      {/* Per-message toolbar (copy/regen/TTS/rate/share) — hidden while streaming. */}
                      {!(isStreaming && isLastMsg) && msg.role === 'assistant' && (msg.content || '').length > 0 && (
                        <MessageToolbar
                          content={msg.content}
                          ratingKey={`${subject.id}:${i}`}
                          onRegenerate={handleRegenerateLast}
                          canRegenerate={isLastMsg && !isStreaming && !sessionPaused}
                          onRate={(value) => {
                            try {
                              fetch('/api/ai/feedback', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  rating: value,
                                  subjectId: subject.id,
                                  stageIndex: currentStage,
                                  difficulty,
                                  sample: plainTextFromHtmlContent(msg.content || '').slice(0, 280),
                                }),
                              }).catch(() => {});
                            } catch {}
                          }}
                        />
                      )}
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
      <div className="shrink-0 border-t border-white/8 p-2 sm:p-3" style={{ background: "#0b0d17" }}>
        {/* Compact action rail — combines the lab/attack-sim CTAs AND the
            suggestions toggle into a single ~32px-tall row (was three
            separate ~36px rows = ~108px of permanent chrome). On phones
            the labels collapse to icons-only via Tailwind's `xs:`/`sm:`
            helpers, ensuring all targets stay ≥40px tall and never wrap
            into a second row at ≤480px. */}
        {chatVisible && !anyPanelOpen && !isStreaming && !chatGated && !quotaExhausted && (
          <div className="max-w-2xl mx-auto mb-1.5 flex flex-wrap items-center gap-1.5 justify-center" style={{ direction: "rtl" }}>
            {onStartLabEnvIntent && !pendingDynamicEnv && !isCreatingEnv && !compiledSpec && !isCompilingSpec && (
              <button
                type="button"
                onClick={() => onStartLabEnvIntent()}
                disabled={sessionPaused}
                className="quick-launch-chip min-h-[40px] sm:min-h-[36px] text-[11px] sm:text-xs px-3 sm:px-3 py-2 sm:py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-400/70 text-amber-100 font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="ابنِ بيئة تطبيقية تفاعلية لهذه المادة"
                aria-label="ابنِ بيئة تطبيقية"
              >
                <span aria-hidden="true">🧪</span>
                <span className="hidden xs:inline sm:inline">بيئة تطبيقية</span>
              </button>
            )}
            {attackSimEnabled && onOpenAttackIntake && !pendingAttackScenario && (
              <button
                type="button"
                onClick={() => onOpenAttackIntake()}
                disabled={sessionPaused}
                className="quick-launch-chip min-h-[40px] sm:min-h-[36px] text-[11px] sm:text-xs px-3 sm:px-3 py-2 sm:py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-400/70 text-rose-100 font-bold transition-all inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="ابدأ محاكاة هجمة تعليمية"
                aria-label="محاكاة هجمة"
              >
                <span aria-hidden="true">🎯</span>
                <span className="hidden xs:inline sm:inline">محاكاة هجمة</span>
              </button>
            )}
            {/* Suggestions toggle — promoted from a standalone row into this
                shared rail so the sub-rail render below only takes height
                when actually expanded. */}
            <button
              type="button"
              onClick={() => setSuggestionsOpen((v) => !v)}
              className="min-h-[40px] sm:min-h-[36px] inline-flex items-center gap-1.5 text-[11px] sm:text-xs px-3 sm:px-3 py-2 sm:py-1.5 rounded-full text-white/70 hover:text-amber-200 bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 transition-all"
              aria-expanded={suggestionsOpen}
              aria-controls="suggestion-chips"
              title={suggestionsOpen ? "إخفاء الاقتراحات" : "إظهار اقتراحات للأسئلة"}
            >
              <Lightbulb className="w-3 h-3" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">{suggestionsOpen ? "إخفاء الاقتراحات" : "اقتراحات"}</span>
              {suggestionsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}
        {(recordingHandle || isTranscribing) && (
          <div className="max-w-2xl mx-auto mb-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-100 text-[11px] sm:text-xs font-bold" style={{ direction: "rtl" }}>
            {isTranscribing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جارٍ تفريغ الصوت إلى نص...</span>
              </>
            ) : (
              <>
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                  <span className="w-0.5 bg-rose-300 rounded-full animate-pulse" style={{ height: "60%", animationDelay: "0ms" }} />
                  <span className="w-0.5 bg-rose-300 rounded-full animate-pulse" style={{ height: "100%", animationDelay: "120ms" }} />
                  <span className="w-0.5 bg-rose-300 rounded-full animate-pulse" style={{ height: "40%", animationDelay: "240ms" }} />
                  <span className="w-0.5 bg-rose-300 rounded-full animate-pulse" style={{ height: "80%", animationDelay: "360ms" }} />
                  <span className="w-0.5 bg-rose-300 rounded-full animate-pulse" style={{ height: "50%", animationDelay: "480ms" }} />
                </span>
                <span>تسجيل... {Math.floor(recordingElapsedMs / 1000)}/60 ث</span>
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className="ml-1 px-2 py-0.5 rounded-full bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400/60 text-white text-[10px]"
                >
                  إيقاف
                </button>
              </>
            )}
          </div>
        )}
        {/* Universal subject-specific suggested-prompt chips. Detected from
            the subject name/id so each domain gets relevant kick-off prompts.
            REDESIGN (May 2026): chips used to ALWAYS render above the input
            (~50px of permanent visual clutter on every screen). They now
            collapse behind a small "اقتراحات ✨" toggle so the student opens
            them only when stuck. Choice persisted per subject in localStorage.
            Generic fallback covers anything unknown. */}
        {/* Suggestions toggle was here — promoted into the shared compact
            action rail above so it doesn't claim its own row. The expanded
            chip list still renders below when toggled open. */}
        {!isStreaming && !chatGated && !quotaExhausted && suggestionsOpen && (() => {
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
            <div id="suggestion-chips" className="max-w-2xl mx-auto mb-2 flex flex-wrap gap-1.5 justify-center" style={{ direction: "rtl", animation: 'msg-in 0.18s ease-out' }}>
              {items.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { sendTeachMessage(q); setSuggestionsOpen(false); }}
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
        {/* "إنهاء الجلسة وحفظ الملخص" was a 56-px-tall block above every
            input render (with messages.length >= 2). Moved to the header
            "الإجراءات" dropdown menu in May 2026 to reclaim vertical space
            and keep all secondary actions in one place. */}
        {streamTruncated && !isStreaming && !diagnosticIncomplete && (
          <TeacherErrorState
            tone="warning"
            title="يبدو أن ردّ المعلّم انقطع قبل أن يكتمل"
            description="قد يكون السبب ضعفاً مؤقّتاً في الاتصال. اضغط الزر أدناه لإعادة إرسال آخر رسالة وإكمال الفكرة."
            actionLabel="أعد إرسال آخر رسالة"
            onAction={() => {
              if (isStreaming) return;
              const lastMsg = streamTruncated.lastUserMessage;
              setStreamTruncated(null);
              setMessages(prev => {
                const nm = [...prev];
                if (nm.length > 0 && nm[nm.length - 1].role === 'assistant') nm.pop();
                if (nm.length > 0 && nm[nm.length - 1].role === 'user') nm.pop();
                return nm;
              });
              setTimeout(() => sendTeachMessage(lastMsg, stages, currentStage, false), 100);
            }}
          />
        )}
        {diagnosticIncomplete && !isStreaming && (
          <TeacherErrorState
            tone="danger"
            title="يبدو أن الخطة لم تكتمل"
            description="لم تصل علامة نهاية الخطة من المعلم — قد تكون انقطعت أثناء التوليد. اضغط الزر أدناه لإعادة بناء الخطة من جديد."
            actionLabel="أعد بناء الخطة"
            onAction={() => {
              if (isStreaming) return;
              setDiagnosticIncomplete(false);
              setMessages([]);
              setCustomPlan(null);
              setChatPhase('diagnostic');
              setPendingTeachStart(false);
              setTimeout(() => sendTeachMessage("", stages, 0, true), 200);
            }}
          />
        )}
        {recordingError && (
          <TeacherErrorState
            tone="info"
            title="تعذّر استخدام الإدخال الصوتي"
            description={recordingError === "غير مدعوم في هذا المتصفح" ? "متصفّحك لا يدعم الإدخال الصوتي. جرّب Chrome أو Edge على الجوال." : `حدث خطأ: ${recordingError}. تأكد من السماح بالميكروفون.`}
            actionLabel="إخفاء"
            onAction={() => setRecordingError(null)}
          />
        )}
        {/* Pro input: mic / file attach / char counter / paste / draft autosave. Ctrl+Enter sends. */}
        <form
          className="max-w-2xl mx-auto flex flex-col gap-1.5"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          {/* Attached image preview chip */}
          {attachedImage && (
            <div className="self-end flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-amber-500/10 border border-amber-500/30" style={{ direction: "rtl" }}>
              <img src={attachedImage} alt="معاينة" className="w-12 h-12 rounded-lg object-cover" />
              <span className="text-[11px] text-amber-200">صورة مرفقة جاهزة للإرسال</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="w-6 h-6 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/30 flex items-center justify-center text-rose-200 hover:text-white transition-all"
                aria-label="إزالة الصورة"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 sm:gap-2.5 input-pro-shell" style={{ direction: "rtl" }}>
            {/* Hidden file input — triggered by the attach button */}
            <input
              type="file"
              accept="image/*,text/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.xml,.yaml,.yml,.ini,.conf,.sql,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.h,.cpp,.cs,.go,.rb,.rs,.php,.sh,.bat"
              className="sr-only"
              ref={fileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttachFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || quotaExhausted || chatGated || sessionPaused}
              className="input-pro-icon-btn"
              title="إرفاق صورة أو ملف نصي"
              aria-label="إرفاق ملف"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            {isSpeechRecognitionSupported() && (
              <button
                type="button"
                onClick={handleToggleMic}
                disabled={isStreaming || quotaExhausted || chatGated || sessionPaused || isTranscribing}
                className={`input-pro-icon-btn ${recordingHandle ? "input-pro-icon-btn-recording" : ""}`}
                title={
                  isTranscribing ? "جارٍ تفريغ الصوت..."
                  : recordingHandle ? `إيقاف التسجيل (${Math.floor(recordingElapsedMs / 1000)} ث)`
                  : "إدخال صوتي (تفريغ سحابي عالي الدقّة)"
                }
                aria-label={recordingHandle ? "إيقاف التسجيل" : isTranscribing ? "جارٍ تفريغ الصوت" : "إدخال صوتي"}
              >
                {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" />
                  : recordingHandle ? <MicOff className="w-4 h-4" />
                  : <Mic className="w-4 h-4" />}
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              maxLength={4200}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                draftSaverRef.current(v);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 144) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              placeholder={
                sessionPaused ? "الجلسة متوقّفة — اضغط استئناف للمتابعة..." :
                chatGated ? "اختر طريقة التعلّم أولاً..." :
                quotaExhausted ? "انتهى رصيدك — يرجى تجديد الاشتراك" :
                isTranscribing ? "جارٍ تفريغ الصوت إلى نص..." :
                recordingHandle ? `🎙️ تحدّث الآن... ${Math.floor(recordingElapsedMs / 1000)} ث (60 ث كحدّ أقصى)` :
                "اكتب رسالتك للمعلم... (Ctrl+V للصق صورة)"
              }
              disabled={isStreaming || quotaExhausted || chatGated || sessionPaused}
              style={{
                minHeight: "48px",
                maxHeight: "144px",
                resize: "none",
                direction: "rtl",
                background: "#131726",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              className="flex-1 min-w-0 px-4 py-3 rounded-2xl text-[15px] leading-relaxed outline-none focus:border-gold/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.1)] disabled:opacity-40 text-white placeholder:text-white/25 overflow-y-auto transition-all"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !attachedImage) || isStreaming || quotaExhausted || chatGated || sessionPaused}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: ((input.trim() || attachedImage) && !isStreaming && !quotaExhausted && !sessionPaused) ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(245,158,11,0.15)", boxShadow: ((input.trim() || attachedImage) && !isStreaming && !quotaExhausted && !sessionPaused) ? "0 4px 15px rgba(245,158,11,0.3)" : "none" }}
            >
              <Send className="w-4.5 h-4.5 text-black" style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] max-w-2xl mx-auto w-full" style={{ direction: "rtl" }}>
            <span className="text-white/15">Ctrl+Enter للإرسال السريع</span>
            <span className={`tabular-nums ${input.length > 3800 ? "text-rose-400 font-bold" : input.length > 3000 ? "text-amber-300" : "text-white/25"}`}>
              {input.length} / 4000
            </span>
          </div>
        </form>
      </div>

      {/* ── Plan contract card ────────────────────────────────────────────
          Shown after [PLAN_READY] so the student can review and accept
          (or ask to revise) the personalised plan before Phase 1 starts. */}
      {showContractCard && customPlan && (
        <LearningContractCard
          planHtml={customPlan}
          onAccept={() => {
            setShowContractCard(false);
            setPendingTeachStart(true);
          }}
          onRequestRevision={(msg) => {
            setShowContractCard(false);
            // Switch back to diagnostic mode so the server generates a fresh plan.
            // When [PLAN_READY] fires in the new response the contract card
            // will appear again with the revised plan.
            setChatPhase('diagnostic');
            sendTeachMessageRef.current(msg, subject.defaultStages, 0, true);
          }}
        />
      )}

      {/* ── Mastery drift guard dialog ────────────────────────────────────
          Shown when the server detected [STAGE_COMPLETE] but the mastery
          criterion was not explicitly mentioned in the AI response. The
          student confirms they truly mastered the stage before advancing,
          or stays in the current stage. */}
      {masteryDriftWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", direction: "rtl" }}
        >
          <div className="rounded-2xl border border-amber-500/30 bg-[#1a1510] shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🎯</span>
              <div>
                <div className="font-bold text-white text-[15px] mb-1">هل أتقنتَ هذه المرحلة فعلاً؟</div>
                <div className="text-[12px] text-white/60 leading-relaxed">
                  المعيار المتفق عليه كان:
                </div>
                <div className="mt-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[12px] text-amber-100/90 font-medium leading-relaxed">
                  {masteryDriftWarning.masteryCriterion}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextIdx = masteryDriftWarning.nextStage;
                  setCompletedMicroSteps([]);
                  justAdvancedStageRef.current = true;
                  setCurrentStage(nextIdx);
                  fetch('/api/user-plan/stage', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ subjectId: subject.id, currentStageIndex: nextIdx }),
                  }).catch(() => {});
                  setMasteryDriftWarning(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] transition-colors"
              >
                نعم، انتقل للمرحلة التالية
              </button>
              <button
                type="button"
                onClick={() => setMasteryDriftWarning(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 text-white font-bold text-[13px] transition-colors"
              >
                ابقَ في هذه المرحلة
              </button>
            </div>
          </div>
        </div>
      )}

      </>)}
    </div>
    </>
  );
}
