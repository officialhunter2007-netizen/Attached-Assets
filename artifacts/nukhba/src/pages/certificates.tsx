// ─────────────────────────────────────────────────────────────────────────────
// /certificates — student certificates page
// Lists all earned certificates; click any to preview + download PDF.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Download, X, GraduationCap, Shield, ArrowRight,
  Star, BadgeCheck, Loader2, BookOpen, ChevronDown,
} from "lucide-react";
import CertificateRenderer from "@/components/certificate-renderer";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface CertRow {
  id: number;
  user_id: number;
  exam_pass_id: number | null;
  type: "specialty_complete" | "level_exam" | "stage_exam" | "unit_exam";
  specialty_slug: string;
  specialty_name: string;
  scope_label: string;
  exam_code: string | null;
  score_pct: number;
  verification_code: string;
  issued_at: string;
  key_topics: string[];
}

interface QuizScoreRecord {
  id: number;
  quiz_type: "unit" | "level" | "stage";
  quiz_id: number;
  score: number;
  best_score: number;
  attempts: number;
  last_attempted_at: string;
  title: string;
  // unit
  unit_code?: string;
  // level & stage
  level_index?: number;
  // stage
  stage_index?: number;
}

interface SpecialtyQuizScores {
  unitScores:  QuizScoreRecord[];
  levelScores: QuizScoreRecord[];
  stageScores: QuizScoreRecord[];
}

const typeConfig: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  specialty_complete: {
    label: "إتمام التخصص كاملاً",
    color: "#D4AF37",
    bg: "rgba(212,175,55,0.1)",
    border: "rgba(212,175,55,0.35)",
    icon: <BadgeCheck className="w-3.5 h-3.5" />,
  },
  level_exam: {
    label: "اجتياز المستوى",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.35)",
    icon: <Star className="w-3.5 h-3.5" />,
  },
  stage_exam: {
    label: "اجتياز المرحلة",
    color: "#6366F1",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.35)",
    icon: <Award className="w-3.5 h-3.5" />,
  },
  unit_exam: {
    label: "اجتياز الوحدة",
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.1)",
    border: "rgba(14,165,233,0.3)",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
};

function formatDateAr(iso: string) {
  return new Date(iso).toLocaleDateString("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Certificate card ──────────────────────────────────────────────────────────
function CertCard({
  cert,
  onClick,
}: {
  cert: CertRow;
  onClick: () => void;
}) {
  const cfg = typeConfig[cert.type] ?? typeConfig.unit_exam;
  const isSpecialty = cert.type === "specialty_complete";

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl p-5 relative overflow-hidden group"
      style={{
        background: "rgba(10,12,24,0.9)",
        border: `1px solid ${cfg.border}`,
        boxShadow: isSpecialty
          ? `0 0 28px rgba(212,175,55,0.12), 0 4px 16px rgba(0,0,0,0.4)`
          : `0 4px 16px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Glow top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
      />

      {/* Ambient corner glow */}
      {isSpecialty && (
        <div
          className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 100% 0%, rgba(212,175,55,0.12) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Type badge */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-3"
        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      >
        {cfg.icon}
        {cfg.label}
      </div>

      {/* Specialty */}
      <h3 className="text-base font-black text-white mb-1 leading-snug">
        {cert.specialty_name}
      </h3>

      {/* Scope */}
      {cert.scope_label && cert.type !== "specialty_complete" && (
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
          {cert.scope_label}
        </p>
      )}
      {cert.type === "specialty_complete" && (
        <p className="text-xs mb-3" style={{ color: "rgba(212,175,55,0.6)" }}>
          ✦ إتمام جميع مستويات التخصص
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Score */}
        <div
          className="text-lg font-black"
          style={{ color: cfg.color }}
        >
          {cert.score_pct}%
        </div>

        {/* Date */}
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          {formatDateAr(cert.issued_at)}
        </div>

        {/* View arrow */}
        <div
          className="flex items-center gap-1 text-[10px] font-bold opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ color: cfg.color }}
        >
          عرض
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Certificates() {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertRow | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // reset expansion when cert changes
  const handleSelectCert = (cert: CertRow) => {
    setSelectedCert(cert);
    setQuizScoresExpanded(false);
  };
  const pdfRef = useRef<HTMLDivElement>(null);

  // quiz scores keyed by specialty_slug
  const [quizScores, setQuizScores] = useState<Record<string, SpecialtyQuizScores>>({});
  const [quizScoresExpanded, setQuizScoresExpanded] = useState(false);

  const fetchQuizScores = useCallback(async (slugs: string[]) => {
    const results: Record<string, SpecialtyQuizScores> = {};
    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const r = await fetch(
            `/api/v4/quiz-scores?specialty_slug=${encodeURIComponent(slug)}`,
            { credentials: "include" }
          );
          if (!r.ok) return;
          const data = await r.json();
          results[slug] = {
            unitScores:  data.unitScores  ?? [],
            levelScores: data.levelScores ?? [],
            stageScores: data.stageScores ?? [],
          };
        } catch {}
      })
    );
    setQuizScores(results);
  }, []);

  useEffect(() => {
    fetch("/api/v4/certificates", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((data) => {
        setStudentName(data.studentName ?? "");
        const rows: CertRow[] = Array.isArray(data.certificates) ? data.certificates : [];
        setCerts(rows);
        // Fetch quiz scores for all unique specialties in parallel
        const slugs = [...new Set(rows.map((c) => c.specialty_slug))];
        if (slugs.length > 0) fetchQuizScores(slugs);
      })
      .catch(() => setError("حدث خطأ في تحميل الشهادات"))
      .finally(() => setLoading(false));
  }, [fetchQuizScores]);

  async function downloadPDF() {
    if (!selectedCert || !pdfRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#070B18",
        logging: false,
        width: 900,
        height: 638,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [900, 638],
        compress: true,
      });
      pdf.addImage(imgData, "JPEG", 0, 0, 900, 638);
      pdf.save(`شهادة-${selectedCert.specialty_name}-نُخبة.pdf`);
    } catch (e) {
      console.error("[certificates] PDF error", e);
    } finally {
      setIsDownloading(false);
    }
  }

  const specialtyCount = certs.filter((c) => c.type === "specialty_complete").length;
  const levelCount = certs.filter((c) => c.type !== "specialty_complete").length;

  return (
    <AppLayout>
      <div className="relative min-h-screen" style={{ direction: "rtl" }}>
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80"
            style={{
              background: "radial-gradient(ellipse, rgba(212,175,55,0.09) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />
          <div
            className="absolute top-0 left-0 w-full h-px"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)",
            }}
          />
        </div>

        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-5xl">

          {/* Back link */}
          <Link href="/learn">
            <button
              className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              العودة للتعلم
            </button>
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-10"
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}
              >
                <GraduationCap className="w-5 h-5" style={{ color: "#D4AF37" }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">شهاداتي</h1>
                {!loading && certs.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {specialtyCount > 0 && `${specialtyCount} شهادة تخصص · `}
                    {levelCount > 0 && `${levelCount} شهادة مستوى`}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#D4AF37" }} />
            </div>
          )}

          {!loading && error && (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && certs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
              >
                <GraduationCap className="w-9 h-9" style={{ color: "rgba(212,175,55,0.5)" }} />
              </div>
              <h2 className="text-lg font-black text-white mb-2">لا توجد شهادات بعد</h2>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                أتمم اختبارات المستويات في أي تخصص لتحصل على شهادتك
              </p>
              <Link href="/learn">
                <button
                  className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    color: "#D4AF37",
                  }}
                >
                  ابدأ التعلم
                </button>
              </Link>
            </motion.div>
          )}

          {/* Grid */}
          {!loading && !error && certs.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {certs.map((cert, i) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CertCard cert={cert} onClick={() => handleSelectCert(cert)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Certificate modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCert && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto py-4 px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
              onClick={() => setSelectedCert(null)}
            />

            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative z-10 w-full max-w-[950px] rounded-3xl overflow-hidden"
              style={{
                background: "rgba(8,10,20,0.97)",
                border: "1px solid rgba(212,175,55,0.25)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.1)",
              }}
            >
              {/* Top bar */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" style={{ color: "#D4AF37" }} />
                  <span className="text-sm font-bold text-white">
                    {selectedCert.specialty_name}
                    {selectedCert.type !== "specialty_complete" && selectedCert.scope_label && (
                      <span className="font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {" · "}{selectedCert.scope_label}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Certificate preview (horizontally scrollable + scaled on small screens) */}
              <div className="p-4 overflow-x-auto flex justify-center bg-[#040609]">
                <div
                  style={{
                    transform: `scale(${Math.min(1, Math.max(0.5, (Math.min(window.innerWidth, 950) - 48) / 900))})`,
                    transformOrigin: "top center",
                    // Height compensation for scale
                    marginBottom: `${(638 * Math.min(1, Math.max(0.5, (Math.min(window.innerWidth, 950) - 48) / 900)) - 638)}px`,
                  }}
                >
                  <CertificateRenderer cert={selectedCert} studentName={studentName} />
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center justify-between px-5 py-4 gap-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Verification info */}
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" style={{ color: "rgba(212,175,55,0.6)" }} />
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "rgba(212,175,55,0.55)", letterSpacing: 1.5 }}
                  >
                    {selectedCert.verification_code}
                  </span>
                </div>

                {/* Download */}
                <button
                  onClick={downloadPDF}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: isDownloading
                      ? "rgba(212,175,55,0.12)"
                      : "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.12))",
                    border: "1px solid rgba(212,175,55,0.4)",
                    color: "#D4AF37",
                  }}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isDownloading ? "جارٍ إنشاء PDF…" : "تنزيل PDF"}
                </button>
              </div>

              {/* ── Quiz scores section ───────────────────────────────── */}
              {(() => {
                const qs = quizScores[selectedCert.specialty_slug];
                const total =
                  (qs?.unitScores.length  ?? 0) +
                  (qs?.levelScores.length ?? 0) +
                  (qs?.stageScores.length ?? 0);
                if (!qs || total === 0) return null;

                const avgBest = (arr: QuizScoreRecord[]) =>
                  arr.length === 0 ? null :
                  Math.round(arr.reduce((s, r) => s + r.best_score, 0) / arr.length);

                const ScoreBar = ({ score, color }: { score: number; color: string }) => (
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="flex-1 rounded-full overflow-hidden"
                      style={{ height: 4, background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${score}%`, background: color }}
                      />
                    </div>
                    <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>
                      {score}%
                    </span>
                  </div>
                );

                return (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* Toggle header */}
                    <button
                      onClick={() => setQuizScoresExpanded((v) => !v)}
                      className="w-full flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                        <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
                          درجات الاختبارات
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
                        >
                          {total}
                        </span>
                      </div>
                      <ChevronDown
                        className="w-4 h-4 transition-transform"
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          transform: quizScoresExpanded ? "rotate(180deg)" : "none",
                        }}
                      />
                    </button>

                    {/* Expandable body */}
                    <AnimatePresence>
                      {quizScoresExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="px-5 pb-5 space-y-4">
                            {/* Level quizzes */}
                            {qs.levelScores.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(139,92,246,0.7)" }}>
                                  اختبارات المستويات
                                  {avgBest(qs.levelScores) !== null && (
                                    <span className="mr-2 font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
                                      متوسط: {avgBest(qs.levelScores)}%
                                    </span>
                                  )}
                                </p>
                                <div className="space-y-2">
                                  {qs.levelScores.map((r) => (
                                    <div key={r.id} className="flex items-center gap-3">
                                      <span className="text-[11px] w-24 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                                        {r.title || `مستوى ${(r.level_index ?? 0) + 1}`}
                                      </span>
                                      <ScoreBar score={r.best_score} color="#8B5CF6" />
                                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                                        ×{r.attempts}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Stage quizzes */}
                            {qs.stageScores.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(99,102,241,0.7)" }}>
                                  اختبارات المراحل
                                  {avgBest(qs.stageScores) !== null && (
                                    <span className="mr-2 font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
                                      متوسط: {avgBest(qs.stageScores)}%
                                    </span>
                                  )}
                                </p>
                                <div className="space-y-2">
                                  {qs.stageScores.map((r) => (
                                    <div key={r.id} className="flex items-center gap-3">
                                      <span className="text-[11px] w-24 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                                        {r.title || `م${(r.level_index ?? 0) + 1}-مرحلة${(r.stage_index ?? 0) + 1}`}
                                      </span>
                                      <ScoreBar score={r.best_score} color="#6366F1" />
                                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                                        ×{r.attempts}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Unit quizzes */}
                            {qs.unitScores.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(14,165,233,0.7)" }}>
                                  اختبارات الوحدات
                                  {avgBest(qs.unitScores) !== null && (
                                    <span className="mr-2 font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
                                      متوسط: {avgBest(qs.unitScores)}%
                                    </span>
                                  )}
                                </p>
                                <div className="space-y-2">
                                  {qs.unitScores.map((r) => (
                                    <div key={r.id} className="flex items-center gap-3">
                                      <span className="text-[11px] w-24 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                                        {r.title || r.unit_code || `وحدة`}
                                      </span>
                                      <ScoreBar score={r.best_score} color="#0EA5E9" />
                                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                                        ×{r.attempts}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Hidden full-size cert for PDF capture ──────────────────── */}
      <div
        ref={pdfRef}
        style={{
          position: "fixed",
          top: 0,
          left: -2000,
          zIndex: -100,
          pointerEvents: "none",
          width: 900,
          height: 638,
        }}
      >
        {selectedCert && (
          <CertificateRenderer cert={selectedCert} studentName={studentName} />
        )}
      </div>
    </AppLayout>
  );
}
