import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Copy, Search, RefreshCw, MessageCircle, User, BookOpen, Calendar,
  Filter, X, AlertTriangle,
} from "lucide-react";
import { university, skills } from "@/lib/curriculum";

const allSubjects = [
  ...university.map(s => ({ id: s.id, name: s.name, emoji: s.emoji ?? "📚" })),
  ...skills.flatMap(cat => cat.subjects.map(s => ({ id: s.id, name: s.name, emoji: s.emoji ?? "📚" }))),
];

interface Student {
  userId: number;
  displayName: string | null;
  email: string | null;
  messageCount: number;
}

interface ConversationLine {
  role: string;
  content: string;
  createdAt: string;
  isDiagnostic: number;
  stageIndex: number | null;
  wordCount: number | null;
  overLength: boolean;
  userId: number;
  userName: string | null;
  userEmail: string | null;
}

type RoleFilter = "all" | "user" | "assistant";

function extractErr(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

export function AdminConversations() {
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState("30");

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [lines, setLines] = useState<ConversationLine[]>([]);

  // Result-side filters (applied client-side after fetch).
  const [onlyOverLength, setOnlyOverLength] = useState(false);
  const [onlyDiagnostic, setOnlyDiagnostic] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [textSearch, setTextSearch] = useState("");

  const loadStudents = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoadingStudents(true);
    setStudents([]);
    setSelectedUserId("");
    setStudentsError(null);
    try {
      const r = await fetch(`/api/admin/insights/conversation-students?subjectId=${encodeURIComponent(sid)}`, {
        credentials: "include",
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setStudents(Array.isArray(data?.students) ? data.students : []);
    } catch (err) {
      const msg = extractErr(err, "تعذّر جلب قائمة الطلاب");
      setStudentsError(msg);
      toast({ title: "فشل تحميل الطلاب", description: msg, variant: "destructive" });
    }
    setLoadingStudents(false);
  }, [toast]);

  const handleSubjectChange = (sid: string) => {
    setSubjectId(sid);
    setLines([]);
    setRawText("");
    setFetchError(null);
    loadStudents(sid);
  };

  const buildUrl = () => {
    const params = new URLSearchParams({ subjectId, format: "text" });
    if (selectedUserId) params.set("userId", selectedUserId);
    if (startDate) {
      params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
    } else {
      params.set("days", days || "30");
    }
    return `/api/admin/insights/course-conversations-export?${params}`;
  };

  const fetchConversations = async () => {
    if (!subjectId) {
      toast({ title: "اختر المادة أولاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    setLines([]);
    setRawText("");
    setFetchError(null);
    try {
      const r = await fetch(buildUrl(), { credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const text = await r.text();
      setRawText(text);

      const parsed: ConversationLine[] = [];
      const fullText = text;
      const msgRegex = /\[(🧑 الطالب|🤖 المعلم الذكي) — ([^\]\n]+)\]\n\n([\s\S]*?)(?=\n\[(?:🧑|🤖)|─{10,}|═{10,}|$)/g;

      const userHeaderRegex = /─{50}\n(.+?) — (.+?) — ID (\d+)\n─{50}/g;
      const userHeaders: Array<{ pos: number; userId: number; name: string; email: string }> = [];
      let um: RegExpExecArray | null;
      while ((um = userHeaderRegex.exec(fullText)) !== null) {
        userHeaders.push({
          pos: um.index,
          userId: parseInt(um[3], 10),
          name: um[1],
          email: um[2],
        });
      }
      const lookupUser = (msgPos: number) => {
        let found = { userId: 0, name: "", email: "" };
        for (const h of userHeaders) {
          if (h.pos <= msgPos) found = { userId: h.userId, name: h.name, email: h.email };
          else break;
        }
        return found;
      };

      let match: RegExpExecArray | null;
      while ((match = msgRegex.exec(fullText)) !== null) {
        const lastUser = lookupUser(match.index);
        const role = match[1] === "🧑 الطالب" ? "user" : "assistant";
        const rawHeader = match[2].trim();
        const metaMatch = rawHeader.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        const dateStr = metaMatch ? metaMatch[1].trim() : rawHeader;
        const metaTags = metaMatch ? metaMatch[2].split("·").map(s => s.trim()) : [];
        const wordTag = metaTags.find(t => /\d+\s*كلمة/.test(t)) ?? null;
        const wordCount = wordTag ? parseInt(wordTag, 10) : null;
        const overLength = metaTags.some(t => t.includes("تجاوز السقف"));
        const isDiag = metaTags.some(t => t === "تشخيصي") ? 1 : 0;
        const stageTag = metaTags.find(t => /^مرحلة\s+\d+$/.test(t));
        const stageIndex = stageTag ? parseInt(stageTag.replace(/\D/g, ""), 10) : null;
        const content = match[3].trim();
        parsed.push({
          role, content, createdAt: dateStr,
          isDiagnostic: isDiag, stageIndex, wordCount, overLength,
          userId: lastUser.userId, userName: lastUser.name, userEmail: lastUser.email,
        });
      }

      setLines(parsed);
    } catch (err) {
      const msg = extractErr(err, "تعذّر جلب المحادثات");
      setFetchError(msg);
      toast({ title: "فشل جلب المحادثات", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  const copyText = async () => {
    if (!rawText) return;
    try {
      await navigator.clipboard.writeText(rawText);
      toast({ title: "تم النسخ", description: "تم نسخ نص المحادثات إلى الحافظة" });
    } catch {
      toast({ title: "فشل النسخ", description: "انسخ النص يدوياً من المربع أدناه", variant: "destructive" });
    }
  };

  const downloadFile = () => {
    if (!rawText) return;
    const subject = allSubjects.find(s => s.id === subjectId);
    const safeName = (subject?.name ?? subjectId).replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, "-").slice(0, 40);
    const range = startDate
      ? `${startDate}_${endDate || new Date().toISOString().slice(0, 10)}`
      : `last-${days || "30"}d`;
    const filename = `${safeName}-conversations-${range}.txt`;
    const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overLengthCount = useMemo(
    () => lines.filter(l => l.role === "assistant" && l.overLength).length,
    [lines],
  );
  const diagnosticCount = useMemo(
    () => lines.filter(l => l.isDiagnostic === 1).length,
    [lines],
  );
  const availableStages = useMemo(() => {
    const s = new Set<number>();
    for (const l of lines) if (l.stageIndex != null) s.add(l.stageIndex);
    return Array.from(s).sort((a, b) => a - b);
  }, [lines]);

  const filteredLines = useMemo(() => {
    const needle = textSearch.trim().toLowerCase();
    return lines.filter(l => {
      if (onlyOverLength && !(l.role === "assistant" && l.overLength)) return false;
      if (onlyDiagnostic && l.isDiagnostic !== 1) return false;
      if (roleFilter !== "all" && l.role !== roleFilter) return false;
      if (stageFilter !== "" && String(l.stageIndex ?? "") !== stageFilter) return false;
      if (needle && !l.content.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [lines, onlyOverLength, onlyDiagnostic, roleFilter, stageFilter, textSearch]);

  const groupedMessages = useMemo(() => {
    if (filteredLines.length === 0) return [];
    const groups: Array<{ userId: number; name: string; email: string; messages: ConversationLine[] }> = [];
    let current: (typeof groups)[0] | null = null;
    for (const l of filteredLines) {
      if (!current || current.userId !== l.userId) {
        current = { userId: l.userId, name: l.userName ?? "", email: l.userEmail ?? "", messages: [] };
        groups.push(current);
      }
      current.messages.push(l);
    }
    return groups;
  }, [filteredLines]);

  const subjectObj = allSubjects.find(s => s.id === subjectId);
  const hasResultFilters =
    onlyOverLength || onlyDiagnostic || roleFilter !== "all" || stageFilter !== "" || textSearch.trim() !== "";

  const clearResultFilters = () => {
    setOnlyOverLength(false);
    setOnlyDiagnostic(false);
    setRoleFilter("all");
    setStageFilter("");
    setTextSearch("");
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const out: React.ReactNode[] = [];
    let i = 0;
    let idx = lower.indexOf(needle, i);
    let key = 0;
    while (idx !== -1) {
      if (idx > i) out.push(text.slice(i, idx));
      out.push(
        <mark key={key++} className="bg-amber-400/40 text-amber-50 rounded px-0.5">
          {text.slice(idx, idx + needle.length)}
        </mark>
      );
      i = idx + needle.length;
      idx = lower.indexOf(needle, i);
    }
    if (i < text.length) out.push(text.slice(i));
    return out;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold">عارض محادثات المعلم الذكي</h2>
        <span className="text-xs text-muted-foreground">للمراجعة وتطوير هندسة البرومت</span>
      </div>

      {/* Filter bar */}
      <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> المادة
            </Label>
            <select
              value={subjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">— اختر مادة —</option>
              {allSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> الطالب {loadingStudents && <span className="text-[10px] animate-pulse">جارٍ التحميل…</span>}
            </Label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              disabled={!subjectId || loadingStudents}
              className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
            >
              <option value="">— جميع الطلاب ({students.length}) —</option>
              {students.map(s => (
                <option key={s.userId} value={String(s.userId)}>
                  {s.displayName ?? s.email ?? `ID ${s.userId}`} ({s.messageCount} رسالة)
                </option>
              ))}
            </select>
            {studentsError && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" /> {studentsError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> من تاريخ
            </Label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            {startDate ? (
              <>
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> إلى تاريخ
                </Label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
                  dir="ltr"
                />
              </>
            ) : (
              <>
                <Label className="text-xs text-muted-foreground">آخر عدد أيام</Label>
                <select
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="7">7 أيام</option>
                  <option value="14">14 يومًا</option>
                  <option value="30">30 يومًا</option>
                  <option value="60">60 يومًا</option>
                  <option value="90">90 يومًا</option>
                  <option value="180">180 يومًا</option>
                  <option value="365">سنة كاملة</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <Button
            onClick={fetchConversations}
            disabled={loading || !subjectId}
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? "جارٍ الجلب…" : "جلب المحادثات"}
          </Button>
          {rawText && (
            <>
              <Button onClick={copyText} variant="outline" className="border-white/10 gap-2 text-sm">
                <Copy className="w-4 h-4" />
                نسخ النص
              </Button>
              <Button onClick={downloadFile} variant="outline" className="border-white/10 gap-2 text-sm">
                <Download className="w-4 h-4" />
                تحميل .txt
              </Button>
            </>
          )}
        </div>

        {fetchError && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}
      </div>

      {/* Result-side filter bar (only after a successful fetch with parsed lines) */}
      {lines.length > 0 && (
        <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">فلاتر دقيقة على النتائج</span>
            {hasResultFilters && (
              <button
                onClick={clearResultFilters}
                className="mr-auto inline-flex items-center gap-1 text-amber-400 hover:text-amber-300"
              >
                <X className="w-3 h-3" /> مسح كل الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">بحث في النص</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={textSearch}
                  onChange={e => setTextSearch(e.target.value)}
                  placeholder="كلمة أو جملة…"
                  className="w-full text-sm bg-black/40 border border-white/10 rounded-lg pr-7 pl-3 py-2 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">الدور</Label>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as RoleFilter)}
                className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">الكل</option>
                <option value="user">🧑 الطالب فقط</option>
                <option value="assistant">🤖 المعلم فقط</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">المرحلة</Label>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                disabled={availableStages.length === 0}
                className="w-full text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
              >
                <option value="">جميع المراحل</option>
                {availableStages.map(s => (
                  <option key={s} value={String(s)}>مرحلة {s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">رايات</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <label className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer text-[11px] select-none ${
                  onlyOverLength
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                    : "border-white/10 bg-black/30 hover:bg-white/5"
                }`}>
                  <input type="checkbox" checked={onlyOverLength} onChange={e => setOnlyOverLength(e.target.checked)} className="accent-rose-400" />
                  تجاوزات ({overLengthCount})
                </label>
                <label className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer text-[11px] select-none ${
                  onlyDiagnostic
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-black/30 hover:bg-white/5"
                }`}>
                  <input type="checkbox" checked={onlyDiagnostic} onChange={e => setOnlyDiagnostic(e.target.checked)} className="accent-amber-400" />
                  تشخيصي ({diagnosticCount})
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw fallback when parsing fails */}
      {rawText && lines.length === 0 && !loading && (
        <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-sm font-medium text-muted-foreground">النص الخام</span>
            <Button size="sm" variant="ghost" onClick={copyText} className="h-7 gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> نسخ
            </Button>
          </div>
          <textarea
            readOnly
            value={rawText}
            dir="ltr"
            className="w-full h-[500px] bg-transparent p-4 text-xs font-mono text-foreground/80 resize-y focus:outline-none"
          />
        </div>
      )}

      {lines.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>
                {groupedMessages.length} طالب · {filteredLines.length} رسالة
                {filteredLines.length !== lines.length && (
                  <span className="opacity-70"> من أصل {lines.length}</span>
                )}
              </span>
              {subjectObj && <span>في مادة {subjectObj.emoji} {subjectObj.name}</span>}
            </div>
          </div>

          {groupedMessages.length === 0 && (
            <div className="text-sm text-muted-foreground bg-black/30 border border-white/10 rounded-xl p-6 text-center">
              لا توجد رسائل تطابق الفلاتر الحالية.
            </div>
          )}

          {groupedMessages.map((g, gi) => (
            <div key={g.userId || gi} className="bg-black/20 border border-white/8 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{g.name || "(بدون اسم)"}</p>
                  <p className="text-xs text-muted-foreground truncate">{g.email} · {g.messages.length} رسالة</p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {g.messages.map((m, mi) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={mi} className={`flex gap-3 ${isUser ? "flex-row" : "flex-row-reverse"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5 ${
                        isUser ? "bg-sky-500/20 border border-sky-500/30" : "bg-emerald-500/20 border border-emerald-500/30"
                      }`}>
                        {isUser ? "🧑" : "🤖"}
                      </div>
                      <div className={`flex-1 min-w-0 space-y-1.5 ${isUser ? "" : "items-end"}`}>
                        <div className={`flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap ${isUser ? "" : "flex-row-reverse"}`}>
                          <span className="font-medium">{isUser ? "الطالب" : "المعلم الذكي"}</span>
                          <span>{m.createdAt}</span>
                          {m.isDiagnostic ? <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-[10px]">تشخيصي</span> : null}
                          {m.stageIndex != null ? <span className="px-1.5 py-0.5 bg-white/5 text-muted-foreground rounded text-[10px]">مرحلة {m.stageIndex}</span> : null}
                          {!isUser && m.wordCount != null ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                m.overLength
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-white/5 text-muted-foreground"
                              }`}
                              title={m.overLength ? "تجاوز سقف الكلمات لفئة الرد" : "عدد كلمات الرد"}
                            >
                              {m.wordCount} كلمة{m.overLength ? " ⚠️" : ""}
                            </span>
                          ) : null}
                        </div>
                        <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? "bg-sky-500/10 border border-sky-500/15 text-sky-50"
                            : "bg-emerald-500/10 border border-emerald-500/15 text-emerald-50"
                        }`}>
                          {highlight(m.content, textSearch.trim())}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2 justify-end">
            <Button onClick={copyText} variant="outline" className="border-white/10 gap-2">
              <Copy className="w-4 h-4" />
              نسخ كل النص
            </Button>
            <Button onClick={downloadFile} variant="outline" className="border-white/10 gap-2">
              <Download className="w-4 h-4" />
              تحميل .txt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
