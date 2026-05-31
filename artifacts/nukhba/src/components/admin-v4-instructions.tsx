// ─────────────────────────────────────────────────────────────────────────────
// Admin tab — v4 instruction files.
//
// Flow:
//   1. List all v4 specialties (left rail) with their active version + counts.
//   2. Pick one → load its version history.
//   3. Pick a version → load its raw_json into a Monaco editor.
//   4. "تحقق" button POSTs to /api/admin/v4/validate → renders error/warning
//      list inline (clickable, jumps to the json path).
//   5. "نشر إصدار جديد" POSTs to /api/admin/v4/publish → creates a new version
//      and activates it.
//   6. "تفعيل" on an older version POSTs to /activate-version → instant
//      rollback. Running sessions stay pinned to whatever version they
//      started on (architectural constraint #1 in the task plan).
//   7. "تنزيل قالب فارغ" gives the admin a ready-to-fill JSON skeleton.
//
// This component is intentionally self-contained — it does not depend on
// the generated api-client (admin/v4 endpoints aren't in the spec yet) and
// uses raw fetch with cookie auth, which is how other admin tabs that
// pre-date the spec also work.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle2, AlertTriangle, XCircle, FileJson, Rocket, RotateCcw, Trash2, Download, Loader2, Sparkles, Upload } from "lucide-react";
import { university, skills } from "@/lib/curriculum";

// Flat catalog of every legacy specialty/skill the platform knows about,
// so the admin can pick a slug from a single dropdown instead of typing it
// into the raw JSON. The dropdown is the entry point for creating a new
// v4 instruction file — picking a slug that has no v4 file yet opens the
// template pre-filled with that slug + name + icon so the admin can start
// editing immediately.
type CatalogEntry = { slug: string; name: string; icon: string; category: string };
const CATALOG: CatalogEntry[] = [
  ...university.map((s) => ({ slug: s.id, name: s.name, icon: s.emoji, category: "جامعي" })),
  ...skills.flatMap((cat) =>
    cat.subjects.map((s) => ({ slug: s.id, name: s.name, icon: s.emoji, category: cat.name }))
  ),
];

type Issue = { severity: "error" | "warning"; path: string; message: string };
type Summary = {
  levels: number; stages: number; units: number; lessons: number;
  labs: number; labQuestions: number; concepts: number;
  commonMistakes: number; examQuestions: number; placementQuestions: number;
};
type VersionMeta = {
  id: number; version: number; status: string;
  notes: string | null; parsedSummary: Summary | null;
  publishedAt: string; publishedByUserId: number | null;
};
type SpecialtyRow = {
  id: number; slug: string; name: string;
  description: string | null; icon: string | null;
  activeVersion: { id: number; version: number; publishedAt: string; parsedSummary: Summary | null } | null;
  updatedAt: string;
};

// A minimal but spec-compliant template the admin can fill. The validator
// will accept this exact JSON as a publishable file.
const EMPTY_TEMPLATE = `{
  "schema_version": "v4.0",
  "specialty": {
    "slug": "example-specialty",
    "name": "اسم التخصص",
    "description": "وصف عام للتخصص في سطرين أو ثلاثة",
    "icon": "📚",
    "target_persona": "الطالب الذي يستهدفه هذا التخصص",
    "teacher_tone": "نبرة المعلم المناسبة لهذا التخصص",
    "yemeni_examples": ["مثال يمني عام ١", "مثال يمني عام ٢"]
  },
  "levels": [
    {
      "level_index": 1,
      "name": "اسم المستوى الأول",
      "goal": "هدف المستوى الأول بوضوح",
      "exam": { "description": "وصف اختبار المستوى", "pass_threshold_percent": 70 },
      "stages": [
        {
          "stage_index": 1,
          "name": "اسم المرحلة الأولى",
          "goal": "هدف المرحلة الأولى",
          "exam": { "description": "وصف اختبار المرحلة", "pass_threshold_percent": 70 },
          "units": [
            {
              "unit_index": 1,
              "name": "اسم الوحدة الأولى",
              "goal": "هدف الوحدة الأولى بوضوح",
              "prerequisite_units": [],
              "enables_units": [],
              "key_concepts": ["مفهوم رئيسي ١", "مفهوم رئيسي ٢"],
              "exam": { "description": "وصف اختبار الوحدة", "pass_threshold_percent": 70 },
              "labs": [
                {
                  "lab_index": 1,
                  "title": "عنوان المعمل",
                  "scenario": "سيناريو المعمل: قصة كاملة يعيشها الطالب ويتعامل معها",
                  "questions": [
                    { "kind": "diagnostic",  "prompt": "سؤال تشخيصي" },
                    { "kind": "decision",    "prompt": "سؤال قرار" },
                    { "kind": "application", "prompt": "سؤال تطبيقي" },
                    { "kind": "analysis",    "prompt": "سؤال تحليلي" },
                    { "kind": "connection",  "prompt": "سؤال ربط" }
                  ],
                  "completion_criterion": "معيار إكمال المعمل"
                }
              ],
              "lessons": [
                {
                  "lesson_index": 1,
                  "name": "اسم الدرس الأول",
                  "goal": "هدف الدرس الأول",
                  "bridge_sentence": "جملة الجسر الافتتاحية الإلزامية بطول مناسب لجذب الطالب",
                  "prerequisite_lessons": [],
                  "enables_lessons": [],
                  "concepts": [
                    { "name": "اسم المفهوم", "explanation": "شرح المفهوم بوضوح", "mastery_criterion": "معيار إتقان المفهوم" }
                  ],
                  "common_mistakes": [
                    { "mistake": "الخطأ الشائع", "correction": "التصحيح الصحيح", "treatment": "علاج هذا الخطأ" }
                  ],
                  "yemeni_examples": ["مثال من حياة الطالب اليمني"],
                  "final_check_question": "سؤال التحقق النهائي",
                  "session_complete_criterion": "متى تنتهي الجلسة",
                  "expected_duration_minutes": 30,
                  "estimated_gem_cost": 5
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

async function api(path: string, init?: RequestInit): Promise<any> {
  // X-Nukhba-Csrf is required by v4 mutating endpoints (custom-header CSRF
  // defense). Adding it to every call (including GETs) is harmless and
  // future-proofs us if more endpoints add the same guard.
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data?.report) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Upload a (potentially huge) instruction file without ever tripping a
 * body-size limit. A full curriculum serializes to tens of MB of Arabic JSON;
 * we gzip it in the browser with the native CompressionStream so the payload
 * shrinks ~10-20× (to a few MB) and comfortably clears every proxy/server
 * limit REGARDLESS of how big the curriculum grows. The server detects
 * `Content-Type: application/gzip` and inflates it. Browsers without
 * CompressionStream fall back to plain JSON (still works up to the 64MB
 * express limit).
 *
 * This is the permanent fix for the recurring "الملف كبير جداً" / 413 failure:
 * compression removes file SIZE as the binding constraint entirely.
 */
async function postInstructionFile(path: string, parsed: unknown): Promise<Response> {
  const payload = JSON.stringify({ json: parsed });
  const CS: any = (globalThis as any).CompressionStream;
  if (typeof CS === "function") {
    try {
      const compressed = await new Response(
        new Blob([payload]).stream().pipeThrough(new CS("gzip")),
      ).blob();
      return await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/gzip", "X-Nukhba-Csrf": "1" },
        body: compressed,
      });
    } catch {
      // Compression unexpectedly failed — fall through to plain JSON.
    }
  }
  return fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-Nukhba-Csrf": "1" },
    body: payload,
  });
}

export function AdminV4Instructions() {
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<SpecialtyRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [editorJson, setEditorJson] = useState<string>(EMPTY_TEMPLATE);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [lastSummary, setLastSummary] = useState<Summary | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorCount = useMemo(() => issues.filter((i) => i.severity === "error").length, [issues]);
  const warningCount = useMemo(() => issues.filter((i) => i.severity === "warning").length, [issues]);

  // ── Load specialties list ────────────────────────────────────────────────
  async function loadList() {
    setLoadingList(true);
    try {
      const data = await api("/api/admin/v4/specialties");
      setSpecialties(data.specialties ?? []);
    } catch (e: any) {
      toast({ title: "فشل تحميل التخصصات", description: e.message, variant: "destructive" });
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { loadList(); }, []);

  // ── Pick a specialty → load its version history ──────────────────────────
  async function selectSpecialty(slug: string) {
    setSelectedSlug(slug);
    setSelectedVersionId(null);
    setIssues([]);
    setLastSummary(null);
    setLoadingDetail(true);
    try {
      const data = await api(`/api/admin/v4/specialties/${encodeURIComponent(slug)}`);
      setVersions(data.versions ?? []);
      if (data.versions?.length > 0) {
        const latest = data.versions[0];
        await loadVersion(latest.id);
      } else {
        setEditorJson(EMPTY_TEMPLATE);
      }
    } catch (e: any) {
      toast({ title: "فشل تحميل التخصص", description: e.message, variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  }

  // ── Load one version into the editor ─────────────────────────────────────
  async function loadVersion(versionId: number) {
    setSelectedVersionId(versionId);
    try {
      const data = await api(`/api/admin/v4/versions/${versionId}`);
      setEditorJson(JSON.stringify(data.version.rawJson, null, 2));
      setIssues([]);
      setLastSummary(data.version.parsedSummary ?? null);
    } catch (e: any) {
      toast({ title: "فشل تحميل الإصدار", description: e.message, variant: "destructive" });
    }
  }

  // ── Validate without publishing ──────────────────────────────────────────
  async function runValidate() {
    setValidating(true);
    setIssues([]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(editorJson);
    } catch (e: any) {
      setIssues([{ severity: "error", path: "(root)", message: `JSON غير صالح: ${e.message}` }]);
      setValidating(false);
      return;
    }
    try {
      const res = await postInstructionFile("/api/admin/v4/validate", parsed);
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setIssues(data.issues ?? []);
      setLastSummary(data.summary ?? null);
      toast({
        title: data.ok ? "ملف صالح ✓" : `بحاجة إصلاحات`,
        description: data.ok ? `جاهز للنشر — ${data.summary.lessons} درساً` : `${data.issues.filter((i: Issue) => i.severity === "error").length} أخطاء`,
        variant: data.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "فشل التحقق", description: e.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  }

  // ── Publish a new version ────────────────────────────────────────────────
  async function publish() {
    setPublishing(true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(editorJson);
    } catch (e: any) {
      toast({ title: "JSON غير صالح", description: e.message, variant: "destructive" });
      setPublishing(false);
      return;
    }
    try {
      const res = await postInstructionFile("/api/admin/v4/publish", parsed);
      // A 413 (payload too large) or a proxy/gateway timeout returns plain
      // text/HTML, not JSON — guard the parse so the admin sees a clear
      // message instead of a cryptic "Unexpected token" error.
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        if (data.report) {
          setIssues(data.report.issues ?? []);
          toast({ title: "فشل النشر — أخطاء في الملف", description: `${data.report.issues.filter((i: Issue) => i.severity === "error").length} أخطاء`, variant: "destructive" });
        } else if (res.status === 413) {
          toast({ title: "الملف كبير جداً", description: "حجم ملف التعليمات تجاوز الحد المسموح به للرفع. قسّم المحتوى أو راجع الإعدادات.", variant: "destructive" });
        } else {
          toast({ title: "فشل النشر", description: data.error || `HTTP ${res.status}`, variant: "destructive" });
        }
        return;
      }
      toast({ title: "نُشر الإصدار ✓", description: `الإصدار رقم ${data.version} — ${data.summary.lessons} درساً`, variant: "default" });
      setIssues([]);
      setLastSummary(data.summary);
      await loadList();
      if (selectedSlug) await selectSpecialty(selectedSlug);
    } catch (e: any) {
      toast({ title: "فشل النشر", description: e.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  }

  // ── Switch active version (rollback / promote) ───────────────────────────
  async function activateVersion(versionId: number) {
    if (!selectedSlug) return;
    try {
      await api(`/api/admin/v4/specialties/${encodeURIComponent(selectedSlug)}/activate-version`, {
        method: "POST",
        body: JSON.stringify({ versionId }),
      });
      toast({ title: "تم تفعيل الإصدار ✓" });
      await loadList();
      await selectSpecialty(selectedSlug);
    } catch (e: any) {
      toast({ title: "فشل التفعيل", description: e.message, variant: "destructive" });
    }
  }

  async function deleteVersion(versionId: number) {
    if (!confirm("حذف الإصدار نهائياً؟ الجلسات الجارية على هذا الإصدار ستتعطل.")) return;
    try {
      await api(`/api/admin/v4/versions/${versionId}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      if (selectedSlug) await selectSpecialty(selectedSlug);
      await loadList();
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e.message, variant: "destructive" });
    }
  }

  function downloadTemplate() {
    const blob = new Blob([EMPTY_TEMPLATE], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nukhba-v4-instruction-template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function newDraft() {
    setSelectedSlug(null);
    setSelectedVersionId(null);
    setVersions([]);
    setIssues([]);
    setLastSummary(null);
    setEditorJson(EMPTY_TEMPLATE);
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        toast({ title: "ملف JSON غير صالح", description: "تعذّر قراءة الملف — تأكد أنه بصيغة JSON صحيحة.", variant: "destructive" });
        return;
      }
      const pretty = JSON.stringify(parsed, null, 2);
      setEditorJson(pretty);
      setIssues([]);
      setLastSummary(null);
      setSelectedVersionId(null);
      const slug: string | undefined = parsed?.specialty?.slug;
      if (slug) {
        const existing = specialties.find((s) => s.slug === slug);
        if (existing) {
          setSelectedSlug(slug);
        } else {
          setSelectedSlug(null);
          setVersions([]);
        }
      }
      const sizeKB = Math.round(raw.length / 1024);
      toast({
        title: `✓ تم تحميل ${file.name}`,
        description: `الحجم: ${sizeKB} كيلوبايت${slug ? ` · التخصص: ${slug}` : ""} — اضغط "تحقق" أو "نشر إصدار جديد" مباشرةً.`,
      });
    };
    reader.readAsText(file, "utf-8");
  }

  // ── Pick a catalog entry from the dropdown ───────────────────────────────
  // If the slug already has a published v4 file → load its latest version.
  // Otherwise → open the template pre-filled with that slug/name/icon so the
  // admin can start editing immediately without typing the slug by hand.
  async function pickFromCatalog(slug: string) {
    if (!slug) return;
    const entry = CATALOG.find((c) => c.slug === slug);
    const existing = specialties.find((s) => s.slug === slug);
    if (existing) {
      await selectSpecialty(slug);
      return;
    }
    if (!entry) return;
    setSelectedSlug(null);
    setSelectedVersionId(null);
    setVersions([]);
    setIssues([]);
    setLastSummary(null);
    try {
      const tpl = JSON.parse(EMPTY_TEMPLATE);
      tpl.specialty = {
        ...tpl.specialty,
        slug: entry.slug,
        name: entry.name,
        icon: entry.icon,
      };
      setEditorJson(JSON.stringify(tpl, null, 2));
      toast({
        title: `مسودة جديدة لـ ${entry.name}`,
        description: `املأ ملف التعليمات ثم اضغط "نشر إصدار جديد" لتفعيل المسار المخصص لهذا التخصص.`,
      });
    } catch {
      setEditorJson(EMPTY_TEMPLATE);
    }
  }

  const publishedSlugs = useMemo(() => new Set(specialties.map((s) => s.slug)), [specialties]);
  const unpublishedCount = useMemo(
    () => CATALOG.filter((c) => !publishedSlugs.has(c.slug)).length,
    [publishedSlugs]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* ── Left rail: catalog picker + published specialties + versions ── */}
      <div className="flex flex-col gap-3">
        {/* Catalog picker — single dropdown listing every legacy
            specialty/skill the platform knows about. This is the
            recommended entry point: pick a subject → if it has a v4 file
            you'll see its versions; if not, the editor opens the template
            pre-filled with the right slug/name/icon and you can fill it
            in. */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">اختر التخصص أو المهارة</h3>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            اختر من القائمة ثم اكتب ملف التعليمات (٥ مستويات × ٧ مراحل × ٩ وحدات × ١٠ دروس). بعد النشر يصبح هذا التخصص مبرمجاً تلقائياً على تعليماتك ولن يرى الطالب الصفحة القديمة.
          </p>
          <select
            value={selectedSlug ?? ""}
            onChange={(e) => pickFromCatalog(e.target.value)}
            className="w-full text-sm bg-background border border-white/10 rounded-md px-3 py-2 focus:outline-none focus:border-amber-500/60"
            dir="rtl"
          >
            <option value="">— اختر تخصصاً أو مهارة —</option>
            <optgroup label="التخصصات الجامعية">
              {CATALOG.filter((c) => c.category === "جامعي").map((c) => (
                <option key={c.slug} value={c.slug}>
                  {publishedSlugs.has(c.slug) ? "● " : "○ "}{c.icon} {c.name} ({c.slug})
                </option>
              ))}
            </optgroup>
            {Array.from(new Set(CATALOG.filter((c) => c.category !== "جامعي").map((c) => c.category))).map((cat) => (
              <optgroup key={cat} label={`المهارات — ${cat}`}>
                {CATALOG.filter((c) => c.category === cat).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {publishedSlugs.has(c.slug) ? "● " : "○ "}{c.icon} {c.name} ({c.slug})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="text-emerald-400">●</span> منشور v4</span>
            <span className="flex items-center gap-1"><span>○</span> لم يُنشر بعد ({unpublishedCount})</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">المنشور حالياً</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={loadList} disabled={loadingList} title="تحديث">
              {loadingList ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={newDraft} title="مسودة فارغة">
              <FileJson className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="bg-glass border border-white/10 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {specialties.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">لا توجد تخصصات منشورة بعد — اختر واحداً من القائمة بالأعلى وانشر ملف التعليمات.</p>
          ) : (
            specialties.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSpecialty(s.slug)}
                className={`w-full text-right px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors ${selectedSlug === s.slug ? "bg-amber-500/10 border-r-2 border-r-amber-500" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.icon || "📘"}</span>
                  <span className="font-medium text-sm flex-1 truncate">{s.name}</span>
                  {s.activeVersion && (
                    <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/40 text-emerald-400">v{s.activeVersion.version}</Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">{s.slug}</div>
              </button>
            ))
          )}
        </div>

        {selectedSlug && (
          <>
            <h3 className="text-sm font-semibold text-foreground mt-2">الإصدارات</h3>
            <div className="bg-glass border border-white/10 rounded-lg overflow-hidden max-h-[280px] overflow-y-auto">
              {loadingDetail ? (
                <div className="p-3 text-center"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
              ) : versions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">لا إصدارات بعد لهذا التخصص.</p>
              ) : (
                versions.map((v) => {
                  const active = specialties.find((s) => s.slug === selectedSlug)?.activeVersion?.id === v.id;
                  return (
                    <div key={v.id} className={`px-3 py-2 border-b border-white/5 ${selectedVersionId === v.id ? "bg-white/5" : ""}`}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => loadVersion(v.id)} className="flex-1 text-right">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold">v{v.version}</span>
                            {active && <Badge className="text-[10px] h-4 bg-emerald-500/20 text-emerald-300 border-emerald-500/40">نشط</Badge>}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(v.publishedAt).toLocaleString("ar-YE")}
                            {v.parsedSummary && ` · ${v.parsedSummary.lessons} درس`}
                          </div>
                        </button>
                        {!active && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => activateVersion(v.id)} title="تفعيل">
                            <Rocket className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-400" onClick={() => deleteVersion(v.id)} title="حذف">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2">
          <Download className="w-3.5 h-3.5 ml-1" /> تنزيل قالب JSON فارغ
        </Button>
      </div>

      {/* ── Right pane: Monaco editor + actions + issues ────────────────── */}
      <div className="flex flex-col gap-3 min-h-[600px]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold">
              {selectedSlug ? `تحرير: ${selectedSlug}` : "مسودة جديدة"}
              {selectedVersionId && ` · v${versions.find((v) => v.id === selectedVersionId)?.version}`}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={validating || publishing} title="رفع ملف JSON من جهازك">
              <Upload className="w-3.5 h-3.5 ml-1" /> رفع ملف
            </Button>
            <Button size="sm" variant="outline" onClick={runValidate} disabled={validating || publishing}>
              {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
              تحقق
            </Button>
            <Button size="sm" onClick={publish} disabled={validating || publishing} className="bg-emerald-600 hover:bg-emerald-700">
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <Rocket className="w-3.5 h-3.5 ml-1" />}
              نشر إصدار جديد
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        {lastSummary && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30">المستويات: {lastSummary.levels}</span>
            <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30">المراحل: {lastSummary.stages}</span>
            <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30">الوحدات: {lastSummary.units}</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">الدروس: {lastSummary.lessons}</span>
            <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">المعامل: {lastSummary.labs} ({lastSummary.labQuestions} سؤال)</span>
            <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30">المفاهيم: {lastSummary.concepts}</span>
            <span className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30">الأخطاء الشائعة: {lastSummary.commonMistakes}</span>
            <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30">أسئلة الاختبارات: {lastSummary.examQuestions}</span>
            <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30">تحديد المستوى: {lastSummary.placementQuestions}</span>
          </div>
        )}

        {/* Monaco editor */}
        <div className="border border-white/10 rounded-lg overflow-hidden" style={{ minHeight: 480 }}>
          <Editor
            height="480px"
            defaultLanguage="json"
            theme="vs-dark"
            value={editorJson}
            onChange={(v) => setEditorJson(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              tabSize: 2,
              wordWrap: "on",
              automaticLayout: true,
              fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
            }}
          />
        </div>

        {/* Hidden file input — triggered by "رفع ملف" button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileLoad}
        />

        {/* Issues panel */}
        {issues.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 bg-black/30 border-b border-white/10 text-xs">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> {errorCount} أخطاء
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> {warningCount} تحذيرات
                </span>
              )}
              {errorCount === 0 && warningCount === 0 && (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ملف صالح
                </span>
              )}
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {issues.map((iss, i) => (
                <div key={i} className={`px-3 py-1.5 text-xs border-b border-white/5 ${iss.severity === "error" ? "bg-red-500/5" : "bg-amber-500/5"}`}>
                  <div className="flex items-start gap-2">
                    {iss.severity === "error"
                      ? <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-muted-foreground truncate" dir="ltr">{iss.path}</div>
                      <div className="text-foreground">{iss.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
