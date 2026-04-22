import { motion } from 'framer-motion';
import { TypewriterText, MousePointer } from '../Shared';

export const Scene4 = () => {
  return (
    <motion.div
      key="scene4"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, type: 'spring', damping: 20 }}
      className="w-full h-full flex flex-col items-center justify-center relative bg-[#0a0b10] px-20"
    >
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="flex justify-center gap-4 mb-16">
          {[1, 2, 3, 4, 5, 6].map((step, i) => (
            <motion.div 
              key={step}
              className={`h-2 rounded-full ${i < 3 ? 'bg-amber-500' : 'bg-slate-800'}`}
              initial={{ width: '40px' }}
              animate={i === 2 ? { width: ['40px', '80px'] } : {}}
              transition={{ delay: 3, duration: 0.5 }}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [1, 1, 0], y: [0, 0, -20] }}
          transition={{ duration: 2.5, times: [0, 0.8, 1] }}
          className="absolute inset-x-0 top-1/3 flex flex-col items-center"
        >
          <h2 className="text-5xl font-bold text-white mb-10">أهلاً بك في نُخبة! ما اسمك؟</h2>
          <div className="w-full max-w-lg bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl p-6 text-3xl text-white text-center">
            <TypewriterText text="أحمد" delay={0.5} speed={0.1} />
            <motion.span 
              animate={{ opacity: [1, 0] }} 
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="inline-block w-1 h-8 bg-amber-400 ml-2 align-middle"
            />
          </div>
        </motion.div>

        {/* Step 2: Region */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -20] }}
          transition={{ delay: 2.5, duration: 3, times: [0, 0.1, 0.9, 1] }}
          className="absolute inset-x-0 top-1/3 flex flex-col items-center"
        >
          <h2 className="text-5xl font-bold text-white mb-10">اختر منطقتك الجغرافية</h2>
          <div className="flex gap-8 w-full max-w-3xl justify-center">
            <div className="flex-1 bg-slate-900/60 border border-slate-700 rounded-3xl p-10 flex flex-col items-center gap-6">
              <span className="text-6xl">🏔️</span>
              <span className="text-2xl text-white font-bold">المحافظات الشمالية</span>
            </div>
            <motion.div 
              animate={{ borderColor: ['#334155', '#f59e0b'], backgroundColor: ['rgba(15,23,42,0.6)', 'rgba(245,158,11,0.1)'] }}
              transition={{ delay: 3.5, duration: 0.3 }}
              className="flex-1 bg-slate-900/60 border-4 border-slate-700 rounded-3xl p-10 flex flex-col items-center gap-6"
            >
              <span className="text-6xl">🌊</span>
              <span className="text-2xl text-white font-bold">المحافظات الجنوبية</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Step 3: Interest & Final */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1], y: [20, 0] }}
          transition={{ delay: 5.5, duration: 0.5 }}
          className="absolute inset-x-0 top-1/3 flex flex-col items-center"
        >
          <h2 className="text-5xl font-bold text-white mb-12">ما الذي تود تعلمه؟</h2>
          <div className="flex gap-6 mb-16">
            <div className="px-10 py-6 rounded-2xl bg-indigo-600/20 border-2 border-indigo-500/50 text-indigo-300 font-bold text-2xl">
              🎓 المسار الجامعي
            </div>
            <div className="px-10 py-6 rounded-2xl bg-slate-800 border-2 border-slate-700 text-slate-300 font-bold text-2xl">
              💻 المهارات
            </div>
          </div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, boxShadow: "0 0 40px rgba(245,158,11,0.4)" }}
            transition={{ delay: 6.5, duration: 0.5 }}
            className="px-12 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-3xl shadow-xl flex items-center gap-4"
          >
            ابدأ رحلتك! 🚀
          </motion.div>
        </motion.div>
      </div>

      <MousePointer 
        animate={{ 
          x: ["70vw", "60vw", "60vw", "50vw", "50vw"], 
          y: ["70vh", "55vh", "55vh", "65vh", "65vh"], 
          scale: [1, 1, 0.8, 1, 0.8] 
        }} 
      />
    </motion.div>
  );
};
