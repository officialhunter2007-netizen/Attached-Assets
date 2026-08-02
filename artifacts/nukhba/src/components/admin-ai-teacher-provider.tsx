import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Save, RefreshCw, CheckCircle2, XCircle, Plug,
  ChevronDown, ChevronUp, Zap, Brain, Bot,
} from "lucide-react";

type ProviderStatus = {
  orModelOverride: string;
  activeModelLabel: string;
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

type ModelOption = {
  slug: string;
  label: string;
  labelEn: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  cost: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  {
    slug: "",
    label: "Gemini 2.5 Flash Lite",
    labelEn: "google/gemini-2.5-flash-lite",
    description: "الافتراضي — الأسرع والأرخص. مناسب لأغلب الطلاب.",
    badge: "الافتراضي",
    badgeColor: "bg-white/10 text-white/60",
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    cost: "~1.5 جم / دور",
  },
  {
    slug: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    labelEn: "google/gemini-2.5-flash",
    description: "أقوى في العربية والتفكير المنطقي. موصى به للتخصصات المعقدة.",
    badge: "موصى به",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    icon: <Brain className="w-5 h-5 text-emerald-400" />,
    cost: "~4 جم / دور",
  },
  {
    slug: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    labelEn: "anthropic/claude-haiku-4.5",
    description: "نموذج Anthropic — أسلوب مختلف في الشرح، موثوق جداً في المهام المنظّمة.",
    badge: "Anthropic",
    badgeColor: "bg-purple-500/20 text-purple-300",
    icon: <Bot className="w-5 h-5 text-purple-400" />,
    cost: "~3 جم / دور",
  },
  {
    slug: "v0/v0-pro",
    label: "v0 Pro",
    labelEn: "v0/v0-pro",
    description: "نموذج v0 من Vercel — متخصص في توليد الأكواد البرمجية. يستخدم API خاص غير متوافق مع OpenRouter.",
    badge: "Vercel",
    badgeColor: "bg-sky-500/20 text-sky-300",
    icon: <Cpu className="w-5 h-5 text-sky-400" />,
    cost: "~2 جم / دور",
  },
];

export function AdminAiTeacherProvider() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Model picker draft state
  const [selectedSlug, setSelectedSlug] = useState("");

  // Custom provider draft state
  const [enabled, setEnabled]     = useState(false);
  const [baseUrl, setBaseUrl]     = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState("");
  const [custModel, setCustModel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ai-teacher-provider", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: ProviderStatus = await r.json();
      setStatus(data);
      setSelectedSlug(data.orModelOverride ?? "");
      setEnabled(!!data.enabled);
      setBaseUrl(data.baseUrl ?? "");
      setApiKeyEnv(data.apiKeyEnv ?? "");
      setCustModel(data.model ?? "");
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
        body: JSON.stringify({
          orModelOverride: selectedSlug,
          enabled,
          baseUrl: baseUrl.trim(),
          apiKeyEnv: apiKeyEnv.trim(),
          model: custModel.trim(),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: data.error || "فشل الحفظ", variant: "destructive" });
        return;
      }
      toast({ title: "تم الحفظ — التغيير فعّال فوراً", className: "bg-emerald-600 border-none text-white" });
      if (data.status) setStatus(data.status as ProviderStatus);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    // Test the currently-selected slug (OR override) or custom provider fields
    const testBody = selectedSlug
      ? { orModelOverride: selectedSlug }
      : { baseUrl: baseUrl.trim(), apiKeyEnv: apiKeyEnv.trim(), model: custModel.trim() };
    try {
      const r = await fetch("/api/admin/ai-teacher-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        credentials: "include",
        body: JSON.stringify(testBody),
      });
      const data: TestResult = await r.json().catch(() => ({ ok: false, error: "تعذّر قراءة الرد" }));
      setTestResult(data);
      if (data.ok) {
        toast({ title: "نجح الاتصال ✓", className: "bg-emerald-600 border-none text-white" });
      } else {
        toast({ title: data.error || "فشل الاتصال", variant: "destructive" });
      }
    } catch {
      setTestResult({ ok: false, error: "تعذّر تنفيذ الاختبار" });
    } finally {
      setTesting(false);
    }
  };

  const activeOption = MODEL_OPTIONS.find(m => m.slug === (status?.orModelOverride ?? "")) ?? MODEL_OPTIONS[0];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-gold" /> نموذج المعلم الذكي
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            اختر النموذج الذي يُدرّس الطلاب — جميعها عبر مفتاح OpenRouter نفسه. التغيير فعّال فوراً.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-white/10 shrink-0">
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* Active model status banner */}
      {status && (
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-3 flex items-center gap-3">
          <div className="shrink-0">{activeOption.icon}</div>
          <div className="text-sm">
            <span className="text-white/60 text-xs">النموذج النشط الآن:</span>
            <span className="font-bold text-gold mr-2">{activeOption.label}</span>
            <span className="text-white/40 text-xs font-mono">{activeOption.labelEn}</span>
          </div>
        </div>
      )}

      {/* ── Model Picker Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODEL_OPTIONS.map((opt) => {
          const isSelected = selectedSlug === opt.slug;
          return (
            <button
              key={opt.slug}
              onClick={() => setSelectedSlug(opt.slug)}
              className={`
                relative rounded-2xl border p-4 text-right transition-all duration-150
                flex flex-col gap-2 cursor-pointer
                ${isSelected
                  ? "border-gold/60 bg-gold/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"}
              `}
            >
              {/* Selection indicator */}
              <div className={`
                absolute top-3 left-3 w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${isSelected ? "border-gold bg-gold" : "border-white/20"}
              `}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Icon + Badge */}
              <div className="flex items-center justify-between">
                {opt.icon}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>

              {/* Name */}
              <div className="font-bold text-sm text-white">{opt.label}</div>

              {/* Description */}
              <div className="text-[11px] text-white/50 leading-relaxed">{opt.description}</div>

              {/* Cost estimate */}
              <div className="text-[10px] text-white/30 mt-auto pt-1 border-t border-white/5">
                تكلفة تقريبية: {opt.cost}
              </div>
            </button>
          );
        })}
      </div>

      {/* Save + Test actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={saving}
          className="gradient-gold text-primary-foreground font-bold"
          onClick={save}
        >
          <Save className="w-4 h-4 ml-1" />
          {saving ? "جارٍ الحفظ..." : "حفظ الاختيار"}
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
              <span>
                نجح الاتصال (HTTP {testResult.status}{testResult.parsed ? "، الرد صالح" : ""}).
                {testResult.model && <span className="opacity-60 font-mono text-xs mr-2">{testResult.model}</span>}
              </span>
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

      {/* ── Advanced: Custom Provider (collapsible) ──────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between p-4 text-sm text-white/50 hover:text-white/70 transition-colors"
        >
          <span className="font-semibold">إعدادات متقدمة — مزوّد مخصص</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/5">
            <p className="text-[11px] text-muted-foreground pt-3">
              اضبط مزوّداً متوافقاً مع OpenAI (مثل مزوّد خاص أو self-hosted). عند الإيقاف أو عدم الاكتمال،
              يُستخدم النموذج المختار أعلاه أو الوضع الافتراضي.
            </p>

            {/* Current custom provider status */}
            {status && (
              <div className={`rounded-xl border p-3 flex items-center gap-2 text-xs ${
                status.active && status.enabled
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}>
                {status.active && status.enabled
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                <span className={status.active && status.enabled ? "text-emerald-300" : "text-amber-200"}>
                  {status.active && status.enabled
                    ? "المزوّد المخصص مُفعَّل."
                    : status.enabled
                      ? "التفعيل مطلوب لكن الإعداد غير مكتمل أو المفتاح غير موجود."
                      : "المزوّد المخصص غير مفعّل."}
                </span>
              </div>
            )}

            {/* Enable switch */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-semibold">تفعيل المزوّد المخصص</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">له الأولوية على المزوّد المخصص فقط عند التفعيل.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Base URL */}
            <div>
              <Label className="text-xs">رابط المزوّد (Base URL)</Label>
              <Input
                dir="ltr"
                className="bg-black/40 mt-1 font-mono text-sm"
                placeholder="https://api.my-provider.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>

            {/* API key env var */}
            <div>
              <Label className="text-xs">اسم متغيّر المفتاح في .env</Label>
              <Input
                dir="ltr"
                className="bg-black/40 mt-1 font-mono text-sm"
                placeholder="MY_PROVIDER_API_KEY"
                value={apiKeyEnv}
                onChange={(e) => setApiKeyEnv(e.target.value)}
              />
              {status && apiKeyEnv === status.apiKeyEnv && (
                <p className="text-[10px] mt-1">
                  {status.keyPresent
                    ? <span className="text-emerald-400">المفتاح موجود (…{status.keyTail})</span>
                    : <span className="text-red-400">المتغيّر غير موجود في .env حالياً</span>}
                </p>
              )}
            </div>

            {/* Model */}
            <div>
              <Label className="text-xs">اسم النموذج (Model ID)</Label>
              <Input
                dir="ltr"
                className="bg-black/40 mt-1 font-mono text-sm"
                placeholder="gpt-4o-mini"
                value={custModel}
                onChange={(e) => setCustModel(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
