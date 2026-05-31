import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Save, Crown, ShieldAlert, AlertTriangle, ArrowRightLeft,
} from "lucide-react";

type Region = "north" | "south";

type RateRow = {
  region: Region;
  yerPerUsd: number;
  updatedAt: string | null;
  updatedByUserId: number | null;
  seeded: boolean;
};

type RateResponse = {
  rates: RateRow[];
  defaults: Record<Region, number>;
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
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export function AdminExchangeRates() {
  const { toast } = useToast();
  const [data, setData] = useState<RateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<Region, string>>({ north: "", south: "" });
  const [savingRegion, setSavingRegion] = useState<Region | null>(null);
  const [confirmRegion, setConfirmRegion] = useState<Region | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/exchange-rates", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as RateResponse;
      setData(j);
      const d: Record<Region, string> = { north: "", south: "" };
      for (const row of j.rates) d[row.region] = String(row.yerPerUsd);
      setDrafts(d);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "تعذّر تحميل أسعار الصرف",
        description: err?.message ?? "حاول مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function getRow(region: Region): RateRow | null {
    if (!data) return null;
    return data.rates.find((x) => x.region === region) ?? null;
  }

  function isDirty(region: Region): boolean {
    const row = getRow(region);
    if (!row) return false;
    const draft = drafts[region] ?? "";
    const parsed = Number(toEnglishDigits(draft));
    return Number.isFinite(parsed) && parsed !== row.yerPerUsd;
  }

  function validate(value: string): { ok: true; n: number } | { ok: false; msg: string } {
    const trimmed = toEnglishDigits(value).trim();
    if (!trimmed) return { ok: false, msg: "أدخل قيمة." };
    if (!/^\d+$/.test(trimmed)) return { ok: false, msg: "أرقام صحيحة فقط." };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { ok: false, msg: "قيمة غير صالحة." };
    if (!Number.isInteger(n)) return { ok: false, msg: "السعر يجب أن يكون عدداً صحيحاً." };
    if (n < 1) return { ok: false, msg: "السعر يجب أن يكون أكبر من صفر." };
    if (n > 100_000) return { ok: false, msg: "أقصى قيمة مسموحة: 100,000 ريال للدولار." };
    return { ok: true, n };
  }

  function requestSave(region: Region): void {
    const v = validate(drafts[region] ?? "");
    if (!v.ok) {
      toast({ variant: "destructive", title: "قيمة غير صالحة", description: v.msg });
      return;
    }
    setConfirmRegion(region);
  }

  async function performSave(): Promise<void> {
    if (!confirmRegion) return;
    const v = validate(drafts[confirmRegion] ?? "");
    if (!v.ok) {
      toast({ variant: "destructive", title: "قيمة غير صالحة", description: v.msg });
      setConfirmRegion(null);
      return;
    }
    setSavingRegion(confirmRegion);
    try {
      const r = await fetch("/api/admin/exchange-rates", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: confirmRegion, yerPerUsd: v.n }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);
      toast({
        title: "تم حفظ سعر الصرف",
        description: `${REGIONS.find((x) => x.key === confirmRegion)?.label}: 1 دولار = ${fmtYer(v.n)}`,
      });
      await load();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "فشل حفظ السعر",
        description: err?.message ?? "حاول مرة أخرى.",
      });
    } finally {
      setSavingRegion(null);
      setConfirmRegion(null);
    }
  }

  function discard(region: Region): void {
    const row = getRow(region);
    if (!row) return;
    setDrafts((prev) => ({ ...prev, [region]: String(row.yerPerUsd) }));
  }

  const confirmCard = confirmRegion ? (() => {
    const row = getRow(confirmRegion);
    const v = validate(drafts[confirmRegion] ?? "");
    return {
      region: confirmRegion,
      regionLabel: REGIONS.find((x) => x.key === confirmRegion)?.label ?? confirmRegion,
      oldValue: row?.yerPerUsd ?? null,
      newValue: v.ok ? v.n : null,
    };
  })() : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-gold" />
            أسعار الصرف (ريال يمني → دولار)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            هذه الأسعار تُستخدم في حساب جواهر الطالب وسقف تكلفة الذكاء الاصطناعي. أي تعديل يسري فوراً على الاشتراكات الجديدة، ولا يؤثر على المشتركين الحاليين.
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
          أدخل عدد الريالات في الدولار الواحد (مثلاً 600 يعني 1 دولار = 600 ريال). السعر الأقل = سقف تكلفة AI أقل = حماية أكبر للمنصة من الخسارة.
        </div>
      </div>

      {!data && loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-60" />
          جاري التحميل...
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          تعذّر تحميل أسعار الصرف.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {REGIONS.map((reg) => {
            const row = getRow(reg.key);
            const draft = drafts[reg.key] ?? "";
            const dirty = isDirty(reg.key);
            const saving = savingRegion === reg.key;
            return (
              <div
                key={reg.key}
                className={`rounded-2xl border bg-gradient-to-br ${reg.chipClass} p-4`}
                data-testid={`rate-cell-${reg.key}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base">منطقة {reg.label}</h3>
                    <p className="text-[11px] opacity-80">{reg.sub}</p>
                  </div>
                  <Crown className="w-5 h-5 opacity-50" />
                </div>

                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <div className="flex items-center justify-between mb-2 text-[11px] text-muted-foreground">
                    <span>1 دولار أمريكي =</span>
                    <span>
                      {row?.seeded ? "قيمة افتراضية" : `آخر تعديل: ${fmtDate(row?.updatedAt ?? null)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={draft}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [reg.key]: e.target.value }))
                        }
                        inputMode="numeric"
                        dir="ltr"
                        className="text-left font-mono font-bold pr-12"
                        disabled={saving}
                        data-testid={`rate-input-${reg.key}`}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                        YER
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => requestSave(reg.key)}
                      disabled={!dirty || saving}
                      className="gap-1.5 shrink-0"
                      data-testid={`rate-save-${reg.key}`}
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
                        onClick={() => discard(reg.key)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        تراجع
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-muted-foreground">
                      الافتراضي: {fmtYer(data.defaults?.[reg.key] ?? 0)}
                    </span>
                    {row && (
                      <span className="text-muted-foreground">
                        الحالي: <span className="font-bold text-foreground">{fmtYer(row.yerPerUsd)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={confirmRegion !== null} onOpenChange={(o) => { if (!o) setConfirmRegion(null); }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            تأكيد تعديل سعر الصرف
          </DialogTitle>
          {confirmCard && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                سيتم تغيير سعر الصرف لمنطقة <span className="font-bold text-foreground">{confirmCard.regionLabel}</span>:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">السعر الحالي</p>
                  <p className="font-bold text-lg line-through opacity-60">
                    {confirmCard.oldValue != null ? fmtYer(confirmCard.oldValue) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-gold/10 border border-gold/30 p-3 text-center">
                  <p className="text-[11px] text-gold mb-1">السعر الجديد</p>
                  <p className="font-bold text-lg text-gold">
                    {confirmCard.newValue != null ? fmtYer(confirmCard.newValue) : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
                المشتركون الحاليون لن يتأثروا. التعديل يسري على طلبات الاشتراك الجديدة فقط، ويُستخدم لحساب الجواهر وسقف تكلفة الذكاء الاصطناعي.
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmRegion(null)}
                  disabled={savingRegion !== null}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={performSave}
                  disabled={savingRegion !== null || confirmCard.newValue == null}
                  data-testid="confirm-rate-save"
                >
                  {savingRegion !== null ? (
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
