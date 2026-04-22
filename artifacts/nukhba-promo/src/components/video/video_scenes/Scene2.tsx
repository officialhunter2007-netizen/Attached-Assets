import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 5000),
      setTimeout(() => setPhase(3), 9000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      <motion.div 
        className="text-[6vw] font-black text-white bg-slate-800/50 px-12 py-6 rounded-3xl border border-slate-700 backdrop-blur-md mb-8"
        initial={{ opacity: 0, y: 50 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        ChatGPT <span className="text-amber-500">ليس مصمَّماً لك</span>
      </motion.div>
      
      <div className="flex gap-12 text-[2.5vw] font-bold mt-8 overflow-hidden relative w-full justify-center">
        <motion.div 
          className="text-slate-500 bg-slate-900 px-8 py-4 rounded-xl border border-slate-800 shadow-xl"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          إجابات عامة
        </motion.div>
        
        <motion.div 
          className="text-white bg-amber-600 px-8 py-4 rounded-xl border border-amber-400 shadow-[0_0_40px_rgba(217,119,6,0.4)]"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          منهجك الجامعي
        </motion.div>
      </div>
    </motion.div>
  );
}
