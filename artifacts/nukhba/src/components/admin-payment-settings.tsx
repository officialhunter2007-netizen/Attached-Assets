import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Save, RefreshCw } from "lucide-react";

// Single payment-setting row as returned by /api/admin/payment-settings.
type Setting = {
  key: string;
  value: string;
  label: string | null;
  category: string | null;
  updatedAt?: string | null;
};

// Keys we render explicitly. Anything else returned by the API is shown
// in a fallback "other" section so admins can still see/edit it without
// a code change.
// Keys match the seeds in auto-migrate.ts (dot-separated). Each region has
// its own account name so the platform can route different regions to
// different Kuraimi recipients later without a code change.
const KNOWN: Array<{ key: string; label: string; placeholder: string; dir?: "ltr" | "rtl" }> = [
  { key: "kuraimi.north.number", label: "رقم الكريمي — المحافظات الشمالية", placeholder: "3165778412", dir: "ltr" },
  { key: "kuraimi.north.name",   label: "اسم صاحب الحساب — الشمال",         placeholder: "عمرو خالد عبد المولى", dir: "rtl" },
  { key: "kuraimi.south.number", label: "رقم الكريمي — المحافظات الجنوبية", placeholder: "3167076083", dir: "ltr" },
  { key: "kuraimi.south.name",   label: "اسم صاحب الحساب — الجنوب",         placeholder: "عمرو خالد عبد المولى", dir: "rtl" },
];

export function AdminPaymentSettings() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, Setting>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/payment-settings", { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: Setting[] = await r.json();
      const byKey: Record<string, Setting> = {};
      const draft: Record<string, string> = {};
      for (const row of data ?? []) {
        byKey[row.key] = row;
        draft[row.key] = row.value ?? "";
      }
      // Make sure every "known" key has a draft entry even when the row
      // is missing — so admins can fill in a brand-new value.
      for (const k of KNOWN) {
        if (!(k.key in draft)) draft[k.key] = "";
      }
      setRows(byKey);
      setDrafts(draft);
    } catch {
      toast({ title: "تعذّر تحميل إعدادات الدفع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (key: string) => {
    const value = drafts[key] ?? "";
    setSaving(key);
    try {
      const known = KNOWN.find(k => k.key === key);
      // Backend handler is `PUT /admin/payment-settings/:key` (key in URL).
      // Send the rest of the payload in the body. encodeURIComponent so that
      // dot-separated keys (kuraimi.north.number) survive the URL intact.
      const r = await fetch(`/api/admin/payment-settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          value,
          label: known?.label ?? rows[key]?.label ?? null,
          category: "payment",
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: data.error || "فشل الحفظ", variant: "destructive" });
        return;
      }
      toast({ title: "تم الحفظ", className: "bg-emerald-600 border-none text-white" });
      await load();
    } finally {
      setSaving(null);
    }
  };

  // Extra keys returned by the server that aren't in KNOWN — render them
  // generically so a future-added key isn't invisible.
  const extraKeys = Object.keys(rows).filter(k => !KNOWN.some(x => x.key === k));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold" /> إعدادات الدفع
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            هذه الأرقام والأسماء تظهر للمستخدمين في صفحة الاشتراك. التغيير يُفعَّل فوراً.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-white/10">
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 divide-y divide-white/5">
        {KNOWN.map((k) => {
          const row = rows[k.key];
          const value = drafts[k.key] ?? "";
          const dirty = (row?.value ?? "") !== value;
          return (
            <div key={k.key} className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 min-w-0">
                <Label className="text-xs">{k.label}</Label>
                <Input
                  dir={k.dir}
                  className="bg-black/40 mt-1"
                  placeholder={k.placeholder}
                  value={value}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [k.key]: e.target.value }))}
                />
                {row?.updatedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    آخر تحديث: {new Date(row.updatedAt).toLocaleString("ar-EG")}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                disabled={!dirty || saving === k.key}
                className="gradient-gold text-primary-foreground font-bold shrink-0"
                onClick={() => save(k.key)}
              >
                <Save className="w-4 h-4 ml-1" />
                {saving === k.key ? "..." : "حفظ"}
              </Button>
            </div>
          );
        })}
        {extraKeys.length > 0 && (
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-2">إعدادات إضافية مسجّلة:</p>
            <div className="space-y-2">
              {extraKeys.map((k) => (
                <div key={k} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">{rows[k]?.label || k}</Label>
                    <Input
                      className="bg-black/40 mt-1"
                      value={drafts[k] ?? ""}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [k]: e.target.value }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={(rows[k]?.value ?? "") === (drafts[k] ?? "") || saving === k}
                    className="gradient-gold text-primary-foreground font-bold shrink-0"
                    onClick={() => save(k)}
                  >
                    <Save className="w-4 h-4 ml-1" /> حفظ
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
