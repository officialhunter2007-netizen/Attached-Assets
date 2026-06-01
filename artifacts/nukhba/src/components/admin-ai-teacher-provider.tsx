import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Cpu, Save, RefreshCw, CheckCircle2, XCircle, Plug } from "lucide-react";

// Admin status shape from GET /api/admin/ai-teacher-provider (never the key).
type ProviderStatus = {
  enabled: boolean;
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  keyPresent: boolean;
  keyTail: string;
  active: boolean;
  updatedAt: string | null;
};

type TestResult = {
  ok: boolean;
  status?: number;
  parsed?: boolean;
  endpoint?: string;
  model?: string;
  error?: string;
  detail?: string;
};

export function AdminAiTeacherProvider() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Draft form state.
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState("");
  const [model, setModel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ai-teacher-provider", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: ProviderStatus = await r.json();
      setStatus(data);
      setEnabled(!!data.enabled);
      setBaseUrl(data.baseUrl ?? "");
      setApiKeyEnv(data.apiKeyEnv ?? "");
      setModel(data.model ?? "");
    } catch {
      toast({ title: "تعذّر تحميل إعدادات مزوّد المعلم", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/ai-teacher-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify({ enabled, baseUrl: baseUrl.trim(), apiKeyEnv: apiKeyEnv.trim(), model: model.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: data.error || "فشل الحفظ", variant: "destructive" });
        return;
      }
      toast({ title: "تم الحفظ", className: "bg-emerald-600 border-none text-white" });
      if (data.status) setStatus(data.status as ProviderStatus);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/ai-teacher-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKeyEnv: apiKeyEnv.trim(), model: model.trim() }),
      });
      const data: TestResult = await r.json().catch(() => ({ ok: false, error: "تعذّر قراءة الرد" }));
      setTestResult(data);
      if (data.ok) {
        toast({ title: "نجح الاتصال بالمزوّد", className: "bg-emerald-600 border-none text-white" });
      } else {
        toast({ title: data.error || "فشل الاتصال", variant: "destructive" });
      }
    } catch {
      setTestResult({ ok: false, error: "تعذّر تنفيذ الاختبار" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gold" /> مزوّد الذكاء للمعلم الذكي
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            اضبط مزوّداً متوافقاً مع OpenAI (مثل freemodel.dev) للمعلم الذكي فقط (محادثة التدريس + توليد محتوى الدروس).
            عند الإيقاف أو عدم الاكتمال، يرجع المعلم تلقائياً للوضع الافتراضي (OpenRouter + Gemini) دون أي خلل.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-white/10">
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* Live status banner */}
      {status && (
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          status.active
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        }`}>
          {status.active
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            : <XCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          <div className="text-sm">
            {status.active ? (
              <span className="text-emerald-300 font-semibold">المزوّد المخصص مُفعَّل ويُستخدم الآن للمعلم الذكي.</span>
            ) : (
              <span className="text-amber-200 font-semibold">
                المعلم يعمل حالياً على الوضع الافتراضي (OpenRouter + Gemini).
                {status.enabled && " — التفعيل مطلوب لكن الإعداد غير مكتمل أو المفتاح غير موجود في .env."}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4 space-y-4">
        {/* Enable switch */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div>
            <Label className="text-sm font-semibold">تفعيل المزوّد المخصص</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              عند الإيقاف يُستخدم الوضع الافتراضي دائماً.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* Base URL */}
        <div>
          <Label className="text-xs">رابط المزوّد (Base URL)</Label>
          <Input
            dir="ltr"
            className="bg-black/40 mt-1 font-mono text-sm"
            placeholder="https://api.freemodel.dev/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            رابط متوافق مع OpenAI. يُضاف <span className="font-mono">/chat/completions</span> تلقائياً.
          </p>
        </div>

        {/* API key env var name */}
        <div>
          <Label className="text-xs">اسم متغيّر المفتاح في .env</Label>
          <Input
            dir="ltr"
            className="bg-black/40 mt-1 font-mono text-sm"
            placeholder="FREEMODEL_API_KEY"
            value={apiKeyEnv}
            onChange={(e) => setApiKeyEnv(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            لا يُخزَّن المفتاح في قاعدة البيانات — فقط اسم المتغيّر. ضع القيمة في ملف .env على الخادم ثم أعد تشغيل الخدمة.
            {status && (
              status.keyPresent
                ? <span className="text-emerald-400"> — المفتاح موجود (…{status.keyTail}).</span>
                : status.apiKeyEnv
                  ? <span className="text-red-400"> — المتغيّر غير موجود في .env حالياً.</span>
                  : null
            )}
          </p>
        </div>

        {/* Model */}
        <div>
          <Label className="text-xs">اسم النموذج (Model)</Label>
          <Input
            dir="ltr"
            className="bg-black/40 mt-1 font-mono text-sm"
            placeholder="اتركه فارغاً الآن واملأه لاحقاً"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            معرّف النموذج كما يتوقعه المزوّد (مثل <span className="font-mono">gpt-4o-mini</span>). إن تُرك فارغاً يبقى الوضع الافتراضي فعّالاً.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            size="sm"
            disabled={saving}
            className="gradient-gold text-primary-foreground font-bold"
            onClick={save}
          >
            <Save className="w-4 h-4 ml-1" />
            {saving ? "..." : "حفظ"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={testing}
            className="border-white/10"
            onClick={runTest}
          >
            <Plug className={`w-4 h-4 ml-1 ${testing ? "animate-pulse" : ""}`} />
            {testing ? "جارٍ الاختبار..." : "اختبار الاتصال"}
          </Button>
          {status?.updatedAt && (
            <span className="text-[10px] text-muted-foreground">
              آخر تحديث: {new Date(status.updatedAt).toLocaleString("ar-EG")}
            </span>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`rounded-xl border p-3 text-sm ${
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}>
            {testResult.ok ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>نجح الاتصال (HTTP {testResult.status}{testResult.parsed ? "، الرد صالح" : ""}).</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div>{testResult.error || "فشل الاتصال"}</div>
                  {testResult.detail && (
                    <div className="text-[10px] opacity-70 mt-1 font-mono break-all" dir="ltr">{testResult.detail}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
