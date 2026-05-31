import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Percent, Eye, Power, RefreshCw, Users as UsersIcon, Pencil } from "lucide-react";

type DiscountCode = {
  id: number;
  code: string;
  percent: number;
  note: string | null;
  active: boolean;
  usageCount: number;
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

type Subscriber = {
  id: number;
  userName: string | null;
  userEmail: string;
  planType: string;
  region: string;
  basePrice: number | null;
  finalPrice: number | null;
  discountPercent: number | null;
  status: string;
  createdAt: string;
  subjectName: string | null;
};

const planLabels: Record<string, string> = {
  bronze: "برونزية",
  silver: "فضية",
  gold: "ذهبية",
};

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved: { label: "مفعّل", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "مرفوض", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  incomplete: { label: "ناقص", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

// Convert ISO string -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
// Returns "" when the value is missing or invalid so the input shows empty.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convert <input type="datetime-local"> value -> ISO. Empty -> null so the
// API can clear the field.
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdminDiscountCodes() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newPerUserLimit, setNewPerUserLimit] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");

  // Edit limits dialog (reused PATCH endpoint, no percent change here)
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [editMaxUses, setEditMaxUses] = useState("");
  const [editPerUserLimit, setEditPerUserLimit] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Subscribers dialog
  const [viewingCode, setViewingCode] = useState<DiscountCode | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/discount-codes", { credentials: "include" });
      if (r.ok) setCodes(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetCreateForm = () => {
    setNewCode(""); setNewPercent(""); setNewNote("");
    setNewMaxUses(""); setNewPerUserLimit("");
    setNewStartsAt(""); setNewEndsAt("");
  };

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    const percent = parseInt(newPercent, 10);
    if (!code) { toast({ title: "أدخل الكود", variant: "destructive" }); return; }
    if (!Number.isInteger(percent) || percent < 1 || percent > 99) {
      toast({ title: "النسبة يجب أن تكون بين ١ و ٩٩", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          percent,
          note: newNote.trim(),
          // Empty string -> null on the wire so the server clears/leaves
          // the column unset rather than mis-parsing "".
          maxUses: newMaxUses.trim() === "" ? null : parseInt(newMaxUses, 10),
          perUserLimit: newPerUserLimit.trim() === "" ? null : parseInt(newPerUserLimit, 10),
          startsAt: fromLocalInput(newStartsAt),
          endsAt: fromLocalInput(newEndsAt),
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.error || "فشل الإنشاء", variant: "destructive" });
        return;
      }
      toast({ title: `تم إنشاء كود ${data.code}`, className: "bg-emerald-600 border-none text-white" });
      resetCreateForm();
      setShowCreate(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (c: DiscountCode) => {
    const r = await fetch(`/api/admin/discount-codes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active: !c.active }),
    });
    if (r.ok) {
      toast({ title: c.active ? "تم إيقاف الكود" : "تم تفعيل الكود", className: "bg-emerald-600 border-none text-white" });
      await load();
    } else {
      const data = await r.json().catch(() => ({}));
      toast({ title: data.error || "فشلت العملية", variant: "destructive" });
    }
  };

  const handleViewSubscribers = async (c: DiscountCode) => {
    setViewingCode(c);
    setSubscribers([]);
    setLoadingSubs(true);
    try {
      const r = await fetch(`/api/admin/discount-codes/${c.id}/subscribers`, { credentials: "include" });
      if (r.ok) setSubscribers(await r.json());
    } finally {
      setLoadingSubs(false);
    }
  };

  const openEdit = (c: DiscountCode) => {
    setEditingCode(c);
    setEditMaxUses(c.maxUses == null ? "" : String(c.maxUses));
    setEditPerUserLimit(c.perUserLimit == null ? "" : String(c.perUserLimit));
    setEditStartsAt(toLocalInput(c.startsAt));
    setEditEndsAt(toLocalInput(c.endsAt));
  };

  const handleSaveEdit = async () => {
    if (!editingCode) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`/api/admin/discount-codes/${editingCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          maxUses: editMaxUses.trim() === "" ? null : parseInt(editMaxUses, 10),
          perUserLimit: editPerUserLimit.trim() === "" ? null : parseInt(editPerUserLimit, 10),
          startsAt: fromLocalInput(editStartsAt),
          endsAt: fromLocalInput(editEndsAt),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: data.error || "فشل الحفظ", variant: "destructive" });
        return;
      }
      toast({ title: "تم حفظ الحدود", className: "bg-emerald-600 border-none text-white" });
      setEditingCode(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  // Compact human label for the per-code limits row. Returns `null` when no
  // limits are set so the row stays clean.
  const limitsLabel = (c: DiscountCode): string | null => {
    const parts: string[] = [];
    if (c.maxUses != null) parts.push(`${c.usageCount}/${c.maxUses} استخدام`);
    if (c.perUserLimit != null) parts.push(`حد المستخدم: ${c.perUserLimit}`);
    if (c.startsAt) parts.push(`يبدأ ${new Date(c.startsAt).toLocaleDateString("ar-EG")}`);
    if (c.endsAt) parts.push(`ينتهي ${new Date(c.endsAt).toLocaleDateString("ar-EG")}`);
    return parts.length ? parts.join(" • ") : null;
  };

  // Tag a code as exhausted/expired so it's visually distinct from a
  // simply-disabled code. Server still enforces the rule.
  const codeStatusBadge = (c: DiscountCode) => {
    const now = Date.now();
    if (!c.active) return { label: "متوقف", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    if (c.maxUses != null && c.usageCount >= c.maxUses) {
      return { label: "نفد", cls: "bg-red-500/15 text-red-300 border-red-500/30" };
    }
    if (c.endsAt && new Date(c.endsAt).getTime() < now) {
      return { label: "منتهي", cls: "bg-red-500/15 text-red-300 border-red-500/30" };
    }
    if (c.startsAt && new Date(c.startsAt).getTime() > now) {
      return { label: "لم يبدأ", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    }
    return { label: "مفعّل", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-300" /> أكواد الخصم
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            أنشئ أكواد خصم بنسبة مئوية مع حدود استخدام (أقصى عدد، حد لكل مستخدم، فترة صلاحية) وتتبع المشتركين.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-white/10">
            <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button size="sm" className="gradient-gold text-primary-foreground font-bold" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 ml-1" /> كود جديد
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/20">
        {codes.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {loading ? "جاري التحميل..." : "لا توجد أكواد بعد. أنشئ كوداً جديداً للبدء."}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {codes.map((c) => {
              const status = codeStatusBadge(c);
              const limits = limitsLabel(c);
              return (
                <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-base text-purple-300">{c.code}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        −{c.percent}%
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${status.cls}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <UsersIcon className="w-3 h-3 inline ml-1" />
                        {c.usageCount}{c.maxUses != null ? `/${c.maxUses}` : ""} طلب
                      </span>
                    </div>
                    {limits && <p className="text-[11px] text-muted-foreground mt-1">{limits}</p>}
                    {c.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.note}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button variant="outline" size="sm" className="border-white/10" onClick={() => handleViewSubscribers(c)}>
                      <Eye className="w-4 h-4 ml-1" /> المشتركون
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/10" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4 ml-1" /> الحدود
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`border-white/10 ${c.active ? "text-orange-300" : "text-emerald-300"}`}
                      onClick={() => handleToggleActive(c)}
                    >
                      <Power className="w-4 h-4 ml-1" /> {c.active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass border-purple-500/30 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-300" /> كود خصم جديد
          </DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">الكود</Label>
              <Input
                placeholder="مثال: SUMMER20"
                dir="ltr"
                className="bg-black/40 font-mono uppercase"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
              <p className="text-[11px] text-muted-foreground mt-1">٢-٣٢ حرفاً: A-Z, 0-9, _ أو -</p>
            </div>
            <div>
              <Label className="text-xs">نسبة الخصم (%)</Label>
              <Input
                type="number"
                min={1}
                max={99}
                placeholder="20"
                className="bg-black/40"
                value={newPercent}
                onChange={(e) => setNewPercent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">أقصى عدد استخدامات</Label>
                <Input
                  type="number" min={1} placeholder="غير محدود"
                  className="bg-black/40"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">حد لكل مستخدم</Label>
                <Input
                  type="number" min={1} placeholder="غير محدود"
                  className="bg-black/40"
                  value={newPerUserLimit}
                  onChange={(e) => setNewPerUserLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">يبدأ من</Label>
                <Input
                  type="datetime-local" className="bg-black/40"
                  value={newStartsAt}
                  onChange={(e) => setNewStartsAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">ينتهي في</Label>
                <Input
                  type="datetime-local" className="bg-black/40"
                  value={newEndsAt}
                  onChange={(e) => setNewEndsAt(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">ملاحظة (اختيارية)</Label>
              <Input
                placeholder="مثلاً: حملة المسوّق أحمد"
                className="bg-black/40"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-white/10" onClick={() => setShowCreate(false)}>
                إلغاء
              </Button>
              <Button className="flex-1 gradient-gold text-primary-foreground font-bold" disabled={creating} onClick={handleCreate}>
                {creating ? "..." : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit limits dialog */}
      <Dialog open={!!editingCode} onOpenChange={(o) => { if (!o) setEditingCode(null); }}>
        <DialogContent className="glass border-purple-500/30 max-w-md">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-purple-300" />
            تعديل حدود <span className="font-mono text-purple-300">{editingCode?.code}</span>
          </DialogTitle>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              النسبة لا تُعدَّل بعد أوّل استخدام (لتجنّب تغيير سعر طلبات قائمة). الحدود الزمنية والعدّاد قابلة للتعديل
              في أي وقت.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">أقصى عدد استخدامات</Label>
                <Input
                  type="number" min={editingCode?.usageCount ?? 0} placeholder="غير محدود"
                  className="bg-black/40"
                  value={editMaxUses}
                  onChange={(e) => setEditMaxUses(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  مستخدم حالياً: {editingCode?.usageCount ?? 0}
                </p>
              </div>
              <div>
                <Label className="text-xs">حد لكل مستخدم</Label>
                <Input
                  type="number" min={1} placeholder="غير محدود"
                  className="bg-black/40"
                  value={editPerUserLimit}
                  onChange={(e) => setEditPerUserLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">يبدأ من</Label>
                <Input
                  type="datetime-local" className="bg-black/40"
                  value={editStartsAt}
                  onChange={(e) => setEditStartsAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">ينتهي في</Label>
                <Input
                  type="datetime-local" className="bg-black/40"
                  value={editEndsAt}
                  onChange={(e) => setEditEndsAt(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-white/10" onClick={() => setEditingCode(null)}>
                إلغاء
              </Button>
              <Button className="flex-1 gradient-gold text-primary-foreground font-bold" disabled={savingEdit} onClick={handleSaveEdit}>
                {savingEdit ? "..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscribers dialog */}
      <Dialog open={!!viewingCode} onOpenChange={(o) => { if (!o) setViewingCode(null); }}>
        <DialogContent className="glass border-purple-500/30 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-purple-300" />
            مشتركو كود <span className="font-mono text-purple-300">{viewingCode?.code}</span>
            {viewingCode && <span className="text-xs text-muted-foreground">({subscribers.length} طلب)</span>}
          </DialogTitle>
          <div className="overflow-y-auto -mx-6 px-6">
            {loadingSubs ? (
              <p className="text-center text-sm text-muted-foreground py-8">جاري التحميل...</p>
            ) : subscribers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لم يستخدم أحد هذا الكود بعد.</p>
            ) : (
              <div className="space-y-2">
                {subscribers.map((s) => {
                  const st = statusLabels[s.status] ?? { label: s.status, cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" };
                  return (
                    <div key={s.id} className="rounded-xl bg-black/30 border border-white/5 p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold truncate">{s.userName || s.userEmail}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.userEmail}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                            <span className="text-gold">{planLabels[s.planType] ?? s.planType}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{s.region === "north" ? "الشمال" : "الجنوب"}</span>
                            {s.subjectName && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground truncate">{s.subjectName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          {s.finalPrice != null && s.basePrice != null ? (
                            <>
                              <p className="text-emerald-400 font-bold">{s.finalPrice.toLocaleString("ar-EG")} ريال</p>
                              <p className="text-[10px] text-muted-foreground line-through">{s.basePrice.toLocaleString("ar-EG")}</p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">—</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(s.createdAt).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
