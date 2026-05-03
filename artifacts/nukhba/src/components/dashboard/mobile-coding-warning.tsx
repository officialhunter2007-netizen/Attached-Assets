import { motion } from "framer-motion";
import { Monitor, X } from "lucide-react";

export const getMobileCodingDismissKey = (userId: string) => `nukhba_coding_mobile_dismissed_${userId}`;

export function MobileCodingWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-l from-amber-500/20 via-orange-500/15 to-amber-500/20 p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-x-6 -translate-y-6" />
      <button
        onClick={onDismiss}
        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
          <Monitor className="w-7 h-7 text-amber-400" />
        </div>
        <div className="flex-1 pt-1">
          <h3 className="font-bold text-amber-300 text-base mb-1">تجربة أفضل على الكمبيوتر</h3>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            أنت مشترك في مواد برمجية تحتاج محرر أكواد — استخدم جهاز كمبيوتر أو لابتوب للحصول على أفضل تجربة تعليمية مع محرر الأكواد التفاعلي.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
