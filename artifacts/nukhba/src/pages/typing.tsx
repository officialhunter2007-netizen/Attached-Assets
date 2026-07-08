import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { motion } from "framer-motion";
import { Keyboard, ChevronRight } from "lucide-react";
import { sections as enSections, totalLessons as enTotal } from "@/lib/typing-curriculum";
import { sections as arSections, totalLessons as arTotal } from "@/lib/typing-curriculum-ar";

export default function TypingChoice() {
  return (
    <AppLayout>
      <div className="min-h-screen" style={{ direction: "rtl" }}>
        <div className="relative overflow-hidden py-12 px-4">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.10) 0%, transparent 70%)" }}
          />
          <div className="relative max-w-xl mx-auto text-center">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}
            >
              <Keyboard className="w-3.5 h-3.5" />
              تدريب الكتابة
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              اختر لغة التدريب
            </h1>
            <p className="text-sm text-white/40 mb-8">
              تعلم الكتابة السريعة على الكيبورد — اختر العربية أو الإنجليزية
            </p>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 pb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Link href="/typing-ar">
              <div
                className="relative rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(245,158,11,0.06))",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.10), transparent 60%)" }} />
                <div className="relative flex items-center gap-5 px-6 py-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    🇾🇪
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-lg text-white">العربية</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}
                      >
                        جديد
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {arSections.length} قسم · {arTotal} درس · الصف الرئيسي حتى السرعة الكاملة
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 rotate-180 group-hover:-translate-x-1 transition-transform" style={{ color: "#10B981" }} />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Link href="/typing-en">
              <div
                className="relative rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(59,130,246,0.06))",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.10), transparent 60%)" }} />
                <div className="relative flex items-center gap-5 px-6 py-5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}
                  >
                    🇺🇸
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-lg text-white">English</span>
                    </div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {enSections.length} sections · {enTotal} lessons · Home row to full speed
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "#6366f1" }} />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="text-center pt-4"
          >
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
              يمكنك التدريب على كلا اللغتين — تقدمك يُحفظ بشكل منفصل
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
