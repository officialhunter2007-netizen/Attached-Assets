import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Percent, Eye, Power, RefreshCw, Users as UsersIcon } from "lucide-react";

type DiscountCode = {
  id: number;
  code: string;
  percent: number;
  note: string | null;
  active: boolean;
  usageCount: number;
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
        body: JSON.stringify({ code, percent, note: newNote.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.error || "فشل الإنشاء", variant: "destructive" });
        return;
      }
      toast({ title: `تم إنشاء كود ${data.code}`, className: "bg-emerald-600 border-none text-white" });
      setNewCode(""); setNewPercent(""); setNewNote(""); setShowCreate(false);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Percent className="w-5 h-5 text-purple-300" /> أكواد الخصم
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            أنشئ أكواد خصم بالنسبة المئوية وتتبع المشتركين الذين استخدموا كل كود (مفيد لتتبع المسوّقين).
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
            {codes.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base text-purple-300">{c.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      −{c.percent}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${c.active ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>
                      {c.active ? "مفعّل" : "متوقف"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <UsersIcon className="w-3 h-3 inline ml-1" />
                      {c.usageCount} طلب
                    </span>
                  </div>
                  {c.note && <p className="text-xs text-muted-foreground mt-1 truncate">{c.note}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="border-white/10" onClick={() => handleViewSubscribers(c)}>
                    <Eye className="w-4 h-4 ml-1" /> المشتركون
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
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass border-purple-500/30 max-w-md">
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
