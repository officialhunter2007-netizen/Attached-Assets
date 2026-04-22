import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene10() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Logo
      setTimeout(() => setPhase(2), 2500), // Tagline
      setTimeout(() => setPhase(3), 4000), // Final text
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#080a11]" {...transitionWait}>
      
      {/* Ambient background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-amber-500/30 blur-[2px]"
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
            }}
            animate={{
              y: [`${Math.random() * 100}vh`, `-10vh`],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo Lockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <h1 className="text-[12vw] font-black leading-none bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            نُخبة
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-[3vw] text-slate-300 mt-6 font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          معلّم خاص لكل طالب — في كل مادة
        </motion.p>

        {/* Final CTA Visual */}
        <motion.div
          className="mt-16 px-12 py-4 border-2 border-amber-500/30 rounded-full bg-amber-500/10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 1, type: 'spring' }}
        >
          <span className="text-2xl text-amber-400 font-bold tracking-wider">ابدأ رحلتك التعليميّة الآن</span>
        </motion.div>

      </div>
    </motion.div>
  );
}
