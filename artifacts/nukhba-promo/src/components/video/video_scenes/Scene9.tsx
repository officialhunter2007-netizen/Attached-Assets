import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transitionWait } from '../Shared';

export function Scene9() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Show Question
      setTimeout(() => setPhase(2), 2000), // Show options
      setTimeout(() => setPhase(3), 5000), // Highlight correct
      setTimeout(() => setPhase(4), 12000), // Morph to final exam
      setTimeout(() => setPhase(5), 14000), // Counter animate
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center z-10" {...transitionWait}>
      
      {/* Quiz Question Card */}
      <motion.div 
        className="w-[50vw] bg-slate-800 p-12 rounded-[2rem] border border-slate-700 shadow-2xl relative overflow-hidden"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={phase >= 1 && phase < 4 ? { opacity: 1, y: 0, scale: 1 } : phase >= 4 ? { opacity: 0, scale: 1.2, filter: 'blur(20px)' } : { opacity: 0, y: 50, scale: 0.9 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: phase >= 4 ? 'none' : 'block' }}
      >
        <h2 className="text-3xl text-white font-bold mb-8 leading-relaxed">أي مما يلي لا يعتبر من خصائص التوزيع الطبيعي؟</h2>
        
        <div className="space-y-4">
          {["شكل الجرس المنحني", "المنحنى متماثل حول المتوسط", "المتوسط والوسيط والمنوال غير متساوية", "المنحنى يقترب من المحور الأفقي ولا يلمسه"].map((opt, i) => (
            <motion.div
              key={i}
              className={`p-6 rounded-xl text-xl font-bold border-2 transition-colors ${phase >= 3 && i === 2 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              initial={{ opacity: 0, x: 20 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ delay: i * 0.2, duration: 0.4 }}
            >
              {opt}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Final Exam Hero */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
        style={{ pointerEvents: phase >= 4 ? 'auto' : 'none' }}
      >
        <motion.div
          className="text-center"
          initial={{ scale: 0.8, y: 50 }}
          animate={phase >= 4 ? { scale: 1, y: 0 } : { scale: 0.8, y: 50 }}
          transition={{ duration: 1, delay: 0.5, type: 'spring' }}
        >
          <div className="w-32 h-32 bg-amber-500 rounded-full mx-auto flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
            <span className="text-6xl">🎓</span>
          </div>
          <h1 className="text-6xl font-black text-white mb-6">امتحان نهائي شامل</h1>
          <div className="flex items-center justify-center gap-4 text-4xl text-amber-400 font-bold">
            <motion.span
              animate={phase >= 5 ? { opacity: [0, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              ٣٠
            </motion.span>
            <span>سؤال</span>
          </div>
        </motion.div>
      </motion.div>

    </motion.div>
  );
}
