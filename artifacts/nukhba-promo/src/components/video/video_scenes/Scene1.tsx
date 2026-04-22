import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      <motion.div 
        className="w-48 h-48 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-600 shadow-[0_0_80px_rgba(217,119,6,0.4)] flex items-center justify-center mb-12"
        initial={{ scale: 0, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <span className="text-white text-8xl font-black">ن</span>
      </motion.div>
      
      <div className="overflow-hidden">
        <motion.h1 
          className="text-[8vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 leading-tight"
          initial={{ y: '100%' }}
          animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          نُخبة
        </motion.h1>
      </div>

      <div className="overflow-hidden mt-6">
        <motion.p 
          className="text-[2.5vw] text-slate-300 font-medium"
          initial={{ y: '100%', opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          معلّم خاص لكل طالب — في كل لحظة، في كل مادة، بكل لغتك.
        </motion.p>
      </div>
    </motion.div>
  );
}
