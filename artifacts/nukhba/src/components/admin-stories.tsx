// ─────────────────────────────────────────────────────────────────────────────
// Admin Stories Manager
//
// Lets admins attach HTML story pages to any curriculum unit.
// Workflow:
//   1. Pick specialty → unit list populates automatically
//   2. Pick unit
//   3. Add a story: title + full HTML content (paste from editor)
//   4. Preview the story in a sandboxed iframe
//   5. Reorder / delete existing stories
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Plus, Trash2, Loader2, ArrowUp, ArrowDown,
  Eye, EyeOff, Search, Code2, ExternalLink, FileText, Copy, Check, Pencil, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { university, skills } from "@/lib/curriculum";

const CSRF = { "X-Nukhba-Csrf": "1" };

const allSubjectsFlat = [
  ...university.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
  ...skills.flatMap((cat) => cat.subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))),
];

type UnitInfo = {
  code: string;
  name: string;
  unit_index: number;
  stage_index: number;
  stage_name: string;
  lesson_count: number;
};

type Story = {
  id: number;
  specialty_id: string;
  unit_code: string;
  title: string;
  html_size: number;
  sortOrder: number;
  created_at: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Inline HTML preview ───────────────────────────────────────────────────────
function StoryPreview({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const doc = ref.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="معاينة القصة"
      sandbox="allow-scripts allow-same-origin"
      className="w-full border-0 rounded-xl"
      style={{ height: "520px" }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminStories() {
  const { toast } = useToast();

  // Specialty picker
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);

  // Unit picker
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitInfo | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Stories list
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Add-story form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newHtml, setNewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // Preview
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);

  // Inline code preview (before saving)
  const [showDraftPreview, setShowDraftPreview] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Copy HTML
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [copiedId, setCopiedId]   = useState<number | null>(null);

  // Edit story
  const [editingId,       setEditingId]       = useState<number | null>(null);
  const [editLoading,     setEditLoading]     = useState(false);
  const [editTitle,       setEditTitle]       = useState("");
  const [editHtml,        setEditHtml]        = useState("");
  const [editSortOrder,   setEditSortOrder]   = useState(0);
  const [editSaving,      setEditSaving]      = useState(false);
  const [editShowPreview, setEditShowPreview] = useState(false);

  // ── Load units when specialty changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedSpecialty) return;
    setUnits([]);
    setSelectedUnit(null);
    setStories([]);
    setPreviewHtml(null);
    setUnitsLoading(true);
    fetch(`/api/admin/v4/units?specialtyId=${selectedSpecialty.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch(() => toast({ title: "خطأ في تحميل الوحدات", variant: "destructive" }))
      .finally(() => setUnitsLoading(false));
  }, [selectedSpecialty]);

  // ── Load stories when unit changes ────────────────────────────────────────
  async function loadStories(unit: UnitInfo) {
    if (!selectedSpecialty) return;
    setStoriesLoading(true);
    setPreviewHtml(null);
    try {
      const r = await fetch(
        `/api/admin/v4/stories?specialtyId=${selectedSpecialty.id}&unitCode=${unit.code}`,
        { credentials: "include" }
      );
      const data = await r.json();
      setStories(
        Array.isArray(data)
          ? data.map((s: any) => ({
              id: s.id,
              specialty_id: s.specialty_id,
              unit_code: s.unit_code,
              title: s.title,
              html_size: Number(s.html_size || 0),
              sortOrder: s.sort_order,
              created_at: s.created_at,
            }))
          : []
      );
    } catch {
      toast({ title: "خطأ في تحميل القصص", variant: "destructive" });
    } finally {
      setStoriesLoading(false);
    }
  }

  // ── Add story ─────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!selectedSpecialty || !selectedUnit) return;
    if (!newTitle.trim()) { toast({ title: "العنوان مطلوب", variant: "destructive" }); return; }
    if (!newHtml.trim()) { toast({ title: "محتوى HTML مطلوب", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const r = await fetch("/api/admin/v4/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CSRF },
        credentials: "include",
        body: JSON.stringify({
          specialtyId: selectedSpecialty.id,
          unitCode: selectedUnit.code,
          title: newTitle.trim(),
          htmlContent: newHtml,
          sortOrder,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      toast({ title: "✓ تمت إضافة القصة" });
      setNewTitle("");
      setNewHtml("");
      setSortOrder(0);
      setShowAddForm(false);
      setShowDraftPreview(false);
      await loadStories(selectedUnit);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete story ──────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm("حذف هذه القصة نهائياً؟")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/v4/stories/${id}`, {
        method: "DELETE",
        headers: CSRF,
        credentials: "include",
      });
      setStories((s) => s.filter((x) => x.id !== id));
      if (previewHtml !== null) setPreviewHtml(null);
      toast({ title: "تم الحذف" });
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Reorder story ─────────────────────────────────────────────────────────
  async function handleMove(idx: number, dir: "up" | "down") {
    const other = dir === "up" ? idx - 1 : idx + 1;
    if (other < 0 || other >= stories.length) return;
    const a = stories[idx];
    const b = stories[other];
    const newStories = [...stories];
    newStories[idx] = { ...a, sortOrder: b.sortOrder };
    newStories[other] = { ...b, sortOrder: a.sortOrder };
    newStories.sort((x, y) => x.sortOrder - y.sortOrder);
    setStories(newStories);
    await Promise.all([
      fetch(`/api/admin/v4/stories/${a.id}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...CSRF },
        credentials: "include",
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      }),
      fetch(`/api/admin/v4/stories/${b.id}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...CSRF },
        credentials: "include",
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      }),
    ]);
  }

  // ── Copy HTML of a saved story ───────────────────────────────────────────
  async function handleCopy(id: number) {
    if (copyingId === id) return;
    setCopyingId(id);
    try {
      const r = await fetch(`/api/v4/stories/${id}`, { credentials: "include" });
      const data = await r.json();
      const html: string = data.html_content ?? "";
      await navigator.clipboard.writeText(html);
      setCopiedId(id);
      toast({ title: "✓ تم نسخ الكود" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "خطأ في النسخ", variant: "destructive" });
    } finally {
      setCopyingId(null);
    }
  }

  // ── Open edit form for a story ────────────────────────────────────────────
  async function handleEditStart(story: Story) {
    if (editLoading) return;
    setEditLoading(true);
    setPreviewHtml(null);
    setEditShowPreview(false);
    try {
      const r = await fetch(`/api/v4/stories/${story.id}`, { credentials: "include" });
      const data = await r.json();
      setEditTitle(data.title ?? story.title);
      setEditHtml(data.html_content ?? "");
      setEditSortOrder(story.sortOrder);
      setEditingId(story.id);
    } catch {
      toast({ title: "خطأ في تحميل القصة", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  }

  // ── Save edited story ──────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editingId || !selectedUnit) return;
    if (!editTitle.trim()) { toast({ title: "العنوان مطلوب", variant: "destructive" }); return; }
    if (!editHtml.trim())  { toast({ title: "محتوى HTML مطلوب", variant: "destructive" }); return; }

    setEditSaving(true);
    try {
      const r = await fetch(`/api/admin/v4/stories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...CSRF },
        credentials: "include",
        body: JSON.stringify({
          title: editTitle.trim(),
          htmlContent: editHtml,
          sortOrder: editSortOrder,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      toast({ title: "✓ تم حفظ التعديلات" });
      setEditingId(null);
      setEditShowPreview(false);
      await loadStories(selectedUnit);
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  }

  // ── Preview a saved story ─────────────────────────────────────────────────
  async function openPreview(id: number) {
    if (previewLoading === id) return;
    setPreviewLoading(id);
    try {
      const r = await fetch(`/api/v4/stories/${id}`, { credentials: "include" });
      const data = await r.json();
      setPreviewHtml(data.html_content ?? "");
    } catch {
      toast({ title: "خطأ في تحميل المعاينة", variant: "destructive" });
    } finally {
      setPreviewLoading(null);
    }
  }

  const filteredSpecialties = allSubjectsFlat.filter((s) =>
    s.name.toLowerCase().includes(specialtySearch.toLowerCase())
  );
  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.code.includes(unitSearch)
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* ── Specialty picker ── */}
      <div className="space-y-2">
        <Label className="text-white/70 text-xs">التخصص</Label>
        <div className="relative">
          <button
            onClick={() => setShowSpecialtyPicker((v) => !v)}
            className="w-full flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            {selectedSpecialty ? (
              <>
                <span>{selectedSpecialty.emoji}</span>
                <span className="text-white">{selectedSpecialty.name}</span>
              </>
            ) : (
              <span className="text-white/40">اختر تخصصاً…</span>
            )}
            <Search className="w-4 h-4 text-white/30 mr-auto" />
          </button>

          {showSpecialtyPicker && (
            <div className="absolute z-20 top-full mt-1 w-full bg-[#0d1424] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2 border-b border-white/5">
                <Input
                  value={specialtySearch}
                  onChange={(e) => setSpecialtySearch(e.target.value)}
                  placeholder="ابحث…"
                  className="bg-white/5 border-white/10 text-white text-sm h-8"
                  autoFocus
                />
              </div>
              <ul className="max-h-56 overflow-y-auto">
                {filteredSpecialties.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setSelectedSpecialty(s);
                        setShowSpecialtyPicker(false);
                        setSpecialtySearch("");
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 text-sm text-right transition-colors"
                    >
                      <span>{s.emoji}</span>
                      <span className="text-white/80">{s.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Unit picker ── */}
      {selectedSpecialty && (
        <div className="space-y-2">
          <Label className="text-white/70 text-xs">الوحدة</Label>
          {unitsLoading ? (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل…
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowUnitPicker((v) => !v)}
                className="w-full flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm transition-colors"
              >
                {selectedUnit ? (
                  <span className="text-white">
                    <span className="text-white/40 font-mono text-xs ml-2">{selectedUnit.code}</span>
                    {selectedUnit.name}
                  </span>
                ) : (
                  <span className="text-white/40">اختر وحدة…</span>
                )}
                <Search className="w-4 h-4 text-white/30 mr-auto" />
              </button>

              {showUnitPicker && (
                <div className="absolute z-20 top-full mt-1 w-full bg-[#0d1424] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-white/5">
                    <Input
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      placeholder="ابحث باسم الوحدة أو كودها…"
                      className="bg-white/5 border-white/10 text-white text-sm h-8"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-64 overflow-y-auto">
                    {filteredUnits.map((u) => (
                      <li key={u.code}>
                        <button
                          onClick={() => {
                            setSelectedUnit(u);
                            setShowUnitPicker(false);
                            setUnitSearch("");
                            loadStories(u);
                          }}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 text-sm text-right transition-colors"
                        >
                          <span className="text-white/30 font-mono text-xs mt-0.5 shrink-0">{u.code}</span>
                          <div>
                            <p className="text-white/80">{u.name}</p>
                            <p className="text-white/30 text-xs">{u.stage_name}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Stories list ── */}
      {selectedUnit && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/50">
              قصص الوحدة{" "}
              <span className="text-white/80 font-medium">{selectedUnit.name}</span>
            </p>
            <Button
              onClick={() => { setShowAddForm((v) => !v); setShowDraftPreview(false); }}
              size="sm"
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة قصة
            </Button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="bg-white/[0.03] border border-amber-500/20 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> قصة جديدة
              </p>

              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">عنوان القصة</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: بروتوكول NTLM — الشرح الكامل"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">ترتيب العرض</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="bg-white/5 border-white/10 text-white w-32"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-white/60 text-xs flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" /> كود HTML الكامل للقصة
                  </Label>
                  <button
                    onClick={() => setShowDraftPreview((v) => !v)}
                    disabled={!newHtml.trim()}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-30 transition-colors"
                  >
                    {showDraftPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showDraftPreview ? "إخفاء المعاينة" : "معاينة مباشرة"}
                  </button>
                </div>
                <textarea
                  value={newHtml}
                  onChange={(e) => setNewHtml(e.target.value)}
                  placeholder={"<!DOCTYPE html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>…</head>\n<body>…</body>\n</html>"}
                  rows={10}
                  dir="ltr"
                  className="w-full bg-[#000d1a] border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-sky-200 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-y"
                  style={{ minHeight: "200px" }}
                />
                <p className="text-[10px] text-white/25 font-mono">
                  {newHtml.length > 0 ? `${(newHtml.length / 1024).toFixed(1)} KB` : ""}
                </p>
              </div>

              {/* Draft preview */}
              {showDraftPreview && newHtml.trim() && (
                <div className="border border-sky-500/20 rounded-xl overflow-hidden">
                  <div className="bg-sky-500/8 px-4 py-2 border-b border-sky-500/15 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs text-sky-400">معاينة مباشرة</p>
                  </div>
                  <StoryPreview html={newHtml} />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => { setShowAddForm(false); setShowDraftPreview(false); }}
                  className="text-white/50 hover:text-white">
                  إلغاء
                </Button>
                <Button onClick={handleAdd} disabled={saving}
                  className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  حفظ القصة
                </Button>
              </div>
            </div>
          )}

          {/* Stories list */}
          {storiesLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">جاري التحميل…</span>
            </div>
          ) : stories.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">لا توجد قصص لهذه الوحدة بعد.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((s, idx) => (
                <div key={s.id}
                  className="flex items-stretch gap-2 bg-white/[0.03] border border-white/8 rounded-xl overflow-hidden">

                  {/* Reorder */}
                  <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 bg-white/[0.02] border-l border-white/5">
                    <button onClick={() => handleMove(idx, "up")} disabled={idx === 0}
                      className="p-1 text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleMove(idx, "down")} disabled={idx === stories.length - 1}
                      className="p-1 text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-sm font-medium text-white truncate">{s.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/30 font-mono">
                      <span>ترتيب: {s.sortOrder}</span>
                      <span>{formatSize(s.html_size)}</span>
                      <span>{new Date(s.created_at).toLocaleDateString("ar-YE")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-3">
                    <button
                      onClick={() => handleCopy(s.id)}
                      disabled={copyingId === s.id}
                      className="p-1.5 rounded-lg text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                      title="نسخ الكود"
                    >
                      {copyingId === s.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : copiedId === s.id
                          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                          : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (editingId === s.id) { setEditingId(null); setEditShowPreview(false); }
                        else handleEditStart(s);
                      }}
                      disabled={editLoading}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                        editingId === s.id
                          ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25"
                          : "text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
                      }`}
                      title={editingId === s.id ? "إغلاق التعديل" : "تعديل"}
                    >
                      {editLoading && editingId === null
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : editingId === s.id
                          ? <X className="w-3.5 h-3.5" />
                          : <Pencil className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => openPreview(s.id)}
                      disabled={previewLoading === s.id}
                      className="p-1.5 rounded-lg text-sky-400/60 hover:text-sky-400 hover:bg-sky-500/10 transition-colors disabled:opacity-40"
                      title="معاينة"
                    >
                      {previewLoading === s.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                      title="حذف"
                    >
                      {deletingId === s.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit panel */}
          {editingId !== null && (
            <div className="border border-amber-500/30 rounded-2xl overflow-hidden mt-2">
              <div className="bg-amber-500/8 px-4 py-2.5 border-b border-amber-500/15 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs text-amber-300 font-medium">
                  تعديل: {stories.find((s) => s.id === editingId)?.title}
                </p>
                <button
                  onClick={() => { setEditingId(null); setEditShowPreview(false); }}
                  className="mr-auto text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">عنوان القصة</Label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                  />
                </div>

                {/* Sort order */}
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">ترتيب العرض</Label>
                  <input
                    type="number"
                    value={editSortOrder}
                    onChange={(e) => setEditSortOrder(Number(e.target.value))}
                    className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40"
                  />
                </div>

                {/* HTML */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/60 text-xs flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5" /> كود HTML
                    </Label>
                    <button
                      onClick={() => setEditShowPreview((v) => !v)}
                      disabled={!editHtml.trim()}
                      className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-30 transition-colors"
                    >
                      {editShowPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {editShowPreview ? "إخفاء المعاينة" : "معاينة مباشرة"}
                    </button>
                  </div>
                  <textarea
                    value={editHtml}
                    onChange={(e) => setEditHtml(e.target.value)}
                    rows={12}
                    dir="ltr"
                    className="w-full bg-[#000d1a] border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-sky-200 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-y"
                    style={{ minHeight: "220px" }}
                  />
                  <p className="text-[10px] text-white/25 font-mono">
                    {editHtml.length > 0 ? `${(editHtml.length / 1024).toFixed(1)} KB` : ""}
                  </p>
                </div>

                {/* Live preview */}
                {editShowPreview && editHtml.trim() && (
                  <div className="border border-sky-500/20 rounded-xl overflow-hidden">
                    <div className="bg-sky-500/8 px-4 py-2 border-b border-sky-500/15 flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <p className="text-xs text-sky-400">معاينة مباشرة</p>
                    </div>
                    <StoryPreview html={editHtml} />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    variant="ghost"
                    onClick={() => { setEditingId(null); setEditShowPreview(false); }}
                    className="text-white/50 hover:text-white"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleEditSave}
                    disabled={editSaving}
                    className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
                  >
                    {editSaving
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />}
                    حفظ التعديلات
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Preview panel */}
          {previewHtml !== null && (
            <div className="border border-amber-500/20 rounded-2xl overflow-hidden mt-4">
              <div className="bg-amber-500/8 px-4 py-2.5 border-b border-amber-500/15 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-xs text-amber-300 font-medium">معاينة القصة</p>
                <button onClick={() => setPreviewHtml(null)}
                  className="mr-auto text-white/30 hover:text-white/60 text-xs transition-colors">
                  ✕ إغلاق
                </button>
              </div>
              <StoryPreview html={previewHtml} />
            </div>
          )}
        </div>
      )}

      {!selectedSpecialty && (
        <div className="py-12 text-center">
          <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">اختر تخصصاً ووحدة لإدارة قصصها.</p>
        </div>
      )}
    </div>
  );
}
