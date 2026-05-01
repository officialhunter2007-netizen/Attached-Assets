import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Activity,
} from "lucide-react";

type AdminAlert = {
  id: number;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  occurrenceCount: number;
  lastOccurredAt: string;
  createdAt: string;
};

const SEVERITY_META: Record<
  string,
  { label: string; icon: any; color: string; ring: string; bg: string }
> = {
  critical: {
    label: "حرج",
    icon: AlertOctagon,
    color: "text-red-300",
    ring: "border-red-500/40",
    bg: "bg-red-500/10",
  },
  error: {
    label: "خطأ",
    icon: AlertCircle,
    color: "text-orange-300",
    ring: "border-orange-500/40",
    bg: "bg-orange-500/10",
  },
  warning: {
    label: "تحذير",
    icon: AlertTriangle,
    color: "text-amber-300",
    ring: "border-amber-500/40",
    bg: "bg-amber-500/10",
  },
  info: {
    label: "معلومة",
    icon: Info,
    color: "text-sky-300",
    ring: "border-sky-500/40",
    bg: "bg-sky-500/10",
  },
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type OpenRouterHealth = {
  keyDiagnosis: {
    format: "missing" | "valid" | "invalid_openai" | "invalid_anthropic" | "unknown";
    length: number;
    tail: string;
    reason: string;
  };
  ping: {
    status:
      | "ok"
      | "unauthorized"
      | "forbidden"
      | "rate_limited"
      | "server_error"
      | "network_error"
      | "missing";
    httpStatus: number | null;
    message: string;
    bodyExcerpt?: string;
    credits?: {
      label?: string;
      usageUsd?: number;
      limitUsd?: number | null;
      isFreeTier?: boolean;
    };
  };
  healthy: boolean;
};

export function AdminAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [health, setHealth] = useState<OpenRouterHealth | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/admin/alerts?resolved=${includeResolved}&limit=200`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch (err: any) {
      toast({
        title: "تعذّر تحميل التنبيهات",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [includeResolved, toast]);

  useEffect(() => {
    void load();
    // Auto-refresh every 30 seconds so admins see new outages quickly.
    const id = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const runHealthCheck = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const r = await fetch(`/api/admin/openrouter-health`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: OpenRouterHealth = await r.json();
      setHealth(data);
      toast({
        title: data.healthy ? "OpenRouter جاهز" : "OpenRouter غير جاهز",
        description: data.ping.message,
        variant: data.healthy ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({
        title: "تعذّر إجراء اختبار OpenRouter",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    } finally {
      setCheckingHealth(false);
    }
  }, [toast]);

  const handleResolve = async (alertId: number) => {
    setResolvingId(alertId);
    try {
      const r = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: "تم حلّ التنبيه" });
      await load();
    } catch (err: any) {
      toast({
        title: "تعذّر حلّ التنبيه",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            تنبيهات النظام
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            إخطارات تلقائية عند نفاد رصيد OpenRouter أو فشل خدمات الذكاء الاصطناعي.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={checkingHealth}
            className="gap-1.5"
          >
            <Activity className={`w-3.5 h-3.5 ${checkingHealth ? "animate-pulse" : ""}`} />
            {checkingHealth ? "جاري الاختبار..." : "اختبار OpenRouter"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeResolved((v) => !v)}
          >
            {includeResolved ? "إخفاء المحلولة" : "عرض المحلولة"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {health && (
        <div
          className={`border rounded-xl p-4 ${
            health.healthy
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <div className="flex items-start gap-3">
            {health.healthy ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold ${health.healthy ? "text-emerald-300" : "text-red-300"}`}>
                {health.healthy
                  ? "OpenRouter جاهز ويستقبل الطلبات"
                  : "OpenRouter غير جاهز — يحتاج تدخّلك"}
              </h4>
              <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">
                {health.ping.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {health.keyDiagnosis.reason}
              </p>
              <div className="text-[11px] text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  تنسيق المفتاح: <code className="text-amber-300">{health.keyDiagnosis.format}</code>
                </span>
                {health.keyDiagnosis.length > 0 && (
                  <span>الطول: {health.keyDiagnosis.length}</span>
                )}
                {health.keyDiagnosis.tail && (
                  <span>
                    آخر 4 خانات: <code dir="ltr">…{health.keyDiagnosis.tail}</code>
                  </span>
                )}
                {health.ping.httpStatus !== null && (
                  <span>HTTP: {health.ping.httpStatus}</span>
                )}
              </div>
              {health.ping.credits && (
                <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {health.ping.credits.label && (
                    <span>اسم المفتاح: {health.ping.credits.label}</span>
                  )}
                  {typeof health.ping.credits.usageUsd === "number" && (
                    <span>المستهلك: ${health.ping.credits.usageUsd.toFixed(4)}</span>
                  )}
                  {typeof health.ping.credits.limitUsd === "number" && (
                    <span>الحد الأقصى: ${health.ping.credits.limitUsd}</span>
                  )}
                  {health.ping.credits.limitUsd === null && (
                    <span>الحد الأقصى: غير محدود</span>
                  )}
                  {typeof health.ping.credits.isFreeTier === "boolean" && (
                    <span>مجاني: {health.ping.credits.isFreeTier ? "نعم" : "لا"}</span>
                  )}
                </div>
              )}
              {health.ping.bodyExcerpt && (
                <details className="mt-2">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                    استجابة OpenRouter الخام
                  </summary>
                  <pre className="text-[10px] bg-black/30 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
                    {health.ping.bodyExcerpt}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && alerts.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          جاري التحميل...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="font-bold text-emerald-300">لا توجد تنبيهات</p>
          <p className="text-xs text-muted-foreground mt-1">
            كل خدمات الذكاء الاصطناعي تعمل بشكل طبيعي.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const meta = SEVERITY_META[a.severity] ?? SEVERITY_META.warning;
            const Icon = meta.icon;
            return (
              <div
                key={a.id}
                className={`border ${meta.ring} ${meta.bg} rounded-xl p-4 ${a.resolved ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold">{a.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.ring}`}>
                          {meta.label}
                        </span>
                        {a.occurrenceCount > 1 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                            تكرّر {a.occurrenceCount}×
                          </span>
                        )}
                        {a.resolved && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            محلول
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">
                        {a.message}
                      </p>
                      <div className="text-[11px] text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        <span>النوع: <code className="text-amber-300">{a.type}</code></span>
                        <span>أول حدوث: {fmtTime(a.createdAt)}</span>
                        <span>آخر حدوث: {fmtTime(a.lastOccurredAt)}</span>
                      </div>
                      {a.metadata && Object.keys(a.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
                            تفاصيل تقنية
                          </summary>
                          <pre className="text-[10px] bg-black/30 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
                            {JSON.stringify(a.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  {!a.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolvingId === a.id}
                      onClick={() => handleResolve(a.id)}
                      className="shrink-0"
                    >
                      {resolvingId === a.id ? "..." : "حلّ"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
