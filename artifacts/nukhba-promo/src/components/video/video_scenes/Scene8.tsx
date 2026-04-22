import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene8() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Progress bars
      setTimeout(() => setPhase(2), 3000), // Second progress bar
      setTimeout(() => setPhase(3), 5000), // Lab reports
      setTimeout(() => setPhase(4), 10000), // Summary card
      setTimeout(() => setPhase(5), 18000), // Exit drift
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12" {...transitionWait}>
      
      <motion.h1 
        className="text-5xl font-black text-white mb-16 text-center"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        تتبع تقدمك بدقة
      </motion.h1>

      <div className="w-[70vw] grid grid-cols-2 gap-12">
        
        {/* Left Column: Progress */}
        <div className="flex flex-col gap-8">
          <motion.div 
            className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex justify-between mb-4">
              <span className="text-xl font-bold text-white">الفصل الأول</span>
              <span className="text-amber-400 font-bold">100%</span>
            </div>
            <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                initial={{ width: "0%" }}
                animate={phase >= 1 ? { width: "100%" } : { width: "0%" }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          <motion.div 
            className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex justify-between mb-4">
              <span className="text-xl font-bold text-white">الفصل الثاني</span>
              <span className="text-indigo-400 font-bold">65%</span>
            </div>
            <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                initial={{ width: "0%" }}
                animate={phase >= 2 ? { width: "65%" } : { width: "0%" }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          <motion.div 
            className="flex gap-4 mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, staggerChildren: 0.2 }}
          >
            {[1, 2, 3].map((i) => (
              <motion.div 
                key={i} 
                className="flex-1 bg-emerald-500/20 border border-emerald-500/50 p-4 rounded-xl text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, delay: i * 0.2 }}
              >
                <span className="text-emerald-400 font-bold block mb-2">تقرير المختبر</span>
                <span className="text-2xl">🧪</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Summary */}
        <motion.div 
          className="bg-slate-800 p-10 rounded-3xl border border-slate-700 flex flex-col"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">ملخّص الجلسة</h3>
          <div className="text-xl text-slate-300 leading-relaxed flex-1 space-y-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1 }}
            >
              • أكملت دراسة التوزيعات الاحتمالية بنجاح.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 2 }}
            >
              • تم تطبيق المفاهيم في المعمل العملي للإحصاء.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 3 }}
            >
              • مستواك يتحسن بزيادة 15% عن الأسبوع الماضي. استمر!
            </motion.p>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
