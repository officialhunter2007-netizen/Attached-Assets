// ─────────────────────────────────────────────────────────────────────────────
// Admin Podcasts Manager
//
// Lets admins attach audio podcast episodes to any curriculum unit.
// Workflow:
//   1. Pick specialty → unit populates automatically
//   2. Pick unit
//   3. Add a podcast: title + (file upload OR external URL) + position
//   4. Reorder / delete existing podcasts
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Headphones, Plus, Trash2, Loader2, Upload, Link,
  ArrowUp, ArrowDown, Play, Pause, Search,
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
  lab_count: number;
};

type Podcast = {
  id: number;
  specialty_id: string;
  unit_code: string;
  title: string;
  audio_url: string | null;
  audio_filename: string | null;
  audioSrc: string;
  sortOrder: number;
  created_at: string;
};

// ── Inline mini audio player ──────────────────────────────────────────────────
function MiniPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggle = () => {
    if (!ref.current) return;
    if (playing) ref.current.pause();
    else ref.current.play();
  };

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCur(ref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDur(ref.current?.duration ?? 0)}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full bg-violet-500/80 hover:bg-violet-500 flex items-center justify-center shrink-0 transition-colors"
      >
        {playing ? (
          <Pause className="w-3 h-3 text-white fill-white" />
        ) : (
          <Play className="w-3 h-3 text-white fill-white" />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <input
          type="range"
          min={0}
          max={dur || 1}
          value={cur}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = parseFloat(e.target.value);
          }}
          className="w-full h-1 accent-violet-400 cursor-pointer"
        />
        <div className="text-[9px] text-white/40 tabular-nums">
          {fmt(cur)} / {fmt(dur)}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminPodcasts() {
  const { toast } = useToast();

  // Specialty picker
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);

  // Unit picker
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitInfo | null>(null);
  const [unitSearch, setUnitSearch] = useState("");
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Podcasts for selected unit
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addSourceType, setAddSourceType] = useState<"file" | "url">("file");
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addUrl, setAddUrl] = useState("");
  const [addSortOrder, setAddSortOrder] = useState<number>(0);
  const [isAdding, setIsAdding] = useState(false);

  // Deleting
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Reordering
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const filteredSpecialties = allSubjectsFlat.filter((s) =>
    !specialtySearch || s.name.includes(specialtySearch) || s.id.includes(specialtySearch),
  );

  const filteredUnits = units.filter((u) =>
    !unitSearch ||
    u.name.includes(unitSearch) ||
    u.code.includes(unitSearch) ||
    u.stage_name.includes(unitSearch),
  );

  // Group filtered units by stage for the picker
  const unitsByStage: { stageIndex: number; stageName: string; units: UnitInfo[] }[] = [];
  for (const u of filteredUnits) {
    const group = unitsByStage.find((g) => g.stageIndex === u.stage_index);
    if (group) {
      group.units.push(u);
    } else {
      unitsByStage.push({ stageIndex: u.stage_index, stageName: u.stage_name, units: [u] });
    }
  }
  unitsByStage.sort((a, b) => a.stageIndex - b.stageIndex);

  // ── Fetch units when specialty changes ──────────────────────────────────────
  useEffect(() => {
    if (!selectedSpecialty) { setUnits([]); setSelectedUnit(null); setPodcasts([]); return; }
    setLoadingUnits(true);
    setSelectedUnit(null);
    setPodcasts([]);
    fetch(`/api/admin/v4/units?specialtyId=${encodeURIComponent(selectedSpecialty.id)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => setUnits(Array.isArray(data) ? data : []))
      .catch(() => toast({ variant: "destructive", title: "تعذّر تحميل الوحدات" }))
      .finally(() => setLoadingUnits(false));
  }, [selectedSpecialty]);

  // ── Fetch podcasts when unit changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedSpecialty || !selectedUnit) { setPodcasts([]); return; }
    setLoadingPodcasts(true);
    fetch(
      `/api/admin/v4/podcasts?specialtyId=${encodeURIComponent(selectedSpecialty.id)}&unitCode=${encodeURIComponent(selectedUnit.code)}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((data) => setPodcasts(Array.isArray(data) ? data : []))
      .catch(() => toast({ variant: "destructive", title: "تعذّر تحميل البودكاستات" }))
      .finally(() => setLoadingPodcasts(false));
  }, [selectedSpecialty, selectedUnit]);

  // ── Sort-order position label ──────────────────────────────────────────────
  function positionLabel(order: number, unit: UnitInfo | null): string {
    if (!unit) return `موضع ${order}`;
    if (order <= 0) return "في البداية (قبل الدروس)";
    const lc = parseInt(String(unit.lesson_count), 10);
    if (order > lc) return `في النهاية (بعد الدروس والمعامل)`;
    return `بعد الدرس ${Math.floor(order)}`;
  }

  // ── Position dropdown options ─────────────────────────────────────────────
  function positionOptions(unit: UnitInfo | null) {
    const opts = [{ value: 0, label: "في البداية (قبل الدروس)" }];
    if (unit) {
      const lc = parseInt(String(unit.lesson_count), 10);
      for (let i = 1; i <= lc; i++) {
        opts.push({ value: i, label: `بعد الدرس ${i}` });
      }
    }
    opts.push({ value: 999, label: "في النهاية (بعد الدروس والمعامل)" });
    return opts;
  }

  // ── Add podcast ────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!selectedSpecialty || !selectedUnit) return;
    if (!addTitle.trim()) { toast({ variant: "destructive", title: "أدخل عنوان البودكاست" }); return; }
    if (addSourceType === "file" && !addFile) { toast({ variant: "destructive", title: "اختر ملفاً صوتياً" }); return; }
    if (addSourceType === "url" && !addUrl.trim()) { toast({ variant: "destructive", title: "أدخل رابط البودكاست" }); return; }

    setIsAdding(true);
    try {
      const formData = new FormData();
      formData.append("specialtyId", selectedSpecialty.id);
      formData.append("unitCode", selectedUnit.code);
      formData.append("title", addTitle.trim());
      formData.append("sortOrder", String(addSortOrder));
      if (addSourceType === "file" && addFile) {
        formData.append("audio", addFile);
      } else if (addSourceType === "url") {
        formData.append("audioUrl", addUrl.trim());
      }

      const r = await fetch("/api/admin/v4/podcasts", {
        method: "POST",
        credentials: "include",
        headers: CSRF,
        body: formData,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);

      setPodcasts((prev) => [...prev, j].sort((a, b) => a.sortOrder - b.sortOrder));
      setAddTitle("");
      setAddFile(null);
      setAddUrl("");
      setAddSortOrder(0);
      setShowAddForm(false);
      toast({ title: "تم إضافة البودكاست ✓", className: "bg-emerald-600 border-none text-white" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل الإضافة", description: e?.message });
    } finally {
      setIsAdding(false);
    }
  }

  // ── Delete podcast ─────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const r = await fetch(`/api/admin/v4/podcasts/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: CSRF,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPodcasts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "تم حذف البودكاست", className: "bg-rose-600 border-none text-white" });
    } catch {
      toast({ variant: "destructive", title: "فشل الحذف" });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Reorder: move up ───────────────────────────────────────────────────────
  async function moveUp(podcast: Podcast, index: number) {
    if (index === 0) return;
    const prev = podcasts[index - 1];
    const newOrder = Math.max(0, prev.sortOrder - 0.5);
    setReorderingId(podcast.id);
    try {
      await fetch(`/api/admin/v4/podcasts/${podcast.id}/order`, {
        method: "PATCH",
        credentials: "include",
        headers: { ...CSRF, "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      setPodcasts((ps) =>
        ps
          .map((p) => (p.id === podcast.id ? { ...p, sortOrder: newOrder } : p))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    } catch {
      toast({ variant: "destructive", title: "فشل إعادة الترتيب" });
    } finally {
      setReorderingId(null);
    }
  }

  // ── Reorder: move down ─────────────────────────────────────────────────────
  async function moveDown(podcast: Podcast, index: number) {
    if (index === podcasts.length - 1) return;
    const next = podcasts[index + 1];
    const newOrder = next.sortOrder + 0.5;
    setReorderingId(podcast.id);
    try {
      await fetch(`/api/admin/v4/podcasts/${podcast.id}/order`, {
        method: "PATCH",
        credentials: "include",
        headers: { ...CSRF, "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      setPodcasts((ps) =>
        ps
          .map((p) => (p.id === podcast.id ? { ...p, sortOrder: newOrder } : p))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    } catch {
      toast({ variant: "destructive", title: "فشل إعادة الترتيب" });
    } finally {
      setReorderingId(null);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-violet-300" />
        </div>
        <div>
          <h2 className="text-lg font-black">بودكاستات الوحدات</h2>
          <p className="text-xs text-muted-foreground">أضف تسجيلات صوتية تشرح محتوى الوحدات</p>
        </div>
      </div>

      {/* ── Pickers row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Specialty picker */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">التخصص</Label>
          <div className="relative">
            <button
              onClick={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-right hover:border-white/20 transition-colors"
            >
              {selectedSpecialty ? (
                <>
                  <span>{selectedSpecialty.emoji}</span>
                  <span className="flex-1 truncate">{selectedSpecialty.name}</span>
                </>
              ) : (
                <span className="flex-1 text-muted-foreground">اختر تخصصاً...</span>
              )}
            </button>
            {showSpecialtyPicker && (
              <div className="absolute z-50 top-full mt-1 w-full bg-black/95 border border-white/10 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="بحث..."
                    className="pr-8 h-8 text-xs bg-black/60"
                    value={specialtySearch}
                    onChange={(e) => setSpecialtySearch(e.target.value)}
                  />
                </div>
                {filteredSpecialties.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSpecialty(s);
                      setShowSpecialtyPicker(false);
                      setSpecialtySearch("");
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-sm text-right"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unit picker */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">الوحدة</Label>
          <div className="relative">
            <button
              onClick={() => { if (selectedSpecialty && units.length) setShowUnitPicker(!showUnitPicker); }}
              disabled={!selectedSpecialty || loadingUnits}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-right hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingUnits ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></>
              ) : selectedUnit ? (
                <span className="flex-1 truncate">{selectedUnit.code} — {selectedUnit.name}</span>
              ) : (
                <span className="flex-1 text-muted-foreground">
                  {selectedSpecialty ? "اختر وحدة..." : "اختر تخصصاً أولاً"}
                </span>
              )}
            </button>
            {showUnitPicker && (
              <div className="absolute z-50 top-full mt-1 w-full bg-black/95 border border-white/10 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="بحث عن وحدة..."
                    className="pr-8 h-8 text-xs bg-black/60"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                  />
                </div>
                {unitsByStage.map((group) => (
                  <div key={group.stageIndex}>
                    {/* Stage header */}
                    <div className="px-2.5 py-1 mt-1 first:mt-0 flex items-center gap-2">
                      <div className="h-px flex-1 bg-white/8" />
                      <span className="text-[9px] font-black tracking-widest text-violet-300/60 uppercase whitespace-nowrap">
                        المرحلة {group.stageIndex} — {group.stageName}
                      </span>
                      <div className="h-px flex-1 bg-white/8" />
                    </div>
                    {group.units.map((u) => (
                      <button
                        key={u.code}
                        onClick={() => {
                          setSelectedUnit(u);
                          setShowUnitPicker(false);
                          setUnitSearch("");
                          setAddSortOrder(0);
                        }}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 text-sm text-right"
                      >
                        <span className="font-mono text-[10px] text-white/30 shrink-0 w-5 text-center">{u.unit_index}</span>
                        <span className="flex-1 truncate">{u.name}</span>
                        <span className="text-[10px] text-white/30 shrink-0">{u.lesson_count} درس</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Selected unit info + Add button ── */}
      {selectedUnit && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/10 border border-violet-400/20">
          <div>
            <p className="text-xs font-bold text-violet-300">{selectedUnit.code} — {selectedUnit.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {selectedUnit.lesson_count} درس · {selectedUnit.lab_count} معمل
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-violet-500/80 hover:bg-violet-500 text-white border-none text-xs"
          >
            <Plus className="w-3.5 h-3.5 ml-1" />
            إضافة بودكاست
          </Button>
        </div>
      )}

      {/* ── Add form ── */}
      {showAddForm && selectedUnit && (
        <div className="p-4 rounded-2xl bg-black/40 border border-violet-500/30 space-y-4">
          <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
            <Plus className="w-4 h-4" /> إضافة بودكاست جديد
          </h3>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">عنوان البودكاست</Label>
            <Input
              placeholder="مثال: نقاش حول المفاهيم الأساسية في الوحدة"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="bg-black/60 border-white/10"
            />
          </div>

          {/* Source type toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs">مصدر الصوت</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setAddSourceType("file")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                  addSourceType === "file"
                    ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> رفع ملف
              </button>
              <button
                onClick={() => setAddSourceType("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                  addSourceType === "url"
                    ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                <Link className="w-3.5 h-3.5" /> رابط خارجي
              </button>
            </div>
          </div>

          {/* File input */}
          {addSourceType === "file" && (
            <div className="space-y-1.5">
              <Label className="text-xs">الملف الصوتي (MP3, WAV, M4A...)</Label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-violet-500/30 file:text-violet-200 hover:file:bg-violet-500/50 cursor-pointer"
              />
              {addFile && (
                <p className="text-[11px] text-violet-300/70">
                  {addFile.name} ({(addFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>
          )}

          {/* URL input */}
          {addSourceType === "url" && (
            <div className="space-y-1.5">
              <Label className="text-xs">رابط البودكاست</Label>
              <Input
                dir="ltr"
                placeholder="https://..."
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                className="bg-black/60 border-white/10 text-left"
              />
              <p className="text-[10px] text-white/30">
                يمكن أن يكون رابط MP3 مباشراً أو رابط SoundCloud أو أي مشغّل صوتي تضمين.
              </p>
            </div>
          )}

          {/* Position */}
          <div className="space-y-1.5">
            <Label className="text-xs">الموضع في الوحدة</Label>
            <select
              value={addSortOrder}
              onChange={(e) => setAddSortOrder(parseFloat(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-sm text-white focus:outline-none focus:border-violet-400/50"
            >
              {positionOptions(selectedUnit).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAdd}
              disabled={isAdding}
              className="flex-1 bg-violet-500/80 hover:bg-violet-500 text-white border-none font-bold"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Plus className="w-4 h-4 ml-1" />}
              {isAdding ? "جاري الإضافة..." : "إضافة"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
              className="border-white/10"
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* ── Podcast list ── */}
      {selectedUnit && (
        <div className="space-y-2">
          {loadingPodcasts ? (
            <div className="flex items-center justify-center py-8 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              <span className="text-sm">جاري تحميل البودكاستات...</span>
            </div>
          ) : podcasts.length === 0 ? (
            <div className="py-10 text-center">
              <Headphones className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">لا يوجد بودكاست لهذه الوحدة بعد.</p>
              <p className="text-xs text-white/20 mt-1">اضغط "إضافة بودكاست" للبدء.</p>
            </div>
          ) : (
            podcasts.map((p, idx) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-black/40 border border-violet-500/20 hover:border-violet-500/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Drag handles */}
                  <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                    <button
                      onClick={() => moveUp(p, idx)}
                      disabled={idx === 0 || reorderingId === p.id}
                      className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3 text-white/50" />
                    </button>
                    <button
                      onClick={() => moveDown(p, idx)}
                      disabled={idx === podcasts.length - 1 || reorderingId === p.id}
                      className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3 h-3 text-white/50" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-violet-500/25 border border-violet-400/30 flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4 text-violet-300" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white/90 truncate">{p.title}</p>
                        <p className="text-[10px] text-violet-300/60 mt-0.5">
                          {positionLabel(p.sortOrder, selectedUnit)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.audio_filename && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                            ملف
                          </span>
                        )}
                        {p.audio_url && !p.audio_filename && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/20">
                            رابط
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="p-1.5 rounded-lg text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mini player */}
                    {p.audioSrc && (
                      <div className="mt-2">
                        {p.audio_filename ? (
                          <MiniPlayer src={p.audioSrc} />
                        ) : (
                          <a
                            href={p.audioSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-400 hover:underline truncate block"
                            dir="ltr"
                          >
                            {p.audioSrc}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!selectedSpecialty && (
        <div className="py-12 text-center">
          <Headphones className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">اختر تخصصاً ووحدة لإدارة بودكاستاتها.</p>
        </div>
      )}
    </div>
  );
}
