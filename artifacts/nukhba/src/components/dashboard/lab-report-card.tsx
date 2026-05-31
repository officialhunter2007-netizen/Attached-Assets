import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, FlaskConical } from "lucide-react";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { LabReport } from "./types";
import { useLang } from "@/lib/lang-context";

export function LabReportCard({ report }: { report: LabReport }) {
  const { tr, lang } = useLang();
  const ts = tr.dashboard.subject;
  const [expanded, setExpanded] = useState(false);
  const date = new Date(report.createdAt).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const safeFeedback = sanitizeRichHtml(report.feedbackHtml);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(10,13,22,0.85))",
        border: "1px solid rgba(16,185,129,0.18)",
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 min-h-[64px] flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-emerald" />
          </div>
          <div className="text-right min-w-0">
            <h4 className="font-bold text-sm truncate">{report.envTitle || ts.labReport}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {report.subjectName || report.subjectId} · {date}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {report.envBriefing && (
                <div className="text-xs text-muted-foreground italic">{report.envBriefing}</div>
              )}
              <div>
                <div className="text-xs font-bold text-gold mb-2">{ts.yourReport}</div>
                <pre
                  className="text-xs whitespace-pre-wrap bg-black/30 border border-white/5 rounded-xl p-3 text-white/85 leading-relaxed font-sans"
                  dir="rtl"
                >{report.reportText}</pre>
              </div>
              {safeFeedback ? (
                <div>
                  <div className="text-xs font-bold text-emerald mb-2">{ts.teacherNotes}</div>
                  <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeFeedback }} />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">{ts.noTeacherNotes}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
