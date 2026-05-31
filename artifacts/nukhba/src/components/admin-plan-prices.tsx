import { useEffect, useState, useCallback, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Save, Tag, Crown, Star, Zap, Gem,
  ShieldAlert, AlertTriangle,
} from "lucide-react";

type Region = "north" | "south";
type PlanType = "bronze" | "silver" | "gold";

// ── Pricing formula (mirrors pricing-formula.ts on the server) ─────────────
// SUB_DURATION_DAYS is constant; the YER→USD rates come from the live admin
// settings (`/api/admin/exchange-rates`) so the preview reflects whatever the
// admin has configured rather than a stale hardcoded constant.
const SUB_DURATION_DAYS = 14;
const FALLBACK_YER_PER_USD: Record<Region, number> = { north: 600, south: 2800 };

type PricingPreview = {
  gemsGranted: number;
  dailyGemLimit: number;
  aiCostCapUsd: number;
  priceUsd: number;
};

function computePreview(
  priceYer: number,
  region: Region,
  yerPerUsd: Record<Region, number>,
): PricingPreview {
  const divisor = yerPerUsd[region] || FALLBACK_YER_PER_USD[region];
  const rate = 1 / divisor;
  const priceUsd = priceYer * rate;
  const studentShareUsd = priceUsd / 2;
  const platformShareUsd = priceUsd / 2;
  const gemsGranted = Math.floor(studentShareUsd * 100 * 10);
  const dailyGemLimit = Math.floor(gemsGranted / SUB_DURATION_DAYS);
  return { gemsGranted, dailyGemLimit, aiCostCapUsd: platformShareUsd, priceUsd };
}

function fmtGems(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toFixed(3)}`;
}

type PriceRow = {
  region: Region;
  planType: PlanType;
  priceYer: number;
  updatedAt: string | null;
  updatedByUserId: number | null;
  seeded: boolean;
};

type PriceResponse = {
  prices: PriceRow[];
  defaults: Record<Region, Record<PlanType, number>>;
};

const REGIONS: Array<{ key: Region; label: string; sub: string; chipClass: string }> = [
  {
    key: "north",
    label: "الشمال",
    sub: "صنعاء وما حولها — الريال القديم",
    chipClass: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300",
  },
  {
    key: "south",
    label: "الجنوب",
    sub: "عدن وما حولها — الريال الجديد",
    chipClass: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-300",
  },
];

const PLANS: Array<{ key: PlanType; label: string; icon: ReactElement; tone: string }> = [
  { key: "bronze", label: "البرونزية", icon: <Zap className="w-4 h-4" />, tone: "text-orange-400" },
  { key: "silver", label: "الفضية", icon: <Star className="w-4 h-4" />, tone: "text-slate-300" },
  { key: "gold", label: "الذهبية", icon: <Gem className="w-4 h-4" />, tone: "text-gold" },
];

function fmtYer(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("ar-EG")} ريال`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "لم تُعدَّل بعد";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function toEnglishDigits(s: string): string {
  // Convert Arabic-Indic digits → ASCII so the user can paste either form.
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

type ExchangeRateRow = {
  region: Region;
  yerPerUsd: number;
};

export function AdminPlanPrices() {
  const { toast } = useToast();
  const [data, setData] = useState<PriceResponse | null>(null);
  const [rates, setRates] = useState<Record<Region, number>>(FALLBACK_YER_PER_USD);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const cellKey = (r: Region, p: PlanType) => `${r}:${p}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pricesRes, ratesRes] = await Promise.all([
        fetch("/api/admin/plan-prices", { credentials: "include" }),
        fetch("/api/admin/exchange-rates", { credentials: "include" }),
      ]);
      if (!pricesRes.ok) throw new Error(`HTTP ${pricesRes.status}`);
      const j = (await pricesRes.json()) as PriceResponse;
      setData(j);
      // Exchange rates are best-effort: if they fail to load, keep the
      // fallback divisors so the preview still renders.
      if (ratesRes.ok) {
        const rj = (await ratesRes.json()) as { rates: ExchangeRateRow[] };
        const next: Record<Region, number> = { ...FALLBACK_YER_PER_USD };
        for (const row of rj.rates ?? []) {
          if (Number.isFinite(row.yerPerUsd) && row.yerPerUsd > 0) {
            next[row.region] = row.yerPerUsd;
          }
        }
        setRates(next);
      }
      // Reset drafts so any unsaved local edits do not block a fresh refresh.
      const d: Record<string, string> = {};
      for (const row of j.prices) {
        d[cellKey(row.region, row.planType)] = String(row.priceYer);
      }
      setDrafts(d);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "تعذّر تحميل الأسعار",
        description: err?.message ?? "حاول مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function getRow(r: Region, p: PlanType): PriceRow | null {
    if (!data) return null;
    return data.prices.find((x) => x.region === r && x.planType === p) ?? null;
  }

  function isDirty(r: Region, p: PlanType): boolean {
    const row = getRow(r, p);
    if (!row) return false;
    const draft = drafts[cellKey(r, p)] ?? "";
    const parsed = Number(toEnglishDigits(draft));
    return Number.isFinite(parsed) && parsed !== row.priceYer;
  }

  function validate(value: string): { ok: true; n: number } | { ok: false; msg: string } {
    const trimmed = toEnglishDigits(value).trim();
    if (!trimmed) return { ok: false, msg: "أدخل قيمة." };
    if (!/^\d+$/.test(trimmed)) return { ok: false, msg: "أرقام صحيحة فقط." };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { ok: false, msg: "قيمة غير صالحة." };
    if (!Number.isInteger(n)) return { ok: false, msg: "السعر يجب أن يكون عدداً صحيحاً." };
    if (n < 1) return { ok: false, msg: "السعر يجب أن يكون أكبر من صفر." };
    if (n > 1_000_000) return { ok: false, msg: "أقصى سعر مسموح: 1,000,000 ريال." };
    return { ok: true, n };
  }

  function requestSave(r: Region, p: PlanType): void {
    const draft = drafts[cellKey(r, p)] ?? "";
    const v = validate(draft);
    if (!v.ok) {
      toast({ variant: "destructive", title: "قيمة غير صالحة", description: v.msg });
      return;
    }
    setConfirmKey(cellKey(r, p));
  }

  async function performSave(): Promise<void> {
    if (!confirmKey) return;
    const [region, planType] = confirmKey.split(":") as [Region, PlanType];
    const draft = drafts[confirmKey] ?? "";
    const v = validate(draft);
    if (!v.ok) {
      toast({ variant: "destructive", title: "قيمة غير صالحة", description: v.msg });
      setConfirmKey(null);
      return;
    }
    setSavingKey(confirmKey);
    try {
      const r = await fetch("/api/admin/plan-prices", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, planType, priceYer: v.n }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(j?.error ?? `HTTP ${r.status}`);
      }
      toast({
        title: "تم حفظ السعر",
        description: `${REGIONS.find((x) => x.key === region)?.label} • ${PLANS.find((x) => x.key === planType)?.label}: ${fmtYer(v.n)}`,
      });
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "فشل حفظ السعر",
        description: err?.message ?? "حاول مرة أخرى.",
      });
    } finally {
      setSavingKey(null);
      setConfirmKey(null);
    }
  }

  function discard(r: Region, p: PlanType): void {
    const row = getRow(r, p);
    if (!row) return;
    setDrafts((prev) => ({ ...prev, [cellKey(r, p)]: String(row.priceYer) }));
  }

  const confirmRow = confirmKey ? (() => {
    const [region, planType] = confirmKey.split(":") as [Region, PlanType];
    const row = getRow(region, planType);
    const oldPrice = row?.priceYer ?? null;
    const draft = drafts[confirmKey] ?? "";
    const v = validate(draft);
    const newPrice = v.ok ? v.n : null;
    return {
      region,
      planType,
      regionLabel: REGIONS.find((x) => x.key === region)?.label ?? region,
      planLabel: PLANS.find((x) => x.key === planType)?.label ?? planType,
      oldPrice,
      newPrice,
    };
  })() : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-gold" />
            أسعار الباقات
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            هذه الأسعار تُستخدم في صفحة الاشتراك وفي حساب الخصومات وفي سقف تكلفة الذكاء الاصطناعي. أي تعديل يسري فوراً على الاشتراكات الجديدة، ولا يؤثر على المشتركين الحاليين.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2 text-xs text-amber-200">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          المشتركون الحاليون لا يتأثرون — سعرهم محفوظ وقت التفعيل. التعديل ينطبق فقط على طلبات الاشتراك الجديدة وعلى بطاقات التفعيل القديمة التي لم يكن سعرها مسجّلاً.
        </div>
      </div>

      {!data && loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-60" />
          جاري التحميل...
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          تعذّر تحميل الأسعار.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {REGIONS.map((reg) => (
            <div
              key={reg.key}
              className={`rounded-2xl border bg-gradient-to-br ${reg.chipClass} p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base">منطقة {reg.label}</h3>
                  <p className="text-[11px] opacity-80">{reg.sub}</p>
                </div>
                <Crown className="w-5 h-5 opacity-50" />
              </div>

              <div className="space-y-2">
                {PLANS.map((p) => {
                  const row = getRow(reg.key, p.key);
                  const k = cellKey(reg.key, p.key);
                  const draft = drafts[k] ?? "";
                  const dirty = isDirty(reg.key, p.key);
                  const saving = savingKey === k;
                  return (
                    <div
                      key={p.key}
                      className="rounded-xl bg-black/30 border border-white/10 p-3"
                      data-testid={`price-cell-${reg.key}-${p.key}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${p.tone}`}>
                          {p.icon}
                          {p.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {row?.seeded ? "قيمة افتراضية" : `آخر تعديل: ${fmtDate(row?.updatedAt ?? null)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Input
                            value={draft}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [k]: e.target.value }))
                            }
                            inputMode="numeric"
                            dir="ltr"
                            className="text-left font-mono font-bold pr-12"
                            disabled={saving}
                            data-testid={`price-input-${reg.key}-${p.key}`}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                            YER
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => requestSave(reg.key, p.key)}
                          disabled={!dirty || saving}
                          className="gap-1.5 shrink-0"
                          data-testid={`price-save-${reg.key}-${p.key}`}
                        >
                          {saving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          حفظ
                        </Button>
                        {dirty && !saving && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => discard(reg.key, p.key)}
                            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                          >
                            تراجع
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px]">
                        <span className="text-muted-foreground">
                          الافتراضي: {fmtYer(data.defaults?.[reg.key]?.[p.key] ?? 0)}
                        </span>
                        {row && (
                          <span className="text-muted-foreground">
                            الحالي: <span className="font-bold text-foreground">{fmtYer(row.priceYer)}</span>
                          </span>
                        )}
                      </div>

                      {/* Live pricing preview — updates as admin types */}
                      {(() => {
                        const rawDraft = toEnglishDigits(draft).trim();
                        const previewYer = /^\d+$/.test(rawDraft) ? Number(rawDraft) : NaN;
                        if (!Number.isFinite(previewYer) || previewYer <= 0) return null;
                        const pv = computePreview(previewYer, reg.key, rates);
                        return (
                          <div className="mt-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 text-[11px] space-y-1">
                            <div className="text-muted-foreground font-medium mb-1">معاينة الاشتراك بهذا السعر:</div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Gem className="w-3 h-3 inline-block" /> جواهر الطالب
                              </span>
                              <span className="font-bold text-foreground">{fmtGems(pv.gemsGranted)} 💎</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">الحد اليومي</span>
                              <span className="font-bold text-foreground">{fmtGems(pv.dailyGemLimit)} / يوم</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">سقف تكلفة AI</span>
                              <span className="font-bold text-foreground">{fmtUsd(pv.aiCostCapUsd)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={confirmKey !== null} onOpenChange={(o) => { if (!o) setConfirmKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            تأكيد تعديل السعر
          </DialogTitle>
          {confirmRow && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                سيتم تغيير سعر باقة <span className="font-bold text-foreground">{confirmRow.planLabel}</span> في منطقة <span className="font-bold text-foreground">{confirmRow.regionLabel}</span>:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">السعر الحالي</p>
                  <p className="font-bold text-lg line-through opacity-60">
                    {confirmRow.oldPrice != null ? fmtYer(confirmRow.oldPrice) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-gold/10 border border-gold/30 p-3 text-center">
                  <p className="text-[11px] text-gold mb-1">السعر الجديد</p>
                  <p className="font-bold text-lg text-gold">
                    {confirmRow.newPrice != null ? fmtYer(confirmRow.newPrice) : "—"}
                  </p>
                </div>
              </div>

              {confirmRow.newPrice != null && confirmRow.newPrice > 0 && (() => {
                const pv = computePreview(confirmRow.newPrice, confirmRow.region, rates);
                return (
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs space-y-1.5">
                    <div className="text-muted-foreground font-medium mb-1">الاشتراكات الجديدة بهذا السعر ستحصل على:</div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">جواهر الطالب</span>
                      <span className="font-bold">{fmtGems(pv.gemsGranted)} 💎</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الحد اليومي</span>
                      <span className="font-bold">{fmtGems(pv.dailyGemLimit)} / يوم</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">سقف تكلفة AI</span>
                      <span className="font-bold">{fmtUsd(pv.aiCostCapUsd)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
                المشتركون الحاليون لن يتأثروا. التعديل يسري على طلبات الاشتراك الجديدة فقط.
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmKey(null)}
                  disabled={savingKey !== null}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={performSave}
                  disabled={savingKey !== null || confirmRow.newPrice == null}
                  data-testid="confirm-price-save"
                >
                  {savingKey !== null ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin ml-1" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "تأكيد الحفظ"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
