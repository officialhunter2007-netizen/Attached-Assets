// ─────────────────────────────────────────────────────────────────────────────
// v4 task #3 — path choice screen.
//
// Entry point when a student opens a v4-enabled subject for the first time.
// Offers exactly two options per spec: المسار المخصص (built in this task)
// and مسار ملازم جامعية (task #8 placeholder — disabled with a "قريباً"
// hint so the spec wording is visible to the student today).
//
// If the specialty has no published instruction file (v4 task #1 gate),
// this page shows a "غير متاح بعد" empty state and a back button.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, ChevronRight, Lock, Loader2 } from "lucide-react";

type PathInfo = {
  available: boolean;
  specialty?: { slug: string; name: string; description: string | null; icon: string | null; levelCount: number; lessonCount: number };
  existingPath?: { startMode: string; startingLevelIndex: number; currentLessonCode: string | null; unlockedCount: number } | null;
};

export default function PathChoice() {
  const [, params] = useRoute<{ slug: string }>("/path/:slug");
  const slug = params?.slug ?? "";
  const [, navigate] = useLocation();
  const [info, setInfo] = useState<PathInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v4/path/${encodeURIComponent(slug)}`, { credentials: "include" });
        if (!r.ok) throw new Error(`http_${r.status}`);
        const data: PathInfo = await r.json();
        if (cancelled) return;
        setInfo(data);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message ?? e));
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!info && !err) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 bg-background" style={{ direction: "rtl" }}>
        <div className="text-5xl">⚠️</div>
        <p className="text-white/70">تعذّر تحميل التخصص. حاول مجدداً.</p>
        <button onClick={() => navigate("/learn")} className="px-4 py-2 rounded-xl bg-white/10 text-white">رجوع</button>
      </div>
    );
  }
  if (!info!.available) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-6 bg-background" style={{ direction: "rtl" }}>
        <div className="text-6xl">🚧</div>
        <h1 className="text-2xl font-black text-white">هذا التخصص لم يُجهَّز بعد</h1>
        <p className="text-white/60 text-center max-w-md text-sm leading-relaxed">
          الأدمن لم ينشر ملف التعليمات لهذا التخصص. عُد قريباً — أو تصفّح التخصصات المتاحة.
        </p>
        <button
          onClick={() => navigate("/learn")}
          className="px-5 py-2.5 rounded-xl bg-gold text-black font-bold text-sm hover:bg-amber-400 transition-colors"
        >
          الرجوع للتخصصات
        </button>
      </div>
    );
  }

  const sp = info!.specialty!;
  const hasExistingPath = !!info!.existingPath;

  return (
    <div className="min-h-[100dvh] bg-background text-white py-10 px-4" style={{ direction: "rtl", fontFamily: "Tajawal, Cairo, sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">{sp.icon ?? "📚"}</div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">{sp.name}</h1>
          {sp.description && <p className="text-white/60 text-sm">{sp.description}</p>}
          <p className="text-xs text-white/40 mt-2">
            {sp.levelCount} مراحل • {sp.lessonCount} درساً
          </p>
        </div>

        {hasExistingPath && (
          <div className="glass rounded-2xl border border-emerald/30 bg-emerald/5 p-4 mb-6 text-sm text-emerald/90">
            عندك مسار جاهز في هذا التخصص. تقدر تكمل من حيث وقفت، أو تعيد إعداد المسار بضغط أحد الخيارات تحت.
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">اختر نوع المسار</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* المسار المخصص */}
          <motion.button
            whileHover={{ y: -2 }}
            onClick={() => navigate(`/path/${encodeURIComponent(slug)}/custom`)}
            className="relative text-right glass rounded-2xl border border-gold/30 hover:border-gold/60 p-5 transition-colors group"
          >
            {/* Recommended badge */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30 whitespace-nowrap">
              <Sparkles className="w-3 h-3" />
              موصى به
            </span>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg">مسارك المخصص</h3>
                <span className="text-[11px] text-gold/80">يبدأ من نقطتك أنت</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gold/60 group-hover:translate-x-[-2px] transition-transform" />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">نسألك ٥ أسئلة سريعة (طموحك، مستواك، وقتك)، وبعدها  تبدأ من الصفر </p>
          </motion.button>

          {/* مسار الملازم — task #8 */}
          <motion.button
            whileHover={{ y: -2 }}
            onClick={() => navigate(`/path/${encodeURIComponent(slug)}/booklet`)}
            className="text-right glass rounded-2xl border border-emerald/30 hover:border-emerald/60 p-5 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald/15 border border-emerald/40 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg">مسار ملازم جامعية</h3>
                <span className="text-[11px] text-emerald/80">ارفع ملزمتك واتعلم منها مباشرة</span>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald/60 group-hover:translate-x-[-2px] transition-transform" />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              ارفع ملزمة مقرّر جامعتك (PDF). نحلّلها تلقائياً ونقسّمها لوحدات ودروس،
              ثم يشرحلك المعلم منها صفحة-صفحة مع الاستشهاد بأرقام الصفحات.
            </p>
          </motion.button>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("/learn")}
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← العودة للتخصصات
          </button>
        </div>
      </div>
    </div>
  );
}
