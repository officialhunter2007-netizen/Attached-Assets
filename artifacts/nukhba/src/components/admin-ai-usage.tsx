import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, DollarSign, Activity, Users as UsersIcon, Zap,
  TrendingUp, X,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────
type Window = { from: string; to: string };

type Summary = {
  window: Window;
  totals: {
    events: number; inputTokens: number; outputTokens: number;
    cachedInputTokens: number; totalTokens: number; costUsd: number;
    avgLatencyMs: number; errorCount: number; activeUsers: number;
  };
  byProvider: Array<{ provider: string; events: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  byModel: Array<{ model: string; provider: string; events: number; inputTokens: number; outputTokens: number; cachedInputTokens: number; costUsd: number }>;
  byRoute: Array<{ route: string; events: number; inputTokens: number; outputTokens: number; costUsd: number }>;
};

type Timeseries = {
  window: Window;
  granularity: "day" | "hour";
  points: Array<{ bucket: string; events: number; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number }>;
};

type UserRow = {
  userId: number | null;
  email: string | null;
  displayName: string | null;
  role: string | null;
  events: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  lastActive: string | null;
};

type DailyBudgetRow = {
  subscriptionId: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  plan: string | null;
  region: string | null;
  todaySpentUsd: number;
  dailyCapUsd: number;
  dailyRatio: number;
  totalSpentUsd: number;
  capUsd: number;
  totalRatio: number;
  daysRemaining: number;
  dailyMode: "ok" | "exhausted";
  forceCheapModel: boolean;
};

type DailyBudgetTop = {
  asOf: string;
  startOfTodayYemen: string;
  rows: DailyBudgetRow[];
};

type UserDetail = {
  window: Window;
  user: { id: number; email: string | null; displayName: string | null; role: string | null };
  totals: { events: number; inputTokens: number; outputTokens: number; cachedInputTokens: number; totalTokens: number; costUsd: number; errorCount: number };
  byModel: Array<{ model: string; provider: string; events: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  byRoute: Array<{ route: string; events: number; costUsd: number }>;
  timeline: Array<{ bucket: string; events: number; costUsd: number }>;
  recent: Array<{ id: number; createdAt: string; route: string; provider: string; model: string; inputTokens: number; outputTokens: number; costUsd: number; latencyMs: number | null; status: string; subjectId: string | null }>;
};


// ─── Helpers ────────────────────────────────────────────────────────────────
const PRESETS: Array<{ key: string; label: string; ms: number | null }> = [
  { key: "24h", label: "آخر ٢٤ ساعة", ms: 24 * 3600 * 1000 },
  { key: "7d", label: "آخر ٧ أيام", ms: 7 * 24 * 3600 * 1000 },
  { key: "30d", label: "آخر ٣٠ يوماً", ms: 30 * 24 * 3600 * 1000 },
  { key: "90d", label: "آخر ٩٠ يوماً", ms: 90 * 24 * 3600 * 1000 },
  { key: "all", label: "كل الفترة", ms: null },
];

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(6)}`;
  return "$0.00";
}

function fmtTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtArabicNumber(n: number): string {
  return new Intl.NumberFormat("ar-EG").format(n || 0);
}

function fmtDateLabel(iso: string, granularity: "day" | "hour"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  }
  return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "short" }).format(d);
}

function fmtFullDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function providerColor(provider: string): string {
  switch (provider) {
    case "anthropic": return "#d97757"; // anthropic-ish
    case "openai": return "#10a37f";    // openai-ish
    case "gemini": return "#4285f4";    // google-ish
    default: return "#9ca3af";
  }
}

const PIE_COLORS = ["#fbbf24", "#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#fb923c", "#22d3ee", "#fde047", "#c084fc", "#fca5a5"];

// ─── Component ──────────────────────────────────────────────────────────────
export function AdminAiUsage() {
  const { toast } = useToast();
  const [presetKey, setPresetKey] = useState<string>("30d");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeseries, setTimeseries] = useState<Timeseries | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dailyBudgetTop, setDailyBudgetTop] = useState<DailyBudgetTop | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drillUserId, setDrillUserId] = useState<number | null>(null);
  const [drillData, setDrillData] = useState<UserDetail | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const window = useMemo(() => {
    const preset = PRESETS.find((p) => p.key === presetKey);
    if (!preset || preset.ms === null) {
      return { from: new Date(2024, 0, 1).toISOString(), to: new Date().toISOString() };
    }
    return { from: new Date(Date.now() - preset.ms).toISOString(), to: new Date().toISOString() };
  }, [presetKey]);

  const granularity: "day" | "hour" = presetKey === "24h" ? "hour" : "day";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
      const [s, t, u, b] = await Promise.all([
        fetch(`/api/admin/ai-usage/summary?${qs}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/admin/ai-usage/timeseries?${qs}&granularity=${granularity}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/admin/ai-usage/users?${qs}&limit=25&sortBy=cost`, { credentials: "include" }).then((r) => r.json()),
        // Daily-budget-top is window-independent (always "today" in Yemen TZ).
        fetch(`/api/admin/ai-usage/daily-budget-top?limit=5`, { credentials: "include" }).then((r) => r.json()),
      ]);
      if (s?.error) throw new Error(s.error);
      setSummary(s);
      setTimeseries(t);
      setUsers(u?.users || []);
      setDailyBudgetTop(b?.error ? null : b);
    } catch (err: any) {
      toast({ title: "فشل تحميل البيانات", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [window.from, window.to, granularity, toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const openDrill = useCallback(async (uid: number) => {
    setDrillUserId(uid);
    setDrillData(null);
    setDrillLoading(true);
    try {
      const qs = `from=${encodeURIComponent(window.from)}&to=${encodeURIComponent(window.to)}`;
      const r = await fetch(`/api/admin/ai-usage/user/${uid}?${qs}`, { credentials: "include" });
      const data = await r.json();
      if (data?.error) throw new Error(data.error);
      setDrillData(data);
    } catch (e: any) {
      toast({ title: "فشل تحميل تفاصيل المستخدم", description: String(e?.message || e), variant: "destructive" });
      setDrillUserId(null);
    } finally {
      setDrillLoading(false);
    }
  }, [window.from, window.to, toast]);

  const totals = summary?.totals;
  const avgCostPerEvent = totals && totals.events > 0 ? totals.costUsd / totals.events : 0;

  // Build chart series. Recharts in RTL contexts works best when we leave the
  // axis layout alone and just rely on the surrounding `dir="rtl"` parent.
  const tsData = useMemo(() => {
    return (timeseries?.points || []).map((p) => ({
      label: fmtDateLabel(p.bucket, timeseries?.granularity || "day"),
      cost: Number(p.costUsd.toFixed(6)),
      tokens: p.totalTokens,
      events: p.events,
    }));
  }, [timeseries]);

  const modelPieData = useMemo(() => {
    return (summary?.byModel || []).slice(0, 8).map((m) => ({
      name: m.model,
      value: Number(m.costUsd.toFixed(6)),
    }));
  }, [summary]);

  const routeBarData = useMemo(() => {
    return (summary?.byRoute || []).slice(0, 12).map((r) => ({
      route: r.route,
      cost: Number(r.costUsd.toFixed(6)),
      events: r.events,
    }));
  }, [summary]);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header: presets + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPresetKey(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                presetKey === p.key
                  ? "bg-gold text-primary-foreground"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button onClick={refresh} disabled={refreshing} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          label="إجمالي التكلفة"
          value={fmtMoney(totals?.costUsd || 0)}
          sub={loading ? "جارٍ التحميل…" : `${fmtArabicNumber(totals?.events || 0)} طلب`}
          tone="emerald"
        />
        <KpiCard
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          label="إجمالي الرموز (Tokens)"
          value={fmtTokens(totals?.totalTokens || 0)}
          sub={`دخل ${fmtTokens(totals?.inputTokens || 0)} / خرج ${fmtTokens(totals?.outputTokens || 0)}`}
          tone="amber"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-purple-400" />}
          label="متوسّط تكلفة الطلب"
          value={fmtMoney(avgCostPerEvent)}
          sub={`زمن استجابة ${fmtArabicNumber(totals?.avgLatencyMs || 0)} ms`}
          tone="purple"
        />
        <KpiCard
          icon={<UsersIcon className="w-4 h-4 text-sky-400" />}
          label="المستخدمون النشطون"
          value={fmtArabicNumber(totals?.activeUsers || 0)}
          sub={totals && totals.errorCount > 0 ? `${fmtArabicNumber(totals.errorCount)} خطأ` : "بدون أخطاء"}
          tone="sky"
        />
      </div>

      {/* Daily-rolling budget — top spenders TODAY (Yemen TZ).
         Always shows "today" in Yemen TZ regardless of the selected window
         preset; the cap is daily-rolling so a 30d preset would dilute the
         per-day signal. */}
      <section className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            أعلى المشتركين بالتكلفة اليوم — حسب نسبة استهلاك الميزانية اليومية
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {dailyBudgetTop ? `حتى ${fmtFullDateTime(dailyBudgetTop.asOf)}` : "—"}
          </span>
        </div>
        <div className="overflow-x-auto">
          {!dailyBudgetTop || dailyBudgetTop.rows.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              لا يوجد مشتركون قاموا باستهلاك ميزانية اليوم بعد.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-black/30">
                <TableRow className="border-white/5">
                  <TableHead className="text-right">المشترك</TableHead>
                  <TableHead className="text-right">المادة</TableHead>
                  <TableHead className="text-right">الباقة</TableHead>
                  <TableHead className="text-right">صرف اليوم</TableHead>
                  <TableHead className="text-right">حد اليوم</TableHead>
                  <TableHead className="text-right">نسبة اليوم</TableHead>
                  <TableHead className="text-right">الإجمالي / السقف</TableHead>
                  <TableHead className="text-right">أيام متبقية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyBudgetTop.rows.map((r) => {
                  const pctDaily = Math.min(100, Math.round(r.dailyRatio * 100));
                  const pctTotal = Math.min(100, Math.round(r.totalRatio * 100));
                  const dailyTone = pctDaily >= 100
                    ? "text-rose-400"
                    : pctDaily >= 75
                      ? "text-amber-400"
                      : "text-emerald-400";
                  return (
                    <TableRow key={r.subscriptionId} className="border-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{r.userName || "—"}</span>
                          <span className="text-[10px] text-muted-foreground" dir="ltr">{r.userEmail || ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{r.subjectName || r.subjectId || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.plan || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{fmtMoney(r.todaySpentUsd)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fmtMoney(r.dailyCapUsd)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full ${pctDaily >= 100 ? "bg-rose-500" : pctDaily >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${pctDaily}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold ${dailyTone} tabular-nums`}>{pctDaily}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {fmtMoney(r.totalSpentUsd)} / {fmtMoney(r.capUsd)} ({pctTotal}%)
                      </TableCell>
                      <TableCell className="text-xs">{fmtArabicNumber(r.daysRemaining)}</TableCell>
                      <TableCell>
                        {r.dailyMode === "exhausted" ? (
                          <Badge className="bg-rose-500/15 border-rose-500/30 text-rose-300 text-[10px]" variant="outline">
                            انتقل للنموذج السريع
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-300 text-[10px]" variant="outline">
                            ضمن الميزانية
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* Time series area chart */}
      <section className="glass rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            تكلفة الذكاء الاصطناعي عبر الزمن
          </h3>
          <span className="text-xs text-muted-foreground">{granularity === "hour" ? "بالساعة" : "باليوم"}</span>
        </div>
        <div className="h-64 w-full" dir="ltr">
          {tsData.length === 0 ? (
            <EmptyChart label="لا توجد بيانات في هذه الفترة" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v: number) => `$${v.toFixed(v >= 1 ? 2 : 4)}`} />
                <Tooltip
                  contentStyle={{ background: "#0b0b14", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#fbbf24" }}
                  formatter={(v: any, name: any) => {
                    if (name === "cost") return [fmtMoney(Number(v)), "التكلفة"];
                    return [v, name];
                  }}
                />
                <Area type="monotone" dataKey="cost" stroke="#fbbf24" strokeWidth={2} fill="url(#costGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Two-column: model donut + route bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="glass rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold text-sm mb-3">التكلفة حسب النموذج</h3>
          <div className="h-64 w-full" dir="ltr">
            {modelPieData.length === 0 ? (
              <EmptyChart label="لا توجد بيانات" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {modelPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0b0b14", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => fmtMoney(Number(v))}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl border border-white/10 p-4">
          <h3 className="font-bold text-sm mb-3">التكلفة حسب المسار</h3>
          <div className="h-64 w-full" dir="ltr">
            {routeBarData.length === 0 ? (
              <EmptyChart label="لا توجد بيانات" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeBarData} layout="vertical" margin={{ top: 5, right: 10, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={10} tickFormatter={(v: number) => `$${v.toFixed(v >= 1 ? 2 : 4)}`} />
                  <YAxis type="category" dataKey="route" stroke="#9ca3af" fontSize={10} width={120} />
                  <Tooltip
                    contentStyle={{ background: "#0b0b14", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => fmtMoney(Number(v))}
                  />
                  <Bar dataKey="cost" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Per-model breakdown table */}
      <section className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-bold text-sm">تفاصيل النماذج</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/30">
              <TableRow className="border-white/5">
                <TableHead className="text-right">النموذج</TableHead>
                <TableHead className="text-right">المزوّد</TableHead>
                <TableHead className="text-right">الطلبات</TableHead>
                <TableHead className="text-right">رموز الدخل</TableHead>
                <TableHead className="text-right">رموز الخرج</TableHead>
                <TableHead className="text-right">رموز مخزّنة</TableHead>
                <TableHead className="text-right">التكلفة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary?.byModel || []).map((m, i) => (
                <TableRow key={`${m.model}-${i}`} className="border-white/5">
                  <TableCell className="font-mono text-xs" dir="ltr">{m.model}</TableCell>
                  <TableCell>
                    <Badge variant="outline" style={{ borderColor: providerColor(m.provider), color: providerColor(m.provider) }}>
                      {m.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>{fmtArabicNumber(m.events)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTokens(m.inputTokens)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTokens(m.outputTokens)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{fmtTokens(m.cachedInputTokens)}</TableCell>
                  <TableCell className="font-bold text-emerald-400">{fmtMoney(m.costUsd)}</TableCell>
                </TableRow>
              ))}
              {(!summary?.byModel || summary.byModel.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">لا توجد بيانات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Top users */}
      <section className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-sm">أكثر المستخدمين استهلاكاً</h3>
          <span className="text-xs text-muted-foreground">{users.length} نتيجة</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-black/30">
              <TableRow className="border-white/5">
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">البريد</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الطلبات</TableHead>
                <TableHead className="text-right">إجمالي الرموز</TableHead>
                <TableHead className="text-right">التكلفة</TableHead>
                <TableHead className="text-right">آخر نشاط</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={`u-${u.userId ?? "anon"}`} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium text-xs">{u.displayName || "—"}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{u.email || "—"}</TableCell>
                  <TableCell>
                    {u.role === "admin"
                      ? <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">مدير</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">طالب</Badge>}
                  </TableCell>
                  <TableCell>{fmtArabicNumber(u.events)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtTokens(u.totalTokens)}</TableCell>
                  <TableCell className="font-bold text-emerald-400">{fmtMoney(u.costUsd)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.lastActive ? fmtFullDateTime(u.lastActive) : "—"}</TableCell>
                  <TableCell>
                    {u.userId !== null && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => openDrill(u.userId!)}>
                        تفاصيل
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">{loading ? "جارٍ التحميل…" : "لا توجد بيانات"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Drill-down dialog */}
      <Dialog open={drillUserId !== null} onOpenChange={(o) => { if (!o) { setDrillUserId(null); setDrillData(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-black/95 border-white/10">
          <DialogTitle className="flex items-center justify-between">
            <span>
              تفاصيل المستخدم
              {drillData?.user && (
                <span className="text-sm font-normal text-muted-foreground mr-2">
                  · {drillData.user.displayName || drillData.user.email || `#${drillData.user.id}`}
                </span>
              )}
            </span>
            <button onClick={() => { setDrillUserId(null); setDrillData(null); }} className="text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </DialogTitle>
          {drillLoading && <p className="text-sm text-muted-foreground py-6 text-center">جارٍ التحميل…</p>}
          {drillData && (
            <div className="space-y-4">
              {/* Mini KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MiniStat label="التكلفة" value={fmtMoney(drillData.totals.costUsd)} tone="emerald" />
                <MiniStat label="الطلبات" value={fmtArabicNumber(drillData.totals.events)} tone="amber" />
                <MiniStat label="الرموز" value={fmtTokens(drillData.totals.totalTokens)} tone="purple" />
                <MiniStat label="الأخطاء" value={fmtArabicNumber(drillData.totals.errorCount)} tone={drillData.totals.errorCount > 0 ? "red" : "sky"} />
              </div>

              {/* Daily timeline */}
              <div className="glass rounded-xl border border-white/10 p-3">
                <h4 className="text-xs font-bold mb-2">التكلفة اليومية</h4>
                <div className="h-40 w-full" dir="ltr">
                  {drillData.timeline.length === 0 ? <EmptyChart label="لا توجد بيانات" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={drillData.timeline.map((p) => ({ label: fmtDateLabel(p.bucket, "day"), cost: Number(p.costUsd.toFixed(6)) }))}>
                        <defs>
                          <linearGradient id="drillGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                        <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v: number) => `$${v.toFixed(v >= 1 ? 2 : 4)}`} />
                        <Tooltip
                          contentStyle={{ background: "#0b0b14", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: any) => fmtMoney(Number(v))}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#a78bfa" strokeWidth={2} fill="url(#drillGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* By-model */}
              <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10"><h4 className="text-xs font-bold">حسب النموذج</h4></div>
                <Table>
                  <TableHeader className="bg-black/30">
                    <TableRow className="border-white/5">
                      <TableHead className="text-right text-xs">النموذج</TableHead>
                      <TableHead className="text-right text-xs">الطلبات</TableHead>
                      <TableHead className="text-right text-xs">الدخل</TableHead>
                      <TableHead className="text-right text-xs">الخرج</TableHead>
                      <TableHead className="text-right text-xs">التكلفة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillData.byModel.map((m, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="font-mono text-[11px]" dir="ltr">{m.model}</TableCell>
                        <TableCell className="text-xs">{fmtArabicNumber(m.events)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtTokens(m.inputTokens)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtTokens(m.outputTokens)}</TableCell>
                        <TableCell className="font-bold text-emerald-400 text-xs">{fmtMoney(m.costUsd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Recent events for user */}
              <div className="glass rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10"><h4 className="text-xs font-bold">أحدث الطلبات</h4></div>
                <Table>
                  <TableHeader className="bg-black/30">
                    <TableRow className="border-white/5">
                      <TableHead className="text-right text-xs">الوقت</TableHead>
                      <TableHead className="text-right text-xs">المسار</TableHead>
                      <TableHead className="text-right text-xs">النموذج</TableHead>
                      <TableHead className="text-right text-xs">رموز</TableHead>
                      <TableHead className="text-right text-xs">التكلفة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillData.recent.map((r) => (
                      <TableRow key={r.id} className="border-white/5">
                        <TableCell className="text-[11px] text-muted-foreground" dir="ltr">{fmtFullDateTime(r.createdAt)}</TableCell>
                        <TableCell className="font-mono text-[11px]">{r.route}</TableCell>
                        <TableCell className="font-mono text-[11px]" dir="ltr">{r.model}</TableCell>
                        <TableCell className="font-mono text-[11px]">{fmtTokens(r.inputTokens + r.outputTokens)}</TableCell>
                        <TableCell className="font-bold text-emerald-400 text-[11px]">{fmtMoney(r.costUsd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: "emerald" | "amber" | "purple" | "sky" | "red" }) {
  const ring = {
    emerald: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent",
    amber: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent",
    purple: "border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent",
    sky: "border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent",
    red: "border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent",
  }[tone];
  return (
    <div className={`rounded-2xl border ${ring} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "purple" | "sky" | "red" }) {
  const cls = {
    emerald: "text-emerald-400 border-emerald-500/20",
    amber: "text-amber-400 border-amber-500/20",
    purple: "text-purple-400 border-purple-500/20",
    sky: "text-sky-400 border-sky-500/20",
    red: "text-red-400 border-red-500/20",
  }[tone];
  return (
    <div className={`rounded-xl border ${cls} bg-black/30 p-3`}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${cls.split(" ")[0]}`}>{value}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">{label}</div>;
}
