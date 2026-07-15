import { useEffect, useState, useRef, useCallback } from "react";
import { validateQuizHtml } from "@/lib/validate-quiz-html";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── All specialties & skills grouped ────────────────────────────────────────
const SPECIALTY_GROUPS = [
  {
    label: "🎓 المسارات الجامعية",
    items: [
      { slug: "uni-it",           name: "تقنية المعلومات" },
      { slug: "uni-cybersecurity",name: "أمن سيبراني" },
      { slug: "uni-data-science", name: "علوم بيانات" },
      { slug: "uni-accounting",   name: "محاسبة" },
      { slug: "uni-business",     name: "إدارة أعمال" },
      { slug: "uni-software-eng", name: "هندسة برمجية" },
      { slug: "uni-ai",           name: "ذكاء اصطناعي" },
      { slug: "uni-mobile",       name: "تطوير موبايل" },
      { slug: "uni-cloud",        name: "حوسبة سحابية" },
      { slug: "uni-networks",     name: "شبكات متقدمة" },
      { slug: "uni-food-eng",     name: "هندسة غذائية" },
    ],
  },
  {
    label: "🌐 بناء الويب",
    items: [
      { slug: "skill-html", name: "HTML" },
      { slug: "skill-css",  name: "CSS" },
      { slug: "skill-js",   name: "JavaScript" },
    ],
  },
  {
    label: "💻 لغات البرمجة",
    items: [
      { slug: "skill-python", name: "Python" },
      { slug: "skill-cpp",    name: "C++" },
      { slug: "skill-c",      name: "C" },
      { slug: "skill-java",   name: "Java" },
    ],
  },
  {
    label: "📱 تطوير التطبيقات",
    items: [
      { slug: "skill-flutter", name: "Flutter" },
    ],
  },
  {
    label: "🗄️ قواعد البيانات",
    items: [
      { slug: "skill-sql", name: "SQL وقواعد البيانات" },
    ],
  },
  {
    label: "⚙️ أنظمة التشغيل",
    items: [
      { slug: "skill-linux",      name: "Linux" },
      { slug: "skill-windows",    name: "Windows" },
      { slug: "skill-bash",       name: "Bash Scripting" },
      { slug: "skill-powershell", name: "PowerShell" },
    ],
  },
  {
    label: "🔌 الشبكات",
    items: [
      { slug: "skill-net-basics", name: "أساسيات الشبكات" },
    ],
  },
  {
    label: "🔒 أدوات الأمن",
    items: [
      { slug: "skill-nmap",      name: "Nmap" },
      { slug: "skill-wireshark", name: "Wireshark" },
    ],
  },
  {
    label: "📊 برامج المكتب",
    items: [
      { slug: "skill-excel", name: "Excel المتقدّم" },
    ],
  },
  {
    label: "🏢 أنظمة ERP",
    items: [
      { slug: "skill-yemensoft", name: "يمن سوفت" },
    ],
  },
];

// flat map for display lookup
const SLUG_NAME: Record<string, string> = {};
SPECIALTY_GROUPS.forEach(g => g.items.forEach(i => { SLUG_NAME[i.slug] = i.name; }));

interface QuizRow {
  id: number;
  unit_code: string;
  specialty_slug: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const API = "/api/v4/admin/unit-quizzes";

export default function AdminUnitQuizzes() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuizRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  // form state
  const [fUnitCode, setFUnitCode] = useState("");
  const [fSlug, setFSlug] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fHtml, setFHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".html") && file.type !== "text/html") {
      setError("يُقبل فقط ملفات .html");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setFHtml(text);
      setError(null);
      setSuccess(null);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(API, { credentials: "include" });
      const d = await r.json();
      setQuizzes(d.quizzes ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setSelected(null);
    setIsNew(true);
    setFUnitCode(""); setFSlug(""); setFTitle(""); setFHtml("");
    setError(null); setSuccess(null);
  };

  const openEdit = (q: QuizRow) => {
    setSelected(q);
    setIsNew(false);
    setFUnitCode(q.unit_code);
    setFSlug(q.specialty_slug);
    setFTitle(q.title);
    setFHtml("");
    // fetch the full HTML from the view endpoint (html_content is not in the list response)
    fetch(`/api/v4/unit-quizzes/${q.id}/view`, { credentials: "include" })
      .then(r => r.text())
      .then(html => setFHtml(html));
    setError(null); setSuccess(null);
  };

  const save = async () => {
    setError(null); setSuccess(null);
    if (!fUnitCode.trim() || !fSlug.trim() || !fHtml.trim()) {
      setError("كود الوحدة والتخصص ومحتوى HTML مطلوبة");
      return;
    }
    const htmlCheck = validateQuizHtml(fHtml);
    if (!htmlCheck.valid) { setError(htmlCheck.error); return; }
    setSaving(true);
    try {
      const body = { unit_code: fUnitCode.trim(), specialty_slug: fSlug.trim(), title: fTitle.trim(), html_content: fHtml };
      const url  = isNew ? API : `${API}/${selected!.id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "خطأ غير متوقع"); return; }
      setSuccess(isNew ? "تم إنشاء الاختبار بنجاح ✓" : "تم حفظ التعديلات ✓");
      await load();
      // re-select updated
      if (d.quiz) {
        setSelected(d.quiz);
        setIsNew(false);
        setFUnitCode(d.quiz.unit_code);
        setFSlug(d.quiz.specialty_slug);
        setFTitle(d.quiz.title);
      }
    } catch (e: any) {
      setError(e?.message ?? "خطأ في الشبكة");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (id: number) => {
    const r = await fetch(`${API}/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { setError("فشل الحذف، حاول مرة أخرى"); return; }
    await load();
    if (selected?.id === id) {
      setSelected(null); setIsNew(false);
      setFUnitCode(""); setFSlug(""); setFTitle(""); setFHtml("");
    }
  };

  const preview = () => {
    if (!selected) {
      // open blob for unsaved
      const blob = new Blob([fHtml], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    } else {
      window.open(`/api/v4/unit-quizzes/${selected.id}/view`, "_blank");
    }
  };

  // group by specialty
  const grouped = quizzes.reduce<Record<string, QuizRow[]>>((acc, q) => {
    (acc[q.specialty_slug] ||= []).push(q);
    return acc;
  }, {});

  const showForm = isNew || selected !== null;

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ── Left: list ──────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <Button size="sm" onClick={openNew} className="w-full">
          + اختبار وحدة جديد
        </Button>
        <ScrollArea className="flex-1 border rounded-lg">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">جارٍ التحميل...</div>
          ) : quizzes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">لا توجد اختبارات بعد</div>
          ) : (
            <div className="p-2 space-y-3">
              {Object.entries(grouped).map(([slug, rows]) => (
                <div key={slug}>
                  <div className="px-2 py-1 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {SLUG_NAME[slug] ?? slug}
                    <span className="mr-1 opacity-50">({slug})</span>
                  </div>
                  <div className="space-y-1">
                    {rows.map(q => (
                      <button
                        key={q.id}
                        onClick={() => openEdit(q)}
                        className={`w-full text-right px-3 py-2 rounded-md text-sm transition-colors ${
                          selected?.id === q.id
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <div className="font-mono text-xs text-muted-foreground">{q.unit_code}</div>
                        <div className="font-medium truncate">{q.title || "بدون عنوان"}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <Separator orientation="vertical" />

      {/* ── Right: editor ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!showForm ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            اختر اختباراً من القائمة أو أنشئ اختباراً جديداً
          </div>
        ) : (
          <>
            {/* header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {isNew ? "اختبار جديد" : `تعديل: ${selected?.unit_code} · ${SLUG_NAME[selected?.specialty_slug ?? ""] ?? selected?.specialty_slug}`}
              </h3>
              <div className="flex gap-2">
                {fHtml && (
                  <Button variant="outline" size="sm" onClick={preview}>
                    👁 معاينة
                  </Button>
                )}
                {!isNew && selected && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">حذف</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف اختبار الوحدة <strong>{selected.unit_code}</strong> نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteQuiz(selected.id)}>
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* meta fields */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">كود الوحدة <span className="text-red-500">*</span></Label>
                <Input
                  value={fUnitCode}
                  onChange={e => setFUnitCode(e.target.value)}
                  placeholder="مثال: 1.1.1"
                  dir="ltr"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">التخصص <span className="text-red-500">*</span></Label>
                <Select value={fSlug} onValueChange={setFSlug}>
                  <SelectTrigger className="font-mono text-sm w-full" dir="ltr">
                    <SelectValue placeholder="اختر التخصص..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SPECIALTY_GROUPS.map(group => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs text-muted-foreground">{group.label}</SelectLabel>
                        {group.items.map(item => (
                          <SelectItem key={item.slug} value={item.slug} className="font-mono text-xs">
                            <span className="text-muted-foreground ml-1">{item.slug}</span>
                            <span className="mr-2 font-sans text-sm">{item.name}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">عنوان الاختبار</Label>
                <Input
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  placeholder="مثال: المنطق الرقمي وأنظمة الترقيم"
                />
              </div>
            </div>

            {/* HTML editor */}
            <div className="flex-1 flex flex-col min-h-0 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  محتوى HTML الكامل للاختبار <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  {fHtml && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {(fHtml.length / 1024).toFixed(1)} كيلوبايت
                    </Badge>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,text/html"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📂 رفع ملف HTML
                  </Button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={fHtml}
                onChange={e => setFHtml(e.target.value)}
                className="flex-1 w-full font-mono text-xs bg-muted/30 border rounded-md p-3 resize-none outline-none focus:ring-1 focus:ring-primary min-h-[280px]"
                dir="ltr"
                spellCheck={false}
                placeholder={`<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>...</head>\n<body>\n  <!-- اختبارك هنا -->\n  <script>\n    // عند انتهاء التصحيح:\n    window.submitScore(درجة); // من 0 إلى 100\n  </script>\n</body>\n</html>`}
              />
              <p className="text-xs text-muted-foreground">
                ارفع ملف <code className="bg-muted px-1 rounded">.html</code> أو الصق الكود مباشرة. يجب أن يستدعي الاختبار <code className="bg-muted px-1 rounded">window.submitScore(درجة)</code> عند انتهاء التصحيح.
              </p>
            </div>

            {/* feedback */}
            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-md px-3 py-2">
                {success}
              </div>
            )}

            {/* save */}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="min-w-[120px]">
                {saving ? "جارٍ الحفظ..." : isNew ? "إنشاء الاختبار" : "حفظ التعديلات"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
