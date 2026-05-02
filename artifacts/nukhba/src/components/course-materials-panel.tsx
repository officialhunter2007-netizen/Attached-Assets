import { useState, useEffect, useRef } from "react";
import { Upload, X, FileText, Loader2, AlertCircle, CheckCircle2, Trash2, BookOpen, ChevronDown, ChevronLeft, RotateCcw, Circle, Play, SkipForward } from "lucide-react";

export interface MaterialProgress {
  chaptersTotal: number;
  completedCount: number;
  currentChapterIndex: number;
  currentChapterTitle: string | null;
  chapters?: string[];
  completedChapterIndices?: number[];
  skippedChapterIndices?: number[];
}

export interface Material {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  status: "processing" | "ready" | "error";
  errorMessage: string | null;
  pageCount: number;
  language: string | null;
  summary: string | null;
  starters: string | null;
  createdAt: string;
  progress?: MaterialProgress | null;
  coverageStatus?: "ok" | "partial" | "failed" | null;
  role?: "primary" | "reference" | null;
}

export function CourseMaterialsPanel({
  subjectId,
  open,
  onClose,
  activeMaterialId,
  onActiveChange,
}: {
  subjectId: string;
  open: boolean;
  onClose: () => void;
  activeMaterialId: number | null;
  onActiveChange: (id: number | null) => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [busyChapter, setBusyChapter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const callProgress = async (materialId: number, body: Record<string, unknown>, busyKey: string) => {
    setBusyChapter(busyKey);
    setError(null);
    try {
      const r = await fetch(`/api/materials/${materialId}/progress`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        setError("تعذّر تحديث التقدّم — حاول مرة أخرى.");
      } else {
        const data = await r.json();
        // Optimistically merge into state so the UI reflects the change immediately.
        setMaterials((prev) => prev.map((m) => {
          if (m.id !== materialId) return m;
          const chapters: string[] = data.chapters ?? m.progress?.chapters ?? [];
          const completed: number[] = data.completedChapterIndices ?? [];
          const skipped: number[] = data.skippedChapterIndices ?? [];
          return {
            ...m,
            progress: {
              chaptersTotal: chapters.length,
              completedCount: completed.length,
              currentChapterIndex: data.currentChapterIndex ?? 0,
              currentChapterTitle: chapters[data.currentChapterIndex] ?? null,
              chapters,
              completedChapterIndices: completed,
              skippedChapterIndices: skipped,
            },
          };
        }));
      }
    } catch {
      setError("تعذّر تحديث التقدّم — حاول مرة أخرى.");
    }
    setBusyChapter(null);
  };

  const handleSetCurrent = (materialId: number, chapterIndex: number) =>
    callProgress(materialId, { action: "set", chapterIndex }, `${materialId}:set:${chapterIndex}`);

  const handleToggleComplete = (materialId: number, chapterIndex: number, currentlyCompleted: boolean) =>
    callProgress(
      materialId,
      { action: currentlyCompleted ? "uncomplete" : "complete", chapterIndex },
      `${materialId}:complete:${chapterIndex}`,
    );

  const handleResetProgress = async (materialId: number) => {
    if (!confirm("سيُعيد هذا تقدّمك في هذا الملف إلى الفصل الأول ويمسح كل العلامات. هل تريد المتابعة؟")) return;
    await callProgress(materialId, { action: "reset" }, `${materialId}:reset`);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/materials?subjectId=${encodeURIComponent(subjectId)}`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setMaterials(data.materials || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open, subjectId]);

  // Auto-poll while any material is still processing — with a hard cap so we
  // don't keep hammering the server forever if a worker dies.
  useEffect(() => {
    if (!open) return;
    const anyProcessing = materials.some((m) => m.status === "processing");
    if (!anyProcessing) return;
    let polls = 0;
    const MAX_POLLS = 90; // ~6 minutes at 4s each
    const t = setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) { clearInterval(t); return; }
      refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [open, materials]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("الملف يجب أن يكون PDF فقط.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("حجم الملف يتجاوز 50 ميغابايت.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      // Single-step server-proxied multipart upload. Replaces the old
      // (request signed URL → PUT to GCS → finalize) flow which fails in
      // deployment because the object-storage sidecar refuses to sign write
      // URLs. The server now streams the file straight into the bucket using
      // the GCS SDK (sidecar /token auth path, which works in deployment).
      const form = new FormData();
      form.append("subjectId", subjectId);
      form.append("file", file, file.name);

      const result = await new Promise<{ ok: boolean; status: number; data: any }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // subjectId is duplicated in the query string so the server can run
        // its auth + quota gate BEFORE buffering the multipart body.
        xhr.open("POST", `/api/materials/upload?subjectId=${encodeURIComponent(subjectId)}`, true);
        xhr.withCredentials = true;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          let parsed: any = {};
          try { parsed = JSON.parse(xhr.responseText || "{}"); } catch {}
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data: parsed });
        };
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(form);
      });

      if (!result.ok) {
        const data = result.data ?? {};
        if (data.error === "QUOTA_EXCEEDED") {
          setError(data.scope === "free_total"
            ? "أنت في الفترة التجريبية: ملف PDF واحد فقط مسموح. اشترك في المادة لرفع حتى 4 ملفات."
            : `وصلت للحد الأقصى (${data.limit ?? 4} ملفات لهذه المادة). احذف ملفاً قديماً لرفع جديد.`);
        } else if (data.error === "FILE_TOO_LARGE") {
          setError("الملف أكبر من المسموح (50MB).");
        } else if (data.error === "INVALID_FILE_TYPE") {
          setError("الملف يجب أن يكون PDF فقط.");
        } else if (result.status === 401) {
          setError("الجلسة منتهية — أعد تسجيل الدخول ثم حاول مجدداً.");
        } else {
          setError("تعذّر رفع الملف — حاول مرة أخرى.");
        }
      } else {
        const created = result.data;
        // Set this new material as the active one for this subject (if none selected yet).
        if (!activeMaterialId && created?.id) onActiveChange(created.id);
        await refresh();
      }
    } catch (e: any) {
      setError("حدث خطأ أثناء الرفع.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا الملف نهائياً؟")) return;
    try {
      await fetch(`/api/materials/${id}`, { method: "DELETE", credentials: "include" });
      if (activeMaterialId === id) onActiveChange(null);
      await refresh();
    } catch {}
  };

  const handleSetRole = async (id: number, role: "primary" | "reference") => {
    setBusyChapter(`${id}:role:${role}`);
    setError(null);
    try {
      const r = await fetch(`/api/materials/${id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) setError("تعذّر تغيير دور الملف.");
      else await refresh();
    } catch {
      setError("تعذّر تغيير دور الملف.");
    }
    setBusyChapter(null);
  };

  const handleRetryOcr = async (id: number) => {
    setBusyChapter(`${id}:retry-ocr`);
    setError(null);
    try {
      const r = await fetch(`/api/materials/${id}/retry-ocr`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        setError("تعذّر إعادة معالجة الصفحات الناقصة — حاول لاحقاً.");
      } else {
        await refresh();
      }
    } catch {
      setError("تعذّر إعادة معالجة الصفحات الناقصة — حاول لاحقاً.");
    }
    setBusyChapter(null);
  };

  const handleActivate = async (id: number) => {
    onActiveChange(id);
    try {
      await fetch("/api/teaching-mode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, mode: "professor", activeMaterialId: id }),
      });
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex" style={{ direction: "rtl" }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full overflow-y-auto p-5 shadow-2xl border-l border-white/10" style={{ background: "#0b0d17" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">📚 مصادر الأستاذ</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <p className="text-xs text-white/50 mb-4 leading-relaxed">
          ارفع ملفات PDF (ملازم، مراجع، شرائح) وسيُدرّسك المعلم منها مباشرةً، فصلاً بفصل. الحد الأقصى: 50 ميغابايت و600 صفحة. الملفات المحمية بكلمة مرور غير مدعومة.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span className="text-sm text-amber-300">جارٍ الرفع... {uploadProgress}%</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">رفع ملف PDF جديد</span>
            </>
          )}
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {loading && materials.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : materials.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-8">لم ترفع أي ملف بعد.</p>
        ) : (
          <ul className="space-y-2.5">
            {materials.map((m) => {
              const isActive = activeMaterialId === m.id;
              return (
                <li key={m.id} className={`p-3 rounded-xl border transition-all ${isActive ? "bg-amber-500/10 border-amber-500/50" : "bg-white/[0.03] border-white/10 hover:border-white/20"}`}>
                  <div className="flex items-start gap-2.5">
                    <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? "text-amber-400" : "text-white/40"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate flex-1">{m.fileName}</p>
                        {isActive && m.status === "ready" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">نشط</span>
                        )}
                        {m.status === "error" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">بحاجة إلى إعادة الرفع</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
                        {m.status === "processing" && (
                          <span className="flex items-center gap-1 text-blue-300">
                            <Loader2 className="w-3 h-3 animate-spin" /> جاري التحليل...
                          </span>
                        )}
                        {m.status === "ready" && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> جاهز · {m.pageCount} صفحة
                          </span>
                        )}
                        {m.status === "error" && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-3 h-3" /> فشل التحليل
                          </span>
                        )}
                      </div>
                      {m.status === "ready" && m.summary && (
                        <p className="mt-1.5 text-[11px] text-white/55 leading-relaxed whitespace-pre-line">{m.summary}</p>
                      )}
                      {m.status === "ready" && m.progress && m.progress.chaptersTotal > 0 && (() => {
                        const p = m.progress!;
                        const pct = Math.round((p.completedCount / p.chaptersTotal) * 100);
                        const isExpanded = expandedIds.has(m.id);
                        const chapters = p.chapters ?? [];
                        const completedSet = new Set(p.completedChapterIndices ?? []);
                        const skippedSet = new Set(p.skippedChapterIndices ?? []);
                        return (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-white/55 mb-1">
                              <span>تقدّم القراءة: {p.completedCount} / {p.chaptersTotal} فصول</span>
                              <span className="font-bold text-amber-300">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full bg-gradient-to-l from-amber-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            {p.currentChapterTitle && (
                              <p className="mt-1 text-[10px] text-white/45 truncate">
                                الفصل الحالي: <span className="text-white/70">{p.currentChapterTitle}</span>
                              </p>
                            )}
                            {chapters.length > 0 && (
                              <>
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => toggleExpanded(m.id)}
                                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                                    <span>{isExpanded ? "إخفاء الفصول" : "عرض كل الفصول"}</span>
                                  </button>
                                  {isExpanded && (
                                    <button
                                      onClick={() => handleResetProgress(m.id)}
                                      disabled={busyChapter === `${m.id}:reset`}
                                      className="mr-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-red-500/15 text-white/55 hover:text-red-300 transition-all disabled:opacity-50"
                                    >
                                      {busyChapter === `${m.id}:reset` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                      <span>إعادة تعيين التقدّم</span>
                                    </button>
                                  )}
                                </div>
                                {isExpanded && (
                                  <ul className="mt-2 space-y-1 border-r-2 border-white/10 pr-2">
                                    {chapters.map((title, idx) => {
                                      const isCompleted = completedSet.has(idx);
                                      const isCurrent = p.currentChapterIndex === idx;
                                      const isSkipped = skippedSet.has(idx) && !isCompleted && !isCurrent;
                                      const completeKey = `${m.id}:complete:${idx}`;
                                      const setKey = `${m.id}:set:${idx}`;
                                      return (
                                        <li
                                          key={idx}
                                          className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors ${isCurrent ? "bg-amber-500/10" : isSkipped ? "bg-orange-500/5" : "hover:bg-white/[0.04]"}`}
                                        >
                                          <button
                                            onClick={() => handleToggleComplete(m.id, idx, isCompleted)}
                                            disabled={busyChapter === completeKey}
                                            title={isCompleted ? "إلغاء العلامة" : "وضع علامة كمكتمل"}
                                            className="shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 disabled:opacity-50"
                                          >
                                            {busyChapter === completeKey ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50" />
                                            ) : isCompleted ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : isSkipped ? (
                                              <SkipForward className="w-3.5 h-3.5 text-orange-400/80" />
                                            ) : (
                                              <Circle className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60" />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => handleSetCurrent(m.id, idx)}
                                            disabled={busyChapter === setKey || isCurrent}
                                            title={isCurrent ? "الفصل الحالي" : isSkipped ? "تخطّيت هذا الفصل — انقر للعودة إليه" : "اجعل هذا هو الفصل الحالي"}
                                            className={`flex-1 min-w-0 text-right text-[11px] truncate transition-colors ${isCurrent ? "text-amber-300 font-bold cursor-default" : isCompleted ? "text-white/50 hover:text-white" : isSkipped ? "text-orange-200/80 hover:text-white" : "text-white/75 hover:text-white"} disabled:cursor-default`}
                                          >
                                            <span className="text-white/30 ml-1">{idx + 1}.</span>{title}
                                          </button>
                                          {isCurrent && (
                                            <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                              <Play className="w-2.5 h-2.5" /> الآن
                                            </span>
                                          )}
                                          {isSkipped && (
                                            <span className="shrink-0 text-[9px] font-bold text-orange-300 bg-orange-500/15 px-1.5 py-0.5 rounded">
                                              تخطّاه
                                            </span>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                      {m.status === "error" && m.errorMessage && (
                        <p className="mt-1.5 text-[11px] text-red-300/80 leading-relaxed">{m.errorMessage}</p>
                      )}
                      {m.status === "ready" && m.errorMessage && (
                        <p className="mt-1.5 text-[11px] text-amber-300/80 leading-relaxed">⚠️ {m.errorMessage}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {m.status === "ready" && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.role === "reference" ? "bg-white/10 text-white/60" : "bg-amber-500/20 text-amber-300"}`}>
                            {m.role === "reference" ? "مرجع" : "أساسي"}
                          </span>
                        )}
                        {m.status === "ready" && m.role !== "primary" && (
                          <button
                            onClick={() => handleSetRole(m.id, "primary")}
                            disabled={busyChapter === `${m.id}:role:primary`}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 transition-all disabled:opacity-50"
                          >
                            اجعله الكتاب الأساسي
                          </button>
                        )}
                        {m.status === "ready" && m.role === "primary" && (
                          <button
                            onClick={() => handleSetRole(m.id, "reference")}
                            disabled={busyChapter === `${m.id}:role:reference`}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 transition-all disabled:opacity-50"
                          >
                            اجعله مرجعاً
                          </button>
                        )}
                        {m.status === "ready" && !isActive && (
                          <button onClick={() => handleActivate(m.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all">
                            استخدم هذا الملف
                          </button>
                        )}
                        {m.status === "ready" && (m.coverageStatus === "partial" || m.coverageStatus === "failed") && (
                          <button
                            onClick={() => handleRetryOcr(m.id)}
                            disabled={busyChapter === `${m.id}:retry-ocr`}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-all flex items-center gap-1 disabled:opacity-50"
                          >
                            {busyChapter === `${m.id}:retry-ocr` ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> جارٍ المعالجة...</>
                            ) : (
                              <><RotateCcw className="w-3 h-3" /> أعد قراءة الصفحات الناقصة</>
                            )}
                          </button>
                        )}
                        <button onClick={() => handleDelete(m.id)} className="text-[11px] px-2.5 py-1 rounded-lg hover:bg-red-500/15 text-white/40 hover:text-red-300 transition-all flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode-choice card shown BEFORE diagnostic / first session.
// ─────────────────────────────────────────────────────────────────────────────
export function TeachingModeChoiceCard({
  subjectName,
  onChoose,
}: {
  subjectName: string;
  onChoose: (mode: "custom" | "professor") => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center" style={{ direction: "rtl", background: "#080a11" }}>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">كيف تحب أن نبدأ في {subjectName}؟</h2>
          <p className="text-sm text-white/60">اختر الطريقة التي تناسبك — يمكنك تغيير الاختيار لاحقاً.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => onChoose("custom")}
            className="text-right p-5 rounded-2xl border-2 border-white/10 hover:border-purple-500/60 bg-white/[0.03] hover:bg-purple-500/10 transition-all group"
          >
            <div className="text-3xl mb-2">🧭</div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-purple-300 transition-colors">مسار مخصّص لي</h3>
            <p className="text-xs text-white/55 leading-relaxed">المعلم يبني خطة كاملة لك بناءً على مستواك وأهدافك ووقتك (تشخيص في 4 أسئلة).</p>
          </button>
          <button
            onClick={() => onChoose("professor")}
            className="text-right p-5 rounded-2xl border-2 border-amber-500/40 hover:border-amber-500/80 bg-amber-500/5 hover:bg-amber-500/15 transition-all group relative"
          >
            <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black">جديد ✨</div>
            <div className="text-3xl mb-2">📚</div>
            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">منهج أستاذي</h3>
            <p className="text-xs text-white/55 leading-relaxed">ارفع ملف الأستاذ (PDF) وسأدرّسك منه فصلاً بفصل، بنفس ترتيبه ومصطلحاته.</p>
          </button>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-5">يمكنك تبديل الوضع في أي وقت من زر «📚 مصادري» داخل المحادثة.</p>
      </div>
    </div>
  );
}
