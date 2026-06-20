// ─────────────────────────────────────────────────────────────────────────────
// v4 task #8 + R1 — Booklet upload + booklet list + live 4-stage progress.
//
// Flow:
//   1. List user's existing booklets (with status + structural tree once ready).
//   2. Upload form (PDF + optional title) → POST /api/v4/booklet/upload.
//   3. Poll the pending booklet every 1.5s; render a 4-stage progress bar
//      (extracting → chunking → embedding → binding) until ready/failed.
//   4. Once ready, expand a structural tree of units/lessons with per-lesson
//      binding badges (✓ مربوط ص. N-M  /  ⚠️ يحتاج مراجعة).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Upload, BookOpen, CheckCircle, XCircle, ChevronLeft, Sparkles, AlertTriangle, FileText, ChevronDown, Trash2 } from "lucide-react";
import { PathSwitcher } from "@/components/path-switcher";

type Lesson = { lessonIndex: number; code: string; name: string; pages: [number, number]; objective?: string; needsReview?: boolean; needsReviewReason?: string };
type Unit = { unitIndex: number; code: string; name: string; pages: [number, number]; lessons: Lesson[] };
type Tree = { units: Unit[] };

type BookletRow = {
  id: number;
  title: string;
  pagesCount: number;
  status: "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

type FullBooklet = {
  id: number;
  title: string;
  pagesCount: number;
  status: "processing" | "ready" | "failed";
  processingStage: "extracting" | "chunking" | "embedding" | "binding" | "done" | "failed";
  processingPercent: number;
  errorMessage: string | null;
  tree: Tree;
};

const CSRF: Record<string, string> = { "X-Nukhba-Csrf": "1" };

const STAGES: Array<{ key: FullBooklet["processingStage"]; label: string }> = [
  { key: "extracting", label: "استخراج النص من الـPDF" },
  { key: "chunking", label: "تقسيم الصفحات لمقاطع" },
  { key: "embedding", label: "حساب التضمينات (embeddings)" },
  { key: "binding", label: "ربط الدروس بالصفحات" },
];

function stageOrdinal(s: FullBooklet["processingStage"]): number {
  switch (s) {
    case "extracting": return 0;
    case "chunking": return 1;
    case "embedding": return 2;
    case "binding": return 3;
    case "done": return 4;
    case "failed": return -1;
  }
}

function ProgressBar({ stage, percent }: { stage: FullBooklet["processingStage"]; percent: number }) {
  const cur = stageOrdinal(stage);
  const overall = stage === "done" ? 100
    : stage === "failed" ? 0
    : Math.round(((cur + Math.max(0, percent) / 100) / 4) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-white/50 font-mono">
        <span>{overall}%</span>
        <span>{stage === "done" ? "اكتمل" : stage === "failed" ? "فشل" : "جاري…"}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${stage === "failed" ? "bg-red-500" : "bg-emerald"}`}
          style={{ width: `${overall}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {STAGES.map((s, i) => {
          const isDone = i < cur || stage === "done";
          const isCurrent = i === cur && stage !== "done";
          return (
            <div key={s.key} className={`text-[10px] text-center rounded-md py-1.5 px-1 border transition-colors ${
              isDone ? "bg-emerald/15 border-emerald/40 text-emerald"
                : isCurrent ? "bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse"
                : "bg-white/[0.02] border-white/10 text-white/40"
            }`}>
              <div className="font-bold mb-0.5">{i + 1}</div>
              <div className="leading-tight">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StructuralTree({ tree }: { tree: Tree }) {
  const [openUnits, setOpenUnits] = useState<Set<string>>(() => new Set(tree.units?.[0] ? [tree.units[0].code] : []));
  if (!tree?.units?.length) return <div className="text-xs text-white/40">لم يُستخرج هيكل بعد.</div>;
  return (
    <div className="space-y-2">
      {tree.units.map((u) => {
        const open = openUnits.has(u.code);
        const ok = u.lessons.filter((l) => !l.needsReview).length;
        const bad = u.lessons.length - ok;
        return (
          <div key={u.code} className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setOpenUnits((prev) => {
                const c = new Set(prev);
                if (c.has(u.code)) c.delete(u.code); else c.add(u.code);
                return c;
              })}
              className="w-full text-right px-3 py-2 flex items-center gap-2 hover:bg-white/[0.04]"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${open ? "" : "-rotate-90"}`} />
              <span className="font-bold text-sm flex-1">{u.code}. {u.name}</span>
              <span className="text-[10px] text-white/40 font-mono">ص. {u.pages[0]}-{u.pages[1]}</span>
              <span className="text-[10px] text-emerald font-bold">{ok} ✓</span>
              {bad > 0 && <span className="text-[10px] text-amber-400 font-bold">{bad} ⚠️</span>}
            </button>
            {open && (
              <div className="border-t border-white/10 divide-y divide-white/5">
                {u.lessons.map((l) => (
                  <div key={l.code} className="px-3 py-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-white/40" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{l.name}</div>
                      {l.objective && <div className="text-[10px] text-white/40 truncate">{l.objective}</div>}
                    </div>
                    {l.needsReview ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-2.5 h-2.5" /> بحاجة مراجعة
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald/15 border border-emerald/40 text-emerald">
                        <CheckCircle className="w-2.5 h-2.5" /> ص. {l.pages[0]}-{l.pages[1]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PathBooklet() {
  const [, params] = useRoute<{ slug: string }>("/path/:slug/booklet");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();

  const [booklets, setBooklets] = useState<BookletRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, FullBooklet>>({});
  const [confirmDelete, setConfirmDelete] = useState<BookletRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Failed booklets are retryable scaffolding and don't count toward the cap
  // (mirrors the server-side limit check).
  const MAX_BOOKLETS = 5;
  const activeCount = booklets.filter((b) => b.status !== "failed").length;
  const atLimit = activeCount >= MAX_BOOKLETS;

  async function refreshList() {
    try {
      const r = await fetch(`/api/v4/booklet/list/${encodeURIComponent(slug)}`, { credentials: "include" });
      if (!r.ok) throw new Error(`http_${r.status}`);
      const data = await r.json();
      setBooklets(Array.isArray(data?.booklets) ? data.booklets : []);
    } catch (e: any) {
      setLoadErr(String(e?.message ?? e));
    }
  }

  async function refreshDetail(bookletId: number) {
    try {
      const r = await fetch(`/api/v4/booklet/${bookletId}`, { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      if (data?.booklet) setDetails((prev) => ({ ...prev, [bookletId]: data.booklet as FullBooklet }));
    } catch {}
  }

  useEffect(() => { if (slug) void refreshList(); }, [slug]);

  // Clear pendingId once it reaches a terminal state — otherwise the
  // polling loop below would keep firing forever after the booklet is
  // ready/failed (state-machine bug).
  useEffect(() => {
    if (pendingId == null) return;
    const row = booklets.find((b) => b.id === pendingId);
    if (row && row.status !== "processing") setPendingId(null);
  }, [booklets, pendingId]);

  // Poll all processing booklets + the pending one for live progress.
  // Only runs while at least one booklet is still in `processing` state.
  useEffect(() => {
    const processingIds = booklets.filter((b) => b.status === "processing").map((b) => b.id);
    if (pendingId && !processingIds.includes(pendingId)) processingIds.push(pendingId);
    if (processingIds.length === 0) return;
    // Initial fetch + interval
    processingIds.forEach((id) => void refreshDetail(id));
    const t = setInterval(() => {
      void refreshList();
      processingIds.forEach((id) => void refreshDetail(id));
    }, 1500);
    return () => clearInterval(t);
  }, [booklets, pendingId, slug]);

  // Once a ready booklet is in the list and we don't have its tree yet,
  // fetch it once so the structural tree is displayable.
  useEffect(() => {
    for (const b of booklets) {
      if (b.status === "ready" && !details[b.id]) void refreshDetail(b.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booklets]);

  async function doDelete(id: number) {
    setDeletingId(id); setDeleteErr(null);
    try {
      const r = await fetch(`/api/v4/booklet/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: CSRF,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message ?? data?.error ?? `http_${r.status}`);
      setDetails((prev) => { const c = { ...prev }; delete c[id]; return c; });
      setConfirmDelete(null);
      await refreshList();
    } catch (e: any) {
      setDeleteErr(String(e?.message ?? e));
    } finally {
      setDeletingId(null);
    }
  }

  async function doUpload() {
    if (!file) { setUploadErr("اختر ملف PDF أو Word أولاً."); return; }
    if (atLimit) { setUploadErr(`وصلت للحد الأقصى (${MAX_BOOKLETS} ملازم) في هذا التخصص. احذف ملزمة قديمة أولاً.`); return; }
    if (file.size > 25 * 1024 * 1024) { setUploadErr("الحد الأقصى ٢٥ ميجابايت."); return; }
    setUploading(true); setUploadErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slug", slug);
      if (title.trim()) form.append("title", title.trim());
      const r = await fetch("/api/v4/booklet/upload", {
        method: "POST",
        credentials: "include",
        headers: CSRF,
        body: form,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 402) {
          setUploadErr(data?.error === "no_wallet"
            ? "تحتاج اشتراك في هذا التخصص أولاً ليُفتح الرصيد."
            : `رصيد غير كافٍ. تحتاج ~${data?.needsGems ?? 150} جوهرة لتجهيز الملزمة.`);
          return;
        }
        throw new Error(data?.message ?? data?.error ?? `http_${r.status}`);
      }
      const id = Number(data?.bookletId);
      if (Number.isInteger(id)) setPendingId(id);
      setFile(null); setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await refreshList();
    } catch (e: any) {
      setUploadErr(String(e?.message ?? e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-white py-8 px-4" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/path/${encodeURIComponent(slug)}`)}
            className="text-sm text-white/50 hover:text-white inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> رجوع
          </button>
          <PathSwitcher slug={slug} compact />
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald/15 border border-emerald/40 mx-auto mb-3 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-emerald" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">مسار ملازم جامعية</h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-xl mx-auto">
            ارفع ملزمة مقرّرك (PDF أو Word) ونعدّ لك خريطة وحدات ودروس تلقائياً.
            كلفة التجهيز: ~١٥٠ جوهرة لمرة واحدة لكل ملزمة.
          </p>
        </div>

        {/* Upload form */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-emerald/30 p-5 mb-6"
        >
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald" /> ارفع ملزمة جديدة
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/60 block mb-1">عنوان الملزمة (اختياري)</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: ملزمة قواعد البيانات — د. أحمد"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald/60"
                maxLength={160}
              />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">ملف PDF أو Word (حد أقصى ٢٥ ميجا / ٤٠٠ صفحة)</label>
              <input
                ref={fileRef} type="file"
                accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={atLimit}
                className="block w-full text-sm text-white/80 file:ml-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald/20 file:text-emerald file:cursor-pointer disabled:opacity-50"
              />
            </div>
            {atLimit && (
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                وصلت للحد الأقصى ({MAX_BOOKLETS} ملازم) في هذا التخصص. احذف ملزمة قديمة لإضافة جديدة.
              </div>
            )}
            {uploadErr && <div className="text-sm text-red-400">{uploadErr}</div>}
            <button
              onClick={doUpload}
              disabled={uploading || !file || atLimit}
              className="px-5 py-2.5 rounded-xl bg-emerald text-black font-bold text-sm hover:bg-emerald/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الرفع…</> : <><Sparkles className="w-4 h-4" /> ارفع وحلّل</>}
            </button>
          </div>
        </motion.div>

        {/* Booklet list */}
        <h2 className="text-lg font-bold mb-3">ملازمك في هذا التخصص</h2>
        {loadErr && <div className="text-sm text-red-400 mb-3">تعذّر تحميل القائمة: {loadErr}</div>}
        {booklets.length === 0 ? (
          <div className="text-sm text-white/40 text-center py-6 border border-dashed border-white/10 rounded-xl">
            لا توجد ملازم بعد. ابدأ بالرفع أعلاه.
          </div>
        ) : (
          <div className="space-y-4">
            {booklets.map((b) => {
              const det = details[b.id];
              const isProcessing = b.status === "processing";
              const isReady = b.status === "ready";
              return (
                <div key={b.id} className="glass rounded-xl border border-white/10 p-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{b.title}</div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {b.pagesCount ? `${b.pagesCount} صفحة • ` : ""}
                        {new Date(b.createdAt).toLocaleDateString("ar")}
                      </div>
                      {b.status === "failed" && b.errorMessage && (
                        <div className="text-xs text-red-400 mt-1">{b.errorMessage}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isProcessing && (
                        <span className="text-xs text-amber-400 inline-flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري التحضير…
                        </span>
                      )}
                      {isReady && (
                        <>
                          <span className="text-xs text-emerald inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> جاهز
                          </span>
                          <button
                            onClick={() => navigate(`/booklet/${b.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-emerald text-black text-xs font-bold hover:bg-emerald/90"
                          >
                            افتح
                          </button>
                        </>
                      )}
                      {b.status === "failed" && (
                        <span className="text-xs text-red-400 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> فشل
                        </span>
                      )}
                      {!isProcessing && (
                        <button
                          onClick={() => { setDeleteErr(null); setConfirmDelete(b); }}
                          title="حذف الملزمة"
                          aria-label="حذف الملزمة"
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isProcessing && det && (
                    <ProgressBar stage={det.processingStage ?? "extracting"} percent={det.processingPercent ?? 0} />
                  )}
                  {isProcessing && !det && (
                    <div className="text-xs text-white/40">…تحميل حالة المعالجة</div>
                  )}
                  {isReady && det?.tree && (
                    <details className="mt-2" open>
                      <summary className="text-xs text-white/60 cursor-pointer hover:text-white">
                        🌳 الهيكل المكتشف ({det.tree.units?.length ?? 0} وحدة)
                      </summary>
                      <div className="mt-2"><StructuralTree tree={det.tree} /></div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { if (deletingId == null) setConfirmDelete(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl border border-red-500/40 p-5 max-w-sm w-full text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/40 mx-auto mb-3 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-black text-lg mb-1">حذف الملزمة؟</h3>
            <p className="text-sm text-white/60 mb-1 truncate">«{confirmDelete.title}»</p>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              سيُحذف هيكل الملزمة وكل تقدّمك فيها (النجوم، نتائج الاختبارات والتمارين) نهائياً. لا يمكن التراجع.
            </p>
            {deleteErr && <div className="text-sm text-red-400 mb-3">تعذّر الحذف: {deleteErr}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId != null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={() => void doDelete(confirmDelete.id)}
                disabled={deletingId != null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {deletingId != null
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحذف…</>
                  : <><Trash2 className="w-4 h-4" /> احذف نهائياً</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
