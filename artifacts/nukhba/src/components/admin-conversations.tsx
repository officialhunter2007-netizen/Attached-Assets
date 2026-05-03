import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, Search, RefreshCw, MessageCircle, User, BookOpen, Calendar } from "lucide-react";
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
  // Null on user rows + on legacy assistant rows.
  wordCount: number | null;
  overLength: boolean;
  userId: number;
  userName: string | null;
  userEmail: string | null;
}

function fmtAr(dateStr: string) {
  return new Date(dateStr).toLocaleString("ar-YE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AdminConversations() {
  const { toast } = useToast();

  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState("30");

  const [loading, setLoading] = useState(false);
  const [onlyOverLength, setOnlyOverLength] = useState(false);
  const [rawText, setRawText] = useState("");
  const [lines, setLines] = useState<ConversationLine[]>([]);

  const loadStudents = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoadingStudents(true);
    setStudents([]);
    setSelectedUserId("");
    try {
      const r = await fetch(`/api/admin/insights/conversation-students?subjectId=${encodeURIComponent(sid)}`, {
        credentials: "include",
      });
      if (r.ok) {
        const data = await r.json();
        setStudents(data.students ?? []);
      }
    } catch {}
    setLoadingStudents(false);
  }, []);

  const handleSubjectChange = (sid: string) => {
    setSubjectId(sid);
    setLines([]);
    setRawText("");
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
    try {
      const r = await fetch(buildUrl(), { credentials: "include" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const text = await r.text();
      setRawText(text);

      // Parse the plain-text format into structured lines for display.
      const parsed: ConversationLine[] = [];
      const sections = text.split(/\n\[(?:🧑 الطالب|🤖 المعلم الذكي)/).slice(1);
      const fullText = text;
      const msgRegex = /\[(🧑 الطالب|🤖 المعلم الذكي) — ([^\]\n]+)\]\n\n([\s\S]*?)(?=\n\[(?:🧑|🤖)|─{10,}|═{10,}|$)/g;
      let match: RegExpExecArray | null;

      // Index user headers by position so each parsed message can be
      // attributed to the student whose header most recently preceded
      // it in the export. Without this, the over-length filter groups
      // every flagged reply under user 0/blank.
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

      while ((match = msgRegex.exec(fullText)) !== null) {
        const lastUser = lookupUser(match.index);
        const role = match[1] === "🧑 الطالب" ? "user" : "assistant";
        const rawHeader = match[2].trim();
        // Header format: "DATE (تشخيصي · مرحلة 3 · 245 كلمة · ⚠️ تجاوز السقف)".
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
          role,
          content,
          createdAt: dateStr,
          isDiagnostic: isDiag,
          stageIndex,
          wordCount,
          overLength,
          userId: lastUser.userId,
          userName: lastUser.name,
          userEmail: lastUser.email,
        });
      }

      // If regex parse fails, just show raw text.
      if (parsed.length === 0 && text.length > 50) {
        setLines([]);
      } else {
        setLines(parsed);
      }
    } catch (e: any) {
      toast({ title: "فشل جلب المحادثات", description: e?.message, variant: "destructive" });
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
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${safeName}-conversations-${today}.txt`;
    const blob = new Blob([rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overLengthCount = React.useMemo(
    () => lines.filter(l => l.role === "assistant" && l.overLength).length,
    [lines],
  );

  const groupedMessages = React.useMemo(() => {
    if (lines.length === 0) return [];
    const filtered = onlyOverLength
      ? lines.filter(l => l.role === "assistant" && l.overLength)
      : lines;
    const groups: Array<{ userId: number; name: string; email: string; messages: ConversationLine[] }> = [];
    let current: (typeof groups)[0] | null = null;
    for (const l of filtered) {
      if (!current || current.userId !== l.userId) {
        current = { userId: l.userId, name: l.userName ?? "", email: l.userEmail ?? "", messages: [] };
        groups.push(current);
      }
      current.messages.push(l);
    }
    return groups;
  }, [lines, onlyOverLength]);

  const subjectObj = allSubjects.find(s => s.id === subjectId);

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

          {/* Subject */}
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

          {/* Student */}
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
              <option value="">— جميع الطلاب —</option>
              {students.map(s => (
                <option key={s.userId} value={String(s.userId)}>
                  {s.displayName ?? s.email ?? `ID ${s.userId}`} ({s.messageCount} رسالة)
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
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

          {/* End date / days */}
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

        <div className="flex items-center gap-3 pt-1">
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
              <Button
                onClick={copyText}
                variant="outline"
                className="border-white/10 gap-2 text-sm"
              >
                <Copy className="w-4 h-4" />
                نسخ النص
              </Button>
              <Button
                onClick={downloadFile}
                variant="outline"
                className="border-white/10 gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                تحميل .txt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Conversation display */}
      {rawText && lines.length === 0 && (
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
              <span>{groupedMessages.length} طالب · {lines.length} رسالة</span>
              {subjectObj && <span>في مادة {subjectObj.emoji} {subjectObj.name}</span>}
            </div>
            <label className={`flex items-center gap-2 px-2.5 py-1 rounded-md border cursor-pointer text-xs select-none ${
              onlyOverLength
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : "border-white/10 bg-black/30 hover:bg-white/5"
            }`}>
              <input
                type="checkbox"
                checked={onlyOverLength}
                onChange={e => setOnlyOverLength(e.target.checked)}
                className="accent-rose-400"
              />
              <span>عرض التجاوزات فقط</span>
              <span className="opacity-70">({overLengthCount})</span>
            </label>
          </div>

          {onlyOverLength && groupedMessages.length === 0 && (
            <div className="text-sm text-muted-foreground bg-black/30 border border-white/10 rounded-xl p-6 text-center">
              لا توجد ردود تجاوزت سقف الكلمات في هذه النافذة.
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
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom copy/download bar */}
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
