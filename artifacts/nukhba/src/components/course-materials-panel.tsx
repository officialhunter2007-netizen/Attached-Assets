import { useState, useEffect, useRef } from "react";
import { Upload, X, FileText, Loader2, AlertCircle, CheckCircle2, Trash2, BookOpen } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (file.size > 60 * 1024 * 1024) {
      setError("حجم الملف يتجاوز 60 ميغابايت.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const r = await fetch("/api/materials/upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, fileName: file.name, fileSizeBytes: file.size }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.error === "QUOTA_EXCEEDED") {
          setError(data.scope === "free_total"
            ? "أنت في الفترة التجريبية: ملف PDF واحد فقط مسموح. اشترك في المادة لرفع حتى 4 ملفات."
            : `وصلت للحد الأقصى (${data.limit ?? 4} ملفات لهذه المادة). احذف ملفاً قديماً لرفع جديد.`);
        } else if (data.error === "FILE_TOO_LARGE") {
          setError("الملف أكبر من المسموح (60MB).");
        } else {
          setError("تعذّر بدء الرفع — حاول مرة أخرى.");
        }
        setUploading(false);
        return;
      }
      const { uploadUrl } = await r.json();

      // Upload via XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(file);
      });

      const fin = await fetch("/api/materials/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, fileName: file.name, fileSizeBytes: file.size, uploadUrl }),
      });
      if (!fin.ok) {
        setError("تعذّر تسجيل الملف بعد الرفع.");
      } else {
        const created = await fin.json();
        // Set this new material as the active one for this subject (if none selected yet).
        if (!activeMaterialId) onActiveChange(created.id);
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
          ارفع ملفات PDF (ملازم، مراجع، شرائح) وسيُدرّسك المعلم منها مباشرةً، فصلاً بفصل.
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
                        {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">نشط</span>}
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
                      {m.status === "error" && m.errorMessage && (
                        <p className="mt-1.5 text-[11px] text-red-300/80 leading-relaxed">{m.errorMessage}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {m.status === "ready" && !isActive && (
                          <button onClick={() => handleActivate(m.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all">
                            استخدم هذا الملف
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
