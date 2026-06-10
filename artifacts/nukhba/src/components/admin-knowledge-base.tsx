import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Eye, Upload, GripVertical,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, X,
  BookOpen, FileText,
} from "lucide-react";
import { university, skills } from "@/lib/curriculum";

const allSubjectsFlat = [
  ...university.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji ?? "📚" })),
  ...skills.flatMap((cat) =>
    cat.subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji ?? "🔧" })),
  ),
];

interface LevelInfo {
  level: number;
  uploaded: boolean;
  fileName?: string;
  wordCount?: number;
  uploadedAt?: string;
}

interface Module {
  id: number;
  subjectId: string;
  moduleName: string;
  moduleNameAr: string;
  moduleOrder: number;
  descriptionAr?: string | null;
  isComplete: boolean;
  uploadedLevels: number;
  levels: LevelInfo[];
  createdAt: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "المستوى 1 — مبتدئ",
  2: "المستوى 2 — متوسط منخفض",
  3: "المستوى 3 — متوسط",
  4: "المستوى 4 — متقدم",
  5: "المستوى 5 — خبير",
};

export function AdminKnowledgeBase() {
  const { toast } = useToast();
  const [selectedSubjectId, setSelectedSubjectId] = useState(allSubjectsFlat[0]?.id ?? "");
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newModuleNameAr, setNewModuleNameAr] = useState("");
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [previewContent, setPreviewContent] = useState<{ level: number; content: string; fileName: string } | null>(null);
  const [uploadingLevel, setUploadingLevel] = useState<number | null>(null);
  const [editingModule, setEditingModule] = useState<{ id: number; nameAr: string } | null>(null);

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const fetchModules = async (subjectId: string) => {
    if (!subjectId) return;
    setIsLoading(true);
    try {
      const r = await fetch(`/api/admin/knowledge/modules?subjectId=${encodeURIComponent(subjectId)}`);
      const data = await r.json();
      const list: Module[] = data?.data ?? [];
      setModules(list);
      // Re-select if current selection still valid
      if (selectedModule) {
        const refreshed = list.find((m) => m.id === selectedModule.id) ?? null;
        setSelectedModule(refreshed);
      }
    } catch {
      toast({ title: "خطأ في تحميل الوحدات", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedModule(null);
    fetchModules(selectedSubjectId);
  }, [selectedSubjectId]);

  // ── Create module ──────────────────────────────────────────────────────────
  const handleCreateModule = async () => {
    if (!newModuleNameAr.trim()) {
      toast({ title: "الاسم العربي مطلوب", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const r = await fetch("/api/admin/knowledge/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          moduleName: newModuleName.trim() || newModuleNameAr.trim(),
          moduleNameAr: newModuleNameAr.trim(),
          descriptionAr: newModuleDesc.trim() || null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err?.error ?? "فشل الإنشاء");
      }
      toast({ title: "تم إنشاء الوحدة بنجاح" });
      setShowCreateForm(false);
      setNewModuleNameAr("");
      setNewModuleName("");
      setNewModuleDesc("");
      await fetchModules(selectedSubjectId);
    } catch (err: any) {
      toast({ title: err?.message ?? "خطأ", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // ── Delete module ──────────────────────────────────────────────────────────
  const handleDeleteModule = async (mod: Module) => {
    if (!confirm(`هل تريد حذف الوحدة "${mod.moduleNameAr}" وكل ملفاتها؟`)) return;
    try {
      await fetch(`/api/admin/knowledge/modules/${mod.id}`, { method: "DELETE" });
      toast({ title: "تم حذف الوحدة" });
      if (selectedModule?.id === mod.id) setSelectedModule(null);
      await fetchModules(selectedSubjectId);
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  // ── Upload level file ──────────────────────────────────────────────────────
  const handleFileUpload = (mod: Module, level: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingLevel(level);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (!content || content.trim().length < 200) {
          toast({ title: "الملف قصير جداً (أقل من 200 حرف)", variant: "destructive" });
          setUploadingLevel(null);
          return;
        }
        if (content.length > 50_000) {
          toast({ title: "الملف كبير جداً (أكثر من 50,000 حرف)", variant: "destructive" });
          setUploadingLevel(null);
          return;
        }
        try {
          const r = await fetch(`/api/admin/knowledge/modules/${mod.id}/levels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level, fileName: file.name, content }),
          });
          if (!r.ok) {
            const err = await r.json();
            throw new Error(err?.error ?? "فشل الرفع");
          }
          toast({ title: `تم رفع المستوى ${level} بنجاح` });
          await fetchModules(selectedSubjectId);
        } catch (err: any) {
          toast({ title: err?.message ?? "خطأ في الرفع", variant: "destructive" });
        } finally {
          setUploadingLevel(null);
        }
      };
      reader.readAsText(file, "utf-8");
    };
    input.click();
  };

  // ── Delete level file ──────────────────────────────────────────────────────
  const handleDeleteLevel = async (mod: Module, level: number) => {
    if (!confirm(`هل تريد حذف ملف المستوى ${level}؟`)) return;
    try {
      await fetch(`/api/admin/knowledge/modules/${mod.id}/levels/${level}`, { method: "DELETE" });
      toast({ title: `تم حذف المستوى ${level}` });
      await fetchModules(selectedSubjectId);
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  // ── Preview level file ─────────────────────────────────────────────────────
  const handlePreview = async (mod: Module, level: number) => {
    try {
      const r = await fetch(`/api/admin/knowledge/modules/${mod.id}/levels/${level}/preview`);
      const data = await r.json();
      setPreviewContent({
        level,
        content: data?.data?.content ?? "",
        fileName: data?.data?.fileName ?? `level${level}.txt`,
      });
    } catch {
      toast({ title: "فشل تحميل المعاينة", variant: "destructive" });
    }
  };

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => { dragIndexRef.current = index; };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const from = dragIndexRef.current;
    if (from === null || from === dropIndex) return;
    const reordered = [...modules];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setModules(reordered);
    dragIndexRef.current = null;
    try {
      await fetch("/api/admin/knowledge/modules/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((m) => m.id) }),
      });
    } catch {
      toast({ title: "فشل إعادة الترتيب", variant: "destructive" });
    }
  };

  const selectedSubject = allSubjectsFlat.find((s) => s.id === selectedSubjectId);
  const selectedModuleData = selectedModule
    ? (modules.find((m) => m.id === selectedModule.id) ?? selectedModule)
    : null;

  return (
    <div className="space-y-4">
      {/* Subject selector */}
      <div className="flex items-center gap-3">
        <Label className="text-white/70 whitespace-nowrap">التخصص:</Label>
        <div className="relative flex-1 max-w-xs">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-[hsl(222,24%,10%)] border border-white/10 text-white rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:border-amber-500/50"
          >
            {allSubjectsFlat.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
        <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
          {modules.filter((m) => m.isComplete).length}/{modules.length} وحدة مكتملة
        </Badge>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[500px]">

        {/* Left: Module list */}
        <div className="bg-[hsl(222,24%,8%)] border border-white/8 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 font-medium">الوحدات</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-amber-400 hover:bg-amber-500/10 text-xs"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Plus className="w-3 h-3 ml-1" /> وحدة جديدة
            </Button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="bg-[hsl(222,24%,12%)] border border-amber-500/20 rounded-lg p-3 space-y-2 mb-2">
              <Input
                placeholder="الاسم بالعربية *"
                value={newModuleNameAr}
                onChange={(e) => setNewModuleNameAr(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
                dir="rtl"
              />
              <Input
                placeholder="الاسم بالإنجليزية (اختياري)"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
              />
              <Input
                placeholder="وصف (اختياري)"
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm h-8"
                dir="rtl"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black flex-1" onClick={handleCreateModule} disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : "إنشاء"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreateForm(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد وحدات بعد
            </div>
          ) : (
            <div className="space-y-1">
              {modules.map((mod, index) => (
                <div
                  key={mod.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedModule?.id === mod.id
                      ? "bg-amber-500/15 border border-amber-500/30"
                      : dragOverIndex === index
                      ? "bg-white/10 border border-white/20"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                  onClick={() => setSelectedModule(mod)}
                >
                  <GripVertical className="w-3 h-3 text-white/20 flex-shrink-0 cursor-grab" />
                  {mod.isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-white flex-1 truncate" dir="rtl">
                    {mod.moduleNameAr}
                  </span>
                  <span className="text-[10px] text-white/30 flex-shrink-0">{mod.uploadedLevels}/5</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Module detail */}
        <div className="bg-[hsl(222,24%,8%)] border border-white/8 rounded-xl p-4">
          {!selectedModuleData ? (
            <div className="flex flex-col items-center justify-center h-full text-white/25 gap-3">
              <FileText className="w-12 h-12" />
              <p className="text-sm">اختر وحدة لعرض تفاصيلها</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-white font-semibold text-lg" dir="rtl">
                    {selectedModuleData.moduleNameAr}
                  </h3>
                  {selectedModuleData.moduleName && selectedModuleData.moduleName !== selectedModuleData.moduleNameAr && (
                    <p className="text-white/40 text-sm">{selectedModuleData.moduleName}</p>
                  )}
                  {selectedModuleData.descriptionAr && (
                    <p className="text-white/50 text-xs mt-1" dir="rtl">{selectedModuleData.descriptionAr}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedModuleData.isComplete ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">مكتملة ✓</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                      {selectedModuleData.uploadedLevels}/5 مستويات
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteModule(selectedModuleData)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Level files */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium">ملفات المستويات (5 مستويات مطلوبة)</p>
                {selectedModuleData.levels.map((lvl) => (
                  <div
                    key={lvl.level}
                    className="flex items-center gap-3 p-3 bg-[hsl(222,28%,7%)] border border-white/5 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-24 text-xs text-white/50 text-right" dir="rtl">
                      {LEVEL_LABELS[lvl.level]}
                    </div>

                    {lvl.uploaded ? (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-white/80 truncate">{lvl.fileName}</span>
                          <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] px-1">
                            {lvl.wordCount?.toLocaleString()} كلمة
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-white/60 hover:text-white"
                            onClick={() => handlePreview(selectedModuleData, lvl.level)}
                          >
                            <Eye className="w-3 h-3 ml-1" /> معاينة
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => handleFileUpload(selectedModuleData, lvl.level)}
                            title="استبدال الملف"
                          >
                            <Upload className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteLevel(selectedModuleData, lvl.level)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-xs text-white/30 italic">لم يُرفع بعد</span>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20"
                          onClick={() => handleFileUpload(selectedModuleData, lvl.level)}
                          disabled={uploadingLevel === lvl.level}
                        >
                          {uploadingLevel === lvl.level ? (
                            <Loader2 className="w-3 h-3 animate-spin ml-1" />
                          ) : (
                            <Upload className="w-3 h-3 ml-1" />
                          )}
                          رفع ملف .txt
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-2xl bg-[hsl(222,24%,10%)] border-white/10 text-white max-h-[80vh] overflow-hidden flex flex-col">
          <DialogTitle className="text-right" dir="rtl">
            معاينة: {previewContent?.fileName}
          </DialogTitle>
          <div className="overflow-y-auto flex-1 mt-2">
            <pre
              className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-sans p-1"
              dir="auto"
              style={{ fontFamily: "inherit" }}
            >
              {previewContent?.content}
            </pre>
          </div>
          <div className="pt-3 flex justify-end">
            <Button variant="ghost" onClick={() => setPreviewContent(null)} className="text-white/60">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminKnowledgeBase;
