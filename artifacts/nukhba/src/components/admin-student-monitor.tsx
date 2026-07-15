/**
 * AdminStudentMonitor — لوحة مراقبة الطلاب الشاملة
 *
 * تتيح للمشرف رؤية كل طالب بالتفصيل:
 *  - درجات الاختبارات (وحدات / مستويات / مراحل)
 *  - محاولات الامتحانات (pass/fail + الدرجة)
 *  - إنجازات المختبرات
 *  - سجل المحادثات مع المعلم الذكي
 *  - سجل النشاط (activity events)
 *  - إحصاءات الإتقان (concept mastery)
 *  - حالة الاشتراك + مسار التعلم
 */

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  BookOpen, Zap, Star, MessageCircle, Activity, FlaskConical,
  Award, TrendingUp, Clock, CheckCircle2, XCircle, Trophy,
  Brain, Wifi, WifiOff, User2, GraduationCap, BarChart3,
} from "lucide-react";
import { university, skills } from "@/lib/curriculum";

// ── Types ─────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
  last_session_at: string | null;
  last_active: string | null;
  streak_days: number;
  points: number;
  profile_image: string | null;
  nukhba_plan: string | null;
  sub_count: number;
  active_sub_count: number;
  subscriptions: Array<{ subject_id: string; subject_name: string; expires_at: string; active: boolean }>;
  quiz_count: number;
  quiz_avg_best: number;
  exam_count: number;
  exam_pass_count: number;
  lab_count: number;
  lab_pass_count: number;
  message_count: number;
  student_message_count: number;
  last_message_at: string | null;
  path_count: number;
};

type StudentDetail = {
  user: {
    id: number; email: string; display_name: string;
    created_at: string; last_session_at: string | null;
    streak_days: number; points: number; profile_image: string | null;
    nukhba_plan: string | null; region: string | null; gems_balance: number;
    messages_used: number; onboarding_done: boolean; first_lesson_complete: boolean;
    subscription_expires_at: string | null;
  };
  subscriptions: Array<{
    id: number; subject_id: string; subject_name: string;
    plan: string; expires_at: string; created_at: string;
    messages_used: number; messages_limit: number;
    gems_balance: number; paid_price_yer: number; region: string | null; is_active: boolean;
  }>;
  paths: Array<{
    subject_id: string; path_type: string; start_mode: string;
    starting_level_index: number; current_lesson_code: string | null;
    unlocked_count: number; lesson_stars: Record<string, number>;
    placement_unit_code: string | null; created_at: string; updated_at: string;
  }>;
  quizScores: Array<{
    quiz_type: string; quiz_id: number; score: number; best_score: number;
    attempts: number; last_attempted_at: string;
    title: string; unit_code?: string; level_index?: number; stage_index?: number;
    specialty_slug: string;
  }>;
  examAttempts: Array<{
    id: number; subject_id: string; scope: string; exam_code: string;
    variant_index: number; score: number; passed: boolean;
    gems_deducted: number; attempted_at: string;
  }>;
  labCompletions: Array<{
    id: number; subject_id: string; lab_id: number; score: number; passed: boolean;
    attempts: number; completed_at: string;
    lab_code: string | null; lab_title: string | null;
  }>;
  recentMessages: Array<{
    id: number; role: string; subject_name: string;
    content_preview: string; is_diagnostic: number;
    stage_index: number | null; word_count: number | null; created_at: string;
  }>;
  recentActivity: Array<{
    id: number; event_type: string; path: string | null;
    label: string | null; detail: any; created_at: string;
  }>;
  masteryStats: Array<{
    subject_id: string; concept_count: number; avg_mastery: number;
    mastered_count: number; weak_count: number; last_updated_at: string;
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const allSubjects = [
  ...university.map(s => ({ id: s.id, name: s.name })),
  ...skills.flatMap(cat => cat.subjects.map(s => ({ id: s.id, name: s.name }))),
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 65) return "text-yellow-400";
  return "text-rose-400";
}

function scoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (score >= 65) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-rose-500/20 text-rose-400 border-rose-500/30";
}

function quizTypeLabel(t: string): string {
  if (t === "unit") return "وحدة";
  if (t === "level") return "مستوى";
  if (t === "stage") return "مرحلة";
  return t;
}

function eventTypeLabel(t: string): string {
  const map: Record<string, string> = {
    page_view: "زيارة صفحة", lesson_start: "بدء درس", lesson_complete: "إتمام درس",
    quiz_attempt: "محاولة اختبار", exam_attempt: "محاولة امتحان", lab_attempt: "محاولة مختبر",
    message_sent: "رسالة مُرسلة", subscription_start: "بدء اشتراك",
  };
  return map[t] ?? t;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminStudentMonitor() {
  const { toast } = useToast();

  // ── List state ─────────────────────────────────────────────────────────────
  const [students, setStudents]       = useState<StudentRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [specialtySlug, setSpecialty]   = useState("");
  const [subStatus, setSubStatus]       = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [sortBy, setSortBy]             = useState("last_active");
  const [sortDir, setSortDir]           = useState("desc");
  const LIMIT = 30;

  // ── Selected student ───────────────────────────────────────────────────────
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [detail, setDetail]             = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab]       = useState("overview");

  // ── Load student list ──────────────────────────────────────────────────────
  const loadStudents = useCallback(async (p = 1) => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort_by: sortBy, sort_dir: sortDir });
      if (search.trim())      params.set("search", search.trim());
      if (specialtySlug)      params.set("specialty_slug", specialtySlug);
      if (subStatus)          params.set("sub_status", subStatus);
      if (dateFrom)           params.set("date_from", dateFrom);
      if (dateTo)             params.set("date_to", dateTo);

      const res = await fetch(`/api/v4/admin/student-monitor/students?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStudents(data.students);
      setTotal(data.pagination.total);
      setPage(p);
    } catch (err: any) {
      toast({ title: "خطأ في تحميل الطلاب", description: err.message, variant: "destructive" });
    } finally {
      setLoadingList(false);
    }
  }, [search, specialtySlug, subStatus, dateFrom, dateTo, sortBy, sortDir, toast]);

  // ── Load student detail ────────────────────────────────────────────────────
  const loadDetail = useCallback(async (userId: number) => {
    setLoadingDetail(true);
    setDetail(null);
    setDetailTab("overview");
    try {
      const res = await fetch(`/api/v4/admin/student-monitor/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      setDetail(await res.json());
    } catch (err: any) {
      toast({ title: "خطأ في تحميل بيانات الطالب", description: err.message, variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  useEffect(() => { loadStudents(1); }, []);

  const handleSelectStudent = (s: StudentRow) => {
    setSelectedId(s.id);
    loadDetail(s.id);
  };

  const handleApplyFilters = () => loadStudents(1);

  const totalPages = Math.ceil(total / LIMIT);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-violet-400" />
        <div>
          <h2 className="text-xl font-bold text-white">مراقبة الطلاب الشاملة</h2>
          <p className="text-sm text-white/50">تابع كل طالب بالتفصيل — درس بدرس، رسالة برسالة، اختبار باختبار</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="border-violet-500/30 text-violet-300 text-xs">
            {total} طالب
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white"
            onClick={() => loadStudents(page)}
            disabled={loadingList}
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[80vh]">

        {/* ── LEFT: Student list + filters ──────────────────────────────── */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-3">

          {/* Filters */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Filter className="w-4 h-4" /> فلترة متقدمة
            </div>

            {/* Search */}
            <div>
              <Label className="text-xs text-white/50 mb-1 block">بحث (اسم / إيميل)</Label>
              <div className="relative">
                <Search className="absolute right-2 top-2.5 w-3.5 h-3.5 text-white/30" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleApplyFilters()}
                  placeholder="ابحث عن طالب..."
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30 text-sm pr-8 h-8"
                />
              </div>
            </div>

            {/* Specialty */}
            <div>
              <Label className="text-xs text-white/50 mb-1 block">التخصص</Label>
              <select
                value={specialtySlug}
                onChange={e => setSpecialty(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-md text-white text-sm h-8 px-2"
              >
                <option value="">كل التخصصات</option>
                {allSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Subscription status */}
            <div>
              <Label className="text-xs text-white/50 mb-1 block">حالة الاشتراك</Label>
              <select
                value={subStatus}
                onChange={e => setSubStatus(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-md text-white text-sm h-8 px-2"
              >
                <option value="">الكل</option>
                <option value="active">مشترك (نشط)</option>
                <option value="expired">منتهي الاشتراك</option>
                <option value="free">مجاني (بدون اشتراك)</option>
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-white/50 mb-1 block">من تاريخ</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-black/20 border-white/10 text-white text-xs h-8" />
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1 block">إلى تاريخ</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-black/20 border-white/10 text-white text-xs h-8" />
              </div>
            </div>

            {/* Sort */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-white/50 mb-1 block">ترتيب حسب</Label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-md text-white text-xs h-8 px-1"
                >
                  <option value="last_active">آخر نشاط</option>
                  <option value="name">الاسم</option>
                  <option value="quiz_count">الاختبارات</option>
                  <option value="exam_passes">نجاحات الامتحانات</option>
                  <option value="lab_passes">نجاحات المختبرات</option>
                  <option value="messages">الرسائل</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-white/50 mb-1 block">الاتجاه</Label>
                <select
                  value={sortDir}
                  onChange={e => setSortDir(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-md text-white text-xs h-8 px-1"
                >
                  <option value="desc">تنازلي ↓</option>
                  <option value="asc">تصاعدي ↑</option>
                </select>
              </div>
            </div>

            <Button
              className="w-full h-8 text-sm bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30"
              onClick={handleApplyFilters}
              disabled={loadingList}
            >
              {loadingList ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span className="mr-1">تطبيق الفلتر</span>
            </Button>
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[calc(80vh-280px)] pr-1">
            {loadingList && (
              <div className="text-center py-8 text-white/40">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                <p className="text-xs">جاري التحميل...</p>
              </div>
            )}
            {!loadingList && students.length === 0 && (
              <div className="text-center py-8 text-white/40">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">لا يوجد طلاب بهذه المعايير</p>
              </div>
            )}
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                className={`w-full text-right p-3 rounded-xl border transition-all duration-150 ${
                  selectedId === s.id
                    ? "bg-violet-500/20 border-violet-500/40"
                    : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {/* Avatar */}
                  {s.profile_image ? (
                    <img src={s.profile_image} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <User2 className="w-3.5 h-3.5 text-violet-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate leading-tight">
                      {s.display_name}
                    </div>
                    <div className="text-xs text-white/40 truncate">{s.email}</div>
                  </div>
                  {/* Sub status */}
                  {s.active_sub_count > 0 ? (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400" title="مشترك نشط" />
                  ) : s.sub_count > 0 ? (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-yellow-400" title="منتهي الاشتراك" />
                  ) : (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white/20" title="مجاني" />
                  )}
                </div>

                {/* Quick stats row */}
                <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
                  {s.quiz_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <BookOpen className="w-3 h-3" />{s.quiz_count}
                    </span>
                  )}
                  {s.exam_pass_count > 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-400/70">
                      <Trophy className="w-3 h-3" />{s.exam_pass_count}
                    </span>
                  )}
                  {s.message_count > 0 && (
                    <span className="flex items-center gap-0.5">
                      <MessageCircle className="w-3 h-3" />{s.message_count}
                    </span>
                  )}
                  {s.streak_days > 1 && (
                    <span className="flex items-center gap-0.5 text-orange-400/70">
                      <Zap className="w-3 h-3" />{s.streak_days}
                    </span>
                  )}
                  <span className="ml-auto text-white/25 text-[10px]">{formatDateShort(s.last_session_at)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm" variant="ghost"
                className="text-white/50 hover:text-white h-7 px-2"
                onClick={() => loadStudents(page - 1)}
                disabled={page <= 1 || loadingList}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-white/40">
                {page} / {totalPages}
              </span>
              <Button
                size="sm" variant="ghost"
                className="text-white/50 hover:text-white h-7 px-2"
                onClick={() => loadStudents(page + 1)}
                disabled={page >= totalPages || loadingList}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Student detail ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!selectedId && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-white/30">
                <User2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">اختر طالباً من القائمة</p>
                <p className="text-sm mt-1 opacity-70">ستظهر هنا كل تفاصيل نشاطه</p>
              </div>
            </div>
          )}

          {selectedId && loadingDetail && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-white/40">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="text-sm">جاري تحميل بيانات الطالب...</p>
              </div>
            </div>
          )}

          {selectedId && !loadingDetail && detail && (
            <div className="flex flex-col gap-4 h-full">

              {/* Student header card */}
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {detail.user.profile_image ? (
                    <img src={detail.user.profile_image} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-violet-500/30 flex items-center justify-center flex-shrink-0">
                      <User2 className="w-7 h-7 text-violet-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{detail.user.display_name}</h3>
                      {detail.user.nukhba_plan && (
                        <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                          {detail.user.nukhba_plan}
                        </Badge>
                      )}
                      {detail.subscriptions.some(s => s.is_active) ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs flex items-center gap-1">
                          <Wifi className="w-3 h-3" /> مشترك نشط
                        </Badge>
                      ) : detail.subscriptions.length > 0 ? (
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs flex items-center gap-1">
                          <WifiOff className="w-3 h-3" /> منتهي الاشتراك
                        </Badge>
                      ) : (
                        <Badge className="bg-white/10 text-white/50 border-white/10 text-xs">مجاني</Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/50 mt-0.5">{detail.user.email}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      انضم {formatDateShort(detail.user.created_at)} •
                      آخر دخول {formatDate(detail.user.last_session_at)}
                    </p>
                  </div>

                  {/* Quick stat chips */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="bg-orange-500/15 border border-orange-500/20 rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-orange-300 font-bold text-base leading-none">{detail.user.streak_days}</div>
                      <div className="text-orange-300/60 mt-0.5">سلسلة يوم</div>
                    </div>
                    <div className="bg-yellow-500/15 border border-yellow-500/20 rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-yellow-300 font-bold text-base leading-none">{detail.user.points}</div>
                      <div className="text-yellow-300/60 mt-0.5">نقطة</div>
                    </div>
                    <div className="bg-cyan-500/15 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 text-center">
                      <div className="text-cyan-300 font-bold text-base leading-none">{detail.user.gems_balance}</div>
                      <div className="text-cyan-300/60 mt-0.5">جوهرة</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail tabs */}
              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 min-h-0 flex flex-col">
                <TabsList className="bg-black/30 border border-white/5 w-full justify-start overflow-x-auto flex-shrink-0 rounded-xl h-9">
                  <TabsTrigger value="overview"    className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">📊 نظرة عامة</TabsTrigger>
                  <TabsTrigger value="quizzes"     className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">📝 الاختبارات ({detail.quizScores.length})</TabsTrigger>
                  <TabsTrigger value="exams"       className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">🎯 الامتحانات ({detail.examAttempts.length})</TabsTrigger>
                  <TabsTrigger value="labs"        className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">🧪 المختبرات ({detail.labCompletions.length})</TabsTrigger>
                  <TabsTrigger value="messages"    className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">💬 المحادثات ({detail.recentMessages.length})</TabsTrigger>
                  <TabsTrigger value="activity"    className="text-xs data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-200">⚡ النشاط ({detail.recentActivity.length})</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-3 min-h-0">

                  {/* ── OVERVIEW tab ─────────────────────────────────────── */}
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { icon: BookOpen,      label: "اختبارات",       value: detail.quizScores.length,                                    sub: `متوسط ${detail.quizScores.length ? Math.round(detail.quizScores.reduce((a,q)=>a+q.best_score,0)/detail.quizScores.length) : 0}%`,  wrap: "bg-blue-500/10 border-blue-500/20",    ic: "text-blue-400",   vl: "text-blue-300",   lb: "text-blue-300/70" },
                        { icon: Trophy,        label: "امتحانات نجاح",   value: detail.examAttempts.filter(e=>e.passed).length,              sub: `من ${detail.examAttempts.length} محاولة`,                                                                                           wrap: "bg-emerald-500/10 border-emerald-500/20", ic: "text-emerald-400", vl: "text-emerald-300", lb: "text-emerald-300/70" },
                        { icon: FlaskConical,  label: "مختبرات نجاح",   value: detail.labCompletions.filter(l=>l.passed).length,            sub: `من ${detail.labCompletions.length} مختبر`,                                                                                          wrap: "bg-purple-500/10 border-purple-500/20",  ic: "text-purple-400", vl: "text-purple-300", lb: "text-purple-300/70" },
                        { icon: MessageCircle, label: "رسائل مُرسلة",   value: detail.recentMessages.filter(m=>m.role==="user").length,      sub: "آخر 200 رسالة",                                                                                                                     wrap: "bg-cyan-500/10 border-cyan-500/20",     ic: "text-cyan-400",   vl: "text-cyan-300",   lb: "text-cyan-300/70" },
                        { icon: Brain,         label: "مفاهيم مُتقنة",  value: detail.masteryStats.reduce((a,m)=>a+m.mastered_count,0),     sub: `من ${detail.masteryStats.reduce((a,m)=>a+m.concept_count,0)} مفهوم`,                                                                 wrap: "bg-violet-500/10 border-violet-500/20", ic: "text-violet-400", vl: "text-violet-300", lb: "text-violet-300/70" },
                        { icon: GraduationCap, label: "مسارات تعلم",    value: detail.paths.length,                                        sub: `${detail.paths.reduce((a,p)=>a+p.unlocked_count,0)} درس مفتوح`,                                                                       wrap: "bg-orange-500/10 border-orange-500/20", ic: "text-orange-400", vl: "text-orange-300", lb: "text-orange-300/70" },
                      ] as const).map(({ icon: Icon, label, value, sub, wrap, ic, vl, lb }) => (
                        <div key={label} className={`${wrap} border rounded-xl p-3 text-center`}>
                          <Icon className={`w-5 h-5 ${ic} mx-auto mb-1.5`} />
                          <div className={`text-2xl font-black ${vl}`}>{value}</div>
                          <div className={`text-xs ${lb} font-medium`}>{label}</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Subscriptions */}
                    {detail.subscriptions.length > 0 && (
                      <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                        <div className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" /> الاشتراكات
                        </div>
                        <div className="space-y-1.5">
                          {detail.subscriptions.map(sub => (
                            <div key={sub.id} className="flex items-center gap-3 text-sm">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.is_active ? "bg-emerald-400" : "bg-white/20"}`} />
                              <span className="text-white/80 flex-1">{sub.subject_name}</span>
                              <span className="text-white/40 text-xs">{sub.plan ?? "—"}</span>
                              <span className={`text-xs ${sub.is_active ? "text-emerald-400" : "text-rose-400"}`}>
                                {sub.is_active ? `ينتهي ${formatDateShort(sub.expires_at)}` : `انتهى ${formatDateShort(sub.expires_at)}`}
                              </span>
                              <span className="text-cyan-400/70 text-xs">{sub.gems_balance} 💎</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning paths */}
                    {detail.paths.length > 0 && (
                      <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                        <div className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" /> مسارات التعلم الحالية
                        </div>
                        <div className="space-y-2">
                          {detail.paths.map(path => {
                            const starsObj = path.lesson_stars as Record<string, number>;
                            const starValues = Object.values(starsObj || {});
                            const avgStars = starValues.length ? (starValues.reduce((a, b) => a + b, 0) / starValues.length).toFixed(1) : "0";
                            return (
                              <div key={path.subject_id} className="bg-black/20 rounded-lg p-2.5 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white/80 font-medium">{path.subject_id}</span>
                                  <span className="text-xs text-white/40">{path.path_type}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/50">
                                  <span>الدرس الحالي: <span className="text-blue-300">{path.current_lesson_code ?? "—"}</span></span>
                                  <span>{path.unlocked_count} درس مفتوح</span>
                                  <span className="text-yellow-400">★ {avgStars}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mastery stats */}
                    {detail.masteryStats.length > 0 && (
                      <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                        <div className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-violet-400" /> إتقان المفاهيم
                        </div>
                        <div className="space-y-2">
                          {detail.masteryStats.map(m => (
                            <div key={m.subject_id} className="flex items-center gap-3 text-xs">
                              <span className="text-white/70 w-32 truncate flex-shrink-0">{m.subject_id}</span>
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${m.avg_mastery}%`,
                                    backgroundColor: m.avg_mastery >= 80 ? "#34d399" : m.avg_mastery >= 60 ? "#fbbf24" : "#f87171",
                                  }}
                                />
                              </div>
                              <span className={`w-10 text-left font-medium ${scoreColor(m.avg_mastery)}`}>{m.avg_mastery}%</span>
                              <span className="text-white/30">({m.mastered_count}/{m.concept_count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── QUIZZES tab ───────────────────────────────────────── */}
                  <TabsContent value="quizzes" className="mt-0">
                    {detail.quizScores.length === 0 ? (
                      <EmptyState icon={BookOpen} text="لم يؤدِّ أي اختبار بعد" />
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/40 text-xs border-b border-white/5">
                            <th className="text-right pb-2 font-normal">العنوان</th>
                            <th className="text-center pb-2 font-normal">النوع</th>
                            <th className="text-center pb-2 font-normal">التخصص</th>
                            <th className="text-center pb-2 font-normal">آخر درجة</th>
                            <th className="text-center pb-2 font-normal">أفضل درجة</th>
                            <th className="text-center pb-2 font-normal">المحاولات</th>
                            <th className="text-right pb-2 font-normal">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {detail.quizScores.map(q => (
                            <tr key={q.quiz_id + q.quiz_type} className="hover:bg-white/3">
                              <td className="py-2 text-white/80 max-w-[180px] truncate">{q.title || `اختبار #${q.quiz_id}`}</td>
                              <td className="py-2 text-center">
                                <Badge className="bg-white/10 text-white/60 border-white/10 text-xs">{quizTypeLabel(q.quiz_type)}</Badge>
                              </td>
                              <td className="py-2 text-center text-white/40 text-xs">{q.specialty_slug}</td>
                              <td className="py-2 text-center">
                                <span className={`font-bold ${scoreColor(q.score)}`}>{q.score}%</span>
                              </td>
                              <td className="py-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold border ${scoreBg(q.best_score)}`}>
                                  {q.best_score}%
                                </span>
                              </td>
                              <td className="py-2 text-center text-white/50">{q.attempts}</td>
                              <td className="py-2 text-white/30 text-xs">{formatDate(q.last_attempted_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </TabsContent>

                  {/* ── EXAMS tab ─────────────────────────────────────────── */}
                  <TabsContent value="exams" className="mt-0">
                    {detail.examAttempts.length === 0 ? (
                      <EmptyState icon={Trophy} text="لم يؤدِّ أي امتحان بعد" />
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/40 text-xs border-b border-white/5">
                            <th className="text-right pb-2 font-normal">كود الامتحان</th>
                            <th className="text-center pb-2 font-normal">التخصص</th>
                            <th className="text-center pb-2 font-normal">النطاق</th>
                            <th className="text-center pb-2 font-normal">الدرجة</th>
                            <th className="text-center pb-2 font-normal">النتيجة</th>
                            <th className="text-center pb-2 font-normal">جواهر</th>
                            <th className="text-right pb-2 font-normal">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {detail.examAttempts.map(e => (
                            <tr key={e.id} className="hover:bg-white/3">
                              <td className="py-2 text-white/70 font-mono text-xs">{e.exam_code}</td>
                              <td className="py-2 text-center text-white/40 text-xs">{e.subject_id}</td>
                              <td className="py-2 text-center text-white/50 text-xs">{e.scope}</td>
                              <td className="py-2 text-center">
                                <span className={`font-bold ${scoreColor(e.score)}`}>{e.score}%</span>
                              </td>
                              <td className="py-2 text-center">
                                {e.passed ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> نجاح
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                                    <XCircle className="w-3.5 h-3.5" /> رسوب
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-center text-cyan-400/70 text-xs">{e.gems_deducted > 0 ? `-${e.gems_deducted}💎` : "—"}</td>
                              <td className="py-2 text-white/30 text-xs">{formatDate(e.attempted_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </TabsContent>

                  {/* ── LABS tab ──────────────────────────────────────────── */}
                  <TabsContent value="labs" className="mt-0">
                    {detail.labCompletions.length === 0 ? (
                      <EmptyState icon={FlaskConical} text="لم يُكمل أي مختبر بعد" />
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/40 text-xs border-b border-white/5">
                            <th className="text-right pb-2 font-normal">المختبر</th>
                            <th className="text-center pb-2 font-normal">التخصص</th>
                            <th className="text-center pb-2 font-normal">الدرجة</th>
                            <th className="text-center pb-2 font-normal">النتيجة</th>
                            <th className="text-center pb-2 font-normal">المحاولات</th>
                            <th className="text-right pb-2 font-normal">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {detail.labCompletions.map(l => (
                            <tr key={l.id} className="hover:bg-white/3">
                              <td className="py-2 text-white/80 max-w-[200px] truncate">
                                {l.lab_title || l.lab_code || `مختبر #${l.lab_id}`}
                              </td>
                              <td className="py-2 text-center text-white/40 text-xs">{l.subject_id}</td>
                              <td className="py-2 text-center">
                                <span className={`font-bold ${scoreColor(l.score)}`}>{l.score}%</span>
                              </td>
                              <td className="py-2 text-center">
                                {l.passed ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> نجاح
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                                    <XCircle className="w-3.5 h-3.5" /> رسوب
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-center text-white/50">{l.attempts}</td>
                              <td className="py-2 text-white/30 text-xs">{formatDate(l.completed_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </TabsContent>

                  {/* ── MESSAGES tab ─────────────────────────────────────── */}
                  <TabsContent value="messages" className="mt-0 space-y-2">
                    {detail.recentMessages.length === 0 ? (
                      <EmptyState icon={MessageCircle} text="لا توجد محادثات مسجّلة" />
                    ) : (
                      detail.recentMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`rounded-xl p-3 text-sm ${
                            msg.role === "user"
                              ? "bg-blue-500/10 border border-blue-500/20 mr-8"
                              : "bg-black/30 border border-white/5 ml-8"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-xs font-semibold ${msg.role === "user" ? "text-blue-400" : "text-violet-400"}`}>
                              {msg.role === "user" ? "🎓 الطالب" : "🤖 المعلم"}
                            </span>
                            {msg.is_diagnostic === 1 && (
                              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/20 text-[10px] py-0">تشخيصي</Badge>
                            )}
                            <span className="text-white/30 text-[10px] mr-auto">{msg.subject_name}</span>
                            <span className="text-white/25 text-[10px]">{formatDate(msg.created_at)}</span>
                          </div>
                          <p className="text-white/70 leading-relaxed text-xs line-clamp-4 whitespace-pre-wrap">
                            {msg.content_preview}
                          </p>
                          {msg.word_count && (
                            <div className="text-[10px] text-white/25 mt-1">{msg.word_count} كلمة</div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* ── ACTIVITY tab ─────────────────────────────────────── */}
                  <TabsContent value="activity" className="mt-0">
                    {detail.recentActivity.length === 0 ? (
                      <EmptyState icon={Activity} text="لا يوجد سجل نشاط" />
                    ) : (
                      <div className="space-y-1">
                        {detail.recentActivity.map(ev => (
                          <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/70">{eventTypeLabel(ev.event_type)}</span>
                                {ev.label && <span className="text-xs text-white/40 truncate">{ev.label}</span>}
                              </div>
                              {ev.path && (
                                <div className="text-xs text-white/30 truncate mt-0.5 font-mono">{ev.path}</div>
                              )}
                            </div>
                            <span className="text-[11px] text-white/25 flex-shrink-0 mt-0.5">{formatDate(ev.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                </div>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state helper ────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-12 text-center text-white/30">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-25" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
