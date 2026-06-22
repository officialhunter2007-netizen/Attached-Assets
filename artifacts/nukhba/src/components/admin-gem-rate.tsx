import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Save, Gem, Coins, Calculator, ShieldCheck,
  AlertTriangle, ShieldAlert, Zap, Star, TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Admin: gem charge rate + package safety calculator.
//
// ONE knob — "gems per 1M teaching tokens" — maps to the internal gems-per-USD
// constant that every AI charge uses. The calculator shows, for each package
// (FIXED gems) at the current YER price + exchange rate, whether the v4 AI
// funding share (HALF the price under the 50/50 split) covers the platform's
// MAX AI cost if the student spends every gem:
//   funding-share (= price × 0.5)  must be ≥  max AI cost (= gems × cost-per-gem)
// This mirrors the platform policy "AI cost never exceeds 50% of subscription
// payment" — the other 50% is platform margin and never funds AI. It recomputes
// live against the DRAFT rate so the admin sees margin impact before saving.
// ─────────────────────────────────────────────────────────────────────────────

type Region = "north" | "south";
type PlanType = "bronze" | "silver" | "gold";

const REGIONS: Array<{ key: Region; label: string; chipClass: string }> = [
  { key: "north", label: "الشمال", chipClass: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300" },
  { key: "south", label: "الجنوب", chipClass: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-300" },
];

const PLANS: Array<{ key: PlanType; label: string; icon: React.ReactNode; tone: string }> = [
  { key: "bronze", label: "البرونزية", icon: <Zap className="w-4 h-4" />, tone: "text-orange-400" },
  { key: "silver", label: "الفضية", icon: <Star className="w-4 h-4" />, tone: "text-slate-300" },
  { key: "gold", label: "الذهبية", icon: <Gem className="w-4 h-4" />, tone: "text-gold" },
];

const FALLBACK_YER_PER_USD: Record<Region, number> = { north: 600, south: 2800 };

// Margin band: ≥1.5× of cost = healthy, 1.0–1.5× = thin, <1.0× = loss (block).
const HEALTHY_RATIO = 1.5;

// Only HALF of the subscription price is allowed to fund AI (50/50 split).
// Coverage = AI funding share ÷ max AI cost. See header note + platform policy.
const AI_FUNDING_SHARE = 0.5;

type GemRate = {
  gemsPer1M: number;
  defaultGemsPer1M: number;
  refUsdPer1MTokens: number;
  gemsPerUsd: number;
  costPerGemUsd: number;
  packageGems: Record<PlanType, number>;
  settingKey: string;
};

type PriceRow = { region: Region; planType: PlanType; priceYer: number };
type PriceResponse = { prices: PriceRow[]; defaults: Record<Region, Record<PlanType, number>> };
type ExchangeRateRow = { region: Region; yerPerUsd: number };

function toEnglishDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function fmtUsd(n: number, digits = 4): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toFixed(digits)}`;
}
function fmtGems(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}
function fmtYer(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("ar-EG")} ريال`;
}

export function AdminGemRate() {
  const { toast } = useToast();
  const [rate, setRate] = useState<GemRate | null>(null);
  const [prices, setPrices] = useState<PriceResponse | null>(null);
  const [yerPerUsd, setYerPerUsd] = useState<Record<Region, number>>(FALLBACK_YER_PER_USD);
  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rateRes, pricesRes, ratesRes] = await Promise.all([
        fetch("/api/admin/v4/gem-rate", { credentials: "include" }),
        fetch("/api/admin/plan-prices", { credentials: "include" }),
        fetch("/api/admin/exchange-rates", { credentials: "include" }),
      ]);
      if (!rateRes.ok) throw new Error(`HTTP ${rateRes.status}`);
      const rj = (await rateRes.json()) as GemRate;
      setRate(rj);
      setDraft(String(Math.round(rj.gemsPer1M)));

      if (pricesRes.ok) setPrices((await pricesRes.json()) as PriceResponse);
      if (ratesRes.ok) {
        const ej = (await ratesRes.json()) as { rates: ExchangeRateRow[] };
        const next: Record<Region, number> = { ...FALLBACK_YER_PER_USD };
        for (const row of ej.rates ?? []) {
          if (Number.isFinite(row.yerPerUsd) && row.yerPerUsd > 0) next[row.region] = row.yerPerUsd;
        }
        setYerPerUsd(next);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذّر تحميل سعر الجوهرة", description: err?.message ?? "حاول مرة أخرى." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Live draft rate → derived constants (used by the calculator before saving).
  const draftGemsPer1M = useMemo(() => {
    const n = Number(toEnglishDigits(draft).trim());
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [draft]);

  const refUsd = rate?.refUsdPer1MTokens ?? 0.25;
  const draftGemsPerUsd = Number.isFinite(draftGemsPer1M) ? draftGemsPer1M / refUsd : NaN;
  const draftCostPerGemUsd = Number.isFinite(draftGemsPerUsd) && draftGemsPerUsd > 0 ? 1 / draftGemsPerUsd : NaN;

  const dirty = rate != null && Number.isFinite(draftGemsPer1M) && Math.round(rate.gemsPer1M) !== draftGemsPer1M;

  function priceYerFor(region: Region, plan: PlanType): number | null {
    const row = prices?.prices.find((x) => x.region === region && x.planType === plan);
    if (row && Number.isFinite(row.priceYer)) return row.priceYer;
    const d = prices?.defaults?.[region]?.[plan];
    return Number.isFinite(d as number) ? (d as number) : null;
  }

  // Any package at a loss under the draft rate? → block saving with a warning.
  // "Loss" now means the 50% AI funding share doesn't cover max AI cost.
  const lossCells = useMemo(() => {
    if (!rate || !Number.isFinite(draftCostPerGemUsd)) return [] as string[];
    const out: string[] = [];
    for (const reg of REGIONS) {
      for (const p of PLANS) {
        const gems = rate.packageGems[p.key];
        const priceYer = priceYerFor(reg.key, p.key);
        if (!gems || priceYer == null) continue;
        const divisor = yerPerUsd[reg.key] || FALLBACK_YER_PER_USD[reg.key];
        const priceUsd = priceYer / divisor;
        const fundingUsd = priceUsd * AI_FUNDING_SHARE;
        const maxAiCost = gems * draftCostPerGemUsd;
        if (fundingUsd < maxAiCost) out.push(`${reg.label}/${p.label}`);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, prices, yerPerUsd, draftCostPerGemUsd]);

  async function save() {
    if (!Number.isFinite(draftGemsPer1M)) {
      toast({ variant: "destructive", title: "قيمة غير صالحة", description: "أدخل عدداً موجباً." });
      return;
    }
    if (lossCells.length > 0) {
      const ok = window.confirm(
        `تحذير: بهذا السعر ستخسر المنصة على الباقات التالية إذا استهلك الطالب كل الجواهر:\n\n${lossCells.join("، ")}\n\nسعر الجوهرة أقل من تكلفتها الحقيقية. هل تريد الحفظ رغم ذلك؟`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/v4/gem-rate", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
        body: JSON.stringify({ gemsPer1M: draftGemsPer1M }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      setRate(j as GemRate);
      setDraft(String(Math.round((j as GemRate).gemsPer1M)));
      toast({ title: "تم حفظ سعر الجوهرة", description: `${fmtGems(draftGemsPer1M)} جوهرة لكل مليون رمز`, className: "bg-emerald-600 border-none text-white" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "فشل الحفظ", description: err?.message ?? "حاول مرة أخرى." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" /> سعر الجوهرة وحاسبة الأمان
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            مقبض واحد يحدّد كم جوهرة تساوي مليون رمز من نموذج التدريس. منه تُحسب تكلفة الجوهرة الحقيقية، وكل عمليات الذكاء الاصطناعي تُخصم بهذا السعر فوراً.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 border-white/10">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* ── Rate editor ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5 text-gold" /> عدد الجواهر لكل مليون رمز
            </Label>
            <div className="relative mt-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                inputMode="numeric"
                dir="ltr"
                disabled={saving}
                className="text-left font-mono font-bold bg-black/40"
                data-testid="gem-rate-input"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                جوهرة / 1M
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              الافتراضي: {rate ? fmtGems(rate.defaultGemsPer1M) : "—"} (≈ ١٠٠٠ جوهرة لكل دولار)
            </p>
          </div>
          <Button
            onClick={save}
            disabled={!dirty || saving || !Number.isFinite(draftGemsPer1M)}
            className="gradient-gold text-primary-foreground font-bold shrink-0 gap-1.5"
            data-testid="gem-rate-save"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "جاري الحفظ..." : "حفظ السعر"}
          </Button>
        </div>

        {/* Derived constants */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">جوهرة لكل دولار</p>
            <p className="font-bold text-sm text-foreground" data-testid="derived-gems-per-usd">
              {Number.isFinite(draftGemsPerUsd) ? fmtGems(Math.round(draftGemsPerUsd)) : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">تكلفة الجوهرة الحقيقية</p>
            <p className="font-bold text-sm text-gold" data-testid="derived-cost-per-gem">
              {fmtUsd(draftCostPerGemUsd, 6)}
            </p>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-[10px] text-muted-foreground mb-1">مرجع تكلفة النموذج</p>
            <p className="font-bold text-sm text-foreground">{fmtUsd(refUsd, 2)} / 1M</p>
          </div>
        </div>
        {dirty && (
          <p className="text-[11px] text-amber-300 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> لم يُحفظ بعد — الحاسبة أدناه تعرض تأثير السعر الجديد.
          </p>
        )}
      </div>

      {/* ── Safety calculator ───────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-emerald-400" /> حاسبة أمان الباقات
          <span className="text-[10px] font-normal text-muted-foreground">(إذا استهلك الطالب كل جواهره)</span>
        </h3>
        {lossCells.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-3 flex items-start gap-2 text-xs text-red-200">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div>خسارة محتملة على: <span className="font-bold">{lossCells.join("، ")}</span> — سعر الجوهرة أقل من تكلفتها. ارفع سعر الباقة أو اخفض عدد الجواهر لكل دولار.</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {REGIONS.map((reg) => (
            <div key={reg.key} className={`rounded-2xl border bg-gradient-to-br ${reg.chipClass} p-4`}>
              <h4 className="font-bold text-base mb-3">منطقة {reg.label}</h4>
              <div className="space-y-2">
                {PLANS.map((p) => {
                  const gems = rate?.packageGems[p.key] ?? 0;
                  const priceYer = priceYerFor(reg.key, p.key);
                  const divisor = yerPerUsd[reg.key] || FALLBACK_YER_PER_USD[reg.key];
                  const priceUsd = priceYer != null ? priceYer / divisor : NaN;
                  const fundingUsd = Number.isFinite(priceUsd) ? priceUsd * AI_FUNDING_SHARE : NaN;
                  const maxAiCost = Number.isFinite(draftCostPerGemUsd) && gems > 0 ? gems * draftCostPerGemUsd : NaN;
                  const ratio = Number.isFinite(fundingUsd) && Number.isFinite(maxAiCost) && maxAiCost > 0
                    ? fundingUsd / maxAiCost : NaN;

                  let badge: { txt: string; cls: string; icon: React.ReactNode };
                  if (!Number.isFinite(ratio)) {
                    badge = { txt: "—", cls: "bg-white/10 text-muted-foreground border-white/10", icon: null };
                  } else if (ratio < 1) {
                    badge = { txt: "خسارة", cls: "bg-red-500/15 text-red-300 border-red-500/30", icon: <ShieldAlert className="w-3 h-3" /> };
                  } else if (ratio < HEALTHY_RATIO) {
                    badge = { txt: "هامش ضعيف", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: <AlertTriangle className="w-3 h-3" /> };
                  } else {
                    badge = { txt: "ربح جيد", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: <ShieldCheck className="w-3 h-3" /> };
                  }

                  return (
                    <div key={p.key} className="rounded-xl bg-black/30 border border-white/10 p-3" data-testid={`safety-cell-${reg.key}-${p.key}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${p.tone}`}>{p.icon}{p.label}</div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`} data-testid={`safety-status-${reg.key}-${p.key}`}>
                          {badge.icon}{badge.txt}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1"><Gem className="w-3 h-3" /> الجواهر</span>
                        <span className="font-bold text-left">{fmtGems(gems)}</span>
                        <span className="text-muted-foreground">السعر</span>
                        <span className="font-bold text-left">{priceYer != null ? fmtYer(priceYer) : "—"}</span>
                        <span className="text-muted-foreground">السعر بالدولار</span>
                        <span className="font-bold text-left">{fmtUsd(priceUsd)}</span>
                        <span className="text-muted-foreground">حصة تمويل الذكاء (٥٠٪)</span>
                        <span className="font-bold text-left text-sky-300">{fmtUsd(fundingUsd)}</span>
                        <span className="text-muted-foreground">أقصى تكلفة ذكاء</span>
                        <span className="font-bold text-left">{fmtUsd(maxAiCost)}</span>
                        <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> نسبة التغطية</span>
                        <span className={`font-bold text-left ${Number.isFinite(ratio) ? (ratio < 1 ? "text-red-300" : ratio < HEALTHY_RATIO ? "text-amber-300" : "text-emerald-300") : ""}`}>
                          {Number.isFinite(ratio) ? `${ratio.toFixed(2)}×` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          «نسبة التغطية» = حصة تمويل الذكاء (٥٠٪ من سعر الباقة) ÷ أقصى تكلفة ذكاء لو استُهلكت كل الجواهر. النصف الآخر هامش المنصة ولا يموّل الذكاء أبداً (سياسة: تكلفة الذكاء لا تتجاوز ٥٠٪ من قيمة الاشتراك). تحت ١.٠٠× يعني خسارة، و١.٠٠–{HEALTHY_RATIO.toFixed(2)}× هامش ضعيف، وفوق ذلك ربح جيد. الخصم الفعلي دائماً بالتكلفة الحقيقية للرموز — هذا تقدير للحالة القصوى.
        </p>
      </div>
    </div>
  );
}
