/**
 * AdminVisualExplain — لوحة إدارة التوضيح البصري
 * - زر الجهوزية (أنا جاهز / لست جاهزاً)
 * - قائمة الطلبات بـ polling كل 10 ثوانٍ
 * - زر "أنا لها" ذري (409 إذا سبقه مشرف)
 * - textarea لصق HTML + معاينة + نشر للطالب
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye, Copy, CheckCircle2, Loader2, RefreshCw,
  Clock, User, BookOpen, AlertTriangle, Trash2,
  Power, PowerOff, ChevronDown, ChevronUp, MessageSquare,
} from "lucide-react";

type ContextMsg = { role: "user" | "assistant"; content: string; isTarget?: boolean };

type VERequest = {
  id: number;
  student_name: string;
  message_text: string;
  subject_name: string;
  context: ContextMsg[] | null;
  status: "pending" | "claimed" | "completed";
  claimed_by: number | null;
  claimer_name: string | null;
  claimer_email: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1)    return "الآن";
  if (diff < 60)   return `${Math.floor(diff)} دقيقة`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ساعة`;
  return `${Math.floor(diff / 1440)} يوم`;
}

export function AdminVisualExplain({
  onPendingCount,
}: {
  onPendingCount?: (n: number) => void;
}) {
  // ── جهوزية المشرف ──────────────────────────────────────────────────────────
  const [isReady,        setIsReady]        = useState(false);
  const [readyLoading,   setReadyLoading]   = useState(true);
  const [readyUpdating,  setReadyUpdating]  = useState(false);

  const fetchReadiness = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/visual-explain/readiness", { credentials: "include" });
      const d = await r.json();
      setIsReady(d.isReady ?? false);
    } catch {}
    finally { setReadyLoading(false); }
  }, []);

  const toggleReadiness = async () => {
    setReadyUpdating(true);
    try {
      const r = await fetch("/api/admin/visual-explain/readiness", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReady: !isReady }),
      });
      if (r.ok) setIsReady(v => !v);
    } catch {}
    finally { setReadyUpdating(false); }
  };

  // ── قائمة الطلبات ──────────────────────────────────────────────────────────
  const [requests,    setRequests]    = useState<VERequest[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    try {
      const r = await fetch("/api/admin/visual-explain/requests", { credentials: "include" });
      const d = await r.json();
      const reqs: VERequest[] = d.requests ?? [];
      setRequests(reqs);
      onPendingCount?.(reqs.filter(x => x.status === "pending").length);
    } catch {}
    finally { if (!silent) setListLoading(false); }
  }, [onPendingCount]);

  useEffect(() => {
    fetchReadiness();
    fetchRequests();
    timerRef.current = setInterval(() => fetchRequests(true), 10_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchReadiness, fetchRequests]);

  // ── حالة بطاقات الطلبات ────────────────────────────────────────────────────
  const [claiming,    setClaiming]   = useState<Record<number, boolean>>({});
  const [claimErr,    setClaimErr]   = useState<Record<number, string>>({});
  const [htmlInputs,  setHtmlInputs] = useState<Record<number, string>>({});
  const [saving,      setSaving]     = useState<Record<number, boolean>>({});
  const [saved,       setSaved]      = useState<Record<number, boolean>>({});
  const [copied,      setCopied]     = useState<Record<number, boolean>>({});
  const [deleting,    setDeleting]   = useState<Record<number, boolean>>({});
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [expandedCtx, setExpandedCtx] = useState<Record<number, boolean>>({});

  const handleClaim = async (id: number) => {
    setClaiming(p => ({ ...p, [id]: true }));
    setClaimErr(p => ({ ...p, [id]: "" }));
    try {
      const r = await fetch(`/api/admin/visual-explain/claim/${id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const d = await r.json();
      if (!r.ok) setClaimErr(p => ({ ...p, [id]: d.error ?? "فشل الاستلام" }));
      else await fetchRequests();
    } catch { setClaimErr(p => ({ ...p, [id]: "خطأ في الشبكة" })); }
    finally { setClaiming(p => ({ ...p, [id]: false })); }
  };

  const handleSave = async (id: number) => {
    const html = htmlInputs[id]?.trim();
    if (!html) return;
    setSaving(p => ({ ...p, [id]: true }));
    try {
      const r = await fetch(`/api/admin/visual-explain/complete/${id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (r.ok) {
        setSaved(p => ({ ...p, [id]: true }));
        await fetchRequests();
        setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 3000);
      }
    } catch {}
    finally { setSaving(p => ({ ...p, [id]: false })); }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [id]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 1800);
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    setDeleting(p => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/admin/visual-explain/requests/${id}`, {
        method: "DELETE", credentials: "include",
      });
      setRequests(prev => prev.filter(x => x.id !== id));
    } catch {}
    finally { setDeleting(p => ({ ...p, [id]: false })); }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── رأس + زر الجهوزية ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border"
           style={{ background: "rgba(8,12,22,0.6)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-base">التوضيح البصري</h2>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} طلب ينتظر المعالجة` : "لا طلبات معلقة الآن"}
            </p>
          </div>
        </div>

        {/* زر الجهوزية الرئيسي */}
        <button
          onClick={toggleReadiness}
          disabled={readyLoading || readyUpdating}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50"
          style={isReady ? {
            background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))",
            border: "1px solid rgba(34,197,94,0.4)",
            color: "#4ade80",
            boxShadow: "0 0 20px rgba(34,197,94,0.15)",
          } : {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {readyUpdating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isReady ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
          {isReady ? "أنا جاهز ✓" : "لست جاهزاً"}
        </button>
      </div>

      {/* ── تحذير عند عدم الجهوزية ─────────────────────────────────────────── */}
      {!isReady && !readyLoading && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
             style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-300/80 text-xs leading-relaxed">
            زر التوضيح البصري سيظهر <strong>خافتاً وغير قابل للنقر</strong> لجميع الطلاب
            حتى يضغط أحد المشرفين على "أنا جاهز".
          </p>
        </div>
      )}

      {/* ── شريط قائمة الطلبات ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">الطلبات الواردة</h3>
        <button
          onClick={() => fetchRequests()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {requests.length === 0 && !listLoading && (
        <div className="text-center py-16 text-muted-foreground/40">
          <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد طلبات حالياً</p>
          <p className="text-xs mt-1 opacity-60">تُحدَّث القائمة كل 10 ثوانٍ تلقائياً</p>
        </div>
      )}

      {/* ── بطاقات الطلبات ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {requests.map((req) => {
          const isClaimed   = req.status === "claimed";
          const isCompleted = req.status === "completed";

          return (
            <div key={req.id}
                 className="rounded-2xl p-5 space-y-4 border transition-all"
                 style={{
                   background: isCompleted ? "rgba(34,197,94,0.05)"
                     : isClaimed ? "rgba(245,158,11,0.06)"
                     : "rgba(8,12,22,0.7)",
                   borderColor: isCompleted ? "rgba(34,197,94,0.2)"
                     : isClaimed ? "rgba(245,158,11,0.25)"
                     : "rgba(255,255,255,0.07)",
                 }}>

              {/* رأس البطاقة */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                       style={{ background: "rgba(245,158,11,0.15)" }}>
                    <User className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{req.student_name}</span>
                      {req.subject_name && (
                        <Badge variant="outline" className="text-[10px] border-white/10 gap-1">
                          <BookOpen className="w-2.5 h-2.5" />{req.subject_name}
                        </Badge>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={isCompleted
                          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                          : isClaimed
                            ? { background: "rgba(245,158,11,0.15)", color: "#fbbf24" }
                            : { background: "rgba(96,165,250,0.15)", color: "#93c5fd" }}>
                        {isCompleted ? "✓ مكتمل"
                          : isClaimed ? `⚡ ${req.claimer_name ?? req.claimer_email ?? "مشرف"}`
                          : "⏳ معلق"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />{timeAgo(req.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={deleting[req.id]}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  {deleting[req.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* نص الرسالة + زر نسخ */}
              <div className="relative rounded-xl p-3 text-sm leading-relaxed text-white/80"
                   style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="line-clamp-5 pl-8 whitespace-pre-wrap">{req.message_text}</p>
                <button
                  onClick={() => handleCopy(req.id, req.message_text)}
                  className="absolute top-2 left-2 p-1.5 rounded-lg transition-all text-white/30 hover:text-amber-400 hover:bg-amber-500/10"
                  title="نسخ نص الرسالة"
                >
                  {copied[req.id]
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* سياق المحادثة (قابل للطي) */}
              {req.context && req.context.length > 0 && (
                <div className="rounded-xl overflow-hidden"
                     style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => setExpandedCtx(p => ({ ...p, [req.id]: !p[req.id] }))}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-white/50 hover:text-white/75 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      سياق المحادثة ({req.context.length} رسائل)
                    </span>
                    {expandedCtx[req.id]
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedCtx[req.id] && (
                    <div className="px-3 pb-3 pt-1 space-y-2"
                         style={{ background: "rgba(0,0,0,0.25)" }}>
                      {req.context.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[85%] rounded-lg px-3 py-1.5 text-xs leading-relaxed whitespace-pre-wrap"
                            style={msg.isTarget ? {
                              background: "rgba(245,158,11,0.14)",
                              border: "2px solid rgba(245,158,11,0.7)",
                              color: "rgba(255,255,255,0.9)",
                              boxShadow: "0 0 12px rgba(245,158,11,0.2)",
                            } : msg.role === "user" ? {
                              background: "rgba(245,158,11,0.12)",
                              border: "1px solid rgba(245,158,11,0.2)",
                              color: "rgba(255,255,255,0.8)",
                            } : {
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.65)",
                            }}
                          >
                            <span className="block text-[10px] mb-1 font-semibold"
                                  style={{ opacity: msg.isTarget ? 1 : 0.5, color: msg.isTarget ? "#fbbf24" : undefined }}>
                              {msg.isTarget ? "★ الرسالة المستهدفة" : msg.role === "user" ? "الطالب" : "المعلم"}
                            </span>
                            {msg.content.length > 400
                              ? msg.content.slice(0, 400) + "…"
                              : msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* أزرار العمل */}
              {!isCompleted && (
                <div className="space-y-3">

                  {/* زر "أنا لها" للطلبات المعلقة */}
                  {req.status === "pending" && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleClaim(req.id)}
                        disabled={claiming[req.id]}
                        className="w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                        style={{
                          background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.15))",
                          border: "1px solid rgba(245,158,11,0.4)",
                          color: "#fbbf24",
                        }}
                      >
                        {claiming[req.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "⚡ أنا لها"}
                      </button>
                      {claimErr[req.id] && (
                        <p className="text-xs text-rose-400 text-center bg-rose-500/10 rounded-lg py-1.5 px-3 border border-rose-500/20">
                          {claimErr[req.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* منطقة لصق HTML — للمشرف المُدّعي */}
                  {isClaimed && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        الصق صفحة HTML هنا ثم انشرها للطالب:
                      </p>
                      <Textarea
                        dir="ltr"
                        placeholder={"<!DOCTYPE html>\n<html lang=\"ar\" dir=\"rtl\">\n...\n</html>"}
                        value={htmlInputs[req.id] ?? ""}
                        onChange={e => setHtmlInputs(p => ({ ...p, [req.id]: e.target.value }))}
                        className="min-h-[130px] font-mono text-xs bg-black/40 border-white/10 resize-y"
                      />
                      <div className="flex gap-2">
                        {htmlInputs[req.id]?.trim() && (
                          <button
                            onClick={() => setPreviewHtml(htmlInputs[req.id])}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />معاينة
                          </button>
                        )}
                        <button
                          onClick={() => handleSave(req.id)}
                          disabled={saving[req.id] || !htmlInputs[req.id]?.trim()}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                          style={{
                            background: saved[req.id] ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)",
                            border: saved[req.id] ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(245,158,11,0.4)",
                            color: saved[req.id] ? "#4ade80" : "#fbbf24",
                          }}
                        >
                          {saving[req.id]
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : saved[req.id]
                              ? <><CheckCircle2 className="w-4 h-4" />تم النشر!</>
                              : "🚀 نشر للطالب"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCompleted && (
                <p className="text-xs text-emerald-400/70 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />تم الإرسال للطالب بنجاح
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── نافذة معاينة HTML ──────────────────────────────────────────────── */}
      {previewHtml && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="w-full max-w-3xl h-[82vh] rounded-2xl overflow-hidden border flex flex-col"
            style={{ borderColor: "rgba(245,158,11,0.3)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
                 style={{ background: "rgba(8,12,22,0.98)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Eye className="w-4 h-4" />معاينة الصفحة
              </span>
              <button onClick={() => setPreviewHtml(null)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 bg-white"
              sandbox="allow-scripts"
              title="visual-explain-preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
