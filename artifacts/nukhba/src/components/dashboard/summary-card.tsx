import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import { sanitizeRichHtml } from "@/lib/sanitize-html";
import { LessonSummary } from "./types";
import { useLang } from "@/lib/lang-context";

export function SummaryCard({ summary }: { summary: LessonSummary }) {
  const { tr, lang } = useLang();
  const ts = tr.dashboard.subject;
  const [expanded, setExpanded] = useState(false);
  const date = new Date(summary.conversationDate).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
  const safeHtml = sanitizeRichHtml(summary.summaryHtml);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(10,13,22,0.85))",
        border: "1px solid rgba(245,158,11,0.18)",
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-right p-5 min-h-[64px] flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-gold" />
          </div>
          <div className="text-right min-w-0">
            <h4 className="font-bold text-sm truncate">{summary.title || `${ts.session} ${summary.subjectName}`}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {summary.subjectName} · {date} · {summary.messagesCount} {ts.message}
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
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="ai-msg" dangerouslySetInnerHTML={{ __html: safeHtml }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
