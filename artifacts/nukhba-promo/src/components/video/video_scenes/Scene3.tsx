import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Q1
      setTimeout(() => setPhase(2), 3000), // Q2
      setTimeout(() => setPhase(3), 5000), // Q3
      setTimeout(() => setPhase(4), 7000), // Q4
      setTimeout(() => setPhase(5), 10000), // Build Path
      setTimeout(() => setPhase(6), 12000), // Show Path
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      
      <motion.h2 
        className="text-[4vw] font-bold text-amber-400 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 && phase < 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        تشخيص في ٤ أسئلة
      </motion.h2>

      <div className="flex gap-4 mb-16 h-20">
        {[1, 2, 3, 4].map(q => (
          <motion.div 
            key={q}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${phase >= q ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-500'}`}
            initial={{ scale: 0 }}
            animate={phase >= 1 && phase < 5 ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 0.2 * q, type: "spring" }}
          >
            {q}
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="w-[80vw] bg-slate-800/80 backdrop-blur rounded-3xl p-12 border border-slate-700"
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={phase >= 5 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 50 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <h3 className="text-[3vw] text-white font-bold text-center mb-12">مسارك التعليمي المخصص</h3>
        <div className="flex justify-between items-center relative">
          <div className="absolute top-1/2 left-10 right-10 h-1 bg-slate-700 -z-10" />
          <motion.div 
            className="absolute top-1/2 right-10 h-1 bg-amber-500 -z-10 origin-right"
            initial={{ scaleX: 0 }}
            animate={phase >= 6 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
          
          {['الأساسيات', 'التطبيق', 'الاختبار'].map((stage, i) => (
            <motion.div 
              key={stage}
              className="flex flex-col items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-700 w-1/4"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 1 + (i * 0.5) }}
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(217,119,6,0.5)]">
                {i + 1}
              </div>
              <span className="text-xl font-bold text-slate-300">{stage}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
