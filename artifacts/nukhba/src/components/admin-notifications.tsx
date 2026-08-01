/**
 * AdminNotifications — واجهة الأدمن لإرسال الإشعارات الفورية
 * استهداف: الكل / تخصص / مستوى / وحدة / مهارة / مستخدمون بعينهم
 */
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Send, Users, Loader2, CheckCircle2,
  History, X, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { university, skills as skillCats } from "@/lib/curriculum";

// ── Types ──────────────────────────────────────────────────────────────────────
type TargetType = "all" | "specialty" | "level" | "unit" | "skill" | "users";

interface Subscriber {
  user_id: number;
  email: string;
  display_name: string | null;
  device_count: number;
}

interface NotifLog {
  id: number;
  title: string;
  body: string;
  url: string;
  target_filter: {
    targetType: TargetType;
    specialtyId?: string;
    level?: string;
    unitCode?: string;
    skillId?: string;
    userIds?: number[];
  };
  sent_count: number;
  failed_count: number;
  created_at: string;
  admin_email: string;
}

// ── Curriculum helpers ─────────────────────────────────────────────────────────
const allUniversity = university.map(s => ({ id: s.id, name: s.name, emoji: s.emoji }));
const allSkills = skillCats.flatMap(cat => cat.subjects.map(s => ({ id: s.id, name: s.name, emoji: s.emoji })));
const LEVELS = [
  { value: "beginner",     label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced",     label: "متقدم" },
];
const TARGET_LABELS: Record<TargetType, string> = {
  all:       "كل المستخدمين",
  specialty: "تخصص محدد",
  level:     "مستوى محدد",
  unit:      "وحدة محددة",
  skill:     "مهارة محددة",
  users:     "مستخدمون بعينهم",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminNotifications() {
  const { toast } = useToast();

  // Form
  const [title,             setTitle]             = useState("");
  const [body,              setBody]              = useState("");
  const [url,               setUrl]               = useState("/");
  const [expiresAfterHours, setExpiresAfterHours] = useState<number | null>(null);
  const [targetType,        setTargetType]        = useState<TargetType>("all");
  const [specialtyId, setSpecialtyId] = useState("");
  const [level,       setLevel]       = useState("");
  const [unitCode,    setUnitCode]    = useState("");
  const [skillId,     setSkillId]     = useState("");

  // User-picker
  const [userSearch,    setUserSearch]    = useState("");
  const [subscribers,   setSubscribers]   = useState<Subscriber[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Subscriber[]>([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);

  // Audience count
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [vapidCount,    setVapidCount]    = useState<number | null>(null);
  const [expoCount,     setExpoCount]     = useState<number | null>(null);
  const [countLoading,  setCountLoading]  = useState(false);

  // Send
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState<{ sent: number; failed: number; vapidSent?: number; expoSent?: number } | null>(null);

  // History
  const [history,        setHistory]        = useState<NotifLog[]>([]);
  const [loadingHistory, setLoadingHistory]  = useState(false);
  const [showHistory,    setShowHistory]    = useState(false);
  const [cancellingId,   setCancellingId]   = useState<number | null>(null);

  // Expo stats
  const [expoStats, setExpoStats] = useState<{ student: number; admin: number } | null>(null);
  useEffect(() => {
    fetch("/api/admin/expo-notifications/stats", { credentials: "include" })
      .then(r => r.json())
      .then(d => setExpoStats(d?.stats ?? null))
      .catch(() => {});
  }, []);

  // ── Audience count ──────────────────────────────────────────────────────────
  const fetchAudienceCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const p = new URLSearchParams({ targetType });
      if (targetType === "specialty" && specialtyId) p.set("specialtyId", specialtyId);
      if (targetType === "level"     && level)       p.set("level", level);
      if (targetType === "unit"      && unitCode)    p.set("unitCode", unitCode);
      if (targetType === "skill"     && skillId)     p.set("skillId", skillId);
      if (targetType === "users")    p.set("userIds", selectedUsers.map(u => u.user_id).join(","));
      const r = await fetch(`/api/admin/notifications/audience-count?${p}`, { credentials: "include" });
      const d = await r.json();
      setAudienceCount(d.count ?? 0);
      setVapidCount(d.vapidCount ?? null);
      setExpoCount(d.expoCount ?? null);
    } catch { setAudienceCount(null); setVapidCount(null); setExpoCount(null); }
    finally   { setCountLoading(false); }
  }, [targetType, specialtyId, level, unitCode, skillId, selectedUsers]);

  useEffect(() => { fetchAudienceCount(); }, [fetchAudienceCount]);

  // ── User search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (targetType !== "users") return;
    const t = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const r = await fetch(`/api/admin/notifications/subscribers?q=${encodeURIComponent(userSearch)}`, { credentials: "include" });
        const d = await r.json();
        setSubscribers(d.subscribers ?? []);
      } catch { setSubscribers([]); }
      finally { setLoadingUsers(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [userSearch, targetType]);

  // ── History ─────────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch("/api/admin/notifications/history", { credentials: "include" });
      const d = await r.json();
      setHistory(d.history ?? []);
    } catch {}
    finally { setLoadingHistory(false); }
  };
  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "العنوان والنص مطلوبان", variant: "destructive" }); return;
    }
    setSending(true); setResult(null);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(), body: body.trim(), url: url.trim() || "/", targetType,
        ...(expiresAfterHours != null ? { expiresAfterHours } : {}),
      };
      if (targetType === "specialty") payload.specialtyId = specialtyId;
      if (targetType === "level")     payload.level       = level;
      if (targetType === "unit")      payload.unitCode    = unitCode;
      if (targetType === "skill")     payload.skillId     = skillId;
      if (targetType === "users")     payload.userIds     = selectedUsers.map(u => u.user_id);

      const r = await fetch("/api/admin/notifications/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "فشل الإرسال");
      setResult({ sent: d.sent, failed: d.failed });
      toast({ title: `✅ أُرسل إلى ${d.sent} جهاز${d.failed ? ` (${d.failed} فشل)` : ""}` });
      setTitle(""); setBody(""); setUrl("/");
      if (showHistory) fetchHistory();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">إرسال إشعار</h2>
            <p className="text-xs text-muted-foreground">يظهر على هواتف الطلاب فوراً حتى لو التطبيق مغلق</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-white/10 gap-2"
          onClick={() => setShowHistory(v => !v)}>
          <History className="w-4 h-4" />السجل
        </Button>
      </div>

      {/* Expo stats pill */}
      {expoStats !== null && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
          <span className="text-emerald-400">📱</span>
          <span className="text-emerald-300 font-semibold">{expoStats.student} جهاز طالب مثبّت التطبيق</span>
          {expoStats.admin > 0 && (
            <span className="text-emerald-300/60 text-xs">· {expoStats.admin} أدمن</span>
          )}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            آخر الإشعارات المُرسلة
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {loadingHistory ? (
              <div className="p-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />جاري التحميل…
              </div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">لا يوجد سجل بعد</div>
            ) : history.map(h => (
              <div key={h.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold">{h.title}</span>
                    <span className="text-muted-foreground mx-2">·</span>
                    <span className="text-muted-foreground text-xs">{h.body.slice(0, 55)}{h.body.length > 55 ? "…" : ""}</span>
                  </div>
                  <div className="flex gap-1 shrink-0 items-center">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">{h.sent_count} ✓</Badge>
                    {h.failed_count > 0 && <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]">{h.failed_count} ✗</Badge>}
                    <button
                      disabled={cancellingId === h.id}
                      onClick={async () => {
                        setCancellingId(h.id);
                        try {
                          await fetch(`/api/admin/notifications/${h.id}/cancel`, {
                            method: "POST", credentials: "include",
                            headers: { "X-Nukhba-Csrf": "1", "Content-Type": "application/json" },
                          });
                          toast({ title: "✅ تم إلغاء الإشعار من داخل المنصة" });
                        } catch { toast({ title: "فشل الإلغاء", variant: "destructive" }); }
                        finally { setCancellingId(null); }
                      }}
                      className="text-[10px] text-rose-400/70 hover:text-rose-400 border border-rose-400/20 rounded px-1.5 py-0.5 transition-colors disabled:opacity-40"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {new Date(h.created_at).toLocaleString("ar")} · {TARGET_LABELS[h.target_filter?.targetType] ?? h.target_filter?.targetType}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">عنوان الإشعار *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="مثال: محتوى جديد متاح الآن!" className="bg-white/5 border-white/10" maxLength={80} />
          <div className="text-[11px] text-muted-foreground text-left">{title.length}/80</div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">نص الإشعار *</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="النص الذي سيظهر للطالب على هاتفه…"
            className="bg-white/5 border-white/10 resize-none" rows={3} maxLength={200} />
          <div className="text-[11px] text-muted-foreground text-left">{body.length}/200</div>
        </div>

        {/* URL */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">رابط الوجهة عند النقر</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="/learn  أو  /v4-map  أو  /"
            className="bg-white/5 border-white/10 font-mono text-sm" dir="ltr" />
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">مدة ظهور الإشعار الداخلي</Label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "لا تنتهي", value: null },
              { label: "24 ساعة", value: 24 },
              { label: "48 ساعة", value: 48 },
              { label: "أسبوع",   value: 168 },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => setExpiresAfterHours(opt.value)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  expiresAfterHours === opt.value
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">بعد انتهاء المدة يختفي الإشعار تلقائياً من داخل المنصة</p>
        </div>

        {/* Target type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">الجمهور المستهدف</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TARGET_LABELS) as [TargetType, string][]).map(([v, lbl]) => (
              <button key={v} onClick={() => { setTargetType(v); setSelectedUsers([]); }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  targetType === v
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                }`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filter */}
        {targetType === "specialty" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">التخصص</Label>
            <select value={specialtyId} onChange={e => setSpecialtyId(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-sm">
              <option value="">-- اختر تخصصاً --</option>
              {allUniversity.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </div>
        )}
        {targetType === "skill" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">المهارة</Label>
            <select value={skillId} onChange={e => setSkillId(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-sm">
              <option value="">-- اختر مهارة --</option>
              {allSkills.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </div>
        )}
        {targetType === "level" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">المستوى</Label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l.value} onClick={() => setLevel(l.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    level === l.value ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {targetType === "unit" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">كود الوحدة</Label>
            <Input value={unitCode} onChange={e => setUnitCode(e.target.value)}
              placeholder="مثال: CS101-U3" className="bg-white/5 border-white/10 font-mono text-sm" dir="ltr" />
          </div>
        )}
        {targetType === "users" && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">بحث عن مستخدمين</Label>
            <div className="relative">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="اسم أو بريد إلكتروني…" className="bg-white/5 border-white/10 pr-9" />
            </div>
            {loadingUsers && <div className="text-xs text-muted-foreground">جاري البحث…</div>}
            {!loadingUsers && subscribers.length > 0 && (
              <div className="rounded-xl border border-white/10 divide-y divide-white/5 max-h-44 overflow-y-auto">
                {subscribers.map(s => {
                  const sel = selectedUsers.some(u => u.user_id === s.user_id);
                  return (
                    <button key={s.user_id} onClick={() =>
                      setSelectedUsers(p => sel ? p.filter(u => u.user_id !== s.user_id) : [...p, s])}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        sel ? "bg-blue-500/15 text-blue-300" : "hover:bg-white/5 text-foreground"
                      }`}>
                      <div className="text-right">
                        <div className="font-medium">{s.display_name ?? s.email}</div>
                        <div className="text-[11px] text-muted-foreground">{s.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[10px] bg-white/5 border-white/10">{s.device_count} جهاز</Badge>
                        {sel && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(u => (
                  <div key={u.user_id} className="flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 rounded-full px-3 py-1 text-xs text-blue-300">
                    {u.display_name ?? u.email}
                    <button onClick={() => setSelectedUsers(p => p.filter(x => x.user_id !== u.user_id))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audience preview */}
        <div className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />المستهدفون تقريباً
            </div>
            <div className="font-bold text-lg">
              {countLoading
                ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                : audienceCount !== null
                  ? <span className="text-blue-400">{audienceCount.toLocaleString("ar")} جهاز</span>
                  : "—"}
            </div>
          </div>
          {!countLoading && (vapidCount !== null || expoCount !== null) && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              {vapidCount !== null && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                  {vapidCount} متصفح
                </span>
              )}
              {expoCount !== null && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {expoCount} تطبيق
                </span>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              أُرسل الإشعار إلى <strong className="mx-1">{result.sent}</strong> جهاز
              {result.failed > 0 && <span className="text-rose-400 mr-1">({result.failed} فشل)</span>}
            </div>
            {(result.vapidSent !== undefined || result.expoSent !== undefined) && (
              <div className="flex gap-3 text-xs text-muted-foreground px-1">
                {result.vapidSent !== undefined && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                    {result.vapidSent} متصفح
                  </span>
                )}
                {result.expoSent !== undefined && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {result.expoSent} تطبيق
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Send button */}
        <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
          className="w-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 font-bold py-6 text-base gap-2">
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {sending ? "جاري الإرسال…" : "إرسال الإشعار"}
        </Button>
      </div>
    </div>
  );
}
