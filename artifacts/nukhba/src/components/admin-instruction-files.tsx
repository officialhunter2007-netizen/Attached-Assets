import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  FileText, CheckCircle2, AlertCircle, AlertTriangle,
  Loader2, Save, Trash2, Eye, FileDown, RefreshCw,
  BookOpen, ListTree, BarChart3, X, Code2,
} from "lucide-react";
import { university, skills } from "@/lib/curriculum";

const allSubjectsFlat = [
  ...university.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji ?? "📚" })),
  ...skills.flatMap((cat) =>
    cat.subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji ?? "🔧" })),
  ),
];

interface ValidationStats {
  levels: number;
  stages: number;
  units: number;
  lessons: number;
  labs: number;
  exams: number;
  totalFields: number;
  emptyFields: number;
  errors: number;
  warnings: number;
}

interface ValidationIssue {
  type: "error" | "warning";
  code: string;
  path: string;
  field: string;
  message: string;
  line?: number;
}

interface ValidationResult {
  stats: ValidationStats;
  issues: ValidationIssue[];
  specialty: {
    name: string;
    fields: Record<string, string>;
  } | null;
  levelCount: number;
}

interface InstructionFile {
  id: number;
  specialtyId: number;
  title: string;
  titleAr: string | null;
  content: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TEMPLATE_JSON: string = JSON.stringify({
  specialty: {
    name: "اسم التخصص",
    fields: {
      "وصف عام": "[...]",
      "الشخصية المستهدفة": "[...]",
      "نبرة المعلم في هذا التخصص": "[...]",
      "أمثلة من بيئة الطالب اليمني": "[...]",
    },
  },
  levels: [
    {
      number: 1,
      name: "اسم المستوى 1",
      fields: { "هدف المستوى": "[...]", "عدد المراحل": "7", "عدد الوحدات": "63" },
      levelExam: { fields: { الوصف: "[...]", "معيار الاجتياز": "[80%]" } },
      stages: [
        {
          number: 1,
          name: "اسم المرحلة 1.1",
          fields: { "هدف المرحلة": "[...]", "عدد الوحدات": "9" },
          stageExam: { fields: { الوصف: "[...]", "معيار الاجتياز": "[80%]" } },
          units: [
            {
              number: 1,
              name: "اسم الوحدة 1.1.1",
              fields: {
                "هدف الوحدة": "[...]",
                "المتطلبات السابقة": "لا يوجد",
                "يفتح لاحقاً": "لا يوجد",
                "المفاهيم الأساسية للوحدة": "[...]",
              },
              unitExam: { fields: { "نوع الاختبار": "10 MCQ", "معيار الاجتياز": "[80%]" } },
              lessons: [
                {
                  number: 1,
                  name: "اسم الدرس 1.1.1.1",
                  fields: {
                    "هدف الدرس": "[...]",
                    "جملة الجسر": "[الافتتاحية الإلزامية — جملة تربط الدرس السابق بالجديد، 10 كلمات على الأقل]",
                    "المتطلبات السابقة": "لا يوجد",
                    "يفتح لاحقاً": "لا يوجد",
                    "سؤال التحقق النهائي": "[...]",
                    "مدة الدرس المتوقعة": "15-20 دقيقة",
                    "تكلفة الجواهر التقديرية": "5",
                  },
                  concepts: [
                    { name: "المفهوم 1", explanation: "[شرح المفهوم]", mastery: "[معيار الإتقان]" },
                  ],
                  commonMistakes: [
                    { mistake: "[الخطأ الشائع]", correction: "[الصواب]", treatment: "[طريقة العلاج]" },
                  ],
                  yemeniExamples: ["[مثال من حياة الطالب اليمني]"],
                },
              ],
              labs: [
                {
                  number: 1,
                  name: "عنوان المعمل",
                  fields: { السيناريو: "[وصف السيناريو]", "معيار الإكمال": "[...]" },
                  questions: [
                    { type: "تشخيص", text: "[سؤال تشخيصي]" },
                    { type: "قرار", text: "[سؤال قرار]" },
                    { type: "تطبيق", text: "[سؤال تطبيقي]" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}, null, 2);

export function AdminInstructionFiles() {
  const { toast } = useToast();
  const [selectedSubjectId, setSelectedSubjectId] = useState(allSubjectsFlat[0]?.id ?? "");
  const [content, setContent] = useState(DEFAULT_TEMPLATE_JSON);
  const editorRef = useRef<any>(null);
  const [version, setVersion] = useState("1.0");
  const [titleAr, setTitleAr] = useState("");

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<InstructionFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "files">("editor");

  const fetchFiles = useCallback(async () => {
    if (!selectedSubjectId) return;
    setIsLoadingFiles(true);
    try {
      // Map subject slug to specialtyId — need to find it from the specialties table
      const r = await fetch(`/api/admin/instruction-files?subjectId=${encodeURIComponent(selectedSubjectId)}`);
      if (!r.ok) return;
      const data = await r.json();
      setFiles(data?.data ?? []);
    } catch {} finally {
      setIsLoadingFiles(false);
    }
  }, [selectedSubjectId]);

  const handleValidate = async () => {
    if (!content.trim()) {
      toast({ title: "المحتوى فارغ", description: "يرجى كتابة محتوى ملف التعليمات", variant: "destructive" });
      return;
    }
    setIsValidating(true);
    setValidation(null);
    try {
      const r = await fetch("/api/admin/instruction-files/parse", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any)?.error ?? "فشل التحليل");
      }
      const data = await r.json();
      setValidation((data as any).data);
      const s = (data as any).data.stats;
      if (s.errors > 0) {
        toast({ title: `تم التحليل — ${s.errors} أخطاء`, description: `يوجد ${s.errors} خطأ و ${s.warnings} تحذير`, variant: "destructive" });
      } else if (s.warnings > 0) {
        toast({ title: `تم التحليل — ${s.warnings} تحذير`, description: "لا توجد أخطاء، ولكن يوجد تحذيرات", className: "bg-amber-600 text-white border-none" });
      } else {
        toast({ title: "الملف صحيح!", description: "لا توجد أخطاء أو تحذيرات", className: "bg-emerald-600 text-white border-none" });
      }
    } catch (err: any) {
      toast({ title: "فشل التحليل", description: err?.message ?? "خطأ غير متوقع", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      const r = await fetch("/api/admin/instruction-files", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          content,
          version,
          titleAr: titleAr || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any)?.error ?? "فشل الحفظ");
      }
      toast({ title: "تم الحفظ", description: "تم حفظ ملف التعليمات بنجاح", className: "bg-emerald-600 text-white border-none" });
      fetchFiles();
    } catch (err: any) {
      toast({ title: "فشل الحفظ", description: err?.message ?? "خطأ غير متوقع", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const r = await fetch(`/api/admin/instruction-files/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error("فشل الحذف");
      toast({ title: "تم الحذف", className: "bg-emerald-600 text-white border-none" });
      fetchFiles();
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setContent(formatted);
      toast({ title: "تم تنسيق JSON", className: "bg-emerald-600 text-white border-none" });
    } catch {
      toast({ title: "JSON غير صالح", description: "صحيح الأخطاء أولاً قبل التنسيق", variant: "destructive" });
    }
  };

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleLoadTemplate = () => {
    setContent(DEFAULT_TEMPLATE_JSON);
    setValidation(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instruction-template-${selectedSubjectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === "files") fetchFiles();
  }, [activeTab, fetchFiles]);

  const statsCards = validation ? [
    { label: "المستويات", value: validation.stats.levels, icon: <ListTree className="w-4 h-4" />, color: "text-sky-400" },
    { label: "المراحل", value: validation.stats.stages, icon: <ListTree className="w-4 h-4" />, color: "text-blue-400" },
    { label: "الوحدات", value: validation.stats.units, icon: <BookOpen className="w-4 h-4" />, color: "text-indigo-400" },
    { label: "الدروس", value: validation.stats.lessons, icon: <FileText className="w-4 h-4" />, color: "text-purple-400" },
    { label: "المعامل", value: validation.stats.labs, icon: <BookOpen className="w-4 h-4" />, color: "text-orange-400" },
    { label: "الاختبارات", value: validation.stats.exams, icon: <BarChart3 className="w-4 h-4" />, color: "text-amber-400" },
  ] : [];

  const issueIcon = (type: string) =>
    type === "error" ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;

  const pathColor = (path: string) => {
    if (path.startsWith("level")) return "text-sky-400";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gold" />
          <h2 className="text-xl font-bold">ملفات التعليمات — القالب الذكي</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
            <RefreshCw className="w-3.5 h-3.5 ml-1" />
            تحميل القالب
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <FileDown className="w-3.5 h-3.5 ml-1" />
            تنزيل القالب
          </Button>
        </div>
      </div>

      {/* Specialty Selector + Version */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>التخصص</Label>
          <select
            className="w-full h-10 px-3 rounded-xl bg-black/30 border border-white/10 text-sm"
            value={selectedSubjectId}
            onChange={(e) => { setSelectedSubjectId(e.target.value); setValidation(null); }}
          >
            {allSubjectsFlat.map((s) => (
              <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>عنوان الملف (عربي)</Label>
          <Input
            dir="rtl"
            placeholder="مثال: توجيهات أمن المعلومات"
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>الإصدار</Label>
          <Input
            placeholder="1.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
      </div>

      {/* Tab Bar: Editor / Files */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-4 py-2 text-sm rounded-t-lg font-medium transition-colors ${
            activeTab === "editor" ? "bg-gold/10 text-gold border-b-2 border-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المحرر والتحقق
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`px-4 py-2 text-sm rounded-t-lg font-medium transition-colors ${
            activeTab === "files" ? "bg-gold/10 text-gold border-b-2 border-gold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          الملفات المحفوظة ({files.length})
        </button>
      </div>

      {/* Editor Tab */}
      {activeTab === "editor" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">محتوى ملف التعليمات (JSON)</Label>
              <div className="flex gap-2 items-center">
                <button onClick={formatJSON} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" title="تنسيق JSON">
                  <Code2 className="w-3.5 h-3.5" />
                  تنسيق
                </button>
                <span className="text-xs text-muted-foreground">{content.length.toLocaleString()} حرف</span>
              </div>
            </div>
            <div className="h-[600px] rounded-xl overflow-hidden border border-white/10">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={content}
                onChange={(val) => { setContent(val ?? ""); setValidation(null); }}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  renderWhitespace: "selection",
                  bracketPairColorization: { enabled: true },
                  autoClosingBrackets: "always",
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleValidate}
                disabled={isValidating || !content.trim()}
                className="flex-1"
              >
                {isValidating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                {isValidating ? "جاري التحليل..." : "تحقق من الملف"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                variant="secondary"
                className="flex-1"
              >
                {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                {isSaving ? "جاري الحفظ..." : "حفظ الملف"}
              </Button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            {!validation && (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-3 bg-black/20 rounded-2xl border border-dashed border-white/10 p-8">
                <FileText className="w-12 h-12 opacity-30" />
                <p className="text-sm">اضغط "تحقق من الملف" لرؤية النتائج</p>
              </div>
            )}

            {validation && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  {statsCards.map((stat) => (
                    <Card key={stat.label} className="glass border-white/5 p-3 text-center">
                      <div className={`${stat.color} flex justify-center mb-1`}>{stat.icon}</div>
                      <div className="text-xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </Card>
                  ))}
                </div>

                {/* Overall Status */}
                <div className="flex flex-wrap gap-3">
                  <Badge variant={validation.stats.errors === 0 ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                    {validation.stats.errors === 0 ? <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> : <AlertCircle className="w-3.5 h-3.5 ml-1" />}
                    {validation.stats.errors} خطأ
                  </Badge>
                  <Badge variant={validation.stats.warnings === 0 ? "secondary" : "default"} className="text-sm px-3 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 ml-1" />
                    {validation.stats.warnings} تحذير
                  </Badge>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    <FileText className="w-3.5 h-3.5 ml-1" />
                    {validation.stats.totalFields} حقل
                  </Badge>
                  {validation.stats.emptyFields > 0 && (
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                      <X className="w-3.5 h-3.5 ml-1" />
                      {validation.stats.emptyFields} حقل فارغ
                    </Badge>
                  )}
                </div>

                {/* Issues List */}
                {validation.issues.length > 0 && (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                    <Label className="text-sm text-muted-foreground">المشاكل ({validation.issues.length})</Label>
                    {validation.issues.map((issue, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                          issue.type === "error" ? "bg-red-500/5 border border-red-500/20" : "bg-amber-500/5 border border-amber-500/20"
                        }`}
                      >
                        {issueIcon(issue.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold mb-0.5">{issue.message}</p>
                          <div className="flex flex-wrap gap-2">
                            <span className={`text-[10px] font-mono ${pathColor(issue.path)}`}>
                              {issue.path || "—"}
                            </span>
                            {issue.field && (
                              <span className="text-[10px] text-muted-foreground">
                                {issue.field}
                              </span>
                            )}
                            {issue.line && (
                              <span className="text-[10px] text-muted-foreground">
                                سطر {issue.line}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {validation.issues.length === 0 && (
                  <div className="flex items-center justify-center gap-2 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">ملف التعليمات صحيح — لا توجد مشاكل!</span>
                  </div>
                )}

                {/* Specialty Info */}
                {validation.specialty && (
                  <Card className="glass border-white/5 p-4">
                    <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gold" />
                      معلومات التخصص
                    </h4>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p><span className="text-foreground">الاسم:</span> {validation.specialty.name}</p>
                      {Object.entries(validation.specialty.fields).map(([key, val]) => (
                        <p key={key}><span className="text-foreground">{key}:</span> {val}</p>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Files Tab */}
      {activeTab === "files" && (
        <div className="space-y-3">
          {isLoadingFiles && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoadingFiles && files.length === 0 && (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <FileText className="w-12 h-12 opacity-30" />
              <p className="text-sm">لا توجد ملفات تعليمات محفوظة لهذا التخصص</p>
              <p className="text-xs">عد إلى المحرر وأنشئ ملفاً جديداً</p>
            </div>
          )}
          {files.map((file) => (
            <Card key={file.id} className={`glass border-white/5 p-4 ${file.isActive ? "border-gold/30" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{file.titleAr || file.title}</h4>
                    {file.isActive && <Badge variant="secondary" className="text-[10px]">نشط</Badge>}
                    <Badge variant="outline" className="text-[10px]">v{file.version}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {file.content.length.toLocaleString()} حرف — آخر تحديث: {new Date(file.updatedAt).toLocaleDateString("ar-YE")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(file.content)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={(o) => { if (!o) setShowPreview(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogTitle className="sr-only">معاينة ملف التعليمات</DialogTitle>
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5 overflow-x-auto">
            {(() => { try { return JSON.stringify(JSON.parse(showPreview!), null, 2); } catch { return showPreview; } })()}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
